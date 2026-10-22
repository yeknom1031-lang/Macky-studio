/* Articulated characters. Original geometry; generated surface maps are bundled locally. */
(() => {
  'use strict';
  const M=window.SkyModels,T=M.T,previousCharacter=M.character,previousAnimate=M.animateCharacter;
  const textures={},assetState={},materials=new Map(),rigs=[];
  function texture(name,file,repeat=1){
    assetState[name]='loading';
    const map=new T.TextureLoader().load('assets/characters/'+file,()=>assetState[name]='ready',undefined,()=>assetState[name]='error');
    map.encoding=T.sRGBEncoding;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(repeat,repeat);map.anisotropy=4;return textures[name]=map;
  }
  texture('embroidery','captain-embroidered-wool.png',1.4);
  texture('hair','chestnut-strands.png');texture('skin','warm-skin-freckles.png',1.5);
  function material(key,color,extra={}){
    if(materials.has(key))return materials.get(key);
    const m=new T.MeshStandardMaterial({color,roughness:.78,...extra});m.color.convertSRGBToLinear();m.userData.characterArt=true;materials.set(key,m);return m;
  }
  const skin=material('skin',0xffffff,{map:textures.skin,roughness:.82}),hair=material('hair',0xd1b599,{map:textures.hair,roughness:.58}),darkHair=material('darkHair',0x775b4d,{map:textures.hair}),leather=material('leather',0x584031,{roughness:.61}),lightLeather=material('lightLeather',0x966749),gold=material('gold',0xc9a460,{metalness:.65,roughness:.36}),dark=material('dark',0x293135),linen=material('linen',0xe8dfc7),eyeWhite=material('eyeWhite',0xfff7e9,{roughness:.37}),iris=material('iris',0x4c8c88,{roughness:.3}),pupil=material('pupil',0x142b30,{roughness:.24}),lip=material('lip',0xa76755),pink=material('ear',0xb57c63),scarfMat=material('scarf',0xb8614d),silver=material('silver',0xc4d6db,{metalness:.75,roughness:.24});
  const sphere=new T.SphereGeometry(1,18,12),smallSphere=new T.SphereGeometry(1,12,8);
  function mesh(parent,geo,mat,x=0,y=0,z=0){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function ellipsoid(parent,mat,x,y,z,sx,sy,sz,small=false){const o=mesh(parent,small?smallSphere:sphere,mat,x,y,z);o.scale.set(sx,sy,sz);return o;}
  function cylinder(parent,mat,rt,rb,h,x=0,y=0,z=0){return mesh(parent,new T.CylinderGeometry(rt,rb,h,16),mat,x,y,z);}
  function block(parent,mat,w,h,d,x=0,y=0,z=0){return M.box(parent,w,h,d,mat,x,y,z);}
  function pivot(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);g.userData.skyDynamic=true;parent.add(g);return g;}
  function curve(parent,points,r,mat,segments=12){return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,5,false),mat);}
  function taperedLock(parent,points,radius,mat){
    const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),n=12,sides=7,frames=path.computeFrenetFrames(n,false),v=[],uv=[],idx=[];
    for(let i=0;i<=n;i++){const p=path.getPointAt(i/n),r=radius*(.8+.2*Math.sin(i/n*Math.PI))*Math.pow(1-i/n,.5)+.003;for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,q=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r*.45);v.push(q.x,q.y,q.z);uv.push(j/sides,i/n);if(i<n&&j<sides){const k=i*(sides+1)+j;idx.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}}}
    // Closed roots avoid sliced, hollow tubes showing at the crown in close views.
    const root=v.length/3,start=path.getPointAt(0),end=path.getPointAt(1);v.push(start.x,start.y,start.z,end.x,end.y,end.z);uv.push(.5,0,.5,1);
    for(let j=0;j<sides;j++){idx.push(root,j+1,j);const k=n*(sides+1)+j;idx.push(root+1,k,k+1);}
    const g=new T.BufferGeometry();g.userData.taperedLock={rings:n+1,sides};g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(parent,g,mat);
  }
  function scalpGeometry(){
    const cols=32,rows=15,p=[],uv=[],idx=[];
    for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
      const phi=col/cols*Math.PI*2,front=Math.max(0,-Math.cos(phi)),back=Math.max(0,Math.cos(phi));
      // The forehead stays clear above the brows; the sides and nape are longer.
      const edge=1.68-.64*Math.pow(front,.7)+.44*back,theta=row/rows*edge;
      p.push(Math.sin(theta)*Math.sin(phi)*.35,.35+Math.cos(theta)*.405,.015+Math.sin(theta)*Math.cos(phi)*.322);uv.push(col/cols,row/rows);
      if(row<rows&&col<cols){const a=row*(cols+1)+col;idx.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  function clothPanel(parent,mat,w,h,bend=.08){const geo=new T.PlaneGeometry(w,h,5,7),p=geo.attributes.position;for(let i=0;i<p.count;i++){const u=(h/2-p.getY(i))/h;p.setXYZ(i,p.getX(i)*(1+.15*u),p.getY(i)-h/2,Math.sin(u*Math.PI)*bend+Math.pow(u,2)*.09);}geo.computeVertexNormals();return mesh(parent,geo,mat);}
  function batchJoint(joint){for(const child of joint.children)if(child.userData.skyDynamic)batchJoint(child);const flag=joint.userData.skyDynamic;joint.userData.skyDynamic=false;M.batchStatic(joint);joint.userData.skyDynamic=flag;}

  function character(type='hero'){
    if(type==='stone')return previousCharacter(type);
    const g=new T.Group(),body=pivot(g),torso=pivot(body,0,1.36,0),head=pivot(torso,0,.83,0),npc=['merchant','alchemist','cook'].includes(type),boss=type==='boss';
    g.userData.skyDynamic=true;g.userData.characterArtVersion=3;
    const r={group:g,type,body,torso,head,legs:[],knees:[],feet:[],arms:[],elbows:[],wrists:[],eyes:[],eyelids:[],tails:[],materials:[],phase:0,move:0,lastTime:undefined,npc};
    const coatColors={hero:0xffffff,boss:0xab6f6d,pirate:0x9f7770,archer:0xaaa27f,shield:0x9ca4b0,merchant:0xb8bc98,alchemist:0xa59db8,cook:0xede3cc};
    const coat=material('coat-'+type,coatColors[type]||0xffffff,{map:type==='hero'?textures.embroidery:null,side:T.DoubleSide,roughness:.93});
    const trim=material('trim-'+type,type==='hero'?0x1c535c:boss?0x723e42:type==='alchemist'?0x6c637d:0x546661,{side:T.DoubleSide});
    // Fitted double-breasted tunic with shaped shoulders, rolled collar and actual sewn borders.
    const jacket=cylinder(torso,coat,.42,.33,.88,0,.23,0);jacket.scale.z=.7;
    ellipsoid(torso,coat,0,.59,0,.43,.16,.29);
    block(torso,linen,.34,.65,.08,0,.29,-.28);
    for(const s of [-1,1]){
      const lapel=block(torso,trim,.16,.64,.075,s*.22,.38,-.315);lapel.rotation.z=s*.23;
      curve(torso,[[s*.13,.72,-.34],[s*.25,.38,-.36],[s*.3,.05,-.31]],.013,gold);
      const collar=block(torso,coat,.25,.23,.1,s*.15,.72,-.08);collar.rotation.z=s*-.35;
      for(const y of [.02,.2,.38])ellipsoid(torso,gold,s*.14,y,-.34,.026,.026,.018,true);
      const tail=pivot(body,s*.23,1.25,.21);clothPanel(tail,coat,.43,.62,.05);curve(tail,[[-.22,-.56,.1],[0,-.64,.1],[.22,-.56,.1]],.012,gold);r.tails.push(tail);
      const pocket=block(torso,trim,.22,.13,.055,s*.28,-.04,-.27);pocket.rotation.z=s*.1;
    }
    const belt=cylinder(body,leather,.36,.36,.13,0,1.22,0);belt.scale.z=.83;
    const buckle=block(body,gold,.22,.15,.045,0,1.22,-.315);block(body,leather,.13,.085,.05,0,1.22,-.34);
    cylinder(head,skin,.13,.145,.23,0,.01,0);
    // The head is sculpted geometry, not a painted face. A narrower jaw and defined cheek planes
    // remain readable from profile while the textures only supply fine surface detail.
    const faceGeo=sphere.clone(),pos=faceGeo.attributes.position;
    for(let i=0;i<pos.count;i++){const y=pos.getY(i),x=pos.getX(i);pos.setX(i,x*(y<-.18?1+(y+.18)*.27:1));if(pos.getZ(i)<0&&y<-.5)pos.setZ(i,pos.getZ(i)*.9);}
    faceGeo.computeVertexNormals();const face=mesh(head,faceGeo,skin,0,.32,0);face.scale.set(.335,.405,.3);
    for(const s of [-1,1]){
      ellipsoid(head,skin,s*.326,.29,0,.075,.115,.055,true);ellipsoid(head,pink,s*.35,.29,-.035,.035,.065,.018,true);
      const eye=pivot(head,s*.135,.355,-.287);eye.rotation.y=s*-.12;
      ellipsoid(eye,eyeWhite,0,0,0,.103,.061,.032);ellipsoid(eye,iris,0,0,-.029,.043,.048,.014);ellipsoid(eye,pupil,0,0,-.042,.021,.031,.008);ellipsoid(eye,eyeWhite,-.012,.016,-.05,.009,.012,.004,true);r.eyes.push(eye);
      curve(head,[[s*.047,.355,-.296],[s*.12,.412,-.309],[s*.22,.379,-.265]],.014,darkHair);
      curve(head,[[s*.05,.34,-.3],[s*.13,.303,-.302],[s*.22,.34,-.264]],.009,pink);
      const brow=pivot(head,s*.13,.47,-.267);curve(brow,[[-.085,-.015,0],[0,.005,-.02],[.08,-.015,.01]],.024,hair);r.eyelids.push(brow);
    }
    ellipsoid(head,skin,0,.28,-.292,.044,.092,.058);ellipsoid(head,skin,0,.23,-.34,.057,.038,.04,true);
    curve(head,[[-.071,.133,-.278],[0,.12,-.3],[.071,.141,-.279]],.013,lip);curve(head,[[-.045,.102,-.282],[0,.099,-.286],[.045,.107,-.282]],.006,pink);
    // Smooth swept scalp and tapered locks replace the old sphere-cluster hair.
    mesh(head,scalpGeometry(),hair);
    for(let i=0;i<7;i++){const x=-.29+i*.083,rootY=.35+Math.sqrt(1-Math.pow(x*.7/.35,2))*.405-.035;taperedLock(head,[[x*.7,rootY,.02],[x+.04,.66,-.18],[x+.035,.59,-.28],[x-.025,.525+(i%3)*.015,-.281]],.057,hair);}
    for(const s of [-1,1]){taperedLock(head,[[s*.29,.57,.03],[s*.35,.39,.01],[s*.32,.18,-.03]],.09,hair);taperedLock(head,[[s*.18,.58,.25],[s*.27,.35,.27],[s*.21,.17,.22]],.12,hair);}
    const scarf=cylinder(torso,scarfMat,.22,.27,.19,0,.71,0);scarf.scale.z=.9;
    const scarfTail=pivot(torso,.22,.68,.24);scarfTail.rotation.z=-.3;clothPanel(scarfTail,material('scarf-double',0xb8614d,{side:T.DoubleSide}),.23,.72,.1);r.scarf=scarfTail;
    // Knees, ankles, elbows and wrists give contact-aware locomotion and expressive poses.
    for(const s of [-1,1]){
      const leg=pivot(body,s*.205,1.15,0);cylinder(leg,dark,.155,.13,.5,0,-.22,0);ellipsoid(leg,dark,0,-.06,0,.17,.19,.16);
      const knee=pivot(leg,0,-.48,0);ellipsoid(knee,dark,0,0,0,.132,.14,.133,true);cylinder(knee,leather,.14,.12,.4,0,-.18,0);cylinder(knee,lightLeather,.16,.15,.095,0,-.07,0);block(knee,gold,.12,.065,.025,0,-.09,-.155);
      const foot=pivot(knee,0,-.43,0);ellipsoid(foot,leather,0,-.045,-.085,.16,.14,.265);block(foot,dark,.32,.065,.49,0,-.15,-.09);curve(foot,[[-.11,.018,-.2],[0,.039,-.24],[.11,.018,-.2]],.012,lightLeather);
      r.legs.push(leg);r.knees.push(knee);r.feet.push(foot);
      const arm=pivot(torso,s*.48,.56,0);ellipsoid(arm,coat,0,-.06,0,.2,.18,.18);cylinder(arm,coat,.17,.125,.42,0,-.23,0);ellipsoid(arm,gold,s*.012,.03,0,.18,.045,.16,true);
      const elbow=pivot(arm,0,-.45,0);ellipsoid(elbow,coat,0,0,0,.129,.13,.12,true);cylinder(elbow,coat,.12,.105,.29,0,-.14,0);cylinder(elbow,gold,.13,.14,.085,0,-.28,0);cylinder(elbow,leather,.106,.105,.12,0,-.35,0);
      const wrist=pivot(elbow,0,-.42,0);ellipsoid(wrist,leather,0,-.025,0,.12,.14,.093);ellipsoid(wrist,leather,s*-.09,-.02,-.035,.045,.075,.044,true);for(let finger=0;finger<3;finger++)curve(wrist,[[-.075+finger*.05,-.08,-.07],[-.075+finger*.05,-.13,-.058]],.006,lightLeather,2);
      r.arms.push(arm);r.elbows.push(elbow);r.wrists.push(wrist);
    }
    const weapon=pivot(r.wrists[1],0,-.04,-.07);cylinder(weapon,leather,.055,.055,.28,0,-.03,0);ellipsoid(weapon,gold,0,.13,0,.075,.065,.075,true);block(weapon,gold,.4,.065,.12,0,-.18,0);
    const blade=mesh(weapon,new T.CylinderGeometry(.07,0,1.38,4),silver,0,-.89,0);blade.scale.z=.4;curve(weapon,[[0,-.22,-.033],[0,-.9,-.033],[0,-1.55,-.001]],.01,gold);r.sword=weapon;
    const bow=pivot(r.wrists[0],0,-.03,-.15);curve(bow,[[0,-.72,0],[0,-.45,-.21],[0,0,-.27],[0,.45,-.21],[0,.72,0]],.038,leather,20);curve(bow,[[0,-.72,0],[0,0,.035],[0,.72,0]],.006,linen,2);block(bow,gold,.075,.21,.075,0,0,-.27);r.bow=bow;bow.visible=type==='archer';
    if(type==='hero'){
      const strap=mesh(head,new T.TorusGeometry(.333,.022,6,28),leather,0,.59,.01);strap.rotation.x=Math.PI/2;strap.scale.z=.91;
      for(const s of [-1,1]){mesh(head,new T.TorusGeometry(.1,.024,6,20),gold,s*.125,.62,-.257);ellipsoid(head,material('glass',0x8ec7c9,{roughness:.18,metalness:.4}),s*.125,.62,-.266,.08,.08,.02);}
      curve(head,[[-.03,.62,-.275],[0,.64,-.282],[.03,.62,-.275]],.014,gold);
      block(torso,leather,.5,.6,.27,0,.25,.36);block(torso,lightLeather,.52,.14,.31,0,.56,.38);block(torso,gold,.13,.12,.035,0,.4,.535);
      for(const s of [-1,1]){curve(torso,[[s*.2,.59,.41],[s*.31,.59,0],[s*.3,.52,-.27],[s*.29,-.1,-.28]],.032,leather);block(torso,gold,.08,.12,.035,s*.29,.08,-.315);}
      const roll=cylinder(torso,linen,.12,.12,.66,0,-.13,.38);roll.rotation.z=Math.PI/2;for(const s of [-1,1]){const tie=mesh(torso,new T.TorusGeometry(.13,.016,5,12),leather,s*.21,-.13,.38);tie.rotation.y=Math.PI/2;}
      const compass=pivot(body,.29,1.16,-.3);ellipsoid(compass,gold,0,0,0,.08,.09,.04,true);ellipsoid(compass,linen,0,0,-.035,.059,.065,.01,true);r.compass=compass;
    }
    if(npc){
      const apron=clothPanel(torso,linen,.53,.69,.04);apron.position.set(0,.25,-.34);block(torso,lightLeather,.3,.2,.035,0,-.09,-.385);
      if(type==='merchant'){curve(head,[[-.15,.17,-.28],[-.08,.19,-.32],[0,.16,-.32],[.08,.19,-.32],[.15,.17,-.28]],.032,darkHair);}
      if(type==='alchemist'){for(const s of [-1,1])mesh(head,new T.TorusGeometry(.105,.014,5,20),gold,s*.135,.355,-.315);curve(head,[[-.025,.37,-.32],[0,.39,-.34],[.025,.37,-.32]],.01,gold);cylinder(head,trim,.31,.36,.18,0,.76,0);}
      if(type==='cook'){cylinder(head,linen,.29,.32,.25,0,.77,0);for(let k=0;k<5;k++){const a=k/5*Math.PI*2;ellipsoid(head,linen,Math.sin(a)*.18,.96,Math.cos(a)*.18,.2,.17,.18,true);}}
    }
    if(type==='shield'){const shield=pivot(r.wrists[0],-.05,.05,-.18);ellipsoid(shield,trim,0,0,0,.43,.64,.1);mesh(shield,new T.TorusGeometry(.42,.035,6,24),gold).scale.set(1,1.5,1);ellipsoid(shield,gold,0,0,-.1,.12,.12,.05);}
    if(type==='pirate'||type==='archer'){const band=cylinder(head,scarfMat,.335,.35,.13,0,.61,0);band.scale.z=.92;taperedLock(head,[[.27,.6,.17],[.43,.45,.23],[.4,.25,.26]],.075,scarfMat);}
    if(boss){
      const hat=cylinder(head,dark,.36,.65,.3,0,.82,0);hat.geometry=new T.CylinderGeometry(.36,.65,.3,3);hat.rotation.y=Math.PI/6;block(head,gold,.24,.12,.04,0,.82,-.47);
      for(let i=0;i<5;i++)taperedLock(head,[[(i-2)*.06,.16,-.24],[(i-2)*.06,-.02,-.28],[(i-2)*.03,-.17,-.2]],.06,darkHair);
      curve(head,[[.3,.88,0],[.41,1.12,.04],[.34,1.37,.06]],.035,linen);g.scale.setScalar(1.6);
    }
    weapon.visible=!npc;batchJoint(body);rigs.push(r);return r;
  }
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=n=>{n=clamp(n,0,1);return n*n*(3-2*n);},lerp=(a,b,t)=>a+(b-a)*t;
  function animateCharacter(r,time,speed=0,attack=0,bow=false,context={}){
    if(!r.body){previousAnimate(r,time,speed,attack,bow);return;}
    const dt=clamp(context.dt|| (r.lastTime===undefined?1/60:time-r.lastTime),1/240,.06);r.lastTime=time;
    r.move=lerp(r.move,clamp(speed,0,1),1-Math.exp(-dt*9));const move=r.move,phase=r.phase+=(3.5+move*7.6)*dt,breath=Math.sin(time*2.15)*.008;
    r.body.position.y=breath+Math.abs(Math.sin(phase))*.035*move;r.body.rotation.set(.045*move,0,Math.sin(phase)*.025*move);
    r.torso.rotation.set(-.035*move,Math.sin(phase)*.075*move,Math.sin(phase)*.015*move);r.torso.scale.y=1+breath*.45;
    r.head.rotation.set(Math.sin(time*1.7)*.018,Math.sin(time*.55+(r.npc?1:0))*.065*(1-move),Math.sin(time*.8)*.014);
    for(let i=0;i<2;i++){
      const p=phase+i*Math.PI,swing=Math.sin(p),lift=Math.max(0,swing),s=i?1:-1;
      r.legs[i].rotation.set(swing*.62*move,0,s*.025);r.knees[i].rotation.x=-Math.max(0,-swing)*.86*move-.025;
      r.feet[i].rotation.x=-swing*.16*move-Math.max(0,-Math.cos(p))*.12*move;
      r.arms[i].rotation.set(-swing*.45*move-.06,Math.sin(p)*.035*move,s*.075);r.elbows[i].rotation.set(-.1-lift*.4*move,0,0);r.wrists[i].rotation.set(0,0,0);
      r.tails[i].rotation.set(-.12-move*.22+Math.sin(phase-.5+i*.6)*move*.11+Math.sin(time*2+i)*.025,0,s*.03);
    }
    // Closed eyelids are a geometric squash, driven independently of walking or combat.
    const blinkPeriod=4.1+(r.type.length%3)*.47,blinkPhase=(time+r.type.length*.31)%blinkPeriod,blink=blinkPhase<.14?Math.sin(blinkPhase/.14*Math.PI):0;
    for(const eye of r.eyes)eye.scale.y=1-.96*blink;
    for(let i=0;i<r.eyelids.length;i++)r.eyelids[i].rotation.z=(i?1:-1)*(attack>0?.13:Math.sin(time*.7)*.025);
    if(attack>0&&!bow){
      const a=clamp(attack,0,1),wind=smooth(a/.24),strike=smooth((a-.24)/.32),recover=smooth((a-.56)/.44),hold=1-recover;
      r.torso.rotation.y=(-.55*wind+1.05*strike)*hold;r.torso.rotation.x=-.08*strike*hold;r.head.rotation.y=-r.torso.rotation.y*.6;
      r.arms[1].rotation.x=(-1.5*wind+2.15*strike)*hold;r.arms[1].rotation.z=(-.72*wind- .5*strike)*hold;
      r.elbows[1].rotation.x=(-1.1*wind+1.02*strike)*hold;r.wrists[1].rotation.x=(-.25*wind+.6*strike)*hold;
      r.arms[0].rotation.x=-.42*hold;r.elbows[0].rotation.x=-.72*hold;r.body.position.y-=Math.sin(a*Math.PI)*.055;
    }
    if(bow||r.type==='archer'){
      const draw=attack>0?Math.sin(clamp(attack,0,1)*Math.PI):.2;
      r.torso.rotation.y=-.25;r.arms[0].rotation.set(1.35,0,-.15);r.elbows[0].rotation.x=.05;r.wrists[0].rotation.x=-.18;
      r.arms[1].rotation.set(1.15,-.45,.68);r.elbows[1].rotation.set(-1.2-draw*.3,0,.35);r.head.rotation.y=.2;
    }
    if(context.grounded===false){const rise=clamp((context.jumpVelocity||0)/8,-1,1);r.legs[0].rotation.x=-.4;r.legs[1].rotation.x=.35;r.knees[0].rotation.x=-.85;r.knees[1].rotation.x=-.55;r.arms[0].rotation.z=-.35;r.arms[1].rotation.z=.35;r.body.rotation.x=-rise*.1;r.wasAirborne=true;}
    else if(context.grounded===true&&r.wasAirborne){r.wasAirborne=false;r.landing=.22;}
    if(r.landing>0){r.landing=Math.max(0,r.landing-dt);const settle=Math.sin(r.landing/.22*Math.PI);r.body.position.y-=settle*.12;r.knees.forEach(k=>k.rotation.x-=settle*.25);r.torso.rotation.x-=settle*.07;}
    if(context.dodge>0){const d=smooth(Math.min(context.dodge/.15,1));r.body.position.y-=d*.25;r.torso.rotation.x=-d*.3;r.knees.forEach(k=>k.rotation.x-=d*.8);}
    if(context.flight){r.arms.forEach((a,i)=>a.rotation.set(.68,0,i?.18:-.18));r.elbows.forEach(e=>e.rotation.x=-.65);r.head.rotation.y=Math.sin(time*.32)*.12;r.torso.rotation.z=Math.sin(time*1.5)*.015;}
    if(r.npc&&!attack){r.arms[0].rotation.x=.18+Math.sin(time*1.2)*.08;r.elbows[0].rotation.x=-.55;r.arms[1].rotation.x=.25;r.elbows[1].rotation.x=-.6+Math.sin(time*.8)*.08;}
    r.scarf.rotation.x=-.15-move*.65+Math.sin(time*3.7)*.08;r.scarf.rotation.z=-.3+Math.sin(time*2.6)*.06;
    if(r.compass)r.compass.rotation.z=Math.sin(phase-.5)*move*.15;
    r.sword.visible=!bow&&!r.npc&&!context.flight;r.bow.visible=(bow||r.type==='archer')&&!context.flight;
  }
  M.character=character;M.animateCharacter=animateCharacter;
  M.characterArtStatus=()=>({version:3,generatedTextures:3,textures:{...assetState},rigs:rigs.length,articulatedRigs:rigs.filter(r=>r.body).length,features:['sculpted-face','geometric-blink','woven-embroidery','tapered-hair','knee-elbow-rig','foot-roll','attack-phases','secondary-cloth']});
})();
