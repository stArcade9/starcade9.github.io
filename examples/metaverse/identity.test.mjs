// Focused test for nova64.auth identity wiring in the app: a signed-in provider
// identity (not guest) is adopted, drives the room display name, seeds a stable
// avatar color, and is broadcast (with provider) via the data blob. Drives the
// app core directly with a stub backend so it's isolated from the web renderer.
// Run: node identity.test.mjs

const sends = [];
let joinOpts = null;
const roomCbs = {};

global.nova64 = {
  net: {
    isSupported: () => true,
    connect: async () => ({ ok: true }),
    joinOrCreate: async (_room, opts) => {
      joinOpts = opts;
      return {
        sessionId: 'self',
        onPlayerAdd: cb => (roomCbs.add = cb),
        onPlayerChange: cb => (roomCbs.change = cb),
        onPlayerRemove: cb => (roomCbs.remove = cb),
        onLeave: cb => (roomCbs.leave = cb),
        onError: cb => (roomCbs.error = cb),
        onMessage: (type, cb) => (roomCbs['msg:' + type] = cb),
        send: (type, msg) => sends.push({ type, msg }),
      };
    },
    _tick: () => {},
  },
  // A real (Google) identity is already available via restore().
  auth: {
    restore: async () => ({ id: 'google:abc123', provider: 'google', displayName: 'Ada L.' }),
    signIn: async () => ({ id: 'guest:x', provider: 'guest', displayName: 'Guest' }),
    onChange: () => () => {},
    token: () => 'jwt',
  },
  input: {
    key: () => false,
    mouseX: () => 0,
    mouseY: () => 0,
    mouseDown: () => false,
    mousePressed: () => false,
    touches: () => [],
    touchCount: () => 0,
  },
};

const { createApp } = await import('./core/app.js');
const { registerBackend } = await import('./core/registry.js');

// Minimal stub backend that records avatar styling.
const styled = [];
registerBackend({
  id: 'stub',
  init: () => {},
  addAvatar: () => {},
  updateAvatar: () => {},
  removeAvatar: () => {},
  setAvatarVisible: () => {},
  setAvatarStyle: (id, s) => styled.push({ id, color: s.color }),
  setCamera: () => {},
  worldToScreen: () => ({ x: 0, y: 0, visible: false }),
  drawRect: () => {},
  drawText: () => {},
  measureText: s => String(s).length * 6,
  viewport: () => ({ w: 640, h: 360 }),
});

const tick = () => new Promise(r => setTimeout(r, 0));
const assert = (c, m) => {
  if (!c) {
    console.error('FAIL identity:', m);
    process.exit(1);
  }
};

const PALETTE = [
  0xffff5566, 0xffffaa33, 0xffffe14d, 0xff66dd66, 0xff44ccff, 0xff9b6bff, 0xffff77cc, 0xffffffff,
];

const app = createApp({ backend: 'stub', name: 'ignored-random-name', plugins: [] });
app.start();
await tick();
await tick(); // let connect()/restore() settle

assert(
  joinOpts && joinOpts.name === 'Ada L.',
  'room join uses identity displayName, not opts.name'
);

const setMsg = sends.find(s => s.type === 'set');
assert(setMsg, 'appearance broadcast on connect');
const data = JSON.parse(setMsg.msg.data);
assert(data.provider === 'google', 'broadcast carries the provider');
assert(PALETTE.includes(data.color >>> 0), 'broadcast color is a palette entry');

// Color is stable: seeded from the identity id, so re-deriving matches.
const h = (() => {
  let n = 0;
  const s = 'google:abc123';
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n % PALETTE.length;
})();
assert(data.color >>> 0 === PALETTE[h], 'color is seeded deterministically from identity id');

// A remote signed-in peer with appearance data recolors in place (the data path
// that also carries their provider for the roster badge).
roomCbs.add({ x: 1, z: 1, ry: 0, name: 'Bob', data: '' }, 'r1');
roomCbs.change(
  { x: 1, z: 1, ry: 0, name: 'Bob', data: '{"color":4294923366,"provider":"discord"}' },
  'r1'
);
assert(
  styled.some(s => s.id === 'r1' && s.color >>> 0 === 4294923366),
  'remote appearance recolors peer'
);

console.log('PASS identity: real identity adopted (name+stable color+provider broadcast)');
process.exit(0);
