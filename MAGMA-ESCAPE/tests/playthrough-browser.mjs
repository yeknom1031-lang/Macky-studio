import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.MAGMA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://localhost:4188/?test=1');await page.waitForFunction(()=>window.__magma);await page.locator('#loading').waitFor({state:'hidden'});await page.getByRole('button',{name:'冒険をはじめる'}).click();await page.getByRole('button',{name:'わかった、出発！'}).click();
  let target=1,left=false,right=false;await page.keyboard.down('Space');
  // Steer with actual browser key events; no teleport, physics stepping, or state changes.
  for(let i=0;i<400;i++){
    const s=await page.evaluate(()=>{const g=window.__magma.game;return {x:g.player.x,ground:g.player.ground,landed:g.highestLanded,alive:g.alive,platforms:g.platforms.map(p=>({id:p.id,x:p.x})),dialog:window.__magma.dialog};});
    assert(s.alive,'natural playthrough should survive the first ten meters');if(s.landed>=10)break;
    target=s.landed+1;
    const platform=s.platforms.find(p=>p.id===target);assert(platform);
    const dx=platform.x-s.x,wantLeft=dx<-9,wantRight=dx>9;
    if(wantLeft!==left){left=wantLeft;await page.keyboard[left?'down':'up']('ArrowLeft');}
    if(wantRight!==right){right=wantRight;await page.keyboard[right?'down':'up']('ArrowRight');}
    await page.waitForTimeout(35);
  }
  await page.keyboard.up('Space');await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');await page.getByRole('button',{name:'ポーズ'}).click();
  const result=await page.evaluate(()=>({height:window.__magma.game.height,landed:window.__magma.game.highestLanded,combo:window.__magma.game.maxCombo,perfects:window.__magma.game.perfects,claims:window.__magma.save.claims,coins:window.__magma.save.coins}));
  assert(result.landed>=10);assert(result.claims.includes(10));assert(result.combo>=5);assert(result.coins>200);assert.deepEqual(errors,[]);
  console.log('PASS: actual keyboard input climbs through the first 10m, earns combos and milestone, and pauses.',result);
}finally{await browser.close();}
