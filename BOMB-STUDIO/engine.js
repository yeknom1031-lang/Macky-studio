(function (root) {
  'use strict';
  const W = 15, H = 11;
  const MIN_SIZE = 7, MAX_WIDTH = 31, MAX_HEIGHT = 25;
  const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
  const THEMES = {
    garden: { name:'グリーンガーデン', subtitle:'木もれびの、いつもの場所。', floor:['#d4e4b3','#ccdeaa'], wall:'#73977d', wallTop:'#abc5a1', wallSide:'#4d725a', crate:'#b88955', crateTop:'#d8b174', rim:'#bfd39c', accent:'#607e44' },
    candy: { name:'キャンディポップ', subtitle:'あまくて、ちょっぴり刺激的。', floor:['#f2dce8','#ead2e3'], wall:'#b7a0ca', wallTop:'#ded2e8', wallSide:'#8c77a6', crate:'#dc90ac', crateTop:'#f4b9cd', rim:'#dfc1d9', accent:'#b56692' },
    space: { name:'ムーンベース', subtitle:'月までとどけ、この一発。', floor:['#bbc4df','#b3bdd9'], wall:'#737f9f', wallTop:'#a6b3d2', wallSide:'#53617f', crate:'#7a9da8', crateTop:'#a5c7cb', rim:'#a3aecf', accent:'#646898' }
  };
  const PRESETS = [
    {id:'shiro',name:'シロ',helmet:'#fff9ed',body:'#7161e8',accent:'#f583ae',accessory:'antenna',mode:'dress'},
    {id:'mint',name:'ミント',helmet:'#b9e4c4',body:'#398f83',accent:'#f4d05e',accessory:'leaf',mode:'dress'},
    {id:'momo',name:'モモ',helmet:'#f4bdd1',body:'#db638d',accent:'#a27ac9',accessory:'cat',mode:'dress'},
    {id:'luna',name:'ルナ',helmet:'#bfc8eb',body:'#6a76b8',accent:'#f6ca64',accessory:'crown',mode:'dress'}
  ];
  const WEAPONS = { normal:{name:'まんまるボム',mark:'✚',description:'十字にドカン！'}, line:{name:'ヨコヨコボム',mark:'↔',description:'横の一列ぜんぶを爆発！'}, vertical:{name:'タテタテボム',mark:'↕',description:'縦の一列ぜんぶを爆発！'}, pierce:{name:'ドリルボム',mark:'»',description:'ブロックを貫通'} };
  const EGGS = { paku:{name:'パクたま',color:'#f8e99c',description:'Eで爆弾を食べて、横にドカン！'}, shield:{name:'まもたま',color:'#b1dddf',description:'12秒に1回、爆風をガード'}, speed:{name:'ピョンたま',color:'#f3b9d2',description:'足が速くなるよ'} };
  const clone = value => JSON.parse(JSON.stringify(value));
  const key = (x,y) => `${x},${y}`;
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function validSize(width,height){return Number.isInteger(width)&&Number.isInteger(height)&&width>=MIN_SIZE&&width<=MAX_WIDTH&&height>=MIN_SIZE&&height<=MAX_HEIGHT;}
  function dimensions(stage){return {width:stage.grid[0].length,height:stage.grid.length};}
  function baseGrid(pillars = true,width=W,height=H) { if(!validSize(width,height))throw new Error('横7〜31マス、縦7〜25マスで決めてね。');return Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>x===0||y===0||x===width-1||y===height-1||(pillars&&x%2===0&&y%2===0)?1:0)); }
  function createStage(theme='garden', seed=1,width=W,height=H) {
    const random=rng(seed), grid=baseGrid(true,width,height);
    const spawns=[{x:1,y:1},{x:width-2,y:height-2},{x:width-2,y:1},{x:1,y:height-2}];
    for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) if(!grid[y][x]&&random()<.66) grid[y][x]=2;
    for(const p of spawns){const dx=p.x<width/2?1:-1,dy=p.y<height/2?1:-1;for(const [ox,oy]of[[0,0],[dx,0],[0,dy],[2*dx,0],[2*dx,dy]])grid[p.y+oy][p.x+ox]=0;}
    // An open middle corridor gives every map a readable route through the arena.
    for(let x=1;x<width-1;x++) if(x%3!==0) grid[Math.floor(height/2)][x]=0;
    return {id:theme,name:THEMES[theme].name,theme,width,height,grid,spawns};
  }
  function resizeStage(stage,width,height){
    const resized=clone(stage),grid=baseGrid(false,width,height),old=dimensions(stage);
    for(let y=1;y<Math.min(height-1,old.height-1);y++)for(let x=1;x<Math.min(width-1,old.width-1);x++)grid[y][x]=stage.grid[y][x];
    const occupied=new Set(),corners=[{x:1,y:1},{x:width-2,y:height-2},{x:width-2,y:1},{x:1,y:height-2}];
    resized.spawns=stage.spawns.map((p,i)=>{let position={x:Math.min(width-2,p.x),y:Math.min(height-2,p.y)};if(occupied.has(key(position.x,position.y)))position=corners.find(c=>!occupied.has(key(c.x,c.y)));occupied.add(key(position.x,position.y));grid[position.y][position.x]=0;return position;});
    for(const p of resized.spawns)if(!DIRS.some(([dx,dy])=>grid[p.y+dy]?.[p.x+dx]===0)){const neighbor=DIRS.map(([dx,dy])=>({x:p.x+dx,y:p.y+dy})).find(n=>n.x>0&&n.y>0&&n.x<width-1&&n.y<height-1);grid[neighbor.y][neighbor.x]=0;}
    return {...resized,width,height,grid};
  }
  function validateStage(stage) {
    if(!stage||!THEMES[stage.theme]||!Array.isArray(stage.grid)||!Array.isArray(stage.grid[0]))return 'ステージのデータを読み込めません。';
    const {width,height}=dimensions(stage);
    if(!validSize(width,height)||stage.grid.some(row=>!Array.isArray(row)||row.length!==width||row.some(t=>![0,1,2].includes(t)))) return 'ステージのデータを読み込めません。';
    if(stage.grid.some((row,y)=>row.some((t,x)=>(x===0||y===0||x===width-1||y===height-1)&&t!==1))) return '外側は壁で囲もう。';
    if(!Array.isArray(stage.spawns)||stage.spawns.length<2||stage.spawns.length>4) return 'プレイヤー1人と、ライバル1〜3人を置こう。';
    const occupied=new Set();
    for(const p of stage.spawns){
      if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<1||p.y<1||p.x>=width-1||p.y>=height-1||stage.grid[p.y][p.x]!==0||occupied.has(key(p.x,p.y))) return 'スタート位置を、別々の空いているマスに置こう。';
      occupied.add(key(p.x,p.y));
      if(!DIRS.some(([dx,dy])=>stage.grid[p.y+dy]?.[p.x+dx]===0)) return 'スタートのとなりに、歩ける道を作ろう。';
    }
    const seen=new Set(), queue=[stage.spawns[0]];
    while(queue.length){const p=queue.shift(),k=key(p.x,p.y);if(seen.has(k))continue;seen.add(k);for(const [dx,dy]of DIRS){const x=p.x+dx,y=p.y+dy;if(stage.grid[y]?.[x]!==undefined&&stage.grid[y][x]!==1&&!seen.has(key(x,y)))queue.push({x,y});}}
    if(stage.spawns.some(p=>!seen.has(key(p.x,p.y)))) return 'ライバルまでの道が壁でふさがれているよ。';
    // A starting bomb must have at least one reachable refuge behind a corner or outside its range.
    for(const p of stage.spawns){const danger=new Set([key(p.x,p.y)]);for(const[dx,dy]of DIRS)for(let n=1;n<=2;n++){const x=p.x+dx*n,y=p.y+dy*n;if(stage.grid[y]?.[x]===1)break;danger.add(key(x,y));if(stage.grid[y]?.[x]===2)break;}const visit=new Set(),q=[p];let safe=false;while(q.length){const t=q.shift(),k=key(t.x,t.y);if(visit.has(k))continue;visit.add(k);if(!danger.has(k)){safe=true;break;}for(const[dx,dy]of DIRS){const x=t.x+dx,y=t.y+dy;if(stage.grid[y]?.[x]===0&&!visit.has(key(x,y)))q.push({x,y});}}if(!safe)return 'スタートの近くに、爆弾から逃げられる道を作ろう。';}
    return '';
  }
  class Game {
    constructor(stage,options={}) {
      const error=validateStage(stage);if(error)throw new Error(error);
      this.stage=clone(stage);this.grid=clone(stage.grid);this.random=options.random||Math.random;
      const size=dimensions(stage);this.width=size.width;this.height=size.height;
      this.weapon=options.weapon||'normal';this.egg=options.egg||'paku';this.time=150;this.elapsed=0;this.status='ready';this.bombs=[];this.flames=[];this.items=[];this.events=[];this.score=0;this.eggCooldown=0;this.bombId=0;
      this.actors=stage.spawns.map((p,i)=>({id:i,x:p.x,y:p.y,drawX:p.x,drawY:p.y,fromX:p.x,fromY:p.y,motion:1,alive:true,hp:i?1:3,power:2,capacity:1,speed:0,cooldown:0,invincible:0,think:.3+i*.2,direction:'down'}));
    }
    get player(){return this.actors[0];}
    start(){if(this.status==='ready'){this.status='playing';this.player.invincible=1;}}
    emit(type,data={}){this.events.push({type,...data});}
    bombAt(x,y){return this.bombs.find(b=>b.x===x&&b.y===y);}
    walkable(x,y){return this.grid[y]?.[x]===0&&!this.bombAt(x,y);}
    move(actor,dx,dy){
      if(!actor.alive||actor.cooldown>0||!this.walkable(actor.x+dx,actor.y+dy))return false;
      actor.fromX=actor.x;actor.fromY=actor.y;actor.x+=dx;actor.y+=dy;actor.motion=0;
      actor.cooldown=Math.max(.09,(actor.id ? .235 : .17)-actor.speed*.018-(actor.id===0&&this.egg==='speed' ? .035 : 0));
      actor.moveDuration=actor.cooldown;actor.direction=dx<0?'left':dx>0?'right':dy<0?'up':'down';
      if(actor.id===0)this.collect();return true;
    }
    placeBomb(actor=this.player){
      if(this.status!=='playing'||!actor.alive||this.bombAt(actor.x,actor.y)||this.bombs.filter(b=>b.owner===actor.id).length>=actor.capacity)return false;
      const weapon=actor.id===0?this.weapon:'normal';
      this.bombs.push({id:++this.bombId,x:actor.x,y:actor.y,owner:actor.id,power:actor.power,timer:2.3,weapon});this.emit('place',{x:actor.x,y:actor.y});return true;
    }
    blastCells(bomb,grid=this.grid){
      // Row / column weapons reach every interior cell, including past solid walls.
      // Solid walls survive, but do not shield the rest of the selected line.
      if(bomb.weapon==='line')return Array.from({length:this.width-2},(_,i)=>({x:i+1,y:bomb.y}));
      if(bomb.weapon==='vertical')return Array.from({length:this.height-2},(_,i)=>({x:bomb.x,y:i+1}));
      const cells=[{x:bomb.x,y:bomb.y}], dirs=DIRS, range=bomb.power;
      for(const [dx,dy] of dirs)for(let n=1;n<=range;n++){
        const x=bomb.x+dx*n,y=bomb.y+dy*n,tile=grid[y]?.[x];if(tile===undefined||tile===1)break;
        cells.push({x,y});if(tile===2&&bomb.weapon!=='pierce')break;
      }return cells;
    }
    explode(first,egg=false,finalize=true){
      const queue=[{bomb:first,egg}],handled=new Set();
      while(queue.length){const current=queue.shift(),bomb=current.bomb;if(handled.has(bomb.id)||!this.bombs.includes(bomb))continue;handled.add(bomb.id);this.bombs=this.bombs.filter(b=>b!==bomb);
        const cells=this.blastCells(current.egg?{...bomb,weapon:'line',power:Math.max(3,bomb.power)}:bomb);
        for(const {x,y} of cells){
          const wasCrate=this.grid[y][x]===2;
          this.items=this.items.filter(item=>item.x!==x||item.y!==y);
          if(wasCrate){this.grid[y][x]=0;this.score+=10;this.emit('break',{x,y});if(this.random()<.34){const kinds=['power','capacity','speed','heart'];this.items.push({x,y,kind:kinds[Math.floor(this.random()*4)],delay:.65});}}
          this.flames.push({x,y,timer:.55,safePlayer:current.egg,egg:current.egg});
          const chained=this.bombAt(x,y);if(chained)queue.push({bomb:chained,egg:false});
        }
        this.emit(current.egg?'eat':'explode',{x:bomb.x,y:bomb.y});
      }
      this.checkDamage();if(finalize)this.checkEnd();
    }
    useEgg(){
      if(this.status!=='playing'||this.egg!=='paku')return 'このたまごの力は、自動で発動するよ。';
      if(this.eggCooldown>0)return `たまごはひとやすみ中。あと${Math.ceil(this.eggCooldown)}秒！`;
      const nearby=this.bombs.filter(b=>Math.abs(b.x-this.player.x)+Math.abs(b.y-this.player.y)<=2).sort((a,b)=>a.timer-b.timer).find(b=>{if(b.x!==this.player.x&&b.y!==this.player.y)return false;const dx=Math.sign(b.x-this.player.x),dy=Math.sign(b.y-this.player.y);let x=this.player.x,y=this.player.y;while(x!==b.x||y!==b.y){x+=dx;y+=dy;if(this.grid[y][x]!==0)return false;}return true;});
      if(!nearby)return 'たまごの目の前、2マス以内に爆弾を置いてね。';
      this.eggCooldown=7;this.explode(nearby,true);return '';
    }
    danger(extra){const result=new Set(this.flames.map(f=>key(f.x,f.y)));for(const b of extra?[...this.bombs,extra]:this.bombs)for(const p of this.blastCells(b))result.add(key(p.x,p.y));return result;}
    route(actor,goal,danger,allowDanger=false,extra){
      const queue=[{x:actor.x,y:actor.y,first:null,depth:0}],seen=new Set([key(actor.x,actor.y)]);
      while(queue.length){const p=queue.shift();if(p.depth&&goal(p))return p.first;if(p.depth>this.width+this.height)continue;
        const offset=(actor.id+Math.floor(this.elapsed))%4;
        for(let i=0;i<4;i++){const [dx,dy]=DIRS[(i+offset)%4],x=p.x+dx,y=p.y+dy,k=key(x,y);if(seen.has(k)||!this.walkable(x,y)||(extra&&x===extra.x&&y===extra.y)||(!allowDanger&&danger.has(k)))continue;seen.add(k);queue.push({x,y,first:p.first||[dx,dy],depth:p.depth+1});}
      }return null;
    }
    think(actor){
      if(actor.cooldown>0)return;const danger=this.danger(),here=key(actor.x,actor.y);
      if(danger.has(here)){const escape=this.route(actor,p=>!danger.has(key(p.x,p.y)),danger,true);if(escape)this.move(actor,...escape);return;}
      const nearbyCrate=DIRS.some(([dx,dy])=>this.grid[actor.y+dy]?.[actor.x+dx]===2);
      const nearbyOpponent=this.actors.some(a=>a!==actor&&a.alive&&Math.abs(a.x-actor.x)+Math.abs(a.y-actor.y)<3);
      if((nearbyCrate||nearbyOpponent)&&actor.think<=0&&!this.bombAt(actor.x,actor.y)&&this.bombs.filter(b=>b.owner===actor.id).length<actor.capacity){
        const hypothetical={x:actor.x,y:actor.y,power:actor.power,weapon:'normal'},future=this.danger(hypothetical);
        const escape=this.route(actor,p=>!future.has(key(p.x,p.y)),future,true,hypothetical);
        if(escape&&this.placeBomb(actor)){this.move(actor,...escape);actor.think=1.5;return;}
      }
      const path=this.route(actor,p=>DIRS.some(([dx,dy])=>this.grid[p.y+dy]?.[p.x+dx]===2)||Math.abs(p.x-this.player.x)+Math.abs(p.y-this.player.y)<2,danger);
      if(path)this.move(actor,...path);
      else if(this.random()<.18){const [dx,dy]=DIRS[Math.floor(this.random()*4)];if(!danger.has(key(actor.x+dx,actor.y+dy)))this.move(actor,dx,dy);}
    }
    collect(){const p=this.player,item=this.items.find(i=>i.x===p.x&&i.y===p.y&&i.delay<=0);if(!item)return;
      if(item.kind==='heart')p.hp=Math.min(3,p.hp+1);if(item.kind==='power')p.power=Math.min(6,p.power+1);if(item.kind==='capacity')p.capacity=Math.min(5,p.capacity+1);if(item.kind==='speed')p.speed=Math.min(3,p.speed+1);
      this.items=this.items.filter(i=>i!==item);this.score+=25;this.emit('collect',{kind:item.kind,x:p.x,y:p.y});
    }
    checkDamage(){for(const a of this.actors){if(!a.alive||a.invincible>0||!this.flames.some(f=>f.x===a.x&&f.y===a.y&&!(a.id===0&&f.safePlayer)))continue;
      if(a.id===0&&this.egg==='shield'&&this.eggCooldown<=0){this.eggCooldown=12;a.invincible=1;this.emit('shield');continue;}
      a.hp--;a.invincible=1.6;this.emit('hurt',{id:a.id,x:a.x,y:a.y});if(a.hp<=0){a.alive=false;if(a.id)this.score+=100;}
    }}
    checkEnd(){if(this.status!=='playing')return;if(!this.player.alive||this.time<=0){this.status='lost';this.emit('end',{won:false});}else if(this.actors.slice(1).every(a=>!a.alive)){this.status='won';this.emit('end',{won:true});}}
    update(dt,input){if(this.status!=='playing')return;dt=Math.min(.05,Math.max(0,dt));this.elapsed+=dt;this.time=Math.max(0,this.time-dt);this.eggCooldown=Math.max(0,this.eggCooldown-dt);
      for(const a of this.actors){a.cooldown=Math.max(0,a.cooldown-dt);a.invincible=Math.max(0,a.invincible-dt);a.think-=dt;a.motion=Math.min(1,a.motion+dt/(a.moveDuration||.17));a.drawX=a.fromX+(a.x-a.fromX)*a.motion;a.drawY=a.fromY+(a.y-a.fromY)*a.motion;}
      this.flames=this.flames.map(f=>({...f,timer:f.timer-dt})).filter(f=>f.timer>0);
      for(const item of this.items)item.delay=Math.max(0,item.delay-dt);
      for(const b of this.bombs)b.timer-=dt;
      for(const b of [...this.bombs])if(b.timer<=0&&this.bombs.includes(b))this.explode(b,false,false);
      this.checkDamage();this.checkEnd();if(this.status!=='playing')return;
      if(input)this.move(this.player,...input);
      for(const a of this.actors.slice(1))if(a.alive)this.think(a);
      this.collect();this.checkDamage();this.checkEnd();
    }
  }
  const api={W,H,MIN_SIZE,MAX_WIDTH,MAX_HEIGHT,DIRS,THEMES,PRESETS,WEAPONS,EGGS,clone,key,rng,dimensions,validSize,baseGrid,createStage,resizeStage,validateStage,Game};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BombStudio=api;
})(typeof window!=='undefined'?window:globalThis);
