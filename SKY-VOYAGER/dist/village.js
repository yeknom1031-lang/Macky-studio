/* Handcrafted harbor architecture and wind-swept botanical detail.
   All decoration lives inside the existing island footprints; routes stay clear. */
window.SkyVillage = (() => {
  'use strict';
  const T=THREE, M=SkyModels, TAU=Math.PI*2;
  function create({scene,worldGroups,islands,renderer}) {
    const random=M.seeded(7302026), loader=new T.TextureLoader();
    const clock={value:0}, loaded={}, errors=[], flags=[];
    const counts={houses:0,trees:0,leaves:0,ferns:0,flowers:0,banners:0,ruinColumns:0,benches:0,lighthouseDetails:0};
    const islandRoots=new Set(Object.values(worldGroups)),lodGroups=new Map();
    const lodStatus={nearIslands:0,farIslands:0,detailedLeavesVisible:0,culledDetailMeshes:0};
    function islandOf(node){while(node&&!islandRoots.has(node))node=node.parent;return node;}
    function lodFor(node){
      const island=islandOf(node);if(!island)return null;
      if(!lodGroups.has(island)){
        const low=new T.Group();low.name='Distant tree silhouettes';island.add(low);
        lodGroups.set(island,{root:island,center:new T.Vector3(),high:[],low,near:true});
      }
      return lodGroups.get(island);
    }
    const cache={};
    function material(color,extra={}) {
      const m=new T.MeshStandardMaterial({color,roughness:.86,...extra});
      m.color.convertSRGBToLinear();return m;
    }
    const plaster=material(0xfff0cd),stone=material(0xc3bda5),wood=material(0xb28a56);
    const darkWood=material(0x514432),iron=material(0x475754,{metalness:.55,roughness:.4});
    const gold=material(0xc6a05d,{metalness:.42,roughness:.46});
    const roof=material(0xffffff),pot=material(0xb76e4e),soil=material(0x414c32);
    const glass=material(0xffdb8e,{emissive:0xe4aa51,emissiveIntensity:.2,roughness:.4});
    const fernMaterial=material(0xe4f2ce,{side:T.DoubleSide,alphaTest:.48});
    const leafMaterial=material(0xffffff,{side:T.DoubleSide,roughness:.93,alphaTest:.48});
    const barkMaterial=material(0xe6dcc9),masonryMaterial=material(0xf2ead7);
    const wildflowerMaterial=material(0xffffff,{side:T.DoubleSide,alphaTest:.48});
    const signMaterial=material(0xffffff,{side:T.DoubleSide});
    const bannerMaterial=material(0xffffff,{side:T.DoubleSide});
    function texture(key,file,materials,repeat=1,directory='village') {
      loaded[key]=false;
      loader.load('assets/'+directory+'/'+file,t=>{
        t.encoding=T.sRGBEncoding;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);
        t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
        for(const m of materials){m.map=t;m.needsUpdate=true;}loaded[key]=true;
      },undefined,()=>errors.push(file));
    }
    texture('plaster','harbor-plaster.png',[plaster]);
    texture('roof','harbor-roof.png',[roof]);
    texture('timber','harbor-carved-timber.png',[wood]);
    texture('fern','harbor-fern.png',[fernMaterial]);
    texture('banner','harbor-banner.png',[bannerMaterial]);
    texture('barkV4','silver-oak-bark.png',[barkMaterial],1,'island-v4');
    texture('leavesV4','olive-leaf-spray.png',[leafMaterial],1,'island-v4');
    texture('masonryV4','moss-limestone.png',[masonryMaterial],1,'island-v4');
    texture('flowersV4','lavender-wildflowers.png',[wildflowerMaterial],1,'island-v4');
    texture('signV4','mariner-guild-sign.png',[signMaterial],1,'island-v4');

    function wind(m,strength,frequency) {
      m.onBeforeCompile=shader=>{
        shader.uniforms.villageTime=clock;
        shader.vertexShader='uniform float villageTime;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
          #include <begin_vertex>
          float phase=0.0;
          #ifdef USE_INSTANCING
            phase=instanceMatrix[3].x*.73+instanceMatrix[3].z*.51;
          #endif
          float bend=max(position.y,0.0);
          transformed.x+=sin(villageTime*${frequency.toFixed(2)}+phase+position.y*2.5)*bend*${strength.toFixed(3)};
          transformed.z+=cos(villageTime*1.17+phase)*bend*${(strength*.45).toFixed(3)};
        `);
      };
      m.customProgramCacheKey=()=>`villageWind-${strength}-${frequency}`;
    }
    wind(fernMaterial,.075,1.8);wind(leafMaterial,.065,2.2);wind(wildflowerMaterial,.06,1.7);
    bannerMaterial.onBeforeCompile=shader=>{
      shader.uniforms.villageTime=clock;
      shader.vertexShader='uniform float villageTime;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        float freeEdge=pow(clamp(-position.y/3.3,0.0,1.0),1.3);
        transformed.z+=(sin(position.y*3.4-villageTime*3.0)+sin(position.x*4.7+villageTime*1.7)*.4)*.19*freeEdge;
        transformed.x+=sin(villageTime*1.3-position.y)*.065*freeEdge;
      `);
    };
    bannerMaterial.customProgramCacheKey=()=> 'villageClothWind';

    function mesh(parent,geometry,mat,x=0,y=0,z=0) {
      const a=new T.Mesh(geometry,mat);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;
    }
    function box(parent,w,h,d,mat,x=0,y=0,z=0) {
      const key=`${w},${h},${d}`;
      return mesh(parent,cache[key]||(cache[key]=new T.BoxGeometry(w,h,d)),mat,x,y,z);
    }
    function cylinder(parent,rt,rb,h,mat,x=0,y=0,z=0,n=12) {
      return mesh(parent,new T.CylinderGeometry(rt,rb,h,n),mat,x,y,z);
    }
    function beam(parent,from,to,width,mat=wood) {
      const a=new T.Vector3(...from),b=new T.Vector3(...to),m=box(parent,width,a.distanceTo(b),width,mat);
      m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());return m;
    }
    function archShape(w,h) {
      const s=new T.Shape(),r=w/2;
      s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.lineTo(-r,0);return s;
    }
    function door(parent,x,y,z,w=1.6,h=3.0) {
      const g=new T.Group();g.position.set(x,y,z);parent.add(g);
      const opening=mesh(g,new T.ShapeGeometry(archShape(w,h),16),darkWood,0,0,-.035);
      opening.castShadow=false;
      // A stone arch assembled from voussoirs leaves a readable recessed opening.
      for(const side of [-1,1])for(let i=0;i<5;i++)box(g,.26,(h-w/2)/5-.03,.28,stone,side*(w/2+.12),(i+.5)*(h-w/2)/5,.04);
      for(let i=0;i<11;i++){
        const a=(i+.5)*Math.PI/11,b=box(g,.28,.29,.3,stone,Math.cos(a)*(w/2+.12),h-w/2+Math.sin(a)*(w/2+.12),.04);b.rotation.z=a;
      }
      for(let i=-2;i<=2;i++)box(g,.018,h-w/2-.2,.05,wood,i*w/5,(h-w/2)/2,-.005);
      for(const yy of [.65,1.75])box(g,w*.88,.09,.07,iron,0,yy,.025);
      mesh(g,new T.TorusGeometry(.09,.027,6,12),gold,w*.25,1.2,.08);
      box(g,w+.65,.14,.6,stone,0,.04,.18);
    }
    function windowFrame(parent,x,y,z,w=1.35,h=1.65) {
      box(parent,w+.3,h+.3,.22,wood,x,y,z);
      box(parent,w,h,.24,glass,x,y,z+.03);
      box(parent,.065,h,.28,darkWood,x,y,z+.06);box(parent,w,.065,.28,darkWood,x,y,z+.06);
      box(parent,w+.65,.14,.46,stone,x,y-h*.5-.12,z+.14);
      for(const sx of [-1,1]) {
        const shutter=box(parent,.36,h+.04,.14,wood,x+sx*(w/2+.32),y,z+.08);shutter.rotation.y=sx*.25;
        for(let q=0;q<6;q++)box(parent,.35,.04,.17,darkWood,x+sx*(w/2+.32),y-h*.38+q*h*.15,z+.17);
      }
    }
    function tiledRoof(parent,w,d,h,y) {
      // UVs follow each slope; avoids stretching the original roof's UV-less triangles.
      const pos=[],uv=[];
      for(const sign of [-1,1]) {
        const a=[0,y+h,-d/2],b=[0,y+h,d/2],c=[sign*w/2,y,d/2],e=[sign*w/2,y,-d/2];
        const points=sign>0?[a,c,b,a,e,c]:[a,b,c,a,c,e];
        const maps=sign>0?[[0,1],[1,0],[1,1],[0,1],[0,0],[1,0]]:[[0,1],[1,1],[1,0],[0,1],[1,0],[0,0]];
        points.forEach((v,i)=>{pos.push(...v);uv.push(...maps[i]);});
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
      const m=mesh(parent,geo,roof);m.material.side=T.DoubleSide;
      beam(parent,[0,y+h+.05,-d/2-.1],[0,y+h+.05,d/2+.1],.16,wood);
      for(const z of [-d/2,d/2])for(const s of [-1,1])beam(parent,[0,y+h+.05,z],[s*w/2,y+.02,z],.16,wood);
    }
    function banner(parent,x,y,z,scale=1) {
      const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
      cylinder(g,.07,.07,1.85,gold,0,.04,0,8).rotation.z=Math.PI/2;
      const geom=new T.PlaneGeometry(1.5,3.3,8,16);geom.translate(0,-1.65,0);
      const cloth=mesh(g,geom,bannerMaterial,0,-.06,.03);cloth.castShadow=false;cloth.userData.skyDynamic=true;
      g.userData.skyDynamic=true;flags.push(g);counts.banners++;
      for(const s of [-1,1])mesh(g,new T.SphereGeometry(.1,8,6),gold,s*.94,.04,0);
      return g;
    }
    function potPlant(parent,x,y,z,s=1) {
      cylinder(parent,.48*s,.32*s,.78*s,pot,x,y+.4*s,z,12);
      cylinder(parent,.51*s,.51*s,.14*s,pot,x,y+.76*s,z,12);
      cylinder(parent,.44*s,.44*s,.035*s,soil,x,y+.8*s,z,12);
      return {p:[x,y+.78*s,z],s:1.65*s};
    }
    function curve(parent,points,width,mat){
      const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
      return mesh(parent,new T.TubeGeometry(path,16,width,5,false),mat);
    }
    function hangingSign(parent,x,y,z,scale=1){
      beam(parent,[x-.9*scale,y+.7*scale,z],[x+.9*scale,y+.7*scale,z],.09,iron);
      for(const xx of [-.55,.55])beam(parent,[x+xx*scale,y+.7*scale,z],[x+xx*scale,y+.25*scale,z],.035,gold);
      // The oval mesh trims the generated sign's surrounding studio margin.
      const geo=new T.CircleGeometry(1,32),uv=geo.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setXY(i,.5+(uv.getX(i)-.5)*.95,.5+(uv.getY(i)-.5)*.91);
      const sign=mesh(parent,geo,signMaterial,x,y-.1*scale,z+.03);sign.scale.set(1.3*scale,.86*scale,1);
    }
    const detailGroups=new Map();
    function architecturalDetails(parent){
      if(!detailGroups.has(parent)){const g=new T.Group();g.name='Near architectural craftsmanship';parent.add(g);detailGroups.set(parent,g);}return detailGroups.get(parent);
    }
    function bench(parent,x,z,yaw=0){
      const g=new T.Group();g.position.set(x,.1,z);g.rotation.y=yaw;parent.add(g);
      for(const a of [-1,1]){
        beam(g,[a*1.2,.1,-.3],[a*1.2,.8,.3],.14,iron);
        beam(g,[a*1.2,.1,.3],[a*1.2,1.6,-.35],.14,iron);
        beam(g,[a*1.3,1.1,-.3],[a*1.3,1.1,.48],.09,gold);
      }
      for(let i=0;i<3;i++)box(g,3.05,.12,.23,wood,0,.78,-.25+i*.26);
      for(const y of [1.12,1.46])box(g,2.95,.2,.12,wood,0,y,-.34);
      counts.benches++;
    }
    function ruinColumn(parent,x,z,h=4,broken=false){
      const g=new T.Group();g.position.set(x,.08,z);parent.add(g);
      box(g,1.8,.25,1.8,masonryMaterial,0,.14,0);
      cylinder(g,.85,.95,.35,masonryMaterial,0,.44,0,12);
      cylinder(g,.53,.64,h,masonryMaterial,0,h/2+.62,0,12);
      // Shallow fluting gives the shaft readable highlights without a high-poly mesh.
      for(let i=0;i<8;i++){const a=i/8*TAU;cylinder(g,.055,.065,h*.83,stone,Math.sin(a)*.54,h/2+.65,Math.cos(a)*.54,5);}
      cylinder(g,.78,.59,.25,stone,0,h+.7,0,12);
      if(!broken){box(g,1.6,.25,1.6,masonryMaterial,0,h+.95,0);mesh(g,new T.OctahedronGeometry(.32),gold,0,h+1.3,0);}
      else {const shard=box(g,.64,.48,.85,masonryMaterial,.27,h+.84,0);shard.rotation.z=.25;}
      addLeaves(g,[.48,h*.45,.35],.32,10);addWildflowers(g,[-.6,.14,.4],.6);counts.ruinColumns++;
      return g;
    }
    const fernGroups=new Map(),leafGroups=new Map(),flowerGroups=new Map(),wildflowerGroups=new Map();
    function addFern(g,p,s=1,yaw=0) {
      if(!fernGroups.has(g))fernGroups.set(g,[]);
      for(const angle of [yaw,yaw+Math.PI/2])fernGroups.get(g).push({p,s,r:angle});counts.ferns++;
    }
    function addLeaves(g,p,scale=.5,n=12) {
      // Each alpha card now contains seven painted leaves. Fewer cards give richer
      // silhouettes while reducing the previous solid-leaf vertex count.
      n=Math.ceil(n*.5);scale*=1.15;
      if(!leafGroups.has(g))leafGroups.set(g,[]);
      for(let k=0;k<n;k++){
        const a=random()*TAU,b=random()*Math.PI,dist=random()*scale;
        leafGroups.get(g).push({p:[p[0]+Math.sin(a)*dist,p[1]+Math.cos(b)*dist*.65,p[2]+Math.cos(a)*dist],s:scale*(.55+random()*.7),r:[random()*.9-.45,random()*TAU,random()*2-1],color:new T.Color().setRGB(.78+random()*.2,.83+random()*.17,.72+random()*.2)});
      }
      counts.leaves+=n;
    }
    function addFlowers(g,p,s=1,n=8) {
      if(!flowerGroups.has(g))flowerGroups.set(g,[]);
      for(let i=0;i<n;i++){
        const a=i/n*TAU,r=.15+random()*.45;
        flowerGroups.get(g).push({p:[p[0]+Math.sin(a)*r*s,p[1]+(.18+random()*.3)*s,p[2]+Math.cos(a)*r*s],s:(.1+random()*.06)*s,r:[-.8+random(),a,0],color:new T.Color([0xe9bf68,0xe6ad97,0xf5dfaa,0xbd87bd][i%4]).convertSRGBToLinear()});
      }counts.flowers+=n;
    }
    function addWildflowers(g,p,s=.8){
      if(!wildflowerGroups.has(g))wildflowerGroups.set(g,[]);
      const yaw=random()*TAU;
      for(const r of [yaw,yaw+Math.PI/2])wildflowerGroups.get(g).push({p,s,r});
    }
    function ornamentHouse(parent,spec,index) {
      const [x,z,w,d,h]=spec;
      const original=parent.children.find(c=>c.isGroup&&c.position.x===x&&c.position.z===z&&c.children[0]?.isMesh);
      if(original&&original.children[0]) {
        original.children[0].material=plaster;
        // The old low porch would cut across the new arch crown.
        for(const child of [...original.children])if(child.isMesh&&child.position.x===0&&child.position.y===2.7&&Math.abs(child.position.z-(d/2+.7))<.001)original.remove(child);
        // The baked roof receives planar UVs before any static batching occurs.
        for(const child of original.children)if(child.isMesh&&child.geometry.attributes.position&&!child.geometry.attributes.uv) {
          const geometry=child.geometry.clone(),p=geometry.attributes.position,uv=[];
          for(let i=0;i<p.count;i++)uv.push(p.getZ(i)/(d*1.2)+.5,p.getX(i)/w+.5);
          geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));child.geometry=geometry;child.material=roof;
        }
      }
      const g=new T.Group();g.name='Crafted harbor house '+index;g.position.set(x,0,z);parent.add(g);
      const front=d/2+.22;
      // Rough-cut foundation and corner quoins read from the plaza and the air.
      box(g,w+.32,.72,d+.25,stone,0,.35,0);
      for(const sx of [-1,1])for(let i=0;i<Math.floor(h/.65);i++)box(g,.46,.47,.4,stone,sx*(w/2-.12),.8+i*.65,front-.1);
      for(const sx of [-1,1])beam(g,[sx*(w*.42),h*.54,front],[sx*.8,h-.08,front],.18,wood);
      door(g,0,.38,front+.04,1.75,3);
      // Carved bargeboards, a circular attic window, and roof finials.
      for(const sx of [-1,1])beam(g,[sx*w*.6,h+.12,d*.62],[0,h+2.75,d*.62],.28,wood);
      mesh(g,new T.CylinderGeometry(.53,.53,.15,20),darkWood,0,h+.9,d*.62+.05).rotation.x=Math.PI/2;
      mesh(g,new T.CylinderGeometry(.39,.39,.18,20),glass,0,h+.9,d*.62+.14).rotation.x=Math.PI/2;
      box(g,.065,.75,.22,wood,0,h+.9,d*.62+.24);box(g,.75,.065,.22,wood,0,h+.9,d*.62+.24);
      for(const zz of [-d*.62,d*.62]){cylinder(g,.04,.12,.8,gold,0,h+3.0,zz,8);mesh(g,new T.SphereGeometry(.13,8,6),gold,0,h+3.45,zz);}
      // Swept ridge ends, gilded corbels and small chimneys enrich the roof outline.
      for(const zz of [-1,1])curve(g,[[0,h+2.78,zz*d*.5],[0,h+2.81,zz*d*.64],[0,h+3.12,zz*d*.73]],.13,wood);
      for(const xx of [-1,1])for(const zz of [-1,1]){
        const px=xx*w*.49,pz=zz*d*.48;
        curve(g,[[px,h-.65,pz],[px+xx*.18,h-.3,pz],[px+xx*.5,h+.06,pz]],.09,wood);
      }
      for(let i=0;i<3;i++){
        const chimney=box(g,.42,1.0+i*.16,.45,masonryMaterial,-w*.24+i*.48,h+1.5,-d*.18);
        box(g,.55,.12,.58,stone,chimney.position.x,h+2.02+i*.24,-d*.18);
      }
      if(index===2)hangingSign(g,0,5.05,front+.5,.78);
      // Two gabled dormers break the long roof silhouette, differently on each house.
      for(const side of [-1,1]) {
        const dormer=new T.Group();dormer.position.set(side*w*.3,h+.12,index===1?0:-d*.12);dormer.rotation.y=side*Math.PI/2;g.add(dormer);
        box(dormer,1.65,1.75,1.3,plaster,0,.9,0);windowFrame(dormer,0,.9,.75,.8,1.05);
        tiledRoof(dormer,2.15,1.8,.75,1.8);
      }
      if(index===0) {
        // Craftsman's oriel bay sits within the established building obstacle.
        box(g,2.45,2.4,.65,wood,-2,h*.63,front+.15);windowFrame(g,-2,h*.63,front+.55,1.75,1.7);
        for(const side of [-1,1])beam(g,[-2+side*.85,h*.63-1.65,front],[-2+side*.85,h*.63-1.15,front+.6],.18,wood);
      } else if(index===1) {
        box(g,4.9,.22,1.4,wood,0,h*.51,front+.35);
        for(const xx of [-2.2,-1.1,0,1.1,2.2])box(g,.1,1,.1,iron,xx,h*.51+.5,front+1);
        box(g,4.8,.12,.14,wood,0,h*.51+1,front+1);
        for(const xx of [-2,2])beam(g,[xx,h*.51-1.2,front],[xx,h*.51,front+1],.23,wood);
      } else {
        // Inn chimney caps and an ornate canopy give the tall central house its own shape.
        const awning=box(g,3.4,.18,1.7,roof,0,3.65,front+.65);awning.rotation.x=.13;
        for(const xx of [-1.45,1.45])beam(g,[xx,2.6,front],[xx,3.55,front+1.15],.12,gold);
      }
      banner(g,index===0?w*.34:-w*.34,h+.15,front+.42,.54);
      for(const sx of [-1,1]) {
        const p=potPlant(g,sx*(w*.42),.4,front+.35,.6);addFern(g,p.p,p.s,random()*TAU);
        addWildflowers(g,[sx*(w*.42),1.0,front+.35],.65);
        for(let row=0;row<2;row++) {
          const yy=h*(row?.77:.34)-1.0;
          box(g,1.7,.33,.5,wood,sx*w*.29,yy,front+.25);
          addLeaves(g,[sx*w*.29,yy+.18,front+.4],.36,12);addFlowers(g,[sx*w*.29,yy+.33,front+.4],.75,9);
        }
      }
      // Deliberate climbing ivy follows one corner rather than covering doors and windows.
      const ivySide=index%2?-1:1;
      for(let i=0;i<18;i++)addLeaves(g,[ivySide*(w*.47)+Math.sin(i*.6)*.14,.6+i*h/19,front+.13],.23,4);
      counts.houses++;
    }
    const market=worldGroups.market;
    if(market) {
      [[-13,-14,8,7,6.5],[12,-14,8,7,8],[0,-22,7,5,9]].forEach((s,i)=>ornamentHouse(market,s,i));
      for(const x of [-17.2,17.2])for(const z of [2,10]) {
        const p=potPlant(market,x,.2,z,.85);addFern(market,p.p,p.s,random()*TAU);
      }
      for(const x of [-12,12]) {
        for(const side of [-1,1]) {
          beam(market,[x+side*3.4,3,-2.7],[x+side*2.2,4.7,-2.7],.14,wood);
          banner(market,x+side*3.45,4.2,-2.7,.44);
        }
      }
      for(const side of [-1,1]) {
        const x=side*7;
        cylinder(market,.12,.15,7.3,wood,x,3.65,18.5,10);
        banner(market,x,6.9,18.5,.65);
        cylinder(market,.33,.44,.4,stone,x,.3,18.5,10);
      }
      const detail=architecturalDetails(market);
      bench(detail,20.5,8,-Math.PI/2);bench(detail,-21,-5,Math.PI/2);
      // Low curbs define the garden edge, leaving a broad clear approach to the dock.
      for(const side of [-1,1])for(let i=0;i<8;i++){
        box(detail,.55,.2,.9,masonryMaterial,side*(7.8+i*.35),.18,18-i*.9);
        if(i%2===0)addWildflowers(market,[side*(8.8+i*.35),.18,18-i*.9],.7);
      }
      for(const side of [-1,1]){
        const x=side*21;
        for(let i=0;i<4;i++)cylinder(detail,.08,.12,1.2,iron,x,.75,2+i*1.5,8);
        for(let i=0;i<3;i++)curve(detail,[[x,1.25,2+i*1.5],[x,1.0,2.75+i*1.5],[x,1.25,3.5+i*1.5]],.028,gold);
      }
      hangingSign(detail,-17.5,4.7,8,.62);
    }

    for(const I of islands){
      const root=worldGroups[I.id];if(!root)continue;
      if(I.kind==='ruins'){
        const detail=architecturalDetails(root);
        for(const [x,z,h,broken] of [[-12,7,3.3,true],[12,22,4.2,false],[-10,-25,3,true],[10,-24,4.6,false]])ruinColumn(detail,x,z,h,broken);
        for(const side of [-1,1])for(let i=0;i<6;i++){
          const x=side*(11.5+i*.18),z=11+i*1.3;
          box(detail,.65,.19,1.08,masonryMaterial,x,.2,z);
          if(i%2===0)addWildflowers(root,[x+side*.6,.16,z],.8);
        }
        // Broken parapets are behind the playable windmill platform, not on the bridge.
        for(const side of [-1,1]){
          box(detail,3.2,.9,.7,masonryMaterial,side*8, .55,-31);
          box(detail,3.5,.18,.9,stone,side*8,1.09,-31);
        }
        const mill=root.children.find(g=>g.isGroup&&g.position.x===0&&g.position.z===-29&&g.children[0]?.geometry?.type==='CylinderGeometry');
        if(mill){mill.children[0].material=masonryMaterial;for(const side of [-1,1])beam(mill,[side*1.6,.3,1],[side*1.1,5.7,1],.16,wood);}
      }else if(I.kind==='storm'){
        const detail=architecturalDetails(root);
        const tower=root.children.find(m=>m.isMesh&&m.geometry?.type==='CylinderGeometry'&&m.geometry.parameters.height===14);
        if(tower)tower.material=masonryMaterial;
        door(detail,0,.15,-1.5,1.65,3.1);
        for(const y of [5.5,8.5])windowFrame(detail,0,y,-1.9,.8,1.2);
        cylinder(detail,3.7,3.45,.35,masonryMaterial,0,11.4,-5,24);
        for(const y of [11.6,12.8]){
          const ring=mesh(detail,new T.TorusGeometry(3.65,.065,5,32),gold,0,y,-5);ring.rotation.x=Math.PI/2;
        }
        for(let k=0;k<18;k++){
          const a=k/18*TAU;cylinder(detail,.045,.045,1.2,iron,Math.sin(a)*3.65,12.2,-5+Math.cos(a)*3.65,6);
          if(k%3===0)beam(detail,[Math.sin(a)*2.85,10.5,-5+Math.cos(a)*2.85],[Math.sin(a)*3.6,11.3,-5+Math.cos(a)*3.6],.13,iron);
        }
        for(let k=0;k<8;k++){
          const a=k/8*TAU;cylinder(detail,.1,.13,2.3,gold,Math.sin(a)*2.55,13.15,-5+Math.cos(a)*2.55,8);
        }
        for(const y of [12.05,14.35]){const ring=mesh(detail,new T.TorusGeometry(2.65,.14,6,24),gold,0,y,-5);ring.rotation.x=Math.PI/2;}
        cylinder(detail,0,.7,2.4,gold,0,18,-5,8);
        for(const x of [-8,8]){bench(detail,x,1,x>0?-Math.PI/2:Math.PI/2);addWildflowers(root,[x,0,-1],1.1);}
        counts.lighthouseDetails=1;
      }else if(I.kind==='ancient'){
        const detail=architecturalDetails(root);
        for(const x of [-17,17]){
          ruinColumn(detail,x,-5,5.4,false);
          box(detail,4.5,1.25,.8,masonryMaterial,x>0?13.7:-13.7,.75,-18);
          box(detail,4.9,.2,1,stone,x>0?13.7:-13.7,1.48,-18);
          addWildflowers(root,[x*.86,0,-16],1.1);
        }
      }else if(I.kind==='mirror'){
        const detail=architecturalDetails(root);bench(detail,-15,0,Math.PI/2);bench(detail,15,0,-Math.PI/2);
        for(const x of [-15,15])for(let i=0;i<4;i++)addWildflowers(root,[x+Math.sin(i),.16,-6-i*1.6],.9);
      }
    }

    // Upgrade every existing decorative tree from solid canopy primitives to leaf clusters.
    for(const I of islands) {
      const group=worldGroups[I.id];if(!group||I.kind==='boss')continue;
      const trees=[];
      group.traverse(node=>{
        const trunk=node.children?.[0];
        if(node.isGroup&&trunk?.geometry?.type==='CylinderGeometry'&&trunk.geometry.parameters.radiusTop===.23&&trunk.geometry.parameters.height===3.8)trees.push(node);
      });
      for(const tree of trees) {
        tree.children[0].material=barkMaterial;
        for(const b of tree.children.slice(1,3))b.material=barkMaterial;
        const isPine=tree.children[3]?.geometry?.type==='CylinderGeometry';
        // Preserve the original solid canopy for distant silhouettes, then collect it
        // into one island batch. It is only drawn when detailed botanical cards hide.
        const lod=lodFor(group),old=[...tree.children].slice(3);
        group.updateMatrixWorld(true);
        const inverse=new T.Matrix4().copy(group.matrixWorld).invert();
        for(const child of old){
          const transform=new T.Matrix4().multiplyMatrices(inverse,child.matrixWorld);
          tree.remove(child);child.matrix.copy(transform);transform.decompose(child.position,child.quaternion,child.scale);
          lod.low.add(child);
        }
        // Leaves are collected into island batches using the tree transform, keeping draw calls low.
        const canopy=new T.Group();tree.add(canopy);
        if(isPine) {
          for(let level=0;level<5;level++)for(let j=0;j<9;j++) {
            const a=j/9*TAU+level*.35,r=1.75-level*.28,yy=2.9+level*.75;
            beam(tree,[0,yy+.35,0],[Math.cos(a)*r,yy,Math.sin(a)*r],.065,barkMaterial);
            addLeaves(canopy,[Math.cos(a)*r*.7,yy+.12,Math.sin(a)*r*.7],.58-level*.055,9);
          }
        } else {
          for(let cluster=0;cluster<9;cluster++) {
            const a=cluster*2.4,r=cluster?1.25:0,yy=3.8+cluster%3*.62;
            const end=[Math.sin(a)*r,yy,Math.cos(a)*r];beam(tree,[0,2.5,0],end,.09,barkMaterial);addLeaves(canopy,end,.92,32);
          }
        }
        counts.trees++;
      }
      // Low understory hugs the outer rim; the bridge, central route, shops and dock remain open.
      if(I.kind!=='ruins')for(let k=0;k<26;k++) {
        const a=k/26*TAU+.12,r=I.r*(.73+random()*.1),x=Math.sin(a)*r,z=Math.cos(a)*r;
        if(z>I.r*.55&&Math.abs(x)<9)continue;
        if(I.kind==='market'&&z<-8&&Math.abs(x)<18)continue;
        addFern(group,[x,.1,z],1.1+random()*.9,a);addFlowers(group,[x,.2,z],1,7);
        if(k%3===0)addWildflowers(group,[x+.4,.13,z+.5],.8+random()*.4);
      }
      if(I.kind==='ruins')for(const [x,z] of [[-13,14],[13,15],[-10,22],[11,23],[-10,-22],[10,-25]])addFern(group,[x,.1,z],1.5,random()*TAU);
    }
    // Fold all tree-local foliage into their island batches. No per-frame JS leaf transforms.
    for(const [g,items] of [...leafGroups]) {
      let island=g;
      while(island.parent&&!Object.values(worldGroups).includes(island))island=island.parent;
      if(island===g||!Object.values(worldGroups).includes(island))continue;
      island.updateMatrixWorld(true);g.updateMatrixWorld(true);
      const transform=new T.Matrix4().copy(island.matrixWorld).invert().multiply(g.matrixWorld),rotation=new T.Quaternion(),scale=new T.Vector3(),position=new T.Vector3();
      transform.decompose(position,rotation,scale);
      if(!leafGroups.has(island))leafGroups.set(island,[]);
      const q=new T.Quaternion();
      for(const item of items) {
        item.p=new T.Vector3(...item.p).applyMatrix4(transform).toArray();item.s*=scale.x;
        q.setFromEuler(new T.Euler(...item.r)).premultiply(rotation);item.r=new T.Euler().setFromQuaternion(q).toArray().slice(0,3);
        leafGroups.get(island).push(item);
      }
      leafGroups.delete(g);
    }
    for(const [g,items] of [...wildflowerGroups]){
      const island=islandOf(g);if(!island||island===g)continue;
      island.updateMatrixWorld(true);g.updateMatrixWorld(true);
      const transform=new T.Matrix4().copy(island.matrixWorld).invert().multiply(g.matrixWorld);
      const scaling=new T.Vector3(),position=new T.Vector3(),rotation=new T.Quaternion();transform.decompose(position,rotation,scaling);
      if(!wildflowerGroups.has(island))wildflowerGroups.set(island,[]);
      for(const item of items){item.p=new T.Vector3(...item.p).applyMatrix4(transform).toArray();item.s*=scaling.x;wildflowerGroups.get(island).push(item);}
      wildflowerGroups.delete(g);
    }
    const leafGeo=new T.PlaneGeometry(1.15,1.2,2,2);leafGeo.translate(0,.55,0);
    const positions=leafGeo.attributes.position;
    for(let i=0;i<positions.count;i++)positions.setZ(i,Math.sin(positions.getY(i)*2.4)*.09-Math.abs(positions.getX(i))*.23);
    leafGeo.computeVertexNormals();
    const fernGeo=new T.PlaneGeometry(1,1,4,6);fernGeo.translate(0,.48,0);
    const bloomGeo=new T.SphereGeometry(1,6,4);
    const bloomMat=material(0xffffff);
    function instances(parent,geo,mat,items,kind) {
      if(!items.length)return;
      const inst=new T.InstancedMesh(geo,mat,items.length),d=new T.Object3D();inst.name='Village '+kind;
      for(let i=0;i<items.length;i++) {
        const a=items[i];d.position.set(...a.p);
        if(kind==='ferns'||kind==='wildflowers'){d.rotation.set(0,a.r,0);d.scale.set(a.s,a.s,a.s);}
        else {d.rotation.set(...a.r);d.scale.set(a.s,a.s,kind==='flowers'?a.s*.4:a.s);}
        d.updateMatrix();inst.setMatrixAt(i,d.matrix);if(a.color)inst.setColorAt(i,a.color);
      }
      inst.castShadow=false;inst.receiveShadow=true;inst.userData.skyDynamic=kind!=='flowers';
      // r128 does not compute per-instance bounds. The island batches are modest in extent.
      inst.frustumCulled=false;parent.add(inst);
      const lod=lodFor(parent);if(lod)lod.high.push({mesh:inst,leaves:kind==='leaves'?items.length:0});
    }
    for(const [g,a] of leafGroups)instances(g,leafGeo,leafMaterial,a,'leaves');
    for(const [g,a] of fernGroups)instances(g,fernGeo,fernMaterial,a,'ferns');
    for(const [g,a] of flowerGroups)instances(g,bloomGeo,bloomMat,a,'flowers');
    for(const [g,a] of wildflowerGroups)instances(g,fernGeo,wildflowerMaterial,a,'wildflowers');
    for(const [parent,g] of detailGroups){
      M.batchStatic(g);g.userData.skyDynamic=true;
      lodFor(parent).high.push({mesh:g,leaves:0});
    }
    for(const lod of lodGroups.values()){
      // Batch once before marking the whole low-detail layer as switchable.
      M.batchStatic(lod.low);lod.low.userData.skyDynamic=true;lod.low.visible=false;
      lod.root.getWorldPosition(lod.center);
    }

    return {
      update(dt,time,cameraPosition){
        clock.value=time;for(let i=0;i<flags.length;i++)flags[i].rotation.z=Math.sin(time*.8+i*.9)*.016;
        lodStatus.nearIslands=lodStatus.farIslands=lodStatus.detailedLeavesVisible=lodStatus.culledDetailMeshes=0;
        for(const lod of lodGroups.values()){
          if(cameraPosition){
            const distance=lod.center.distanceTo(cameraPosition);
            // Hysteresis prevents flicker when a ship hovers at the transition.
            if(lod.near&&distance>155)lod.near=false;
            else if(!lod.near&&distance<125)lod.near=true;
          }
          lod.low.visible=!lod.near;
          if(lod.near)lodStatus.nearIslands++;else lodStatus.farIslands++;
          for(const item of lod.high){item.mesh.visible=lod.near;if(lod.near)lodStatus.detailedLeavesVisible+=item.leaves;else lodStatus.culledDetailMeshes++;}
        }
      },
      status(){return{loaded:{...loaded},errors:[...errors],...counts,wind:true,lod:{...lodStatus}};}
    };
  }
  return {create};
})();
