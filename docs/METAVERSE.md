# Nova64 Metaverse — extensible shared-world framework

A shared 3D space where players see each other move in realtime, with chat. Built
on `nova64.net` (Colyseus 0.17, cross-play web ↔ Godot — see
[MULTIPLAYER_AND_AUTH_DESIGN.md](./MULTIPLAYER_AND_AUTH_DESIGN.md)).

This is **groundwork for a platform**, not a one-off cart. Everything that could
plausibly be swapped is behind a seam:

- **Render backend** — how the world/avatars/camera and 2D UI are drawn. Web
  (Three.js) is the reference; **Godot** (native) and a future **XR** build are
  alternate backends that register against the same interface.
- **UI components** — a small, composable, Radix-inspired primitive set
  (Panel/Text/Button/List/Input) rendered through the active backend, with
  pointer hit-testing for **mouse and touch**.
- **Plugins** — chat, presence, etc. are plugins with a shared lifecycle. Chat
  itself has a swappable **transport provider** (default: the colyseus `event`
  relay).

Mobile is a first-class target on every backend ([touch from the start](#5-input--mobile)).

## Current Status

- Source of truth: `examples/metaverse`.
- Tests: `pnpm test:metaverse` runs the headless cart/plugin suite.
- Godot: `scripts/godot.sh sync` copies from `examples/metaverse` when needed
  and no-ops when the local Godot cart folder is already a Windows junction to
  the source tree.
- RetroArch: realtime networking is still out of scope until the libretro
  netpacket research spike.

---

## 1. Module layout

```
examples/metaverse/
  code.js                 # the cart — wires a backend + plugins + world, runs the loop
  core/
    registry.js           # backend / plugin / chat-provider registries
    app.js                # MetaverseApp: net + world state + loop + plugin dispatch
    ui.js                 # UI component primitives + layout + pointer hit-test
    render-web.js         # WebRenderBackend (nova64.scene/camera + nova64.draw)
  plugins/
    controls.js           # keyboard + mobile touch (joystick / drag-look) -> intents
    chat.js               # chat plugin (UI panel + commands) over a chat provider
    presence.js           # floating name tags (world->screen) + join/left toasts
    minimap.js            # top-down radar of all avatars (you + others)
    voice.js              # proximity-free WebRTC voice chat (push-to-talk, web)
    auth.js               # Google/wallet sign-in controls over nova64.auth
```

Each piece has a headless `*.test.mjs` beside it (mock `nova64`, no browser);
`pnpm test:metaverse` runs them all via `run-tests.mjs` and prints a summary.

The framework is plain ES modules the cart imports with relative paths (vite
serves them on web). A Godot/XR port either bundles these into the host shim or
re-implements the backend behind the same interface — the cart and plugins don't
change.

## 2. Render backend interface

A backend turns abstract world/UI intent into backend-specific draw calls. The
metaverse never touches `nova64.scene`/`nova64.draw` directly — only the backend.

```js
// All ids are opaque handles owned by the backend.
const RenderBackend = {
  id: 'web' | 'godot' | 'xr',
  init(world)            // build floor/props/lighting; return when ready
  // Avatars (remote + local third-person)
  addAvatar(id, { color, name })
  updateAvatar(id, { x, y, z, ry })
  setAvatarStyle(id, { color })   // recolor in place (appearance customization)
  setAvatarVisible(id, visible)   // e.g. hide own body in first-person
  removeAvatar(id)
  // Camera
  setCamera({ x, y, z, yaw, pitch, mode })   // mode: 'first' | 'third'
  // 2D UI — the UI component tree rasterizes through these:
  drawRect(x, y, w, h, color)
  drawText(text, x, y, color)
  drawCircle(x, y, r, color, filled)
  measureText(text) -> width
  viewport() -> { w, h }                      // design units (web: 640x360)
  // Project a 3D world point to 2D design space (name tags, world markers):
  worldToScreen(x, y, z) -> { x, y, visible, dist }
};
```

`worldToScreen` is backend-owned because only the backend knows its camera/
projection: the web backend computes it from the camera it set (pure math, so it
also works when a Godot host drives this same backend); a native Godot backend
would use `Camera3D.unproject_position`; XR returns a per-eye projection. Plugins
that pin UI to the world (e.g. presence name tags) call it and skip drawing when
`visible` is false. The web backend assumes a **75° vertical FOV at 16:9** — it
pins `setCameraFOV(75)` in `init`, and Godot honors that as a vertical FOV
(`keep_aspect = KEEP_HEIGHT`), so tags align on both. A non-16:9 Godot window
introduces minor horizontal drift only (vertical is always exact); a native
GodotRenderBackend would use `unproject_position` to be pixel-perfect.

Registering a backend: `metaverse.registerBackend(backend)`. The cart picks one
(`backend: 'web'`); unknown → falls back to web. **XR** is just another backend
whose `setCamera` drives a stereo rig and whose UI draws to a world-space quad.

Host backends can now be injected without editing the cart. At startup the cart
registers the web backend as a fallback, then looks for a host-provided backend
in this order:

- `globalThis.__NOVA64_METAVERSE_BACKEND`
- `nova64.metaverse.backend`
- `nova64.metaverseBackend`

Each value may be a backend object, a factory returning one, or a string id for a
backend already registered by the host. If only an id is needed, hosts may set
`globalThis.__NOVA64_METAVERSE_BACKEND_ID`, `nova64.metaverse.backendId`, or
`nova64.metaverseBackendId`.

## 3. UI component system (Radix-inspired)

Small composable primitives, not a monolith. A component is a plain function
returning a node `{ type, props, children }`; a layout pass assigns rects; the
backend rasterizes; pointer events hit-test against rects.

```js
import { Panel, Row, Col, Text, Button, List, TextField } from './core/ui.js';

Panel({ x: 8, y: 8, pad: 6, bg: 0x000000aa }, [
  Text({ value: 'NOVA64 METAVERSE' }),
  Button({ id: 'cam', label: 'Camera', onTap: () => app.toggleCamera() }),
]);
```

- **Primitives:** `Panel, Row, Col, Text, Button, List, TextField, Spacer`.
- **Interaction:** the UI runtime is fed the pointer set each frame (mouse +
  `nova64.input.touches()`), so buttons work identically on desktop and mobile.
- **Theming:** a `theme` object (colors, spacing, font) passed at mount — the
  Radix-ish "tokens" seam. Backends may override how tokens rasterize.

This layer is intentionally backend-agnostic: it emits draw ops via the backend
interface, so the same HUD/chat UI renders on web, Godot, and (as a world-space
panel) XR.

## 4. Plugins

```js
const Plugin = {
  id: 'chat',
  init(ctx)              // ctx: { app, net, ui, backend, theme, registerCommand }
  update(dt, ctx)        // per-frame
  onNetMessage(evt, ctx) // inbound relayed events ({ from, type, msg })
  onPeerJoin(id, info, ctx)  // a remote avatar spawned ({ name })
  onPeerLeave(id, info, ctx) // a remote avatar despawned ({ name })
  renderUI(ui, ctx)      // contribute UI nodes
};
metaverse.use(chatPlugin); metaverse.use(controlsPlugin); metaverse.use(presencePlugin);
```

The app drives every plugin's lifecycle and merges their `renderUI` output.
Plugins are isolated — the `minimap` plugin (a top-down radar of all avatars) is
exactly this: one module, `use()`-d in, touching only the context + backend.
Adding an inventory or world objects later is the same shape; nothing else
changes.

### Chat plugin + transport providers
Chat is a plugin whose transport is itself swappable:

```js
const ChatProvider = {
  send(text)                    // push a message
  onMessage(cb)                 // cb({ from, name, text, ts })
};
```
Default provider = the colyseus relay (`room.send('chat', {text})` →
server broadcasts `event` → `onNetMessage`). A different backend (matrix,
websocket, p2p) implements the same two methods. Commands register through
`ctx.registerCommand(name, handler)`: `/me <action>`, `/help`, and `/nick <name>`
(a live rename — sends `setName` to the room; the server updates `player.name` and
state-sync propagates it to everyone's tags + roster).

### Voice plugin
`voice` is WebRTC voice chat as a plugin: a peer-to-peer mesh where each
participant opens an `RTCPeerConnection` to every other and exchanges mic audio.
Signaling (SDP offer/answer + ICE) rides the **existing relay** — `sendRelay('voice', …)`
out, `onNetMessage('voice')` in — so no extra server endpoint is needed (the
StateRoom exempts `voice` from the chat rate-limit since ICE bursts during setup).
Pairs are glare-free (smaller `sessionId` offers, the other answers), and the mic
is gated by **push-to-talk** (hold `V`) or an unmute toggle — default muted, no hot
mic. It's browser-only (`RTCPeerConnection`/`getUserMedia`); on Godot/QuickJS it
shows `MIC n/a` and no-ops. Deps are injectable, so the signaling state machine is
tested headlessly (`voice.test.mjs`) without a real browser.

### Presence plugin
The `presence` plugin makes "who's here" visible in the world, using only the
context + backend (no nova64/net access, so it runs on any backend):
- **Name tags** float above every avatar — projected each frame via
  `backend.worldToScreen`; your own tag shows only in third-person. Backends
  without `worldToScreen` simply skip tags.
- **Join/left toasts** fade in near the top, driven by the `onPeerJoin`/
  `onPeerLeave` hooks the app fires from avatar spawn/despawn.

## 5. Input & mobile

- **Desktop:** WASD/arrows move, mouse (pointer-lock) or Q/E turn, C toggles cam.
- **Mobile:** the `controls` plugin draws a left **virtual joystick** (move) and a
  right **drag-look** zone, plus tappable Camera/Chat buttons — all via
  `nova64.input.touches()` (multi-touch, 640×360 design space) so you can move and
  look at once. Text entry uses the DOM `<input>` (native keyboard) via
  `nova64.startTextInput({ onSubmit, onCancel })`.
- **Godot mobile:** the same controls plugin runs unchanged. The GDScript host
  captures `InputEventScreenTouch`/`Drag`, maps them to the 640×360 logical space,
  and pushes them to the native host each frame (`set_touches` → `input.poll`), so
  `nova64.input.touches()` behaves identically to web. (On desktop Godot, enable
  `input_devices/pointing/emulate_touch_from_mouse` to test with a mouse.)

## 6. Server state

`StateRoom` Player carries 3D pose: `x, y, z, ry` (+ `name`, `data`). Movement
intent is `pos3 { x, y, z, ry }`. Chat rides the generic relay (no schema
change). **Avatar appearance** lives in the `data` blob: the cart sends
`set { data: '{"color":<0xAARRGGBB>,"provider":"<id>"}' }`; peers parse it on
spawn/change and the backend recolors the avatar in place (`setAvatarStyle`). The
color persists in `localStorage` and is re-broadcast on connect, so it survives
reloads and reaches players who join later.

**Identity (`nova64.auth`):** on connect the app calls `restore()` and adopts any
real signed-in identity (Supabase/OAuth, or a stored session), else signs in as a
guest. The identity's `displayName` becomes the room name (shown on tags + the
roster) and `provider` rides the `data` blob as a roster badge; a logged-in user
gets a stable avatar color seeded from their identity id (unless they've picked
one). `onChange` re-adopts a mid-session sign-in and re-broadcasts. The net facade
attaches `nova64.auth.token()` on join so the server can verify real identities.
A `/nick` chosen by the user persists in `localStorage` and wins over both the
random visitor name and the identity name on the next load (same "explicit choice
beats default" rule as the avatar color).

The `auth` plugin renders a compact identity panel with Google, wallet, and
sign-out controls. Google uses the Supabase client configured by the web runtime
from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; wallet uses the
server's SIWE endpoints and returns in-place.

## 7. Phased roadmap

- **P1 — shared 3D world** ✅ avatars move + sync; first/third-person. (`8c8d6ef`)
- **P2 — framework + mobile + chat** ✅ render-backend + UI components + plugin
  system; controls plugin (mobile joystick/look); chat plugin (typed, native
  keyboard); interpolated remote avatars; HUD roster.
- **P3 — presence & polish** ✅ name tags (world→screen), join/leave toasts,
  avatar color customization via `data`, and `nova64.auth` identity wiring
  (display name + provider badge + stable per-identity color; guest fallback),
  plus user-facing Google/wallet sign-in controls.
  Deferred: rendering a profile **avatar image** on the cube — remote avatar URLs
  are cross-origin (CORS-tainted in WebGL), absent for guests, and host-specific,
  so it's a later texture-pipeline task, not a quick win.
- **P4 — Godot parity** (in progress): **touch parity** ✅ and host backend
  selection ✅ — the cart cross-plays unchanged, mobile joystick/drag-look work
  on Godot via the native touch bridge (`nova64.input.touches()`), and a host can
  inject a first-class backend without editing `code.js`. Remaining: an optional
  native `GodotRenderBackend` (today the cart drives `render-web.js` over the
  Godot shim, which already maps to native scene/camera/draw).
- **P5 — XR backend:** stereo camera rig + world-space UI panels; controller/hand
  ray as the pointer feeding the same UI hit-test.
