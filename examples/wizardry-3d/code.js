// ⚔️ WIZARDRY NOVA 64 — First-Person Grid-Based Dungeon RPG ⚔️
// Inspired by Wizardry: Proving Grounds of the Mad Overlord

const W = 640,
  H = 360;
const TILE = 3; // world units per grid cell
const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]; // N E S W
const DIR_NAMES = ['North', 'East', 'South', 'West'];

// Dungeon tile types
const T = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,
  STAIRS_DOWN: 3,
  STAIRS_UP: 4,
  CHEST: 5,
  FOUNTAIN: 6,
  TRAP: 7,
  BOSS: 8,
};

// Character classes
const CLASSES = ['Fighter', 'Mage', 'Priest', 'Thief'];
const CLASS_COLORS = { Fighter: 0xff4444, Mage: 0x4488ff, Priest: 0xffdd44, Thief: 0x44ff88 };
const CLASS_ICONS = { Fighter: '⚔', Mage: '✦', Priest: '✚', Thief: '◆' };

// Monster templates per floor tier — with shape hints for 3D variety
const MONSTERS = [
  // Floor 1-2
  [
    { name: 'Kobold', hp: 8, atk: 3, def: 1, xp: 5, gold: 3, color: 0x886644, shape: 'small' },
    { name: 'Giant Rat', hp: 6, atk: 2, def: 0, xp: 3, gold: 1, color: 0x666655, shape: 'beast' },
    { name: 'Skeleton', hp: 12, atk: 4, def: 2, xp: 8, gold: 5, color: 0xccccaa, shape: 'undead' },
  ],
  // Floor 3-4
  [
    { name: 'Orc', hp: 18, atk: 6, def: 3, xp: 15, gold: 10, color: 0x448833, shape: 'brute' },
    { name: 'Zombie', hp: 22, atk: 5, def: 2, xp: 12, gold: 4, color: 0x556644, shape: 'undead' },
    {
      name: 'Dark Elf',
      hp: 15,
      atk: 8,
      def: 4,
      xp: 20,
      gold: 15,
      color: 0x443366,
      shape: 'caster',
    },
  ],
  // Floor 5+
  [
    { name: 'Troll', hp: 35, atk: 10, def: 5, xp: 30, gold: 20, color: 0x336633, shape: 'brute' },
    { name: 'Wraith', hp: 25, atk: 12, def: 3, xp: 35, gold: 25, color: 0x333355, shape: 'ghost' },
    { name: 'Dragon', hp: 60, atk: 15, def: 8, xp: 80, gold: 50, color: 0xcc4422, shape: 'dragon' },
  ],
];

// Boss monsters (floor 3 and 5)
const BOSSES = {
  3: {
    name: 'Lich King',
    hp: 80,
    atk: 14,
    def: 6,
    xp: 100,
    gold: 60,
    color: 0x6622aa,
    shape: 'caster',
  },
  5: {
    name: 'Ancient Dragon',
    hp: 150,
    atk: 20,
    def: 10,
    xp: 200,
    gold: 100,
    color: 0xff3300,
    shape: 'dragon',
  },
};

// Equipment that can drop from chests
const EQUIPMENT = [
  // Weapons
  { name: 'Iron Sword', slot: 'weapon', atk: 2, def: 0, class: 'Fighter', tier: 1 },
  { name: 'Battle Axe', slot: 'weapon', atk: 3, def: 0, class: 'Fighter', tier: 2 },
  { name: 'Holy Mace', slot: 'weapon', atk: 2, def: 1, class: 'Priest', tier: 1 },
  { name: 'Arcane Staff', slot: 'weapon', atk: 1, def: 0, class: 'Mage', tier: 1, mpBonus: 3 },
  { name: 'Shadow Dagger', slot: 'weapon', atk: 3, def: 0, class: 'Thief', tier: 1 },
  { name: 'Flame Blade', slot: 'weapon', atk: 5, def: 0, class: 'Fighter', tier: 3 },
  { name: 'Staff of Power', slot: 'weapon', atk: 2, def: 0, class: 'Mage', tier: 3, mpBonus: 6 },
  { name: 'Vorpal Dagger', slot: 'weapon', atk: 6, def: 0, class: 'Thief', tier: 3 },
  // Armor
  { name: 'Chain Mail', slot: 'armor', atk: 0, def: 2, class: 'Fighter', tier: 1 },
  { name: 'Leather Armor', slot: 'armor', atk: 0, def: 1, class: 'Thief', tier: 1 },
  { name: 'Mage Robe', slot: 'armor', atk: 0, def: 1, class: 'Mage', tier: 1, mpBonus: 2 },
  { name: 'Plate Armor', slot: 'armor', atk: 0, def: 4, class: 'Fighter', tier: 2 },
  {
    name: 'Blessed Vestments',
    slot: 'armor',
    atk: 0,
    def: 2,
    class: 'Priest',
    tier: 2,
    mpBonus: 3,
  },
  { name: 'Dragon Scale', slot: 'armor', atk: 1, def: 6, class: 'Fighter', tier: 3 },
  { name: 'Shadow Cloak', slot: 'armor', atk: 1, def: 3, class: 'Thief', tier: 3 },
];

// Spells
const SPELLS = {
  // Mage spells
  FIRE: { name: 'Fireball', cost: 3, dmg: 12, type: 'attack', class: 'Mage', desc: 'AoE fire' },
  ICE: { name: 'Ice Bolt', cost: 2, dmg: 8, type: 'attack', class: 'Mage', desc: 'Single target' },
  SHIELD: {
    name: 'Mana Shield',
    cost: 4,
    amount: 4,
    type: 'buff_def',
    class: 'Mage',
    desc: '+DEF party',
  },
  // Priest spells
  HEAL: { name: 'Heal', cost: 2, amount: 15, type: 'heal', class: 'Priest', desc: 'Heal one ally' },
  BLESS: { name: 'Bless', cost: 3, amount: 3, type: 'buff', class: 'Priest', desc: '+ATK party' },
  TURN_UNDEAD: {
    name: 'Turn Undead',
    cost: 2,
    dmg: 20,
    type: 'undead',
    class: 'Priest',
    desc: 'Smite undead',
  },
  REVIVE: {
    name: 'Revive',
    cost: 6,
    amount: 10,
    type: 'revive',
    class: 'Priest',
    desc: 'Revive ally',
  },
};

// Floor atmosphere themes
const FLOOR_THEMES = [
  {
    name: 'Musty Cellars',
    wallColor: 0x554433,
    floorColor: 0x332211,
    ceilColor: 0x221100,
    fogColor: 0x0a0805,
    skyTop: 0x110808,
    skyBot: 0x050303,
    ambColor: 0x332211,
    ambInt: 0.3,
  },
  {
    name: 'Flooded Crypts',
    wallColor: 0x334455,
    floorColor: 0x1a2233,
    ceilColor: 0x0a1122,
    fogColor: 0x050a10,
    skyTop: 0x081018,
    skyBot: 0x030508,
    ambColor: 0x223344,
    ambInt: 0.25,
  },
  {
    name: 'Fungal Warrens',
    wallColor: 0x335533,
    floorColor: 0x1a331a,
    ceilColor: 0x0a220a,
    fogColor: 0x050a05,
    skyTop: 0x0a180a,
    skyBot: 0x030803,
    ambColor: 0x224422,
    ambInt: 0.3,
  },
  {
    name: 'Obsidian Vaults',
    wallColor: 0x222233,
    floorColor: 0x111122,
    ceilColor: 0x0a0a18,
    fogColor: 0x050510,
    skyTop: 0x0a0a1a,
    skyBot: 0x030308,
    ambColor: 0x1a1a33,
    ambInt: 0.2,
  },
  {
    name: "The Dragon's Lair",
    wallColor: 0x553322,
    floorColor: 0x331a0a,
    ceilColor: 0x220a00,
    fogColor: 0x100500,
    skyTop: 0x1a0800,
    skyBot: 0x080300,
    ambColor: 0x442211,
    ambInt: 0.35,
  },
];

// State
let gameState; // 'title', 'explore', 'combat', 'inventory', 'gameover', 'victory'
let floor, px, py, facing; // player grid pos + direction (0-3)
let dungeon; // 2D array
let dungeonW, dungeonH;
let torchLights;
let party; // array of party members
let enemies; // current combat encounter
let combatLog;
let combatTurn; // 0..party.length-1 or 'enemy'
let combatAction; // current action selection state
let selectedTarget;
let animTimer; // for transitions
let enemyDelay; // separate timer for enemy turn delay
let autoPlay; // auto-combat mode
let stepAnim; // walking bob
let targetYaw, currentYaw;
let encounterChance;
let totalGold;
let dungeonsCleared;
let floatingTexts;
let shake;
let inputCD;
let moveCD;
let floorMessage;
let floorMessageTimer;

// Visual state
let screenFlash; // {r, g, b, alpha, decay}
let animatedMeshes; // meshes that bob/rotate
let particleSystems; // track active particle system IDs
let explored; // Set of "x,y" strings for fog-of-war minimap
let bossDefeated; // Set of floor numbers where boss was killed

// 3D mesh tracking
let currentLevelMeshes = [];
let monsterMeshes = [];

// ═══════════════════════════════════════════════════════════════════════
// DUNGEON GENERATION
// ═══════════════════════════════════════════════════════════════════════

function generateDungeon(w, h) {
  dungeonW = w;
  dungeonH = h;
  const map = Array.from({ length: h }, () => new Array(w).fill(T.WALL));

  // Carve rooms
  const rooms = [];
  const attempts = 60;
  for (let a = 0; a < attempts; a++) {
    const rw = 3 + Math.floor(Math.random() * 4);
    const rh = 3 + Math.floor(Math.random() * 4);
    const rx = 1 + Math.floor(Math.random() * (w - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (h - rh - 2));

    let overlap = false;
    for (const r of rooms) {
      if (rx <= r.x + r.w + 1 && rx + rw >= r.x - 1 && ry <= r.y + r.h + 1 && ry + rh >= r.y - 1) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) map[y][x] = T.FLOOR;
    rooms.push({ x: rx, y: ry, w: rw, h: rh });
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1],
      b = rooms[i];
    const ax = a.x + Math.floor(a.w / 2),
      ay = a.y + Math.floor(a.h / 2);
    const bx = b.x + Math.floor(b.w / 2),
      by = b.y + Math.floor(b.h / 2);
    let cx = ax,
      cy = ay;
    while (cx !== bx) {
      if (cx >= 0 && cx < w && cy >= 0 && cy < h) map[cy][cx] = T.FLOOR;
      cx += cx < bx ? 1 : -1;
    }
    while (cy !== by) {
      if (cx >= 0 && cx < w && cy >= 0 && cy < h) map[cy][cx] = T.FLOOR;
      cy += cy < by ? 1 : -1;
    }
  }

  // Place doors between corridors and rooms
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (map[y][x] !== T.FLOOR) continue;
      // Narrow corridor opening into room = door candidate
      const horiz = map[y][x - 1] === T.WALL && map[y][x + 1] === T.WALL;
      const vert = map[y - 1][x] === T.WALL && map[y + 1][x] === T.WALL;
      if ((horiz || vert) && Math.random() < 0.15) {
        map[y][x] = T.DOOR;
      }
    }
  }

  // Place stairs down in last room
  if (rooms.length > 1) {
    const last = rooms[rooms.length - 1];
    const sx = last.x + Math.floor(last.w / 2);
    const sy = last.y + Math.floor(last.h / 2);
    map[sy][sx] = T.STAIRS_DOWN;
  }

  // Place stairs up in first room (return)
  if (floor > 1 && rooms.length > 0) {
    const first = rooms[0];
    map[first.y + 1][first.x + 1] = T.STAIRS_UP;
  }

  // Scatter chests, fountains, and traps
  for (let i = 0; i < 3 + floor; i++) {
    const r = rooms[Math.floor(Math.random() * rooms.length)];
    const cx = r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
    const cy = r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));
    if (map[cy][cx] === T.FLOOR) {
      const roll = Math.random();
      if (roll < 0.5) map[cy][cx] = T.CHEST;
      else if (roll < 0.7) map[cy][cx] = T.FOUNTAIN;
      else map[cy][cx] = T.TRAP;
    }
  }

  // Place boss room on floors 3 and 5 (in a large room near stairs)
  if ((floor === 3 || floor === 5) && rooms.length > 2 && !bossDefeated.has(floor)) {
    const bossRoom = rooms[rooms.length - 2]; // room before last
    const bx = bossRoom.x + Math.floor(bossRoom.w / 2);
    const by = bossRoom.y + Math.floor(bossRoom.h / 2);
    if (map[by][bx] === T.FLOOR) map[by][bx] = T.BOSS;
  }

  // Player starts in first room center
  if (rooms.length > 0) {
    const first = rooms[0];
    px = first.x + Math.floor(first.w / 2);
    py = first.y + Math.floor(first.h / 2);
    map[py][px] = T.FLOOR; // ensure start is clear
  }

  return map;
}

// ═══════════════════════════════════════════════════════════════════════
// 3D LEVEL BUILDING
// ═══════════════════════════════════════════════════════════════════════

function clearLevel() {
  for (const id of currentLevelMeshes) destroyMesh(id);
  currentLevelMeshes = [];
  if (torchLights) {
    for (const id of torchLights) removeLight(id);
  }
  torchLights = [];
  // Clean up particle systems
  if (particleSystems) {
    for (const id of particleSystems) removeParticleSystem(id);
  }
  particleSystems = [];
  animatedMeshes = [];
  clearMonsterMeshes();
}

function clearMonsterMeshes() {
  for (const id of monsterMeshes) destroyMesh(id);
  monsterMeshes = [];
}

function buildLevel() {
  clearLevel();

  const theme = FLOOR_THEMES[Math.min(floor - 1, FLOOR_THEMES.length - 1)];

  // Update atmosphere per floor
  setAmbientLight(theme.ambColor, theme.ambInt);
  setFog(theme.fogColor, 2, 20 - floor);
  createGradientSkybox(theme.skyTop, theme.skyBot);

  for (let y = 0; y < dungeonH; y++) {
    for (let x = 0; x < dungeonW; x++) {
      const tile = dungeon[y][x];
      const wx = x * TILE,
        wz = y * TILE;

      if (tile === T.WALL) {
        // Only create visible walls (adjacent to floor)
        let visible = false;
        for (const [dx, dz] of DIRS) {
          const nx = x + dx,
            nz = y + dz;
          if (nx >= 0 && nx < dungeonW && nz >= 0 && nz < dungeonH && dungeon[nz][nx] !== T.WALL) {
            visible = true;
            break;
          }
        }
        if (visible) {
          const m = createCube(TILE, theme.wallColor, [wx, TILE / 2, wz], { roughness: 0.9 });
          currentLevelMeshes.push(m);
        }
      } else {
        // Floor
        const f = createPlane(TILE, TILE, theme.floorColor, [wx, 0.01, wz]);
        rotateMesh(f, -Math.PI / 2, 0, 0);
        currentLevelMeshes.push(f);

        // Ceiling
        const c = createPlane(TILE, TILE, theme.ceilColor, [wx, TILE, wz]);
        rotateMesh(c, Math.PI / 2, 0, 0);
        currentLevelMeshes.push(c);

        // Special tiles
        if (tile === T.DOOR) {
          // Wooden door frame
          const d = createCube(TILE * 0.1, 0x886622, [wx, TILE / 2, wz], { roughness: 0.7 });
          setScale(d, 1, 1, 0.3);
          currentLevelMeshes.push(d);
          // Door handle
          const handle = createSphere(0.08, 0xccaa44, [wx + 0.3, TILE * 0.45, wz], 4, {
            material: 'emissive',
            emissive: 0xccaa44,
            emissiveIntensity: 0.3,
          });
          currentLevelMeshes.push(handle);
        } else if (tile === T.STAIRS_DOWN) {
          const s = createCone(0.5, 1, 0x44aaff, [wx, 0.5, wz], {
            material: 'emissive',
            emissive: 0x44aaff,
            emissiveIntensity: 0.8,
          });
          currentLevelMeshes.push(s);
          animatedMeshes.push({ id: s, type: 'bob', baseY: 0.5, speed: 2, range: 0.2 });
          // Stair glow particles
          const ps = createParticleSystem(20, {
            size: 0.08,
            emissive: true,
            gravity: 0.2,
            emitRate: 3,
            minLife: 1,
            maxLife: 2,
            minSpeed: 0.2,
            maxSpeed: 0.5,
            startColor: 0x44aaff,
            endColor: 0x0044aa,
            spread: 0.8,
          });
          setParticleEmitter(ps, { position: [wx, 0.5, wz] });
          particleSystems.push(ps);
          const l = createPointLight(0x44aaff, 1.5, 8, wx, 1.5, wz);
          torchLights.push(l);
        } else if (tile === T.STAIRS_UP) {
          const s = createCone(0.5, 1, 0xffaa44, [wx, 0.5, wz], {
            material: 'emissive',
            emissive: 0xffaa44,
            emissiveIntensity: 0.8,
          });
          currentLevelMeshes.push(s);
          animatedMeshes.push({ id: s, type: 'bob', baseY: 0.5, speed: 2, range: 0.2 });
        } else if (tile === T.CHEST) {
          // Chest body
          const ch = createCube(0.6, 0xddaa33, [wx, 0.35, wz], { roughness: 0.4, metallic: true });
          setScale(ch, 1, 0.7, 0.7);
          currentLevelMeshes.push(ch);
          // Glowing lock
          const lock = createSphere(0.06, 0xffee66, [wx, 0.5, wz - 0.22], 4, {
            material: 'emissive',
            emissive: 0xffee66,
            emissiveIntensity: 0.6,
          });
          currentLevelMeshes.push(lock);
          animatedMeshes.push({ id: lock, type: 'pulse', baseScale: 1, speed: 3, range: 0.3 });
        } else if (tile === T.FOUNTAIN) {
          const fb = createCylinder(0.6, 0.6, 0x667788, 8, [wx, 0.2, wz]);
          currentLevelMeshes.push(fb);
          const fw = createSphere(0.3, 0x3388ff, [wx, 0.5, wz], 6, {
            material: 'emissive',
            emissive: 0x3388ff,
            emissiveIntensity: 0.6,
          });
          currentLevelMeshes.push(fw);
          animatedMeshes.push({ id: fw, type: 'bob', baseY: 0.5, speed: 1.5, range: 0.15 });
          // Water particles
          const ps = createParticleSystem(15, {
            size: 0.05,
            emissive: true,
            gravity: -0.3,
            emitRate: 4,
            minLife: 0.8,
            maxLife: 1.5,
            minSpeed: 0.1,
            maxSpeed: 0.3,
            startColor: 0x3388ff,
            endColor: 0x1144aa,
            spread: 0.4,
          });
          setParticleEmitter(ps, { position: [wx, 0.6, wz] });
          particleSystems.push(ps);
          const l = createPointLight(0x3388ff, 1, 6, wx, 1, wz);
          torchLights.push(l);
        } else if (tile === T.TRAP) {
          // Trap - subtle floor glyph
          const trap = createPlane(1.2, 1.2, 0x662222, [wx, 0.02, wz]);
          rotateMesh(trap, -Math.PI / 2, 0, 0);
          currentLevelMeshes.push(trap);
          // Warning rune
          const rune = createTorus(0.3, 0.04, 0x881111, 6, [wx, 0.03, wz]);
          rotateMesh(rune, Math.PI / 2, 0, 0);
          currentLevelMeshes.push(rune);
          animatedMeshes.push({ id: rune, type: 'spin', speed: 1 });
        } else if (tile === T.BOSS) {
          // Boss marker — ominous pillar with glow
          const pillar = createCylinder(0.4, 2.5, 0x440022, 6, [wx, 1.25, wz]);
          currentLevelMeshes.push(pillar);
          const orb = createSphere(0.3, 0xff0044, [wx, 2.6, wz], 8, {
            material: 'emissive',
            emissive: 0xff0044,
            emissiveIntensity: 1.2,
          });
          currentLevelMeshes.push(orb);
          animatedMeshes.push({ id: orb, type: 'pulse', baseScale: 1, speed: 2, range: 0.4 });
          const l = createPointLight(0xff0044, 2, 10, wx, 2, wz);
          torchLights.push(l);
        }

        // Scatter torches with particle fire
        if (tile === T.FLOOR && Math.random() < 0.04) {
          const l = createPointLight(0xff8833, 1.2, 10, wx, 2.2, wz);
          torchLights.push(l);
          const torch = createCone(0.1, 0.3, 0xff6600, [wx, 2.5, wz], {
            material: 'emissive',
            emissive: 0xff6600,
            emissiveIntensity: 1.0,
          });
          currentLevelMeshes.push(torch);
          // Fire particles
          const ps = createParticleSystem(12, {
            size: 0.06,
            emissive: true,
            gravity: -0.5,
            emitRate: 6,
            minLife: 0.3,
            maxLife: 0.7,
            minSpeed: 0.3,
            maxSpeed: 0.6,
            startColor: 0xff6600,
            endColor: 0xff2200,
            spread: 0.2,
          });
          setParticleEmitter(ps, { position: [wx, 2.6, wz] });
          particleSystems.push(ps);
          // Track light for flickering
          torchLights.push({ lightId: l, baseIntensity: 1.2, wx, wz });
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PARTY CREATION
// ═══════════════════════════════════════════════════════════════════════

function createParty() {
  return [
    makeChar('Aldric', 'Fighter', { hp: 30, atk: 8, def: 6, spd: 4 }),
    makeChar('Elara', 'Mage', { hp: 18, atk: 3, def: 2, spd: 5, mp: 12 }),
    makeChar('Torvin', 'Priest', { hp: 22, atk: 4, def: 4, spd: 3, mp: 10 }),
    makeChar('Shade', 'Thief', { hp: 20, atk: 6, def: 3, spd: 7 }),
  ];
}

function makeChar(name, cls, stats) {
  return {
    name,
    class: cls,
    hp: stats.hp,
    maxHp: stats.hp,
    mp: stats.mp ?? 0,
    maxMp: stats.mp ?? 0,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    level: 1,
    xp: 0,
    xpNext: 20,
    alive: true,
    buffAtk: 0,
    buffDef: 0,
    buffTimer: 0,
    weapon: null,
    armor: null,
  };
}

function getEffectiveAtk(c) {
  let atk = c.atk + c.buffAtk;
  if (c.weapon) atk += c.weapon.atk;
  return atk;
}

function getEffectiveDef(c) {
  let def = c.def + c.buffDef;
  if (c.armor) def += c.armor.def;
  return def;
}

function equipItem(member, item) {
  const slot = item.slot;
  const old = member[slot];
  member[slot] = item;
  // Apply MP bonuses
  if (item.mpBonus) {
    member.maxMp += item.mpBonus;
    member.mp = Math.min(member.mp + item.mpBonus, member.maxMp);
  }
  if (old && old.mpBonus) {
    member.maxMp -= old.mpBonus;
    member.mp = Math.min(member.mp, member.maxMp);
  }
  return old;
}

function levelUp(c) {
  c.level++;
  c.xpNext = Math.floor(c.xpNext * 1.5);
  const hpGain = c.class === 'Fighter' ? 8 : c.class === 'Priest' ? 5 : c.class === 'Mage' ? 4 : 6;
  c.maxHp += hpGain;
  c.hp = Math.min(c.hp + hpGain, c.maxHp);
  c.atk += c.class === 'Fighter' ? 3 : c.class === 'Thief' ? 2 : 1;
  c.def += c.class === 'Fighter' ? 2 : 1;
  if (c.maxMp > 0) {
    c.maxMp += 3;
    c.mp = Math.min(c.mp + 3, c.maxMp);
  }
  return hpGain;
}

// ═══════════════════════════════════════════════════════════════════════
// COMBAT SYSTEM
// ═══════════════════════════════════════════════════════════════════════

function startCombat(isBoss) {
  let count, pool;
  if (isBoss && BOSSES[floor]) {
    // Boss encounter
    const b = BOSSES[floor];
    enemies = [
      {
        ...b,
        maxHp: b.hp,
        id: 0,
        isBoss: true,
      },
    ];
    count = 1;
  } else {
    const tier = Math.min(Math.floor((floor - 1) / 2), MONSTERS.length - 1);
    pool = MONSTERS[tier];
    count = 1 + Math.floor(Math.random() * Math.min(3, floor));
    enemies = [];
    for (let i = 0; i < count; i++) {
      const template = pool[Math.floor(Math.random() * pool.length)];
      const scale = 0.8 + Math.random() * 0.4;
      enemies.push({
        ...template,
        hp: Math.floor(template.hp * scale * (1 + floor * 0.1)),
        maxHp: Math.floor(template.hp * scale * (1 + floor * 0.1)),
        atk: Math.floor(template.atk * (1 + floor * 0.08)),
        def: template.def,
        id: i,
      });
    }
  }

  // Create varied monster meshes in front of player
  clearMonsterMeshes();
  const [dx, dz] = DIRS[facing];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const offset = (i - (enemies.length - 1) / 2) * 1.5;
    const perpX = -dz,
      perpZ = dx; // perpendicular
    const mx = px * TILE + dx * 4 + perpX * offset;
    const mz = py * TILE + dz * 4 + perpZ * offset;
    const meshIds = createMonsterMesh(e, mx, mz, dx, dz);
    monsterMeshes.push(...meshIds);
    e.meshBody = meshIds[0];
    e.allMeshes = meshIds;
  }

  combatLog = [
    enemies[0].isBoss
      ? `BOSS: ${enemies[0].name} blocks your path!`
      : `${enemies.length} ${enemies.length > 1 ? 'monsters appear' : enemies[0].name + ' appears'}!`,
  ];
  combatTurn = 0;
  combatAction = 'choose';
  selectedTarget = 0;
  gameState = 'combat';

  if (enemies[0].isBoss) {
    triggerShake(shake, 0.8);
    triggerScreenFlash(255, 0, 50, 200);
  }
}

// Create varied 3D monster based on shape type
function createMonsterMesh(e, mx, mz, dx, dz) {
  const ids = [];
  const s = e.isBoss ? 1.5 : 1.0;
  const shape = e.shape || 'small';

  if (shape === 'beast') {
    // Low, wide body with ears
    const body = createCube(0.8 * s, e.color, [mx, 0.5 * s, mz], { roughness: 0.8 });
    setScale(body, 1.3, 0.7, 1);
    const ear1 = createCone(0.15 * s, 0.4 * s, e.color, [mx - 0.3 * s, 0.9 * s, mz], {
      roughness: 0.8,
    });
    const ear2 = createCone(0.15 * s, 0.4 * s, e.color, [mx + 0.3 * s, 0.9 * s, mz], {
      roughness: 0.8,
    });
    const eye1 = createSphere(
      0.08 * s,
      0xff0000,
      [mx - 0.2 * s, 0.6 * s, mz - dz * 0.4 - dx * 0.4],
      4,
      {
        material: 'emissive',
        emissive: 0xff0000,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.08 * s,
      0xff0000,
      [mx + 0.2 * s, 0.6 * s, mz - dz * 0.4 - dx * 0.4],
      4,
      {
        material: 'emissive',
        emissive: 0xff0000,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, ear1, ear2, eye1, eye2);
  } else if (shape === 'undead') {
    // Tall thin body with skull-like head
    const body = createCube(0.6 * s, e.color, [mx, 0.8 * s, mz], { roughness: 0.9 });
    setScale(body, 0.7, 1.3, 0.5);
    const head = createSphere(0.35 * s, e.color, [mx, 1.6 * s, mz], 6, { roughness: 0.9 });
    const eye1 = createSphere(
      0.1 * s,
      0x44ff00,
      [mx - 0.12 * s, 1.7 * s, mz - dz * 0.3 - dx * 0.3],
      4,
      {
        material: 'emissive',
        emissive: 0x44ff00,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.1 * s,
      0x44ff00,
      [mx + 0.12 * s, 1.7 * s, mz - dz * 0.3 - dx * 0.3],
      4,
      {
        material: 'emissive',
        emissive: 0x44ff00,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, head, eye1, eye2);
  } else if (shape === 'brute') {
    // Large bulky body with thick arms
    const body = createCube(1.0 * s, e.color, [mx, 0.9 * s, mz], { roughness: 0.7 });
    setScale(body, 1.2, 1.4, 0.9);
    const head = createSphere(0.4 * s, e.color, [mx, 1.8 * s, mz], 6);
    const arm1 = createCylinder(0.2 * s, 1.0 * s, e.color, 6, [mx - 0.8 * s, 1.0 * s, mz]);
    const arm2 = createCylinder(0.2 * s, 1.0 * s, e.color, 6, [mx + 0.8 * s, 1.0 * s, mz]);
    const eye1 = createSphere(
      0.12 * s,
      0xff2200,
      [mx - 0.15 * s, 1.9 * s, mz - dz * 0.35 - dx * 0.35],
      4,
      {
        material: 'emissive',
        emissive: 0xff2200,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.12 * s,
      0xff2200,
      [mx + 0.15 * s, 1.9 * s, mz - dz * 0.35 - dx * 0.35],
      4,
      {
        material: 'emissive',
        emissive: 0xff2200,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, head, arm1, arm2, eye1, eye2);
  } else if (shape === 'ghost') {
    // Translucent floating form
    const body = createSphere(0.7 * s, e.color, [mx, 1.2 * s, mz], 8, {
      material: 'emissive',
      emissive: e.color,
      emissiveIntensity: 0.4,
    });
    setMeshOpacity(body, 0.6);
    const tail = createCone(0.5 * s, 1.2 * s, e.color, [mx, 0.3 * s, mz]);
    setMeshOpacity(tail, 0.4);
    const eye1 = createSphere(
      0.15 * s,
      0xaabbff,
      [mx - 0.2 * s, 1.4 * s, mz - dz * 0.4 - dx * 0.4],
      4,
      {
        material: 'emissive',
        emissive: 0xaabbff,
        emissiveIntensity: 1.5,
      }
    );
    const eye2 = createSphere(
      0.15 * s,
      0xaabbff,
      [mx + 0.2 * s, 1.4 * s, mz - dz * 0.4 - dx * 0.4],
      4,
      {
        material: 'emissive',
        emissive: 0xaabbff,
        emissiveIntensity: 1.5,
      }
    );
    ids.push(body, tail, eye1, eye2);
    animatedMeshes.push({ id: body, type: 'bob', baseY: 1.2 * s, speed: 1.5, range: 0.3 });
  } else if (shape === 'caster') {
    // Robed figure with glowing staff
    const body = createCone(0.5 * s, 1.8 * s, e.color, [mx, 0.9 * s, mz], { roughness: 0.8 });
    const head = createSphere(0.3 * s, e.color, [mx, 2.0 * s, mz], 6);
    const staff = createCylinder(0.05 * s, 2.2 * s, 0x886633, 4, [mx + 0.5 * s, 1.1 * s, mz]);
    const orb = createSphere(0.15 * s, 0xff44ff, [mx + 0.5 * s, 2.3 * s, mz], 6, {
      material: 'emissive',
      emissive: 0xff44ff,
      emissiveIntensity: 1.2,
    });
    const eye1 = createSphere(
      0.08 * s,
      0xff00ff,
      [mx - 0.1 * s, 2.1 * s, mz - dz * 0.25 - dx * 0.25],
      4,
      {
        material: 'emissive',
        emissive: 0xff00ff,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.08 * s,
      0xff00ff,
      [mx + 0.1 * s, 2.1 * s, mz - dz * 0.25 - dx * 0.25],
      4,
      {
        material: 'emissive',
        emissive: 0xff00ff,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, head, staff, orb, eye1, eye2);
    animatedMeshes.push({ id: orb, type: 'pulse', baseScale: 1, speed: 2, range: 0.3 });
  } else if (shape === 'dragon') {
    // Multi-part dragon: body, neck, head, wings, tail
    const body = createCube(1.2 * s, e.color, [mx, 1.0 * s, mz], { roughness: 0.6 });
    setScale(body, 1.4, 0.8, 1.8);
    const neck = createCylinder(0.25 * s, 0.8 * s, e.color, 6, [
      mx,
      1.6 * s,
      mz - dz * 0.6 - dx * 0.6,
    ]);
    rotateMesh(neck, 0.4, 0, 0);
    const head = createCube(0.5 * s, e.color, [mx, 2.0 * s, mz - dz * 1.0 - dx * 1.0]);
    setScale(head, 1, 0.6, 1.5);
    // Wings
    const wing1 = createPlane(1.5 * s, 1.0 * s, e.color, [mx - 1.0 * s, 1.5 * s, mz]);
    rotateMesh(wing1, 0, 0, -0.3);
    const wing2 = createPlane(1.5 * s, 1.0 * s, e.color, [mx + 1.0 * s, 1.5 * s, mz]);
    rotateMesh(wing2, 0, 0, 0.3);
    // Eyes
    const eye1 = createSphere(
      0.12 * s,
      0xffaa00,
      [mx - 0.15 * s, 2.15 * s, mz - dz * 1.3 - dx * 1.3],
      4,
      {
        material: 'emissive',
        emissive: 0xffaa00,
        emissiveIntensity: 1.5,
      }
    );
    const eye2 = createSphere(
      0.12 * s,
      0xffaa00,
      [mx + 0.15 * s, 2.15 * s, mz - dz * 1.3 - dx * 1.3],
      4,
      {
        material: 'emissive',
        emissive: 0xffaa00,
        emissiveIntensity: 1.5,
      }
    );
    ids.push(body, neck, head, wing1, wing2, eye1, eye2);
  } else {
    // Default: small humanoid (kobold, etc.)
    const body = createCube(0.8 * s, e.color, [mx, 0.7 * s, mz], { roughness: 0.8 });
    setScale(body, 0.8, 1.0, 0.6);
    const head = createSphere(0.25 * s, e.color, [mx, 1.3 * s, mz], 6);
    const eye1 = createSphere(
      0.1 * s,
      0xff0000,
      [mx - 0.1 * s, 1.4 * s, mz - dz * 0.2 - dx * 0.2],
      4,
      {
        material: 'emissive',
        emissive: 0xff0000,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.1 * s,
      0xff0000,
      [mx + 0.1 * s, 1.4 * s, mz - dz * 0.2 - dx * 0.2],
      4,
      {
        material: 'emissive',
        emissive: 0xff0000,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, head, eye1, eye2);
  }

  return ids;
}

function doAttack(attacker, defender) {
  const variance = 0.7 + Math.random() * 0.6;
  const atkVal = attacker.weapon
    ? getEffectiveAtk(attacker)
    : attacker.atk + (attacker.buffAtk || 0);
  const defVal = defender.armor
    ? getEffectiveDef(defender)
    : defender.def + (defender.buffDef || 0);
  const raw = Math.floor(atkVal * variance);
  const dmg = Math.max(1, raw - defVal);
  defender.hp -= dmg;
  if (defender.hp <= 0) defender.hp = 0;
  return dmg;
}

function doSpell(caster, spell, target) {
  if (caster.mp < spell.cost) return null;
  caster.mp -= spell.cost;

  if (spell.type === 'heal') {
    target.hp = Math.min(target.hp + spell.amount, target.maxHp);
    return { type: 'heal', amount: spell.amount, target };
  }
  if (spell.type === 'buff') {
    for (const m of party) {
      if (m.alive) {
        m.buffAtk += spell.amount;
        m.buffTimer = 5;
      }
    }
    return { type: 'buff', amount: spell.amount };
  }
  if (spell.type === 'buff_def') {
    for (const m of party) {
      if (m.alive) {
        m.buffDef += spell.amount;
        m.buffTimer = 5;
      }
    }
    return { type: 'buff_def', amount: spell.amount };
  }
  if (spell.type === 'revive') {
    // Find first dead ally
    const dead = party.find(m => !m.alive);
    if (!dead) return null;
    dead.alive = true;
    dead.hp = spell.amount;
    return { type: 'revive', target: dead };
  }
  if (spell.type === 'attack' || spell.type === 'undead') {
    if (spell.name === 'Ice Bolt') {
      // Single target
      const dmg = spell.dmg + Math.floor(Math.random() * 4);
      target.hp = Math.max(0, target.hp - dmg);
      triggerScreenFlash(80, 150, 255, 150);
      return { type: 'damage', dmg, targets: [target] };
    }
    // AoE
    let totalDmg = 0;
    const targets = enemies.filter(e => e.hp > 0);
    for (const e of targets) {
      const dmg = spell.dmg + Math.floor(Math.random() * 4);
      e.hp = Math.max(0, e.hp - dmg);
      totalDmg += dmg;
    }
    if (spell.name === 'Fireball') triggerScreenFlash(255, 120, 30, 180);
    else if (spell.name === 'Turn Undead') triggerScreenFlash(255, 255, 180, 150);
    return { type: 'damage', dmg: totalDmg, targets };
  }
  return null;
}

function triggerScreenFlash(r, g, b, alpha) {
  screenFlash = { r, g, b, alpha, decay: 6 };
}

function castSpellInCombat(member, spell) {
  if (spell.type === 'heal') {
    const target = party.filter(m => m.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const result = doSpell(member, spell, target);
    if (result) {
      combatLog.push(`${member.name} casts ${spell.name} on ${target.name}! +${spell.amount} HP`);
      triggerScreenFlash(50, 255, 100, 80);
    }
  } else if (spell.type === 'buff') {
    const result = doSpell(member, spell, null);
    if (result) combatLog.push(`${member.name} casts ${spell.name}! Party ATK +${spell.amount}`);
    triggerScreenFlash(255, 220, 80, 80);
  } else if (spell.type === 'buff_def') {
    const result = doSpell(member, spell, null);
    if (result) combatLog.push(`${member.name} casts ${spell.name}! Party DEF +${spell.amount}`);
    triggerScreenFlash(80, 150, 255, 80);
  } else if (spell.type === 'revive') {
    const result = doSpell(member, spell, null);
    if (result) {
      combatLog.push(`${member.name} casts ${spell.name}! ${result.target.name} revived!`);
      triggerScreenFlash(255, 255, 200, 120);
    } else {
      combatLog.push('No fallen allies to revive.');
      member.mp += spell.cost; // refund
    }
  } else {
    const target = enemies.find(e => e.hp > 0);
    const result = doSpell(member, spell, target);
    if (result) combatLog.push(`${member.name} casts ${spell.name}! ${result.dmg} damage!`);
  }
}

function advanceCombatTurn() {
  // Check victory
  if (enemies.every(e => e.hp <= 0)) {
    let totalXP = 0,
      totalGoldGain = 0;
    for (const e of enemies) {
      totalXP += e.xp;
      totalGoldGain += e.gold + Math.floor(Math.random() * e.gold);
    }
    totalGold += totalGoldGain;
    combatLog.push(`Victory! +${totalXP} XP, +${totalGoldGain} Gold`);
    sfx('powerup');
    triggerScreenFlash(255, 220, 100, 100);

    // Track boss defeat
    if (enemies.some(e => e.isBoss)) {
      bossDefeated.add(floor);
      combatLog.push('The boss has been slain!');
    }

    // Distribute XP and check level ups
    for (const m of party) {
      if (!m.alive) continue;
      m.xp += totalXP;
      while (m.xp >= m.xpNext) {
        m.xp -= m.xpNext;
        levelUp(m);
        combatLog.push(`${m.name} leveled up to ${m.level}!`);
        sfx('coin');
      }
    }

    // Remove dead monster meshes
    for (const e of enemies) {
      if (e.allMeshes) {
        for (const id of e.allMeshes) destroyMesh(id);
        e.allMeshes = null;
        e.meshBody = null;
      }
    }

    combatAction = 'result';
    return;
  }

  // Check defeat
  if (party.every(m => !m.alive)) {
    combatLog.push('Your party has been wiped out...');
    combatAction = 'result';
    return;
  }

  // Next party member
  combatTurn++;
  while (combatTurn < party.length && !party[combatTurn].alive) combatTurn++;

  if (combatTurn >= party.length) {
    // Enemy turn
    combatAction = 'enemyTurn';
    enemyDelay = 0.5;
  } else {
    combatAction = 'choose';
    selectedTarget = enemies.findIndex(e => e.hp > 0);
  }
}

function doEnemyTurn() {
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    // Pick random alive party member
    const alive = party.filter(m => m.alive);
    if (alive.length === 0) break;
    const target = alive[Math.floor(Math.random() * alive.length)];
    const dmg = doAttack(e, target);
    combatLog.push(`${e.name} hits ${target.name} for ${dmg}!`);
    triggerShake(shake, 0.3);
    triggerScreenFlash(255, 50, 50, 100);
    sfx('hit');

    if (target.hp <= 0) {
      target.alive = false;
      combatLog.push(`${target.name} falls!`);
      sfx('death');
    }
  }

  // Tick buffs
  for (const m of party) {
    if (m.buffTimer > 0) {
      m.buffTimer--;
      if (m.buffTimer <= 0) {
        m.buffAtk = 0;
        m.buffDef = 0;
      }
    }
  }

  // Back to party turn
  combatTurn = 0;
  while (combatTurn < party.length && !party[combatTurn].alive) combatTurn++;

  if (combatTurn >= party.length || party.every(m => !m.alive)) {
    combatLog.push('Your party has been wiped out...');
    combatAction = 'result';
  } else {
    combatAction = 'choose';
    selectedTarget = enemies.findIndex(e => e.hp > 0);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPLORATION
// ═══════════════════════════════════════════════════════════════════════

function tryMove(dx, dz) {
  const nx = px + dx,
    nz = py + dz;
  if (nx < 0 || nx >= dungeonW || nz < 0 || nz >= dungeonH) return false;
  const tile = dungeon[nz][nx];
  if (tile === T.WALL) return false;

  px = nx;
  py = nz;
  stepAnim = 1.0;
  revealAround(px, py);

  // Interact with special tiles
  if (tile === T.DOOR) {
    dungeon[nz][nx] = T.FLOOR;
    showFloorMessage('Door opened!');
    sfx('select');
  } else if (tile === T.STAIRS_DOWN) {
    enterFloor(floor + 1);
    sfx('powerup');
    return true;
  } else if (tile === T.STAIRS_UP) {
    if (floor > 1) {
      enterFloor(floor - 1);
      sfx('powerup');
    } else {
      showFloorMessage('The surface is sealed...');
      sfx('error');
    }
    return true;
  } else if (tile === T.CHEST) {
    dungeon[nz][nx] = T.FLOOR;
    // Chance for equipment drop based on floor tier
    if (Math.random() < 0.4) {
      const tierItems = EQUIPMENT.filter(e => e.tier <= Math.ceil(floor / 2));
      if (tierItems.length > 0) {
        const item = tierItems[Math.floor(Math.random() * tierItems.length)];
        // Find matching party member or any alive member
        const target =
          party.find(m => m.alive && m.class === item.class && !m[item.slot]) ||
          party.find(m => m.alive && m.class === item.class);
        if (target) {
          equipItem(target, item);
          showFloorMessage(`${target.name} found ${item.name}!`);
          triggerScreenFlash(255, 220, 50, 120);
          sfx('powerup');
        } else {
          const goldAmount = 10 + Math.floor(Math.random() * 10 * floor);
          totalGold += goldAmount;
          showFloorMessage(`Found chest: +${goldAmount} Gold!`);
          sfx('coin');
        }
      }
    } else {
      const goldAmount = 5 + Math.floor(Math.random() * 10 * floor);
      totalGold += goldAmount;
      showFloorMessage(`Found chest: +${goldAmount} Gold!`);
      // Chance for HP/MP restore
      if (Math.random() < 0.3) {
        const healTarget = party.find(m => m.alive && m.hp < m.maxHp);
        if (healTarget) {
          const heal = 5 + Math.floor(Math.random() * 10);
          healTarget.hp = Math.min(healTarget.hp + heal, healTarget.maxHp);
          showFloorMessage(`Found potion: ${healTarget.name} +${heal} HP`);
        }
      }
      sfx('coin');
    }
  } else if (tile === T.FOUNTAIN) {
    // Restore party AND revive dead members
    let revived = false;
    for (const m of party) {
      if (!m.alive) {
        m.alive = true;
        m.hp = Math.floor(m.maxHp * 0.5);
        revived = true;
      }
      if (m.alive) {
        m.hp = m.maxHp;
        m.mp = m.maxMp;
      }
    }
    showFloorMessage(
      revived ? 'Fountain revives and restores the party!' : 'Fountain restores the party!'
    );
    triggerScreenFlash(50, 130, 255, 100);
    sfx('coin');
  } else if (tile === T.TRAP) {
    dungeon[nz][nx] = T.FLOOR;
    // Thief can detect and disarm
    const thief = party.find(m => m.alive && m.class === 'Thief');
    if (thief && Math.random() < 0.5 + thief.level * 0.1) {
      showFloorMessage(`${thief.name} disarmed a trap!`);
      sfx('select');
    } else {
      const trapDmg = 3 + floor * 2;
      for (const m of party) {
        if (m.alive) {
          m.hp = Math.max(1, m.hp - trapDmg);
        }
      }
      showFloorMessage(`Trap! Party takes ${trapDmg} damage each!`);
      triggerScreenFlash(255, 50, 50, 180);
      triggerShake(shake, 0.5);
      sfx('explosion');
    }
  } else if (tile === T.BOSS) {
    dungeon[nz][nx] = T.FLOOR;
    startCombat(true);
    sfx('error');
    return true;
  }

  // Random encounter
  encounterChance += 0.08 + floor * 0.02;
  if (Math.random() < encounterChance) {
    encounterChance = 0;
    startCombat(false);
    sfx('error');
  }

  return true;
}

function enterFloor(newFloor) {
  floor = newFloor;
  facing = 0;
  encounterChance = 0;
  explored = new Set(); // reset fog of war per floor

  if (floor > 5) {
    // Victory!
    gameState = 'victory';
    showFloorMessage('You conquered the dungeon!');
    sfx('powerup');
    return;
  }

  dungeon = generateDungeon(18 + floor * 2, 18 + floor * 2);
  buildLevel();
  targetYaw = (facing * Math.PI) / 2;
  currentYaw = targetYaw;
  updateCamera3D();
  revealAround(px, py); // reveal starting area
  const theme = FLOOR_THEMES[Math.min(floor - 1, FLOOR_THEMES.length - 1)];
  showFloorMessage(`Floor ${floor} — ${theme.name}`);
}

function revealAround(cx, cy) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const nx = cx + dx,
        ny = cy + dy;
      if (nx >= 0 && nx < dungeonW && ny >= 0 && ny < dungeonH) {
        explored.add(`${nx},${ny}`);
      }
    }
  }
}

function showFloorMessage(msg) {
  floorMessage = msg;
  floorMessageTimer = 3.0;
}

// ═══════════════════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════════════════

function updateCamera3D() {
  const [dx, dz] = DIRS[facing];
  const wx = px * TILE,
    wz = py * TILE;
  const bob = Math.sin(stepAnim * Math.PI * 4) * 0.1 * Math.max(0, stepAnim);
  const eyeY = 1.6 + bob;

  const [shakeX, shakeY] = getShakeOffset(shake);

  setCameraPosition(wx + shakeX * 0.02, eyeY + shakeY * 0.02, wz);
  setCameraTarget(wx + dx * 10, eyeY, wz + dz * 10);
}

// ═══════════════════════════════════════════════════════════════════════
// INIT / UPDATE / DRAW
// ═══════════════════════════════════════════════════════════════════════

export function init() {
  gameState = 'title';
  animTimer = 0;
  enemyDelay = 0;
  autoPlay = false;

  setAmbientLight(0x221111, 0.4);
  setLightDirection(0, -1, 0);
  setLightColor(0x443322);
  setFog(0x000000, 2, 18);
  setCameraFOV(75);

  enableBloom(1.0, 0.4, 0.25);
  enableVignette(1.4, 0.8);
  createGradientSkybox(0x110808, 0x050303);

  shake = createShake({ decay: 5 });
  inputCD = createCooldown(0.15);
  moveCD = createCooldown(0.18);
  floatingTexts = createFloatingTextSystem();

  // Start new game data but stay on title
  party = createParty();
  floor = 0;
  totalGold = 0;
  dungeonsCleared = 0;
  stepAnim = 0;
  currentYaw = 0;
  targetYaw = 0;
  floorMessage = '';
  floorMessageTimer = 0;
  screenFlash = null;
  animatedMeshes = [];
  particleSystems = [];
  explored = new Set();
  bossDefeated = new Set();
  currentLevelMeshes = [];
  monsterMeshes = [];
}

export function update(dt) {
  animTimer += dt;
  updateCooldown(inputCD, dt);
  updateCooldown(moveCD, dt);
  floatingTexts.update(dt);
  updateShake(shake, dt);
  updateParticles(dt);

  if (stepAnim > 0) stepAnim = Math.max(0, stepAnim - dt * 3);

  // Screen flash decay
  if (screenFlash) {
    screenFlash.alpha -= screenFlash.decay * dt * 60;
    if (screenFlash.alpha <= 0) screenFlash = null;
  }

  // Animate special meshes (bob, pulse, spin)
  if (animatedMeshes) {
    for (const am of animatedMeshes) {
      if (am.type === 'bob') {
        const y = am.baseY + Math.sin(animTimer * am.speed) * am.range;
        const pos = getPosition(am.id);
        if (pos) setPosition(am.id, pos[0], y, pos[2]);
      } else if (am.type === 'pulse') {
        const s = am.baseScale + Math.sin(animTimer * am.speed) * am.range;
        setScale(am.id, s, s, s);
      } else if (am.type === 'spin') {
        rotateMesh(am.id, 0, dt * am.speed, 0);
      }
    }
  }

  // Torch light flicker
  if (torchLights) {
    for (const t of torchLights) {
      if (t && t.lightId) {
        // Flicker by randomly varying color temperature
        setPointLightColor(t.lightId, Math.random() > 0.9 ? 0xff6600 : 0xff8833);
      }
    }
  }

  // Smooth turning
  if (currentYaw !== targetYaw) {
    const diff = targetYaw - currentYaw;
    currentYaw += diff * Math.min(1, dt * 12);
    if (Math.abs(targetYaw - currentYaw) < 0.01) currentYaw = targetYaw;
  }

  if (gameState === 'title') {
    updateTitle(dt);
  } else if (gameState === 'explore') {
    updateExplore(dt);
  } else if (gameState === 'combat') {
    updateCombat(dt);
  } else if (gameState === 'inventory') {
    updateInventory(dt);
  } else if (gameState === 'gameover') {
    if (keyp('Space') && cooldownReady(inputCD)) {
      useCooldown(inputCD);
      init();
    }
  } else if (gameState === 'victory') {
    if (keyp('Space') && cooldownReady(inputCD)) {
      useCooldown(inputCD);
      init();
    }
  }

  if (floorMessageTimer > 0) floorMessageTimer -= dt;
}

function updateTitle(dt) {
  // Slowly spin camera for title
  const a = animTimer * 0.3;
  setCameraPosition(Math.sin(a) * 8, 3, Math.cos(a) * 8);
  setCameraTarget(0, 1, 0);

  if (keyp('Space') || keyp('Enter')) {
    enterFloor(1);
    gameState = 'explore';
    sfx('confirm');
  }
}

function updateExplore(dt) {
  if (!cooldownReady(moveCD)) {
    // still in cooldown, but check non-move inputs
    if (keyp('KeyI') || keyp('Tab')) gameState = 'inventory';
    updateCamera3D();
    return;
  }

  const [dx, dz] = DIRS[facing];

  // Movement
  let moved = false;
  if (key('KeyW') || key('ArrowUp')) {
    moved = tryMove(dx, dz);
  } else if (key('KeyS') || key('ArrowDown')) {
    moved = tryMove(-dx, -dz);
  } else if (key('KeyA')) {
    // Strafe left
    moved = tryMove(dz, -dx);
  } else if (key('KeyD')) {
    // Strafe right
    moved = tryMove(-dz, dx);
  }

  // Turning (keyp for discrete 90° snaps)
  if (keyp('ArrowLeft') || keyp('KeyQ')) {
    facing = (facing + 3) % 4; // turn left
    targetYaw = (facing * Math.PI) / 2;
    moveCD.remaining = moveCD.duration;
  } else if (keyp('ArrowRight') || keyp('KeyE')) {
    facing = (facing + 1) % 4; // turn right
    targetYaw = (facing * Math.PI) / 2;
    moveCD.remaining = moveCD.duration;
  }

  if (keyp('KeyI') || keyp('Tab')) gameState = 'inventory';

  if (moved) moveCD.remaining = moveCD.duration; // reset move cooldown

  updateCamera3D();
}

function updateCombat(dt) {
  if (combatAction === 'enemyTurn') {
    enemyDelay -= dt;
    if (enemyDelay <= 0) {
      doEnemyTurn();
    }
    return;
  }

  if (combatAction === 'result') {
    if (keyp('Space') && useCooldown(inputCD)) {
      clearMonsterMeshes();
      if (party.every(m => !m.alive)) {
        gameState = 'gameover';
      } else {
        gameState = 'explore';
        enemies = [];
      }
    }
    return;
  }

  // Toggle auto-play
  if (keyp('KeyA')) {
    autoPlay = !autoPlay;
    combatLog.push(autoPlay ? 'AUTO-COMBAT ON' : 'AUTO-COMBAT OFF');
  }

  if (combatAction === 'choose' && cooldownReady(inputCD)) {
    const member = party[combatTurn];

    // Auto-play: automatically attack a random living enemy
    if (autoPlay) {
      useCooldown(inputCD);
      const target = enemies.filter(e => e.hp > 0);
      if (target.length > 0) {
        const t = target[Math.floor(Math.random() * target.length)];
        const dmg = doAttack(member, t);
        combatLog.push(`${member.name} hits ${t.name} for ${dmg}!`);
        triggerShake(shake, 0.2);
        if (t.hp <= 0) {
          combatLog.push(`${t.name} defeated!`);
          if (t.allMeshes) {
            for (const id of t.allMeshes) destroyMesh(id);
            t.allMeshes = null;
            t.meshBody = null;
          }
        }
      }
      advanceCombatTurn();
    } else if (keyp('Digit1') || keyp('KeyZ')) {
      useCooldown(inputCD);
      // Attack
      combatAction = 'target';
      selectedTarget = enemies.findIndex(e => e.hp > 0);
    } else if (keyp('Digit2') || keyp('KeyX')) {
      useCooldown(inputCD);
      // Cast spell (if caster)
      if (member.maxMp > 0) {
        combatAction = 'spell';
      }
    } else if (keyp('Digit3') || keyp('KeyC')) {
      useCooldown(inputCD);
      // Defend — skip turn, boost def temporarily
      member.buffDef += 3;
      member.buffTimer = Math.max(member.buffTimer, 2);
      combatLog.push(`${member.name} defends.`);
      advanceCombatTurn();
    }
  }

  if (combatAction === 'target' && cooldownReady(inputCD)) {
    if (keyp('ArrowUp') || keyp('KeyW')) {
      useCooldown(inputCD);
      // Prev enemy
      for (let i = selectedTarget - 1; i >= 0; i--) {
        if (enemies[i].hp > 0) {
          selectedTarget = i;
          break;
        }
      }
    } else if (keyp('ArrowDown') || keyp('KeyS')) {
      useCooldown(inputCD);
      // Next enemy
      for (let i = selectedTarget + 1; i < enemies.length; i++) {
        if (enemies[i].hp > 0) {
          selectedTarget = i;
          break;
        }
      }
    } else if (keyp('Space') || keyp('Enter') || keyp('KeyZ')) {
      useCooldown(inputCD);
      // Confirm attack
      const member = party[combatTurn];
      const target = enemies[selectedTarget];
      const dmg = doAttack(member, target);
      combatLog.push(`${member.name} hits ${target.name} for ${dmg}!`);
      triggerShake(shake, 0.2);
      sfx('hit');

      if (target.hp <= 0) {
        combatLog.push(`${target.name} defeated!`);
        sfx('explosion');
        triggerScreenFlash(255, 200, 50, 120);
        if (target.allMeshes) {
          for (const id of target.allMeshes) destroyMesh(id);
          target.allMeshes = null;
          target.meshBody = null;
        }
      }
      advanceCombatTurn();
    } else if (keyp('Escape') || keyp('Backspace')) {
      useCooldown(inputCD);
      combatAction = 'choose';
    }
  }

  if (combatAction === 'spell' && cooldownReady(inputCD)) {
    const member = party[combatTurn];
    const available = Object.values(SPELLS).filter(
      s => s.class === member.class && member.mp >= s.cost
    );

    if (keyp('Digit1') && available.length > 0) {
      useCooldown(inputCD);
      const spell = available[0];
      sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (keyp('Digit2') && available.length > 1) {
      useCooldown(inputCD);
      const spell = available[1];
      sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (keyp('Digit3') && available.length > 2) {
      useCooldown(inputCD);
      const spell = available[2];
      sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (keyp('Escape') || keyp('Backspace')) {
      useCooldown(inputCD);
      combatAction = 'choose';
    }
  }
}

function updateInventory(dt) {
  if (keyp('KeyI') || keyp('Tab') || keyp('Escape')) {
    gameState = 'explore';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DRAW
// ═══════════════════════════════════════════════════════════════════════

export function draw() {
  if (gameState === 'title') {
    drawTitle();
  } else if (gameState === 'explore') {
    drawExploreHUD();
  } else if (gameState === 'combat') {
    drawCombatUI();
  } else if (gameState === 'inventory') {
    drawInventoryUI();
  } else if (gameState === 'gameover') {
    drawGameOver();
  } else if (gameState === 'victory') {
    drawVictory();
  }

  // Screen flash overlay (damage, magic, discoveries)
  if (screenFlash && screenFlash.alpha > 0) {
    rectfill(
      0,
      0,
      W,
      H,
      rgba8(screenFlash.r, screenFlash.g, screenFlash.b, Math.floor(screenFlash.alpha))
    );
  }

  // Floating texts
  drawFloatingTexts(floatingTexts);
}

function drawTitle() {
  rectfill(0, 0, W, H, rgba8(0, 0, 0, 180));

  drawGlowText('WIZARDRY', 320, 80, rgba8(255, 200, 50, 255), rgba8(180, 100, 0, 150), 4);
  printCentered('N O V A  6 4', 320, 130, rgba8(200, 160, 80, 255), 2);

  printCentered('Proving Grounds of the Dark Tower', 320, 170, rgba8(150, 130, 110, 255));

  const pulse = Math.floor(Math.sin(animTimer * 3) * 60 + 195);
  printCentered('Press SPACE to begin your quest', 320, 240, rgba8(pulse, pulse, pulse, 255));

  // Party preview
  printCentered('Your Party:', 320, 280, rgba8(180, 180, 200, 255));
  for (let i = 0; i < 4; i++) {
    const m = party[i];
    const x = 130 + i * 110;
    const c = CLASS_COLORS[m.class];
    const r = (c >> 16) & 0xff,
      g = (c >> 8) & 0xff,
      b = c & 0xff;
    printCentered(CLASS_ICONS[m.class], x, 300, rgba8(r, g, b, 255), 2);
    printCentered(m.name, x, 320, rgba8(r, g, b, 200));
    printCentered(m.class, x, 332, rgba8(140, 140, 160, 180));
  }
}

function drawExploreHUD() {
  // Compass
  const compassBg = rgba8(0, 0, 0, 160);
  rectfill(280, 4, 80, 18, compassBg);
  printCentered(`Facing ${DIR_NAMES[facing]}`, 320, 8, rgba8(200, 200, 220, 255));

  // Floor indicator
  printCentered(`Floor ${floor}`, 320, 24, rgba8(150, 130, 100, 200));

  // Mini party status (bottom)
  drawPartyBar();

  // Minimap (top-right)
  drawDungeonMinimap();

  // Floor message
  if (floorMessageTimer > 0) {
    const alpha = Math.min(255, Math.floor(floorMessageTimer * 200));
    rectfill(120, 160, 400, 28, rgba8(0, 0, 0, Math.floor(alpha * 0.7)));
    printCentered(floorMessage, 320, 166, rgba8(255, 220, 100, alpha));
  }

  // Controls hint
  print('WASD/Arrows=Move  Q/E=Turn  I=Inventory', 10, 348, rgba8(80, 80, 100, 150));

  // Gold
  print(`Gold: ${totalGold}`, 540, 348, rgba8(220, 180, 50, 200));
}

function drawPartyBar() {
  const barY = H - 52;
  rectfill(0, barY, W, 52, rgba8(10, 8, 15, 220));
  line(0, barY, W, barY, rgba8(60, 50, 40, 200));

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const bx = 10 + i * 158;
    const c = CLASS_COLORS[m.class];
    const r = (c >> 16) & 0xff,
      g = (c >> 8) & 0xff,
      b = c & 0xff;

    // Name + class icon
    print(
      `${CLASS_ICONS[m.class]} ${m.name}`,
      bx,
      barY + 4,
      m.alive ? rgba8(r, g, b, 255) : rgba8(80, 80, 80, 255)
    );

    // HP bar
    if (m.alive) {
      const hpPct = m.hp / m.maxHp;
      const barColor =
        hpPct > 0.5
          ? rgba8(50, 180, 50, 255)
          : hpPct > 0.25
            ? rgba8(200, 180, 30, 255)
            : rgba8(200, 40, 40, 255);
      drawProgressBar(bx, barY + 16, 100, 6, hpPct, barColor, rgba8(30, 20, 20, 255));
      print(`${m.hp}/${m.maxHp}`, bx + 104, barY + 14, rgba8(180, 180, 180, 200));
    } else {
      print('DEAD', bx, barY + 16, rgba8(150, 40, 40, 200));
    }

    // MP bar (if applicable)
    if (m.maxMp > 0 && m.alive) {
      drawProgressBar(
        bx,
        barY + 26,
        100,
        4,
        m.mp / m.maxMp,
        rgba8(50, 80, 200, 255),
        rgba8(20, 20, 30, 255)
      );
      print(`${m.mp}/${m.maxMp}`, bx + 104, barY + 24, rgba8(120, 140, 220, 180));
    }

    // Level
    print(`Lv${m.level}`, bx, barY + 36, rgba8(120, 120, 140, 180));
  }
}

function drawDungeonMinimap() {
  if (!dungeon) return;
  const mmSize = 80;
  const mmX = W - mmSize - 8;
  const mmY = 4;
  const cellSize = Math.max(1, Math.floor(mmSize / Math.max(dungeonW, dungeonH)));

  rectfill(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4, rgba8(0, 0, 0, 200));
  drawPixelBorder(
    mmX - 2,
    mmY - 2,
    mmSize + 4,
    mmSize + 4,
    rgba8(50, 40, 30, 200),
    rgba8(20, 15, 10, 200)
  );

  const offsetX = mmX + Math.floor((mmSize - dungeonW * cellSize) / 2);
  const offsetY = mmY + Math.floor((mmSize - dungeonH * cellSize) / 2);

  for (let y = 0; y < dungeonH; y++) {
    for (let x = 0; x < dungeonW; x++) {
      // Fog of war — only show explored tiles
      if (!explored.has(`${x},${y}`)) continue;

      const tile = dungeon[y][x];
      const sx = offsetX + x * cellSize;
      const sy = offsetY + y * cellSize;

      // Dim tiles far from player
      const dist = Math.abs(x - px) + Math.abs(y - py);
      const nearAlpha = dist <= 6 ? 220 : 120;

      if (tile === T.WALL) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(60, 50, 40, nearAlpha));
      } else if (tile === T.FLOOR || tile === T.DOOR) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(30, 28, 22, nearAlpha));
      } else if (tile === T.STAIRS_DOWN) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(50, 100, 200, 255));
      } else if (tile === T.STAIRS_UP) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(200, 150, 50, 255));
      } else if (tile === T.CHEST) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(200, 180, 50, 255));
      } else if (tile === T.FOUNTAIN) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(50, 120, 255, 255));
      } else if (tile === T.TRAP && dist <= 3) {
        // Only show nearby traps (thief awareness)
        rectfill(sx, sy, cellSize, cellSize, rgba8(150, 40, 40, 200));
      } else if (tile === T.BOSS) {
        const pulse = Math.floor(Math.sin(animTimer * 4) * 50 + 200);
        rectfill(sx, sy, cellSize, cellSize, rgba8(pulse, 0, 50, 255));
      } else if (tile === T.TRAP) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(30, 28, 22, nearAlpha)); // hidden trap
      }
    }
  }

  // Player dot with facing indicator
  const ppx = offsetX + px * cellSize;
  const ppy = offsetY + py * cellSize;
  rectfill(ppx, ppy, cellSize, cellSize, rgba8(255, 60, 60, 255));

  // Facing arrow
  const [fdx, fdy] = DIRS[facing];
  const fx = ppx + fdx * cellSize + Math.floor(cellSize / 2);
  const fy = ppy + fdy * cellSize + Math.floor(cellSize / 2);
  rectfill(fx, fy, Math.max(1, cellSize - 1), Math.max(1, cellSize - 1), rgba8(255, 200, 50, 255));
}

function drawCombatUI() {
  // Dark overlay
  rectfill(0, 0, W, 40, rgba8(10, 5, 15, 200));
  rectfill(0, H - 160, W, 160, rgba8(10, 5, 15, 220));

  // Boss indicator
  if (enemies.length > 0 && enemies[0].isBoss) {
    const pulse = Math.floor(Math.sin(animTimer * 4) * 40 + 215);
    printCentered('☠ BOSS BATTLE ☠', 320, 42, rgba8(pulse, 40, 60, 255), 2);
  }

  // Monster info (top)
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const x = 20 + i * 200;
    const alive = e.hp > 0;
    const nameColor = alive ? rgba8(220, 180, 180, 255) : rgba8(80, 80, 80, 150);
    const sel = combatAction === 'target' && i === selectedTarget;

    print(`${sel ? '► ' : '  '}${e.name}`, x, 6, nameColor);
    if (alive) {
      drawProgressBar(
        x,
        20,
        120,
        6,
        e.hp / e.maxHp,
        rgba8(200, 40, 40, 255),
        rgba8(40, 20, 20, 255)
      );
      print(`${e.hp}/${e.maxHp}`, x + 124, 18, rgba8(180, 140, 140, 200));
    } else {
      print('DEAD', x + 10, 20, rgba8(100, 40, 40, 150));
    }
  }

  // Combat log (middle-bottom)
  const logY = H - 155;
  const logLines = combatLog.slice(-5);
  for (let i = 0; i < logLines.length; i++) {
    const alpha = Math.floor(255 - (5 - i - 1) * 30);
    print(logLines[i], 20, logY + i * 12, rgba8(200, 200, 210, Math.max(80, alpha)));
  }

  // Separator
  line(10, H - 90, W - 10, H - 90, rgba8(60, 50, 70, 200));

  // Current party member + actions
  if (combatTurn < party.length) {
    const member = party[combatTurn];
    const c = CLASS_COLORS[member.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;

    print(`${CLASS_ICONS[member.class]} ${member.name}'s turn`, 20, H - 82, rgba8(cr, cg, cb, 255));

    if (combatAction === 'choose') {
      print('[1/Z] Attack', 20, H - 62, rgba8(220, 200, 180, 255));
      if (member.maxMp > 0) {
        print(`[2/X] Magic (${member.mp} MP)`, 20, H - 48, rgba8(120, 140, 255, 255));
      }
      print('[3/C] Defend', 20, H - 34, rgba8(180, 180, 140, 255));
      print(
        `[A] Auto ${autoPlay ? 'ON' : 'OFF'}`,
        20,
        H - 20,
        autoPlay ? rgba8(100, 255, 100, 255) : rgba8(120, 120, 140, 180)
      );
      // Show equipped weapon
      if (member.weapon) {
        print(`Weapon: ${member.weapon.name}`, 250, H - 62, rgba8(200, 180, 140, 150));
      }
    } else if (combatAction === 'target') {
      print(
        'Select target: W/S = cycle, Z/Space = confirm, Esc = back',
        20,
        H - 62,
        rgba8(200, 180, 150, 200)
      );
    } else if (combatAction === 'spell') {
      const available = Object.values(SPELLS).filter(
        s => s.class === member.class && member.mp >= s.cost
      );
      for (let i = 0; i < available.length; i++) {
        const sp = available[i];
        print(
          `[${i + 1}] ${sp.name} (${sp.cost} MP) — ${sp.desc}`,
          20,
          H - 62 + i * 14,
          rgba8(140, 160, 255, 255)
        );
      }
      if (available.length === 0)
        print('No spells available!', 20, H - 62, rgba8(150, 100, 100, 200));
      print('Esc = back', 20, H - 20, rgba8(120, 120, 140, 180));
    } else if (combatAction === 'enemyTurn') {
      printCentered('Enemies attacking...', 320, H - 62, rgba8(200, 100, 100, 255));
    }
  }

  if (combatAction === 'result') {
    const won = enemies.every(e => e.hp <= 0);
    if (won) {
      printCentered('VICTORY!', 320, H - 70, rgba8(255, 220, 50, 255), 2);
    } else {
      printCentered('DEFEAT', 320, H - 70, rgba8(200, 40, 40, 255), 2);
    }
    printCentered('Press SPACE to continue', 320, H - 40, rgba8(180, 180, 200, 200));
  }

  // Party HP along right side
  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const y = H - 82 + i * 18;
    const isCurrent = i === combatTurn && combatAction !== 'result' && combatAction !== 'enemyTurn';
    const c = CLASS_COLORS[m.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;

    const labelColor = m.alive
      ? isCurrent
        ? rgba8(255, 255, 200, 255)
        : rgba8(cr, cg, cb, 200)
      : rgba8(80, 80, 80, 150);
    print(`${isCurrent ? '►' : ' '} ${m.name}`, W - 200, y, labelColor);
    if (m.alive) {
      drawProgressBar(
        W - 95,
        y + 2,
        60,
        5,
        m.hp / m.maxHp,
        m.hp / m.maxHp > 0.25 ? rgba8(50, 180, 50, 255) : rgba8(200, 40, 40, 255),
        rgba8(30, 20, 20, 255)
      );
      print(`${m.hp}`, W - 30, y, rgba8(180, 180, 180, 200));
    }
  }
}

function drawInventoryUI() {
  rectfill(40, 30, W - 80, H - 60, rgba8(10, 8, 20, 240));
  drawPixelBorder(40, 30, W - 80, H - 60, rgba8(80, 70, 50, 255), rgba8(30, 25, 20, 255));

  printCentered('═══ PARTY STATUS ═══', 320, 40, rgba8(200, 180, 120, 255), 2);

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const y = 75 + i * 65;
    const c = CLASS_COLORS[m.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;

    // Name + Class
    print(
      `${CLASS_ICONS[m.class]} ${m.name}  [${m.class}]  Lv ${m.level}`,
      60,
      y,
      rgba8(cr, cg, cb, 255)
    );

    // Stats
    const statColor = rgba8(180, 180, 200, 220);
    print(`HP: ${m.hp}/${m.maxHp}`, 80, y + 14, statColor);
    drawProgressBar(
      160,
      y + 16,
      80,
      5,
      m.hp / m.maxHp,
      rgba8(50, 180, 50, 255),
      rgba8(30, 20, 20, 255)
    );

    if (m.maxMp > 0) {
      print(`MP: ${m.mp}/${m.maxMp}`, 260, y + 14, rgba8(120, 140, 220, 200));
      drawProgressBar(
        340,
        y + 16,
        60,
        5,
        m.mp / m.maxMp,
        rgba8(50, 80, 200, 255),
        rgba8(20, 20, 30, 255)
      );
    }

    const totalAtk = getEffectiveAtk(m);
    const totalDef = getEffectiveDef(m);
    print(`ATK:${totalAtk}  DEF:${totalDef}  SPD:${m.spd}`, 80, y + 28, rgba8(150, 150, 170, 180));
    print(`XP: ${m.xp}/${m.xpNext}`, 320, y + 28, rgba8(150, 150, 170, 180));

    // Equipment
    if (m.weapon) {
      print(`Wpn: ${m.weapon.name}`, 80, y + 40, rgba8(200, 160, 80, 180));
    }
    if (m.armor) {
      print(`Arm: ${m.armor.name}`, 260, y + 40, rgba8(120, 160, 200, 180));
    }

    if (!m.alive) {
      print('☠ FALLEN', 480, y, rgba8(200, 40, 40, 255));
    }
  }

  // Gold + Floor info
  print(`Gold: ${totalGold}`, 60, H - 90, rgba8(220, 180, 50, 230));
  print(`Floor: ${floor}`, 200, H - 90, rgba8(150, 150, 170, 200));
  if (bossDefeated.size > 0) {
    print(`Bosses slain: ${bossDefeated.size}`, 300, H - 90, rgba8(200, 100, 100, 200));
  }

  printCentered('Press I / TAB / ESC to close', 320, H - 55, rgba8(120, 120, 150, 180));
}

function drawGameOver() {
  rectfill(0, 0, W, H, rgba8(0, 0, 0, 200));
  drawGlowText('GAME OVER', 320, 120, rgba8(200, 40, 40, 255), rgba8(100, 0, 0, 150), 3);
  printCentered(`Your party fell on Floor ${floor}`, 320, 180, rgba8(180, 150, 130, 200));
  printCentered(`Gold collected: ${totalGold}`, 320, 200, rgba8(200, 180, 50, 200));

  const pulse = Math.floor(Math.sin(animTimer * 3) * 60 + 195);
  printCentered('Press SPACE to try again', 320, 260, rgba8(pulse, pulse, pulse, 255));
}

function drawVictory() {
  rectfill(0, 0, W, H, rgba8(0, 0, 0, 180));
  drawGlowText('VICTORY!', 320, 80, rgba8(255, 220, 50, 255), rgba8(180, 120, 0, 150), 3);
  printCentered('You conquered the Dark Tower!', 320, 140, rgba8(200, 200, 220, 255));
  printCentered(`Gold: ${totalGold}`, 320, 170, rgba8(220, 180, 50, 230));

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const c = CLASS_COLORS[m.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;
    const y = 200 + i * 16;
    printCentered(
      `${m.name} — Lv${m.level} ${m.class} ${m.alive ? '✓' : '☠'}`,
      320,
      y,
      rgba8(cr, cg, cb, 220)
    );
  }

  const pulse = Math.floor(Math.sin(animTimer * 3) * 60 + 195);
  printCentered('Press SPACE to play again', 320, 300, rgba8(pulse, pulse, pulse, 255));
}
