// HELLO NAMESPACED — Shows how to use the nova64.* namespace API
// All functions are grouped: nova64.scene, nova64.camera, nova64.draw, etc.

const { createCube, createSphere, createPlane, setPosition, setRotation, rotateMesh } =
  nova64.scene;
const { setCameraPosition, setCameraTarget, setCameraFOV } = nova64.camera;
const { setFog, setLightDirection, createPointLight } = nova64.light;
const { cls, print, rgba8 } = nova64.draw;
const { key } = nova64.input;

let cubes = [];
let time = 0;

export function init() {
  cls();

  // Camera & lighting
  setCameraPosition(0, 6, 12);
  setCameraTarget(0, 0, 0);
  setCameraFOV(60);
  setLightDirection(-0.5, -1, -0.3);
  setFog(0x1a1a2e, 15, 60);
  createPointLight(0xffffff, 1.5, [0, 8, 0]);

  // Ring of cubes
  const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cube = createCube(1.5, colors[i], [Math.cos(a) * 5, 0, Math.sin(a) * 5]);
    cubes.push({ mesh: cube, angle: a, speed: 1 + Math.random() });
  }

  // Ground
  const ground = createPlane(30, 30, 0x333355, [0, -1.5, 0]);
  setRotation(ground, -Math.PI / 2, 0, 0);
}

export function update(dt) {
  time += dt;
  for (const c of cubes) {
    const y = Math.sin(time * 2 + c.angle) * 1.5;
    setPosition(c.mesh, Math.cos(c.angle) * 5, y, Math.sin(c.angle) * 5);
    rotateMesh(c.mesh, dt * c.speed, dt * c.speed * 0.5, 0);
  }

  // Orbit camera
  const cx = Math.cos(time * 0.4) * 12;
  const cz = Math.sin(time * 0.4) * 12;
  setCameraPosition(cx, 6, cz);
  setCameraTarget(0, 0, 0);
}

export function draw() {
  print('HELLO NAMESPACED', 8, 8, rgba8(0, 255, 255, 255));
  print('nova64.scene / nova64.camera / ...', 8, 24, rgba8(200, 200, 200, 200));
  print(`Cubes: ${cubes.length}  Time: ${time.toFixed(1)}s`, 8, 40, rgba8(100, 255, 100, 255));
}
