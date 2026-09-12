/* SKY BUILDER 3D - a local, original course-builder using Kenney CC0 assets. */
(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const app = document.getElementById("app");
  const ui = {
    start: document.getElementById("start-screen"), help: document.getElementById("help-screen"), clear: document.getElementById("clear-screen"),
    play: document.getElementById("play-mode"), edit: document.getElementById("edit-mode"), sound: document.getElementById("sound-button"),
    coins: document.getElementById("coin-count"), total: document.getElementById("coin-total"), lives: document.getElementById("life-count"), time: document.getElementById("time-count"),
    resultCoins: document.getElementById("result-coins"), resultTime: document.getElementById("result-time"), toast: document.getElementById("toast"), flash: document.getElementById("flash")
  };

  const STORAGE_KEY = "sky-builder-3d-level-v1";
  const KENNEY = "assets/kenney/platformer-kit/Models/GLB%20format/";
  const modelFiles = {
    block: "block-grass.glb", crate: "crate.glb", coin: "coin-gold.glb", spike: "trap-spikes.glb",
    spring: "spring.glb", tree: "tree.glb", goal: "flag.glb", player: "character-oopi.glb"
  };
  const sounds = {
    jump: "assets/kenney/impact-sounds/Audio/impactSoft_medium_001.ogg",
    land: "assets/kenney/impact-sounds/Audio/footstep_grass_002.ogg",
    bump: "assets/kenney/impact-sounds/Audio/impactWood_medium_002.ogg",
    spring: "assets/kenney/impact-sounds/Audio/impactMetal_light_002.ogg",
    coin: "assets/kenney/interface-sounds/Audio/confirmation_002.ogg",
    place: "assets/kenney/interface-sounds/Audio/drop_002.ogg",
    remove: "assets/kenney/interface-sounds/Audio/back_002.ogg",
    click: "assets/kenney/interface-sounds/Audio/select_002.ogg",
    save: "assets/kenney/interface-sounds/Audio/confirmation_004.ogg",
    fail: "assets/kenney/interface-sounds/Audio/error_008.ogg",
    clear: "assets/kenney/interface-sounds/Audio/bong_001.ogg"
  };
  const audioCache = {};
  Object.keys(sounds).forEach(k => { audioCache[k] = new Audio(sounds[k]); audioCache[k].preload = "auto"; });

  const sampleLevel = [
    {type:"block",x:-9,y:0,z:0,w:6,h:1,d:6},{type:"tree",x:-10,y:1,z:-1.8},{type:"tree",x:-8,y:1,z:2},
    {type:"block",x:-3.5,y:0,z:0,w:4,h:1,d:4},{type:"coin",x:-4.5,y:1.3,z:0},{type:"coin",x:-3.5,y:1.3,z:0},{type:"coin",x:-2.5,y:1.3,z:0},
    {type:"block",x:0,y:0,z:0,w:2,h:1,d:2},{type:"spring",x:0,y:1,z:0},
    {type:"block",x:4,y:2.4,z:0,w:5,h:1,d:5},{type:"coin",x:3,y:3.7,z:0},{type:"coin",x:4,y:3.7,z:0},{type:"coin",x:5,y:3.7,z:0},
    {type:"crate",x:5,y:3.4,z:1.1},{type:"spike",x:4,y:3.4,z:-1.2},
    {type:"block",x:8.5,y:2.4,z:1.5,w:2,h:1,d:2},{type:"block",x:11,y:3.5,z:1.5,w:3,h:1,d:3},
    {type:"coin",x:8.5,y:3.8,z:1.5},{type:"goal",x:11,y:4.5,z:1.5}
  ];

  let renderer, scene, camera, clock, raycaster, loader;
  let mode = "play", started = false, muted = false, cleared = false;
  let level = loadLevel(), worldObjects = [], solids = [], collectibles = [], hazards = [], springs = [], goal = null;
  let history = [], future = [], selectedType = "block", objectSerial = 1;
  let elapsed = 0, coinCount = 0, lives = 3, respawn = new THREE.Vector3(-9, 1.05, 0);
  let lastLandTime = 0, coyote = 0, jumpBuffer = 0, cameraYaw = -Math.PI / 2, cameraPitch = 0.43, cameraDistance = 10;
  let audioContext = null, musicTimer = null, musicStep = 0;
  const mixers = [], particles = [], keys = {}, moveInput = {x:0,z:0};
  const pointer = {down:false,x:0,y:0,lastX:0,lastY:0,moved:false,button:0};
  const player = {
    pos:new THREE.Vector3(-9,1.05,0), vel:new THREE.Vector3(), root:new THREE.Group(), visual:null,
    grounded:false, visible:true, half:0.34, height:1.45, facing:0, squash:0
  };

  boot();

  function boot() {
    if (!window.THREE || !THREE.GLTFLoader) { alert("3Dライブラリを読み込めませんでした。"); return; }
    renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(innerWidth,innerHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x83d9f5); scene.fog = new THREE.Fog(0x83d9f5,35,78);
    camera = new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,140);
    clock = new THREE.Clock(); raycaster = new THREE.Raycaster(); loader = new THREE.GLTFLoader();
    buildLighting(); buildBackdrop(); buildPlayer(); rebuildLevel(); bindUI(); onResize(); animate();
  }

  function buildLighting() {
    scene.add(new THREE.HemisphereLight(0xfff8dc,0x3973a2,1.1));
    const sun = new THREE.DirectionalLight(0xfff4d0,1.55); sun.position.set(-14,25,12); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-28; sun.shadow.camera.right=28; sun.shadow.camera.top=24; sun.shadow.camera.bottom=-24;
    scene.add(sun);
  }

  function buildBackdrop() {
    const sea = new THREE.Mesh(new THREE.CircleGeometry(68,64),new THREE.MeshStandardMaterial({color:0x68c6ea,roughness:.32,metalness:.05}));
    sea.rotation.x=-Math.PI/2; sea.position.y=-4.1; sea.receiveShadow=true; scene.add(sea);
    const cloudMat = new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:.84});
    for(let i=0;i<28;i++){
      const cloud=new THREE.Group(), pieces=3+Math.floor(Math.random()*3);
      for(let j=0;j<pieces;j++){const puff=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),cloudMat);puff.scale.set(1.2+Math.random(),.45+Math.random()*.35,.75+Math.random()*.5);puff.position.set(j*1.25,Math.random()*.5,Math.random()*.5);cloud.add(puff)}
      const a=Math.random()*Math.PI*2,r=28+Math.random()*35; cloud.position.set(Math.cos(a)*r,2+Math.random()*16,Math.sin(a)*r); cloud.scale.setScalar(.7+Math.random()*1.3); cloud.userData.drift=.08+Math.random()*.08; scene.add(cloud);
    }
    const rockMat=new THREE.MeshStandardMaterial({color:0x7a91a5,roughness:1});
    for(let i=0;i<12;i++){const island=new THREE.Mesh(new THREE.ConeGeometry(2+Math.random()*3,5+Math.random()*5,6),rockMat);const a=i/12*Math.PI*2,r=33+Math.random()*16;island.position.set(Math.cos(a)*r,-1-Math.random()*3,Math.sin(a)*r);island.rotation.x=Math.PI;scene.add(island)}
    const grid=new THREE.GridHelper(50,25,0xffffff,0xffffff);grid.position.y=.015;grid.material.opacity=.15;grid.material.transparent=true;grid.visible=false;grid.name="editor-grid";scene.add(grid);
  }

  function buildPlayer() {
    const body=new THREE.Group(),bodyMat=new THREE.MeshStandardMaterial({color:0xff725e,roughness:.75});
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.78,12),bodyMat),head=new THREE.Mesh(new THREE.SphereGeometry(.34,12,9),bodyMat),feet=new THREE.Mesh(new THREE.SphereGeometry(.34,12,9),bodyMat);
    torso.position.y=.73;head.position.y=1.12;feet.position.y=.34;body.add(torso,head,feet);body.traverse(n=>{if(n.isMesh)n.castShadow=true});player.root.add(body); player.visual=body; scene.add(player.root);
    loader.load(KENNEY+modelFiles.player,gltf=>{
      player.root.remove(player.visual); const model=gltf.scene; normalizeModel(model,{w:.82,h:1.48,d:.82}); model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}}); player.root.add(model); player.visual=model;
      if(gltf.animations && gltf.animations.length){const mixer=new THREE.AnimationMixer(model);const preferred=gltf.animations.find(a=>/idle/i.test(a.name))||gltf.animations[0];mixer.clipAction(preferred).play();mixers.push(mixer)}
    },undefined,()=>{});
  }

  function normalizeModel(model,size) {
    model.updateMatrixWorld(true); const box=new THREE.Box3().setFromObject(model), dim=new THREE.Vector3(); box.getSize(dim);
    const sx=size.w/(dim.x||1), sy=size.h/(dim.y||1), sz=size.d/(dim.z||1); model.scale.set(sx,sy,sz); model.updateMatrixWorld(true);
    const fixed=new THREE.Box3().setFromObject(model), center=new THREE.Vector3(); fixed.getCenter(center); model.position.x-=center.x; model.position.z-=center.z; model.position.y-=fixed.min.y;
  }

  function rebuildLevel() {
    worldObjects.forEach(o=>scene.remove(o.root)); worldObjects=[];solids=[];collectibles=[];hazards=[];springs=[];goal=null;
    level.forEach(data=>{if(!data.id)data.id=objectSerial++;addWorldObject(data)}); updateHud();
  }

  function addWorldObject(data) {
    const d=Object.assign({},data); if(!d.id)d.id=objectSerial++;
    const root=new THREE.Group(); root.position.set(d.x,d.y,d.z); root.userData.objectId=d.id; scene.add(root);
    const obj={data:d,root,placeholder:null,collected:false}; worldObjects.push(obj);
    const spec = visualSpec(d);
    obj.placeholder=makePlaceholder(d,spec); root.add(obj.placeholder);
    root.traverse(n=>n.userData.objectId=d.id);
    if(d.type==="block"||d.type==="crate") solids.push(obj);
    if(d.type==="coin") collectibles.push(obj);
    if(d.type==="spike") hazards.push(obj);
    if(d.type==="spring") springs.push(obj);
    if(d.type==="goal") goal=obj;
    loader.load(KENNEY+modelFiles[d.type],gltf=>{
      if(!obj.root.parent)return; const model=gltf.scene; normalizeModel(model,spec); model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.userData.objectId=d.id}}); root.remove(obj.placeholder); root.add(model); obj.model=model;
    },undefined,()=>{});
    return obj;
  }

  function visualSpec(d) {
    if(d.type==="block")return {w:d.w||2,h:d.h||1,d:d.d||2};
    if(d.type==="crate")return {w:1.15,h:1.15,d:1.15};
    if(d.type==="coin")return {w:.64,h:.72,d:.24};
    if(d.type==="spike")return {w:1.35,h:.55,d:1.35};
    if(d.type==="spring")return {w:.85,h:.55,d:.85};
    if(d.type==="tree")return {w:2,h:3.5,d:2};
    if(d.type==="goal")return {w:1.7,h:3.2,d:.6};
    return {w:1,h:1,d:1};
  }

  function makePlaceholder(d,s) {
    let geo,mat;
    if(d.type==="coin"){geo=new THREE.TorusGeometry(.28,.1,8,18);mat=new THREE.MeshStandardMaterial({color:0xffcb35,emissive:0x6b3900,emissiveIntensity:.2,metalness:.5});}
    else if(d.type==="spike"){geo=new THREE.ConeGeometry(.52,.7,4);mat=new THREE.MeshStandardMaterial({color:0x8193a4,metalness:.3});}
    else if(d.type==="spring"){geo=new THREE.CylinderGeometry(.4,.48,.45,12);mat=new THREE.MeshStandardMaterial({color:0xf04e6e});}
    else if(d.type==="tree"){geo=new THREE.ConeGeometry(1,3.3,8);mat=new THREE.MeshStandardMaterial({color:0x4da85b});}
    else if(d.type==="goal"){geo=new THREE.BoxGeometry(.2,3,.2);mat=new THREE.MeshStandardMaterial({color:0x8656d4});}
    else {geo=new THREE.BoxGeometry(s.w,s.h,s.d);mat=new THREE.MeshStandardMaterial({color:d.type==="crate"?0xb97543:0x65b94f,roughness:.9});}
    const mesh=new THREE.Mesh(geo,mat); mesh.position.y=s.h/2; mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.objectId=d.id;return mesh;
  }

  function objectBounds(obj) {
    const d=obj.data,s=visualSpec(d); return {minX:d.x-s.w/2,maxX:d.x+s.w/2,minY:d.y,maxY:d.y+s.h,minZ:d.z-s.d/2,maxZ:d.z+s.d/2};
  }

  function resetRun(full) {
    cleared=false; ui.clear.classList.remove("active"); player.pos.copy(respawn);player.vel.set(0,0,0);player.root.visible=true;
    if(full){elapsed=0;coinCount=0;lives=3;collectibles.forEach(c=>{c.collected=false;c.root.visible=true})}
    updateHud();
  }

  function enterMode(next) {
    if(next===mode && started)return; mode=next; app.classList.toggle("editing",mode==="edit");
    ui.play.classList.toggle("active",mode==="play");ui.edit.classList.toggle("active",mode==="edit");
    scene.getObjectByName("editor-grid").visible=mode==="edit";player.root.visible=mode==="play";
    document.getElementById("mobile-controls").style.visibility=mode==="play"?"visible":"hidden";
    if(mode==="play")resetRun(true); else {moveInput.x=moveInput.z=0;collectibles.forEach(c=>c.root.visible=true);toast("地面をクリックしてパーツを置こう！")}
    playSound("click",.6);
  }

  function updatePlayer(dt) {
    if(mode!=="play"||!started||cleared)return;
    const left=(keys.KeyA||keys.ArrowLeft?1:0),right=(keys.KeyD||keys.ArrowRight?1:0),up=(keys.KeyW||keys.ArrowUp?1:0),down=(keys.KeyS||keys.ArrowDown?1:0);
    let ix=right-left+moveInput.x, iz=down-up+moveInput.z; const len=Math.hypot(ix,iz);if(len>1){ix/=len;iz/=len}
    const forward=new THREE.Vector3(-Math.sin(cameraYaw),0,-Math.cos(cameraYaw)), side=new THREE.Vector3(Math.cos(cameraYaw),0,-Math.sin(cameraYaw));
    const wish=new THREE.Vector3().addScaledVector(side,ix).addScaledVector(forward,-iz); if(wish.lengthSq()>1)wish.normalize();
    const accel=player.grounded?48:20, max=7.1; player.vel.x=approach(player.vel.x,wish.x*max,accel*dt);player.vel.z=approach(player.vel.z,wish.z*max,accel*dt);
    if(wish.lengthSq()>.02){const target=Math.atan2(wish.x,wish.z);player.facing=angleLerp(player.facing,target,Math.min(1,dt*12));player.root.rotation.y=player.facing}
    if(player.grounded)coyote=.11;else coyote-=dt;jumpBuffer-=dt;
    if((keys.Space||keys.jumpPressed)&&jumpBuffer<=0)jumpBuffer=.13; keys.jumpPressed=false;
    if(jumpBuffer>0&&coyote>0){player.vel.y=10.7;player.grounded=false;coyote=0;jumpBuffer=0;player.squash=-.12;playSound("jump",.55);spawnParticles(player.pos,0xeafaff,7,.7)}
    player.vel.y-=25*dt;
    moveAxis("x",player.vel.x*dt);moveAxis("z",player.vel.z*dt);player.grounded=false;moveAxis("y",player.vel.y*dt);
    checkTriggers();
    if(player.pos.y<-7)loseLife();
    const speed=Math.hypot(player.vel.x,player.vel.z);player.root.position.copy(player.pos);
    player.squash=approach(player.squash,0,dt*2.8); const bounce=player.grounded?Math.sin(elapsed*12)*Math.min(speed/7,.06):0;
    player.root.scale.set(1-player.squash*.5,1+player.squash,1-player.squash*.5);player.root.position.y+=bounce;
  }

  function moveAxis(axis,amount) {
    if(!amount)return;player.pos[axis]+=amount;
    for(const obj of solids){const b=objectBounds(obj);if(!playerOverlaps(b))continue;
      if(axis==="x"){player.pos.x=amount>0?b.minX-player.half:b.maxX+player.half;player.vel.x=0}
      if(axis==="z"){player.pos.z=amount>0?b.minZ-player.half:b.maxZ+player.half;player.vel.z=0}
      if(axis==="y"){
        if(amount<0){player.pos.y=b.maxY;player.vel.y=0;if(!player.grounded&&performance.now()-lastLandTime>140){lastLandTime=performance.now();player.squash=.16;playSound("land",.28);spawnParticles(player.pos,0xe8f5dc,5,.45)}player.grounded=true}
        else{player.pos.y=b.minY-player.height;player.vel.y=0;playSound("bump",.2)}
      }
    }
  }

  function playerOverlaps(b) {return player.pos.x+player.half>b.minX&&player.pos.x-player.half<b.maxX&&player.pos.z+player.half>b.minZ&&player.pos.z-player.half<b.maxZ&&player.pos.y+player.height>b.minY&&player.pos.y<b.maxY;}

  function checkTriggers() {
    for(const c of collectibles){if(c.collected)continue;const dx=player.pos.x-c.data.x,dz=player.pos.z-c.data.z,dy=player.pos.y+.7-(c.data.y+.35);if(dx*dx+dz*dz+dy*dy<1.15){c.collected=true;c.root.visible=false;coinCount++;playSound("coin",.65,1+coinCount*.035);spawnParticles(new THREE.Vector3(c.data.x,c.data.y+.5,c.data.z),0xffd83f,14,1.5);updateHud()}}
    for(const h of hazards){const dx=Math.abs(player.pos.x-h.data.x),dz=Math.abs(player.pos.z-h.data.z);if(dx<.75&&dz<.75&&player.pos.y<h.data.y+.75){loseLife();return}}
    for(const s of springs){const dx=Math.abs(player.pos.x-s.data.x),dz=Math.abs(player.pos.z-s.data.z);if(dx<.62&&dz<.62&&player.pos.y<s.data.y+.72&&player.vel.y<=0){player.pos.y=s.data.y+.58;player.vel.y=15.5;player.grounded=false;playSound("spring",.7);spawnParticles(new THREE.Vector3(s.data.x,s.data.y+.5,s.data.z),0xff5f88,14,1.7)}}
    if(goal){const dx=player.pos.x-goal.data.x,dz=player.pos.z-goal.data.z,dy=player.pos.y-goal.data.y;if(dx*dx+dz*dz<1.3&&Math.abs(dy)<2.1)courseClear()}
  }

  function loseLife(){if(cleared)return;lives--;playSound("fail",.55);ui.flash.classList.remove("go");void ui.flash.offsetWidth;ui.flash.classList.add("go");updateHud();if(lives<=0){lives=3;coinCount=0;elapsed=0;collectibles.forEach(c=>{c.collected=false;c.root.visible=true});toast("もう一度チャレンジ！")}else toast("空から落ちちゃった！");player.pos.copy(respawn);player.vel.set(0,0,0)}
  function courseClear(){cleared=true;playSound("clear",.8);spawnParticles(new THREE.Vector3(goal.data.x,goal.data.y+2,goal.data.z),0xffd641,45,4);ui.resultCoins.textContent=coinCount+" / "+collectibles.length;ui.resultTime.textContent=formatTime(elapsed);setTimeout(()=>ui.clear.classList.add("active"),550)}

  function updateWorld(dt) {
    elapsed+=mode==="play"&&started&&!cleared?dt:0;
    collectibles.forEach((c,i)=>{if(!c.collected){c.root.rotation.y+=dt*(1.5+i%3*.12);c.root.position.y=c.data.y+Math.sin(elapsed*3+i)*.1}});
    if(goal)goal.root.rotation.y=Math.sin(elapsed*1.4)*.08;
    scene.children.forEach(n=>{if(n.userData.drift){n.position.x+=n.userData.drift*dt;if(n.position.x>70)n.position.x=-70}});
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);continue}p.vel.y-=7*dt;p.mesh.position.addScaledVector(p.vel,dt);p.mesh.rotation.x+=dt*5;p.mesh.rotation.z+=dt*4;p.mesh.scale.setScalar(Math.max(.01,p.life/p.max))}
    mixers.forEach(m=>m.update(dt)); updateHud();
  }

  function updateCamera(dt) {
    let target,desired;
    if(mode==="play"){
      target=player.pos.clone().add(new THREE.Vector3(0,1.05,0));const cp=Math.cos(cameraPitch);
      desired=target.clone().add(new THREE.Vector3(Math.sin(cameraYaw)*cp*cameraDistance,Math.sin(cameraPitch)*cameraDistance,Math.cos(cameraYaw)*cp*cameraDistance));
    }else{
      target=new THREE.Vector3(1,0,0);const dist=cameraDistance+8,cp=Math.cos(Math.max(.48,cameraPitch));desired=target.clone().add(new THREE.Vector3(Math.sin(cameraYaw)*cp*dist,Math.sin(Math.max(.48,cameraPitch))*dist,Math.cos(cameraYaw)*cp*dist));
    }
    camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(target);
  }

  function spawnParticles(pos,color,count,power){
    for(let i=0;i<count;i++){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.07+Math.random()*.09,0),new THREE.MeshBasicMaterial({color}));mesh.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*.4,.1,(Math.random()-.5)*.4));scene.add(mesh);const life=.45+Math.random()*.5;particles.push({mesh,life,max:life,vel:new THREE.Vector3((Math.random()-.5)*power,Math.random()*power+.5,(Math.random()-.5)*power)})}
  }

  function bindUI() {
    addEventListener("resize",onResize); addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="Space"){keys.jumpPressed=true;e.preventDefault()}if(e.code==="KeyE")enterMode(mode==="play"?"edit":"play")});addEventListener("keyup",e=>keys[e.code]=false);
    canvas.addEventListener("pointerdown",onPointerDown);canvas.addEventListener("pointermove",onPointerMove);canvas.addEventListener("pointerup",onPointerUp);canvas.addEventListener("pointercancel",()=>pointer.down=false);canvas.addEventListener("contextmenu",e=>e.preventDefault());
    canvas.addEventListener("wheel",e=>{cameraDistance=Math.max(5,Math.min(19,cameraDistance+e.deltaY*.012));e.preventDefault()},{passive:false});
    document.getElementById("start-button").onclick=()=>{started=true;ui.start.classList.remove("active");startMusic();resetRun(true);toast("ゴールの旗を目指そう！")};
    ui.play.onclick=()=>enterMode("play");ui.edit.onclick=()=>enterMode("edit");document.getElementById("close-editor").onclick=()=>enterMode("play");
    document.getElementById("help-button").onclick=()=>{playSound("click",.5);ui.help.classList.add("active")};document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).classList.remove("active"));
    ui.sound.onclick=()=>{muted=!muted;ui.sound.classList.toggle("muted",muted);if(audioContext){muted?audioContext.suspend():audioContext.resume()}toast(muted?"サウンド OFF":"サウンド ON")};
    document.querySelectorAll(".part").forEach(b=>b.onclick=()=>{selectedType=b.dataset.type;document.querySelectorAll(".part").forEach(x=>x.classList.toggle("active",x===b));playSound("click",.5)});
    document.getElementById("undo-button").onclick=undo;document.getElementById("redo-button").onclick=redo;
    document.getElementById("save-button").onclick=saveLevel;document.getElementById("sample-button").onclick=()=>{pushHistory();level=clone(sampleLevel);rebuildLevel();saveLevel();toast("サンプルコースに戻しました")};
    document.getElementById("retry-button").onclick=()=>{ui.clear.classList.remove("active");resetRun(true)};document.getElementById("clear-edit-button").onclick=()=>{ui.clear.classList.remove("active");enterMode("edit")};
    bindJoystick();
  }

  function onPointerDown(e){pointer.down=true;pointer.x=pointer.lastX=e.clientX;pointer.y=pointer.lastY=e.clientY;pointer.moved=false;pointer.button=e.button;canvas.setPointerCapture(e.pointerId)}
  function onPointerMove(e){if(!pointer.down)return;const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5)pointer.moved=true;if(mode==="play"||pointer.moved){cameraYaw-=dx*.007;cameraPitch=Math.max(.18,Math.min(1.15,cameraPitch+dy*.005))}pointer.lastX=e.clientX;pointer.lastY=e.clientY}
  function onPointerUp(e){if(!pointer.down)return;pointer.down=false;if(mode==="edit"&&!pointer.moved)editAt(e.clientX,e.clientY,pointer.button===2||e.ctrlKey)}

  function editAt(x,y,remove){
    const ndc=new THREE.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1);raycaster.setFromCamera(ndc,camera);
    const hits=raycaster.intersectObjects(worldObjects.map(o=>o.root),true);let target=null;
    if(hits.length){let node=hits[0].object;while(node&&!node.userData.objectId)node=node.parent;target=worldObjects.find(o=>o.data.id===node?.userData.objectId)}
    if(remove){if(target){pushHistory();level=level.filter(o=>o.id!==target.data.id);rebuildLevel();playSound("remove",.5);saveLevel(false)}return}
    const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();raycaster.ray.intersectPlane(plane,hit);if(!hit)return;
    let px=Math.round(hit.x),pz=Math.round(hit.z),py=0;if(target){px=Math.round(hits[0].point.x);pz=Math.round(hits[0].point.z);const b=objectBounds(target);if(target.data.type==="block"||target.data.type==="crate")py=b.maxY}
    const data={type:selectedType,x:px,y:py,z:pz};if(selectedType==="block")Object.assign(data,{w:2,h:1,d:2});
    if(selectedType==="goal")level=level.filter(o=>o.type!=="goal");
    pushHistory();level.push(data);rebuildLevel();playSound("place",.55);spawnParticles(new THREE.Vector3(px,py+.2,pz),0x7de3ff,9,1);saveLevel(false);
  }

  function bindJoystick(){const zone=document.getElementById("joystick"),stick=document.getElementById("stick"),jump=document.getElementById("jump-button");let active=false;
    function move(e){if(!active)return;const r=zone.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy)||1,m=Math.min(34,len),nx=dx/len,ny=dy/len;stick.style.transform=`translate(${nx*m}px,${ny*m}px)`;moveInput.x=nx*Math.min(1,len/28);moveInput.z=ny*Math.min(1,len/28)}
    zone.onpointerdown=e=>{active=true;zone.setPointerCapture(e.pointerId);move(e)};zone.onpointermove=move;zone.onpointerup=zone.onpointercancel=()=>{active=false;moveInput.x=moveInput.z=0;stick.style.transform=""};jump.onpointerdown=e=>{keys.jumpPressed=true;e.preventDefault()};
  }

  function pushHistory(){history.push(clone(level));if(history.length>30)history.shift();future=[]}
  function undo(){if(!history.length){toast("これ以上もどせません");return}future.push(clone(level));level=history.pop();rebuildLevel();playSound("click",.4);saveLevel(false)}
  function redo(){if(!future.length){toast("これ以上やりなおせません");return}history.push(clone(level));level=future.pop();rebuildLevel();playSound("click",.4);saveLevel(false)}
  function saveLevel(show=true){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(level.map(({id,...o})=>o)));if(show){playSound("save",.6);toast("コースをこのMacに保存しました")}}catch(e){toast("保存できませんでした")}}
  function loadLevel(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(Array.isArray(saved)&&saved.length)return saved}catch(e){}return clone(sampleLevel)}
  function clone(v){return JSON.parse(JSON.stringify(v))}

  function startMusic(){if(audioContext||muted)return;try{audioContext=new (window.AudioContext||window.webkitAudioContext)();const notes=[261.63,329.63,392,523.25,392,329.63,293.66,392];musicTimer=setInterval(()=>{if(muted||mode!=="play"||cleared)return;const o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime;o.type="triangle";o.frequency.value=notes[musicStep++%notes.length]/2;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.025,now+.02);g.gain.exponentialRampToValueAtTime(.0001,now+.55);o.connect(g).connect(audioContext.destination);o.start(now);o.stop(now+.6)},620)}catch(e){}
  }
  function playSound(name,volume=.5,rate=1){if(muted)return;const base=audioCache[name];if(!base)return;const a=base.cloneNode();a.volume=volume;a.playbackRate=rate;a.play().catch(()=>{})}
  function toast(message){ui.toast.textContent=message;ui.toast.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui.toast.classList.remove("show"),1800)}
  function updateHud(){ui.coins.textContent=coinCount;ui.total.textContent=collectibles.length;ui.lives.textContent=lives;ui.time.textContent=formatTime(elapsed)}
  function formatTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return m+":"+String(s).padStart(2,"0")}
  function approach(v,target,delta){return v<target?Math.min(target,v+delta):Math.max(target,v-delta)}
  function angleLerp(a,b,t){let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;return a+d*t}
  function onResize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
  function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);updatePlayer(dt);updateWorld(dt);updateCamera(dt);renderer.render(scene,camera)}
})();
