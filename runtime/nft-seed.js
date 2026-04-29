// ─── Nova64 NFT Seed System ────────────────────────────────────────────
// Deterministic world/art generation from token IDs, hashes, or numbers.
// Same seed = same output, always.

/**
 * FNV-1a hash: convert any string (hex hash, token ID, etc.) to a 32-bit seed.
 * Handles 0x prefix, arbitrary-length strings.
 */
function createSeedFromHash(hashString) {
  const str = String(hashString).replace(/^0x/i, '');
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0; // unsigned 32-bit
}

/**
 * Create a seeded PRNG object with rich utility methods.
 * Uses xoshiro128** for high-quality, fast randomness.
 */
function createSeedRNG(seed) {
  // Initialize xoshiro128** state from seed via splitmix32
  let s = seed >>> 0;
  function splitmix32() {
    s = (s + 0x9e3779b9) | 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  }
  let s0 = splitmix32();
  let s1 = splitmix32();
  let s2 = splitmix32();
  let s3 = splitmix32();

  function rotl(x, k) {
    return ((x << k) | (x >>> (32 - k))) >>> 0;
  }

  function next() {
    const result = (rotl(Math.imul(s1, 5), 7) * 9) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 11);
    return result;
  }

  const rng = {
    /** Original seed value */
    seed,

    /** Returns float in [0, 1) */
    random() {
      return next() / 4294967296;
    },

    /** Returns integer in [min, max] inclusive */
    range(min, max) {
      return min + Math.floor(rng.random() * (max - min + 1));
    },

    /** Returns float in [min, max) */
    float(min, max) {
      return min + rng.random() * (max - min);
    },

    /** Pick a random element from array */
    pick(array) {
      return array[Math.floor(rng.random() * array.length)];
    },

    /** Fisher-Yates shuffle, returns new array */
    shuffle(array) {
      const a = array.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },

    /** Gaussian distribution via Box-Muller transform */
    gaussian(mean = 0, stddev = 1) {
      let u, v, s;
      do {
        u = rng.random() * 2 - 1;
        v = rng.random() * 2 - 1;
        s = u * u + v * v;
      } while (s >= 1 || s === 0);
      const mul = Math.sqrt((-2 * Math.log(s)) / s);
      return mean + stddev * u * mul;
    },

    /** Random hex color (0x000000 - 0xffffff) */
    color() {
      return next() & 0xffffff;
    },

    /** Weighted boolean */
    bool(probability = 0.5) {
      return rng.random() < probability;
    },

    /** Generate a color palette of n harmonious colors from seed */
    palette(n = 5) {
      const baseHue = rng.random() * 360;
      const saturation = rng.float(0.5, 1.0);
      const lightness = rng.float(0.4, 0.7);
      const colors = [];
      const strategy = rng.range(0, 3);
      for (let i = 0; i < n; i++) {
        let hue;
        switch (strategy) {
          case 0: // analogous
            hue = (baseHue + i * 30) % 360;
            break;
          case 1: // complementary spread
            hue = (baseHue + i * (360 / n)) % 360;
            break;
          case 2: // triadic with variation
            hue = (baseHue + (i % 3) * 120 + Math.floor(i / 3) * 15) % 360;
            break;
          default: // split complementary
            hue = (baseHue + (i % 2 === 0 ? 0 : 150 + (i - 1) * 30)) % 360;
        }
        const s = saturation + rng.float(-0.15, 0.15);
        const l = lightness + rng.float(-0.15, 0.15);
        colors.push(hslToHex(hue, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l))));
      }
      return colors;
    },

    /** Weighted pick from array using weights */
    weightedPick(items, weights) {
      const total = weights.reduce((a, b) => a + b, 0);
      let r = rng.random() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    },
  };

  return rng;
}

/** HSL to hex color (h: 0-360, s: 0-1, l: 0-1) → 0xRRGGBB */
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const ri = Math.round((r + m) * 255);
  const gi = Math.round((g + m) * 255);
  const bi = Math.round((b + m) * 255);
  return (ri << 16) | (gi << 8) | bi;
}

/**
 * Map a seed to traits using a schema definition.
 * Schema: { traitName: { values, weights?, type?, min?, max? }, ... }
 */
function seedToTraits(seed, traitSchema) {
  const rng = createSeedRNG(seed);
  const traits = {};
  const keys = Object.keys(traitSchema);
  for (const key of keys) {
    const def = traitSchema[key];
    if (def.type === 'float') {
      traits[key] = rng.float(def.min ?? 0, def.max ?? 1);
    } else if (def.type === 'int') {
      traits[key] = rng.range(def.min ?? 0, def.max ?? 100);
    } else if (def.type === 'bool') {
      traits[key] = rng.bool(def.probability ?? 0.5);
    } else if (def.values) {
      if (def.weights) {
        traits[key] = rng.weightedPick(def.values, def.weights);
      } else {
        traits[key] = rng.pick(def.values);
      }
    }
  }
  return traits;
}

/**
 * Export ERC-721/1155 compatible metadata JSON.
 */
function exportSeedMetadata(seed, traits, opts = {}) {
  const {
    name = `Nova64 World #${seed}`,
    description = `Procedurally generated from seed ${seed}`,
    image = '',
    collection = 'Nova64',
    version = '0.2.8',
  } = opts;

  const attributes = Object.entries(traits).map(([key, value]) => ({
    trait_type: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    value: typeof value === 'number' ? Math.round(value * 1000) / 1000 : value,
  }));

  return JSON.stringify(
    {
      name,
      description,
      image,
      attributes,
      properties: {
        seed: typeof seed === 'string' ? seed : seed.toString(),
        engine: 'nova64',
        version,
        collection,
        generated: new Date().toISOString(),
      },
    },
    null,
    2
  );
}

// ─── Global seed management ────────────────────────────────────────────

let _globalSeed = null;
let _globalRNG = null;

/**
 * Set the global seed for all Nova64 subsystems.
 * Accepts a number or a hash string (auto-converts via FNV-1a).
 */
function setSeed(hashOrNumber) {
  if (typeof hashOrNumber === 'string') {
    _globalSeed = createSeedFromHash(hashOrNumber);
  } else {
    _globalSeed = hashOrNumber >>> 0;
  }
  _globalRNG = createSeedRNG(_globalSeed);

  // Notify voxel engine if available
  if (typeof globalThis.configureVoxelWorld === 'function') {
    globalThis.configureVoxelWorld({ seed: _globalSeed });
  }

  return _globalSeed;
}

/**
 * Get the current global seed (null if not set).
 */
function getSeed() {
  return _globalSeed;
}

/**
 * Get the global RNG instance (null if setSeed not called).
 */
function getSeedRNG() {
  return _globalRNG;
}

// ─── Module export ─────────────────────────────────────────────────────

export function nftSeedApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        createSeedFromHash,
        createSeedRNG,
        seedToTraits,
        exportSeedMetadata,
        setSeed,
        getSeed,
        getSeedRNG,
      });
    },
  };
}
