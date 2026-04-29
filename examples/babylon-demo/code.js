// examples/babylon-demo/code.js
// Babylon.js backend demo for Nova64 — Phase 2
//
// This cart demonstrates the GpuBabylon runtime, which provides the same
// cart-facing API as the default Three.js backend but implemented entirely
// in Babylon.js.
//
// REQUIREMENTS:
//   To run this cart, the host console must use GpuBabylon instead of
//   GpuThreeJS. Full console integration is planned for Phase 3. For now
//   the cart can be exercised via:
//
//     import { GpuBabylon } from 'nova64/runtime';
//     const gpu = new GpuBabylon(canvas, 640, 480);
//     gpu.exposeTo(globalThis);
//     import('./code.js').then(m => { m.init(); ... });
//
// PHASE 2 FEATURE COVERAGE (available via this backend):
//   createCube, createSphere, createPlane, createCylinder, createCone
//   setPosition, setScale, setRotation, getPosition, rotateMesh
//   setCameraPosition, setCameraTarget, setCameraFOV
//   setAmbientLight, setLightDirection, setLightColor, createPointLight
//   setFog, clearFog, get3DStats
//   cls, print

// ─── State ───────────────────────────────────────────────────────────────────

let cube;
let sphere;
let platform;
let pillar;
let cone;
let orbitLight;

let time = 0;
let score = 0;
let fps = 0;
let frameCount = 0;
let fpsTimer = 0;

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export function init() {
  console.log('[babylon-demo] init() called - creating 3D objects...');
  // Scene setup
  setCameraPosition(0, 6, 12);
  setCameraTarget(0, 0, 0);
  setCameraFOV(70);

  setAmbientLight(0x334466, 0.8);
  setLightDirection(-1, -2, -1);
  setLightColor(0xffeedd);

  setFog(0x0a0a1a, 15, 60);

  // Ground platform
  platform = createPlane(20, 20, 0x2a2a4a, [0, -0.01, 0]);

  // Central rotating cube (N64 blue)
  console.log('[babylon-demo] Created cube:', cube);
  cube = createCube(2, 0x0055ff, [0, 1, 0]);

  // Orbiting sphere (warm orange)
  sphere = createSphere(0.7, 0xff8800, [4, 1, 0], 12);

  // Tall pillar
  pillar = createCylinder(0.3, 0.3, 3, 0x888888, [-3, 1.5, -3]);

  // Decorative cone on top of pillar
  cone = createCone(0.5, 1, 0xff2266, [-3, 3.5, -3]);

  // A dynamic point light attached to the orbiting sphere
  orbitLight = createPointLight(0xff8800, 1.5, 4, 1, 0);
}

export function update(dt) {
  time += dt;

  // FPS counter
  frameCount++;
  fpsTimer += dt;
  if (fpsTimer >= 1) {
    fps = frameCount;
    frameCount = 0;
    fpsTimer -= 1;
    score += 10;
  }

  // Rotate the central cube on all axes
  rotateMesh(cube, dt * 0.5, dt * 0.8, dt * 0.3);

  // Orbit the sphere around the cube
  const orbitRadius = 4;
  const orbitSpeed = 1.2;
  const sx = Math.cos(time * orbitSpeed) * orbitRadius;
  const sz = Math.sin(time * orbitSpeed) * orbitRadius;
  const sy = Math.sin(time * 2) * 0.5 + 1;
  setPosition(sphere, sx, sy, sz);

  // Move point light with the sphere
  setPosition(orbitLight, sx, sy, sz);

  // Slowly spin the cone
  rotateMesh(cone, 0, dt * 0.6, 0);

  // Gentle camera bob
  setCameraPosition(0, 6 + Math.sin(time * 0.3) * 0.4, 12);
}

export function draw() {
  // HUD overlay (2D, drawn via Canvas2D)
  print('NOVA64 BABYLON DEMO', 12, 12, 0x88aaff, 14);
  print(`FPS: ${fps}`, 12, 36, 0x44dd88, 12);
  print(`Score: ${score}`, 12, 54, 0xffdd44, 12);
  print(`Time: ${time.toFixed(1)}s`, 12, 72, 0xaaaaaa, 12);

  // Stats
  const stats = get3DStats();
  print(`Meshes: ${stats.meshes}`, 12, 96, 0x666688, 11);
  print(`Backend: ${stats.backend}`, 12, 112, 0x666688, 11);

  // Credit
  print('Babylon.js Phase 2', 12, 460, 0x444466, 11);
}
