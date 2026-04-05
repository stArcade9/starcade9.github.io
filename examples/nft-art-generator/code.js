// ─── NFT Art Generator — Seed-Deterministic Generative Art ─────────────
// Each seed produces a unique artwork. Same seed = same art, always.
// Styles: Flow Field, Geometric Tiling, Organic Growth, Abstract Composition

const STYLES = ['Flow Field', 'Geometric Tiling', 'Organic Growth', 'Abstract Composition'];
const W = 640,
  H = 360;

let rng, traits, palette;
let currentSeed = 42;
let styleIdx = 0;
let time = 0;
let seedHistory = [];
let historyIdx = -1;

// Style-specific state
let flowField, flowParticles;
let geoShapes;
let growthPoints;
let abstractShapes;

const ART_SCHEMA = {
  style: { values: [0, 1, 2, 3] },
  complexity: { type: 'float', min: 0.3, max: 1.0 },
  speed: { type: 'float', min: 0.3, max: 2.0 },
  symmetry: { type: 'int', min: 1, max: 8 },
  layers: { type: 'int', min: 2, max: 6 },
  curvature: { type: 'float', min: 0.5, max: 3.0 },
  density: { type: 'float', min: 0.4, max: 1.0 },
};

export function init() {
  currentSeed = 42;
  generateArt(currentSeed);
}

export function update(dt) {
  time += dt;

  // N = next random seed
  if (keyp('KeyN')) {
    currentSeed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    pushSeed(currentSeed);
    generateArt(currentSeed);
  }
  // P = previous seed
  if (keyp('KeyP') && historyIdx > 0) {
    historyIdx--;
    currentSeed = seedHistory[historyIdx];
    generateArt(currentSeed);
  }
  // S = cycle style manually
  if (keyp('KeyS')) {
    styleIdx = (styleIdx + 1) % STYLES.length;
    generateArt(currentSeed);
  }
  // M = export metadata
  if (keyp('KeyM')) {
    const meta = exportSeedMetadata(
      currentSeed,
      {
        style: STYLES[styleIdx],
        ...traits,
      },
      {
        name: `Nova64 Art #${currentSeed}`,
        description: `Generative art from seed ${currentSeed}, style: ${STYLES[styleIdx]}`,
        collection: 'Nova64 NFT Art',
      }
    );
    console.log('📋 NFT Art Metadata:\n' + meta);
  }
  // Number keys 1-4 to pick style
  for (let i = 0; i < 4; i++) {
    if (keyp('Digit' + (i + 1))) {
      styleIdx = i;
      generateArt(currentSeed);
    }
  }

  // Update animation
  updateStyle(dt);
}

function pushSeed(seed) {
  historyIdx++;
  seedHistory.length = historyIdx;
  seedHistory.push(seed);
}

function generateArt(seed) {
  rng = createSeedRNG(typeof seed === 'string' ? createSeedFromHash(seed) : seed);
  traits = seedToTraits(typeof seed === 'string' ? createSeedFromHash(seed) : seed, ART_SCHEMA);
  palette = rng.palette(6);
  time = 0;

  switch (styleIdx) {
    case 0:
      initFlowField();
      break;
    case 1:
      initGeometric();
      break;
    case 2:
      initOrganic();
      break;
    case 3:
      initAbstract();
      break;
  }
}

function updateStyle(dt) {
  switch (styleIdx) {
    case 0:
      updateFlowField(dt);
      break;
    case 1:
      updateGeometric(dt);
      break;
    case 2:
      updateOrganic(dt);
      break;
    case 3:
      updateAbstract(dt);
      break;
  }
}

// ─── Flow Field ────────────────────────────────────────────────────────
function initFlowField() {
  const cols = 40,
    rows = 22;
  flowField = new Float32Array(cols * rows);
  const noiseScale = traits.curvature * 0.06;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = x * noiseScale + rng.random() * 0.5;
      const ny = y * noiseScale + rng.random() * 0.5;
      flowField[y * cols + x] =
        (rng.random() - 0.5) * Math.PI * 2 + Math.sin(nx * 3) * Math.cos(ny * 2);
    }
  }
  flowField._cols = cols;
  flowField._rows = rows;

  const numParticles = Math.floor(200 * traits.density);
  flowParticles = [];
  for (let i = 0; i < numParticles; i++) {
    flowParticles.push({
      x: rng.float(0, W),
      y: rng.float(0, H),
      vx: 0,
      vy: 0,
      color: palette[i % palette.length],
      life: rng.float(0.5, 1.0),
      trail: [],
    });
  }
}

function updateFlowField(dt) {
  const cols = flowField._cols,
    rows = flowField._rows;
  const cellW = W / cols,
    cellH = H / rows;
  const speed = traits.speed * 60;

  for (const p of flowParticles) {
    const cx = Math.floor(p.x / cellW);
    const cy = Math.floor(p.y / cellH);
    if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
      const angle = flowField[cy * cols + cx] + time * traits.speed * 0.5;
      p.vx += Math.cos(angle) * speed * dt;
      p.vy += Math.sin(angle) * speed * dt;
    }
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 30) p.trail.shift();

    // Wrap
    if (p.x < 0) p.x += W;
    if (p.x > W) p.x -= W;
    if (p.y < 0) p.y += H;
    if (p.y > H) p.y -= H;
  }
}

// ─── Geometric Tiling ──────────────────────────────────────────────────
function initGeometric() {
  const count = Math.floor(30 * traits.density + 10);
  geoShapes = [];
  const sym = traits.symmetry;
  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2;
    for (let s = 0; s < sym; s++) {
      const angle = baseAngle + (s * Math.PI * 2) / sym;
      const dist = rng.float(30, 150);
      geoShapes.push({
        cx: W / 2 + Math.cos(angle) * dist,
        cy: H / 2 + Math.sin(angle) * dist,
        size: rng.float(10, 40),
        type: rng.range(0, 3), // 0=circle, 1=rect, 2=triangle, 3=diamond
        color: palette[rng.range(0, palette.length - 1)],
        rotation: angle,
        rotSpeed: rng.float(-1, 1) * traits.speed,
        pulsePhase: rng.float(0, Math.PI * 2),
      });
    }
  }
}

function updateGeometric(dt) {
  for (const s of geoShapes) {
    s.rotation += s.rotSpeed * dt;
  }
}

// ─── Organic Growth ────────────────────────────────────────────────────
function initOrganic() {
  const numSeeds = Math.floor(5 * traits.density + 2);
  growthPoints = [];
  for (let i = 0; i < numSeeds; i++) {
    const branches = [];
    const cx = rng.float(100, W - 100);
    const cy = rng.float(80, H - 80);
    const numBranches = rng.range(3, 8);
    for (let b = 0; b < numBranches; b++) {
      const angle = (b / numBranches) * Math.PI * 2 + rng.float(-0.3, 0.3);
      branches.push({
        points: [{ x: cx, y: cy }],
        angle,
        speed: rng.float(20, 60) * traits.speed,
        curvature: rng.float(-0.5, 0.5) * traits.curvature,
        thickness: rng.float(1, 4),
        color: palette[b % palette.length],
        maxLen: rng.range(20, 80),
        growing: true,
      });
    }
    growthPoints.push({ cx, cy, branches, color: palette[i % palette.length] });
  }
}

function updateOrganic(dt) {
  for (const seed of growthPoints) {
    for (const branch of seed.branches) {
      if (!branch.growing) continue;
      if (branch.points.length >= branch.maxLen) {
        branch.growing = false;
        continue;
      }
      const last = branch.points[branch.points.length - 1];
      branch.angle += branch.curvature * dt;
      const nx = last.x + Math.cos(branch.angle) * branch.speed * dt;
      const ny = last.y + Math.sin(branch.angle) * branch.speed * dt;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        branch.points.push({ x: nx, y: ny });
      } else {
        branch.growing = false;
      }
    }
  }
}

// ─── Abstract Composition ──────────────────────────────────────────────
function initAbstract() {
  const count = Math.floor(traits.layers * 8 + 5);
  abstractShapes = [];
  for (let i = 0; i < count; i++) {
    abstractShapes.push({
      x: rng.float(0, W),
      y: rng.float(0, H),
      w: rng.float(20, 200),
      h: rng.float(20, 150),
      color: palette[i % palette.length],
      type: rng.range(0, 4),
      drift: { x: rng.float(-20, 20), y: rng.float(-10, 10) },
      phase: rng.float(0, Math.PI * 2),
      opacity: rng.float(0.3, 1.0),
    });
  }
}

function updateAbstract(dt) {
  for (const s of abstractShapes) {
    s.x += s.drift.x * dt * 0.3;
    s.y += s.drift.y * dt * 0.3;
    // Gentle wrap
    if (s.x > W + s.w) s.x = -s.w;
    if (s.x < -s.w) s.x = W + s.w;
    if (s.y > H + s.h) s.y = -s.h;
    if (s.y < -s.h) s.y = H + s.h;
  }
}

// ─── Drawing ───────────────────────────────────────────────────────────
export function draw() {
  // Background
  cls(palette[palette.length - 1] || 0x0a0a1e);

  switch (styleIdx) {
    case 0:
      drawFlowField();
      break;
    case 1:
      drawGeometric();
      break;
    case 2:
      drawOrganic();
      break;
    case 3:
      drawAbstract();
      break;
  }

  drawHUD();
}

function drawFlowField() {
  for (const p of flowParticles) {
    const trail = p.trail;
    for (let i = 1; i < trail.length; i++) {
      const alpha = i / trail.length;
      const c = lerpColor(0x000000, p.color, alpha);
      line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, c);
    }
    circle(p.x, p.y, 2, p.color);
  }
}

function drawGeometric() {
  for (const s of geoShapes) {
    const pulse = 1 + Math.sin(time * 2 + s.pulsePhase) * 0.15;
    const sz = s.size * pulse;
    switch (s.type) {
      case 0: // circle
        circle(s.cx, s.cy, sz, s.color);
        break;
      case 1: // rect
        drawRect(s.cx - sz / 2, s.cy - sz / 2, sz, sz, s.color);
        break;
      case 2: // concentric circles
        circle(s.cx, s.cy, sz, s.color);
        circle(s.cx, s.cy, sz * 0.6, palette[0]);
        circle(s.cx, s.cy, sz * 0.3, s.color);
        break;
      case 3: // diamond (rotated rect)
        drawRect(s.cx - sz / 3, s.cy - sz / 3, sz * 0.66, sz * 0.66, s.color);
        break;
    }
  }
  // Center mandala
  const mandalaPulse = 1 + Math.sin(time * 1.5) * 0.1;
  for (let r = 5; r > 0; r--) {
    circle(W / 2, H / 2, r * 15 * mandalaPulse, palette[r % palette.length]);
  }
}

function drawOrganic() {
  for (const seed of growthPoints) {
    // Draw center
    circle(seed.cx, seed.cy, 4, seed.color);
    for (const branch of seed.branches) {
      const pts = branch.points;
      for (let i = 1; i < pts.length; i++) {
        const alpha = i / pts.length;
        const c = lerpColor(branch.color, palette[0], alpha * 0.5);
        line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, c);
      }
      if (pts.length > 0) {
        const tip = pts[pts.length - 1];
        circle(tip.x, tip.y, branch.growing ? 3 : 2, branch.color);
      }
    }
  }
}

function drawAbstract() {
  for (const s of abstractShapes) {
    const wave = Math.sin(time + s.phase) * 10;
    switch (s.type) {
      case 0:
        drawRect(s.x, s.y + wave, s.w, s.h * 0.3, s.color);
        break;
      case 1:
        circle(s.x + s.w / 2, s.y + s.h / 2 + wave, s.w / 3, s.color);
        break;
      case 2:
        line(s.x, s.y, s.x + s.w, s.y + s.h + wave, s.color);
        line(s.x + s.w, s.y, s.x, s.y + s.h + wave, s.color);
        break;
      case 3:
        drawRect(s.x, s.y + wave, s.w, s.h, s.color);
        drawRect(s.x + 3, s.y + wave + 3, s.w - 6, s.h - 6, palette[0]);
        break;
      case 4:
        for (let r = 3; r > 0; r--) {
          circle(s.x + s.w / 2, s.y + s.h / 2 + wave, (r * s.w) / 8, s.color);
        }
        break;
    }
  }
}

function drawHUD() {
  // Top bar
  print('SEED: ' + currentSeed, 10, 8, 0xffffff);
  print(STYLES[styleIdx], 400, 8, 0x44ddff);

  // Trait mini display
  const t = traits;
  print('Complexity:' + (t.complexity * 100).toFixed(0) + '%', 10, 340, 0x888888);
  print('Layers:' + t.layers, 200, 340, 0x888888);
  print('Sym:' + t.symmetry, 300, 340, 0x888888);

  // Controls
  print('[N]ew [P]rev [S]tyle [1-4] [M]eta', 360, 340, 0x555566);

  // Palette preview
  for (let i = 0; i < palette.length; i++) {
    drawRect(W - 80 + i * 12, 6, 10, 10, palette[i]);
  }
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
