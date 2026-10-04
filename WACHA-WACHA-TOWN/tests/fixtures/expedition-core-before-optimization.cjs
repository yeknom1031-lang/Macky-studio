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
  const nodes=raw.map(([x,y,links,level=0,areaId=null])=>({x,y,links:[...links],level,areaId})),bins=new Map();
  nodes.forEach((n,i)=>{const key=`${Math.floor(n.x/80)},${Math.floor(n.y/80)}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);});
  return{nodes,bins,parents:new Int32Array(nodes.length),queue:new Int32Array(nodes.length)};
 }
 function pointInPolygon(x,y,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 function buildWalkable(s){if(!s.definition.livingTown)return;const unit=6,cols=Math.ceil(s.width/unit)+1,rows=Math.ceil(s.height/unit)+1,layers=[new Uint8Array(cols*rows),new Uint8Array(cols*rows)],radius=Math.max(9,s.width/1672*8.5);
  const stamp=(x,y,level)=>{const grid=layers[level];if(!grid)return;for(let yy=Math.max(0,Math.floor((y-radius)/unit));yy<=Math.min(rows-1,Math.ceil((y+radius)/unit));yy++)for(let xx=Math.max(0,Math.floor((x-radius)/unit));xx<=Math.min(cols-1,Math.ceil((x+radius)/unit));xx++)if(Math.hypot((xx+.5)*unit-x,(yy+.5)*unit-y)<=radius)grid[yy*cols+xx]=1;};
  for(const n of s.graph.nodes){stamp(n.x,n.y,n.level);for(const i of n.links){const q=s.graph.nodes[i],steps=Math.ceil(Math.hypot(q.x-n.x,q.y-n.y)/unit);for(let t=1;t<steps;t++){const x=n.x+(q.x-n.x)*t/steps,y=n.y+(q.y-n.y)*t/steps;stamp(x,y,n.level);if(n.level!==q.level)stamp(x,y,q.level);}}}
  const holes=[];for(const a of s.definition.activityAreas||[])for(const polygon of a.holes||[]){const xs=polygon.map(v=>v[0]),ys=polygon.map(v=>v[1]),hole={polygon,level:a.level||0,x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)};holes.push(hole);}
  s.walkable={unit,cols,rows,layers,holes};
 }
 function canStand(s,p,x,y){const g=s.walkable;if(!g||p.ride!==null&&p.ride!==undefined||p.layer>=2)return true;const level=p.level||0;if(!g.layers[level])return true;const cx=Math.floor(x/g.unit),cy=Math.floor(y/g.unit);if(cx<0||cy<0||cx>=g.cols||cy>=g.rows||!g.layers[level][cy*g.cols+cx])return false;for(const h of g.holes)if(h.level===level&&x>=h.x0&&x<=h.x1&&y>=h.y0&&y<=h.y1&&pointInPolygon(x,y,h.polygon))return false;return true;}
 function yieldOnFloor(s,p,dx,dy){if(!dx&&!dy)return;if(canStand(s,p,p.x+dx,p.y+dy)){p.x+=dx;p.y+=dy;}else if(Math.abs(dx)>.001&&canStand(s,p,p.x+dx,p.y))p.x+=dx;else if(Math.abs(dy)>.001&&canStand(s,p,p.x,p.y+dy))p.y+=dy;else if(canStand(s,p,p.x-dy,p.y+dx)){p.x-=dy;p.y+=dx;}else if(canStand(s,p,p.x+dy,p.y-dx)){p.x+=dy;p.y-=dx;}}
 function nearest(s,x,y,level=0){let best=Infinity,id=-1;const bx=Math.floor(x/80),by=Math.floor(y/80);for(let radius=0;radius<4;radius++){
  for(let yy=by-radius;yy<=by+radius;yy++)for(let xx=bx-radius;xx<=bx+radius;xx++)for(const i of s.graph.bins.get(`${xx},${yy}`)||[]){const n=s.graph.nodes[i];if(n.level!==level)continue;const d=(n.x-x)**2+(n.y-y)**2;if(d<best){best=d;id=i;}}
  if(id>=0&&Math.sqrt(best)<Math.max(1,radius)*80)return id;
 }if(id>=0)return id;s.graph.nodes.forEach((n,i)=>{if(n.level===level){const d=(n.x-x)**2+(n.y-y)**2;if(d<best){id=i;best=d;}}});return id;}
 function pathTo(s,start,end){if(start===end)return[];const g=s.graph,p=g.parents,q=g.queue;p.fill(-1);p[start]=start;q[0]=start;let head=0,tail=1;while(head<tail&&p[end]<0){const id=q[head++];for(const n of g.nodes[id].links)if(p[n]<0){p[n]=id;q[tail++]=n;}}if(p[end]<0)return null;const result=[];for(let n=end;n!==start;n=p[n])result.push(n);return result.reverse();}
 function streetPath(s,start,end){const g=s.graph,allowed=n=>g.nodes[n].level===0&&g.nodes[n].areaId==null;if(!allowed(start)||!allowed(end))return null;if(start===end)return[];const parents=g.parents,queue=g.queue;parents.fill(-1);parents[start]=start;queue[0]=start;let head=0,tail=1;while(head<tail&&parents[end]<0){const node=queue[head++];for(const n of g.nodes[node].links)if(parents[n]<0&&allowed(n)){parents[n]=node;queue[tail++]=n;}}if(parents[end]<0)return null;const path=[];for(let n=end;n!==start;n=parents[n])path.push(n);return path.reverse();}
 function route(s,p,end){if(p.exitSite!=null){p.afterExit=end;return true;}const start=p.to??p.node,path=p.streetOnly?streetPath(s,start,end):pathTo(s,start,end);if(!path)return false;p.path=path.length?path:[end];p.goal=end;p.activity='walking';return true;}
 function density(s,x,y){return s.density.get(`${Math.floor(x/72)},${Math.floor(y/72)}`)||0;}
 function updateDensity(s){s.density.clear();for(const p of s.people){const x=Math.floor(p.x/72),y=Math.floor(p.y/72);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=`${x+dx},${y+dy}`;s.density.set(k,(s.density.get(k)||0)+(dx===0&&dy===0?1:.3));}}s.densityAt=s.elapsed+.8;}
 function destination(s,p){let best=Infinity,id=p.node;for(let k=0;k<32;k++){const n=Math.floor(s.rng()*s.graph.nodes.length),q=s.graph.nodes[n];if(q.level!==(p.exitSite!=null?0:p.level)||p.streetOnly&&q.areaId!=null)continue;const dist=Math.hypot(q.x-p.x,q.y-p.y);if(dist<65||dist>600)continue;const score=density(s,q.x,q.y)*5+dist*.014+s.rng()*6;if(score<best){id=n;best=score;}}return id;}
 function release(s,p){
  const previous=p.station!==null?s.sites[p.station]:p.transitSite!=null?s.sites[p.transitSite]:null;
  if(p.ride!==null&&s.rides?.[p.ride])s.rides[p.ride].passengers=s.rides[p.ride].passengers.filter(id=>id!==p.id);
  p.ride=null;if(previous?.occupant===p.id)previous.occupant=null;p.station=null;p.activity='walking';p.until=0;p.pauseUntil=0;p.path=[];p.goal=-1;p.to=null;delete p.pendingSite;
  const stairHere=previous?.stairs?.map((node,index)=>({node,index,n:s.graph.nodes[node]})).filter(v=>p.level>0&&v.n.level===p.level&&Math.hypot(v.n.x-p.x,v.n.y-p.y)<36).sort((a,b)=>Math.hypot(a.n.x-p.x,a.n.y-p.y)-Math.hypot(b.n.x-p.x,b.n.y-p.y))[0];
  if(stairHere){p.exitSite=previous.id;p.transitSite=previous.id;p.path=previous.stairs.slice(0,stairHere.index+1).reverse();p.node=stairHere.node;p.layer=p.level;}
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
  const s={data,stage:index,definition:stage,width:stage.width,height:stage.height,graph:makeGraph(stage.navigation),rng,seed,mode,remaining:LIMIT,elapsed:0,status:'ready',people:[],sites:[],photos:[],photoCredits:0,photographersFound:new Set(),mistakes:0,lastHit:null,density:new Map(),densityAt:0,overlaps:new Map(),events:[],nextEvent:12,stats:{purchases:0,conversations:0,rides:0,events:0,maxOverlap:0},input:{x:0,y:0,act:false},padConnected:false,targetControlled:false,disconnect:false,returnStatus:'ready'};
  buildWalkable(s);
  s.sites=stage.sites.map((site,id)=>({...site,id,occupant:null,node:site.node??nearest(s,site.x,site.y,site.level||0),phase:0,kind:site.kind||roleSpec(site.roles[0]).place}));
  const ground=s.graph.nodes.map((n,i)=>i).filter(i=>s.graph.nodes[i].level===0&&s.graph.nodes[i].links.length);
  const floorPool=ground.filter(n=>s.graph.nodes[n].areaId),streetPool=ground.filter(n=>!s.graph.nodes[n].areaId),floorShare=s.definition.livingTown?Math.max(.38,floorPool.length/ground.length):0;
  const spawnBins=new Map();function spawnNode(pool){let best=pool[Math.floor(rng()*pool.length)],clearance=-1;for(let k=0;k<24;k++){const candidate=pool[Math.floor(rng()*pool.length)],n=s.graph.nodes[candidate],bx=Math.floor(n.x/48),by=Math.floor(n.y/48);let gap=80;for(let yy=by-1;yy<=by+1;yy++)for(let xx=bx-1;xx<=bx+1;xx++)for(const p of spawnBins.get(`${xx},${yy}`)||[])gap=Math.min(gap,Math.hypot(n.x-p.x,n.y-p.y));if(gap>clearance){best=candidate;clearance=gap;}if(gap>=28)break;}const n=s.graph.nodes[best],key=`${Math.floor(n.x/48)},${Math.floor(n.y/48)}`;if(!spawnBins.has(key))spawnBins.set(key,[]);spawnBins.get(key).push(n);return best;}
  s.people=cast.map((design,id)=>{const pool=floorPool.length&&streetPool.length?(rng()<floorShare?floorPool:streetPool):ground;const node=spawnNode(pool),n=s.graph.nodes[node],height=design.height||1;return{id,design:design.id,type:design.id,role:design.role,name:design.name,animal:!!design.animal,habitat:design.habitat||'ground',photographer:!!design.photographer,node,to:null,path:[],goal:-1,x:n.x,y:n.y,areaId:n.areaId,level:0,layer:0,phase:rng(),facing:rng()<.5?-1:1,height,speed:8+rng()**1.4*62,pace:.4+rng(),wantPace:.4+rng(),nextPace:rng()*10,nextDecision:rng()*12,pauseUntil:0,activity:rng()<.65?'acting':'walking',until:8+rng()*36,station:null,homeSite:null,partner:null,ride:null,exitSite:null,transitSite:null,dx:0,dy:0,signature:design.action||design.role,tempo:.5+rng()*.8,exclusive:design.stage===stage.key};});
  const photographers=s.people.filter(p=>p.photographer);if(photographers.length!==5)throw Error('Exactly five photographers are required');
  const targets=s.people.filter(p=>!p.photographer&&!p.animal);s.targetId=targets[Math.floor(rng()*targets.length)].id;s.targetType=s.people[s.targetId].design;
  for(const p of [...s.people].sort((a,b)=>Number(b.exclusive)-Number(a.exclusive))){p.behavior=roleSpec(p.role);const matching=s.sites.filter(site=>canUseSite(p,site));p.compatibleSites=matching.map(site=>site.id);const free=matching.filter(site=>site.occupant===null);p.homeSite=(free.length?free:matching)[Math.floor(rng()*(free.length||matching.length))]?.id??null;
   // The town is already living at the first frame: workers begin at their
   // counters, gardens and upper floors instead of all commuting from roads.
   const settle=p.photographer?.35:p.animal?.25:p.behavior.requiresSite?.88:.57;
   if(free.length&&rng()<settle){const site=free[Math.floor(rng()*free.length)];p.homeSite=site.id;p.x=site.x;p.y=site.y;p.node=site.node;p.level=p.layer=site.level||0;p.areaId=site.areaId||null;join(s,p,site.id);p.until=s.elapsed+8+rng()*Math.max(12,p.until-s.elapsed);p.phase=rng();}
  }
  for(const p of s.people)if(p.animal&&p.habitat!=='ground'){p.homeSite=null;p.station=null;p.pendingSite=undefined;p.transitSite=null;p.path=[];p.to=null;p.activity='walking';p.layer=p.habitat==='air'?4:5;p.travelIndex=0;p.travelDirection=1;p.flightAngle=rng()*Math.PI*2;p.flightGoal=p.flightAngle;p.nextFlight=0;if(p.habitat==='air'){p.x=80+rng()*(s.width-160);p.y=80+rng()*(s.height-160);}else{p.travelIndex=Math.floor(rng()*stage.waterPoints.length);[p.x,p.y]=stage.waterPoints[p.travelIndex];}}
  s.rides=stage.vehicles.map((name,id)=>{
   const water=/舟|船|艇|ボート/.test(name)&&!/飛行船|雲船|空の船/.test(name),air=/飛行船|雲船|空の船|ゴンドラ|リフト|浮遊|箒/.test(name),wet=stage.waterPoints||[];
   const streetOnly=!water&&!air,pool=streetOnly?ground.filter(i=>s.graph.nodes[i].areaId==null):ground;
   const node=water&&wet.length?nearest(s,wet[0][0],wet[0][1]):pool[Math.floor(rng()*pool.length)],n=s.graph.nodes[node],position=water&&wet.length?wet[0]:[n.x,n.y];
   return{id,name,node,to:null,path:[],goal:-1,x:position[0],y:position[1],originX:position[0],originY:position[1],dockNode:node,waterIndex:0,waterDirection:1,speed:34,pace:1,level:0,phase:0,facing:1,activity:'walking',passengers:[],stoppedUntil:8+id*2,nextStop:24+id*3,altitude:0,water,air,streetOnly};
  });
  separate(s,0,true);updateDensity(s);return s;
 }
 function start(s){if(s.status==='ready'||s.status==='paused'){s.status='playing';s.disconnect=false;return true;}return false;}
 function pause(s,reason='manual'){if(s.status==='playing'){s.status='paused';s.pauseReason=reason;}}
 function setPad(s,connected){s.padConnected=connected;if(!connected)controlTarget(s,false);}
 function controlTarget(s,active){active=!!active;if(s.targetControlled===active)return;s.targetControlled=active;s.input={x:0,y:0,act:false};s.actHeld=false;const p=s.people[s.targetId];if(!p)return;if(active){delete p.yieldWaitUntil;if(p.station===null&&p.ride===null){release(s,p);if(p.exitSite==null){p.path=[];p.to=null;p.activity='controlled';}}}else if(p.ride===null&&p.station===null){if(p.exitSite!=null||p.pendingSite!==undefined)p.activity='walking';else{release(s,p);route(s,p,destination(s,p));}}}
 function input(s,x,y,act=false){const n=Math.hypot(x,y);s.input={x:n>.16?x/Math.max(1,n):0,y:n>.16?y/Math.max(1,n):0,act:!!act};}
 function canUseSite(p,site){if(site&&site.contact===false&&['craft','trade','fish'].includes((p.behavior||roleSpec(p.role)).kind))return false;return !!site&&(site.roles.includes(p.role)||(site.kinds||[site.kind]).includes((p.behavior||roleSpec(p.role)).place));}
 function join(s,p,id){const site=s.sites[id];if(!canUseSite(p,site)||site.occupant!==null&&site.occupant!==p.id)return false;
  if(Math.hypot(p.x-site.x,p.y-site.y)>15||p.level!==(site.level||0)){if(!route(s,p,site.node))return false;p.pendingSite=id;p.transitSite=site.level?id:null;return true;}
  site.occupant=p.id;p.station=id;p.activity='working';p.until=s.elapsed+(p.behavior?.duration||12)*(s.definition.livingTown?2+s.rng()*3:1+s.rng());p.path=[];p.to=null;p.node=site.node;p.areaId=site.areaId||null;p.layer=p.level=site.level||0;p.x=site.x+(site.actorX||0);p.y=site.y+(site.actorY||0);p.facing=site.facing||p.facing;p.phase=0;p.transitSite=null;return true;
 }
 function disembark(s,p){const ride=s.rides[p.ride];if(!ride)return;ride.passengers=ride.passengers.filter(id=>id!==p.id);p.ride=null;release(s,p);p.exitSite=null;p.transitSite=null;p.level=p.layer=0;p.node=ride.water?ride.dockNode:nearest(s,ride.x,ride.y);const n=s.graph.nodes[p.node];p.x=n.x;p.y=n.y;yieldOnFloor(s,p,20,8);p.path=[];p.to=null;}
 function board(s,p,ride){if(p.level!==0||ride.passengers.length>=2||ride.stoppedUntil<s.elapsed)return false;release(s,p);p.path=[];p.to=null;p.exitSite=null;p.transitSite=null;delete p.afterExit;delete p.pendingSite;p.level=0;p.layer=ride.air?2:3;p.ride=ride.id;p.activity='riding';ride.passengers.push(p.id);s.stats.rides++;return true;}
 function interact(s,p){if(p.ride!==null){if(s.rides[p.ride].stoppedUntil>s.elapsed)disembark(s,p);return;}if(p.station!==null){release(s,p);return;}const ride=s.rides.find(r=>r.stoppedUntil>s.elapsed&&r.passengers.length<2&&Math.hypot(r.x-p.x,r.y-p.y)<65);if(ride&&board(s,p,ride))return;const approach=site=>s.graph.nodes[site.entryNode??site.node],candidates=s.sites.filter(site=>canUseSite(p,site)&&site.occupant===null&&Math.hypot(approach(site).x-p.x,approach(site).y-p.y)<62);candidates.sort((a,b)=>Math.hypot(approach(a).x-p.x,approach(a).y-p.y)-Math.hypot(approach(b).x-p.x,approach(b).y-p.y));if(candidates[0])join(s,p,candidates[0].id);}
 function walk(s,p,dt){let distance=p.speed*p.pace*dt;let count=0;while(distance>0&&count++<12){if(p.to===null){if(!p.path.length){p.activity='acting';p.until=s.elapsed+2+s.rng()*8;break;}p.to=p.path.shift();}
  const n=s.graph.nodes[p.to],dx=n.x-p.x,dy=n.y-p.y,len=Math.hypot(dx,dy);if(Math.abs(dx)>.1)p.facing=dx<0?-1:1;
  if(distance>=len){p.x=n.x;p.y=n.y;p.node=p.to;p.layer=p.level=n.level;p.areaId=n.areaId;p.to=null;distance-=len;if(!p.path.length&&p.exitSite!=null){p.exitSite=null;p.transitSite=null;const end=p.afterExit;delete p.afterExit;if(end!==undefined)route(s,p,end);}if(!p.path.length&&p.pendingSite!==undefined){const id=p.pendingSite;delete p.pendingSite;join(s,p,id);break;}}else{const mx=dx/len*distance,my=dy/len*distance,x=p.x,y=p.y,level=p.level,layer=p.layer;if(level===0&&n.level===1)p.level=p.layer=1;yieldOnFloor(s,p,mx,my);if(p.x===x&&p.y===y){p.level=level;p.layer=layer;}distance=0;}}
 }
 function control(s,p,dt){const v=s.input;if(Math.hypot(v.x,v.y)>.16&&p.station!==null)release(s,p);if(v.act&&!s.actHeld)interact(s,p);s.actHeld=v.act;if(p.station!==null){p.phase=(p.phase+dt*p.tempo)%1;return;}if(p.ride!==null)return;if(p.exitSite!=null||p.pendingSite!==undefined){p.phase=(p.phase+dt*.8)%1;walk(s,p,dt);return;}const mag=Math.hypot(v.x,v.y);p.activity=mag?'controlled':'acting';if(!mag)return;const dist=76*mag*dt,tx=p.x+v.x/mag*dist,ty=p.y+v.y/mag*dist;const n=nearest(s,tx,ty,p.level),q=s.graph.nodes[n];
  // Project onto an actual walkable edge. Free control never crosses building blocks.
  let best=null;for(const from of [p.node,n])for(const to of s.graph.nodes[from].links){const a=s.graph.nodes[from],b=s.graph.nodes[to],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((tx-a.x)*dx+(ty-a.y)*dy)/(dx*dx+dy*dy),0,1),x=a.x+t*dx,y=a.y+t*dy,d=Math.hypot(x-tx,y-ty);if(!best||d<best.d)best={x,y,d,from,to,t};}
  if(best){const radius=14,dx=tx-best.x,dy=ty-best.y,k=best.d>radius?radius/best.d:1,node=best.t>.5?best.to:best.from,next=s.graph.nodes[node],placement={...p,level:next.level,layer:next.level};const nx=best.x+dx*k,ny=best.y+dy*k;let accepted=false;if(canStand(s,placement,nx,ny)){p.x=nx;p.y=ny;accepted=true;}else if(canStand(s,placement,best.x,best.y)){p.x=best.x;p.y=best.y;accepted=true;}if(accepted){p.node=node;p.level=p.layer=next.level;p.areaId=next.areaId;}}
  if(Math.abs(v.x)>.05)p.facing=v.x<0?-1:1;p.phase=(p.phase+dt*mag*1.7)%1;
 }
 function decide(s,p){if(p.station!==null)return;if(p.pendingSite!==undefined)return;if(p.homeSite!==null&&s.rng()<.7&&join(s,p,p.homeSite))return;if(p.compatibleSites?.length&&s.rng()<.72){const candidates=p.compatibleSites.map(id=>s.sites[id]).filter(site=>site.occupant===null);if(candidates.length){candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));if(join(s,p,candidates[Math.floor(s.rng()*Math.min(5,candidates.length))].id))return;}}
  if(p.behavior.kind==='ride'){const r=s.rides.find(r=>r.stoppedUntil>s.elapsed&&Math.hypot(r.x-p.x,r.y-p.y)<80);if(r&&board(s,p,r))return;}
  const pick=s.rng();if(pick<.5){p.activity='acting';p.until=s.elapsed+6+s.rng()*28;return;}
  if(pick<.64&&!p.animal){const other=s.people.find(q=>q.id!==p.id&&q.id!==s.targetId&&!q.animal&&q.station===null&&q.activity==='acting'&&Math.hypot(q.x-p.x,q.y-p.y)<48);if(other){p.activity=other.activity='chat';p.until=other.until=s.elapsed+5+s.rng()*8;p.facing=other.x>p.x?1:-1;other.facing=-p.facing;s.stats.conversations++;return;}}
  route(s,p,destination(s,p));
 }
 function overlapPairs(s){const bins=new Map(),pairs=[];for(const p of s.people){const bx=Math.floor(p.x/44),by=Math.floor(p.y/44);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const q of bins.get(`${bx+dx},${by+dy}`)||[]){if(p.layer>=4||q.layer>=4)continue;if(p.layer!==q.layer){const pGround=p.layer===0&&p.level===0&&p.ride===null,qGround=q.layer===0&&q.level===0&&q.ride===null,pRider=p.ride!==null&&(s.rides[p.ride]?.altitude||0)<1,qRider=q.ride!==null&&(s.rides[q.ride]?.altitude||0)<1;if(!(pGround&&qRider||qGround&&pRider))continue;}const rx=22*(p.height+q.height)/2,ry=23*(p.height+q.height)/2,xx=p.x-q.x,yy=p.y-16*p.height-q.y+16*q.height,d=Math.hypot(xx/rx,yy/ry);if(d<1.06)pairs.push({p,q,rx,ry,xx,yy,d,key:`${q.id}:${p.id}`});}const key=`${bx},${by}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(p);}return pairs;}
 // A narrow dead end sometimes has no space in the repulsion direction. Walk
 // through the short shared gap toward a free floor point instead of repeatedly
 // pushing the same person back into the wall. The controlled player stays still.
 function floorSegment(s,p,x0,y0,x1,y1){const steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=1;i<=steps;i++)if(!canStand(s,p,x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps))return false;return true;}
 function beginFloorEscape(s,p,other){
  if(!s.walkable||p.floorEscape||p.yieldWaitUntil>s.elapsed||p.ride!==null||p.layer>=2||s.targetControlled&&p.id===s.targetId)return false;
  const nearby=s.people.filter(q=>q.id!==p.id&&(q.layer===p.layer||p.level===0&&q.ride!==null&&(s.rides[q.ride]?.altitude||0)<1)&&Math.hypot(q.x-p.x,q.y-p.y)<150),gap=(x,y,q)=>Math.hypot((x-q.x)/(22*(p.height+q.height)/2),(y-16*p.height-q.y+16*q.height)/(23*(p.height+q.height)/2));
  const projected=nearby.map(q=>{let vx=q.motionVX||0,vy=q.motionVY||0;const next=q.floorEscape?.points[0];if(next){const dx=next.x-q.x,dy=next.y-q.y,d=Math.hypot(dx,dy)||1;vx=dx/d*60;vy=dy/d*60;}else if(q.floorEscape||q.yieldWaitUntil>s.elapsed||s.targetControlled&&q.id===s.targetId&&!s.input.x&&!s.input.y||q.ride!==null&&s.rides[q.ride].stoppedUntil>s.elapsed)vx=vy=0;const speed=Math.hypot(vx,vy),scale=speed>90?90/speed:1;return{q,vx:vx*scale,vy:vy*scale};}),future=(item,time)=>({height:item.q.height,x:item.q.x+item.vx*time,y:item.q.y+item.vy*time}),movingOther=projected.find(item=>item.q===other);
  const nodes=[{x:p.x,y:p.y,parent:-1,length:0}],seen=new Set(['0:0']),directions=[[1,0],[-1,0],[0,1],[0,-1]];let goal=-1,score=Infinity;
  for(let head=0;head<nodes.length&&head<700;head++){const n=nodes[head],arrival=Math.min(.9,n.length/60);if(n.length>=6&&gap(n.x,n.y,other)>=1.3&&(!movingOther||gap(n.x,n.y,future(movingOther,arrival))>=1.3)){let crowd=0;for(const item of projected){const end=item.q.floorEscape?.points.at(-1),destination=end?{height:item.q.height,...end}:future(item,arrival);crowd+=Math.max(0,1.12-Math.min(gap(n.x,n.y,item.q),gap(n.x,n.y,destination)))**2;}const cost=crowd*1000+n.length*.01;if(cost<score){goal=head;score=cost;}if(crowd===0)break;}
   for(const [dx,dy] of directions){const x=n.x+dx*6,y=n.y+dy*6,length=n.length+Math.hypot(dx,dy)*6,key=`${Math.round((x-p.x)/6)}:${Math.round((y-p.y)/6)}`;if(length>84||seen.has(key)||x<14||x>s.width-14||y<30||y>s.height-8||!floorSegment(s,p,n.x,n.y,x,y))continue;seen.add(key);nodes.push({x,y,parent:head,length});}
  }
  if(goal<0)return false;const points=[];for(let i=goal;i>0;i=nodes[i].parent)points.push({x:nodes[i].x,y:nodes[i].y});points.reverse();release(s,p);delete p.yieldWaitUntil;p.floorEscape={points,otherId:other.id,until:s.elapsed+1.6};p.activity='yielding';p.until=s.elapsed+1.7;p.pauseUntil=0;return true;
 }
 function advanceFloorEscape(s,p,dt){const escape=p.floorEscape;if(!escape)return;if(p.ride!==null||s.targetControlled&&p.id===s.targetId){delete p.floorEscape;return;}
  if(p.station!==null)release(s,p);p.activity='yielding';p.until=escape.until+.1;p.chaseId=null;let distance=60*dt;while(distance>0&&escape.points.length){const point=escape.points[0],dx=point.x-p.x,dy=point.y-p.y,len=Math.hypot(dx,dy),step=Math.min(len,distance),x=len>0?p.x+dx/len*step:point.x,y=len>0?p.y+dy/len*step:point.y;if(!floorSegment(s,p,p.x,p.y,x,y))break;if(Math.abs(dx)>.01)p.facing=dx<0?-1:1;p.x=x;p.y=y;distance-=step;if(len<=step+.001)escape.points.shift();else break;}
  if(!escape.points.length||s.elapsed>=escape.until){delete p.floorEscape;release(s,p);route(s,p,destination(s,p));}
 }
 // Persistent neighbors receive a wider passing gap. Keep each escape route long enough
 // to make progress. Only an older unresolved pair may interrupt a route that was
 // planned for someone else; keep the route for the current pair stable.
 function separate(s,dt,initial=false){const before=s.people.map(p=>[p.x,p.y]);for(const p of s.people){p.motionVX=!initial&&dt?(p.x-(p.lastFloorX??p.x))/dt:0;p.motionVY=!initial&&dt?(p.y-(p.lastFloorY??p.y))/dt:0;}let urgent=false,stuck=false;for(const age of s.overlaps.values()){if(age>1.2)urgent=true;if(age>=.7)stuck=true;}if(!initial&&s.walkable){if(stuck){
   const pairs=overlapPairs(s).sort((a,b)=>(s.overlaps.get(b.key)||0)-(s.overlaps.get(a.key)||0)),priority=new Map(pairs.map((m,i)=>[m.key,i]));
   for(const m of pairs){const age=s.overlaps.get(m.key)||0;if(age<.7)continue;const escaping=m.p.floorEscape||m.q.floorEscape;if(escaping&&age<=1.2)continue;
    const choices=[m.p,m.q].filter(p=>{const other=p===m.p?m.q:m.p,escape=p.floorEscape;if(!escape)return !escaping||other.floorEscape?.otherId!==p.id;if(escape.otherId===other.id)return false;const oldKey=`${Math.min(p.id,escape.otherId)}:${Math.max(p.id,escape.otherId)}`;return priority.get(m.key)<(priority.get(oldKey)??Infinity);}).sort((a,b)=>Number(a.station!==null)-Number(b.station!==null));
    for(const p of choices){const previous=p.floorEscape;delete p.floorEscape;if(beginFloorEscape(s,p,p===m.p?m.q:m.p))break;if(previous)p.floorEscape=previous;}
   }
   // The other walker gives this resident time to pass instead of following the
   // escape route at the same speed. Manual players and seated riders keep control.
   for(const m of pairs)if((s.overlaps.get(m.key)||0)>=.7)for(const p of [m.p,m.q]){const other=p===m.p?m.q:m.p;if(other.floorEscape?.otherId!==p.id||p.ride!==null||p.station!==null||s.targetControlled&&p.id===s.targetId)continue;
    if(p.floorEscape){const key=`${Math.min(p.id,p.floorEscape.otherId)}:${Math.max(p.id,p.floorEscape.otherId)}`;if((priority.get(key)??Infinity)<priority.get(m.key))continue;delete p.floorEscape;release(s,p);route(s,p,destination(s,p));}
    p.yieldWaitUntil=Math.max(p.yieldWaitUntil||0,Math.min(other.floorEscape.until,s.elapsed+.6));
   }
  }for(const p of s.people)advanceFloorEscape(s,p,dt);}for(let pass=0;pass<(initial?16:urgent?12:3);pass++){for(const m of overlapPairs(s)){const age=s.overlaps.get(m.key)||0,clearance=age>1.5?1.28:1.05;if(m.d>=clearance-.005||m.p.floorEscape||m.q.floorEscape)continue;const {p,q,rx,ry}=m;let ux=m.xx/rx,uy=m.yy/ry,d=m.d;if(d<.001){ux=Math.cos(p.id*2.39+q.id);uy=Math.sin(p.id*2.39+q.id);d=1;}const amount=(clearance-m.d)*.5*(initial||urgent?1:.6),px=ux/d*amount*rx,py=uy/d*amount*ry;const pControlled=!initial&&s.targetControlled&&p.id===s.targetId,qControlled=!initial&&s.targetControlled&&q.id===s.targetId,pRider=p.ride!==null&&q.ride===null,qRider=q.ride!==null&&p.ride===null,wp=pRider?0:qRider?2:pControlled?0:qControlled?2:p.station!==null?(q.station!==null?1:0):q.station!==null?2:1,wq=2-wp;yieldOnFloor(s,p,px*wp,py*wp);yieldOnFloor(s,q,-px*wq,-py*wq);}
   for(const p of s.people){if(p.animal&&p.habitat!=='ground')continue;const x=clamp(p.x,14,s.width-14),y=clamp(p.y,30,s.height-8);if(canStand(s,p,x,y)){p.x=x;p.y=y;}}}
  const ages=new Map();for(const m of overlapPairs(s))if(m.d<1){const age=(s.overlaps.get(m.key)||0)+dt;ages.set(m.key,age);s.stats.maxOverlap=Math.max(s.stats.maxOverlap,age);if(age>1.5){for(const p of [m.p,m.q])if(p.ride===null&&(p.id!==s.targetId||!s.targetControlled)&&!p.floorEscape&&!(p.yieldWaitUntil>s.elapsed)&&!(p.evadeUntil>s.elapsed)){release(s,p);route(s,p,destination(s,p));p.evadeUntil=s.elapsed+2;p.pauseUntil=0;p.pace=Math.max(p.pace,1.2);}}}s.overlaps=ages;
  for(const p of s.people){const [x,y]=before[p.id];if(!initial&&Math.hypot(p.x-x,p.y-y)>.1)p.yielding=s.elapsed+.15;p.lastFloorX=p.x;p.lastFloorY=p.y;}
 }
 function event(s){const index=s.stats.events%s.definition.events.length,name=s.definition.events[index],kind=/演奏|演|踊|パレード|人形/.test(name)?'perform':/到着|着く|荷物|届|配達|運ぶ|搬入|乗|降/.test(name)?'delivery':/追|泥棒/.test(name)?'chase':/水|釣|魚|舟|船|浮標/.test(name)?'water':/休憩|席|客|交代|案内|観客/.test(name)?'gather':'work';
  const places={perform:['performance','play'],delivery:['shop','workshop'],water:['water','garden'],gather:['seat','play'],work:['workshop','kitchen','garden'],chase:['street','open']},choices=s.sites.filter(site=>places[kind].includes(site.kind)),site=(choices.length?choices:s.sites)[index%(choices.length||s.sites.length)];if(!site)return;
  s.events.push({kind,name,site:site.id,start:s.elapsed,end:s.elapsed+12});s.stats.events++;
  const nearby=s.people.filter(p=>p.station===null&&p.ride===null&&p.id!==s.targetId&&!p.photographer&&!p.animal&&p.level===0&&Math.hypot(p.x-site.x,p.y-site.y)<220).sort((a,b)=>Math.hypot(a.x-site.x,a.y-site.y)-Math.hypot(b.x-site.x,b.y-site.y)).slice(0,7);
  const worker=nearby.find(p=>canUseSite(p,site));nearby.forEach((p,i)=>{if(kind==='perform'){p.activity=i<3?'dance':'chat';p.until=s.elapsed+9;p.facing=i%2?1:-1;}else if(kind==='delivery'&&i<2){route(s,p,site.entryNode??site.node);p.wantPace=1.4;}else if((kind==='work'||kind==='water')&&p===worker){join(s,p,site.id);}else if(kind==='gather'){p.activity='chat';p.until=s.elapsed+8;p.facing=i%2?1:-1;}else if(i%2)route(s,p,destination(s,p));});
  const chasers=s.people.filter(p=>p.id!==s.targetId&&p.ride===null&&p.station===null&&['R177','R211'].includes(p.role)),runners=s.people.filter(p=>p.id!==s.targetId&&p.ride===null&&p.station===null&&['R178','R212','R213'].includes(p.role));
  if((kind==='chase'||index===3)&&chasers.length&&runners.length){const p=chasers[0],q=runners[0];p.chaseId=q.id;p.chaseUntil=s.elapsed+12;p.nextChase=0;p.wantPace=1.7;q.wantPace=1.5;route(s,q,destination(s,q));}
 }
 function dock(s,r){r.altitude=0;r.stoppedUntil=s.elapsed+6;r.nextStop=s.elapsed+22+s.rng()*15;for(const id of [...r.passengers])if(id!==s.targetId||!s.targetControlled)disembark(s,s.people[id]);
  const point=r.water?s.graph.nodes[r.dockNode]:r,available=s.people.filter(p=>p.ride===null&&p.station===null&&!p.photographer&&!p.animal&&p.level===0&&(p.id!==s.targetId||!s.targetControlled)&&Math.hypot(p.x-point.x,p.y-point.y)<80).slice(0,2);for(const p of available)board(s,p,r);
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
  for(const p of s.people){if(p.animal&&p.habitat!=='ground'){moveAnimal(s,p,h);continue;}if(s.targetControlled&&p.id===s.targetId){control(s,p,h);continue;}if(p.ride!==null)continue;if(p.yieldWaitUntil>s.elapsed)continue;if(s.elapsed>=p.nextPace){p.nextPace=s.elapsed+3+s.rng()*14;p.wantPace=.2+s.rng()*1.65;if(p.activity==='walking'&&s.rng()<.35)p.pauseUntil=s.elapsed+.5+s.rng()*4;}
   if(p.chaseId!=null){if(s.elapsed<p.chaseUntil&&s.elapsed>=p.nextChase){p.nextChase=s.elapsed+.8;const other=s.people[p.chaseId];route(s,p,other.to??other.node);}else if(s.elapsed>=p.chaseUntil)p.chaseId=null;}p.pace+=(p.wantPace-p.pace)*Math.min(1,h*.8);if(p.station!==null){if(s.elapsed>p.until){s.stats.purchases++;release(s,p);route(s,p,destination(s,p));}}
   else if(p.activity==='walking'){if(s.elapsed>=p.pauseUntil)walk(s,p,h);}else if(s.elapsed>=p.until)decide(s,p);
   p.phase=(p.phase+h*(p.activity==='walking'?p.speed*p.pace/38:p.tempo))%1;
  }rides(s,h);if(s.elapsed>=s.nextEvent){event(s);s.nextEvent=s.elapsed+12+s.rng()*12;}s.events=s.events.filter(e=>e.end>s.elapsed);separate(s,h);
 }if(s.remaining<1e-7){s.remaining=0;s.status='lost';}}
 function touch(s,id){if(s.status!=='playing'||!s.people[id])return'ignored';s.lastHit={id,at:s.elapsed};const p=s.people[id];if(p.photographer){if(s.photographersFound.has(id))return'used';s.photographersFound.add(id);s.photoCredits++;return'photographer';}if(id===s.targetId){s.status='won';return'found';}s.mistakes++;s.remaining=Math.max(0,s.remaining-3);if(!s.remaining)s.status='lost';return'wrong';}
 function takePhoto(s,rect){if(s.status!=='playing'||s.photoCredits<=0||s.photos.length>=MAX_PHOTOS||s.photos.some(p=>!photoReady(s,p.id)))return null;if(!rect||!['x','y','w','h'].every(k=>Number.isFinite(rect[k]))||rect.w<=0||rect.h<=0)return null;const target=s.people[s.targetId],photo={id:s.photos.length,takenAt:s.elapsed,readyAt:s.elapsed+PHOTO_DELAY,rect:{...rect},target:{...target,path:[]},eventSnapshot:s.events.map(e=>({...e}))};s.photoCredits--;s.photos.push(photo);return photo;}
 function photoReady(s,id){return!!s.photos[id]&&s.elapsed+1e-8>=s.photos[id].readyAt;}
 function visibleInPhoto(photo){const {rect:r,target:p}=photo;return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y-50*p.height<=r.y+r.h;}
 return{LIMIT,PHOTO_DELAY,MAX_PHOTOS,random,create,start,pause,setPad,controlTarget,input,step,touch,takePhoto,photoReady,visibleInPhoto,nearest,pathTo,route,join,interact,density,overlapPairs,roleSpec,canUseSite,canStand};
});
