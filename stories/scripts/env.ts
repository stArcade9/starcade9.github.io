// Plain `dotenv/config` only loads `.env` — `.env.local` is a Next.js-specific
// convention that `next dev`/`next build` handle for the app itself, but our
// standalone scripts (drizzle-kit, migrate, seed, provisioning) run outside
// Next.js, so they need to load it explicitly. .env.local takes precedence
// (loaded first; dotenv never overwrites an already-set var).
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) config({ path: file });
}
