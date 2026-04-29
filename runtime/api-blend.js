// runtime/api-blend.js
// Canvas2D blend mode constants and helpers for Nova64 stage rendering.
//
// Cart usage:
//   setBlendMode(BM.ADD);
//   spr(0, 100, 100);         // drawn with additive blend
//   resetBlendMode();
//
//   withBlend(BM.SCREEN, (ctx) => {
//     spr(1, 200, 200);
//   });

/** Blend mode constants (Canvas2D globalCompositeOperation strings) */
export const BM = Object.freeze({
  NORMAL: 'source-over',
  ADD: 'lighter',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  OVERLAY: 'overlay',
  DARKEN: 'darken',
  LIGHTEN: 'lighten',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity',
  ERASE: 'destination-out',
  NONE: 'source-over', // alias for NORMAL
});

export function blendApi(gpu) {
  function _ctx() {
    return gpu.getStageCtx?.();
  }

  /** Set the active blend mode on the stage canvas */
  function setBlendMode(mode) {
    const ctx = _ctx();
    if (ctx) ctx.globalCompositeOperation = mode;
  }

  /** Restore the stage canvas to normal (source-over) blending */
  function resetBlendMode() {
    const ctx = _ctx();
    if (ctx) ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Run fn() with a temporary blend mode, then restore.
   * fn receives the stage CanvasRenderingContext2D as its argument.
   *
   * @param {string} mode  - A BM.* constant
   * @param {function} fn  - Drawing callback; receives ctx
   */
  function withBlend(mode, fn) {
    const ctx = _ctx();
    if (!ctx) {
      fn(null);
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = mode;
    try {
      fn(ctx);
    } finally {
      ctx.restore();
    }
  }

  /**
   * Run fn() with a temporary alpha, then restore.
   * fn receives the stage CanvasRenderingContext2D.
   */
  function withAlpha(alpha, fn) {
    const ctx = _ctx();
    if (!ctx) {
      fn(null);
      return;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    try {
      fn(ctx);
    } finally {
      ctx.restore();
    }
  }

  return {
    exposeTo(target) {
      Object.assign(target, { BM, setBlendMode, resetBlendMode, withBlend, withAlpha });
    },
  };
}
