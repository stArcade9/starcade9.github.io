// DUNGEON DELVE 3D — Ultimate Roguelike Dungeon Crawler
// Procedurally generated dungeons with themed floors, boss fights, traps,
// particle effects, screen shake, and atmospheric lighting.

const {
  createMinimap,
  drawFloatingTexts3D,
  drawGlowText,
  drawHealthBar,
  drawMinimap,
  drawPixelBorder,
  drawProgressBar,
  print,
  printCentered,
  rect,
  rectfill,
  rgba8,
} = nova64.draw;
const {
  createCapsule,
  createCone,
  createCube,
  createCylinder,
  createSphere,
  destroyMesh,
  rotateMesh,
  setPosition,
  setScale,
} = nova64.scene;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { createPointLight, setAmbientLight, setFog, setLightColor, setLightDirection } =
  nova64.light;
const { enableBloom, enableFXAA, enableVignette } = nova64.fx;
const { btnp, key, keyp } = nova64.input;
const { sfx } = nova64.audio;
const { Screen } = nova64.ui;
const {
  createCooldown,
  createFloatingTextSystem,
  createShake,
  triggerShake,
  updateCooldown,
  updateShake,
  useCooldown,
} = nova64.util;

const TILE_SIZE = 2;
const MAP_W = 30;
const MAP_H = 30;
const TILE = { WALL: 0, FLOOR: 1, DOOR: 2, STAIRS: 3, CHEST: 4, TRAP: 5, TORCH: 6 };

// ── Floor themes ────────────────────────────────────────────────────────────
const THEMES = [
  {
    name: 'Stone Crypt',
    wall: 0x444466,
    floor: 0x2a2a3a,
    fog: 0x0a0a18,
    accent: 0x6666aa,
    ambient: 0xccccee,
    torch: 0xff8833,
  },
  {
    name: 'Mossy Sewer',
    wall: 0x335544,
    floor: 0x223322,
    fog: 0x081008,
    accent: 0x44aa66,
    ambient: 0x88ddaa,
    torch: 0x66ff88,
  },
  {
    name: 'Bone Catacombs',
    wall: 0x665544,
    floor: 0x332b22,
    fog: 0x100c08,
    accent: 0xccaa88,
    ambient: 0xeeddcc,
    torch: 0xffaa44,
  },
  {
    name: 'Frozen Depths',
    wall: 0x556688,
    floor: 0x334455,
    fog: 0x0a1020,
    accent: 0x88bbff,
    ambient: 0xaaccff,
    torch: 0x44ccff,
  },
  {
    name: 'Inferno Pits',
    wall: 0x663322,
    floor: 0x331a10,
    fog: 0x180808,
    accent: 0xff4422,
    ambient: 0xff8866,
    torch: 0xff3300,
  },
  {
    name: 'The Void',
    wall: 0x332244,
    floor: 0x1a1128,
    fog: 0x08041a,
    accent: 0xaa44ff,
    ambient: 0xcc88ff,
    torch: 0xdd55ff,
  },
];

// ── State ───────────────────────────────────────────────────────────────────
let gameState = 'start';
let time = 0;
let floor = 1;
let map = [];
let rooms = [];
let mapMeshes = [];
let torchLights = [];

let hero = {
  x: 0,
  y: 0,
  hp: 25,
  maxHp: 25,
  atk: 5,
  def: 2,
  xp: 0,
  xpNext: 15,
  level: 1,
  gold: 0,
  potions: 2,
  weapon: 'Rusty Sword',
  weaponBonus: 0,
  kills: 0,
  totalDmg: 0,
};
let heroMesh = null;
let heroGlow = null;

let enemies = [];
let enemyMeshes = new Map();

let items = [];
let itemMeshes = new Map();

let messages = [];
let floatingTexts;
let shake;
let potionCd;

let camCurrent = { x: 0, y: 0 };
let moveTimer = 0;
const MOVE_DELAY = 0.12;

let screenFlash = 0;
let screenFlashColor = [255, 50, 50];
let minimap = null;
let discoveredTiles = null;

// ── Theme helper ────────────────────────────────────────────────────────────
function getTheme() {
  return THEMES[(floor - 1) % THEMES.length];
}

// ── Enemy templates ─────────────────────────────────────────────────────────
function getEnemyTypes() {
  const f = floor;
  return [
    {
      name: 'Slime',
      hp: 6 + f * 2,
      atk: 2 + f,
      def: 0,
      xp: 5 + f,
      color: 0x44ff44,
      shape: 'slime',
    },
    {
      name: 'Skeleton',
      hp: 10 + f * 2,
      atk: 4 + f,
      def: 1,
      xp: 10 + f * 2,
      color: 0xddddaa,
      shape: 'skeleton',
    },
    {
      name: 'Demon',
      hp: 14 + f * 3,
      atk: 6 + f,
      def: 2,
      xp: 20 + f * 3,
      color: 0xff3333,
      shape: 'demon',
    },
    {
      name: 'Ghost',
      hp: 8 + f * 2,
      atk: 5 + f,
      def: 0,
      xp: 15 + f * 2,
      color: 0x8888ff,
      shape: 'ghost',
    },
    {
      name: 'Lich',
      hp: 18 + f * 4,
      atk: 8 + f,
      def: 3,
      xp: 30 + f * 4,
      color: 0xaa44ff,
      shape: 'lich',
    },
    {
      name: 'Dragon Whelp',
      hp: 25 + f * 5,
      atk: 10 + f,
      def: 4,
      xp: 50 + f * 5,
      color: 0xff8800,
      shape: 'dragon',
    },
  ];
}

function getBossTemplate() {
  const f = floor;
  const bosses = [
    {
      name: 'Goblin King',
      hp: 40 + f * 8,
      atk: 8 + f * 2,
      def: 3,
      xp: 80 + f * 10,
      color: 0x88ff44,
      shape: 'boss',
    },
    {
      name: 'Shadow Lord',
      hp: 60 + f * 10,
      atk: 10 + f * 2,
      def: 4,
      xp: 120 + f * 10,
      color: 0x6622cc,
      shape: 'boss',
    },
    {
      name: 'Bone Dragon',
      hp: 80 + f * 12,
      atk: 12 + f * 3,
      def: 5,
      xp: 200 + f * 15,
      color: 0xffcc44,
      shape: 'boss',
    },
  ];
  return bosses[Math.floor(floor / 3) % bosses.length];
}

// ── Create enemy mesh ───────────────────────────────────────────────────────
function createEnemyMesh(e) {
  const wx = e.x * TILE_SIZE;
  const wz = e.y * TILE_SIZE;
  let m;
  const opts = { material: 'emissive', emissive: e.color };
  switch (e.shape) {
    case 'slime':
      m = createSphere(0.45, e.color, [wx, 0.45, wz], 8, opts);
      setScale(m, 1.2, 0.7, 1.2);
      break;
    case 'skeleton':
      m = createCapsule(0.25, 0.9, e.color, [wx, 0.7, wz], opts);
      break;
    case 'demon':
      m = createCone(0.4, 1.2, e.color, [wx, 0.6, wz], opts);
      break;
    case 'ghost':
      m = createSphere(0.35, e.color, [wx, 0.8, wz], 8, {
        material: 'emissive',
        emissive: e.color,
      });
      break;
    case 'lich':
      m = createCylinder(0.15, 0.35, 1.2, e.color, [wx, 0.6, wz], opts);
      break;
    case 'dragon':
      m = createCube(0.9, e.color, [wx, 0.6, wz], opts);
      setScale(m, 1.2, 0.8, 1.5);
      break;
    case 'boss':
      m = createCube(1.2, e.color, [wx, 0.9, wz], { material: 'emissive', emissive: e.color });
      setScale(m, 1.5, 1.5, 1.5);
      break;
    default:
      m = createSphere(0.4, e.color, [wx, 0.5, wz], 8, opts);
  }
  return m;
}

// ── Dungeon generation ──────────────────────────────────────────────────────
function generateDungeon() {
  for (const m of mapMeshes) destroyMesh(m);
  mapMeshes = [];
  for (const [, m] of enemyMeshes) destroyMesh(m);
  enemyMeshes.clear();
  for (const [, m] of itemMeshes) destroyMesh(m);
  itemMeshes.clear();
  for (const l of torchLights) destroyMesh(l);
  torchLights = [];
  if (heroMesh) {
    destroyMesh(heroMesh);
    heroMesh = null;
  }
  if (heroGlow) {
    destroyMesh(heroGlow);
    heroGlow = null;
  }

  map = [];
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) map[y][x] = TILE.WALL;
  }

  discoveredTiles = [];
  for (let y = 0; y < MAP_H; y++) {
    discoveredTiles[y] = [];
    for (let x = 0; x < MAP_W; x++) discoveredTiles[y][x] = false;
  }

  // Generate rooms
  rooms = [];
  const maxRooms = 8 + Math.min(floor, 6);
  for (let i = 0; i < maxRooms * 4; i++) {
    const w = 3 + Math.floor(Math.random() * 5);
    const h = 3 + Math.floor(Math.random() * 5);
    const rx = 1 + Math.floor(Math.random() * (MAP_W - w - 2));
    const ry = 1 + Math.floor(Math.random() * (MAP_H - h - 2));
    let overlap = false;
    for (const r of rooms) {
      if (rx - 1 < r.x + r.w && rx + w + 1 > r.x && ry - 1 < r.y + r.h && ry + h + 1 > r.y) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;
    rooms.push({ x: rx, y: ry, w, h, cx: Math.floor(rx + w / 2), cy: Math.floor(ry + h / 2) });
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) map[ry + dy][rx + dx] = TILE.FLOOR;
    if (rooms.length >= maxRooms) break;
  }

  // Corridors with doors
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1],
      b = rooms[i];
    let x = a.cx,
      y = a.cy;
    let placedDoor = false;
    while (x !== b.cx) {
      if (!placedDoor && map[y][x] === TILE.WALL) {
        map[y][x] = TILE.DOOR;
        placedDoor = true;
      } else if (map[y][x] === TILE.WALL) map[y][x] = TILE.FLOOR;
      x += x < b.cx ? 1 : -1;
    }
    placedDoor = false;
    while (y !== b.cy) {
      if (!placedDoor && map[y][x] === TILE.WALL) {
        map[y][x] = TILE.DOOR;
        placedDoor = true;
      } else if (map[y][x] === TILE.WALL) map[y][x] = TILE.FLOOR;
      y += y < b.cy ? 1 : -1;
    }
  }

  // Stairs in last room
  const lastRoom = rooms[rooms.length - 1];
  map[lastRoom.cy][lastRoom.cx] = TILE.STAIRS;

  // Chests
  for (let i = 2; i < rooms.length - 1; i++) {
    if (Math.random() < 0.45) {
      const r = rooms[i];
      const cx = r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
      const cy = r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));
      if (map[cy][cx] === TILE.FLOOR) map[cy][cx] = TILE.CHEST;
    }
  }

  // Traps (floor 2+)
  if (floor >= 2) {
    for (let i = 1; i < rooms.length; i++) {
      if (Math.random() < 0.3) {
        const r = rooms[i];
        const tx = r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
        const ty = r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));
        if (map[ty][tx] === TILE.FLOOR) map[ty][tx] = TILE.TRAP;
      }
    }
  }

  // Torches at room edges
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    // Try corners adjacent to walls
    const corners = [
      [r.x - 1, r.y - 1],
      [r.x + r.w, r.y - 1],
      [r.x - 1, r.y + r.h],
      [r.x + r.w, r.y + r.h],
    ];
    for (const [tx, ty] of corners) {
      if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && map[ty][tx] === TILE.WALL) {
        map[ty][tx] = TILE.TORCH;
      }
    }
  }

  // Player in first room
  hero.x = rooms[0].cx;
  hero.y = rooms[0].cy;

  // Enemies
  enemies = [];
  const types = getEnemyTypes();
  const isBossFloor = floor % 3 === 0;

  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    if (isBossFloor && i === rooms.length - 1) {
      const boss = getBossTemplate();
      enemies.push({
        ...boss,
        x: r.cx,
        y: r.cy + (r.h > 3 ? 1 : 0),
        maxHp: boss.hp,
        alive: true,
        isBoss: true,
      });
      map[lastRoom.cy][lastRoom.cx] = TILE.FLOOR;
      const sy = lastRoom.y + 1,
        sx = lastRoom.x + 1;
      if (sy < MAP_H && sx < MAP_W) map[sy][sx] = TILE.STAIRS;
      continue;
    }
    const numEnemies = 1 + Math.floor(Math.random() * (1 + Math.floor(floor / 2)));
    for (let e = 0; e < numEnemies; e++) {
      const ex = r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
      const ey = r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));
      if (map[ey][ex] !== TILE.FLOOR) continue;
      const maxIdx = Math.min(Math.floor(1 + floor * 0.6), types.length - 1);
      const t = types[Math.floor(Math.random() * (maxIdx + 1))];
      enemies.push({ ...t, x: ex, y: ey, maxHp: t.hp, alive: true, isBoss: false });
    }
  }

  // Items
  items = [];
  for (let i = 1; i < rooms.length; i++) {
    if (Math.random() < 0.4) {
      const r = rooms[i];
      const ix = r.x + Math.floor(Math.random() * r.w);
      const iy = r.y + Math.floor(Math.random() * r.h);
      if (map[iy][ix] === TILE.FLOOR) {
        items.push({
          x: ix,
          y: iy,
          type: Math.random() < 0.55 ? 'gold' : 'potion',
          amount: Math.random() < 0.55 ? 5 + Math.floor(Math.random() * 10 * floor) : 1,
          collected: false,
        });
      }
    }
  }

  buildMapMeshes();
  revealAround(hero.x, hero.y, 4);
}

// ── Fog of war ──────────────────────────────────────────────────────────────
function revealAround(cx, cy, radius) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = cx + dx,
        ny = cy + dy;
      if (
        nx >= 0 &&
        nx < MAP_W &&
        ny >= 0 &&
        ny < MAP_H &&
        Math.abs(dx) + Math.abs(dy) <= radius + 1
      )
        discoveredTiles[ny][nx] = true;
    }
  }
}

// ── Build 3D meshes ─────────────────────────────────────────────────────────
function buildMapMeshes() {
  const theme = getTheme();

  setAmbientLight(theme.ambient, 0.12);
  setLightDirection(0, -1, 0.2);
  setLightColor(theme.accent);
  setFog(theme.fog, 4, 20);
  enableBloom(0.6, 0.3, 0.4);
  enableVignette(1.2, 0.9);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const wx = x * TILE_SIZE;
      const wz = y * TILE_SIZE;
      const tile = map[y][x];

      if (tile === TILE.WALL || tile === TILE.TORCH) {
        let adjacent = false;
        for (let dy2 = -1; dy2 <= 1; dy2++) {
          for (let dx2 = -1; dx2 <= 1; dx2++) {
            const ny2 = y + dy2,
              nx2 = x + dx2;
            if (
              ny2 >= 0 &&
              ny2 < MAP_H &&
              nx2 >= 0 &&
              nx2 < MAP_W &&
              map[ny2][nx2] !== TILE.WALL &&
              map[ny2][nx2] !== TILE.TORCH
            )
              adjacent = true;
          }
        }
        if (adjacent) {
          const wallMesh = createCube(TILE_SIZE, theme.wall, [wx, TILE_SIZE * 0.75, wz], {
            material: 'standard',
            roughness: 0.9,
          });
          setScale(wallMesh, 1, 1.5, 1);
          mapMeshes.push(wallMesh);
          if (tile === TILE.TORCH) {
            const torchMesh = createCube(0.15, theme.torch, [wx, TILE_SIZE * 1.6, wz], {
              material: 'emissive',
              emissive: theme.torch,
            });
            mapMeshes.push(torchMesh);
            const light = createPointLight(theme.torch, 1.5, 8, wx, TILE_SIZE * 1.6, wz);
            torchLights.push(light);
          }
        }
      } else {
        let floorColor = theme.floor;
        if (tile === TILE.STAIRS) floorColor = 0xffdd44;
        else if (tile === TILE.CHEST) floorColor = 0x886622;
        else if (tile === TILE.DOOR) floorColor = 0x553311;

        const floorMesh = createCube(TILE_SIZE, floorColor, [wx, -0.1, wz], {
          material: 'standard',
          roughness: 1.0,
        });
        setScale(floorMesh, 1, 0.1, 1);
        mapMeshes.push(floorMesh);

        if (tile === TILE.STAIRS) {
          const stairGlow = createCylinder(0.15, 0.15, 2.5, 0xffdd44, [wx, 1.25, wz], {
            material: 'emissive',
            emissive: 0xffdd44,
          });
          mapMeshes.push(stairGlow);
          const sl = createPointLight(0xffdd44, 2, 8, wx, 2, wz);
          torchLights.push(sl);
        }

        if (tile === TILE.CHEST) {
          const chest = createCube(0.7, 0xcc8833, [wx, 0.35, wz], {
            material: 'standard',
            roughness: 0.5,
          });
          setScale(chest, 1, 0.7, 0.7);
          mapMeshes.push(chest);
          const lid = createCube(0.7, 0xffcc44, [wx, 0.6, wz], {
            material: 'emissive',
            emissive: 0xffcc44,
          });
          setScale(lid, 1.05, 0.15, 0.75);
          mapMeshes.push(lid);
        }

        if (tile === TILE.DOOR) {
          const doorL = createCube(0.2, 0x553311, [wx - 0.7, 0.7, wz], {
            material: 'standard',
            roughness: 0.7,
          });
          setScale(doorL, 1, 7, 1);
          mapMeshes.push(doorL);
          const doorR = createCube(0.2, 0x553311, [wx + 0.7, 0.7, wz], {
            material: 'standard',
            roughness: 0.7,
          });
          setScale(doorR, 1, 7, 1);
          mapMeshes.push(doorR);
          const doorTop = createCube(0.2, 0x664422, [wx, 1.5, wz], {
            material: 'standard',
            roughness: 0.7,
          });
          setScale(doorTop, 8, 1, 1);
          mapMeshes.push(doorTop);
        }
      }
    }
  }

  // Hero
  heroMesh = createCapsule(0.3, 0.8, 0x4488ff, [hero.x * TILE_SIZE, 0.7, hero.y * TILE_SIZE], {
    material: 'standard',
    roughness: 0.4,
  });
  heroGlow = createPointLight(0x4488ff, 1.0, 6, hero.x * TILE_SIZE, 1.5, hero.y * TILE_SIZE);
  torchLights.push(heroGlow);

  for (const e of enemies) enemyMeshes.set(e, createEnemyMesh(e));

  for (const item of items) {
    const color = item.type === 'gold' ? 0xffdd00 : 0xff4488;
    itemMeshes.set(
      item,
      createSphere(0.2, color, [item.x * TILE_SIZE, 0.3, item.y * TILE_SIZE], 8, {
        material: 'emissive',
        emissive: color,
      })
    );
  }

  minimap = createMinimap({
    x: 540,
    y: 10,
    width: 90,
    height: 90,
    shape: 'rect',
    worldW: MAP_W,
    worldH: MAP_H,
    bgColor: rgba8(0, 0, 0, 200),
    borderLight: rgba8(100, 100, 140, 255),
    borderDark: rgba8(40, 40, 60, 255),
    fogOfWar: 5,
    tiles: (tx, ty) => {
      if (!discoveredTiles[ty] || !discoveredTiles[ty][tx]) return null;
      const t = map[ty][tx];
      if (t === TILE.WALL || t === TILE.TORCH) return rgba8(60, 60, 80);
      if (t === TILE.STAIRS) return rgba8(255, 255, 100);
      if (t === TILE.CHEST) return rgba8(200, 150, 50);
      if (t === TILE.DOOR) return rgba8(100, 70, 30);
      return rgba8(40, 40, 55);
    },
    tileW: MAP_W,
    tileH: MAP_H,
    player: { x: hero.x, y: hero.y, color: rgba8(80, 160, 255), blink: true },
    entities: [],
  });
}

// ── Combat ──────────────────────────────────────────────────────────────────
function rollDmg(attacker, defender) {
  return Math.max(1, attacker.atk - defender.def + Math.floor(Math.random() * 3) - 1);
}

function tryMove(dx, dy) {
  const nx = hero.x + dx;
  const ny = hero.y + dy;
  if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
  if (map[ny][nx] === TILE.WALL || map[ny][nx] === TILE.TORCH) return;

  const enemy = enemies.find(e => e.alive && e.x === nx && e.y === ny);
  if (enemy) {
    const dmg = rollDmg(hero, enemy);
    enemy.hp -= dmg;
    hero.totalDmg += dmg;
    triggerShake(shake, enemy.isBoss ? 6 : 3);
    screenFlash = 0.12;
    screenFlashColor = [255, 180, 50];
    addMessage(`Hit ${enemy.name} for ${dmg}!`, 0xffaa44);
    floatingTexts.spawn(`-${dmg}`, enemy.x * TILE_SIZE, 2.5, {
      z: enemy.y * TILE_SIZE,
      duration: 0.8,
      color: 0xff8844,
    });
    sfx('hit');
    if (enemy.hp <= 0) {
      enemy.alive = false;
      hero.xp += enemy.xp;
      hero.kills++;
      addMessage(`${enemy.name} slain! +${enemy.xp}XP`, enemy.isBoss ? 0xffdd44 : 0x44ff44);
      if (enemyMeshes.has(enemy)) {
        destroyMesh(enemyMeshes.get(enemy));
        enemyMeshes.delete(enemy);
      }
      sfx('explosion');
      if (Math.random() < 0.35) {
        const drop = {
          x: nx,
          y: ny,
          type: Math.random() < 0.5 ? 'gold' : 'potion',
          amount: Math.random() < 0.5 ? 5 + Math.floor(Math.random() * 8 * floor) : 1,
          collected: false,
        };
        items.push(drop);
        const color = drop.type === 'gold' ? 0xffdd00 : 0xff4488;
        itemMeshes.set(
          drop,
          createSphere(0.2, color, [drop.x * TILE_SIZE, 0.3, drop.y * TILE_SIZE], 8, {
            material: 'emissive',
            emissive: color,
          })
        );
      }
      checkLevelUp();
    }
    enemyTurn();
    return;
  }

  hero.x = nx;
  hero.y = ny;
  setPosition(heroMesh, nx * TILE_SIZE, 0.7, ny * TILE_SIZE);
  setPosition(heroGlow, nx * TILE_SIZE, 1.5, ny * TILE_SIZE);
  revealAround(nx, ny, 4);

  for (const item of items) {
    if (!item.collected && item.x === nx && item.y === ny) {
      item.collected = true;
      if (item.type === 'gold') {
        hero.gold += item.amount;
        addMessage(`+${item.amount} gold`, 0xffdd00);
      } else {
        hero.potions += item.amount;
        addMessage('+1 Potion', 0xff4488);
      }
      sfx('coin');
      if (itemMeshes.has(item)) {
        destroyMesh(itemMeshes.get(item));
        itemMeshes.delete(item);
      }
    }
  }

  if (map[ny][nx] === TILE.CHEST) {
    const loot = Math.floor(Math.random() * 25 * floor) + 10;
    hero.gold += loot;
    addMessage(`Chest! +${loot} gold`, 0xffaa00);
    sfx('coin');
    map[ny][nx] = TILE.FLOOR;
    if (Math.random() < 0.35) {
      hero.weaponBonus++;
      const weapons = [
        'Iron Sword',
        'Steel Blade',
        'Flame Sword',
        'Shadow Katana',
        'Dragon Fang',
        'Void Cleaver',
      ];
      hero.weapon = weapons[Math.min(hero.weaponBonus - 1, weapons.length - 1)];
      hero.atk += 2;
      addMessage(`Found ${hero.weapon}! ATK+2`, 0xff8844);
      sfx('powerup');
      screenFlash = 0.2;
      screenFlashColor = [255, 200, 50];
    }
  }

  if (map[ny][nx] === TILE.TRAP) {
    const trapDmg = 3 + Math.floor(floor * 1.5);
    hero.hp -= trapDmg;
    addMessage(`TRAP! -${trapDmg} HP`, 0xff2222);
    screenFlash = 0.15;
    screenFlashColor = [255, 50, 50];
    triggerShake(shake, 4);
    sfx('hit');
    map[ny][nx] = TILE.FLOOR;
    if (hero.hp <= 0) {
      gameState = 'dead';
      addMessage('Killed by a trap!', 0xff0000);
      return;
    }
  }

  if (map[ny][nx] === TILE.STAIRS) {
    floor++;
    addMessage(`Descending to Floor ${floor}...`, 0x8888ff);
    hero.hp = Math.min(hero.hp + 8, hero.maxHp);
    sfx('powerup');
    generateDungeon();
    return;
  }

  enemyTurn();
}

function enemyTurn() {
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = hero.x - e.x;
    const dy = hero.y - e.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist <= 1) {
      const dmg = rollDmg(e, hero);
      hero.hp -= dmg;
      screenFlash = 0.1;
      screenFlashColor = [255, 50, 50];
      triggerShake(shake, e.isBoss ? 5 : 2);
      addMessage(`${e.name} hits you for ${dmg}!`, 0xff4444);
      floatingTexts.spawn(`-${dmg}`, hero.x * TILE_SIZE, 2.5, {
        z: hero.y * TILE_SIZE,
        duration: 0.8,
        color: 0xff4444,
      });
      sfx('hit');
      if (hero.hp <= 0) {
        gameState = 'dead';
        addMessage('You have been slain!', 0xff0000);
        sfx('explosion');
      }
    } else if (dist < 10) {
      let mx = 0,
        my = 0;
      if (Math.abs(dx) > Math.abs(dy)) mx = dx > 0 ? 1 : -1;
      else my = dy > 0 ? 1 : -1;
      const enx = e.x + mx,
        eny = e.y + my;
      if (
        enx >= 0 &&
        enx < MAP_W &&
        eny >= 0 &&
        eny < MAP_H &&
        map[eny][enx] !== TILE.WALL &&
        map[eny][enx] !== TILE.TORCH
      ) {
        const blocked = enemies.some(o => o !== e && o.alive && o.x === enx && o.y === eny);
        if (!blocked && !(enx === hero.x && eny === hero.y)) {
          e.x = enx;
          e.y = eny;
          if (enemyMeshes.has(e))
            setPosition(enemyMeshes.get(e), e.x * TILE_SIZE, e.isBoss ? 0.9 : 0.5, e.y * TILE_SIZE);
        }
      }
    }
  }
}

function checkLevelUp() {
  while (hero.xp >= hero.xpNext) {
    hero.xp -= hero.xpNext;
    hero.level++;
    hero.maxHp += 5;
    hero.hp = hero.maxHp;
    hero.atk += 1;
    hero.def += 1;
    hero.xpNext = Math.floor(hero.xpNext * 1.5);
    addMessage(`LEVEL UP! Lv.${hero.level}!`, 0xffff00);
    screenFlash = 0.3;
    screenFlashColor = [255, 255, 100];
    sfx('powerup');
  }
}

function addMessage(text, color) {
  messages.unshift({ text, color, timer: 4 });
  if (messages.length > 8) messages.pop();
}

function usePotion() {
  if (hero.potions > 0 && hero.hp < hero.maxHp) {
    hero.potions--;
    const heal = 10 + hero.level * 3;
    hero.hp = Math.min(hero.hp + heal, hero.maxHp);
    addMessage(`Healed ${heal} HP!`, 0xff88ff);
    screenFlash = 0.1;
    screenFlashColor = [100, 255, 150];
    sfx('powerup');
    enemyTurn();
  }
}

// ── Init ────────────────────────────────────────────────────────────────────
export function init() {
  hero = {
    x: 0,
    y: 0,
    hp: 25,
    maxHp: 25,
    atk: 5,
    def: 2,
    xp: 0,
    xpNext: 15,
    level: 1,
    gold: 0,
    potions: 2,
    weapon: 'Rusty Sword',
    weaponBonus: 0,
    kills: 0,
    totalDmg: 0,
  };
  floor = 1;
  messages = [];
  floatingTexts = createFloatingTextSystem();
  shake = createShake({ decay: 0.85, maxMag: 8 });
  potionCd = createCooldown(0.5);
  enemies = [];
  items = [];
  mapMeshes = [];
  torchLights = [];
  time = 0;
  gameState = 'start';

  enableFXAA();
  generateDungeon();
}

// ── Update ──────────────────────────────────────────────────────────────────
export function update(dt) {
  time += dt;
  updateShake(shake, dt);
  updateCooldown(potionCd, dt);

  if (gameState === 'start') {
    if (keyp('Space') || keyp('Enter') || btnp(13)) {
      gameState = 'playing';
      sfx('confirm');
    }
    updateCamera(dt);
    return;
  }

  if (gameState === 'dead') {
    if (keyp('Space') || keyp('Enter') || btnp(13)) init();
    return;
  }

  moveTimer -= dt;
  if (moveTimer <= 0) {
    let moved = false;
    const held = moveTimer < -0.3;
    if (keyp('ArrowUp') || keyp('KeyW') || (held && (key('ArrowUp') || key('KeyW')))) {
      tryMove(0, -1);
      moved = true;
    } else if (keyp('ArrowDown') || keyp('KeyS') || (held && (key('ArrowDown') || key('KeyS')))) {
      tryMove(0, 1);
      moved = true;
    } else if (keyp('ArrowLeft') || keyp('KeyA') || (held && (key('ArrowLeft') || key('KeyA')))) {
      tryMove(-1, 0);
      moved = true;
    } else if (keyp('ArrowRight') || keyp('KeyD') || (held && (key('ArrowRight') || key('KeyD')))) {
      tryMove(1, 0);
      moved = true;
    }
    if (moved) moveTimer = MOVE_DELAY;
  }

  if ((keyp('KeyP') || keyp('KeyQ')) && useCooldown(potionCd)) usePotion();

  if (keyp('Space')) {
    enemyTurn();
    addMessage('Waiting...', 0x888899);
  }

  if (screenFlash > 0) screenFlash -= dt;

  for (const m of messages) m.timer -= dt;
  messages = messages.filter(m => m.timer > 0);
  floatingTexts.update(dt);

  for (const e of enemies) {
    if (!e.alive) continue;
    const mesh = enemyMeshes.get(e);
    if (mesh) {
      const bob = Math.sin(time * 3 + e.x * 2 + e.y * 3) * 0.12;
      setPosition(mesh, e.x * TILE_SIZE, (e.isBoss ? 0.9 : 0.5) + bob, e.y * TILE_SIZE);
      rotateMesh(mesh, 0, dt * (e.isBoss ? 0.5 : 1.5), 0);
    }
  }

  if (heroMesh) {
    const bob = Math.sin(time * 4) * 0.04;
    setPosition(heroMesh, hero.x * TILE_SIZE, 0.7 + bob, hero.y * TILE_SIZE);
  }

  if (minimap) {
    minimap.player.x = hero.x;
    minimap.player.y = hero.y;
    minimap.entities = enemies
      .filter(e => e.alive && Math.abs(e.x - hero.x) + Math.abs(e.y - hero.y) <= 8)
      .map(e => ({
        x: e.x,
        y: e.y,
        color: e.isBoss ? rgba8(255, 220, 50) : rgba8(255, 60, 60),
        size: e.isBoss ? 3 : 2,
      }));
  }

  updateCamera(dt);
}

function updateCamera(dt) {
  const tx = hero.x * TILE_SIZE;
  const tz = hero.y * TILE_SIZE;
  camCurrent.x += (tx - camCurrent.x) * 0.12;
  camCurrent.y += (tz - camCurrent.y) * 0.12;
  const sx = shake.offsetX || 0;
  const sy = shake.offsetY || 0;
  setCameraPosition(camCurrent.x + 1.5 + sx * 0.05, 14, camCurrent.y + 11 + sy * 0.05);
  setCameraTarget(camCurrent.x + sx * 0.02, 0, camCurrent.y + sy * 0.02);
}

// ── Draw HUD ────────────────────────────────────────────────────────────────
export function draw() {
  const theme = getTheme();

  if (gameState === 'start') {
    rectfill(0, 0, 640, 360, rgba8(0, 0, 0, 200));
    drawGlowText('DUNGEON DELVE', 210, 50, rgba8(255, 200, 100), rgba8(200, 120, 40));
    printCentered('A Roguelike Adventure', 320, 85, rgba8(180, 170, 160));
    printCentered(
      'Descend the dungeon. Slay monsters. Find treasure.',
      320,
      130,
      rgba8(180, 180, 200)
    );
    printCentered('Permadeath! When you die, you start over.', 320, 150, rgba8(255, 100, 100));
    rectfill(160, 180, 320, 70, rgba8(20, 20, 30, 200));
    rect(160, 180, 320, 70, rgba8(100, 100, 150), false);
    printCentered('WASD / Arrows = Move & Attack', 320, 190, rgba8(160, 160, 200));
    printCentered('P / Q = Use Potion', 320, 206, rgba8(160, 160, 200));
    printCentered('SPACE = Wait (skip turn)', 320, 222, rgba8(160, 160, 200));
    printCentered('Walk into enemies to attack!', 320, 238, rgba8(200, 200, 160));
    const pulse = Math.sin(time * 3) * 0.5 + 0.5;
    printCentered(
      'TAP / PRESS A TO DELVE',
      320,
      280,
      rgba8(255, 255, 100, Math.floor(100 + pulse * 155))
    );
    return;
  }

  if (gameState === 'dead') {
    rectfill(0, 0, 640, 360, rgba8(60, 0, 0, 220));
    drawGlowText('YOU HAVE PERISHED', 185, 60, rgba8(255, 50, 50), rgba8(180, 0, 0));
    printCentered(
      `Floor ${floor}  |  Level ${hero.level}  |  ${hero.kills} Kills  |  ${hero.gold} Gold`,
      320,
      110,
      rgba8(200, 200, 200)
    );
    printCentered(`Total Damage Dealt: ${hero.totalDmg}`, 320, 130, rgba8(180, 180, 180));
    const rating =
      hero.kills > 30
        ? 'LEGENDARY'
        : hero.kills > 20
          ? 'HEROIC'
          : hero.kills > 10
            ? 'CHAMPION'
            : hero.kills > 5
              ? 'BRAVE'
              : 'NOVICE';
    drawGlowText(rating, 260, 170, rgba8(255, 215, 0), rgba8(180, 150, 0));
    const pulse = Math.sin(time * 2) * 0.5 + 0.5;
    printCentered(
      'TAP / PRESS A TO TRY AGAIN',
      320,
      240,
      rgba8(200, 150, 150, Math.floor(120 + pulse * 135))
    );
    return;
  }

  // Screen flash
  if (screenFlash > 0) {
    const a = Math.floor(screenFlash * 500);
    rectfill(
      0,
      0,
      640,
      360,
      rgba8(screenFlashColor[0], screenFlashColor[1], screenFlashColor[2], Math.min(a, 200))
    );
  }

  // Stats panel
  rectfill(6, 6, 170, 108, rgba8(10, 10, 18, 220));
  rect(6, 6, 170, 108, rgba8(80, 80, 120, 200), false);
  drawPixelBorder(6, 6, 170, 108, rgba8(90, 90, 130), rgba8(30, 30, 50));
  print(`FLOOR ${floor}  Lv.${hero.level}`, 14, 14, rgba8(255, 200, 100));
  print(
    `${theme.name}`,
    14,
    26,
    rgba8((theme.accent >> 16) & 0xff, (theme.accent >> 8) & 0xff, theme.accent & 0xff, 200)
  );
  print('HP', 14, 40, rgba8(220, 220, 220));
  drawHealthBar(36, 40, 128, 8, hero.hp, hero.maxHp);
  print(`${hero.hp}/${hero.maxHp}`, 80, 40, rgba8(255, 255, 255));
  print('XP', 14, 54, rgba8(220, 220, 220));
  drawProgressBar(
    36,
    54,
    128,
    8,
    hero.xp / hero.xpNext,
    rgba8(100, 100, 255),
    rgba8(30, 30, 50),
    rgba8(80, 80, 150)
  );
  print(`ATK:${hero.atk}  DEF:${hero.def}`, 14, 68, rgba8(180, 180, 210));
  print(`${hero.weapon}`, 14, 80, rgba8(255, 180, 100));
  print(`Gold:${hero.gold}  Pot:${hero.potions}`, 14, 94, rgba8(255, 220, 80));

  // Messages
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const alpha = Math.min(255, Math.floor(m.timer * 85));
    const r = (m.color >> 16) & 0xff,
      g = (m.color >> 8) & 0xff,
      b = m.color & 0xff;
    rectfill(188, 318 - i * 14, m.text.length * 8 + 8, 13, rgba8(0, 0, 0, Math.floor(alpha * 0.6)));
    print(m.text, 192, 320 - i * 14, rgba8(r, g, b, alpha));
  }

  // Minimap
  if (minimap) drawMinimap(minimap, time);

  // Enemy HP bars
  for (const e of enemies) {
    if (!e.alive) continue;
    const dist = Math.abs(e.x - hero.x) + Math.abs(e.y - hero.y);
    if (dist > 6) continue;
    const sx = 320 + (e.x * TILE_SIZE - hero.x * TILE_SIZE) * 8;
    const sy = 150 - (e.y * TILE_SIZE - hero.y * TILE_SIZE) * 4;
    if (sx < 20 || sx > 620 || sy < 20 || sy > 340) continue;
    const barW = e.isBoss ? 50 : 30;
    const hpPct = e.hp / e.maxHp;
    rectfill(sx - barW / 2, sy - 14, barW, 4, rgba8(40, 40, 40, 180));
    const hpCol =
      hpPct > 0.5 ? rgba8(50, 200, 50) : hpPct > 0.25 ? rgba8(220, 200, 50) : rgba8(220, 50, 50);
    rectfill(sx - barW / 2, sy - 14, Math.floor(barW * hpPct), 4, hpCol);
    print(e.name, sx - e.name.length * 4, sy - 22, rgba8(255, 255, 255, 180));
    if (e.isBoss) print('BOSS', sx - 16, sy - 30, rgba8(255, 220, 50));
  }

  drawFloatingTexts3D(floatingTexts, (x, y, z) => [
    Math.floor(320 + (x - hero.x * TILE_SIZE) * 8),
    Math.floor(180 - y * 6 - (z - hero.y * TILE_SIZE) * 4),
  ]);

  rectfill(0, 348, 400, 12, rgba8(0, 0, 0, 120));
  print(
    'WASD=Move  P=Potion  SPACE=Wait  Walk into enemies to attack!',
    8,
    348,
    rgba8(140, 140, 170, 200)
  );
}
