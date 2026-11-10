// Skybox Showcase — Nova64
// Demonstrates all skybox types with orbiting camera
//
// Controls: 1-5 = skybox type, WASD = orbit, QE = zoom, SPACE = toggle auto-rotate

const { drawGlowText, drawGradient, drawRoundedRect, print, rectfill, rgba8 } = nova64.draw;
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
  setPosition,
  setRotation,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const {
  clearFog,
  createGradientSkybox,
  createImageSkybox,
  createPointLight,
  createSolidSkybox,
  createSkyPreset,
  createSpaceSkybox,
  enableSkyboxAutoAnimate,
  setAmbientLight,
  setFog,
  setLightColor,
  setLightDirection,
} = nova64.light;
const { enableBloom, enableFXAA, enableVignette } = nova64.fx;
const { btnp, key, keyp } = nova64.input;

let scene = 0;
let orbitAngle = 0;
let orbitDist = 12;
let orbitY = 3;
let time = 0;
let autoRotate = true;
let propIds = [];
let targetY = 0; // per-scene look-at height (sky scenes look up)

// name, one-line pitch, HUD accent colour [r, g, b]
const SCENES = [
  { name: 'Deep Space', tag: 'domain-warped nebula + galactic band', accent: [190, 120, 255] },
  {
    name: 'Dense Starfield',
    tag: '6000 twinkling stars, faint teal haze',
    accent: [120, 220, 255],
  },
  { name: 'Golden Sunset', tag: 'sun corona, lit clouds, god rays', accent: [255, 160, 80] },
  { name: 'Studio IBL', tag: 'cube-map image skybox + reflections', accent: [200, 210, 230] },
  { name: 'Void', tag: 'nothing but neon', accent: [255, 60, 140] },
  {
    name: 'Ocean Horizon',
    tag: 'waves, fresnel sky reflection, sun glitter',
    accent: [80, 200, 255],
  },
  { name: 'Toon Meadow', tag: 'cel sky, ink-lined clouds, rainbow', accent: [120, 230, 90] },
  {
    name: 'Sky Highlands',
    tag: 'painterly clouds, light shafts, floating isles',
    accent: [255, 210, 120],
  },
  {
    name: 'Aurora Night',
    tag: 'rippling aurora, shooting stars, still sea',
    accent: [60, 255, 170],
  },
  {
    name: 'Candy Cosmos',
    tag: 'hot-pink nebula, ringed planet, sugar moons',
    accent: [255, 110, 200],
  },
];
// Scenes whose props float in space and look good slowly spinning.
const SPIN_SCENES = new Set([0, 1, 3, 4]);
let cardT = 0; // seconds since the last scene switch (drives the title card)
let bobbers = []; // { id, x, y, z, amp, speed, phase, hop?, orbit? }

async function applyStudioSkybox() {
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
    createGradientSkybox(0x1a2a3a, 0x0a0a14);
  }
}

export async function init() {
  setCameraFOV(70);
  await buildScene(0);
}

async function buildScene(idx) {
  propIds = [];
  bobbers = [];
  targetY = 0;
  orbitDist = 12;
  orbitY = 3;
  cardT = 0;
  clearScene();

  // Common setup
  setAmbientLight(0x334455, 1.0);
  setLightDirection(-0.5, -1, -0.3);
  setLightColor(0xffffff);
  enableBloom(0.6, 0.4, 0.3);
  enableVignette(0.8, 0.8);
  enableFXAA();

  if (idx === 0) buildDeepSpace();
  else if (idx === 1) buildDenseStars();
  else if (idx === 2) buildSunset();
  else if (idx === 3) await buildStudio();
  else if (idx === 4) buildVoid();
  else if (idx === 5) buildOcean();
  else if (idx === 6) buildMeadow();
  else if (idx === 7) buildHighlands();
  else if (idx === 8) buildAurora();
  else if (idx === 9) buildCosmos();
}

// ── Scene 0: Deep Space — sparse stars with nebula ──────────────────────────
function buildDeepSpace() {
  createSpaceSkybox({
    starCount: 2500,
    starSize: 2.0,
    nebulae: true,
    nebulaColor: 0x8a2be2,
    nebulaIntensity: 1.3,
  });
  enableSkyboxAutoAnimate(0.3);
  setFog(0x000008, 30, 80);

  // Floating asteroids
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 6 + Math.random() * 8;
    const id = createSphere(
      0.5 + Math.random() * 1.2,
      0x554433,
      [Math.cos(a) * r, (Math.random() - 0.5) * 6, Math.sin(a) * r],
      6,
      { material: 'standard', roughness: 0.95 }
    );
    propIds.push(id);
  }

  // Glowing orb
  const orb = createSphere(1.0, 0x4488ff, [0, 0, 0], 24, {
    material: 'standard',
    emissive: 0x2244aa,
    emissiveIntensity: 3.0,
  });
  setPBRProperties(orb, { metalness: 0.8, roughness: 0.1, envMapIntensity: 2.0 });
  propIds.push(orb);
  createPointLight(0x4488ff, 4, 20, 0, 0, 0);
}

// ── Scene 1: Dense Starfield — maximum stars, no nebula ─────────────────────
function buildDenseStars() {
  createSpaceSkybox({
    starCount: 6000,
    starSize: 1.5,
    nebulaColor: 0x10b0c8,
    nebulaIntensity: 0.5,
  });
  enableSkyboxAutoAnimate(0.5);
  setFog(0x000002, 40, 100);

  // Reflective chrome sphere to show star reflections
  const chrome = createSphere(2.0, 0xeeeeee, [0, 0, 0], 32, { material: 'standard' });
  setPBRProperties(chrome, { metalness: 1.0, roughness: 0.02, envMapIntensity: 3.0 });
  propIds.push(chrome);

  // Ring of small metallic spheres
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const id = createSphere(
      0.3,
      0xaaaacc,
      [Math.cos(a) * 5, Math.sin(a * 2) * 0.5, Math.sin(a) * 5],
      16,
      {
        material: 'standard',
      }
    );
    setPBRProperties(id, { metalness: 1.0, roughness: 0.1 });
    propIds.push(id);
  }
}

// ── Scene 2: Sunset Gradient — warm sky with landscape ──────────────────────
function buildSunset() {
  createSkyPreset('sunset');

  setFog(0x331108, 15, 50);
  setAmbientLight(0x442211, 1.4);
  setLightColor(0xffaa55);

  // Ground plane
  const floor = createPlane(60, 60, 0x442211, [0, -2, 0], {
    material: 'standard',
    roughness: 0.9,
  });
  setRotation(floor, -Math.PI / 2, 0, 0);
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
    const trunk = createCylinder(0.2, h, 0x221100, [tx, h / 2 - 2, tz], {
      material: 'standard',
      roughness: 0.95,
    });
    const crown = createCone(1.0 + Math.random() * 0.6, h * 0.8, 0x112200, [tx, h - 0.5, tz], {
      material: 'standard',
      roughness: 0.85,
    });
    propIds.push(trunk, crown);
  }

  // Sun disc
  const sun = createSphere(3.0, 0xff8844, [0, 4, -25], 16, {
    material: 'standard',
    emissive: 0xff6622,
    emissiveIntensity: 4.0,
  });
  propIds.push(sun);
  createPointLight(0xff8844, 6, 40, 0, 4, -25);
}

// ── Scene 3: Studio IBL — cube-map reflections with PBR objects ─────────────
async function buildStudio() {
  await applyStudioSkybox();
  setFog(0x060e1a, 20, 50);
  setAmbientLight(0x2a3a55, 1.6);

  // Reflective floor
  const floor = createPlane(40, 40, 0x0a0e18, [0, -2.5, 0]);
  setRotation(floor, -Math.PI / 2, 0, 0);
  setPBRProperties(floor, { metalness: 0.9, roughness: 0.05, envMapIntensity: 2.0 });
  propIds.push(floor);

  // Showcase objects with different metals
  const objects = [
    { type: 'sphere', color: 0xffd700, x: -3, metal: 1.0, rough: 0.1 }, // Gold
    { type: 'cube', color: 0xeeeeee, x: 0, metal: 1.0, rough: 0.02 }, // Chrome
    { type: 'torus', color: 0xdd7744, x: 3, metal: 1.0, rough: 0.2 }, // Copper
  ];
  for (const o of objects) {
    let id;
    if (o.type === 'sphere') id = createSphere(1.2, o.color, [o.x, 0, 0], 32, {});
    else if (o.type === 'cube') id = createCube(2.0, o.color, [o.x, 0, 0], {});
    else id = createTorus(1.0, 0.35, o.color, [o.x, 0, 0], {});
    setPBRProperties(id, {
      metalness: o.metal,
      roughness: o.rough,
      envMapIntensity: 3.0,
    });
    propIds.push(id);
  }
}

// ── Scene 4: Void — solid black with emissive geometry ──────────────────────
function buildVoid() {
  createSolidSkybox(0x000000);
  clearFog();
  setAmbientLight(0x111111, 0.5);
  enableBloom(1.5, 0.6, 0.15);

  // Floating neon wireframe-like shapes
  const colors = [0xff0044, 0x00ff88, 0x4488ff, 0xffff00, 0xff44ff, 0x00ffff];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = 5;
    let id;
    if (i % 3 === 0) {
      id = createTorus(
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
      id = createCube(1.2, colors[i], [Math.cos(a) * r, Math.sin(a * 0.5) * 2, Math.sin(a) * r], {
        material: 'standard',
        emissive: colors[i],
        emissiveIntensity: 4.0,
      });
    } else {
      id = createSphere(
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
    setPBRProperties(id, { metalness: 0.3, roughness: 0.2 });
    propIds.push(id);
  }

  // Central white hot core
  const core = createSphere(0.5, 0xffffff, [0, 0, 0], 16, {
    material: 'standard',
    emissive: 0xffffff,
    emissiveIntensity: 6.0,
  });
  propIds.push(core);
  createPointLight(0xffffff, 4, 15, 0, 0, 0);
}

// ── Scene 5: Ocean Horizon — open sea, sun glitter, trade-wind clouds ───────
function buildOcean() {
  createSkyPreset('ocean');

  setFog(0xcfeaff, 25, 90);
  enableBloom(0.25, 0.4, 0.97);
  setAmbientLight(0x88aacc, 1.3);
  setLightColor(0xfff1c8);
  setLightDirection(-0.5, -0.4, 1);

  // A small sandy islet with palms and a lighthouse.
  const sand = createCylinder(5, 0.6, 0xe8d29a, [0, -2.2, 0], {
    material: 'standard',
    roughness: 0.95,
  });
  propIds.push(sand);
  const palms = [
    [-2.5, 1.2],
    [2.2, -1.6],
    [-0.8, -3],
  ];
  for (const [px, pz] of palms) {
    propIds.push(createCylinder(0.15, 3.5, 0x8a6a3a, [px, -0.2, pz], { material: 'standard' }));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const leaf = createCone(
        0.35,
        2.2,
        0x2fae4a,
        [px + Math.cos(a) * 0.9, 1.6, pz + Math.sin(a) * 0.9],
        {
          material: 'standard',
        }
      );
      setRotation(leaf, Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4);
      propIds.push(leaf);
    }
  }
  for (let i = 0; i < 4; i++) {
    const col = i % 2 ? 0xd8202a : 0xf4f4f4;
    propIds.push(
      createCylinder(0.7 - i * 0.08, 1.4, col, [3, -1.2 + i * 1.4, 2], { material: 'standard' })
    );
  }
  const lamp = createSphere(0.5, 0xfff2a0, [3, 4.6, 2], 16, {
    material: 'standard',
    emissive: 0xffe066,
    emissiveIntensity: 4,
  });
  propIds.push(lamp);
}

// ── Scene 6: Sunny Meadow — saturated toon sky, puffy clouds, rainbow ───────
function buildMeadow() {
  targetY = 3.5;
  orbitY = 0.5;
  orbitDist = 6.5;
  createSkyPreset('meadow');

  setFog(0xc8f0ff, 40, 120);
  setAmbientLight(0xcce6ff, 2.0);
  setLightColor(0xffffff);
  enableBloom(0.2, 0.3, 0.97);

  const grass = createPlane(80, 80, 0x5ed04a, [0, -2, 0], { material: 'standard', roughness: 1 });
  setRotation(grass, -Math.PI / 2, 0, 0);
  // Round bubbly trees.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const r = 9 + (i % 3) * 3;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    propIds.push(createCylinder(0.3, 2, 0x9a6233, [x, -1, z], { material: 'standard' }));
    propIds.push(
      createSphere(1.5, i % 2 ? 0x36b84a : 0x49c95a, [x, 1.2, z], 12, { material: 'standard' })
    );
  }
  // Cosy house with a red roof.
  propIds.push(createCube(3, 0xfff3d6, [0, -0.5, -4], { material: 'standard' }));
  const roof = createCone(2.6, 1.8, 0xe8423a, [0, 1.9, -4], { material: 'standard' });
  propIds.push(roof);
  // Flower dots.
  const petals = [0xff5fa2, 0xffe14a, 0xffffff, 0x9a7bff];
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 24;
    const z = (Math.random() - 0.5) * 24;
    if (Math.hypot(x, z + 4) < 3) continue;
    propIds.push(createSphere(0.18, petals[i % 4], [x, -1.85, z], 6, { material: 'standard' }));
  }
  // Bouncy blob buddies with googly eyes.
  const blobs = [0xff7ab8, 0x7ad7ff, 0xffd23f, 0xb48cff];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    const x = Math.cos(a) * 3.2;
    const z = Math.sin(a) * 3.2;
    const phase = i * 1.3;
    const body = createSphere(0.55, blobs[i], [x, -1.4, z], 16, {
      material: 'standard',
      roughness: 0.35,
    });
    bobbers.push({ id: body, x, y: -1.4, z, amp: 0.6, speed: 5, phase, hop: true });
    // Eyes face outward from the meadow centre.
    const ox = Math.cos(a) * 0.48;
    const oz = Math.sin(a) * 0.48;
    const px = -Math.sin(a) * 0.2;
    const pz = Math.cos(a) * 0.2;
    for (const side of [1, -1]) {
      const ex = x + ox + px * side;
      const ez = z + oz + pz * side;
      const eye = createSphere(0.12, 0x111122, [ex, -1.25, ez], 8, { material: 'standard' });
      bobbers.push({ id: eye, x: ex, y: -1.25, z: ez, amp: 0.6, speed: 5, phase, hop: true });
    }
  }
}

// ── Scene 7: Sky Highlands — painterly cel clouds, god rays, floating isles ─
function buildHighlands() {
  targetY = 4;
  orbitY = 1;
  orbitDist = 14;
  createSkyPreset('highlands');

  setFog(0xe8d8b0, 40, 120);
  setAmbientLight(0x8899bb, 1.4);
  setLightColor(0xffe0a8);
  setLightDirection(-0.6, -0.5, 1);
  enableBloom(0.35, 0.5, 0.95);

  const hill = createSphere(14, 0x6fae4f, [0, -15, 0], 24, { material: 'standard', roughness: 1 });
  propIds.push(hill);
  // Ruined pillars in a ring.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const h = 1.5 + (i % 3) * 1.2;
    propIds.push(
      createCylinder(0.35, h, 0xd8cdb4, [Math.cos(a) * 4, -1.2 + h / 2, Math.sin(a) * 4], {
        material: 'standard',
        roughness: 0.9,
      })
    );
  }
  // Floating islands drifting in the distance.
  const isles = [
    [-10, 6, -14, 2.5],
    [12, 9, -10, 1.8],
    [4, 12, -20, 3.2],
    [-14, 3, 6, 1.5],
  ];
  for (const [x, y, z, r] of isles) {
    const rock = createCone(r, r * 2, 0x7a6450, [x, y - r, z], { material: 'standard' });
    setRotation(rock, Math.PI, 0, 0);
    propIds.push(rock);
    propIds.push(createCylinder(r, 0.5, 0x5fb04a, [x, y + 0.2, z], { material: 'standard' }));
    propIds.push(
      createSphere(r * 0.45, 0x3f8f3a, [x + r * 0.3, y + r * 0.5, z], 10, { material: 'standard' })
    );
  }
  // Glowing shrine crystal.
  const crystal = createCone(0.6, 2, 0x7ff0ff, [0, 0, 0], {
    material: 'standard',
    emissive: 0x33d0ff,
    emissiveIntensity: 3,
  });
  propIds.push(crystal);
  createPointLight(0x55ddff, 3, 12, 0, 0.5, 0);
}

// ── Scene 8: Aurora Night — curtains of light over a frozen shore ───────────
function buildAurora() {
  targetY = 3;
  orbitY = 0.8;
  orbitDist = 11;
  createSkyPreset('aurora');
  setFog(0x08202a, 30, 110);
  setAmbientLight(0x2a5a6a, 1.0);
  setLightColor(0x88ffd0);
  setLightDirection(0.3, -0.6, -1);
  enableBloom(0.9, 0.6, 0.55);

  propIds.push(
    createCylinder(7, 0.6, 0xe8f4ff, [0, -2.2, 0], { material: 'standard', roughness: 0.6 })
  );
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 4.5 + (i % 2) * 1.5;
    const h = 2.4 + (i % 3) * 0.8;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    propIds.push(createCylinder(0.15, 0.8, 0x3a2a1a, [x, -1.5, z], { material: 'standard' }));
    for (let k = 0; k < 3; k++) {
      const tint = k === 2 ? 0xdff2ff : 0x0f3a32; // snow-capped tip
      propIds.push(
        createCone(1.0 - k * 0.25, h * 0.5, tint, [x, -1.1 + k * 0.7 + h * 0.25, z], {
          material: 'standard',
          roughness: 0.8,
        })
      );
    }
  }
  // Campfire.
  const fire = createSphere(0.35, 0xff8a2a, [0, -1.6, 0], 12, {
    material: 'standard',
    emissive: 0xff6a00,
    emissiveIntensity: 5,
  });
  bobbers.push({ id: fire, x: 0, y: -1.6, z: 0, amp: 0.06, speed: 11, phase: 0 });
  createPointLight(0xff8a3a, 5, 10, 0, -1, 0);
}

// ── Scene 9: Candy Cosmos — saturated nebula, ringed planet, orbiting moons ─
function buildCosmos() {
  targetY = 1;
  orbitY = 2;
  orbitDist = 15;
  createSkyPreset('cosmos');
  enableSkyboxAutoAnimate(0.6);
  setFog(0x1a0420, 60, 160);
  setAmbientLight(0x6a3a8a, 1.2);
  setLightColor(0xffe0f4);
  setLightDirection(-0.7, -0.3, -0.6);
  enableBloom(0.6, 0.5, 0.8);

  const planet = createSphere(3.2, 0xff9ad5, [0, 0, 0], 48, {
    material: 'standard',
    roughness: 0.45,
  });
  setPBRProperties(planet, { metalness: 0.2, roughness: 0.45, envMapIntensity: 1.5 });
  const ring = createTorus(5.2, 0.35, 0x8ff7ff, [0, 0, 0], {
    material: 'standard',
    emissive: 0x33c8ff,
    emissiveIntensity: 1.6,
  });
  setRotation(ring, Math.PI / 2 - 0.35, 0.2, 0);
  const ring2 = createTorus(6.3, 0.12, 0xffe36a, [0, 0, 0], {
    material: 'standard',
    emissive: 0xffc23a,
    emissiveIntensity: 2.2,
  });
  setRotation(ring2, Math.PI / 2 - 0.35, 0.2, 0);
  const moons = [
    [0xfff07a, 8.5, 0.6, 0.0],
    [0x7affc8, 10.5, 0.45, 2.1],
    [0xb08cff, 12.5, 0.8, 4.0],
  ];
  for (const [c, r, size, ph] of moons) {
    const id = createSphere(size, c, [r, 0, 0], 24, {
      material: 'standard',
      emissive: c,
      emissiveIntensity: 0.6,
    });
    setPBRProperties(id, { metalness: 0.6, roughness: 0.15 });
    bobbers.push({ id, orbit: r, speed: 1.6 / r, phase: ph, y: Math.sin(ph) * 1.5 });
  }
}

export function update(dt) {
  time += dt;

  // Camera controls
  if (key('KeyA') || key('ArrowLeft')) orbitAngle -= dt * 1.2;
  if (key('KeyD') || key('ArrowRight')) orbitAngle += dt * 1.2;
  if (key('KeyW') || key('ArrowUp')) orbitY = Math.min(15, orbitY + dt * 4);
  if (key('KeyS') || key('ArrowDown')) orbitY = Math.max(-2, orbitY - dt * 4);
  if (key('KeyQ')) orbitDist = Math.min(30, orbitDist + dt * 6);
  if (key('KeyE')) orbitDist = Math.max(5, orbitDist - dt * 6);

  // Toggle auto-rotate
  if (keyp('Space') || btnp(13)) autoRotate = !autoRotate;

  // Auto-orbit
  if (autoRotate && !key('KeyA') && !key('KeyD') && !key('ArrowLeft') && !key('ArrowRight')) {
    orbitAngle += dt * 0.25;
  }

  const cx = Math.sin(orbitAngle) * orbitDist;
  const cz = Math.cos(orbitAngle) * orbitDist;
  setCameraPosition(cx, orbitY, cz);
  setCameraTarget(0, targetY, 0);

  cardT += dt;

  // Scene switch: 1-9, 0 for the tenth, [ ] or Tab to step.
  let next = -1;
  for (let i = 0; i < SCENES.length; i++) {
    const k = (i + 1) % 10;
    if (keyp('Digit' + k) || keyp('Numpad' + k)) next = i;
  }
  if (keyp('BracketRight') || keyp('Tab') || btnp(5)) next = (scene + 1) % SCENES.length;
  if (keyp('BracketLeft') || btnp(4)) next = (scene + SCENES.length - 1) % SCENES.length;
  if (next >= 0 && next !== scene) {
    scene = next;
    void buildScene(next);
  }

  if (SPIN_SCENES.has(scene)) {
    for (let i = 0; i < propIds.length; i++) {
      rotateMesh(propIds[i], 0, dt * 0.15 * ((i % 3) - 1), 0);
    }
  }
  for (const b of bobbers) {
    const t = time * b.speed + b.phase;
    if (b.orbit) {
      setPosition(b.id, Math.cos(t) * b.orbit, b.y + Math.sin(t * 2) * 0.4, Math.sin(t) * b.orbit);
    } else if (b.hop) {
      setPosition(b.id, b.x, b.y + Math.abs(Math.sin(t)) * b.amp, b.z);
    } else {
      setPosition(b.id, b.x, b.y + Math.sin(t) * b.amp, b.z);
    }
  }
}

function col(c, a = 255) {
  return rgba8(c[0], c[1], c[2], a);
}

export function draw() {
  const sc = SCENES[scene];
  const acc = sc.accent;

  // Flash + slide-in title card on every scene switch.
  if (cardT < 0.35) {
    rectfill(0, 0, 640, 360, rgba8(255, 255, 255, Math.round(160 * (1 - cardT / 0.35))));
  }
  const e = Math.min(1, cardT / 0.45);
  const slide = Math.round(-420 * Math.pow(1 - e, 3));

  // Bottom glass panel (screen is 640x360).
  drawGradient(0, 284, 640, 76, rgba8(0, 0, 0, 0), rgba8(4, 6, 16, 225), 'v');
  rectfill(16 + slide, 302, 4, 34, col(acc));
  drawGlowText(sc.name.toUpperCase(), 28 + slide, 302, rgba8(255, 255, 255, 255), col(acc, 170), 3);
  print(sc.tag, 28 + slide, 328, col(acc, 235));

  // Page dots.
  for (let i = 0; i < SCENES.length; i++) {
    const active = i === scene;
    const w = active ? 18 : 8;
    drawRoundedRect(28 + i * 22, 344, w, 6, 3, active ? col(acc) : rgba8(120, 130, 160, 150));
  }
  print(
    String(scene + 1).padStart(2, '0') + ' / ' + SCENES.length,
    580,
    342,
    rgba8(200, 210, 240, 210)
  );

  // Controls hint, top-right: bright after a switch, then stays faint.
  const hintA = cardT < 4 ? 230 : 100;
  drawRoundedRect(404, 6, 230, 16, 4, rgba8(0, 0, 0, Math.round(hintA * 0.6)));
  print('1-0/[ ] sky  WASD orbit  SPC spin', 420, 10, rgba8(210, 220, 255, hintA));
}
