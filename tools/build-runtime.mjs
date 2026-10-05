// Rebuild the static site's runtime bundle with dependencies from a Nova64 checkout.
// Usage: node tools/build-runtime.mjs /path/to/nova64
import { cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Pass a Nova64 checkout with installed dependencies.');
const dependencies = path.resolve(process.argv[2], 'node_modules');
const { build } = await import(pathToFileURL(path.join(dependencies, 'vite/dist/node/index.js')));
const stage = await mkdtemp(path.join(tmpdir(), 'nova64-site-build-'));
try {
  for (const dir of ['runtime', 'src']) await cp(path.join(site, dir), path.join(stage, dir), { recursive: true });
  // The manifest bundles cart metadata; game code and assets remain served by the site.
  for (const entry of await readdir(path.join(site, 'examples'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const meta = path.join(site, 'examples', entry.name, 'meta.json');
    try {
      const contents = await readFile(meta);
      const target = path.join(stage, 'examples', entry.name);
      await mkdir(target, { recursive: true });
      await writeFile(path.join(target, 'meta.json'), contents);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await symlink(dependencies, path.join(stage, 'node_modules'), 'dir');
  const result = await build({
    configFile: false, root: stage, base: './', publicDir: false,
    build: {
      target: 'es2022', sourcemap: true, minify: 'terser',
      outDir: path.join(stage, 'dist'),
      rollupOptions: { input: path.join(stage, 'src/main.js'), output: { entryFileNames: 'assets/main-[hash].js' } },
    },
  });
  const entry = result.output.find(item => item.type === 'chunk' && item.isEntry);
  if (!entry) throw new Error('Runtime entry bundle missing.');
  await cp(path.join(stage, 'dist/assets'), path.join(site, 'assets'), { recursive: true });
  for (const page of ['console.html', 'cart-runner.html', 'hero-embed.html']) {
    const file = path.join(site, page);
    const html = await readFile(file, 'utf8');
    if (!/\.\/assets\/main-[\w-]+\.js/.test(html)) throw new Error(`Runtime script missing in ${page}`);
    await writeFile(file, html.replace(/\.\/assets\/main-[\w-]+\.js/g, './' + entry.fileName));
  }
  console.log(`Updated static runtime: ${entry.fileName}`);
} finally {
  await rm(stage, { recursive: true, force: true });
}
