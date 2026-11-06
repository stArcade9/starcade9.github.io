// runtime/core-compat.js
// Libretro-core APIs that carts moved from retroarch/games still call:
// printBold/Tight/Flash/OutlineTight, hline/vline/circ, setSkyColor,
// setInstanceTransforms, project3DToScreen, rngRandom, the burst particle
// helpers and the wave manager. Semantics follow retroarch/nova64_libretro.c.
//
// Everything here is plain JS built on host primitives, so the same factory
// runs in the web runtime and inside the Godot shim. Colours are passed
// straight through to the host's own draw calls (each host has its own
// rgba8 encoding), so nothing here inspects a colour value.
//
// The Godot shim carries a verbatim copy of createCoreCompat between the
// BEGIN/END core-compat marker comments below; tests/test-core-compat.js
// fails if the two copies drift apart.

// BEGIN core-compat
function createCoreCompat(h) {
  const GLYPH_W = 6;

  function printBold(text, x, y, color) {
    h.print(text, x, y, color);
    h.print(text, x + 1, y, color);
  }
  // The core's "tight" font trims glyph spacing; the hosts only have one
  // font, so tight text is regular text with the same alignment rules.
  function alignedX(text, x, align, scale) {
    const w = String(text == null ? '' : text).length * GLYPH_W * (scale || 1);
    if (align === 'center' || align === 1) return x - (w >> 1);
    if (align === 'right' || align === 2) return x - w;
    return x;
  }
  function printTight(text, x, y, color, align, scale) {
    h.print(text, alignedX(text, x, align, scale), y, color, scale || 1);
  }
  function printOutlineTight(text, x, y, color, outline, align) {
    const ax = alignedX(text, x, align, 1);
    h.print(text, ax - 1, y, outline);
    h.print(text, ax + 1, y, outline);
    h.print(text, ax, y - 1, outline);
    h.print(text, ax, y + 1, outline);
    h.print(text, ax, y, color);
  }
  // printFlash(x, y, text, color, t, hz): visible on even half-periods.
  function printFlash(x, y, text, color, t, hz) {
    const f = hz == null ? 2 : hz;
    if ((Math.trunc((t || 0) * f * 2) & 1) === 0) h.print(text, x, y, color);
  }
  function hline(x0, y, x1, color) {
    h.line(x0, y, x1, y, color);
  }
  function vline(x, y0, y1, color) {
    h.line(x, y0, x, y1, color);
  }
  function circ(x, y, r, color) {
    h.circle(x, y, r, color, false);
  }
  function circfill(x, y, r, color) {
    h.circle(x, y, r, color, true);
  }

  function setSkyColor(top, bottom) {
    return h.createGradientSkybox(top, bottom == null ? top : bottom);
  }
  function clearSkyColor() {
    h.clearSkybox();
  }

  // Column-major 4x4 matrices (Three.js / GL order), decomposed into the
  // position / XYZ Euler / scale form every host's setInstanceTransform takes.
  function setInstanceTransforms(mesh, start, mats) {
    if (!mats || mats.length < 16) return;
    const n = Math.floor(mats.length / 16);
    for (let k = 0; k < n; k++) {
      const m = mats.slice
        ? mats.slice(k * 16, k * 16 + 16)
        : Array.prototype.slice.call(mats, k * 16, k * 16 + 16);
      const sx = Math.hypot(m[0], m[1], m[2]);
      const sy = Math.hypot(m[4], m[5], m[6]);
      const sz = Math.hypot(m[8], m[9], m[10]);
      const r11 = sx ? m[0] / sx : 0,
        r21 = sx ? m[1] / sx : 0,
        r31 = sx ? m[2] / sx : 0;
      const r12 = sy ? m[4] / sy : 0,
        r22 = sy ? m[5] / sy : 0,
        r32 = sy ? m[6] / sy : 0;
      const r13 = sz ? m[8] / sz : 0,
        r23 = sz ? m[9] / sz : 0,
        r33 = sz ? m[10] / sz : 0;
      const ry = Math.asin(Math.max(-1, Math.min(1, r13)));
      let rx, rz;
      if (Math.abs(r13) < 0.9999999) {
        rx = Math.atan2(-r23, r33);
        rz = Math.atan2(-r12, r11);
      } else {
        rx = Math.atan2(r32, r22);
        rz = 0;
      }
      void r21;
      void r31;
      h.setInstanceTransform(mesh, (start | 0) + k, m[12], m[13], m[14], rx, ry, rz, sx, sy, sz);
    }
  }

  // Look-at perspective projection for hosts that only know camera
  // position / target / fov. Returns the core's { x, y, z, visible } shape.
  function projectLookAt(pos, target, fovDeg, w, hgt, wx, wy, wz) {
    let fx = target[0] - pos[0],
      fy = target[1] - pos[1],
      fz = target[2] - pos[2];
    const fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl;
    fy /= fl;
    fz /= fl;
    // right = forward x up(0,1,0)
    let rx = -fz,
      ry = 0,
      rz = fx;
    const rl = Math.hypot(rx, ry, rz) || 1;
    rx /= rl;
    rz /= rl;
    const ux = ry * fz - rz * fy,
      uy = rz * fx - rx * fz,
      uz = rx * fy - ry * fx;
    const dx = wx - pos[0],
      dy = wy - pos[1],
      dz = wz - pos[2];
    const cx = dx * rx + dy * ry + dz * rz;
    const cy = dx * ux + dy * uy + dz * uz;
    const depth = dx * fx + dy * fy + dz * fz;
    if (depth <= 1e-6) return { x: 0, y: 0, z: 1, visible: false };
    const f = 1 / Math.tan(((fovDeg || 75) * Math.PI) / 360);
    const ndcx = (cx * f) / ((w / hgt) * depth);
    const ndcy = (cy * f) / depth;
    return {
      x: (ndcx + 1) * 0.5 * w,
      y: (1 - ndcy) * 0.5 * hgt,
      z: depth,
      visible: ndcx > -1 && ndcx < 1 && ndcy > -1 && ndcy < 1,
    };
  }
  function project3DToScreen(x, y, z) {
    return h.project(x || 0, y || 0, z || 0);
  }

  // rngRandom(handle?) — the core's LCG. Without a handle the core returns 0,
  // which makes "random" carts degenerate; we fall back to Math.random.
  const rngs = new Map();
  function createRng(seed) {
    const id = rngs.size + 1;
    rngs.set(id, seed >>> 0 || 1);
    return id;
  }
  function rngRandom(handle) {
    if (!rngs.has(handle)) return Math.random();
    const s = (Math.imul(rngs.get(handle), 1664525) + 1013904223) >>> 0;
    rngs.set(handle, s);
    return (s >>> 8) / 0x00ffffff;
  }

  // Bursts: radial pixel particles with gravity (core: createBurst et al).
  const bursts = new Map();
  let nextBurst = 1;
  function spawnBurst(b, ox, oy, speed) {
    for (let i = 0; i < b.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      const life = 0.6 + Math.random() * 0.6;
      b.p[i] = { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life };
    }
  }
  function createBurst(x, y, count, speed) {
    const n = Math.max(1, Math.min(256, count == null ? 12 : count | 0));
    const b = { count: n, gravity: 120, colors: [h.white], p: [] };
    spawnBurst(b, x || 0, y || 0, speed == null ? 80 : speed);
    const id = nextBurst++;
    bursts.set(id, b);
    return id;
  }
  function triggerBurst(id, x, y, speed) {
    const b = bursts.get(id);
    if (b) spawnBurst(b, x || 0, y || 0, speed == null ? 80 : speed);
  }
  function updateBurst(id, dt) {
    const b = bursts.get(id);
    if (!b) return;
    for (const q of b.p) {
      if (q.life <= 0) continue;
      q.vy += b.gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.life -= dt;
    }
  }
  function drawBurst(id) {
    const b = bursts.get(id);
    if (!b) return;
    b.p.forEach((q, i) => {
      if (q.life > 0) h.pset(q.x | 0, q.y | 0, b.colors[i % b.colors.length]);
    });
  }
  function isBurstDone(id) {
    const b = bursts.get(id);
    return !b || b.p.every(q => q.life <= 0);
  }
  function setBurstColors(id, ...cols) {
    const b = bursts.get(id);
    if (b && cols.length) b.colors = cols.slice(0, 4);
  }
  function destroyBurst(id) {
    bursts.delete(id);
  }

  // Wave manager (core: createWaveManager et al).
  const waves = new Map();
  let nextWave = 1;
  function createWaveManager() {
    const id = nextWave++;
    waves.set(id, { wave: 0, count: 0, remaining: 0, active: false });
    return id;
  }
  function startWave(id, count) {
    const w = waves.get(id);
    if (!w) return;
    const n = count == null ? 5 : count | 0;
    w.wave++;
    w.count = n;
    w.remaining = n;
    w.active = true;
  }
  function nextWaveFn(id, count) {
    startWave(id, count);
  }
  function enemyDefeated(id) {
    const w = waves.get(id);
    if (!w) return;
    if (w.remaining > 0) w.remaining--;
    if (w.remaining === 0) w.active = false;
  }
  const getWaveNumber = id => (waves.get(id) ? waves.get(id).wave : 0);
  const isWaveActive = id => {
    const w = waves.get(id);
    return !!(w && w.active && w.remaining > 0);
  };
  const getRemainingEnemies = id => (waves.get(id) ? waves.get(id).remaining : 0);
  function destroyWaveManager(id) {
    waves.delete(id);
  }

  function reset() {
    rngs.clear();
    bursts.clear();
    waves.clear();
  }

  return {
    draw: { printBold, printTight, printOutlineTight, printFlash, hline, vline, circ, circfill },
    light: { setSkyColor, clearSkyColor },
    scene: { setInstanceTransforms },
    camera: { project3DToScreen },
    util: {
      createRng,
      rngRandom,
      createBurst,
      triggerBurst,
      updateBurst,
      drawBurst,
      isBurstDone,
      setBurstColors,
      destroyBurst,
      createWaveManager,
      startWave,
      nextWave: nextWaveFn,
      enemyDefeated,
      getWaveNumber,
      isWaveActive,
      getRemainingEnemies,
      destroyWaveManager,
    },
    projectLookAt,
    reset,
  };
}
// END core-compat

export { createCoreCompat };
