import { describe, expect, it } from 'vitest';
import { deriveChapterSeed, deriveExperienceSeed, mulberry32 } from '@/lib/seed';

describe('deriveExperienceSeed', () => {
  it('is deterministic for the same token', () => {
    const token = 'abc123-example-token';
    expect(deriveExperienceSeed(token)).toBe(deriveExperienceSeed(token));
  });

  it('differs across distinct tokens (no trivial collisions in a small sample)', () => {
    const seeds = new Set(Array.from({ length: 200 }, (_, i) => deriveExperienceSeed(`token-${i}`)));
    expect(seeds.size).toBe(200);
  });

  it('always produces a non-negative 31-bit integer', () => {
    for (let i = 0; i < 50; i++) {
      const seed = deriveExperienceSeed(`token-${i}`);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0x7fffffff);
    }
  });
});

describe('deriveChapterSeed', () => {
  it('is deterministic for the same (experienceSeed, chapterId) pair', () => {
    const experienceSeed = deriveExperienceSeed('some-token');
    expect(deriveChapterSeed(experienceSeed, 'chapter-01')).toBe(deriveChapterSeed(experienceSeed, 'chapter-01'));
  });

  it('differs between chapters of the same experience', () => {
    const experienceSeed = deriveExperienceSeed('some-token');
    expect(deriveChapterSeed(experienceSeed, 'chapter-01')).not.toBe(deriveChapterSeed(experienceSeed, 'chapter-02'));
  });

  it('differs between the same chapter id across different experiences', () => {
    const seedA = deriveExperienceSeed('token-a');
    const seedB = deriveExperienceSeed('token-b');
    expect(deriveChapterSeed(seedA, 'chapter-01')).not.toBe(deriveChapterSeed(seedB, 'chapter-01'));
  });
});

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces values within [0, 1)', () => {
    const rand = mulberry32(999);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
