# Backend Runtime Structure

Nova64 now treats `runtime/` as the stable public/runtime layer and moves renderer-specific implementation into backend folders.

## Folder Layout

```text
runtime/
  api-3d.js
  gpu-threejs.js
  gpu-babylon.js
  api-3d/
  backends/
    threejs/
    babylon/
  shared/
```

## Ownership

- `runtime/`
  Public entrypoints, stable cart-facing wrappers, and compatibility re-exports.
- `runtime/backends/threejs/`
  Three.js-specific implementation modules used by `runtime/api-3d.js` and the public `runtime/gpu-threejs.js` wrapper.
- `runtime/backends/babylon/`
  Babylon-specific implementation modules composed by the public `runtime/gpu-babylon.js` wrapper.
- `runtime/shared/`
  Cross-backend contracts and helpers that should not belong to only one renderer.

## Public Compatibility Rules

- Keep flat globals stable: `createCube`, `setCameraPosition`, `createPointLight`, and similar functions must not change names.
- Keep `nova64.*` namespaces stable.
- Keep `runtime/api-3d/*` import paths working through re-export wrappers while backend internals live in `runtime/backends/threejs/*`.
- Keep `runtime/gpu-threejs.js` as the public Three.js entrypoint, even though the implementation now lives in `runtime/backends/threejs/gpu-threejs.js`.
- Keep `runtime/gpu-babylon.js` as the public Babylon entrypoint, even though the implementation now lives in `runtime/backends/babylon/gpu-babylon.js`.

## Backend Surface Contract

`runtime/shared/backend-surface.js` defines the shared backend surface used to keep Three.js and Babylon aligned.

It currently separates:

- Required surface keys
  Functions that both backends must expose for cart/runtime parity.
- Capability-gated keys
  Functions that may be backend-specific or intentionally unsupported.

This contract is used to:

- expose Babylon cart-facing APIs without a handwritten export list
- keep required camera/light/mesh/scene accessors synchronized
- make parity regressions visible in Playwright

## Capability Flags

Each backend exposes explicit capability flags:

- `runtime/backends/threejs/capabilities.js`
- `runtime/backends/babylon/capabilities.js`

Use capability checks for behavior that is intentionally unsupported instead of silent no-ops. Current examples include Babylon particles, post-processing, and dithering behavior.

## Cart Reset Lifecycle

Nova64 now has a shared cart-reset pipeline so cart loads do not depend on scattered one-off cleanup calls.

Primary pieces:

- `runtime/cart-reset.js`
  Internal registry for named cart reset hooks.
- `runtime/console.js`
  Calls the shared reset pipeline at the start of `Nova64.loadCart(...)`.
- `src/main.js`
  Registers the default runtime reset hooks used by the browser console bootstrap.

The default browser/runtime reset sequence now covers:

- input state
- UI buttons and panels
- screen manager registrations
- `novaStore`
- voxel world/config/material state
- scene and skybox cleanup
- camera reset
- fog reset
- manifest/env/i18n/data/assets reset

Why this exists:

- dashboard cart switching should behave like a fresh cart start
- subsystems should not leak hidden state between carts
- new stateful runtime modules need one clear place to integrate cleanup

Rule for future runtime work:

- if a module owns mutable global or long-lived cart state, register a cart reset hook for it instead of relying on ad hoc cleanup from carts or page reloads

## Tests That Guard This Split

- `tests/playwright/api-compatibility.spec.js`
  Required backend surface, camera access, point-light mutation, instancing, and unsupported-capability behavior.
- `tests/playwright/wad-vox-regression.spec.js`
  Focused WAD, VOX, and Wizardry Babylon smoke coverage.
- `tests/playwright/backend-parity.spec.js`
  Broader cross-backend cart parity coverage.
- `tests/playwright/visual-regression.spec.js`
  Visual guardrails for skybox and PBR scenes where Babylon should stay close to Three.js without claiming pixel-perfect parity.

## Public Backend Entry Points

- `runtime/gpu-threejs.js`
  Thin public wrapper over `runtime/backends/threejs/gpu-threejs.js`.
- `runtime/gpu-babylon.js`
  Thin public wrapper over `runtime/backends/babylon/gpu-babylon.js`.

## Babylon Notes

The Babylon backend implementation is grouped into focused modules. The main implementation areas are:

- `bootstrap.js`
- `compat.js`
- `scene.js`
- `camera.js`
- `lights.js`
- `primitives.js`
- `transforms.js`
- `models.js`
- `instancing.js`
- `surface.js`

Current Babylon design rules:

- `engine` must mean the Nova64 engine adapter, not the raw Babylon renderer.
- `getRenderer()` returns the raw Babylon engine when direct renderer access is needed.
- Unsupported features should fail safely and advertise capability flags.
- Babylon WebXR support is routed through Babylon's native WebXR default experience in `runtime/xr.js`; do not use Three.js `renderer.xr` objects in Babylon mode.
- When WebXR VR is unavailable, Babylon mode should offer the Cardboard stereoscopic fallback instead of ending on an unavailable state.

## Babylon Compatibility Layer

`runtime/backends/babylon/compat.js` is the normalization layer for Babylon objects that need to satisfy long-standing Three-style cart expectations.

It currently provides parity shims for:

- scene traversal and root inspection: `scene.traverse`, `scene.children`
- scene graph object checks: `isObject3D`, `isMesh`, `isLight`, `type`
- Babylon mesh visibility bridging: `mesh.visible`
- material aliases: `material.color`, `material.map`, `material.transparent`, `material.opacity`
- color helpers: `color.set(...)`, `color.setHex(...)`, `color.getHex()`, `color.getHexString()`
- texture helpers: `texture.repeat`, `texture.offset`, `texture.wrapS`, `texture.wrapT`, `texture.needsUpdate`
- dirty/version tracking used by parity tests and cart utilities

Design rules for this layer:

- Put backend-normalization logic here instead of scattering one-off Babylon checks through carts.
- Keep the shim focused on Nova64 cart/runtime expectations, not a full Three.js reimplementation.
- Wire compatibility at creation and assignment points so loaded models, generated meshes, lights, textures, and materials all opt in automatically.
- Back new compatibility assumptions with Playwright coverage before depending on them broadly.

## Recent Babylon Rendering Work

Recent parity work focused on the places where carts were still clearly broken under Babylon:

- `@babylonjs/core` is now pinned to the current latest 9.x line used by the backend parity work.
- Babylon `enableAR()` now creates a native Babylon WebXR AR entry point, while `enableVR()` creates a Babylon WebXR entry point when the browser supports it.
- Babylon VR now exposes a working Cardboard fallback when native WebXR is not available, using Babylon stereoscopic camera rig mode and device-orientation updates.
- MediaPipe camera-background helpers now avoid assigning Three.js `VideoTexture` objects into Babylon scenes; Babylon uses a DOM video layer and transparent scene clear color for AR-style passthrough.
- `ar-hand-demo` now initializes its 3D scene even when webcam or MediaPipe hand tracking cannot start, so Babylon/headless smoke coverage does not fail on camera availability.
- WAD wall, floor, and sprite materials now use a safer Babylon texture/material path, including alpha and color-space handling for runtime-created textures.
- Babylon WAD rendering now leans on the compat layer for shared mesh/material/texture behavior instead of cart-local backend branching for every parity gap.
- Textured WAD walls use Babylon planes with per-mesh UV updates, while the Babylon wall/floor material tuning now avoids the earlier over-bright emissive look.
- Babylon engine-level material assignment now resolves mesh proxies as well as numeric mesh IDs, which keeps WAD wall/floor/sprite textures attached when carts call `engine.setMeshMaterial(meshProxy, material)`.
- Babylon vignette/post-processing setup now capability-checks pipeline properties and falls back when image-processing internals are unavailable, preventing WAD cart boot from aborting during environment load.
- Babylon native camera controls stay detached from the canvas so cart-owned camera movement remains deterministic across demos and tests.
- Three-style runtime calls like `material.color.set(0x336699)` and `texture.repeat.set(...)` now behave consistently on Babylon too.
- `wizardry-3d` no longer depends on the old store polyfill behavior; plain-object game store initializers now work with real Zustand too.
- Procedural Babylon sky spheres now use the correct material path and ignore fog, which fixes the blown-out `hello-skybox` rendering.
- Image skyboxes now rebuild asynchronously in carts that clear the scene, and Babylon now splits environment-map usage from visible skybox usage instead of treating both as the same texture path.
- Babylon planes are created double-sided so rotated floor planes in carts like `pbr-showcase` and `wad-demo` render reliably.
- Babylon voxel carts now use a backend-native voxel path in `runtime/backends/babylon/voxel.js` for atlas textures, chunk meshes, and simple voxel entity boxes instead of trying to add raw Three.js meshes into a Babylon scene.
- `runtime/api-voxel.js` now builds backend-neutral voxel mesh payloads and delegates chunk/entity creation to the active renderer, which fixes the Babylon `gpu.scene.add is not a function` crash path in carts like `minecraft-demo` and `voxel-creatures`.
- The default voxel world seed is now derived deterministically from the cart/demo identity instead of `Math.random()`, so Babylon and Three load the same terrain unless a cart explicitly requests a custom seed.
- Babylon voxel chunk materials now use a safer two-sided shader path, which fixes the large terrain-void/culling mismatch that was still visible in `minecraft-demo`.
- Babylon now also has guarded NOA probe and adapter seams in `runtime/backends/babylon/noa-prototype.js` and `runtime/backends/babylon/noa-adapter.js`; use them to investigate `noa-engine` incrementally without letting a Babylon-only engine bypass Nova64's shared voxel API. See `docs/BABYLON_NOA_PROTOTYPE.md` and `docs/BABYLON_NOA_INTEGRATION.md` for the current guardrails.
- The first `tsl-showcase` Galaxy scene now uses deterministic star placement, which makes Babylon-vs-Three visual comparisons measure renderer parity instead of per-load randomness.
- Babylon high-strength bloom requests now map to a wider/brighter Babylon post-processing setup so glowing TSL scenes stay closer to the Three.js UnrealBloom path while low-strength bloom scenes keep the conservative mapping.
- `createCube(...)` now accepts rectangular width/height/depth/color signatures as well as the classic cube size/color signature in both backends, keeping scene prop dimensions stable in demos such as `particles-demo`.
- `createSphere(...)` now accepts material options as the fourth argument as well as the explicit segments/options form, matching cart usage in glow-heavy demos such as the galaxy particle scene.
- `createCylinder(...)` now accepts the cart-facing radius/height/color signatures and the older tapered radiusTop/radiusBottom/height signature in both backends, preventing Babylon from interpreting colors as giant cylinder heights.
- `createPlane(...)` forwards material options through both backends, including opacity and transparency, so shared translucent scene props do not become opaque rectangles on Three.js.
- Babylon thin instances keep their source mesh render-visible, refresh matrix/color buffers during `finalizeInstances(...)`, and refresh bounds so the same instanced cart content remains visible under Babylon.
- Babylon particles now opt into mesh-level vertex colors/alpha, correct Babylon alpha modes, and HDR bloom so emissive particle carts such as `particles-demo` stay much closer to Three.js.
- 3D particle emitters now accept `directionX`, `directionY`, and `directionZ` in both backends; the default remains upward, but carts such as the waterfall scene can emit downward water without relying on inverted gravity.
- Godot shim now exposes `engine.createDataTexture(pixels, w, h)` as a material-proxy entry point routing through `texture.createFromImage` in the bridge; cart code that calls `engine.createDataTexture` and then passes the handle to `engine.createMaterial({ map: tex })` works the same way as the Three.js and Babylon adapters.
- Godot `material.create` bridge command now accepts `uvOffset` (Vector3) alongside `uvScale`, enabling `setWallUVs` to pass WAD texture X/Y offsets through to `StandardMaterial3D::set_uv1_offset` so DOOM wall textures align precisely instead of being clamped to origin.
- Godot shim's `WADTextureManager._uploadDataTexture` now delegates to `engine.createDataTexture` internally, removing duplicated bridge-transport code.
- Godot shim now exposes `getCamera()` in `nova64.camera` returning `{ position: { x, y, z } }`, so billboard sprite code like `const cam = getCamera(); Math.atan2(cam.position.x - e.x, ...)` works without throwing on the Godot host.
- Godot `createPlane` already creates double-sided planes by default (matches the Babylon plane double-sided fix), so WAD floor/ceiling and sprite billboards render correctly from all viewing angles.

Current visual status:

- `hello-skybox` is back in close visual range with Three.js and covered by Playwright visual regression.
- `pbr-showcase` is much closer than the earlier broken Babylon output, but it still does not match Three.js perfectly because Babylon does not yet have full PMREM and post-processing parity in Nova64.
- `tsl-showcase` scene 1, Galaxy Spiral, has a focused visual regression check and currently stays below the intentionally loose shader/parity threshold after the deterministic star-field and Babylon bloom tuning work.
- `wad-demo` now has focused Babylon visual guardrails and is back down in the low-single-digit diff range in the gameplay-frame regression check on a clean server.
- Babylon voxel carts now boot and render chunk/entity content without Three-only scene errors, but voxel visual parity still needs follow-up work around custom material parity, chunk shading, and screenshot-level similarity against Three.js.
- `minecraft-demo` now has deterministic terrain and a focused voxel visual regression guardrail, with the Babylon gameplay-frame diff back down into the low-to-mid teens instead of the earlier broken ~35%+ range caused by seed drift and chunk-face culling.
- The visual regression threshold for `pbr-showcase` is intentionally looser than simple skybox scenes so it can still catch major regressions without pretending the two backends are identical today.
- `particles-demo` now has a focused visual regression pass again after the cylinder signature fix and Babylon particle bloom/material tuning; the demo is still not pixel-identical, but the fire scene should no longer show the old center-pillar artifact.
- `particles-demo` also has a waterfall-specific visual regression check, and `instancing-demo` now uses deterministic scene layouts plus its own visual parity guardrail.

## Focused Validation

These are the most useful narrow checks for the current Babylon parity surface:

- `pnpm test:babylon:api`
- `pnpm exec playwright test tests/playwright/api-compatibility.spec.js --reporter=line`
- `pnpm exec playwright test tests/playwright/wad-vox-regression.spec.js --grep "wad-demo" --reporter=line`
- `pnpm exec playwright test tests/playwright/wad-vox-regression.spec.js --grep "Voxel Regression" --reporter=line`
- `pnpm exec playwright test tests/playwright/backend-parity.spec.js --grep 'Minecraft Demo|Voxel Terrain|Voxel Creative|Voxel Creatures' --reporter=line`
- `pnpm exec playwright test tests/playwright/visual-regression.spec.js --grep "minecraft-demo should stay reasonably similar" --reporter=line`
- `pnpm exec playwright test tests/playwright/visual-regression.spec.js --grep "wad-demo gameplay frame" --reporter=line`
- `pnpm exec playwright test tests/playwright/visual-regression.spec.js --grep "tsl-showcase galaxy" --reporter=line`
- `pnpm exec playwright test tests/playwright/visual-regression.spec.js --grep "particles-demo" --reporter=line`
- `pnpm exec playwright test tests/playwright/xr-ar-babylon.spec.js --reporter=line`

Use the WAD-specific visual and regression slices first when touching Babylon WAD rendering, UVs, materials, lights, or compatibility shims. Use the voxel-focused regression and backend-parity slices first when touching `runtime/api-voxel.js` or `runtime/backends/babylon/voxel.js`.
Use the XR/AR slice first when touching `runtime/xr.js`, `runtime/mediapipe.js`, or demos that call WebXR/MediaPipe APIs.
Use the TSL Galaxy slice first when touching Babylon post-processing, procedural shader materials, particle glow, or the `tsl-showcase` cart.

## Remaining Babylon Backlog

- fuller particle-system parity
- broader model-loading parity beyond VOX coverage
- voxel visual parity against Three.js beyond “boots and runs”
- voxel support for more advanced custom/entity mesh cases if carts move beyond simple box entities
- post-processing parity beyond safe capability-gated warnings
- continued removal of façade-only glue as shared contracts mature

## Extending The Runtime

When adding a new cart-facing 3D API:

1. Add the function to the appropriate backend module(s).
2. Update `runtime/shared/backend-surface.js` if it is required or capability-gated.
3. Expose it through the public wrapper layer.
4. Add or update parity coverage in Playwright.

When behavior is backend-specific:

1. Add an explicit capability flag.
2. Fail safely instead of throwing in normal cart usage.
3. Cover the limitation with a focused regression or compatibility test.
