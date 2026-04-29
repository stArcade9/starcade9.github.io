# Nova64 API Improvement Roadmap

A prioritized list of bugs, gaps, and enhancements to make the Nova64 API easier for cart authors to use.

---

## 🔴 Bugs — Broken Right Now

### 1. `createCylinder()` produces a box

**File:** `runtime/api-3d.js`
`createCylinder()` calls `gpu.createCylinderGeometry()` which does not exist on `GpuThreeJS`. It silently falls back to `createBoxGeometry`, so every cylinder is a box.
**Fix:** Add `createCylinderGeometry(rt, rb, h, segs)` to `gpu-threejs.js` using `THREE.CylinderGeometry`.

### 2. Game-studio code uses wrong skybox API names

**File:** `src/main.js` lines 318–319
The `EXECUTE_CODE` message handler passes `skyApi.createSkybox`, `skyApi.updateSkybox`, and `skyApi.removeSkybox` — none of which exist. The actual names are `createSpaceSkybox`, `animateSkybox`, and `clearSkybox`. Skybox is silently broken in the game-studio execution path.
**Fix:** Update those three references to the correct names.

### 3. `galaxySpiral` option is accepted but does nothing

**File:** `runtime/api-skybox.js`
`createSpaceSkybox({ galaxySpiral: true })` destructures the option but never uses it in the geometry.
**Fix:** Either implement a spiral star-field variant or remove the option entirely to avoid confusion.

---

## 🟡 Missing Features — Hard to Use Without

### 4. Skybox rotation speed is hardcoded

**File:** `runtime/api-skybox.js`
`animateSkybox(dt)` always rotates at `dt * 0.01`. There is no way for a cart to slow it down, speed it up, pause it, or reverse it.
**Add:**

```js
setSkyboxSpeed(multiplier); // e.g. 0 = frozen, 2.0 = double speed, -1 = reverse
```

### 5. Cart authors must manually call `animateSkybox(dt)` every frame

**File:** `runtime/api-skybox.js`
Forgetting to call it in `update()` is the most common skybox mistake. The engine already has a frame loop — skybox animation should be opt-in automatic.
**Add:**

```js
enableSkyboxAutoAnimate((speed = 1.0)); // engine calls animateSkybox internally
disableSkyboxAutoAnimate();
```

### 6. Only one skybox type (procedural space)

**File:** `runtime/api-skybox.js`
There is no way to create a daytime sky, sunset, cave, or interior environment. Only the star-field + nebula preset exists.
**Add:**

```js
createGradientSkybox(topColor, bottomColor, horizonColor?)
// e.g. createGradientSkybox(0x1a6aa8, 0xf4a460)  → sunset

createSolidSkybox(color)
// e.g. createSolidSkybox(0x000000)  → cave / indoor

createImageSkybox([px, nx, py, ny, pz, nz])
// cube-face textures for full photorealistic environments
```

### 7. `removeMesh` vs `destroyMesh` mismatch

**Files:** `runtime/api-3d.js`, `CLAUDE.md`, demos
`CLAUDE.md` and several demos reference `removeMesh()` but the exposed function is `destroyMesh()`. This causes silent no-ops when cart authors follow the documentation.
**Fix:** Add `removeMesh` as an alias for `destroyMesh`, or rename throughout and update docs.

### 8. Missing 3D primitives

Useful shapes absent from the API:

- `createCone(radius, height, color, position, opts)` — projectiles, trees, hat shapes
- `createCapsule(radius, height, color, position, opts)` — humanoid character bodies

---

## 🟢 Quality-of-Life Improvements

### 9. `printCentered` is not discoverable

**File:** `runtime/api-2d.js`
`printCentered(text, y, color)` exists and works well, but many demos re-implement text centering manually because `print()` dominates examples. The function should be demonstrated in at least one prominent demo.

### 10. `createPointLight` signature unclear

**File:** `runtime/api-3d.js`
`createPointLight` exists but its signature (does it take intensity? color? range?) is not documented and not obvious from usage in demos. Add clear JSDoc and a usage example.

### 11. `print()` has no size parameter — requires `setFont()` call first

Cart authors wanting larger HUD text must call `setFont('large')` before `print()` and reset it after. A convenience overload `print(text, x, y, color, size?)` would reduce boilerplate.

### 12. No built-in crosshair / reticle helper

Several FPS and space-shooter demos manually draw a crosshair using `line()` or `rect()`. A simple `drawCrosshair(x, y, size, color, style?)` in `api-2d.js` would reduce copy-paste code.

---

## Summary Priority Order

| #   | Issue                                   | Priority   | Effort |
| --- | --------------------------------------- | ---------- | ------ |
| 1   | `createCylinder()` broken               | 🔴 Bug     | Low    |
| 2   | Game-studio skybox API names wrong      | 🔴 Bug     | Low    |
| 3   | `galaxySpiral` no-op                    | 🔴 Bug     | Low    |
| 4   | Skybox speed control                    | 🟡 Missing | Low    |
| 5   | Auto-animate skybox                     | 🟡 Missing | Medium |
| 6   | More skybox types                       | 🟡 Missing | High   |
| 7   | `removeMesh` alias                      | 🟡 Missing | Low    |
| 8   | Cone + Capsule primitives               | 🟡 Missing | Medium |
| 9   | Improve `printCentered` discoverability | 🟢 QoL     | Low    |
| 10  | Document `createPointLight` signature   | 🟢 QoL     | Low    |
| 11  | `print()` size shorthand                | 🟢 QoL     | Low    |
| 12  | `drawCrosshair()` helper                | 🟢 QoL     | Low    |
