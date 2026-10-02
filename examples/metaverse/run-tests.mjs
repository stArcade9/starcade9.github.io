// Aggregating runner for the metaverse cart-side tests. Auto-discovers every
// *.test.mjs in this folder, runs each in its own node process (they install
// their own global `nova64` mock, so isolation matters), and prints a summary.
// Exits non-zero if any fail. Run: node run-tests.mjs  (or pnpm test:metaverse)

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(here)
  .filter(f => f.endsWith('.test.mjs'))
  .sort();

let failed = 0;
for (const t of tests) {
  const r = spawnSync(process.execPath, [join(here, t)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const last = out.trim().split('\n').filter(Boolean).pop() || '(no output)';
  if (r.status === 0) {
    console.log(`  ok    ${t.padEnd(22)} ${last}`);
  } else {
    failed++;
    console.log(`  FAIL  ${t}`);
    process.stdout.write(out.endsWith('\n') ? out : out + '\n');
  }
}

console.log(`\n${tests.length - failed}/${tests.length} metaverse test files passed`);
process.exit(failed ? 1 : 0);
