// ========================================================================
// GAUNTLET 64 — Isometric Action RPG
// Top-down hack-and-slash through procedural forests, crypts, and ruins
// Inspired by Gauntlet, Diablo, and Hades
// ========================================================================

// ── Cart manifest (loaded automatically by console) ──
export const env = {
  meta: {
    name: 'Gauntlet 64',
    version: '1.0.0',
    author: 'Nova64',
    description: 'Isometric action RPG with 4 classes and procedural levels',
  },

  text: {
    defaultLocale: 'en',
    strings: {
      'game.title': 'GAUNTLET 64',
      'game.subtitle': 'Choose Your Champion',
      'class.warrior': 'WARRIOR',
      'class.valkyrie': 'VALKYRIE',
      'class.wizard': 'WIZARD',
      'class.elf': 'ELF',
      'class.warrior.desc': 'High HP, strong melee',
      'class.valkyrie.desc': 'Fast and balanced',
      'class.wizard.desc': 'Powerful ranged magic',
      'class.elf.desc': 'Fastest, ranged arrows',
      'hud.score': 'SCORE',
      'hud.kills': 'KILLS',
      'hud.level': 'LEVEL',
      'hud.hp': 'HP',
      'ui.game_over': 'GAME OVER',
      'ui.victory': 'VICTORY',
    },
    locales: {
      es: {
        'game.title': 'GAUNTLET 64',
        'game.subtitle': 'Elige Tu Campeón',
        'class.warrior': 'GUERRERO',
        'class.valkyrie': 'VALQUIRIA',
        'class.wizard': 'MAGO',
        'class.elf': 'ELFO',
        'hud.score': 'PUNTOS',
        'hud.kills': 'MUERTES',
        'hud.level': 'NIVEL',
        'ui.game_over': 'FIN DEL JUEGO',
        'ui.victory': 'VICTORIA',
      },
    },
  },

  entities: {
    enemies: {
      warrior: {
        name: 'class.warrior',
        hp: 120,
        atk: 18,
        speed: 1.0,
        color: 0x4466cc,
        tier: 1,
        atkRange: 2.4,
      },
      valkyrie: {
        name: 'class.valkyrie',
        hp: 100,
        atk: 14,
        speed: 1.15,
        color: 0xcc44aa,
        tier: 1,
        atkRange: 2.2,
      },
      wizard: {
        name: 'class.wizard',
        hp: 70,
        atk: 22,
        speed: 0.9,
        color: 0x8844cc,
        tier: 1,
        atkRange: 3.0,
        ranged: true,
      },
      elf: {
        name: 'class.elf',
        hp: 85,
        atk: 12,
        speed: 1.3,
        color: 0x44cc66,
        tier: 1,
        atkRange: 2.8,
        ranged: true,
      },
    },
  },

  gameplay: {
    classes: {
      warrior: {
        name: 'class.warrior',
        color: 0x4466cc,
        hp: 120,
        atk: 18,
        spd: 1.0,
        atkRange: 2.4,
        desc: 'class.warrior.desc',
      },
      valkyrie: {
        name: 'class.valkyrie',
        color: 0xcc44aa,
        hp: 100,
        atk: 14,
        spd: 1.15,
        atkRange: 2.2,
        desc: 'class.valkyrie.desc',
      },
      wizard: {
        name: 'class.wizard',
        color: 0x8844cc,
        hp: 70,
        atk: 22,
        spd: 0.9,
        atkRange: 3.0,
        ranged: true,
        projColor: 0xbb66ff,
        projSpd: 16,
        desc: 'class.wizard.desc',
      },
      elf: {
        name: 'class.elf',
        color: 0x44cc66,
        hp: 85,
        atk: 12,
        spd: 1.3,
        atkRange: 2.8,
        ranged: true,
        projColor: 0x88ff44,
        projSpd: 22,
        desc: 'class.elf.desc',
      },
    },
    player: {
      speed: 9,
      attackCooldown: 0.25,
      attackRange: 2.2,
      attackArc: 0.6,
      dashSpeed: 28,
      dashDuration: 0.15,
      dashCooldown: 0.6,
    },
  },

  defaults: {
    fog: { enabled: true, color: 0x336644, near: 20, far: 60 },
    camera: { fov: 45 },
    lighting: {
      ambient: 0xffffff,
      ambientIntensity: 0.6,
      directional: { direction: [-0.5, -1, -0.3] },
    },
    effects: {
      bloom: { strength: 0.5, radius: 0.4, threshold: 0.4 },
      vignette: { darkness: 1.1, offset: 0.9 },
    },
  },

  levels: {
    enchanted_forest: {
      fog: { color: 0x336644 },
      floorColor: 0x3a6b3a,
      wallColor: 0x5a4030,
      accent: 0x55cc77,
    },
    dark_crypts: {
      fog: { color: 0x222233 },
      floorColor: 0x3a3a4a,
      wallColor: 0x555566,
      accent: 0x8888cc,
    },
    burning_ruins: {
      fog: { color: 0x442200 },
      floorColor: 0x4a3020,
      wallColor: 0x6a3a20,
      accent: 0xff6633,
    },
    frozen_wastes: {
      fog: { color: 0x556677 },
      floorColor: 0x667788,
      wallColor: 0x8899aa,
      accent: 0x44ddff,
    },
    demon_realm: {
      fog: { color: 0x330022 },
      floorColor: 0x3a1a2a,
      wallColor: 0x5a2244,
      accent: 0xff2266,
    },
  },
};

const W = 640,
  H = 360;
const TILE = 2; // world-space tile size
const MAP_W = 32; // tiles wide
const MAP_H = 32; // tiles tall
const ISO_ANGLE = 0.7; // camera pitch (radians-ish, used for placement)

// Tile types: 0=floor, 1=wall, 2=tree, 3=water, 4=exit, 5=spawner
const T_FLOOR = 0,
  T_WALL = 1,
  T_TREE = 2,
  T_WATER = 3,
  T_EXIT = 4,
  T_SPAWNER = 5;

// Gameplay
const PLAYER_SPD = 9;
const PLAYER_ATK_CD = 0.25;
const PLAYER_ATK_RANGE = 2.2;
const PLAYER_ATK_ARC = Math.PI * 0.6;
const ENEMY_SPD = 3;
const DASH_SPD = 28;
const DASH_DUR = 0.15;
const DASH_CD = 0.6;

// ---- STATE ----
let state, t, level;
let map, mapMeshes, treeMeshes, waterMeshes;
let player, enemies, pickups, projectiles, particles, floats;
let playerProjectiles;
let exitPos;
let score, kills, totalKills;
let camX, camZ;
let spawnTimers;
let shake;
let cooldowns;
let playerHit;
let boss; // current boss reference (null if no boss)

// player classes
const CLASSES = [
  {
    name: 'WARRIOR',
    color: 0x4466cc,
    hp: 120,
    atk: 18,
    spd: 1.0,
    atkRange: 2.4,
    desc: 'High HP, strong melee',
  },
  {
    name: 'VALKYRIE',
    color: 0xcc44aa,
    hp: 100,
    atk: 14,
    spd: 1.15,
    atkRange: 2.2,
    desc: 'Fast and balanced',
  },
  {
    name: 'WIZARD',
    color: 0x8844cc,
    hp: 70,
    atk: 22,
    spd: 0.9,
    atkRange: 3.0,
    ranged: true,
    projColor: 0xbb66ff,
    projSpd: 16,
    desc: 'Powerful ranged magic',
  },
  {
    name: 'ELF',
    color: 0x44cc66,
    hp: 85,
    atk: 12,
    spd: 1.3,
    atkRange: 2.8,
    ranged: true,
    projColor: 0x88ff44,
    projSpd: 22,
    desc: 'Fastest, ranged arrows',
  },
];
let classIdx = 0;

// Environment themes per level
const THEMES = [
  {
    name: 'ENCHANTED FOREST',
    floor: 0x3a6b3a,
    wall: 0x5a4030,
    fog: 0x336644,
    sky: 0x88bbaa,
    treeCol: 0x2a7a2a,
    accent: 0x55cc77,
  },
  {
    name: 'DARK CRYPTS',
    floor: 0x3a3a4a,
    wall: 0x555566,
    fog: 0x222233,
    sky: 0x334455,
    treeCol: 0x444455,
    accent: 0x8888cc,
  },
  {
    name: 'BURNING RUINS',
    floor: 0x4a3020,
    wall: 0x6a3a20,
    fog: 0x442200,
    sky: 0x663300,
    treeCol: 0x553311,
    accent: 0xff6633,
  },
  {
    name: 'FROZEN WASTES',
    floor: 0x667788,
    wall: 0x8899aa,
    fog: 0x556677,
    sky: 0xaabbcc,
    treeCol: 0x99aacc,
    accent: 0x44ddff,
  },
  {
    name: 'DEMON REALM',
    floor: 0x3a1a2a,
    wall: 0x5a2244,
    fog: 0x330022,
    sky: 0x440033,
    treeCol: 0x551133,
    accent: 0xff2266,
  },
];

function theme() {
  return THEMES[Math.min(level, THEMES.length - 1)];
}

// ========================================================================
// INIT
// ========================================================================
export function init() {
  state = 'classSelect';
  t = 0;
  level = 0;
  score = 0;
  kills = 0;
  totalKills = 0;
  classIdx = 0;
  shake = createShake();

  // Set up isometric camera
  setCameraFOV(45);
  setAmbientLight(0xffffff, 0.6);
  setLightDirection(-0.5, -1, -0.3);
  enableBloom(0.5, 0.4, 0.4);
  enableVignette(1.1, 0.9);
  setFog(0x336644, 20, 60);

  // Placeholder camera while on menus
  setCameraPosition(16, 30, 40);
  setCameraTarget(16, 0, 16);
}

function startLevel() {
  state = 'playing';
  enemies = [];
  pickups = [];
  projectiles = [];
  playerProjectiles = [];
  particles = [];
  floats = createFloatingTextSystem();
  spawnTimers = [];

  generateMap();
  buildMapMeshes();
  createPlayer();
  cooldowns = createCooldownSet({ dash: DASH_CD, attack: PLAYER_ATK_CD });
  playerHit = createHitState({ invulnDuration: 0.8, blinkRate: 25 });
  spawnEnemies();

  // Boss on every 3rd floor (floor 3, 6, 9...)
  boss = null;
  if ((level + 1) % 3 === 0) {
    spawnBoss();
  }

  const th = theme();
  setFog(th.fog, 15, 50);
}

// ========================================================================
// MAP GENERATION
// ========================================================================
function generateMap() {
  map = [];
  for (let i = 0; i < MAP_W * MAP_H; i++) map[i] = T_FLOOR;

  // Border walls
  for (let x = 0; x < MAP_W; x++) {
    setTile(x, 0, T_WALL);
    setTile(x, MAP_H - 1, T_WALL);
  }
  for (let y = 0; y < MAP_H; y++) {
    setTile(0, y, T_WALL);
    setTile(MAP_W - 1, y, T_WALL);
  }

  // Generate rooms with corridors (BSP-like)
  const rooms = [];
  const roomCount = 5 + Math.min(level, 5);

  // Fill interior with walls first, then carve rooms
  for (let x = 1; x < MAP_W - 1; x++) for (let y = 1; y < MAP_H - 1; y++) setTile(x, y, T_WALL);

  for (let i = 0; i < roomCount; i++) {
    const rw = 4 + Math.floor(Math.random() * 5);
    const rh = 4 + Math.floor(Math.random() * 5);
    const rx = 2 + Math.floor(Math.random() * (MAP_W - rw - 4));
    const ry = 2 + Math.floor(Math.random() * (MAP_H - rh - 4));
    rooms.push({
      x: rx,
      y: ry,
      w: rw,
      h: rh,
      cx: rx + Math.floor(rw / 2),
      cy: ry + Math.floor(rh / 2),
    });
    for (let x = rx; x < rx + rw; x++) for (let y = ry; y < ry + rh; y++) setTile(x, y, T_FLOOR);
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1],
      b = rooms[i];
    let cx = a.cx,
      cy = a.cy;
    while (cx !== b.cx) {
      setTile(cx, cy, T_FLOOR);
      cx += cx < b.cx ? 1 : -1;
    }
    while (cy !== b.cy) {
      setTile(cx, cy, T_FLOOR);
      cy += cy < b.cy ? 1 : -1;
    }
  }

  // Scatter trees/obstacles in open areas
  const treeDensity = level < 2 ? 0.08 : 0.05;
  for (let x = 2; x < MAP_W - 2; x++) {
    for (let y = 2; y < MAP_H - 2; y++) {
      if (getTile(x, y) === T_FLOOR && Math.random() < treeDensity) {
        setTile(x, y, T_TREE);
      }
    }
  }

  // Place water patches
  const waterPatches = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < waterPatches; i++) {
    const wx = 4 + Math.floor(Math.random() * (MAP_W - 8));
    const wy = 4 + Math.floor(Math.random() * (MAP_H - 8));
    const ws = 2 + Math.floor(Math.random() * 3);
    for (let dx = 0; dx < ws; dx++)
      for (let dy = 0; dy < ws; dy++)
        if (getTile(wx + dx, wy + dy) === T_FLOOR) setTile(wx + dx, wy + dy, T_WATER);
  }

  // Player start = center of first room
  // Exit = center of last room
  const startRoom = rooms[0];
  const endRoom = rooms[rooms.length - 1];

  // Clear space around start
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) setTile(startRoom.cx + dx, startRoom.cy + dy, T_FLOOR);

  exitPos = { x: endRoom.cx, y: endRoom.cy };
  setTile(exitPos.x, exitPos.y, T_EXIT);

  // Place spawners in rooms (not first room)
  for (let i = 1; i < rooms.length; i++) {
    if (Math.random() < 0.6 + level * 0.05) {
      const r = rooms[i];
      const sx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
      const sy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
      if (getTile(sx, sy) === T_FLOOR && !(sx === exitPos.x && sy === exitPos.y)) {
        setTile(sx, sy, T_SPAWNER);
      }
    }
  }

  player = { tx: startRoom.cx, ty: startRoom.cy };
}

function setTile(x, y, v) {
  if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) map[y * MAP_W + x] = v;
}
function getTile(x, y) {
  return x >= 0 && x < MAP_W && y >= 0 && y < MAP_H ? map[y * MAP_W + x] : T_WALL;
}

function tileBlocking(x, y) {
  const t2 = getTile(x, y);
  return t2 === T_WALL || t2 === T_TREE || t2 === T_WATER;
}

// ========================================================================
// BUILD 3D MESHES
// ========================================================================
function buildMapMeshes() {
  // Clean up old meshes
  if (mapMeshes) mapMeshes.forEach(m => destroyMesh(m));
  if (treeMeshes) treeMeshes.forEach(m => destroyMesh(m));
  if (waterMeshes) waterMeshes.forEach(m => destroyMesh(m));
  mapMeshes = [];
  treeMeshes = [];
  waterMeshes = [];

  const th = theme();

  // Ground plane
  const groundSize = MAP_W * TILE;
  const gm = createPlane(groundSize, groundSize, th.floor, [groundSize / 2, 0, groundSize / 2]);
  setRotation(gm, -Math.PI / 2, 0, 0);
  mapMeshes.push(gm);

  for (let x = 0; x < MAP_W; x++) {
    for (let y = 0; y < MAP_H; y++) {
      const tile = getTile(x, y);
      const wx = x * TILE + TILE / 2;
      const wz = y * TILE + TILE / 2;

      if (tile === T_WALL) {
        const h = 2 + Math.random() * 1.5;
        const m = createCube(TILE, th.wall, [wx, h / 2, wz]);
        setScale(m, 1, h / TILE, 1);
        mapMeshes.push(m);
      } else if (tile === T_TREE) {
        // Trunk
        const trunk = createCylinder(0.2, 2, 0x553311, [wx, 1, wz]);
        treeMeshes.push(trunk);
        // Canopy
        const canopy = createSphere(1.2 + Math.random() * 0.5, th.treeCol, [
          wx,
          2.5 + Math.random() * 0.5,
          wz,
        ]);
        treeMeshes.push(canopy);
      } else if (tile === T_WATER) {
        const m = createPlane(TILE, TILE, 0x2255aa, [wx, 0.05, wz]);
        setRotation(m, -Math.PI / 2, 0, 0);
        waterMeshes.push(m);
      } else if (tile === T_EXIT) {
        // Glowing exit portal
        const portal = createCylinder(0.8, 3, 0x44ffaa, [wx, 1.5, wz]);
        mapMeshes.push(portal);
        const ring = createTorus(1.2, 0.15, 0xaaffdd, [wx, 0.5, wz]);
        setRotation(ring, Math.PI / 2, 0, 0);
        mapMeshes.push(ring);
      } else if (tile === T_SPAWNER) {
        const spawner = createCube(1.2, 0x663333, [wx, 0.6, wz]);
        setScale(spawner, 1, 0.6, 1);
        mapMeshes.push(spawner);
        // Skull decor
        const skull = createSphere(0.3, 0xddccaa, [wx, 1.2, wz]);
        mapMeshes.push(skull);
        spawnTimers.push({
          x,
          y,
          timer: 2 + Math.random() * 3,
          hp: 3 + level,
          mesh: spawner,
          skullMesh: skull,
          alive: true,
        });
      }
    }
  }

  // Decorative ambient objects around the edges
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = MAP_W * TILE * 0.6 + Math.random() * 15;
    const dx = Math.cos(angle) * dist + (MAP_W * TILE) / 2;
    const dz = Math.sin(angle) * dist + (MAP_H * TILE) / 2;
    const h = 5 + Math.random() * 10;
    const c = [0x334433, 0x443344, 0x333344][Math.floor(Math.random() * 3)];
    const m = createCube(3 + Math.random() * 4, c, [dx, h / 2, dz]);
    setScale(m, 1, h / 3, 1);
    mapMeshes.push(m);
  }
}

// ========================================================================
// PLAYER
// ========================================================================
function createPlayer() {
  const cls = CLASSES[classIdx];
  player = {
    x: player.tx * TILE + TILE / 2,
    z: player.ty * TILE + TILE / 2,
    y: 0,
    vx: 0,
    vz: 0,
    hp: cls.hp,
    maxHp: cls.hp,
    atk: cls.atk,
    spdMul: cls.spd,
    facing: 0, // angle in radians
    atkAnim: 0,
    potions: 2,
    xp: 0,
    lvl: 1,
    xpNext: 50,
    keys: 0,
    dashTimer: 0,
    dashDX: 0,
    dashDZ: 0,
    meshBody: null,
    meshHead: null,
    meshWeapon: null,
  };

  player.meshBody = createCube(0.8, cls.color, [player.x, 0.7, player.z]);
  setScale(player.meshBody, 0.8, 1.2, 0.6);
  player.meshHead = createSphere(0.3, 0xeeddcc, [player.x, 1.6, player.z]);
  player.meshWeapon = createCube(0.1, 0xccccdd, [player.x + 0.6, 1.0, player.z]);
  setScale(player.meshWeapon, 0.1, 1.2, 0.1);

  camX = player.x;
  camZ = player.z;
}

// ========================================================================
// ENEMIES
// ========================================================================
const ENEMY_TYPES = [
  { name: 'Ghost', color: 0x88aacc, hp: 15, atk: 5, spd: 2.5, xp: 8, score: 20 },
  { name: 'Grunt', color: 0xaa5533, hp: 25, atk: 8, spd: 2.0, xp: 12, score: 30 },
  { name: 'Demon', color: 0xcc2244, hp: 40, atk: 12, spd: 1.5, xp: 20, score: 50 },
  { name: 'Sorcerer', color: 0x8844cc, hp: 30, atk: 10, spd: 1.8, xp: 25, score: 60, shoots: true },
  { name: 'Death', color: 0x222222, hp: 80, atk: 20, spd: 2.5, xp: 50, score: 150 },
];

function spawnEnemies() {
  // Initial enemies in rooms
  const baseCount = 6 + level * 3;
  for (let i = 0; i < baseCount; i++) {
    spawnRandomEnemy();
  }
  // Place pickups
  const pickupCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < pickupCount; i++) {
    const pos = randomFloorTile();
    if (pos) {
      const types = ['food', 'food', 'potion', 'gold', 'gold', 'gold'];
      const type = types[Math.floor(Math.random() * types.length)];
      const colors = { food: 0x44cc44, potion: 0x4444ff, gold: 0xffdd00 };
      const m =
        type === 'gold'
          ? createCylinder(0.25, 0.15, colors[type], [pos.x * TILE + 1, 0.3, pos.y * TILE + 1])
          : createSphere(0.25, colors[type], [pos.x * TILE + 1, 0.5, pos.y * TILE + 1]);
      pickups.push({
        x: pos.x * TILE + 1,
        z: pos.y * TILE + 1,
        type,
        mesh: m,
        bob: Math.random() * 6,
      });
    }
  }
}

function spawnRandomEnemy() {
  const pos = randomFloorTile();
  if (!pos) return;
  // Don't spawn too close to player
  const px = pos.x * TILE + 1,
    pz = pos.y * TILE + 1;
  const dx = px - player.x,
    dz2 = pz - player.z;
  if (Math.sqrt(dx * dx + dz2 * dz2) < 8) return;
  spawnEnemyAt(px, pz);
}

function spawnEnemyAt(wx, wz) {
  const maxType = Math.min(ENEMY_TYPES.length - 1, 1 + Math.floor(level / 2));
  const typeIdx = Math.floor(Math.random() * (maxType + 1));
  const et = ENEMY_TYPES[typeIdx];
  const scaledHp = Math.floor(et.hp * (1 + level * 0.15));
  const scaledAtk = Math.floor(et.atk * (1 + level * 0.1));
  const m = createCube(0.7, et.color, [wx, 0.6, wz]);
  if (typeIdx >= 3) {
    setScale(m, 0.9, 1.3, 0.9); // taller for sorcerer/death
  }
  enemies.push({
    x: wx,
    z: wz,
    y: 0,
    hp: scaledHp,
    maxHp: scaledHp,
    atk: scaledAtk,
    spd: et.spd,
    xp: et.xp,
    scorePts: et.score,
    type: typeIdx,
    shoots: et.shoots || false,
    facing: Math.random() * Math.PI * 2,
    mesh: m,
    flash: 0,
    deathT: 0,
    alive: true,
    shotCD: 2 + Math.random() * 2,
    moveT: 0,
  });
}

function randomFloorTile() {
  for (let attempts = 0; attempts < 100; attempts++) {
    const x = 2 + Math.floor(Math.random() * (MAP_W - 4));
    const y = 2 + Math.floor(Math.random() * (MAP_H - 4));
    if (getTile(x, y) === T_FLOOR) return { x, y };
  }
  return null;
}

// ========================================================================
// UPDATE
// ========================================================================
export function update() {
  const dt = 1 / 60;
  t += dt;

  if (state === 'classSelect') {
    if (keyp('ArrowLeft') || keyp('KeyA'))
      classIdx = (classIdx + CLASSES.length - 1) % CLASSES.length;
    if (keyp('ArrowRight') || keyp('KeyD')) classIdx = (classIdx + 1) % CLASSES.length;
    if (keyp('Space') || keyp('Enter')) startLevel();
    return;
  }
  if (state === 'dead') {
    if (keyp('Space') || keyp('Enter')) init();
    return;
  }
  if (state === 'levelComplete') {
    if (keyp('Space') || keyp('Enter')) {
      level++;
      cleanupLevel();
      startLevel();
    }
    return;
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateSpawners(dt);
  updateProjectiles(dt);
  updatePlayerProjectiles(dt);
  updatePickups(dt);
  updateParticles(dt);
  updateBoss(dt);
  floats.update(dt);
  updateShake(shake, dt);
  updateCamera(dt);
}

// ========================================================================
// PLAYER UPDATE
// ========================================================================
function updatePlayer(dt) {
  const cls = CLASSES[classIdx];
  const spd = PLAYER_SPD * player.spdMul;
  let mx = 0,
    mz = 0;

  // Cooldown & dash update
  updateCooldowns(cooldowns, dt);
  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    const nx = player.x + player.dashDX * DASH_SPD * dt;
    const nz = player.z + player.dashDZ * DASH_SPD * dt;
    if (!tileBlocking(Math.floor(nx / TILE), Math.floor(player.z / TILE))) player.x = nx;
    if (!tileBlocking(Math.floor(player.x / TILE), Math.floor(nz / TILE))) player.z = nz;
    playerHit.invulnTimer = Math.max(playerHit.invulnTimer, 0.05);
  }

  // 8-directional movement
  if (key('ArrowUp') || key('KeyW')) mz = -1;
  if (key('ArrowDown') || key('KeyS')) mz = 1;
  if (key('ArrowLeft') || key('KeyA')) mx = -1;
  if (key('ArrowRight') || key('KeyD')) mx = 1;

  // Normalize diagonal
  if (mx !== 0 && mz !== 0) {
    mx *= 0.707;
    mz *= 0.707;
  }

  if (mx !== 0 || mz !== 0) {
    player.facing = Math.atan2(mx, -mz);
  }

  // Dash trigger
  if ((keyp('ShiftLeft') || keyp('ShiftRight') || keyp('KeyK')) && useCooldown(cooldowns.dash)) {
    player.dashTimer = DASH_DUR;
    player.dashDX = mx !== 0 || mz !== 0 ? mx : Math.sin(player.facing);
    player.dashDZ = mx !== 0 || mz !== 0 ? mz : -Math.cos(player.facing);
    spawnParts(player.x, 0.3, player.z, 6, 0xaaddff);
    sfx('jump');
  }

  // Normal movement (skip during dash)
  if (player.dashTimer <= 0) {
    const nx = player.x + mx * spd * dt;
    const nz = player.z + mz * spd * dt;
    if (!tileBlocking(Math.floor(nx / TILE), Math.floor(player.z / TILE))) player.x = nx;
    if (!tileBlocking(Math.floor(player.x / TILE), Math.floor(nz / TILE))) player.z = nz;
  }

  // Attack
  updateHitState(playerHit, dt);
  if (player.atkAnim > 0) player.atkAnim -= dt;

  if (
    (keyp('Space') || keyp('KeyZ') || keyp('KeyX') || keyp('KeyJ')) &&
    useCooldown(cooldowns.attack)
  ) {
    player.atkAnim = 0.2;

    if (cls.ranged) {
      // Ranged attack: fire a projectile
      sfx('jump');
      const pm = createSphere(0.18, cls.projColor, [player.x, 0.9, player.z]);
      playerProjectiles.push({
        x: player.x,
        z: player.z,
        y: 0.9,
        vx: Math.sin(player.facing) * cls.projSpd,
        vz: -Math.cos(player.facing) * cls.projSpd,
        mesh: pm,
        timer: 1.5,
        dmg: player.atk,
      });
      spawnParts(
        player.x + Math.sin(player.facing) * 0.5,
        0.9,
        player.z - Math.cos(player.facing) * 0.5,
        3,
        cls.projColor
      );
    } else {
      // Melee attack: hit enemies in arc
      sfx('explosion');
      triggerShake(shake, 0.3);
      const range = cls.atkRange;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - player.x,
          dz2 = e.z - player.z;
        const dist = Math.sqrt(dx * dx + dz2 * dz2);
        if (dist > range) continue;
        const angleToE = Math.atan2(dx, -dz2);
        let angleDiff = angleToE - player.facing;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) < PLAYER_ATK_ARC / 2) {
          damageEnemy(e, player.atk);
        }
      }
      // Hit spawners
      for (const sp of spawnTimers) {
        if (!sp.alive) continue;
        const sx = sp.x * TILE + 1,
          sz = sp.y * TILE + 1;
        const dx = sx - player.x,
          dz2 = sz - player.z;
        if (Math.sqrt(dx * dx + dz2 * dz2) < range) {
          sp.hp -= player.atk;
          if (sp.hp <= 0) {
            sp.alive = false;
            destroyMesh(sp.mesh);
            destroyMesh(sp.skullMesh);
            setTile(sp.x, sp.y, T_FLOOR);
            score += 100;
            spawnParts(sx, 0.5, sz, 10, 0xff4444);
            floats.spawn('DESTROYED +100', sx, 2, { z: sz, duration: 1, color: 0xffff64 });
            sfx('coin');
          }
        }
      }

      // Attack visual particles
      const ax = player.x + Math.sin(player.facing) * 1.5;
      const az = player.z - Math.cos(player.facing) * 1.5;
      spawnParts(ax, 0.8, az, 5, cls.color);
    }
  }

  // Use potion
  if ((keyp('KeyP') || keyp('KeyQ')) && player.potions > 0 && player.hp < player.maxHp) {
    player.potions--;
    player.hp = Math.min(player.hp + 40, player.maxHp);
    spawnParts(player.x, 1, player.z, 8, 0x44ff44);
    floats.spawn('HEALED!', player.x, 2, { z: player.z, duration: 0.8, color: 0xffff64 });
    sfx('coin');
  }

  // Check exit (boss must be dead first)
  const ptx = Math.floor(player.x / TILE),
    ptz = Math.floor(player.z / TILE);
  if (ptx === exitPos.x && ptz === exitPos.y && (!boss || !boss.alive)) {
    state = 'levelComplete';
    score += 200 + level * 50;
  }

  // Sync player mesh
  const vis = isVisible(playerHit, t);
  const bob = (mx !== 0 || mz !== 0) && player.y === 0 ? Math.abs(Math.sin(t * 10)) * 0.15 : 0;
  setPosition(player.meshBody, player.x, 0.7 + bob, player.z);
  setPosition(player.meshHead, player.x, 1.6 + bob, player.z);
  setRotation(player.meshBody, 0, player.facing, 0);

  // Weapon swing
  const weapAngle =
    player.atkAnim > 0
      ? player.facing + Math.sin((1 - player.atkAnim / 0.2) * Math.PI) * 1.2
      : player.facing;
  const wDist = player.atkAnim > 0 ? 1.0 : 0.6;
  setPosition(
    player.meshWeapon,
    player.x + Math.sin(weapAngle) * wDist,
    1.0 + bob,
    player.z - Math.cos(weapAngle) * wDist
  );
  setRotation(player.meshWeapon, 0, weapAngle, 0.3);

  if (vis) {
    setScale(player.meshBody, 0.8, 1.2, 0.6);
    setScale(player.meshHead, 1, 1, 1);
  } else {
    setScale(player.meshBody, 0.01, 0.01, 0.01);
    setScale(player.meshHead, 0.01, 0.01, 0.01);
  }
}

function hurtPlayer(dmg) {
  if (!triggerHit(playerHit)) return;
  player.hp -= dmg;
  triggerShake(shake, 0.5);
  sfx('explosion');
  if (player.hp <= 0) {
    state = 'dead';
    triggerShake(shake, 1.0);
    spawnParts(player.x, 1, player.z, 20, 0xff4444);
  }
}

function gainXP(amount) {
  player.xp += amount;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.lvl++;
    player.xpNext = Math.floor(player.xpNext * 1.4);
    player.maxHp += 10;
    player.hp = Math.min(player.hp + 20, player.maxHp);
    player.atk += 2;
    floats.spawn(`LEVEL UP! LVL ${player.lvl}`, player.x, 3, {
      z: player.z,
      duration: 2,
      color: 0xffff64,
    });
    spawnParts(player.x, 1, player.z, 15, 0xffdd44);
    sfx('coin');
  }
}

// ========================================================================
// ENEMY UPDATE
// ========================================================================
function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    if (!e.alive) {
      e.deathT -= dt;
      if (e.deathT <= 0) {
        destroyMesh(e.mesh);
        enemies.splice(i, 1);
        continue;
      }
      setPosition(e.mesh, e.x, e.deathT * 3, e.z);
      setRotation(e.mesh, t * 10, t * 8, 0);
      setScale(e.mesh, e.deathT * 2, e.deathT * 2, e.deathT * 2);
      continue;
    }

    if (e.flash > 0) e.flash -= dt;

    // Move toward player
    const dx = player.x - e.x,
      dz = player.z - e.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 25) {
      e.moveT += dt;
      const ang = Math.atan2(dx, -dz);
      e.facing = ang;

      // Move (with some randomness)
      const wobble = Math.sin(e.moveT * 2 + i) * 0.3;
      const mx = Math.sin(ang + wobble) * e.spd * dt;
      const mz = -Math.cos(ang + wobble) * e.spd * dt;

      const nx = e.x + mx,
        nz = e.z + mz;
      if (!tileBlocking(Math.floor(nx / TILE), Math.floor(e.z / TILE))) e.x = nx;
      if (!tileBlocking(Math.floor(e.x / TILE), Math.floor(nz / TILE))) e.z = nz;

      // Melee contact
      if (dist < 1.2) {
        hurtPlayer(e.atk);
      }

      // Ranged attack
      if (e.shoots) {
        e.shotCD -= dt;
        if (e.shotCD <= 0 && dist < 15 && dist > 3) {
          e.shotCD = 2.5;
          const pAng = Math.atan2(dx, -dz);
          const pm = createSphere(0.15, 0xcc44ff, [e.x, 0.8, e.z]);
          projectiles.push({
            x: e.x,
            z: e.z,
            y: 0.8,
            vx: Math.sin(pAng) * 8,
            vz: -Math.cos(pAng) * 8,
            mesh: pm,
            timer: 3,
            dmg: e.atk,
          });
        }
      }
    }

    // Render
    const bob2 = Math.sin(t * 3 + i) * 0.1;
    setPosition(e.mesh, e.x, 0.6 + bob2, e.z);
    setRotation(e.mesh, 0, e.facing, 0);
  }
}

function damageEnemy(e, dmg) {
  e.hp -= dmg;
  e.flash = 0.12;
  if (e.hp <= 0) {
    e.alive = false;
    e.deathT = 0.4;
    kills++;
    totalKills++;
    score += e.scorePts;
    gainXP(e.xp);
    spawnParts(e.x, 0.5, e.z, 8, 0xff8844);
    floats.spawn(`+${e.scorePts}`, e.x, 1.5, { z: e.z, duration: 0.7, color: 0xffff64 });
    sfx('coin');
    // Random drops
    if (Math.random() < 0.15) {
      const m = createSphere(0.2, 0x44cc44, [e.x, 0.4, e.z]);
      pickups.push({ x: e.x, z: e.z, type: 'food', mesh: m, bob: Math.random() * 6 });
    }
    // If this was the boss, mark it dead
    if (boss && e === boss) {
      boss.alive = false;
      floats.spawn('BOSS SLAIN!', e.x, 3, { z: e.z, duration: 2, color: 0xffdd00 });
      sfx('explosion');
      triggerShake(shake, 8);
      score += 500 + level * 100;
      // Drop extra loot
      for (let k = 0; k < 5; k++) {
        const ox = e.x + (Math.random() - 0.5) * 3;
        const oz = e.z + (Math.random() - 0.5) * 3;
        const m2 = createCylinder(0.25, 0.15, 0xffdd00, [ox, 0.3, oz]);
        pickups.push({ x: ox, z: oz, type: 'gold', mesh: m2, bob: Math.random() * 6 });
      }
    }
  } else {
    floats.spawn('HIT', e.x, 1.5, { z: e.z, duration: 0.3, color: 0xffff64 });
  }
}

// ========================================================================
// SPAWNERS
// ========================================================================
function updateSpawners(dt) {
  for (const sp of spawnTimers) {
    if (!sp.alive) continue;
    sp.timer -= dt;
    if (sp.timer <= 0 && enemies.length < 30) {
      sp.timer = 4 + Math.random() * 3 - level * 0.2;
      const wx = sp.x * TILE + 1,
        wz = sp.y * TILE + 1;
      spawnEnemyAt(wx + (Math.random() - 0.5) * 3, wz + (Math.random() - 0.5) * 3);
      spawnParts(wx, 0.5, wz, 4, 0xff2222);
    }
  }
}

// ========================================================================
// PROJECTILES, PICKUPS, PARTICLES
// ========================================================================
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.timer -= dt;
    setPosition(p.mesh, p.x, p.y, p.z);
    // Hit player
    const dx = p.x - player.x,
      dz = p.z - player.z;
    if (Math.sqrt(dx * dx + dz * dz) < 0.8) {
      hurtPlayer(p.dmg);
      destroyMesh(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }
    // Hit wall
    if (tileBlocking(Math.floor(p.x / TILE), Math.floor(p.z / TILE))) {
      destroyMesh(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }
    if (p.timer <= 0) {
      destroyMesh(p.mesh);
      projectiles.splice(i, 1);
    }
  }
}

function updatePlayerProjectiles(dt) {
  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    const p = playerProjectiles[i];
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.timer -= dt;
    setPosition(p.mesh, p.x, p.y, p.z);
    // Hit enemies
    let hit = false;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = p.x - e.x,
        dz = p.z - e.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.0) {
        damageEnemy(e, p.dmg);
        hit = true;
        break;
      }
    }
    // Hit spawners
    if (!hit) {
      for (const sp of spawnTimers) {
        if (!sp.alive) continue;
        const sx = sp.x * TILE + 1,
          sz = sp.y * TILE + 1;
        const dx = p.x - sx,
          dz = p.z - sz;
        if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
          sp.hp -= p.dmg;
          hit = true;
          if (sp.hp <= 0) {
            sp.alive = false;
            destroyMesh(sp.mesh);
            destroyMesh(sp.skullMesh);
            setTile(sp.x, sp.y, T_FLOOR);
            score += 100;
            spawnParts(sx, 0.5, sz, 10, 0xff4444);
            floats.spawn('DESTROYED +100', sx, 2, { z: sz, duration: 1, color: 0xffff64 });
            sfx('coin');
          }
          break;
        }
      }
    }
    if (hit || tileBlocking(Math.floor(p.x / TILE), Math.floor(p.z / TILE)) || p.timer <= 0) {
      if (hit) spawnParts(p.x, p.y, p.z, 4, 0xffdd44);
      destroyMesh(p.mesh);
      playerProjectiles.splice(i, 1);
    }
  }
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.bob += dt * 3;
    setPosition(p.mesh, p.x, 0.4 + Math.sin(p.bob) * 0.15, p.z);
    setRotation(p.mesh, 0, t * 2, 0);
    const dx = p.x - player.x,
      dz = p.z - player.z;
    if (Math.sqrt(dx * dx + dz * dz) < 1.3) {
      destroyMesh(p.mesh);
      pickups.splice(i, 1);
      if (p.type === 'food') {
        player.hp = Math.min(player.hp + 15, player.maxHp);
        floats.spawn('FOOD +15HP', p.x, 1, { z: p.z, duration: 0.8, color: 0xffff64 });
      } else if (p.type === 'potion') {
        player.potions++;
        floats.spawn('POTION', p.x, 1, { z: p.z, duration: 0.8, color: 0xffff64 });
      } else if (p.type === 'gold') {
        score += 25;
        floats.spawn('+25 GOLD', p.x, 1, { z: p.z, duration: 0.8, color: 0xffff64 });
      }
      sfx('coin');
      spawnParts(p.x, 0.5, p.z, 4, 0xffdd00);
    }
  }
}

function spawnParts(x, y, z, n, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2,
      s = 1 + Math.random() * 3;
    const m = createSphere(0.08, col, [x, y, z]);
    particles.push({
      x,
      y,
      z,
      vx: Math.cos(a) * s,
      vy: 2 + Math.random() * 3,
      vz: Math.sin(a) * s,
      life: 0.4 + Math.random() * 0.4,
      mesh: m,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy -= 12 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    setPosition(p.mesh, p.x, p.y, p.z);
    if (p.life <= 0) {
      destroyMesh(p.mesh);
      particles.splice(i, 1);
    }
  }
}

// ========================================================================
// CAMERA (isometric top-down)
// ========================================================================
function updateCamera(dt) {
  camX += (player.x - camX) * 0.12;
  camZ += (player.z - camZ) * 0.12;
  // Isometric: elevated, angled view — closer for better action feel
  const [sx, sy] = getShakeOffset(shake);
  setCameraPosition(camX - 6 + sx, 18 + sy, camZ + 14);
  setCameraTarget(camX + sx * 0.5, 0, camZ + sy * 0.5);
}

// ========================================================================
// BOSS SYSTEM
// ========================================================================
const BOSS_TYPES = [
  { name: 'FOREST GUARDIAN', color: 0x228844, hp: 200, atk: 20, spd: 2.5, score: 500 },
  { name: 'CRYPT LORD', color: 0x445588, hp: 300, atk: 28, spd: 2.2, score: 700 },
  { name: 'RUIN TITAN', color: 0x886633, hp: 400, atk: 35, spd: 2.8, score: 900 },
  { name: 'WASTELAND BEAST', color: 0xaa4422, hp: 500, atk: 42, spd: 3.0, score: 1100 },
  { name: 'DEMON KING', color: 0xcc1133, hp: 700, atk: 50, spd: 3.5, score: 1500 },
];

function spawnBoss() {
  const bossIdx = Math.min(Math.floor(level / 3), BOSS_TYPES.length - 1);
  const bt = BOSS_TYPES[bossIdx];
  // Place boss near center of map
  const cx = Math.floor(MAP_W / 2) * TILE + 1;
  const cz = Math.floor(MAP_H / 2) * TILE + 1;
  const scaledHp = Math.floor(bt.hp * (1 + level * 0.1));
  const scaledAtk = Math.floor(bt.atk * (1 + level * 0.08));
  const m = createCube(1.4, bt.color, [cx, 1.2, cz]);
  setScale(m, 1.5, 2.0, 1.5);
  const bossEnemy = {
    x: cx,
    z: cz,
    y: 0,
    hp: scaledHp,
    maxHp: scaledHp,
    atk: scaledAtk,
    spd: bt.spd,
    xp: 100 + level * 20,
    scorePts: bt.score,
    type: ENEMY_TYPES.length - 1, // use Death-tier visuals
    shoots: true,
    mesh: m,
    flash: 0,
    deathT: 0,
    alive: true,
    shotCD: 1.5,
    moveT: 0,
    facing: 0,
    // Boss-specific
    isBoss: true,
    bossName: bt.name,
    chargeCD: 4,
    charging: false,
    chargeTimer: 0,
    chargeDx: 0,
    chargeDz: 0,
    slamCD: 6,
    slamTimer: 0,
  };
  enemies.push(bossEnemy);
  boss = bossEnemy;
  floats.spawn(`⚠ ${bt.name} ⚠`, cx, 4, { z: cz, duration: 2.5, color: 0xff4444 });
  sfx('explosion');
  triggerShake(shake, 5);
}

function updateBoss(dt) {
  if (!boss || !boss.alive) return;
  const dx = player.x - boss.x;
  const dz = player.z - boss.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Charge attack — rush toward player
  boss.chargeCD -= dt;
  if (boss.charging) {
    boss.chargeTimer -= dt;
    boss.x += boss.chargeDx * 25 * dt;
    boss.z += boss.chargeDz * 25 * dt;
    // Bounds
    boss.x = Math.max(TILE, Math.min((MAP_W - 1) * TILE, boss.x));
    boss.z = Math.max(TILE, Math.min((MAP_H - 1) * TILE, boss.z));
    setPosition(boss.mesh, boss.x, 1.2, boss.z);
    // Damage on contact during charge
    if (dist < 2.5) {
      hurtPlayer(boss.atk);
      boss.charging = false;
    }
    if (boss.chargeTimer <= 0) {
      boss.charging = false;
      // Slam on landing
      triggerShake(shake, 4);
      spawnParts(boss.x, 0.5, boss.z, 15, 0xff4400);
      sfx('explosion');
      // AoE damage near landing
      if (dist < 4) hurtPlayer(Math.floor(boss.atk * 0.6));
    }
  } else if (boss.chargeCD <= 0 && dist < 18 && dist > 5) {
    // Start charging toward player
    boss.charging = true;
    boss.chargeTimer = 0.4;
    const d = Math.sqrt(dx * dx + dz * dz);
    boss.chargeDx = dx / d;
    boss.chargeDz = dz / d;
    boss.chargeCD = 4 + Math.random() * 2;
    floats.spawn('CHARGE!', boss.x, 3, { z: boss.z, duration: 0.5, color: 0xff0000 });
  }

  // AoE slam — periodic ground pound
  boss.slamCD -= dt;
  if (boss.slamCD <= 0 && !boss.charging && dist < 6) {
    boss.slamCD = 5 + Math.random() * 3;
    triggerShake(shake, 6);
    spawnParts(boss.x, 0.5, boss.z, 20, 0xffaa00);
    sfx('explosion');
    if (dist < 5) hurtPlayer(Math.floor(boss.atk * 0.8));
    floats.spawn('SLAM!', boss.x, 3, { z: boss.z, duration: 0.6, color: 0xff6600 });
  }

  // Boss bob animation
  const bob3 = Math.sin(t * 2) * 0.15 + (boss.charging ? 0.3 : 0);
  setPosition(boss.mesh, boss.x, 1.2 + bob3, boss.z);
}

// ========================================================================
// CLEANUP between levels
// ========================================================================
function cleanupLevel() {
  if (mapMeshes) mapMeshes.forEach(m => destroyMesh(m));
  if (treeMeshes) treeMeshes.forEach(m => destroyMesh(m));
  if (waterMeshes) waterMeshes.forEach(m => destroyMesh(m));
  enemies.forEach(e => {
    if (e.mesh) destroyMesh(e.mesh);
  });
  pickups.forEach(p => {
    if (p.mesh) destroyMesh(p.mesh);
  });
  projectiles.forEach(p => {
    if (p.mesh) destroyMesh(p.mesh);
  });
  particles.forEach(p => {
    if (p.mesh) destroyMesh(p.mesh);
  });
  playerProjectiles.forEach(p => {
    if (p.mesh) destroyMesh(p.mesh);
  });
  if (player.meshBody) destroyMesh(player.meshBody);
  if (player.meshHead) destroyMesh(player.meshHead);
  if (player.meshWeapon) destroyMesh(player.meshWeapon);
  mapMeshes = [];
  treeMeshes = [];
  waterMeshes = [];
  enemies = [];
  pickups = [];
  projectiles = [];
  playerProjectiles = [];
  particles = [];
}

// ========================================================================
// DRAW — 2D HUD
// ========================================================================
export function draw() {
  if (state === 'classSelect') return drawClassSelect();
  if (state === 'dead') return drawDead();
  if (state === 'levelComplete') return drawLevelComplete();

  // ── HUD panel ──
  rect(8, 8, 200, 82, rgba8(0, 0, 0, 180), true);
  rect(8, 8, 200, 82, rgba8(100, 150, 200, 100), false);

  // HP bar
  const hpP = player.hp / player.maxHp;
  const hpC =
    hpP > 0.5 ? rgba8(50, 220, 80) : hpP > 0.25 ? rgba8(220, 200, 50) : rgba8(220, 50, 50);
  print('HP', 14, 14, rgba8(200, 200, 200));
  rect(40, 14, 150, 7, rgba8(30, 30, 30), true);
  rect(40, 14, Math.floor(150 * hpP), 7, hpC, true);
  print(`${player.hp}/${player.maxHp}`, 80, 14, rgba8(255, 255, 255));

  // XP bar
  const xpP = player.xp / player.xpNext;
  print('XP', 14, 26, rgba8(180, 180, 255));
  rect(40, 26, 150, 5, rgba8(20, 20, 40), true);
  rect(40, 26, Math.floor(150 * xpP), 5, rgba8(120, 120, 255), true);

  print(`LVL ${player.lvl}  ATK ${player.atk}`, 14, 38, rgba8(220, 220, 255));
  print(`SCORE ${score}`, 14, 50, rgba8(255, 215, 0));
  print(`POTIONS ${player.potions}`, 14, 62, rgba8(100, 100, 255));

  // Level & theme
  const th = theme();
  print(`FLOOR ${level + 1}: ${th.name}`, 440, 14, rgba8(180, 180, 220, 200));
  print(`KILLS ${kills}`, 550, 28, rgba8(200, 120, 120));

  // Boss HP bar (big, prominent at top center)
  if (boss && boss.alive) {
    const bossHpP = boss.hp / boss.maxHp;
    const bossBarW = 240;
    const bossBarX = 320 - bossBarW / 2;
    rect(bossBarX - 2, 6, bossBarW + 4, 18, rgba8(0, 0, 0, 200), true);
    rect(bossBarX, 8, bossBarW, 14, rgba8(40, 10, 10), true);
    rect(bossBarX, 8, Math.floor(bossBarW * bossHpP), 14, rgba8(220, 40, 40), true);
    rect(bossBarX - 2, 6, bossBarW + 4, 18, rgba8(200, 100, 50), false);
    printCentered(`⚔ ${boss.bossName} ⚔`, 320, 10, rgba8(255, 200, 100));
  }

  // Exit locked warning
  if (boss && boss.alive) {
    const ptx2 = Math.floor(player.x / TILE),
      ptz2 = Math.floor(player.z / TILE);
    if (ptx2 === exitPos.x && ptz2 === exitPos.y) {
      printCentered('EXIT LOCKED — DEFEAT THE BOSS!', 320, 180, rgba8(255, 80, 80));
    }
  }

  // Enemy count
  const alive = enemies.filter(e => e.alive).length;
  const spawners = spawnTimers.filter(s => s.alive).length;
  print(`ENEMIES ${alive}  SPAWNERS ${spawners}`, 400, 344, rgba8(180, 130, 130, 160));

  // Enemy HP bars (drawn above enemies on screen)
  for (const e of enemies) {
    if (!e.alive || e.hp >= e.maxHp) continue;
    const dx = e.x - camX,
      dz = e.z - camZ;
    if (Math.abs(dx) > 20 || Math.abs(dz) > 20) continue;
    const sx = Math.floor(320 + (e.x - player.x) * 12);
    const sy = Math.floor(150 - (e.z - player.z) * 6);
    const bw = 20,
      bh = 3;
    const hp = e.hp / e.maxHp;
    rect(sx - bw / 2, sy, bw, bh, rgba8(40, 0, 0, 180), true);
    rect(sx - bw / 2, sy, Math.floor(bw * hp), bh, rgba8(220, 50, 50), true);
  }

  // Dash cooldown indicator
  if (!cooldownReady(cooldowns.dash)) {
    const dP = cooldownProgress(cooldowns.dash);
    print('DASH', 14, 78, rgba8(120, 160, 220, 120));
    rect(50, 78, 40, 5, rgba8(30, 30, 50), true);
    rect(50, 78, Math.floor(40 * dP), 5, rgba8(100, 180, 255), true);
  } else {
    print('DASH RDY', 14, 78, rgba8(100, 200, 255, 180));
  }

  // Minimap
  drawMinimap();

  // Floating texts (3D world-space → isometric screen projection)
  drawFloatingTexts3D(floats, (x, y, z) => [
    Math.floor(320 + (x - player.x) * 12),
    Math.floor(180 - y * 12 - (z - player.z) * 6),
  ]);

  // Controls hint
  print('WASD Move  SPC/Z Attack  SHIFT Dash  P Potion', 100, 352, rgba8(80, 80, 110, 110));
}

// ---- MINIMAP ----
function drawMinimap() {
  const mmX = W - 78,
    mmY = 56;
  const mmS = 2; // pixel per tile
  rect(mmX - 2, mmY - 2, MAP_W * mmS + 4, MAP_H * mmS + 4, rgba8(0, 0, 0, 180), true);

  for (let x = 0; x < MAP_W; x++) {
    for (let y = 0; y < MAP_H; y++) {
      const tile = getTile(x, y);
      let col = 0;
      if (tile === T_FLOOR) col = rgba8(60, 60, 60, 120);
      else if (tile === T_WALL) col = rgba8(100, 80, 60);
      else if (tile === T_TREE) col = rgba8(30, 80, 30);
      else if (tile === T_WATER) col = rgba8(30, 50, 120);
      else if (tile === T_EXIT) col = rgba8(50, 255, 150);
      else if (tile === T_SPAWNER) col = rgba8(200, 50, 50);
      else continue;
      rect(mmX + x * mmS, mmY + y * mmS, mmS, mmS, col, true);
    }
  }

  // Player dot (blinking)
  if (Math.sin(t * 8) > 0) {
    const px = Math.floor(player.x / TILE),
      pz = Math.floor(player.z / TILE);
    rect(mmX + px * mmS, mmY + pz * mmS, mmS + 1, mmS + 1, rgba8(255, 255, 0), true);
  }

  // Enemy dots
  for (const e of enemies) {
    if (!e.alive) continue;
    const ex = Math.floor(e.x / TILE),
      ez = Math.floor(e.z / TILE);
    rect(mmX + ex * mmS, mmY + ez * mmS, mmS, mmS, rgba8(255, 80, 80), true);
  }
}

// ---- SCREENS ----
function drawClassSelect() {
  rect(0, 0, W, H, rgba8(10, 8, 20, 230), true);
  printCentered('GAUNTLET 64', 320, 40, rgba8(255, 200, 80));
  printCentered('ISOMETRIC ACTION RPG', 320, 65, rgba8(150, 140, 120));

  // Class cards
  for (let i = 0; i < CLASSES.length; i++) {
    const c = CLASSES[i];
    const cx = 80 + i * 130;
    const selected = i === classIdx;
    const border = selected ? rgba8(255, 255, 100) : rgba8(80, 80, 100);
    const bg = selected ? rgba8(40, 40, 60, 220) : rgba8(20, 20, 30, 180);
    rect(cx, 100, 110, 140, bg, true);
    rect(cx, 100, 110, 140, border, false);

    // Color swatch
    const r = (c.color >> 16) & 0xff,
      g = (c.color >> 8) & 0xff,
      b = c.color & 0xff;
    rect(cx + 35, 110, 40, 40, rgba8(r, g, b), true);

    print(c.name, cx + 8, 158, selected ? rgba8(255, 255, 200) : rgba8(160, 160, 180));
    print(`HP: ${c.hp}`, cx + 8, 174, rgba8(100, 200, 100));
    print(`ATK: ${c.atk}`, cx + 8, 186, rgba8(200, 100, 100));
    print(`SPD: ${(c.spd * 100).toFixed(0)}%`, cx + 8, 198, rgba8(100, 150, 255));
    print(c.desc, cx + 4, 216, rgba8(120, 120, 140));
  }

  const pulse = Math.sin(t * 3) * 0.5 + 0.5;
  printCentered(
    'LEFT/RIGHT to choose  |  SPACE to start',
    320,
    270,
    rgba8(255, 255, 100, Math.floor(100 + pulse * 155))
  );
  printCentered('WASD Move | SPC/Z Attack | SHIFT Dash | P Potion', 320, 300, rgba8(140, 140, 170));
  printCentered('Destroy spawners! Find the exit portal!', 320, 320, rgba8(120, 160, 140));
}

function drawDead() {
  rect(0, 0, W, H, rgba8(50, 0, 0, 210), true);
  printCentered('YOU HAVE FALLEN', 320, 80, rgba8(255, 60, 60));
  printCentered(`${CLASSES[classIdx].name}  Level ${player.lvl}`, 320, 120, rgba8(200, 200, 200));
  printCentered(
    `Score: ${score}  |  Kills: ${totalKills}  |  Floor: ${level + 1}`,
    320,
    150,
    rgba8(180, 180, 200)
  );

  const rating =
    totalKills >= 50
      ? 'LEGENDARY'
      : totalKills >= 30
        ? 'HEROIC'
        : totalKills >= 15
          ? 'BRAVE'
          : 'NOVICE';
  const rc =
    totalKills >= 50
      ? rgba8(255, 215, 0)
      : totalKills >= 30
        ? rgba8(200, 100, 255)
        : rgba8(100, 200, 100);
  printCentered(rating, 320, 190, rc);

  const pulse = Math.sin(t * 3) * 0.5 + 0.5;
  printCentered(
    'PRESS SPACE TO TRY AGAIN',
    320,
    250,
    rgba8(255, 200, 150, Math.floor(100 + pulse * 155))
  );
}

function drawLevelComplete() {
  rect(0, 0, W, H, rgba8(0, 20, 40, 210), true);
  printCentered(`FLOOR ${level + 1} COMPLETE!`, 320, 80, rgba8(100, 255, 200));
  printCentered(`Score: ${score}  |  Kills: ${kills}`, 320, 130, rgba8(200, 200, 200));
  printCentered(`${CLASSES[classIdx].name}  Level ${player.lvl}`, 320, 160, rgba8(180, 180, 220));

  if (level < THEMES.length - 1) {
    const nextIsBoss = (level + 2) % 3 === 0;
    printCentered(
      `Next: ${THEMES[level + 1].name}${nextIsBoss ? ' ⚔ BOSS FLOOR ⚔' : ''}`,
      320,
      200,
      nextIsBoss ? rgba8(255, 100, 100) : rgba8(200, 180, 140)
    );
  } else {
    printCentered('The depths grow darker...', 320, 200, rgba8(200, 100, 100));
  }

  kills = 0; // reset per-floor kills
  const pulse = Math.sin(t * 3) * 0.5 + 0.5;
  printCentered(
    'PRESS SPACE TO CONTINUE',
    320,
    260,
    rgba8(255, 255, 100, Math.floor(100 + pulse * 155))
  );
}
