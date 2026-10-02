// 04-instances.js — stress test for mesh.createInstanced.
//
// Spawns N small cubes via a single MultiMeshInstance3D and animates them
// in a wave grid. One draw call regardless of count.

const N = 32;        // grid side
const COUNT = N * N; // total instances
let multi = 0;
let elapsed = 0;

function call(method, payload) {
  const r = engine.call(method, payload || {});
  if (r && r.error) throw new Error(method + ' failed: ' + r.error);
  return r;
}

export function init() {
  const caps = call('engine.init').capabilities;
  print('[04-instances] booted on ' + caps.backend + ' adapter=' + caps.adapterVersion);

  call('light.createDirectional', { color: [1, 1, 1, 1], energy: 1.4 });

  const mat = call('material.create', {
    albedo: [0.55, 0.85, 1.0, 1.0],
    metallic: 0.2,
    roughness: 0.4,
  }).handle;

  const geom = call('geometry.createBox', { size: [0.6, 0.6, 0.6] }).handle;
  multi = call('mesh.createInstanced', {
    geometry: geom,
    material: mat,
    count: COUNT,
  }).handle;

  // Lay out an N x N grid centered on origin (batched).
  const layout = new Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const x = (i % N) - N / 2;
    const z = Math.floor(i / N) - N / 2;
    layout[i] = ['instance.setTransform', { handle: multi, index: i, position: [x, 0, z] }];
  }
  engine.flush(layout);

  const cam = call('camera.create', {}).handle;
  call('transform.set', { handle: cam, position: [0, 18, 22], rotation: [-0.55, 0, 0] });
  call('camera.setActive', { handle: cam });

  print('[04-instances] ready, count=' + COUNT);
}

export function update(dt) {
  elapsed += dt;
  // Batch all per-instance updates into a single host call.
  const cmds = new Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const x = (i % N) - N / 2;
    const z = Math.floor(i / N) - N / 2;
    const d = Math.sqrt(x * x + z * z);
    const y = Math.sin(d * 0.45 - elapsed * 2.5) * 0.9;
    cmds[i] = ['instance.setTransform', {
      handle: multi,
      index: i,
      position: [x, y, z],
      rotation: [0, elapsed * 0.5 + i * 0.01, 0],
    }];
  }
  engine.flush(cmds);
}
