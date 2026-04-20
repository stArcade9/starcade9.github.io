// runtime/api-particles-2d.js
// Sprite-textured 2D particle emitter for Nova64.
//
// Particles are rendered onto the stage Canvas2D overlay.
// Supports sprite sheet frames, color tints, blend modes, gravity, friction, rotation.
//
// Cart usage:
//   let emitter;
//   export function init() {
//     emitter = createEmitter2D({
//       x: 160, y: 120,
//       image: spriteSheet,
//       frames: [{ sx: 0, sy: 0, sw: 8, sh: 8 }],
//       blendMode: BM.ADD,
//       maxParticles: 200,
//       emitRate: 30,           // particles/second
//       speed: [20, 80],        // min/max px/s
//       angle: [-Math.PI, Math.PI],
//       life:  [0.5, 1.5],
//       scale: [0.5, 2],
//       alpha: [0.8, 1],
//       fadeOut: true,
//       gravity: 20,
//     });
//   }
//   export function update(dt) {
//     emitter.x = player.x; emitter.y = player.y;
//     updateEmitter2D(emitter, dt);
//   }
//   export function draw() {
//     drawEmitter2D(emitter);
//   }

/** @typedef {object} Emitter2D */

function _rand(min, max) {
  return min + Math.random() * (max - min);
}
function _resolveRange(v) {
  if (Array.isArray(v)) return _rand(v[0], v[1]);
  return v;
}

/**
 * createEmitter2D — create a new particle emitter.
 * @param {object} opts
 * @param {number} [opts.x=0]           emitter world X
 * @param {number} [opts.y=0]           emitter world Y
 * @param {HTMLImageElement} [opts.image]  sprite sheet image
 * @param {Array<{sx,sy,sw,sh}>} [opts.frames]  source rects to pick from at random
 *   If omitted, a simple filled circle particle is used.
 * @param {string} [opts.blendMode='source-over']  Canvas2D compositeOperation
 * @param {number} [opts.maxParticles=100]
 * @param {number} [opts.emitRate=20]    particles per second (0 = burst only)
 * @param {number|number[]} [opts.speed=50]   px/s — scalar or [min, max]
 * @param {number|number[]} [opts.angle]      emission angle radians — scalar or [min, max]; default = full circle
 * @param {number|number[]} [opts.life=1]     particle lifetime in seconds
 * @param {number|number[]} [opts.scale=1]    draw scale
 * @param {number|number[]} [opts.alpha=1]    initial alpha
 * @param {boolean} [opts.fadeOut=true]       fade alpha to 0 over particle life
 * @param {boolean} [opts.scaleDown=false]    shrink to 0 over particle life
 * @param {number} [opts.gravity=0]           Y gravity px/s²
 * @param {number} [opts.friction=0]          velocity damping 0..1 per second
 * @param {number|null} [opts.tint=null]      0xRRGGBB color tint
 * @param {boolean} [opts.rotating=false]     particles spin
 * @param {number} [opts.rotateSpeed]         radians/s (random if not set)
 */
function createEmitter2D(opts = {}) {
  return {
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    image: opts.image ?? null,
    frames: opts.frames ?? null,
    blendMode: opts.blendMode ?? 'source-over',
    maxParticles: opts.maxParticles ?? 100,
    emitRate: opts.emitRate ?? 20,
    speed: opts.speed ?? 50,
    angle: opts.angle ?? [-Math.PI, Math.PI],
    life: opts.life ?? 1,
    scale: opts.scale ?? 1,
    alpha: opts.alpha ?? 1,
    fadeOut: opts.fadeOut ?? true,
    scaleDown: opts.scaleDown ?? false,
    gravity: opts.gravity ?? 0,
    friction: opts.friction ?? 0,
    tint: opts.tint ?? null,
    rotating: opts.rotating ?? false,
    rotateSpeed: opts.rotateSpeed ?? null,
    active: true,
    _particles: [],
    _acc: 0, // accumulator for sub-frame emission
  };
}

/** Emit a one-shot burst of count particles from an emitter */
function burstEmitter2D(emitter, count) {
  for (let i = 0; i < count; i++) _spawnParticle(emitter);
}

/** Pause/resume automatic emission */
function setEmitter2DActive(emitter, active) {
  emitter.active = active;
}

function _spawnParticle(emitter) {
  if (emitter._particles.length >= emitter.maxParticles) return;
  const angle = _resolveRange(emitter.angle);
  const speed = _resolveRange(emitter.speed);
  const life = _resolveRange(emitter.life);
  const scale = _resolveRange(emitter.scale);
  const alpha = _resolveRange(emitter.alpha);
  const frame = emitter.frames
    ? emitter.frames[Math.floor(Math.random() * emitter.frames.length)]
    : null;
  emitter._particles.push({
    x: emitter.x,
    y: emitter.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life,
    maxLife: life,
    scale,
    alpha,
    initAlpha: alpha,
    initScale: scale,
    rot: Math.random() * Math.PI * 2,
    rotV: emitter.rotating ? (emitter.rotateSpeed ?? _rand(-3, 3)) : 0,
    frame,
  });
}

/**
 * updateEmitter2D — advance particles and emit new ones.
 * Call from cart update(dt).
 */
function updateEmitter2D(emitter, dt) {
  // Spawn
  if (emitter.active && emitter.emitRate > 0) {
    emitter._acc += emitter.emitRate * dt;
    while (emitter._acc >= 1) {
      emitter._acc -= 1;
      _spawnParticle(emitter);
    }
  }

  // Advance
  const friction = Math.pow(Math.max(0, 1 - emitter.friction), dt);
  for (let i = emitter._particles.length - 1; i >= 0; i--) {
    const p = emitter._particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      emitter._particles.splice(i, 1);
      continue;
    }

    p.vx *= friction;
    p.vy *= friction;
    p.vy += emitter.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.rotV * dt;

    const t = p.life / p.maxLife; // 1 = just born, 0 = dying
    if (emitter.fadeOut) p.alpha = p.initAlpha * t;
    if (emitter.scaleDown) p.scale = p.initScale * t;
  }
}

/**
 * drawEmitter2D — render all live particles.
 * Call from cart draw(). Requires gpu to access stage ctx.
 */
function _drawEmitter2D(emitter, gpu) {
  if (!emitter._particles.length) return;
  const ctx = gpu?.getStageCtx?.();
  if (!ctx) return;

  ctx.save();
  ctx.globalCompositeOperation = emitter.blendMode;

  for (const p of emitter._particles) {
    if (p.alpha <= 0 || p.scale <= 0) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate(p.rot);
    ctx.scale(p.scale, p.scale);

    if (emitter.image && p.frame) {
      const f = p.frame;
      const hw = f.sw * 0.5;
      const hh = f.sh * 0.5;
      if (emitter.tint !== null) {
        const oc = new OffscreenCanvas(f.sw, f.sh);
        const oc2 = oc.getContext('2d');
        oc2.drawImage(emitter.image, f.sx, f.sy, f.sw, f.sh, 0, 0, f.sw, f.sh);
        oc2.globalCompositeOperation = 'multiply';
        const tr = (emitter.tint >> 16) & 0xff;
        const tg = (emitter.tint >> 8) & 0xff;
        const tb = emitter.tint & 0xff;
        oc2.fillStyle = `rgb(${tr},${tg},${tb})`;
        oc2.fillRect(0, 0, f.sw, f.sh);
        oc2.globalCompositeOperation = 'destination-in';
        oc2.drawImage(emitter.image, f.sx, f.sy, f.sw, f.sh, 0, 0, f.sw, f.sh);
        ctx.drawImage(oc, -hw, -hh, f.sw, f.sh);
      } else {
        ctx.drawImage(emitter.image, f.sx, f.sy, f.sw, f.sh, -hw, -hh, f.sw, f.sh);
      }
    } else {
      // Fallback: draw a filled circle (radius 4)
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      const tint = emitter.tint ?? 0xffffff;
      const tr = (tint >> 16) & 0xff;
      const tg = (tint >> 8) & 0xff;
      const tb = tint & 0xff;
      ctx.fillStyle = `rgb(${tr},${tg},${tb})`;
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

/** Return the number of live particles in an emitter */
function getParticleCount(emitter) {
  return emitter._particles.length;
}

/** Remove all particles from an emitter */
function clearEmitter2D(emitter) {
  emitter._particles.length = 0;
  emitter._acc = 0;
}

export function particles2DApi(gpu) {
  function drawEmitter2D(emitter) {
    _drawEmitter2D(emitter, gpu);
  }

  return {
    exposeTo(target) {
      Object.assign(target, {
        createEmitter2D,
        burstEmitter2D,
        setEmitter2DActive,
        updateEmitter2D,
        drawEmitter2D,
        getParticleCount,
        clearEmitter2D,
      });
    },
  };
}
