// Backend selection test: a host-provided Godot/XR backend should be usable
// without changing the cart. The web backend remains registered only as fallback.
const calls = [];

const failWeb = name => () => {
  throw new Error('web backend should not be used: ' + name);
};

const hostBackend = {
  id: 'godot',
  init: world => calls.push(['init', world.size]),
  addAvatar: (id, opts) => calls.push(['addAvatar', id, opts.name]),
  updateAvatar: (id, pose) => calls.push(['updateAvatar', id, pose.x || 0]),
  setAvatarStyle: () => {},
  setAvatarVisible: (id, visible) => calls.push(['visible', id, visible]),
  removeAvatar: id => calls.push(['removeAvatar', id]),
  setCamera: pose => calls.push(['camera', pose.mode]),
  drawRect: (...args) => calls.push(['drawRect', ...args.slice(0, 2)]),
  drawText: text => calls.push(['drawText', text]),
  drawCircle: () => {},
  measureText: text => String(text).length * 6,
  viewport: () => ({ w: 640, h: 360 }),
  worldToScreen: () => ({ x: 320, y: 180, visible: false, dist: 1 }),
};

global.__NOVA64_METAVERSE_BACKEND = () => hostBackend;
global.nova64 = {
  metaverse: {},
  scene: {
    createPlane: failWeb('createPlane'),
    createCube: failWeb('createCube'),
  },
  camera: {
    setCameraPosition: failWeb('setCameraPosition'),
    setCameraTarget: failWeb('setCameraTarget'),
    setCameraFOV: failWeb('setCameraFOV'),
  },
  light: {
    setAmbientLight: failWeb('setAmbientLight'),
    setDirectionalLight: failWeb('setDirectionalLight'),
  },
  draw: {
    rgba8: (r, g, b, a) => ((a << 24) | (r << 16) | (g << 8) | b) >>> 0,
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
  net: {
    isSupported: () => false,
    _tick: () => {},
  },
  auth: { signIn: async (_p, o) => ({ displayName: (o && o.name) || 'me' }) },
  startTextInput: () => {},
  stopTextInput: () => {},
  getTextInput: () => '',
  isTextInputActive: () => false,
};

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL backend-selection:', msg);
    process.exit(1);
  }
};

const cart = await import('./code.js');
cart.init();
cart.update(0.016);
cart.draw();

assert(calls.some(c => c[0] === 'init' && c[1] === 80), 'host backend initialized with world');
assert(calls.some(c => c[0] === 'addAvatar' && c[1] === '__me__'), 'local avatar added through host backend');
assert(calls.some(c => c[0] === 'camera'), 'camera updated through host backend');
assert(calls.some(c => c[0] === 'drawText'), 'UI rendered through host backend');

console.log('PASS backend-selection: host metaverse backend selected over web fallback');
process.exit(0);
