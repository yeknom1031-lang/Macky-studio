const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js');C.setNavigation(require('../assets/navigation.json'));C.installLife(require('../src/life.js'));
test('All 7 towns start inhabited by exactly 600 people and 320 looks, including distinct occupations',()=>{
 for(let stage=0;stage<7;stage++){const s=C.create(stage,100+stage);assert.equal(s.people.length,600);assert.equal(new Set(s.people.map(p=>p.type)).size,320);assert.equal(s.people.filter(p=>p.type===s.targetType).length,1);for(const action of ['queue','chat','fishing','ride','music','play','tag','police','delivery'])assert.ok(s.life.counts[action]>0,action);assert.equal(s.life.shops.length,4);assert.equal(s.life.rides.length,3);}
});
test('Purchases, fishing catches, conversations, tag handoffs, boarding, arrests and deliveries actually complete',()=>{
 for(let stage=0;stage<7;stage++){
  const s=C.create(stage,101+stage);C.start(s);const before=s.life.rides.map(r=>[r.x,r.y]);C.step(s,12);
  assert.ok(s.life.rides.every((r,i)=>Math.hypot(r.x-before[i][0],r.y-before[i][1])>1));
  C.step(s,168);assert.equal(s.status,'lost');assert.equal(s.remaining,0);assert.equal(s.people.length,600);
  for(const key of ['purchases','fish','tags','arrests','deliveries'])assert.ok(s.life.stats[key]>0,stage+': '+key);
  assert.ok(s.life.stats.boardings>8);assert.ok(s.life.stats.conversations>15);
  assert.ok(s.people.some(p=>p.inventory==='bag'));assert.ok(s.people.some(p=>p.inventory==='fish'));
  for(const shop of s.life.shops){assert.ok(shop.queue.length<=8);assert.equal(new Set(shop.queue).size,shop.queue.length);}
  for(const p of s.people){assert.ok(Number.isFinite(p.x+p.y));assert.ok(p.x>=0&&p.x<C.WIDTH&&p.y>=0&&p.y<C.HEIGHT);assert.ok(s.graph.nodes[p.from].links.includes(p.to));}
  assert.equal(s.people.filter(p=>p.type===s.targetType).length,1);
 }
});
test('Pause freezes every life activity and the target remains tappable during a town event',()=>{
 const s=C.create(0,201);C.start(s);C.step(s,10);C.pause(s);const a=JSON.stringify({people:s.people,stats:s.life.stats,rides:s.life.rides});C.step(s,90);assert.equal(JSON.stringify({people:s.people,stats:s.life.stats,rides:s.life.rides}),a);C.start(s);assert.equal(C.touch(s,s.targetId),true);assert.equal(s.status,'won');assert.equal(s.people.length,600);
});
