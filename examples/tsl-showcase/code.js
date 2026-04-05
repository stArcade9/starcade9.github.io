// examples/tsl-showcase/code.js
// TSL (Three Shading Language) Showcase — demonstrates Nova64's TSL integration
// Scenes: Galaxy Spiral, Procedural Terrain, Energy Tornado, Material Lab

let currentScene = 0;
const SCENE_COUNT = 4;
let sceneTime = 0;
let meshes = [];
let particles = null;

export function init() {
  setupScene(0);
}

function clearAll() {
  meshes.forEach(m => {
    if (m) removeMesh(m);
  });
  meshes = [];
  if (particles) {
    removeParticleSystem(particles);
    particles = null;
  }
  clearScene();
}

function setupScene(idx) {
  clearAll();
  sceneTime = 0;

  switch (idx) {
    case 0:
      setupGalaxy();
      break;
    case 1:
      setupTerrain();
      break;
    case 2:
      setupTornado();
      break;
    case 3:
      setupMaterialLab();
      break;
  }
}

// ─── Scene 0: Galaxy Spiral ─────────────────────────────────────────────

function setupGalaxy() {
  setCameraPosition(0, 15, 20);
  setCameraTarget(0, 0, 0);
  setFog(0x050510, 20, 60);

  // Galaxy disc made of cubes with TSL galaxy material
  const galaxyMat = createTSLMaterial('galaxy', { speed: 0.3, opacity: 0.95 });
  const core = createSphere(3, 0xffffff, [0, 0, 0]);
  core.material = galaxyMat;
  meshes.push(core);

  // Spiral arms — small cubes orbiting
  for (let arm = 0; arm < 3; arm++) {
    const armOffset = (arm / 3) * Math.PI * 2;
    for (let i = 0; i < 40; i++) {
      const r = 4 + i * 0.3;
      const angle = armOffset + i * 0.15;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (Math.random() - 0.5) * 1.5;
      const starSize = 0.15 + Math.random() * 0.3;
      const hue = 0.55 + arm * 0.15 + Math.random() * 0.1;
      const col = hslToHex(hue, 0.8, 0.6);
      const star = createCube(starSize, col, [x, y, z], {
        emissive: col,
        emissiveIntensity: 1.5,
      });
      meshes.push(star);
    }
  }

  // Particles — stardust
  particles = createParticleSystem(300, {
    emitRate: 40,
    minLife: 2,
    maxLife: 5,
    minSpeed: 0.5,
    maxSpeed: 2,
    spread: Math.PI,
    minSize: 0.05,
    maxSize: 0.15,
    startColor: 0x8888ff,
    endColor: 0x220044,
    emissive: 0x8888ff,
    emissiveIntensity: 3,
    gravity: 0,
    drag: 0.99,
    blending: 'additive',
    turbulence: 2,
    turbulenceScale: 0.5,
    opacityOverLife: [0, 1, 0],
  });

  enableBloom(1.5, 0.4, 0.2);
}

// ─── Scene 1: Procedural Terrain ────────────────────────────────────────

function setupTerrain() {
  setCameraPosition(0, 12, 18);
  setCameraTarget(0, 0, 0);
  setFog(0x1a2a3a, 20, 50);

  // Ground plane with lava material
  const lavaMat = createTSLMaterial('lava', { speed: 0.5, opacity: 1.0 });
  const lavaPlane = createPlane(30, 30, [0, -0.5, 0]);
  lavaPlane.material = lavaMat;
  lavaPlane.rotation.x = -Math.PI / 2;
  meshes.push(lavaPlane);

  // Terrain pillars — procedurally placed
  for (let x = -8; x <= 8; x += 2) {
    for (let z = -8; z <= 8; z += 2) {
      const height = Math.abs(Math.sin(x * 0.4) * Math.cos(z * 0.5)) * 6 + 0.5;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 2) continue; // Clear center
      const col = dist < 5 ? 0x884422 : 0x556644;
      const pillar = createCube(1.5, col, [x, height / 2, z]);
      setScale(pillar, 1.5, height, 1.5);
      meshes.push(pillar);

      // Crystal on top of some pillars
      if (Math.random() > 0.6 && height > 3) {
        const crystalMat = createTSLMaterial('electricity', {
          speed: 2,
          color: 0x44ffaa,
          opacity: 0.8,
        });
        const crystal = createCone(0.3, 1, [x, height + 0.5, z]);
        crystal.material = crystalMat;
        meshes.push(crystal);
      }
    }
  }

  enableBloom(0.8, 0.3, 0.4);
  enableVignette(1.0, 0.85);
}

// ─── Scene 2: Energy Tornado ────────────────────────────────────────────

function setupTornado() {
  setCameraPosition(10, 8, 10);
  setCameraTarget(0, 5, 0);
  setFog(0x0a0a20, 15, 40);

  // Tornado funnel — layered rings with plasma material
  for (let layer = 0; layer < 20; layer++) {
    const y = layer * 0.6;
    const radius = 3 - layer * 0.1;
    const segments = 12;
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const blockSize = 0.4 - layer * 0.01;
      const hue = 0.6 + layer * 0.02;
      const col = hslToHex(hue, 0.9, 0.5 + layer * 0.02);
      const block = createCube(blockSize, col, [x, y, z], {
        emissive: col,
        emissiveIntensity: 2,
      });
      meshes.push(block);
    }
  }

  // Debris particles swirling around tornado
  particles = createParticleSystem(400, {
    emitRate: 60,
    emitterY: 0,
    minLife: 2,
    maxLife: 4,
    minSpeed: 3,
    maxSpeed: 8,
    spread: Math.PI * 0.3,
    minSize: 0.08,
    maxSize: 0.25,
    startColor: 0xff4488,
    endColor: 0x4400ff,
    emissive: 0xff4488,
    emissiveIntensity: 4,
    gravity: -2,
    drag: 0.97,
    blending: 'additive',
    turbulence: 5,
    turbulenceScale: 0.3,
    attractorX: 0,
    attractorY: 6,
    attractorZ: 0,
    attractorStrength: 8,
    sizeOverLife: [0.5, 1.0, 0.2],
    opacityOverLife: [0, 1, 0],
    rotationSpeed: 3,
  });

  enableBloom(1.8, 0.5, 0.15);
}

// ─── Scene 3: Material Lab ──────────────────────────────────────────────

function setupMaterialLab() {
  setCameraPosition(0, 4, 12);
  setCameraTarget(0, 2, 0);
  setFog(0x0f0f1f, 15, 40);

  const presets = ['plasma', 'galaxy', 'lava', 'electricity', 'rainbow', 'void'];
  const spacing = 3.5;
  const startX = -((presets.length - 1) * spacing) / 2;

  for (let i = 0; i < presets.length; i++) {
    const x = startX + i * spacing;
    const mat = createTSLMaterial(presets[i]);

    // Sphere with TSL material
    const sphere = createSphere(1.2, 0xffffff, [x, 3, 0]);
    sphere.material = mat;
    meshes.push(sphere);

    // Cube with same preset material (separate instance)
    const cubeMat = createTSLMaterial(presets[i]);
    const cube = createCube(1.5, 0xffffff, [x, 0.75, 0]);
    cube.material = cubeMat;
    meshes.push(cube);
  }

  // Custom shader material — user-style GLSL
  const customMat = createTSLShaderMaterial(
    null,
    /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float r = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
      float g = sin(vUv.y * 10.0 + uTime * 1.3) * 0.5 + 0.5;
      float b = sin((vUv.x + vUv.y) * 5.0 + uTime * 0.7) * 0.5 + 0.5;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
  );
  const customSphere = createSphere(1.5, 0xffffff, [0, 6, -3]);
  customSphere.material = customMat;
  meshes.push(customSphere);

  enableBloom(1.0, 0.3, 0.3);
  enableVignette(0.8, 0.9);
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)));
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

export function update(dt) {
  sceneTime += dt;

  // Cycle scenes with Enter or Space
  if (keyp('Enter') || keyp('Space')) {
    currentScene = (currentScene + 1) % SCENE_COUNT;
    setupScene(currentScene);
  }

  // Rotate objects gently
  meshes.forEach((m, i) => {
    if (m && m.parent) {
      rotateMesh(m, 0, dt * 0.3 * (i % 2 === 0 ? 1 : -1), 0);
    }
  });

  // Update tornado rotation for scene 2
  if (currentScene === 2) {
    meshes.forEach((m, i) => {
      if (m && m.parent) {
        const speed = 0.5 + (i % 20) * 0.05;
        rotateMesh(m, 0, dt * speed, 0);
      }
    });
  }

  updateParticles(dt);
}

const sceneNames = ['Galaxy Spiral', 'Procedural Terrain', 'Energy Tornado', 'Material Lab'];

export function draw() {
  print('TSL SHOWCASE', 220, 10, 0x00ffff);
  print(sceneNames[currentScene], 210, 25, 0xffffff);
  print('[ENTER] Next Scene', 230, 345, 0x888888);

  // Scene-specific HUD
  if (currentScene === 3) {
    const presets = ['plasma', 'galaxy', 'lava', 'electric', 'rainbow', 'void'];
    for (let i = 0; i < presets.length; i++) {
      print(presets[i], 45 + i * 100, 320, 0xaaaaaa);
    }
    print('custom', 260, 295, 0x44ffaa);
  }
}
