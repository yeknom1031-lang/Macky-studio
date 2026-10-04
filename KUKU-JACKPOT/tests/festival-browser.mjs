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
async function seek(beat){await page.evaluate(b=>__festival.seekBeat(b),beat);await page.waitForTimeout(20);}
async function launch(){await page.waitForFunction(()=>window.__festival?.state.running);await page.locator('#intro-start').click();await page.waitForFunction(()=>!__festival.state.awaitingIntro);}
async function down(value){await page.locator(`#answers [data-value="${value}"]`).dispatchEvent('pointerdown',{pointerId:7,clientX:100,clientY:100});}
async function up(value){await page.locator(`#answers [data-value="${value}"]`).dispatchEvent('pointerup',{pointerId:7});}
try{
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>__festival.ready());assert.equal(await page.locator('.game-card').count(),21);
 assert.equal(await page.locator('#table').inputValue(),'0');assert.equal(await page.locator('#action-btn').count(),0);
 await page.screenshot({path:`qa/festival/home-${report.browser}.png`});
 for(let id=1;id<=21;id++){
  await page.locator(`.game-card[data-game="${id}"]`).click();await page.locator('#start-single').click();await launch();
  const gameResults=[];
  const facts=await page.evaluate(()=>__festival.state.playlist.map(q=>q.a));assert.equal(new Set(facts).size,5);
  for(let n=0;n<5;n++){
   const {q,notes,timing,controls}=await page.evaluate(()=>({q:__festival.state.question,notes:__festival.state.pattern.notes,timing:__festival.state.timing,controls:__festival.state.mini.controls}));
   const expected=[4,21].includes(id)?Number(q.truth):q.answer;
   const value=n===1?controls.find(c=>c.value!==expected).value:expected;
   await seek(1);assert.equal(await page.locator('#answers button:enabled').count(),0);
   await seek(timing.demo+.1);assert.equal(await page.locator('#answers button:enabled').count(),0);
   if(n===0){
    // Touches on the display never become answers.
    await seek(timing.play-.1);await page.locator('#stage').dispatchEvent('pointerdown',{pointerId:4,clientX:300,clientY:220});
    assert.equal(await page.evaluate(()=>__festival.state.rhythm.result().answerValue),null);
   }
   if(n===0||n===1||n===4){
    for(const note of notes){await seek(note.beat-.07);await down(value);if(note.end!=null)await seek(note.end-.07);await up(value);}
   }else if(n===3){await seek(timing.end+.05);await down(value);await up(value);}
   if(n===0)await page.screenshot({path:`qa/festival/game-${String(id).padStart(2,'0')}-${report.browser}.png`});
   await seek(timing.reveal+.1);
   const r=await page.evaluate(()=>__festival.state.results.at(-1));
   assert.equal(r.correct,n!==1&&n!==2,`game ${id} round ${n} arithmetic`);
   if(n===0||n===1||n===4)assert.equal(r.rhythmHits,notes.length,`game ${id} round ${n} rhythm ${JSON.stringify(r.events)}`);
   else assert.equal(r.rhythmHits,0,`game ${id} round ${n} must not auto-score`);
   assert.equal(r.rhythmTotal,notes.length);gameResults.push({correct:r.correct,hits:r.rhythmHits,total:r.rhythmTotal});
   if([4,21].includes(id)&&!q.truth)assert.ok((await page.locator('#equation').getAttribute('aria-label')).endsWith(String(q.answer)));
   await seek(timing.round+.05);
  }
  await page.waitForFunction(()=>!__festival.state.running);assert.equal(await page.locator('#result-correct').textContent(),'3 / 5');report.games.push({id,results:gameResults});await page.locator('#home-btn').click();
 }
 await page.locator('#tour-btn').click();await launch();const seen=[];
 const tables=await page.evaluate(()=>__festival.state.playlist.map(q=>q.a));
 assert.equal(new Set(tables).size,9);
 for(let n=0;n<63;n++){const state=await page.evaluate(()=>({id:__festival.state.question.gameId,timing:__festival.state.timing}));seen.push(state.id);await seek(state.timing.reveal+.1);await seek(state.timing.round+.1);}
 assert.equal(new Set(seen).size,21);assert.equal(await page.locator('#result-correct').textContent(),'0 / 63');report.checks.push('63-round balanced mixed tour visits all 21 games and 9 tables');await page.locator('#home-btn').click();
 await page.locator('.game-card[data-game="3"]').click();await page.locator('#start-single').click();await launch();await seek(2);
 await page.locator('#pause-btn').click();await page.waitForFunction(()=>__festival.state.paused);
 const before=await page.evaluate(()=>__festival.audio.now());await page.waitForTimeout(120);assert.ok(Math.abs(await page.evaluate(()=>__festival.audio.now())-before)<.02);
 await page.locator('#pause-settings').click();await page.locator('#voices-btn').click();await page.waitForSelector('#voice-collection button');assert.equal(await page.locator('#voice-collection button').count(),100);await page.locator('#voice-collection button').first().click();
 assert.ok(Math.abs(await page.evaluate(()=>__festival.audio.now())-before)<.02);await page.locator('.dialog-close').click();await page.waitForFunction(()=>!__festival.state.paused);
 report.checks.push('paused clock stays frozen through 100-voice preview');
 await seek(8);
 for(const viewport of [{width:844,height:390},{width:667,height:375},{width:932,height:430},{width:1280,height:800},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(70);
  if(await page.locator('#rotate').isVisible())await page.locator('#portrait-continue').click();
  if(await page.locator('#resume-btn').isVisible())await page.locator('#resume-btn').click();
  const bounds=await page.evaluate(()=>{const a=document.querySelector('#answers').getBoundingClientRect(),c=document.querySelector('#stage').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth+1,stageHeight:c.height,answerBottom:a.bottom,answerHeight:a.height,viewport:innerHeight};});
  assert.equal(bounds.overflow,false);assert.ok(bounds.stageHeight>100);assert.ok(bounds.answerHeight>=44);assert.ok(bounds.answerBottom<=bounds.viewport+1);report.viewports.push({...viewport,...bounds});await page.screenshot({path:`qa/festival/layout-${viewport.width}x${viewport.height}-${report.browser}.png`});
 }
 await page.evaluate(()=>__festival.home());assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);report.passed=true;console.log(JSON.stringify({passed:true,browser:report.browser,games:21,tour:63,viewports:report.viewports.length}));
}catch(error){report.failure=error.stack;throw error;}
finally{report.errors=errors;report.badResponses=bad;await writeFile(`qa/festival/browser-${report.browser}.json`,JSON.stringify(report,null,2));await browser.close();}
