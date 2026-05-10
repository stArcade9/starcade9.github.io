// particle-fireworks — Fireworks burst using createEmitter2D and BM.ADD
// Shows: createEmitter2D, update emitter position, BM.ADD blend mode, burstEmitter2D

const { BM, cls, print, pset, rectfill, screenHeight, screenWidth } = nova64.draw;
const { burstEmitter2D, createEmitter2D, drawEmitter2D, updateEmitter2D } = nova64.fx;

let W = 640,
  H = 360;
let emitters = [];
let launchTimer = 0;
let launchInterval = 1.2;
let time = 0;

const PALETTES = [
  [0xff4444, 0xff8844, 0xffcc44, 0xffffff], // warm
  [0x44aaff, 0x4488ff, 0xaa44ff, 0xffffff], // cool
  [0x44ff88, 0x88ff44, 0xffff44, 0xffffff], // vivid
  [0xff44aa, 0xff4488, 0xff8844, 0xffffff], // pink
];

function _launchFirework() {
  const x = 30 + Math.random() * (W - 60);
  const y = 30 + Math.random() * (H * 0.55);
  const pal = PALETTES[0 | (Math.random() * PALETTES.length)];
  const tint = pal[0 | (Math.random() * pal.length)];

  const em = nova64.fx.createEmitter2D({
    blendMode: BM.ADD,
    x,
    y,
    emitRate: 0, // burst only
    maxParticles: 80,
    life: [0.7, 1.7],
    speed: [20, 100],
    angle: [-Math.PI, Math.PI],
    gravity: 60,
    scale: [0.45, 1.2],
    alpha: [0.8, 1],
    fadeOut: true,
    scaleDown: true,
    tint,
  });

  // Emit a burst
  nova64.fx.burstEmitter2D(em, 80);

  // Trail star rising before burst (simple CSS-like movement hack via tween)
  emitters.push({ em, life: 2.5, x, y });
}

export function init() {
  W = typeof screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
  H = typeof screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
  // First firework immediately
  _launchFirework();
}

export function update(dt) {
  time += dt;
  launchTimer += dt;

  if (launchTimer >= launchInterval) {
    launchTimer = 0;
    launchInterval = 0.8 + Math.random() * 1.4;
    _launchFirework();
  }

  // Prune dead emitters
  emitters = emitters.filter(e => {
    e.life -= dt;
    nova64.fx.updateEmitter2D(e.em, dt);
    return e.life > 0;
  });
}

export function draw() {
  // Fade trail — dark semi-transparent cls for motion blur feel
  nova64.draw.rectfill(0, 0, W, H, 0x0000000d); // very low alpha over-paint (some renderers ignore alpha in cls)
  nova64.draw.cls(0x050510);

  // Draw city silhouette
  nova64.draw.rectfill(0, H - 28, W, 28, 0x0a0a18);
  for (let bx = 0; bx < W; bx += 18 + (bx % 7)) {
    const bh = 20 + ((bx * 13) % 30);
    nova64.draw.rectfill(bx, H - 28 - bh, 14, bh, 0x0e0e22);
    // Windows
    for (let wy = H - 28 - bh + 4; wy < H - 28 - 4; wy += 6) {
      for (let wx = bx + 3; wx < bx + 12; wx += 5) {
        if (Math.sin(bx * 7 + wy * 13) > 0.3) nova64.draw.pset(wx, wy, 0xffee88);
      }
    }
  }

  // Stars
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137 + 3) % W;
    const sy = (i * 97 + 11) % (H - 40);
    const br = 0.5 + 0.5 * Math.sin(time * 2 + i);
    const col = Math.floor(br * 255);
    nova64.draw.pset(sx, sy, (col << 16) | (col << 8) | col);
  }

  // Draw all active emitters (particles layer)
  for (const e of emitters) {
    nova64.fx.drawEmitter2D(e.em);
  }

  nova64.draw.print('FIREWORKS', 4, 4, 0xffffff);
  nova64.draw.print('createEmitter2D • burst • BM.ADD', 4, H - 12, 0x778899);
}
