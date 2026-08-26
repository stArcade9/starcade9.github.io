import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cartUrl,
  computeNextUnlockAt,
  effectiveUnlockDelaySeconds,
  getChapter,
  getFirstChapter,
  getNextChapter,
  getStoryManifest,
} from '@/lib/registry';
import type { ChapterManifestEntry } from '@/content/types';

const STORY_ID = 'coastal-signal';

describe('registry', () => {
  it('resolves the seeded coastal-signal story', () => {
    const story = getStoryManifest(STORY_ID);
    expect(story?.storyId).toBe(STORY_ID);
    expect(story?.chapters.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null for an unregistered story', () => {
    expect(getStoryManifest('does-not-exist')).toBeNull();
  });

  it('orders the first chapter by manifest order, not array position', () => {
    const first = getFirstChapter(STORY_ID);
    expect(first?.id).toBe('chapter-01');
    expect(first?.order).toBe(1);
  });

  it('walks to the next chapter in order', () => {
    const next = getNextChapter(STORY_ID, 'chapter-01');
    expect(next?.id).toBe('chapter-02');
  });

  it('returns null past the last chapter', () => {
    expect(getNextChapter(STORY_ID, 'chapter-02')).toBeNull();
  });

  it('returns null for an unknown current chapter id', () => {
    expect(getNextChapter(STORY_ID, 'chapter-99')).toBeNull();
  });

  it('builds the documented cartUrl shape', () => {
    expect(cartUrl(STORY_ID, 'chapter-02')).toBe('/carts/coastal-signal/chapter-02.js');
  });

  it('finds a chapter by id', () => {
    expect(getChapter(STORY_ID, 'chapter-02')?.title).toBe('Low Tide');
    expect(getChapter(STORY_ID, 'nope')).toBeNull();
  });

  describe('effectiveUnlockDelaySeconds', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('uses the manifest delay when no dev override is set', () => {
      vi.stubEnv('DEV_UNLOCK_DELAY_SECONDS', '');
      vi.stubEnv('NODE_ENV', 'development');
      const chapter = getChapter(STORY_ID, 'chapter-02')!;
      expect(effectiveUnlockDelaySeconds(chapter)).toBe(86400);
    });

    it('applies the dev override outside production', () => {
      vi.stubEnv('DEV_UNLOCK_DELAY_SECONDS', '15');
      vi.stubEnv('NODE_ENV', 'development');
      const chapter = getChapter(STORY_ID, 'chapter-02')!;
      expect(effectiveUnlockDelaySeconds(chapter)).toBe(15);
    });

    it('ignores the dev override in production', () => {
      vi.stubEnv('DEV_UNLOCK_DELAY_SECONDS', '15');
      vi.stubEnv('NODE_ENV', 'production');
      const chapter = getChapter(STORY_ID, 'chapter-02')!;
      expect(effectiveUnlockDelaySeconds(chapter)).toBe(86400);
    });
  });

  describe('computeNextUnlockAt', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    // effectiveUnlockDelaySeconds honors DEV_UNLOCK_DELAY_SECONDS outside
    // production (by design, see the describe block above) — a developer's
    // .env.local commonly sets it, so pin the env explicitly here rather than
    // let this test depend on ambient ("real manifest delay") state.
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('completing into an immediate-policy chapter unlocks it right away (test #3)', () => {
      vi.stubEnv('DEV_UNLOCK_DELAY_SECONDS', '');
      vi.stubEnv('NODE_ENV', 'production');
      const immediateChapter: ChapterManifestEntry = {
        id: 'chapter-x',
        order: 2,
        title: 'X',
        unlockPolicy: 'immediate',
        cartModule: 'x',
      };
      expect(computeNextUnlockAt(immediateChapter, now)).toBeNull();
    });

    it('completing into a countdown-policy chapter sets the correct unlock timestamp (test #4)', () => {
      vi.stubEnv('DEV_UNLOCK_DELAY_SECONDS', '');
      vi.stubEnv('NODE_ENV', 'production');
      const countdownChapter: ChapterManifestEntry = {
        id: 'chapter-y',
        order: 2,
        title: 'Y',
        unlockPolicy: 'countdown',
        unlockDelaySeconds: 3600,
        cartModule: 'y',
      };
      const result = computeNextUnlockAt(countdownChapter, now);
      expect(result?.toISOString()).toBe('2026-01-01T01:00:00.000Z');
    });

    it('returns null when there is no next chapter (story finished)', () => {
      expect(computeNextUnlockAt(null, now)).toBeNull();
    });
  });
});
