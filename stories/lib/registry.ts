import type { ChapterManifestEntry, StoryManifest } from '@/content/types';
import coastalSignal from '@/content/coastal-signal/manifest';

// Explicit registry rather than a dynamic import over content/<storyId> — keeps
// bundling predictable and makes "register a new story" a single obvious line.
// See stories/README.md for the full "launch a new story/shirt line" runbook.
const STORIES: Record<string, StoryManifest> = {
  [coastalSignal.storyId]: coastalSignal,
};

export function getStoryManifest(storyId: string): StoryManifest | null {
  return STORIES[storyId] ?? null;
}

function sortedChapters(story: StoryManifest): ChapterManifestEntry[] {
  return [...story.chapters].sort((a, b) => a.order - b.order);
}

export function getChapter(storyId: string, chapterId: string): ChapterManifestEntry | null {
  const story = getStoryManifest(storyId);
  return story?.chapters.find((c) => c.id === chapterId) ?? null;
}

export function getFirstChapter(storyId: string): ChapterManifestEntry | null {
  const story = getStoryManifest(storyId);
  if (!story) return null;
  return sortedChapters(story)[0] ?? null;
}

export function getNextChapter(storyId: string, currentChapterId: string): ChapterManifestEntry | null {
  const story = getStoryManifest(storyId);
  if (!story) return null;
  const chapters = sortedChapters(story);
  const index = chapters.findIndex((c) => c.id === currentChapterId);
  if (index === -1) return null;
  return chapters[index + 1] ?? null;
}

export function cartUrl(storyId: string, chapterId: string): string {
  return `/carts/${storyId}/${chapterId}.js`;
}

/**
 * Effective unlock delay for a chapter. In non-production environments,
 * DEV_UNLOCK_DELAY_SECONDS overrides every countdown chapter so the full
 * unlock flow can be tested without waiting up to 24 hours (stories.md
 * explicitly requires "shorter delays in development and automated tests").
 */
export function effectiveUnlockDelaySeconds(chapter: ChapterManifestEntry): number {
  const devOverride = process.env.DEV_UNLOCK_DELAY_SECONDS;
  if (process.env.NODE_ENV !== 'production' && devOverride) {
    const parsed = Number(devOverride);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return chapter.unlockDelaySeconds ?? 0;
}

/**
 * Pure unlock-time computation for a completion transitioning into `next`
 * (or null, if the story is finished). Extracted from completeChapter() so
 * both unlock policies can be unit tested without a database.
 */
export function computeNextUnlockAt(next: ChapterManifestEntry | null, now: Date): Date | null {
  if (!next || next.unlockPolicy !== 'countdown') return null;
  return new Date(now.getTime() + effectiveUnlockDelaySeconds(next) * 1000);
}
