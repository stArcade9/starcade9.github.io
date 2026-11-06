// filter-glitch — CRT / VHS glitch effect showcase using api-filters.js
// Shows: applyColorMatrix + CM presets, band-displacement glitch, pixelate,
//        scanlines and noise, auto-cycling every 3 seconds

const { cls, print, pset, rectfill, screenHeight, screenWidth } = nova64.draw;
const { CM, applyColorMatrix } = nova64.fx;
const { t } = nova64.data;
const { color, noise } = nova64.util;

let W = 640,
  H = 360;
let time = 0;
let glitchTimer = 0;
let glitchNext = 0.6;
let mode = 0; // 0=normal 1=glitch 2=vhs 3=saturate 4=sepia 5=pixelate
const MODES = ['NORMAL', 'CRT GLITCH', 'VHS SCANLINES', 'HYPER-SAT', 'SEPIA', 'PIXELATE'];
let modeTime = 0;

// 4x5 colour matrix that scales saturation by s (luma-preserving).
function _saturation(s) {
  const lr = 0.2126 * (1 - s);
  const lg = 0.7152 * (1 - s);
  const lb = 0.0722 * (1 - s);
  // prettier-ignore
  return [
    lr + s, lg, lb, 0, 0,
    lr, lg + s, lb, 0, 0,
    lr, lg, lb + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

// Simple plasma background. `step` is the block size (larger = pixelated);
// y0/rows/dx draw a horizontally shifted band, used for the glitch effect.
function _drawPlasma(t, step = 2, y0 = 0, rows = H, dx = 0) {
  for (let y = y0; y < Math.min(H, y0 + rows); y += step) {
    for (let x = 0; x < W; x += step) {
      const v =
        Math.sin(x * 0.03 + t) +
        Math.sin(y * 0.04 + t * 0.7) +
        Math.sin((x + y) * 0.025 + t * 1.3) +
        Math.sin(Math.sqrt(x * x + y * y) * 0.02 + t);
      const r = Math.floor(((v + 4) / 8) * 180 + 30);
      const g = Math.floor(((Math.sin(v * 1.2 + 1) + 1) / 2) * 120 + 10);
      const b = Math.floor(((Math.cos(v * 0.8 - 0.5) + 1) / 2) * 200 + 55);
      rectfill(x + dx, y, step, step, (r << 16) | (g << 8) | b);
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

  // 2. Apply the chosen effect. Colour effects post-process the framebuffer
  //    with applyColorMatrix; glitch and pixelate re-draw the plasma.
  if (mode === 1) {
    // CRT glitch — horizontal band displacement, stronger during spikes
    const intensity = 0.15 + 0.25 * Math.abs(Math.sin(time * 20));
    const bands = glitchTimer < 0.08 ? 6 : 2;
    for (let i = 0; i < bands; i++) {
      const by = (Math.random() * H) | 0;
      const bh = 4 + ((Math.random() * 18) | 0);
      _drawPlasma(time, 2, by, bh, (Math.random() - 0.5) * 80 * intensity);
    }
    // Scanlines
    for (let y = 0; y < H; y += 2) {
      rectfill(0, y, W, 1, 0x00000040);
    }
    // Chromatic fringe along the screen edges
    rectfill(0, 0, 3, H, 0xff000033);
    rectfill(W - 3, 0, 3, H, 0x0000ff33);
  } else if (mode === 2) {
    // VHS — desaturate + scanlines + noise
    applyColorMatrix(_saturation(0.25));
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
    applyColorMatrix(_saturation(4.0));
  } else if (mode === 4) {
    applyColorMatrix(CM.sepia);
  } else if (mode === 5) {
    _drawPlasma(time, 8);
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
