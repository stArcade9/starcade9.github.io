// Generative Art Studio — Nova64 Fantasy Console
// 14 interactive Processing-style sketches. Press LEFT/RIGHT to switch.
// All rendering happens in draw() (framebuffer is cleared between update & draw).

const {
  circle,
  cls,
  drawGlowTextCentered,
  drawPanel,
  drawRadialGradient,
  drawRect,
  line,
  print,
  printCentered,
  pset,
  rgba8,
} = nova64.draw;
const { createSolidSkybox } = nova64.light;
const { btnp, keyp } = nova64.input;
const { Screen } = nova64.ui;
const {
  arc,
  bezier,
  color,
  ellipse,
  flowField,
  hsb,
  noise,
  noiseSeed,
  popMatrix,
  pushMatrix,
  rotate,
  translate,
} = nova64.util;

let currentSketch = 0;
const SKETCH_COUNT = 14;
const sketchNames = [
  'FLOW FIELD',
  'PERLIN LANDSCAPE',
  'SPIRAL GALAXY',
  'PARTICLE GARDEN',
  'WAVE INTERFERENCE',
  'NEON GEOMETRY',
  'REACTION-DIFFUSION',
  'FRACTAL TREE',
  'VORONOI GLASS',
  'MANDELBROT ZOOM',
  'PARTICLE CLOTH',
  'STRANGE ATTRACTORS',
  'CIRCLE PACKING',
  'PIXEL SORTING',
];

let time = 0;
let particles = [];
let field = null;
let switchCooldown = 0;
let started = false;

// ─── Shared state ──────────────────────────────────────────────────────────
const W = 640;
const H = 360;

export function init() {
  createSolidSkybox(0x000000);
  noiseSeed(42);
  _initSketch(currentSketch);
}

// ─── UPDATE: state/logic only, NO drawing ─────────────────────────────────
export function update(dt) {
  if (!started) {
    if (btnp(4) || btnp(5) || keyp('Space') || keyp('Enter')) {
      started = true;
    }
    return;
  }

  time += dt;
  switchCooldown -= dt;

  // Switch sketches
  if ((keyp('ArrowRight') || btnp(1)) && switchCooldown <= 0) {
    currentSketch = (currentSketch + 1) % SKETCH_COUNT;
    _initSketch(currentSketch);
    switchCooldown = 0.3;
  }
  if ((keyp('ArrowLeft') || btnp(0)) && switchCooldown <= 0) {
    currentSketch = (currentSketch - 1 + SKETCH_COUNT) % SKETCH_COUNT;
    _initSketch(currentSketch);
    switchCooldown = 0.3;
  }

  // Update state (physics, particles) — no drawing
  switch (currentSketch) {
    case 0:
      _updateFlowField(dt);
      break;
    case 1:
      _updatePerlinLandscape(dt);
      break;
    case 3:
      _updateParticleGarden(dt);
      break;
    case 6:
      _updateReactionDiffusion(dt);
      break;
    case 7:
      _updateFractalTree(dt);
      break;
    case 8:
      _updateVoronoi(dt);
      break;
    case 10:
      _updateParticleCloth(dt);
      break;
    case 11:
      _updateStrangeAttractors(dt);
      break;
    case 12:
      _updateCirclePacking(dt);
      break;
  }
}

// ─── DRAW: all rendering happens here ─────────────────────────────────────
export function draw() {
  if (!started) {
    _drawStartScreen();
    return;
  }

  // Draw current sketch
  switch (currentSketch) {
    case 0:
      _drawFlowField();
      break;
    case 1:
      _drawPerlinLandscape();
      break;
    case 2:
      _drawSpiralGalaxy();
      break;
    case 3:
      _drawParticleGarden();
      break;
    case 4:
      _drawWaveInterference();
      break;
    case 5:
      _drawNeonGeometry();
      break;
    case 6:
      _drawReactionDiffusion();
      break;
    case 7:
      _drawFractalTree();
      break;
    case 8:
      _drawVoronoi();
      break;
    case 9:
      _drawMandelbrot();
      break;
    case 10:
      _drawParticleCloth();
      break;
    case 11:
      _drawStrangeAttractors();
      break;
    case 12:
      _drawCirclePacking();
      break;
    case 13:
      _drawPixelSorting();
      break;
  }

  // HUD on top
  _drawHUD();
}

// ─── Start Screen ─────────────────────────────────────────────────────────
function _drawStartScreen() {
  cls(rgba8(10, 8, 20));

  // Animated background circles
  const t = performance.now() / 1000;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + t * 0.3;
    const r = 80 + Math.sin(t * 0.5 + i) * 30;
    const x = W / 2 + Math.cos(angle) * r;
    const y = H / 2 + Math.sin(angle) * r;
    const hue = (i * 30 + t * 40) % 360;
    ellipse(x, y, 8 + Math.sin(t + i) * 4, 8 + Math.cos(t + i) * 4, hsb(hue, 0.8, 0.6, 80), true);
  }

  drawGlowTextCentered(
    'GENERATIVE ART STUDIO',
    W / 2,
    80,
    rgba8(255, 200, 255),
    rgba8(180, 80, 220)
  );
  drawGlowTextCentered('N O V A 6 4', W / 2, 120, rgba8(100, 200, 255), rgba8(40, 100, 180));

  printCentered('14 interactive Processing-style sketches', W / 2, 170, rgba8(180, 180, 200));
  printCentered(
    'Flow Fields / Perlin / Galaxies / Particles / Waves',
    W / 2,
    195,
    rgba8(140, 160, 200)
  );
  printCentered(
    'Fractals / Voronoi / Mandelbrot / Cloth / Attractors',
    W / 2,
    215,
    rgba8(140, 160, 200)
  );

  const pulse = Math.sin(t * 3) * 0.3 + 0.7;
  const a = Math.floor(pulse * 255);
  printCentered('PRESS SPACE TO BEGIN', W / 2, 280, rgba8(255, 255, 255, a));
  printCentered('LEFT / RIGHT to switch sketches', W / 2, 305, rgba8(120, 120, 150));
}

// ─── HUD ──────────────────────────────────────────────────────────────────
function _drawHUD() {
  const name = sketchNames[currentSketch];
  drawPanel(8, 4, 200, 28, {
    bgColor: rgba8(0, 0, 0, 140),
    borderLight: rgba8(80, 80, 120, 100),
    borderDark: rgba8(40, 40, 60, 100),
  });
  print(`${currentSketch + 1}/${SKETCH_COUNT}  ${name}`, 16, 12, rgba8(200, 200, 255));
  print('[< >] SWITCH', W - 130, H - 18, rgba8(120, 120, 150));
}

// ─── Sketch init ──────────────────────────────────────────────────────────
function _initSketch(idx) {
  time = 0;
  particles = [];
  field = null;

  switch (idx) {
    case 0:
      _initFlowField();
      break;
    case 1:
      _initPerlinLandscape();
      break;
    case 2:
      _initSpiralGalaxy();
      break;
    case 3:
      _initParticleGarden();
      break;
    case 5:
      _initNeonGeometry();
      break;
    case 6:
      _initReactionDiffusion();
      break;
    case 7:
      _initFractalTree();
      break;
    case 8:
      _initVoronoi();
      break;
    case 10:
      _initParticleCloth();
      break;
    case 11:
      _initStrangeAttractors();
      break;
    case 12:
      _initCirclePacking();
      break;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 0: FLOW FIELD
// Particles follow Perlin noise flow vectors. Trail history drawn each frame.
// ════════════════════════════════════════════════════════════════════════════

const FLOW_COLS = 64;
const FLOW_ROWS = 36;
const FLOW_CELL = 10;
const TRAIL_LEN = 12;

function _initFlowField() {
  particles = [];
  for (let i = 0; i < 600; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.5 + Math.random() * 1.5,
      hue: Math.random() * 360,
      life: 200 + Math.random() * 300,
      trail: [],
    });
  }
}

function _updateFlowField(dt) {
  field = flowField(FLOW_COLS, FLOW_ROWS, 0.08, time * 0.15);

  for (const p of particles) {
    const col = Math.floor(p.x / FLOW_CELL);
    const row = Math.floor(p.y / FLOW_CELL);

    if (col >= 0 && col < FLOW_COLS && row >= 0 && row < FLOW_ROWS) {
      const angle = field[row * FLOW_COLS + col];
      // Store trail point before moving
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > TRAIL_LEN) p.trail.shift();

      p.x += Math.cos(angle) * p.speed * 60 * dt;
      p.y += Math.sin(angle) * p.speed * 60 * dt;
      p.hue = (p.hue + 15 * dt) % 360;
      p.life -= dt * 60;
    }

    if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || p.life <= 0) {
      p.x = Math.random() * W;
      p.y = Math.random() * H;
      p.life = 200 + Math.random() * 300;
      p.hue = Math.random() * 360;
      p.trail = [];
    }
  }
}

function _drawFlowField() {
  cls(rgba8(5, 3, 12));

  for (const p of particles) {
    const trail = p.trail;
    for (let j = 1; j < trail.length; j++) {
      const t = j / trail.length;
      const alpha = Math.floor(t * 200);
      const c = hsb(p.hue, 0.85, 0.9, Math.max(15, alpha));
      line(
        Math.round(trail[j - 1].x),
        Math.round(trail[j - 1].y),
        Math.round(trail[j].x),
        Math.round(trail[j].y),
        c
      );
    }
    // Head
    if (trail.length > 0) {
      const last = trail[trail.length - 1];
      const c = hsb(p.hue, 0.9, 1.0, 255);
      line(Math.round(last.x), Math.round(last.y), Math.round(p.x), Math.round(p.y), c);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 1: PERLIN LANDSCAPE
// ════════════════════════════════════════════════════════════════════════════

let landscapeOffset = 0;

function _initPerlinLandscape() {
  landscapeOffset = 0;
}

function _updatePerlinLandscape(dt) {
  landscapeOffset += dt * 30;
}

function _drawPerlinLandscape() {
  cls(rgba8(8, 6, 18));

  const layers = [
    { scale: 0.005, amp: 60, base: 240, color1: [30, 20, 60], color2: [60, 30, 90], speed: 0.2 },
    { scale: 0.008, amp: 80, base: 260, color1: [20, 40, 60], color2: [40, 80, 120], speed: 0.5 },
    { scale: 0.012, amp: 100, base: 280, color1: [30, 60, 40], color2: [60, 140, 80], speed: 0.8 },
    { scale: 0.02, amp: 70, base: 300, color1: [40, 30, 20], color2: [100, 70, 40], speed: 1.0 },
  ];

  // Stars
  noiseSeed(7);
  for (let i = 0; i < 80; i++) {
    const sx = (noise(i * 100) * W * 1.5) % W;
    const sy = noise(i * 200) * 180;
    const brightness = 100 + Math.floor(noise(i * 300 + time * 0.5) * 155);
    pset(Math.round(sx), Math.round(sy), rgba8(brightness, brightness, brightness + 40));
  }
  noiseSeed(42);

  // Moon
  ellipse(500, 60, 25, 25, rgba8(240, 230, 200, 180), true);
  ellipse(506, 57, 22, 22, rgba8(8, 6, 18), true);

  // Mountain layers
  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const L = layers[layerIdx];
    const off = landscapeOffset * L.speed;

    for (let x = 0; x < W; x++) {
      const n = noise((x + off) * L.scale, layerIdx * 100);
      const h = L.base - n * L.amp;

      for (let y = Math.floor(h); y < H; y++) {
        const t = Math.min(1, (y - h) / L.amp);
        const r = L.color1[0] + (L.color2[0] - L.color1[0]) * t;
        const g = L.color1[1] + (L.color2[1] - L.color1[1]) * t;
        const b = L.color1[2] + (L.color2[2] - L.color1[2]) * t;
        pset(x, y, rgba8(r, g, b));
      }
    }
  }

  // Water reflection
  for (let x = 0; x < W; x++) {
    for (let y = H - 30; y < H; y++) {
      const wave = Math.sin(x * 0.05 + time * 2) * 3;
      const alpha = 80 - (y - (H - 30)) * 2;
      if (alpha > 0) pset(x, y, rgba8(20, 40, 80, alpha));
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 2: SPIRAL GALAXY
// ════════════════════════════════════════════════════════════════════════════

let galaxyStars = [];

function _initSpiralGalaxy() {
  galaxyStars = [];
  const cx = W / 2,
    cy = H / 2;

  for (let i = 0; i < 2000; i++) {
    const arm = Math.floor(Math.random() * 4);
    const dist = Math.random() * 160;
    const baseAngle = (arm / 4) * Math.PI * 2;
    const spiralAngle = baseAngle + dist * 0.04;
    const spread = (Math.random() - 0.5) * (dist * 0.15);

    galaxyStars.push({
      dist,
      angle: spiralAngle,
      spread,
      arm,
      hue: 200 + arm * 40 + Math.random() * 30,
      brightness: 0.3 + Math.random() * 0.7,
      size: Math.random() < 0.05 ? 2 : 1,
    });
  }
}

function _drawSpiralGalaxy() {
  cls(rgba8(4, 2, 10));

  const cx = W / 2,
    cy = H / 2;
  const rotSpeed = time * 0.15;

  // Core glow
  drawRadialGradient(cx, cy, 30, rgba8(255, 220, 180, 60), rgba8(255, 220, 180, 0));
  drawRadialGradient(cx, cy, 12, rgba8(255, 240, 220, 120), rgba8(255, 200, 150, 0));

  for (const star of galaxyStars) {
    const angle = star.angle + rotSpeed;
    const wobble = Math.sin(time * 0.5 + star.dist * 0.1) * 2;
    const x = cx + Math.cos(angle) * star.dist + Math.sin(angle) * star.spread + wobble;
    const y = cy + Math.sin(angle) * star.dist * 0.55 + Math.cos(angle) * star.spread * 0.55;

    const alpha = Math.floor(star.brightness * 255 * (1 - star.dist / 200));
    if (alpha < 10) continue;
    const c = hsb(star.hue, 0.6, star.brightness, Math.min(255, alpha));

    if (star.size > 1) {
      pset(Math.round(x), Math.round(y), c);
      pset(Math.round(x + 1), Math.round(y), c);
      pset(Math.round(x), Math.round(y + 1), c);
    } else {
      pset(Math.round(x), Math.round(y), c);
    }
  }

  // Nebula clouds
  for (let i = 0; i < 5; i++) {
    const na = (i / 5) * Math.PI * 2 + time * 0.08;
    const nd = 80 + Math.sin(time * 0.3 + i) * 20;
    const nx = cx + Math.cos(na) * nd;
    const ny = cy + Math.sin(na) * nd * 0.55;
    const hue = (200 + i * 60 + time * 10) % 360;
    drawRadialGradient(nx, ny, 25, hsb(hue, 0.7, 0.4, 25), hsb(hue, 0.3, 0.1, 0));
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 3: PARTICLE GARDEN
// ════════════════════════════════════════════════════════════════════════════

let emitters = [];

function _initParticleGarden() {
  particles = [];
  emitters = [
    { x: W * 0.2, y: H * 0.7, hue: 120, type: 'fountain' },
    { x: W * 0.5, y: H * 0.5, hue: 280, type: 'spiral' },
    { x: W * 0.8, y: H * 0.7, hue: 30, type: 'fountain' },
    { x: W * 0.35, y: H * 0.3, hue: 200, type: 'burst' },
    { x: W * 0.65, y: H * 0.3, hue: 340, type: 'burst' },
  ];
}

function _updateParticleGarden(dt) {
  // Spawn from emitters
  for (const em of emitters) {
    if (particles.length < 1500) {
      for (let i = 0; i < 3; i++) {
        const p = {
          x: em.x,
          y: em.y,
          life: 120 + Math.random() * 180,
          maxLife: 0,
          hue: em.hue + (Math.random() - 0.5) * 40,
        };
        p.maxLife = p.life;

        if (em.type === 'fountain') {
          p.vx = (Math.random() - 0.5) * 40;
          p.vy = -80 - Math.random() * 60;
          p.gravity = 50;
        } else if (em.type === 'spiral') {
          const a = Math.random() * Math.PI * 2;
          const spd = 20 + Math.random() * 30;
          p.vx = Math.cos(a) * spd;
          p.vy = Math.sin(a) * spd;
          p.gravity = 0;
          p.spiral = 2 + Math.random();
        } else {
          const a = Math.random() * Math.PI * 2;
          const spd = 30 + Math.random() * 50;
          p.vx = Math.cos(a) * spd;
          p.vy = Math.sin(a) * spd;
          p.gravity = 15;
        }
        particles.push(p);
      }
    }
  }

  // Update physics
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt * 60;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    if (p.spiral) {
      const angle = Math.atan2(p.vy, p.vx) + p.spiral * dt;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    }
    if (p.gravity) p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

function _drawParticleGarden() {
  cls(rgba8(5, 8, 5));

  for (const p of particles) {
    const t = p.life / p.maxLife;
    const alpha = Math.floor(t * 220);
    const brightness = 0.5 + t * 0.5;
    const c = hsb(p.hue, 0.8, brightness, Math.max(10, alpha));
    pset(Math.round(p.x), Math.round(p.y), c);

    if (t > 0.7) {
      pset(
        Math.round(p.x + 1),
        Math.round(p.y),
        hsb(p.hue, 0.5, brightness, Math.floor(alpha * 0.3))
      );
      pset(
        Math.round(p.x - 1),
        Math.round(p.y),
        hsb(p.hue, 0.5, brightness, Math.floor(alpha * 0.3))
      );
    }
  }

  // Emitter markers
  for (const em of emitters) {
    ellipse(Math.round(em.x), Math.round(em.y), 4, 4, hsb(em.hue, 0.6, 0.4, 100), true);
  }

  line(0, Math.floor(H * 0.75), W, Math.floor(H * 0.75), rgba8(30, 50, 30, 100));
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 4: WAVE INTERFERENCE
// ════════════════════════════════════════════════════════════════════════════

function _drawWaveInterference() {
  cls(rgba8(0, 0, 0));

  const sources = [
    { x: W * 0.3, y: H * 0.4, freq: 0.04, phase: time * 3 },
    { x: W * 0.7, y: H * 0.4, freq: 0.035, phase: time * 2.5 + 1 },
    { x: W * 0.5, y: H * 0.7, freq: 0.045, phase: time * 3.5 + 2 },
  ];

  // Sample every 2 pixels for performance
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      let val = 0;
      for (const src of sources) {
        const dx = x - src.x;
        const dy = y - src.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        val += Math.sin(d * src.freq - src.phase);
      }
      val = (val + 3) / 6;

      const hue = val * 270;
      const brightness = 0.3 + val * 0.6;
      const c = hsb(hue, 0.9, brightness);

      pset(x, y, c);
      pset(x + 1, y, c);
      pset(x, y + 1, c);
      pset(x + 1, y + 1, c);
    }
  }

  for (const src of sources) {
    ellipse(Math.round(src.x), Math.round(src.y), 4, 4, rgba8(255, 255, 255, 200), true);
    ellipse(Math.round(src.x), Math.round(src.y), 8, 8, rgba8(255, 255, 255, 80), false);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 5: NEON GEOMETRY
// ════════════════════════════════════════════════════════════════════════════

let geoShapes = [];

function _initNeonGeometry() {
  geoShapes = [];
  for (let i = 0; i < 8; i++) {
    geoShapes.push({
      cx: W * 0.2 + Math.random() * W * 0.6,
      cy: H * 0.2 + Math.random() * H * 0.6,
      type: ['ellipse', 'bezier', 'spiral', 'arc'][Math.floor(Math.random() * 4)],
      size: 20 + Math.random() * 60,
      hue: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 2,
      pulseSpeed: 1 + Math.random() * 2,
    });
  }
}

function _drawNeonGeometry() {
  cls(rgba8(4, 2, 8));

  // Connecting lines first (behind shapes)
  for (let i = 0; i < geoShapes.length; i++) {
    for (let j = i + 1; j < geoShapes.length; j++) {
      const a = geoShapes[i],
        b = geoShapes[j];
      const d = Math.sqrt((a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2);
      if (d < 200) {
        const alpha = Math.floor((1 - d / 200) * 40);
        line(
          Math.round(a.cx),
          Math.round(a.cy),
          Math.round(b.cx),
          Math.round(b.cy),
          rgba8(100, 80, 160, alpha)
        );
      }
    }
  }

  for (const shape of geoShapes) {
    const pulsing = 0.6 + Math.sin(time * shape.pulseSpeed) * 0.4;
    const s = shape.size * pulsing;
    const hue = (shape.hue + time * 20) % 360;
    const c = hsb(hue, 0.9, 0.9, 200);
    const glow = hsb(hue, 0.6, 0.5, 60);

    pushMatrix();
    translate(shape.cx, shape.cy);
    rotate(time * shape.rotSpeed);

    switch (shape.type) {
      case 'ellipse':
        ellipse(0, 0, s, s * 0.6, glow, true);
        ellipse(0, 0, s, s * 0.6, c, false);
        break;
      case 'bezier':
        bezier(-s, 0, -s * 0.5, -s, s * 0.5, s, s, 0, c, 40);
        bezier(-s, 0, -s * 0.5, s, s * 0.5, -s, s, 0, glow, 40);
        break;
      case 'spiral':
        for (let i = 0; i < 200; i++) {
          const t = i / 200;
          const a = t * Math.PI * 6;
          const r = t * s;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          const sc = hsb((hue + t * 120) % 360, 0.9, 0.8, Math.floor(200 * (1 - t * 0.5)));
          pset(Math.round(px), Math.round(py), sc);
        }
        break;
      case 'arc':
        arc(0, 0, s, s * 0.7, time, time + Math.PI * 1.5, c, false);
        arc(0, 0, s * 0.6, s * 0.4, -time, -time + Math.PI, glow, false);
        break;
    }

    popMatrix();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 6: REACTION-DIFFUSION (Gray-Scott Model)
// Chemical-like patterns emerge from two virtual substances reacting.
// ════════════════════════════════════════════════════════════════════════════

let rdGridA, rdGridB, rdNextA, rdNextB;
const RD_W = 160,
  RD_H = 90;
const RD_SCALE = 4;

function _initReactionDiffusion() {
  rdGridA = new Float32Array(RD_W * RD_H).fill(1.0);
  rdGridB = new Float32Array(RD_W * RD_H).fill(0.0);
  rdNextA = new Float32Array(RD_W * RD_H);
  rdNextB = new Float32Array(RD_W * RD_H);
  // Seed circles of substance B
  for (let s = 0; s < 8; s++) {
    const cx = Math.floor(Math.random() * RD_W);
    const cy = Math.floor(Math.random() * RD_H);
    const r = 3 + Math.floor(Math.random() * 4);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const x = (cx + dx + RD_W) % RD_W;
          const y = (cy + dy + RD_H) % RD_H;
          rdGridB[y * RD_W + x] = 1.0;
        }
      }
    }
  }
}

function _updateReactionDiffusion(_dt) {
  const dA = 1.0,
    dB = 0.5;
  const feed = 0.055,
    kill = 0.062;
  for (let y = 0; y < RD_H; y++) {
    for (let x = 0; x < RD_W; x++) {
      const i = y * RD_W + x;
      const a = rdGridA[i],
        b = rdGridB[i];
      // Laplacian with wrapping
      const lx = (x - 1 + RD_W) % RD_W,
        rx = (x + 1) % RD_W;
      const ty = (y - 1 + RD_H) % RD_H,
        by = (y + 1) % RD_H;
      const lapA =
        rdGridA[ty * RD_W + x] +
        rdGridA[by * RD_W + x] +
        rdGridA[y * RD_W + lx] +
        rdGridA[y * RD_W + rx] -
        4 * a;
      const lapB =
        rdGridB[ty * RD_W + x] +
        rdGridB[by * RD_W + x] +
        rdGridB[y * RD_W + lx] +
        rdGridB[y * RD_W + rx] -
        4 * b;
      const abb = a * b * b;
      rdNextA[i] = Math.min(1, Math.max(0, a + dA * lapA - abb + feed * (1 - a)));
      rdNextB[i] = Math.min(1, Math.max(0, b + dB * lapB + abb - (kill + feed) * b));
    }
  }
  [rdGridA, rdNextA] = [rdNextA, rdGridA];
  [rdGridB, rdNextB] = [rdNextB, rdGridB];
}

function _drawReactionDiffusion() {
  cls(rgba8(5, 5, 15));
  for (let y = 0; y < RD_H; y++) {
    for (let x = 0; x < RD_W; x++) {
      const b = rdGridB[y * RD_W + x];
      if (b > 0.05) {
        const v = Math.min(1, b * 2);
        const r = Math.floor(20 + v * 50);
        const g = Math.floor(80 + v * 175);
        const bl = Math.floor(120 + v * 135);
        drawRect(x * RD_SCALE, y * RD_SCALE, RD_SCALE, RD_SCALE, rgba8(r, g, bl));
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 7: FRACTAL TREE
// L-system branches with wind sway and seasonal color.
// ════════════════════════════════════════════════════════════════════════════

let treeBranches = [];
let treeWind = 0;
let treeSeason = 0; // 0=spring, 1=summer, 2=autumn, 3=winter

function _initFractalTree() {
  treeBranches = [];
  treeSeason = Math.floor(Math.random() * 4);
  _buildTree(W / 2, H - 20, -Math.PI / 2, 70, 8, 0);
}

function _buildTree(x, y, angle, len, depth, branchIdx) {
  if (depth <= 0 || len < 3) return;
  const ex = x + Math.cos(angle) * len;
  const ey = y + Math.sin(angle) * len;
  treeBranches.push({ x1: x, y1: y, x2: ex, y2: ey, depth, len, angle, isLeaf: depth <= 2 });
  const spread = 0.4 + Math.random() * 0.3;
  const shrink = 0.65 + Math.random() * 0.1;
  _buildTree(ex, ey, angle - spread, len * shrink, depth - 1, branchIdx * 2);
  _buildTree(ex, ey, angle + spread, len * shrink, depth - 1, branchIdx * 2 + 1);
  if (depth > 3 && Math.random() < 0.3) {
    _buildTree(
      ex,
      ey,
      angle + (Math.random() - 0.5) * 0.8,
      len * shrink * 0.8,
      depth - 2,
      branchIdx * 3
    );
  }
}

function _updateFractalTree(dt) {
  treeWind = Math.sin(time * 0.8) * 0.03 + Math.sin(time * 2.1) * 0.01;
}

function _drawFractalTree() {
  const seasonColors = [
    [rgba8(60, 140, 60), rgba8(100, 200, 80), rgba8(255, 180, 200)], // spring
    [rgba8(30, 120, 30), rgba8(50, 180, 50), rgba8(80, 200, 60)], // summer
    [rgba8(180, 100, 30), rgba8(220, 160, 40), rgba8(200, 60, 30)], // autumn
    [rgba8(140, 140, 160), rgba8(180, 180, 200), rgba8(220, 220, 240)], // winter
  ];
  const sc = seasonColors[treeSeason];
  cls(rgba8(15, 10, 25));

  for (const b of treeBranches) {
    const windOffset = treeWind * (8 - b.depth) * 3;
    const x2 = b.x2 + windOffset;
    const thickness = Math.max(1, b.depth - 1);
    if (b.isLeaf) {
      circle(Math.round(x2), Math.round(b.y2), 2 + Math.sin(time + b.angle * 5) * 1, sc[1]);
      if (treeSeason === 0) {
        // spring blossoms
        circle(Math.round(x2 + Math.sin(time * 2 + b.angle) * 3), Math.round(b.y2 - 2), 1, sc[2]);
      }
    } else {
      const c = b.depth > 4 ? rgba8(80, 50, 30) : sc[0];
      for (let t = 0; t < thickness; t++) {
        line(
          Math.round(b.x1 + windOffset * 0.5 + t * 0.3),
          Math.round(b.y1),
          Math.round(x2 + t * 0.3),
          Math.round(b.y2),
          c
        );
      }
    }
  }

  // Ground
  drawRect(0, H - 20, W, 20, rgba8(40, 30, 20));
  const seasonName = ['Spring', 'Summer', 'Autumn', 'Winter'][treeSeason];
  print(seasonName, W - 80, H - 35, rgba8(180, 180, 200));
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 8: VORONOI STAINED GLASS
// Drifting seed points create jewel-tone colored cells.
// ════════════════════════════════════════════════════════════════════════════

let voronoiSeeds = [];
const VOR_COUNT = 24;
const VOR_SCALE = 8; // render at lower res for performance

function _initVoronoi() {
  voronoiSeeds = [];
  for (let i = 0; i < VOR_COUNT; i++) {
    voronoiSeeds.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      hue: Math.floor(Math.random() * 360),
    });
  }
}

function _updateVoronoi(dt) {
  for (const s of voronoiSeeds) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x < 0 || s.x > W) s.vx *= -1;
    if (s.y < 0 || s.y > H) s.vy *= -1;
    s.x = Math.max(0, Math.min(W, s.x));
    s.y = Math.max(0, Math.min(H, s.y));
    s.hue = (s.hue + dt * 5) % 360;
  }
}

function _drawVoronoi() {
  cls(rgba8(10, 10, 20));
  const rw = Math.ceil(W / VOR_SCALE),
    rh = Math.ceil(H / VOR_SCALE);
  for (let py = 0; py < rh; py++) {
    for (let px = 0; px < rw; px++) {
      const wx = px * VOR_SCALE + VOR_SCALE / 2;
      const wy = py * VOR_SCALE + VOR_SCALE / 2;
      let minD = Infinity,
        minD2 = Infinity,
        minI = 0;
      for (let i = 0; i < voronoiSeeds.length; i++) {
        const d = (wx - voronoiSeeds[i].x) ** 2 + (wy - voronoiSeeds[i].y) ** 2;
        if (d < minD) {
          minD2 = minD;
          minD = d;
          minI = i;
        } else if (d < minD2) {
          minD2 = d;
        }
      }
      const edge = Math.sqrt(minD2) - Math.sqrt(minD);
      const s = voronoiSeeds[minI];
      if (edge < 3) {
        drawRect(px * VOR_SCALE, py * VOR_SCALE, VOR_SCALE, VOR_SCALE, rgba8(20, 15, 10));
      } else {
        const bright = 0.5 + 0.5 * Math.min(1, edge / 30);
        const c = hsb(s.hue, 0.7, bright);
        drawRect(px * VOR_SCALE, py * VOR_SCALE, VOR_SCALE, VOR_SCALE, c);
      }
    }
  }
  // Draw seed points
  for (const s of voronoiSeeds) {
    circle(Math.round(s.x), Math.round(s.y), 2, rgba8(255, 255, 255, 150));
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 9: MANDELBROT ZOOM
// Deep zoom with smooth iteration coloring and palette cycling.
// ════════════════════════════════════════════════════════════════════════════

const MB_W = 160,
  MB_H = 90,
  MB_SCALE = 4;
const MB_ITER = 80;

function _drawMandelbrot() {
  const zoom = Math.pow(1.5, time * 0.4);
  const cx = -0.7436439 + (Math.sin(time * 0.1) * 0.001) / zoom;
  const cy = 0.1318259 + (Math.cos(time * 0.1) * 0.001) / zoom;
  const scale = 3.0 / zoom;

  for (let py = 0; py < MB_H; py++) {
    for (let px = 0; px < MB_W; px++) {
      const x0 = cx + (px / MB_W - 0.5) * scale * (W / H);
      const y0 = cy + (py / MB_H - 0.5) * scale;
      let x = 0,
        y = 0,
        iter = 0;
      while (x * x + y * y < 4 && iter < MB_ITER) {
        const xt = x * x - y * y + x0;
        y = 2 * x * y + y0;
        x = xt;
        iter++;
      }
      if (iter < MB_ITER) {
        // Smooth coloring
        const smooth = iter - Math.log2(Math.log2(x * x + y * y));
        const hue = (smooth * 8 + time * 30) % 360;
        const c = hsb(hue, 0.85, 0.5 + 0.5 * Math.sin(smooth * 0.3));
        drawRect(px * MB_SCALE, py * MB_SCALE, MB_SCALE, MB_SCALE, c);
      }
    }
  }
  // Zoom indicator
  print('Zoom: ' + zoom.toFixed(1) + 'x', 10, H - 30, rgba8(200, 200, 200));
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 10: PARTICLE CLOTH
// Verlet integration 25x15 cloth with spring constraints.
// ════════════════════════════════════════════════════════════════════════════

let clothNodes, clothLinks;
const CLOTH_W = 25,
  CLOTH_H = 15,
  CLOTH_REST = 16;

function _initParticleCloth() {
  clothNodes = [];
  clothLinks = [];
  const ox = (W - CLOTH_W * CLOTH_REST) / 2;
  const oy = 40;
  for (let y = 0; y < CLOTH_H; y++) {
    for (let x = 0; x < CLOTH_W; x++) {
      clothNodes.push({
        x: ox + x * CLOTH_REST,
        y: oy + y * CLOTH_REST,
        px: ox + x * CLOTH_REST,
        py: oy + y * CLOTH_REST,
        pinned: y === 0 && x % 4 === 0,
      });
    }
  }
  // Horizontal + vertical links
  for (let y = 0; y < CLOTH_H; y++) {
    for (let x = 0; x < CLOTH_W; x++) {
      const i = y * CLOTH_W + x;
      if (x < CLOTH_W - 1) clothLinks.push({ a: i, b: i + 1 });
      if (y < CLOTH_H - 1) clothLinks.push({ a: i, b: i + CLOTH_W });
    }
  }
}

function _updateParticleCloth(dt) {
  const gravity = 200;
  const windX = Math.sin(time * 1.5) * 80;
  const windY = Math.cos(time * 0.7) * 20;
  const damp = 0.99;

  // Verlet integration
  for (const n of clothNodes) {
    if (n.pinned) continue;
    const vx = (n.x - n.px) * damp + windX * dt * dt;
    const vy = (n.y - n.py) * damp + gravity * dt * dt + windY * dt * dt;
    n.px = n.x;
    n.py = n.y;
    n.x += vx;
    n.y += vy;
  }
  // Constraint solving (3 iterations)
  for (let iter = 0; iter < 3; iter++) {
    for (const l of clothLinks) {
      const a = clothNodes[l.a],
        b = clothNodes[l.b];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.001) continue;
      const diff = ((CLOTH_REST - dist) / dist) * 0.5;
      const ox = dx * diff,
        oy = dy * diff;
      if (!a.pinned) {
        a.x -= ox;
        a.y -= oy;
      }
      if (!b.pinned) {
        b.x += ox;
        b.y += oy;
      }
    }
  }
}

function _drawParticleCloth() {
  cls(rgba8(10, 15, 30));
  // Draw links as colored lines
  for (const l of clothLinks) {
    const a = clothNodes[l.a],
      b = clothNodes[l.b];
    const stress =
      Math.abs(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) - CLOTH_REST) / CLOTH_REST;
    const hue = Math.min(1, stress * 3) * 60;
    const c = hsb(200 - hue, 0.7, 0.8);
    line(Math.round(a.x), Math.round(a.y), Math.round(b.x), Math.round(b.y), c);
  }
  // Draw pin points
  for (const n of clothNodes) {
    if (n.pinned) circle(Math.round(n.x), Math.round(n.y), 3, rgba8(255, 100, 100));
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 11: STRANGE ATTRACTORS
// Lorenz attractor — 3D point trail projected to 2D.
// ════════════════════════════════════════════════════════════════════════════

let attractorTrail = [];
let attrX, attrY, attrZ;

function _initStrangeAttractors() {
  attractorTrail = [];
  attrX = 0.1;
  attrY = 0;
  attrZ = 0;
}

function _updateStrangeAttractors(dt) {
  const sigma = 10,
    rho = 28,
    beta = 8 / 3;
  const steps = 8;
  const h = 0.005;
  for (let s = 0; s < steps; s++) {
    const dx = sigma * (attrY - attrX);
    const dy = attrX * (rho - attrZ) - attrY;
    const dz = attrX * attrY - beta * attrZ;
    attrX += dx * h;
    attrY += dy * h;
    attrZ += dz * h;
    const speed = Math.sqrt(dx * dx + dy * dy + dz * dz);
    attractorTrail.push({ x: attrX, y: attrY, z: attrZ, speed });
  }
  if (attractorTrail.length > 3000) attractorTrail.splice(0, attractorTrail.length - 3000);
}

function _drawStrangeAttractors() {
  cls(rgba8(5, 5, 15));
  const rotAngle = time * 0.2;
  const cosR = Math.cos(rotAngle),
    sinR = Math.sin(rotAngle);
  const scale = 6;
  const ox = W / 2,
    oy = H / 2 + 40;

  for (let i = 1; i < attractorTrail.length; i++) {
    const p0 = attractorTrail[i - 1],
      p1 = attractorTrail[i];
    // Rotate around Y axis
    const x0 = (p0.x * cosR - p0.z * sinR) * scale + ox;
    const y0 = -(p0.y - 25) * scale + oy;
    const x1 = (p1.x * cosR - p1.z * sinR) * scale + ox;
    const y1 = -(p1.y - 25) * scale + oy;
    const alpha = i / attractorTrail.length;
    const speed = Math.min(1, p1.speed / 40);
    const hue = (speed * 180 + 200) % 360;
    const c = hsb(hue, 0.8, 0.4 + alpha * 0.6, Math.floor(alpha * 255));
    line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), c);
  }
  print('Lorenz Attractor', 10, H - 30, rgba8(150, 150, 180));
  print('Points: ' + attractorTrail.length, 10, H - 18, rgba8(100, 100, 130));
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 12: CIRCLE PACKING
// Progressively fill space with non-overlapping growing circles.
// ════════════════════════════════════════════════════════════════════════════

let cpCircles = [];
let cpAttempts = 0;
const CP_MAX_ATTEMPTS = 200;

function _initCirclePacking() {
  cpCircles = [];
  cpAttempts = 0;
}

function _updateCirclePacking(_dt) {
  // Try to place new circles
  for (let t = 0; t < 20; t++) {
    if (cpAttempts > 5000) break;
    cpAttempts++;
    const x = Math.random() * W;
    const y = Math.random() * H;
    let valid = true;
    for (const c of cpCircles) {
      const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2);
      if (d < c.r + 3) {
        valid = false;
        break;
      }
    }
    if (valid) {
      cpCircles.push({
        x,
        y,
        r: 2,
        growing: true,
        hue: (cpCircles.length * 17) % 360,
      });
    }
  }
  // Grow circles
  for (const c of cpCircles) {
    if (!c.growing) continue;
    c.r += 0.3;
    if (c.x - c.r < 0 || c.x + c.r > W || c.y - c.r < 0 || c.y + c.r > H) {
      c.growing = false;
      continue;
    }
    for (const other of cpCircles) {
      if (other === c) continue;
      const d = Math.sqrt((c.x - other.x) ** 2 + (c.y - other.y) ** 2);
      if (d < c.r + other.r + 1) {
        c.growing = false;
        break;
      }
    }
  }
}

function _drawCirclePacking() {
  cls(rgba8(8, 8, 18));
  for (const c of cpCircles) {
    const bright = c.growing ? 0.8 : 0.5;
    const fill = hsb(c.hue, 0.6, bright * 0.3);
    const stroke = hsb(c.hue, 0.7, bright);
    // Fill
    circle(Math.round(c.x), Math.round(c.y), Math.round(c.r), fill, true);
    // Outline
    circle(Math.round(c.x), Math.round(c.y), Math.round(c.r), stroke, false);
  }
  print('Circles: ' + cpCircles.length, 10, H - 18, rgba8(150, 150, 180));
}

// ════════════════════════════════════════════════════════════════════════════
// SKETCH 13: PIXEL SORTING
// Glitch-art: generates pattern then sorts pixel bands by brightness.
// ════════════════════════════════════════════════════════════════════════════

function _drawPixelSorting() {
  const PS_W = 160,
    PS_H = 90,
    PS_S = 4;
  // Generate base pattern (gradient + noise bands)
  const px = [];
  for (let y = 0; y < PS_H; y++) {
    const row = [];
    for (let x = 0; x < PS_W; x++) {
      const wave = Math.sin(x * 0.1 + time * 0.5) * Math.cos(y * 0.08 + time * 0.3);
      const diag = Math.sin((x + y) * 0.05 + time * 0.2);
      const v = (wave + diag + 1) / 3;
      const hue = ((x + y) * 2 + time * 40) % 360;
      const bright = 0.3 + v * 0.7;
      row.push({ hue, sat: 0.8, bright });
    }
    px.push(row);
  }

  // Sort bands by brightness (glitch effect)
  const bandHeight = 3 + Math.floor(Math.abs(Math.sin(time * 0.7)) * 6);
  const threshold = 0.3 + Math.sin(time * 0.5) * 0.2;
  for (let y = 0; y < PS_H; y++) {
    if (Math.floor(y / bandHeight) % 2 === 0) continue;
    // Find spans above threshold and sort them
    let start = -1;
    for (let x = 0; x <= PS_W; x++) {
      const above = x < PS_W && px[y][x].bright > threshold;
      if (above && start === -1) start = x;
      if ((!above || x === PS_W) && start !== -1) {
        // Sort span by brightness
        const span = px[y].slice(start, x);
        span.sort((a, b) => a.bright - b.bright);
        for (let i = 0; i < span.length; i++) px[y][start + i] = span[i];
        start = -1;
      }
    }
  }

  // Render
  for (let y = 0; y < PS_H; y++) {
    for (let x = 0; x < PS_W; x++) {
      const p = px[y][x];
      const c = hsb(p.hue, p.sat, p.bright);
      drawRect(x * PS_S, y * PS_S, PS_S, PS_S, c);
    }
  }
}
