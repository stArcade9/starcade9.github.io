// ⚔️ VR SWORD COMBAT — Dungeon Arena Slasher ⚔️
// Swing your VR controllers as swords! Slash approaching enemies in waves.
// Works on desktop too with keyboard + mouse fallback.

// ── State ──────────────────────────────────────────────
const { drawProgressBar, print, printCentered } = nova64.draw;
const {
  createCube,
  createCylinder,
  createPlane,
  createSphere,
  removeMesh,
  rotateMesh,
  setPosition,
  setScale,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const {
  createPointLight,
  createSolidSkybox,
  setAmbientLight,
  setFog,
  setLightColor,
  setLightDirection,
} = nova64.light;
const { enableBloom } = nova64.fx;
const { btnp } = nova64.input;
const { sfx } = nova64.audio;
const { t } = nova64.data;
const { enableVR, getXRControllers, isXRActive } = nova64.xr;

let gameState = 'playing'; // 'playing' | 'gameover'
let score = 0;
let combo = 0;
let comboTimer = 0;
let wave = 1;
let kills = 0;
let killsForNextWave = 5;
let playerHealth = 100;
let gameTime = 0;

// ── Meshes ─────────────────────────────────────────────
let swords = { left: null, right: null }; // sword blade meshes
let swordTrails = [];
let floor, arena;
let torches = [];
let enemies = [];
let particles = [];
let prevCtrlPos = [null, null]; // for velocity tracking

// Desktop fallback
let desktopSword = null;
let mouseX = 0,
  mouseY = 0;

const C = {
  swordBlade: 0x00ccff,
  swordHilt: 0x886622,
  enemy: 0x882222,
  enemyEye: 0xff0000,
  skeleton: 0xccbb99,
  particle: 0xff4411,
  torchFire: 0xff6600,
  floor: 0x333340,
  wall: 0x222233,
  pillar: 0x444455,
};

// ── Init ───────────────────────────────────────────────
export function init() {
  // Enable VR (shows button, works on desktop without headset too)
  enableVR({ referenceSpace: 'local-floor' });

  // Camera for desktop view
  setCameraPosition(0, 2.5, 6);
  setCameraTarget(0, 1.5, 0);
  setCameraFOV(70);

  // Dramatic dungeon lighting
  setAmbientLight(0x1a1020, 0.4);
  setLightDirection(-0.3, -1, -0.5);
  setLightColor(0x332244);

  // Deep fog
  setFog(0x0a0812, 8, 28);

  // Skybox — dark dungeon
  createSolidSkybox(0x050408);

  // Post-processing (auto-disabled in VR)
  enableBloom(1.5, 0.3);

  // Build dungeon
  buildArena();
  createSwords();

  // Desktop mouse tracking
  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Spawn first wave
  spawnWave();
}

// ── Arena Construction ─────────────────────────────────
function buildArena() {
  // Stone floor
  floor = createPlane(20, 20, C.floor, [0, 0, 0]);
  rotateMesh(floor, -Math.PI / 2, 0, 0);

  // Arena walls (octagonal)
  const wallCount = 8;
  const radius = 9;
  for (let i = 0; i < wallCount; i++) {
    const angle = (i / wallCount) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const wall = createCube(5, C.wall, [x, 2, z], {
      material: 'standard',
      roughness: 0.9,
    });
    setScale(wall, 1, 1, 0.15);
    rotateMesh(wall, 0, -angle + Math.PI / 2, 0);
  }

  // Pillars at corners
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(angle) * 7;
    const z = Math.sin(angle) * 7;
    const pillar = createCylinder(0.4, 5, C.pillar, [x, 2.5, z], {
      material: 'standard',
      roughness: 0.7,
    });

    // Torch on each pillar
    const torchLight = createPointLight(C.torchFire, 1.8, 10, [x, 4.5, z]);
    const torchFlame = createSphere(0.2, C.torchFire, [x, 4.8, z], 6, {
      material: 'emissive',
      emissive: C.torchFire,
      intensity: 3,
    });
    torches.push({ light: torchLight, flame: torchFlame, baseY: 4.8, x, z });
  }

  // Center pedestal
  createCylinder(1.5, 0.3, C.pillar, [0, 0.15, 0], {
    material: 'metallic',
    metalness: 0.8,
  });
}

// ── Swords ─────────────────────────────────────────────
function createSwords() {
  // VR swords — positioned by controllers each frame
  swords.left = createSwordMesh();
  swords.right = createSwordMesh();

  // Desktop fallback sword
  desktopSword = createSwordMesh();
}

function createSwordMesh() {
  // Blade — holographic glowing
  const blade = createCube(1, C.swordBlade, [0, 100, 0], {
    material: 'emissive',
    emissive: C.swordBlade,
    intensity: 2,
  });
  setScale(blade, 0.04, 0.6, 0.04);
  return blade;
}

// ── Enemy Spawning ─────────────────────────────────────
function spawnWave() {
  const count = 3 + wave * 2;
  for (let i = 0; i < count; i++) {
    setTimeout(() => spawnEnemy(), i * 600);
  }
}

function spawnEnemy() {
  if (gameState !== 'playing') return;

  // Spawn from arena edges
  const angle = Math.random() * Math.PI * 2;
  const radius = 7 + Math.random() * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const isElite = wave > 2 && Math.random() < 0.25;
  const size = isElite ? 1.2 : 0.8;
  const color = isElite ? 0x882244 : C.enemy;
  const hp = isElite ? 3 : 1;

  // Body
  const body = createCube(size, color, [x, size * 0.7, z], {
    material: 'standard',
    roughness: 0.6,
  });
  setScale(body, 0.8, 1.2, 0.5);

  // Head
  const head = createSphere(size * 0.35, C.skeleton, [x, size * 1.6, z], 6, {
    material: 'standard',
  });

  // Eyes — glowing red
  const eyeL = createSphere(
    size * 0.08,
    C.enemyEye,
    [x - size * 0.12, size * 1.65, z + size * 0.25],
    4,
    {
      material: 'emissive',
      emissive: C.enemyEye,
      intensity: 3,
    }
  );
  const eyeR = createSphere(
    size * 0.08,
    C.enemyEye,
    [x + size * 0.12, size * 1.65, z + size * 0.25],
    4,
    {
      material: 'emissive',
      emissive: C.enemyEye,
      intensity: 3,
    }
  );

  enemies.push({
    parts: [body, head, eyeL, eyeR],
    x,
    y: 0,
    z,
    size,
    hp,
    maxHp: hp,
    speed: 1.5 + wave * 0.3 + (isElite ? 0.5 : 0),
    isElite,
    hitTimer: 0,
    deathTimer: -1,
  });
}

// ── Sword-Enemy Collision ──────────────────────────────
function checkSlash(swordPos, velocity) {
  if (!swordPos || gameState !== 'playing') return;

  // Require minimum swing speed
  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
  if (speed < 1.5) return;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.deathTimer >= 0) continue;

    const dx = swordPos.x - e.x;
    const dy = swordPos.y - e.size * 0.9;
    const dz = swordPos.z - e.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < e.size * 1.2) {
      e.hp--;
      e.hitTimer = 0.15;

      if (e.hp <= 0) {
        killEnemy(i);
      } else {
        sfx('hurt');
        // Knockback
        const knockDir = dist > 0 ? 1.5 / dist : 1;
        e.x += dx * knockDir;
        e.z += dz * knockDir;
      }
    }
  }
}

function killEnemy(index) {
  const e = enemies[index];

  // Explosion particles
  for (let i = 0; i < 12; i++) {
    const px = e.x + (Math.random() - 0.5) * 0.5;
    const py = e.size * 0.8 + (Math.random() - 0.5) * 0.5;
    const pz = e.z + (Math.random() - 0.5) * 0.5;
    const color = e.isElite ? 0xff44cc : C.particle;
    const mesh = createCube(0.15, color, [px, py, pz], {
      material: 'emissive',
      emissive: color,
    });
    const spd = 4 + Math.random() * 6;
    const a = Math.random() * Math.PI * 2;
    particles.push({
      mesh,
      x: px,
      y: py,
      z: pz,
      vx: Math.cos(a) * spd,
      vy: 2 + Math.random() * 4,
      vz: Math.sin(a) * spd,
      life: 0.6 + Math.random() * 0.4,
    });
  }

  // Remove enemy meshes
  e.parts.forEach(m => removeMesh(m));
  enemies.splice(index, 1);

  // Score + combo
  kills++;
  combo++;
  comboTimer = 2.0;
  const comboMult = Math.min(combo, 10);
  score += 100 * comboMult + (e.isElite ? 500 : 0);

  sfx('explosion');
  if (combo > 2) sfx('coin');

  // Next wave check
  if (kills >= killsForNextWave) {
    wave++;
    kills = 0;
    killsForNextWave = 5 + wave * 3;
    setTimeout(() => spawnWave(), 1500);
  }
}

// ── Update ─────────────────────────────────────────────
export function update(dt) {
  if (gameState !== 'playing') return;

  gameTime += dt;

  // ── Torch flicker ──
  torches.forEach((t, i) => {
    const flicker =
      Math.sin(gameTime * 8 + i * 2.3) * 0.1 + Math.sin(gameTime * 13 + i * 1.7) * 0.05;
    setPosition(t.flame, t.x, t.baseY + flicker, t.z);
  });

  // ── Combo decay ──
  comboTimer -= dt;
  if (comboTimer <= 0) {
    combo = 0;
  }

  // ── VR sword positioning ──
  if (isXRActive()) {
    updateVRSwords(dt);
    // Hide desktop sword
    setPosition(desktopSword, 0, -100, 0);
  } else {
    updateDesktopSword(dt);
    // Hide VR swords
    setPosition(swords.left, 0, -100, 0);
    setPosition(swords.right, 0, -100, 0);
  }

  // ── Enemy AI ──
  updateEnemies(dt);

  // ── Particles ──
  updateParticles(dt);

  // ── Game over check ──
  if (playerHealth <= 0) {
    gameState = 'gameover';
  }
}

function updateVRSwords(dt) {
  const ctrls = getXRControllers();

  for (let i = 0; i < ctrls.length && i < 2; i++) {
    const ctrl = ctrls[i];
    const sword = i === 0 ? swords.left : swords.right;
    const grip = ctrl.grip.position;

    // Position sword at grip, extended forward
    setPosition(sword, grip.x, grip.y + 0.3, grip.z);

    // Calculate velocity from previous position
    if (prevCtrlPos[i]) {
      const vel = {
        x: (grip.x - prevCtrlPos[i].x) / dt,
        y: (grip.y - prevCtrlPos[i].y) / dt,
        z: (grip.z - prevCtrlPos[i].z) / dt,
      };
      checkSlash(grip, vel);

      // Sword trail particles on fast swings
      const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
      if (speed > 3) {
        const trail = createCube(0.02, C.swordBlade, [grip.x, grip.y + 0.3, grip.z], {
          material: 'emissive',
          emissive: C.swordBlade,
        });
        swordTrails.push({ mesh: trail, life: 0.2 });
      }
    }
    prevCtrlPos[i] = { x: grip.x, y: grip.y, z: grip.z };
  }

  // Decay sword trails
  for (let i = swordTrails.length - 1; i >= 0; i--) {
    swordTrails[i].life -= dt;
    if (swordTrails[i].life <= 0) {
      removeMesh(swordTrails[i].mesh);
      swordTrails.splice(i, 1);
    }
  }
}

function updateDesktopSword(dt) {
  // Mouse controls the sword on desktop
  const sx = mouseX * 4;
  const sy = 1.5 + mouseY * 2;
  setPosition(desktopSword, sx, sy, 2);

  // Click to slash
  if (btnp(0)) {
    // left mouse button
    const vel = { x: mouseX * 20, y: mouseY * 20, z: -10 };
    checkSlash({ x: sx, y: sy, z: 2 }, vel);
    sfx('laser');
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    // Move toward player center (0, 0, 0) in VR, or camera in desktop
    const targetX = 0;
    const targetZ = isXRActive() ? 0 : 3;
    const dx = targetX - e.x;
    const dz = targetZ - e.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 1.0) {
      e.x += (dx / dist) * e.speed * dt;
      e.z += (dz / dist) * e.speed * dt;
    } else {
      // Enemy reached player — deal damage
      playerHealth -= 15 * dt;
    }

    // Hit flash
    if (e.hitTimer > 0) {
      e.hitTimer -= dt;
    }

    // Bobbing animation
    const bob = Math.sin(gameTime * 3 + i * 1.5) * 0.08;

    // Update mesh positions
    const headY = e.size * 1.6 + bob;
    setPosition(e.parts[0], e.x, e.size * 0.7 + bob, e.z); // body
    setPosition(e.parts[1], e.x, headY, e.z); // head

    // Eyes face toward player
    const faceAngle = Math.atan2(targetX - e.x, targetZ - e.z);
    const eyeOff = e.size * 0.25;
    setPosition(e.parts[2], e.x - e.size * 0.12, headY + 0.05, e.z + eyeOff); // eyeL
    setPosition(e.parts[3], e.x + e.size * 0.12, headY + 0.05, e.z + eyeOff); // eyeR
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      removeMesh(p.mesh);
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 12 * dt; // gravity
    setPosition(p.mesh, p.x, Math.max(0.05, p.y), p.z);
    const s = p.life * 1.5;
    setScale(p.mesh, s, s, s);
  }
}

// ── Draw HUD ───────────────────────────────────────────
export function draw() {
  if (gameState === 'gameover') {
    drawGameOver();
    return;
  }

  // Score
  print(`SCORE: ${score}`, 10, 10, 0x00ccff);
  print(`WAVE ${wave}`, 10, 30, 0xffffff);

  // Combo
  if (combo > 1) {
    const comboColor = combo > 5 ? 0xff00ff : 0xffcc00;
    print(`COMBO x${combo}!`, 10, 55, comboColor);
  }

  // Health bar
  const hpW = 120;
  const hpFill = Math.max(0, playerHealth / 100);
  const hpColor = playerHealth > 50 ? 0x00ff44 : playerHealth > 25 ? 0xffcc00 : 0xff2200;
  drawProgressBar(10, 80, hpW, 10, hpFill, hpColor, 0x222222);
  print('HP', hpW + 15, 78, 0xaaaaaa);

  // Enemies remaining
  print(`Enemies: ${enemies.length}`, 10, 100, 0xff6644);

  // Instructions
  if (!isXRActive()) {
    print('Click "Enter VR" for immersive mode', 10, 220, 0x666666);
    print('Desktop: mouse aim, click to slash', 10, 240, 0x666666);
  } else {
    print('Swing controllers to slash!', 10, 220, 0x888888);
  }
}

function drawGameOver() {
  printCentered('GAME OVER', 100, 0xff0044);
  printCentered(`Final Score: ${score}`, 140, 0xffffff);
  printCentered(`Waves Survived: ${wave}`, 170, 0x00ccff);
  if (combo > 2) {
    printCentered(`Best Combo: x${combo}`, 200, 0xffcc00);
  }
}
