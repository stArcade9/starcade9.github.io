// 08-capabilities.js — verifies the capability descriptor shape matches
// the engine adapter contract v1.0.0.

const results = [];
function expect(name, fn) {
  try {
    const ok = !!fn();
    results.push({ name, ok });
    print(`[08-caps] ${ok ? 'PASS' : 'FAIL'} ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e) });
    print(`[08-caps] FAIL ${name} threw: ${e}`);
  }
}

export function init() {
  const r = engine.call('engine.init', {});
  const caps = r && r.capabilities;

  expect('engine.init returned capabilities', () => caps && typeof caps === 'object');
  expect('contractVersion is string', () => typeof caps.contractVersion === 'string');
  expect('contractVersion matches 1.x', () => /^1\./.test(caps.contractVersion));
  expect('adapterVersion is string', () => typeof caps.adapterVersion === 'string');
  expect('backend is godot', () => caps.backend === 'godot');
  expect('features is array', () => Array.isArray(caps.features));
  expect('features non-empty', () => caps.features.length > 0);

  const required = [
    'engine.init',
    'engine.flush',
    'material.create',
    'geometry.createBox',
    'mesh.create',
    'transform.set',
    'camera.create',
    'light.createDirectional',
    'input.poll',
  ];
  for (const f of required) {
    expect(`feature ${f} present`, () => caps.features.indexOf(f) !== -1);
  }

  globalThis.__nova64_assert = {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    results,
  };
}

export function update() {}
