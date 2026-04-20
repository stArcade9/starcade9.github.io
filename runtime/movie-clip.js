// runtime/movie-clip.js
// Flash-style sprite animation system for Nova64.
//
// A MovieClip is a lightweight animation player that steps through a sequence
// of frames (image source rects or atlas frame names) at a given FPS.
//
// Cart usage:
//   let clip;
//   export function init() {
//     clip = createMovieClip([
//       { image: spriteSheet, sx: 0,  sy: 0, sw: 32, sh: 32 },
//       { image: spriteSheet, sx: 32, sy: 0, sw: 32, sh: 32 },
//       { image: spriteSheet, sx: 64, sy: 0, sw: 32, sh: 32 },
//     ], 12, { loop: true });
//     playClip(clip);
//   }
//   export function update(dt) {
//     updateClips(dt);          // advance all active clips
//   }
//   export function draw() {
//     drawClip(clip, 160, 120, { anchorX: 0.5, anchorY: 1 });
//   }
//
// Alternatively, use named atlas frames:
//   clip = createMovieClip(['run_0001', 'run_0002', 'run_0003'], 24);
//   // drawClip then uses sprByName() internally

/** @type {Set<MovieClip>} */
const _activeClips = new Set();

/**
 * createMovieClip — create a new animation controller.
 * @param {Array} frames  - Array of frame descriptors:
 *   - { image, sx, sy, sw, sh } for raw image rects, OR
 *   - string (atlas frame name, requires sprByName to be global)
 * @param {number} [fps=12]
 * @param {object} [opts]
 * @param {boolean} [opts.loop=true]
 * @param {boolean} [opts.autoPlay=false]
 * @param {object}  [opts.labels]  - { labelName: frameIndex }
 * @returns {MovieClip}
 */
function createMovieClip(frames, fps = 12, opts = {}) {
  return {
    _type: 'movieclip',
    frames,
    fps,
    loop: opts.loop ?? true,
    playing: opts.autoPlay ?? false,
    labels: opts.labels ?? {},
    // render-time state
    frame: 0, // current frame index (integer)
    _acc: 0, // fractional accumulator (seconds)
    onLoop: null, // callback: () => void
    onComplete: null, // callback: () => void (fires when loop=false clip finishes)
  };
}

/** Start or resume playback */
function playClip(clip) {
  clip.playing = true;
  _activeClips.add(clip);
}

/** Pause at the current frame */
function pauseClip(clip) {
  clip.playing = false;
}

/** Pause and reset to frame 0 */
function stopClip(clip) {
  clip.playing = false;
  clip.frame = 0;
  clip._acc = 0;
  _activeClips.delete(clip);
}

/** Jump to a frame (by index or label name) and resume playing */
function gotoAndPlay(clip, labelOrIndex) {
  clip.frame = _resolveFrame(clip, labelOrIndex);
  clip._acc = 0;
  playClip(clip);
}

/** Jump to a frame and stop */
function gotoAndStop(clip, labelOrIndex) {
  clip.frame = _resolveFrame(clip, labelOrIndex);
  clip._acc = 0;
  clip.playing = false;
}

function _resolveFrame(clip, labelOrIndex) {
  if (typeof labelOrIndex === 'string') {
    return clip.labels[labelOrIndex] ?? 0;
  }
  return Math.max(0, Math.min(labelOrIndex, clip.frames.length - 1));
}

/**
 * updateClips — advance all active MovieClips by dt seconds.
 * Call this from your cart's update(dt) function.
 */
function updateClips(dt) {
  for (const clip of _activeClips) {
    if (!clip.playing) continue;
    clip._acc += dt;
    const frameDur = 1 / clip.fps;
    while (clip._acc >= frameDur) {
      clip._acc -= frameDur;
      clip.frame++;
      if (clip.frame >= clip.frames.length) {
        if (clip.loop) {
          clip.frame = 0;
          if (clip.onLoop) clip.onLoop(clip);
        } else {
          clip.frame = clip.frames.length - 1;
          clip.playing = false;
          _activeClips.delete(clip);
          if (clip.onComplete) clip.onComplete(clip);
        }
      }
    }
  }
}

/**
 * drawClip — render the current frame of a MovieClip at (x, y).
 * @param {MovieClip} clip
 * @param {number} x
 * @param {number} y
 * @param {object} [opts]  - Same opts as spr(): anchorX/Y, alpha, blendMode, scale, etc.
 * @param {GpuThreeJS} gpu
 */
function _drawClip(clip, x, y, opts, gpu) {
  if (!clip || clip.frames.length === 0) return;
  const fi = Math.max(0, Math.min(clip.frame, clip.frames.length - 1));
  const frame = clip.frames[fi];

  if (typeof frame === 'string') {
    // Atlas frame name — delegate to sprByName global (exposed by spriteApi)
    if (typeof globalThis.sprByName === 'function') {
      globalThis.sprByName(frame, x, y, opts);
    }
    return;
  }

  // Structured frame: { image, sx, sy, sw, sh }
  if (!frame?.image) return;
  const ctx = gpu?.getStageCtx?.();
  if (!ctx) return;

  const {
    scale = 1,
    scaleX,
    scaleY,
    anchorX = 0,
    anchorY = 0,
    alpha = 1,
    blendMode = 'source-over',
    rot = 0,
    flipX = false,
    flipY = false,
    tint = null,
  } = opts ?? {};

  const dw = frame.sw * (scaleX ?? scale);
  const dh = frame.sh * (scaleY ?? scale);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = blendMode;
  ctx.translate(x + anchorX * dw, y + anchorY * dh);
  if (rot) ctx.rotate(rot);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  const ox = -anchorX * dw;
  const oy = -anchorY * dh;

  if (tint !== null) {
    const oc = new OffscreenCanvas(frame.sw, frame.sh);
    const oc2 = oc.getContext('2d');
    oc2.drawImage(frame.image, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.sw, frame.sh);
    oc2.globalCompositeOperation = 'multiply';
    const tr = (tint >> 16) & 0xff;
    const tg = (tint >> 8) & 0xff;
    const tb = tint & 0xff;
    oc2.fillStyle = `rgb(${tr},${tg},${tb})`;
    oc2.fillRect(0, 0, frame.sw, frame.sh);
    oc2.globalCompositeOperation = 'destination-in';
    oc2.drawImage(frame.image, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.sw, frame.sh);
    ctx.drawImage(oc, ox, oy, dw, dh);
  } else {
    ctx.drawImage(frame.image, frame.sx, frame.sy, frame.sw, frame.sh, ox, oy, dw, dh);
  }

  ctx.restore();
}

export function movieClipApi(gpu) {
  function drawClip(clip, x, y, opts) {
    _drawClip(clip, x, y, opts, gpu);
  }

  return {
    exposeTo(target) {
      Object.assign(target, {
        createMovieClip,
        playClip,
        pauseClip,
        stopClip,
        gotoAndPlay,
        gotoAndStop,
        updateClips,
        drawClip,
      });
    },
  };
}
