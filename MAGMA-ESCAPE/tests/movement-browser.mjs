import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.MAGMA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir(new URL('../test-output/',import.meta.url),{recursive:true});
const shot=name=>page.screenshot({path:new URL(`../test-output/${name}.png`,import.meta.url).pathname});
try{
  await page.goto('http://localhost:4188/?test=1');await page.waitForFunction(()=>window.__magma);await page.locator('#loading').waitFor({state:'hidden'});await page.getByRole('button',{name:'冒険をはじめる'}).click();await page.getByRole('button',{name:'わかった、出発！'}).click();
  await page.keyboard.press('Space');await page.waitForFunction(()=>window.__magma.game.player.y>10);await page.waitForTimeout(250);await page.keyboard.press('Space');await page.waitForFunction(()=>!window.__magma.game.airJumpAvailable);assert((await page.evaluate(()=>window.__magma.game.player.vy))>400);await shot('v21-double-jump');
  await page.keyboard.press('Escape');
  // Fixture only sets the starting position; the real key/pointer path performs the move.
  await page.evaluate(()=>{const g=window.__magma.game;Object.assign(g.player,{x:18,y:280,ground:null,coyote:0,vy:-180,vx:0});g.lastWall=0;g.wallLock=0;g.airJumpAvailable=false;});await page.getByRole('button',{name:'冒険をつづける'}).click();await page.keyboard.down('ArrowLeft');await page.keyboard.press('Space');await page.waitForFunction(()=>window.__magma.game.lastWall===-1&&window.__magma.game.player.vx>250);assert(await page.evaluate(()=>window.__magma.game.airJumpAvailable));await page.keyboard.up('ArrowLeft');await shot('v21-wall-kick');
  await page.getByRole('button',{name:'ポーズ'}).click();
  // On mobile, two deliberate taps also use only one air jump.
  await page.evaluate(()=>{const g=window.__magma.game;Object.assign(g.player,{x:210,y:350,ground:null,coyote:0,vy:250,vx:0});g.airJumpAvailable=true;g.wallLock=0;});await page.getByRole('button',{name:'冒険をつづける'}).click();await page.getByRole('button',{name:'ジャンプ',exact:true}).tap();await page.waitForFunction(()=>!window.__magma.game.airJumpAvailable);
  for(const kind of ['quiz','battle']){
    await page.evaluate(kind=>{const m=window.__magma;m.start();const g=m.game;g.generate(60);g.nextShop=1000;const s=g.platforms.find(s=>s.encounter?.type===kind);Object.assign(g.player,{x:s.x-s.encounter.offset,y:s.y,vy:0,vx:0,ground:s.id,coyote:.1});g.peak=s.y;g.camera=s.y-275;g.lava=s.y-300;},kind);
    await page.waitForTimeout(750);assert.equal(await page.evaluate(()=>window.__magma.dialog),null);await shot(`v21-visible-${kind}`);
    // Touch the rendered object via ordinary movement toward its position.
    const direction=await page.evaluate(kind=>{const g=window.__magma.game,s=g.platforms.find(s=>s.encounter?.type===kind);return s.encounter.offset<0?'ArrowLeft':'ArrowRight';},kind);
    await page.keyboard.down(direction);await page.waitForFunction(kind=>window.__magma.dialog===kind,kind);await page.keyboard.up(direction);assert(await page.evaluate(()=>window.__magma.game.paused));await shot(`v21-contact-${kind}`);
  }
  await page.evaluate(()=>{const m=window.__magma;m.start();const g=m.game;g.generate(60);const s=g.platforms.find(s=>s.id===32);Object.assign(g.player,{x:s.x,y:s.y,vy:0,vx:0,ground:s.id});g.peak=s.y;g.camera=s.y-275;g.lava=s.y-230;g.time=21.05;g.nextShop=1000;});
  await page.waitForFunction(()=>window.__magma.game.pressure.phase==='warning');await shot('v21-magma-warning');await page.waitForFunction(()=>document.querySelector('#pressure-label').textContent.includes('RUSH'));await shot('v21-magma-rush');assert((await page.locator('#pressure-label').innerText()).includes('RUSH'));
  await page.getByRole('button',{name:'ポーズ'}).click();const lava=await page.evaluate(()=>window.__magma.game.lava);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.__magma.game.lava),lava);
  assert.deepEqual(errors,[]);console.log('PASS: keyboard double jump, wall kick, touch air jump, visible optional encounters triggered by movement contact, magma warning+surge HUD, pause; no browser errors.');
}finally{await browser.close();}
