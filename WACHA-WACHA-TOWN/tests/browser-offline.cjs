// Verify the actual installed bundle without a server or a network connection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'assets/production/package-report.json'), 'utf8'));
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
    const before = await page.evaluate(() => ({stages: WACHA24_DATA.stages.length, ready: WACHA24_DATA.stages.filter(s => s.ready).length, designs: WACHA24_DATA.characters.length}));
    assert.deepEqual(before, {stages: 24, ready: 24, designs: 4396});
    await page.evaluate(() => Wacha24Debug.prepare(23));
    await page.locator('[data-action=begin]').waitFor({timeout: 90000});
    const finalStage = await page.evaluate(() => ({people: Wacha24Debug.state.people.length, unique: new Set(Wacha24Debug.state.people.map(p => p.design)).size, cameras: Wacha24Debug.state.photoCredits}));
    assert.deepEqual(finalStage, {people: 2000, unique: 2000, cameras: 0});
    await page.locator('[data-action=begin]').click();
    await page.waitForFunction(() => Wacha24Debug.state.elapsed > 1);
    await page.evaluate(() => Wacha24Debug.pause());
    assert.equal(await page.evaluate(() => Wacha24Debug.state.status), 'paused');
    assert.deepEqual(errors, []);
    assert.deepEqual(networkRequests, []);
    const report = {at: new Date().toISOString(), appVersion: pkg.appVersion, entry: pkg.entry, offline: true, ...before, finalStage, networkRequests, errors};
    fs.writeFileSync(path.join(root, 'assets/production/review/offline-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
