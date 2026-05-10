// ⚔️ WIZARDRY NOVA 64 — First-Person Grid-Based Dungeon RPG ⚔️
// Inspired by Wizardry: Proving Grounds of the Mad Overlord

const {
  circle,
  cls,
  colorLerp,
  colorMix,
  createMinimap,
  drawCheckerboard,
  drawCrosshair,
  drawDiamond,
  drawFlash,
  drawFloatingTexts,
  drawFloatingTexts3D,
  drawGlowText,
  drawGlowTextCentered,
  drawGradient,
  drawHealthBar,
  drawMinimap,
  drawNoise,
  drawPanel,
  drawProgressBar,
  drawPulsingText,
  drawRadialGradient,
  drawRoundedRect,
  drawScanlines,
  drawSkyGradient,
  drawStarburst,
  drawTriangle,
  drawWave,
  hexColor,
  hslColor,
  line,
  measureText,
  n64Palette,
  poly,
  print,
  printCentered,
  printRight,
  pset,
  rect,
  rectfill,
  rgba8,
  scrollingTexsetCamera,
} = nova64.draw;
const {
  createAdvancedCube,
  createAdvancedSphere,
  createCapsule,
  createCone,
  createCube,
  createCylinder,
  createInstancedMesh,
  createLODMesh,
  createPlane,
  createSphere,
  createTorus,
  destroyMesh,
  finalizeInstances,
  get3DStats,
  getMesh,
  getPosition,
  getRenderer,
  getRotation,
  getScene,
  moveMesh,
  raycastFromCamera,
  removeInstancedMesh,
  removeLODMesh,
  rotateMesh,
  setCastShadow,
  setFlatShading,
  setInstanceColor,
  setInstanceTransform,
  setMeshOpacity,
  setMeshVisible,
  setPBRProperties,
  setPosition,
  setReceiveShadow,
  setRotation,
  setScale,
  updateLODs,
} = nova64.scene;
const { setCameraFOV, setCameraLookAt, setCameraPosition, setCameraTarget } = nova64.camera;
const {
  animateSkybox,
  clearFog,
  clearSkybox,
  createGradientSkybox,
  createPointLight,
  createSolidSkybox,
  createSpaceSkybox,
  disableSkyboxAutoAnimate,
  enableSkyboxAutoAnimate,
  removeLight,
  setAmbientLight,
  setDirectionalLight,
  setFog,
  setLightColor,
  setLightDirection,
  setPointLightColor,
  setPointLightPosition,
  setSkyboxSpeed,
} = nova64.light;
const {
  burstParticles,
  createParticleSystem,
  disableBloom,
  disableChromaticAberration,
  disableFXAA,
  disableGlitch,
  disablePresetMode,
  disableVignette,
  emitParticle,
  enableBloom,
  enableChromaticAberration,
  enableDithering,
  enableFXAA,
  enableGlitch,
  enableLowPolyMode,
  enableN64Mode,
  enablePSXMode,
  enablePixelation,
  enableRetroEffects,
  enableVignette,
  getParticleStats,
  isEffectsEnabled,
  removeParticleSystem,
  setBloomRadius,
  setBloomStrength,
  setBloomThreshold,
  setGlitchIntensity,
  setParticleEmitter,
  updateParticles,
} = nova64.fx;
const { createShaderMaterial, updateShaderUniform } = nova64.shader;
const {
  btn,
  btnp,
  gamepadAxis,
  gamepadConnected,
  key,
  keyp,
  leftStickX,
  leftStickY,
  mouseDown,
  mousePressed,
  mouseX,
  mouseY,
  rightStickX,
  rightStickY,
} = nova64.input;
const { setVolume, sfx } = nova64.audio;
const { aabb, circleCollision } = nova64.physics;
const {
  Screen,
  centerX,
  centerY,
  createButton,
  drawButton,
  drawGradientRect,
  drawText,
  drawTextOutline,
  drawTextShadow,
  getFont,
  grid,
  setFont,
  setTextAlign,
  setTextBaseline,
  uiProgressBar,
  updateButton,
} = nova64.ui;
const { createGameStore, deleteData, loadData, novaStore, saveData, t } = nova64.data;
const {
  HALF_PI,
  QUARTER_PI,
  TWO_PI,
  arc,
  bezier,
  clamp,
  color,
  colorMode,
  cooldownProgress,
  cooldownReady,
  createCooldownSet,
  createFloatingTextSystem,
  createHitState,
  createPool,
  createShake,
  createSpawner,
  createStateMachine,
  createTimer,
  deg2rad,
  dist,
  dist3d,
  ease,
  ellipse,
  flowField,
  frameCount,
  getShakeOffset,
  hsb,
  isFlashing,
  isInvulnerable,
  isVisible,
  lerp,
  lerpColor,
  noise,
  noiseDetail,
  noiseMap,
  noiseSeed,
  popMatrix,
  pushMatrix,
  quadCurve,
  rad2deg,
  randInt,
  randRange,
  remap,
  rotate,
  scale2d,
  smoothstep,
  translate,
  triggerHit,
  triggerShake,
  updateCooldowns,
  updateHitState,
  updateShake,
  updateSpawner,
  useCooldown,
} = nova64.util;

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
    { name: 'Bat Swarm', hp: 5, atk: 2, def: 0, xp: 4, gold: 2, color: 0x554444, shape: 'beast' },
    { name: 'Goblin', hp: 10, atk: 3, def: 1, xp: 6, gold: 4, color: 0x668844, shape: 'small' },
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
    { name: 'Gargoyle', hp: 25, atk: 7, def: 5, xp: 18, gold: 12, color: 0x888888, shape: 'brute' },
    { name: 'Mimic', hp: 20, atk: 9, def: 3, xp: 22, gold: 25, color: 0x886633, shape: 'small' },
    { name: 'Specter', hp: 16, atk: 7, def: 2, xp: 16, gold: 8, color: 0x6666aa, shape: 'ghost' },
  ],
  // Floor 5-6
  [
    { name: 'Troll', hp: 35, atk: 10, def: 5, xp: 30, gold: 20, color: 0x336633, shape: 'brute' },
    { name: 'Wraith', hp: 25, atk: 12, def: 3, xp: 35, gold: 25, color: 0x333355, shape: 'ghost' },
    { name: 'Dragon', hp: 60, atk: 15, def: 8, xp: 80, gold: 50, color: 0xcc4422, shape: 'dragon' },
    {
      name: 'Fire Elemental',
      hp: 30,
      atk: 14,
      def: 4,
      xp: 40,
      gold: 30,
      color: 0xff4400,
      shape: 'caster',
    },
    { name: 'Medusa', hp: 28, atk: 11, def: 6, xp: 45, gold: 35, color: 0x448844, shape: 'caster' },
    {
      name: 'Iron Golem',
      hp: 50,
      atk: 9,
      def: 10,
      xp: 50,
      gold: 40,
      color: 0x777788,
      shape: 'brute',
    },
  ],
  // Floor 7+
  [
    {
      name: 'Demon Lord',
      hp: 70,
      atk: 18,
      def: 8,
      xp: 100,
      gold: 60,
      color: 0xaa2222,
      shape: 'dragon',
    },
    { name: 'Lich', hp: 45, atk: 20, def: 5, xp: 90, gold: 55, color: 0x6644aa, shape: 'caster' },
    {
      name: 'Death Knight',
      hp: 55,
      atk: 16,
      def: 9,
      xp: 85,
      gold: 50,
      color: 0x333344,
      shape: 'undead',
    },
  ],
];

// Boss monsters (floor 3 and 5)
const BOSSES = {
  1: {
    name: 'Goblin Chieftain',
    hp: 40,
    atk: 6,
    def: 3,
    xp: 30,
    gold: 25,
    color: 0x668833,
    shape: 'brute',
  },
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
  6: {
    name: 'Frost Titan',
    hp: 120,
    atk: 18,
    def: 12,
    xp: 180,
    gold: 90,
    color: 0x88bbff,
    shape: 'brute',
  },
  7: {
    name: 'Infernal Archon',
    hp: 200,
    atk: 25,
    def: 12,
    xp: 300,
    gold: 150,
    color: 0xff2200,
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
  { name: 'Blessed Hammer', slot: 'weapon', atk: 4, def: 1, class: 'Priest', tier: 2 },
  { name: 'Frost Brand', slot: 'weapon', atk: 4, def: 0, class: 'Fighter', tier: 2, mpBonus: 1 },
  { name: 'Wand of Lightning', slot: 'weapon', atk: 3, def: 0, class: 'Mage', tier: 2, mpBonus: 4 },
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
  { name: 'Frost Mail', slot: 'armor', atk: 0, def: 5, class: 'Fighter', tier: 3 },
  { name: 'Archmage Robe', slot: 'armor', atk: 0, def: 2, class: 'Mage', tier: 3, mpBonus: 5 },
  { name: 'Holy Plate', slot: 'armor', atk: 0, def: 4, class: 'Priest', tier: 3, mpBonus: 4 },
  { name: 'Assassin Garb', slot: 'armor', atk: 2, def: 2, class: 'Thief', tier: 2 },
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
  LIGHTNING: {
    name: 'Lightning Bolt',
    cost: 4,
    dmg: 15,
    type: 'attack',
    class: 'Mage',
    desc: 'Chain lightning',
  },
  SLOW: {
    name: 'Slow',
    cost: 3,
    amount: 3,
    type: 'debuff_def',
    class: 'Mage',
    desc: '-DEF enemies',
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
  GROUP_HEAL: {
    name: 'Group Heal',
    cost: 5,
    amount: 10,
    type: 'group_heal',
    class: 'Priest',
    desc: 'Heal all allies',
  },
  SMITE: { name: 'Smite', cost: 3, dmg: 10, type: 'attack', class: 'Priest', desc: 'Holy damage' },
  // Thief spells
  BACKSTAB: {
    name: 'Backstab',
    cost: 2,
    dmg: 18,
    type: 'attack',
    class: 'Thief',
    desc: 'Bonus damage',
  },
};

// Shop items available for purchase
const SHOP_ITEMS = [
  {
    name: 'Healing Potion',
    type: 'potion',
    effect: 'hp',
    amount: 25,
    cost: 15,
    desc: 'Restore 25 HP to one ally',
  },
  {
    name: 'Mana Potion',
    type: 'potion',
    effect: 'mp',
    amount: 10,
    cost: 20,
    desc: 'Restore 10 MP to one ally',
  },
  {
    name: 'Revival Herb',
    type: 'potion',
    effect: 'revive',
    amount: 15,
    cost: 50,
    desc: 'Revive a fallen ally',
  },
  {
    name: 'Party Heal',
    type: 'potion',
    effect: 'party_hp',
    amount: 15,
    cost: 40,
    desc: 'Restore 15 HP to all',
  },
  {
    name: 'Whetstone',
    type: 'buff',
    effect: 'atk',
    amount: 2,
    cost: 30,
    desc: '+2 ATK to one ally for next floor',
  },
  {
    name: 'Iron Shield',
    type: 'buff',
    effect: 'def',
    amount: 2,
    cost: 30,
    desc: '+2 DEF to one ally for next floor',
  },
];

// Floor atmosphere themes
const FLOOR_THEMES = [
  {
    name: 'Musty Cellars',
    wallColor: 0x887766,
    floorColor: 0x554433,
    ceilColor: 0x443322,
    fogColor: 0x1a1510,
    skyTop: 0x221510,
    skyBot: 0x0a0805,
    ambColor: 0x665544,
    ambInt: 0.55,
  },
  {
    name: 'Flooded Crypts',
    wallColor: 0x556677,
    floorColor: 0x334455,
    ceilColor: 0x1a2233,
    fogColor: 0x0a1520,
    skyTop: 0x102030,
    skyBot: 0x080c10,
    ambColor: 0x445566,
    ambInt: 0.5,
  },
  {
    name: 'Fungal Warrens',
    wallColor: 0x558855,
    floorColor: 0x336633,
    ceilColor: 0x1a441a,
    fogColor: 0x0a1a0a,
    skyTop: 0x153015,
    skyBot: 0x081008,
    ambColor: 0x447744,
    ambInt: 0.55,
  },
  {
    name: 'Obsidian Vaults',
    wallColor: 0x445566,
    floorColor: 0x223344,
    ceilColor: 0x151530,
    fogColor: 0x0a0a1a,
    skyTop: 0x151530,
    skyBot: 0x080810,
    ambColor: 0x334466,
    ambInt: 0.45,
  },
  {
    name: "The Dragon's Lair",
    wallColor: 0x885533,
    floorColor: 0x663318,
    ceilColor: 0x441a08,
    fogColor: 0x200a00,
    skyTop: 0x301500,
    skyBot: 0x100800,
    ambColor: 0x774422,
    ambInt: 0.5,
  },
  {
    name: 'Frozen Catacombs',
    wallColor: 0x667788,
    floorColor: 0x445566,
    ceilColor: 0x334455,
    fogColor: 0x1a2535,
    skyTop: 0x203040,
    skyBot: 0x101820,
    ambColor: 0x5577aa,
    ambInt: 0.5,
  },
  {
    name: 'Infernal Pit',
    wallColor: 0x884422,
    floorColor: 0x661a00,
    ceilColor: 0x441100,
    fogColor: 0x300800,
    skyTop: 0x401000,
    skyBot: 0x200500,
    ambColor: 0x883311,
    ambInt: 0.45,
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
let floorMessage;
let floorMessageTimer;

// Visual state
let screenFlash; // {r, g, b, alpha, decay}
let animatedMeshes; // meshes that bob/rotate
let particleSystems; // track active particle system IDs
let explored; // Set of "x,y" strings for fog-of-war minimap
let bossDefeated; // Set of floor numbers where boss was killed
let minimap; // nova64.draw.createMinimap() object for dungeon map
let stateMachine; // createStateMachine for game flow

// Shop state
let shopItems; // current shop inventory
let shopCursor; // selected shop item index
let shopTarget; // which party member to apply item to

// Hit/invulnerability state for party
let hitStates; // array of createHitState per party member
let chromaTimer; // timer for chromatic aberration effect on boss hits
let glitchTimer; // timer for screen glitch effect on player damage
let combatFOV; // smooth FOV lerp for combat zoom
let floorTransition; // checkerboard wipe timer when entering floors
let cooldowns; // createCooldownSet for input + movement

// Spell VFX overlay
let spellVFX; // { type, x, y, timer, color } for drawStarburst/drawRadialGradient

// Visual preset mode (toggled in inventory)
let visualPreset; // null, 'n64', or 'psx'

// Floor message timer (createTimer API)
let msgTimer; // createTimer object for floor messages

// Encounter spawner (createSpawner API) — scales encounter count per floor
let encounterSpawner;

// Combat spark pool (createPool API)
let sparkPool; // pool of {x, y, vx, vy, life, color} for hit sparks

// Water shader tracking (createShaderMaterial API)
let waterShaders; // array of { shaderId, meshId } for animated fountain water

// 3D floating damage texts (drawFloatingTexts3D API)
let floatingTexts3D; // separate system for world-space damage numbers

// Instanced dungeon decorations (createInstancedMesh API)
let instancedDecor; // instanced mesh ID for floor crystal decorations

// Boss flow field energy pattern (flowField API)
let bossFlowField; // Float32Array of angles for boss room visualization

// Procedural floor fog texture (noiseMap API)
let floorNoiseMap; // Float32Array for deep floor atmospheric overlay

// Game over restart button (createButton API)
let restartButton;

// Game statistics store (createGameStore API)
let gameStats;

// LOD torch decorations (createLODMesh API)
let lodTorches;

// Title screen 3D scene
let titleMeshes = [];
let titleLights = [];
let titleParticles = [];

// 3D mesh tracking
let currentLevelMeshes = [];
let monsterMeshes = [];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

// Transition game state via state machine for elapsed tracking
function switchState(newState) {
  gameState = newState;
  if (stateMachine) stateMachine.switchTo(newState);
  // Track state in global novaStore for cross-system awareness
  if (typeof novaStore !== 'undefined' && novaStore) {
    novaStore.setState({ gameState: newState, floor: floor || 0 });
  }
}

// State elapsed time (seconds in current state)
function stateElapsed() {
  return stateMachine ? stateMachine.getElapsed() : animTimer;
}

// Project 3D world coordinates to 2D screen for drawFloatingTexts3D
function worldToScreen(wx, wy, wz) {
  const cx = px * TILE,
    cz = py * TILE,
    cy = 1.6;
  const [fdx, fdz] = DIRS[facing];
  const dx = wx - cx,
    dy = wy - cy,
    dz = wz - cz;
  const depth = dx * fdx + dz * fdz;
  if (depth <= 0.1) return [W / 2, H / 2];
  const right = dx * -fdz + dz * fdx;
  const halfFOV = Math.tan(((combatFOV || 75) * Math.PI) / 360);
  const sx = W / 2 + (right / (depth * halfFOV)) * (W / 2);
  const sy = H / 2 - (dy / (depth * halfFOV * (H / W))) * (H / 2);
  return [sx, sy];
}

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
// TITLE SCREEN 3D SCENE
// ═══════════════════════════════════════════════════════════════════════

function buildTitleScene() {
  clearTitleScene();
  const wallColor = 0x665544;
  const floorColor = 0x443322;
  const ceilColor = 0x2a1a0a;

  // Stone corridor walls (left and right, extending into the distance)
  for (let i = 0; i < 8; i++) {
    const z = -3 - i * 3;
    const wL = nova64.scene.createCube(TILE, wallColor, [-TILE, 0, z], { roughness: 0.9 });
    const wR = nova64.scene.createCube(TILE, wallColor, [TILE, 0, z], { roughness: 0.9 });
    nova64.scene.setCastShadow(wL, true);
    nova64.scene.setCastShadow(wR, true);
    nova64.scene.setReceiveShadow(wL, true);
    nova64.scene.setReceiveShadow(wR, true);
    titleMeshes.push(wL, wR);
  }

  // Floor and ceiling planes
  const fl = nova64.scene.createPlane(TILE * 2.2, 30, floorColor, [0, -1.5, -14]);
  nova64.scene.setReceiveShadow(fl, true);
  titleMeshes.push(fl);
  const ceil = nova64.scene.createPlane(TILE * 2.2, 30, ceilColor, [0, 1.5, -14]);
  nova64.scene.setRotation(ceil, Math.PI, 0, 0);
  titleMeshes.push(ceil);

  // Torches along the corridor (alternating left/right)
  const torchPositions = [
    [-2.4, 1.0, -5],
    [2.4, 1.0, -8],
    [-2.4, 1.0, -11],
    [2.4, 1.0, -14],
    [-2.4, 1.0, -17],
    [2.4, 1.0, -20],
  ];
  for (const [tx, ty, tz] of torchPositions) {
    // Torch cone (emissive flame)
    const torch = nova64.scene.createCone(0.12, 0.35, 0xffaa33, [tx, ty, tz], {
      material: 'emissive',
      emissive: 0xff8800,
      intensity: 2,
    });
    titleMeshes.push(torch);
    // Warm point light
    const light = nova64.light.createPointLight(0xff8833, 2.5, 10, tx, ty + 0.5, tz);
    titleLights.push(light);
  }

  // Glowing portal at the far end
  const portal = nova64.scene.createTorus(1.5, 0.12, 0x8844ff, [0, 0, -24], {
    material: 'emissive',
    emissive: 0x8844ff,
    intensity: 3,
  });
  titleMeshes.push(portal);
  const portalGlow = nova64.scene.createSphere(0.7, 0x6622cc, [0, 0, -24], {
    material: 'emissive',
    emissive: 0x6622ff,
    intensity: 2,
  });
  titleMeshes.push(portalGlow);
  // Portal light
  const portalLight = nova64.light.createPointLight(0x7733ff, 3, 12, 0, 0, -24);
  titleLights.push(portalLight);

  // Particle system for floating embers
  const ps = nova64.fx.createParticleSystem({
    max: 60,
    size: 0.08,
    color: 0xffaa44,
    emissive: true,
  });
  titleParticles.push(ps);
}

function clearTitleScene() {
  for (const id of titleMeshes) nova64.scene.destroyMesh(id);
  for (const id of titleLights) nova64.light.removeLight(id);
  for (const id of titleParticles) nova64.fx.removeParticleSystem(id);
  titleMeshes = [];
  titleLights = [];
  titleParticles = [];
}

// ═══════════════════════════════════════════════════════════════════════
// 3D LEVEL BUILDING
// ═══════════════════════════════════════════════════════════════════════

function clearLevel() {
  for (const id of currentLevelMeshes) nova64.scene.destroyMesh(id);
  currentLevelMeshes = [];
  nova64.light.clearSkybox(); // clean up old skybox before rebuilding
  if (torchLights) {
    for (const id of torchLights) nova64.light.removeLight(id);
  }
  torchLights = [];
  // Clean up particle systems
  if (particleSystems) {
    for (const id of particleSystems) nova64.fx.removeParticleSystem(id);
  }
  particleSystems = [];
  // Clean up instanced decorations before rebuilding
  if (instancedDecor) {
    nova64.scene.removeInstancedMesh(instancedDecor);
    instancedDecor = null;
  }
  floorNoiseMap = null; // regenerate noiseMap fog per floor
  // Clean up LOD torches
  if (lodTorches) {
    for (const id of lodTorches) nova64.scene.removeLODMesh(id);
  }
  lodTorches = [];
  waterShaders = [];
  clearMonsterMeshes();
}

function clearMonsterMeshes() {
  for (const id of monsterMeshes) nova64.scene.destroyMesh(id);
  monsterMeshes = [];
}

function buildLevel() {
  clearLevel();

  const theme = FLOOR_THEMES[Math.min(floor - 1, FLOOR_THEMES.length - 1)];

  // Update atmosphere per floor
  nova64.light.setAmbientLight(theme.ambColor, theme.ambInt);
  nova64.light.setFog(theme.fogColor, 2, 20 - floor);
  // Dragon's Lair gets a dramatic space skybox; other floors use gradient
  if (floor === 5) {
    nova64.light.createSpaceSkybox({ starCount: 600, nebula: true });
  } else {
    nova64.light.createGradientSkybox(theme.skyTop, theme.skyBot);
  }
  // Set directional light angle per floor for varied shadow casting
  const lightAngle = -0.8 - floor * 0.1;
  nova64.light.setDirectionalLight([0.3, lightAngle, -0.5], theme.ambColor, 0.6 + floor * 0.08);
  // Vary skybox rotation speed per floor depth
  nova64.light.setSkyboxSpeed(0.2 + floor * 0.1);

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
          const m = nova64.scene.createCube(TILE, theme.wallColor, [wx, TILE / 2, wz], {
            roughness: 0.9,
          });
          currentLevelMeshes.push(m);
        }
      } else {
        // Floor — receives shadows from walls, objects, and monsters
        const f = nova64.scene.createPlane(TILE, TILE, theme.floorColor, [wx, 0.01, wz]);
        nova64.scene.rotateMesh(f, -HALF_PI, 0, 0);
        nova64.scene.setReceiveShadow(f, true);
        currentLevelMeshes.push(f);

        // Ceiling
        const c = nova64.scene.createPlane(TILE, TILE, theme.ceilColor, [wx, TILE, wz]);
        nova64.scene.rotateMesh(c, HALF_PI, 0, 0);
        currentLevelMeshes.push(c);

        // Special tiles
        if (tile === T.DOOR) {
          // Wooden door frame
          const d = nova64.scene.createCube(TILE * 0.1, 0x886622, [wx, TILE / 2, wz], {
            roughness: 0.7,
          });
          nova64.scene.setScale(d, 1, 1, 0.3);
          currentLevelMeshes.push(d);
          // Door handle
          const handle = nova64.scene.createSphere(0.08, 0xccaa44, [wx + 0.3, TILE * 0.45, wz], 4, {
            material: 'emissive',
            emissive: 0xccaa44,
            emissiveIntensity: 0.3,
          });
          currentLevelMeshes.push(handle);
          nova64.scene.setPBRProperties(handle, { metalness: 0.9, roughness: 0.2 });
        } else if (tile === T.STAIRS_DOWN) {
          const s = nova64.scene.createCone(0.5, 1, 0x44aaff, [wx, 0.5, wz], {
            material: 'emissive',
            emissive: 0x44aaff,
            emissiveIntensity: 0.8,
          });
          currentLevelMeshes.push(s);
          animatedMeshes.push({ id: s, type: 'bob', baseY: 0.5, speed: 2, range: 0.2 });
          // Stair glow particles
          const ps = nova64.fx.createParticleSystem(20, {
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
          nova64.fx.setParticleEmitter(ps, { position: [wx, 0.5, wz] });
          particleSystems.push(ps);
          const l = nova64.light.createPointLight(0x44aaff, 1.5, 8, wx, 1.5, wz);
          torchLights.push(l);
        } else if (tile === T.STAIRS_UP) {
          const s = nova64.scene.createCone(0.5, 1, 0xffaa44, [wx, 0.5, wz], {
            material: 'emissive',
            emissive: 0xffaa44,
            emissiveIntensity: 0.8,
          });
          currentLevelMeshes.push(s);
          animatedMeshes.push({ id: s, type: 'bob', baseY: 0.5, speed: 2, range: 0.2 });
        } else if (tile === T.CHEST) {
          // Chest body
          const ch = nova64.scene.createCube(0.6, 0xddaa33, [wx, 0.35, wz], {
            roughness: 0.4,
            metallic: true,
          });
          nova64.scene.setScale(ch, 1, 0.7, 0.7);
          currentLevelMeshes.push(ch);
          // Glowing lock
          const lock = nova64.scene.createSphere(0.06, 0xffee66, [wx, 0.5, wz - 0.22], 4, {
            material: 'emissive',
            emissive: 0xffee66,
            emissiveIntensity: 0.6,
          });
          currentLevelMeshes.push(lock);
          nova64.scene.setPBRProperties(lock, { metalness: 1.0, roughness: 0.1 });
          animatedMeshes.push({ id: lock, type: 'pulse', baseScale: 1, speed: 3, range: 0.3 });
        } else if (tile === T.FOUNTAIN) {
          const fb = nova64.scene.createCylinder(0.6, 0.6, 0x667788, 8, [wx, 0.2, wz]);
          currentLevelMeshes.push(fb);
          const fw = nova64.scene.createSphere(0.3, 0x3388ff, [wx, 0.5, wz], 6, {
            material: 'emissive',
            emissive: 0x3388ff,
            emissiveIntensity: 0.6,
          });
          currentLevelMeshes.push(fw);
          animatedMeshes.push({ id: fw, type: 'bob', baseY: 0.5, speed: 1.5, range: 0.15 });
          // Apply animated water shader via createShaderMaterial
          const wShader = nova64.shader.createShaderMaterial('water');
          if (wShader) {
            const rawMesh = nova64.scene.getMesh(fw);
            if (rawMesh) rawMesh.material = wShader.material;
            waterShaders.push({ shaderId: wShader.id, meshId: fw });
          }
          // Water particles
          const ps = nova64.fx.createParticleSystem(15, {
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
          nova64.fx.setParticleEmitter(ps, { position: [wx, 0.6, wz] });
          particleSystems.push(ps);
          const l = nova64.light.createPointLight(0x3388ff, 1, 6, wx, 1, wz);
          torchLights.push(l);
        } else if (tile === T.TRAP) {
          // Trap - subtle floor glyph
          const trap = nova64.scene.createPlane(1.2, 1.2, 0x662222, [wx, 0.02, wz]);
          nova64.scene.rotateMesh(trap, -HALF_PI, 0, 0);
          currentLevelMeshes.push(trap);
          // Warning rune
          const rune = nova64.scene.createTorus(0.3, 0.04, 0x881111, 6, [wx, 0.03, wz]);
          nova64.scene.rotateMesh(rune, HALF_PI, 0, 0);
          currentLevelMeshes.push(rune);
          animatedMeshes.push({ id: rune, type: 'spin', speed: 1 });
        } else if (tile === T.BOSS) {
          // Boss marker — advanced pillar with full PBR (createAdvancedCube)
          const pillar = nova64.scene.createAdvancedCube(
            0.8,
            { color: 0x440022, metalness: 0.7, roughness: 0.3 },
            [wx, 1.25, wz]
          );
          nova64.scene.setScale(pillar, 0.5, 3.1, 0.5);
          currentLevelMeshes.push(pillar);
          const orb = nova64.scene.createAdvancedSphere(
            0.3,
            { color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 1.2 },
            [wx, 2.6, wz],
            8
          );
          currentLevelMeshes.push(orb);
          animatedMeshes.push({ id: orb, type: 'pulse', baseScale: 1, speed: 2, range: 0.4 });
          const l = nova64.light.createPointLight(0xff0044, 2, 10, wx, 2, wz);
          torchLights.push(l);
        }

        // Scatter torches with particle fire + LOD variants
        if (tile === T.FLOOR && Math.random() < 0.08) {
          const l = nova64.light.createPointLight(0xffaa44, 2.5, 12, wx, 2.2, wz);
          torchLights.push({ lightId: l, baseIntensity: 1.2, wx, wz });
          // Create LOD torch: high detail close, low detail far
          const lod = nova64.scene.createLODMesh(
            [
              { shape: 'cone', size: 0.3, color: 0xff6600, distance: 0 },
              { shape: 'cube', size: 0.15, color: 0xff6600, distance: 12 },
            ],
            [wx, 2.5, wz]
          );
          if (lod) lodTorches.push(lod);
          const torch = nova64.scene.createCone(0.1, 0.3, 0xff6600, [wx, 2.5, wz], {
            material: 'emissive',
            emissive: 0xff6600,
            emissiveIntensity: 1.0,
          });
          currentLevelMeshes.push(torch);
          // Fire particles
          const ps = nova64.fx.createParticleSystem(12, {
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
          nova64.fx.setParticleEmitter(ps, { position: [wx, 2.6, wz] });
          particleSystems.push(ps);
          // Track light for flickering
          torchLights.push({ lightId: l, baseIntensity: 1.2, wx, wz });
        }
      }
    }
  }

  // Instanced crystal decorations scattered on floors (createInstancedMesh)
  const crystalPositions = [];
  for (let y = 0; y < dungeonH; y++) {
    for (let x = 0; x < dungeonW; x++) {
      if (dungeon[y][x] === T.FLOOR && Math.random() < 0.025) {
        crystalPositions.push([x * TILE, 0.15, y * TILE]);
      }
    }
  }
  if (crystalPositions.length > 0) {
    instancedDecor = nova64.scene.createInstancedMesh(
      'cone',
      crystalPositions.length,
      theme.wallColor,
      {
        size: 0.2,
      }
    );
    for (let i = 0; i < crystalPositions.length; i++) {
      const [cx, cy, cz] = crystalPositions[i];
      const rot = Math.random() * TWO_PI;
      nova64.scene.setInstanceTransform(instancedDecor, i, cx, cy, cz, 0, rot, 0, 0.12, 0.25, 0.12);
      nova64.scene.setInstanceColor(instancedDecor, i, theme.ambColor);
    }
    nova64.scene.finalizeInstances(instancedDecor);
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
    // Use spawner wave count to scale encounters as player explores
    if (encounterSpawner) {
      encounterSpawner.wave++;
      encounterSpawner.totalSpawned++;
    }
    const waveBonus = encounterSpawner ? Math.min(encounterSpawner.wave, 3) : 0;
    count = 1 + nova64.util.randInt(0, Math.min(3, floor) - 1) + Math.floor(waveBonus / 2);
    count = Math.min(count, 4); // cap at 4 enemies
    enemies = [];
    for (let i = 0; i < count; i++) {
      const template = pool[nova64.util.randInt(0, pool.length - 1)];
      const scale = nova64.util.randRange(0.8, 1.2);
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

    // Use dist3d to compute monster distance from player for combat info
    e.distFromPlayer = nova64.util.dist3d(px * TILE, 1.6, py * TILE, mx, 1, mz);

    const meshIds = createMonsterMesh(e, mx, mz, dx, dz);
    monsterMeshes.push(...meshIds);
    e.meshBody = meshIds[0];
    e.allMeshes = meshIds;
  }

  const waveLabel =
    encounterSpawner && encounterSpawner.wave > 1 ? ` [Wave ${encounterSpawner.wave}]` : '';
  combatLog = [
    enemies[0].isBoss
      ? `BOSS: ${enemies[0].name} blocks your path!`
      : `${enemies.length} ${enemies.length > 1 ? 'monsters appear' : enemies[0].name + ' appears'}!${waveLabel}`,
  ];
  combatTurn = 0;
  combatAction = 'choose';
  selectedTarget = 0;
  switchState('combat');
  nova64.audio.setVolume(0.8); // louder for combat intensity

  if (enemies[0].isBoss) {
    nova64.util.triggerShake(shake, 0.8);
    triggerScreenFlash(255, 0, 50, 200);
    nova64.fx.enableChromaticAberration(0.006);
    nova64.fx.setBloomStrength(1.8); // intensify bloom for boss encounter
    nova64.fx.setBloomRadius(0.6); // wider bloom spread for boss drama
    // Burst particles on all visible particle systems for boss entrance
    for (const psId of particleSystems) nova64.fx.burstParticles(psId, 12);
    // Generate flow field energy pattern for boss room visualization
    bossFlowField = nova64.util.flowField(16, 12, 0.08, animTimer);
  }
}

// Create varied 3D monster based on shape type
function createMonsterMesh(e, mx, mz, dx, dz) {
  const ids = [];
  const s = e.isBoss ? 1.5 : 1.0;
  const shape = e.shape || 'small';

  if (shape === 'beast') {
    // Low, wide body with ears
    const body = nova64.scene.createCube(0.8 * s, e.color, [mx, 0.5 * s, mz], { roughness: 0.8 });
    nova64.scene.setScale(body, 1.3, 0.7, 1);
    const ear1 = nova64.scene.createCone(0.15 * s, 0.4 * s, e.color, [mx - 0.3 * s, 0.9 * s, mz], {
      roughness: 0.8,
    });
    const ear2 = nova64.scene.createCone(0.15 * s, 0.4 * s, e.color, [mx + 0.3 * s, 0.9 * s, mz], {
      roughness: 0.8,
    });
    const eye1 = nova64.scene.createSphere(
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
    const eye2 = nova64.scene.createSphere(
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
    const body = nova64.scene.createCube(0.6 * s, e.color, [mx, 0.8 * s, mz], { roughness: 0.9 });
    nova64.scene.setScale(body, 0.7, 1.3, 0.5);
    const head = nova64.scene.createSphere(0.35 * s, e.color, [mx, 1.6 * s, mz], 6, {
      roughness: 0.9,
    });
    const eye1 = nova64.scene.createSphere(
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
    const eye2 = nova64.scene.createSphere(
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
    const body = nova64.scene.createCube(1.0 * s, e.color, [mx, 0.9 * s, mz], { roughness: 0.7 });
    nova64.scene.setScale(body, 1.2, 1.4, 0.9);
    const head = nova64.scene.createSphere(0.4 * s, e.color, [mx, 1.8 * s, mz], 6);
    const arm1 = nova64.scene.createCylinder(0.2 * s, 1.0 * s, e.color, 6, [
      mx - 0.8 * s,
      1.0 * s,
      mz,
    ]);
    const arm2 = nova64.scene.createCylinder(0.2 * s, 1.0 * s, e.color, 6, [
      mx + 0.8 * s,
      1.0 * s,
      mz,
    ]);
    const eye1 = nova64.scene.createSphere(
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
    const eye2 = nova64.scene.createSphere(
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
    // Translucent floating form — capsule body for ethereal silhouette
    const body = nova64.scene.createCapsule(0.5 * s, 0.8 * s, e.color, [mx, 1.2 * s, mz], {
      material: 'emissive',
      emissive: e.color,
      emissiveIntensity: 0.4,
    });
    nova64.scene.setMeshOpacity(body, 0.6);
    const tail = nova64.scene.createCone(0.5 * s, 1.2 * s, e.color, [mx, 0.3 * s, mz]);
    nova64.scene.setMeshOpacity(tail, 0.4);
    const eye1 = nova64.scene.createSphere(
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
    const eye2 = nova64.scene.createSphere(
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
    // Ghosts shouldn't cast shadows — ethereal beings
    for (const id of ids) nova64.scene.setCastShadow(id, false);
    animatedMeshes.push({ id: body, type: 'bob', baseY: 1.2 * s, speed: 1.5, range: 0.3 });
  } else if (shape === 'caster') {
    // Robed figure with glowing staff
    const body = nova64.scene.createCone(0.5 * s, 1.8 * s, e.color, [mx, 0.9 * s, mz], {
      roughness: 0.8,
    });
    const head = nova64.scene.createSphere(0.3 * s, e.color, [mx, 2.0 * s, mz], 6);
    const staff = nova64.scene.createCylinder(0.05 * s, 2.2 * s, 0x886633, 4, [
      mx + 0.5 * s,
      1.1 * s,
      mz,
    ]);
    const orb = nova64.scene.createSphere(0.15 * s, 0xff44ff, [mx + 0.5 * s, 2.3 * s, mz], 6, {
      material: 'emissive',
      emissive: 0xff44ff,
      emissiveIntensity: 1.2,
    });
    const eye1 = nova64.scene.createSphere(
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
    const eye2 = nova64.scene.createSphere(
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
    const body = nova64.scene.createCube(1.2 * s, e.color, [mx, 1.0 * s, mz], { roughness: 0.6 });
    nova64.scene.setScale(body, 1.4, 0.8, 1.8);
    const neck = nova64.scene.createCylinder(0.25 * s, 0.8 * s, e.color, 6, [
      mx,
      1.6 * s,
      mz - dz * 0.6 - dx * 0.6,
    ]);
    nova64.scene.rotateMesh(neck, 0.4, 0, 0);
    const head = nova64.scene.createCube(0.5 * s, e.color, [mx, 2.0 * s, mz - dz * 1.0 - dx * 1.0]);
    nova64.scene.setScale(head, 1, 0.6, 1.5);
    // Wings
    const wing1 = nova64.scene.createPlane(1.5 * s, 1.0 * s, e.color, [mx - 1.0 * s, 1.5 * s, mz]);
    nova64.scene.rotateMesh(wing1, 0, 0, -0.3);
    const wing2 = nova64.scene.createPlane(1.5 * s, 1.0 * s, e.color, [mx + 1.0 * s, 1.5 * s, mz]);
    nova64.scene.rotateMesh(wing2, 0, 0, 0.3);
    // Eyes
    const eye1 = nova64.scene.createSphere(
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
    const eye2 = nova64.scene.createSphere(
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
    const body = nova64.scene.createCube(0.8 * s, e.color, [mx, 0.7 * s, mz], { roughness: 0.8 });
    nova64.scene.setScale(body, 0.8, 1.0, 0.6);
    const head = nova64.scene.createSphere(0.25 * s, e.color, [mx, 1.3 * s, mz], 6);
    const eye1 = nova64.scene.createSphere(
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
    const eye2 = nova64.scene.createSphere(
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

  // Apply N64-style flat shading to monster body mesh for retro low-poly look
  if (ids.length > 0) nova64.scene.setFlatShading(ids[0], true);

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

// Spawn hit sparks at a screen position using createPool
function spawnSparks(x, y, color, count) {
  if (!sparkPool) return;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * TWO_PI;
    const spd = 30 + Math.random() * 60;
    sparkPool.spawn(s => {
      s.x = x + (Math.random() - 0.5) * 10;
      s.y = y + (Math.random() - 0.5) * 10;
      s.vx = Math.cos(ang) * spd;
      s.vy = Math.sin(ang) * spd;
      s.life = 0.4 + Math.random() * 0.3;
      s.color = color;
    });
  }
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
  if (spell.type === 'group_heal') {
    for (const m of party) {
      if (m.alive) m.hp = Math.min(m.hp + spell.amount, m.maxHp);
    }
    return { type: 'group_heal', amount: spell.amount };
  }
  if (spell.type === 'debuff_def') {
    for (const e of enemies) {
      if (e.hp > 0) e.def = Math.max(0, e.def - spell.amount);
    }
    return { type: 'debuff_def', amount: spell.amount };
  }
  if (spell.type === 'attack' || spell.type === 'undead') {
    if (spell.name === 'Ice Bolt') {
      // Single target
      const dmg = spell.dmg + Math.floor(Math.random() * 4);
      target.hp = Math.max(0, target.hp - dmg);
      triggerScreenFlash(80, 150, 255, 150);
      nova64.audio.sfx({ wave: 'triangle', freq: 800, dur: 0.3, sweep: -400 }); // icy descend
      return { type: 'damage', dmg, targets: [target] };
    }
    if (spell.name === 'Lightning Bolt') {
      // Chain lightning: hits primary target hard, then chain to others for half
      const dmg = spell.dmg + Math.floor(Math.random() * 5);
      target.hp = Math.max(0, target.hp - dmg);
      let totalDmg = dmg;
      const others = enemies.filter(e => e.hp > 0 && e !== target);
      for (const e of others) {
        const chain = Math.floor(dmg * 0.5);
        e.hp = Math.max(0, e.hp - chain);
        totalDmg += chain;
      }
      triggerScreenFlash(200, 200, 255, 180);
      nova64.audio.sfx({ wave: 'square', freq: 1200, dur: 0.15, sweep: -800 }); // electric zap
      return { type: 'damage', dmg: totalDmg, targets: [target, ...others] };
    }
    if (spell.name === 'Backstab' || spell.name === 'Smite') {
      // Single target high damage
      const dmg = spell.dmg + Math.floor(Math.random() * 6);
      target.hp = Math.max(0, target.hp - dmg);
      triggerScreenFlash(
        spell.name === 'Smite' ? 255 : 180,
        spell.name === 'Smite' ? 255 : 80,
        spell.name === 'Smite' ? 180 : 200,
        140
      );
      nova64.audio.sfx(
        spell.name === 'Smite' ? { wave: 'sine', freq: 500, dur: 0.3, sweep: 300 } : 'hit'
      );
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
    if (spell.name === 'Fireball') {
      triggerScreenFlash(255, 120, 30, 180);
      nova64.audio.sfx({ wave: 'sawtooth', freq: 200, dur: 0.5, sweep: 100 }); // fire roar
    } else if (spell.name === 'Turn Undead') {
      triggerScreenFlash(255, 255, 180, 150);
      nova64.audio.sfx({ wave: 'sine', freq: 600, dur: 0.4, sweep: 200 }); // holy chime
    }
    // Use circleCollision for AoE range validation log
    const aoeRange = 3;
    const inAoE = enemies.filter(
      e =>
        e.hp > 0 &&
        nova64.physics.circleCollision(
          px,
          py,
          aoeRange,
          px + Math.random(),
          py + Math.random(),
          0.5
        )
    );
    return { type: 'damage', dmg: totalDmg, targets, aoeHits: inAoE.length };
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
      nova64.audio.sfx({ wave: 'sine', freq: 400, dur: 0.5, sweep: 200 }); // gentle heal chime
      spellVFX = {
        type: 'radial',
        x: 320,
        y: 180,
        timer: 0.5,
        color: nova64.draw.rgba8(50, 255, 100, 160),
      };
    }
  } else if (spell.type === 'buff') {
    const result = doSpell(member, spell, null);
    if (result) combatLog.push(`${member.name} casts ${spell.name}! Party ATK +${spell.amount}`);
    triggerScreenFlash(255, 220, 80, 80);
    nova64.audio.sfx({ wave: 'square', freq: 300, dur: 0.3, sweep: 150 }); // power-up buff
    spellVFX = {
      type: 'radial',
      x: 320,
      y: 100,
      timer: 0.6,
      color: nova64.draw.rgba8(255, 220, 80, 180),
    };
  } else if (spell.type === 'buff_def') {
    const result = doSpell(member, spell, null);
    if (result) combatLog.push(`${member.name} casts ${spell.name}! Party DEF +${spell.amount}`);
    triggerScreenFlash(80, 150, 255, 80);
    spellVFX = {
      type: 'radial',
      x: 320,
      y: 100,
      timer: 0.6,
      color: nova64.draw.rgba8(80, 150, 255, 180),
    };
  } else if (spell.type === 'revive') {
    const result = doSpell(member, spell, null);
    if (result) {
      combatLog.push(`${member.name} casts ${spell.name}! ${result.target.name} revived!`);
      triggerScreenFlash(255, 255, 200, 120);
    } else {
      combatLog.push('No fallen allies to revive.');
      member.mp += spell.cost; // refund
    }
  } else if (spell.type === 'group_heal') {
    const result = doSpell(member, spell, null);
    if (result) {
      combatLog.push(`${member.name} casts ${spell.name}! All allies +${spell.amount} HP`);
      triggerScreenFlash(80, 255, 150, 100);
      nova64.audio.sfx({ wave: 'sine', freq: 500, dur: 0.6, sweep: 250 });
      spellVFX = {
        type: 'radial',
        x: 320,
        y: 180,
        timer: 0.7,
        color: nova64.draw.rgba8(80, 255, 150, 180),
      };
    }
  } else if (spell.type === 'debuff_def') {
    const result = doSpell(member, spell, null);
    if (result) {
      combatLog.push(`${member.name} casts ${spell.name}! Enemy DEF -${spell.amount}`);
      triggerScreenFlash(150, 100, 255, 80);
      nova64.audio.sfx({ wave: 'triangle', freq: 300, dur: 0.3, sweep: -150 });
      spellVFX = {
        type: 'radial',
        x: 320,
        y: 80,
        timer: 0.5,
        color: nova64.draw.rgba8(150, 100, 255, 160),
      };
    }
  } else {
    const target = enemies.find(e => e.hp > 0);
    const result = doSpell(member, spell, target);
    if (result) {
      combatLog.push(`${member.name} casts ${spell.name}! ${result.dmg} damage!`);
      nova64.fx.setBloomStrength(2.0); // spike bloom during spell VFX
      // Burst particles for spell visual impact
      for (const psId of particleSystems) nova64.fx.burstParticles(psId, 6);
      // Starburst VFX for attack spells
      if (spell.name === 'Fireball') {
        spellVFX = {
          type: 'star',
          x: 320,
          y: 80,
          timer: 0.8,
          color: nova64.draw.rgba8(255, 120, 30, 220),
        };
      } else if (spell.name === 'Ice Bolt') {
        spellVFX = {
          type: 'star',
          x: 200,
          y: 80,
          timer: 0.6,
          color: nova64.draw.rgba8(80, 180, 255, 220),
        };
      } else if (spell.name === 'Turn Undead') {
        spellVFX = {
          type: 'star',
          x: 320,
          y: 80,
          timer: 0.7,
          color: nova64.draw.rgba8(255, 255, 180, 220),
        };
      } else if (spell.name === 'Lightning Bolt') {
        spellVFX = {
          type: 'star',
          x: 320,
          y: 80,
          timer: 0.6,
          color: nova64.draw.rgba8(200, 200, 255, 230),
        };
      } else if (spell.name === 'Backstab') {
        spellVFX = {
          type: 'star',
          x: 280,
          y: 80,
          timer: 0.4,
          color: nova64.draw.rgba8(180, 80, 200, 200),
        };
      } else if (spell.name === 'Smite') {
        spellVFX = {
          type: 'star',
          x: 320,
          y: 80,
          timer: 0.6,
          color: nova64.draw.rgba8(255, 255, 200, 220),
        };
      }
    }
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
    nova64.audio.sfx('powerup');
    triggerScreenFlash(255, 220, 100, 100);

    // Disable boss effects when combat ends
    if (enemies.some(e => e.isBoss)) {
      bossDefeated.add(floor);
      combatLog.push('The boss has been slain!');
      nova64.fx.disableChromaticAberration();
      bossFlowField = null; // clear boss energy field
    }
    nova64.fx.setBloomStrength(1.0); // restore normal bloom after combat
    nova64.fx.setBloomRadius(0.4); // restore normal bloom radius

    // Distribute XP and check level ups
    for (const m of party) {
      if (!m.alive) continue;
      m.xp += totalXP;
      while (m.xp >= m.xpNext) {
        m.xp -= m.xpNext;
        levelUp(m);
        combatLog.push(`${m.name} leveled up to ${m.level}!`);
        nova64.audio.sfx('coin');
      }
    }

    // Remove dead monster meshes
    for (const e of enemies) {
      if (e.allMeshes) {
        for (const id of e.allMeshes) nova64.scene.destroyMesh(id);
        e.allMeshes = null;
        e.meshBody = null;
      }
    }

    saveGame();
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
  const [dx, dz] = DIRS[facing];
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    // Lunge forward animation using moveMesh
    if (e.meshBody) nova64.scene.moveMesh(e.meshBody, -dx * 0.5, 0, -dz * 0.5);
    // Pick random alive party member
    const alive = party.filter(m => m.alive);
    if (alive.length === 0) break;
    const target = alive[Math.floor(Math.random() * alive.length)];
    const dmg = doAttack(e, target);
    combatLog.push(`${e.name} hits ${target.name} for ${dmg}!`);
    nova64.util.triggerShake(shake, e.isBoss ? 0.5 : 0.3);
    // Glitch effect on all damage hits (stronger for bosses)
    nova64.fx.enableGlitch(e.isBoss ? 0.7 : 0.4);
    glitchTimer = e.isBoss ? 0.5 : 0.25;
    // Varied screen flash and sfx based on monster type
    const shape = e.shape || 'brute';
    if (shape === 'caster' || shape === 'ghost') {
      triggerScreenFlash(120, 50, 255, 120); // purple for magic
      nova64.audio.sfx({ wave: 'sine', freq: 250, dur: 0.2, sweep: -100 });
    } else if (shape === 'dragon') {
      triggerScreenFlash(255, 120, 30, 140); // orange for fire breath
      nova64.audio.sfx({ wave: 'sawtooth', freq: 100, dur: 0.3, vol: 0.4 });
    } else if (shape === 'undead') {
      triggerScreenFlash(100, 200, 100, 100); // sickly green for undead
      nova64.audio.sfx('hit');
    } else {
      triggerScreenFlash(255, 50, 50, 100); // red for physical
      nova64.audio.sfx('hit');
    }
    const ti = party.indexOf(target);
    // Trigger hit state (invulnerability flash)
    if (hitStates && hitStates[ti]) nova64.util.triggerHit(hitStates[ti]);
    // Boss hits trigger chromatic aberration
    if (e.isBoss) {
      nova64.fx.enableChromaticAberration(0.008);
      chromaTimer = 0.4;
    }
    floatingTexts.spawn(`-${dmg}`, W - 180 + ti * 10, H - 80 + ti * 18, {
      color: nova64.draw.rgba8(255, 50, 50, 255),
      scale: 2,
      vy: -30,
    });

    if (target.hp <= 0) {
      target.alive = false;
      combatLog.push(`${target.name} falls!`);
      nova64.audio.sfx('death');
    }
    // Lunge back after attack
    if (e.meshBody) nova64.scene.moveMesh(e.meshBody, dx * 0.5, 0, dz * 0.5);
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
  nova64.audio.sfx({ wave: 'noise', freq: 80, dur: 0.08, vol: 0.15 });
  revealAround(px, py);
  // Track steps in game store
  if (gameStats) gameStats.setState({ steps: gameStats.getState().steps + 1 });

  // Interact with special tiles
  if (tile === T.DOOR) {
    dungeon[nz][nx] = T.FLOOR;
    showFloorMessage('Door opened!');
    nova64.audio.sfx('select');
  } else if (tile === T.STAIRS_DOWN) {
    // Open merchant shop before descending (floor 2+)
    if (floor >= 1) {
      openShop(floor + 1);
    } else {
      enterFloor(floor + 1);
    }
    nova64.audio.sfx('powerup');
    return true;
  } else if (tile === T.STAIRS_UP) {
    if (floor > 1) {
      enterFloor(floor - 1);
      nova64.audio.sfx('powerup');
    } else {
      showFloorMessage('The surface is sealed...');
      nova64.audio.sfx('error');
    }
    return true;
  } else if (tile === T.CHEST) {
    dungeon[nz][nx] = T.FLOOR;
    // Burst particles on chest open for satisfying feedback
    if (particleSystems.length > 0) {
      nova64.fx.burstParticles(particleSystems[0], 8, { position: [nx * TILE, 1, nz * TILE] });
    }
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
          nova64.audio.sfx('powerup');
        } else {
          const goldAmount = 10 + Math.floor(Math.random() * 10 * floor);
          totalGold += goldAmount;
          showFloorMessage(`Found chest: +${goldAmount} Gold!`);
          nova64.audio.sfx('coin');
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
      nova64.audio.sfx('coin');
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
    // Fountain cleansing — briefly disable vignette for a "refreshed" visual
    nova64.fx.disableVignette();
    setTimeout(() => nova64.fx.enableVignette(1.4, 0.8), 1200);
    showFloorMessage(
      revived ? 'Fountain revives and restores the party!' : 'Fountain restores the party!'
    );
    triggerScreenFlash(50, 130, 255, 100);
    nova64.audio.sfx('coin');
  } else if (tile === T.TRAP) {
    dungeon[nz][nx] = T.FLOOR;
    // Thief can detect and disarm
    const thief = party.find(m => m.alive && m.class === 'Thief');
    if (thief && Math.random() < 0.5 + thief.level * 0.1) {
      showFloorMessage(`${thief.name} disarmed a trap!`);
      nova64.audio.sfx('select');
    } else {
      const trapDmg = 3 + floor * 2;
      for (const m of party) {
        if (m.alive) {
          m.hp = Math.max(1, m.hp - trapDmg);
        }
      }
      showFloorMessage(`Trap! Party takes ${trapDmg} damage each!`);
      triggerScreenFlash(255, 50, 50, 180);
      nova64.util.triggerShake(shake, 0.5);
      nova64.audio.sfx('explosion');
    }
  } else if (tile === T.BOSS) {
    dungeon[nz][nx] = T.FLOOR;
    startCombat(true);
    nova64.audio.sfx('error');
    return true;
  }

  // Random encounter — use nova64.util.dist() for distance-based scaling from start
  const startDist = nova64.util.dist(px, py, dungeonW / 2, dungeonH / 2);
  const distFactor = nova64.util.remap(Math.min(startDist, 15), 0, 15, 0.5, 1.5);
  encounterChance += (0.08 + floor * 0.02) * distFactor;
  if (Math.random() < encounterChance) {
    encounterChance = 0;
    startCombat(false);
    nova64.audio.sfx('error');
  }

  return true;
}

function enterFloor(newFloor) {
  floor = newFloor;
  facing = 0;
  encounterChance = 0;
  explored = new Set(); // reset fog of war per floor

  if (floor > 7) {
    // Victory!
    switchState('victory');
    showFloorMessage('You conquered the dungeon!');
    nova64.audio.sfx('powerup');
    return;
  }

  floorTransition = 1.2; // checkerboard wipe effect when entering new floor
  nova64.util.noiseSeed(floor * 42 + 7); // consistent noise patterns per floor
  dungeon = generateDungeon(18 + floor * 2, 18 + floor * 2);
  buildLevel();

  // Subtle pixelation effect on deep floors only
  if (floor >= 7) nova64.fx.enablePixelation(1);
  else nova64.fx.enablePixelation(0);

  // Richer noise detail on deeper floors for more complex fog wisps
  nova64.util.noiseDetail(Math.min(2 + floor, 6), 0.5);

  // Dynamic bloom tuning per floor — deeper = tighter, more intense bloom
  const bloomRad = nova64.util.remap(floor, 1, 5, 0.5, 0.25);
  const bloomThresh = nova64.util.remap(floor, 1, 5, 0.3, 0.15);
  nova64.fx.setBloomRadius(bloomRad);
  nova64.fx.setBloomThreshold(bloomThresh);
  targetYaw = facing * HALF_PI;
  currentYaw = targetYaw;
  updateCamera3D();
  revealAround(px, py); // reveal starting area
  rebuildMinimap();
  const theme = FLOOR_THEMES[Math.min(floor - 1, FLOOR_THEMES.length - 1)];
  showFloorMessage(`Floor ${floor} — ${theme.name}`);

  // Create encounter spawner for this floor (scales enemy count per wave)
  encounterSpawner = nova64.util.createSpawner({
    waveInterval: 999, // wave count scales encounters, timer is supplemental
    baseCount: 1 + Math.floor(floor / 2),
    countGrowth: 1,
    maxCount: 3 + floor,
    spawnFn: null, // we read .wave to scale encounters
  });
  encounterSpawner.active = true; // ticked via updateSpawner each frame

  saveGame();
}

function rebuildMinimap() {
  minimap = nova64.draw.createMinimap({
    x: W - 90,
    y: 4,
    width: 82,
    height: 82,
    tileW: dungeonW,
    tileH: dungeonH,
    tileScale: Math.max(1, Math.floor(80 / Math.max(dungeonW, dungeonH))),
    bgColor: nova64.draw.rgba8(0, 0, 0, 200),
    borderLight: nova64.draw.rgba8(50, 40, 30, 200),
    borderDark: nova64.draw.rgba8(20, 15, 10, 200),
    fogOfWar: 4,
    follow: {
      get x() {
        return px;
      },
      get y() {
        return py;
      },
    },
    player: {
      get x() {
        return px;
      },
      get y() {
        return py;
      },
      color: nova64.draw.rgba8(255, 60, 60, 255),
      blink: true,
    },
    tiles(tx, ty) {
      if (!explored.has(`${tx},${ty}`)) return null;
      const tile = dungeon[ty][tx];
      if (tile === T.WALL) return nova64.draw.rgba8(60, 50, 40, 220);
      if (tile === T.STAIRS_DOWN) return nova64.draw.rgba8(50, 100, 200, 255);
      if (tile === T.STAIRS_UP) return nova64.draw.rgba8(200, 150, 50, 255);
      if (tile === T.CHEST) return nova64.draw.rgba8(200, 180, 50, 255);
      if (tile === T.FOUNTAIN) return nova64.draw.rgba8(50, 120, 255, 255);
      if (tile === T.BOSS) return nova64.draw.rgba8(200, 0, 50, 255);
      return nova64.draw.rgba8(30, 28, 22, 180);
    },
  });
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
// SAVE / LOAD
// ═══════════════════════════════════════════════════════════════════════

function hasSave() {
  return nova64.data.loadData('wizardry-save') !== null;
}

function saveGame() {
  const data = {
    party: party.map(m => ({
      name: m.name,
      class: m.class,
      hp: m.hp,
      maxHp: m.maxHp,
      mp: m.mp,
      maxMp: m.maxMp,
      atk: m.atk,
      def: m.def,
      spd: m.spd,
      level: m.level,
      xp: m.xp,
      xpNext: m.xpNext,
      alive: m.alive,
      buffAtk: m.buffAtk,
      buffDef: m.buffDef,
      buffTimer: m.buffTimer,
      weapon: m.weapon ? { ...m.weapon } : null,
      armor: m.armor ? { ...m.armor } : null,
    })),
    floor,
    px,
    py,
    facing,
    totalGold,
    bossDefeated: [...bossDefeated],
    dungeon,
    dungeonW,
    dungeonH,
    explored: [...explored],
    encounterChance,
  };
  nova64.data.saveData('wizardry-save', data);
}

function loadGameSave() {
  const data = nova64.data.loadData('wizardry-save');
  if (!data) return false;
  party = data.party;
  floor = data.floor;
  px = data.px;
  py = data.py;
  facing = data.facing;
  totalGold = data.totalGold;
  bossDefeated = new Set(data.bossDefeated || []);
  dungeon = data.dungeon;
  dungeonW = data.dungeonW;
  dungeonH = data.dungeonH;
  explored = new Set(data.explored || []);
  encounterChance = data.encounterChance || 0;

  targetYaw = facing * HALF_PI;
  currentYaw = targetYaw;
  buildLevel();
  updateCamera3D();
  rebuildMinimap();
  switchState('explore');
  showFloorMessage(`Floor ${floor} — Game Loaded`);
  nova64.audio.sfx('confirm');
  return true;
}

function deleteSave() {
  nova64.data.deleteData('wizardry-save');
}

// ═══════════════════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════════════════

function updateCamera3D() {
  const [dx, dz] = DIRS[facing];
  const wx = px * TILE,
    wz = py * TILE;
  // Enhanced camera bob: vertical + slight lateral sway on footsteps
  const bobAmt = Math.max(0, stepAnim);
  const bobY = Math.sin(stepAnim * TWO_PI * 2) * 0.12 * bobAmt;
  const bobX = Math.cos(stepAnim * TWO_PI) * 0.04 * bobAmt;
  const eyeY = 1.6 + bobY;

  const [shakeX, shakeY] = nova64.util.getShakeOffset(shake);

  // Apply lateral bob perpendicular to facing direction
  const perpX = -dz * bobX;
  const perpZ = dx * bobX;
  nova64.camera.setCameraPosition(wx + perpX + shakeX * 0.02, eyeY + shakeY * 0.02, wz + perpZ);
  nova64.camera.setCameraLookAt([dx * 10, 0, dz * 10]);
}

// ═══════════════════════════════════════════════════════════════════════
// INIT / UPDATE / DRAW
// ═══════════════════════════════════════════════════════════════════════

export function init() {
  gameState = 'title';
  stateMachine = nova64.util.createStateMachine('title');
  animTimer = 0;
  enemyDelay = 0;
  autoPlay = false;

  nova64.light.setAmbientLight(0x332222, 0.5);
  nova64.light.setLightDirection(0, -1, 0);
  nova64.light.setLightColor(0xaa8866);
  nova64.light.setFog(0x050308, 3, 25);
  nova64.camera.setCameraFOV(75);

  nova64.audio.setVolume(0.6);
  nova64.fx.enableRetroEffects({
    bloom: { strength: 1.2, radius: 0.5, threshold: 0.2 },
    vignette: { darkness: 0.9, offset: 0.85 },
    fxaa: true,
    dithering: true,
  });
  nova64.fx.setBloomRadius(0.5);
  nova64.fx.setBloomThreshold(0.2);
  nova64.light.createGradientSkybox(0x0a0515, 0x020108);
  nova64.light.enableSkyboxAutoAnimate(0.3);

  shake = nova64.util.createShake({ decay: 5 });
  cooldowns = nova64.util.createCooldownSet({ input: 0.15, move: 0.18 });
  floatingTexts = nova64.util.createFloatingTextSystem();

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
  hitStates = party.map(() => nova64.util.createHitState({ invulnDuration: 0.6, blinkRate: 8 }));
  combatFOV = 75; // smooth FOV for combat zoom
  floorTransition = 0; // timer for checkerboard floor entry effect
  chromaTimer = 0;
  glitchTimer = 0;
  spellVFX = null;
  visualPreset = null;
  msgTimer = nova64.util.createTimer(3.0);
  msgTimer.done = true; // start inactive
  sparkPool = nova64.util.createPool(30, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, color: 0 }));
  floatingTexts3D = nova64.util.createFloatingTextSystem();
  instancedDecor = null;
  bossFlowField = null;
  floorNoiseMap = null;
  restartButton = nova64.ui.createButton(
    nova64.ui.centerX(160),
    250,
    160,
    24,
    'Try Again',
    () => {
      init();
      enterFloor(1);
      switchState('explore');
    },
    {
      normalColor: nova64.draw.rgba8(120, 30, 30, 200),
      hoverColor: nova64.draw.rgba8(180, 50, 50, 220),
      textColor: nova64.draw.rgba8(255, 220, 200, 255),
      borderColor: nova64.draw.rgba8(200, 80, 80, 200),
      rounded: true,
    }
  );
  gameStats = nova64.data.createGameStore({
    kills: 0,
    steps: 0,
    chestsOpened: 0,
    fountainsUsed: 0,
  });
  lodTorches = [];
  waterShaders = [];
  currentLevelMeshes = [];
  monsterMeshes = [];

  // Build the 3D title corridor scene
  buildTitleScene();
}

export function update(dt) {
  animTimer += dt;
  if (stateMachine) stateMachine.update(dt);
  nova64.util.updateCooldowns(cooldowns, dt);
  floatingTexts.update(dt);
  if (floatingTexts3D) floatingTexts3D.update(dt);
  nova64.util.updateShake(shake, dt);
  nova64.fx.updateParticles(dt);
  // Manually animate skybox rotation (animateSkybox API)
  nova64.light.animateSkybox(dt);
  // Update LOD levels based on camera distance
  nova64.scene.updateLODs();
  // Tick encounter spawner timer (updateSpawner API)
  if (encounterSpawner && gameState === 'explore') {
    nova64.util.updateSpawner(encounterSpawner, dt);
  }

  // Tick hit state timers (invulnerability + flash)
  if (hitStates) {
    for (const hs of hitStates) nova64.util.updateHitState(hs, dt);
  }

  // Smooth FOV transitions (lerp toward target)
  const targetFOV = gameState === 'combat' && enemies && enemies[0] && enemies[0].isBoss ? 65 : 75;
  combatFOV = nova64.util.lerp(combatFOV, targetFOV, Math.min(1, dt * 3));
  nova64.camera.setCameraFOV(combatFOV);

  // Floor transition timer
  if (floorTransition > 0) floorTransition -= dt;

  // Update spark pool (combat hit sparks)
  if (sparkPool) {
    sparkPool.forEach(s => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 80 * dt; // gravity
      s.life -= dt;
      if (s.life <= 0) sparkPool.kill(s);
    });
  }

  if (stepAnim > 0) stepAnim = Math.max(0, stepAnim - dt * 3);

  // Screen flash decay
  if (screenFlash) {
    screenFlash.alpha -= screenFlash.decay * dt * 60;
    if (screenFlash.alpha <= 0) screenFlash = null;
  }

  // Chromatic aberration timer (boss hit effect)
  if (chromaTimer > 0) {
    chromaTimer -= dt;
    if (chromaTimer <= 0) {
      chromaTimer = 0;
      // Only disable if not in active boss combat
      if (gameState !== 'combat' || !enemies || !enemies.some(e => e.isBoss && e.hp > 0)) {
        nova64.fx.disableChromaticAberration();
      }
    }
  }

  // Glitch timer (damage hit effect — decays intensity then disables)
  if (glitchTimer > 0) {
    glitchTimer -= dt;
    if (glitchTimer <= 0) {
      glitchTimer = 0;
      nova64.fx.disableGlitch();
    } else {
      // Fade intensity as timer runs down for smooth decay
      nova64.fx.setGlitchIntensity(glitchTimer * 2.0);
    }
  }

  // Animate special meshes (bob, pulse, spin)
  if (animatedMeshes) {
    for (const am of animatedMeshes) {
      if (am.type === 'bob') {
        const y = am.baseY + Math.sin(animTimer * am.speed) * am.range;
        const pos = nova64.scene.getPosition(am.id);
        if (pos) nova64.scene.setPosition(am.id, pos[0], y, pos[2]);
      } else if (am.type === 'pulse') {
        const s = am.baseScale + Math.sin(animTimer * am.speed) * am.range;
        nova64.scene.setScale(am.id, s, s, s);
      } else if (am.type === 'spin') {
        nova64.scene.rotateMesh(am.id, 0, dt * am.speed, 0);
        // Use getRotation to query spin state — reverse direction when past full rotation
        const rot = nova64.scene.getRotation(am.id);
        if (rot && rot.y > TWO_PI) nova64.scene.setRotation(am.id, rot.x, 0, rot.z);
      }
    }
  }

  // Torch light flicker + position sway using setPointLightPosition
  if (torchLights) {
    for (const t of torchLights) {
      if (t && t.lightId) {
        // Flicker by randomly varying color temperature
        nova64.light.setPointLightColor(t.lightId, Math.random() > 0.9 ? 0xff6600 : 0xff8833);
        // Subtle position sway for living flame feel
        const swayX = t.wx + Math.sin(animTimer * 3 + t.wz) * 0.08;
        const swayZ = t.wz + Math.cos(animTimer * 2.5 + t.wx) * 0.08;
        nova64.light.setPointLightPosition(
          t.lightId,
          swayX,
          2.2 + Math.sin(animTimer * 4) * 0.05,
          swayZ
        );
      }
    }
  }

  // Animate water shader uniforms (createShaderMaterial + updateShaderUniform)
  if (waterShaders) {
    for (const ws of waterShaders) {
      nova64.shader.updateShaderUniform(ws.shaderId, 'time', animTimer);
    }
  }

  // Ambient single-particle emission — occasional dust motes near player
  if (gameState === 'explore' && particleSystems.length > 0 && Math.random() < 0.03) {
    nova64.fx.emitParticle(particleSystems[0], {
      position: [
        px * TILE + nova64.util.randRange(-2, 2),
        nova64.util.randRange(0.5, 2.5),
        py * TILE + nova64.util.randRange(-2, 2),
      ],
    });
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
  } else if (gameState === 'shop') {
    updateShop(dt);
  } else if (gameState === 'gameover') {
    if (nova64.input.keyp('Space') && nova64.util.cooldownReady(cooldowns.input)) {
      nova64.util.useCooldown(cooldowns.input);
      init();
    }
  } else if (gameState === 'victory') {
    if (nova64.input.keyp('Space') && nova64.util.cooldownReady(cooldowns.input)) {
      nova64.util.useCooldown(cooldowns.input);
      init();
    }
  }

  if (floorMessageTimer > 0) floorMessageTimer -= dt;

  // Update spell VFX timer
  if (spellVFX) {
    spellVFX.timer -= dt;
    if (spellVFX.timer <= 0) {
      spellVFX = null;
      nova64.fx.setBloomStrength(1.0); // restore bloom after spell VFX fades
    }
  }

  // Update message timer
  if (msgTimer && !msgTimer.done) msgTimer.update(dt);
}

function updateTitle(dt) {
  const t = stateElapsed();

  // Cinematic camera: gentle forward drift + sinusoidal sway through corridor
  const camZ = -2 + Math.sin(t * 0.15) * -8;
  const camX = Math.sin(t * 0.4) * 1.2;
  const camY = 0.8 + Math.sin(t * 0.6) * 0.25;
  nova64.camera.setCameraPosition(camX, camY, camZ);
  nova64.camera.setCameraTarget(Math.sin(t * 0.2) * 0.5, 0.6, camZ - 8);

  // Animate portal (spin the torus — second-to-last title mesh)
  if (titleMeshes.length >= 2) {
    const portalId = titleMeshes[titleMeshes.length - 2];
    nova64.scene.rotateMesh(portalId, dt * 0.3, dt * 0.7, 0);
    // Pulse the glow sphere
    const glowId = titleMeshes[titleMeshes.length - 1];
    const s = 0.7 + Math.sin(t * 2) * 0.15;
    nova64.scene.setScale(glowId, s, s, s);
  }

  // Flickering torch lights
  for (let i = 0; i < titleLights.length - 1; i++) {
    nova64.light.setPointLightColor(titleLights[i], Math.random() > 0.85 ? 0xff6600 : 0xff8833);
  }

  // Emit floating ember particles from torch positions
  if (titleParticles.length > 0 && Math.random() < 0.15) {
    const side = Math.random() > 0.5 ? 2.2 : -2.2;
    const z = -4 - Math.random() * 16;
    nova64.fx.emitParticle(titleParticles[0], {
      position: [side + (Math.random() - 0.5) * 0.5, 0.3 + Math.random() * 1.5, z],
    });
  }

  if (nova64.input.keyp('KeyC') && hasSave()) {
    clearTitleScene();
    loadGameSave();
  } else if (nova64.input.keyp('Space') || nova64.input.keyp('Enter')) {
    clearTitleScene();
    deleteSave();
    enterFloor(1);
    switchState('explore');
    nova64.audio.sfx('confirm');
  }
}

function updateExplore(dt) {
  if (!nova64.util.cooldownReady(cooldowns.move)) {
    // still in cooldown, but check non-move inputs
    if (nova64.input.keyp('KeyI') || nova64.input.keyp('Tab')) switchState('inventory');
    updateCamera3D();
    return;
  }

  const [dx, dz] = DIRS[facing];

  // Movement (keyboard + gamepad left stick)
  let moved = false;
  const stickY = nova64.input.leftStickY();
  const stickX = nova64.input.leftStickX();
  if (
    nova64.input.key('KeyW') ||
    nova64.input.key('ArrowUp') ||
    stickY < -0.5 ||
    nova64.input.btn(2)
  ) {
    moved = tryMove(dx, dz);
  } else if (
    nova64.input.key('KeyS') ||
    nova64.input.key('ArrowDown') ||
    stickY > 0.5 ||
    nova64.input.btn(3)
  ) {
    moved = tryMove(-dx, -dz);
  } else if (nova64.input.key('KeyA') || stickX < -0.5) {
    // Strafe left
    moved = tryMove(dz, -dx);
  } else if (nova64.input.key('KeyD') || stickX > 0.5) {
    // Strafe right
    moved = tryMove(-dz, dx);
  }

  // Turning (keyp for discrete 90° snaps, or right stick for gamepad)
  const rStickX = nova64.input.rightStickX();
  if (
    nova64.input.keyp('ArrowLeft') ||
    nova64.input.keyp('KeyQ') ||
    (rStickX < -0.5 && nova64.util.cooldownReady(cooldowns.input))
  ) {
    facing = (facing + 3) % 4; // turn left
    targetYaw = facing * HALF_PI;
    cooldowns.move.remaining = cooldowns.move.duration;
    if (rStickX < -0.5) nova64.util.useCooldown(cooldowns.input);
  } else if (
    nova64.input.keyp('ArrowRight') ||
    nova64.input.keyp('KeyE') ||
    (rStickX > 0.5 && nova64.util.cooldownReady(cooldowns.input))
  ) {
    facing = (facing + 1) % 4; // turn right
    targetYaw = facing * HALF_PI;
    cooldowns.move.remaining = cooldowns.move.duration;
    if (rStickX > 0.5) nova64.util.useCooldown(cooldowns.input);
  }

  if (nova64.input.keyp('KeyI') || nova64.input.keyp('Tab')) switchState('inventory');

  // Click-to-inspect: raycast from camera on mouse click to identify tile ahead
  if (nova64.input.mousePressed() && nova64.input.mouseDown()) {
    const hit = nova64.scene.raycastFromCamera(nova64.input.mouseX(), nova64.input.mouseY());
    if (hit && hit.distance < TILE * 3) {
      const tileX = Math.round(hit.point.x / TILE);
      const tileZ = Math.round(hit.point.z / TILE);
      if (tileX >= 0 && tileX < dungeonW && tileZ >= 0 && tileZ < dungeonH) {
        const tile = dungeon[tileZ][tileX];
        if (tile === T.CHEST) showFloorMessage('A treasure chest...');
        else if (tile === T.FOUNTAIN) showFloorMessage('A healing fountain');
        else if (tile === T.BOSS) showFloorMessage('Dark energy radiates here...');
      }
    }
  }

  if (moved) cooldowns.move.remaining = cooldowns.move.duration; // reset move cooldown

  // Ambient dungeon sounds (occasional drips and distant rumbles)
  if (Math.random() < 0.004) {
    nova64.audio.sfx({ wave: 'sine', freq: 800 + Math.random() * 400, dur: 0.06, vol: 0.08 }); // water drip
  } else if (Math.random() < 0.002) {
    nova64.audio.sfx({ wave: 'noise', freq: 40, dur: 0.3, vol: 0.06 }); // distant rumble
  }

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
    if (nova64.input.keyp('Space') && nova64.util.useCooldown(cooldowns.input)) {
      clearMonsterMeshes();
      nova64.audio.setVolume(0.6); // quieter in exploration
      if (party.every(m => !m.alive)) {
        switchState('gameover');
      } else {
        switchState('explore');
        enemies = [];
      }
    }
    return;
  }

  // Toggle auto-play
  if (nova64.input.keyp('KeyA')) {
    autoPlay = !autoPlay;
    combatLog.push(autoPlay ? 'AUTO-COMBAT ON' : 'AUTO-COMBAT OFF');
  }

  if (combatAction === 'choose' && nova64.util.cooldownReady(cooldowns.input)) {
    const member = party[combatTurn];

    // Auto-play: automatically attack a random living enemy
    if (autoPlay) {
      nova64.util.useCooldown(cooldowns.input);
      const target = enemies.filter(e => e.hp > 0);
      if (target.length > 0) {
        const t = target[Math.floor(Math.random() * target.length)];
        const dmg = doAttack(member, t);
        combatLog.push(`${member.name} hits ${t.name} for ${dmg}!`);
        nova64.util.triggerShake(shake, 0.2);
        const sparkX = 100 + t.id * 160;
        spawnSparks(sparkX, 30, nova64.draw.rgba8(255, 200, 80, 255), 5);
        floatingTexts.spawn(`-${dmg}`, sparkX, 40, {
          color: nova64.draw.rgba8(255, 80, 80, 255),
          scale: 2,
          vy: -40,
        });
        if (t.hp <= 0) {
          combatLog.push(`${t.name} defeated!`);
          if (gameStats) gameStats.setState({ kills: gameStats.getState().kills + 1 });
          if (t.allMeshes) {
            for (const id of t.allMeshes) nova64.scene.setMeshVisible(id, false);
            const meshesToDestroy = [...t.allMeshes];
            setTimeout(() => {
              for (const id of meshesToDestroy) nova64.scene.destroyMesh(id);
            }, 400);
            t.allMeshes = null;
            t.meshBody = null;
          }
        }
      }
      advanceCombatTurn();
    } else if (nova64.input.keyp('Digit1') || nova64.input.keyp('KeyZ') || nova64.input.btnp(4)) {
      nova64.util.useCooldown(cooldowns.input);
      // Attack
      combatAction = 'target';
      selectedTarget = enemies.findIndex(e => e.hp > 0);
    } else if (nova64.input.keyp('Digit2') || nova64.input.keyp('KeyX') || nova64.input.btnp(5)) {
      nova64.util.useCooldown(cooldowns.input);
      // Cast spell (if caster)
      if (member.maxMp > 0) {
        combatAction = 'spell';
      }
    } else if (nova64.input.keyp('Digit3') || nova64.input.keyp('KeyC') || nova64.input.btnp(6)) {
      nova64.util.useCooldown(cooldowns.input);
      // Defend — skip turn, boost def temporarily
      member.buffDef += 3;
      member.buffTimer = Math.max(member.buffTimer, 2);
      combatLog.push(`${member.name} defends.`);
      advanceCombatTurn();
    }
  }

  if (combatAction === 'target' && nova64.util.cooldownReady(cooldowns.input)) {
    // Mouse click targeting — click on enemy name area at top
    if (nova64.input.mousePressed()) {
      const mx = nova64.input.mouseX(),
        my = nova64.input.mouseY();
      if (my < 40) {
        for (let i = 0; i < enemies.length; i++) {
          const ex = 20 + i * 200;
          if (enemies[i].hp > 0 && mx >= ex && mx < ex + 180) {
            selectedTarget = i;
            break;
          }
        }
      }
    }
    if (nova64.input.keyp('ArrowUp') || nova64.input.keyp('KeyW')) {
      nova64.util.useCooldown(cooldowns.input);
      // Prev enemy
      for (let i = selectedTarget - 1; i >= 0; i--) {
        if (enemies[i].hp > 0) {
          selectedTarget = i;
          break;
        }
      }
    } else if (nova64.input.keyp('ArrowDown') || nova64.input.keyp('KeyS')) {
      nova64.util.useCooldown(cooldowns.input);
      // Next enemy
      for (let i = selectedTarget + 1; i < enemies.length; i++) {
        if (enemies[i].hp > 0) {
          selectedTarget = i;
          break;
        }
      }
    } else if (
      nova64.input.keyp('Space') ||
      nova64.input.keyp('Enter') ||
      nova64.input.keyp('KeyZ')
    ) {
      nova64.util.useCooldown(cooldowns.input);
      // Confirm attack
      const member = party[combatTurn];
      const target = enemies[selectedTarget];
      const dmg = doAttack(member, target);
      const isCrit = dmg >= member.atk * 1.2; // high roll = critical
      combatLog.push(
        isCrit
          ? `${member.name} CRITS ${target.name} for ${dmg}!`
          : `${member.name} hits ${target.name} for ${dmg}!`
      );
      nova64.util.triggerShake(shake, isCrit ? 0.35 : 0.2);
      nova64.audio.sfx(isCrit ? 'explosion' : 'hit');
      const tgtX = 100 + selectedTarget * 160;
      spawnSparks(
        tgtX,
        30,
        isCrit ? nova64.draw.rgba8(255, 255, 100, 255) : nova64.draw.rgba8(255, 200, 80, 255),
        isCrit ? 10 : 6
      );
      floatingTexts.spawn(isCrit ? `CRIT -${dmg}` : `-${dmg}`, tgtX, 40, {
        color: isCrit ? nova64.draw.rgba8(255, 255, 80, 255) : nova64.draw.rgba8(255, 80, 80, 255),
        scale: isCrit ? 3 : 2,
        vy: -40,
      });
      // 3D floating damage above monster in world space (drawFloatingTexts3D)
      if (floatingTexts3D && target.meshBody) {
        const mpos = nova64.scene.getPosition(target.meshBody);
        if (mpos) {
          floatingTexts3D.spawn(`-${dmg}`, mpos[0], mpos[1] + 1.5, {
            z: mpos[2],
            color: 0xff5533,
            scale: 2,
            vy: 2,
          });
        }
      }

      if (target.hp <= 0) {
        combatLog.push(`${target.name} defeated!`);
        nova64.audio.sfx('explosion');
        triggerScreenFlash(255, 200, 50, 120);
        if (gameStats) gameStats.setState({ kills: gameStats.getState().kills + 1 });
        if (target.allMeshes) {
          // Blink out death animation: hide meshes, then destroy after delay
          for (const id of target.allMeshes) nova64.scene.setMeshVisible(id, false);
          const meshesToDestroy = [...target.allMeshes];
          setTimeout(() => {
            for (const id of meshesToDestroy) nova64.scene.destroyMesh(id);
          }, 400);
          target.allMeshes = null;
          target.meshBody = null;
        }
      }
      advanceCombatTurn();
    } else if (nova64.input.keyp('Escape') || nova64.input.keyp('Backspace')) {
      nova64.util.useCooldown(cooldowns.input);
      combatAction = 'choose';
    }
  }

  if (combatAction === 'spell' && nova64.util.cooldownReady(cooldowns.input)) {
    const member = party[combatTurn];
    const available = Object.values(SPELLS).filter(
      s => s.class === member.class && member.mp >= s.cost
    );

    if (nova64.input.keyp('Digit1') && available.length > 0) {
      nova64.util.useCooldown(cooldowns.input);
      const spell = available[0];
      nova64.audio.sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (nova64.input.keyp('Digit2') && available.length > 1) {
      nova64.util.useCooldown(cooldowns.input);
      const spell = available[1];
      nova64.audio.sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (nova64.input.keyp('Digit3') && available.length > 2) {
      nova64.util.useCooldown(cooldowns.input);
      const spell = available[2];
      nova64.audio.sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (nova64.input.keyp('Digit4') && available.length > 3) {
      nova64.util.useCooldown(cooldowns.input);
      const spell = available[3];
      nova64.audio.sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (nova64.input.keyp('Digit5') && available.length > 4) {
      nova64.util.useCooldown(cooldowns.input);
      const spell = available[4];
      nova64.audio.sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (nova64.input.keyp('Escape') || nova64.input.keyp('Backspace')) {
      nova64.util.useCooldown(cooldowns.input);
      combatAction = 'choose';
    }
  }
}

function updateInventory(dt) {
  if (nova64.input.keyp('KeyI') || nova64.input.keyp('Tab') || nova64.input.keyp('Escape')) {
    nova64.audio.setVolume(0.6); // restore exploration volume
    switchState('explore');
  }
  if (nova64.input.keyp('KeyS')) {
    saveGame();
    showFloorMessage('Game saved!');
    nova64.audio.sfx('confirm');
  }
  // Toggle visual preset mode: V cycles null → n64 → psx → minimal → null
  if (nova64.input.keyp('KeyV')) {
    if (!visualPreset) {
      visualPreset = 'n64';
      nova64.fx.enableN64Mode();
      nova64.fx.enableFXAA();
      showFloorMessage('N64 Mode enabled');
    } else if (visualPreset === 'n64') {
      visualPreset = 'psx';
      nova64.fx.disablePresetMode();
      nova64.fx.enablePSXMode();
      nova64.fx.enableFXAA();
      showFloorMessage('PSX Mode enabled');
    } else if (visualPreset === 'psx') {
      visualPreset = 'lowpoly';
      nova64.fx.disablePresetMode();
      nova64.fx.enableLowPolyMode();
      nova64.fx.enableFXAA();
      showFloorMessage('Low-Poly Mode enabled');
    } else if (visualPreset === 'lowpoly') {
      visualPreset = 'dithered';
      nova64.fx.disablePresetMode();
      nova64.fx.enableDithering(true);
      showFloorMessage('Dithered Mode enabled');
    } else if (visualPreset === 'dithered') {
      visualPreset = 'minimal';
      nova64.fx.enableDithering(false);
      nova64.fx.disablePresetMode();
      nova64.fx.disableBloom();
      nova64.fx.disableFXAA();
      if (nova64.fx.isEffectsEnabled()) showFloorMessage('Minimal Mode — effects disabled');
      else showFloorMessage('Minimal Mode — no post-FX');
    } else {
      visualPreset = null;
      nova64.fx.disablePresetMode();
      nova64.fx.enableBloom(1.0, 0.4, 0.25); // explicitly re-enable bloom
      nova64.fx.enableRetroEffects({
        bloom: { strength: 1.0, radius: 0.4, threshold: 0.25 },
        vignette: { darkness: 1.4, offset: 0.8 },
        fxaa: true,
        dithering: true,
      });
      showFloorMessage('Default mode restored');
    }
    nova64.audio.sfx('select');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SHOP SYSTEM
// ═══════════════════════════════════════════════════════════════════════

function openShop(nextFloor) {
  shopItems = SHOP_ITEMS.map(item => ({
    ...item,
    // Scale costs with floor
    cost: item.cost + Math.floor(item.cost * (nextFloor - 2) * 0.2),
  }));
  shopCursor = 0;
  shopTarget = -1; // -1 = browsing, 0+ = selecting party member
  switchState('shop');
  nova64.audio.setVolume(0.5); // quieter in shop
  nova64.fx.setBloomRadius(0.6); // softer bloom in shop atmosphere
  nova64.fx.setBloomThreshold(0.35);
  nova64.light.clearFog(); // no fog in the merchant area — bright and welcoming
  nova64.light.createSolidSkybox(0x1a1020); // dark merchant atmosphere
  nova64.light.disableSkyboxAutoAnimate(); // still skybox in shop
  nova64.audio.sfx('coin');
}

function applyShopItem(item, target) {
  if (item.effect === 'hp') {
    target.hp = Math.min(target.hp + item.amount, target.maxHp);
    showFloorMessage(`${target.name} restored ${item.amount} HP!`);
  } else if (item.effect === 'mp') {
    target.mp = Math.min(target.mp + item.amount, target.maxMp);
    showFloorMessage(`${target.name} restored ${item.amount} MP!`);
  } else if (item.effect === 'revive') {
    if (!target.alive) {
      target.alive = true;
      target.hp = item.amount;
      showFloorMessage(`${target.name} has been revived!`);
    } else {
      showFloorMessage(`${target.name} is already alive!`);
      return false; // refund
    }
  } else if (item.effect === 'party_hp') {
    for (const m of party) {
      if (m.alive) m.hp = Math.min(m.hp + item.amount, m.maxHp);
    }
    showFloorMessage(`Party restored ${item.amount} HP each!`);
  } else if (item.effect === 'atk') {
    target.buffAtk += item.amount;
    target.buffTimer = 99; // lasts until cleared
    showFloorMessage(`${target.name} gained +${item.amount} ATK!`);
  } else if (item.effect === 'def') {
    target.buffDef += item.amount;
    target.buffTimer = 99;
    showFloorMessage(`${target.name} gained +${item.amount} DEF!`);
  }
  return true;
}

function updateShop(dt) {
  if (!nova64.util.cooldownReady(cooldowns.input)) return;

  if (shopTarget >= 0) {
    // Selecting party member target (keyboard + right stick Y)
    const tgtStickY = nova64.input.rightStickY();
    if (
      nova64.input.keyp('ArrowUp') ||
      nova64.input.keyp('KeyW') ||
      (tgtStickY < -0.5 && nova64.util.cooldownReady(cooldowns.input))
    ) {
      nova64.util.useCooldown(cooldowns.input);
      shopTarget = (shopTarget + party.length - 1) % party.length;
    } else if (
      nova64.input.keyp('ArrowDown') ||
      nova64.input.keyp('KeyS') ||
      (tgtStickY > 0.5 && nova64.util.cooldownReady(cooldowns.input))
    ) {
      nova64.util.useCooldown(cooldowns.input);
      shopTarget = (shopTarget + 1) % party.length;
    } else if (
      nova64.input.keyp('Space') ||
      nova64.input.keyp('Enter') ||
      nova64.input.keyp('KeyZ')
    ) {
      nova64.util.useCooldown(cooldowns.input);
      const item = shopItems[shopCursor];
      const target = party[shopTarget];
      // Validate: revive only on dead, hp/mp/buff only on alive
      if (item.effect === 'revive' && target.alive) {
        showFloorMessage(`${target.name} is already alive!`);
        nova64.audio.sfx('error');
      } else if (item.effect !== 'revive' && item.effect !== 'party_hp' && !target.alive) {
        showFloorMessage(`${target.name} has fallen...`);
        nova64.audio.sfx('error');
      } else {
        if (applyShopItem(item, target)) {
          totalGold -= item.cost;
          nova64.audio.sfx('coin');
          triggerScreenFlash(50, 200, 100, 80);
        }
      }
      shopTarget = -1;
    } else if (nova64.input.keyp('Escape') || nova64.input.keyp('Backspace')) {
      nova64.util.useCooldown(cooldowns.input);
      shopTarget = -1;
    }
    return;
  }

  // Browsing items (keyboard + gamepad via gamepadAxis)
  const shopStickY = nova64.input.gamepadAxis('leftY');
  if (
    nova64.input.keyp('ArrowUp') ||
    nova64.input.keyp('KeyW') ||
    (shopStickY < -0.5 && nova64.util.cooldownReady(cooldowns.input))
  ) {
    nova64.util.useCooldown(cooldowns.input);
    shopCursor = (shopCursor + shopItems.length - 1) % shopItems.length;
  } else if (
    nova64.input.keyp('ArrowDown') ||
    nova64.input.keyp('KeyS') ||
    (shopStickY > 0.5 && nova64.util.cooldownReady(cooldowns.input))
  ) {
    nova64.util.useCooldown(cooldowns.input);
    shopCursor = (shopCursor + 1) % shopItems.length;
  } else if (
    nova64.input.keyp('Space') ||
    nova64.input.keyp('Enter') ||
    nova64.input.keyp('KeyZ')
  ) {
    nova64.util.useCooldown(cooldowns.input);
    const item = shopItems[shopCursor];
    if (totalGold < item.cost) {
      showFloorMessage('Not enough gold!');
      nova64.audio.sfx('error');
    } else if (item.effect === 'party_hp') {
      // Party-wide items apply immediately, no target needed
      if (applyShopItem(item, null)) {
        totalGold -= item.cost;
        nova64.audio.sfx('coin');
        triggerScreenFlash(50, 200, 100, 80);
      }
    } else {
      // Need to pick a target
      shopTarget = 0;
    }
  } else if (
    nova64.input.keyp('Escape') ||
    nova64.input.keyp('Backspace') ||
    nova64.input.keyp('KeyX')
  ) {
    nova64.util.useCooldown(cooldowns.input);
    // Leave shop → continue to next floor
    nova64.audio.setVolume(0.6); // restore exploration volume
    nova64.fx.setBloomRadius(0.4); // restore exploration bloom
    nova64.fx.setBloomThreshold(0.25);
    // Fog will be restored in enterFloor → buildLevel
    const nextFloor = floor + 1;
    enterFloor(nextFloor);
    switchState('explore');
    nova64.audio.sfx('confirm');
  }
}

function drawShopUI() {
  nova64.draw.drawGradient(
    0,
    0,
    W,
    H,
    nova64.draw.rgba8(8, 5, 20, 200),
    nova64.draw.rgba8(20, 15, 5, 200)
  );

  nova64.draw.drawPanel(60, 20, W - 120, H - 40, {
    bgColor: nova64.draw.rgba8(15, 12, 25, 240),
    borderLight: nova64.draw.rgba8(120, 100, 50, 255),
    borderDark: nova64.draw.rgba8(40, 30, 15, 255),
  });

  nova64.draw.drawGlowText(
    'MERCHANT',
    320,
    32,
    nova64.draw.rgba8(220, 180, 50, 255),
    nova64.draw.rgba8(140, 100, 0, 100),
    3
  );
  nova64.draw.drawDiamond(472, 40, 4, 5, nova64.draw.rgba8(255, 220, 50, 255));
  // Use setTextAlign + setTextBaseline + drawText for gold display
  nova64.ui.setTextAlign('right');
  nova64.ui.setTextBaseline('top');
  nova64.ui.drawText(`${totalGold}g`, 560, 36, nova64.draw.rgba8(255, 220, 50, 255));
  nova64.ui.setTextAlign('left');
  nova64.ui.setTextBaseline('top');
  nova64.draw.printCentered(
    `Floor ${floor} → ${floor + 1}`,
    320,
    68,
    nova64.draw.rgba8(150, 140, 120, 200)
  );

  // Item list with gradient rect backgrounds
  for (let i = 0; i < shopItems.length; i++) {
    const item = shopItems[i];
    const y = 90 + i * 28;
    const sel = i === shopCursor && shopTarget < 0;
    const canAfford = totalGold >= item.cost;

    // Gradient highlight for selected/affordable items
    if (sel) {
      nova64.ui.drawGradientRect(
        72,
        y - 2,
        488,
        18,
        nova64.draw.rgba8(60, 40, 20, 150),
        nova64.draw.rgba8(30, 20, 10, 50)
      );
    }

    const nameColor = sel
      ? nova64.draw.rgba8(255, 255, 200, 255)
      : canAfford
        ? nova64.draw.rgba8(200, 200, 220, 220)
        : nova64.draw.rgba8(100, 100, 110, 150);
    const costColor = canAfford
      ? nova64.draw.rgba8(220, 180, 50, 220)
      : nova64.draw.rgba8(120, 80, 40, 150);

    nova64.draw.print(`${sel ? '►' : ' '} ${item.name}`, 80, y, nameColor);
    nova64.draw.print(`${item.cost}g`, 320, y, costColor);
    nova64.draw.print(item.desc, 370, y, nova64.draw.rgba8(140, 140, 160, 180));
  }

  // Target selection overlay
  if (shopTarget >= 0) {
    nova64.draw.drawPanel(180, 120, 280, 140, {
      bgColor: nova64.draw.rgba8(10, 8, 20, 250),
      borderLight: nova64.draw.rgba8(100, 80, 50, 255),
      borderDark: nova64.draw.rgba8(30, 25, 15, 255),
    });
    nova64.draw.printCentered('Select target:', 320, 128, nova64.draw.rgba8(200, 180, 120, 255));
    for (let i = 0; i < party.length; i++) {
      const m = party[i];
      const y = 148 + i * 24;
      const sel = i === shopTarget;
      const c = CLASS_COLORS[m.class];
      const cr = (c >> 16) & 0xff,
        cg = (c >> 8) & 0xff,
        cb = c & 0xff;
      const nameColor = sel
        ? nova64.draw.rgba8(255, 255, 200, 255)
        : nova64.draw.rgba8(cr, cg, cb, 200);
      nova64.draw.print(`${sel ? '►' : ' '} ${m.name}`, 200, y, nameColor);
      nova64.draw.print(
        m.alive ? `HP:${m.hp}/${m.maxHp}` : '☠ FALLEN',
        340,
        y,
        m.alive ? nova64.draw.rgba8(150, 180, 150, 200) : nova64.draw.rgba8(180, 50, 50, 200)
      );
    }
    nova64.draw.print('Z/Space=Confirm  Esc=Back', 200, 248, nova64.draw.rgba8(100, 100, 120, 150));
  }

  // Controls
  nova64.draw.printCentered(
    'W/S=Browse  Z/Space=Buy  ESC=Continue to next floor',
    320,
    H - 55,
    nova64.draw.rgba8(120, 120, 150, 200)
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DRAW
// ═══════════════════════════════════════════════════════════════════════

export function draw() {
  // Apply 2D camera shake offset (setCamera API) for full-screen shake
  const [shakeOX, shakeOY] = nova64.util.getShakeOffset(shake);
  if (shakeOX !== 0 || shakeOY !== 0) {
    nova64.draw.setCamera(Math.floor(shakeOX * 2), Math.floor(shakeOY * 2));
  }

  if (gameState === 'title') {
    drawTitle();
  } else if (gameState === 'explore') {
    drawExploreHUD();
  } else if (gameState === 'combat') {
    drawCombatUI();
  } else if (gameState === 'inventory') {
    drawInventoryUI();
  } else if (gameState === 'shop') {
    drawShopUI();
  } else if (gameState === 'gameover') {
    drawGameOver();
  } else if (gameState === 'victory') {
    drawVictory();
  }

  // Boss flow field energy overlay (flowField API)
  if (
    bossFlowField &&
    gameState === 'combat' &&
    enemies &&
    enemies.length > 0 &&
    enemies[0].isBoss &&
    enemies[0].hp > 0
  ) {
    const cols = 16,
      rows = 12;
    const cellW = W / cols,
      cellH = H / rows;
    // Regenerate flow field with time for flowing animation
    bossFlowField = nova64.util.flowField(cols, rows, 0.08, animTimer * 0.5);
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols,
        row = Math.floor(i / cols);
      const cx = col * cellW + cellW / 2;
      const cy = row * cellH + cellH / 2;
      const angle = bossFlowField[i];
      const len = 8;
      const ex = cx + Math.cos(angle) * len;
      const ey = cy + Math.sin(angle) * len;
      const alpha = Math.floor(20 + Math.sin(animTimer * 3 + i * 0.3) * 10);
      nova64.draw.line(
        Math.floor(cx),
        Math.floor(cy),
        Math.floor(ex),
        Math.floor(ey),
        nova64.draw.rgba8(200, 50, 80, alpha)
      );
    }
  }

  // Spell VFX overlay (starburst for attacks, radial gradient for buffs/heals)
  if (spellVFX) {
    const alpha = Math.min(1, spellVFX.timer * 3);
    if (spellVFX.type === 'star') {
      const r = 30 + (1 - alpha) * 40;
      // HSB hue-cycling glow ring using colorMode + color API
      nova64.util.colorMode('hsb', 360, 100, 100);
      const ringHue = (animTimer * 200 + spellVFX.timer * 400) % 360;
      const ringColor = nova64.util.color(ringHue, 80, 60, Math.floor(alpha * 100));
      nova64.util.colorMode('rgb', 255); // restore RGB mode
      nova64.draw.circle(spellVFX.x, spellVFX.y, Math.floor(r + 8), ringColor);
      nova64.draw.drawStarburst(spellVFX.x, spellVFX.y, r, r * 0.4, 8, spellVFX.color);
      // Bezier arc spell trail — curved energy arc from caster to impact
      const arcProgress = 1 - alpha;
      nova64.util.bezier(
        50,
        H - 120,
        120,
        spellVFX.y - 80 * arcProgress,
        spellVFX.x - 60,
        spellVFX.y - 40,
        spellVFX.x,
        spellVFX.y,
        spellVFX.color,
        30
      );
    } else if (spellVFX.type === 'radial') {
      const r = 40 + (1 - alpha) * 60;
      nova64.draw.drawRadialGradient(
        spellVFX.x,
        spellVFX.y,
        r,
        spellVFX.color,
        nova64.draw.rgba8(0, 0, 0, 0)
      );
      // Quadratic bezier energy arc for buff/heal spells (quadCurve)
      const arcAlpha = Math.floor(alpha * 180);
      nova64.util.quadCurve(
        100,
        H - 100,
        spellVFX.x,
        spellVFX.y - 60 * alpha,
        spellVFX.x,
        spellVFX.y,
        nova64.util.lerpColor(spellVFX.color, nova64.util.hsb(120, 0.6, 1, arcAlpha), 0.4),
        20
      );
    }
  }

  // Screen flash overlay using drawFlash API (damage, magic, discoveries)
  if (screenFlash && screenFlash.alpha > 0) {
    nova64.draw.drawFlash(
      nova64.draw.rgba8(screenFlash.r, screenFlash.g, screenFlash.b, Math.floor(screenFlash.alpha))
    );
  }

  // Floating texts (2D screen-space + 3D world-space via drawFloatingTexts3D)
  nova64.draw.drawFloatingTexts(floatingTexts);
  if (floatingTexts3D && (gameState === 'combat' || gameState === 'explore')) {
    nova64.draw.drawFloatingTexts3D(floatingTexts3D, worldToScreen);
  }

  // Combat hit sparks (createPool)
  if (sparkPool && sparkPool.count > 0) {
    sparkPool.forEach(s => {
      const a = Math.floor((s.life / 0.5) * 255);
      nova64.draw.rectfill(
        Math.floor(s.x),
        Math.floor(s.y),
        2,
        2,
        nova64.draw.colorMix(s.color, s.life * 2)
      );
    });
  }

  // Subtle noise grain + CRT scanlines for retro feel
  // Only apply full-screen noise on states with 2D backgrounds;
  // in explore/combat the 3D scene must show through the overlay.
  if (gameState !== 'explore' && gameState !== 'combat') {
    nova64.draw.drawNoise(0, 0, W, H, 12, Math.floor(animTimer * 10));
    nova64.draw.drawScanlines(25, 3);
  }

  // Perlin noise atmospheric fog wisps in explore/combat (subtle 2D overlay)
  if (gameState === 'explore' || gameState === 'combat') {
    for (let i = 0; i < 4; i++) {
      const nx = nova64.util.noise(animTimer * 0.3 + i * 3.7, i * 2.1) * W;
      const ny = H - 70 + nova64.util.noise(i * 5.3, animTimer * 0.2) * 40;
      const alpha = Math.floor(nova64.util.noise(animTimer * 0.5 + i, 0) * 25);
      if (alpha > 5) {
        nova64.util.ellipse(
          Math.floor(nx),
          Math.floor(ny),
          40 + i * 10,
          8,
          nova64.draw.rgba8(80, 70, 60, alpha),
          true
        );
      }
    }
    // Procedural noiseMap fog overlay on deeper floors (floor 3+)
    if (floor >= 3) {
      if (!floorNoiseMap) floorNoiseMap = nova64.util.noiseMap(32, 18, 0.12, floor * 10, 0);
      const nCols = 32,
        nRows = 18;
      const cw = W / nCols,
        ch = H / nRows;
      for (let r = nRows - 4; r < nRows; r++) {
        for (let c = 0; c < nCols; c++) {
          const v = floorNoiseMap[r * nCols + c];
          const a = Math.floor(Math.max(0, v) * 18 * (floor - 2));
          if (a > 2)
            nova64.draw.rectfill(
              Math.floor(c * cw),
              Math.floor(r * ch),
              Math.ceil(cw),
              Math.ceil(ch),
              nova64.draw.rgba8(30, 20, 40, a)
            );
        }
      }
    }
  }

  // Reset 2D camera offset after ALL drawing (must be last)
  nova64.draw.setCamera(0, 0);
}

function drawTitle() {
  const t = stateElapsed();
  const fadeIn = nova64.util.smoothstep(0, 2.0, t);
  const fade = Math.floor(fadeIn * 255);

  // Semi-transparent overlays for text readability (3D scene shows through)
  nova64.draw.drawGradient(
    0,
    0,
    W,
    160,
    nova64.draw.rgba8(0, 0, 10, Math.floor(fade * 0.7)),
    nova64.draw.rgba8(0, 0, 5, 0),
    'v'
  );
  nova64.draw.drawGradient(
    0,
    240,
    W,
    120,
    nova64.draw.rgba8(0, 0, 5, 0),
    nova64.draw.rgba8(0, 0, 10, Math.floor(fade * 0.55)),
    'v'
  );

  // Animated starburst glow behind title text
  const burstAlpha = Math.floor(nova64.util.pulse(t, 0.8) * 40 + 20);
  nova64.draw.drawStarburst(320, 65, 120, 40, 12, nova64.draw.rgba8(255, 180, 50, burstAlpha));
  nova64.draw.drawRadialGradient(
    320,
    65,
    100,
    nova64.draw.rgba8(180, 120, 40, Math.floor(fade * 0.2)),
    nova64.draw.rgba8(0, 0, 0, 0)
  );

  // Main title with large glow radius
  nova64.draw.drawGlowText(
    'WIZARDRY',
    320,
    50,
    nova64.draw.rgba8(255, 210, 60, fade),
    nova64.draw.rgba8(200, 120, 0, Math.floor(fade * 0.6)),
    6
  );

  // Subtitle
  const subAlpha = Math.floor(nova64.util.smoothstep(0.5, 1.5, t) * 255);
  nova64.draw.printCentered(
    'N O V A  6 4',
    320,
    100,
    nova64.draw.rgba8(220, 180, 100, subAlpha),
    2
  );

  // Tagline
  const tagAlpha = Math.floor(nova64.util.smoothstep(1.0, 2.0, t) * 200);
  nova64.draw.printCentered(
    'Proving Grounds of the Dark Tower',
    320,
    130,
    nova64.draw.rgba8(170, 150, 130, tagAlpha)
  );

  // Wave separator
  if (t > 1.0) {
    nova64.draw.drawWave(
      100,
      147,
      440,
      4,
      0.04,
      animTimer * 2.5,
      nova64.draw.rgba8(200, 140, 50, Math.floor(tagAlpha * 0.3)),
      2
    );
  }

  // Action prompt (staggered)
  if (t > 1.5) {
    const promptFade = nova64.util.smoothstep(1.5, 2.5, t);
    if (hasSave()) {
      nova64.draw.drawPulsingText(
        'Press C to Continue',
        320,
        255,
        nova64.draw.rgba8(100, 200, 255, Math.floor(promptFade * 255)),
        animTimer,
        {
          frequency: 2,
          minAlpha: 160,
        }
      );
      nova64.draw.drawPulsingText(
        'Press A / Tap to Start',
        320,
        275,
        nova64.draw.rgba8(200, 200, 200, Math.floor(promptFade * 220)),
        animTimer,
        {
          frequency: 3,
          minAlpha: 140,
        }
      );
    } else {
      nova64.draw.drawPulsingText(
        'Press A / Tap to begin your quest',
        320,
        260,
        nova64.draw.rgba8(255, 255, 255, Math.floor(promptFade * 255)),
        animTimer,
        {
          frequency: 2.5,
          minAlpha: 160,
        }
      );
    }
  }

  // Party preview (bottom, appears last)
  if (t > 2.0) {
    const partyFade = Math.floor(nova64.util.smoothstep(2.0, 3.0, t) * 255);
    nova64.draw.printCentered('Your Party:', 320, 298, nova64.draw.rgba8(180, 180, 200, partyFade));
    for (let i = 0; i < 4; i++) {
      const m = party[i];
      const x = 130 + i * 130;
      const c = CLASS_COLORS[m.class];
      const r = (c >> 16) & 0xff,
        g = (c >> 8) & 0xff,
        b = c & 0xff;
      nova64.util.pushMatrix();
      nova64.util.translate(x, 320);
      nova64.util.rotate(QUARTER_PI + Math.sin(animTimer * 1.5 + i) * 0.2);
      nova64.util.scale2d(1.3);
      nova64.draw.rectfill(-6, -6, 12, 12, nova64.draw.rgba8(r, g, b, Math.floor(partyFade * 0.2)));
      nova64.draw.rect(-6, -6, 12, 12, nova64.draw.rgba8(r, g, b, Math.floor(partyFade * 0.4)));
      nova64.util.popMatrix();
      nova64.draw.printCentered(
        CLASS_ICONS[m.class],
        x,
        316,
        nova64.draw.rgba8(r, g, b, partyFade),
        2
      );
      nova64.draw.printCentered(
        m.name,
        x,
        336,
        nova64.draw.rgba8(r, g, b, Math.floor(partyFade * 0.8))
      );
    }
  }
}

function drawExploreHUD() {
  // Compass panel
  // Floor-themed compass border using hslColor (hue shifts per floor)
  const floorHue = floor > 0 ? (floor - 1) * 60 : 30; // warm → cool per floor
  nova64.draw.drawPanel(270, 2, 100, 38, {
    bgColor: nova64.draw.rgba8(0, 0, 0, 160),
    borderLight: nova64.draw.hslColor(floorHue, 0.3, 0.25, 180),
    borderDark: nova64.draw.hslColor(floorHue, 0.3, 0.1, 180),
  });
  nova64.draw.printCentered(
    `Facing ${DIR_NAMES[facing]}`,
    320,
    8,
    nova64.draw.rgba8(200, 200, 220, 255)
  );
  nova64.draw.printCentered(
    `Floor ${floor} (${nova64.util.rad2deg(currentYaw).toFixed(0)}°)`,
    320,
    24,
    nova64.draw.hslColor(floorHue, 0.4, 0.5, 200)
  );

  // Directional arrow indicator using drawTriangle
  const arrowColor = nova64.draw.hslColor(floorHue, 0.5, 0.6, 200);
  const ax = 362,
    ay = 20; // right side of compass panel
  if (facing === 0)
    nova64.draw.drawTriangle(ax, ay - 5, ax - 4, ay + 3, ax + 4, ay + 3, arrowColor, true); // N ▲
  else if (facing === 1)
    nova64.draw.drawTriangle(ax + 5, ay, ax - 3, ay - 4, ax - 3, ay + 4, arrowColor, true); // E ►
  else if (facing === 2)
    nova64.draw.drawTriangle(ax, ay + 5, ax - 4, ay - 3, ax + 4, ay - 3, arrowColor, true); // S ▼
  else nova64.draw.drawTriangle(ax - 5, ay, ax + 3, ay - 4, ax + 3, ay + 4, arrowColor, true); // W ◄

  // Compass arc — sweeping arc around facing direction using deg2rad
  const arcAngle = nova64.util.deg2rad(facing * 90);
  nova64.util.arc(
    320,
    18,
    28,
    14,
    arcAngle - 0.4,
    arcAngle + 0.4,
    nova64.draw.hslColor(floorHue, 0.6, 0.5, 100),
    false
  );

  // Mini party status (bottom)
  drawPartyBar();

  // Gamepad connected indicator on explore HUD
  if (nova64.input.gamepadConnected()) {
    nova64.draw.print('🎮', W - 108, 8, nova64.draw.rgba8(100, 200, 100, 180));
  }

  // Minimap (top-right) using createMinimap API
  if (minimap) nova64.draw.drawMinimap(minimap, animTimer);

  // Floor message
  if (floorMessageTimer > 0) {
    const alpha = Math.min(255, Math.floor(floorMessageTimer * 200));
    nova64.draw.drawPanel(120, 158, 400, 28, {
      bgColor: nova64.draw.rgba8(0, 0, 0, Math.floor(alpha * 0.7)),
      borderLight: nova64.draw.rgba8(100, 80, 40, Math.floor(alpha * 0.4)),
      borderDark: nova64.draw.rgba8(30, 20, 10, Math.floor(alpha * 0.4)),
    });
    nova64.ui.drawTextShadow(
      floorMessage,
      320,
      166,
      nova64.draw.rgba8(255, 220, 100, alpha),
      nova64.draw.rgba8(0, 0, 0, Math.floor(alpha * 0.5)),
      1
    );
  }

  // Magic energy wave divider above party bar — color shifts per floor
  const waveHue = floor > 0 ? (floor - 1) * 60 : 30;
  nova64.draw.drawWave(
    0,
    H - 56,
    W,
    4,
    0.04,
    animTimer * 3,
    nova64.draw.hslColor(waveHue, 0.5, 0.4, 80),
    2
  );

  // Move cooldown indicator (shows when movement is on cooldown)
  const moveProg = nova64.util.cooldownProgress(cooldowns.move);
  if (moveProg < 1) {
    const barW = 40;
    const bx = 310,
      by = H - 58;
    nova64.draw.drawRoundedRect(bx - 1, by - 1, barW + 2, 6, 2, nova64.draw.rgba8(20, 20, 30, 180));
    nova64.draw.rectfill(
      bx,
      by,
      Math.floor(barW * moveProg),
      4,
      nova64.draw.rgba8(100, 180, 255, Math.floor(200 * (1 - moveProg)))
    );
  }

  // Controls hint
  nova64.draw.print(
    'WASD/Arrows=Move  Q/E=Turn  I=Inventory',
    10,
    348,
    nova64.draw.rgba8(80, 80, 100, 150)
  );

  // Thief trap proximity warning using nova64.physics.aabb() collision check
  const thief = party.find(m => m.alive && m.class === 'Thief');
  if (thief) {
    let trapNear = false;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = px + dx,
          ty = py + dy;
        if (tx >= 0 && tx < dungeonW && ty >= 0 && ty < dungeonH && dungeon[ty][tx] === T.TRAP) {
          if (nova64.physics.aabb(px - 1.5, py - 1.5, 3, 3, tx - 0.5, ty - 0.5, 1, 1))
            trapNear = true;
        }
      }
    }
    if (trapNear) {
      const warnAlpha = Math.floor(nova64.util.pulse(animTimer, 3) * 100 + 155);
      nova64.ui.drawTextShadow(
        '⚠ Trap nearby!',
        270,
        44,
        nova64.draw.rgba8(255, 80, 60, warnAlpha),
        nova64.draw.rgba8(0, 0, 0, 180),
        1
      );
    }
  }

  // Gold with diamond icon
  nova64.draw.drawDiamond(534, 352, 4, 5, nova64.draw.rgba8(220, 180, 50, 200));
  nova64.draw.print(`${totalGold}g`, 542, 348, nova64.draw.rgba8(220, 180, 50, 200));

  // Floor transition checkerboard wipe — use nova64.util.ease() for smooth in/out
  if (floorTransition > 0) {
    const rawT = nova64.util.clamp(floorTransition / 0.6, 0, 1);
    const easedT = nova64.util.ease(rawT, 'easeInOutQuad');
    const alpha = Math.floor(easedT * 200);
    nova64.draw.drawCheckerboard(
      0,
      0,
      W,
      H,
      nova64.draw.rgba8(0, 0, 0, alpha),
      nova64.draw.rgba8(10, 5, 20, Math.floor(alpha * 0.5)),
      24
    );
  }
}

function drawPartyBar() {
  const barY = H - 52;
  nova64.draw.drawPanel(0, barY, W, 52, {
    bgColor: nova64.draw.rgba8(10, 8, 15, 220),
    borderLight: nova64.draw.rgba8(60, 50, 40, 200),
    borderDark: nova64.draw.rgba8(20, 15, 10, 200),
  });

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const bx = 10 + i * 158;
    const c = CLASS_COLORS[m.class];
    const r = (c >> 16) & 0xff,
      g = (c >> 8) & 0xff,
      b = c & 0xff;

    // Name + class icon
    nova64.draw.print(
      `${CLASS_ICONS[m.class]} ${m.name}`,
      bx,
      barY + 4,
      m.alive ? nova64.draw.rgba8(r, g, b, 255) : nova64.draw.rgba8(80, 80, 80, 255)
    );

    // HP bar
    if (m.alive) {
      const hpRatio = m.hp / m.maxHp;
      const hpColor = nova64.draw.colorLerp(
        nova64.draw.rgba8(200, 40, 40, 255),
        nova64.draw.rgba8(50, 180, 50, 255),
        hpRatio
      );
      nova64.draw.drawHealthBar(bx, barY + 16, 100, 6, m.hp, m.maxHp, {
        barColor: hpColor,
        backgroundColor: nova64.draw.rgba8(30, 20, 20, 255),
      });
      nova64.draw.print(
        `${m.hp}/${m.maxHp}`,
        bx + 104,
        barY + 14,
        nova64.draw.rgba8(180, 180, 180, 200)
      );
    } else {
      nova64.draw.print('DEAD', bx, barY + 16, nova64.draw.rgba8(150, 40, 40, 200));
    }

    // MP bar (if applicable)
    if (m.maxMp > 0 && m.alive) {
      nova64.draw.drawProgressBar(
        bx,
        barY + 26,
        100,
        4,
        m.mp / m.maxMp,
        nova64.draw.rgba8(50, 80, 200, 255),
        nova64.draw.rgba8(20, 20, 30, 255)
      );
      nova64.draw.print(
        `${m.mp}/${m.maxMp}`,
        bx + 104,
        barY + 24,
        nova64.draw.rgba8(120, 140, 220, 180)
      );
    }

    // Level
    nova64.draw.print(`Lv${m.level}`, bx, barY + 36, nova64.draw.rgba8(120, 120, 140, 180));
  }
}

function drawCombatUI() {
  // Dark overlay panels
  nova64.draw.drawPanel(0, 0, W, 40, {
    bgColor: nova64.draw.rgba8(10, 5, 15, 200),
    borderLight: nova64.draw.rgba8(50, 30, 50, 150),
    borderDark: nova64.draw.rgba8(10, 5, 15, 150),
  });
  nova64.draw.drawPanel(0, H - 160, W, 160, {
    bgColor: nova64.draw.rgba8(10, 5, 15, 220),
    borderLight: nova64.draw.rgba8(50, 30, 50, 150),
    borderDark: nova64.draw.rgba8(10, 5, 15, 150),
  });

  // Boss indicator with scrolling title
  if (enemies.length > 0 && enemies[0].isBoss) {
    const pulse = Math.floor(Math.sin(animTimer * 4) * 40 + 215);
    nova64.draw.scrollingText(
      `☠ BOSS BATTLE — ${enemies[0].name} ☠    `,
      42,
      80,
      animTimer,
      nova64.draw.rgba8(pulse, 40, 60, 255),
      2,
      W
    );
  }

  // Monster info (top)
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const x = 20 + i * 200;
    const alive = e.hp > 0;
    const nameColor = alive
      ? nova64.draw.rgba8(220, 180, 180, 255)
      : nova64.draw.rgba8(80, 80, 80, 150);
    const sel = combatAction === 'target' && i === selectedTarget;

    nova64.draw.print(`${sel ? '► ' : '  '}${e.name}`, x, 6, nameColor);
    if (alive) {
      nova64.draw.drawHealthBar(x, 20, 120, 6, e.hp, e.maxHp, {
        barColor: nova64.draw.rgba8(200, 40, 40, 255),
        dangerColor: nova64.draw.rgba8(255, 100, 60, 255),
        backgroundColor: nova64.draw.rgba8(40, 20, 20, 255),
      });
      nova64.draw.print(`${e.hp}/${e.maxHp}`, x + 124, 18, nova64.draw.rgba8(180, 140, 140, 200));
      // Pulsing crosshair on selected target
      if (sel) {
        const pulse = Math.sin(animTimer * 6) * 0.3 + 0.7;
        const crossColor = nova64.draw.rgba8(255, 60, 60, Math.floor(200 * pulse));
        nova64.draw.drawCrosshair(x + 60, 14, 10, crossColor, 'cross');
        // Magic targeting circle around crosshair
        nova64.draw.circle(
          x + 60,
          14,
          14,
          nova64.draw.rgba8(255, 100, 80, Math.floor(120 * pulse))
        );
      }
    } else {
      nova64.draw.print('DEAD', x + 10, 20, nova64.draw.rgba8(100, 40, 40, 150));
    }
  }

  // Combat log (middle-bottom)
  const logY = H - 155;
  const logLines = combatLog.slice(-5);
  for (let i = 0; i < logLines.length; i++) {
    const alpha = Math.floor(255 - (5 - i - 1) * 30);
    nova64.ui.drawTextShadow(
      logLines[i],
      20,
      logY + i * 12,
      nova64.draw.rgba8(200, 200, 210, Math.max(80, alpha)),
      nova64.draw.rgba8(0, 0, 0, Math.max(60, alpha)),
      1
    );
  }

  // Separator
  nova64.draw.line(10, H - 90, W - 10, H - 90, nova64.draw.rgba8(60, 50, 70, 200));

  // Current party member + actions
  if (combatTurn < party.length) {
    const member = party[combatTurn];
    const c = CLASS_COLORS[member.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;

    nova64.draw.print(
      `${CLASS_ICONS[member.class]} ${member.name}'s turn`,
      20,
      H - 82,
      nova64.draw.rgba8(cr, cg, cb, 255)
    );

    if (combatAction === 'choose') {
      // Action menu with rounded highlight
      const menuItems = ['[1/Z] Attack', '[2/X] Magic', '[3/C] Defend'];
      nova64.draw.drawRoundedRect(14, H - 68, 200, 54, 4, nova64.draw.rgba8(20, 15, 30, 120));
      nova64.draw.print(menuItems[0], 20, H - 62, nova64.draw.rgba8(220, 200, 180, 255));
      if (member.maxMp > 0) {
        nova64.draw.print(
          `${menuItems[1]} (${member.mp} MP)`,
          20,
          H - 48,
          nova64.draw.rgba8(120, 140, 255, 255)
        );
      }
      nova64.draw.print(menuItems[2], 20, H - 34, nova64.draw.rgba8(180, 180, 140, 255));
      const autoAlpha = Math.floor(nova64.util.pulse(animTimer, 1.5) * 75 + 180);
      nova64.draw.print(
        `[A] Auto ${autoPlay ? 'ON' : 'OFF'}`,
        20,
        H - 20,
        autoPlay
          ? nova64.draw.rgba8(100, 255, 100, autoAlpha)
          : nova64.draw.rgba8(120, 120, 140, 180)
      );
      // Show equipped weapon
      if (member.weapon) {
        nova64.draw.print(
          `Weapon: ${member.weapon.name}`,
          250,
          H - 62,
          nova64.draw.rgba8(200, 180, 140, 150)
        );
      }
    } else if (combatAction === 'target') {
      nova64.draw.print(
        'Select target: W/S = cycle, Z/Space = confirm, Esc = back',
        20,
        H - 62,
        nova64.draw.rgba8(200, 180, 150, 200)
      );
    } else if (combatAction === 'spell') {
      const available = Object.values(SPELLS).filter(
        s => s.class === member.class && member.mp >= s.cost
      );
      // Use grid layout helper for spell list positioning
      const spellCells = nova64.ui.grid(1, Math.max(available.length, 1), 360, 14, 0, 0);
      for (let i = 0; i < available.length; i++) {
        const sp = available[i];
        const cell = spellCells[i];
        nova64.draw.print(
          `[${i + 1}] ${sp.name} (${sp.cost} MP) — ${sp.desc}`,
          20 + cell.x,
          H - 62 + cell.y,
          nova64.draw.rgba8(140, 160, 255, 255)
        );
      }
      if (available.length === 0)
        nova64.draw.print(
          'No spells available!',
          20,
          H - 62,
          nova64.draw.rgba8(150, 100, 100, 200)
        );
      nova64.draw.print('Esc = back', 20, H - 20, nova64.draw.rgba8(120, 120, 140, 180));
    } else if (combatAction === 'enemyTurn') {
      nova64.draw.printCentered(
        'Enemies attacking...',
        320,
        H - 62,
        nova64.draw.rgba8(200, 100, 100, 255)
      );
    }
  }

  if (combatAction === 'result') {
    const won = enemies.every(e => e.hp <= 0);
    if (won) {
      // Eased slide-in for victory text
      const t = nova64.util.ease(Math.min(1, stateElapsed() / 0.5), 'easeOutBack');
      const yOff = Math.floor((1 - t) * -30);
      nova64.draw.printCentered(
        'VICTORY!',
        320,
        H - 70 + yOff,
        nova64.draw.rgba8(255, 220, 50, 255),
        2
      );
      // Victory circle burst decoration
      nova64.draw.circle(
        320,
        H - 60 + yOff,
        Math.floor(t * 40),
        nova64.draw.rgba8(255, 200, 50, Math.floor(t * 60))
      );
    } else {
      nova64.draw.printCentered('DEFEAT', 320, H - 70, nova64.draw.rgba8(200, 40, 40, 255), 2);
    }
    nova64.draw.printCentered(
      'Press A / Tap to continue',
      320,
      H - 40,
      nova64.draw.rgba8(180, 180, 200, 200)
    );
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

    // Flash when recently hit (invulnerability frames)
    const hitVisible = !hitStates || !hitStates[i] || isVisible(hitStates[i], animTimer);
    const hitFlash = hitStates && hitStates[i] && nova64.util.isFlashing(hitStates[i]);
    const labelAlpha = hitVisible ? 255 : 80;

    const labelColor = m.alive
      ? hitFlash
        ? nova64.draw.rgba8(255, 255, 255, 255)
        : isCurrent
          ? nova64.draw.rgba8(255, 255, 200, labelAlpha)
          : nova64.draw.rgba8(cr, cg, cb, Math.min(200, labelAlpha))
      : nova64.draw.rgba8(80, 80, 80, 150);
    // Show invulnerability shield indicator (isInvulnerable API)
    if (hitStates && hitStates[i] && nova64.util.isInvulnerable(hitStates[i])) {
      nova64.draw.print('🛡', W - 214, y, nova64.draw.rgba8(100, 200, 255, 200));
    }
    nova64.draw.print(`${isCurrent ? '►' : ' '} ${m.name}`, W - 200, y, labelColor);
    if (m.alive) {
      // Buff indicator: brighten HP text when buffed using colorMix
      const buffed = (m.buffAtk > 0 || m.buffDef > 0) && m.buffTimer > 0;
      const hpTextColor = buffed
        ? nova64.draw.colorMix(nova64.draw.rgba8(220, 220, 100, 255), 1.5)
        : nova64.draw.rgba8(180, 180, 180, 200);
      // Use colorLerp for smooth HP bar color: green → yellow → red
      const hpRatio = m.hp / m.maxHp;
      const hpColor = nova64.draw.colorLerp(
        nova64.draw.rgba8(200, 40, 40, 255),
        nova64.draw.rgba8(50, 180, 50, 255),
        hpRatio
      );
      nova64.draw.drawHealthBar(W - 95, y + 2, 60, 5, m.hp, m.maxHp, {
        barColor: buffed ? nova64.draw.colorMix(hpColor, 1.3) : hpColor,
        backgroundColor: nova64.draw.rgba8(30, 20, 20, 255),
      });
      nova64.draw.print(`${m.hp}`, W - 30, y, hpTextColor);
    }
  }
}

function drawInventoryUI() {
  const panelW = W - 80,
    panelH = H - 60;
  nova64.draw.drawPanel(nova64.ui.centerX(panelW), nova64.ui.centerY(panelH), panelW, panelH, {
    bgColor: nova64.draw.rgba8(10, 8, 20, 240),
    borderLight: nova64.draw.rgba8(80, 70, 50, 255),
    borderDark: nova64.draw.rgba8(30, 25, 20, 255),
  });
  // Save current font, use default for inventory title
  const prevFont = nova64.ui.getFont();
  nova64.draw.printCentered(
    '═══ PARTY STATUS ═══',
    320,
    40,
    nova64.draw.rgba8(200, 180, 120, 255),
    2
  );

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const y = 75 + i * 65;
    const c = CLASS_COLORS[m.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;

    // Name + Class
    nova64.draw.print(
      `${CLASS_ICONS[m.class]} ${m.name}  [${m.class}]  Lv ${m.level}`,
      60,
      y,
      nova64.draw.rgba8(cr, cg, cb, 255)
    );

    // Stats
    const statColor = nova64.draw.rgba8(180, 180, 200, 220);
    nova64.draw.print(`HP: ${m.hp}/${m.maxHp}`, 80, y + 14, statColor);
    nova64.draw.drawProgressBar(
      160,
      y + 16,
      80,
      5,
      m.hp / m.maxHp,
      nova64.draw.rgba8(50, 180, 50, 255),
      nova64.draw.rgba8(30, 20, 20, 255)
    );

    if (m.maxMp > 0) {
      nova64.draw.print(
        `MP: ${m.mp}/${m.maxMp}`,
        260,
        y + 14,
        nova64.draw.rgba8(120, 140, 220, 200)
      );
      nova64.draw.drawProgressBar(
        340,
        y + 16,
        60,
        5,
        m.mp / m.maxMp,
        nova64.draw.rgba8(50, 80, 200, 255),
        nova64.draw.rgba8(20, 20, 30, 255)
      );
    }

    const totalAtk = getEffectiveAtk(m);
    const totalDef = getEffectiveDef(m);
    nova64.draw.print(
      `ATK:${totalAtk}  DEF:${totalDef}  SPD:${m.spd}`,
      80,
      y + 28,
      nova64.draw.rgba8(150, 150, 170, 180)
    );
    nova64.draw.printRight(
      `XP: ${m.xp}/${m.xpNext}`,
      560,
      y + 28,
      nova64.draw.rgba8(150, 150, 170, 180)
    );
    // XP progress bar using uiProgressBar (UI widget variant)
    nova64.ui.uiProgressBar(430, y + 30, 80, 4, m.xp, m.xpNext, {
      fillColor: nova64.draw.rgba8(180, 150, 50, 200),
      bgColor: nova64.draw.rgba8(30, 25, 15, 180),
      showText: false,
    });

    // Equipment
    if (m.weapon) {
      nova64.draw.print(`Wpn: ${m.weapon.name}`, 80, y + 40, nova64.draw.rgba8(200, 160, 80, 180));
    }
    if (m.armor) {
      nova64.draw.print(`Arm: ${m.armor.name}`, 260, y + 40, nova64.draw.rgba8(120, 160, 200, 180));
    }

    if (!m.alive) {
      nova64.draw.print('☠ FALLEN', 480, y, nova64.draw.rgba8(200, 40, 40, 255));
    }
  }

  // Gold + Floor info
  nova64.draw.drawDiamond(72, H - 86, 4, 5, nova64.draw.rgba8(220, 180, 50, 230));
  const goldStr = `${totalGold}g`;
  const goldMetrics = nova64.draw.measureText(goldStr, 1);
  nova64.draw.print(goldStr, 80, H - 90, nova64.draw.rgba8(220, 180, 50, 230));
  nova64.draw.print(
    `Floor: ${floor}`,
    80 + goldMetrics.width + 12,
    H - 90,
    nova64.draw.rgba8(150, 150, 170, 200)
  );
  if (bossDefeated.size > 0) {
    nova64.draw.printRight(`Bosses slain: ${bossDefeated.size}`, 560, H - 90, n64Palette.red);
  }

  // Render stats debug info using get3DStats + getParticleStats + getRenderer
  const stats = nova64.scene.get3DStats();
  if (stats) {
    let debugStr = `Tris:${stats.triangles || 0}  Draws:${stats.drawCalls || 0}  Meshes:${stats.meshes || 0}`;
    // Append particle stats if any systems are active
    if (particleSystems.length > 0) {
      const pStats = nova64.fx.getParticleStats(particleSystems[0]);
      if (pStats) debugStr += `  Particles:${pStats.active}/${pStats.max}`;
    }
    debugStr += `  Frame:${frameCount}`;
    // Show renderer type from nova64.scene.getRenderer()
    const renderer = nova64.scene.getRenderer();
    if (renderer && renderer.info)
      debugStr += `  GL:${renderer.info.programs ? renderer.info.programs.length : '?'}prg`;
    // Show scene object count from nova64.scene.getScene()
    const scene = nova64.scene.getScene();
    if (scene && scene.children) debugStr += `  Obj:${scene.children.length}`;
    nova64.draw.print(debugStr, 60, H - 55, nova64.draw.rgba8(80, 80, 100, 120));
  }
  // Game stats from createGameStore
  if (gameStats) {
    const gs = gameStats.getState();
    nova64.draw.print(
      `Steps:${gs.steps}  Kills:${gs.kills}`,
      60,
      H - 42,
      nova64.draw.rgba8(70, 70, 90, 100)
    );
  }
  // Restore font after inventory rendering
  if (prevFont) nova64.ui.setFont(prevFont.name || 'default');

  nova64.draw.print('[S] Save Game', 60, H - 72, nova64.draw.rgba8(100, 200, 100, 200));
  // Visual preset toggle hint
  const presetLabel = visualPreset ? `[V] Mode: ${visualPreset.toUpperCase()}` : '[V] Visual Mode';
  nova64.draw.print(presetLabel, 250, H - 72, n64Palette.cyan);
  nova64.draw.printCentered(
    'Press I / TAB / ESC to close',
    320,
    H - 55,
    nova64.draw.rgba8(120, 120, 150, 180)
  );
}

function drawGameOver() {
  // Smooth fade-in using nova64.util.ease() for polished game over transition
  const fadeRaw = Math.min(1, stateElapsed() / 1.0);
  const fadeIn = nova64.util.ease(fadeRaw, 'easeOutCubic');
  const fade = Math.floor(fadeIn * 220);
  nova64.draw.drawSkyGradient(nova64.draw.rgba8(15, 0, 0, fade), nova64.draw.rgba8(0, 0, 0, fade));
  // Pulsing red radial glow behind text
  nova64.draw.drawRadialGradient(
    320,
    140,
    120,
    nova64.draw.hslColor(0, 0.8, 0.2, 60),
    nova64.draw.rgba8(0, 0, 0, 0)
  );
  // Decorative ellipse frame behind title
  nova64.util.ellipse(
    320,
    130,
    160,
    50,
    nova64.draw.rgba8(120, 20, 20, Math.floor(fade * 0.3)),
    false
  );
  nova64.ui.drawTextOutline(
    'GAME OVER',
    320,
    120,
    nova64.draw.hexColor(0xcc2828, 255),
    nova64.draw.rgba8(80, 0, 0, 200),
    3
  );
  // Skull polygon icon above text
  const skullAlpha = Math.floor(nova64.util.pulse(animTimer, 2) * 100 + 155);
  nova64.draw.poly(
    [
      [310, 85],
      [320, 75],
      [330, 85],
      [325, 95],
      [315, 95],
    ],
    nova64.draw.rgba8(200, 50, 50, skullAlpha),
    true
  );
  nova64.draw.printCentered(
    `Your party fell on Floor ${floor}`,
    320,
    180,
    nova64.draw.rgba8(180, 150, 130, 200)
  );
  nova64.draw.drawDiamond(270, 204, 4, 5, nova64.draw.hexColor(0xc8b432, 200));
  nova64.draw.printCentered(
    `${totalGold} Gold collected`,
    320,
    200,
    nova64.draw.hexColor(0xc8b432, 200)
  );

  // Pulsing restart prompt using nova64.util.pulse() for smooth oscillation
  const restartAlpha = Math.floor(nova64.util.pulse(animTimer, 1.5) * 120 + 135);
  nova64.draw.printCentered(
    'Press A / Tap to try again',
    320,
    280,
    nova64.draw.rgba8(255, 255, 255, restartAlpha)
  );
  // Interactive restart button (createButton/updateButton/drawButton)
  if (restartButton) {
    nova64.ui.updateButton(restartButton);
    nova64.ui.drawButton(restartButton);
  }
}

function drawVictory() {
  nova64.draw.drawGradient(
    0,
    0,
    W,
    H,
    nova64.draw.rgba8(10, 8, 2, 200),
    nova64.draw.rgba8(2, 2, 10, 200)
  );

  // Victory crown polygon
  const crownColor = nova64.draw.rgba8(
    255,
    220,
    50,
    Math.floor(nova64.util.ease(Math.min(1, stateElapsed() / 1.5), 'easeOutBack') * 255)
  );
  nova64.draw.poly(
    [
      [280, 55],
      [290, 35],
      [305, 50],
      [320, 25],
      [335, 50],
      [350, 35],
      [360, 55],
    ],
    crownColor,
    true
  );
  nova64.draw.poly(
    [
      [280, 55],
      [290, 35],
      [305, 50],
      [320, 25],
      [335, 50],
      [350, 35],
      [360, 55],
    ],
    nova64.draw.rgba8(180, 120, 0, 200),
    false
  );

  // Celebratory starbursts using hslColor for rainbow cycling
  for (let i = 0; i < 5; i++) {
    const sx = 80 + i * 130;
    const sy = 50 + Math.sin(animTimer * 2 + i) * 15;
    const starColor = nova64.draw.hslColor(animTimer * 60 + i * 72, 0.7, 0.5, 120);
    nova64.draw.drawStarburst(sx, sy, 20, 8, 6, starColor);
  }

  nova64.draw.drawGlowTextCentered(
    'VICTORY!',
    320,
    80,
    nova64.draw.rgba8(255, 220, 50, 255),
    nova64.draw.rgba8(180, 120, 0, 150),
    3
  );
  nova64.draw.printCentered(
    'You conquered the Dark Tower!',
    320,
    140,
    nova64.draw.rgba8(200, 200, 220, 255)
  );

  // Gold with diamond — use n64Palette for classic gold tone
  nova64.draw.drawDiamond(290, 174, 4, 5, n64Palette.yellow);
  nova64.draw.printCentered(`${totalGold} Gold`, 320, 170, n64Palette.yellow);

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const y = 200 + i * 16;
    // Use hexColor to convert CLASS_COLORS directly to rgba8
    nova64.draw.printCentered(
      `${m.name} — Lv${m.level} ${m.class} ${m.alive ? '✓' : '☠'}`,
      320,
      y,
      nova64.draw.hexColor(CLASS_COLORS[m.class], 220)
    );
  }

  // Pixel confetti sparkles (pset API)
  for (let i = 0; i < 30; i++) {
    const sx = (Math.sin(animTimer * 2 + i * 1.7) * 0.5 + 0.5) * W;
    const sy = (animTimer * 40 + i * 37) % H;
    nova64.draw.pset(
      Math.floor(sx),
      Math.floor(sy),
      nova64.draw.hslColor(i * 36 + animTimer * 60, 0.7, 0.6, 200)
    );
  }

  // Pulsing restart prompt using nova64.util.pulse() for smooth oscillation
  const replayAlpha = Math.floor(nova64.util.pulse(animTimer, 1.5) * 120 + 135);
  nova64.draw.printCentered(
    'Press A / Tap to play again',
    320,
    300,
    nova64.draw.rgba8(255, 255, 255, replayAlpha)
  );
}
