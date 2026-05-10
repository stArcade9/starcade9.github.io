# Nova64 Godot Host Contract

**Adapter contract version:** `1.0.0`  
**Godot adapter version:** `0.5.0`  
**Status: Active — Phase 3 in-progress polish**

---

## Purpose

This document is the authoritative reference for the Nova64 Godot host bridge.
It covers:

- the `call_bridge(method, payload) → Dictionary` entry point
- every supported command, its payload shape, and its return value
- the capabilities descriptor
- the input poll format
- handle lifecycle rules
- known gaps vs the Three.js and Babylon browsers backends
- cart lifecycle wiring

For the general adapter surface that all backends must satisfy see
`docs/ADAPTER_CONTRACT.md`. For backend structure and ownership rules see
`docs/BACKEND_RUNTIME.md`.

---

## Architecture Overview

```
JS (QuickJS)   →   engine.call(method, payload)
                         ↓
               nova64-godot/gdextension/src/bridge.cpp
               Nova64Host::call_bridge(method, payload)
                         ↓
               GDScript node tree + Godot rendering APIs
```

Nova64 JS runs inside QuickJS embedded in a Godot GDExtension node
(`Nova64Host`). All rendering, input, audio, and asset work crosses the
bridge via `engine.call(method, payload)`. No direct Godot API calls
exist in cart code or the JS shim.

The shim at `nova64-godot/godot_project/shim/nova64-compat.js` translates
cart-facing Nova64 API calls (`createCube`, `setCameraPosition`, etc.) into
`call_bridge` method+payload pairs. Cart code never calls `engine.call`
directly.

---

## Bridge Entry Point

```
Nova64Host::call_bridge(method: String, payload: Dictionary) → Dictionary
```

- **`method`** — dot-separated namespace and command, e.g. `"material.create"`.
- **`payload`** — zero or more named parameters.
- **return** — a Dictionary; always includes `{ "error": ..., "message": ... }` on failure.

Unknown methods return `{ "error": "unsupported_method" }`.

Batched dispatch is available via `engine.flush(commands)` where `commands`
is an Array of `[method, payload]` pairs or `{m, p}` objects. Returns an
Array of result Dictionaries in the same order.

---

## Capabilities Descriptor

`host.getCapabilities` (or `engine.init`) returns a Dictionary:

```json
{
  "backend": "godot",
  "contractVersion": "1.0.0",
  "adapterVersion": "0.5.0",
  "features": [ ... ]
}
```

The `features` array lists every method string that `call_bridge` will
handle without returning `unsupported_method`. Cart and runtime code should
use this array for feature detection rather than hard-coding backend checks.

---

## Handle Lifecycle

- Every `*.create` command returns `{ "handle": <integer> }`.
- Handles are opaque 32-bit unsigned integers managed by `HandleTable`.
- Handle kinds: `MATERIAL`, `GEOMETRY`, `MESH_INSTANCE`, `CAMERA`, `LIGHT`,
  `TEXTURE`, `AUDIO`, `MULTI_MESH`, `PARTICLES`.
- Passing a handle of the wrong kind to a command returns
  `{ "error": "invalid_*_handle" }`.
- Destroy commands free the backing Godot node and resource. Using a
  destroyed handle is a no-op (safe but silently ignored).
- `transform.set` resolves handles of kinds `MESH_INSTANCE`, `CAMERA`,
  `LIGHT`, `MULTI_MESH`, and `PARTICLES` — all node-backed resource types.

---

## Command Reference

### System

| Method | Payload | Returns |
|--------|---------|---------|
| `host.getCapabilities` | — | `{ backend, contractVersion, adapterVersion, features[] }` |
| `engine.init` | — | `{ capabilities: <same as above> }` |
| `engine.flush` | `commands: Array` | `Array` of per-command results |

---

### Material

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `material.create` | `albedo` (r/g/b/a), `metallic`, `roughness`, `specular`, `emission`, `emissionEnergy`, `transparency` (`'alpha'`/`'scissor'`/`'hash'`/`'depth_prepass'`), `alphaCut`, `blend` (`'add'`/`'sub'`/`'mul'`), `unshaded`, `shadingMode` (`'unshaded'`/`'per_vertex'`/`'per_pixel'`), `diffuseMode` (`'lambert_wrap'`/`'toon'`/`'burley'`), `specularMode` (`'toon'`/`'disabled'`), `rim`, `rimTint`, `clearcoat`, `clearcoatRoughness`, `anisotropy`, `doubleSided`, `castShadow`, `receiveShadow`, `depthTest`, `depthWrite`, `textures` (object of slot→handle maps) | `{ handle }` |
| `material.destroy` | `handle` | `{ ok }` |
| `material.emission` | `handle`, `color` (r/g/b), `energy` | `{ ok }` |
| `material.blend.add` | `handle` | `{ ok }` |

Colors are passed as `{ r, g, b, a }` floats (0–1) or as a single `number`
encoding `0xRRGGBB`.

---

### Geometry

All geometry commands return `{ handle }`. Geometry handles are immutable
after creation; rebuild to change shape.

| Method | Key payload fields |
|--------|--------------------|
| `geometry.createBox` | `w`, `h`, `d` (default 1) |
| `geometry.createSphere` | `radius` (default 0.5), `rings`, `segments` |
| `geometry.createPlane` | `w`, `h` (default 1), `subdivide` |
| `geometry.createCylinder` | `radius` (default 0.5), `height` (default 1), `segments` |
| `geometry.createCone` | `radius` (default 0.5), `height` (default 1), `segments` |
| `geometry.createTorus` | `innerRadius`, `outerRadius`, `rings`, `segments` |

---

### Mesh

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `mesh.create` | `geometry` (handle), `material` (handle, optional) | `{ handle }` |
| `mesh.setMaterial` | `mesh` (handle), `material` (handle) | `{ ok }` |
| `mesh.destroy` | `handle` | `{ ok }` |
| `mesh.createInstanced` | `geometry` (handle), `count`, `material` (handle) | `{ handle }` |

---

### Transform

`transform.set` applies to any node-backed handle (mesh, camera, light,
instanced mesh, particles).

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `transform.set` | `handle`, `position` ({x,y,z}), `rotation` ({x,y,z} radians), `lookAt` ({x,y,z}), `scale` ({x,y,z}), `visible` (bool) | `{ ok }` |

If both `lookAt` and `rotation` are present, `lookAt` wins.

---

### Camera

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `camera.create` | `fov` (default 60), `near` (default 0.1), `far` (default 1000) | `{ handle }` |
| `camera.setActive` | `handle` | `{ ok }` |
| `camera.setParams` | `handle`, `fov`, `near`, `far` | `{ ok }` |

---

### Lights

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `light.createDirectional` | `color` ({r,g,b}), `energy` (default 1.0), `shadow` (bool, default true) | `{ handle }` |
| `light.createPoint` | `color` ({r,g,b}), `energy` (default 1.0), `range` (default 20), `shadow` (bool) | `{ handle }` |
| `light.createSpot` | `color`, `energy`, `range`, `angle` (degrees), `shadow` | `{ handle }` |
| `light.setColor` | `handle`, `color` ({r,g,b}) | `{ ok }` |
| `light.setEnergy` | `handle`, `energy` | `{ ok }` |
| `light.setSun` | `energy`, `color`, `pitch` (degrees), `yaw` (degrees) | `{ ok }` |

`light.setSun` creates or updates a shared `DirectionalLight3D` used for
day/night cycles. It is separate from individually tracked light handles.

---

### Environment

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `env.set` | `fog` (bool), `fogColor` ({r,g,b}), `fogDensity`, `fogNear`, `fogFar`, `ambientColor` ({r,g,b}), `ambientEnergy`, `sky` (`'procedural'`/`'none'`), `skyColor` ({r,g,b}), `skyHorizonColor`, `glow` (bool), `glowIntensity`, `ssao` (bool), `tonemapper` (`'linear'`/`'reinhardt'`/`'filmic'`/`'aces'`) | `{ ok }` |

---

### Input Poll

`input.poll` takes no payload and returns a snapshot of current Godot input state.

```json
{
  "keys": ["KeyA", "Space"],        // web-style key codes currently held
  "left": true,                      // Arrow/WASD convenience bools
  "right": false,
  "up": false,
  "down": false,
  "action": false,
  "buttons": [false, false, ...],    // 14-element gamepad button array
  "axis": { "lx": 0.0, "ly": 0.0, "rx": 0.0, "ry": 0.0, "lt": 0.0, "rt": 0.0 }
}
```

**Key codes** use web `KeyboardEvent.code` names (`"KeyW"`, `"ArrowLeft"`,
`"Space"`, `"Enter"`, `"ShiftLeft"`, etc.). The full mapped set is defined
in `bridge.cpp` at `_cmd_input_poll`.

**Gamepad button array** (`buttons[0..13]`) maps to the Nova64 gamepad layout:
`0=ArrowLeft, 1=ArrowRight, 2=ArrowUp, 3=ArrowDown, 4=KeyZ, 5=KeyX,
6=KeyC, 7=KeyV, 8=KeyA, 9=KeyS, 10=KeyQ, 11=KeyW, 12=Enter, 13=Space`.

Axes apply a shaped deadzone (0.18) and power curve (exponent 1.35).

---

### Texture

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `texture.createFromImage` | `data` (Array of RGBA bytes), `width`, `height`, `filter` (`'nearest'`/`'linear'`), `mipmap` (bool, default true), `srgb` (bool) | `{ handle }` |
| `texture.destroy` | `handle` | `{ ok }` |

---

### Audio

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `audio.loadStream` | `path` (Godot resource path), `loop` (bool) | `{ handle }` |
| `audio.play` | `handle`, `volume` (0–1, default 1), `pitch` (default 1) | `{ ok }` |
| `audio.stop` | `handle` | `{ ok }` |

---

### Instanced Mesh

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `mesh.createInstanced` | `geometry` (handle), `count` (max instances), `material` (handle) | `{ handle }` |
| `instance.setTransform` | `handle`, `index`, `position`, `rotation`, `scale`, `color` ({r,g,b,a}) | `{ ok }` |

---

### Particles

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `particles.create` | `count` (default 500), `lifetime` (seconds, default 1), `color` ({r,g,b,a}), `speed` (default 2), `spread` (degrees, default 45), `gravity` ({x,y,z}), `directionX/Y/Z`, `emitting` (bool, default true), `position` ({x,y,z}), `geometry` (handle, optional) | `{ handle }` |
| `particles.destroy` | `handle` | `{ ok }` |

---

### Model Loading

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `model.load` | `path` (Godot resource path), `position` ({x,y,z}), `rotation` ({x,y,z}), `scale` ({x,y,z}) | `{ handle, childHandles[] }` |
| `vox.load` | `path` (Godot resource path), `scale` (default 0.1), `position` ({x,y,z}) | `{ handle }` |

---

### Voxel

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `voxel.uploadChunk` | `cx`, `cz` (chunk coords), `columns` (Array of compact column records), `chunkSize`, `seaLevel`, `atlasUrl`, `atlasTileSize`, `atlasTilesPerRow`, `trees` (Array), `meshMin`/`meshMax` (mesh bounds override) | `{ ok }` |

The compact column record format is documented in `docs/GODOT_VOXEL_PLAN.md`.

---

### WAD Loading

The WAD bridge exposes the WAD directory and raw lump data to JS for parsing
by `runtime/wad.js`. The C++ side handles file I/O; JS handles all parsing.

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `wad.load` | `path` (Godot resource path, e.g. `res://assets/freedoom1.wad`) | `{ handle, tag, directory[], path, size }` |
| `wad.readLump` | `handle`, `filepos`, `size` | `{ bytes: Array, size }` |
| `wad.destroy` | `handle` | `{ ok }` |

`wad.load` returns a `directory` array of `{ name, filepos, size }` objects
for every lump. Carts call `wad.readLump` to fetch individual lump byte
arrays, which are then decoded by `WADLoader` in JS.

---

### Overlay (2D HUD)

Overlay commands draw on a `CanvasLayer` rendered above the 3D scene.
Coordinates are in the cart's 640×360 virtual canvas space.

| Method | Key payload fields | Returns |
|--------|--------------------|---------|
| `overlay.cls` | `r`, `g`, `b`, `a` (clear color, default transparent) | `{ ok }` |
| `overlay.pset` | `x`, `y`, `color` ({r,g,b,a}) | `{ ok }` |
| `overlay.rect` | `x`, `y`, `w`, `h`, `color` ({r,g,b,a}), `fill` (bool, default true) | `{ ok }` |
| `overlay.line` | `x1`, `y1`, `x2`, `y2`, `color`, `width` | `{ ok }` |
| `overlay.circle` | `x`, `y`, `r`, `color`, `fill` | `{ ok }` |
| `overlay.text` | `x`, `y`, `text`, `color`, `size` (font size px) | `{ ok }` |
| `overlay.batch` | `ops: Array` of individual overlay command objects (each has `type` + fields above) | `{ ok }` |

`overlay.batch` is the preferred path for HUD-heavy carts; it amortises
the JS→C++ call overhead to a single round-trip per frame.

---

## Cart Lifecycle

Godot drives the cart lifecycle through `Nova64Host` node callbacks:

1. `load_cart(res_path)` — evaluates the cart ES module, caches `init`,
   `update`, `draw` exports. Returns `false` if the module has no
   recognisable lifecycle exports.
2. `cart_init()` — calls the cart's `init()` export once.
3. `cart_update(delta)` — calls `update(dt)` every `_process` frame.
4. `cart_draw()` — calls `draw()` every frame after `cart_update`.

The host GDScript (`scripts/nova64_host.gd`) wires these to
`Node._process(delta)`.

---

## Capability Matrix

The table below summarises supported and unsupported features compared to
the Three.js browser backend.

| Feature | Three.js | Babylon.js | Godot |
|---------|----------|------------|-------|
| PBR materials | ✅ | ✅ | ✅ |
| Texture upload from pixel data | ✅ | ✅ | ✅ |
| Instanced meshes | ✅ | ✅ | ✅ |
| GPU particles | ✅ | ✅ | ✅ |
| Directional / point / spot lights | ✅ | ✅ | ✅ |
| Shadows | ✅ | ✅ | ✅ (default on) |
| Fog | ✅ | ✅ | ✅ |
| GLTF model loading | ✅ | ✅ | ✅ |
| VOX model loading | ✅ | ✅ | ✅ |
| WAD loading | ✅ | ✅ | ✅ |
| Voxel chunk meshing | ✅ | ✅ | ✅ (native C++ greedy mesher) |
| 2D overlay (HUD) | ✅ | ✅ | ✅ |
| Gamepad input | ✅ | ✅ | ✅ |
| Mouse look / pointer lock | ✅ | ✅ | ⚠️ partial (no browser pointer-lock API) |
| Audio | ✅ | ✅ | ✅ |
| Post-processing (bloom, SSAO) | ✅ | ✅ | ✅ (via `env.set`) |
| TSL / custom shaders | ✅ Three-only | ❌ | ❌ |
| WebXR / VR / AR | ✅ | ✅ | ❌ (Godot XR is separate and not yet bridged) |
| canvas2D textures (HTMLCanvas) | ✅ | ✅ | ❌ (no DOM; use `texture.createFromImage` instead) |
| Drag-and-drop WAD file loading | ✅ (via drop event) | ✅ | ❌ (use `nova64.wad.load(res://)`) |

---

## Known Divergences from Browser Backends

- **Pointer lock / mouse look** — Godot captures the cursor via
  `Input.mouse_mode = MOUSE_MODE_CAPTURED`. The shim translates this but
  raw mouse delta comes from Godot `InputEventMouseMotion`, not browser
  `movementX/Y`. High-sensitivity mouse carts may need tuning.
- **HTMLCanvas API** — Not available inside QuickJS. Carts that use
  `document.createElement('canvas')` for texture generation must detect
  Godot mode and use `nova64.draw` or `texture.createFromImage` instead.
- **DOM events** — `window.addEventListener`, `document.addEventListener`,
  `fetch`, `XMLHttpRequest`, and similar browser APIs are not available.
  The shim guards the most common drag-and-drop and file-picker paths.
- **WAD sector light / COLORMAP** — Godot WAD rendering uses a flat ambient
  term. COLORMAP-based sector darkening is not yet implemented (tracked in
  ROADMAP.md Phase 3 WAD sub-roadmap).
- **WAD animated flats** — Animated floor/ceiling textures are not yet
  driven by the Godot WAD path.
- **Sprite billboard parity** — Transparent pixel handling and per-frame
  rotation tables for WAD sprites need additional parity work.

---

## Error Response Shape

All failed commands return:

```json
{ "error": "<error_code>", "message": "<human_readable>" }
```

Common error codes:

| Code | Meaning |
|------|---------|
| `unsupported_method` | Method not in the whitelist |
| `missing_<field>` | Required payload field absent |
| `invalid_<kind>_handle` | Handle does not resolve to expected type |
| `file_not_found` | Resource path not accessible |
| `wad_bad_magic` | File is not a valid IWAD/PWAD |
| `wad_lump_oob` | `filepos + size` exceeds WAD buffer |

---

## Source References

| File | Purpose |
|------|---------|
| `nova64-godot/gdextension/src/bridge.cpp` | `call_bridge` dispatch and all `_cmd_*` implementations |
| `nova64-godot/gdextension/src/bridge.h` | `Nova64Host` class declaration, lifecycle method signatures |
| `nova64-godot/gdextension/src/handles.cpp` | `HandleTable` — allocates and type-checks all opaque handles |
| `nova64-godot/godot_project/shim/nova64-compat.js` | JS shim: translates cart API calls into `engine.call` pairs |
| `nova64-godot/godot_project/scripts/nova64_host.gd` | GDScript host wiring — cart load, process loop |
| `nova64-godot/godot_project/scripts/conformance_runner.gd` | Conformance harness that validates the contract surface |
| `tests/test-adapter-conformance.js` | Shared adapter conformance suite |
