const {
  circle,
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
const { color, createShake, dist, getShakeOffset, pulse, triggerShake, updateShake } = nova64.util;
const {
  createCone,
  createCube,
  createPlane,
  createSphere,
  createTorus,
  removeMesh,
  setPosition,
  setRotation,
  setScale,
} = nova64.scene;
const {
  createParticleSystem,
  enableRetroEffects,
  removeParticleSystem,
  setParticleEmitter,
  updateParticles,
} = nova64.fx;
const {
  createPointLight,
  removeLight,
  setAmbientLight,
  setFog,
  setLightDirection,
  setPointLightPosition,
} = nova64.light;
const { grid } = nova64.ui;
const { key, keyp } = nova64.input;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { sfx } = nova64.audio;
const { t } = nova64.data;

// NOVA64 STUDIO TEMPLATE: fp-dungeon (first-person grid dungeon crawler)
// Customize everything in CONFIG. Keep the ENGINE working: grid movement,
// camera, collisions, combat flow and screens are tested. API calls use bare
// names; the build adds the nova64 imports.

// ============================== CONFIG ==============================
const THEME = {
  wallStyle: 'stone',
  wall: 0x88a0b8,
  floor: 0x90a8c0,
  ceiling: 0x7088a0,
  fog: 0x0a1220,
  fogNear: 1.5,
  fogFar: 12,
  ambient: 0x304050,
  ambientLevel: 0.45,
  lantern: 0xe0e0f0,
  accent: 0xd0e0f0,
  exit: 0x80e0ff,
  ui: {
    title: [180, 220, 255],
    text: [230, 240, 255],
    dim: [100, 120, 150],
    panel: [10, 18, 30],
    border: [50, 70, 100],
  },
};

const TEXT = {
  title: 'FROST CRYPT',
  subtitle: 'THE LAST RITUAL OF YMIR',
  prompt: 'Press Space to begin your journey',
  victory: 'THE CRYPT IS BROKEN. THE LIGHT RETURNS.',
  defeat: 'THE FROST CLAIMS THE LAST OF THE LIVE.',
  sealed: 'The portal is frozen. Defeat the King to break the seal.',
};

const STORY = [
  'Deep beneath the northern cliffs lies the Vault of Ymir, where the dead do not sleep.',
  'Three survivors—shieldmaiden, rune-caster, and hunter—seek the last exit.',
  'The Draugr King guards the portal. Only the pure of heart may pass.',
];

const PARTY = [
  { name: 'SIGRÚN', hp: 30, mp: 0, atk: 8, color: [255, 80, 80] },
  { name: 'HRAFN', hp: 24, mp: 10, atk: 5, color: [100, 180, 255] },
  { name: 'FINN', hp: 28, mp: 8, atk: 6, color: [100, 200, 100] },
];

const ENEMIES = [
  { name: 'ICE WOLF', hp: 14, atk: 4, color: 0x90b0d0, glow: 0x80e0ff, shape: 'beast' },
  { name: 'FROST WRAITH', hp: 12, atk: 5, color: 0x80b0e0, glow: 0x80e0ff, shape: 'spirit' },
  { name: 'DRAUGR', hp: 20, atk: 6, color: 0x506070, glow: 0x80e0ff, shape: 'knight' },
];

const BOSS = {
  name: 'DRAUGR KING',
  hp: 70,
  atk: 9,
  color: 0x304050,
  glow: 0x80e0ff,
  shape: 'knight',
  boss: true,
};

const LAYOUT = { cols: 8, rows: 6, seed: 2024, loops: 0.2, torches: 7, chests: 3 };

const ENCOUNTER_CHANCE = 0.16;
const SPELL_COST = 5;

// ============================== ENGINE ==============================
// ---------- dungeon generator (seeded maze, always solvable) ----------
let MAP = [];

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMap() {
  const cw = Math.max(3, Math.min(9, LAYOUT.cols | 0));
  const ch = Math.max(3, Math.min(7, LAYOUT.rows | 0));
  const W = cw * 2 + 1;
  const H = ch * 2 + 1;
  const rand = seeded(LAYOUT.seed || 1);
  const pick = list => list[Math.floor(rand() * list.length)];
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const k = (c, r) => c + ',' + r;

  // Carve a perfect maze with a randomized depth-first walk.
  const visited = new Set([k(0, 0)]);
  const stack = [[0, 0]];
  g[1][1] = '.';
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = [0, 1, 2, 3]
      .map(d => [x + DX[d], y + DZ[d], d])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < ch && !visited.has(k(nx, ny)));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [nx, ny, d] = pick(next);
    g[y * 2 + 1 + DZ[d]][x * 2 + 1 + DX[d]] = '.';
    g[ny * 2 + 1][nx * 2 + 1] = '.';
    visited.add(k(nx, ny));
    stack.push([nx, ny]);
  }

  // Knock out a few thin walls so the maze has loops, not just dead ends.
  for (let r = 1; r < H - 1; r++) {
    for (let c = 1; c < W - 1; c++) {
      if (g[r][c] !== '#') continue;
      const across =
        g[r][c - 1] === '.' && g[r][c + 1] === '.' && g[r - 1][c] === '#' && g[r + 1][c] === '#';
      const down =
        g[r - 1][c] === '.' && g[r + 1][c] === '.' && g[r][c - 1] === '#' && g[r][c + 1] === '#';
      if ((across || down) && rand() < (LAYOUT.loops ?? 0.15)) g[r][c] = '.';
    }
  }

  // Distance from the start; the exit goes to the farthest cell, the boss just before it.
  const dist = new Map([[k(1, 1), 0]]);
  const parent = new Map();
  const queue = [[1, 1]];
  while (queue.length) {
    const [c, r] = queue.shift();
    for (let d = 0; d < 4; d++) {
      const nc = c + DX[d];
      const nr = r + DZ[d];
      if (g[nr][nc] !== '#' && !dist.has(k(nc, nr))) {
        dist.set(k(nc, nr), dist.get(k(c, r)) + 1);
        parent.set(k(nc, nr), [c, r]);
        queue.push([nc, nr]);
      }
    }
  }
  const cells = [...dist.keys()].map(s => s.split(',').map(Number));
  const exit = cells.reduce((a, b) => (dist.get(k(...b)) > dist.get(k(...a)) ? b : a));
  let boss = parent.get(k(...exit));
  if (boss && dist.get(k(...boss)) > 2 && parent.get(k(...boss))) boss = parent.get(k(...boss));
  g[1][1] = 'S';
  g[exit[1]][exit[0]] = 'E';
  if (boss && g[boss[1]][boss[0]] === '.') g[boss[1]][boss[0]] = 'B';

  // Chests in dead ends, torches spread along the route by distance.
  const open = cells.filter(([c, r]) => g[r][c] === '.' && dist.get(k(c, r)) > 2);
  const deadEnds = open.filter(
    ([c, r]) => [0, 1, 2, 3].filter(d => g[r + DZ[d]][c + DX[d]] !== '#').length === 1
  );
  for (let i = 0; i < Math.min(LAYOUT.chests ?? 2, 3) && deadEnds.length; i++) {
    const [c, r] = deadEnds.splice(Math.floor(rand() * deadEnds.length), 1)[0];
    g[r][c] = 'C';
  }
  const route = open
    .filter(([c, r]) => g[r][c] === '.')
    .sort((a, b) => dist.get(k(...a)) - dist.get(k(...b)));
  const torches = Math.min(LAYOUT.torches ?? 6, 8); // each torch is a point light
  for (let i = 0; i < torches && route.length; i++) {
    const [c, r] = route[Math.floor(((i + 0.5) * route.length) / torches)];
    g[r][c] = 'T';
  }
  MAP = g.map(row => row.join(''));
}
const TILE = 2;
const EYE = 0.15;
const MOVE_TIME = 0.22;
const DX = [0, 1, 0, -1];
const DZ = [-1, 0, 1, 0];
const DIR_NAMES = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
const MENU = ['ATTACK', 'SPELL', 'DEFEND', 'FLEE'];
const SHAPES = {
  // r = right, y = up, t = toward the camera (world units from the enemy's base)
  beast: [
    { s: 'sphere', size: 0.38, y: -0.55, t: 0 },
    { s: 'sphere', size: 0.22, y: -0.3, t: 0.3 },
    { s: 'cone', size: 0.08, r: -0.12, y: -0.08, t: 0.28 },
    { s: 'cone', size: 0.08, r: 0.12, y: -0.08, t: 0.28 },
    { s: 'eye', size: 0.04, r: -0.08, y: -0.27, t: 0.5 },
    { s: 'eye', size: 0.04, r: 0.08, y: -0.27, t: 0.5 },
  ],
  spirit: [
    { s: 'eye', size: 0.3, y: -0.1, t: 0 },
    { s: 'ring', size: 0.45, y: -0.1, t: 0 },
    { s: 'eye', size: 0.07, r: -0.35, y: 0.2, t: 0.1 },
    { s: 'eye', size: 0.07, r: 0.35, y: -0.35, t: 0.1 },
  ],
  knight: [
    { s: 'cube', size: 0.5, y: -0.55, t: 0 },
    { s: 'sphere', size: 0.2, y: -0.1, t: 0 },
    { s: 'cone', size: 0.12, y: 0.15, t: 0 },
    { s: 'eye', size: 0.035, r: -0.07, y: -0.08, t: 0.19 },
    { s: 'eye', size: 0.035, r: 0.07, y: -0.08, t: 0.19 },
    { s: 'cube', size: 0.12, r: 0.38, y: -0.5, t: 0.15 },
  ],
};

let screen = 'title';
let screenTime = 0;
let storyPage = 0;
let meshes = [];
let lights = [];
let particles = [];
let portal = null;
let lantern = null;
let chests = {};
let party = [];
let explored = new Set();
let pc = 0,
  pr = 0,
  pdir = 0;
let fromX = 0,
  fromZ = 0,
  toX = 0,
  toZ = 0,
  fromYaw = 0,
  toYaw = 0,
  moveT = 1;
let stepped = false;
let steps = 0;
let gold = 0;
let bossDown = false;
let foe = null;
let menuIndex = 0;
let actor = 0;
let enemyDelay = 0;
let combatLog = [];
let message = '';
let messageTime = 0;
let shake = null;
let flash = 0;
let flashColor = [255, 255, 255];

const col = (c, a = 255) => rgba8(c[0], c[1], c[2], a);
const smooth = t => t * t * (3 - 2 * t);
const cellAt = (c, r) => (MAP[r] && MAP[r][c]) || '#';
const isWall = (c, r) => cellAt(c, r) === '#';
const fitScale = (text, max) => Math.max(1, Math.min(max, Math.floor(600 / (text.length * 6))));

// Framed panel. (nova64.draw.drawPanel resolves to the UI-object version, so
// drawPanel(x, y, w, h, opts) draws nothing; use this instead.)
function panel(x, y, w, h, alpha = 225) {
  rectfill(x, y, w, h, col(THEME.ui.panel, alpha));
  rect(x, y, w, h, col(THEME.ui.border, Math.min(255, alpha + 30)));
  rect(x + 2, y + 2, w - 4, h - 4, col(THEME.ui.border, Math.floor(alpha * 0.35)));
}

// Lighten (amount > 0) or darken a 0xRRGGBB colour; gives stone blocks variety.
function shade(hex, amount) {
  const f = v => Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  return (f((hex >> 16) & 255) << 16) | (f((hex >> 8) & 255) << 8) | f(hex & 255);
}

// Cap a surface colour's brightness so pale palettes don't wash out under the
// lantern and bloom (frost-crypt's 0x90a8c0 floor glared white).
function capLum(hex, max = 0.32) {
  const lum =
    (0.299 * ((hex >> 16) & 255) + 0.587 * ((hex >> 8) & 255) + 0.114 * (hex & 255)) / 255;
  return lum <= max ? hex : shade(hex, max / lum - 1);
}

function track(id) {
  meshes.push(id);
  return id;
}

function addLight(color, intensity, distance, x, y, z) {
  const id = createPointLight(color, intensity, distance, x, y, z);
  lights.push(id);
  return id;
}

function glowMesh(kind, size, color, pos, intensity = 2) {
  const opts = { material: 'emissive', emissive: color, intensity };
  if (kind === 'cone') return track(createCone(size, size * 3, color, pos, opts));
  if (kind === 'torus') return track(createTorus(size, size * 0.14, color, pos, opts));
  if (kind === 'sphere') return track(createSphere(size, color, pos, opts));
  return track(createCube(size, color, pos, opts));
}

function strip(x, y, z, sx, sy, sz, color) {
  const id = glowMesh('cube', 1, color, [x, y, z], THEME.stripGlow ?? 1);
  setScale(id, sx, sy, sz);
  return id;
}

function buildLevel() {
  const W = MAP[0].length;
  const H = MAP.length;
  const cx = ((W - 1) * TILE) / 2;
  const cz = ((H - 1) * TILE) / 2;
  const floor = track(
    createPlane(W * TILE, H * TILE, capLum(THEME.floor), [cx, -1, cz], { roughness: 1 })
  );
  setRotation(floor, -Math.PI / 2, 0, 0);
  const ceiling = track(createPlane(W * TILE, H * TILE, capLum(THEME.ceiling), [cx, 1, cz]));
  setRotation(ceiling, Math.PI / 2, 0, 0);

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const ch = cellAt(c, r);
      const x = c * TILE;
      const z = r * TILE;
      if (ch === '#') {
        const faces = [0, 1, 2, 3].filter(d => !isWall(c + DX[d], r + DZ[d]));
        if (!faces.length) continue; // solid rock nobody can see
        track(
          createCube(
            TILE,
            shade(capLum(THEME.wall, 0.38), ((c * 7 + r * 13) % 5) * 0.06 - 0.12),
            [x, 0, z],
            { roughness: 0.95 }
          )
        );
        if (THEME.wallStyle === 'grid') {
          for (const d of faces) {
            const fx = x + DX[d] * (TILE / 2 + 0.02);
            const fz = z + DZ[d] * (TILE / 2 + 0.02);
            const alongZ = DX[d] !== 0;
            for (const y of [-0.7, 0.7])
              strip(fx, y, fz, alongZ ? 0.04 : TILE, 0.04, alongZ ? TILE : 0.04, THEME.accent);
          }
        }
        continue;
      }
      if (ch === 'S') {
        pc = c;
        pr = r;
      } else if (ch === 'E') {
        portal = glowMesh('torus', 0.6, THEME.exit, [x, -0.1, z], 3);
        glowMesh('sphere', 0.25, THEME.exit, [x, -0.1, z], 2);
        addLight(THEME.exit, 2.5, 8, x, 0, z);
      } else if (ch === 'C') {
        chests[c + ',' + r] = track(
          createCube(0.45, 0xc89b3c, [x, -0.77, z], {
            material: 'emissive',
            emissive: 0x7a5010,
            intensity: 0.8,
          })
        );
      } else if (ch === 'T') {
        addTorch(c, r);
      }
    }
  }

  if (THEME.wallStyle === 'grid') {
    for (let r = 0; r <= H; r++)
      strip(cx, -0.99, r * TILE - TILE / 2, W * TILE, 0.02, 0.04, THEME.accent);
    for (let c = 0; c <= W; c++)
      strip(c * TILE - TILE / 2, -0.99, cz, 0.04, 0.02, H * TILE, THEME.accent);
  }
  lantern = addLight(THEME.lantern, THEME.lanternLevel ?? 1.5, 10, pc * TILE, 0.7, pr * TILE);
}

function addTorch(c, r) {
  // Mount on the first neighbouring wall so it never blocks the corridor.
  const d = [0, 1, 2, 3].find(k => isWall(c + DX[k], r + DZ[k])) ?? 0;
  const x = c * TILE + DX[d] * (TILE / 2 - 0.12);
  const z = r * TILE + DZ[d] * (TILE / 2 - 0.12);
  track(createCube(0.16, 0x2a2a2a, [x, 0.05, z]));
  if (THEME.wallStyle === 'grid') glowMesh('sphere', 0.12, THEME.accent, [x, 0.3, z], 3);
  else glowMesh('cone', 0.08, THEME.accent, [x, 0.3, z], 3);
  addLight(THEME.accent, 2.2, 7, x - DX[d] * 0.4, 0.4, z - DZ[d] * 0.4);
  const embers = createParticleSystem(16, {
    size: 0.05,
    emissive: true,
    gravity: -0.3,
    emitRate: 4,
    minLife: 0.6,
    maxLife: 1.4,
    minSpeed: 0.1,
    maxSpeed: 0.3,
    startColor: THEME.accent,
    endColor: THEME.fog,
  });
  setParticleEmitter(embers, { position: [x, 0.4, z] });
  particles.push(embers);
}

function clearLevel() {
  for (const id of meshes) removeMesh(id);
  for (const id of lights) removeLight(id);
  for (const id of particles) removeParticleSystem(id);
  meshes = [];
  lights = [];
  particles = [];
  chests = {};
  portal = null;
  clearFoe();
}

function resetGame() {
  clearLevel();
  party = PARTY.map(p => ({ ...p, maxHp: p.hp, maxMp: p.mp, defending: false }));
  explored = new Set();
  visited = new Set();
  gold = 0;
  steps = 0;
  generateMap();
  bossDown = !MAP.some(row => row.includes('B'));
  buildLevel();
  pdir = [0, 1, 2, 3].find(d => !isWall(pc + DX[d], pr + DZ[d])) ?? 0;
  fromX = toX = pc * TILE;
  fromZ = toZ = pr * TILE;
  fromYaw = toYaw = (pdir * Math.PI) / 2;
  moveT = 1;
  visited.add(pc + ',' + pr);
  reveal();
  setScreen('title');
}

function setScreen(name) {
  screen = name;
  screenTime = 0;
}

function say(text) {
  message = text;
  messageTime = 3;
}

function reveal() {
  for (let r = pr - 1; r <= pr + 1; r++)
    for (let c = pc - 1; c <= pc + 1; c++) explored.add(c + ',' + r);
}

// ---------- auto-play (press P): explores, fights and restarts by itself ----------
let auto = false;
let autoWait = 0;
let visited = new Set();

// Breadth-first search from the party; returns the first direction toward the goal.
function autoDirection() {
  const k = (c, r) => c + ',' + r;
  const first = new Map([[k(pc, pr), -1]]);
  const queue = [[pc, pr]];
  let unvisited = null;
  const cells = {};
  while (queue.length) {
    const [c, r] = queue.shift();
    const ch = cellAt(c, r);
    if (!cells[ch]) cells[ch] = [c, r];
    if (!unvisited && !visited.has(k(c, r)) && first.get(k(c, r)) !== -1) unvisited = [c, r];
    for (let d = 0; d < 4; d++) {
      const nc = c + DX[d];
      const nr = r + DZ[d];
      if (!isWall(nc, nr) && !first.has(k(nc, nr))) {
        first.set(k(nc, nr), first.get(k(c, r)) === -1 ? d : first.get(k(c, r)));
        queue.push([nc, nr]);
      }
    }
  }
  const bossSeen = cells.B && explored.has(k(...cells.B));
  const goal = bossDown ? cells.E : bossSeen ? cells.B : unvisited || cells.B || cells.E;
  return goal ? first.get(k(...goal)) : pdir;
}

function autoExplore() {
  const d = autoDirection();
  if (d === pdir || d === -1 || d === undefined) tryStep(pdir);
  else turn((d - pdir + 4) % 4 === 3 ? -1 : 1);
}

function autoFight() {
  const m = party[actor];
  let choice = 'ATTACK';
  if (m.mp >= SPELL_COST && foe.hp > m.atk * 1.5) choice = 'SPELL';
  else if (m.hp < m.maxHp * 0.3 && Math.random() < 0.4) choice = 'DEFEND';
  menuIndex = MENU.indexOf(choice);
  playerAction(choice);
}

function updateAuto(dt) {
  autoWait -= dt;
  if (autoWait > 0) return;
  if (screen === 'title' && screenTime > 1.5) {
    storyPage = 0;
    setScreen(STORY.length ? 'story' : 'explore');
  } else if (screen === 'story' && screenTime > 3) {
    storyPage++;
    setScreen(storyPage >= STORY.length ? 'explore' : 'story');
  } else if (screen === 'explore' && moveT === 1) {
    autoExplore();
    autoWait = 0.12;
  } else if (screen === 'combat' && moveT === 1 && enemyDelay <= 0) {
    autoFight();
    autoWait = 0.6;
  } else if ((screen === 'victory' || screen === 'defeat') && screenTime > 4) {
    resetGame();
  }
}

// ---------- movement ----------
function startMove(nc, nr, yawDelta) {
  fromX = toX;
  fromZ = toZ;
  fromYaw = toYaw;
  toYaw += yawDelta;
  stepped = nc !== pc || nr !== pr;
  pc = nc;
  pr = nr;
  toX = pc * TILE;
  toZ = pr * TILE;
  moveT = 0;
}

function tryStep(d) {
  const nc = pc + DX[d];
  const nr = pr + DZ[d];
  if (isWall(nc, nr)) {
    triggerShake(shake, 0.15); // walls block, they never hurt
    return;
  }
  startMove(nc, nr, 0);
}

function turn(delta) {
  pdir = (pdir + delta + 4) % 4;
  startMove(pc, pr, (delta * Math.PI) / 2);
}

function arrive() {
  if (!stepped) return;
  steps++;
  visited.add(pc + ',' + pr);
  reveal();
  const key = pc + ',' + pr;
  const ch = cellAt(pc, pr);
  if (chests[key] !== undefined) {
    removeMesh(chests[key]);
    delete chests[key];
    for (const m of party) if (m.hp > 0) m.hp = Math.min(m.maxHp, m.hp + 10);
    gold += 25;
    sfx('powerup');
    say('A chest! The party heals and finds 25 gold.');
  } else if (ch === 'E') {
    if (bossDown) setScreen('victory');
    else say(TEXT.sealed);
  } else if (ch === 'B' && !bossDown) {
    startCombat(BOSS);
  } else if (ch !== 'S' && steps > 3 && Math.random() < ENCOUNTER_CHANCE) {
    startCombat(ENEMIES[Math.floor(Math.random() * ENEMIES.length)]);
  }
}

function updateExplore(dt) {
  if (moveT < 1) {
    moveT = Math.min(1, moveT + dt / MOVE_TIME);
    if (moveT === 1) arrive();
    return;
  }
  if (key('ArrowUp') || key('KeyW')) tryStep(pdir);
  else if (key('ArrowDown') || key('KeyS')) tryStep((pdir + 2) % 4);
  else if (key('ArrowLeft') || key('KeyA')) turn(-1);
  else if (key('ArrowRight') || key('KeyD')) turn(1);
  else if (keyp('KeyQ')) tryStep((pdir + 3) % 4);
  else if (keyp('KeyE')) tryStep((pdir + 1) % 4);
}

function updateCamera(t) {
  const e = smooth(moveT);
  const x = fromX + (toX - fromX) * e;
  const z = fromZ + (toZ - fromZ) * e;
  const sway = screen === 'title' ? Math.sin(t * 0.4) * 0.5 : 0;
  const yaw = fromYaw + (toYaw - fromYaw) * e + sway;
  const bob = moveT < 1 && stepped ? Math.sin(moveT * Math.PI) * 0.05 : 0;
  const [sx, sy] = getShakeOffset(shake);
  setCameraPosition(x + sx * 0.01, EYE + bob + sy * 0.01, z);
  setCameraTarget(x + Math.sin(yaw), EYE + bob, z - Math.cos(yaw));
  // Carried slightly above and behind the eye so near walls and foes don't blow out.
  setPointLightPosition(lantern, x - Math.sin(yaw) * 0.8, 0.7, z + Math.cos(yaw) * 0.8);
  return { x, z, yaw };
}

// ---------- combat ----------
function startCombat(def) {
  foe = { ...def, maxHp: def.hp, parts: [] };
  // Foes come down a corridor: if the party faces a wall, turn toward an opening
  // so the foe isn't drawn inside the wall.
  if (isWall(pc + DX[pdir], pr + DZ[pdir])) {
    const open = [1, 3, 2].map(t => (pdir + t) % 4).find(d => !isWall(pc + DX[d], pr + DZ[d]));
    if (open !== undefined) {
      const delta = (open - pdir + 4) % 4 === 3 ? -1 : (open - pdir + 4) % 4;
      pdir = open;
      startMove(pc, pr, (delta * Math.PI) / 2);
    }
  }
  const opts = intensity => ({ material: 'emissive', emissive: def.glow, intensity });
  for (const p of SHAPES[def.shape] || SHAPES.beast) {
    let id;
    if (p.s === 'eye')
      id = createSphere(p.size, def.glow, [0, 0, 0], opts(p.size > 0.1 ? 1.2 : 3)); // big glowing bodies bloom into blobs
    else if (p.s === 'ring') id = createTorus(p.size, 0.04, def.glow, [0, 0, 0], opts(0.9));
    else if (p.s === 'cone') id = createCone(p.size, p.size * 3, def.color, [0, 0, 0]);
    else if (p.s === 'cube') id = createCube(p.size, def.color, [0, 0, 0], { roughness: 0.6 });
    else id = createSphere(p.size, def.color, [0, 0, 0], { roughness: 0.7 });
    foe.parts.push({ id, r: p.r || 0, y: p.y || 0, t: p.t || 0 });
  }
  menuIndex = 0;
  actor = firstLiving(0);
  enemyDelay = 0;
  combatLog = [
    (def.boss ? 'The ' : /^[AEIOU]/i.test(def.name) ? 'An ' : 'A ') + def.name + ' blocks the way!',
  ];
  sfx('explosion');
  triggerShake(shake, def.boss ? 0.6 : 0.3);
  setScreen('combat');
}

function clearFoe() {
  if (foe) for (const p of foe.parts) removeMesh(p.id);
  foe = null;
}

function placeFoe(view, t) {
  const fx = Math.sin(view.yaw);
  const fz = -Math.cos(view.yaw);
  const bx = view.x + fx * 1.5;
  const bz = view.z + fz * 1.5;
  const bobY = 0.45 + Math.sin(t * 2.5) * 0.06; // lifted to sit above the combat panels
  for (const p of foe.parts) {
    // right = (cos yaw, sin yaw), toward camera = -forward
    setPosition(
      p.id,
      bx + Math.cos(view.yaw) * p.r - fx * p.t,
      p.y + bobY,
      bz + Math.sin(view.yaw) * p.r - fz * p.t
    );
  }
}

function firstLiving(from) {
  for (let i = from; i < party.length; i++) if (party[i].hp > 0) return i;
  return -1;
}

function log(text) {
  combatLog.push(text);
  if (combatLog.length > 4) combatLog.shift();
}

function hitFoe(amount, color) {
  foe.hp = Math.max(0, foe.hp - amount);
  flash = 120;
  flashColor = color;
  triggerShake(shake, 0.25);
  sfx('hit');
}

function playerAction(choice) {
  const m = party[actor];
  if (choice === 'ATTACK') {
    const dmg = m.atk + Math.floor(Math.random() * 4);
    hitFoe(dmg, [255, 255, 255]);
    log(m.name + ' strikes for ' + dmg + '.');
  } else if (choice === 'SPELL') {
    if (m.mp < SPELL_COST) {
      log(m.name + ' has no magic, and attacks instead.');
      return playerAction('ATTACK');
    }
    m.mp -= SPELL_COST;
    const dmg = m.atk * 2 + 4 + Math.floor(Math.random() * 4);
    hitFoe(dmg, m.color);
    log(m.name + ' casts a spell for ' + dmg + '!');
  } else if (choice === 'DEFEND') {
    m.defending = true;
    log(m.name + ' raises a guard.');
    sfx('blip');
  } else if (choice === 'FLEE') {
    if (!foe.boss && Math.random() < 0.5) {
      log('The party flees!');
      endCombat(false);
      return;
    }
    log(foe.boss ? 'There is no escape!' : 'The way is blocked!');
  }
  if (foe.hp <= 0) {
    endCombat(true);
    return;
  }
  const next = firstLiving(actor + 1);
  if (next === -1) enemyDelay = 0.7;
  else actor = next;
  menuIndex = 0;
}

function enemyTurn() {
  const living = party.filter(m => m.hp > 0);
  const target = living[Math.floor(Math.random() * living.length)];
  let dmg = foe.atk + Math.floor(Math.random() * 3);
  if (target.defending) dmg = Math.ceil(dmg / 2);
  target.hp = Math.max(0, target.hp - dmg);
  log(foe.name + ' hits ' + target.name + ' for ' + dmg + '.');
  flash = 140;
  flashColor = [255, 40, 40];
  triggerShake(shake, 0.4);
  sfx('hit');
  for (const m of party) m.defending = false;
  if (firstLiving(0) === -1) {
    sfx('death');
    setScreen('defeat');
    return;
  }
  actor = firstLiving(0);
}

function endCombat(won) {
  if (won) {
    const reward = foe.boss ? 100 : 10 + Math.floor(Math.random() * 10);
    gold += reward;
    if (foe.boss) bossDown = true;
    sfx('coin');
    say(foe.name + ' defeated! +' + reward + ' gold' + (foe.boss ? '. The portal opens.' : '.'));
  }
  clearFoe();
  setScreen('explore');
}

function updateCombat(dt) {
  if (moveT < 1) moveT = Math.min(1, moveT + dt / MOVE_TIME); // finish the turn toward the foe
  if (enemyDelay > 0) {
    enemyDelay -= dt;
    if (enemyDelay <= 0) enemyTurn();
    return;
  }
  if (keyp('ArrowUp') || keyp('KeyW')) menuIndex = (menuIndex + MENU.length - 1) % MENU.length;
  if (keyp('ArrowDown') || keyp('KeyS')) menuIndex = (menuIndex + 1) % MENU.length;
  if (keyp('Space') || keyp('KeyZ')) playerAction(MENU[menuIndex]);
}

// ---------- hooks ----------
export function init() {
  setAmbientLight(THEME.ambient, THEME.ambientLevel);
  setLightDirection(0, -1, 0);
  setFog(THEME.fog, THEME.fogNear, THEME.fogFar);
  setCameraFOV(70);
  enableRetroEffects({
    bloom: { strength: THEME.bloom ?? 0.9, radius: 0.4, threshold: 0.55 }, // only emissive props glow
    vignette: { darkness: 0.9, offset: 0.85 },
    fxaa: true,
    dithering: true,
  });
  shake = createShake({ decay: 5 });
  resetGame();
}

export function update(dt) {
  screenTime += dt;
  updateShake(shake, dt);
  updateParticles(dt);
  if (flash > 0) flash = Math.max(0, flash - 400 * dt);
  if (messageTime > 0) messageTime -= dt;
  const confirm = keyp('Space') || keyp('KeyZ');
  if (keyp('KeyP')) {
    auto = !auto;
    autoWait = 0.3;
    sfx('select');
  }
  if (auto) updateAuto(dt);

  if (screen === 'title' && confirm) {
    sfx('confirm');
    storyPage = 0;
    setScreen(STORY.length ? 'story' : 'explore');
  } else if (screen === 'story' && confirm) {
    storyPage++;
    if (storyPage >= STORY.length) setScreen('explore');
  } else if (screen === 'explore') {
    if (!auto || moveT < 1) updateExplore(dt);
  } else if (screen === 'combat') {
    if (auto) {
      if (moveT < 1) moveT = Math.min(1, moveT + dt / MOVE_TIME);
      if (enemyDelay > 0 && (enemyDelay -= dt) <= 0) enemyTurn();
    } else updateCombat(dt);
  } else if ((screen === 'victory' || screen === 'defeat') && screenTime > 1 && confirm) {
    resetGame();
  }

  const view = updateCamera(screenTime);
  if (portal !== null) setRotation(portal, 0, screenTime * 1.2, 0);
  if (foe) placeFoe(view, screenTime);
}

// ---------- 2D ----------
// ---------- story illustrations (procedural, drawn from the theme) ----------
// STORY entries may be strings or { text, art }. art: 'castle' | 'city' | 'party' | 'portal'.
const hexCol = (hex, a = 255) => rgba8((hex >> 16) & 255, (hex >> 8) & 255, hex & 255, a);

function storyPageOf(i) {
  const page = STORY[i];
  const grid = THEME.wallStyle === 'grid';
  const fallback = [grid ? 'city' : 'castle', 'party', 'portal'][Math.min(i, 2)];
  return typeof page === 'string'
    ? { text: page, art: fallback }
    : { text: page.text || '', art: page.art || fallback };
}

function drawStoryArt(kind, t, x, y, w, h) {
  const ui = THEME.ui;
  const grid = THEME.wallStyle === 'grid';
  // Sky: deep panel colour fading toward the theme's fog/accent.
  drawGradient(x, y, w, h, col(ui.panel), hexCol(grid ? THEME.wall : THEME.fog), 'v');
  for (let i = 0; i < 40; i++) {
    const sx = x + ((i * 97) % w);
    const sy = y + ((i * 53) % Math.floor(h * 0.55));
    const tw = 120 + Math.floor(Math.sin(t * 2 + i) * 100);
    rectfill(sx, sy, 1, 1, col(ui.text, tw));
  }
  const horizon = y + Math.floor(h * 0.68);
  // Solid ground, so the 3D scene never shows through the picture.
  drawGradient(
    x,
    horizon,
    w,
    y + h - horizon,
    hexCol(capLum(THEME.floor, 0.2)),
    col(ui.panel),
    'v'
  );
  if (grid) {
    for (let i = -8; i <= 8; i++) {
      // Fan out from the vanishing point, stopping at the frame's side edges.
      const ex = x + w / 2 + i * 60;
      const edge = Math.max(x, Math.min(x + w, ex));
      const ey = horizon + ((y + h - horizon) * (edge - x - w / 2)) / (ex - x - w / 2 || 1);
      line(
        x + w / 2,
        horizon,
        edge,
        ex === edge ? y + h : Math.floor(ey),
        hexCol(THEME.accent, 110)
      );
    }
    for (let i = 1; i < 6; i++) {
      const gy = horizon + Math.floor((y + h - horizon) * (i / 6) ** 1.8);
      line(x, gy, x + w, gy, hexCol(THEME.accent, 70 + i * 20));
    }
  }

  if (kind === 'castle' || kind === 'city') {
    const sunX = x + w * 0.72;
    if (kind === 'castle') {
      drawRadialGradient(sunX, y + 46, 46, col(ui.title, 70), rgba8(0, 0, 0, 0));
      circle(sunX, y + 46, 18, col(ui.title, 230), true);
      circle(sunX - 6, y + 42, 15, col(ui.panel, 255), true); // crescent
    } else {
      // Synthwave sun with scan gaps.
      circle(sunX, horizon - 36, 34, hexCol(THEME.exit, 220), true);
      for (let i = 0; i < 5; i++) rectfill(sunX - 36, horizon - 30 + i * 6, 72, 2, col(ui.panel));
    }
    for (let i = 0; i < 5; i++) {
      const mx = x + i * (w / 4) - 30;
      drawTriangle(
        mx,
        horizon,
        mx + 70,
        horizon - 40 - (i % 2) * 18,
        mx + 140,
        horizon,
        col(ui.panel, 230),
        true
      );
    }
    // Silhouette skyline: towers with roofs (castle) or blocks with lit windows (city).
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
    // Heroes around a fire (or a terminal glow), one figure per party member.
    drawRadialGradient(x + w / 2, horizon, 120, hexCol(THEME.accent, 90), rgba8(0, 0, 0, 0));
    const flick = Math.sin(t * 9) * 3;
    drawTriangle(
      x + w / 2 - 12,
      horizon,
      x + w / 2,
      horizon - 30 - flick,
      x + w / 2 + 12,
      horizon,
      hexCol(THEME.accent, 240),
      true
    );
    drawTriangle(
      x + w / 2 - 6,
      horizon,
      x + w / 2 + 1,
      horizon - 16 + flick,
      x + w / 2 + 7,
      horizon,
      col(ui.title, 255),
      true
    );
    for (let i = 0; i < 6; i++) {
      const life = (t * 0.7 + i / 6) % 1;
      rectfill(
        x + w / 2 + Math.sin(i * 2.3 + t) * 10,
        horizon - 30 - life * 60,
        2,
        2,
        hexCol(THEME.accent, Math.floor(255 * (1 - life)))
      );
    }
    party.forEach((m, i) => {
      const side = i % 2 ? 1 : -1;
      const px = x + w / 2 + side * (50 + Math.floor(i / 2) * 50);
      circle(px, horizon - 40, 7, col(m.color, 255), true);
      rectfill(px - 7, horizon - 32, 14, 26, col(m.color, 200));
      rectfill(px - 7, horizon - 6, 5, 6, col(m.color, 160));
      rectfill(px + 2, horizon - 6, 5, 6, col(m.color, 160));
    });
  } else {
    // Portal at the end of a corridor, with something watching from the dark.
    const cx = x + w / 2;
    const cy = y + h * 0.48;
    for (let i = 0; i < 6; i++) {
      line(cx, cy, x + (i * w) / 5, y + h, col(ui.border, 120));
      line(cx, cy, x + (i * w) / 5, y, col(ui.border, 60));
    }
    const pulse = 0.5 + Math.sin(t * 3) * 0.5;
    drawRadialGradient(
      cx,
      cy,
      70,
      hexCol(THEME.exit, Math.floor(60 + pulse * 60)),
      rgba8(0, 0, 0, 0)
    );
    for (let r = 34; r > 14; r -= 6)
      circle(cx, cy, r + pulse * 3, hexCol(THEME.exit, 120 + (34 - r) * 6), false);
    const blink = Math.sin(t * 1.3) > 0.92 ? 1 : 4;
    circle(x + 70, y + h * 0.7, blink, hexCol(BOSS.glow, 255), true);
    circle(x + 86, y + h * 0.7, blink, hexCol(BOSS.glow, 255), true);
  }
  rect(x, y, w, h, col(ui.border));
  rect(x + 3, y + 3, w - 6, h - 6, col(ui.border, 90));
}

export function draw() {
  if (screen === 'title') drawTitle();
  else if (screen === 'story') drawStory();
  else {
    drawPartyPanel();
    if (screen === 'explore') drawExploreHud();
    if (screen === 'combat') drawCombatHud();
    if (screen === 'victory') drawEnding(TEXT.victory, [255, 220, 120]);
    if (screen === 'defeat') drawEnding(TEXT.defeat, [255, 90, 80]);
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
    printCentered('P: AUTO-PLAY', 320, 296, col(ui.dim));
  }
}

function wrap(text, width) {
  const lines = [''];
  for (const word of text.split(' ')) {
    if ((lines[lines.length - 1] + ' ' + word).trim().length > width) lines.push(word);
    else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + word).trim();
  }
  return lines;
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

function drawPartyPanel() {
  const ui = THEME.ui;
  panel(0, 300, 640, 60, 225);
  const w = Math.floor(640 / party.length);
  party.forEach((m, i) => {
    const x = i * w + 10;
    const active = screen === 'combat' && i === actor && enemyDelay <= 0;
    const alive = m.hp > 0;
    print((active ? '> ' : '') + m.name, x, 308, alive ? col(m.color) : col(ui.dim));
    drawProgressBar(
      x,
      322,
      w - 60,
      6,
      m.hp / m.maxHp,
      alive ? rgba8(70, 200, 90, 255) : rgba8(80, 40, 40, 255),
      rgba8(30, 20, 20, 255)
    );
    print(m.hp + '/' + m.maxHp, x + w - 54, 320, col(ui.text));
    if (m.maxMp > 0) {
      drawProgressBar(
        x,
        334,
        w - 60,
        4,
        m.mp / m.maxMp,
        rgba8(80, 120, 235, 255),
        rgba8(20, 20, 40, 255)
      );
      print(m.mp + '/' + m.maxMp, x + w - 54, 332, rgba8(150, 170, 240, 255));
    }
    if (m.defending) print('GUARD', x, 344, col(ui.title));
  });
}

function drawExploreHud() {
  const ui = THEME.ui;
  print('FACING ' + DIR_NAMES[pdir] + '   GOLD ' + gold, 10, 10, col(ui.text));
  drawMinimap();
  if (messageTime > 0) {
    const a = Math.floor(Math.min(1, messageTime) * 255);
    panel(110, 250, 420, 26, Math.floor(a * 0.85));
    printCentered(message, 320, 259, col(ui.text, a));
  }
}

function drawMinimap() {
  const ui = THEME.ui;
  const size = 6;
  const x0 = 640 - MAP[0].length * size - 10;
  const y0 = 10;
  rectfill(x0 - 3, y0 - 3, MAP[0].length * size + 6, MAP.length * size + 6, col(ui.panel, 200));
  for (const k of explored) {
    const [c, r] = k.split(',').map(Number);
    const ch = cellAt(c, r);
    const color =
      ch === '#' ? col(ui.border) : ch === 'E' ? rgba8(170, 110, 255, 255) : col(ui.dim, 120);
    rectfill(x0 + c * size, y0 + r * size, size - 1, size - 1, color);
  }
  rectfill(x0 + pc * size + 1, y0 + pr * size + 1, size - 3, size - 3, col(ui.title));
}

function drawCombatHud() {
  const ui = THEME.ui;
  const name = foe ? foe.name : '';
  printCentered(name, 320, 12, foe && foe.boss ? rgba8(255, 90, 90, 255) : col(ui.title), 2);
  if (foe)
    drawProgressBar(
      220,
      34,
      200,
      6,
      foe.hp / foe.maxHp,
      rgba8(220, 60, 60, 255),
      rgba8(40, 15, 15, 255)
    );
  panel(10, 200, 130, 92, 220);
  MENU.forEach((item, i) => {
    const on = i === menuIndex && enemyDelay <= 0;
    print((on ? '> ' : '  ') + item, 20, 210 + i * 20, on ? col(ui.title) : col(ui.text));
  });
  panel(150, 230, 480, 62, 200);
  combatLog.forEach((line, i) => print(line, 160, 238 + i * 13, col(ui.text)));
}

function drawEnding(text, color) {
  const ui = THEME.ui;
  rectfill(0, 0, 640, 300, rgba8(0, 0, 0, Math.min(170, Math.floor(screenTime * 200))));
  drawGlowTextCentered(text, 320, 110, col(color), col(color, 120), fitScale(text, 4));
  printCentered('GOLD ' + gold, 320, 160, col(ui.text), 2);
  if (screenTime > 1)
    drawPulsingText('Press Space to play again', 320, 210, col(ui.text), screenTime, {
      frequency: 2,
      minAlpha: 140,
    });
}
