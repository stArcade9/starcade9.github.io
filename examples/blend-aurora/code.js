// blend-aurora — Aurora / neon sky demo using BM.SCREEN and BM.ADD blend modes
// Shows: withBlend, BM.SCREEN, BM.ADD, layered gradients on stage canvas,
//        createCamera2D pan, animated color bands

const { BM, cls, print, pset, rectfill, screenHeight, screenWidth, withBlend } = nova64.draw;
const { createCamera2D } = nova64.camera;
const { color } = nova64.util;

let W = 640,
  H = 360;
let time = 0;

// Aurora band config
const BANDS = [
  { hue: 160, phase: 0, amp: 0.8, freq: 0.7, yBase: 0.22, width: 0.45, speed: 0.12 },
  { hue: 200, phase: 1.4, amp: 0.6, freq: 0.9, yBase: 0.3, width: 0.35, speed: 0.09 },
  { hue: 270, phase: 2.8, amp: 0.7, freq: 0.55, yBase: 0.18, width: 0.3, speed: 0.15 },
  { hue: 120, phase: 0.9, amp: 0.5, freq: 1.1, yBase: 0.35, width: 0.25, speed: 0.18 },
  { hue: 320, phase: 3.5, amp: 0.9, freq: 0.65, yBase: 0.15, width: 0.4, speed: 0.07 },
];

function _hsl(h, s, l, a = 1) {
  // Returns CSS color string
  return `hsla(${h | 0},${(s * 100) | 0}%,${(l * 100) | 0}%,${a.toFixed(3)})`;
}

function _drawBand(ctx, band, t, alpha) {
  const y0 = (band.yBase + Math.sin(t * band.speed + band.phase) * band.amp * 0.12) * H;
  const bH = band.width * H;
  const wobble = Math.sin(t * band.freq + band.phase) * 0.04 * H;

  const grad = ctx.createLinearGradient(0, y0 - bH / 2 + wobble, 0, y0 + bH / 2 + wobble);
  grad.addColorStop(0, _hsl(band.hue, 0.9, 0.5, 0));
  grad.addColorStop(0.3, _hsl(band.hue, 0.9, 0.6, 0.35 * alpha));
  grad.addColorStop(0.5, _hsl(band.hue, 1.0, 0.7, 0.65 * alpha));
  grad.addColorStop(0.7, _hsl(band.hue, 0.9, 0.6, 0.35 * alpha));
  grad.addColorStop(1, _hsl(band.hue, 0.9, 0.5, 0));

  ctx.fillStyle = grad;
  ctx.fillRect(0, y0 - bH / 2 + wobble, W, bH);
}

function _drawRays(ctx, band, t, alpha) {
  // Volumetric-style vertical rays
  const baseY = band.yBase * H;
  const count = 8 + (band.hue % 5);
  for (let i = 0; i < count; i++) {
    const rx = (i / count + Math.sin(t * 0.05 + i + band.phase) * 0.1) * W;
    const rH = (0.3 + 0.15 * Math.sin(t * band.freq + i)) * H;
    const a = (0.06 + 0.06 * Math.sin(t * 0.3 + i * 2.1)) * alpha;

    const rg = ctx.createLinearGradient(rx, baseY, rx, baseY + rH);
    rg.addColorStop(0, _hsl(band.hue, 0.9, 0.7, a));
    rg.addColorStop(1, _hsl(band.hue, 0.8, 0.5, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(rx - 2, baseY, 5, rH);
  }
}

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
}

export function update(dt) {
  time += dt;
}

export function draw() {
  // Dark sky gradient
  cls(0x020710);
  for (let y = 0; y < H * 0.6; y++) {
    const t = y / (H * 0.6);
    const r = Math.floor(t * 5 + 2);
    const g = Math.floor(t * 10 + 5);
    const b = Math.floor(t * 35 + 14);
    rectfill(0, y, W, 1, (r << 16) | (g << 8) | b);
  }

  // Stars
  for (let i = 0; i < 80; i++) {
    const sx = (i * 137 + 5) % W;
    const sy = (i * 97 + 7) % Math.floor(H * 0.65);
    const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * (0.8 + i * 0.03) + i));
    const c = Math.floor(twinkle * 220);
    pset(sx, sy, (c << 16) | (c << 8) | c);
  }

  // Aurora bands — draw on stage canvas with BM.SCREEN
  withBlend('screen', ctx => {
    for (const band of BANDS) {
      const alpha = 0.55 + 0.35 * Math.sin(time * 0.22 + band.phase);
      _drawBand(ctx, band, time, alpha);
    }
  });

  // Ray shafts — BM.ADD for the bright needle effect
  withBlend('add', ctx => {
    for (const band of BANDS) {
      const alpha = 0.4 + 0.3 * Math.sin(time * 0.18 + band.phase * 1.3);
      _drawRays(ctx, band, time, alpha);
    }
  });

  // Horizon glow — BM.SCREEN
  withBlend('screen', ctx => {
    const horizY = H * 0.62;
    const hg = ctx.createLinearGradient(0, horizY - 20, 0, horizY + 30);
    const hue = ((time * 20) % 360) | 0;
    hg.addColorStop(0, _hsl(hue, 1, 0.6, 0.25));
    hg.addColorStop(1, _hsl(hue, 1, 0.4, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizY - 20, W, 50);
  });

  // Terrain silhouette
  const terrainY = Math.floor(H * 0.62);
  for (let x = 0; x < W; x++) {
    const h = 12 + 8 * Math.sin(x * 0.07) + 5 * Math.sin(x * 0.19 + 2.1);
    rectfill(x, terrainY + Math.floor(h), 1, H - terrainY, 0x09090f);
  }

  // Reflections on still water
  for (let rx = 0; rx < W; rx += 2) {
    const ry = terrainY + 12 + Math.floor(Math.sin(rx * 0.07) * 3);
    pset(rx, ry, 0x334455);
  }

  print('BLEND AURORA', 4, 4, 0xffffff);
  print('BM.SCREEN • BM.ADD • withBlend • layered gradients', 4, H - 12, 0x334455);
}
