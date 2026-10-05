// touch-controls.js — on-screen gamepad for phones and tablets.
//
// Every control here drives `input.setKeyState(code, down)`, the exact same
// entry point the real keyboard listeners use. That is deliberate: it means a
// touch press is indistinguishable from a key press to cart code, so holding a
// button, pressing several at once, and `keyp()` edge detection all behave
// identically without any cart needing to know touch exists.
//
// ── Configuration ────────────────────────────────────────────────────────────
// One global switch, readable and writable at any time:
//
//   globalThis.NOVA64_TOUCH_CONTROLS = 'auto' | true | false
//
//   'auto'  (default) show on devices with a coarse pointer and touch support
//   true              always show, on every device
//   false             never create them at all
//
// Set it before the runtime boots (an inline <script> above the module script
// in your HTML) to decide the initial state, or call
// nova64.touch.setEnabled(...) later to change it at runtime.

import { input } from './input.js';

/** Name of the global configuration flag. */
export const TOUCH_CONFIG_GLOBAL = 'NOVA64_TOUCH_CONTROLS';

/** Remembers the player's show/hide choice between sessions. */
const VISIBILITY_KEY = 'nova64.touchControls.visible';

const STYLE_ID = 'nova64-touch-controls-style';
const ROOT_ID = 'nova64-touch-controls';

// ── Button map ───────────────────────────────────────────────────────────────
// Each control sends one or more key codes. Directions send BOTH the arrow and
// the WASD equivalent because carts read whichever they prefer — wad-demo tests
// `key('KeyW') || key('ArrowUp')`, minecraft-demo reads WASD only, and the
// built-in virtual gamepad maps buttons 0-3 to the arrows. Sending both means
// one thumb works everywhere; carts OR them together, so nothing double-counts.
const DIRECTION_KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
};

// Right-hand cluster. `keys` follow runtime/input.js KEYMAP so the on-screen
// buttons line up with the virtual gamepad indices carts read via btn().
const ACTION_BUTTONS = [
  { id: 'a', label: 'A', keys: ['Space', 'KeyZ'], hint: 'Primary — fire / confirm' },
  { id: 'b', label: 'B', keys: ['KeyX'], hint: 'Secondary' },
  { id: 'run', label: 'RUN', keys: ['ShiftLeft'], hint: 'Sprint / modifier', small: true },
  { id: 'start', label: 'START', keys: ['Enter'], hint: 'Start / pause', small: true },
];

// ── Device detection ─────────────────────────────────────────────────────────

/**
 * Is this a touch-first device (phone or tablet)?
 *
 * A coarse primary pointer plus real touch points is the reliable signal.
 * iPadOS reports a desktop user-agent but still answers both of these, and a
 * desktop with a touchscreen reports a *fine* primary pointer, so a mouse user
 * does not get a gamepad pasted over their game.
 */
export function isTouchDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const touchPoints = navigator.maxTouchPoints || 0;
  return coarse && touchPoints > 0;
}

/** Resolve the global flag into a yes/no for this device. */
export function shouldEnableTouchControls() {
  const setting = typeof globalThis !== 'undefined' ? globalThis[TOUCH_CONFIG_GLOBAL] : undefined;
  if (setting === true) return true;
  if (setting === false) return false;
  // undefined or 'auto'
  return isTouchDevice();
}

// ── Styles ───────────────────────────────────────────────────────────────────
// Sized in vmin so the pad scales with the screen, clamped so it stays usable
// on a small phone and does not become comical on a tablet. Every interactive
// surface is well past the 44px minimum touch target.
function styles() {
  return `
#${ROOT_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  /* Never let a drag scroll, zoom, select text, or pop the iOS callout. */
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
#${ROOT_ID} * { touch-action: none; -webkit-user-select: none; user-select: none; }
#${ROOT_ID} [hidden] { display: none !important; }

/* Respect notches and home indicators on every edge. */
#${ROOT_ID} .n64t-pad,
#${ROOT_ID} .n64t-actions {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
  pointer-events: auto;
}
#${ROOT_ID} .n64t-pad { left: calc(env(safe-area-inset-left, 0px) + 18px); }
#${ROOT_ID} .n64t-actions { right: calc(env(safe-area-inset-right, 0px) + 18px); }

/* ── Directional pad ─────────────────────────────────────────────────────── */
/* One element rather than four buttons: a thumb resting between two arms
   activates both, so diagonals work the way they do on a real d-pad. */
#${ROOT_ID} .n64t-pad {
  width: clamp(132px, 34vmin, 200px);
  height: clamp(132px, 34vmin, 200px);
  border-radius: 50%;
  background: rgba(9, 10, 15, 0.42);
  border: 1px solid rgba(56, 189, 248, 0.28);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  place-items: center;
}
#${ROOT_ID} .n64t-dir {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: rgba(226, 232, 240, 0.72);
  font-size: clamp(15px, 4vmin, 22px);
  line-height: 1;
  border-radius: 10px;
  transition: background 90ms linear, color 90ms linear;
}
#${ROOT_ID} .n64t-dir.up { grid-area: 1 / 2; }
#${ROOT_ID} .n64t-dir.left { grid-area: 2 / 1; }
#${ROOT_ID} .n64t-dir.right { grid-area: 2 / 3; }
#${ROOT_ID} .n64t-dir.down { grid-area: 3 / 2; }
#${ROOT_ID} .n64t-dir.is-active {
  background: rgba(56, 189, 248, 0.3);
  color: #e0f2fe;
}
#${ROOT_ID} .n64t-pad-hub {
  grid-area: 2 / 2;
  width: 26%;
  height: 26%;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.14);
}

/* ── Action buttons ──────────────────────────────────────────────────────── */
#${ROOT_ID} .n64t-actions {
  display: grid;
  grid-template-columns: auto auto;
  gap: clamp(10px, 2.4vmin, 16px);
  align-items: end;
  justify-items: center;
}
#${ROOT_ID} .n64t-btn {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  display: grid;
  place-items: center;
  width: clamp(62px, 16vmin, 92px);
  height: clamp(62px, 16vmin, 92px);
  border-radius: 50%;
  background: rgba(9, 10, 15, 0.46);
  border: 1px solid rgba(56, 189, 248, 0.34);
  color: #e2e8f0;
  font: 600 clamp(13px, 3.2vmin, 17px)/1 'Inter', system-ui, sans-serif;
  letter-spacing: 0.04em;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: transform 90ms ease, background 90ms linear, border-color 90ms linear;
}
#${ROOT_ID} .n64t-btn.is-small {
  width: clamp(54px, 12.5vmin, 74px);
  height: clamp(54px, 12.5vmin, 74px);
  border-radius: 999px;
  font-size: clamp(10px, 2.4vmin, 13px);
  color: #94a3b8;
}
#${ROOT_ID} .n64t-btn.is-active {
  background: rgba(56, 189, 248, 0.34);
  border-color: rgba(56, 189, 248, 0.85);
  color: #f0f9ff;
  transform: scale(0.94);
}
/* A tap leaves the button focused, and Chromium's default square focus ring on
   a round control reads as a rendering bug. Drop it for pointer input but keep
   a proper ring for keyboard users, matched to the button's own shape. */
#${ROOT_ID} .n64t-btn:focus { outline: none; }
#${ROOT_ID} .n64t-btn:focus-visible {
  outline: 2px solid rgba(125, 211, 252, 0.95);
  outline-offset: 3px;
}

/* ── Show / hide toggle ──────────────────────────────────────────────────── */
/* Lives outside the controls so it stays reachable once they are hidden. */
#${ROOT_ID} .n64t-toggle {
  position: absolute;
  right: calc(env(safe-area-inset-right, 0px) + 14px);
  top: calc(env(safe-area-inset-top, 0px) + 14px);
  pointer-events: auto;
  -webkit-appearance: none;
  appearance: none;
  min-width: 48px;
  min-height: 48px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(9, 10, 15, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #93c5fd;
  font: 600 12px/1 'Inter', system-ui, sans-serif;
  letter-spacing: 0.06em;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
#${ROOT_ID} .n64t-toggle:active { background: rgba(56, 189, 248, 0.3); }
#${ROOT_ID} .n64t-toggle:focus { outline: none; }
#${ROOT_ID} .n64t-toggle:focus-visible {
  outline: 2px solid rgba(125, 211, 252, 0.95);
  outline-offset: 3px;
}

/* ── Landscape ───────────────────────────────────────────────────────────── */
/* Short viewports: shrink and hug the bottom corners so the pad never covers
   the middle of the screen where the game is. */
@media (orientation: landscape) and (max-height: 520px) {
  #${ROOT_ID} .n64t-pad,
  #${ROOT_ID} .n64t-actions { bottom: calc(env(safe-area-inset-bottom, 0px) + 10px); }
  #${ROOT_ID} .n64t-pad { width: clamp(112px, 30vmin, 158px); height: clamp(112px, 30vmin, 158px); }
  #${ROOT_ID} .n64t-btn { width: clamp(54px, 14vmin, 74px); height: clamp(54px, 14vmin, 74px); }
  #${ROOT_ID} .n64t-btn.is-small { width: clamp(46px, 11vmin, 60px); height: clamp(46px, 11vmin, 60px); }
}

/* Tablets: the thumbs are further apart, so pull the clusters in from the
   extreme corners to keep them in a comfortable arc. */
@media (min-width: 820px) and (pointer: coarse) {
  #${ROOT_ID} .n64t-pad { left: calc(env(safe-area-inset-left, 0px) + 44px); }
  #${ROOT_ID} .n64t-actions { right: calc(env(safe-area-inset-right, 0px) + 44px); }
}

@media (prefers-reduced-motion: reduce) {
  #${ROOT_ID} .n64t-btn,
  #${ROOT_ID} .n64t-dir { transition: none; }
  #${ROOT_ID} .n64t-btn.is-active { transform: none; }
}
`;
}

// ── Implementation ───────────────────────────────────────────────────────────

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const el = doc.createElement('style');
  el.id = STYLE_ID;
  el.textContent = styles();
  doc.head.appendChild(el);
}

/**
 * Build and mount the on-screen controls.
 *
 * @param {object} [opts]
 * @param {Document} [opts.document] document to mount into
 * @param {boolean}  [opts.visible]  initial visibility (defaults to the stored choice)
 * @returns {object} handle with show/hide/toggle/destroy/isVisible/element
 */
export function createTouchControls(opts = {}) {
  const doc = opts.document || (typeof document !== 'undefined' ? document : null);
  if (!doc || !doc.body) return null;

  const existing = doc.getElementById(ROOT_ID);
  if (existing && existing.__nova64TouchControls) return existing.__nova64TouchControls;

  ensureStyles(doc);

  const root = doc.createElement('div');
  root.id = ROOT_ID;

  // Every key this overlay is currently holding down, so nothing can be left
  // stuck if a pointer is lost, the overlay is hidden, or the tab is blurred.
  const held = new Map(); // key code -> number of controls holding it

  const press = code => {
    const n = (held.get(code) || 0) + 1;
    held.set(code, n);
    if (n === 1) input.setKeyState(code, true);
  };
  const release = code => {
    const n = (held.get(code) || 0) - 1;
    if (n > 0) {
      held.set(code, n);
      return;
    }
    held.delete(code);
    input.setKeyState(code, false);
  };
  const releaseAll = () => {
    for (const code of [...held.keys()]) input.setKeyState(code, false);
    held.clear();
  };

  // Pointer capture keeps events coming to the control when a finger slides off
  // it, but it throws if the browser has no active pointer with that id. It is
  // an enhancement, never a prerequisite — a failure here must not stop the
  // button from registering.
  const capture = (el, id) => {
    try {
      el.setPointerCapture?.(id);
    } catch {
      /* no active pointer — carry on uncaptured */
    }
  };
  const uncapture = (el, id) => {
    try {
      el.releasePointerCapture?.(id);
    } catch {
      /* already released */
    }
  };

  // ── D-pad ──
  const pad = doc.createElement('div');
  pad.className = 'n64t-pad';
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'Directional pad');
  pad.dataset.control = 'pad';
  const arrows = { up: '▲', down: '▼', left: '◀', right: '▶' };
  const dirEls = {};
  for (const dir of ['up', 'left', 'right', 'down']) {
    const el = doc.createElement('span');
    el.className = `n64t-dir ${dir}`;
    el.textContent = arrows[dir];
    el.setAttribute('aria-hidden', 'true');
    dirEls[dir] = el;
    pad.appendChild(el);
  }
  const hub = doc.createElement('span');
  hub.className = 'n64t-pad-hub';
  hub.setAttribute('aria-hidden', 'true');
  pad.appendChild(hub);

  // Directions currently held by the pad, so movement updates send only the
  // difference rather than thrashing setKeyState every pointermove.
  let padDirs = new Set();
  let padPointer = null;

  const setPadDirections = next => {
    for (const dir of padDirs) {
      if (!next.has(dir)) {
        DIRECTION_KEYS[dir].forEach(release);
        dirEls[dir].classList.remove('is-active');
      }
    }
    for (const dir of next) {
      if (!padDirs.has(dir)) {
        DIRECTION_KEYS[dir].forEach(press);
        dirEls[dir].classList.add('is-active');
      }
    }
    padDirs = next;
  };

  const directionsAt = (clientX, clientY) => {
    const r = pad.getBoundingClientRect();
    const dx = (clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (clientY - (r.top + r.height / 2)) / (r.height / 2);
    const next = new Set();
    // Dead zone keeps a thumb resting dead-centre from drifting.
    if (Math.hypot(dx, dy) < 0.22) return next;
    // A generous threshold on each axis means the diagonal band is wide enough
    // to hit on purpose but not so wide that straight presses go diagonal.
    if (dy < -0.32) next.add('up');
    if (dy > 0.32) next.add('down');
    if (dx < -0.32) next.add('left');
    if (dx > 0.32) next.add('right');
    return next;
  };

  const onPadDown = e => {
    e.preventDefault();
    padPointer = e.pointerId;
    capture(pad, e.pointerId);
    setPadDirections(directionsAt(e.clientX, e.clientY));
  };
  const onPadMove = e => {
    if (e.pointerId !== padPointer) return;
    e.preventDefault();
    setPadDirections(directionsAt(e.clientX, e.clientY));
  };
  const onPadUp = e => {
    if (e.pointerId !== padPointer) return;
    e.preventDefault();
    padPointer = null;
    uncapture(pad, e.pointerId);
    setPadDirections(new Set());
  };
  pad.addEventListener('pointerdown', onPadDown);
  pad.addEventListener('pointermove', onPadMove);
  pad.addEventListener('pointerup', onPadUp);
  pad.addEventListener('pointercancel', onPadUp);

  // ── Action buttons ──
  const actions = doc.createElement('div');
  actions.className = 'n64t-actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', 'Action buttons');
  // Lay the small modifier buttons out on the left of the cluster so the big
  // primary buttons sit under the thumb's natural arc.
  const order = [...ACTION_BUTTONS].sort((a, b) => Number(!!b.small) - Number(!!a.small));
  for (const spec of order) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = `n64t-btn${spec.small ? ' is-small' : ''}`;
    // Stable hook for styling and tests — labels are not unique enough
    // ("START" contains an "A").
    btn.dataset.control = spec.id;
    btn.textContent = spec.label;
    btn.setAttribute('aria-label', `${spec.label} — ${spec.hint}`);
    // One Set per button, so two fingers on the same button still release once.
    const pointers = new Set();
    const down = e => {
      e.preventDefault();
      if (pointers.has(e.pointerId)) return;
      if (pointers.size === 0) {
        spec.keys.forEach(press);
        btn.classList.add('is-active');
      }
      pointers.add(e.pointerId);
      capture(btn, e.pointerId);
    };
    const up = e => {
      if (!pointers.delete(e.pointerId)) return;
      e.preventDefault();
      uncapture(btn, e.pointerId);
      if (pointers.size === 0) {
        spec.keys.forEach(release);
        btn.classList.remove('is-active');
      }
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    // Keyboard/screen-reader users get the button too, without double-firing.
    btn.addEventListener('click', e => e.preventDefault());
    actions.appendChild(btn);
  }

  // ── Toggle ──
  const toggle = doc.createElement('button');
  toggle.type = 'button';
  toggle.className = 'n64t-toggle';

  let visible = true;
  if (typeof opts.visible === 'boolean') {
    visible = opts.visible;
  } else {
    try {
      const stored = globalThis.localStorage?.getItem(VISIBILITY_KEY);
      if (stored !== null && stored !== undefined) visible = stored === '1';
    } catch {
      /* private mode / blocked storage — fall back to visible */
    }
  }

  const applyVisibility = () => {
    pad.hidden = !visible;
    actions.hidden = !visible;
    toggle.textContent = visible ? 'HIDE ✦' : 'SHOW ✦';
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.setAttribute(
      'aria-label',
      visible ? 'Hide on-screen touch controls' : 'Show on-screen touch controls'
    );
    // Anything held when the pad disappears would otherwise stay down forever.
    if (!visible) {
      setPadDirections(new Set());
      releaseAll();
      for (const el of actions.querySelectorAll('.n64t-btn')) el.classList.remove('is-active');
    }
    try {
      globalThis.localStorage?.setItem(VISIBILITY_KEY, visible ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  toggle.addEventListener('pointerdown', e => e.preventDefault());
  toggle.addEventListener('click', e => {
    e.preventDefault();
    visible = !visible;
    applyVisibility();
  });

  root.append(toggle, pad, actions);
  doc.body.appendChild(root);
  applyVisibility();

  // A lost focus or a hidden tab must not leave keys stuck down.
  const onBlur = () => {
    setPadDirections(new Set());
    releaseAll();
  };
  globalThis.addEventListener?.('blur', onBlur);
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) onBlur();
  });

  const handle = {
    element: root,
    isVisible: () => visible,
    show() {
      visible = true;
      applyVisibility();
    },
    hide() {
      visible = false;
      applyVisibility();
    },
    toggle() {
      visible = !visible;
      applyVisibility();
      return visible;
    },
    destroy() {
      onBlur();
      globalThis.removeEventListener?.('blur', onBlur);
      root.remove();
      delete root.__nova64TouchControls;
    },
  };
  root.__nova64TouchControls = handle;
  return handle;
}

// ── Lifecycle used by the console ────────────────────────────────────────────

let active = null;

/**
 * Create the controls if this device and the global flag call for them.
 * Safe to call more than once.
 */
export function initTouchControls(opts = {}) {
  if (active) return active;
  if (!shouldEnableTouchControls()) return null;
  active = createTouchControls(opts);
  return active;
}

/** Turn the overlay on or off at runtime, updating the global flag to match. */
export function setTouchControlsEnabled(enabled) {
  globalThis[TOUCH_CONFIG_GLOBAL] = enabled;
  if (enabled) {
    if (!active) active = createTouchControls();
    else active.show();
  } else if (active) {
    active.destroy();
    active = null;
  }
  return !!active;
}

/** The live overlay, or null when it is not mounted. */
export function getTouchControls() {
  return active;
}

/** nova64.touch.* namespace surface. */
export function touchApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        isTouchDevice,
        shouldEnableTouchControls,
        initTouchControls,
        setTouchControlsEnabled,
        getTouchControls,
        createTouchControls,
        TOUCH_CONFIG_GLOBAL,
      });
    },
  };
}
