// Run against `node server.mjs`. Set NODE_PATH to an installed Playwright package if needed.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
await mkdir('qa',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const url=process.env.GAME_URL||'http://127.0.0.1:4177';
try{
  await page.goto(`${url}/?test=1`);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:'qa/home-desktop.png',fullPage:true});
  await page.locator('#start-button').click();
  await page.waitForFunction(()=>window.__kuku.roundIndex===0);
  for(let i=0;i<9;i++){
    await page.waitForFunction(i=>window.__kuku.roundIndex===i,nullSafe(i),{timeout:15000});
    if(i===2){ // Intentionally unanswered: must be reviewed, with no false correct score.
      await page.waitForFunction(()=>window.__kuku.results[2]);continue;
    }
    const state=await page.evaluate(()=>window.__kuku);
    const q=state.course[i];
    const choice=i===1?q.choices.find(x=>x!==q.answer):q.answer;
    const option=q.choices.indexOf(choice);
    if(i===3){
      await page.locator('#pause-button').click();
      await page.waitForFunction(()=>window.__kuku.audioState==='suspended');
      const beat=await page.evaluate(()=>window.__kuku.beat);
      await page.waitForTimeout(1200);
      assert(Math.abs(await page.evaluate(()=>window.__kuku.beat)-beat)<.05,'audio/game clock moved while paused');
      await page.locator('#resume-button').click();
      await page.waitForFunction(()=>!window.__kuku.paused&&window.__kuku.audioState==='running');
    }
    await page.keyboard.press(`Digit${option+1}`);
    assert.equal(await page.evaluate(()=>window.__kuku.picked),choice,`selection was lost in round ${i+1}`);
    if(i===4){
      await page.waitForFunction(()=>!!window.__kuku.results[4]);
      assert.equal(await page.evaluate(()=>window.__kuku.results[4].correct),true,'correct selection should count even without stopping');
      assert.equal(await page.evaluate(()=>window.__kuku.results[4].rhythm),'miss');
      continue;
    }
    if(i===0){await page.locator('#hint-button').click();assert.match(await page.locator('#hint-text').innerText(),/7 × 1 = 7/);}
    await page.waitForFunction(([i,at])=>window.__kuku.roundIndex===i&&window.__kuku.position.local>=at,[i,i===0?4.4:7.98]);
    await page.keyboard.press('Space');
    await page.waitForFunction(i=>!!window.__kuku.results[i],i);
    console.log('Round',i+1,await page.evaluate(i=>window.__kuku.results[i],i));
    if(i===6)await page.screenshot({path:'qa/game-success.png',fullPage:true});
    const count=await page.evaluate(()=>window.__kuku.results.length);
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(()=>window.__kuku.results.length),count,'double submission');
  }
  await page.waitForFunction(()=>window.__kuku.screen==='results',null,{timeout:15000});
  const state=await page.evaluate(()=>window.__kuku);
  await writeFile('qa/last-state.json',JSON.stringify(state,null,2));
  assert.equal(state.results.length,9);
  assert.equal(state.results.filter(r=>r.correct).length,7);
  assert.equal(state.results[0].rhythm,'off');
  assert.equal(state.results[0].correct,true);
  assert.equal(state.results[1].correct,false);
  assert.equal(state.results[1].rhythm,'perfect');
  assert.equal(state.results[2].choice,null);
  assert.equal(await page.locator('.review-item.needs-review').count(),2);
  assert.equal(state.sourceCount,0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kuku-jackpot-history')).length),1);
  await page.screenshot({path:'qa/results-desktop.png',fullPage:true});
  await page.locator('.review-item').nth(6).click();
  assert.equal(await page.evaluate(()=>window.__kuku.sourceCount),1);
  await page.locator('#home-button').click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'qa/home-mobile.png',fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile horizontal overflow');
  await page.locator('[data-mode="challenge"]').click();
  await page.locator('#start-button').click();
  await page.waitForFunction(()=>window.__kuku.roundIndex===0);
  assert.equal(await page.locator('#hint-button').isVisible(),false);
  assert.equal(await page.locator('#hint-button').isDisabled(),true);
  assert.deepEqual((await page.evaluate(()=>window.__kuku.course.map(q=>q.n))).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9]);
  await page.screenshot({path:'qa/game-mobile.png',fullPage:true});
  await page.locator('#settings-button').click();
  await page.locator('#music-volume').focus();await page.keyboard.press('Home');
  for(let step=0;step<25;step++)await page.keyboard.press('ArrowRight');
  await page.locator('#settings-dialog [data-close]').first().click();
  await page.waitForFunction(()=>!document.getElementById('settings-dialog').open&&!window.__kuku.paused);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kuku-jackpot-settings')).music),25);
  await page.keyboard.press('Escape');
  await page.locator('#quit-button').click();
  await page.locator('#watch-button').click();
  await page.waitForFunction(()=>window.__kuku.results.length>=1,{},{timeout:12000});
  assert.equal(await page.evaluate(()=>window.__kuku.results[0].correct),true);
  await page.keyboard.press('Escape');await page.locator('#quit-button').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kuku-jackpot-history')).length),1,'demo must not write a player score');
  assert.deepEqual(errors,[]);
  await writeFile('qa/browser-report.json',JSON.stringify({passed:true,results:state.results,errors,viewports:['1280×900','390×844'],checks:['9-round completion','wrong answer','unanswered question','independent rhythm grading','pause/resume','duplicate input','saved history','voice replay','challenge mode','mobile layout','volume persistence','demo auto-play and no score pollution']},null,2));
  console.log('PASS: full song, 9 rounds, pause/resume, both modes, demo, mobile, saved settings; no browser errors.');
}finally{await browser.close();}
function nullSafe(value){return value;}
