// 05-particles/code.js — pretty additive-glow fountain over a dark plane.

let elapsed = 0;
let cam;

function call(method, payload) {
  const r = engine.call(method, payload || {});
  if (r && r.error) throw new Error(method + ' failed: ' + r.error);
  return r;
}

export function init() {
  const caps = call('engine.init').capabilities;
  print('[05-particles] booted on ' + caps.backend + ' adapter=' + caps.adapterVersion);
  if (typeof cart_meta !== 'undefined') {
	print('[05-particles] meta: ' + cart_meta.name + ' - ' + cart_meta.description);
  }

  call('light.createDirectional', { color: [0.9, 0.95, 1.0, 1.0], energy: 0.4 });

  // Glowing additive particle material - small bright magenta billboards.
  const partMat = call('material.create', {
	albedo: [1.0, 0.4, 0.9, 1.0],
	unshaded: true,
	emission: [1.0, 0.3, 0.9, 1.0],
	emissionEnergy: 4.0,
	blend: 'add',
  }).handle;
  const partGeom = call('geometry.createBox', { size: [0.06, 0.06, 0.06] }).handle;

  call('particles.create', {
	geometry: partGeom,
	material: partMat,
	amount: 1024,
	lifetime: 3.0,
	emissionBoxExtents: [0.08, 0.02, 0.08],
	initialVelocityMin: 3.5,
	initialVelocityMax: 6.0,
	gravity: [0, -3.5, 0],
	scale: 1.0,
  });

  // Secondary slow warm trail.
  const partMat2 = call('material.create', {
	albedo: [1.0, 0.85, 0.3, 1.0],
	unshaded: true,
	emission: [1.0, 0.6, 0.1, 1.0],
	emissionEnergy: 3.0,
	blend: 'add',
  }).handle;
  const partGeom2 = call('geometry.createBox', { size: [0.04, 0.04, 0.04] }).handle;
  call('particles.create', {
	geometry: partGeom2,
	material: partMat2,
	amount: 512,
	lifetime: 4.0,
	emissionBoxExtents: [0.5, 0.02, 0.5],
	initialVelocityMin: 1.0,
	initialVelocityMax: 2.5,
	gravity: [0, 0.4, 0],
	scale: 0.8,
  });

  // Ground plane - dark slate.
  const groundMat = call('material.create', {
	albedo: [0.04, 0.05, 0.09, 1.0],
	roughness: 0.6,
	metallic: 0.2,
  }).handle;
  const groundGeom = call('geometry.createPlane', { size: [40, 40] }).handle;
  const ground = call('mesh.create', { geometry: groundGeom }).handle;
  call('mesh.setMaterial', { mesh: ground, material: groundMat });
  call('transform.set', { handle: ground, position: [0, -0.6, 0] });

  cam = call('camera.create', {}).handle;
  call('transform.set', { handle: cam, position: [0, 1.8, 6], rotation: [-0.18, 0, 0] });
  call('camera.setActive', { handle: cam });

  print('[05-particles] ready');
}

export function update(dt) {
  elapsed += dt;
  // Slow orbit for visual interest.
  const r = 6.0;
  const a = elapsed * 0.4;
  call('transform.set', {
	handle: cam,
	position: [Math.sin(a) * r, 1.8 + Math.sin(elapsed * 0.7) * 0.3, Math.cos(a) * r],
	rotation: [-0.18, a, 0],
  });
}
