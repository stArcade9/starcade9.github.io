# Nova64 Cheatsheet

> One-page reference. For full docs see `NOVA64_API_REFERENCE.md`.

---

## Cart structure

```js
export function init() {
  // runs once — create objects, set up lighting
  nova64.camera.setCameraPosition(0, 5, 10);
  nova64.camera.setCameraTarget(0, 0, 0);
}

export function update(dt) {
  // runs every frame — move things, read input
  if (key('KeyW')) playerZ -= 5 * dt;
}

export function draw() {
  // runs every frame — 3D renders automatically; use this for 2D HUD only
  nova64.draw.print('Score: ' + score, 8, 8, 0xffffff);
}
```

---

## Colors

| Context           | Format                         | Example              |
| ----------------- | ------------------------------ | -------------------- |
| 3D (color arg)    | `0xRRGGBB` hex                 | `0xff0000` red       |
| 2D (print/rect/…) | `0xRRGGBB` or `rgba8(r,g,b,a)` | `rgba8(255,0,0,200)` |

---

## 3D Primitives

```js
nova64.scene.createCube(size, color, [x, y, z], opts); // → mesh handle
nova64.scene.createSphere(radius, color, [x, y, z], opts);
nova64.scene.createPlane(w, h, color, [x, y, z], opts);
nova64.scene.createCylinder(rt, rb, h, color, [x, y, z], opts);
nova64.scene.createCone(radius, h, color, [x, y, z], opts);
nova64.scene.createCapsule(radius, h, color, [x, y, z], opts);
nova64.scene.createTorus(radius, tube, color, [x, y, z], opts);
```

**`opts`** keys: `material` (`'standard'`|`'metallic'`|`'emissive'`|`'holographic'`), `roughness`, `metalness`, `emissive`, `texture`

---

## Transforms

```js
nova64.scene.setPosition(mesh, x, y, z);
nova64.scene.setRotation(mesh, rx, ry, rz); // radians
nova64.scene.setScale(mesh, sx, sy, sz);
nova64.scene.rotateMesh(mesh, rx, ry, rz); // add to current rotation
nova64.scene.removeMesh(mesh); // also: destroyMesh(mesh)
```

---

## Camera

```js
nova64.camera.setCameraPosition(x, y, z);
nova64.camera.setCameraTarget(x, y, z);
nova64.camera.setCameraFOV(degrees); // default 75
```

---

## Lighting & Atmosphere

```js
nova64.light.setAmbientLight(color, intensity); // e.g. 0x334455, 1.0
nova64.light.setLightDirection(x, y, z);
nova64.light.setLightColor(color);
nova64.light.createPointLight(color, intensity, distance, x, y, z); // → light handle
nova64.light.setFog(color, near, far);
nova64.light.clearFog();
```

---

## Skybox

```js
nova64.light.createSpaceSkybox({ starCount, starSize, nebulae, nebulaColor });
nova64.light.createGradientSkybox(topColor, bottomColor); // e.g. 0x87ceeb, 0x228b22
nova64.light.createSolidSkybox(color); // e.g. 0x000000  cave / indoor
nova64.light.animateSkybox(dt); // call in update() or:
nova64.light.enableSkyboxAutoAnimate(speed); // engine calls it for you
nova64.light.setSkyboxSpeed(multiplier); // 0=pause, -1=reverse
nova64.light.clearSkybox();
```

---

## Input

```js
nova64.input.key(code); // held     e.g. key('KeyW'), key('Space'), key('ArrowLeft')
nova64.input.keyp(code); // just-pressed (one frame)
nova64.input.btn(index); // gamepad held  (0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 12=↑…)
nova64.input.btnp(index); // gamepad just-pressed
```

---

## 2D Overlay (HUD)

```js
// Clear / pixels
nova64.draw.cls(color);
nova64.draw.pset(x, y, color);

// Shapes
nova64.draw.rectfill(x, y, w, h, color);
nova64.draw.rect(x, y, w, h, color);
circfill(x, y, r, color);
circ(x, y, r, color);
nova64.draw.line(x0, y0, x1, y1, color);

// Text
nova64.draw.print(text, x, y, color);
nova64.draw.printCentered(text, y, color); // horizontally centred
nova64.ui.setFont('small' | 'normal' | 'large');

// HUD helpers
nova64.draw.drawProgressBar(x, y, w, h, t, fgColor, bgColor, borderColor);
nova64.draw.drawHealthBar(x, y, w, h, current, max, opts);
nova64.draw.drawCrosshair(cx, cy, size, color, style); // style: 'cross'|'dot'|'circle'
nova64.draw.drawPanel(x, y, w, h, opts);

// Colours
nova64.draw.rgba8(r, g, b, a); // returns color value (0–255 each channel)
```

---

## Post-processing

```js
nova64.fx.enableBloom(strength, radius, threshold);
nova64.fx.disableBloom();
nova64.fx.enableFXAA(); // anti-aliasing
nova64.fx.enableVignette(darkness, offset);
nova64.fx.enableChromaticAberration();

// One-call visual presets
nova64.fx.enableN64Mode(); // flat shading, no bloom, crisp FXAA
nova64.fx.enablePSXMode(); // bloom + vignette + chromatic aberration
nova64.fx.enableLowPolyMode(); // flat shading, subtle bloom
nova64.fx.disablePresetMode(); // restore defaults
```

---

## Audio

```js
nova64.audio.sfx(preset)          // 0/1/2 or named: 'jump','coin','explosion','laser',
                     //   'hit','death','select','confirm','error','blip','powerup','land'
nova64.audio.sfx({ wave, freq, dur, vol, sweep })   // custom: wave = 'sine'|'square'|'sawtooth'|'noise'
nova64.audio.setVolume(0..1)      // master volume
```

---

## Video

```js
// Fullscreen video on web / Godot / RetroArch from one call. Drive the ticks!
nova64.video.playFullscreen('/assets/clip.mp4', {
  nativeUrl: 'assets/video/clip.ogv', // Godot (Theora)
  mpgUrl:    'assets/video/clip.mpg', // RetroArch (MPEG1, decoded in-core)
  muted: false, onFinish: () => setScreen('next'),
});
// update(dt): nova64.video._tick(dt)   draw(): nova64.video._draw()
```

Transcode assets: `python3 scripts/transcode-video.py in.mp4 out/ --mp4`.
Full guide → [VIDEO_GUIDE.md](VIDEO_GUIDE.md) · demo → `examples/story-video-demo`.

---

## Physics

```js
nova64.physics.createBody(x, y, w, h, opts); // opts: vx,vy,restitution,friction
nova64.physics.destroyBody(body);
nova64.physics.stepPhysics(dt); // call in update(dt)
nova64.physics.setGravity(px_per_s2); // default 500
nova64.physics.setCollisionMap(fn); // fn(tx,ty) → true if solid
// also: setTileSolidFn(fn)
```

---

## Storage

```js
nova64.data.saveData(key, value); // persists to localStorage (JSON)
nova64.data.loadData(key, fallback); // returns parsed value or fallback
nova64.data.deleteData(key);
// also: saveJSON / loadJSON as aliases
```

---

## 5-Minute Patterns

**Spinning cube**

```js
let cube;
export function init() {
  cube = createCube(1, 0x00aaff, [0, 0, -5]);
}
export function update(dt) {
  nova64.scene.rotateMesh(cube, 0, dt, 0);
}
```

**WASD player**

```js
const p = { x: 0, z: 0 };
export function update(dt) {
  if (key('KeyW')) p.z -= 5 * dt;
  if (key('KeyS')) p.z += 5 * dt;
  if (key('KeyA')) p.x -= 5 * dt;
  if (key('KeyD')) p.x += 5 * dt;
  nova64.scene.setPosition(mesh, p.x, 0, p.z);
  nova64.camera.setCameraPosition(p.x, 4, p.z + 8);
  nova64.camera.setCameraTarget(p.x, 0, p.z);
}
```

**Save high score**

```js
let best = loadData('best', 0);
if (score > best) {
  best = score;
  nova64.data.saveData('best', best);
}
```

**Space skybox with auto-rotate**

```js
export function init() {
  nova64.light.createSpaceSkybox({ starCount: 1500 });
  nova64.light.enableSkyboxAutoAnimate(0.5);
}
```

**Sunset gradient sky**

```js
export function init() {
  nova64.light.createGradientSkybox(0x1a6aa8, 0xf4a460);
}
```
