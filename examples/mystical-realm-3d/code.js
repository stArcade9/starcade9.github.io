// MYSTICAL REALM 3D - Creative Nintendo 64/PlayStation style fantasy world
// Showcases advanced 3D features: dynamic lighting, particle systems, procedural generation

// Game state management
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
let startScreenTime = 0;
let uiButtons = [];
let score = 0;
let crystalsCollected = 0;
let playTime = 0;

let world = {
  terrain: [],
  crystals: [],
  particles: [],
  creatures: [],
  weather: { type: 'clear', intensity: 0 }
};

let player = {
  x: 0, y: 5, z: 0,
  rotation: 0,
  speed: 8,
  jumpVelocity: 0,
  onGround: false,
  health: 100,
  maxHealth: 100
};

let camera = {
  offset: { x: 0, y: 12, z: 20 },
  target: { x: 0, y: 0, z: 0 },
  shake: 0
};

let time = 0;
let dayNightCycle = 0;
let lightningTimer = 0;

export async function init() {
  cls();
  
  console.log('🏰 Initializing Mystical Realm 3D...');
  
  // Setup camera
  setCameraPosition(camera.offset.x, camera.offset.y, camera.offset.z);
  setCameraTarget(0, 0, 0);
  setCameraFOV(65);
  
  // Enable all retro effects for maximum N64/PSX nostalgia
  enablePixelation(1);
  enableDithering(true);
  enableBloom(true);
  
  // Generate the mystical world
  await generateTerrain();
  await spawnCrystals();
  await createCreatures();
  
  // Set initial lighting
  updateLighting();
  
  // Initialize start screen
  initStartScreen();
  
  console.log('✨ Mystical Realm 3D loaded! Explore the fantasy world!');
}

function initStartScreen() {
  uiButtons = [];
  
  // START button
  uiButtons.push(
    createButton(centerX(220), 150, 220, 55, '▶ BEGIN QUEST', () => {
      console.log('🎯 BEGIN QUEST CLICKED! Changing gameState to playing...');
      gameState = 'playing';
      playTime = 0;
      score = 0;
      crystalsCollected = 0;
      console.log('✅ gameState is now:', gameState);
      console.log('🏰 Quest begun!');
    }, {
      normalColor: rgba8(100, 50, 200, 255),
      hoverColor: rgba8(130, 70, 230, 255),
      pressedColor: rgba8(70, 30, 160, 255)
    })
  );
  
  // CONTROLS button
  uiButtons.push(
    createButton(centerX(220), 290, 220, 45, '? CONTROLS', () => {
      console.log('🎮 WASD/Arrows = Move, SPACE = Jump, Collect crystals!');
    }, {
      normalColor: uiColors.primary,
      hoverColor: rgba8(50, 150, 255, 255),
      pressedColor: rgba8(20, 100, 200, 255)
    })
  );
}

async function generateTerrain() {
  console.log('🌍 Generating mystical terrain...');
  
  // Create main ground plane with texture-like pattern
  const mainGround = createPlane(100, 100, 0x2a4a2a, [0, 0, 0]);
  setRotation(mainGround, -Math.PI/2, 0, 0);
  world.terrain.push({ mesh: mainGround, type: 'ground' });
  
  // Generate procedural hills and mountains
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    const height = 3 + Math.random() * 8;
    const width = 4 + Math.random() * 6;
    
    const hill = createCube(width, height, width, 0x3a5a3a, [x, height/2, z]);
    world.terrain.push({ 
      mesh: hill, 
      type: 'hill',
      originalY: height/2,
      bobPhase: Math.random() * Math.PI * 2
    });
  }
  
  // Create mystical stone circles
  for (let circle = 0; circle < 3; circle++) {
    const centerX = (Math.random() - 0.5) * 60;
    const centerZ = (Math.random() - 0.5) * 60;
    const radius = 8 + Math.random() * 4;
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      const height = 6 + Math.random() * 4;
      
      const stone = createAdvancedCube(1.5, {
        color: 0x555555,
        emissive: 0x111144,
        emissiveIntensity: 0.4,
        metallic: true,
        animated: true
      }, [x, height/2, z]);
      
      world.terrain.push({ 
        mesh: stone, 
        type: 'monolith',
        originalY: height/2,
        glowPhase: Math.random() * Math.PI * 2
      });
    }
  }
  
  // Ancient trees
  for (let i = 0; i < 15; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = (Math.random() - 0.5) * 90;
    
    // Tree trunk
    const trunk = createCube(1, 8, 1, 0x4a3a2a, [x, 4, z]);
    world.terrain.push({ mesh: trunk, type: 'tree_trunk' });
    
    // Tree crown
    const crown = createSphere(4, 0x2a5a2a, [x, 10, z]);
    world.terrain.push({ 
      mesh: crown, 
      type: 'tree_crown',
      originalY: 10,
      swayPhase: Math.random() * Math.PI * 2
    });
  }
}

async function spawnCrystals() {
  console.log('💎 Spawning mystical crystals...');
  
  for (let i = 0; i < 25; i++) {
    const x = (Math.random() - 0.5) * 70;
    const z = (Math.random() - 0.5) * 70;
    const y = 2;
    
    // Create stunning holographic crystals
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
    const emissiveColors = [0x331111, 0x113311, 0x111133, 0x333311, 0x331133, 0x113333];
    const colorIndex = Math.floor(Math.random() * colors.length);
    
    const crystal = createAdvancedSphere(0.8, {
      color: colors[colorIndex],
      emissive: emissiveColors[colorIndex],
      emissiveIntensity: 0.7,
      holographic: true,
      animated: true,
      metallic: Math.random() > 0.5,
      transparent: true,
      opacity: 0.9
    }, [x, y, z], 12);
    
    world.crystals.push({
      mesh: crystal,
      x, y, z,
      color: colors[colorIndex],
      rotationSpeed: 1 + Math.random() * 2,
      bobPhase: Math.random() * Math.PI * 2,
      glowIntensity: Math.random(),
      collected: false
    });
  }
}

async function createCreatures() {
  console.log('🦋 Creating mystical creatures...');
  
  // Flying magical orbs with stunning visuals
  for (let i = 0; i < 12; i++) {
    const orb = createAdvancedSphere(0.5, {
      color: 0xffff88,
      emissive: 0x888844,
      emissiveIntensity: 1.0,
      holographic: true,
      animated: true,
      transparent: true,
      opacity: 0.8
    }, [0, 15, 0], 16);
    
    world.creatures.push({
      mesh: orb,
      type: 'orb',
      x: (Math.random() - 0.5) * 60,
      y: 15 + Math.random() * 10,
      z: (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 1,
      vz: (Math.random() - 0.5) * 2,
      glowPhase: Math.random() * Math.PI * 2,
      trail: []
    });
  }
}

export function update(dt) {
  // Handle start screen
  if (gameState === 'start') {
    startScreenTime += dt;
    updateAllButtons();
    // Still update world animations in background
    time += dt;
    dayNightCycle += dt * 0.1;
    updateTerrain(dt);
    updateCrystals(dt);
    updateLighting();
    return;
  }
  
  // Handle game over
  if (gameState === 'gameover') {
    updateAllButtons();
    return;
  }
  
  // Playing state
  time += dt;
  dayNightCycle += dt * 0.1;
  playTime += dt;
  
  // Update player movement
  updatePlayer(dt);
  
  // Update camera
  updateCamera(dt);
  
  // Update world elements
  updateTerrain(dt);
  updateCrystals(dt);
  updateCreatures(dt);
  updateWeather(dt);
  
  // Update lighting based on time of day
  updateLighting();
  
  // Particle system
  updateParticles(dt);
  
  // Check for crystal collection
  checkCrystalCollection();
  
  // Check game over
  if (player.health <= 0 && gameState === 'playing') {
    gameState = 'gameover';
    initGameOverScreen();
  }
}

function updatePlayer(dt) {
  // Simple physics
  player.jumpVelocity -= 25 * dt; // gravity
  player.y += player.jumpVelocity * dt;
  
  // Ground collision
  if (player.y <= 2) {
    player.y = 2;
    player.jumpVelocity = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }
  
  // Input handling
  let inputX = 0, inputZ = 0;
  
  if (key('KeyW') || key('ArrowUp')) inputZ = -1;
  if (key('KeyS') || key('ArrowDown')) inputZ = 1;
  if (key('KeyA') || key('ArrowLeft')) inputX = -1;
  if (key('KeyD') || key('ArrowRight')) inputX = 1;
  
  if (key('Space') && player.onGround) {
    player.jumpVelocity = 12;
    player.onGround = false;
  }
  
  // Movement
  if (inputX !== 0 || inputZ !== 0) {
    const moveSpeed = player.speed * dt;
    player.x += inputX * moveSpeed;
    player.z += inputZ * moveSpeed;
    
    // Rotation based on movement
    if (inputX !== 0 || inputZ !== 0) {
      player.rotation = Math.atan2(inputX, inputZ);
    }
  }
  
  // Keep player in bounds
  player.x = Math.max(-45, Math.min(45, player.x));
  player.z = Math.max(-45, Math.min(45, player.z));
}

function updateCamera(dt) {
  // Smooth camera follow
  const targetX = player.x + camera.offset.x;
  const targetY = player.y + camera.offset.y;
  const targetZ = player.z + camera.offset.z;
  
  // Add camera shake for dramatic effect
  camera.shake = Math.max(0, camera.shake - dt * 5);
  const shakeX = (Math.random() - 0.5) * camera.shake;
  const shakeY = (Math.random() - 0.5) * camera.shake;
  const shakeZ = (Math.random() - 0.5) * camera.shake;
  
  setCameraPosition(targetX + shakeX, targetY + shakeY, targetZ + shakeZ);
  setCameraTarget(player.x, player.y + 2, player.z);
}

function updateTerrain(dt) {
  world.terrain.forEach(element => {
    if (element.type === 'hill') {
      // Gentle bobbing motion
      element.bobPhase += dt;
      const bobY = Math.sin(element.bobPhase * 0.5) * 0.2;
      setPosition(element.mesh, 
        getPosition(element.mesh)[0], 
        element.originalY + bobY, 
        getPosition(element.mesh)[2]
      );
    } else if (element.type === 'tree_crown') {
      // Tree swaying
      element.swayPhase += dt * 2;
      const swayX = Math.sin(element.swayPhase) * 0.3;
      setPosition(element.mesh, 
        getPosition(element.mesh)[0] + swayX, 
        element.originalY, 
        getPosition(element.mesh)[2]
      );
    } else if (element.type === 'monolith') {
      // Mysterious glowing
      element.glowPhase += dt * 3;
      const glow = (Math.sin(element.glowPhase) + 1) * 0.5;
      // Color intensity varies
    }
  });
}

function updateCrystals(dt) {
  world.crystals.forEach(crystal => {
    if (crystal.collected) return;
    
    // Rotation
    rotateMesh(crystal.mesh, 0, dt * crystal.rotationSpeed, 0);
    
    // Bobbing motion
    crystal.bobPhase += dt * 2;
    const bobY = Math.sin(crystal.bobPhase) * 0.5;
    setPosition(crystal.mesh, crystal.x, crystal.y + bobY, crystal.z);
    
    // Glowing effect
    crystal.glowIntensity += dt * 2;
  });
}

function updateCreatures(dt) {
  world.creatures.forEach(creature => {
    if (creature.type === 'orb') {
      // Flying movement
      creature.x += creature.vx * dt;
      creature.y += creature.vy * dt;
      creature.z += creature.vz * dt;
      
      // Bounds checking with gentle turning
      if (Math.abs(creature.x) > 40) creature.vx *= -0.8;
      if (creature.y < 10 || creature.y > 25) creature.vy *= -0.8;
      if (Math.abs(creature.z) > 40) creature.vz *= -0.8;
      
      // Random direction changes
      if (Math.random() < 0.01) {
        creature.vx += (Math.random() - 0.5) * 2;
        creature.vy += (Math.random() - 0.5) * 1;
        creature.vz += (Math.random() - 0.5) * 2;
      }
      
      // Glowing effect
      creature.glowPhase += dt * 5;
      
      setPosition(creature.mesh, creature.x, creature.y, creature.z);
    }
  });
}

function updateWeather(dt) {
  // Weather system
  if (Math.random() < 0.001) {
    // Random weather change
    const weathers = ['clear', 'rain', 'storm', 'mystical'];
    world.weather.type = weathers[Math.floor(Math.random() * weathers.length)];
    world.weather.intensity = Math.random();
  }
  
  // Lightning effects during storms
  if (world.weather.type === 'storm') {
    lightningTimer += dt;
    if (lightningTimer > 2 + Math.random() * 3) {
      // Lightning flash
      setLightColor(0xffffff);
      camera.shake = 3;
      lightningTimer = 0;
    }
  }
}

function updateLighting() {
  // Day/night cycle
  const dayPhase = (Math.sin(dayNightCycle) + 1) * 0.5;
  
  // Sunrise/sunset colors
  let lightColor = 0xffffff;
  let ambientColor = 0x404040;
  let fogColor = 0x202040;
  
  if (dayPhase < 0.3) {
    // Night
    lightColor = 0x4444aa;
    ambientColor = 0x202040;
    fogColor = 0x101030;
  } else if (dayPhase < 0.5) {
    // Dawn
    lightColor = 0xffaa44;
    ambientColor = 0x404030;
    fogColor = 0x403020;
  } else if (dayPhase < 0.8) {
    // Day
    lightColor = 0xffffdd;
    ambientColor = 0x606060;
    fogColor = 0x808080;
  } else {
    // Dusk
    lightColor = 0xff6644;
    ambientColor = 0x404020;
    fogColor = 0x402010;
  }
  
  // Apply lighting
  setLightDirection(-0.5, -1, -0.3);
  setLightColor(lightColor);
  setAmbientLight(ambientColor);
  setFog(fogColor, 30, 80);
}

function updateParticles(dt) {
  // Simple particle system for mystical effects
  if (Math.random() < 0.1) {
    // Add sparkle particles around crystals
    world.crystals.forEach(crystal => {
      if (!crystal.collected && Math.random() < 0.05) {
        spawnParticle(crystal.x, crystal.y + 2, crystal.z, crystal.color);
      }
    });
  }
}

function spawnParticle(x, y, z, color) {
  const particle = createSphere(0.1, color, [x, y, z]);
  world.particles.push({
    mesh: particle,
    x, y, z,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    vz: (Math.random() - 0.5) * 4,
    life: 2,
    maxLife: 2
  });
}

function checkCrystalCollection() {
  world.crystals.forEach(crystal => {
    if (crystal.collected) return;
    
    const dx = player.x - crystal.x;
    const dy = player.y - crystal.y;
    const dz = player.z - crystal.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance < 3) {
      crystal.collected = true;
      // Hide crystal (in a real engine we'd remove it)
      setPosition(crystal.mesh, -1000, -1000, -1000);
      
      // Particle burst effect
      for (let i = 0; i < 10; i++) {
        spawnParticle(
          crystal.x + (Math.random() - 0.5) * 2,
          crystal.y + Math.random() * 2,
          crystal.z + (Math.random() - 0.5) * 2,
          crystal.color
        );
      }
      
      camera.shake = 1;
    }
  });
}

export function draw() {
  // Handle start screen
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // Handle game over
  if (gameState === 'gameover') {
    drawGameOverScreen();
    return;
  }
  
  // Playing state - Atmospheric UI
  const dayPhase = (Math.sin(dayNightCycle) + 1) * 0.5;
  let timeOfDay = 'Day';
  if (dayPhase < 0.3) timeOfDay = 'Night';
  else if (dayPhase < 0.5) timeOfDay = 'Dawn';
  else if (dayPhase > 0.8) timeOfDay = 'Dusk';
  
  // Title and info
  print('🏰 MYSTICAL REALM 3D', 8, 8, rgba8(255, 215, 0, 255));
  print('Nintendo 64 / PlayStation Fantasy World', 8, 24, rgba8(200, 150, 255, 255));
  
  // Game stats
  const collectedCrystals = world.crystals.filter(c => c.collected).length;
  print(`Time: ${timeOfDay} | Weather: ${world.weather.type}`, 8, 50, rgba8(150, 200, 255, 255));
  print(`Crystals: ${collectedCrystals}/${world.crystals.length}`, 8, 66, rgba8(255, 200, 100, 255));
  print(`Position: ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}`, 8, 82, rgba8(100, 255, 150, 255));
  
  // 3D stats
  const stats = get3DStats();
  if (stats && stats.render) {
    print(`3D Objects: ${world.terrain.length + world.crystals.length + world.creatures.length}`, 8, 108, rgba8(150, 150, 255, 255));
    print(`GPU: ${stats.renderer || 'Three.js'} | Effects: Bloom+Dither+Pixel`, 8, 124, rgba8(150, 150, 255, 255));
  }
  
  // Controls
  print('WASD/Arrows: Move | Space: Jump', 8, 300, rgba8(200, 200, 200, 180));
  print('Explore the mystical realm and collect crystals!', 8, 316, rgba8(255, 255, 100, 200));
  print('Experience Nintendo 64/PlayStation nostalgia!', 8, 332, rgba8(100, 255, 100, 180));
  
  // Weather indicator
  if (world.weather.type === 'storm') {
    print('⚡ STORM APPROACHING ⚡', 200, 8, rgba8(255, 255, 0, 255));
  } else if (world.weather.type === 'mystical') {
    print('✨ Mystical energies swirl... ✨', 200, 8, rgba8(255, 100, 255, 255));
  }
  
  // Health bar
  const healthPanel = createPanel(10, 140, 220, 50, {
    bgColor: rgba8(0, 0, 0, 180),
    borderColor: rgba8(100, 50, 200, 255),
    borderWidth: 2
  });
  drawPanel(healthPanel);
  drawProgressBar(20, 160, 200, 20, player.health, player.maxHealth, {
    fillColor: player.health > 50 ? uiColors.success : player.health > 25 ? uiColors.warning : uiColors.danger
  });
}

function drawStartScreen() {
  // Mystical gradient background
  drawGradientRect(0, 0, 640, 360,
    rgba8(20, 10, 40, 220),
    rgba8(50, 20, 80, 240),
    true
  );
  
  // Animated title with magical glow
  const glow = Math.sin(startScreenTime * 2) * 0.3 + 0.7;
  const glowColor = rgba8(
    Math.floor(200 * glow),
    Math.floor(100 * glow),
    Math.floor(255 * glow),
    255
  );
  
  setFont('huge');
  setTextAlign('center');
  const bounce = Math.sin(startScreenTime * 2) * 12;
  drawTextShadow('MYSTICAL', 320, 50 + bounce, glowColor, rgba8(0, 0, 0, 255), 5, 1);
  drawTextShadow('REALM', 320, 100 + bounce, rgba8(255, 215, 0, 255), rgba8(0, 0, 0, 255), 5, 1);
  
  // Subtitle with pulse
  setFont('large');
  const pulse = Math.sin(startScreenTime * 3) * 0.2 + 0.8;
  drawTextOutline('3D Fantasy Adventure', 320, 150, 
    rgba8(150, 100, 255, Math.floor(pulse * 255)), 
    rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(420), 340, 420, 200, {
    bgColor: rgba8(20, 10, 40, 200),
    borderColor: rgba8(100, 50, 200, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(40, 20, 60, 200)
  });
  drawPanel(panel);
  
  // Quest description
  setFont('normal');
  setTextAlign('center');
  drawText('QUEST BRIEFING', 320, 185, rgba8(255, 215, 0, 255), 1);
  
  setFont('small');
  drawText('A mystical realm awaits exploration', 320, 210, uiColors.light, 1);
  drawText('Collect magical crystals scattered across the land', 320, 225, uiColors.light, 1);
  drawText('Navigate through day, night, and mystical storms', 320, 240, uiColors.light, 1);
  
  setFont('tiny');
  drawText('CONTROLS: WASD/Arrows = Move  |  Space = Jump', 320, 270, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing start prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 5) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('▶ PRESS BEGIN QUEST TO START ◀', 320, 305, rgba8(200, 100, 255, alpha), 1);
  
  // Mystical particles hint
  setFont('tiny');
  drawText('Nintendo 64 / PlayStation Style Graphics', 320, 340, rgba8(150, 150, 200, 150), 1);
}

function drawGameOverScreen() {
  // Dark mystical overlay
  rect(0, 0, 640, 360, rgba8(10, 5, 20, 220), true);
  
  // Game over title
  setFont('huge');
  setTextAlign('center');
  const flash = Math.floor(time * 2) % 2 === 0;
  const color = flash ? rgba8(200, 100, 255, 255) : rgba8(150, 50, 200, 255);
  drawTextShadow('QUEST ENDED', 320, 80, color, rgba8(0, 0, 0, 255), 5, 1);
  
  // Stats panel
  const statsPanel = createPanel(centerX(420), centerY(220), 420, 220, {
    bgColor: rgba8(20, 10, 40, 220),
    borderColor: rgba8(100, 50, 200, 255),
    borderWidth: 3,
    shadow: true,
    title: 'FINAL STATISTICS',
    titleBgColor: rgba8(100, 50, 200, 255)
  });
  drawPanel(statsPanel);
  
  // Stats
  setFont('large');
  setTextAlign('center');
  drawText(`Crystals Collected: ${crystalsCollected}`, 320, 200, rgba8(255, 215, 0, 255), 1);
  
  setFont('normal');
  const minutes = Math.floor(playTime / 60);
  const seconds = Math.floor(playTime % 60);
  drawText(`Time Played: ${minutes}m ${seconds}s`, 320, 235, uiColors.secondary, 1);
  drawText(`Score: ${score}`, 320, 260, uiColors.success, 1);
  
  // Draw buttons
  drawAllButtons();
}

function initGameOverScreen() {
  uiButtons = [];
  
  // Try again button
  uiButtons.push(
    createButton(centerX(200), 310, 200, 50, '↻ TRY AGAIN', () => {
      resetGame();
      gameState = 'playing';
    }, {
      normalColor: uiColors.success,
      hoverColor: rgba8(60, 220, 120, 255),
      pressedColor: rgba8(30, 160, 80, 255)
    })
  );
  
  // Main menu button
  uiButtons.push(
    createButton(centerX(200), 375, 200, 45, '← MAIN MENU', () => {
      resetGame();
      gameState = 'start';
      initStartScreen();
    }, {
      normalColor: uiColors.primary,
      hoverColor: rgba8(50, 150, 255, 255),
      pressedColor: rgba8(20, 100, 200, 255)
    })
  );
}

function resetGame() {
  player.health = player.maxHealth;
  player.x = 0;
  player.y = 5;
  player.z = 0;
  player.jumpVelocity = 0;
  playTime = 0;
  score = 0;
  crystalsCollected = 0;
  
  // Reset crystals
  world.crystals.forEach(c => c.collected = false);
}