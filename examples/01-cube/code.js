// 01-cube.js — first scene cart.
//
// Exercises the G1 adapter command set: directional light, material,
// box geometry, mesh instance, transform, camera. The cube rotates on its
// Y axis so the renderer is visibly active.

let cubeHandle = 0;
let cameraHandle = 0;
let elapsed = 0;

function call(method, payload) {
  const r = engine.call(method, payload || {});
  if (r && r.error) {
	throw new Error(method + ' failed: ' + r.error);
  }
  return r;
}

export function init() {
  const caps = call('engine.init').capabilities;
  print('[01-cube] booted on ' + caps.backend + ' adapter=' + caps.adapterVersion);

  // Light
  call('light.createDirectional', { color: [1, 1, 1, 1], energy: 1.0 });

  // Material
  const mat = call('material.create', {
	albedo: [0.4, 0.7, 1.0, 1.0],
	metallic: 0.1,
	roughness: 0.5,
  }).handle;

  // Geometry + mesh
  const geom = call('geometry.createBox', { size: [1, 1, 1] }).handle;
  cubeHandle = call('mesh.create', { geometry: geom }).handle;
  call('mesh.setMaterial', { mesh: cubeHandle, material: mat });
  call('transform.set', { handle: cubeHandle, position: [0, 0, 0] });

  // Camera
  cameraHandle = call('camera.create', {}).handle;
  call('transform.set', {
	handle: cameraHandle,
	position: [0, 1.5, 4],
	rotation: [-0.3, 0, 0],
  });
  call('camera.setActive', { handle: cameraHandle });

  print('[01-cube] scene ready cube=' + cubeHandle + ' camera=' + cameraHandle);
}

export function update(dt) {
  elapsed += dt;
  if (cubeHandle) {
	call('transform.set', {
	  handle: cubeHandle,
	  rotation: [0, elapsed, 0],
	});
  }
}

export function draw() {}
