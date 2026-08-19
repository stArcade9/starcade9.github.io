// presence.js — who's here, made visible in the world.
//
// Two pieces of "presence", both pure UI over seams the app already exposes:
//   1. Floating name tags pinned above every avatar, projected from the 3D
//      world to 2D screen space via backend.worldToScreen (your own tag shows
//      only in third-person — in first-person the camera is inside your body).
//   2. Join/left toasts, driven by the onPeerJoin/onPeerLeave plugin hooks the
//      app fires when remote avatars spawn/despawn.
//
// It touches no nova64 globals and no net — only the app context + backend 2D
// ops — so it runs unchanged on any render backend (web/Godot/XR). If a backend
// doesn't implement worldToScreen, name tags are skipped; toasts still work.

const TAG_Y = 2.0; // world height of the tag, just above the ~0.9 avatar cube
const TOAST_LIFE = 4.0; // seconds a toast stays up
const MAX_TOASTS = 4;
// Distance fade so a crowd doesn't turn into a wall of labels: full opacity up
// close, fading to a floor by FAR, hidden past CULL.
const NEAR = 8;
const FAR = 42;
const CULL = 60;
const MIN_FADE = 0.18;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
// Replace the alpha byte of an 0xAARRGGBB color, scaled by `mul`.
function fadeColor(color, mul) {
  const base = (color >>> 24) & 0xff;
  const a = Math.max(0, Math.min(255, Math.round(base * mul)));
  return ((a << 24) | (color & 0xffffff)) >>> 0;
}

export function presencePlugin() {
  const toasts = []; // [{ text, t }]

  function pushToast(text) {
    toasts.push({ text, t: 0 });
    while (toasts.length > MAX_TOASTS) toasts.shift();
  }

  function drawTag(b, theme, wx, wz, name) {
    if (!b.worldToScreen) return;
    const p = b.worldToScreen(wx, TAG_Y, wz);
    if (!p.visible || p.dist > CULL) return;
    // 1 near, easing to MIN_FADE by FAR.
    const fade = MIN_FADE + (1 - MIN_FADE) * clamp01((FAR - p.dist) / (FAR - NEAR));
    const label = String(name || '????');
    const w = b.measureText ? b.measureText(label) : label.length * 6;
    const x = Math.round(p.x - w / 2);
    const y = Math.round(p.y);
    b.drawRect(x - 3, y - 2, w + 6, theme.lineH + 4, fadeColor(0xcc0b1020, fade));
    b.drawText(label, x, y, fadeColor(theme.fg, fade));
  }

  return {
    id: 'presence',

    onPeerJoin(_id, info) {
      pushToast((info && info.name ? info.name : 'someone') + ' joined');
    },
    onPeerLeave(_id, info) {
      pushToast((info && info.name ? info.name : 'someone') + ' left');
    },

    update(dt) {
      for (let i = toasts.length - 1; i >= 0; i--) {
        toasts[i].t += dt;
        if (toasts[i].t >= TOAST_LIFE) toasts.splice(i, 1);
      }
    },

    renderUI(ctx) {
      const theme = ctx.theme;
      return [
        {
          measure: () => ({ w: 0, h: 0 }),
          paint: c2 => {
            const b = c2.backend;
            // Name tags over every remote avatar…
            ctx.others.forEach(o => drawTag(b, theme, o.x, o.z, o.name));
            // …and over yourself when the camera is pulled back.
            if (ctx.local.mode === 'third') {
              const myName = typeof ctx.displayName === 'function' ? ctx.displayName() : 'you';
              drawTag(b, theme, ctx.local.x, ctx.local.z, myName);
            }
            // Join/left toasts, centered near the top, newest at the bottom of
            // the stack, fading out as they age.
            toasts.forEach((toast, i) => {
              const label = toast.text;
              const w = b.measureText ? b.measureText(label) : label.length * 6;
              const x = Math.round(320 - w / 2);
              const y = 26 + i * 16;
              const fade = Math.min(1, ((TOAST_LIFE - toast.t) / TOAST_LIFE) * 1.5);
              const a = Math.max(0, Math.min(255, Math.round(255 * fade)));
              const bg = ((Math.round(a * 0.8) << 24) | 0x0b1020) >>> 0;
              const fg = ((a << 24) | 0x66ffcc) >>> 0;
              b.drawRect(x - 5, y - 2, w + 10, theme.lineH + 4, bg);
              b.drawText(label, x, y, fg);
            });
          },
        },
      ];
    },
  };
}
