# Babylon.js NOA Engine Integration

This document describes the experimental `noa-engine` adapter for Nova64's Babylon.js voxel backend.

## Overview

Nova64 includes an optional, guarded integration with `noa-engine`, an experimental voxel game engine built on Babylon.js. The adapter is opt-in and must not replace Nova64's shared voxel API: existing carts should continue to call the normal voxel functions whether NOA is active or unavailable.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cart (game code)                         │
│              uses nova64.voxel API (api-voxel.js)               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      runtime/api-voxel.js                       │
│            Shared voxel API - backend agnostic                  │
│   (terrain gen, physics, entities, lighting, persistence)       │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Three.js GPU   │  │  Babylon.js GPU  │  │  Babylon.js GPU  │
│   (gpu-three.js) │  │  (voxel.js)      │  │  + NOA Adapter   │
│                  │  │                  │  │  (noa-adapter.js)│
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                       │                    │
        ▼                       ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Three.js       │  │   Babylon.js     │  │   noa-engine     │
│   WebGL Renderer │  │   WebGL Engine   │  │   (optional)     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Dependency

`noa-engine` is an optional dependency pinned to the latest published `0.33.x` line. In the Nova64 repo, install through the normal WSL workflow:

```bash
pnpm install
```

If a package manager skips optional dependencies, the adapter reports a graceful inactive status and Babylon continues to use Nova64's built-in voxel renderer.

## Usage

### Checking NOA Availability

```javascript
// Check if NOA adapter is available (Babylon.js backend only)
const status = getVoxelNoaAdapterStatus();
console.log(status);
// { initialized: false, active: false, version: '0.1.0', ... }
```

### Enabling NOA Adapter

```javascript
// Enable NOA adapter (async; Babylon.js backend only)
const result = await enableVoxelNoaAdapter({
  debug: false,
  chunkSize: 16,
  renderDistance: 4,
});

if (result.active) {
  console.log('NOA adapter is now active!');
  console.log('Features:', result.features);
  // { physics: true, entities: true, terrain: true, meshing: true }
}
```

### Checking NOA Status

```javascript
// Check if NOA is currently active
if (isVoxelNoaActive()) {
  console.log('Using NOA-enhanced voxel backend');
} else {
  console.log('Using standard voxel backend');
}
```

### Disabling NOA Adapter

```javascript
// Disable NOA and return to standard backend
disableVoxelNoaAdapter();
```

## Backwards Compatibility

Existing cart-facing voxel APIs must keep working whether NOA is active or not:

- `updateVoxelWorld(x, z)` - Load/unload chunks around position
- `getVoxelBlock(x, y, z)` - Get block type at position
- `setVoxelBlock(x, y, z, blockId)` - Set block at position
- `raycastVoxelBlock(origin, direction, distance)` - Raycast for block selection
- `moveVoxelEntity(pos, velocity, size, dt)` - Physics with collision detection
- `spawnVoxelEntity(type, pos, opts)` - Spawn entities
- `configureVoxelWorld(opts)` - Configure world settings
- ... and all other voxel API functions

## NOA-Specific Features

When NOA is active, backend-level diagnostics can access additional NOA state:

```javascript
// These only work when isVoxelNoaActive() returns true
const engine = gpu.noaEngine; // advanced backend diagnostics only
```

## Configuration Options

When enabling the NOA adapter:

```javascript
await enableVoxelNoaAdapter({
  // Debug mode - shows FPS, chunk boundaries, etc.
  debug: false,

  // Chunk size (must match Nova64's CHUNK_SIZE)
  chunkSize: 16,

  // Render distance in chunks
  renderDistance: 4,

  // Advanced NOA configuration (optional)
  noaConfig: {
    playerHeight: 1.8,
    playerWidth: 0.6,
    tickRate: 30,
    // ... see noa-engine docs for full options
  }
});
```

## URL Parameters

You can enable NOA probing via URL parameters:

```
?noaVoxel=probe     Enable NOA feature detection
?noaVoxel=true      Enable NOA adapter if available
?noaVoxel=false     Disable NOA adapter
```

## LocalStorage

NOA preference can also be stored:

```javascript
localStorage.setItem('nova64:noaVoxel', 'probe');
```

## Files

| File | Description |
|------|-------------|
| `runtime/api-voxel.js` | Cart-facing voxel API (shared between backends) |
| `runtime/backends/babylon/voxel.js` | Standard Babylon.js voxel backend |
| `runtime/backends/babylon/noa-adapter.js` | NOA engine adapter for Babylon.js |
| `runtime/backends/babylon/noa-prototype.js` | NOA feature detection and probing |

## Testing

Run the voxel examples to test NOA integration:

```bash
# Test minecraft-demo with Babylon.js backend
pnpm dev
# Navigate to: http://localhost:5173/babylon_console.html?demo=minecraft-demo

# Test with NOA probing enabled
# Navigate to: http://localhost:5173/babylon_console.html?demo=minecraft-demo&noaVoxel=probe
```

## Troubleshooting

### "NOA adapter not available"

- Ensure you're using the Babylon.js backend (`babylon_console.html`)
- Check that optional dependencies were installed with `pnpm install`

### "noa-engine does not export Engine class"

- Ensure you have a compatible version of noa-engine (>=0.33.0)
- Try updating: `pnpm update noa-engine`

### Performance issues

- NOA adapter is experimental; if you experience performance issues, disable it:
  ```javascript
  disableVoxelNoaAdapter();
  ```
- The standard Babylon.js voxel backend is highly optimized and recommended for production

### Babylon peer dependency warning

`noa-engine@0.33.0` currently declares an older Babylon peer range than Nova64 uses. Treat pnpm's peer warning as part of the experiment, keep the adapter opt-in, and validate Babylon voxel carts before expanding NOA ownership.

## References

- [noa-engine GitHub](https://github.com/fenomas/noa)
- [noa-engine API Documentation](https://fenomas.github.io/noa/API/)
- [noa-examples](https://github.com/fenomas/noa-examples)
- [Babylon.js Documentation](https://doc.babylonjs.com/)
