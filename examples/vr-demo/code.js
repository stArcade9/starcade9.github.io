// VR Demo — immersive 3D experience with controller interaction
// Drop cubes and spheres in a virtual room, grab them with controllers.

const { print } = nova64.draw;
const { createCube, createPlane, createSphere, rotateMesh } = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { createGradientSkybox, createPointLight, setAmbientLight, setFog } = nova64.light;
const { rotate } = nova64.util;
const { enableVR, getXRControllers, isXRActive } = nova64.xr;

let objects = [];
let floor;
const ROOM_SIZE = 10;

export function init() {
  // Enable VR — shows "Enter VR" button on screen
  nova64.xr.enableVR({ referenceSpace: 'local-floor' });

  // Build environment
  nova64.camera.setCameraPosition(0, 1.6, 3);
  nova64.camera.setCameraTarget(0, 1, 0);
  nova64.camera.setCameraFOV(70);

  // Floor
  floor = nova64.scene.createPlane(ROOM_SIZE * 2, ROOM_SIZE * 2, 0x334455, [0, 0, 0]);
  nova64.scene.rotateMesh(floor, -Math.PI / 2, 0, 0);

  // Walls (transparent so VR boundary is visible)
  const wallColor = 0x223344;
  const back = nova64.scene.createPlane(ROOM_SIZE * 2, 4, wallColor, [0, 2, -ROOM_SIZE]);
  const left = nova64.scene.createPlane(ROOM_SIZE * 2, 4, wallColor, [-ROOM_SIZE, 2, 0]);
  nova64.scene.rotateMesh(left, 0, Math.PI / 2, 0);
  const right = nova64.scene.createPlane(ROOM_SIZE * 2, 4, wallColor, [ROOM_SIZE, 2, 0]);
  nova64.scene.rotateMesh(right, 0, -Math.PI / 2, 0);

  // Ambient lighting
  nova64.light.setAmbientLight(0x404060, 0.6);
  nova64.light.createPointLight(0x00ccff, 2.0, 20, [3, 4, 2]);
  nova64.light.createPointLight(0xff6600, 1.5, 20, [-3, 4, -2]);

  // Fog for atmosphere
  nova64.light.setFog(0x0a0a1a, 5, 25);

  // Scatter some objects
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 8;
    const z = (Math.random() - 0.5) * 8;
    const y = 0.5 + Math.random() * 2;
    const color = Math.random() * 0xffffff;
    const obj =
      i % 2 === 0
        ? nova64.scene.createCube(0.5 + Math.random() * 0.5, color, [x, y, z], {
            material: 'holographic',
          })
        : nova64.scene.createSphere(0.3 + Math.random() * 0.3, color, [x, y, z], {
            material: 'metallic',
          });
    objects.push({ mesh: obj, vel: { x: 0, y: 0, z: 0 }, rot: Math.random() * 2 - 1 });
  }

  // Skybox
  nova64.light.createGradientSkybox(0x0a0a2e, 0x1a1a4e);
}

export function update(dt) {
  // Slowly rotate objects
  for (const obj of objects) {
    nova64.scene.rotateMesh(obj.mesh, 0, obj.rot * dt * 0.5, 0);
  }

  // If in VR, show controller info
  if (nova64.xr.isXRActive()) {
    const ctrls = nova64.xr.getXRControllers();
    for (const ctrl of ctrls) {
      // Trigger pressed — spawn a small cube at controller position
      if (ctrl.buttons[0]?.pressed) {
        const color = ctrl.index === 0 ? 0x00ff88 : 0xff4488;
        const cube = nova64.scene.createCube(0.15, color, [
          ctrl.position.x,
          ctrl.position.y,
          ctrl.position.z,
        ]);
        objects.push({ mesh: cube, vel: { x: 0, y: -0.5, z: 0 }, rot: 3 });
      }
    }
  }
}

export function draw() {
  nova64.draw.print('Nova64 VR Demo', 10, 10, 0x00ccff);
  if (!nova64.xr.isXRActive()) {
    nova64.draw.print('Click "Enter VR" to start', 10, 30, 0xaaaaaa);
    nova64.draw.print('Or view the 3D scene on screen', 10, 50, 0xaaaaaa);
  } else {
    nova64.draw.print('Trigger = spawn cube', 10, 30, 0x88ff88);
  }
  nova64.draw.print(`Objects: ${objects.length}`, 10, 70, 0xffcc00);
}
