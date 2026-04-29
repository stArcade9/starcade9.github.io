# Nova64 Cheatsheet

> One-page reference. For full docs see `NOVA64_API_REFERENCE.md`.

---

## Cart structure

```js
export function init() {
  // runs once — create objects, set up lighting
  setCameraPosition(0, 5, 10);
  setCameraTarget(0, 0, 0);
}

export function update(dt) {
  // runs every frame — move things, read input
  if (key('KeyW')) playerZ -= 5 * dt;
}

export function draw() {
  // runs every frame — 3D renders automatically; use this for 2D HUD only
  print('Score: ' + score, 8, 8, 0xffffff);
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
createCube(size, color, [x, y, z], opts); // → mesh handle
createSphere(radius, color, [x, y, z], opts);
createPlane(w, h, color, [x, y, z], opts);
createCylinder(rt, rb, h, color, [x, y, z], opts);
createCone(radius, h, color, [x, y, z], opts);
createCapsule(radius, h, color, [x, y, z], opts);
createTorus(radius, tube, color, [x, y, z], opts);
```

**`opts`** keys: `material` (`'standard'`|`'metallic'`|`'emissive'`|`'holographic'`), `roughness`, `metalness`, `emissive`, `texture`

---

## Transforms

```js
setPosition(mesh, x, y, z);
setRotation(mesh, rx, ry, rz); // radians
setScale(mesh, sx, sy, sz);
rotateMesh(mesh, rx, ry, rz); // add to current rotation
removeMesh(mesh); // also: destroyMesh(mesh)
```

---

## Camera

```js
setCameraPosition(x, y, z);
setCameraTarget(x, y, z);
setCameraFOV(degrees); // default 75
```

---

## Lighting & Atmosphere

```js
setAmbientLight(color, intensity); // e.g. 0x334455, 1.0
setLightDirection(x, y, z);
setLightColor(color);
createPointLight(color, intensity, distance, x, y, z); // → light handle
setFog(color, near, far);
clearFog();
```

---

## Skybox

```js
createSpaceSkybox({ starCount, starSize, nebulae, nebulaColor });
createGradientSkybox(topColor, bottomColor); // e.g. 0x87ceeb, 0x228b22
createSolidSkybox(color); // e.g. 0x000000  cave / indoor
animateSkybox(dt); // call in update() or:
enableSkyboxAutoAnimate(speed); // engine calls it for you
setSkyboxSpeed(multiplier); // 0=pause, -1=reverse
clearSkybox();
```

---

## Input

```js
key(code); // held     e.g. key('KeyW'), key('Space'), key('ArrowLeft')
keyp(code); // just-pressed (one frame)
btn(index); // gamepad held  (0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 12=↑…)
btnp(index); // gamepad just-pressed
```

---

## 2D Overlay (HUD)

```js
// Clear / pixels
cls(color);
pset(x, y, color);

// Shapes
rectfill(x, y, w, h, color);
rect(x, y, w, h, color);
circfill(x, y, r, color);
circ(x, y, r, color);
line(x0, y0, x1, y1, color);

// Text
print(text, x, y, color);
printCentered(text, y, color); // horizontally centred
setFont('small' | 'normal' | 'large');

// HUD helpers
drawProgressBar(x, y, w, h, t, fgColor, bgColor, borderColor);
drawHealthBar(x, y, w, h, current, max, opts);
drawCrosshair(cx, cy, size, color, style); // style: 'cross'|'dot'|'circle'
drawPanel(x, y, w, h, opts);

// Colours
rgba8(r, g, b, a); // returns color value (0–255 each channel)
```

---

## Post-processing

```js
enableBloom(strength, radius, threshold);
disableBloom();
enableFXAA(); // anti-aliasing
enableVignette(darkness, offset);
enableChromaticAberration();

// One-call visual presets
enableN64Mode(); // flat shading, no bloom, crisp FXAA
enablePSXMode(); // bloom + vignette + chromatic aberration
enableLowPolyMode(); // flat shading, subtle bloom
disablePresetMode(); // restore defaults
```

---

## Audio

```js
sfx(preset)          // 0/1/2 or named: 'jump','coin','explosion','laser',
                     //   'hit','death','select','confirm','error','blip','powerup','land'
sfx({ wave, freq, dur, vol, sweep })   // custom: wave = 'sine'|'square'|'sawtooth'|'noise'
setVolume(0..1)      // master volume
```

---

## Physics

```js
createBody(x, y, w, h, opts); // opts: vx,vy,restitution,friction
destroyBody(body);
stepPhysics(dt); // call in update(dt)
setGravity(px_per_s2); // default 500
setCollisionMap(fn); // fn(tx,ty) → true if solid
// also: setTileSolidFn(fn)
```

---

## Storage

```js
saveData(key, value); // persists to localStorage (JSON)
loadData(key, fallback); // returns parsed value or fallback
deleteData(key);
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
  rotateMesh(cube, 0, dt, 0);
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
  setPosition(mesh, p.x, 0, p.z);
  setCameraPosition(p.x, 4, p.z + 8);
  setCameraTarget(p.x, 0, p.z);
}
```

**Save high score**

```js
let best = loadData('best', 0);
if (score > best) {
  best = score;
  saveData('best', best);
}
```

**Space skybox with auto-rotate**

```js
export function init() {
  createSpaceSkybox({ starCount: 1500 });
  enableSkyboxAutoAnimate(0.5);
}
```

**Sunset gradient sky**

```js
export function init() {
  createGradientSkybox(0x1a6aa8, 0xf4a460);
}
```
