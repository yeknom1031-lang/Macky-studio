const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../src/core.js');
function encounter(options={},kind='survey'){
  const g=new C.Game(options);
  const n={id:0,kind,x:g.player.x+.45,y:g.player.y,path:[],goal:0,speed:0,cooldown:0};
  g.map.shoppers=[n];return {g,n};
}
test('scarce toilets start occupied, crowds scale, and recovery is less abundant',()=>{
  for(const d of Object.keys(C.DIFFICULTIES)){
    const g=new C.Game({difficulty:d}),cfg=C.DIFFICULTIES[d];
    assert.equal(g.map.toilets.length,cfg.toilets);assert.ok(g.map.toilets.every(t=>!g.toiletStatus(t).open));
    assert.equal(g.map.shoppers.length,cfg.people);assert.equal(new Set(g.map.shoppers.map(n=>n.kind)).size,4);
    assert.equal(g.map.features.filter(f=>f.type==='clock').length,3);assert.equal(g.map.features.filter(f=>f.type==='fountain').length,1);
    assert.equal(g.map.features.filter(f=>f.type==='rubble').length,6);assert.equal(g.map.features.filter(f=>f.type==='alarm').length,5);
  }
  const practice=new C.Game({practice:true});assert.equal(practice.map.shoppers.length,0);assert.ok(practice.map.toilets.some(t=>practice.toiletStatus(t).open));
});
test('toilets alternate between open, cleaning, and occupied without interrupting entry',()=>{
  const g=new C.Game(),t=g.map.toilets[1];g.map.shoppers=[];
  assert.equal(g.toiletStatus(t,t.openAt).open,true);
  assert.equal(g.toiletStatus(t,t.openAt+t.openFor).reason,'清掃中');
  assert.equal(g.toiletStatus(t,t.openAt+t.openFor+t.closedFor).open,true);
  assert.equal(g.toiletStatus(t,t.openAt+t.openFor*2+t.closedFor).reason,'使用中');
  g.elapsed=t.openAt+t.openFor-.1;g.player.x=t.x;g.player.y=t.y;g.interact();g.update(3.1);assert.equal(g.state,'won');
});
test('contact while walking locks movement and actions, costs real time, and ends automatically',()=>{
  const {g}=encounter();g.update(.02,{x:1});assert.equal(g.mode,'talk');const before={...g.player},rem=g.remaining,duration=g.talk.remaining;
  g.interact();g.yieldBuddy();assert.equal(g.setDestination({x:g.player.x-1,y:g.player.y}),false);
  g.update(1,{x:-1,y:1,sprint:true});assert.deepEqual(g.player,before);assert.ok(Math.abs(g.remaining-(rem-1))<1e-6);assert.equal(g.mode,'talk');
  g.update(duration-1+.01);assert.equal(g.mode,'explore');assert.ok(g.talkLost>=duration-.01);assert.ok(g.talkGrace>2.4);
  g.update(.1,{x:-1});assert.ok(g.player.x<before.x);assert.equal(g.talkCount,1);
});
test('sprint collisions add two seconds; people can also approach an idle player',()=>{
  const a=encounter(),b=encounter();a.g.update(.02,{x:1});b.g.update(.02,{x:1,sprint:true});
  assert.equal(b.g.talk.total,a.g.talk.total+2);
  const c=encounter();c.g.update(.02);assert.equal(c.g.mode,'talk');
});
test('conversation pause freezes the timer; expiry can lose during dialogue',()=>{
  const {g}=encounter();g.update(.02);g.paused=true;const before=g.serialize();g.update(100);assert.equal(g.serialize(),before);
  g.paused=false;g.remaining=.5;g.update(1,{x:1});assert.equal(g.state,'lost');assert.equal(g.mode,'talk');assert.equal(g.remaining,0);
});
test('conversation immunity prevents another person chaining an immediate interruption',()=>{
  const {g,n}=encounter();g.update(.02);const second={...n,id:1,cooldown:0};g.map.shoppers.push(second);
  g.update(g.talk.remaining+.1);assert.equal(g.mode,'explore');assert.equal(g.talkCount,1);
  g.update(2);assert.equal(g.mode,'explore');g.update(.5);assert.equal(g.mode,'talk');assert.equal(g.talkCount,2);
});
test('stamina exhaustion falls back to walking and recovers above the restart threshold',()=>{
  const g=new C.Game();g.map.shoppers=[];g.map.features=[];
  for(let i=0;i<200&&!g.exhausted;i++)g.update(.04,{x:i%4<2?1:-1,sprint:true});
  assert.equal(g.exhausted,true);assert.equal(g.speed(true),g.speed(false));
  g.update(1.5);assert.equal(g.exhausted,true);g.update(1.8);assert.equal(g.exhausted,false);assert.ok(g.stamina>=35);assert.ok(g.speed(true)>g.speed(false));
});
test('rubble slows movement and no-running zones only punish actual sprinting with a cooldown',()=>{
  const g=new C.Game();g.map.shoppers=[];const rubble=g.map.features.find(f=>f.type==='rubble');g.player.x=rubble.x;g.player.y=rubble.y;assert.ok(g.speed()<2);
  const alarm=g.map.features.find(f=>f.type==='alarm');g.player.x=alarm.x;g.player.y=alarm.y;g.update(.01,{x:1});assert.equal(g.penalties,0);
  const before=g.remaining;g.update(.01,{x:1,sprint:true});assert.equal(g.penalties,1);assert.ok(before-g.remaining>5);
  g.update(.01,{x:-1,sprint:true});assert.equal(g.penalties,1);
  alarm.cooldown=0;g.exhausted=true;g.stamina=0;g.update(.01,{x:-1,sprint:true});assert.equal(g.penalties,1);
});
test('conversation and stamina survive reload without freeing the player or charging offline time',()=>{
  const g=new C.Game(),n=g.map.shoppers[0];g.player.x=n.x;g.player.y=n.y;g.startTalk(n,true);g.stamina=12;g.exhausted=true;g.update(1);
  const r=C.Game.restore(g.serialize());assert.ok(r);assert.equal(r.paused,true);assert.equal(r.mode,'talk');assert.deepEqual(r.talk,g.talk);assert.equal(r.stamina,g.stamina);assert.equal(r.exhausted,true);
  r.update(90);assert.equal(r.remaining,g.remaining);r.paused=false;r.update(r.talk.remaining+.01);assert.equal(r.mode,'explore');
});
test('a real version 2 save migrates with position, clock, inventory and opened shortcuts',()=>{
  const raw=fs.readFileSync(path.join(__dirname,'fixtures/v2-save.json'),'utf8'),old=JSON.parse(raw),g=C.Game.restore(raw);
  assert.ok(g);assert.equal(g.migrated,true);assert.equal(g.paused,true);assert.equal(g.map.toilets.length,2);assert.equal(g.map.shoppers.length,28);assert.deepEqual(g.player,old.state.player);assert.equal(g.remaining,old.state.remaining);assert.equal(g.keys,2);assert.equal(g.map.gates[0].open,true);assert.equal(g.mode,'explore');
  assert.ok(C.Game.restore(g.serialize()));
});
