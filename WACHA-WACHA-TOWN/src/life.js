(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WachaLife=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const Space=typeof module!=='undefined'&&module.exports?require('./space.js'):WachaSpace;
 const NAMES={walk:'おさんぽ',going:'おでかけ',queue:'順番待ち',shopping:'買い物',vendor:'お店番',chat:'おしゃべり',fishing:'釣り',music:'演奏',dance:'ダンス',watch:'鑑賞',rest:'読書・休憩',eat:'おやつ',ride:'乗り物',play:'ボール遊び',tag:'鬼ごっこ',police:'見回り',pursue:'追跡',flee:'逃走',caught:'つかまった',delivery:'配達'};
 const WATER=[[[.65,.43,.72,.43],[.29,.78,.22,.80],[.79,.59,.82,.61]],[[.42,.46,.49,.49],[.26,.49,.21,.49],[.65,.86,.67,.85]],[[.21,.13,.22,.035],[.49,.11,.5,.035],[.78,.14,.78,.035]],[[.44,.47,.48,.45],[.84,.20,.88,.18],[.17,.89,.1,.88]],[[.44,.48,.49,.48],[.79,.19,.86,.16],[.20,.79,.15,.81]],[[.46,.16,.40,.15],[.78,.18,.72,.19],[.8,.85,.87,.84]],[[.43,.23,.49,.21],[.72,.51,.67,.5],[.25,.88,.30,.9]]];
 function bubble(s,p,text,seconds=2.5){p.gesturingUntil=s.elapsed+seconds;}
 function log(s,text,kind='town'){s.life.feed.unshift({text,kind,at:s.elapsed});s.life.feed.length=Math.min(s.life.feed.length,4);s.life.serial++;}
 function free(s,p,delay=8){p.activity=p.role==='police'?'police':p.role==='delivery'?'delivery':'walk';p.until=0;p.goal=-1;p.path=null;p.arrived=false;p.partner=-1;p.rideId=null;p.nextThink=s.elapsed+(p.signature?1+s.rng()*4:delay+s.rng()*6);p.gesturingUntil=0;}
 function stationary(s,p,activity,duration){p.activity=activity;p.until=s.elapsed+duration;p.path=null;p.goal=-1;p.arrived=false;p.phase=s.rng();}
 function send(s,p,kind,node,station,C){if(!C.route(s,p,node))return false;p.activity='going';p.pending=kind;p.station=station;p.nextThink=s.elapsed+40;return true;}
 function targetNear(s,p,x,y,C){return C.nearest(s,x,y,s.graph.nodes[p.from].component);}
 function randomGoal(s,p,C,distance=220){const component=s.graph.components[s.graph.nodes[p.from].component];let chosen=p.from;for(let k=0;k<30;k++){const i=component[Math.floor(s.rng()*component.length)],n=s.graph.nodes[i];if(Math.hypot(n.x-p.x,n.y-p.y)>distance){chosen=i;break;}}C.route(s,p,chosen);return chosen;}
 function startChat(s,p,q){const until=s.elapsed+12+s.rng()*12;stationary(s,p,'chat',until-s.elapsed);stationary(s,q,'chat',until-s.elapsed);p.partner=q.id;q.partner=p.id;p.facing=q.x>p.x?1:-1;q.facing=-p.facing;bubble(s,p,'こんにちは',3);bubble(s,q,'♪',3);s.life.stats.conversations++;}
 function updateCrowd(s,C){
  const l=s.life,cols=Math.ceil(C.WIDTH/80),rows=Math.ceil(C.HEIGHT/80),crowd=l.crowd||(l.crowd={cols,rows,raw:new Float32Array(cols*rows),field:new Float32Array(cols*rows),next:0});crowd.raw.fill(0);
  const add=(x,y,weight)=>{const ix=Math.max(0,Math.min(cols-1,Math.floor(x/80))),iy=Math.max(0,Math.min(rows-1,Math.floor(y/80)));crowd.raw[iy*cols+ix]+=weight;};
  for(const p of s.people){add(p.x,p.y,1);if(p.activity==='going'&&p.goal>=0){const n=s.graph.nodes[p.goal];add(n.x,n.y,.45);}}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){let value=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=cols||yy>=rows)continue;value+=crowd.raw[yy*cols+xx]*(dx===0&&dy===0?1:dx===0||dy===0?.42:.18);}crowd.field[y*cols+x]=value;}
  crowd.next=s.elapsed+.8;
 }
 function roomyNode(s,p,C){
  const here=C.densityAt(s,p.x,p.y);if(here<10)return -1;
  const nodes=s.graph.components[s.graph.nodes[p.from].component],reach=Math.max(150,Math.min(380,p.speed*9)),maxDensity=here*.72;
  let best=Infinity,result=-1;
  for(let k=0;k<72;k++){const id=nodes[Math.floor(s.rng()*nodes.length)],n=s.graph.nodes[id],d=Math.hypot(n.x-p.x,n.y-p.y);if(d<65||d>reach)continue;const density=C.densityAt(s,n.x,n.y);if(density>maxDensity)continue;const score=density+d*.015+s.rng()*1.5;if(score<best){best=score;result=id;}}
  return result;
 }
 function relocate(s,p,C,activity=p.signature||'rest'){
  const node=roomyNode(s,p,C);if(node<0)return false;
  if(!C.route(s,p,node))return false;
  // Avoid sending a slow walker on a long detour around an entire canal.
  if(p.path.length>Math.max(20,p.speed*2.8)){p.path=null;p.goal=-1;return false;}
  p.activity='going';p.pending=activity;p.station=0;p.nextThink=s.elapsed+40;p.pauseUntil=Math.min(p.pauseUntil,s.elapsed+1.5);s.life.stats.quietMoves++;return true;
 }
 function venueLoad(s,activity,station){let n=0;for(const p of s.people)if(p.station===station&&(p.activity===activity||(p.activity==='going'&&p.pending===activity)))n++;return n;}
 function setup(s,C){
  const l=s.life={shops:[],fishing:[],props:[],rides:[],tagGames:[],feed:[],serial:0,nextDecision:.5,nextRobbery:3,nextParty:18,crime:null,counts:{},stats:{purchases:0,fish:0,conversations:0,tags:0,boardings:0,arrests:0,deliveries:0,quietMoves:0},used:new Set(),decisionCursor:0};
  const major=s.graph.largest;
  for(const p of s.people){const info=C.typeInfo(p.type);p.signature=info.action;p.animal=info.animal;p.height=info.height;p.personalTempo=.55+s.rng()*1.15;p.pace=.4+s.rng()*.9;p.destinationPace=p.pace;p.home=p.from;if([2,8,16,17,48,50,56].includes(info.base))p.speed=6+s.rng()*13;if(info.animal)p.speed=14+s.rng()*62;}
  l.ambient={clouds:7,balloons:24,gulls:16,butterflies:18};
  function station(x,y,extra={}){const node=C.nearest(s,x*C.WIDTH,y*C.HEIGHT,major),n=s.graph.nodes[node];return{node,x:n.x,y:n.y,...extra};}
  function take(predicate=()=>true){const p=s.people.find(p=>!l.used.has(p.id)&&!p.animal&&predicate(p))||s.people.find(p=>!l.used.has(p.id));l.used.add(p.id);return p;}
  function put(p,st,dx=0,dy=0){C.place(s,p,C.nearest(s,st.x+dx,st.y+dy,major));}
  const shopPoints=[[.18,.36],[.37,.68],[.72,.34],[.82,.72]];
  shopPoints.forEach(([x,y],i)=>{const st=station(x,y,{id:i,vendor:-1,queue:[],serving:null});l.shops.push(st);l.props.push({...st,prop:4,height:66,depth:st.y-5});const vendor=take(p=>C.typeInfo(p.type).base===13);put(vendor,st,-12,-10);vendor.role='vendor';vendor.station=i;stationary(s,vendor,'vendor',999);st.vendor=vendor.id;
   for(let k=0;k<5;k++){const p=take();put(p,st,18+(k%2)*20,10+Math.floor(k/2)*15);p.station=i;stationary(s,p,'queue',60);st.queue.push(p.id);}
  });
  WATER[s.stage].forEach(([x,y,wx,wy],i)=>{const st=station(x,y,{id:i,waterX:wx*C.WIDTH,waterY:wy*C.HEIGHT});l.fishing.push(st);for(let k=0;k<5;k++){const p=take(k===0?p=>C.typeInfo(p.type).base===12:()=>true);put(p,st,(k-2)*17,0);p.station=i;stationary(s,p,'fishing',30+s.rng()*35);p.catchAt=2+s.rng()*9;p.facing=st.waterX>p.x?1:-1;}});
  l.music=station(.58,.67);l.props.push({...l.music,prop:5,height:78,depth:l.music.y-5});
  for(let k=0;k<3;k++){const p=take(p=>C.typeInfo(p.type).base===14);put(p,l.music,(k-1)*20,-15);p.role='musician';stationary(s,p,'music',999);}
  for(let k=0;k<15;k++){const p=take();put(p,l.music,(k%5-2)*22,30+Math.floor(k/5)*18);stationary(s,p,k%2?'watch':'dance',20+s.rng()*20);}
  l.bench=station(.29,.7);l.props.push({...l.bench,prop:3,height:44,depth:l.bench.y+1});
  for(let k=0;k<4;k++){const p=take();put(p,l.bench,(k-1.5)*12,-4);stationary(s,p,'rest',22+s.rng()*18);}
  l.playground=station(.68,.64);l.props.push({...l.playground,prop:6,height:73,depth:l.playground.y+12});
  for(let k=0;k<8;k++){const p=take(p=>[0,3,5,9,15].includes(C.typeInfo(p.type).base));put(p,l.playground,(k%4-1.5)*22,20+Math.floor(k/4)*25);stationary(s,p,'play',35+s.rng()*20);}
  for(let k=0;k<15;k++){const p=take(),q=take();const st=station(.14+s.rng()*.7,.22+s.rng()*.65);put(p,st,-10,0);put(q,st,12,3);startChat(s,p,q);}
  for(let k=0;k<4;k++){const p=take(p=>[0,3,5,9,15].includes(C.typeInfo(p.type).base)),q=take(p=>[0,3,5,9,15].includes(C.typeInfo(p.type).base));put(p,l.playground,-70+k*30,65);put(q,l.playground,-55+k*30,75);p.activity=q.activity='tag';p.role=q.role='child';p.tagGame=q.tagGame=k;l.tagGames.push({a:p.id,b:q.id,chaser:p.id,next:0,cooldown:2});randomGoal(s,q,C,130);}
  for(let k=0;k<7;k++){const p=take(p=>C.typeInfo(p.type).base===10);p.role='police';p.activity='police';const st=l.shops[k%4];put(p,st,80,-35);}
  for(let k=0;k<5;k++){const p=take(p=>C.typeInfo(p.type).base===11);p.role='thief';p.activity='walk';put(p,l.shops[k%4],55,20);}
  for(let k=0;k<7;k++){const p=take();p.role='delivery';p.activity='delivery';p.inventory='parcel';p.nextThink=4+s.rng()*8;}
  const tram=station(.2,.65),tramEnd=station(.79,.32);const driver={id:-1,type:0,speed:46,phase:0,lane:0,facing:1};C.place(s,driver,tram.node);C.route(s,driver,tramEnd.node);
  l.rides.push({id:0,kind:'tram',driver,stops:[tram.node,tramEnd.node],stopIndex:1,passengers:[],departAt:0,swapAt:999,x:tram.x,y:tram.y,prop:0,height:140});
  const cup=station(.48,.67);l.rides.push({id:1,kind:'cup',x:cup.x,y:cup.y,centerX:cup.x,centerY:cup.y,passengers:[],swapAt:20,prop:2,height:76});
  const water=l.fishing[0];l.rides.push({id:2,kind:'boat',x:water.waterX,y:water.waterY,centerX:water.waterX,centerY:water.waterY,passengers:[],swapAt:28,prop:1,height:70,bank:water.node});
  l.rides.forEach((ride,i)=>{for(let k=0;k<(i===0?4:2);k++){const p=take();p.activity='ride';p.rideId=i;p.seat=k;ride.passengers.push(p.id);l.stats.boardings++;}});
  // Most residents start doing something; activities are spread across the existing streets.
  for(const p of s.people){
   if(!l.used.has(p.id)){
    if(p.signature&&s.rng()<.88){stationary(s,p,p.signature,18+s.rng()*68);p.home=p.from;}
    else if(!p.signature&&s.rng()<.62){stationary(s,p,['eat','rest','stretch','watch'][p.id%4],12+s.rng()*25);}
   }
   if(p.nextThink===undefined)p.nextThink=1+s.rng()*8;
  }
  // A few nearby pairs wave and talk, rather than forming one large crowd.
  for(const p of s.people){if(p.animal||p.role!=='resident'||p.activity!=='walk'||s.rng()>.45)continue;const q=s.people.find(q=>q.id!==p.id&&!q.animal&&q.role==='resident'&&q.activity==='walk'&&Math.hypot(q.x-p.x,q.y-p.y)<50);if(q)startChat(s,p,q);}
  log(s,'開店しました！ お店も遊び場も、にぎわっています。','town');
  delete l.used;updateRides(s,0,C);Space.after(s,0,C,true);updateCounts(s);updateCrowd(s,C);
 }
 function updateCounts(s){const counts={};for(const p of s.people)counts[p.activity]=(counts[p.activity]||0)+1;s.life.counts=counts;}
 function arrive(s,p,C){const activity=p.pending;stationary(s,p,activity,12+s.rng()*24);
  if(activity==='queue'){const shop=s.life.shops[p.station];if(shop.queue.length>=8){free(s,p,18);bubble(s,p,'またあとで',2);return;}if(!shop.queue.includes(p.id))shop.queue.push(p.id);p.until=s.elapsed+70;}
  if(activity==='fishing'){p.catchAt=s.elapsed+4+s.rng()*8;p.until=s.elapsed+25+s.rng()*35;const st=s.life.fishing[p.station];p.facing=st.waterX>p.x?1:-1;}
  if(activity==='rest')bubble(s,p,'ふぅ…',2);
 }
 function decide(s,p,C){
  if(!['walk','police','delivery'].includes(p.activity)||s.elapsed<p.nextThink)return;p.nextThink=s.elapsed+8+s.rng()*18;
  if(p.role==='police')return;
  if(p.role==='delivery'){const st=s.life.shops[Math.floor(s.rng()*4)];if(C.route(s,p,targetNear(s,p,st.x,st.y,C))){p.deliveryShop=st.id;}return;}
  if(p.role==='thief')return;
  const pick=s.rng();
  if(p.signature&&pick<.82){if(relocate(s,p,C,p.signature))return;stationary(s,p,p.signature,20+s.rng()*58);p.home=p.from;return;}
  if(p.animal){if(relocate(s,p,C,p.signature))return;stationary(s,p,p.signature,12+s.rng()*22);return;}
  if(pick<.30){const available=s.life.shops.filter(st=>venueLoad(s,'queue',st.id)<9).sort((a,b)=>C.densityAt(s,a.x,a.y)-C.densityAt(s,b.x,b.y));const shop=available[Math.floor(s.rng()*Math.min(2,available.length))];if(!shop){relocate(s,p,C);return;}const node=targetNear(s,p,shop.x+28,shop.y+18,C);if(s.graph.nodes[node].component===s.graph.nodes[shop.node].component)send(s,p,'queue',node,shop.id,C);}
  else if(pick<.47){for(const q of s.people){if(q.id!==p.id&&!q.animal&&q.activity==='walk'&&Math.hypot(q.x-p.x,q.y-p.y)<48){startChat(s,p,q);break;}}}
  else if(pick<.61){const available=s.life.fishing.filter(st=>venueLoad(s,'fishing',st.id)<7);const st=available[Math.floor(s.rng()*available.length)];if(!st){relocate(s,p,C);return;}send(s,p,'fishing',targetNear(s,p,st.x+(s.rng()-.5)*60,st.y,C),st.id,C);}
  else if(pick<.76){const st=s.life.music;if(venueLoad(s,'dance',0)+venueLoad(s,'watch',0)>23){relocate(s,p,C);return;}send(s,p,s.rng()<.5?'dance':'watch',targetNear(s,p,st.x+(s.rng()-.5)*90,st.y+25+s.rng()*45,C),0,C);}
  else if(pick<.88){const st=s.life.playground;if(venueLoad(s,'play',0)>14){relocate(s,p,C);return;}send(s,p,'play',targetNear(s,p,st.x+(s.rng()-.5)*100,st.y+40,C),0,C);}
  else{const st=s.life.bench;if(venueLoad(s,'rest',0)>8){relocate(s,p,C);return;}send(s,p,'rest',targetNear(s,p,st.x+(s.rng()-.5)*55,st.y+5,C),0,C);}
 }
 function robbery(s,C){
  const thieves=s.people.filter(p=>p.role==='thief'&&p.activity==='walk');if(!thieves.length)return;
  const thief=thieves[Math.floor(s.rng()*thieves.length)],cops=s.people.filter(p=>p.role==='police'&&p.activity==='police'&&s.graph.nodes[p.from].component===s.graph.nodes[thief.from].component);if(!cops.length)return;cops.sort((a,b)=>Math.hypot(a.x-thief.x,a.y-thief.y)-Math.hypot(b.x-thief.x,b.y-thief.y));const cop=cops[0];
  thief.activity='flee';thief.inventory='loot';cop.activity='pursue';cop.partner=thief.id;randomGoal(s,thief,C,300);C.route(s,cop,thief.to);bubble(s,thief,'！',3);bubble(s,cop,'まてー！',4);s.life.crime={thief:thief.id,cop:cop.id,next:s.elapsed+1,started:s.elapsed};log(s,'バッグがない！ 警察がドロボーを追いかけています。','police');
 }
 function updateRides(s,dt,C){
  for(const ride of s.life.rides){
   if(ride.kind==='tram'){if(s.elapsed>=ride.departAt){C.walk(s,ride.driver,dt);if(ride.driver.arrived){ride.stopIndex=1-ride.stopIndex;ride.departAt=s.elapsed+5;C.route(s,ride.driver,ride.stops[ride.stopIndex]);ride.swapAt=s.elapsed+1;}}ride.x=ride.driver.x;ride.y=ride.driver.y;}
   if(ride.kind==='cup'){ride.x=ride.centerX+Math.cos(s.elapsed*.7)*16;ride.y=ride.centerY+Math.sin(s.elapsed*.7)*7;}
   if(ride.kind==='boat'){ride.x=ride.centerX+Math.sin(s.elapsed*.14)*26;ride.y=ride.centerY+Math.cos(s.elapsed*.14)*7;}
   if(s.elapsed>ride.swapAt){ride.swapAt=s.elapsed+(ride.kind==='tram'?999:28);const ids=[...ride.passengers];ride.passengers=[];for(const id of ids){const p=s.people[id];C.place(s,p,C.nearest(s,ride.x,ride.y,s.graph.largest));free(s,p,15);bubble(s,p,'たのしかった！',2);}
    const candidates=s.people.filter(p=>p.activity==='walk'&&s.graph.nodes[p.from].component===s.graph.largest&&Math.hypot(p.x-ride.x,p.y-ride.y)<100).slice(0,ride.kind==='tram'?4:2);
    for(const p of candidates){p.separationX=0;p.separationY=0;p.activity='ride';p.rideId=ride.id;p.seat=ride.passengers.length;ride.passengers.push(p.id);s.life.stats.boardings++;}
   }
   for(const id of ride.passengers){const p=s.people[id];p.x=ride.x+(p.seat-(ride.passengers.length-1)/2)*31;p.y=ride.y-(ride.kind==='tram'?18:15);p.phase=(p.phase+dt*.25)%1;p.facing=ride.kind==='tram'?ride.driver.facing:Math.cos(s.elapsed*.7)>0?1:-1;}
  }
 }
 function naturalWalk(s,p,dt,mult,C){
  const urgent=['pursue','flee','tag','delivery'].includes(p.activity);
  if(!urgent&&s.elapsed>=p.motionAt){
   p.motionAt=s.elapsed+3+s.rng()*13;
   if(s.rng()<.42){p.pauseUntil=s.elapsed+.7+s.rng()*5.5;p.gesturingUntil=p.pauseUntil;}
   p.destinationPace=[.35+s.rng()*.45,1.1+s.rng()*.95,.65+s.rng()*.8,.45+s.rng()*.95,.2+s.rng()*1.1][p.temperament];
   if(p.activity==='walk'&&!p.path&&p.temperament===2&&s.rng()<.55){
    if(p.returning){C.route(s,p,p.home);}else randomGoal(s,p,C,45+s.rng()*100);p.returning=!p.returning;
   }
  }
  const desired=!urgent&&s.elapsed<p.pauseUntil?0:urgent?1:p.destinationPace;
  p.pace+=(desired-p.pace)*Math.min(1,dt*(desired===0?5:1.8));
  if(p.pace<.025){p.phase=(p.phase+dt*.2)%1;return;}
  C.walk(s,p,dt,mult*p.pace);
 }
 function update(s,dt,C){
  const l=s.life;Space.before(s,C);
  if(s.elapsed>=l.crowd.next)updateCrowd(s,C);
  for(const shop of l.shops){
   shop.queue=shop.queue.filter(id=>['queue','shopping'].includes(s.people[id].activity));
   if(shop.serving===null&&shop.queue.length){const p=s.people[shop.queue[0]];shop.serving=p.id;stationary(s,p,'shopping',3+s.rng()*3);bubble(s,p,'これください',2);bubble(s,s.people[shop.vendor],'どうぞ！',2);}
   if(shop.serving!==null){const p=s.people[shop.serving];if(s.elapsed>=p.until){p.inventory='bag';bubble(s,p,'ありがとう',2);shop.queue.shift();shop.serving=null;l.stats.purchases++;free(s,p,8);p.snackAt=s.elapsed+4;if(l.stats.purchases%8===1)log(s,'お買い物のあとには、ちょっとおやつ。','shop');}}
  }
  for(const p of s.people){

   if(['walk','police','delivery','going','tag','flee','pursue','skate'].includes(p.activity)){
    const mult=p.activity==='delivery'?1.8:p.activity==='flee'?1.8:p.activity==='pursue'?2.5:p.activity==='tag'?1.9:1;naturalWalk(s,p,dt,mult,C);
    if(p.activity==='going'&&p.arrived)arrive(s,p,C);
    else if(p.activity==='delivery'&&p.arrived){p.goal=-1;p.path=null;p.arrived=false;bubble(s,p,'お届けです！',2.5);l.stats.deliveries++;p.nextThink=s.elapsed+4;}
    else if(p.activity==='skate'&&s.elapsed>=p.until){free(s,p,3);}
    else if(['walk','police'].includes(p.activity)&&p.arrived){p.goal=-1;p.path=null;p.arrived=false;}
    if(p.snackAt&&s.elapsed>=p.snackAt&&p.activity==='walk'){p.snackAt=0;stationary(s,p,'eat',8+s.rng()*6);bubble(s,p,'おいしい♪',2);}
   }else if(p.activity!=='ride'){
    const tempo=['juggle','dance','basketball','drum','skip','clap','flap','hop','football'].includes(p.activity)?1.1:['read','sleep','knit','sketch','tea'].includes(p.activity)?.24:.52;p.phase=(p.phase+dt*tempo*p.personalTempo)%1;
    if(p.activity==='fishing'&&s.elapsed>p.catchAt){p.catchAt=s.elapsed+8+s.rng()*10;p.fishUntil=s.elapsed+2;p.inventory='fish';bubble(s,p,'釣れた！',2);l.stats.fish++;if(l.stats.fish%10===1)log(s,'水辺で、きらっとお魚が跳ねました。','fish');}
    if(!['vendor','music','shopping','queue','caught'].includes(p.activity)&&s.elapsed>=p.until){if(!relocate(s,p,C,p.signature||'rest'))free(s,p,p.signature?2:6);}
    if(p.activity==='caught'&&s.elapsed>=p.until)free(s,p,18);
   }
  }
  if(s.elapsed>=l.nextDecision){l.nextDecision=s.elapsed+.4;for(let k=0;k<60;k++){const p=s.people[l.decisionCursor++%s.people.length];decide(s,p,C);}updateCounts(s);}
  for(const g of l.tagGames){const a=s.people[g.chaser],b=s.people[g.chaser===g.a?g.b:g.a];if(s.elapsed>=g.next){g.next=s.elapsed+1;C.route(s,a,b.to);if(b.arrived||!b.path)randomGoal(s,b,C,130);}
   if(s.elapsed>g.cooldown&&Math.hypot(a.x-b.x,a.y-b.y)<22){g.chaser=b.id;g.cooldown=s.elapsed+4;l.stats.tags++;bubble(s,a,'タッチ！',2);bubble(s,b,'こんどはぼく！',2);randomGoal(s,a,C,160);}}
  if(!l.crime&&s.elapsed>=l.nextRobbery){l.nextRobbery=s.elapsed+35;robbery(s,C);}
  if(l.crime){const event=l.crime,thief=s.people[event.thief],cop=s.people[event.cop];if(s.elapsed>=event.next){event.next=s.elapsed+1;C.route(s,cop,thief.to);if(thief.arrived||!thief.path)randomGoal(s,thief,C,250);}
   if(Math.hypot(cop.x-thief.x,cop.y-thief.y)<24){stationary(s,thief,'caught',5);thief.inventory=null;stationary(s,cop,'caught',5);bubble(s,thief,'ごめんなさい',4);bubble(s,cop,'みつけた！',4);l.stats.arrests++;log(s,'ドロボーをつかまえた！ バッグは持ち主のもとへ。','police');l.crime=null;l.nextRobbery=s.elapsed+22;}
   else if(s.elapsed-event.started>35){free(s,cop,4);free(s,thief,10);l.crime=null;l.nextRobbery=s.elapsed+8;log(s,'警察は見回りを続けています。','police');}}
  if(s.elapsed>=l.nextParty){l.nextParty=s.elapsed+32;log(s,'広場で小さな演奏会。手拍子が聞こえてきます。','music');for(const p of s.people)if(p.activity==='dance'||p.activity==='watch')bubble(s,p,'♪',3);}
  updateRides(s,dt,C);Space.after(s,dt,C);
 }
 return{setup,update,NAMES};
});
