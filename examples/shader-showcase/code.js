// ── Nova64 Shader Showcase ──
// Full-screen single-shader viewer — press Space/Enter to cycle through all 12 presets

const { print, screenHeight, screenWidth } = nova64.draw;
const { createCube, createPlane, createSphere, createTorus, getMesh, rotateMesh } = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { createPointLight, setAmbientLight, setFog } = nova64.light;
const { enableBloom, enableVignette } = nova64.fx;
const {
  createHologramMaterial,
  createLavaMaterial,
  createPlasmaMaterial,
  createShockwaveMaterial,
  createTSLMaterial,
  createVortexMaterial,
  createWaterMaterial,
} = nova64.shader;
const { keyp } = nova64.input;
let t = 0;
let currentIndex = 0;
let sphereId = null;
let cubeId = null;
let torusId = null;
let activeMat = null;

const PRESETS = [
  // Original 6
  { name: 'plasma', group: 'ORIGINAL', fn: () => createTSLMaterial('plasma', { speed: 2.0 }) },
  { name: 'galaxy', group: 'ORIGINAL', fn: () => createTSLMaterial('galaxy', { speed: 0.5 }) },
  { name: 'lava', group: 'ORIGINAL', fn: () => createTSLMaterial('lava', { speed: 1.0 }) },
  {
    name: 'electricity',
    group: 'ORIGINAL',
    fn: () => createTSLMaterial('electricity', { speed: 3.0, color: 0x44aaff }),
  },
  { name: 'rainbow', group: 'ORIGINAL', fn: () => createTSLMaterial('rainbow', { speed: 1.0 }) },
  { name: 'void', group: 'ORIGINAL', fn: () => createTSLMaterial('void', { speed: 0.3 }) },
  // Phase 1 new 6
  { name: 'lava2', group: 'PHASE 1', fn: () => createLavaMaterial({ speed: 0.2, intensity: 3.0 }) },
  { name: 'vortex', group: 'PHASE 1', fn: () => createVortexMaterial({ speed: 1.0 }) },
  { name: 'plasma2', group: 'PHASE 1', fn: () => createPlasmaMaterial({ speed: 1.0 }) },
  { name: 'water', group: 'PHASE 1', fn: () => createWaterMaterial({ speed: 0.5 }) },
  { name: 'hologram', group: 'PHASE 1', fn: () => createHologramMaterial({ speed: 1.0 }) },
  { name: 'shockwave', group: 'PHASE 1', fn: () => createShockwaveMaterial({ speed: 0.3 }) },
];

function applyMaterial(index) {
  currentIndex = ((index % PRESETS.length) + PRESETS.length) % PRESETS.length;
  activeMat = PRESETS[currentIndex].fn();
  for (const id of [sphereId, cubeId, torusId]) {
    const mesh = getMesh(id);
    if (mesh) {
      mesh.traverse(child => {
        if (child.isMesh) child.material = activeMat;
      });
    }
  }
}

export function init() {
  setCameraPosition(0, 2, 8);
  setCameraTarget(0, 0.5, 0);
  setCameraFOV(50);

  setFog(0x060612, 10, 40);
  setAmbientLight(0x222244);
  createPointLight(0xffffff, 2.0, 30, [0, 10, 8]);
  createPointLight(0xff4400, 1.0, 25, [-6, 5, -3]);
  createPointLight(0x0044ff, 1.0, 25, [6, 5, -3]);

  enableBloom(1.0, 0.35, 0.45);
  enableVignette(1.0, 0.8);

  // Three large objects showing the same material
  sphereId = createSphere(2.0, 0xffffff, [0, 1.5, 0]);
  cubeId = createCube(2.2, 0xffffff, [-4.5, 1.5, -1]);
  torusId = createTorus(1.2, 0.5, 0xffffff, [4.5, 1.5, -1]);

  // Floor
  const floor = getMesh(createPlane(30, 30, 0x0a0a1e, [0, -0.5, 0]));
  if (floor) floor.rotation.x = -Math.PI / 2;

  // Apply first preset
  applyMaterial(0);
}

export function update(dt) {
  t += dt;

  // Navigate with Space, Enter, or arrow keys
  if (keyp('Space') || keyp('Enter') || keyp('ArrowRight') || keyp('ArrowDown')) {
    applyMaterial(currentIndex + 1);
  }
  if (keyp('ArrowLeft') || keyp('ArrowUp')) {
    applyMaterial(currentIndex - 1);
  }

  // Rotate objects
  for (const id of [sphereId, cubeId, torusId]) {
    rotateMesh(id, 0, dt * 0.5, dt * 0.15);
  }

  // Gentle camera bob
  const cy = 2 + Math.sin(t * 0.12) * 0.3;
  setCameraPosition(0, cy, 8);
}

export function draw() {
  const W = typeof screenWidth === 'function' ? screenWidth() : 640;
  const H = typeof screenHeight === 'function' ? screenHeight() : 360;
  const preset = PRESETS[currentIndex];
  const num = currentIndex + 1;
  const total = PRESETS.length;

  // Top bar
  print(`SHADER ${num}/${total}`, 10, 8, 0x00ffcc, 2);
  print(preset.group, W - 100, 12, preset.group === 'ORIGINAL' ? 0x888899 : 0x00ff88);

  // Shader name — large centered
  const nameW = preset.name.length * 16;
  print(preset.name.toUpperCase(), Math.floor((W - nameW) / 2), 40, 0xffffff, 3);

  // Navigation hint at bottom
  const hint = 'SPACE / ENTER  next     ARROWS  prev/next';
  const hintW = hint.length * 7;
  print(hint, Math.floor((W - hintW) / 2), H - 20, 0x555577);

  // Dot indicators
  const dotW = total * 10;
  const dotX = Math.floor((W - dotW) / 2);
  for (let i = 0; i < total; i++) {
    const col = i === currentIndex ? 0x00ffcc : 0x333344;
    print('\u2022', dotX + i * 10, H - 36, col);
  }
}
