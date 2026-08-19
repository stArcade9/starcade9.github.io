// examples/tsl-showcase/code.js
// TSL (Three Shading Language) Showcase — demonstrates Nova64's TSL integration
// Scenes: Galaxy Spiral, Procedural Terrain, Energy Tornado, Material Lab
// Navigate: Space/Enter = next scene, Arrow Left = prev scene

const { print, screenHeight, screenWidth } = nova64.draw;
const {
  clearScene,
  createCone,
  createCube,
  createPlane,
  createSphere,
  createTorus,
  getMesh,
  removeMesh,
  rotateMesh,
  setScale,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { createPointLight, setAmbientLight, setFog } = nova64.light;
const { createParticleSystem, enableBloom, enableVignette, removeParticleSystem, updateParticles } =
  nova64.fx;
const {
  createHologramMaterial,
  createLavaMaterial,
  createPlasmaMaterial,
  createShockwaveMaterial,
  createTSLMaterial,
  createTSLShaderMaterial,
  createVortexMaterial,
  createWaterMaterial,
} = nova64.shader;
const { keyp } = nova64.input;
let currentScene = 0;
const SCENE_COUNT = 4;
let sceneTime = 0;
let ids = []; // mesh IDs returned by create* functions
let particles = null;

// ─── Helpers ─────────────────────────────────────────────────────────────

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)));
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Apply a material to a mesh ID (safely via getMesh + traverse) */
function applyMat(id, mat) {
  const mesh = getMesh(id);
  if (mesh) {
    mesh.traverse(child => {
      if (child.isMesh) child.material = mat;
    });
  }
}

// ─── Scene management ────────────────────────────────────────────────────

export function init() {
  setupScene(0);
}

function teardown() {
  ids.forEach(id => removeMesh(id));
  ids = [];
  if (particles) {
    removeParticleSystem(particles);
    particles = null;
  }
  clearScene();
}

function setupScene(idx) {
  teardown();
  sceneTime = 0;
  currentScene = ((idx % SCENE_COUNT) + SCENE_COUNT) % SCENE_COUNT;

  switch (currentScene) {
    case 0:
      setupGalaxy();
      break;
    case 1:
      setupTerrain();
      break;
    case 2:
      setupTornado();
      break;
    case 3:
      setupMaterialLab();
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene 0: Galaxy Spiral
// ═══════════════════════════════════════════════════════════════════════════

function setupGalaxy() {
  const random = createSeededRandom(0x67a1c4);

  setCameraPosition(0, 18, 22);
  setCameraTarget(0, 0, 0);
  setCameraFOV(50);
  setFog(0x020208, 25, 70);
  setAmbientLight(0x111133);
  createPointLight(0x6666ff, 2.0, 40, [0, 8, 0]);
  createPointLight(0xff4488, 1.0, 30, [10, 3, -5]);

  // Glowing galaxy core — large sphere with galaxy shader
  const coreId = createSphere(4, 0xffffff, [0, 0, 0], 24);
  applyMat(coreId, createTSLMaterial('galaxy', { speed: 0.3 }));
  ids.push(coreId);

  // Inner halo ring — torus with void shader
  const haloId = createTorus(6, 0.4, 0xffffff, [0, 0, 0]);
  applyMat(haloId, createTSLMaterial('void', { speed: 0.2 }));
  const haloMesh = getMesh(haloId);
  if (haloMesh) haloMesh.rotation.x = Math.PI / 2;
  ids.push(haloId);

  // Spiral arms — three arms of emissive stars
  for (let arm = 0; arm < 3; arm++) {
    const armOffset = (arm / 3) * Math.PI * 2;
    for (let i = 0; i < 50; i++) {
      const r = 5 + i * 0.35;
      const angle = armOffset + i * 0.18;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (random() - 0.5) * 0.8;
      const size = 0.12 + random() * 0.25;
      const hue = 0.55 + arm * 0.12;
      const col = hslToHex(hue, 0.9, 0.65 + random() * 0.15);
      const starId = createCube(size, col, [x, y, z], {
        emissive: col,
        emissiveIntensity: 2.5,
      });
      ids.push(starId);
    }
  }

  // Outer dust ring with rainbow shader
  const dustId = createTorus(16, 0.15, 0xffffff, [0, 0, 0]);
  applyMat(dustId, createTSLMaterial('rainbow', { speed: 0.5 }));
  const dustMesh = getMesh(dustId);
  if (dustMesh) dustMesh.rotation.x = Math.PI / 2;
  ids.push(dustId);

  // Particles — stardust
  particles = createParticleSystem(400, {
    emitRate: 60,
    minLife: 3,
    maxLife: 6,
    minSpeed: 0.3,
    maxSpeed: 1.5,
    spread: Math.PI,
    minSize: 0.04,
    maxSize: 0.12,
    startColor: 0x8888ff,
    endColor: 0x220044,
    emissive: 0x8888ff,
    emissiveIntensity: 3,
    gravity: 0,
    drag: 0.99,
    blending: 'additive',
    turbulence: 1.5,
    turbulenceScale: 0.4,
    opacityOverLife: [0, 1, 0],
  });

  enableBloom(1.8, 0.5, 0.15);
  enableVignette(1.0, 0.75);
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene 1: Procedural Terrain
// ═══════════════════════════════════════════════════════════════════════════

function setupTerrain() {
  setCameraPosition(0, 14, 20);
  setCameraTarget(0, 0, 0);
  setCameraFOV(50);
  setFog(0x1a1020, 18, 50);
  setAmbientLight(0x221122);
  createPointLight(0xff6600, 2.0, 40, [0, 15, 0]);
  createPointLight(0x44aaff, 1.5, 30, [-10, 8, 5]);
  createPointLight(0xff2200, 1.0, 25, [8, 3, -8]);

  // Lava floor with lava2 shader (Phase 1 improved lava)
  const floorId = createPlane(35, 35, 0xff4400, [0, -0.5, 0]);
  const floorMesh = getMesh(floorId);
  if (floorMesh) floorMesh.rotation.x = -Math.PI / 2;
  applyMat(floorId, createLavaMaterial({ speed: 0.15, intensity: 3.0 }));
  ids.push(floorId);

  // Procedural terrain pillars
  const seed = 42;
  for (let gx = -8; gx <= 8; gx += 2) {
    for (let gz = -8; gz <= 8; gz += 2) {
      const dist = Math.sqrt(gx * gx + gz * gz);
      if (dist < 3) continue; // clear center
      // Deterministic height based on position
      const h = Math.abs(Math.sin(gx * 0.4 + seed) * Math.cos(gz * 0.5 + seed)) * 7 + 0.5;
      const col = dist < 5 ? 0x664422 : dist < 8 ? 0x556644 : 0x445533;
      const pillarId = createCube(1.6, col, [gx, h / 2, gz]);
      setScale(pillarId, 1.6, h, 1.6);
      ids.push(pillarId);

      // Electric crystals on tall pillars
      if (h > 4 && (gx + gz + seed) % 3 === 0) {
        const crystalId = createCone(0.35, 1.2, 0x44ffaa, [gx, h + 0.6, gz]);
        applyMat(crystalId, createTSLMaterial('electricity', { speed: 2.5, color: 0x44ffaa }));
        ids.push(crystalId);
      }

      // Water pools in low spots
      if (h < 2 && dist > 5) {
        const poolId = createPlane(1.8, 1.8, 0x2244aa, [gx, 0.1, gz]);
        const poolMesh = getMesh(poolId);
        if (poolMesh) poolMesh.rotation.x = -Math.PI / 2;
        applyMat(poolId, createWaterMaterial({ speed: 0.4 }));
        ids.push(poolId);
      }
    }
  }

  // Central vortex portal
  const portalId = createTorus(2.5, 0.3, 0xffffff, [0, 3, 0]);
  applyMat(portalId, createVortexMaterial({ speed: 1.5 }));
  ids.push(portalId);

  enableBloom(1.0, 0.35, 0.35);
  enableVignette(1.0, 0.8);
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene 2: Energy Tornado
// ═══════════════════════════════════════════════════════════════════════════

function setupTornado() {
  setCameraPosition(12, 10, 12);
  setCameraTarget(0, 6, 0);
  setCameraFOV(50);
  setFog(0x060618, 15, 45);
  setAmbientLight(0x110022);
  createPointLight(0xff44aa, 3.0, 40, [0, 12, 0]);
  createPointLight(0x4400ff, 2.0, 30, [-8, 4, 8]);

  // Ground plane with plasma shader
  const groundId = createPlane(30, 30, 0x110022, [0, -0.1, 0]);
  const groundMesh = getMesh(groundId);
  if (groundMesh) groundMesh.rotation.x = -Math.PI / 2;
  applyMat(groundId, createPlasmaMaterial({ speed: 0.3 }));
  ids.push(groundId);

  // Tornado funnel — layered rings of glowing blocks
  for (let layer = 0; layer < 25; layer++) {
    const y = layer * 0.55;
    const radius = 3.5 - layer * 0.12;
    const segments = 10 + Math.floor(layer * 0.5);
    const twist = layer * 0.15; // pre-twist per layer
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2 + twist;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const blockSize = 0.35 - layer * 0.008;
      const hue = 0.7 + layer * 0.015;
      const col = hslToHex(hue, 0.95, 0.5 + layer * 0.015);
      const blockId = createCube(Math.max(blockSize, 0.1), col, [x, y, z], {
        emissive: col,
        emissiveIntensity: 2.5,
      });
      ids.push(blockId);
    }
  }

  // Orbiting energy orbs with shockwave material
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const orbId = createSphere(0.6, 0xffffff, [Math.cos(angle) * 5, 6, Math.sin(angle) * 5]);
    applyMat(orbId, createShockwaveMaterial({ speed: 0.5 }));
    ids.push(orbId);
  }

  // Debris particles
  particles = createParticleSystem(500, {
    emitRate: 80,
    emitterY: 0,
    minLife: 2,
    maxLife: 4,
    minSpeed: 3,
    maxSpeed: 10,
    spread: Math.PI * 0.3,
    minSize: 0.06,
    maxSize: 0.2,
    startColor: 0xff4488,
    endColor: 0x4400ff,
    emissive: 0xff4488,
    emissiveIntensity: 5,
    gravity: -2,
    drag: 0.97,
    blending: 'additive',
    turbulence: 6,
    turbulenceScale: 0.25,
    attractorX: 0,
    attractorY: 7,
    attractorZ: 0,
    attractorStrength: 10,
    sizeOverLife: [0.5, 1.0, 0.2],
    opacityOverLife: [0, 1, 0],
    rotationSpeed: 4,
  });

  enableBloom(2.0, 0.5, 0.12);
  enableVignette(1.2, 0.7);
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene 3: Material Lab — all 12 presets + custom GLSL
// ═══════════════════════════════════════════════════════════════════════════

function setupMaterialLab() {
  setCameraPosition(0, 6, 16);
  setCameraTarget(0, 2.5, 0);
  setCameraFOV(55);
  setFog(0x0a0a18, 20, 50);
  setAmbientLight(0x222244);
  createPointLight(0xffffff, 2.0, 40, [0, 12, 10]);
  createPointLight(0xff4400, 1.0, 25, [-10, 6, -5]);
  createPointLight(0x0044ff, 1.0, 25, [10, 6, -5]);

  // All 12 presets — two rows of 6 spheres
  const presets = [
    // Row 0 — originals
    { name: 'plasma', fn: () => createTSLMaterial('plasma', { speed: 2.0 }) },
    { name: 'galaxy', fn: () => createTSLMaterial('galaxy', { speed: 0.5 }) },
    { name: 'lava', fn: () => createTSLMaterial('lava', { speed: 1.0 }) },
    {
      name: 'electricity',
      fn: () => createTSLMaterial('electricity', { speed: 3.0, color: 0x44aaff }),
    },
    { name: 'rainbow', fn: () => createTSLMaterial('rainbow', { speed: 1.0 }) },
    { name: 'void', fn: () => createTSLMaterial('void', { speed: 0.3 }) },
    // Row 1 — Phase 1 new
    { name: 'lava2', fn: () => createLavaMaterial({ speed: 0.2, intensity: 3.0 }) },
    { name: 'vortex', fn: () => createVortexMaterial({ speed: 1.0 }) },
    { name: 'plasma2', fn: () => createPlasmaMaterial({ speed: 1.0 }) },
    { name: 'water', fn: () => createWaterMaterial({ speed: 0.5 }) },
    { name: 'hologram', fn: () => createHologramMaterial({ speed: 1.0 }) },
    { name: 'shockwave', fn: () => createShockwaveMaterial({ speed: 0.3 }) },
  ];

  const cols = 6;
  const spacingX = 4.0;
  const startX = -((cols - 1) * spacingX) / 2;

  for (let i = 0; i < presets.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * spacingX;
    const y = row === 0 ? 4.5 : 1.0;
    const z = -row * 3;

    const sphereId = createSphere(1.3, 0xffffff, [x, y, z], 20);
    applyMat(sphereId, presets[i].fn());
    ids.push(sphereId);
  }

  // Custom GLSL shader sphere — floating above center
  const customMat = createTSLShaderMaterial(
    null,
    /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float r = sin(vUv.x * 12.0 + uTime * 1.5) * 0.5 + 0.5;
      float g = sin(vUv.y * 12.0 + uTime * 1.8) * 0.5 + 0.5;
      float b = sin((vUv.x + vUv.y) * 8.0 + uTime) * 0.5 + 0.5;
      gl_FragColor = vec4(r * r, g, b * b, 1.0);
    }
  `
  );
  const customId = createSphere(1.8, 0xffffff, [0, 7.5, -1.5], 24);
  applyMat(customId, customMat);
  ids.push(customId);

  // Floor
  const floorId = createPlane(40, 20, 0x0a0a1e, [0, -0.5, -1]);
  const floorMesh = getMesh(floorId);
  if (floorMesh) floorMesh.rotation.x = -Math.PI / 2;
  ids.push(floorId);

  enableBloom(1.2, 0.35, 0.3);
  enableVignette(0.8, 0.85);
}

// ═══════════════════════════════════════════════════════════════════════════
// Update & Draw
// ═══════════════════════════════════════════════════════════════════════════

export function update(dt) {
  sceneTime += dt;

  // Navigate scenes
  if (keyp('Space') || keyp('Enter') || keyp('ArrowRight') || keyp('ArrowDown')) {
    setupScene(currentScene + 1);
    return;
  }
  if (keyp('ArrowLeft') || keyp('ArrowUp')) {
    setupScene(currentScene - 1);
    return;
  }

  // Rotate all objects gently
  for (let i = 0; i < ids.length; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    rotateMesh(ids[i], 0, dt * 0.3 * dir, 0);
  }

  // Scene-specific animation
  if (currentScene === 0) {
    // Galaxy: slow galactic rotation for the whole field
    const cy = 18 + Math.sin(sceneTime * 0.1) * 1.5;
    const cx = Math.sin(sceneTime * 0.05) * 3;
    setCameraPosition(cx, cy, 22);
  } else if (currentScene === 2) {
    // Tornado: faster rotation for funnel blocks + orbiting camera
    for (let i = 0; i < ids.length; i++) {
      const speed = 0.6 + (i % 25) * 0.04;
      rotateMesh(ids[i], 0, dt * speed, 0);
    }
    const camAngle = sceneTime * 0.15;
    setCameraPosition(
      Math.cos(camAngle) * 14,
      10 + Math.sin(sceneTime * 0.2) * 2,
      Math.sin(camAngle) * 14
    );
    setCameraTarget(0, 6, 0);
  } else if (currentScene === 3) {
    // Material Lab: gentle camera bob
    const cy = 6 + Math.sin(sceneTime * 0.12) * 0.4;
    setCameraPosition(0, cy, 16);
  }

  updateParticles(dt);
}

const sceneNames = ['Galaxy Spiral', 'Procedural Terrain', 'Energy Tornado', 'Material Lab'];
const sceneDescs = [
  'Galaxy + Void + Rainbow shaders',
  'Lava2 + Water + Vortex + Electricity shaders',
  'Plasma2 + Shockwave shaders',
  'All 12 presets + custom GLSL',
];

export function draw() {
  const W = typeof screenWidth === 'function' ? screenWidth() : 640;
  const H = typeof screenHeight === 'function' ? screenHeight() : 360;
  const num = currentScene + 1;

  // Title bar
  print('TSL SHOWCASE', 10, 8, 0x00ffcc, 2);
  print(`${num}/${SCENE_COUNT}`, W - 50, 10, 0x00ffcc);

  // Scene name + description
  const name = sceneNames[currentScene];
  const nameW = name.length * 8;
  print(name, Math.floor((W - nameW) / 2), 38, 0xffffff, 2);
  const desc = sceneDescs[currentScene];
  const descW = desc.length * 7;
  print(desc, Math.floor((W - descW) / 2), 58, 0x888899);

  // Navigation hint
  const hint = 'SPACE / ENTER  next     ARROWS  prev/next';
  const hintW = hint.length * 7;
  print(hint, Math.floor((W - hintW) / 2), H - 16, 0x555577);

  // Dot indicators
  const dotW = SCENE_COUNT * 14;
  const dotX = Math.floor((W - dotW) / 2);
  for (let i = 0; i < SCENE_COUNT; i++) {
    const col = i === currentScene ? 0x00ffcc : 0x333344;
    print('\u2022', dotX + i * 14, H - 30, col, 2);
  }

  // Material Lab: label each preset
  if (currentScene === 3) {
    const names = [
      'plasma',
      'galaxy',
      'lava',
      'electric',
      'rainbow',
      'void',
      'lava2',
      'vortex',
      'plasma2',
      'water',
      'hologram',
      'shockwave',
    ];
    const cols = 6;
    const spacingX = 4.0;
    const startPx = Math.floor((W - (cols - 1) * 68) / 2);
    for (let i = 0; i < names.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const lx = startPx + col * 68;
      const ly = row === 0 ? 110 : 230;
      print(names[i], lx, ly, row === 0 ? 0x999999 : 0x44ffaa);
    }
    print('custom GLSL', Math.floor(W / 2) - 40, 80, 0x44ffaa);
  }
}
