// 02-input.js — drives a cube around with input.poll.
//
// Exercises the G2 input slice. WASD / arrows / left stick translate the
// cube on the X/Z plane; Space/Z/A jumps. Esc/X resets the position.

let cube = 0;
let camera = 0;
const pos = [0, 0.5, 0];
let vy = 0;
const SPEED = 4;
const GRAVITY = -12;
const JUMP_V = 5;

function call(method, payload) {
  const r = engine.call(method, payload || {});
  if (r && r.error) throw new Error(method + ' failed: ' + r.error);
  return r;
}

export function init() {
  const caps = call('engine.init').capabilities;
  print('[02-input] booted on ' + caps.backend + ' adapter=' + caps.adapterVersion);

  call('light.createDirectional', { color: [1, 1, 1, 1], energy: 1.2 });

  const mat = call('material.create', {
    albedo: [1.0, 0.45, 0.2, 1.0],
    metallic: 0.0,
    roughness: 0.6,
  }).handle;

  const geom = call('geometry.createBox', { size: [1, 1, 1] }).handle;
  cube = call('mesh.create', { geometry: geom }).handle;
  call('mesh.setMaterial', { mesh: cube, material: mat });
  call('transform.set', { handle: cube, position: pos });

  // Ground plane for spatial reference.
  const groundMat = call('material.create', {
    albedo: [0.18, 0.22, 0.28, 1.0],
    roughness: 0.9,
  }).handle;
  const groundGeom = call('geometry.createPlane', { size: [20, 20] }).handle;
  const ground = call('mesh.create', { geometry: groundGeom }).handle;
  call('mesh.setMaterial', { mesh: ground, material: groundMat });
  call('transform.set', { handle: ground, position: [0, 0, 0] });

  camera = call('camera.create', {}).handle;
  call('transform.set', {
    handle: camera,
    position: [0, 4, 7],
    rotation: [-0.5, 0, 0],
  });
  call('camera.setActive', { handle: camera });

  print('[02-input] ready — WASD/arrows to move, Space to jump, Esc to reset');
}

export function update(dt) {
  const i = call('input.poll', {});
  pos[0] += (i.axisX || 0) * SPEED * dt;
  pos[2] += (i.axisY || 0) * SPEED * dt;

  // Jump
  if (i.action && pos[1] <= 0.5 + 1e-3) vy = JUMP_V;
  vy += GRAVITY * dt;
  pos[1] += vy * dt;
  if (pos[1] < 0.5) { pos[1] = 0.5; vy = 0; }

  // Reset
  if (i.cancel) { pos[0] = 0; pos[1] = 0.5; pos[2] = 0; vy = 0; }

  call('transform.set', { handle: cube, position: pos });
}
