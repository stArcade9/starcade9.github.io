// NATURE EXPLORER 3D — Immersive Low-Poly Wilderness with Wildlife & Discovery
// Explore a vast procedural landscape, discover wildlife, collect specimens,
// photograph creatures, and uncover all points of interest across biomes

// ── World Constants ──
const {
  circle,
  createMinimap,
  drawGlowText,
  drawMinimap,
  drawPixelBorder,
  drawProgressBar,
  line,
  print,
  printCentered,
  rect,
  rectfill,
  rgba8,
} = nova64.draw;
const {
  clearScene,
  createCapsule,
  createCone,
  createCube,
  createCylinder,
  createPlane,
  createSphere,
  loadModel,
  removeMesh,
  setMeshOpacity,
  setPosition,
  setRotation,
  setScale,
  updateAnimations,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const {
  createGradientSkybox,
  createPointLight,
  setAmbientLight,
  setFog,
  setLightDirection,
  setPointLightColor,
} = nova64.light;
const {
  createParticleSystem,
  enableBloom,
  enableVignette,
  removeParticleSystem,
  setParticleEmitter,
  updateParticles,
} = nova64.fx;
const { key, keyp } = nova64.input;
const { sfx } = nova64.audio;
const { color, createFloatingTextSystem, noise } = nova64.util;

const WORLD_SIZE = 120;
const TREE_COUNT = 50;
const ROCK_COUNT = 30;
const FLOWER_PATCH_COUNT = 25;
const MUSHROOM_COUNT = 15;
const CRYSTAL_COUNT = 10;
const POI_COUNT = 8;

// ── Biome definitions ──
const BIOMES = [
  { name: 'Meadow', ground: 0x5a9c4f, tree: 0x228b22, fog: 0x88ccaa, sky: [0x99ccee, 0x4488bb] },
  {
    name: 'Pine Forest',
    ground: 0x3d7a3d,
    tree: 0x1a5c1a,
    fog: 0x668877,
    sky: [0x7799aa, 0x335566],
  },
  {
    name: 'Cherry Grove',
    ground: 0x6aac5f,
    tree: 0xff88aa,
    fog: 0xddaacc,
    sky: [0xffccdd, 0xaa6688],
  },
  {
    name: 'Autumn Wood',
    ground: 0x8a7a4f,
    tree: 0xcc6622,
    fog: 0xaa9966,
    sky: [0xddaa77, 0x885533],
  },
];

// ── Wildlife templates ──
const WILDLIFE = [
  { name: 'Deer', shape: 'tall', color: 0xaa7744, size: 1.2, speed: 4, flee: 12, rare: false },
  { name: 'Rabbit', shape: 'small', color: 0xccaa88, size: 0.4, speed: 6, flee: 8, rare: false },
  { name: 'Fox', shape: 'medium', color: 0xdd6622, size: 0.7, speed: 5, flee: 10, rare: false },
  { name: 'Bear', shape: 'large', color: 0x554433, size: 1.8, speed: 2, flee: 0, rare: false },
  { name: 'Owl', shape: 'bird', color: 0x887766, size: 0.5, speed: 3, flee: 15, rare: false },
  { name: 'Blue Jay', shape: 'bird', color: 0x3366cc, size: 0.3, speed: 7, flee: 12, rare: false },
  { name: 'White Stag', shape: 'tall', color: 0xeeeeff, size: 1.4, speed: 8, flee: 20, rare: true },
  {
    name: 'Golden Eagle',
    shape: 'bird',
    color: 0xddaa33,
    size: 0.8,
    speed: 10,
    flee: 25,
    rare: true,
  },
  {
    name: 'Crystal Butterfly',
    shape: 'tiny',
    color: 0xaaddff,
    size: 0.2,
    speed: 2,
    flee: 6,
    rare: true,
  },
];

// ── Collectible types ──
const COLLECTIBLES = [
  { name: 'Red Mushroom', color: 0xcc2222, shape: 'mushroom', points: 10 },
  { name: 'Blue Mushroom', color: 0x2244cc, shape: 'mushroom', points: 15 },
  { name: 'Golden Mushroom', color: 0xddaa22, shape: 'mushroom', points: 30 },
  { name: 'Amethyst Crystal', color: 0x9944cc, shape: 'crystal', points: 25 },
  { name: 'Emerald Crystal', color: 0x22cc44, shape: 'crystal', points: 25 },
  { name: 'Ruby Crystal', color: 0xcc2244, shape: 'crystal', points: 40 },
  { name: 'Wildflower', color: 0xff88aa, shape: 'flower', points: 5 },
  { name: 'Sunflower', color: 0xffcc22, shape: 'flower', points: 5 },
  { name: 'Feather', color: 0xeeeedd, shape: 'feather', points: 20 },
];

// ── Points of Interest ──
const POI_TYPES = [
  { name: 'Ancient Ruins', desc: 'Crumbling stone pillars from a forgotten age', color: 0x888877 },
  { name: 'Fairy Ring', desc: 'A circle of glowing mushrooms', color: 0x88ffaa },
  { name: 'Old Campsite', desc: 'Remains of a campfire, still warm', color: 0xcc6633 },
  { name: 'Waterfall', desc: 'Crystal-clear water cascading over mossy rocks', color: 0x44aadd },
  { name: 'Hollow Tree', desc: 'A massive ancient tree with a carved entrance', color: 0x6b4226 },
  { name: 'Stone Circle', desc: 'Mysterious standing stones hum with energy', color: 0x99aaaa },
  { name: 'Flower Meadow', desc: 'A carpet of wildflowers stretches before you', color: 0xff99bb },
  { name: 'Crystal Cave', desc: 'Glittering crystals line a shallow cave', color: 0xaabbff },
];

// ── State ──
let playerPos = { x: 0, y: 1, z: 0 };
let playerAngle = 0;
let time = 0;
let gameState = 'loading';
let loadingProgress = 0;
let loadingText = 'Generating world...';

let trees = [];
let rocks = [];
let butterflies = [];
let clouds = [];
let flowers = [];
let animals = [];
let collectibles = [];
let pointsOfInterest = [];
let particleSystems = [];
let campfireLights = [];

let sunAngle = 0;
let dayNightCycle = 0;
let weatherState = 'clear'; // clear, cloudy, rain
let weatherTimer = 0;
let rainParticles = null;
let windStrength = 0;

// Discovery / Journal
let journal = { creatures: new Set(), pois: new Set(), collectibles: new Set() };
let score = 0;
let totalCollectibles = 0;
let photoMode = false;
let photoZoom = 1;
let photoFlash = 0;
let photos = []; // { name, time }
let notifications = [];
let floatingTexts = null;
let minimap = null;

// Camera smoothing
let camPos = { x: 0, y: 6, z: 12 };
let camTarget = { x: 0, y: 1, z: 0 };

// GLB model URLs (Khronos glTF samples — all CC0/CC-BY 4.0)
const MODEL_URLS = {
  fox: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb',
  duck: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
};
let models = {};

// Seeded random for consistent world gen
let seed = 12345;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function dist2D(ax, az, bx, bz) {
  const dx = ax - bx,
    dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

function getBiome(x, z) {
  // Simple noise-based biome selection
  const n = Math.sin(x * 0.03) * Math.cos(z * 0.04) + Math.sin(x * 0.07 + z * 0.05);
  if (n > 0.5) return BIOMES[2]; // Cherry Grove
  if (n > 0) return BIOMES[0]; // Meadow
  if (n > -0.5) return BIOMES[3]; // Autumn Wood
  return BIOMES[1]; // Pine Forest
}

// ── Create animal 3D mesh ──
function createAnimalMesh(template, x, z) {
  const s = template.size;
  const c = template.color;
  let mesh;
  switch (template.shape) {
    case 'tall': {
      // Deer / Stag
      const body = createCapsule(s * 0.4, s * 0.8, c, [x, s * 0.8, z]);
      setScale(body, 1, 1, 1.5);
      const head = createSphere(s * 0.25, c, [x, s * 1.2, z - s * 0.6]);
      // Legs
      createCylinder(s * 0.08, s * 0.6, c - 0x111111, [x - s * 0.2, s * 0.3, z - s * 0.3]);
      createCylinder(s * 0.08, s * 0.6, c - 0x111111, [x + s * 0.2, s * 0.3, z - s * 0.3]);
      createCylinder(s * 0.08, s * 0.6, c - 0x111111, [x - s * 0.2, s * 0.3, z + s * 0.3]);
      createCylinder(s * 0.08, s * 0.6, c - 0x111111, [x + s * 0.2, s * 0.3, z + s * 0.3]);
      mesh = body;
      break;
    }
    case 'small': {
      // Rabbit
      mesh = createSphere(s * 0.5, c, [x, s * 0.4, z]);
      setScale(mesh, 1, 0.8, 1.2);
      createSphere(s * 0.2, c, [x, s * 0.7, z - s * 0.2]);
      // Ears
      createCylinder(s * 0.06, s * 0.4, 0xffccaa, [x - s * 0.08, s * 0.9, z - s * 0.2]);
      createCylinder(s * 0.06, s * 0.4, 0xffccaa, [x + s * 0.08, s * 0.9, z - s * 0.2]);
      break;
    }
    case 'medium': {
      // Fox
      mesh = createCapsule(s * 0.3, s * 0.5, c, [x, s * 0.5, z]);
      setScale(mesh, 1, 0.9, 1.4);
      const fHead = createSphere(s * 0.22, c, [x, s * 0.7, z - s * 0.4]);
      createCone(s * 0.12, s * 0.2, 0xffffff, [x, s * 0.65, z - s * 0.6]); // Nose
      // Tail
      createCapsule(s * 0.1, s * 0.4, 0xffffff, [x, s * 0.5, z + s * 0.5]);
      break;
    }
    case 'large': {
      // Bear
      mesh = createCapsule(s * 0.5, s * 0.7, c, [x, s * 0.7, z]);
      setScale(mesh, 1.2, 1, 1.3);
      createSphere(s * 0.35, c, [x, s * 1.1, z - s * 0.4]);
      // Ears
      createSphere(s * 0.1, c, [x - s * 0.2, s * 1.35, z - s * 0.35]);
      createSphere(s * 0.1, c, [x + s * 0.2, s * 1.35, z - s * 0.35]);
      break;
    }
    case 'bird': {
      // Flying bird
      mesh = createSphere(s * 0.4, c, [x, 5 + Math.random() * 8, z]);
      setScale(mesh, 1, 0.6, 1.5);
      // Wings
      createPlane(s * 1.5, s * 0.4, c + 0x222222, [x, 5 + Math.random() * 8, z]);
      break;
    }
    case 'tiny': {
      // Crystal butterfly
      mesh = createSphere(s * 0.3, c, [x, 2, z], 6, { material: 'holographic' });
      break;
    }
    default:
      mesh = createSphere(s * 0.5, c, [x, s, z]);
  }
  return mesh;
}

// ── Create collectible mesh ──
function createCollectibleMesh(type, x, z) {
  let mesh;
  switch (type.shape) {
    case 'mushroom': {
      const stem = createCylinder(0.1, 0.3, 0xeeddcc, [x, 0.15, z]);
      mesh = createSphere(0.2, type.color, [x, 0.35, z]);
      setScale(mesh, 1, 0.6, 1);
      break;
    }
    case 'crystal': {
      mesh = createCone(0.15, 0.5, type.color, [x, 0.25, z], { material: 'holographic' });
      break;
    }
    case 'flower': {
      createCylinder(0.04, 0.3, 0x44aa22, [x, 0.15, z]);
      mesh = createSphere(0.12, type.color, [x, 0.35, z]);
      break;
    }
    case 'feather': {
      mesh = createPlane(0.3, 0.1, type.color, [x, 0.5, z]);
      setRotation(mesh, 0.3, 0, 0.5);
      break;
    }
    default:
      mesh = createSphere(0.2, type.color, [x, 0.3, z]);
  }
  return mesh;
}

// ── Create POI structure ──
function createPOIMesh(type, x, z) {
  const c = type.color;
  switch (type.name) {
    case 'Ancient Ruins': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const px = x + Math.cos(a) * 3;
        const pz = z + Math.sin(a) * 3;
        const h = 2 + Math.random() * 3;
        const pillar = createCylinder(0.4, h, c, [px, h / 2, pz]);
        if (Math.random() > 0.5) setScale(pillar, 1, 0.6, 1); // Broken
      }
      createPlane(6, 6, 0x777766, [x, 0.05, z]);
      break;
    }
    case 'Fairy Ring': {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const px = x + Math.cos(a) * 2.5;
        const pz = z + Math.sin(a) * 2.5;
        createCylinder(0.08, 0.2, 0xeeddcc, [px, 0.1, pz]);
        createSphere(0.12, 0x88ffaa, [px, 0.25, pz], 4, { material: 'emissive' });
      }
      const glow = createParticleSystem(60, {
        size: 0.08,
        color: 0x88ffaa,
        emissive: 0x44ff66,
        emissiveIntensity: 3,
        gravity: 0.5,
        drag: 0.9,
        emitterX: x,
        emitterY: 0.5,
        emitterZ: z,
        emitRate: 8,
        minLife: 1,
        maxLife: 3,
        minSpeed: 0.3,
        maxSpeed: 1,
        spread: Math.PI,
        minSize: 0.03,
        maxSize: 0.1,
        endColor: 0x004400,
      });
      particleSystems.push(glow);
      break;
    }
    case 'Old Campsite': {
      // Fire pit
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        createCube(0.3, 0x555555, [x + Math.cos(a) * 1, 0.15, z + Math.sin(a) * 1]);
      }
      // Campfire particles
      const fire = createParticleSystem(80, {
        size: 0.12,
        color: 0xff6622,
        emissive: 0xff4400,
        emissiveIntensity: 3,
        gravity: 2,
        drag: 0.95,
        emitterX: x,
        emitterY: 0.3,
        emitterZ: z,
        emitRate: 15,
        minLife: 0.3,
        maxLife: 1,
        minSpeed: 1,
        maxSpeed: 3,
        spread: 0.4,
        minSize: 0.05,
        maxSize: 0.15,
        endColor: 0x331100,
      });
      particleSystems.push(fire);
      const light = createPointLight(0xff6622, 2, 12, [x, 2, z]);
      campfireLights.push({ light, x, z, base: 2 });
      // Log seats
      createCylinder(0.2, 1.5, 0x6b4226, [x + 2, 0.2, z]);
      setRotation(createCylinder(0.2, 1.5, 0x6b4226, [x - 1.5, 0.2, z + 1.5]), 0, 0.8, 0);
      break;
    }
    case 'Waterfall': {
      // Rock wall
      createCube(4, 0x666655, [x, 3, z - 1]);
      setScale(createCube(3, 0x555544, [x, 5, z - 0.5]), 0.8, 1, 0.5);
      // Water particles
      const waterfall = createParticleSystem(120, {
        size: 0.1,
        color: 0x66bbee,
        emissive: 0x2288bb,
        emissiveIntensity: 1,
        gravity: -8,
        drag: 0.98,
        emitterX: x,
        emitterY: 5.5,
        emitterZ: z,
        emitRate: 25,
        minLife: 0.5,
        maxLife: 1.2,
        minSpeed: 0.5,
        maxSpeed: 2,
        spread: 0.3,
        minSize: 0.04,
        maxSize: 0.12,
        endColor: 0x224466,
      });
      particleSystems.push(waterfall);
      // Pool
      const pool = createCylinder(3, 0.1, 0x2266aa, [x, 0.05, z + 2]);
      setScale(pool, 1.5, 1, 1);
      break;
    }
    case 'Hollow Tree': {
      const trunk = createCylinder(2, 8, 0x6b4226, [x, 4, z]);
      createSphere(5, 0x2e8b57, [x, 9, z]);
      // Hollow entrance
      createCube(1.2, 0x332211, [x, 1, z + 2], { material: 'standard' });
      break;
    }
    case 'Stone Circle': {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const px = x + Math.cos(a) * 4;
        const pz = z + Math.sin(a) * 4;
        const stone = createCube(1, 0x889999, [px, 1.5, pz]);
        setScale(stone, 0.5, 1 + Math.random(), 0.4);
      }
      // Central energy
      const energy = createParticleSystem(40, {
        size: 0.06,
        color: 0xaaddff,
        emissive: 0x6699ff,
        emissiveIntensity: 4,
        gravity: 1,
        drag: 0.9,
        emitterX: x,
        emitterY: 1,
        emitterZ: z,
        emitRate: 6,
        minLife: 1.5,
        maxLife: 3,
        minSpeed: 0.5,
        maxSpeed: 1.5,
        spread: Math.PI * 2,
        minSize: 0.02,
        maxSize: 0.08,
        endColor: 0x001133,
      });
      particleSystems.push(energy);
      break;
    }
    case 'Flower Meadow': {
      for (let i = 0; i < 40; i++) {
        const fx = x + (Math.random() - 0.5) * 8;
        const fz = z + (Math.random() - 0.5) * 8;
        const fc = [0xff6699, 0xffaa33, 0xff44aa, 0xaa44ff, 0xffff44][
          Math.floor(Math.random() * 5)
        ];
        createCylinder(0.03, 0.2 + Math.random() * 0.2, 0x44aa22, [fx, 0.1, fz]);
        createSphere(0.08 + Math.random() * 0.06, fc, [fx, 0.3, fz]);
      }
      break;
    }
    case 'Crystal Cave': {
      // Rock overhang
      createSphere(4, 0x555544, [x, 0, z]);
      setScale(createSphere(4, 0x555544, [x, 0, z]), 1.5, 0.6, 1.5);
      // Crystals inside
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const cx = x + Math.cos(a) * 2;
        const cz = z + Math.sin(a) * 2;
        const cc = [0x9944cc, 0x4499ff, 0x22ccaa][i % 3];
        createCone(0.15, 0.5 + Math.random() * 0.5, cc, [cx, 0.3, cz], { material: 'holographic' });
      }
      const crystGlow = createParticleSystem(30, {
        size: 0.05,
        color: 0xaabbff,
        emissive: 0x6677ff,
        emissiveIntensity: 3,
        gravity: 0.3,
        drag: 0.85,
        emitterX: x,
        emitterY: 0.5,
        emitterZ: z,
        emitRate: 4,
        minLife: 2,
        maxLife: 4,
        minSpeed: 0.2,
        maxSpeed: 0.6,
        spread: Math.PI,
        minSize: 0.02,
        maxSize: 0.06,
        endColor: 0x000033,
      });
      particleSystems.push(crystGlow);
      break;
    }
  }
}

function generateWorld() {
  seed = 42;

  // Ground — layered for depth
  createPlane(WORLD_SIZE * 2.5, WORLD_SIZE * 2.5, 0x4a8c3f, [0, 0, 0]);
  // Dirt ring around world edge
  createPlane(WORLD_SIZE * 4, WORLD_SIZE * 4, 0x8a7a5a, [0, -0.02, 0]);
  // Water plane
  const water = createPlane(WORLD_SIZE * 5, WORLD_SIZE * 5, 0x2266aa, [0, -0.8, 0]);

  // Hills with biome-colored grass
  for (let i = 0; i < 20; i++) {
    const x = (seededRandom() - 0.5) * WORLD_SIZE * 2;
    const z = (seededRandom() - 0.5) * WORLD_SIZE * 2;
    const biome = getBiome(x, z);
    const height = 2 + seededRandom() * 10;
    const radius = 5 + seededRandom() * 12;
    const hill = createSphere(radius, biome.ground, [x, -radius + height, z]);
    setScale(hill, 1, 0.35, 1);
  }

  // Trees — biome-dependent styles
  for (let i = 0; i < TREE_COUNT; i++) {
    const x = (seededRandom() - 0.5) * WORLD_SIZE * 1.8;
    const z = (seededRandom() - 0.5) * WORLD_SIZE * 1.8;
    const biome = getBiome(x, z);
    const height = 3 + seededRandom() * 5;
    const trunkColor = 0x8b5a2b + Math.floor(seededRandom() * 0x151515);

    const trunk = createCylinder(0.25 + seededRandom() * 0.15, height, trunkColor, [
      x,
      height / 2,
      z,
    ]);

    if (biome.name === 'Pine Forest') {
      // Cone-shaped pine
      for (let layer = 0; layer < 3; layer++) {
        const ly = height * 0.5 + layer * 1.2;
        const lr = 2 - layer * 0.5;
        createCone(lr, 2, biome.tree, [x, ly, z]);
      }
    } else {
      // Round canopy
      const canopySize = 1.5 + seededRandom() * 2.5;
      const canopy = createSphere(canopySize, biome.tree, [x, height + canopySize * 0.4, z]);
      if (biome.name === 'Cherry Grove' && seededRandom() > 0.5) {
        // Cherry blossoms particle
        const blossom = createParticleSystem(30, {
          size: 0.06,
          color: 0xff88aa,
          emissive: 0xff6688,
          emissiveIntensity: 0.5,
          gravity: -0.5,
          drag: 0.92,
          emitterX: x,
          emitterY: height + canopySize,
          emitterZ: z,
          emitRate: 3,
          minLife: 2,
          maxLife: 5,
          minSpeed: 0.3,
          maxSpeed: 1,
          spread: Math.PI,
          minSize: 0.03,
          maxSize: 0.08,
          endColor: 0x994466,
        });
        particleSystems.push(blossom);
      }
    }

    trees.push({ x, z, height, trunk });
  }

  // Rocks
  for (let i = 0; i < ROCK_COUNT; i++) {
    const x = (seededRandom() - 0.5) * WORLD_SIZE * 1.8;
    const z = (seededRandom() - 0.5) * WORLD_SIZE * 1.8;
    const size = 0.5 + seededRandom() * 2;
    const gray = 0x666666 + Math.floor(seededRandom() * 0x333333);
    const rock = createCube(size, gray, [x, size / 2, z]);
    setScale(rock, 1 + seededRandom() * 0.5, 0.5 + seededRandom() * 0.8, 1 + seededRandom() * 0.5);
    rocks.push({ x, z, mesh: rock });
  }

  // Flower patches (decorative, not collectible)
  for (let i = 0; i < FLOWER_PATCH_COUNT; i++) {
    const cx = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const cz = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const patchColor = [0xff6699, 0xffaa33, 0xff44aa, 0xaa44ff, 0xffff44, 0xff8844][
      Math.floor(seededRandom() * 6)
    ];
    for (let j = 0; j < 8; j++) {
      const fx = cx + (seededRandom() - 0.5) * 3;
      const fz = cz + (seededRandom() - 0.5) * 3;
      createCylinder(0.03, 0.15 + seededRandom() * 0.15, 0x44aa22, [fx, 0.08, fz]);
      const fm = createSphere(0.07, patchColor, [fx, 0.22, fz]);
      flowers.push({ x: fx, z: fz, mesh: fm, phase: seededRandom() * Math.PI * 2 });
    }
  }

  // Butterflies
  for (let i = 0; i < 20; i++) {
    const x = (seededRandom() - 0.5) * 60;
    const z = (seededRandom() - 0.5) * 60;
    const colors = [0xff44aa, 0xffaa00, 0x44aaff, 0xaaff44, 0xff88ff, 0xffdd44];
    const mesh = createSphere(0.12, colors[i % colors.length], [x, 2, z]);
    butterflies.push({
      x,
      z,
      y: 2,
      vx: (seededRandom() - 0.5) * 2,
      vz: (seededRandom() - 0.5) * 2,
      mesh,
      phase: seededRandom() * Math.PI * 2,
    });
  }

  // Clouds — more varied
  for (let i = 0; i < 14; i++) {
    const x = (seededRandom() - 0.5) * 300;
    const z = (seededRandom() - 0.5) * 300;
    const y = 25 + seededRandom() * 20;
    const mesh = createSphere(3 + seededRandom() * 5, 0xffffff, [x, y, z]);
    setScale(mesh, 2 + seededRandom() * 2, 0.4 + seededRandom() * 0.3, 1 + seededRandom());
    setMeshOpacity(mesh, 0.7 + seededRandom() * 0.3);
    clouds.push({ mesh, x, z, y, speed: 0.3 + seededRandom() * 1.2 });
  }

  // Spawn wildlife
  seed = 777;
  for (let i = 0; i < 20; i++) {
    const template = WILDLIFE[Math.floor(seededRandom() * WILDLIFE.length)];
    if (template.rare && seededRandom() > 0.25) continue; // Rare animals 25% chance
    const x = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const z = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const mesh = createAnimalMesh(template, x, z);
    const homeX = x,
      homeZ = z;
    animals.push({
      ...template,
      x,
      z,
      homeX,
      homeZ,
      mesh,
      state: 'idle',
      stateTimer: 2 + seededRandom() * 5,
      angle: seededRandom() * Math.PI * 2,
      wanderX: x,
      wanderZ: z,
      discovered: false,
      photographed: false,
      bobPhase: seededRandom() * Math.PI * 2,
    });
  }

  // Spawn collectibles
  seed = 999;
  for (let i = 0; i < MUSHROOM_COUNT + CRYSTAL_COUNT; i++) {
    const type = COLLECTIBLES[Math.floor(seededRandom() * COLLECTIBLES.length)];
    const x = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const z = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const mesh = createCollectibleMesh(type, x, z);
    collectibles.push({
      ...type,
      x,
      z,
      mesh,
      collected: false,
      bobPhase: seededRandom() * Math.PI * 2,
    });
    totalCollectibles++;
  }

  // Spawn Points of Interest
  seed = 555;
  const usedPOIs = new Set();
  for (let i = 0; i < POI_COUNT; i++) {
    let typeIdx;
    do {
      typeIdx = Math.floor(seededRandom() * POI_TYPES.length);
    } while (usedPOIs.has(typeIdx) && usedPOIs.size < POI_TYPES.length);
    usedPOIs.add(typeIdx);
    const type = POI_TYPES[typeIdx];
    const x = (seededRandom() - 0.5) * WORLD_SIZE * 1.2;
    const z = (seededRandom() - 0.5) * WORLD_SIZE * 1.2;
    createPOIMesh(type, x, z);
    pointsOfInterest.push({ ...type, x, z, discovered: false });
  }
}

async function loadModels() {
  try {
    loadingText = 'Loading Fox model...';
    loadingProgress = 0.6;
    models.fox = await loadModel(MODEL_URLS.fox, [5, 0, -5], 0.04);
    loadingProgress = 0.75;

    loadingText = 'Loading Duck model...';
    models.duck = await loadModel(MODEL_URLS.duck, [-10, -0.3, 5], 1.5);
    loadingProgress = 0.85;

    // Ducks in pond
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      await loadModel(
        MODEL_URLS.duck,
        [-10 + Math.cos(angle) * 3, -0.3, 5 + Math.sin(angle) * 3],
        1.0
      );
    }
    loadingProgress = 0.95;
    loadingText = 'World ready!';
  } catch (e) {
    console.warn('Model loading failed:', e);
    loadingText = 'Models unavailable — geometry world!';
    loadingProgress = 0.95;
  }
}

function addNotification(text, color) {
  notifications.push({ text, color: color || rgba8(200, 255, 200), timer: 4 });
}

export async function init() {
  clearScene();
  trees = [];
  rocks = [];
  butterflies = [];
  clouds = [];
  flowers = [];
  animals = [];
  collectibles = [];
  pointsOfInterest = [];
  particleSystems = [];
  campfireLights = [];
  playerPos = { x: 0, y: 1, z: 0 };
  playerAngle = 0;
  time = 0;
  score = 0;
  totalCollectibles = 0;
  photoMode = false;
  photoZoom = 1;
  photoFlash = 0;
  photos = [];
  notifications = [];
  journal = { creatures: new Set(), pois: new Set(), collectibles: new Set() };
  gameState = 'loading';
  loadingProgress = 0;
  weatherState = 'clear';
  weatherTimer = 30 + Math.random() * 60;
  windStrength = 0;
  models = {};

  // Atmosphere
  setAmbientLight(0xffeedd, 0.5);
  setLightDirection(0.5, -1, 0.3);
  setFog(0x88bbdd, 50, 150);
  enableBloom(0.35, 0.3, 0.5);
  enableVignette(0.8, 0.88);

  if (typeof createGradientSkybox === 'function') {
    createGradientSkybox(0x88ccee, 0x3366aa);
  }

  setCameraFOV(65);

  loadingText = 'Generating world...';
  loadingProgress = 0.1;

  // Delay a frame so loading screen shows
  await new Promise(r => setTimeout(r, 50));
  generateWorld();
  loadingProgress = 0.5;
  loadingText = 'Loading models...';

  floatingTexts = createFloatingTextSystem();

  // Minimap
  minimap = createMinimap({
    x: 640 - 95,
    y: 10,
    width: 85,
    height: 85,
    shape: 'circle',
    bgColor: rgba8(10, 20, 10, 180),
    worldW: WORLD_SIZE * 2,
    worldH: WORLD_SIZE * 2,
    player: { x: 0, y: 0, color: rgba8(255, 255, 100), blink: true },
    gridLines: 4,
    gridColor: rgba8(40, 80, 40, 60),
  });

  await loadModels();
  loadingProgress = 1;
  gameState = 'exploring';
}

// ── UPDATE ──
export function update(dt) {
  time += dt;

  if (gameState === 'loading') return;

  // Day/night cycle
  dayNightCycle += dt * 0.025;
  sunAngle = dayNightCycle;
  const daylight = Math.max(0.12, Math.cos(sunAngle) * 0.5 + 0.5);
  const nightTint = Math.max(0, 1 - daylight * 2);

  setAmbientLight(0xffeedd, daylight * 0.5 + 0.05);
  setLightDirection(Math.cos(sunAngle), -Math.abs(Math.cos(sunAngle)) - 0.3, 0.3);

  // Sky color shift with time of day
  if (typeof createGradientSkybox === 'function') {
    if (daylight > 0.6) {
      createGradientSkybox(0x88ccee, 0x3366aa);
    } else if (daylight > 0.3) {
      createGradientSkybox(0xdd8844, 0x663322);
      setFog(0xcc8855, 40, 130);
    } else {
      createGradientSkybox(0x112244, 0x000811);
      setFog(0x112233, 30, 100);
    }
  }
  if (daylight > 0.6) setFog(0x88bbdd, 50, 150);

  // Weather system
  weatherTimer -= dt;
  if (weatherTimer <= 0) {
    const r = Math.random();
    if (weatherState === 'clear') {
      weatherState = r > 0.5 ? 'cloudy' : 'rain';
      weatherTimer = 20 + Math.random() * 40;
      if (weatherState === 'rain') {
        addNotification('Rain begins to fall...', rgba8(100, 180, 255));
        rainParticles = createParticleSystem(200, {
          size: 0.05,
          color: 0x88bbee,
          emissive: 0x4488bb,
          emissiveIntensity: 0.5,
          gravity: -15,
          drag: 1,
          emitterX: playerPos.x,
          emitterY: 20,
          emitterZ: playerPos.z,
          emitRate: 50,
          minLife: 0.8,
          maxLife: 1.5,
          minSpeed: 8,
          maxSpeed: 15,
          spread: 1.5,
          minSize: 0.02,
          maxSize: 0.06,
          endColor: 0x224466,
        });
        particleSystems.push(rainParticles);
      }
    } else {
      if (weatherState === 'rain' && rainParticles) {
        removeParticleSystem(rainParticles);
        rainParticles = null;
        addNotification('The rain stops.', rgba8(200, 240, 200));
      }
      weatherState = 'clear';
      weatherTimer = 30 + Math.random() * 60;
    }
  }
  // Move rain to follow player
  if (rainParticles) {
    setParticleEmitter(rainParticles, { x: playerPos.x, z: playerPos.z });
  }

  // Wind
  windStrength = Math.sin(time * 0.2) * 0.5 + Math.sin(time * 0.07) * 0.3;

  // ── Player movement ──
  if (!photoMode) {
    const moveSpeed = key('ShiftLeft') || key('ShiftRight') ? 14 : 8;
    const turnSpeed = 2.5;

    if (key('ArrowLeft') || key('KeyA')) playerAngle += turnSpeed * dt;
    if (key('ArrowRight') || key('KeyD')) playerAngle -= turnSpeed * dt;

    if (key('ArrowUp') || key('KeyW')) {
      playerPos.x -= Math.sin(playerAngle) * moveSpeed * dt;
      playerPos.z -= Math.cos(playerAngle) * moveSpeed * dt;
    }
    if (key('ArrowDown') || key('KeyS')) {
      playerPos.x += Math.sin(playerAngle) * moveSpeed * dt * 0.5;
      playerPos.z += Math.cos(playerAngle) * moveSpeed * dt * 0.5;
    }
  }

  // Photo mode toggle
  if (keyp('KeyP') || keyp('KeyC')) {
    photoMode = !photoMode;
    photoZoom = 1;
    if (photoMode) addNotification('PHOTO MODE — Space to capture!', rgba8(255, 255, 150));
    else addNotification('Photo mode off', rgba8(180, 180, 180));
  }
  if (photoMode) {
    if (key('KeyQ')) photoZoom = Math.max(0.5, photoZoom - dt * 2);
    if (key('KeyE')) photoZoom = Math.min(3, photoZoom + dt * 2);
    setCameraFOV(65 / photoZoom);
    // Capture photo
    if (keyp('Space')) {
      photoFlash = 1;
      sfx('coin');
      // Check what's in view (nearest animal)
      let nearest = null,
        nearDist = 30;
      for (const a of animals) {
        const d = dist2D(
          a.x,
          a.z,
          playerPos.x - Math.sin(playerAngle) * 10,
          playerPos.z - Math.cos(playerAngle) * 10
        );
        if (d < nearDist) {
          nearest = a;
          nearDist = d;
        }
      }
      if (nearest && !nearest.photographed) {
        nearest.photographed = true;
        photos.push({ name: nearest.name, time: time });
        score += nearest.rare ? 100 : 30;
        addNotification(
          `Photographed: ${nearest.name}! +${nearest.rare ? 100 : 30}`,
          rgba8(255, 220, 100)
        );
        floatingTexts.spawn(`${nearest.name}!`, 320, 200, {
          color: rgba8(255, 220, 100),
          duration: 1.5,
          riseSpeed: 40,
        });
      } else if (nearest && nearest.photographed) {
        addNotification(`Already photographed ${nearest.name}`, rgba8(150, 150, 150));
      } else {
        addNotification('No wildlife in frame', rgba8(180, 120, 120));
      }
    }
  } else {
    setCameraFOV(65);
  }

  // ── Camera ── (smooth follow)
  const camDist = photoMode ? 6 : 12;
  const camHeight = photoMode ? 3 : 6;
  const goalX = playerPos.x + Math.sin(playerAngle) * camDist;
  const goalZ = playerPos.z + Math.cos(playerAngle) * camDist;
  const goalY = playerPos.y + camHeight;
  camPos.x += (goalX - camPos.x) * 4 * dt;
  camPos.y += (goalY - camPos.y) * 4 * dt;
  camPos.z += (goalZ - camPos.z) * 4 * dt;
  camTarget.x += (playerPos.x - camTarget.x) * 6 * dt;
  camTarget.y += (playerPos.y + 1 - camTarget.y) * 6 * dt;
  camTarget.z += (playerPos.z - camTarget.z) * 6 * dt;
  setCameraPosition(camPos.x, camPos.y, camPos.z);
  setCameraTarget(camTarget.x, camTarget.y, camTarget.z);

  // ── Collect nearby items ──
  for (const c of collectibles) {
    if (c.collected) continue;
    if (dist2D(playerPos.x, playerPos.z, c.x, c.z) < 2) {
      c.collected = true;
      removeMesh(c.mesh);
      score += c.points;
      sfx('coin');
      if (!journal.collectibles.has(c.name)) {
        journal.collectibles.add(c.name);
        addNotification(`NEW: ${c.name} discovered! +${c.points}`, rgba8(255, 220, 100));
      } else {
        addNotification(`${c.name} +${c.points}`, rgba8(200, 220, 200));
      }
      floatingTexts.spawn(`+${c.points}`, 320, 250, {
        color: rgba8(255, 220, 100),
        duration: 1,
        riseSpeed: 50,
      });
    }
    // Bob animation
    if (!c.collected) {
      c.bobPhase += dt * 2;
      setPosition(c.mesh, c.x, 0.3 + Math.sin(c.bobPhase) * 0.1, c.z);
    }
  }

  // ── Discover POIs ──
  for (const poi of pointsOfInterest) {
    if (poi.discovered) continue;
    if (dist2D(playerPos.x, playerPos.z, poi.x, poi.z) < 6) {
      poi.discovered = true;
      journal.pois.add(poi.name);
      score += 50;
      sfx('explosion');
      addNotification(`Discovered: ${poi.name}!`, rgba8(200, 255, 255));
      addNotification(poi.desc, rgba8(150, 200, 200));
      floatingTexts.spawn(poi.name, 320, 180, {
        color: rgba8(200, 255, 255),
        duration: 2.5,
        riseSpeed: 25,
      });
    }
  }

  // ── Wildlife AI ──
  for (const a of animals) {
    const distToPlayer = dist2D(playerPos.x, playerPos.z, a.x, a.z);

    // Discovery
    if (!a.discovered && distToPlayer < 15) {
      a.discovered = true;
      if (!journal.creatures.has(a.name)) {
        journal.creatures.add(a.name);
        score += a.rare ? 50 : 15;
        addNotification(
          `Spotted: ${a.name}${a.rare ? ' (RARE!)' : ''}`,
          a.rare ? rgba8(255, 200, 100) : rgba8(180, 255, 180)
        );
        floatingTexts.spawn(a.name, 320, 220, {
          color: a.rare ? rgba8(255, 200, 100) : rgba8(180, 255, 180),
          duration: 1.5,
          riseSpeed: 30,
        });
      }
    }

    a.stateTimer -= dt;
    switch (a.state) {
      case 'idle':
        if (a.flee > 0 && distToPlayer < a.flee) {
          a.state = 'flee';
          a.stateTimer = 2 + Math.random() * 2;
          break;
        }
        if (a.stateTimer <= 0) {
          a.state = 'wander';
          a.wanderX = a.homeX + (Math.random() - 0.5) * 20;
          a.wanderZ = a.homeZ + (Math.random() - 0.5) * 20;
          a.stateTimer = 3 + Math.random() * 4;
        }
        break;
      case 'wander': {
        const dx = a.wanderX - a.x,
          dz = a.wanderZ - a.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0.5) {
          a.angle = Math.atan2(dx, dz);
          a.x += (dx / d) * a.speed * 0.5 * dt;
          a.z += (dz / d) * a.speed * 0.5 * dt;
        }
        if (a.flee > 0 && distToPlayer < a.flee) {
          a.state = 'flee';
          a.stateTimer = 2 + Math.random() * 2;
          break;
        }
        if (a.stateTimer <= 0 || d < 0.5) {
          a.state = 'idle';
          a.stateTimer = 2 + Math.random() * 5;
        }
        break;
      }
      case 'flee': {
        const fleeAngle = Math.atan2(a.x - playerPos.x, a.z - playerPos.z);
        a.angle = fleeAngle;
        a.x += Math.sin(fleeAngle) * a.speed * dt;
        a.z += Math.cos(fleeAngle) * a.speed * dt;
        if (distToPlayer > a.flee * 2 || a.stateTimer <= 0) {
          a.state = 'idle';
          a.stateTimer = 3 + Math.random() * 3;
        }
        break;
      }
    }

    // Position mesh
    const bobY = a.shape === 'bird' ? 5 + Math.sin(a.bobPhase + time * 2) * 2 : 0;
    a.bobPhase += dt;
    setPosition(a.mesh, a.x, bobY, a.z);
    setRotation(a.mesh, 0, a.angle, 0);
  }

  // ── Animate butterflies ──
  for (const b of butterflies) {
    b.phase += dt * 3;
    b.x += b.vx * dt + windStrength * dt * 0.5;
    b.z += b.vz * dt;
    b.y = 1.5 + Math.sin(b.phase) * 1.5 + Math.sin(b.phase * 2.3) * 0.5;
    b.vx += (Math.random() - 0.5) * dt * 3;
    b.vz += (Math.random() - 0.5) * dt * 3;
    b.vx *= 0.99;
    b.vz *= 0.99;
    setPosition(b.mesh, b.x, b.y, b.z);
  }

  // ── Animate clouds ──
  for (const c of clouds) {
    c.x += (c.speed + windStrength * 0.3) * dt;
    if (c.x > 180) c.x = -180;
    setPosition(c.mesh, c.x, c.y, c.z);
  }

  // ── Flower sway ──
  for (const f of flowers) {
    f.phase += dt * 2;
    setPosition(f.mesh, f.x + Math.sin(f.phase + windStrength) * 0.03, 0.22, f.z);
  }

  // ── Campfire light flicker ──
  for (const cf of campfireLights) {
    const flicker = cf.base + Math.sin(time * 8 + cf.x) * 0.5 + Math.sin(time * 13) * 0.3;
    setPointLightColor(cf.light, 0xff6622, flicker, 12);
  }

  // ── GLB model animations ──
  if (models.fox) {
    const foxAngle = time * 0.5;
    const foxX = playerPos.x + Math.cos(foxAngle) * 8;
    const foxZ = playerPos.z + Math.sin(foxAngle) * 8;
    setPosition(models.fox, foxX, 0, foxZ);
    setRotation(models.fox, 0, -foxAngle + Math.PI / 2, 0);
  }
  if (typeof updateAnimations === 'function') updateAnimations(dt);

  // Update particles
  updateParticles(dt);

  // Update floating texts
  if (floatingTexts) floatingTexts.update(dt);

  // Photo flash decay
  if (photoFlash > 0) photoFlash -= dt * 4;

  // Update notifications
  for (let i = notifications.length - 1; i >= 0; i--) {
    notifications[i].timer -= dt;
    if (notifications[i].timer <= 0) notifications.splice(i, 1);
  }

  // Update minimap player position
  if (minimap) {
    minimap.player.x = playerPos.x + WORLD_SIZE;
    minimap.player.y = playerPos.z + WORLD_SIZE;

    // Entity dots
    const ents = [];
    for (const a of animals) {
      if (!a.discovered) continue;
      ents.push({
        x: a.x + WORLD_SIZE,
        y: a.z + WORLD_SIZE,
        color: a.rare ? rgba8(255, 200, 80) : rgba8(100, 255, 100),
        size: a.rare ? 3 : 2,
      });
    }
    for (const poi of pointsOfInterest) {
      ents.push({
        x: poi.x + WORLD_SIZE,
        y: poi.z + WORLD_SIZE,
        color: poi.discovered ? rgba8(100, 200, 255) : rgba8(80, 80, 80),
        size: 3,
      });
    }
    minimap.entities = ents;
  }
}

// ── DRAW ──
export function draw() {
  // ── Loading screen ──
  if (gameState === 'loading') {
    rectfill(0, 0, 640, 360, rgba8(15, 30, 20));
    drawGlowText('NATURE EXPLORER', 200, 60, rgba8(100, 220, 150), rgba8(50, 150, 80), 2);
    printCentered(
      'Discover Wildlife  *  Collect Specimens  *  Photograph Creatures',
      320,
      110,
      rgba8(120, 180, 140)
    );

    // Loading bar
    drawProgressBar(
      170,
      170,
      300,
      14,
      loadingProgress,
      rgba8(80, 200, 100),
      rgba8(30, 50, 30),
      rgba8(100, 160, 100)
    );
    printCentered(loadingText, 320, 195, rgba8(160, 220, 160));

    printCentered(
      'WASD — Move   |   Shift — Run   |   P — Photo Mode',
      320,
      250,
      rgba8(100, 150, 120)
    );
    printCentered('Explore, discover and collect everything!', 320, 270, rgba8(80, 120, 100));

    // Draw decorative leaves
    for (let i = 0; i < 6; i++) {
      const lx = 80 + i * 100 + Math.sin(time * 1.5 + i) * 10;
      const ly = 310 + Math.sin(time * 2 + i * 1.3) * 8;
      print('*', lx, ly, rgba8(80, 180, 100, 150));
    }
    return;
  }

  // ── Photo flash overlay ──
  if (photoFlash > 0) {
    const a = Math.min(255, Math.floor(photoFlash * 255));
    rectfill(0, 0, 640, 360, rgba8(255, 255, 255, a));
  }

  // ── Floating texts (3D spawned ones show as 2D) ──
  if (floatingTexts) {
    const texts = floatingTexts.getTexts();
    for (const t of texts) {
      const alpha = Math.min(255, Math.floor((t.remaining / t.duration) * 255));
      printCentered(t.text, Math.floor(t.x), Math.floor(t.y), t.color);
    }
  }

  // ── Photo mode viewfinder ──
  if (photoMode) {
    // Viewfinder frame
    rect(80, 40, 480, 280, rgba8(255, 255, 255, 100));
    rect(81, 41, 478, 278, rgba8(0, 0, 0, 80));
    // Crosshairs
    line(320, 40, 320, 320, rgba8(255, 255, 255, 60));
    line(80, 180, 560, 180, rgba8(255, 255, 255, 60));
    // Corner brackets
    const bl = 20;
    line(80, 40, 80 + bl, 40, rgba8(255, 255, 255, 200));
    line(80, 40, 80, 40 + bl, rgba8(255, 255, 255, 200));
    line(560, 40, 560 - bl, 40, rgba8(255, 255, 255, 200));
    line(560, 40, 560, 40 + bl, rgba8(255, 255, 255, 200));
    line(80, 320, 80 + bl, 320, rgba8(255, 255, 255, 200));
    line(80, 320, 80, 320 - bl, rgba8(255, 255, 255, 200));
    line(560, 320, 560 - bl, 320, rgba8(255, 255, 255, 200));
    line(560, 320, 560, 320 - bl, rgba8(255, 255, 255, 200));

    // Zoom indicator
    rectfill(90, 300, 100, 10, rgba8(0, 0, 0, 120));
    rectfill(90, 300, Math.floor(100 * ((photoZoom - 0.5) / 2.5)), 10, rgba8(255, 200, 80));
    print(`${photoZoom.toFixed(1)}x`, 195, 298, rgba8(255, 255, 255, 200));

    print('SPACE: Capture   Q/E: Zoom   P: Exit', 90, 330, rgba8(200, 200, 200, 180));

    // Photos taken count
    print(`Photos: ${photos.length}`, 460, 330, rgba8(255, 220, 100));

    return; // Don't draw normal HUD in photo mode
  }

  // ── HUD Panel ──
  const dayPct = Math.cos(sunAngle) * 0.5 + 0.5;
  const timeLabel =
    dayPct > 0.7 ? 'DAY' : dayPct > 0.4 ? 'AFTERNOON' : dayPct > 0.2 ? 'DUSK' : 'NIGHT';
  const weatherLabel =
    weatherState === 'rain' ? ' (Rain)' : weatherState === 'cloudy' ? ' (Cloudy)' : '';

  // Top-left info panel
  drawPixelBorder(8, 8, 195, 52, rgba8(80, 120, 80), rgba8(30, 50, 30));
  rectfill(10, 10, 191, 48, rgba8(10, 25, 15, 200));
  print(`NATURE EXPLORER`, 16, 15, rgba8(100, 220, 150));
  print(`${timeLabel}${weatherLabel}`, 16, 27, rgba8(150, 200, 150));
  print(`Score: ${score}`, 16, 39, rgba8(255, 220, 100));
  print(`Photos: ${photos.length}`, 110, 39, rgba8(200, 200, 255));

  // Journal summary — bottom left
  const jCreatures = journal.creatures.size;
  const jPois = journal.pois.size;
  const jCollect = journal.collectibles.size;
  const totalCreatures = WILDLIFE.length;
  const totalPois = POI_COUNT;
  const totalCollTypes = COLLECTIBLES.length;

  drawPixelBorder(8, 295, 160, 55, rgba8(80, 120, 80), rgba8(30, 50, 30));
  rectfill(10, 297, 156, 51, rgba8(10, 25, 15, 200));
  print('JOURNAL', 16, 302, rgba8(180, 220, 180));
  print(`Creatures: ${jCreatures}/${totalCreatures}`, 16, 314, rgba8(150, 255, 150));
  print(`Places: ${jPois}/${totalPois}`, 16, 326, rgba8(150, 200, 255));
  print(`Items: ${jCollect}/${totalCollTypes}`, 16, 338, rgba8(255, 220, 150));

  // ── Compass ── (top center)
  const cx = 320,
    cy = 20;
  rectfill(cx - 30, cy - 8, 60, 16, rgba8(0, 0, 0, 120));
  const compassAngle = playerAngle;
  const dirs = ['N', 'E', 'S', 'W'];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - compassAngle;
    const dx = Math.sin(a) * 24;
    if (Math.abs(dx) < 28) {
      const col = i === 0 ? rgba8(255, 100, 100) : rgba8(180, 180, 180);
      print(dirs[i], cx + dx - 3, cy - 4, col);
    }
  }

  // ── Nearby wildlife indicator ──
  let nearbyAnimal = null;
  let nearDist = 20;
  for (const a of animals) {
    const d = dist2D(playerPos.x, playerPos.z, a.x, a.z);
    if (d < nearDist) {
      nearbyAnimal = a;
      nearDist = d;
    }
  }
  if (nearbyAnimal && nearDist < 15) {
    const alpha = Math.floor(Math.max(0, 1 - nearDist / 15) * 200);
    const nameCol = nearbyAnimal.rare ? rgba8(255, 200, 80, alpha) : rgba8(200, 255, 200, alpha);
    printCentered(nearbyAnimal.name + (nearbyAnimal.rare ? ' (RARE)' : ''), 320, 70, nameCol);
    if (nearDist < 8) {
      printCentered(
        nearbyAnimal.photographed ? 'Already photographed' : 'P to enter Photo Mode',
        320,
        82,
        rgba8(180, 180, 180, alpha)
      );
    }
  }

  // ── Notifications ──
  for (let i = 0; i < notifications.length && i < 5; i++) {
    const n = notifications[i];
    const alpha = Math.min(255, Math.floor(n.timer * 200));
    const ny = 100 + i * 14;
    printCentered(n.text, 320, ny, n.color);
  }

  // ── Minimap ──
  if (minimap) drawMinimap(minimap, time);

  // ── Sprint indicator ──
  if (key('ShiftLeft') || key('ShiftRight')) {
    print('SPRINT', 300, 345, rgba8(255, 200, 100, 200));
  }

  // ── Completion check ──
  const totalDisc = jCreatures + jPois + jCollect;
  const totalPossible = totalCreatures + totalPois + totalCollTypes;
  if (totalDisc >= totalPossible) {
    drawGlowText('100% COMPLETE!', 220, 160, rgba8(255, 220, 100), rgba8(200, 150, 50), 2);
    printCentered('You discovered everything!', 320, 195, rgba8(255, 255, 200));
  }
}
