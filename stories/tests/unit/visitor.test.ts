import { describe, expect, it } from 'vitest';
import { buildVisitorCookieValue } from '@/lib/visitor';

describe('buildVisitorCookieValue', () => {
  it('produces an "identifier.signature" value', () => {
    const cookie = buildVisitorCookieValue('some-identifier');
    const parts = cookie.split('.');
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(cookie.startsWith('some-identifier.')).toBe(true);
  });

  it('is deterministic for the same identifier and secret', () => {
    expect(buildVisitorCookieValue('same-id')).toBe(buildVisitorCookieValue('same-id'));
  });

  it('differs for different identifiers', () => {
    expect(buildVisitorCookieValue('id-a')).not.toBe(buildVisitorCookieValue('id-b'));
  });
});
