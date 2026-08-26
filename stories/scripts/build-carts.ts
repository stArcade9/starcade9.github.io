// Compiles each story's Nova64 chapter carts (content/<story>/chapters/<cartModule>/cart.ts)
// into standalone ESM files under public/carts/<story>/<chapterId>.js, matching the
// `cartUrl` shape returned by GET /api/experience/[token] in stories.md.
//
// Carts are loaded in the browser via native dynamic import() (see runtime/console.js
// Nova64.loadCart), so each output file must be a self-contained ES module — no
// Next.js/webpack bundling involved. esbuild handles TS + any local imports; the
// global `nova64` namespace is provided by the synced runtime at page load time and
// is intentionally left external (carts reference it as a global, never import it).
import { build } from 'esbuild';
import { readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(here, '..', 'content');
const outDir = path.resolve(here, '..', 'public', 'carts');
const minify = process.argv.includes('--minify');

function storyDirs(): string[] {
  if (!existsSync(contentDir)) return [];
  return readdirSync(contentDir).filter((name) => statSync(path.join(contentDir, name)).isDirectory());
}

async function main() {
  const stories = storyDirs();
  if (stories.length === 0) {
    console.log('[build-carts] no story content directories found, nothing to build');
    return;
  }

  let built = 0;
  for (const storyId of stories) {
    const manifestPath = path.join(contentDir, storyId, 'manifest.ts');
    if (!existsSync(manifestPath)) {
      console.warn(`[build-carts] skipping ${storyId}: no manifest.ts`);
      continue;
    }
    const mod = await import(pathToFileURL(manifestPath).href);
    const manifest = mod.default ?? mod.manifest;
    if (!manifest?.chapters) {
      console.warn(`[build-carts] skipping ${storyId}: manifest has no chapters export`);
      continue;
    }

    for (const chapter of manifest.chapters) {
      const entry = path.join(contentDir, storyId, 'chapters', chapter.cartModule, 'cart.ts');
      if (!existsSync(entry)) {
        console.warn(`[build-carts] missing cart entry for ${storyId}/${chapter.id}: ${entry}`);
        continue;
      }
      const outfile = path.join(outDir, storyId, `${chapter.id}.js`);
      await build({
        entryPoints: [entry],
        outfile,
        bundle: true,
        format: 'esm',
        target: 'es2022',
        minify,
        logLevel: 'silent',
      });
      built += 1;
      console.log(`[build-carts] ${storyId}/${chapter.id} -> ${path.relative(process.cwd(), outfile)}`);
    }
  }
  console.log(`[build-carts] done (${built} chapter cart${built === 1 ? '' : 's'} built)`);
}

main().catch((err) => {
  console.error('[build-carts] failed:', err);
  process.exit(1);
});
