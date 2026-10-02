import { randomBytes, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { visitors } from '@/db/schema';

export const VISITOR_COOKIE_NAME = 'sc9_visitor';

function signingSecret(): string {
  const secret = process.env.SIGNING_SECRET;
  if (!secret) throw new Error('SIGNING_SECRET is not set (see .env.example)');
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', signingSecret()).update(value).digest('base64url');
}

function verify(value: string, signature: string): boolean {
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function buildVisitorCookieValue(signedIdentifier: string): string {
  return `${signedIdentifier}.${sign(signedIdentifier)}`;
}

/** Returns the signed identifier from a cookie value, or null if missing/tampered. */
function readSignedIdentifier(cookieValue: string | undefined | null): string | null {
  if (!cookieValue) return null;
  const separatorIndex = cookieValue.lastIndexOf('.');
  if (separatorIndex <= 0) return null;
  const identifier = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  return verify(identifier, signature) ? identifier : null;
}

export interface ResolvedVisitor {
  visitor: typeof visitors.$inferSelect;
  /** Set only when a new cookie needs to be written (new visitor, or cookie was missing/invalid). */
  cookieValueToSet: string | null;
}

/**
 * Resolve the visitor from an incoming cookie value, creating a new anonymous
 * visitor if the cookie is missing or fails signature verification. Always
 * touches last_seen_at. The caller is responsible for actually setting the
 * cookie (via next/headers `cookies()`) when cookieValueToSet is non-null.
 */
export async function resolveOrCreateVisitor(cookieValue: string | undefined | null): Promise<ResolvedVisitor> {
  const identifier = readSignedIdentifier(cookieValue);

  if (identifier) {
    const [existing] = await db
      .update(visitors)
      .set({ lastSeenAt: new Date() })
      .where(eq(visitors.signedIdentifier, identifier))
      .returning();
    if (existing) {
      return { visitor: existing, cookieValueToSet: null };
    }
    // Signature was valid but no matching row (e.g. DB reset) — fall through and mint a new visitor.
  }

  const newIdentifier = `${randomUUID()}${randomBytes(8).toString('hex')}`;
  const [created] = await db.insert(visitors).values({ signedIdentifier: newIdentifier }).returning();
  if (!created) throw new Error('failed to create visitor');

  return { visitor: created, cookieValueToSet: buildVisitorCookieValue(newIdentifier) };
}
