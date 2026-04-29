/**
 * @typedef {Object} BlockDefinition
 * @property {string} id
 * @property {string} kind
 * @property {string} label
 * @property {[number, number, number]} size
 * @property {number} mass
 * @property {string} color
 * @property {number} friction
 * @property {number} restitution
 * @property {number} weight
 */

/**
 * @typedef {Object} GameState
 * @property {"START"|"PLAYING"|"TOPPLE_CHECK"|"GAMEOVER"} phase
 * @property {number} scoreHeight
 * @property {number} placedCount
 * @property {number} bestHeight
 * @property {string|null} activeBlockId
 */

/**
 * @typedef {Object} ToppleMetrics
 * @property {number} tiltDeg
 * @property {number} avgVelocity
 * @property {number} unstableDuration
 */

const STORAGE_KEY = "tsumiki-tower-3d-best-height";
const PHASE = Object.freeze({
  START: "START",
  PLAYING: "PLAYING",
  TOPPLE_CHECK: "TOPPLE_CHECK",
  GAMEOVER: "GAMEOVER"
});

/** @type {BlockDefinition[]} */
const BLOCK_DEFS = [
  {
    id: "cube",
    kind: "cube",
    label: "キューブ",
    size: [1.5, 1.5, 1.5],
    mass: 1.4,
    color: "#ea6048",
    friction: 0.62,
    restitution: 0.08,
    weight: 34
  },
  {
    id: "cuboid",
    kind: "cuboid",
    label: "長方形",
    size: [2.2, 1.2, 1.4],
    mass: 1.6,
    color: "#f2a45d",
    friction: 0.57,
    restitution: 0.06,
    weight: 28
  },
  {
    id: "plank",
    kind: "plank",
    label: "ロング",
    size: [3.4, 0.85, 1.1],
    mass: 1.9,
    color: "#2e8acb",
    friction: 0.54,
    restitution: 0.03,
    weight: 24
  },
  {
    id: "lshape",
    kind: "lshape",
    label: "L字",
    size: [2.6, 1.2, 2.6],
    mass: 1.95,
    color: "#47b56a",
    friction: 0.58,
    restitution: 0.05,
    weight: 14
  }
];

const canvas = document.getElementById("game-canvas");
const hudHeightEl = document.getElementById("hud-height");
const hudBlocksEl = document.getElementById("hud-blocks");
const hudStableEl = document.getElementById("hud-stable");
const hudBestEl = document.getElementById("hud-best");
const nextBlockEl = document.getElementById("next-block");
const nextLabelEl = document.getElementById("next-label");
const startScreen = document.getElementById("start-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const finalHeightEl = document.getElementById("final-height");
const finalBlocksEl = document.getElementById("final-blocks");
const bestStatusEl = document.getElementById("best-status");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const rotateLeftButton = document.getElementById("rotate-left");
const rotateRightButton = document.getElementById("rotate-right");
const dropButton = document.getElementById("drop-button");

/** @type {GameState} */
const gameState = {
  phase: PHASE.START,
  scoreHeight: 0,
  placedCount: 0,
  bestHeight: loadBestHeight(),
  activeBlockId: null
};

/** @type {ToppleMetrics} */
const toppleMetrics = {
  tiltDeg: 0,
  avgVelocity: 0,
  unstableDuration: 0
};

const playBounds = { x: 8.5, z: 8.5 };

let scene;
let camera;
let renderer;
let world;
let floorBody;
let floorMaterial;
let clock;
let elapsedTime = 0;
let stableSeconds = 0;
let settleTimer = 0;
let pendingPlacement = false;
let nextBlockDef = null;
let activeBlock = null;
let previewScene;
let previewCamera;
let previewRenderer;
let previewMesh = null;
let raycaster;
let pointerNdc;
let dragPlane;
let planeHit;
let tempBox;
let tempVec3;
let guideLineGeometry;

/** @type {Array<{definition: BlockDefinition, body: CANNON.Body, mesh: THREE.Object3D}>} */
let settledBlocks = [];

const blockPhysMaterials = new Map();
const pointerState = {
  dragging: false,
  pointerType: "mouse",
  moved: false
};

safeBoot();

function safeBoot() {
  if (!window.THREE || !window.CANNON) {
    showBootError("ゲームライブラリの読み込みに失敗しました。ネット接続を確認してページを再読み込みしてください。");
    return;
  }
  try {
    init();
    animate();
  } catch (error) {
    console.error("[TSUMIKI-TOWER-3D] boot failed:", error);
    showBootError("初期化に失敗しました。ページを再読み込みしてもう一度お試しください。");
  }
}

function showBootError(message) {
  startScreen.classList.add("active");
  const card = startScreen.querySelector(".overlay-card");
  if (!card) {
    return;
  }

  let errorNode = card.querySelector("#boot-error-message");
  if (!errorNode) {
    errorNode = document.createElement("p");
    errorNode.id = "boot-error-message";
    errorNode.style.color = "#b3392f";
    errorNode.style.fontWeight = "700";
    card.appendChild(errorNode);
  }
  errorNode.textContent = message;
}

function init() {
  setupSharedMath();
  setupThree();
  setupPhysics();
  createFloor();
  setupUI();
  setupInputs();
  refreshHud();
}

function setupSharedMath() {
  raycaster = new THREE.Raycaster();
  pointerNdc = new THREE.Vector2();
  dragPlane = new THREE.Plane();
  planeHit = new THREE.Vector3();
  tempBox = new THREE.Box3();
  tempVec3 = new THREE.Vector3();
  guideLineGeometry = new THREE.BufferGeometry();
  guideLineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(6).fill(0), 3));
}

function setupThree() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#edf2f7");
  scene.fog = new THREE.Fog("#edf2f7", 24, 60);

  camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 140);
  camera.position.set(13, 14, 13);
  camera.lookAt(0, 2, 0);

  const hemisphereLight = new THREE.HemisphereLight("#fff2de", "#b7d2eb", 0.9);
  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight("#ffffff", 1.1);
  directionalLight.position.set(12, 22, 8);
  directionalLight.castShadow = false;
  scene.add(directionalLight);

  clock = new THREE.Clock();

  previewScene = new THREE.Scene();
  previewScene.background = null;

  previewCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  previewCamera.position.set(4.8, 3.2, 5.2);
  previewCamera.lookAt(0, 0, 0);

  const previewLightA = new THREE.HemisphereLight("#ffffff", "#98acc7", 0.85);
  const previewLightB = new THREE.DirectionalLight("#ffffff", 0.8);
  previewLightB.position.set(4, 8, 3);
  previewScene.add(previewLightA, previewLightB);

  previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  nextBlockEl.appendChild(previewRenderer.domElement);
  resizePreviewRenderer();
}

function setupPhysics() {
  world = new CANNON.World();
  if (world.gravity && typeof world.gravity.set === "function") {
    world.gravity.set(0, -16, 0);
  } else {
    world.gravity = new CANNON.Vec3(0, -16, 0);
  }
  if (typeof CANNON.SAPBroadphase === "function") {
    world.broadphase = new CANNON.SAPBroadphase(world);
  } else {
    world.broadphase = new CANNON.NaiveBroadphase();
  }
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.56;
  world.defaultContactMaterial.restitution = 0.04;

  floorMaterial = new CANNON.Material("floor");
  BLOCK_DEFS.forEach((def) => {
    const mat = new CANNON.Material(def.id);
    blockPhysMaterials.set(def.id, mat);
    world.addContactMaterial(
      new CANNON.ContactMaterial(mat, floorMaterial, {
        friction: def.friction,
        restitution: def.restitution
      })
    );
  });
}

function createFloor() {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 16, 1.6, 44),
    new THREE.MeshStandardMaterial({ color: "#dde5ee", roughness: 0.9, metalness: 0.05 })
  );
  base.position.set(0, -0.8, 0);
  scene.add(base);

  const platform = new THREE.Mesh(
    new THREE.CircleGeometry(11, 52),
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.68, metalness: 0.08 })
  );
  platform.rotation.x = -Math.PI * 0.5;
  platform.position.y = 0.01;
  scene.add(platform);

  const grid = new THREE.GridHelper(18, 20, "#b2c1cf", "#d2dbe4");
  grid.position.y = 0.02;
  scene.add(grid);

  floorBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    material: floorMaterial,
    shape: new CANNON.Plane()
  });
  floorBody.quaternion.setFromEuler(-Math.PI * 0.5, 0, 0);
  world.addBody(floorBody);
}

function setupUI() {
  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
  rotateLeftButton.addEventListener("click", () => rotateActive(-Math.PI / 12));
  rotateRightButton.addEventListener("click", () => rotateActive(Math.PI / 12));
  dropButton.addEventListener("click", () => {
    if (gameState.phase === PHASE.PLAYING) {
      dropActiveBlock();
    }
  });
}

function setupInputs() {
  window.addEventListener("resize", onResize);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("keydown", (event) => {
    if (gameState.phase !== PHASE.PLAYING || !activeBlock) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "q") {
      rotateActive(-Math.PI / 12);
    } else if (key === "e") {
      rotateActive(Math.PI / 12);
    } else if (key === " " || key === "enter") {
      event.preventDefault();
      dropActiveBlock();
    }
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizePreviewRenderer();
}

function resizePreviewRenderer() {
  const rect = nextBlockEl.getBoundingClientRect();
  const width = Math.max(40, Math.floor(rect.width));
  const height = Math.max(40, Math.floor(rect.height));
  previewCamera.aspect = width / height;
  previewCamera.updateProjectionMatrix();
  previewRenderer.setSize(width, height, false);
}

function startGame() {
  clearSettledBlocks();
  clearActiveBlock();
  stableSeconds = 0;
  settleTimer = 0;
  pendingPlacement = false;
  elapsedTime = 0;
  toppleMetrics.tiltDeg = 0;
  toppleMetrics.avgVelocity = 0;
  toppleMetrics.unstableDuration = 0;

  gameState.phase = PHASE.PLAYING;
  gameState.scoreHeight = 0;
  gameState.placedCount = 0;
  gameState.activeBlockId = null;

  nextBlockDef = pickWeightedBlock();
  spawnActiveFromQueue();

  startScreen.classList.remove("active");
  gameoverScreen.classList.remove("active");
  refreshHud();
}

function clearSettledBlocks() {
  settledBlocks.forEach((entry) => {
    world.removeBody(entry.body);
    scene.remove(entry.mesh);
    disposeObject3D(entry.mesh);
  });
  settledBlocks = [];
}

function clearActiveBlock() {
  if (!activeBlock) {
    return;
  }
  scene.remove(activeBlock.mesh, activeBlock.ghost, activeBlock.guideLine);
  disposeObject3D(activeBlock.mesh);
  disposeObject3D(activeBlock.ghost);
  activeBlock.guideLine.geometry.dispose();
  activeBlock.guideLine.material.dispose();
  activeBlock = null;
  gameState.activeBlockId = null;
}

function disposeObject3D(object3d) {
  object3d.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

function pickWeightedBlock() {
  const totalWeight = BLOCK_DEFS.reduce((sum, def) => sum + def.weight, 0);
  let pick = Math.random() * totalWeight;
  for (const def of BLOCK_DEFS) {
    pick -= def.weight;
    if (pick <= 0) {
      return def;
    }
  }
  return BLOCK_DEFS[0];
}

function getBlockParts(definition) {
  if (definition.kind !== "lshape") {
    return [{ size: definition.size, offset: [0, 0, 0] }];
  }

  const [w, h, d] = definition.size;
  const thickness = Math.min(w, d) * 0.42;

  return [
    { size: [w, h, thickness], offset: [0, 0, (d - thickness) * 0.5] },
    { size: [thickness, h, d], offset: [(w - thickness) * 0.5, 0, 0] }
  ];
}

function createBlockMesh(definition, { transparent = false, opacity = 1 } = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: definition.color,
    roughness: 0.58,
    metalness: 0.08,
    transparent,
    opacity
  });

  const holder = new THREE.Group();
  getBlockParts(definition).forEach((part) => {
    const geometry = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(part.offset[0], part.offset[1], part.offset[2]);
    holder.add(mesh);
  });
  return holder;
}

function createDropGuideLine() {
  const geometry = guideLineGeometry.clone();
  const material = new THREE.LineDashedMaterial({
    color: "#4d647a",
    dashSize: 0.22,
    gapSize: 0.16,
    linewidth: 1
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

function spawnActiveFromQueue() {
  const definition = nextBlockDef || pickWeightedBlock();
  nextBlockDef = pickWeightedBlock();

  const spawnY = Math.max(7, gameState.scoreHeight + 6.8);
  const mesh = createBlockMesh(definition);
  mesh.position.set(0, spawnY, 0);
  scene.add(mesh);

  const ghost = createBlockMesh(definition, { transparent: true, opacity: 0.26 });
  scene.add(ghost);

  const guideLine = createDropGuideLine();
  scene.add(guideLine);

  activeBlock = {
    definition,
    mesh,
    ghost,
    guideLine,
    position: new THREE.Vector3(0, spawnY, 0),
    rotationY: 0,
    halfHeight: definition.size[1] * 0.5
  };
  gameState.activeBlockId = definition.id;

  updateActiveTransforms();
  updateNextPreview();
  refreshHud();
}

function updateNextPreview() {
  if (previewMesh) {
    previewScene.remove(previewMesh);
    disposeObject3D(previewMesh);
    previewMesh = null;
  }

  if (!nextBlockDef) {
    nextLabelEl.textContent = "-";
    return;
  }

  previewMesh = createBlockMesh(nextBlockDef);
  const [sx, sy, sz] = nextBlockDef.size;
  const longest = Math.max(sx, sy, sz);
  const scale = longest > 2.8 ? 2.4 / longest : 1;
  previewMesh.scale.setScalar(scale);
  previewScene.add(previewMesh);
  nextLabelEl.textContent = nextBlockDef.label;
}

function onPointerDown(event) {
  if (gameState.phase !== PHASE.PLAYING || !activeBlock) {
    return;
  }
  pointerState.dragging = true;
  pointerState.pointerType = event.pointerType || "mouse";
  pointerState.moved = false;
  updateActivePositionFromPointer(event.clientX, event.clientY);
}

function onPointerMove(event) {
  if (!pointerState.dragging || gameState.phase !== PHASE.PLAYING || !activeBlock) {
    return;
  }
  pointerState.moved = true;
  updateActivePositionFromPointer(event.clientX, event.clientY);
}

function onPointerUp() {
  if (!pointerState.dragging) {
    return;
  }
  const type = pointerState.pointerType;
  pointerState.dragging = false;

  if (gameState.phase !== PHASE.PLAYING || !activeBlock) {
    return;
  }

  if (type === "mouse" || type === "pen") {
    dropActiveBlock();
  }
}

function updateActivePositionFromPointer(clientX, clientY) {
  if (!activeBlock) {
    return;
  }

  pointerNdc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  dragPlane.set(new THREE.Vector3(0, 1, 0), -activeBlock.position.y);
  raycaster.setFromCamera(pointerNdc, camera);
  if (!raycaster.ray.intersectPlane(dragPlane, planeHit)) {
    return;
  }

  activeBlock.position.x = clamp(planeHit.x, -playBounds.x, playBounds.x);
  activeBlock.position.z = clamp(planeHit.z, -playBounds.z, playBounds.z);
  updateActiveTransforms();
}

function rotateActive(radians) {
  if (gameState.phase !== PHASE.PLAYING || !activeBlock) {
    return;
  }
  activeBlock.rotationY += radians;
  updateActiveTransforms();
}

function updateActiveTransforms() {
  if (!activeBlock) {
    return;
  }

  activeBlock.mesh.position.copy(activeBlock.position);
  activeBlock.mesh.rotation.set(0, activeBlock.rotationY, 0);

  const predictedY = predictLandingY(activeBlock);
  activeBlock.ghost.position.set(activeBlock.position.x, predictedY, activeBlock.position.z);
  activeBlock.ghost.rotation.set(0, activeBlock.rotationY, 0);

  const linePoints = activeBlock.guideLine.geometry.attributes.position.array;
  linePoints[0] = activeBlock.position.x;
  linePoints[1] = activeBlock.position.y - activeBlock.halfHeight * 0.2;
  linePoints[2] = activeBlock.position.z;
  linePoints[3] = activeBlock.position.x;
  linePoints[4] = predictedY + activeBlock.halfHeight * 0.2;
  linePoints[5] = activeBlock.position.z;
  activeBlock.guideLine.geometry.attributes.position.needsUpdate = true;
  activeBlock.guideLine.computeLineDistances();
}

function predictLandingY(block) {
  if (typeof world.raycastClosest !== "function") {
    return block.halfHeight + 0.02;
  }
  const from = new CANNON.Vec3(block.position.x, 60, block.position.z);
  const to = new CANNON.Vec3(block.position.x, -25, block.position.z);
  const result = new CANNON.RaycastResult();
  const didHit = world.raycastClosest(from, to, { skipBackfaces: true }, result);

  if (didHit && result.hasHit) {
    return result.hitPointWorld.y + block.halfHeight + 0.02;
  }
  return block.halfHeight + 0.02;
}

function dropActiveBlock() {
  if (!activeBlock || gameState.phase !== PHASE.PLAYING) {
    return;
  }

  const droppedDefinition = activeBlock.definition;
  const droppedPosition = activeBlock.position.clone();
  const droppedRotation = activeBlock.rotationY;

  clearActiveBlock();

  const mesh = createBlockMesh(droppedDefinition);
  mesh.position.copy(droppedPosition);
  mesh.rotation.set(0, droppedRotation, 0);
  scene.add(mesh);

  const body = createBlockBody(droppedDefinition, droppedPosition, droppedRotation);
  settledBlocks.push({ definition: droppedDefinition, mesh, body });

  pendingPlacement = true;
  settleTimer = 0;
  toppleMetrics.unstableDuration = 0;
  gameState.phase = PHASE.TOPPLE_CHECK;
  refreshHud();
}

function createBlockBody(definition, position, rotationY) {
  const body = new CANNON.Body({
    mass: definition.mass,
    position: new CANNON.Vec3(position.x, position.y, position.z),
    material: blockPhysMaterials.get(definition.id)
  });

  getBlockParts(definition).forEach((part) => {
    const halfExtents = new CANNON.Vec3(part.size[0] * 0.5, part.size[1] * 0.5, part.size[2] * 0.5);
    body.addShape(new CANNON.Box(halfExtents), new CANNON.Vec3(part.offset[0], part.offset[1], part.offset[2]));
  });

  body.quaternion.setFromEuler(0, rotationY, 0);
  body.linearDamping = 0.18;
  body.angularDamping = 0.22;
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.09;
  body.sleepTimeLimit = 0.9;

  world.addBody(body);
  return body;
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(0.033, clock.getDelta());
  elapsedTime += delta;

  if (gameState.phase !== PHASE.START && gameState.phase !== PHASE.GAMEOVER) {
    world.step(1 / 60, delta, 4);
    syncSettledMeshes();
    updateTopHeight();
    updateToppleState(delta);
    updateStableClock(delta);
    updateCamera(delta);
  }

  if (activeBlock) {
    updateActiveTransforms();
  }

  if (previewMesh) {
    previewMesh.rotation.y += delta * 0.9;
    previewMesh.rotation.x = Math.sin(elapsedTime * 0.9) * 0.08;
  }

  refreshHud();
  renderer.render(scene, camera);
  previewRenderer.render(previewScene, previewCamera);
}

function syncSettledMeshes() {
  settledBlocks.forEach((entry) => {
    entry.mesh.position.copy(entry.body.position);
    entry.mesh.quaternion.copy(entry.body.quaternion);
  });
}

function updateTopHeight() {
  let currentMax = 0;
  settledBlocks.forEach((entry) => {
    tempBox.setFromObject(entry.mesh);
    if (tempBox.max.y > currentMax) {
      currentMax = tempBox.max.y;
    }
  });
  gameState.scoreHeight = Math.max(gameState.scoreHeight, currentMax);
}

function updateToppleState(delta) {
  if (settledBlocks.length === 0) {
    toppleMetrics.tiltDeg = 0;
    toppleMetrics.avgVelocity = 0;
    toppleMetrics.unstableDuration = 0;
    return;
  }

  const metrics = computeToppleMetrics();
  toppleMetrics.tiltDeg = metrics.tiltDeg;
  toppleMetrics.avgVelocity = metrics.avgVelocity;
  const unstableNow = metrics.tiltDeg > 28 || metrics.avgVelocity > 2.6 || metrics.lowestY < -4.8;

  if (gameState.phase === PHASE.TOPPLE_CHECK) {
    settleTimer += delta;
    if (settleTimer > 0.4) {
      if (unstableNow) {
        toppleMetrics.unstableDuration += delta;
      } else {
        toppleMetrics.unstableDuration = Math.max(0, toppleMetrics.unstableDuration - delta * 0.9);
      }
    }

    if (toppleMetrics.unstableDuration > 1.2 || metrics.lowestY < -5.5) {
      endGame();
      return;
    }

    const settled =
      settleTimer > 0.68 &&
      metrics.avgVelocity < 0.17 &&
      metrics.maxVelocity < 0.35 &&
      metrics.tiltDeg < 19;

    if (settled) {
      if (pendingPlacement) {
        gameState.placedCount += 1;
      }
      pendingPlacement = false;
      toppleMetrics.unstableDuration = 0;
      gameState.phase = PHASE.PLAYING;
      spawnActiveFromQueue();
    }
    return;
  }

  if (gameState.phase === PHASE.PLAYING) {
    if (unstableNow && (metrics.avgVelocity > 3.6 || metrics.tiltDeg > 44)) {
      toppleMetrics.unstableDuration += delta;
    } else {
      toppleMetrics.unstableDuration = Math.max(0, toppleMetrics.unstableDuration - delta * 1.1);
    }
    if (toppleMetrics.unstableDuration > 1.2 || metrics.lowestY < -5.5) {
      endGame();
    }
  }
}

function computeToppleMetrics() {
  let minY = Infinity;
  let maxY = -Infinity;
  let velocitySum = 0;
  let maxVelocity = 0;

  settledBlocks.forEach((entry) => {
    const posY = entry.body.position.y;
    minY = Math.min(minY, posY);
    maxY = Math.max(maxY, posY);
    const speed = getVecLength(entry.body.velocity);
    velocitySum += speed;
    maxVelocity = Math.max(maxVelocity, speed);
  });

  const avgVelocity = velocitySum / Math.max(1, settledBlocks.length);
  const band = Math.max(0.7, Math.min(1.5, (maxY - minY) * 0.2 + 0.45));
  const baseThreshold = minY + band;
  const topThreshold = maxY - band;

  const baseEntries = settledBlocks.filter((entry) => entry.body.position.y <= baseThreshold);
  const topEntries = settledBlocks.filter((entry) => entry.body.position.y >= topThreshold);
  const baseCenter = averagePoint(baseEntries.length > 0 ? baseEntries : settledBlocks);
  const topCenter = averagePoint(topEntries.length > 0 ? topEntries : settledBlocks);

  tempVec3.copy(topCenter).sub(baseCenter);
  const horizontal = Math.hypot(tempVec3.x, tempVec3.z);
  const vertical = Math.max(0.01, tempVec3.y);
  const tiltDeg = THREE.MathUtils.radToDeg(Math.atan2(horizontal, vertical));

  return {
    tiltDeg,
    avgVelocity,
    maxVelocity,
    lowestY: minY
  };
}

function averagePoint(entries) {
  if (entries.length === 0) {
    return new THREE.Vector3(0, 0, 0);
  }
  const point = new THREE.Vector3(0, 0, 0);
  entries.forEach((entry) => {
    point.x += entry.body.position.x;
    point.y += entry.body.position.y;
    point.z += entry.body.position.z;
  });
  point.multiplyScalar(1 / entries.length);
  return point;
}

function updateStableClock(delta) {
  if (settledBlocks.length === 0) {
    stableSeconds = 0;
    return;
  }
  const unstableNow = toppleMetrics.tiltDeg > 28 || toppleMetrics.avgVelocity > 2.6;
  if (gameState.phase !== PHASE.GAMEOVER && !unstableNow) {
    stableSeconds += delta;
  } else if (unstableNow) {
    stableSeconds = 0;
  }
}

function updateCamera(delta) {
  const targetTowerHeight = Math.max(2, gameState.scoreHeight * 0.92 + 2);
  const distance = 13 + gameState.scoreHeight * 0.45;
  const desired = new THREE.Vector3(distance * 0.7, targetTowerHeight + 9, distance);
  camera.position.lerp(desired, Math.min(1, delta * 1.8));
  camera.lookAt(0, targetTowerHeight * 0.5, 0);
}

function refreshHud() {
  hudHeightEl.textContent = gameState.scoreHeight.toFixed(2);
  hudBlocksEl.textContent = `${gameState.placedCount}`;
  hudStableEl.textContent = stableSeconds.toFixed(1);
  hudBestEl.textContent = gameState.bestHeight.toFixed(2);
}

function endGame() {
  clearActiveBlock();
  gameState.phase = PHASE.GAMEOVER;

  const oldBest = gameState.bestHeight;
  if (gameState.scoreHeight > gameState.bestHeight) {
    gameState.bestHeight = gameState.scoreHeight;
    saveBestHeight(gameState.bestHeight);
  }

  finalHeightEl.textContent = gameState.scoreHeight.toFixed(2);
  finalBlocksEl.textContent = `${gameState.placedCount}`;
  bestStatusEl.textContent =
    gameState.bestHeight > oldBest
      ? "ハイスコア更新!"
      : `ハイスコア: ${gameState.bestHeight.toFixed(2)}m`;
  gameoverScreen.classList.add("active");
}

function loadBestHeight() {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY) || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (error) {
    console.warn("[TSUMIKI-TOWER-3D] localStorage unavailable:", error);
    return 0;
  }
}

function saveBestHeight(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value.toFixed(3));
  } catch (error) {
    console.warn("[TSUMIKI-TOWER-3D] failed to save best score:", error);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getVecLength(vec) {
  if (!vec) {
    return 0;
  }
  if (typeof vec.length === "function") {
    return vec.length();
  }
  if (typeof vec.norm === "function") {
    return vec.norm();
  }
  return Math.hypot(vec.x || 0, vec.y || 0, vec.z || 0);
}
