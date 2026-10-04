import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { buildFestival } from '../scripts/build_festival.mjs';
import { newSave, record, normalizeSave } from '../src/festival-core.js';
import { cloudflareStaticServer, cachedHTML } from './pwa-test-server.mjs';

const { chromium, webkit } = createRequire(import.meta.url)('playwright');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserName = process.env.KUKU_TEST_BROWSER === 'webkit' ? 'WebKit' : 'Chrome';
const root = await mkdtemp(path.join(tmpdir(), 'kuku-redirect-recovery-'));
const legacyRef = process.env.KUKU_LEGACY_SW_REF || 'ea4baa0';
const legacySW = execFileSync('git', ['show', `${legacyRef}:KUKU-JACKPOT/sw.js`], { cwd: project, encoding: 'utf8' });
const fixedSW = await readFile(path.join(project, 'sw.js'), 'utf8');
const recoveryHTML = await readFile(path.join(project, 'recover.html'), 'utf8');
const storageKey = 'kuku-beat-festival-v1';
const learningRecord = record(newSave(), [
  { a: 7, b: 8, gameId: 1, correct: true, rhythm: 'perfect', watch: false },
  { a: 8, b: 8, gameId: 21, correct: false, rhythm: 'nice', watch: false },
]);
learningRecord.settings.offset = 75;
const savedRecord = JSON.stringify(learningRecord);
assert.deepEqual(normalizeSave(JSON.parse(savedRecord)), learningRecord);
const html = version => `<!doctype html><html><head><title>PWA ${version}</title></head><body><h1>${version}</h1><script>navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});</script></body></html>`;
let browser, server;
try {
  for (const [file, body] of Object.entries({ 'index.html': html('legacy'), 'manifest.webmanifest': '{}', '_headers': '', 'sw.js': legacySW })) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), body);
  }
  const initial = await buildFestival({ root, requireRuntime: false });
  const requests = [];
  server = cloudflareStaticServer(path.join(root, 'dist'), requests);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = browserName === 'WebKit' ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, executablePath: process.env.KUKU_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext();
  let page = await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: savedRecord });
  const legacyCache = await cachedHTML(page, initial.version);
  assert.equal(legacyCache.find(entry => entry.path === '/index.html').redirected, true);
  let legacyNavigationFailure = null;
  try { await page.reload({ timeout: 15000 }); } catch (error) { legacyNavigationFailure = error.message; }
  if (browserName === 'WebKit') assert.match(legacyNavigationFailure || '', /redirection|service worker/i, 'The old SW must reproduce the reported Safari failure.');
  // Open the rescue URL in a fresh tab of the same profile. Chromium may still
  // be committing its error document after the failed reload promise rejects.
  const failedPage = page;
  page = await context.newPage();
  await failedPage.close();

  await writeFile(path.join(root, 'index.html'), html('recovered'));
  await writeFile(path.join(root, 'sw.js'), fixedSW);
  await writeFile(path.join(root, 'recover.html'), recoveryHTML);
  const updated = await buildFestival({ root, requireRuntime: false });
  // Access the canonical route directly: the legacy worker must not receive a
  // followed redirect while serving this rescue navigation itself.
  await page.goto(origin + '/recover', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#repair').isVisible(), true);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
  assert.ok((await page.evaluate(() => caches.keys())).some(key => key.endsWith(initial.version)), 'Old cache remains until explicit repair.');
  await page.locator('#repair').click();
  await page.waitForURL(origin + '/', { timeout: 30000 });
  assert.equal(await page.locator('h1').textContent(), 'recovered');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), savedRecord);
  assert.ok(requests.includes('/recovery-version.json'), 'Recovery checks a network-only version checkpoint.');
  assert.ok(!(await page.evaluate(() => caches.keys())).some(key => key.endsWith(initial.version)));
  const normalized = await cachedHTML(page, updated.version);
  assert.ok(normalized.length && normalized.every(entry => !entry.redirected));
  for (let i = 0; i < 2; i++) {
    await page.reload();
    assert.equal(await page.locator('h1').textContent(), 'recovered');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), savedRecord);
  }

  // Also exercise the defensive read path against an already stored redirected
  // response, independently of the normalization used during new installations.
  await writeFile(path.join(root, 'dist/legacy-response.html'), html('recovered'));
  const seeded = await page.evaluate(async version => {
    const response = await fetch('/legacy-response.html');
    const redirected = response.redirected;
    await (await caches.open('kuku-beat-festival-' + version)).put('/index.html', response);
    return redirected;
  }, updated.version);
  assert.equal(seeded, true);
  await page.reload();
  assert.equal(await page.locator('h1').textContent(), 'recovered');

  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await assert.rejects(fetch(origin + '/network-only-proof.txt'));
  await page.reload();
  assert.equal(await page.locator('h1').textContent(), 'recovered');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), savedRecord);
  const report = { passed: true, browser: browserName, legacyRef, legacyNavigationFailure, initialVersion: initial.version, updatedVersion: updated.version, legacyCacheRedirected: true, normalizedCacheRedirected: false, explicitRecovery: true, localStoragePreserved: true, onlineReloadsAfterRepair: 3, offlineReloads: 1, legacyCacheReadSanitized: true };
  const qa = path.join(project, 'qa/pwa-release');
  await mkdir(qa, { recursive: true });
  await writeFile(path.join(qa, `redirect-recovery-${browserName}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
