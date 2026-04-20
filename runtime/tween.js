// runtime/tween.js
// ┌─────────────────────────────────────────────────────────────────────────────
// │  Nova64 Unified Tween Engine
// │  First-class citizen for Stage, HyperNova (hype.js), and all cart code.
// │
// │  createTween() detects call style automatically:
// │
// │  ── NOVA / STAGE STYLE (animate object properties) ─────────────────────
// │     createTween(target, { x: 100, alpha: 0 }, 1.5, opts)
// │     • target   — any object (StageNode, plain {x,y}, mesh ref …)
// │     • toProps  — { propName: endValue, … }
// │     • duration — seconds
// │     • opts     — ease, delay, loop, yoyo, onUpdate, onComplete, autoReg
// │     → Auto-added to _activeTweens; advanced by updateTweens(dt)
// │     → StageNode shorthand: node.tweenTo({ x:100 }, 1, opts)
// │
// │  ── HYPE STYLE (produce an interpolated scalar / array value) ───────────
// │     createTween({ from: 0, to: 1, duration: 1.5, ease: 'easeOutCubic',
// │                   loop: 'pingpong', onUpdate(v, p){ … } })
// │     → Not auto-added to _activeTweens; tick via .register() + hypeUpdate(dt)
// │       or manually call tween.tick(dt) each frame.
// │
// │  Both styles return the same interface:
// │     .tick(dt)        advance manually
// │     .value           current value (scalar for hype, undefined for nova-style)
// │     .values          always array
// │     .progress        [0..1]
// │     .done            boolean
// │     .play()          start / resume
// │     .pause()         pause (alias: .stop())
// │     .restart()       restart from beginning
// │     .kill()          stop & remove from _activeTweens
// │     .register()      add to hype registry (→ hypeUpdate advances it)
// │     .unregister()    remove from hype registry
// └─────────────────────────────────────────────────────────────────────────────

// ─── Easing functions ────────────────────────────────────────────────────────

export const Ease = Object.freeze({
  // Linear
  linear: t => t,

  // Quad
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  inCubic: t => t * t * t,
  outCubic: t => --t * t * t + 1,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  inQuart: t => t * t * t * t,
  outQuart: t => 1 - --t * t * t * t,
  inOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),

  // Quint
  inQuint: t => t * t * t * t * t,
  outQuint: t => 1 + --t * t * t * t * t,
  inOutQuint: t => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t),

  // Sine
  inSine: t => 1 - Math.cos((t * Math.PI) / 2),
  outSine: t => Math.sin((t * Math.PI) / 2),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,

  // Expo
  inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: t =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2,

  // Circ
  inCirc: t => 1 - Math.sqrt(1 - t * t),
  outCirc: t => Math.sqrt(1 - --t * t),
  inOutCirc: t =>
    t < 0.5
      ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
      : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2,

  // Back
  inBack: t => {
    const c = 1.70158;
    return (c + 1) * t * t * t - c * t * t;
  },
  outBack: t => {
    const c = 1.70158;
    return 1 + (c + 1) * --t * t * t + c * t * t;
  },
  inOutBack: t => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (4 * t * t * ((c + 1) * 2 * t - c)) / 2
      : ((-2 * t + 2) * (-2 * t + 2) * ((c + 1) * (-2 * t + 2) + c) + 2) / 2;
  },

  // Elastic
  inElastic: t => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * Math.sin(((t * 10 - 10.75) * (2 * Math.PI)) / 3);
  },
  outElastic: t => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1;
  },
  inOutElastic: t => {
    if (t === 0 || t === 1) return t;
    const s = (2 * Math.PI) / 4.5;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * s)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * s)) / 2 + 1;
  },

  // Bounce
  outBounce: t => {
    const n = 7.5625,
      d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  inBounce: t => 1 - Ease.outBounce(1 - t),
  inOutBounce: t =>
    t < 0.5 ? (1 - Ease.outBounce(1 - 2 * t)) / 2 : (1 + Ease.outBounce(2 * t - 1)) / 2,

  // Step
  step: n => t => Math.floor(t * n) / n,
});

// ─── Easing name → function lookup ───────────────────────────────────────────
// Supports both Ease.* keys ('outCubic') and hype.js strings ('easeOutCubic').
const _EASE_LOOKUP = {
  ...Ease,
  // Map hype.js-style 'easeXxx' → same fn
  easeLinear: Ease.linear,
  easeInQuad: Ease.inQuad,
  easeOutQuad: Ease.outQuad,
  easeInOutQuad: Ease.inOutQuad,
  easeInCubic: Ease.inCubic,
  easeOutCubic: Ease.outCubic,
  easeInOutCubic: Ease.inOutCubic,
  easeInQuart: Ease.inQuart,
  easeOutQuart: Ease.outQuart,
  easeInOutQuart: Ease.inOutQuart,
  easeInQuint: Ease.inQuint,
  easeOutQuint: Ease.outQuint,
  easeInOutQuint: Ease.inOutQuint,
  easeInSine: Ease.inSine,
  easeOutSine: Ease.outSine,
  easeInOutSine: Ease.inOutSine,
  easeInExpo: Ease.inExpo,
  easeOutExpo: Ease.outExpo,
  easeInOutExpo: Ease.inOutExpo,
  easeInCirc: Ease.inCirc,
  easeOutCirc: Ease.outCirc,
  easeInOutCirc: Ease.inOutCirc,
  easeInBack: Ease.inBack,
  easeOutBack: Ease.outBack,
  easeInOutBack: Ease.inOutBack,
  easeInElastic: Ease.inElastic,
  easeOutElastic: Ease.outElastic,
  easeInOutElastic: Ease.inOutElastic,
  easeInBounce: Ease.inBounce,
  easeOutBounce: Ease.outBounce,
  easeInOutBounce: Ease.inOutBounce,
};

function _resolveEase(e) {
  if (typeof e === 'function') return e;
  if (typeof e === 'string') return _EASE_LOOKUP[e] ?? Ease.linear;
  return Ease.linear;
}

function _resolveLoop(loop, yoyo) {
  // Normalise to 'none' | 'loop' | 'pingpong'
  if (loop === 'pingpong' || yoyo === true) return 'pingpong';
  if (loop === true || loop === 'loop') return 'loop';
  return 'none';
}

// ─── Active tween registry (nova-style) ──────────────────────────────────────
/** @type {Set<object>} */
const _activeTweens = new Set();

// ─── Call-style detector ─────────────────────────────────────────────────────
function _isHypeStyle(arg1, arg2) {
  return (
    arg1 !== null &&
    typeof arg1 === 'object' &&
    !Array.isArray(arg1) &&
    arg2 === undefined &&
    ('from' in arg1 || 'to' in arg1 || 'duration' in arg1)
  );
}

// ─── Shared tween builder helpers ────────────────────────────────────────────
function _buildCommonMethods(state, isNova) {
  return {
    get value() {
      return state.isArr ? state.values : state.values[0];
    },
    get values() {
      return state.values;
    },
    get progress() {
      return state.progress;
    },
    get done() {
      return state.done;
    },

    tick(dt) {
      state.tick(dt);
    },

    play() {
      state.playing = true;
      return this;
    },
    start() {
      state.restart();
      return this;
    },
    pause() {
      state.playing = false;
      return this;
    },
    stop() {
      state.playing = false;
      return this;
    },
    restart() {
      state.restart();
      return this;
    },

    kill() {
      state.playing = false;
      state.done = true;
      if (isNova) _activeTweens.delete(this);
      // Use globalThis to unregister from hype without importing hype.js
      globalThis.hypeUnregister?.(this);
      return this;
    },

    register() {
      globalThis.hypeRegister?.(this);
      return this;
    },
    unregister() {
      globalThis.hypeUnregister?.(this);
      return this;
    },
  };
}

// ─── NOVA-STYLE tween ─────────────────────────────────────────────────────────
// Animates numeric properties directly on a target object.
function _createNovaTween(target, toProps, duration, opts) {
  if (target == null || toProps == null) {
    console.warn('[tween] createTween: target or toProps is null/undefined — tween skipped.');
    // Return inert tween so callers don't need to guard
    const noop = {};
    const methods = _buildCommonMethods(
      {
        values: [],
        progress: 0,
        done: true,
        playing: false,
        isArr: false,
        tick() {},
        restart() {},
      },
      false
    );
    return Object.assign(noop, methods);
  }

  const easeFn = _resolveEase(opts.ease);
  const delay = opts.delay ?? 0;
  const loopMode = _resolveLoop(opts.loop, opts.yoyo);
  const onUpdate = opts.onUpdate ?? null;
  const onComplete = opts.onComplete ?? null;

  // Snapshot starting values
  const keys = Object.keys(toProps);
  const fromVals = {};
  const toVals = {};
  for (const k of keys) {
    fromVals[k] = target[k] ?? 0;
    toVals[k] = toProps[k];
  }

  const state = {
    isArr: false,
    values: [],
    progress: 0,
    done: false,
    playing: true,
    _elapsed: 0,
    _delay: delay,
    _dir: 1,
    restart() {
      state._elapsed = 0;
      state._delay = delay;
      state._dir = 1;
      state.done = false;
      state.playing = true;
      for (const k of keys) target[k] = fromVals[k];
    },
    tick(dt) {
      if (!state.playing || state.done) return;
      if (state._delay > 0) {
        state._delay -= dt;
        return;
      }

      state._elapsed += dt * state._dir;
      const raw = Math.max(0, Math.min(1, state._elapsed / duration));
      const t = easeFn(raw);
      state.progress = raw;

      for (const k of keys) {
        target[k] = fromVals[k] + (toVals[k] - fromVals[k]) * t;
      }
      if (onUpdate) onUpdate(target, raw);

      if (state._elapsed * state._dir >= duration) {
        if (loopMode === 'loop') {
          state._elapsed = 0;
          if (onComplete) onComplete(target);
        } else if (loopMode === 'pingpong') {
          state._elapsed = duration;
          state._dir *= -1;
          if (onComplete) onComplete(target);
        } else {
          // Snap to exact end values
          for (const k of keys) target[k] = state._dir === 1 ? toVals[k] : fromVals[k];
          state.progress = 1;
          state.done = true;
          state.playing = false;
          _activeTweens.delete(tw);
          if (onComplete) onComplete(target);
        }
      } else if (state._elapsed <= 0 && loopMode === 'pingpong') {
        state._elapsed = 0;
        state._dir = 1;
      }
    },
  };

  const tw = _buildCommonMethods(state, true);
  tw._target = target; // stored so killTweensOf() can match by reference
  _activeTweens.add(tw);
  return tw;
}

// ─── HYPE-STYLE tween ─────────────────────────────────────────────────────────
// Produces an interpolated scalar or array value; no target object mutations.
// Driven by .tick(dt) or hypeUpdate(dt) via .register().
function _createHypeTween(opts) {
  const isArr = Array.isArray(opts.from);
  const fromArr = isArr ? opts.from : [opts.from ?? 0];
  const toArr = isArr ? opts.to : [opts.to ?? 1];
  const duration = opts.duration ?? 1;
  const easeFn = _resolveEase(opts.ease);
  const loopMode = _resolveLoop(opts.loop, opts.yoyo);
  const useSpring = !!opts.spring;
  const stiffness = opts.stiffness ?? 150;
  const damping = opts.damping ?? 12;
  const onComplete = opts.onComplete ?? null;
  const onUpdate = opts.onUpdate ?? null;

  const _vel = fromArr.map(() => 0);
  const _cur = fromArr.slice();

  const state = {
    isArr,
    values: fromArr.slice(),
    progress: 0,
    done: false,
    playing: true,
    _t: 0,
    _dir: 1,
    restart() {
      state._t = 0;
      state._dir = 1;
      state.done = false;
      state.playing = true;
      state.values = fromArr.slice();
      state.progress = 0;
      for (let i = 0; i < _vel.length; i++) {
        _vel[i] = 0;
        _cur[i] = fromArr[i];
      }
    },
    tick(dt) {
      if (!state.playing || state.done) return;

      if (useSpring) {
        let settled = true;
        for (let i = 0; i < _cur.length; i++) {
          const force = (toArr[i] - _cur[i]) * stiffness;
          _vel[i] += (force - _vel[i] * damping) * dt;
          _cur[i] += _vel[i] * dt;
          if (Math.abs(toArr[i] - _cur[i]) > 0.001 || Math.abs(_vel[i]) > 0.001) settled = false;
        }
        state.values = _cur.slice();
        state.progress = 1;
        if (settled) {
          state.values = toArr.slice();
          state.done = true;
          state.playing = false;
          if (onComplete) onComplete();
        }
      } else {
        state._t += dt * state._dir;
        state.progress = Math.max(0, Math.min(1, state._t / duration));
        const e = easeFn(state.progress);
        state.values = fromArr.map((f, i) => f + (toArr[i] - f) * e);

        if (state._t >= duration) {
          if (loopMode === 'loop') {
            state._t = 0;
            if (onComplete) onComplete();
          } else if (loopMode === 'pingpong') {
            state._t = duration;
            state._dir = -1;
            if (onComplete) onComplete();
          } else {
            state.values = toArr.slice();
            state.progress = 1;
            state.done = true;
            state.playing = false;
            if (onComplete) onComplete();
          }
        } else if (state._t <= 0 && loopMode === 'pingpong') {
          state._t = 0;
          state._dir = 1;
        }
      }

      if (onUpdate) onUpdate(isArr ? state.values : state.values[0], state.progress);
    },
  };

  const tw = _buildCommonMethods(state, false);
  if (opts.autoReg) globalThis.hypeRegister?.(tw);
  return tw;
}

// ─── Public unified API ───────────────────────────────────────────────────────

/**
 * createTween — unified tween factory. Works in Nova-style and Hype-style.
 *
 * NOVA / STAGE STYLE:
 *   createTween(target, toProps, duration, opts?)
 *
 * HYPE STYLE:
 *   createTween({ from, to, duration, ease, loop, yoyo, spring, onUpdate, onComplete, autoReg })
 */
function createTween(target, toProps, duration, opts = {}) {
  if (_isHypeStyle(target, toProps)) return _createHypeTween(target);
  return _createNovaTween(target, toProps, duration, opts);
}

/**
 * killTween — stop and remove a tween.
 */
function killTween(tween) {
  if (tween) tween.kill();
}

/**
 * killTweensOf — stop all active nova-style tweens targeting an object.
 */
function killTweensOf(target) {
  for (const tw of _activeTweens) {
    if (tw._target === target) tw.kill();
  }
}

/**
 * updateTweens — advance all active nova-style tweens by dt seconds.
 * Call from your cart's update(dt).
 */
function updateTweens(dt) {
  for (const tw of _activeTweens) {
    tw.tick(dt);
  }
}

/** Return count of active nova-style tweens (useful for debugging). */
function getTweenCount() {
  return _activeTweens.size;
}

/**
 * killAllTweens — stop and remove every active nova-style tween.
 * Call from scene cleanup to prevent tween leaks across scenes.
 */
function killAllTweens() {
  for (const tw of [..._activeTweens]) {
    try {
      tw.kill();
    } catch (e) {
      /* tween already dead */
    }
  }
  _activeTweens.clear();
}

// Named exports so other modules (hype.js, tests) can import directly
export { createTween, killTween, killTweensOf, killAllTweens, updateTweens, getTweenCount };

export function tweenApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        Ease,
        createTween,
        killTween,
        killTweensOf,
        killAllTweens,
        updateTweens,
        getTweenCount,
      });
    },
  };
}
