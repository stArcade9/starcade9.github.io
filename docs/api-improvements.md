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

### 13. Reusable hero-cart loader as a public API ✅ LANDED (`nova64.loader`)

**Where it exists today:** the home screen at `http://localhost:3000/` shows a hero cart loader (boot animation + asset progress) that's currently hand-wired in the homepage shell.
**Why it matters:** every cart that loads GLBs, textures, or audio has to either ship its own loader UI or pop into gameplay with a half-loaded scene (see `examples/indie-odyssey` combat enemy GLBs racing the autoplay timer). A first-class loader is a portable solution.
**Proposed shape:**

```js
nova64.loader.show({ title: 'INDIE ODYSSEY', subtitle: 'Loading shardgrid…' });
nova64.loader.track(['models/dataImp.glb', 'images/spritesheet/dataImp.png']);
nova64.loader.onReady(() => startGame());
nova64.loader.hide();
```

Engine handles the visual + progress wiring; cart just tells it what to wait on.
**Effort:** Medium — needs progress hooks into `scene.loadModel` / `loadTexture` / image preload paths, plus a default themable overlay.

### 14. Story-mode helper with slides ✅ LANDED (`nova64.story`)

**Where it exists today:** `examples/indie-odyssey/code.js` has a multi-slide intro with image + text + transitions (`drawStory`, `drawStoryFrameImage`, `drawStoryTransitionFrame`, `storyFrameCanvas`, `storyPixelCanvas`). It's ~300 lines of cart-local code.
**Why it matters:** every narrative game wants intro / cutscene / chapter-break slides with pixel transitions. Re-implementing this each time is wasteful and discourages story sequences.
**Proposed shape:**

```js
nova64.story.play([
  { image: 'assets/intro_01.png', text: 'The shardgrid awakens…' },
  { image: 'assets/intro_02.png', text: 'A new operator boots up.' },
  { image: 'assets/intro_03.png', text: 'Welcome to the network.' },
], {
  onAdvance: () => beep(),
  onFinish: () => setScreen('game'),
  transition: 'pixel-melt', // or 'fade', 'crt-cut', etc.
});
```

Engine owns the slide canvas, transition timing, "Press Enter to continue" prompt, image preload, and pixel-grid effect — same patterns indie-odyssey already has, but shared.
**Effort:** Medium — port indie-odyssey's helpers up into `runtime/api-story.js` (new file) and expose as `nova64.story`.

### 15. MP4 / video playback support ✅ LANDED (`nova64.video`)

> **Now cross-backend.** Web, Godot, and RetroArch all play real video from one
> `nova64.video.playFullscreen` call (RetroArch decodes MPEG1 in-core via
> `pl_mpeg`, with MP2 audio mixing). See [VIDEO_GUIDE.md](VIDEO_GUIDE.md) and
> [`examples/story-video-demo`](../examples/story-video-demo/code.js). Item #17
> below (RetroArch/Godot hosts) is now landed, not a stub.


**Why it matters:** cutscenes, animated logos, in-world TV screens, FMV-style sequences. There's currently no engine-supported path — carts would have to manually create a `<video>` element, manage z-index against the WebGL canvas, and worry about the same `canvas { background: #000 }` CSS trap that bit indie-odyssey combat overlays.
**Proposed shape:**

```js
// Full-screen video (cutscene / intro)
nova64.video.play('assets/intro.mp4', { onFinish: () => setScreen('game') });

// In-world video texture (TV screen, billboard, monitor mesh)
const tex = nova64.video.loadTexture('assets/news_loop.mp4', { loop: true });
nova64.scene.setMeshTexture(tvMeshId, tex);
```

Both paths use the same underlying `HTMLVideoElement` — the engine wires it into the framebuffer overlay or as a `THREE.VideoTexture` depending on call site. Background must be set to `transparent` (see lesson from indie-odyssey skybox session).
**Effort:** Medium-High — `THREE.VideoTexture` for in-world is straightforward; full-screen cutscene needs to slot into the cart framebuffer overlay z-stack and handle autoplay-policy unlocks (audio requires user gesture in some browsers).

**Landed status:** `runtime/api-video.js` ships `loadTexture(url, opts)` and
`playFullscreen(url, opts)`. The texture handle exposes
`applyToMesh(meshId)` which wires `THREE.VideoTexture` into the mesh's
`material.map` on Three.js, and `BABYLON.VideoTexture` into
`material.diffuseTexture` / `albedoTexture` on Babylon.js. RetroArch and
Godot hosts fall through to a graceful no-op stub (see item #17 below for
the follow-up).

### 16. Grid-driven level/dungeon builder ✅ LANDED (`nova64.level`)

**Why it matters:** every dungeon-crawler, top-down RPG, or grid puzzle
cart re-implements the same pattern — a 2D grid + a tile spec map + a
list of "special" locations that gets a placeholder mesh, an optional
GLB model, and an optional point light. Indie Odyssey's `buildLevel`
was ~150 lines of this; future carts shouldn't have to write it again.

**Landed shape:**

```js
const level = nova64.level.fromGrid({
  grid: [[1,1,1,1,1], [1,0,0,0,1], [1,0,0,0,1], [1,0,0,0,1], [1,1,1,1,1]],
  tileSize: 1,
  origin: [0, 0, 0],
  tiles: {
    1: { type: 'wall', color: 0x10051c, height: 2, emissive: 0x00aaff, emissiveIntensity: 0.3 },
    0: { type: 'open', floorColor: 0x07010d, ceilingColor: 0x1f4f9a },
  },
  specials: [
    { x: 2, z: 2, type: 'portal', color: 0xff00cc, model: 'portal.glb',
      light: { color: 0xff00cc, intensity: 1.2 } },
  ],
});

level.isWall(x, z);     // grid lookup
level.cellToWorld(x, z); // → { x, y, z }
level.specialAt(x, z);  // → spec or null
level.destroy();         // cleanup all meshes + lights at once
```

Tile types beyond `wall`/`open` can supply a `spawn(p, x, z, tile)`
function for custom geometry. The returned handle owns the mesh ids so
cart cleanup is a one-liner.

### 17. Video on RetroArch + Godot hosts (follow-up to #15) ✅ LANDED

Both native hosts now play **real fullscreen video**, not a stub — full guide in
[VIDEO_GUIDE.md](VIDEO_GUIDE.md), demo in
[`examples/story-video-demo`](../examples/story-video-demo/code.js).

- **RetroArch**: the libretro core decodes MPEG1 (`.mpg`) in-core via the
  vendored single-header [`retroarch/pl_mpeg.h`](../retroarch/pl_mpeg.h)
  (`__novaVideoOpen/Advance/Blit/Close`). Decoded frames blit into the 2D
  framebuffer — shown directly in software mode, composited over 3D in GLES.
  MP2 audio is mixed into the core's audio output (gated on `plm_probe`).
- **Godot**: the gdextension bridge drives a native `VideoStreamPlayer`
  (`video.playFullscreen/stop/poll`), playing Theora `.ogv`.

`nova64.video.loadTexture` (in-world "TV" texture) now works on **all three
backends** — web (`VideoTexture`), RetroArch (MPEG1 → GLES texture, re-uploaded
each frame), and Godot (offscreen `VideoStreamPlayer` → `get_video_texture()`
bound to the mesh material). Bind it with `applyToMesh(meshId)`. Demo:
[`examples/tv-demo`](../examples/tv-demo/code.js). Generate per-backend assets
with [`scripts/transcode-video.py`](../scripts/transcode-video.py).

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
| 13  | Hero-cart loader API (`nova64.loader`)  | ✅ Landed   | —      |
| 14  | Story-mode helper (`nova64.story`)      | ✅ Landed   | —      |
| 15  | MP4 / video playback (`nova64.video`)   | ✅ Landed   | —      |
| 16  | Grid-driven level (`nova64.level`)      | ✅ Landed   | —      |
| 17  | Video on RetroArch + Godot hosts        | ✅ Landed   | —      |
| 9   | Improve `printCentered` discoverability | 🟢 QoL     | Low    |
| 10  | Document `createPointLight` signature   | 🟢 QoL     | Low    |
| 11  | `print()` size shorthand                | 🟢 QoL     | Low    |
| 12  | `drawCrosshair()` helper                | 🟢 QoL     | Low    |
