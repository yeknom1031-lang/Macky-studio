const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
const meta=require('../assets/sprite-meta.json');
C.setNavigation(require('../assets/navigation.json'));

test('7 scenes always start with 600 people, all 320 looks, and exactly one matching target',()=>{
 assert.equal(C.STAGES.length,7);
 for(let stage=0;stage<7;stage++)for(let seed=1;seed<=12;seed++){
  const s=C.create(stage,seed);assert.equal(s.people.length,600);assert.equal(new Set(s.people.map(p=>p.type)).size,320);
  assert.equal(s.people.filter(p=>p.type===s.targetType).length,1);assert.equal(s.remaining,180);assert.equal(s.status,'ready');
 }
});
test('Raw navigation moves all agents along connected routes inside the scene',()=>{
 for(let stage=0;stage<7;stage++){
  const s=C.create(stage,423+stage),initial=s.people.map(p=>[p.x,p.y]),moved=new Set();C.start(s);
  for(let frame=0;frame<20;frame++){C.step(s,.05);for(const p of s.people)if(Math.hypot(p.x-initial[p.id][0],p.y-initial[p.id][1])>.05)moved.add(p.id);}
  assert.equal(moved.size,600);
  for(let sec=0;sec<178;sec++){
   C.step(s,1);assert.equal(s.people.length,600);
   for(const p of s.people){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>0&&p.x<C.WIDTH&&p.y>0&&p.y<C.HEIGHT);assert.ok(s.graph.nodes[p.from].links.includes(p.to));assert.ok(p.phase>=0&&p.phase<1);}
  }
  assert.equal(s.status,'playing');C.step(s,1);assert.equal(s.status,'lost');assert.equal(s.remaining,0);
 }
});
test('Ready and pause freeze the clock, expiry happens at exactly 180 seconds',()=>{
 const s=C.create(0,7);C.step(s,999);assert.equal(s.remaining,180);C.start(s);C.step(s,179.99);assert.equal(s.status,'playing');C.pause(s);const p=s.people.map(x=>[x.x,x.y]);C.step(s,90);assert.equal(s.remaining,180-179.99);assert.deepEqual(s.people.map(x=>[x.x,x.y]),p);C.start(s);C.step(s,.02);assert.equal(s.remaining,0);assert.equal(s.status,'lost');assert.equal(C.touch(s,s.targetId),false);
});
test('Touching target clears; a wrong person costs 3 seconds; hint is single-use and costs 10',()=>{
 const s=C.create(3,8);C.start(s);const wrong=s.people.find(p=>p.id!==s.targetId);assert.equal(C.touch(s,wrong.id),false);assert.equal(s.remaining,177);assert.equal(s.mistakes,1);assert.equal(C.hint(s),true);assert.equal(s.remaining,167);assert.equal(C.hint(s),false);assert.equal(s.remaining,167);assert.equal(C.touch(s,s.targetId),true);assert.equal(s.status,'won');C.step(s,999);assert.equal(s.remaining,167);
});
test('80 distinct archetypes include 64 new action designs, with four palettes and 15 playback slots',()=>{
 const fs=require('node:fs'),path=require('node:path');
 assert.equal(C.CHARACTERS.length,80);assert.equal(meta.characters.length,80);assert.equal(meta.palette_count*meta.base_count,320);assert.equal(meta.frame_count,15);
 for(const [i,c] of meta.characters.entries()){
  assert.equal(c.frames.length,15);const bytes=fs.readFileSync(path.join(__dirname,'../assets',c.source+'.png')),w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  for(const f of c.frames){assert.ok(f.w>8&&f.h>20);assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=w&&f.y+f.h<=h);}
  if(i>=16){assert.ok(c.clips.walk&&c.clips.gesture&&c.clips.action);assert.ok(c.source_frames>=14);}
 }
 for(let seed=0;seed<25;seed++){const s=C.create(0,seed);assert.ok(s.people.filter(p=>!C.typeInfo(p.type).animal).length>=520);}
});
