import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { cloudflareStaticServer, cachedHTML } from './pwa-test-server.mjs';

const { chromium, webkit } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(dist, 'assets-manifest.json'), 'utf8'));
const browserName = process.env.KUKU_TEST_BROWSER === 'webkit' ? 'WebKit' : 'Chrome';
const errors = [], badResponses = [];
let browser, server;
try {
  server = cloudflareStaticServer(dist);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const redirect = await fetch(origin + '/index.html', { redirect: 'manual' });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get('location'), '/');
  assert.equal((await fetch(origin + '/designs/20-minigames/release-plan.html')).redirected, true);
  browser = browserName === 'WebKit' ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, executablePath: process.env.KUKU_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    window.__pwaMessages = [];
    navigator.serviceWorker.addEventListener('message', event => window.__pwaMessages.push(event.data));
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) badResponses.push({ url: response.url(), status: response.status() }); });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60000 });
  await page.locator('#install-btn').click();
  await page.locator('#cache-all').click();
  await page.waitForFunction(() => window.__pwaMessages.some(event => event.type === 'CACHE_COMPLETE' || event.type === 'CACHE_ERROR'), null, { timeout: 120000 });
  const saved = await page.evaluate(() => window.__pwaMessages.find(event => event.type === 'CACHE_COMPLETE' || event.type === 'CACHE_ERROR'));
  assert.equal(saved.type, 'CACHE_COMPLETE', saved.message);
  assert.equal(saved.completed, manifest.assets.length);
  assert.equal(saved.bytes, manifest.totalBytes);
  assert.match(await page.locator('#offline-status').textContent(), /保存済み/);
  assert.equal(await page.locator('#cache-all').isDisabled(), true);
  const matched = await page.evaluate(async version => {
    const cache = await caches.open('kuku-beat-festival-' + version);
    return (await cache.keys()).map(request => new URL(request.url).pathname);
  }, manifest.version);
  assert.ok(manifest.assets.every(asset => matched.includes(asset.url)));
  const htmlCache = await cachedHTML(page, manifest.version);
  assert.equal(htmlCache.length, manifest.assets.filter(asset => asset.url.endsWith('.html')).length);
  assert.ok(htmlCache.every(entry => !entry.redirected && entry.status === 200), JSON.stringify(htmlCache));
  for (let i = 0; i < 2; i++) {
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelectorAll('.game-card').length === 21);
  }

  // This is a real network outage, not the broken WebKit setOffline emulation.
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await assert.rejects(fetch(origin + '/network-only-proof.txt'));
  for (let i = 0; i < 2; i++) {
    await page.goto(origin + '/designs/20-minigames/release-plan', { waitUntil: 'networkidle' });
    assert.match(await page.locator('h1').textContent(), /21/);
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelectorAll('.game-card').length === 21);
  }
  const samples = [
    ...manifest.assets.filter(asset => /\/music\/.*\.wav$/.test(asset.url)),
    ...manifest.assets.filter(asset => /\/voice\/.*\.wav$/.test(asset.url)).filter((_, i) => i % 45 === 0),
    ...manifest.assets.filter(asset => /\/assets\/runtime\/.*\.webp$/.test(asset.url)).filter((_, i) => i % 8 === 0),
    ...manifest.assets.filter(asset => asset.url.startsWith('/src/')),
  ];
  const samplesPassed = await page.evaluate(async samples => {
    for (const asset of samples) {
      const response = await fetch(asset.url);
      const body = await response.arrayBuffer();
      if (!response.ok || body.byteLength !== asset.bytes) throw new Error('Offline mismatch: ' + asset.url);
    }
    return samples.length;
  }, samples);
  const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
  assert.ok(geometry.scrollWidth <= geometry.width + 1, JSON.stringify(geometry));
  assert.deepEqual(errors, []);
  assert.deepEqual(badResponses, []);
  const report = { passed: true, browser: browserName, viewport: '844x390', offlineMode: 'origin-server-stopped', version: manifest.version, totalAssets: manifest.assets.length, totalBytes: manifest.totalBytes, canonicalRedirectStatus: redirect.status, normalizedHTMLCount: htmlCache.length, onlineReloads: 2, offlineNavigations: 4, offlineReloads: 2, offlineSamples: samplesPassed, geometry, errors, badResponses };
  const qa = path.join(root, 'qa/pwa-release');
  await mkdir(qa, { recursive: true });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(qa, `offline-${browserName}.png`) });
  await writeFile(path.join(qa, `complete-${browserName}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
}
