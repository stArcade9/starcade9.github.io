// Skybox Showcase — Nova64
// Demonstrates all skybox types with orbiting camera
//
// Controls: 1-5 = skybox type, WASD = orbit, QE = zoom, SPACE = toggle auto-rotate

const { drawRoundedRect, print, printCentered, rgba8 } = nova64.draw;
const {
  clearScene,
  createCone,
  createCube,
  createCylinder,
  createPlane,
  createSphere,
  createTorus,
  rotateMesh,
  setPBRProperties,
  setRotation,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const {
  clearFog,
  createGradientSkybox,
  createImageSkybox,
  createPointLight,
  createSolidSkybox,
  createSpaceSkybox,
  enableSkyboxAutoAnimate,
  setAmbientLight,
  setFog,
  setLightColor,
  setLightDirection,
} = nova64.light;
const { enableBloom, enableFXAA, enableVignette } = nova64.fx;
const { btnp, key, keyp } = nova64.input;
const { rotate } = nova64.util;

let scene = 0;
let orbitAngle = 0;
let orbitDist = 12;
let orbitY = 3;
let time = 0;
let autoRotate = true;
let propIds = [];

const SCENE_NAMES = ['Deep Space', 'Dense Starfield', 'Sunset Gradient', 'Studio IBL', 'Void'];

async function applyStudioSkybox() {
  try {
    await nova64.light.createImageSkybox([
      '/assets/sky/studio/px.png',
      '/assets/sky/studio/nx.png',
      '/assets/sky/studio/py.png',
      '/assets/sky/studio/ny.png',
      '/assets/sky/studio/pz.png',
      '/assets/sky/studio/nz.png',
    ]);
  } catch (e) {
    nova64.light.createGradientSkybox(0x1a2a3a, 0x0a0a14);
  }
}

export async function init() {
  nova64.camera.setCameraFOV(70);
  await buildScene(0);
}

async function buildScene(idx) {
  propIds = [];
  nova64.scene.clearScene();

  // Common setup
  nova64.light.setAmbientLight(0x334455, 1.0);
  nova64.light.setLightDirection(-0.5, -1, -0.3);
  nova64.light.setLightColor(0xffffff);
  nova64.fx.enableBloom(0.6, 0.4, 0.3);
  nova64.fx.enableVignette(0.8, 0.8);
  nova64.fx.enableFXAA();

  if (idx === 0) buildDeepSpace();
  else if (idx === 1) buildDenseStars();
  else if (idx === 2) buildSunset();
  else if (idx === 3) await buildStudio();
  else if (idx === 4) buildVoid();
}

// ── Scene 0: Deep Space — sparse stars with nebula ──────────────────────────
function buildDeepSpace() {
  nova64.light.createSpaceSkybox({
    starCount: 2000,
    starSize: 2.0,
    nebulae: true,
    nebulaColor: 0x220044,
  });
  nova64.light.enableSkyboxAutoAnimate(0.3);
  nova64.light.setFog(0x000008, 30, 80);

  // Floating asteroids
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 6 + Math.random() * 8;
    const id = nova64.scene.createSphere(
      0.5 + Math.random() * 1.2,
      0x554433,
      [Math.cos(a) * r, (Math.random() - 0.5) * 6, Math.sin(a) * r],
      6,
      { material: 'standard', roughness: 0.95 }
    );
    propIds.push(id);
  }

  // Glowing orb
  const orb = nova64.scene.createSphere(1.0, 0x4488ff, [0, 0, 0], 24, {
    material: 'standard',
    emissive: 0x2244aa,
    emissiveIntensity: 3.0,
  });
  nova64.scene.setPBRProperties(orb, { metalness: 0.8, roughness: 0.1, envMapIntensity: 2.0 });
  propIds.push(orb);
  nova64.light.createPointLight(0x4488ff, 4, 20, 0, 0, 0);
}

// ── Scene 1: Dense Starfield — maximum stars, no nebula ─────────────────────
function buildDenseStars() {
  nova64.light.createSpaceSkybox({ starCount: 6000, starSize: 1.5, nebulae: false });
  nova64.light.enableSkyboxAutoAnimate(0.5);
  nova64.light.setFog(0x000002, 40, 100);

  // Reflective chrome sphere to show star reflections
  const chrome = nova64.scene.createSphere(2.0, 0xeeeeee, [0, 0, 0], 32, { material: 'standard' });
  nova64.scene.setPBRProperties(chrome, { metalness: 1.0, roughness: 0.02, envMapIntensity: 3.0 });
  propIds.push(chrome);

  // Ring of small metallic spheres
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const id = nova64.scene.createSphere(
      0.3,
      0xaaaacc,
      [Math.cos(a) * 5, Math.sin(a * 2) * 0.5, Math.sin(a) * 5],
      16,
      {
        material: 'standard',
      }
    );
    nova64.scene.setPBRProperties(id, { metalness: 1.0, roughness: 0.1 });
    propIds.push(id);
  }
}

// ── Scene 2: Sunset Gradient — warm sky with landscape ──────────────────────
function buildSunset() {
  nova64.light.createGradientSkybox(0xff6622, 0x1a0533);
  nova64.light.setFog(0x331108, 15, 50);
  nova64.light.setAmbientLight(0x442211, 1.4);
  nova64.light.setLightColor(0xffaa55);

  // Ground plane
  const floor = nova64.scene.createPlane(60, 60, 0x442211, [0, -2, 0], {
    material: 'standard',
    roughness: 0.9,
  });
  nova64.scene.setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  // Silhouette trees (cylinders + cones)
  const treePositions = [
    [-6, 0, -5],
    [-3, 0, -8],
    [2, 0, -6],
    [7, 0, -4],
    [-8, 0, -10],
    [5, 0, -9],
    [0, 0, -12],
    [-4, 0, -3],
  ];
  for (const [tx, , tz] of treePositions) {
    const h = 2 + Math.random() * 3;
    const trunk = nova64.scene.createCylinder(0.2, h, 0x221100, [tx, h / 2 - 2, tz], {
      material: 'standard',
      roughness: 0.95,
    });
    const crown = nova64.scene.createCone(
      1.0 + Math.random() * 0.6,
      h * 0.8,
      0x112200,
      [tx, h - 0.5, tz],
      {
        material: 'standard',
        roughness: 0.85,
      }
    );
    propIds.push(trunk, crown);
  }

  // Sun disc
  const sun = nova64.scene.createSphere(3.0, 0xff8844, [0, 4, -25], 16, {
    material: 'standard',
    emissive: 0xff6622,
    emissiveIntensity: 4.0,
  });
  propIds.push(sun);
  nova64.light.createPointLight(0xff8844, 6, 40, 0, 4, -25);
}

// ── Scene 3: Studio IBL — cube-map reflections with PBR objects ─────────────
async function buildStudio() {
  await applyStudioSkybox();
  nova64.light.setFog(0x060e1a, 20, 50);
  nova64.light.setAmbientLight(0x2a3a55, 1.6);

  // Reflective floor
  const floor = nova64.scene.createPlane(40, 40, 0x0a0e18, [0, -2.5, 0]);
  nova64.scene.setRotation(floor, -Math.PI / 2, 0, 0);
  nova64.scene.setPBRProperties(floor, { metalness: 0.9, roughness: 0.05, envMapIntensity: 2.0 });
  propIds.push(floor);

  // Showcase objects with different metals
  const objects = [
    { type: 'sphere', color: 0xffd700, x: -3, metal: 1.0, rough: 0.1 }, // Gold
    { type: 'cube', color: 0xeeeeee, x: 0, metal: 1.0, rough: 0.02 }, // Chrome
    { type: 'torus', color: 0xdd7744, x: 3, metal: 1.0, rough: 0.2 }, // Copper
  ];
  for (const o of objects) {
    let id;
    if (o.type === 'sphere') id = nova64.scene.createSphere(1.2, o.color, [o.x, 0, 0], 32, {});
    else if (o.type === 'cube') id = nova64.scene.createCube(2.0, o.color, [o.x, 0, 0], {});
    else id = nova64.scene.createTorus(1.0, 0.35, o.color, [o.x, 0, 0], {});
    nova64.scene.setPBRProperties(id, {
      metalness: o.metal,
      roughness: o.rough,
      envMapIntensity: 3.0,
    });
    propIds.push(id);
  }
}

// ── Scene 4: Void — solid black with emissive geometry ──────────────────────
function buildVoid() {
  nova64.light.createSolidSkybox(0x000000);
  nova64.light.clearFog();
  nova64.light.setAmbientLight(0x111111, 0.5);
  nova64.fx.enableBloom(1.5, 0.6, 0.15);

  // Floating neon wireframe-like shapes
  const colors = [0xff0044, 0x00ff88, 0x4488ff, 0xffff00, 0xff44ff, 0x00ffff];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = 5;
    let id;
    if (i % 3 === 0) {
      id = nova64.scene.createTorus(
        0.8,
        0.08,
        colors[i],
        [Math.cos(a) * r, Math.sin(a * 0.5) * 2, Math.sin(a) * r],
        {
          material: 'standard',
          emissive: colors[i],
          emissiveIntensity: 5.0,
        }
      );
    } else if (i % 3 === 1) {
      id = nova64.scene.createCube(
        1.2,
        colors[i],
        [Math.cos(a) * r, Math.sin(a * 0.5) * 2, Math.sin(a) * r],
        {
          material: 'standard',
          emissive: colors[i],
          emissiveIntensity: 4.0,
        }
      );
    } else {
      id = nova64.scene.createSphere(
        0.6,
        colors[i],
        [Math.cos(a) * r, Math.sin(a * 0.5) * 2, Math.sin(a) * r],
        12,
        {
          material: 'standard',
          emissive: colors[i],
          emissiveIntensity: 4.0,
        }
      );
    }
    nova64.scene.setPBRProperties(id, { metalness: 0.3, roughness: 0.2 });
    propIds.push(id);
  }

  // Central white hot core
  const core = nova64.scene.createSphere(0.5, 0xffffff, [0, 0, 0], 16, {
    material: 'standard',
    emissive: 0xffffff,
    emissiveIntensity: 6.0,
  });
  propIds.push(core);
  nova64.light.createPointLight(0xffffff, 4, 15, 0, 0, 0);
}

export function update(dt) {
  time += dt;

  // Camera controls
  if (nova64.input.key('KeyA') || nova64.input.key('ArrowLeft')) orbitAngle -= dt * 1.2;
  if (nova64.input.key('KeyD') || nova64.input.key('ArrowRight')) orbitAngle += dt * 1.2;
  if (nova64.input.key('KeyW') || nova64.input.key('ArrowUp'))
    orbitY = Math.min(15, orbitY + dt * 4);
  if (nova64.input.key('KeyS') || nova64.input.key('ArrowDown'))
    orbitY = Math.max(-2, orbitY - dt * 4);
  if (nova64.input.key('KeyQ')) orbitDist = Math.min(30, orbitDist + dt * 6);
  if (nova64.input.key('KeyE')) orbitDist = Math.max(5, orbitDist - dt * 6);

  // Toggle auto-rotate
  if (nova64.input.keyp('Space') || nova64.input.btnp(13)) autoRotate = !autoRotate;

  // Auto-orbit
  if (
    autoRotate &&
    !nova64.input.key('KeyA') &&
    !nova64.input.key('KeyD') &&
    !nova64.input.key('ArrowLeft') &&
    !nova64.input.key('ArrowRight')
  ) {
    orbitAngle += dt * 0.25;
  }

  const cx = Math.sin(orbitAngle) * orbitDist;
  const cz = Math.cos(orbitAngle) * orbitDist;
  nova64.camera.setCameraPosition(cx, orbitY, cz);
  nova64.camera.setCameraTarget(0, 0, 0);

  // Scene switch
  for (let i = 0; i < 5; i++) {
    if (nova64.input.keyp('Digit' + (i + 1)) || nova64.input.keyp('Numpad' + (i + 1))) {
      if (scene !== i) {
        scene = i;
        void buildScene(i);
      }
    }
  }

  // Rotate props slowly for visual interest
  for (let i = 0; i < propIds.length; i++) {
    nova64.scene.rotateMesh(propIds[i], 0, dt * 0.15 * ((i % 3) - 1), 0);
  }
}

export function draw() {
  nova64.draw.drawRoundedRect(0, 0, 320, 14, 0, nova64.draw.rgba8(0, 0, 0, 150));
  nova64.draw.printCentered(
    '[1]Space [2]Stars [3]Sunset [4]IBL [5]Void',
    160,
    2,
    nova64.draw.rgba8(220, 200, 150, 255)
  );

  nova64.draw.drawRoundedRect(0, 222, 320, 18, 0, nova64.draw.rgba8(0, 0, 0, 130));
  nova64.draw.print('Skybox: ' + SCENE_NAMES[scene], 6, 224, nova64.draw.rgba8(180, 255, 180, 255));
  nova64.draw.print(
    'TAP/[SPACE] Auto-rot  [WASD] Orbit  [QE] Zoom',
    6,
    232,
    nova64.draw.rgba8(110, 110, 110, 220)
  );
}
