// ⭐ F-ZERO NOVA 3D — Anti-Gravity Racing ⭐
// Ultimate Edition: Synthwave Neon Highway, Boost Mechanics, & Cinematic Bloom

// ── Configuration ──────────────────────────────────────────
const {
  drawGlowTextCentered,
  drawNoise,
  drawPanel,
  drawRadialGradient,
  drawScanlines,
  line,
  rect,
  rgba8,
} = nova64.draw;
const {
  createAdvancedCube,
  createCube,
  createInstancedMesh,
  createPlane,
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
const { F, enableBloom, enableFXAA } = nova64.fx;
const { btn, btnp, isKeyPressed, key } = nova64.input;
const { sfx } = nova64.audio;
const {
  Screen,
  centerX,
  clearButtons,
  createButton,
  createPanel,
  drawAllButtons,
  drawText,
  drawTextShadow,
  setFont,
  setTextAlign,
  uiColors,
  updateAllButtons,
} = nova64.ui;
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
  shipBody: 0x0044ff,
  shipCockpit: 0x22aaff,
  shipEngine: 0x00ffff,
  shipTrim: 0xffffff,
  rivalBody: 0xee0033,
  rivalEngine: 0xff4422,

  bgFog: 0x040210, // Deep purple synthwave space
  trackR1: 0x05051a,
  trackR2: 0x0a0a22,
  neonWall: 0xff00aa, // Magenta glowing rails
  neonWallAlt: 0xaa00ff,
  boostPad: 0x00ffaa,
  spark: 0xffdd00,
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

  // Super wide FOV for speed illusion. Position/target match the steady-state
  // values used by updatePlaying() (z=12, camY=8 at pitch=0) so the camera
  // does not jump forward at the start->countdown->playing transition.
  setCameraFOV(85);
  setCameraPosition(0, 8, 12);
  setCameraTarget(0, 0, -40);

  // Atmospheric Lighting
  setAmbientLight(0x222233, 1.5);
  setLightDirection(0, -1, -0.5);
  setLightColor(0xffaaaa);

  // Deep synthwave fog
  setFog(C.bgFog, 20, 300);

  if (typeof createSpaceSkybox === 'function') {
    createSpaceSkybox({ starCount: 1500, starSize: 2.0, nebulae: true, nebulaColor: 0xaa00aa });
  }

  // Neon over-glow
  enableBloom(1.0, 0.4, 0.4);
  if (typeof enableFXAA === 'function') enableFXAA();

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

// ── Entity Construction ────────────────────────────────────
function buildPlayerShip() {
  const p = g.p;
  // Sleek wedge shape (Metallic)
  p.meshes.body = createCube(2.0, C.shipBody, [p.x, p.y, p.z], {
    material: 'metallic',
    metalness: 0.9,
    roughness: 0.2,
  });
  setScale(p.meshes.body, 1.2, 0.4, 2.5);

  p.meshes.wingL = createCube(1.0, C.shipTrim, [p.x - 1.8, p.y, p.z + 0.5], {
    material: 'metallic',
  });
  setScale(p.meshes.wingL, 2.0, 0.1, 1.5);

  p.meshes.wingR = createCube(1.0, C.shipTrim, [p.x + 1.8, p.y, p.z + 0.5], {
    material: 'metallic',
  });
  setScale(p.meshes.wingR, 2.0, 0.1, 1.5);

  p.meshes.cockpit = createCube(1.0, C.shipCockpit, [p.x, p.y + 0.5, p.z - 0.5], {
    material: 'holographic',
    transparent: true,
    opacity: 0.8,
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
}

function initTrack() {
  const segLen = 40;
  // Checkerboard pattern rolling floor
  for (let i = 0; i < 15; i++) {
    const z = -i * segLen + 20;
    const color = i % 2 === 0 ? C.trackR1 : C.trackR2;
    const mesh = createPlane(g.trackWidth * 1.5, segLen, color, [0, -1, z], {
      material: 'standard',
      roughness: 0.8,
    });
    rotateMesh(mesh, -Math.PI / 2, 0, 0);
    g.roadSegments.push({ mesh, z, len: segLen, activeColor: color });

    // Left & Right neon border rails
    const wl = createCube(1.0, C.neonWall, [-g.trackWidth / 2 - 1, 0, z], {
      material: 'emissive',
      emissive: C.neonWall,
    });
    setScale(wl, 1.0, 2.0, segLen);
    const wr = createCube(1.0, C.neonWall, [g.trackWidth / 2 + 1, 0, z], {
      material: 'emissive',
      emissive: C.neonWallAlt,
    });
    setScale(wr, 1.0, 2.0, segLen);
    g.borders.push({ wl, wr, z, len: segLen });
  }
}

function spawnRival(isFar = false) {
  const x = (Math.random() - 0.5) * (g.trackWidth - 8);
  const z = isFar ? -400 : -200 - Math.random() * 100;

  // Basic rival shape
  const body = createCube(2.0, C.rivalBody, [x, 1.5, z], { material: 'metallic', metalness: 0.8 });
  setScale(body, 1.0, 0.5, 2.0);
  const eng = createCube(0.8, C.rivalEngine, [x, 1.5, z + 2.0], {
    material: 'emissive',
    emissive: C.rivalEngine,
  });
  setScale(eng, 1.8, 0.6, 0.5);

  const speedMultiplier = 0.5 + Math.random() * 0.4; // They travel at 50-90% of max speed

  g.rivals.push({
    meshes: [body, eng],
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

  g.props.push({ type: 'boost', mesh, x, z, active: true });
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
  const fovWarp = p.isBoosting ? 100 : 85;
  // Tween FOV for sense of speed
  setCameraFOV(85 + (p.isBoosting ? 15 : 0) * Math.min(1, g.speed / g.boostSpeed));

  const camY = 8 - p.pitch * 5;
  setCameraPosition(camX + shakeX, camY + shakeY, 12);
  setCameraTarget(camX * 1.5, 0, -40);

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

  // Glow flicker based on boosting
  const engineScl = p.isBoosting ? 1.5 + Math.random() * 0.5 : 1.0 + Math.random() * 0.2;

  setPosition(p.meshes.engL, ...applyR(-0.6, 0, 2.5));
  setRotation(p.meshes.engL, p.pitch, 0, r);
  setScale(p.meshes.engL, 0.8, 0.8, engineScl);

  setPosition(p.meshes.engR, ...applyR(0.6, 0, 2.5));
  setRotation(p.meshes.engR, p.pitch, 0, r);
  setScale(p.meshes.engR, 0.8, 0.8, engineScl);
}

function updateRoad(distMovement) {
  g.roadSegments.forEach(r => {
    r.z += distMovement;
    if (r.z > 30) r.z -= g.roadSegments.length * r.len;
    // Emphasize speed by flattening road pitch based on Z
    setPosition(r.mesh, 0, -1, r.z);
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
        0.1,
        0.1,
        sl.len
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

function drawHUD() {
  setFont('normal');
  setTextAlign('left');

  // Top HUD Bar
  rect(0, 0, 640, 40, rgba8(0, 5, 20, 180), true);
  line(0, 40, 640, 40, rgba8(255, 0, 150, 150));

  drawTextShadow(`RANK ${g.rank}/10`, 20, 12, rgba8(0, 255, 200, 255), rgba8(0, 0, 0, 255), 2);

  setFont('large');
  setTextAlign('right');
  const spdTxt = Math.floor(g.speed).toString().padStart(3, '0');
  drawTextShadow(`${spdTxt} km/h`, 620, 10, rgba8(255, 255, 0, 255), rgba8(0, 0, 0, 255), 2);

  // Progress Bar
  const progPct = Math.min(1, g.dist / 30000);
  rect(200, 16, 240, 8, rgba8(255, 255, 255, 50), true);
  rect(200, 16, 240 * progPct, 8, rgba8(0, 255, 255, 255), true);

  setFont('small');
  setTextAlign('center');
  drawText('COURSE PROGRESS', 320, 4, rgba8(200, 200, 255, 180));

  // Bottom HUD elements
  const bY = 320;

  // Health
  rect(20, bY, 150, 12, rgba8(50, 0, 0, 180), true);
  const hpC = g.health > 40 ? rgba8(0, 255, 0, 255) : rgba8(255, 50, 50, 255);
  rect(20, bY, 150 * (g.health / 100), 12, hpC, true);
  rect(20, bY, 150, 12, rgba8(0, 0, 0, 0), false);
  drawTextShadow('HULL', 20, bY - 14, rgba8(200, 200, 200, 255), rgba8(0, 0, 0, 255), 1);

  // Boost Energy
  rect(470, bY, 150, 12, rgba8(0, 10, 50, 180), true);
  const engPct = Math.max(0, g.energy / 100);
  rect(470, bY, 150 * engPct, 12, rgba8(0, 200, 255, 255), true);
  if (g.p.isBoosting) {
    rect(
      470,
      bY,
      150 * engPct,
      12,
      rgba8(255, 255, 255, Math.floor(Math.sin(t * 30) * 100 + 100)),
      true
    );
  }
  rect(470, bY, 150, 12, rgba8(0, 0, 0, 0), false);
  drawTextShadow('BOOST POWER', 470, bY - 14, rgba8(200, 200, 200, 255), rgba8(0, 0, 0, 255), 1);

  if (g.energy > 30 && !g.p.isBoosting && Math.sin(t * 4) > 0) {
    drawText('TAP / PRESS A', 545, bY + 16, rgba8(0, 255, 255, 180));
  }

  // Invuln and Damage Effects
  // Subtle red pulse during the 0.5s post-hit invulnerability window.
  // Previously this fired Math.sin(t*40) at peak alpha 100/255 (~6.4Hz at
  // 39% red over the whole screen) which strobed hard enough to be
  // seizure-adjacent on long invuln chains. Now it's a slower (~1.6Hz)
  // edge-weighted vignette that tints the rim of the screen without
  // flashing the playfield centre.
  if (isInvulnerable(playerHit)) {
    const pulse = (Math.sin(t * 10) * 0.5 + 0.5); // 0..1, ~1.6Hz
    const a = Math.floor(20 + pulse * 30); // 20..50 / 255 (~8..20%)
    // top + bottom bands
    rect(0, 0, 640, 36, rgba8(255, 30, 30, a), true);
    rect(0, 324, 640, 36, rgba8(255, 30, 30, a), true);
    // left + right bands
    rect(0, 0, 36, 360, rgba8(255, 30, 30, a), true);
    rect(604, 0, 36, 360, rgba8(255, 30, 30, a), true);
  }
  if (g.speed > 350) {
    // Hyperspeed blur effect via borders
    const al = Math.min(60, g.speed - 350);
    rect(0, 0, 640, 360, rgba8(0, 255, 255, al), true);
    drawScanlines(10, 1);
  }
}

function drawCountdown() {
  drawHUD();
  const c = Math.ceil(countdownTimer);
  const label = c > 0 ? `${c}` : 'GO!';
  const col = c > 0 ? rgba8(255, 255, 0, 255) : rgba8(0, 255, 100, 255);
  setFont('huge');
  setTextAlign('center');
  drawGlowTextCentered(label, 320, 140, col, rgba8(0, 0, 0, 200), 6);
}

function drawStartScreen() {
  // Vignette gradient
  drawRadialGradient(320, 180, 400, rgba8(10, 0, 60, 50), rgba8(5, 0, 15, 240));

  const bob = Math.sin(t * 3) * 6;

  setFont('huge');
  setTextAlign('center');
  drawGlowTextCentered(
    'F-ZERO',
    320,
    60 + bob,
    rgba8(0, 255, 200, 255),
    rgba8(0, 150, 255, 200),
    4
  );
  drawGlowTextCentered(
    'NOVA 3D',
    320,
    130 + bob,
    rgba8(255, 0, 150, 255),
    rgba8(150, 0, 200, 200),
    2
  );

  const panel = createPanel(centerX(300), 190, 300, 100, {
    bgColor: rgba8(10, 0, 30, 220),
    borderColor: rgba8(0, 255, 255, 180),
    borderWidth: 2,
  });
  drawPanel(panel);

  setFont('small');
  drawText('◆ ARROWS / WASD: Steer', 320, 210, uiColors.light);
  drawText('◆ Q/E: Drift Step', 320, 230, uiColors.light);
  drawText('◆ SPACE: Hyper Boost (Requires Power)', 320, 250, rgba8(0, 255, 255, 255));
  drawText('◆ Avoid Rivals, Hit Green Pads!', 320, 270, rgba8(0, 255, 100, 255));

  drawAllButtons();

  const fa = Math.floor(Math.sin(t * 6) * 100 + 155);
  drawTextShadow(
    'PRESS SPACE / TAP TO RACE',
    320,
    330,
    rgba8(255, 255, 0, fa),
    rgba8(0, 0, 0, 255),
    2
  );
  drawScanlines(30, 2);
}

function drawCrashedScreen() {
  rect(0, 0, 640, 360, rgba8(80, 0, 0, 120), true);
  drawNoise(0, 0, 640, 360, 30, Math.floor(t * 10)); // Static

  setFont('huge');
  setTextAlign('center');
  drawTextShadow('MACHINE DESTROYED', 320, 150, rgba8(255, 50, 50, 255), rgba8(0, 0, 0, 255), 4);

  drawAllButtons();
  drawScanlines(50, 3);
}

function drawFinishScreen() {
  rect(0, 0, 640, 360, rgba8(0, 50, 20, 180), true);

  setFont('huge');
  setTextAlign('center');
  drawGlowTextCentered(
    'COURSE CLEARED',
    320,
    120,
    rgba8(0, 255, 100, 255),
    rgba8(0, 150, 50, 200),
    3
  );

  setFont('large');
  drawTextShadow(
    `FINAL RANK: ${g.rank}`,
    320,
    180,
    rgba8(255, 255, 0, 255),
    rgba8(0, 0, 0, 255),
    2
  );

  drawAllButtons();
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
    { normalColor: rgba8(200, 50, 0, 255) }
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
