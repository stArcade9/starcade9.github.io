# Cart Parity: Web ↔ Godot ↔ RetroArch

**Status:** audit / assessment — generated 2026-06-24. **Web is the source of truth.**

**Post-consolidation note:** `b9b9995` moved the active cart set toward
`examples/` and removed the duplicated tracked payloads from `retroarch/games`.
Treat the detailed inventory below as historical context for the drift that was
found during the audit, not as a current file-count report. `retroarch/games_old/`
is a local ignored backup, and rebuilt `.nova` bundles now live beside their
`examples/<cart>/code.js` sources.

The goal of the Nova64 runtime is that **one cart `code.js` runs unchanged on all
three backends.** This document inventories every cart across the backends,
compares the shared ones against the web version, and lists the discrepancies to
assess. Each backend reaches the same cart-facing API a different way:

| Backend | How carts run | API surface |
|---|---|---|
| **Web** (`examples/<cart>/code.js`) | Vite + the runtime in `runtime/` (Three.js/Babylon) | `nova64.*` grouped namespaces (the canonical API) |
| **Godot** (`nova64-godot/godot_project/carts/<cart>/code.js`) | QuickJS host (`Nova64Host`) + `shim/nova64-compat.js` mapping to native Godot | grouped `nova64.*` **and** bare globals |
| **RetroArch** (`retroarch/games/<cart>.js`) | QuickJS embedded in the libretro core (`nova64_libretro.c`) | grouped `nova64.*` **and** bare globals (compat shims) |

The headline result: **the backends' hosts already expose the web API**, so
parity is largely achievable — but the **committed cart files have drifted** out
of sync with web and use older styles, and RetroArch carts are a separate legacy
set. The discrepancies below are mostly in the *carts*, not the *runtimes*.

---

## 1. Inventory

- **Web:** 77 carts (`examples/*/code.js`) — the reference set.
- **Godot:** ~69 ported carts + 9 synthetic conformance carts (`00-boot` … `10-stress`).
- **RetroArch:** 22 single-file carts (`retroarch/games/*.js`) — a smaller, partly
  different set.

### Web carts with **no Godot port** (8)
`ar-hand-demo`, `hello-helpers`, `hype-demo`, `nft-art-generator`, `nft-worlds`,
`ui-demo`, `vr-demo`, `vr-sword-combat`
→ *Assess:* should these be ported, or are they intentionally web/XR-only?
(`vr-*`/`ar-*` need WebXR; `nft-*` need wallet/web APIs.)

### Web carts that also exist in RetroArch (13)
`camera-platformer`, `demoscene`, `filter-glitch`, `hello-3d`, `hello-namespaced`,
`hello-world`, `hud-demo`, `particle-fireworks`, `space-harrier-3d`, `test-font`,
`test-minimal`, `tween-bounce`, `wizardry-3d`

### RetroArch-only carts (9)
`dungeon-crawler`, `neon-pinball`, `neon-snake`, `nova-drift`, `platformer`,
`sky-rider`, `space-shooter`, `stealth-runner`, `wave-survival`
→ *Assess:* these have no web equivalent. Promote to `examples/` (web source of
truth) or treat as RA-native?

---

## 2. Web ↔ Godot

Comparing each shared cart with `diff -wB` (ignoring whitespace/EOL):

### Identical to web (5) ✅
`indie-odyssey`, `metaverse`, `multiplayer-lobby`, `story-video-demo`, `tv-demo`

These are the **recently synced** carts and they prove the model works: the
**same grouped-namespace web code runs unchanged on Godot** (the metaverse cart is
byte-identical and cross-plays live). So web→Godot parity is *technically already
true* — the other carts simply haven't been re-synced.

### Diverged from web (~64)
Every other shared cart differs. The divergence falls into three categories:

**(A) Namespace style — cosmetic, NOT a runtime gap.** The Godot carts predate the
`nova64.*` grouped-namespace migration (commit `6267ecb`) and still use bare
destructured globals:

```js
// web (source of truth)            // godot copy (old style)
nova64.scene.createCube(1, c, p);   createCube(1, c, p);
nova64.draw.rect(x, y, w, h, col);  rect(x, y, w, h, col);
```

Same function names, **same signatures** — the Godot shim exposes both forms, so
the web version would run as-is. This accounts for the *baseline* diff on nearly
every cart (e.g. `hello-world`, `test-minimal`, `test-2d-overlay`).

**(B) Logic / feature divergence — real drift.** Larger diffs are forks that have
gained or lost behavior on one side. Confirmed example: `demoscene` (this session)
— the Godot copy was missing scene cleanup for 4 mesh arrays and used different
bloom calls. These need per-cart reconciliation.

**(C) Debug/instrumentation drift.** Some web carts added debug hooks (e.g.
`demoscene` exposes `__nova64DemosceneState`/`JumpTo`) absent on Godot.

#### Diverged carts by diff size (proxy for severity — `diff -wB` changed lines)

Large (≥300, likely logic divergence, prioritize):
`wizardry-3d` (1939), `demoscene` (929, fixed this session), `fps-demo-3d` (847), `wad-demo` (821),
`shooter-demo-3d` (606), `space-harrier-3d` (604), `star-fox-nova-3d` (600),
`cyberpunk-city-3d` (580), `strider-demo-3d` (566), `nature-explorer-3d` (541),
`mystical-realm-3d` (535), `super-plumber-64` (491), `f-zero-nova-3d` (470),
`dungeon-crawler-3d` (448), `wing-commander-space` (432), `generative-art` (382),
`space-combat-3d` (378), `3d-advanced` (353), `crystal-cathedral-3d` (330),
`physics-demo-3d` (313)

Medium (50–300, namespace + some logic):
`particles-demo` (294), `creative-coding` (262), `flash-demo` (257), `hello-3d`
(248), `adventure-comic-3d` (226), `tsl-showcase` (187), `screen-demo` (184),
`skybox-showcase` (178), `minecraft-demo` (176), `game-of-life-3d` (166),
`instancing-demo` (155), `pbr-showcase` (149), `storage-quest` (121),
`hello-skybox` (106), `voxel-terrain` (101), `voxel-creative`/`creatures`/`test-font`
(100), `audio-lab` (96), `input-showcase` (80), `boids-flocking` (66), `shader-showcase`
(59), `hero-demo` (58), `babylon-demo` (54), `hello-namespaced` (51)

Small (<50, mostly namespace-only):
`stage-menu` (49), `movie-clock` (38), `model-viewer-3d`/`startscreen-demo`/`tween-logo`
(36), `particle-trail`/`vox-viewer` (34), `tween-typewriter` (32), `particle-fireworks`
(28), `filter-glitch`/`hud-demo` (26), `blend-aurora` (24), `stage-cards` (22),
`tween-bounce` (20), `canvas-ui-showcase` (16), `hello-world` (12), `test-2d-overlay`
(10), `test-minimal` (8)

---

## 3. Web ↔ RetroArch

RetroArch carts diverge **more** — they're hand-ported single-file carts that
predate both the namespace migration **and** the API-signature alignment. The RA
core (`nova64_libretro.c`) *does* now expose the grouped `nova64.*` API and a
web-compatible `createCube(size, color, [x,y,z], opts)` (compat shims at
`nova64_libretro.c:27138`, `:31411`), but the **cart files** still use the legacy
shape:

```js
// web (source of truth)                    // retroarch/games/hello-world.js (legacy)
nova64.scene.createCube(1, 0x00aaff, [0,0,-4]);   createCube(1, 1, 1, rgba8(0,170,255,255));
                                                   setPosition(cube, 0, 0, -4);
nova64.light.setAmbientLight(0xffffff, 1.5);       setAmbientLight(rgba8(255,255,255,255), 1.5);
nova64.draw.printCentered('Hi', 12, 0xffffff);     printCentered('Hi', 320, 12, rgba8(...));
```

Discrepancy types unique to RA carts:
- **API signatures:** `createCube(w, h, d, color)` + separate `setPosition` vs web
  `createCube(size, hexColor, [x,y,z])`.
- **Color format:** packed `rgba8(r,g,b,a)` vs web hex `0xRRGGBB`.
- **2D text args:** `printCentered(text, x, y, color)` vs web `printCentered(text, y, color)`
  (web auto-centers x).
- **Cart set:** RA has 9 carts with no web equivalent (§1) and is missing most of
  the web set.

→ *Assess:* the RA core appears to accept the web API via compat — so the question
is whether the **legacy RA carts can be replaced by the web `code.js` directly**.
This needs a spike: pick one shared cart (e.g. `hello-world`), drop the web
`code.js` into the RA core unchanged, and see what breaks.

---

## 4. Hard backend gaps (not just cart drift)

Some web APIs have no equivalent on a backend — these are genuine runtime gaps,
not sync issues:

- **Networking (`nova64.net`):** web (browser WS) + Godot (WebSocketPeer bridge) ✅;
  **RetroArch has no in-core sockets** → multiplayer carts can't run on RA
  (`multiplayer-lobby`, `metaverse`). Tracked in `docs/MULTIPLAYER_AND_AUTH_DESIGN.md` §7.
- **WebXR (`vr-*`, `ar-*`):** web only; no Godot/RA XR path yet.
- **Wallet/web-only (`nft-*`):** depend on `window.ethereum` / browser APIs.
- **DOM chat input:** web uses a DOM `<input>`; Godot uses `nova64.gdtext`; RA has
  neither (covered by the metaverse chat plugin's fallback).

---

## 5. Assessment checklist (for review)

1. **Re-sync Godot carts from web** — most diffs are namespace-only and the shim
   already supports the web API. A bulk re-copy (like the metaverse auto-sync)
   would collapse category (A) entirely. Confirm: any cart that *intentionally*
   diverges on Godot? (Check the large-diff list for genuine native-only behavior.)
2. **Reconcile the large-diff carts individually** (§2 large list) — these likely
   have real logic drift; web should win unless the Godot version fixed a bug.
3. **RetroArch web-code spike** — verify a web `code.js` runs on the RA core
   unchanged; if so, migrate RA carts to the web sources and delete the legacy
   single-file ports.
4. **Decide the RA-only carts' (§1) home** — promote to `examples/` or keep native.
5. **Decide the web-only carts' (§1) fate** — port the portable ones; document the
   XR/wallet ones as web-only by design.
6. **Establish a sync mechanism** so this never drifts again (the metaverse uses
   `scripts/godot.sh sync`; generalize it, or make carts a single shared source the
   three backends load).

---

## 6. Bottom line

The runtime **can** run the same cart on all three backends — the metaverse,
indie-odyssey, multiplayer-lobby, story-video-demo and tv-demo already do (web ≡
Godot). What's missing is **discipline/sync**: the other carts are stale forks, and
RetroArch carts were never migrated to the aligned API. None of the divergence
(except the hard gaps in §4) reflects a runtime limitation — it's cart drift.
