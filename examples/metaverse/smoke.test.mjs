// Headless smoke test for the metaverse framework: mock `nova64`, drive the real
// cart (init/update/draw), and assert the world/net/chat/movement wiring works.
const draws = [];
const sends = [];
let meshId = 0;
const roomCbs = {};
let theRoom = null;

function makeRoom() {
  theRoom = {
    sessionId: 'self',
    onPlayerAdd: cb => (roomCbs.add = cb),
    onPlayerChange: cb => (roomCbs.change = cb),
    onPlayerRemove: cb => (roomCbs.remove = cb),
    onLeave: cb => (roomCbs.leave = cb),
    onError: cb => (roomCbs.error = cb),
    onMessage: (type, cb) => (roomCbs['msg:' + type] = cb),
    send: (type, msg) => sends.push({ type, msg }),
  };
  return theRoom;
}

global.nova64 = {
  scene: {
    createPlane: () => ++meshId,
    createCube: () => ++meshId,
    setRotation: () => {},
    setScale: () => {},
    setPosition: () => {},
    destroyMesh: () => {},
    engine: { setMeshMaterial: (...a) => draws.push(['material', ...a]) },
  },
  camera: { setCameraPosition: () => {}, setCameraTarget: () => {}, setCameraFOV: () => {} },
  light: { setAmbientLight: () => {}, setDirectionalLight: () => {} },
  draw: {
    rectfill: (...a) => draws.push(['rectfill', ...a]),
    print: (...a) => draws.push(['print', ...a]),
    circle: (...a) => draws.push(['circle', ...a]),
    rgba8: (r, g, b, a) => ((a << 24) | (r << 16) | (g << 8) | b) >>> 0,
  },
  input: {
    key: () => keyState,
    mouseX: () => 0,
    mouseY: () => 0,
    mouseDown: () => false,
    mousePressed: () => false,
    touches: () => [],
    touchCount: () => 0,
  },
  net: {
    isSupported: () => true,
    connect: async () => ({ ok: true }),
    joinOrCreate: async () => makeRoom(),
    _tick: () => {},
  },
  auth: { signIn: async (_p, o) => ({ displayName: (o && o.name) || 'me' }) },
  startTextInput: () => {},
  stopTextInput: () => {},
  getTextInput: () => '',
  isTextInputActive: () => false,
};

let keyState = false; // global toggled per assertion

const tick = () => new Promise(r => setTimeout(r, 0));
const assert = (c, m) => {
  if (!c) {
    console.error('FAIL metaverse:', m);
    process.exit(1);
  }
};

const cart = await import('./code.js');

cart.init();
await tick();
await tick(); // let connect() settle

assert(typeof roomCbs.add === 'function', 'room callbacks registered after connect');

// Remote player joins → avatar spawns, appears in roster.
roomCbs.add({ x: 3, z: -2, ry: 1, name: 'web-bot' }, 'remote1');
cart.update(0.016);
cart.draw();
assert(
  draws.some(d => d[0] === 'print'),
  'UI text rendered'
);
assert(
  draws.some(d => d[0] === 'rectfill'),
  'UI panels rendered'
);
// Presence: a join toast + a floating name tag for the new peer were drawn.
assert(
  draws.some(d => d[0] === 'print' && String(d[1]).includes('joined')),
  'presence join toast rendered'
);
assert(
  draws.some(d => d[0] === 'print' && String(d[1]) === 'web-bot'),
  'presence name tag rendered (world->screen projection)'
);

// Appearance: our own color was broadcast on connect via a `set` blob.
assert(
  sends.some(s => s.type === 'set' && Number.isFinite((JSON.parse(s.msg.data) || {}).color)),
  'local appearance broadcast on connect (set data)'
);

// Position update from the remote is interpolated toward (no throw, avatar moves).
roomCbs.change({ x: 6, z: -4, ry: 1.5, name: 'web-bot' }, 'remote1');
for (let i = 0; i < 30; i++) cart.update(0.016);

// A remote appearance change recolors that avatar in place.
roomCbs.change({ x: 6, z: -4, ry: 1.5, name: 'web-bot', data: '{"color":4294923366}' }, 'remote1');
assert(
  draws.some(d => d[0] === 'material'),
  'remote appearance change recolors avatar (setMeshMaterial)'
);

// Local movement (KeyW held) sends pos3.
keyState = true; // every key() returns true → forward+turn; good enough to move
cart.update(0.05);
keyState = false;
assert(
  sends.some(s => s.type === 'pos3'),
  'local movement sent pos3'
);

// Inbound chat is captured and shown.
assert(typeof roomCbs['msg:event'] === 'function', 'event relay subscribed');
roomCbs['msg:event']({ from: 'remote1', type: 'chat', msg: { text: 'hello world' } });
draws.length = 0;
cart.draw();
assert(
  draws.some(d => d[0] === 'print' && String(d[1]).includes('hello world')),
  'chat message rendered'
);

console.log(
  'PASS metaverse: world+net+roster+movement(pos3)+chat wired; %d draw ops',
  draws.length
);
process.exit(0);
