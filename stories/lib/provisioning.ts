import { randomBytes } from 'node:crypto';
import { db } from '@/db/client';
import { experiences } from '@/db/schema';
import { deriveExperienceSeed } from '@/lib/seed';

function generateToken(): string {
  // 128 bits of entropy, URL-safe. Never a DB id, email, or credential —
  // this opaque token is the only thing that ever appears in a QR URL.
  return randomBytes(16).toString('base64url');
}

/**
 * Inserts one new experience with a fresh cryptographically-random token and
 * its deterministic seed, retrying on the astronomically unlikely case of a
 * token collision. Shared by scripts/provision.ts (the QR-batch CLI) and
 * db/seed-dev.ts (local dev seed data).
 */
export async function createExperience(storyId: string): Promise<typeof experiences.$inferSelect> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateToken();
    const seed = deriveExperienceSeed(token);
    const [row] = await db
      .insert(experiences)
      .values({ publicToken: token, seed, storyId })
      .onConflictDoNothing({ target: experiences.publicToken })
      .returning();
    if (row) return row;
  }
  throw new Error('failed to generate a unique token after 5 attempts');
}
