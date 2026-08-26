// Integration tests against a real Postgres database (a Neon branch is ideal —
// see stories/README.md). Skipped automatically when DATABASE_URL isn't set,
// so `pnpm test` still passes in environments without a database configured;
// set DATABASE_URL (and run `pnpm db:migrate` against it first) to exercise
// these for real.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('experience flow (integration)', () => {
  let db: typeof import('@/db/client').db;
  let schema: typeof import('@/db/schema');
  let experienceLib: typeof import('@/lib/experience');
  let createdExperienceIds: string[] = [];
  let createdVisitorIds: string[] = [];

  beforeAll(async () => {
    db = (await import('@/db/client')).db;
    schema = await import('@/db/schema');
    experienceLib = await import('@/lib/experience');
  });

  afterAll(async () => {
    if (createdExperienceIds.length) {
      for (const id of createdExperienceIds) {
        await db.delete(schema.experiences).where(eq(schema.experiences.id, id));
      }
    }
    if (createdVisitorIds.length) {
      for (const id of createdVisitorIds) {
        await db.delete(schema.visitors).where(eq(schema.visitors.id, id));
      }
    }
  });

  async function makeExperience(overrides: Partial<typeof schema.experiences.$inferInsert> = {}) {
    const [row] = await db
      .insert(schema.experiences)
      .values({ publicToken: `test-${randomUUID()}`, seed: 12345, storyId: 'coastal-signal', ...overrides })
      .returning();
    createdExperienceIds.push(row!.id);
    return row!;
  }

  async function makeVisitor() {
    const [row] = await db
      .insert(schema.visitors)
      .values({ signedIdentifier: `test-visitor-${randomUUID()}` })
      .returning();
    createdVisitorIds.push(row!.id);
    return row!;
  }

  it('a valid token opens Chapter One (test #1)', async () => {
    const experience = await makeExperience();
    const visitor = await makeVisitor();
    const state = await experienceLib.buildExperienceState(experience, visitor.id);
    if ('error' in state) throw new Error(`unexpected error: ${state.error}`);
    expect(state.chapter.id).toBe('chapter-01');
    expect(state.chapter.status).toBe('available');
    expect(state.chapter.cartUrl).toBe('/carts/coastal-signal/chapter-01.js');
  });

  it('an invalid/disabled token produces an error result, not a crash (test #2)', async () => {
    const experience = await makeExperience({ status: 'disabled' });
    const visitor = await makeVisitor();
    const state = await experienceLib.buildExperienceState(experience, visitor.id);
    expect('error' in state && state.error).toBe('disabled');
  });

  it('completing chapter-01 creates a countdown for chapter-02 (test #4)', async () => {
    const experience = await makeExperience();
    const visitor = await makeVisitor();
    await experienceLib.startCurrentChapter(experience, visitor.id);

    const before = Date.now();
    const result = await experienceLib.completeChapter(experience, visitor.id, 'chapter-01', randomUUID());
    if ('error' in result) throw new Error(`unexpected error: ${result.error}`);

    const state = await experienceLib.buildExperienceState(experience, visitor.id);
    if ('error' in state) throw new Error(`unexpected error: ${state.error}`);
    expect(state.chapter.id).toBe('chapter-02');
    expect(state.chapter.status).toBe('locked');
    expect(state.progress.nextUnlockAt).not.toBeNull();
    expect(new Date(state.progress.nextUnlockAt!).getTime()).toBeGreaterThan(before);
  });

  it('repeated completion requests do not duplicate progress (test #7)', async () => {
    const experience = await makeExperience();
    const visitor = await makeVisitor();
    await experienceLib.startCurrentChapter(experience, visitor.id);
    const completionId = randomUUID();

    const first = await experienceLib.completeChapter(experience, visitor.id, 'chapter-01', completionId);
    const second = await experienceLib.completeChapter(experience, visitor.id, 'chapter-01', completionId);

    if ('error' in first) throw new Error(`unexpected error: ${first.error}`);
    if ('error' in second) throw new Error(`unexpected error: ${second.error}`);
    expect(first.alreadyCompleted).toBe(false);
    expect(second.alreadyCompleted).toBe(true);

    const completions = await db
      .select()
      .from(schema.chapterCompletions)
      .innerJoin(schema.progress, eq(schema.chapterCompletions.progressId, schema.progress.id))
      .where(eq(schema.progress.experienceId, experience.id));
    expect(completions.length).toBe(1);
  });

  it('a visitor cannot skip directly to a later chapter (test #8)', async () => {
    const experience = await makeExperience();
    const visitor = await makeVisitor();
    await experienceLib.startCurrentChapter(experience, visitor.id);

    const result = await experienceLib.completeChapter(experience, visitor.id, 'chapter-02', randomUUID());
    expect('error' in result && result.error).toBe('unexpected_chapter');
  });

  it('two anonymous visitors have separate progress for the same token (test #9)', async () => {
    const experience = await makeExperience();
    const visitorA = await makeVisitor();
    const visitorB = await makeVisitor();

    await experienceLib.startCurrentChapter(experience, visitorA.id);
    await experienceLib.completeChapter(experience, visitorA.id, 'chapter-01', randomUUID());

    const stateA = await experienceLib.buildExperienceState(experience, visitorA.id);
    const stateB = await experienceLib.buildExperienceState(experience, visitorB.id);
    if ('error' in stateA || 'error' in stateB) throw new Error('unexpected error state');

    expect(stateA.chapter.id).toBe('chapter-02'); // advanced
    expect(stateB.chapter.id).toBe('chapter-01'); // untouched
  });
});
