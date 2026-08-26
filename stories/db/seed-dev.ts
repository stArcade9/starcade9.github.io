// pnpm db:seed — creates one local test experience for the default story so
// you can walk the flow (GET/start/complete) without running the full
// provisioning CLI. Set DEV_UNLOCK_DELAY_SECONDS in .env.local to shorten
// countdown chapters while testing.
import '../scripts/env';
import { createExperience } from '../lib/provisioning';

async function main() {
  const storyId = process.env.SEED_STORY_ID || 'coastal-signal';
  const row = await createExperience(storyId);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  console.log(`[seed-dev] created experience for "${storyId}"`);
  console.log(`[seed-dev] token:  ${row.publicToken}`);
  console.log(`[seed-dev] seed:   ${row.seed}`);
  console.log(`[seed-dev] visit:  ${baseUrl}/x/${row.publicToken}`);
}

main().catch((err) => {
  console.error('[seed-dev] failed:', err);
  process.exit(1);
});
