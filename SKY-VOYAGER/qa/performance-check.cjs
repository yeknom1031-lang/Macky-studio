const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync('dist/performance.js','utf8'),context);
const P=context.window.SkyPerformance;
for(const fps of [15,24,30,60,120]){
  let distance=0,timer=10;
  for(let frame=0;frame<fps*5;frame++)for(const dt of P.steps(1/fps)){assert(dt<=.04);distance+=8.4*dt;timer-=dt;}
  assert(Math.abs(distance-42)<1e-8,`${fps} FPS must preserve travel distance`);
  assert(Math.abs(timer-5)<1e-8,`${fps} FPS must preserve timer duration`);
}
assert(P.steps(6).reduce((a,b)=>a+b,0)<=.151,'A stalled tab must not simulate several seconds');
assert.equal(P.steps(NaN)[0],0);
const changes=[],q=P.create({deviceRatio:2,apply:(ratio,size)=>changes.push([ratio,size])});
for(let i=0;i<500;i++)q.sample(50,.05);
assert.equal(q.status().pixelRatio,.85);assert.equal(changes.at(-1)[1],1024);
const low=q.status().pixelRatio;for(let i=0;i<120;i++)q.sample(16,1/60);
assert.equal(q.status().pixelRatio,low,'Recovery must not oscillate after two fast seconds');
for(let i=0;i<6000;i++)q.sample(16,1/60);
assert.equal(q.status().pixelRatio,1.5);
q.setMode('clear');for(let i=0;i<500;i++)q.sample(80,.08);assert.equal(q.status().pixelRatio,1.5);
q.setMode('light');assert.equal(q.status().pixelRatio,1);assert.equal(changes.at(-1)[1],1024);
q.setMode('auto');for(let i=0;i<80;i++)q.sample(200,.15);assert(q.status().pixelRatio<1.5,'Sustained very slow frames must also trigger adaptation');
const layers=[{visible:true},{visible:true},{visible:true}],lod=P.detailLOD({x:0,y:0,z:0},layers);
lod.update({x:200,y:0,z:0});assert(layers.every(o=>!o.visible));
lod.update({x:80,y:0,z:0});assert(layers.every(o=>o.visible));
lod.update({x:110,y:0,z:0});assert(layers.every(o=>o.visible),'No detail popping in the hysteresis band');
lod.update({x:121,y:0,z:0});assert(layers.every(o=>!o.visible));
lod.update({x:110,y:0,z:0});assert(layers.every(o=>!o.visible));
console.log('PASS: equal movement/timers at 15–120 FPS, bounded stalls, adaptive resolution and recovery hysteresis');
