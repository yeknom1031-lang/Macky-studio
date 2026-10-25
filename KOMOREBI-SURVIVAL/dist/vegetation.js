(() => {
  const trunkGeometry = new THREE.CylinderGeometry(0.71, 1, 1, 6, 2, true);
  const twigGeometry = new THREE.CylinderGeometry(0.66, 1, 1, 3, 1, true);
  const leafGeometry = new THREE.PlaneGeometry(1, 1);
  for (let vertex = 0; vertex < leafGeometry.attributes.position.count; vertex++) {
    const horizontal = leafGeometry.attributes.position.getX(vertex), vertical = leafGeometry.attributes.position.getY(vertex);
    leafGeometry.attributes.position.setZ(vertex, horizontal * vertical * 0.22 + vertical * vertical * 0.1);
    const normal = new THREE.Vector3(-vertical * 0.22, -horizontal * 0.22 - vertical * 0.2, 1).normalize();
    leafGeometry.attributes.normal.setXYZ(vertex, normal.x, normal.y, normal.z);
  }
  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.045, 0, 0, 0.045, 0, 0, -0.025, 0.54, 0.055, 0.025, 0.54, 0.055, 0, 1, 0.24], 3));
  grassGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.22, 0.54, 0.78, 0.54, 0.5, 1], 2));
  grassGeometry.setAttribute('color', new THREE.Float32BufferAttribute([0.38, 0.46, 0.23, 0.38, 0.46, 0.23, 0.76, 0.88, 0.58, 0.76, 0.88, 0.58, 0.92, 0.97, 0.67], 3));
  grassGeometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); grassGeometry.computeVertexNormals();
  const fernGeometry = new THREE.BufferGeometry(), fernPositions = [], fernColors = [], fernIndices = [];
  const fernFace = (points, tone) => {
    const first = fernPositions.length / 3;
    points.forEach((point, index) => {
      fernPositions.push(...point);
      const shade = index === 2 ? 1.1 : 0.86;
      fernColors.push(tone[0] * shade, tone[1] * shade, tone[2] * shade);
    });
    fernIndices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  };
  for (let pair = 0; pair < 8; pair++) {
    const fraction = (pair + 0.5) / 9, spread = Math.sin(Math.PI * fraction) * 0.3;
    const rise = fraction * (1.5 - fraction) * 0.7, reach = fraction * fraction * 0.8;
    for (const side of [-1, 1]) {
      fernFace([[0, rise, reach - 0.04], [side * spread * 0.65, rise + 0.015, reach - 0.06], [side * spread, rise - 0.025, reach + 0.075], [side * spread * 0.34, rise + 0.018, reach + 0.075]], [0.4 + fraction * 0.18, 0.63 + fraction * 0.2, 0.27 + fraction * 0.13]);
    }
  }
  for (let stem = 0; stem < 3; stem++) {
    const start = stem / 3, end = (stem + 1) / 3;
    fernFace([[-0.009, start * (1.5 - start) * 0.7, start * start * 0.8], [0.009, start * (1.5 - start) * 0.7, start * start * 0.8], [0.006, end * (1.5 - end) * 0.7, end * end * 0.8], [-0.006, end * (1.5 - end) * 0.7, end * end * 0.8]], [0.42, 0.54, 0.22]);
  }
  fernGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fernPositions, 3));
  fernGeometry.setAttribute('color', new THREE.Float32BufferAttribute(fernColors, 3));
  fernGeometry.setIndex(fernIndices); fernGeometry.computeVertexNormals();
  const canopyGeometry = new THREE.BufferGeometry(), canopyPositions = [], canopyUvs = [], canopyIndices = [];
  for (let plane = 0; plane < 3; plane++) {
    const angle = plane * Math.PI / 3, first = canopyPositions.length / 3;
    for (const point of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
      canopyPositions.push(point[0] * Math.cos(angle), point[1], point[0] * Math.sin(angle)); canopyUvs.push(point[0] + 0.5, point[1] + 0.5);
    }
    canopyIndices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2);
  }
  canopyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(canopyPositions, 3));
  canopyGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(canopyUvs, 2)); canopyGeometry.setIndex(canopyIndices); canopyGeometry.computeVertexNormals();
  const canopyTexture = (kind) => {
    const size = 128, pixels = new Uint8Array(size * size * 4);
    const random = (east, north, salt = 0) => {
      let value = Math.imul(east | 0, 374761393) ^ Math.imul(north | 0, 668265263) ^ Math.imul(salt + 731, 1274126177);
      value = Math.imul(value ^ value >>> 13, 1274126177); return ((value ^ value >>> 16) >>> 0) / 4294967296;
    };
    const lobes = [];
    for (let branch = 0; branch < (kind === 'pine' ? 7 : 10); branch++) {
      const angle = kind === 'pine' ? (branch / 6 - 0.5) * 2.8 : branch * 2.399 + 0.4;
      for (let twig = 0; twig < 5; twig++) {
        const distance = 0.25 + twig * 0.15, reach = 0.65 + random(branch, twig, 8) * 0.25;
        const east = kind === 'pine' ? Math.sin(angle) * distance * reach : Math.cos(angle) * distance * reach;
        const north = kind === 'pine' ? -0.42 + Math.cos(angle) * distance * reach : Math.sin(angle) * distance * reach;
        lobes.push([east + (random(branch, twig, 9) - 0.5) * 0.18, north + (random(branch, twig, 10) - 0.5) * 0.14, kind === 'pine' ? 0.11 + random(branch, twig, 11) * 0.07 : 0.15 + random(branch, twig, 11) * 0.12, kind === 'pine' ? 0.1 : 0.12 + random(branch, twig, 12) * 0.1, random(branch, twig, 13)]);
      }
    }
    for (let vertical = 0; vertical < size; vertical++) for (let horizontal = 0; horizontal < size; horizontal++) {
      const east = horizontal / (size - 1) * 2 - 1, north = vertical / (size - 1) * 2 - 1;
      const grain = random(horizontal, vertical), clump = random(Math.floor(horizontal / 5), Math.floor(vertical / 5), 1);
      let inside = false, depth = 0;
      for (const lobe of lobes) {
        const distance = ((east - lobe[0]) / lobe[2]) ** 2 + ((north - lobe[1]) / lobe[3]) ** 2;
        if (distance < 0.82 + grain * 0.25 && lobe[4] >= depth) { inside = true; depth = lobe[4]; }
      }
      const pixel = (vertical * size + horizontal) * 4, shade = 0.55 + grain * 0.2 + depth * 0.42 + clump * 0.16 + Math.max(0, north) * 0.18;
      const base = kind === 'autumn' ? [118, 91, 48] : kind === 'pine' ? [62, 82, 56] : [76, 99, 49];
      pixels[pixel] = Math.min(255, base[0] * shade); pixels[pixel + 1] = Math.min(255, base[1] * shade); pixels[pixel + 2] = Math.min(255, base[2] * shade);
      pixels[pixel + 3] = inside && grain > 0.14 && (clump > 0.12 || grain > 0.75) ? 255 : 0;
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    texture.encoding = THREE.sRGBEncoding; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
    return texture;
  };
  const treeProfile = (tree, random) => {
    const habit = random(8500), form = Math.floor(random(8504) * 3);
    return {
      habit, form, height: (tree.conifer ? 10.5 + habit * 3.5 : 7.5 + habit * 4) * tree.scale,
      crownStart: tree.conifer ? 0.16 + random(8505) * 0.1 + (habit > 0.88 ? 0.12 : 0) : 0.35 + random(8505) * 0.09 + (form === 1 ? 0.12 : 0),
      width: tree.conifer ? 1 : form === 0 ? 1.2 : form === 1 ? 0.82 : 1.04,
      rise: form === 1 ? 1.38 : form === 0 ? 0.84 : 1.08
    };
  };
  const foliageTexture = (pixels, size) => {
    const visited = new Uint8Array(size * size), queue = new Uint32Array(size * size);
    let queueLength = 0;
    for (let pixel = 0; pixel < size * size; pixel++) if (pixels[pixel * 4 + 3] > 16) { visited[pixel] = 1; queue[queueLength++] = pixel; }
    for (let cursor = 0; cursor < queueLength; cursor++) {
      const pixel = queue[cursor], horizontal = pixel % size;
      for (const neighbor of [horizontal > 0 ? pixel - 1 : -1, horizontal < size - 1 ? pixel + 1 : -1, pixel - size, pixel + size]) {
        if (neighbor < 0 || neighbor >= size * size || visited[neighbor]) continue;
        visited[neighbor] = 1; queue[queueLength++] = neighbor;
        for (let channel = 0; channel < 3; channel++) pixels[neighbor * 4 + channel] = pixels[pixel * 4 + channel];
      }
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    texture.encoding = THREE.sRGBEncoding; texture.anisotropy = 4; texture.flipY = true; texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
    return texture;
  };
  class Vegetation {
    constructor(loader, bark) {
      this.clock = { value: 0 };
      this.bark = new THREE.MeshStandardMaterial({ map: bark, bumpMap: bark, bumpScale: 0.055, roughness: 0.96, color: '#d9d4c4' });
      this.trunkBark = new THREE.MeshStandardMaterial({ map: bark, bumpMap: bark, bumpScale: 0.065, roughness: 0.94, color: '#d9d4c4', vertexColors: true });
      this.barkDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      const curveBranch = (shader) => {
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float branchCurve = sin((position.y + 0.5) * 3.14159265);
            transformed.x += branchCurve * length(instanceMatrix[1].xyz) / max(0.02, length(instanceMatrix[0].xyz)) * 0.018;
          #endif
        `);
      };
      this.bark.onBeforeCompile = (shader) => {
        curveBranch(shader);
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
          #if defined(USE_INSTANCING) && defined(USE_UV)
            vUv *= vec2(max(0.22, length(instanceMatrix[0].xyz) * 5.2), max(0.3, length(instanceMatrix[1].xyz) * 0.9));
          #endif
        `);
      };
      this.bark.customProgramCacheKey = () => 'forest-bark-curved-metric-uv';
      this.barkDepth.onBeforeCompile = curveBranch;
      this.barkDepth.customProgramCacheKey = () => 'forest-bark-curved-depth';
      this.leaves = {}; this.leafDepth = {}; this.canopySources = {};
      for (const name of ['oak-leaves', 'pine-needles']) {
        const texture = loader.load(`assets/originals/${name === 'pine-needles' ? 'spruce-twig' : name}.png`, (loaded) => {
          this.canopySources[name] = loaded.image;
          if (this.canopies) this.bakeCanopies(name);
        });
        texture.encoding = THREE.sRGBEncoding; texture.anisotropy = 8;
        const material = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: name === 'pine-needles' ? 0.006 : 0.008, side: THREE.DoubleSide, alphaTest: 0.28, roughness: 0.8 });
        const depth = new THREE.MeshDepthMaterial({ map: texture, alphaTest: 0.28, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
        material.userData.thinLeaves = true;
        this.wind(material, 0.033); this.wind(depth, 0.033);
        this.fade(material, false);
        this.leaves[name] = material; this.leafDepth[name] = depth;
      }
      this.autumnLeaves = this.leaves['oak-leaves'].clone();
      this.wind(this.autumnLeaves, 0.033, true);
      this.fade(this.autumnLeaves, false);
      this.grass = new THREE.MeshStandardMaterial({ color: '#b4bc89', side: THREE.DoubleSide, vertexColors: true, roughness: 0.94 });
      this.ferns = new THREE.MeshStandardMaterial({ color: '#b5c794', side: THREE.DoubleSide, vertexColors: true, roughness: 0.87 });
      this.wind(this.grass, 0.075, false, true); this.wind(this.ferns, 0.035, false, true);
      this.canopies = {};
      for (const kind of ['oak', 'autumn', 'pine']) {
        this.canopies[kind] = new THREE.MeshBasicMaterial({ map: canopyTexture(kind), alphaTest: 0.3, side: THREE.DoubleSide, fog: true });
        this.fade(this.canopies[kind], true);
      }
      for (const name of Object.keys(this.canopySources)) this.bakeCanopies(name);
    }
    bakeCanopies(name) {
      if (typeof document === 'undefined' || !this.canopySources[name]) return;
      const pine = name === 'pine-needles', size = 512;
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d'); if (!context) return;
      const source = this.canopySources[name], count = pine ? 84 : 34;
      for (let spray = 0; spray < count; spray++) {
        const fraction = (spray + 0.5) / count, angle = spray * 2.399963;
        const distance = Math.sqrt(fraction), width = pine ? 112 + Math.sin(spray * 3.1) * 26 : 124 + Math.sin(spray * 1.7) * 27;
        const branchAngle = Math.floor(spray / 7) * 2.399963 + 0.3, twigDistance = 0.25 + (spray % 7) / 6 * 0.62;
        const horizontal = pine ? Math.cos(angle) * distance * 171 : Math.cos(branchAngle) * twigDistance * 168 + Math.sin(spray * 5.1) * 26;
        const vertical = pine ? Math.sin(angle) * distance * 120 : Math.sin(branchAngle) * twigDistance * 148 + Math.cos(spray * 3.7) * 22;
        context.save(); context.translate(size / 2 + horizontal, size / 2 + vertical);
        context.rotate(pine ? Math.atan2(vertical - 80, horizontal) + Math.PI / 4 : angle * 0.63);
        context.drawImage(source, -width / 2, -width / 2, width, width); context.restore();
      }
      const original = context.getImageData(0, 0, size, size);
      for (const kind of pine ? ['pine'] : ['oak', 'autumn']) {
        const pixels = new Uint8Array(original.data);
        for (let pixel = 0; pixel < pixels.length; pixel += 4) {
          const vertical = Math.floor(pixel / 4 / size) / size, shade = 0.67 + (1 - vertical) * 0.21;
          if (kind === 'autumn') {
            const luminance = pixels[pixel] * 0.22 + pixels[pixel + 1] * 0.7 + pixels[pixel + 2] * 0.08;
            pixels[pixel] = Math.min(255, (pixels[pixel] * 0.22 + luminance * 1.23) * shade);
            pixels[pixel + 1] = (pixels[pixel + 1] * 0.22 + luminance * 0.88) * shade;
            pixels[pixel + 2] = (pixels[pixel + 2] * 0.22 + luminance * 0.51) * shade;
          } else for (let channel = 0; channel < 3; channel++) pixels[pixel + channel] *= shade;
        }
        const texture = foliageTexture(pixels, size);
        const material = this.canopies[kind], previous = material.map;
        material.map = texture; material.needsUpdate = true; previous.dispose();
      }
      if (pine) this.bakeNeedles(source);
    }
    bakeNeedles(source) {
      const size = 1024, canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d'); if (!context) return;
      for (const angle of [-0.28, 0.28, 0]) {
        const width = size * 0.75;
        context.save(); context.translate(size * 0.13, size * 0.87); context.rotate(angle);
        context.drawImage(source, -width * 0.08, -width * 0.93, width, width); context.restore();
      }
      const texture = foliageTexture(new Uint8Array(context.getImageData(0, 0, size, size).data), size); texture.anisotropy = 8;
      const material = this.leaves['pine-needles'], depth = this.leafDepth['pine-needles'], previous = material.map;
      material.map = texture; material.bumpMap = texture; material.needsUpdate = true;
      depth.map = texture; depth.needsUpdate = true; previous.dispose();
    }
    wind(material, strength, autumn = false, rooted = false) {
      const thinLeaves = !!material.userData.thinLeaves;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.forestTime = this.clock;
        shader.vertexShader = 'uniform float forestTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float seed = instanceMatrix[3].x * 0.17 + instanceMatrix[3].z * 0.23;
            float sway = sin(forestTime * 1.2 + seed) + sin(forestTime * 2.7 + seed * 2.1) * 0.22;
            float flexibility = max(0.0, position.y ${rooted ? '' : '+ 0.5'});
            transformed.x += sway * ${strength} * flexibility;
            transformed.z += cos(forestTime * 0.9 + seed) * ${strength * 0.5} * flexibility;
          #endif
        `);
        if (autumn) shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float leafLuminance = dot(diffuseColor.rgb, vec3(0.22, 0.7, 0.08));
          diffuseColor.rgb = mix(diffuseColor.rgb, leafLuminance * vec3(2.1, 0.92, 0.24), 0.88);
        `);
        if (thinLeaves) {
          shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', 'if (forestDistance < 65.0) {\n#include <normal_fragment_maps>\n}');
          shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            roughnessFactor = clamp(roughnessFactor + (dot(diffuseColor.rgb, vec3(0.22, 0.7, 0.08)) - 0.2) * 0.15, 0.68, 0.88);
          `);
          shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
            #if NUM_DIR_LIGHTS > 0
              float transmittedLight = pow(max(0.0, -dot(geometry.normal, directionalLights[0].direction)), 1.5);
              reflectedLight.directDiffuse += diffuseColor.rgb * directionalLights[0].color * transmittedLight * 0.11;
            #endif
          `);
        }
      };
      material.customProgramCacheKey = () => `forest-wind-${strength}-${autumn}-${thinLeaves}-${rooted}`;
    }
    fade(material, distant) {
      const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey();
      material.onBeforeCompile = (shader) => {
        previous(shader);
        shader.vertexShader = 'varying float forestDistance;\n' + shader.vertexShader;
        shader.fragmentShader = 'varying float forestDistance;\n' + shader.fragmentShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 forestPoint = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            forestPoint = instanceMatrix * forestPoint;
          #endif
          forestDistance = length((modelViewMatrix * forestPoint).xyz);
        `);
        shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
          float forestBlend = smoothstep(95.0, 150.0, forestDistance);
          float forestDither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          if (${distant ? 'forestDither >= forestBlend' : 'forestDither < forestBlend'}) discard;
        `);
        if (distant) shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nif(forestDistance < 70.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);');
      };
      material.customProgramCacheKey = () => `${previousKey}-forest-fade-${distant}`;
    }
    build(group, trees, hash, height) {
      const branches = [], twigs = [], broadleaf = [], autumnLeaf = [], needles = [], grasses = [], ferns = [], understory = [];
      const stemPositions = [], stemUvs = [], stemColors = [], stemIndices = [];
      const column = Math.floor(group.userData.east / 128), row = Math.floor(group.userData.north / 128);
      const up = new THREE.Vector3(0, 1, 0), matrix = new THREE.Matrix4();
      const groundAt = (east, north) => height(group.userData.east + east, group.userData.north + north);
      const branch = (start, end, radius, color) => {
        const direction = end.clone().sub(start);
        if (direction.lengthSq() < 0.0001) return;
        (radius < 0.075 ? twigs : branches).push({ position: start.clone().add(end).multiplyScalar(0.5), quaternion: new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()), scale: new THREE.Vector3(radius, direction.length(), radius), color });
      };
      const spray = (items, position, size, yaw, tilt, color, roll = 0) => {
        items.push({ position, quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, roll)), scale: new THREE.Vector3(size, size * 0.9, size), color });
      };
      const stem = (pointAt, treeHeight, scale, color, phase) => {
        const sides = 10, sections = 12, first = stemPositions.length / 3;
        for (let section = 0; section <= sections; section++) {
          const fraction = section / sections, center = pointAt(fraction);
          for (let side = 0; side <= sides; side++) {
            const angle = side / sides * Math.PI * 2;
            const flare = Math.exp(-fraction * 23) * scale * 0.11 * (1 + Math.sin(angle * 5 + phase) * 0.2);
            const radius = (scale * (0.34 * Math.pow(1 - fraction, 0.83) + 0.018) + flare) * (1 + Math.sin(angle * 3 + fraction * 4 + phase) * 0.025);
            stemPositions.push(center.x + Math.cos(angle) * radius, center.y, center.z + Math.sin(angle) * radius);
            stemUvs.push(side / sides * Math.PI * 2 * scale * 0.36, fraction * treeHeight * 0.9);
            const rootShade = 1 - Math.exp(-fraction * 15) * 0.15;
            stemColors.push(color.r * rootShade, color.g * rootShade, color.b * rootShade);
            if (section < sections && side < sides) {
              const corner = first + section * (sides + 1) + side;
              stemIndices.push(corner, corner + sides + 1, corner + 1, corner + 1, corner + sides + 1, corner + sides + 2);
            }
          }
        }
      };
      trees.forEach((tree, index) => {
        const random = (salt) => hash(column + index * 13, row - index * 7, salt);
        const conifer = tree.conifer, profile = treeProfile(tree, random), habit = profile.habit;
        const treeHeight = profile.height;
        const origin = new THREE.Vector3(tree.east, tree.altitude, tree.north);
        const leanEast = (random(8501) - 0.5) * tree.scale * 1.5, leanNorth = (random(8502) - 0.5) * tree.scale * 1.5;
        const trunkPoint = (fraction) => origin.clone().add(new THREE.Vector3(leanEast * fraction + Math.sin(fraction * 4.4) * tree.scale * 0.12, treeHeight * fraction, leanNorth * fraction + Math.sin(fraction * 3.1) * tree.scale * 0.15));
        const barkColor = new THREE.Color().setRGB(0.8 + random(8503) * 0.2, 0.8 + random(8503) * 0.16, 0.76 + random(8503) * 0.16);
        stem(trunkPoint, treeHeight, tree.scale, barkColor, habit * Math.PI * 2);
        for (let root = 0; root < 5; root++) {
          const angle = root * 1.256 + random(root + 8510) * 0.8;
          const length = tree.scale * (0.75 + random(root + 8520) * 0.7);
          const bend = origin.clone().add(new THREE.Vector3(Math.cos(angle) * length * 0.4, 0.08, Math.sin(angle) * length * 0.4));
          bend.y = groundAt(bend.x, bend.z) + 0.08;
          const tip = origin.clone().add(new THREE.Vector3(Math.cos(angle + 0.15) * length, 0, Math.sin(angle + 0.15) * length));
          tip.y = groundAt(tip.x, tip.z) + 0.025;
          branch(origin.clone().add(new THREE.Vector3(0, 0.35 * tree.scale, 0)), bend, tree.scale * 0.21, barkColor);
          branch(bend, tip, tree.scale * 0.09, barkColor);
        }
        if (conifer) {
          const tiers = 11 + Math.floor(random(8550) * 4);
          const crownStart = profile.crownStart;
          for (let tier = 0; tier < tiers; tier++) {
            const fraction = tier / tiers, limbCount = tier > tiers - 3 ? 2 : 3;
            for (let limb = 0; limb < limbCount; limb++) {
              const salt = tier * 109 + limb * 29, angle = limb * Math.PI * 2 / limbCount + tier * 2.399 + random(salt + 8600) * 0.8;
              const start = trunkPoint(crownStart + fraction * (0.97 - crownStart) + (random(salt + 8601) - 0.5) * 0.035);
              const reach = tree.scale * (2.15 + random(salt + 8602) * 0.8) * Math.pow(1 - fraction * 0.93, 0.82);
              const droop = tree.scale * (0.16 + random(salt + 8603) * 0.32) * (1 - fraction);
              const bend = start.clone().add(new THREE.Vector3(Math.cos(angle) * reach * 0.55, -droop, Math.sin(angle) * reach * 0.55));
              const tip = start.clone().add(new THREE.Vector3(Math.cos(angle + 0.07) * reach, -droop * 0.4 + tree.scale * (0.12 + fraction * 0.3), Math.sin(angle + 0.07) * reach));
              branch(start, bend, tree.scale * 0.065 * (1 - fraction * 0.65), barkColor);
              branch(bend, tip, tree.scale * 0.036 * (1 - fraction * 0.65), barkColor);
              const twigCount = fraction < 0.55 ? 5 : 4;
              for (let twig = 0; twig < twigCount; twig++) {
                const section = 0.19 + twig * 0.71 / (twigCount - 1), side = twig % 2 ? -1 : 1;
                const attach = section < 0.55 ? start.clone().lerp(bend, section / 0.55) : bend.clone().lerp(tip, (section - 0.55) / 0.45);
                const turn = angle + side * (0.83 + random(salt + twig + 8610) * 0.38);
                const twigReach = reach * (0.35 + (1 - section) * 0.2);
                const twigTip = attach.clone().add(new THREE.Vector3(Math.cos(turn) * twigReach, tree.scale * (0.04 + fraction * 0.1), Math.sin(turn) * twigReach));
                const tone = 0.8 + random(salt + twig + 8620) * 0.2, color = new THREE.Color().setRGB(tone * 0.91, tone, tone * 0.84);
                const twigDirection = twigTip.clone().sub(attach).normalize(), photoDirection = new THREE.Vector3(1, 1, 0).normalize();
                for (let card = 0; card < 3; card++) {
                  const size = Math.min(1.45, tree.scale) * (0.47 + random(salt + twig * 7 + card + 8640) * 0.17) / 0.75;
                  const point = attach.clone().lerp(twigTip, card * 0.38).addScaledVector(twigDirection, size * 0.5233);
                  const orientation = new THREE.Quaternion().setFromUnitVectors(photoDirection, twigDirection);
                  orientation.premultiply(new THREE.Quaternion().setFromAxisAngle(twigDirection, card * Math.PI / 2 + random(salt + twig + 8650) * 0.35));
                  needles.push({ position: point, quaternion: orientation, scale: new THREE.Vector3(size, size, size), color });
                }
              }
            }
          }
          for (let tip = 0; tip < 8; tip++) spray(needles, trunkPoint(0.94 + tip * 0.008), Math.min(1.45, tree.scale) * 0.49 / 0.75, tip * 2.399, -0.2, new THREE.Color('#c5d0bb'));
        } else {
          const limbCount = 5 + Math.floor(random(8700) * 3), leafArray = tree.autumn ? autumnLeaf : broadleaf;
          const leafCloud = (center, radius, salt, count) => {
            for (let card = 0; card < count; card++) {
              const leafSalt = salt + card * 17, azimuth = random(leafSalt + 8760) * Math.PI * 2;
              const vertical = random(leafSalt + 8770) * 2 - 1, spread = Math.sqrt(Math.max(0, 1 - vertical * vertical));
              const distance = Math.cbrt(random(leafSalt + 8780)) * radius;
              const point = center.clone().add(new THREE.Vector3(Math.cos(azimuth) * spread * distance, vertical * distance * 0.67, Math.sin(azimuth) * spread * distance));
              const shade = 0.78 + random(leafSalt + 8790) * 0.22, hue = random(leafSalt + 8791), color = new THREE.Color().setRGB(shade * (0.88 + hue * 0.12), shade, shade * (0.72 + hue * 0.15));
              spray(leafArray, point, Math.min(1.7, tree.scale) * (0.48 + random(leafSalt + 8800) * 0.28), azimuth + card * 1.7, -Math.PI / 2 + (random(leafSalt + 8810) - 0.5) * 2.3, color, (random(leafSalt + 8820) - 0.5) * 0.7);
            }
          };
          for (let limb = 0; limb < limbCount; limb++) {
            const fraction = limb / limbCount, salt = limb * 101;
            const angle = limb * 2.399 + random(salt + 8710) * 0.8 + habit * 5;
            const start = trunkPoint(profile.crownStart + fraction * (0.74 - profile.crownStart) + random(salt + 8711) * 0.06);
            const reach = tree.scale * profile.width * (1.3 + random(salt + 8712) * 1.2) * (0.7 + Math.sin(fraction * Math.PI) * 0.3);
            const elbow = start.clone().add(new THREE.Vector3(Math.cos(angle) * reach * 0.48, tree.scale * profile.rise * (0.45 + random(salt + 8713) * 0.55), Math.sin(angle) * reach * 0.48));
            const end = elbow.clone().add(new THREE.Vector3(Math.cos(angle + 0.18) * reach * 0.55, tree.scale * profile.rise * (0.35 + random(salt + 8714) * 0.55), Math.sin(angle + 0.18) * reach * 0.55));
            const thickness = tree.scale * (0.1 + random(salt + 8715) * 0.045) * (1 - fraction * 0.45);
            branch(start, elbow, thickness, barkColor); branch(elbow, end, thickness * 0.66, barkColor);
            for (let fork = 0; fork < 3; fork++) {
              const turn = angle + (fork - 1) * 0.8 + (random(salt + fork + 8720) - 0.5) * 0.4;
              const attach = elbow.clone().lerp(end, 0.5 + fork * 0.25);
              const forkTip = attach.clone().add(new THREE.Vector3(Math.cos(turn) * tree.scale * (0.45 + random(salt + fork + 8730) * 0.45), tree.scale * (0.3 + random(salt + fork + 8740) * 0.4), Math.sin(turn) * tree.scale * (0.45 + random(salt + fork + 8730) * 0.45)));
              branch(attach, forkTip, thickness * 0.35, barkColor);
              leafCloud(forkTip, tree.scale * (0.72 + random(salt + fork + 8750) * 0.12), salt + fork * 251, 25);
            }
          }
          leafCloud(trunkPoint(0.94), tree.scale * 0.86, 15710, 40);
          leafCloud(trunkPoint(0.77).add(new THREE.Vector3(0.3 * tree.scale, 0, -0.2 * tree.scale)), tree.scale * 1.02, 16510, 30);
        }
        if (random(8900) > 0.65) {
          const angle = random(8901) * Math.PI * 2, start = origin.clone().add(new THREE.Vector3(Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2));
          const end = start.clone().add(new THREE.Vector3(Math.cos(angle + 0.4) * tree.scale * 2.1, 0, Math.sin(angle + 0.4) * tree.scale * 2.1));
          start.y = groundAt(start.x, start.z) + 0.12; end.y = groundAt(end.x, end.z) + 0.08;
          branch(start, end, tree.scale * 0.12, new THREE.Color('#7a816b'));
        }
        const patchAngle = random(8908) * Math.PI * 2, patchDistance = 1.8 + random(8909) * 3.8;
        const colony = random(8910) < 0.67 ? 3 + Math.floor(random(8911) * 4) : 0;
        for (let shrub = 0; shrub < colony; shrub++) {
          const angle = shrub * 2.399 + patchAngle, distance = Math.sqrt(shrub / Math.max(1, colony - 1)) * (1.1 + random(8912) * 1.5);
          const east = tree.east + Math.cos(patchAngle) * patchDistance + Math.cos(angle) * distance, north = tree.north + Math.sin(patchAngle) * patchDistance + Math.sin(angle) * distance, ground = groundAt(east, north);
          if (ground < 6 || ground > 160) continue;
          const shrubSize = 0.7 + random(shrub + 8920) * 0.95, cards = 15 + Math.floor(shrubSize * 5);
          for (let card = 0; card < cards; card++) {
            const turn = card * 2.399, ring = Math.sqrt(card / cards) * 0.6 * shrubSize;
            spray(understory, new THREE.Vector3(east + Math.cos(turn) * ring, ground + shrubSize * 0.24 + (1 - ring) * shrubSize * 0.45, north + Math.sin(turn) * ring), (0.4 + random(card + shrub * 10 + 8930) * 0.17) * shrubSize, turn, -0.6 - random(card + 8940), new THREE.Color('#b9caa4'));
          }
          if (shrub === 0 || shrub === colony - 1) {
            const fernSize = 0.45 + random(shrub + 8948) * 0.6, fronds = 4 + Math.floor(random(shrub + 8949) * 3);
            for (let frond = 0; frond < fronds; frond++) ferns.push({ position: new THREE.Vector3(east + 0.75, groundAt(east + 0.75, north), north), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, frond * Math.PI * 2 / fronds + angle, (random(frond + 8950) - 0.5) * 0.2)), scale: new THREE.Vector3(fernSize, fernSize, fernSize), color: new THREE.Color('#abbf8e') });
          }
        }
      });
      for (let tuft = 0; tuft < 1400; tuft++) {
        const colony = Math.floor(tuft / 14), angle = tuft * 2.399, spread = Math.sqrt(hash(column, row, tuft + 10500)) * (0.8 + hash(column, row, colony + 10800) * 1.7);
        const east = hash(column, row, colony + 10000) * 128 + Math.cos(angle) * spread, north = hash(column, row, colony + 12000) * 128 + Math.sin(angle) * spread;
        const worldEast = group.userData.east + east, worldNorth = group.userData.north + north, ground = height(worldEast, worldNorth);
        if (ground < 5 || ground > 160 || window.KomorebiSurvivalPlacement?.excludeTree(worldEast,worldNorth)) continue;
        const patch = Math.sin(worldEast * 0.12 + Math.sin(worldNorth * 0.07) * 2) * Math.cos(worldNorth * 0.11) * 0.5 + 0.5;
        if (hash(column, row, tuft + 14000) > 0.3 + patch * 0.65) continue;
        const dry = hash(Math.floor(worldEast / 10), Math.floor(worldNorth / 10), 9100) > 0.83;
        const color = new THREE.Color(dry ? '#beb38b' : ['#b2bb8b', '#8ba171', '#a8b57a'][tuft % 3]);
        const slopeEast = groundAt(east + 0.3, north) - ground, slopeNorth = groundAt(east, north + 0.3) - ground;
        if (Math.hypot(slopeEast, slopeNorth) / 0.3 > 0.85) continue;
        const bladeCount = 7 + (patch > 0.55 ? Math.min(3, Math.floor(trees.length / 30)) : 0);
        for (let blade = 0; blade < bladeCount; blade++) {
          const angle = blade * 2.399 + tuft, radius = hash(tuft, blade, 9200) * 0.24;
          const bladeEast = east + Math.cos(angle) * radius, bladeNorth = north + Math.sin(angle) * radius;
          grasses.push({ position: new THREE.Vector3(bladeEast, groundAt(bladeEast, bladeNorth) - 0.025, bladeNorth), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0)), scale: new THREE.Vector3(0.24 + hash(tuft, blade, 9203) * 0.32, 0.15 + hash(tuft, blade, 9204) * (0.22 + patch * 0.32) + (ground < 10 ? 0.18 : 0), 1), color });
        }
      }
      const batch = (items, template, material, drawRange, shadow, depth, drawCenter) => {
        if (!items.length) return;
        const geometry = template.clone(), bounds = new THREE.Box3(), corner = new THREE.Vector3();
        const mesh = new THREE.InstancedMesh(geometry, material, items.length);
        items.forEach((item, index) => {
          matrix.compose(item.position, item.quaternion, item.scale); mesh.setMatrixAt(index, matrix);
          if (item.color) mesh.setColorAt(index, item.color);
          const radius = Math.max(item.scale.x, item.scale.y, item.scale.z) * 1.4;
          bounds.expandByPoint(corner.copy(item.position).addScalar(radius)); bounds.expandByPoint(corner.copy(item.position).addScalar(-radius));
        });
        geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere()); geometry.boundingBox = bounds;
        group.userData.owned.push(geometry);
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.frustumCulled = true; mesh.castShadow = shadow; mesh.receiveShadow = true;
        mesh.userData.groundGrass = template === grassGeometry; mesh.userData.drawRange = drawRange; mesh.userData.forestShadow = shadow; mesh.userData.noShadow = !shadow;
        if (drawCenter) mesh.userData.drawCenter = drawCenter;
        if (depth) mesh.customDepthMaterial = depth;
        group.add(mesh);
      };
      const tiledLeaves = (items, material, depth) => {
        const tiles = [[], [], [], []];
        for (const item of items) {
          const east = Math.min(1, Math.max(0, Math.floor(item.position.x / 64))), north = Math.min(1, Math.max(0, Math.floor(item.position.z / 64)));
          tiles[north * 2 + east].push(item);
        }
        for (let tile = 0; tile < tiles.length; tile++) batch(tiles[tile], leafGeometry, material, 205, true, depth, { x: (tile % 2) * 64 + 32, z: Math.floor(tile / 2) * 64 + 32 });
      };
      if (stemPositions.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(stemPositions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(stemUvs, 2));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(stemColors, 3)); geometry.setIndex(stemIndices);
        geometry.computeVertexNormals(); geometry.computeBoundingSphere(); geometry.computeBoundingBox();
        geometry.boundingSphere.radius += 0.02;
        const normals = geometry.attributes.normal, seamNormal = new THREE.Vector3(), oppositeNormal = new THREE.Vector3();
        for (let ring = 0; ring < normals.count; ring += 11) {
          seamNormal.fromBufferAttribute(normals, ring).add(oppositeNormal.fromBufferAttribute(normals, ring + 10)).normalize();
          normals.setXYZ(ring, seamNormal.x, seamNormal.y, seamNormal.z); normals.setXYZ(ring + 10, seamNormal.x, seamNormal.y, seamNormal.z);
        }
        const mesh = new THREE.InstancedMesh(geometry, this.trunkBark, 1);
        mesh.setMatrixAt(0, new THREE.Matrix4()); mesh.setColorAt(0, new THREE.Color(0xffffff)); mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = true; mesh.userData.drawRange = 330; mesh.userData.forestShadow = true;
        group.userData.owned.push(geometry); group.add(mesh);
      }
      batch(branches, trunkGeometry, this.bark, 250, true, this.barkDepth);
      batch(twigs, twigGeometry, this.bark, 190, false);
      tiledLeaves(broadleaf, this.leaves['oak-leaves'], this.leafDepth['oak-leaves']);
      tiledLeaves(autumnLeaf, this.autumnLeaves, this.leafDepth['oak-leaves']);
      tiledLeaves(needles, this.leaves['pine-needles'], this.leafDepth['pine-needles']);
      batch(understory, leafGeometry, this.leaves['oak-leaves'], 140, false);
      batch(grasses, grassGeometry, this.grass, 130, false);
      batch(ferns, fernGeometry, this.ferns, 130, false);
      this.buildCanopies(group, trees, hash, 250);
    }
    buildDistant(group, trees, hash) {
      this.buildCanopies(group, trees, hash, 0);
    }
    buildCanopies(group, trees, hash, minimumRange) {
      const groups = { oak: [], autumn: [], pine: [], trunks: [] }, column = Math.floor(group.userData.east / 128), row = Math.floor(group.userData.north / 128);
      for (let index = 0; index < trees.length; index++) {
        const tree = trees[index], random = (salt) => hash(column + index * 13, row - index * 7, salt), profile = treeProfile(tree, random), habit = profile.habit;
        const treeHeight = profile.height, crownStart = profile.crownStart;
        const kind = tree.conifer ? 'pine' : tree.autumn ? 'autumn' : 'oak';
        tree.trunkHeight = treeHeight;
        tree.crownCenter = new THREE.Vector3(tree.east, tree.altitude + treeHeight * (crownStart + (1.05 - crownStart) / 2), tree.north);
        tree.crownRadius = tree.scale * (tree.conifer ? 3.1 : 3.45 * profile.width);
        tree.crownHalfHeight = treeHeight * (1.05 - crownStart) / 2;
        if (tree.conifer) {
          for (let crown = 0; crown < 8; crown++) {
            const fraction = crown / 8, width = tree.scale * (6.1 - fraction * 5.1);
            groups[kind].push({ position: new THREE.Vector3(tree.east + (random(crown + 9010) - 0.5) * tree.scale * 0.5, tree.altitude + treeHeight * (crownStart + fraction * (0.98 - crownStart)), tree.north + (random(crown + 9020) - 0.5) * tree.scale * 0.5), scale: new THREE.Vector3(width, treeHeight * 0.19, width), angle: habit * Math.PI * 2 + crown * 2.399 });
          }
        } else {
          for (let crown = 0; crown < 9; crown++) {
            const angle = crown * 2.399 + habit * 5, radius = crown > 6 ? 0.2 : tree.scale * profile.width * (1 + random(crown + 9030) * 1.15);
            const width = tree.scale * (2.3 + random(crown + 9040) * 1.5), fraction = crown > 6 ? crown === 7 ? 0.96 : 0.79 : crownStart + 0.14 + random(crown + 9050) * (0.7 - crownStart);
            groups[kind].push({ position: new THREE.Vector3(tree.east + Math.cos(angle) * radius, tree.altitude + treeHeight * fraction, tree.north + Math.sin(angle) * radius), scale: new THREE.Vector3(width, tree.scale * (1.5 + random(crown + 9060) * 1.4), width * (0.8 + random(crown + 9061) * 0.3)), angle: habit * Math.PI * 2 + crown * 1.71 });
          }
        }
        groups.trunks.push({ position: new THREE.Vector3(tree.east, tree.altitude + treeHeight * 0.44, tree.north), scale: new THREE.Vector3(tree.scale * 0.27, treeHeight * 0.88, tree.scale * 0.27), angle: habit * Math.PI * 2 });
      }
      const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), boundsPoint = new THREE.Vector3(), tint = new THREE.Color(0xffffff);
      for (const kind of Object.keys(groups)) {
        const items = groups[kind]; if (!items.length) continue;
        const geometry = (kind === 'trunks' ? twigGeometry : canopyGeometry).clone(), bounds = new THREE.Box3();
        const mesh = new THREE.InstancedMesh(geometry, kind === 'trunks' ? this.bark : this.canopies[kind], items.length);
        items.forEach((item, index) => {
          quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), item.angle); matrix.compose(item.position, quaternion, item.scale); mesh.setMatrixAt(index, matrix);
          if (kind === 'trunks') tint.setRGB(1, 1, 1);
          else {
            const shade = 0.84 + hash(column, row, index + 92010) * 0.16, hue = hash(column, row, index + 93010);
            tint.setRGB(shade * (0.9 + hue * 0.1), shade, shade * (0.88 + (1 - hue) * 0.12));
          }
          mesh.setColorAt(index, tint);
          const radius = Math.max(item.scale.x, item.scale.y, item.scale.z);
          bounds.expandByPoint(boundsPoint.copy(item.position).addScalar(radius)); bounds.expandByPoint(boundsPoint.copy(item.position).addScalar(-radius));
        });
        geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere()); geometry.boundingBox = bounds; group.userData.owned.push(geometry);
        mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = true; mesh.userData.noShadow = true;
        mesh.userData.drawRange = 1100; mesh.userData.minDrawRange = minimumRange && kind === 'trunks' ? 330 : 0;
        mesh.visible = kind !== 'trunks' || minimumRange === 0; group.add(mesh);
      }
    }
  }
  window.Vegetation = Vegetation;
})();
