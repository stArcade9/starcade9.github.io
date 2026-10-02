#!/usr/bin/env node
// Guards the pages that boot the Nova64 runtime straight from source.
//
// console.html loads a Vite-built bundle, so bundler features work there. But
// demo-embed.html, player.html and babylon_console.html load /src/main.js raw,
// with no build step — every specifier must resolve through the page's own
// <script type="importmap">, and no bundler-only syntax may run.
//
// Three separate outages came from breaking that contract (@babylonjs/core,
// @supabase/supabase-js, import.meta.glob), each one a blank screen with a
// single console error. Run this after touching runtime/ or src/main.js:
//
//     node tools/check-raw-source.mjs
//
// See docs/RAW_SOURCE_PAGES.md for the why.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const ENTRY = 'src/main.js';
const PAGES = ['demo-embed.html', 'player.html', 'babylon_console.html'];

// Matches only STATIC import/export-from. Dynamic import() is intentionally
// ignored: making a dependency lazy is precisely how you keep an optional
// bare specifier from taking down the whole module graph.
const STATIC =
  /^\s*(?:import\s+(?:[^'"]*?\sfrom\s+)?|export\s+(?:\*|\{[^}]*\})\s+from\s+)['"]([^'"]+)['"]/gm;

// Bundler-only syntax. Vite rewrites these at build time; raw in a browser they
// are undefined and throw. `import.meta.env` is excluded — it is merely
// undefined rather than a call, so the existing `typeof`/`&&` guards handle it.
const BUNDLER_ONLY = /import\.meta\.(glob|hot)\b/;

function walk(entry) {
  const seen = new Set();
  const bare = new Map();
  const stack = [normalize(entry)];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const [, spec] of src.matchAll(STATIC)) {
      if (spec.startsWith('/')) stack.push(normalize(spec.slice(1)));
      else if (spec.startsWith('.')) stack.push(normalize(join(dirname(file), spec)));
      else {
        if (!bare.has(spec)) bare.set(spec, new Set());
        bare.get(spec).add(file);
      }
    }
  }
  return { files: [...seen].sort(), bare };
}

function importMap(page) {
  const m = readFileSync(page, 'utf8').match(
    /<script type="importmap">\s*(\{[\s\S]*?\})\s*<\/script>/
  );
  return m ? JSON.parse(m[1]).imports ?? {} : {};
}

const resolves = (spec, imports) =>
  spec in imports || Object.keys(imports).some((k) => k.endsWith('/') && spec.startsWith(k));

function main() {
  const { files, bare } = walk(ENTRY);
  let failed = false;

  console.log(`Static module graph from ${ENTRY}: ${files.length} local files`);
  console.log(`Bare specifiers reached statically: ${[...bare.keys()].sort().join(', ') || 'none'}\n`);

  for (const page of PAGES) {
    if (!existsSync(page)) continue;
    const imports = importMap(page);
    const missing = [...bare.keys()].filter((s) => !resolves(s, imports));
    console.log(`  ${page.padEnd(24)} ${missing.length ? `UNRESOLVED: ${missing.join(', ')}` : 'ok'}`);
    for (const spec of missing) {
      failed = true;
      for (const f of [...bare.get(spec)].sort()) console.log(`      ${spec}  <- ${f}`);
    }
  }

  // Heuristic: bundler-only syntax must sit inside a try block so the raw-source
  // path can fall back. Cheap to fool, but it catches the regression that matters.
  console.log('');
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.trimStart().startsWith('//') || !BUNDLER_ONLY.test(line)) return;
      const guarded = lines.slice(Math.max(0, i - 4), i).some((l) => l.includes('try {'));
      console.log(`  ${guarded ? 'guarded ' : 'UNGUARDED'} ${file}:${i + 1}  ${line.trim().slice(0, 70)}`);
      if (!guarded) failed = true;
    });
  }

  console.log(failed ? '\nFAIL' : '\nPASS — raw-source pages can boot the runtime');
  process.exit(failed ? 1 : 0);
}

main();
