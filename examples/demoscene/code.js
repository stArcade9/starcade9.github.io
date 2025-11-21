// 🎬 NOVA64 DEMOSCENE - TRON ODYSSEY
// An epic visual journey through a neon digital realm
// Showcasing: Bloom, Post-Processing, Particles, Shaders, and Dynamic Effects

/* eslint-disable no-undef */
// Nova64 runtime provides these globals: enableBloom, enableFXAA, setBloomStrength, etc.

let gameTime = 0;
let sceneTime = 0;
let currentScene = 0;
let transitioning = false;
let transitionProgress = 0;

// Scene objects
let gridFloor = null;
let tunnelSegments = [];
let dataStreams = [];
let pulseRings = [];
let lightCycles = [];
let digitalTowers = [];
let particleSystems = [];
let energyFields = [];

// Camera control
let camera = { 
  x: 0, y: 15, z: 35,
  targetX: 0, targetY: 0, targetZ: 0,
  fov: 75,
  roll: 0
};

// State management
let gameState = 'start';
let startScreenTime = 0;

// Scene definitions
const SCENES = [
  { name: 'GRID AWAKENING', duration: 8, color: 0x00ffff },
  { name: 'DATA TUNNEL', duration: 10, color: 0xff00ff },
  { name: 'DIGITAL CITY', duration: 12, color: 0xffff00 },
  { name: 'ENERGY CORE', duration: 10, color: 0xff0099 },
  { name: 'THE VOID', duration: 8, color: 0x0099ff }
];

// Color palettes for each scene
const COLORS = {
  neonCyan: 0x00ffff,
  neonMagenta: 0xff00ff,
  neonYellow: 0xffff00,
  neonPink: 0xff0099,
  neonGreen: 0x00ff99,
  neonOrange: 0xff6600,
  electric: 0x0099ff,
  pulse: 0xffffff
};

export async function init() {
  console.log('========================================');
  console.log('🎬 NOVA64 DEMOSCENE - TRON ODYSSEY INIT');
  console.log('========================================');
  console.log('Initial gameState:', gameState);
  
  // Initial camera setup
  setCameraPosition(camera.x, camera.y, camera.z);
  setCameraTarget(0, 0, 0);
  setCameraFOV(camera.fov);
  
  // Enable post-processing effects with BALANCED settings
  console.log('🎨 Enabling post-processing effects...');
  const bloomEnabled = enableBloom(1.2, 0.6, 0.3); // Balanced bloom: visible glow without washing out
  console.log('✨ Bloom enabled:', bloomEnabled);
  enableFXAA(); // Smooth edges
  console.log('✨ FXAA enabled');
  
  // Verify effects are enabled
  if (typeof isEffectsEnabled === 'function') {
    console.log('✅ Effects system active:', isEffectsEnabled());
  }
  
  // Additional effects if available
  try {
    if (typeof enableChromaticAberration !== 'undefined') {
      enableChromaticAberration(0.003);
    }
    if (typeof enableVignette !== 'undefined') {
      enableVignette(0.4);
    }
  } catch (e) {
    console.log('Advanced effects not available, continuing...');
  }
  
  // Scene lighting - Balanced for visibility with neon contrast
  setLightDirection(-0.5, -0.8, -0.3);
  setAmbientLight(0x1a1a2a); // Darker but not pitch black - you can see objects
  
  // Dark fog for TRON aesthetic
  setFog(0x000020, 30, 150);
  
  // Build initial scene
  await buildStartScene();
  
  // Initialize start screen
  initStartScreen();
  
  console.log('✨ Demoscene initialized - Ready to journey!');
}

function initStartScreen() {
  // Clear any existing buttons first
  clearButtons();
  
  console.log('🎬 Initializing start screen buttons...');
  
  // Main start button - extra large and flashy
  const startBtn = createButton(centerX(280), 180, 280, 70, '▶ BEGIN ODYSSEY ▶', () => {
    console.log('🚀🚀🚀 START BUTTON CLICKED! 🚀🚀🚀');
    console.log('Setting gameState from', gameState, 'to playing');
    gameState = 'playing';
    currentScene = 0;
    sceneTime = 0;
    console.log('gameState is now:', gameState);
  }, {
    normalColor: rgba8(0, 255, 255, 255),
    hoverColor: rgba8(100, 255, 255, 255),
    pressedColor: rgba8(0, 200, 200, 255)
  });
  
  console.log('✅ Start button created:', startBtn);
  
  // Info button
  const infoBtn = createButton(centerX(240), 270, 240, 50, '💡 ABOUT DEMO', () => {
    console.log('ℹ️ ABOUT BUTTON CLICKED!');
    console.log('TRON ODYSSEY - A visual showcase of Nova64 capabilities');
    console.log('Features: Bloom, Particles, Shaders, Dynamic Scenes');
  }, {
    normalColor: rgba8(255, 0, 255, 255),
    hoverColor: rgba8(255, 100, 255, 255),
    pressedColor: rgba8(200, 0, 200, 255)
  });
  
  console.log('✅ Info button created:', infoBtn);
  console.log('🎬 Start screen initialization complete');
}

async function buildStartScene() {
  // Create a VIBRANT neon intro scene
  // Glowing grid floor - subtle base glow
  const gridSize = 80;
  gridFloor = createAdvancedCube(gridSize, {
    color: COLORS.neonCyan,
    emissive: COLORS.neonCyan,
    emissiveIntensity: 0.3, // Reduced from 0.8 - subtle foundation
    flatShading: true
  }, [0, -0.5, 0]);
  setScale(gridFloor, 1, 0.01, 1); // Make it flat
  
  // Grid lines with moderate emissive glow
  for (let i = -40; i <= 40; i += 5) {
    // Horizontal - alternating cyan and magenta
    const hColor = i % 10 === 0 ? COLORS.neonCyan : COLORS.electric;
    const hLine = createAdvancedCube(1, {
      color: hColor,
      emissive: hColor,
      emissiveIntensity: 0.6, // Reduced from 1.2
      flatShading: true
    }, [0, 0.1, i]);
    setScale(hLine, gridSize, 0.15, 0.3);
    tunnelSegments.push(hLine);
    
    // Vertical - alternating colors
    const vColor = i % 10 === 0 ? COLORS.neonMagenta : COLORS.neonPink;
    const vLine = createAdvancedCube(1, {
      color: vColor,
      emissive: vColor,
      emissiveIntensity: 0.6, // Reduced from 1.2
      flatShading: true
    }, [i, 0.1, 0]);
    setScale(vLine, 0.3, 0.15, gridSize);
    tunnelSegments.push(vLine);
  }
  
  // Floating GLOWING crystalline structures - much brighter
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 25;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const size = 2 + Math.random() * 3;
    
    // Rainbow of colors for crystals
    const crystalColors = [COLORS.neonCyan, COLORS.neonMagenta, COLORS.neonYellow, COLORS.neonPink, COLORS.neonGreen];
    const crystalColor = crystalColors[i % crystalColors.length];
    
    const crystal = createAdvancedCube(size, {
      color: crystalColor,
      emissive: crystalColor,
      emissiveIntensity: 0.8, // Reduced from 1.5 - bright but not blinding
      flatShading: true
    }, [x, size, z]);
    setRotation(crystal, Math.PI/4, angle, Math.PI/6);
    digitalTowers.push({ mesh: crystal, x, z, angle, rotSpeed: 0.5 + Math.random() });
  }
  
  // Particle system
  await createParticleField();
}

async function createParticleField() {
  // Ambient floating particles - BRIGHT and GLOWING
  for (let i = 0; i < 150; i++) { // More particles!
    const x = (Math.random() - 0.5) * 100;
    const y = Math.random() * 30;
    const z = (Math.random() - 0.5) * 100;
    
    const colors = [COLORS.neonCyan, COLORS.neonMagenta, COLORS.neonYellow, COLORS.neonPink, COLORS.neonGreen, COLORS.neonOrange];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const particle = createSphere(0.3, color, [x, y, z], 6, {
      emissive: color,
      emissiveIntensity: 0.7 // Reduced from 2.0 - visible sparkle without blinding
    });
    
    particleSystems.push({
      mesh: particle,
      x, y, z,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 0.5,
      vz: (Math.random() - 0.5) * 2,
      life: 100,
      color
    });
  }
}

export function update(dt) {
  gameTime += dt;
  
  // Start screen state
  if (gameState === 'start') {
    startScreenTime += dt;
    
    // Update buttons - this handles mouse clicks
    const clicked = updateAllButtons();
    if (clicked) {
      console.log('🖱️ A button was clicked!');
      // Extra safety: force state change if button was clicked but callback didn't fire
      if (gameState === 'start') {
        console.log('💡 Button clicked but state not changed, forcing...');
        gameState = 'playing';
        currentScene = 0;
        sceneTime = 0;
      }
    }
    
    // KEYBOARD SUPPORT: Press SPACE or ENTER to start (use isKeyDown for continuous detection)
    if (isKeyDown('Space') || isKeyDown('Enter')) {
      console.log('⌨️ Keyboard pressed! Starting demoscene journey...');
      gameState = 'playing';
      currentScene = 0;
      sceneTime = 0;
      clearButtons(); // Clear buttons when starting
    }
    
    // Animated camera orbit on start screen
    const radius = 40;
    camera.x = Math.cos(startScreenTime * 0.3) * radius;
    camera.z = Math.sin(startScreenTime * 0.3) * radius;
    camera.y = 20 + Math.sin(startScreenTime * 0.5) * 5;
    
    setCameraPosition(camera.x, camera.y, camera.z);
    setCameraTarget(0, 5, 0);
    
    // Animate start scene objects
    updateStartSceneAnimation(dt);
    updateParticles(dt);
    
    return;
  }
  
  // Main demo progression
  sceneTime += dt;
  
  // Check for scene transition
  if (sceneTime >= SCENES[currentScene].duration && !transitioning) {
    if (currentScene < SCENES.length - 1) {
      startSceneTransition();
    } else {
      // End of demo - loop back
      currentScene = 0;
      sceneTime = 0;
      transitionToNextScene();
    }
  }
  
  // Handle transitions
  if (transitioning) {
    transitionProgress += dt * 0.5; // 2 second transitions
    if (transitionProgress >= 1.0) {
      transitioning = false;
      transitionProgress = 0;
      transitionToNextScene();
    }
  }
  
  // Update current scene
  updateCurrentScene(dt);
  updateCamera(dt);
  updateParticles(dt);
}

function updateStartSceneAnimation(dt) {
  // Rotate crystals
  digitalTowers.forEach(tower => {
    tower.angle += tower.rotSpeed * dt;
    setRotation(tower.mesh, Math.PI/4 + Math.sin(gameTime * 2) * 0.2, tower.angle, Math.PI/6);
  });
}

function updateCurrentScene(dt) {
  const progress = sceneTime / SCENES[currentScene].duration;
  
  switch(currentScene) {
    case 0: // GRID AWAKENING
      updateGridAwakening(dt, progress);
      break;
    case 1: // DATA TUNNEL
      updateDataTunnel(dt, progress);
      break;
    case 2: // DIGITAL CITY
      updateDigitalCity(dt, progress);
      break;
    case 3: // ENERGY CORE
      updateEnergyCore(dt, progress);
      break;
    case 4: // THE VOID
      updateTheVoid(dt, progress);
      break;
  }
}

// Scene 0: GRID AWAKENING
function updateGridAwakening(dt, progress) {
  // Rotate floating crystals
  digitalTowers.forEach((tower, i) => {
    const heightOffset = Math.sin(gameTime * 2 + i) * 3;
    const rotSpeed = 1 + Math.sin(gameTime + i) * 0.5;
    tower.angle += rotSpeed * dt;
    
    setPosition(tower.mesh, tower.x, 4 + heightOffset, tower.z);
    setRotation(tower.mesh, gameTime * 0.5, tower.angle, gameTime * 0.3);
  });
  
  // Spawn pulse rings periodically
  if (Math.floor(gameTime * 2) !== Math.floor((gameTime - dt) * 2)) {
    createPulseRing();
  }
  
  // Update pulse rings
  updatePulseRings(dt);
  
  // Camera movement - rising up
  camera.y = 15 + progress * 10;
  camera.z = 35 - progress * 15;
}

// Scene 1: DATA TUNNEL
function updateDataTunnel(dt, progress) {
  // Create tunnel segments on the fly
  if (tunnelSegments.length < 50 && Math.random() < 0.3) {
    createTunnelSegment();
  }
  
  // Move tunnel segments
  for (let i = tunnelSegments.length - 1; i >= 0; i--) {
    const seg = tunnelSegments[i];
    if (seg.z) {
      seg.z += 20 * dt;
      setPosition(seg.mesh, seg.x || 0, seg.y || 0, seg.z);
      
      // Remove if behind camera
      if (seg.z > 50) {
        destroyMesh(seg.mesh);
        tunnelSegments.splice(i, 1);
      }
    }
  }
  
  // Create data streams
  if (dataStreams.length < 30 && Math.random() < 0.2) {
    createDataStream();
  }
  
  // Update data streams
  updateDataStreams(dt);
  
  // Camera - flying forward through tunnel
  camera.z = 35 - progress * 50;
  camera.y = 10 + Math.sin(progress * Math.PI * 4) * 3;
  camera.roll = Math.sin(progress * Math.PI * 2) * 0.2;
}

// Scene 2: DIGITAL CITY
function updateDigitalCity(dt, progress) {
  // Build city towers as we go
  if (digitalTowers.length < 40 && Math.random() < 0.1) {
    createDigitalTower();
  }
  
  // Animate towers with pulsing effect
  digitalTowers.forEach(tower => {
    if (tower.pulsePhase !== undefined) {
      tower.pulsePhase += dt * 3;
      const scale = 1 + Math.sin(tower.pulsePhase) * 0.15;
      const width = tower.width || 3;
      const height = tower.height || 15;
      setScale(tower.mesh, width * scale, height * scale, width * scale);
    }
  });
  
  // Spawn light cycles
  if (lightCycles.length < 6 && Math.random() < 0.1) {
    createLightCycle();
  }
  
  // Update light cycles
  updateLightCycles(dt);
  
  // Camera - orbiting the city
  const orbitRadius = 40 + Math.sin(progress * Math.PI) * 15;
  const orbitAngle = progress * Math.PI * 2;
  camera.x = Math.cos(orbitAngle) * orbitRadius;
  camera.z = Math.sin(orbitAngle) * orbitRadius;
  camera.y = 20 + Math.sin(progress * Math.PI * 4) * 5;
}

// Scene 3: ENERGY CORE
function updateEnergyCore(dt, progress) {
  // Create energy fields
  if (energyFields.length < 20 && Math.random() < 0.15) {
    createEnergyField();
  }
  
  // Rotate and pulse energy fields
  energyFields.forEach(field => {
    field.rotation += field.rotSpeed * dt;
    field.pulsePhase += dt * 4;
    
    const scale = 1 + Math.sin(field.pulsePhase) * 0.3;
    setScale(field.mesh, scale, scale, scale);
    setRotation(field.mesh, field.rotation, field.rotation * 1.5, field.rotation * 0.5);
  });
  
  // Camera - spiraling into the core
  const spiralRadius = 30 - progress * 20;
  const spiralHeight = 20 - progress * 15;
  const spiralAngle = progress * Math.PI * 6;
  
  camera.x = Math.cos(spiralAngle) * spiralRadius;
  camera.z = Math.sin(spiralAngle) * spiralRadius;
  camera.y = spiralHeight;
  
  // Increase bloom intensity for energy core climax
  setBloomStrength(1.2 + progress * 1.0); // Goes from 1.2 to 2.2 - dramatic but visible
}

// Scene 4: THE VOID
function updateTheVoid(dt, progress) {
  // Fade to darkness
  const fogFar = 120 - progress * 100;
  setFog(0x000000, 10, Math.max(20, fogFar));
  
  // Create final particle explosion
  if (progress > 0.5 && Math.random() < 0.5) {
    createExplosionParticle();
  }
  
  // Camera - pulling back dramatically
  camera.z = -20 + progress * 60;
  camera.y = 5 + progress * 30;
  
  // Gradually reduce bloom as we fade to void
  setBloomStrength(1.2 - progress * 1.0); // Fades from 1.2 to 0.2
}

// Helper functions for creating scene elements
function createPulseRing() {
  const ringColors = [COLORS.neonCyan, COLORS.neonMagenta, COLORS.neonYellow];
  const color = ringColors[Math.floor(Math.random() * ringColors.length)];
  
  const ring = createSphere(1, color, [0, 0.2, 0], 8, {
    emissive: color,
    emissiveIntensity: 1.0 // Reduced from 2.5 - noticeable pulse without washing out
  });
  pulseRings.push({
    mesh: ring,
    scale: 1,
    life: 2,
    maxLife: 2,
    color
  });
}

function updatePulseRings(dt) {
  for (let i = pulseRings.length - 1; i >= 0; i--) {
    const ring = pulseRings[i];
    ring.life -= dt;
    ring.scale += dt * 15;
    
    setScale(ring.mesh, ring.scale, 0.1, ring.scale);
    
    if (ring.life <= 0) {
      destroyMesh(ring.mesh);
      pulseRings.splice(i, 1);
    }
  }
}

function createTunnelSegment() {
  const z = -50 - Math.random() * 20;
  const segments = 8;
  const tunnelColors = [COLORS.neonCyan, COLORS.neonMagenta, COLORS.neonYellow, COLORS.neonPink];
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const radius = 15;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    const color = tunnelColors[i % tunnelColors.length];
    const seg = createAdvancedCube(1, {
      color: color,
      emissive: color,
      emissiveIntensity: 0.8, // Reduced from 1.5
      flatShading: true
    }, [x, y, z]);
    setScale(seg, 1, 1, 2);
    
    tunnelSegments.push({
      mesh: seg,
      x, y, z
    });
  }
}

function createDataStream() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 5;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  
  const colors = [COLORS.neonCyan, COLORS.neonMagenta, COLORS.neonYellow, COLORS.neonGreen, COLORS.neonOrange];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const stream = createAdvancedCube(1, {
    color: color,
    emissive: color,
    emissiveIntensity: 0.9, // Reduced from 1.8
    flatShading: true
  }, [x, y, -60]);
  setScale(stream, 0.4, 0.4, 4);
  
  dataStreams.push({
    mesh: stream,
    x, y, z: -60,
    speed: 30 + Math.random() * 20,
    color
  });
}

function updateDataStreams(dt) {
  for (let i = dataStreams.length - 1; i >= 0; i--) {
    const stream = dataStreams[i];
    stream.z += stream.speed * dt;
    setPosition(stream.mesh, stream.x, stream.y, stream.z);
    
    if (stream.z > 50) {
      destroyMesh(stream.mesh);
      dataStreams.splice(i, 1);
    }
  }
}

function createDigitalTower() {
  const x = (Math.random() - 0.5) * 80;
  const z = (Math.random() - 0.5) * 80;
  
  // Avoid center
  if (Math.abs(x) < 15 && Math.abs(z) < 15) return;
  
  const width = 2 + Math.random() * 3;
  const height = 10 + Math.random() * 20;
  
  const colors = [COLORS.neonCyan, COLORS.neonMagenta, COLORS.neonYellow, COLORS.neonPink, COLORS.neonGreen, COLORS.neonOrange];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const tower = createAdvancedCube(1, {
    color: color,
    emissive: color,
    emissiveIntensity: 0.7, // Reduced from 1.3
    flatShading: true
  }, [x, height / 2, z]);
  setScale(tower, width, height, width);
  
  digitalTowers.push({
    mesh: tower,
    x, z,
    height,
    width,
    baseScale: 1,
    pulsePhase: Math.random() * Math.PI * 2,
    color
  });
}

function createLightCycle() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 30;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  
  const cycleColors = [COLORS.neonCyan, COLORS.neonMagenta, COLORS.neonYellow, COLORS.neonOrange];
  const bodyColor = cycleColors[Math.floor(Math.random() * cycleColors.length)];
  const trailColor = bodyColor; // Matching trail
  
  const body = createAdvancedCube(1, {
    color: bodyColor,
    emissive: bodyColor,
    emissiveIntensity: 0.8, // Reduced from 1.5
    flatShading: true
  }, [x, 1, z]);
  setScale(body, 2, 0.5, 1);
  
  const trail = createAdvancedCube(1, {
    color: trailColor,
    emissive: trailColor,
    emissiveIntensity: 0.6, // Reduced from 1.2
    flatShading: true
  }, [x, 1, z]);
  setScale(trail, 0.5, 0.5, 8);
  
  lightCycles.push({
    body,
    trail,
    x, z,
    angle,
    speed: 2 + Math.random(),
    color: bodyColor
  });
}

function updateLightCycles(dt) {
  lightCycles.forEach(cycle => {
    cycle.angle += cycle.speed * dt;
    
    const radius = 30;
    cycle.x = Math.cos(cycle.angle) * radius;
    cycle.z = Math.sin(cycle.angle) * radius;
    
    setPosition(cycle.body, cycle.x, 1, cycle.z);
    setRotation(cycle.body, 0, cycle.angle + Math.PI / 2, 0);
    
    const trailX = cycle.x - Math.cos(cycle.angle + Math.PI / 2) * 4;
    const trailZ = cycle.z - Math.sin(cycle.angle + Math.PI / 2) * 4;
    setPosition(cycle.trail, trailX, 1, trailZ);
    setRotation(cycle.trail, 0, cycle.angle + Math.PI / 2, 0);
  });
}

function createEnergyField() {
  const x = (Math.random() - 0.5) * 20;
  const y = (Math.random() - 0.5) * 20;
  const z = (Math.random() - 0.5) * 20;
  
  const size = 1 + Math.random() * 2;
  const colors = [COLORS.neonMagenta, COLORS.neonYellow, COLORS.neonPink, COLORS.neonCyan, COLORS.neonGreen];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const field = createSphere(size, color, [x, y, z], 10, {
    emissive: color,
    emissiveIntensity: 1.0 // Reduced from 2.0 - bright but not blinding
  });
  
  energyFields.push({
    mesh: field,
    rotation: 0,
    rotSpeed: 0.5 + Math.random(),
    pulsePhase: Math.random() * Math.PI * 2,
    color
  });
}

function createExplosionParticle() {
  const x = (Math.random() - 0.5) * 40;
  const y = (Math.random() - 0.5) * 40;
  const z = (Math.random() - 0.5) * 40;
  
  const colors = Object.values(COLORS);
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const particle = createSphere(0.5, color, [x, y, z], 6, {
    emissive: color,
    emissiveIntensity: 1.2 // Reduced from 2.5 - bright explosion without washing out
  });
  
  particleSystems.push({
    mesh: particle,
    x, y, z,
    vx: (Math.random() - 0.5) * 20,
    vy: (Math.random() - 0.5) * 20,
    vz: (Math.random() - 0.5) * 20,
    life: 3,
    color
  });
}

function updateParticles(dt) {
  for (let i = particleSystems.length - 1; i >= 0; i--) {
    const particle = particleSystems[i];
    
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.z += particle.vz * dt;
    
    // Slight gravity
    particle.vy -= dt * 2;
    
    particle.life -= dt;
    
    setPosition(particle.mesh, particle.x, particle.y, particle.z);
    
    // Fade out
    const scale = Math.max(0, particle.life / 3);
    setScale(particle.mesh, scale, scale, scale);
    
    if (particle.life <= 0 || scale <= 0) {
      destroyMesh(particle.mesh);
      particleSystems.splice(i, 1);
    }
  }
}

function updateCamera(_dt) {
  setCameraPosition(camera.x, camera.y, camera.z);
  setCameraTarget(camera.targetX, camera.targetY, camera.targetZ);
  
  // Apply camera roll if needed
  if (Math.abs(camera.roll) > 0.01) {
    // Roll effect would be applied here if supported
  }
}

function startSceneTransition() {
  transitioning = true;
  transitionProgress = 0;
  console.log(`🎬 Transitioning to: ${SCENES[currentScene + 1].name}`);
}

function transitionToNextScene() {
  // Clean up previous scene objects
  cleanupScene();
  
  // Move to next scene
  currentScene++;
  if (currentScene >= SCENES.length) {
    currentScene = 0;
  }
  
  sceneTime = 0;
  
  // Setup new scene
  setupScene(currentScene);
  
  console.log(`✨ Now showing: ${SCENES[currentScene].name}`);
}

function cleanupScene() {
  // Remove all dynamic objects (keep start scene for now)
  dataStreams.forEach(s => destroyMesh(s.mesh));
  dataStreams = [];
  
  pulseRings.forEach(r => destroyMesh(r.mesh));
  pulseRings = [];
  
  lightCycles.forEach(c => {
    destroyMesh(c.body);
    destroyMesh(c.trail);
  });
  lightCycles = [];
  
  energyFields.forEach(f => destroyMesh(f.mesh));
  energyFields = [];
}

function setupScene(_sceneIndex) {
  // Set theme lighting based on scene - balanced darkness
  setFog(0x000020, 30, 150);
  setBloomStrength(1.2); // Balanced bloom setting
  
  // Reset camera for new scene
  camera.roll = 0;
  camera.fov = 75;
  setCameraFOV(camera.fov);
}

let drawCallCount = 0;

export function draw() {
  // Log first few draw calls to verify it's working
  if (drawCallCount < 3) {
    console.log(`✏️ draw() called, gameState: ${gameState}, drawCallCount: ${drawCallCount}`);
    drawCallCount++;
  }
  
  // Start screen
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // Demo HUD
  drawDemoHUD();
}

function drawStartScreen() {
  // Dark gradient overlay
  drawGradientRect(0, 0, 640, 360,
    rgba8(0, 10, 20, 220),
    rgba8(20, 0, 40, 240),
    true
  );
  
  // Animated title
  const pulse = Math.sin(startScreenTime * 3) * 0.3 + 0.7;
  const bounce = Math.sin(startScreenTime * 2) * 8;
  
  setFont('huge');
  setTextAlign('center');
  
  // Title with color shift
  const r = Math.floor(128 + Math.sin(startScreenTime * 2) * 127);
  const g = Math.floor(128 + Math.sin(startScreenTime * 2 + 2) * 127);
  const b = Math.floor(128 + Math.sin(startScreenTime * 2 + 4) * 127);
  
  drawTextShadow('NOVA64', 320, 50 + bounce, rgba8(r, g, b, 255), rgba8(0, 0, 0, 255), 6, 1);
  
  setFont('large');
  const cyan = rgba8(0, 255, 255, Math.floor(pulse * 255));
  drawTextOutline('DEMOSCENE', 320, 110, cyan, rgba8(0, 0, 0, 255), 2);
  
  // Subtitle
  setFont('normal');
  const magenta = rgba8(255, 0, 255, 255);
  drawText('▶ TRON ODYSSEY ◀', 320, 145, magenta, 1);
  
  // Info panel
  const panel = createPanel(centerX(500), 210, 500, 200, {
    bgColor: rgba8(10, 0, 20, 200),
    borderColor: rgba8(0, 255, 255, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(20, 0, 40, 200)
  });
  drawPanel(panel);
  
  setFont('small');
  setTextAlign('center');
  drawText('A VISUAL SHOWCASE OF NOVA64 CAPABILITIES', 320, 225, uiColors.warning, 1);
  drawText('', 320, 240, uiColors.light, 1);
  drawText('✨ BLOOM & POST-PROCESSING EFFECTS', 320, 255, uiColors.light, 1);
  drawText('🎨 DYNAMIC SHADER MATERIALS', 320, 270, uiColors.light, 1);
  drawText('💫 GPU-ACCELERATED PARTICLES', 320, 285, uiColors.light, 1);
  drawText('🎬 CINEMATIC CAMERA CHOREOGRAPHY', 320, 300, uiColors.light, 1);
  drawText('🌈 PROCEDURAL NEON GEOMETRY', 320, 315, uiColors.light, 1);
  
  setFont('tiny');
  drawText('Journey through 5 unique scenes showcasing the engine', 320, 335, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 5) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('▶ PRESS BEGIN OR SPACEBAR TO START ◀', 320, 375, rgba8(0, 255, 255, alpha), 1);
  
  // Credits
  setFont('tiny');
  drawText('CONTROLS: CLICK BUTTON OR PRESS SPACE/ENTER', 320, 395, rgba8(150, 150, 200, 200), 1);
  drawText('NOVA64 - THE ULTIMATE FANTASY CONSOLE', 320, 410, rgba8(100, 100, 150, 180), 1);
}

function drawDemoHUD() {
  // Minimal HUD during demo
  const scene = SCENES[currentScene];
  const progress = (sceneTime / scene.duration) * 100;
  
  // Scene info panel - top left
  const panelWidth = 280;
  rect(16, 16, panelWidth, 90, rgba8(0, 0, 20, 200), true);
  rect(16, 16, panelWidth, 90, scene.color, false);
  
  setFont('normal');
  setTextAlign('left');
  print('🎬 DEMOSCENE', 24, 24, rgba8(255, 255, 255, 255));
  
  setFont('small');
  print(`Scene ${currentScene + 1}/${SCENES.length}: ${scene.name}`, 24, 45, rgba8(200, 200, 255, 255));
  
  // Progress bar
  const barWidth = panelWidth - 16;
  const barFill = (progress / 100) * barWidth;
  
  rect(24, 62, barWidth, 8, rgba8(40, 40, 60, 200), true);
  rect(24, 62, barFill, 8, scene.color, true);
  rect(24, 62, barWidth, 8, rgba8(255, 255, 255, 100), false);
  
  setFont('tiny');
  print(`${progress.toFixed(1)}%`, 24, 78, rgba8(150, 150, 200, 255));
  print(`Time: ${sceneTime.toFixed(1)}s / ${scene.duration}s`, 24, 90, rgba8(150, 150, 200, 255));
  
  // Effect status - top right
  const statsX = 640 - 200;
  rect(statsX - 16, 16, 200, 65, rgba8(0, 0, 20, 200), true);
  rect(statsX - 16, 16, 200, 65, rgba8(255, 0, 255, 255), false);
  
  setFont('tiny');
  setTextAlign('left');
  print('EFFECTS ACTIVE:', statsX - 8, 24, rgba8(255, 255, 255, 255));
  print('✓ BLOOM', statsX - 8, 37, rgba8(0, 255, 0, 255));
  print('✓ FXAA', statsX - 8, 48, rgba8(0, 255, 0, 255));
  print('✓ PARTICLES', statsX - 8, 59, rgba8(0, 255, 0, 255));
  print('✓ FOG', statsX - 8, 70, rgba8(0, 255, 0, 255));
  
  // Scene description - bottom
  rect(16, 360 - 45, 640 - 32, 30, rgba8(0, 0, 20, 220), true);
  
  setFont('small');
  setTextAlign('center');
  const desc = getSceneDescription(currentScene);
  print(desc, 320, 360 - 35, rgba8(255, 255, 100, 255));
  
  // Nova64 watermark
  setFont('tiny');
  print('NOVA64 - POWERED BY THREE.JS', 320, 360 - 20, rgba8(100, 100, 150, 200));
  
  // Transition overlay
  if (transitioning) {
    const alpha = Math.floor(Math.sin(transitionProgress * Math.PI) * 200);
    rect(0, 0, 640, 360, rgba8(0, 0, 0, alpha), true);
    
    if (transitionProgress > 0.4 && transitionProgress < 0.6) {
      setFont('large');
      setTextAlign('center');
      const nextScene = SCENES[currentScene + 1] || SCENES[0];
      drawTextShadow(nextScene.name, 320, 180, rgba8(255, 255, 255, 255), rgba8(0, 0, 0, 255), 4, 1);
    }
  }
}

function getSceneDescription(sceneIndex) {
  const descriptions = [
    'Grid awakening - The digital realm comes to life with pulsing energy',
    'Data tunnel - Racing through streams of information at lightspeed',
    'Digital city - Towering structures of pure light and geometry',
    'Energy core - Spiraling into the heart of the system',
    'The void - Journey\'s end, returning to infinite darkness'
  ];
  return descriptions[sceneIndex] || '';
}

// Utility functions
function centerX(width) {
  return (640 - width) / 2;
}
