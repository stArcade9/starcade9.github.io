// Copies the Nova64 engine from the repo root (../runtime) into public/nova64
// so this self-contained app can serve it statically without depending on
// the repo root at request time. Single source of truth stays at ../runtime;
// re-run this (via predev/prebuild) whenever the engine changes.
import { cpSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '..', '..', 'runtime');
const dest = path.resolve(here, '..', 'public', 'nova64');

if (!existsSync(source)) {
  console.error(`[sync-nova64] source not found: ${source}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(source, dest, { recursive: true });

console.log(`[sync-nova64] synced ${source} -> ${dest}`);
