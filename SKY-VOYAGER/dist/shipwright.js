/* Hand-built ship details with four generated albedo maps. No gameplay bounds change. */
window.SkyShipwright = (() => {
  'use strict';
  const T=THREE,M=window.SkyModels,originalShip=M.ship;
  const state={version:4,ships:0,textures:{},generatedTextures:4};
  const loader=new T.TextureLoader(),textures={};
  const files={hull:'teal-gold-planking.png',brass:'carved-brass.png',sail:'embroidered-sail.png',deck:'honey-oak.png'};
  for(const [key,file] of Object.entries(files)){
    state.textures[key]=false;
    const texture=loader.load('assets/ship-v4/'+file,()=>{state.textures[key]=true;},undefined,()=>{state.textures[key]='failed';});
    texture.encoding=T.sRGBEncoding;texture.anisotropy=4;
    if(key!=='sail')texture.wrapS=texture.wrapT=T.RepeatWrapping;
    textures[key]=texture;
  }
  function material(color,opts={}){const m=new T.MeshStandardMaterial({color,roughness:.72,...opts});m.color.convertSRGBToLinear();if(opts.emissive)m.emissive.convertSRGBToLinear();return m;}
  const materials={
    hull:material(0xffffff,{map:textures.hull,roughness:.8,bumpMap:textures.hull,bumpScale:.018}),
    enemyHull:material(0x9f8491,{map:textures.hull,roughness:.8}),
    brass:material(0xffe3a0,{map:textures.brass,metalness:.57,roughness:.38,bumpMap:textures.brass,bumpScale:.012}),
    gold:material(0xd8ac59,{metalness:.64,roughness:.32}),
    timber:material(0xc9b28c,{map:textures.deck,roughness:.75}),
    dark:material(0x453629),rope:material(0xb29b71),
    glass:material(0x80cfd7,{metalness:.3,roughness:.19,emissive:0x3d8794,emissiveIntensity:.22}),
    sail:material(0xffffff,{map:textures.sail,side:T.DoubleSide,roughness:1}),
    enemySail:material(0xcfa3a3,{map:textures.sail,side:T.DoubleSide,roughness:1})
  };
  function tube(parent,points,radius,mat,segments=16){return M.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,radius,5,false),mat,parent);}
  function ring(parent,radius,tubeRadius,mat,x,y,z){return M.mesh(new T.TorusGeometry(radius,tubeRadius,5,16),mat,parent,x,y,z);}
  function box(parent,w,h,d,mat,x=0,y=0,z=0){return M.mesh(new T.BoxGeometry(w,h,d),mat,parent,x,y,z);}
  function cylinder(parent,rt,rb,h,mat,x=0,y=0,z=0,n=12){return M.mesh(new T.CylinderGeometry(rt,rb,h,n),mat,parent,x,y,z);}
  function beam(parent,a,b,width,mat){const av=new T.Vector3(...a),bv=new T.Vector3(...b),m=box(parent,width,av.distanceTo(bv),width,mat);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;}
  function hullPoint(angle,y,w,L,outset=0){
    const t=-y,f=t<.85?1-.06*t/.85:t<1.9?.94-.25*(t-.85)/1.05:.69-.59*(t-1.9)/.75;
    return [Math.sin(angle)*w*(.86+.14*Math.cos(angle))*(f+outset),y,Math.cos(angle)*L*1.08*(.85+.15*f)+Math.cos(angle)*outset];
  }
  function planking(parent,w,L,enemy){
    for(let band=0;band<6;band++){
      const top=-.09-band*.34,bottom=top-.32,positions=[],uv=[];
      for(let i=0;i<64;i++)for(const [j,y,v] of [[i,top,1],[i,bottom,0],[i+1,top,1],[i+1,top,1],[i,bottom,0],[i+1,bottom,0]]){
        positions.push(...hullPoint(j/64*Math.PI*2,y,w,L,.014));uv.push(j/64*4,(band+v)/6);
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();M.mesh(geo,enemy?materials.enemyHull:materials.hull,parent);
    }
    // Fine sheer and waterline rails follow the original compound curved hull.
    for(const y of [-.08,-.82,-1.78]){const points=[];for(let i=0;i<=40;i++)points.push(hullPoint(i/40*Math.PI*2,y,w,L,.025));tube(parent,points,y===-.82?.052:.034,materials.gold,48);}
    for(const side of [-1,1])for(let k=0;k<6;k++){
      const angle=side*(.48+k*.42),points=[-.1,-.55,-1.1,-1.65].map(y=>hullPoint(angle,y,w,L,.03));tube(parent,points,.026,materials.brass,6);
    }
  }
  function porthole(parent,x,y,z,rotation=0,scale=1){
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;g.scale.setScalar(scale);parent.add(g);
    const glass=M.mesh(new T.CircleGeometry(.3,16),materials.glass,g,0,0,.015);glass.castShadow=false;
    ring(g,.31,.055,materials.brass,0,0,.025);box(g,.035,.6,.04,materials.gold,0,0,.045);box(g,.6,.035,.04,materials.gold,0,0,.045);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const bolt=cylinder(g,.023,.023,.045,materials.gold,Math.sin(a)*.31,Math.cos(a)*.31,.08,5);bolt.rotation.x=Math.PI/2;}
  }
  function cabin(parent,w,L,enemy){
    const width=enemy?5.2:3.15,depth=enemy?3.5:2.9,z=L*(enemy?.85:.72),g=new T.Group();g.position.z=z;parent.add(g);
    // The entire cabin is beneath the deck: the pilot and boss combat lane stay clear.
    box(g,width,1.55,depth,enemy?materials.enemyHull:materials.hull,0,-.76,0);
    box(g,width+.28,.16,depth+.24,materials.timber,0,.1,0);
    for(const x of [-width/2,width/2]){box(g,.1,1.62,depth+.1,materials.brass,x,-.72,0);for(const q of [-.67,.67])porthole(g,x+Math.sign(x)*.058,-.7,q,Math.sign(x)*Math.PI/2,.83);}
    for(const x of [-width*.28,0,width*.28]){
      box(g,width*.21,1.02,.04,materials.glass,x,-.68,depth/2+.025);
      for(const sx of [-1,1])box(g,.055,1.15,.08,materials.gold,x+sx*width*.115,-.68,depth/2+.07);
      for(const y of [-1.25,-.7,-.12])box(g,width*.24,.055,.08,materials.gold,x,y,depth/2+.07);
    }
    for(const y of [-1.38,-.01])box(g,width+.12,.12,depth+.15,materials.brass,0,y,0);
    for(const side of [-1,1])tube(g,[[side*width*.48,-1.4,depth*.52],[side*width*.58,-1.05,depth*.55],[side*width*.51,-.28,depth*.55]],.06,materials.gold,10);
    // Small stern gallery, entirely outside the existing deck bounds.
    const galleryZ=depth/2+.32;box(g,width+.35,.12,.56,materials.timber,0,-.14,galleryZ);
    for(let i=0;i<9;i++)cylinder(g,.027,.035,.62,materials.gold,-width/2+i*width/8,.21,galleryZ+.2,6);
    box(g,width+.18,.075,.09,materials.brass,0,.55,galleryZ+.2);
    const crest=new T.Group();crest.position.set(0,-.85,depth/2+.18);g.add(crest);ring(crest,.36,.065,materials.brass,0,0,0);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;beam(crest,[Math.sin(a)*.08,Math.cos(a)*.08,.04],[Math.sin(a)*(i%2?.23:.31),Math.cos(a)*(i%2?.23:.31),.04],.034,materials.gold);}
  }
  function prow(parent,w,L){
    const g=new T.Group();g.position.set(0,.12,-L*1.09);parent.add(g);
    for(const side of [-1,1]){
      tube(g,[[side*w*.29,-.38,L*.14],[side*w*.22,.15,0],[side*.28,.78,-L*.17],[0,1.3,-L*.26]],.065,materials.brass,16);
      for(let i=0;i<4;i++){
        const feather=new T.Shape();feather.moveTo(0,0);feather.quadraticCurveTo(side*(.6+i*.07),.1,side*(1.12-i*.13),.52+i*.1);feather.quadraticCurveTo(side*.52,.25,0,-.12);feather.closePath();
        const geo=new T.ExtrudeGeometry(feather,{depth:.045,bevelEnabled:false,curveSegments:5});const wing=M.mesh(geo,materials.brass,g,0,.55+i*.04,-L*.15+i*.13);wing.rotation.y=side*.28;
      }
    }
    const gem=M.mesh(new T.OctahedronGeometry(.22),materials.glass,g,0,1.1,-L*.245);gem.scale.set(.55,1.7,.75);
  }
  function rigging(parent,rig,w,L,enemy){
    const mastZ=enemy?-L*.55:-1.8,mastH=enemy?13:10.8;
    for(const side of [-1,1]){
      const top=[side*.23,mastH*.78,mastZ];
      for(const z of [L*.15,L*.47]){
        const x=side*w*.81;beam(parent,[x,.38,z],[x,1.48,z],.07,materials.dark);
        tube(parent,[[x,.65,z],[x*.75,mastH*.34,mastZ+.6],top],.024,materials.rope,8);
        const pulley=cylinder(parent,.17,.17,.1,materials.timber,x,.95,z,10);pulley.rotation.x=Math.PI/2;ring(parent,.13,.028,materials.gold,x,.95,z+.07);
        const cleat=box(parent,.42,.06,.09,materials.brass,x,.4,z);cleat.rotation.y=.3;
      }
      // Rope ladder outside the port/starboard walking corridors.
      const low=[side*w*.78,.8,L*.1],high=[side*.28,mastH*.82,mastZ];
      for(const spread of [-.12,.12])beam(parent,[low[0]+spread,low[1],low[2]],[high[0]+spread,high[1],high[2]],.025,materials.rope);
      for(let i=1;i<13;i++){const t=i/13,x=low[0]+(high[0]-low[0])*t,y=low[1]+(high[1]-low[1])*t,z=low[2]+(high[2]-low[2])*t;beam(parent,[x-.15,y,z],[x+.15,y,z],.027,materials.rope);}
    }
    const sailWidth=enemy?10:7.5,sailHeight=enemy?6:6.5;
    // Texture swap retains the original 16x16 cloth grid and SkyMotion vertex references.
    rig.sail.traverse(node=>{if(node.isMesh&&node.geometry.type==='PlaneGeometry'&&node.geometry.parameters.width>5)node.material=enemy?materials.enemySail:materials.sail;});
    const ties=new T.Group();rig.sail.add(ties);for(let i=0;i<9;i++){const tie=ring(ties,.085,.018,materials.rope,-sailWidth/2+.15+i*(sailWidth-.3)/8,sailHeight/2+.07,0);tie.rotation.y=Math.PI/2;}
    M.batchStatic(ties);
  }
  function deckTools(parent,w,L,enemy){
    if(enemy)return; // Deck combat props remain exactly where gameplay expects them.
    for(const side of [-1,1]){
      const x=side*w*.58,z=-L*.55,g=new T.Group();g.position.set(x,.18,z);parent.add(g);
      for(let i=0;i<4;i++){const coil=ring(g,.24+i*.055,.025,materials.rope,0,.04+i*.013,0);coil.rotation.x=Math.PI/2;}
      cylinder(g,.1,.12,.25,materials.brass,0,.13,0,8);
      box(parent,.36,.17,.65,materials.dark,side*w*.7,.26,-L*.05);
      cylinder(parent,.055,.09,.42,materials.brass,side*w*.7,.48,-L*.05,8);
    }
    const hatch=new T.Group();hatch.position.set(0,.24,-L*.67);parent.add(hatch);box(hatch,1.2,.12,.9,materials.timber);for(const x of [-.5,.5])box(hatch,.07,.15,.88,materials.brass,x,0,0);ring(hatch,.09,.025,materials.gold,0,.09,.12).rotation.x=Math.PI/2;
    const sternLamp=M.lantern(parent,0,.82,L*1.02);sternLamp.scale.setScalar(.7);
  }
  function ship(enemy=false){
    const rig=originalShip(enemy),w=enemy?7:3.1,L=enemy?14:7;
    // Legacy flat-side rings sit outside the curved hull. Replace only those six
    // direct ship children; the new inset glazed portholes below follow hullPoint.
    for(const node of [...rig.group.children]){
      const p=node.geometry?.parameters;
      if(node.isMesh&&node.geometry.type==='TorusGeometry'&&p.radius===.19&&p.tube===.055&&Math.abs(node.position.y+.65)<1e-6&&Math.abs(Math.abs(node.position.x)-w*.93)<1e-6&&[0,1,2].some(i=>Math.abs(node.position.z-(-L*.3+i*1.6))<1e-6)){
        rig.group.remove(node);node.geometry.dispose();
      }
    }
    for(const node of [rig.sail,...rig.engines,...(rig.exhausts||[]),rig.hero?.group,rig.helm].filter(Boolean))node.userData.skyDynamic=true;
    const details=new T.Group();details.name='shipwright-v4-static';rig.group.add(details);
    planking(details,w,L,enemy);cabin(details,w,L,enemy);prow(details,w,L);rigging(details,rig,w,L,enemy);deckTools(details,w,L,enemy);
    for(const side of [-1,1])for(const z of [-L*.4,-L*.12,L*.14]){
      const angle=Math.acos(z/(L*1.08))*side,p=hullPoint(angle,-.49,w,L,.028);porthole(details,p[0],p[1],p[2],side*Math.PI/2,.65);
    }
    // Give deck planks the new fine grain without mutating shared world materials.
    rig.group.traverse(node=>{if(!node.isMesh||!node.material||Array.isArray(node.material)||node.parent===details)return;
      if(node.geometry.type==='ExtrudeGeometry'&&node.geometry.parameters.options?.depth<.2&&node.position.y>=.05&&node.position.y<.2&&node.material===M.mat(M.palette.lightWood))node.material=materials.timber;
    });
    M.batchStatic(details);state.ships++;rig.group.userData.shipwrightVersion=4;
    return rig;
  }
  function install(){if(M.ship!==ship)M.ship=ship;return M.ship;}
  install();
  return {install,status:()=>({...state,textures:{...state.textures}})};
})();
