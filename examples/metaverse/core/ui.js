// ui.js — a tiny, composable, Radix-inspired UI primitive set.
//
// Components are plain factory functions returning nodes with measure(ctx) and
// paint(ctx, x, y, hits) methods. A node tree is laid out and rasterized through
// the active RenderBackend's 2D ops, and Buttons/TextFields are hit-tested
// against a unified pointer set (mouse + touch) so they behave identically on
// desktop and mobile. Colors are 0xAARRGGBB (alpha high byte; omit for opaque).
//
// This layer never imports nova64 — it only calls backend.{drawRect,drawText,
// drawCircle,measureText,viewport}. That keeps it portable to Godot/XR backends.

export const defaultTheme = {
  fg: 0xffffffff,
  dim: 0xffaab0cc,
  accent: 0xff66ffcc,
  panelBg: 0xcc0b1020,
  btnBg: 0xdd223044,
  btnBgActive: 0xff3a5570,
  btnFg: 0xffffffff,
  pad: 6,
  gap: 4,
  lineH: 12,
};

function textWidth(ctx, s) {
  if (ctx.backend.measureText) return ctx.backend.measureText(s);
  return String(s).length * 6; // fallback: ~6px glyphs
}

// ---- primitives ----------------------------------------------------------

export function Text(props) {
  const value = String(props.value == null ? '' : props.value);
  const color = props.color != null ? props.color : null;
  return {
    type: 'text',
    measure: ctx => ({ w: textWidth(ctx, value), h: ctx.theme.lineH }),
    paint: (ctx, x, y) => {
      ctx.backend.drawText(value, x, y, color != null ? color : ctx.theme.fg);
    },
  };
}

export function Spacer(props) {
  const w = props && props.w ? props.w : 0;
  const h = props && props.h ? props.h : (props && props.size) || 4;
  return { type: 'spacer', measure: () => ({ w, h }), paint: () => {} };
}

export function Button(props) {
  const label = String(props.label == null ? '' : props.label);
  return {
    type: 'button',
    id: props.id || label,
    onTap: props.onTap,
    active: !!props.active,
    measure: ctx => ({
      w: textWidth(ctx, label) + ctx.theme.pad * 2,
      h: ctx.theme.lineH + ctx.theme.pad,
    }),
    paint: (ctx, x, y, hits) => {
      const w = textWidth(ctx, label) + ctx.theme.pad * 2;
      const h = ctx.theme.lineH + ctx.theme.pad;
      ctx.backend.drawRect(x, y, w, h, props.active ? ctx.theme.btnBgActive : ctx.theme.btnBg);
      ctx.backend.drawText(
        label,
        x + ctx.theme.pad,
        y + (h - ctx.theme.lineH) / 2,
        ctx.theme.btnFg
      );
      hits.push({ id: props.id || label, onTap: props.onTap, x, y, w, h });
    },
  };
}

export function TextField(props) {
  const value = String(props.value == null ? '' : props.value);
  const placeholder = String(props.placeholder == null ? '' : props.placeholder);
  const w = props.w || 200;
  return {
    type: 'textfield',
    measure: ctx => ({ w, h: ctx.theme.lineH + ctx.theme.pad }),
    paint: (ctx, x, y) => {
      const h = ctx.theme.lineH + ctx.theme.pad;
      ctx.backend.drawRect(x, y, w, h, ctx.theme.btnBg);
      const shown = value || placeholder;
      ctx.backend.drawText(
        shown,
        x + ctx.theme.pad,
        y + (h - ctx.theme.lineH) / 2,
        value ? ctx.theme.fg : ctx.theme.dim
      );
    },
  };
}

export function List(props) {
  const items = (props.items || []).map(String);
  const color = props.color != null ? props.color : null;
  return {
    type: 'list',
    measure: ctx => ({
      w: items.reduce((m, s) => Math.max(m, textWidth(ctx, s)), 0),
      h: items.length * ctx.theme.lineH,
    }),
    paint: (ctx, x, y) => {
      items.forEach((s, i) =>
        ctx.backend.drawText(s, x, y + i * ctx.theme.lineH, color != null ? color : ctx.theme.fg)
      );
    },
  };
}

// Stack container — vertical (Col) or horizontal (Row).
function stack(dir, props, children) {
  children = (children || []).filter(Boolean);
  const gapOf = ctx => (props.gap != null ? props.gap : ctx.theme.gap);
  return {
    type: dir,
    measure: ctx => {
      const gap = gapOf(ctx);
      let w = 0;
      let h = 0;
      children.forEach((c, i) => {
        const m = c.measure(ctx);
        if (dir === 'col') {
          w = Math.max(w, m.w);
          h += m.h + (i > 0 ? gap : 0);
        } else {
          h = Math.max(h, m.h);
          w += m.w + (i > 0 ? gap : 0);
        }
      });
      return { w, h };
    },
    paint: (ctx, x, y, hits) => {
      const gap = gapOf(ctx);
      let cx = x;
      let cy = y;
      children.forEach(c => {
        c.paint(ctx, cx, cy, hits);
        const m = c.measure(ctx);
        if (dir === 'col') cy += m.h + gap;
        else cx += m.w + gap;
      });
    },
  };
}

export function Col(props, children) {
  return stack('col', props || {}, children);
}
export function Row(props, children) {
  return stack('row', props || {}, children);
}

// Panel — an absolutely-placed, padded, translucent container (a Col inside).
// props: { x, y, anchor:'tl'|'tr'|'bl'|'br', w?, bg? }
export function Panel(props, children) {
  const inner = Col({ gap: props.gap }, children);
  return {
    type: 'panel',
    _props: props,
    measure: ctx => {
      const m = inner.measure(ctx);
      const pad = props.pad != null ? props.pad : ctx.theme.pad;
      return { w: (props.w || m.w) + pad * 2, h: m.h + pad * 2 };
    },
    paint: (ctx, _x, _y, hits) => {
      const pad = props.pad != null ? props.pad : ctx.theme.pad;
      const m = inner.measure(ctx);
      const w = (props.w || m.w) + pad * 2;
      const h = m.h + pad * 2;
      const vp = ctx.backend.viewport();
      const anchor = props.anchor || 'tl';
      let x = props.x || 0;
      let y = props.y || 0;
      if (anchor[1] === 'r') x = vp.w - w - (props.x || 0);
      if (anchor[0] === 'b') y = vp.h - h - (props.y || 0);
      ctx.backend.drawRect(x, y, w, h, props.bg != null ? props.bg : ctx.theme.panelBg);
      inner.paint(ctx, x + pad, y + pad, hits);
    },
  };
}

// Render a list of root nodes and fire onTap for any button a pointer pressed.
// pointers: [{ x, y, pressed, id }]  (pressed = down-edge this frame). Returns
// the set of pointer ids consumed by UI (so world controls can ignore them).
export function renderUI(roots, ctx, pointers) {
  const hits = [];
  (roots || []).filter(Boolean).forEach(node => node.paint(ctx, 0, 0, hits));
  const consumed = new Set();
  (pointers || []).forEach(p => {
    if (!p.pressed) {
      // Still mark touches that merely rest on a button as consumed, so the
      // controls plugin won't treat a button-hold as a joystick/look drag.
      for (const b of hits) {
        if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
          if (p.id != null) consumed.add(p.id);
          break;
        }
      }
      return;
    }
    for (const b of hits) {
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
        if (p.id != null) consumed.add(p.id);
        if (typeof b.onTap === 'function') b.onTap();
        break;
      }
    }
  });
  return consumed;
}
