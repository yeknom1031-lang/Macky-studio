(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WachaExpedition=api;})(globalThis,function(){
 'use strict';
 const LIMIT=180,PHOTO_DELAY=3,MAX_PHOTOS=5;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function roleSpec(role){const n=Number((role||'R096').slice(1));let place='open',kind='personal';
  if(n<=15||n>=43&&n<=60){place='shop';kind='trade';}
  else if(n<=20){place='shop';kind='customer';}
  else if(n<=36){place='kitchen';kind='craft';}
  else if(n<=42||n===61||n===62||n===100||n===214){place='seat';kind='rest';}
  else if(n>=63&&n<=69){place='upper';kind='home';}
  else if(n>=70&&n<=72){place='door';kind='home';}
  else if(n>=106&&n<=150){place='workshop';kind='craft';}
  else if(n>=151&&n<=170){place='vehicle';kind='ride';}
  else if(n>=171&&n<=185){place='street';kind=n>=176&&n<=179?'chase':'service';}
  else if(n>=186&&n<=199){place='performance';kind='perform';}
  else if(n>=200&&n<=202){place='open';kind='photo';}
  else if(n===209||n===210||n===217||n===218){place='play';kind='play';}
  else if(n>=211&&n<=213){place='street';kind='chase';}
  else if(n>=221&&n<=224){place='water';kind='fish';}
  else if(n>=225&&n<=232){place='garden';kind='garden';}
  else if(n>=233&&n<=240){place='animal';kind='care';}
  return{id:role,place,kind,requiresSite:!['open','street','performance'].includes(place),duration:kind==='craft'?20:kind==='fish'?28:kind==='trade'?8:12};
 }
 function makeGraph(raw){
  const nodes=raw.map(([x,y,links,level=0])=>({x,y,links:[...links],level})),bins=new Map();
  nodes.forEach((n,i)=>{const key=`${Math.floor(n.x/80)},${Math.floor(n.y/80)}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);});
  return{nodes,bins,parents:new Int32Array(nodes.length),queue:new Int32Array(nodes.length)};
 }
 function nearest(s,x,y,level=0){let best=Infinity,id=-1;const bx=Math.floor(x/80),by=Math.floor(y/80);for(let radius=0;radius<4;radius++){
  for(let yy=by-radius;yy<=by+radius;yy++)for(let xx=bx-radius;xx<=bx+radius;xx++)for(const i of s.graph.bins.get(`${xx},${yy}`)||[]){const n=s.graph.nodes[i];if(n.level!==level)continue;const d=(n.x-x)**2+(n.y-y)**2;if(d<best){best=d;id=i;}}
  if(id>=0&&Math.sqrt(best)<Math.max(1,radius)*80)return id;
 }if(id>=0)return id;s.graph.nodes.forEach((n,i)=>{if(n.level===level){const d=(n.x-x)**2+(n.y-y)**2;if(d<best){id=i;best=d;}}});return id;}
 function pathTo(s,start,end){if(start===end)return[];const g=s.graph,p=g.parents,q=g.queue;p.fill(-1);p[start]=start;q[0]=start;let head=0,tail=1;while(head<tail&&p[end]<0){const id=q[head++];for(const n of g.nodes[id].links)if(p[n]<0){p[n]=id;q[tail++]=n;}}if(p[end]<0)return null;const result=[];for(let n=end;n!==start;n=p[n])result.push(n);return result.reverse();}
 function route(s,p,end){if(p.exitSite!=null){p.afterExit=end;return true;}const start=p.to??p.node,path=pathTo(s,start,end);if(!path)return false;p.path=path.length?path:[end];p.goal=end;p.activity='walking';return true;}
 function density(s,x,y){return s.density.get(`${Math.floor(x/72)},${Math.floor(y/72)}`)||0;}
 function updateDensity(s){s.density.clear();for(const p of s.people){const x=Math.floor(p.x/72),y=Math.floor(p.y/72);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=`${x+dx},${y+dy}`;s.density.set(k,(s.density.get(k)||0)+(dx===0&&dy===0?1:.3));}}s.densityAt=s.elapsed+.8;}
 function destination(s,p){let best=Infinity,id=p.node;for(let k=0;k<32;k++){const n=Math.floor(s.rng()*s.graph.nodes.length),q=s.graph.nodes[n];if(q.level!==(p.exitSite!=null?0:p.level))continue;const dist=Math.hypot(q.x-p.x,q.y-p.y);if(dist<65||dist>600)continue;const score=density(s,q.x,q.y)*5+dist*.014+s.rng()*6;if(score<best){id=n;best=score;}}return id;}
 function release(s,p){
  const previous=p.station!==null?s.sites[p.station]:p.transitSite!=null?s.sites[p.transitSite]:null;
  if(p.ride!==null&&s.rides?.[p.ride])s.rides[p.ride].passengers=s.rides[p.ride].passengers.filter(id=>id!==p.id);
  p.ride=null;if(previous?.occupant===p.id)previous.occupant=null;p.station=null;p.activity='walking';p.until=0;p.pauseUntil=0;p.path=[];p.goal=-1;p.to=null;delete p.pendingSite;
  if(previous?.stairs){p.exitSite=previous.id;p.transitSite=previous.id;const at=previous.stairs.reduce((best,n,i)=>Math.hypot(s.graph.nodes[n].x-p.x,s.graph.nodes[n].y-p.y)<Math.hypot(s.graph.nodes[previous.stairs[best]].x-p.x,s.graph.nodes[previous.stairs[best]].y-p.y)?i:best,0);p.path=previous.stairs.slice(0,at+1).reverse();p.node=previous.stairs[at];p.level=s.graph.nodes[p.node].level;}
  else{p.node=nearest(s,p.x,p.y,p.level||0);if(p.node<0)p.node=nearest(s,p.x,p.y);p.level=s.graph.nodes[p.node].level;p.layer=p.level;p.exitSite=null;p.transitSite=null;}
  p.nextDecision=s.elapsed+3+s.rng()*12;
 }
 function create(data,index=0,seed=1,mode='solo'){
  const stage=data.stages[index];if(!stage)throw Error('Unknown stage');
  const rng=random(seed),exclusive=data.characters.filter(c=>c.stage===stage.key),common=data.characters.filter(c=>c.stage==='G'&&!c.nonCrowd),animals=data.characters.filter(c=>c.animal);
  if(exclusive.length!==100)throw Error(`${stage.name}: 専用キャラクターは100種類必要です（現在${exclusive.length}種類）`);
  const wetAllowed=[1,2,9,10,12,17,19,23].includes(index)&&stage.waterPoints?.length>1,magic=[20,21,23].includes(index),zoo=[10,12,17,18,23].includes(index);const eligibleAnimals=animals.filter(c=>(c.habitat!=='water'||wetAllowed)&&(c.group!=='空想動物'||magic)&&(c.group!=='大型動物'||zoo));const animalCast=shuffle(eligibleAnimals,rng).slice(0,Math.min(18,eligibleAnimals.length));
  const needed=stage.population-exclusive.length-animalCast.length;
  if(common.length<needed)throw Error(`${stage.name}: 共通原画が${needed-common.length}種類不足しています`);
  const cast=shuffle([...exclusive,...shuffle(common.filter(c=>!c.animal),rng).slice(0,needed),...animalCast],rng);
  if(cast.length!==stage.population||new Set(cast.map(c=>c.id)).size!==cast.length)throw Error('Cast must contain unique original designs');
  const s={data,stage:index,definition:stage,width:stage.width,height:stage.height,graph:makeGraph(stage.navigation),rng,seed,mode,remaining:LIMIT,elapsed:0,status:'ready',people:[],sites:[],photos:[],photoCredits:0,photographersFound:new Set(),mistakes:0,lastHit:null,density:new Map(),densityAt:0,overlaps:new Map(),events:[],nextEvent:12,stats:{purchases:0,conversations:0,rides:0,events:0,maxOverlap:0},input:{x:0,y:0,act:false},padConnected:mode!=='duo',disconnect:false,returnStatus:'ready'};
  s.sites=stage.sites.map((site,id)=>({...site,id,occupant:null,node:site.node??nearest(s,site.x,site.y,site.level||0),phase:0,kind:site.kind||roleSpec(site.roles[0]).place}));
  const ground=s.graph.nodes.map((n,i)=>i).filter(i=>s.graph.nodes[i].level===0&&s.graph.nodes[i].links.length);
  s.people=cast.map((design,id)=>{const node=ground[Math.floor(rng()*ground.length)],n=s.graph.nodes[node],height=design.height||1;return{id,design:design.id,type:design.id,role:design.role,name:design.name,animal:!!design.animal,habitat:design.habitat||'ground',photographer:!!design.photographer,node,to:null,path:[],goal:-1,x:n.x,y:n.y,level:0,layer:0,phase:rng(),facing:rng()<.5?-1:1,height,speed:8+rng()**1.4*62,pace:.4+rng(),wantPace:.4+rng(),nextPace:rng()*10,nextDecision:rng()*12,pauseUntil:0,activity:rng()<.65?'acting':'walking',until:8+rng()*36,station:null,homeSite:null,partner:null,ride:null,exitSite:null,transitSite:null,dx:0,dy:0,signature:design.action||design.role,tempo:.5+rng()*.8,exclusive:design.stage===stage.key};});
  const photographers=s.people.filter(p=>p.photographer);if(photographers.length!==5)throw Error('Exactly five photographers are required');
  const targets=s.people.filter(p=>!p.photographer&&!p.animal);s.targetId=targets[Math.floor(rng()*targets.length)].id;s.targetType=s.people[s.targetId].design;
  for(const p of s.people){p.behavior=roleSpec(p.role);const exact=s.sites.filter(site=>site.roles.includes(p.role)),matching=exact.length?exact:s.sites.filter(site=>site.kind===p.behavior.place);p.homeSite=matching.length?matching[p.id%matching.length].id:null;if(p.homeSite!==null&&rng()<.7)join(s,p,p.homeSite);}
  for(const p of s.people)if(p.animal&&p.habitat!=='ground'){p.homeSite=null;p.station=null;p.pendingSite=undefined;p.transitSite=null;p.path=[];p.to=null;p.activity='walking';p.layer=p.habitat==='air'?4:5;p.travelIndex=0;p.travelDirection=1;p.flightAngle=rng()*Math.PI*2;p.flightGoal=p.flightAngle;p.nextFlight=0;if(p.habitat==='air'){p.x=80+rng()*(s.width-160);p.y=80+rng()*(s.height-160);}else{p.travelIndex=Math.floor(rng()*stage.waterPoints.length);[p.x,p.y]=stage.waterPoints[p.travelIndex];}}
  s.rides=stage.vehicles.map((name,id)=>{
   const water=/舟|船|艇/.test(name)&&!/飛行船|雲船|空の船/.test(name),air=/飛行船|雲船|空の船|ゴンドラ|リフト|浮遊|箒/.test(name),wet=stage.waterPoints||[];
   const node=water&&wet.length?nearest(s,wet[0][0],wet[0][1]):ground[Math.floor(rng()*ground.length)],n=s.graph.nodes[node],position=water&&wet.length?wet[0]:[n.x,n.y];
   return{id,name,node,to:null,path:[],goal:-1,x:position[0],y:position[1],originX:position[0],originY:position[1],dockNode:node,waterIndex:0,waterDirection:1,speed:34,pace:1,level:0,phase:0,facing:1,activity:'walking',passengers:[],stoppedUntil:8+id*2,nextStop:24+id*3,altitude:0,water,air};
  });
  if(mode==='duo'){const p=s.people[s.targetId];release(s,p);p.activity='controlled';}
  separate(s,0,true);updateDensity(s);return s;
 }
 function start(s){if(s.mode==='duo'&&!s.padConnected)return false;if(s.status==='ready'||s.status==='paused'){s.status='playing';s.disconnect=false;return true;}return false;}
 function pause(s,reason='manual'){if(s.status==='playing'){s.status='paused';s.pauseReason=reason;}}
 function setPad(s,connected){s.padConnected=connected;if(s.mode==='duo'&&!connected&&s.status==='playing'){pause(s,'controller');s.disconnect=true;}}
 function input(s,x,y,act=false){const n=Math.hypot(x,y);s.input={x:n>.16?x/Math.max(1,n):0,y:n>.16?y/Math.max(1,n):0,act:!!act};}
 function canUseSite(p,site){return !!site&&(site.roles.includes(p.role)||site.kind===(p.behavior||roleSpec(p.role)).place);}
 function join(s,p,id){const site=s.sites[id];if(!canUseSite(p,site)||site.occupant!==null&&site.occupant!==p.id)return false;
  if(Math.hypot(p.x-site.x,p.y-site.y)>15||p.level!==(site.level||0)){if(!route(s,p,site.node))return false;p.pendingSite=id;p.transitSite=site.level?id:null;return true;}
  site.occupant=p.id;p.station=id;p.activity='working';p.until=s.elapsed+(p.behavior?.duration||12)*(1+s.rng());p.path=[];p.to=null;p.node=site.node;p.layer=p.level=site.level||0;p.x=site.x+(site.actorX||0);p.y=site.y+(site.actorY||0);p.facing=site.facing||p.facing;p.phase=0;p.transitSite=null;return true;
 }
 function disembark(s,p){const ride=s.rides[p.ride];if(!ride)return;ride.passengers=ride.passengers.filter(id=>id!==p.id);p.ride=null;release(s,p);p.exitSite=null;p.transitSite=null;p.level=p.layer=0;p.node=ride.water?ride.dockNode:nearest(s,ride.x,ride.y);const n=s.graph.nodes[p.node];p.x=n.x+20;p.y=n.y+8;p.path=[];p.to=null;}
 function board(s,p,ride){if(ride.passengers.length>=2||ride.stoppedUntil<s.elapsed)return false;release(s,p);p.ride=ride.id;p.activity='riding';ride.passengers.push(p.id);s.stats.rides++;return true;}
 function interact(s,p){if(p.ride!==null){if(s.rides[p.ride].stoppedUntil>s.elapsed)disembark(s,p);return;}if(p.station!==null){release(s,p);return;}const ride=s.rides.find(r=>r.stoppedUntil>s.elapsed&&r.passengers.length<2&&Math.hypot(r.x-p.x,r.y-p.y)<65);if(ride&&board(s,p,ride))return;const approach=site=>s.graph.nodes[site.entryNode??site.node],candidates=s.sites.filter(site=>canUseSite(p,site)&&site.occupant===null&&Math.hypot(approach(site).x-p.x,approach(site).y-p.y)<62);candidates.sort((a,b)=>Math.hypot(approach(a).x-p.x,approach(a).y-p.y)-Math.hypot(approach(b).x-p.x,approach(b).y-p.y));if(candidates[0])join(s,p,candidates[0].id);}
 function walk(s,p,dt){let distance=p.speed*p.pace*dt;let count=0;while(distance>0&&count++<12){if(p.to===null){if(!p.path.length){p.activity='acting';p.until=s.elapsed+2+s.rng()*8;break;}p.to=p.path.shift();}
  const n=s.graph.nodes[p.to],dx=n.x-p.x,dy=n.y-p.y,len=Math.hypot(dx,dy);if(Math.abs(dx)>.1)p.facing=dx<0?-1:1;
  if(distance>=len){p.x=n.x;p.y=n.y;p.node=p.to;p.layer=p.level=n.level;p.to=null;distance-=len;if(!p.path.length&&p.exitSite!=null){p.exitSite=null;p.transitSite=null;const end=p.afterExit;delete p.afterExit;if(end!==undefined)route(s,p,end);}if(!p.path.length&&p.pendingSite!==undefined){const id=p.pendingSite;delete p.pendingSite;join(s,p,id);break;}}else{p.x+=dx/len*distance;p.y+=dy/len*distance;distance=0;}}
 }
 function control(s,p,dt){const v=s.input;if(v.act&&!s.actHeld)interact(s,p);s.actHeld=v.act;if(p.station!==null||p.ride!==null)return;if(p.exitSite!=null||p.pendingSite!==undefined){p.phase=(p.phase+dt*.8)%1;walk(s,p,dt);return;}const mag=Math.hypot(v.x,v.y);p.activity=mag?'controlled':'acting';if(!mag)return;const dist=76*mag*dt,tx=p.x+v.x/mag*dist,ty=p.y+v.y/mag*dist;const n=nearest(s,tx,ty,p.level),q=s.graph.nodes[n];
  // Project onto an actual walkable edge. Free control never crosses building blocks.
  let best=null;for(const from of [p.node,n])for(const to of s.graph.nodes[from].links){const a=s.graph.nodes[from],b=s.graph.nodes[to],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((tx-a.x)*dx+(ty-a.y)*dy)/(dx*dx+dy*dy),0,1),x=a.x+t*dx,y=a.y+t*dy,d=Math.hypot(x-tx,y-ty);if(!best||d<best.d)best={x,y,d,from,to,t};}
  if(best){const radius=14,dx=tx-best.x,dy=ty-best.y,k=best.d>radius?radius/best.d:1;p.x=best.x+dx*k;p.y=best.y+dy*k;p.node=best.t>.5?best.to:best.from;p.level=s.graph.nodes[p.node].level;}
  if(Math.abs(v.x)>.05)p.facing=v.x<0?-1:1;p.phase=(p.phase+dt*mag*1.7)%1;
 }
 function decide(s,p){if(p.station!==null)return;if(p.pendingSite!==undefined)return;if(p.homeSite!==null&&s.rng()<.7&&join(s,p,p.homeSite))return;
  if(p.behavior.kind==='ride'){const r=s.rides.find(r=>r.stoppedUntil>s.elapsed&&Math.hypot(r.x-p.x,r.y-p.y)<80);if(r&&board(s,p,r))return;}
  const pick=s.rng();if(pick<.5){p.activity='acting';p.until=s.elapsed+6+s.rng()*28;return;}
  if(pick<.64&&!p.animal){const other=s.people.find(q=>q.id!==p.id&&q.id!==s.targetId&&!q.animal&&q.station===null&&q.activity==='acting'&&Math.hypot(q.x-p.x,q.y-p.y)<48);if(other){p.activity=other.activity='chat';p.until=other.until=s.elapsed+5+s.rng()*8;p.facing=other.x>p.x?1:-1;other.facing=-p.facing;s.stats.conversations++;return;}}
  route(s,p,destination(s,p));
 }
 function overlapPairs(s){const bins=new Map(),pairs=[];for(const p of s.people){const bx=Math.floor(p.x/44),by=Math.floor(p.y/44);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const q of bins.get(`${bx+dx},${by+dy}`)||[]){if(p.layer>=4||q.layer>=4)continue;if(p.layer!==q.layer){const pGround=p.layer===0&&p.level===0&&p.ride===null,qGround=q.layer===0&&q.level===0&&q.ride===null,pRider=p.ride!==null&&(s.rides[p.ride]?.altitude||0)<1,qRider=q.ride!==null&&(s.rides[q.ride]?.altitude||0)<1;if(!(pGround&&qRider||qGround&&pRider))continue;}const rx=22*(p.height+q.height)/2,ry=23*(p.height+q.height)/2,xx=p.x-q.x,yy=p.y-16*p.height-q.y+16*q.height,d=Math.hypot(xx/rx,yy/ry);if(d<1.06)pairs.push({p,q,rx,ry,xx,yy,d,key:`${q.id}:${p.id}`});}const key=`${bx},${by}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(p);}return pairs;}
 // Persistent neighbors receive a wider passing gap. Keep each escape route long enough
 // to make progress instead of choosing a new direction every simulation tick.
 function separate(s,dt,initial=false){const before=s.people.map(p=>[p.x,p.y]);let urgent=false;for(const age of s.overlaps.values())if(age>1.2)urgent=true;for(let pass=0;pass<(initial?16:urgent?12:3);pass++){for(const m of overlapPairs(s)){const age=s.overlaps.get(m.key)||0,clearance=age>1.5?1.28:1.05;if(m.d>=clearance-.005)continue;const {p,q,rx,ry}=m;let ux=m.xx/rx,uy=m.yy/ry,d=m.d;if(d<.001){ux=Math.cos(p.id*2.39+q.id);uy=Math.sin(p.id*2.39+q.id);d=1;}const amount=(clearance-m.d)*.5*(initial||urgent?1:.6),px=ux/d*amount*rx,py=uy/d*amount*ry;const pControlled=!initial&&s.mode==='duo'&&p.id===s.targetId,qControlled=!initial&&s.mode==='duo'&&q.id===s.targetId,pRider=p.ride!==null&&q.ride===null,qRider=q.ride!==null&&p.ride===null,wp=pRider?0:qRider?2:pControlled?0:qControlled?2:p.station!==null?(q.station!==null?1:0):q.station!==null?2:1,wq=2-wp;p.x+=px*wp;p.y+=py*wp;q.x-=px*wq;q.y-=py*wq;}
   for(const p of s.people){p.x=clamp(p.x,14,s.width-14);p.y=clamp(p.y,30,s.height-8);}}
  const ages=new Map();for(const m of overlapPairs(s))if(m.d<1){const age=(s.overlaps.get(m.key)||0)+dt;ages.set(m.key,age);s.stats.maxOverlap=Math.max(s.stats.maxOverlap,age);if(age>1.5){for(const p of [m.p,m.q])if((p.id!==s.targetId||s.mode==='solo')&&!(p.evadeUntil>s.elapsed)){release(s,p);route(s,p,destination(s,p));p.evadeUntil=s.elapsed+2;p.pauseUntil=0;p.pace=Math.max(p.pace,1.2);}}}s.overlaps=ages;
  for(const p of s.people){const [x,y]=before[p.id];if(!initial&&Math.hypot(p.x-x,p.y-y)>.1)p.yielding=s.elapsed+.15;}
 }
 function event(s){const index=s.stats.events%s.definition.events.length,name=s.definition.events[index],kind=/演奏|演|踊|パレード|人形/.test(name)?'perform':/到着|着く|荷物|届|配達|運ぶ|搬入|乗|降/.test(name)?'delivery':/追|泥棒/.test(name)?'chase':/水|釣|魚|舟|船|浮標/.test(name)?'water':/休憩|席|客|交代|案内|観客/.test(name)?'gather':'work';
  const places={perform:['performance','play'],delivery:['shop','workshop'],water:['water','garden'],gather:['seat','play'],work:['workshop','kitchen','garden'],chase:['street','open']},choices=s.sites.filter(site=>places[kind].includes(site.kind)),site=(choices.length?choices:s.sites)[index%(choices.length||s.sites.length)];if(!site)return;
  s.events.push({kind,name,site:site.id,start:s.elapsed,end:s.elapsed+12});s.stats.events++;
  const nearby=s.people.filter(p=>p.station===null&&p.ride===null&&p.id!==s.targetId&&!p.photographer&&!p.animal&&p.level===0&&Math.hypot(p.x-site.x,p.y-site.y)<220).sort((a,b)=>Math.hypot(a.x-site.x,a.y-site.y)-Math.hypot(b.x-site.x,b.y-site.y)).slice(0,7);
  const worker=nearby.find(p=>canUseSite(p,site));nearby.forEach((p,i)=>{if(kind==='perform'){p.activity=i<3?'dance':'chat';p.until=s.elapsed+9;p.facing=i%2?1:-1;}else if(kind==='delivery'&&i<2){route(s,p,site.entryNode??site.node);p.wantPace=1.4;}else if((kind==='work'||kind==='water')&&p===worker){join(s,p,site.id);}else if(kind==='gather'){p.activity='chat';p.until=s.elapsed+8;p.facing=i%2?1:-1;}else if(i%2)route(s,p,destination(s,p));});
  const chasers=s.people.filter(p=>p.id!==s.targetId&&p.ride===null&&p.station===null&&['R177','R211'].includes(p.role)),runners=s.people.filter(p=>p.id!==s.targetId&&p.ride===null&&p.station===null&&['R178','R212','R213'].includes(p.role));
  if((kind==='chase'||index===3)&&chasers.length&&runners.length){const p=chasers[0],q=runners[0];p.chaseId=q.id;p.chaseUntil=s.elapsed+12;p.nextChase=0;p.wantPace=1.7;q.wantPace=1.5;route(s,q,destination(s,q));}
 }
 function dock(s,r){r.altitude=0;r.stoppedUntil=s.elapsed+6;r.nextStop=s.elapsed+22+s.rng()*15;for(const id of [...r.passengers])if(id!==s.targetId||s.mode==='solo')disembark(s,s.people[id]);
  const point=r.water?s.graph.nodes[r.dockNode]:r,available=s.people.filter(p=>p.ride===null&&p.station===null&&!p.photographer&&!p.animal&&p.level===0&&(p.id!==s.targetId||s.mode==='solo')&&Math.hypot(p.x-point.x,p.y-point.y)<80).slice(0,2);for(const p of available)board(s,p,r);
 }
 function rides(s,dt){for(const r of s.rides){const wet=s.definition.waterPoints||[];if(!r.initialBoarded){r.initialBoarded=true;dock(s,r);}
  if(!r.water&&s.elapsed>=r.nextStop)dock(s,r);
  if(s.elapsed>r.stoppedUntil){if(r.water&&wet.length>1){let distance=23*dt;while(distance>0){let next=r.waterIndex+r.waterDirection;if(next>=wet.length){r.waterDirection=-1;next=r.waterIndex-1;}if(next<0){r.waterDirection=1;dock(s,r);break;}const [x,y]=wet[next],dx=x-r.x,dy=y-r.y,len=Math.hypot(dx,dy);if(Math.abs(dx)>.1)r.facing=dx<0?-1:1;if(len<=distance){r.x=x;r.y=y;r.waterIndex=next;distance-=len;}else{r.x+=dx/len*distance;r.y+=dy/len*distance;distance=0;}}}
   else if(!r.water){if(!r.path.length&&r.to===null)route(s,r,destination(s,r));walk(s,r,dt);}}
  if(r.air){const desired=s.elapsed>r.stoppedUntil&&r.nextStop-s.elapsed>2?Math.max(0,Math.min(44+Math.sin(s.elapsed*.7+r.id)*3,r.y-75)):0;r.altitude+=(desired-r.altitude)*Math.min(1,dt*2.4);}
  for(const [seat,id] of r.passengers.entries()){const p=s.people[id];p.x=r.x+(seat-.5)*29;p.y=r.y-19-(r.altitude||0);p.layer=r.air?2:3;p.facing=r.facing;p.activity='riding';p.phase=(p.phase+dt*.3)%1;}
 }}
 function moveAnimal(s,p,dt){p.phase=(p.phase+dt*(p.habitat==='air'?1.7:.7))%1;p.activity='walking';
  if(p.habitat==='air'){if(s.elapsed>=p.nextFlight){p.nextFlight=s.elapsed+2+s.rng()*5;p.flightGoal=p.flightAngle+(s.rng()-.5)*1.6;}const margin=65;if(p.x<margin||p.x>s.width-margin||p.y<margin||p.y>s.height-margin)p.flightGoal=Math.atan2(s.height/2-p.y,s.width/2-p.x);const delta=Math.atan2(Math.sin(p.flightGoal-p.flightAngle),Math.cos(p.flightGoal-p.flightAngle));p.flightAngle+=delta*Math.min(1,dt*1.4);const speed=16+p.speed*.5;p.x=clamp(p.x+Math.cos(p.flightAngle)*speed*dt,30,s.width-30);p.y=clamp(p.y+Math.sin(p.flightAngle)*speed*dt,30,s.height-30);p.facing=Math.cos(p.flightAngle)<0?-1:1;}
  else{const points=s.definition.waterPoints;let distance=(6+p.speed*.15)*dt;while(distance>0){let next=p.travelIndex+p.travelDirection;if(next>=points.length||next<0){p.travelDirection*=-1;next=p.travelIndex+p.travelDirection;}const [x,y]=points[next],dx=x-p.x,dy=y-p.y,len=Math.hypot(dx,dy);if(Math.abs(dx)>.05)p.facing=dx<0?-1:1;if(len<=distance){p.x=x;p.y=y;p.travelIndex=next;distance-=len;}else{p.x+=dx/len*distance;p.y+=dy/len*distance;distance=0;}}}
 }
 function step(s,dt){if(s.status!=='playing'||!Number.isFinite(dt)||dt<=0)return;let remain=Math.min(dt,s.remaining);while(remain>1e-8){const h=Math.min(remain,.1);remain-=h;s.elapsed+=h;s.remaining=Math.max(0,s.remaining-h);if(s.elapsed>=s.densityAt)updateDensity(s);
  for(const p of s.people){if(p.animal&&p.habitat!=='ground'){moveAnimal(s,p,h);continue;}if(s.mode==='duo'&&p.id===s.targetId){control(s,p,h);continue;}if(p.ride!==null)continue;if(s.elapsed>=p.nextPace){p.nextPace=s.elapsed+3+s.rng()*14;p.wantPace=.2+s.rng()*1.65;if(p.activity==='walking'&&s.rng()<.35)p.pauseUntil=s.elapsed+.5+s.rng()*4;}
   if(p.chaseId!=null){if(s.elapsed<p.chaseUntil&&s.elapsed>=p.nextChase){p.nextChase=s.elapsed+.8;const other=s.people[p.chaseId];route(s,p,other.to??other.node);}else if(s.elapsed>=p.chaseUntil)p.chaseId=null;}p.pace+=(p.wantPace-p.pace)*Math.min(1,h*.8);if(p.station!==null){if(s.elapsed>p.until){s.stats.purchases++;release(s,p);route(s,p,destination(s,p));}}
   else if(p.activity==='walking'){if(s.elapsed>=p.pauseUntil)walk(s,p,h);}else if(s.elapsed>=p.until)decide(s,p);
   p.phase=(p.phase+h*(p.activity==='walking'?p.speed*p.pace/38:p.tempo))%1;
  }rides(s,h);if(s.elapsed>=s.nextEvent){event(s);s.nextEvent=s.elapsed+12+s.rng()*12;}s.events=s.events.filter(e=>e.end>s.elapsed);separate(s,h);
 }if(s.remaining<1e-7){s.remaining=0;s.status='lost';}}
 function touch(s,id){if(s.status!=='playing'||!s.people[id])return'ignored';s.lastHit={id,at:s.elapsed};const p=s.people[id];if(p.photographer){if(s.photographersFound.has(id))return'used';s.photographersFound.add(id);s.photoCredits++;return'photographer';}if(id===s.targetId){s.status='won';return'found';}s.mistakes++;s.remaining=Math.max(0,s.remaining-3);if(!s.remaining)s.status='lost';return'wrong';}
 function takePhoto(s,rect){if(s.status!=='playing'||s.photoCredits<=0||s.photos.length>=MAX_PHOTOS||s.photos.some(p=>!photoReady(s,p.id)))return null;if(!rect||!['x','y','w','h'].every(k=>Number.isFinite(rect[k]))||rect.w<=0||rect.h<=0)return null;const target=s.people[s.targetId],photo={id:s.photos.length,takenAt:s.elapsed,readyAt:s.elapsed+PHOTO_DELAY,rect:{...rect},target:{...target,path:[]},eventSnapshot:s.events.map(e=>({...e}))};s.photoCredits--;s.photos.push(photo);return photo;}
 function photoReady(s,id){return!!s.photos[id]&&s.elapsed+1e-8>=s.photos[id].readyAt;}
 function visibleInPhoto(photo){const {rect:r,target:p}=photo;return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y-50*p.height<=r.y+r.h;}
 return{LIMIT,PHOTO_DELAY,MAX_PHOTOS,random,create,start,pause,setPad,input,step,touch,takePhoto,photoReady,visibleInPhoto,nearest,pathTo,route,join,interact,density,overlapPairs,roleSpec,canUseSite};
});
