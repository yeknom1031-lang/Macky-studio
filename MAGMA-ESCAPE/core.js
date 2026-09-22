export const W = 420, H = 760, METER = 64;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const AURAS = [
  { id: 'ember', name: 'エンバー', rarity: 'N', color: '#ffab5c', weight: 40, detail: '小さな火花をまとって。' },
  { id: 'mint', name: 'ウィスプ', rarity: 'R', color: '#79efdd', weight: 25, detail: 'ふわり、風のような光。' },
  { id: 'violet', name: 'ネビュラ', rarity: 'SR', color: '#c198ff', weight: 20, detail: '星雲のきらめきを足元に。' },
  { id: 'ice', name: 'フロスト', rarity: 'SSR', color: '#b6edff', weight: 12, detail: 'マグマの中で輝く氷の輪。' },
  { id: 'phoenix', name: 'フェニックス', rarity: 'LEGENDARY', color: '#ffdb78', weight: 3, detail: '不死鳥の翼が、空を照らす。' },
];
export const FOOD = [
  { id: 'rice', name: 'おにぎり', price: 25, heal: 35, sprite: 1, caption: 'ほっとひと息、冒険の定番。' },
  { id: 'meat', name: 'マグマ肉', price: 60, heal: 100, sprite: 2, caption: 'こんがり焼けた、元気のかたまり。' },
];
export const QUESTIONS = [
  { q:'崩れる足場は、踏んでから何秒で壊れる？', a:['0.5秒', '5秒', 'ずっと壊れない'], correct:0, note:'ひび割れが合図。すぐに次の足場へ！' },
  { q:'おなかが空いたら、どうする？', a:['マグマに近づく', 'ショップでご飯', '何もしない'], correct:1, note:'おにぎりやマグマ肉で空腹を回復できるよ。' },
  { q:'ジェットパックの燃料が回復するのは？', a:['足場に着地したとき', '落下したとき', 'ガチャを引いたとき'], correct:0, note:'足場で少し休むと、また飛べる！' },
  { q:'ガチャのオーラは何が変わる？', a:['ジャンプの高さ', 'マグマの速さ', 'キャラクターの見た目'], correct:2, note:'お気に入りのエフェクトで、自分らしい冒険に。' },
];
export const freshSave = () => ({ version:1, coins:150, best:0, runs:0, speed:0, jet:0, owned:['ember'], equipped:'ember', sound:true, reduced:false, tutorial:false });
export function normalizeSave(raw) {
  const base=freshSave();
  if (!raw || raw.version!==1) return base;
  for (const key of ['coins','best','runs','speed','jet']) if(Number.isFinite(raw[key])) base[key]=Math.floor(clamp(raw[key],0,key==='speed'||key==='jet'?5:1e8));
  base.owned=[...new Set(['ember',...(Array.isArray(raw.owned)?raw.owned:[])].filter(id=>AURAS.some(a=>a.id===id)))];
  if(base.owned.includes(raw.equipped)) base.equipped=raw.equipped;
  for(const key of ['sound','reduced','tutorial']) if(typeof raw[key]==='boolean')base[key]=raw[key];
  return base;
}
export function drawAura(random=Math.random) {
  let roll=clamp(random(),0,0.999999)*100;
  for(const a of AURAS){roll-=a.weight;if(roll<0)return a;}
  return AURAS[0];
}
export function transact(save, cost, update) {
  if(!Number.isFinite(cost)||cost<0||save.coins<cost)return false;
  save.coins-=cost;update?.(save);return true;
}
export function upgradeCost(level){return 100+level*100;}
export function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export class Game {
  constructor({speed=0,jet=0,seed=Date.now(),onEvent=()=>{}}={}) {
    this.onEvent=onEvent;this.random=seeded(seed);this.levels={speed,jet};
    this.player={x:210,y:0,vx:0,vy:0,face:1,ground:0,coyote:0.12};
    this.platforms=[{id:0,x:210,baseX:210,y:0,baseY:0,w:310,type:'normal',phase:0,touched:-1,solid:true,coin:false}];
    this.generated=0;this.lastX=210;this.time=0;this.height=0;this.peak=0;this.camera=0;this.lava=-150;
    this.hunger=100;this.stamina=100;this.fuel=this.maxFuel;this.coins=0;this.alive=true;this.paused=false;this.event=null;
    this.nextShop=15;this.nextQuiz=12;this.nextBattle=22;this.jumpBuffer=0;this.wasJump=false;this.jetting=false;this.particles=[];
    this.generate(18);
  }
  get maxFuel(){return 1.8+this.levels.jet*0.35;}
  generate(to){
    while(this.generated<to){
      const n=++this.generated; const r=this.random(); const w=n<=50?138:n<=100?110:Math.max(76,106-(n-100)*0.12);
      const reach=n<=50?95:105;
      const next=clamp(this.lastX+(this.random()-.5)*reach*2,80,340);this.lastX=next;
      let type='normal';
      if(n>8){const special=n<=50?0.23:0.67;if(r<special)type=['moving','blink','crumble'][Math.floor(this.random()*3)];}
      if(n%5===0)type='normal';
      this.platforms.push({id:n,x:next,baseX:next,y:n*METER,baseY:n*METER,w,type,phase:this.random()*6.28,touched:-1,solid:true,coin:true,vertical:type==='moving'&&n%2===0});
    }
  }
  pause(){this.paused=true;this.wasJump=false;this.jumpBuffer=0;this.jetting=false;}
  resume(){this.paused=false;this.event=null;this.wasJump=false;this.jumpBuffer=0;}
  trigger(type){this.event=type;this.pause();this.onEvent({type});}
  die(){if(!this.alive)return;this.alive=false;this.onEvent({type:'death',height:this.height,coins:this.coins,time:this.time});}
  addCoins(amount){this.coins+=amount;this.onEvent({type:'coins',amount});}
  step(dt,input={}){
    if(!this.alive||this.paused)return;
    dt=Math.min(dt,1/30);this.time+=dt;
    const p=this.player;
    this.hunger=Math.max(0,this.hunger-dt*0.6);
    this.stamina=Math.min(100,this.stamina+dt*(p.ground!==null?26:5)*(this.hunger<20?.5:1));
    this.fuel=Math.min(this.maxFuel,this.fuel+(p.ground!==null?dt*2:0));
    for(const s of this.platforms){
      const ox=s.x,oy=s.y;
      if(s.type==='moving'){
        const wave=Math.sin(this.time*(s.id>100?1.9:1.1)+s.phase);
        if(s.vertical)s.y=s.baseY+wave*9;else s.x=s.baseX+wave*26;
      }
      const period=s.id>100?2.3:3.5;
      s.solid=s.type!=='blink'||((this.time+s.phase)%period)<period*.76;
      if(s.type==='crumble'&&s.touched>=0&&this.time-s.touched>(s.id>100?.36:.5))s.solid=false;
      if(p.ground===s.id){
        if(s.solid){p.x+=s.x-ox;p.y+=s.y-oy;}
        else p.ground=null;
      }
    }
    if(p.ground!==null)p.coyote=.105;else p.coyote=Math.max(0,p.coyote-dt);
    if(input.jump&&!this.wasJump)this.jumpBuffer=.14;
    this.wasJump=!!input.jump;this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
    if(this.jumpBuffer>0&&p.coyote>0){
      p.vy=590;p.ground=null;p.coyote=0;this.jumpBuffer=0;this.stamina=Math.max(0,this.stamina-9);this.onEvent({type:'jump'});
    }
    const direction=(input.right?1:0)-(input.left?1:0);
    const moveSpeed=(205+this.levels.speed*11)*(this.hunger<20?.8:1)*(this.stamina<10?.87:1);
    p.vx+=(direction*moveSpeed-p.vx)*Math.min(1,dt*18);
    if(direction)p.face=direction;
    p.x=clamp(p.x+p.vx*dt,18,W-18);
    this.jetting=!!input.jet&&this.fuel>0;
    if(this.jetting){p.vy=Math.min(345,Math.max(180,p.vy)+dt*950);p.ground=null;p.coyote=0;this.fuel=Math.max(0,this.fuel-dt);}
    const prevY=p.y;
    p.vy-=1450*dt;p.y+=p.vy*dt;
    p.ground=null;
    if(p.vy<=0){
      const possible=this.platforms.filter(s=>s.solid&&prevY>=s.y-.8&&p.y<=s.y&&Math.abs(p.x-s.x)<s.w/2+11).sort((a,b)=>b.y-a.y);
      if(possible.length){const s=possible[0];p.y=s.y;p.vy=0;p.ground=s.id;
        if(s.touched<0){s.touched=this.time;this.onEvent({type:'land',x:p.x,y:p.y});}
      }
    }
    for(const s of this.platforms)if(s.coin&&Math.abs(p.x-s.x)<32&&Math.abs(p.y+25-(s.y+38))<38){s.coin=false;this.addCoins(5);this.onEvent({type:'pickup',x:s.x,y:s.y+38});}
    this.peak=Math.max(this.peak,p.y);this.height=Math.floor(this.peak/METER);
    this.camera=Math.max(this.camera,p.y-300);
    if(this.time>4)this.lava=Math.max(this.lava+dt*Math.min(24,10+this.height*.07),this.peak-610);
    if(p.y<this.lava+10||p.y<this.camera-200){this.die();return;}
    this.generate(Math.floor((this.camera+H)/METER)+6);
    this.platforms=this.platforms.filter(s=>s.y>this.lava-140||s.id===p.ground);
    if(p.ground!==null){
      const landed=p.ground;
      if(landed>=this.nextShop){this.nextShop=landed+15;this.trigger('shop');}
      else if(landed>=this.nextQuiz){this.nextQuiz=landed+22;this.trigger('quiz');}
      else if(landed>=this.nextBattle){this.nextBattle=landed+30;this.trigger('battle');}
    }
  }
}
