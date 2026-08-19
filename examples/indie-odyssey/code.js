// Indie Odyssey: Book One - Echoes of the Shardgrid
// Cross-backend Nova64 port based on refrence/IndieOdyssey_1.
// The Babylon shader sources and asset paths are preserved below, while gameplay
// uses shared Nova64 APIs so the cart can run under Three.js, Babylon.js, Godot,
// and RetroArch hosts.

const WEB_ASSET_BASE = '/examples/indie-odyssey/assets/';
const PACKAGED_ASSET_BASE = 'assets/';

function resolveAssetBase() {
  if (typeof globalThis.__nova64_cart_path === 'string') {
    return PACKAGED_ASSET_BASE;
  }
  try {
    const assets = globalThis.nova64 && globalThis.nova64.assets;
    if (
      assets &&
      typeof assets.has === 'function' &&
      assets.has(`${PACKAGED_ASSET_BASE}normal.jpg`)
    ) {
      return PACKAGED_ASSET_BASE;
    }
  } catch (error) {
    // Browsers without packaged assets fall back to the public asset path.
  }
  return WEB_ASSET_BASE;
}

const ASSET_BASE = resolveAssetBase();
const SAVE_KEY = 'indieOdyssey.save.v1';
const TILE_SIZE = 1;
const CAMERA_HEIGHT = 0.3;
const MOVE_TIME = 0.32;
const ROTATE_TIME = 0.24;
const DIRS = [
  { x: 0, z: -1, name: 'North' },
  { x: 1, z: 0, name: 'East' },
  { x: 0, z: 1, name: 'South' },
  { x: -1, z: 0, name: 'West' },
];

const COLORS = {
  bg: 0x050711,
  panel: 0x071623cc,
  cyan: 0x00ffff,
  blue: 0x0088ff,
  magenta: 0xff00cc,
  orange: 0xff8800,
  green: 0x00ff88,
  red: 0xff3355,
  yellow: 0xffdd55,
  white: 0xffffff,
  muted: 0x6aa8c8,
  wall: 0x10051c,
  wallAlt: 0x041817,
  wallGlow: 0x00aaff,
  floor: 0x07010d,
  floorAlt: 0x041415,
  floorGrid: 0x0de7ff,
  ceiling: 0x1f4f9a,
};

const PRESERVED_SHADER_SOURCES = {
  combatDamageFragment: `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec4 damageColor;
    uniform float pixelationIntensity;
    uniform float blockSize;
    void main(void) {
      vec2 uv = vUV;
      if (pixelationIntensity > 0.0) {
        vec2 blocks = vec2(blockSize);
        uv = floor(uv * blocks) / blocks;
      }
      vec4 baseColor = texture2D(textureSampler, uv);
      gl_FragColor = mix(baseColor, damageColor, damageColor.a);
    }
  `,
  combatGlitchFragment: `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform float intensity;
    void main(void) {
      vec2 uv = vUV;
      vec4 baseColor = texture2D(textureSampler, uv);
      if (intensity > 0.0) {
        baseColor.r = texture2D(textureSampler, uv + vec2(0.01, 0.0)).r;
        baseColor.b = texture2D(textureSampler, uv - vec2(0.01, 0.0)).b;
      }
      gl_FragColor = baseColor;
    }
  `,
  pixelationFragment: `
    precision highp float;
    uniform sampler2D textureSampler;
    uniform float pixelSize;
    uniform float screenWidth;
    uniform float screenHeight;
    varying vec2 vUV;
    void main() {
      vec2 texelSize = vec2(1.0 / screenWidth, 1.0 / screenHeight);
      vec2 coord = vUV / texelSize;
      coord = floor(coord / pixelSize) * pixelSize;
      coord *= texelSize;
      gl_FragColor = texture2D(textureSampler, coord);
    }
  `,
  glitchFragment: `
    precision highp float;
    uniform sampler2D textureSampler;
    uniform float time;
    uniform float intensity;
    uniform float blockSize;
    varying vec2 vUV;
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    void main() {
      vec2 uv = vUV;
      float y = floor(uv.y / blockSize) * blockSize;
      float glitch = random(vec2(y, floor(time * 10.0))) * intensity;
      if (glitch > 0.8) uv.x += (random(vec2(y, time)) - 0.5) * 0.1 * intensity;
      vec4 color = texture2D(textureSampler, uv);
      if (glitch > 0.6) {
        color.r = texture2D(textureSampler, uv + vec2(0.01 * intensity, 0.0)).r;
        color.b = texture2D(textureSampler, uv - vec2(0.01 * intensity, 0.0)).b;
      }
      gl_FragColor = color;
    }
  `,
  transitionPixelateFragment: `
    precision highp float;
    uniform sampler2D textureSampler;
    uniform float progress;
    uniform float direction;
    uniform vec3 transitionColor;
    uniform float screenWidth;
    uniform float screenHeight;
    varying vec2 vUV;
    void main() {
      float pixelSize = mix(1.0, 50.0, progress);
      vec2 texelSize = vec2(1.0 / screenWidth, 1.0 / screenHeight);
      vec2 coord = floor((vUV / texelSize) / pixelSize) * pixelSize * texelSize;
      vec4 color = texture2D(textureSampler, coord);
      float alpha = direction > 0.0 ? (1.0 - progress) : progress;
      gl_FragColor = mix(vec4(transitionColor, 1.0), color, alpha);
    }
  `,
  hologramVertex: `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    uniform float time;
    varying vec2 vUV;
    void main() {
      vUV = uv;
      vec3 pos = position;
      pos.y += sin(pos.x * 8.0 + time * 2.0) * 0.02;
      gl_Position = worldViewProjection * vec4(pos, 1.0);
    }
  `,
  hologramFragment: `
    precision highp float;
    varying vec2 vUV;
    uniform float time;
    uniform vec3 color;
    void main() {
      float scan = sin((vUV.y + time * 0.5) * 80.0) * 0.5 + 0.5;
      float alpha = 0.45 + scan * 0.25;
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

const CONFIG = {
  avatarDefaults: {
    name: 'IO',
    gender: 'male',
    level: 1,
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    experience: 0,
    experienceToNextLevel: 20,
    skills: { weapon: 0, spell: 0, survival: 0 },
    stats: { strength: 5, intelligence: 8, dexterity: 5, constitution: 5, wisdom: 8 },
  },
  gameplay: {
    soundEnabled: false,
    autoplayEnabled: true,
    difficulty: 'normal',
    encounterRate: 0.15,
    moveSpeed: MOVE_TIME,
    rotateSpeed: ROTATE_TIME,
    difficultyModifiers: {
      easy: {
        encounterRateMultiplier: 0.6,
        enemyDamageMultiplier: 0.8,
        enemyHealthMultiplier: 0.8,
        expGainMultiplier: 1.0,
        lootDropRateMultiplier: 1.2,
      },
      normal: {
        encounterRateMultiplier: 1.0,
        enemyDamageMultiplier: 1.0,
        enemyHealthMultiplier: 1.0,
        expGainMultiplier: 1.0,
        lootDropRateMultiplier: 1.0,
      },
      hard: {
        encounterRateMultiplier: 1.8,
        enemyDamageMultiplier: 1.2,
        enemyHealthMultiplier: 1.2,
        expGainMultiplier: 1.2,
        lootDropRateMultiplier: 0.9,
      },
    },
  },
  dungeonMaps: {
    level1: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    level2: 'dynamic',
    level3: 'dynamic',
  },
  spawnLocations: {
    level1: { x: 1, z: 1, direction: 2 },
    level2: { x: 1, z: 1, direction: 2 },
    level3: { x: 1, z: 1, direction: 2 },
  },
  specialLocations: {
    level1: [
      {
        x: 7,
        z: 5,
        type: 'portal',
        name: 'Level Portal',
        targetLevel: 'level2',
        model: `${ASSET_BASE}models/accessories/portal.glb`,
      },
      {
        x: 13,
        z: 13,
        type: 'save_point',
        name: 'Memory Beacon',
        model: `${ASSET_BASE}models/accessories/portal.glb`,
      },
      { x: 3, z: 9, type: 'treasure', itemId: 'health_potion' },
      { x: 10, z: 12, type: 'trap', damage: 10, triggerOnce: true },
    ],
    level2: [
      {
        x: 7,
        z: 7,
        type: 'save_point',
        name: 'Data Nexus',
        model: `${ASSET_BASE}models/accessories/portal.glb`,
      },
      {
        x: 12,
        z: 12,
        type: 'portal',
        name: 'Level Portal',
        targetLevel: 'level3',
        model: `${ASSET_BASE}models/accessories/portal.glb`,
      },
    ],
    level3: [
      {
        x: 7,
        z: 7,
        type: 'save_point',
        name: 'Core Access',
        model: `${ASSET_BASE}models/accessories/portal.glb`,
      },
    ],
  },
  storyMode: {
    frameDuration: 2,
    levels: {
      level1: [
        {
          image: `${ASSET_BASE}images/story/scene1_1.png`,
          text: 'IO wakes in a trailer patched with solar scraps and rainwater lines.',
        },
        {
          image: `${ASSET_BASE}images/story/scene1_2.png`,
          text: 'The Shardgrid still pays for dangerous work, if you can survive the old code.',
        },
        {
          image: `${ASSET_BASE}images/story/scene1_3.png`,
          text: 'Dungeoncore Delta-7 opens like a wound in forgotten cyberspace.',
        },
        {
          image: `${ASSET_BASE}images/story/scene1_4.png`,
          text: 'The Codestone of Verdancy waits below the voxel catacombs.',
        },
        {
          image: `${ASSET_BASE}images/story/scene1_5.png`,
          text: 'You jack in. The terminal whispers back.',
        },
      ],
      level2: [
        {
          image: `${ASSET_BASE}images/story/scene1_2.png`,
          text: 'Level 2 begins as the grid recompiles around you.',
        },
      ],
      level3: null,
    },
  },
};

const ENEMIES = {
  dataImp: {
    id: 'data_imp',
    tier: 1,
    name: 'Data Imp',
    hp: 15,
    attack: 4,
    defense: 2,
    speed: 3,
    abilities: ['byte', 'corrupt'],
    lootTable: ['copper_fragment', 'minor_health_potion'],
    expValue: 5,
    color: 0x66ddff,
    model: `${ASSET_BASE}models/enemies/dataImp.glb`,
    sprite: `${ASSET_BASE}images/spritesheet/dataImp.png`,
  },
  glitchRat: {
    id: 'glitch_rat',
    tier: 1,
    name: 'Glitch Rat',
    hp: 12,
    attack: 3,
    defense: 1,
    speed: 6,
    abilities: ['nibble', 'flee'],
    lootTable: ['corrupted_data', 'minor_mana_potion'],
    expValue: 4,
    color: 0xff44dd,
    model: `${ASSET_BASE}models/enemies/glitchRat.glb`,
    sprite: `${ASSET_BASE}images/spritesheet/glitchRat.png`,
  },
  firewallOger: {
    id: 'firewall_oger',
    tier: 1,
    name: 'Firewall Oger',
    hp: 20,
    attack: 5,
    defense: 3,
    speed: 2,
    abilities: ['burn', 'split'],
    lootTable: ['flame_essence', 'minor_health_potion'],
    expValue: 6,
    color: 0xff5533,
    model: `${ASSET_BASE}models/enemies/firewallSlime.glb`,
    sprite: `${ASSET_BASE}images/spritesheet/firewallSlime.png`,
  },
  hexWraith: {
    id: 'hex_wraith',
    tier: 2,
    name: 'Hex Wraith',
    hp: 40,
    attack: 8,
    defense: 6,
    speed: 4,
    abilities: ['hex', 'drain', 'phase'],
    lootTable: ['wraith_essence', 'health_potion', 'mana_potion'],
    expValue: 12,
    color: 0x9966ff,
    model: `${ASSET_BASE}models/enemies/hexWraith.glb`,
    sprite: `${ASSET_BASE}images/spritesheet/hexWraith.png`,
  },
  necroScribe: {
    id: 'necro_scribe',
    tier: 2,
    name: 'Necro-Scribe',
    hp: 45,
    attack: 7,
    defense: 4,
    speed: 3,
    abilities: ['hex', 'summon_glitch_rat', 'dark_script'],
    lootTable: ['dark_parchment', 'health_potion', 'corrupted_code'],
    expValue: 15,
    color: 0x44ff99,
    sprite: `${ASSET_BASE}images/spritesheet/necroScribe.png`,
  },
  rogueProtocol: {
    id: 'rogue_protocol',
    tier: 2,
    name: 'Rogue Protocol',
    hp: 38,
    attack: 9,
    defense: 8,
    speed: 5,
    abilities: ['system_shock', 'firewall', 'override'],
    lootTable: ['protocol_fragment', 'mana_potion', 'encryption_key'],
    expValue: 14,
    color: 0x00ffff,
    sprite: `${ASSET_BASE}images/spritesheet/rougeProtocol.png`,
  },
  codeboundRevenant: {
    id: 'codebound_revenant',
    tier: 3,
    name: 'Codebound Revenant',
    hp: 120,
    attack: 12,
    defense: 10,
    speed: 7,
    abilities: ['code_drain', 'binary_blast', 'system_crash'],
    lootTable: ['revenant_core', 'greater_health_potion', 'skill_fragment'],
    expValue: 50,
    color: 0x66ff66,
    sprite: `${ASSET_BASE}images/spritesheet/sb3sm.png`,
  },
  phantomEnforcer: {
    id: 'phantom_enforcer',
    tier: 3,
    name: 'Phantom Enforcer',
    hp: 100,
    attack: 15,
    defense: 8,
    speed: 8,
    abilities: ['ghost_strike', 'phantom_shift', 'enforcer_code'],
    lootTable: ['phantom_essence', 'greater_mana_potion', 'rare_fragment'],
    expValue: 45,
    color: 0xff66ff,
    sprite: `${ASSET_BASE}images/spritesheet/sb4sm.png`,
  },
  shardwatcher: {
    id: 'shardwatcher',
    tier: 3,
    name: 'Shardwatcher',
    hp: 140,
    attack: 13,
    defense: 12,
    speed: 5,
    abilities: ['all_seeing_eye', 'reality_warp', 'crystal_barrage'],
    lootTable: ['watcher_shard', 'greater_health_potion', 'watcher_eye'],
    expValue: 55,
    color: 0xffdd55,
    sprite: `${ASSET_BASE}images/spritesheet/sb1sm.png`,
  },
  rootedOne: {
    id: 'rooted_one',
    tier: 4,
    name: 'The Rooted One',
    hp: 300,
    attack: 20,
    defense: 12,
    speed: 10,
    abilities: ['distort_stats', 'summon_minions', 'teleport', 'system_purge', 'reality_hack'],
    lootTable: ['codestone_of_verdancy', 'ancient_source_code', 'administrator_key'],
    expValue: 200,
    color: 0xff8844,
    sprite: `${ASSET_BASE}images/spritesheet/sb2sm.png`,
  },
};

const ITEMS = {
  minor_health_potion: {
    id: 'minor_health_potion',
    name: 'Minor Health Potion',
    type: 'consumable',
    effect: { type: 'heal', value: 20 },
  },
  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    type: 'consumable',
    effect: { type: 'heal', value: 50 },
  },
  greater_health_potion: {
    id: 'greater_health_potion',
    name: 'Greater Health Potion',
    type: 'consumable',
    effect: { type: 'heal', value: 100 },
  },
  minor_mana_potion: {
    id: 'minor_mana_potion',
    name: 'Minor Mana Potion',
    type: 'consumable',
    effect: { type: 'mana', value: 15 },
  },
  mana_potion: {
    id: 'mana_potion',
    name: 'Mana Potion',
    type: 'consumable',
    effect: { type: 'mana', value: 40 },
  },
  greater_mana_potion: {
    id: 'greater_mana_potion',
    name: 'Greater Mana Potion',
    type: 'consumable',
    effect: { type: 'mana', value: 80 },
  },
  rusty_sword: { id: 'rusty_sword', name: 'Rusty Sword', type: 'weapon', damage: 5 },
  leather_armor: { id: 'leather_armor', name: 'Leather Armor', type: 'armor', defense: 3 },
  encryption_key: { id: 'encryption_key', name: 'Encryption Key', type: 'key' },
  codestone_of_verdancy: {
    id: 'codestone_of_verdancy',
    name: 'Codestone of Verdancy',
    type: 'artifact',
  },
};

const SPELLS = {
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    type: 'attack',
    element: 'fire',
    damage: 15,
    manaCost: 10,
    aoe: true,
  },
  iceSpike: {
    id: 'ice_spike',
    name: 'Ice Spike',
    type: 'attack',
    element: 'ice',
    damage: 12,
    manaCost: 8,
    statusEffect: { type: 'slow', duration: 2 },
  },
  heal: { id: 'heal', name: 'Heal', type: 'healing', healing: 25, manaCost: 15 },
  shield: {
    id: 'shield',
    name: 'Shield',
    type: 'protection',
    defense: 10,
    duration: 3,
    manaCost: 12,
  },
  lightningBolt: {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    type: 'attack',
    element: 'lightning',
    damage: 20,
    manaCost: 18,
  },
};

const ABILITIES = {
  byte: { id: 'byte', name: 'Byte', type: 'attack', damage: 4 },
  corrupt: {
    id: 'corrupt',
    name: 'Corrupt',
    type: 'status',
    effect: { type: 'stat_reduction', amount: 2, duration: 3 },
  },
  nibble: { id: 'nibble', name: 'Nibble', type: 'attack', damage: 3 },
  flee: { id: 'flee', name: 'Flee', type: 'utility', effect: { type: 'escape', chance: 0.7 } },
  burn: { id: 'burn', name: 'Burn', type: 'attack', damage: 6 },
  hex: { id: 'hex', name: 'Hex', type: 'status', effect: { type: 'slow', duration: 2 } },
  drain: { id: 'drain', name: 'Drain', type: 'attack', damage: 8 },
};

let state;
let meshes = [];
let specialMeshes = [];
let enemyMeshes = [];
let levelLights = [];
let combatLights = [];
let hiddenLevelMeshes = []; // IDs of dungeon meshes hidden during combat
let map = [];
let generatedMaps = {};
let dynamicSpecialLocations = {};
let floatingTexts = [];
let messages = [];
let screen = 'start';
let time = 0;
let storyIndex = 0;
let storyTimer = 0;
let storyInputCooldown = 0;
let selectedDifficulty = 'normal';
let moveAnim = null;
let queuedAction = null;
let transition = null;
let flash = null;
let glitchPulse = null;
let combat = null;
let autoplayTimer = 0;
let lastMouseDown = false;
let levelAssetToken = 0;
let combatAssetToken = 0;
let loadedModelCount = 0;
let failedModelCount = 0;
let storyFrameImage = { src: null, status: 'idle', width: 0, height: 0 };
let storyFrameCanvas = null;
let storyFrameCtx = null;
let storyFrameCache = new Map();
let storyFrameLoading = new Set();
let hostTextureCache = new Map();
let hostTextureStatus = new Map();
let storyTransition = null;
let storyPixelCanvas = null;
let storyPixelCtx = null;
let combatSpriteCanvas = null;
let combatSpriteCtx = null;
let combatSpriteCache = new Map();
let combatSpriteMaskedCache = new Map();
let combatSpriteStatus = new Map();

function ns(path, fallback = null) {
  return (
    path
      .split('.')
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), globalThis.nova64) ??
    fallback
  );
}

function call(path, fallback, ...args) {
  const fn = ns(path);
  if (typeof fn !== 'function') return fallback;
  return fn(...args);
}

function backendName() {
  try {
    const caps = ns('scene.getBackendCapabilities')?.();
    if (caps?.backend) return String(caps.backend);
  } catch {}
  if (typeof globalThis.__nova64_cart_path === 'string') return 'godot';
  return 'unknown';
}

function isNativeHost() {
  const backend = backendName();
  return backend.includes('godot') || backend.includes('retroarch');
}

function canUseBrowserCanvasOverlay() {
  return (
    !isNativeHost() &&
    typeof HTMLCanvasElement === 'function' &&
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function' &&
    typeof document.getElementById === 'function' &&
    typeof globalThis.getComputedStyle === 'function'
  );
}

function ensureOverlayParentPositioned(parent) {
  const getStyle = globalThis.getComputedStyle;
  if (parent && typeof getStyle === 'function' && getStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
}

function canUseHostTextureOverlay() {
  return typeof ns('draw.image') === 'function' && typeof ns('scene.loadTexture') === 'function';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rand() {
  const seed = state?.rngSeed || 1;
  if (state) state.rngSeed = seed + 1;
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function createInitialState() {
  return {
    avatar: clone(CONFIG.avatarDefaults),
    inventory: [
      { id: 'minor_health_potion', count: 2 },
      { id: 'rusty_sword', count: 1 },
    ],
    equippedItems: { weapon: 'rusty_sword', armor: null, accessory: null },
    knownSpells: ['fireball', 'heal'],
    currentLevel: 'level1',
    position: { x: CONFIG.spawnLocations.level1.x, z: CONFIG.spawnLocations.level1.z },
    direction: CONFIG.spawnLocations.level1.direction,
    fogOfWar: {},
    trapsTriggered: {},
    autoplayEnabled: CONFIG.gameplay.autoplayEnabled,
    soundEnabled: CONFIG.gameplay.soundEnabled,
    isNewGame: true,
    rngSeed: 1337,
  };
}

function itemById(id) {
  return ITEMS[id] || Object.values(ITEMS).find(item => item.id === id) || { id, name: id };
}

function enemyById(id) {
  return Object.values(ENEMIES).find(enemy => enemy.id === id) || ENEMIES[id] || ENEMIES.dataImp;
}

function addMessage(text, color = COLORS.cyan) {
  messages.unshift({ text, color, ttl: 6 });
  messages = messages.slice(0, 7);
}

function addFloatingText(text, x, z, color = COLORS.white) {
  floatingTexts.push({ text, x, z, y: 2.5, color, ttl: 1.2 });
}

function saveGame(label = 'Memory Beacon') {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        label,
        state,
      })
    );
    addMessage(`Saved at ${label}.`, COLORS.green);
    return true;
  } catch {
    addMessage('Save unavailable in this host.', COLORS.orange);
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    state = parsed.state || createInitialState();
    map = getCurrentMap();
    buildLevel();
    setScreen('game', `Game loaded from ${parsed.label || 'save data'}.`);
    return true;
  } catch {
    addMessage('Save data could not be loaded.', COLORS.red);
    return false;
  }
}

function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

function generateDynamicLevel(levelName) {
  if (generatedMaps[levelName]) return generatedMaps[levelName];
  const size = 15;
  const levelNo = Number(levelName.replace('level', '')) || 2;
  const result = Array.from({ length: size }, (_, z) =>
    Array.from({ length: size }, (_, x) =>
      x === 0 || z === 0 || x === size - 1 || z === size - 1 ? 0 : 1
    )
  );
  let seed = levelNo * 97;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let z = 2; z < size - 2; z++) {
    for (let x = 2; x < size - 2; x++) {
      if ((x === 1 && z === 1) || (x === 12 && z === 12)) continue;
      if (next() < 0.26) result[z][x] = 0;
    }
  }
  for (let i = 1; i < size - 1; i++) {
    result[1][i] = 1;
    result[i][1] = 1;
    result[7][i] = 1;
  }
  generatedMaps[levelName] = result;
  dynamicSpecialLocations[levelName] = [
    { x: 7, z: 7, type: 'save_point', name: levelName === 'level2' ? 'Data Nexus' : 'Core Access' },
    ...(levelName === 'level2'
      ? [{ x: 12, z: 12, type: 'portal', name: 'Level Portal', targetLevel: 'level3' }]
      : []),
    { x: 5, z: 10, type: 'treasure', itemId: 'mana_potion' },
    { x: 10, z: 5, type: 'trap', damage: 12, triggerOnce: true },
  ];
  return result;
}

function getCurrentMap() {
  const source = CONFIG.dungeonMaps[state.currentLevel];
  if (source === 'dynamic') return generateDynamicLevel(state.currentLevel);
  return source;
}

function getSpecialLocations() {
  return (
    dynamicSpecialLocations[state.currentLevel] || CONFIG.specialLocations[state.currentLevel] || []
  );
}

function isWall(x, z) {
  const row = map[z];
  return !row || row[x] === undefined || row[x] === 0;
}

function worldX(x) {
  return x * TILE_SIZE;
}

function worldZ(z) {
  return z * TILE_SIZE;
}

function cellToWorld(x, z) {
  return { x: worldX(x), z: worldZ(z) };
}

function destroyMeshes(list) {
  const destroyMesh = ns('scene.destroyMesh');
  for (const id of list) {
    try {
      destroyMesh?.(id);
    } catch {}
  }
  list.length = 0;
}

function createMesh(kind, ...args) {
  const scene = ns('scene');
  let id = null;
  if (kind === 'cube') id = scene?.createCube?.(...args);
  if (kind === 'sphere') id = scene?.createSphere?.(...args);
  if (kind === 'cylinder') id = scene?.createCylinder?.(...args);
  if (kind === 'cone') id = scene?.createCone?.(...args);
  if (kind === 'torus') id = scene?.createTorus?.(...args);
  if (kind === 'plane') id = scene?.createPlane?.(...args);
  if (id) meshes.push(id);
  return id;
}

function loadSceneModel(url, position, scale, targetList, fallbackIds, tokenKind, callbacks = {}) {
  const loadModel = ns('scene.loadModel');
  if (typeof loadModel !== 'function' || !url) return false;
  const token = tokenKind === 'combat' ? combatAssetToken : levelAssetToken;
  Promise.resolve(loadModel(url, position, scale))
    .then(id => {
      const activeToken = tokenKind === 'combat' ? combatAssetToken : levelAssetToken;
      if (!id || token !== activeToken) {
        if (id) call('scene.destroyMesh', null, id);
        return;
      }
      targetList.push(id);
      loadedModelCount++;
      for (const fallback of fallbackIds || []) call('scene.setMeshVisible', null, fallback, false);
      callbacks.onLoaded?.(id);
    })
    .catch(() => {
      failedModelCount++;
      callbacks.onFailed?.();
    });
  return true;
}

function styleCombatSceneModel(id, enemy) {
  const getMesh = ns('scene.getMesh');
  const mesh = typeof getMesh === 'function' ? getMesh(id) : null;
  const THREE = globalThis.THREE;
  if (!THREE?.Color || !THREE?.DoubleSide) return;
  if (!mesh?.traverse) return;
  const color = new THREE.Color(enemy.color || 0x00ffff);
  // Preserve the GLB's original PBR materials (albedo maps, normal maps,
  // etc.) so the enemy renders with full texture detail. We just give the
  // material a faint signature-colour emissive for a rim hint and force
  // double-sided so thin geometry doesn't disappear. Emissive is kept very
  // low (0.08) because the combat bloom pass will amplify any glow.
  mesh.traverse(child => {
    if (!child.isMesh) return;
    child.frustumCulled = false;
    child.renderOrder = 100;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of materials) {
      if (!mat) continue;
      mat.side = THREE.DoubleSide;
      if (mat.emissive && typeof mat.emissiveIntensity === 'number') {
        mat.emissive.copy(color);
        mat.emissiveIntensity = 0.08;
      }
      if (typeof mat.toneMapped === 'boolean') mat.toneMapped = true;
      mat.needsUpdate = true;
    }
  });
}

function createCubeMesh(width, height, depth, color, position, options = {}) {
  const materialOptions =
    (isBabylonBackend() || isNativeHost()) && options.emissive !== undefined
      ? { ...options, emissiveIntensity: options.emissiveIntensity ?? 0.95 }
      : options;
  return createMesh('cube', width, height, depth, color, position, materialOptions);
}

function addGridLine(width, height, depth, color, position) {
  createCubeMesh(width, height, depth, color, position, {
    emissive: color,
    emissiveIntensity: isBabylonBackend() || isNativeHost() ? 2.25 : undefined,
    roughness: 0.35,
    metalness: 0.05,
  });
}

function setupScene() {
  call('scene.setClearColor', null, 0x1f4f9a);
  call('light.setAmbientLight', null, 0x0de7ff, 1.45);
  call('light.setLightDirection', null, -0.4, -1, -0.2);
  call('light.setLightColor', null, 0x77ddff);
  call('light.setFog', null, 0x071225, 10, 42);
  call('camera.setCameraFOV', null, 110);
  if (ns('fx.enableFXAA')) call('fx.enableFXAA', null);
  if (ns('fx.enableBloom')) {
    if (isNativeHost()) call('fx.enableBloom', null, 0.72, 0.85, 0.18);
    else call('fx.enableBloom', null, 0.28, 0.5, 0.35);
  }
  if (isNativeHost() && ns('fx.setColorAdjustment')) {
    call('fx.setColorAdjustment', null, 1.04, 1.14, 1.26);
  }
}

function setupCombatLighting() {
  destroyCombatLights();
  // Note: do NOT toggle fx.setEffectsBypass during combat. On at least one
  // GPU/driver the bypass DIRECT render path wipes the canvas to black; let
  // the composer keep running. With alpha:false locked, the alpha=0 quirk
  // that bypass was working around is moot.
  //
  // Lighting tuned for GLB enemy PBR textures: low ambient so albedo isn't
  // washed out, two coloured rim lights (cyan key + magenta fill) at
  // moderate intensity so textures stay readable, and a dim warm back light
  // for definition. The bloom strength is also dropped during combat (see
  // below) so the rim highlights don't blow out into glare.
  call('light.setAmbientLight', null, 0xffffff, 0.35);
  call('light.setLightDirection', null, -0.15, -0.55, -0.9);
  call('light.setLightColor', null, 0xb39dff);
  const lights = [
    // Cyan key light from above-left of the enemy line.
    call('light.createPointLight', null, 0x66e0ff, 1.4, 10, -2.5, 3.0, 2.0),
    // Magenta fill from above-right.
    call('light.createPointLight', null, 0xff66dd, 1.2, 10, 2.5, 3.0, 2.0),
    // Soft warm back light to separate models from the purple skybox.
    call('light.createPointLight', null, 0xffd28a, 0.7, 12, 0, 1.2, -5.0),
  ];
  combatLights = lights.filter(id => id !== null && id !== undefined && id !== false);
  // Drop bloom intensity for combat — at the dungeon's 0.7 strength on this
  // flat purple sky everything blooms into white glare. Restore on exit.
  if (ns('fx.setBloomStrength')) call('fx.setBloomStrength', null, 0.18);
}

function destroyCombatLights() {
  for (const id of combatLights) call('light.removeLight', null, id);
  combatLights = [];
}

function setLevelLightsVisible(visible) {
  for (const id of levelLights) call('light.setLightVisible', null, id, visible);
}

// ─── Battle scene swap ───────────────────────────────────────────────────
// Mirrors the reference game's SkyboxBattleSceneManager: when combat starts
// we hide the dungeon meshes (otherwise walls/ceiling occlude the camera
// looking at the enemy GLBs) and stand up a procedural cyberpunk skybox
// around the combat camera. On exit we destroy the skybox and re-show the
// dungeon. Used by startCombat / setScreen('combat'->elsewhere).

function hideDungeonForCombat() {
  if (hiddenLevelMeshes.length) return; // already hidden
  const all = [...meshes, ...specialMeshes];
  for (const id of all) {
    if (id === null || id === undefined || id === false) continue;
    call('scene.setMeshVisible', null, id, false);
    hiddenLevelMeshes.push(id);
  }
  setLevelLightsVisible(false);
}

function restoreDungeonAfterCombat() {
  for (const id of hiddenLevelMeshes) call('scene.setMeshVisible', null, id, true);
  hiddenLevelMeshes = [];
  setLevelLightsVisible(true);
}

function enterBattleScene() {
  // Hide the dungeon meshes so walls don't occlude the combat camera's view
  // of the GLB enemies — the camera at (0,1.3,3) looks toward z=-1.15 right
  // through where dungeon walls and ceiling tiles sit at world origin. The
  // scene still has the GLB enemies + the skybox so the 3D pipeline has work
  // to do (an actually-empty scene caused render issues on at least one GPU).
  hideDungeonForCombat();
  buildCombatSky();
}

let combatSkyActive = false;
function buildCombatSky() {
  if (combatSkyActive) return;
  // Set scene.background to the combat purple — THREE renders this as a
  // fullscreen quad before any scene meshes, no lighting required. On GPUs
  // that honour scene.background the player sees a flat cyberpunk-purple sky
  // behind the GLB enemies; on GPUs that silently drop it (one driver we
  // tested does this), the dungeon walls show through instead, which is a
  // gracefully-degraded look rather than a broken render.
  if (ns('light.createSolidSkybox')) {
    call('light.createSolidSkybox', null, 0x6a1aa6);
  }
  combatSkyActive = true;
}

function destroyCombatSky() {
  if (!combatSkyActive) return;
  if (ns('light.clearSkybox')) {
    call('light.clearSkybox', null);
  }
  combatSkyActive = false;
}

function exitBattleScene() {
  restoreDungeonAfterCombat();
  destroyCombatSky();
  // Restore the dungeon's normal bloom strength (setupScene() applies 0.28).
  if (ns('fx.setBloomStrength')) call('fx.setBloomStrength', null, 0.28);
  if (ns('fx.setEffectsBypass')) call('fx.setEffectsBypass', null, false);
}

// Per-frame idempotent re-assertion of combat-scene state. Called from
// drawCombat. Keeps the skybox, camera, and composer state alive even if
// setScreen / updateMovement / setupScene races with us and strips them.
function assertCombatRenderState() {
  if (screen !== 'combat') return;
  if (!combatSkyActive) buildCombatSky();
  // Force the combat camera every frame. Normal random encounters trigger
  // startCombat from inside updateMovement, and the trailing updateCamera()
  // call would otherwise snap the camera back to the player's dungeon
  // position — leaving the GLB enemies at (x, 0.35, -1.15) off-screen and
  // the player staring at a corridor. forceCombat from the dev console
  // worked because nothing else touched the camera that frame.
  updateCombatCamera();
  // Keep the composer in charge of presenting pixels — fx.setEffectsBypass
  // (true) was tried earlier and on at least one GPU it wipes the canvas to
  // opaque black. With alpha:false locked on the canvas context, the
  // composer's alpha=0 output quirk that bypass was working around is moot.
  if (ns('fx.setEffectsBypass') && ns('fx.isEffectsBypassed')?.() === true) {
    call('fx.setEffectsBypass', null, false);
  }
}

function buildLevel() {
  levelAssetToken++;
  destroyMeshes(meshes);
  destroyMeshes(specialMeshes);
  destroyMeshes(enemyMeshes);
  for (const id of levelLights) call('light.removeLight', null, id);
  levelLights = [];
  map = getCurrentMap();
  setupScene();

  const w = map[0].length;
  const h = map.length;

  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const p = cellToWorld(x, z);
      if (map[z][x] === 0) {
        createWallCell(x, z, p);
      } else {
        createOpenCell(x, z, p);
      }
    }
  }

  for (const loc of getSpecialLocations()) {
    const p = cellToWorld(loc.x, loc.z);
    let id;
    if (loc.type === 'portal') {
      id = createMesh('torus', 1, COLORS.magenta, [p.x, 1.2, p.z]);
      if (!id) id = createMesh('sphere', 0.65, COLORS.magenta, [p.x, 1.2, p.z], 12);
    } else if (loc.type === 'save_point') {
      id = createMesh('cylinder', 0.45, 0.45, 1.4, COLORS.green, [p.x, 0.7, p.z]);
    } else if (loc.type === 'treasure') {
      id = createMesh('cube', 0.8, COLORS.yellow, [p.x, 0.45, p.z]);
    } else {
      id = createMesh('cone', 0.5, 0.9, COLORS.red, [p.x, 0.45, p.z]);
    }
    if (id) {
      specialMeshes.push(id);
      if (loc.model) {
        loadSceneModel(
          loc.model,
          [p.x, 0.5, p.z],
          loc.type === 'portal' ? 0.65 : 0.45,
          specialMeshes,
          [id],
          'level'
        );
      }
      const lightId = call(
        'light.createPointLight',
        null,
        loc.type === 'portal'
          ? COLORS.magenta
          : loc.type === 'save_point'
            ? COLORS.green
            : COLORS.yellow,
        1.1,
        p.x,
        1.6,
        p.z
      );
      if (lightId !== null && lightId !== undefined && lightId !== false) levelLights.push(lightId);
    }
  }

  ensureFog();
  updateCamera(true);
  syncDebugState();
}

function createOpenCell(x, z, p) {
  const base = (x + z) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
  createCubeMesh(1, 0.025, 1, base, [p.x, -0.018, p.z], {
    emissive: 0x00151f,
    roughness: 0.45,
  });
  addGridLine(1, 0.018, 0.025, COLORS.floorGrid, [p.x, 0.006, p.z - 0.5]);
  addGridLine(0.025, 0.018, 1, 0x4fc3f7, [p.x - 0.5, 0.008, p.z]);
  createCubeMesh(1, 0.025, 1, COLORS.ceiling, [p.x, 1.005, p.z], {
    emissive: 0x061b3d,
    roughness: 0.6,
  });
}

function createWallCell(x, z, p) {
  const color = (x + z) % 2 === 0 ? COLORS.wall : COLORS.wallAlt;
  createCubeMesh(1, 1, 1, color, [p.x, 0.5, p.z], {
    emissive: (x + z) % 2 === 0 ? 0x13002a : 0x001f1f,
    roughness: 0.4,
  });

  if (!isWall(x, z - 1)) addWallFaceGrid(p, 'north');
  if (!isWall(x, z + 1)) addWallFaceGrid(p, 'south');
  if (!isWall(x - 1, z)) addWallFaceGrid(p, 'west');
  if (!isWall(x + 1, z)) addWallFaceGrid(p, 'east');
}

function addWallFaceGrid(p, side) {
  const cyan = COLORS.floorGrid;
  const magenta = COLORS.magenta;
  if (side === 'north' || side === 'south') {
    const z = p.z + (side === 'north' ? -0.512 : 0.512);
    addGridLine(1, 0.018, 0.018, cyan, [p.x, 0.18, z]);
    addGridLine(1, 0.018, 0.018, magenta, [p.x, 0.52, z]);
    addGridLine(1, 0.018, 0.018, cyan, [p.x, 0.86, z]);
    addGridLine(0.018, 1, 0.018, cyan, [p.x - 0.5, 0.5, z]);
    addGridLine(0.018, 1, 0.018, magenta, [p.x, 0.5, z]);
    addGridLine(0.018, 1, 0.018, cyan, [p.x + 0.5, 0.5, z]);
  } else {
    const x = p.x + (side === 'west' ? -0.512 : 0.512);
    addGridLine(0.018, 0.018, 1, cyan, [x, 0.18, p.z]);
    addGridLine(0.018, 0.018, 1, magenta, [x, 0.52, p.z]);
    addGridLine(0.018, 0.018, 1, cyan, [x, 0.86, p.z]);
    addGridLine(0.018, 1, 0.018, cyan, [x, 0.5, p.z - 0.5]);
    addGridLine(0.018, 1, 0.018, magenta, [x, 0.5, p.z]);
    addGridLine(0.018, 1, 0.018, cyan, [x, 0.5, p.z + 0.5]);
  }
}

function syncDebugState() {
  globalThis.__INDIE_ODYSSEY_STATE = {
    screen,
    level: state?.currentLevel,
    position: state ? { ...state.position } : null,
    direction: state?.direction,
    difficulty: selectedDifficulty,
    meshCount: meshes.length + specialMeshes.length + enemyMeshes.length,
    loadedModelCount,
    failedModelCount,
    storyFrameStatus: storyFrameImage.status,
    storyFrame: storyFrameImage.src,
    storyTransition: storyTransition
      ? {
          from: storyTransition.from?.image || null,
          to: storyTransition.to?.image || null,
          progress: storyTransition.t / storyTransition.duration,
        }
      : null,
    transition: transition
      ? {
          label: transition.label,
          type: transition.type || 'pixel',
          progress: transition.t / transition.duration,
        }
      : null,
    glitchPulse: glitchPulse
      ? { intensity: glitchPulse.intensity, progress: glitchPulse.t / glitchPulse.duration }
      : null,
    combatEnemyAssets:
      combat?.enemies.map(enemy => ({
        id: enemy.id,
        modelStatus: enemy.modelStatus || 'none',
        spriteStatus: combatSpriteStatus.get(enemy.sprite) || 'idle',
      })) || [],
    inCombat: !!combat,
  };
}

function createMeshCompat(kind, ...args) {
  const scene = ns('scene');
  if (kind === 'torus' && scene?.createTorus) return scene.createTorus(...args);
  return null;
}

function ensureFog() {
  const key = state.currentLevel;
  if (!state.fogOfWar[key]) state.fogOfWar[key] = map.map(row => row.map(() => false));
  updateFog(state.position.x, state.position.z);
}

function updateFog(x, z) {
  const fog = state.fogOfWar[state.currentLevel];
  if (!fog) return;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (fog[z + dz]?.[x + dx] !== undefined) fog[z + dz][x + dx] = true;
    }
  }
}

function updateCamera(immediate = false) {
  // Don't stomp on the combat camera. Without this guard, a random
  // encounter triggered at the end of player movement (see updateMovement)
  // sets the combat camera via startCombat → updateCombatCamera, but then
  // the trailing updateCamera() call snaps the camera back to the player's
  // dungeon position and the GLB enemies render off-screen.
  if (screen === 'combat') return;
  const p = cellToWorld(state.position.x, state.position.z);
  const dir = DIRS[state.direction];
  const cam = { x: p.x, y: CAMERA_HEIGHT, z: p.z };
  if (moveAnim && !immediate) {
    cam.x = moveAnim.current.x;
    cam.z = moveAnim.current.z;
  }
  call('camera.setCameraPosition', null, cam.x, cam.y, cam.z);
  call(
    'camera.setCameraTarget',
    null,
    cam.x + dir.x * TILE_SIZE,
    CAMERA_HEIGHT,
    cam.z + dir.z * TILE_SIZE
  );
}

function updateCombatCamera() {
  call('camera.setCameraPosition', null, 0, 1.3, 3.0);
  call('camera.setCameraTarget', null, 0, 0.85, -1.15);
  call('camera.setCameraFOV', null, 54);
}

function enqueueAction(action) {
  if (combat || screen !== 'game') return;
  if (moveAnim) {
    queuedAction = action;
    return;
  }
  const dir = state.direction;
  if (action === 'turnLeft') startRotate((dir + 3) % 4);
  if (action === 'turnRight') startRotate((dir + 1) % 4);
  if (action === 'moveForward') startMove(dir);
  if (action === 'moveBackward') startMove((dir + 2) % 4);
  if (action === 'moveLeft') startMove((dir + 3) % 4);
  if (action === 'moveRight') startMove((dir + 1) % 4);
}

function startRotate(newDir) {
  moveAnim = {
    type: 'rotate',
    t: 0,
    duration: ROTATE_TIME,
    fromDir: state.direction,
    toDir: newDir,
    current: cellToWorld(state.position.x, state.position.z),
  };
}

function startMove(dirIndex) {
  const dir = DIRS[dirIndex];
  const fromCell = { ...state.position };
  const toCell = { x: fromCell.x + dir.x, z: fromCell.z + dir.z };
  const blocked = isWall(toCell.x, toCell.z);
  const from = cellToWorld(fromCell.x, fromCell.z);
  const to = blocked
    ? { x: from.x + dir.x * TILE_SIZE * 0.16, z: from.z + dir.z * TILE_SIZE * 0.16 }
    : cellToWorld(toCell.x, toCell.z);
  moveAnim = {
    type: blocked ? 'bump' : 'move',
    t: 0,
    duration: MOVE_TIME,
    from,
    to,
    targetCell: toCell,
    current: { ...from },
  };
}

function updateMovement(dt) {
  if (!moveAnim) return;
  moveAnim.t += dt;
  const p = Math.min(1, moveAnim.t / moveAnim.duration);
  const eased = 0.5 - Math.cos(p * Math.PI) * 0.5;
  if (moveAnim.type === 'rotate') {
    if (p >= 1) {
      state.direction = moveAnim.toDir;
      moveAnim = null;
    }
    updateCamera(true);
  } else if (moveAnim.type === 'bump') {
    const b = p < 0.5 ? eased * 2 : (1 - eased) * 2;
    moveAnim.current = {
      x: moveAnim.from.x + (moveAnim.to.x - moveAnim.from.x) * b,
      z: moveAnim.from.z + (moveAnim.to.z - moveAnim.from.z) * b,
    };
    if (p >= 1) {
      moveAnim = null;
      addMessage('Wall: access denied.', COLORS.orange);
    }
    updateCamera();
  } else {
    moveAnim.current = {
      x: moveAnim.from.x + (moveAnim.to.x - moveAnim.from.x) * eased,
      z: moveAnim.from.z + (moveAnim.to.z - moveAnim.from.z) * eased,
    };
    if (p >= 1) {
      state.position = { ...moveAnim.targetCell };
      moveAnim = null;
      updateFog(state.position.x, state.position.z);
      checkPositionTriggers();
      maybeRandomEncounter();
    }
    updateCamera();
  }
  if (!moveAnim && queuedAction) {
    const action = queuedAction;
    queuedAction = null;
    enqueueAction(action);
  }
}

function checkPositionTriggers() {
  const loc = getSpecialLocations().find(
    item => item.x === state.position.x && item.z === state.position.z
  );
  if (!loc) return;
  if (loc.type === 'portal') {
    transitionToLevel(loc.targetLevel || 'level1');
  } else if (loc.type === 'save_point') {
    saveGame(loc.name || 'Memory Beacon');
  } else if (loc.type === 'treasure') {
    addItem(loc.itemId || 'health_potion', 1);
    addMessage(`Found ${itemById(loc.itemId || 'health_potion').name}.`, COLORS.yellow);
  } else if (loc.type === 'trap') {
    const key = `${state.currentLevel}:${loc.x}:${loc.z}`;
    if (!loc.triggerOnce || !state.trapsTriggered[key]) {
      state.trapsTriggered[key] = true;
      damagePlayer(loc.damage || 10, 'Trap triggered!');
    }
  }
}

function transitionToLevel(level) {
  state.currentLevel = level;
  const spawn = CONFIG.spawnLocations[level] || { x: 1, z: 1, direction: 0 };
  state.position = { x: spawn.x, z: spawn.z };
  state.direction = spawn.direction % 4;
  transition = { t: 0, duration: 0.8, label: `Entering ${level}` };
  const story = CONFIG.storyMode.levels[level];
  buildLevel();
  if (story && story.length) {
    resetStoryFlow(story);
    setScreen('story');
  } else {
    setScreen('game', `Entered ${level}.`);
  }
}

function maybeRandomEncounter() {
  const mods =
    CONFIG.gameplay.difficultyModifiers[selectedDifficulty] ||
    CONFIG.gameplay.difficultyModifiers.normal;
  if (rand() < CONFIG.gameplay.encounterRate * mods.encounterRateMultiplier) {
    const pool =
      state.currentLevel === 'level1'
        ? ['data_imp', 'glitch_rat', 'firewall_oger']
        : ['hex_wraith', 'necro_scribe', 'rogue_protocol'];
    startCombat([pool[Math.floor(rand() * pool.length)]]);
  }
}

function addItem(id, count = 1) {
  const existing = state.inventory.find(item => item.id === id);
  if (existing) existing.count += count;
  else state.inventory.push({ id, count });
}

function removeItem(id, count = 1) {
  const existing = state.inventory.find(item => item.id === id);
  if (!existing || existing.count < count) return false;
  existing.count -= count;
  if (existing.count <= 0) state.inventory = state.inventory.filter(item => item !== existing);
  return true;
}

function damagePlayer(amount, message) {
  state.avatar.health = Math.max(0, state.avatar.health - amount);
  flash = { t: 0, duration: 0.35, color: COLORS.red, intensity: Math.min(1, amount / 25) };
  triggerGlitch(amount / 20);
  addMessage(`${message} ${amount} damage.`, COLORS.red);
  if (state.avatar.health <= 0) setScreen('death');
}

function healPlayer(amount) {
  state.avatar.health = Math.min(state.avatar.maxHealth, state.avatar.health + amount);
  addMessage(`Recovered ${amount} health.`, COLORS.green);
}

function restoreMana(amount) {
  state.avatar.mana = Math.min(state.avatar.maxMana, state.avatar.mana + amount);
  addMessage(`Recovered ${amount} mana.`, COLORS.cyan);
}

function addExperience(amount) {
  const mods =
    CONFIG.gameplay.difficultyModifiers[selectedDifficulty] ||
    CONFIG.gameplay.difficultyModifiers.normal;
  const gained = Math.round(amount * mods.expGainMultiplier);
  state.avatar.experience += gained;
  addMessage(`Gained ${gained} XP.`, COLORS.yellow);
  if (state.avatar.experience >= state.avatar.experienceToNextLevel) {
    state.avatar.experience -= state.avatar.experienceToNextLevel;
    state.avatar.level++;
    state.avatar.experienceToNextLevel = Math.floor(state.avatar.experienceToNextLevel * 1.5);
    state.avatar.maxHealth += 10;
    state.avatar.maxMana += 5;
    state.avatar.health = state.avatar.maxHealth;
    state.avatar.mana = state.avatar.maxMana;
    setScreen('levelUp');
  }
}

function startCombat(enemyIds) {
  combat = {
    enemies: enemyIds.map((id, index) => {
      const template = enemyById(id);
      const mods =
        CONFIG.gameplay.difficultyModifiers[selectedDifficulty] ||
        CONFIG.gameplay.difficultyModifiers.normal;
      const hp = Math.round(template.hp * mods.enemyHealthMultiplier);
      return {
        ...template,
        hp,
        maxHp: hp,
        attack: Math.round(template.attack * mods.enemyDamageMultiplier),
        index,
        statusEffects: [],
      };
    }),
    selectedEnemy: 0,
    selectedAction: 'attack',
    selectedSpell: 'fireball',
    log: [],
    playerDefending: false,
    busy: false,
  };
  screen = 'combat';
  combatAssetToken++;
  enterBattleScene();
  setupCombatLighting();
  updateCombatCamera();
  destroyMeshes(enemyMeshes);
  // Combat enemy rendering policy (recipe for other carts):
  //   1. If the enemy ships a `model` URL, always load it into the main scene
  //      via nova64.scene.loadModel. The combat overlay stays transparent in
  //      the enemy stage area so the GLB is the primary visible layer.
  //   2. Blit the 2D pixel-art sprite only while the GLB is loading, failed,
  //      or absent. This keeps Godot/browser parity without hiding models.
  //   3. Do NOT stand up a second THREE.WebGLRenderer for combat — the
  //      extra WebGL context conflicts with the main scene render on some
  //      browsers and produces no output on babylon (see git history for
  //      the removed combatModelOverlay).
  // GLB layout: spacing keeps meshes from intersecting; scale 1.4 fits the
  // figures comfortably inside the combat panel's transparent middle band.
  const spacing = 4.0;
  const enemyScale = 1.4;
  combat.enemies.forEach((enemy, i) => {
    const x = (i - (combat.enemies.length - 1) / 2) * spacing;
    const z = -1.15;
    ensureCombatSpriteImage(enemy.sprite);
    if (!enemy.model) {
      enemy.modelStatus = 'none';
      return;
    }
    enemy.modelStatus = 'loading';
    loadSceneModel(enemy.model, [x, 0.35, z], enemyScale, enemyMeshes, [], 'combat', {
      onLoaded: id => {
        enemy.modelMeshId = id;
        enemy.modelStatus = 'ready';
        styleCombatSceneModel(id, enemy);
        syncDebugState();
      },
      onFailed: () => {
        enemy.modelStatus = 'error';
        syncDebugState();
      },
    });
  });
  combatLog(`Combat started: ${combat.enemies.map(e => e.name).join(', ')}`);
  triggerCombatTransition();
}

function combatLog(text) {
  if (!combat) return;
  combat.log.unshift(text);
  combat.log = combat.log.slice(0, 8);
  addMessage(text, COLORS.cyan);
}

function livingEnemies() {
  return combat ? combat.enemies.filter(e => e.hp > 0) : [];
}

function selectedEnemy() {
  const live = livingEnemies();
  if (!live.length) return null;
  if (!live[combat.selectedEnemy] || live[combat.selectedEnemy].hp <= 0) combat.selectedEnemy = 0;
  return live[combat.selectedEnemy];
}

function executeCombatAction(action = combat?.selectedAction) {
  if (!combat || combat.busy) return;
  combat.selectedAction = action;
  combat.busy = true;
  combat.playerDefending = false;
  const enemy = selectedEnemy();
  let ended = false;

  if (action === 'attack') {
    const weapon = itemById(state.equippedItems.weapon);
    let damage = Math.max(
      1,
      state.avatar.stats.strength + (weapon.damage || 0) - (enemy.defense || 0) / 2
    );
    damage = Math.round(damage * (0.9 + rand() * 0.2));
    if (rand() < 0.05) damage *= 2;
    enemy.hp = Math.max(0, enemy.hp - damage);
    addFloatingText(`-${damage}`, enemy.index, -2, COLORS.red);
    combatLog(`IO attacks ${enemy.name} for ${damage}.`);
  } else if (action === 'cast') {
    const spell = SPELLS[combat.selectedSpell] || SPELLS.fireball;
    if (state.avatar.mana < spell.manaCost) {
      combatLog(`Not enough mana for ${spell.name}.`);
      combat.busy = false;
      return;
    }
    state.avatar.mana -= spell.manaCost;
    if (spell.type === 'healing') {
      healPlayer(spell.healing);
      combatLog(`IO casts ${spell.name}.`);
    } else {
      const targets = spell.aoe ? livingEnemies() : [enemy];
      targets.forEach(target => {
        const damage = Math.max(1, spell.damage + state.avatar.stats.intelligence - target.defense);
        target.hp = Math.max(0, target.hp - damage);
        combatLog(`${spell.name} hits ${target.name} for ${damage}.`);
      });
    }
  } else if (action === 'item') {
    const item = state.inventory.map(i => itemById(i.id)).find(i => i.effect);
    if (!item || !removeItem(item.id)) {
      combatLog('No usable items.');
      combat.busy = false;
      return;
    }
    if (item.effect.type === 'heal') healPlayer(item.effect.value);
    if (item.effect.type === 'mana') restoreMana(item.effect.value);
  } else if (action === 'defend') {
    combat.playerDefending = true;
    combatLog('IO braces behind a neon shield.');
  } else if (action === 'run') {
    const chance = 0.3 + state.avatar.stats.dexterity * 0.02;
    if (rand() < chance) {
      combatLog('IO escapes the encounter.');
      endCombat(false, true);
      return;
    }
    combatLog('Escape failed.');
  }

  if (livingEnemies().length === 0) {
    endCombat(true);
    ended = true;
  }
  if (!ended) {
    setTimeoutCompat(() => enemyTurn(), 500);
  }
}

function enemyTurn() {
  if (!combat) return;
  for (const enemy of livingEnemies()) {
    const abilityId =
      enemy.abilities?.length && rand() < 0.55
        ? enemy.abilities[Math.floor(rand() * enemy.abilities.length)]
        : 'attack';
    const ability = ABILITIES[abilityId];
    if (ability?.id === 'flee' && rand() < (ability.effect?.chance || 0.4)) {
      enemy.hp = 0;
      combatLog(`${enemy.name} flees.`);
      continue;
    }
    let damage = ability?.damage || enemy.attack;
    damage = Math.max(
      1,
      damage - state.avatar.stats.constitution / (combat.playerDefending ? 1.2 : 2)
    );
    if (combat.playerDefending) damage *= 0.45;
    damage = Math.round(damage * (0.9 + rand() * 0.2));
    damagePlayer(damage, enemy.name);
    combatLog(`${enemy.name} uses ${ability?.name || 'Attack'} for ${damage}.`);
    if (state.avatar.health <= 0) return;
  }
  if (livingEnemies().length === 0) endCombat(true);
  else combat.busy = false;
}

function endCombat(victory, escaped = false) {
  if (!combat) return;
  if (victory) {
    const defeated = combat.enemies;
    let xp = 0;
    defeated.forEach(enemy => {
      xp += enemy.expValue || 0;
      (enemy.lootTable || []).forEach(id => {
        const mods =
          CONFIG.gameplay.difficultyModifiers[selectedDifficulty] ||
          CONFIG.gameplay.difficultyModifiers.normal;
        if (rand() < 0.5 * mods.lootDropRateMultiplier) addItem(id);
      });
    });
    addExperience(xp);
    addMessage('Victory in the Shardgrid.', COLORS.green);
  } else if (!escaped) {
    addMessage('Combat ended.', COLORS.muted);
  }
  combat = null;
  destroyMeshes(enemyMeshes);
  if (screen === 'combat') setScreen('game');
}

function triggerGlitch(intensity = 0.4) {
  glitchPulse = { t: 0, duration: 0.32, intensity: Math.max(0.15, Math.min(1, intensity)) };
  if (ns('fx.enableGlitch')) {
    call('fx.enableGlitch', null, intensity);
    setTimeoutCompat(() => call('fx.disableGlitch', null), 260);
  }
  if (ns('fx.enablePixelation')) {
    call('fx.enablePixelation', null, Math.max(1.5, 4 * intensity));
    setTimeoutCompat(() => call('fx.disablePixelation', null), 260);
  }
}

function triggerCombatTransition() {
  transition = { t: 0, duration: 0.7, label: 'COMBAT LINK', type: 'combat' };
  triggerGlitch(0.65);
}

function setTimeoutCompat(fn, ms) {
  if (typeof setTimeout === 'function') setTimeout(fn, ms);
  else fn();
}

function setScreen(next, message) {
  screen = next;
  if (message) addMessage(message);
  if (next === 'game') {
    destroyCombatLights();
    setupScene();
    updateCamera(true);
  }
  if (next !== 'story') {
    storyTransition = null;
    hideStoryFrameCanvas();
  }
  if (next !== 'combat') hideCombatSpriteCanvas();
  if (next !== 'combat') {
    destroyMeshes(enemyMeshes);
    exitBattleScene();
  }
  syncDebugState();
}

function pressed(keyp, ...codes) {
  return codes.some(code => keyp?.(code));
}

function handleInput() {
  const keyp = ns('input.keyp');
  const btnp = ns('input.btnp');
  if (!keyp && !btnp) return;

  if (screen === 'start') {
    if (pressed(keyp, 'ArrowLeft', 'KeyA')) cycleDifficulty(-1);
    if (pressed(keyp, 'ArrowRight', 'KeyD')) cycleDifficulty(1);
    if (pressed(keyp, 'Enter', 'Space') || btnp?.(0)) startNewGame();
    if (pressed(keyp, 'KeyC') && hasSave()) loadGame();
    return;
  }

  if (screen === 'story') {
    if (storyInputCooldown <= 0 && (pressed(keyp, 'Enter', 'Space') || btnp?.(0))) {
      storyInputCooldown = 0.35;
      advanceStory(true);
    }
    return;
  }

  if (screen === 'levelUp') {
    if (pressed(keyp, 'Enter', 'Space') || btnp?.(0)) {
      state.avatar.stats.strength++;
      state.avatar.stats.intelligence++;
      state.avatar.stats.dexterity++;
      state.avatar.stats.constitution++;
      state.avatar.stats.wisdom++;
      setScreen('game');
    }
    return;
  }

  if (screen === 'death') {
    if (pressed(keyp, 'Enter', 'Space') || btnp?.(0)) {
      if (!loadGame()) startNewGame();
    }
    return;
  }

  if (screen === 'inventory') {
    if (pressed(keyp, 'KeyI', 'Escape') || btnp?.(1)) setScreen('game');
    return;
  }

  if (screen === 'combat') {
    if (pressed(keyp, 'Digit1')) executeCombatAction('attack');
    if (pressed(keyp, 'Digit2')) executeCombatAction('cast');
    if (pressed(keyp, 'Digit3')) executeCombatAction('item');
    if (pressed(keyp, 'Digit4')) executeCombatAction('defend');
    if (pressed(keyp, 'Digit5')) executeCombatAction('run');
    if (pressed(keyp, 'Tab')) {
      const live = livingEnemies();
      if (live.length) combat.selectedEnemy = (combat.selectedEnemy + 1) % live.length;
    }
    if (pressed(keyp, 'KeyA')) toggleAutoplay();
    if (pressed(keyp, 'KeyT')) toggleAutoplay();
    handlePointerButtons();
    return;
  }

  if (pressed(keyp, 'KeyW', 'ArrowUp') || btnp?.(0)) enqueueAction('moveForward');
  if (pressed(keyp, 'KeyS', 'ArrowDown')) enqueueAction('moveBackward');
  if (pressed(keyp, 'KeyA')) enqueueAction('moveLeft');
  if (pressed(keyp, 'KeyD')) enqueueAction('moveRight');
  if (pressed(keyp, 'KeyQ', 'ArrowLeft')) enqueueAction('turnLeft');
  if (pressed(keyp, 'KeyE', 'ArrowRight')) enqueueAction('turnRight');
  if (pressed(keyp, 'KeyI')) setScreen('inventory');
  if (pressed(keyp, 'F5')) saveGame('Quick Save');
  if (pressed(keyp, 'KeyT')) toggleAutoplay();
  handlePointerButtons();
}

function handlePointerButtons() {
  const mouseDown = ns('input.mouseDown');
  const mousePressed = ns('input.mousePressed');
  const mx = ns('input.mouseX');
  const my = ns('input.mouseY');
  if (!mouseDown || !mx || !my) return;
  const down = mousePressed?.() || (mouseDown() && !lastMouseDown);
  lastMouseDown = mouseDown();
  if (!down) return;
  const x = mx();
  const y = my();
  const W = width();
  const H = height();
  if (screen === 'game') {
    if (hit(x, y, 24, H - 96, 52, 52)) enqueueAction('turnLeft');
    if (hit(x, y, 140, H - 96, 52, 52)) enqueueAction('turnRight');
    if (hit(x, y, 82, H - 150, 52, 52)) enqueueAction('moveForward');
    if (hit(x, y, 82, H - 42, 52, 52)) enqueueAction('moveBackward');
    if (hit(x, y, W - 106, H - 60, 82, 36)) setScreen('inventory');
    if (hitRect(x, y, autoButtonRect(W, H))) toggleAutoplay();
  } else if (screen === 'combat') {
    const actions = ['attack', 'cast', 'item', 'defend', 'run'];
    const buttons = combatActionButtonRects(W, H);
    for (let i = 0; i < buttons.length; i++) {
      if (hitRect(x, y, buttons[i])) {
        executeCombatAction(actions[i]);
        return;
      }
    }
    if (hitRect(x, y, combatAutoButtonRect(W, H))) toggleAutoplay();
  }
}

function hit(x, y, bx, by, bw, bh) {
  return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
}

function hitRect(x, y, r) {
  return r && hit(x, y, r.x, r.y, r.w, r.h);
}

function toggleAutoplay() {
  state.autoplayEnabled = !state.autoplayEnabled;
  addMessage(`Auto combat ${state.autoplayEnabled ? 'enabled' : 'disabled'}.`, COLORS.cyan);
  syncDebugState();
}

function autoButtonRect(W, H) {
  return { x: W - 106, y: H - 104, w: 82, h: 36 };
}

function combatActionButtonRects(W, H) {
  return ['attack', 'cast', 'item', 'defend', 'run'].map((_action, i) => ({
    x: W * 0.13 + i * 96,
    y: H * 0.68,
    w: 86,
    h: 32,
  }));
}

function combatAutoButtonRect(W, H) {
  return { x: W * 0.72, y: H * 0.68, w: 100, h: 32 };
}

function cycleDifficulty(delta) {
  const options = ['easy', 'normal', 'hard'];
  const index = options.indexOf(selectedDifficulty);
  selectedDifficulty = options[(index + delta + options.length) % options.length];
}

function startNewGame() {
  state = createInitialState();
  CONFIG.gameplay.difficulty = selectedDifficulty;
  generatedMaps = {};
  dynamicSpecialLocations = {};
  messages = [];
  buildLevel();
  const story = CONFIG.storyMode.levels.level1;
  resetStoryFlow(story);
  setScreen(story?.length ? 'story' : 'game');
}

function advanceStory(force = false) {
  if (storyTransition) {
    if (force) completeStoryTransition();
    return;
  }
  storyTimer += force ? 999 : 0;
  const story = CONFIG.storyMode.levels[state.currentLevel] || CONFIG.storyMode.levels.level1 || [];
  if (storyTimer >= CONFIG.storyMode.frameDuration || force) {
    storyTimer = 0;
    const nextIndex = storyIndex + 1;
    if (nextIndex >= story.length) {
      setScreen('game', 'Shardgrid link established.');
    } else {
      beginStoryTransition(story, nextIndex);
    }
  }
}

function resetStoryFlow(story) {
  storyIndex = 0;
  storyTimer = 0;
  storyInputCooldown = 0;
  storyTransition = null;
  if (Array.isArray(story)) {
    preloadStoryImage(story[0]?.image);
    preloadStoryImage(story[1]?.image);
  }
}

function beginStoryTransition(story, nextIndex) {
  const from = story[storyIndex];
  const to = story[nextIndex];
  preloadStoryImage(to?.image);
  storyTransition = { from, to, nextIndex, t: 0, duration: 0.65 };
  syncDebugState();
}

function updateStoryTransition(dt) {
  if (!storyTransition) return;
  preloadStoryImage(storyTransition.to?.image);
  if (canUseBrowserCanvasOverlay() && !storyFrameCache.has(storyTransition.to?.image)) return;
  storyTransition.t += dt;
  if (storyTransition.t >= storyTransition.duration) completeStoryTransition();
}

function completeStoryTransition() {
  if (!storyTransition) return;
  storyIndex = storyTransition.nextIndex;
  storyTimer = 0;
  storyTransition = null;
  const story = CONFIG.storyMode.levels[state.currentLevel] || CONFIG.storyMode.levels.level1 || [];
  preloadStoryImage(story[storyIndex + 1]?.image);
  syncDebugState();
}

function width() {
  return call('draw.screenWidth', 640);
}

function height() {
  return call('draw.screenHeight', 360);
}

function drawText(text, x, y, color = COLORS.white, size = 12) {
  call('draw.print', null, text, x, y, uiColor(color), textScale(size));
}

function drawCentered(text, y, color = COLORS.white, size = 14) {
  const W = width();
  if (ns('draw.printCentered'))
    call('draw.printCentered', null, text, W / 2, y, uiColor(color), textScale(size));
  else drawText(text, Math.max(4, W / 2 - measureApprox(text, size) / 2), y, color, size);
}

function rect(x, y, w, h, color) {
  // Outline only — draw.rect fills by default on the native host, so pass the
  // explicit unfilled flag (rectfill/fill() is used where a solid box is wanted).
  call('draw.rect', null, x, y, w, h, uiColor(color), false);
}

function fill(x, y, w, h, color) {
  call('draw.rectfill', null, x, y, w, h, uiColor(color));
}

function line2d(x1, y1, x2, y2, color) {
  call('draw.line', null, x1, y1, x2, y2, uiColor(color));
}

function drawBar(x, y, w, h, value, max, color, label) {
  fill(x, y, w, h, 0x000000aa);
  fill(x + 1, y + 1, Math.max(0, (w - 2) * (value / max)), h - 2, color);
  rect(x, y, w, h, COLORS.cyan);
  drawText(`${label} ${Math.ceil(value)}/${max}`, x + 4, y + 4, COLORS.white, 10);
}

function drawPanel(x, y, w, h, title) {
  fill(x, y, w, h, COLORS.panel);
  rect(x, y, w, h, COLORS.cyan);
  if (title) drawText(title, x + 8, y + 8, COLORS.green, 12);
}

function drawCombatPanelChrome(W, H) {
  const px = W * 0.08;
  const py = H * 0.18;
  const pw = W * 0.84;
  const ph = H * 0.64;
  // Header band kept tight (~10% of screen) so enemy GLBs (projected to
  // ~30% from the top) land in the transparent middle, not behind chrome.
  const headerH = H * 0.1;
  // Footer band kept tight too — just enough for the action-button tray.
  const footerH = H * 0.16;
  const footerY = py + ph - footerH;
  fill(px, py, pw, headerH, COLORS.panel);
  fill(px, footerY, pw, footerH, COLORS.panel);
  rect(px, py, pw, ph, COLORS.cyan);
  drawText('COMBAT', px + 8, py + 8, COLORS.green, 12);
}

function drawButton(x, y, w, h, text, active = false) {
  fill(x, y, w, h, active ? overlayColor(0x00ffff, 102) : overlayColor(0x001a33, 170));
  rect(x, y, w, h, active ? COLORS.green : COLORS.cyan);
  drawCenteredIn(text, x, y, w, h, active ? COLORS.bg : COLORS.white, 11);
}

function drawCenteredIn(text, x, y, w, h, color, size) {
  if (
    drawSharedTextBox(text, x, y, w, h, color, size, {
      align: 'center',
      valign: 'middle',
      overflow: 'fit',
      minSize: 7,
    })
  ) {
    return;
  }
  drawText(
    text,
    x + Math.max(4, w / 2 - measureApprox(text, size) / 2),
    y + h / 2 - size / 2,
    color,
    size
  );
}

function textScale(size) {
  return Math.max(1, Math.min(4, Math.round(size / 7)));
}

function measureApprox(text, size) {
  return text.length * 6 * textScale(size);
}

function drawSharedTextBox(text, x, y, w, h, color, size, options = {}) {
  const textBox = ns('draw.textBox') || ns('draw.drawTextBox');
  if (typeof textBox !== 'function') return false;
  const minSize = Math.max(6, Math.min(size, options.minSize || size));
  textBox(text || '', x, y, w, h, {
    color: uiColor(color),
    scale: textScale(size),
    minScale: textScale(minSize),
    align: options.align || 'left',
    valign: options.valign || 'top',
    overflow:
      options.overflow || (options.fit ? 'fit' : options.ellipsis === false ? 'wrap' : 'ellipsis'),
  });
  return true;
}

function uiColor(color) {
  if (typeof color === 'bigint') return color;
  const rgba8 = ns('draw.rgba8');
  if (typeof rgba8 !== 'function' || typeof color !== 'number') return color;
  const packed =
    color > 0xffffff
      ? rgba8((color >>> 24) & 255, (color >>> 16) & 255, (color >>> 8) & 255, color & 255)
      : rgba8((color >>> 16) & 255, (color >>> 8) & 255, color & 255, 255);
  // On the native core, return packed RGBA as a BigInt: it promotes bare
  // 0xRRGGBB literals (used for 3D mesh colors) to 0xRRGGBBFF, but that
  // heuristic false-positives on rgba8() outputs whose red byte is 0 (cyan,
  // green, the navy panel fill) and turns them white/pink. The core skips
  // promotion for BigInt colors, keeping 2D UI colors exact. Web/Three keep the
  // plain Number (their draw layer does Number bitwise ops on it).
  return uiColorWantsBigInt() && typeof packed === 'number' ? BigInt(packed >>> 0) : packed;
}

// True only on the native core (it exposes getBackendCapabilities); the web
// backend has no such API and must receive plain Number colors.
let __uiColorBigInt = null;
function uiColorWantsBigInt() {
  if (__uiColorBigInt === null) {
    __uiColorBigInt =
      typeof BigInt === 'function' && typeof ns('scene.getBackendCapabilities') === 'function';
  }
  return __uiColorBigInt;
}

function overlayColor(rgb, alpha = 255) {
  const r = ((rgb >>> 16) & 255) / 255;
  const g = ((rgb >>> 8) & 255) / 255;
  const b = (rgb & 255) / 255;
  const a = Math.max(0, Math.min(255, alpha)) / 255;
  if (isNativeHost()) return [r, g, b, a];
  return ((rgb & 0xffffff) << 8) + Math.round(a * 255);
}

function imageTint(alpha = 1) {
  const rgba8 = ns('draw.rgba8');
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return typeof rgba8 === 'function' ? rgba8(255, 255, 255, a) : 0xffffffff;
}

function drawStart() {
  const W = width();
  const H = height();
  fill(0, 0, W, H, 0x02040dff);
  for (let i = 0; i < 70; i++) {
    const x = (i * 97 + Math.floor(time * 24)) % W;
    const y = (i * 53) % H;
    fill(x, y, 2, 1, i % 3 === 0 ? COLORS.magenta : COLORS.cyan);
  }
  drawCentered('INDIE ODYSSEY: BOOK ONE', H * 0.22, COLORS.cyan, 22);
  drawCentered('Echoes of the Shardgrid', H * 0.3, COLORS.green, 14);
  drawPanel(W * 0.16, H * 0.4, W * 0.68, 78, 'SHARDGRID ACCESS TERMINAL');
  drawText('> shardgrid --enter Delta-7', W * 0.2, H * 0.48, COLORS.cyan, 13);
  drawText(Math.floor(time * 2) % 2 ? '_' : ' ', W * 0.2 + 198, H * 0.48, COLORS.cyan, 13);
  drawCentered(
    `COMBAT PROTOCOL: < ${selectedDifficulty.toUpperCase()} >`,
    H * 0.66,
    COLORS.yellow,
    13
  );
  drawCentered('Enter/Space: Start   C: Continue   Arrows: Difficulty', H * 0.76, COLORS.muted, 11);
  if (hasSave())
    drawCentered('Save data detected: CONTINUE ODYSSEY available', H * 0.83, COLORS.green, 10);
}

function drawStory() {
  const W = width();
  const H = height();
  const story = CONFIG.storyMode.levels[state.currentLevel] || CONFIG.storyMode.levels.level1 || [];
  const frame = story[Math.min(storyIndex, story.length - 1)];
  fill(0, 0, W, H, 0x030711ff);
  if (storyTransition && drawStoryTransitionFrame(storyTransition, W, H)) return;
  if (drawStoryFrameImage(frame, W, H)) return;
  drawPanel(28, H * 0.64, W - 56, H * 0.24, '');
  wrapText(frame?.text || '', 42, H * 0.68, W - 84, COLORS.white, 12);
  drawCentered('Enter/Space to continue', H - 28, COLORS.muted, 10);
}

function drawStoryFrameImage(frame, W, H) {
  const src = frame?.image;
  const frameH = H * 0.58;
  fill(0, 0, W, frameH, 0x062340ff);
  if (!canUseBrowserCanvasOverlay()) {
    drawStoryHostFrame(frame, W, H, 1);
    return true;
  }
  ensureStoryFrameImage(src);
  const cachedImage = storyFrameCache.get(src);
  if (cachedImage && storyFrameImage.src === src && storyFrameImage.status === 'ready') {
    const ctx = getStoryFrameContext(W, H);
    if (ctx) {
      drawStoryStillFrame(ctx, cachedImage, frame?.text || '', W, H);
      const story =
        CONFIG.storyMode.levels[state.currentLevel] || CONFIG.storyMode.levels.level1 || [];
      preloadStoryImage(story[storyIndex + 1]?.image);
      return true;
    }
    return false;
  }

  hideStoryFrameCanvas();
  drawCentered('STORY DATASTREAM', 18, COLORS.green, 12);
  drawCentered(
    storyFrameImage.status === 'loading'
      ? 'loading story frame...'
      : src?.replace(ASSET_BASE, '') || 'story frame',
    H * 0.29,
    COLORS.cyan,
    12
  );
  return false;
}

function drawStoryTransitionFrame(activeTransition, W, H) {
  if (!canUseBrowserCanvasOverlay()) {
    return drawStoryHostTransitionFrame(activeTransition, W, H);
  }
  const fromImage = storyFrameCache.get(activeTransition.from?.image);
  const toImage = storyFrameCache.get(activeTransition.to?.image);
  const ctx = getStoryFrameContext(W, H);
  if (!ctx) return false;
  if (!fromImage) {
    if (toImage) drawStoryStillFrame(ctx, toImage, activeTransition.to?.text || '', W, H);
    return !!toImage;
  }
  if (!toImage) {
    preloadStoryImage(activeTransition.to?.image);
    drawStoryStillFrame(ctx, fromImage, activeTransition.from?.text || '', W, H);
    return true;
  }

  const progress = Math.max(0, Math.min(1, activeTransition.t / activeTransition.duration));
  const eased = progress * progress * (3 - 2 * progress);
  storyFrameCanvas.style.display = 'block';
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fromImage, 0, 0, W, H);
  ctx.globalAlpha = eased;
  drawPixelatedStoryImage(ctx, toImage, W, H, 2 + Math.floor((1 - eased) * 34));
  ctx.globalAlpha = 1;
  drawStoryPixelGrid(ctx, W, H, eased);
  drawStoryTextOverlay(
    ctx,
    eased < 0.45 ? activeTransition.from?.text || '' : activeTransition.to?.text || '',
    W,
    H
  );
  return true;
}

function drawStoryHostTransitionFrame(activeTransition, W, H) {
  const progress = Math.max(0, Math.min(1, activeTransition.t / activeTransition.duration));
  const eased = progress * progress * (3 - 2 * progress);
  const fromTexture = ensureHostTexture(activeTransition.from?.image);
  const toTexture = ensureHostTexture(activeTransition.to?.image);
  if (!fromTexture && !toTexture) {
    drawStoryHostFrame(
      progress < 0.5 ? activeTransition.from : activeTransition.to,
      W,
      H,
      progress
    );
    return true;
  }

  if (fromTexture) call('draw.image', null, fromTexture, 0, 0, W, H, imageTint(1));
  if (toTexture) {
    const alpha = fromTexture ? eased : 1;
    call('draw.image', null, toTexture, 0, 0, W, H, imageTint(alpha));
    drawStoryHostPixelatedOverlay(toTexture, W, H, eased);
  }

  drawStoryFramebufferOverlay(
    eased < 0.45 ? activeTransition.from?.text || '' : activeTransition.to?.text || '',
    W,
    H,
    progress
  );
  return true;
}

function drawStoryHostPixelatedOverlay(texture, W, H, progress) {
  const imageRegion = ns('draw.imageRegion');
  if (typeof imageRegion !== 'function' || progress <= 0.02 || progress >= 0.96) return;
  const block = 8 + Math.floor((1 - progress) * 28);
  const alpha = Math.min(0.55, Math.max(0, (1 - progress) * 0.55));
  if (alpha <= 0) return;
  const tint = imageTint(alpha);
  const sampleW = 1 / Math.max(1, W);
  const sampleH = 1 / Math.max(1, H);
  for (let y = 0; y < H; y += block) {
    const h = Math.min(block, H - y);
    for (let x = 0; x < W; x += block) {
      const w = Math.min(block, W - x);
      const sx = Math.max(0, Math.min(1 - sampleW, (x + w * 0.5) / W));
      const sy = Math.max(0, Math.min(1 - sampleH, (y + h * 0.5) / H));
      imageRegion(texture, x, y, w, h, sx, sy, sampleW, sampleH, tint);
    }
  }
}

function drawStoryHostFrame(frame, W, H, progress = 1) {
  const src = frame?.image;
  const texture = ensureHostTexture(src);
  if (texture) {
    call('draw.image', null, texture, 0, 0, W, H, imageTint(1));
    drawStoryFramebufferOverlay(frame?.text || '', W, H, progress);
    return true;
  }
  drawStoryHostFallback(frame, W, H, progress);
  return false;
}

function drawStoryFramebufferOverlay(text, W, H, progress = 1) {
  const panelY = H * 0.68;
  const panelH = H * 0.24;
  drawPanel(28, panelY, W - 56, panelH, '');
  fill(42, panelY + 12, W - 84, panelH - 24, 0x000000aa);
  if (
    !drawSharedTextBox(text || '', 56, panelY + 24, W - 112, panelH - 52, COLORS.yellow, 14, {
      ellipsis: false,
      fit: true,
      minSize: 9,
    })
  ) {
    wrapTextBox(text || '', 56, panelY + 24, W - 112, panelH - 52, COLORS.yellow, 14, {
      ellipsis: false,
      fit: true,
      minSize: 9,
    });
  }
  const hint = progress < 1 ? 'syncing datastream...' : 'Enter/Space to continue';
  drawCentered(hint, H - 28, progress < 1 ? COLORS.cyan : COLORS.muted, 10);
}

function drawStoryHostFallback(frame, W, H, progress = 1) {
  const frameName = (frame?.image || '').split('/').pop() || 'story-frame';
  const top = 18;
  const storyH = H * 0.58;
  const margin = 30;
  const panelY = H * 0.66;
  const pulse = Math.sin(time * 3.2 + storyIndex) * 0.5 + 0.5;
  fill(0, 0, W, H, 0x030711ff);
  for (let y = 0; y < storyH; y += 16) {
    const alpha = 34 + Math.floor(26 * Math.sin(time * 1.7 + y * 0.04));
    fill(0, y, W, 1, overlayColor(0x00ffff, Math.max(8, alpha)));
  }
  for (let i = 0; i < 18; i++) {
    const x = (i * 71 + Math.floor(time * 18)) % W;
    const y = top + ((i * 37 + storyIndex * 19) % Math.max(1, storyH - 38));
    fill(
      x,
      y,
      28 + (i % 3) * 16,
      2,
      i % 2 ? overlayColor(0xff00cc, 119) : overlayColor(0x00ffff, 119)
    );
  }

  const cardX = margin;
  const cardY = top;
  const cardW = W - margin * 2;
  const cardH = storyH - top - 8;
  fill(cardX, cardY, cardW, cardH, 0x061323e8);
  rect(cardX, cardY, cardW, cardH, COLORS.cyan);
  rect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 0xff00cc);

  const inset = 18;
  const artX = cardX + inset;
  const artY = cardY + inset;
  const artW = cardW - inset * 2;
  const artH = cardH - inset * 2;
  fill(artX, artY, artW, artH, 0x020812ff);
  for (let i = 0; i < 9; i++) {
    const t = (i + 1) / 10;
    const x = artX + artW * t;
    line2d(
      x,
      artY,
      W / 2 + Math.sin(time + i) * 36,
      artY + artH,
      i % 2 ? COLORS.magenta : COLORS.floorGrid
    );
  }
  for (let i = 0; i < 6; i++) {
    const y = artY + artH * ((i + 1) / 7);
    line2d(
      artX,
      y,
      artX + artW,
      y + Math.sin(time * 1.4 + i) * 8,
      i % 2 ? COLORS.blue : COLORS.green
    );
  }
  const shardW = artW * (0.16 + pulse * 0.03);
  const shardX = artX + artW * 0.5;
  const shardY = artY + artH * 0.48;
  drawWallPanel(
    shardX - shardW,
    shardY,
    shardX,
    shardY - artH * 0.23,
    shardY + artH * 0.24,
    shardY + artH * 0.08,
    0x03283fff
  );
  drawWallPanel(
    shardX,
    shardY - artH * 0.23,
    shardX + shardW,
    shardY,
    shardY + artH * 0.08,
    shardY + artH * 0.24,
    0x240333ff
  );
  drawCentered(`STORY FRAME ${storyIndex + 1}`, cardY + 10, COLORS.green, 11);
  drawCentered(frameName, cardY + cardH - 20, COLORS.muted, 10);

  drawPanel(28, panelY, W - 56, H * 0.24, '');
  if (
    !drawSharedTextBox(
      frame?.text || '',
      42,
      panelY + 22,
      W - 84,
      H * 0.24 - 48,
      COLORS.white,
      12,
      {
        ellipsis: false,
        fit: true,
        minSize: 9,
      }
    )
  ) {
    wrapTextBox(frame?.text || '', 42, panelY + 22, W - 84, H * 0.24 - 48, COLORS.white, 12, {
      ellipsis: false,
      fit: true,
      minSize: 9,
    });
  }
  const hint = progress < 1 ? 'syncing datastream...' : 'Enter/Space to continue';
  drawCentered(hint, H - 28, progress < 1 ? COLORS.cyan : COLORS.muted, 10);
}

function ensureHostTexture(src) {
  if (!src || !canUseHostTextureOverlay()) return null;
  if (hostTextureCache.has(src)) return hostTextureCache.get(src);
  const status = hostTextureStatus.get(src);
  if (status === 'loading' || status === 'error') return null;
  const loadTexture = ns('scene.loadTexture');
  try {
    hostTextureStatus.set(src, 'loading');
    const result = loadTexture(src);
    if (result && typeof result.then === 'function') {
      result
        .then(texture => {
          const handle = textureHandle(texture);
          if (handle) {
            hostTextureCache.set(src, handle);
            hostTextureStatus.set(src, 'ready');
          } else {
            hostTextureStatus.set(src, 'error');
          }
          syncDebugState();
        })
        .catch(() => {
          hostTextureStatus.set(src, 'error');
          syncDebugState();
        });
      syncDebugState();
      return null;
    }
    const handle = textureHandle(result);
    if (!handle) {
      hostTextureStatus.set(src, 'error');
      syncDebugState();
      return null;
    }
    hostTextureCache.set(src, handle);
    hostTextureStatus.set(src, 'ready');
    syncDebugState();
    return handle;
  } catch {
    hostTextureStatus.set(src, 'error');
    syncDebugState();
    return null;
  }
}

function textureHandle(texture) {
  if (typeof texture === 'number') return texture;
  if (texture && typeof texture.handle === 'number') return texture.handle;
  return 0;
}

function drawStoryStillFrame(ctx, image, text, W, H) {
  storyFrameCanvas.style.display = 'block';
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, 0, 0, W, H);
  drawStoryTextOverlay(ctx, text, W, H);
}

function drawPixelatedStoryImage(ctx, image, W, H, blockSize) {
  const smallW = Math.max(1, Math.ceil(W / blockSize));
  const smallH = Math.max(1, Math.ceil(H / blockSize));
  if (!storyPixelCanvas) {
    storyPixelCanvas = document.createElement('canvas');
    storyPixelCtx = storyPixelCanvas.getContext('2d');
  }
  if (!storyPixelCtx) {
    ctx.drawImage(image, 0, 0, W, H);
    return;
  }
  if (storyPixelCanvas.width !== smallW || storyPixelCanvas.height !== smallH) {
    storyPixelCanvas.width = smallW;
    storyPixelCanvas.height = smallH;
  }
  storyPixelCtx.imageSmoothingEnabled = true;
  storyPixelCtx.clearRect(0, 0, smallW, smallH);
  storyPixelCtx.drawImage(image, 0, 0, smallW, smallH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(storyPixelCanvas, 0, 0, smallW, smallH, 0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
}

function drawStoryPixelGrid(ctx, W, H, progress) {
  const block = 8 + Math.floor((1 - progress) * 28);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 0.25 * (1 - progress));
  ctx.fillStyle = '#00131f';
  for (let y = 0; y < H; y += block) {
    for (let x = 0; x < W; x += block) {
      if (((x / block + y / block) | 0) % 3 === 0) ctx.fillRect(x, y, block, block);
    }
  }
  ctx.restore();
}

function ensureStoryFrameImage(src) {
  if (!src) return;
  if (
    storyFrameImage.src === src &&
    storyFrameImage.status !== 'error' &&
    storyFrameImage.status !== 'unavailable'
  )
    return;
  const cachedImage = storyFrameCache.get(src);
  if (cachedImage) {
    storyFrameImage = {
      src,
      status: 'ready',
      width: cachedImage.naturalWidth || cachedImage.width || 1,
      height: cachedImage.naturalHeight || cachedImage.height || 1,
    };
    syncDebugState();
    return;
  }

  const ImageCtor = globalThis.Image;
  if (typeof ImageCtor !== 'function') {
    storyFrameImage = { src, status: 'unavailable', width: 0, height: 0 };
    syncDebugState();
    return;
  }

  if (storyFrameLoading.has(src)) {
    storyFrameImage = { src, status: 'loading', width: 0, height: 0 };
    syncDebugState();
    return;
  }

  storyFrameImage = { src, status: 'loading', width: 0, height: 0 };
  storyFrameLoading.add(src);
  syncDebugState();
  const image = new ImageCtor();
  image.decoding = 'async';
  image.onload = () => {
    storyFrameCache.set(src, image);
    storyFrameLoading.delete(src);
    if (storyFrameImage.src !== src) return;
    storyFrameImage = {
      src,
      status: 'ready',
      width: image.naturalWidth || image.width || 1,
      height: image.naturalHeight || image.height || 1,
    };
    syncDebugState();
  };
  image.onerror = () => {
    storyFrameLoading.delete(src);
    if (storyFrameImage.src === src) {
      storyFrameImage = { src, status: 'error', width: 0, height: 0 };
      syncDebugState();
    }
  };
  image.src = src;
}

function preloadStoryImage(src) {
  if (!src || storyFrameCache.has(src) || storyFrameLoading.has(src)) return;
  const ImageCtor = globalThis.Image;
  if (typeof ImageCtor !== 'function') return;
  storyFrameLoading.add(src);
  const image = new ImageCtor();
  image.decoding = 'async';
  image.onload = () => {
    storyFrameCache.set(src, image);
    storyFrameLoading.delete(src);
  };
  image.onerror = () => {
    storyFrameLoading.delete(src);
  };
  image.src = src;
}

function getStoryFrameContext(W, H) {
  if (!canUseBrowserCanvasOverlay()) return null;
  if (!storyFrameCanvas) {
    storyFrameCanvas = document.createElement('canvas');
    storyFrameCanvas.setAttribute('aria-hidden', 'true');
    storyFrameCanvas.dataset.indieOdysseyOverlay = 'story';
    storyFrameCanvas.style.position = 'absolute';
    storyFrameCanvas.style.inset = '0';
    storyFrameCanvas.style.width = '100%';
    storyFrameCanvas.style.height = '100%';
    storyFrameCanvas.style.pointerEvents = 'none';
    storyFrameCanvas.style.zIndex = '13';
    storyFrameCanvas.style.display = 'none';
    // Override console.html's `canvas { background: #000 }` — without
    // this the overlay is opaque black, hiding the WebGL canvas below.
    storyFrameCanvas.style.background = 'transparent';
    const screen = document.getElementById('screen');
    const parent = screen?.parentElement || document.body;
    ensureOverlayParentPositioned(parent);
    parent.appendChild(storyFrameCanvas);
    storyFrameCtx = storyFrameCanvas.getContext('2d');
  }
  if (!storyFrameCtx) return null;
  if (storyFrameCanvas.width !== W || storyFrameCanvas.height !== H) {
    storyFrameCanvas.width = W;
    storyFrameCanvas.height = H;
  }
  return storyFrameCtx;
}

function removeOverlayCanvases() {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  const nodes = document.querySelectorAll('[data-indie-odyssey-overlay]');
  for (let i = 0; i < nodes.length; i++) {
    if (typeof nodes[i].remove === 'function') nodes[i].remove();
  }
  storyFrameCanvas = null;
  storyFrameCtx = null;
  combatSpriteCanvas = null;
  combatSpriteCtx = null;
}

function hideStoryFrameCanvas() {
  if (!storyFrameCanvas || !storyFrameCtx) return;
  storyFrameCtx.clearRect(0, 0, storyFrameCanvas.width, storyFrameCanvas.height);
  storyFrameCanvas.style.display = 'none';
}

function getCombatSpriteContext(W, H) {
  if (!canUseBrowserCanvasOverlay()) return null;
  if (!combatSpriteCanvas) {
    combatSpriteCanvas = document.createElement('canvas');
    combatSpriteCanvas.setAttribute('aria-hidden', 'true');
    combatSpriteCanvas.dataset.indieOdysseyOverlay = 'combat';
    combatSpriteCanvas.style.position = 'absolute';
    combatSpriteCanvas.style.inset = '0';
    combatSpriteCanvas.style.width = '100%';
    combatSpriteCanvas.style.height = '100%';
    combatSpriteCanvas.style.pointerEvents = 'none';
    combatSpriteCanvas.style.zIndex = '12';
    combatSpriteCanvas.style.display = 'none';
    // CRITICAL: console.html's global `canvas { background: #000 }` rule
    // applies to every dynamically-created <canvas>. Without this override
    // the overlay canvas is opaque black everywhere except where elements
    // are drawn — completely hiding the WebGL canvas below. Explicit
    // transparent background makes the cart's framebuffer + 3D skybox
    // visible through the panel centre as designed.
    combatSpriteCanvas.style.background = 'transparent';
    const screen = document.getElementById('screen');
    const parent = screen?.parentElement || document.body;
    ensureOverlayParentPositioned(parent);
    parent.appendChild(combatSpriteCanvas);
    combatSpriteCtx = combatSpriteCanvas.getContext('2d');
  }
  if (!combatSpriteCtx) return null;
  if (combatSpriteCanvas.width !== W || combatSpriteCanvas.height !== H) {
    combatSpriteCanvas.width = W;
    combatSpriteCanvas.height = H;
  }
  return combatSpriteCtx;
}

function hideCombatSpriteCanvas() {
  if (!combatSpriteCanvas || !combatSpriteCtx) return;
  combatSpriteCtx.clearRect(0, 0, combatSpriteCanvas.width, combatSpriteCanvas.height);
  combatSpriteCanvas.style.display = 'none';
}

// ─── Combat enemy rendering ─────────────────────────────────────────────
// Combat enemies are drawn as 2D pixel-art sprites in the cart's framebuffer
// (see `drawCombatSpriteFallbacks` + `ensureCombatSpriteImage`). The
// spritesheets live under `assets/images/spritesheet/` per enemy and are
// declared on each ENEMIES entry as `sprite: \`${ASSET_BASE}.../foo.png\``.
//
// Why 2D for combat (and not GLBs)? Loading the same GLB twice (once into
// the main scene and once into a private WebGL overlay) doubled the
// WebGL-context count and led to the second model being invisible on
// threejs and a flood of Babylon material errors. The portable, reliable
// pattern across threejs + babylon + retroarch is to use sprites as fallback
// overlays while the main scene owns any available GLB enemy model.
//
// To replicate in your own cart:
//   1. Ship a spritesheet PNG per enemy and reference it from your enemy
//      template (e.g. `enemy.sprite = \`${ASSET_BASE}images/foo.png\``).
//   2. At combat start, call `ensureCombatSpriteImage(enemy.sprite)` so the
//      image starts decoding.
//   3. In your combat draw path, blit the sprite at fixed screen positions
//      via your engine's `drawImage`/`spr` API (see
//      `drawCombatSpriteFallbacks` for the masked, scaled blit used here).
// ────────────────────────────────────────────────────────────────────────

function ensureCombatSpriteImage(src) {
  if (!src || combatSpriteCache.has(src)) return combatSpriteCache.get(src) || null;
  const current = combatSpriteStatus.get(src);
  if (current === 'loading' || current === 'error' || current === 'unavailable') return null;
  const ImageCtor = globalThis.Image;
  if (typeof ImageCtor !== 'function') {
    combatSpriteStatus.set(src, 'unavailable');
    syncDebugState();
    return null;
  }
  combatSpriteStatus.set(src, 'loading');
  syncDebugState();
  const image = new ImageCtor();
  image.decoding = 'async';
  image.onload = () => {
    combatSpriteCache.set(src, image);
    combatSpriteStatus.set(src, 'ready');
    syncDebugState();
  };
  image.onerror = () => {
    combatSpriteStatus.set(src, 'error');
    syncDebugState();
  };
  image.src = src;
  return null;
}

function shouldDrawCombatSprite(enemy) {
  if (!enemy) return false;
  return !enemy.model || enemy.modelStatus === 'error' || enemy.modelStatus === 'none';
}

function drawCombatSpriteFallbacks(W, H) {
  if (!combat) {
    hideCombatSpriteCanvas();
    return false;
  }
  const ctx = getCombatSpriteContext(W, H);
  if (!ctx) return false;
  ctx.clearRect(0, 0, W, H);
  drawCombatOverlayBackground(ctx, W, H);
  const live = livingEnemies();
  live.forEach((enemy, i) => {
    if (!shouldDrawCombatSprite(enemy)) return;
    const image = ensureCombatSpriteImage(enemy.sprite);
    const size = Math.max(76, Math.min(112, W * 0.16));
    const x = W * 0.34 + (i - (live.length - 1) / 2) * Math.min(150, W * 0.22);
    const y = H * 0.52;
    ctx.save();
    ctx.globalAlpha = enemy.modelStatus === 'ready' ? 0.94 : 1;
    if (image) {
      const drawable = getMaskedCombatSprite(enemy.sprite, image);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(drawable, x - size / 2, y - size / 2, size, size);
    } else {
      const color = `#${(enemy.color || 0xffffff).toString(16).padStart(6, '0')}`;
      ctx.fillStyle = 'rgba(0, 15, 25, 0.78)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      ctx.fillStyle = color;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        combatSpriteStatus.get(enemy.sprite) === 'loading' ? 'loading sprite' : enemy.name,
        x,
        y + size / 2 + 14
      );
    }
    ctx.restore();
  });
  drawCombatOverlayForeground(ctx, W, H);
  combatSpriteCanvas.style.display = 'block';
  return true;
}

function drawCombatFramebufferFallback(W, H) {
  if (!combat) return;
  drawCombatPanelChrome(W, H);
  drawBar(10, 10, 150, 18, state.avatar.health, state.avatar.maxHealth, COLORS.red, 'HP');
  drawBar(10, 32, 150, 18, state.avatar.mana, state.avatar.maxMana, COLORS.blue, 'MP');
  drawText(
    `LV ${state.avatar.level}  XP ${state.avatar.experience}/${state.avatar.experienceToNextLevel}`,
    172,
    14,
    COLORS.yellow,
    11
  );
  drawText(
    `${state.currentLevel.toUpperCase()}  (${state.position.x},${state.position.z}) ${DIRS[state.direction].name}`,
    172,
    32,
    COLORS.cyan,
    11
  );
  const live = livingEnemies();
  live.forEach((enemy, i) => {
    if (!shouldDrawCombatSprite(enemy)) return;
    drawCombatEnemyCard(enemy, i, live.length, W, H);
  });

  let y = H * 0.42;
  for (const entry of combat.log.slice(0, 5)) {
    drawText(entry, W * 0.14, y, COLORS.white, 10);
    y += 14;
  }

  const actions = ['1 Attack', '2 Spell', '3 Item', '4 Defend', '5 Run'];
  const buttons = combatActionButtonRects(W, H);
  actions.forEach((label, i) => {
    const button = buttons[i];
    drawButton(button.x, button.y, button.w, button.h, label, false);
  });
  const auto = combatAutoButtonRect(W, H);
  drawButton(
    auto.x,
    auto.y,
    auto.w,
    auto.h,
    state.autoplayEnabled ? 'AUTO ON' : 'AUTO OFF',
    state.autoplayEnabled
  );
}

function drawCombatBackdrop(W, H) {
  const horizon = H * 0.5;
  fill(0, 0, W, horizon, 0x1c0642ff);
  fill(0, horizon, W, H - horizon, 0x020914ff);
  for (let i = 0; i < 16; i++) {
    const x = W * 0.5 + Math.sin(i * 1.9 + time * 0.8) * W * 0.46;
    line2d(W * 0.5, horizon, x, H, i % 2 ? COLORS.magenta : COLORS.floorGrid);
  }
  for (let y = horizon; y < H; y += 18) {
    const spread = (y - horizon) / Math.max(1, H - horizon);
    line2d(W * (0.5 - spread), y, W * (0.5 + spread), y, COLORS.blue);
  }
  for (let i = 0; i < 20; i++) {
    const x = (i * 83 + Math.floor(time * 24)) % W;
    const y = 68 + ((i * 31) % Math.max(1, horizon - 88));
    fill(
      x,
      y,
      20 + (i % 4) * 10,
      2,
      i % 2 ? overlayColor(0xff00cc, 136) : overlayColor(0x00ffff, 136)
    );
  }
}

function drawCombatEnemyCard(enemy, index, count, W, H) {
  const spacing = Math.min(150, W * 0.22);
  const x = W * 0.5 + (index - (count - 1) / 2) * spacing;
  const y = H * 0.34;
  const size = Math.max(72, Math.min(116, W * 0.15));
  const color = enemy.color || COLORS.cyan;
  const active = index === combat.selectedEnemy;
  fill(x - size * 0.42, y - size * 0.08, size * 0.84, size * 0.72, 0x020812dd);
  rect(x - size * 0.42, y - size * 0.08, size * 0.84, size * 0.72, active ? COLORS.yellow : color);
  const texture = ensureHostTexture(enemy.sprite);
  if (texture) {
    call(
      'draw.image',
      null,
      texture,
      x - size * 0.44,
      y - size * 0.36,
      size * 0.88,
      size * 0.88,
      0xffffffff
    );
  } else {
    fill(x - size * 0.18, y - size * 0.32, size * 0.36, size * 0.28, color);
    fill(x - size * 0.3, y - size * 0.04, size * 0.6, size * 0.5, color);
    fill(x - size * 0.2, y + size * 0.08, size * 0.4, size * 0.2, 0x00000088);
  }
  line2d(x - size * 0.42, y + size * 0.64, x + size * 0.42, y + size * 0.64, COLORS.floorGrid);
  line2d(x - size * 0.28, y + size * 0.75, x + size * 0.28, y + size * 0.75, COLORS.magenta);
  drawCenteredIn(
    enemy.name,
    x - 62,
    y + size * 0.76,
    124,
    18,
    active ? COLORS.yellow : COLORS.cyan,
    10
  );
  drawBar(x - 58, y + size * 0.94, 116, 12, enemy.hp, enemy.maxHp, COLORS.red, '');
  if (enemy.modelStatus === 'loading')
    drawCenteredIn('LOADING GLB', x - 54, y + size * 1.08, 108, 14, COLORS.muted, 9);
}

function getMaskedCombatSprite(src, image) {
  if (!src || !image || typeof document === 'undefined') return image;
  const cached = combatSpriteMaskedCache.get(src);
  if (cached) return cached;
  try {
    const w = image.naturalWidth || image.width || 1;
    const h = image.naturalHeight || image.height || 1;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < data.data.length; i += 4) {
      const r = data.data[i];
      const g = data.data[i + 1];
      const b = data.data[i + 2];
      if (r < 18 && g < 18 && b < 18) data.data[i + 3] = 0;
    }
    ctx.putImageData(data, 0, 0);
    combatSpriteMaskedCache.set(src, canvas);
    return canvas;
  } catch (error) {
    return image;
  }
}

function drawCombatOverlayBackground(ctx, W, H) {
  if (!combat) return;
  ctx.save();
  drawCanvasBar(ctx, 10, 10, 150, 18, state.avatar.health, state.avatar.maxHealth, '#ff3355', 'HP');
  drawCanvasBar(ctx, 10, 32, 150, 18, state.avatar.mana, state.avatar.maxMana, '#0088ff', 'MP');
  drawCanvasText(
    ctx,
    `LV ${state.avatar.level}  XP ${state.avatar.experience}/${state.avatar.experienceToNextLevel}`,
    172,
    14,
    '#ffdd55',
    12
  );
  drawCanvasText(
    ctx,
    `${state.currentLevel.toUpperCase()}  (${state.position.x},${state.position.z}) ${DIRS[state.direction].name}`,
    172,
    32,
    '#00ffff',
    12
  );

  const panel = { x: W * 0.08, y: H * 0.18, w: W * 0.84, h: H * 0.64 };
  drawCanvasPanel(ctx, panel.x, panel.y, panel.w, panel.h, 'COMBAT');
  ctx.restore();
}

function drawCombatOverlayForeground(ctx, W, H) {
  if (!combat) return;
  ctx.save();
  const live = livingEnemies();
  live.forEach((enemy, i) => {
    const x = W * 0.18 + i * 150;
    const active = i === combat.selectedEnemy;
    drawCanvasText(
      ctx,
      active ? `> ${enemy.name}` : enemy.name,
      x,
      H * 0.26,
      active ? '#ffdd55' : '#00ffff',
      13
    );
    drawCanvasBar(ctx, x, H * 0.3, 118, 14, enemy.hp, enemy.maxHp, '#ff3355', '');
  });

  let y = H * 0.4;
  for (const entry of combat.log) {
    drawCanvasText(ctx, entry, W * 0.14, y, '#ffffff', 10);
    y += 14;
  }

  const actions = ['1 Attack', '2 Spell', '3 Item', '4 Defend', '5 Run'];
  const buttons = combatActionButtonRects(W, H);
  actions.forEach((label, i) => {
    const button = buttons[i];
    drawCanvasButton(ctx, button.x, button.y, button.w, button.h, label, false);
  });
  const auto = combatAutoButtonRect(W, H);
  drawCanvasButton(
    ctx,
    auto.x,
    auto.y,
    auto.w,
    auto.h,
    state.autoplayEnabled ? 'AUTO ON' : 'AUTO OFF',
    state.autoplayEnabled
  );
  ctx.restore();
}

function drawCanvasPanel(ctx, x, y, w, h, title = '') {
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  if (title) drawCanvasText(ctx, title, x + 8, y + 10, '#00ff88', 15);
}

function drawCanvasBar(ctx, x, y, w, h, value, max, color, label) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * ratio, h);
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  drawCanvasText(
    ctx,
    `${label ? `${label} ` : ''}${Math.ceil(value)}/${max}`,
    x + 4,
    y + 3,
    '#ffffff',
    9
  );
}

function drawCanvasButton(ctx, x, y, w, h, label, active) {
  ctx.fillStyle = active ? '#ffdd55' : '#0a35aa';
  ctx.strokeStyle = active ? '#ffff00' : '#00ffff';
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  drawCanvasText(ctx, label, x + 8, y + 8, active ? '#001020' : '#ffffff', 12);
}

function drawCanvasText(ctx, text, x, y, color, size) {
  ctx.font = `${size}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 2;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

function drawStoryTextOverlay(ctx, text, W, H) {
  const panelX = 28;
  const panelY = H * 0.68;
  const panelW = W - 56;
  const panelH = H * 0.24;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 15, 25, 0.92)';
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.95)';
  ctx.lineWidth = 2;
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
  ctx.fillRect(panelX + 14, panelY + 12, panelW - 28, panelH - 24);
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffff00';
  ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
  ctx.shadowBlur = 8;
  drawCanvasWrappedText(ctx, text, W / 2, panelY + 26, panelW - 72, 26, 3);
  ctx.shadowBlur = 0;
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(170, 220, 235, 0.92)';
  ctx.fillText('Enter/Space to continue', W / 2, H - 26);
  ctx.restore();
}

function drawCanvasWrappedText(ctx, text, centerX, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, centerX, y + index * lineHeight));
}

function wrapText(text, x, y, maxWidth, color, size) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  const maxChars = Math.max(20, Math.floor(maxWidth / (size * 0.55)));
  for (const word of words) {
    if ((line + word).length > maxChars) {
      drawText(line, x, yy, color, size);
      yy += size + 4;
      line = '';
    }
    line += `${word} `;
  }
  if (line) drawText(line, x, yy, color, size);
}

function wrapTextBox(text, x, y, maxWidth, maxHeight, color, size, options = {}) {
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean);
  const ellipsis = options.ellipsis !== false;
  const fit = options.fit === true;
  const minSize = Math.max(6, Math.min(size, options.minSize || size));

  function layout(currentSize) {
    const lineHeight = currentSize + 4;
    const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
    const maxChars = Math.max(12, Math.floor(maxWidth / (currentSize * 0.55)));
    const lines = [];
    let line = '';
    let truncated = false;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
        if (lines.length >= maxLines) {
          truncated = true;
          break;
        }
      } else {
        line = next;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return { lines, lineHeight, maxChars, truncated };
  }

  let currentSize = size;
  let result = layout(currentSize);
  while (fit && result.truncated && currentSize > minSize) {
    currentSize -= 1;
    result = layout(currentSize);
  }

  if (result.truncated && ellipsis && result.lines.length) {
    const last = result.lines[result.lines.length - 1].replace(/\s+$/, '');
    result.lines[result.lines.length - 1] =
      last.length > 3 ? `${last.slice(0, Math.max(0, result.maxChars - 3))}...` : last;
  }
  result.lines.forEach((item, index) =>
    drawText(item, x, y + index * result.lineHeight, color, currentSize)
  );
}

function drawHUD() {
  const W = width();
  const H = height();
  if (isBabylonBackend() && globalThis.__INDIE_ODYSSEY_2D_FALLBACK === true) {
    drawFallbackDungeonView(W, H);
  }
  drawBar(10, 10, 150, 18, state.avatar.health, state.avatar.maxHealth, COLORS.red, 'HP');
  drawBar(10, 32, 150, 18, state.avatar.mana, state.avatar.maxMana, COLORS.blue, 'MP');
  drawText(
    `LV ${state.avatar.level}  XP ${state.avatar.experience}/${state.avatar.experienceToNextLevel}`,
    172,
    14,
    COLORS.yellow,
    11
  );
  drawText(
    `${state.currentLevel.toUpperCase()}  (${state.position.x},${state.position.z}) ${DIRS[state.direction].name}`,
    172,
    32,
    COLORS.cyan,
    11
  );
  drawMinimap(W - 132, 10, 122);
  drawMessages();
  drawTouchControls(W, H);
}

function isBabylonBackend() {
  return backendName() === 'babylon';
}

function drawFallbackDungeonView(W, H) {
  const horizon = H * 0.46;
  fill(0, 0, W, horizon, 0x1f4f9aff);
  fill(0, horizon, W, H - horizon, 0x04080eff);

  const cx = W / 2;
  const dir = DIRS[state.direction];
  const right = DIRS[(state.direction + 1) % 4];
  const maxDepth = 8;
  let wallDepth = maxDepth;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const tx = state.position.x + dir.x * depth;
    const tz = state.position.z + dir.z * depth;
    if (isWall(tx, tz)) {
      wallDepth = depth;
      break;
    }
  }

  for (let depth = maxDepth; depth >= 1; depth--) {
    const near = perspectiveBand(depth - 1, W, H, horizon);
    const far = perspectiveBand(depth, W, H, horizon);
    const tx = state.position.x + dir.x * depth;
    const tz = state.position.z + dir.z * depth;
    const leftWall = isWall(tx - right.x, tz - right.z);
    const rightWall = isWall(tx + right.x, tz + right.z);
    const shade = depth % 2 === 0 ? 0x10051cff : 0x041817ff;

    if (depth <= wallDepth) {
      drawGridBand(cx, horizon, near, far);
      if (leftWall)
        drawWallPanel(near.left, near.top, far.left, far.top, far.bottom, near.bottom, shade);
      if (rightWall)
        drawWallPanel(near.right, near.top, far.right, far.top, far.bottom, near.bottom, shade);
    }
  }

  const wall = perspectiveBand(wallDepth, W, H, horizon);
  fill(wall.left, wall.top, wall.right - wall.left, wall.bottom - wall.top, 0x061217ff);
  for (let i = 0; i <= 4; i++) {
    const x = wall.left + ((wall.right - wall.left) * i) / 4;
    line2d(x, wall.top, x, wall.bottom, i % 2 ? COLORS.magenta : COLORS.floorGrid);
  }
  for (let i = 0; i <= 4; i++) {
    const y = wall.top + ((wall.bottom - wall.top) * i) / 4;
    line2d(wall.left, y, wall.right, y, i % 2 ? COLORS.magenta : COLORS.floorGrid);
  }
}

function perspectiveBand(depth, W, H, horizon) {
  const d = depth + 1;
  const half = (W * 0.52) / d;
  const height = (H * 0.58) / d;
  return {
    left: W / 2 - half,
    right: W / 2 + half,
    top: horizon - height * 0.55,
    bottom: horizon + height,
  };
}

function drawGridBand(cx, horizon, near, far) {
  line2d(near.left, near.bottom, far.left, far.bottom, COLORS.floorGrid);
  line2d(near.right, near.bottom, far.right, far.bottom, COLORS.floorGrid);
  line2d(near.left, near.top, far.left, far.top, COLORS.floorGrid);
  line2d(near.right, near.top, far.right, far.top, COLORS.floorGrid);
  line2d(near.left, near.bottom, cx, horizon, COLORS.floorGrid);
  line2d(near.right, near.bottom, cx, horizon, COLORS.floorGrid);
  line2d(near.left, near.top, cx, horizon, COLORS.magenta);
  line2d(near.right, near.top, cx, horizon, COLORS.magenta);
}

function drawWallPanel(x1, y1, x2, y2, y3, y4, color) {
  const poly = ns('draw.poly');
  if (typeof poly === 'function') {
    poly(
      [
        [x1, y1],
        [x2, y2],
        [x2, y3],
        [x1, y4],
      ],
      uiColor(color)
    );
  }
  line2d(x1, y1, x2, y2, COLORS.floorGrid);
  line2d(x1, y4, x2, y3, COLORS.floorGrid);
  line2d(x1, y1, x1, y4, COLORS.magenta);
}

function drawTouchControls(W, H) {
  drawButton(24, H - 96, 52, 52, '<');
  drawButton(140, H - 96, 52, 52, '>');
  drawButton(82, H - 150, 52, 52, '^');
  drawButton(82, H - 42, 52, 52, 'v');
  const auto = autoButtonRect(W, H);
  drawButton(
    auto.x,
    auto.y,
    auto.w,
    auto.h,
    state.autoplayEnabled ? 'AUTO' : 'MANUAL',
    state.autoplayEnabled
  );
  drawButton(W - 106, H - 60, 82, 36, 'INV');
}

function drawMinimap(x, y, size) {
  const fog = state.fogOfWar[state.currentLevel] || [];
  const cell = size / map.length;
  fill(x, y, size, size, 0x000000aa);
  rect(x, y, size, size, COLORS.cyan);
  for (let z = 0; z < map.length; z++) {
    for (let xx = 0; xx < map[z].length; xx++) {
      if (!fog[z]?.[xx]) continue;
      const color = map[z][xx] === 0 ? 0x124060 : 0x1bd2c0;
      fill(x + xx * cell, y + z * cell, Math.max(1, cell - 1), Math.max(1, cell - 1), color);
    }
  }
  for (const loc of getSpecialLocations()) {
    if (!fog[loc.z]?.[loc.x]) continue;
    fill(
      x + loc.x * cell + cell * 0.25,
      y + loc.z * cell + cell * 0.25,
      Math.max(2, cell * 0.5),
      Math.max(2, cell * 0.5),
      loc.type === 'portal'
        ? COLORS.magenta
        : loc.type === 'save_point'
          ? COLORS.green
          : COLORS.yellow
    );
  }
  fill(
    x + state.position.x * cell,
    y + state.position.z * cell,
    Math.max(3, cell),
    Math.max(3, cell),
    COLORS.red
  );
}

function drawMessages() {
  const H = height();
  let y = H - 190;
  for (const msg of messages) {
    drawText(msg.text, 12, y, msg.color, 10);
    y += 13;
  }
}

function drawCombat() {
  const W = width();
  const H = height();
  hideStoryFrameCanvas();
  assertCombatRenderState();
  // drawCombatSpriteFallbacks owns the entire combat UI (HUD, panel chrome,
  // sprite fallbacks, action buttons, combat log) — drawn into a dedicated
  // z=12 DOM canvas with `background: transparent`. The cart framebuffer
  // stays empty so the 3D scene (dungeon + GLB enemies) shows through the
  // panel viewport. Keep this as the single source of HUD truth — duplicate
  // drawing here would cause visible ghosting since the overlay canvas is
  // transparent.
  if (!drawCombatSpriteFallbacks(W, H)) drawCombatFramebufferFallback(W, H);
}

function drawInventory() {
  const W = width();
  const H = height();
  drawPanel(W * 0.16, H * 0.12, W * 0.68, H * 0.74, 'INVENTORY');
  let y = H * 0.22;
  state.inventory.forEach(item => {
    const data = itemById(item.id);
    drawText(`${data.name} x${item.count}`, W * 0.22, y, COLORS.white, 12);
    y += 18;
  });
  drawText('I/Escape: return', W * 0.22, H * 0.78, COLORS.muted, 11);
}

function drawLevelUp() {
  const W = width();
  const H = height();
  drawPanel(W * 0.2, H * 0.24, W * 0.6, H * 0.44, 'LEVEL UP');
  drawCentered(`IO reached level ${state.avatar.level}`, H * 0.38, COLORS.yellow, 16);
  drawCentered('All stats increased. Health and mana restored.', H * 0.48, COLORS.cyan, 12);
  drawCentered('Enter/Space to allocate stat burst', H * 0.58, COLORS.muted, 11);
}

function drawDeath() {
  const W = width();
  const H = height();
  fill(0, 0, W, H, 0x100006ff);
  drawCentered('YOU HAVE FALLEN', H * 0.32, COLORS.red, 22);
  drawCentered('The digital void claims another adventurer.', H * 0.44, COLORS.magenta, 12);
  drawCentered('Enter/Space: reboot from last save', H * 0.62, COLORS.muted, 11);
}

function updateTimers(dt) {
  messages.forEach(msg => (msg.ttl -= dt));
  messages = messages.filter(msg => msg.ttl > 0);
  floatingTexts.forEach(text => {
    text.ttl -= dt;
    text.y += dt * 0.8;
  });
  floatingTexts = floatingTexts.filter(text => text.ttl > 0);
  if (flash) {
    flash.t += dt;
    if (flash.t >= flash.duration) flash = null;
  }
  if (transition) {
    transition.t += dt;
    if (transition.t >= transition.duration) transition = null;
  }
  if (glitchPulse) {
    glitchPulse.t += dt;
    if (glitchPulse.t >= glitchPulse.duration) glitchPulse = null;
  }
}

function drawOverlayEffects() {
  const W = width();
  const H = height();
  if (flash) {
    const a = Math.max(0, 1 - flash.t / flash.duration);
    fill(0, 0, W, H, 0xff003322 + Math.floor(a * 0xaa));
  }
  if (transition) {
    const p = Math.min(1, transition.t / transition.duration);
    const combatTransition = transition.type === 'combat';
    const block = combatTransition ? Math.max(5, 34 - Math.floor(p * 28)) : 4 + Math.floor(p * 24);
    for (let y = 0; y < H; y += block) {
      for (let x = 0; x < W; x += block) {
        const cell =
          ((x / block + y / block + Math.floor(time * 18)) | 0) % (combatTransition ? 2 : 3);
        if (cell === 0)
          fill(
            x,
            y,
            block - 1,
            block - 1,
            combatTransition ? overlayColor(0x001a33, 170) : overlayColor(0x000000, 153)
          );
      }
    }
    if (combatTransition) {
      const cap = Math.max(2, H * (1 - p) * 0.08);
      for (let y = 0; y < H; y += Math.max(5, 12 - Math.floor(p * 7)))
        fill(0, y, W, 1, overlayColor(0x00ffff, 102));
      fill(0, 0, W, cap, overlayColor(0xff00cc, 136));
      fill(0, H - cap, W, cap, overlayColor(0x00ffff, 136));
    }
    drawCentered(transition.label, H * 0.48, COLORS.cyan, 14);
  }
  if (glitchPulse) {
    const p = Math.min(1, glitchPulse.t / glitchPulse.duration);
    const strength = (1 - p) * glitchPulse.intensity;
    for (let i = 0; i < 8; i++) {
      const y = Math.floor((Math.sin(time * 19 + i * 3.1) + 1) * 0.5 * H);
      const h = 2 + Math.floor(strength * 9);
      const offset = Math.floor(Math.sin(time * 31 + i) * strength * 18);
      fill(
        Math.min(0, offset),
        y,
        W + Math.abs(offset),
        h,
        i % 2 ? overlayColor(0xff00cc, 85) : overlayColor(0x00ffff, 85)
      );
    }
  }
}

function drawFloating() {
  const W = width();
  const H = height();
  for (let i = 0; i < floatingTexts.length; i++) {
    const item = floatingTexts[i];
    const alphaY = (1.2 - item.ttl) * 22;
    drawText(item.text, W * 0.48 + i * 18, H * 0.34 - alphaY, item.color, 12);
  }
}

export function init() {
  removeOverlayCanvases();
  state = createInitialState();
  globalThis.__INDIE_ODYSSEY_ASSETS = {
    base: ASSET_BASE,
    shaders: PRESERVED_SHADER_SOURCES,
    enemies: Object.fromEntries(
      Object.entries(ENEMIES).map(([key, e]) => [key, { model: e.model, sprite: e.sprite }])
    ),
  };
  globalThis.__INDIE_ODYSSEY_DEBUG = {
    forceCombat(enemyIds = ['data_imp']) {
      // Debug entrypoint: disable autoplay so the user can actually look at
      // the combat scene without it ending in ~1.2s from an autoplay attack.
      state.autoplayEnabled = false;
      startCombat(enemyIds);
      syncDebugState();
    },
    forcePlayerHit(amount = 6, source = 'Debug hit') {
      if (!combat) startCombat(['data_imp']);
      damagePlayer(amount, source);
      syncDebugState();
    },
    getCombatEnemies() {
      return combat?.enemies || [];
    },
  };
  map = getCurrentMap();
  buildLevel();
  setScreen('start');
  addMessage('Indie Odyssey cart initialized.', COLORS.green);
  console.log('[indie-odyssey] initialized cross-backend cart');
}

export function update(dt) {
  time += dt;
  storyInputCooldown = Math.max(0, storyInputCooldown - dt);
  handleInput();
  updateMovement(dt);
  updateTimers(dt);
  if (screen === 'story') {
    if (storyTransition) {
      updateStoryTransition(dt);
    } else {
      storyTimer += dt;
      advanceStory(false);
    }
  }
  if (combat && state.autoplayEnabled && !combat.busy) {
    // Hold autoplay until every enemy GLB has either loaded or failed —
    // otherwise the autoplay attack at 1.2s can kill an enemy whose model
    // hasn't even arrived from the network yet, and the player never sees
    // the combat scene. `none` is an enemy with no model at all (fine).
    const allModelsResolved = combat.enemies.every(
      e => e.modelStatus === 'ready' || e.modelStatus === 'error' || e.modelStatus === 'none'
    );
    if (allModelsResolved) {
      autoplayTimer += dt;
      if (autoplayTimer >= 1.6) {
        autoplayTimer = 0;
        const low = state.avatar.health / state.avatar.maxHealth < 0.35;
        executeCombatAction(low && state.avatar.mana >= SPELLS.heal.manaCost ? 'cast' : 'attack');
      }
    } else {
      autoplayTimer = 0;
    }
  }
  specialMeshes.forEach((id, i) => call('scene.rotateMesh', null, id, 0, dt * (0.7 + i * 0.03), 0));
  enemyMeshes.forEach((id, i) => call('scene.rotateMesh', null, id, 0, dt * (0.4 + i * 0.02), 0));
  syncDebugState();
}

export function draw() {
  if (screen !== 'story') hideStoryFrameCanvas();
  if (screen !== 'combat') hideCombatSpriteCanvas();
  if (screen === 'start') drawStart();
  else if (screen === 'story') drawStory();
  else if (screen === 'combat') drawCombat();
  else if (screen === 'inventory') drawInventory();
  else if (screen === 'levelUp') drawLevelUp();
  else if (screen === 'death') drawDeath();
  else drawHUD();
  drawFloating();
  drawOverlayEffects();
}
