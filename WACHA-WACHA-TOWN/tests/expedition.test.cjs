const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/expedition-core.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../expedition/data.js'),'utf8'),context);const D=JSON.parse(JSON.stringify(context.window.WACHA24_DATA));
const create=(seed=1,mode='solo')=>C.create(D,0,seed,mode);
test('ready stage contains original unique designs, 100 exclusive people, 5 photographers, no palettes',()=>{
 for(let seed=1;seed<=12;seed++){const s=create(seed);assert.equal(s.people.length,500);assert.equal(new Set(s.people.map(p=>p.design)).size,500);assert.equal(s.people.filter(p=>p.exclusive).length,100);assert.equal(s.people.filter(p=>p.photographer).length,5);assert.equal(s.people[s.targetId].photographer,false);assert.equal(s.photoCredits,0);assert.equal(s.remaining,180);assert.ok(s.people.every(p=>!('palette' in p)));}
});
test('missing artwork cannot be silently replaced by repeats',()=>{const d=structuredClone(D);d.characters=d.characters.filter(c=>c.stage!=='S01'||!c.photographer);assert.throws(()=>C.create(d),/100種類/);});
test('photographers give one ticket each, exactly five; wrong touches cost time and target wins',()=>{
 const s=create(4);C.start(s);const photographers=s.people.filter(p=>p.photographer);for(const p of photographers){assert.equal(C.touch(s,p.id),'photographer');assert.equal(C.touch(s,p.id),'used');}assert.equal(s.photoCredits,5);assert.equal(s.remaining,180);const other=s.people.find(p=>!p.photographer&&p.id!==s.targetId);assert.equal(C.touch(s,other.id),'wrong');assert.equal(s.remaining,177);assert.equal(C.touch(s,s.targetId),'found');assert.equal(s.status,'won');assert.equal(C.touch(s,other.id),'ignored');
});
test('photo costs a found ticket, snapshots the target, waits 3 game seconds and pauses fairly',()=>{
 const s=create(8);C.start(s);const r={x:0,y:0,w:500,h:300};assert.equal(C.takePhoto(s,r),null);C.touch(s,s.people.find(p=>p.photographer).id);const photo=C.takePhoto(s,r),x=photo.target.x;assert.equal(s.photoCredits,0);assert.equal(C.photoReady(s,0),false);assert.equal(C.takePhoto(s,r),null);C.step(s,2.95);assert.equal(C.photoReady(s,0),false);C.pause(s);const before=s.remaining;C.step(s,50);assert.equal(s.remaining,before);C.start(s);C.step(s,.05);assert.equal(C.photoReady(s,0),true);s.people[s.targetId].x+=25;assert.equal(photo.target.x,x);
});
test('duo requires a gamepad, disconnect pauses both and photos do not freeze the runner',()=>{
 const s=create(12,'duo');assert.equal(C.start(s),false);C.setPad(s,true);assert.equal(C.start(s),true);const p=s.people[s.targetId],x=p.x,y=p.y;C.input(s,.8,.4);C.step(s,1);assert.ok(Math.hypot(p.x-x,p.y-y)>1);C.touch(s,s.people.find(p=>p.photographer).id);const photo=C.takePhoto(s,{x:0,y:0,w:s.width,h:s.height});C.step(s,3);assert.equal(C.photoReady(s,photo.id),true);assert.equal(s.status,'playing');C.setPad(s,false);assert.equal(s.status,'paused');const pos=s.people.map(p=>[p.x,p.y]),clock=s.remaining;C.step(s,10);assert.equal(s.remaining,clock);assert.deepEqual(s.people.map(p=>[p.x,p.y]),pos);
});
test('a long simulation stays finite, uncovers bodies within three seconds and expires at 180',()=>{
 const s=create(51);C.start(s);for(let t=0;t<180;t++)C.step(s,1);assert.equal(s.status,'lost');assert.equal(s.remaining,0);assert.ok(s.people.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=s.width&&p.y>=0&&p.y<=s.height));assert.ok(s.stats.maxOverlap<3,`overlap persisted ${s.stats.maxOverlap}`);assert.ok(s.stats.events>4);assert.ok(s.stats.purchases>0);
});
test('crowd yields to a stationary controlled target without dragging that player',()=>{
 const s=create(78,'duo');C.setPad(s,true);C.start(s);const p=s.people[s.targetId];p.x=s.width/2;p.y=s.height/2;p.path=[];p.to=null;p.pendingSite=undefined;p.exitSite=null;p.station=null;p.ride=null;p.layer=p.level=0;const x=p.x,y=p.y;
 const q=s.people.find(q=>q.id!==p.id);q.x=x;q.y=y;q.station=null;q.ride=null;q.path=[];q.to=null;q.layer=q.level=0;q.activity='acting';q.until=30;
 C.input(s,0,0);for(let k=0;k<30;k++)C.step(s,.1);assert.equal(p.x,x);assert.equal(p.y,y);assert.ok(Math.hypot(q.x-x,q.y-y)>15);assert.ok(s.stats.maxOverlap<3);
});
test('second-floor interactions use stair edges on entry and exit',()=>{
 const s=create(76,'duo');C.setPad(s,true);C.start(s);const site=s.sites.find(v=>v.stairs?.length);assert.ok(site,'needs an actual upstairs site');const p=s.people.find(person=>C.canUseSite(person,site));assert.ok(p,'needs a resident with an upstairs role');s.targetId=p.id;site.occupant=null;
 const bottom=s.graph.nodes[site.entryNode];Object.assign(p,{x:bottom.x,y:bottom.y,node:site.entryNode,level:0,layer:0,path:[],to:null,station:null,ride:null,exitSite:null,transitSite:null});delete p.pendingSite;
 assert.equal(C.join(s,p,site.id),true);assert.notEqual(p.station,site.id);let last={x:p.x,y:p.y},entered=false;
 for(let i=0;i<400;i++){C.step(s,.1);assert.ok(Math.hypot(p.x-last.x,p.y-last.y)<12,'cannot teleport upstairs');last={x:p.x,y:p.y};if(p.station===site.id){entered=true;break;}}
 assert.ok(entered);assert.equal(p.level,1);C.interact(s,p);assert.equal(p.station,null);assert.ok(p.exitSite!==null);for(let i=0;i<400&&p.exitSite!==null;i++)C.step(s,.1);assert.equal(p.exitSite,null);assert.equal(p.level,0);
});
test('boats remain on their water route and board at the dock',()=>{
 const s=create(75);C.start(s);const boat=s.rides.find(r=>r.water);assert.ok(boat);const water=s.definition.waterPoints;assert.ok(water.length>1);let moved=false;
 for(let i=0;i<500;i++){C.step(s,.1);if(Math.hypot(boat.x-boat.originX,boat.y-boat.originY)>8)moved=true;assert.ok(Math.min(...water.map(q=>Math.hypot(q[0]-boat.x,q[1]-boat.y)))<30);}
 assert.ok(moved,'boat leaves dock');assert.ok(s.stats.rides>0);
});
test('air rides lift passengers, cruise above the ground and land before boarding',()=>{
 const stage=D.stages.find(stage=>stage.ready&&stage.vehicles.some(name=>/飛行船|雲船|空の船|ゴンドラ|リフト|浮遊|箒/.test(name)));assert.ok(stage,'requires an airborne vehicle');
 const s=C.create(D,stage.id,31415);C.start(s);const ride=s.rides.find(r=>r.air);let rose=false,landed=false;
 for(let tick=0;tick<400;tick++){C.step(s,.1);assert.ok(Number.isFinite(ride.altitude)&&ride.altitude>=0&&ride.altitude<48);if(ride.altitude>20)rose=true;if(rose&&ride.stoppedUntil>s.elapsed){landed=true;assert.equal(ride.altitude,0);}for(const id of ride.passengers){const p=s.people[id];assert.ok(Math.abs(p.y-(ride.y-19-ride.altitude))<3,'passengers rise with the vehicle');}}
 assert.ok(rose);assert.ok(landed);
});
test('role-specific actions only use matching places, while existing occupants can always leave',()=>{
 const s=create(2468,'duo'),p=s.people[s.targetId],water=s.sites.find(site=>site.kind==='water'),work=s.sites.find(site=>site.kind==='workshop');assert.ok(water&&work);Object.assign(p,{role:'R136',behavior:C.roleSpec('R136'),station:null,ride:null,exitSite:null,transitSite:null,path:[],to:null,level:0,layer:0});delete p.pendingSite;
 const entry=s.graph.nodes[water.entryNode??water.node];Object.assign(p,{x:entry.x,y:entry.y,node:water.entryNode??water.node});water.occupant=null;assert.equal(C.canUseSite(p,water),false);assert.equal(C.join(s,p,water.id),false);C.interact(s,p);assert.notEqual(p.station,water.id);assert.notEqual(p.pendingSite,water.id);
 work.occupant=null;Object.assign(p,{x:work.x,y:work.y,node:work.node,level:work.level||0,layer:work.level||0,station:null,ride:null,exitSite:null,transitSite:null,path:[],to:null});delete p.pendingSite;assert.equal(C.join(s,p,work.id),true);assert.equal(p.station,work.id);p.role='R221';p.behavior=C.roleSpec(p.role);assert.equal(C.canUseSite(p,work),false);C.interact(s,p);assert.equal(p.station,null,'an incompatible existing occupant must still be able to leave');
});
test('ground walkers uncover a stopped passenger without moving the passenger or the vehicle',()=>{
 const s=create(90210,'duo');C.setPad(s,true);C.start(s);const ride=s.rides.find(r=>!r.air&&!r.water)||s.rides[0],p=s.people.find(p=>!p.photographer&&!p.animal&&p.id!==s.targetId),q=s.people[s.targetId];Object.assign(ride,{x:s.width/2,y:s.height/2,altitude:0,stoppedUntil:10000,nextStop:10000,initialBoarded:true,passengers:[p.id]});
 Object.assign(p,{ride:ride.id,station:null,activity:'riding',level:0,layer:3,x:ride.x-14.5,y:ride.y-19,path:[],to:null});Object.assign(q,{ride:null,station:null,activity:'acting',until:100,level:0,layer:0,x:p.x,y:p.y,path:[],to:null});
 assert.ok(C.overlapPairs(s).some(pair=>[pair.p.id,pair.q.id].includes(p.id)&&[pair.p.id,pair.q.id].includes(q.id)),'a ground rider and a walker share visual space');ride.altitude=30;assert.equal(C.overlapPairs(s).some(pair=>[pair.p.id,pair.q.id].includes(p.id)&&[pair.p.id,pair.q.id].includes(q.id)),false,'an airborne passenger is on another level');ride.altitude=0;
 for(let tick=0;tick<30;tick++){C.step(s,.1);assert.equal(p.x,ride.x-14.5);assert.equal(p.y,ride.y-19);}assert.ok(Math.hypot(q.x-p.x,q.y-p.y)>15);assert.ok(s.stats.maxOverlap<3);
});
