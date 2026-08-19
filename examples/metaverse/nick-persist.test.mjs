// A saved /nick survives reloads and wins over the identity name. Mocks
// localStorage + a signed-in identity, then asserts the room join uses the stored
// nick (not the identity displayName). Run: node nick-persist.test.mjs

const store = new Map();
store.set('nova64.metaverse.nick', 'StoredNick');
global.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};

let joinOpts = null;
global.nova64 = {
  net: {
    isSupported: () => true,
    connect: async () => ({ ok: true }),
    joinOrCreate: async (_room, opts) => {
      joinOpts = opts;
      return {
        sessionId: 'self',
        onPlayerAdd: () => {},
        onPlayerChange: () => {},
        onPlayerRemove: () => {},
        onLeave: () => {},
        onError: () => {},
        onMessage: () => {},
        send: () => {},
      };
    },
    _tick: () => {},
  },
  // A real identity exists, but the saved nick should still win.
  auth: {
    restore: async () => ({ id: 'google:abc', provider: 'google', displayName: 'Ada L.' }),
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

registerBackend({
  id: 'stub',
  init: () => {},
  addAvatar: () => {},
  updateAvatar: () => {},
  removeAvatar: () => {},
  setAvatarVisible: () => {},
  setAvatarStyle: () => {},
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
    console.error('FAIL nick-persist:', m);
    process.exit(1);
  }
};

const app = createApp({ backend: 'stub', name: 'Visitor-random', plugins: [] });
app.start();
await tick();
await tick();

assert(joinOpts, 'joined a room');
assert(joinOpts.name === 'StoredNick', 'saved nick wins over identity name on join');

console.log('PASS nick-persist: saved /nick restored across reload, overrides identity name');
process.exit(0);
