import '../scripts/env';

// Integration tests need a real DATABASE_URL and are skipped without one
// (see tests/integration/*.test.ts) — unit tests don't touch this at all.
if (!process.env.SIGNING_SECRET) {
  process.env.SIGNING_SECRET = 'test-signing-secret-not-for-production';
}
