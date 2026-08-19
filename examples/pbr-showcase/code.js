// PBR SHOWCASE — Physically Based Rendering Material Gallery
//
// 6 scenes demonstrating PBR materials:
//  [1] Material Grid  — 5×5 metalness × roughness sphere matrix
//  [2] Metals Gallery — gold, silver, copper, chrome, titanium, oxidised
//  [3] Gems & Glass   — gemstones with emissive glow and glass spheres
//  [4] Mixed Materials — ceramic, rubber, marble, ice, wax, etc.
//  [5] Emissive       — glowing neon, lava, energy, holographic objects
//  [6] Shapes         — varied geometry with contrasting PBR properties
//
// Controls: 1-6 = scene, WASD = orbit, QE = zoom

const { drawRoundedRect, print, printCentered, rgba8 } = nova64.draw;
const {
  clearScene,
  createCapsule,
  createCone,
  createCube,
  createCylinder,
  createPlane,
  createSphere,
  createTorus,
  setPBRProperties,
  setRotation,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const {
  createGradientSkybox,
  createImageSkybox,
  setAmbientLight,
  setFog,
  setLightColor,
  setLightDirection,
} = nova64.light;
const { enableBloom, enableFXAA, enableVignette } = nova64.fx;
const { btnp, key, keyp } = nova64.input;
const { t } = nova64.data;
const { arc } = nova64.util;

const SPACING = 2.4;

let meshIds = [];
let floorId = null;
let orbitAngle = Math.PI * 0.15;
let orbitDist = 15.5;
let orbitY = 1.5;
let time = 0;
let scene = 0;

const SCENE_NAMES = ['Material Grid', 'Metals', 'Gems & Glass', 'Mixed', 'Emissive', 'Shapes'];

async function applyShowcaseSkybox() {
  try {
    await createImageSkybox([
      '/assets/sky/studio/px.png',
      '/assets/sky/studio/nx.png',
      '/assets/sky/studio/py.png',
      '/assets/sky/studio/ny.png',
      '/assets/sky/studio/pz.png',
      '/assets/sky/studio/nz.png',
    ]);
  } catch (e) {
    createGradientSkybox(0x0c1828, 0x040810);
  }
}

// ── Init ────────────────────────────────────────────────────────────────────
export async function init() {
  setCameraFOV(58);
  await applyShowcaseSkybox();

  setFog(0x060e1a, 22, 60);
  setAmbientLight(0x2a3a55, 1.6);
  setLightDirection(-0.6, -1.0, -0.5);
  setLightColor(0xffffff);
  enableBloom(0.5, 0.35, 0.35);
  enableVignette(1.0, 0.75);
  enableFXAA();

  await buildScene(0);
}

function clearMeshes() {
  meshIds = [];
  floorId = null;
}

function buildFloor() {
  floorId = createPlane(50, 50, 0x080c14, [0, -3.3, 0]);
  setRotation(floorId, -Math.PI / 2, 0, 0);
  setPBRProperties(floorId, { metalness: 0.85, roughness: 0.08, envMapIntensity: 1.5 });
}

async function buildScene(idx) {
  clearMeshes();
  clearScene();
  // Re-apply lighting after clearScene
  setAmbientLight(0x2a3a55, 1.6);
  setLightDirection(-0.6, -1.0, -0.5);
  setLightColor(0xffffff);
  enableBloom(0.5, 0.35, 0.35);
  enableVignette(1.0, 0.75);
  enableFXAA();
  setFog(0x060e1a, 22, 60);

  await applyShowcaseSkybox();

  buildFloor();

  if (idx === 0) buildMaterialGrid();
  else if (idx === 1) buildMetals();
  else if (idx === 2) buildGems();
  else if (idx === 3) buildMixed();
  else if (idx === 4) buildEmissive();
  else if (idx === 5) buildShapes();

  orbitAngle = Math.PI * 0.15;
  orbitDist = 15.5;
  orbitY = 1.5;
}

// ── Scene 0: 5×5 Material Grid ─────────────────────────────────────────────
function buildMaterialGrid() {
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const metalness = col / 4;
      const roughness = row / 4;
      const x = (col - 2) * SPACING;
      const y = (2 - row) * SPACING;
      const color = lerpHex(0xd4c0a8, 0xc8d4e0, metalness);
      const id = createSphere(0.95, color, [x, y, 0], 32, {});
      setPBRProperties(id, { metalness, roughness });
      meshIds.push(id);
    }
  }
}

// ── Scene 1: Metals Gallery ─────────────────────────────────────────────────
function buildMetals() {
  const metals = [
    { name: 'Gold', color: 0xffd700, metalness: 1.0, roughness: 0.15, envMap: 2.0 },
    { name: 'Silver', color: 0xd0d0d0, metalness: 1.0, roughness: 0.08, envMap: 2.5 },
    { name: 'Copper', color: 0xdd7744, metalness: 1.0, roughness: 0.2, envMap: 1.8 },
    { name: 'Chrome', color: 0xeeeeee, metalness: 1.0, roughness: 0.02, envMap: 3.0 },
    { name: 'Titanium', color: 0x888899, metalness: 0.95, roughness: 0.3, envMap: 1.5 },
    { name: 'Bronze', color: 0xcc8844, metalness: 0.9, roughness: 0.4, envMap: 1.2 },
    { name: 'Oxidised', color: 0x446655, metalness: 0.7, roughness: 0.65, envMap: 0.8 },
    { name: 'Gun Metal', color: 0x333340, metalness: 0.95, roughness: 0.25, envMap: 2.0 },
    { name: 'Rose Gold', color: 0xe8a0a0, metalness: 1.0, roughness: 0.12, envMap: 2.2 },
    { name: 'Brass', color: 0xccaa44, metalness: 0.9, roughness: 0.35, envMap: 1.4 },
    { name: 'Platinum', color: 0xccccdd, metalness: 1.0, roughness: 0.05, envMap: 2.8 },
    { name: 'Rust Iron', color: 0x884422, metalness: 0.5, roughness: 0.85, envMap: 0.4 },
  ];

  const cols = 4;
  for (let i = 0; i < metals.length; i++) {
    const m = metals[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * 3.0;
    const y = (1 - row) * 3.0;
    const id = createSphere(1.1, m.color, [x, y, 0], 32, {});
    setPBRProperties(id, {
      metalness: m.metalness,
      roughness: m.roughness,
      envMapIntensity: m.envMap,
    });
    meshIds.push(id);
  }
}

// ── Scene 2: Gems & Glass ───────────────────────────────────────────────────
function buildGems() {
  const gems = [
    { name: 'Ruby', color: 0xcc1133, emissive: 0x660011, roughness: 0.05 },
    { name: 'Emerald', color: 0x22cc44, emissive: 0x116622, roughness: 0.08 },
    { name: 'Sapphire', color: 0x2244cc, emissive: 0x112266, roughness: 0.05 },
    { name: 'Amethyst', color: 0x9933cc, emissive: 0x441166, roughness: 0.1 },
    { name: 'Diamond', color: 0xeeeeff, emissive: 0x8888ff, roughness: 0.0 },
    { name: 'Topaz', color: 0xffaa22, emissive: 0x884400, roughness: 0.06 },
    { name: 'Opal', color: 0xddccee, emissive: 0x8866aa, roughness: 0.15 },
    { name: 'Obsidian', color: 0x111115, emissive: 0x050508, roughness: 0.02 },
  ];

  // Gem spheres in an arc
  for (let i = 0; i < gems.length; i++) {
    const g = gems[i];
    const angle = ((i - (gems.length - 1) / 2) / gems.length) * Math.PI * 0.6;
    const r = 6;
    const x = Math.sin(angle) * r;
    const z = Math.cos(angle) * r - r;
    const y = 0;
    const id = createSphere(0.9, g.color, [x, y, z], 32, {
      material: 'standard',
      emissive: g.emissive,
      emissiveIntensity: 1.5,
    });
    setPBRProperties(id, {
      metalness: 0.1,
      roughness: g.roughness,
      envMapIntensity: 3.0,
    });
    meshIds.push(id);
  }

  // Glass spheres floating above
  const glassColors = [0xeeffff, 0xffeeff, 0xeeffee, 0xffffee, 0xeeeeff];
  for (let i = 0; i < glassColors.length; i++) {
    const angle = ((i - 2) / 5) * Math.PI * 0.5;
    const x = Math.sin(angle) * 4;
    const z = Math.cos(angle) * 4 - 4;
    const id = createSphere(0.6, glassColors[i], [x, 3, z], 32, {
      material: 'standard',
      emissive: glassColors[i],
      emissiveIntensity: 0.3,
    });
    setPBRProperties(id, {
      metalness: 0.0,
      roughness: 0.0,
      envMapIntensity: 4.0,
    });
    meshIds.push(id);
  }
}

// ── Scene 3: Mixed Materials ────────────────────────────────────────────────
function buildMixed() {
  const materials = [
    { name: 'Ceramic', color: 0xeeddcc, metalness: 0.0, roughness: 0.3, envMap: 1.0 },
    { name: 'Rubber', color: 0x222222, metalness: 0.0, roughness: 0.95, envMap: 0.2 },
    { name: 'Marble', color: 0xdddddd, metalness: 0.0, roughness: 0.15, envMap: 1.5 },
    { name: 'Clay', color: 0xbb6633, metalness: 0.0, roughness: 0.85, envMap: 0.3 },
    { name: 'Plastic', color: 0xee3333, metalness: 0.0, roughness: 0.35, envMap: 0.8 },
    { name: 'Ice', color: 0xaaddff, metalness: 0.05, roughness: 0.02, envMap: 2.5 },
    { name: 'Wax', color: 0xeedd99, metalness: 0.0, roughness: 0.5, envMap: 0.6 },
    { name: 'Charcoal', color: 0x1a1a1a, metalness: 0.0, roughness: 1.0, envMap: 0.1 },
    { name: 'Pearl', color: 0xeeeedd, metalness: 0.2, roughness: 0.1, envMap: 2.0 },
    { name: 'Stone', color: 0x888877, metalness: 0.0, roughness: 0.75, envMap: 0.4 },
    { name: 'Lacquer', color: 0x110022, metalness: 0.05, roughness: 0.04, envMap: 2.0 },
    { name: 'Concrete', color: 0x999999, metalness: 0.0, roughness: 0.9, envMap: 0.2 },
  ];

  const cols = 4;
  for (let i = 0; i < materials.length; i++) {
    const m = materials[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * 3.0;
    const y = (1 - row) * 3.0;

    // Use cubes for some variety
    let id;
    if (i % 3 === 1) {
      id = createCube(1.6, m.color, [x, y, 0], { material: 'standard' });
    } else if (i % 3 === 2) {
      id = createCylinder(0.8, 1.8, m.color, [x, y, 0], { material: 'standard' });
    } else {
      id = createSphere(0.95, m.color, [x, y, 0], 32, {});
    }
    setPBRProperties(id, {
      metalness: m.metalness,
      roughness: m.roughness,
      envMapIntensity: m.envMap,
    });
    meshIds.push(id);
  }
}

// ── Scene 4: Emissive — glowing neon, lava, energy objects ──────────────────
function buildEmissive() {
  const emissives = [
    { name: 'Neon Red', color: 0xff0033, emissive: 0xff0033, intensity: 4.0 },
    { name: 'Neon Blue', color: 0x0066ff, emissive: 0x0066ff, intensity: 4.0 },
    { name: 'Neon Green', color: 0x00ff44, emissive: 0x00ff44, intensity: 3.5 },
    { name: 'Neon Pink', color: 0xff00ff, emissive: 0xff00ff, intensity: 3.0 },
    { name: 'Lava', color: 0xff4400, emissive: 0xff2200, intensity: 5.0 },
    { name: 'Molten Gold', color: 0xffaa00, emissive: 0xff8800, intensity: 4.0 },
    { name: 'Plasma', color: 0x4488ff, emissive: 0x2266ff, intensity: 6.0 },
    { name: 'Radioactive', color: 0x44ff00, emissive: 0x22ff00, intensity: 5.0 },
    { name: 'White Hot', color: 0xffffff, emissive: 0xffeedd, intensity: 3.0 },
    { name: 'Void', color: 0x220044, emissive: 0x440088, intensity: 2.0 },
    { name: 'Energy Core', color: 0x00ffff, emissive: 0x00cccc, intensity: 5.0 },
    { name: 'Ember', color: 0xcc3300, emissive: 0x881100, intensity: 2.5 },
  ];

  const cols = 4;
  for (let i = 0; i < emissives.length; i++) {
    const e = emissives[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * 3.0;
    const y = (1 - row) * 3.0;
    let id;
    if (i % 3 === 0) {
      id = createSphere(0.95, e.color, [x, y, 0], 32, {
        material: 'standard',
        emissive: e.emissive,
        emissiveIntensity: e.intensity,
      });
    } else if (i % 3 === 1) {
      id = createCube(1.5, e.color, [x, y, 0], {
        material: 'standard',
        emissive: e.emissive,
        emissiveIntensity: e.intensity,
      });
    } else {
      id = createTorus(0.7, 0.25, e.color, [x, y, 0], {
        material: 'standard',
        emissive: e.emissive,
        emissiveIntensity: e.intensity,
      });
    }
    setPBRProperties(id, { metalness: 0.3, roughness: 0.2, envMapIntensity: 1.0 });
    meshIds.push(id);
  }
}

// ── Scene 5: Shapes — varied geometry with contrasting PBR ──────────────────
function buildShapes() {
  const shapes = [
    {
      type: 'sphere',
      color: 0xffd700,
      metalness: 1.0,
      roughness: 0.1,
      envMap: 2.5,
      pos: [-4, 2, 0],
    },
    {
      type: 'cube',
      color: 0xcc2222,
      metalness: 0.0,
      roughness: 0.4,
      envMap: 0.8,
      pos: [-1.5, 2, 0],
    },
    {
      type: 'cylinder',
      color: 0x2255cc,
      metalness: 0.8,
      roughness: 0.15,
      envMap: 2.0,
      pos: [1.5, 2, 0],
    },
    {
      type: 'torus',
      color: 0x22cc88,
      metalness: 0.6,
      roughness: 0.3,
      envMap: 1.5,
      pos: [4, 2, 0],
    },
    {
      type: 'cone',
      color: 0xee8833,
      metalness: 0.0,
      roughness: 0.7,
      envMap: 0.5,
      pos: [-4, -1.5, 0],
    },
    {
      type: 'capsule',
      color: 0xcc44cc,
      metalness: 0.9,
      roughness: 0.05,
      envMap: 3.0,
      pos: [-1.5, -1.5, 0],
    },
    {
      type: 'sphere',
      color: 0x111111,
      metalness: 0.0,
      roughness: 1.0,
      envMap: 0.1,
      pos: [1.5, -1.5, 0],
    },
    {
      type: 'cube',
      color: 0xeeeeff,
      metalness: 1.0,
      roughness: 0.0,
      envMap: 3.5,
      pos: [4, -1.5, 0],
    },
  ];

  for (const s of shapes) {
    let id;
    if (s.type === 'sphere') id = createSphere(1.0, s.color, s.pos, 32, { material: 'standard' });
    else if (s.type === 'cube') id = createCube(1.6, s.color, s.pos, { material: 'standard' });
    else if (s.type === 'cylinder')
      id = createCylinder(0.7, 2.0, s.color, s.pos, { material: 'standard' });
    else if (s.type === 'torus')
      id = createTorus(0.8, 0.3, s.color, s.pos, { material: 'standard' });
    else if (s.type === 'cone') id = createCone(0.9, 2.0, s.color, s.pos, { material: 'standard' });
    else if (s.type === 'capsule')
      id = createCapsule(0.5, 1.2, s.color, s.pos, { material: 'standard' });
    setPBRProperties(id, {
      metalness: s.metalness,
      roughness: s.roughness,
      envMapIntensity: s.envMap,
    });
    meshIds.push(id);
  }
}

// ── Update ───────────────────────────────────────────────────────────────────
export function update(dt) {
  time += dt;

  // Keyboard orbit controls
  if (key('KeyA') || key('ArrowLeft')) orbitAngle -= dt * 1.0;
  if (key('KeyD') || key('ArrowRight')) orbitAngle += dt * 1.0;
  if (key('KeyW') || key('ArrowUp')) orbitY = Math.min(12, orbitY + dt * 4);
  if (key('KeyS') || key('ArrowDown')) orbitY = Math.max(-4, orbitY - dt * 4);
  if (key('KeyQ')) orbitDist = Math.min(30, orbitDist + dt * 6);
  if (key('KeyE')) orbitDist = Math.max(8, orbitDist - dt * 6);

  // Slow auto-orbit when no input
  if (!key('KeyA') && !key('KeyD') && !key('ArrowLeft') && !key('ArrowRight')) {
    orbitAngle += dt * 0.16;
  }

  const camX = Math.sin(orbitAngle) * orbitDist;
  const camZ = Math.cos(orbitAngle) * orbitDist;
  const camY = orbitY + Math.sin(time * 0.22) * 0.8;

  setCameraPosition(camX, camY, camZ);
  setCameraTarget(0, 0, 0);

  // Scene switch
  for (let i = 0; i < 6; i++) {
    if (keyp('Digit' + (i + 1)) || keyp('Numpad' + (i + 1)) || btnp(13 + i)) {
      if (scene !== i) {
        scene = i;
        void buildScene(i);
      }
    }
  }
}

// ── Draw (2D HUD) ─────────────────────────────────────────────────────────────
export function draw() {
  drawRoundedRect(0, 0, 320, 14, 0, rgba8(0, 0, 0, 150));
  printCentered(
    '[1]Grid [2]Metal [3]Gem [4]Mix [5]Glow [6]Shape',
    160,
    2,
    rgba8(220, 200, 150, 255)
  );

  // Scene-specific info
  if (scene === 0) {
    print('METALNESS  0 ──────── 1', 50, 218, 0x6aadcc, 1);
    print('R', 2, 80, 0xcc8844, 1);
    print('O', 2, 88, 0xcc8844, 1);
    print('U', 2, 96, 0xcc8844, 1);
    print('G', 2, 104, 0xcc8844, 1);
    print('H', 2, 112, 0xcc8844, 1);
  }

  drawRoundedRect(0, 224, 320, 16, 0, rgba8(0, 0, 0, 130));
  print(
    'Scene: ' + SCENE_NAMES[scene] + '   [WASD] Orbit  [QE] Zoom',
    6,
    226,
    rgba8(110, 110, 110, 220)
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function lerpHex(a, b, t) {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}
