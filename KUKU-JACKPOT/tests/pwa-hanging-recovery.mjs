import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { buildFestival } from '../scripts/build_festival.mjs';
import { newSave, record } from '../src/festival-core.js';
import { cloudflareStaticServer, cachedHTML } from './pwa-test-server.mjs';

const { chromium, webkit } = createRequire(import.meta.url)('playwright');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserName = process.env.KUKU_TEST_BROWSER === 'webkit' ? 'WebKit' : 'Chrome';
const root = await mkdtemp(path.join(tmpdir(), 'kuku-hanging-recovery-'));
const legacySW = execFileSync('git', ['show', 'ea4baa0:KUKU-JACKPOT/sw.js'], { cwd: project, encoding: 'utf8' });
const fixedSW = await readFile(path.join(project, 'sw.js'), 'utf8');
const recoveryHTML = await readFile(path.join(project, 'recover.html'), 'utf8');
const storageKey = 'kuku-beat-festival-v1';
const savedRecord = JSON.stringify(record(newSave(), [{ a: 8, b: 8, gameId: 21, correct: true, rhythm: 'perfect' }]));
const html = version => `<!doctype html><html><body><h1>${version}</h1><script>navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});</script></body></html>`;
let browser, server;
try {
  for (const [file, body] of Object.entries({ 'index.html': html('saved game'), 'manifest.webmanifest': '{}', '_headers': '', 'sw.js': legacySW })) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), body);
  }
  const initial = await buildFestival({ root, requireRuntime: false });
  server = cloudflareStaticServer(path.join(root, 'dist'));
  // Some engines discard a stalled install when a later navigation requests a
  // fresh worker. Also stall that script request, keeping the recovery deadline
  // test deterministic without replacing the browser's registration APIs.
  let stallWorkerDownload = false;
  const serve = server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request', (req, res) => {
    if (stallWorkerDownload && new URL(req.url, 'http://localhost').pathname === '/sw.js') return;
    serve(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = browserName === 'WebKit' ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, executablePath: process.env.KUKU_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.evaluate(async ({ key, value }) => {
    localStorage.setItem(key, value);
    await (await caches.open('unrelated-cache')).put('/unrelated', new Response('leave me alone'));
  }, { key: storageKey, value: savedRecord });
  assert.equal((await cachedHTML(page, initial.version))[0].redirected, true);

  // A real install event that never finishes blocks later jobs for this scope.
  await writeFile(path.join(root, 'sw.js'), legacySW + '\nself.addEventListener("install",event=>event.waitUntil(new Promise(()=>{})));\n');
  await writeFile(path.join(root, 'index.html'), html('unfinished update'));
  const stalled = await buildFestival({ root, requireRuntime: false });
  await page.evaluate(() => { navigator.serviceWorker.getRegistration().then(registration => registration.update()).catch(() => {}); });
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration()).installing?.state === 'installing');
  await page.waitForFunction(async ({ version, shell }) => {
    const cache = await caches.open('kuku-beat-festival-' + version);
    return (await Promise.all(shell.map(url => cache.match(url)))).every(Boolean);
  }, { version: stalled.version, shell: stalled.shell });
  stallWorkerDownload = true;

  await writeFile(path.join(root, 'sw.js'), fixedSW);
  await writeFile(path.join(root, 'index.html'), html('latest game'));
  await writeFile(path.join(root, 'recover.html'), recoveryHTML);
  const latest = await buildFestival({ root, requireRuntime: false });
  await page.goto(origin + '/recover');
  await page.evaluate(() => {
    window.__unregisterCalls = 0;
    const unregister = ServiceWorkerRegistration.prototype.unregister;
    ServiceWorkerRegistration.prototype.unregister = function (...args) { window.__unregisterCalls++; return unregister.apply(this, args); };
  });
  const started = Date.now();
  await page.locator('#repair').click();
  await page.locator('#open-saved-game').waitFor({ state: 'visible', timeout: 16000 });
  const elapsedMs = Date.now() - started;
  assert.ok(elapsedMs < 15000, `Recovery blocked for ${elapsedMs} ms`);
  assert.match(await page.locator('#status').textContent(), /最新版.*まだ完了していません/);
  assert.equal(await page.locator('#repair').isEnabled(), true);
  assert.equal(await page.evaluate(() => window.__unregisterCalls), 0);
  assert.ok((await cachedHTML(page, initial.version)).every(entry => !entry.redirected));
  assert.equal(await page.evaluate(async () => (await (await caches.open('unrelated-cache')).match('/unrelated')).text()), 'leave me alone');
  await page.locator('#open-saved-game').click();
  await page.waitForURL(origin + '/');
  assert.equal(await page.locator('h1').textContent(), 'saved game');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), savedRecord);
  for (let i = 0; i < 2; i++) {
    await page.reload();
    assert.equal(await page.locator('h1').textContent(), 'saved game');
  }
  const report = { passed: true, browser: browserName, initialVersion: initial.version, latestVersion: latest.version, elapsedMs, actualHangingInstall: true, subsequentWorkerDownloadStalled: true, fallbackExplicit: true, newestNotClaimed: true, savedGameOpened: true, repeatedReloads: 2, localStoragePreserved: true, unrelatedCachePreserved: true, unregisterCalls: 0 };
  const qa = path.join(project, 'qa/pwa-release');
  await mkdir(qa, { recursive: true });
  await writeFile(path.join(qa, `hanging-recovery-${browserName}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  server?.closeAllConnections();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
