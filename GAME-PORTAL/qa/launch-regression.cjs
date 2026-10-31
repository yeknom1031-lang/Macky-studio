const {chromium}=require('/Users/makibook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext();
 const page=await context.newPage();
 const requests=[];page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
 await page.goto('http://127.0.0.1:4390/');await page.waitForSelector('.card');
 const popupPromise=page.waitForEvent('popup');
 await page.locator('[data-id="PICO-ATELIER"] .play-button').click();
 const popup=await popupPromise;await popup.waitForURL(/127\.0\.0\.1:\d+/);await popup.waitForLoadState('domcontentloaded');
 assert.match(await popup.title(),/PICO/);
 assert(requests.some(x=>x.endsWith('/api/prepare')));
 assert(!requests.some(x=>x.endsWith('/api/launch')),'Web game must bypass OS browser launch');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('macky-recent')||'{}')['PICO-ATELIER']>0);
 await popup.close();
 // A failure must close its pending tab, restore the card and not record a launch.
 await page.route('**/api/prepare',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'起動テストのエラー'})}));
 const failedPopupPromise=page.waitForEvent('popup');
 await page.locator('[data-id="GD-PRACTICE"] .play-button').click();const failed=await failedPopupPromise;
 if(!failed.isClosed())await failed.waitForEvent('close');
 await page.waitForFunction(()=>document.querySelector('#toast').textContent==='起動テストのエラー');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('macky-recent')||'{}')['GD-PRACTICE']),undefined);
 assert(await page.locator('[data-id="GD-PRACTICE"] .play-button').isEnabled());
 await page.unroute('**/api/prepare');
 // Simulate a browser that blocks window.open. The game must still open in this tab.
 await page.evaluate(()=>window.open=()=>null);
 await page.locator('[data-id="PICO-ATELIER"] .play-button').click();
 await page.waitForURL(url=>url.port!=='4390');await page.waitForLoadState('domcontentloaded');
 assert.match(await page.title(),/PICO/);
 console.log('PASS: direct browser tab, no OS launcher, failure cleanup, history, blocked-popup fallback.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
