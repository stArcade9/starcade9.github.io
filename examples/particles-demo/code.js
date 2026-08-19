// GPU Particle System Demo — Nova64
// 5 stunning scenes: inferno, blizzard, electric forge, galaxy, waterfall
// Controls: 1-5 = scene, SPACE/TAP = burst, WASD = orbit, QE = zoom

const { drawRoundedRect, print, printCentered, rgba8 } = nova64.draw;
const {
  clearScene,
  createCone,
  createCube,
  createCylinder,
  createPlane,
  createSphere,
  createTorus,
  setRotation,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { createPointLight, createSolidSkybox, setAmbientLight, setFog, setPointLightPosition } =
  nova64.light;
const {
  burstParticles,
  createParticleSystem,
  enableBloom,
  getParticleStats,
  removeParticleSystem,
  setParticleEmitter,
  updateParticles,
} = nova64.fx;
const { btnp, key, keyp } = nova64.input;
const { rotate } = nova64.util;

let scene = 0;
let systemIds = [];
let lightIds = [];
let propIds = [];
let orbitAngle = 0.3;
let orbitDist = 12;
let orbitY = 4;
let frameCount = 0;
let burstCooldown = 0;
let sceneTime = 0;
let countMultiplier = 1.0; // 0.25x to 4x particle counts
const COUNT_STEPS = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0];
let countStepIdx = 2; // default = 1.0x

const SCENES = [
  '\uD83D\uDD25 Inferno',
  '\u2745 Blizzard',
  '\u26A1 Forge',
  '\uD83C\uDF0C Galaxy',
  '\uD83C\uDF0A Waterfall',
];

export function init() {
  setCameraFOV(70);
  buildScene(scene);
}

function clearSystems() {
  systemIds.forEach(id => removeParticleSystem(id));
  systemIds = [];
  lightIds = [];
  propIds = [];
  sceneTime = 0;
}

// Scale particle count by multiplier (minimum 10)
function pc(base) {
  return Math.max(10, Math.round(base * countMultiplier));
}

function buildScene(idx) {
  clearSystems();
  clearScene();
  if (idx === 0) buildFire();
  else if (idx === 1) buildBlizzard();
  else if (idx === 2) buildForge();
  else if (idx === 3) buildGalaxy();
  else if (idx === 4) buildWaterfall();
}

function isBabylonBackend() {
  return nova64.scene.getBackendCapabilities?.().backend === 'babylon';
}

// ── Scene 0: Inferno — massive bonfire with erupting embers ───────────────────
function buildFire() {
  setAmbientLight(0x331100, 0.5);
  setFog(0x0a0200, 20, 50);
  enableBloom(2.0, 0.6, 0.2);

  // Charred ground
  const floor = createPlane(50, 50, 0x1a0800, [0, 0, 0], { material: 'standard', roughness: 1 });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  // Glowing lava pool beneath the fire
  const lava = createCylinder(3.5, 0.15, 0xff4400, [0, 0.08, 0], {
    material: 'standard',
    emissive: 0xff2200,
    emissiveIntensity: 4.0,
    roughness: 0.4,
  });
  propIds.push(lava);

  // Stone ring around the fire
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    propIds.push(
      createSphere(
        0.5 + Math.random() * 0.3,
        0x332211,
        [Math.cos(a) * 3.5, 0.25, Math.sin(a) * 3.5],
        4,
        { material: 'standard', roughness: 0.95 }
      )
    );
  }

  // Central log pile
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    const log = createCylinder(
      0.18,
      3.0,
      0x221100,
      [Math.cos(a) * 0.18, 0.35, Math.sin(a) * 0.18],
      {
        material: 'standard',
        roughness: 0.95,
      }
    );
    setRotation(log, Math.PI / 2, a, 0);
    propIds.push(log);
  }

  // --- CORE FLAMES: bright dense fire column ---
  systemIds.push(
    createParticleSystem(pc(800), {
      shape: 'sphere',
      segments: 3,
      emissive: 0xffcc44,
      emissiveIntensity: 3.0,
      gravity: -5,
      drag: 0.96,
      emitterX: 0,
      emitterY: 0.8,
      emitterZ: 0,
      emitRate: 200,
      minLife: 0.4,
      maxLife: 1.2,
      minSpeed: 3,
      maxSpeed: 7,
      spread: 0.35,
      minSize: 0.12,
      maxSize: 0.5,
      startColor: 0xffffcc,
      endColor: 0xff4400,
    })
  );
  // --- OUTER FLAMES: wider, cooler orange ---
  systemIds.push(
    createParticleSystem(pc(500), {
      shape: 'sphere',
      segments: 3,
      emissive: 0xff6600,
      emissiveIntensity: 2.5,
      gravity: -3.5,
      drag: 0.97,
      emitterX: 0,
      emitterY: 1.0,
      emitterZ: 0,
      emitRate: 120,
      minLife: 0.6,
      maxLife: 1.5,
      minSpeed: 2,
      maxSpeed: 5,
      spread: 0.6,
      minSize: 0.1,
      maxSize: 0.4,
      startColor: 0xff9933,
      endColor: 0xaa1100,
    })
  );
  // --- EMBERS: hot sparks rising and spreading ---
  systemIds.push(
    createParticleSystem(pc(500), {
      shape: 'sphere',
      segments: 3,
      emissive: 0xff4400,
      emissiveIntensity: 3.5,
      gravity: -1.5,
      drag: 0.92,
      emitterX: 0,
      emitterY: 2.0,
      emitterZ: 0,
      emitRate: 60,
      minLife: 1.0,
      maxLife: 4.0,
      minSpeed: 2,
      maxSpeed: 10,
      spread: 1.0,
      minSize: 0.02,
      maxSize: 0.08,
      startColor: 0xffffff,
      endColor: 0xff2200,
    })
  );
  // --- THICK SMOKE: dark billowing smoke above ---
  systemIds.push(
    createParticleSystem(pc(250), {
      shape: 'sphere',
      segments: 4,
      emissive: 0x222222,
      emissiveIntensity: 0.3,
      gravity: -0.5,
      drag: 0.995,
      emitterX: 0,
      emitterY: 4.0,
      emitterZ: 0,
      emitRate: 40,
      minLife: 2.5,
      maxLife: 5.0,
      minSpeed: 0.3,
      maxSpeed: 1.5,
      spread: 0.8,
      minSize: 0.2,
      maxSize: 0.8,
      startColor: 0x444444,
      endColor: 0x111111,
    })
  );
  // --- GROUND HEAT: low simmering glow on lava pool ---
  systemIds.push(
    createParticleSystem(pc(200), {
      shape: 'sphere',
      segments: 3,
      emissive: 0xff3300,
      emissiveIntensity: 2.0,
      gravity: -1,
      drag: 0.98,
      emitterX: 0,
      emitterY: 0.2,
      emitterZ: 0,
      emitRate: 35,
      minLife: 0.5,
      maxLife: 1.5,
      minSpeed: 0.5,
      maxSpeed: 3,
      spread: Math.PI * 0.9,
      minSize: 0.06,
      maxSize: 0.2,
      startColor: 0xff6600,
      endColor: 0x330000,
    })
  );

  // Multiple warm lights for dramatic illumination
  lightIds.push({ id: createPointLight(0xff4400, 12, 30, 0, 3, 0), baseX: 0, baseZ: 0, phase: 0 });
  lightIds.push({
    id: createPointLight(0xff8800, 8, 22, -2, 1.5, -2),
    baseX: -2,
    baseZ: -2,
    phase: 1.5,
  });
  lightIds.push({
    id: createPointLight(0xff6600, 8, 22, 2, 1.5, 2),
    baseX: 2,
    baseZ: 2,
    phase: 3.0,
  });

  orbitY = 3;
  orbitDist = 10;
}

// ── Scene 1: Blizzard — gentle snowfall blanketing the landscape ──────────────
function buildBlizzard() {
  setAmbientLight(0x334466, 0.8);
  setFog(0x223344, 25, 60);
  enableBloom(0.6, 0.3, 0.5);

  // Snowy ground
  const floor = createPlane(60, 60, 0xccddee, [0, 0, 0], {
    material: 'standard',
    roughness: 0.85,
    metalness: 0.0,
  });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  // Pine trees
  const treeSpots = [
    [-8, -6],
    [5, -4],
    [-3, -9],
    [9, -7],
    [-6, 4],
    [7, 6],
    [-10, 2],
    [3, -2],
    [-5, 8],
    [11, -1],
  ];
  for (const [tx, tz] of treeSpots) {
    const h = 2 + Math.random() * 2.5;
    propIds.push(
      createCylinder(0.15, h * 0.6, 0x332211, [tx, h * 0.3, tz], {
        material: 'standard',
        roughness: 0.9,
      })
    );
    propIds.push(
      createCone(1.0 + Math.random() * 0.5, h, 0x224422, [tx, h * 0.6, tz], {
        material: 'standard',
        roughness: 0.8,
      })
    );
    // Snow cap on tree
    propIds.push(
      createCone(0.8, 0.5, 0xeeeeff, [tx, h * 0.6 + h * 0.45, tz], {
        material: 'standard',
        roughness: 0.3,
      })
    );
  }

  // Snow mounds
  [
    [-4, 0.3, 3],
    [6, 0.4, 1],
    [0, 0.25, 6],
    [-7, 0.35, -2],
    [3, 0.3, -5],
  ].forEach(([sx, sy, sz]) =>
    propIds.push(
      createSphere(0.8, 0xddeeff, [sx, sy, sz], 6, { material: 'standard', roughness: 0.5 })
    )
  );

  // --- MAIN SNOWFALL: 4 large-area emitters across the sky, falling DOWN ---
  const snowPositions = [
    [-6, 12, -4],
    [5, 13, 4],
    [-4, 11, 5],
    [7, 12, -5],
  ];
  for (const [sx, sy, sz] of snowPositions) {
    systemIds.push(
      createParticleSystem(pc(400), {
        shape: 'sphere',
        segments: 3,
        emissive: 0xccddff,
        emissiveIntensity: 1.5,
        gravity: -0.4,
        drag: 0.998,
        emitterX: sx,
        emitterY: sy,
        emitterZ: sz,
        emitRate: 70,
        minLife: 5.0,
        maxLife: 9.0,
        minSpeed: 0.3,
        maxSpeed: 1.2,
        spread: Math.PI * 0.95,
        minSize: 0.04,
        maxSize: 0.14,
        startColor: 0xffffff,
        endColor: 0xccddff,
      })
    );
  }

  // --- GENTLE DRIFT: very slow, large flakes close to camera ---
  systemIds.push(
    createParticleSystem(pc(200), {
      shape: 'sphere',
      segments: 3,
      emissive: 0xddeeff,
      emissiveIntensity: 1.2,
      gravity: -0.3,
      drag: 0.999,
      emitterX: 0,
      emitterY: 10,
      emitterZ: 0,
      emitRate: 30,
      minLife: 6.0,
      maxLife: 12.0,
      minSpeed: 0.1,
      maxSpeed: 0.5,
      spread: Math.PI,
      minSize: 0.08,
      maxSize: 0.22,
      startColor: 0xffffff,
      endColor: 0xddeeff,
    })
  );

  // --- GROUND POWDER: disturbed snow near ground level ---
  systemIds.push(
    createParticleSystem(pc(150), {
      shape: 'sphere',
      segments: 3,
      emissive: 0xaabbcc,
      emissiveIntensity: 1.0,
      gravity: -3.0,
      drag: 0.96,
      emitterX: 0,
      emitterY: 0.3,
      emitterZ: 0,
      emitRate: 15,
      minLife: 1.0,
      maxLife: 2.5,
      minSpeed: 0.5,
      maxSpeed: 2.0,
      spread: Math.PI * 0.8,
      minSize: 0.03,
      maxSize: 0.1,
      startColor: 0xeeeeff,
      endColor: 0x8899bb,
    })
  );

  lightIds.push({
    id: createPointLight(0x6688bb, 3, 30, 0, 10, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    snow: true,
  });
  lightIds.push({
    id: createPointLight(0x8899cc, 2, 25, 5, 8, -5),
    baseX: 5,
    baseZ: -5,
    phase: 1.5,
    snow: true,
  });

  orbitY = 5;
  orbitDist = 14;
}

// ── Scene 2: Forge — electric anvil with sparks and plasma ────────────────────
function buildForge() {
  setAmbientLight(0x050510, 0.2);
  setFog(0x020208, 12, 40);
  enableBloom(2.5, 0.7, 0.15);

  const floor = createPlane(30, 30, 0x1a1a2a, [0, 0, 0], {
    material: 'standard',
    roughness: 0.8,
    metalness: 0.6,
  });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  propIds.push(
    createCube(2.5, 0.6, 0x222222, [0, 0.3, 0], {
      material: 'standard',
      roughness: 0.5,
      metalness: 0.9,
    })
  );
  propIds.push(
    createCube(2.0, 0.4, 0x333344, [0, 0.8, 0], {
      material: 'standard',
      roughness: 0.3,
      metalness: 1.0,
    })
  );
  propIds.push(
    createCylinder(0.5, 0.2, 0xff6600, [0, 1.1, 0], {
      material: 'standard',
      roughness: 0.6,
      metalness: 0.8,
      emissive: 0xff3300,
      emissiveIntensity: 3.0,
    })
  );

  // Gold sparks — burst only
  systemIds.push(
    createParticleSystem(pc(700), {
      shape: 'sphere',
      segments: 3,
      gravity: 18,
      drag: 0.91,
      emitterX: 0,
      emitterY: 1.2,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.4,
      maxLife: 1.2,
      minSpeed: 6,
      maxSpeed: 24,
      spread: Math.PI * 0.7,
      minSize: 0.015,
      maxSize: 0.1,
      startColor: 0xffffff,
      endColor: 0xff2200,
    })
  );
  // Blue plasma arcs — burst only
  systemIds.push(
    createParticleSystem(pc(300), {
      shape: 'sphere',
      segments: 3,
      gravity: 8,
      drag: 0.88,
      emitterX: 0,
      emitterY: 1.2,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.2,
      maxLife: 0.7,
      minSpeed: 8,
      maxSpeed: 20,
      spread: Math.PI,
      minSize: 0.01,
      maxSize: 0.06,
      startColor: 0xaaffff,
      endColor: 0x0000ff,
    })
  );
  // Constant embers from hot metal
  systemIds.push(
    createParticleSystem(pc(150), {
      shape: 'sphere',
      segments: 3,
      gravity: 5,
      drag: 0.94,
      emitterX: 0,
      emitterY: 1.1,
      emitterZ: 0,
      emitRate: 40,
      minLife: 0.5,
      maxLife: 1.8,
      minSpeed: 1,
      maxSpeed: 5,
      spread: 0.8,
      minSize: 0.02,
      maxSize: 0.08,
      startColor: 0xffcc00,
      endColor: 0xff2200,
    })
  );
  // Lightning streaks — burst only
  systemIds.push(
    createParticleSystem(pc(120), {
      shape: 'sphere',
      segments: 3,
      gravity: 0,
      drag: 0.85,
      emitterX: 0,
      emitterY: 3,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.08,
      maxLife: 0.25,
      minSpeed: 12,
      maxSpeed: 35,
      spread: 0.3,
      minSize: 0.01,
      maxSize: 0.04,
      startColor: 0xffffff,
      endColor: 0x4444ff,
    })
  );

  lightIds.push({
    id: createPointLight(0xff4400, 8, 15, 0, 2, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    forge: true,
  });
  lightIds.push({
    id: createPointLight(0x4488ff, 5, 12, 0, 3, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    electric: true,
  });
  burstCooldown = 0.1; // kick off first hammer blow immediately

  orbitY = 6;
  orbitDist = 16;
}

// ── Scene 3: Galaxy — swirling spiral arms with nebula dust and stellar nursery
function buildGalaxy() {
  const babylon = isBabylonBackend();
  setAmbientLight(0x020208, 0.15);
  setFog(0x000004, 40, 80);
  enableBloom(1.8, 0.6, 0.1);
  createSolidSkybox(0x000005);

  // Central black hole — emissive core
  const core = createSphere(babylon ? 1.45 : 0.6, babylon ? 0xffffff : 0x221144, [0, 0, 0], {
    material: 'standard',
    emissive: babylon ? 0xffffff : 0x6633ff,
    emissiveIntensity: babylon ? 8.0 : 5.0,
  });
  propIds.push(core);

  // Accretion disc ring
  const disc = createTorus(2.0, 0.15, 0xff8800, [0, 0, 0], {
    material: 'standard',
    emissive: 0xff6600,
    emissiveIntensity: 2.5,
    metalness: 0.8,
  });
  setRotation(disc, Math.PI * 0.45, 0, 0);
  propIds.push(disc);

  // Spiral arm stars — 3 arms
  for (let arm = 0; arm < 3; arm++) {
    const armOffset = (arm * Math.PI * 2) / 3;
    const armColor = [0x8888ff, 0xff88ff, 0x88ffff][arm];
    const armEnd = [0x2222aa, 0xaa22aa, 0x22aaaa][arm];
    systemIds.push(
      createParticleSystem(pc(600), {
        shape: 'sphere',
        segments: 3,
        gravity: 0,
        drag: 1.0,
        emitterX: Math.cos(armOffset) * 4,
        emitterY: 0,
        emitterZ: Math.sin(armOffset) * 4,
        emitRate: 80,
        minLife: 5.0,
        maxLife: 10.0,
        minSpeed: 0.1,
        maxSpeed: 0.6,
        spread: Math.PI,
        minSize: 0.02,
        maxSize: 0.12,
        startColor: armColor,
        endColor: armEnd,
      })
    );
  }

  // Central nebula dust — warm glow
  systemIds.push(
    createParticleSystem(pc(400), {
      shape: 'sphere',
      segments: 4,
      gravity: 0,
      drag: 1.0,
      emitterX: 0,
      emitterY: 0,
      emitterZ: 0,
      emitRate: 50,
      minLife: 4.0,
      maxLife: 8.0,
      minSpeed: 0.2,
      maxSpeed: 1.5,
      spread: Math.PI,
      minSize: 0.08,
      maxSize: 0.35,
      startColor: 0xff6644,
      endColor: 0x220044,
    })
  );

  // Stellar nursery — bright blue sparks
  systemIds.push(
    createParticleSystem(pc(200), {
      shape: 'sphere',
      segments: 3,
      gravity: 0,
      drag: 0.995,
      emitterX: 0,
      emitterY: 0,
      emitterZ: 0,
      emitRate: 30,
      minLife: 1.0,
      maxLife: 3.0,
      minSpeed: 2,
      maxSpeed: 6,
      spread: Math.PI,
      minSize: 0.01,
      maxSize: 0.05,
      startColor: 0xffffff,
      endColor: 0x4488ff,
    })
  );

  // Distant background stars — slow drift
  systemIds.push(
    createParticleSystem(pc(500), {
      shape: 'sphere',
      segments: 3,
      gravity: 0,
      drag: 1.0,
      emitterX: 0,
      emitterY: 0,
      emitterZ: 0,
      emitRate: 35,
      minLife: 8.0,
      maxLife: 15.0,
      minSpeed: 0.05,
      maxSpeed: 0.3,
      spread: Math.PI,
      minSize: 0.01,
      maxSize: 0.04,
      startColor: 0xffffff,
      endColor: 0x8888cc,
    })
  );

  lightIds.push({
    id: createPointLight(0x6633ff, 6, 25, 0, 0, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    galaxy: true,
  });
  lightIds.push({
    id: createPointLight(0xff6600, 3, 15, 3, 0, 0),
    baseX: 3,
    baseZ: 0,
    phase: 1.0,
    galaxy: true,
  });

  orbitY = 6;
  orbitDist = 20;
}

// ── Scene 4: Waterfall — cascading water with mist and rainbow spray ──────────
function buildWaterfall() {
  const babylon = isBabylonBackend();
  setAmbientLight(0x446655, babylon ? 0.18 : 1.2);
  setFog(0x224433, 30, 65);
  enableBloom(babylon ? 0.95 : 0.6, babylon ? 0.45 : 0.3, babylon ? 0.18 : 0.4);

  // Lush green ground
  const floor = createPlane(50, 50, 0x336633, [0, 0, 0], {
    material: 'phong',
    roughness: 0.85,
  });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  // Cliff face — tall and wide
  propIds.push(
    createCube(10, 14, 3, 0x555544, [0, 7, -6], {
      material: 'phong',
      roughness: 0.95,
      metalness: 0.05,
    })
  );
  // Cliff top ledge
  propIds.push(
    createCube(8, 0.6, 2, 0x666655, [0, 14, -5], {
      material: 'phong',
      roughness: 0.85,
    })
  );
  // Side cliffs
  propIds.push(
    createCube(3, 10, 3, 0x554433, [-5.5, 5, -5], { material: 'phong', roughness: 0.9 })
  );
  propIds.push(createCube(3, 10, 3, 0x554433, [5.5, 5, -5], { material: 'phong', roughness: 0.9 }));

  // Translucent water sheets give the cascade a continuous body in both backends;
  // particles add spray, foam, and sparkle on top.
  const waterSheet = createPlane(3.2, 12.4, 0x66bbff, [0, 7.4, -3.45], {
    material: 'phong',
    transparent: true,
    opacity: 0.26,
    emissive: 0x2255aa,
    emissiveIntensity: 0.9,
    roughness: 0.18,
    metalness: 0.05,
    side: 'double',
  });
  propIds.push(waterSheet);

  const waterHighlight = createPlane(1.0, 11.6, 0xddeeff, [-0.75, 7.7, -3.38], {
    material: 'phong',
    transparent: true,
    opacity: 0.18,
    emissive: 0x88bbff,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    side: 'double',
  });
  propIds.push(waterHighlight);

  // Bright blue pool at base
  const pool = createCylinder(6, 0.4, 0x3388cc, [0, 0.2, 4], {
    material: 'phong',
    emissive: 0x1144aa,
    emissiveIntensity: 1.0,
    roughness: 0.05,
    metalness: 0.4,
  });
  propIds.push(pool);

  // Mossy rocks around pool
  const rockSpots = [
    [-4, 0.5, 7],
    [4.5, 0.6, 6],
    [-3, 0.4, 9],
    [5, 0.4, 8],
    [-5.5, 0.7, 4],
    [6, 0.5, 3],
    [-2, 0.3, 10],
    [3, 0.5, 10],
  ];
  for (const [rx, ry, rz] of rockSpots) {
    propIds.push(
      createSphere(0.5 + Math.random() * 0.5, 0x445544, [rx, ry, rz], 4, {
        material: 'phong',
        roughness: 0.85,
      })
    );
  }

  // --- MAIN WATERFALL: dense bright blue-white stream ---
  systemIds.push(
    createParticleSystem(pc(1200), {
      shape: 'sphere',
      segments: 4,
      emissive: 0x88bbff,
      emissiveIntensity: 1.8,
      blending: 'additive',
      opacity: 0.72,
      gravity: -8,
      drag: 0.995,
      emitterX: 0,
      emitterY: 14,
      emitterZ: -3.5,
      directionX: 0,
      directionY: -1,
      directionZ: 0,
      emitRate: 300,
      minLife: 0.8,
      maxLife: 1.6,
      minSpeed: 5,
      maxSpeed: 9,
      spread: 0.2,
      minSize: 0.1,
      maxSize: 0.35,
      sizeOverLife: [1.0, 0.9, 0.35],
      opacityOverLife: [0.8, 0.7, 0.15],
      startColor: 0xddeeff,
      endColor: 0x66aadd,
    })
  );

  // --- SECONDARY STREAM: slightly offset for width ---
  systemIds.push(
    createParticleSystem(pc(600), {
      shape: 'sphere',
      segments: 3,
      emissive: 0x77aaee,
      emissiveIntensity: 1.5,
      blending: 'additive',
      opacity: 0.65,
      gravity: -8,
      drag: 0.99,
      emitterX: -0.8,
      emitterY: 14,
      emitterZ: -3.2,
      directionX: 0,
      directionY: -1,
      directionZ: 0.08,
      emitRate: 140,
      minLife: 0.8,
      maxLife: 1.5,
      minSpeed: 4,
      maxSpeed: 8,
      spread: 0.25,
      minSize: 0.08,
      maxSize: 0.28,
      sizeOverLife: [1.0, 0.85, 0.25],
      opacityOverLife: [0.75, 0.65, 0.12],
      startColor: 0xccddff,
      endColor: 0x5599cc,
    })
  );

  // --- SPLASH: big dramatic upward spray at impact ---
  systemIds.push(
    createParticleSystem(pc(800), {
      shape: 'sphere',
      segments: 3,
      emissive: 0xaaddff,
      emissiveIntensity: 1.5,
      blending: 'additive',
      opacity: 0.68,
      gravity: -10,
      drag: 0.9,
      emitterX: 0,
      emitterY: 0.8,
      emitterZ: 2,
      directionX: 0,
      directionY: 1,
      directionZ: 0.35,
      emitRate: 150,
      minLife: 0.4,
      maxLife: 1.2,
      minSpeed: 4,
      maxSpeed: 14,
      spread: 0.8,
      minSize: 0.04,
      maxSize: 0.18,
      sizeOverLife: [0.8, 1.0, 0.25],
      opacityOverLife: [0.75, 0.6, 0.0],
      startColor: 0xffffff,
      endColor: 0x88ccee,
    })
  );

  // --- MIST CLOUD: large soft particles drifting from base ---
  systemIds.push(
    createParticleSystem(pc(400), {
      shape: 'sphere',
      segments: 4,
      emissive: 0x99bbcc,
      emissiveIntensity: 0.8,
      opacity: 0.42,
      gravity: -0.2,
      drag: 0.998,
      emitterX: 0,
      emitterY: 2,
      emitterZ: 5,
      directionX: 0,
      directionY: 0.25,
      directionZ: 1,
      emitRate: 55,
      minLife: 3.0,
      maxLife: 7.0,
      minSpeed: 0.2,
      maxSpeed: 1.2,
      spread: Math.PI * 0.7,
      minSize: 0.2,
      maxSize: 0.7,
      sizeOverLife: [0.4, 1.25, 1.7],
      opacityOverLife: [0.0, 0.3, 0.0],
      startColor: 0xddeeff,
      endColor: 0x99bbcc,
    })
  );

  // --- FINE SPRAY: bright blue-white water droplets ---
  systemIds.push(
    createParticleSystem(pc(300), {
      shape: 'sphere',
      segments: 3,
      emissive: 0x88ccff,
      emissiveIntensity: 1.2,
      blending: 'additive',
      opacity: 0.55,
      gravity: -8,
      drag: 0.94,
      emitterX: 2.5,
      emitterY: 3,
      emitterZ: 3,
      directionX: 0.4,
      directionY: 0.75,
      directionZ: 0.8,
      emitRate: 45,
      minLife: 0.6,
      maxLife: 2.0,
      minSpeed: 1,
      maxSpeed: 5,
      spread: 0.8,
      minSize: 0.02,
      maxSize: 0.08,
      opacityOverLife: [0.8, 0.5, 0.0],
      startColor: 0xcceeff,
      endColor: 0x4488cc,
    })
  );

  // --- STREAM: water flowing away from pool ---
  systemIds.push(
    createParticleSystem(pc(300), {
      shape: 'sphere',
      segments: 3,
      emissive: 0x66aacc,
      emissiveIntensity: 1.0,
      opacity: 0.55,
      gravity: -0.5,
      drag: 0.97,
      emitterX: 0,
      emitterY: 0.3,
      emitterZ: 9,
      directionX: 0,
      directionY: 0,
      directionZ: 1,
      emitRate: 55,
      minLife: 2.0,
      maxLife: 4.0,
      minSpeed: 0.5,
      maxSpeed: 2.0,
      spread: 0.3,
      minSize: 0.05,
      maxSize: 0.15,
      sizeOverLife: [0.8, 1.0, 0.55],
      opacityOverLife: [0.55, 0.45, 0.1],
      startColor: 0x88ccee,
      endColor: 0x5599aa,
    })
  );

  // Bright lights to illuminate the water
  lightIds.push({
    id: createPointLight(0xaaddff, 8, 25, 0, 8, -2),
    baseX: 0,
    baseZ: -2,
    phase: 0,
    waterfall: true,
  });
  lightIds.push({
    id: createPointLight(0x88ccff, 6, 20, 0, 2, 5),
    baseX: 0,
    baseZ: 5,
    phase: 1.5,
    waterfall: true,
  });
  lightIds.push({
    id: createPointLight(0x66aadd, 4, 18, -3, 5, 0),
    baseX: -3,
    baseZ: 0,
    phase: 3.0,
    waterfall: true,
  });
  lightIds.push({
    id: createPointLight(0xffffff, 3, 15, 2, 12, -4),
    baseX: 2,
    baseZ: -4,
    phase: 0.5,
    waterfall: true,
  });

  orbitY = 5;
  orbitDist = 16;
}

export function update(dt) {
  frameCount++;
  sceneTime += dt;
  burstCooldown = Math.max(0, burstCooldown - dt);

  // Camera orbit
  if (key('KeyA') || key('ArrowLeft')) orbitAngle -= dt * 1.2;
  if (key('KeyD') || key('ArrowRight')) orbitAngle += dt * 1.2;
  if (key('KeyW') || key('ArrowUp')) orbitY = Math.min(20, orbitY + dt * 5);
  if (key('KeyS') || key('ArrowDown')) orbitY = Math.max(2, orbitY - dt * 5);
  if (key('KeyQ')) orbitDist = Math.min(40, orbitDist + dt * 8);
  if (key('KeyE')) orbitDist = Math.max(6, orbitDist - dt * 8);

  const cx = Math.sin(orbitAngle) * orbitDist;
  const cz = Math.cos(orbitAngle) * orbitDist;
  setCameraPosition(cx, orbitY, cz);
  setCameraTarget(0, scene === 3 ? 0 : 2, 0);

  // Scene switch
  for (let i = 0; i < 5; i++) {
    if (keyp('Digit' + (i + 1)) || keyp('Numpad' + (i + 1))) {
      scene = i;
      buildScene(i);
    }
  }

  // Particle count controls: [ decrease, ] increase
  if (keyp('BracketLeft') && countStepIdx > 0) {
    countStepIdx--;
    countMultiplier = COUNT_STEPS[countStepIdx];
    buildScene(scene);
  }
  if (keyp('BracketRight') && countStepIdx < COUNT_STEPS.length - 1) {
    countStepIdx++;
    countMultiplier = COUNT_STEPS[countStepIdx];
    buildScene(scene);
  }

  // Manual burst
  if ((keyp('Space') || btnp(13)) && burstCooldown <= 0) {
    triggerBurst();
    burstCooldown = 0.3;
  }

  // Animated lights
  for (const ldata of lightIds) {
    const t = sceneTime + ldata.phase;
    if (ldata.snow) {
      // Gentle slow sway
      setPointLightPosition(
        ldata.id,
        ldata.baseX + Math.sin(t * 0.2) * 2,
        10 + Math.sin(t * 0.3) * 1,
        ldata.baseZ + Math.cos(t * 0.15) * 2
      );
    } else if (ldata.forge) {
      setPointLightPosition(
        ldata.id,
        (Math.random() - 0.5) * 0.4,
        1.0 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.4
      );
    } else if (ldata.electric) {
      setPointLightPosition(
        ldata.id,
        (Math.random() - 0.5) * 0.7,
        2.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.7
      );
    } else if (ldata.galaxy) {
      setPointLightPosition(
        ldata.id,
        ldata.baseX + Math.sin(t * 0.3) * 2,
        Math.sin(t * 0.5) * 1.5,
        ldata.baseZ + Math.cos(t * 0.3) * 2
      );
    } else if (ldata.waterfall) {
      setPointLightPosition(
        ldata.id,
        ldata.baseX + Math.sin(t * 0.8) * 0.5,
        (ldata.phase === 0 ? 6 : 2) + Math.sin(t * 1.2) * 0.5,
        ldata.baseZ + Math.cos(t * 0.6) * 0.3
      );
    } else {
      // Fire column flicker
      setPointLightPosition(
        ldata.id,
        ldata.baseX + (Math.random() - 0.5) * 0.7,
        2.8 + Math.sin(t * 14 + ldata.phase) * 0.6,
        ldata.baseZ + (Math.random() - 0.5) * 0.5
      );
    }
  }

  // Fire: breathing emitters for organic movement
  if (scene === 0) {
    const sway = Math.sin(sceneTime * 1.5) * 0.4;
    const breathe = Math.sin(sceneTime * 3) * 0.2;
    if (systemIds[0])
      setParticleEmitter(systemIds[0], { emitterX: sway * 0.3, emitterY: 0.8 + breathe });
    if (systemIds[1])
      setParticleEmitter(systemIds[1], { emitterX: -sway * 0.4, emitterZ: sway * 0.2 });
  }

  // Blizzard: gently drift snow emitters for natural variation
  if (scene === 1) {
    const windDrift = Math.sin(sceneTime * 0.15) * 3;
    for (let i = 0; i < 4; i++) {
      if (systemIds[i]) {
        setParticleEmitter(systemIds[i], {
          emitterX: [-6, 5, -4, 7][i] + windDrift,
        });
      }
    }
    // Occasional ground powder burst
    if (frameCount % 120 === 0 && systemIds[5]) burstParticles(systemIds[5], 40);
  }

  // Forge: auto-hammer every 1.4s
  if (scene === 2 && burstCooldown <= 0) {
    triggerBurst();
    burstCooldown = 1.4;
  }

  // Galaxy: rotate spiral arm emitters around center
  if (scene === 3) {
    for (let arm = 0; arm < 3; arm++) {
      const baseAngle = (arm * Math.PI * 2) / 3 + sceneTime * 0.15;
      const r = 4 + Math.sin(sceneTime * 0.3 + arm) * 1.5;
      if (systemIds[arm]) {
        setParticleEmitter(systemIds[arm], {
          emitterX: Math.cos(baseAngle) * r,
          emitterY: Math.sin(sceneTime * 0.2 + arm) * 0.5,
          emitterZ: Math.sin(baseAngle) * r,
        });
      }
    }
  }

  // Waterfall: wind sway on mist and splash, periodic surges
  if (scene === 4) {
    const windX = Math.sin(sceneTime * 0.5) * 1.5;
    // Sway the splash
    if (systemIds[2]) {
      setParticleEmitter(systemIds[2], { emitterX: windX * 0.3 });
    }
    // Drift the mist
    if (systemIds[3]) {
      setParticleEmitter(systemIds[3], { emitterX: windX * 0.5 });
    }
    // Periodic big splash surge
    if (frameCount % 70 === 0 && systemIds[2]) burstParticles(systemIds[2], 100);
  }

  updateParticles(dt);
}

function triggerBurst() {
  if (scene === 0) {
    // Massive ember eruption + extra flames
    if (systemIds[2]) burstParticles(systemIds[2], 200); // embers
    if (systemIds[0]) burstParticles(systemIds[0], 100); // core flames
    if (systemIds[4]) burstParticles(systemIds[4], 80); // ground heat
  } else if (scene === 1) {
    // Snow flurry burst from all emitters
    for (let i = 0; i < 4; i++) {
      if (systemIds[i]) burstParticles(systemIds[i], 60);
    }
    if (systemIds[5]) burstParticles(systemIds[5], 50); // ground powder
  } else if (scene === 2) {
    if (systemIds[0]) burstParticles(systemIds[0], 180);
    if (systemIds[1]) burstParticles(systemIds[1], 100);
    if (systemIds[3]) burstParticles(systemIds[3], 70);
  } else if (scene === 3) {
    // Supernova burst from center
    if (systemIds[4]) burstParticles(systemIds[4], 120);
    if (systemIds[3]) burstParticles(systemIds[3], 80);
  } else if (scene === 4) {
    // Massive splash eruption
    if (systemIds[2]) burstParticles(systemIds[2], 200);
    if (systemIds[4]) burstParticles(systemIds[4], 80); // rainbow spray
    if (systemIds[0]) burstParticles(systemIds[0], 100); // extra waterfall
  }
}

export function draw() {
  const total = systemIds.reduce((s, id) => {
    const st = getParticleStats(id);
    return s + (st ? st.active : 0);
  }, 0);

  drawRoundedRect(0, 0, 320, 14, 0, rgba8(0, 0, 0, 150));
  printCentered(
    '[1] Fire  [2] Snow  [3] Forge  [4] Galaxy  [5] Water',
    160,
    2,
    rgba8(220, 200, 150, 255)
  );

  drawRoundedRect(0, 220, 320, 20, 0, rgba8(0, 0, 0, 130));
  print(
    SCENES[scene] + '  ' + total + ' particles  [' + countMultiplier + 'x]',
    6,
    222,
    rgba8(180, 255, 180, 255)
  );
  print('[SPACE] Burst  [WASD] Orbit  [\\[\\]] Count', 6, 231, rgba8(110, 110, 110, 220));
}
