# Babylon NOA Prototype Notes

This note is for agents continuing Babylon voxel parity work.

## Current Position

Nova64 has an experimental NOA probe seam at:

- `runtime/backends/babylon/noa-prototype.js`

Nova64 also has an opt-in adapter at:

- `runtime/backends/babylon/noa-adapter.js`

This is intentionally not a full runtime swap. The default Babylon voxel path still lives in:

- `runtime/backends/babylon/voxel.js`
- `runtime/api-voxel.js`

The shared Nova64 voxel API remains the canonical cart-facing contract.

## Why The Prototype Is Guarded

`noa-engine` is promising because it is Babylon-native, but it is also a larger engine with its own world, registry, entity, and render ownership model.

Two practical constraints matter right now:

1. Nova64 already owns world generation, chunk lifecycles, entities, and cart-facing voxel APIs in `runtime/api-voxel.js`.
2. The published package is currently `noa-engine@0.33.0`, and its npm peer dependency still targets `@babylonjs/core ^6.1.0`, while Nova64 is on Babylon 7.

Because of that, the current integration point is probe-first instead of takeover-first.

## What Exists Today

The prototype exposes two shared voxel diagnostics:

- `getVoxelNoaPrototypeStatus()`
- `probeVoxelNoaPrototype()`

These are available through flat globals and `nova64.voxel.*`.

On Babylon:

- `?noaVoxel=1` or `?noaVoxel=probe` requests a probe on boot.
- `localStorage['nova64:noaVoxel'] = '1'` also requests a probe.
- `globalThis.NOVA64_NOA_PROTOTYPE = true` can request a probe before runtime boot.

The probe attempts to load `noa-engine` and reports whether the module is available. The adapter APIs are separate and opt-in so the default Babylon renderer remains stable.

## Adapter Controls

The experimental adapter exposes these controls through flat globals and `nova64.voxel.*`:

- `enableVoxelNoaAdapter(options)`
- `disableVoxelNoaAdapter()`
- `getVoxelNoaAdapterStatus()`
- `isVoxelNoaActive()`

Keep these guarded. They should report inactive status gracefully when NOA is unavailable or incompatible.

## Expected Status Values

Typical `reason` values from `getVoxelNoaPrototypeStatus()`:

- `disabled`
- `unsupported-backend`
- `requested-pending`
- `dependency-missing`
- `loaded-awaiting-adapter`

`active` should stay `false` for probe-only status. Adapter status is reported separately by `getVoxelNoaAdapterStatus()`.

## Next Safe Steps

1. Keep validating `minecraft-demo` and `voxel-creatures` first.
2. Prototype one isolated concern at a time:
   - chunk meshing
   - chunk streaming / world paging
   - collision / entity movement
3. Keep Nova64 carts on the existing shared voxel API while experimenting behind the Babylon seam.
4. Do not add cart-level `if (backend === 'babylon')` NOA branches.
5. Test build stability first when touching the adapter because `noa-engine@0.33.0` predates Nova64's current Babylon line.

## Validation

Use these first when touching the prototype seam:

- `pnpm test:babylon:api`
- `pnpm exec playwright test tests/playwright/wad-vox-regression.spec.js --grep "Voxel Regression" --reporter=line`
- `pnpm exec playwright test tests/playwright/backend-parity.spec.js --grep "Voxel" --reporter=line`

If the probe seam changes, keep the fallback path graceful: Babylon should continue using Nova64's built-in voxel renderer when NOA is unavailable.
