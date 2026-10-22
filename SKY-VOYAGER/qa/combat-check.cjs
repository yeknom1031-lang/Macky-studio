const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('dist/combat.js','utf8'),sandbox);const C=sandbox.window.SkyCombat;
for(const fps of [15,30,60,120]){
  let sp=100,contacts=[],starts=[],queued=new Set();
  const c=C.create({canStart:m=>sp>=m.cost,onStart:a=>{sp-=a.cost;starts.push(a.style);},onContact:a=>contacts.push(a.id)});
  c.request();for(let i=0;i<fps*3;i++){const a=c.state();if(a&&a.progress>.4&&a.combo<3&&!queued.has(a.id)){c.request();queued.add(a.id);}c.update(1/fps);}
  assert.deepEqual(starts,['slash','backhand','finisher'],`${fps}fps three distinct clips`);assert.equal(new Set(contacts).size,3);assert.equal(contacts.length,3);assert.equal(sp,61);
}
let spent=0,hit=0;const c=C.create({canStart:m=>spent+m.cost<=11,onStart:a=>spent+=a.cost,onContact:()=>hit++});
c.request();for(let i=0;i<20;i++){c.request();c.update(.04);}assert.equal(spent,11);assert.equal(hit,1,'Insufficient SP cannot execute a buffered action');
let delayed=0;const bow=C.create({onContact:()=>delayed++});bow.request('bow');bow.update(.15);assert.equal(delayed,0);bow.update(.15);assert.equal(delayed,0);bow.update(.03);assert.equal(delayed,1);bow.update(.15);assert.equal(delayed,1);
bow.request('light');bow.cancel();bow.update(.15);assert.equal(bow.status().queued,null);assert.equal(delayed,1,'Cancel clears pending contact and input');
const base={source:true,guarding:true,guardAge:.1,facingDot:1,stamina:100,dodgeTime:0,invulnerable:false};
assert.equal(C.defense(base),'parry');assert.equal(C.defense({...base,guardAge:.4}),'guard');assert.equal(C.defense({...base,facingDot:-1}),'hit');assert.equal(C.defense({...base,source:false}),'hit');assert.equal(C.defense({...base,stamina:0}),'break');assert.equal(C.defense({...base,guarding:false,dodgeTime:.15}),'dodge');assert.equal(C.defense({...base,guarding:false,invulnerable:true}),'invulnerable');
console.log('PASS: combo timing at 15–120 FPS, contact exactly once, resource checks at start, delayed arrow, cancel, directional parry/guard/dodge/fall rules');
