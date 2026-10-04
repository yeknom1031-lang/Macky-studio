import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(import.meta.url)('playwright');
const isWebKit=process.env.KUKU_TEST_BROWSER==='webkit';
const browser=await (isWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']}));
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1,serviceWorkers:'block'});
const page=await context.newPage(),errors=[],bad=[],report={browser:isWebKit?'WebKit':'Chrome',games:[],viewports:[],checks:[]};
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))bad.push([r.status(),r.url()]);});
const base=process.env.KUKU_TEST_URL||'http://127.0.0.1:4193';
await mkdir('qa/festival',{recursive:true});
try{
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>__festival.ready());assert.equal(await page.locator('.game-card').count(),21);
 await page.screenshot({path:`qa/festival/home-${report.browser}.png`,fullPage:false});
 async function seek(beat){await page.evaluate(b=>__festival.seekBeat(b),beat);await page.waitForTimeout(55);}
 for(let id=1;id<=21;id++){
  await page.locator(`.game-card[data-game="${id}"]`).click();await page.locator('#start-single').click();await page.waitForFunction(()=>window.__festival?.state.running);
  const gameResults=[];
  for(let n=0;n<5;n++){
   await seek(8);let q=await page.evaluate(()=>__festival.state.question);const expected=[4,21].includes(id)?Number(q.truth):q.answer;
   if(n!==2){let value=expected;if(n===1)value=await page.evaluate(expected=>__festival.state.mini.controls.find(c=>c.value!==expected).value,expected);await page.locator(`#answers [data-value="${value}"]`).click();
    if(!(await page.evaluate(()=>__festival.state.mini.completed))){await seek(12);for(let press=0;press<3;press++){if(await page.evaluate(()=>__festival.state.mini.completed))break;await page.locator('#action-btn').click();}}
   }
   if(n===0){await page.screenshot({path:`qa/festival/game-${String(id).padStart(2,'0')}.png`});}
   await seek(14.2);const r=await page.evaluate(()=>__festival.state.results.at(-1));assert.equal(r.correct,n!==1&&n!==2,`game ${id} round ${n} has wrong arithmetic result`);gameResults.push(r.correct);
   if([4,21].includes(id)&&!q.truth){const formula=await page.locator('#equation').getAttribute('aria-label');assert.ok(formula.endsWith(String(q.answer)));}
   await seek(24.1);
  }
  await page.waitForFunction(()=>!__festival.state.running);assert.equal(await page.locator('#result-correct').textContent(),'3 / 5');report.games.push({id,results:gameResults});await page.locator('#home-btn').click();
 }
 // All 21 shows actually transition in a single tour, including unanswered questions.
 await page.locator('#tour-btn').click();await page.waitForFunction(()=>__festival.state.running);const seen=[];
 for(let n=0;n<63;n++){seen.push(await page.evaluate(()=>__festival.state.question.gameId));await seek(14.2);await seek(24.1);}
 assert.equal(new Set(seen).size,21);assert.equal(await page.locator('#result-correct').textContent(),'0 / 63');report.checks.push('63-round tour reaches results with all 21 stages and timeouts');await page.locator('#home-btn').click();
 // Pause suspends the same clock, including opening the voice collection while paused.
 await page.locator('.game-card[data-game="3"]').click();await page.locator('#start-single').click();await page.waitForFunction(()=>__festival.state.running);await seek(8);await page.locator('#pause-btn').click();await page.waitForFunction(()=>__festival.state.paused);let before=await page.evaluate(()=>__festival.audio.now());await page.waitForTimeout(220);let after=await page.evaluate(()=>__festival.audio.now());assert.ok(Math.abs(after-before)<.03);await page.locator('#pause-settings').click();await page.locator('#voices-btn').click();await page.waitForSelector('#voice-collection button');assert.equal(await page.locator('#voice-collection button').count(),100);await page.locator('#voice-collection button').first().click();await page.waitForTimeout(180);after=await page.evaluate(()=>__festival.audio.now());assert.ok(Math.abs(after-before)<.04);await page.locator('#voices-back').click();await page.locator('#settings-done').click();await page.locator('#resume-btn').click();await page.waitForFunction(()=>!__festival.state.paused);report.checks.push('pause and voice preview preserve game clock; 100 cheer buttons');
 for(const viewport of [{width:844,height:390},{width:667,height:375},{width:932,height:430},{width:1280,height:800},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(80);if(viewport.height>viewport.width){assert.equal(await page.locator('#rotate').isVisible(),true);await page.locator('#portrait-continue').click();await page.locator('#resume-btn').click();}
  const bounds=await page.evaluate(()=>{const a=document.querySelector('#action-btn').getBoundingClientRect(),c=document.querySelector('#stage').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth+1,stageHeight:c.height,actionBottom:a.bottom,viewport:innerHeight};});assert.equal(bounds.overflow,false);assert.ok(bounds.stageHeight>100);assert.ok(bounds.actionBottom<=bounds.viewport+1);report.viewports.push({...viewport,...bounds});await page.screenshot({path:`qa/festival/layout-${viewport.width}x${viewport.height}.png`});
 }
 await page.evaluate(()=>__festival.home());assert.equal(errors.length,0,errors.join('\n'));assert.equal(bad.length,0,JSON.stringify(bad));report.errors=errors;report.badResponses=bad;report.passed=true;await writeFile(`qa/festival/browser-${report.browser}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,browser:report.browser,games:21,tour:63,viewports:report.viewports.length}));
}finally{await browser.close();}
