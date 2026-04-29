// runtime/api-generative.js
// Nova64 Generative Art API — Processing.js-style creative coding primitives
//
// Provides: Perlin noise, ellipse, arc, bezier curves, quadratic curves,
// matrix stack (push/pop/translate/rotate/scale), color modes (RGB/HSB),
// easing functions, flow fields, and particle emitters.
//
// Exposed globals: noise, noiseSeed, noiseDetail, ellipse, arc, bezier,
//   quadCurve, pushMatrix, popMatrix, translate, rotate, scale2d,
//   colorMode, hsb, lerpColor, noiseMap, flowField, TWO_PI, HALF_PI,
//   QUARTER_PI, ease, smoothstep, frameCount

import { rgba8 } from './api.js';

export function generativeApi(gpu) {
  const fb = gpu.getFramebuffer();

  // ─── Constants ──────────────────────────────────────────────────────────────
  const TWO_PI = Math.PI * 2;
  const HALF_PI = Math.PI / 2;
  const QUARTER_PI = Math.PI / 4;
  let _frameCount = 0;

  function _advanceFrame() {
    _frameCount++;
  }

  // ─── Internal pixel writer (respects transform stack) ───────────────────────
  function _pset(x, y, c) {
    // Apply current transformation
    const [tx, ty] = _applyTransform(x, y);
    const ix = Math.round(tx);
    const iy = Math.round(ty);
    if (ix < 0 || iy < 0 || ix >= fb.width || iy >= fb.height) return;
    const { r, g, b, a } = _unpackColor(c);
    fb.pset(ix, iy, r, g, b, a);
  }

  function _unpackColor(c) {
    if (typeof c === 'bigint') {
      return {
        r: Number((c >> 48n) & 0xffffn),
        g: Number((c >> 32n) & 0xffffn),
        b: Number((c >> 16n) & 0xffffn),
        a: Number(c & 0xffffn),
      };
    }
    const bc = BigInt(Math.floor(c));
    return {
      r: Number((bc >> 48n) & 0xffffn),
      g: Number((bc >> 32n) & 0xffffn),
      b: Number((bc >> 16n) & 0xffffn),
      a: Number(bc & 0xffffn),
    };
  }

  // ─── Perlin Noise (classic improved, 2D/3D) ────────────────────────────────

  // Permutation table (seeded)
  let _perm = new Uint8Array(512);
  // eslint-disable-next-line no-unused-vars
  let _noiseSeed = 0;
  let _noiseOctaves = 4;
  let _noiseFalloff = 0.5;

  function _initPerm(seed) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates shuffle with seed
    let s = seed | 0;
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) _perm[i] = p[i & 255];
  }

  _initPerm(0);

  const _grad3 = [
    [1, 1, 0],
    [-1, 1, 0],
    [1, -1, 0],
    [-1, -1, 0],
    [1, 0, 1],
    [-1, 0, 1],
    [1, 0, -1],
    [-1, 0, -1],
    [0, 1, 1],
    [0, -1, 1],
    [0, 1, -1],
    [0, -1, -1],
  ];

  function _fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function _perlin3(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    const u = _fade(xf);
    const v = _fade(yf);
    const w = _fade(zf);

    const A = _perm[X] + Y;
    const AA = _perm[A] + Z;
    const AB = _perm[A + 1] + Z;
    const B = _perm[X + 1] + Y;
    const BA = _perm[B] + Z;
    const BB = _perm[B + 1] + Z;

    const g = (hash, dx, dy, dz) => {
      const gr = _grad3[hash % 12];
      return gr[0] * dx + gr[1] * dy + gr[2] * dz;
    };

    return _lerp(
      _lerp(
        _lerp(g(_perm[AA], xf, yf, zf), g(_perm[BA], xf - 1, yf, zf), u),
        _lerp(g(_perm[AB], xf, yf - 1, zf), g(_perm[BB], xf - 1, yf - 1, zf), u),
        v
      ),
      _lerp(
        _lerp(g(_perm[AA + 1], xf, yf, zf - 1), g(_perm[BA + 1], xf - 1, yf, zf - 1), u),
        _lerp(g(_perm[AB + 1], xf, yf - 1, zf - 1), g(_perm[BB + 1], xf - 1, yf - 1, zf - 1), u),
        v
      ),
      w
    );
  }

  function _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Perlin noise — returns value in [0, 1] range (centered ~0.5).
   * noise(x) — 1D, noise(x, y) — 2D, noise(x, y, z) — 3D.
   * Uses octaves and falloff set by noiseDetail().
   */
  function noise(x, y = 0, z = 0) {
    let total = 0;
    let amp = 1;
    let freq = 1;
    let maxAmp = 0;
    for (let i = 0; i < _noiseOctaves; i++) {
      total += _perlin3(x * freq, y * freq, z * freq) * amp;
      maxAmp += amp;
      amp *= _noiseFalloff;
      freq *= 2;
    }
    // Normalize to 0..1
    return (total / maxAmp + 1) * 0.5;
  }

  /** Set noise seed (integer). */
  function noiseSeed(seed) {
    _noiseSeed = seed;
    _initPerm(seed);
  }

  /** Set noise octaves and falloff. */
  function noiseDetail(octaves = 4, falloff = 0.5) {
    _noiseOctaves = Math.max(1, Math.min(8, octaves));
    _noiseFalloff = Math.max(0, Math.min(1, falloff));
  }

  /**
   * Generate a 2D noise map as Float32Array.
   * noiseMap(w, h, scale, offsetX, offsetY)
   */
  function noiseMap(w, h, scale = 0.02, offsetX = 0, offsetY = 0) {
    const data = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        data[y * w + x] = noise((x + offsetX) * scale, (y + offsetY) * scale);
      }
    }
    return data;
  }

  // ─── Transformation Matrix Stack ───────────────────────────────────────────

  // 2D affine: [a, b, tx, c, d, ty] — column-major-ish
  // [a c tx]   [x]   [ax + cy + tx]
  // [b d ty] × [y] = [bx + dy + ty]
  // [0 0  1]   [1]   [1           ]
  let _matStack = [];
  let _mat = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

  function _applyTransform(x, y) {
    return [_mat.a * x + _mat.c * y + _mat.tx, _mat.b * x + _mat.d * y + _mat.ty];
  }

  /** Save current transform. */
  function pushMatrix() {
    _matStack.push({ ..._mat });
  }

  /** Restore previous transform. */
  function popMatrix() {
    if (_matStack.length > 0) {
      _mat = _matStack.pop();
    }
  }

  /** Translate the coordinate origin. */
  function translate(x, y) {
    _mat.tx += _mat.a * x + _mat.c * y;
    _mat.ty += _mat.b * x + _mat.d * y;
  }

  /** Rotate coordinates by angle (radians). */
  function rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const { a, b, c, d } = _mat;
    _mat.a = a * cos + c * sin;
    _mat.b = b * cos + d * sin;
    _mat.c = a * -sin + c * cos;
    _mat.d = b * -sin + d * cos;
  }

  /** Scale coordinates. scale2d(s) for uniform, scale2d(sx, sy) for non-uniform. */
  function scale2d(sx, sy) {
    if (sy === undefined) sy = sx;
    _mat.a *= sx;
    _mat.b *= sx;
    _mat.c *= sy;
    _mat.d *= sy;
  }

  /** Reset transform to identity. */
  function resetMatrix() {
    _mat = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
    _matStack = [];
  }

  // ─── Shapes ────────────────────────────────────────────────────────────────

  /**
   * Draw an ellipse. ellipse(cx, cy, rx, ry, color, fill).
   * If ry is omitted, draws a circle.
   */
  function ellipse(cx, cy, rx, ry, color, fill = true) {
    if (ry === undefined) ry = rx;
    if (fill) {
      // Scanline fill
      for (let dy = -ry; dy <= ry; dy++) {
        const halfW = Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) * rx;
        for (let dx = -Math.ceil(halfW); dx <= Math.ceil(halfW); dx++) {
          _pset(cx + dx, cy + dy, color);
        }
      }
    } else {
      // Outline using parametric
      const steps = Math.max(32, Math.ceil(Math.max(rx, ry) * 4));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * TWO_PI;
        _pset(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), color);
      }
    }
  }

  // Legacy helper used by older carts such as movie-clock and camera-platformer.
  function ellipsefill(cx, cy, rx, ry, color) {
    ellipse(cx, cy, rx, ry, color, true);
  }

  /**
   * Draw an arc. arc(cx, cy, rx, ry, startAngle, endAngle, color, fill).
   * Angles in radians. Draws clockwise from start to end.
   */
  function arc(cx, cy, rx, ry, startAngle, endAngle, color, fill = false) {
    const steps = Math.max(32, Math.ceil(Math.max(rx, ry) * 4));
    const range = endAngle - startAngle;
    if (fill) {
      // Pie-slice fill: draw filled triangles from center
      for (let i = 0; i < steps; i++) {
        const a1 = startAngle + (i / steps) * range;
        const a2 = startAngle + ((i + 1) / steps) * range;
        const x1 = cx + Math.cos(a1) * rx;
        const y1 = cy + Math.sin(a1) * ry;
        const x2 = cx + Math.cos(a2) * rx;
        const y2 = cy + Math.sin(a2) * ry;
        // Fill triangle cx,cy → x1,y1 → x2,y2
        _fillTriangle(cx, cy, x1, y1, x2, y2, color);
      }
    } else {
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + (i / steps) * range;
        _pset(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), color);
      }
    }
  }

  function _fillTriangle(x0, y0, x1, y1, x2, y2, color) {
    // Simple scanline triangle fill
    let pts = [
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
    pts.sort((a, b) => a.y - b.y);

    const [p0, p1, p2] = pts;
    const totalHeight = p2.y - p0.y;
    if (totalHeight < 1) return;

    for (let y = Math.ceil(p0.y); y <= Math.floor(p2.y); y++) {
      const secondHalf = y > p1.y || p1.y === p0.y;
      const segH = secondHalf ? p2.y - p1.y : p1.y - p0.y;
      if (segH < 0.5) continue;

      const alpha = (y - p0.y) / totalHeight;
      const beta = secondHalf ? (y - p1.y) / segH : (y - p0.y) / segH;

      let xa = p0.x + (p2.x - p0.x) * alpha;
      let xb = secondHalf ? p1.x + (p2.x - p1.x) * beta : p0.x + (p1.x - p0.x) * beta;
      if (xa > xb) [xa, xb] = [xb, xa];

      for (let x = Math.ceil(xa); x <= Math.floor(xb); x++) {
        _pset(x, y, color);
      }
    }
  }

  /**
   * Draw a cubic bezier curve.
   * bezier(x0, y0, cx0, cy0, cx1, cy1, x1, y1, color, detail)
   */
  function bezier(x0, y0, cx0, cy0, cx1, cy1, x1, y1, color, detail = 60) {
    let prevX = x0,
      prevY = y0;
    for (let i = 1; i <= detail; i++) {
      const t = i / detail;
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const x = mt3 * x0 + 3 * mt2 * t * cx0 + 3 * mt * t2 * cx1 + t3 * x1;
      const y = mt3 * y0 + 3 * mt2 * t * cy0 + 3 * mt * t2 * cy1 + t3 * y1;
      _drawLine(prevX, prevY, x, y, color);
      prevX = x;
      prevY = y;
    }
  }

  /**
   * Draw a quadratic curve.
   * quadCurve(x0, y0, cx, cy, x1, y1, color, detail)
   */
  function quadCurve(x0, y0, cx, cy, x1, y1, color, detail = 40) {
    let prevX = x0,
      prevY = y0;
    for (let i = 1; i <= detail; i++) {
      const t = i / detail;
      const mt = 1 - t;
      const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      _drawLine(prevX, prevY, x, y, color);
      prevX = x;
      prevY = y;
    }
  }

  /** Internal Bresenham line for curve segments */
  function _drawLine(x0, y0, x1, y1, color) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      _pset(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // ─── Color Modes ───────────────────────────────────────────────────────────

  let _colorModeType = 'rgb'; // 'rgb' or 'hsb'
  let _colorMax = [255, 255, 255, 255]; // max values for each channel

  /**
   * Set color mode. colorMode('rgb') or colorMode('hsb').
   * Optional max values: colorMode('hsb', 360, 100, 100, 255)
   */
  function colorMode(mode, max1 = 255, max2, max3, maxA) {
    _colorModeType = mode.toLowerCase();
    if (max2 === undefined) {
      _colorMax = [max1, max1, max1, max1];
    } else {
      _colorMax = [max1, max2 || max1, max3 || max1, maxA || 255];
    }
  }

  /**
   * Create a color using current color mode.
   * color(v1, v2, v3, alpha)
   */
  function color(v1, v2, v3, a) {
    if (a === undefined) a = _colorMax[3];

    // Normalize to 0-1
    const n1 = v1 / _colorMax[0];
    const n2 = v2 / _colorMax[1];
    const n3 = v3 / _colorMax[2];
    const na = a / _colorMax[3];

    if (_colorModeType === 'hsb' || _colorModeType === 'hsv') {
      // HSB to RGB
      const h = (n1 * 360 + 360) % 360;
      const s = Math.max(0, Math.min(1, n2));
      const b = Math.max(0, Math.min(1, n3));
      const c = b * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = b - c;
      let r, g, bl;
      if (h < 60) [r, g, bl] = [c, x, 0];
      else if (h < 120) [r, g, bl] = [x, c, 0];
      else if (h < 180) [r, g, bl] = [0, c, x];
      else if (h < 240) [r, g, bl] = [0, x, c];
      else if (h < 300) [r, g, bl] = [x, 0, c];
      else [r, g, bl] = [c, 0, x];
      return rgba8((r + m) * 255, (g + m) * 255, (bl + m) * 255, na * 255);
    }

    // RGB mode
    return rgba8(n1 * 255, n2 * 255, n3 * 255, na * 255);
  }

  /**
   * Create HSB color directly (convenience).
   * hsb(hue, saturation, brightness, alpha)
   * hue: 0-360, saturation: 0-1, brightness: 0-1, alpha: 0-255
   */
  function hsb(h, s = 1, b = 1, a = 255) {
    h = ((h % 360) + 360) % 360;
    const c = b * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = b - c;
    let r, g, bl;
    if (h < 60) [r, g, bl] = [c, x, 0];
    else if (h < 120) [r, g, bl] = [x, c, 0];
    else if (h < 180) [r, g, bl] = [0, c, x];
    else if (h < 240) [r, g, bl] = [0, x, c];
    else if (h < 300) [r, g, bl] = [x, 0, c];
    else [r, g, bl] = [c, 0, x];
    return rgba8((r + m) * 255, (g + m) * 255, (bl + m) * 255, a);
  }

  /**
   * Interpolate between two colors. lerpColor(c1, c2, t).
   * Works correctly regardless of color mode.
   */
  function lerpColor(c1, c2, t) {
    const a = _unpackColor(c1);
    const b = _unpackColor(c2);
    return _packColor(
      a.r + (b.r - a.r) * t,
      a.g + (b.g - a.g) * t,
      a.b + (b.b - a.b) * t,
      a.a + (b.a - a.a) * t
    );
  }

  function _packColor(r, g, b, a) {
    return (
      (BigInt(Math.round(r)) << 48n) |
      (BigInt(Math.round(g)) << 32n) |
      (BigInt(Math.round(b)) << 16n) |
      BigInt(Math.round(a))
    );
  }

  // ─── Easing Functions ──────────────────────────────────────────────────────

  const _easings = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInCubic: t => t * t * t,
    easeOutCubic: t => --t * t * t + 1,
    easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
    easeInElastic: t =>
      t === 0
        ? 0
        : t === 1
          ? 1
          : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
    easeOutElastic: t =>
      t === 0
        ? 0
        : t === 1
          ? 1
          : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
    easeOutBounce: t => {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
  };

  /**
   * Apply an easing function. ease(t, type).
   * Types: 'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
   *        'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
   *        'easeInElastic', 'easeOutElastic', 'easeOutBounce'
   */
  function ease(t, type = 'easeInOutQuad') {
    const fn = _easings[type] || _easings.linear;
    return fn(Math.max(0, Math.min(1, t)));
  }

  /** Hermite smoothstep interpolation. */
  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // ─── Flow Field ────────────────────────────────────────────────────────────

  /**
   * Generate a 2D flow field (array of angle values driven by noise).
   * flowField(cols, rows, scale, time)
   * Returns Float32Array of angles in radians.
   */
  function flowField(cols, rows, scale = 0.06, time = 0) {
    const field = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = noise(x * scale, y * scale, time);
        field[y * cols + x] = n * TWO_PI * 2;
      }
    }
    return field;
  }

  // ─── expose ────────────────────────────────────────────────────────────────

  return {
    _advanceFrame,
    exposeTo(target) {
      Object.assign(target, {
        // Constants
        TWO_PI,
        HALF_PI,
        QUARTER_PI,

        // Noise
        noise,
        noiseSeed,
        noiseDetail,
        noiseMap,

        // Shapes
        ellipse,
        ellipsefill,
        arc,
        bezier,
        quadCurve,

        // Transform stack
        pushMatrix,
        popMatrix,
        translate,
        rotate,
        scale2d,
        resetMatrix,

        // Color
        colorMode,
        color,
        hsb,
        lerpColor,

        // Math
        ease,
        smoothstep,

        // Generators
        flowField,
      });

      // frameCount as getter
      Object.defineProperty(target, 'frameCount', {
        get: () => _frameCount,
        configurable: true,
      });
    },
  };
}
