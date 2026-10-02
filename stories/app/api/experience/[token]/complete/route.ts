import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildExperienceState, completeChapter, findExperienceByToken } from '@/lib/experience';
import { resolveOrCreateVisitor, VISITOR_COOKIE_NAME } from '@/lib/visitor';
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit';
import { log } from '@/lib/log';

const ERROR_STATUS: Record<string, number> = {
  disabled: 403,
  missing_chapter: 404,
  not_started: 409,
  finished: 409,
  chapter_locked: 409,
  unexpected_chapter: 409,
  completion_id_reused: 409,
};

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const chapterId = typeof record.chapterId === 'string' ? record.chapterId : null;
  const completionId = typeof record.completionId === 'string' ? record.completionId : null;
  if (!chapterId || !completionId) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const experience = await findExperienceByToken(token);
  if (!experience) {
    log.warn('chapter.complete.not_found', { token });
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const { visitor, cookieValueToSet } = await resolveOrCreateVisitor(cookieStore.get(VISITOR_COOKIE_NAME)?.value);

  try {
    await checkRateLimit(`complete:${visitor.id}`, 30);
  } catch (err) {
    if (err instanceof RateLimitError) {
      log.warn('chapter.complete.rate_limited', { token, visitorId: visitor.id });
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(err.retryAfterSeconds) } },
      );
    }
    throw err;
  }

  const result = await completeChapter(experience, visitor.id, chapterId, completionId);
  if ('error' in result) {
    log.warn('chapter.complete.denied', { token, visitorId: visitor.id, chapterId, error: result.error });
  } else {
    log.info('chapter.complete.ok', {
      token,
      visitorId: visitor.id,
      chapterId,
      alreadyCompleted: result.alreadyCompleted,
    });
  }

  let response: NextResponse;
  if ('error' in result) {
    response = NextResponse.json({ error: result.error }, { status: ERROR_STATUS[result.error] ?? 400 });
  } else {
    const state = await buildExperienceState(experience, visitor.id);
    response = NextResponse.json('error' in state ? { error: state.error } : state);
  }

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
