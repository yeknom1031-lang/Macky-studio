// Verify the actual installed bundle without a server or a network connection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL, fileURLToPath} = require('node:url');
const crypto = require('node:crypto');
const {chromium} = require('playwright');

(async () => {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'assets/production/package-report.json'), 'utf8'));
  const checks = [];
  assert.equal(pkg.appVersion, '2.1');
  checks.push('v2.1の配布アプリ');
  const browser = await chromium.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
  try {
    const context = await browser.newContext({offline: true, viewport: {width: 1440, height: 900}});
    const page = await context.newPage();
    const errors = [], networkRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url())) networkRequests.push(request.url());
    });
    await page.goto(pathToFileURL(pkg.entry).href);
    await page.waitForFunction(() => window.WACHA24_DATA && window.Wacha24Debug && document.querySelectorAll('.stage').length === 24);
    assert.match(page.url(), /\/expedition\/index\.html$/);
    checks.push('サーバーなしのローカル入口から24ステージ版へ移動');
    const runtime = path.dirname(fileURLToPath(page.url()));
    const names = ['expedition-core.js', 'expedition-app.js', 'expedition-render.js', 'expedition-input.js', 'expedition-audio.js', 'data.js'];
    const codeHashes = Object.fromEntries(names.map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(runtime, name))).digest('hex')]));
    const qa = JSON.parse(fs.readFileSync(path.join(root, 'assets/production/review/release-qa-summary.json'), 'utf8'));
    for (const name of names) assert.equal(codeHashes[name], qa.codeHashes[name], 'Packaged runtime must match final QA: ' + name);
    checks.push('配布した5モジュールとデータのハッシュが最終QAと一致');
    const before = await page.evaluate(() => ({stages: WACHA24_DATA.stages.length, ready: WACHA24_DATA.stages.filter(s => s.ready).length, designs: WACHA24_DATA.characters.length}));
    assert.deepEqual(before, {stages: 24, ready: 24, designs: 4396});
    checks.push('全24ステージと4,396デザインを収録');
    await page.evaluate(() => Wacha24Debug.prepare(23));
    await page.locator('[data-action=begin]').waitFor({timeout: 90000});
    const finalStage = await page.evaluate(() => ({people: Wacha24Debug.state.people.length, unique: new Set(Wacha24Debug.state.people.map(p => p.design)).size, cameras: Wacha24Debug.state.photoCredits}));
    assert.deepEqual(finalStage, {people: 2000, unique: 2000, cameras: 0});
    checks.push('最後の街に固有2,000体・撮影0回で開始');
    assert.equal(await page.locator('#time-left').textContent(), '03:00');
    assert.ok(await page.locator('#game-actions [data-action=leave]').isVisible());
    checks.push('03:00の時計と退出ボタンを表示');
    await page.locator('[data-action=begin]').click();
    assert.ok(await page.locator('#start-countdown').isVisible());
    await page.waitForFunction(() => Wacha24Debug.state.elapsed > 1);
    checks.push('カウントダウン後にゲームが進行');
    await page.waitForFunction(() => Wacha24Sound.getState().active.length >= 2 && Wacha24Sound.getState().active.every(a => a.readyState >= 2 && a.time > .1));
    const audioPlaying = await page.evaluate(() => Wacha24Sound.getState());
    assert.deepEqual(audioPlaying.errors, []);
    assert.ok(audioPlaying.active.some(a => a.id.startsWith('music-')));
    assert.ok(audioPlaying.active.some(a => a.id === 'crowd'));
    checks.push('オフラインでBGM・ざわめき・環境音を実再生');
    await page.evaluate(() => Wacha24Debug.pause());
    assert.equal(await page.evaluate(() => Wacha24Debug.state.status), 'paused');
    assert.ok(await page.evaluate(() => Wacha24Sound.getState().active.every(a => a.paused)));
    checks.push('一時停止でゲームと音の両方を停止');
    const currentGame = await page.evaluate(() => ({openBuildings: WACHA24_DATA.stages.filter(s => s.openBuildings).length, livingStages: WACHA24_DATA.stages.filter(s => s.livingTown && s.activityAreas?.length).length, detailTiles: WACHA24_DATA.stages.reduce((n,s) => n + (s.backgroundTiles?.length || 0), 0)}));
    assert.deepEqual(currentGame, {openBuildings: 24, livingStages: 24, detailTiles: 52});
    checks.push('新全景24・生活領域24・詳細タイル52を収録');
    const guide = fs.readFileSync(path.join(path.dirname(pkg.entry), '遊び方.html'), 'utf8');
    if (process.env.QA_RELEASED_GUIDE === '1') {
      assert.match(guide, /<p id="release-status">24ステージ版 v2\.1を収録しています。/);
      assert.doesNotMatch(guide, /制作中の拡張版/);
    }
    assert.ok(guide.includes('href="expedition/index.html"'));
    checks.push(process.env.QA_RELEASED_GUIDE === '1' ? '公開済みの遊び方とローカル起動リンクを同梱' : '遊び方とローカル起動リンクを同梱');
    assert.deepEqual(errors, []);
    checks.push('JavaScript例外0件');
    assert.deepEqual(networkRequests, []);
    checks.push('外部通信要求0件');
    const report = {at: new Date().toISOString(), appVersion: pkg.appVersion, entry: pkg.entry, offline: true, ...before, ...currentGame, codeHashes, finalStage, audioTracks: audioPlaying.active.map(a => a.id), checks, networkRequests, errors};
    fs.writeFileSync(path.join(root, 'assets/production/review/offline-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
