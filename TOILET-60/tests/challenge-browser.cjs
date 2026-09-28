const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../src/core.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results');
const url=require('node:url').pathToFileURL(path.join(root,'index.html')).href;
let browser;const results=[],errors=[],requests=[];
async function state(p){return p.evaluate(()=>ToiletApp.snapshot())}
async function run(p,ms){await p.clock.runFor(ms)}
async function click(p,name,exact=false){const d=p.getByRole('dialog');await (await d.count()?d:p).getByRole('button',{name,exact}).click()}
async function check(name,fn){await fn();results.push(name);console.log('PASS '+name)}
async function encounter(p){
  // Follow the first visible patrol with real keyboard input, until contact.
  for(let i=0;i<280;i++){
    const s=await state(p);if(s.mode==='talk')return s;assert.equal(s.state,'playing');
    const n=s.shoppers[0],route=C.path(s.map,s.player,n),next=route.length>1?route[1]:n;
    const dx=next.x-s.player.x,dy=next.y-s.player.y;
    const key=Math.abs(dx)>Math.abs(dy)?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowDown':'ArrowUp');
    await p.keyboard.down(key);await run(p,Math.max(17,Math.min(100,Math.hypot(dx,dy)/s.speeds[key]*1000)));await p.keyboard.up(key);
  }
  throw Error('Could not contact the nearby patrol');
}
(async()=>{
  browser=await chromium.launch({channel:'chrome'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
  await p.clock.install({time:new Date('2026-09-28T16:00:00Z')});await p.clock.pauseAt(new Date('2026-09-28T16:00:01Z'));await p.goto(url);
  await click(p,'ステージ選択',true);await p.locator('#map-variation').uncheck();await click(p,'このステージで遊ぶ');await click(p,'準備OK');await run(p,32);
  await check('Normal starts with only two occupied toilets and four kinds of patrols',async()=>{
    const s=await state(p);assert.equal(s.toilets.length,2);assert.ok(s.toilets.every(t=>!t.status.open));assert.equal(s.shoppers.length,28);assert.equal(new Set(s.shoppers.map(n=>n.kind)).size,4);
  });
  await check('Real walking contact starts a visible countdown and blocks keyboard, click and E escape',async()=>{
    await encounter(p);await run(p,80);let s=await state(p);assert.ok(await p.locator('.conversation').isVisible());assert.equal(s.paused,false);const before={...s.player},rem=s.remaining;
    await p.keyboard.press('e');await p.keyboard.press('q');await p.keyboard.press('Space');await p.locator('#world').click({position:{x:350,y:300}});
    await p.keyboard.down('ArrowLeft');await run(p,300);await p.keyboard.up('ArrowLeft');s=await state(p);assert.deepEqual(s.player,before);assert.ok(s.remaining<rem-.25);assert.equal(s.mode,'talk');
    await p.screenshot({path:path.join(out,'14-conversation.png'),fullPage:true});
  });
  await check('Reload during a conversation preserves its countdown; pause consumes neither clock',async()=>{
    await p.keyboard.press('Escape');const before=await state(p);await run(p,1200);assert.equal((await state(p)).talk.remaining,before.talk.remaining);
    await p.reload();await run(p,32);await click(p,'つづきから');const restored=await state(p);assert.equal(restored.mode,'talk');assert.equal(restored.paused,true);assert.equal(restored.talk.remaining,before.talk.remaining);assert.equal(restored.remaining,before.remaining);
    await click(p,'続ける');await p.setViewportSize({width:390,height:844});await run(p,64);
  });
  await check('Conversation fits a phone viewport and releases the player after listening',async()=>{
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const panel=await p.locator('.conversation').boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=390);
    await p.screenshot({path:path.join(out,'15-mobile-conversation.png'),fullPage:true});
    const s=await state(p);await run(p,Math.ceil(s.talk.remaining*1000)+64);const after=await state(p);assert.equal(after.mode,'explore');assert.ok(after.talkGrace>2);assert.ok(after.talkLost>3);assert.equal(after.talkCount,1);
  });
  await check('Sustained real sprint input exhausts stamina and walking time restores it',async()=>{
    await p.setViewportSize({width:1440,height:1000});await p.keyboard.press('Escape');await click(p,'同じマップでやり直す');await click(p,'準備OK');await run(p,32);
    await p.keyboard.down('Shift');
    for(let i=0;i<42&&!(await state(p)).exhausted;i++){const k=i%2?'ArrowLeft':'ArrowRight';await p.keyboard.down(k);await run(p,150);await p.keyboard.up(k);}
    await p.keyboard.up('Shift');let s=await state(p);assert.equal(s.exhausted,true);assert.ok(s.stamina<2);await run(p,80);assert.ok(await p.locator('.stamina-meter.exhausted').isVisible());
    await run(p,3400);s=await state(p);assert.equal(s.exhausted,false);assert.ok(s.stamina>=35);
  });
  await check('A previously empty stall returns to cleaning and then opens again',async()=>{
    let s=await state(p),t=s.toilets[1];await run(p,Math.ceil((t.openAt-s.elapsed)*1000)+80);s=await state(p);assert.equal(s.toilets[1].status.open,true);
    await run(p,t.openFor*1000);s=await state(p);assert.equal(s.toilets[1].status.reason,'清掃中');await run(p,t.closedFor*1000);assert.equal((await state(p)).toilets[1].status.open,true);
  });
  await check('No JavaScript exceptions or external requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[])});
  fs.writeFileSync(path.join(out,'challenge-browser-report.json'),JSON.stringify({passed:results.length,failed:0,results,errors,requests},null,2));await browser.close();
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(out,'challenge-browser-report.json'),JSON.stringify({passed:results.length,failed:1,results,error:e.stack,errors},null,2));if(browser)await browser.close();process.exit(1)});
