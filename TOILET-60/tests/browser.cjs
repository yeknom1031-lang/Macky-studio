const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const C = require('../src/core.js');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'test-results');
const url = pathToFileURL(path.join(root, 'index.html')).href;
fs.mkdirSync(output, { recursive: true });
const results = [], errors = [], requests = [];
let browser;
async function check(name, fn) { const at = Date.now(); await fn(); results.push({ name, passed: true, ms: Date.now() - at }); console.log(`PASS ${name}`); }
async function state(page) { return page.evaluate(() => ToiletApp.snapshot()); }
async function advance(page, ms) { await page.clock.runFor(ms); }
async function click(page, name, exact = false) {
  const dialog = page.getByRole('dialog');
  const scope = await dialog.count() ? dialog : page;
  await scope.getByRole('button', { name, exact }).click();
}
async function snap(page, name) { await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true }); }
async function load(page) {
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  await page.clock.install({ time: new Date('2026-09-27T12:00:00Z') });
  await page.goto(url);
  await page.clock.pauseAt(new Date('2026-09-27T12:00:01Z'));
  await advance(page, 50);
}
async function begin(page) { await click(page, '準備OK、スタート'); await advance(page, 32); }
async function routeTo(page, target) {
  let s = await state(page);
  const route = C.path(s.map, s.player, target).slice(1);
  for (const p of route) {
    for (const axis of ['x', 'y']) {
      for (let tries = 0; tries < 12; tries++) {
        s = await state(page); if (s.state !== 'playing') throw Error('Game ended before reaching target');
        const delta = p[axis] - s.player[axis]; if (Math.abs(delta) < .055) break;
        const key = axis === 'x' ? delta > 0 ? 'ArrowRight' : 'ArrowLeft' : delta > 0 ? 'ArrowDown' : 'ArrowUp';
        await page.keyboard.down(key); await advance(page, Math.max(17, Math.round(Math.abs(delta) / s.speeds[key] * 1000))); await page.keyboard.up(key);
      }
    }
  }
  s = await state(page); assert.ok(C.distance(s.player, target) < .12, 'keyboard movement reaches requested tile');
}
(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage(); await load(page);
  await check('Standalone file opens offline with title and no external requests', async () => {
    assert.equal((await state(page)).screen, 'title'); await snap(page, '01-title'); assert.equal(requests.length, 0);
  });
  await check('Stage pages, area filters, all 48 stages and difficulty selection', async () => {
    await click(page, 'ステージ選択', true); await page.locator('#map-variation').uncheck(); await advance(page, 32);
    assert.equal(await page.locator('.stage-card').count(), 6);
    await click(page, '次のページ'); await advance(page, 32); assert.ok(await page.locator('[data-stage="7"]').isVisible());
    await click(page, 'オフィス', true); await advance(page, 32); assert.ok(await page.locator('[data-stage="41"]').isVisible());
    await click(page, '次のページ'); await advance(page, 32); assert.ok(await page.locator('[data-stage="48"]').isVisible());
    await click(page, 'すべて', true); await click(page, 'HARD', true); await click(page, 'NORMAL', true); await advance(page, 32);
    await snap(page, '02-stage-select');
  });
  await check('Help and settings dialogs have keyboard focus containment', async () => {
    await click(page, 'あそびかた', true); assert.ok(await page.getByRole('dialog').isVisible());
    await snap(page, '03-how-to-play'); await page.keyboard.press('Escape');
    await click(page, '設定', true); await page.locator('#setting-reduced').check(); await page.locator('#setting-sound').uncheck();
    await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]')));
    await click(page, '完了'); assert.ok(await page.locator('body.reduced-motion').count());
  });
  await check('Keyboard movement, pause/resume and automatic blur pause preserve time', async () => {
    await click(page, 'このステージで遊ぶ'); await begin(page);
    let s = await state(page); const before = s.player.x;
    await page.keyboard.down('ArrowRight'); await advance(page, 180); await page.keyboard.up('ArrowRight');
    assert.ok((await state(page)).player.x > before);
    await page.keyboard.press('Escape'); const remaining = (await state(page)).remaining; await advance(page, 3000);
    assert.equal((await state(page)).remaining, remaining); await click(page, '続ける');
    await page.evaluate(() => window.dispatchEvent(new Event('blur'))); assert.equal((await state(page)).paused, true); await click(page, '続ける');
    await snap(page, '04-gameplay');
    const sizes = await page.evaluate(() => ({ world: document.querySelector('#world').getBoundingClientRect().width, mini: document.querySelector('#minimap').getBoundingClientRect().width }));
    assert.ok(sizes.mini < sizes.world / 3, 'Minimap does not obscure world');
  });
  await check('Occupied toilet: wait, cancel by walking, wait for opening and finish', async () => {
    let s = await state(page); const occupied = s.toilets[0]; await routeTo(page, occupied);
    await page.keyboard.press('e'); assert.equal((await state(page)).mode, 'wait'); await advance(page, 300);
    await page.keyboard.down('ArrowDown'); await advance(page, 120); await page.keyboard.up('ArrowDown');
    assert.equal((await state(page)).mode, 'explore'); await page.keyboard.press('e'); assert.equal((await state(page)).mode, 'wait');
    await snap(page, '05-waiting'); s = await state(page);
    await advance(page, Math.ceil((occupied.openAt - s.elapsed) * 1000 + 90)); assert.equal((await state(page)).mode, 'relief');
    await snap(page, '06-relief'); await advance(page, 3200); assert.equal((await state(page)).state, 'won');
    assert.ok((await state(page)).records['1-normal']); await snap(page, '07-clear');
  });
  await check('Clear record survives reload; replay resets exact seed and timers', async () => {
    const seed = (await state(page)).seed; await click(page, 'もう一度', true); await begin(page);
    let s = await state(page); assert.equal(s.seed, seed); assert.ok(s.remaining > 119); assert.equal(s.waited, 0);
    await page.reload(); await advance(page, 40); s = await state(page); assert.ok(s.records['1-normal']); assert.equal(s.screen, 'title');
  });
  await check('Companion recruitment, yielding, and both characters rescued via real inputs', async () => {
    await click(page, 'ステージ選択', true); await click(page, 'ステージ1 はじめての廊下', true); await click(page, 'このステージで遊ぶ'); await begin(page);
    await advance(page, 1200); await page.keyboard.press('e'); assert.equal((await state(page)).buddy.active, true);
    let s = await state(page); const free = s.toilets[1]; await routeTo(page, free); await page.keyboard.press('q');
    assert.equal((await state(page)).mode, 'wait'); await advance(page, 11500);
    s = await state(page); assert.equal(s.state, 'won'); assert.equal(s.shared, true);
  });
  await check('Hard timeout, defeat route recap, retry and next-stage transitions', async () => {
    await click(page, 'ステージ選択', true); await click(page, 'HARD', true); await click(page, 'このステージで遊ぶ'); await begin(page);
    assert.ok((await state(page)).remaining <= 75); await advance(page, 76000);
    assert.equal((await state(page)).state, 'lost'); assert.ok(await page.locator('#recap').isVisible()); await snap(page, '08-game-over');
    await click(page, '同じマップで再挑戦'); await begin(page);
    let s = await state(page); assert.ok(s.remaining > 74); await routeTo(page, s.toilets[1]); await page.keyboard.press('e'); await advance(page, 3200);
    assert.equal((await state(page)).state, 'won'); await click(page, '次のステージへ'); await begin(page); assert.equal((await state(page)).stageId, 2);
  });
  await check('Random map, practice mode and click-to-walk', async () => {
    await page.keyboard.press('Escape'); await click(page, 'タイトルへ', true); await click(page, '気ままにランダムマップ'); await begin(page);
    assert.equal((await state(page)).stageId, 0);
    await page.keyboard.press('Escape'); await click(page, 'タイトルへ', true); await click(page, 'あそびかた', true); await click(page, '練習してみる'); await begin(page);
    let s = await state(page); assert.ok(s.remaining > 89); assert.ok(s.map.w < 25);
    const box = await page.locator('#world').boundingBox(); const dest = { x: s.player.x + 1, y: s.player.y };
    await page.mouse.click(box.x + dest.x * s.camera.tile - s.camera.x, box.y + dest.y * s.camera.tile - s.camera.y); await advance(page, 450);
    assert.ok(C.distance((await state(page)).player, dest) < .15);
    s = await state(page); const target = s.toilets[0], route = C.path(s.map, s.player, target);
    await routeTo(page, route[Math.max(0, route.length - 4)]); await advance(page, 32); s = await state(page);
    const doorBox = await page.locator('#world').boundingBox();
    await page.mouse.click(doorBox.x + target.x * s.camera.tile - s.camera.x, doorBox.y + target.y * s.camera.tile - s.camera.y - 38);
    await advance(page, 16000); assert.equal((await state(page)).state, 'won', 'Clicking the visible door artwork reaches and enters the toilet');
  });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage(); await load(mobile);
  await check('Mobile title, stage selection, gameplay and touch controls fit without overflow', async () => {
    await snap(mobile, '09-mobile-title'); await click(mobile, 'ステージ選択', true); await advance(mobile, 32); await snap(mobile, '10-mobile-stages');
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await click(mobile, 'このステージで遊ぶ'); await begin(mobile);
    const before = (await state(mobile)).player.x; const b = await mobile.locator('[data-key="right"]').boundingBox();
    await mobile.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await mobile.mouse.down(); await advance(mobile, 170); await mobile.mouse.up();
    assert.ok((await state(mobile)).player.x > before);
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await snap(mobile, '11-mobile-gameplay');
  });
  const restrictedContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await restrictedContext.addInitScript(() => { Storage.prototype.setItem = function () { throw new Error('Storage disabled'); }; });
  const restricted = await restrictedContext.newPage(); await load(restricted);
  await check('Blocked browser storage does not prevent playing', async () => {
    await click(restricted, 'はじめる'); await begin(restricted); assert.equal((await state(restricted)).state, 'playing');
  });
  await check('No JavaScript errors and no external network dependencies', async () => { assert.deepEqual(errors, []); assert.deepEqual(requests, []); });
  await browser.close();
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify({ passed: results.length, failed: 0, browser: 'Google Chrome (Playwright)', mode: 'file://, offline assets, real keyboard/mouse inputs with virtual clock', results, errors, externalRequests: requests }, null, 2));
  console.log(`\n${results.length} browser checks passed.`);
})().catch(async error => {
  console.error(error); fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify({ passed: results.length, failed: 1, results, error: error.stack, errors }, null, 2));
  if (browser) await browser.close(); process.exit(1);
});
