// runtime/camera-2d.js
// 2D camera system for Nova64 stage rendering.
//
// The Camera2D applies a global transform to the stage canvas so the world
// appears panned, zoomed, and rotated from a virtual viewport.
//
// Cart usage:
//   let cam;
//   export function init() {
//     cam = createCamera2D({ x: 0, y: 0, zoom: 1 });
//   }
//   export function update(dt) {
//     cam2DFollow(cam, player.x, player.y, dt, 0.08);
//     updateCamera2D(cam, dt);
//   }
//   export function draw() {
//     beginCamera2D(cam);   // push camera transform onto stage ctx
//     // ... draw world objects ...
//     endCamera2D(cam);     // pop
//     // ... draw HUD (not affected by camera) ...
//   }

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * createCamera2D — create a new 2D camera.
 * @param {object} [opts]
 * @param {number} [opts.x=0]         world X the camera is looking at
 * @param {number} [opts.y=0]         world Y the camera is looking at
 * @param {number} [opts.zoom=1]      magnification (>1 = zoom in)
 * @param {number} [opts.rotation=0]  camera rotation in radians
 * @param {number} [opts.screenW]     viewport width (defaults to stage canvas width)
 * @param {number} [opts.screenH]     viewport height
 */
function createCamera2D(opts = {}) {
  return {
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    zoom: opts.zoom ?? 1,
    rotation: opts.rotation ?? 0,
    screenW: opts.screenW ?? null, // resolved at beginCamera2D time
    screenH: opts.screenH ?? null,
    // shake state
    _shakeX: 0,
    _shakeY: 0,
    _shakeMag: 0,
    _shakeDur: 0,
    _shakeTime: 0,
    // lerp target (used by cam2DFollow)
    _targetX: null,
    _targetY: null,
    _lerpFactor: 0.1,
  };
}

// ─── Apply & Restore transform ───────────────────────────────────────────────

/**
 * beginCamera2D — push the camera transform onto the stage canvas context.
 * Everything drawn after this call is in world space.
 * Must be paired with endCamera2D().
 */
function beginCamera2D(cam, gpu) {
  const ctx = gpu?.getStageCtx?.();
  if (!ctx) return;
  const sw = cam.screenW ?? ctx.canvas.width;
  const sh = cam.screenH ?? ctx.canvas.height;

  ctx.save();
  // Translate to screen centre, zoom, rotate, then offset by -camera position
  ctx.translate(sw * 0.5, sh * 0.5);
  ctx.scale(cam.zoom, cam.zoom);
  if (cam.rotation) ctx.rotate(cam.rotation);
  ctx.translate(-(cam.x + cam._shakeX), -(cam.y + cam._shakeY));
}

/**
 * endCamera2D — restore the canvas transform to screen space.
 */
function endCamera2D(cam, gpu) {
  const ctx = gpu?.getStageCtx?.();
  if (ctx) ctx.restore();
}

// ─── Shake ───────────────────────────────────────────────────────────────────

/**
 * cam2DShake — trigger a screen shake.
 * @param {Camera2D} cam
 * @param {number} magnitude  - pixels of shake at peak
 * @param {number} duration   - seconds
 */
function cam2DShake(cam, magnitude, duration) {
  cam._shakeMag = magnitude;
  cam._shakeDur = duration;
  cam._shakeTime = duration;
}

// ─── Follow ──────────────────────────────────────────────────────────────────

/**
 * cam2DFollow — smoothly follow a target position.
 * Call each update() before updateCamera2D().
 * @param {Camera2D} cam
 * @param {number} targetX
 * @param {number} targetY
 * @param {number} dt
 * @param {number} [lerpFactor=0.1]  0 = instant, values near 0 = smooth
 */
function cam2DFollow(cam, targetX, targetY, dt, lerpFactor) {
  if (lerpFactor !== undefined) cam._lerpFactor = lerpFactor;
  cam._targetX = targetX;
  cam._targetY = targetY;
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * updateCamera2D — advance camera state (lerp, shake).
 * Call from your cart's update(dt).
 */
function updateCamera2D(cam, dt) {
  // Lerp towards follow target
  if (cam._targetX !== null) {
    const a = 1 - Math.pow(1 - cam._lerpFactor, dt * 60);
    cam.x += (cam._targetX - cam.x) * a;
    cam.y += (cam._targetY - cam.y) * a;
  }

  // Advance shake
  if (cam._shakeTime > 0) {
    cam._shakeTime -= dt;
    const progress = cam._shakeTime / cam._shakeDur;
    const mag = cam._shakeMag * Math.max(0, progress);
    cam._shakeX = (Math.random() * 2 - 1) * mag;
    cam._shakeY = (Math.random() * 2 - 1) * mag;
  } else {
    cam._shakeX = 0;
    cam._shakeY = 0;
  }
}

// ─── worldToScreen / screenToWorld ───────────────────────────────────────────

/**
 * cam2DWorldToScreen — convert a world position to screen pixel coords.
 */
function cam2DWorldToScreen(cam, wx, wy, gpu) {
  const ctx = gpu?.getStageCtx?.();
  const sw = cam.screenW ?? ctx?.canvas.width ?? 640;
  const sh = cam.screenH ?? ctx?.canvas.height ?? 360;
  const cos = Math.cos(-cam.rotation);
  const sin = Math.sin(-cam.rotation);
  const dx = (wx - cam.x - cam._shakeX) * cam.zoom;
  const dy = (wy - cam.y - cam._shakeY) * cam.zoom;
  return {
    x: sw * 0.5 + dx * cos - dy * sin,
    y: sh * 0.5 + dx * sin + dy * cos,
  };
}

/**
 * cam2DScreenToWorld — convert a screen pixel position to world coords.
 */
function cam2DScreenToWorld(cam, sx, sy, gpu) {
  const ctx = gpu?.getStageCtx?.();
  const sw = cam.screenW ?? ctx?.canvas.width ?? 640;
  const sh = cam.screenH ?? ctx?.canvas.height ?? 360;
  const cos = Math.cos(cam.rotation);
  const sin = Math.sin(cam.rotation);
  const dx = (sx - sw * 0.5) / cam.zoom;
  const dy = (sy - sh * 0.5) / cam.zoom;
  return {
    x: cam.x + cam._shakeX + dx * cos - dy * sin,
    y: cam.y + cam._shakeY + dx * sin + dy * cos,
  };
}

// ─── Bounds helpers ──────────────────────────────────────────────────────────

/**
 * cam2DGetBounds — return the world-space AABB currently visible by this camera.
 */
function cam2DGetBounds(cam, gpu) {
  const ctx = gpu?.getStageCtx?.();
  const sw = cam.screenW ?? ctx?.canvas.width ?? 640;
  const sh = cam.screenH ?? ctx?.canvas.height ?? 360;
  const hw = (sw * 0.5) / cam.zoom;
  const hh = (sh * 0.5) / cam.zoom;
  return { left: cam.x - hw, right: cam.x + hw, top: cam.y - hh, bottom: cam.y + hh };
}

export function camera2DApi(gpu) {
  function _begin(cam) {
    beginCamera2D(cam, gpu);
  }
  function _end(cam) {
    endCamera2D(cam, gpu);
  }
  function _w2s(cam, wx, wy) {
    return cam2DWorldToScreen(cam, wx, wy, gpu);
  }
  function _s2w(cam, sx, sy) {
    return cam2DScreenToWorld(cam, sx, sy, gpu);
  }
  function _bounds(cam) {
    return cam2DGetBounds(cam, gpu);
  }

  return {
    exposeTo(target) {
      Object.assign(target, {
        createCamera2D,
        beginCamera2D: _begin,
        endCamera2D: _end,
        cam2DFollow,
        cam2DShake,
        updateCamera2D,
        cam2DWorldToScreen: _w2s,
        cam2DScreenToWorld: _s2w,
        cam2DGetBounds: _bounds,
      });
    },
  };
}
