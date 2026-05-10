// Hello World — Nova64 minimal cart
// A spinning cube with a HUD label. Under 15 lines.

const { printCentered } = nova64.draw;
const { createCube, rotateMesh } = nova64.scene;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight } = nova64.light;

let cube;

export function init() {
  cube = nova64.scene.createCube(1, 0x00aaff, [0, 0, -4]);
  nova64.light.setAmbientLight(0xffffff, 1.5);
  nova64.camera.setCameraPosition(0, 1, 4);
  nova64.camera.setCameraTarget(0, 0, 0);
}

export function update(dt) {
  nova64.scene.rotateMesh(cube, dt * 0.5, dt, 0);
}

export function draw() {
  nova64.draw.printCentered('Hello, Nova64!', 12, 0xffffff);
}
