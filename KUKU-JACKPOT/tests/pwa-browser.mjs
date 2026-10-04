import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { buildFestival } from '../scripts/build_festival.mjs';

const { chromium, webkit } = createRequire(import.meta.url)('playwright');
const browserName = process.env.KUKU_TEST_BROWSER === 'webkit' ? 'WebKit' : 'Chrome';
const root = await mkdtemp(path.join(tmpdir(), 'kuku-real-pwa-'));
let browser, server;
try {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const html = version => `<!doctype html><html><head><title>PWA ${version}</title></head><body><h1>${version}</h1><script>window.events=[];navigator.serviceWorker.addEventListener('message',e=>events.push(e.data));navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});</script></body></html>`;
  for (const [file, body] of Object.entries({ 'index.html': html('one'), 'manifest.webmanifest': '{}', '_headers': '', 'sw.js': sw, 'assets/runtime/voice.wav': '0123456789', 'designs/20-minigames/release-plan.html': 'offline plan' })) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), body);
  }
  const initial = await buildFestival({ root, requireRuntime: false });
  server = http.createServer(async (req, res) => {
    try {
      let key = new URL(req.url, 'http://localhost').pathname;
      if (key === '/') key = '/index.html';
      else if (!path.extname(key)) key += '.html';
      const file = path.join(root, 'dist', key);
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': key.endsWith('.js') ? 'text/javascript' : key.endsWith('.html') ? 'text/html' : key.endsWith('.json') ? 'application/json' : 'audio/wav', 'Cache-Control': 'no-store' });
      res.end(content);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  browser = browserName === 'WebKit' ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, executablePath: process.env.KUKU_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.evaluate(async () => (await navigator.serviceWorker.ready).active.postMessage({ type: 'CACHE_ALL' }));
  await page.waitForFunction(() => events.some(event => event.type === 'CACHE_COMPLETE'));
  const saved = await page.evaluate(() => events.find(event => event.type === 'CACHE_COMPLETE'));
  assert.equal(saved.completed, initial.assets.length);
  if (browserName === 'WebKit') {
    // Playwright's WebKit offline switch also blocks local SW responses (#42775).
    // Stop the actual origin instead, so cache hits can run and no network can succeed.
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await assert.rejects(fetch(origin + '/network-only-proof.txt'));
  } else await context.setOffline(true);
  await page.reload();
  assert.equal(await page.locator('h1').textContent(), 'one');
  assert.equal(await page.evaluate(async () => (await fetch('/assets/runtime/voice.wav')).text()), '0123456789');
  const range = await page.evaluate(async () => {
    const result = await fetch('/assets/runtime/voice.wav', { headers: { range: 'bytes=2-5' } });
    return { status: result.status, text: await result.text() };
  });
  assert.deepEqual(range, { status: 206, text: '2345' });
  assert.equal(await page.evaluate(async () => (await fetch('/designs/20-minigames/release-plan')).text()), 'offline plan');
  if (browserName === 'WebKit') await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  else await context.setOffline(false);
  await writeFile(path.join(root, 'index.html'), html('two'));
  await writeFile(path.join(root, 'assets/runtime/voice.wav'), 'abcdefghij');
  const updated = await buildFestival({ root, requireRuntime: false });
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
  assert.equal(await page.evaluate(async () => (await fetch('/assets/runtime/voice.wav')).text()), '0123456789');
  assert.equal(await page.locator('h1').textContent(), 'one');
  assert.ok((await page.evaluate(() => caches.keys())).some(key => key.endsWith(initial.version)));
  await page.evaluate(async () => {
    const changed = new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    (await navigator.serviceWorker.getRegistration()).waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    await changed;
  });
  await page.reload();
  assert.equal(await page.locator('h1').textContent(), 'two');
  assert.ok(!(await page.evaluate(() => caches.keys())).some(key => key.endsWith(initial.version)));
  console.log(JSON.stringify({ passed: true, browser: browserName, offlineMode: browserName === 'WebKit' ? 'origin-server-stopped' : 'browser-offline', checks: ['full-save', 'offline-reload', 'offline-audio', 'range', 'canonical-html', 'update-waits-during-play', 'explicit-update'], initialVersion: initial.version, updatedVersion: updated.version }));
} finally {
  await browser?.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
