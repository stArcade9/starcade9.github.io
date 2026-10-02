// Focused geometry test for the web backend's worldToScreen projection (the
// basis for floating name tags). Stubs just enough of nova64 for setCamera, then
// asserts the projection is sane: forward → center, up → higher on screen, and
// left/right offsets are symmetric about the center. Run: node presence.test.mjs

global.nova64 = {
  camera: { setCameraPosition: () => {}, setCameraTarget: () => {}, setCameraFOV: () => {} },
  light: { setAmbientLight: () => {}, setDirectionalLight: () => {} },
  scene: { createPlane: () => 1, createCube: () => 1, setRotation: () => {}, setScale: () => {} },
};

const { createWebBackend } = await import('./core/render-web.js');

const assert = (c, m) => {
  if (!c) {
    console.error('FAIL presence:', m);
    process.exit(1);
  }
};
const near = (a, b, eps, m) => assert(Math.abs(a - b) <= eps, `${m} (got ${a}, want ~${b})`);

const b = createWebBackend();

// Stand at the origin (eye height 1.6) looking straight down +Z.
b.setCamera({ x: 0, z: 0, yaw: 0, pitch: 0, mode: 'first' });

// A point directly ahead at eye height lands at screen center (320,180).
const ahead = b.worldToScreen(0, 1.6, 10);
assert(ahead.visible, 'point ahead is visible');
near(ahead.x, 320, 1, 'forward point → horizontal center');
near(ahead.y, 180, 1, 'forward point → vertical center');
assert(ahead.dist > 0, 'dist is positive in front of camera');

// Raising the point moves its projection UP the screen (smaller y).
const high = b.worldToScreen(0, 6, 10);
assert(high.y < ahead.y, 'higher world point projects higher on screen');

// Equal left/right offsets are symmetric about the center.
const right = b.worldToScreen(3, 1.6, 10);
const left = b.worldToScreen(-3, 1.6, 10);
assert(right.visible && left.visible, 'offset points visible');
near(right.x - 320, 320 - left.x, 1, 'left/right offsets symmetric about center');
assert(Math.abs(right.x - 320) > 5, 'horizontal offset actually shifts x');

// A point behind the camera is not visible.
const behind = b.worldToScreen(0, 1.6, -10);
assert(!behind.visible, 'point behind camera is not visible');

// --- Distance fade in the presence plugin -----------------------------------
const { presencePlugin } = await import('./plugins/presence.js');
let curDist = 10;
const drawn = []; // { text, color }
const fadeBackend = {
  worldToScreen: () => ({ x: 320, y: 180, visible: true, dist: curDist }),
  measureText: s => String(s).length * 6,
  drawRect: () => {},
  drawText: (t, _x, _y, color) => drawn.push({ text: String(t), color }),
};
const theme = { fg: 0xffffffff, accent: 0xff66ffcc, dim: 0xffaab0cc, lineH: 12 };
const ctx = {
  theme,
  others: new Map([['p1', { x: 0, z: 0, name: 'Bob' }]]),
  local: { x: 0, z: 0, mode: 'first' }, // first-person → only the peer tag draws
  me: () => ({}),
  displayName: () => 'me',
};
const plug = presencePlugin();
const alphaAt = dist => {
  curDist = dist;
  drawn.length = 0;
  plug.renderUI(ctx).forEach(n => n.paint({ backend: fadeBackend, theme }, 0, 0, []));
  const tag = drawn.find(d => d.text === 'Bob');
  return tag ? (tag.color >>> 24) & 0xff : null;
};
const aNear = alphaAt(10);
const aFar = alphaAt(40);
assert(aNear != null && aFar != null, 'name tag drawn at near and far');
assert(aNear > aFar, 'near tag is more opaque than a far one');
assert(aFar >= 1, 'far tag keeps a visible floor (not fully transparent)');
assert(alphaAt(100) === null, 'tags beyond cull distance are not drawn');

console.log('PASS presence: projection geometry + distance fade (near>far, floor, cull)');
process.exit(0);
