import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(import.meta.url)('playwright');
const isWebKit=process.env.KUKU_TEST_BROWSER==='webkit';
const browser=await(isWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']}));
const base=process.env.KUKU_TEST_URL||'http://127.0.0.1:4193';
const report={browser:isWebKit?'WebKit':'Chrome',base,version:(await(await fetch(new URL('/assets-manifest.json',base))).json()).version,checks:[],errors:[]};
await mkdir('qa/festival',{recursive:true});
async function newPage(){const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,serviceWorkers:'block'});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));return{context,page};}
try{
  // Suspend and resume the exact in-progress lesson source, not only the music clock.
  {
    const{context,page}=await newPage();await page.goto(base,{waitUntil:'networkidle'});
    await page.locator('.game-card[data-game="1"]').click();await page.locator('#start-single').click();
    await page.waitForFunction(()=>__festival.state.running);
    await page.evaluate(()=>__festival.seekBeat(.3));
    await page.waitForFunction(()=>__festival.audio.spoken?.key?.startsWith('q-'));
    await page.locator('#pause-btn').click();await page.waitForFunction(()=>__festival.audio.ctx.state==='suspended');
    const before=await page.evaluate(()=>{window.__savedLesson=__festival.audio.spoken;return{key:__savedLesson?.key,time:__festival.audio.now()};});
    assert.ok(before.key?.startsWith('q-'),'a lesson must still be suspended mid-sentence');
    await page.waitForTimeout(160);const during=await page.evaluate(()=>__festival.audio.now());assert.ok(Math.abs(during-before.time)<.02);
    await page.locator('#resume-btn').click();await page.waitForFunction(()=>!__festival.state.paused);
    const after=await page.evaluate(()=>({sameSource:__festival.audio.spoken===window.__savedLesson,key:__festival.audio.spoken?.key}));
    assert.equal(after.sameSource,true,'closing the pause dialog must not stop the suspended lesson');assert.equal(after.key,before.key);
    report.checks.push('mid-question pause/resume preserves the lesson source and frozen clock');await context.close();
  }
  // A completed stale async request must never reopen a dismissed dialog.
  {
    const{context,page}=await newPage();let releaseManifest;const gate=new Promise(resolve=>{releaseManifest=resolve;});let intercepted=false;
    await page.route('**/assets/audio/festival/manifest.json',async route=>{intercepted=true;await gate;await route.continue();});
    await page.goto(base,{waitUntil:'networkidle'});await page.locator('#settings-btn').click();await page.locator('#voices-btn').click();
    await page.waitForFunction(()=>document.querySelector('#dialog-content').textContent.includes('じゅんび'));
    await page.locator('.dialog-close').click();assert.equal(await page.locator('#dialog').evaluate(e=>e.open),false);
    releaseManifest();await page.waitForLoadState('networkidle');await page.waitForTimeout(200);
    assert.equal(intercepted,true);assert.equal(await page.locator('#dialog').evaluate(e=>e.open),false,'dismissed voice dialog reopened after its request completed');
    assert.equal(await page.locator('#voice-collection').count(),0);report.checks.push('closing a loading voice collection discards its late result');await context.close();
  }
  // The preload and first play both fail, then the user-visible Retry succeeds.
  {
    const{context,page}=await newPage();let manifestRequests=0;
    await page.route('**/assets/runtime/art-manifest.json',route=>{manifestRequests++;return manifestRequests<=2?route.fulfill({status:503,contentType:'text/plain',body:'temporary test failure'}):route.continue();});
    await page.goto(base,{waitUntil:'networkidle'});await page.locator('.game-card[data-game="1"]').click();await page.locator('#start-single').click();
    await page.waitForSelector('#retry-load');assert.equal(await page.evaluate(()=>__festival.state.running),false);
    await page.locator('#retry-load').click();await page.waitForFunction(()=>__festival.state.running);
    assert.equal(manifestRequests,3,'Retry must request art again rather than reuse a rejected promise');assert.equal(await page.locator('#loading').isVisible(),false);
    report.checks.push('temporary art failures recover through the visible Retry button');await context.close();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;console.log(JSON.stringify(report,null,2));
}catch(error){report.passed=false;report.failure=error.stack;throw error;}
finally{await writeFile(`qa/festival/recovery-${report.browser}.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
