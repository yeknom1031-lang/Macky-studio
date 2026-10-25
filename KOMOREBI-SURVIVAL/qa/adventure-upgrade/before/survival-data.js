/* EMBERBOUND game rules. Independent of rendering, shared by the game and QA. */
(function(root){
'use strict';
const items={};
function item(id,name,icon,price=0,extra={}){items[id]={id,name,icon,price,...extra};}
item('wood','木材','🪵',3);item('stone','石','🪨',3);item('fiber','植物の繊維','🌿',4);item('ore','鉄鉱石','⛏',12);item('crystal','青い結晶','💎',25);item('resin','樹脂','🟠',9);item('hide','獣の毛皮','🐾',15);item('fang','鋭い牙','🦷',18);item('shell','硬い甲殻','🐚',20);item('spore','発光胞子','🍄',23);item('wing','風の羽根','🪶',30);item('ember','古代の火種','🔥',60);item('berry','野いちご','🍒',3,{heal:18});item('meal','旅人の保存食','🍲',25,{heal:65});item('fuel','濃縮ジェット燃料','🧪',24);item('arrow','矢','➶',2);item('bomb','炸裂爆弾','💣',35,{weapon:true,damage:65,range:22,cooldown:1.1,kind:'bomb'});
item('hammer','作業ハンマー','🔨',0,{weapon:true,damage:14,range:3.6,cooldown:.7,kind:'hammer'});
item('sword','鉄の剣','⚔',70,{weapon:true,damage:25,range:4.2,cooldown:.4,kind:'sword'});
item('spear','狩人の槍','🔱',65,{weapon:true,damage:23,range:6.5,cooldown:.6,kind:'spear'});
item('axe','岩砕きの大斧','🪓',100,{weapon:true,damage:42,range:4.5,cooldown:.95,kind:'axe'});
item('daggers','疾風の双剣','✦',100,{weapon:true,damage:15,range:3.5,cooldown:.19,kind:'daggers'});
item('bow','木霊の弓','🏹',85,{weapon:true,damage:30,range:65,cooldown:.7,kind:'bow'});
item('staff','結晶の杖','🪄',130,{weapon:true,damage:28,range:45,cooldown:.85,kind:'staff'});
item('boomerang','風切りブーメラン','◈',100,{weapon:true,damage:23,range:25,cooldown:1.1,kind:'boomerang'});
item('gravity','重力の手袋','🧤',210,{weapon:true,damage:48,range:22,cooldown:1.5,kind:'gravity'});
item('stormblade','封石の嵐剣','⚡',250,{weapon:true,damage:55,range:5,cooldown:.45,kind:'stormblade'});
item('shield','鉄木の盾','🛡',80,{shield:true});item('jetpack','真鍮のジェットパック','🚀',200,{back:true});
item('campfire','焚き火','🔥',0,{structure:true});item('house','旅人の家','⌂',0,{structure:true});item('chest','収納箱','▣',0,{structure:true});
const biomes=[{id:'forest',name:'木霊の森',color:'#87ab70',ink:'#c3e3a8'}, {id:'desert',name:'琥珀の砂漠',color:'#cca775',ink:'#f6d59a'},{id:'jungle',name:'翡翠の密林',color:'#3d8768',ink:'#88d7a7'},{id:'cave',name:'晶窟',color:'#626080',ink:'#b9a4fb'},{id:'snow',name:'霜の荒野',color:'#bfd5d7',ink:'#d2f4fa'},{id:'sky',name:'浮島の回廊',color:'#8eaaaa',ink:'#a5edee'}];
const bosses=[
{id:'bark',name:'森の番人・グロウル',biome:'forest',x:-99,z:12,hp:320,color:'#8ba45b',kind:'brute',stone:'seal-forest',drop:'hide'},
{id:'dune',name:'砂の女王・サラカ',biome:'desert',x:108,z:12,hp:380,color:'#dba45d',kind:'crawler',stone:'seal-desert',drop:'shell'},
{id:'bloom',name:'密林の主・ネペラ',biome:'jungle',x:-8,z:118,hp:420,color:'#bf78c3',kind:'spitter',stone:'seal-jungle',drop:'spore'},
{id:'geode',name:'晶窟の巨人・ジオド',biome:'cave',x:-100,z:-103,hp:480,color:'#9a96ed',kind:'golem',stone:'seal-cave',drop:'crystal'},
{id:'zephyr',name:'天空の翼・ゼフィル',biome:'sky',x:62,z:-105,hp:450,color:'#8ce4e0',kind:'flyer',stone:'seal-sky',drop:'wing'}];
if(root.EmberTerrain){for(const b of bosses){const site=root.EmberTerrain.sites[b.biome];b.x=site.x;b.z=site.z;b.y=b.biome==='sky'?site.y:b.biome==='cave'?root.EmberTerrain.caveY:root.EmberTerrain.ground(b.x,b.z);}}
for(const b of bosses)item(b.stone,biomes.find(v=>v.id===b.biome).name+'の封石','◆',0,{key:true,color:b.color});
item('heart','終焉の心石','✺',0,{key:true});
const recipes=[];
function recipe(id,cost,time,count=1){recipes.push({id,cost,time,count});}
recipe('hammer',{wood:2,stone:2},4);recipe('sword',{wood:3,ore:5},12);recipe('spear',{wood:5,stone:4,fiber:2},9);recipe('axe',{wood:5,ore:7},16);recipe('daggers',{ore:6,fang:3},13);recipe('bow',{wood:6,fiber:6},12);recipe('arrow',{wood:1,stone:1},3,8);recipe('staff',{wood:4,crystal:6,spore:2},20);recipe('boomerang',{wood:5,wing:2},12);recipe('bomb',{stone:2,resin:2,ore:1},6,3);recipe('gravity',{ore:8,crystal:10,wing:4},25);recipe('stormblade',{ore:10,ember:2,wing:3},30);recipe('shield',{wood:6,ore:4,hide:2},15);recipe('jetpack',{ore:12,crystal:6,hide:4},35);recipe('fuel',{resin:2,spore:1},5,2);recipe('meal',{berry:4,fiber:1},4,2);recipe('campfire',{wood:6,stone:4},12);recipe('chest',{wood:10,ore:2},25);recipe('house',{wood:40,stone:24,fiber:16},120);
const names={forest:['苔スライム','森の牙獣','樹皮の衛兵','針葉の射手'],desert:['砂潜り','琥珀サソリ','砂岩のゴーレム','砂煙の蛾'],jungle:['胞子キノコ','つるの狩人','翡翠の甲虫','毒花の精'],cave:['晶窟コウモリ','盲目の這い虫','結晶ゴーレム','深淵の目'],snow:['霜オオカミ','氷のスライム','氷晶の衛兵','雪風の精'],sky:['風のエイ','空殻の番人','雷のクラゲ','雲の射手']};
const kinds={forest:['slime','beast','golem','spitter'],desert:['burrow','crawler','golem','flyer'],jungle:['slime','beast','crawler','spitter'],cave:['flyer','crawler','golem','spitter'],snow:['beast','slime','golem','flyer'],sky:['flyer','golem','slime','spitter']};
const drops={forest:['resin','hide','wood','fang'],desert:['shell','fang','ore','resin'],jungle:['spore','hide','shell','spore'],cave:['wing','fang','crystal','spore'],snow:['hide','crystal','ore','wing'],sky:['wing','ore','crystal','wing']};
const enemies=Object.entries(names).flatMap(([biome,ns])=>ns.map((name,i)=>({id:biome+i,name,biome,kind:kinds[biome][i],drop:drops[biome][i],hp:40+i*12,damage:7+i*2,speed:2.2+(i%2)*1.3,color:biomes.find(b=>b.id===biome).color})));
function canPay(bag,cost){return Object.entries(cost).every(([k,n])=>(bag[k]||0)>=n);}
function pay(bag,cost){if(!canPay(bag,cost))return false;for(const[k,n]of Object.entries(cost)){bag[k]-=n;if(!bag[k])delete bag[k];}return true;}
function add(bag,id,n=1){if(!items[id]||!Number.isInteger(n)||n<=0)return;bag[id]=(bag[id]||0)+n;}
function fresh(){return{version:1,terrainVersion:2,worldTime:259.2,dayLength:720,automaticTime:true,weatherMode:'auto',time:0,x:0,z:24,y:root.EmberTerrain?root.EmberTerrain.floor(0,24,0):0,yaw:.15,pitch:-.1,hp:100,stamina:100,money:0,fuel:0,hand:null,back:null,shield:false,inventory:{},inserted:[],bosses:[],cleared:false,finalAwake:false,checkpoint:null,structures:[],piles:[],jobs:[],bags:[],depleted:{},enemyStates:{},nextId:1};}
function validSave(s){
 const num=(v,min=0,max=1e9)=>Number.isFinite(v)&&v>=min&&v<=max;
 const bag=b=>!!b&&typeof b==='object'&&!Array.isArray(b)&&Object.entries(b).every(([id,n])=>items[id]&&Number.isInteger(n)&&num(n,0,1e6));
 const point=p=>p&&num(p.x,-100000,100000)&&num(p.z,-100000,100000)&&num(p.y,-2000,10000);
 const id=v=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,60}$/.test(v);
 if(!s||s.version!==1||!point(s)||!num(s.time)||!num(s.hp,0,100)||!num(s.stamina,0,100)||!num(s.fuel,0,100)||!num(s.money)||!num(s.yaw,-1e9,1e9)||!num(s.pitch,-1.31,1.31)||!bag(s.inventory)||(s.hand!==null&&(!items[s.hand]||!s.inventory[s.hand]))||s.back!==null&&s.back!=='jetpack'||typeof s.shield!=='boolean'||!Number.isInteger(s.nextId)||!num(s.nextId,1))return false;
 if(!['cleared','finalAwake'].every(k=>typeof s[k]==='boolean')||!['inserted','bosses','structures','piles','jobs','bags'].every(k=>Array.isArray(s[k])&&s[k].length<=1000))return false;
 if(s.inserted.some(k=>!bosses.some(b=>b.stone===k))||new Set(s.inserted).size!==s.inserted.length||s.bosses.some(k=>!bosses.some(b=>b.id===k))||new Set(s.bosses).size!==s.bosses.length)return false;
 if(s.checkpoint!==null&&(!point(s.checkpoint)||!id(s.checkpoint.id)))return false;
 if(!s.structures.every(v=>point(v)&&id(v.id)&&items[v.type]?.structure&&num(v.progress,0,1)&&typeof v.lit==='boolean'&&bag(v.items)))return false;
 if(!s.piles.every(v=>point(v)&&id(v.id)&&bag(v.items))||!s.bags.every(v=>point(v)&&id(v.id)&&bag(v.items)&&(v.gold===undefined||num(v.gold))))return false;
 if(!s.jobs.every(v=>point(v)&&id(v.id)&&recipes.some(r=>r.id===v.type&&r.time===v.time&&r.count===v.count)&&num(v.progress,0,1)))return false;
 if(!s.depleted||typeof s.depleted!=='object'||!Object.entries(s.depleted).every(([k,v])=>id(k)&&num(v)))return false;
 return !!s.enemyStates&&typeof s.enemyStates==='object'&&Object.entries(s.enemyStates).every(([k,v])=>id(k)&&v&&num(v.hp,0,10000)&&num(v.deadUntil));
}
const resourceRules={
 wood:{place:'木の根元・倒木',action:'枝を拾う',hint:'木の根元に落ちた枝や、倒木から木材を集めます。'},
 stone:{place:'岩場・川岸・洞窟の岩くず',action:'石片を拾う',hint:'露出した岩の周囲や川岸にある、平たい石片を拾えます。'},
 fiber:{place:'草むら・水辺の植物',action:'繊維を採る',hint:'細長い葉の草むらから採取します。'},
 berry:{place:'森の縁の実のなる低木',action:'実を摘む',hint:'低木の枝についた赤い実を摘みます。'},
 resin:{place:'森の木の幹',action:'樹脂を採る',hint:'木の幹に付いた琥珀色の樹液から採取します。'},
 ore:{place:'山の岩場・砂漠の露岩・洞窟の鉱脈',action:'鉱脈を掘る',hint:'岩に埋まった茶色い鉄の筋が目印。ハンマーで採掘します。'},
 crystal:{place:'洞窟の結晶群',action:'結晶を掘る',hint:'洞窟の壁際から伸びる青い結晶をハンマーで採掘します。'},
 spore:{place:'洞窟・密林の湿った倒木',action:'胞子を採る',hint:'日陰の倒木や洞窟の壁際に生えるキノコから集めます。'}
};
const api={items,recipes,biomes,bosses,enemies,resourceRules,canPay,pay,add,fresh,validSave};if(typeof module!=='undefined')module.exports=api;root.SurvivalData=api;
})(typeof window!=='undefined'?window:globalThis);
