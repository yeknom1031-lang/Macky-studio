(() => {
  const dialog = document.getElementById('guideDialog'), select = document.getElementById('guideSpecies');
  const search = document.getElementById('guideSearch'), habitatFilter = document.getElementById('guideFilter');
  for (const region of NatureWorld.biomes) {
    const option = document.createElement('option'); option.value = region.id; option.textContent = region.name; habitatFilter.append(option);
  }
  for (const count of document.querySelectorAll('[data-species-count]')) count.textContent = Wildlife.species.length;
  let renderer, scene, camera, rig, ground, sun, lastTime = 0, motion = 0, rotation = 0.65, dragging = false, lastPointer = 0, viewingDistance = 1, faceMode = false;
  const cameraHome = new THREE.Vector3(), focus = new THREE.Vector3();
  const canvas = document.getElementById('guideCanvas');
  const observationTime = document.getElementById('guideTime'), activityStatus = document.getElementById('guideActivity');
  const faceButton = document.createElement('button'); faceButton.type = 'button'; faceButton.textContent = '顔を近くで見る'; faceButton.style.marginTop = '10px'; canvas.after(faceButton);
  const fur = new THREE.TextureLoader().load('assets/originals/fur.png'); fur.encoding = THREE.sRGBEncoding; fur.wrapS = fur.wrapT = THREE.RepeatWrapping;
  function filterSpecies() {
    const previous = select.value, query = search.value.normalize('NFKC').trim().toLowerCase();
    const matching = Wildlife.species.filter((spec) => (!habitatFilter.value || spec.habitats.includes(habitatFilter.value)) && `${spec.name} ${spec.id} ${spec.scientificName || ''}`.normalize('NFKC').toLowerCase().includes(query));
    select.replaceChildren();
    for (const spec of matching) {
      const option = document.createElement('option'); option.value = spec.id; option.textContent = spec.name; select.append(option);
    }
    if (matching.some((spec) => spec.id === previous)) select.value = previous;
    select.disabled = !matching.length;
    document.getElementById('guidePrev').disabled = matching.length < 2;
    document.getElementById('guideNext').disabled = matching.length < 2;
    faceButton.disabled = !matching.length;
    canvas.hidden = !matching.length;
    document.getElementById('guideResults').textContent = `${matching.length} / ${Wildlife.species.length} 種`;
    if (matching.length) { if (dialog.open) changeSpecies(); }
    else {
      document.getElementById('guideName').textContent = '該当する動物がいません';
      document.getElementById('guideForm').textContent = '検索語や生息地を変えてください。';
      document.getElementById('guideHabitat').textContent = '';
      activityStatus.textContent = '';
    }
  }
  function changeSpecies() {
    if (!select.value) return;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(38, 2, 0.01, 100);
      scene.add(new THREE.HemisphereLight('#f3f6f5', '#7e8172', 0.72));
      sun = new THREE.DirectionalLight('#fff1d9', 1.65); sun.position.set(-3, 5, -4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 3; sun.shadow.bias = -0.00025; scene.add(sun, sun.target);
      const fill = new THREE.DirectionalLight('#d8e5ef', 0.36); fill.position.set(3, 2, 3); scene.add(fill);
      ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.24 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    }
    if (rig) { scene.remove(rig.model); rig.model.traverse((mesh) => { if (mesh.isSkinnedMesh && mesh.skeleton) mesh.skeleton.dispose(); }); }
    const spec = Wildlife.species.find((entry) => entry.id === select.value);
    rig = Wildlife.create(spec, fur); scene.add(rig.model); rotation = 0.65; viewingDistance = 1; motion = 0; faceMode = false; faceButton.textContent = '顔を近くで見る';
    rig.model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(rig.model), size = bounds.getSize(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, size.z) * 1.05;
    const center = bounds.getCenter(new THREE.Vector3());
    rig.model.position.y = -bounds.min.y;
    focus.set(0, size.y * 0.46, center.z * 0.2); cameraHome.set(extent * 1.15, extent * 0.4 + size.y * 0.35, -extent * 1.4); camera.position.copy(cameraHome); camera.lookAt(focus);
    ground.scale.setScalar(extent * 6); ground.position.y = 0;
    sun.position.set(-extent * 1.5, extent * 2, -extent * 1.4); sun.target.position.copy(focus);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -extent * 1.4; sun.shadow.camera.right = sun.shadow.camera.top = extent * 1.4;
    sun.shadow.camera.near = 0.01; sun.shadow.camera.far = extent * 7; sun.shadow.normalBias = extent * 0.0015; sun.shadow.camera.updateProjectionMatrix();
    document.getElementById('guideName').textContent = spec.name;
    document.getElementById('guideHabitat').textContent = 'ゲーム内の生息地：' + spec.habitats.map((habitat) => NatureWorld.biomes.find((region) => region.id === habitat).name).join('・');
    document.getElementById('guideForm').textContent = `${Wildlife.species.indexOf(spec) + 1} / ${Wildlife.species.length} 種 · ${rig.bones.length}個の可動部 · ドラッグで回転・ホイールで拡大${spec.scientificName ? ' · ' + spec.scientificName : ''}`;
  }
  filterSpecies();
  search.addEventListener('input', filterSpecies);
  habitatFilter.addEventListener('change', filterSpecies);
  document.getElementById('guideButton').addEventListener('click', () => { dialog.showModal(); filterSpecies(); });
  select.addEventListener('change', changeSpecies);
  document.getElementById('guidePrev').addEventListener('click', () => { if (select.options.length) { select.selectedIndex = (select.selectedIndex + select.options.length - 1) % select.options.length; changeSpecies(); } });
  document.getElementById('guideNext').addEventListener('click', () => { if (select.options.length) { select.selectedIndex = (select.selectedIndex + 1) % select.options.length; changeSpecies(); } });
  canvas.addEventListener('pointerdown', (event) => { dragging = true; lastPointer = event.clientX; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', (event) => { if (dragging) { rotation += (event.clientX - lastPointer) * 0.012; lastPointer = event.clientX; } });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  faceButton.addEventListener('click', () => { faceMode = !faceMode; viewingDistance = 1; faceButton.textContent = faceMode ? '全身に戻る' : '顔を近くで見る'; });
  canvas.addEventListener('wheel', (event) => { event.preventDefault(); viewingDistance = Math.max(0.5, Math.min(1.6, viewingDistance * Math.exp(event.deltaY * 0.001))); }, { passive: false });
  function frame(timestamp) {
    requestAnimationFrame(frame);
    const delta = Math.min(0.05, (timestamp - lastTime) / 1000); lastTime = timestamp;
    if (!dialog.open || !renderer || !select.value || document.hidden) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) { renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
    motion += delta;
    if (!dragging && !faceMode) rotation += delta * 0.035;
    rig.model.rotation.y = rotation;
    const activity = Wildlife.activity(rig.spec,Number(observationTime.value),0);
    const resting = 1-THREE.MathUtils.smoothstep(activity.level,0.12,0.7);
    rig.restAmount = THREE.MathUtils.lerp(rig.restAmount || 0,resting,1-Math.exp(-delta*2));
    const flight = rig.flying ? THREE.MathUtils.smoothstep(activity.level,0.22,0.72) : 0;
    rig.flightActivity = THREE.MathUtils.lerp(rig.flightActivity === undefined ? flight : rig.flightActivity,flight,1-Math.exp(-delta*2));
    const activityLabel = `${activity.label}（ゲーム内の近似） · ${activity.level > 0.6 ? '活動が活発' : activity.level > 0.3 ? '穏やかに活動' : '休息の時間'}`;
    if (activityStatus.textContent !== activityLabel) activityStatus.textContent = activityLabel;
    Wildlife.animate(rig, motion, document.getElementById('guideMotion').checked && activity.level > 0.3 ? 1 : 0, 0);
    if (faceMode) {
      rig.model.updateMatrixWorld(true);
      const face = rig.bones[rig.template.head].localToWorld(new THREE.Vector3(0, rig.spec.head * 0.12, -rig.spec.head * 0.65));
      const distance = rig.spec.head * rig.spec.scale * 3.8 * viewingDistance;
      camera.position.copy(face).add(new THREE.Vector3(distance * 0.76, distance * 0.17, -distance)); camera.lookAt(face);
    } else {
      camera.position.copy(cameraHome).sub(focus).multiplyScalar(viewingDistance).add(focus); camera.lookAt(focus);
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
