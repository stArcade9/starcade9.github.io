import { pgTable, pgEnum, uuid, text, integer, timestamp, unique, index } from 'drizzle-orm/pg-core';

export const experienceStatus = pgEnum('experience_status', ['active', 'disabled']);

export const experiences = pgTable(
  'experiences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicToken: text('public_token').notNull(),
    // Deterministic function of publicToken (see lib/seed.ts) — stored for fast reads,
    // reproducible from the token alone if this row were ever lost.
    seed: integer('seed').notNull(),
    storyId: text('story_id').notNull(),
    status: experienceStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('experiences_public_token_key').on(table.publicToken)],
);

export const visitors = pgTable(
  'visitors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Opaque token stored in the visitor's signed cookie; never a raw DB id.
    signedIdentifier: text('signed_identifier').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('visitors_signed_identifier_key').on(table.signedIdentifier)],
);

export const progress = pgTable(
  'progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    experienceId: uuid('experience_id')
      .notNull()
      .references(() => experiences.id, { onDelete: 'cascade' }),
    visitorId: uuid('visitor_id')
      .notNull()
      .references(() => visitors.id, { onDelete: 'cascade' }),
    // Null means the visitor has completed every chapter currently in the manifest.
    currentChapterId: text('current_chapter_id'),
    // Set once (by POST .../start) the first time the current chapter is entered;
    // copied onto chapter_completions.started_at when that chapter completes.
    currentChapterStartedAt: timestamp('current_chapter_started_at', { withTimezone: true }),
    nextUnlockAt: timestamp('next_unlock_at', { withTimezone: true }),
    firstStartedAt: timestamp('first_started_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('progress_experience_visitor_key').on(table.experienceId, table.visitorId),
    index('progress_experience_id_idx').on(table.experienceId),
  ],
);

export const chapterCompletions = pgTable(
  'chapter_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    progressId: uuid('progress_id')
      .notNull()
      .references(() => progress.id, { onDelete: 'cascade' }),
    chapterId: text('chapter_id').notNull(),
    completionId: text('completion_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // A chapter cannot be completed twice for the same progress record.
    unique('chapter_completions_progress_chapter_key').on(table.progressId, table.chapterId),
    // A client-generated completionId cannot be replayed against a different chapter.
    unique('chapter_completions_progress_completion_key').on(table.progressId, table.completionId),
  ],
);

// Minimal fixed-window rate limiter backed by Postgres, so mutation endpoints
// (start/complete) don't need a separate Redis/Upstash account on the free tier.
export const rateLimitEvents = pgTable(
  'rate_limit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bucketKey: text('bucket_key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(1),
  },
  (table) => [unique('rate_limit_events_bucket_window_key').on(table.bucketKey, table.windowStart)],
);
