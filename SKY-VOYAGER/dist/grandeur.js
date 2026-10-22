/* Cloudsea art expansion. Scenery is independent of collision, quests and saves. */
window.SkyGrandeur = (() => {
  'use strict';
  const T = THREE, M = SkyModels, TAU = Math.PI * 2;
  function create({scene, sky, sea, clouds, renderer}) {
    const root = new T.Group(); root.name = 'Cloudsea monuments'; scene.add(root);
    const rng = M.seeded(20261022), loader = new T.TextureLoader();
    const loaded = {day:false, sunset:false, relief:false};
    const stone = new T.MeshStandardMaterial({color:0xe8dcc0, roughness:.9});
    const gold = M.mat(0xb89a56,{metalness:.35,roughness:.6});
    const roof = M.mat(0x376b72), foliage = M.mat(0x55775a);
    const blue = new T.MeshBasicMaterial({color:0x8ce9e1,transparent:true,opacity:.72,depthWrite:false});
    let skyMaterial = null, skyMix = 0;
    const cloudDay=new T.Color(0xf1f4f1).convertSRGBToLinear(),cloudDusk=new T.Color(0xe9b4bb).convertSRGBToLinear();
    const textures = {};
    for (const [key,file] of [['day','cloudsea-day.png'],['sunset','cloudsea-sunset.png']]) {
      loader.load('assets/epic/'+file, texture => {
        texture.wrapS=T.RepeatWrapping; textures[key]=texture; loaded[key]=true;
        if (!loaded.day || !loaded.sunset) return;
        skyMaterial = new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,
          uniforms:{day:{value:textures.day},dusk:{value:textures.sunset},blend:{value:0}},
          vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader:'uniform sampler2D day;uniform sampler2D dusk;uniform float blend;varying vec2 vUv;void main(){vec3 a=texture2D(day,vUv).rgb;vec3 b=texture2D(dusk,vUv).rgb;gl_FragColor=vec4(mix(a,b,blend),1.);}'
        });
        // Keep the original sky as the loading/error fallback and its weather uniforms intact.
        const panorama=new T.Mesh(new T.SphereGeometry(1290,48,32),skyMaterial);
        panorama.renderOrder=-10;panorama.rotation.y=.7;sky.add(panorama);
        sky.material.visible=false;sea.visible=false;
      });
    }
    loader.load('assets/epic/ancient-relief.png', texture => {
      texture.encoding=T.sRGBEncoding;texture.wrapS=texture.wrapT=T.RepeatWrapping;
      texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      stone.map=texture;stone.bumpMap=texture;stone.bumpScale=.1;stone.needsUpdate=true;loaded.relief=true;
    });

    // Monumental ring: the main northbound route passes beside its unobstructed opening.
    const gate = new T.Group();gate.position.set(-79,38,-115);gate.rotation.y=-.18;root.add(gate);
    for(let i=0;i<32;i++){
      if(i===5||i===21)continue;
      const angle=i/32*TAU;
      const block=new T.Mesh(new T.BoxGeometry(7.6,5.2,5.2),stone);
      block.position.set(Math.cos(angle)*42,Math.sin(angle)*42,0);block.rotation.z=angle+Math.PI/2;gate.add(block);
    }
    for(const z of [-2.8,2.8]){
      const ring=new T.Mesh(new T.TorusGeometry(39.2,.23,5,96),gold);ring.position.z=z;gate.add(ring);
    }
    const halo=new T.Mesh(new T.TorusGeometry(37.8,.14,4,96),blue);gate.add(halo);
    for(let i=0;i<8;i++){
      const angle=i/8*TAU;
      const seal=new T.Mesh(new T.OctahedronGeometry(1.45),blue);
      seal.position.set(Math.cos(angle)*42,Math.sin(angle)*42,3.1);gate.add(seal);
    }
    for(const x of [-43,43]){
      M.cyl(gate,2.4,4.5,31,stone,x,-35,0,8);
      M.cyl(gate,5,6,2.4,gold,x,-20,0,8);
    }
    M.batchStatic(gate);

    const waterfalls=[];
    const waterMaterial=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,
      uniforms:{time:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 vUv;uniform float time;void main(){float strands=.5+.5*sin(vUv.x*105.+sin(vUv.y*13.+time)*1.8);float flow=.65+.35*sin(vUv.y*72.+time*5.);float edge=smoothstep(0.,.12,vUv.x)*smoothstep(0.,.12,1.-vUv.x);float fade=smoothstep(0.,.23,vUv.y);gl_FragColor=vec4(mix(vec3(.42,.78,.82),vec3(.91,.99,.94),strands),edge*fade*(.28+strands*.35)*flow);}'
    });
    function citadel(x,y,z,r,seed) {
      const random=M.seeded(seed), g=new T.Group();g.position.set(x,y,z);root.add(g);
      const cliff=M.cliff(r,seed);cliff.scale.y=3.2;g.add(cliff);
      M.cyl(g,r*.9,r,.9,foliage,0,-.2,0,24);
      const terrace=M.cyl(g,r*.58,r*.65,6,stone,0,2,0,20);
      for(let i=0;i<13;i++){
        const a=i/13*TAU,rad=r*(.24+random()*.23),height=13+random()*23;
        const px=Math.sin(a)*rad,pz=Math.cos(a)*rad;
        M.cyl(g,2.4,3.6,height,stone,px,height/2+5,pz,8);
        M.cyl(g,0,4.1,8,roof,px,height+9,pz,8);
        M.cyl(g,3.1,3.1,1.2,gold,px,height+4,pz,8);
      }
      M.cyl(g,5,7,57,stone,0,32,0,8);M.cyl(g,0,8,16,roof,0,68,0,8);
      for(let i=0;i<7;i++){
        const a=i/7*TAU,px=Math.sin(a)*r*.74,pz=Math.cos(a)*r*.74;
        M.arch(g,px,pz,2.6).rotation.y=a;
      }
      for(let i=0;i<6;i++){
        const a=i/6*TAU,px=Math.sin(a)*r*.89,pz=Math.cos(a)*r*.89;
        const fall=new T.Mesh(new T.PlaneGeometry(4+random()*5,100+random()*35),waterMaterial);
        fall.position.set(px,-54,pz);fall.rotation.y=a;g.add(fall);waterfalls.push(fall);
      }
      // Never batch translucent animated falls with opaque architecture.
      M.batchStatic(g,new Set(waterfalls));return g;
    }
    citadel(370,24,-190,82,111);
    citadel(-440,35,80,95,222);
    citadel(330,45,-700,112,333);
    citadel(-215,55,-890,124,444);

    // Ruin pillars sit off the playable bridge and give it a cathedral-like backdrop.
    const sanctum=new T.Group();sanctum.position.set(0,0,-224);root.add(sanctum);
    for(const x of [-23,23]){
      M.cyl(sanctum,1.8,3.2,24,stone,x,6,-6,8);
      M.cyl(sanctum,3,3.5,2,gold,x,18,-6,8);
      M.cyl(sanctum,0,2.7,7,roof,x,22,-6,8);
    }
    const crown=new T.Mesh(new T.TorusGeometry(22,.9,6,48,Math.PI),stone);
    crown.position.set(0,18,-6);sanctum.add(crown);M.batchStatic(sanctum);

    // Harbor entrance columns stay outside the landing corridor.
    const harbor=new T.Group();root.add(harbor);
    for(const x of [-10,10]){
      M.cyl(harbor,.7,1.3,7.5,stone,x,3.4,26,8);
      M.cyl(harbor,0,1.1,2.2,roof,x,8.2,26,6);
      M.lantern(harbor,x,5.8,27);
    }
    M.batchStatic(harbor);

    // Lightweight distant merchant traffic, never enemies or landing targets.
    const fleet=[];
    for(let i=0;i<6;i++){
      const g=new T.Group(), hull=M.cyl(g,1.7,1.1,2.4,M.palette.wood,0,0,0,8);hull.scale.z=3.2;
      M.box(g,.16,8,.16,M.palette.darkWood,0,4,0);
      const sail=new T.Mesh(new T.PlaneGeometry(5.7,5.8,1,1),M.mat(i%2?0xe9d8ad:0x387e83,{side:T.DoubleSide}));
      sail.position.set(0,5.1,0);g.add(sail);g.scale.setScalar(.6+i*.08);root.add(g);M.batchStatic(g);
      fleet.push({g,phase:i/6*TAU,radius:230+i*34,height:15+i*5});
    }
    const birdGeo=new T.BufferGeometry();birdGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-1,.3,.25,-.75,0,.5,0,0,0,.75,0,.5,1,.3,.25],3));birdGeo.computeVertexNormals();
    const birds=new T.InstancedMesh(birdGeo,new T.MeshBasicMaterial({color:0xe6f0e9,side:T.DoubleSide}),24);birds.frustumCulled=false;root.add(birds);
    const transform=new T.Object3D();
    const landmarks=[{name:'風を継ぐ天空門',subtitle:'THE GATE OF WINDS',x:-79,z:-115,r:135},
      {name:'白金の浮遊王都',subtitle:'THE IVORY CITADEL',x:370,z:-190,r:250},
      {name:'雲上の大聖堂',subtitle:'CATHEDRAL ABOVE THE CLOUDS',x:-215,z:-890,r:350}];
    const seen=new Set();let announcement=0,lastTime=0;
    const caption=document.createElement('div');caption.id='vista-caption';caption.setAttribute('aria-live','polite');document.getElementById('hud').append(caption);
    function update(dt,time,position,state,playing) {
      waterMaterial.uniforms.time.value=time;
      const target=state?.mode==='walk' ? (state.island==='captain' ? 1 : state.island==='mirror' ? .65 : 0) : 0;
      skyMix=T.MathUtils.lerp(skyMix,target,Math.min(1,dt*.6));if(skyMaterial)skyMaterial.uniforms.blend.value=skyMix;
      clouds.material.color.copy(cloudDay).lerp(cloudDusk,skyMix);
      fleet.forEach(({g,phase,radius,height})=>{const a=time*.007+phase;g.position.set(Math.cos(a)*radius,height+Math.sin(time*.2+phase)*1.5,-260+Math.sin(a)*radius);g.rotation.y=-a;});
      for(let i=0;i<24;i++){
        const a=time*.075+i*.28,band=Math.floor(i/8),radius=55+band*38;
        transform.position.set(Math.sin(a)*radius,17+band*8+Math.sin(a*2)*3,-95+Math.cos(a)*radius);
        transform.rotation.set(0,-a,Math.sin(time*3+i)*.12);transform.scale.set(1,.6+Math.abs(Math.sin(time*4+i))*.9,1);transform.updateMatrix();birds.setMatrixAt(i,transform.matrix);
      }birds.instanceMatrix.needsUpdate=true;
      if(playing&&state?.mode==='flight'&&time-lastTime>1){lastTime=time;for(const l of landmarks){
        if(!seen.has(l.name)&&Math.hypot(position.x-l.x,position.z-l.z)<l.r){seen.add(l.name);caption.innerHTML='<small>'+l.subtitle+'</small><strong>'+l.name+'</strong><span>雲海の風景を発見</span>';caption.classList.add('visible');announcement=time+5;break;}
      }}
      if(time>announcement)caption.classList.remove('visible');
    }
    return {update, status:()=>({loaded:{...loaded},generatedImages:4,skyBlend:Math.round(skyMix*100)/100,monuments:4,traffic:6})};
  }
  return {create};
})();
