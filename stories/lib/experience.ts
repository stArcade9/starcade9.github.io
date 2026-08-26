import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { chapterCompletions, experiences, progress } from '@/db/schema';
import { cartUrl as buildCartUrl, computeNextUnlockAt, getChapter, getNextChapter, getStoryManifest } from '@/lib/registry';

export type ExperienceLookupError = 'not_found' | 'disabled' | 'missing_chapter';

export interface ExperienceState {
  serverTime: string;
  experience: { seed: number; storyId: string };
  chapter: {
    id: string | null;
    title: string;
    status: 'available' | 'locked' | 'finished';
    cartUrl?: string;
  };
  progress: {
    completedChapterIds: string[];
    nextUnlockAt: string | null;
  };
}

export async function findExperienceByToken(token: string) {
  const [row] = await db.select().from(experiences).where(eq(experiences.publicToken, token)).limit(1);
  return row ?? null;
}

export async function getOrCreateProgress(experienceId: string, visitorId: string, storyId: string) {
  const [existing] = await db
    .select()
    .from(progress)
    .where(and(eq(progress.experienceId, experienceId), eq(progress.visitorId, visitorId)))
    .limit(1);
  if (existing) return existing;

  const story = getStoryManifest(storyId);
  const first = story ? [...story.chapters].sort((a, b) => a.order - b.order)[0] : null;
  if (!first) throw new Error(`story "${storyId}" has no chapters`);

  const [created] = await db
    .insert(progress)
    .values({ experienceId, visitorId, currentChapterId: first.id })
    .onConflictDoNothing({ target: [progress.experienceId, progress.visitorId] })
    .returning();
  if (created) return created;

  // Lost the race to a concurrent request creating the same row for this visitor — read it back.
  const [row] = await db
    .select()
    .from(progress)
    .where(and(eq(progress.experienceId, experienceId), eq(progress.visitorId, visitorId)))
    .limit(1);
  if (!row) throw new Error('failed to resolve progress row after insert race');
  return row;
}

export async function buildExperienceState(
  experience: typeof experiences.$inferSelect,
  visitorId: string,
): Promise<ExperienceState | { error: ExperienceLookupError }> {
  if (experience.status === 'disabled') return { error: 'disabled' };

  const story = getStoryManifest(experience.storyId);
  if (!story) return { error: 'missing_chapter' };

  const progressRow = await getOrCreateProgress(experience.id, visitorId, experience.storyId);

  const completions = await db
    .select({ chapterId: chapterCompletions.chapterId })
    .from(chapterCompletions)
    .where(eq(chapterCompletions.progressId, progressRow.id))
    .orderBy(asc(chapterCompletions.completedAt));

  const serverTime = new Date();

  if (!progressRow.currentChapterId) {
    return {
      serverTime: serverTime.toISOString(),
      experience: { seed: experience.seed, storyId: experience.storyId },
      chapter: { id: null, title: 'Signal Complete', status: 'finished' },
      progress: {
        completedChapterIds: completions.map((c) => c.chapterId),
        nextUnlockAt: null,
      },
    };
  }

  const chapter = getChapter(experience.storyId, progressRow.currentChapterId);
  if (!chapter) return { error: 'missing_chapter' };

  const locked = Boolean(progressRow.nextUnlockAt && progressRow.nextUnlockAt.getTime() > serverTime.getTime());

  return {
    serverTime: serverTime.toISOString(),
    experience: { seed: experience.seed, storyId: experience.storyId },
    chapter: {
      id: chapter.id,
      title: chapter.title,
      status: locked ? 'locked' : 'available',
      ...(locked ? {} : { cartUrl: buildCartUrl(experience.storyId, chapter.id) }),
    },
    progress: {
      completedChapterIds: completions.map((c) => c.chapterId),
      nextUnlockAt: progressRow.nextUnlockAt ? progressRow.nextUnlockAt.toISOString() : null,
    },
  };
}

export type StartChapterError = ExperienceLookupError | 'chapter_locked' | 'finished';

/**
 * Idempotently marks the visitor's current chapter as started (sets
 * progress.currentChapterStartedAt on first call only) and returns the
 * resulting experience state. Called once the client has confirmed, via the
 * touch gesture, that it's about to load the chapter's cart.
 */
export async function startCurrentChapter(
  experience: typeof experiences.$inferSelect,
  visitorId: string,
): Promise<ExperienceState | { error: StartChapterError }> {
  if (experience.status === 'disabled') return { error: 'disabled' };

  const story = getStoryManifest(experience.storyId);
  if (!story) return { error: 'missing_chapter' };

  const progressRow = await getOrCreateProgress(experience.id, visitorId, experience.storyId);
  if (!progressRow.currentChapterId) return { error: 'finished' };

  const chapter = getChapter(experience.storyId, progressRow.currentChapterId);
  if (!chapter) return { error: 'missing_chapter' };

  const now = new Date();
  const locked = Boolean(progressRow.nextUnlockAt && progressRow.nextUnlockAt.getTime() > now.getTime());
  if (locked) return { error: 'chapter_locked' };

  if (!progressRow.currentChapterStartedAt) {
    await db
      .update(progress)
      .set({ currentChapterStartedAt: now, updatedAt: now })
      .where(and(eq(progress.id, progressRow.id), isNull(progress.currentChapterStartedAt)));
  }

  const state = await buildExperienceState(experience, visitorId);
  return state;
}

export type CompleteChapterError =
  | ExperienceLookupError
  | 'not_started'
  | 'finished'
  | 'chapter_locked'
  | 'unexpected_chapter'
  | 'completion_id_reused';

interface CompleteChapterOk {
  alreadyCompleted: boolean;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

/**
 * Validates and records a chapter completion, then advances progress and
 * computes nextUnlockAt — all inside one database transaction, per
 * stories.md's explicit requirement. Uses SELECT ... FOR UPDATE on the
 * progress row to serialize concurrent completion attempts for the same
 * visitor, plus the unique constraints on chapter_completions as a second
 * line of defense against a true race producing a duplicate row.
 */
export async function completeChapter(
  experience: typeof experiences.$inferSelect,
  visitorId: string,
  chapterId: string,
  completionId: string,
): Promise<CompleteChapterOk | { error: CompleteChapterError }> {
  if (experience.status === 'disabled') return { error: 'disabled' };

  const story = getStoryManifest(experience.storyId);
  if (!story) return { error: 'missing_chapter' };

  try {
    return await db.transaction(async (tx) => {
      const [progressRow] = await tx
        .select()
        .from(progress)
        .where(and(eq(progress.experienceId, experience.id), eq(progress.visitorId, visitorId)))
        .for('update');

      if (!progressRow) return { error: 'not_started' as const };
      if (!progressRow.currentChapterId) return { error: 'finished' as const };

      if (progressRow.currentChapterId !== chapterId) {
        const [existing] = await tx
          .select()
          .from(chapterCompletions)
          .where(and(eq(chapterCompletions.progressId, progressRow.id), eq(chapterCompletions.chapterId, chapterId)))
          .limit(1);
        if (existing && existing.completionId === completionId) {
          return { alreadyCompleted: true };
        }
        return { error: 'unexpected_chapter' as const };
      }

      const manifestChapter = getChapter(experience.storyId, chapterId);
      if (!manifestChapter) return { error: 'missing_chapter' as const };

      const now = new Date();
      const locked = Boolean(progressRow.nextUnlockAt && progressRow.nextUnlockAt.getTime() > now.getTime());
      if (locked) return { error: 'chapter_locked' as const };

      const [completionIdReuse] = await tx
        .select()
        .from(chapterCompletions)
        .where(
          and(eq(chapterCompletions.progressId, progressRow.id), eq(chapterCompletions.completionId, completionId)),
        )
        .limit(1);
      if (completionIdReuse) {
        return completionIdReuse.chapterId === chapterId
          ? { alreadyCompleted: true }
          : { error: 'completion_id_reused' as const };
      }

      await tx.insert(chapterCompletions).values({
        progressId: progressRow.id,
        chapterId,
        completionId,
        startedAt: progressRow.currentChapterStartedAt,
        completedAt: now,
      });

      const next = getNextChapter(experience.storyId, chapterId);
      const nextUnlockAt = computeNextUnlockAt(next, now);

      await tx
        .update(progress)
        .set({
          currentChapterId: next ? next.id : null,
          currentChapterStartedAt: null,
          nextUnlockAt,
          updatedAt: now,
        })
        .where(eq(progress.id, progressRow.id));

      return { alreadyCompleted: false };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Truly concurrent duplicate submission slipped past FOR UPDATE (e.g. a
      // second in-flight request from before the lock was held) — the row it
      // conflicted with is by definition this same completion, so treat as idempotent.
      return { alreadyCompleted: true };
    }
    throw err;
  }
}
