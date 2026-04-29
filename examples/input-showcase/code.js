// examples/input-showcase/code.js
// Demonstrates every Nova64 input method: keyboard, gamepad, and mouse.
// All inputs are visualized live so you can see exactly what the engine detects.

const { print, printCentered, pset, rect, rgba8 } = nova64.draw;
const { createCube, engine, rotateMesh } = nova64.scene;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog } = nova64.light;
const { btn, key } = nova64.input;
const { color } = nova64.util;

const KEY_MAP = [
  ['KeyW', 'W'],
  ['KeyA', 'A'],
  ['KeyS', 'S'],
  ['KeyD', 'D'],
  ['ArrowUp', '↑'],
  ['ArrowDown', '↓'],
  ['ArrowLeft', '←'],
  ['ArrowRight', '→'],
  ['Space', 'SPC'],
  ['ShiftLeft', 'SHF'],
  ['KeyE', 'E'],
  ['KeyQ', 'Q'],
  ['Enter', 'ENT'],
  ['Escape', 'ESC'],
];

const BTN_LABELS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SEL', 'STR'];

// Spinning cube changes color based on WASD input
let cube;
let cubeColor = 0x0088ff;
let mouseTrail = [];

export function init() {
  setCameraPosition(0, 0, 8);
  setCameraTarget(0, 0, 0);
  setAmbientLight(0xffffff, 1.0);
  setFog(0x0a0a1a, 20, 50);

  cube = createCube(2, cubeColor, [0, 0, 0], { material: 'holographic' });
}

export function update(dt) {
  // Drive cube rotation with WASD
  const rx = (key('KeyS') ? 1 : 0) - (key('KeyW') ? 1 : 0);
  const ry = (key('KeyD') ? 1 : 0) - (key('KeyA') ? 1 : 0);
  rotateMesh(cube, rx * dt * 2, ry * dt * 2, 0);

  // Record mouse trail (last 20 positions)
  const mx = getMouseX ? getMouseX() : 0;
  const my = getMouseY ? getMouseY() : 0;
  mouseTrail.push({ x: mx, y: my });
  if (mouseTrail.length > 20) mouseTrail.shift();
}

export function draw() {
  // ── Background gradient header ───────────────────────────────────────────
  rect(0, 0, 320, 20, rgba8(20, 20, 50, 255), true);
  printCentered('INPUT SHOWCASE', 4, 0xffffff);

  // ── Keyboard section ─────────────────────────────────────────────────────
  print('KEYBOARD', 8, 26, 0xaaaaff);
  const kbCols = 7;
  KEY_MAP.forEach(([code, label], i) => {
    const col = i % kbCols;
    const row = Math.floor(i / kbCols);
    const x = 8 + col * 44;
    const y = 36 + row * 14;
    const pressed = key(code);
    rect(x, y, 40, 12, pressed ? rgba8(0, 200, 80, 255) : rgba8(40, 40, 80, 200), true);
    rect(x, y, 40, 12, rgba8(100, 100, 180, 180), false);
    print(label, x + 2, y + 2, pressed ? 0x000000 : 0xdddddd);
  });

  // ── Gamepad section ───────────────────────────────────────────────────────
  print('GAMEPAD', 8, 74, 0xaaaaff);
  BTN_LABELS.forEach((label, i) => {
    const x = 8 + i * 30;
    const pressed = btn(i);
    rect(x, 84, 26, 12, pressed ? rgba8(255, 160, 0, 255) : rgba8(40, 40, 80, 200), true);
    rect(x, 84, 26, 12, rgba8(100, 100, 180, 180), false);
    print(label, x + 2, 86, pressed ? 0x000000 : 0xdddddd);
  });

  // ── Analog sticks ─────────────────────────────────────────────────────────
  print('STICKS', 8, 102, 0xaaaaff);
  // Left stick area
  rect(8, 112, 40, 22, rgba8(30, 30, 60, 200), true);
  rect(8, 112, 40, 22, rgba8(80, 80, 150, 180), false);
  print('L-STICK', 10, 114, 0x888888);
  // Right stick area
  rect(54, 112, 40, 22, rgba8(30, 30, 60, 200), true);
  rect(54, 112, 40, 22, rgba8(80, 80, 150, 180), false);
  print('R-STICK', 56, 114, 0x888888);
  print('(connect gamepad)', 100, 118, 0x555577);

  // ── Mouse section ─────────────────────────────────────────────────────────
  print('MOUSE', 8, 140, 0xaaaaff);
  const mx = mouseTrail.length ? mouseTrail[mouseTrail.length - 1].x : 0;
  const my = mouseTrail.length ? mouseTrail[mouseTrail.length - 1].y : 0;
  print(`X: ${Math.round(mx)}  Y: ${Math.round(my)}`, 8, 150, 0xdddddd);

  // Draw mouse trail
  if (mouseTrail.length > 1) {
    for (let i = 1; i < mouseTrail.length; i++) {
      const alpha = Math.floor((i / mouseTrail.length) * 200);
      pset(mouseTrail[i].x, mouseTrail[i].y, rgba8(80, 200, 255, alpha));
    }
  }

  // ── Active key hint ───────────────────────────────────────────────────────
  rect(0, 170, 320, 10, rgba8(15, 15, 40, 255), true);
  print('WASD rotates cube  |  All inputs highlighted in real time', 4, 172, 0x555577);
}
