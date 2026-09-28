const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
function near(g,f){g.player.x=f.x;g.player.y=f.y;g.mode='explore';g.reveal();}
test('dungeons are over seven times the old area, and contain 130 nodes on Normal',()=>{
  for(const d of Object.keys(C.DIFFICULTIES)){const m=C.generate(12345,d);assert.ok(m.w*m.h>5000);assert.ok(m.floorCount>1800);assert.equal(m.features.length,62);assert.equal(m.gates.length,6);assert.equal(new Set(m.features.map(f=>`${f.x},${f.y}`)).size,m.features.length);}
  assert.equal(C.generate(12345).nodes.length,130);
});
test('gates only add shortcuts; all rooms and every feature are reachable before unlocking',()=>{
  for(let seed=0;seed<80;seed++){const g=new C.Game({seed:seed*379,difficulty:seed%2?'hard':'normal'}),dist=C.distances(g.map,g.player).dist;for(const n of [...g.map.nodes,...g.map.features,...g.map.toilets])assert.ok(dist[Math.floor(n.y)*g.map.w+Math.floor(n.x)]>=0);}
});
test('clock, keys, shoes and medals collect once, with capped time and real speed change',()=>{
  const g=new C.Game();g.remaining=50;
  for(const type of ['clock','key','boots','coin']){const f=g.map.features.find(f=>f.type===type);near(g,f);const before=g.remaining;g.update(.01);assert.equal(f.used,true);if(type==='clock')assert.ok(g.remaining>before+11);if(type==='key')assert.equal(g.keys,1);if(type==='boots')assert.ok(g.speed()>4.2);if(type==='coin')assert.equal(g.coins,1);g.update(.01);if(type==='coin')assert.equal(g.coins,1);}
  g.remaining=g.limit;g.give('clock');assert.equal(g.remaining,g.limit);
});
test('locked shortcuts consume one key or respond to their numbered switch',()=>{
  const g=new C.Game(),gate=g.map.gates[0];near(g,{x:gate.x-2,y:gate.y});g.interact();assert.equal(gate.open,false);
  g.keys=1;g.interact();assert.equal(gate.open,true);assert.equal(g.keys,0);assert.ok(gate.tiles.every(t=>C.floor(g.map,t.x,t.y)));
  const sw=g.map.features.find(f=>f.type==='switch'&&f.gateId===1);near(g,sw);g.interact();assert.equal(g.map.gates[1].open,true);assert.equal(g.keys,0);
});
test('mystery lockers have deterministic rewards; benches and maps are one-use',()=>{
  const g=new C.Game(),copy=new C.Game();const f=g.map.features.find(f=>f.type==='chest');assert.equal(f.reward,copy.map.features.find(c=>c.id===f.id).reward);near(g,f);g.interact();assert.equal(f.used,true);
  const bench=g.map.features.find(f=>f.type==='fountain');g.remaining=30;near(g,bench);g.interact();assert.equal(g.remaining,50);g.interact();assert.equal(g.remaining,50);
  const map=g.map.features.find(f=>f.type==='terminal');near(g,map);g.interact();assert.equal(g.mapKnown,true);assert.ok(g.map.toilets.every(t=>t.discovered));assert.ok(g.seen.every(Boolean));
});
test('elevators move the player and companion, respect cooldown, and stop click paths',()=>{
  const g=new C.Game(),f=g.map.features.find(f=>f.type==='warp'),target=g.map.features.find(t=>t.id===f.targetId);g.map.buddy.active=true;near(g,f);g.interact();assert.ok(C.distance(g.player,target)<.001);assert.ok(C.distance(g.map.buddy,target)<1.1);assert.equal(g.autoPath.length,0);
  g.interact();assert.ok(C.distance(g.player,target)<.001);g.update(3.1);g.interact();assert.ok(C.distance(g.player,f)<.001);
});
test('wet floors penalize sprinting but not walking; moving walkways change speed by direction',()=>{
  const g=new C.Game(),f=g.map.features.find(f=>f.type==='puddle');near(g,f);g.update(.01,{x:1});assert.equal(g.penalties,0);g.update(.01,{x:1,sprint:true});assert.equal(g.penalties,1);g.update(.01,{x:1,sprint:true});assert.equal(g.penalties,1);
  const belt=g.map.features.find(f=>f.type==='conveyor');near(g,belt);assert.ok(g.speed(false,belt.dx,0)>g.speed(false,-belt.dx,0));
});
test('resume restores used items, opened gates, explored map, position and exact remaining time',()=>{
  const g=new C.Game({seed:731,theme:4});g.update(10);g.keys=2;g.coins=3;g.map.features[0].used=true;g.openGate(g.map.gates[0]);g.mapKnown=true;g.seen.fill(1);const restored=C.Game.restore(g.serialize());
  assert.ok(restored);assert.equal(restored.paused,true);assert.equal(restored.remaining,g.remaining);assert.deepEqual(restored.player,g.player);assert.equal(restored.keys,2);assert.equal(restored.coins,3);assert.equal(restored.map.gates[0].open,true);assert.equal(restored.map.features[0].used,true);assert.ok(restored.seen.every(Boolean));
  restored.update(30);assert.equal(restored.remaining,g.remaining);restored.paused=false;restored.update(1);assert.ok(restored.remaining<g.remaining);
});
test('invalid, expired or old saves fail closed without breaking a fresh game',()=>{
  for(const x of ['bad','null','{}','{"version":1}'])assert.equal(C.Game.restore(x),null);
  const g=new C.Game(),obj=JSON.parse(g.serialize());obj.state.remaining=0;assert.equal(C.Game.restore(JSON.stringify(obj)),null);obj.state.remaining=50;obj.state.player.x=-1;assert.equal(C.Game.restore(JSON.stringify(obj)),null);
});
