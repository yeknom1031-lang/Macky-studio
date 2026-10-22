/* Exercise actual game functions without starting WebGL, touching a browser save, or copying combat rules. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.resolve(__dirname,'../dist'),source=fs.readFileSync(path.join(dist,'game.js'),'utf8');
const T=require(path.join(dist,'vendor/three.min.js')),extracted=new Map(),report={passed:[],damage:{}};

// The JavaScript parser selects a complete function expression, including nested braces and strings.
// This does not depend on line numbers, indentation, a following declaration, or a second copy of its body.
function gameFunction(name){
  if(extracted.has(name))return extracted.get(name);
  const matches=[...source.matchAll(new RegExp('\\bfunction\\s+'+name+'\\s*\\(','g'))];
  assert.equal(matches.length,1,'exactly one game function: '+name);
  const start=matches[0].index;
  for(let end=source.indexOf('}',start);end>=0;end=source.indexOf('}',end+1)){
    const body=source.slice(start,end+1);
    try{new vm.Script('('+body+')');}catch{continue;}
    extracted.set(name,body);return body;
  }
  throw new Error('Cannot extract game function '+name);
}

T.TextureLoader.prototype.load=function(file,onLoad){
  assert.ok(fs.existsSync(path.join(dist,file)),file);
  const texture=new T.Texture();onLoad?.(texture);return texture;
};
const modelContext={window:{},THREE:T,console,document:{createElement(){return{getContext(){return{fillRect(){},drawImage(){}};}};}}};
vm.createContext(modelContext);
for(const file of ['models.js','characters.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),modelContext);
const M=modelContext.window.SkyModels;

function fixture(names=[]){
  const elements=new Map(),stored=new Map(),writes=[],timers=[],fx=[],numbers=[],modals=[];
  const element=id=>{
    if(!elements.has(id))elements.set(id,{style:{},textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},focus(){}});
    return elements.get(id);
  };
  const g={T,M,console,window:{},V:new T.Vector3(),scene:new T.Scene(),camera:new T.PerspectiveCamera(),
    hero:{group:new T.Group()},ship:{group:new T.Group(),hero:{group:new T.Group()},exhausts:[]},
    enemies:[],chests:{},projectiles:[],effects:[],keys:new Set(),shield:{visible:false},attackRing:{visible:false},
    islands:[{id:'market',kind:'market',name:'Market',x:0,z:0,r:28},{id:'ruins',kind:'ruins',name:'Ruins',x:0,z:-195,r:31},
      {id:'captain',kind:'boss',name:'Captain',x:170,z:-405,r:18},{id:'fort',kind:'fort',x:175,z:-230,r:25,raider:{alive:true,hp:120,group:new T.Group()}}],
    playing:true,modal:null,training:false,time:1,feetY:0,jumpVelocity:0,guardAge:99,invuln:0,dodgeTime:0,
    parryFlash:0,heroHit:0,counterWindow:0,impactPause:0,slowMotion:0,perfectDodge:false,victoryDelay:0,
    battleHits:0,battleDamage:0,battleMessage:'',battleMessageLife:0,attackTime:0,attackCooldown:0,pendingMelee:null,lastAttackBow:false,
    camYaw:0,camPitch:.32,camDistance:10.5,cannonCd:0,shipSpeed:0,autoTarget:null,bossStarted:false,
    saveTimer:0,hudTimer:0,mapTimer:0,flashTimer:0,soundOn:false,musicTimer:0,
    SAVE_KEY:'test-only-save',localStorage:{getItem:key=>stored.get(key)||null,setItem(key,value){stored.set(key,value);writes.push({key,value});}},
    $:element,setTimeout:(fn,delay)=>timers.push({fn,delay}),matchMedia:()=>({matches:false}),clock:{getDelta:()=>0},
    clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),groundAt:()=>true,
    combatFx:{impact:event=>fx.push(event),swing:event=>fx.push(event),reset(){fx.length=0;}},
    floatingNumber:(position,amount,bad)=>numbers.push({amount,bad:!!bad}),
    openModal(title,eyebrow,html,type){g.modal=type;modals.push(type);},
    updateHUD(){},toast(){},beep(){},chime(){},defeat(){g.modal='defeat';},
    updateWalk(){},updateFlight(){},updateEnemies(){},resolveBodies(){},updateProjectiles(){},updateAmbient(){},updateCamera(){},drawMap(){},
  };
  vm.createContext(g);
  vm.runInContext(fs.readFileSync(path.join(dist,'combat.js'),'utf8'),g);
  g.SkyCombat=g.window.SkyCombat;
  for(const name of new Set(['fresh','save','currentIsland','resetBattle','announceBattle','isGuarding',...names]))
    vm.runInContext(gameFunction(name),g,{filename:'game.js:'+name});
  g.S=g.fresh();
  g.fighter=g.SkyCombat.create({canStart:move=>g.canStartAttack?g.canStartAttack(move):true,
    onStart:action=>g.beginAttack?.(action),onContact:action=>g.contactAttack?.(action)});
  return Object.assign(g,{test:{stored,writes,timers,fx,numbers,modals,elements}});
}
function enemy(g,{id='test-pirate',type='pirate',island='ruins',hp=100,x=0,z=-5,boss=false,realRig=false}={}){
  const rig=realRig?M.character(type):{group:new T.Group(),body:{},arms:[]};
  rig.group.position.set(x,0,z);
  const ring=new T.Object3D();ring.material={opacity:0,color:new T.Color()};
  const e={id,type,island,hp,max:hp,boss,rig,pos:rig.group.position,home:rig.group.position.clone(),ring,
    state:'idle',timer:1,cooldown:1,deathTimer:0,hitFlash:0,posture:0,phase:0};
  g.enemies.push(e);return e;
}
function check(name,test){test();report.passed.push(name);}

check('Defeat completes while flying or visiting another island; reload resets the actual articulated pose',()=>{
  const g=fixture(['updateEnemies','syncWorld']);
  const e=enemy(g,{realRig:true});e.hp=0;e.deathTimer=.85;e.state='defeated';
  g.S.mode='flight';g.updateEnemies(.3);
  assert.ok(Math.abs(e.deathTimer-.55)<1e-9,'flight keeps the death clock running');
  assert.ok(e.rig.body.rotation.x>.2,'the real rig is falling');
  g.S.mode='walk';g.S.island='market';g.updateEnemies(.6);
  assert.equal(e.deathTimer,0);assert.equal(e.rig.group.visible,false);
  assert.ok(e.rig.body.rotation.x>1.4,'the pose settles before disappearance');
  g.syncWorld();assert.equal(e.hp,e.max);assert.equal(e.rig.group.visible,true);
  assert.ok(Math.abs(e.rig.body.rotation.x)<.05,'resurrected enemy is upright before its island is visited');
  assert.ok(e.rig.eyes[0].scale.y>.5,'the defeat eye pose is also cleared');
  g.S.defeated.push(e.id);g.syncWorld();assert.equal(e.hp,0);assert.equal(e.rig.group.visible,false,'saved defeats stay defeated');
});

const attackFunctions=['canStartAttack','aimTarget','beginAttack','contactAttack','spawnProjectile','updateProjectiles','hitEnemy'];
function arrowDamage(counter){
  const g=fixture(attackFunctions);g.S.mode='walk';g.S.island='ruins';g.S.upgrades.bow=1;g.counterWindow=counter?1:0;
  const e=enemy(g);assert.equal(g.fighter.request('bow'),true);
  assert.equal(g.S.arrows,30,'drawing does not consume ammunition');assert.equal(g.S.sp,92);
  g.fighter.update(.15);g.fighter.update(.15);assert.equal(g.projectiles.length,0);
  g.fighter.update(.02);assert.equal(g.S.arrows,29);assert.equal(g.projectiles.length,1);
  assert.equal(g.projectiles[0].power,counter?1.5:1,'counter multiplier travels with the projectile');
  for(let i=0;i<20&&g.projectiles.length;i++)g.updateProjectiles(1/60);
  assert.equal(g.projectiles.length,0);assert.equal(g.battleHits,1);assert.equal(g.counterWindow,0);
  const damage=100-e.hp;g.updateProjectiles(.1);assert.equal(100-e.hp,damage,'one arrow damages once');
  return damage;
}
check('Counter bonus survives bow draw, projectile flight and actual hit resolution',()=>{
  report.damage.arrow=arrowDamage(false);report.damage.counterArrow=arrowDamage(true);
  assert.equal(report.damage.arrow,30);assert.equal(report.damage.counterArrow,45);
  const g=fixture(attackFunctions);g.S.mode='walk';g.S.island='ruins';
  g.fighter.request('bow');g.fighter.update(.15);g.fighter.cancel();g.fighter.update(.15);
  assert.equal(g.S.arrows,30,'interrupted bow draw spends no arrow');assert.equal(g.projectiles.length,0);
});

function defenseCase({age=.4,sp=100,behind=false,potion=false,dodge=0,source=true,invuln=0}={}){
  const g=fixture(['damagePlayer']);g.S.mode='walk';g.S.island='ruins';g.S.sp=sp;g.guardAge=age;
  g.S.buffs.defense=potion?10:0;g.dodgeTime=dodge;g.invuln=invuln;g.keys.add('KeyG');
  const e=enemy(g,{z:behind?2:-2});e.state='active';e.posture=60;e.ring.visible=true;
  g.damagePlayer(20,source?{origin:e.pos,enemy:e}:null);return{g,e};
}
check('Actual player damage distinguishes parry, chip, back attacks, guard break, potion, fall and dodge',()=>{
  let {g,e}=defenseCase({age:.1});assert.equal(g.S.hp,100);assert.equal(g.S.sp,92);
  assert.equal(g.counterWindow,1.5);assert.equal(e.state,'stagger');assert.equal(e.posture,0);assert.equal(e.ring.visible,false);
  ({g}=defenseCase());assert.equal(g.S.hp,96);assert.equal(g.S.sp,82);assert.equal(g.counterWindow,0);
  ({g}=defenseCase({behind:true}));assert.equal(g.S.hp,80);assert.equal(g.S.sp,100,'rear hit bypasses guard');
  ({g}=defenseCase({sp:10}));assert.equal(g.S.hp,80);assert.equal(g.S.sp,0);assert.equal(g.heroHit,.65);assert.equal(g.keys.has('KeyG'),false);
  ({g}=defenseCase({potion:true}));assert.equal(g.S.hp,98,'defense potion reduces guarded chip damage');
  ({g}=defenseCase({age:.1,source:false}));assert.equal(g.S.hp,80);assert.equal(g.counterWindow,0,'fall damage cannot be parried');
  ({g,e}=defenseCase({dodge:.2,invuln:.34}));assert.equal(g.S.hp,100);assert.equal(g.counterWindow,1.1);assert.equal(g.perfectDodge,true);
  const fxCount=g.test.fx.length;g.damagePlayer(20,{origin:e.pos,enemy:e});assert.equal(g.test.fx.length,fxCount,'one dodge rewards its first avoided attack only');
  ({g}=defenseCase({age:.1,invuln:.2}));assert.equal(g.S.hp,100);assert.equal(g.counterWindow,0,'existing invulnerability does not invent a parry');
});

check('Entering and restarting practice cannot overwrite the normal adventure; continue restores it',()=>{
  const g=fixture(['load','closeModal','syncWorld','startGame','chooseLanding','startPractice']);
  enemy(g,{id:'ruin-scout',realRig:true,z:-183});
  g.S.gold=777;g.S.materials=13;g.S.flags.twin=true;
  g.startPractice();assert.equal(g.training,true);assert.equal(g.S.mode,'walk');assert.equal(g.S.island,'ruins');
  assert.equal(g.test.writes.length,1,'normal adventure is saved once before practice takes ownership');
  const original=g.test.stored.get(g.SAVE_KEY);assert.equal(JSON.parse(original).gold,777);
  g.S.gold=999999;g.S.flags.boss=true;g.save();assert.equal(g.test.stored.get(g.SAVE_KEY),original);
  g.startPractice('captain');assert.equal(g.S.island,'captain');assert.equal(g.test.writes.length,1);
  assert.equal(g.test.stored.get(g.SAVE_KEY),original,'practice restart and landing remain isolated');
  g.startGame(true);assert.equal(g.training,false);assert.equal(g.S.gold,777);assert.equal(g.S.materials,13);
  assert.equal(g.S.flags.twin,true);assert.equal(g.S.flags.boss,false);assert.equal(g.S.mode,'flight');
  assert.equal(g.S.version,1,'existing save format still loads');assert.equal(g.test.writes.length,2);
});

check('Victory delay pauses with the menu, is discarded on reset, and opens only once',()=>{
  const g=fixture(['update','showVictory']);g.victoryDelay=.9;g.modal='pause';
  g.update(1);assert.equal(g.victoryDelay,.9);assert.deepEqual(g.test.modals,[]);
  g.modal=null;g.update(.2);assert.ok(Math.abs(g.victoryDelay-.7)<1e-9);
  g.resetBattle();g.update(1);assert.equal(g.victoryDelay,0);assert.deepEqual(g.test.modals,[]);
  g.victoryDelay=.1;g.update(.1);assert.equal(g.modal,'victory');assert.deepEqual(g.test.modals,['victory']);
  g.update(1);assert.deepEqual(g.test.modals,['victory']);
});

console.log(JSON.stringify({ok:true,...report,actualGameFunctions:extracted.size},null,2));
