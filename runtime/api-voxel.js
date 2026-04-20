/**
 * Nova64 Voxel Engine API v2
 *
 * A production-quality voxel engine inspired by noa-engine / voxel.js:
 * - Block registry with extensible block definitions
 * - Proper Simplex noise (2D + 3D) with seeded permutation tables
 * - True 3D cave generation (worm tunnels, not 2D columns)
 * - Ore vein generation at depth-dependent layers
 * - Per-vertex ambient occlusion (smooth shadows)
 * - DDA voxel raycasting (never misses a block)
 * - Shared material (no per-chunk material leak)
 * - Configurable world generation (custom generators for carts)
 * - Chunk-based world management with dirty tracking
 */

import * as THREE from 'three';

// ─── Simplex Noise (seeded, 2D + 3D) ───────────────────────────────────────
// Based on Stefan Gustavson's simplex noise (public domain)

function createSimplexNoise(seed) {
  // Seeded pseudo-random shuffle for permutation table
  function seededRandom(s) {
    let x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  const perm = new Uint8Array(512);
  const grad3 = [
    [1, 1, 0],
    [-1, 1, 0],
    [1, -1, 0],
    [-1, -1, 0],
    [1, 0, 1],
    [-1, 0, 1],
    [1, 0, -1],
    [-1, 0, -1],
    [0, 1, 1],
    [0, -1, 1],
    [0, 1, -1],
    [0, -1, -1],
  ];

  // Build seeded permutation table
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function dot2(g, x, y) {
    return g[0] * x + g[1] * y;
  }
  function dot3(g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;

  function noise2D(xin, yin) {
    let n0, n1, n2;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * dot2(grad3[perm[ii + perm[jj]] % 12], x0, y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * dot2(grad3[perm[ii + i1 + perm[jj + j1]] % 12], x1, y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * dot2(grad3[perm[ii + 1 + perm[jj + 1]] % 12], x2, y2);
    }
    return 70.0 * (n0 + n1 + n2); // range approx [-1, 1]
  }

  function noise3D(xin, yin, zin) {
    let n0, n1, n2, n3;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      }
    }
    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * dot3(grad3[perm[ii + perm[jj + perm[kk]]] % 12], x0, y0, z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * dot3(grad3[perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12], x1, y1, z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * dot3(grad3[perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12], x2, y2, z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) {
      n3 = 0.0;
    } else {
      t3 *= t3;
      n3 = t3 * t3 * dot3(grad3[perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12], x3, y3, z3);
    }
    return 32.0 * (n0 + n1 + n2 + n3); // range approx [-1, 1]
  }

  // Multi-octave fractal noise (returns 0..1)
  function fbm2D(x, z, octaves = 4, persistence = 0.5, lacunarity = 2.0, scale = 0.01) {
    let total = 0;
    let frequency = scale;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += noise2D(x * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return (total / maxValue) * 0.5 + 0.5; // normalize to 0..1
  }

  function fbm3D(x, y, z, octaves = 4, persistence = 0.5, lacunarity = 2.0, scale = 0.01) {
    let total = 0;
    let frequency = scale;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return (total / maxValue) * 0.5 + 0.5; // normalize to 0..1
  }

  return { noise2D, noise3D, fbm2D, fbm3D };
}

// ─── Block Registry ─────────────────────────────────────────────────────────

function createBlockRegistry() {
  const blocks = [];

  // Block shapes: 'cube' (default), 'slab_bottom', 'slab_top', 'stair', 'cross', 'fence'
  // boundingBox: [minX, minY, minZ, maxX, maxY, maxZ] relative to block origin (0-1)
  const SHAPE_BBOXES = {
    cube: [0, 0, 0, 1, 1, 1],
    slab_bottom: [0, 0, 0, 1, 0.5, 1],
    slab_top: [0, 0.5, 0, 1, 1, 1],
    stair: [0, 0, 0, 1, 1, 1], // full bbox for collision, shape for rendering
    cross: [0.15, 0, 0.15, 0.85, 1, 0.85],
    fence: [0.375, 0, 0.375, 0.625, 1, 0.625],
  };

  function register(id, opts) {
    const shape = opts.shape || 'cube';
    blocks[id] = {
      id,
      name: opts.name || `block_${id}`,
      color: opts.color !== undefined ? opts.color : 0xff00ff,
      solid: opts.solid !== undefined ? opts.solid : true,
      transparent: opts.transparent || false,
      fluid: opts.fluid || false,
      lightEmit: opts.lightEmit || 0,
      lightBlock: opts.lightBlock !== undefined ? opts.lightBlock : shape !== 'cube' ? 0 : 15,
      // Texture atlas tile indices: { top, side, bottom } or single number for all faces
      textureFaces: opts.textureFaces || null,
      shape,
      boundingBox: opts.boundingBox || SHAPE_BBOXES[shape] || SHAPE_BBOXES.cube,
    };
  }

  function get(id) {
    return blocks[id] || blocks[0];
  }
  function isSolid(id) {
    const b = blocks[id];
    return b ? b.solid : false;
  }
  function isTransparent(id) {
    const b = blocks[id];
    return b ? b.transparent : false;
  }
  function isFluid(id) {
    const b = blocks[id];
    return b ? b.fluid : false;
  }
  function getColor(id) {
    const b = blocks[id];
    return b ? b.color : 0xff00ff;
  }
  function getShape(id) {
    const b = blocks[id];
    return b ? b.shape : 'cube';
  }
  function getBoundingBox(id) {
    const b = blocks[id];
    return b ? b.boundingBox : SHAPE_BBOXES.cube;
  }
  function isFullCube(id) {
    const b = blocks[id];
    return b ? b.shape === 'cube' : true;
  }
  function getTextureFace(id, faceIdx) {
    // faceIdx: 0=+Z, 1=-Z, 2=+X, 3=-X, 4=+Y(top), 5=-Y(bottom)
    const b = blocks[id];
    if (!b || !b.textureFaces) return -1;
    const tf = b.textureFaces;
    if (typeof tf === 'number') return tf;
    if (faceIdx === 4) return tf.top !== undefined ? tf.top : tf.side !== undefined ? tf.side : -1;
    if (faceIdx === 5)
      return tf.bottom !== undefined ? tf.bottom : tf.side !== undefined ? tf.side : -1;
    return tf.side !== undefined ? tf.side : -1;
  }

  // Register built-in blocks with texture tile indices
  // Tile layout (8 columns x 4 rows = 32 tiles):
  //  0=grass_top  1=grass_side  2=dirt  3=stone  4=sand  5=water  6=wood_side  7=wood_top
  //  8=leaves  9=cobblestone  10=planks  11=glass  12=brick  13=snow  14=ice  15=bedrock
  // 16=coal_ore  17=iron_ore  18=gold_ore  19=diamond_ore  20=gravel  21=clay  22=torch  23=glowstone
  // 24=lava  25=obsidian  26=mossy_cobble
  register(0, { name: 'air', color: 0x000000, solid: false, transparent: true, lightBlock: 0 });
  register(1, { name: 'grass', color: 0x55cc33, textureFaces: { top: 0, side: 1, bottom: 2 } });
  register(2, { name: 'dirt', color: 0x996644, textureFaces: 2 });
  register(3, { name: 'stone', color: 0xaaaaaa, textureFaces: 3 });
  register(4, { name: 'sand', color: 0xffdd88, textureFaces: 4 });
  register(5, {
    name: 'water',
    color: 0x2288dd,
    solid: false,
    transparent: true,
    fluid: true,
    lightBlock: 2,
    textureFaces: 5,
  });
  register(6, { name: 'wood', color: 0x774422, textureFaces: { top: 7, side: 6, bottom: 7 } });
  register(7, {
    name: 'leaves',
    color: 0x116622,
    transparent: true,
    lightBlock: 1,
    textureFaces: 8,
  });
  register(8, { name: 'cobblestone', color: 0x667788, textureFaces: 9 });
  register(9, { name: 'planks', color: 0xddaa55, textureFaces: 10 });
  register(10, {
    name: 'glass',
    color: 0xccffff,
    transparent: true,
    lightBlock: 0,
    textureFaces: 11,
  });
  register(11, { name: 'brick', color: 0xcc4433, textureFaces: 12 });
  register(12, { name: 'snow', color: 0xeeeeff, textureFaces: 13 });
  register(13, {
    name: 'ice',
    color: 0x99ddff,
    transparent: true,
    lightBlock: 1,
    textureFaces: 14,
  });
  register(14, { name: 'bedrock', color: 0x333333, textureFaces: 15 });
  register(15, { name: 'coal_ore', color: 0x444444, textureFaces: 16 });
  register(16, { name: 'iron_ore', color: 0xccaa88, textureFaces: 17 });
  register(17, { name: 'gold_ore', color: 0xffcc33, textureFaces: 18 });
  register(18, { name: 'diamond_ore', color: 0x44ffee, textureFaces: 19 });
  register(19, { name: 'gravel', color: 0x888888, textureFaces: 20 });
  register(20, { name: 'clay', color: 0xbbaa99, textureFaces: 21 });
  register(21, {
    name: 'torch',
    color: 0xffdd44,
    solid: false,
    transparent: true,
    lightEmit: 14,
    lightBlock: 0,
    textureFaces: 22,
  });
  register(22, { name: 'glowstone', color: 0xffeeaa, lightEmit: 15, textureFaces: 23 });
  register(23, {
    name: 'lava',
    color: 0xff4400,
    solid: false,
    fluid: true,
    lightEmit: 15,
    lightBlock: 0,
    textureFaces: 24,
  });
  register(24, { name: 'obsidian', color: 0x220033, textureFaces: 25 });
  register(25, { name: 'mossy_cobblestone', color: 0x668855, textureFaces: 26 });

  // ─── Shape Blocks ─────────────────────────────────────────────────
  register(26, { name: 'stone_slab', color: 0xaaaaaa, shape: 'slab_bottom', textureFaces: 3 });
  register(27, { name: 'stone_slab_top', color: 0xaaaaaa, shape: 'slab_top', textureFaces: 3 });
  register(28, { name: 'plank_slab', color: 0xbb8844, shape: 'slab_bottom', textureFaces: 10 });
  register(29, { name: 'stone_stair', color: 0xaaaaaa, shape: 'stair', textureFaces: 3 });
  register(30, { name: 'plank_stair', color: 0xbb8844, shape: 'stair', textureFaces: 10 });
  register(31, {
    name: 'fence',
    color: 0xbb8844,
    shape: 'fence',
    solid: true,
    transparent: true,
    lightBlock: 0,
    textureFaces: 10,
  });
  register(32, {
    name: 'flower',
    color: 0xff4488,
    shape: 'cross',
    solid: false,
    transparent: true,
    lightBlock: 0,
  });
  register(33, {
    name: 'tall_grass',
    color: 0x44bb44,
    shape: 'cross',
    solid: false,
    transparent: true,
    lightBlock: 0,
  });
  register(34, { name: 'brick_slab', color: 0xcc6644, shape: 'slab_bottom', textureFaces: 12 });
  register(35, { name: 'brick_stair', color: 0xcc6644, shape: 'stair', textureFaces: 12 });

  return {
    register,
    get,
    isSolid,
    isTransparent,
    isFluid,
    getColor,
    getTextureFace,
    getShape,
    getBoundingBox,
    isFullCube,
    blocks,
    SHAPE_BBOXES,
  };
}

// ─── Main Voxel API ─────────────────────────────────────────────────────────

export function voxelApi(gpu) {
  const registry = createBlockRegistry();

  // World configuration
  let CHUNK_SIZE = 16;
  let CHUNK_HEIGHT = 128;
  let RENDER_DISTANCE = 4;
  let SEA_LEVEL = 62;

  // Performance feature toggles (all on by default for full quality)
  let enableAO = true; // Ambient occlusion — 12 neighbor lookups per visible face
  let enableLighting = true; // Per-chunk BFS lighting propagation
  let enableCaves = true; // 3D noise cave carving in terrain gen
  let enableOres = true; // Ore vein generation in terrain gen
  let enableTrees = true; // Tree placement in terrain gen
  let enableShadows = true; // castShadow/receiveShadow on chunk meshes

  // LOD (Level of Detail) system
  let enableLOD = false;
  let lodDistances = [4, 8]; // LOD 0 up to 4 chunks, LOD 1 up to 8, beyond = unloaded

  // Block type constants (backward compatible)
  const BLOCK_TYPES = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    SAND: 4,
    WATER: 5,
    WOOD: 6,
    LEAVES: 7,
    COBBLESTONE: 8,
    PLANKS: 9,
    GLASS: 10,
    BRICK: 11,
    SNOW: 12,
    ICE: 13,
    BEDROCK: 14,
    COAL_ORE: 15,
    IRON_ORE: 16,
    GOLD_ORE: 17,
    DIAMOND_ORE: 18,
    GRAVEL: 19,
    CLAY: 20,
    TORCH: 21,
    GLOWSTONE: 22,
    LAVA: 23,
    OBSIDIAN: 24,
    MOSSY_COBBLESTONE: 25,
    // Shape blocks
    STONE_SLAB: 26,
    STONE_SLAB_TOP: 27,
    PLANK_SLAB: 28,
    STONE_STAIR: 29,
    PLANK_STAIR: 30,
    FENCE: 31,
    FLOWER: 32,
    TALL_GRASS: 33,
    BRICK_SLAB: 34,
    BRICK_STAIR: 35,
  };

  // World data
  const chunks = new Map();
  const chunkMeshes = new Map();
  let worldSeed = Math.floor(Math.random() * 50000);
  let noise = createSimplexNoise(worldSeed);

  // Shared materials (fix material leak — one material for all chunks)
  let sharedOpaqueMaterial = null;
  let sharedTransparentMaterial = null;
  let atlasTexture = null;
  let atlasEnabled = false;

  // ─── Texture Atlas System ──────────────────────────────────────────────
  // Procedurally generates a 16x16 pixel-art texture atlas on a canvas.
  // Each tile is TILE_PX × TILE_PX pixels, arranged in ATLAS_COLS columns.
  const TILE_PX = 16;
  const ATLAS_COLS = 8;
  const ATLAS_ROWS = 4;

  function seededRandom(seed) {
    let s = seed | 0;
    return function () {
      s = (s * 1664525 + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };
  }

  function hexToRgb(hex) {
    return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
  }

  function drawNoise(ctx, x, y, w, h, baseColor, variation, rng) {
    const [br, bg, bb] = hexToRgb(baseColor);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const v = (rng() - 0.5) * variation;
        const r = Math.max(0, Math.min(255, br + v));
        const g = Math.max(0, Math.min(255, bg + v));
        const b = Math.max(0, Math.min(255, bb + v));
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(x + px, y + py, 1, 1);
      }
    }
  }

  function drawTile(ctx, tileIdx, drawFn) {
    const tx = (tileIdx % ATLAS_COLS) * TILE_PX;
    const ty = Math.floor(tileIdx / ATLAS_COLS) * TILE_PX;
    drawFn(ctx, tx, ty, TILE_PX);
  }

  function generateProceduralAtlas() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_COLS * TILE_PX;
    canvas.height = ATLAS_ROWS * TILE_PX;
    const ctx = canvas.getContext('2d');
    const rng = seededRandom(42);

    // Tile 0: Grass top — green with subtle variation
    drawTile(ctx, 0, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x55cc33, 40, rng);
      // Occasional darker spots
      for (let i = 0; i < 6; i++) {
        const px = (x + rng() * s) | 0;
        const py = (y + rng() * s) | 0;
        c.fillStyle = '#3a8a22';
        c.fillRect(px, py, 1, 1);
      }
    });

    // Tile 1: Grass side — dirt bottom with grass strip on top
    drawTile(ctx, 1, (c, x, y, s) => {
      drawNoise(c, x, y + 4, s, s - 4, 0x996644, 30, rng);
      drawNoise(c, x, y, s, 4, 0x55cc33, 30, rng);
      // Edge pixels
      for (let px = 0; px < s; px++) {
        if (rng() > 0.5) {
          c.fillStyle = '#55cc33';
          c.fillRect(x + px, y + 4, 1, 1);
        }
      }
    });

    // Tile 2: Dirt
    drawTile(ctx, 2, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x996644, 35, rng);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = '#7a5533';
        c.fillRect((x + rng() * s) | 0, (y + rng() * s) | 0, 2, 1);
      }
    });

    // Tile 3: Stone — grey with cracks
    drawTile(ctx, 3, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0xaaaaaa, 25, rng);
      c.fillStyle = '#888888';
      for (let i = 0; i < 3; i++) {
        const sx = (x + rng() * (s - 4)) | 0;
        const sy = (y + rng() * (s - 2)) | 0;
        c.fillRect(sx, sy, (3 + rng() * 3) | 0, 1);
      }
    });

    // Tile 4: Sand
    drawTile(ctx, 4, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0xffdd88, 20, rng);
    });

    // Tile 5: Water — blue with wave highlights
    drawTile(ctx, 5, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x2288dd, 15, rng);
      c.fillStyle = 'rgba(180,220,255,0.3)';
      for (let i = 0; i < 3; i++) {
        c.fillRect((x + rng() * (s - 5)) | 0, (y + rng() * s) | 0, 4, 1);
      }
    });

    // Tile 6: Wood side — bark texture (vertical lines)
    drawTile(ctx, 6, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x774422, 20, rng);
      c.fillStyle = '#5e3518';
      for (let px = 0; px < s; px += 3 + ((rng() * 2) | 0)) {
        for (let py = 0; py < s; py++) {
          if (rng() > 0.3) c.fillRect(x + px, y + py, 1, 1);
        }
      }
    });

    // Tile 7: Wood top — rings
    drawTile(ctx, 7, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x997744, 15, rng);
      const cx = s / 2,
        cy = s / 2;
      for (let r = 2; r < 7; r += 2) {
        c.strokeStyle = '#664422';
        c.lineWidth = 0.5;
        c.beginPath();
        c.arc(x + cx, y + cy, r, 0, Math.PI * 2);
        c.stroke();
      }
    });

    // Tile 8: Leaves — scattered green
    drawTile(ctx, 8, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x116622, 30, rng);
      for (let i = 0; i < 12; i++) {
        c.fillStyle = rng() > 0.5 ? '#0d5518' : '#1a8833';
        c.fillRect((x + rng() * s) | 0, (y + rng() * s) | 0, 2, 2);
      }
    });

    // Tile 9: Cobblestone — varied grey stones
    drawTile(ctx, 9, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x667788, 30, rng);
      for (let i = 0; i < 6; i++) {
        const shade = (80 + rng() * 60) | 0;
        c.fillStyle = `rgb(${shade},${shade},${shade + 10})`;
        c.fillRect(
          (x + rng() * (s - 3)) | 0,
          (y + rng() * (s - 3)) | 0,
          (2 + rng() * 2) | 0,
          (2 + rng() * 2) | 0
        );
      }
    });

    // Tile 10: Planks — horizontal wood grain
    drawTile(ctx, 10, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0xddaa55, 15, rng);
      c.fillStyle = '#c89940';
      for (let py = 0; py < s; py += 4) {
        c.fillRect(x, y + py, s, 1);
      }
    });

    // Tile 11: Glass — mostly transparent with frame
    drawTile(ctx, 11, (c, x, y, s) => {
      c.fillStyle = 'rgba(200,240,255,0.3)';
      c.fillRect(x, y, s, s);
      c.fillStyle = '#99bbcc';
      c.fillRect(x, y, s, 1);
      c.fillRect(x, y + s - 1, s, 1);
      c.fillRect(x, y, 1, s);
      c.fillRect(x + s - 1, y, 1, s);
      c.fillRect(x + s / 2, y, 1, s);
      c.fillRect(x, y + s / 2, s, 1);
    });

    // Tile 12: Brick — red with mortar lines
    drawTile(ctx, 12, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0xcc4433, 20, rng);
      c.fillStyle = '#ccbbaa';
      for (let r = 0; r < s; r += 4) {
        c.fillRect(x, y + r, s, 1);
        const off = r % 8 === 0 ? 0 : s / 2;
        c.fillRect(x + off, y + r, 1, 4);
        c.fillRect(x + off + s / 2, y + r, 1, 4);
      }
    });

    // Tile 13: Snow
    drawTile(ctx, 13, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0xeeeeff, 8, rng);
    });

    // Tile 14: Ice — blue-white with cracks
    drawTile(ctx, 14, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x99ddff, 12, rng);
      c.fillStyle = '#bbeeFF';
      c.fillRect(x + 3, y + 2, 1, 8);
      c.fillRect(x + 10, y + 5, 1, 6);
    });

    // Tile 15: Bedrock — dark grey mottled
    drawTile(ctx, 15, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x333333, 30, rng);
    });

    // Tile 16-19: Ores (stone base with colored specks)
    const oreSpeckColors = ['#111', '#ddaa77', '#ffcc00', '#33ddcc'];
    for (let oi = 0; oi < 4; oi++) {
      drawTile(ctx, 16 + oi, (c, x, y, s) => {
        drawNoise(c, x, y, s, s, 0xaaaaaa, 25, rng);
        c.fillStyle = oreSpeckColors[oi];
        for (let i = 0; i < 5 + oi; i++) {
          c.fillRect((x + rng() * (s - 2)) | 0, (y + rng() * (s - 2)) | 0, 2, 2);
        }
      });
    }

    // Tile 20: Gravel
    drawTile(ctx, 20, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x888888, 40, rng);
    });

    // Tile 21: Clay
    drawTile(ctx, 21, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0xbbaa99, 15, rng);
    });

    // Tile 22: Torch — black background with yellow flame
    drawTile(ctx, 22, (c, x, y, s) => {
      c.fillStyle = '#1a1a1a';
      c.fillRect(x, y, s, s);
      c.fillStyle = '#774422';
      c.fillRect(x + 7, y + 6, 2, 10);
      c.fillStyle = '#ffdd44';
      c.fillRect(x + 6, y + 3, 4, 4);
      c.fillStyle = '#ffaa00';
      c.fillRect(x + 7, y + 2, 2, 2);
    });

    // Tile 23: Glowstone — warm yellow with cracks
    drawTile(ctx, 23, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0xffeeaa, 20, rng);
      c.fillStyle = '#ddcc66';
      c.fillRect(x + 4, y + 3, 8, 1);
      c.fillRect(x + 2, y + 9, 6, 1);
    });

    // Tile 24: Lava — orange-red with bright spots
    drawTile(ctx, 24, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0xff4400, 30, rng);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = '#ffaa33';
        c.fillRect((x + rng() * (s - 3)) | 0, (y + rng() * (s - 3)) | 0, 3, 2);
      }
    });

    // Tile 25: Obsidian — very dark purple
    drawTile(ctx, 25, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x220033, 12, rng);
    });

    // Tile 26: Mossy cobblestone
    drawTile(ctx, 26, (c, x, y, s) => {
      drawNoise(c, x, y, s, s, 0x667788, 25, rng);
      c.fillStyle = '#446633';
      for (let i = 0; i < 8; i++) {
        c.fillRect((x + rng() * s) | 0, (y + rng() * s) | 0, 2, 2);
      }
    });

    return canvas;
  }

  function buildAtlasTexture() {
    const canvas = generateProceduralAtlas();
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function enableTextureAtlas(enable = true) {
    atlasEnabled = enable;
    if (enable && !atlasTexture) {
      atlasTexture = buildAtlasTexture();
    }
    // Rebuild materials with/without atlas
    rebuildMaterials();
    // Sync to workers
    syncRegistryToWorkers();
    // Mark all chunks dirty so they re-mesh with new UVs
    for (const chunk of chunks.values()) {
      chunk.dirty = true;
    }
  }

  function loadCustomAtlas(imageSrc, tileMapping) {
    // imageSrc: URL or data URL to a texture atlas image
    // tileMapping: { blockName: { top, side, bottom } } overrides
    if (typeof document === 'undefined') return;
    const img = new Image();
    img.onload = () => {
      if (atlasTexture) atlasTexture.dispose();
      atlasTexture = new THREE.Texture(img);
      atlasTexture.magFilter = THREE.NearestFilter;
      atlasTexture.minFilter = THREE.NearestFilter;
      atlasTexture.wrapS = THREE.RepeatWrapping;
      atlasTexture.wrapT = THREE.RepeatWrapping;
      atlasTexture.colorSpace = THREE.SRGBColorSpace;
      atlasTexture.needsUpdate = true;
      atlasEnabled = true;
      // Apply custom tile mappings
      if (tileMapping) {
        for (const [name, faces] of Object.entries(tileMapping)) {
          const block = registry.blocks.find(b => b && b.name === name);
          if (block) block.textureFaces = faces;
        }
      }
      rebuildMaterials();
      for (const chunk of chunks.values()) chunk.dirty = true;
    };
    img.src = imageSrc;
  }

  function rebuildMaterials() {
    if (sharedOpaqueMaterial) sharedOpaqueMaterial.dispose();
    if (sharedTransparentMaterial) sharedTransparentMaterial.dispose();
    sharedOpaqueMaterial = null;
    sharedTransparentMaterial = null;
  }

  // Inject fract-based atlas tiling into MeshStandardMaterial
  // UV = block-space tiling coords (0→w, 0→h), UV2 = atlas tile origin
  const TILE_SIZE_U = 1.0 / ATLAS_COLS;
  const TILE_SIZE_V = 1.0 / ATLAS_ROWS;

  function injectAtlasTiling(material) {
    if (!atlasEnabled) return;
    material.onBeforeCompile = shader => {
      shader.uniforms.uTileSize = { value: new THREE.Vector2(TILE_SIZE_U, TILE_SIZE_V) };
      // Declare uv2 attribute (Three.js r152+ no longer auto-declares it)
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        'attribute vec2 uv2;\nvoid main() {'
      );
      // Override vMapUv to use uv2 (tile origin) + fract(uv) (tiling within tile)
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_MAP
          vMapUv = uv2 + fract(uv) * vec2(${TILE_SIZE_U.toFixed(8)}, ${TILE_SIZE_V.toFixed(8)});
        #endif`
      );
    };
  }

  function getOpaqueMaterial() {
    if (window.VOXEL_MATERIAL) return window.VOXEL_MATERIAL;
    if (!sharedOpaqueMaterial) {
      sharedOpaqueMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.8,
        metalness: 0.1,
        map: atlasEnabled && atlasTexture ? atlasTexture : null,
      });
      injectAtlasTiling(sharedOpaqueMaterial);
    }
    return sharedOpaqueMaterial;
  }

  function getTransparentMaterial() {
    if (!sharedTransparentMaterial) {
      sharedTransparentMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.6,
        metalness: 0.0,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
        map: atlasEnabled && atlasTexture ? atlasTexture : null,
      });
      injectAtlasTiling(sharedTransparentMaterial);
    }
    return sharedTransparentMaterial;
  }

  // Custom terrain generator (carts can override)
  let customTerrainGenerator = null;

  // ─── Async Meshing (Web Worker pool) ────────────────────────────────────

  let enableAsyncMeshing = false; // opt-in via configureWorld
  let meshWorkers = [];
  let meshWorkerBusy = []; // true if worker is currently processing a job
  let meshJobQueue = []; // pending mesh jobs
  let meshJobCallbacks = new Map(); // jobId → callback(result)
  let meshJobIdCounter = 0;
  let pendingAsyncMeshes = new Set(); // chunk keys with jobs in flight
  const MESH_WORKER_COUNT = 2; // pool size

  /**
   * Serialize block registry into flat lookup arrays for the worker.
   */
  function serializeRegistry() {
    const solidArr = new Uint8Array(256);
    const transparentArr = new Uint8Array(256);
    const fluidArr = new Uint8Array(256);
    const colorArr = new Uint32Array(256);
    const textureFaceArr = new Int8Array(256 * 6);
    textureFaceArr.fill(-1);

    for (let id = 0; id < 256; id++) {
      const def = registry.get(id);
      if (!def) continue;
      solidArr[id] = def.solid ? 1 : 0;
      transparentArr[id] = def.transparent ? 1 : 0;
      fluidArr[id] = def.fluid ? 1 : 0;
      colorArr[id] = def.color || 0;
      if (def.textureFaces) {
        for (let f = 0; f < 6; f++) {
          textureFaceArr[id * 6 + f] = def.textureFaces[f] !== undefined ? def.textureFaces[f] : -1;
        }
      }
    }
    return { solidArr, transparentArr, fluidArr, colorArr, textureFaceArr };
  }

  /**
   * Build padded arrays (CS+2 × CH × CS+2) from chunk + neighbor edges.
   * The 1-block border provides neighbor data for face culling, AO, and lighting.
   */
  function buildPaddedData(chunk) {
    const PW = CHUNK_SIZE + 2;
    const PD = CHUNK_SIZE + 2;
    const total = PW * PD * CHUNK_HEIGHT;
    const blocks = new Uint8Array(total);
    const sky = new Uint8Array(total);
    const blk = new Uint8Array(total);
    const fluid = new Uint8Array(total);

    // Copy main chunk data
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const pi = x + 1 + (z + 1) * PW + y * PW * PD;
          const ci = x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
          blocks[pi] = chunk.blocks[ci];
          sky[pi] = chunk.skyLight[ci];
          blk[pi] = chunk.blockLight[ci];
          fluid[pi] = chunk.fluidLevel[ci];
        }
      }
    }

    // Copy neighbor edges (±X, ±Z borders)
    const cx = chunk.chunkX,
      cz = chunk.chunkZ;

    // -X neighbor (column x=CHUNK_SIZE-1 → padded x=0)
    const nxn = getChunkIfExists(cx - 1, cz);
    if (nxn) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const pi = 0 + (z + 1) * PW + y * PW * PD;
          const ci = CHUNK_SIZE - 1 + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
          blocks[pi] = nxn.blocks[ci];
          sky[pi] = nxn.skyLight[ci];
          blk[pi] = nxn.blockLight[ci];
          fluid[pi] = nxn.fluidLevel[ci];
        }
      }
    }

    // +X neighbor (column x=0 → padded x=CHUNK_SIZE+1)
    const nxp = getChunkIfExists(cx + 1, cz);
    if (nxp) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const pi = CHUNK_SIZE + 1 + (z + 1) * PW + y * PW * PD;
          const ci = 0 + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
          blocks[pi] = nxp.blocks[ci];
          sky[pi] = nxp.skyLight[ci];
          blk[pi] = nxp.blockLight[ci];
          fluid[pi] = nxp.fluidLevel[ci];
        }
      }
    }

    // -Z neighbor (row z=CHUNK_SIZE-1 → padded z=0)
    const nzn = getChunkIfExists(cx, cz - 1);
    if (nzn) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const pi = x + 1 + 0 * PW + y * PW * PD;
          const ci = x + (CHUNK_SIZE - 1) * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
          blocks[pi] = nzn.blocks[ci];
          sky[pi] = nzn.skyLight[ci];
          blk[pi] = nzn.blockLight[ci];
          fluid[pi] = nzn.fluidLevel[ci];
        }
      }
    }

    // +Z neighbor (row z=0 → padded z=CHUNK_SIZE+1)
    const nzp = getChunkIfExists(cx, cz + 1);
    if (nzp) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const pi = x + 1 + (CHUNK_SIZE + 1) * PW + y * PW * PD;
          const ci = x + 0 * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
          blocks[pi] = nzp.blocks[ci];
          sky[pi] = nzp.skyLight[ci];
          blk[pi] = nzp.blockLight[ci];
          fluid[pi] = nzp.fluidLevel[ci];
        }
      }
    }

    // Corner columns (4 diagonal neighbors — only need 1 column each)
    const corners = [
      { dx: -1, dz: -1, px: 0, pz: 0, sx: CHUNK_SIZE - 1, sz: CHUNK_SIZE - 1 },
      { dx: 1, dz: -1, px: CHUNK_SIZE + 1, pz: 0, sx: 0, sz: CHUNK_SIZE - 1 },
      { dx: -1, dz: 1, px: 0, pz: CHUNK_SIZE + 1, sx: CHUNK_SIZE - 1, sz: 0 },
      { dx: 1, dz: 1, px: CHUNK_SIZE + 1, pz: CHUNK_SIZE + 1, sx: 0, sz: 0 },
    ];
    for (const c of corners) {
      const nc = getChunkIfExists(cx + c.dx, cz + c.dz);
      if (nc) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const pi = c.px + c.pz * PW + y * PW * PD;
          const ci = c.sx + c.sz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
          blocks[pi] = nc.blocks[ci];
          sky[pi] = nc.skyLight[ci];
          blk[pi] = nc.blockLight[ci];
          fluid[pi] = nc.fluidLevel[ci];
        }
      }
    }

    return { blocks, skyLight: sky, blockLight: blk, fluidLevel: fluid };
  }

  /**
   * Initialize the mesh worker pool.
   */
  function initMeshWorkers() {
    if (meshWorkers.length > 0) return; // already initialized
    if (typeof Worker === 'undefined') {
      enableAsyncMeshing = false;
      return;
    }
    try {
      const regData = serializeRegistry();
      for (let i = 0; i < MESH_WORKER_COUNT; i++) {
        const w = new Worker(new URL('./voxel-mesh-worker.js', import.meta.url), {
          type: 'module',
        });
        w.onmessage = function (e) {
          handleWorkerResult(i, e.data);
        };
        w.onerror = function (err) {
          console.warn('[Nova64] Mesh worker error, falling back to sync meshing:', err.message);
          enableAsyncMeshing = false;
        };
        // Send init with registry + config
        w.postMessage(
          {
            type: 'init',
            solidArr: regData.solidArr.buffer,
            transparentArr: regData.transparentArr.buffer,
            fluidArr: regData.fluidArr.buffer,
            colorArr: regData.colorArr.buffer,
            textureFaceArr: regData.textureFaceArr.buffer,
            CHUNK_SIZE,
            CHUNK_HEIGHT,
            ATLAS_COLS,
            ATLAS_ROWS,
            FLUID_MAX_LEVEL: 7,
          },
          [
            regData.solidArr.buffer,
            regData.transparentArr.buffer,
            regData.fluidArr.buffer,
            regData.colorArr.buffer,
            regData.textureFaceArr.buffer,
          ]
        );
        meshWorkers.push(w);
        meshWorkerBusy.push(false);
      }
    } catch (err) {
      console.warn('[Nova64] Failed to create mesh workers, using sync meshing:', err.message);
      enableAsyncMeshing = false;
    }
  }

  /**
   * Re-send updated registry to all workers (after registerBlock or atlas change).
   */
  function syncRegistryToWorkers() {
    if (meshWorkers.length === 0) return;
    const regData = serializeRegistry();
    for (const w of meshWorkers) {
      // Use non-transferable copy since we send to multiple workers
      w.postMessage({
        type: 'registry',
        solidArr: regData.solidArr.buffer.slice(0),
        transparentArr: regData.transparentArr.buffer.slice(0),
        fluidArr: regData.fluidArr.buffer.slice(0),
        colorArr: regData.colorArr.buffer.slice(0),
        textureFaceArr: regData.textureFaceArr.buffer.slice(0),
      });
    }
  }

  /**
   * Dispatch a mesh job to the next free worker, or queue it.
   */
  function dispatchMeshJob(chunk, callback) {
    const key = `${chunk.chunkX},${chunk.chunkZ}`;
    const jobId = ++meshJobIdCounter;
    const padded = buildPaddedData(chunk);

    const job = {
      type: 'mesh',
      jobId,
      chunkKey: key,
      blocks: padded.blocks,
      skyLight: padded.skyLight,
      blockLight: padded.blockLight,
      fluidLevel: padded.fluidLevel,
      baseX: chunk.chunkX * CHUNK_SIZE,
      baseZ: chunk.chunkZ * CHUNK_SIZE,
      enableAO,
      enableLighting,
      atlasEnabled,
      dayTimeFactor,
    };

    meshJobCallbacks.set(jobId, { callback, key });
    pendingAsyncMeshes.add(key);

    // Find a free worker
    for (let i = 0; i < meshWorkers.length; i++) {
      if (!meshWorkerBusy[i]) {
        meshWorkerBusy[i] = true;
        meshWorkers[i].postMessage(job, [
          padded.blocks.buffer,
          padded.skyLight.buffer,
          padded.blockLight.buffer,
          padded.fluidLevel.buffer,
        ]);
        return;
      }
    }
    // All workers busy — queue the job
    meshJobQueue.push({ job, padded });
  }

  /**
   * Handle worker result: build Three.js geometry on main thread.
   */
  function handleWorkerResult(workerIdx, result) {
    meshWorkerBusy[workerIdx] = false;

    // Process result
    if (result.type === 'result') {
      const entry = meshJobCallbacks.get(result.jobId);
      meshJobCallbacks.delete(result.jobId);
      if (entry) {
        pendingAsyncMeshes.delete(entry.key);
        applyMeshResult(entry.key, result);
      }
    }

    // Dispatch next queued job to this now-free worker
    while (meshJobQueue.length > 0) {
      const next = meshJobQueue.shift();
      const nextEntry = meshJobCallbacks.get(next.job.jobId);
      // Skip if chunk was unloaded or superseded
      if (!nextEntry || !pendingAsyncMeshes.has(nextEntry.key)) {
        meshJobCallbacks.delete(next.job.jobId);
        continue;
      }
      meshWorkerBusy[workerIdx] = true;
      meshWorkers[workerIdx].postMessage(next.job, [
        next.padded.blocks.buffer,
        next.padded.skyLight.buffer,
        next.padded.blockLight.buffer,
        next.padded.fluidLevel.buffer,
      ]);
      break;
    }
  }

  /**
   * Apply mesh result from worker — create Three.js BufferGeometry and add to scene.
   */
  function applyMeshResult(key, result) {
    // Remove old meshes
    if (chunkMeshes.has(key)) {
      const old = chunkMeshes.get(key);
      if (old.opaque) {
        gpu.scene.remove(old.opaque);
        old.opaque.geometry.dispose();
      }
      if (old.transparent) {
        gpu.scene.remove(old.transparent);
        old.transparent.geometry.dispose();
      }
      chunkMeshes.delete(key);
    }

    const entry = { opaque: null, transparent: null };

    if (result.hasOpaque && result.opaqueVerts) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(result.opaqueVerts, 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(result.opaqueNorms, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(result.opaqueColors, 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(result.opaqueUvs, 2));
      geom.setAttribute('uv2', new THREE.Float32BufferAttribute(result.opaqueUv2s, 2));
      geom.setIndex(new THREE.BufferAttribute(result.opaqueIdx, 1));
      geom.computeBoundingSphere();
      const mesh = new THREE.Mesh(geom, getOpaqueMaterial());
      mesh.castShadow = enableShadows;
      mesh.receiveShadow = enableShadows;
      gpu.scene.add(mesh);
      entry.opaque = mesh;
    }

    if (result.hasTrans && result.transVerts) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(result.transVerts, 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(result.transNorms, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(result.transColors, 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(result.transUvs, 2));
      geom.setAttribute('uv2', new THREE.Float32BufferAttribute(result.transUv2s, 2));
      geom.setIndex(new THREE.BufferAttribute(result.transIdx, 1));
      geom.computeBoundingSphere();
      const [cxStr, czStr] = key.split(',');
      const cx = Number(cxStr) * CHUNK_SIZE + CHUNK_SIZE / 2;
      const cy = CHUNK_HEIGHT / 2;
      const cz = Number(czStr) * CHUNK_SIZE + CHUNK_SIZE / 2;
      geom.translate(-cx, -cy, -cz);
      const mesh = new THREE.Mesh(geom, getTransparentMaterial());
      mesh.position.set(cx, cy, cz);
      mesh.castShadow = false;
      mesh.receiveShadow = enableShadows;
      mesh.renderOrder = 1;
      gpu.scene.add(mesh);
      entry.transparent = mesh;
    }

    if (entry.opaque || entry.transparent) {
      chunkMeshes.set(key, entry);
    }
  }

  /**
   * Terminate all mesh workers (called on resetWorld).
   */
  function terminateMeshWorkers() {
    for (const w of meshWorkers) w.terminate();
    meshWorkers = [];
    meshWorkerBusy = [];
    meshJobQueue = [];
    meshJobCallbacks.clear();
    pendingAsyncMeshes.clear();
    meshJobIdCounter = 0;
  }

  // ─── Chunk class ────────────────────────────────────────────────────────

  class Chunk {
    constructor(chunkX, chunkZ) {
      this.chunkX = chunkX;
      this.chunkZ = chunkZ;
      this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
      this.skyLight = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
      this.blockLight = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
      this.fluidLevel = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE); // 0-7 (0=empty, 7=source)
      this.dirty = true;
      this.lightDirty = true;
    }

    getBlock(x, y, z) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
        return BLOCK_TYPES.AIR;
      }
      return this.blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
    }

    setBlock(x, y, z, blockType) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
        return;
      }
      this.blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = blockType;
      this.dirty = true;
      this.lightDirty = true;
    }

    getSkyLight(x, y, z) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE)
        return 15;
      return this.skyLight[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
    }

    getBlockLight(x, y, z) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE)
        return 0;
      return this.blockLight[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
    }

    getFluidLevel(x, y, z) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE)
        return 0;
      return this.fluidLevel[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
    }

    setFluidLevel(x, y, z, level) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE)
        return;
      this.fluidLevel[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = level;
    }
  }

  function getChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    if (!chunks.has(key)) {
      const chunk = new Chunk(chunkX, chunkZ);
      if (customTerrainGenerator) {
        customTerrainGenerator(chunk, {
          BLOCK_TYPES,
          noise,
          CHUNK_SIZE,
          CHUNK_HEIGHT,
          SEA_LEVEL,
          worldSeed,
        });
      } else {
        generateChunkTerrain(chunk);
      }
      chunks.set(key, chunk);
    }
    return chunks.get(key);
  }

  function getChunkIfExists(chunkX, chunkZ) {
    return chunks.get(`${chunkX},${chunkZ}`) || null;
  }

  // ─── Terrain Generation ─────────────────────────────────────────────────

  function generateChunkTerrain(chunk) {
    const baseX = chunk.chunkX * CHUNK_SIZE;
    const baseZ = chunk.chunkZ * CHUNK_SIZE;
    const pendingTrees = [];

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = baseX + x;
        const worldZ = baseZ + z;

        // Biome selection via temperature + moisture (simplex fbm)
        const temperature = noise.fbm2D(worldX + worldSeed, worldZ + worldSeed, 2, 0.5, 2.0, 0.005);
        const moisture = noise.fbm2D(
          worldX + 1000 + worldSeed,
          worldZ + 1000 + worldSeed,
          2,
          0.5,
          2.0,
          0.003
        );

        let heightScale = 20;
        let heightBase = 64;
        let surfaceBlock = BLOCK_TYPES.GRASS;
        let subBlock = BLOCK_TYPES.DIRT;
        let treeChance = 0;
        let treeType = 'oak'; // oak, birch, spruce, jungle, acacia

        if (temperature < 0.2) {
          surfaceBlock = BLOCK_TYPES.SNOW;
          subBlock = BLOCK_TYPES.ICE;
          heightScale = 6;
          heightBase = 65;
          treeChance = 0;
          treeType = 'spruce';
        } else if (temperature < 0.35 && moisture > 0.5) {
          surfaceBlock = BLOCK_TYPES.COBBLESTONE;
          subBlock = BLOCK_TYPES.STONE;
          heightScale = 18;
          heightBase = 66;
          treeChance = 0.06;
          treeType = 'spruce';
        } else if (temperature > 0.7 && moisture < 0.25) {
          surfaceBlock = BLOCK_TYPES.SAND;
          subBlock = BLOCK_TYPES.SAND;
          heightScale = 4;
          heightBase = 63;
          treeChance = 0;
          treeType = 'acacia';
        } else if (temperature > 0.6 && moisture > 0.6) {
          surfaceBlock = BLOCK_TYPES.LEAVES;
          subBlock = BLOCK_TYPES.DIRT;
          heightScale = 22;
          heightBase = 58;
          treeChance = 0.15;
          treeType = 'jungle';
        } else if (moisture < 0.3) {
          surfaceBlock = BLOCK_TYPES.DIRT;
          subBlock = BLOCK_TYPES.SAND;
          heightScale = 5;
          heightBase = 65;
          treeChance = 0.005;
          treeType = 'acacia';
        } else if (temperature > 0.4 && moisture > 0.4) {
          surfaceBlock = BLOCK_TYPES.GRASS;
          subBlock = BLOCK_TYPES.DIRT;
          heightScale = 14;
          heightBase = 64;
          treeChance = 0.08;
          treeType = 'birch';
        } else if (temperature < 0.35) {
          surfaceBlock = BLOCK_TYPES.SNOW;
          subBlock = BLOCK_TYPES.STONE;
          heightScale = 35;
          heightBase = 62;
          treeChance = 0.02;
          treeType = 'spruce';
        } else {
          surfaceBlock = BLOCK_TYPES.GRASS;
          subBlock = BLOCK_TYPES.DIRT;
          heightScale = 6;
          heightBase = 64;
          treeChance = 0.015;
          treeType = 'oak';
        }

        const height = Math.floor(
          noise.fbm2D(worldX, worldZ, 4, 0.5, 2.0, 0.01) * heightScale + heightBase
        );

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y === 0) {
            chunk.setBlock(x, y, z, BLOCK_TYPES.BEDROCK);
          } else if (y < height - 3) {
            // Stone with ore generation
            let block = BLOCK_TYPES.STONE;

            if (enableOres) {
              // Ore veins using 3D noise at different scales per ore type
              if (y < 16) {
                const dOre = noise.fbm3D(worldX, y, worldZ, 2, 0.5, 2.0, 0.15);
                if (dOre > 0.78) block = BLOCK_TYPES.DIAMOND_ORE;
              }
              if (y < 32 && block === BLOCK_TYPES.STONE) {
                const gOre = noise.fbm3D(worldX + 500, y, worldZ + 500, 2, 0.5, 2.0, 0.12);
                if (gOre > 0.76) block = BLOCK_TYPES.GOLD_ORE;
              }
              if (y < 64 && block === BLOCK_TYPES.STONE) {
                const iOre = noise.fbm3D(worldX + 1000, y, worldZ + 1000, 2, 0.5, 2.0, 0.1);
                if (iOre > 0.73) block = BLOCK_TYPES.IRON_ORE;
              }
              if (block === BLOCK_TYPES.STONE) {
                const cOre = noise.fbm3D(worldX + 2000, y, worldZ + 2000, 2, 0.5, 2.0, 0.08);
                if (cOre > 0.72) block = BLOCK_TYPES.COAL_ORE;
              }
              // Gravel pockets
              if (block === BLOCK_TYPES.STONE && y < 40) {
                const grav = noise.fbm3D(worldX + 3000, y, worldZ + 3000, 1, 0.5, 2.0, 0.06);
                if (grav > 0.8) block = BLOCK_TYPES.GRAVEL;
              }
            }

            chunk.setBlock(x, y, z, block);
          } else if (y < height - 1) {
            chunk.setBlock(x, y, z, subBlock);
          } else if (y === height - 1) {
            chunk.setBlock(x, y, z, surfaceBlock);
          } else if (y < SEA_LEVEL && y >= height) {
            chunk.setBlock(x, y, z, BLOCK_TYPES.WATER);
            chunk.setFluidLevel(x, y, z, FLUID_MAX_LEVEL); // terrain water = source level
          }

          // 3D cave generation using proper 3D simplex noise
          if (enableCaves && y > 0 && y < height - 5) {
            // Primary cave network — winding tunnels
            const cave1 = noise.fbm3D(worldX, y, worldZ, 3, 0.5, 2.0, 0.04);
            // Secondary smaller caves
            const cave2 = noise.fbm3D(worldX + 7777, y + 7777, worldZ + 7777, 2, 0.5, 2.0, 0.08);

            // Carve cave if noise is in a narrow band (creates tunnel shapes)
            const caveThreshold1 = Math.abs(cave1 - 0.5) < 0.04;
            const caveThreshold2 = Math.abs(cave2 - 0.5) < 0.03;

            if (caveThreshold1 || caveThreshold2) {
              // Don't carve through bedrock
              if (y > 1) {
                chunk.setBlock(x, y, z, BLOCK_TYPES.AIR);
              }
            }

            // Lava pools at very low levels
            if (y <= 10 && (caveThreshold1 || caveThreshold2)) {
              if (y <= 5 && chunk.getBlock(x, y, z) === BLOCK_TYPES.AIR) {
                chunk.setBlock(x, y, z, BLOCK_TYPES.LAVA);
                chunk.setFluidLevel(x, y, z, FLUID_MAX_LEVEL);
              }
            }
          }
        }

        // Clay near water
        if (height <= SEA_LEVEL + 2 && height >= SEA_LEVEL - 3) {
          for (let cy = Math.max(1, height - 4); cy < height - 1; cy++) {
            const clayNoise = noise.fbm3D(worldX + 5000, cy, worldZ + 5000, 1, 0.5, 2.0, 0.1);
            if (clayNoise > 0.7 && chunk.getBlock(x, cy, z) === BLOCK_TYPES.STONE) {
              chunk.setBlock(x, cy, z, BLOCK_TYPES.CLAY);
            }
          }
        }

        // Tree placement
        if (enableTrees && height > SEA_LEVEL && treeChance > 0) {
          const treeSeed = noise.noise2D(worldX * 0.7, worldZ * 0.7);
          const treeRoll = (treeSeed + 1.0) * 0.5; // normalize to 0..1
          if (treeRoll < treeChance && x > 2 && x < CHUNK_SIZE - 3 && z > 2 && z < CHUNK_SIZE - 3) {
            pendingTrees.push({ x, y: height, z, type: treeType });
          }
        }
      }
    }

    // Place trees after terrain is filled — variety per biome
    for (const t of pendingTrees) {
      const hash = noise.noise2D(t.x * 7.1 + baseX, t.z * 13.3 + baseZ);
      const absHash = Math.abs(hash);

      const setIfAir = (bx, by, bz, block) => {
        if (
          bx >= 0 &&
          bx < CHUNK_SIZE &&
          bz >= 0 &&
          bz < CHUNK_SIZE &&
          by >= 0 &&
          by < CHUNK_HEIGHT
        ) {
          if (chunk.getBlock(bx, by, bz) === BLOCK_TYPES.AIR) {
            chunk.setBlock(bx, by, bz, block);
          }
        }
      };

      if (t.type === 'spruce') {
        // Tall narrow conifer — taiga/snowy biomes
        const trunkH = 6 + Math.floor(absHash * 4);
        for (let i = 0; i < trunkH; i++) chunk.setBlock(t.x, t.y + i, t.z, BLOCK_TYPES.WOOD);
        // Conical leaf layers (widest at bottom, narrowing to top)
        for (let layer = 0; layer < trunkH - 2; layer++) {
          const ly = t.y + 2 + layer;
          const r = Math.max(1, Math.floor((trunkH - 2 - layer) / 2));
          for (let dx = -r; dx <= r; dx++) {
            for (let dz = -r; dz <= r; dz++) {
              if (dx === 0 && dz === 0) continue;
              if (Math.abs(dx) + Math.abs(dz) <= r + 1) {
                setIfAir(t.x + dx, ly, t.z + dz, BLOCK_TYPES.LEAVES);
              }
            }
          }
        }
        // Top point
        setIfAir(t.x, t.y + trunkH, t.z, BLOCK_TYPES.LEAVES);
        setIfAir(t.x, t.y + trunkH + 1, t.z, BLOCK_TYPES.LEAVES);
      } else if (t.type === 'birch') {
        // Medium tree with birch-like trunk — temperate forests
        const trunkH = 5 + Math.floor(absHash * 2);
        for (let i = 0; i < trunkH; i++) chunk.setBlock(t.x, t.y + i, t.z, BLOCK_TYPES.WOOD);
        // Round leaf canopy
        const leafY = t.y + trunkH;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -1; dy <= 2; dy++) {
            for (let dz = -2; dz <= 2; dz++) {
              const dist = dx * dx + dy * dy + dz * dz;
              if (dist <= 5) {
                setIfAir(t.x + dx, leafY + dy, t.z + dz, BLOCK_TYPES.LEAVES);
              }
            }
          }
        }
      } else if (t.type === 'jungle') {
        // Very tall trunk with wide canopy at top
        const trunkH = 8 + Math.floor(absHash * 6);
        for (let i = 0; i < trunkH; i++) chunk.setBlock(t.x, t.y + i, t.z, BLOCK_TYPES.WOOD);
        // Buttress roots (thick base)
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx !== 0 || dz !== 0) {
              if (Math.abs(dx) + Math.abs(dz) < 2) {
                chunk.setBlock(t.x + dx, t.y, t.z + dz, BLOCK_TYPES.WOOD);
                chunk.setBlock(t.x + dx, t.y + 1, t.z + dz, BLOCK_TYPES.WOOD);
              }
            }
          }
        }
        // Wide canopy
        const leafY = t.y + trunkH;
        for (let dx = -3; dx <= 3; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            for (let dz = -3; dz <= 3; dz++) {
              const dist = dx * dx + dy * dy * 2 + dz * dz;
              if (dist <= 12) {
                setIfAir(t.x + dx, leafY + dy, t.z + dz, BLOCK_TYPES.LEAVES);
              }
            }
          }
        }
      } else if (t.type === 'acacia') {
        // Bent trunk with flat wide canopy — savanna style
        const trunkH = 4 + Math.floor(absHash * 3);
        const bendDir = hash > 0 ? 1 : -1;
        let tx = t.x;
        for (let i = 0; i < trunkH; i++) {
          chunk.setBlock(tx, t.y + i, t.z, BLOCK_TYPES.WOOD);
          if (i === Math.floor(trunkH / 2)) tx += bendDir; // trunk bends
        }
        // Flat wide leaf canopy (shallow, wide disc)
        const leafY = t.y + trunkH;
        for (let dx = -3; dx <= 3; dx++) {
          for (let dz = -3; dz <= 3; dz++) {
            if (dx * dx + dz * dz <= 10) {
              setIfAir(tx + dx, leafY, t.z + dz, BLOCK_TYPES.LEAVES);
              setIfAir(tx + dx, leafY + 1, t.z + dz, BLOCK_TYPES.LEAVES);
            }
          }
        }
      } else {
        // Default oak — classic round tree
        const trunkH = 4 + Math.floor(absHash * 3);
        for (let i = 0; i < trunkH; i++) chunk.setBlock(t.x, t.y + i, t.z, BLOCK_TYPES.WOOD);
        const leafY = t.y + trunkH;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            for (let dz = -2; dz <= 2; dz++) {
              if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 4) {
                setIfAir(t.x + dx, leafY + dy, t.z + dz, BLOCK_TYPES.LEAVES);
              }
            }
          }
        }
      }
    }
  }

  // ─── Lighting System ────────────────────────────────────────────────────
  // BFS flood-fill light propagation: sky light (from above) + block light (from emitters)

  const MAX_LIGHT = 15;
  let dayTimeFactor = 1.0; // 1.0 = full day, 0.0 = night

  function propagateLighting(chunk) {
    const { skyLight, blockLight } = chunk;
    skyLight.fill(0);
    blockLight.fill(0);

    const idx = (x, y, z) => x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;

    // Phase 1: Sky light — propagate straight down from top, track max height per column
    let maxTerrainY = 0;
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        let light = MAX_LIGHT;
        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          const block = chunk.getBlock(x, y, z);
          const def = registry.get(block);
          if (def.solid && !def.transparent) {
            light = 0;
            if (y > maxTerrainY) maxTerrainY = y;
          } else {
            light = Math.max(0, light - def.lightBlock);
          }
          skyLight[idx(x, y, z)] = light;
        }
      }
    }

    // Phase 2: Sky light horizontal BFS spread
    // Only scan up to maxTerrainY + 2 instead of full CHUNK_HEIGHT — huge speedup
    const scanHeight = Math.min(CHUNK_HEIGHT, maxTerrainY + 2);
    const dirs = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    const queue = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let y = 0; y < scanHeight; y++) {
          if (skyLight[idx(x, y, z)] > 1) {
            queue.push(x, y, z);
          }
        }
      }
    }

    let qi = 0;
    while (qi < queue.length) {
      const qx = queue[qi++],
        qy = queue[qi++],
        qz = queue[qi++];
      const currentLight = skyLight[idx(qx, qy, qz)];

      for (const [ddx, ddy, ddz] of dirs) {
        const nx = qx + ddx,
          ny = qy + ddy,
          nz = qz + ddz;
        if (
          nx < 0 ||
          nx >= CHUNK_SIZE ||
          ny < 0 ||
          ny >= CHUNK_HEIGHT ||
          nz < 0 ||
          nz >= CHUNK_SIZE
        )
          continue;

        const nBlock = chunk.getBlock(nx, ny, nz);
        const nDef = registry.get(nBlock);
        if (nDef.solid && !nDef.transparent) continue;

        const nIdx = idx(nx, ny, nz);
        const newLight = currentLight - Math.max(1, nDef.lightBlock);
        if (newLight > skyLight[nIdx]) {
          skyLight[nIdx] = newLight;
          queue.push(nx, ny, nz);
        }
      }
    }

    // Phase 3: Block light from emitters (torches, glowstone, lava)
    // Only scan below terrain height — emitters can't exist in air
    queue.length = 0;
    qi = 0;
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let y = 0; y < scanHeight; y++) {
          const block = chunk.getBlock(x, y, z);
          const def = registry.get(block);
          if (def.lightEmit > 0) {
            blockLight[idx(x, y, z)] = def.lightEmit;
            queue.push(x, y, z);
          }
        }
      }
    }

    qi = 0;
    while (qi < queue.length) {
      const qx = queue[qi++],
        qy = queue[qi++],
        qz = queue[qi++];
      const currentLight = blockLight[idx(qx, qy, qz)];

      for (const [ddx, ddy, ddz] of dirs) {
        const nx = qx + ddx,
          ny = qy + ddy,
          nz = qz + ddz;
        if (
          nx < 0 ||
          nx >= CHUNK_SIZE ||
          ny < 0 ||
          ny >= CHUNK_HEIGHT ||
          nz < 0 ||
          nz >= CHUNK_SIZE
        )
          continue;

        const nBlock = chunk.getBlock(nx, ny, nz);
        const nDef = registry.get(nBlock);
        if (nDef.solid && !nDef.transparent) continue;

        const nIdx = idx(nx, ny, nz);
        const newLight = currentLight - Math.max(1, nDef.lightBlock);
        if (newLight > blockLight[nIdx]) {
          blockLight[nIdx] = newLight;
          queue.push(nx, ny, nz);
        }
      }
    }

    chunk.lightDirty = false;
  }

  // Sample effective light level at a position (max of sky*dayTime and block light)
  function sampleLight(chunk, x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return MAX_LIGHT;

    if (x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE) {
      const sky = chunk.getSkyLight(x, y, z) * dayTimeFactor;
      const block = chunk.getBlockLight(x, y, z);
      return Math.max(sky, block);
    }

    // Cross-chunk sampling
    const ncx = chunk.chunkX + Math.floor(x / CHUNK_SIZE);
    const ncz = chunk.chunkZ + Math.floor(z / CHUNK_SIZE);
    const nc = getChunkIfExists(ncx, ncz);
    if (!nc) return MAX_LIGHT;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const sky = nc.getSkyLight(lx, y, lz) * dayTimeFactor;
    const block = nc.getBlockLight(lx, y, lz);
    return Math.max(sky, block);
  }

  // ─── AO helpers ─────────────────────────────────────────────────────────

  // Get whether a block at the given local/cross-chunk position is opaque for AO
  function isBlockOpaqueForAO(chunk, x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;

    if (x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE) {
      const id = chunk.getBlock(x, y, z);
      return registry.isSolid(id) && !registry.isTransparent(id);
    }
    // Cross-chunk: check neighbor
    const ncx = chunk.chunkX + Math.floor(x / CHUNK_SIZE);
    const ncz = chunk.chunkZ + Math.floor(z / CHUNK_SIZE);
    const nc = getChunkIfExists(ncx, ncz);
    if (!nc) return false;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const id = nc.getBlock(lx, y, lz);
    return registry.isSolid(id) && !registry.isTransparent(id);
  }

  // Compute AO value for a vertex of a face. side1, side2, corner are booleans.
  // Returns 0 (darkest) to 3 (brightest)
  function vertexAO(side1, side2, corner) {
    if (side1 && side2) return 0;
    return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0);
  }

  // ─── Meshing (Greedy) ─────────────────────────────────────────────────
  // True greedy meshing: for each face direction, sweep slices and merge
  // rectangles of identical face data (block type + AO + light) into single quads.
  // Produces 5-10× fewer vertices than naive per-face meshing.

  // AO to color multiplier (0=0.4, 1=0.6, 2=0.8, 3=1.0)
  const aoScale = [0.4, 0.6, 0.8, 1.0];

  // Per-vertex AO sampling offsets for each of the 6 face directions.
  // Each face has 4 corners, each corner samples 3 neighbor positions: side1, side2, corner.
  const aoOffsets = [
    // +Z face: vertices at z+1 plane
    [
      [
        [-1, 0, 1],
        [0, -1, 1],
        [-1, -1, 1],
      ],
      [
        [1, 0, 1],
        [0, -1, 1],
        [1, -1, 1],
      ],
      [
        [1, 0, 1],
        [0, 1, 1],
        [1, 1, 1],
      ],
      [
        [-1, 0, 1],
        [0, 1, 1],
        [-1, 1, 1],
      ],
    ],
    // -Z face
    [
      [
        [1, 0, -1],
        [0, -1, -1],
        [1, -1, -1],
      ],
      [
        [-1, 0, -1],
        [0, -1, -1],
        [-1, -1, -1],
      ],
      [
        [-1, 0, -1],
        [0, 1, -1],
        [-1, 1, -1],
      ],
      [
        [1, 0, -1],
        [0, 1, -1],
        [1, 1, -1],
      ],
    ],
    // +X face
    [
      [
        [1, 0, 1],
        [1, -1, 0],
        [1, -1, 1],
      ],
      [
        [1, 0, -1],
        [1, -1, 0],
        [1, -1, -1],
      ],
      [
        [1, 0, -1],
        [1, 1, 0],
        [1, 1, -1],
      ],
      [
        [1, 0, 1],
        [1, 1, 0],
        [1, 1, 1],
      ],
    ],
    // -X face
    [
      [
        [-1, 0, -1],
        [-1, -1, 0],
        [-1, -1, -1],
      ],
      [
        [-1, 0, 1],
        [-1, -1, 0],
        [-1, -1, 1],
      ],
      [
        [-1, 0, 1],
        [-1, 1, 0],
        [-1, 1, 1],
      ],
      [
        [-1, 0, -1],
        [-1, 1, 0],
        [-1, 1, -1],
      ],
    ],
    // +Y face
    [
      [
        [-1, 1, 0],
        [0, 1, 1],
        [-1, 1, 1],
      ],
      [
        [1, 1, 0],
        [0, 1, 1],
        [1, 1, 1],
      ],
      [
        [1, 1, 0],
        [0, 1, -1],
        [1, 1, -1],
      ],
      [
        [-1, 1, 0],
        [0, 1, -1],
        [-1, 1, -1],
      ],
    ],
    // -Y face
    [
      [
        [-1, -1, 0],
        [0, -1, -1],
        [-1, -1, -1],
      ],
      [
        [1, -1, 0],
        [0, -1, -1],
        [1, -1, -1],
      ],
      [
        [1, -1, 0],
        [0, -1, 1],
        [1, -1, 1],
      ],
      [
        [-1, -1, 0],
        [0, -1, 1],
        [-1, -1, 1],
      ],
    ],
  ];

  // 6 face directions: [axis, sign, u-axis, v-axis]
  // axis: 0=X, 1=Y, 2=Z. sign: +1 or -1.
  // u,v: the two axes spanning the face plane
  const FACE_DIRS = [
    { axis: 2, sign: 1, u: 0, v: 1 }, // +Z
    { axis: 2, sign: -1, u: 0, v: 1 }, // -Z
    { axis: 0, sign: 1, u: 2, v: 1 }, // +X
    { axis: 0, sign: -1, u: 2, v: 1 }, // -X
    { axis: 1, sign: 1, u: 0, v: 2 }, // +Y
    { axis: 1, sign: -1, u: 0, v: 2 }, // -Y
  ];

  // Pre-computed face normal vectors
  const FACE_NORMALS = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ];

  // Size of each axis (u,v dimensions per face direction)
  function axisSize(a) {
    return a === 1 ? CHUNK_HEIGHT : CHUNK_SIZE;
  }

  // Pre-allocated buffers for greedy mesher (avoid per-face TypedArray allocations)
  const MAX_MASK = 128 * 16; // CHUNK_HEIGHT * CHUNK_SIZE (max possible mask size)
  const _mask = new Int32Array(MAX_MASK);
  const _maskTrans = new Uint8Array(MAX_MASK);
  const _maskFluidLvl = new Uint8Array(MAX_MASK); // fluid level for top-face Y offset
  const _tmpColor = new THREE.Color();

  function getNeighborBlock(chunk, x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return BLOCK_TYPES.AIR;
    if (x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE) {
      return chunk.getBlock(x, y, z);
    }
    const ncx = chunk.chunkX + Math.floor(x / CHUNK_SIZE);
    const ncz = chunk.chunkZ + Math.floor(z / CHUNK_SIZE);
    const nc = getChunkIfExists(ncx, ncz);
    if (!nc) return BLOCK_TYPES.AIR;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return nc.getBlock(lx, y, lz);
  }

  function createChunkMesh(chunk) {
    const opaqueVerts = [];
    const opaqueNorms = [];
    const opaqueColors = [];
    const opaqueUvs = [];
    const opaqueUv2s = [];
    const opaqueIdx = [];
    let opaqueVCount = 0;

    const transVerts = [];
    const transNorms = [];
    const transColors = [];
    const transUvs = [];
    const transUv2s = [];
    const transIdx = [];
    let transVCount = 0;

    const baseX = chunk.chunkX * CHUNK_SIZE;
    const baseZ = chunk.chunkZ * CHUNK_SIZE;

    // For each face direction, sweep slices and greedily merge
    for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
      const { axis, sign, u: uAxis, v: vAxis } = FACE_DIRS[faceIdx];
      const normal = FACE_NORMALS[faceIdx];

      const sliceMax = axisSize(axis);
      const uMax = axisSize(uAxis);
      const vMax = axisSize(vAxis);

      // Mask: for each (u,v) in the slice, store face key or 0
      // Face key encodes: blockType (8 bits) + ao[0..3] (2 bits each = 8 bits) + light (4 bits) = 20 bits
      // Plus a separate array for isTransparent
      // Reuse pre-allocated buffers (cleared per slice)
      const maskSize = uMax * vMax;

      for (let d = 0; d < sliceMax; d++) {
        // Build mask for this slice — clear reused buffers
        let hasFaces = false;
        for (let i = 0; i < maskSize; i++) {
          _mask[i] = 0;
          _maskTrans[i] = 0;
          _maskFluidLvl[i] = 0;
        }
        for (let vi = 0; vi < vMax; vi++) {
          for (let ui = 0; ui < uMax; ui++) {
            // Map (axis=d, u=ui, v=vi) to (x,y,z) without array allocation
            let x = 0,
              y = 0,
              z = 0;
            if (axis === 0) x = d;
            else if (axis === 1) y = d;
            else z = d;
            if (uAxis === 0) x = ui;
            else if (uAxis === 1) y = ui;
            else z = ui;
            if (vAxis === 0) x = vi;
            else if (vAxis === 1) y = vi;
            else z = vi;

            const blockType = chunk.getBlock(x, y, z);
            const mIdx = ui + vi * uMax;

            if (blockType === BLOCK_TYPES.AIR) {
              _mask[mIdx] = 0;
              _maskTrans[mIdx] = 0;
              continue;
            }

            // Neighbor in face direction
            const nx = x + normal[0],
              ny = y + normal[1],
              nz = z + normal[2];
            const neighborId = getNeighborBlock(chunk, nx, ny, nz);

            const blockIsTransparent = registry.isTransparent(blockType);
            let showFace = false;

            if (blockIsTransparent) {
              if (neighborId === blockType) {
                showFace = false;
              } else if (registry.isSolid(neighborId) && !registry.isTransparent(neighborId)) {
                showFace = false;
              } else {
                showFace = true;
              }
            } else {
              // Non-cube shapes don't occlude neighbors (treat like transparent for face culling)
              showFace =
                !registry.isSolid(neighborId) ||
                registry.isTransparent(neighborId) ||
                !registry.isFullCube(neighborId);
            }

            if (!showFace) {
              _mask[mIdx] = 0;
              _maskTrans[mIdx] = 0;
              continue;
            }

            // Non-cube shapes skip greedy merge — custom geometry emitted later
            if (!registry.isFullCube(blockType)) {
              _mask[mIdx] = 0;
              _maskTrans[mIdx] = 0;
              continue;
            }

            // Compute AO for the 4 corners of this face
            let aoKey = 0;
            if (enableAO) {
              const aoOff = aoOffsets[faceIdx];
              for (let ci = 0; ci < 4; ci++) {
                const s1 = isBlockOpaqueForAO(
                  chunk,
                  x + aoOff[ci][0][0],
                  y + aoOff[ci][0][1],
                  z + aoOff[ci][0][2]
                );
                const s2 = isBlockOpaqueForAO(
                  chunk,
                  x + aoOff[ci][1][0],
                  y + aoOff[ci][1][1],
                  z + aoOff[ci][1][2]
                );
                const cn = isBlockOpaqueForAO(
                  chunk,
                  x + aoOff[ci][2][0],
                  y + aoOff[ci][2][1],
                  z + aoOff[ci][2][2]
                );
                const a = vertexAO(s1, s2, cn);
                aoKey |= a << (ci * 2);
              }
            } else {
              aoKey = 0xff; // all corners = 3 (brightest), no shadows
            }

            // Sample light
            const faceLight = enableLighting
              ? Math.round(sampleLight(chunk, nx, ny, nz))
              : MAX_LIGHT;

            // Pack face key: blockType | (aoKey << 8) | (faceLight << 16)
            _mask[mIdx] =
              (blockType & 0xff) | ((aoKey & 0xff) << 8) | ((faceLight & 0xf) << 16) | (1 << 24);
            _maskTrans[mIdx] = blockIsTransparent ? 1 : 0;
            // Store fluid level for top face Y offset (faceIdx 4 = +Y)
            if (registry.isFluid(blockType)) {
              _maskFluidLvl[mIdx] = chunk.getFluidLevel(x, y, z) || FLUID_MAX_LEVEL;
            }
            hasFaces = true;
          }
        }

        if (!hasFaces) continue;

        // Greedy merge: scan the mask for maximal rectangles
        for (let vi = 0; vi < vMax; vi++) {
          for (let ui = 0; ui < uMax; ) {
            const mIdx = ui + vi * uMax;
            const key = _mask[mIdx];
            if (key === 0) {
              ui++;
              continue;
            }
            const trans = _maskTrans[mIdx];
            const fluidLvl = _maskFluidLvl[mIdx];

            // Extend width (greedy merge — works with atlas via fract-based UV tiling)
            let w = 1;
            while (
              ui + w < uMax &&
              _mask[ui + w + vi * uMax] === key &&
              _maskTrans[ui + w + vi * uMax] === trans &&
              _maskFluidLvl[ui + w + vi * uMax] === fluidLvl
            ) {
              w++;
            }

            // Extend height
            let h = 1;
            {
              let canExtend = true;
              while (canExtend && vi + h < vMax) {
                for (let wu = 0; wu < w; wu++) {
                  const ci = ui + wu + (vi + h) * uMax;
                  if (
                    _mask[ci] !== key ||
                    _maskTrans[ci] !== trans ||
                    _maskFluidLvl[ci] !== fluidLvl
                  ) {
                    canExtend = false;
                    break;
                  }
                }
                if (canExtend) h++;
              }
            }

            // Clear merged region from mask
            for (let dv = 0; dv < h; dv++) {
              for (let du = 0; du < w; du++) {
                _mask[ui + du + (vi + dv) * uMax] = 0;
              }
            }

            // Decode face key
            const blockType = key & 0xff;
            const aoKey = (key >> 8) & 0xff;
            const faceLight = (key >> 16) & 0xf;
            const ao0 = aoKey & 3,
              ao1 = (aoKey >> 2) & 3,
              ao2 = (aoKey >> 4) & 3,
              ao3 = (aoKey >> 6) & 3;

            const lightBrightness = 0.05 + (faceLight / MAX_LIGHT) * 0.95;
            const blockColor = registry.getColor(blockType);

            // Build quad vertices: 4 corners of the merged rectangle
            // The face sits at d (or d+1 for positive normals) along the axis
            const slicePos = sign > 0 ? d + 1 : d;

            // Compute corner positions directly without array allocations
            // Corner (cAxis, cU, cV) → (x, y, z) mapping
            // c0 = (slicePos, ui, vi)
            // c1 = (slicePos, ui+w, vi)
            // c2 = (slicePos, ui+w, vi+h)
            // c3 = (slicePos, ui, vi+h)
            let c0x = 0,
              c0y = 0,
              c0z = 0;
            let c1x = 0,
              c1y = 0,
              c1z = 0;
            let c2x = 0,
              c2y = 0,
              c2z = 0;
            let c3x = 0,
              c3y = 0,
              c3z = 0;

            // Set axis coordinate
            if (axis === 0) {
              c0x = slicePos;
              c1x = slicePos;
              c2x = slicePos;
              c3x = slicePos;
            } else if (axis === 1) {
              c0y = slicePos;
              c1y = slicePos;
              c2y = slicePos;
              c3y = slicePos;
            } else {
              c0z = slicePos;
              c1z = slicePos;
              c2z = slicePos;
              c3z = slicePos;
            }
            // Set u coordinate
            if (uAxis === 0) {
              c0x = ui;
              c1x = ui + w;
              c2x = ui + w;
              c3x = ui;
            } else if (uAxis === 1) {
              c0y = ui;
              c1y = ui + w;
              c2y = ui + w;
              c3y = ui;
            } else {
              c0z = ui;
              c1z = ui + w;
              c2z = ui + w;
              c3z = ui;
            }
            // Set v coordinate
            if (vAxis === 0) {
              c0x = vi;
              c1x = vi;
              c2x = vi + h;
              c3x = vi + h;
            } else if (vAxis === 1) {
              c0y = vi;
              c1y = vi;
              c2y = vi + h;
              c3y = vi + h;
            } else {
              c0z = vi;
              c1z = vi;
              c2z = vi + h;
              c3z = vi + h;
            }

            // Correct winding order based on face direction
            let v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z;
            let a0, a1, a2, a3;
            if (
              faceIdx === 0 || // +Z
              faceIdx === 3 || // -X
              faceIdx === 5 // -Y
            ) {
              v0x = c0x;
              v0y = c0y;
              v0z = c0z;
              v1x = c1x;
              v1y = c1y;
              v1z = c1z;
              v2x = c2x;
              v2y = c2y;
              v2z = c2z;
              v3x = c3x;
              v3y = c3y;
              v3z = c3z;
              a0 = ao0;
              a1 = ao1;
              a2 = ao2;
              a3 = ao3;
            } else {
              v0x = c1x;
              v0y = c1y;
              v0z = c1z;
              v1x = c0x;
              v1y = c0y;
              v1z = c0z;
              v2x = c3x;
              v2y = c3y;
              v2z = c3z;
              v3x = c2x;
              v3y = c2y;
              v3z = c2z;
              a0 = ao1;
              a1 = ao0;
              a2 = ao3;
              a3 = ao2;
            }

            const isTransparent = trans === 1;
            const verts = isTransparent ? transVerts : opaqueVerts;
            const norms = isTransparent ? transNorms : opaqueNorms;
            const cols = isTransparent ? transColors : opaqueColors;
            const uvArr = isTransparent ? transUvs : opaqueUvs;
            const uv2Arr = isTransparent ? transUv2s : opaqueUv2s;
            const idxArr = isTransparent ? transIdx : opaqueIdx;
            let vCount = isTransparent ? transVCount : opaqueVCount;

            // Push 4 vertices without intermediate arrays
            const vxArr = [v0x, v1x, v2x, v3x];
            const vyArr = [v0y, v1y, v2y, v3y];
            const vzArr = [v0z, v1z, v2z, v3z];
            const aoArr = [a0, a1, a2, a3];
            // Fluid top face Y offset: lower Y based on fluid level (7=full, 1=thin)
            const fluidYOff =
              faceIdx === 4 && fluidLvl > 0 && fluidLvl < FLUID_MAX_LEVEL
                ? -(1.0 - fluidLvl / FLUID_MAX_LEVEL) * 0.875
                : 0;
            for (let ci = 0; ci < 4; ci++) {
              verts.push(vxArr[ci] + baseX, vyArr[ci] + fluidYOff, vzArr[ci] + baseZ);
              norms.push(normal[0], normal[1], normal[2]);
              const aoLight = aoScale[aoArr[ci]] * lightBrightness;
              if (atlasEnabled) {
                cols.push(aoLight, aoLight, aoLight);
              } else {
                _tmpColor.set(blockColor);
                cols.push(_tmpColor.r * aoLight, _tmpColor.g * aoLight, _tmpColor.b * aoLight);
              }
            }

            // UV coordinates: block-space tiling (0→w, 0→h)
            // When atlas enabled, uv2 stores tile origin; the shader uses fract(uv) to tile within the tile
            uvArr.push(0, h, w, h, w, 0, 0, 0);
            if (atlasEnabled) {
              const tileIdx = registry.getTextureFace(blockType, faceIdx);
              const tileU = tileIdx >= 0 ? (tileIdx % ATLAS_COLS) / ATLAS_COLS : 0;
              const tileV =
                tileIdx >= 0 ? 1.0 - (Math.floor(tileIdx / ATLAS_COLS) + 1) / ATLAS_ROWS : 0;
              uv2Arr.push(tileU, tileV, tileU, tileV, tileU, tileV, tileU, tileV);
            } else {
              uv2Arr.push(0, 0, 0, 0, 0, 0, 0, 0);
            }

            // AO-aware triangulation
            if (a0 + a2 > a1 + a3) {
              idxArr.push(vCount, vCount + 1, vCount + 2);
              idxArr.push(vCount, vCount + 2, vCount + 3);
            } else {
              idxArr.push(vCount + 1, vCount + 2, vCount + 3);
              idxArr.push(vCount + 1, vCount + 3, vCount);
            }

            if (isTransparent) {
              transVCount += 4;
            } else {
              opaqueVCount += 4;
            }

            ui += w;
          }
        }
      }
    }

    // ─── Emit custom geometry for non-cube shape blocks ─────────────────
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const blockType = chunk.getBlock(x, y, z);
          if (blockType === 0) continue;
          const shape = registry.getShape(blockType);
          if (shape === 'cube') continue;
          const isTransparent = registry.isTransparent(blockType);
          const verts = isTransparent ? transVerts : opaqueVerts;
          const norms = isTransparent ? transNorms : opaqueNorms;
          const cols = isTransparent ? transColors : opaqueColors;
          const uvArr = isTransparent ? transUvs : opaqueUvs;
          const uv2Arr = isTransparent ? transUv2s : opaqueUv2s;
          const idxArr = isTransparent ? transIdx : opaqueIdx;
          let vCount = isTransparent ? transVCount : opaqueVCount;

          const blockColor = registry.getColor(blockType);
          _tmpColor.set(blockColor);
          const cr = _tmpColor.r,
            cg = _tmpColor.g,
            cb = _tmpColor.b;
          const wx = x + baseX,
            wz = z + baseZ;

          // Atlas tile info
          let tileU = 0,
            tileV = 0;
          if (atlasEnabled) {
            const tileIdx = registry.getTextureFace(blockType, 2); // use side face tile
            if (tileIdx >= 0) {
              tileU = (tileIdx % ATLAS_COLS) / ATLAS_COLS;
              tileV = 1.0 - (Math.floor(tileIdx / ATLAS_COLS) + 1) / ATLAS_ROWS;
            }
          }

          // Helper: emit a single quad (2 triangles, 4 vertices)
          const emitQuad = (x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, nx, ny, nz) => {
            verts.push(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3);
            for (let i = 0; i < 4; i++) norms.push(nx, ny, nz);
            if (atlasEnabled) {
              for (let i = 0; i < 4; i++) cols.push(1, 1, 1);
            } else {
              for (let i = 0; i < 4; i++) cols.push(cr, cg, cb);
            }
            uvArr.push(0, 1, 1, 1, 1, 0, 0, 0);
            uv2Arr.push(tileU, tileV, tileU, tileV, tileU, tileV, tileU, tileV);
            idxArr.push(vCount, vCount + 1, vCount + 2, vCount, vCount + 2, vCount + 3);
            vCount += 4;
          };

          // Helper: emit a box from min to max (6 faces)
          const emitBox = (mnx, mny, mnz, mxx, mxy, mxz) => {
            const ax = mnx + wx,
              ay = mny,
              az = mnz + wz;
            const bx = mxx + wx,
              by = mxy,
              bz = mxz + wz;
            // +Z face
            emitQuad(ax, ay, bz, bx, ay, bz, bx, by, bz, ax, by, bz, 0, 0, 1);
            // -Z face
            emitQuad(bx, ay, az, ax, ay, az, ax, by, az, bx, by, az, 0, 0, -1);
            // +X face
            emitQuad(bx, ay, bz, bx, ay, az, bx, by, az, bx, by, bz, 1, 0, 0);
            // -X face
            emitQuad(ax, ay, az, ax, ay, bz, ax, by, bz, ax, by, az, -1, 0, 0);
            // +Y face
            emitQuad(ax, by, bz, bx, by, bz, bx, by, az, ax, by, az, 0, 1, 0);
            // -Y face
            emitQuad(ax, ay, az, bx, ay, az, bx, ay, bz, ax, ay, bz, 0, -1, 0);
          };

          if (shape === 'slab_bottom') {
            emitBox(x, y, z, x + 1, y + 0.5, z + 1);
          } else if (shape === 'slab_top') {
            emitBox(x, y + 0.5, z, x + 1, y + 1, z + 1);
          } else if (shape === 'stair') {
            // Bottom slab (full width) + back upper half
            emitBox(x, y, z, x + 1, y + 0.5, z + 1);
            emitBox(x, y + 0.5, z + 0.5, x + 1, y + 1, z + 1);
          } else if (shape === 'fence') {
            // Thin centered post
            emitBox(x + 0.375, y, z + 0.375, x + 0.625, y + 1, z + 0.625);
          } else if (shape === 'cross') {
            // Two intersecting diagonal quads (like flowers/tall grass)
            const ax0 = x + wx,
              az0 = z + wz;
            // Diagonal 1: corner to corner
            emitQuad(
              ax0,
              y,
              az0,
              ax0 + 1,
              y,
              az0 + 1,
              ax0 + 1,
              y + 1,
              az0 + 1,
              ax0,
              y + 1,
              az0,
              0.707,
              0,
              0.707
            );
            // Back face
            emitQuad(
              ax0 + 1,
              y,
              az0 + 1,
              ax0,
              y,
              az0,
              ax0,
              y + 1,
              az0,
              ax0 + 1,
              y + 1,
              az0 + 1,
              -0.707,
              0,
              -0.707
            );
            // Diagonal 2: other corner pair
            emitQuad(
              ax0 + 1,
              y,
              az0,
              ax0,
              y,
              az0 + 1,
              ax0,
              y + 1,
              az0 + 1,
              ax0 + 1,
              y + 1,
              az0,
              -0.707,
              0,
              0.707
            );
            // Back face
            emitQuad(
              ax0,
              y,
              az0 + 1,
              ax0 + 1,
              y,
              az0,
              ax0 + 1,
              y + 1,
              az0,
              ax0,
              y + 1,
              az0 + 1,
              0.707,
              0,
              -0.707
            );
          }

          if (isTransparent) {
            transVCount = vCount;
          } else {
            opaqueVCount = vCount;
          }
        }
      }
    }

    // Build opaque geometry
    let opaqueGeometry = null;
    if (opaqueVerts.length > 0) {
      opaqueGeometry = new THREE.BufferGeometry();
      opaqueGeometry.setAttribute('position', new THREE.Float32BufferAttribute(opaqueVerts, 3));
      opaqueGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(opaqueNorms, 3));
      opaqueGeometry.setAttribute('color', new THREE.Float32BufferAttribute(opaqueColors, 3));
      opaqueGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(opaqueUvs, 2));
      opaqueGeometry.setAttribute('uv2', new THREE.Float32BufferAttribute(opaqueUv2s, 2));
      opaqueGeometry.setIndex(opaqueIdx);
      opaqueGeometry.computeBoundingSphere();
    }

    // Build transparent geometry
    let transGeometry = null;
    if (transVerts.length > 0) {
      transGeometry = new THREE.BufferGeometry();
      transGeometry.setAttribute('position', new THREE.Float32BufferAttribute(transVerts, 3));
      transGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(transNorms, 3));
      transGeometry.setAttribute('color', new THREE.Float32BufferAttribute(transColors, 3));
      transGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(transUvs, 2));
      transGeometry.setAttribute('uv2', new THREE.Float32BufferAttribute(transUv2s, 2));
      transGeometry.setIndex(transIdx);
      transGeometry.computeBoundingSphere();
    }

    return { opaqueGeometry, transGeometry };
  }

  // ─── LOD 1 Simplified Chunk Mesher ────────────────────────────────────
  // Samples every 2nd block (2×2×2 → 1 voxel), no AO, no greedy merge.
  // Produces ~8× fewer faces than LOD 0 for typical terrain.

  function createChunkMeshLOD1(chunk) {
    const baseX = chunk.chunkX * CHUNK_SIZE;
    const baseZ = chunk.chunkZ * CHUNK_SIZE;
    const STEP = 2; // sample every 2 blocks

    const verts = [],
      norms = [],
      cols = [],
      uvs = [],
      uv2s = [],
      indices = [];
    let vCount = 0;

    const faceNormals = [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
    ];
    const faceOffsets = [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
    ];

    // Face vertex offsets for each face direction (quad corners relative to block origin)
    // Each face has 4 corners: [dx, dy, dz] relative to (x, y, z)
    const faceQuads = [
      // +Z: x0,y0,z1 → x1,y0,z1 → x1,y1,z1 → x0,y1,z1
      [
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
      ],
      // -Z: x1,y0,z0 → x0,y0,z0 → x0,y1,z0 → x1,y1,z0
      [
        [1, 0, 0],
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
      // +X: x1,y0,z1 → x1,y0,z0 → x1,y1,z0 → x1,y1,z1
      [
        [1, 0, 1],
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
      ],
      // -X: x0,y0,z0 → x0,y0,z1 → x0,y1,z1 → x0,y1,z0
      [
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
      // +Y: x0,y1,z1 → x1,y1,z1 → x1,y1,z0 → x0,y1,z0
      [
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
        [0, 1, 0],
      ],
      // -Y: x0,y0,z0 → x1,y0,z0 → x1,y0,z1 → x0,y0,z1
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [0, 0, 1],
      ],
    ];

    for (let y = 0; y < CHUNK_HEIGHT; y += STEP) {
      for (let z = 0; z < CHUNK_SIZE; z += STEP) {
        for (let x = 0; x < CHUNK_SIZE; x += STEP) {
          const block = chunk.getBlock(x, y, z);
          if (block === 0) continue; // AIR
          const isSolid = registry.isSolid(block);
          if (!isSolid) continue;
          const isTransparent = registry.isTransparent(block);
          if (isTransparent) continue; // skip transparent in LOD1

          const color = registry.getColor(block);
          const cr = ((color >> 16) & 0xff) / 255;
          const cg = ((color >> 8) & 0xff) / 255;
          const cb = (color & 0xff) / 255;

          for (let f = 0; f < 6; f++) {
            const [ox, oy, oz] = faceOffsets[f];
            const nx = x + ox * STEP,
              ny = y + oy * STEP,
              nz = z + oz * STEP;

            // Check neighbor to see if face is visible
            let neighborSolid = false;
            if (
              nx >= 0 &&
              nx < CHUNK_SIZE &&
              ny >= 0 &&
              ny < CHUNK_HEIGHT &&
              nz >= 0 &&
              nz < CHUNK_SIZE
            ) {
              const nBlock = chunk.getBlock(nx, ny, nz);
              neighborSolid = registry.isSolid(nBlock) && !registry.isTransparent(nBlock);
            } else if (ny >= 0 && ny < CHUNK_HEIGHT) {
              // Cross-chunk neighbor check
              const nb = getNeighborBlock(chunk, nx, ny, nz);
              neighborSolid = registry.isSolid(nb) && !registry.isTransparent(nb);
            }
            if (neighborSolid) continue;

            // Light sampling (simple — no AO)
            let lightBrightness = 1.0;
            if (enableLighting) {
              const lx = Math.min(Math.max(nx, 0), CHUNK_SIZE - 1);
              const ly = Math.min(Math.max(ny, 0), CHUNK_HEIGHT - 1);
              const lz = Math.min(Math.max(nz, 0), CHUNK_SIZE - 1);
              const sky = chunk.getSkyLight(lx, ly, lz) * dayTimeFactor;
              const blk = chunk.getBlockLight(lx, ly, lz);
              const light = Math.max(sky, blk);
              lightBrightness = 0.05 + (light / MAX_LIGHT) * 0.95;
            }

            const n = faceNormals[f];
            const quad = faceQuads[f];

            for (let ci = 0; ci < 4; ci++) {
              const q = quad[ci];
              verts.push(baseX + x + q[0] * STEP, y + q[1] * STEP, baseZ + z + q[2] * STEP);
              norms.push(n[0], n[1], n[2]);
              if (atlasEnabled) {
                cols.push(lightBrightness, lightBrightness, lightBrightness);
              } else {
                cols.push(cr * lightBrightness, cg * lightBrightness, cb * lightBrightness);
              }
            }

            uvs.push(0, STEP, STEP, STEP, STEP, 0, 0, 0);
            if (atlasEnabled) {
              const tileIdx = registry.getTextureFace(block, f);
              const tileU = tileIdx >= 0 ? (tileIdx % ATLAS_COLS) / ATLAS_COLS : 0;
              const tileV =
                tileIdx >= 0 ? 1 - (Math.floor(tileIdx / ATLAS_COLS) + 1) / ATLAS_ROWS : 0;
              uv2s.push(tileU, tileV, tileU, tileV, tileU, tileV, tileU, tileV);
            } else {
              uv2s.push(0, 0, 0, 0, 0, 0, 0, 0);
            }

            indices.push(vCount, vCount + 1, vCount + 2, vCount, vCount + 2, vCount + 3);
            vCount += 4;
          }
        }
      }
    }

    let opaqueGeometry = null;
    if (verts.length > 0) {
      opaqueGeometry = new THREE.BufferGeometry();
      opaqueGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      opaqueGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
      opaqueGeometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      opaqueGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      opaqueGeometry.setAttribute('uv2', new THREE.Float32BufferAttribute(uv2s, 2));
      opaqueGeometry.setIndex(indices);
      opaqueGeometry.computeBoundingSphere();
    }

    return { opaqueGeometry, transGeometry: null };
  }

  // ─── Chunk mesh update ──────────────────────────────────────────────────

  function updateChunkMesh(chunk, lodLevel = 0) {
    if (!chunk.dirty && !chunk.lightDirty) return;

    // Propagate lighting if needed (skip when lighting disabled for perf)
    if (chunk.lightDirty) {
      if (enableLighting) {
        propagateLighting(chunk);
      } else {
        // Clear the flag so we don't keep re-entering
        chunk.lightDirty = false;
      }
    }

    const key = `${chunk.chunkX},${chunk.chunkZ}`;

    // Remove old meshes
    if (chunkMeshes.has(key)) {
      const entry = chunkMeshes.get(key);
      if (entry.opaque) {
        gpu.scene.remove(entry.opaque);
        entry.opaque.geometry.dispose();
      }
      if (entry.transparent) {
        gpu.scene.remove(entry.transparent);
        entry.transparent.geometry.dispose();
      }
      chunkMeshes.delete(key);
    }

    const { opaqueGeometry, transGeometry } =
      lodLevel >= 1 ? createChunkMeshLOD1(chunk) : createChunkMesh(chunk);
    const entry = { opaque: null, transparent: null, lod: lodLevel };

    if (opaqueGeometry) {
      const mesh = new THREE.Mesh(opaqueGeometry, getOpaqueMaterial());
      mesh.castShadow = enableShadows;
      mesh.receiveShadow = enableShadows;
      gpu.scene.add(mesh);
      entry.opaque = mesh;
    }

    if (transGeometry) {
      // Translate vertices to chunk-local space so mesh.position enables distance-based sorting
      const cx = chunk.chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
      const cy = CHUNK_HEIGHT / 2;
      const cz = chunk.chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2;
      transGeometry.translate(-cx, -cy, -cz);
      const mesh = new THREE.Mesh(transGeometry, getTransparentMaterial());
      mesh.position.set(cx, cy, cz);
      mesh.castShadow = false;
      mesh.receiveShadow = enableShadows;
      mesh.renderOrder = 1; // render after opaque
      gpu.scene.add(mesh);
      entry.transparent = mesh;
    }

    if (entry.opaque || entry.transparent) {
      chunkMeshes.set(key, entry);
    }

    chunk.dirty = false;
  }

  // ─── World coordinates ──────────────────────────────────────────────────

  // Reusable result object for worldToChunk (avoid per-call allocation)
  const _wtcResult = { chunkX: 0, chunkZ: 0, localX: 0, localZ: 0 };

  function worldToChunk(x, z) {
    _wtcResult.chunkX = Math.floor(x / CHUNK_SIZE);
    _wtcResult.chunkZ = Math.floor(z / CHUNK_SIZE);
    _wtcResult.localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    _wtcResult.localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return _wtcResult;
  }

  function getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return BLOCK_TYPES.AIR;
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunk(chunkX, chunkZ);
    return chunk.getBlock(localX, y, localZ);
  }

  function setBlock(x, y, z, blockType) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunk(chunkX, chunkZ);
    chunk.setBlock(localX, y, localZ, blockType);
    markChunkModified(chunkX, chunkZ);

    // Mark neighbors dirty for mesh + light re-propagation
    if (localX === 0) {
      const nc = getChunk(chunkX - 1, chunkZ);
      nc.dirty = true;
      nc.lightDirty = true;
    }
    if (localX === CHUNK_SIZE - 1) {
      const nc = getChunk(chunkX + 1, chunkZ);
      nc.dirty = true;
      nc.lightDirty = true;
    }
    if (localZ === 0) {
      const nc = getChunk(chunkX, chunkZ - 1);
      nc.dirty = true;
      nc.lightDirty = true;
    }
    if (localZ === CHUNK_SIZE - 1) {
      const nc = getChunk(chunkX, chunkZ + 1);
      nc.dirty = true;
      nc.lightDirty = true;
    }
  }

  // ─── Chunk loading / unloading ──────────────────────────────────────────

  // ─── Chunk Queue & Frame Budgeting ──────────────────────────────────────
  // Instead of generating all chunks synchronously, queue them by priority
  // (distance to player) and process a limited number per frame.

  const chunkQueue = []; // pending chunk coordinates [{cx, cz, dist}]
  const chunkQueueSet = new Set(); // O(1) duplicate check for queue
  let queueDirty = false; // only sort when new items added
  let maxTerrainGenPerFrame = 2; // max chunks to generate per frame
  let maxMeshRebuildsPerFrame = 4; // max chunk meshes to rebuild per frame

  function updateChunks(playerX, playerZ) {
    const centerChunkX = Math.floor(playerX / CHUNK_SIZE);
    const centerChunkZ = Math.floor(playerZ / CHUNK_SIZE);

    // Phase 1: Queue any missing chunks (fast — just checks hash map + Set)
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const cx = centerChunkX + dx;
        const cz = centerChunkZ + dz;
        const key = `${cx},${cz}`;
        if (!chunks.has(key) && !chunkQueueSet.has(key)) {
          const dist = dx * dx + dz * dz;
          chunkQueue.push({ cx, cz, dist, key });
          chunkQueueSet.add(key);
          queueDirty = true;
        }
      }
    }

    // Sort queue by distance only when new items were added
    if (queueDirty) {
      chunkQueue.sort((a, b) => a.dist - b.dist);
      queueDirty = false;
    }

    // Remove items that are now too far away (filter instead of splice)
    if (chunkQueue.length > 0) {
      let writeIdx = 0;
      for (let i = 0; i < chunkQueue.length; i++) {
        const q = chunkQueue[i];
        if (
          Math.abs(q.cx - centerChunkX) <= RENDER_DISTANCE + 1 &&
          Math.abs(q.cz - centerChunkZ) <= RENDER_DISTANCE + 1
        ) {
          chunkQueue[writeIdx++] = q;
        } else {
          chunkQueueSet.delete(q.key);
        }
      }
      chunkQueue.length = writeIdx;
    }

    // Phase 2: Generate terrain for queued chunks (budget-limited)
    let generated = 0;
    while (chunkQueue.length > 0 && generated < maxTerrainGenPerFrame) {
      const item = chunkQueue.shift();
      chunkQueueSet.delete(item.key);
      if (chunks.has(item.key)) continue; // already generated
      const chunk = new Chunk(item.cx, item.cz);
      if (customTerrainGenerator) {
        customTerrainGenerator(chunk, {
          BLOCK_TYPES,
          noise,
          CHUNK_SIZE,
          CHUNK_HEIGHT,
          SEA_LEVEL,
          worldSeed,
        });
      } else {
        generateChunkTerrain(chunk);
      }
      chunks.set(item.key, chunk);
      generated++;
    }

    // Phase 3: Rebuild dirty chunk meshes (budget-limited)
    let rebuilt = 0;
    for (
      let dx = -RENDER_DISTANCE;
      dx <= RENDER_DISTANCE && rebuilt < maxMeshRebuildsPerFrame;
      dx++
    ) {
      for (
        let dz = -RENDER_DISTANCE;
        dz <= RENDER_DISTANCE && rebuilt < maxMeshRebuildsPerFrame;
        dz++
      ) {
        const cx = centerChunkX + dx;
        const cz = centerChunkZ + dz;
        const key = `${cx},${cz}`;
        const chunk = chunks.get(key);
        if (!chunk) continue;

        // Compute LOD level for this chunk
        const chunkDist = Math.max(Math.abs(dx), Math.abs(dz)); // Chebyshev distance
        let desiredLOD = 0;
        if (enableLOD) {
          if (chunkDist > lodDistances[1])
            desiredLOD = 2; // skip (too far)
          else if (chunkDist > lodDistances[0]) desiredLOD = 1;
        }
        if (desiredLOD >= 2) continue; // don't mesh at all

        // Check if LOD level changed (needs remesh even if not dirty)
        const existingEntry = chunkMeshes.get(key);
        const currentLOD = existingEntry ? existingEntry.lod || 0 : -1;
        const lodChanged = enableLOD && currentLOD !== desiredLOD;

        if (chunk.dirty || chunk.lightDirty || lodChanged) {
          // Propagate lighting on main thread first (modifies chunk data in-place)
          if (chunk.lightDirty) {
            if (enableLighting) {
              propagateLighting(chunk);
            } else {
              chunk.lightDirty = false;
            }
          }
          if (
            enableAsyncMeshing &&
            meshWorkers.length > 0 &&
            !pendingAsyncMeshes.has(key) &&
            desiredLOD === 0
          ) {
            // Async path: dispatch to worker (only for full-detail LOD 0)
            chunk.dirty = false;
            dispatchMeshJob(chunk, null);
          } else if (!enableAsyncMeshing || desiredLOD > 0) {
            // Sync path (original behavior, or LOD1 simplified mesh)
            updateChunkMesh(chunk, desiredLOD);
          }
          // If async mesh already pending for this chunk, skip (will be rebuilt when result arrives)
          rebuilt++;
        }
      }
    }

    // Phase 3.5: Fluid simulation tick
    if (enableFluids) fluidTick();

    // Phase 4: Unload far chunks
    const keysToRemove = [];
    for (const [key, entry] of chunkMeshes.entries()) {
      const [cx, cz] = key.split(',').map(Number);
      if (
        Math.abs(cx - centerChunkX) > RENDER_DISTANCE + 1 ||
        Math.abs(cz - centerChunkZ) > RENDER_DISTANCE + 1
      ) {
        if (entry.opaque) {
          gpu.scene.remove(entry.opaque);
          entry.opaque.geometry.dispose();
        }
        if (entry.transparent) {
          gpu.scene.remove(entry.transparent);
          entry.transparent.geometry.dispose();
        }
        keysToRemove.push(key);
        chunks.delete(key);
      }
    }
    keysToRemove.forEach(key => {
      chunkMeshes.delete(key);
      pendingAsyncMeshes.delete(key); // cancel any in-flight async mesh jobs
    });

    // Phase 5: LRU eviction — cap loaded chunks to prevent OOM
    const maxChunks = (RENDER_DISTANCE * 2 + 3) * (RENDER_DISTANCE * 2 + 3); // generous cap
    if (chunks.size > maxChunks) {
      // Build distance list for chunks beyond render distance
      const evictable = [];
      for (const [key] of chunks) {
        const [cx, cz] = key.split(',').map(Number);
        const dist = (cx - centerChunkX) ** 2 + (cz - centerChunkZ) ** 2;
        evictable.push({ key, dist });
      }
      evictable.sort((a, b) => b.dist - a.dist); // farthest first
      while (chunks.size > maxChunks && evictable.length > 0) {
        const { key } = evictable.shift();
        const entry = chunkMeshes.get(key);
        if (entry) {
          if (entry.opaque) {
            gpu.scene.remove(entry.opaque);
            entry.opaque.geometry.dispose();
          }
          if (entry.transparent) {
            gpu.scene.remove(entry.transparent);
            entry.transparent.geometry.dispose();
          }
          chunkMeshes.delete(key);
        }
        chunks.delete(key);
      }
    }
  }

  // Force-load all chunks around a position synchronously (for initial load)
  function forceLoadChunks(playerX, playerZ) {
    const centerChunkX = Math.floor(playerX / CHUNK_SIZE);
    const centerChunkZ = Math.floor(playerZ / CHUNK_SIZE);
    chunkQueue.length = 0; // clear any pending queue
    chunkQueueSet.clear();
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const chunk = getChunk(centerChunkX + dx, centerChunkZ + dz);
        updateChunkMesh(chunk);
      }
    }
  }

  // ─── World reset ────────────────────────────────────────────────────────

  function resetWorld() {
    for (const entry of chunkMeshes.values()) {
      if (entry.opaque) {
        gpu.scene.remove(entry.opaque);
        entry.opaque.geometry.dispose();
      }
      if (entry.transparent) {
        gpu.scene.remove(entry.transparent);
        entry.transparent.geometry.dispose();
      }
    }
    chunkMeshes.clear();
    chunks.clear();
    chunkQueue.length = 0;
    chunkQueueSet.clear();
    modifiedChunks.clear();
    // Clear all entities
    for (const ent of entities.values()) {
      if (ent.mesh && gpu && gpu.scene) {
        gpu.scene.remove(ent.mesh);
        if (ent.mesh.geometry) ent.mesh.geometry.dispose();
      }
    }
    entities.clear();
    spatialHash.clear();
    nextEntityId = 1;
    // Clear ECS component index (archetypes preserved — they're templates)
    componentIndex.clear();
    // Dispose cached entity materials
    for (const mat of _entityMaterialCache.values()) mat.dispose();
    _entityMaterialCache.clear();
    // Clear fluid simulation state
    fluidUpdateQueue.length = 0;
    fluidRemoveQueue.length = 0;
    fluidFrameCounter = 0;
    // Clear async meshing state (don't terminate workers — they can be reused)
    meshJobQueue.length = 0;
    meshJobCallbacks.clear();
    pendingAsyncMeshes.clear();
    meshJobIdCounter = 0;
    worldSeed += 5000 + Math.floor(Math.random() * 10000);
    noise = createSimplexNoise(worldSeed);
  }

  // ─── DDA Raycast (Amanatides & Woo) ────────────────────────────────────

  function raycastBlock(origin, direction, maxDistance = 10) {
    let ox = origin[0];
    let oy = origin[1];
    let oz = origin[2];
    let dx = direction[0];
    let dy = direction[1];
    let dz = direction[2];

    // Normalize direction
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len === 0) return { hit: false };
    dx /= len;
    dy /= len;
    dz /= len;

    let ix = Math.floor(ox);
    let iy = Math.floor(oy);
    let iz = Math.floor(oz);

    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

    const tDeltaX = dx !== 0 ? Math.abs(1.0 / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(1.0 / dy) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(1.0 / dz) : Infinity;

    let tMaxX = dx > 0 ? (ix + 1 - ox) / dx : dx < 0 ? (ox - ix) / -dx : Infinity;
    let tMaxY = dy > 0 ? (iy + 1 - oy) / dy : dy < 0 ? (oy - iy) / -dy : Infinity;
    let tMaxZ = dz > 0 ? (iz + 1 - oz) / dz : dz < 0 ? (oz - iz) / -dz : Infinity;

    let dist = 0;
    let nx = 0,
      ny = 0,
      nz = 0; // face normal

    for (let i = 0; i < maxDistance * 3 + 1; i++) {
      const blockType = getBlock(ix, iy, iz);
      if (blockType !== BLOCK_TYPES.AIR && registry.isSolid(blockType)) {
        return {
          hit: true,
          position: [ix, iy, iz],
          normal: [nx, ny, nz],
          adjacent: [ix + nx, iy + ny, iz + nz],
          blockType,
          distance: dist,
        };
      }

      // Advance to next voxel boundary
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          dist = tMaxX;
          if (dist > maxDistance) break;
          ix += stepX;
          tMaxX += tDeltaX;
          nx = -stepX;
          ny = 0;
          nz = 0;
        } else {
          dist = tMaxZ;
          if (dist > maxDistance) break;
          iz += stepZ;
          tMaxZ += tDeltaZ;
          nx = 0;
          ny = 0;
          nz = -stepZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          dist = tMaxY;
          if (dist > maxDistance) break;
          iy += stepY;
          tMaxY += tDeltaY;
          nx = 0;
          ny = -stepY;
          nz = 0;
        } else {
          dist = tMaxZ;
          if (dist > maxDistance) break;
          iz += stepZ;
          tMaxZ += tDeltaZ;
          nx = 0;
          ny = 0;
          nz = -stepZ;
        }
      }
    }

    return { hit: false };
  }

  // ─── Collision detection ────────────────────────────────────────────────

  function checkCollision(pos, size) {
    const halfW = size;
    const height = size * 2;
    const halfD = size;
    const minX = Math.floor(pos[0] - halfW);
    const maxX = Math.floor(pos[0] + halfW);
    const minY = Math.floor(pos[1]);
    const maxY = Math.floor(pos[1] + height);
    const minZ = Math.floor(pos[2] - halfD);
    const maxZ = Math.floor(pos[2] + halfD);

    const eMinX = pos[0] - halfW,
      eMaxX = pos[0] + halfW;
    const eMinY = pos[1],
      eMaxY = pos[1] + height;
    const eMinZ = pos[2] - halfD,
      eMaxZ = pos[2] + halfD;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const blockType = getBlock(x, y, z);
          if (!registry.isSolid(blockType) || registry.isFluid(blockType)) continue;
          const bb = registry.getBoundingBox(blockType);
          const bMinX = x + bb[0],
            bMinY = y + bb[1],
            bMinZ = z + bb[2];
          const bMaxX = x + bb[3],
            bMaxY = y + bb[4],
            bMaxZ = z + bb[5];
          if (
            eMinX < bMaxX &&
            eMaxX > bMinX &&
            eMinY < bMaxY &&
            eMaxY > bMinY &&
            eMinZ < bMaxZ &&
            eMaxZ > bMinZ
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Check if position is in water/fluid
  function checkFluid(pos, size) {
    const bx = Math.floor(pos[0]);
    const by = Math.floor(pos[1]);
    const bz = Math.floor(pos[2]);
    for (let dy = 0; dy <= Math.ceil(size * 2); dy++) {
      const id = getBlock(bx, by + dy, bz);
      if (registry.isFluid(id)) return true;
    }
    return false;
  }

  // ─── Swept AABB Physics ─────────────────────────────────────────────────
  // Per-axis collision resolution with auto-step, swimming, and ground detection

  function checkAABB(px, py, pz, halfW, height, halfD) {
    const minX = Math.floor(px - halfW);
    const maxX = Math.floor(px + halfW);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + height);
    const minZ = Math.floor(pz - halfD);
    const maxZ = Math.floor(pz + halfD);

    // Entity AABB
    const eMinX = px - halfW,
      eMaxX = px + halfW;
    const eMinY = py,
      eMaxY = py + height;
    const eMinZ = pz - halfD,
      eMaxZ = pz + halfD;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const b = getBlock(x, y, z);
          if (!registry.isSolid(b) || registry.isFluid(b)) continue;
          // Shape-aware collision: check against block's bounding box
          const bb = registry.getBoundingBox(b);
          const bMinX = x + bb[0],
            bMinY = y + bb[1],
            bMinZ = z + bb[2];
          const bMaxX = x + bb[3],
            bMaxY = y + bb[4],
            bMaxZ = z + bb[5];
          if (
            eMinX < bMaxX &&
            eMaxX > bMinX &&
            eMinY < bMaxY &&
            eMaxY > bMinY &&
            eMinZ < bMaxZ &&
            eMaxZ > bMinZ
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function moveEntity(pos, vel, size, dt) {
    const halfW = (size[0] || 0.6) / 2;
    const height = size[1] || 1.8;
    const halfD = (size[2] || 0.6) / 2;

    let px = pos[0];
    let py = pos[1];
    let pz = pos[2];
    let vx = vel[0];
    let vy = vel[1];
    let vz = vel[2];
    let grounded = false;
    let hitCeiling = false;

    // Check fluid at current position
    const inWater =
      registry.isFluid(getBlock(Math.floor(px), Math.floor(py), Math.floor(pz))) ||
      registry.isFluid(getBlock(Math.floor(px), Math.floor(py + 1), Math.floor(pz)));

    // Apply water drag
    if (inWater) {
      vx *= 0.8;
      vy *= 0.8;
      vz *= 0.8;
    }

    // Move X axis
    const newX = px + vx * dt;
    if (!checkAABB(newX, py, pz, halfW, height, halfD)) {
      px = newX;
    } else {
      // Try auto-step (step up 0.6 blocks)
      if (
        vy <= 0 &&
        !checkAABB(newX, py + 0.6, pz, halfW, height, halfD) &&
        !checkAABB(px, py + 0.6, pz, halfW, height, halfD)
      ) {
        px = newX;
        py += 0.6;
      } else {
        vx = 0;
      }
    }

    // Move Y axis
    const newY = py + vy * dt;
    if (!checkAABB(px, newY, pz, halfW, height, halfD)) {
      py = newY;
    } else {
      if (vy < 0) grounded = true;
      if (vy > 0) hitCeiling = true;
      vy = 0;
    }

    // Move Z axis
    const newZ = pz + vz * dt;
    if (!checkAABB(px, py, newZ, halfW, height, halfD)) {
      pz = newZ;
    } else {
      // Try auto-step
      if (
        vy <= 0 &&
        !checkAABB(px, py + 0.6, newZ, halfW, height, halfD) &&
        !checkAABB(px, py + 0.6, pz, halfW, height, halfD)
      ) {
        pz = newZ;
        py += 0.6;
      } else {
        vz = 0;
      }
    }

    return {
      position: [px, py, pz],
      velocity: [vx, vy, vz],
      grounded,
      hitCeiling,
      inWater,
    };
  }

  // ─── Structures ─────────────────────────────────────────────────────────

  function placeTree(x, y, z, type = 'oak') {
    const setB = (bx, by, bz, block) => {
      const cx = Math.floor(bx / CHUNK_SIZE);
      const cz = Math.floor(bz / CHUNK_SIZE);
      const key = `${cx},${cz}`;
      const ch = chunks.get(key);
      if (!ch) return;
      const lx = ((bx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const lz = ((bz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      if (by >= 0 && by < CHUNK_HEIGHT) {
        if (ch.getBlock(lx, by, lz) === BLOCK_TYPES.AIR) {
          ch.setBlock(lx, by, lz, block);
          ch.dirty = true;
        }
      }
    };
    const setTrunk = (bx, by, bz) => setBlock(bx, by, bz, BLOCK_TYPES.WOOD);

    if (type === 'spruce') {
      const trunkH = 7 + Math.floor(Math.random() * 4);
      for (let i = 0; i < trunkH; i++) setTrunk(x, y + i, z);
      for (let layer = 0; layer < trunkH - 2; layer++) {
        const ly = y + 2 + layer;
        const r = Math.max(1, Math.floor((trunkH - 2 - layer) / 2));
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            if (dx === 0 && dz === 0) continue;
            if (Math.abs(dx) + Math.abs(dz) <= r + 1) setB(x + dx, ly, z + dz, BLOCK_TYPES.LEAVES);
          }
        }
      }
      setB(x, y + trunkH, z, BLOCK_TYPES.LEAVES);
      setB(x, y + trunkH + 1, z, BLOCK_TYPES.LEAVES);
    } else if (type === 'jungle') {
      const trunkH = 9 + Math.floor(Math.random() * 5);
      for (let i = 0; i < trunkH; i++) setTrunk(x, y + i, z);
      const leafY = y + trunkH;
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dz = -3; dz <= 3; dz++) {
            if (dx * dx + dy * dy * 2 + dz * dz <= 12)
              setB(x + dx, leafY + dy, z + dz, BLOCK_TYPES.LEAVES);
          }
        }
      }
    } else if (type === 'acacia') {
      const trunkH = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < trunkH; i++) setTrunk(x, y + i, z);
      const leafY = y + trunkH;
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          if (dx * dx + dz * dz <= 10) {
            setB(x + dx, leafY, z + dz, BLOCK_TYPES.LEAVES);
            setB(x + dx, leafY + 1, z + dz, BLOCK_TYPES.LEAVES);
          }
        }
      }
    } else {
      // oak / default
      const trunkH = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < trunkH; i++) setTrunk(x, y + i, z);
      const leafY = y + trunkH;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dz = -2; dz <= 2; dz++) {
            if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 4)
              setB(x + dx, leafY + dy, z + dz, BLOCK_TYPES.LEAVES);
          }
        }
      }
    }
  }

  // ─── Fluid Simulation ────────────────────────────────────────────────────
  // Water spreads 7 blocks horizontally + infinite downward (tick every 4 frames).
  // Lava spreads 3 blocks horizontally + infinite downward (tick every 12 frames).
  // Level 7 = source, 1 = thinnest flow, 0 = empty (not fluid).

  const FLUID_MAX_LEVEL = 7;
  const FLUID_WATER_SPREAD = 7; // max horizontal spread from source
  const FLUID_LAVA_SPREAD = 3;
  const FLUID_WATER_TICK_RATE = 4; // frames between water ticks
  const FLUID_LAVA_TICK_RATE = 12;
  let fluidFrameCounter = 0;
  let enableFluids = true;
  const fluidUpdateQueue = []; // BFS queue: [{x, y, z}]
  const fluidRemoveQueue = []; // retraction queue

  function getFluidLevel(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunkIfExists(chunkX, chunkZ);
    if (!chunk) return 0;
    return chunk.getFluidLevel(localX, y, localZ);
  }

  function setFluidLevel(x, y, z, level) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunkIfExists(chunkX, chunkZ);
    if (!chunk) return;
    chunk.setFluidLevel(localX, y, localZ, level);
    chunk.dirty = true;
  }

  function isFluidBlock(x, y, z) {
    const b = getBlock(x, y, z);
    return b === BLOCK_TYPES.WATER || b === BLOCK_TYPES.LAVA;
  }

  function getFluidType(x, y, z) {
    const b = getBlock(x, y, z);
    if (b === BLOCK_TYPES.WATER) return 'water';
    if (b === BLOCK_TYPES.LAVA) return 'lava';
    return null;
  }

  function setFluidSource(x, y, z, fluidType = 'water') {
    const blockId = fluidType === 'lava' ? BLOCK_TYPES.LAVA : BLOCK_TYPES.WATER;
    setBlock(x, y, z, blockId);
    setFluidLevel(x, y, z, FLUID_MAX_LEVEL);
    fluidUpdateQueue.push({ x, y, z });
  }

  function removeFluidSource(x, y, z) {
    if (!isFluidBlock(x, y, z)) return;
    setBlock(x, y, z, BLOCK_TYPES.AIR);
    setFluidLevel(x, y, z, 0);
    // Queue neighbors for retraction
    const neighbors = [
      { x: x - 1, y, z },
      { x: x + 1, y, z },
      { x, y, z: z - 1 },
      { x, y, z: z + 1 },
      { x, y: y - 1, z },
    ];
    for (const n of neighbors) {
      if (isFluidBlock(n.x, n.y, n.z) && getFluidLevel(n.x, n.y, n.z) < FLUID_MAX_LEVEL) {
        fluidRemoveQueue.push(n);
      }
    }
  }

  function getFluidLevelWorld(x, y, z) {
    return getFluidLevel(x, y, z);
  }

  function fluidTick() {
    if (!enableFluids) return;
    fluidFrameCounter++;

    const doWater = fluidFrameCounter % FLUID_WATER_TICK_RATE === 0;
    const doLava = fluidFrameCounter % FLUID_LAVA_TICK_RATE === 0;
    if (!doWater && !doLava) return;

    // Process retraction first
    const retractBatch = fluidRemoveQueue.splice(0, 64);
    const retractVisited = new Set();
    for (const pos of retractBatch) {
      const pk = `${pos.x},${pos.y},${pos.z}`;
      if (retractVisited.has(pk)) continue;
      retractVisited.add(pk);

      if (!isFluidBlock(pos.x, pos.y, pos.z)) continue;
      const level = getFluidLevel(pos.x, pos.y, pos.z);
      if (level >= FLUID_MAX_LEVEL) continue; // don't retract sources

      // Check if this flow still has a valid source feeding it
      const hasSource = checkFluidFeed(pos.x, pos.y, pos.z);
      if (!hasSource) {
        // Remove this flow block and queue its children
        setBlock(pos.x, pos.y, pos.z, BLOCK_TYPES.AIR);
        setFluidLevel(pos.x, pos.y, pos.z, 0);
        const neighbors = [
          { x: pos.x - 1, y: pos.y, z: pos.z },
          { x: pos.x + 1, y: pos.y, z: pos.z },
          { x: pos.x, y: pos.y, z: pos.z - 1 },
          { x: pos.x, y: pos.y, z: pos.z + 1 },
          { x: pos.x, y: pos.y - 1, z: pos.z },
        ];
        for (const n of neighbors) {
          if (isFluidBlock(n.x, n.y, n.z) && getFluidLevel(n.x, n.y, n.z) < FLUID_MAX_LEVEL) {
            fluidRemoveQueue.push(n);
          }
        }
      }
    }

    // Process spread queue (BFS)
    const spreadBatch = fluidUpdateQueue.splice(0, 64);
    const visited = new Set();
    for (const pos of spreadBatch) {
      const pk = `${pos.x},${pos.y},${pos.z}`;
      if (visited.has(pk)) continue;
      visited.add(pk);

      if (!isFluidBlock(pos.x, pos.y, pos.z)) continue;
      const level = getFluidLevel(pos.x, pos.y, pos.z);
      const fluidType = getFluidType(pos.x, pos.y, pos.z);
      if (!fluidType) continue;

      const isWater = fluidType === 'water';
      if (isWater && !doWater) {
        fluidUpdateQueue.push(pos); // re-queue for water tick
        continue;
      }
      if (!isWater && !doLava) {
        fluidUpdateQueue.push(pos); // re-queue for lava tick
        continue;
      }

      const maxSpread = isWater ? FLUID_WATER_SPREAD : FLUID_LAVA_SPREAD;
      const blockId = isWater ? BLOCK_TYPES.WATER : BLOCK_TYPES.LAVA;

      // Flow downward (infinite, full level)
      const below = getBlock(pos.x, pos.y - 1, pos.z);
      if (
        pos.y > 0 &&
        (below === BLOCK_TYPES.AIR ||
          (registry.isFluid(below) && getFluidLevel(pos.x, pos.y - 1, pos.z) < FLUID_MAX_LEVEL))
      ) {
        // Flowing water/lava meets opposite fluid → obsidian
        if (registry.isFluid(below) && below !== blockId) {
          setBlock(pos.x, pos.y - 1, pos.z, BLOCK_TYPES.OBSIDIAN);
          setFluidLevel(pos.x, pos.y - 1, pos.z, 0);
        } else {
          setBlock(pos.x, pos.y - 1, pos.z, blockId);
          setFluidLevel(pos.x, pos.y - 1, pos.z, FLUID_MAX_LEVEL);
          fluidUpdateQueue.push({ x: pos.x, y: pos.y - 1, z: pos.z });
        }
        continue; // prioritize downward flow — don't spread horizontally yet
      }

      // Horizontal spread (only if level > 1)
      if (level <= 1) continue;
      const newLevel = level - 1;
      if (FLUID_MAX_LEVEL - newLevel > maxSpread) continue; // exceeded spread distance

      const horizontalNeighbors = [
        { x: pos.x - 1, y: pos.y, z: pos.z },
        { x: pos.x + 1, y: pos.y, z: pos.z },
        { x: pos.x, y: pos.y, z: pos.z - 1 },
        { x: pos.x, y: pos.y, z: pos.z + 1 },
      ];

      for (const n of horizontalNeighbors) {
        const nb = getBlock(n.x, n.y, n.z);
        if (nb === BLOCK_TYPES.AIR) {
          setBlock(n.x, n.y, n.z, blockId);
          setFluidLevel(n.x, n.y, n.z, newLevel);
          fluidUpdateQueue.push(n);
        } else if (registry.isFluid(nb)) {
          if (nb !== blockId) {
            // Water meets lava → obsidian (or cobblestone for source lava)
            setBlock(n.x, n.y, n.z, BLOCK_TYPES.OBSIDIAN);
            setFluidLevel(n.x, n.y, n.z, 0);
          } else if (getFluidLevel(n.x, n.y, n.z) < newLevel) {
            // Strengthen existing flow
            setFluidLevel(n.x, n.y, n.z, newLevel);
            fluidUpdateQueue.push(n);
          }
        }
      }
    }
  }

  // Check if a flow block has a valid feeding neighbor with higher level
  function checkFluidFeed(x, y, z) {
    const level = getFluidLevel(x, y, z);
    // Above with any level feeds downward flows
    if (isFluidBlock(x, y + 1, z)) return true;
    // Horizontal neighbor with higher level
    const neighbors = [
      [x - 1, y, z],
      [x + 1, y, z],
      [x, y, z - 1],
      [x, y, z + 1],
    ];
    for (const [nx, ny, nz] of neighbors) {
      if (isFluidBlock(nx, ny, nz) && getFluidLevel(nx, ny, nz) > level) return true;
    }
    return false;
  }

  // ─── World Persistence (IndexedDB) ────────────────────────────────────
  // Save/load modified chunks to IndexedDB for persistent worlds.
  // Only saves chunks that the player has modified (delta compression).

  const DB_NAME = 'nova64_voxel';
  const DB_VERSION = 1;
  const STORE_NAME = 'chunks';
  const modifiedChunks = new Set(); // track which chunks have been modified by player

  function openDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // RLE encode a Uint8Array for space efficiency
  function rleEncode(data) {
    const out = [];
    let i = 0;
    while (i < data.length) {
      const val = data[i];
      let run = 1;
      while (i + run < data.length && data[i + run] === val && run < 255) run++;
      out.push(run, val);
      i += run;
    }
    return new Uint8Array(out);
  }

  function rleDecode(encoded, length) {
    const out = new Uint8Array(length);
    let oi = 0;
    for (let i = 0; i < encoded.length; i += 2) {
      const run = encoded[i];
      const val = encoded[i + 1];
      for (let j = 0; j < run && oi < length; j++) {
        out[oi++] = val;
      }
    }
    return out;
  }

  // Mark chunk as modified (called from setBlock for player edits)
  function markChunkModified(chunkX, chunkZ) {
    modifiedChunks.add(`${chunkX},${chunkZ}`);
  }

  async function saveWorld(name) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const worldKey = `world:${name}:seed`;
    store.put(worldSeed, worldKey);

    for (const key of modifiedChunks) {
      const chunk = chunks.get(key);
      if (!chunk) continue;
      const encoded = rleEncode(chunk.blocks);
      store.put(encoded, `world:${name}:chunk:${key}`);
    }

    store.put(Array.from(modifiedChunks), `world:${name}:modified`);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  async function loadWorld(name) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const seedReq = store.get(`world:${name}:seed`);
    const modifiedReq = store.get(`world:${name}:modified`);

    return new Promise((resolve, reject) => {
      tx.oncomplete = async () => {
        if (seedReq.result === undefined) {
          db.close();
          resolve(false);
          return;
        }

        // Reset world with saved seed
        resetWorld();
        worldSeed = seedReq.result;
        noise = createSimplexNoise(worldSeed);

        // Load modified chunk keys
        const modKeys = modifiedReq.result || [];
        modifiedChunks.clear();

        if (modKeys.length > 0) {
          // Load each modified chunk
          const loadTx = db.transaction(STORE_NAME, 'readonly');
          const loadStore = loadTx.objectStore(STORE_NAME);
          const chunkPromises = [];

          for (const key of modKeys) {
            modifiedChunks.add(key);
            const chunkReq = loadStore.get(`world:${name}:chunk:${key}`);
            chunkPromises.push(
              new Promise(res => {
                chunkReq.onsuccess = () => res({ key, data: chunkReq.result });
              })
            );
          }

          await new Promise(res => {
            loadTx.oncomplete = res;
          });

          const results = await Promise.all(chunkPromises);
          const blockLen = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;

          for (const { key, data } of results) {
            if (!data) continue;
            const [cx, cz] = key.split(',').map(Number);
            const chunk = getChunk(cx, cz);
            const decoded = rleDecode(data, blockLen);
            chunk.blocks.set(decoded);
            chunk.dirty = true;
            chunk.lightDirty = true;
          }
        }

        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  async function listWorlds() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const keys = req.result || [];
        const worlds = new Set();
        for (const k of keys) {
          if (typeof k === 'string' && k.startsWith('world:') && k.endsWith(':seed')) {
            worlds.add(k.slice(6, -5)); // extract name between "world:" and ":seed"
          }
        }
        db.close();
        resolve(Array.from(worlds));
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  }

  async function deleteWorld(name) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Get all keys for this world
    const keysReq = store.getAllKeys();
    return new Promise((resolve, reject) => {
      keysReq.onsuccess = () => {
        const prefix = `world:${name}:`;
        for (const k of keysReq.result) {
          if (typeof k === 'string' && k.startsWith(prefix)) {
            store.delete(k);
          }
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  }

  // ─── Entity System ──────────────────────────────────────────────────────
  // Lightweight entity manager for mobs, items, NPCs, and interactive objects.
  // Entities integrate with the voxel physics system (swept AABB) and have
  // optional AI callbacks, health, and Three.js mesh attachment.

  const entities = new Map(); // id -> entity
  let nextEntityId = 1;
  const ENTITY_GRAVITY = -20;
  const _entityMaterialCache = new Map(); // hex color -> MeshStandardMaterial (shared)

  // Spatial hash for fast region queries
  const SPATIAL_CELL = 16; // matches chunk size
  const spatialHash = new Map(); // "cx,cy,cz" -> Set<entityId>

  // ─── ECS Component & Archetype System ────────────────────────────────
  const archetypes = new Map(); // name -> { components: { compName: defaultData } }

  // Component index: compName -> Set<entityId> for fast queries
  const componentIndex = new Map();

  function spatialKey(x, y, z) {
    return `${Math.floor(x / SPATIAL_CELL)},${Math.floor(y / SPATIAL_CELL)},${Math.floor(z / SPATIAL_CELL)}`;
  }

  function spatialInsert(ent) {
    const key = spatialKey(ent.x, ent.y, ent.z);
    let cell = spatialHash.get(key);
    if (!cell) {
      cell = new Set();
      spatialHash.set(key, cell);
    }
    cell.add(ent.id);
    ent._spatialKey = key;
  }

  function spatialRemove(ent) {
    if (ent._spatialKey) {
      const cell = spatialHash.get(ent._spatialKey);
      if (cell) {
        cell.delete(ent.id);
        if (cell.size === 0) spatialHash.delete(ent._spatialKey);
      }
      ent._spatialKey = null;
    }
  }

  function spatialUpdate(ent) {
    const newKey = spatialKey(ent.x, ent.y, ent.z);
    if (newKey !== ent._spatialKey) {
      spatialRemove(ent);
      spatialInsert(ent);
    }
  }

  /**
   * Spawn a voxel entity.
   * @param {string} type - Entity type name (e.g. 'zombie', 'item', 'npc')
   * @param {number[]} pos - [x, y, z] world position
   * @param {object} opts - Options:
   *   color: number — hex color to auto-create a box mesh (simplest usage)
   *   mesh: THREE.Mesh — attach a raw THREE.Mesh (not a createCube ID)
   *   size: [w, h, d] — AABB collision size (default [0.8, 1.8, 0.8])
   *   health: number — max & current health (default 10)
   *   gravity: boolean — apply gravity (default true)
   *   ai: function(entity, dt, context) — AI tick callback
   *   data: object — custom data for game logic
   * @returns {object} entity
   */
  function spawnEntity(type, pos, opts = {}) {
    const id = nextEntityId++;
    const size = opts.size || [0.8, 1.8, 0.8];

    // Resolve mesh: create from color, use provided THREE.Mesh, or none
    let mesh = null;
    if (opts.color !== undefined && gpu && gpu.scene) {
      // Auto-create a simple box mesh from color (material shared per color)
      const geom = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const colorKey = opts.color & 0xffffff;
      let mat = _entityMaterialCache.get(colorKey);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({
          color: colorKey,
          roughness: 0.8,
          metalness: 0.1,
        });
        _entityMaterialCache.set(colorKey, mat);
      }
      mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    } else if (opts.mesh && typeof opts.mesh === 'object' && opts.mesh.position) {
      // Raw THREE.Mesh provided (must have .position)
      mesh = opts.mesh;
    }
    // Ignore numeric mesh IDs — they don't have .position.set()

    const ent = {
      id,
      type: type || 'generic',
      x: pos[0] || 0,
      y: pos[1] || 0,
      z: pos[2] || 0,
      vx: 0,
      vy: 0,
      vz: 0,
      width: size[0],
      height: size[1],
      depth: size[2],
      mesh,
      health: opts.health !== undefined ? opts.health : 10,
      maxHealth: opts.health !== undefined ? opts.health : 10,
      alive: true,
      gravity: opts.gravity !== undefined ? opts.gravity : true,
      onGround: false,
      inWater: false,
      ai: opts.ai || null,
      data: opts.data || {},
      components: null, // ECS components (Map, created lazily)
      _spatialKey: null,
    };

    // Position and add mesh to scene
    if (ent.mesh && gpu && gpu.scene) {
      ent.mesh.position.set(ent.x, ent.y + ent.height / 2, ent.z);
      gpu.scene.add(ent.mesh);
    }

    entities.set(id, ent);
    spatialInsert(ent);
    return ent;
  }

  /**
   * Remove a voxel entity.
   */
  function removeEntity(id) {
    const ent = entities.get(id);
    if (!ent) return false;
    if (ent.mesh && gpu && gpu.scene) {
      gpu.scene.remove(ent.mesh);
      if (ent.mesh.geometry) ent.mesh.geometry.dispose();
      // Only dispose materials NOT in the shared cache
      if (ent.mesh.material && !_entityMaterialCache.has(ent.mesh.material.color?.getHex?.())) {
        ent.mesh.material.dispose();
      }
    }
    // Clean up component index
    if (ent.components) {
      for (const name of ent.components.keys()) {
        const idx = componentIndex.get(name);
        if (idx) idx.delete(id);
      }
    }
    spatialRemove(ent);
    entities.delete(id);
    return true;
  }

  /**
   * Get entity by ID.
   */
  function getEntity(id) {
    return entities.get(id) || null;
  }

  /**
   * Damage an entity. Removes it when health <= 0.
   * @returns {boolean} true if entity died
   */
  function damageEntity(id, amount) {
    const ent = entities.get(id);
    if (!ent || !ent.alive) return false;
    ent.health = Math.max(0, ent.health - amount);
    if (ent.health <= 0) {
      ent.alive = false;
      if (ent.mesh) ent.mesh.visible = false;
      return true;
    }
    return false;
  }

  /**
   * Heal an entity.
   */
  function healEntity(id, amount) {
    const ent = entities.get(id);
    if (!ent || !ent.alive) return;
    ent.health = Math.min(ent.maxHealth, ent.health + amount);
  }

  /**
   * Update all entities — physics + AI. Call once per frame.
   * @param {number} dt - delta time in seconds
   * @param {number[]} [playerPos] - optional [x,y,z] to skip far entities (perf)
   * @param {number} [activeRadius=80] - entities beyond this are paused
   */
  function updateEntities(dt, playerPos, activeRadius = 80) {
    const hasPlayer = playerPos && playerPos.length >= 3;
    const ar2 = activeRadius * activeRadius;

    for (const ent of entities.values()) {
      if (!ent.alive) continue;

      // Skip entities far from player for performance
      if (hasPlayer) {
        const dx = ent.x - playerPos[0];
        const dz = ent.z - playerPos[2];
        if (dx * dx + dz * dz > ar2) continue;
      }

      // Apply gravity
      if (ent.gravity) {
        ent.vy += ENTITY_GRAVITY * dt;
      }

      // Run AI
      if (ent.ai) {
        ent.ai(ent, dt, {
          getBlock,
          setBlock,
          getHighestBlock,
          entities,
          getEntitiesInRadius,
          moveEntity,
          noise,
        });
      }

      // Physics via swept AABB
      const result = moveEntity(
        [ent.x, ent.y, ent.z],
        [ent.vx, ent.vy, ent.vz],
        [ent.width, ent.height, ent.depth],
        dt
      );
      ent.x = result.position[0];
      ent.y = result.position[1];
      ent.z = result.position[2];
      ent.vx = result.velocity[0];
      ent.vy = result.velocity[1];
      ent.vz = result.velocity[2];
      ent.onGround = result.grounded;
      ent.inWater = result.inWater;

      // Update mesh position
      if (ent.mesh) {
        ent.mesh.position.set(ent.x, ent.y + ent.height / 2, ent.z);
      }

      // Update spatial hash
      spatialUpdate(ent);

      // Remove entities that fall out of the world
      if (ent.y < -64) {
        ent.alive = false;
        if (ent.mesh) ent.mesh.visible = false;
      }
    }
  }

  /**
   * Get all living entities within radius of a point.
   * Uses spatial hash for broad-phase, then distance check.
   */
  function getEntitiesInRadius(x, y, z, radius) {
    const results = [];
    const r2 = radius * radius;
    const cellRange = Math.ceil(radius / SPATIAL_CELL);
    const cx0 = Math.floor(x / SPATIAL_CELL);
    const cy0 = Math.floor(y / SPATIAL_CELL);
    const cz0 = Math.floor(z / SPATIAL_CELL);

    for (let dcx = -cellRange; dcx <= cellRange; dcx++) {
      for (let dcy = -cellRange; dcy <= cellRange; dcy++) {
        for (let dcz = -cellRange; dcz <= cellRange; dcz++) {
          const key = `${cx0 + dcx},${cy0 + dcy},${cz0 + dcz}`;
          const cell = spatialHash.get(key);
          if (!cell) continue;
          for (const id of cell) {
            const ent = entities.get(id);
            if (!ent || !ent.alive) continue;
            const dx = ent.x - x;
            const dy = ent.y - y;
            const dz = ent.z - z;
            if (dx * dx + dy * dy + dz * dz <= r2) {
              results.push(ent);
            }
          }
        }
      }
    }
    return results;
  }

  /**
   * Get all living entities of a specific type.
   */
  function getEntitiesByType(type) {
    const results = [];
    for (const ent of entities.values()) {
      if (ent.alive && ent.type === type) results.push(ent);
    }
    return results;
  }

  /**
   * Get the count of all living entities.
   */
  function getEntityCount() {
    let count = 0;
    for (const ent of entities.values()) {
      if (ent.alive) count++;
    }
    return count;
  }

  /**
   * Remove all dead entities (cleanup pass).
   */
  function cleanupEntities() {
    const toRemove = [];
    for (const ent of entities.values()) {
      if (!ent.alive) toRemove.push(ent.id);
    }
    for (const id of toRemove) {
      removeEntity(id);
    }
    return toRemove.length;
  }

  // ─── ECS: Component Management ──────────────────────────────────────

  /**
   * Set a component on an entity.
   * @param {number} id - Entity ID
   * @param {string} name - Component name (e.g. 'inventory', 'pathfind', 'animation')
   * @param {object} data - Component data
   */
  function setEntityComponent(id, name, data) {
    const ent = entities.get(id);
    if (!ent) return;
    if (!ent.components) ent.components = new Map();
    ent.components.set(name, data);
    // Update component index
    let idx = componentIndex.get(name);
    if (!idx) {
      idx = new Set();
      componentIndex.set(name, idx);
    }
    idx.add(id);
  }

  /**
   * Get a component from an entity.
   * @returns {object|null} Component data or null
   */
  function getEntityComponent(id, name) {
    const ent = entities.get(id);
    if (!ent || !ent.components) return null;
    return ent.components.get(name) || null;
  }

  /**
   * Check if an entity has a component.
   */
  function hasEntityComponent(id, name) {
    const ent = entities.get(id);
    if (!ent || !ent.components) return false;
    return ent.components.has(name);
  }

  /**
   * Remove a component from an entity.
   */
  function removeEntityComponent(id, name) {
    const ent = entities.get(id);
    if (!ent || !ent.components) return false;
    const had = ent.components.delete(name);
    if (had) {
      const idx = componentIndex.get(name);
      if (idx) idx.delete(id);
    }
    return had;
  }

  /**
   * Query entities that have ALL of the specified components.
   * @param {string[]} required - Array of component names
   * @param {function} [filter] - Optional filter predicate (entity) => boolean
   * @returns {object[]} Array of matching entities
   */
  function queryEntities(required, filter) {
    if (!required || required.length === 0) return [];
    // Start with the smallest index set for perf
    let smallest = null;
    let smallestSize = Infinity;
    for (const name of required) {
      const idx = componentIndex.get(name);
      if (!idx || idx.size === 0) return []; // component not used anywhere
      if (idx.size < smallestSize) {
        smallest = idx;
        smallestSize = idx.size;
      }
    }
    const results = [];
    for (const id of smallest) {
      const ent = entities.get(id);
      if (!ent || !ent.alive) continue;
      // Check all required components
      let hasAll = true;
      for (const name of required) {
        if (!ent.components || !ent.components.has(name)) {
          hasAll = false;
          break;
        }
      }
      if (hasAll && (!filter || filter(ent))) {
        results.push(ent);
      }
    }
    return results;
  }

  // ─── ECS: Archetypes ────────────────────────────────────────────────

  /**
   * Register an entity archetype — a named template of default components.
   * @param {string} name - Archetype name (e.g. 'mob', 'item', 'npc')
   * @param {object} componentDefaults - { componentName: defaultData, ... }
   */
  function createEntityArchetype(name, componentDefaults) {
    archetypes.set(name, { components: componentDefaults });
  }

  /**
   * Spawn an entity from an archetype, applying default components.
   * @param {string} archetype - Archetype name
   * @param {number[]} pos - [x, y, z]
   * @param {object} [opts] - Same as spawnEntity opts
   * @returns {object} entity
   */
  function spawnEntityFromArchetype(archetype, pos, opts = {}) {
    const arch = archetypes.get(archetype);
    if (!arch) return spawnEntity(archetype, pos, opts);
    const ent = spawnEntity(opts.type || archetype, pos, opts);
    // Apply archetype default components (deep-copy plain objects)
    for (const [compName, defaultData] of Object.entries(arch.components)) {
      const data =
        typeof defaultData === 'object' && defaultData !== null
          ? JSON.parse(JSON.stringify(defaultData))
          : defaultData;
      setEntityComponent(ent.id, compName, data);
    }
    return ent;
  }

  // ─── ECS: Built-in Archetypes ───────────────────────────────────────

  createEntityArchetype('mob', {
    physics: { gravity: true, friction: 0.8 },
    health: { current: 10, max: 10 },
    collider: { width: 0.8, height: 1.8, depth: 0.8 },
    animation: { state: 'idle', frame: 0, speed: 1 },
  });

  createEntityArchetype('item', {
    physics: { gravity: true, friction: 0.9 },
    collider: { width: 0.4, height: 0.4, depth: 0.4 },
    pickup: { radius: 1.5, autoPickup: true },
    bobble: { amplitude: 0.15, speed: 2 },
  });

  createEntityArchetype('projectile', {
    physics: { gravity: false, friction: 1.0 },
    collider: { width: 0.2, height: 0.2, depth: 0.2 },
    damage: { amount: 5, piercing: false },
    lifetime: { remaining: 5.0 },
  });

  createEntityArchetype('npc', {
    physics: { gravity: true, friction: 0.8 },
    health: { current: 20, max: 20 },
    collider: { width: 0.8, height: 1.8, depth: 0.8 },
    animation: { state: 'idle', frame: 0, speed: 1 },
    interact: { radius: 3.0, dialogue: null },
    pathfind: { target: null, path: null, speed: 2.0 },
  });

  createEntityArchetype('vehicle', {
    physics: { gravity: true, friction: 0.95 },
    collider: { width: 2.0, height: 1.5, depth: 4.0 },
    mount: { rider: null, speed: 10.0, turnSpeed: 2.0 },
  });

  // ─── A* Pathfinding on Voxel Grid ──────────────────────────────────

  /**
   * A* pathfinding on the voxel grid. Finds a walkable path between two positions.
   * Solid blocks are obstacles; entities walk ON top of solid blocks.
   * @param {number[]} startPos - [x, y, z] start world position
   * @param {number[]} endPos - [x, y, z] goal world position
   * @param {object} [opts] - Options:
   *   maxSteps: number — max nodes to explore (default 1000)
   *   maxFall: number — max blocks entity can fall (default 3)
   *   maxJump: number — max blocks entity can jump up (default 1)
   *   width: number — entity width for clearance checks (default 1)
   *   height: number — entity height for clearance checks (default 2)
   * @returns {number[][]|null} Array of [x,y,z] waypoints or null if no path
   */
  function findPath(startPos, endPos, opts = {}) {
    const maxSteps = opts.maxSteps || 1000;
    const maxFall = opts.maxFall || 3;
    const maxJump = opts.maxJump || 1;
    const eWidth = opts.width || 1;
    const eHeight = opts.height || 2;

    const sx = Math.floor(startPos[0]);
    const sy = Math.floor(startPos[1]);
    const sz = Math.floor(startPos[2]);
    const ex = Math.floor(endPos[0]);
    const ey = Math.floor(endPos[1]);
    const ez = Math.floor(endPos[2]);

    // Check if a column at (x,z) is walkable at height y:
    // Needs solid ground at y-1 and clear space from y to y+eHeight-1
    function isWalkable(x, y, z) {
      // Must have solid ground below
      const ground = getBlock(x, y - 1, z);
      if (!ground || ground === 0) return false;
      if (!registry.isSolid(ground)) return false; // water etc not solid ground
      // Must have clearance above
      for (let h = 0; h < eHeight; h++) {
        const above = getBlock(x, y + h, z);
        if (above && above !== 0) {
          if (registry.isSolid(above)) return false;
        }
      }
      return true;
    }

    // Find standing Y at (x,z) near targetY — scan up and down
    function findStandingY(x, z, targetY) {
      // Check exact first
      if (isWalkable(x, targetY, z)) return targetY;
      // Scan down (falling)
      for (let dy = 1; dy <= maxFall; dy++) {
        if (isWalkable(x, targetY - dy, z)) return targetY - dy;
      }
      // Scan up (jumping)
      for (let dy = 1; dy <= maxJump; dy++) {
        if (isWalkable(x, targetY + dy, z)) return targetY + dy;
      }
      return -1;
    }

    // Start must be walkable — find standing Y
    const startY = findStandingY(sx, sz, sy);
    if (startY < 0) return null;
    const goalY = findStandingY(ex, ez, ey);
    if (goalY < 0) return null;

    // Node key
    function nodeKey(x, y, z) {
      return `${x},${y},${z}`;
    }

    // Heuristic: Manhattan-ish with Y cost
    function heuristic(x, y, z) {
      return Math.abs(x - ex) + Math.abs(y - goalY) * 2 + Math.abs(z - ez);
    }

    // Priority queue (binary min-heap)
    const openHeap = [];
    const openSet = new Map(); // key -> { x, y, z, g, f, parent }
    const closedSet = new Set();

    function heapPush(node) {
      openHeap.push(node);
      let i = openHeap.length - 1;
      while (i > 0) {
        const pi = (i - 1) >> 1;
        if (openHeap[pi].f <= openHeap[i].f) break;
        [openHeap[pi], openHeap[i]] = [openHeap[i], openHeap[pi]];
        i = pi;
      }
    }

    function heapPop() {
      const top = openHeap[0];
      const last = openHeap.pop();
      if (openHeap.length > 0) {
        openHeap[0] = last;
        let i = 0;
        let swapped = true;
        while (swapped) {
          swapped = false;
          let smallest = i;
          const l = 2 * i + 1;
          const r = 2 * i + 2;
          if (l < openHeap.length && openHeap[l].f < openHeap[smallest].f) smallest = l;
          if (r < openHeap.length && openHeap[r].f < openHeap[smallest].f) smallest = r;
          if (smallest !== i) {
            [openHeap[i], openHeap[smallest]] = [openHeap[smallest], openHeap[i]];
            i = smallest;
            swapped = true;
          }
        }
      }
      return top;
    }

    // 4-directional neighbors (no diagonal to keep it simple & correct)
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    const startKey = nodeKey(sx, startY, sz);
    const startNode = {
      x: sx,
      y: startY,
      z: sz,
      g: 0,
      f: heuristic(sx, startY, sz),
      parentKey: null,
    };
    openSet.set(startKey, startNode);
    heapPush(startNode);

    let steps = 0;
    while (openHeap.length > 0 && steps < maxSteps) {
      steps++;
      const current = heapPop();
      const ck = nodeKey(current.x, current.y, current.z);

      if (current.x === ex && current.z === ez && current.y === goalY) {
        // Reconstruct path
        const path = [];
        let node = current;
        while (node) {
          path.push([node.x + 0.5, node.y, node.z + 0.5]); // center of block
          node = node.parentKey
            ? openSet.get(node.parentKey) || closedSet._nodes?.get(node.parentKey)
            : null;
        }
        path.reverse();
        return path;
      }

      closedSet.add(ck);
      if (!closedSet._nodes) closedSet._nodes = new Map();
      closedSet._nodes.set(ck, current);

      for (const [dx, dz] of dirs) {
        const nx = current.x + dx;
        const nz = current.z + dz;
        const ny = findStandingY(nx, nz, current.y);
        if (ny < 0) continue;

        // Check jump/fall limits relative to current
        const yDiff = ny - current.y;
        if (yDiff > maxJump || yDiff < -maxFall) continue;

        // Width clearance for wider entities
        if (eWidth > 1) {
          let blocked = false;
          for (let wx = 0; wx < eWidth && !blocked; wx++) {
            for (let wz = 0; wz < eWidth && !blocked; wz++) {
              if (wx === 0 && wz === 0) continue;
              if (!isWalkable(nx + wx, ny, nz + wz)) blocked = true;
            }
          }
          if (blocked) continue;
        }

        const nk = nodeKey(nx, ny, nz);
        if (closedSet.has(nk)) continue;

        const g = current.g + 1 + Math.abs(yDiff) * 0.5;
        const existing = openSet.get(nk);
        if (existing && existing.g <= g) continue;

        const node = { x: nx, y: ny, z: nz, g, f: g + heuristic(nx, ny, nz), parentKey: ck };
        openSet.set(nk, node);
        heapPush(node);
      }
    }

    return null; // No path found
  }

  // ─── Schematics: Region Export / Import ─────────────────────────────

  /**
   * Export a rectangular region of blocks as an RLE-compressed ArrayBuffer.
   * Format: [version:u8][sizeX:u16][sizeY:u16][sizeZ:u16] + RLE body
   * RLE body: pairs of [blockId:u8, runLength:u16] (little-endian)
   * @param {number} x1 - Start X (inclusive)
   * @param {number} y1 - Start Y (inclusive)
   * @param {number} z1 - Start Z (inclusive)
   * @param {number} x2 - End X (inclusive)
   * @param {number} y2 - End Y (inclusive)
   * @param {number} z2 - End Z (inclusive)
   * @returns {ArrayBuffer} Compressed schematic data
   */
  function exportRegion(x1, y1, z1, x2, y2, z2) {
    // Normalize so min <= max
    const minX = Math.min(x1, x2);
    const minY = Math.max(0, Math.min(y1, y2));
    const minZ = Math.min(z1, z2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.min(CHUNK_HEIGHT - 1, Math.max(y1, y2));
    const maxZ = Math.max(z1, z2);
    const sizeX = maxX - minX + 1;
    const sizeY = maxY - minY + 1;
    const sizeZ = maxZ - minZ + 1;

    // Collect all blocks in X→Z→Y order (matches typical schematic convention)
    const totalBlocks = sizeX * sizeY * sizeZ;
    const raw = new Uint8Array(totalBlocks);
    let idx = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          raw[idx++] = getBlock(x, y, z);
        }
      }
    }

    // RLE encode: [blockId, runLength(u16)] pairs
    // Max run length = 65535 to fit in u16
    const rleData = [];
    let ri = 0;
    while (ri < totalBlocks) {
      const block = raw[ri];
      let run = 1;
      while (ri + run < totalBlocks && raw[ri + run] === block && run < 65535) {
        run++;
      }
      rleData.push(block, run);
      ri += run;
    }

    // Build ArrayBuffer: header(7 bytes) + rle(3 bytes per pair)
    const headerSize = 7;
    const buf = new ArrayBuffer(headerSize + (rleData.length / 2) * 3);
    const view = new DataView(buf);
    view.setUint8(0, 1); // version
    view.setUint16(1, sizeX, true);
    view.setUint16(3, sizeY, true);
    view.setUint16(5, sizeZ, true);

    let offset = headerSize;
    for (let i = 0; i < rleData.length; i += 2) {
      view.setUint8(offset, rleData[i]); // blockId
      view.setUint16(offset + 1, rleData[i + 1], true); // runLength
      offset += 3;
    }

    return buf;
  }

  /**
   * Import a schematic (from exportRegion) at a world position.
   * @param {ArrayBuffer} data - Schematic data from exportRegion
   * @param {number} x - Paste origin X
   * @param {number} y - Paste origin Y
   * @param {number} z - Paste origin Z
   * @param {object} [opts] - Options:
   *   skipAir: boolean — don't overwrite with air blocks (default false)
   * @returns {{ placed: number, sizeX: number, sizeY: number, sizeZ: number }}
   */
  function importRegion(data, x, y, z, opts = {}) {
    const skipAir = opts.skipAir || false;
    const view = new DataView(data);
    const version = view.getUint8(0);
    if (version !== 1) return { placed: 0, sizeX: 0, sizeY: 0, sizeZ: 0 };

    const sizeX = view.getUint16(1, true);
    const sizeY = view.getUint16(3, true);
    const sizeZ = view.getUint16(5, true);

    // Decode RLE and place blocks
    let offset = 7;
    let placed = 0;
    let bx = 0;
    let by = 0;
    let bz = 0;

    while (offset < data.byteLength) {
      const blockId = view.getUint8(offset);
      const runLength = view.getUint16(offset + 1, true);
      offset += 3;

      for (let r = 0; r < runLength; r++) {
        if (!(skipAir && blockId === 0)) {
          const wx = x + bx;
          const wy = y + by;
          const wz = z + bz;
          if (wy >= 0 && wy < CHUNK_HEIGHT) {
            setBlock(wx, wy, wz, blockId);
            placed++;
          }
        }
        // Advance in X→Z→Y order
        bx++;
        if (bx >= sizeX) {
          bx = 0;
          bz++;
          if (bz >= sizeZ) {
            bz = 0;
            by++;
          }
        }
      }
    }

    return { placed, sizeX, sizeY, sizeZ };
  }

  /**
   * Import a MagicaVoxel .vox file into the voxel world.
   * Fetches the file, parses voxel data, maps palette colors to block types,
   * and places blocks at the given world coordinates.
   *
   * @param {string} url - URL of the .vox file
   * @param {number} x - World X origin
   * @param {number} y - World Y origin
   * @param {number} z - World Z origin
   * @param {object} [options]
   * @param {boolean} [options.registerColors=false] - Auto-register new block types from .vox palette
   * @param {object} [options.palette] - Map of .vox color index (1-255) to block type ID
   * @returns {Promise<{width,height,depth,voxelCount,blocksPlaced}>}
   */
  async function importVoxModel(url, x = 0, y = 0, z = 0, options = {}) {
    const { VOXLoader } = await import('three/examples/jsm/loaders/VOXLoader.js');

    const buffer = await fetch(url).then(r => {
      if (!r.ok) throw new Error(`Failed to fetch .vox file: ${r.status} ${r.statusText}`);
      return r.arrayBuffer();
    });

    const loader = new VOXLoader();
    const result = loader.parse(buffer);
    const chunks = result.chunks;
    if (!chunks || chunks.length === 0)
      return { width: 0, height: 0, depth: 0, voxelCount: 0, blocksPlaced: 0 };

    const paletteMap = options.palette || {};
    const autoRegister = options.registerColors === true;
    const registeredColors = {}; // colorIndex → blockTypeId (for auto-register)
    let nextAutoId = 200; // start auto-registered block IDs at 200

    // Find the next available block ID for auto-registration
    if (autoRegister) {
      for (let id = 200; id < 256; id++) {
        const existing = registry.get(id);
        if (!existing || existing.name === 'unknown') {
          nextAutoId = id;
          break;
        }
      }
    }

    let totalPlaced = 0;
    let totalVoxels = 0;
    let maxW = 0,
      maxH = 0,
      maxD = 0;

    for (const chunk of chunks) {
      const { data, size, palette } = chunk;
      const sx = size.x,
        sy = size.y,
        sz = size.z;
      maxW = Math.max(maxW, sx);
      maxH = Math.max(maxH, sz); // .vox Z is up → world Y
      maxD = Math.max(maxD, sy);

      for (let j = 0; j < data.length; j += 4) {
        const vx = data[j + 0];
        const vy = data[j + 1];
        const vz = data[j + 2];
        const colorIdx = data[j + 3];

        totalVoxels++;

        // Map .vox coordinates to world coordinates
        // VOX: X right, Y forward, Z up → World: X right, Y up, Z forward
        const wx = x + vx;
        const wy = y + vz;
        const wz = z + vy;

        if (wy < 0 || wy >= CHUNK_HEIGHT) continue;

        let blockType;
        if (paletteMap[colorIdx] !== undefined) {
          blockType = paletteMap[colorIdx];
        } else if (autoRegister) {
          if (registeredColors[colorIdx] === undefined) {
            // Extract RGB from palette (ABGR format)
            const hex = palette[colorIdx];
            const r = (hex >> 0) & 0xff;
            const g = (hex >> 8) & 0xff;
            const b = (hex >> 16) & 0xff;
            const color = (r << 16) | (g << 8) | b;

            if (nextAutoId < 256) {
              registry.register(nextAutoId, {
                name: `vox_color_${colorIdx}`,
                color,
                solid: true,
              });
              registeredColors[colorIdx] = nextAutoId;
              nextAutoId++;
            } else {
              // Fallback to closest existing block type
              registeredColors[colorIdx] = findClosestBlockType(palette[colorIdx]);
            }
          }
          blockType = registeredColors[colorIdx];
        } else {
          blockType = findClosestBlockType(palette[colorIdx]);
        }

        setBlock(wx, wy, wz, blockType);
        totalPlaced++;
      }
    }

    return {
      width: maxW,
      height: maxH,
      depth: maxD,
      voxelCount: totalVoxels,
      blocksPlaced: totalPlaced,
    };
  }

  // Find the closest registered block type by RGB color distance
  function findClosestBlockType(paletteHex) {
    const r = (paletteHex >> 0) & 0xff;
    const g = (paletteHex >> 8) & 0xff;
    const b = (paletteHex >> 16) & 0xff;

    let bestId = BLOCK_TYPES.STONE; // fallback
    let bestDist = Infinity;

    for (let id = 1; id < 256; id++) {
      const info = registry.get(id);
      if (!info || !info.color || info.name === 'unknown') continue;
      const br = (info.color >> 16) & 0xff;
      const bg = (info.color >> 8) & 0xff;
      const bb = info.color & 0xff;
      const dist = (r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestId = id;
      }
    }
    return bestId;
  }

  /**
   * Export the entire modified world as a JSON-serializable object.
   * Only includes chunks that have been loaded/modified.
   * @returns {object} { version, seed, chunks: [...] }
   */
  function exportWorldJSON() {
    const chunkData = [];
    for (const [key, chunk] of chunks) {
      // RLE-encode the chunk's block data
      const blocks = chunk.blocks;
      const rle = [];
      let i = 0;
      while (i < blocks.length) {
        const block = blocks[i];
        let run = 1;
        while (i + run < blocks.length && blocks[i + run] === block && run < 65535) {
          run++;
        }
        rle.push(block, run);
        i += run;
      }
      // Also encode fluid levels if any non-zero
      let hasFluid = false;
      for (let fi = 0; fi < chunk.fluidLevel.length; fi++) {
        if (chunk.fluidLevel[fi] !== 0) {
          hasFluid = true;
          break;
        }
      }
      let fluidRle = null;
      if (hasFluid) {
        fluidRle = [];
        let fi = 0;
        while (fi < chunk.fluidLevel.length) {
          const lvl = chunk.fluidLevel[fi];
          let run = 1;
          while (
            fi + run < chunk.fluidLevel.length &&
            chunk.fluidLevel[fi + run] === lvl &&
            run < 65535
          ) {
            run++;
          }
          fluidRle.push(lvl, run);
          fi += run;
        }
      }
      chunkData.push({
        key,
        cx: chunk.chunkX,
        cz: chunk.chunkZ,
        rle,
        fluidRle,
      });
    }
    return {
      version: 1,
      seed: worldSeed,
      chunkSize: CHUNK_SIZE,
      chunkHeight: CHUNK_HEIGHT,
      seaLevel: SEA_LEVEL,
      chunks: chunkData,
    };
  }

  /**
   * Import a world from JSON (from exportWorldJSON).
   * Replaces all current world data.
   * @param {object} json - World data from exportWorldJSON
   * @returns {{ chunksLoaded: number }}
   */
  function importWorldJSON(json) {
    if (!json || json.version !== 1) return { chunksLoaded: 0 };

    // Reset current world state (preserves workers & archetypes)
    resetWorld();

    // Restore config
    if (json.seed !== undefined) {
      worldSeed = json.seed;
      noise = createSimplexNoise(worldSeed);
    }
    if (json.chunkSize !== undefined) CHUNK_SIZE = json.chunkSize;
    if (json.chunkHeight !== undefined) CHUNK_HEIGHT = json.chunkHeight;
    if (json.seaLevel !== undefined) SEA_LEVEL = json.seaLevel;

    let chunksLoaded = 0;
    for (const cd of json.chunks) {
      const chunk = new Chunk(cd.cx, cd.cz);

      // Decode RLE blocks
      let bi = 0;
      for (let ri = 0; ri < cd.rle.length; ri += 2) {
        const blockId = cd.rle[ri];
        const run = cd.rle[ri + 1];
        for (let r = 0; r < run && bi < chunk.blocks.length; r++) {
          chunk.blocks[bi++] = blockId;
        }
      }

      // Decode fluid RLE if present
      if (cd.fluidRle) {
        let fi = 0;
        for (let ri = 0; ri < cd.fluidRle.length; ri += 2) {
          const lvl = cd.fluidRle[ri];
          const run = cd.fluidRle[ri + 1];
          for (let r = 0; r < run && fi < chunk.fluidLevel.length; r++) {
            chunk.fluidLevel[fi++] = lvl;
          }
        }
      }

      chunk.dirty = true;
      chunk.lightDirty = true;
      chunks.set(cd.key, chunk);
      chunksLoaded++;
    }

    return { chunksLoaded };
  }

  // ─── Configuration ──────────────────────────────────────────────────────

  function configureWorld(opts = {}) {
    if (opts.seed !== undefined) {
      worldSeed = opts.seed;
      noise = createSimplexNoise(worldSeed);
    }
    if (opts.chunkSize !== undefined) CHUNK_SIZE = opts.chunkSize;
    if (opts.chunkHeight !== undefined) CHUNK_HEIGHT = opts.chunkHeight;
    if (opts.renderDistance !== undefined) RENDER_DISTANCE = opts.renderDistance;
    if (opts.seaLevel !== undefined) SEA_LEVEL = opts.seaLevel;
    if (opts.generateTerrain !== undefined) customTerrainGenerator = opts.generateTerrain;
    if (opts.dayTime !== undefined) setDayTime(opts.dayTime);
    if (opts.maxTerrainGenPerFrame !== undefined)
      maxTerrainGenPerFrame = opts.maxTerrainGenPerFrame;
    if (opts.maxMeshRebuildsPerFrame !== undefined)
      maxMeshRebuildsPerFrame = opts.maxMeshRebuildsPerFrame;
    // Performance feature toggles — mark chunks dirty when visual settings change
    let needsRemesh = false;
    if (opts.enableAO !== undefined && opts.enableAO !== enableAO) {
      enableAO = opts.enableAO;
      needsRemesh = true;
    }
    if (opts.enableLighting !== undefined && opts.enableLighting !== enableLighting) {
      enableLighting = opts.enableLighting;
      needsRemesh = true;
    }
    if (opts.enableCaves !== undefined) enableCaves = opts.enableCaves;
    if (opts.enableOres !== undefined) enableOres = opts.enableOres;
    if (opts.enableTrees !== undefined) enableTrees = opts.enableTrees;
    if (opts.enableShadows !== undefined && opts.enableShadows !== enableShadows) {
      enableShadows = opts.enableShadows;
      needsRemesh = true;
    }
    if (opts.enableFluids !== undefined) enableFluids = opts.enableFluids;
    if (opts.enableAsyncMeshing !== undefined) {
      enableAsyncMeshing = !!opts.enableAsyncMeshing;
      if (enableAsyncMeshing) initMeshWorkers();
    }
    if (opts.enableLOD !== undefined) {
      const wasLOD = enableLOD;
      enableLOD = !!opts.enableLOD;
      if (wasLOD !== enableLOD) needsRemesh = true;
    }
    if (
      opts.lodDistances !== undefined &&
      Array.isArray(opts.lodDistances) &&
      opts.lodDistances.length >= 2
    ) {
      lodDistances = [opts.lodDistances[0], opts.lodDistances[1]];
      if (enableLOD) needsRemesh = true;
    }
    // When visual settings change, mark all loaded chunks for rebuild
    if (needsRemesh && meshWorkers.length > 0) syncRegistryToWorkers();
    if (needsRemesh) {
      for (const chunk of chunks.values()) {
        chunk.dirty = true;
        if (enableLighting) chunk.lightDirty = true;
      }
    }
  }

  // Return current world configuration (useful for debug HUDs and perf tuning)
  function getWorldConfig() {
    return {
      chunkSize: CHUNK_SIZE,
      chunkHeight: CHUNK_HEIGHT,
      renderDistance: RENDER_DISTANCE,
      seaLevel: SEA_LEVEL,
      maxTerrainGenPerFrame,
      maxMeshRebuildsPerFrame,
      enableAO,
      enableLighting,
      enableCaves,
      enableOres,
      enableTrees,
      enableShadows,
      atlasEnabled,
      enableFluids,
      enableAsyncMeshing,
      asyncMeshPending: pendingAsyncMeshes.size,
      enableLOD,
      lodDistances: [lodDistances[0], lodDistances[1]],
      chunkCount: chunks.size,
      meshCount: chunkMeshes.size,
      queueLength: chunkQueue.length,
    };
  }

  // Set time of day (0.0 = midnight, 0.5 = noon, 1.0 = midnight)
  // Affects sky light brightness. Only re-meshes when lighting changes visibly.
  function setDayTime(t) {
    // Convert 0..1 cycle to brightness: noon=1.0, midnight=0.15
    const angle = t * Math.PI * 2;
    const newFactor = Math.max(0.15, Math.sin(angle) * 0.5 + 0.5);
    // Only mark chunks dirty if lighting changed enough to be visible
    if (Math.abs(newFactor - dayTimeFactor) < 0.005) return;
    dayTimeFactor = newFactor;
    for (const chunk of chunks.values()) {
      chunk.dirty = true;
    }
  }

  // Get the effective light level at a world position (0-15)
  function getLightLevel(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return MAX_LIGHT;
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunkIfExists(chunkX, chunkZ);
    if (!chunk) return MAX_LIGHT;
    if (chunk.lightDirty) propagateLighting(chunk);
    return Math.round(
      Math.max(
        chunk.getSkyLight(localX, y, localZ) * dayTimeFactor,
        chunk.getBlockLight(localX, y, localZ)
      )
    );
  }

  // Find the highest solid block at a given (x,z) position
  function getHighestBlock(x, z) {
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunk(chunkX, chunkZ);
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const id = chunk.getBlock(localX, y, localZ);
      if (id !== BLOCK_TYPES.AIR && id !== BLOCK_TYPES.WATER) return y;
    }
    return 0;
  }

  // Get biome name at world position (for HUD display)
  function getBiome(x, z) {
    const temperature = noise.fbm2D(x + worldSeed, z + worldSeed, 2, 0.5, 2.0, 0.005);
    const moisture = noise.fbm2D(x + 1000 + worldSeed, z + 1000 + worldSeed, 2, 0.5, 2.0, 0.003);

    if (temperature < 0.2) return 'Frozen Tundra';
    if (temperature < 0.35 && moisture > 0.5) return 'Taiga';
    if (temperature > 0.7 && moisture < 0.25) return 'Desert';
    if (temperature > 0.6 && moisture > 0.6) return 'Jungle';
    if (moisture < 0.3) return 'Savanna';
    if (temperature > 0.4 && moisture > 0.4) return 'Forest';
    if (temperature < 0.35) return 'Snowy Hills';
    return 'Plains';
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  return {
    BLOCK_TYPES,
    CHUNK_SIZE,
    CHUNK_HEIGHT,
    registry,

    // World management
    updateChunks,
    forceLoadChunks,
    getBlock,
    setBlock,
    getHighestBlock,
    getBiome,

    // Block interaction
    raycastBlock,
    checkCollision,
    checkFluid,

    // Physics
    moveEntity,

    // Lighting
    getLightLevel,
    setDayTime,

    // Structures
    placeTree,

    // Persistence
    saveWorld,
    loadWorld,
    listWorlds,
    deleteWorld,

    // Texture Atlas
    enableTextureAtlas,
    loadCustomAtlas,

    // Entity System
    spawnEntity,
    removeEntity,
    getEntity,
    damageEntity,
    healEntity,
    updateEntities,
    getEntitiesInRadius,
    getEntitiesByType,
    getEntityCount,
    cleanupEntities,

    // ECS Components & Archetypes
    setEntityComponent,
    getEntityComponent,
    hasEntityComponent,
    removeEntityComponent,
    queryEntities,
    createEntityArchetype,
    spawnEntityFromArchetype,
    findPath,

    // Schematics
    exportRegion,
    importRegion,
    exportWorldJSON,
    importWorldJSON,

    // Fluids
    setFluidSource,
    removeFluidSource,
    getFluidLevel: getFluidLevelWorld,

    // World reset & config
    resetWorld,
    configureWorld,
    getWorldConfig,
    terminateMeshWorkers,

    // Noise (exposed for carts)
    noise,

    // os9-shell compatibility aliases
    createVoxelEngine: configureWorld,
    voxelSet: setBlock,
    voxelGet: getBlock,
    voxelClear: resetWorld,
    voxelRender: updateChunks,

    // Expose to global game context
    exposeTo: function (g) {
      g.BLOCK_TYPES = BLOCK_TYPES;
      g.updateVoxelWorld = updateChunks;
      g.forceLoadVoxelChunks = forceLoadChunks;
      g.getVoxelBlock = getBlock;
      g.setVoxelBlock = setBlock;
      g.raycastVoxelBlock = raycastBlock;
      g.checkVoxelCollision = checkCollision;
      g.checkVoxelFluid = checkFluid;
      g.moveVoxelEntity = moveEntity;
      g.placeVoxelTree = placeTree;
      g.resetVoxelWorld = resetWorld;
      g.configureVoxelWorld = configureWorld;
      g.getVoxelConfig = getWorldConfig;
      g.getVoxelHighestBlock = getHighestBlock;
      g.getVoxelBiome = getBiome;
      g.getVoxelLightLevel = getLightLevel;
      g.setVoxelDayTime = setDayTime;
      g.saveVoxelWorld = saveWorld;
      g.loadVoxelWorld = loadWorld;
      g.listVoxelWorlds = listWorlds;
      g.deleteVoxelWorld = deleteWorld;
      g.registerVoxelBlock = registry.register;
      g.getVoxelBlockShape = registry.getShape;
      g.getVoxelBlockBoundingBox = registry.getBoundingBox;
      g.isVoxelBlockFullCube = registry.isFullCube;
      g.VOXEL_SHAPE_BBOXES = registry.SHAPE_BBOXES;
      g.enableVoxelTextures = enableTextureAtlas;
      g.loadVoxelTextureAtlas = loadCustomAtlas;
      g.spawnVoxelEntity = spawnEntity;
      g.removeVoxelEntity = removeEntity;
      g.getVoxelEntity = getEntity;
      g.damageVoxelEntity = damageEntity;
      g.healVoxelEntity = healEntity;
      g.updateVoxelEntities = updateEntities;
      g.getVoxelEntitiesInRadius = getEntitiesInRadius;
      g.getVoxelEntitiesByType = getEntitiesByType;
      g.getVoxelEntityCount = getEntityCount;
      g.cleanupVoxelEntities = cleanupEntities;
      g.setVoxelEntityComponent = setEntityComponent;
      g.getVoxelEntityComponent = getEntityComponent;
      g.hasVoxelEntityComponent = hasEntityComponent;
      g.removeVoxelEntityComponent = removeEntityComponent;
      g.queryVoxelEntities = queryEntities;
      g.createVoxelEntityArchetype = createEntityArchetype;
      g.spawnVoxelEntityFromArchetype = spawnEntityFromArchetype;
      g.findVoxelPath = findPath;
      g.exportVoxelRegion = exportRegion;
      g.importVoxelRegion = importRegion;
      g.exportVoxelWorldJSON = exportWorldJSON;
      g.importVoxelWorldJSON = importWorldJSON;
      g.simplexNoise2D = noise.fbm2D;
      g.simplexNoise3D = noise.fbm3D;
      g.setVoxelFluidSource = setFluidSource;
      g.removeVoxelFluidSource = removeFluidSource;
      g.getVoxelFluidLevel = getFluidLevelWorld;
      g.importVoxModel = importVoxModel;
    },
  };
}
