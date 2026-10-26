(() => {
  const hash = (east, north, salt = 0) => {
    let value = Math.imul(east | 0, 374761393) ^ Math.imul(north | 0, 668265263) ^ Math.imul(salt + 731, 1274126177);
    value = Math.imul(value ^ value >>> 13, 1274126177);
    return ((value ^ value >>> 16) >>> 0) / 4294967296;
  };
  const smooth = (value) => value * value * (3 - 2 * value);
  const noise = (east, north, salt = 0) => {
    const column = Math.floor(east), row = Math.floor(north);
    const horizontal = smooth(east - column), vertical = smooth(north - row);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(column, row, salt), hash(column + 1, row, salt), horizontal), THREE.MathUtils.lerp(hash(column, row + 1, salt), hash(column + 1, row + 1, salt), horizontal), vertical);
  };
  const fbm = (east, north, salt = 0) => noise(east, north, salt) * 0.58 + noise(east * 2, north * 2, salt + 1) * 0.27 + noise(east * 4, north * 4, salt + 2) * 0.15;
  const riverCenter = (north) => Math.sin(north * 0.0028) * 180 + Math.sin(north * 0.008) * 40;
  function legacyHeight(east, north) {
    const broad = fbm(east / 820, north / 820, 5);
    const ridge = 1 - Math.abs(noise(east / 330, north / 330, 41) * 2 - 1);
    const channel = Math.exp(-(((east - riverCenter(north)) / 57) ** 2));
    const base = 12 + (broad - 0.25) * 100 + Math.pow(ridge, 4) * Math.max(0, broad - 0.35) * 320 + fbm(east / 80, north / 80, 22) * 12 - channel * 68;
    const massif = Math.max(0,fbm(east / 1800,north / 1800,211)-0.53);
    if (massif === 0) return base;
    const envelope = massif * massif / (massif+0.035);
    const warpedEast = east + (noise(east/1400,north/1400,213)-0.5)*620;
    const warpedNorth = north + (noise(east/1400,north/1400,214)-0.5)*620;
    const along = warpedEast*0.84+warpedNorth*0.54, across = -warpedEast*0.54+warpedNorth*0.84;
    const backbone = 1-Math.abs(noise(along/720,across/1050,212)*2-1);
    const spurs = 1-Math.abs(noise((along+across*0.24)/310,across/390,215)*2-1);
    const ribs = 1-Math.abs(noise((along-across*0.32)/135,across/170,216)*2-1);
    const ridgeline = Math.pow(backbone,2.65);
    const erosion = 0.58+0.3*Math.pow(spurs,2)+0.12*Math.pow(ribs,2);
    const foothills = 240+spurs*spurs*170;
    return base + envelope*(foothills+ridgeline*4250*erosion);
  }
  function smoothHeight(east, north) {
    const broad = fbm(east / 820, north / 820, 5);
    const ridge = 1 - Math.abs(noise(east / 330, north / 330, 41) * 2 - 1);
    const channel = Math.exp(-(((east - riverCenter(north)) / 80) ** 2));
    const base = 12 + (broad - 0.25) * 100 + Math.pow(1 - (1-ridge)*(1-ridge), 4) * Math.max(0, broad - 0.35) * 180 + fbm(east / 120, north / 120, 22) * 5 - channel * 42;
    const massif = Math.max(0,fbm(east / 1800,north / 1800,211)-0.53);
    if (massif === 0) return base;
    const envelope = massif * massif / (massif+0.035);
    const warpedEast = east + (noise(east/1400,north/1400,213)-0.5)*620;
    const warpedNorth = north + (noise(east/1400,north/1400,214)-0.5)*620;
    const along = warpedEast*0.84+warpedNorth*0.54, across = -warpedEast*0.54+warpedNorth*0.84;
    const backbone = 1-Math.abs(noise(along/720,across/1050,212)*2-1);
    const spurs = 1-Math.abs(noise((along+across*0.24)/310,across/390,215)*2-1);
    const ribs = 1-Math.abs(noise((along-across*0.32)/135,across/170,216)*2-1);
    const ridgeline = Math.pow(1-(1-backbone)*(1-backbone),2.65);
    const erosion = 0.72+0.24*Math.pow(spurs,2)+0.04*Math.pow(ribs,2);
    const foothills = 240+spurs*spurs*170;
    return base + envelope*(foothills+ridgeline*2400*erosion);
  }
  const terrainStep = 128 / 24, terrainVertices = new Map();
  function vertexHeight(column, row) {
    const key = column + ',' + row;
    if (terrainVertices.has(key)) return terrainVertices.get(key);
    const value = Math.fround(smoothHeight(column * terrainStep, row * terrainStep));
    if (terrainVertices.size > 180000) terrainVertices.clear();
    terrainVertices.set(key, value); return value;
  }
  function height(east, north) {
    const gx=east/terrainStep, gz=north/terrainStep, ix=Math.floor(gx), iz=Math.floor(gz), u=gx-ix, v=gz-iz;
    const a=vertexHeight(ix,iz), b=vertexHeight(ix+1,iz), c=vertexHeight(ix,iz+1), d=vertexHeight(ix+1,iz+1);
    const base=u+v<=1 ? a+(b-a)*u+(c-a)*v : d+(c-d)*(1-u)+(b-d)*(1-v);
    return base+(window.EmberTerrain?.entranceLift?.(east,north)||0);
  }
  function terrainNormal(east, north) {
    return new THREE.Vector3(height(east-3,north)-height(east+3,north),6,height(east,north-3)-height(east,north+3)).normalize();
  }
  const biomes = [
    { id: 'meadow', name: '風渡る草原', color: '#9eae75', family: 0 },
    { id: 'forest', name: '深緑の原生林', color: '#638361', family: 1 },
    { id: 'alpine', name: '天空の山稜', color: '#9b9d93', family: 2 },
    { id: 'snow', name: '白銀の雪山', color: '#d5e3e5', family: 3 },
    { id: 'desert', name: '夕映えの渓谷', color: '#c1a27b', family: 18 },
    { id: 'autumn', name: '黄金の紅葉林', color: '#b19d6b', family: 5 },
    { id: 'wetland', name: '水鏡の湿原', color: '#839d8c', family: 7 }
  ];
  function biome(east, north, altitude = height(east, north)) {
    if (altitude < 10) return biomes[6];
    if (altitude > 430) return biomes[3];
    if (altitude > 160) return biomes[2];
    const climate = noise(east / 550, north / 550, 74);
    if (climate < 0.3) return biomes[4];
    if (climate > 0.69) return biomes[5];
    if (noise(east / 230, north / 230, 92) > 0.49) return biomes[1];
    return biomes[0];
  }
  const fade = (a,b,x) => smooth(THREE.MathUtils.clamp((x-a)/(b-a),0,1));
  const groundTints = biomes.map(b=>new THREE.Color(b.color).convertSRGBToLinear().multiplyScalar(0.8));
  // Continuous, deterministic climate weights in absolute map coordinates.
  function surfaceSample(east,north,altitude=height(east,north)) {
    const wet=1-fade(0,24,altitude), snow=fade(390,480,altitude);
    const alpine=fade(125,205,altitude)*(1-snow), low=(1-wet)*Math.max(0,1-alpine-snow);
    const climate=noise(east/550,north/550,74);
    const desert=1-fade(.22,.38,climate), autumn=fade(.61,.77,climate);
    const forest=fade(.35,.63,noise(east/230,north/230,92));
    const mild=1-desert-autumn;
    const weights=[low*mild*(1-forest),low*mild*forest,(1-wet)*alpine,(1-wet)*snow,low*desert,low*autumn,wet];
    const tint=new THREE.Color(0,0,0);weights.forEach((w,i)=>{tint.r+=groundTints[i].r*w;tint.g+=groundTints[i].g*w;tint.b+=groundTints[i].b*w;});
    return {weights,tint,cover:[weights[0],weights[1],weights[5]],sand:weights[4]};
  }
  const species = Wildlife.species;
  const geometryCache = new Map();
  function geometry(kind) {
    if (!geometryCache.has(kind)) geometryCache.set(kind, kind === 'sphere' ? new THREE.SphereGeometry(1, 10, 7) : kind === 'cone' ? new THREE.ConeGeometry(1, 1, 8) : kind === 'trunk' ? new THREE.CylinderGeometry(0.6, 1, 1, 7) : new THREE.BoxGeometry(1, 1, 1));
    return geometryCache.get(kind);
  }
  class NatureWorld {
    constructor(scene) {
      this.scene = scene; this.chunks = new Map(); this.queue = []; this.center = ''; this.offset = new THREE.Vector3(); this.animals = []; this.occluders = []; this.materials = new Map(); this.waterLevel = 4; this.horizonSamples = new Map();
      this.loader = new THREE.TextureLoader();
      this.desertSand=this.loader.load('assets/survival/terrain/desert-sand-v1.png');this.desertSand.wrapS=this.desertSand.wrapT=THREE.RepeatWrapping;this.desertSand.encoding=THREE.sRGBEncoding;this.desertSand.anisotropy=8;
      this.atlas = this.loader.load('assets/nature-atlas.png'); this.atlas.flipY = false;
      this.atlas.encoding = THREE.sRGBEncoding; this.atlas.anisotropy = 4;
      this.originals = {};
      for (const name of ['moss', 'rock', 'bark', 'fur', 'forest-floor', 'alpine-cliff']) {
        const texture = this.loader.load(`assets/originals/${name}.png`);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.encoding = THREE.sRGBEncoding; texture.anisotropy = 4;
        this.originals[name] = texture;
      }
      this.vegetation = new Vegetation(this.loader, this.originals.bark);
      this.shadowGeometry = new THREE.PlaneGeometry(1, 1);
      this.shadowMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, vertexShader: 'varying vec2 vShade; void main(){vShade=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying vec2 vShade; void main(){float shade=1.0-smoothstep(0.05,0.5,length(vShade-0.5)); gl_FragColor=vec4(0.12,0.15,0.1,shade*0.28);}' });
      this.riverbed=this.loader.load('assets/survival/exploration/riverbed-v1.png');this.riverbed.wrapS=this.riverbed.wrapT=THREE.RepeatWrapping;this.riverbed.encoding=THREE.sRGBEncoding;this.riverbed.anisotropy=4;
      this.terrainMaterial = new THREE.MeshStandardMaterial({ roughness: 0.98, vertexColors: true, bumpMap: this.originals.rock, bumpScale: 0.06 });
      this.terrainMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.riverbed={value:this.riverbed};
        shader.uniforms.desertSand={value:this.desertSand};
        shader.uniforms.natureAtlas = { value: this.atlas };
        shader.uniforms.mossDetail = { value: this.originals.moss };
        shader.uniforms.rockDetail = { value: this.originals.rock };
        shader.uniforms.cliffDetail = { value: this.originals['alpine-cliff'] };
        shader.uniforms.forestFloor = { value: this.originals['forest-floor'] };
        
        shader.vertexShader = 'attribute vec3 terrainLocation; attribute vec3 groundCover; attribute float sandCover; varying float vSand; varying vec3 vNature; varying vec3 vGroundNormal; varying vec3 vGroundCover;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvNature = terrainLocation; vGroundNormal = normal; vGroundCover = groundCover; vSand = sandCover;');
        shader.fragmentShader = `uniform sampler2D riverbed; uniform sampler2D desertSand; uniform sampler2D natureAtlas; uniform sampler2D mossDetail; uniform sampler2D rockDetail; uniform sampler2D cliffDetail; uniform sampler2D forestFloor; varying float vSand; varying vec3 vNature; varying vec3 vGroundNormal; varying vec3 vGroundCover;
          float groundHash(vec2 cell) { return fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453); }
          float groundNoise(vec2 point) {
            vec2 cell=floor(point), blend=fract(point); blend=blend*blend*(3.0-2.0*blend);
            return mix(mix(groundHash(cell),groundHash(cell+vec2(1,0)),blend.x),mix(groundHash(cell+vec2(0,1)),groundHash(cell+vec2(1,1)),blend.x),blend.y);
          }
        ` + shader.fragmentShader;
        window.EmberTerrain?.cutCaveMouths?.(shader);
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          // Use one stable sand tile; climate weights blend it into neighbouring soils.
          vec2 tile = vec2(4.0,28.0); // Desert family 18, atlas tile 900.
          vec2 tileUV = (tile + (fract(vNature.xz / 14.0) * 126.0 + 1.0) / 128.0) / 32.0;
          vec3 detail = texture2D(natureAtlas, tileUV).rgb;
          vec3 axisWeight = pow(abs(normalize(vGroundNormal)), vec3(4.0)); axisWeight /= max(0.001, axisWeight.x + axisWeight.y + axisWeight.z);
          vec3 rock = texture2D(rockDetail, vNature.yz / 4.0).rgb * axisWeight.x + texture2D(rockDetail, vNature.xz / 4.0).rgb * axisWeight.y + texture2D(rockDetail, vNature.xy / 4.0).rgb * axisWeight.z;
          vec3 cliff = texture2D(cliffDetail,vNature.zy / vec2(95.0,145.0)).rgb * axisWeight.x + texture2D(cliffDetail,vNature.xz / 100.0).rgb * axisWeight.y + texture2D(cliffDetail,vNature.xy / vec2(95.0,145.0)).rgb * axisWeight.z;
          float mineral = groundNoise(vec2(vNature.x+vNature.z*0.3,vNature.y*2.4)/150.0);
          cliff *= mix(vec3(0.76,0.81,0.86),vec3(1.0,0.95,0.86),mineral);
          cliff = mix(cliff,vec3(dot(cliff,vec3(0.22,0.7,0.08))),0.15);
          cliff = mix(cliff,vec3(0.47,0.51,0.53),smoothstep(350.0,2400.0,length(vViewPosition))*0.68);
          rock = mix(rock,cliff,smoothstep(50.0,260.0,length(vViewPosition)) * 0.85);
          rock *= mix(vec3(0.65,0.72,0.62),vec3(1.0),smoothstep(35.0,115.0,vNature.y));
          vec3 moss = texture2D(mossDetail, vNature.xz / 3.5).rgb;
          vec3 litter = texture2D(forestFloor, vNature.xz / 4.1).rgb;
          float macro = groundNoise(vNature.xz/95.0)*0.6+groundNoise(vNature.xz/31.0)*0.3+groundNoise(vNature.xz/8.0)*0.1;
          vec3 original = mix(litter, moss, smoothstep(0.45,0.85,macro) * 0.6);
          float detailLight = dot(detail, vec3(0.299, 0.587, 0.114));
          float originalLight = dot(original, vec3(0.299, 0.587, 0.114));
          float distanceFade = 1.0 - smoothstep(35.0,180.0,length(vViewPosition));
          diffuseColor.rgb *= (0.72 + (detailLight-0.5) * 0.16 * distanceFade) * (0.76 + macro * 0.35);
          float forestBlend = clamp(vGroundCover.y+vGroundCover.z,0.0,1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, pow(original, vec3(2.2)) * 0.85, forestBlend * 0.9);
          float grassBlend = clamp(vGroundCover.x,0.0,1.0);
          vec3 meadow = mix(vec3(0.10,0.14,0.047),vec3(0.18,0.21,0.095),macro);
          meadow *= 0.86+dot(moss,vec3(0.299,0.587,0.114))*0.42;
          diffuseColor.rgb = mix(diffuseColor.rgb,meadow,grassBlend*0.85);
          vec2 sandUV=vNature.xz/5.5;
          vec3 fineSand=texture2D(desertSand,sandUV).rgb;
          vec3 coarseSand=texture2D(desertSand,mat2(.8,-.6,.6,.8)*sandUV*.29+vec2(.37,.19)).rgb;
          vec3 sand=pow(mix(fineSand,coarseSand,.27),vec3(2.2))*(.84+macro*.22);
          diffuseColor.rgb = mix(diffuseColor.rgb,sand,vSand*0.85);
          float slope = 1.0 - abs(normalize(vGroundNormal).y);
          float upland = smoothstep(100.0,220.0,vNature.y);
          vec3 alpineGrass = mix(vec3(0.10,0.13,0.055),vec3(0.20,0.21,0.12),macro);
          diffuseColor.rgb = mix(diffuseColor.rgb,alpineGrass,upland);
          float rockBlend = smoothstep(0.10,0.38,slope)+smoothstep(180.0,480.0,vNature.y)*0.68;
          diffuseColor.rgb = mix(diffuseColor.rgb,pow(rock,vec3(2.2))*0.8,clamp(rockBlend,0.0,1.0));
          float lee = dot(normalize(vGroundNormal),normalize(vec3(-0.4,0.2,0.7)))*38.0;
          float snowLine = 420.0+(groundNoise(vNature.xz/240.0)-0.5)*90.0;
          float snowCover = (1.0-smoothstep(0.22,0.58,slope))*smoothstep(snowLine-35.0,snowLine+95.0,vNature.y+macro*27.0+lee);
          diffuseColor.rgb = mix(diffuseColor.rgb,vec3(0.70,0.76,0.79)*(0.9+macro*0.12),snowCover);
          float submerged=1.0-smoothstep(3.4,5.5,vNature.y); diffuseColor.rgb=mix(diffuseColor.rgb,pow(texture2D(riverbed,vNature.xz/8.0).rgb,vec3(2.2))*.88,submerged);
          float groundBump = mix(originalLight * max(forestBlend,grassBlend),dot(rock,vec3(0.299,0.587,0.114)),clamp(rockBlend,0.0,1.0)) * 0.025 * distanceFade;
          groundBump=mix(groundBump,dot(fineSand,vec3(.299,.587,.114))*.018*distanceFade,vSand);
          groundBump *= mix(1.0,0.12,snowCover);
        `);
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', 'normal = perturbNormalArb(-vViewPosition, normal, vec2(dFdx(groundBump), dFdy(groundBump)), faceDirection);');
      };
      this.waterUniforms = { clock: { value: 0 }, horizon: { value: new THREE.Color('#a0bfc6') }, zenith: { value: new THREE.Color('#5499c2') }, sunDirection: { value: new THREE.Vector3(0.3,0.7,-0.5) }, daylight: { value: 1 } };
      this.waterUniforms.cloudLayer = { value: null }; this.waterUniforms.cloudShift = { value: 0 }; this.waterUniforms.dusk = { value: 0 };
      this.waterUniforms.moonDirection = { value: new THREE.Vector3(0,1,0) }; this.waterUniforms.moonlight = { value: 0 };
      this.waterUniforms.cloudTime = { value: 0 }; this.waterUniforms.cloudCover = { value: 0 };
      const waterMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side:THREE.DoubleSide, uniforms: this.waterUniforms,
        vertexShader: 'varying vec3 vWater; void main(){vWater=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWater,1.0);}',
        fragmentShader: `varying vec3 vWater; uniform float clock; uniform vec3 horizon; uniform vec3 zenith; uniform vec3 sunDirection; uniform float daylight; uniform sampler2D cloudLayer; uniform float cloudShift; uniform float cloudTime; uniform float cloudCover; uniform float dusk; uniform vec3 moonDirection; uniform float moonlight;
          void main(){
            vec2 point=vWater.xz; float distanceToEye=length(cameraPosition-vWater);
            float fineFade=1.0-smoothstep(35.0,260.0,distanceToEye);
            float warp=sin(point.x*0.019+point.y*0.027+clock*0.11)*1.8+sin(point.x*0.043-point.y*0.017)*0.7;
            float swell=sin(point.x*0.084+point.y*0.063+clock*0.41+warp);
            float waves=sin(point.x*0.37-point.y*0.21+clock*0.83+warp);
            float crosswave=sin(point.x*0.67+point.y*0.52-clock*1.14+warp*0.73)*fineFade;
            float ripple=sin(point.x*1.43-point.y*1.17+clock*1.93+warp*1.2)*fineFade;
            vec3 normal=normalize(vec3(swell*0.012+waves*0.014+crosswave*0.012+ripple*0.004,1.0,swell*0.009-waves*0.009+crosswave*0.009-ripple*0.003));
            if(cameraPosition.y<vWater.y)normal=-normal;vec3 view=normalize(cameraPosition-vWater); vec3 reflection=reflect(-view,normal); float fresnel=0.035+0.965*pow(1.0-max(0.0,dot(view,normal)),5.0);
            vec3 reflectedSky=mix(horizon,zenith,smoothstep(0.0,0.65,reflection.y));
            float longitude=fract(atan(reflection.z,reflection.x)*0.47746483+0.5+cloudTime*0.000018+cloudShift);
            float latitude=clamp(asin(clamp(reflection.y,0.0,1.0))*0.8276057,0.0,1.0);
            vec4 cloud=texture2D(cloudLayer,vec2(longitude,latitude),2.0);
            vec4 overlap=texture2D(cloudLayer,vec2(fract(longitude+0.5),latitude),2.0);
            cloud=mix(cloud,overlap,smoothstep(0.88,1.0,abs(longitude-0.5)*2.0));
            float cloudLight=pow(dot(cloud.rgb,vec3(0.22,0.70,0.08)),1.4);
            vec3 reflectedCloud=mix(vec3(0.22,0.28,0.36),vec3(0.98,0.97,0.93),cloudLight);
            reflectedCloud=mix(reflectedCloud,reflectedCloud*vec3(1.5,0.72,0.37),dusk*0.65)*(0.018+daylight*(1.05-cloudCover*0.4)+dusk*0.14+moonlight*0.12);
            float cloudOpacity=cloud.a*smoothstep(0.008,0.055,reflection.y)*(0.08+cloudCover*0.92);
            reflectedSky=mix(reflectedSky,reflectedCloud,cloudOpacity*0.78);
            vec3 water=mix(vec3(0.025,0.085,0.075)*(0.15+daylight*0.85+moonlight*0.18),reflectedSky,fresnel*0.88+0.08);
            water+=vec3(1.0,0.86,0.65)*pow(max(0.0,dot(reflect(-sunDirection,normal),view)),450.0)*daylight*2.8;
            water+=vec3(0.58,0.72,0.94)*pow(max(0.0,dot(reflect(-moonDirection,normal),view)),280.0)*moonlight*0.8;
            water=mix(water,horizon,1.0-exp(-length(cameraPosition-vWater)*0.00028));
            gl_FragColor=vec4(water,mix(0.24,0.76,clamp(fresnel*1.4+distanceToEye/3500.0,0.0,1.0)));
            #include <tonemapping_fragment>
            #include <encodings_fragment>
          }` });
      this.water = new THREE.Mesh(new THREE.PlaneGeometry(11000, 11000), waterMaterial); this.water.rotation.x = -Math.PI / 2; this.water.position.y = 4; scene.add(this.water);
      this.destinations = [];
      for (const region of biomes) {
        let selected;
        const mountain = region.id === 'alpine' || region.id === 'snow';
        for (let ring = 0; ring < 70 && !selected; ring++) for (let sample = 0; sample < 24; sample++) {
          const east = 140 + Math.cos(sample * Math.PI / 12) * ring * 100;
          const north = 120 + Math.sin(sample * Math.PI / 12) * ring * 100;
          if (biome(east, north).id !== region.id || height(east, north) <= 6) continue;
          if (mountain && terrainNormal(east,north).y < 0.91) continue;
          selected = { ...region, east, north };
          if (mountain) {
            let lowest = Infinity;
            for (let direction = 0; direction < 24; direction++) {
              const angle = direction*Math.PI/12;
              const viewHeight = height(east+Math.sin(angle)*120,north+Math.cos(angle)*120);
              if (viewHeight < lowest) { lowest = viewHeight; selected.yaw = angle+Math.PI; }
            }
          }
          break;
        }
        if (selected) this.destinations.push(selected);
      }
    }
    material(color, textureName) {
      const key = color + (textureName || '');
      if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), map: textureName ? this.originals[textureName] : null, roughness: 0.9 }));
      return this.materials.get(key);
    }
    part(group, kind, color, position, scale, textureName) {
      const mesh = new THREE.Mesh(geometry(kind), this.material(color, textureName));
      mesh.position.set(...position); mesh.scale.set(...scale); group.add(mesh); return mesh;
    }
    animal(spec, east, north, salt, group) {
      const rig = Wildlife.create(spec, this.originals.fur), model = rig.model; group.add(model);
      model.position.set(east, height(east + group.userData.east, north + group.userData.north), north);
      const shadow = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial); shadow.rotation.x = -Math.PI / 2;
      shadow.scale.set(spec.width * spec.scale * 5, spec.length * spec.scale * 1.6, 1); group.add(shadow);
      const entry = { model, rig, shadow, spec, east, north, salt, chunk: group, offset: rig.focusHeight, travelled: 0, previousTime: null, heading: salt };
      model.castShadow = true; model.receiveShadow = true;
      rig.groundAt = (localEast, localNorth) => {
        const cosine = Math.cos(model.rotation.y), sine = Math.sin(model.rotation.y);
        const worldEast = group.userData.east + model.position.x + (localEast * cosine + localNorth * sine) * spec.scale;
        const worldNorth = group.userData.north + model.position.z + (localNorth * cosine - localEast * sine) * spec.scale;
        return (height(worldEast, worldNorth) - model.position.y) / spec.scale;
      };
      this.animals.push(entry); return entry;
    }
    updateHorizon(column, row) {
      if (this.horizon) { this.scene.remove(this.horizon); this.occluders = this.occluders.filter((mesh) => mesh !== this.horizon); this.horizon.geometry.dispose(); }
      const surface = new THREE.PlaneGeometry(8192, 8192, 256, 256); surface.rotateX(-Math.PI / 2);
      const positions = surface.attributes.position, colors = [], families = [], normals = [], indices = [], locations=[], covers=[], sands=[];
      const centerEast = column * 128 + 64, centerNorth = row * 128 + 64;
      const nextSamples = new Map();
      for (let index = 0; index < positions.count; index++) {
        const east = centerEast + positions.getX(index), north = centerNorth + positions.getZ(index);
        const key = `${east},${north}`;
        let sample = this.horizonSamples.get(key);
        if (!sample) {
          const ground = height(east,north), region = biome(east,north,ground);
          sample = { ground, family: region.family, ...surfaceSample(east,north,ground), normal: terrainNormal(east,north) };
        }
        nextSamples.set(key,sample);locations.push(east,sample.ground,north);covers.push(...sample.cover);sands.push(sample.sand);
        positions.setXYZ(index,east-this.offset.x,sample.ground-4,north-this.offset.z); colors.push(sample.tint.r,sample.tint.g,sample.tint.b); families.push(sample.family); normals.push(sample.normal.x,sample.normal.y,sample.normal.z);
      }
      this.horizonSamples = nextSamples;
      for (let rowIndex = 0; rowIndex < 256; rowIndex++) for (let columnIndex = 0; columnIndex < 256; columnIndex++) {
        const horizontal = (columnIndex + 0.5) * 32 - 4096, vertical = (rowIndex + 0.5) * 32 - 4096;
        if (Math.abs(horizontal) < 576 && Math.abs(vertical) < 576) continue;
        const vertex = rowIndex * 257 + columnIndex; indices.push(vertex,vertex+257,vertex+1,vertex+1,vertex+257,vertex+258);
      }
      surface.setAttribute('terrainLocation',new THREE.Float32BufferAttribute(locations,3));surface.setAttribute('groundCover',new THREE.Float32BufferAttribute(covers,3));surface.setAttribute('sandCover',new THREE.Float32BufferAttribute(sands,1));
      surface.setIndex(indices); surface.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); surface.setAttribute('family',new THREE.Float32BufferAttribute(families,1)); surface.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3)); surface.computeBoundingSphere();
      this.horizon = new THREE.Mesh(surface,this.terrainMaterial); this.scene.add(this.horizon); this.occluders.push(this.horizon);
    }
    createChunk(column, row, distant = false) {
      const size = 128, divisions = distant ? 8 : 24;
      const group = new THREE.Group(); group.userData = { east: column * size, north: row * size, owned: [], distant };
      group.position.set(column * size - this.offset.x, 0, row * size - this.offset.z);
      const surface = new THREE.PlaneGeometry(size, size, divisions, divisions); surface.rotateX(-Math.PI / 2); surface.translate(size / 2, 0, size / 2);
      const points = surface.attributes.position; const colors = [], families = [], normals = [], locations=[], covers=[], sands=[];
      for (let index = 0; index < points.count; index++) {
        const east = column * size + points.getX(index), north = row * size + points.getZ(index);
        const altitude = height(east, north), region = biome(east, north, altitude);
        points.setY(index, altitude); const sample=surfaceSample(east,north,altitude),shade=sample.tint;locations.push(east,altitude,north);covers.push(...sample.cover);sands.push(sample.sand); colors.push(shade.r, shade.g, shade.b); families.push(region.family);
        const normal = terrainNormal(east,north); normals.push(normal.x,normal.y,normal.z);
      }
      surface.setAttribute('terrainLocation',new THREE.Float32BufferAttribute(locations,3));surface.setAttribute('groundCover',new THREE.Float32BufferAttribute(covers,3));surface.setAttribute('sandCover',new THREE.Float32BufferAttribute(sands,1));
      surface.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); surface.setAttribute('family', new THREE.Float32BufferAttribute(families, 1)); surface.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      const terrain = new THREE.Mesh(surface, this.terrainMaterial); terrain.receiveShadow = true; group.add(terrain); group.userData.terrain = terrain; group.userData.owned.push(surface); this.occluders.push(terrain);
      const region = biome(column * size + 64, row * size + 64);
      const trees = [], rocks = [], flowers = [];
      for (let index = 0; index < 121; index++) {
        const east = (index % 11+0.1+hash(column,row,index*3)*0.8)*size/11, north = (Math.floor(index/11)+0.1+hash(column,row,index*3+1)*0.8)*size/11;
        const worldEast = east + column * size, worldNorth = north + row * size;
        const altitude = height(worldEast, worldNorth), localBiome = biome(worldEast, worldNorth, altitude);
        const scale = 0.65+Math.pow(hash(column,row,index*3+2),0.7)*1.3;
        const grove = noise(worldEast / 110,worldNorth / 110,416), woodland = ['forest','autumn'].includes(localBiome.id);
        const treeAllowed = woodland ? grove > 0.17 && hash(column,row,index+7800) < 0.62+grove*0.45 : index % 4 === 0 && grove > 0.48;
        const spaced = !trees.some((tree) => Math.hypot(tree.east-east,tree.north-north) < 5.4+Math.min(tree.scale,scale)*0.7);
        if (!window.KomorebiSurvivalPlacement?.excludeTree(worldEast,worldNorth) && treeAllowed && spaced && altitude > 6 && altitude < 245 && localBiome.id !== 'desert' && Math.hypot(worldEast - 211, worldNorth - 191) > 15 && !this.destinations.some((point) => Math.hypot(worldEast - point.east, worldNorth - point.north) < 12)) trees.push({ east, north, altitude, scale, autumn: localBiome.id === 'autumn', conifer: altitude > 145 || (localBiome.id !== 'autumn' && hash(column, row, index + 7600) > 0.65) });
        if (index < 12) {
          const rockEast = hash(column, row, 7000 + index) * size, rockNorth = hash(column, row, 7100 + index) * size;
          const rockAltitude = height(column * size + rockEast, row * size + rockNorth);
          if (rockAltitude > 5 && !window.KomorebiSurvivalPlacement?.excludeTree(column*size+rockEast,row*size+rockNorth)) if(!window.KomorebiSurvivalPlacement?.excludeRock?.(worldEast,worldNorth))rocks.push({ east: rockEast, north: rockNorth, altitude: rockAltitude, scale });
        }
        if (index < 30 && altitude > 7 && altitude < 85 && !window.KomorebiSurvivalPlacement?.excludeTree(worldEast,worldNorth)) flowers.push({ east, north, altitude, scale });
      }
      const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
      group.userData.trees = trees; group.userData.rocks = rocks;
      if (distant) {
        this.vegetation.buildDistant(group, trees, hash);
        this.scene.add(group); this.chunks.set(`${column},${row}`,group); return;
      }
      const instances = (items, kind, color, transform, textureName) => {
        if (!items.length) return;
        const mesh = new THREE.InstancedMesh(geometry(kind), this.material(color, textureName), items.length);
        items.forEach((item, index) => {
          const { position, scale } = transform(item, index);
          matrix.compose(new THREE.Vector3(...position), quaternion, new THREE.Vector3(...scale)); mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
      };
      this.vegetation.build(group, trees, hash, height);window.buildAquaticPlants?.(this,group);
      this.naturalRockMaterial ||= NaturalRocks.material(this.originals.rock);NaturalRocks.build(group,rocks,this.naturalRockMaterial,height);
      instances(flowers, 'trunk', '#6a8253', (item) => ({ position: [item.east, item.altitude + 0.18 * item.scale, item.north], scale: [0.008, 0.36 * item.scale, 0.008] }));
      instances(flowers, 'sphere', '#d7c5bd', (item) => ({ position: [item.east, item.altitude + 0.36 * item.scale, item.north], scale: [0.045 * item.scale, 0.025, 0.045 * item.scale] }));
      for (let index = 0; index < 4; index++) {
        const east = 20 + hash(column, row, 1000 + index) * 88, north = 20 + hash(column, row, 2000 + index) * 88;
        const ground = height(east + column * size, north + row * size);
        const localBiome = biome(east + column * size, north + row * size, ground);
        const pool = species.filter((spec) => spec.habitats.includes(localBiome.id));
        const spec = pool[Math.floor(hash(column, row, 3000 + index) * pool.length)];
        if (ground > 4.5) this.animal(spec, east, north, hash(column, row, 4000 + index) * 100, group);
      }
      this.scene.add(group); this.chunks.set(`${column},${row}`, group);
    }
    update(east, north, time, environment = {}) {
      const day = Number.isFinite(environment.day) ? environment.day : 0.5;
      const rainfall = environment.rainfall || 0;
      const windDelta = this.previousWindTime === undefined ? 0 : Math.min(0.1,Math.max(0,time-this.previousWindTime));
      this.previousWindTime = time;
      const column = Math.floor(east / 128), row = Math.floor(north / 128), center = `${column},${row}`;
      if (center !== this.center) {
        this.center = center;
        this.offset.set(Math.floor(east / 1024) * 1024, 0, Math.floor(north / 1024) * 1024);
        this.updateHorizon(column,row);
        const needed = new Set(); this.queue = [];
        for (let horizontal = -4; horizontal <= 4; horizontal++) for (let vertical = -4; vertical <= 4; vertical++) {
          const key = `${column + horizontal},${row + vertical}`; needed.add(key);
          const distant = Math.max(Math.abs(horizontal), Math.abs(vertical)) > 2;
          const existing = this.chunks.get(key);
          if (existing && existing.userData.distant !== distant) this.dropChunk(key, existing);
          if (!this.chunks.has(key)) this.queue.push({ column: column + horizontal, row: row + vertical, distance: Math.hypot(horizontal, vertical), distant });
        }
        this.queue.sort((first, second) => first.distance - second.distance);
        for (const [key, group] of this.chunks) {
          if (!needed.has(key)) {
            this.dropChunk(key, group);
          } else group.position.set(group.userData.east - this.offset.x, 0, group.userData.north - this.offset.z);
        }
      }
      if (this.queue.length) { const next = this.queue.shift(); this.createChunk(next.column,next.row,next.distant); }
      this.water.position.set(east - this.offset.x, 4 + Math.sin(time * 0.4) * 0.07, north - this.offset.z);
      this.waterUniforms.clock.value = time;
      this.vegetation.clock.value += windDelta*(0.7+(environment.wind || 0.2)*1.5);
      for (const chunk of this.chunks.values()) for (const mesh of chunk.children) {
        const drawCenter = mesh.userData.drawCenter;
        const distance = Math.hypot(chunk.userData.east+(drawCenter ? drawCenter.x : 64)-east,chunk.userData.north+(drawCenter ? drawCenter.z : 64)-north);
        if (mesh.userData.drawRange) {
          mesh.visible = distance < mesh.userData.drawRange && distance >= (mesh.userData.minDrawRange || 0);
        }
        if (mesh.isInstancedMesh && !mesh.userData.noShadow) mesh.castShadow = distance < 150;
      }
      for (const entry of this.animals) {
        const delta = entry.previousTime === null ? 0 : Math.min(0.1, Math.max(0, time - entry.previousTime));
        entry.previousTime = time;
        const worldEast = entry.chunk.userData.east + entry.model.position.x, worldNorth = entry.chunk.userData.north + entry.model.position.z;
        const distance = Math.hypot(worldEast - east, worldNorth - north); entry.rig.detailDistance = distance; entry.model.visible = distance < 180;
        entry.shadow.visible = entry.model.visible && (!entry.rig.flying || entry.flightAmount < 0.1);
        if (!entry.model.visible) continue;
        const localTime = time + entry.salt, cycle = localTime % 26;
        const rhythm = Wildlife.activity ? Wildlife.activity(entry.spec,day,rainfall) : { level: 1 };
        const desiredActivity = rhythm.level;
        entry.activity = entry.activity === undefined ? desiredActivity : THREE.MathUtils.lerp(entry.activity,desiredActivity,1-Math.exp(-delta/3));
        const alert = distance < Math.max(5, entry.spec.scale * 12);
        const activity = Math.max(entry.activity,alert ? 1 : 0);
        const flightTarget = entry.rig.flying ? THREE.MathUtils.smoothstep(activity,0.22,0.72) : 0;
        entry.flightAmount = entry.flightAmount === undefined ? flightTarget : THREE.MathUtils.lerp(entry.flightAmount,flightTarget,1-Math.exp(-delta*0.8));
        entry.rig.flightActivity = entry.flightAmount;
        entry.rig.restAmount = 1-THREE.MathUtils.smoothstep(activity,0.12,0.7);
        const airborne = entry.rig.flying && entry.flightAmount > 0.04;
        const moving = airborne || alert || activity > 0.22 && cycle > 26-activity*16;
        const speed = moving ? (airborne ? (entry.spec.plan === 'insect' ? 0.6 : 5)*entry.flightAmount : alert ? 2.4 : 0.55*activity) * Math.sqrt(entry.spec.scale) : 0;
        const targetHeading = alert ? Math.atan2(east - worldEast, north - worldNorth) : Math.atan2(entry.model.position.x - entry.east, entry.model.position.z - entry.north) + Math.sin(localTime * 0.08) * 1.8;
        let difference = Math.atan2(Math.sin(targetHeading - entry.heading), Math.cos(targetHeading - entry.heading));
        entry.heading += Math.max(-delta * 1.5, Math.min(delta * 1.5, difference));
        const proposedEast = entry.model.position.x - Math.sin(entry.heading) * speed * delta;
        const proposedNorth = entry.model.position.z - Math.cos(entry.heading) * speed * delta;
        const ground = height(entry.chunk.userData.east + proposedEast, entry.chunk.userData.north + proposedNorth);
        const currentGround = height(worldEast, worldNorth);
        const homeDistance = Math.hypot(proposedEast - entry.east, proposedNorth - entry.north);
        const canStep = ground > 4.5 && Math.abs(ground - currentGround) < Math.max(0.2, speed * delta * 1.2) && homeDistance < 44;
        if (airborne || canStep) {
          entry.model.position.x = proposedEast; entry.model.position.z = proposedNorth;
          entry.travelled += speed * delta;
        } else entry.heading += delta * 2;
        const actualGround = height(entry.chunk.userData.east + entry.model.position.x, entry.chunk.userData.north + entry.model.position.z);
        const flightHeight = entry.spec.plan === 'insect' ? 1.1+Math.sin(localTime)*0.3 : 12+Math.sin(localTime*0.3)*2;
        entry.model.position.y = Math.max(actualGround, 4.5) + entry.flightAmount*flightHeight;
        entry.model.rotation.y = entry.heading;
        entry.shadow.position.set(entry.model.position.x, actualGround + 0.035, entry.model.position.z); entry.shadow.rotation.z = -entry.heading;
        const ahead = height(worldEast - Math.sin(entry.heading) * 0.6, worldNorth - Math.cos(entry.heading) * 0.6);
        const slope = airborne ? 0 : Math.max(-0.3, Math.min(0.3, Math.atan2(ahead - currentGround, 0.6)));
        entry.rig.travelled = entry.travelled;
        if(distance<45||Math.floor(time*12)!==entry.lastPoseFrame){entry.lastPoseFrame=Math.floor(time*12);Wildlife.animate(entry.rig, localTime, speed > 0 && (canStep || airborne) ? 1 : 0, alert ? 1 : 0, slope);}
      }
    }

    dropChunk(key, group) {
      group.traverse((mesh) => { if (mesh.isSkinnedMesh && mesh.skeleton) mesh.skeleton.dispose(); });
      this.scene.remove(group); this.animals = this.animals.filter((entry) => entry.chunk !== group); this.occluders = this.occluders.filter((entry) => entry.parent !== group);
      group.userData.owned.forEach((owned) => owned.dispose());
      group.traverse((entry) => { if (entry.isInstancedMesh && entry.dispose) entry.dispose(); });
      this.chunks.delete(key);
    }
    candidates() {
      return this.animals.filter((entry) => entry.model.visible).map((entry) => {
        const point = new THREE.Vector3(); entry.model.getWorldPosition(point); point.y += entry.offset;
        return { id: entry.spec.id, name: entry.spec.name, point, group: entry.model, range: Math.max(12, Math.min(150, entry.spec.length * entry.spec.scale * 80)), ideal: Math.max(3, entry.spec.length * entry.spec.scale * 12) };
      });
    }
    vegetationBlocks(origin, target) {
      const direction = new THREE.Vector3().subVectors(target, origin), length = direction.length();
      if (length < 0.000001) return false;
      direction.normalize();
      const horizontalLength = direction.x*direction.x+direction.z*direction.z;
      for (const chunk of this.chunks.values()) {
        if (Math.hypot(chunk.position.x+64-origin.x,chunk.position.z+64-origin.z)>length+110) continue;
        const centerEast = chunk.position.x+64-origin.x, centerNorth = chunk.position.z+64-origin.z;
        const along = horizontalLength > 0.0001 ? Math.max(0,Math.min(length,(centerEast*direction.x+centerNorth*direction.z)/horizontalLength)) : 0;
        if (Math.hypot(centerEast-direction.x*along,centerNorth-direction.z*along) > 110) continue;
        for (const tree of chunk.userData.trees || []) {
          const relativeEast = chunk.position.x+tree.east-origin.x, relativeNorth = chunk.position.z+tree.north-origin.z;
          const trunkAlong = horizontalLength > 0.0001 ? (relativeEast*direction.x+relativeNorth*direction.z)/horizontalLength : -1;
          if (trunkAlong > 0 && trunkAlong < length) {
            const vertical = origin.y+direction.y*trunkAlong-tree.altitude;
            if (vertical > 0 && vertical < (tree.trunkHeight || tree.scale*9) && Math.hypot(relativeEast-direction.x*trunkAlong,relativeNorth-direction.z*trunkAlong)<tree.scale*0.45) return true;
          }
          const crown = tree.crownCenter;
          const radius = tree.crownRadius || tree.scale*4.4, halfHeight = tree.crownHalfHeight || radius;
          const offsetEast = (origin.x-chunk.position.x-(crown ? crown.x : tree.east))/radius;
          const offsetUp = (origin.y-(crown ? crown.y : tree.altitude+tree.scale*6.5))/halfHeight;
          const offsetNorth = (origin.z-chunk.position.z-(crown ? crown.z : tree.north))/radius;
          const directionEast = direction.x/radius, directionUp = direction.y/halfHeight, directionNorth = direction.z/radius;
          const quadratic = directionEast*directionEast+directionUp*directionUp+directionNorth*directionNorth;
          const linear = offsetEast*directionEast+offsetUp*directionUp+offsetNorth*directionNorth;
          const constant = offsetEast*offsetEast+offsetUp*offsetUp+offsetNorth*offsetNorth-1;
          const discriminant = linear*linear-quadratic*constant;
          if (quadratic > 0 && discriminant >= 0) {
            const near = (-linear-Math.sqrt(discriminant))/quadratic, far = (-linear+Math.sqrt(discriminant))/quadratic;
            if (near < length && far > 0) return true;
          }
        }
      }
      return false;
    }
    canMove(east, north) {
      for (const chunk of this.chunks.values()) {
        if (Math.abs(chunk.userData.east + 64 - east) > 70 || Math.abs(chunk.userData.north + 64 - north) > 70) continue;
        for (const tree of chunk.userData.trees || []) if (Math.hypot(chunk.userData.east + tree.east - east, chunk.userData.north + tree.north - north) < tree.scale * 0.45 + 0.35) return false;
      }
      return true;
    }
  }
  NatureWorld.surfaceSample = surfaceSample; NatureWorld.legacyHeight = legacyHeight; NatureWorld.terrainVersion = 2; NatureWorld.height = height; NatureWorld.biome = biome; NatureWorld.biomes = biomes; NatureWorld.species = species; NatureWorld.hash = hash;
  window.NatureWorld = NatureWorld;
})();
