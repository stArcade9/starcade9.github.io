// Hello World — Nova64 minimal cart
// A spinning cube with a HUD label. Under 15 lines.

let cube;

export function init() {
  cube = createCube(1, 0x00aaff, [0, 0, -4]);
  setAmbientLight(0xffffff, 1.5);
  setCameraPosition(0, 1, 4);
  setCameraTarget(0, 0, 0);
}

export function update(dt) {
  rotateMesh(cube, dt * 0.5, dt, 0);
}

export function draw() {
  printCentered('Hello, Nova64!', 12, 0xffffff);
}
