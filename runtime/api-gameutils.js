// runtime/api-gameutils.js
// Nova64 Game Utility API
// Reusable gameplay systems: screen shake, cooldowns, invulnerability, spawning, object pools.
// All pure logic — no GPU dependency.

// ── Screen Shake ──────────────────────────────────────────────────────────────

/**
 * createShake(opts?) — create a screen-shake state.
 *   decay: how fast shake dies (default 4)
 *   maxMag: clamp magnitude (default 20)
 * Returns a shake object to pass to triggerShake/updateShake/getShakeOffset.
 */
function createShake(opts = {}) {
  return {
    mag: 0,
    x: 0,
    y: 0,
    decay: opts.decay ?? 4,
    maxMag: opts.maxMag ?? 20,
  };
}

/** triggerShake(shake, magnitude) — fire a shake impulse. Stacks with existing shake. */
function triggerShake(shake, magnitude) {
  shake.mag = Math.min(shake.mag + magnitude, shake.maxMag);
}

/** updateShake(shake, dt) — call every frame in update(). Updates shake.x, shake.y offsets. */
function updateShake(shake, dt) {
  if (shake.mag > 0.01) {
    shake.x = (Math.random() - 0.5) * shake.mag * 1.5;
    shake.y = (Math.random() - 0.5) * shake.mag * 1.5;
    shake.mag -= shake.decay * dt;
  } else {
    shake.mag = 0;
    shake.x = 0;
    shake.y = 0;
  }
}

/**
 * getShakeOffset(shake) — returns [x, y] pixel offset.
 * Add to your camera position or 2D draw offsets.
 */
function getShakeOffset(shake) {
  return [shake.x, shake.y];
}

// ── Cooldown Timers ───────────────────────────────────────────────────────────

/**
 * createCooldown(duration) — create a cooldown timer.
 * Returns an object with { remaining, duration }.
 */
function createCooldown(duration) {
  return { remaining: 0, duration };
}

/** useCooldown(cd) — try to use the ability. Returns true if ready, false if on cooldown. */
function useCooldown(cd) {
  if (cd.remaining > 0) return false;
  cd.remaining = cd.duration;
  return true;
}

/** cooldownReady(cd) — check if cooldown is available. */
function cooldownReady(cd) {
  return cd.remaining <= 0;
}

/** cooldownProgress(cd) — returns 0..1 (0 = just fired, 1 = fully ready). */
function cooldownProgress(cd) {
  if (cd.duration <= 0) return 1;
  return Math.max(0, 1 - cd.remaining / cd.duration);
}

/** updateCooldown(cd, dt) — tick a single cooldown. Call in update(). */
function updateCooldown(cd, dt) {
  if (cd.remaining > 0) cd.remaining = Math.max(0, cd.remaining - dt);
}

/**
 * createCooldownSet(defs) — create multiple named cooldowns at once.
 *   defs: { attack: 0.3, dash: 0.6, missile: 1.5, ... }
 * Returns an object with the same keys, each containing a cooldown.
 */
function createCooldownSet(defs) {
  const set = {};
  for (const [name, dur] of Object.entries(defs)) {
    set[name] = createCooldown(dur);
  }
  return set;
}

/** updateCooldowns(set, dt) — tick all cooldowns in a set. */
function updateCooldowns(set, dt) {
  for (const key in set) {
    updateCooldown(set[key], dt);
  }
}

// ── Hit State / Invulnerability ───────────────────────────────────────────────

/**
 * createHitState(opts?) — create a hit/invulnerability tracker.
 *   invulnDuration: seconds of invincibility after hit (default 0.8)
 *   blinkRate: speed of visibility blink during invuln (default 25)
 */
function createHitState(opts = {}) {
  return {
    invulnTimer: 0,
    invulnDuration: opts.invulnDuration ?? 0.8,
    blinkRate: opts.blinkRate ?? 25,
    flashTimer: 0,
  };
}

/**
 * triggerHit(hitState) — call when entity takes damage.
 * Returns false if currently invulnerable (damage should be ignored).
 * Returns true if the hit lands (apply damage, starts invuln).
 */
function triggerHit(hitState) {
  if (hitState.invulnTimer > 0) return false;
  hitState.invulnTimer = hitState.invulnDuration;
  hitState.flashTimer = 0.1;
  return true;
}

/** isInvulnerable(hitState) — true while invulnerability is active. */
function isInvulnerable(hitState) {
  return hitState.invulnTimer > 0;
}

/** isVisible(hitState, time) — returns true/false for blink effect during invuln. Always true when not invuln. */
function isVisible(hitState, time) {
  if (hitState.invulnTimer <= 0) return true;
  return Math.sin(time * hitState.blinkRate) > 0;
}

/** isFlashing(hitState) — true for the brief white-flash moment right after being hit. */
function isFlashing(hitState) {
  return hitState.flashTimer > 0;
}

/** updateHitState(hitState, dt) — tick timers. Call in update(). */
function updateHitState(hitState, dt) {
  if (hitState.invulnTimer > 0) hitState.invulnTimer = Math.max(0, hitState.invulnTimer - dt);
  if (hitState.flashTimer > 0) hitState.flashTimer = Math.max(0, hitState.flashTimer - dt);
}

// ── Spawn Wave Manager ────────────────────────────────────────────────────────

/**
 * createSpawner(opts) — create a wave-based spawn manager.
 *   waveInterval: seconds between waves (default 10)
 *   baseCount: enemies in wave 1 (default 3)
 *   countGrowth: extra enemies per wave (default 1)
 *   maxCount: cap per wave (default 20)
 *   spawnFn: function(waveNum, index, count) called for each spawn
 */
function createSpawner(opts = {}) {
  return {
    wave: 0,
    timer: opts.initialDelay ?? opts.waveInterval ?? 10,
    waveInterval: opts.waveInterval ?? 10,
    baseCount: opts.baseCount ?? 3,
    countGrowth: opts.countGrowth ?? 1,
    maxCount: opts.maxCount ?? 20,
    spawnFn: opts.spawnFn ?? null,
    active: true,
    totalSpawned: 0,
  };
}

/** updateSpawner(spawner, dt) — tick the spawner. Calls spawnFn when a wave fires. */
function updateSpawner(spawner, dt) {
  if (!spawner.active) return;
  spawner.timer -= dt;
  if (spawner.timer <= 0) {
    spawner.wave++;
    spawner.timer = spawner.waveInterval;
    const count = Math.min(
      spawner.baseCount + (spawner.wave - 1) * spawner.countGrowth,
      spawner.maxCount
    );
    if (spawner.spawnFn) {
      for (let i = 0; i < count; i++) {
        spawner.spawnFn(spawner.wave, i, count);
        spawner.totalSpawned++;
      }
    }
  }
}

/** triggerWave(spawner) — force an immediate wave spawn. */
function triggerWave(spawner) {
  spawner.timer = 0;
}

/** getSpawnerWave(spawner) — returns current wave number. */
function getSpawnerWave(spawner) {
  return spawner.wave;
}

// ── Object Pool ───────────────────────────────────────────────────────────────

/**
 * createPool(maxSize, factory?) — create a fixed-size object pool.
 *   maxSize: max live objects (default 100)
 *   factory: fn() → new object (default: () => ({}))
 *
 * Returns pool with .spawn(initFn), .forEach(fn), .recycle(), .count, .items
 */
function createPool(maxSize = 100, factory) {
  const _factory = factory ?? (() => ({}));
  const items = [];
  for (let i = 0; i < maxSize; i++) {
    const obj = _factory();
    obj._poolAlive = false;
    items.push(obj);
  }

  return {
    items,

    /** spawn(initFn?) — activate a pooled object. initFn(obj) sets it up. Returns obj or null if full. */
    spawn(initFn) {
      for (let i = 0; i < items.length; i++) {
        if (!items[i]._poolAlive) {
          items[i]._poolAlive = true;
          if (initFn) initFn(items[i]);
          return items[i];
        }
      }
      return null; // Pool exhausted
    },

    /** forEach(fn) — iterate only alive objects. fn(obj, index) — return false to kill that object. */
    forEach(fn) {
      for (let i = 0; i < items.length; i++) {
        if (!items[i]._poolAlive) continue;
        const result = fn(items[i], i);
        if (result === false) items[i]._poolAlive = false;
      }
    },

    /** kill(obj) — deactivate a specific pooled object. */
    kill(obj) {
      obj._poolAlive = false;
    },

    /** recycle() — deactivate all objects. */
    recycle() {
      for (let i = 0; i < items.length; i++) items[i]._poolAlive = false;
    },

    /** count — number of currently alive objects. */
    get count() {
      let n = 0;
      for (let i = 0; i < items.length; i++) if (items[i]._poolAlive) n++;
      return n;
    },
  };
}

// ── Floating Text System ──────────────────────────────────────────────────────

/**
 * createFloatingTextSystem() — manages floating text (damage numbers, pickups, etc.)
 * Returns system with .spawn(), .update(), .getTexts()
 * Drawing is done separately via drawFloatingTexts() or drawFloatingTexts3D() in the 2D API.
 */
function createFloatingTextSystem() {
  const texts = [];

  return {
    /**
     * spawn(text, x, y, opts?) — add a 2D floating text at screen coordinates.
     *   color: 0xRRGGBB (default white)
     *   duration: lifetime in seconds (default 1.0)
     *   riseSpeed: pixels/sec upward drift (default 30)
     *   vx, vy: custom velocity overrides
     *   scale: text scale (default 1)
     *   z: world-space Z (for 3D texts — use with drawFloatingTexts3D)
     *   vz: world-space Z velocity (default 0)
     */
    spawn(text, x, y, opts = {}) {
      const is3D = opts.z !== undefined;
      texts.push({
        text: String(text),
        x,
        y,
        z: opts.z,
        vx: opts.vx ?? 0,
        vy: opts.vy ?? (is3D ? (opts.riseSpeed ?? 2) : -(opts.riseSpeed ?? 30)),
        vz: opts.vz ?? 0,
        timer: opts.duration ?? 1.0,
        maxTimer: opts.duration ?? 1.0,
        color: opts.color ?? 0xffffff,
        scale: opts.scale ?? 1,
      });
    },

    /** update(dt) — tick all texts. Call in update(). */
    update(dt) {
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        if (t.z !== undefined) t.z += t.vz * dt;
        t.timer -= dt;
        if (t.timer <= 0) texts.splice(i, 1);
      }
    },

    /** getTexts() — returns array of active texts for drawing. */
    getTexts() {
      return texts;
    },

    /** clear() — remove all texts. */
    clear() {
      texts.length = 0;
    },

    /** count — number of active texts. */
    get count() {
      return texts.length;
    },
  };
}

// ── State Machine ─────────────────────────────────────────────────────────────

/**
 * createStateMachine(initialState) — simple finite state machine.
 * Great for game states (title, playing, paused, gameover) or enemy AI.
 */
function createStateMachine(initialState) {
  let current = initialState;
  let elapsed = 0;
  const handlers = {};

  return {
    /** on(state, { enter?, update?, exit? }) — register handlers for a state. */
    on(state, fns) {
      handlers[state] = fns;
      return this;
    },

    /** switchTo(state) — transition to a new state. Calls exit() on old, enter() on new. */
    switchTo(state) {
      if (handlers[current]?.exit) handlers[current].exit();
      current = state;
      elapsed = 0;
      if (handlers[current]?.enter) handlers[current].enter();
    },

    /** update(dt) — tick the current state. Calls the state's update(dt, elapsed). */
    update(dt) {
      elapsed += dt;
      if (handlers[current]?.update) handlers[current].update(dt, elapsed);
    },

    /** getState() — returns current state name. */
    getState() {
      return current;
    },

    /** getElapsed() — seconds spent in current state. */
    getElapsed() {
      return elapsed;
    },

    /** is(state) — check if currently in a state. */
    is(state) {
      return current === state;
    },
  };
}

// ── Eased Timer ───────────────────────────────────────────────────────────────

/**
 * createTimer(duration, opts?) — one-shot or looping timer with progress.
 *   loop: boolean (default false)
 *   onComplete: callback when timer finishes
 */
function createTimer(duration, opts = {}) {
  return {
    elapsed: 0,
    duration,
    loop: opts.loop ?? false,
    onComplete: opts.onComplete ?? null,
    done: false,

    /** update(dt) — tick the timer. */
    update(dt) {
      if (this.done && !this.loop) return;
      this.elapsed += dt;
      if (this.elapsed >= this.duration) {
        if (this.loop) {
          this.elapsed -= this.duration;
        } else {
          this.elapsed = this.duration;
          this.done = true;
        }
        if (this.onComplete) this.onComplete();
      }
    },

    /** progress() — returns 0..1 normalized progress. */
    progress() {
      return Math.min(1, this.elapsed / this.duration);
    },

    /** reset() — restart the timer. */
    reset() {
      this.elapsed = 0;
      this.done = false;
    },
  };
}

// ── Module Export ──────────────────────────────────────────────────────────────

export function gameUtilsApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        // Screen Shake
        createShake,
        triggerShake,
        updateShake,
        getShakeOffset,

        // Cooldowns
        createCooldown,
        useCooldown,
        cooldownReady,
        cooldownProgress,
        updateCooldown,
        createCooldownSet,
        updateCooldowns,

        // Hit State / Invulnerability
        createHitState,
        triggerHit,
        isInvulnerable,
        isVisible,
        isFlashing,
        updateHitState,

        // Spawn Waves
        createSpawner,
        updateSpawner,
        triggerWave,
        getSpawnerWave,

        // Object Pool
        createPool,

        // Floating Text
        createFloatingTextSystem,

        // State Machine
        createStateMachine,

        // Timer
        createTimer,
      });
    },
  };
}
