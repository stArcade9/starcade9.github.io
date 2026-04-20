// runtime/api-filters.js
// CSS/Canvas2D filter effects for Nova64 stage rendering.
//
// Filters are applied by wrapping draw calls in withFilter().
// For complex effects, an OffscreenCanvas is used to isolate the render.
//
// Cart usage:
//   // Simple CSS filter string:
//   withFilter('blur(4px)', () => { spr(0, 100, 100); });
//
//   // Built-in filter builders:
//   withFilter(F.blur(4), () => { drawClip(waterClip, wx, wy); });
//   withFilter(F.glow(0xff8800, 8), () => { spr(starId, sx, sy); });
//
// Filter constants:
//   F.blur(px)              - Gaussian blur
//   F.brightness(v)         - 0.0 = black, 1.0 = normal, 2.0 = double bright
//   F.contrast(v)           - 0.0 = grey, 1.0 = normal
//   F.grayscale(v)          - 0.0..1.0
//   F.sepia(v)              - 0.0..1.0
//   F.saturate(v)           - 0.0..1.0 (de-saturate)
//   F.hueRotate(deg)        - hue rotation in degrees
//   F.invert(v)             - 0.0..1.0
//   F.opacity(v)            - 0.0..1.0
//   F.glow(color, radius)   - drop-shadow glow (0xRRGGBB, px)
//   F.shadow(color,dx,dy,r) - drop-shadow with offset
//   F.combine(...filters)   - compose multiple filter strings

/** Preset filter builders — all return CSS filter strings */
export const F = Object.freeze({
  blur: px => `blur(${px}px)`,
  brightness: v => `brightness(${v})`,
  contrast: v => `contrast(${v})`,
  grayscale: (v = 1) => `grayscale(${v})`,
  sepia: (v = 1) => `sepia(${v})`,
  saturate: v => `saturate(${v})`,
  hueRotate: deg => `hue-rotate(${deg}deg)`,
  invert: (v = 1) => `invert(${v})`,
  opacity: v => `opacity(${v})`,
  glow: (color, radius = 8) => {
    const tr = (color >> 16) & 0xff;
    const tg = (color >> 8) & 0xff;
    const tb = color & 0xff;
    const hex = `rgba(${tr},${tg},${tb},1)`;
    return `drop-shadow(0 0 ${radius}px ${hex})`;
  },
  shadow: (color, dx = 2, dy = 2, radius = 4) => {
    const tr = (color >> 16) & 0xff;
    const tg = (color >> 8) & 0xff;
    const tb = color & 0xff;
    return `drop-shadow(${dx}px ${dy}px ${radius}px rgba(${tr},${tg},${tb},0.8))`;
  },
  combine: (...filters) => filters.join(' '),
});

// ─── colorMatrix — apply a 4x5 RGBA colour matrix transformation ─────────────
// Matrices are arrays of 20 numbers: [R R R R Rb  G G G G Gb  B B B B Bb  A A A A Ab]
export const CM = Object.freeze({
  identity: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  grayscale: [
    0.33, 0.59, 0.11, 0, 0, 0.33, 0.59, 0.11, 0, 0, 0.33, 0.59, 0.11, 0, 0, 0, 0, 0, 1, 0,
  ],
  sepia: [
    0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131, 0, 0, 0, 0, 0, 1, 0,
  ],
  invert: [-1, 0, 0, 0, 255, 0, -1, 0, 0, 255, 0, 0, -1, 0, 255, 0, 0, 0, 1, 0],
  nightVision: [0.1, 0.4, 0.1, 0, 0, 0.1, 0.8, 0.1, 0, 0, 0.1, 0.4, 0.1, 0, 0, 0, 0, 0, 1, 0],
  warmth: [1.2, 0, 0, 0, 10, 0, 1.0, 0, 0, -5, 0, 0, 0.8, 0, -10, 0, 0, 0, 1, 0],
});

/**
 * applyColorMatrix — apply a 4×5 colour matrix to a snapshot of the stage canvas.
 * Captures a region (or whole canvas), transforms it pixel-by-pixel, and blits back.
 * This is CPU-side, so use sparingly on large areas.
 *
 * @param {GpuThreeJS} gpu
 * @param {number[]} matrix  - 20-element colour matrix
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @param {number} [w]       - defaults to canvas width
 * @param {number} [h]       - defaults to canvas height
 */
function _applyColorMatrix(gpu, matrix, x = 0, y = 0, w, h) {
  const ctx = gpu?.getStageCtx?.();
  if (!ctx) return;
  w = w ?? ctx.canvas.width;
  h = h ?? ctx.canvas.height;
  const src = ctx.getImageData(x, y, w, h);
  const d = src.data;
  const [
    m00,
    m01,
    m02,
    m03,
    m04,
    m10,
    m11,
    m12,
    m13,
    m14,
    m20,
    m21,
    m22,
    m23,
    m24,
    m30,
    m31,
    m32,
    m33,
    m34,
  ] = matrix;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2],
      a = d[i + 3];
    d[i] = Math.max(0, Math.min(255, m00 * r + m01 * g + m02 * b + m03 * a + m04));
    d[i + 1] = Math.max(0, Math.min(255, m10 * r + m11 * g + m12 * b + m13 * a + m14));
    d[i + 2] = Math.max(0, Math.min(255, m20 * r + m21 * g + m22 * b + m23 * a + m24));
    d[i + 3] = Math.max(0, Math.min(255, m30 * r + m31 * g + m32 * b + m33 * a + m34));
  }
  ctx.putImageData(src, x, y);
}

export function filtersApi(gpu) {
  /**
   * withFilter — draw with a CSS filter string.
   * fn receives the stage CanvasRenderingContext2D.
   *
   * @param {string} filter   - CSS filter string (use F.* helpers)
   * @param {function} fn     - Drawing callback; receives ctx
   */
  function withFilter(filter, fn) {
    const ctx = gpu?.getStageCtx?.();
    if (!ctx) {
      fn?.(null);
      return;
    }
    ctx.save();
    ctx.filter = filter;
    try {
      fn(ctx);
    } finally {
      ctx.restore();
    }
  }

  /**
   * withColorMatrix — apply a 4×5 colour-matrix effect to a draw callback.
   * Renders fn() to an OffscreenCanvas, then applies the matrix and blits to stage.
   *
   * @param {number[]} matrix  - 20-element colour matrix (use CM.* constants)
   * @param {function} fn      - Drawing callback (draws to an OffscreenCanvas ctx)
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  function withColorMatrix(matrix, fn, x, y, w, h) {
    const ctx = gpu?.getStageCtx?.();
    if (!ctx) {
      fn?.(null);
      return;
    }

    x = x ?? 0;
    y = y ?? 0;
    w = w ?? ctx.canvas.width;
    h = h ?? ctx.canvas.height;

    // Render into OffscreenCanvas
    const oc = new OffscreenCanvas(w, h);
    const oc2 = oc.getContext('2d');
    fn(oc2);

    // Apply matrix to OffscreenCanvas pixels
    const src = oc2.getImageData(0, 0, w, h);
    const d = src.data;
    const [
      m00,
      m01,
      m02,
      m03,
      m04,
      m10,
      m11,
      m12,
      m13,
      m14,
      m20,
      m21,
      m22,
      m23,
      m24,
      m30,
      m31,
      m32,
      m33,
      m34,
    ] = matrix;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2],
        a = d[i + 3];
      d[i] = Math.max(0, Math.min(255, m00 * r + m01 * g + m02 * b + m03 * a + m04));
      d[i + 1] = Math.max(0, Math.min(255, m10 * r + m11 * g + m12 * b + m13 * a + m14));
      d[i + 2] = Math.max(0, Math.min(255, m20 * r + m21 * g + m22 * b + m23 * a + m24));
      d[i + 3] = Math.max(0, Math.min(255, m30 * r + m31 * g + m32 * b + m33 * a + m34));
    }
    oc2.putImageData(src, 0, 0);

    // Blit to stage canvas
    ctx.drawImage(oc, x, y);
  }

  function applyColorMatrix(matrix, x, y, w, h) {
    _applyColorMatrix(gpu, matrix, x, y, w, h);
  }

  return {
    exposeTo(target) {
      Object.assign(target, { F, CM, withFilter, withColorMatrix, applyColorMatrix });
    },
  };
}
