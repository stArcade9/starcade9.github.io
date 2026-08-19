// Movement test for the metaverse: drive the real cart with mocked input and
// assert (1) walking changes position + sends pos3, (2) movement is suppressed
// while the chat input is focused (the "hang" the user saw on Godot), (3) it
// resumes after, and (4) a local avatar exists and shows in third-person.
const sends = [];
const visCalls = []; // [meshId, visible]
let meshId = 0;
let pressed = new Set();
let gdtextFocused = false;
let cam = { x: 0, y: 0, z: 0 };
const roomCbs = {};

function makeRoom() {
  return {
    sessionId: 'self',
    onPlayerAdd: cb => (roomCbs.add = cb),
    onPlayerChange: cb => (roomCbs.change = cb),
    onPlayerRemove: cb => (roomCbs.remove = cb),
    onLeave: cb => (roomCbs.leave = cb),
    onError: cb => (roomCbs.error = cb),
    onMessage: (t, cb) => (roomCbs['msg:' + t] = cb),
    send: (type, msg) => sends.push({ type, msg }),
  };
}

global.nova64 = {
  scene: {
    createPlane: () => ++meshId,
    createCube: () => ++meshId,
    setRotation: () => {},
    setScale: () => {},
    setPosition: () => {},
    destroyMesh: () => {},
    setMeshVisible: (m, v) => visCalls.push([m, v]),
  },
  camera: {
    // Track the eye position — in first-person it equals (local.x, 1.6, local.z),
    // so it's a throttle-free readout of where the player actually is.
    setCameraPosition: (x, y, z) => (cam = { x, y, z }),
    setCameraTarget: () => {},
    setCameraFOV: () => {},
  },
  light: { setAmbientLight: () => {}, setDirectionalLight: () => {} },
  draw: { rectfill: () => {}, print: () => {}, circle: () => {}, rgba8: () => 0 },
  input: {
    key: code => pressed.has(code),
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
  // Simulate Godot's native text input; we control its focus to test suppression.
  gdtext: { mount: () => ({ ok: true }), poll: () => ({ lines: [], focused: gdtextFocused }), focus: () => {} },
};

const tick = () => new Promise(r => setTimeout(r, 0));
const assert = (c, m) => {
  if (!c) {
    console.error('FAIL movement:', m);
    process.exit(1);
  }
};
const run = n => {
  for (let i = 0; i < n; i++) cart.update(0.05);
};

const cart = await import('./code.js');
cart.init();
await tick();
await tick();
run(1); // one frame so the camera reflects the start position

// Local avatar created (floor + pillars + beacon + the local cube).
assert(meshId >= 3, 'world + local avatar meshes created');
assert(sends.some(s => s.type === 'pos3'), 'initial pos3 sent on join');

// (1) Walk forward (KeyW). Start is (x0,z6,yaw=PI) → forward is -z, so z drops.
pressed = new Set(['KeyW']);
const z0 = cam.z;
run(6);
assert(cam.z < z0 - 0.5, `KeyW walks forward (camera z ${cam.z} < ${z0})`);

// (2) Focus the chat input → movement suppressed. (1-frame lag: chat sets
// ctx.typing after controls read it, so step twice before sampling.)
gdtextFocused = true;
run(2);
const a = { x: cam.x, z: cam.z };
run(6);
assert(a.x === cam.x && a.z === cam.z, 'movement suppressed while typing');

// (3) Unfocus → movement resumes.
gdtextFocused = false;
run(2);
const c0 = { x: cam.x, z: cam.z };
run(6);
assert(c0.x !== cam.x || c0.z !== cam.z, 'movement resumes after typing');
pressed = new Set();

// (4) Toggle to third-person (KeyC edge) → local avatar becomes visible.
pressed = new Set(['KeyC']);
cart.update(0.05);
pressed = new Set();
cart.update(0.05);
run(1);
assert(
  visCalls.some(v => v[1] === true),
  'local avatar shown in third-person'
);

console.log('PASS movement: walk + pos3, typing-suppression, resume, third-person avatar');
process.exit(0);
