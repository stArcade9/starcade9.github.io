// controls.js — movement + look input, desktop and mobile.
//
// Desktop: WASD/arrows move, Q/E or arrows turn, hold-and-drag mouse on the 3D
//          view to look, C toggles camera.
// Mobile:  left-half drag = virtual joystick (move), right-half drag = look,
//          plus a tappable Camera button. Reads nova64.input.touches() so move +
//          look work at once. Touches already consumed by UI (buttons) are
//          skipped so a button hold never doubles as a joystick.
//
// No pointer-lock: it hides the cursor and steals focus from the chat bar / UI.
// Drag-look keeps the cursor free so the always-present chat input stays usable.
// While the chat bar is focused (ctx.typing) movement/look is suppressed.
//
// Writes movement intents through the app context (ctx.setMove/addYaw/addPitch/
// toggleCamera) — never touches the backend or net directly.

import { Panel, Button } from '../core/ui.js';

const JOY_RADIUS = 48;
const LOOK_SENS_TOUCH = 0.008;
const LOOK_SENS_MOUSE = 0.012;
const TURN_KEY = 2.2;

export function controlsPlugin() {
  let prevC = false;
  let joyId = null;
  let joyOrigin = { x: 0, y: 0 };
  let joyCur = { x: 0, y: 0 };
  let lookId = null;
  let lookLast = { x: 0, y: 0 };
  let hasTouched = false;
  let dragging = false;
  let lastMouse = { x: 0, y: 0 };

  return {
    id: 'controls',

    update(dt, ctx) {
      // Suppress all control input while the chat bar has focus.
      if (ctx.typing) {
        ctx.setMove(0, 0);
        return;
      }

      // Camera toggle (edge).
      const cNow = ctx.input.key('KeyC');
      if (cNow && !prevC) ctx.toggleCamera();
      prevC = cNow;

      // Keyboard turn + move.
      if (ctx.input.key('KeyQ', 'ArrowLeft')) ctx.addYaw(TURN_KEY * dt);
      if (ctx.input.key('KeyE', 'ArrowRight')) ctx.addYaw(-TURN_KEY * dt);
      let forward = 0;
      let strafe = 0;
      if (ctx.input.key('KeyW', 'ArrowUp')) forward += 1;
      if (ctx.input.key('KeyS', 'ArrowDown')) forward -= 1;
      if (ctx.input.key('KeyD')) strafe -= 1;
      if (ctx.input.key('KeyA')) strafe += 1;

      // Desktop drag-look: hold the mouse on the 3D view (not over UI) and move.
      const mp = (ctx.pointers || []).find(p => p.id === 'mouse');
      if (mp && mp.down && !ctx.input.isConsumed('mouse')) {
        if (dragging) {
          ctx.addYaw(-(mp.x - lastMouse.x) * LOOK_SENS_MOUSE);
          ctx.addPitch(-(mp.y - lastMouse.y) * LOOK_SENS_MOUSE);
        }
        lastMouse = { x: mp.x, y: mp.y };
        dragging = true;
      } else {
        dragging = false;
      }

      // Touch: partition into joystick (left) + look (right), skipping UI.
      const touches = ctx.input.touches().filter(t => !ctx.input.isConsumed(t.id));
      if (touches.length > 0) hasTouched = true;
      const ids = new Set(touches.map(t => t.id));
      if (joyId != null && !ids.has(joyId)) joyId = null;
      if (lookId != null && !ids.has(lookId)) lookId = null;

      for (const t of touches) {
        if (t.id === joyId || t.id === lookId) continue;
        if (t.x < 320 && joyId == null) {
          joyId = t.id;
          joyOrigin = { x: t.x, y: t.y };
          joyCur = { x: t.x, y: t.y };
        } else if (t.x >= 320 && lookId == null) {
          lookId = t.id;
          lookLast = { x: t.x, y: t.y };
        }
      }

      if (joyId != null) {
        const t = touches.find(p => p.id === joyId);
        if (t) {
          joyCur = { x: t.x, y: t.y };
          let vx = (t.x - joyOrigin.x) / JOY_RADIUS;
          let vy = (t.y - joyOrigin.y) / JOY_RADIUS;
          const mag = Math.hypot(vx, vy);
          if (mag > 1) {
            vx /= mag;
            vy /= mag;
          }
          forward = -vy; // up = forward
          strafe = -vx; // right drag = strafe right
        }
      }
      if (lookId != null) {
        const t = touches.find(p => p.id === lookId);
        if (t) {
          ctx.addYaw(-(t.x - lookLast.x) * LOOK_SENS_TOUCH);
          ctx.addPitch(-(t.y - lookLast.y) * LOOK_SENS_TOUCH);
          lookLast = { x: t.x, y: t.y };
        }
      }

      ctx.setMove(forward, strafe);
    },

    renderUI(ctx) {
      const nodes = [];
      // Camera toggle button (top-right, clear of the bottom chat bar).
      nodes.push(
        Panel({ x: 8, y: 8, anchor: 'tr', bg: 0x00000000 }, [
          Button({
            id: 'cam',
            label: ctx.local.mode === 'first' ? 'CAM:1st' : 'CAM:3rd',
            onTap: () => ctx.toggleCamera(),
          }),
        ])
      );
      // Mobile joystick visual (only once touch has been used).
      if (hasTouched) {
        const base = joyId != null ? joyOrigin : { x: 70, y: 250 };
        const knob = joyId != null ? joyCur : base;
        nodes.push({
          measure: () => ({ w: 0, h: 0 }),
          paint: c2 => {
            c2.backend.drawCircle(base.x, base.y, JOY_RADIUS, 0x44ffffff, false);
            c2.backend.drawCircle(knob.x, knob.y, 16, 0x99ffffff, true);
          },
        });
      }
      return nodes;
    },
  };
}
