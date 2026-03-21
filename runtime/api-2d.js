// runtime/api-2d.js
// Nova64 Enhanced 2D Drawing API
// All primitives operate on the framebuffer (the 2D overlay that composites over the 3D scene).
//
// Exposed globals: drawGradient, drawRadialGradient, drawRoundedRect, poly, tristrip,
//   printCentered, printRight, drawScanlines, drawNoise, drawProgressBar,
//   drawGlowText, drawPixelBorder, drawCheckerboard, colorLerp, colorMix, hexColor,
//   drawStarburst, drawDiamond, drawTriangle, drawWave, drawSpiral, scrollingText,
//   drawPanel, drawHealthBar, drawMinimap, n64Palette

import { rgba8 } from './api.js';

// ─── colour helpers ───────────────────────────────────────────────────────────

/** Unpack an rgba8() BigInt into {r,g,b,a} 0-255 floats */
function _unpack(c) {
  if (typeof c === 'bigint') {
    return {
      r: Number((c >> 48n) & 0xffffn) / 257,
      g: Number((c >> 32n) & 0xffffn) / 257,
      b: Number((c >> 16n) & 0xffffn) / 257,
      a: Number(c & 0xffffn) / 257,
    };
  }
  const bc = BigInt(Math.floor(c));
  return {
    r: Number((bc >> 48n) & 0xffffn) / 257,
    g: Number((bc >> 32n) & 0xffffn) / 257,
    b: Number((bc >> 16n) & 0xffffn) / 257,
    a: Number(bc & 0xffffn) / 257,
  };
}

/** Linearly interpolate two rgba8 colours. t = 0..1 */
function colorLerp(c1, c2, t) {
  const a = _unpack(c1),
    b = _unpack(c2);
  return rgba8(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
    a.a + (b.a - a.a) * t
  );
}

/** Multiply/tint a colour by a brightness factor 0..2 */
function colorMix(c, factor) {
  const { r, g, b, a } = _unpack(c);
  return rgba8(Math.min(255, r * factor), Math.min(255, g * factor), Math.min(255, b * factor), a);
}

/** Convert 0xRRGGBB hex number to rgba8 */
function hexColor(hex, alpha = 255) {
  return rgba8((hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff, alpha);
}

/** Convert HSL(0-360, 0-1, 0-1) to rgba8 */
function hslColor(h, s = 1, l = 0.5, alpha = 255) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return rgba8(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
    alpha
  );
}

// ─── Math utilities ──────────────────────────────────────────────────────────

/** Linear interpolation: lerp(a, b, t) → a + (b - a) * t */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Clamp value between min and max */
function clamp(v, min = 0, max = 1) {
  return v < min ? min : v > max ? max : v;
}

/** Random float in [min, max) */
function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Random integer in [min, max] inclusive */
function randInt(min, max) {
  return (min + Math.random() * (max - min + 1)) | 0;
}

/** Distance between two 2D points */
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1,
    dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Distance between two 3D points */
function dist3d(x1, y1, z1, x2, y2, z2) {
  const dx = x2 - x1,
    dy = y2 - y1,
    dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Map a value from one range to another */
function remap(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

/** Smooth pulse: returns 0-1-0 based on time with given frequency */
function pulse(time, frequency = 1) {
  return Math.sin(time * frequency * Math.PI * 2) * 0.5 + 0.5;
}

/** Convert degrees to radians */
function deg2rad(d) {
  return (d * Math.PI) / 180;
}

/** Convert radians to degrees */
function rad2deg(r) {
  return (r * 180) / Math.PI;
}

// ─── Classic N64 / PS1 limited palette ───────────────────────────────────────
const n64Palette = {
  black: rgba8(0, 0, 0),
  white: rgba8(255, 255, 255),
  red: rgba8(220, 30, 30),
  green: rgba8(30, 200, 60),
  blue: rgba8(30, 80, 220),
  yellow: rgba8(255, 220, 0),
  cyan: rgba8(0, 220, 220),
  magenta: rgba8(200, 0, 200),
  orange: rgba8(255, 140, 0),
  purple: rgba8(120, 0, 200),
  teal: rgba8(0, 160, 160),
  brown: rgba8(140, 80, 30),
  grey: rgba8(128, 128, 128),
  darkGrey: rgba8(60, 60, 60),
  lightGrey: rgba8(200, 200, 200),
  sky: rgba8(70, 130, 200),
  gold: rgba8(255, 210, 50),
  silver: rgba8(192, 192, 210),
};

// ─── actual drawing functions ─────────────────────────────────────────────────

export function api2d(gpu) {
  const fb = gpu.getFramebuffer();
  const W = fb.width; // 640
  const H = fb.height; // 360

  // cached camRef from std api - unused for 2D (no camera offset)
  // const cam = { x: 0, y: 0 };

  // helper: write a pixel with alpha blending
  function _blend(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (a >= 255) {
      fb.pset(x, y, r * 257, g * 257, b * 257, 65535);
      return;
    }
    const i = (y * W + x) * 4;
    const p = fb.pixels;
    const af = a / 255;
    const bf = 1 - af;
    p[i] = Math.round(r * af + (p[i] / 257) * bf) * 257;
    p[i + 1] = Math.round(g * af + (p[i + 1] / 257) * bf) * 257;
    p[i + 2] = Math.round(b * af + (p[i + 2] / 257) * bf) * 257;
    p[i + 3] = 65535;
  }

  /** pset with color as rgba8 bigint */
  function _pset(x, y, color) {
    const c = _unpack(color);
    _blend(x | 0, y | 0, c.r, c.g, c.b, c.a);
  }

  // ── Gradient fills ──────────────────────────────────────────────────────────

  /**
   * drawGradient(x, y, w, h, c1, c2, dir)
   * dir: 'v' vertical (top→bottom), 'h' horizontal (left→right), 'd' diagonal
   */
  function drawGradient(x, y, w, h, c1, c2, dir = 'v') {
    x |= 0;
    y |= 0;
    w |= 0;
    h |= 0;
    const a1 = _unpack(c1),
      a2 = _unpack(c2);
    const x1 = Math.max(0, x),
      y1 = Math.max(0, y);
    const x2 = Math.min(W, x + w),
      y2 = Math.min(H, y + h);
    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        let t;
        if (dir === 'h') {
          t = w > 0 ? (px - x) / w : 0;
        } else if (dir === 'd') {
          t = w + h > 0 ? (px - x + (py - y)) / (w + h) : 0;
        } else {
          t = h > 0 ? (py - y) / h : 0;
        }
        t = Math.max(0, Math.min(1, t));
        _blend(
          px,
          py,
          (a1.r + (a2.r - a1.r) * t) | 0,
          (a1.g + (a2.g - a1.g) * t) | 0,
          (a1.b + (a2.b - a1.b) * t) | 0,
          (a1.a + (a2.a - a1.a) * t) | 0
        );
      }
    }
  }

  /**
   * drawRadialGradient(cx, cy, radius, innerColor, outerColor)
   * Great for glows, halos, spot lights.
   */
  function drawRadialGradient(cx, cy, radius, innerColor, outerColor) {
    cx |= 0;
    cy |= 0;
    radius = radius | 0;
    const ci = _unpack(innerColor),
      co = _unpack(outerColor);
    const x1 = Math.max(0, cx - radius),
      y1 = Math.max(0, cy - radius);
    const x2 = Math.min(W, cx + radius),
      y2 = Math.min(H, cy + radius);
    const r2 = radius * radius;
    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        const dx = px - cx,
          dy = py - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const t = Math.sqrt(d2) / radius;
        _blend(
          px,
          py,
          (ci.r + (co.r - ci.r) * t) | 0,
          (ci.g + (co.g - ci.g) * t) | 0,
          (ci.b + (co.b - ci.b) * t) | 0,
          (ci.a + (co.a - ci.a) * t) | 0
        );
      }
    }
  }

  // ── Rounded rect ────────────────────────────────────────────────────────────

  /**
   * drawRoundedRect(x, y, w, h, radius, color, fill=true)
   * PS1/N64-style rounded panel corners.
   */
  function drawRoundedRect(x, y, w, h, radius, color, fill = true) {
    x |= 0;
    y |= 0;
    w |= 0;
    h |= 0;
    radius = Math.min(radius | 0, Math.min(w, h) >> 1);
    const { r, g, b, a } = _unpack(color);

    if (fill) {
      // Fill main body (three rects)
      for (let py = y + radius; py < y + h - radius; py++) {
        for (let px = x; px < x + w; px++) _blend(px, py, r, g, b, a);
      }
      for (let py = y; py < y + radius; py++) {
        for (let px = x + radius; px < x + w - radius; px++) _blend(px, py, r, g, b, a);
      }
      for (let py = y + h - radius; py < y + h; py++) {
        for (let px = x + radius; px < x + w - radius; px++) _blend(px, py, r, g, b, a);
      }
      // Fill corners with quarter-circles
      const corners = [
        [x + radius, y + radius],
        [x + w - radius - 1, y + radius],
        [x + radius, y + h - radius - 1],
        [x + w - radius - 1, y + h - radius - 1],
      ];
      for (const [cx, cy] of corners) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) _blend(cx + dx, cy + dy, r, g, b, a);
          }
        }
      }
    } else {
      // Outline only — top/bottom edges
      for (let px = x + radius; px < x + w - radius; px++) {
        _blend(px, y, r, g, b, a);
        _blend(px, y + h - 1, r, g, b, a);
      }
      // Left/right edges
      for (let py = y + radius; py < y + h - radius; py++) {
        _blend(x, py, r, g, b, a);
        _blend(x + w - 1, py, r, g, b, a);
      }
      // Corners (just the arc outline)
      const corners = [
        [x + radius, y + radius, -1, -1],
        [x + w - radius - 1, y + radius, 1, -1],
        [x + radius, y + h - radius - 1, -1, 1],
        [x + w - radius - 1, y + h - radius - 1, 1, 1],
      ];
      for (const [cx, cy, sx, sy] of corners) {
        for (let angle = 0; angle <= 90; angle += 1) {
          const rad = (angle * Math.PI) / 180;
          const px = (cx + sx * Math.cos(rad) * radius) | 0;
          const py = (cy + sy * Math.sin(rad) * radius) | 0;
          _blend(px, py, r, g, b, a);
        }
      }
    }
  }

  // ── Polygon ─────────────────────────────────────────────────────────────────

  /**
   * poly(points, color, fill=true)
   * points: [[x0,y0],[x1,y1],...] — convex or concave polygon
   * Uses scanline fill for filled, Bresenham for outline.
   */
  function poly(points, color, fill = true) {
    if (points.length < 3) return;
    const { r, g, b, a } = _unpack(color);

    if (fill) {
      const minY = Math.max(0, Math.min(...points.map(p => p[1])) | 0);
      const maxY = Math.min(H - 1, Math.max(...points.map(p => p[1])) | 0);
      for (let py = minY; py <= maxY; py++) {
        const intersections = [];
        const n = points.length;
        for (let i = 0; i < n; i++) {
          const [x0, y0] = points[i];
          const [x1, y1] = points[(i + 1) % n];
          if ((y0 <= py && py < y1) || (y1 <= py && py < y0)) {
            const t = (py - y0) / (y1 - y0);
            intersections.push(x0 + t * (x1 - x0));
          }
        }
        intersections.sort((a, b) => a - b);
        for (let i = 0; i + 1 < intersections.length; i += 2) {
          const lx = Math.max(0, intersections[i] | 0);
          const rx = Math.min(W - 1, intersections[i + 1] | 0);
          for (let px = lx; px <= rx; px++) _blend(px, py, r, g, b, a);
        }
      }
    } else {
      // Outline
      const n = points.length;
      for (let i = 0; i < n; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % n];
        // Bresenham
        let dx = Math.abs(x1 - x0),
          dy = -Math.abs(y1 - y0);
        let sx = x0 < x1 ? 1 : -1,
          sy = y0 < y1 ? 1 : -1;
        let err = dx + dy,
          px = x0 | 0,
          py = y0 | 0;
        for (;;) {
          _blend(px, py, r, g, b, a);
          if (px === (x1 | 0) && py === (y1 | 0)) break;
          const e2 = 2 * err;
          if (e2 >= dy) {
            err += dy;
            px += sx;
          }
          if (e2 <= dx) {
            err += dx;
            py += sy;
          }
        }
      }
    }
  }

  /**
   * drawTriangle(x0,y0, x1,y1, x2,y2, color, fill=true)
   */
  function drawTriangle(x0, y0, x1, y1, x2, y2, color, fill = true) {
    poly(
      [
        [x0, y0],
        [x1, y1],
        [x2, y2],
      ],
      color,
      fill
    );
  }

  /**
   * drawDiamond(cx, cy, halfW, halfH, color, fill=true)
   */
  function drawDiamond(cx, cy, halfW, halfH, color, fill = true) {
    poly(
      [
        [cx, cy - halfH],
        [cx + halfW, cy],
        [cx, cy + halfH],
        [cx - halfW, cy],
      ],
      color,
      fill
    );
  }

  // ── Text helpers ─────────────────────────────────────────────────────────────

  // We reach into the gpu's exposed stdApi print via globalThis
  function _print(text, x, y, color, scale) {
    if (typeof globalThis.print === 'function') globalThis.print(text, x, y, color, scale);
  }

  function measureText(text, scale = 1) {
    // 5px glyph + 1px spacing = 6px per character; 7px tall
    const s = Math.max(1, Math.round(scale));
    return { width: text.length * 6 * s, height: 7 * s };
  }

  /** printCentered(text, cx, y, color, scale=1) — centre on x */
  function printCentered(text, cx, y, color, scale = 1) {
    const w = measureText(text, scale).width;
    _print(text, (cx - w / 2) | 0, y, color, scale);
  }

  /** printRight(text, rightX, y, color, scale=1) — right-align */
  function printRight(text, rightX, y, color, scale = 1) {
    const w = measureText(text, scale).width;
    _print(text, (rightX - w) | 0, y, color, scale);
  }

  /**
   * drawGlowText(text, x, y, color, glowColor, scale=1)
   * Prints text with a soft glow halo by drawing the glowColor in 8 surrounding offsets
   * then the main color on top. Pure N64/Dreamcast HUD aesthetic.
   */
  function drawGlowText(text, x, y, color, glowColor, scale = 1) {
    const offsets = [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ];
    for (const [dx, dy] of offsets) {
      _print(text, x + dx, y + dy, glowColor, scale);
    }
    _print(text, x, y, color, scale);
  }

  /**
   * drawGlowTextCentered(text, cx, y, color, glowColor, scale=1)
   */
  function drawGlowTextCentered(text, cx, y, color, glowColor, scale = 1) {
    const w = measureText(text, scale).width;
    drawGlowText(text, (cx - w / 2) | 0, y, color, glowColor, scale);
  }

  /**
   * drawPulsingText(text, cx, y, color, time, opts)
   * Centered text that pulses opacity and/or scale over time.
   * opts: { frequency, minAlpha, glowColor, scale }
   */
  function drawPulsingText(text, cx, y, color, time, opts = {}) {
    const freq = opts.frequency ?? 3;
    const minAlpha = opts.minAlpha ?? 120;
    const scale = opts.scale ?? 1;
    const alpha = Math.floor((Math.sin(time * freq) * 0.5 + 0.5) * (255 - minAlpha) + minAlpha);
    const { r, g, b } = _unpack(color);
    const pulsedColor = rgba8(r, g, b, alpha);
    if (opts.glowColor) {
      drawGlowTextCentered(text, cx, y, pulsedColor, opts.glowColor, scale);
    } else {
      printCentered(text, cx, y, pulsedColor, scale);
    }
  }

  // ── Screen overlays ──────────────────────────────────────────────────────────

  /**
   * drawScanlines(alpha=80, spacing=2)
   * CRT scanline overlay — horizontal dark bands every `spacing` rows.
   */
  function drawScanlines(alpha = 80, spacing = 2) {
    const p = fb.pixels;
    const af = (255 - alpha) / 255;
    for (let y = 0; y < H; y += spacing) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        p[i] = (p[i] * af) | 0;
        p[i + 1] = (p[i + 1] * af) | 0;
        p[i + 2] = (p[i + 2] * af) | 0;
      }
    }
  }

  /**
   * drawNoise(x, y, w, h, alpha=40, seed=0)
   * Deterministic LCG grain/static overlay. Good for title card grit.
   */
  function drawNoise(x, y, w, h, alpha = 40, seed = 0) {
    x |= 0;
    y |= 0;
    w |= 0;
    h |= 0;
    let s = seed | 12345;
    const x1 = Math.max(0, x),
      y1 = Math.max(0, y);
    const x2 = Math.min(W, x + w),
      y2 = Math.min(H, y + h);
    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        const n = (s >>> 16) & 0xff;
        _blend(px, py, n, n, n, ((n / 255) * alpha) | 0);
      }
    }
  }

  /**
   * drawCheckerboard(x, y, w, h, c1, c2, size=8)
   * N64 loading pattern / retro background filler.
   */
  function drawCheckerboard(x, y, w, h, c1, c2, size = 8) {
    x |= 0;
    y |= 0;
    w |= 0;
    h |= 0;
    size |= 0;
    const x1 = Math.max(0, x),
      y1 = Math.max(0, y);
    const x2 = Math.min(W, x + w),
      y2 = Math.min(H, y + h);
    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        const cell = ((((px - x) / size) | 0) + (((py - y) / size) | 0)) % 2;
        _pset(px, py, cell === 0 ? c1 : c2);
      }
    }
  }

  // ── Progress / HUD bars ───────────────────────────────────────────────────────

  /**
   * drawProgressBar(x, y, w, h, t, fgColor, bgColor, borderColor)
   * t = 0..1  fill fraction.
   */
  function drawProgressBar(x, y, w, h, t, fgColor, bgColor, borderColor) {
    t = Math.max(0, Math.min(1, t));
    // Background
    if (bgColor !== undefined) {
      const bg = _unpack(bgColor);
      for (let py = y; py < y + h; py++)
        for (let px = x; px < x + w; px++) _blend(px, py, bg.r, bg.g, bg.b, bg.a);
    }
    // Fill
    const fill = (w * t) | 0;
    const fg = _unpack(fgColor);
    for (let py = y; py < y + h; py++)
      for (let px = x; px < x + fill; px++) _blend(px, py, fg.r, fg.g, fg.b, fg.a);
    // Border
    if (borderColor !== undefined) {
      const bc = _unpack(borderColor);
      for (let px = x; px < x + w; px++) {
        _blend(px, y, bc.r, bc.g, bc.b, bc.a);
        _blend(px, y + h - 1, bc.r, bc.g, bc.b, bc.a);
      }
      for (let py = y; py < y + h; py++) {
        _blend(x, py, bc.r, bc.g, bc.b, bc.a);
        _blend(x + w - 1, py, bc.r, bc.g, bc.b, bc.a);
      }
    }
  }

  /**
   * drawHealthBar(x, y, w, h, current, max, opts)
   * opts: { barColor, backgroundColor, borderColor, dangerColor, dangerThreshold }
   * Auto-switches to dangerColor when hp < dangerThreshold (default 0.25).
   */
  function drawHealthBar(x, y, w, h, current, max, opts = {}) {
    const t = max > 0 ? current / max : 0;
    const danger = opts.dangerThreshold ?? 0.25;
    const fg =
      t < danger ? (opts.dangerColor ?? rgba8(220, 40, 40)) : (opts.barColor ?? rgba8(50, 220, 80));
    drawProgressBar(
      x,
      y,
      w,
      h,
      t,
      fg,
      opts.backgroundColor ?? rgba8(30, 30, 30, 200),
      opts.borderColor ?? rgba8(200, 200, 200, 180)
    );
  }

  // ── PS1/N64 panel border ──────────────────────────────────────────────────────

  /**
   * drawPixelBorder(x, y, w, h, lightColor, darkColor, thickness=2)
   * 3D-embossed bevel — PS1/SNES-style UI panel border.
   */
  function drawPixelBorder(x, y, w, h, lightColor, darkColor, thickness = 2) {
    const lc = _unpack(lightColor),
      dc = _unpack(darkColor);
    for (let i = 0; i < thickness; i++) {
      // Top & left (light)
      for (let px = x + i; px < x + w - i; px++) _blend(px, y + i, lc.r, lc.g, lc.b, lc.a);
      for (let py = y + i; py < y + h - i; py++) _blend(x + i, py, lc.r, lc.g, lc.b, lc.a);
      // Bottom & right (dark)
      for (let px = x + i; px < x + w - i; px++) _blend(px, y + h - 1 - i, dc.r, dc.g, dc.b, dc.a);
      for (let py = y + i; py < y + h - i; py++) _blend(x + w - 1 - i, py, dc.r, dc.g, dc.b, dc.a);
    }
  }

  // ── Decorative shapes ─────────────────────────────────────────────────────────

  /**
   * drawStarburst(cx, cy, outerR, innerR, spikes, color, fill=true)
   * Classic star shape — great for score popups and collectible icons.
   */
  function drawStarburst(cx, cy, outerR, innerR, spikes, color, fill = true) {
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    poly(pts, color, fill);
  }

  /**
   * drawWave(x, y, w, amplitude, frequency, phase, color, thickness=2)
   * Animated sine wave — good for water, plasma, audio visualizers.
   * phase = time * speed for animation.
   */
  function drawWave(x, y, w, amplitude, frequency, phase, color, thickness = 2) {
    const { r, g, b, a } = _unpack(color);
    for (let px = x; px < x + w && px < W; px++) {
      const py = (y + Math.sin((px - x) * frequency + phase) * amplitude) | 0;
      for (let t = -thickness >> 1; t <= thickness >> 1; t++) {
        const ny = py + t;
        if (ny >= 0 && ny < H) _blend(px, ny, r, g, b, a);
      }
    }
  }

  /**
   * drawSpiral(cx, cy, turns, spacing, color)
   * Decorative Archimedean spiral — psychedelic demoscene / loading screen art.
   */
  function drawSpiral(cx, cy, turns, spacing, color) {
    const { r, g, b, a } = _unpack(color);
    const steps = turns * 360;
    for (let i = 0; i < steps; i++) {
      const angle = (i / 180) * Math.PI;
      const rad = (i / 360) * spacing;
      const px = (cx + Math.cos(angle) * rad) | 0;
      const py = (cy + Math.sin(angle) * rad) | 0;
      if (px >= 0 && px < W && py >= 0 && py < H) _blend(px, py, r, g, b, a);
    }
  }

  // ── Composite widgets ─────────────────────────────────────────────────────────

  /**
   * drawPanel(x, y, w, h, opts)
   * A complete PS1/N64-style info panel with background, border, and optional title.
   * opts: { bgColor, borderLight, borderDark, title, titleColor, padding, alpha }
   */
  function drawPanel(x, y, w, h, opts = {}) {
    const bg = opts.bgColor ?? rgba8(10, 10, 30, 200);
    const bl = opts.borderLight ?? rgba8(180, 180, 220, 255);
    const bd = opts.borderDark ?? rgba8(30, 30, 60, 255);
    // opts.alpha available for callers but not used in fill path

    // Fill panel (re-use opts.bgColor with alpha override)
    const bgc = _unpack(bg);
    for (let py = y + 2; py < y + h - 2; py++)
      for (let px = x + 2; px < x + w - 2; px++) _blend(px, py, bgc.r, bgc.g, bgc.b, bgc.a);

    // 3D border
    drawPixelBorder(x, y, w, h, bl, bd, 2);

    // Optional title text at top
    if (opts.title) {
      const tc = opts.titleColor ?? rgba8(255, 255, 255, 255);
      const pad = opts.padding ?? 6;
      printCentered(opts.title, x + w / 2, y + pad, tc);
    }
  }

  /**
   * drawMinimap(x, y, size, entities, bgColor)
   * entities: [{ x, y, color, worldW, worldH }]  — dot map for players/enemies/items.
   * worldW/worldH are the world-space bounds to normalise against.
   */
  function drawMinimap(x, y, size, entities, bgColor) {
    const bg = bgColor ?? rgba8(0, 0, 0, 180);
    const bgc = _unpack(bg);
    // Fill minimap bg
    for (let py = y; py < y + size; py++)
      for (let px = x; px < x + size; px++) _blend(px, py, bgc.r, bgc.g, bgc.b, bgc.a);
    // Border
    drawPixelBorder(x, y, size, size, rgba8(150, 150, 150), rgba8(50, 50, 50), 1);
    // Dots
    for (const e of entities) {
      const ww = e.worldW ?? 100,
        wh = e.worldH ?? 100;
      const dx = (x + (e.x / ww) * size) | 0;
      const dy = (y + (e.y / wh) * size) | 0;
      const ec = _unpack(e.color ?? rgba8(255, 255, 255));
      // 2x2 dot
      for (let oy = 0; oy < 2; oy++)
        for (let ox = 0; ox < 2; ox++) _blend(dx + ox, dy + oy, ec.r, ec.g, ec.b, ec.a);
    }
  }

  /**
   * scrollingText(text, y, speed, time, color, scale=1, width=640)
   * Marquee text scrolling left across the screen.
   * time = accumulated seconds (from novaStore or cart-local variable).
   */
  function scrollingText(text, y, speed, time, color, scale = 1, width = 640) {
    const tw = measureText(text, scale).width;
    const x = (width - ((time * speed) % (width + tw))) | 0;
    _print(text, x, y, color, scale);
  }

  // ── Full-screen helpers ───────────────────────────────────────────────────────

  /** Full-screen vertical gradient — great for sky/title backgrounds */
  function drawSkyGradient(topColor, bottomColor) {
    drawGradient(0, 0, W, H, topColor, bottomColor, 'v');
  }

  /** Full-screen flash — use alpha 0..255 for a fade effect */
  function drawFlash(color) {
    const { r, g, b, a } = _unpack(color);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) _blend(px, py, r, g, b, a);
  }

  /**
   * Draw a crosshair / reticle at (cx, cy).
   * @param {number} cx - centre X in screen pixels
   * @param {number} cy - centre Y in screen pixels
   * @param {number} [size=8] - half-length of each arm in pixels
   * @param {number} [color=0xffffffff] - rgba8 or 0xRRGGBB colour
   * @param {'cross'|'dot'|'circle'} [style='cross'] - reticle style
   */
  function drawCrosshair(cx, cy, size = 8, color = 0xffffffff, style = 'cross') {
    if (style === 'cross' || style === 'dot') {
      // Horizontal arm
      for (let x = cx - size; x <= cx + size; x++) _pset(x, cy, color);
      // Vertical arm
      for (let y = cy - size; y <= cy + size; y++) _pset(cx, y, color);
    }
    if (style === 'circle') {
      // Thin circle
      const steps = Math.max(32, size * 4);
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        _pset(Math.round(cx + Math.cos(a) * size), Math.round(cy + Math.sin(a) * size), color);
      }
    }
    if (style === 'dot') {
      // Centre dot (extra pixels around the intersection)
      _pset(cx - 1, cy, color);
      _pset(cx + 1, cy, color);
      _pset(cx, cy - 1, color);
      _pset(cx, cy + 1, color);
    }
  }

  // ─── expose ──────────────────────────────────────────────────────────────────
  return {
    exposeTo(target) {
      Object.assign(target, {
        // Colour helpers
        colorLerp,
        colorMix,
        hexColor,
        hslColor,
        n64Palette,

        // Math utilities
        lerp,
        clamp,
        randRange,
        randInt,
        dist,
        dist3d,
        remap,
        pulse,
        deg2rad,
        rad2deg,

        // Gradient fills
        drawGradient,
        drawRadialGradient,
        drawSkyGradient,
        drawFlash,

        // Shapes
        drawRoundedRect,
        poly,
        drawTriangle,
        drawDiamond,
        drawStarburst,
        drawWave,
        drawSpiral,
        drawCheckerboard,

        // Text
        measureText,
        printCentered,
        printRight,
        drawGlowText,
        drawGlowTextCentered,
        drawPulsingText,

        // Overlays
        drawScanlines,
        drawNoise,

        // HUD Widgets
        drawProgressBar,
        drawHealthBar,
        drawPixelBorder,
        drawPanel,
        drawCrosshair,
        drawMinimap,
        scrollingText,
      });
    },
  };
}
