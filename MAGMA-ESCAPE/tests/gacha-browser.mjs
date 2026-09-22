import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.MAGMA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
await fs.mkdir(new URL('../test-output/',import.meta.url),{recursive:true});
const shot=async name=>{await page.waitForTimeout(400);await page.screenshot({path:new URL(`../test-output/${name}.png`,import.meta.url).pathname,animations:'disabled'});};
const state=()=>page.evaluate(()=>JSON.stringify(window.__magma.save));
const boot=async()=>{await page.waitForFunction(()=>window.__magma);await page.locator('#loading').waitFor({state:'hidden'});};
const checkFits=async selector=>{const b=await page.locator(selector).boundingBox();assert(b&&b.y>=0&&b.y+b.height<=844,`${selector} must be visible within viewport`);};
try{
  await page.goto('http://localhost:4188/?test=1');await boot();
  await page.getByRole('button',{name:'ガチャ',exact:true}).click();
  const before=await state();
  for(const id of ['ember','mint','violet','ice','phoenix']){
    await page.locator('[data-action="preview-select"]').click();await page.locator(`[data-action="preview"][data-id="${id}"]`).click();
    await page.waitForFunction(()=>window.__magma.cinema?.phase==='ready');
    assert.equal(await state(),before,'preview must not change currency or ownership');
    await page.locator('[data-cinema="open"]').click();await page.waitForFunction(()=>window.__magma.cinema?.phase==='reveal');
    await checkFits('.reward-actions');await checkFits('.reward-copy');await shot(`v2-preview-${id}`);
    assert.equal(await page.locator('[data-cinema="equip"]').count(),0);assert.equal(await state(),before);
    await page.locator('[data-cinema="next"]').click();
  }
  // Real purchase is exactly once despite rapid repeated activation; closing mid-animation restores the same result.
  await page.evaluate(()=>{window.__magma.save.coins=1000;window.__magma.persist();});
  await page.locator('[data-action="draw"][data-count="1"]').click();
  await page.evaluate(()=>document.querySelector('[data-action="draw"]').click());
  assert.equal(await page.evaluate(()=>window.__magma.save.draws),1);
  const paid=await state();await page.reload();await boot();assert.equal(await state(),paid);assert(await page.locator('.gacha-cinema').isVisible());
  await page.locator('[data-cinema="skip"]').click();await page.waitForFunction(()=>window.__magma.cinema?.phase==='reveal');
  await page.locator('[data-cinema="equip"]').click();const drawn=await page.evaluate(()=>window.__magma.save.pending.entries[0].id);assert.equal(await page.evaluate(()=>window.__magma.save.equipped),drawn);
  await page.locator('[data-cinema="next"]').click();assert.equal(await page.evaluate(()=>window.__magma.save.pending),null);
  await page.evaluate(()=>{window.__magma.save.coins=1000;window.__magma.persist();});await page.locator('[data-action="draw"][data-count="5"]').click();
  assert.equal(await page.evaluate(()=>window.__magma.save.draws),6);const batch=await page.evaluate(()=>window.__magma.save.pending);assert.equal(batch.entries.length,5);
  assert.equal(await page.evaluate(()=>window.__magma.save.coins),550+batch.entries.reduce((n,e)=>n+e.refund,0));
  // Open first capsule, then skip remaining, equip from summary.
  await page.waitForFunction(()=>window.__magma.cinema?.phase==='ready');await page.locator('[data-cinema="open"]').click();await page.waitForFunction(()=>window.__magma.cinema?.phase==='reveal');await page.locator('[data-cinema="next"]').click();assert.equal(await page.evaluate(()=>window.__magma.cinema.index),1);
  await page.locator('[data-cinema="skip"]').click();await shot('v2-batch-summary');assert.equal(await page.locator('.summary-grid article').count(),5);
  const summaryEquip=page.locator('.summary-grid [data-cinema="equip"]').last();const id=await summaryEquip.getAttribute('data-id');await summaryEquip.click();assert.equal(await page.evaluate(()=>window.__magma.save.equipped),id);
  await page.locator('[data-cinema="finish"]').click();assert.equal(await page.evaluate(()=>window.__magma.save.pending),null);
  // Insufficient balance leaves currency and ownership untouched.
  await page.evaluate(()=>{window.__magma.save.coins=99;window.__magma.persist();});const poor=await state();await page.locator('[data-action="draw"][data-count="1"]').click();assert.equal(await state(),poor);assert.equal(await page.locator('.gacha-cinema').count(),0);
  await page.locator('[data-action="back"]').click();await page.getByRole('button',{name:'コレクション',exact:true}).click();await shot('v2-collection-mobile');
  // Reduced motion uses the same outcome but short transitions. Small iPhone layout keeps controls accessible.
  await page.setViewportSize({width:375,height:667});await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="preview"][data-id="phoenix"]').click();await page.waitForFunction(()=>window.__magma.cinema?.phase==='ready');await page.locator('[data-cinema="open"]').click();await page.waitForFunction(()=>window.__magma.cinema?.phase==='reveal');await shot('v2-legend-iphone-se');
  const footer=await page.locator('.reward-actions').boundingBox();assert(footer.y+footer.height<=667);await page.locator('[data-cinema="next"]').click();
  // Summit is reached through the actual engine's landing collision/event path.
  await page.evaluate(()=>{window.__magma.save.tutorial=true;window.__magma.start();const g=window.__magma.game;g.generate(115);const s=g.platforms.find(p=>p.id===100);Object.assign(g.player,{x:s.x,y:s.y+2,vy:-250,vx:0,ground:null});g.peak=s.y;g.camera=s.y-275;g.lava=s.y-500;});
  await page.waitForFunction(()=>window.__magma.dialog==='summit');await shot('v2-summit');assert(await page.evaluate(()=>window.__magma.save.claims.includes(100)));
  await page.locator('[data-action="endless"]').click();assert.equal(await page.evaluate(()=>window.__magma.game.paused),false);assert((await page.evaluate(()=>window.__magma.game.hunger))>99);
  await page.evaluate(()=>{const g=window.__magma.game;g.height=110;g.pause();});await shot('v2-sky-zone');
  assert.deepEqual(errors,[]);
  console.log('PASS: all 5 rarity cinematics, charge/drop/tap/reveal, free previews, multi-click guard, reload recovery, equip, 5-draw sequential+skip+summary, insufficient coins, reduced motion, 375x667 controls, 100m landing rewards, endless continuation; no browser errors.');
}finally{await browser.close();}
