# Nova64 Adapter Contract

**Version: 1.0.0**
**Status: Active**

---

## Purpose

This document is the canonical definition of the Nova64 engine adapter surface.

Any renderer or host backend that wants to work with Nova64 game carts must implement every method listed in this contract and must return a valid capabilities object from `getCapabilities()`.

The contract is intentionally narrow. It covers the minimum operations that the Nova64 runtime and cart API require. Backend-specific features (e.g., Three.js post-processing, Unity coroutines, Babylon.js physics) live outside this contract and are exposed only if the backend declares them through its capabilities.

---

## Versioning

The contract version is a semver string exported as `ADAPTER_CONTRACT_VERSION` from `runtime/engine-adapter.js`.

- **Patch bumps** — clarifications, documentation changes, no implementation impact
- **Minor bumps** — new optional methods added to the surface (backwards compatible)
- **Major bumps** — existing method signatures change, breaking changes; requires migration

Adapters must declare the contract version they implement in their `getCapabilities()` return value via the `contractVersion` field.

---

## Required Methods

Every conforming adapter must implement all of the following. The conformance test suite at `tests/test-adapter-conformance.js` validates each entry.

### Material Methods

#### `createMaterial(type, opts) → opaque handle`

Create a material.

| Parameter          | Type                               | Description                    |
| ------------------ | ---------------------------------- | ------------------------------ |
| `type`             | `'basic' \| 'phong' \| 'standard'` | Material model                 |
| `opts.color`       | `number \| { r, g, b }`            | Base color                     |
| `opts.map`         | texture handle                     | Optional texture map           |
| `opts.transparent` | `boolean`                          | Enable alpha blending          |
| `opts.alphaTest`   | `number` (0–1)                     | Alpha test cutoff              |
| `opts.side`        | `'front' \| 'back' \| 'double'`    | Face culling                   |
| `opts.roughness`   | `number`                           | Roughness (standard only)      |
| `opts.metalness`   | `number`                           | Metalness (standard only)      |
| `opts.emissive`    | `number`                           | Emissive color (standard only) |
| `opts.flatShading` | `boolean`                          | Flat shading (standard only)   |

Returns an opaque material handle. The handle type is backend-specific. Cart code must not inspect its internals.

---

### Texture Methods

#### `createDataTexture(data, width, height, opts) → opaque handle`

Create a texture from a raw pixel buffer.

| Parameter              | Type                              | Description                         |
| ---------------------- | --------------------------------- | ----------------------------------- |
| `data`                 | `Uint8Array \| Uint8ClampedArray` | RGBA pixel data                     |
| `width`                | `number`                          | Texture width in pixels             |
| `height`               | `number`                          | Texture height in pixels            |
| `opts.format`          | `'rgba'`                          | Pixel format (default: `'rgba'`)    |
| `opts.filter`          | `'nearest' \| 'linear'`           | Sampling filter                     |
| `opts.wrap`            | `'repeat' \| 'clamp'`             | UV wrapping mode                    |
| `opts.generateMipmaps` | `boolean`                         | Mipmap generation (default: `true`) |

#### `createCanvasTexture(canvas, opts) → opaque handle`

Create a texture from an HTMLCanvasElement.

| Parameter     | Type                    | Description      |
| ------------- | ----------------------- | ---------------- |
| `canvas`      | `HTMLCanvasElement`     | Source canvas    |
| `opts.filter` | `'nearest' \| 'linear'` | Sampling filter  |
| `opts.wrap`   | `'repeat' \| 'clamp'`   | UV wrapping mode |

#### `cloneTexture(textureHandle) → opaque handle`

Clone an existing texture handle.

#### `setTextureRepeat(textureHandle, x, y) → void`

Set UV repeat on a texture.

#### `invalidateTexture(textureHandle) → void`

Mark a texture as dirty so the backend re-uploads it on the next frame.

---

### Geometry Methods

#### `createPlaneGeometry(width, height, segX, segY) → opaque handle`

Create a flat plane geometry.

| Parameter | Type     | Default  |
| --------- | -------- | -------- |
| `width`   | `number` | required |
| `height`  | `number` | required |
| `segX`    | `number` | `1`      |
| `segY`    | `number` | `1`      |

---

### Mesh Methods

#### `setMeshMaterial(meshId, materialHandle) → void`

Assign a material to a mesh by ID.

| Parameter        | Type               | Description                         |
| ---------------- | ------------------ | ----------------------------------- |
| `meshId`         | `number \| string` | Mesh identifier                     |
| `materialHandle` | opaque handle      | Handle returned by `createMaterial` |

---

### Color Methods

#### `createColor(r, g, b) → opaque handle`

Create a color value. `r`, `g`, `b` are floats in the range 0–1.

The returned value may be a `THREE.Color`, a `{ r, g, b }` plain object, or any opaque handle depending on the backend.

---

### Camera Methods

#### `getCameraPosition() → { x: number, y: number, z: number }`

Return the current camera world position.

The returned object must have finite numeric `x`, `y`, `z` fields. Backends that have not positioned a camera yet must return `{ x: 0, y: 0, z: 0 }`.

---

### Capability Methods

#### `getCapabilities() → Capabilities`

Return a frozen capabilities object describing this backend.

The returned object must conform to the following shape:

```typescript
interface Capabilities {
  backend: string; // Backend identifier: 'threejs', 'unity', 'babylon', 'godot', …
  contractVersion: string; // Must equal ADAPTER_CONTRACT_VERSION
  adapterVersion: string; // Backend-specific semver
  features: readonly string[]; // Feature identifiers declared by this backend
  supports(feature: string): boolean; // Returns true iff feature is in the features list
}
```

---

## Feature Identifiers

Standard feature strings that adapters should use when declaring capabilities. Custom backend-specific features are allowed but must be namespaced with the backend name, e.g. `'threejs:bloom'` or `'unity:prefab-loading'`.

| Feature string        | Description                                |
| --------------------- | ------------------------------------------ |
| `material:basic`      | `MeshBasicMaterial` or equivalent          |
| `material:phong`      | `MeshPhongMaterial` or equivalent          |
| `material:standard`   | `MeshStandardMaterial` (PBR) or equivalent |
| `texture:data`        | Raw pixel buffer texture creation          |
| `texture:canvas`      | HTMLCanvasElement-backed texture           |
| `texture:repeat`      | UV repeat support                          |
| `geometry:plane`      | Plane geometry primitive                   |
| `camera:read`         | Camera position read-back                  |
| `camera:write`        | Camera position/target/fov write           |
| `lights:ambient`      | Ambient light control                      |
| `lights:point`        | Point light creation                       |
| `lights:directional`  | Directional light control                  |
| `shadows`             | Shadow map support                         |
| `instancing`          | Instanced mesh rendering                   |
| `audio:sfx`           | Sound effect playback                      |
| `physics:aabb`        | AABB collision and gravity                 |
| `input:keyboard`      | Keyboard polling                           |
| `input:gamepad`       | Gamepad polling                            |
| `asset:gltf`          | GLTF/GLB model loading                     |
| `asset:texture-atlas` | Texture atlas loading                      |

---

## Command-Buffer Transport

For host bridges (Unity, Godot) where one-call-per-operation is expensive, Nova64 provides `createCommandBufferAdapter(innerAdapter, opts)`.

This wrapper buffers every mutating call into an in-memory queue. The host polling loop calls `adapter.flush()` once per frame to drain the queue to the inner adapter.

Read-through calls (`getCameraPosition`, `getCapabilities`) bypass the buffer entirely.

```javascript
import { createCommandBufferAdapter, createUnityBridgeAdapter } from 'nova64/runtime';

const bridge = globalThis.__NOVA64_UNITY_BRIDGE__;
const unityAdapter = createUnityBridgeAdapter(bridge);
const buffered = createCommandBufferAdapter(unityAdapter, { maxQueueSize: 512 });

// Boot Nova64 with the buffered transport
setEngineAdapter(buffered);

// In your Unity JS-to-C# host update loop:
function onFrameEnd() {
  buffered.flush(); // drains all buffered commands to the Unity bridge in one batch
}
```

### API

| Method             | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| `flush()`          | Drain all queued commands to the inner adapter in registration order |
| `pendingCount()`   | Return the number of commands currently in the buffer                |
| `discardPending()` | Drop all queued commands without executing them                      |

### Options

| Option         | Type      | Default | Description                                      |
| -------------- | --------- | ------- | ------------------------------------------------ |
| `autoFlush`    | `boolean` | `false` | Execute each call immediately without buffering  |
| `maxQueueSize` | `number`  | `512`   | Log a warning when the queue exceeds this length |

---

## Conformance Tests

Every adapter must pass `runAdapterConformanceTests(adapter, runner, { name })` from `tests/test-adapter-conformance.js` before being merged.

The conformance suite validates:

- All required methods are present and callable
- `getCapabilities()` returns a valid, versioned capabilities object
- `getCameraPosition()` returns a `{ x, y, z }` with finite numbers
- `createMaterial`, `createPlaneGeometry`, `createColor` do not throw

New backends should also add their own extended test file for backend-specific behavior.

---

## Future Contract Extensions (planned)

These capabilities are tracked but not yet in the contract. They will be added in a future minor bump.

| Feature                                                           | Phase           |
| ----------------------------------------------------------------- | --------------- |
| `camera:write` (setCameraPosition, setCameraTarget, setCameraFOV) | Phase 1.1       |
| `lights:ambient`, `lights:point`, `lights:directional`            | Phase 1.1       |
| `mesh:create` (createMesh, removeMesh)                            | Phase 1.1       |
| `transforms` (setPosition, setScale, rotateMesh)                  | Phase 1.1       |
| `asset:gltf`                                                      | Phase 3 (Unity) |
| `audio:sfx`                                                       | Phase 1.1       |
| `input:keyboard`, `input:gamepad`                                 | Phase 1.1       |

---

_Maintained alongside `runtime/engine-adapter.js`. Update this document whenever `ADAPTER_CONTRACT_VERSION` changes._
