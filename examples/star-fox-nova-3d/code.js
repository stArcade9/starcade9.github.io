// ⭐ STAR FOX NOVA 64 — Space Combat Rail Shooter ⭐
// Ultimate 3D Edition with Holographic Materials, Barrel Rolls, and Cinematic Lighting

// ── State ──────────────────────────────────────────────
const {
  cls,
  drawGlowTextCentered,
  drawGradient,
  drawNoise,
  drawPanel,
  drawRadialGradient,
  drawScanlines,
  drawStarburst,
  drawWave,
  line,
  rect,
  rgba8,
} = nova64.draw;
const {
  createCube,
  createInstancedMesh,
  createSphere,
  createTorus,
  destroyMesh,
  finalizeInstances,
  rotateMesh,
  setInstanceTransform,
  setPosition,
  setRotation,
  setScale,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { createSpaceSkybox, setAmbientLight, setFog, setLightColor, setLightDirection } =
  nova64.light;
const { enableBloom, enableFXAA, enableVignette } = nova64.fx;
const { btn, btnp, isKeyPressed, key } = nova64.input;
const { sfx } = nova64.audio;
const {
  centerX,
  clearButtons,
  createButton,
  createPanel,
  drawAllButtons,
  drawText,
  drawTextShadow,
  grid,
  setFont,
  setTextAlign,
  uiColors,
  updateAllButtons,
} = nova64.ui;
const {
  color,
  createCooldown,
  createHitState,
  isInvulnerable,
  rotate,
  triggerHit,
  updateCooldown,
  updateHitState,
  useCooldown,
} = nova64.util;

let gameState = 'start'; // 'start' | 'playing' | 'gameover'
let gameTime = 0;
let inputLockout = 0.6;
let playerHit;
let weaponCD;

const C = {
  // Ship (Modern Metallic)
  shipBody: 0xcccccc,
  shipWing: 0x0055ff,
  shipEngine: 0x00ffee,
  shipCockpit: 0x00ffff,
  // Enemies
  drone: 0x222222,
  droneEye: 0xff0044,
  droneWing: 0x990033,
  // Projectiles
  laser: 0x00ffcc,
  enemyShot: 0xff0044,
  // Environment
  asteroid: 0x443333,
  ring: 0xffdd00,
  star: 0xffffff,
  // FX
  explosion: 0xff4411,
  spark: 0xffffaa,
};

let game = {
  // Arwing
  player: {
    x: 0,
    y: 5,
    z: 0,
    vx: 0,
    vy: 0,
    roll: 0,
    barrelRoll: 0,
    isBarrelRolling: false,
    rollSpeed: 0,
    health: 100,
    weaponTimer: 0,
    meshes: {},
    invuln: 0,
  },
  speed: 60,
  distance: 0,
  score: 0,
  wave: 1,
  kills: 0,

  // World
  gridPlanes: [],
  asteroids: [],
  enemies: [],
  bullets: [],
  enemyBullets: [],
  particles: [],
  rings: [],
  boss: null,
  bossSpawned: false,
  trails: [],

  enemySpawnTimer: 0,
  ringSpawnTimer: 0,
};

// ── Init ───────────────────────────────────────────────
export async function init() {
  console.log('🚀 STAR FOX NOVA 64 (Ultimate) — Loading...');

  // Camera — dynamic lag behind player
  nova64.camera.setCameraPosition(0, 12, 22);
  nova64.camera.setCameraTarget(0, 4, -30);
  nova64.camera.setCameraFOV(75);

  // Lighting — dramatic space lighting
  nova64.light.setAmbientLight(0x111122, 1.2);
  nova64.light.setLightDirection(-0.5, -1, -0.5);
  nova64.light.setLightColor(0xffffff);

  // Deep space fog
  nova64.light.setFog(0x020308, 50, 300);

  if (typeof createSpaceSkybox === 'function') {
    nova64.light.createSpaceSkybox({
      starCount: 3000,
      starSize: 2.5,
      nebulae: true,
      nebulaColor: 0x1a0044,
    });
  }

  // Post-processing — cinematic space feel
  nova64.fx.enableBloom(1.2, 0.4, 0.4); // Intense bloom for lasers/engines
  if (typeof enableFXAA === 'function') nova64.fx.enableFXAA();
  if (typeof enableVignette === 'function') nova64.fx.enableVignette(1.2, 0.92);

  // Build world
  createGridFloor();
  createArwing();
  playerHit = nova64.util.createHitState({ invulnDuration: 1.0, blinkRate: 30 });
  weaponCD = nova64.util.createCooldown(0.1);
  for (let i = 0; i < 25; i++) spawnAsteroid(true);

  // Start screen
  initStartScreen();
  console.log('✅ STAR FOX NOVA 64 — Ready!');
}

// GPU instancing for grid floor tiles
let gridInstanceA = null; // dark tiles
let gridInstanceB = null; // lighter tiles

// ── World Building ─────────────────────────────────────
function createGridFloor() {
  const cols = 20,
    rows = 35,
    size = 5;
  const startX = -(cols * size) / 2;

  // 700 planes → 2 instanced meshes (350 each)
  const halfCount = (cols * rows) / 2;
  gridInstanceA = nova64.scene.createInstancedMesh('plane', halfCount, 0x050a14, {
    width: size,
    height: size,
    material: 'standard',
    roughness: 0.8,
  });
  gridInstanceB = nova64.scene.createInstancedMesh('plane', halfCount, 0x081020, {
    width: size,
    height: size,
    material: 'standard',
    roughness: 0.8,
  });

  let idxA = 0,
    idxB = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const alt = (r + c) % 2 === 0;
      const x = startX + c * size + size / 2;
      const z = 15 - r * size - size / 2;
      if (alt) {
        nova64.scene.setInstanceTransform(gridInstanceA, idxA, x, -4, z, -Math.PI / 2, 0, 0);
        game.gridPlanes.push({ instanceId: gridInstanceA, index: idxA, x, z });
        idxA++;
      } else {
        nova64.scene.setInstanceTransform(gridInstanceB, idxB, x, -4, z, -Math.PI / 2, 0, 0);
        game.gridPlanes.push({ instanceId: gridInstanceB, index: idxB, x, z });
        idxB++;
      }
    }
  }
  nova64.scene.finalizeInstances(gridInstanceA);
  nova64.scene.finalizeInstances(gridInstanceB);
}

function createArwing() {
  const p = game.player;
  const px = p.x,
    py = p.y,
    pz = p.z;

  // Fuselage (Metallic)
  p.meshes.body = nova64.scene.createCube(1.8, C.shipBody, [px, py, pz], {
    material: 'metallic',
    metalness: 0.9,
    roughness: 0.2,
  });
  nova64.scene.setScale(p.meshes.body, 0.8, 0.5, 2.5);

  // Cockpit canopy (Glass/Holographic)
  p.meshes.cockpit = nova64.scene.createSphere(0.5, C.shipCockpit, [px, py + 0.4, pz + 0.8], 12, {
    material: 'holographic',
    transparent: true,
    opacity: 0.8,
    emissive: 0x0044aa,
  });
  nova64.scene.setScale(p.meshes.cockpit, 0.8, 0.6, 1.2);

  // Wings (Metallic Blue)
  p.meshes.wingL = nova64.scene.createCube(1, C.shipWing, [px - 2.2, py - 0.1, pz - 0.3], {
    material: 'metallic',
    metalness: 0.8,
  });
  nova64.scene.setScale(p.meshes.wingL, 2.8, 0.1, 1.8);

  p.meshes.wingR = nova64.scene.createCube(1, C.shipWing, [px + 2.2, py - 0.1, pz - 0.3], {
    material: 'metallic',
    metalness: 0.8,
  });
  nova64.scene.setScale(p.meshes.wingR, 2.8, 0.1, 1.8);

  // Engine glow pods (Emissive)
  p.meshes.engineL = nova64.scene.createCube(0.4, C.shipEngine, [px - 1.2, py - 0.15, pz - 2.0], {
    material: 'emissive',
    emissive: C.shipEngine,
  });
  nova64.scene.setScale(p.meshes.engineL, 0.8, 0.6, 1.0);

  p.meshes.engineR = nova64.scene.createCube(0.4, C.shipEngine, [px + 1.2, py - 0.15, pz - 2.0], {
    material: 'emissive',
    emissive: C.shipEngine,
  });
  nova64.scene.setScale(p.meshes.engineR, 0.8, 0.6, 1.0);

  // Tail fin
  p.meshes.tail = nova64.scene.createCube(0.3, C.shipWing, [px, py + 0.8, pz - 1.8], {
    material: 'metallic',
  });
  nova64.scene.setScale(p.meshes.tail, 0.15, 1.4, 1.2);
}

function spawnAsteroid(randomZ = false) {
  const side = Math.random() > 0.5 ? 1 : -1;
  const x = side * (5 + Math.random() * 35);
  const y = -2 + Math.random() * 15;
  const z = randomZ ? 10 - Math.random() * 250 : -250 - Math.random() * 50;
  const sz = 1.5 + Math.random() * 4;

  const mesh = nova64.scene.createSphere(sz, C.asteroid, [x, y, z], 6, {
    material: 'standard',
    roughness: 0.9,
  });
  game.asteroids.push({
    mesh,
    x,
    y,
    z,
    sz,
    rotSpeed: (Math.random() - 0.5) * 2.5,
    rotAxisX: Math.random(),
    rotAxisY: Math.random(),
  });
}

function spawnEnemy() {
  const x = (Math.random() - 0.5) * 40;
  const y = 4 + Math.random() * 14;
  const z = -200 - Math.random() * 40;

  const core = nova64.scene.createSphere(1.8, C.drone, [x, y, z], 8, {
    material: 'metallic',
    metalness: 0.8,
  });
  const eye = nova64.scene.createSphere(0.8, C.droneEye, [x, y, z + 1.5], 8, {
    material: 'emissive',
    emissive: C.droneEye,
  });
  const wL = nova64.scene.createCube(1, C.droneWing, [x - 2.5, y, z], { material: 'metallic' });
  nova64.scene.setScale(wL, 2.5, 0.15, 0.8);
  const wR = nova64.scene.createCube(1, C.droneWing, [x + 2.5, y, z], { material: 'metallic' });
  nova64.scene.setScale(wR, 2.5, 0.15, 0.8);

  game.enemies.push({
    parts: [
      { mesh: core, ox: 0, oy: 0, oz: 0 },
      { mesh: eye, ox: 0, oy: 0, oz: 1.5 },
      { mesh: wL, ox: -2.5, oy: 0, oz: 0 },
      { mesh: wR, ox: 2.5, oy: 0, oz: 0 },
    ],
    x,
    y,
    z,
    health: 30,
    vx: (Math.random() - 0.5) * 18,
    vy: (Math.random() - 0.5) * 10,
    vz: 40 + Math.random() * 30,
    timer: 0,
  });
}

function spawnBoss() {
  const x = 0;
  const y = 8;
  const z = -150;
  const core = nova64.scene.createCube(6, 0xff0000, [x, y, z], {
    material: 'metallic',
    metalness: 0.9,
    roughness: 0.1,
  });
  const eyeL = nova64.scene.createSphere(1.5, 0xffffff, [x - 2, y + 1, z + 3], 8, {
    material: 'emissive',
    emissive: 0xffffff,
    intensity: 2,
  });
  const eyeR = nova64.scene.createSphere(1.5, 0xffffff, [x + 2, y + 1, z + 3], 8, {
    material: 'emissive',
    emissive: 0xffffff,
    intensity: 2,
  });
  const mouth = nova64.scene.createCube(3, 0x000000, [x, y - 2, z + 2.5], { material: 'standard' });
  nova64.scene.setScale(mouth, 1, 0.2, 1);

  game.boss = {
    parts: [
      { mesh: core, ox: 0, oy: 0, oz: 0 },
      { mesh: eyeL, ox: -2, oy: 1, oz: 3 },
      { mesh: eyeR, ox: 2, oy: 1, oz: 3 },
      { mesh: mouth, ox: 0, oy: -2, oz: 2.5 },
    ],
    x,
    y,
    z,
    hp: 50,
    maxHp: 50,
    vx: 0,
    vy: 0,
    vz: 10,
    timer: 0,
  };
  game.bossSpawned = true;
}

function updateBoss(dt) {
  if (!game.boss) return;
  const b = game.boss;
  b.timer += dt;

  if (b.z < -40) b.z += b.vz * dt;
  else {
    b.x = Math.sin(b.timer * 0.5) * 15;
    b.y = 8 + Math.cos(b.timer * 0.7) * 5;

    if (b.timer > 2 && Math.random() < 0.05) {
      fireEnemyShot(b.x - 2, b.y + 1, b.z + 3);
      fireEnemyShot(b.x + 2, b.y + 1, b.z + 3);
    }
  }

  b.parts.forEach(part => {
    nova64.scene.setPosition(part.mesh, b.x + part.ox, b.y + part.oy, b.z + part.oz);
  });
}

function spawnRing() {
  const x = (Math.random() - 0.5) * 30;
  const y = 3 + Math.random() * 12;
  const z = -200 - Math.random() * 20;

  // Emissive glowing ring
  const mesh =
    typeof createTorus === 'function'
      ? nova64.scene.createTorus(x, y, z, 2.0, 0.35, C.ring)
      : nova64.scene.createSphere(2.0, C.ring, [x, y, z], 8, {
          material: 'emissive',
          emissive: 0xffaa00,
        });

  if (typeof createTorus !== 'function') nova64.scene.setScale(mesh, 1.0, 1.0, 0.1);
  game.rings.push({ mesh, x, y, z, collected: false });
}

// ── Shooting ───────────────────────────────────────────
function fireLaser() {
  const p = game.player;
  // Twin lasers from wing tips
  for (const offX of [-2.0, 2.0]) {
    // Apply roll to offsets
    const r = p.roll + p.barrelRoll;
    const cosR = Math.cos(r);
    const sinR = Math.sin(r);

    // Rotate laser origin around ship center based on roll
    const actualOffX = offX * cosR;
    const actualOffY = offX * sinR;

    const bx = p.x + actualOffX,
      by = p.y - actualOffY,
      bz = p.z - 2;
    const mesh = nova64.scene.createCube(0.6, C.laser, [bx, by, bz], {
      material: 'emissive',
      emissive: C.laser,
    });
    nova64.scene.setScale(mesh, 0.3, 0.3, 5.0);
    game.bullets.push({ mesh, x: bx, y: by, z: bz, vz: -240, life: 2.0 });
  }
  nova64.audio.sfx('laser');
}

function fireEnemyShot(ex, ey, ez) {
  const p = game.player;
  const dx = p.x - ex,
    dy = p.y - ey,
    dz = p.z - ez;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const spd = 75;

  const mesh = nova64.scene.createSphere(0.8, C.enemyShot, [ex, ey, ez], 6, {
    material: 'emissive',
    emissive: C.enemyShot,
  });
  nova64.scene.setScale(mesh, 0.6, 0.6, 2.5);
  // Optional: align projectile to velocity vector

  game.enemyBullets.push({
    mesh,
    x: ex,
    y: ey,
    z: ez,
    vx: (dx / d) * spd,
    vy: (dy / d) * spd,
    vz: (dz / d) * spd,
    life: 3.5,
  });
}

function createExplosion(x, y, z, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const mesh = nova64.scene.createCube(0.6, color, [x, y, z], {
      material: 'emissive',
      emissive: color,
    });
    const spd = 15 + Math.random() * 25;
    const a1 = Math.random() * Math.PI * 2;
    const a2 = Math.random() * Math.PI * 2;
    game.particles.push({
      mesh,
      x,
      y,
      z,
      vx: Math.cos(a1) * Math.sin(a2) * spd,
      vy: Math.sin(a1) * spd * 0.8,
      vz: Math.cos(a1) * Math.cos(a2) * spd,
      life: 0.5 + Math.random() * 0.6,
      maxLife: 1.1,
      isTrail: false,
    });
  }
}

function spawnTrail() {
  const p = game.player;
  for (const offX of [-1.2, 1.2]) {
    const r = p.roll + p.barrelRoll;
    const actualOffX = offX * Math.cos(r) - -0.15 * Math.sin(r);
    const actualOffY = -(offX * Math.sin(r) + -0.15 * Math.cos(r));

    let x = p.x + actualOffX;
    let y = p.y + actualOffY;
    let z = p.z + 2.0;

    const mesh = nova64.scene.createCube(0.5, C.shipEngine, [x, y, z], {
      material: 'emissive',
      emissive: C.shipEngine,
    });
    game.particles.push({
      mesh,
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      vz: game.speed * 0.8,
      life: 0.2 + Math.random() * 0.1,
      maxLife: 0.3,
      isTrail: true,
    });
  }
}

// ── Update ─────────────────────────────────────────────
export function update(dt) {
  gameTime += dt;

  if (gameState === 'start' || gameState === 'gameover') {
    if (inputLockout > 0) inputLockout -= dt;
    nova64.ui.updateAllButtons();
    updateGrid(dt * 0.3);
    updateArwingIdle(dt);
    if (inputLockout <= 0 && nova64.input.isKeyPressed('Space')) startGame();
    return;
  }

  // Playing
  game.distance += game.speed * dt;
  game.score += dt * 25;
  game.speed = Math.min(110, 60 + game.score * 0.0015);

  // Increase difficulty
  if (game.kills > 0 && game.kills % 15 === 0 && game.wave < 10) {
    game.wave = Math.floor(game.kills / 15) + 1;
  }

  updateArwing(dt);
  updateGrid(dt);
  updateAsteroids(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateEnemyBullets(dt);
  _local_updateParticles(dt);
  updateRings(dt);

  // Dynamic camera follow
  const camTag = game.player;
  const cx = camTag.x * 0.3;
  const cy = camTag.y * 0.5 + 8;
  nova64.camera.setCameraPosition(cx, cy, 22);
  nova64.camera.setCameraTarget(cx * 0.5, camTag.y * 0.8, -30);
}

function startGame() {
  if (gameState === 'playing') return;
  gameState = 'playing';
  inputLockout = 0.3;

  game.score = 0;
  game.kills = 0;
  game.wave = 1;
  game.speed = 60;
  game.player.health = 100;
  playerHit.invulnTimer = 0;
  weaponCD.remaining = 0;
  game.enemySpawnTimer = 0;
  game.ringSpawnTimer = 0;
  game.bossSpawned = false;
  if (game.boss) {
    game.boss.parts.forEach(p => nova64.scene.destroyMesh(p.mesh));
    game.boss = null;
  }

  // Clean up old objects
  game.enemies.forEach(e => e.parts.forEach(p => nova64.scene.destroyMesh(p.mesh)));
  game.bullets.forEach(b => nova64.scene.destroyMesh(b.mesh));
  game.enemyBullets.forEach(b => nova64.scene.destroyMesh(b.mesh));
  game.particles.forEach(p => nova64.scene.destroyMesh(p.mesh));
  game.rings.forEach(r => nova64.scene.destroyMesh(r.mesh));
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.particles = [];
  game.rings = [];

  nova64.ui.clearButtons();
}

// ── Arwing Movement ────────────────────────────────────
function updateArwing(dt) {
  const p = game.player;

  if (p.health <= 0) {
    createExplosion(p.x, p.y, p.z, C.explosion, 30);
    createExplosion(p.x, p.y, p.z, 0xffffff, 10);
    // Hide all ship parts
    Object.values(game.player.meshes).forEach(m => m && nova64.scene.setPosition(m, 1000, 0, 0));
    gameState = 'gameover';
    inputLockout = 1.0;
    nova64.audio.sfx('death');
    initGameOverScreen();
    return;
  }

  nova64.util.updateHitState(playerHit, dt);

  // Barrel Roll Logic (Press Q/E or trigger dynamically)
  if (
    !p.isBarrelRolling &&
    (nova64.input.isKeyPressed('KeyQ') ||
      nova64.input.isKeyPressed('KeyE') ||
      nova64.input.btnp(1) ||
      nova64.input.btnp(2))
  ) {
    p.isBarrelRolling = true;
    p.rollSpeed = nova64.input.isKeyPressed('KeyE') ? -Math.PI * 6 : Math.PI * 6; // Fast spin
    playerHit.invulnTimer = Math.max(playerHit.invulnTimer, 0.5); // Invincible during roll!
    nova64.audio.sfx('jump');
  }

  if (p.isBarrelRolling) {
    p.barrelRoll += p.rollSpeed * dt;
    if (Math.abs(p.barrelRoll) >= Math.PI * 2) {
      p.barrelRoll = 0;
      p.isBarrelRolling = false;
    }
  }

  // Input — smooth velocity-based movement
  let ix = 0,
    iy = 0;
  if (
    nova64.input.key('ArrowLeft') ||
    nova64.input.key('KeyA') ||
    nova64.input.btn(14) ||
    nova64.input.btn(12)
  )
    ix = -1;
  if (
    nova64.input.key('ArrowRight') ||
    nova64.input.key('KeyD') ||
    nova64.input.btn(15) ||
    nova64.input.btn(13)
  )
    ix = 1;
  if (
    nova64.input.key('ArrowUp') ||
    nova64.input.key('KeyW') ||
    nova64.input.btn(12) ||
    nova64.input.btn(14)
  )
    iy = 1;
  if (
    nova64.input.key('ArrowDown') ||
    nova64.input.key('KeyS') ||
    nova64.input.btn(13) ||
    nova64.input.btn(15)
  )
    iy = -1;

  const accel = 140,
    friction = 5.0;
  p.vx += ix * accel * dt;
  p.vy += iy * accel * dt;
  p.vx *= 1 - friction * dt;
  p.vy *= 1 - friction * dt;

  // Apply movement
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // Clamp to play area
  if (p.x < -24) {
    p.x = -24;
    p.vx = 0;
  }
  if (p.x > 24) {
    p.x = 24;
    p.vx = 0;
  }
  if (p.y < 1) {
    p.y = 1;
    p.vy = 0;
  }
  if (p.y > 20) {
    p.y = 20;
    p.vy = 0;
  }

  // Rolling tilt from lateral movement
  const targetRoll = -p.vx * 0.05;
  p.roll += (targetRoll - p.roll) * 8 * dt;

  // Position all ship meshes
  positionArwing(p, p.roll + p.barrelRoll);

  // Engine trails
  if (Math.random() < 0.6) spawnTrail();

  // Shooting
  nova64.util.updateCooldown(weaponCD, dt);
  if ((nova64.input.key('Space') || nova64.input.btn(0)) && nova64.util.useCooldown(weaponCD)) {
    fireLaser();
  }
}

function updateArwingIdle(dt) {
  const p = game.player;
  const bob = Math.sin(gameTime * 2.0) * 0.8;
  const sway = Math.sin(gameTime * 1.2) * 0.5;
  const idleRoll = Math.sin(gameTime * 1.5) * 0.08;

  p.x = sway;
  p.y = 6 + bob;
  positionArwing(p, idleRoll);
}

function positionArwing(p, totalRoll) {
  const m = p.meshes;
  const rx = 0;
  const rz = totalRoll;

  // Helper to rotate local offsets around Z
  const applyRot = (ox, oy, oz) => {
    const cosR = Math.cos(rz),
      sinR = Math.sin(rz);
    return [p.x + ox * cosR - oy * sinR, p.y + ox * sinR + oy * cosR, p.z + oz];
  };

  if (!m.body) return; // Skip if dead/hidden

  nova64.scene.setPosition(m.body, ...applyRot(0, 0, 0));
  nova64.scene.setRotation(m.body, 0, 0, rz);

  nova64.scene.setPosition(m.cockpit, ...applyRot(0, 0.4, 0.8));
  nova64.scene.setRotation(m.cockpit, 0, 0, rz);

  nova64.scene.setPosition(m.wingL, ...applyRot(-2.2, -0.1, -0.3));
  nova64.scene.setRotation(m.wingL, 0, 0, rz);

  nova64.scene.setPosition(m.wingR, ...applyRot(2.2, -0.1, -0.3));
  nova64.scene.setRotation(m.wingR, 0, 0, rz);

  nova64.scene.setPosition(m.engineL, ...applyRot(-1.2, -0.15, -2.0));
  nova64.scene.setRotation(m.engineL, 0, 0, rz);

  nova64.scene.setPosition(m.engineR, ...applyRot(1.2, -0.15, -2.0));
  nova64.scene.setRotation(m.engineR, 0, 0, rz);

  nova64.scene.setPosition(m.tail, ...applyRot(0, 0.8, -1.8));
  nova64.scene.setRotation(m.tail, 0, 0, rz);
}

// ── World Updates ──────────────────────────────────────
function updateGrid(dt) {
  const total = 35 * 5;
  game.gridPlanes.forEach(g => {
    g.z += game.speed * dt;
    if (g.z > 15) g.z -= total;
    nova64.scene.setInstanceTransform(g.instanceId, g.index, g.x, -4, g.z, -Math.PI / 2, 0, 0);
  });
  if (gridInstanceA) nova64.scene.finalizeInstances(gridInstanceA);
  if (gridInstanceB) nova64.scene.finalizeInstances(gridInstanceB);
}

function updateAsteroids(dt) {
  for (let i = game.asteroids.length - 1; i >= 0; i--) {
    const a = game.asteroids[i];
    a.z += game.speed * dt;
    nova64.scene.rotateMesh(a.mesh, a.rotSpeed * dt * a.rotAxisX, a.rotSpeed * dt * a.rotAxisY, 0);
    nova64.scene.setPosition(a.mesh, a.x, a.y, a.z);

    if (a.z > 25) {
      nova64.scene.destroyMesh(a.mesh);
      game.asteroids.splice(i, 1);
      spawnAsteroid(false);
    }
  }
}

function updateEnemies(dt) {
  if (game.wave >= 3 && !game.bossSpawned && game.enemies.length === 0) spawnBoss();
  if (game.boss) updateBoss(dt);
  game.enemySpawnTimer -= dt;
  if (game.enemySpawnTimer <= 0 && game.enemies.length < 10) {
    spawnEnemy();
    game.enemySpawnTimer = Math.max(0.6, 2.5 - game.wave * 0.2);
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    e.timer += dt;

    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.z += e.vz * dt;

    // Bounce off edges with roll effect
    if (e.x < -36 || e.x > 36) e.vx *= -1;
    if (e.y < 2 || e.y > 22) e.vy *= -1;

    const bob = Math.sin(e.timer * 4) * 1.5;
    const bank = -e.vx * 0.05;

    e.parts.forEach((part, idx) => {
      // Basic rotation application for drone parts
      const ox = part.ox,
        oy = part.oy;
      const rx = e.x + ox * Math.cos(bank) - oy * Math.sin(bank);
      const ry = e.y + ox * Math.sin(bank) + oy * Math.cos(bank) + bob;
      nova64.scene.setPosition(part.mesh, rx, ry, e.z + part.oz);
      nova64.scene.setRotation(part.mesh, 0, 0, bank);
    });

    // Predict and shoot
    if (e.timer > 1.0 && Math.random() < 0.02) {
      fireEnemyShot(e.x, e.y + bob, e.z);
    }

    if (e.z > 30) {
      e.parts.forEach(part => nova64.scene.destroyMesh(part.mesh));
      game.enemies.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.z += b.vz * dt;
    b.life -= dt;
    nova64.scene.setPosition(b.mesh, b.x, b.y, b.z);

    if (b.life <= 0 || b.z < -250) {
      nova64.scene.destroyMesh(b.mesh);
      game.bullets.splice(i, 1);
      continue;
    }

    let hit = false;

    // Boss Collision
    if (game.boss) {
      const boss = game.boss;
      const dist = Math.hypot(b.x - boss.x, b.z - boss.z);
      if (dist < 5 && Math.abs(b.y - boss.y) < 5) {
        boss.hp -= 10;
        hit = true;
        createExplosion(b.x, b.y, b.z, C.spark, 3);
        nova64.audio.sfx('hit');
        if (boss.hp <= 0) {
          game.score += 5000;
          createExplosion(boss.x, boss.y, boss.z, 0xffffff, 50);
          boss.parts.forEach(p => nova64.scene.destroyMesh(p.mesh));
          game.boss = null;
          game.wave++;
          nova64.audio.sfx('explosion');
        }
      }
    }

    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const e = game.enemies[j];
      if (Math.abs(b.x - e.x) < 3.5 && Math.abs(b.y - e.y) < 3.0 && Math.abs(b.z - e.z) < 4.5) {
        e.health -= 20; // stronger lasers
        hit = true;
        if (e.health <= 0) {
          createExplosion(e.x, e.y, e.z, C.explosion);
          createExplosion(e.x, e.y, e.z, 0xffbb00, 8); // secondary burst
          game.score += 500;
          game.kills++;
          nova64.audio.sfx('explosion');
          e.parts.forEach(part => nova64.scene.destroyMesh(part.mesh));
          game.enemies.splice(j, 1);
        } else {
          createExplosion(b.x, b.y, b.z, C.spark, 4); // hit spark
          nova64.audio.sfx('hit');
        }
        break;
      }
    }

    if (!hit) {
      for (let j = game.asteroids.length - 1; j >= 0; j--) {
        const a = game.asteroids[j];
        const hitDist = a.sz + 1.5;
        if (
          Math.abs(b.x - a.x) < hitDist &&
          Math.abs(b.y - a.y) < hitDist &&
          Math.abs(b.z - a.z) < hitDist
        ) {
          createExplosion(b.x, b.y, b.z, C.spark, 5);
          if (a.sz < 2.5) {
            // Break medium/small ones
            createExplosion(a.x, a.y, a.z, C.asteroid, 8);
            game.score += 150;
            nova64.scene.destroyMesh(a.mesh);
            game.asteroids.splice(j, 1);
            spawnAsteroid(false);
          }
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      nova64.scene.destroyMesh(b.mesh);
      game.bullets.splice(i, 1);
    }
  }
}

function updateEnemyBullets(dt) {
  const p = game.player;
  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const b = game.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.life -= dt;

    // Rotate projectile based on velocity
    const yaw = Math.atan2(b.vx, b.vz);
    const pitch = Math.atan2(-b.vy, Math.sqrt(b.vx * b.vx + b.vz * b.vz));
    nova64.scene.setRotation(b.mesh, pitch, yaw, 0);
    nova64.scene.setPosition(b.mesh, b.x, b.y, b.z);

    if (
      nova64.util.isInvulnerable(playerHit) === false &&
      Math.abs(b.x - p.x) < 2.0 &&
      Math.abs(b.y - p.y) < 1.8 &&
      Math.abs(b.z - p.z) < 2.5
    ) {
      p.health -= 25;
      nova64.util.triggerHit(playerHit);
      nova64.audio.sfx('hit');
      createExplosion(p.x, p.y, p.z, C.explosion, 8);
      nova64.scene.destroyMesh(b.mesh);
      game.enemyBullets.splice(i, 1);
      continue;
    }

    if (b.life <= 0 || b.z > 30) {
      nova64.scene.destroyMesh(b.mesh);
      game.enemyBullets.splice(i, 1);
    }
  }
}

function _local_updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    nova64.scene.setPosition(p.mesh, p.x, p.y, p.z);

    if (p.isTrail) {
      const s = Math.max(0.01, p.life / p.maxLife) * 0.5;
      nova64.scene.setScale(p.mesh, s, s, s * 2);
    } else {
      const s = Math.max(0.01, p.life / p.maxLife);
      nova64.scene.setScale(p.mesh, s, s, s);
    }

    if (p.life <= 0) {
      nova64.scene.destroyMesh(p.mesh);
      game.particles.splice(i, 1);
    }
  }
}

function updateRings(dt) {
  game.ringSpawnTimer -= dt;
  if (game.ringSpawnTimer <= 0 && game.rings.length < 4) {
    spawnRing();
    game.ringSpawnTimer = 3 + Math.random() * 3;
  }

  const p = game.player;
  for (let i = game.rings.length - 1; i >= 0; i--) {
    const r = game.rings[i];
    r.z += game.speed * dt;

    nova64.scene.rotateMesh(r.mesh, 0, gameTime * 3, 0); // Active spinning
    nova64.scene.setPosition(r.mesh, r.x, r.y, r.z);

    if (Math.abs(r.x - p.x) < 3.5 && Math.abs(r.y - p.y) < 3.5 && Math.abs(r.z - p.z) < 3.5) {
      game.score += 1000;
      game.player.health = Math.min(100, game.player.health + 10); // Heal
      createExplosion(r.x, r.y, r.z, C.ring, 12);
      nova64.audio.sfx('coin');
      nova64.scene.destroyMesh(r.mesh);
      game.rings.splice(i, 1);
      continue;
    }

    if (r.z > 30) {
      nova64.scene.destroyMesh(r.mesh);
      game.rings.splice(i, 1);
    }
  }
}

// ── Screens ────────────────────────────────────────────
function initStartScreen() {
  nova64.ui.clearButtons();
  nova64.ui.createButton(
    nova64.ui.centerX(260),
    250,
    260,
    52,
    '▶ LAUNCH ARWING',
    () => {
      startGame();
    },
    {
      normalColor: nova64.draw.rgba8(0, 180, 255, 255),
      hoverColor: nova64.draw.rgba8(60, 220, 255, 255),
      pressedColor: nova64.draw.rgba8(0, 120, 200, 255),
    }
  );
}

function initGameOverScreen() {
  nova64.ui.clearButtons();
  nova64.ui.createButton(
    nova64.ui.centerX(220),
    265,
    220,
    50,
    '↻ MISSION RETRY',
    () => {
      gameState = 'start';
      inputLockout = 0.6;
      initStartScreen();
    },
    {
      normalColor: nova64.draw.rgba8(220, 50, 50, 255),
      hoverColor: nova64.draw.rgba8(255, 80, 80, 255),
      pressedColor: nova64.draw.rgba8(180, 30, 30, 255),
    }
  );
}

// ── Draw ───────────────────────────────────────────────
export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }

  if (gameState === 'gameover') {
    drawGameOverScreen();
    return;
  }

  drawHUD();
}

function drawStartScreen() {
  nova64.draw.cls(nova64.draw.rgba8(2, 4, 16, 255));
  nova64.draw.drawGradient(
    0,
    0,
    640,
    360,
    nova64.draw.rgba8(2, 6, 20, 255),
    nova64.draw.rgba8(1, 2, 8, 255),
    'v'
  );

  // Intense Nebula glow
  nova64.draw.drawRadialGradient(
    320,
    90,
    280,
    nova64.draw.rgba8(0, 100, 255, 50),
    nova64.draw.rgba8(0, 0, 0, 0)
  );
  nova64.draw.drawRadialGradient(
    320,
    90,
    140,
    nova64.draw.rgba8(0, 220, 255, 40),
    nova64.draw.rgba8(0, 0, 0, 0)
  );

  nova64.draw.drawNoise(0, 0, 640, 360, 12, Math.floor(gameTime * 5));

  const sp = Math.sin(gameTime * 3.5) * 0.5 + 0.5;
  nova64.draw.drawStarburst(
    40,
    35,
    16,
    6,
    8,
    nova64.draw.rgba8(0, 200, 255, Math.floor(sp * 200)),
    true
  );
  nova64.draw.drawStarburst(
    600,
    35,
    16,
    6,
    8,
    nova64.draw.rgba8(0, 200, 255, Math.floor(sp * 200)),
    true
  );

  nova64.draw.drawWave(
    0,
    180,
    640,
    6,
    0.03,
    gameTime * 3.2,
    nova64.draw.rgba8(0, 150, 255, 100),
    2
  );
  nova64.draw.drawWave(
    0,
    184,
    640,
    4,
    0.045,
    gameTime * 3.8 + 1,
    nova64.draw.rgba8(0, 255, 200, 70),
    1
  );

  const bob = Math.sin(gameTime * 2.0) * 8;
  nova64.draw.drawGlowTextCentered(
    'STAR FOX',
    320,
    46 + bob,
    nova64.draw.rgba8(0, 220, 255, 255),
    nova64.draw.rgba8(0, 80, 255, 200),
    3
  );
  nova64.draw.drawGlowTextCentered(
    'NOVA 64',
    320,
    100 + bob,
    nova64.draw.rgba8(140, 200, 255, 255),
    nova64.draw.rgba8(20, 60, 180, 180),
    2
  );

  nova64.ui.setFont('large');
  nova64.ui.setTextAlign('center');
  const subPulse = Math.sin(gameTime * 4) * 0.25 + 0.75;
  nova64.ui.drawText(
    'ULTIMATE SPACE COMBAT',
    320,
    148,
    nova64.draw.rgba8(0, 255, 200, Math.floor(subPulse * 255)),
    1
  );

  const panel = nova64.ui.createPanel(nova64.ui.centerX(440), 190, 440, 92, {
    bgColor: nova64.draw.rgba8(4, 10, 30, 230),
    borderColor: nova64.draw.rgba8(0, 180, 255, 255),
    borderWidth: 2,
    shadow: true,
  });
  nova64.draw.drawPanel(panel);

  nova64.ui.setFont('small');
  nova64.ui.drawText('◆ Blast enemy forces and avoid asteroids', 320, 208, uiColors.light, 1);
  nova64.ui.drawText('◆ Collect rings to heal and points', 320, 223, uiColors.light, 1);
  nova64.ui.drawText(
    '◆ Press Q or E to BARREL ROLL! (Invincibility)',
    320,
    240,
    nova64.draw.rgba8(255, 220, 50, 255),
    1
  );

  nova64.ui.drawAllButtons();

  nova64.ui.setFont('tiny');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawText('WASD / Arrows: Steer  ◆  Space: Fire', 320, 316, uiColors.secondary, 1);
  const alpha = Math.floor((Math.sin(gameTime * 6) * 0.5 + 0.5) * 255);
  nova64.ui.drawText(
    '◆ PRESS SPACE TO LAUNCH ◆',
    320,
    335,
    nova64.draw.rgba8(0, 220, 255, alpha),
    1
  );

  nova64.draw.drawScanlines(45, 3);
}

function drawGameOverScreen() {
  nova64.draw.rect(0, 0, 640, 360, nova64.draw.rgba8(100, 0, 0, 180), true);
  nova64.draw.drawNoise(0, 0, 640, 360, 20, Math.floor(gameTime * 8));

  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawTextShadow(
    'MISSION FAILED',
    320,
    100,
    nova64.draw.rgba8(255, 50, 50, 255),
    nova64.draw.rgba8(0, 0, 0, 255),
    4,
    1
  );

  nova64.ui.setFont('large');
  nova64.ui.drawText('FINAL SCORE', 320, 160, nova64.draw.rgba8(180, 200, 255, 200), 1);

  nova64.ui.setFont('huge');
  nova64.ui.drawText(
    Math.floor(game.score).toString(),
    320,
    195,
    nova64.draw.rgba8(0, 255, 200, 255),
    1
  );

  nova64.ui.setFont('normal');
  nova64.ui.drawText(
    'ENEMIES DESTROYED: ' + game.kills,
    320,
    235,
    nova64.draw.rgba8(255, 180, 80, 220),
    1
  );
  nova64.ui.drawText(
    'WAVE REACHED: ' + game.wave,
    320,
    255,
    nova64.draw.rgba8(160, 200, 255, 200),
    1
  );

  nova64.ui.drawAllButtons();
  nova64.draw.drawScanlines(40, 2);
}

function drawHUD() {
  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('left');

  // Top info bar background
  nova64.draw.rect(0, 0, 640, 28, nova64.draw.rgba8(0, 4, 16, 180), true);
  nova64.draw.line(0, 28, 640, 28, nova64.draw.rgba8(0, 160, 255, 100));

  nova64.ui.drawTextShadow(
    'SCORE ' + Math.floor(game.score),
    16,
    8,
    nova64.draw.rgba8(0, 255, 200, 255),
    nova64.draw.rgba8(0, 0, 0, 200),
    2,
    1
  );
  nova64.ui.drawText('WAVE ' + game.wave, 180, 8, nova64.draw.rgba8(180, 200, 255, 200), 1);
  nova64.ui.drawText('KILLS ' + game.kills, 300, 8, nova64.draw.rgba8(255, 180, 80, 180), 1);

  nova64.ui.setTextAlign('right');
  nova64.ui.drawText(
    'SPD ' + Math.floor(game.speed),
    624,
    8,
    nova64.draw.rgba8(100, 200, 255, 180),
    1
  );

  // Modern angled health bar
  const barX = 420,
    barY = 330,
    barW = 200,
    barH = 16;
  // Frame
  nova64.draw.rect(
    barX - 2,
    barY - 2,
    barW + 4,
    barH + 4,
    nova64.draw.rgba8(0, 150, 255, 150),
    false
  );
  nova64.draw.rect(barX, barY, barW, barH, nova64.draw.rgba8(20, 0, 0, 200), true);

  const hp = Math.max(0, game.player.health);
  const hpW = (hp / 100) * barW;
  const hpColor =
    hp > 50
      ? nova64.draw.rgba8(0, 255, 100, 255)
      : hp > 25
        ? nova64.draw.rgba8(255, 200, 0, 255)
        : nova64.draw.rgba8(255, 50, 50, 255);
  nova64.draw.rect(barX, barY, hpW, barH, hpColor, true);

  nova64.ui.setTextAlign('right');
  nova64.ui.setFont('small');
  nova64.ui.drawText('SHIELD', barX - 10, barY + 3, nova64.draw.rgba8(180, 200, 255, 200), 1);

  // Cool Crosshair
  const cx = 320,
    cy = 180;
  const retColor = nova64.draw.rgba8(0, 255, 200, 180);
  nova64.draw.line(cx - 15, cy, cx - 5, cy, retColor);
  nova64.draw.line(cx + 5, cy, cx + 15, cy, retColor);
  nova64.draw.line(cx, cy - 15, cx, cy - 5, retColor);
  nova64.draw.line(cx, cy + 5, cx, cy + 15, retColor);
  // Center dot
  nova64.draw.rect(cx - 1, cy - 1, 3, 3, nova64.draw.rgba8(255, 0, 0, 200), true);

  // Invuln flash / barrel roll glow
  if (nova64.util.isInvulnerable(playerHit)) {
    if (game.player.isBarrelRolling) {
      const rollAlpha = Math.floor(Math.sin(gameTime * 40) * 30 + 30);
      nova64.draw.rect(0, 0, 640, 360, nova64.draw.rgba8(0, 180, 255, rollAlpha), true);
    } else {
      const flashAlpha = Math.floor(Math.sin(gameTime * 30) * 40 + 40);
      nova64.draw.rect(0, 0, 640, 360, nova64.draw.rgba8(255, 0, 0, flashAlpha), true);
    }
  }
}
