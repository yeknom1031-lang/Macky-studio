/* Original geometry and animation rigs. Three.js is vendored under its MIT license. */
window.SkyModels = (() => {
  'use strict';
  const T=THREE, palette={wood:0x925b37,lightWood:0xbc8850,darkWood:0x563e2e,brass:0xc99b51,gold:0xf4ce7d,teal:0x267f84,cyan:0x6ff4ef,cream:0xffedcb,coral:0xcd6454,stone:0x99a6a1,grass:0x8cad57,skin:0xe4ad7c,navy:0x213d4a};
  const mats={};
  function mat(c,opts={}){const k=String(c)+JSON.stringify(opts);if(mats[k])return mats[k];const material=new T.MeshStandardMaterial({color:c,roughness:.76,flatShading:false,...opts});material.color.convertSRGBToLinear();if(opts.emissive)material.emissive.convertSRGBToLinear();return mats[k]=material;}
  function mesh(g,c,parent,x=0,y=0,z=0,opts={}){const m=new T.Mesh(g,typeof c==='object'?c:mat(c,opts));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m;}
  const boxGeometries={};
  function bevelBox(w,h,d){const key=[w,h,d].join(',');if(boxGeometries[key])return boxGeometries[key];const b=Math.min(.065,w*.12,h*.12,d*.12),shape=new T.Shape();shape.moveTo(-w/2+b,-h/2+b);shape.lineTo(w/2-b,-h/2+b);shape.lineTo(w/2-b,h/2-b);shape.lineTo(-w/2+b,h/2-b);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:d-2*b,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:b,bevelThickness:b,curveSegments:1});g.translate(0,0,-d/2+b);return boxGeometries[key]=g;}
  function box(p,w,h,d,c,x=0,y=0,z=0){return mesh(bevelBox(w,h,d),c,p,x,y,z);}
  function cyl(p,rt,rb,h,c,x=0,y=0,z=0,n=10){return mesh(new T.CylinderGeometry(rt,rb,h,n),c,p,x,y,z);}
  function ball(p,r,c,x=0,y=0,z=0,detail=0){return mesh(detail ? new T.SphereGeometry(r,16,12) : new T.IcosahedronGeometry(r,1),c,p,x,y,z);}
  function torus(p,r,tube,c,x=0,y=0,z=0){return mesh(new T.TorusGeometry(r,tube,5,16),c,p,x,y,z);}
  function seeded(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function beam(p,a,b,width,color){const av=new T.Vector3(...a),bv=new T.Vector3(...b),m=box(p,width,av.distanceTo(bv),width,color);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;}
  // Deterministic silhouettes and layered rock keep every island recognizable in flight.
  function cliff(radius,seed=1){
    const rng=seeded(seed),n=24,rings=[[-.6,1],[-2.2,.99],[-5.5,.93],[-7,.87],[-12,.74],[-16,.53],[-23,.28],[-28,.06]],points=[];
    const jitter=Array.from({length:n},()=>.88+rng()*.15);
    for(const [y,r] of rings)for(let k=0;k<n;k++){const angle=k/n*Math.PI*2;points.push(new T.Vector3(Math.sin(angle)*radius*r*jitter[k],y-rng()*.8,Math.cos(angle)*radius*r*jitter[k]));}
    const positions=[],colors=[],uvs=[],c=new T.Color(),strata=[0xb1bbaf,0xc3c3af,0xa4b5ae,0xd0cbb5,0xb3bfb3,0x94aba8,0xb6c1b1];
    for(let j=0;j<rings.length-1;j++)for(let k=0;k<n;k++)for(const face of [[j*n+k,(j+1)*n+k,j*n+(k+1)%n],[j*n+(k+1)%n,(j+1)*n+k,(j+1)*n+(k+1)%n]]){c.setHex(strata[j]).multiplyScalar(.9+rng()*.2).convertSRGBToLinear();for(const i of face){positions.push(...points[i].toArray());colors.push(c.r,c.g,c.b);uvs.push(((i%n===0&&k===n-1)?n:i%n)/n*6,points[i].y/8);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();return new T.Mesh(geo,mat(0xffffff,{vertexColors:true,flatShading:true,roughness:.96}));
  }
  // Instancing adds ground detail without a separate draw call for every flower or leaf.
  function scatter(parent,geometry,material,transforms){const inst=new T.InstancedMesh(geometry,material,transforms.length),d=new T.Object3D();transforms.forEach((t,i)=>{d.position.set(...t.p);d.scale.set(...(t.s||[1,1,1]));d.rotation.set(...(t.r||[0,0,0]));d.updateMatrix();inst.setMatrixAt(i,d.matrix);});inst.castShadow=true;inst.receiveShadow=true;parent.add(inst);return inst;}
  function island(radius,seed=1,theme='grass'){
    const p=new T.Group(),rng=seeded(seed),rock=cliff(radius,seed);rock.receiveShadow=rock.castShadow=true;p.add(rock);
    cyl(p,radius*.94,radius,.9,theme==='storm'?0x647f80:theme==='ancient'?0x7f9e91:0x91ad62,0,-.25,0,32);
    const stones=[],leaves=[],flowers=[];
    for(let i=0;i<42;i++){const a=rng()*Math.PI*2,d=radius*(.83+rng()*.07),size=.45+rng()*1.15;stones.push({p:[Math.sin(a)*d,-.05,Math.cos(a)*d],s:[size,.4*size,size*.8],r:[0,a,0]});if(i%3===0)for(let j=0;j<7;j++)leaves.push({p:[Math.sin(a)*(d-j*.08),-.5-j*.62,Math.cos(a)*(d-j*.08)],s:[.4,.23,.5],r:[0,a+j,0]});}
    for(let i=0;i<75;i++){const a=rng()*Math.PI*2,d=radius*(.65+rng()*.2);flowers.push({p:[Math.sin(a)*d,.38,Math.cos(a)*d],s:[.11,.15,.11]});}
    scatter(p,new T.IcosahedronGeometry(1,1),mat(0xa2aa8c),stones);scatter(p,new T.SphereGeometry(1,6,4),mat(0x476f50),leaves);scatter(p,new T.SphereGeometry(1,6,4),mat(seed%2?0xf4d2a5:0xf4d67f),flowers);
    if(radius>20&&theme!=='storm'){
      const a=-1.9,x=Math.sin(a)*radius*.88,z=Math.cos(a)*radius*.88,water=new T.Group();water.position.set(x,-.45,z);water.rotation.y=a;p.add(water);
      const curtain=mesh(new T.PlaneGeometry(2.5,24,3,12),mat(0xa2e5e6,{transparent:true,opacity:.65,side:T.DoubleSide,roughness:.24,emissive:0x245d67,emissiveIntensity:.25,depthWrite:false}),water,0,-12,0);curtain.castShadow=false;
      for(const x of [-.75,0,.7]){const ribbon=mesh(new T.PlaneGeometry(.12,22),mat(0xe0f8ee,{transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false}),water,x,-11.5,.04);ribbon.castShadow=false;}
      const mist=[];for(let i=0;i<9;i++)mist.push({p:[(rng()-.5)*4,-24+rng()*2,(rng()-.5)*3],s:[1+rng(),.6,1+rng()]});const foam=scatter(water,new T.SphereGeometry(1,8,6),mat(0xd8f1ea,{transparent:true,opacity:.38,depthWrite:false}),mist);foam.castShadow=false;
    }return p;
  }
  function tree(p,x,z,s=1,type=0){
    const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);p.add(g);cyl(g,.23,.42,3.8,0x71533b,0,1.9,0,10);
    for(const side of [-1,1])beam(g,[0,1.7,0],[side*1.2,3.4,.2],.2,0x71533b);
    if(type===0){for(let i=0;i<4;i++)cyl(g,.15,2.05-i*.37,2.4, [0x365c4c,0x42765a,0x5b8961,0x7aa16c][i],0,3+i*.9,0,10);}
    else{const colors=[0x416b4e,0x59865a,0x7ba46b];for(let i=0;i<7;i++){const a=i*2.4,m=ball(g,i===0?2:1.35,colors[i%3],Math.sin(a)*(i?1.15:0),3.9+(i%3)*.55,Math.cos(a)*(i?1:0),1);m.scale.y=.85;}}
    return g;
  }
  function grass(p,x,z,scale=1){const g=new T.Group();g.position.set(x,.2,z);g.scale.setScalar(scale);p.add(g);for(let i=0;i<3;i++){const blade=cyl(g,0,.16,.55+i*.13,[0x91af60,0x75984d,0xa8c574][i],(i-1)*.2,.25,0,3);blade.rotation.z=(i-1)*.2;}return g;}
  function plankFloor(p,w,d,y=.1){for(let i=0;i<Math.ceil(d/.65);i++){const board=box(p,w,.16,.59,i%3?palette.lightWood:0xae7944,0,y,-d/2+.33+i*.65),g=board.geometry.clone(),uv=g.attributes.uv,position=g.attributes.position,normal=g.attributes.normal;for(let v=0;v<uv.count;v++){if(Math.abs(normal.getY(v))>.5)uv.setXY(v,(position.getZ(v)/.59+.5)*.18+(i%4)*.25,position.getX(v)*.2+i*.12);else uv.setXY(v,position.getX(v)*.15,position.getY(v)*.15);}board.geometry=g;}}
  function railing(p,x,z,alongX,len){const count=Math.floor(len/2.8);for(let i=0;i<=count;i++)box(p,.18,1.25,.18,palette.darkWood,x+(alongX?i*len/count:0),.85,z+(alongX?0:i*len/count));const m=box(p,alongX?len:.15,.16,alongX?.15:len,palette.lightWood,x+(alongX?len/2:0),1.25,z+(alongX?0:len/2));return m;}
  function dock(p,z,r=7){const g=new T.Group();g.position.z=z;p.add(g);plankFloor(g,r*2,11,.05);for(const x of [-r,r]){railing(g,x,-5.3,false,7);for(const q of [-4,4])cyl(g,.22,.24,6,palette.darkWood,x,-1.3,q,7);}return g;}
  function barrel(p,x,z,scale=1){const g=new T.Group();p.add(g);g.position.set(x,0,z);g.scale.setScalar(scale);cyl(g,.58,.54,1.2,palette.wood,0,.65,0,10);for(const y of [.18,1.05])torus(g,.56,.045,0x4d5957,0,y,0).rotation.x=Math.PI/2;box(g,.8,.05,.15,palette.lightWood,0,1.27,0);return g;}
  function crate(p,x,z,s=1){const g=new T.Group();p.add(g);g.position.set(x,s*.5,z);box(g,s,s,s,palette.wood);for(const y of [-s*.38,s*.38])box(g,s*1.05,.1,s*1.05,palette.lightWood,0,y,0);beam(g,[-s/2,-s/2,s/2+.03],[s/2,s/2,s/2+.03],.12,palette.lightWood);return g;}
  function lantern(p,x,y,z){const g=new T.Group();g.position.set(x,y,z);p.add(g);box(g,.42,.58,.42,mat(0xffd282,{emissive:0xffbb55,emissiveIntensity:.65}));for(const a of [-.23,.23])for(const b of [-.23,.23])box(g,.045,.65,.045,palette.darkWood,a,0,b);cyl(g,0,.4,.32,palette.darkWood,0,.46,0,4);box(g,.6,.1,.6,palette.darkWood,0,-.35,0);return g;}
  function sign(p,text,x,y,z,color=palette.darkWood){const c=document.createElement('canvas');c.width=256;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#62452e';ctx.fillRect(0,0,256,192);ctx.strokeStyle='#c8a96e';ctx.lineWidth=9;ctx.strokeRect(8,8,240,176);ctx.fillStyle='#fff0c6';ctx.font='bold 110px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,104);const texture=new T.CanvasTexture(c);texture.encoding=T.sRGBEncoding;return mesh(new T.BoxGeometry(2.5,1.8,.18),new T.MeshStandardMaterial({map:texture,roughness:1}),p,x,y,z);}
  function potion(p,color,x,y,z,s=1){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(s);p.add(g);const b=ball(g,.27,color,0,.28,0,1);b.scale.y=1.1;cyl(g,.11,.11,.24,0xc7e8e7,0,.61,0,8);cyl(g,.14,.14,.09,palette.wood,0,.77,0,8);return g;}
  function stall(p,x,z,color,type){const g=new T.Group();g.position.set(x,0,z);p.add(g);for(const a of [-3.4,3.4])for(const b of [-1.8,1.8])box(g,.19,4.6,.19,palette.darkWood,a,2.3,b);box(g,6.9,1.1,1.6,palette.wood,0,.75,1.3);box(g,7.3,.2,2,palette.lightWood,0,1.4,1.3);const canopy=new T.PlaneGeometry(7.8,5.5,10,12),cp=canopy.attributes.position;for(let i=0;i<cp.count;i++){const depth=cp.getY(i);cp.setXYZ(i,cp.getX(i),4.8+Math.cos(depth/5.5*Math.PI)*.38-depth*.08,depth);}canopy.computeVertexNormals();const canopyCanvas=document.createElement('canvas');canopyCanvas.width=512;canopyCanvas.height=256;const canopyCtx=canopyCanvas.getContext('2d');canopyCtx.fillStyle='#'+color.toString(16).padStart(6,'0');canopyCtx.fillRect(0,0,512,256);canopyCtx.fillStyle='#f1e1bd';for(let i=0;i<7;i+=2)canopyCtx.fillRect(i*512/7,0,512/7,256);const canopyMap=new T.CanvasTexture(canopyCanvas);canopyMap.encoding=T.sRGBEncoding;mesh(canopy,mat(0xffffff,{map:canopyMap,side:T.DoubleSide,roughness:1}),g);for(let i=0;i<7;i++){const val=box(g,1.08,.5,.12,i%2===0?color:palette.cream,-3.25+i*1.08,4.35,2.75);val.rotation.x=.08;}sign(g,type==='potion'?'薬':type==='weapon'?'剣':'食',0,5.55,.3);for(const a of [-3,3])lantern(g,a,3.2,1.8);if(type==='potion'){[0xe66073,0x946be3,0x49b3e9,0xf2aa3c].forEach((c,i)=>potion(g,c,-2+i*1.3,1.55,1.4,1.2));box(g,6,2,.4,palette.darkWood,0,2.3,-1.5);for(let i=0;i<6;i++)potion(g,[0xe66073,0x49b3e9,0x946be3][i%3],-2.3+i*.9,2.5,-1.1,.7);}else if(type==='weapon'){for(let i=0;i<3;i++){const sword=new T.Group();sword.position.set(-2+i*1.1,2,1.6);sword.rotation.z=(i-1)*.2;g.add(sword);box(sword,.14,1.7,.07,0xc4d6d4,0,.3,0);box(sword,.6,.11,.13,palette.gold,0,-.55,0);box(sword,.13,.43,.13,palette.darkWood,0,-.8,0);}const b=torus(g,.9,.055,palette.wood,2,2.1,1.6);b.scale.x=.5;}else{for(let i=0;i<5;i++)ball(g,.3,[0xd98642,0x9bba61,0xe2b95f][i%3],-2+i,1.8,1.4);box(g,2.3,.2,.8,palette.cream,0,1.65,1.4);}barrel(g,-4,1.6,.9);crate(g,4.2,1.5,1.1);return g;}
  function arch(p,x,z,scale=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);p.add(g);for(const a of [-2,2])for(let i=0;i<4;i++)box(g,1.1,.85,1.25,i%2?0xb3bcab:0xa1afa4,a,.5+i*.9,0);for(let i=0;i<5;i++){const a=(i+.5)/5*Math.PI;const b=box(g,1,.9,1.25,0xbdc5b1,Math.cos(a)*2,3.5+Math.sin(a)*1.7,0);b.rotation.z=a-Math.PI/2;}return g;}
  function chest(p,x,z){const g=new T.Group();g.position.set(x,0,z);p.add(g);box(g,1.8,.9,1.15,palette.wood,0,.6,0);const lid=new T.Group();lid.position.set(0,1.1,-.55);g.add(lid);box(lid,1.9,.45,1.2,palette.darkWood,0,.16,.55);for(const a of [-.6,.6]){box(g,.14,1.1,1.22,palette.brass,a,.64,0);box(lid,.16,.48,1.24,palette.brass,a,.17,.55);}box(g,.26,.33,.1,palette.gold,0,.85,.64);return{group:g,lid};}
  function windmill(p,x,z){const g=new T.Group();g.position.set(x,0,z);p.add(g);cyl(g,1.6,2.4,8,0xc2c7ad,0,4,0,10);cyl(g,0,2,2,0x668f8b,0,9,0,8);box(g,1.1,2,.1,palette.darkWood,0,1.2,2.1);const rotor=new T.Group();rotor.position.set(0,7,1.8);g.add(rotor);for(let i=0;i<4;i++){const blade=new T.Group();blade.rotation.z=i*Math.PI/2;rotor.add(blade);box(blade,.18,5.3,.18,palette.wood,0,2.4,0);box(blade,1.3,3.6,.1,i%2?palette.teal:palette.cream,.4,3,0);}cyl(rotor,.55,.55,.4,palette.brass,0,0,.1).rotation.x=Math.PI/2;return{group:g,rotor};}
  function vane(p,x,z){const g=new T.Group();g.position.set(x,0,z);p.add(g);cyl(g,.85,1,1,0xa7b6a6,0,.5,0,8);cyl(g,.1,.13,1.8,palette.brass,0,1.6,0,8);const turn=new T.Group();turn.position.y=2.5;g.add(turn);box(turn,2.8,.12,.12,palette.brass);const tip=cyl(turn,0,.5,1,palette.gold,-1.7,0,0,3);tip.rotation.z=Math.PI/2;box(turn,.65,.65,.1,palette.brass,1.4,0,0);return{group:g,turn};}
  function character(type='hero'){
    const g=new T.Group(),boss=type==='boss',stone=type==='stone',npc=['merchant','alchemist','cook'].includes(type);
    const skin=stone?0x9eac9f:0xe5b389,coat=stone?0x8c9f98:boss?0x903f46:type==='shield'?0x3f5963:type==='archer'?0x78604d:type==='pirate'?0x8d5151:npc?0x597f75:0x226c77;
    const rig={group:g,type,legs:[],arms:[],materials:[]};
    const leather=mat(0x543b2e,{roughness:.65}),metal=mat(0xc7a365,{metalness:.65,roughness:.32}),cloth=mat(coat,{roughness:.95});
    const torso=cyl(g,.41,.35,.98,cloth,0,1.62,0,16);torso.scale.z=.72;
    box(g,.29,.74,.08,0xe9dcc2,0,1.65,-.3);
    for(const side of [-1,1]){const lapel=box(g,.18,.69,.09,coat,side*.23,1.72,-.32);lapel.rotation.z=side*.2;beam(g,[side*.16,1.99,-.37],[side*.29,1.48,-.33],.025,metal);const tail=box(g,.39,.58,.13,coat,side*.23,1.01,.22);tail.rotation.x=-.2;const shoulder=ball(g,.22,cloth,side*.49,1.97,0,1);shoulder.scale.y=.55;}
    const waist=cyl(g,.39,.4,.16,leather,0,1.2,0,16);waist.scale.z=.74;box(g,.2,.15,.07,metal,0,1.2,-.33);
    for(const y of [1.39,1.58,1.77])for(const side of [-1,1])ball(g,.035,metal,side*.15,y,-.36,1);
    if(stone){box(g,.72,.7,.62,skin,0,2.45,0);ball(g,.22,mat(palette.cyan,{emissive:palette.cyan,emissiveIntensity:.7}),0,1.7,-.27,1);for(const x of [-.18,.18])box(g,.11,.08,.04,palette.cyan,x,2.5,-.33);}
    else{
      cyl(g,.14,.15,.25,skin,0,2.16,0,12);const head=ball(g,.43,mat(skin,{roughness:.8}),0,2.49,0,1);head.scale.set(.84,1,.85);
      for(const side of [-1,1]){const ear=ball(g,.09,skin,side*.36,2.45,0,1);ear.scale.z=.55;ball(g,.068,0xf2e9d3,side*.14,2.49,-.316,1).scale.set(1,.7,.25);ball(g,.037,0x263e40,side*.14,2.49,-.334,1).scale.z=.3;beam(g,[side*.08,2.59,-.32],[side*.22,2.6,-.3],.035,0x453630);}
      ball(g,.065,skin,0,2.39,-.36,1).scale.y=1.2;box(g,.1,.019,.025,0x9e5f4b,0,2.28,-.327);
      const hair=ball(g,.445,0x382e2b,0,2.68,.055,1);hair.scale.set(.88,.65,.92);for(let i=0;i<7;i++){const a=i*.85,h=ball(g,.17,0x42332b,Math.sin(a)*.29,2.72+(i%2)*.06,Math.cos(a)*.28,1);h.scale.set(1,1.15,1.3);}
      const scarf=cyl(g,.24,.3,.21,boss?0xc7a365:0xba5945,0,2.1,0,16);const tail=box(g,.25,.82,.06,boss?0xc7a365:0xba5945,.31,1.82,.31);tail.rotation.z=-.32;rig.scarf=tail;
      if(type==='hero'){
        // Leather aviator cap, brass goggles and a small compass distinguish the player.
        const strap=torus(g,.38,.035,leather,0,2.7,0);strap.rotation.x=Math.PI/2;strap.scale.z=.9;
        for(const side of [-1,1]){torus(g,.115,.028,metal,side*.14,2.74,-.31);const glass=ball(g,.095,mat(0x83d1d4,{metalness:.35,roughness:.13}),side*.14,2.74,-.32,1);glass.scale.z=.3;}
        const pack=box(g,.51,.6,.26,leather,0,1.63,.4);box(g,.56,.16,.29,0x8c6341,0,1.91,.41);for(const side of [-1,1]){beam(g,[side*.21,1.99,.36],[side*.2,1.32,.39],.055,metal);beam(g,[side*.3,1.95,-.25],[side*.33,1.26,-.25],.065,leather);}box(g,.15,.13,.04,metal,0,1.74,.55);
        const roll=cyl(g,.12,.12,.7,0xc6b998,0,1.24,.4,12);roll.rotation.z=Math.PI/2;
        const compass=ball(g,.1,metal,.31,1.24,-.26,1);compass.scale.z=.4;
      }
    }
    for(const side of [-1,1]){
      const leg=new T.Group();leg.position.set(side*.23,1.1,0);g.add(leg);cyl(leg,.18,.145,.68,stone?skin:0x494b4b,0,-.3,0,12);cyl(leg,.18,.19,.38,leather,0,-.7,0,12);box(leg,.34,.24,.5,leather,0,-.94,-.07);box(leg,.36,.07,.52,0x302f2b,0,-1.06,-.07);box(leg,.15,.07,.025,metal,0,-.7,-.19);rig.legs.push(leg);
      const arm=new T.Group();arm.position.set(side*.52,1.94,0);g.add(arm);cyl(arm,.18,.13,.61,cloth,0,-.25,0,12);cyl(arm,.145,.15,.13,metal,0,-.56,0,12);cyl(arm,.115,.13,.27,stone?skin:leather,0,-.73,-.015,12);ball(arm,.14,stone?skin:leather,0,-.89,-.015,1);rig.arms.push(arm);
    }
    const weapon=new T.Group();weapon.position.set(-.02,-.85,-.15);rig.arms[1].add(weapon);cyl(weapon,.075,.075,.4,leather,0,-.04,0,12);box(weapon,.55,.1,.17,metal,0,-.25,0);const blade=mesh(new T.CylinderGeometry(0,.1,1.65,4),mat(0xd9e9e7,{metalness:.8,roughness:.23}),weapon,0,-1.12,0);blade.rotation.z=Math.PI;rig.sword=weapon;
    const bow=new T.Group();bow.position.set(0,-.65,-.3);rig.arms[0].add(bow);const bowMesh=mesh(new T.TorusGeometry(.7,.05,8,24,Math.PI),leather,bow);bowMesh.rotation.z=-Math.PI/2;bowMesh.scale.x=.65;beam(bow,[0,-.7,0],[0,.7,0],.012,palette.cream);rig.bow=bow;bow.visible=type==='archer';
    if(type==='shield'){const shield=new T.Group();shield.position.set(-.1,-.4,-.3);rig.arms[0].add(shield);box(shield,.85,1.4,.16,palette.navy);for(const x of [-.43,.43])box(shield,.1,1.45,.22,metal,x,0,0);box(shield,.8,.1,.22,metal);}
    if(boss){const hat=cyl(g,.35,.85,.4,0x272e36,0,3,0,3);hat.rotation.y=Math.PI/6;box(g,.45,.2,.03,metal,0,3.04,-.5);const beard=cyl(g,.27,0,.45,0x453630,0,2.17,-.14,10);for(const side of [-1,1]){ball(g,.3,metal,side*.52,2,0,1).scale.y=.5;}const hook=mesh(new T.TorusGeometry(.35,.1,8,18,Math.PI*1.4),metal,rig.arms[0],0,-1.1,-.1);hook.rotation.z=.6;g.scale.setScalar(1.6);}
    else if(type==='pirate'||type==='archer')box(g,.75,.15,.65,palette.coral,0,2.77,0);
    else if(type==='alchemist'){cyl(g,.37,.44,.3,0xd6dcce,0,2.8,0,16);for(const x of [-.14,.14])torus(g,.12,.02,metal,x,2.49,-.34);}
    else if(type==='cook')cyl(g,.44,.32,.5,palette.cream,0,3,0,16);
    if(npc){weapon.visible=false;rig.arms[0].rotation.x=-.35;rig.arms[1].rotation.x=-.6;}if(stone){weapon.visible=false;g.scale.setScalar(1.18);}
    for(const limb of [...rig.legs,...rig.arms])batchStatic(limb,new Set([weapon,bow]));
    batchStatic(g,new Set([...rig.legs,...rig.arms,rig.scarf]));return rig;
  }
  function animateCharacter(r,time,speed=0,attack=0,bow=false){const move=Math.min(speed,1);r.legs.forEach((l,i)=>l.rotation.x=Math.sin(time*10+i*Math.PI)*.6*move);r.arms.forEach((a,i)=>{a.rotation.x=Math.sin(time*10+(i?0:Math.PI))*.4*move;a.rotation.z=(i?-.06:.06);});if(attack>0){r.arms[1].rotation.x=-1.5+Math.sin(attack*Math.PI)*1.2;r.arms[1].rotation.z=-Math.sin(attack*Math.PI)*1.2;}if(bow){r.arms[0].rotation.x=-1.4;r.arms[1].rotation.x=-1.2;r.arms[1].rotation.z=-.5;}if(r.scarf){r.scarf.rotation.x=.15+Math.sin(time*4)*.1+move*.25;}r.sword.visible=!bow&&r.type!=='stone'&&r.type!=='merchant'&&r.type!=='alchemist'&&r.type!=='cook';r.bow.visible=bow||r.type==='archer';}
  function rope(p,points,r=.025,color=0x66553c){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),24,r,5,false),color,p);}
  function sailCloth(enemy){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=768;const ctx=canvas.getContext('2d'),rng=seeded(82);
    ctx.fillStyle=enemy?'#873e43':'#eee0b7';ctx.fillRect(0,0,768,768);ctx.fillStyle=enemy?'#342e39':'#246570';ctx.fillRect(262,0,244,768);
    for(let i=0;i<3500;i++){ctx.fillStyle=i%2?'#ffffff09':'#392e2410';ctx.fillRect(rng()*768,rng()*768,1,5+rng()*24);}
    ctx.strokeStyle='#bc965f';ctx.lineWidth=9;ctx.strokeRect(22,20,724,728);ctx.lineWidth=2;ctx.strokeRect(36,34,696,700);
    ctx.save();ctx.translate(384,365);ctx.strokeStyle='#e9ce92';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,92,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#f7e5af';ctx.beginPath();ctx.moveTo(0,-146);ctx.lineTo(27,-23);ctx.lineTo(139,0);ctx.lineTo(27,25);ctx.lineTo(0,150);ctx.lineTo(-27,25);ctx.lineTo(-139,0);ctx.lineTo(-27,-23);ctx.closePath();ctx.fill();
    ctx.fillStyle=enemy?'#873e43':'#286975';ctx.beginPath();ctx.moveTo(0,-89);ctx.lineTo(14,0);ctx.lineTo(0,90);ctx.lineTo(-14,0);ctx.closePath();ctx.fill();
    for(const side of [-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(side*60,25+i*22);ctx.lineTo(side*(175-i*18),-5+i*22);ctx.lineTo(side*110,62+i*15);ctx.closePath();ctx.fillStyle='#e9ce92';ctx.fill();}ctx.restore();
    const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;return mat(0xffffff,{map:texture,side:T.DoubleSide,roughness:1});
  }
  function ship(enemy=false){
    const g=new T.Group(),w=enemy?7:3.1,L=enemy?14:7,wood=mat(palette.wood),brass=mat(0xb79152,{metalness:.7,roughness:.35});
    // A closed curved hull replaces the rectangular floor and open-bottom wedge.
    const outline=[],n=40;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;outline.push([Math.sin(a)*w*(.86+.14*Math.cos(a)),Math.cos(a)*L*1.08]);}
    const pos=[],uv=[];for(let ring=0;ring<3;ring++)for(let i=0;i<n;i++){const next=(i+1)%n,levels=[0,-.85,-1.9,-2.65],factors=[1,.94,.69,.1];for(const [k,j] of [[i,ring],[next,ring],[i,ring+1],[next,ring],[next,ring+1],[i,ring+1]]){pos.push(outline[k][0]*factors[j],levels[j],outline[k][1]*(.85+.15*factors[j]));uv.push(k/n*4,j*.35);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();mesh(geo,wood,g);
    const deck=new T.Shape();outline.forEach(([x,z],i)=>i?deck.lineTo(x,-z):deck.moveTo(x,-z));deck.closePath();const deckMesh=mesh(new T.ShapeGeometry(deck),palette.darkWood,g,0,.02,0);deckMesh.rotation.x=-Math.PI/2;
    for(let z=-L+.2;z<L;z+=.62){const fraction=z/(L*1.08),width=Math.sqrt(Math.max(0,1-fraction*fraction))*w*2*(.86+.14*fraction);const board=new T.Group();board.position.z=z;g.add(board);plankFloor(board,width,.6,.12);}
    for(const y of [-.4,-1.15,-1.95]){const factor=1+y*.12;rope(g,[...outline,outline[0]].map(([x,z])=>[x*factor,y,z*(.85+.15*factor)]),.065,y===-1.15?brass:palette.darkWood);}
    const posts=[];for(let i=0;i<n;i+=2){const [x,z]=outline[i];posts.push({p:[x,.68,z],s:[.11,1.1,.11]});}scatter(g,new T.CylinderGeometry(1,1,1,8),brass,posts);
    rope(g,[...outline,outline[0]].map(([x,z])=>[x,1.22,z]),.085,palette.darkWood);rope(g,[...outline,outline[0]].map(([x,z])=>[x,.7,z]),.03,0x887550);
    const mastZ=enemy?-L*.55:-1.8,mastH=enemy?13:10.8;const mast=cyl(g,.12,.24,mastH,palette.darkWood,0,mastH/2,mastZ,12);
    for(const y of [2,5,mastH-.4])cyl(g,.25,.25,.12,brass,0,y,mastZ,12);
    const sailWidth=enemy?10:7.5,sailHeight=enemy?6:6.5;beam(g,[-sailWidth/2,mastH-.7,mastZ],[sailWidth/2,mastH-.7,mastZ],.16,palette.darkWood);
    const sail=new T.Group();sail.position.set(0,mastH-.8-sailHeight/2,mastZ);g.add(sail);const cloth=new T.PlaneGeometry(sailWidth,sailHeight,16,16),vertices=cloth.attributes.position;for(let i=0;i<vertices.count;i++){const y=vertices.getY(i),x=vertices.getX(i);vertices.setZ(i,Math.sin((y/sailHeight+.5)*Math.PI)*(.75+.35*Math.cos(x/sailWidth*Math.PI)));}cloth.computeVertexNormals();mesh(cloth,sailCloth(enemy),sail).castShadow=false;
    for(const x of [-w*.85,w*.85]){rope(g,[[x,1,L*.6],[x*.4,mastH*.6,mastZ+.3],[0,mastH-.8,mastZ]],.025);rope(g,[[x,1,-L*.65],[0,mastH-1,mastZ]],.025);}
    const pennant=mesh(new T.PlaneGeometry(2,.65),mat(enemy?0xbb6559:0x267782,{side:T.DoubleSide}),sail,1.2,sailHeight/2+1.5,0);pennant.rotation.z=-.12;
    beam(g,[0,-.3,-L*.9],[0,1,-L*1.45],.14,brass);ball(g,.18,brass,0,1,-L*1.45,1);
    for(const side of [-1,1]){const wing=new T.Shape();wing.moveTo(0,0);wing.lineTo(side*3.3,.5);wing.lineTo(side*2.6,3.4);wing.lineTo(0,2.2);wing.closePath();const fin=mesh(new T.ShapeGeometry(wing),mat(enemy?0x713d43:0x276d77,{side:T.DoubleSide,metalness:.25}),g,side*w,-.9,L*.25);fin.rotation.x=-Math.PI/2;for(let j=0;j<3;j++){const port=torus(g,.19,.055,brass,side*w*.93,-.65,-L*.3+j*1.6);port.rotation.y=Math.PI/2;}}
    const exhausts=[],engines=[];for(const x of [-w-1,w+1]){const engine=new T.Group();engine.position.set(x,-.6,L*.35);g.add(engine);const body=cyl(engine,.65,.78,3.5,brass,0,0,0,20);body.rotation.x=Math.PI/2;for(const z of [-1.4,0,1.4])torus(engine,.76,.075,palette.darkWood,0,0,z);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;beam(engine,[Math.sin(a)*.7,Math.cos(a)*.7,-1.4],[Math.sin(a)*.7,Math.cos(a)*.7,1.4],.04,brass);}const core=cyl(engine,.58,.58,.25,mat(0x88dfe0,{emissive:0x3bcdcf,emissiveIntensity:1}),0,0,1.8,20);core.rotation.x=Math.PI/2;const prop=new T.Group();prop.position.z=2.05;engine.add(prop);for(let i=0;i<3;i++){const blade=box(prop,.2,1.8,.07,palette.darkWood,0,0,0);blade.rotation.z=i*Math.PI/3;}ball(prop,.16,brass,0,0,.1,1);engines.push(prop);if(!enemy){const plume=mesh(new T.ConeGeometry(.55,5,12,1,true),new T.MeshBasicMaterial({color:0x6ff2ef,transparent:true,opacity:.15,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}),engine,0,0,4.5);plume.rotation.x=Math.PI/2;exhausts.push(plume);}beam(g,[x,0,L*.35],[x*.6,.2,L*.35],.25,palette.darkWood);}
    const lift=ball(g,.8,mat(0x7bd6d6,{emissive:0x4cbdcf,emissiveIntensity:.65,metalness:.3,roughness:.2}),0,-2.4,0,0);lift.scale.y=1.5;
    if(!enemy){const helm=new T.Group();helm.position.set(0,1.5,3);g.add(helm);torus(helm,.65,.07,palette.darkWood);for(let i=0;i<6;i++){const spoke=box(helm,.06,1.65,.07,brass);spoke.rotation.z=i*Math.PI/3;}ball(helm,.14,brass,0,0,0,1);cyl(g,.12,.17,1.5,palette.darkWood,0,.7,3,12);const hero=character();hero.group.position.set(0,.18,4.5);g.add(hero.group);hero.sword.visible=false;for(const x of [-w*.7,w*.7])lantern(g,x,1.7,L*.66);barrel(g,-1.6,2,.65);crate(g,1.6,5,.65);return{group:g,engines,exhausts,sail,hero,helm};}
    for(const x of [-w+.8,w-.8])for(const z of [-3,4]){const gun=cyl(g,.4,.55,2.1,0x40545c,x,.9,z,12);gun.rotation.z=Math.PI/2;box(g,1.3,.6,1.2,palette.darkWood,x,.35,z);}return{group:g,engines,sail};
  }
  function beacon(p,x,z){const g=new T.Group();g.position.set(x,0,z);p.add(g);box(g,.3,5,.3,palette.darkWood,0,2.5,0);cyl(g,1,.5,.35,palette.brass,0,5.1,0,6);const glow=ball(g,.6,mat(0xffd48a,{emissive:0xffba47,emissiveIntensity:1}),0,5.7,0,1);glow.scale.y=1.6;return g;}
  function house(p,x,z,w=7,d=6,h=7,roof=palette.coral){const g=new T.Group();g.position.set(x,0,z);p.add(g);box(g,w,h,d,0xdfd1ab,0,h/2,0);for(const xx of [-w/2+.12,0,w/2-.12])box(g,.22,h+.25,d+.12,palette.darkWood,xx,h/2,0);for(const yy of [.2,h*.52,h])box(g,w+.1,.2,d+.15,palette.wood,0,yy,0);const geo=new T.BufferGeometry();const pts=[[-w*.6,0,-d*.6],[w*.6,0,-d*.6],[0,2.6,-d*.6],[-w*.6,0,d*.6],[0,2.6,d*.6],[w*.6,0,d*.6],[-w*.6,0,-d*.6],[0,2.6,-d*.6],[-w*.6,0,d*.6],[0,2.6,-d*.6],[0,2.6,d*.6],[-w*.6,0,d*.6],[w*.6,0,d*.6],[0,2.6,d*.6],[w*.6,0,-d*.6],[0,2.6,d*.6],[0,2.6,-d*.6],[w*.6,0,-d*.6]];geo.setAttribute('position',new T.Float32BufferAttribute(pts.flat(),3));geo.computeVertexNormals();mesh(geo,mat(roof,{side:T.DoubleSide}),g,0,h,0);box(g,1.3,2.5,.12,palette.darkWood,0,1.3,d/2+.08);for(const xx of [-w*.29,w*.29])for(const yy of [h*.34,h*.77]){box(g,1.1,1.4,.13,palette.darkWood,xx,yy,d/2+.08);box(g,.82,1.12,.15,mat(0xf7d893,{emissive:0xf2bd6b,emissiveIntensity:.2}),xx,yy,d/2+.16);box(g,.075,1.12,.18,palette.wood,xx,yy,d/2+.24);box(g,.82,.075,.18,palette.wood,xx,yy,d/2+.24);}box(g,.8,2.7,.8,0xa6ada0,-w*.25,h+1.1,-d*.2);lantern(g,w*.45,2.8,d*.55);houseDetails(g,w,d,h,roof);return g;}
  function houseDetails(g,w,d,h,roof){
    const tiles=[],r=seeded(Math.floor(w*d*h)),angle=Math.atan2(2.6,w*.6),slope=Math.hypot(2.6,w*.6),rows=7,columns=12;
    for(const side of [-1,1])for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const u=(row+.5)/rows,x=side*u*w*.6,y=h+2.6*(1-u)+.09,z=-d*.6+(col+.5)*d*1.2/columns;
      tiles.push({p:[x,y,z],s:[slope/rows*1.12,.075,d*1.2/columns*.98],r:[0,0,-side*angle]});
    }
    const tiling=scatter(g,bevelBox(1,1,1),mat(roof,{roughness:.88}),tiles);const shade=new T.Color();for(let i=0;i<tiles.length;i++){shade.setRGB(1,1,1).multiplyScalar(.83+r()*.3);tiling.setColorAt(i,shade);}tiling.instanceColor.needsUpdate=true;
    beam(g,[-w*.62,h+.02,d*.61],[0,h+2.7,d*.61],.17,palette.darkWood);beam(g,[0,h+2.7,d*.61],[w*.62,h+.02,d*.61],.17,palette.darkWood);
    beam(g,[0,h+2.68,-d*.62],[0,h+2.68,d*.62],.17,palette.darkWood);
    for(const side of [-1,1]){
      const x=side*w*.29;for(const y of [h*.34,h*.77]){for(const sx of [-1,1]){const shutter=box(g,.31,1.4,.12,0x436f70,x+sx*.73,y,d/2+.12);shutter.rotation.y=sx*.15;for(let i=0;i<4;i++)box(g,.3,.045,.13,0x739185,x+sx*.73,y-.45+i*.28,d/2+.2);}
        box(g,1.5,.25,.45,palette.darkWood,x,y-.85,d/2+.28);for(let k=0;k<5;k++)ball(g,.16,k%2?0xb85f59:0xe1ba75,x-.5+k*.25,y-.6,d/2+.36,1);
      }
      beam(g,[side*w*.46,.3,d*.52],[side*w*.1,h*.5,d*.52],.13,palette.wood);
    }
    box(g,2.5,.15,1.4,palette.lightWood,0,.15,d/2+.65);box(g,2.15,.15,1.05,palette.wood,0,.32,d/2+.45);
    const lintel=box(g,2.2,.15,1.5,roof,0,2.7,d/2+.7);lintel.rotation.x=.15;
    const smoke=[];for(let i=0;i<5;i++)smoke.push({p:[-w*.25+i*.21,h+2.8+i*.7,-d*.2],s:[.3+i*.13,.5+i*.1,.3+i*.13]});scatter(g,new T.SphereGeometry(1,8,6),mat(0xf0e6cf,{transparent:true,opacity:.24,depthWrite:false}),smoke).castShadow=false;
  }
  function batchStatic(root,excluded=new Set()){
    root.updateMatrixWorld(true);const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),batches=new Map();
    function visit(node){if(excluded.has(node)||node.userData.skyDynamic||node.isInstancedMesh)return;for(const child of [...node.children])visit(child);if(!node.isMesh||Array.isArray(node.material)||node.children.length||!node.visible)return;
      const key=node.material.uuid+':'+node.castShadow+':'+node.receiveShadow,vertices=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();vertices.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,node.matrixWorld));
      let batch=batches.get(key);if(!batch){batch={material:node.material,cast:node.castShadow,receive:node.receiveShadow,parts:[]};batches.set(key,batch);}batch.parts.push(vertices);node.parent.remove(node);
    }visit(root);
    for(const batch of batches.values()){
      const total=batch.parts.reduce((n,g)=>n+g.attributes.position.count,0),position=new Float32Array(total*3),normal=new Float32Array(total*3),uv=new Float32Array(total*2),color=new Float32Array(total*3);color.fill(1);let offset=0;
      for(const part of batch.parts){const count=part.attributes.position.count;position.set(part.attributes.position.array,offset*3);normal.set(part.attributes.normal.array,offset*3);if(part.attributes.uv)uv.set(part.attributes.uv.array,offset*2);if(part.attributes.color)color.set(part.attributes.color.array,offset*3);offset+=count;part.dispose();}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(position,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setAttribute('color',new T.BufferAttribute(color,3));const combined=new T.Mesh(geometry,batch.material);combined.castShadow=batch.cast;combined.receiveShadow=batch.receive;root.add(combined);
    }
  }
  return{cliff,batchStatic,T,palette,mat,mesh,box,cyl,ball,torus,seeded,beam,island,tree,grass,plankFloor,railing,dock,barrel,crate,lantern,sign,potion,stall,arch,chest,windmill,vane,character,animateCharacter,ship,beacon,house};
})();
