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
const { color, createShake, getShakeOffset, pulse, triggerShake, updateShake } = nova64.util;
const {
  createCone,
  createCube,
  createPlane,
  createSphere,
  createTorus,
  removeMesh,
  setMeshVisible,
  setPosition,
  setRotation,
  setScale,
} = nova64.scene;
const {
  createGradientSkybox,
  createPointLight,
  setAmbientLight,
  setFog,
  setLightDirection,
  setPointLightPosition,
} = nova64.light;
const { grid } = nova64.ui;
const { keyp } = nova64.input;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { sfx } = nova64.audio;
const { t } = nova64.data;

// NOVA64 STUDIO TEMPLATE: lane-runner (third-person 3-lane runner)
// Customize everything in CONFIG. Keep the ENGINE working: lanes, jumping,
// fair obstacle generation, collisions, screens and auto-play are tested.
// API calls use bare names; the build adds the nova64 imports.

// ============================== CONFIG ==============================
const THEME = {
  trackStyle: 'grid',
  floor: 0x060b1e,
  wall: 0x0c1430,
  fog: 0x02040e,
  fogNear: 8,
  fogFar: 60,
  ambient: 0x1a2650,
  ambientLevel: 0.6,
  accent: 0x22e6ff,
  sky: [0x1a0830, 0x050a1e],
  bloom: 0.6,
  ui: {
    title: [34, 230, 255],
    text: [215, 240, 255],
    dim: [110, 140, 180],
    panel: [5, 10, 30],
    border: [255, 63, 164],
  },
};

const TEXT = {
  title: 'SHARDGRID RUN',
  subtitle: 'DATA IS THE LAST LIGHT',
  prompt: 'Press Space to start',
  over: 'SYSTEM CORRUPTED',
};

const STORY = [
  { text: 'The Shardgrid was the last network. Now it fractures.', art: 'city' },
  { text: 'You are the last courier. Carry the data or vanish.', art: 'party' },
  { text: 'The firewall grows. It learns. It pursues.', art: 'portal' },
];

const PLAYER = { name: 'KAI', color: 0x22e6ff, trail: 0xff3fa4 };

const HAZARDS = {
  barrier: { name: 'FIREWALL', color: 0x3a1030, glow: 0xff3fa4 },
  hurdle: { name: 'GATE', color: 0xffd23c },
  pickup: { name: 'SHARD', color: 0x22e6ff, points: 10 },
  shield: { name: 'SHIELD', color: 0x7dff9a },
};

const DIFFICULTY = {
  lives: 3,
  startSpeed: 18,
  maxSpeed: 36,
  ramp: 0.4,
  rowGap: 14,
  minRowGap: 8,
  hurdleChance: 0.35,
  shieldChance: 0.08,
};

// ============================== ENGINE ==============================
const LANE_W = 2.2;
const LANES = [-LANE_W, 0, LANE_W];
const SPAWN_Z = -70;
const GRAVITY = 30;
const JUMP_V = 10.5;

let screen = 'title';
let screenTime = 0;
let storyPage = 0;
let shake = null;
let flash = 0;
let flashColor = [255, 255, 255];
let auto = false;
let autoWait = 0;

let player = [];
let lane = 1;
let px = 0;
let py = 0;
let vy = 0;
let lives = 3;
let shielded = false;
let invuln = 0;
let speed = 0;
let distance = 0;
let score = 0;
let best = 0;
let combo = 0;
let comboTime = 0;
let nextRow = 0;
let rows = []; // { z, items: [{ kind, lane, meshes, taken }] }
let scenery = []; // recycled side props { meshes, z, light }
let stripes = []; // recycled floor stripes that show speed
let sparks = null;

const col = (c, a = 255) => rgba8(c[0], c[1], c[2], a);
const hexCol = (hex, a = 255) => rgba8((hex >> 16) & 255, (hex >> 8) & 255, hex & 255, a);
const hexArr = hex => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const fitScale = (text, max) => Math.max(1, Math.min(max, Math.floor(600 / (text.length * 6))));

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

function glow(kind, size, color, pos, intensity = 2) {
  const opts = { material: 'emissive', emissive: color, intensity };
  if (kind === 'sphere') return createSphere(size, color, pos, opts);
  if (kind === 'cone') return createCone(size, size * 2.5, color, pos, opts);
  if (kind === 'torus') return createTorus(size, size * 0.18, color, pos, opts);
  return createCube(size, color, pos, opts);
}

function box(size, color, pos, sx, sy, sz, opts) {
  const id = opts
    ? glow('cube', size, color, pos, opts)
    : createCube(size, color, pos, { roughness: 0.8 });
  setScale(id, sx, sy, sz);
  return id;
}

// ---------- world ----------
function buildWorld() {
  const floor = createPlane(14, 200, capLum(THEME.floor), [0, 0, -60], { roughness: 1 });
  setRotation(floor, -Math.PI / 2, 0, 0);
  // Lane edges run the length of the track.
  for (const x of [-LANE_W * 1.5, -LANE_W * 0.5, LANE_W * 0.5, LANE_W * 1.5])
    box(1, THEME.accent, [x, 0.02, -60], 0.05, 0.02, 200, THEME.trackStyle === 'grid' ? 0.9 : 0.5);
  // Cross stripes move toward the camera so speed reads.
  for (let i = 0; i < 12; i++) {
    const z = -i * 8;
    stripes.push({
      id: box(
        1,
        THEME.accent,
        [0, 0.02, z],
        LANE_W * 3,
        0.02,
        0.06,
        THEME.trackStyle === 'grid' ? 0.7 : 0.25
      ),
      z,
    });
  }
  for (let i = 0; i < 10; i++) scenery.push(makeScenery(-i * 8 - 4, i));
  createGradientSkybox(THEME.sky[0], THEME.sky[1]);
}

function makeScenery(z, i) {
  const side = i % 2 ? 1 : -1;
  const x = side * 5.2;
  const meshes = [];
  let light = null;
  if (THEME.trackStyle === 'corridor') {
    meshes.push(box(1, capLum(THEME.wall, 0.38), [x, 2, z], 1, 4, 8));
    meshes.push(box(1, capLum(THEME.wall, 0.38), [-x, 2, z], 1, 4, 8));
    meshes.push(glow('cone', 0.12, THEME.accent, [x - side * 0.6, 2.2, z], 3));
    if (i % 3 === 0) light = createPointLight(THEME.accent, 2.2, 10, x - side * 1.2, 2.4, z);
  } else {
    meshes.push(box(1, capLum(THEME.wall, 0.3), [x, 1.5, z], 0.4, 3, 0.4));
    meshes.push(box(1, THEME.accent, [x, 3.1, z], 0.5, 0.1, 0.5, 1.6));
    meshes.push(box(1, THEME.accent, [x, 1.5, z], 0.42, 0.05, 0.42, 1.2));
  }
  return { meshes, z, light, side, offsets: meshes.map((_, k) => k) };
}

function moveScenery(s, dz) {
  s.z += dz;
  if (s.z > 10) s.z -= 80;
  const x = s.side * 5.2;
  if (THEME.trackStyle === 'corridor') {
    setPosition(s.meshes[0], x, 2, s.z);
    setPosition(s.meshes[1], -x, 2, s.z);
    setPosition(s.meshes[2], x - s.side * 0.6, 2.2, s.z);
    if (s.light !== null) setPointLightPosition(s.light, x - s.side * 1.2, 2.4, s.z);
  } else {
    setPosition(s.meshes[0], x, 1.5, s.z);
    setPosition(s.meshes[1], x, 3.1, s.z);
    setPosition(s.meshes[2], x, 1.5 + Math.sin(screenTime * 2 + s.z) * 1.3, s.z);
  }
}

function buildPlayer() {
  const c = PLAYER.color;
  player = [
    {
      id: createCube(0.7, shade(c, -0.5), [0, 0, 0], { roughness: 0.4 }),
      ox: 0,
      oy: 0.45,
      oz: 0,
      sx: 1,
      sy: 0.5,
      sz: 1.4,
    },
    { id: glow('cone', 0.25, c, [0, 0, 0], 2), ox: 0, oy: 0.5, oz: -0.7, rx: -Math.PI / 2 },
    { id: glow('cube', 1, c, [0, 0, 0], 2), ox: 0, oy: 0.75, oz: 0.1, sx: 0.35, sy: 0.18, sz: 0.4 },
    {
      id: glow('cube', 1, PLAYER.trail, [0, 0, 0], 2.5),
      ox: 0,
      oy: 0.4,
      oz: 0.55,
      sx: 0.6,
      sy: 0.12,
      sz: 0.1,
    },
  ];
  for (const p of player) if (p.sx) setScale(p.id, p.sx, p.sy, p.sz);
  sparks = createParticleSystem(40, {
    size: 0.08,
    emissive: true,
    gravity: 0,
    emitRate: 0,
    minLife: 0.3,
    maxLife: 0.7,
    minSpeed: 1,
    maxSpeed: 4,
    startColor: HAZARDS.pickup.color,
    endColor: THEME.fog,
  });
}

function placePlayer() {
  const lean = (LANES[lane] - px) * -0.25;
  const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0;
  for (const p of player) {
    setPosition(p.id, px + p.ox, py + p.oy, p.oz);
    setRotation(p.id, p.rx || 0, 0, lean);
    setMeshVisible(p.id, !blink);
  }
}

// ---------- obstacle rows (always at least one open lane) ----------
function spawnRow(z) {
  const open = [0, 1, 2];
  const blocked = [];
  const nBlock = Math.random() < 0.35 + Math.min(0.3, speed / 100) ? 2 : 1;
  for (let i = 0; i < nBlock; i++)
    blocked.push(open.splice(Math.floor(Math.random() * open.length), 1)[0]);
  const items = [];
  for (const l of blocked) {
    const kind = Math.random() < DIFFICULTY.hurdleChance ? 'hurdle' : 'barrier';
    items.push(makeItem(kind, l, z));
  }
  // Pickups trail behind the row in an open lane; sometimes a shield.
  const freeLane = open[Math.floor(Math.random() * open.length)];
  if (Math.random() < DIFFICULTY.shieldChance && !shielded)
    items.push(makeItem('shield', freeLane, z));
  else for (let k = 0; k < 3; k++) items.push(makeItem('pickup', freeLane, z + 2.5 + k * 2));
  rows.push({ z, items });
}

function makeItem(kind, l, z) {
  const x = LANES[l];
  const meshes = [];
  if (kind === 'barrier') {
    meshes.push(box(1, capLum(HAZARDS.barrier.color, 0.35), [x, 1, z], 1.9, 2, 0.5));
    meshes.push(box(1, HAZARDS.barrier.glow, [x, 2.02, z], 1.95, 0.08, 0.55, 2));
    meshes.push(box(1, HAZARDS.barrier.glow, [x, 1, z + 0.27], 1.2, 0.08, 0.02, 2));
  } else if (kind === 'hurdle') {
    meshes.push(box(1, HAZARDS.hurdle.color, [x, 0.45, z], 1.9, 0.18, 0.18, 1.6));
    meshes.push(box(1, shade(HAZARDS.hurdle.color, -0.5), [x - 0.9, 0.25, z], 0.12, 0.5, 0.12));
    meshes.push(box(1, shade(HAZARDS.hurdle.color, -0.5), [x + 0.9, 0.25, z], 0.12, 0.5, 0.12));
  } else if (kind === 'pickup') {
    meshes.push(glow('sphere', 0.22, HAZARDS.pickup.color, [x, 0.7, z], 2));
  } else {
    meshes.push(glow('torus', 0.4, HAZARDS.shield.color, [x, 0.8, z], 2));
  }
  return { kind, lane: l, z, meshes, base: meshes.map(id => id), taken: false };
}

function itemY(kind) {
  return { barrier: [1, 2.02, 1], hurdle: [0.45, 0.25, 0.25], pickup: [0.7], shield: [0.8] }[kind];
}

function moveRows(dz) {
  for (const row of rows) {
    row.z += dz;
    for (const it of row.items) {
      it.z += dz;
      if (it.taken) continue;
      const ys = itemY(it.kind);
      const x = LANES[it.lane];
      it.meshes.forEach((id, k) => {
        if (it.kind === 'hurdle' && k > 0) setPosition(id, x + (k === 1 ? -0.9 : 0.9), ys[k], it.z);
        else if (it.kind === 'barrier' && k === 2) setPosition(id, x, ys[k], it.z + 0.27);
        else
          setPosition(
            id,
            x,
            ys[k] +
              (it.kind === 'pickup' || it.kind === 'shield'
                ? Math.sin(screenTime * 4 + it.z) * 0.12
                : 0),
            it.z
          );
      });
      if (it.kind === 'shield') setRotation(it.meshes[0], 0, screenTime * 2, 0);
    }
  }
  for (const row of rows.filter(r => r.z > 12))
    for (const it of row.items) for (const id of it.meshes) removeMesh(id);
  rows = rows.filter(r => r.z <= 12);
}

function collide() {
  const myLane = LANES.reduce((b, x, i) => (Math.abs(px - x) < Math.abs(px - LANES[b]) ? i : b), 0);
  for (const row of rows) {
    for (const it of row.items) {
      if (it.taken || it.lane !== myLane || Math.abs(it.z) > 0.7) continue;
      if (it.kind === 'pickup') {
        it.taken = true;
        for (const id of it.meshes) setMeshVisible(id, false);
        combo = comboTime > 0 ? combo + 1 : 1;
        comboTime = 1.2;
        score += HAZARDS.pickup.points * Math.min(5, combo);
        setParticleEmitter(sparks, { position: [px, py + 0.7, 0] });
        burstParticles(sparks, 12);
        sfx('coin');
      } else if (it.kind === 'shield') {
        it.taken = true;
        for (const id of it.meshes) setMeshVisible(id, false);
        shielded = true;
        sfx('powerup');
      } else if (it.kind === 'barrier' || (it.kind === 'hurdle' && py < 0.55)) {
        it.taken = true;
        hit();
      }
    }
  }
}

function hit() {
  if (invuln > 0) return;
  invuln = 1.5;
  triggerShake(shake, 0.6);
  if (shielded) {
    shielded = false;
    flash = 140;
    flashColor = hexArr(HAZARDS.shield.color);
    sfx('blip');
    return;
  }
  lives--;
  combo = 0;
  flash = 180;
  flashColor = [255, 60, 60];
  sfx('hit');
  if (lives <= 0) {
    best = Math.max(best, score);
    sfx('death');
    setScreen('over');
  }
}

// ---------- game flow ----------
function clearTrack() {
  for (const row of rows) for (const it of row.items) for (const id of it.meshes) removeMesh(id);
  rows = [];
}

function resetRun() {
  clearTrack();
  lane = 1;
  px = 0;
  py = 0;
  vy = 0;
  lives = DIFFICULTY.lives;
  shielded = false;
  invuln = 0;
  speed = DIFFICULTY.startSpeed;
  distance = 0;
  score = 0;
  combo = 0;
  nextRow = 30;
}

function setScreen(name) {
  screen = name;
  screenTime = 0;
}

function steer(dir) {
  const next = Math.max(0, Math.min(2, lane + dir));
  if (next !== lane) {
    lane = next;
    sfx('blip');
  }
}

function jump() {
  if (py > 0.01) return;
  vy = JUMP_V;
  sfx('jump');
}

function updateRun(dt) {
  speed = Math.min(DIFFICULTY.maxSpeed, speed + DIFFICULTY.ramp * dt);
  const dz = speed * dt;
  distance += dz;
  score += dz * 0.5;
  if (invuln > 0) invuln -= dt;
  if (comboTime > 0) comboTime -= dt;
  else combo = 0;

  if (!auto) {
    if (keyp('ArrowLeft') || keyp('KeyA')) steer(-1);
    if (keyp('ArrowRight') || keyp('KeyD')) steer(1);
    if (keyp('ArrowUp') || keyp('KeyW') || keyp('Space')) jump();
  }
  px += (LANES[lane] - px) * Math.min(1, dt * 14);
  vy -= GRAVITY * dt;
  py = Math.max(0, py + vy * dt);
  if (py === 0) vy = 0;

  nextRow -= dz;
  if (nextRow <= 0) {
    const t =
      (speed - DIFFICULTY.startSpeed) / Math.max(1, DIFFICULTY.maxSpeed - DIFFICULTY.startSpeed);
    spawnRow(SPAWN_Z);
    nextRow = DIFFICULTY.rowGap + (DIFFICULTY.minRowGap - DIFFICULTY.rowGap) * t;
  }
  moveRows(dz);
  collide();
  return dz;
}

// ---------- auto-play (press P): dodges, jumps, collects and restarts ----------
function autoRun() {
  // Plan for the nearest row that blocks a lane: head early for its open lane
  // nearest to us. Only chase pickups when no blocking row is close.
  const live = rows.filter(r => r.z < 0.5 && r.items.some(it => !it.taken));
  const blocking = live
    .filter(r => r.z > -40 && r.items.some(it => it.kind === 'barrier' && !it.taken))
    .sort((a, b) => b.z - a.z)[0];
  let target = lane;
  if (blocking) {
    const open = [0, 1, 2].filter(
      l => !blocking.items.some(it => it.lane === l && it.kind === 'barrier')
    );
    target = open.sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane))[0];
  }
  if (target === lane && (!blocking || blocking.z < -25)) {
    const goodies = live
      .flatMap(r => r.items)
      .filter(it => !it.taken && (it.kind === 'pickup' || it.kind === 'shield') && it.z > -20);
    if (goodies.length) target = goodies.sort((a, b) => b.z - a.z)[0].lane;
  }
  if (target !== lane) steer(target > lane ? 1 : -1);
  // Airtime is about 0.7s; jump when a hurdle in our lane is ~0.25s away.
  const hurdle = live
    .flatMap(r => r.items)
    .find(
      it =>
        !it.taken && it.lane === lane && it.kind === 'hurdle' && it.z > -speed * 0.28 && it.z < 0.3
    );
  if (hurdle) jump();
}

function updateAuto(dt) {
  autoWait -= dt;
  if (autoWait > 0) return;
  if (screen === 'title' && screenTime > 1.5) beginStory();
  else if (screen === 'story' && screenTime > 3) nextStory();
  else if (screen === 'play') {
    autoRun();
    autoWait = 0.08;
  } else if (screen === 'over' && screenTime > 3) {
    resetRun();
    setScreen('title');
  }
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
  setLightDirection(-0.3, -1, -0.4);
  setFog(THEME.fog, THEME.fogNear, THEME.fogFar);
  setCameraFOV(68);
  enableRetroEffects({
    bloom: { strength: THEME.bloom ?? 0.6, radius: 0.4, threshold: 0.5 },
    vignette: { darkness: 0.9, offset: 0.85 },
    fxaa: true,
    dithering: true,
  });
  shake = createShake({ decay: 5 });
  buildWorld();
  buildPlayer();
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

  let dz = speed * 0.35 * dt; // title and story: cruise slowly
  if (screen === 'title' && confirm && !auto) beginStory();
  else if (screen === 'story' && confirm && !auto) nextStory();
  else if (screen === 'play') dz = updateRun(dt);
  else if (screen === 'over') {
    dz = 0;
    if (confirm && screenTime > 1 && !auto) startRun();
  }
  for (const s of stripes) {
    s.z += dz;
    if (s.z > 8) s.z -= 96;
    setPosition(s.id, 0, 0.02, s.z);
  }
  for (const s of scenery) moveScenery(s, dz);
  placePlayer();

  const [sx, sy] = getShakeOffset(shake);
  setCameraPosition(px * 0.5 + sx * 0.02, 3 + py * 0.3 + sy * 0.02, 6.5);
  setCameraTarget(px * 0.6, 0.6, -10);
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
    printCentered('Arrows: switch lane   Up/Space: jump   P: AUTO-PLAY', 320, 296, col(ui.dim));
    if (best > 0) printCentered('BEST ' + Math.floor(best), 320, 314, col(ui.title));
  }
}

function drawHud() {
  const ui = THEME.ui;
  panel(0, 0, 640, 22, 200);
  print('SCORE ' + Math.floor(score), 10, 7, col(ui.text));
  printCentered(Math.floor(distance) + ' m', 320, 7, col(ui.dim));
  for (let i = 0; i < lives; i++) drawDiamond(560 + i * 18, 11, 6, 6, hexCol(PLAYER.color), true);
  if (shielded) circle(620, 11, 7, hexCol(HAZARDS.shield.color), false);
  if (combo > 1)
    printCentered(
      'x' + Math.min(5, combo) + ' COMBO',
      320,
      40,
      col(ui.title, 160 + Math.floor(Math.sin(screenTime * 10) * 90)),
      2
    );
  const t =
    (speed - DIFFICULTY.startSpeed) / Math.max(1, DIFFICULTY.maxSpeed - DIFFICULTY.startSpeed);
  drawProgressBar(10, 340, 160, 6, t, hexCol(HAZARDS.barrier.glow), col(ui.panel, 200));
  print('SPEED', 10, 328, col(ui.dim));
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
  printCentered(Math.floor(distance) + ' m', 320, 186, col(ui.dim));
  if (screenTime > 1)
    drawPulsingText('Press Space to run again', 320, 220, col(ui.text), screenTime, {
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
  const fallback = [THEME.trackStyle === 'grid' ? 'city' : 'castle', 'party', 'portal'][
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
  const grid = THEME.trackStyle === 'grid';
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
  for (let i = -8; i <= 8; i++) {
    const ex = x + w / 2 + i * 60;
    const edge = Math.max(x, Math.min(x + w, ex));
    const ey = horizon + ((y + h - horizon) * (edge - x - w / 2)) / (ex - x - w / 2 || 1);
    line(
      x + w / 2,
      horizon,
      edge,
      ex === edge ? y + h : Math.floor(ey),
      hexCol(THEME.accent, grid ? 110 : 50)
    );
  }
  if (kind === 'castle' || kind === 'city') {
    const sunX = x + w * 0.72;
    circle(sunX, horizon - 36, 34, hexCol(HAZARDS.barrier.glow, 220), true);
    for (let i = 0; i < 5; i++) rectfill(sunX - 36, horizon - 30 + i * 6, 72, 2, col(ui.panel));
    for (let i = 0; i < 9; i++) {
      const bw = 18 + ((i * 7) % 3) * 8;
      const bh = 26 + ((i * 37) % 5) * 12;
      const bx = x + 20 + i * ((w - 60) / 9);
      rectfill(bx, horizon - bh, bw, bh, rgba8(4, 4, 8, 255));
      if (kind === 'castle')
        drawTriangle(
          bx - 3,
          horizon - bh,
          bx + bw / 2,
          horizon - bh - 14,
          bx + bw + 3,
          horizon - bh,
          rgba8(4, 4, 8, 255),
          true
        );
      for (let wy = horizon - bh + 6; wy < horizon - 6; wy += 9)
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 7)
          if ((wx * 13 + wy * 7 + i) % 3 !== 0)
            rectfill(
              wx,
              wy,
              2,
              3,
              hexCol(THEME.accent, 150 + Math.floor(Math.sin(t * 3 + wx) * 90))
            );
    }
  } else if (kind === 'party') {
    // The runner speeding down a lane, trail behind.
    const rx = x + w / 2 + Math.sin(t * 1.5) * 40;
    for (let i = 0; i < 8; i++)
      rectfill(rx - 10, horizon + 20 + i * 4, 20, 3, hexCol(PLAYER.trail, 200 - i * 24));
    drawTriangle(
      rx - 16,
      horizon + 22,
      rx,
      horizon - 4,
      rx + 16,
      horizon + 22,
      hexCol(PLAYER.color),
      true
    );
    printCentered(PLAYER.name, rx, horizon - 18, hexCol(PLAYER.color));
  } else {
    // The thing chasing you: a wall of barrier glow on the horizon.
    const pulse = 0.5 + Math.sin(t * 3) * 0.5;
    drawRadialGradient(
      x + w / 2,
      horizon,
      120,
      hexCol(HAZARDS.barrier.glow, Math.floor(60 + pulse * 70)),
      rgba8(0, 0, 0, 0)
    );
    for (let i = 0; i < 7; i++)
      rectfill(
        x + 30 + i * 52,
        horizon - 40 - (i % 2) * 14,
        30,
        40 + (i % 2) * 14,
        hexCol(HAZARDS.barrier.glow, 140)
      );
  }
  rect(x, y, w, h, col(ui.border));
  rect(x + 3, y + 3, w - 6, h - 6, col(ui.border, 90));
}
