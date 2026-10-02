// 09-errors.js — verifies bridge error contract for invalid inputs.
// Cart accumulates pass/fail into globalThis.__nova64_assert which the
// conformance harness scrapes after N frames.

const results = [];
function expect(name, fn) {
  try {
    const ok = !!fn();
    results.push({ name, ok });
    print(`[09-errors] ${ok ? 'PASS' : 'FAIL'} ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e) });
    print(`[09-errors] FAIL ${name} threw: ${e}`);
  }
}

export function init() {
  const caps = engine.call('engine.init', {}).capabilities;
  print('[09-errors] adapter=' + caps.adapterVersion + ' backend=' + caps.backend);

  expect('unknown method returns error', () => {
    const r = engine.call('does.not.exist', {});
    return r && r.error === 'unsupported_method';
  });

  expect('mesh.setMaterial with bad handle errors', () => {
    const r = engine.call('mesh.setMaterial', { mesh: 999999, material: 999998 });
    return r && typeof r.error === 'string';
  });

  expect('transform.set with bad handle errors', () => {
    const r = engine.call('transform.set', { handle: 0, position: [0, 0, 0] });
    return r && typeof r.error === 'string';
  });

  expect('flush with non-array throws', () => {
    try { engine.flush('nope'); return false; } catch (_) { return true; }
  });

  expect('flush dispatches batched commands', () => {
    const out = engine.flush([
      ['engine.init', {}],
      ['does.not.exist', {}],
    ]);
    return Array.isArray(out) && out.length === 2 && out[0].capabilities && out[1].error;
  });

  // Expose to harness.
  globalThis.__nova64_assert = {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    results,
  };
}

export function update() {}
