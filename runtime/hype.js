// runtime/hype.js
// Nova64 HYPE Framework — inspired by HYPE_AS3 and HYPE_Processing by
// Branden Hall & Joshua Davis (hypeframework.org).
//
// Core concept: Behaviors — reusable animation/logic objects you create,
// optionally register with the global behavior registry, and tick each frame.
//
// ─── Behaviors ────────────────────────────────────────────────────────────────
//   createOscillator(opts)       — sine/cos/tri/saw/noise value oscillator
//   createTween(opts)            — property tween with easing + spring + callbacks
//   createTimeTrigger(opts)      — callback after elapsed seconds, repeating or one-shot
//   createRandomTrigger(opts)    — fires with probability per update tick
//   createProximityTrigger(opts) — fires when two positions enter/exit a radius
//   createHSwarm(opts)           — N-agent Reynolds steering (separation/alignment/cohesion)
//
// ─── Color ────────────────────────────────────────────────────────────────────
//   createColorPool(colors, mode) — palette cycling (sequential / random / shuffle)
//
// ─── Pools ────────────────────────────────────────────────────────────────────
//   createHPool(opts)            — object pool with lifecycle hooks
//
// ─── Layouts (position generators) ───────────────────────────────────────────
//   createGridLayout(opts)       — 2D / 3D grid of positions
//   createCircleLayout(opts)     — positions around a circle or arc
//   createSphereLayout(opts)     — Fibonacci-sphere distribution
//   createPathLayout(opts)       — positions along a polyline or bezier path
//
// ─── Registry ─────────────────────────────────────────────────────────────────
//   hypeRegister(behavior)       — add behavior to global tick list
//   hypeUnregister(behavior)     — remove behavior from tick list
//   hypeUpdate(dt)               — tick all registered behaviors (call from update())
//   hypeReset()                  — clear all registered behaviors
//
// Exposed globals: createOscillator, createTween, createTimeTrigger,
//   createRandomTrigger, createProximityTrigger, createHSwarm,
//   createColorPool, createHPool, createGridLayout, createCircleLayout,
//   createSphereLayout, createPathLayout,
//   hypeRegister, hypeUnregister, hypeUpdate, hypeReset

// ─── Simple noise helper (LCG + value noise, no dependency on api-generative) ─
function _valueNoise(x) {
  // Fast 1-D value noise, returns [-1, 1]
  const xi = Math.floor(x);
  const xf = x - xi;
  const s = xf * xf * (3 - 2 * xf); // smoothstep
  const a = _hash(xi);
  const b = _hash(xi + 1);
  return a + (b - a) * s;
}
function _hash(n) {
  // Maps integer -> [-1, 1]
  n = n ^ 61 ^ (n >>> 16);
  n = (n + (n << 3)) >>> 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d) >>> 0;
  n = n ^ (n >>> 15);
  return (n / 0xffffffff) * 2 - 1;
}

// ─── Shared easing (mirrors api-generative ease() without requiring import) ───
const _EASE = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: t => t * t * t,
  easeOutCubic: t => --t * t * t + 1,
  easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInBack: t => t * t * (2.70158 * t - 1.70158),
  easeOutBack: t => {
    const c = 1.70158;
    return (t - 1) * (t - 1) * ((c + 1) * (t - 1) + c) + 1;
  },
  easeOutBounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  easeInElastic: t =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
  easeOutElastic: t =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

function _applyEase(t, type) {
  const fn = _EASE[type];
  return fn ? fn(Math.max(0, Math.min(1, t))) : t;
}

export function hypeApi() {
  // ═══════════════════════════════════════════════════════════════════════════
  // Behavior Registry
  // ═══════════════════════════════════════════════════════════════════════════
  const _registry = new Set();

  function hypeRegister(behavior) {
    _registry.add(behavior);
  }

  function hypeUnregister(behavior) {
    _registry.delete(behavior);
  }

  function hypeUpdate(dt) {
    for (const b of _registry) {
      b.tick(dt);
    }
  }

  function hypeReset() {
    _registry.clear();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // createOscillator
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Creates a named oscillator that drives a numeric value between min and max.
   *
   * opts:
   *   waveform  — 'sin' | 'cos' | 'tri' | 'saw' | 'noise'  (default 'sin')
   *   min       — output minimum                             (default  0)
   *   max       — output maximum                             (default  1)
   *   speed     — cycles per second                          (default  1)
   *   offset    — phase offset in cycles [0..1]              (default  0)
   *   autoReg   — auto-register with hypeUpdate              (default false)
   *
   * API:
   *   .tick(dt)      — advance time; call manually if not auto-registered
   *   .value         — current output value in [min, max]
   *   .raw           — raw waveform output in [-1, 1]
   *   .reset()       — resets internal time to 0
   *   .register()    — add to global registry
   *   .unregister()  — remove from global registry
   */
  function createOscillator(opts = {}) {
    const waveform = opts.waveform ?? 'sin';
    let min = opts.min ?? 0;
    let max = opts.max ?? 1;
    let speed = opts.speed ?? 1;
    let offset = opts.offset ?? 0; // phase in cycles
    let _t = 0; // internal time in seconds
    let raw = 0;
    let value = (min + max) / 2;

    function tick(dt) {
      _t += dt;
      const phase = _t * speed + offset;
      switch (waveform) {
        case 'sin':
          raw = Math.sin(phase * Math.PI * 2);
          break;
        case 'cos':
          raw = Math.cos(phase * Math.PI * 2);
          break;
        case 'tri':
          raw = 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25));
          break;
        case 'saw':
          raw = 2 * (phase - Math.floor(phase + 0.5));
          break;
        case 'noise':
          raw = _valueNoise(phase * 3.7);
          break;
        default:
          raw = Math.sin(phase * Math.PI * 2);
      }
      // map [-1, 1] → [min, max]
      value = min + (raw + 1) * 0.5 * (max - min);
    }

    function reset() {
      _t = 0;
      raw = 0;
      value = (min + max) / 2;
    }

    const osc = {
      get value() {
        return value;
      },
      get raw() {
        return raw;
      },
      tick,
      reset,
      register() {
        hypeRegister(osc);
        return osc;
      },
      unregister() {
        hypeUnregister(osc);
        return osc;
      },
      // chainable setters for changing properties at runtime
      setMin(v) {
        min = v;
        return osc;
      },
      setMax(v) {
        max = v;
        return osc;
      },
      setSpeed(v) {
        speed = v;
        return osc;
      },
      setOffset(v) {
        offset = v;
        return osc;
      },
      setRange(lo, hi) {
        min = lo;
        max = hi;
        return osc;
      },
    };

    if (opts.autoReg) hypeRegister(osc);
    return osc;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // createTween
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Creates a tween that animates one or more numeric properties.
   *
   * opts:
   *   from      — number OR number[]                         (default 0)
   *   to        — number OR number[]                         (default 1)
   *   duration  — seconds                                    (default 1)
   *   ease      — easing name string                         (default 'linear')
   *   loop      — 'none' | 'loop' | 'pingpong'              (default 'none')
   *   spring    — enable spring physics instead of easing    (default false)
   *   stiffness — spring stiffness (spring mode)             (default 150)
   *   damping   — spring damping   (spring mode)             (default 12)
   *   autoReg   — auto-register with hypeUpdate              (default false)
   *   onComplete— fn() — called when tween completes (non-loop)
   *   onUpdate  — fn(value | values, t) — called each tick
   *
   * API:
   *   .tick(dt)
   *   .value         — current output (number if scalar, [] if array)
   *   .values        — always an array
   *   .progress      — normalized [0..1]
   *   .done          — true when finished (non-loop)
   *   .start()       — restart from beginning
   *   .stop()        — pause
   *   .resume()      — resume from where paused
   *   .register() / .unregister()
   */
  function createTween(opts = {}) {
    const isArr = Array.isArray(opts.from);
    const fromArr = isArr ? opts.from : [opts.from ?? 0];
    const toArr = isArr ? opts.to : [opts.to ?? 1];
    const dur = opts.duration ?? 1;
    const easeName = opts.ease ?? 'linear';
    const loopMode = opts.loop ?? 'none';
    const useSpring = !!opts.spring;
    const stiffness = opts.stiffness ?? 150;
    const damping = opts.damping ?? 12;
    const onComplete = opts.onComplete ?? null;
    const onUpdate = opts.onUpdate ?? null;

    let _t = 0;
    let _dir = 1; // +1 or -1 for pingpong
    let _done = false;
    let _playing = true;

    // Spring state (one per dimension)
    const _vel = fromArr.map(() => 0);
    const _cur = fromArr.slice();

    let progress = 0;
    let values = fromArr.slice();

    function _computeEasing(t) {
      const n = fromArr.length;
      const out = new Array(n);
      for (let i = 0; i < n; i++) {
        out[i] = fromArr[i] + (toArr[i] - fromArr[i]) * _applyEase(t, easeName);
      }
      return out;
    }

    function tick(dt) {
      if (!_playing || _done) return;

      if (useSpring) {
        // Spring integration — target is toArr
        let settled = true;
        for (let i = 0; i < _cur.length; i++) {
          const force = (toArr[i] - _cur[i]) * stiffness;
          _vel[i] += (force - _vel[i] * damping) * dt;
          _cur[i] += _vel[i] * dt;
          if (Math.abs(toArr[i] - _cur[i]) > 0.001 || Math.abs(_vel[i]) > 0.001) {
            settled = false;
          }
        }
        values = _cur.slice();
        progress = 1; // spring progress is always converging
        if (settled) {
          values = toArr.slice();
          _done = true;
          _playing = false;
          if (onComplete) onComplete();
        }
      } else {
        _t += dt * _dir;
        progress = Math.max(0, Math.min(1, _t / dur));
        values = _computeEasing(progress);

        if (_t >= dur) {
          if (loopMode === 'loop') {
            _t = 0;
          } else if (loopMode === 'pingpong') {
            _t = dur;
            _dir = -1;
          } else {
            values = toArr.slice();
            progress = 1;
            _done = true;
            _playing = false;
            if (onComplete) onComplete();
          }
        } else if (_t <= 0 && loopMode === 'pingpong') {
          _t = 0;
          _dir = 1;
        }
      }

      if (onUpdate) onUpdate(isArr ? values : values[0], progress);
    }

    function start() {
      _t = 0;
      _dir = 1;
      _done = false;
      _playing = true;
      values = fromArr.slice();
      for (let i = 0; i < _vel.length; i++) {
        _vel[i] = 0;
        _cur[i] = fromArr[i];
      }
    }

    function stop() {
      _playing = false;
    }
    function resume() {
      _playing = true;
    }

    const tw = {
      get value() {
        return isArr ? values : values[0];
      },
      get values() {
        return values;
      },
      get progress() {
        return progress;
      },
      get done() {
        return _done;
      },
      tick,
      start,
      stop,
      resume,
      register() {
        hypeRegister(tw);
        return tw;
      },
      unregister() {
        hypeUnregister(tw);
        return tw;
      },
    };

    return tw;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // createTimeTrigger
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Fires a callback after `interval` seconds.
   *
   * opts:
   *   interval  — seconds between firings                    (default 1)
   *   repeat    — keep firing every interval                 (default false)
   *   callback  — fn()
   *   autoReg   — auto-register with hypeUpdate              (default false)
   *
   * API:
   *   .tick(dt)
   *   .reset()         — restart countdown
   *   .elapsed         — seconds since last reset/fire
   *   .register() / .unregister()
   */
  function createTimeTrigger(opts = {}) {
    const interval = opts.interval ?? 1;
    const repeat = opts.repeat ?? false;
    const cb = opts.callback ?? (() => {});
    let _elapsed = 0;
    let _fired = false;

    function tick(dt) {
      if (_fired && !repeat) return;
      _elapsed += dt;
      if (_elapsed >= interval) {
        if (repeat) {
          _elapsed -= interval;
        } else {
          _elapsed = interval;
          _fired = true;
        }
        cb();
      }
    }

    function reset() {
      _elapsed = 0;
      _fired = false;
    }

    const tr = {
      get elapsed() {
        return _elapsed;
      },
      tick,
      reset,
      register() {
        hypeRegister(tr);
        return tr;
      },
      unregister() {
        hypeUnregister(tr);
        return tr;
      },
    };

    if (opts.autoReg) hypeRegister(tr);
    return tr;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // createRandomTrigger
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Fires a callback with `chance` probability on each tick.
   *
   * opts:
   *   chance    — probability per tick [0..1]                (default 0.05)
   *   callback  — fn()
   *   autoReg   — auto-register with hypeUpdate              (default false)
   *
   * API:
   *   .tick(dt)
   *   .register() / .unregister()
   */
  function createRandomTrigger(opts = {}) {
    const chance = opts.chance ?? 0.05;
    const cb = opts.callback ?? (() => {});

    function tick(_dt) {
      if (Math.random() < chance) cb();
    }

    const rt = {
      tick,
      register() {
        hypeRegister(rt);
        return rt;
      },
      unregister() {
        hypeUnregister(rt);
        return rt;
      },
    };

    if (opts.autoReg) hypeRegister(rt);
    return rt;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // createProximityTrigger
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Fires callbacks when two tracked positions enter or exit a radius.
   *
   * opts:
   *   getFrom   — fn() → {x, y, z?}  — source position getter
   *   getTo     — fn() → {x, y, z?}  — target position getter
   *   radius    — trigger distance                            (default 100)
   *   onEnter   — fn(distance) — called once when inside radius
   *   onExit    — fn(distance) — called once when outside radius
   *   onInside  — fn(distance) — called every tick while inside
   *   autoReg   — auto-register with hypeUpdate              (default false)
   *
   * API:
   *   .tick(dt)
   *   .distance  — current distance between the two positions
   *   .inside    — true if currently within radius
   *   .register() / .unregister()
   */
  function createProximityTrigger(opts = {}) {
    const getFrom = opts.getFrom ?? (() => ({ x: 0, y: 0, z: 0 }));
    const getTo = opts.getTo ?? (() => ({ x: 0, y: 0, z: 0 }));
    const radius = opts.radius ?? 100;
    const onEnter = opts.onEnter ?? null;
    const onExit = opts.onExit ?? null;
    const onInside = opts.onInside ?? null;
    let _inside = false;
    let _dist = Infinity;

    function tick(_dt) {
      const a = getFrom();
      const b = getTo();
      const dx = (a.x ?? 0) - (b.x ?? 0);
      const dy = (a.y ?? 0) - (b.y ?? 0);
      const dz = (a.z ?? 0) - (b.z ?? 0);
      _dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nowInside = _dist <= radius;

      if (nowInside && !_inside) {
        _inside = true;
        if (onEnter) onEnter(_dist);
      } else if (!nowInside && _inside) {
        _inside = false;
        if (onExit) onExit(_dist);
      }
      if (nowInside && onInside) onInside(_dist);
    }

    const pt = {
      get distance() {
        return _dist;
      },
      get inside() {
        return _inside;
      },
      tick,
      register() {
        hypeRegister(pt);
        return pt;
      },
      unregister() {
        hypeUnregister(pt);
        return pt;
      },
    };

    if (opts.autoReg) hypeRegister(pt);
    return pt;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // createHSwarm
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Reynolds steering — N agents with separation, alignment, cohesion + goals.
   *
   * opts:
   *   count         — number of agents                       (default 20)
   *   separation    — weight for avoid-neighbor force         (default 1.5)
   *   alignment     — weight for match-velocity force         (default 1.0)
   *   cohesion      — weight for move-to-center force         (default 1.0)
   *   speed         — max speed                              (default 80)
   *   maxForce      — max steering force per tick             (default 3)
   *   neighborRadius— distance for neighbor detection         (default 60)
   *   bounds        — {x,y,z, w,h,d} wrapping bounds          (optional)
   *   initFn        — fn(agent, i) — custom init for each agent
   *   autoReg       — auto-register with hypeUpdate           (default false)
   *
   * Each agent is a plain object: { x, y, z, vx, vy, vz, [any extras] }
   *
   * API:
   *   .agents[]    — array of agent objects
   *   .goals[]     — attractor positions [{x,y,z,weight}]
   *   .addGoal(x, y, z, weight)   — add attractor (default weight 1)
   *   .removeGoal(index)
   *   .clearGoals()
   *   .tick(dt)
   *   .register() / .unregister()
   */
  function createHSwarm(opts = {}) {
    const count = opts.count ?? 20;
    const wSep = opts.separation ?? 1.5;
    const wAli = opts.alignment ?? 1.0;
    const wCoh = opts.cohesion ?? 1.0;
    const speed = opts.speed ?? 80;
    const maxForce = opts.maxForce ?? 3;
    const neighR = opts.neighborRadius ?? 60;
    const bounds = opts.bounds ?? null;
    const initFn = opts.initFn ?? null;

    const agents = [];
    const goals = [];

    for (let i = 0; i < count; i++) {
      const agent = {
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        z: (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * speed * 0.5,
        vy: (Math.random() - 0.5) * speed * 0.5,
        vz: (Math.random() - 0.5) * speed * 0.5,
      };
      if (initFn) initFn(agent, i);
      agents.push(agent);
    }

    function _limit(vx, vy, vz, max) {
      const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (len > max) {
        const s = max / len;
        return [vx * s, vy * s, vz * s];
      }
      return [vx, vy, vz];
    }

    function _setMag(vx, vy, vz, mag) {
      const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      return [(vx / len) * mag, (vy / len) * mag, (vz / len) * mag];
    }

    function tick(dt) {
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        let sx = 0,
          sy = 0,
          sz = 0; // separation
        let ax = 0,
          ay = 0,
          az = 0; // alignment
        let cx = 0,
          cy = 0,
          cz = 0; // cohesion
        let neighborCount = 0;

        for (let j = 0; j < agents.length; j++) {
          if (i === j) continue;
          const b = agents[j];
          const dx = a.x - b.x,
            dy = a.y - b.y,
            dz = a.z - b.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < neighR && d > 0) {
            // separation — inversely weighted by distance
            sx += dx / d / d;
            sy += dy / d / d;
            sz += dz / d / d;
            // alignment
            ax += b.vx;
            ay += b.vy;
            az += b.vz;
            // cohesion
            cx += b.x;
            cy += b.y;
            cz += b.z;
            neighborCount++;
          }
        }

        let steerX = 0,
          steerY = 0,
          steerZ = 0;

        if (neighborCount > 0) {
          // Separation
          if (wSep > 0) {
            let [fx, fy, fz] = _setMag(sx, sy, sz, speed);
            fx -= a.vx;
            fy -= a.vy;
            fz -= a.vz;
            [fx, fy, fz] = _limit(fx, fy, fz, maxForce);
            steerX += fx * wSep;
            steerY += fy * wSep;
            steerZ += fz * wSep;
          }
          // Alignment
          if (wAli > 0) {
            let [fx, fy, fz] = _setMag(
              ax / neighborCount,
              ay / neighborCount,
              az / neighborCount,
              speed
            );
            fx -= a.vx;
            fy -= a.vy;
            fz -= a.vz;
            [fx, fy, fz] = _limit(fx, fy, fz, maxForce);
            steerX += fx * wAli;
            steerY += fy * wAli;
            steerZ += fz * wAli;
          }
          // Cohesion
          if (wCoh > 0) {
            let [fx, fy, fz] = _setMag(
              cx / neighborCount - a.x,
              cy / neighborCount - a.y,
              cz / neighborCount - a.z,
              speed
            );
            fx -= a.vx;
            fy -= a.vy;
            fz -= a.vz;
            [fx, fy, fz] = _limit(fx, fy, fz, maxForce);
            steerX += fx * wCoh;
            steerY += fy * wCoh;
            steerZ += fz * wCoh;
          }
        }

        // Goal attraction
        for (const g of goals) {
          const w = g.weight ?? 1;
          const gdx = g.x - a.x,
            gdy = g.y - a.y,
            gdz = g.z - a.z;
          let [fx, fy, fz] = _setMag(gdx, gdy, gdz, speed);
          fx -= a.vx;
          fy -= a.vy;
          fz -= a.vz;
          [fx, fy, fz] = _limit(fx, fy, fz, maxForce);
          steerX += fx * w;
          steerY += fy * w;
          steerZ += fz * w;
        }

        a.vx += steerX * dt;
        a.vy += steerY * dt;
        a.vz += steerZ * dt;
        [a.vx, a.vy, a.vz] = _limit(a.vx, a.vy, a.vz, speed);

        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.z += a.vz * dt;

        // Wrap around bounds
        if (bounds) {
          const hw = bounds.w / 2,
            hh = bounds.h / 2,
            hd = (bounds.d ?? bounds.w) / 2;
          const bx = bounds.x ?? 0,
            by = bounds.y ?? 0,
            bz = bounds.z ?? 0;
          if (a.x < bx - hw) a.x += bounds.w;
          if (a.x > bx + hw) a.x -= bounds.w;
          if (a.y < by - hh) a.y += bounds.h;
          if (a.y > by + hh) a.y -= bounds.h;
          if (a.z < bz - hd) a.z += bounds.d ?? bounds.w;
          if (a.z > bz + hd) a.z -= bounds.d ?? bounds.w;
        }
      }
    }

    const swarm = {
      agents,
      goals,
      addGoal(x, y, z, weight = 1) {
        goals.push({ x, y, z, weight });
        return swarm;
      },
      removeGoal(i) {
        goals.splice(i, 1);
        return swarm;
      },
      clearGoals() {
        goals.length = 0;
        return swarm;
      },
      tick,
      register() {
        hypeRegister(swarm);
        return swarm;
      },
      unregister() {
        hypeUnregister(swarm);
        return swarm;
      },
    };

    if (opts.autoReg) hypeRegister(swarm);
    return swarm;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // createColorPool
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Cycles through a palette of Nova64 rgba8() colors.
   *
   * createColorPool(colors, mode)
   *   colors — array of Nova64 color values (rgba8(...) BigInts or numbers)
   *   mode   — 'sequential' | 'random' | 'shuffle'          (default 'sequential')
   *
   * API:
   *   .next()         — advance and return the next color
   *   .current        — current color without advancing
   *   .getColor(i)    — get color at specific index (wraps)
   *   .shuffle()      — randomize order (works in any mode)
   *   .reset()        — reset cursor to 0
   */
  function createColorPool(colors = [], mode = 'sequential') {
    let _pool = colors.slice();
    let _idx = 0;

    function shuffle() {
      for (let i = _pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [_pool[i], _pool[j]] = [_pool[j], _pool[i]];
      }
      _idx = 0;
    }

    function next() {
      if (_pool.length === 0) return 0;
      let color;
      if (mode === 'random') {
        color = _pool[Math.floor(Math.random() * _pool.length)];
      } else {
        color = _pool[_idx];
        _idx = (_idx + 1) % _pool.length;
        if (mode === 'shuffle' && _idx === 0) shuffle();
      }
      return color;
    }

    const cp = {
      get current() {
        return _pool[_idx] ?? 0;
      },
      next,
      getColor(i) {
        return _pool[((i % _pool.length) + _pool.length) % _pool.length];
      },
      shuffle() {
        shuffle();
        return cp;
      },
      reset() {
        _idx = 0;
        return cp;
      },
      // add more colors at runtime
      add(color) {
        _pool.push(color);
        return cp;
      },
    };

    if (mode === 'shuffle') shuffle();

    return cp;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // createHPool
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Object pool with HYPE-style lifecycle hooks.
   *
   * opts:
   *   build()       — fn() → object  — factory called when pool is empty
   *   max           — max pool size  (0 = unlimited)          (default 0)
   *   onCreate(obj) — called once when an object is first built
   *   onRequest(obj)— called every time an object is checked out
   *   onRelease(obj)— called every time an object is returned
   *
   * API:
   *   .request()         — get an object (from pool or newly built)
   *   .release(obj)      — return object to pool
   *   .requestAll(n)     — request n objects, returns array
   *   .releaseAll()      — release all active objects (calls release on each)
   *   .onEach(fn)        — call fn(obj) on every active object
   *   .active            — array of currently checked-out objects
   *   .available         — number of objects in the waiting pool
   */
  function createHPool(opts = {}) {
    const build = opts.build ?? (() => ({}));
    const maxSize = opts.max ?? 0;
    const onCreate = opts.onCreate ?? null;
    const onRequest = opts.onRequest ?? null;
    const onRelease = opts.onRelease ?? null;

    const _pool = []; // waiting (available) objects
    const _active = []; // checked out

    function request() {
      if (maxSize > 0 && _active.length >= maxSize) return null;
      let obj;
      if (_pool.length > 0) {
        obj = _pool.pop();
      } else {
        obj = build();
        if (onCreate) onCreate(obj);
      }
      _active.push(obj);
      if (onRequest) onRequest(obj);
      return obj;
    }

    function release(obj) {
      const idx = _active.indexOf(obj);
      if (idx === -1) return;
      _active.splice(idx, 1);
      if (onRelease) onRelease(obj);
      _pool.push(obj);
    }

    function requestAll(n) {
      const result = [];
      for (let i = 0; i < n; i++) {
        const obj = request();
        if (obj !== null) result.push(obj);
      }
      return result;
    }

    function releaseAll() {
      while (_active.length > 0) release(_active[0]);
    }

    function onEach(fn) {
      for (const obj of _active) fn(obj);
    }

    return {
      get active() {
        return _active;
      },
      get available() {
        return _pool.length;
      },
      request,
      release,
      requestAll,
      releaseAll,
      onEach,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Layout Systems
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * createGridLayout — evenly-spaced 2D or 3D grid of positions.
   *
   * opts:
   *   cols, rows, layers — dimensions (default 4, 4, 1)
   *   spacingX, spacingY, spacingZ — gap between cells (default 50, 50, 50)
   *   originX, originY, originZ   — center of grid     (default 0, 0, 0)
   *
   * API:
   *   .getPositions()  — returns [{x, y, z}, ...] for all grid cells
   *   .each(fn)        — calls fn({x,y,z}, index, col, row, layer)
   */
  function createGridLayout(opts = {}) {
    const cols = opts.cols ?? 4;
    const rows = opts.rows ?? 4;
    const layers = opts.layers ?? 1;
    const sx = opts.spacingX ?? 50;
    const sy = opts.spacingY ?? 50;
    const sz = opts.spacingZ ?? 50;
    const ox = opts.originX ?? 0;
    const oy = opts.originY ?? 0;
    const oz = opts.originZ ?? 0;

    function getPositions() {
      const positions = [];
      const offX = ((cols - 1) * sx) / 2;
      const offY = ((rows - 1) * sy) / 2;
      const offZ = ((layers - 1) * sz) / 2;
      for (let l = 0; l < layers; l++) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            positions.push({
              x: ox + c * sx - offX,
              y: oy + r * sy - offY,
              z: oz + l * sz - offZ,
            });
          }
        }
      }
      return positions;
    }

    function each(fn) {
      const offX = ((cols - 1) * sx) / 2;
      const offY = ((rows - 1) * sy) / 2;
      const offZ = ((layers - 1) * sz) / 2;
      let i = 0;
      for (let l = 0; l < layers; l++) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            fn(
              { x: ox + c * sx - offX, y: oy + r * sy - offY, z: oz + l * sz - offZ },
              i++,
              c,
              r,
              l
            );
          }
        }
      }
    }

    return { getPositions, each };
  }

  /**
   * createCircleLayout — positions around a circle or arc.
   *
   * opts:
   *   count      — number of positions                        (default 8)
   *   radius     — radius                                     (default 100)
   *   startAngle — start of arc in radians                    (default 0)
   *   endAngle   — end of arc in radians                      (default TWO_PI)
   *   plane      — 'xy' | 'xz' | 'yz'                        (default 'xz')
   *   cx, cy, cz — center                                     (default 0,0,0)
   *
   * API:
   *   .getPositions()  — [{x, y, z, angle}, ...]
   *   .each(fn)        — fn({x,y,z,angle}, index)
   */
  function createCircleLayout(opts = {}) {
    const count = opts.count ?? 8;
    const radius = opts.radius ?? 100;
    const startAngle = opts.startAngle ?? 0;
    const endAngle = opts.endAngle ?? Math.PI * 2;
    const plane = opts.plane ?? 'xz';
    const cx = opts.cx ?? 0;
    const cy = opts.cy ?? 0;
    const cz = opts.cz ?? 0;

    function getPositions() {
      const positions = [];
      const span = endAngle - startAngle;
      const step = count > 1 ? span / count : 0;
      for (let i = 0; i < count; i++) {
        const angle = startAngle + i * step;
        const cos = Math.cos(angle) * radius;
        const sin = Math.sin(angle) * radius;
        let x = cx,
          y = cy,
          z = cz;
        if (plane === 'xz') {
          x += cos;
          z += sin;
        } else if (plane === 'xy') {
          x += cos;
          y += sin;
        } else if (plane === 'yz') {
          y += cos;
          z += sin;
        }
        positions.push({ x, y, z, angle });
      }
      return positions;
    }

    function each(fn) {
      getPositions().forEach(fn);
    }

    return { getPositions, each };
  }

  /**
   * createSphereLayout — Fibonacci sphere distribution for uniform surface coverage.
   *
   * opts:
   *   count  — number of positions   (default 20)
   *   radius — sphere radius          (default 100)
   *   cx, cy, cz — center             (default 0,0,0)
   *
   * API:
   *   .getPositions()  — [{x, y, z}, ...]
   *   .each(fn)        — fn({x,y,z}, index)
   */
  function createSphereLayout(opts = {}) {
    const count = opts.count ?? 20;
    const radius = opts.radius ?? 100;
    const cx = opts.cx ?? 0;
    const cy = opts.cy ?? 0;
    const cz = opts.cz ?? 0;
    const golden = Math.PI * (3 - Math.sqrt(5)); // golden angle in radians

    function getPositions() {
      const positions = [];
      for (let i = 0; i < count; i++) {
        const y = cx + (1 - (i / (count - 1)) * 2) * radius;
        const r = Math.sqrt(radius * radius - (y - cx) * (y - cx));
        const theta = golden * i;
        positions.push({
          x: cx + Math.cos(theta) * r,
          y: cy + y - cx,
          z: cz + Math.sin(theta) * r,
        });
      }
      return positions;
    }

    function each(fn) {
      getPositions().forEach(fn);
    }

    return { getPositions, each };
  }

  /**
   * createPathLayout — positions along a polyline or cubic bezier path.
   *
   * opts:
   *   points — [{x,y,z}, ...] control points  (minimum 2 for linear, 4n for bezier)
   *   count  — number of evenly-spaced positions along path (default 10)
   *   mode   — 'linear' | 'bezier'                          (default 'linear')
   *
   * API:
   *   .getPositions()  — [{x, y, z, t}, ...]  (t = 0..1 along path)
   *   .each(fn)        — fn({x,y,z,t}, index)
   *   .getAt(t)        — {x, y, z} at normalized position t ∈ [0, 1]
   */
  function createPathLayout(opts = {}) {
    const points = opts.points ?? [
      { x: -100, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
    ];
    const count = opts.count ?? 10;
    const mode = opts.mode ?? 'linear';

    function _lerp3(a, b, t) {
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    }

    function _bezier3(p0, p1, p2, p3, t) {
      const mt = 1 - t;
      return {
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
        z: mt * mt * mt * p0.z + 3 * mt * mt * t * p1.z + 3 * mt * t * t * p2.z + t * t * t * p3.z,
      };
    }

    function getAt(t) {
      t = Math.max(0, Math.min(1, t));
      if (mode === 'bezier') {
        // Treat points as groups of 4 (p0,p1,p2,p3), multiple segments
        const segs = Math.floor((points.length - 1) / 3);
        if (segs < 1) return points[0] ?? { x: 0, y: 0, z: 0 };
        const seg = Math.min(Math.floor(t * segs), segs - 1);
        const local = t * segs - seg;
        const base = seg * 3;
        return _bezier3(points[base], points[base + 1], points[base + 2], points[base + 3], local);
      } else {
        // Linear — interpolate along polyline
        const segs = points.length - 1;
        if (segs < 1) return points[0] ?? { x: 0, y: 0, z: 0 };
        const seg = Math.min(Math.floor(t * segs), segs - 1);
        const local = t * segs - seg;
        return _lerp3(points[seg], points[seg + 1], local);
      }
    }

    function getPositions() {
      const positions = [];
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0;
        positions.push({ ...getAt(t), t });
      }
      return positions;
    }

    function each(fn) {
      getPositions().forEach(fn);
    }

    return { getPositions, each, getAt };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // exposeTo
  // ═══════════════════════════════════════════════════════════════════════════
  return {
    exposeTo(target) {
      Object.assign(target, {
        // Registry
        hypeRegister,
        hypeUnregister,
        hypeUpdate,
        hypeReset,
        // Behaviors
        createOscillator,
        createTween, // unified version from tween.js
        createTimeTrigger,
        createRandomTrigger,
        createProximityTrigger,
        createHSwarm,
        // Color & Pool
        createColorPool,
        createHPool,
        // Layouts
        createGridLayout,
        createCircleLayout,
        createSphereLayout,
        createPathLayout,
      });
    },
  };
}
