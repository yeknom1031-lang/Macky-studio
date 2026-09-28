const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

function play(stage, level = 1, seed = 100, passive = false) {
  const s = C.freshSave(); s.levels.fill(level);
  const b = new C.Battle(stage,s,seed);
  let decision = 0;
  for (let i=0;i<6002&&!b.result;i++) {
    if(!passive && b.time>=decision) {
      decision=b.time+.5;
      b.assist();
    }
    b.step(.05); b.drainEvents();
    assert.ok(b.money>=0&&b.money<=b.maxMoney);
    assert.ok(b.units.length<=61);
  }
  return b;
}
test('save recovery rejects corrupt values and preserves a legal party',()=>{
  const s=C.normalizeSave({version:1,leaves:-10,gems:Infinity,levels:[NaN,999],owned:[88,7],team:[7,7,-1,99],stars:[3,0,3],lastStage:99});
  assert.equal(s.leaves,0);assert.equal(s.levels[1],20);assert.equal(new Set(s.team).size,6);assert.equal(s.cleared,1);assert.equal(s.lastStage,1);
  assert.deepEqual(C.normalizeSave(null),C.freshSave());
});
test('deploy respects cost, cooldown, and team membership',()=>{
  const b=new C.Battle(0,C.freshSave(),1);assert.equal(b.deploy(3),false);assert.equal(b.deploy(7),false);
  assert.equal(b.deploy(1),true);assert.equal(b.money,100);assert.equal(b.deploy(1),false);
  for(let i=0;i<100;i++)b.step(.05);assert.equal(b.deploy(1),true);
});
test('healer restores allies and cannon knocks enemies back',()=>{
  const b=new C.Battle(0,C.freshSave(),2);b.money=700;b.deploy(1);b.deploy(4);
  const knight=b.units[0];knight.hp=100;
  for(let i=0;i<35;i++)b.step(.05);
  assert.ok(knight.hp>100);
  b.enemy(8);const e=b.units.find(u=>u.side<0);e.x=600;b.cannon=30;assert.equal(b.fire(),true);assert.ok(e.hp<=0);assert.equal(e.x,665);assert.equal(b.fire(),false);
});
test('upgrade charges the exact amount and refuses an unaffordable upgrade',()=>{
  const s=C.freshSave(),price=C.upgradeCost(1);assert.equal(C.upgrade(s,1),true);assert.equal(s.leaves,1200-price);assert.equal(s.levels[1],2);
  s.leaves=0;assert.equal(C.upgrade(s,1),false);assert.equal(C.upgrade(s,7),false);
});
test('summon guarantees a missing friend every fourth draw and handles duplicates',()=>{
  const s=C.freshSave();for(let i=0;i<3;i++){const r=C.summon(s,()=>0);assert.equal(r.isNew,false);assert.equal(r.gift,180);}
  const r=C.summon(s,()=>0);assert.equal(r.isNew,true);assert.ok(s.owned.includes(6));assert.equal(s.gems,0);assert.equal(C.summon(s),null);
});
test('first clear rewards, stars, chapter unlock and claims are idempotent',()=>{
  const s=C.freshSave();s.stars=[3,3,3,0,0,0,0,0,0,0,0,0];s.cleared=3;
  const b=new C.Battle(3,s,1);b.enemyHp=0;b.checkEnd();const r=b.claim(s);
  assert.equal(r.win,true);assert.equal(r.first,true);assert.equal(r.unlocked,6);assert.equal(s.cleared,4);assert.ok(s.owned.includes(6));const total=s.leaves;assert.equal(b.claim(s),null);assert.equal(s.leaves,total);
  const replay=new C.Battle(3,s,1);replay.enemyHp=0;replay.checkEnd();assert.equal(replay.claim(s).gems,0);
});
test('all campaign stages can be won at suitable progression levels',()=>{
  const report=[];
  for(let stage=0;stage<12;stage++){const level=1+Math.floor(stage/3);const b=play(stage,level);report.push({stage:stage+1,level,result:b.result,time:Math.round(b.time),hp:b.hp});assert.equal(b.result,'victory',JSON.stringify(report));}
  console.log('Campaign balance:',JSON.stringify(report));
});
test('doing nothing loses and cannot unlock the next stage',()=>{
  const b=play(0,1,100,true);assert.equal(b.result,'defeat');const s=C.freshSave();const r=b.claim(s);assert.equal(r.stars,0);assert.equal(s.cleared,0);
});
test('simulation is deterministic and supports random enemy variations',()=>{
  const a=play(4,3,42),b=play(4,3,42),c=play(4,3,61);
  assert.deepEqual([a.time,a.kills,a.hp],[b.time,b.kills,b.hp]);
  assert.notDeepEqual([a.time,a.kills,a.nextWave,a.units.map(u=>u.phase)],[c.time,c.kills,c.nextWave,c.units.map(u=>u.phase)]);
});
