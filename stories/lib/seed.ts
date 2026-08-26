// Deterministic seed derivation. The same public token must always resolve to
// the same experience seed, and the same (experienceSeed, chapterId) pair must
// always resolve to the same chapter seed — stories.md requires this to hold
// even if the DB row were ever regenerated, so seeds are pure hash functions
// of their inputs rather than independently-random values.

// FNV-1a 32-bit, masked into the range [0, 2^31 - 1] so results fit safely in
// both a JS number and a Postgres `integer` column.
function fnv1a31(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) & 0x7fffffff;
}

export function deriveExperienceSeed(publicToken: string): number {
  return fnv1a31(`experience:${publicToken}`);
}

export function deriveChapterSeed(experienceSeed: number, chapterId: string): number {
  return fnv1a31(`chapter:${experienceSeed}:${chapterId}`);
}

/**
 * mulberry32 — small, fast, seeded PRNG for reproducible chapter variation
 * (colors, geometry, particle formations, camera paths, ...). Returns a
 * function producing floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
