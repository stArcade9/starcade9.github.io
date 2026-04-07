// ⭐ STAR FOX NOVA 64 — Space Combat Rail Shooter ⭐
// Ultimate 3D Edition with Holographic Materials, Barrel Rolls, and Cinematic Lighting

// ── State ──────────────────────────────────────────────
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
  setCameraPosition(0, 12, 22);
  setCameraTarget(0, 4, -30);
  setCameraFOV(75);

  // Lighting — dramatic space lighting
  setAmbientLight(0x111122, 1.2);
  setLightDirection(-0.5, -1, -0.5);
  setLightColor(0xffffff);

  // Deep space fog
  setFog(0x020308, 50, 300);

  if (typeof createSpaceSkybox === 'function') {
    createSpaceSkybox({ starCount: 3000, starSize: 2.5, nebulae: true, nebulaColor: 0x1a0044 });
  }

  // Post-processing — cinematic space feel
  enableBloom(1.2, 0.4, 0.4); // Intense bloom for lasers/engines
  if (typeof enableFXAA === 'function') enableFXAA();
  if (typeof enableVignette === 'function') enableVignette(1.2, 0.92);

  // Build world
  createGridFloor();
  createArwing();
  playerHit = createHitState({ invulnDuration: 1.0, blinkRate: 30 });
  weaponCD = createCooldown(0.1);
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
  gridInstanceA = createInstancedMesh('plane', halfCount, 0x050a14, {
    width: size,
    height: size,
    material: 'standard',
    roughness: 0.8,
  });
  gridInstanceB = createInstancedMesh('plane', halfCount, 0x081020, {
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
        setInstanceTransform(gridInstanceA, idxA, x, -4, z, -Math.PI / 2, 0, 0);
        game.gridPlanes.push({ instanceId: gridInstanceA, index: idxA, x, z });
        idxA++;
      } else {
        setInstanceTransform(gridInstanceB, idxB, x, -4, z, -Math.PI / 2, 0, 0);
        game.gridPlanes.push({ instanceId: gridInstanceB, index: idxB, x, z });
        idxB++;
      }
    }
  }
  finalizeInstances(gridInstanceA);
  finalizeInstances(gridInstanceB);
}

function createArwing() {
  const p = game.player;
  const px = p.x,
    py = p.y,
    pz = p.z;

  // Fuselage (Metallic)
  p.meshes.body = createCube(1.8, C.shipBody, [px, py, pz], {
    material: 'metallic',
    metalness: 0.9,
    roughness: 0.2,
  });
  setScale(p.meshes.body, 0.8, 0.5, 2.5);

  // Cockpit canopy (Glass/Holographic)
  p.meshes.cockpit = createSphere(0.5, C.shipCockpit, [px, py + 0.4, pz + 0.8], 12, {
    material: 'holographic',
    transparent: true,
    opacity: 0.8,
    emissive: 0x0044aa,
  });
  setScale(p.meshes.cockpit, 0.8, 0.6, 1.2);

  // Wings (Metallic Blue)
  p.meshes.wingL = createCube(1, C.shipWing, [px - 2.2, py - 0.1, pz - 0.3], {
    material: 'metallic',
    metalness: 0.8,
  });
  setScale(p.meshes.wingL, 2.8, 0.1, 1.8);

  p.meshes.wingR = createCube(1, C.shipWing, [px + 2.2, py - 0.1, pz - 0.3], {
    material: 'metallic',
    metalness: 0.8,
  });
  setScale(p.meshes.wingR, 2.8, 0.1, 1.8);

  // Engine glow pods (Emissive)
  p.meshes.engineL = createCube(0.4, C.shipEngine, [px - 1.2, py - 0.15, pz - 2.0], {
    material: 'emissive',
    emissive: C.shipEngine,
  });
  setScale(p.meshes.engineL, 0.8, 0.6, 1.0);

  p.meshes.engineR = createCube(0.4, C.shipEngine, [px + 1.2, py - 0.15, pz - 2.0], {
    material: 'emissive',
    emissive: C.shipEngine,
  });
  setScale(p.meshes.engineR, 0.8, 0.6, 1.0);

  // Tail fin
  p.meshes.tail = createCube(0.3, C.shipWing, [px, py + 0.8, pz - 1.8], { material: 'metallic' });
  setScale(p.meshes.tail, 0.15, 1.4, 1.2);
}

function spawnAsteroid(randomZ = false) {
  const side = Math.random() > 0.5 ? 1 : -1;
  const x = side * (5 + Math.random() * 35);
  const y = -2 + Math.random() * 15;
  const z = randomZ ? 10 - Math.random() * 250 : -250 - Math.random() * 50;
  const sz = 1.5 + Math.random() * 4;

  const mesh = createSphere(sz, C.asteroid, [x, y, z], 6, { material: 'standard', roughness: 0.9 });
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

  const core = createSphere(1.8, C.drone, [x, y, z], 8, { material: 'metallic', metalness: 0.8 });
  const eye = createSphere(0.8, C.droneEye, [x, y, z + 1.5], 8, {
    material: 'emissive',
    emissive: C.droneEye,
  });
  const wL = createCube(1, C.droneWing, [x - 2.5, y, z], { material: 'metallic' });
  setScale(wL, 2.5, 0.15, 0.8);
  const wR = createCube(1, C.droneWing, [x + 2.5, y, z], { material: 'metallic' });
  setScale(wR, 2.5, 0.15, 0.8);

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
  const core = createCube(6, 0xff0000, [x, y, z], {
    material: 'metallic',
    metalness: 0.9,
    roughness: 0.1,
  });
  const eyeL = createSphere(1.5, 0xffffff, [x - 2, y + 1, z + 3], 8, {
    material: 'emissive',
    emissive: 0xffffff,
    intensity: 2,
  });
  const eyeR = createSphere(1.5, 0xffffff, [x + 2, y + 1, z + 3], 8, {
    material: 'emissive',
    emissive: 0xffffff,
    intensity: 2,
  });
  const mouth = createCube(3, 0x000000, [x, y - 2, z + 2.5], { material: 'standard' });
  setScale(mouth, 1, 0.2, 1);

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
    setPosition(part.mesh, b.x + part.ox, b.y + part.oy, b.z + part.oz);
  });
}

function spawnRing() {
  const x = (Math.random() - 0.5) * 30;
  const y = 3 + Math.random() * 12;
  const z = -200 - Math.random() * 20;

  // Emissive glowing ring
  const mesh =
    typeof createTorus === 'function'
      ? createTorus(x, y, z, 2.0, 0.35, C.ring)
      : createSphere(2.0, C.ring, [x, y, z], 8, { material: 'emissive', emissive: 0xffaa00 });

  if (typeof createTorus !== 'function') setScale(mesh, 1.0, 1.0, 0.1);
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
    const mesh = createCube(0.6, C.laser, [bx, by, bz], {
      material: 'emissive',
      emissive: C.laser,
    });
    setScale(mesh, 0.3, 0.3, 5.0);
    game.bullets.push({ mesh, x: bx, y: by, z: bz, vz: -240, life: 2.0 });
  }
  sfx('laser');
}

function fireEnemyShot(ex, ey, ez) {
  const p = game.player;
  const dx = p.x - ex,
    dy = p.y - ey,
    dz = p.z - ez;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const spd = 75;

  const mesh = createSphere(0.8, C.enemyShot, [ex, ey, ez], 6, {
    material: 'emissive',
    emissive: C.enemyShot,
  });
  setScale(mesh, 0.6, 0.6, 2.5);
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
    const mesh = createCube(0.6, color, [x, y, z], { material: 'emissive', emissive: color });
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

    const mesh = createCube(0.5, C.shipEngine, [x, y, z], {
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
    updateAllButtons();
    updateGrid(dt * 0.3);
    updateArwingIdle(dt);
    if (inputLockout <= 0 && isKeyPressed('Space')) startGame();
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
  updateParticles(dt);
  updateRings(dt);

  // Dynamic camera follow
  const camTag = game.player;
  const cx = camTag.x * 0.3;
  const cy = camTag.y * 0.5 + 8;
  setCameraPosition(cx, cy, 22);
  setCameraTarget(cx * 0.5, camTag.y * 0.8, -30);
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
    game.boss.parts.forEach(p => destroyMesh(p.mesh));
    game.boss = null;
  }

  // Clean up old objects
  game.enemies.forEach(e => e.parts.forEach(p => destroyMesh(p.mesh)));
  game.bullets.forEach(b => destroyMesh(b.mesh));
  game.enemyBullets.forEach(b => destroyMesh(b.mesh));
  game.particles.forEach(p => destroyMesh(p.mesh));
  game.rings.forEach(r => destroyMesh(r.mesh));
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.particles = [];
  game.rings = [];

  clearButtons();
}

// ── Arwing Movement ────────────────────────────────────
function updateArwing(dt) {
  const p = game.player;

  if (p.health <= 0) {
    createExplosion(p.x, p.y, p.z, C.explosion, 30);
    createExplosion(p.x, p.y, p.z, 0xffffff, 10);
    // Hide all ship parts
    Object.values(game.player.meshes).forEach(m => m && setPosition(m, 1000, 0, 0));
    gameState = 'gameover';
    inputLockout = 1.0;
    sfx('death');
    initGameOverScreen();
    return;
  }

  updateHitState(playerHit, dt);

  // Barrel Roll Logic (Press Q/E or trigger dynamically)
  if (!p.isBarrelRolling && (isKeyPressed('KeyQ') || isKeyPressed('KeyE') || btnp(1) || btnp(2))) {
    p.isBarrelRolling = true;
    p.rollSpeed = isKeyPressed('KeyE') ? -Math.PI * 6 : Math.PI * 6; // Fast spin
    playerHit.invulnTimer = Math.max(playerHit.invulnTimer, 0.5); // Invincible during roll!
    sfx('jump');
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
  if (key('ArrowLeft') || key('KeyA') || btn(14) || btn(12)) ix = -1;
  if (key('ArrowRight') || key('KeyD') || btn(15) || btn(13)) ix = 1;
  if (key('ArrowUp') || key('KeyW') || btn(12) || btn(14)) iy = 1;
  if (key('ArrowDown') || key('KeyS') || btn(13) || btn(15)) iy = -1;

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
  updateCooldown(weaponCD, dt);
  if ((key('Space') || btn(0)) && useCooldown(weaponCD)) {
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

  setPosition(m.body, ...applyRot(0, 0, 0));
  setRotation(m.body, 0, 0, rz);

  setPosition(m.cockpit, ...applyRot(0, 0.4, 0.8));
  setRotation(m.cockpit, 0, 0, rz);

  setPosition(m.wingL, ...applyRot(-2.2, -0.1, -0.3));
  setRotation(m.wingL, 0, 0, rz);

  setPosition(m.wingR, ...applyRot(2.2, -0.1, -0.3));
  setRotation(m.wingR, 0, 0, rz);

  setPosition(m.engineL, ...applyRot(-1.2, -0.15, -2.0));
  setRotation(m.engineL, 0, 0, rz);

  setPosition(m.engineR, ...applyRot(1.2, -0.15, -2.0));
  setRotation(m.engineR, 0, 0, rz);

  setPosition(m.tail, ...applyRot(0, 0.8, -1.8));
  setRotation(m.tail, 0, 0, rz);
}

// ── World Updates ──────────────────────────────────────
function updateGrid(dt) {
  const total = 35 * 5;
  game.gridPlanes.forEach(g => {
    g.z += game.speed * dt;
    if (g.z > 15) g.z -= total;
    setInstanceTransform(g.instanceId, g.index, g.x, -4, g.z, -Math.PI / 2, 0, 0);
  });
  if (gridInstanceA) finalizeInstances(gridInstanceA);
  if (gridInstanceB) finalizeInstances(gridInstanceB);
}

function updateAsteroids(dt) {
  for (let i = game.asteroids.length - 1; i >= 0; i--) {
    const a = game.asteroids[i];
    a.z += game.speed * dt;
    rotateMesh(a.mesh, a.rotSpeed * dt * a.rotAxisX, a.rotSpeed * dt * a.rotAxisY, 0);
    setPosition(a.mesh, a.x, a.y, a.z);

    if (a.z > 25) {
      destroyMesh(a.mesh);
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
      setPosition(part.mesh, rx, ry, e.z + part.oz);
      setRotation(part.mesh, 0, 0, bank);
    });

    // Predict and shoot
    if (e.timer > 1.0 && Math.random() < 0.02) {
      fireEnemyShot(e.x, e.y + bob, e.z);
    }

    if (e.z > 30) {
      e.parts.forEach(part => destroyMesh(part.mesh));
      game.enemies.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.z += b.vz * dt;
    b.life -= dt;
    setPosition(b.mesh, b.x, b.y, b.z);

    if (b.life <= 0 || b.z < -250) {
      destroyMesh(b.mesh);
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
        sfx('hit');
        if (boss.hp <= 0) {
          game.score += 5000;
          createExplosion(boss.x, boss.y, boss.z, 0xffffff, 50);
          boss.parts.forEach(p => destroyMesh(p.mesh));
          game.boss = null;
          game.wave++;
          sfx('explosion');
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
          sfx('explosion');
          e.parts.forEach(part => destroyMesh(part.mesh));
          game.enemies.splice(j, 1);
        } else {
          createExplosion(b.x, b.y, b.z, C.spark, 4); // hit spark
          sfx('hit');
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
            destroyMesh(a.mesh);
            game.asteroids.splice(j, 1);
            spawnAsteroid(false);
          }
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      destroyMesh(b.mesh);
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
    setRotation(b.mesh, pitch, yaw, 0);
    setPosition(b.mesh, b.x, b.y, b.z);

    if (
      isInvulnerable(playerHit) === false &&
      Math.abs(b.x - p.x) < 2.0 &&
      Math.abs(b.y - p.y) < 1.8 &&
      Math.abs(b.z - p.z) < 2.5
    ) {
      p.health -= 25;
      triggerHit(playerHit);
      sfx('hit');
      createExplosion(p.x, p.y, p.z, C.explosion, 8);
      destroyMesh(b.mesh);
      game.enemyBullets.splice(i, 1);
      continue;
    }

    if (b.life <= 0 || b.z > 30) {
      destroyMesh(b.mesh);
      game.enemyBullets.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    setPosition(p.mesh, p.x, p.y, p.z);

    if (p.isTrail) {
      const s = Math.max(0.01, p.life / p.maxLife) * 0.5;
      setScale(p.mesh, s, s, s * 2);
    } else {
      const s = Math.max(0.01, p.life / p.maxLife);
      setScale(p.mesh, s, s, s);
    }

    if (p.life <= 0) {
      destroyMesh(p.mesh);
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

    rotateMesh(r.mesh, 0, gameTime * 3, 0); // Active spinning
    setPosition(r.mesh, r.x, r.y, r.z);

    if (Math.abs(r.x - p.x) < 3.5 && Math.abs(r.y - p.y) < 3.5 && Math.abs(r.z - p.z) < 3.5) {
      game.score += 1000;
      game.player.health = Math.min(100, game.player.health + 10); // Heal
      createExplosion(r.x, r.y, r.z, C.ring, 12);
      sfx('coin');
      destroyMesh(r.mesh);
      game.rings.splice(i, 1);
      continue;
    }

    if (r.z > 30) {
      destroyMesh(r.mesh);
      game.rings.splice(i, 1);
    }
  }
}

// ── Screens ────────────────────────────────────────────
function initStartScreen() {
  clearButtons();
  createButton(
    centerX(260),
    250,
    260,
    52,
    '▶ LAUNCH ARWING',
    () => {
      startGame();
    },
    {
      normalColor: rgba8(0, 180, 255, 255),
      hoverColor: rgba8(60, 220, 255, 255),
      pressedColor: rgba8(0, 120, 200, 255),
    }
  );
}

function initGameOverScreen() {
  clearButtons();
  createButton(
    centerX(220),
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
      normalColor: rgba8(220, 50, 50, 255),
      hoverColor: rgba8(255, 80, 80, 255),
      pressedColor: rgba8(180, 30, 30, 255),
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
  cls(rgba8(2, 4, 16, 255));
  drawGradient(0, 0, 640, 360, rgba8(2, 6, 20, 255), rgba8(1, 2, 8, 255), 'v');

  // Intense Nebula glow
  drawRadialGradient(320, 90, 280, rgba8(0, 100, 255, 50), rgba8(0, 0, 0, 0));
  drawRadialGradient(320, 90, 140, rgba8(0, 220, 255, 40), rgba8(0, 0, 0, 0));

  drawNoise(0, 0, 640, 360, 12, Math.floor(gameTime * 5));

  const sp = Math.sin(gameTime * 3.5) * 0.5 + 0.5;
  drawStarburst(40, 35, 16, 6, 8, rgba8(0, 200, 255, Math.floor(sp * 200)), true);
  drawStarburst(600, 35, 16, 6, 8, rgba8(0, 200, 255, Math.floor(sp * 200)), true);

  drawWave(0, 180, 640, 6, 0.03, gameTime * 3.2, rgba8(0, 150, 255, 100), 2);
  drawWave(0, 184, 640, 4, 0.045, gameTime * 3.8 + 1, rgba8(0, 255, 200, 70), 1);

  const bob = Math.sin(gameTime * 2.0) * 8;
  drawGlowTextCentered(
    'STAR FOX',
    320,
    46 + bob,
    rgba8(0, 220, 255, 255),
    rgba8(0, 80, 255, 200),
    3
  );
  drawGlowTextCentered(
    'NOVA 64',
    320,
    100 + bob,
    rgba8(140, 200, 255, 255),
    rgba8(20, 60, 180, 180),
    2
  );

  setFont('large');
  setTextAlign('center');
  const subPulse = Math.sin(gameTime * 4) * 0.25 + 0.75;
  drawText('ULTIMATE SPACE COMBAT', 320, 148, rgba8(0, 255, 200, Math.floor(subPulse * 255)), 1);

  const panel = createPanel(centerX(440), 190, 440, 92, {
    bgColor: rgba8(4, 10, 30, 230),
    borderColor: rgba8(0, 180, 255, 255),
    borderWidth: 2,
    shadow: true,
  });
  drawPanel(panel);

  setFont('small');
  drawText('◆ Blast enemy forces and avoid asteroids', 320, 208, uiColors.light, 1);
  drawText('◆ Collect rings to heal and points', 320, 223, uiColors.light, 1);
  drawText('◆ Press Q or E to BARREL ROLL! (Invincibility)', 320, 240, rgba8(255, 220, 50, 255), 1);

  drawAllButtons();

  setFont('tiny');
  setTextAlign('center');
  drawText('WASD / Arrows: Steer  ◆  Space: Fire', 320, 316, uiColors.secondary, 1);
  const alpha = Math.floor((Math.sin(gameTime * 6) * 0.5 + 0.5) * 255);
  drawText('◆ PRESS SPACE TO LAUNCH ◆', 320, 335, rgba8(0, 220, 255, alpha), 1);

  drawScanlines(45, 3);
}

function drawGameOverScreen() {
  rect(0, 0, 640, 360, rgba8(100, 0, 0, 180), true);
  drawNoise(0, 0, 640, 360, 20, Math.floor(gameTime * 8));

  setFont('huge');
  setTextAlign('center');
  drawTextShadow('MISSION FAILED', 320, 100, rgba8(255, 50, 50, 255), rgba8(0, 0, 0, 255), 4, 1);

  setFont('large');
  drawText('FINAL SCORE', 320, 160, rgba8(180, 200, 255, 200), 1);

  setFont('huge');
  drawText(Math.floor(game.score).toString(), 320, 195, rgba8(0, 255, 200, 255), 1);

  setFont('normal');
  drawText('ENEMIES DESTROYED: ' + game.kills, 320, 235, rgba8(255, 180, 80, 220), 1);
  drawText('WAVE REACHED: ' + game.wave, 320, 255, rgba8(160, 200, 255, 200), 1);

  drawAllButtons();
  drawScanlines(40, 2);
}

function drawHUD() {
  setFont('normal');
  setTextAlign('left');

  // Top info bar background
  rect(0, 0, 640, 28, rgba8(0, 4, 16, 180), true);
  line(0, 28, 640, 28, rgba8(0, 160, 255, 100));

  drawTextShadow(
    'SCORE ' + Math.floor(game.score),
    16,
    8,
    rgba8(0, 255, 200, 255),
    rgba8(0, 0, 0, 200),
    2,
    1
  );
  drawText('WAVE ' + game.wave, 180, 8, rgba8(180, 200, 255, 200), 1);
  drawText('KILLS ' + game.kills, 300, 8, rgba8(255, 180, 80, 180), 1);

  setTextAlign('right');
  drawText('SPD ' + Math.floor(game.speed), 624, 8, rgba8(100, 200, 255, 180), 1);

  // Modern angled health bar
  const barX = 420,
    barY = 330,
    barW = 200,
    barH = 16;
  // Frame
  rect(barX - 2, barY - 2, barW + 4, barH + 4, rgba8(0, 150, 255, 150), false);
  rect(barX, barY, barW, barH, rgba8(20, 0, 0, 200), true);

  const hp = Math.max(0, game.player.health);
  const hpW = (hp / 100) * barW;
  const hpColor =
    hp > 50 ? rgba8(0, 255, 100, 255) : hp > 25 ? rgba8(255, 200, 0, 255) : rgba8(255, 50, 50, 255);
  rect(barX, barY, hpW, barH, hpColor, true);

  setTextAlign('right');
  setFont('small');
  drawText('SHIELD', barX - 10, barY + 3, rgba8(180, 200, 255, 200), 1);

  // Cool Crosshair
  const cx = 320,
    cy = 180;
  const retColor = rgba8(0, 255, 200, 180);
  line(cx - 15, cy, cx - 5, cy, retColor);
  line(cx + 5, cy, cx + 15, cy, retColor);
  line(cx, cy - 15, cx, cy - 5, retColor);
  line(cx, cy + 5, cx, cy + 15, retColor);
  // Center dot
  rect(cx - 1, cy - 1, 3, 3, rgba8(255, 0, 0, 200), true);

  // Invuln flash / barrel roll glow
  if (isInvulnerable(playerHit)) {
    if (game.player.isBarrelRolling) {
      const rollAlpha = Math.floor(Math.sin(gameTime * 40) * 30 + 30);
      rect(0, 0, 640, 360, rgba8(0, 180, 255, rollAlpha), true);
    } else {
      const flashAlpha = Math.floor(Math.sin(gameTime * 30) * 40 + 40);
      rect(0, 0, 640, 360, rgba8(255, 0, 0, flashAlpha), true);
    }
  }
}
