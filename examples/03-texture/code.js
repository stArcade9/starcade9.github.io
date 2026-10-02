// 03-texture.js — procedurally generates a checkerboard texture and
// applies it as the cube's albedo. Exercises texture.createFromImage with
// the {width,height,pixels} variant.

let cube = 0;
let elapsed = 0;

function call(method, payload) {
  const r = engine.call(method, payload || {});
  if (r && r.error) throw new Error(method + ' failed: ' + r.error);
  return r;
}

function buildCheckerboard(size, tile) {
  const px = new Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = ((Math.floor(x / tile) + Math.floor(y / tile)) & 1) === 0;
      const o = (y * size + x) * 4;
      px[o    ] = cell ? 230 : 40;
      px[o + 1] = cell ? 80  : 200;
      px[o + 2] = cell ? 60  : 110;
      px[o + 3] = 255;
    }
  }
  return px;
}

export function init() {
  const caps = call('engine.init').capabilities;
  print('[03-texture] booted on ' + caps.backend + ' adapter=' + caps.adapterVersion);

  call('light.createDirectional', { color: [1, 1, 1, 1], energy: 1.0 });

  const SIZE = 64;
  const tex = call('texture.createFromImage', {
    width: SIZE,
    height: SIZE,
    pixels: buildCheckerboard(SIZE, 8),
  }).handle;

  const mat = call('material.create', {
    albedo: [1, 1, 1, 1],
    albedoTexture: tex,
    roughness: 0.5,
  }).handle;

  const geom = call('geometry.createBox', { size: [1, 1, 1] }).handle;
  cube = call('mesh.create', { geometry: geom }).handle;
  call('mesh.setMaterial', { mesh: cube, material: mat });

  const cam = call('camera.create', {}).handle;
  call('transform.set', { handle: cam, position: [0, 1.5, 4], rotation: [-0.3, 0, 0] });
  call('camera.setActive', { handle: cam });

  print('[03-texture] ready');
}

export function update(dt) {
  elapsed += dt;
  call('transform.set', {
    handle: cube,
    rotation: [elapsed * 0.5, elapsed, 0],
  });
}
