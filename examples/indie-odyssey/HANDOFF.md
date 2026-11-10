# Indie Odyssey — Hand-off for Codex

Continuing the cart port + cross-backend combat work that landed in
commits `6c0a5f0` and `5f5e32b` on `main` (2026-06-18 / 19).

## What's done

### Cart (`examples/indie-odyssey/`)

- Full cross-backend port of *Indie Odyssey: Book One — Echoes of the
  Shardgrid* (originally `refrence/IndieOdyssey_1/`, a Babylon-only
  TypeScript project).
- Combat scene with a SkyboxBattleSceneManager-style purple sky, GLB
  enemy models (`dataImp.glb`, `glitchRat.glb`, `firewallSlime.glb`,
  `hexWraith.glb`), 2D HUD overlay (`combatSpriteCanvas` at z=12),
  sprite fallback when no GLB is available.
- Story-mode intro slides with pixel-melt transitions
  (`storyFrameCanvas` at z=13, `drawStory*` helpers).
- Random encounters during dungeon movement, autoplay gated on GLB
  resolution so enemies can't die before their model arrives.
- `__INDIE_ODYSSEY_DEBUG.forceCombat([...])` dev-console hook for
  triggering combat from any screen — also disables autoplay so the
  scene stays open for inspection.

### Engine

- `runtime/api-effects.js` — added `OutputPass` as the EffectComposer's
  terminal pass so adding/removing intermediate effect passes can't
  break canvas presentation. Added `fx.setEffectsBypass(bool)` and
  `fx.isEffectsBypassed()` plumbing (kept in the API even though
  indie-odyssey no longer uses bypass — other carts may need it).
- `runtime/backends/threejs/gpu-threejs.js` — pre-acquires the WebGL2
  context with `alpha: false` BEFORE constructing `WebGLRenderer`, so
  the canvas drawing buffer is reliably opaque.
- `runtime/backends/babylon/compat.js` — material-protocol shims
  (`isReady`, `isReadyForSubMesh`, `needAlphaTestingForMesh`) so GLB
  materials don't throw during Babylon's render-prep walk.
- `runtime/namespace.js` — exposes `fx.setEffectsBypass`,
  `fx.isEffectsBypassed`, `scene.getScene`, `scene.getRenderer`,
  `scene.getMesh` to carts.

### Tests

- `tests/playwright/indie-odyssey.spec.js` — runs the boot + combat
  flow on BOTH `threejs` and `babylon`. Asserts:
  - cart manifest loaded, default difficulty, asset count
  - **zero console errors at boot** (`expect(errorLogs).toEqual([])`)
  - GLB enemies reach `modelStatus: 'ready'` (NOT `'loading'` or
    `'error'`) within 30s
- `tests/playwright/bloom-clear-color.spec.js` — regression test for
  the `fx.setEffectsBypass` + `scene.setClearColor` contract.

### Documentation + memory

- `docs/api-improvements.md` items #13 (`nova64.loader`), #14
  (`nova64.story`), #15 (`nova64.video`) added — patterns the cart
  re-implemented locally that should be promoted to engine APIs.
- `ROADMAP.md` — added a "Cross-Cart Effect Backlog" note for shared
  transition/glitch overlays.
- Mempalace memory `feedback_render_bug_strategy.md` updated with two
  concrete root causes from this session: (1) CSS
  `canvas { background: #000 }` poisons dynamically-created overlay
  canvases — always set `style.background = 'transparent'`; (2)
  `fx.setEffectsBypass(true)` wipes the canvas on some GPUs — default
  to composer path.

## Open issues

### 1. Demoscene Three.js vs RetroArch render parity (MEDIUM)

User flagged earlier: "the demoscene threejs version renders
differently in comparison to retroarch — there is a bug that does
not properly clear that scene". Needs a side-by-side visual
comparison. Likely suspect: `examples/demoscene/code.js`
`_local_setupScene` and `cleanupScene` don't reset
`renderer.clearColor` between scenes; the previous scene's clear
colour leaks into the next one.

Quick experiment: log `renderer.getClearColor()` at the start of
each `transitionToNextScene` call to confirm it's stale before
patching.

### 2. Babylon backend deeper visual fidelity (LOW)

The shader compile failure and muted Babylon dungeon view are fixed:
Indie Odyssey tracks dungeon point lights, hides them during combat
with the shared `setLightVisible(id, visible)` API, and Babylon
materials/effects now honor emissive intensity plus object-form bloom
options. The old Babylon 2D fallback dungeon renderer is now opt-in via
`globalThis.__INDIE_ODYSSEY_2D_FALLBACK = true` instead of covering the
real 3D scene by default.

Use `scripts/diagnostics/indie-level-visual-check.mjs` for future
Three/Babylon dungeon visual checks and
`scripts/diagnostics/combat-visual-proof.mjs` for combat screenshot
checks.

## Diagnostic helpers reference

All under `scripts/diagnostics/` (uncommitted as noted above). See
`scripts/diagnostics/README.md` for full details. Quick map:

| Helper | What it answers |
|---|---|
| `run-combat-proof.sh` | Does threejs combat render purple at the centre pixel? |
| `run-babylon-shader-check.sh` | Does babylon emit any shader / compile errors during combat? (See caveat above re BJS log channel.) |
| `run-indie-glb-combat-check.sh` | Do GLBs reach `ready` state on both backends? |
| `indie-level-visual-check.mjs` | Do Three.js and Babylon show comparable first-dungeon brightness/glow? |

When porting a probe to a real CI test, target
`tests/playwright/indie-odyssey.spec.js`.

## Key lessons (also captured in mempalace)

The two render bugs that ate the longest debugging cycle, in order
of likelihood for next time:

1. **`canvas { background: #000 }` poisons dynamically-created
   overlay canvases.** `console.html` has a global rule applied to
   every `<canvas>` element. Any cart-created overlay canvas
   (combat sprite, story slide, debug panel, video player) inherits
   it and becomes an opaque-black layer everywhere except where
   canvas content is drawn — **completely hides the WebGL canvas
   below**. Always set `style.background = 'transparent'` on
   dynamically-created overlay canvases. Centre-pixel pixel probes
   miss this because the centre IS transparent — check
   `getComputedStyle(c).background` too.

2. **`fx.setEffectsBypass(true)` wipes the canvas on some GPUs.**
   Its DIRECT render path (explicit clear + `renderer.render(scene,
   camera)`) produces zeroed output on at least one Windows/Chrome
   GPU combo, and subsequent overlay quads rendered afterward are
   invisible. With `alpha: false` locked on the canvas context, the
   original alpha=0 quirk that bypass was working around is moot —
   default to the composer path.

Heuristic order for "render looks broken but state dump says
correct": heartbeat assert → pixel readback (all canvases) →
bright-block isolation → CSS-bg probe → pragmatic fallback through
a layer you've already proven reaches pixels.

## Branch state

No outstanding rebases or merge conflicts were pending when this note was
last updated. Use `git log --oneline -5` and `git status --short` for the
current local state.

---

# 2026-06-19 PM — Godot port issues, hand-off to Codex

Commits since the previous handoff:

```
14ce383 feat(godot): port indie-odyssey + document video host contract
e2794ea feat(runtime): nova64.{loader,story,level,video} cart-helper APIs
0e2b591 fix(retroarch): tune demoscene scenes 2/3/4 toward corrected browser reference
dbefb02 fix(runtime): restore threejs color vibrancy
729ec66 fix(indie-odyssey): restore Babylon level glow parity
6c0a5f0 feat(indie-odyssey): port Echoes of the Shardgrid + cross-backend combat skybox
```

User tested the Godot port immediately after `14ce383` landed. Three
problems surfaced.

## Issue 1 — `ReferenceError: getComputedStyle is not defined`

User reported: `[nova64] cart draw: ReferenceError: getComputedStyle is
not defined` (twice — `cart draw` hook). Godot's QuickJS host doesn't
expose the browser DOM globals. Every DOM-overlay code path the cart or
the new helper APIs use will throw here.

**Concrete sites:**

- `examples/indie-odyssey/code.js:2186` — `combatSpriteCanvas` setup
- `examples/indie-odyssey/code.js:2240` — `storyFrameCanvas` setup
- `runtime/api-story.js:74` — `nova64.story` overlay canvas
- `runtime/api-video.js:311` — `nova64.video.playFullscreen` overlay
- All four `runtime/api-*.js` overlay APIs also call
  `document.createElement`, `document.body.appendChild`,
  `window.addEventListener` etc. — same root cause.

**Fix shape (no work done yet):**

Guard every DOM-API touch with `typeof document !== 'undefined'` /
`typeof window !== 'undefined'` / `typeof getComputedStyle === 'function'`
checks. On Godot they all evaluate falsy and the overlay path becomes a
no-op (or, ideally, an alternate Godot-native rendering path lights up).

Pattern to follow throughout:

```js
function ensureCanvas() {
  if (typeof document === 'undefined') return null;
  // ...
  const parent = document.getElementById('screen')?.parentElement || document.body;
  if (
    parent &&
    typeof getComputedStyle === 'function' &&
    getComputedStyle(parent).position === 'static'
  ) {
    parent.style.position = 'relative';
  }
}
```

## Issue 2 — Story mode doesn't advance / images don't load in place

User reported: "storymode in godot does not work it requires user input
to progress the images do not load in place".

Two distinct problems:

**a) Advance-key listener never fires.** Story uses
`window.addEventListener('keydown', state.keyListener)` and listens for
`Enter` / `Space` / `Escape`. Godot's QuickJS has no `window` and no DOM
event bus. Equivalent path on Godot: poll `nova64.input.keyp('Enter')`
inside `update(dt)`. Suggested replacement: have `nova64.story` not
register a `window` listener at all; instead expose a `_tick(dt)` hook
(already there!) that polls `nova64.input` for advance keys. Then it
works identically on web and Godot.

**b) Slide images never appear.** `nova64.story` uses
`new Image(); img.src = url; img.onload = …` — also DOM-only. On Godot
the cart needs to call `nova64.scene.loadTexture(url)` (or the host's
equivalent) to land the bytes in a backend texture, then either:
- composite the texture into the cart framebuffer per frame, or
- have the Godot host expose a `nova64.story.loadSlideImage(url)`
  command that mirrors `texture.createFromImage` and returns a handle
  the cart can render with.

Either way the current `img.src = url; img.onload` path is browser-only
and needs a backend-aware abstraction.

## Issue 3 — Visual fidelity gap vs the web version

User: "The game itself looks nothing like its web counterpart in short
it needs to be much better than this lets improve it".

This is the broader work. Concrete causes (in priority order):

1. **Lighting / clear color**. `setupScene()` in the cart calls
   `scene.setClearColor(0x1f4f9a)` + ambient + directional + fog. The
   Godot host's interpretation of those values likely differs from
   threejs's post-#dbefb02 corrected-vibrancy pipeline. Capture a
   Godot screenshot of `level1` and a web screenshot of the same
   level, then walk the diff: clear color, ambient intensity,
   directional light vector, fog near/far, bloom strength.

2. **Combat skybox / GLB enemies**. Combat depends on `nova64.light.createSolidSkybox` (purple sky) + GLB enemy models. Both should work on Godot — `scene.background` is bridged and GLB loading goes through `model.load`. But validate by checking `__INDIE_ODYSSEY_STATE.combatEnemyAssets[*].modelStatus` after `forceCombat`. Anything other than `'ready'` is a real bug.

3. **Story slides + combat sprite overlay missing entirely** (per Issues 1 + 2). On the Godot host these were always going to need the cart-framebuffer fallback path; the web path is too DOM-dependent. Two options:
   - **Quick**: have indie-odyssey detect Godot (e.g. via `nova64.scene.getBackendCapabilities().backend`) and use the cart framebuffer (`fill` + `drawText` + `drawImage` if exposed) for story slides + combat sprites instead of the DOM canvases. Loses the pixel-melt transition but preserves gameplay.
   - **Right**: extend the Godot host bridge with a `canvas2D` overlay command (mirrors the engine's existing `getStageCtx` 2D overlay on the web side). Then the existing canvas paths "just work" via a thin shim.

4. **Bloom**. `setupScene` enables bloom at strength 0.28 (post-tuning). On Godot the bloom command surface is `env.set`; check it's actually being driven by the cart's `fx.enableBloom` call and that the strength translates 1:1.

## Suggested order of attack

The first two are mechanical fixes that should be done together:

1. **Make all four `runtime/api-*.js` helpers DOM-safe.** Guard every `document` / `window` / `getComputedStyle` touch with a `typeof` check; return an inert no-op handle on hosts without DOM. Same edit to indie-odyssey's `getCombatSpriteContext` / `getStoryFrameContext`. This unblocks the cart from crashing on Godot — even if story/combat UI are blank, gameplay should not throw.

2. **Migrate `nova64.story` off `window.addEventListener` and `new Image()`.** Poll `nova64.input` in `_tick`; load images via `nova64.scene.loadTexture(url)` (which already runs cross-backend). Once this is done, story slides become genuinely cross-backend instead of web-only.

3. **Capture a screenshot diff of `level1`** (web vs Godot, same player position) and triage the visual gap. The biggest tells will be lighting/fog/clear-color — if those are off, everything looks wrong. Use `nova64-godot/scripts/visual_parity.mjs` or equivalent if available.

4. **Decide the story/combat-UI path** (cart-fb fallback vs Godot host canvas2D bridge). Cart-fb is faster; host canvas2D is more general and benefits every future cart that needs HUD overlays.

5. **Audit the cart's DOM touches one final time** — there are probably a few more outside the spots listed above (look for `document.` / `window.` / `Image()` in `code.js`).

## Files / commits relevant to this hand-off

- Cart code with DOM hot-spots: `examples/indie-odyssey/code.js` lines
  ~2059, 2171, 2185–2186, 2221, 2239–2240, 2367 (and probably more —
  audit).
- Helper APIs that need DOM guards:
  - `runtime/api-loader.js` (entire overlay is DOM)
  - `runtime/api-story.js:74, 390` (getComputedStyle, window listener)
  - `runtime/api-video.js:311, 349` (getComputedStyle, window listener)
  - `runtime/api-level.js` — should be DOM-free already, double-check.
- Godot port location:
  `nova64-godot/tests/carts/indie-odyssey/` (canonical) →
  `nova64-godot/godot_project/carts/indie-odyssey/` (synced).
- Godot host contract: `docs/GODOT_HOST_CONTRACT.md`. Add a
  `canvas2D.create / blit / clear / destroy` section if going the host-
  canvas route.
- Backlog entries to mark progress against:
  `BACKLOG.md` → `nova64.video host coverage (RetroArch + Godot)`
  and `indie-odyssey on Godot host`.

## Branch state at hand-off

```
* 14ce383 feat(godot): port indie-odyssey + document video host contract
* e2794ea feat(runtime): nova64.{loader,story,level,video} cart-helper APIs
* 0e2b591 fix(retroarch): tune demoscene scenes 2/3/4 toward corrected browser reference
* dbefb02 fix(runtime): restore threejs color vibrancy
```

Working tree clean except `.claude/settings.json` (local IDE) and
`tmp/` (gitignored). No outstanding rebases.

---

# 2026-06-20 — RetroArch core: textured GLB, combat unfreeze, UI colors, video demo → hand-off to Codex

This session worked almost entirely in the **RetroArch libretro core**
(`retroarch/nova64_libretro.c`) plus the indie-odyssey cart, driven by the
user testing indie-odyssey in RetroArch (GLES). Reference notes for all of this
are filed in **mempalace** (wings `nova64_retroarch`, `nova64`, `nova64_runtime`)
— query those first.

## Committed this session

- **`0f965a6`** feat(retroarch): decode PNG/JPEG via stb_image + cache decodes.
  Vendored `retroarch/stb_image.h`; `path_is_png`→`path_is_image`,
  `decode_png_asset`→`decode_image_asset` (handles .png/.jpg/.jpeg). Added an
  LRU **decoded-image cache** (32 slots / 96 MB) in `load_rgba_asset_pixels` —
  fixed the story pixel-melt transition that re-decoded a multi-MB image ~3600×
  per frame (25 s/frame ≈ frozen → 255 fps). `#undef L/C/R` between the
  stb_vorbis and stb_image includes (macro clash).

- **`2ab9e92`** feat(retroarch): textured glTF/GLB models + per-frame jobs + UI
  color fixes. Three things:
  1. **Per-frame job draining** — `js_host_call_frame` now drains the QuickJS
     job queue after `update()` and `draw()`. Before, Promise `.then()`
     scheduled during gameplay never ran, so `loadSceneModel`'s `onLoaded`
     never set `modelStatus='ready'` → autoplay's `allModelsResolved` gate
     never opened → **combat froze**. Guard: `retroarch/conformance/1135-promise-jobs.js`.
     (Also fixed `loadVoxModel` async — re-locked conformance 692/703.)
  2. **Textured glTF/GLB loader** — `nova64.scene.loadModel` (sync JS shim,
     ~line 31643) now parses the GLB, builds a real mesh via `createMesh`
     (uint32 indices for >64k-vert models like glitchRat; optional 8-float
     pos+normal+uv stride), and decodes/uploads the embedded base-color JPEG
     (`decodeImageBytes` → `createDataTexture` → `setMeshTexture`). Cube shader
     gained `a_texcoord` + `u_use_vertex_uv`; data textures lazy-upload
     (`gles_ensure_texture_uploaded`) so init-time loads still texture.
     `getBackendCapabilities().models` is now `true`. **Verified: glitchRat and
     portal render fully textured in GLES.**
  3. **indie-odyssey 2D UI colors** — `uiColor()` returns a **BigInt** on the
     native core so the 24-bit `0xRRGGBB→RGBA` promotion heuristic (which
     false-positives on `rgba8(0,…)` → white/pink) is skipped; `rect()` passes
     the explicit unfilled flag (`draw.rect` fills by default). Fixed the
     white panels / pink text.

## Uncommitted (working tree) — needs a decision

- **Video demo** (NOT committed; user OK pending on the binary):
  - `examples/story-video-demo/` (code.js + meta.json) — `nova64.story.play(…,
    {autoAdvance:3})` → `nova64.video.playFullscreen('/assets/sample.mp4')` →
    "THE END". User confirmed it "looked wonderful on the web".
  - `public/assets/sample.mp4` — public-domain Big Buck Bunny (991 KB). Also
    makes hello-helpers' existing video demo work.
  - `console.html` — added the "🎬 Story → Video Demo" dropdown option.
  - **Decide:** commit the ~1 MB mp4 into the repo, or keep the asset external.
- **Godot cart copies** (`nova64-godot/.../carts/indie-odyssey/code.js`) are
  diverged and were **NOT synced** with this session's cart changes (combat
  revert, uiColor BigInt, rect). The uiColor/rect fixes are RetroArch-specific
  (gated on the native core) and safe no-ops elsewhere, but sync before
  shipping Godot.
- `.claude/settings.json` (local IDE) — leave uncommitted.

## Video status (answering "have we finished video?")

Video is implemented **web-only** (`runtime/api-video.js`: HTML5 `<video>`
overlay + THREE/BABYLON VideoTexture). The **RetroArch core has no mp4 decoder**
— `playFullscreen` is a no-op there. Godot has a host-contract path
(`docs/GODOT_HOST_CONTRACT.md`). Before this session there was no real mp4 in
the repo, so video had never been demoed; now there is (`sample.mp4` + the demo
cart). KEY: a cart must call `nova64.story._tick(dt)` in `update()` — the engine
does not auto-drive helper ticks.

## Visual verification tooling — use Chrome (powerful; Codex needs this too)

This session verified the **web backend** live by driving a **real Chrome** via
the `chrome-devtools` MCP — not just the headless RetroArch harness. This is the
only way to validate the actual threejs/babylon rendering, DOM overlays, HTML5
`<video>`, and UI colors (the libretro harness only renders the core's
software-2D/GLES output, never the web backend). It is powerful and **Codex
should be able to do the same** — it needs the `chrome-devtools` MCP server
configured plus this launch recipe:

```
# 1) dev server under WSL (Windows node fails on pnpm/esbuild)
wsl bash -lc 'export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh; nvm use 20; \
  cd /mnt/c/Users/brend/exp/nova64; pnpm exec vite --port 3000 --host'
# 2) Chrome with remote debugging + isolated profile (PowerShell)
Start-Process chrome.exe -ArgumentList '--remote-debugging-port=9222',\
  '--user-data-dir=C:\tmp\chrome-devtools-profile','--no-first-run',\
  '--no-default-browser-check','http://localhost:3000/console.html?demo=<cart>'
# verify: GET http://127.0.0.1:9222/json/version -> 200
```

Then `mcp__chrome-devtools__*` (new_page / navigate_page / take_screenshot /
wait_for / list_console_messages / evaluate_script) connect to 127.0.0.1:9222.
Without this, an agent can only validate the RetroArch core headlessly, not the
web backend. (Full recipe also in mempalace `nova64/build`.)

## Suggested next steps for Codex

1. **Verify combat in RetroArch end-to-end** (live, with GLES/glcore video
   driver). Enemies should load textured GLB models per the rule (model when it
   loads, sprite on `'error'`); no white squares. Watch the `[nova64][glb]` log
   lines (enable RetroArch Settings → Logging → Info).
2. **Commit the video demo** (or externalise the mp4) once the user decides.
3. **Sync the Godot cart copies** and validate combat/UI on the Godot host.
4. **Textured-model follow-ups** (loader is geometry + one base-color texture
   only): no skinning/animation, no PBR metalness/roughness/normal maps, ignores
   glTF node transforms (a model may sit at an odd offset/scale). If enemies
   look mis-placed, node-transform support is the likely cause.
5. **Optional**: promote the per-frame `story._tick` requirement into the engine
   loop so carts don't have to drive it (and audit other helper APIs:
   `loader`, `level`, `video`).

## Build / test / deploy (all WSL — see mempalace `nova64_retroarch/build`)

```
# Linux .so + harness (conformance / headless GLES capture)
cd /mnt/c/Users/brend/exp/nova64/retroarch
make platform=unix clean && make platform=unix -j4 && make harness
# Windows DLL for RetroArch (ALWAYS clean when switching platforms)
make platform=win-cross clean && make platform=win-cross -j4
cp nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/nova64_libretro.dll
# Repackage the cart the playlist loads
python3 retroarch/tools/package_example_cart.py indie-odyssey --out-dir retroarch/games
# Headless GLES render check (Mesa EGL in WSL)
NOVA64_GLES_TESTS=1 build/harness ./nova64_libretro.so <cart.nova> --gles --frames 4 --capture out.ppm
python3 retroarch/tests/ppm_to_png.py out.ppm out.png
# Conformance (batched): bash retroarch/tests/run_conformance.sh --skip-build --from N --to M
```

Software conformance 0–1135 is green; GLES primitives + textured models verified
by headless capture. The deployed DLL (`C:\RetroArch-Win64\cores\`) and
`retroarch/games/indie-odyssey.nova` are current as of the `2ab9e92` core + the
latest cart repackage.
