# Cinematic 3D Cart Guide

A playbook for building rich, cinematic Nova64 carts that mix a rendered **3D
world** with a **2D HUD/overlay** — drawn from the build of
[`examples/the-last-save-file`](../examples/the-last-save-file/code.js), a
multi-scene "recovered save file" campaign cart (boot → loader → glitch → room →
city → invite).

If you read nothing else, read **Rule #0** (the tech) and the **Brand & Persona**
section (the soul). A cart that is technically correct but soulless misses the
point; a cart with the right soul and the wrong tech just renders black.

---

## Brand & Persona — the aesthetic north star

Nova64 is *"a new machine from the timeline where the weird games won."* Our
audience and our taste are not "retro for nostalgia's sake" — they're **makers,
outsiders, and signal-chasers**. Every cinematic sequence should feel like it was
built by, and for, that crowd. Idolize these influences and let them drive colour,
motion, type, and copy:

- **Vaporwave / Outrun / Synthwave** — neon sunsets, wireframe grids receding to a
  banded sun, chrome, palm-and-purple horizons, VHS scanlines, "mall at 2am"
  melancholy. This is the default visual key: hot pink + cyan + magenta on near-
  black, everything **glowing** via bloom.
- **Demoscene** — show off. Real-time effects as flex: RGB-shift, glitch, plasma,
  starfields, dithering, CRT artifacts, impossible-looking tricks done in tiny
  budgets. A scene should make a viewer think *"how did they do that on a cart?"*
- **Design Republic** — confident, graphic, editorial layout discipline. Bold
  type, strong grids, generous negative space, intentional composition. Neon
  chaos, *arranged*.
- **Banksy / graffiti / street art** — subversive, anti-corporate, a wink and a
  middle finger. Stencil energy, spray-can textures, slogans with bite. Copy is
  short, knowing, a little defiant ("Keep the card. Someone else may need it.").
- **Skateboarding culture** — DIY, raw, anti-authority, deck-graphic boldness,
  imperfection-as-style, do-it-because-it-rips.
- **Video-game culture** — cartridges, BIOS boots, memory cards, CRT TVs, pause
  menus, START/SELECT, the secret-passed-between-friends magic of pre-internet
  games. Lean into the fantasy-console fiction.
- **Hacking culture** — terminals, memory dumps, "SIGNAL FOUND", recovered/leaked
  data, phosphor green, the romance of getting *in*. Treat the player like they
  found something they weren't supposed to.

**Persona / voice:** an underground operator who builds beautiful things and
distrusts the mainstream. Earnest about craft, allergic to corporate gloss.
Speaks in short, evocative lines, never marketing-speak. The cart is a found
artifact, not an ad — even when it *is* an ad.

**Palette anchors:** `cyan 0x2ee9ff` · `magenta 0xff4bd8` · `green 0x73ff9f` ·
`amber 0xffcc77` · sunset `0xff6a3d`→`0xff4d72` · near-black grounds. Glow it all.

**Litmus test for any sequence:** would this look right on a skate deck, a rave
flyer, a cracktro, and a Banksy wall at the same time? If yes, ship it.

---

## Rule #0 — A 3D cart MUST clear the 2D layer *transparent*, not opaque

Every cart's `draw()` runs over a 2D framebuffer that is **composited on top of
the rendered 3D scene**. `cls(color)` fills that layer. The catch:

```js
// runtime/api.js — cls() with a plain Number is OPAQUE
cls(0x000000); // → fills the 2D layer solid black, alpha 255
               // → composites over and HIDES the entire 3D scene
```

A 2D-only cart *wants* that (an opaque background colour). A **3D cart does
not** — an opaque clear paints a solid sheet over your beautiful 3D world and
you see nothing but the HUD you draw. The only reason any 3D peeks through is
wherever you happen to draw a *semi-transparent* 2D shape.

**Do this instead** (clears the 2D layer fully transparent so the 3D shows):

```js
export function draw() {
  const d = nova64.draw;
  if (typeof d.cls3D === 'function') d.cls3D(); // explicit transparent clear
  else d.cls(d.rgba8(0, 0, 0, 0));              // fallback: alpha-0 via BigInt color
  // ... draw HUD on top ...
}
```

Why the fallback works: `rgba8()` / `packRGBA64()` return a **BigInt** RGBA64,
and `cls()` honours the alpha of a BigInt. A plain `Number` like `0x000000`
carries no usable alpha, so `cls()` defaults it to opaque. `cls3D()` is the
self-documenting helper (added to `runtime/api.js`); `cls(rgba8(0,0,0,0))` is the
older idiom (see `examples/demoscene`).

> Symptom to recognize: "the 3D is rendering (HUD says triangles/draw calls are
> live) but the screen is black/empty except my 2D text, and only a small patch
> of 3D shows through a translucent box." → You are clearing opaque. Use `cls3D()`.

2D-only scenes inside a 3D cart (boot screens, BIOS, color bars) are fine — just
have them paint their own **opaque** fullscreen rect (e.g.
`rectfill(0,0,W,H, uiColor(0x000000))`, where `uiColor` packs alpha 255). The
transparent `cls3D()` underneath is harmless because they cover it.

---

## Lighting — dark materials need *real* lights, not ambient

Ambient light is multiplicative: `dark_material × dark_ambient ≈ black`. Cranking
`setAmbientLight` intensity barely lifts near-black surfaces (e.g. `0x141827`
walls). A "lit" room built from moody dark materials will read as a **black
void** with ambient alone.

- Add an actual **point light** in the scene for shape and falloff:
  `nova64.light.createPointLight(color, intensity, distance, x, y, z)`. Place it
  where the in-world light source is (a TV, a sign, a pedestal) so the room reads
  as *lit by that thing*. Toggle visibility per scene with `setLightVisible`.
- Keep ambient **low** so the point light creates a dramatic pool of light
  instead of a flat wash.
- Lighten the **material colours** themselves a notch if you want the geometry
  visible at all (ambient can't rescue `0x101010`).
- `enableBloom(...)` makes emissive surfaces glow — lean on it for screens/neon.

### Bloom threshold — the neon gotcha

`enableBloom(strength = 1.0, radius = 0.5, threshold = 0.6)`. The **default
threshold 0.6 only blooms near-white pixels.** Saturated neon sits *below* it
(magenta `0xff4bd8` ≈ 0.56, sunset orange ≈ 0.57 luminance), so a vaporwave scene
of pure-colour emissives renders **flat with no glow** even though bloom is "on" —
the classic *"bloom works on the white TV but is broken on the neon city."*

Set the threshold deliberately per look:

```js
// glowing neon / outrun — strong, wide, LOW threshold so colours bloom
nova64.fx.enableBloom(1.15, 0.85, 0.18);
// only bright sources glow (a TV in a dark room) — default-ish threshold is fine
nova64.fx.enableBloom(0.85); // threshold ~0.6
```

Bloom is per-pipeline: set it on scene-enter and **reset it when leaving** the
scene.

### Glitch — use the real post-process, not a hand-drawn 2D fake

There's a real GPU glitch pass (channel split + block tearing — the same
damage-glitch Space Harrier uses): `nova64.fx.enableGlitch(intensity)` /
`setGlitchIntensity` / `disableGlitch`. For a one-shot juicy burst (hits, scene
stings, signal interference) use the convenience helper — it ramps and auto-decays
itself, no cart-side timer needed:

```js
nova64.fx.glitchBurst(0.7, 0.3); // intensity 0–1, duration seconds
```

Prefer this over drawing your own RGB-shift in 2D — it looks better, is one line,
and is consistent across carts. (Gate frequency/intensity behind reduced-motion;
keep flashes accessible — see Accessibility.)

### Self-illuminating screens (a playing TV, a monitor)

`nova64.video.loadTexture(url).applyToMesh(meshId)` binds a video as the mesh's
**diffuse** map only — under dim light it reads dark. To make a CRT *glow* with
its own picture, promote the video to an **emissive map** (Three-specific escape
hatch, guarded so other backends no-op):

```js
const node = nova64.scene.getMesh(tvScreen);
node?.traverse?.(child => {
  if (!child?.isMesh) return;
  for (const mat of [].concat(child.material)) {
    if (mat && 'emissiveMap' in mat && tv.texture) {
      mat.emissiveMap = tv.texture;
      mat.emissive?.set?.(0xffffff);
      mat.emissiveIntensity = 1.1;
      mat.needsUpdate = true;
    }
  }
});
```

Animate `emissiveIntensity` per frame for a CRT flicker. With bloom on, the
screen becomes the brightest thing in frame and lights the room for free.

> Material cache caveat: `getCachedMaterial` keys on `{color, emissive, ...}`, so
> mutating a material affects every mesh that shares that key. A unique
> `color+emissive` combo (like a white screen with a one-off emissive tint) is
> safe to mutate; common combos are not.

---

## Camera — make motion cinematic

- Drive the camera every frame from `update()`/scene logic with
  `setCameraPosition` + `setCameraTarget` + `setCameraFOV`. (`gpu.setCameraTarget`
  does a `lookAt`, so whatever you target lands at screen center.)
- A slow **dolly-in** (decrease distance + FOV over time) plus a lazy
  `sin`-based **sway/bob** sells "handheld / watching from the carpet."
- Keep a gentle *creep* after the main move so the shot never feels parked.
- `easeInOut` the push; clamp progress to `[0,1]`.

```js
const push = easeInOut(clamp(t / 22, 0, 1));     // main dolly over ~22s
const creep = clamp((t - 22) / 30, 0, 1);        // slow ongoing creep
setCamera(camX + sway*0.06, camY, 6.4 - push*3.1 - creep*0.7,
          targetX, targetY, targetZ, 56 - push*19 - creep*4);
```

---

## 2D overlay discipline — frame the 3D, don't bury it

Once `cls3D()` reveals the 3D, *less is more* on the 2D layer:

- **No full-screen dark gradients/veils.** They mask the 3D you just unhid. Use
  thin **top/bottom vignettes only** (`drawGradient` over the top ~80px and
  bottom ~70px) for contrast behind text.
- Captions: a slim translucent **lower-third band** with a thin accent rule and
  1–2 lines reads as cinematic; a big opaque white slab reads as "boring UI."
- Avoid 2D elements that try to mark a 3D object's screen position — the 2D
  overlay and 3D share the full viewport, so NDC-center == overlay-center, but
  hand-placed 2D "halos" usually land in the wrong spot. Let **bloom** glow the
  3D instead.
- Interactive on-screen targets (buttons, signs): define geometry in **one
  shared constant** and use it for both the renderer and the tap hit-test so they
  never drift:

```js
const CITY_SIGNS = [{ label:'MAKE', color:COLORS.cyan, x:150, y:84, w:134, h:40 }, ...];
// drawCitySigns() and checkCitySigns() both iterate CITY_SIGNS.
```

---

## Scene state machine pattern

This cart uses a single `scene` string + `sceneTime` accumulator:

- `update(dt)` advances `sceneTime`, runs per-scene logic, and calls
  `enterScene(next)` on transitions (which resets `sceneTime`, toggles mesh-group
  visibility via `setMeshVisible`, swaps lighting/fog, and toggles scene lights).
- `draw()` dispatches to a per-scene overlay function.
- Cross-fade with a decaying `transition` value (`rectfill` full-screen black at
  `alpha = transition*255`).
- Group meshes into arrays per scene (`roomMeshes`, `cityMeshes`, ...) and
  `showGroup(group, visible)` on enter.

Auto-advance scenes on `sceneTime` thresholds (and/or taps) for an
attract-mode/ad feel.

---

## Host & input gotchas (learned the hard way)

- **`Enter` = "Restart cart"** in the studio console. Don't use it as an in-cart
  confirm key; it resets the cart. Use `Space` / pointer taps. (`Shift+X` = dev
  console, `F9` = debug.)
- The cart's input reads **trusted** browser events. Synthetic
  `dispatchEvent(new KeyboardEvent(...))` from devtools does **not** reach it —
  use real CDP key/click input (e.g. chrome-devtools `press_key` / `click`).
- Pointer/tap works for `mousePressed()`; design touch-first (multi-touch via
  `nova64.input.touches()`), since this is mobile-first.

---

## Verification workflow

- **Dev server**: this project's `pnpm dev` (vite, port 3000) typically runs in
  **WSL**. WSL2 inotify does **not** see Windows-side file edits on `/mnt/c`, so
  vite won't hot-reload edits made from Windows tools — **restart vite** (or edit
  from inside WSL) to pick changes up. A stale vite serves an old transformed
  module even across page reloads.
  - Start it: `nvm use 20 && node_modules/.bin/vite --host` (run persistent/in
    background; a detached `nohup` inside a one-shot shell gets reaped).
- **Driving the app**: chrome-devtools MCP (CDP) can navigate, `press_key`,
  screenshot, and `evaluate_script`. Useful probes via `window.nova64`:
  `scene.getScene()`, `camera.getCamera()`, `scene.getMesh(id)`, project a mesh's
  world pos to NDC to verify framing.
- **Catching auto-advancing scenes**: poll `camera.getCamera().position`/`fov`
  to detect the current scene, then screenshot **promptly** — a long settle delay
  lets the scene auto-advance past you.
- The GPU HUD's "triangles: 2, calls: 1" is usually just the final composite
  quad (post-processing), **not** evidence the 3D scene is empty.

---

## Recipe: an Outrun / vaporwave scene

The Nova64 house style, assembled (see the `city` scene in the reference cart):

1. **Sunset skybox** — `nova64.light.createGradientSkybox(0x180a2e, 0xff4d72)`
   (purple zenith → hot-pink horizon). Clear it (`clearSkybox`) when leaving the
   scene so it doesn't bleed elsewhere.
2. **Retro sun** at the vanishing point — a big emissive sphere (`0xff6a3d`) on
   the horizon, with a few thin dark cubes *just in front of its lower half* to
   read as the classic scanline gaps.
3. **Neon grid floor** — thin emissive cubes (long in Z for lanes, long in X for
   rungs) in alternating cyan/magenta on a near-black ground. Reserve the center
   lane for a brighter **dashed road line** streaking toward the sun.
4. **Stars** — a few dozen tiny emissive white/blue cubes scattered high in the
   sky behind everything.
5. **Skyline as silhouette** — dark tower bodies flanking the avenue, each with a
   rooftop beacon + a grid of emissive windows (random lit/unlit, neon colours).
6. **Life** — glowing **traffic** (dark car bodies + bright head/taillight cubes)
   streaming both ways, animated each frame; recycle them along the corridor.
7. **Crank bloom with a LOW threshold** (`enableBloom(1.15, 0.85, 0.18)`) so the
   *saturated* neon glows — default threshold leaves it flat (see Bloom gotcha).
   **Reset bloom** (`enableBloom(0.85)`) on the next scene.
8. Keep ambient **low** so towers stay silhouettes and the neon does the talking.
9. Add motion: a **banded retro sun** whose bright lines wave up/down, drifting
   traffic, and occasional **glitch bursts** — but keep flashes accessible
   (see Accessibility).

## Accessibility — make the vibe inclusive

The aesthetic is intense by design (neon, bloom, glitch, strobe, auto-advancing
sequences). That's exactly why accessibility needs deliberate attention — the
house style trends toward the *opposite* of accessible defaults. Build these in:

- **Photosensitivity (most important).** Glitch bursts, RGB-shift, scanline rips,
  heavy bloom and full-screen flashes can trigger seizures. Keep flashes **under
  3 per second**, keep bursts **brief and infrequent**, and never strobe the
  whole screen at high contrast. Provide a **reduced-motion mode** that disables
  glitch/strobe/shake and softens bloom — honour `prefers-reduced-motion`
  (`window.matchMedia('(prefers-reduced-motion: reduce)')`) as the default.
- **Don't rely on colour alone.** The verb signs are colour-coded *and* labelled
  (MAKE/PLAY/REMIX/SHARE) — keep it that way. Any state shown by colour (hover,
  active) also needs shape/label/position cues.
- **Contrast & legibility.** Caption text needs strong contrast against its
  backing (amber/white on a dark translucent band is good); avoid neon text
  directly on neon/bright-sky. Keep body text generously sized; don't put
  critical text over busy bloomed geometry.
- **Timing & no reflex-gating.** Auto-advancing/attract sequences must not
  *require* fast reactions. Let the player **pause** and re-read; don't lock
  progress behind quick taps. Give captions enough dwell time.
- **Input parity (mobile-first).** Support pointer, touch, keyboard *and*
  gamepad. Tap targets ≥ ~44px. Never make `Enter` the only confirm (it's the
  console's Restart). Text entry via a real DOM input (native keyboard/IME).
- **Audio is optional, never sole.** Anything conveyed by sound (a cue, a
  warning) also needs an on-screen equivalent. Default video/audio muted.
- **Respect the OS.** `prefers-reduced-motion`, `prefers-contrast`, and system
  font-scaling should visibly change behaviour where feasible.

> Rule of thumb: ship the full vaporwave assault as the *default experience*, but
> make sure one toggle (reduced motion) turns it into something a photosensitive
> player can still enjoy. Inclusive ≠ watered-down.

**Roadmap:** accessibility is tracked as a phased, measured effort in
[WCAG_ACCESSIBILITY_PLAN.md](./WCAG_ACCESSIBILITY_PLAN.md) (capture → measure →
improve). New carts hit the Phase 0 boxes at minimum.

## New-cart checklist

- [ ] `draw()` uses `cls3D()` (or `cls(rgba8(0,0,0,0))`) — **not** `cls(0x000000)`.
- [ ] 2D-only scenes paint their own opaque fullscreen background.
- [ ] A real point light (not just ambient) lights the key area; materials aren't pure-black.
- [ ] Emissive + bloom for screens/neon; video screens use an emissive map to glow.
- [ ] Bloom threshold set for the look (low ~0.18 for saturated neon, ~0.6 for white-only glow).
- [ ] Camera dolly + sway driven each frame; target lands the hero at center.
- [ ] 2D overlay = thin vignettes + slim caption band, no full-screen veils.
- [ ] Interactive targets share one geometry constant between draw and hit-test.
- [ ] `Space`/pointer for input (never `Enter` as confirm); touch-first; tap targets ≥ 44px.
- [ ] **Accessibility**: reduced-motion toggle (honours `prefers-reduced-motion`); flashes < 3/sec; not colour-only; no reflex-gating; captions for audio.
- [ ] Verified live (restart WSL vite first; drive + screenshot each scene).

---

*Source cart: [`examples/the-last-save-file/code.js`](../examples/the-last-save-file/code.js).
Host helper added: `cls3D()` in `runtime/api.js` (exposed via `runtime/namespace.js` `draw` list).*
