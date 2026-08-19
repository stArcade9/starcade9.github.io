// app.js — MetaverseApp: the orchestrator.
//
// Owns the net room, local + remote player state (with interpolation), the
// active render backend, and the plugin lifecycle. Plugins (controls, chat, …)
// read/extend the app through a context object; they never touch nova64 net or
// scene directly, so the same plugin runs on any backend. See docs/METAVERSE.md.

import { getBackend, createPluginSet } from './registry.js';
import * as ui from './ui.js';
import { renderUI, defaultTheme } from './ui.js';

const SEND_HZ = 15;
const LERP = 12; // remote-avatar smoothing rate

// Avatar appearance palette (customization via the per-player `data` blob).
const PALETTE = [
  0xffff5566, 0xffffaa33, 0xffffe14d, 0xff66dd66, 0xff44ccff, 0xff9b6bff, 0xffff77cc, 0xffffffff,
];
const APPEARANCE_KEY = 'nova64.metaverse.appearance';
const NICK_KEY = 'nova64.metaverse.nick';

// localStorage helpers, guarded for non-DOM hosts (Godot/QuickJS).
function lsGet(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (_) {
    return null;
  }
}
function lsSet(key, val) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
  } catch (_) {
    /* ignore */
  }
}

// Decode a player's `data` blob ({"color":<0xAARRGGBB>,"provider":"google"}) into
// an object; {} on missing/bad data.
function parseData(data) {
  if (!data) return {};
  try {
    return JSON.parse(data) || {};
  } catch (_) {
    return {};
  }
}
function colorOf(meta) {
  return Number.isFinite(meta.color) ? meta.color >>> 0 : null;
}

function now() {
  return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
}
function netReady() {
  return !!(nova64.net && nova64.net.isSupported && nova64.net.isSupported());
}
function defaultNetUrl() {
  try {
    if (typeof location !== 'undefined' && location.hostname) {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      return proto + '://' + location.hostname + ':2567';
    }
  } catch (_) {
    /* ignore */
  }
  return 'ws://localhost:2567';
}
function colorFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = (h % 360) / 360;
  // hsl→0xAARRGGBB (alpha opaque). Cheap HSL with s=0.6 l=0.55.
  const s = 0.6;
  const l = 0.55;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = hue * 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (0xff000000 | (R << 16) | (G << 8) | B) >>> 0;
}

export function createApp(opts = {}) {
  const backend = getBackend(opts.backend || 'web');
  const theme = Object.assign({}, defaultTheme, opts.theme || {});
  const plugins = createPluginSet();
  (opts.plugins || []).forEach(p => plugins.use(p));

  const world = opts.world || {};
  const LOCAL_ID = '__me__'; // handle for the local player's own avatar
  const local = { x: 0, z: 6, yaw: Math.PI, pitch: 0, mode: 'first' };

  // Local avatar appearance. Start from a saved choice, else a palette slot
  // seeded by the name so two unconfigured visitors usually differ.
  const hashIndex = s => {
    let h = 0;
    const str = String(s || 'me');
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % PALETTE.length;
  };
  let colorIndex = hashIndex(opts.name);
  let colorCustomized = false; // true once the user explicitly picks (or had a saved choice)
  const savedColor = parseInt(lsGet(APPEARANCE_KEY), 10);
  if (Number.isFinite(savedColor) && savedColor >= 0 && savedColor < PALETTE.length) {
    colorIndex = savedColor;
    colorCustomized = true;
  }
  const appearance = { color: PALETTE[colorIndex] };
  const others = new Map(); // id -> { x, z, yaw, name, tx, tz, tyaw } (t* = targets)
  const commands = new Map();
  let room = null;
  let me = null;
  // A saved /nick survives reloads and wins over both the random visitor name and
  // the identity name (it's a deliberate choice, like a customized color).
  const nickOverride = lsGet(NICK_KEY) || null;
  let displayName = nickOverride || opts.name || 'Visitor';
  let status = 'starting';
  let authBusy = false;
  let authMessage = '';
  let lastSent = 0;
  let prevTouchIds = new Set();
  let consumedPrev = new Set();
  let moveIntent = { forward: 0, strafe: 0 };

  // ---- context handed to plugins --------------------------------------
  const ctx = {
    backend,
    theme,
    ui,
    world,
    local,
    others,
    status: () => status,
    room: () => room,
    me: () => me,
    identity: () => me,
    auth: {
      busy: () => authBusy,
      message: () => authMessage,
      providers: () =>
        nova64.auth && typeof nova64.auth.providers === 'function' ? nova64.auth.providers() : [],
      signIn: provider => signInProvider(provider),
      signOut: () => signOutIdentity(),
    },
    input: {
      key: (...c) => {
        const k = nova64.input && (nova64.input.key || nova64.input.isKeyPressed);
        return typeof k === 'function' ? c.some(x => k.call(nova64.input, x)) : false;
      },
      touches: () => (nova64.input && nova64.input.touches ? nova64.input.touches() : []),
      touchCount: () => (nova64.input && nova64.input.touchCount ? nova64.input.touchCount() : 0),
      isConsumed: id => consumedPrev.has(id),
    },
    pointers: [],
    // movement intents (controls plugin writes these)
    setMove: (forward, strafe) => {
      moveIntent.forward = forward;
      moveIntent.strafe = strafe;
    },
    addYaw: d => {
      local.yaw += d;
    },
    addPitch: d => {
      local.pitch = Math.max(-0.9, Math.min(0.9, local.pitch + d));
    },
    toggleCamera: () => {
      local.mode = local.mode === 'first' ? 'third' : 'first';
    },
    // appearance (read current color; cycle through the palette)
    appearance,
    cycleColor: () => setLocalColor((colorIndex + 1) % PALETTE.length),
    // display name (read; change live via /nick)
    displayName: () => displayName,
    setName: n => {
      const name = String(n == null ? '' : n)
        .trim()
        .slice(0, 24);
      if (!name) return;
      displayName = name;
      lsSet(NICK_KEY, name); // remember across reloads
      if (room) room.send('setName', { name });
    },
    // chat / relay
    registerCommand: (name, fn) => commands.set(name, fn),
    runCommand: (name, args) => {
      const fn = commands.get(name);
      if (fn) {
        fn(args, ctx);
        return true;
      }
      return false;
    },
    sendRelay: (type, msg) => {
      if (room) room.send(type, msg);
    },
  };

  // Fire a presence lifecycle hook (onPeerJoin/onPeerLeave) across plugins.
  function notifyPeer(hook, id, info) {
    plugins.all().forEach(pl => {
      if (typeof pl[hook] === 'function') {
        try {
          pl[hook](id, info, ctx);
        } catch (_) {
          /* ignore */
        }
      }
    });
  }

  // Resolve who we are: prefer a real signed-in identity (Supabase after an
  // OAuth redirect, or a stored session), else fall back to a guest. The net
  // facade attaches nova64.auth.token() on join, so the server can verify a real
  // identity while still letting guests in (dev).
  async function resolveIdentity() {
    if (!(nova64.auth && nova64.auth.signIn)) return null;
    try {
      if (nova64.auth.restore) {
        const restored = await nova64.auth.restore();
        if (restored && !restored.error && restored.provider && restored.provider !== 'guest') {
          return restored;
        }
      }
    } catch (_) {
      /* ignore */
    }
    return await nova64.auth.signIn('guest', {
      name: opts.name || 'Visitor-' + Math.floor(Math.random() * 1000),
    });
  }

  function adoptIdentity(id) {
    if (!id || id.error) return;
    me = id;
    if (id.displayName && !nickOverride) {
      displayName = id.displayName;
      if (room) room.send('setName', { name: displayName });
    }
    applyIdentityColor();
    sendAppearance();
  }

  function currentUrl() {
    try {
      return typeof location !== 'undefined' && location.href ? location.href : undefined;
    } catch (_) {
      return undefined;
    }
  }

  async function signInProvider(provider = 'google') {
    if (!(nova64.auth && nova64.auth.signIn)) {
      authMessage = 'auth unavailable';
      return { error: 'auth_unavailable' };
    }
    authBusy = true;
    authMessage = 'signing in...';
    try {
      const res = await nova64.auth.signIn(provider, {
        options: { redirectTo: currentUrl() },
      });
      if (res && res.error) {
        authMessage = res.message || res.error;
        return res;
      }
      if (res) {
        adoptIdentity(res);
        authMessage = 'signed in';
      } else {
        authMessage = 'complete sign-in in browser';
      }
      return res;
    } catch (e) {
      authMessage = (e && e.message) || 'sign-in failed';
      return { error: 'sign_in_failed', message: authMessage };
    } finally {
      authBusy = false;
    }
  }

  function signOutIdentity() {
    if (nova64.auth && nova64.auth.signOut) nova64.auth.signOut();
    me = null;
    if (!nickOverride) displayName = opts.name || 'Visitor';
    if (room) room.send('setName', { name: displayName });
    sendAppearance();
    authMessage = 'signed out';
  }

  // A signed-in user gets a stable avatar color seeded from their identity (so
  // it's the same every session) — unless they've explicitly picked one.
  function applyIdentityColor() {
    if (colorCustomized || !me || !me.id || me.provider === 'guest') return;
    colorIndex = hashIndex(me.id);
    appearance.color = PALETTE[colorIndex];
    if (backend.setAvatarStyle) backend.setAvatarStyle(LOCAL_ID, { color: appearance.color });
  }

  // Broadcast our appearance + provider so others recolor our avatar and can show
  // an identity badge. The server stores it in our `data` blob, so players who
  // join later pick it up on spawn too.
  function sendAppearance() {
    if (!room) return;
    const provider = (me && me.provider) || 'guest';
    room.send('set', { data: JSON.stringify({ color: appearance.color, provider }) });
  }
  // Apply a palette choice locally (own avatar), persist it, and broadcast.
  function setLocalColor(index) {
    colorIndex = ((index % PALETTE.length) + PALETTE.length) % PALETTE.length;
    colorCustomized = true;
    appearance.color = PALETTE[colorIndex];
    if (backend.setAvatarStyle) backend.setAvatarStyle(LOCAL_ID, { color: appearance.color });
    lsSet(APPEARANCE_KEY, String(colorIndex));
    sendAppearance();
  }

  function spawn(id, p) {
    const name = (p && p.name) || id.slice(0, 4);
    const data = (p && p.data) || '';
    const meta = parseData(data);
    others.set(id, {
      x: p.x || 0,
      z: p.z || 0,
      yaw: p.ry || 0,
      tx: p.x || 0,
      tz: p.z || 0,
      tyaw: p.ry || 0,
      name,
      data,
      provider: meta.provider || null,
    });
    const color = colorOf(meta);
    backend.addAvatar(id, { color: color != null ? color : colorFor(id), name });
    notifyPeer('onPeerJoin', id, { name });
  }
  function despawn(id) {
    const o = others.get(id);
    backend.removeAvatar(id);
    others.delete(id);
    notifyPeer('onPeerLeave', id, { name: (o && o.name) || id.slice(0, 4) });
  }

  async function connect() {
    if (!netReady()) {
      status = 'offline (no net on this host)';
      return;
    }
    try {
      adoptIdentity(await resolveIdentity());
      status = 'connecting…';
      const url = globalThis.__NOVA64_NET_URL || opts.netUrl || defaultNetUrl();
      await nova64.net.connect({ url });
      // Fail fast instead of hanging forever if the host is unreachable (e.g.
      // native Godot socket can't reach a WSL server over localhost). Without
      // this the join promise never settles and the SDK keeps polling.
      const timeoutMs = opts.connectTimeoutMs || 8000;
      room = await Promise.race([
        nova64.net.joinOrCreate('state', { name: displayName }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('connect_timeout')), timeoutMs)),
      ]);
      status = 'connected';

      room.onPlayerAdd((p, id) => {
        if (id === room.sessionId) return;
        if (!others.has(id)) spawn(id, p);
      });
      room.onPlayerChange((p, id) => {
        if (id === room.sessionId) return;
        const o = others.get(id);
        if (o) {
          o.tx = p.x;
          o.tz = p.z;
          o.tyaw = p.ry;
          if (p.name) o.name = p.name;
          // Appearance/identity changed → recolor their avatar + note provider.
          if (p.data != null && p.data !== o.data) {
            o.data = p.data;
            const meta = parseData(p.data);
            if (meta.provider) o.provider = meta.provider;
            const c = colorOf(meta);
            if (c != null && backend.setAvatarStyle) backend.setAvatarStyle(id, { color: c });
          }
        } else spawn(id, p);
      });
      room.onPlayerRemove(id => despawn(id));
      room.onLeave(() => {
        status = 'disconnected';
        room = null;
      });
      room.onError(code => {
        status = 'error ' + code;
      });
      room.onMessage('event', evt => {
        plugins.all().forEach(pl => {
          if (typeof pl.onNetMessage === 'function') {
            try {
              pl.onNetMessage(evt, ctx);
            } catch (_) {
              /* ignore */
            }
          }
        });
      });
      sendPos(true);
      sendAppearance(); // tell everyone our chosen color
    } catch (e) {
      room = null;
      // Tear down any half-open connection so the SDK stops polling/retrying.
      try {
        nova64.net.leave();
      } catch (_) {
        /* ignore */
      }
      status =
        e && e.message === 'connect_timeout'
          ? 'offline (connect timed out)'
          : 'offline (server not reachable)';
    }
  }

  function sendPos(force) {
    if (!room) return;
    const t = now();
    if (!force && t - lastSent < 1 / SEND_HZ) return;
    lastSent = t;
    room.send('pos3', { x: local.x, y: 0, z: local.z, ry: local.yaw });
  }

  function gatherPointers() {
    const out = [];
    const tc = ctx.input.touchCount();
    if (tc > 0) {
      const ids = new Set();
      ctx.input.touches().forEach(t => {
        ids.add(t.id);
        out.push({ id: t.id, x: t.x, y: t.y, down: true, pressed: !prevTouchIds.has(t.id) });
      });
      prevTouchIds = ids;
    } else {
      prevTouchIds = new Set();
      const mx = nova64.input.mouseX ? nova64.input.mouseX() : 0;
      const my = nova64.input.mouseY ? nova64.input.mouseY() : 0;
      const down = nova64.input.mouseDown ? nova64.input.mouseDown() : false;
      const pressed = nova64.input.mousePressed ? nova64.input.mousePressed() : false;
      out.push({ id: 'mouse', x: mx, y: my, down, pressed });
    }
    return out;
  }

  return {
    status: () => status,
    async start() {
      backend.init(world);
      // Your own avatar — shown only in third-person (in first-person the camera
      // sits inside it). Lets you actually see yourself move when you press C.
      backend.addAvatar(LOCAL_ID, { color: appearance.color, name: opts.name || 'me' });
      if (backend.setAvatarVisible) backend.setAvatarVisible(LOCAL_ID, false);
      plugins.all().forEach(pl => {
        if (typeof pl.init === 'function') pl.init(ctx);
      });
      // React to identity changes (e.g. an OAuth sign-in completing): adopt the
      // new identity, reseed the color, and re-broadcast. The display name others
      // see is set at join, so a name change there needs a reconnect.
      if (nova64.auth && nova64.auth.onChange) {
        nova64.auth.onChange(id => {
          if (!id || id.error) {
            me = null;
            sendAppearance();
            return;
          }
          adoptIdentity(id);
        });
      }
      connect(); // non-blocking; world renders immediately
    },

    update(dt) {
      if (nova64.net && nova64.net._tick) nova64.net._tick(dt);
      ctx.pointers = gatherPointers();

      moveIntent.forward = 0;
      moveIntent.strafe = 0;
      plugins.all().forEach(pl => {
        if (typeof pl.update === 'function') pl.update(dt, ctx);
      });

      // Integrate local movement from the merged intent (controls plugin).
      const speed = opts.moveSpeed || 6;
      const fx = Math.sin(local.yaw);
      const fz = Math.cos(local.yaw);
      const rx = Math.cos(local.yaw);
      const rz = -Math.sin(local.yaw);
      let dx = fx * moveIntent.forward + rx * moveIntent.strafe;
      let dz = fz * moveIntent.forward + rz * moveIntent.strafe;
      const len = Math.hypot(dx, dz);
      let moved = false;
      if (len > 0) {
        dx /= len;
        dz /= len;
        local.x = Math.max(-39, Math.min(39, local.x + dx * speed * dt));
        local.z = Math.max(-39, Math.min(39, local.z + dz * speed * dt));
        moved = true;
      }
      if (moved) sendPos(false);

      // Interpolate + render remote avatars.
      const k = Math.min(1, LERP * dt);
      others.forEach((o, id) => {
        o.x += (o.tx - o.x) * k;
        o.z += (o.tz - o.z) * k;
        let dyaw = o.tyaw - o.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        o.yaw += dyaw * k;
        backend.updateAvatar(id, { x: o.x, z: o.z, ry: o.yaw });
      });

      // Your own avatar follows you; visible only in third-person.
      backend.updateAvatar(LOCAL_ID, { x: local.x, z: local.z, ry: local.yaw });
      if (backend.setAvatarVisible) backend.setAvatarVisible(LOCAL_ID, local.mode === 'third');

      backend.setCamera({
        x: local.x,
        z: local.z,
        yaw: local.yaw,
        pitch: local.pitch,
        mode: local.mode,
      });
    },

    draw() {
      const roots = [];
      plugins.all().forEach(pl => {
        if (typeof pl.renderUI === 'function') {
          const node = pl.renderUI(ctx);
          if (Array.isArray(node)) roots.push(...node);
          else if (node) roots.push(node);
        }
      });
      consumedPrev = renderUI(roots, { backend, theme }, ctx.pointers);
    },
  };
}
