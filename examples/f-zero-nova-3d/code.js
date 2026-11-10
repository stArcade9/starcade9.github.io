// ⭐ F-ZERO NOVA 3D — Anti-Gravity Racing ⭐
// Daylight Orbital Speedway — original race rules, brighter road and racing liveries.

// ── Configuration ──────────────────────────────────────────
const { rgba8 } = nova64.draw;
const {
  createAdvancedCube,
  createCube,
  createInstancedMesh,
  createPlane,
  destroyMesh,
  finalizeInstances,
  rotateMesh,
  setInstanceTransform,
  setInstanceColor,
  setPosition,
  setRotation,
  setScale,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { createGradientSkybox, setAmbientLight, setFog, setLightColor, setLightDirection } =
  nova64.light;
const { enableBloom, enableFXAA } = nova64.fx;
const { btn, btnp, isKeyPressed, key } = nova64.input;
const { sfx } = nova64.audio;
const { centerX, clearButtons, createButton, updateAllButtons } = nova64.ui;
const {
  createHitState,
  createShake,
  getShakeOffset,
  isInvulnerable,
  triggerHit,
  triggerShake,
  updateHitState,
  updateShake,
} = nova64.util;

const C = {
  // Materials and Colors
  shipBody: 0x003dff,
  shipCockpit: 0x151a46,
  shipEngine: 0x84faff,
  shipTrim: 0xffffff,
  rivalBody: 0xee0033,
  rivalEngine: 0xff4422,

  bgFog: 0x283b92, // Cobalt atmosphere below the orbital course
  trackR1: 0x2758bd,
  trackR2: 0x183b91,
  neonWall: 0x240055, // Violet safety barriers
  neonWallAlt: 0x00ff75,
  boostPad: 0x24efb5,
  spark: 0x00ffff,
};

let gameState = 'start'; // 'start', 'countdown', 'playing', 'crashed', 'finished'
let t = 0; // global time
let inputLock = 0;
let playerHit;
let speedLineInstanceId = null; // GPU instanced speed lines
let countdownTimer = 0;
let shake;

// ── Game State ─────────────────────────────────────────────
let g = {
  speed: 0,
  maxSpeed: 250,
  boostSpeed: 400,
  dist: 0,
  health: 100,
  energy: 100, // Used for boosting
  rank: 10,
  passCount: 0,

  p: {
    x: 0,
    y: 1.5,
    z: 0,
    vx: 0,
    roll: 0,
    pitch: 0,
    meshes: {},
    isBoosting: false,
    invuln: 0,
  },

  trackWidth: 40,
  roadSegments: [],
  borders: [],
  props: [],
  rivals: [],
  particles: [],
  speedLines: [],

  propTimer: 0,
  rivalTimer: 0,
};

// ── Initialization ─────────────────────────────────────────
export async function init() {
  console.log('🏁 F-ZERO NOVA 3D (Ultimate) — Initializing Engine...');

  // Consistent start/chase framing; the sky carries the scale, not an extreme FOV.
  setCameraFOV(72);
  setCameraPosition(0, 7, 13);
  setCameraTarget(0, 0, -40);
  setAmbientLight(0xa0b7ff, 1.15);
  setLightDirection(-0.4, 1, 0.7);
  setLightColor(0xe6f7ff);
  setFog(C.bgFog, 260, 1100);
  createGradientSkybox(0x09052e, 0x2346aa, {
    horizonColor: C.bgFog,
    clouds: 0.12,
    cloudsLow: 0.3,
    cloudScale: 1.7,
    stars: 0.7,
    aurora: 0.48,
    auroraColors: [0x125dff, 0x8a23ff],
    wind: 0.4,
    sun: { dir: [0.6, 0.4, -1], color: 0xbdeaff, size: 0.35 },
  });
  nova64.light.enableSkyboxAutoAnimate(0.2);
  enableBloom(1.35, 0.85, 0.68);
  if (typeof enableFXAA === 'function') enableFXAA();
  nova64.post.setVignette(0.32, 0.92);
  nova64.post.setChromatic(0.0008);
  nova64.post.setGlitch(0);
  buildOrbitalSky();

  buildPlayerShip();
  playerHit = createHitState({ invulnDuration: 0.5, blinkRate: 40 });
  shake = createShake({ decay: 4 });
  initTrack();

  // Pre-fill track props & speed lines
  // Speed lines use GPU instancing (40 cubes → 1 instanced mesh)
  speedLineInstanceId = createInstancedMesh('cube', 40, 0xaabbff, {
    size: 1,
    material: 'emissive',
    emissive: 0xaabbff,
    emissiveIntensity: 1.0,
  });
  for (let i = 0; i < 40; i++) spawnSpeedLine(i);
  finalizeInstances(speedLineInstanceId);
  for (let i = 0; i < 5; i++) {
    g.propTimer += 0.5;
    updateTrackSpawns(1);
    g.rivalTimer += 0.5;
    updateRivals(1);
  }

  initStartScreen();
}

// Distant bodies remain fixed while the road moves: true scale separation from near-field parallax.
let orbitalMeshes = [];
let stationRings = [];
let glitchRemaining = 0;
let previousBoost = false;
let previousHealth = 100;
let visualBoost = 0;
function buildOrbitalSky() {
  orbitalMeshes.forEach(destroyMesh);
  orbitalMeshes = [];
  stationRings = [];
  const sphere = (radius, color, pos, opts = {}) => {
    const id = nova64.scene.createSphere(radius, color, pos, { segments: 32, ...opts });
    orbitalMeshes.push(id);
    return id;
  };
  const ring = (radius, tube, color, pos, rotation, opts = {}) => {
    const id = nova64.scene.createTorus(radius, tube, color, pos, {
      radialSegments: 8,
      tubularSegments: 80,
      ...opts,
    });
    setRotation(id, ...rotation);
    orbitalMeshes.push(id);
    return id;
  };
  const center = [-100, 135, -530];
  sphere(125, 0x1142bc, center, { roughness: 0.9, emissive: 0x061d70, emissiveIntensity: 0.22 });
  sphere(128, 0x00baff, center, {
    transparent: true,
    opacity: 0.09,
    emissive: 0x00baff,
    emissiveIntensity: 0.4,
  });
  for (let i = 0; i < 9; i++)
    ring(155 + i * 3.2, 0.8, i % 3 ? 0x598dff : 0x00ffbc, center, [1.15, -0.25, -0.35], {
      emissive: i % 3 ? 0x315dff : 0x00ffbc,
      emissiveIntensity: 0.4,
    });
  // Sculpted latitudinal bands read as cloud belts rather than a featureless ball.
  for (let i = -3; i <= 3; i++) {
    const y = i * 26,
      r = Math.sqrt(125 * 125 - y * y);
    ring(
      r,
      2.5,
      i % 2 ? 0x1744d2 : 0x16b4cf,
      [center[0], center[1] + y, center[2]],
      [Math.PI / 2, 0, 0]
    );
  }
  sphere(30, 0x9bc2f2, [210, 115, -600], { emissive: 0x301291, emissiveIntensity: 0.25 });
  // A rotating orbital station high above the racing corridor.
  for (let i = 0; i < 3; i++) {
    const id = ring(
      34 + i * 11,
      0.8,
      i === 1 ? 0x00ff9c : 0x4b40ff,
      [105, 61, -260],
      [0.3 + i * 0.35, 0.4, i * 0.5],
      { emissive: i === 1 ? 0x00ff9c : 0x3131ff, emissiveIntensity: 0.45 }
    );
    stationRings.push(id);
  }
  sphere(7, 0x08cfff, [105, 61, -260], { emissive: 0x08cfff, emissiveIntensity: 0.45 });
}
function updateVisualEffects(dt) {
  const boosting = g.p.isBoosting && gameState === 'playing';
  if ((boosting && !previousBoost) || g.health < previousHealth) glitchRemaining = 0.22;
  previousBoost = boosting;
  previousHealth = g.health;
  glitchRemaining = Math.max(0, glitchRemaining - dt);
  visualBoost += (Number(boosting) - visualBoost) * (1 - Math.exp(-dt * 9));
  nova64.fx.setGlitchIntensity(glitchRemaining > 0 ? 0.12 * (glitchRemaining / 0.22) : 0);
  nova64.fx.setBloomStrength(1.35 + visualBoost * 0.65);
  nova64.post.setChromatic(0.0008 + visualBoost * 0.002);
  stationRings.forEach((id, i) =>
    setRotation(
      id,
      0.3 + i * 0.35 + Math.sin(t * 0.16) * 0.12,
      0.4 + t * (i % 2 ? 0.07 : -0.05),
      i * 0.5 + t * 0.025
    )
  );
}

// ── Entity Construction ────────────────────────────────────
function buildPlayerShip() {
  const p = g.p;
  // Sleek wedge shape (Metallic)
  p.meshes.body = createCube(2.0, C.shipBody, [p.x, p.y, p.z], {
    material: 'metallic',
    metalness: 0.25,
    roughness: 0.42,
  });
  setScale(p.meshes.body, 1.0, 0.3, 2.5);

  p.meshes.wingL = createCube(1.0, C.shipTrim, [p.x - 1.8, p.y, p.z + 0.5], {
    material: 'metallic',
  });
  setScale(p.meshes.wingL, 1.5, 0.18, 3.0);

  p.meshes.wingR = createCube(1.0, C.shipTrim, [p.x + 1.8, p.y, p.z + 0.5], {
    material: 'metallic',
  });
  setScale(p.meshes.wingR, 1.5, 0.18, 3.0);

  p.meshes.cockpit = createCube(1.0, C.shipCockpit, [p.x, p.y + 0.5, p.z - 0.5], {
    material: 'standard',
    metalness: 0.3,
    roughness: 0.25,
  });
  setScale(p.meshes.cockpit, 0.6, 0.5, 1.2);

  // Twin Engines
  p.meshes.engL = createCube(0.8, C.shipEngine, [p.x - 0.6, p.y, p.z + 2.5], {
    material: 'emissive',
    emissive: C.shipEngine,
  });
  p.meshes.engR = createCube(0.8, C.shipEngine, [p.x + 0.6, p.y, p.z + 2.5], {
    material: 'emissive',
    emissive: C.shipEngine,
  });
  p.meshes.nose = nova64.scene.createCone(0.95, 3.2, C.shipBody, [0, 0, 0], { segments: 4 });
  setScale(p.meshes.nose, 1, 1, 0.35);
  p.meshes.finL = createCube(1, C.shipBody, [0, 0, 0]);
  p.meshes.finR = createCube(1, C.shipBody, [0, 0, 0]);
  setScale(p.meshes.finL, 0.16, 1.0, 1.8);
  setScale(p.meshes.finR, 0.16, 1.0, 1.8);
}

function initTrack() {
  const segLen = 40;
  // Checkerboard pattern rolling floor
  for (let i = 0; i < 15; i++) {
    const z = -i * segLen + 20;
    const color = i % 2 === 0 ? C.trackR1 : C.trackR2;
    const mesh = createPlane(g.trackWidth, segLen, color, [0, -1, z], {
      material: 'standard',
      roughness: 0.8,
    });
    rotateMesh(mesh, -Math.PI / 2, 0, 0);
    g.roadSegments.push({
      mesh,
      z,
      len: segLen,
      activeColor: color,
      details: buildRoadDetails(i, z),
    });

    // Left & Right neon border rails
    const wl = createCube(1.0, C.neonWall, [-g.trackWidth / 2 - 1, 0, z], {
      material: 'standard',
      roughness: 0.8,
    });
    setScale(wl, 1.0, 2.0, segLen);
    const wr = createCube(1.0, C.neonWall, [g.trackWidth / 2 + 1, 0, z], {
      material: 'standard',
      roughness: 0.8,
    });
    setScale(wr, 1.0, 2.0, segLen);
    g.borders.push({ wl, wr, z, len: segLen });
  }
}

// Decorative pieces follow the existing rolling segments; the collision corridor stays ±18.5.
function buildRoadDetails(index, z) {
  const details = [];
  const add = (x, y, dz, w, h, d, color, rz = 0) => {
    details.push({ x, y, dz, w, h, d, color, rz });
  };
  for (const side of [-1, 1]) {
    add(side * 18.8, -0.86, 0, 0.32, 0.08, 40, 0xffffff);
    add(side * 20.9, 1.1, 0, 1.1, 0.18, 40, 0x00ff75);
    for (let j = -16; j < 20; j += 8) add(side * 17.8, -0.84, j, 0.55, 0.1, 3.5, 0x332858);
    add(side * 28, -4, 0, 3, 15, 4, 0x665780);
    add(side * 30, 4, 0, 6, 1, 5, 0xe9e5f2);
  }
  for (const x of [-6.5, 6.5]) for (const dz of [-12, 8]) add(x, -0.82, dz, 0.2, 0.12, 8, 0xf7f3ff);
  if (index % 5 === 0) {
    for (const side of [-1, 1]) add(side * 24, 9, 0, 2, 20, 3, 0x3a2c68);
    add(0, 19, 0, 50, 2, 3, 0xf3effa);
    add(0, 18.7, 1.7, 17, 0.9, 0.2, 0x156fe0);
    for (let n = -3; n <= 3; n++) add(n * 2, 18.7, 1.9, 0.8, 0.7, 0.2, 0x00ff75);
  }
  if (index === 0)
    for (let x = -18; x < 20; x += 2)
      for (let dz = -2; dz <= 0; dz += 2)
        add(x, -0.78, dz, 2, 0.1, 2, (x / 2 + dz / 2) % 2 ? 0xffffff : 0x292042);
  if (index % 3 === 0) {
    add(-47, 16, 0, 14, 40, 12, 0x38206e);
    add(-47, 36, 0, 19, 2, 16, 0xe9e5f2);
    for (let y = 4; y < 35; y += 6) add(-39.8, y, 0, 0.25, 1.2, 9, 0x7ddef4);
  }
  if (index % 3 === 1) {
    add(44, 10, 0, 18, 24, 12, 0x434c93);
    add(44, 23, 0, 25, 2, 16, 0xe8f1ff);
    add(44, 28, 0, 1, 9, 1, 0x0055ff);
  }
  for (const side of [-1, 1]) {
    for (let j = -15; j <= 15; j += 10) {
      add(side * 19.5, -0.7, j, 0.35, 0.12, 6, 0x00eaff);
      add(side * 16, -0.8, j, 3, 0.1, 0.4, 0x00ff75);
    }
    // Leaning buttresses, suspended balconies and holographic facade strips.
    add(side * 36, 13, 0, 2, 28, 3, 0x132263, side * 0.25);
    add(side * 40, 26, 0, 18, 1.1, 13, 0x00bbff);
    add(side * 50, 24, 0, 9, 48, 9, index % 2 ? 0x1b1976 : 0x073e8f);
    for (let y = 5; y < 47; y += 5)
      add(side * 45.3, y, 0, 0.25, 0.8, 8, index % 2 ? 0x00ff75 : 0x008bff);
  }
  if (index % 3 === 0) {
    // Faceted gateway, always outside the unchanged collision corridor.
    for (const side of [-1, 1]) {
      add(side * 24, 10, 0, 1, 22, 1.2, 0x00aaff, side * 0.22);
      add(side * 12, 22, 0, 25, 0.6, 1.2, 0x00ff75, side * 0.12);
      add(side * 27, 10, 2, 1, 22, 1, 0x6240ff, side * 0.22);
    }
  }
  // Small white arrows remain legible on the blue running surface.
  for (const x of [-10, 10]) add(x, -0.77, -8, 3, 0.1, 0.7, 0xeaffff);
  const luminous = new Set([0x00ff75, 0x00eaff, 0x00aaff, 0x00bbff, 0x008bff, 0x6240ff, 0x7ddef4]);
  const batches = [false, true].map(glow => {
    const items = details.filter(d => luminous.has(d.color) === glow);
    const mesh = createInstancedMesh('cube', items.length, 0xffffff, {
      size: 1,
      roughness: 0.7,
      emissive: glow ? 0x0077b8 : 0,
      emissiveIntensity: glow ? 0.4 : 0,
    });
    if (glow) nova64.scene.setMeshEmissive(mesh, 0x0077b8, 1.4);
    items.forEach((d, i) => {
      setInstanceColor(mesh, i, d.color);
      setInstanceTransform(mesh, i, d.x, d.y, z + d.dz, 0, 0, d.rz, d.w, d.h, d.d);
    });
    finalizeInstances(mesh);
    return { mesh, items };
  });
  return { batches };
}

function spawnRival(isFar = false) {
  const x = (Math.random() - 0.5) * (g.trackWidth - 8);
  const z = isFar ? -400 : -200 - Math.random() * 100;

  // Basic rival shape
  const livery = [0xff2400, 0x00ff75, 0x00ffc8, 0xff008c][g.rivals.length % 4];
  const body = createCube(2.0, livery, [x, 1.5, z], {
    material: 'standard',
    metalness: 0.2,
    roughness: 0.45,
  });
  setScale(body, 1.0, 0.5, 2.0);
  const eng = createCube(0.8, C.rivalEngine, [x, 1.5, z + 2.0], {
    material: 'emissive',
    emissive: C.rivalEngine,
  });
  setScale(eng, 1.8, 0.6, 0.5);

  const foil = createCube(1, 0xf1edff, [x, 1.5, z]);
  setScale(foil, 4.2, 0.18, 1.0);
  const cockpit = createCube(1, 0x261947, [x, 2.1, z]);
  setScale(cockpit, 0.75, 0.5, 1.7);
  const fin = createCube(1, livery, [x, 2, z]);
  setScale(fin, 0.18, 1.3, 1.3);

  const speedMultiplier = 0.5 + Math.random() * 0.4; // They travel at 50-90% of max speed

  g.rivals.push({
    meshes: [body, eng, foil, cockpit, fin],
    x,
    y: 1.5,
    z,
    vx: (Math.random() - 0.5) * 10,
    speed: g.maxSpeed * speedMultiplier,
    passed: false,
  });
}

function spawnSpeedLine(instanceIdx = -1) {
  const x = (Math.random() - 0.5) * g.trackWidth * 1.4;
  const y = 1 + Math.random() * 8;
  const z = -400 + Math.random() * 450;
  const len = 8.0 + Math.random() * 12;

  const idx = instanceIdx >= 0 ? instanceIdx : g.speedLines.length;
  if (speedLineInstanceId !== null) {
    setInstanceTransform(speedLineInstanceId, idx, x, y, z, 0, 0, 0, 0.1, 0.1, len);
  }
  g.speedLines.push({ idx, x, y, z, len });
}

function spawnMine() {
  const x = (Math.random() - 0.5) * 45;
  const z = -400 - Math.random() * 200;

  const mesh = createAdvancedCube(3, { material: 'emissive', emissive: 0xff0000, intensity: 2 }, [
    x,
    0,
    z,
  ]);
  g.props.push({ type: 'mine', mesh, x: x, z: z, active: true, throb: 0 });
}

function spawnBoostPad() {
  const x = (Math.random() - 0.5) * (g.trackWidth - 10);
  const z = -350;

  const mesh = createPlane(6, 12, C.boostPad, [x, -0.9, z], {
    material: 'emissive',
    emissive: C.boostPad,
  });
  rotateMesh(mesh, -Math.PI / 2, 0, 0);

  const markings = [];
  for (let j = -4; j <= 4; j += 2) {
    const stripe = createCube(1, 0x163c60, [x, -0.82, z + j]);
    setScale(stripe, 4.8, 0.06, 0.4);
    markings.push({ mesh: stripe, dz: j });
  }
  g.props.push({ type: 'boost', mesh, x, z, active: true, markings });
}

function createSparks(cx, cy, cz, count) {
  for (let i = 0; i < count; i++) {
    const mesh = createCube(0.4, C.spark, [cx, cy, cz], {
      material: 'emissive',
      emissive: C.spark,
    });
    const spd = 20 + Math.random() * 30;
    const a = Math.random() * Math.PI * 2;
    g.particles.push({
      mesh,
      x: cx,
      y: cy,
      z: cz,
      vx: Math.cos(a) * spd,
      vy: Math.abs(Math.sin(a)) * spd + 10,
      vz: Math.random() * 20 - 10,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.8,
    });
  }
}

// ── Game Loop Update ───────────────────────────────────────
export function update(dt) {
  t += dt;
  updateVisualEffects(dt);

  if (gameState !== 'playing' && gameState !== 'countdown') {
    if (inputLock > 0) inputLock -= dt;
    updateAllButtons();
    updateMenuAnim(dt);
    if (gameState === 'start' && inputLock <= 0 && (isKeyPressed('Space') || btnp(13))) startGame();
    return;
  }

  if (gameState === 'countdown') {
    countdownTimer -= dt;
    updateMenuAnim(dt);
    if (countdownTimer <= 0) {
      gameState = 'playing';
      sfx('confirm');
    } else if (countdownTimer < 1 || countdownTimer < 2 || countdownTimer < 3) {
      // sfx on each count handled in draw
    }
    return;
  }

  // Ship logic
  const p = g.p;
  updateHitState(playerHit, dt);
  updateShake(shake, dt);
  if (g.health <= 0) {
    createSparks(p.x, p.y, p.z, 40);
    // Hide ALL ship parts
    Object.values(p.meshes).forEach(m => m && setPosition(m, 1000, 0, 0));
    gameState = 'crashed';
    inputLock = 1.0;
    sfx('death');
    initGameOver();
    return;
  }

  // Controls
  let ix = 0;
  if (key('ArrowLeft') || key('KeyA') || btn(14)) ix = -1;
  if (key('ArrowRight') || key('KeyD') || btn(15)) ix = 1;

  // Shifting/Drifting (L/R Bumpers or Q/E)
  if (key('KeyQ') || btn(4)) ix -= 1.5;
  if (key('KeyE') || btn(5)) ix += 1.5;

  const latAccel = 120;
  p.vx += ix * latAccel * dt;
  p.vx *= 1 - 4.5 * dt; // handling friction

  // Update speed automatically
  let targetSpeed = g.maxSpeed;
  if (p.isBoosting) targetSpeed = g.boostSpeed;

  // Acceleration / declaration matching
  if (g.speed < targetSpeed) g.speed += 150 * dt;
  else g.speed -= 80 * dt;

  // Engine energy passively recharges
  g.energy = Math.min(100, g.energy + dt * 5);

  // Manual boost (Space or A button)
  if ((key('Space') || btn(0)) && g.energy > 30 && !p.isBoosting) {
    p.isBoosting = true;
    sfx('powerup');
  }
  if (p.isBoosting) {
    g.energy -= 40 * dt;
    if (g.energy <= 0) p.isBoosting = false;
  } else if (!key('Space') && !btn(0)) {
    p.isBoosting = false; // Release to cancel
  }

  p.x += p.vx * dt;

  // Wall collisions
  const bw = g.trackWidth / 2 - 1.5;
  if (p.x < -bw) {
    p.x = -bw;
    p.vx = 40;
    hitWall(-bw);
  }
  if (p.x > bw) {
    p.x = bw;
    p.vx = -40;
    hitWall(bw);
  }

  p.roll += (-p.vx * 0.015 - p.roll) * 10 * dt; // Lean into turns

  updatePlayerTransforms();

  g.dist += g.speed * dt;

  // Progress World
  const relSpeed = g.speed * dt;
  updateRoad(relSpeed);
  updateTrackSpawns(dt);
  updateRivals(dt);
  updateProps(dt);
  updateParticles(dt, relSpeed);

  // Dynamic Camera (Lags slightly behind ship x-movement)
  const [shakeX, shakeY] = getShakeOffset(shake);
  const camX = p.x * 0.4 + p.vx * 0.05;
  // Tween FOV for sense of speed
  setCameraFOV(72 + (p.isBoosting ? 6 : 0) * Math.min(1, g.speed / g.boostSpeed));

  const camY = 7 - p.pitch * 3;
  setCameraPosition(camX + shakeX, camY + shakeY, 13);
  setCameraTarget(camX * 1.25, 0, -55);

  // Track win
  if (g.dist > 30000 && g.rank <= 1) {
    // reached end in 1st
    gameState = 'finished';
    inputLock = 1.0;
    sfx('powerup');
    initWinScreen();
  }
}

function hitWall(xPos) {
  g.health -= 5;
  g.speed *= 0.6; // heavy slow down
  playerHit.invulnTimer = 0.2;
  createSparks(g.p.x + (xPos < 0 ? -1.5 : 1.5), g.p.y, g.p.z, 8);
  triggerShake(shake, 0.5);
  sfx('hit');
}

function updatePlayerTransforms() {
  const p = g.p;
  if (!p.meshes.body) return;

  const r = p.roll;
  const cr = Math.cos(r),
    sr = Math.sin(r);

  // Hover bob
  p.y = 1.5 + Math.sin(t * 10) * 0.15;

  const applyR = (ox, oy, oz) => [p.x + ox * cr - oy * sr, p.y + ox * sr + oy * cr, p.z + oz];

  setPosition(p.meshes.body, ...applyR(0, 0, 0));
  setRotation(p.meshes.body, p.pitch, 0, r);

  setPosition(p.meshes.wingL, ...applyR(-1.8, 0, 0.5));
  setRotation(p.meshes.wingL, p.pitch, 0, r);

  setPosition(p.meshes.wingR, ...applyR(1.8, 0, 0.5));
  setRotation(p.meshes.wingR, p.pitch, 0, r);

  setPosition(p.meshes.cockpit, ...applyR(0, 0.5, -0.5));
  setRotation(p.meshes.cockpit, p.pitch, 0, r);

  setPosition(p.meshes.nose, ...applyR(0, 0, -2.6));
  setRotation(p.meshes.nose, p.pitch - Math.PI / 2, 0, r);
  for (const [name, x] of [
    ['finL', -1.8],
    ['finR', 1.8],
  ]) {
    setPosition(p.meshes[name], ...applyR(x, 0.5, 1.2));
    setRotation(p.meshes[name], p.pitch, 0, r);
  }

  // Glow flicker based on boosting
  const engineScl = p.isBoosting ? 1.5 + Math.random() * 0.5 : 1.0 + Math.random() * 0.2;

  setPosition(p.meshes.engL, ...applyR(-0.6, 0, 2.5));
  setRotation(p.meshes.engL, p.pitch, 0, r);
  setScale(p.meshes.engL, 0.5, 0.45, engineScl * (p.isBoosting ? 4 : 0.65));

  setPosition(p.meshes.engR, ...applyR(0.6, 0, 2.5));
  setRotation(p.meshes.engR, p.pitch, 0, r);
  setScale(p.meshes.engR, 0.5, 0.45, engineScl * (p.isBoosting ? 4 : 0.65));
}

function updateRoad(distMovement) {
  g.roadSegments.forEach(r => {
    r.z += distMovement;
    if (r.z > 30) r.z -= g.roadSegments.length * r.len;
    // Emphasize speed by flattening road pitch based on Z
    setPosition(r.mesh, 0, -1, r.z);
    r.details.batches.forEach(batch => {
      batch.items.forEach((d, i) =>
        setInstanceTransform(batch.mesh, i, d.x, d.y, r.z + d.dz, 0, 0, d.rz, d.w, d.h, d.d)
      );
      finalizeInstances(batch.mesh);
    });
  });

  g.borders.forEach(b => {
    b.z += distMovement;
    if (b.z > 30) b.z -= g.borders.length * b.len;
    setPosition(b.wl, -g.trackWidth / 2 - 1, 0, b.z);
    setPosition(b.wr, g.trackWidth / 2 + 1, 0, b.z);
  });
}

function updateTrackSpawns(dt) {
  g.propTimer -= dt;
  if (g.propTimer <= 0) {
    if (Math.random() < 0.6) spawnBoostPad();
    else if (Math.random() < 0.8) spawnMine();

    g.propTimer = 1.0 + Math.random() * 2.0;
  }
}

function updateRivals(dt) {
  g.rivalTimer -= dt;
  if (g.rivalTimer <= 0 && g.rivals.length < 8) {
    spawnRival(true);
    g.rivalTimer = 1.5 + Math.random() * 2.5;
  }

  const p = g.p;
  for (let i = g.rivals.length - 1; i >= 0; i--) {
    let r = g.rivals[i];

    // Relative movement
    const relSpeed = g.speed - r.speed;
    r.z += relSpeed * dt;

    r.x += r.vx * dt;
    if (r.x < -18 || r.x > 18) r.vx *= -1;

    r.y = 1.5 + Math.sin(t * 8 + i) * 0.3;

    setPosition(r.meshes[0], r.x, r.y, r.z);
    setRotation(r.meshes[0], 0, 0, -r.vx * 0.05);

    setPosition(r.meshes[1], r.x, r.y, r.z + 2.0);
    setRotation(r.meshes[1], 0, 0, -r.vx * 0.05);

    setPosition(r.meshes[2], r.x, r.y, r.z + 0.5);
    setPosition(r.meshes[3], r.x, r.y + 0.65, r.z - 0.4);
    setPosition(r.meshes[4], r.x, r.y + 0.7, r.z + 1.2);
    for (let n = 2; n < r.meshes.length; n++) setRotation(r.meshes[n], 0, 0, -r.vx * 0.05);

    // Passed mechanic
    if (!r.passed && r.z > p.z + 2) {
      r.passed = true;
      g.passCount++;
      g.rank = Math.max(1, 10 - g.passCount);
      sfx('coin');
    }

    // Collision with player
    if (!isInvulnerable(playerHit) && Math.abs(r.z - p.z) < 3.5 && Math.abs(r.x - p.x) < 2.5) {
      g.health -= 15;
      g.speed *= 0.7; // lose heavy momentum
      triggerHit(playerHit);
      triggerShake(shake, 0.8);
      sfx('explosion');
      r.vx = r.x > p.x ? 15 : -15; // knock away
      createSparks((r.x + p.x) / 2, 1.5, p.z, 15);
    }

    // Clean up
    if (r.z > 50) {
      r.meshes.forEach(m => destroyMesh(m));
      g.rivals.splice(i, 1);
    }
  }
}

function updateProps(dt) {
  for (let i = g.props.length - 1; i >= 0; i--) {
    let p = g.props[i];
    p.z += g.speed * dt;
    setPosition(p.mesh, p.x, -0.9, p.z);
    p.markings?.forEach(d => setPosition(d.mesh, p.x, -0.82, p.z + d.dz));

    // Boost Pad hit detection
    if (
      p.active &&
      p.type === 'boost' &&
      Math.abs(p.z - g.p.z) < 4.0 &&
      Math.abs(p.x - g.p.x) < 4.0
    ) {
      p.active = false;
      g.p.isBoosting = true;
      g.energy = Math.min(100, g.energy + 50); // Restore energy
      g.speed = g.boostSpeed + 50; // Extra burst
      createSparks(g.p.x, -0.5, g.p.z, 20);
      sfx('powerup');
    }

    // Mine collision detection
    if (
      p.active &&
      p.type === 'mine' &&
      !isInvulnerable(playerHit) &&
      Math.abs(p.z - g.p.z) < 3.0 &&
      Math.abs(p.x - g.p.x) < 3.0
    ) {
      p.active = false;
      g.health -= 25;
      g.speed *= 0.4;
      triggerHit(playerHit);
      triggerShake(shake, 1.2);
      createSparks(p.x, 0, p.z, 30);
      sfx('explosion');
    }

    if (p.z > 30) {
      destroyMesh(p.mesh);
      p.markings?.forEach(d => destroyMesh(d.mesh));
      g.props.splice(i, 1);
    }
  }
}

function updateParticles(dt, ds) {
  // Environmental speed stars/lines
  let linesUpdated = false;
  g.speedLines.forEach(sl => {
    sl.z += ds * 1.5; // lines fly past faster
    if (sl.z > 40) sl.z -= 500;
    if (speedLineInstanceId !== null) {
      setInstanceTransform(
        speedLineInstanceId,
        sl.idx,
        sl.x,
        sl.y,
        sl.z,
        0,
        0,
        0,
        g.p.isBoosting ? 0.08 : 0.015,
        g.p.isBoosting ? 0.08 : 0.015,
        sl.len * (g.p.isBoosting ? 1 : 0.1)
      );
      linesUpdated = true;
    }
  });
  if (linesUpdated && speedLineInstanceId !== null) finalizeInstances(speedLineInstanceId);

  // Active sparks
  for (let i = g.particles.length - 1; i >= 0; i--) {
    let p = g.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += (p.vz + g.speed) * dt;
    p.vy -= 40 * dt; // gravity
    p.life -= dt;

    let a = Math.max(0.01, p.life / p.maxLife);
    setScale(p.mesh, a, a, a);
    setPosition(p.mesh, p.x, p.y, p.z);

    if (p.life <= 0) {
      destroyMesh(p.mesh);
      g.particles.splice(i, 1);
    }
  }
}

function updateMenuAnim(dt) {
  // Make ship hover idly on menu
  updateRoad(200 * dt);
  const p = g.p;
  p.y = 1.8 + Math.sin(t * 3) * 0.3;
  p.roll = Math.sin(t * 2) * 0.1;
  p.pitch = Math.sin(t * 1.5) * 0.05;

  if (gameState !== 'crashed') updatePlayerTransforms();
}

// ── Screen Rendering ───────────────────────────────────────
export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  if (gameState === 'countdown') {
    drawCountdown();
    return;
  }
  if (gameState === 'crashed') {
    drawCrashedScreen();
    return;
  }
  if (gameState === 'finished') {
    drawFinishScreen();
    return;
  }

  // Playing HUD
  drawHUD();
}

// HUD coordinates share the input system's 640 x 360 design space.
function hudRect(x, y, w, h, color) {
  const d = nova64.draw;
  d.rect(
    (x * d.screenWidth()) / 640,
    (y * d.screenHeight()) / 360,
    (w * d.screenWidth()) / 640,
    (h * d.screenHeight()) / 360,
    color,
    true
  );
}
function hudText(label, x, y, color, scale = 1) {
  const d = nova64.draw;
  d.print(
    label,
    (x * d.screenWidth()) / 640,
    (y * d.screenHeight()) / 360,
    color,
    scale * Math.min(d.screenWidth() / 640, d.screenHeight() / 360)
  );
}
const HUD = {
  ink: rgba8(5, 1, 18, 255),
  white: rgba8(250, 250, 255, 255),
  green: rgba8(0, 255, 117, 255),
  blue: rgba8(0, 233, 255, 255),
};
function orbitMark(x, y, color) {
  for (let i = 0; i < 3; i++) {
    hudRect(x + i * 10, y + i * 3, 6, 20 - i * 5, color);
    hudRect(x + 30, y + i * 7, 13 - i * 4, 3, color);
  }
}
function drawHUD() {
  hudRect(12, 10, 616, 24, HUD.ink);
  orbitMark(20, 12, HUD.green);
  hudText('NOVA / ORBITAL RACING AUTHORITY', 78, 18, HUD.white, 0.85);
  hudText('ENDURANCE CLASS / 30K', 486, 18, HUD.blue, 0.8);
  hudRect(12, 42, 89, 77, HUD.green);
  hudText('POSITION', 20, 50, HUD.ink, 0.85);
  hudText(String(g.rank).padStart(2, '0'), 20, 66, HUD.ink, 4.5);
  hudText('/10', 70, 103, HUD.ink, 0.9);
  hudRect(105, 42, 136, 26, HUD.white);
  hudText(`${(g.dist / 1000).toFixed(1)} / 30.0 KM`, 114, 51, HUD.ink, 1);
  hudRect(105, 72, 136, 5, HUD.ink);
  hudRect(105, 72, 136 * Math.min(1, g.dist / 30000), 5, HUD.green);
  hudRect(506, 42, 122, 60, HUD.ink);
  hudText('VELOCITY / KMH', 516, 50, HUD.blue, 0.8);
  hudText(String(Math.floor(g.speed)).padStart(3, '0'), 516, 68, HUD.white, 3.1);
  for (let i = 0; i < 16; i++)
    hudRect(508 + i * 7.5, 108, 5, 4, i < g.speed / 25 ? HUD.green : HUD.ink);
  hudRect(188, 306, 264, 42, HUD.ink);
  hudRect(188, 306, 32, 42, HUD.white);
  hudText('N', 196, 318, HUD.ink, 2.5);
  hudText('HULL', 230, 314, HUD.white, 0.75);
  hudText(g.p.isBoosting ? 'BOOST ACTIVE' : 'BOOST / SPACE', 338, 314, HUD.blue, 0.75);
  for (let i = 0; i < 10; i++) {
    hudRect(230 + i * 9, 333, 6, 6, i < g.health / 10 ? HUD.green : rgba8(36, 24, 62, 255));
    hudRect(338 + i * 9, 333, 6, 6, i < g.energy / 10 ? HUD.blue : rgba8(36, 24, 62, 255));
  }
  if (isInvulnerable(playerHit)) {
    const a = Math.floor(20 + (Math.sin(t * 10) * 0.5 + 0.5) * 30);
    hudRect(0, 0, 6, 360, rgba8(255, 60, 40, a));
    hudRect(634, 0, 6, 360, rgba8(255, 60, 40, a));
  }
}
function drawCountdown() {
  drawHUD();
  hudRect(280, 130, 80, 86, HUD.green);
  hudText('IGNITION', 290, 140, HUD.ink, 0.9);
  hudText(String(Math.max(1, Math.ceil(countdownTimer))), 302, 165, HUD.ink, 5);
}
function drawStartScreen() {
  hudRect(24, 24, 352, 154, HUD.ink);
  orbitMark(40, 36, HUD.green);
  hudText('NOVA / RACING AUTHORITY', 100, 43, HUD.blue, 1);
  hudText('F-ZERO', 40, 70, HUD.white, 5.5);
  hudText('NOVA_09', 40, 119, HUD.green, 4.4);
  hudRect(380, 24, 50, 154, HUD.green);
  hudText('30', 388, 39, HUD.ink, 2.7);
  hudText('KM', 393, 72, HUD.ink, 1.5);
  for (let n = 0; n < 9; n++) hudRect(390, 107 + n * 6, 30, 2, HUD.ink);
  hudRect(24, 183, 406, 25, HUD.white);
  hudText('DAYLIGHT ORBITAL / ENDURANCE DIVISION', 36, 191, HUD.ink, 1.1);
  hudRect(24, 216, 340, 80, HUD.ink);
  hudText('01  ARROWS/WASD   STEER', 40, 228, HUD.white, 1);
  hudText('02  Q/E           DRIFT STEP', 40, 248, HUD.white, 1);
  hudText('03  SPACE         HYPER BOOST', 40, 268, HUD.blue, 1);
  hudRect(210, 310, 220, 40, HUD.green);
  hudRect(210, 310, 36, 40, HUD.ink);
  hudText('>', 222, 323, HUD.white, 1.5);
  hudText('START ENGINE', 255, 324, HUD.ink, 1.35);
  hudText('PASS NINE. TAKE FIRST.', 450, 335, HUD.white, 0.85);
}
function drawCrashedScreen() {
  hudRect(125, 100, 390, 195, HUD.ink);
  hudText('MACHINE DESTROYED', 155, 130, HUD.green, 2.5);
  hudText('THE SPEEDWAY IS STILL YOURS.', 177, 179, HUD.white, 1);
  hudRect(200, 220, 240, 50, HUD.green);
  hudText('RETRY COURSE', 242, 238, HUD.ink, 1.5);
}
function drawFinishScreen() {
  hudRect(125, 100, 390, 210, HUD.ink);
  hudText('COURSE CLEARED', 165, 128, HUD.white, 2.8);
  hudText(`FINAL POSITION ${g.rank} / 10`, 201, 182, HUD.green, 1.5);
  hudRect(200, 240, 240, 50, HUD.green);
  hudText('PLAY AGAIN', 254, 258, HUD.ink, 1.5);
}

function startGame() {
  gameState = 'countdown';
  countdownTimer = 3.0;
  inputLock = 0.3;
  g.health = 100;
  g.energy = 50;
  g.dist = 0;
  g.speed = 0;
  g.rank = 10;
  g.passCount = 0;

  g.p.x = 0;
  g.p.vx = 0;
  // Restore ship meshes after crash
  Object.values(g.p.meshes).forEach(m => m && setPosition(m, 0, 1.5, 0));
  clearButtons();
  sfx('select');
}

function initStartScreen() {
  clearButtons();
  createButton(centerX(220), 310, 220, 40, '▶ START ENGINE', startGame, {
    normalColor: rgba8(200, 0, 150, 255),
    hoverColor: rgba8(255, 50, 200, 255),
  });
}

function initGameOver() {
  clearButtons();
  createButton(
    centerX(240),
    220,
    240,
    50,
    '↻ RETRY COURSE',
    () => {
      // Soft reset state then go to start menu
      g.p.meshes.body && setPosition(g.p.meshes.body, 0, 1.5, 0); // Put ship back visually
      gameState = 'start';
      inputLock = 0.5;
      initStartScreen();
    },
    { normalColor: rgba8(0, 80, 255, 255) }
  );
}

function initWinScreen() {
  clearButtons();
  createButton(
    centerX(240),
    240,
    240,
    50,
    '↻ PLAY AGAIN',
    () => {
      gameState = 'start';
      inputLock = 0.5;
      initStartScreen();
    },
    { normalColor: rgba8(0, 150, 100, 255) }
  );
}
