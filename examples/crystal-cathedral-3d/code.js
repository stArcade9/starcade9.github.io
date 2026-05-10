// CRYSTAL CATHEDRAL 3D - Ultimate Nintendo 64/PlayStation visual showcase
// Demonstrates the most advanced graphics features: holographic materials, dynamic lighting, atmospheric effects

const {
  circle,
  cls,
  drawGlowTextCentered,
  drawGradient,
  drawNoise,
  drawPanel,
  drawRadialGradient,
  drawScanlines,
  drawStarburst,
  print,
  rgba8,
} = nova64.draw;
const {
  createAdvancedCube,
  createAdvancedSphere,
  createPlane,
  get3DStats,
  rotateMesh,
  setPosition,
  setRotation,
  setScale,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog, setLightColor, setLightDirection } = nova64.light;
const { enableBloom, enableDithering, enableFXAA, enablePixelation, enableVignette } = nova64.fx;
const { isKeyPressed } = nova64.input;
const {
  Screen,
  centerX,
  createButton,
  createPanel,
  drawAllButtons,
  drawText,
  setFont,
  setTextAlign,
  uiColors,
  updateAllButtons,
} = nova64.ui;
let cathedral = {
  pillars: [],
  crystals: [],
  floatingElements: [],
  lightBeams: [],
  particles: [],
};

let camera = {
  angle: 0,
  height: 8,
  radius: 25,
  target: { x: 0, y: 5, z: 0 },
};

let time = 0;
let musicTime = 0;
let atmosphereIntensity = 0;

// Screen management
let gameState = 'start'; // 'start', 'viewing'
let startScreenTime = 0;
let uiButtons = [];

export async function init() {
  nova64.draw.cls();

  console.log('🏛️ Initializing Crystal Cathedral - Ultimate Graphics Showcase...');

  // Setup dramatic camera
  nova64.camera.setCameraPosition(25, 8, 0);
  nova64.camera.setCameraTarget(0, 5, 0);
  nova64.camera.setCameraFOV(70);

  // Enable all advanced effects — use real post-processing API
  nova64.fx.enablePixelation(1);
  nova64.fx.enableDithering(true);
  nova64.fx.enableBloom(0.8, 0.4, 0.5); // UnrealBloomPass: strength, radius, threshold
  nova64.fx.enableFXAA(); // Smooth jagged edges
  nova64.fx.enableVignette(1.4, 0.9); // Cinematic dark border

  // Build the magnificent cathedral
  await buildCathedral();
  await createFloatingCrystals();
  await addAtmosphericElements();

  // Set dramatic lighting
  nova64.light.setLightDirection(-0.3, -1, -0.2);
  nova64.light.setLightColor(0xffffff);
  nova64.light.setAmbientLight(0x202040);
  nova64.light.setFog(0x000011, 40, 120);

  // Initialize start screen
  initStartScreen();

  console.log('✨ Crystal Cathedral loaded - Experience ultimate 3D graphics!');
}

function initStartScreen() {
  uiButtons = [];

  // Enter cathedral button
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(240),
      150,
      240,
      60,
      '◆ ENTER CATHEDRAL ◆',
      () => {
        console.log('🎯 ENTER CATHEDRAL CLICKED! Changing gameState to viewing...');
        gameState = 'viewing';
        console.log('✅ gameState is now:', gameState);
      },
      {
        normalColor: nova64.draw.rgba8(70, 150, 255, 255),
        hoverColor: nova64.draw.rgba8(100, 180, 255, 255),
        pressedColor: nova64.draw.rgba8(40, 120, 220, 255),
      }
    )
  );

  // Features button
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(200),
      355,
      200,
      45,
      '✨ FEATURES',
      () => {
        console.log('Crystal Cathedral - Advanced graphics showcase');
      },
      {
        normalColor: nova64.draw.rgba8(100, 200, 255, 255),
        hoverColor: nova64.draw.rgba8(130, 220, 255, 255),
        pressedColor: nova64.draw.rgba8(70, 170, 230, 255),
      }
    )
  );
}

async function buildCathedral() {
  console.log('🏗️ Building Crystal Cathedral...');

  // Create magnificent crystal floor
  const floor = nova64.scene.createAdvancedCube(
    1,
    {
      color: 0x111144,
      emissive: 0x000022,
      emissiveIntensity: 0.3,
      metallic: true,
      animated: true,
    },
    [0, -1, 0]
  );
  nova64.scene.setScale(floor, 60, 0.5, 60);

  // Create towering crystal pillars in a circle
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x = Math.cos(angle) * 20;
    const z = Math.sin(angle) * 20;
    const height = 15 + Math.sin(i * 0.5) * 5;

    // Main pillar
    const pillar = nova64.scene.createAdvancedCube(
      1,
      {
        color: 0x4488ff,
        emissive: 0x112244,
        emissiveIntensity: 0.6,
        metallic: true,
        holographic: i % 3 === 0,
        animated: true,
      },
      [x, height / 2, z]
    );
    nova64.scene.setScale(pillar, 2, height, 2);

    // Crystal cap
    const cap = nova64.scene.createAdvancedSphere(
      1.5,
      {
        color: 0x88ddff,
        emissive: 0x224488,
        emissiveIntensity: 0.8,
        holographic: true,
        animated: true,
        transparent: true,
        opacity: 0.9,
      },
      [x, height + 1, z],
      16
    );

    cathedral.pillars.push({
      main: pillar,
      cap: cap,
      x,
      z,
      height,
      glowPhase: Math.random() * Math.PI * 2,
      originalHeight: height,
    });
  }

  // Create central altar with ultimate crystal
  const altarBase = nova64.scene.createAdvancedCube(
    1,
    {
      color: 0x666699,
      emissive: 0x111133,
      emissiveIntensity: 0.4,
      metallic: true,
      animated: true,
    },
    [0, 1, 0]
  );
  nova64.scene.setScale(altarBase, 6, 2, 6);

  const masterCrystal = nova64.scene.createAdvancedSphere(
    2,
    {
      color: 0xffffff,
      emissive: 0x444488,
      emissiveIntensity: 1.2,
      holographic: true,
      animated: true,
      transparent: true,
      opacity: 0.8,
    },
    [0, 4, 0],
    20
  );

  cathedral.masterCrystal = {
    mesh: masterCrystal,
    rotationSpeed: 0.5,
    pulsePhase: 0,
  };

  // Create crystal archways
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const radius = 35;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Arch supports
    const support1 = nova64.scene.createAdvancedCube(
      1,
      {
        color: 0x8844ff,
        emissive: 0x221144,
        emissiveIntensity: 0.5,
        holographic: true,
        animated: true,
      },
      [x - 3, 6, z]
    );
    nova64.scene.setScale(support1, 1.5, 12, 1.5);

    const support2 = nova64.scene.createAdvancedCube(
      1,
      {
        color: 0x8844ff,
        emissive: 0x221144,
        emissiveIntensity: 0.5,
        holographic: true,
        animated: true,
      },
      [x + 3, 6, z]
    );
    nova64.scene.setScale(support2, 1.5, 12, 1.5);

    // Arch top
    const archTop = nova64.scene.createAdvancedCube(
      1,
      {
        color: 0xaa66ff,
        emissive: 0x332244,
        emissiveIntensity: 0.7,
        holographic: true,
        animated: true,
        transparent: true,
        opacity: 0.9,
      },
      [x, 11, z]
    );
    nova64.scene.setScale(archTop, 8, 2, 2);
  }
}

async function createFloatingCrystals() {
  console.log('💎 Creating floating crystal formation...');

  // Create floating crystal clusters at different heights
  for (let layer = 0; layer < 4; layer++) {
    const numCrystals = 8 - layer * 2;
    const radius = 12 + layer * 4;
    const height = 8 + layer * 6;

    for (let i = 0; i < numCrystals; i++) {
      const angle = (i / numCrystals) * Math.PI * 2 + layer * 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const crystal = nova64.scene.createAdvancedSphere(
        0.8 + layer * 0.2,
        {
          color: layer % 2 === 0 ? 0xff88aa : 0x88aaff,
          emissive: layer % 2 === 0 ? 0x441122 : 0x112244,
          emissiveIntensity: 0.9,
          holographic: true,
          animated: true,
          transparent: true,
          opacity: 0.85,
        },
        [x, height, z],
        12
      );

      cathedral.floatingElements.push({
        mesh: crystal,
        x,
        y: height,
        z,
        originalY: height,
        rotationSpeed: 0.5 + Math.random() * 1,
        orbitSpeed: 0.2 + layer * 0.1,
        orbitRadius: radius,
        orbitPhase: angle,
        bobPhase: Math.random() * Math.PI * 2,
        layer,
      });
    }
  }

  // Create spiral of energy crystals
  for (let i = 0; i < 20; i++) {
    const spiralPhase = (i / 20) * Math.PI * 4;
    const spiralRadius = 8 + Math.sin(spiralPhase) * 3;
    const x = Math.cos(spiralPhase) * spiralRadius;
    const z = Math.sin(spiralPhase) * spiralRadius;
    const y = 2 + i * 0.8;

    const energyCrystal = nova64.scene.createAdvancedSphere(
      0.3,
      {
        color: 0xffff44,
        emissive: 0x444411,
        emissiveIntensity: 1.1,
        holographic: true,
        animated: true,
        transparent: true,
        opacity: 0.7,
      },
      [x, y, z],
      8
    );

    cathedral.crystals.push({
      mesh: energyCrystal,
      x,
      y,
      z,
      spiralPhase,
      spiralIndex: i,
    });
  }
}

async function addAtmosphericElements() {
  console.log('🌟 Adding atmospheric elements...');

  // Create light beam effects (simulated with transparent planes)
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * 15;
    const z = Math.sin(angle) * 15;

    const lightBeam = nova64.scene.createPlane(2, 20, 0xffffff, [x, 10, z]);
    nova64.scene.setRotation(lightBeam, 0, angle, 0);

    cathedral.lightBeams.push({
      mesh: lightBeam,
      angle,
      intensity: Math.random(),
    });
  }
}

export function update(dt) {
  time += dt;
  musicTime += dt * 0.5; // Slower for atmospheric effect
  atmosphereIntensity = (Math.sin(musicTime) + 1) * 0.5;

  if (gameState === 'start') {
    startScreenTime += dt;
    nova64.ui.updateAllButtons();

    // KEYBOARD FALLBACK: Press SPACE to start (Enter is reserved for cart reset)
    if (nova64.input.isKeyPressed(' ') || nova64.input.isKeyPressed('Space')) {
      console.log('🎮 Keyboard start pressed!');
      gameState = 'viewing';
      return;
    }

    // Still animate scene in background
    updateCamera(dt);
    updatePillars(dt);
    updateFloatingElements(dt);
    updateMasterCrystal(dt);
    updateSpiral(dt);
    return;
  }

  // Viewing state
  // Update camera orbit
  updateCamera(dt);

  // Update cathedral elements
  updatePillars(dt);
  updateFloatingElements(dt);
  updateMasterCrystal(dt);
  updateSpiral(dt);
  updateAtmosphere(dt);

  // Dynamic lighting effects
  updateDynamicLighting(dt);
}

function updateCamera(dt) {
  camera.angle += dt * 0.3;
  camera.height = 8 + Math.sin(time * 0.4) * 3;

  const x = Math.cos(camera.angle) * camera.radius;
  const z = Math.sin(camera.angle) * camera.radius;

  nova64.camera.setCameraPosition(x, camera.height, z);
  nova64.camera.setCameraTarget(camera.target.x, camera.target.y, camera.target.z);
}

function updatePillars(dt) {
  cathedral.pillars.forEach((pillar, index) => {
    pillar.glowPhase += dt * 2;

    // Subtle height animation
    const heightVariation = Math.sin(pillar.glowPhase + index) * 0.5;
    const newHeight = pillar.originalHeight + heightVariation;
    nova64.scene.setScale(pillar.main, 2, newHeight, 2);
    nova64.scene.setPosition(pillar.main, pillar.x, newHeight / 2, pillar.z);
    nova64.scene.setPosition(pillar.cap, pillar.x, newHeight + 1, pillar.z);

    // Rotation
    nova64.scene.rotateMesh(pillar.cap, 0, dt * 0.5, 0);
  });
}

function updateFloatingElements(dt) {
  cathedral.floatingElements.forEach(element => {
    // Orbital motion
    element.orbitPhase += dt * element.orbitSpeed;
    element.x = Math.cos(element.orbitPhase) * element.orbitRadius;
    element.z = Math.sin(element.orbitPhase) * element.orbitRadius;

    // Vertical bobbing
    element.bobPhase += dt * 3;
    const bobY = Math.sin(element.bobPhase) * 1.5;
    element.y = element.originalY + bobY;

    // Update position and rotation
    nova64.scene.setPosition(element.mesh, element.x, element.y, element.z);
    nova64.scene.rotateMesh(
      element.mesh,
      dt * element.rotationSpeed,
      dt * element.rotationSpeed * 0.7,
      0
    );
  });
}

function updateMasterCrystal(dt) {
  if (cathedral.masterCrystal) {
    cathedral.masterCrystal.pulsePhase += dt * 4;

    // Pulsing scale effect
    const pulseScale = 1 + Math.sin(cathedral.masterCrystal.pulsePhase) * 0.2;
    nova64.scene.setScale(cathedral.masterCrystal.mesh, pulseScale, pulseScale, pulseScale);

    // Rotation
    nova64.scene.rotateMesh(
      cathedral.masterCrystal.mesh,
      0,
      dt * cathedral.masterCrystal.rotationSpeed,
      0
    );

    // Vertical floating motion
    const floatY = 4 + Math.sin(time * 2) * 1;
    nova64.scene.setPosition(cathedral.masterCrystal.mesh, 0, floatY, 0);
  }
}

function updateSpiral(dt) {
  cathedral.crystals.forEach(crystal => {
    crystal.spiralPhase += dt * 2;

    const spiralRadius = 8 + Math.sin(crystal.spiralPhase) * 3;
    const x = Math.cos(crystal.spiralPhase) * spiralRadius;
    const z = Math.sin(crystal.spiralPhase) * spiralRadius;
    const y = crystal.y + Math.sin(time + crystal.spiralIndex * 0.5) * 0.5;

    nova64.scene.setPosition(crystal.mesh, x, y, z);
    nova64.scene.rotateMesh(crystal.mesh, dt, dt * 2, dt * 0.5);
  });
}

function updateAtmosphere(dt) {
  // Update light beams
  cathedral.lightBeams.forEach((beam, index) => {
    beam.intensity += dt * 2;
    const alpha = (Math.sin(beam.intensity + index) + 1) * 0.3 + 0.1;
    // Note: In a real implementation, we would update material opacity here
  });
}

function updateDynamicLighting(dt) {
  // Cycle through different lighting moods
  const lightPhase = time * 0.3;

  // Main light color cycling
  const hue = Math.sin(lightPhase) * 180 + 180;
  const lightColor = hslToHex(hue, 70, 80);
  nova64.light.setLightColor(lightColor);

  // Ambient light pulsing
  const ambientIntensity = 0x202040 + Math.floor(atmosphereIntensity * 0x202020);
  nova64.light.setAmbientLight(ambientIntensity);

  // Fog color changes
  const fogHue = Math.sin(lightPhase * 0.7) * 60 + 240; // Blue to purple range
  const fogColor = hslToHex(fogHue, 50, 10);
  nova64.light.setFog(fogColor, 40, 120);
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }

  // Viewing - Atmospheric UI with dynamic colors
  const titleColor = hslToHex((time * 50) % 360, 80, 70);
  const accentColor = hslToHex((time * 30 + 180) % 360, 70, 60);

  nova64.draw.print('🏛️ CRYSTAL CATHEDRAL', 8, 8, titleColor);
  nova64.draw.print('Ultimate Nintendo 64 / PlayStation Graphics Showcase', 8, 24, accentColor);

  // Atmosphere info
  const moodNames = ['Mystical', 'Ethereal', 'Transcendent', 'Divine', 'Cosmic'];
  const currentMood = moodNames[Math.floor(atmosphereIntensity * moodNames.length)];
  nova64.draw.print(
    `Atmosphere: ${currentMood} | Intensity: ${(atmosphereIntensity * 100).toFixed(0)}%`,
    8,
    50,
    nova64.draw.rgba8(200, 150, 255, 255)
  );

  // Crystal count
  const totalCrystals = cathedral.floatingElements.length + cathedral.crystals.length + 1;
  nova64.draw.print(
    `Sacred Crystals: ${totalCrystals} | Pillars: ${cathedral.pillars.length}`,
    8,
    66,
    nova64.draw.rgba8(150, 200, 255, 255)
  );

  // Visual effects status
  nova64.draw.print(
    'Effects: Holographic + Bloom + Motion + Dynamic Lighting',
    8,
    82,
    nova64.draw.rgba8(255, 200, 100, 255)
  );

  // Advanced 3D stats
  const stats = nova64.scene.get3DStats();
  if (stats && stats.render) {
    const objectCount =
      cathedral.pillars.length * 2 +
      cathedral.floatingElements.length +
      cathedral.crystals.length +
      10;
    nova64.draw.print(
      `3D Objects: ${objectCount} | GPU: Three.js Advanced`,
      8,
      108,
      nova64.draw.rgba8(150, 150, 255, 255)
    );
    nova64.draw.print(
      `Shadows: Ultra | Materials: Holographic | Lighting: Dynamic`,
      8,
      124,
      nova64.draw.rgba8(150, 150, 255, 255)
    );
  }

  // Experience description
  nova64.draw.print(
    'Witness the ultimate fusion of retro and modern 3D graphics!',
    8,
    300,
    nova64.draw.rgba8(255, 255, 100, 200)
  );
  nova64.draw.print(
    'Nintendo 64/PlayStation aesthetics with cutting-edge effects!',
    8,
    316,
    nova64.draw.rgba8(100, 255, 255, 180)
  );
  nova64.draw.print(
    'Camera automatically orbits - sit back and enjoy the show!',
    8,
    332,
    nova64.draw.rgba8(100, 255, 100, 160)
  );

  // Dynamic status indicators
  const pulseAlpha = Math.floor((Math.sin(time * 8) + 1) * 127 + 128);
  nova64.draw.print(
    '🔮 TRANSCENDENT EXPERIENCE ACTIVE 🔮',
    200,
    8,
    nova64.draw.rgba8(255, 100, 255, pulseAlpha)
  );
}

function drawStartScreen() {
  // Deep space gradient background
  nova64.draw.drawGradient(
    0,
    0,
    640,
    360,
    nova64.draw.rgba8(5, 10, 40, 245),
    nova64.draw.rgba8(10, 30, 60, 230),
    'v'
  );

  // Radial glow behind title
  nova64.draw.drawRadialGradient(
    320,
    100,
    220,
    nova64.draw.rgba8(0, 140, 255, 55),
    nova64.draw.rgba8(0, 0, 0, 0)
  );

  // Noise grain for depth
  nova64.draw.drawNoise(0, 0, 640, 360, 12, Math.floor(startScreenTime * 10));

  // Corner starbursts
  const cornerPulse = Math.sin(startScreenTime * 2) * 0.5 + 0.5;
  nova64.draw.drawStarburst(
    28,
    28,
    18,
    8,
    6,
    nova64.draw.rgba8(100, 200, 255, Math.floor(cornerPulse * 210)),
    true
  );
  nova64.draw.drawStarburst(
    612,
    28,
    18,
    8,
    6,
    nova64.draw.rgba8(100, 200, 255, Math.floor(cornerPulse * 210)),
    true
  );
  nova64.draw.drawStarburst(
    28,
    332,
    13,
    5,
    5,
    nova64.draw.rgba8(60, 150, 255, Math.floor(cornerPulse * 160)),
    true
  );
  nova64.draw.drawStarburst(
    612,
    332,
    13,
    5,
    5,
    nova64.draw.rgba8(60, 150, 255, Math.floor(cornerPulse * 160)),
    true
  );

  // Animated holographic title
  const hueShift = (startScreenTime * 50) % 360;
  const hologramColor = hslToRgba8(hueShift, 80, 70, 255);
  const float = Math.sin(startScreenTime * 2) * 10;

  nova64.draw.drawGlowTextCentered(
    'CRYSTAL',
    320,
    48 + float,
    hologramColor,
    nova64.draw.rgba8(0, 80, 200, 180),
    2
  );
  nova64.draw.drawGlowTextCentered(
    'CATHEDRAL',
    320,
    100 + float,
    nova64.draw.rgba8(100, 220, 255, 255),
    nova64.draw.rgba8(0, 40, 120, 160),
    2
  );

  // Holographic subtitle
  nova64.ui.setFont('large');
  nova64.ui.setTextAlign('center');
  const pulse = Math.sin(startScreenTime * 4) * 0.2 + 0.8;
  nova64.ui.drawText(
    '◆ Ultimate Graphics Showcase ◆',
    320,
    162,
    nova64.draw.rgba8(150, 220, 255, Math.floor(pulse * 255)),
    1
  );

  // Info panel with holographic border
  const panel = nova64.ui.createPanel(nova64.ui.centerX(480), 208, 480, 118, {
    bgColor: nova64.draw.rgba8(10, 25, 50, 210),
    borderColor: nova64.draw.rgba8(70, 150, 255, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: nova64.draw.rgba8(20, 40, 80, 210),
  });
  nova64.draw.drawPanel(panel);

  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawText('ADVANCED FEATURES', 320, 225, nova64.draw.rgba8(100, 200, 255, 255), 1);

  nova64.ui.setFont('small');
  nova64.ui.drawText('◆ Holographic Materials & Dynamic Lighting', 320, 247, uiColors.light, 1);
  nova64.ui.drawText('◆ Motion Blur, Bloom & Atmospheric Effects', 320, 262, uiColors.light, 1);
  nova64.ui.drawText('◆ 12 Sacred Pillars + Floating Crystal Array', 320, 277, uiColors.light, 1);
  nova64.ui.drawText('◆ Nintendo 64 / PlayStation Retro Aesthetics', 320, 292, uiColors.light, 1);

  nova64.ui.setFont('tiny');
  nova64.ui.drawText(
    'Camera orbits automatically - Pure visual experience',
    320,
    310,
    uiColors.secondary,
    1
  );

  // Draw buttons
  nova64.ui.drawAllButtons();

  // Pulsing crystal prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 5) * 0.5 + 0.5) * 255);
  nova64.ui.setFont('normal');
  nova64.ui.drawText(
    '◆ WITNESS THE ULTIMATE 3D GRAPHICS ◆',
    320,
    430,
    nova64.draw.rgba8(100, 200, 255, alpha),
    1
  );

  // Tech info
  nova64.ui.setFont('tiny');
  nova64.ui.drawText(
    'Powered by Three.js + WebGL 2.0',
    320,
    340,
    nova64.draw.rgba8(120, 160, 200, 150),
    1
  );

  // CRT scanlines for retro feel
  nova64.draw.drawScanlines(40, 2);
}

// Helper to convert HSL to rgba8
function hslToRgba8(h, s, l, a) {
  const c = ((1 - Math.abs((2 * l) / 100 - 1)) * s) / 100;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l / 100 - c / 2;

  let r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return nova64.draw.rgba8(
    Math.floor((r + m) * 255),
    Math.floor((g + m) * 255),
    Math.floor((b + m) * 255),
    a
  );
}
