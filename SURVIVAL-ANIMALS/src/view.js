import * as T from "three";
import { GLTFLoader } from "../vendor/addons/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "../vendor/addons/utils/SkeletonUtils.js";
import {
  ISLANDS,
  SPECIES,
  BUILDINGS,
  rng,
  clamp,
  heightAt,
  dist,
} from "./data.js";
import { WORLD } from "./core.js";

const mat = (color, more = {}) =>
  new T.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, ...more });
function mesh(geo, material, parent, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (w, h, d, m, p, x = 0, y = 0, z = 0) =>
  mesh(new T.BoxGeometry(w, h, d), m, p, x, y, z);
const cone = (r, h, m, p, x = 0, y = 0, z = 0, n = 5) =>
  mesh(new T.ConeGeometry(r, h, n), m, p, x, y, z);
const sphere = (r, m, p, x = 0, y = 0, z = 0) =>
  mesh(new T.IcosahedronGeometry(r, 0), m, p, x, y, z);

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    this.scene = new T.Scene();
    this.scene.background = new T.Color("#b7dae4");
    this.scene.fog = new T.FogExp2("#b7dae4", 0.005);
    this.camera = new T.PerspectiveCamera(52, 1, 0.1, 700);
    this.camera.position.set(0, 9, 40);
    this.theta = 0.28;
    this.pitch = 0.41;
    this.distance = 12;
    this.title = true;
    this.sun = new T.DirectionalLight(0xffe3af, 3.1);
    this.sun.position.set(-30, 60, 25);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    Object.assign(this.sun.shadow.camera, {
      left: -38,
      right: 38,
      top: 38,
      bottom: -38,
      near: 1,
      far: 160,
    });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.045;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new T.HemisphereLight(0xb7e7ff, 0x607245, 2);
    this.scene.add(this.hemi);
    this.assets = new Map();
    this.creatures = new Map();
    this.buildings = new Map();
    this.resources = new Map();
    this.effects = [];
    this.mixers = [];
    this.elapsed = 0;
    this.loaded = false;
    this.target = new T.Vector3();
    this.lastTime = 0;
    this.fps = 60;
    this.islandRoots = [];
    this.world = new T.Group();
    this.scene.add(this.world);
    this.actorRoot = new T.Group();
    this.scene.add(this.actorRoot);
    this.occlusionHero = { value: new T.Vector3() };
    this.occlusionEnabled = { value: 0 };
    this.hero = this.makeHuman();
    this.scene.add(this.hero);
    this.hero.visible = false;
    this.npc = this.makeHuman(true);
    this.npc.position.set(3, heightAt(3, 22), 22);
    this.npc.rotation.y = 0.5;
    this.scene.add(this.npc);
    this.ringMaterial = new T.MeshBasicMaterial({
      color: 0x75f1d0,
      transparent: true,
      opacity: 0.8,
      side: T.DoubleSide,
      depthWrite: false,
    });
    this.captureRing = mesh(
      new T.RingGeometry(2.8, 2.9, 64),
      this.ringMaterial,
      this.scene,
    );
    this.captureRing.rotation.x = -Math.PI / 2;
    this.captureRing.visible = false;
    this.buildGhost = mesh(
      new T.BoxGeometry(2.6, 0.1, 2.6),
      new T.MeshBasicMaterial({
        color: 0x70ffcf,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
      this.scene,
    );
    this.buildGhost.visible = false;
    this.heroLight = new T.PointLight(0xffab51, 5, 15, 2);
    this.heroLight.position.set(0, 2, 0);
    this.hero.add(this.heroLight);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  quality(q) {
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, q === "high" ? 1.75 : q === "low" ? 1 : 1.35),
    );
    this.renderer.shadowMap.enabled = q !== "low";
    this.resize();
  }
  async load(onProgress) {
    const names = [
      ...new Set(
        WORLD.decor.map(
          (d) =>
            `environment/${d.kind === "rock" ? ["rock_largeA", "rock_largeB", "rock_tallA"][d.variant] : ["tree_palm", "tree_palmDetailedShort", "tree_detailed"][d.variant]}.glb`,
        ),
      ),
      ...[
        "grass_large",
        "plant_bushLarge",
        "rock_largeC",
        "statue_ring",
        "statue_head",
        "canoe",
        "campfire_logs",
      ].map((n) => `environment/${n}.glb`),
      ...Object.values(BUILDINGS).map((b) => `props/${b.model}.glb`),
      ...[
        "resource-wood",
        "resource-stone",
        "barrel",
        "structure-floor",
        "structure-roof",
      ].map((n) => `props/${n}.glb`),
      ...["Fox", "Stag", "Bull", "Wolf"].map((n) => `creatures/${n}.gltf`),
    ];
    const loader = new GLTFLoader();
    let done = 0;
    const failed = [];
    await Promise.all(
      names.map(async (n) => {
        try {
          const gltf = await loader.loadAsync(`./assets/runtime/${n}`);
          gltf.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              const mats = Array.isArray(o.material)
                ? o.material
                : [o.material];
              for (const m of mats) {
                m.metalness = 0;
                m.roughness = 0.9;
                if (n.startsWith("environment")) {
                  if (/leaf|grass/i.test(m.name)) m.color.set("#72995a");
                  if (/wood/i.test(m.name)) m.color.set("#956c47");
                }
              }
            }
          });
          this.assets.set(n, gltf);
        } catch (e) {
          failed.push(n);
          console.error(n, e);
        }
        done++;
        onProgress(done / names.length, n);
      }),
    );
    if (failed.length)
      throw Error(`素材を読み込めませんでした: ${failed.join(", ")}`);
    this.makeTerrain();
    this.makeDecor();
    this.makeResources();
    this.makeLandmarks();
    this.makeOcean();
    this.makeSky();
    this.boatModel = this.prop("environment/canoe.glb", 0.6);
    this.scene.add(this.boatModel);
    this.boatModel.visible = false;
    this.telegraphs = new Map();
    this.campParty = new Map();
    this.loaded = true;
  }
  prop(key, height = 1) {
    const root = new T.Group(),
      source = this.assets.get(key);
    if (!source) throw Error("missing " + key);
    const model = source.scene.clone(true);
    root.add(model);
    const b = new T.Box3().setFromObject(model),
      s = b.getSize(new T.Vector3());
    const scale = height / Math.max(0.01, s.y);
    model.scale.multiplyScalar(scale);
    model.position.y -= b.min.y * scale;
    return root;
  }
  makeTerrain() {
    const rand = rng(382);
    for (const i of ISLANDS) {
      const root = new T.Group();
      this.world.add(root);
      this.islandRoots.push(root);
      const geo = new T.PlaneGeometry(i.r * 2, i.r * 2, 54, 54);
      geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position,
        cols = [];
      for (let n = 0; n < p.count; n++) {
        const x = p.getX(n) + i.x,
          z = p.getZ(n) + i.z;
        let h = heightAt(x, z);
        const r = Math.hypot(x - i.x, z - i.z);
        if (r > i.r) h = -3;
        p.setXYZ(n, x, h, z);
        const c = new T.Color(i.color);
        if (r > i.r - 6)
          c.set(i.id === 0 ? "#dbc59a" : i.id === 1 ? "#cde1e4" : "#8d7d73");
        else c.multiplyScalar(0.9 + rand() * 0.2);
        cols.push(c.r, c.g, c.b);
      }
      geo.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
      geo.computeVertexNormals();
      mesh(geo, mat(0xffffff, { vertexColors: true, flatShading: true }), root);
      const cliffMat = mat(
        i.id === 1 ? 0x8ca7b6 : i.id === 2 ? 0x514855 : 0xc7a17c,
      );
      for (let n = 0; n < 16; n++) {
        const a = (n / 16) * 6.28,
          r = i.r + 2;
        const x = i.x + Math.sin(a) * r,
          z = i.z + Math.cos(a) * r;
        if (z > i.z + i.r * 0.65) continue;
        const h = 4 + rand() * 14;
        const c = mesh(
          new T.CylinderGeometry(3 + rand() * 2, 4 + rand() * 2, h, 5),
          cliffMat,
          root,
          x,
          h * 0.5 - 3,
          z,
        );
        c.rotation.y = rand() * 6.28;
        const top = mesh(
          new T.CylinderGeometry(3, 3.3, 0.5, 5),
          mat(i.id === 1 ? 0xd3e6e4 : 0x7f9d62),
          root,
          x,
          h - 2.7,
          z,
        );
        top.rotation.y = c.rotation.y;
      }
    }
  }
  makeDecor() {
    const batches = new Map();
    for (const d of WORLD.decor) {
      const key = `environment/${d.kind === "rock" ? ["rock_largeA", "rock_largeB", "rock_tallA"][d.variant] : ["tree_palm", "tree_palmDetailedShort", "tree_detailed"][d.variant]}.glb`;
      const bk = `${d.island}-${key}`;
      if (!batches.has(bk))
        batches.set(bk, { key, island: d.island, placements: [] });
      batches.get(bk).placements.push(d);
    }
    for (const b of batches.values())
      this.instanceAsset(
        b.key,
        b.placements,
        this.islandRoots[b.island],
        b.island,
      );
    const random = rng(86);
    for (const i of ISLANDS) {
      const spots = [];
      for (let n = 0; n < 800; n++) {
        const a = random() * 6.28,
          r = Math.sqrt(random()) * (i.r - 5),
          x = i.x + Math.sin(a) * r,
          z = i.z + Math.cos(a) * r;
        if (i.id === 2 && Math.hypot(x - i.x, z - i.z + 9) < 14) continue;
        spots.push({
          x,
          z,
          scale: 0.16 + random() * 0.3,
          angle: random() * 6.28,
        });
      }
      this.instanceAsset(
        "environment/grass_large.glb",
        spots,
        this.islandRoots[i.id],
        i.id,
      );
    }
  }
  fadeFoliage(material) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uOcclusionHero = this.occlusionHero;
      shader.uniforms.uOcclusionEnabled = this.occlusionEnabled;
      shader.vertexShader =
        "varying vec3 vFoliageWorld;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
    vec4 foliagePosition=vec4(transformed,1.);
    #ifdef USE_INSTANCING
    foliagePosition=instanceMatrix*foliagePosition;
    #endif
    vFoliageWorld=(modelMatrix*foliagePosition).xyz;`,
      );
      shader.fragmentShader =
        "varying vec3 vFoliageWorld;\nuniform vec3 uOcclusionHero;\nuniform float uOcclusionEnabled;\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
    vec3 lineToHero=uOcclusionHero-cameraPosition;
    float along=dot(vFoliageWorld-cameraPosition,lineToHero)/max(dot(lineToHero,lineToHero),.01);
    float gap=distance(vFoliageWorld,cameraPosition+clamp(along,0.,1.)*lineToHero);
    if(uOcclusionEnabled>.5&&along>0.&&along<1.05&&gap<2.1){
      float checker=mod(floor(gl_FragCoord.x)+floor(gl_FragCoord.y)*3.,4.);
      if(checker>.5)discard;
    }`,
      );
    };
    material.customProgramCacheKey = () => "foliage-occlusion-v1";
  }
  instanceAsset(key, placements, parent, island) {
    const src = this.assets.get(key).scene;
    src.updateMatrixWorld(true);
    const bound = new T.Box3().setFromObject(src),
      size = bound.getSize(new T.Vector3()),
      obj = new T.Object3D();
    src.traverse((o) => {
      if (!o.isMesh) return;
      const materials = (
        Array.isArray(o.material) ? o.material : [o.material]
      ).map((m) => {
        const c = m.clone();
        if (island === 1) c.color.lerp(new T.Color("#b6d9dc"), 0.65);
        if (island === 2) c.color.lerp(new T.Color("#776475"), 0.6);
        if (key.includes("tree")) this.fadeFoliage(c);
        return c;
      });
      const inst = new T.InstancedMesh(
        o.geometry,
        Array.isArray(o.material) ? materials : materials[0],
        placements.length,
      );
      inst.castShadow = !key.includes("grass");
      inst.receiveShadow = true;
      placements.forEach((p, n) => {
        const s =
          p.scale /
          Math.max(0.01, p.kind === "rock" ? Math.max(size.x, size.z) : size.y);
        obj.position.set(p.x, heightAt(p.x, p.z) - bound.min.y * s, p.z);
        obj.rotation.set(0, p.angle, 0);
        obj.scale.setScalar(s);
        obj.updateMatrix();
        inst.setMatrixAt(
          n,
          new T.Matrix4().multiplyMatrices(obj.matrix, o.matrixWorld),
        );
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      parent.add(inst);
    });
  }
  makeResources() {
    for (const r of WORLD.resources) {
      const group = new T.Group();
      group.position.set(r.x, heightAt(r.x, r.z), r.z);
      let prop;
      if (r.kind === "wood") prop = this.prop("props/resource-wood.glb", 0.6);
      else if (r.kind === "stone")
        prop = this.prop("props/resource-stone.glb", 0.8);
      else if (r.kind === "fiber" || r.kind === "berry") {
        prop = this.prop("environment/plant_bushLarge.glb", 0.8);
        if (r.kind === "berry") {
          for (let n = 0; n < 6; n++)
            sphere(
              0.12,
              mat(0xe97244),
              prop,
              Math.sin(n * 2) * 0.45,
              0.6 + Math.cos(n) * 0.15,
              Math.cos(n * 2) * 0.4,
            );
        }
      } else {
        prop = new T.Group();
        for (let n = 0; n < 3; n++) {
          const c = mesh(
            new T.OctahedronGeometry(0.45),
            mat(0x70d9eb, { emissive: 0x379dab, emissiveIntensity: 0.5 }),
            prop,
            Math.sin(n * 2) * 0.35,
            0.7,
            Math.cos(n * 2) * 0.3,
          );
          c.scale.y = 1.8;
        }
      }
      group.add(prop);
      const halo = mesh(
        new T.RingGeometry(0.7, 0.74, 24),
        new T.MeshBasicMaterial({
          color: 0xffe0a0,
          transparent: true,
          opacity: 0.28,
          side: T.DoubleSide,
        }),
        group,
        0,
        0.07,
        0,
      );
      halo.rotation.x = -Math.PI / 2;
      this.world.add(group);
      this.resources.set(r.id, group);
    }
  }
  makeLandmarks() {
    const stone = mat(0xc2b99f),
      darkStone = mat(0x666579),
      gold = mat(0xf3cb7c, { emissive: 0xf1a531, emissiveIntensity: 0.25 });
    for (const i of ISLANDS) {
      const cx = i.x,
        cz = i.z - 17,
        y = heightAt(cx, cz);
      const ruin = new T.Group();
      ruin.position.set(cx, y, cz);
      this.islandRoots[i.id].add(ruin);
      const sm = i.id === 2 ? darkStone : stone;
      for (const x of [-6, 6]) {
        box(2, 1, 2.5, sm, ruin, x, 0.5);
        box(1.4, 7, 1.5, sm, ruin, x, 4);
        box(2.1, 0.7, 2, sm, ruin, x, 7.7);
        cone(1.5, 1.3, sm, ruin, x, 8.7);
      }
      const ring = mesh(
        new T.TorusGeometry(4.2, 0.45, 5, 14),
        sm,
        ruin,
        0,
        7.4,
      );
      const core = mesh(new T.OctahedronGeometry(0.8), gold, ruin, 0, 7.4);
      this.ruinCores ??= [];
      this.ruinCores.push(core);
      box(14, 0.5, 3, sm, ruin, 0, 0.2);
      const archGround = mesh(
        new T.CylinderGeometry(10, 11, 0.3, 32),
        sm,
        ruin,
        0,
        -0.05,
        0,
      );
      archGround.receiveShadow = true;
      const post = new T.Group();
      post.position.set(
        i.spawn[0] + 4,
        heightAt(i.spawn[0] + 4, i.spawn[1]),
        i.spawn[1],
      );
      box(0.15, 2.4, 0.15, mat(0x775438), post, 0, 1.2);
      box(1.6, 0.65, 0.14, mat(0xd3b178), post, 0, 1.9);
      this.islandRoots[i.id].add(post);
    }
    // A small welcome camp uses downloaded models; craftable structures remain separate.
    for (const [key, x, z, h] of [
      ["props/tent.glb", -7, 25, 2.7],
      ["props/barrel.glb", -5, 26, 0.9],
      ["props/structure-floor.glb", -7, 25, 0.3],
    ]) {
      const m = this.prop(key, h);
      m.position.set(x, heightAt(x, z), z);
      this.world.add(m);
    }
    const banner = new T.Group();
    banner.position.set(-4, heightAt(-4, 25), 25);
    box(0.12, 3.7, 0.12, mat(0x795639), banner, 0, 1.85);
    box(1.3, 1.8, 0.04, mat(0x263e50), banner, 0.55, 2.3);
    const emblem = mesh(
      new T.TorusGeometry(0.32, 0.04, 4, 6),
      gold,
      banner,
      0.55,
      2.3,
      0.05,
    );
    this.world.add(banner);
    const shelter = new T.Group();
    shelter.position.set(-7, heightAt(-7, 25), 25);
    const cloth = mat(0xb9b692, { side: T.DoubleSide });
    for (const side of [-1, 1]) {
      const sheet = mesh(
        new T.PlaneGeometry(2.1, 3.1),
        cloth,
        shelter,
        side * 0.74,
        1.1,
        0,
      );
      sheet.rotation.set(-Math.PI / 2, side * 0.82, 0);
    }
    this.world.add(shelter);
    // Decorative sea islands have no gameplay collision; navigable islands are on the map.
    const random = rng(78);
    for (let n = 0; n < 22; n++) {
      const x = -240 + random() * 620,
        z = -210 - random() * 160,
        h = 12 + random() * 50;
      const m = mesh(
        new T.CylinderGeometry(3 + random() * 8, 12 + random() * 15, h, 5),
        mat(0x88a7a5),
        this.world,
        x,
        h * 0.5 - 6,
        z,
      );
      m.castShadow = false;
      cone(10, 6, mat(0x6e9483), this.world, x, h - 3, z);
    }
  }
  makeOcean() {
    const geo = new T.PlaneGeometry(1600, 1600, 130, 130);
    geo.rotateX(-Math.PI / 2);
    const material = new T.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uNight: { value: 0 },
        uFogColor: { value: new T.Color("#b5d9e1") },
      },
      vertexShader: `varying vec3 vWorld; uniform float uTime; void main(){vec3 p=position;p.y+=sin(p.x*.12+uTime*.6)*.12+cos(p.z*.17-uTime*.4)*.10;vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
      fragmentShader: `varying vec3 vWorld;uniform vec3 uFogColor;uniform float uTime;uniform float uNight;void main(){float w=sin(vWorld.x*.75+vWorld.z*.43+sin(vWorld.z*.3+uTime)*.7-uTime);float f=pow(max(w,0.),18.);float big=sin(vWorld.x*.027+vWorld.z*.036)*.5+.5;vec3 c=mix(vec3(.045,.34,.43),vec3(.11,.62,.65),big);c+=vec3(.16,.22,.19)*f;float sun=pow(max(0.,1.-abs(vWorld.x-vWorld.z*.20-12.)*.008),15.)*.16;c+=vec3(.9,.65,.3)*sun;c=mix(c,c*vec3(.25,.37,.58),uNight);c=mix(c,uFogColor,smoothstep(90.,450.,distance(cameraPosition.xz,vWorld.xz)));gl_FragColor=vec4(c,1.);}`,
    });
    this.ocean = mesh(geo, material, this.scene, 60, -0.2, -90);
    this.ocean.castShadow = false;
    this.ocean.receiveShadow = false;
    const foamMat = new T.MeshBasicMaterial({
      color: 0xbfeae1,
      transparent: true,
      opacity: 0.38,
      side: T.DoubleSide,
      depthWrite: false,
    });
    for (const i of ISLANDS) {
      const ring = mesh(
        new T.RingGeometry(i.r - 1, i.r + 1.8, 96),
        foamMat,
        this.world,
        i.x,
        0.02,
        i.z,
      );
      ring.rotation.x = -Math.PI / 2;
    }
  }
  makeSky() {
    const cloudMat = new T.MeshBasicMaterial({
      color: 0xfff3de,
      transparent: true,
      opacity: 0.82,
    });
    this.clouds = new T.Group();
    const random = rng(464);
    for (let n = 0; n < 28; n++) {
      const g = new T.Group();
      g.position.set(
        -190 + random() * 520,
        45 + random() * 22,
        -220 + random() * 410,
      );
      for (let j = 0; j < 4; j++) {
        const c = sphere(
          4 + random() * 3,
          cloudMat,
          g,
          j * 6,
          random() * 2,
          random() * 3,
        );
        c.scale.set(1.9, 0.5, 1);
        c.castShadow = false;
      }
      this.clouds.add(g);
    }
    this.scene.add(this.clouds);
    this.starsGeo = new T.BufferGeometry();
    const arr = [];
    for (let n = 0; n < 170; n++) {
      arr.push(
        -300 + random() * 750,
        90 + random() * 220,
        -330 + random() * 560,
      );
    }
    this.starsGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute(arr, 3),
    );
    this.stars = new T.Points(
      this.starsGeo,
      new T.PointsMaterial({
        color: 0xc6e7ff,
        size: 0.55,
        transparent: true,
        opacity: 0,
      }),
    );
    this.scene.add(this.stars);
  }
  makeHuman(npc = false) {
    const root = new T.Group(),
      body = new T.Group();
    root.add(body);
    root.userData.body = body;
    const coat = mat(npc ? 0x698f86 : 0xbc9c6c),
      pants = mat(0x35404c),
      skin = mat(0xcda17f),
      hair = mat(0x272d36),
      scarf = mat(npc ? 0xe6d5a4 : 0xde783b),
      leather = mat(0x615147);
    box(0.64, 0.7, 0.36, coat, body, 0, 1.22);
    sphere(0.27, skin, body, 0, 1.87);
    const h = sphere(0.29, hair, body, 0, 2.01, -0.04);
    h.scale.set(1, 0.72, 1);
    box(0.12, 0.05, 0.05, hair, body, -0.1, 1.87, 0.24);
    box(0.12, 0.05, 0.05, hair, body, 0.1, 1.87, 0.24);
    box(0.68, 0.15, 0.41, scarf, body, 0, 1.58);
    const tail = box(0.23, 0.6, 0.05, scarf, body, 0.16, 1.18, -0.28);
    tail.rotation.x = 0.25;
    const limbs = [];
    for (const side of [-1, 1]) {
      const leg = new T.Group();
      leg.position.set(side * 0.19, 0.9, 0);
      body.add(leg);
      box(0.25, 0.7, 0.26, pants, leg, 0, -0.32);
      box(0.28, 0.22, 0.4, leather, leg, 0, -0.67, 0.06);
      limbs.push(leg);
      const arm = new T.Group();
      arm.position.set(side * 0.45, 1.5, 0);
      body.add(arm);
      box(0.21, 0.5, 0.25, coat, arm, 0, -0.2);
      sphere(0.13, skin, arm, 0, -0.51, 0.01);
      limbs.push(arm);
    }
    root.userData.limbs = limbs;
    box(0.5, 0.55, 0.22, leather, body, 0, 1.23, -0.32);
    box(0.4, 0.4, 0.04, coat, body, 0, 1.24, -0.46);
    if (!npc) {
      const spear = new T.Group();
      limbs[3].add(spear);
      spear.position.set(0, -0.55, 0.2);
      const shaft = mesh(
        new T.CylinderGeometry(0.035, 0.04, 1.9, 6),
        leather,
        spear,
        0,
        0.2,
      );
      cone(0.12, 0.38, mat(0xc0d6d4), spear, 0, 1.32);
      spear.rotation.x = 0.3;
      root.userData.spear = spear;
    }
    return root;
  }
  makeCreature(type) {
    const sp = SPECIES[type],
      gltf = this.assets.get(`creatures/${sp.model}.gltf`),
      root = new T.Group(),
      body = skeletonClone(gltf.scene);
    root.add(body);
    const b = new T.Box3().setFromObject(body),
      size = b.getSize(new T.Vector3()),
      s = sp.size / size.y;
    body.scale.multiplyScalar(s);
    body.position.y -= b.min.y * s;
    body.traverse((o) => {
      if (o.isMesh) {
        const original = Array.isArray(o.material) ? o.material : [o.material];
        const mats = original.map((m, n) => {
          const c = m.clone();
          c.metalness = 0;
          c.roughness = 0.92;
          if (/eye/i.test(c.name)) {
            c.color.setHex(sp.accent);
            c.emissive.setHex(sp.accent);
            c.emissiveIntensity = 0.8;
          } else if (n === 0 || /Main$/.test(m.name)) {
            c.color.setHex(sp.color);
          }
          return c;
        });
        o.material = Array.isArray(o.material) ? mats : mats[0];
      }
    });
    const detail = new T.Group();
    root.add(detail);
    const accent = mat(sp.accent, {
      emissive: sp.accent,
      emissiveIntensity: type === "ember" ? 0.9 : 0.4,
    });
    // Additions share the animated root. Their low-poly silhouette is intentional.
    if (type === "ember" || type === "night") {
      for (let j = 0; j < 9; j++) {
        const a = (j / 9) * 6.28,
          c = cone(
            0.13,
            0.45 + (j % 3) * 0.12,
            accent,
            detail,
            Math.sin(a) * 0.35,
            sp.size * 0.65 + Math.cos(a) * 0.25,
            0.36,
          );
        c.rotation.x = 0.5;
        c.rotation.z = -Math.sin(a) * 0.7;
      }
      for (let j = 0; j < 4; j++)
        cone(0.1, 0.27, accent, detail, 0, sp.size * 0.5, -0.6 - j * 0.15);
    }
    if (type === "leaf" || type === "frost") {
      for (const side of [-1, 1]) {
        for (let j = 0; j < 4; j++) {
          const leaf = mesh(
            new T.OctahedronGeometry(0.16),
            accent,
            detail,
            side * (0.25 + j * 0.12),
            sp.size * 0.72 + j * 0.21,
            0.35,
          );
          leaf.scale.set(0.65, 1.8, 0.5);
          leaf.rotation.z = side * 0.65;
        }
      }
    }
    if (type === "moss") {
      for (let j = 0; j < 12; j++)
        sphere(
          0.27,
          mat(j % 2 ? 0x8fae55 : 0x556e3e),
          detail,
          Math.sin(j * 2) * 0.5,
          sp.size * 0.78 + Math.cos(j) * 0.1,
          Math.cos(j * 2) * 0.65,
        );
    }
    if (type === "tempest") {
      for (let j = 0; j < 11; j++) {
        const a = (j / 11) * 6.28;
        const c = cone(
          0.28,
          1.2,
          accent,
          detail,
          Math.sin(a) * 0.8,
          1.9 + Math.cos(a) * 0.6,
          0.6,
        );
        c.rotation.z = -Math.sin(a);
        c.rotation.x = 0.6;
      }
      root.add(this.makeWings(2.3, accent));
    }
    const mixer = new T.AnimationMixer(body);
    const animations = {};
    for (const clip of gltf.animations)
      animations[clip.name] = mixer.clipAction(clip);
    animations.Idle?.play();
    root.userData = { mixer, animations, anim: "Idle", type, body, detail };
    return root;
  }
  makeWings(scale = 1, material = mat(0xefd18e)) {
    const g = new T.Group();
    for (const side of [-1, 1]) {
      const wing = new T.Group();
      wing.position.set(side * 0.3, 0.85, -0.1);
      g.add(wing);
      for (let j = 0; j < 6; j++) {
        const feather = box(
          0.28,
          0.08,
          1.4 - j * 0.1,
          material,
          wing,
          side * (0.3 + j * 0.25),
          j * 0.1,
          -j * 0.08,
        );
        feather.rotation.y = side * 0.35;
      }
    }
    g.scale.setScalar(scale);
    return g;
  }
  anim(root, name) {
    const d = root.userData;
    if (!d?.animations) return;
    const target = d.animations[name]
      ? name
      : Object.keys(d.animations).find((n) => n.startsWith(name)) || "Idle";
    if (target === d.anim) return;
    d.animations[d.anim]?.fadeOut(0.18);
    d.animations[target]?.reset().fadeIn(0.18).play();
    d.anim = target;
  }
  sync(game) {
    const alive = new Set();
    for (const e of game.wild) {
      alive.add(e.id);
      let node = this.creatures.get(e.id);
      if (!node) {
        node = this.makeCreature(e.type);
        this.actorRoot.add(node);
        this.creatures.set(e.id, node);
      }
      node.position.set(e.x, heightAt(e.x, e.z), e.z);
      node.rotation.y = e.angle;
      node.visible = dist(e, game.s.player) < 100;
      this.anim(
        node,
        e.down
          ? "Death"
          : game.sleeping(e)
            ? "Eating"
            : e.mode === "chase"
              ? "Gallop"
              : e.mode === "windup"
                ? "Attack"
                : e.walking
                  ? "Walk"
                  : "Idle",
      );
      if (e.down) {
        const a = node.userData.animations.Death;
        if (a) {
          a.setLoop(T.LoopOnce, 1);
          a.clampWhenFinished = true;
        }
      }
      node.scale.setScalar(e.hit > 0 ? 1 + e.hit * 0.22 : 1);
    }
    for (const [id, n] of this.creatures) {
      if (!alive.has(id)) {
        this.actorRoot.remove(n);
        n.userData.mixer.stopAllAction();
        this.creatures.delete(id);
      }
    }
    if (game.s.active !== this.allyType) {
      if (this.allyModel) this.scene.remove(this.allyModel);
      this.allyType = game.s.active;
      this.allyModel = this.allyType ? this.makeCreature(this.allyType) : null;
      if (this.allyModel) {
        this.allyWings = this.makeWings(1.4);
        this.allyModel.add(this.allyWings);
        this.scene.add(this.allyModel);
      }
    }
    if (this.allyModel) {
      this.allyModel.visible = true;
      const a = game.mount ? game.s.player : game.ally;
      this.allyModel.position.set(
        a.x,
        heightAt(a.x, a.z) + (game.fly ? 3.2 : 0),
        a.z,
      );
      this.allyModel.rotation.y = a.angle;
      this.allyWings.visible = game.fly;
      this.anim(this.allyModel, game.moving > 0.1 ? "Gallop" : "Idle");
      this.allyWings.children.forEach(
        (w, n) =>
          (w.rotation.z = Math.sin(this.elapsed * 4) * 0.2 * (n ? -1 : 1)),
      );
    }
    const built = new Set();
    for (const b of game.s.buildings) {
      built.add(b.id);
      if (!this.buildings.has(b.id)) {
        const root = this.prop(
          `props/${BUILDINGS[b.kind].model}.glb`,
          b.kind === "shelter"
            ? 2.7
            : b.kind === "fence"
              ? 1.4
              : b.kind === "campfire"
                ? 0.5
                : 1.1,
        );
        root.position.set(b.x, heightAt(b.x, b.z), b.z);
        root.rotation.y = b.angle;
        this.world.add(root);
        if (b.kind === "campfire") {
          const fire = cone(
            0.4,
            1.1,
            mat(0xffbf55, { emissive: 0xff771b, emissiveIntensity: 2 }),
            root,
            0,
            0.6,
          );
          const light = new T.PointLight(0xffab5d, 13, 13, 2);
          light.position.y = 1.6;
          root.add(light);
          root.userData.fire = fire;
        }
        this.buildings.set(b.id, root);
      }
    }
    for (const [id, node] of this.buildings)
      if (!built.has(id)) {
        this.world.remove(node);
        this.buildings.delete(id);
      }
    for (const r of WORLD.resources)
      this.resources.get(r.id).visible = game.s.harvested[r.id] !== game.s.day;
    for (const e of game.wild) {
      let ring = this.telegraphs.get(e.id);
      if (!ring) {
        ring = mesh(
          new T.RingGeometry(0.92, 1, 48),
          new T.MeshBasicMaterial({
            color: 0xff7952,
            transparent: true,
            opacity: 0.75,
            side: T.DoubleSide,
            depthWrite: false,
          }),
          this.scene,
        );
        ring.rotation.x = -Math.PI / 2;
        ring.castShadow = false;
        this.telegraphs.set(e.id, ring);
      }
      ring.visible = e.mode === "windup" && !e.down;
      const pos = e.aim || e,
        r =
          e.type === "tempest"
            ? e.hp / SPECIES.tempest.hp < 0.5
              ? 6
              : 4.5
            : 3;
      ring.position.set(pos.x, heightAt(pos.x, pos.z) + 0.12, pos.z);
      ring.scale.setScalar(r);
      ring.material.opacity = 0.45 + Math.sin(this.elapsed * 12) * 0.25;
    }
    for (const [id, ring] of this.telegraphs)
      if (!alive.has(id)) ring.visible = false;
    const camp =
      game.s.buildings.find((b) => b.kind === "shelter") ||
      game.s.buildings.find((b) => b.kind === "campfire");
    for (const [type, node] of this.campParty)
      node.visible =
        !!camp && type !== game.s.active && !!game.s.companions[type];
    if (camp) {
      let n = 0;
      for (const type of Object.keys(game.s.companions)) {
        if (type === game.s.active) continue;
        let node = this.campParty.get(type);
        if (!node) {
          node = this.makeCreature(type);
          this.scene.add(node);
          this.campParty.set(type, node);
        }
        const a = n++ * 1.8 + 0.7,
          x = camp.x + Math.sin(a) * 3.6,
          z = camp.z + Math.cos(a) * 3.6;
        node.position.set(x, heightAt(x, z), z);
        node.rotation.y = a + Math.PI;
        node.visible = true;
        this.anim(node, "Eating");
      }
    }
  }
  burst(x, z, color, count = 18) {
    const material = new T.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
    });
    material.userData.particles = count;
    for (let n = 0; n < count; n++) {
      const m = mesh(
        new T.OctahedronGeometry(0.055 + Math.random() * 0.08),
        material,
        this.scene,
        x,
        heightAt(x, z) + 0.8,
        z,
      );
      m.castShadow = false;
      this.effects.push({
        mesh: m,
        v: new T.Vector3(
          (Math.random() - 0.5) * 4,
          2 + Math.random() * 3,
          (Math.random() - 0.5) * 4,
        ),
        life: 1.1,
      });
    }
  }
  screenPosition(x, y, z) {
    const v = new T.Vector3(x, y, z).project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * this.canvas.clientWidth,
      y: (-v.y * 0.5 + 0.5) * this.canvas.clientHeight,
      visible: v.z < 1 && v.z > -1,
    };
  }
  update(dt, game, { title = false, build = null } = {}) {
    if (!this.loaded) return;
    this.elapsed += dt;
    this.sync(game);
    const p = game.s.player,
      t = this.elapsed;
    this.hero.visible = !title;
    const flying = game.fly,
      boat = game.boat || (game.transit && game.transit.id !== 2);
    let py = Math.max(0.0, heightAt(p.x, p.z));
    if (flying) py += 3.2 + SPECIES[game.s.active].size * 0.85;
    else if (game.mount) py += SPECIES[game.s.active].size * 0.75;
    else if (boat) py = 0.5;
    this.hero.position.set(p.x, py, p.z);
    this.occlusionHero.value.set(p.x, py + 1.4, p.z);
    this.occlusionEnabled.value = title ? 0 : 1;
    this.hero.rotation.y = p.angle;
    const hb = this.hero.userData.body;
    hb.position.y =
      game.dodge > 0 ? -0.5 : game.stealth ? -0.35 : Math.sin(t * 8) * 0.015;
    hb.rotation.x = game.dodge > 0 ? -0.7 : 0;
    this.hero.userData.limbs.forEach((l, n) => {
      l.rotation.x = game.mount
        ? n % 2 === 0
          ? -0.8
          : -0.4
        : Math.sin(t * (game.stealth ? 4 : 9) + (n < 2 ? 0 : Math.PI)) *
          game.moving *
          0.55;
    });
    if (game.attackPose > 0)
      this.hero.userData.limbs[3].rotation.x = -1.6 + game.attackPose * 6;
    for (const node of this.creatures.values())
      if (node.visible) node.userData.mixer.update(dt);
    this.allyModel?.userData.mixer.update(dt);
    for (const node of this.campParty.values())
      if (node.visible) node.userData.mixer.update(dt);
    if (this.boatModel) {
      this.boatModel.visible = !!boat;
      if (boat) {
        this.boatModel.position.set(p.x, 0.0 + Math.sin(t * 2) * 0.08, p.z);
        this.boatModel.rotation.set(0, p.angle, Math.sin(t) * 0.025);
      }
    }
    const night = game.night ? 1 : 0;
    this.nightMix =
      (this.nightMix ?? night) +
      (night - (this.nightMix ?? night)) * Math.min(1, dt * 0.8);
    const sunset = !night && game.s.time > 215;
    const bg = new T.Color(sunset ? "#d6b5a0" : "#b5d9e1").lerp(
      new T.Color("#10243a"),
      this.nightMix,
    );
    this.scene.background.copy(bg);
    this.scene.fog.color.copy(bg);
    this.hemi.intensity = 2.05 - this.nightMix * 1.27;
    this.sun.intensity = (sunset ? 2.3 : 3) - this.nightMix * 2.25;
    this.sun.color.set(sunset ? 0xffb575 : night ? 0x9dbeef : 0xffe5b5);
    this.heroLight.intensity = this.nightMix * 6;
    this.stars.material.opacity = this.nightMix * 0.8;
    this.ocean.material.uniforms.uTime.value = t;
    this.ocean.material.uniforms.uNight.value = this.nightMix;
    this.ocean.material.uniforms.uFogColor.value.copy(bg);
    this.sun.position.set(p.x - 25, p.y || 0 + 55, p.z + 20);
    this.sun.target.position.set(p.x, 0, p.z);
    this.sun.target.updateMatrixWorld();
    this.clouds.position.x = Math.sin(t * 0.015) * 5;
    this.clouds.visible = this.nightMix < 0.8;
    for (const core of this.ruinCores) core.rotation.y = t * 0.5;
    for (const root of this.buildings.values())
      if (root.userData.fire)
        root.userData.fire.scale.set(
          1 + Math.sin(t * 8) * 0.12,
          1 + Math.cos(t * 11) * 0.15,
          1,
        );
    this.effects = this.effects.filter((e) => {
      e.life -= dt;
      e.mesh.position.addScaledVector(e.v, dt);
      e.v.y -= dt * 4;
      e.mesh.scale.setScalar(Math.max(0, e.life));
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        e.mesh.material.userData.particles--;
        if (e.mesh.material.userData.particles === 0) e.mesh.material.dispose();
        return false;
      }
      return true;
    });
    this.captureRing.visible = !!game.capture;
    if (game.capture) {
      const e = game.wild.find((e) => e.id === game.capture.id);
      if (e) {
        this.captureRing.position.set(e.x, heightAt(e.x, e.z) + 0.12, e.z);
        this.captureRing.scale.setScalar(1 + Math.sin(t * 8) * 0.04);
        this.captureRing.material.opacity = 0.4 + game.capture.time * 0.2;
      }
    }
    this.buildGhost.visible = !!build;
    if (build) {
      const b = this.buildPosition(game);
      this.buildGhost.position.set(b.x, heightAt(b.x, b.z) + 0.1, b.z);
      this.buildGhost.rotation.y = p.angle;
      this.buildGhost.material.color.set(
        game.canBuild(build, b.x, b.z) ? 0x70ffcf : 0xff755d,
      );
    }
    let look, want;
    if (title) {
      const a = 0.22 + Math.sin(t * 0.05) * 0.13;
      look = new T.Vector3(-1, 2, 5);
      want = new T.Vector3(Math.sin(a) * 28, 16, 43);
    } else {
      look = new T.Vector3(p.x, py + 1.4, p.z);
      want = look
        .clone()
        .add(
          new T.Vector3(
            Math.sin(this.theta) * Math.cos(this.pitch) * this.distance,
            Math.sin(this.pitch) * this.distance,
            Math.cos(this.theta) * Math.cos(this.pitch) * this.distance,
          ),
        );
      want.y = Math.max(want.y, heightAt(want.x, want.z) + 1.3);
    }
    this.camera.position.lerp(
      want,
      1 - Math.exp(-dt * (game.transit ? 5 : 12)),
    );
    this.target.lerp(look, 1 - Math.exp(-dt * 14));
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
    this.fps = this.fps * 0.96 + Math.min(120, 1 / Math.max(0.001, dt)) * 0.04;
  }
  buildPosition(game) {
    return {
      x: game.s.player.x + Math.sin(game.s.player.angle) * 4.2,
      z: game.s.player.z + Math.cos(game.s.player.angle) * 4.2,
    };
  }
}
