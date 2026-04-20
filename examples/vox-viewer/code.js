// 🎮 MagicaVoxel .VOX Model Viewer for Nova64
// Demonstrates loading and displaying .vox files as 3D meshes

let voxMesh = null;
let angle = 0;
let isLoading = true;
let modelInfo = null;

export async function init() {
  clearScene();

  // Setup skybox
  if (globalThis.createGradientSkybox) {
    createGradientSkybox({
      topColor: 0x0a0a2e,
      bottomColor: 0x1a1a4e,
    });
  }

  // Camera setup
  setCameraPosition(0, 12, 20);
  setCameraTarget(0, 4, 0);

  // Lighting
  setAmbientLight(0xffffff, 0.5);
  setLightDirection(3, 8, 4);

  // Ground plane
 // createPlane(40, 40, 0x222244, [0, -0.1, 0], { material: 'standard' });

  // Load the .vox house model
  try {
    voxMesh = await loadVoxModel('/assets/vox/house.vox', [0, 0, 0], 0.5, {
      material: 'standard',
    });
    isLoading = false;
    modelInfo = 'house.vox';
  } catch (e) {
    console.error('Failed to load .vox model:', e);
    isLoading = false;
    modelInfo = 'Error: ' + e.message;
  }
}

export function update(dt) {
  angle += dt * 0.3;

  // Slowly orbit camera around model
  const radius = 20;
  const camX = Math.sin(angle) * radius;
  const camZ = Math.cos(angle) * radius;
  setCameraPosition(camX, 12, camZ);
  setCameraTarget(0, 4, 0);

  // Rotate model slowly
  if (voxMesh !== null) {
    rotateMesh(voxMesh, 0, dt * 0.2, 0);
  }
}

export function draw() {
  // Title
  print('VOX Model Viewer', 10, 10, 0x00ccff);
  print('MagicaVoxel .vox Format', 10, 24, 0x8888cc);

  if (isLoading) {
    print('Loading...', 10, 50, 0xffff00);
  } else {
    print('Model: ' + modelInfo, 10, 50, 0xffffff);
    print('Format: MagicaVoxel .vox', 10, 64, 0xaaaaaa);
    print('API: loadVoxModel()', 10, 78, 0xaaaaaa);
  }
}
