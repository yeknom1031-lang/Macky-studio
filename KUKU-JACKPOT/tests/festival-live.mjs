// Real wall-clock pointer input: no seek, no direct calls into the rhythm engine.
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(import.meta.url)('playwright');
const wk=process.env.KUKU_TEST_BROWSER==='webkit';
const browser=await(wk?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']}));
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await mkdir('qa/festival',{recursive:true});
try{
 await page.goto(process.env.KUKU_TEST_URL||'http://127.0.0.1:4193',{waitUntil:'networkidle'});
 for(const id of [1,3,21]){
  await page.locator(`.game-card[data-game="${id}"]`).click();await page.locator('#start-single').click();await page.waitForSelector('#intro-start:visible');await page.locator('#intro-start').click();
  const {notes,q}=await page.evaluate(()=>({notes:__festival.state.pattern.notes,q:__festival.state.question}));
  const value=id===21?Number(!q.truth):q.answer;
  const button=page.locator(`#answers [data-value="${value}"]`),rect=await button.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
  for(const note of notes){
   await page.waitForFunction(b=>(__festival.audio.now()-__festival.state.roundStart)/(60/132)>=b,note.beat-.035,{polling:'raf'});
   await page.mouse.down();
   if(note.end!=null){
    await page.waitForFunction(b=>(__festival.audio.now()-__festival.state.roundStart)/(60/132)>=b,note.end-.035,{polling:'raf'});
   }
   await page.mouse.up();
  }
  await page.waitForFunction(()=>__festival.state.results.length===1);
  const result=await page.evaluate(()=>__festival.state.results[0]);
  assert.equal(result.correct,id!==21);assert.equal(result.rhythmHits,notes.length,JSON.stringify(result));
  if(id===21){await page.waitForFunction(()=>__festival.audio.spoken?.key?.startsWith('C'));const key=await page.evaluate(()=>__festival.audio.spoken.key);assert.ok(Number(key.slice(1))>=51&&Number(key.slice(1))<=70,'wrong answer received a positive correctness cheer');checks.push({check:'wrong-answer cheer actually played',key});}
  checks.push({id,hits:result.rhythmHits,total:result.rhythmTotal,errorsBeats:result.events.map(e=>e.error??e.endError)});
  await page.screenshot({path:`qa/festival/live-${id}-${wk?'WebKit':'Chrome'}.png`});
  await page.locator('#pause-btn').click();await page.locator('#quit-btn').click();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,browser:wk?'WebKit':'Chrome',checks}));
}finally{await mkdir('qa/festival',{recursive:true});await writeFile(`qa/festival/live-${wk?'WebKit':'Chrome'}.json`,JSON.stringify({checks,errors},null,2));await browser.close();}
