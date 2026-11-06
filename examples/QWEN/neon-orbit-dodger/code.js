const {
  burstParticles,
  createParticleSystem,
  enableRetroEffects,
  setParticleEmitter,
  updateParticles,
} = nova64.fx;
const {
  circle,
  drawDiamond,
  drawFlash,
  drawGlowTextCentered,
  drawGradient,
  drawProgressBar,
  drawPulsingText,
  drawRadialGradient,
  drawTriangle,
  line,
  print,
  printCentered,
  rect,
  rectfill,
  rgba8,
} = nova64.draw;
const { color, createShake, getShakeOffset, triggerShake, updateShake } = nova64.util;
const {
  createCone,
  createCube,
  createCylinder,
  createSphere,
  createTorus,
  removeMesh,
  setMeshVisible,
  setPosition,
  setRotation,
  setScale,
} = nova64.scene;
const { createGradientSkybox, createPointLight, setAmbientLight, setFog, setLightDirection } =
  nova64.light;
const { key, keyp } = nova64.input;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { sfx } = nova64.audio;
const { t } = nova64.data;

// NOVA64 STUDIO TEMPLATE: arena-dodger (top-down arena: collect, dodge, dash)
// Customize everything in CONFIG. Keep the ENGINE working: movement, dash,
// telegraphed spawns, enemy behaviours, collisions, screens and auto-play are
// tested. API calls use bare names; the build adds the nova64 imports.

// ============================== CONFIG ==============================
const THEME = {
  arenaStyle: 'neon',
  floor: 0x030a1a,
  wall: 0x0a1230,
  fog: 0x01030a,
  fogNear: 12,
  fogFar: 38,
  ambient: 0x101a40,
  ambientLevel: 0.55,
  accent: 0x00ffff, // cyan rim, grid lines, energy pulses
  sky: [0x000010, 0x050020],
  bloom: 0.8,
  ui: {
    title: [0, 255, 255],
    text: [230, 240, 255],
    dim: [100, 130, 180],
    panel: [3, 8, 25],
    border: [255, 0, 255],
  },
};

const TEXT = {
  title: 'SPACE LAST RING',
  subtitle: 'HOLD THE LIGHT',
  prompt: 'Press Space to dash, Z to start',
  over: 'CORES DEPLETED',
};

const STORY = [
  { text: 'The last energy ring spins at the edge of the void.', art: 'city' },
  { text: 'One pilot guards it—her ship the last beacon.', art: 'party' },
  { text: 'The navy has traced the signal. They come in waves.', art: 'portal' },
];

const PLAYER = { name: 'PHOENIX-9', color: 0x00ffff, speed: 8 };

const GEM = { name: 'ORBIT CORE', color: 0xffd23c, points: 15, onScreen: 4 };

const ENEMIES = [
  {
    name: 'GHOST SHARD',
    behavior: 'orbiter',
    color: 0x8a00ff,
    glow: 0xff00ff,
    speed: 4.2,
    size: 0.5,
  },
  {
    name: 'COSMIC HUNTER',
    behavior: 'chaser',
    color: 0xff00aa,
    glow: 0xff33aa,
    speed: 3.0,
    size: 0.55,
  },
  {
    name: 'GOLD RAVAGER',
    behavior: 'dasher',
    color: 0xffb300,
    glow: 0xffe000,
    speed: 14,
    size: 0.6,
  },
];

const DIFFICULTY = {
  lives: 3,
  waveTime: 10,
  firstWave: 2,
  perWave: 1,
  maxEnemies: 14,
  dashCooldown: 1.5,
};

// ============================== ENGINE ==============================
const ARENA_R = 9;
const DASH_TIME = 0.22;
const TELEGRAPH = 1.0;

let screen = 'title';
let screenTime = 0;
let storyPage = 0;
let shake = null;
let flash = 0;
let flashColor = [255, 255, 255];
let auto = false;
let autoWait = 0;

let ship = [];
let px = 0,
  pz = 0,
  vx = 0,
  vz = 0,
  facing = 0;
let lives = 3,
  invuln = 0,
  dashTime = 0,
  dashReady = 0;
let score = 0,
  best = 0,
  combo = 0,
  comboTime = 0,
  gemsTaken = 0;
let wave = 0,
  waveClock = 0,
  survived = 0;
let enemies = []; // { def, x, z, vx, vz, state, t, meshes, angle }
let warnings = []; // telegraphs { x, z, t, def, mesh }
let gems = []; // { x, z, mesh, light }
let sparks = null;

const col = (c, a = 255) => rgba8(c[0], c[1], c[2], a);
const hexCol = (hex, a = 255) => rgba8((hex >> 16) & 255, (hex >> 8) & 255, hex & 255, a);
const fitScale = (text, max) => Math.max(1, Math.min(max, Math.floor(600 / (text.length * 6))));
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

function shade(hex, amount) {
  const f = v => Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  return (f((hex >> 16) & 255) << 16) | (f((hex >> 8) & 255) << 8) | f(hex & 255);
}

// Cap a surface colour's brightness so pale palettes don't wash out.
function capLum(hex, max = 0.3) {
  const lum =
    (0.299 * ((hex >> 16) & 255) + 0.587 * ((hex >> 8) & 255) + 0.114 * (hex & 255)) / 255;
  return lum <= max ? hex : shade(hex, max / lum - 1);
}

// Framed panel. (nova64.draw.drawPanel resolves to the UI-object version, so
// drawPanel(x, y, w, h, opts) draws nothing; use this instead.)
function panel(x, y, w, h, alpha = 225) {
  rectfill(x, y, w, h, col(THEME.ui.panel, alpha));
  rect(x, y, w, h, col(THEME.ui.border, Math.min(255, alpha + 30)));
  rect(x + 2, y + 2, w - 4, h - 4, col(THEME.ui.border, Math.floor(alpha * 0.35)));
}

// Thin glowing ring of any radius (glow('torus') scales its tube with the radius).
function ringMesh(radius, tube, color, pos, intensity) {
  const id = createTorus(radius, tube, color, pos, {
    material: 'emissive',
    emissive: color,
    intensity,
  });
  setRotation(id, Math.PI / 2, 0, 0);
  return id;
}

function glow(kind, size, color, pos, intensity = 2) {
  const opts = { material: 'emissive', emissive: color, intensity };
  if (kind === 'sphere') return createSphere(size, color, pos, opts);
  if (kind === 'cone') return createCone(size, size * 2.5, color, pos, opts);
  if (kind === 'torus') return createTorus(size, size * 0.12, color, pos, opts);
  return createCube(size, color, pos, opts);
}

// ---------- arena ----------
function buildArena() {
  const floor = createCylinder(
    ARENA_R + 0.6,
    ARENA_R + 0.6,
    0.2,
    capLum(THEME.floor),
    [0, -0.1, 0],
    { roughness: 1 }
  );
  ringMesh(ARENA_R + 0.3, 0.12, THEME.accent, [0, 0.08, 0], 1.6);
  createGradientSkybox(THEME.sky[0], THEME.sky[1]);
  if (THEME.arenaStyle === 'neon') {
    for (let r = 3; r < ARENA_R; r += 3) {
      ringMesh(r, 0.04, THEME.accent, [0, 0.02, 0], 0.6);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spoke = glow(
        'cube',
        1,
        THEME.accent,
        [Math.cos(a) * ARENA_R * 0.5, 0.02, Math.sin(a) * ARENA_R * 0.5],
        0.5
      );
      setScale(spoke, 0.05, 0.02, ARENA_R);
      setRotation(spoke, 0, -a + Math.PI / 2, 0);
      const pylon = createCube(1, capLum(THEME.wall), [
        Math.cos(a) * (ARENA_R + 1.4),
        1.2,
        Math.sin(a) * (ARENA_R + 1.4),
      ]);
      setScale(pylon, 0.4, 2.4, 0.4);
      glow(
        'cube',
        0.5,
        THEME.accent,
        [Math.cos(a) * (ARENA_R + 1.4), 2.5, Math.sin(a) * (ARENA_R + 1.4)],
        1.6
      );
    }
  } else {
    // Ring of stalagmites, every third one capped with a lit crystal.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + (i % 2) * 0.08;
      const r = ARENA_R + 1.2 + (i % 3) * 0.6;
      const h = 1.2 + ((i * 7) % 4) * 0.5;
      createCone(
        0.5 + (i % 2) * 0.2,
        h,
        shade(capLum(THEME.wall, 0.35), ((i * 5) % 3) * 0.1 - 0.1),
        [Math.cos(a) * r, h / 2, Math.sin(a) * r]
      );
      if (i % 4 === 0) {
        glow(
          'cone',
          0.18,
          THEME.accent,
          [Math.cos(a) * (r - 0.6), 0.4, Math.sin(a) * (r - 0.6)],
          2.5
        );
        if (i % 8 === 0)
          createPointLight(
            THEME.accent,
            2,
            9,
            Math.cos(a) * (r - 1.5),
            1.5,
            Math.sin(a) * (r - 1.5)
          );
      }
    }
  }
}

function buildShip() {
  const c = PLAYER.color;
  ship = [
    { id: createSphere(0.38, shade(c, -0.45), [0, 0, 0], { roughness: 0.4 }), y: 0.45, f: 0 },
    { id: glow('cone', 0.16, c, [0, 0, 0], 2.2), y: 0.5, f: 0.45, nose: true },
    { id: glow('torus', 0.5, c, [0, 0, 0], 1.5), y: 0.45, f: 0, ring: true },
  ];
  sparks = createParticleSystem(60, {
    size: 0.08,
    emissive: true,
    gravity: 0,
    emitRate: 0,
    minLife: 0.3,
    maxLife: 0.8,
    minSpeed: 1,
    maxSpeed: 5,
    startColor: GEM.color,
    endColor: THEME.fog,
  });
}

function placeShip() {
  const blink = invuln > 0 && dashTime <= 0 && Math.floor(invuln * 12) % 2 === 0;
  for (const p of ship) {
    setPosition(p.id, px + Math.sin(facing) * p.f, p.y, pz - Math.cos(facing) * p.f);
    if (p.nose) setRotation(p.id, -Math.PI / 2, -facing, 0);
    if (p.ring) setRotation(p.id, Math.PI / 2, 0, screenTime * 3);
    setMeshVisible(p.id, !blink);
  }
}

// ---------- gems ----------
function spawnGem() {
  for (let tries = 0; tries < 20; tries++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * (ARENA_R - 2.5);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (dist(x, z, px, pz) < 3 || enemies.some(e => dist(x, z, e.x, e.z) < 2)) continue;
    gems.push({ x, z, mesh: glow('cone', 0.22, GEM.color, [x, 0.5, z], 2.4) });
    return;
  }
}

function collectGems() {
  for (const g of gems) {
    if (dist(g.x, g.z, px, pz) > 0.9) continue;
    g.taken = true;
    removeMesh(g.mesh);
    combo = comboTime > 0 ? combo + 1 : 1;
    comboTime = 2;
    gemsTaken++;
    score += GEM.points * Math.min(5, combo);
    setParticleEmitter(sparks, { position: [g.x, 0.5, g.z] });
    burstParticles(sparks, 16);
    sfx('coin');
  }
  gems = gems.filter(g => !g.taken);
  while (gems.length < GEM.onScreen) spawnGem();
}

// ---------- enemies ----------
function queueWave() {
  wave++;
  const count = Math.min(
    DIFFICULTY.maxEnemies - enemies.length - warnings.length,
    DIFFICULTY.firstWave + (wave - 1) * DIFFICULTY.perWave
  );
  for (let i = 0; i < count; i++) {
    // Later waves unlock later enemy types.
    const pool = ENEMIES.slice(0, Math.min(ENEMIES.length, 1 + Math.floor(wave / 2)));
    const def = pool[Math.floor(Math.random() * pool.length)];
    let a = Math.random() * Math.PI * 2;
    for (
      let k = 0;
      k < 8 && dist(Math.cos(a) * (ARENA_R - 1), Math.sin(a) * (ARENA_R - 1), px, pz) < 5;
      k++
    )
      a += 0.8;
    const x = Math.cos(a) * (ARENA_R - 1);
    const z = Math.sin(a) * (ARENA_R - 1);
    const mesh = glow('torus', def.size * 1.6, def.glow, [x, 0.06, z], 2);
    setRotation(mesh, Math.PI / 2, 0, 0);
    warnings.push({ x, z, t: TELEGRAPH + i * 0.25, def, mesh });
  }
  if (count > 0) sfx('blip');
}

function spawnEnemy(w) {
  removeMesh(w.mesh);
  const d = w.def;
  const meshes = [];
  if (d.behavior === 'chaser') {
    meshes.push({
      id: createCone(d.size, d.size * 2.2, capLum(d.color, 0.4), [0, 0, 0]),
      y: d.size,
      spin: true,
    });
    meshes.push({ id: glow('sphere', d.size * 0.25, d.glow, [0, 0, 0], 3), y: d.size * 1.2 });
  } else if (d.behavior === 'orbiter') {
    meshes.push({
      id: createSphere(d.size, capLum(d.color, 0.4), [0, 0, 0], { roughness: 0.5 }),
      y: 0.6,
    });
    meshes.push({ id: glow('torus', d.size * 1.4, d.glow, [0, 0, 0], 1.6), y: 0.6, flap: true });
  } else {
    meshes.push({
      id: createCube(d.size * 1.4, capLum(d.color, 0.4), [0, 0, 0], { roughness: 0.6 }),
      y: d.size,
      spin: true,
    });
    meshes.push({ id: glow('cube', d.size * 0.6, d.glow, [0, 0, 0], 2.5), y: d.size, spin: true });
  }
  enemies.push({
    def: d,
    x: w.x,
    z: w.z,
    vx: 0,
    vz: 0,
    state: 'idle',
    t: 1 + Math.random(),
    meshes,
    angle: Math.atan2(w.z, w.x),
    dir: Math.random() < 0.5 ? 1 : -1,
  });
}

function updateEnemies(dt) {
  for (const w of warnings) {
    w.t -= dt;
    setScale(w.mesh, 1 + Math.sin(screenTime * 12) * 0.15, 1, 1 + Math.sin(screenTime * 12) * 0.15);
    if (w.t <= 0) spawnEnemy(w);
  }
  warnings = warnings.filter(w => w.t > 0);

  for (const e of enemies) {
    const d = e.def;
    if (d.behavior === 'chaser') {
      const a = Math.atan2(pz - e.z, px - e.x);
      e.vx += (Math.cos(a) * d.speed - e.vx) * Math.min(1, dt * 2);
      e.vz += (Math.sin(a) * d.speed - e.vz) * Math.min(1, dt * 2);
    } else if (d.behavior === 'orbiter') {
      e.angle += ((e.dir * d.speed * dt) / ARENA_R) * 1.6;
      const r = ARENA_R * (0.45 + 0.35 * Math.sin(screenTime * 0.5 + e.angle));
      e.vx = (Math.cos(e.angle) * r - e.x) * 3;
      e.vz = (Math.sin(e.angle) * r - e.z) * 3;
    } else {
      // Dasher: wait, glow (telegraph), lunge in a straight line, repeat.
      e.t -= dt;
      if (e.state === 'idle' && e.t <= 0) {
        e.state = 'charge';
        e.t = 0.7;
        e.aim = Math.atan2(pz - e.z, px - e.x);
      } else if (e.state === 'charge' && e.t <= 0) {
        e.state = 'dash';
        e.t = 0.6;
        e.vx = Math.cos(e.aim) * d.speed;
        e.vz = Math.sin(e.aim) * d.speed;
      } else if (e.state === 'dash' && e.t <= 0) {
        e.state = 'idle';
        e.t = 1.2 + Math.random();
      }
      if (e.state !== 'dash') {
        e.vx *= 0.9;
        e.vz *= 0.9;
      }
    }
    e.x += e.vx * dt;
    e.z += e.vz * dt;
    const r = Math.hypot(e.x, e.z);
    if (r > ARENA_R - 0.4) {
      e.x *= (ARENA_R - 0.4) / r;
      e.z *= (ARENA_R - 0.4) / r;
      if (e.state === 'dash') e.t = 0;
    }
    const charging = e.state === 'charge' && Math.floor(e.t * 14) % 2 === 0;
    for (const m of e.meshes) {
      setPosition(m.id, e.x, m.y + (m.flap ? Math.sin(screenTime * 10) * 0.1 : 0), e.z);
      if (m.spin) setRotation(m.id, 0, screenTime * 3, 0);
      if (m.flap) setRotation(m.id, Math.PI / 2 + Math.sin(screenTime * 14) * 0.5, 0, 0);
      setMeshVisible(m.id, !charging || m !== e.meshes[1]);
    }
    if (dist(e.x, e.z, px, pz) < d.size + 0.45 && invuln <= 0 && dashTime <= 0) hit(e);
  }
}

function hit(e) {
  invuln = 1.6;
  lives--;
  combo = 0;
  flash = 180;
  flashColor = [255, 60, 60];
  triggerShake(shake, 0.7);
  sfx('hit');
  // Knock the attacker away so a hit is never followed by an instant second hit.
  const a = Math.atan2(e.z - pz, e.x - px);
  e.x = px + Math.cos(a) * 3;
  e.z = pz + Math.sin(a) * 3;
  e.vx = e.vz = 0;
  if (lives <= 0) {
    best = Math.max(best, score);
    sfx('death');
    setScreen('over');
  }
}

// ---------- player ----------
function movePlayer(dt, ix, iz, wantDash) {
  const len = Math.hypot(ix, iz);
  if (len > 0) {
    ix /= len;
    iz /= len;
    facing = Math.atan2(ix, -iz);
  }
  if (wantDash && dashReady <= 0 && len > 0) {
    dashTime = DASH_TIME;
    dashReady = DIFFICULTY.dashCooldown;
    triggerShake(shake, 0.15);
    sfx('laser');
  }
  const sp = PLAYER.speed * (dashTime > 0 ? 3.2 : 1);
  vx += (ix * sp - vx) * Math.min(1, dt * 12);
  vz += (iz * sp - vz) * Math.min(1, dt * 12);
  px += vx * dt;
  pz += vz * dt;
  const r = Math.hypot(px, pz);
  if (r > ARENA_R - 0.5) {
    // The rim blocks; it never hurts.
    px *= (ARENA_R - 0.5) / r;
    pz *= (ARENA_R - 0.5) / r;
  }
}

function updatePlay(dt) {
  survived += dt;
  score += dt * 2;
  if (invuln > 0) invuln -= dt;
  if (dashTime > 0) dashTime -= dt;
  if (dashReady > 0) dashReady -= dt;
  if (comboTime > 0) comboTime -= dt;
  else combo = 0;
  waveClock -= dt;
  if (waveClock <= 0) {
    queueWave();
    waveClock = DIFFICULTY.waveTime;
  }
  let ix = 0,
    iz = 0,
    wantDash = false;
  if (auto) [ix, iz, wantDash] = autoSteer();
  else {
    ix = (key('ArrowRight') || key('KeyD') ? 1 : 0) - (key('ArrowLeft') || key('KeyA') ? 1 : 0);
    iz = (key('ArrowDown') || key('KeyS') ? 1 : 0) - (key('ArrowUp') || key('KeyW') ? 1 : 0);
    wantDash = keyp('Space') || keyp('KeyZ');
  }
  movePlayer(dt, ix, iz, wantDash);
  updateEnemies(dt);
  collectGems();
}

// ---------- auto-play (press P): steers by attraction and repulsion ----------
function autoSteer() {
  let ix = 0,
    iz = 0;
  const gem = gems.slice().sort((a, b) => dist(a.x, a.z, px, pz) - dist(b.x, b.z, px, pz))[0];
  if (gem) {
    const d = dist(gem.x, gem.z, px, pz) || 1;
    ix += ((gem.x - px) / d) * 1.2;
    iz += ((gem.z - pz) / d) * 1.2;
  }
  let danger = false;
  for (const e of enemies) {
    // Lead dashers along their velocity; push away harder the closer they are.
    const ex = e.x + e.vx * 0.25;
    const ez = e.z + e.vz * 0.25;
    const d = Math.max(0.3, dist(ex, ez, px, pz));
    if (d < 4.5) {
      const push = (4.5 - d) / d;
      ix += ((px - ex) / d) * push * 2.2;
      iz += ((pz - ez) / d) * push * 2.2;
      if (d < 1.8) danger = true;
    }
  }
  for (const w of warnings) {
    const d = Math.max(0.3, dist(w.x, w.z, px, pz));
    if (d < 2.5) {
      ix += ((px - w.x) / d) * (2.5 - d);
      iz += ((pz - w.z) / d) * (2.5 - d);
    }
  }
  const r = Math.hypot(px, pz);
  if (r > ARENA_R - 2) {
    ix -= (px / r) * 1.5;
    iz -= (pz / r) * 1.5;
  }
  return [ix, iz, danger];
}

function updateAuto(dt) {
  autoWait -= dt;
  if (autoWait > 0) return;
  if (screen === 'title' && screenTime > 1.5) beginStory();
  else if (screen === 'story' && screenTime > 3) nextStory();
  else if (screen === 'over' && screenTime > 3) {
    resetRun();
    setScreen('title');
  }
}

// ---------- game flow ----------
function clearActors() {
  for (const e of enemies) for (const m of e.meshes) removeMesh(m.id);
  for (const w of warnings) removeMesh(w.mesh);
  for (const g of gems) removeMesh(g.mesh);
  enemies = [];
  warnings = [];
  gems = [];
}

function resetRun() {
  clearActors();
  px = pz = vx = vz = 0;
  facing = 0;
  lives = DIFFICULTY.lives;
  invuln = 0;
  dashTime = 0;
  dashReady = 0;
  score = 0;
  combo = 0;
  gemsTaken = 0;
  wave = 0;
  waveClock = 2; // a moment to breathe before the first wave
  survived = 0;
  while (gems.length < GEM.onScreen) spawnGem();
}

function setScreen(name) {
  screen = name;
  screenTime = 0;
}

function beginStory() {
  storyPage = 0;
  if (STORY.length) setScreen('story');
  else startRun();
}

function nextStory() {
  storyPage++;
  if (storyPage >= STORY.length) startRun();
  else setScreen('story');
}

function startRun() {
  resetRun();
  sfx('confirm');
  setScreen('play');
}

// ---------- hooks ----------
export function init() {
  setAmbientLight(THEME.ambient, THEME.ambientLevel);
  setLightDirection(-0.3, -1, -0.2);
  setFog(THEME.fog, THEME.fogNear, THEME.fogFar);
  setCameraFOV(55);
  enableRetroEffects({
    bloom: { strength: THEME.bloom ?? 0.6, radius: 0.4, threshold: 0.5 },
    vignette: { darkness: 0.9, offset: 0.85 },
    fxaa: true,
    dithering: true,
  });
  shake = createShake({ decay: 5 });
  buildArena();
  buildShip();
  resetRun();
}

export function update(dt) {
  screenTime += dt;
  updateShake(shake, dt);
  updateParticles(dt);
  if (flash > 0) flash = Math.max(0, flash - 400 * dt);
  const confirm = keyp('Space') || keyp('KeyZ');
  if (keyp('KeyP')) {
    auto = !auto;
    autoWait = 0.3;
    sfx('select');
  }
  if (auto) updateAuto(dt);

  if (screen === 'title' && confirm && !auto) beginStory();
  else if (screen === 'story' && confirm && !auto) nextStory();
  else if (screen === 'play') updatePlay(dt);
  else if (screen === 'over' && confirm && screenTime > 1 && !auto) startRun();

  for (const g of gems) setRotation(g.mesh, 0, screenTime * 2, 0);
  placeShip();
  const [sx, sy] = getShakeOffset(shake);
  const orbit = screen === 'title' || screen === 'story' ? screenTime * 0.15 : 0;
  setCameraPosition(
    Math.sin(orbit) * 14 + px * 0.25 + sx * 0.02,
    17 + sy * 0.02,
    Math.cos(orbit) * 14 + pz * 0.25
  );
  setCameraTarget(px * 0.25, 0, pz * 0.25);
}

// ---------- 2D ----------
export function draw() {
  if (screen === 'title') drawTitle();
  else if (screen === 'story') drawStory();
  else {
    drawHud();
    if (screen === 'over') drawOver();
  }
  if (flash > 0) drawFlash(col(flashColor, Math.floor(flash)));
  if (auto) {
    rectfill(6, 24, 76, 14, col(THEME.ui.panel, 220));
    print(
      'AUTO-PLAY',
      12,
      27,
      col(THEME.ui.title, 160 + Math.floor(Math.sin(screenTime * 4) * 90))
    );
  }
}

function drawTitle() {
  const t = screenTime;
  const fade = Math.floor(Math.min(1, t / 1.5) * 255);
  const ui = THEME.ui;
  const s = fitScale(TEXT.title, 6);
  drawGlowTextCentered(
    TEXT.title,
    320,
    50,
    col(ui.title, fade),
    col(ui.border, Math.floor(fade * 0.7)),
    s
  );
  printCentered(TEXT.subtitle, 320, 60 + s * 9, col(ui.text, fade), fitScale(TEXT.subtitle, 2));
  if (t > 1.2) {
    panel(170, 250, 300, 34, 200);
    drawPulsingText(TEXT.prompt, 320, 262, col(ui.text), t, { frequency: 2, minAlpha: 140 });
    printCentered('Arrows/WASD: move   Space: dash   P: AUTO-PLAY', 320, 296, col(ui.dim));
    if (best > 0) printCentered('BEST ' + Math.floor(best), 320, 314, col(ui.title));
  }
}

function drawHud() {
  const ui = THEME.ui;
  panel(0, 0, 640, 22, 200);
  print('SCORE ' + Math.floor(score), 10, 7, col(ui.text));
  printCentered('WAVE ' + wave + '   ' + GEM.name + 'S ' + gemsTaken, 320, 7, col(ui.dim));
  for (let i = 0; i < lives; i++) drawDiamond(570 + i * 18, 11, 6, 6, hexCol(PLAYER.color), true);
  if (combo > 1)
    printCentered(
      'x' + Math.min(5, combo) + ' COMBO',
      320,
      40,
      col(ui.title, 160 + Math.floor(Math.sin(screenTime * 10) * 90)),
      2
    );
  const ready = dashReady <= 0;
  print(ready ? 'DASH READY' : 'DASH', 10, 328, ready ? col(ui.title) : col(ui.dim));
  drawProgressBar(
    10,
    340,
    120,
    6,
    1 - Math.max(0, dashReady) / DIFFICULTY.dashCooldown,
    hexCol(PLAYER.color),
    col(ui.panel, 200)
  );
}

function drawOver() {
  const ui = THEME.ui;
  rectfill(0, 0, 640, 360, rgba8(0, 0, 0, Math.min(170, Math.floor(screenTime * 200))));
  drawGlowTextCentered(
    TEXT.over,
    320,
    110,
    col([255, 90, 80]),
    col([255, 90, 80], 120),
    fitScale(TEXT.over, 4)
  );
  printCentered(
    'SCORE ' + Math.floor(score) + '   BEST ' + Math.floor(best),
    320,
    160,
    col(ui.text),
    2
  );
  printCentered(
    'WAVE ' + wave + '   ' + gemsTaken + ' ' + GEM.name + 'S   ' + Math.floor(survived) + 's',
    320,
    186,
    col(ui.dim)
  );
  if (screenTime > 1)
    drawPulsingText('Press Space to play again', 320, 220, col(ui.text), screenTime, {
      frequency: 2,
      minAlpha: 140,
    });
}

// ---------- story slides with procedural illustrations ----------
function wrap(text, width) {
  const lines = [''];
  for (const word of text.split(' ')) {
    if ((lines[lines.length - 1] + ' ' + word).trim().length > width) lines.push(word);
    else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + word).trim();
  }
  return lines;
}

function storyPageOf(i) {
  const page = STORY[i];
  const fallback = [THEME.arenaStyle === 'neon' ? 'city' : 'castle', 'party', 'portal'][
    Math.min(i, 2)
  ];
  return typeof page === 'string'
    ? { text: page, art: fallback }
    : { text: page.text || '', art: page.art || fallback };
}

function drawStory() {
  const ui = THEME.ui;
  const fade = Math.floor(Math.min(1, screenTime / 0.6) * 255);
  const page = storyPageOf(storyPage);
  rectfill(0, 0, 640, 360, col(ui.panel, 200));
  drawStoryArt(page.art, screenTime, 120, 14, 400, 196);
  panel(40, 224, 560, 104, 235);
  wrap(page.text, 44).forEach((line, i) =>
    printCentered(line, 320, 240 + i * 18, col(ui.text, fade), 2)
  );
  printCentered(
    storyPage + 1 + ' / ' + STORY.length + '   Space to continue',
    320,
    316,
    col(ui.dim, fade)
  );
}

function drawStoryArt(kind, t, x, y, w, h) {
  const ui = THEME.ui;
  const neon = THEME.arenaStyle === 'neon';
  drawGradient(x, y, w, h, col(ui.panel), hexCol(THEME.sky[1]), 'v');
  for (let i = 0; i < 40; i++) {
    const tw = 120 + Math.floor(Math.sin(t * 2 + i) * 100);
    rectfill(x + ((i * 97) % w), y + ((i * 53) % Math.floor(h * 0.55)), 1, 1, col(ui.text, tw));
  }
  const horizon = y + Math.floor(h * 0.68);
  drawGradient(
    x,
    horizon,
    w,
    y + h - horizon,
    hexCol(capLum(THEME.floor, 0.2)),
    col(ui.panel),
    'v'
  );
  if (kind === 'castle' || kind === 'city') {
    if (neon) {
      const sunX = x + w * 0.72;
      circle(sunX, horizon - 36, 34, hexCol(GEM.color, 220), true);
      for (let i = 0; i < 5; i++) rectfill(sunX - 36, horizon - 30 + i * 6, 72, 2, col(ui.panel));
    }
    // Jagged peaks or cave teeth, with crystals glinting.
    for (let i = 0; i < 10; i++) {
      const bx = x + i * (w / 9) - 20;
      const bh = 40 + ((i * 37) % 5) * 14;
      drawTriangle(bx, horizon, bx + 30, horizon - bh, bx + 60, horizon, rgba8(4, 4, 8, 255), true);
      if (!neon)
        drawTriangle(
          bx + 10,
          y,
          bx + 22,
          y + 20 + (i % 3) * 14,
          bx + 34,
          y,
          rgba8(4, 4, 8, 255),
          true
        );
      const g = 140 + Math.floor(Math.sin(t * 3 + i) * 100);
      drawDiamond(
        bx + 30,
        horizon - bh * 0.4,
        3,
        6,
        hexCol(i % 2 ? GEM.color : THEME.accent, g),
        true
      );
    }
  } else if (kind === 'party') {
    const cx = x + w / 2 + Math.sin(t) * 60;
    const cy = horizon - 30 + Math.sin(t * 3) * 6;
    drawRadialGradient(cx, cy, 50, hexCol(PLAYER.color, 90), rgba8(0, 0, 0, 0));
    circle(cx, cy, 10, hexCol(PLAYER.color), true);
    circle(cx, cy, 16, hexCol(PLAYER.color, 160), false);
    printCentered(PLAYER.name, cx, cy - 30, hexCol(PLAYER.color));
    for (let i = 0; i < 4; i++)
      drawDiamond(
        x + 60 + i * 90,
        horizon + 20,
        4,
        8,
        hexCol(GEM.color, 150 + Math.floor(Math.sin(t * 4 + i) * 90)),
        true
      );
  } else {
    // Eyes opening in the dark, one pair per enemy type.
    ENEMIES.forEach((e, i) => {
      const ex = x + 80 + i * ((w - 160) / Math.max(1, ENEMIES.length - 1));
      const ey = y + 60 + (i % 2) * 40;
      const open = Math.sin(t * 1.5 + i * 2) > 0.85 ? 1 : 4;
      drawRadialGradient(ex, ey, 30, hexCol(e.glow, 60), rgba8(0, 0, 0, 0));
      circle(ex - 8, ey, open, hexCol(e.glow), true);
      circle(ex + 8, ey, open, hexCol(e.glow), true);
    });
  }
  rect(x, y, w, h, col(ui.border));
  rect(x + 3, y + 3, w - 6, h - 6, col(ui.border, 90));
}
