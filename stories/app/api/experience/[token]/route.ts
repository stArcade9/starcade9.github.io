import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildExperienceState, findExperienceByToken } from '@/lib/experience';
import { resolveOrCreateVisitor, VISITOR_COOKIE_NAME } from '@/lib/visitor';
import { log } from '@/lib/log';

const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2; // 2 years — permanent-token experience

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const experience = await findExperienceByToken(token);
  if (!experience) {
    log.warn('experience.not_found', { token });
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const { visitor, cookieValueToSet } = await resolveOrCreateVisitor(cookieStore.get(VISITOR_COOKIE_NAME)?.value);

  const state = await buildExperienceState(experience, visitor.id);
  if ('error' in state) {
    log.warn('experience.state_error', { token, visitorId: visitor.id, error: state.error });
  }
  const response =
    'error' in state
      ? NextResponse.json({ error: state.error }, { status: state.error === 'disabled' ? 403 : 404 })
      : NextResponse.json(state);

  if (cookieValueToSet) {
    response.cookies.set(VISITOR_COOKIE_NAME, cookieValueToSet, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
