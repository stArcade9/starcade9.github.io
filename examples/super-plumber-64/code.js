// ⭐ SUPER PLUMBER 64 — 3D Platforming Adventure ⭐
// Ultimate Edition: Vibrant Colors, Smooth Physics, & Dynamic Shadows

// ── Globals & State ──────────────────────────────────────────
const C = {
  sky: 0x44aaff,
  grass: 0x228811,
  dirt: 0x553311,
  plumberHat: 0xff0000,
  plumberFace: 0xffccaa,
  plumberBody: 0x0022cc,
  coin: 0xffcc00,
  enemyBody: 0xaa4400,
  brick: 0xcc6600,
  water: 0x0055ff,
};

let gameState = 'start'; // start, playing, gameover, win
let t = 0;
let inputLock = 0;

let g = {
  score: 0,
  coins: 0,
  health: 3,

  // Plumber physics
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
    punchTimer: 0,
    invuln: 0,
    meshGroup: [],
  },

  platforms: [],
  coinsList: [],
  enemies: [],
  particles: [],
};

// ── Initialization ─────────────────────────────────────────
export async function init() {
  console.log('🍄 SUPER PLUMBER 64 (Ultimate) — Initializing...');

  // Joyful cartoony look
  setCameraFOV(60);
  setCameraPosition(0, 15, 20);
  setCameraTarget(0, 0, 0);

  setAmbientLight(0xffffff, 0.8);
  setLightDirection(1, 2, 1);
  setLightColor(0xffffff);

  setFog(C.sky, 50, 150);

  if (typeof enableBloom === 'function') enableBloom(0.6, 0.8, 0.2);
  if (typeof enableFXAA === 'function') enableFXAA();
  if (typeof createSkybox === 'function') {
    createSkybox({ colorTop: 0x44bbff, colorBottom: 0xcceeaa });
  }

  buildLevel();
  buildPlumber();

  initStartScreen();
}

// ── Level Building ─────────────────────────────────────────
function buildLevel() {
  // Main Island
  addPlatform(0, -1, 0, 30, 2, 30, C.grass);

  // Surrounding water
  const water = createPlane(200, 200, C.water, [0, -3, 0], {
    material: 'standard',
    transparent: true,
    opacity: 0.6,
  });
  rotateMesh(water, -Math.PI / 2, 0, 0);

  // Stepping stones
  addPlatform(0, 2, -25, 8, 1, 8, C.grass);
  addPlatform(-15, 5, -35, 6, 1, 6, C.grass);
  addPlatform(15, 8, -45, 6, 1, 6, C.grass);

  // Giant mountain
  addPlatform(0, 5, -60, 20, 15, 20, C.dirt);
  addPlatform(0, 12, -60, 22, 1, 22, C.grass); // Top grass

  // Floating Bricks
  addPlatform(0, 6, -10, 3, 3, 3, C.brick, true);
  addPlatform(-5, 6, -10, 3, 3, 3, C.brick, true);
  addPlatform(5, 6, -10, 3, 3, 3, C.brick, true);

  // Spawn Coins
  spawnCoin(-5, 8, -10);
  spawnCoin(0, 8, -10);
  spawnCoin(5, 8, -10);

  spawnCoin(0, 4, -25);
  spawnCoin(-15, 7, -35);
  spawnCoin(15, 10, -45);

  // Coin ring on mountain
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    spawnCoin(Math.cos(a) * 6, 14, -60 + Math.sin(a) * 6);
  }

  // Spawn Enemies
  spawnEnemy(10, 0, -5);
  spawnEnemy(-10, 0, -5);
  spawnEnemy(0, 13, -60); // Mountain guard
}

function addPlatform(x, y, z, sx, sy, sz, color, isBrick = false) {
  const mesh = createCube(1, color, [x, y, z], {
    material: 'standard',
    roughness: isBrick ? 0.9 : 0.6,
  });
  setScale(mesh, sx, sy, sz);
  g.platforms.push({ mesh, x, y, z, sx, sy, sz, isBrick });
}

function spawnCoin(x, y, z) {
  const mesh = createSphere(0.8, C.coin, [x, y, z], 12, {
    material: 'metallic',
    metalness: 0.8,
    roughness: 0.2,
  });
  setScale(mesh, 1, 1, 0.2); // Flatten into a coin
  g.coinsList.push({ mesh, x, y, z, t: Math.random() * 10 });
}

function spawnEnemy(x, y, z) {
  const mesh = createSphere(1.2, C.enemyBody, [x, y + 0.6, z], 8, { material: 'standard' });
  const eyeL = createCube(0.2, 0x000000, [x - 0.4, y + 1, z + 1], { material: 'standard' });
  const eyeR = createCube(0.2, 0x000000, [x + 0.4, y + 1, z + 1], { material: 'standard' });

  g.enemies.push({
    meshes: [mesh, eyeL, eyeR],
    x,
    y,
    z,
    vx: (Math.random() > 0.5 ? 1 : -1) * 3,
    startZ: z,
    alive: true,
  });
}

function buildPlumber() {
  const p = g.p;
  // Body (Overalls)
  const body = createCube(1.2, C.plumberBody, [0, 0, 0], { material: 'standard', roughness: 0.8 });
  setScale(body, 1, 1.2, 1);

  // Head
  const head = createSphere(0.8, C.plumberFace, [0, 1.2, 0], 12, { material: 'standard' });

  // Hat
  const hat = createSphere(0.82, C.plumberHat, [0, 1.5, 0], 12, { material: 'standard' });
  setScale(hat, 1, 0.5, 1);
  const brim = createCube(1, C.plumberHat, [0, 1.4, 0.5], { material: 'standard' });
  setScale(brim, 1.2, 0.1, 0.6);

  p.meshGroup = [
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

  if (gameState !== 'playing') {
    if (inputLock > 0) inputLock -= dt;
    updateAllButtons();
    if (gameState === 'start' && inputLock <= 0 && isKeyPressed('Space')) startGame();
    return;
  }

  const p = g.p;
  if (p.invuln > 0) p.invuln -= dt;

  // Falling out of bounds
  if (p.y < -10) {
    p.y = 15;
    p.x = 0;
    p.z = 0;
    p.vx = 0;
    p.vz = 0;
    takeDamage();
  }

  handlePlayerInput(dt);
  updatePhysics(dt);
  updatePlayerMeshes();

  updateCoins(dt);
  updateEnemies(dt);
  updateParticles(dt);

  // Camera Orbit & Follow
  // Smoothly trail player
  const camDist = 12;
  const camH = 6;
  const targetCamX = p.x - Math.sin(p.rotY) * camDist;
  const targetCamZ = p.z - Math.cos(p.rotY) * camDist;

  // Simple interpolation logic for camera isn't strictly necessary for a retro feel,
  // but let's just stick to a fixed tracking for stability
  setCameraPosition(p.x, p.y + camH + 2, p.z + 14);
  setCameraTarget(p.x, p.y + 2, p.z);
}

function handlePlayerInput(dt) {
  const p = g.p;
  let ax = 0,
    az = 0;

  // Movement
  if (key('ArrowLeft') || key('KeyA') || btn(14)) ax = -1;
  if (key('ArrowRight') || key('KeyD') || btn(15)) ax = 1;
  if (key('ArrowUp') || key('KeyW') || btn(12)) az = -1;
  if (key('ArrowDown') || key('KeyS') || btn(13)) az = 1;

  const moveSpd = 30;
  p.vx += ax * moveSpd * dt;
  p.vz += az * moveSpd * dt;

  // Friction
  const fric = p.isGrounded ? 8 : 2;
  p.vx *= 1 - fric * dt;
  p.vz *= 1 - fric * dt;

  // Facing rotation
  if (Math.abs(p.vx) > 0.1 || Math.abs(p.vz) > 0.1) {
    p.rotY = Math.atan2(p.vx, p.vz);
  }

  // Jump
  if ((key('Space') || btn(0)) && p.isGrounded && p.jumpTimer <= 0) {
    p.vy = 22; // Boing!
    p.isGrounded = false;
    p.jumpTimer = 0.2;
    createFX(p.x, p.y, p.z, 0xffffff, 5, 2); // Dust jump
  }
  if (p.jumpTimer > 0) p.jumpTimer -= dt;
}

function updatePhysics(dt) {
  const p = g.p;

  // Gravity
  p.vy -= 60 * dt;
  p.isGrounded = false;

  // Move Y
  p.y += p.vy * dt;
  handleCollisions('y');

  // Move X
  p.x += p.vx * dt;
  handleCollisions('x');

  // Move Z
  p.z += p.vz * dt;
  handleCollisions('z');
}

// Simple AABB Collision
function handleCollisions(axis) {
  const p = g.p;
  // Plumber size
  const pr = 0.6;
  const ph = 2.0;

  g.platforms.forEach(plat => {
    const hx = plat.sx / 2,
      hy = plat.sy / 2,
      hz = plat.sz / 2;

    const overlapX = p.x + pr > plat.x - hx && p.x - pr < plat.x + hx;
    const overlapY = p.y + ph > plat.y - hy && p.y < plat.y + hy;
    const overlapZ = p.z + pr > plat.z - hz && p.z - pr < plat.z + hz;

    if (overlapX && overlapY && overlapZ) {
      if (axis === 'y') {
        if (p.vy < 0) {
          // Landing
          p.y = plat.y + hy;
          p.vy = 0;
          p.isGrounded = true;
        } else if (p.vy > 0) {
          // Bonk head
          p.y = plat.y - hy - ph;
          p.vy = -2;
          // Break brick?
          if (plat.isBrick) {
            createFX(plat.x, plat.y, plat.z, C.brick, 15, 10);
            g.score += 50;
            destroyMesh(plat.mesh);
            plat.destroyed = true; // Mark for cleanup
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
  });

  // Cleanup destroyed bricks
  for (let i = g.platforms.length - 1; i >= 0; i--) {
    if (g.platforms[i].destroyed) g.platforms.splice(i, 1);
  }
}

function updatePlayerMeshes() {
  const p = g.p;
  // Make invisible if hit/flashing
  const visible = p.invuln <= 0 || Math.floor(t * 15) % 2 === 0;

  const cr = Math.cos(p.rotY),
    sr = Math.sin(p.rotY);

  p.meshGroup.forEach(part => {
    if (!visible) {
      setPosition(part.m, 0, -100, 0);
      return;
    }

    // Rotate offset around Y
    const rx = part.ox * cr + part.oz * sr;
    const rz = -part.ox * sr + part.oz * cr;

    // Bobbing walk animation
    let animY = 0;
    if (p.isGrounded && (Math.abs(p.vx) > 1 || Math.abs(p.vz) > 1)) {
      animY = Math.abs(Math.sin(t * 15)) * 0.2;
    }

    setPosition(part.m, p.x + rx, p.y + part.oy + animY, p.z + rz);
    setRotation(part.m, 0, p.rotY, 0);
  });
}

function updateCoins(dt) {
  for (let i = g.coinsList.length - 1; i >= 0; i--) {
    let c = g.coinsList[i];
    c.t += dt;

    // Spin & hover
    c.y += Math.sin(c.t * 5) * 0.005;
    setPosition(c.mesh, c.x, c.y, c.z);
    setRotation(c.mesh, 0, c.t * 3, 0);

    // Collect
    const dx = c.x - g.p.x;
    const dy = c.y - (g.p.y + 1);
    const dz = c.z - g.p.z;
    if (dx * dx + dy * dy + dz * dz < 4) {
      g.score += 100;
      g.coins++;
      createFX(c.x, c.y, c.z, C.coin, 8, 8);
      destroyMesh(c.mesh);
      g.coinsList.splice(i, 1);

      // Win?
      if (g.coinsList.length === 0) {
        gameState = 'win';
        inputLock = 1.0;
        initWinScreen();
      }
    }
  }
}

function updateEnemies(dt) {
  const p = g.p;
  for (let i = g.enemies.length - 1; i >= 0; i--) {
    let e = g.enemies[i];
    if (!e.alive) continue;

    e.x += e.vx * dt;
    // Patrol back and forth
    if (Math.abs(e.x - 0) > 12) e.vx *= -1; // simple bound

    // Wobble walk
    e.y += Math.sin(t * 10 + i) * 0.01;

    e.meshes[0] && setPosition(e.meshes[0], e.x, e.y + 0.6, e.z);
    e.meshes[1] && setPosition(e.meshes[1], e.x + (e.vx > 0 ? 0.4 : -0.4), e.y + 1, e.z + 1);
    e.meshes[2] && setPosition(e.meshes[2], e.x + (e.vx > 0 ? 0.8 : -0.0), e.y + 1, e.z + 1);

    // Collision with player
    const dx = e.x - p.x;
    const dy = e.y + 0.6 - (p.y + 1);
    const dz = e.z - p.z;

    if (dx * dx + dy * dy + dz * dz < 2.5) {
      // Goomba Stomp
      if (p.vy < 0 && p.y > e.y + 0.5) {
        p.vy = 15; // Bounce off enemy
        e.alive = false;
        createFX(e.x, e.y + 0.5, e.z, C.enemyBody, 15);
        e.meshes.forEach(m => destroyMesh(m));
        g.enemies.splice(i, 1);
        g.score += 200;
      } else if (p.invuln <= 0) {
        takeDamage();
      }
    }
  }
}

function takeDamage() {
  if (g.p.invuln > 0) return;
  g.health--;
  g.p.invuln = 1.5;
  g.p.vy = 12; // knockback
  createFX(g.p.x, g.p.y + 1, g.p.z, C.plumberFace, 15);

  if (g.health <= 0) {
    gameState = 'gameover';
    inputLock = 1.0;
    g.p.meshGroup.forEach(part => setPosition(part.m, 0, -100, 0));
    initGameOverScreen();
  }
}

function updateParticles(dt) {
  for (let i = g.particles.length - 1; i >= 0; i--) {
    let p = g.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 30 * dt; // grav
    p.life -= dt;

    let a = Math.max(0.01, p.life);
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
  setFont('large');
  setTextAlign('left');

  // Coin UI
  drawCircle(30, 25, 12, rgba8(255, 200, 0, 255));
  drawTextShadow(
    `x ${g.coins.toString().padStart(2, '0')}`,
    50,
    32,
    rgba8(255, 255, 255, 255),
    rgba8(0, 0, 0, 255),
    2
  );

  // Score
  setTextAlign('right');
  drawTextShadow(
    `SCORE ${g.score.toString().padStart(6, '0')}`,
    620,
    32,
    rgba8(255, 255, 255, 255),
    rgba8(0, 0, 0, 255),
    2
  );

  // Health
  for (let i = 0; i < 3; i++) {
    const c = i < g.health ? rgba8(255, 50, 50, 255) : rgba8(50, 50, 50, 150);
    drawCircle(30 + i * 30, 60, 10, c);
  }
}

function drawStartScreen() {
  drawRadialGradient(320, 180, 400, rgba8(100, 200, 255, 100), rgba8(0, 0, 0, 0));

  const bob = Math.sin(t * 3) * 8;

  setFont('huge');
  setTextAlign('center');
  drawGlowTextCentered(
    'SUPER PLUMBER',
    320,
    80 + bob,
    rgba8(255, 50, 50, 255),
    rgba8(150, 0, 0, 200),
    5
  );
  drawGlowTextCentered(
    'NOVA 64',
    320,
    140 + bob,
    rgba8(255, 200, 0, 255),
    rgba8(150, 100, 0, 200),
    3
  );

  const panel = createPanel(centerX(360), 200, 360, 80, {
    bgColor: rgba8(10, 30, 80, 200),
    borderColor: rgba8(255, 255, 255, 200),
    borderWidth: 3,
  });
  drawPanel(panel);

  setFont('small');
  drawText('◆ ARROWS / WASD to Move', 320, 220, rgba8(255, 255, 255, 255));
  drawText('◆ SPACE to Jump & Stomp Enemies!', 320, 240, rgba8(255, 255, 0, 255));
  drawText('◆ Collect ALL Coins to Win!', 320, 260, rgba8(0, 255, 100, 255));

  drawAllButtons();
}

function drawGameOver() {
  rect(0, 0, 640, 360, rgba8(0, 0, 0, 200), true);
  setFont('huge');
  setTextAlign('center');
  drawTextShadow('GAME OVER', 320, 150, rgba8(255, 50, 50, 255), rgba8(0, 0, 0, 255), 4);
  drawAllButtons();
}

function drawWinScreen() {
  rect(0, 0, 640, 360, rgba8(255, 255, 255, 150), true);
  setFont('huge');
  setTextAlign('center');
  drawGlowTextCentered(
    'COURSE CLEAR!',
    320,
    130,
    rgba8(50, 255, 100, 255),
    rgba8(0, 100, 0, 255),
    4
  );

  setFont('large');
  drawTextShadow(
    `FINAL SCORE: ${g.score}`,
    320,
    180,
    rgba8(255, 200, 0, 255),
    rgba8(0, 0, 0, 255),
    3
  );
  drawAllButtons();
}

function startGame() {
  gameState = 'playing';
  inputLock = 0.3;
  g.score = 0;
  g.health = 3;
  g.coins = 0;

  g.p.x = 0;
  g.p.y = 10;
  g.p.z = 0;
  g.p.vx = 0;
  g.p.vy = 0;
  g.p.vz = 0;
  g.p.invuln = 0;

  clearButtons();
}

function initStartScreen() {
  clearButtons();
  createButton(centerX(200), 300, 200, 50, '▶ PLAY', startGame, {
    normalColor: rgba8(50, 200, 50, 255),
  });
}

function initGameOverScreen() {
  clearButtons();
  createButton(
    centerX(200),
    220,
    200,
    50,
    'TRY AGAIN',
    () => {
      location.reload(); // Quick dirty reload to reset full level gen
    },
    { normalColor: rgba8(200, 50, 50, 255) }
  );
}

function initWinScreen() {
  clearButtons();
  createButton(
    centerX(200),
    240,
    200,
    50,
    'PLAY AGAIN',
    () => {
      location.reload();
    },
    { normalColor: rgba8(50, 200, 50, 255) }
  );
}
