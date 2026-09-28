(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WachaCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const WIDTH=1672,HEIGHT=941,COUNT=600,TYPES=320,PALETTES=4,FRAMES=15,LIMIT=180;
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
 const PROFILES=[{"name":"杖のおじいちゃん","action":"cane","height":0.9,"animal":false,"source":"people-a","row":0},{"name":"編み物のおばあちゃん","action":"knit","height":0.84,"animal":false,"source":"people-a","row":1},{"name":"玉乗りピエロ","action":"juggle","height":0.99,"animal":false,"source":"people-a","row":2},{"name":"カメラの青年","action":"photo","height":1.12,"animal":false,"source":"people-a","row":3},{"name":"体操のお姉さん","action":"stretch","height":1.04,"animal":false,"source":"people-a","row":4},{"name":"バスケのお兄さん","action":"basketball","height":1.24,"animal":false,"source":"people-a","row":5},{"name":"レインボーのダンサー","action":"dance","height":1.02,"animal":false,"source":"people-a","row":6},{"name":"本好きの人","action":"read","height":1.05,"animal":false,"source":"people-a","row":7},{"name":"柴犬","action":"sniff","height":0.65,"animal":true,"source":"animals","row":0},{"name":"ダックス","action":"fetch","height":0.48,"animal":true,"source":"animals","row":1},{"name":"ふわふわプードル","action":"roll","height":0.7,"animal":true,"source":"animals","row":2},{"name":"大きな牧羊犬","action":"shake","height":0.82,"animal":true,"source":"animals","row":3},{"name":"三毛猫","action":"groom","height":0.5,"animal":true,"source":"animals","row":4},{"name":"黒ねこ","action":"pounce","height":0.51,"animal":true,"source":"animals","row":5},{"name":"ふとっちょ茶トラ","action":"sleep","height":0.6,"animal":true,"source":"animals","row":6},{"name":"ふわふわ白ねこ","action":"groom","height":0.63,"animal":true,"source":"animals","row":7},{"name":"パン職人","action":"bake","height":1.07,"animal":false,"source":"workers","row":0},{"name":"大工さん","action":"hammer","height":1.1,"animal":false,"source":"workers","row":1},{"name":"庭師さん","action":"water","height":0.96,"animal":false,"source":"workers","row":2},{"name":"ペンキ屋さん","action":"paint","height":1.02,"animal":false,"source":"workers","row":3},{"name":"清掃員さん","action":"sweep","height":0.98,"animal":false,"source":"workers","row":4},{"name":"画家さん","action":"easel","height":1.12,"animal":false,"source":"workers","row":5},{"name":"陶芸家さん","action":"pottery","height":1,"animal":false,"source":"workers","row":6},{"name":"花屋さん","action":"flowers","height":0.92,"animal":false,"source":"workers","row":7},{"name":"太鼓のおじさん","action":"drum","height":1.08,"animal":false,"source":"festival","row":0},{"name":"バイオリンの人","action":"violin","height":1.14,"animal":false,"source":"festival","row":1},{"name":"アコーディオン奏者","action":"accordion","height":0.91,"animal":false,"source":"festival","row":2},{"name":"大道芸人","action":"juggle","height":1.14,"animal":false,"source":"festival","row":3},{"name":"風船屋さん","action":"balloon","height":1.01,"animal":false,"source":"festival","row":4},{"name":"シャボン玉の子","action":"bubbles","height":0.73,"animal":false,"source":"festival","row":5},{"name":"パントマイムの人","action":"mime","height":1.19,"animal":false,"source":"festival","row":6},{"name":"リボンの踊り子","action":"ribbon","height":1.05,"animal":false,"source":"festival","row":7},{"name":"ヨガの人","action":"yoga","height":1.03,"animal":false,"source":"sports","row":0},{"name":"フラフープの人","action":"hoop","height":0.98,"animal":false,"source":"sports","row":1},{"name":"スケーター","action":"skate","height":0.94,"animal":false,"source":"sports","row":2},{"name":"なわとびの子","action":"skip","height":0.7,"animal":false,"source":"sports","row":3},{"name":"ダンベルのおじさん","action":"weights","height":1.21,"animal":false,"source":"sports","row":4},{"name":"空手家","action":"karate","height":1.09,"animal":false,"source":"sports","row":5},{"name":"サッカー少年","action":"football","height":0.75,"animal":false,"source":"sports","row":6},{"name":"バレリーナ","action":"ballet","height":1.13,"animal":false,"source":"sports","row":7},{"name":"和服のおばあちゃん","action":"fan","height":0.9,"animal":false,"source":"neighbors","row":0},{"name":"サリーの女性","action":"tea","height":1.12,"animal":false,"source":"neighbors","row":1},{"name":"ターバンのおじさん","action":"read","height":1.19,"animal":false,"source":"neighbors","row":2},{"name":"車いすの画家","action":"sketch","height":0.83,"animal":false,"source":"neighbors","row":3},{"name":"補聴器の女の子","action":"clap","height":0.71,"animal":false,"source":"neighbors","row":4},{"name":"ひげの紳士","action":"tea","height":1.1,"animal":false,"source":"neighbors","row":5},{"name":"スーツの女性","action":"phone","height":1.16,"animal":false,"source":"neighbors","row":6},{"name":"パンクのお姉さん","action":"guitar","height":1.03,"animal":false,"source":"neighbors","row":7},{"name":"赤ちゃんとパパ","action":"cradle","height":1.14,"animal":false,"source":"families","row":0},{"name":"赤ちゃんとママ","action":"cradle","height":1.04,"animal":false,"source":"families","row":1},{"name":"双子のお姉ちゃん","action":"clap","height":0.78,"animal":false,"source":"families","row":2},{"name":"ぬいぐるみの子","action":"hug","height":0.68,"animal":false,"source":"families","row":3},{"name":"大きなリュックの人","action":"map","height":1.1,"animal":false,"source":"families","row":4},{"name":"おしゃれな紳士","action":"photo","height":1.2,"animal":false,"source":"families","row":5},{"name":"レインボーの女性","action":"dance","height":1.08,"animal":false,"source":"families","row":6},{"name":"日傘のおばさん","action":"fan","height":1.02,"animal":false,"source":"families","row":7},{"name":"宇宙飛行士","action":"float","height":1.06,"animal":false,"source":"costumes","row":0},{"name":"小さな魔女","action":"magic","height":0.88,"animal":false,"source":"costumes","row":1},{"name":"大きなロボット","action":"robot","height":1.26,"animal":false,"source":"costumes","row":2},{"name":"カエルの人","action":"hop","height":0.91,"animal":false,"source":"costumes","row":3},{"name":"ペンギンの人","action":"waddle","height":0.86,"animal":false,"source":"costumes","row":4},{"name":"ドラゴンの人","action":"flap","height":1.04,"animal":false,"source":"costumes","row":5},{"name":"探偵さん","action":"inspect","height":1.13,"animal":false,"source":"costumes","row":6},{"name":"海賊のおじいさん","action":"dance","height":1,"animal":false,"source":"costumes","row":7}];
 CHARACTERS.push(...PROFILES.map(p=>p.name));
 const COLORS=['オリジナル','サンゴ','ミント','すみれ'];
 let navigation=null,graphs=[],lifeEngine=null;
 function setNavigation(data){navigation=data;graphs=[];}
 function installLife(engine){lifeEngine=engine;}
 function random(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function typeInfo(type){const base=Math.floor(type/PALETTES),profile=PROFILES[base-16];return{base,palette:type%PALETTES,name:CHARACTERS[base],color:COLORS[type%PALETTES],height:profile?.height||1,animal:profile?.animal||false,action:profile?.action||null};}
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
 function densityAt(s,x,y){const crowd=s.life?.crowd;if(!crowd)return 0;const gx=Math.max(0,Math.min(crowd.cols-1.001,x/80)),gy=Math.max(0,Math.min(crowd.rows-1.001,y/80)),ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy,read=(x,y)=>crowd.field[Math.min(crowd.rows-1,y)*crowd.cols+Math.min(crowd.cols-1,x)];return read(ix,iy)*(1-fx)*(1-fy)+read(ix+1,iy)*fx*(1-fy)+read(ix,iy+1)*(1-fx)*fy+read(ix+1,iy+1)*fx*fy;}
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
   // Prefer an uncrowded continuation, keeping momentum unless there is a meaningful gap.
   if(s.life?.crowd&&p.id>=0&&!p.path&&choices.length>1){let best=-Infinity;for(const next of choices){const n=s.graph.nodes[next],nx=n.x-b.x,ny=n.y-b.y,nlen=Math.hypot(nx,ny),dot=((b.x-a.x)*nx+(b.y-a.y)*ny)/length/nlen;const density=densityAt(s,b.x+nx/nlen*72,b.y+ny/nlen*72);const score=dot*1.8-(next===old?2.2:0)-density*.32+s.rng()*.2;if(score>best){best=score;candidate=next;}}}
   p.to=candidate;
  }
  p.phase=(p.phase+dt*(p.speed*multiplier/31)/.9)%1;position(p,s.graph);
 }
 function create(stage=0,seed=Date.now()){
  const rng=random(seed),graph=graphFor(stage),targetType=Math.floor(rng()*TYPES),types=Array.from({length:TYPES},(_,i)=>i);
  let animals=types.filter(type=>typeInfo(type).animal).length;
  while(types.length<COUNT){let type=Math.floor(rng()*(TYPES-1));if(type>=targetType)type++;if(typeInfo(type).animal){if(animals>=80)continue;animals++;}types.push(type);}
  for(let i=types.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[types[i],types[j]]=[types[j],types[i]];}
  const people=types.map((type,id)=>{const from=Math.floor(rng()*graph.nodes.length),n=graph.nodes[from],to=n.links[Math.floor(rng()*n.links.length)];const p={id,type,from,to,t:rng(),lane:(rng()-.5)*2,speed:7+rng()**1.35*64,phase:rng(),facing:1,x:0,y:0,activity:'walk',until:0,path:null,goal:-1,arrived:false,partner:-1,role:'resident',inventory:null,pace:1,pauseUntil:0,motionAt:2+rng()*15,temperament:Math.floor(rng()*5),gesture:rng(),home:from,returning:false};position(p,graph);return p;});
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
 const api={WIDTH,HEIGHT,COUNT,TYPES,PALETTES,FRAMES,LIMIT,STAGES,CHARACTERS,COLORS,random,typeInfo,graphFor,setNavigation,installLife,nearest,place,route,densityAt,walk,create,start,pause,step,touch,hint};return api;
});
