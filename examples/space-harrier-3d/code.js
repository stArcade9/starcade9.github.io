// ⭐ SPACE HARRIER NOVA 64 - Exceptional 2.5D/3D Rail Shooter ⭐

let gameState = 'start';
let gameTime = 0;
let inputLockoutCD;
let weaponCD;

// Colors
const PALETTE = {
  sky: 0xaa22ff,
  ground1: 0x22cc55,
  ground2: 0x118833,
  playerBody: 0xff3333,
  playerHead: 0xffccaa,
  gun: 0xcccccc,
  bullet: 0xffff00,
  enemy: 0xaa22ff,
  enemyEye: 0x00ff00,
  enemyShot: 0xff00ff,
  treeTrunk: 0x8b4513,
  treeLeaves: 0x11aa55,
  pillar: 0xffaa00,
  explosion: 0xff5500,
};

let game = {
  player: {
    x: 0,
    y: 0,
    z: -5,
    health: 100,
    meshes: {},
    animPhase: 0,
    bobPhase: 0,
  },
  speed: 45,
  distance: 0,
  score: 0,
  lives: 3,
  wave: 0,
  waveTimer: 0,
  waveEnemiesLeft: 0,
  waveClear: false,
  waveClearTimer: 0,
  powerup: null, // active power-up type
  powerupTimer: 0,
  powerupPickups: [], // on-screen power-up meshes
  shake: null,
  killStreak: 0,
  streakTimer: 0,

  gridPlanes: [],
  scenery: [],
  enemies: [],
  bullets: [],
  enemyBullets: [],
  particles: [],
  enemySpawnTimer: 0,
};

export async function init() {
  console.log('🚀 SPACE HARRIER NOVA 64 - Loading...');

  setCameraPosition(0, 5, 12);
  setCameraTarget(0, 3, -50);
  setCameraFOV(70);

  // Vibrant alien sky and effects
  setAmbientLight(0xffffff, 1.0);
  setLightDirection(-0.5, -1, -0.5);
  setLightColor(0xfff0dd);
  setFog(PALETTE.sky, 30, 150);

  // Retro presentation with modern shader touch
  if (typeof enablePixelation === 'function') enablePixelation(1);
  if (typeof enableDithering === 'function') enableDithering(true);
  enableBloom(1.0, 0.5, 0.3); // Alien sky & bullet glow
  enableFXAA();
  enableVignette(1.0, 0.95);

  createCheckeredFloor();
  createPlayer();

  for (let i = 0; i < 40; i++) {
    spawnScenery(true);
  }

  inputLockoutCD = createCooldown(0.6);
  inputLockoutCD.timer = 0.6; // start locked out
  weaponCD = createCooldown(0.12);
  game.shake = createShake({ decay: 5 });

  initStartScreen();
}

function createCheckeredFloor() {
  const cols = 22;
  const rows = 35;
  const size = 5;
  const startX = -(cols * size) / 2;
  const startZ = 20;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isAlt = (r + c) % 2 === 0;
      const color = isAlt ? PALETTE.ground1 : PALETTE.ground2;
      const x = startX + c * size + size / 2;
      const z = startZ - r * size - size / 2;
      const y = -2;

      const plane = createPlane(size, size, color, [x, y, z]);
      rotateMesh(plane, -Math.PI / 2, 0, 0);

      game.gridPlanes.push({
        mesh: plane,
        x: x,
        y: y,
        z: z,
        size: size,
      });
    }
  }
}

function createPlayer() {
  const p = game.player;
  const bx = p.x,
    by = p.y,
    bz = p.z;

  p.meshes.body = createCube(1.2, PALETTE.playerBody, [bx, by, bz]);
  setScale(p.meshes.body, 1.0, 1.3, 0.8);

  p.meshes.head = createSphere(0.6, PALETTE.playerHead, [bx, by + 1.2, bz], 8);

  p.meshes.hair = createCube(0.7, 0x5a2d0c, [bx, by + 1.5, bz + 0.1]);
  setScale(p.meshes.hair, 1.1, 0.4, 1.1);

  p.meshes.jetpack = createCube(0.8, 0x888888, [bx, by + 0.2, bz + 0.6]);
  setScale(p.meshes.jetpack, 1.2, 1.5, 0.5);

  p.meshes.gun = createCube(0.5, PALETTE.gun, [bx + 0.8, by, bz - 1.5]);
  setScale(p.meshes.gun, 0.6, 0.6, 3.5);

  p.meshes.armL = createCube(0.4, PALETTE.playerBody, [bx - 0.8, by + 0.2, bz]);
  setScale(p.meshes.armL, 0.7, 1.8, 0.7);

  p.meshes.armR = createCube(0.4, PALETTE.playerBody, [bx + 0.8, by + 0.2, bz]);
  setScale(p.meshes.armR, 0.7, 1.8, 0.7);

  p.meshes.legL = createCube(0.4, PALETTE.playerBody, [bx - 0.4, by - 1.0, bz]);
  setScale(p.meshes.legL, 0.8, 2.0, 0.8);

  p.meshes.legR = createCube(0.4, PALETTE.playerBody, [bx + 0.4, by - 1.0, bz]);
  setScale(p.meshes.legR, 0.8, 2.0, 0.8);

  p.meshes.flameL = createCube(0.3, 0xffaa00, [bx - 0.3, by - 0.6, bz + 0.6]);
  p.meshes.flameR = createCube(0.3, 0xffaa00, [bx + 0.3, by - 0.6, bz + 0.6]);
}

function spawnScenery(randomZ = false) {
  const isLeft = Math.random() > 0.5;
  const x = (isLeft ? -1 : 1) * (15 + Math.random() * 25);
  const z = randomZ ? 10 - Math.random() * 120 : -120;
  const y = -2;

  const type = Math.random() > 0.5 ? 'tree' : 'pillar';
  let parts = [];

  if (type === 'tree') {
    const height = 3 + Math.random() * 6;
    const trunk = createCube(1, PALETTE.treeTrunk, [x, y + height / 2, z]);
    setScale(trunk, 1, height, 1);

    // Exceptional foliage look
    const top = createSphere(2.5 + Math.random(), PALETTE.treeLeaves, [x, y + height + 1, z], 6);
    parts.push({ mesh: trunk, oy: y + height / 2 });
    parts.push({ mesh: top, oy: y + height + 1 });
  } else {
    // Exceptional floating glowing rings/pillars
    const pHeight = 6 + Math.random() * 8;
    // We try to pass a nice high-end color and maybe emissive
    const pillarOptions = {
      material: 'holographic',
      color: PALETTE.pillar,
      emissive: 0xaa2200,
      opacity: 0.8,
      transparent: true,
    };
    // Use createAdvancedCube for holographic/emissive material support
    const pillar = createAdvancedCube(1, pillarOptions, [x, y + pHeight / 2, z]);

    setScale(pillar, 2, pHeight, 2);
    parts.push({ mesh: pillar, oy: y + pHeight / 2 });
  }

  game.scenery.push({
    parts: parts,
    x: x,
    z: z,
  });
}

function spawnEnemy(type) {
  const x = (Math.random() - 0.5) * 40;
  const z = -120;
  const y = 3 + Math.random() * 15;
  type = type || 'normal';

  let color = PALETTE.enemy;
  let hp = 30;
  let spd = 30 + Math.random() * 30;
  let size = 2.5;

  if (type === 'fast') {
    color = 0x00ccff;
    hp = 15;
    spd = 60 + Math.random() * 30;
    size = 1.8;
  } else if (type === 'tank') {
    color = 0xff4400;
    hp = 80;
    spd = 20 + Math.random() * 15;
    size = 3.5;
  } else if (type === 'boss') {
    color = 0xff0000;
    hp = 200 + game.wave * 50;
    spd = 15;
    size = 5;
  }

  const core = createSphere(size, color, [x, y, z], 8);
  const eye = createSphere(size * 0.5, PALETTE.enemyEye, [x, y, z + size * 0.8], 8);

  const wingL = createCube(size * 0.6, 0x5500aa, [x - size * 1.2, y, z]);
  setScale(wingL, 3, 0.2, 1);
  const wingR = createCube(size * 0.6, 0x5500aa, [x + size * 1.2, y, z]);
  setScale(wingR, 3, 0.2, 1);

  game.enemies.push({
    parts: [
      { mesh: core, ox: 0, oy: 0, oz: 0 },
      { mesh: eye, ox: 0, oy: 0, oz: size * 0.8 },
      { mesh: wingL, ox: -size * 1.2, oy: 0, oz: 0 },
      { mesh: wingR, ox: size * 1.2, oy: 0, oz: 0 },
    ],
    x: x,
    y: y,
    z: z,
    health: hp,
    maxHealth: hp,
    type: type,
    vx: (Math.random() - 0.5) * 20,
    vy: (Math.random() - 0.5) * 10,
    vz: spd,
    timer: 0,
  });
}

function firePlayerBullet(xOffset) {
  const p = game.player;
  const x = p.x + 0.8 + (xOffset || 0);
  const y = p.y;
  const z = p.z - 2;

  const bullet = createCube(0.8, PALETTE.bullet, [x, y, z]);
  setScale(bullet, 0.5, 0.5, 6.0);

  game.bullets.push({
    mesh: bullet,
    x: x,
    y: y,
    z: z,
    vz: -180,
    life: 2.0,
  });
}

function fireEnemyBullet(ex, ey, ez) {
  const bullet = createSphere(1.2, PALETTE.enemyShot, [ex, ey, ez], 6);

  const p = game.player;
  const dx = p.x - ex,
    dy = p.y - ey,
    dz = p.z - ez;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const speed = 70 + game.score * 0.001;

  game.enemyBullets.push({
    mesh: bullet,
    x: ex,
    y: ey,
    z: ez,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    vz: (dz / dist) * speed,
    life: 3.0,
  });
}

function createExplosion(x, y, z, color) {
  for (let i = 0; i < 15; i++) {
    const p = createCube(0.8, color, [x, y, z]);
    const speed = 15 + Math.random() * 25;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;

    game.particles.push({
      mesh: p,
      x: x,
      y: y,
      z: z,
      vx: Math.cos(angle1) * Math.sin(angle2) * speed,
      vy: Math.sin(angle1) * speed,
      vz: Math.cos(angle1) * Math.cos(angle2) * speed,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1.0,
    });
  }
}

export function update(dt) {
  gameTime += dt;

  if (gameState === 'start' || gameState === 'gameover') {
    updateCooldown(inputLockoutCD, dt);
    updateAllButtons();
    updateGrid(dt * 0.4);

    // Animate player idly
    updatePlayer(dt, true);

    if (cooldownReady(inputLockoutCD) && isKeyPressed('Space')) startGame();
    return;
  }

  game.distance += game.speed * dt;
  game.score += dt * 25;
  game.speed = Math.min(100, 45 + game.wave * 3);
  updateShake(game.shake, dt);

  // Kill streak timer
  if (game.streakTimer > 0) {
    game.streakTimer -= dt;
    if (game.streakTimer <= 0) game.killStreak = 0;
  }

  // Power-up timer
  if (game.powerupTimer > 0) {
    game.powerupTimer -= dt;
    if (game.powerupTimer <= 0) game.powerup = null;
  }

  // Wave management
  if (game.waveClear) {
    game.waveClearTimer -= dt;
    if (game.waveClearTimer <= 0) {
      game.waveClear = false;
      startWave(game.wave + 1);
    }
  } else if (game.waveEnemiesLeft <= 0 && game.enemies.length === 0 && game.wave > 0) {
    game.waveClear = true;
    game.waveClearTimer = 2.0;
    const waveBonus = game.wave * 200;
    game.score += waveBonus;
    sfx('powerup');
  }

  updatePlayer(dt, false);
  updateGrid(dt);
  updateScenery(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateEnemyBullets(dt);
  updateParticles(dt);
  updatePowerupPickups(dt);
}

function startGame() {
  if (gameState === 'playing') return;
  inputLockoutCD.timer = 0.3;
  gameState = 'playing';
  game.score = 0;
  game.player.health = 100;
  game.speed = 45;
  game.lives = 3;
  game.wave = 0;
  game.powerup = null;
  game.powerupTimer = 0;
  game.killStreak = 0;
  game.streakTimer = 0;
  game.waveClear = false;

  game.enemies.forEach(e => e.parts.forEach(p => destroyMesh(p.mesh)));
  game.enemyBullets.forEach(b => destroyMesh(b.mesh));
  game.bullets.forEach(b => destroyMesh(b.mesh));
  game.powerupPickups.forEach(p => destroyMesh(p.mesh));

  game.enemies = [];
  game.enemyBullets = [];
  game.bullets = [];
  game.powerupPickups = [];
  clearButtons();

  startWave(1);
}

function startWave(num) {
  game.wave = num;
  const baseCount = 4 + num * 2;
  game.waveEnemiesLeft = baseCount;
  game.enemySpawnTimer = 0.5;
}

function spawnPowerup(x, y, z) {
  const types = ['health', 'rapid', 'spread', 'shield'];
  const type = types[Math.floor(Math.random() * types.length)];
  const colors = { health: 0x00ff00, rapid: 0xffff00, spread: 0xff8800, shield: 0x00ccff };
  const mesh = createSphere(1.5, colors[type], [x, y, z], 6);
  game.powerupPickups.push({ mesh, x, y, z, type, timer: 0 });
}

function updatePowerupPickups(dt) {
  const p = game.player;
  for (let i = game.powerupPickups.length - 1; i >= 0; i--) {
    const pu = game.powerupPickups[i];
    pu.z += game.speed * dt * 0.5;
    pu.timer += dt;
    setPosition(pu.mesh, pu.x, pu.y + Math.sin(pu.timer * 4) * 1.5, pu.z);
    setRotation(pu.mesh, 0, pu.timer * 3, 0);

    // Collect
    if (Math.abs(pu.x - p.x) < 3 && Math.abs(pu.y - p.y) < 3 && Math.abs(pu.z - p.z) < 4) {
      if (pu.type === 'health') {
        p.health = Math.min(100, p.health + 40);
      } else {
        game.powerup = pu.type;
        game.powerupTimer = 8;
      }
      sfx('coin');
      destroyMesh(pu.mesh);
      game.powerupPickups.splice(i, 1);
      continue;
    }

    if (pu.z > 25) {
      destroyMesh(pu.mesh);
      game.powerupPickups.splice(i, 1);
    }
  }
}

function updatePlayer(dt, isIdle) {
  const p = game.player;
  if (!isIdle && p.health <= 0) {
    createExplosion(p.x, p.y, p.z, PALETTE.playerBody);
    sfx('explosion');
    game.lives--;
    if (game.lives <= 0) {
      gameState = 'gameover';
      initGameOverScreen();
    } else {
      // Respawn with brief invulnerability
      p.health = 100;
      p.x = 0;
      p.y = 0;
      game.powerup = 'shield';
      game.powerupTimer = 3;
    }
    return;
  }

  let dx = 0;
  let dy = 0;
  if (!isIdle) {
    if (key('ArrowLeft') || key('a')) dx = -1;
    if (key('ArrowRight') || key('d')) dx = 1;
    if (key('ArrowUp') || key('w')) dy = 1;
    if (key('ArrowDown') || key('s')) dy = -1;
  }

  const moveSpeed = 45;
  p.x += dx * moveSpeed * dt;
  p.y += dy * moveSpeed * dt;

  if (p.x < -22) p.x = -22;
  if (p.x > 22) p.x = 22;
  if (p.y < 0) p.y = 0;
  if (p.y > 18) p.y = 18;

  const isGrounded = p.y < 0.5;
  p.animPhase += dt * (isGrounded ? 18 : 6);
  p.bobPhase += dt * moveSpeed * 0.25;

  const bY = p.y + (isGrounded && dx !== 0 ? Math.abs(Math.sin(p.bobPhase)) * 0.8 : 0);

  setPosition(p.meshes.body, p.x, bY, p.z);
  setPosition(p.meshes.head, p.x, bY + 1.2, p.z);
  setPosition(p.meshes.gun, p.x + 0.8, bY - 0.2, p.z - 1.5);

  if (isGrounded && (dx !== 0 || isIdle)) {
    // idle running in place effectively
    const legSwing = Math.sin(p.animPhase) * 1.5;
    setPosition(p.meshes.legL, p.x - 0.4, bY - 1.0, p.z + legSwing);
    setPosition(p.meshes.legR, p.x + 0.4, bY - 1.0, p.z - legSwing);
  } else {
    setPosition(p.meshes.legL, p.x - 0.4, bY - 1.0, p.z + 0.5);
    setPosition(p.meshes.legR, p.x + 0.4, bY - 1.0, p.z + 0.5);
  }

  updateCooldown(weaponCD, dt);
  const fireRate = game.powerup === 'rapid' ? 0.04 : 0.12;
  weaponCD.duration = fireRate;
  if (!isIdle && key('Space') && useCooldown(weaponCD)) {
    firePlayerBullet();
    if (game.powerup === 'spread') {
      firePlayerBullet(-8);
      firePlayerBullet(8);
    }
  }
}

function updateGrid(dt) {
  const totalLength = 35 * 5;
  game.gridPlanes.forEach(g => {
    g.z += game.speed * dt;
    if (g.z > 20) {
      g.z -= totalLength;
    }
    setPosition(g.mesh, g.x, g.y, g.z);
  });
}

function updateScenery(dt) {
  game.scenery.forEach(s => {
    s.z += game.speed * dt;
    if (s.z > 20) {
      s.z -= 140 + Math.random() * 60;
      s.x = (Math.random() > 0.5 ? -1 : 1) * (15 + Math.random() * 30);
    }
    s.parts.forEach(p => {
      setPosition(p.mesh, s.x, p.oy, s.z);
    });
  });
}

function updateEnemies(dt) {
  game.enemySpawnTimer -= dt;
  if (game.enemySpawnTimer <= 0 && game.waveEnemiesLeft > 0) {
    game.waveEnemiesLeft--;
    // Enemy type distribution based on wave
    const roll = Math.random();
    if (game.wave >= 3 && game.waveEnemiesLeft === 0 && game.wave % 3 === 0) {
      spawnEnemy('boss');
    } else if (roll < 0.15 && game.wave >= 2) {
      spawnEnemy('fast');
    } else if (roll < 0.25 && game.wave >= 4) {
      spawnEnemy('tank');
    } else {
      spawnEnemy('normal');
    }
    game.enemySpawnTimer = Math.max(0.4, 1.5 - game.wave * 0.08);
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    e.timer += dt;

    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.z += e.vz * dt;

    if (e.x < -30 || e.x > 30) e.vx *= -1;
    if (e.y < 2 || e.y > 20) e.vy *= -1;

    const bob = Math.sin(e.timer * 4) * 2;

    e.parts.forEach(p => {
      setPosition(p.mesh, e.x + p.ox, e.y + p.oy + bob, e.z + p.oz);
    });

    if (e.timer > 1.5 && Math.random() < (e.type === 'boss' ? 0.06 : 0.02)) {
      fireEnemyBullet(e.x, e.y + bob, e.z);
    }

    // Boss fires spread
    if (e.type === 'boss' && e.timer > 2 && Math.random() < 0.01) {
      for (let a = -2; a <= 2; a++) {
        fireEnemyBullet(e.x + a * 3, e.y + bob, e.z);
      }
    }

    if (e.z > 20) {
      e.parts.forEach(p => destroyMesh(p.mesh));
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

    if (b.life <= 0 || b.z < -150) {
      destroyMesh(b.mesh);
      game.bullets.splice(i, 1);
      continue;
    }

    let hit = false;
    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const e = game.enemies[j];
      if (Math.abs(b.x - e.x) < 3.0 && Math.abs(b.y - e.y) < 3.0 && Math.abs(b.z - e.z) < 4.0) {
        e.health -= 15;
        hit = true;
        sfx('hit');
        if (e.health <= 0) {
          createExplosion(e.x, e.y, e.z, PALETTE.explosion);
          const killPoints =
            e.type === 'boss' ? 3000 : e.type === 'tank' ? 1000 : e.type === 'fast' ? 700 : 500;
          game.score += killPoints;
          game.killStreak++;
          game.streakTimer = 2;
          if (game.killStreak >= 5) {
            game.score += game.killStreak * 100;
          }
          sfx('explosion');
          // 25% chance to drop power-up
          if (Math.random() < 0.25) {
            spawnPowerup(e.x, e.y, e.z);
          }
          e.parts.forEach(p => destroyMesh(p.mesh));
          game.enemies.splice(j, 1);
        }
        break;
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

    setPosition(b.mesh, b.x, b.y, b.z);

    if (Math.abs(b.x - p.x) < 1.5 && Math.abs(b.y - p.y) < 2.0 && Math.abs(b.z - p.z) < 2.0) {
      if (game.powerup === 'shield') {
        // Shield absorbs hit
      } else {
        p.health -= 25;
        triggerShake(game.shake, 0.4);
        sfx('hit');
      }
      createExplosion(p.x, p.y, p.z, PALETTE.playerBody);
      destroyMesh(b.mesh);
      game.enemyBullets.splice(i, 1);
      continue;
    }

    if (b.life <= 0 || b.z > 20) {
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

    const alpha = p.life / p.maxLife;
    setScale(p.mesh, alpha, alpha, alpha);

    if (p.life <= 0) {
      destroyMesh(p.mesh);
      game.particles.splice(i, 1);
    }
  }
}

function initStartScreen() {
  clearButtons();
  createButton(
    centerX(240),
    252,
    240,
    52,
    '▶ START MISSION',
    () => {
      startGame();
    },
    { normalColor: uiColors.success, hoverColor: rgba8(60, 220, 120, 255) }
  );
}

function drawStartScreen() {
  // Solid opaque base — guaranteed to cover the 3D scene
  cls(rgba8(5, 0, 15, 255));

  // Rich alien-world gradient layered on top
  drawGradient(0, 0, 640, 360, rgba8(20, 5, 55, 255), rgba8(4, 0, 18, 255), 'v');

  // Radial spotlight glow behind title
  drawRadialGradient(320, 105, 230, rgba8(200, 60, 255, 48), rgba8(0, 0, 0, 0));

  // Cosmic starfield noise
  drawNoise(0, 0, 640, 360, 22, Math.floor(gameTime * 6));

  // Distant planet arc at horizon
  drawRadialGradient(320, 440, 280, rgba8(80, 0, 160, 70), rgba8(0, 0, 0, 0));

  // Corner starbursts — pulsing
  const sp = Math.sin(gameTime * 2) * 0.5 + 0.5;
  drawStarburst(30, 30, 18, 7, 6, rgba8(255, 140, 0, Math.floor(sp * 210)), true);
  drawStarburst(610, 30, 18, 7, 6, rgba8(255, 140, 0, Math.floor(sp * 210)), true);
  drawStarburst(30, 330, 12, 5, 5, rgba8(180, 0, 255, Math.floor((1 - sp) * 180)), true);
  drawStarburst(610, 330, 12, 5, 5, rgba8(180, 0, 255, Math.floor((1 - sp) * 180)), true);

  // More scattered star shots across the sky
  drawStarburst(90, 70, 7, 3, 4, rgba8(255, 255, 180, Math.floor(sp * 160)), true);
  drawStarburst(550, 55, 6, 2, 4, rgba8(200, 180, 255, Math.floor((1 - sp) * 150)), true);
  drawStarburst(480, 80, 5, 2, 5, rgba8(255, 200, 100, Math.floor(sp * 130)), true);

  // Energy wave at the horizon line
  drawWave(0, 185, 640, 6, 0.028, gameTime * 2.2, rgba8(180, 0, 255, 100), 2);
  drawWave(0, 190, 640, 4, 0.042, gameTime * 2.8 + 1.0, rgba8(255, 100, 0, 75), 2);

  // Main title — SPACE HARRIER with orange/flame glow
  const titleBob = Math.sin(gameTime * 1.8) * 7;
  drawGlowTextCentered(
    'SPACE',
    320,
    44 + titleBob,
    rgba8(255, 160, 0, 255),
    rgba8(160, 50, 0, 170),
    2
  );
  drawGlowTextCentered(
    'HARRIER',
    320,
    98 + titleBob,
    rgba8(255, 80, 20, 255),
    rgba8(120, 20, 0, 160),
    2
  );

  // Subtitle
  const subPulse = Math.sin(gameTime * 3) * 0.25 + 0.75;
  setFont('large');
  setTextAlign('center');
  drawText('NOVA 64 EDITION', 320, 152, rgba8(120, 200, 255, Math.floor(subPulse * 255)), 1);

  // Tagline
  setFont('normal');
  drawText('THE LEGENDARY RAIL SHOOTER RETURNS', 320, 174, rgba8(200, 150, 255, 200), 1);

  // Info panel
  const panel = createPanel(centerX(440), 200, 440, 92, {
    bgColor: rgba8(15, 5, 35, 215),
    borderColor: rgba8(180, 60, 255, 255),
    borderWidth: 2,
    shadow: true,
  });
  drawPanel(panel);

  setFont('small');
  setTextAlign('center');
  drawText('◆ Blast through waves of alien enemies', 320, 218, uiColors.light, 1);
  drawText('◆ Dodge projectiles & collect power-ups', 320, 233, uiColors.light, 1);
  drawText('◆ Retro N64 rail-shooter with 3D visuals', 320, 248, uiColors.light, 1);

  // Buttons
  drawAllButtons();

  // Controls hint
  setFont('tiny');
  drawText('WASD / Arrows: Move  ◆  Space: Shoot', 320, 318, uiColors.secondary, 1);

  // Pulsing prompt
  const alpha = Math.floor((Math.sin(gameTime * 5) * 0.5 + 0.5) * 255);
  drawText('◆ PRESS SPACE TO LAUNCH ◆', 320, 334, rgba8(255, 160, 0, alpha), 1);

  // CRT scanlines
  drawScanlines(45, 2);
}

function initGameOverScreen() {
  clearButtons();
  createButton(
    centerX(220),
    260,
    220,
    50,
    '↻ RETRY',
    () => {
      gameState = 'start';
      inputLockoutCD.timer = 0.6;
      initStartScreen();
    },
    { normalColor: uiColors.danger, hoverColor: rgba8(250, 60, 60, 255) }
  );
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }

  if (gameState === 'gameover') {
    rect(0, 0, 640, 360, rgba8(100, 0, 0, 150), true);
    setFont('huge');
    setTextAlign('center');
    drawTextShadow('GAME OVER', 320, 120, uiColors.danger, rgba8(0, 0, 0, 255), 4, 1);

    setFont('normal');
    drawText('SCORE: ' + Math.floor(game.score), 320, 180, uiColors.warning, 1);
    drawAllButtons();
    return;
  }

  setFont('normal');
  setTextAlign('left');
  drawText('SCORE: ' + Math.floor(game.score), 20, 20, uiColors.warning, 1);
  drawText(`WAVE ${game.wave}`, 20, 40, rgba8(0, 255, 255, 255), 1);

  // Lives
  for (let i = 0; i < game.lives; i++) {
    rect(170 + i * 18, 22, 12, 12, rgba8(255, 50, 50, 255), true);
  }

  // Health bar
  rect(420, 20, 200, 20, rgba8(50, 0, 0, 200), true);
  const hpWidth = Math.max(0, game.player.health * 2);
  rect(420, 20, hpWidth, 20, hpWidth > 40 ? uiColors.success : uiColors.danger, true);
  rect(420, 20, 200, 20, uiColors.light, false);

  // Power-up indicator
  if (game.powerup) {
    const puColors = {
      rapid: rgba8(255, 255, 0, 255),
      spread: rgba8(255, 136, 0, 255),
      shield: rgba8(0, 200, 255, 255),
    };
    drawText(
      `${game.powerup.toUpperCase()} ${Math.ceil(game.powerupTimer)}s`,
      420,
      46,
      puColors[game.powerup] || uiColors.light,
      1
    );
  }

  // Kill streak
  if (game.killStreak >= 3) {
    setTextAlign('center');
    drawText(`${game.killStreak}x STREAK!`, 320, 60, rgba8(255, 200, 50, 255), 1);
    setTextAlign('left');
  }

  // Wave clear message
  if (game.waveClear) {
    setTextAlign('center');
    setFont('large');
    drawText(`WAVE ${game.wave} CLEAR!`, 320, 160, rgba8(0, 255, 100, 255), 1);
    setFont('normal');
    drawText(`+${game.wave * 200} BONUS`, 320, 185, rgba8(255, 255, 100, 255), 1);
    setTextAlign('left');
  }
}
