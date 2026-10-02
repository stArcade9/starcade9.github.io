// minimap.js — a top-down radar of the shared world.
//
// Plots every avatar (you + others) into a small framed box in a screen corner,
// north-up, with a heading pip showing which way you face. Pure UI over the app
// context + backend 2D ops (no nova64/net access), so it runs on any render
// backend. A clean demonstration of the plugin seam: add spatial awareness by
// writing one module and `use()`-ing it — nothing else changes.

const DEFAULTS = { size: 92, margin: 10, range: 40 }; // range = world half-extent shown

// Read a peer's avatar color out of their data blob; fall back to a dim dot.
function peerColor(dataStr, fallback) {
  try {
    const c = JSON.parse(dataStr || '{}').color;
    return Number.isFinite(c) ? c >>> 0 : fallback;
  } catch (_) {
    return fallback;
  }
}

export function minimapPlugin(opts = {}) {
  const cfg = Object.assign({}, DEFAULTS, opts);

  return {
    id: 'minimap',

    renderUI(ctx) {
      const theme = ctx.theme;
      const { size, margin, range } = cfg;
      return [
        {
          measure: () => ({ w: 0, h: 0 }),
          paint: c2 => {
            const b = c2.backend;
            const vp = b.viewport();
            const x0 = vp.w - size - margin; // bottom-right corner
            const y0 = vp.h - size - margin;

            // Frame + caption.
            b.drawRect(x0 - 2, y0 - 2, size + 4, size + 4, 0xcc0b1020);
            b.drawText('MAP', x0, y0 - theme.lineH - 1, theme.dim);

            // World (x,z) → box pixels: +x right, +z down, clamped to the frame.
            const toMap = (wx, wz) => {
              const mx = Math.max(0, Math.min(1, (wx / range) * 0.5 + 0.5));
              const mz = Math.max(0, Math.min(1, (wz / range) * 0.5 + 0.5));
              return { x: x0 + mx * size, y: y0 + mz * size };
            };

            // Other players, tinted by their chosen color.
            ctx.others.forEach(o => {
              const p = toMap(o.x, o.z);
              b.drawCircle(p.x, p.y, 2, peerColor(o.data, theme.dim), true);
            });

            // You — a brighter dot plus a heading pip in your facing direction.
            const me = toMap(ctx.local.x, ctx.local.z);
            b.drawCircle(me.x, me.y, 3, theme.accent, true);
            const fx = Math.sin(ctx.local.yaw);
            const fz = Math.cos(ctx.local.yaw);
            b.drawCircle(me.x + fx * 7, me.y + fz * 7, 1.5, theme.accent, true);
          },
        },
      ];
    },
  };
}
