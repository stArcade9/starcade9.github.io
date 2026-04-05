// 🎮 GLB Model Showcase for Nova64
// Demonstrates loading 3D models with animations and N64 PBR materials

let rotatingMesh = null;
let currentModelIndex = 0;
let models = [
  {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb',
    scale: 0.05,
    yOffset: -2,
    name: 'Animated Fox',
  },
  {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb',
    scale: 2.5,
    yOffset: -2,
    name: 'Cesium Man',
  },
  {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
    scale: 2.0,
    yOffset: -1.5,
    name: 'Duck',
  },
];

let angle = 0;
let loadedModels = {};
let currentAnimName = 'Run';
let isLoading = true;

export async function init() {
  clearScene();

  if (globalThis.enableRetroEffects) {
    enableRetroEffects({
      bloomLength: 0.5,
      aberrationIntensity: 0.002,
      vignetteStrength: 0.4,
    });
  }

  // Setup dynamic skybox
  if (globalThis.createSpaceSkybox) {
    createSpaceSkybox({
      starCount: 2000,
      nebulae: true,
      nebulaColor: 0x1a2f4c,
    });
  }

  setCameraPosition(0, 1.5, 8);
  setCameraTarget(0, 0, 0);

  // Set dramatic lighting
  setAmbientLight(0xffffff, 0.4);
  setLightDirection(2, 5, 2);

  await switchModel(currentModelIndex);
}

async function switchModel(index) {
  isLoading = true;
  if (rotatingMesh !== null) {
    destroyMesh(rotatingMesh);
    rotatingMesh = null;
  }

  const m = models[index];
  try {
    const meshId = await loadModel(m.url, [0, m.yOffset, 0], m.scale);
    rotatingMesh = meshId;

    // After loading, it starts the first animation automatically.
    // We can just increase the speed playfully
    if (index === 0) playAnimation(meshId, 2, true, 1.5); // Fox Run
  } catch (e) {
    console.error('Failed to load model', e);
  }

  isLoading = false;
}

export function update(dt) {
  // Rotate smoothly
  if (rotatingMesh && !isLoading) {
    angle += dt * 0.5;
    setRotation(rotatingMesh, 0, angle, 0);
  }

  // Press Space or Next/Z to cycle models
  if (keyp('Space') || keyp('KeyZ') || btnp(13)) {
    currentModelIndex = (currentModelIndex + 1) % models.length;
    switchModel(currentModelIndex);
  }
}

export function draw() {
  if (isLoading) {
    print('LOADING ASSET.GLB...', 120, 150, 0xffff00);
    return;
  }

  // Draw cool text HUD overlays on the 3D container
  print('✨ N64 3D MODEL LOADER ✨', 20, 20, 0xffffff);

  const mName = models[currentModelIndex].name;
  print(`Model: ${mName}`, 20, 50, 0x00ffff);
  print('Press Space/Z to switch models', 20, 70, 0x88ccff);

  // Custom bounding UI elements
  rect(15, 15, 280, 80, 0xffffff);
  line(18, 40, 280, 40, 0x444444);
}
