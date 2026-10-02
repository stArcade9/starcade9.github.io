import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { rateLimitEvents } from '@/db/schema';

const WINDOW_SECONDS = 60;

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super('rate limit exceeded');
  }
}

/**
 * Fixed-window rate limiter backed by Postgres (rate_limit_events), so
 * mutation endpoints don't need a separate Redis/Upstash account just to run
 * on the free tier. `key` should identify the actor + route, e.g.
 * `complete:${visitorId}`. Throws RateLimitError when the limit is exceeded.
 */
export async function checkRateLimit(key: string, limit: number): Promise<void> {
  const windowStart = new Date(Math.floor(Date.now() / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS * 1000);

  const [row] = await db
    .insert(rateLimitEvents)
    .values({ bucketKey: key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitEvents.bucketKey, rateLimitEvents.windowStart],
      set: { count: sql`${rateLimitEvents.count} + 1` },
    })
    .returning();

  if (row && row.count > limit) {
    const retryAfterSeconds = WINDOW_SECONDS - Math.floor((Date.now() - windowStart.getTime()) / 1000);
    throw new RateLimitError(Math.max(retryAfterSeconds, 1));
  }
}
