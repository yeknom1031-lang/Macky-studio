(() => {
  'use strict';
  const element = (id) => document.getElementById(id);
  const canvas = element('world');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); }
  catch { element('error').hidden = false; element('error').textContent = '3D画面を起動できませんでした。WebGL対応のブラウザで開いてください。'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a7c9d3');
  scene.fog = new THREE.FogExp2('#a7c9d3', 0.0018);
  const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 5100);
  camera.rotation.order = 'YXZ';
  const hemisphere = new THREE.HemisphereLight('#dbeaf1', '#6d8060', 0.75);
  const sun = new THREE.DirectionalLight('#fff0ce', 1.35);
  const daySkyColor = new THREE.Color('#dbeaf1'), nightSkyColor = new THREE.Color('#a5bbd7');
  const dayGroundColor = new THREE.Color('#39412d'), nightGroundColor = new THREE.Color('#343e46');
  const noonLightColor = new THREE.Color('#fff2dd'), duskLightColor = new THREE.Color('#ffca98'), moonLightColor = new THREE.Color('#c1d7ed');
  sun.position.set(-150, 260, -250);
  sun.castShadow = true; sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left = -85; sun.shadow.camera.right = 85; sun.shadow.camera.top = 85; sun.shadow.camera.bottom = -85;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 650; sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.045; sun.shadow.radius = 2;
  scene.add(hemisphere, sun, sun.target);
  const atmosphere = new Atmosphere(scene);
  const world = new NatureWorld(scene);
  world.waterUniforms.cloudLayer.value = atmosphere.cloudTexture;
  const sound = new Soundscape();
  const targets = [...NatureWorld.species, ...NatureWorld.biomes.map((region) => ({ ...region, id: 'landscape-' + region.id }))];
  element('helpDialog').querySelectorAll('p')[1].textContent = `被写体に近づき、枠の中に収めて撮影しましょう。距離と構図に応じて星がつきます。${NatureWorld.species.length}種類の動物と7種類の風景を図鑑に記録します。画面から離れると移動は停止します。`;
  const terrainHeight = NatureWorld.height;
  const starPoints = new Float32Array(600 * 3);
  for (let index = 0; index < 600; index++) {
    const angle = NatureWorld.hash(index, 1) * Math.PI * 2;
    const vertical = NatureWorld.hash(index, 2) * 0.95 + 0.05;
    const radius = Math.sqrt(1 - vertical * vertical);
    starPoints.set([Math.cos(angle) * radius * 1100, vertical * 1100, Math.sin(angle) * radius * 1100], index * 3);
  }
  const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.BufferAttribute(starPoints, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#f0ead6', size: 2, transparent: true, opacity: 0 }));
  scene.add(stars);
  const rainPoints = new Float32Array(900 * 6);
  for (let index = 0; index < 900; index++) {
    const east = (Math.random()-0.5)*110, altitude = Math.random()*70, north = (Math.random()-0.5)*110;
    rainPoints.set([east,altitude,north,east-0.08,altitude+0.75,north+0.04],index*6);
  }
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPoints, 3));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#a9c4d2', transparent: true, opacity: 0.4, depthWrite: false }));
  scene.add(rain);
  let savedPlayer = null;
  const cycle = new WorldClimate();
  let flying = false;
  let distanceTravelled = 0;
  let weather = 0;
  const storageKey = 'komorebi-photo-v2';
  const profile = new URLSearchParams(location.search).get('profile');
  const saveKey = profile ? `${storageKey}-${profile}` : storageKey;
  let photos = [];
  let collected = {};
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(saveKey) || localStorage.getItem(saveKey.replace('-v2', '-v1')) || '{}');
    if (saved.player && [saved.player.east, saved.player.north, saved.player.yaw, saved.player.pitch].every(Number.isFinite)) savedPlayer = saved.player;
    if (Number.isFinite(saved.distance)) distanceTravelled = saved.distance;
    cycle.restore(saved);
    if (Array.isArray(saved.photos)) photos = saved.photos.filter((photo) => typeof photo.image === 'string' && photo.image.startsWith('data:image/jpeg;')).slice(0, 24);
    if (saved.collected && typeof saved.collected === 'object') {
      for (const target of targets) if ([1, 2, 3].includes(saved.collected[target.id])) collected[target.id] = saved.collected[target.id];
    }
  } catch { storageAvailable = false; }
  const save = () => {
    try {
      localStorage.setItem(saveKey, JSON.stringify({ photos, collected, player, ...cycle.snapshot(), distance: distanceTravelled }));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
      toast('保存領域がいっぱいです。大切な写真をダウンロードしてください。');
    }
    element('saveStatus').textContent = storageAvailable ? '写真と撮影実績はブラウザに保存されます。' : '自動保存できません。この画面を閉じる前に写真をダウンロードしてください。';
  };
  let toastTimer;
  function toast(message) {
    element('toast').textContent = message;
    element('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element('toast').classList.remove('show'), 3500);
  }
  const updateJournal = () => {
    element('subjects').replaceChildren();
    for (const target of targets) {
      const item = document.createElement('li');
      item.textContent = target.name;
      if (collected[target.id]) {
        item.className = 'done';
        const rating = document.createElement('span');
        rating.textContent = '★'.repeat(collected[target.id]);
        item.append(rating);
      }
      element('subjects').append(item);
    }
    const count = Object.keys(collected).length;
    element('discovered').textContent = `${count} / ${targets.length}`;
    element('progressBar').style.width = `${count / targets.length * 100}%`;
    element('photoCount').textContent = photos.length;
    if (count === targets.length) element('journal').querySelector('h2').textContent = '自然図鑑、全種撮影！';
  };
  updateJournal();
  const player = savedPlayer || { east: 211, north: 191, yaw: 0.85, pitch: -0.12 };
  world.update(player.east, player.north, 0, { day: cycle.day, ...cycle.sample(player.east,player.north) });
  const keys = new Set();
  let started = false;
  let cameraMode = false;
  let zoom = 1;
  let lastShot = -10;
  let time = 0;
  let targetTime = 0;
  const dialogs = [...document.querySelectorAll('dialog')];
  const paused = () => !started || document.hidden || dialogs.some((dialog) => dialog.open);
  const moveCamera = () => {
    camera.position.set(player.east - world.offset.x, Math.max(terrainHeight(player.east, player.north), 4) + 1.8 + (flying ? 35 : 0), player.north - world.offset.z);
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    camera.updateMatrixWorld();
  };
  moveCamera();
  const setCameraMode = (enabled) => {
    cameraMode = enabled;
    document.body.classList.toggle('camera', enabled);
    element('viewfinder').hidden = !enabled;
    element('cameraButton').hidden = enabled;
    element('shutterButton').hidden = !enabled;
    camera.fov = enabled ? 48 / zoom : 66;
    camera.updateProjectionMatrix();
    element('zoomLabel').textContent = Math.round(35 * zoom);
  };
  const changeZoom = (direction) => {
    if (!cameraMode) return;
    zoom = THREE.MathUtils.clamp(zoom + direction * 0.15, 1, 3);
    setCameraMode(true);
  };
  const raycaster = new THREE.Raycaster();
  const candidatePosition = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();
  const aim = () => {
    let best = null;
    const nearOccluders = world.occluders.filter((mesh) => mesh !== world.horizon);
    for (const target of world.candidates()) {
      candidatePosition.copy(target.point);
      const distance = camera.position.distanceTo(candidatePosition);
      if (distance > target.range || distance < 2) continue;
      projected.copy(candidatePosition).project(camera);
      if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 0.75 || Math.abs(projected.y) > 0.75) continue;
      rayDirection.copy(candidatePosition).sub(camera.position).normalize();
      raycaster.set(camera.position, rayDirection); raycaster.far = distance - 0.4;
      if (raycaster.intersectObjects(nearOccluders, false).length) continue;
      if (world.vegetationBlocks(camera.position, candidatePosition)) continue;
      const quality = Math.max(0, 1 - Math.hypot(projected.x, projected.y)) * 0.62 + Math.min(1, target.ideal * zoom / distance) * 0.38;
      if (!best || quality > best.quality) best = { target, quality, distance, stars: quality > 0.84 ? 3 : quality > 0.63 ? 2 : 1 };
    }
    if (!best) {
      camera.getWorldDirection(rayDirection); raycaster.set(camera.position, rayDirection); raycaster.far = 800;
      const hits = raycaster.intersectObjects(world.occluders, false);
      if (hits.length && !world.vegetationBlocks(camera.position, hits[0].point)) {
        const hit = hits[0], region = NatureWorld.biome(hit.point.x + world.offset.x, hit.point.z + world.offset.z);
        best = { target: { id: 'landscape-' + region.id, name: region.name }, quality: 0.7, distance: hit.distance, stars: hit.distance > 80 && player.pitch > -0.4 ? 3 : 2 };
      }
    }
    return best;
  };
  const shutterSound = () => { if (element('soundToggle').checked) sound.shutter(); };
  const shoot = () => {
    if (!cameraMode || paused() || time - lastShot < 0.7) return;
    lastShot = time;
    moveCamera();
    scene.updateMatrixWorld(true);
    const subject = aim();
    renderer.render(scene, camera);
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = 960;
    imageCanvas.height = Math.round(960 / camera.aspect);
    if (imageCanvas.height > 960) { imageCanvas.height = 960; imageCanvas.width = Math.round(960 * camera.aspect); }
    imageCanvas.getContext('2d').drawImage(canvas, 0, 0, imageCanvas.width, imageCanvas.height);
    const photo = {
      id: `${Date.now()}-${Math.round(Math.random() * 100000)}`,
      image: imageCanvas.toDataURL('image/jpeg', 0.76),
      title: subject ? subject.target.name : element('locationName').textContent + 'の風景',
      stars: subject ? subject.stars : 0,
      date: new Date().toISOString(),
      focal: Math.round(35 * zoom),
      coordinates: [Math.round(player.east), Math.round(player.north)]
    };
    photos.unshift(photo);
    photos = photos.slice(0, 24);
    const wasComplete = Object.keys(collected).length === targets.length;
    if (subject) collected[subject.target.id] = Math.max(collected[subject.target.id] || 0, subject.stars);
    updateJournal();
    toast(subject ? `${'★'.repeat(subject.stars)} ${photo.title} を写真帖に残しました` : '風景を写真帖に残しました');
    save();
    shutterSound();
    element('flash').classList.add('fire');
    setTimeout(() => element('flash').classList.remove('fire'), 70);
    if (!wasComplete && Object.keys(collected).length === targets.length) setTimeout(() => toast('すべての自然と生き物を記録しました。旅はまだ続きます。'), 1800);
  };
  const openDialog = (id) => {
    keys.clear();
    if (id === 'albumDialog') renderAlbum();
    if (id === 'mapDialog') drawMap();
    if (id === 'helpDialog') {
      element('daySlider').value = String(cycle.day);
      element('automaticTime').checked = cycle.automatic;
      element('dayLength').value = String(cycle.dayLength);
      element('weatherMode').value = cycle.weatherMode;
    }
    element(id).showModal();
  };
  const renderAlbum = () => {
    const grid = element('albumGrid');
    grid.replaceChildren();
    element('albumTotal').textContent = ` / ${photos.length}`;
    if (!photos.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'まだ、まっさらな写真帖。Cでカメラを構えて、最初の一枚を。';
      grid.append(empty);
    }
    for (const photo of photos) {
      const card = document.createElement('button');
      card.className = 'photo-card';
      const image = document.createElement('img'); image.src = photo.image; image.alt = photo.title;
      const title = document.createElement('strong'); title.textContent = photo.title;
      const detail = document.createElement('small'); detail.textContent = `${photo.stars ? '★'.repeat(photo.stars) : '自由撮影'} · ${photo.focal}mm`;
      card.append(image, title, detail);
      card.addEventListener('click', () => showPhoto(photo.id));
      grid.append(card);
    }
  };
  let selectedPhoto;
  const showPhoto = (id) => {
    const photo = photos.find((entry) => entry.id === id);
    if (!photo) return;
    selectedPhoto = photo.id;
    element('photoTitle').textContent = photo.title;
    element('photoImage').src = photo.image;
    element('photoImage').alt = photo.title;
    element('photoInfo').textContent = `${photo.stars ? '★'.repeat(photo.stars) : '自由撮影'} · ${photo.focal}mm · ${new Date(photo.date).toLocaleString('ja-JP')}`;
    element('downloadPhoto').href = photo.image;
    element('downloadPhoto').download = `komorebi-${photo.id}.jpg`;
    element('photoDialog').showModal();
  };
  element('deletePhoto').addEventListener('click', () => {
    photos = photos.filter((photo) => photo.id !== selectedPhoto);
    save(); updateJournal(); renderAlbum(); element('photoDialog').close();
  });
  const drawMap = () => {
    const context = element('mapCanvas').getContext('2d');
    const scale = 2.5;
    for (let row = 0; row < 560; row += 8) for (let column = 0; column < 680; column += 8) {
      const east = player.east + (column - 340) * scale, north = player.north + (row - 280) * scale;
      const altitude = terrainHeight(east, north);
      context.fillStyle = altitude < 4 ? '#7caab7' : NatureWorld.biome(east, north, altitude).color;
      context.fillRect(column, row, 8, 8);
    }
    context.strokeStyle = '#ffffff30'; context.lineWidth = 1;
    for (let column = 0; column < 680; column += 85) { context.beginPath(); context.moveTo(column, 0); context.lineTo(column, 560); context.stroke(); }
    context.save(); context.translate(340, 280); context.rotate(-player.yaw);
    context.fillStyle = '#214c46'; context.strokeStyle = '#fff'; context.lineWidth = 2;
    context.beginPath(); context.moveTo(0, -13); context.lineTo(8, 10); context.lineTo(0, 5); context.lineTo(-8, 10); context.closePath(); context.fill(); context.stroke(); context.restore();
    context.fillStyle = '#fffdf4'; context.font = '16px sans-serif'; context.fillText('N ↑', 615, 35);
    context.fillText('現在地 ' + Math.round(player.east) + ', ' + Math.round(player.north) + '  /  地図幅 1.7 km', 20, 530);
    element('travelList').replaceChildren();
    for (const destination of world.destinations) {
      const button = document.createElement('button'); button.textContent = destination.name + ' →';
      button.addEventListener('click', () => {
        player.east = destination.east; player.north = destination.north; player.pitch = -0.08;
        if (Number.isFinite(destination.yaw)) player.yaw = destination.yaw;
        keys.clear(); world.update(player.east, player.north, time, { day: cycle.day, ...cycle.sample(player.east,player.north) }); moveCamera(); element('mapDialog').close(); save();
        toast(destination.name + ' の探訪地点へ移動しました');
      });
      element('travelList').append(button);
    }
  };
  element('startButton').addEventListener('click', () => {
    started = true; sound.start(); element('welcome').hidden = true; document.body.classList.add('started');
    toast('WASDで歩く · ドラッグで見回す · Cでカメラ');
  });
  element('cameraButton').addEventListener('click', () => setCameraMode(true));
  element('shutterButton').addEventListener('click', shoot);
  element('mapButton').addEventListener('click', () => openDialog('mapDialog'));
  element('albumButton').addEventListener('click', () => openDialog('albumDialog'));
  element('helpButton').addEventListener('click', () => openDialog('helpDialog'));
  for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => element(button.dataset.close).close());
  for (const dialog of dialogs) dialog.addEventListener('close', () => keys.clear());
  document.addEventListener('keydown', (event) => {
    if (!started || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
    if (dialogs.some((dialog) => dialog.open)) return;
    const key = event.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    keys.add(key);
    if (event.repeat) return;
    if (key === 'c') setCameraMode(!cameraMode);
    if (key === 'g') { flying = !flying; toast(flying ? '滑空モード · 大自然を上空から撮影' : '徒歩に戻りました'); }
    if (key === 'p') openDialog('albumDialog');
    if (key === 'm') openDialog('mapDialog');
    if (key === ' ') shoot();
    if (key === 'escape') setCameraMode(false);
    if (key === '+' || key === '=') changeZoom(1);
    if (key === '-') changeZoom(-1);
  });
  document.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => { keys.clear(); drag = null; });
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    if (paused()) return;
    drag = { east: event.clientX, north: event.clientY, distance: 0, pointer: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointer !== event.pointerId || paused()) return;
    const eastDelta = event.clientX - drag.east;
    const northDelta = event.clientY - drag.north;
    drag.distance += Math.abs(eastDelta) + Math.abs(northDelta);
    player.yaw -= eastDelta * 0.003 / (cameraMode ? zoom : 1);
    player.pitch = THREE.MathUtils.clamp(player.pitch - northDelta * 0.003 / (cameraMode ? zoom : 1), -1.15, 1.15);
    drag.east = event.clientX; drag.north = event.clientY;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (drag && drag.pointer === event.pointerId && drag.distance < 7) shoot();
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => { if (cameraMode) { event.preventDefault(); changeZoom(event.deltaY < 0 ? 1 : -1); } }, { passive: false });
  const moveKeys = { forward: 'w', back: 's', left: 'a', right: 'd' };
  for (const button of document.querySelectorAll('[data-move]')) {
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); keys.add(moveKeys[button.dataset.move]); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(moveKeys[button.dataset.move]));
  }
  element('musicVolume').addEventListener('input', (event) => { sound.musicVolume = Number(event.target.value); });
  element('natureVolume').addEventListener('input', (event) => { sound.natureVolume = Number(event.target.value); });
  element('muteButton').addEventListener('click', () => { sound.muted = !sound.muted; element('muteButton').textContent = sound.muted ? '音 OFF' : '音 ON'; });
  element('daySlider').addEventListener('input', (event) => { cycle.setDay(Number(event.target.value)); });
  element('daySlider').addEventListener('change', save);
  element('automaticTime').addEventListener('change', (event) => { cycle.automatic = event.target.checked; save(); });
  element('dayLength').addEventListener('change', (event) => { cycle.dayLength = Number(event.target.value); save(); });
  element('weatherMode').addEventListener('change', (event) => { cycle.weatherMode = event.target.value; save(); });
  element('glideButton').addEventListener('click', () => { flying = !flying; toast(flying ? '滑空モード' : '徒歩に戻りました'); });
  let previous = performance.now(), lastSave = 0, shadowUpdate = -1, metricTime = 0, metricFrames = 0;
  document.addEventListener('visibilitychange', () => {
    previous = performance.now(); keys.clear(); drag = null;
    if (document.hidden) { sound.update({ paused: true }); if (started) save(); }
  });
  const frame = (now) => {
    requestAnimationFrame(frame);
    const elapsed = (now - previous) / 1000;
    const delta = Math.min(elapsed, 0.05); previous = now;
    if (element('guideDialog').open) { sound.update({ paused: true }); return; }
    metricTime += elapsed; metricFrames++;
    const isPaused = paused();
    let moving = false;
    if (!isPaused) {
      time += delta; cycle.advance(Math.min(elapsed,1));
      let forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
      let sideways = Number(keys.has('d')) - Number(keys.has('a'));
      if (keys.has('arrowleft')) player.yaw += delta * 1.2;
      if (keys.has('arrowright')) player.yaw -= delta * 1.2;
      if (keys.has('r')) player.pitch = Math.min(1.15, player.pitch + delta);
      if (keys.has('f')) player.pitch = Math.max(-1.15, player.pitch - delta);
      const length = Math.hypot(forward, sideways);
      if (length > 0) {
        moving = true; forward /= length; sideways /= length;
        const speed = (flying ? 32 : terrainHeight(player.east, player.north) < 4 ? 4 : keys.has('shift') ? 15 : cameraMode ? 4 : 7) * delta;
        const eastDelta = (-Math.sin(player.yaw) * forward + Math.cos(player.yaw) * sideways) * speed;
        const northDelta = (-Math.cos(player.yaw) * forward - Math.sin(player.yaw) * sideways) * speed;
        const previousEast = player.east, previousNorth = player.north;
        if (flying || world.canMove(player.east + eastDelta, player.north)) player.east += eastDelta;
        if (flying || world.canMove(player.east, player.north + northDelta)) player.north += northDelta;
        distanceTravelled += Math.hypot(player.east - previousEast, player.north - previousNorth);
      }
      if (time - lastSave > 20) { lastSave = time; save(); }
    }
    const day = cycle.day, climate = cycle.sample(player.east,player.north);
    world.update(player.east, player.north, time, { day, ...climate });
    moveCamera();
    const region = NatureWorld.biome(player.east, player.north);
    weather = climate.cloudCover;
    const { daylight, dusk, moonlight = 0 } = atmosphere.update(camera, day, cycle.worldTime, weather, player.east, player.north, cycle.worldDays);
    for (const material of Object.values(world.vegetation.canopies)) material.color.setScalar(0.07 + daylight * 0.93 + dusk * 0.09 + moonlight * 0.16);
    scene.background.copy(atmosphere.horizon); scene.fog.color.copy(atmosphere.horizon); scene.fog.density = climate.fog;
    const solarLight = daylight * (1.65 - weather * 0.9), lunarLight = moonlight * 0.3;
    const moonDominant = lunarLight > solarLight;
    sun.intensity = Math.max(solarLight,lunarLight); hemisphere.intensity = 0.14 + daylight * (0.38 + weather * 0.12) + moonlight * 0.13;
    sun.color.copy(moonDominant ? moonLightColor : duskLightColor).lerp(moonDominant ? moonLightColor : noonLightColor,THREE.MathUtils.smoothstep(daylight,0.03,0.6));
    const ambientDay = THREE.MathUtils.smoothstep(daylight,0,0.25);
    hemisphere.color.copy(nightSkyColor).lerp(daySkyColor,ambientDay); hemisphere.groundColor.copy(nightGroundColor).lerp(dayGroundColor,ambientDay);
    const shadowStep = 170 / 2048;
    sun.target.position.set(Math.round(camera.position.x / shadowStep) * shadowStep, camera.position.y - 1.8, Math.round(camera.position.z / shadowStep) * shadowStep);
    sun.position.copy(sun.target.position).addScaledVector(moonDominant ? atmosphere.moonDirection : atmosphere.sunDirection,260);
    sun.target.updateMatrixWorld();
    if (now - shadowUpdate > 180) { renderer.shadowMap.needsUpdate = true; shadowUpdate = now; }
    world.waterUniforms.horizon.value.copy(atmosphere.horizon); world.waterUniforms.zenith.value.copy(atmosphere.zenith);
    world.waterUniforms.sunDirection.value.copy(atmosphere.sunDirection); world.waterUniforms.daylight.value = daylight;
    world.waterUniforms.moonDirection.value.copy(atmosphere.moonDirection || atmosphere.sunDirection); world.waterUniforms.moonlight.value = moonlight;
    world.waterUniforms.cloudShift.value = player.east*0.0000008; world.waterUniforms.cloudTime.value = cycle.worldTime; world.waterUniforms.cloudCover.value = weather; world.waterUniforms.dusk.value = dusk;
    stars.position.copy(camera.position); stars.material.opacity = Math.max(0, 0.85 - daylight * 3 - dusk * 0.6) * (1-weather*0.94) * (1-moonlight*0.35);
    rain.position.set(camera.position.x, camera.position.y - 5, camera.position.z); rain.visible = climate.rainfall > 0.005; rain.material.opacity = climate.rainfall * 0.44;
    if (rain.visible && !isPaused) {
      const drops = rain.geometry.attributes.position;
      for (let index = 0; index < drops.count; index += 2) {
        let altitude = drops.getY(index)-delta*35, east = drops.getX(index)+delta*climate.wind*4;
        if (altitude < 0) altitude += 70;
        if (east > 55) east -= 110;
        drops.setXY(index,east,altitude); drops.setXY(index+1,east-climate.wind*0.13,altitude+0.75);
      }
      drops.needsUpdate = true;
    }
    sound.update({ paused: isPaused, biome: region.id, altitude: camera.position.y, water: terrainHeight(player.east, player.north) < 12, weather: climate.rainfall, wind: climate.wind, night: climate.night, moving: moving && !flying, running: keys.has('shift'), time });
    targetTime += delta;
    if (targetTime > 0.2) {
      targetTime = 0;
      const heading = ((-player.yaw * 180 / Math.PI) % 360 + 360) % 360;
      element('heading').textContent = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'][Math.round(heading / 45) % 8] + ' ' + Math.round(heading) + '°';
      element('locationName').textContent = region.name;
      element('altitude').textContent = '標高 ' + Math.round(camera.position.y) + 'm · ' + (distanceTravelled / 1000).toFixed(2) + 'km';
      element('worldStatus').textContent = `${climate.label} / ${String(Math.floor(day*24)).padStart(2,'0')}:${String(Math.floor(day*1440)%60).padStart(2,'0')} · ${climate.period}${moonlight > 0.08 ? '・月明かり' : ''}${flying ? ' · 滑空中' : ''}`;
      element('glideButton').textContent = flying ? '徒歩に戻る G' : '滑空する G';
      if (cameraMode) { scene.updateMatrixWorld(true); const subject = aim(); element('targetLabel').textContent = subject ? subject.target.name + '　' + '★'.repeat(subject.stars) + '　' + Math.round(subject.distance) + 'm' : '自由撮影 · 空と光を切り取ろう'; }
    }
    renderer.render(scene, camera);
    if (metricTime > 1) {
      element('renderStatus').textContent = `描画 ${Math.round(metricFrames / metricTime)} FPS · ${renderer.info.render.calls} draw · ${Math.round(renderer.info.render.triangles / 1000)}k triangles`;
      metricTime = 0; metricFrames = 0;
    }
  };
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  requestAnimationFrame(frame);
})();
