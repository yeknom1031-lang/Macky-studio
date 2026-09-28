const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js');C.setNavigation(require('../assets/navigation.json'));C.installLife(require('../src/life.js'));
test('All 7 towns start inhabited by exactly 500 people and 500 unique looks, including distinct occupations',()=>{
 for(let stage=0;stage<7;stage++){const s=C.create(stage,100+stage);assert.equal(s.people.length,500);assert.equal(new Set(s.people.map(p=>p.type)).size,500);assert.equal(s.people.filter(p=>p.type===s.targetType).length,1);for(const action of ['queue','chat','fishing','ride','music','play','tag','police','delivery'])assert.ok(s.life.counts[action]>0,action);assert.equal(s.life.shops.length,4);assert.equal(s.life.rides.length,3);}
});
test('Purchases, fishing catches, conversations, tag handoffs, boarding, arrests and deliveries actually complete',()=>{
 for(let stage=0;stage<7;stage++){
  const s=C.create(stage,101+stage);C.start(s);const before=s.life.rides.map(r=>[r.x,r.y]);C.step(s,12);
  assert.ok(s.life.rides.every((r,i)=>Math.hypot(r.x-before[i][0],r.y-before[i][1])>1));
  C.step(s,168);assert.equal(s.status,'lost');assert.equal(s.remaining,0);assert.equal(s.people.length,500);
  for(const key of ['purchases','fish','tags','arrests','deliveries'])assert.ok(s.life.stats[key]>0,stage+': '+key);
  assert.ok(s.life.stats.boardings>8);assert.ok(s.life.stats.conversations>15);
  assert.ok(s.people.some(p=>p.inventory==='bag'));assert.ok(s.people.some(p=>p.inventory==='fish'));
  for(const shop of s.life.shops){assert.ok(shop.queue.length<=8);assert.equal(new Set(shop.queue).size,shop.queue.length);}
  for(const p of s.people){assert.ok(Number.isFinite(p.x+p.y));assert.ok(p.x>=0&&p.x<C.WIDTH&&p.y>=0&&p.y<C.HEIGHT);assert.ok(s.graph.nodes[p.from].links.includes(p.to));}
  assert.equal(s.people.filter(p=>p.type===s.targetType).length,1);
 }
});
test('Pause freezes every life activity and the target remains tappable during a town event',()=>{
 const s=C.create(0,201);C.start(s);C.step(s,10);C.pause(s);const a=JSON.stringify({people:s.people,stats:s.life.stats,rides:s.life.rides});C.step(s,90);assert.equal(JSON.stringify({people:s.people,stats:s.life.stats,rides:s.life.rides}),a);C.start(s);assert.equal(C.touch(s,s.targetId),true);assert.equal(s.status,'won');assert.equal(s.people.length,500);
});

test('Activities dominate from the start; every town contains animals, varied bodies and different actions',()=>{
 for(let stage=0;stage<7;stage++){
  const s=C.create(stage,701+stage);assert.ok(s.life.counts.walk<100);assert.ok(Object.keys(s.life.counts).length>=55);
  assert.ok(s.people.filter(p=>p.animal).length>=32);assert.ok(Math.min(...s.people.map(p=>p.height))<.55);assert.ok(Math.max(...s.people.map(p=>p.height))>1.2);
  assert.equal(s.life.ambient.clouds,7);assert.equal(s.life.ambient.balloons,24);assert.equal(s.life.ambient.gulls,16);
  assert.ok(s.people.every(p=>!p.bubble));
 }
});
test('Natural walkers decelerate, pause, resume and use multiple speed profiles',()=>{
 const s=C.create(0,921);C.start(s);const stopped=new Set(),resumed=new Set(),speeds=new Set();
 for(let n=0;n<120;n++){C.step(s,.5);for(const p of s.people){if(p.activity!=='walk')continue;speeds.add(Math.floor(p.speed*p.pace/10));if(p.pace<.08)stopped.add(p.id);else if(p.pace>.35&&stopped.has(p.id))resumed.add(p.id);}}
 assert.ok(stopped.size>10);assert.ok(resumed.size>5);assert.ok(speeds.size>=8);
});
test('Residents seek quieter connected places without teleporting, and late congestion stays bounded',()=>{
 const maxima=[];
 for(let stage=0;stage<7;stage++){
  const s=C.create(stage,1300);C.start(s);
  for(let n=0;n<720;n++){
   const old=s.people.map(p=>[p.x,p.y,p.activity]);C.step(s,.25);
   for(const p of s.people){if(p.activity==='ride'||old[p.id][2]==='ride')continue;assert.ok(Math.hypot(p.x-old[p.id][0],p.y-old[p.id][1])<55,'no teleport when spreading');}
  }
  assert.ok(s.life.stats.quietMoves>80);const bins=new Map();for(const p of s.people){const key=Math.floor(p.x/80)+','+Math.floor(p.y/80);bins.set(key,(bins.get(key)||0)+1);}maxima.push(Math.max(...bins.values()));
  assert.equal(s.people.length,500);
 }
 assert.ok(maxima.reduce((a,b)=>a+b,0)/maxima.length<25,JSON.stringify(maxima));
});
