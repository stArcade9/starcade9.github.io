import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findExperienceByToken, startCurrentChapter } from '@/lib/experience';
import { resolveOrCreateVisitor, VISITOR_COOKIE_NAME } from '@/lib/visitor';
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit';
import { log } from '@/lib/log';

const ERROR_STATUS: Record<string, number> = {
  disabled: 403,
  missing_chapter: 404,
  chapter_locked: 409,
  finished: 409,
};

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const experience = await findExperienceByToken(token);
  if (!experience) {
    log.warn('chapter.start.not_found', { token });
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const { visitor, cookieValueToSet } = await resolveOrCreateVisitor(cookieStore.get(VISITOR_COOKIE_NAME)?.value);

  try {
    await checkRateLimit(`start:${visitor.id}`, 30);
  } catch (err) {
    if (err instanceof RateLimitError) {
      log.warn('chapter.start.rate_limited', { token, visitorId: visitor.id });
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(err.retryAfterSeconds) } },
      );
    }
    throw err;
  }

  const result = await startCurrentChapter(experience, visitor.id);
  if ('error' in result) {
    log.warn('chapter.start.denied', { token, visitorId: visitor.id, error: result.error });
  } else {
    log.info('chapter.start.ok', { token, visitorId: visitor.id, chapterId: result.chapter.id });
  }
  const response =
    'error' in result
      ? NextResponse.json({ error: result.error }, { status: ERROR_STATUS[result.error] ?? 400 })
      : NextResponse.json(result);

  if (cookieValueToSet) {
    response.cookies.set(VISITOR_COOKIE_NAME, cookieValueToSet, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 2,
    });
  }

  return response;
}
