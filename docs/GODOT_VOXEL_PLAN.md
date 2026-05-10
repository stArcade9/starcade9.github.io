# Godot Voxel — Native Parity Plan

Status: actively in progress on `feature/godot-adapter`.

## Current checkpoint (2026-05-07)

The current Godot voxel path is now native for the expensive terrain work:

- Generated terrain chunks use `voxel.uploadChunk` with compact x/z column
  records. C++ expands those records into a native block volume, fills native
  water below sea level, expands typed tree silhouettes, and greedily meshes
  the visible faces.
- The native atlas path mirrors the browser procedural atlas tile order. Chunk
  UVs use repeat coordinates in `UV` and tile origins in `UV2`.
- Water, glass, and ice render on a transparent atlas surface. Leaves render on
  the opaque atlas surface so tree canopies remain dense green instead of
  washing out through sky/fog blending.
- Godot cart paths are normalized to browser-style `/examples/<cart>/code.js`
  before voxel seed hashing, matching the browser reset-world cart-path rule.
- Standalone MagicaVoxel `.vox` files stay on the separate native exposed-face
  importer so authored facades, palette colors, and orientation remain stable.

Recent validation:

- Rebuilt Windows and Linux debug GDExtension binaries from WSL.
- `minecraft-demo` Godot visual conformance passed after the native water and
  opaque-leaf passes. Latest documented checkpoint: `post-opaque-leaves`,
  **84.13%** report-mode diff.
- A temporary leaf-tile diagnostic forced block id `7` to sample the grass tile.
  The same canopy geometry turned green, proving the tree mesher and leaf IDs
  were correct; the bug was transparent leaf material treatment.

Next voxel-parity work:

- Compare compact-column output against browser full chunk data around caves,
  overhangs, ores, and chunk-border trees.
- Add or approximate skylight/torch-light data so Godot chunk shading better
  matches the browser renderer.
- Continue camera/fog/HUD parity work for `minecraft-demo`; these still drive a
  large part of screenshot diff even after atlas, trees, water, and leaves were
  corrected.

## Older terrain checkpoint (2026-05-02, commit `550147e`)

Branch: `feature/godot-adapter`

Completed:
- **Phase 1** ✅ — Native `voxel.uploadChunk` face-culled mesher in C++
  (commit `4817332`). Replaced column-bucketing MultiMesh path with real
  chunk ArrayMesh builds. Shutdown double-free fixed (`_handles->clear(false)`).
- **Phase 2** ✅ — Greedy meshing in `_cmd_voxel_upload_chunk` (commit
  `299b03d`). Co-planar same-coloured faces merged into rectangles; ~5-10×
  fewer triangles on heightmap terrain.
- **Visual parity pass** ✅ (commit `00607ec`):
  - All 25 `VX_BLOCK_COLORS` in shim synced exactly to `runtime/api-voxel.js`.
  - `_vxSurfaceFor(biome)` and `_vxBiomeAt(x,z)` biome rules matched to web.
  - `light.setSun` bridge command added (pitch/yaw/energy/color → shared
    `_sun_light` DirectionalLight3D).
  - `setVoxelDayTime(t)` added to shim: computes sun angle, ambient energy,
    sky colour, fog colour and calls `light.setSun`.
  - `setClearColor` exposed on `globalThis`.
  - Fog now per-cart (removed forced fog override in `_vxGenerateWorld`).
- **Depth fog** ✅ (commit `550147e`): Replaced exponential fog approximation
  with Godot `FOG_MODE_DEPTH` using explicit near/far bounds. Improved
  minecraft-demo diff from ~47% → **37.21%**.

Current smoke-test status: **6/6 PASS** — voxel-terrain, minecraft-demo,
voxel-creative, wizardry-3d, star-fox-nova-3d, f-zero-nova-3d.

### Key files

| File | Purpose |
|------|---------|
| `nova64-godot/gdextension/src/bridge.cpp` | C++ GDExtension bridge — mesher, fog, light.setSun |
| `nova64-godot/gdextension/src/bridge.h` | Declarations — `_sun_light`, `_cmd_light_set_sun` |
| `nova64-godot/godot_project/shim/nova64-compat.js` | JS shim — terrain, biomes, APIs |
| `runtime/api-voxel.js` | Web engine ground truth for noise/biome/cart APIs |

### Shim constants (nova64-compat.js)

- `VX_BASE_Y = 60`, `VX_SEA_Y = 62` (matches web `SEA_LEVEL=62`)
- `CXSZ = CZSZ = 16`, `CY_ORIGIN = 55`, `CY_HEIGHT = 50`
- Biome thresholds: `t < 0.2` → Frozen, `t < 0.35 && m > 0.5` → Taiga,
  `t > 0.7 && m < 0.25` → Desert, `t > 0.6 && m > 0.6` → Jungle,
  `m < 0.3` → Savanna, `t > 0.4 && m > 0.4` → Forest, `t < 0.35` → Snowy,
  else → Plains
- Height: browser-style simplex FBM with per-biome `heightBase` /
  `heightScale` values from `runtime/api-voxel.js`.
- Tree density: Jungle=0.15, Forest=0.08, Taiga=0.06, Snowy=0.02,
  Savanna=0.005, Plains=0.015, with browser chunk-local origin guards.

## Latest parity checkpoint

Run on 2026-05-07:

```bash
pnpm godot:visual -- --cart=minecraft-demo --frames=220 --wait-ms=1000 --report-only --max-diff=100
```

Result: **84.13%** report-mode pixel diff vs browser Three.js.

Improvements this session:
- Compact terrain columns are expanded and greedily meshed in C++ instead of
  using JS-side MultiMesh buckets.
- Native atlas tile order, RNG sequence, UV repeat coordinates, and UV2 tile
  origins now align with the browser atlas convention.
- Tree origins follow the browser chunk-local guard, and typed tree metadata
  expands oak, birch, spruce, jungle, and acacia shapes natively.
- Native water blocks fill below-sea-level air and remain non-solid for
  gameplay queries.
- Leaves render as dense opaque atlas blocks, while water/glass/ice stay on a
  transparent surface.

The remaining gap is primarily:
1. Camera/fog/HUD framing differences in the visual harness.
2. Lighting model differences: no skylight propagation or torch emission yet.
3. Remaining compact-column limitations around caves, overhangs, ores, and
   chunk-border edge cases.
4. Water material polish: transparency/tint/shoreline blending is functional
   but still not visually equivalent to the browser.

`meta.json` is supported in the Godot host path: `load_cart()` reads sidecar
metadata, exposes it as `globalThis.cart_meta`, and the compatibility shim
applies text, sky, fog, lighting, effects, and camera defaults before the cart
module evaluates. Voxel-specific defaults should continue to flow through
`configureVoxelWorld()` so carts keep one programming model across hosts.

## Remaining gaps vs the web engine

1. **Camera/fog/HUD framing** — the Godot frame is visually readable, but the
   captured view still differs enough to dominate report-mode diff.
2. **Caves / overhangs / ores** — compact-column uploads cover the common
   heightmap path well, but need another audit against browser full-volume
   generation features.
3. **Lighting** — no skylight propagation or torch emission buffer yet.
4. **Water polish** — water is native and non-solid now, but fluid material
   tint, transparency, and shoreline blending remain approximate.

## Phased plan

### Phase 1 — Native voxel.uploadChunk (face-culled mesher) ✅ DONE (commit `4817332`)

Added `_cmd_voxel_upload_chunk` in C++: builds an ArrayMesh from a packed block
array, emitting one quad per visible face. Shim replaced column-bucketing path
with a chunk-builder calling `voxel.uploadChunk` per 16×50×16 chunk. Shutdown
double-free fixed (`_handles->clear(false)`).

### Phase 2 — Greedy meshing in C++ ✅ DONE (commit `299b03d`)

Same bridge command, smarter mesher: sweeps each axis plane, builds a 2D
visibility+color mask, merges same-colored adjacent faces into rectangles.
~5-10× fewer triangles for typical heightmap terrain.

### Phase 3 — Simplex noise + per-biome height formula ✅ DONE

**Goal**: Eliminate the terrain generation divergence that accounted for the
old value-noise heightmap mismatch.

**Step 1 — Port simplex noise from web engine into shim** ✅

`runtime/api-voxel.js` uses OpenSimplex2 (lines ~100–243). Port or inline an
equivalent pure-JS `_vxSimplex2D(x, z)` into `nova64-compat.js`, then replace
`_vxFbm`/`_vxSmoothNoise` with:

```js
function _vxFbm2D(x, z, octaves, persistence, lacunarity, scale) { ... }
```

Use the same call sites as the web engine:
- Height: `_vxFbm2D(x + seed, z + seed, 4, 0.5, 2.0, 0.01)`
- Temperature: `_vxFbm2D(x + seed, z + seed, 2, 0.5, 2.0, 0.005)`
- Moisture: `_vxFbm2D(x + 1000 + seed, z + 1000 + seed, 2, 0.5, 2.0, 0.003)`

**Step 2 — Per-biome height formula** ✅

Replace the single `VX_BASE_Y + blend * VX_HEIGHT_AMPLITUDE` formula with
biome-conditioned `heightBase + simplex * heightScale` matching the web engine:

| Biome | heightBase | heightScale |
|-------|-----------|-------------|
| Jungle | 58 | 22 |
| Desert | 63 | 4 |
| Plains | 64 | 6 |
| Forest | 64 | 8 |
| (etc — check `runtime/api-voxel.js` for all values) |

**Validation**:
- `pnpm godot:visual -- --cart=minecraft-demo --frames=220 --wait-ms=1000 --report-only --max-diff=100`
- Latest documented focused run: PASS, **84.13%** report-mode diff.
- Raw diff remains high because camera/fog/HUD framing now dominate more than
  terrain generation itself.

### Phase 4 — Cave / overhang / ore parity ← NEXT

Audit the compact-column shortcut against browser full-volume generation for
caves, overhangs, ores, and edge-case chunk boundaries. Decide whether to
extend native column expansion with targeted carve/ore metadata or send a
selective full-volume payload only when a cart needs those features.

### Phase 5 — Skylight / torch-light parity

The native atlas path is already live. The remaining lighting pass should add
or approximate an A8 skylight/block-light buffer per chunk, then feed it into
vertex color or a secondary attribute so caves, water, and tree interiors better
match the browser renderer.

## Build and test commands

```bash
# Build both platforms (WSL)
wsl bash -lc 'cd /mnt/c/Users/brend/exp/nova64/nova64-godot/gdextension && scons platform=linux target=template_debug -j$(nproc) 2>&1 | tail -15 && scons platform=windows target=template_debug use_mingw=yes -j$(nproc) 2>&1 | tail -15'

# Smoke test (6 carts)
powershell -NoProfile -ExecutionPolicy Bypass -File nova64-godot\scripts\run-cart-smoke.ps1

# Visual parity — minecraft-demo
wsl bash -lc 'cd /mnt/c/Users/brend/exp/nova64 && source ~/.nvm/nvm.sh; nvm use 20 >/dev/null; pnpm godot:visual -- --cart=minecraft-demo --frames=120 --wait-ms=3000 --max-diff=100'

# Commit pattern (never git push)
Set-Content -Encoding utf8 .git/COMMIT_MSG_TMP "your message"
wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && git add <files> && git -c core.hooksPath=/dev/null commit -F .git/COMMIT_MSG_TMP && rm .git/COMMIT_MSG_TMP"
```

## Decision log

- **C++ chosen over Rust** — godot-cpp bindings are mature and the
  existing bridge is already C++; introducing Rust would require a
  second toolchain and another FFI layer.
- **Current checkpoint: native-column terrain path** — `voxel.uploadChunk`
  now accepts compact terrain columns and expands them to a C++ block volume
  before greedy meshing. This replaced the slow full-block-array bridge path
  for generated Godot terrain and made the visual tuning loop responsive again.
- **Compact columns over the bridge** — Godot terrain chunks must avoid
  sending full `sx * sy * sz` JS block arrays during normal streaming.
  The shim now sends one compact column record per x/z column and lets
  `voxel.uploadChunk` expand that data into a block volume before greedy
  meshing in C++. This keeps chunk loading responsive while preserving
  the existing cart-facing voxel API.
- **Chunk-border culling belongs in the native mesher** — chunk uploads can
  include a one-block neighbor border plus `meshMin`/`meshMax`, so C++ can
  cull faces against adjacent terrain without rendering duplicate boundary
  slabs.
- **Seed parity follows the browser reset-world cart path** — the browser
  imports `runtime/api-voxel.js` early, then `Nova64.loadCart()` calls
  `resetVoxelWorld({ restoreDefaults, cartPath })`. Godot exposes and
  normalizes `res://carts/<cart>` to `/examples/<cart>/code.js` before shim
  evaluation so both hosts hash `nova64-cart-path:<browser-style-path>`.
- **Texture atlas UVs are top-origin in Godot shader space** — the chunk
  shader now passes the row origin directly instead of vertically flipping it,
  matching how the generated Image atlas is filled.
- **Tree origins must respect browser chunk-local guards** — Minecraft trees
  only originate inside local chunk coordinates `3..12` and above sea level.
  The Godot compact-column path mirrors that guard so spawn-edge canopies do
  not appear where the browser would reject the tree.
- **Tree silhouettes stay native but typed** — compact columns now include
  tree type and deterministic bend/hash metadata. Native `voxel.uploadChunk`
  expands oak, birch, spruce, jungle, and acacia shapes in C++ instead of
  sending full tree block volumes over QuickJS or drawing one generic canopy.
- **Leaves are visually opaque in the native atlas path** — the browser registry
  marks leaves transparent for face/light behavior, but the Three.js visual
  reads as dense green foliage. Godot now keeps water/glass/ice on transparent
  surfaces while rendering leaf blocks through the opaque atlas surface.
- **Water belongs in the native chunk volume** — per-chunk transparent water
  planes caused stacked blending and scene washout. Compact-column uploads now
  fill below-sea-level air with native water blocks, while shim collision and
  highest-block queries keep water non-solid.
- **Heightmap stays in JS for Phase 1** — keeps the parity contract
  small (only one new bridge command) and makes the mesher easy to
  unit-test by feeding it a known PackedByteArray.
- **Vertex colours over per-face material** — one draw call per chunk
  beats one per block colour, and we can switch to a texture atlas in
  Phase 5 without breaking the chunk handle contract.
- **`FOG_MODE_DEPTH` over exponential** — Godot's depth fog maps directly
  to near/far world-space distances, matching how carts set fog in JS.
  Exponential density was too coarse to tune without washing out the scene.
- **`_handles->clear(false)` not `true`** — `true` calls `queue_free()` on
  chunk nodes while the scene tree also frees them on shutdown → double-free
  SIGSEGV. Let the scene tree own teardown; just null mesh refs first.
- **Terrain regression reverted** — attempted per-biome `heightBase`/
  `heightScale` port in shim, but it diverged from block-space coordinates;
  reverted and kept the fog improvement. Full fix is Phase 3 (simplex port).
