/* Articulated characters. Original geometry; generated surface maps are bundled locally. */
(() => {
  'use strict';
  const M=window.SkyModels,T=M.T,previousCharacter=M.character,previousAnimate=M.animateCharacter;
  const textures={},assetState={},materials=new Map(),rigs=[];
  let atlasMaps;
  function texture(name,file,repeat=1,folder='characters'){
    assetState[name]='loading';
    const map=new T.TextureLoader().load('assets/'+folder+'/'+file,()=>{assetState[name]='ready';updateAtlas();},undefined,()=>assetState[name]='error');
    map.userData={atlasName:name};
    map.encoding=T.sRGBEncoding;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(repeat,repeat);map.anisotropy=4;return textures[name]=map;
  }
  texture('embroidery','captain-embroidered-wool.png',1.4);
  texture('hair','chestnut-strands.png');texture('skin','warm-skin-freckles.png',1.5);
  texture('leather','cognac-leather.png',1,'characters-v4');texture('brocade','burgundy-brocade.png',1,'characters-v4');texture('herbal','herbalist-linen.png',1,'characters-v4');texture('linen','ivory-linen.png',1,'characters-v4');
  function material(key,color,extra={}){
    if(materials.has(key))return materials.get(key);
    const m=new T.MeshStandardMaterial({color,roughness:.78,...extra});m.color.convertSRGBToLinear();m.userData.characterArt=true;materials.set(key,m);return m;
  }
  // One shared PBR atlas lets a complete articulated joint use one draw call, including
  // skin, fabrics, leather and metal. Roughness/metalness retain their physical distinction.
  const atlasSlots=['embroidery','hair','skin','leather','brocade','herbal','linen','solid','metal','glass'],tileSize=512,atlasSize=2048,gutter=12;
  function makeCanvas(size){const c=document.createElement('canvas');c.width=c.height=size;return c;}
  function updateAtlas(){
    if(!atlasMaps)return;
    const ctx=atlasMaps.color.image.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,atlasSize,atlasSize);
    atlasSlots.forEach((name,i)=>{const im=textures[name]?.image;if(im&&im.width)ctx.drawImage(im,(i%4)*tileSize,Math.floor(i/4)*tileSize,tileSize,tileSize);});
    atlasMaps.color.needsUpdate=true;
  }
  function createAtlas(){
    const color=new T.CanvasTexture(makeCanvas(atlasSize)),roughness=new T.CanvasTexture(makeCanvas(256)),metalness=new T.CanvasTexture(makeCanvas(256));color.encoding=T.sRGBEncoding;color.anisotropy=4;
    const rough=roughness.image.getContext('2d'),metal=metalness.image.getContext('2d');rough.fillStyle='#cccccc';rough.fillRect(0,0,256,256);metal.fillStyle='#000000';metal.fillRect(0,0,256,256);
    atlasSlots.forEach((name,i)=>{const value=name==='metal'?82:name==='glass'?40:name==='hair'?145:name==='leather'?155:220;rough.fillStyle='rgb('+value+','+value+','+value+')';rough.fillRect((i%4)*64,Math.floor(i/4)*64,64,64);metal.fillStyle=name==='metal'?'#bfbfbf':name==='glass'?'#666666':'#000000';metal.fillRect((i%4)*64,Math.floor(i/4)*64,64,64);});
    roughness.needsUpdate=metalness.needsUpdate=true;return{color,roughness,metalness};
  }
  atlasMaps=createAtlas();updateAtlas();
  const atlasMaterial=material('shared-character-atlas',0xffffff,{map:atlasMaps.color,roughnessMap:atlasMaps.roughness,metalnessMap:atlasMaps.metalness,roughness:1,metalness:1,vertexColors:true,side:T.DoubleSide});
  function bakeAtlas(joint){
    for(const o of joint.children){if(!o.isMesh||!o.material.userData.characterArt||o.material===atlasMaterial)continue;
      const source=o.material,g=o.geometry.clone(),uv=g.attributes.uv,colors=new Float32Array(g.attributes.position.count*3),tile=atlasSlots.indexOf(source.map?.userData.atlasName|| (source.roughness<.25?'glass':source.metalness>.4?'metal':'solid'));
      let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;for(let v=0;v<uv.count;v++){minU=Math.min(minU,uv.getX(v));maxU=Math.max(maxU,uv.getX(v));minV=Math.min(minV,uv.getY(v));maxV=Math.max(maxV,uv.getY(v));}
      const normalizeU=minU<0||maxU>1,normalizeV=minV<0||maxV>1;
      const tint=source.color.toArray();for(let v=0;v<uv.count;v++){const u=normalizeU?(uv.getX(v)-minU)/(maxU-minU||1):uv.getX(v),w=normalizeV?(uv.getY(v)-minV)/(maxV-minV||1):uv.getY(v);uv.setXY(v,((tile%4)*tileSize+gutter+u*(tileSize-2*gutter))/atlasSize,1-(Math.floor(tile/4)*tileSize+gutter+(1-w)*(tileSize-2*gutter))/atlasSize);colors.set(tint,v*3);}
      g.setAttribute('color',new T.Float32BufferAttribute(colors,3));o.geometry=g;o.material=atlasMaterial;
    }
  }
  const skin=material('skin',0xffffff,{map:textures.skin,roughness:.82}),hair=material('hair',0xd1b599,{map:textures.hair,roughness:.58}),darkHair=material('darkHair',0x775b4d,{map:textures.hair}),leather=material('leather',0xb6a18c,{map:textures.leather,roughness:.61}),lightLeather=material('lightLeather',0xf1debb,{map:textures.leather}),gold=material('gold',0xc9a460,{metalness:.65,roughness:.36}),dark=material('dark',0x293135),linen=material('linen',0xf6eddb,{map:textures.linen}),eyeWhite=material('eyeWhite',0xfff7e9,{roughness:.37}),iris=material('iris',0x4c8c88,{roughness:.3}),pupil=material('pupil',0x142b30,{roughness:.24}),lip=material('lip',0xa76755),pink=material('ear',0xb57c63),scarfMat=material('scarf',0xb8614d),silver=material('silver',0xc4d6db,{metalness:.75,roughness:.24});
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
  function tailoredSection(parent,mat,profile,depth=.9){
    const points=new T.SplineCurve(profile.map(p=>new T.Vector2(...p))).getPoints(14);for(const p of points)p.x=Math.max(.002,p.x);
    const sleeve=mesh(parent,new T.LatheGeometry(points,14),mat);sleeve.scale.z=depth;
    // LatheGeometry deliberately leaves its end rings open. Close both ends so a raised
    // shoulder, bent knee or overhead view never exposes a dark hole inside the sleeve.
    for(const [p,top]of [[points[0],false],[points[points.length-1],true]]){
      const cap=mesh(parent,new T.CircleGeometry(p.x,14),mat,0,p.y,0);cap.rotation.x=top?-Math.PI/2:Math.PI/2;cap.scale.y=depth;cap.userData.tailoredCap=top?'top':'bottom';
    }
    return sleeve;
  }
  function batchJoint(joint){for(const child of joint.children)if(child.userData.skyDynamic)batchJoint(child);bakeAtlas(joint);const flag=joint.userData.skyDynamic;joint.userData.skyDynamic=false;M.batchStatic(joint);joint.userData.skyDynamic=flag;}

  function character(type='hero'){
    if(type==='stone'){
      const stone=previousCharacter(type),body=pivot(stone.group);
      // Preserve the original stone meshes and limb references. An internal pivot gives
      // the rigid guardian its own weight and collapse without touching gameplay position.
      for(const child of [...stone.group.children])if(child!==body)body.add(child);
      stone.stoneBody=body;stone.group.userData.skyDynamic=true;return stone;
    }
    const g=new T.Group(),body=pivot(g),torso=pivot(body,0,1.36,0),head=pivot(torso,0,.83,0),npc=['merchant','alchemist','cook'].includes(type),boss=type==='boss';
    g.userData.skyDynamic=true;g.userData.characterArtVersion=4;
    const r={group:g,type,body,torso,head,legs:[],knees:[],feet:[],arms:[],elbows:[],wrists:[],eyes:[],eyelids:[],tails:[],frontTails:[],materials:[],phase:0,move:0,lastTime:undefined,npc};
    const coatColors={hero:0xffffff,boss:0xf5e4da,pirate:0x9f7770,archer:0xaaa27f,shield:0x9ca4b0,merchant:0x759287,alchemist:0xf4ebf6,cook:0xede3cc};
    const coat=material('coat-'+type,coatColors[type]||0xffffff,{map:type==='hero'?textures.embroidery:boss?textures.brocade:type==='alchemist'?textures.herbal:type==='merchant'?textures.linen:null,side:T.DoubleSide,roughness:.93});
    const trim=material('trim-'+type,type==='hero'?0x1c535c:boss?0x723e42:type==='alchemist'?0x6c637d:0x546661,{side:T.DoubleSide});
    const hair=material('hair-'+type,type==='alchemist'?0xd8d3cb:type==='cook'?0xa29787:type==='merchant'?0xb39b7f:boss?0x7d6758:0xd1b599,{map:textures.hair,roughness:.58});
    // Fitted double-breasted tunic with shaped shoulders, rolled collar and actual sewn borders.
    tailoredSection(torso,coat,[[.29,-.23],[.34,-.18],[.355,.13],[.39,.42],[.405,.56],[.29,.68],[.16,.71]],.73);
    block(torso,linen,.34,.65,.08,0,.29,-.28);
    for(const s of [-1,1]){
      const lapel=block(torso,trim,.16,.64,.075,s*.22,.38,-.315);lapel.rotation.z=s*.23;
      curve(torso,[[s*.13,.72,-.34],[s*.25,.38,-.36],[s*.3,.05,-.31]],.013,gold);
      const collar=block(torso,coat,.25,.23,.1,s*.15,.72,-.08);collar.rotation.z=s*-.35;
      for(const y of [.02,.2,.38])ellipsoid(torso,gold,s*.14,y,-.34,.026,.026,.018,true);
      const tail=pivot(body,s*.23,1.25,.21);clothPanel(tail,coat,.43,.62,.05);curve(tail,[[-.22,-.56,.1],[0,-.64,.1],[.22,-.56,.1]],.012,gold);r.tails.push(tail);
      const frontTail=pivot(body,s*.245,1.22,-.245);frontTail.rotation.y=s*.18;const flap=clothPanel(frontTail,coat,.27,.45,-.035);flap.rotation.y=Math.PI;curve(frontTail,[[s*-.12,-.015,-.01],[s*-.14,-.29,-.015],[s*-.05,-.46,-.07]],.009,gold);r.frontTails.push(frontTail);
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
      const eye=pivot(head,s*.132,.355,-.287);eye.rotation.y=s*-.12;
      ellipsoid(eye,eyeWhite,0,0,0,.094,.055,.032);ellipsoid(eye,iris,0,0,-.029,.039,.043,.014);ellipsoid(eye,pupil,0,0,-.042,.019,.028,.008);ellipsoid(eye,eyeWhite,-.012,.016,-.05,.008,.01,.004,true);eye.children.forEach(o=>o.castShadow=false);r.eyes.push(eye);
      curve(head,[[s*.047,.355,-.296],[s*.12,.412,-.309],[s*.22,.379,-.265]],.014,darkHair);
      curve(head,[[s*.05,.34,-.3],[s*.13,.303,-.302],[s*.22,.34,-.264]],.009,pink);
      const brow=pivot(head,s*.13,.47,-.267);curve(brow,[[-.085,-.015,0],[0,.005,-.02],[.08,-.015,.01]],.019,hair);r.eyelids.push(brow);
    }
    ellipsoid(head,skin,0,.28,-.292,.044,.092,.058);ellipsoid(head,skin,0,.23,-.34,.057,.038,.04,true);
    curve(head,[[-.071,.133,-.278],[0,.12,-.3],[.071,.141,-.279]],.013,lip);curve(head,[[-.045,.102,-.282],[0,.099,-.286],[.045,.107,-.282]],.006,pink);
    // Smooth swept scalp and tapered locks replace the old sphere-cluster hair.
    mesh(head,scalpGeometry(),hair);
    for(let i=0;i<7;i++){const x=-.29+i*.083,rootY=.35+Math.sqrt(1-Math.pow(x*.7/.35,2))*.405-.035;taperedLock(head,[[x*.7,rootY,.02],[x+.04,.66,-.18],[x+.035,.59,-.28],[x-.025,.525+(i%3)*.015,-.281]],.057,hair);}
    for(const s of [-1,1]){taperedLock(head,[[s*.29,.57,.03],[s*.35,.39,.01],[s*.32,.18,-.03]],.09,hair);taperedLock(head,[[s*.18,.58,.25],[s*.27,.35,.27],[s*.21,.17,.22]],.12,hair);}
    const scarf=cylinder(torso,scarfMat,.22,.27,.19,0,.71,0);scarf.scale.z=.9;
    const scarfTail=pivot(torso,.22,.68,.24);scarfTail.rotation.z=-.3;clothPanel(scarfTail,material('scarf-double',0xb8614d,{side:T.DoubleSide}),.23,.72,.1);r.scarf=scarfTail;
    if(type==='hero'||type==='alchemist'||boss){
      const half=type==='hero',w=half?.52:boss?1.12:.86,h=half?.65:boss?1.35:.93,cape=pivot(torso,half?-.29:0,.61,.28);
      const outer=clothPanel(cape,coat,w,h,.12),lining=clothPanel(cape,linen,w*.985,h*.985,.12);lining.position.z=-.013;
      curve(cape,[[-w*.5,0,0],[-w*.57,-h*.83,.11],[0,-h,.09],[w*.57,-h*.83,.11],[w*.5,0,0]],.011,gold,22);
      r.cape=cape;r.capeHalf=half;
    }
    // Knees, ankles, elbows and wrists give contact-aware locomotion and expressive poses.
    for(const s of [-1,1]){
      const leg=pivot(body,s*.205,1.15,0);tailoredSection(leg,dark,[[.11,-.51],[.135,-.42],[.155,-.23],[.17,-.04],[.12,.08]],.92);
      const knee=pivot(leg,0,-.48,0);ellipsoid(knee,dark,0,0,0,.13,.13,.128,true);tailoredSection(knee,leather,[[.105,-.43],[.112,-.34],[.145,-.16],[.15,-.04],[.12,.025]],.94);cylinder(knee,lightLeather,.157,.15,.045,0,-.055,0);block(knee,gold,.09,.05,.025,s*.07,-.11,-.125);
      const foot=pivot(knee,0,-.43,0);ellipsoid(foot,leather,0,-.045,-.095,.145,.12,.235);const sole=ellipsoid(foot,dark,0,-.142,-.095,.15,.033,.24);block(foot,dark,.23,.08,.18,0,-.13,.04);curve(foot,[[-.105,-.019,-.21],[0,.009,-.25],[.105,-.019,-.21]],.008,lightLeather);for(let lace=0;lace<3;lace++)curve(foot,[[-.06,.055-lace*.014,-.06-lace*.045],[.06,.055-lace*.014,-.06-lace*.045]],.006,linen,2);
      r.legs.push(leg);r.knees.push(knee);r.feet.push(foot);
      const arm=pivot(torso,s*.445,.54,0);tailoredSection(arm,coat,[[.11,-.46],[.13,-.35],[.156,-.19],[.173,-.035],[.145,.07],[.065,.12]],.87);curve(arm,[[s*-.11,.065,-.06],[0,.09,-.12],[s*.13,.025,-.07]],.01,gold,8);
      const elbow=pivot(arm,0,-.45,0);tailoredSection(elbow,coat,[[.095,-.32],[.11,-.24],[.13,-.1],[.124,.015],[.09,.06]],.88);cylinder(elbow,trim,.125,.125,.09,0,-.29,0);curve(elbow,[[-.1,-.33,-.06],[0,-.33,-.119],[.1,-.33,-.06]],.008,gold);cylinder(elbow,leather,.097,.1,.08,0,-.35,0);
      const wrist=pivot(elbow,0,-.42,0);ellipsoid(wrist,leather,0,-.015,.005,.088,.1,.071);ellipsoid(wrist,leather,s*-.07,-.028,-.055,.035,.064,.035,true);for(let finger=0;finger<4;finger++){const x=-.06+finger*.039;curve(wrist,[[x,-.035,-.05],[x,-.08,-.09],[x,-.11,-.055],[x,-.09,-.017]],.019,leather,7);}
      r.arms.push(arm);r.elbows.push(elbow);r.wrists.push(wrist);
    }
    const weapon=pivot(r.wrists[1],0,-.04,-.07);cylinder(weapon,leather,.055,.055,.28,0,-.03,0);ellipsoid(weapon,gold,0,.13,0,.075,.065,.075,true);block(weapon,gold,.4,.065,.12,0,-.18,0);
    const blade=mesh(weapon,new T.CylinderGeometry(.07,0,1.38,4),silver,0,-.89,0);blade.scale.z=.4;curve(weapon,[[0,-.22,-.033],[0,-.9,-.033],[0,-1.55,-.001]],.01,gold);r.sword=weapon;
    const bow=pivot(r.wrists[0],0,-.03,-.15);curve(bow,[[0,-.72,0],[0,-.45,-.21],[0,0,-.27],[0,.45,-.21],[0,.72,0]],.038,leather,20);curve(bow,[[0,-.72,0],[0,0,.035],[0,.72,0]],.006,linen,2);block(bow,gold,.075,.21,.075,0,0,-.27);r.bow=bow;bow.visible=type==='archer';
    if(type==='hero'){
      const strap=mesh(head,new T.TorusGeometry(.333,.018,6,28),leather,0,.615,.01);strap.rotation.x=Math.PI/2;strap.scale.z=.91;
      for(const s of [-1,1]){mesh(head,new T.TorusGeometry(.081,.017,6,20),gold,s*.114,.65,-.244);ellipsoid(head,material('glass',0x84aeb8,{roughness:.18,metalness:.4}),s*.114,.65,-.25,.066,.066,.016);}
      curve(head,[[-.03,.65,-.255],[0,.66,-.26],[.03,.65,-.255]],.01,gold);
      block(torso,leather,.5,.6,.27,0,.25,.36);block(torso,lightLeather,.52,.14,.31,0,.56,.38);block(torso,gold,.13,.12,.035,0,.4,.535);
      for(const s of [-1,1]){curve(torso,[[s*.2,.59,.41],[s*.31,.59,0],[s*.3,.52,-.27],[s*.29,-.1,-.28]],.032,leather);block(torso,gold,.08,.12,.035,s*.29,.08,-.315);}
      const roll=cylinder(torso,linen,.12,.12,.66,0,-.13,.38);roll.rotation.z=Math.PI/2;for(const s of [-1,1]){const tie=mesh(torso,new T.TorusGeometry(.13,.016,5,12),leather,s*.21,-.13,.38);tie.rotation.y=Math.PI/2;}
      const compass=pivot(body,.29,1.16,-.3);ellipsoid(compass,gold,0,0,0,.08,.09,.04,true);ellipsoid(compass,linen,0,0,-.035,.059,.065,.01,true);r.compass=compass;
    }
    if(npc){
      const apron=clothPanel(torso,linen,.53,.69,.04);apron.position.set(0,.25,-.34);block(torso,lightLeather,.3,.2,.035,0,-.09,-.385);
      if(type==='merchant'){curve(head,[[-.15,.17,-.28],[-.08,.19,-.32],[0,.16,-.32],[.08,.19,-.32],[.15,.17,-.28]],.032,darkHair);}
      if(type==='alchemist'){for(const s of [-1,1])mesh(head,new T.TorusGeometry(.105,.014,5,20),gold,s*.135,.355,-.315);curve(head,[[-.025,.37,-.32],[0,.39,-.34],[.025,.37,-.32]],.01,gold);cylinder(head,trim,.31,.36,.18,0,.76,0);for(const s of [-1,1]){ellipsoid(torso,material('bottle',s>0?0x749b98:0xb39a64,{roughness:.2}),s*.27,-.02,-.38,.055,.085,.04,true);cylinder(torso,gold,.025,.025,.045,s*.27,.075,-.38);}}
      if(type==='cook'){cylinder(head,linen,.29,.32,.25,0,.77,0);for(let k=0;k<5;k++){const a=k/5*Math.PI*2;ellipsoid(head,linen,Math.sin(a)*.18,.96,Math.cos(a)*.18,.2,.17,.18,true);}curve(r.wrists[0],[[0,-.06,-.05],[0,-.4,-.06]],.024,lightLeather,3);ellipsoid(r.wrists[0],lightLeather,0,-.47,-.06,.062,.1,.025);}
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
  // Combat clips describe whole-body silhouettes, in local rig coordinates. Their different
  // timing separates readable anticipation, a fast contact arc and weighted recovery.
  const combatClips={
    slash:{times:[0,.25,.46,.7,1],poses:[
      {spine:[.05,-.18,.02],right:[-.5,.1,.35],rElbow:[.5,0,0],left:[.2,0,-.2],lElbow:[.7,0,0]},
      {hip:[.03,-.045,.035],body:[.04,-.12,.03],spine:[.1,-.62,.04],head:[0,.32,0],right:[-1.4,.15,.8],rElbow:[1.1,0,.1],rWrist:[-.7,0,.1],left:[.4,0,-.38],lElbow:[1.0,0,0],lLeg:[-.2,0,-.04],rLeg:[.32,0,.04],lKnee:-.18,rKnee:-.38},
      {hip:[-.03,-.07,-.18],body:[-.09,.13,-.04],spine:[-.13,.62,-.08],head:[.02,-.28,0],right:[1.02,-.22,-.93],rElbow:[.2,0,0],rWrist:[.22,0,-.2],left:[-.3,0,-.45],lElbow:[.85,0,0],lLeg:[.38,0,-.04],rLeg:[-.25,0,.04],lKnee:-.42,rKnee:-.12},
      {hip:[-.03,-.045,-.09],body:[-.03,.12,0],spine:[-.06,.42,-.05],right:[.2,-.2,-1.1],rElbow:[.35,0,0],rWrist:[.35,0,-.15],left:[-.22,0,-.25],lElbow:[.5,0,0],lLeg:[.24,0,-.03],rLeg:[-.12,0,.03],lKnee:-.22,rKnee:-.1},
      {}]},
    backhand:{times:[0,.2,.43,.7,1],poses:[
      {spine:[0,.24,-.03],right:[.45,0,-.75],rElbow:[.8,0,0],left:[.1,0,-.25]},
      {hip:[-.04,-.07,.025],body:[.02,.16,-.04],spine:[.05,.76,-.1],head:[0,-.4,0],right:[.8,.25,-1.36],rElbow:[.9,0,-.1],rWrist:[-.35,0,-.45],left:[.3,0,-.52],lElbow:[.75,0,0],lLeg:[.28,0,-.06],rLeg:[-.22,0,.06],lKnee:-.4,rKnee:-.16},
      {hip:[.045,-.055,-.17],body:[-.08,-.2,.055],spine:[-.12,-.82,.08],head:[0,.4,0],right:[1.08,-.1,.96],rElbow:[.12,0,0],rWrist:[.38,0,.1],left:[-.5,0,-.32],lElbow:[.9,0,0],lLeg:[-.26,0,-.04],rLeg:[.4,0,.04],lKnee:-.15,rKnee:-.42},
      {hip:[.025,-.035,-.08],body:[-.025,-.13,.025],spine:[-.04,-.53,.04],right:[.4,-.2,1.02],rElbow:[.35,0,0],rWrist:[.25,0,.1],left:[-.3,0,-.2],lElbow:[.5,0,0],lLeg:[-.14,0,-.03],rLeg:[.24,0,.03],lKnee:-.1,rKnee:-.25},
      {}]},
    finisher:{times:[0,.33,.53,.76,1],poses:[
      {spine:[.08,-.12,0],right:[1.1,0,.25],rElbow:[.7,0,0],left:[.5,0,-.35],lElbow:[.7,0,0]},
      {hip:[0,.035,.045],body:[.04,-.1,0],spine:[.2,-.2,0],head:[-.13,.08,0],right:[2.65,.08,.22],rElbow:[.6,0,0],rWrist:[-.35,0,0],left:[1.9,0,-.25],lElbow:[1.0,0,0],lLeg:[-.14,0,-.03],rLeg:[.15,0,.03],lKnee:-.13,rKnee:-.18},
      {hip:[0,-.19,-.26],body:[-.12,.11,0],spine:[-.4,.23,0],head:[.2,-.1,0],right:[.95,0,-.14],rElbow:[.12,0,0],rWrist:[.2,0,0],left:[.65,0,-.32],lElbow:[.4,0,0],lLeg:[.52,0,-.05],rLeg:[-.3,0,.04],lKnee:-.75,rKnee:-.25,lFoot:.12,rFoot:-.12},
      {hip:[0,-.1,-.14],body:[-.06,.05,0],spine:[-.24,.14,0],right:[.35,0,-.22],rElbow:[.3,0,0],rWrist:[.1,0,0],left:[.2,0,-.28],lElbow:[.45,0,0],lLeg:[.35,0,-.03],rLeg:[-.2,0,.03],lKnee:-.42,rKnee:-.15},
      {}]},
    heavy:{times:[0,.43,.62,.81,1],poses:[
      {hip:[0,-.04,.025],spine:[.1,-.1,0],right:[.9,0,.24],rElbow:[.85,0,0],left:[.8,0,-.25],lElbow:[.9,0,0]},
      {hip:[0,-.09,.1],body:[.08,-.18,0],spine:[.25,-.36,.04],head:[-.12,.17,0],right:[2.6,.1,.2],rElbow:[.65,0,0],rWrist:[-.35,0,0],left:[2.38,0,-.16],lElbow:[.72,0,0],lLeg:[.1,0,-.09],rLeg:[.15,0,.09],lKnee:-.4,rKnee:-.5},
      {hip:[0,-.24,-.3],body:[-.16,.16,0],spine:[-.48,.35,-.02],head:[.23,-.16,0],right:[1.08,0,-.12],rElbow:[.05,0,0],rWrist:[.38,0,0],left:[.98,0,.2],lElbow:[.18,0,0],lLeg:[.58,0,-.1],rLeg:[-.34,0,.1],lKnee:-.86,rKnee:-.34,lFoot:.14,rFoot:-.15},
      {hip:[0,-.15,-.18],body:[-.08,.1,0],spine:[-.3,.22,0],right:[.45,0,-.16],rElbow:[.4,0,0],left:[.4,0,-.12],lElbow:[.5,0,0],lLeg:[.36,0,-.08],rLeg:[-.2,0,.08],lKnee:-.5,rKnee:-.25},
      {}]}
  };
  const combatJointNames=['body','spine','head','right','rElbow','rWrist','left','lElbow','lWrist','lLeg','rLeg'];
  function applyCombatClip(r,style,progress){
    const clip=combatClips[style]||combatClips.slash,a=clamp(progress,0,1),weight=smooth(a/.09)*(1-smooth((a-.75)/.25));
    let k=0;while(k<clip.times.length-2&&a>clip.times[k+1])k++;
    const t=smooth((a-clip.times[k])/(clip.times[k+1]-clip.times[k])),from=clip.poses[k],to=clip.poses[k+1];
    const joints=[r.body,r.torso,r.head,r.arms[1],r.elbows[1],r.wrists[1],r.arms[0],r.elbows[0],r.wrists[0],r.legs[0],r.legs[1]];
    for(let j=0;j<joints.length;j++){const node=joints[j],key=combatJointNames[j],start=from[key],end=to[key];if(!start&&!end)continue;for(let axis=0;axis<3;axis++){const name=axis===0?'x':axis===1?'y':'z',base=node.rotation[name];node.rotation[name]=lerp(base,lerp(start?start[axis]:base,end?end[axis]:base,t),weight);}}
    for(let i=0;i<2;i++){const knee=i?'rKnee':'lKnee',foot=i?'rFoot':'lFoot';for(const [node,key]of [[r.knees[i],knee],[r.feet[i],foot]]){const base=node.rotation.x;node.rotation.x=lerp(base,lerp(from[key]??base,to[key]??base,t),weight);}}
    const p=from.hip||[0,0,0],q=to.hip||[0,0,0];r.body.position.x+=lerp(p[0],q[0],t)*weight;r.body.position.y+=lerp(p[1],q[1],t)*weight;r.body.position.z+=lerp(p[2],q[2],t)*weight;
    return weight;
  }
  function animateStone(r,time,speed,attack,context){
    previousAnimate(r,time,speed,0,false);
    const body=r.stoneBody,a=clamp(attack,0,1),hit=smooth(context.hitReaction||0),defeat=smooth(context.defeat||0);
    body.position.set(0,0,0);body.rotation.set(0,0,0);
    if(a>0){
      const wind=smooth(a/.43),slam=smooth((a-.43)/.19),recover=smooth((a-.62)/.38),held=1-recover,raise=wind*(1-slam);
      body.position.y=.045*raise-.14*slam*held;body.position.z=-.1*slam*held;
      body.rotation.x=.12*raise-.28*slam*held;
      for(let i=0;i<2;i++){const side=i?1:-1;r.arms[i].rotation.set(2.72*raise+.98*slam*held,0,side*(.08+.16*raise));r.legs[i].rotation.x+=.12*slam*held;}
    }
    if(hit>0){body.rotation.x+=hit*.24;body.position.z+=hit*.11;body.position.y-=hit*.045;for(let i=0;i<2;i++)r.arms[i].rotation.z+=(i?1:-1)*hit*.14;}
    if(defeat>0){
      body.position.set(0,lerp(body.position.y,.22,defeat),lerp(body.position.z,.25,defeat));body.rotation.set(lerp(body.rotation.x,Math.PI*.47,defeat),0,lerp(body.rotation.z,-.12,defeat));
      for(let i=0;i<2;i++){r.arms[i].rotation.set(lerp(r.arms[i].rotation.x,.08,defeat),0,lerp(r.arms[i].rotation.z,i?.38:-.42,defeat));r.legs[i].rotation.set(lerp(r.legs[i].rotation.x,i?.12:-.07,defeat),0,0);}
    }
    r.sword.visible=false;r.bow.visible=false;
  }
  function animateCharacter(r,time,speed=0,attack=0,bow=false,context={}){
    if(r.stoneBody){animateStone(r,time,speed,attack,context);return;}
    if(!r.body){previousAnimate(r,time,speed,attack,bow);return;}
    const dt=clamp(context.dt|| (r.lastTime===undefined?1/60:time-r.lastTime),1/240,.06);r.lastTime=time;
    r.move=lerp(r.move,clamp(speed,0,1),1-Math.exp(-dt*9));const move=r.move,phase=r.phase+=(3.5+move*7.6)*dt,breath=Math.sin(time*2.15)*.008;
    r.body.position.set(0,breath+Math.abs(Math.sin(phase))*.035*move,0);r.body.rotation.set(.045*move,0,Math.sin(phase)*.025*move);
    r.torso.rotation.set(-.035*move,Math.sin(phase)*.075*move,Math.sin(phase)*.015*move);r.torso.scale.y=1+breath*.45;
    r.head.rotation.set(Math.sin(time*1.7)*.018,Math.sin(time*.55+(r.npc?1:0))*.065*(1-move),Math.sin(time*.8)*.014);
    for(let i=0;i<2;i++){
      const p=phase+i*Math.PI,swing=Math.sin(p),lift=Math.max(0,swing),s=i?1:-1;
      r.legs[i].rotation.set(swing*.62*move,0,s*.025);r.knees[i].rotation.set(-Math.max(0,-swing)*.86*move-.025,0,0);
      r.feet[i].rotation.set(-swing*.16*move-Math.max(0,-Math.cos(p))*.12*move,0,0);
      r.arms[i].rotation.set(-swing*.45*move-.06,Math.sin(p)*.035*move,s*.075);r.elbows[i].rotation.set(-.1-lift*.4*move,0,0);r.wrists[i].rotation.set(0,0,0);
      r.tails[i].rotation.set(-.12-move*.22+Math.sin(phase-.5+i*.6)*move*.11+Math.sin(time*2+i)*.025,0,s*.03);
      r.frontTails[i].rotation.x=.06+Math.max(0,Math.sin(p))*.22*move;
    }
    // Closed eyelids are a geometric squash, driven independently of walking or combat.
    const blinkPeriod=4.1+(r.type.length%3)*.47,blinkPhase=(time+r.type.length*.31)%blinkPeriod,blink=blinkPhase<.14?Math.sin(blinkPhase/.14*Math.PI):0;
    for(const eye of r.eyes)eye.scale.y=1-.96*blink;
    for(let i=0;i<r.eyelids.length;i++)r.eyelids[i].rotation.z=(i?1:-1)*(attack>0?.13:Math.sin(time*.7)*.025);
    let attackWeight=0;
    if(attack>0&&!bow)attackWeight=applyCombatClip(r,context.attackStyle|| (context.combo===2?'backhand':context.combo===3?'finisher':'slash'),attack);
    if(bow||r.type==='archer'){
      const a=clamp(attack,0,1),raise=attack>0?smooth(a/.2)*(1-smooth((a-.68)/.32)):0,draw=smooth((a-.15)/.35)*(1-smooth((a-.52)/.095)),release=smooth((a-.52)/.07)*(1-smooth((a-.62)/.25));
      r.torso.rotation.y=-.18-raise*.36;r.head.rotation.y=.14+raise*.24;r.body.position.y-=raise*.025;
      r.arms[0].rotation.set(.58+raise*.9,0,-.12);r.elbows[0].rotation.x=.15-raise*.12;r.wrists[0].rotation.x=-.13;
      r.arms[1].rotation.set(.55+raise*.55,-.18-draw*.28,.28+draw*.53+release*.14);r.elbows[1].rotation.set(.65+draw*.87-release*.3,0,.08+draw*.2);r.wrists[1].rotation.y=draw*-.3+release*.15;
      r.head.rotation.x-=release*.025;
    }
    if(context.grounded===false){const rise=clamp((context.jumpVelocity||0)/8,-1,1);r.legs[0].rotation.x=-.4;r.legs[1].rotation.x=.35;r.knees[0].rotation.x=-.85;r.knees[1].rotation.x=-.55;r.arms[0].rotation.z=-.35;r.arms[1].rotation.z=.35;r.body.rotation.x=-rise*.1;r.wasAirborne=true;}
    else if(context.grounded===true&&r.wasAirborne){r.wasAirborne=false;r.landing=.22;}
    if(r.landing>0){r.landing=Math.max(0,r.landing-dt);const settle=Math.sin(r.landing/.22*Math.PI);r.body.position.y-=settle*.12;r.knees.forEach(k=>k.rotation.x-=settle*.25);r.torso.rotation.x-=settle*.07;}
    if(context.flight){r.arms.forEach((a,i)=>a.rotation.set(.68,0,i?.18:-.18));r.elbows.forEach(e=>e.rotation.x=-.65);r.head.rotation.y=Math.sin(time*.32)*.12;r.torso.rotation.z=Math.sin(time*1.5)*.015;}
    if(r.npc&&!attack){r.arms[0].rotation.x=.18+Math.sin(time*1.2)*.08;r.elbows[0].rotation.x=-.55;r.arms[1].rotation.x=.25;r.elbows[1].rotation.x=-.6+Math.sin(time*.8)*.08;}
    r.guardMix=lerp(r.guardMix||0,context.guard&&attack<=0?1:0,1-Math.exp(-dt*15));
    if(r.guardMix>.001&&attack<=0&&!context.flight){
      const w=r.guardMix,shield=r.type==='shield';
      const arms=shield?[[1.18,.08,-.18],[.55,-.2,.48]]:[[.55,.18,-.25],[.44,-.18,-.36]],elbows=shield?[.2,1.1]:[1.05,1.7];
      for(let i=0;i<2;i++){for(let j=0;j<3;j++){const axis=j===0?'x':j===1?'y':'z';r.arms[i].rotation[axis]=lerp(r.arms[i].rotation[axis],arms[i][j],w);}r.elbows[i].rotation.x=lerp(r.elbows[i].rotation.x,elbows[i],w);}
      r.wrists[1].rotation.x=lerp(r.wrists[1].rotation.x,.47,w);r.wrists[0].rotation.x=lerp(r.wrists[0].rotation.x,shield?-.65:.1,w);
      r.body.position.y-=w*.075;r.torso.rotation.y-=w*.2;r.torso.rotation.x-=w*.07;r.head.rotation.y+=w*.14;r.knees.forEach(k=>k.rotation.x-=w*.18);
    }
    const parry=smooth(context.parry||0),hit=smooth(context.hitReaction||0);
    if(parry>0){r.torso.rotation.y-=parry*.23;r.torso.rotation.x-=parry*.05;r.arms[1].rotation.x+=parry*.38;r.arms[0].rotation.x+=parry*.28;r.elbows[1].rotation.x-=parry*.32;r.wrists[1].rotation.z-=parry*.32;r.body.position.z+=parry*.055;r.head.rotation.y+=parry*.12;}
    const dodging=(context.dodge||0)>0||(context.dodgeProgress||0)>0;
    let dodgeWeight=0;
    if(dodging){
      const a=Number.isFinite(context.dodgeProgress)?clamp(context.dodgeProgress,0,1):clamp(1-context.dodge/.3,0,1),side=clamp(context.dodgeSide??1,-1,1),d=smooth(a/.18)*(1-smooth((a-.68)/.32));dodgeWeight=d;
      r.body.position.y-=d*.24;r.body.position.x+=side*d*.09;r.body.rotation.z-=side*d*.22;r.torso.rotation.x=lerp(r.torso.rotation.x,-.48,d);r.head.rotation.x+=d*.2;
      r.legs[0].rotation.x=lerp(r.legs[0].rotation.x,.36-side*.12,d);r.legs[1].rotation.x=lerp(r.legs[1].rotation.x,.36+side*.12,d);r.knees.forEach(k=>k.rotation.x=lerp(k.rotation.x,-.82,d));
      for(let i=0;i<2;i++){r.arms[i].rotation.x=lerp(r.arms[i].rotation.x,.36,d);r.arms[i].rotation.z=lerp(r.arms[i].rotation.z,i?.14:-.14,d);r.elbows[i].rotation.x=lerp(r.elbows[i].rotation.x,1.4,d);}
    }
    if(hit>0){r.body.position.z+=hit*.12;r.body.position.y-=hit*.045;r.torso.rotation.x+=hit*.43;r.torso.rotation.z-=hit*.1;r.head.rotation.x+=hit*.22;r.arms.forEach((a,i)=>{a.rotation.x-=hit*.35;a.rotation.z+=(i?1:-1)*hit*.18;});r.knees.forEach(k=>k.rotation.x-=hit*.16);for(const eye of r.eyes)eye.scale.y*=1-hit*.7;}
    const defeated=smooth(context.defeat||0);
    if(defeated>0){
      r.body.position.set(0,lerp(r.body.position.y,.16,defeated),lerp(r.body.position.z,.12,defeated));r.body.rotation.set(lerp(r.body.rotation.x,Math.PI*.48,defeated),0,lerp(r.body.rotation.z,-.14,defeated));
      r.torso.rotation.set(lerp(r.torso.rotation.x,.04,defeated),lerp(r.torso.rotation.y,.08,defeated),0);r.head.rotation.set(lerp(r.head.rotation.x,-.08,defeated),lerp(r.head.rotation.y,.2,defeated),lerp(r.head.rotation.z,.12,defeated));
      r.torso.scale.y=lerp(r.torso.scale.y,1,defeated);
      for(let i=0;i<2;i++){r.arms[i].rotation.set(lerp(r.arms[i].rotation.x,.12,defeated),0,lerp(r.arms[i].rotation.z,i?.54:-.62,defeated));r.elbows[i].rotation.set(lerp(r.elbows[i].rotation.x,.2,defeated),0,lerp(r.elbows[i].rotation.z,0,defeated));r.wrists[i].rotation.set(lerp(r.wrists[i].rotation.x,.06,defeated),lerp(r.wrists[i].rotation.y,0,defeated),lerp(r.wrists[i].rotation.z,0,defeated));r.legs[i].rotation.x=lerp(r.legs[i].rotation.x,i?.12:-.05,defeated);r.knees[i].rotation.x=lerp(r.knees[i].rotation.x,i?-.3:-.1,defeated);r.feet[i].rotation.x=lerp(r.feet[i].rotation.x,.05,defeated);r.eyes[i].scale.y=lerp(r.eyes[i].scale.y,.02,defeated);}
    }
    // Secondary motion follows actual torso rotation and acceleration; the spring settles
    // after attacks instead of snapping the scarf and coat to the neutral animation.
    const angularVelocity=clamp((r.torso.rotation.y-(r.lastCombatYaw??r.torso.rotation.y))/dt,-5,5);r.lastCombatYaw=r.torso.rotation.y;
    r.clothCombat=lerp(r.clothCombat||0,-r.torso.rotation.y*.22-angularVelocity*.035,1-Math.exp(-dt*11));
    const cloth=r.clothCombat,clothKick=attackWeight*.1+dodgeWeight*.17+hit*.09;
    r.scarf.rotation.x=-.15-move*.65+Math.sin(time*3.7)*.08-clothKick;r.scarf.rotation.z=-.3+Math.sin(time*2.6)*.06+cloth;
    if(r.cape){r.cape.rotation.x=-.04-move*.28+Math.sin(time*2.3)*.035-clothKick;r.cape.rotation.z=(r.capeHalf?-.13:0)+Math.sin(time*1.8)*.025+Math.sin(phase)*move*.035+cloth*.6;}
    for(let i=0;i<2;i++){r.tails[i].rotation.z+=cloth*.35;r.tails[i].rotation.x-=clothKick*.6;r.frontTails[i].rotation.z=cloth*.18;}
    if(r.compass)r.compass.rotation.z=Math.sin(phase-.5)*move*.15;
    r.sword.visible=!bow&&!r.npc&&!context.flight;r.bow.visible=(bow||r.type==='archer')&&!context.flight;
  }
  M.character=character;M.animateCharacter=animateCharacter;
  M.characterArtStatus=()=>({version:4,combatAnimationVersion:2,generatedTextures:7,newGeneratedTextures:4,sharedPBRAtlas:true,textures:{...assetState},rigs:rigs.length,articulatedRigs:rigs.filter(r=>r.body).length,features:['sculpted-face','geometric-blink','woven-embroidery','tapered-hair','knee-elbow-rig','foot-roll','attack-phases','secondary-cloth','tailored-sleeves','curled-fingers','layered-cape','shared-PBR-atlas','three-hit-combo','heavy-strike','guard-parry','hit-defeat','directional-dodge']});
})();
