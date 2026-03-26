// 🔮 PBR SHOWCASE — Physically Based Rendering Material Demo
//
// A 5×5 grid of spheres demonstrates how metalness and roughness
// interact in a physically based rendering pipeline.
//
// X-axis  →  Metalness  0.0 (dielectric) → 1.0 (metallic)
// Y-axis  ↑  Roughness  1.0 (matte)      → 0.0 (mirror-smooth)
//
// No special assets needed — the engine's built-in PMREM environment
// map drives the reflections.  Load your own cube-map with
// createImageSkybox([...6 urls]) to upgrade to full IBL reflections.

const COLS = 5;
const ROWS = 5;
const SPACING = 2.4;

// Warm neutral base that reads clearly for both dielectric and metallic
const BASE_COLOR = 0xd4c8b8;

let sphereIds = [];
let floorId = null;
let orbitAngle = Math.PI * 0.15; // start slightly to the side
let time = 0;

// ── Init ────────────────────────────────────────────────────────────────────
export async function init() {
  setCameraPosition(0, 1.5, 16);
  setCameraTarget(0, 0, 0);
  setCameraFOV(58);

  // Load the procedural studio cube-map — drives both the skybox and IBL
  // PBR reflections automatically via scene.environment (PMREM-processed).
  try {
    await createImageSkybox([
      '/assets/sky/studio/px.png',
      '/assets/sky/studio/nx.png',
      '/assets/sky/studio/py.png',
      '/assets/sky/studio/ny.png',
      '/assets/sky/studio/pz.png',
      '/assets/sky/studio/nz.png',
    ]);
  } catch (e) {
    // Fallback to a gradient sky if the images aren't available
    createGradientSkybox(0x0c1828, 0x040810);
  }
  setFog(0x060e1a, 22, 60);

  // Cool-white key + warm fill for good specular contrast
  setAmbientLight(0x2a3a55, 1.6);
  setLightDirection(-0.6, -1.0, -0.5);
  setLightColor(0xffffff);

  // Cinematic post-processing
  enableBloom(0.5, 0.35, 0.35);
  enableVignette(1.0, 0.75);
  enableFXAA();

  // Reflective floor — shows IBL reflections of the spheres
  floorId = createPlane(50, 50, 0x080c14, [0, -3.3, 0]);
  setRotation(floorId, -Math.PI / 2, 0, 0);
  setPBRProperties(floorId, { metalness: 0.85, roughness: 0.08, envMapIntensity: 1.5 });

  // ── 5×5 PBR grid ──────────────────────────────────────────────────────────
  // Row 0 = roughness 1.0 (top = matte)   Row 4 = roughness 0.0 (bottom = glossy)
  // Col 0 = metalness 0.0 (dielectric)    Col 4 = metalness 1.0 (metallic)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const metalness = col / (COLS - 1); // 0 → 1
      const roughness = row / (ROWS - 1); // 0 → 1  (row 0 = smooth top)

      const x = (col - (COLS - 1) / 2) * SPACING;
      const y = ((ROWS - 1) / 2 - row) * SPACING; // row 0 at top

      // Slight colour shift: warm for dielectrics, cooler for metals
      const color = lerpHex(0xd4c0a8, 0xc8d4e0, metalness);

      const id = createSphere(0.95, color, [x, y, 0], 32, {});
      setPBRProperties(id, { metalness, roughness });
      sphereIds.push(id);
    }
  }
}

// ── Update ───────────────────────────────────────────────────────────────────
export function update(dt) {
  time += dt;

  // Slow idle orbit around the grid
  orbitAngle += dt * 0.16;
  const r = 15.5;
  const camX = Math.sin(orbitAngle) * r;
  const camZ = Math.cos(orbitAngle) * r;
  const camY = 1.5 + Math.sin(time * 0.22) * 0.8;

  setCameraPosition(camX, camY, camZ);
  setCameraTarget(0, 0, 0);
}

// ── Draw (2D HUD) ─────────────────────────────────────────────────────────────
export function draw() {
  // Title
  printCentered('PBR SHOWCASE', 160, 7, 0xffffff, 1);

  // Metalness axis label (bottom of screen)
  print('METALNESS  0 ────────────────── 1', 26, 218, 0x6aadcc, 1);

  // Roughness axis label (left edge, vertical)
  print('ROUGH', 2, 56, 0xcc8844, 1);
  print('  |', 4, 64, 0xcc8844, 1);
  print('  |', 4, 72, 0xcc8844, 1);
  print('  |', 4, 80, 0xcc8844, 1);
  print('  |', 4, 88, 0xcc8844, 1);
  print('  |', 4, 96, 0xcc8844, 1);
  print('  |', 4, 104, 0xcc8844, 1);
  print('  |', 4, 112, 0xcc8844, 1);
  print('  |', 4, 120, 0xcc8844, 1);
  print('  |', 4, 128, 0xcc8844, 1);
  print('  |', 4, 136, 0xcc8844, 1);
  print('  |', 4, 144, 0xcc8844, 1);
  print('  |', 4, 152, 0xcc8844, 1);
  print('SMOOTH', 1, 160, 0xcc8844, 1);

  // Tip
  print('IBL: studio cube-map env reflections active', 8, 228, 0x445566, 1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function lerpHex(a, b, t) {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}
