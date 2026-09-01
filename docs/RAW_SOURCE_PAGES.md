# Raw-source pages and the import-map contract

There are two different ways a page in this repo boots the Nova64 runtime, and
they have different rules. Mixing them up produces a blank screen and a single
console error, which is how three separate outages started.

## The two boot paths

| Page | Loads | Bundler transforms |
|---|---|---|
| `console.html`, `hero-embed.html` | `assets/main-*.js` (Vite build output) | yes |
| `demo-embed.html`, `player.html`, `babylon_console.html` | `/src/main.js` (raw source) | **no** |

The second group hands `src/main.js` and everything under `runtime/` straight to
the browser as ES modules. There is no build step, no bundler, and no dev server
doing rewrites — the repo root is served as static files (`python3 -m http.server`
locally, Vercel in production).

That imposes two rules on **all** code reachable from `src/main.js`:

### 1. Every static bare specifier must be in each page's import map

A browser cannot resolve `import x from 'three'` on its own. Each raw-source page
carries a `<script type="importmap">` mapping bare names to esm.sh URLs. Anything
statically reachable but unmapped fails resolution.

The failure mode is the important part: **module resolution happens before any
code runs, for the entire graph at once.** One unmapped specifier in one leaf
module aborts everything — including code paths that never touch it.

That is why `import { GpuBabylon }` at the top of `src/main.js` broke the *Three.js*
renderer. The backend was selected 70 lines later, but the graph never got that far:

```
demo-embed.html → /src/main.js → runtime/gpu-babylon.js
                → runtime/backends/babylon/bootstrap.js → '@babylonjs/core'  ✗
```

**Fix pattern:** if a dependency is optional, make the import dynamic. `await import()`
resolves at call time, so an unmapped specifier only fails if that path actually runs:

```js
if (_useBabylon) {
  const { GpuBabylon } = await import('../runtime/gpu-babylon.js');
}
```

`runtime/api-net.js` (colyseus) and `runtime/store.js` (zustand) already follow this,
and both additionally catch the failure and degrade — zustand falls back to a
hand-rolled polyfill, net reports unsupported. Neither is in any import map, and
neither needs to be.

### 2. No bundler-only syntax without a fallback

`import.meta.glob` is a Vite build-time macro, not a runtime function. Raw in a
browser it is `undefined` and calling it throws `(intermediate value).glob is not
a function`. `import.meta.env` is merely `undefined`, which is why the existing
`typeof import.meta !== 'undefined' && import.meta.env?.DEV` guards in
`runtime/logger.js` and `runtime/debug-logger.js` are fine as they are.

`runtime/manifest.js` wraps its glob in `try`/`catch`. Vite still rewrites the call
at build time, so bundled builds are unaffected; raw-source pages get an empty map.

Note the second half of that fix. The sidecar-`meta.json` fetch was gated on
`!basePath.startsWith('/examples/')` — deliberately, because a Vite build always
has example metadata bundled, so a miss meant the file genuinely did not exist and
fetching would only produce a 404. Without a build nothing is bundled, so guarding
the glob alone would have left every example cart silently manifest-less. The gate
is now `_hasBundledExampleMeta && …`, preserving the original intent in both modes.

## The checker

```bash
node tools/check-raw-source.mjs
```

Walks the static graph from `src/main.js` (77 files today), collects every bare
specifier reachable *without* going through a dynamic `import()`, and checks each
against all three raw-source pages' import maps. Then flags bundler-only syntax
that is not inside a `try`.

Run it after touching `runtime/` or `src/main.js`. It is fast, has no dependencies,
and would have caught two of the three outages before they shipped.

**Known limits.** It is a regex walker, not a parser: it will not follow a computed
path, and the `try`-block check looks back four lines. It also cannot tell you that
a mapped-but-eager dependency is a *performance* problem — a static
`import '@babylonjs/core'` now resolves (the mappings exist so `?backend=babylon`
works) and would be reported ok, while quietly pulling megabytes of Babylon onto
every page. Keep optional backends dynamic regardless of what the checker says.

## Babylon on raw-source pages

`babylon_console.html` and `?backend=babylon` need `@babylonjs/*` mapped, so
`demo-embed.html` and `babylon_console.html` both declare it (pinned to 9.4.1, matching
`docs/releases/v0.5.0.md`). `console.html` and `hero-embed.html` do not need it —
their bundle already contains what it needs.

## player.html

Minimal standalone player for any cart under `examples/`.

```
player.html?demoscene=f-zero-nova-3d
```

- `?demoscene=` is canonical. `?demo=` and `?cart=` are accepted aliases so links
  copied out of `console.html` / `demo-embed.html` keep working. The value is
  validated against `[A-Za-z0-9._-]+` — no slashes, no traversal.
- The dropdown lists all 96 example folders, grouped Showcase / Games / Demos & FX /
  Basics / Tests. A valid folder name that is not in the catalog is still accepted
  and shown as "Unlisted" — `src/main.js` falls back to `/examples/<name>/code.js`
  for any id missing from its `demoMap`.
- Nothing loads until the visitor clicks: the `<script type="module">` is injected
  on click, not at parse. The import map is in `<head>`, which is required — it must
  precede any module load.
- `src/main.js` reads its options off `window.location.search` at module-eval time
  and the param it looks for is `?demo=`. The player sets that plus `clearColor`
  just before injecting, then restores the `?demoscene=` URL on the script's `load`
  event (which fires after evaluation), so the address bar keeps the shareable form.
- **No `?w=`/`?h=` is passed.** Supplying them puts `main.js` into fixed-resolution
  mode; omitting them keeps the responsive `ResizeObserver` path so the cart fills
  the frame. `demo-embed.html` carries the same warning.
- Switching demos after boot navigates rather than hot-swapping. The runtime has no
  per-cart teardown hook, so a full reload is the only clean way to swap.

### Why the second click

Reaching the player from alpha.html's "Play demo" costs two clicks — one there, one
on the poster. That is deliberate: the new tab has no user gesture of its own, so
auto-booting would leave the Web Audio context suspended and the cart would run
silent. The poster click supplies the gesture.

## Adding a cart to the player

Drop it in `examples/<id>/code.js` and it is reachable at
`player.html?demoscene=<id>` immediately, via the path fallback. To get it into
the dropdown, add a row to the `DEMOS` array in `player.html`. A thumbnail at
`public/assets/cart-thumbs/<id>.png` becomes the poster background; without one
the poster falls back to a plain gradient (25 of 96 currently have no thumbnail).
