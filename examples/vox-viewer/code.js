// 🎮 MagicaVoxel .VOX Model Viewer for Nova64
// Demonstrates loading and displaying .vox files as 3D meshes

const { print } = nova64.draw;
const { clearScene, createPlane, loadVoxModel, rotateMesh } = nova64.scene;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { createGradientSkybox, setAmbientLight, setLightDirection } = nova64.light;

let voxMesh = null;
let angle = 0;
let isLoading = true;
let modelInfo = null;

export async function init() {
  nova64.scene.clearScene();

  // Setup skybox
  if (globalThis.createGradientSkybox) {
    nova64.light.createGradientSkybox({
      topColor: 0x0a0a2e,
      bottomColor: 0x1a1a4e,
    });
  }

  // Camera setup
  nova64.camera.setCameraPosition(0, 12, 20);
  nova64.camera.setCameraTarget(0, 4, 0);

  // Lighting
  nova64.light.setAmbientLight(0xffffff, 0.5);
  nova64.light.setLightDirection(3, 8, 4);

  // Ground plane
  // nova64.scene.createPlane(40, 40, 0x222244, [0, -0.1, 0], { material: 'standard' });

  // Load the .vox house model
  try {
    voxMesh = await nova64.scene.loadVoxModel('/assets/vox/house.vox', [0, 0, 0], 0.5, {
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
  nova64.camera.setCameraPosition(camX, 12, camZ);
  nova64.camera.setCameraTarget(0, 4, 0);

  // Rotate model slowly
  if (voxMesh !== null) {
    nova64.scene.rotateMesh(voxMesh, 0, dt * 0.2, 0);
  }
}

export function draw() {
  // Title
  nova64.draw.print('VOX Model Viewer', 10, 10, 0x00ccff);
  nova64.draw.print('MagicaVoxel .vox Format', 10, 24, 0x8888cc);

  if (isLoading) {
    nova64.draw.print('Loading...', 10, 50, 0xffff00);
  } else {
    nova64.draw.print('Model: ' + modelInfo, 10, 50, 0xffffff);
    nova64.draw.print('Format: MagicaVoxel .vox', 10, 64, 0xaaaaaa);
    nova64.draw.print('API: nova64.scene.loadVoxModel()', 10, 78, 0xaaaaaa);
  }
}
