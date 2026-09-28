const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../src/core.js');C.setNavigation(require('../assets/navigation.json'));C.installLife(require('../src/life.js'));
// An independent body-overlap observation, including passengers and stopped people.
function overlaps(people){const grid=new Map(),result=[];for(const p of people){const x=Math.floor(p.x/40),y=Math.floor((p.y-18*p.height)/40);for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)for(const q of grid.get(xx+','+yy)||[]){const h=(p.height+q.height)/2,dx=(p.x-q.x)/(23*h),dy=(p.y-18*p.height-q.y+18*q.height)/(25*h);if(dx*dx+dy*dy<1)result.push(q.id*1000+p.id);}const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(p);}return result;}
test('No pair stays occluded for three seconds across seven towns and three full-game seeds',()=>{
 const report=[];
 for(let stage=0;stage<7;stage++)for(const seed of [888+stage,1300,2011]){
  const s=C.create(stage,seed),ages=new Map();C.start(s);let maxOverlap=0,maxStep=0;
  for(let i=0;i<1800;i++){const old=s.people.map(p=>[p.x,p.y,p.activity]);C.step(s,.1);const active=new Set(overlaps(s.people));for(const key of active){const age=(ages.get(key)||0)+.1;ages.set(key,age);maxOverlap=Math.max(maxOverlap,age);assert.ok(age<3.001,`stage ${stage}, seed ${seed}, pair ${key}, ${age}s`);}for(const key of ages.keys())if(!active.has(key))ages.delete(key);for(const p of s.people){if(p.activity==='ride'||old[p.id][2]==='ride')continue;const d=Math.hypot(p.x-old[p.id][0],p.y-old[p.id][1]);maxStep=Math.max(maxStep,d);assert.ok(d<38,`no teleport: ${stage}, ${seed}, ${p.id}, ${d}`);}}
  report.push({stage,seed,maxOverlapSeconds:maxOverlap,maxStepPixels:maxStep});
 }
 fs.writeFileSync(path.join(__dirname,'../test-results/spacing-report.json'),JSON.stringify(report,null,2));
});
test('Severely overlapping stopped people yield smoothly within three seconds',()=>{
 const Space=require('../src/space.js'),s=C.create(0,8);s.people=s.people.slice(0,8);for(const [id,p] of s.people.entries()){C.place(s,p,C.nearest(s,835,470));p.id=id;p.x=835;p.y=470;p.activity='read';p.height=1;}
 let maxStep=0;for(let t=0;t<180;t++){const old=s.people.map(p=>[p.x,p.y]);s.elapsed+=1/60;Space.before(s,C);Space.after(s,1/60,C);for(const p of s.people)maxStep=Math.max(maxStep,Math.hypot(p.x-old[p.id][0],p.y-old[p.id][1]));}assert.equal(overlaps(s.people).length,0);assert.ok(maxStep<15);
});
