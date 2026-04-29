// NOVA64 INSTANCING SHOWCASE
// Demonstrates GPU instancing, LOD, and PBR/normal-map features
// added in the Phase 2/4 performance and feature updates.
//
// Controls:
//   WASD / Arrow keys  — move camera
//   Q / E             — zoom out / in
//   1 / 2 / 3         — switch showcase scene
//   F                 — toggle wireframe HUD overlay

// ── State ───────────────────────────────────────────────────────────────────
const { drawRoundedRect, poly, print, printCentered, rgba8 } = nova64.draw;
const {
  clearScene,
  createInstancedMesh,
  createLODMesh,
  createPlane,
  finalizeInstances,
  setInstanceColor,
  setInstanceTransform,
  updateLODs,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { createPointLight, setAmbientLight, setDirectionalLight, setFog, setPointLightPosition } =
  nova64.light;
const { F, enableBloom, enableVignette } = nova64.fx;
const { key, keyp } = nova64.input;
const { pulse } = nova64.util;

let scene = 1;
let prevScene = 0;
let time = 0;
let showHUD = true;

// Instanced mesh handles (crystalId/dustId checked in update)
let crystalId = null;
let dustId = null;
let crystalLightId = null;

// Camera orbit
let camAngle = 0;
let camRadius = 30;
let camHeight = 12;

// ── Init ─────────────────────────────────────────────────────────────────────
export async function init() {
  setCameraFOV(60);
  setAmbientLight(0x223344, 0.4);
  setDirectionalLight([-1, -2, -1], 0xffffff, 1.2);
  setFog(0x0a0a1a, 30, 120);
  enableBloom(0.8, 0.3, 0.5);
  enableVignette(1.0, 0.85);

  await loadScene(scene);
}

// ── Scene loader ─────────────────────────────────────────────────────────────
async function loadScene(id) {
  clearScene();
  crystalId = dustId = crystalLightId = null;

  // Ground plane — shared across scenes
  createPlane(200, 200, 0x1a2a1a, [0, 0, 0]);

  if (id === 1) await buildForestScene();
  else if (id === 2) await buildCrystalScene();
  else if (id === 3) await buildLODScene();
}

// ── Scene 1: Forest — 500 instanced trees ────────────────────────────────
async function buildForestScene() {
  setFog(0x0a1a08, 35, 130);
  setAmbientLight(0x204020, 0.5);

  // Trunks: 500 instanced cylinders
  const trunkId = createInstancedMesh('cylinder', 500, 0x4a2e10, {
    size: 0.25,
    height: 3,
    roughness: 1,
    metalness: 0,
  });

  // Canopies: 500 instanced spheres, per-instance colour
  const canopyId = createInstancedMesh('sphere', 500, 0x226622, {
    size: 0.9,
    segments: 5,
    roughness: 0.9,
    metalness: 0,
  });

  const RANGE = 40;
  for (let i = 0; i < 500; i++) {
    const x = (Math.random() - 0.5) * RANGE;
    const z = (Math.random() - 0.5) * RANGE;
    const h = 2 + Math.random() * 3;

    setInstanceTransform(trunkId, i, x, h * 0.5, z, 0, 0, 0, 1, h, 1);
    setInstanceTransform(
      canopyId,
      i,
      x,
      h + 1.2,
      z,
      0,
      0,
      0,
      1 + Math.random() * 0.5,
      1 + Math.random() * 0.3,
      1 + Math.random() * 0.5
    );

    // Vary canopy green shade
    const g = 0x33 + Math.floor(Math.random() * 0x55);
    setInstanceColor(canopyId, i, (0x10 << 16) | (g << 8) | 0x10);
  }

  finalizeInstances(trunkId);
  finalizeInstances(canopyId);

  // Floating dust particles (animated in update)
  dustId = createInstancedMesh('sphere', 200, 0xaaffaa, {
    size: 0.05,
    segments: 3,
    emissive: 0x224422,
    emissiveIntensity: 0.8,
  });
  for (let i = 0; i < 200; i++) {
    setInstanceTransform(
      dustId,
      i,
      (Math.random() - 0.5) * 35,
      0.5 + Math.random() * 8,
      (Math.random() - 0.5) * 35
    );
  }
  finalizeInstances(dustId);
}

// ── Scene 2: Crystal Field — instanced prisms with per-instance colour ─────
async function buildCrystalScene() {
  setFog(0x0a0020, 30, 100);
  setAmbientLight(0x100030, 0.3);
  crystalLightId = createPointLight(0x6644ff, 4, 20, 0, 8, 0);
  createPointLight(0xff44aa, 3, 20, 10, 5, -10);

  const CRYSTAL_COUNT = 300;
  crystalId = createInstancedMesh('cone', CRYSTAL_COUNT, 0x8855ff, {
    size: 0.6,
    height: 3,
    roughness: 0.1,
    metalness: 0.8,
    emissive: 0x220044,
    emissiveIntensity: 0.5,
  });

  const hues = [0x8855ff, 0xff44cc, 0x44aaff, 0xffaa00, 0x44ffaa];
  for (let i = 0; i < CRYSTAL_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 22;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const h = 0.8 + Math.random() * 3.5;
    const tiltX = (Math.random() - 0.5) * 0.4;
    const tiltZ = (Math.random() - 0.5) * 0.4;

    setInstanceTransform(
      crystalId,
      i,
      x,
      h * 0.5,
      z,
      tiltX,
      0,
      tiltZ,
      0.5 + Math.random() * 0.8,
      h,
      0.5 + Math.random() * 0.8
    );
    setInstanceColor(crystalId, i, hues[i % hues.length]);
  }
  finalizeInstances(crystalId);
}

// ── Scene 3: LOD Rock Field ──────────────────────────────────────────────────
async function buildLODScene() {
  setFog(0x1a1208, 40, 120);
  setAmbientLight(0x302010, 0.6);
  setDirectionalLight([-1, -2, 0.5], 0xffd090, 1.4);

  // One LOD rock model: high-poly close, low-poly far
  createLODMesh(
    [
      {
        shape: 'sphere',
        size: 2,
        color: 0x887766,
        distance: 0,
        options: { segments: 8, roughness: 1, metalness: 0 },
      },
      {
        shape: 'sphere',
        size: 2,
        color: 0x887766,
        distance: 15,
        options: { segments: 5, roughness: 1, metalness: 0 },
      },
      {
        shape: 'cube',
        size: 2,
        color: 0x776655,
        distance: 35,
        options: { roughness: 1, metalness: 0 },
      },
    ],
    [0, 1, 0]
  );

  // Scatter 80 individual rocks using instancing
  const ROCK_COUNT = 80;
  const rocksId = createInstancedMesh('sphere', ROCK_COUNT, 0x887766, {
    size: 1,
    segments: 5,
    roughness: 1,
    metalness: 0,
  });

  const RANGE = 45;
  for (let i = 0; i < ROCK_COUNT; i++) {
    const x = (Math.random() - 0.5) * RANGE;
    const z = (Math.random() - 0.5) * RANGE;
    const s = 0.4 + Math.random() * 1.8;
    setInstanceTransform(rocksId, i, x, s * 0.5, z, 0, Math.random() * Math.PI, 0, s, s * 0.7, s);
    const shade = 0x66 + Math.floor(Math.random() * 0x44);
    setInstanceColor(rocksId, i, (shade << 16) | ((shade - 0x10) << 8) | (shade - 0x20));
  }
  finalizeInstances(rocksId);
}

// ── Update ───────────────────────────────────────────────────────────────────
export function update(dt) {
  time += dt;

  // Switch scene on 1/2/3
  if (keyp('Digit1') && scene !== 1) {
    scene = 1;
    prevScene = 0;
  }
  if (keyp('Digit2') && scene !== 2) {
    scene = 2;
    prevScene = 0;
  }
  if (keyp('Digit3') && scene !== 3) {
    scene = 3;
    prevScene = 0;
  }
  if (keyp('KeyF')) showHUD = !showHUD;

  if (scene !== prevScene) {
    loadScene(scene);
    prevScene = scene;
  }

  // Camera orbit
  if (key('KeyA') || key('ArrowLeft')) camAngle -= dt * 0.8;
  if (key('KeyD') || key('ArrowRight')) camAngle += dt * 0.8;
  if (key('KeyW') || key('ArrowUp')) camHeight = Math.min(40, camHeight + dt * 6);
  if (key('KeyS') || key('ArrowDown')) camHeight = Math.max(3, camHeight - dt * 6);
  if (key('KeyQ')) camRadius = Math.min(55, camRadius + dt * 8);
  if (key('KeyE')) camRadius = Math.max(8, camRadius - dt * 8);

  const cx = Math.cos(camAngle) * camRadius;
  const cz = Math.sin(camAngle) * camRadius;
  setCameraPosition(cx, camHeight, cz);
  setCameraTarget(0, 3, 0);

  // Animate dust in forest scene
  if (scene === 1 && dustId !== null) {
    for (let i = 0; i < 200; i++) {
      const offset = i * 1.37;
      const x = Math.sin(time * 0.3 + offset) * 17;
      const y = 0.5 + ((time * 0.2 + offset * 0.5) % 8);
      const z = Math.cos(time * 0.2 + offset * 0.7) * 17;
      setInstanceTransform(dustId, i, x, y, z);
    }
    finalizeInstances(dustId);
  }

  // Animate crystals — subtle pulse
  if (scene === 2 && crystalId !== null && crystalLightId !== null) {
    // Update point light position to orbit
    setPointLightPosition(
      crystalLightId,
      Math.cos(time * 0.5) * 8,
      6 + Math.sin(time * 0.7) * 2,
      Math.sin(time * 0.5) * 8
    );
  }

  // Update LOD (required each frame)
  updateLODs();
}

// ── Draw ─────────────────────────────────────────────────────────────────────
export function draw() {
  if (!showHUD) return;

  const sceneNames = [
    '',
    'FOREST (500 instanced trees)',
    'CRYSTAL FIELD (300 instanced prisms)',
    'LOD ROCKS (80 instanced + 1 LOD)',
  ];
  const BLUE = rgba8(40, 80, 180, 200);
  const WHITE = rgba8(255, 255, 255, 255);
  const YELLOW = rgba8(255, 220, 50, 255);
  const DIM = rgba8(180, 180, 180, 200);

  // Title bar
  drawRoundedRect(0, 0, 320, 18, 0, rgba8(0, 0, 0, 160));
  printCentered('NOVA64 — INSTANCING SHOWCASE', 160, 4, WHITE);

  // Scene name
  drawRoundedRect(0, 210, 320, 30, 0, rgba8(0, 0, 0, 140));
  printCentered(sceneNames[scene] ?? '', 160, 217, YELLOW);
  printCentered('1=Forest  2=Crystals  3=LOD  F=HUD  WASD=Orbit  QE=Zoom', 160, 225, DIM);

  // Scene-specific stats
  let statLine = '';
  if (scene === 1) statLine = 'GPU draw calls: 3  |  instances: 700';
  else if (scene === 2) statLine = 'GPU draw calls: 1  |  instances: 300';
  else if (scene === 3) statLine = 'GPU draw calls: 2  |  LOD levels: 3  |  instances: 80';
  print(statLine, 8, 22, BLUE);
}
