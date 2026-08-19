// ⭐ SUPER PLUMBER 64 — 3D Platforming Adventure ⭐
// Multi-zone world: Grassland → Desert Ruins → Ice Mountain
// Power-ups, moving platforms, 4 enemy types, double jump, checkpoints

// ── Constants ────────────────────────────────────────────────
const { drawGlowText, print, printCentered, rect, rectfill, rgba8 } = nova64.draw;
const {
  createCube,
  createCylinder,
  createPlane,
  createSphere,
  destroyMesh,
  rotateMesh,
  setPosition,
  setRotation,
  setScale,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog, setLightColor, setLightDirection } = nova64.light;
const { enableBloom, enableFXAA } = nova64.fx;
const { btn, key, keyp } = nova64.input;
const { sfx } = nova64.audio;
const {
  createHitState,
  createShake,
  isInvulnerable,
  isVisible,
  triggerHit,
  triggerShake,
  updateHitState,
  updateShake,
} = nova64.util;

const C = {
  sky: 0x44aaff,
  grass: 0x228811,
  dirt: 0x553311,
  sand: 0xccaa55,
  sandstone: 0xbb8833,
  ice: 0x88bbdd,
  snow: 0xddeeff,
  lava: 0xff3300,
  plumberHat: 0xff0000,
  plumberFace: 0xffccaa,
  plumberBody: 0x0022cc,
  coin: 0xffcc00,
  goomba: 0xaa4400,
  koopa: 0x22aa22,
  flyGuy: 0xdd44dd,
  chomp: 0x222222,
  brick: 0xcc6600,
  water: 0x0055ff,
  star: 0xffff00,
  mushroom: 0xff4444,
  speedShoe: 0x44ddff,
};

let gameState = 'start';
let t = 0;
let inputLock = 0;
let playerHit;
let shake;

let g = {
  score: 0,
  coins: 0,
  totalCoins: 0,
  health: 3,
  maxHealth: 3,
  zone: 0,
  checkpoint: null,
  hasDoubleJump: false,
  starTimer: 0,
  speedTimer: 0,

  p: {
    x: 0,
    y: 10,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rotY: 0,
    isGrounded: false,
    jumpTimer: 0,
    jumpsLeft: 1,
    meshGroup: [],
  },

  platforms: [],
  movingPlatforms: [],
  coinsList: [],
  enemies: [],
  particles: [],
  powerups: [],
  checkpoints: [],
  hazards: [],
  worldMeshes: [],
};

// ── Initialization ─────────────────────────────────────────
export function init() {
  setCameraFOV(60);
  setCameraPosition(0, 12, 18);
  setCameraTarget(0, 2, -5);

  setAmbientLight(0xffffff, 0.75);
  setLightDirection(1, 2, 1);
  setLightColor(0xffffff);

  setFog(C.sky, 60, 180);
  enableBloom(0.4, 0.5, 0.4);
  enableFXAA();

  shake = createShake({ decay: 0.88, maxMag: 6 });
  playerHit = createHitState({ invulnDuration: 1.5, blinkRate: 47 });

  resetGame();
}

function resetGame() {
  // Destroy old meshes
  for (const m of g.worldMeshes) destroyMesh(m);
  for (const p of g.platforms) if (p.mesh) destroyMesh(p.mesh);
  for (const mp of g.movingPlatforms) if (mp.mesh) destroyMesh(mp.mesh);
  for (const c of g.coinsList) if (c.mesh) destroyMesh(c.mesh);
  for (const e of g.enemies) e.meshes.forEach(m => destroyMesh(m));
  for (const part of g.particles) if (part.mesh) destroyMesh(part.mesh);
  for (const pu of g.powerups) if (pu.mesh) destroyMesh(pu.mesh);
  for (const cp of g.checkpoints) if (cp.mesh) destroyMesh(cp.mesh);
  for (const h of g.hazards) if (h.mesh) destroyMesh(h.mesh);
  if (g.p.meshGroup)
    g.p.meshGroup.forEach(part => {
      if (part.m) destroyMesh(part.m);
    });

  g.score = 0;
  g.coins = 0;
  g.totalCoins = 0;
  g.health = 3;
  g.maxHealth = 3;
  g.zone = 0;
  g.checkpoint = null;
  g.hasDoubleJump = false;
  g.starTimer = 0;
  g.speedTimer = 0;

  g.p.x = 0;
  g.p.y = 10;
  g.p.z = 0;
  g.p.vx = 0;
  g.p.vy = 0;
  g.p.vz = 0;
  g.p.rotY = Math.PI;
  g.p.isGrounded = false;
  g.p.jumpTimer = 0;
  g.p.jumpsLeft = 1;
  g.p.meshGroup = [];

  g.platforms = [];
  g.movingPlatforms = [];
  g.coinsList = [];
  g.enemies = [];
  g.particles = [];
  g.powerups = [];
  g.checkpoints = [];
  g.hazards = [];
  g.worldMeshes = [];

  playerHit.invulnTimer = 0;

  buildWorld();
  buildPlumber();
  inputLock = 0.3;
}

// ── World Building ─────────────────────────────────────────
function buildWorld() {
  // Water plane
  const water = createPlane(500, 500, C.water, [0, -8, 0], {
    material: 'standard',
    transparent: true,
    opacity: 0.5,
  });
  rotateMesh(water, -Math.PI / 2, 0, 0);
  g.worldMeshes.push(water);

  buildGrassland();
  buildDesertRuins();
  buildIceMountain();

  g.totalCoins = g.coinsList.length;
}

function buildGrassland() {
  // ── Zone 1: Grassland ──
  // Starting island
  addPlatform(0, -1, 0, 30, 2, 30, C.grass);

  // Trees (decorative)
  addTree(8, 1, 8);
  addTree(-10, 1, 5);
  addTree(-6, 1, -8);

  // Floating brick blocks with coins
  addPlatform(0, 6, -10, 3, 2, 3, C.brick, true);
  addPlatform(-6, 6, -10, 3, 2, 3, C.brick, true);
  addPlatform(6, 6, -10, 3, 2, 3, C.brick, true);
  spawnCoin(-6, 9, -10);
  spawnCoin(0, 9, -10);
  spawnCoin(6, 9, -10);

  // Coin trail across grass
  for (let i = -3; i <= 3; i++) spawnCoin(i * 3, 2, -3);

  // Stepping stone path
  addPlatform(0, 2, -22, 8, 1.5, 8, C.grass);
  addPlatform(-12, 5, -30, 6, 1, 6, C.grass);
  addPlatform(0, 8, -38, 8, 1, 8, C.grass);
  spawnCoin(0, 4, -22);
  spawnCoin(-12, 7, -30);
  spawnCoin(0, 10, -38);

  // Moving platform bridge
  addMovingPlatform(10, 4, -22, 5, 1, 5, C.grass, 'x', 8, 1.5);
  spawnCoin(10, 7, -22);

  // Mushroom power-up on stepping stone
  spawnPowerup(-12, 7, -30, 'mushroom');

  // Trampolines
  addPlatform(12, 1, -10, 4, 0.5, 4, 0xff4488, false, true); // trampoline

  // Enemies
  spawnGoomba(5, 1, 5);
  spawnGoomba(-5, 1, 5);
  spawnGoomba(0, 10, -38);

  // Hill to zone 2
  addPlatform(0, 6, -55, 20, 12, 18, C.dirt);
  addPlatform(0, 12, -55, 22, 1, 20, C.grass);
  spawnCoin(0, 14, -55);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    spawnCoin(Math.cos(a) * 6, 14, -55 + Math.sin(a) * 6);
  }

  // Checkpoint at hill top
  addCheckpoint(0, 13.5, -48);

  // Koopa on hill
  spawnKoopa(5, 13, -55);
  spawnKoopa(-5, 13, -55);
}

function buildDesertRuins() {
  // ── Zone 2: Desert Ruins ──
  const dz = -80;

  // Desert floor
  addPlatform(0, 10, dz, 40, 2, 40, C.sand);

  // Sandstone ruins/pillars
  addPlatform(-12, 16, dz + 5, 3, 10, 3, C.sandstone);
  addPlatform(12, 16, dz + 5, 3, 10, 3, C.sandstone);
  addPlatform(0, 21, dz + 5, 28, 1.5, 5, C.sandstone); // Bridge between pillars
  for (let i = -2; i <= 2; i++) spawnCoin(i * 5, 23, dz + 5);

  // Star power-up on bridge
  spawnPowerup(0, 23, dz + 5, 'star');

  // Pyramid (stepped)
  addPlatform(0, 12, dz - 10, 16, 2, 16, C.sandstone);
  addPlatform(0, 14, dz - 10, 12, 2, 12, C.sandstone);
  addPlatform(0, 16, dz - 10, 8, 2, 8, C.sandstone);
  addPlatform(0, 18, dz - 10, 4, 2, 4, C.sandstone);
  spawnCoin(0, 20, dz - 10);

  // Lava pits (hazards)
  addHazard(-10, 11.5, dz - 5, 6, 0.5, 6, C.lava, 5);
  addHazard(10, 11.5, dz + 10, 6, 0.5, 6, C.lava, 5);

  // Floating ruins coins
  addPlatform(-15, 15, dz - 8, 4, 1, 4, C.sandstone);
  addPlatform(15, 15, dz + 8, 4, 1, 4, C.sandstone);
  spawnCoin(-15, 17, dz - 8);
  spawnCoin(15, 17, dz + 8);

  // Moving platforms over lava
  addMovingPlatform(-10, 14, dz - 5, 4, 1, 4, C.sandstone, 'z', 5, 1.2);
  addMovingPlatform(10, 14, dz + 10, 4, 1, 4, C.sandstone, 'x', 5, 1.0);

  // Double jump power-up (speed shoes) hidden behind pyramid
  spawnPowerup(0, 12, dz - 18, 'speedShoe');

  // Enemies
  spawnKoopa(-8, 12, dz + 8);
  spawnKoopa(8, 12, dz - 3);
  spawnFlyGuy(0, 18, dz);
  spawnFlyGuy(-8, 16, dz + 12);

  // Checkpoint
  addCheckpoint(0, 12, dz + 15);

  // Bridge to Zone 3
  for (let i = 0; i < 5; i++) {
    addPlatform(0, 12 + i * 2, dz - 22 - i * 8, 8, 1, 6, i % 2 === 0 ? C.sand : C.sandstone);
    spawnCoin(0, 14 + i * 2, dz - 22 - i * 8);
  }
}

function buildIceMountain() {
  // ── Zone 3: Ice Mountain ──
  const iz = -160;
  const iy = 22;

  // Ice base
  addPlatform(0, iy, iz, 35, 2, 35, C.ice);

  // Icy floor is slippery (handled in physics)
  // Snowdrift decorations
  addTree(10, iy + 1, iz + 10, true);
  addTree(-8, iy + 1, iz - 5, true);

  // Ice pillars
  addPlatform(-10, iy + 6, iz - 8, 3, 10, 3, C.snow);
  addPlatform(10, iy + 6, iz + 8, 3, 10, 3, C.snow);

  // Staircase of ice platforms
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI;
    const px = Math.cos(angle) * 10;
    const pz = iz + Math.sin(angle) * 10;
    addPlatform(px, iy + 3 + i * 3, pz, 5, 1, 5, C.ice);
    spawnCoin(px, iy + 5 + i * 3, pz);
  }

  // Summit platform
  addPlatform(0, iy + 22, iz, 12, 2, 12, C.snow);
  spawnCoin(0, iy + 25, iz);

  // Moving platforms spiraling up
  addMovingPlatform(8, iy + 10, iz, 4, 1, 4, C.ice, 'x', 6, 0.8);
  addMovingPlatform(-8, iy + 16, iz - 5, 4, 1, 4, C.ice, 'z', 6, 1.0);

  // Star power-up near summit
  spawnPowerup(0, iy + 25, iz, 'star');

  // Boss: Chain Chomp at summit
  spawnChomp(0, iy + 24, iz);

  // Enemies
  spawnGoomba(5, iy + 1, iz + 5);
  spawnGoomba(-5, iy + 1, iz - 5);
  spawnFlyGuy(8, iy + 8, iz);
  spawnKoopa(-8, iy + 1, iz + 8);

  // Checkpoint at base
  addCheckpoint(0, iy + 1.5, iz + 12);

  // Final coin ring at summit
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    spawnCoin(Math.cos(a) * 4, iy + 25, iz + Math.sin(a) * 4);
  }
}

// ── Level Helpers ──────────────────────────────────────────
function addPlatform(x, y, z, sx, sy, sz, color, isBrick = false, isTrampoline = false) {
  const mesh = createCube(1, color, [x, y, z], {
    material: 'standard',
    roughness: isBrick ? 0.9 : isTrampoline ? 0.3 : 0.6,
  });
  setScale(mesh, sx, sy, sz);
  g.platforms.push({ mesh, x, y, z, sx, sy, sz, isBrick, isTrampoline, destroyed: false });
}

function addMovingPlatform(x, y, z, sx, sy, sz, color, axis, range, speed) {
  const mesh = createCube(1, color, [x, y, z], { material: 'standard', roughness: 0.5 });
  setScale(mesh, sx, sy, sz);
  const glow = createCube(1, 0xffff88, [x, y + sy / 2 + 0.1, z], {
    material: 'emissive',
    emissive: 0xffff88,
  });
  setScale(glow, sx * 0.8, 0.1, sz * 0.8);
  g.worldMeshes.push(glow);
  g.movingPlatforms.push({
    mesh,
    glow,
    x,
    y,
    z,
    sx,
    sy,
    sz,
    axis,
    range,
    speed,
    origin: axis === 'x' ? x : axis === 'z' ? z : y,
    t: Math.random() * 6,
  });
}

function addHazard(x, y, z, sx, sy, sz, color, damage) {
  const mesh = createCube(1, color, [x, y, z], { material: 'emissive', emissive: color });
  setScale(mesh, sx, sy, sz);
  g.hazards.push({ mesh, x, y, z, sx, sy, sz, damage });
}

function addCheckpoint(x, y, z) {
  const pole = createCylinder(0.15, 0.15, 3, 0x888888, [x, y + 1.5, z], { material: 'standard' });
  g.worldMeshes.push(pole);
  const flag = createCube(1, 0xff4444, [x + 0.6, y + 2.5, z], {
    material: 'emissive',
    emissive: 0xff4444,
  });
  setScale(flag, 1.2, 0.6, 0.1);
  g.checkpoints.push({ mesh: flag, x, y, z, active: false });
}

function addTree(x, y, z, snowy = false) {
  const trunk = createCylinder(0.3, 0.3, 3, 0x664422, [x, y + 1.5, z], {
    material: 'standard',
    roughness: 0.9,
  });
  g.worldMeshes.push(trunk);
  const leaves = createSphere(1.5, snowy ? 0xaaccbb : 0x228833, [x, y + 4, z], 8, {
    material: 'standard',
    roughness: 0.8,
  });
  g.worldMeshes.push(leaves);
  if (snowy) {
    const snowCap = createSphere(1.6, 0xeeeeff, [x, y + 4.5, z], 8, { material: 'standard' });
    setScale(snowCap, 1, 0.4, 1);
    g.worldMeshes.push(snowCap);
  }
}

// ── Coins & Powerups ───────────────────────────────────────
function spawnCoin(x, y, z) {
  const mesh = createSphere(0.8, C.coin, [x, y, z], 12, {
    material: 'metallic',
    metalness: 0.8,
    roughness: 0.2,
  });
  setScale(mesh, 1, 1, 0.2);
  g.coinsList.push({ mesh, x, y, z, t: Math.random() * 10, collected: false });
}

function spawnPowerup(x, y, z, type) {
  let color = type === 'star' ? C.star : type === 'mushroom' ? C.mushroom : C.speedShoe;
  const mesh = createSphere(0.6, color, [x, y + 0.5, z], 12, {
    material: 'emissive',
    emissive: color,
  });
  g.powerups.push({ mesh, x, y: y + 0.5, z, type, collected: false, t: 0 });
}

// ── Enemies ────────────────────────────────────────────────
function spawnGoomba(x, y, z) {
  const body = createSphere(1.0, C.goomba, [x, y + 0.6, z], 8, { material: 'standard' });
  setScale(body, 1, 0.7, 1);
  const eyeL = createCube(0.2, 0x000000, [x - 0.3, y + 0.9, z + 0.8], { material: 'standard' });
  const eyeR = createCube(0.2, 0x000000, [x + 0.3, y + 0.9, z + 0.8], { material: 'standard' });
  g.enemies.push({
    meshes: [body, eyeL, eyeR],
    type: 'goomba',
    x,
    y,
    z,
    vx: (Math.random() > 0.5 ? 1 : -1) * 3,
    hp: 1,
    startX: x,
    alive: true,
    patrolRange: 10,
  });
}

function spawnKoopa(x, y, z) {
  const shell = createSphere(0.8, C.koopa, [x, y + 0.5, z], 8, {
    material: 'standard',
    roughness: 0.3,
  });
  const head = createSphere(0.4, 0xffcc66, [x, y + 1.2, z + 0.5], 8, { material: 'standard' });
  g.enemies.push({
    meshes: [shell, head],
    type: 'koopa',
    x,
    y,
    z,
    vx: (Math.random() > 0.5 ? 1 : -1) * 4,
    hp: 2,
    startX: x,
    alive: true,
    patrolRange: 8,
  });
}

function spawnFlyGuy(x, y, z) {
  const body = createSphere(0.7, C.flyGuy, [x, y, z], 8, {
    material: 'emissive',
    emissive: C.flyGuy,
  });
  const wingL = createCube(0.1, 0xffffff, [x - 0.8, y + 0.2, z], { material: 'standard' });
  setScale(wingL, 8, 1, 3);
  const wingR = createCube(0.1, 0xffffff, [x + 0.8, y + 0.2, z], { material: 'standard' });
  setScale(wingR, 8, 1, 3);
  g.enemies.push({
    meshes: [body, wingL, wingR],
    type: 'flyguy',
    x,
    y,
    z,
    orbAngle: Math.random() * Math.PI * 2,
    startY: y,
    startX: x,
    startZ: z,
    alive: true,
    hp: 1,
    patrolRange: 6,
  });
}

function spawnChomp(x, y, z) {
  const body = createSphere(2.0, C.chomp, [x, y + 2, z], 12, {
    material: 'metallic',
    metalness: 0.7,
    roughness: 0.3,
  });
  const eyeL = createSphere(0.4, 0xffffff, [x - 0.7, y + 3, z + 1.5], 8, {
    material: 'emissive',
    emissive: 0xffffff,
  });
  const eyeR = createSphere(0.4, 0xffffff, [x + 0.7, y + 3, z + 1.5], 8, {
    material: 'emissive',
    emissive: 0xffffff,
  });
  const pupilL = createSphere(0.2, 0xff0000, [x - 0.7, y + 3, z + 1.8], 8, {
    material: 'emissive',
    emissive: 0xff0000,
  });
  const pupilR = createSphere(0.2, 0xff0000, [x + 0.7, y + 3, z + 1.8], 8, {
    material: 'emissive',
    emissive: 0xff0000,
  });
  // Chain
  const chain = createCylinder(0.15, 0.15, 4, 0x444444, [x, y, z], {
    material: 'metallic',
    metalness: 0.9,
  });
  g.enemies.push({
    meshes: [body, eyeL, eyeR, pupilL, pupilR, chain],
    type: 'chomp',
    x,
    y,
    z,
    startX: x,
    startZ: z,
    orbAngle: 0,
    alive: true,
    hp: 5,
    patrolRange: 6,
  });
}

// ── Plumber Build ──────────────────────────────────────────
function buildPlumber() {
  const body = createCube(1.2, C.plumberBody, [0, 0, 0], { material: 'standard', roughness: 0.8 });
  setScale(body, 1, 1.2, 1);
  const head = createSphere(0.8, C.plumberFace, [0, 1.2, 0], 12, { material: 'standard' });
  const hat = createSphere(0.82, C.plumberHat, [0, 1.5, 0], 12, { material: 'standard' });
  setScale(hat, 1, 0.5, 1);
  const brim = createCube(1, C.plumberHat, [0, 1.4, 0.5], { material: 'standard' });
  setScale(brim, 1.2, 0.1, 0.6);

  g.p.meshGroup = [
    { m: body, ox: 0, oy: 0.6, oz: 0 },
    { m: head, ox: 0, oy: 1.6, oz: 0 },
    { m: hat, ox: 0, oy: 2.0, oz: 0 },
    { m: brim, ox: 0, oy: 1.9, oz: 0.5 },
  ];
}

function createFX(cx, cy, cz, color, count = 10, speed = 10) {
  for (let i = 0; i < count; i++) {
    const mesh = createCube(0.4, color, [cx, cy, cz], { material: 'emissive', emissive: color });
    const a = Math.random() * Math.PI * 2;
    const a2 = Math.random() * Math.PI - Math.PI / 2;
    g.particles.push({
      mesh,
      x: cx,
      y: cy,
      z: cz,
      vx: Math.cos(a) * Math.cos(a2) * speed,
      vy: Math.abs(Math.sin(a2)) * speed + 5,
      vz: Math.sin(a) * Math.cos(a2) * speed,
      life: 0.3 + Math.random() * 0.4,
    });
  }
}

// ── Game Loop ──────────────────────────────────────────────
export function update(dt) {
  t += dt;
  updateShake(shake, dt);

  if (gameState !== 'playing') {
    if (inputLock > 0) inputLock -= dt;
    if (gameState === 'start' && inputLock <= 0 && (keyp('Space') || keyp('Enter'))) startGame();
    if (
      (gameState === 'gameover' || gameState === 'win') &&
      inputLock <= 0 &&
      (keyp('Space') || keyp('Enter'))
    ) {
      resetGame();
      gameState = 'playing';
    }
    return;
  }

  const p = g.p;
  updateHitState(playerHit, dt);

  // Power-up timers
  if (g.starTimer > 0) g.starTimer -= dt;
  if (g.speedTimer > 0) g.speedTimer -= dt;

  // Falling check — generous threshold so falls feel recoverable
  if (p.y < -20) respawnPlayer();

  handlePlayerInput(dt);
  updateMovingPlatforms(dt);
  updatePhysics(dt);
  updatePlayerMeshes();
  updateCoins(dt);
  updateEnemies(dt);
  updatePowerups(dt);
  updateCheckpoints();
  updateParticles(dt);

  // Zone detection for atmosphere
  const zoneNow = getZone(p.z);
  if (zoneNow !== g.zone) {
    g.zone = zoneNow;
    updateAtmosphere(zoneNow);
  }

  // Camera
  const sx = shake.offsetX || 0;
  const sy = shake.offsetY || 0;
  setCameraPosition(p.x + sx * 0.03, p.y + 6 + sy * 0.03, p.z + 12);
  setCameraTarget(p.x, p.y + 1, p.z - 4);
}

function getZone(z) {
  if (z > -65) return 0; // Grassland
  if (z > -130) return 1; // Desert
  return 2; // Ice
}

function updateAtmosphere(zone) {
  if (zone === 0) {
    setFog(0x44aaff, 60, 180);
    setAmbientLight(0xffffff, 0.75);
  } else if (zone === 1) {
    setFog(0xddaa66, 50, 150);
    setAmbientLight(0xffeedd, 0.85);
  } else {
    setFog(0x889fbb, 40, 130);
    setAmbientLight(0xccddff, 0.6);
  }
}

function handlePlayerInput(dt) {
  const p = g.p;
  let ax = 0,
    az = 0;

  if (key('ArrowLeft') || key('KeyA') || btn(0)) ax = -1;
  if (key('ArrowRight') || key('KeyD') || btn(1)) ax = 1;
  if (key('ArrowUp') || key('KeyW') || btn(2)) az = -1;
  if (key('ArrowDown') || key('KeyS') || btn(3)) az = 1;

  const speedMult = g.speedTimer > 0 ? 1.6 : 1.0;
  const moveSpd = 32 * speedMult;
  p.vx += ax * moveSpd * dt;
  p.vz += az * moveSpd * dt;

  // Friction — generous air control for fun platforming
  const zone = getZone(p.z);
  const isIce = zone === 2;
  const fricMult = isIce ? 0.4 : 1.0;
  const fric = p.isGrounded ? 6 * fricMult : 0.8;
  p.vx *= 1 - fric * dt;
  p.vz *= 1 - fric * dt;

  if (Math.abs(p.vx) > 0.1 || Math.abs(p.vz) > 0.1) p.rotY = Math.atan2(p.vx, p.vz);

  // Jump / double jump — floaty Mario-style arcs
  const maxJumps = g.hasDoubleJump ? 2 : 1;
  if ((keyp('Space') || keyp('KeyZ')) && p.jumpsLeft > 0 && p.jumpTimer <= 0) {
    p.vy = p.jumpsLeft === maxJumps ? 18 : 14;
    p.isGrounded = false;
    p.jumpsLeft--;
    p.jumpTimer = 0.12;
    sfx('jump');
    createFX(p.x, p.y, p.z, 0xffffff, 5, 2);
  }
  if (p.jumpTimer > 0) p.jumpTimer -= dt;
}

function updateMovingPlatforms(dt) {
  for (const mp of g.movingPlatforms) {
    mp.t += dt * mp.speed;
    const offset = Math.sin(mp.t) * mp.range;
    if (mp.axis === 'x') {
      mp.x = mp.origin + offset;
      setPosition(mp.mesh, mp.x, mp.y, mp.z);
      setPosition(mp.glow, mp.x, mp.y + mp.sy / 2 + 0.1, mp.z);
    } else if (mp.axis === 'z') {
      mp.z = mp.origin + offset;
      setPosition(mp.mesh, mp.x, mp.y, mp.z);
      setPosition(mp.glow, mp.x, mp.y + mp.sy / 2 + 0.1, mp.z);
    } else {
      mp.y = mp.origin + offset;
      setPosition(mp.mesh, mp.x, mp.y, mp.z);
      setPosition(mp.glow, mp.x, mp.y + mp.sy / 2 + 0.1, mp.z);
    }
  }
}

function updatePhysics(dt) {
  const p = g.p;
  // Lighter gravity = floaty fun jumps (35 vs Mario's ~38)
  // Variable: fall faster than rise for snappy-yet-floaty feel
  const grav = p.vy > 0 ? 35 : 45;
  p.vy -= grav * dt;
  p.isGrounded = false;

  p.y += p.vy * dt;
  handleCollisions('y');
  p.x += p.vx * dt;
  handleCollisions('x');
  p.z += p.vz * dt;
  handleCollisions('z');
}

function handleCollisions(axis) {
  const p = g.p;
  const pr = 0.6,
    ph = 2.0;

  const collide = plat => {
    if (plat.destroyed) return;
    const hx = plat.sx / 2,
      hy = plat.sy / 2,
      hz = plat.sz / 2;
    const overlapX = p.x + pr > plat.x - hx && p.x - pr < plat.x + hx;
    const overlapY = p.y + ph > plat.y - hy && p.y < plat.y + hy;
    const overlapZ = p.z + pr > plat.z - hz && p.z - pr < plat.z + hz;

    if (overlapX && overlapY && overlapZ) {
      if (axis === 'y') {
        if (p.vy < 0) {
          p.y = plat.y + hy;
          p.vy = 0;
          p.isGrounded = true;
          p.jumpsLeft = g.hasDoubleJump ? 2 : 1;
          if (plat.isTrampoline) {
            p.vy = 25;
            p.isGrounded = false;
            p.jumpsLeft = g.hasDoubleJump ? 2 : 1;
            sfx('jump');
            createFX(p.x, p.y, p.z, 0xff88ff, 8, 4);
          }
        } else if (p.vy > 0) {
          p.y = plat.y - hy - ph;
          p.vy = -2;
          if (plat.isBrick) {
            createFX(plat.x, plat.y, plat.z, C.brick, 15, 10);
            g.score += 50;
            sfx('explosion');
            destroyMesh(plat.mesh);
            plat.destroyed = true;
          }
        }
      } else if (axis === 'x') {
        if (p.vx > 0) {
          p.x = plat.x - hx - pr;
          p.vx = 0;
        } else if (p.vx < 0) {
          p.x = plat.x + hx + pr;
          p.vx = 0;
        }
      } else if (axis === 'z') {
        if (p.vz > 0) {
          p.z = plat.z - hz - pr;
          p.vz = 0;
        } else if (p.vz < 0) {
          p.z = plat.z + hz + pr;
          p.vz = 0;
        }
      }
    }
  };

  g.platforms.forEach(collide);
  g.movingPlatforms.forEach(collide);

  // Cleanup destroyed
  for (let i = g.platforms.length - 1; i >= 0; i--) {
    if (g.platforms[i].destroyed) g.platforms.splice(i, 1);
  }

  // Hazard collision
  if (axis === 'y') {
    for (const h of g.hazards) {
      const hx = h.sx / 2,
        hy = h.sy / 2,
        hz = h.sz / 2;
      if (
        p.x + pr > h.x - hx &&
        p.x - pr < h.x + hx &&
        p.y + ph > h.y - hy &&
        p.y < h.y + hy &&
        p.z + pr > h.z - hz &&
        p.z - pr < h.z + hz
      ) {
        takeDamage();
        p.vy = 15;
      }
    }
  }
}

function updatePlayerMeshes() {
  const p = g.p;
  const visible = isVisible(playerHit, t);
  const cr = Math.cos(p.rotY),
    sr = Math.sin(p.rotY);

  p.meshGroup.forEach(part => {
    if (!visible) {
      setPosition(part.m, 0, -100, 0);
      return;
    }
    const rx = part.ox * cr + part.oz * sr;
    const rz = -part.ox * sr + part.oz * cr;
    let animY = 0;
    if (p.isGrounded && (Math.abs(p.vx) > 1 || Math.abs(p.vz) > 1))
      animY = Math.abs(Math.sin(t * 15)) * 0.2;
    setPosition(part.m, p.x + rx, p.y + part.oy + animY, p.z + rz);
    setRotation(part.m, 0, p.rotY, 0);
  });
}

function updateCoins(dt) {
  for (let i = g.coinsList.length - 1; i >= 0; i--) {
    const c = g.coinsList[i];
    if (c.collected) continue;
    c.t += dt;
    c.y += Math.sin(c.t * 5) * 0.005;
    setPosition(c.mesh, c.x, c.y, c.z);
    setRotation(c.mesh, 0, c.t * 3, 0);

    const dx = c.x - g.p.x,
      dy = c.y - (g.p.y + 1),
      dz = c.z - g.p.z;
    if (dx * dx + dy * dy + dz * dz < 4) {
      g.score += 100;
      g.coins++;
      createFX(c.x, c.y, c.z, C.coin, 8, 8);
      sfx('coin');
      destroyMesh(c.mesh);
      c.collected = true;

      if (g.coins >= g.totalCoins) {
        gameState = 'win';
        inputLock = 1.5;
        sfx('powerup');
      }
    }
  }
}

function updatePowerups(dt) {
  for (const pu of g.powerups) {
    if (pu.collected) continue;
    pu.t += dt;
    const bob = Math.sin(pu.t * 4) * 0.3;
    setPosition(pu.mesh, pu.x, pu.y + bob, pu.z);
    setRotation(pu.mesh, 0, pu.t * 2, 0);

    const dx = pu.x - g.p.x,
      dy = pu.y + bob - (g.p.y + 1),
      dz = pu.z - g.p.z;
    if (dx * dx + dy * dy + dz * dz < 3) {
      pu.collected = true;
      destroyMesh(pu.mesh);
      sfx('powerup');
      createFX(
        pu.x,
        pu.y,
        pu.z,
        pu.type === 'star' ? C.star : pu.type === 'mushroom' ? C.mushroom : C.speedShoe,
        15,
        8
      );

      if (pu.type === 'mushroom') {
        g.health = Math.min(g.health + 1, g.maxHealth);
      } else if (pu.type === 'star') {
        g.starTimer = 8;
        triggerShake(shake, 3);
      } else if (pu.type === 'speedShoe') {
        g.speedTimer = 12;
        g.hasDoubleJump = true;
      }
    }
  }
}

function updateCheckpoints() {
  for (const cp of g.checkpoints) {
    if (cp.active) continue;
    const dx = cp.x - g.p.x,
      dz = cp.z - g.p.z;
    if (dx * dx + dz * dz < 9 && Math.abs(g.p.y - cp.y) < 4) {
      cp.active = true;
      g.checkpoint = { x: cp.x, y: cp.y + 2, z: cp.z };
      sfx('powerup');
      createFX(cp.x, cp.y + 2, cp.z, 0x44ff44, 12, 6);
      // Turn flag green
      destroyMesh(cp.mesh);
      cp.mesh = createCube(1, 0x44ff44, [cp.x + 0.6, cp.y + 2.5, cp.z], {
        material: 'emissive',
        emissive: 0x44ff44,
      });
      setScale(cp.mesh, 1.2, 0.6, 0.1);
    }
  }
}

function updateEnemies(dt) {
  const p = g.p;
  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i];
    if (!e.alive) continue;

    // Movement by type
    if (e.type === 'goomba' || e.type === 'koopa') {
      e.x += e.vx * dt;
      if (Math.abs(e.x - e.startX) > e.patrolRange) e.vx *= -1;
      const bobY = Math.sin(t * 10 + i) * 0.01;
      e.y += bobY;
      e.meshes[0] && setPosition(e.meshes[0], e.x, e.y + 0.6, e.z);
      if (e.type === 'goomba') {
        e.meshes[1] && setPosition(e.meshes[1], e.x - 0.3, e.y + 0.9, e.z + 0.8);
        e.meshes[2] && setPosition(e.meshes[2], e.x + 0.3, e.y + 0.9, e.z + 0.8);
      } else {
        e.meshes[1] && setPosition(e.meshes[1], e.x, e.y + 1.2, e.z + 0.5);
      }
    } else if (e.type === 'flyguy') {
      e.orbAngle += dt * 2;
      e.x = e.startX + Math.cos(e.orbAngle) * e.patrolRange;
      e.z = e.startZ + Math.sin(e.orbAngle) * e.patrolRange * 0.5;
      const fy = e.startY + Math.sin(t * 3 + i) * 1.5;
      e.meshes[0] && setPosition(e.meshes[0], e.x, fy, e.z);
      const wingFlap = Math.sin(t * 20) * 0.3;
      e.meshes[1] && setPosition(e.meshes[1], e.x - 0.8, fy + 0.2 + wingFlap, e.z);
      e.meshes[2] && setPosition(e.meshes[2], e.x + 0.8, fy + 0.2 - wingFlap, e.z);
      e.y = fy - 0.6;
    } else if (e.type === 'chomp') {
      e.orbAngle += dt * 1.5;
      e.x = e.startX + Math.cos(e.orbAngle) * 4;
      e.z = e.startZ + Math.sin(e.orbAngle) * 4;
      const bounce = Math.abs(Math.sin(t * 5)) * 1.5;
      e.meshes[0] && setPosition(e.meshes[0], e.x, e.y + 2 + bounce, e.z);
      e.meshes[1] && setPosition(e.meshes[1], e.x - 0.7, e.y + 3 + bounce, e.z + 1.5);
      e.meshes[2] && setPosition(e.meshes[2], e.x + 0.7, e.y + 3 + bounce, e.z + 1.5);
      e.meshes[3] && setPosition(e.meshes[3], e.x - 0.7, e.y + 3 + bounce, e.z + 1.8);
      e.meshes[4] && setPosition(e.meshes[4], e.x + 0.7, e.y + 3 + bounce, e.z + 1.8);
      e.meshes[5] && setPosition(e.meshes[5], e.x, e.y + 1, e.z);
    }

    // Collision with player
    const dx = e.x - p.x;
    const eHeight = e.type === 'chomp' ? 2 : 0.6;
    const dy = e.y + eHeight - (p.y + 1);
    const dz = e.z - p.z;
    const dist2 = dx * dx + dy * dy + dz * dz;
    const hitRange = e.type === 'chomp' ? 5 : 2.5;

    if (dist2 < hitRange) {
      if (p.vy < 0 && p.y > e.y + eHeight - 0.5) {
        // Stomp!
        e.hp--;
        p.vy = 14;
        triggerShake(shake, e.type === 'chomp' ? 5 : 2);
        sfx('hit');
        g.score += e.type === 'chomp' ? 500 : 200;

        if (e.hp <= 0) {
          e.alive = false;
          createFX(
            e.x,
            e.y + 1,
            e.z,
            e.type === 'chomp'
              ? C.chomp
              : e.type === 'koopa'
                ? C.koopa
                : e.type === 'flyguy'
                  ? C.flyGuy
                  : C.goomba,
            20,
            12
          );
          sfx('explosion');
          e.meshes.forEach(m => destroyMesh(m));
          g.enemies.splice(i, 1);
          if (e.type === 'chomp') {
            g.score += 1000;
            createFX(e.x, e.y + 2, e.z, C.star, 30, 15);
          }
        } else {
          createFX(e.x, e.y + 1, e.z, 0xffaa44, 8, 6);
        }
      } else if (!isInvulnerable(playerHit) && g.starTimer <= 0) {
        takeDamage();
      } else if (g.starTimer > 0) {
        // Star power kills on touch
        e.alive = false;
        e.hp = 0;
        createFX(e.x, e.y + 1, e.z, C.star, 20, 12);
        sfx('explosion');
        e.meshes.forEach(m => destroyMesh(m));
        g.enemies.splice(i, 1);
        g.score += 300;
      }
    }
  }
}

function takeDamage() {
  if (!triggerHit(playerHit)) return;
  g.health--;
  g.p.vy = 10;
  triggerShake(shake, 4);
  sfx('hit');
  createFX(g.p.x, g.p.y + 1, g.p.z, C.plumberFace, 15);
  if (g.health <= 0) {
    gameState = 'gameover';
    inputLock = 1.5;
    g.p.meshGroup.forEach(part => setPosition(part.m, 0, -100, 0));
    sfx('explosion');
  }
}

function respawnPlayer() {
  takeDamage();
  if (gameState === 'gameover') return;
  const cp = g.checkpoint || { x: 0, y: 10, z: 0 };
  g.p.x = cp.x;
  g.p.y = cp.y;
  g.p.z = cp.z;
  g.p.vx = 0;
  g.p.vy = 0;
  g.p.vz = 0;
}

function updateParticles(dt) {
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const p = g.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 15 * dt;
    p.life -= dt;
    const a = Math.max(0.01, p.life);
    setScale(p.mesh, a, a, a);
    setPosition(p.mesh, p.x, p.y, p.z);
    if (p.life <= 0) {
      destroyMesh(p.mesh);
      g.particles.splice(i, 1);
    }
  }
}

// ── Screens & UI ───────────────────────────────────────────
export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  if (gameState === 'gameover') {
    drawGameOver();
    return;
  }
  if (gameState === 'win') {
    drawWinScreen();
    return;
  }
  drawHUD();
}

function drawHUD() {
  // Coin counter
  rectfill(14, 10, 110, 22, rgba8(0, 0, 0, 140));
  print(`COINS ${g.coins}/${g.totalCoins}`, 20, 14, rgba8(255, 220, 50, 255));

  // Score
  rectfill(500, 10, 130, 22, rgba8(0, 0, 0, 140));
  print(`SCORE ${String(g.score).padStart(6, '0')}`, 506, 14, rgba8(255, 255, 255, 255));

  // Health hearts
  for (let i = 0; i < g.maxHealth; i++) {
    const color = i < g.health ? rgba8(255, 50, 50, 255) : rgba8(60, 60, 60, 150);
    rectfill(20 + i * 24, 38, 18, 16, color);
    rect(20 + i * 24, 38, 18, 16, rgba8(255, 255, 255, 100), false);
  }

  // Zone name
  const zoneNames = ['GRASSLAND', 'DESERT RUINS', 'ICE MOUNTAIN'];
  const zone = getZone(g.p.z);
  print(zoneNames[zone], 280, 348, rgba8(200, 200, 200, 160));

  // Power-up indicators
  if (g.starTimer > 0) {
    const flash = Math.sin(t * 10) > 0;
    rectfill(270, 10, 100, 18, flash ? rgba8(255, 255, 0, 180) : rgba8(200, 150, 0, 180));
    print(`STAR ${Math.ceil(g.starTimer)}s`, 280, 12, rgba8(0, 0, 0, 255));
  }
  if (g.speedTimer > 0) {
    rectfill(270, 30, 100, 18, rgba8(50, 200, 255, 160));
    print(`SPEED ${Math.ceil(g.speedTimer)}s`, 276, 32, rgba8(0, 0, 0, 255));
  }
  if (g.hasDoubleJump) {
    print('2x JUMP', 560, 38, rgba8(100, 220, 255, 200));
  }
}

function drawStartScreen() {
  rectfill(0, 0, 640, 360, rgba8(0, 0, 0, 180));
  drawGlowText(
    'SUPER PLUMBER',
    165,
    45 + Math.sin(t * 3) * 5,
    rgba8(255, 50, 50),
    rgba8(150, 0, 0)
  );
  printCentered('NOVA 64', 320, 95 + Math.sin(t * 3) * 5, rgba8(255, 200, 0));

  rectfill(140, 130, 360, 120, rgba8(10, 20, 50, 220));
  rect(140, 130, 360, 120, rgba8(100, 150, 255, 200), false);

  printCentered('3 ZONES: Grassland  Desert  Ice', 320, 140, rgba8(200, 200, 255));
  printCentered('WASD / Arrows = Move', 320, 162, rgba8(200, 200, 200));
  printCentered('SPACE = Jump (collect Speed Shoes for 2x)', 320, 178, rgba8(200, 200, 200));
  printCentered('Stomp enemies! Collect ALL coins to win!', 320, 194, rgba8(255, 255, 100));
  printCentered('Power-ups: Star, Mushroom, Speed Shoes', 320, 214, rgba8(100, 255, 150));
  printCentered('Touch checkpoints to save your position!', 320, 230, rgba8(255, 180, 100));

  const pulse = Math.sin(t * 3) * 0.5 + 0.5;
  printCentered(
    'PRESS SPACE TO PLAY',
    320,
    290,
    rgba8(255, 255, 100, Math.floor(100 + pulse * 155))
  );
}

function drawGameOver() {
  rectfill(0, 0, 640, 360, rgba8(40, 0, 0, 220));
  drawGlowText('GAME OVER', 220, 80, rgba8(255, 50, 50), rgba8(150, 0, 0));
  printCentered(
    `Score: ${g.score}  |  Coins: ${g.coins}/${g.totalCoins}`,
    320,
    150,
    rgba8(200, 200, 200)
  );
  const zoneNames = ['Grassland', 'Desert Ruins', 'Ice Mountain'];
  printCentered(`Reached: ${zoneNames[getZone(g.p.z)]}`, 320, 175, rgba8(180, 180, 200));
  const pulse = Math.sin(t * 2) * 0.5 + 0.5;
  printCentered(
    'PRESS SPACE TO TRY AGAIN',
    320,
    240,
    rgba8(200, 150, 150, Math.floor(120 + pulse * 135))
  );
}

function drawWinScreen() {
  rectfill(0, 0, 640, 360, rgba8(0, 20, 0, 200));
  drawGlowText('COURSE CLEAR!', 180, 60, rgba8(50, 255, 100), rgba8(0, 100, 0));
  printCentered(`FINAL SCORE: ${g.score}`, 320, 130, rgba8(255, 220, 50));
  printCentered(`ALL ${g.totalCoins} COINS COLLECTED!`, 320, 160, rgba8(255, 255, 100));
  const rating =
    g.score > 15000 ? 'S RANK!' : g.score > 10000 ? 'A RANK' : g.score > 5000 ? 'B RANK' : 'C RANK';
  drawGlowText(rating, 260, 200, rgba8(255, 215, 0), rgba8(180, 140, 0));
  const pulse = Math.sin(t * 2) * 0.5 + 0.5;
  printCentered(
    'PRESS SPACE TO PLAY AGAIN',
    320,
    280,
    rgba8(200, 255, 200, Math.floor(120 + pulse * 135))
  );
}

function startGame() {
  gameState = 'playing';
  sfx('confirm');
}
