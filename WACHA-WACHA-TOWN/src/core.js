(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WachaCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const WIDTH=1672,HEIGHT=941,COUNT=600,TYPES=320,FRAMES=15,LIMIT=180;
  const STAGES = [
    { id: 0, name: 'はじまりのお祭り', en: 'FESTIVAL TOWN', image: '01-festival', color: '#ed795f', note: '屋台と水路をめぐる、にぎやかな街。' },
    { id: 1, name: '花咲くガーデン', en: 'BLOOMING GARDEN', image: '02-garden', color: '#77a58b', note: '花のアーチの向こうへ、てくてく。' },
    { id: 2, name: '海辺のマルシェ', en: 'SEASIDE MARKET', image: '03-seaside', color: '#50a6b9', note: '潮風が通る、港の小さな市場。' },
    { id: 3, name: 'お菓子の広場', en: 'SWEET LITTLE TOWN', image: '04-sweets', color: '#d98daa', note: '甘い香りに、ついつい寄り道。' },
    { id: 4, name: '秋色の古本市', en: 'AUTUMN BOOK FAIR', image: '05-autumn', color: '#bc845b', note: 'お気に入りの一冊を探す人たち。' },
    { id: 5, name: '雪のマーケット', en: 'SNOWY MARKET', image: '06-snow', color: '#8daec9', note: 'あたたかな灯りと、白い屋根。' },
    { id: 6, name: '星灯りのお祭り', en: 'LANTERN NIGHT', image: '07-lantern', color: '#7777aa', note: '最後の一人は、星灯りの下で。' }
  ];

 const CHARACTERS=['リーフ','ココ','ソラじい','モコ','マリン','アン','シェフ','スミレ','ハナばあ','ポポ','おまわりさん','ドロボー','つり名人','パン屋さん','うたう旅人','ちびザウルス'];
 const COLORS=['オリジナル','いちご','みかん','レモン','ライム','若葉','ミント','ひすい','アクア','空色','サファイア','すみれ','ラベンダー','ぶどう','ローズ','さくら','サンゴ','キャラメル','セージ','あじさい'];
 let navigation=null,graphs=[],lifeEngine=null;
 function setNavigation(data){navigation=data;graphs=[];}
 function installLife(engine){lifeEngine=engine;}
 function random(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function typeInfo(type){return{base:Math.floor(type/20),palette:type%20,name:CHARACTERS[Math.floor(type/20)],color:COLORS[type%20]};}
 function graphFor(stage){
  if(graphs[stage])return graphs[stage];if(!navigation)throw Error('Navigation data has not been installed');
  const nodes=navigation[stage].map(([x,y,links])=>({x,y,links,component:-1})),components=[];
  for(let i=0;i<nodes.length;i++)if(nodes[i].component<0){const cid=components.length,queue=[i];nodes[i].component=cid;for(let k=0;k<queue.length;k++)for(const n of nodes[queue[k]].links)if(nodes[n].component<0){nodes[n].component=cid;queue.push(n);}components.push(queue);}
  return graphs[stage]={nodes,components,largest:components.reduce((a,c,i)=>c.length>components[a].length?i:a,0),parent:new Int32Array(nodes.length),queue:new Int32Array(nodes.length)};
 }
 function nearest(s,x,y,component=-1){let best=Infinity,result=0;for(let i=0;i<s.graph.nodes.length;i++){const n=s.graph.nodes[i];if(component>=0&&n.component!==component)continue;const d=(n.x-x)**2+(n.y-y)**2;if(d<best){best=d;result=i;}}return result;}
 function place(s,p,node){const n=s.graph.nodes[node];p.from=node;p.to=n.links[0];p.t=0;p.x=n.x;p.y=n.y;p.path=null;p.goal=-1;p.arrived=false;p.lane=0;}
 function route(s,p,target){
  const g=s.graph,start=p.to;if(g.nodes[start].component!==g.nodes[target].component)return false;
  const parents=g.parent,q=g.queue;parents.fill(-1);parents[start]=start;let head=0,tail=1;q[0]=start;
  while(head<tail&&parents[target]<0){const id=q[head++];for(const n of g.nodes[id].links)if(parents[n]<0){parents[n]=id;q[tail++]=n;}}
  if(parents[target]<0)return false;const path=[];let n=target;while(n!==start){path.push(n);n=parents[n];}path.reverse();p.path=path;p.pathIndex=0;p.goal=target;p.arrived=false;return true;
 }
 function position(p,g){const a=g.nodes[p.from],b=g.nodes[p.to],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);p.x=a.x+dx*p.t-dy/len*p.lane;p.y=a.y+dy*p.t+dx/len*p.lane;if(Math.abs(dx)>1)p.facing=dx<0?-1:1;}
 function walk(s,p,dt,multiplier=1){
  let distance=p.speed*dt*multiplier;
  if(p.goal===p.from&&p.t===0){p.arrived=true;return;}
  while(distance>0){
   const a=s.graph.nodes[p.from],b=s.graph.nodes[p.to],length=Math.hypot(b.x-a.x,b.y-a.y),left=(1-p.t)*length;
   if(distance<left){p.t+=distance/length;break;}distance-=left;const old=p.from;p.from=p.to;p.t=0;
   if(p.from===p.goal){p.to=b.links[0];p.path=null;p.arrived=true;break;}
   if(p.path&&p.pathIndex<p.path.length){p.to=p.path[p.pathIndex++];continue;}
   const choices=b.links;let candidate=choices[Math.floor(s.rng()*choices.length)];
   if(choices.length>1&&s.rng()<.9){const vx=b.x-a.x,vy=b.y-a.y;let best=-2;for(const next of choices){if(next===old)continue;const n=s.graph.nodes[next],nx=n.x-b.x,ny=n.y-b.y;const dot=(vx*nx+vy*ny)/length/Math.hypot(nx,ny);if(dot>best){best=dot;candidate=next;}}}
   p.to=candidate;
  }
  p.phase=(p.phase+dt*(p.speed*multiplier/31)/.9)%1;position(p,s.graph);
 }
 function create(stage=0,seed=Date.now()){
  const rng=random(seed),graph=graphFor(stage),targetType=Math.floor(rng()*TYPES),types=Array.from({length:TYPES},(_,i)=>i);
  while(types.length<COUNT){let type=Math.floor(rng()*(TYPES-1));if(type>=targetType)type++;types.push(type);}
  for(let i=types.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[types[i],types[j]]=[types[j],types[i]];}
  const people=types.map((type,id)=>{const from=Math.floor(rng()*graph.nodes.length),n=graph.nodes[from],to=n.links[Math.floor(rng()*n.links.length)];const p={id,type,from,to,t:rng(),lane:(rng()-.5)*2,speed:19+rng()*22,phase:rng(),facing:1,x:0,y:0,activity:'walk',until:0,path:null,goal:-1,arrived:false,partner:-1,role:'resident',inventory:null,bubble:null,bubbleUntil:0};position(p,graph);return p;});
  const s={stage,seed,graph,rng,people,targetType,targetId:people.find(p=>p.type===targetType).id,remaining:LIMIT,elapsed:0,status:'ready',mistakes:0,hints:1,hint:null,lastHit:null};if(lifeEngine)lifeEngine.setup(s,api);return s;
 }
 function start(s){if(s.status==='ready'||s.status==='paused')s.status='playing';}
 function pause(s){if(s.status==='playing')s.status='paused';}
 function step(s,dt){
  if(s.status!=='playing'||!Number.isFinite(dt)||dt<=0)return;let todo=Math.min(dt,s.remaining);
  while(todo>1e-8){const chunk=Math.min(todo,.25);todo-=chunk;s.remaining=Math.max(0,s.remaining-chunk);s.elapsed+=chunk;if(lifeEngine&&s.life)lifeEngine.update(s,chunk,api);else for(const p of s.people)walk(s,p,chunk);}
  if(s.hint&&s.elapsed>s.hint.until)s.hint=null;if(s.remaining<1e-7){s.remaining=0;s.status='lost';}
 }
 function touch(s,id){if(s.status!=='playing'||!s.people[id])return false;s.lastHit={id,at:s.elapsed};if(id===s.targetId){s.status='won';return true;}s.mistakes++;s.remaining=Math.max(0,s.remaining-3);if(!s.remaining)s.status='lost';return false;}
 function hint(s){if(s.status!=='playing'||!s.hints)return false;s.hints--;s.remaining=Math.max(0,s.remaining-10);const p=s.people[s.targetId];s.hint={x:p.x,y:p.y,until:s.elapsed+5};if(!s.remaining)s.status='lost';return true;}
 const api={WIDTH,HEIGHT,COUNT,TYPES,FRAMES,LIMIT,STAGES,CHARACTERS,COLORS,random,typeInfo,graphFor,setNavigation,installLife,nearest,place,route,walk,create,start,pause,step,touch,hint};return api;
});
