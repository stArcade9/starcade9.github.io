// filter-glitch — CRT / VHS glitch effect showcase using api-filters.js
// Shows: withFilter, CM (color matrix), applyGlitch, applyVHS, applyPixelate,
//        applyBloom, toggleable effects with keyboard input

let W = 640,
  H = 360;
let time = 0;
let glitchTimer = 0;
let glitchNext = 0.6;
let mode = 0; // 0=normal 1=glitch 2=vhs 3=saturate 4=sepia 5=pixelate
const MODES = ['NORMAL', 'CRT GLITCH', 'VHS SCANLINES', 'HYPER-SAT', 'SEPIA', 'PIXELATE'];
let modeTime = 0;

// Simple plasma background
function _drawPlasma(t) {
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const v =
        Math.sin(x * 0.03 + t) +
        Math.sin(y * 0.04 + t * 0.7) +
        Math.sin((x + y) * 0.025 + t * 1.3) +
        Math.sin(Math.sqrt(x * x + y * y) * 0.02 + t);
      const r = Math.floor(((v + 4) / 8) * 180 + 30);
      const g = Math.floor(((Math.sin(v * 1.2 + 1) + 1) / 2) * 120 + 10);
      const b = Math.floor(((Math.cos(v * 0.8 - 0.5) + 1) / 2) * 200 + 55);
      rectfill(x, y, 2, 2, (r << 16) | (g << 8) | b);
    }
  }
}

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
}

export function update(dt) {
  time += dt;
  modeTime += dt;

  // Auto-cycle modes every 3 seconds
  if (modeTime > 3) {
    modeTime = 0;
    mode = (mode + 1) % MODES.length;
  }

  // Random glitch spikes in CRT mode
  if (mode === 1) {
    glitchTimer += dt;
    if (glitchTimer >= glitchNext) {
      glitchTimer = 0;
      glitchNext = 0.1 + Math.random() * 0.7;
    }
  }
}

export function draw() {
  cls(0x000000);

  // 1. Draw plasma scene into framebuffer
  _drawPlasma(time);

  // 2. Apply chosen filter effect using withFilter (composited over the top)
  if (mode === 1) {
    // CRT glitch — horizontal band displacement
    applyFilter('glitch', { intensity: 0.15 + 0.25 * Math.sin(time * 20) });
    // Scanlines
    for (let y = 0; y < H; y += 2) {
      rectfill(0, y, W, 1, 0x00000040);
    }
    // Chromatic fringe
    applyFilter('chromaticAberration', { amount: 3 });
  } else if (mode === 2) {
    // VHS — desaturate + scanlines + noise
    applyFilter('colorMatrix', { matrix: CM.saturate(0.25) });
    for (let y = 0; y < H; y += 3) {
      rectfill(0, y, W, 1, 0x00000066);
    }
    // Noise dabs
    for (let i = 0; i < 120; i++) {
      const nx = (Math.random() * W) | 0;
      const ny = (Math.random() * H) | 0;
      const nv = Math.random() > 0.5 ? 0xffffff : 0x000000;
      pset(nx, ny, nv);
    }
  } else if (mode === 3) {
    applyFilter('colorMatrix', { matrix: CM.saturate(4.0) });
  } else if (mode === 4) {
    applyFilter('colorMatrix', { matrix: CM.sepia(1.0) });
  } else if (mode === 5) {
    applyFilter('pixelate', { size: 6 });
  }

  // 3. HUD overlay
  const barH = 20;
  rectfill(0, 0, W, barH, 0x000000aa);
  rectfill(0, H - barH, W, barH, 0x000000aa);

  print('FILTER GLITCH', 4, 4, 0xffffff);
  print(`MODE: ${MODES[mode]}`, 4, 10, 0x44aaff);
  print('Auto-cycles every 3s', 4, H - barH + 4, 0x778899);
  const progress = Math.floor((modeTime / 3) * (W - 8));
  rectfill(4, H - 5, progress, 2, 0x44aaff);
}
