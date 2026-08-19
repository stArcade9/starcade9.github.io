// 10-stress.js — handle lifecycle stress test. Allocates and frees a large
// number of materials/meshes via batched flush to exercise the handle table
// and ensure no IDs are recycled and destroy() returns ok for all.

const N = 256;
const results = [];
function expect(name, fn) {
  try {
    const ok = !!fn();
    results.push({ name, ok });
    print(`[10-stress] ${ok ? 'PASS' : 'FAIL'} ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e) });
    print(`[10-stress] FAIL ${name} threw: ${e}`);
  }
}

export function init() {
  print('[10-stress] allocating ' + N + ' materials');
  const createCmds = [];
  for (let i = 0; i < N; i++) {
    createCmds.push(['material.create', { albedo: [Math.random(), Math.random(), Math.random(), 1] }]);
  }
  const created = engine.flush(createCmds);

  expect('all creates succeeded', () => created.every((r) => typeof r.handle === 'number' && r.handle > 0));

  const ids = created.map((r) => r.handle);
  const unique = new Set(ids);
  expect('all handles unique', () => unique.size === ids.length);

  const min = Math.min(...ids);
  const max = Math.max(...ids);
  expect('handles monotonic-ish (max - min >= N - 1)', () => (max - min) >= N - 1);

  // Destroy all.
  const destroyCmds = ids.map((h) => ['material.destroy', { handle: h }]);
  const destroyed = engine.flush(destroyCmds);
  expect('all destroys ok', () => destroyed.every((r) => r.ok === true));

  // Re-destroy must error (not silently succeed) — verifies handle table
  // really removed the entry.
  const reDestroy = engine.flush(ids.slice(0, 4).map((h) => ['material.destroy', { handle: h }]));
  expect('double destroy returns ok=false', () => reDestroy.every((r) => r.ok === false));

  // After destruction, allocate again — IDs must be strictly greater than
  // any previously allocated id (no recycling).
  const more = engine.flush([['material.create', { albedo: [1, 1, 1, 1] }]]);
  expect('new id strictly greater than all previous', () => more[0].handle > max);

  globalThis.__nova64_assert = {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    results,
  };
}

export function update() {}
