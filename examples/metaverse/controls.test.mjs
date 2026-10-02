// Focused test for the controls plugin's touch handling (mobile joystick + look),
// driving it with a hand-built context so it's independent of any backend.
// Run: node controls.test.mjs

import { controlsPlugin } from './plugins/controls.js';

const assert = (c, m) => {
  if (!c) {
    console.error('FAIL controls:', m);
    process.exit(1);
  }
};

// A fake app context capturing the movement/look intents the plugin writes.
function makeCtx(touchList) {
  return {
    typing: false,
    local: { mode: 'first' },
    pointers: [],
    move: { forward: 0, strafe: 0 },
    yaw: 0,
    pitch: 0,
    input: {
      key: () => false,
      touches: () => touchList(),
      isConsumed: id => id === 'ui', // pretend touch id 'ui' is over a button
    },
    setMove(f, s) {
      this.move = { forward: f, strafe: s };
    },
    addYaw(d) {
      this.yaw += d;
    },
    addPitch(d) {
      this.pitch += d;
    },
    toggleCamera() {
      this.local.mode = this.local.mode === 'first' ? 'third' : 'first';
    },
  };
}

// --- Left-half drag = joystick → forward movement ---------------------------
let touchSet = [];
const ctx = makeCtx(() => touchSet);
const plug = controlsPlugin();

// Frame 1: a finger lands in the left zone — establishes the joystick origin.
touchSet = [{ id: 1, x: 70, y: 250 }];
plug.update(0.016, ctx);
assert(
  ctx.move.forward === 0 && ctx.move.strafe === 0,
  'no movement on the frame the joystick is centered'
);

// Frame 2: same finger pushed straight up by one radius → full forward.
touchSet = [{ id: 1, x: 70, y: 250 - 48 }];
plug.update(0.016, ctx);
assert(ctx.move.forward > 0.9, 'pushing the joystick up drives forward');
assert(Math.abs(ctx.move.strafe) < 0.01, 'straight-up joystick has no strafe');

// --- Right-half drag = look (changes yaw/pitch) -----------------------------
const ctx2 = makeCtx(() => touchSet);
const plug2 = controlsPlugin();
touchSet = [{ id: 2, x: 500, y: 180 }];
plug2.update(0.016, ctx2); // establish look anchor
const yaw0 = ctx2.yaw;
touchSet = [{ id: 2, x: 540, y: 180 }];
plug2.update(0.016, ctx2);
assert(ctx2.yaw !== yaw0, 'right-zone drag changes yaw (look)');

// --- A touch consumed by UI is ignored by world controls --------------------
const ctx3 = makeCtx(() => touchSet);
const plug3 = controlsPlugin();
touchSet = [{ id: 'ui', x: 70, y: 250 }];
plug3.update(0.016, ctx3);
touchSet = [{ id: 'ui', x: 70, y: 250 - 48 }];
plug3.update(0.016, ctx3);
assert(ctx3.move.forward === 0, 'a UI-consumed touch never becomes a joystick');

// --- While typing, controls are fully suppressed ----------------------------
const ctx4 = makeCtx(() => [{ id: 3, x: 70, y: 200 }]);
ctx4.typing = true;
const plug4 = controlsPlugin();
plug4.update(0.016, ctx4);
assert(ctx4.move.forward === 0 && ctx4.move.strafe === 0, 'typing suppresses movement');

console.log('PASS controls: touch joystick + drag-look + UI-skip + typing-suppression');
process.exit(0);
