// Focused test for the minimap plugin: it frames a radar in the corner and plots
// self (centered, with a heading pip) + others (offset by world position). Pure
// UI, driven with a mock backend that records draw ops. Run: node minimap.test.mjs

import { minimapPlugin } from './plugins/minimap.js';

const assert = (c, m) => {
  if (!c) {
    console.error('FAIL minimap:', m);
    process.exit(1);
  }
};

const circles = [];
const rects = [];
const backend = {
  viewport: () => ({ w: 640, h: 360 }),
  drawRect: (x, y, w, h, color) => rects.push({ x, y, w, h, color }),
  drawCircle: (x, y, r, color, filled) => circles.push({ x, y, r, color, filled }),
  drawText: () => {},
  measureText: s => String(s).length * 6,
};

const theme = { dim: 0xffaab0cc, accent: 0xff66ffcc, lineH: 12 };

// One other player to the world-east (+x); we face +x (yaw = PI/2 → sin=1).
const others = new Map([
  ['p1', { x: 20, z: 0, yaw: 0, name: 'Bob', data: '{"color":4294923366}' }],
]);
const ctx = {
  theme,
  others,
  local: { x: 0, z: 0, yaw: Math.PI / 2, mode: 'first' },
  me: () => ({ displayName: 'me' }),
};

const plug = minimapPlugin({ size: 92, margin: 10, range: 40 });
const nodes = plug.renderUI(ctx);
nodes.forEach(n => n.paint({ backend, theme }, 0, 0, []));

// Frame box near the bottom-right corner.
const x0 = 640 - 92 - 10; // 538
const y0 = 360 - 92 - 10; // 258
assert(
  rects.some(r => Math.abs(r.x - (x0 - 2)) < 1 && Math.abs(r.y - (y0 - 2)) < 1),
  'radar frame drawn in the corner'
);

// Self dot ~centered in the box.
const cx = x0 + 46;
const cy = y0 + 46;
const self = circles.find(c => c.color === theme.accent && c.r === 3);
assert(
  self && Math.abs(self.x - cx) < 1 && Math.abs(self.y - cy) < 1,
  'self plotted at box center'
);

// Heading pip offset toward +x (we face yaw=PI/2 → sin=1), so pip.x > self.x.
const pip = circles.find(c => c.color === theme.accent && c.r === 1.5);
assert(
  pip && pip.x > self.x + 5 && Math.abs(pip.y - self.y) < 1,
  'heading pip points the way we face'
);

// Other player plotted to the right of center (world +x), tinted by their color.
const peer = circles.find(c => c.color === 4294923366 >>> 0);
assert(peer && peer.x > cx + 5, 'peer plotted east of center with their color');

console.log('PASS minimap: frame + self(center+heading) + color-tinted peer positioning');
process.exit(0);
