# Touch Controls

NOVA64 shows an on-screen gamepad on phones and tablets. It appears automatically
on touch devices, needs no changes to a cart, and is driven by a single global
configuration flag.

Implementation: [`runtime/touch-controls.js`](../runtime/touch-controls.js).
Tests: [`tests/playwright/touch-controls.spec.js`](../tests/playwright/touch-controls.spec.js)
(`pnpm test:touch`).

---

## The configuration option

|                     |                                                      |
| ------------------- | ---------------------------------------------------- |
| **Name**            | `NOVA64_TOUCH_CONTROLS`                              |
| **Location**        | A global, read off `globalThis` (i.e. `window`)      |
| **Default**         | `'auto'` — on for touch devices, off everywhere else |
| **Accepted values** | `'auto'`, `true`, `false`                            |

| Value    | Behaviour                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `'auto'` | Show on devices with a coarse pointer **and** touch support. This is the default, and applies when the flag is left undefined. |
| `true`   | Always show, on every device — useful for testing the overlay on a desktop.                                                    |
| `false`  | Never create the controls at all.                                                                                              |

### Enabling

Set the flag **before** the runtime boots, in an inline script above the module
script that loads NOVA64:

```html
<script>
  // Force the on-screen gamepad on, even on desktop.
  window.NOVA64_TOUCH_CONTROLS = true;
</script>
<script type="module" src="./assets/main.js"></script>
```

Or turn it on later, at runtime:

```js
nova64.touch.setTouchControlsEnabled(true);
```

### Disabling

```html
<script>
  // Opt out everywhere — nothing is mounted, on any device.
  window.NOVA64_TOUCH_CONTROLS = false;
</script>
<script type="module" src="./assets/main.js"></script>
```

```js
// ...or at runtime. This removes the overlay and releases any held keys.
nova64.touch.setTouchControlsEnabled(false);
```

Leaving the flag unset is the same as `'auto'`, so most applications need no
configuration at all.

---

## How automatic device detection works

With `'auto'`, the overlay mounts when **both** of these are true:

```js
window.matchMedia('(pointer: coarse)').matches; // primary pointer is a finger
navigator.maxTouchPoints > 0; // the device reports touch points
```

Requiring both is what separates the cases that matter:

- **Phones and tablets** — coarse pointer, touch points. Controls appear.
- **iPadOS** — reports a desktop user-agent, but still answers both checks, so it
  is correctly treated as a tablet.
- **A desktop with a touchscreen** — the _primary_ pointer is a mouse, so the
  pointer is `fine`. A mouse user never gets a gamepad pasted over their game,
  even though the hardware can accept touch.

Detection runs once at boot. To check it yourself:

```js
nova64.touch.isTouchDevice(); // raw device capability
nova64.touch.shouldEnableTouchControls(); // capability combined with the flag
```

---

## The visibility toggle

A pill button labelled **HIDE ✦** / **SHOW ✦** sits at the top-right, inside the
safe area.

- Tapping it hides the d-pad and action buttons. **The toggle itself stays on
  screen**, relabelled **SHOW ✦**, so the controls are always recoverable.
- Hiding **releases every key the overlay is currently holding**. A direction
  held when the pad disappeared would otherwise stay down forever.
- The choice is saved to `localStorage` under `nova64.touchControls.visible`, so
  it survives a reload. Blocked storage (private mode) falls back to visible.
- It reports state to assistive tech via `aria-pressed`.

Programmatic equivalents:

```js
const tc = nova64.touch.getTouchControls(); // null when not mounted
tc.show();
tc.hide();
tc.toggle(); // returns the new visibility
tc.isVisible();
tc.destroy(); // remove entirely
```

---

## Keyboard mappings

Every control calls `input.setKeyState(code, down)` — **the same function the
real keyboard listeners call**. A touch press is therefore indistinguishable
from a key press to cart code: `key()` reports it held, `keyp()` sees the edge,
and several controls can be held at once because key state is a map, not a
single value. Carts need no touch-specific code.

### Directional pad

Each direction sends **both** the arrow key and its WASD equivalent, because
carts read whichever they prefer — `wad-demo` tests `key('KeyW') || key('ArrowUp')`,
`minecraft-demo` reads WASD only, and the virtual gamepad maps buttons 0–3 to the
arrows. Carts OR these together, so nothing is double-counted.

| Direction | Keys sent             |
| --------- | --------------------- |
| Up        | `ArrowUp` + `KeyW`    |
| Down      | `ArrowDown` + `KeyS`  |
| Left      | `ArrowLeft` + `KeyA`  |
| Right     | `ArrowRight` + `KeyD` |

The pad is a single element rather than four buttons, hit-tested by angle from
its centre:

- A thumb between two arms activates **both**, so diagonals work like a real
  d-pad (up-left sends `ArrowUp` + `ArrowLeft` and their WASD pairs).
- A **dead zone** in the middle means a thumb resting at centre presses nothing.
- Sliding across the pad swaps direction cleanly — the old direction is released
  as the new one engages, so nothing sticks.

### Action buttons

| Button    | Keys sent        | Typical use              |
| --------- | ---------------- | ------------------------ |
| **A**     | `Space` + `KeyZ` | Primary — fire / confirm |
| **B**     | `KeyX`           | Secondary                |
| **RUN**   | `ShiftLeft`      | Sprint / modifier        |
| **START** | `Enter`          | Start / pause            |

These follow the `KEYMAP` in [`runtime/input.js`](../runtime/input.js), so they
line up with the virtual gamepad indices carts read through `btn()`.

To change the layout, edit `DIRECTION_KEYS` and `ACTION_BUTTONS` at the top of
`runtime/touch-controls.js` — both are plain data.

---

## Layout and behaviour

**Ergonomics.** Directions bottom-left, actions bottom-right, both within thumb
reach. On tablets (≥820px, coarse pointer) the clusters pull in from the extreme
corners to stay in a comfortable arc.

**Orientation and safe areas.** Positions are offset by `env(safe-area-inset-*)`
on every edge, so notches, rounded corners and the home indicator are respected.
Short landscape viewports (≤520px tall) shrink the controls and hug the bottom
corners, keeping the centre of the screen clear.

**Touch targets.** Sized in `vmin` and `clamp()`ed so they scale with the screen
without becoming unusable: the pad is 132–200px across and action buttons are
62–92px (54–74px for the small pair) — comfortably past the 44px minimum.

**Visual feedback.** A pressed control fills with the NOVA64 accent blue, brightens
its border, and scales down slightly. The overlay is semi-transparent with a
backdrop blur so gameplay stays visible underneath. `prefers-reduced-motion` drops
the transitions.

**No accidental gestures.** The overlay sets `touch-action: none`, `user-select: none`
and `-webkit-touch-callout: none`, and every handler calls `preventDefault()`, so
dragging on the controls cannot scroll, pinch-zoom, select text, or raise the iOS
callout menu. Pointer capture keeps a finger that slides off a button bound to it
— and a capture failure is caught, never blocking the press.

**Nothing gets stuck.** Keys are reference-counted and released on pointer up,
pointer cancel, window blur, tab hide, and when the controls are hidden or
destroyed.

---

## API reference

Exposed as `nova64.touch.*`:

| Function                        | Purpose                                                         |
| ------------------------------- | --------------------------------------------------------------- |
| `isTouchDevice()`               | Does this device have a coarse pointer and touch?               |
| `shouldEnableTouchControls()`   | Device capability combined with the config flag.                |
| `initTouchControls(opts?)`      | Mount if the flag and device agree. Idempotent; called at boot. |
| `setTouchControlsEnabled(bool)` | Turn on/off at runtime and update the flag.                     |
| `getTouchControls()`            | The live handle, or `null`.                                     |
| `createTouchControls(opts?)`    | Mount unconditionally, ignoring the flag.                       |

The live overlay is also at `globalThis.__nova64TouchControls`.
