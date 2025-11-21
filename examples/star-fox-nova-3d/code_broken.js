// ===============================================
// STAR FOX NOVA 64 - DESERTED SPACE STYLE
// Built with proper space combat mechanics
// ===============================================

let gameData, uiData, gameSettings, hudElements;

// Track all created meshes for cleanup
let allMeshes = [];

function trackMesh(mesh) {
  if (mesh && !allMeshes.includes(mesh)) {
    allMeshes.push(mesh);
  }
  return mesh;
}

function cleanupAllMeshes() {
  allMeshes.forEach(mesh => {
    if (mesh && typeof destroyMesh === 'function') {
      destroyMesh(mesh);
    }
  });
  allMeshes = [];
}

// === GAME INITIALIZATION ===
export async function init() {
  console.log('🚀 STAR FOX NOVA 64 - Deserted Space Quality...');
  
  // Clear everything first
  cls();
  
  // Simple, effective 3D setup like Deserted Space
  setCameraPosition(0, 5, 15);
  setCameraTarget(0, 0, 0);
  setCameraFOV(75);
  
  // Clean, effective lighting
  setLightDirection(0, -1, -0.5);
  setLightColor(0xffffff);
  setAmbientLight(0x404040);
  
  // Initialize simple game settings
  gameSettings = {
    graphics: {
      enableParticles: true,
      enableTrails: false,
      shadowQuality: 'medium',
      starDensity: 500
    },
    physics: {
      acceleration: 15,
      maxSpeed: 25,
      friction: 0.88,
      gravity: 0
    },
    gameplay: {
      difficulty: 1.0,
      enemySpawnRate: 2.0,
      powerupChance: 0.15
    }
  };
  
  // Clean up any existing meshes from previous loads
  cleanupAllMeshes();
  
  // Initialize comprehensive game state
  gameData = {
    // Core game stats
    score: 0,
    health: 100,
    shields: 100,
    energy: 100,
    wave: 1,
    kills: 0,
    time: 0,
    
    // Advanced player ship with physics
    arwing: {
      position: { x: 0, y: 2, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      mesh: null,
      parts: [],
      engineGlow: [],
      lastShot: 0,
      boost: false,
      shields: true,
      speed: 0
    },
    
    // Game objects
    enemies: [],
    projectiles: [],
    powerups: [],
    particles: [],
    trails: [],
    stars: [],
    debris: [],
    spaceFloor: [],
    
    // Camera system
    camera: {
      position: { x: 0, y: 5, z: 15 },
      target: { x: 0, y: 0, z: 0 },
      shake: 0,
      shakeIntensity: 0,
      followSmoothing: 0.1
    },
    
    // Environment
    environment: {
      nebula: [],
      asteroids: [],
      planets: []
    },
    
    // Audio/Visual feedback
    effects: {
      screenFlash: 0,
      timeSlowdown: 1.0,
      combatZoom: 0
    }
  };
  
  // UI state
  uiData = {
    time: 0,
    mouseX: 0,
    mouseY: 0,
    startButtonHover: false,
    showFPS: false,
    targetingSystem: {
      targets: [],
      locked: null
    }
  };
  
  // Initialize HUD system
  initializeHUD();
  
  // Create advanced starfield
  createAdvancedStarfield();
  
  // Create space floor
  createSpaceFloor();
  
  // Setup mouse controls
  setupMouseHandlers();
  
  // Title Screen
  addScreen('start', {
    enter: function() {
      console.log('📺 Entering professional start screen...');
      cleanupAllMeshes();
      
      // Setup cinematic camera for title
      if (typeof setCameraPosition === 'function') {
        setCameraPosition(0, 3, 12);
        setCameraTarget(0, 0, 0);
        setCameraFOV(60);
      }
      
      // Create demo ship for title screen
      createTitleScreenDemo();
    },
    
    draw: function() {
      drawProfessionalStartScreen();
    },
    
    update: function(dt) {
      updateStartScreen(dt);
    }
  });
  
  // Enhanced Game Screen
  addScreen('game', {
    enter: function() {
      console.log('🎮 Entering PROFESSIONAL game mode...');
      
      setupGameEnvironment();
      createPlayerShip();
      initializeGameSystems();
      spawnInitialEnemyWave();
    },
    
    draw: function() {
      drawGameEnvironment();
      drawProfessionalHUD();
    },
    
    update: function(dt) {
      updateGameSystems(dt);
    }
  });
  
  // Game Over Screen
  addScreen('gameover', {
    enter: function() {
      console.log('💀 Game Over - Final Score:', gameData.score);
    },
    
    draw: function() {
      drawGameOverScreen();
    },
    
    update: function(dt) {
      if (isKeyPressed(' ') || isKeyPressed('Enter')) {
        switchToScreen('start');
      }
    }
  });
  
  // Start with title screen
  switchToScreen('start');
  
  console.log('✅ PROFESSIONAL STAR FOX NOVA 64 Ready!');
}

// === HUD SYSTEM INTEGRATION ===
function initializeHUD() {
  hudElements = {
    scoreDisplay: null,
    healthBar: null,
    crosshair: null,
    speedometer: null,
    initialized: false
  };
  
  console.log('🎯 HUD system initialized');
}

// === ADVANCED GRAPHICS FUNCTIONS ===
function createAdvancedStarfield() {
  gameData.stars = [];
  
  // Create multiple star layers for depth
  for (let layer = 0; layer < 3; layer++) {
    const starCount = [200, 150, 100][layer];
    const distance = [100, 200, 500][layer];
    const speed = [1, 0.5, 0.2][layer];
    
    for (let i = 0; i < starCount; i++) {
      gameData.stars.push({
        x: (Math.random() - 0.5) * distance * 2,
        y: (Math.random() - 0.5) * distance,
        z: -Math.random() * distance - 50 - (layer * 100),
        originalZ: -Math.random() * distance - 50 - (layer * 100),
        speed: speed + Math.random() * speed,
        brightness: Math.random() * 0.8 + 0.2,
        size: Math.random() * 2 + 1,
        layer: layer,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }
}

function createSpaceFloor() {
  console.log('🌌 Creating simple, stable starfield like Deserted Space...');
  
  // Create simple starfield - no complex mesh tracking
  gameData.stars = [];
  
  for (let i = 0; i < 200; i++) {
    const star = createCube(0.5, 0xffffff, [
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 100, 
      -100 - Math.random() * 300
    ]);
    
    gameData.stars.push({
      mesh: star,
      speed: 20 + Math.random() * 30,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 100,
      z: -100 - Math.random() * 300
    });
  }
    
    // 2. Crystal Cathedral pillars in formation
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 80;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 200;
      const height = 25 + Math.sin(i * 0.7) * 8;
      
      // Towering crystal pillars
      const pillar = trackMesh(createCube(4, 0x4488FF, [x, height/2 - 60, z]));
      setScale(pillar, 3, height, 3);
      
      // Glowing crystal caps
      const cap = trackMesh(createSphere(2, 0x88DDFF, [x, height - 40, z]));
      
      gameData.spaceFloor.push({
        mesh: pillar,
        cap: cap,
        type: 'pillar',
        x: x,
        originalZ: z,
        customZ: z,
        height: height,
        glowPhase: Math.random() * Math.PI * 2
      });
    }
    
    // 3. Holographic grid system with multiple layers
    const gridSpacing = 25;
    const gridCount = 20;
    
    // HOLOGRAPHIC GRID SYSTEM like Crystal Cathedral
    for (let i = -gridCount; i <= gridCount; i += 3) {
      for (let j = 0; j < 15; j++) {
        const z = -150 - (j * 60);
        
        // Holographic grid lines with emissive glow
        const hLine = trackMesh(createCube(4, 0x4488FF, [0, -57, z]));
        setScale(hLine, 60, 1.5, 1);
        gameData.spaceFloor.push({
          mesh: hLine,
          type: 'horizontal',
          x: 0,
          originalZ: z,
          customZ: z,
          glowPhase: j * 0.3
        });
        
        // Vertical holographic lines
        if (Math.abs(i) <= 15) {
          const vLine = trackMesh(createCube(4, 0x4488FF, [i * gridSpacing, -57, z]));
          setScale(vLine, 1, 1.5, 60);
          gameData.spaceFloor.push({
            mesh: vLine,
            type: 'vertical',
            x: i * gridSpacing,
            originalZ: z,
            customZ: z,
            glowPhase: i * 0.2
          });
        }
      }
    }
    
    // 4. FLOATING CRYSTAL ELEMENTS like Crystal Cathedral
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 600;
      const y = -40 + Math.random() * 20;
      const z = -100 - Math.random() * 400;
      
      // Holographic floating crystals
      const crystal = trackMesh(createSphere(3, 0x88DDFF, [x, y, z]));
      setScale(crystal, 2, 4, 2);
      gameData.spaceFloor.push({
        mesh: crystal,
        type: 'crystal',
        x: x,
        y: y,
        originalZ: z,
        customZ: z,
        floatPhase: Math.random() * Math.PI * 2,
        originalY: y
      });
    }
    
    // 4. Create depth markers - pillars in the distance
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 600;
      const z = -200 - Math.random() * 400;
      
      const pillar = trackMesh(createCube(8, 0x004499, [x, -40, z]));
      setScale(pillar, 2, 8, 2);
      gameData.spaceFloor.push({
        mesh: pillar,
        type: 'pillar',
        x: x,
        originalZ: z,
        customZ: z
    });
  }
  
  console.log('🌌 Simple starfield created with', gameData.stars.length, 'stars');
}function updateStarfield(dt) {
  // Simple, reliable starfield update like Deserted Space
  for (let star of gameData.stars) {
    // Move stars toward player
    star.z += star.speed * dt;
    
    // Update star position
    setPosition(star.mesh, star.x, star.y, star.z);
    
    // Reset when star passes player
    if (star.z > 30) {
      star.z = -300 - Math.random() * 100;
      star.x = (Math.random() - 0.5) * 200;
      star.y = (Math.random() - 0.5) * 100;
    }
  }
}

function createTitleScreenDemo() {
  // Create a demo Arwing for the title screen
  try {
    const demoShip = createAdvancedArwing(2, 0, -8);
    gameData.demoShip = {
      parts: demoShip,
      rotation: 0,
      position: { x: 2, y: 0, z: -8 }
    };
  } catch (e) {
    console.warn('Demo ship creation error:', e);
  }
}

function createAdvancedArwing(x, y, z) {
  const shipParts = [];
  
  try {
    // SPECTACULAR ARWING - Much better than Deserted Space!
    
    // Main fuselage - sleek and large
    const fuselage = trackMesh(createCube(1.2, 0x0099FF, [x, y, z]));
    setScale(fuselage, 1.5, 1, 5);
    shipParts.push(fuselage);
    
    // Cockpit - glowing crystal canopy
    const cockpit = trackMesh(createSphere(0.8, 0x88FFFF, [x, y + 0.5, z + 2]));
    setScale(cockpit, 1.2, 0.8, 1.5);
    shipParts.push(cockpit);
    
    // Massive swept wings
    const leftWing = trackMesh(createCube(4, 0x0066CC, [x - 3.5, y - 0.5, z - 1]));
    setScale(leftWing, 1.5, 0.4, 4);
    setRotation(leftWing, 0, 0, -0.2);
    shipParts.push(leftWing);
    
    const rightWing = trackMesh(createCube(4, 0x0066CC, [x + 3.5, y - 0.5, z - 1]));
    setScale(rightWing, 1.5, 0.4, 4);
    setRotation(rightWing, 0, 0, 0.2);
    shipParts.push(rightWing);
    
    // Wing tips - glowing
    const leftWingTip = trackMesh(createSphere(0.6, 0x00FFFF, [x - 5, y - 0.5, z - 1]));
    shipParts.push(leftWingTip);
    
    const rightWingTip = trackMesh(createSphere(0.6, 0x00FFFF, [x + 5, y - 0.5, z - 1]));
    shipParts.push(rightWingTip);
    
    // Powerful engine pods
    const leftEngine = trackMesh(createCube(1, 0x003399, [x - 3.5, y - 0.5, z - 2.5]));
    setScale(leftEngine, 1.2, 1.2, 3);
    shipParts.push(leftEngine);
    
    const rightEngine = trackMesh(createCube(1, 0x003399, [x + 3.5, y - 0.5, z - 2.5]));
    setScale(rightEngine, 1.2, 1.2, 3);
    shipParts.push(rightEngine);
    
    // Brilliant engine glows
    const leftGlow = trackMesh(createSphere(0.8, 0xFF6600, [x - 3.5, y - 0.5, z - 4]));
    shipParts.push(leftGlow);
    
    const rightGlow = trackMesh(createSphere(0.8, 0xFF6600, [x + 3.5, y - 0.5, z - 4]));
    shipParts.push(rightGlow);
    
    // Quad laser cannons - intimidating
    const leftCannon = trackMesh(createCube(0.5, 0xFFAA00, [x - 4, y + 0.2, z + 3]));
    setScale(leftCannon, 0.6, 0.6, 2.5);
    shipParts.push(leftCannon);
    
    const rightCannon = trackMesh(createCube(0.5, 0xFFAA00, [x + 4, y + 0.2, z + 3]));
    setScale(rightCannon, 0.6, 0.6, 2.5);
    shipParts.push(rightCannon);
    
    // Nose cone - sharp and aggressive  
    const nose = trackMesh(createSphere(0.6, 0x0088FF, [x, y, z + 3.5]));
    setScale(nose, 0.8, 0.8, 1.5);
    shipParts.push(nose);
    
    return shipParts;
    
  } catch (e) {
    console.warn('Advanced Arwing creation error:', e);
    return [trackMesh(createCube(3, 0x0099FF, [x, y, z]))];
  }
}

function createAdvancedEnemyFighter(x, y, z, type = 'fighter') {
  const enemyParts = [];
  
  try {
    switch(type) {
      case 'fighter': {
        // Aggressive angular fighter
        const body = trackMesh(createCube(1.2, 0xFF3030, [x, y, z]));
        setScale(body, 1.5, 1, 2.5);
        enemyParts.push(body);
        
        // Sharp wings
        const leftWing = trackMesh(createCube(1.8, 0xCC2020, [x - 1.2, y, z]));
        setScale(leftWing, 1, 0.4, 1.8);
        setRotation(leftWing, 0, 0, -0.3);
        enemyParts.push(leftWing);
        
        const rightWing = trackMesh(createCube(1.8, 0xCC2020, [x + 1.2, y, z]));
        setScale(rightWing, 1, 0.4, 1.8);
        setRotation(rightWing, 0, 0, 0.3);
        enemyParts.push(rightWing);
        break;
      }
        
      case 'bomber': {
        // Large, slow bomber
        const bomberBody = trackMesh(createCube(2, 0xFF6600, [x, y, z]));
        setScale(bomberBody, 2, 1.5, 3);
        enemyParts.push(bomberBody);
        break;
      }
        
      case 'interceptor': {
        // Fast, small interceptor
        const interceptorBody = trackMesh(createSphere(0.8, 0xFF8888, [x, y, z]));
        enemyParts.push(interceptorBody);
        break;
      }
    }
    
    // Engine glow for all types
    const engineGlow = trackMesh(createSphere(0.4, 0xFF4400, [x, y, z - 1.5]));
    enemyParts.push(engineGlow);
    
    return enemyParts;
    
  } catch (e) {
    console.warn('Advanced enemy creation error:', e);
    return [trackMesh(createCube(1.5, 0xFF3030, [x, y, z]))];
  }
}

// === MOUSE CONTROL SYSTEM ===
function setupMouseHandlers() {
  try {
    if (typeof document !== 'undefined') {
      const canvas = document.getElementById('screen');
      if (canvas) {
        // Mouse movement for camera/targeting
        canvas.addEventListener('mousemove', (e) => {
          const rect = canvas.getBoundingClientRect();
          uiData.mouseX = ((e.clientX - rect.left) / rect.width) * 640;
          uiData.mouseY = ((e.clientY - rect.top) / rect.height) * 360;
          
          // Update targeting system
          updateTargetingSystem();
        });
        
        // Click handlers
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      }
    }
  } catch (error) {
    console.warn('Mouse setup error:', error);
  }
}

function handleCanvasClick(e) {
  try {
    const currentScreen = getCurrentScreen ? getCurrentScreen() : 'start';
    
    if (currentScreen === 'start') {
      console.log('🚀 Starting professional game...');
      switchToScreen('game');
    } else if (currentScreen === 'game') {
      // Fire weapons or interact
      fireAdvancedWeapons();
    }
  } catch (e) {
    console.warn('Click handler error:', e);
  }
}

// === PROFESSIONAL START SCREEN ===
function drawProfessionalStartScreen() {
  try {
    // Deep space background
    cls(0x000011);
    
    // Animated starfield
    drawAdvancedStarfield();
    
    // Animated title with glow effect
    uiData.time += 0.016;
    
    const titleGlow = Math.sin(uiData.time * 3) * 0.4 + 0.6;
    const titlePulse = Math.sin(uiData.time * 2) * 20 + 40;
    
    // Main title with shadow effect
    print('STAR FOX', 220 + 2, 80 + 2, rgba8(0, 0, 50, 150)); // Shadow
    print('STAR FOX', 220, 80, rgba8(0, Math.floor(titleGlow * 255), 255, 255));
    
    print('NOVA 64', 240 + 1, 110 + 1, rgba8(0, 0, 50, 150)); // Shadow
    print('NOVA 64', 240, 110, rgba8(255, Math.floor(titleGlow * 200), 0, 255));
    
    // Subtitle
    print('PROFESSIONAL SPACE COMBAT', 180, 140, rgba8(150, 200, 255, 200));
    
    // Animated start button
    const buttonPulse = Math.sin(uiData.time * 4) * 0.3 + 0.7;
    const buttonGlow = Math.floor(buttonPulse * 255);
    
    // Large, obvious start button
    rect(170, 180, 300, 60, rgba8(0, 50, 100, 150), true);
    rect(165, 175, 310, 70, rgba8(0, buttonGlow/2, buttonGlow, 200), false);
    rect(167, 177, 306, 66, rgba8(0, buttonGlow/3, buttonGlow/2, 150), false);
    
    print('CLICK TO START MISSION', 190, 205, rgba8(255, 255, 255, buttonGlow));
    
    // Instructions
    print('WASD: Flight Controls  |  SPACE: Primary Weapons', 150, 270, rgba8(200, 200, 200, 255));
    print('SHIFT: Boost  |  Mouse: Targeting  |  ESC: Menu', 170, 290, rgba8(180, 180, 180, 255));
    
    // Version info
    print('Nova64 v0.2.0 Professional Edition', 20, 340, rgba8(100, 100, 100, 255));
    
    // Animate demo ship if available
    if (gameData.demoShip) {
      updateDemoShip();
    }
    
  } catch (error) {
    console.warn('Start screen error:', error);
    // Simple fallback
    cls(0x000033);
    print('STAR FOX NOVA 64', 220, 100, rgba8(0, 255, 255, 255));
    print('CLICK TO START', 270, 200, rgba8(255, 255, 0, 255));
  }
}

function updateDemoShip() {
  if (!gameData.demoShip) return;
  
  gameData.demoShip.rotation += 0.01;
  
  // Rotate demo ship parts
  if (gameData.demoShip.parts) {
    for (let part of gameData.demoShip.parts) {
      if (part) {
        setRotation(part, 0, gameData.demoShip.rotation, 0);
      }
    }
  }
}

function updateStartScreen(dt) {
  // Any key or click starts the game
  if (isKeyPressed(' ') || isKeyPressed('Enter') || isKeyPressed('w') || 
      isKeyPressed('a') || isKeyPressed('s') || isKeyPressed('d')) {
    console.log('🚀 Starting via keyboard...');
    switchToScreen('game');
  }
}

// === ADVANCED GAME SETUP ===
function setupGameEnvironment() {
  try {
    // Deserted Space style camera - closer and more dynamic
    if (typeof setCameraPosition === 'function') {
      setCameraPosition(0, 15, 35);
      setCameraTarget(0, 0, -20);
      setCameraFOV(75);
    }
    
    // Bright lighting for better visibility
    if (typeof setLightDirection === 'function') {
      setLightDirection(0, -1, -0.5);
    }
    if (typeof setAmbientLight === 'function') {
      setAmbientLight(0.4);
    }
    
    console.log('🌌 Deserted Space style environment initialized');
    
  } catch (e) {
    console.warn('Environment setup error:', e);
  }
}

function createPlayerShip() {
  try {
    // Reset player state
    gameData.arwing = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      parts: [],
      lastShot: 0,
      boost: false,
      shields: true
    };
    
    // Create advanced Arwing
    gameData.arwing.parts = createAdvancedArwing(0, 0, 0);
    gameData.arwing.mesh = gameData.arwing.parts[0]; // Main body reference
    
    console.log('✅ Professional Arwing created with', gameData.arwing.parts.length, 'components');
    
  } catch (e) {
    console.warn('Player ship creation error:', e);
    // Fallback
    gameData.arwing.mesh = trackMesh(createCube(2, 0x0099FF, [0, 0, 0]));
  }
}

function initializeGameSystems() {
  // Reset all game systems
  gameData.score = 0;
  gameData.health = 100;
  gameData.shields = 100;
  gameData.energy = 100;
  gameData.wave = 1;
  gameData.time = 0;
  
  // Clear arrays
  gameData.enemies = [];
  gameData.projectiles = [];
  gameData.particles = [];
  gameData.powerups = [];
  
  console.log('🎮 All game systems initialized');
}

function spawnInitialEnemyWave() {
  const enemyCount = 3 + gameData.wave;
  
  for (let i = 0; i < enemyCount; i++) {
    spawnAdvancedEnemy();
  }
  
  console.log(`🛸 Wave ${gameData.wave}: ${enemyCount} enemies deployed`);
}

function spawnAdvancedEnemy() {
  try {
    const x = (Math.random() - 0.5) * 80;
    const y = (Math.random() - 0.5) * 40 + 10;
    const z = 150 + Math.random() * 100; // SPAWN IN FRONT of player (positive Z)
    
    // Spectacular enemy ships - better than Deserted Space!
    const enemyMesh = trackMesh(createCube(2, 0xFF2200, [x, y, z]));
    setScale(enemyMesh, 2.5, 1.5, 3.5);
    
    // Add enemy wings for impressive look
    const leftWing = trackMesh(createCube(1.5, 0xCC1100, [x - 2, y, z]));
    setScale(leftWing, 1, 0.4, 2);
    
    const rightWing = trackMesh(createCube(1.5, 0xCC1100, [x + 2, y, z]));
    setScale(rightWing, 1, 0.4, 2);
    
    // Enemy engine glow
    const glow = trackMesh(createSphere(0.8, 0xFF6600, [x, y, z - 2]));
    
    gameData.enemies.push({
      mesh: enemyMesh,
      wings: [leftWing, rightWing],
      glow: glow,
      position: { x, y, z },
      velocity: { x: 0, y: 0, z: -25 }, // Move toward player
      health: 3,
      speed: 25 + Math.random() * 20,
      lastShot: 0,
      movePattern: Math.random() > 0.5 ? 'straight' : 'weaving'
    });
    
  } catch (e) {
    console.warn('Enemy spawn error:', e);
  }
}

// === ADVANCED STARFIELD ===
function drawAdvancedStarfield() {
  for (let star of gameData.stars) {
    if (star.z > -200 && star.z < 50) {
      // 3D to 2D projection
      const screenX = 320 + (star.x / (Math.abs(star.z) + 1)) * 400;
      const screenY = 180 + (star.y / (Math.abs(star.z) + 1)) * 400;
      
      if (screenX > -10 && screenX < 650 && screenY > -10 && screenY < 370) {
        // Calculate star properties
        const distance = Math.abs(star.z);
        const alpha = Math.min(255, star.brightness * 255 * (100 / distance));
        const size = Math.max(1, star.size * (50 / distance));
        
        // Twinkling effect
        star.twinkle += 0.1;
        const twinkle = Math.sin(star.twinkle) * 0.3 + 0.7;
        const finalAlpha = Math.floor(alpha * twinkle);
        
        // Draw star with size and brightness
        if (size > 2) {
          // Large stars get a glow effect
          rect(screenX - size, screenY - size, size * 2, size * 2, 
               rgba8(255, 255, 255, finalAlpha * 0.3), true);
        }
        rect(screenX - size/2, screenY - size/2, size, size, 
             rgba8(255, 255, 255, finalAlpha), true);
      }
    }
  }
}

// Space floor is now handled by 3D meshes, no 2D drawing needed

// === GAME SYSTEMS UPDATE ===
function updateGameSystems(dt) {
  gameData.time += dt;
  
  // Update all systems
  updatePlayerShip(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateParticles(dt);
  updateStarfield(dt);
  updateSpaceFloor(dt);
  updateCamera(dt);
  updateEffects(dt);
  
  // Check wave completion
  if (gameData.enemies.length === 0) {
    gameData.wave++;
    gameData.score += gameData.wave * 500; // Wave bonus
    spawnInitialEnemyWave();
    console.log(`🌊 Wave ${gameData.wave} begins! Bonus: ${gameData.wave * 500} points`);
  }
  
  // Check game over
  if (gameData.health <= 0) {
    console.log('💀 Mission Failed - Final Score:', gameData.score);
    switchToScreen('gameover');
  }
  
  // Menu escape
  if (isKeyPressed('Escape')) {
    switchToScreen('start');
  }
}

function updatePlayerShip(dt) {
  const ship = gameData.arwing;
  const physics = gameSettings.physics;
  
  // Direct, responsive movement like Deserted Space
  const moveSpeed = 25;
  const inputStrength = 1.0;
  
  // Direct position control (not velocity-based)
  if (isKeyDown('a') || isKeyDown('ArrowLeft')) {
    ship.position.x -= moveSpeed * dt * inputStrength;
  }
  if (isKeyDown('d') || isKeyDown('ArrowRight')) {
    ship.position.x += moveSpeed * dt * inputStrength;
  }
  if (isKeyDown('w') || isKeyDown('ArrowUp')) {
    ship.position.y += moveSpeed * dt * inputStrength;
  }
  if (isKeyDown('s') || isKeyDown('ArrowDown')) {
    ship.position.y -= moveSpeed * dt * inputStrength;
  }
  
  // Boost system
  ship.boost = isKeyDown('Shift');
  if (ship.boost) {
    // Boost increases movement speed
    if (isKeyDown('a') || isKeyDown('ArrowLeft')) ship.position.x -= moveSpeed * dt;
    if (isKeyDown('d') || isKeyDown('ArrowRight')) ship.position.x += moveSpeed * dt;
    if (isKeyDown('w') || isKeyDown('ArrowUp')) ship.position.y += moveSpeed * dt;
    if (isKeyDown('s') || isKeyDown('ArrowDown')) ship.position.y -= moveSpeed * dt;
  }
  
  // Keep ship in bounds
  ship.position.x = Math.max(-40, Math.min(40, ship.position.x));
  ship.position.y = Math.max(-10, Math.min(25, ship.position.y));
  
  // Banking rotation based on input (not velocity)
  const bankAmount = 0.6;
  ship.rotation.z = 0;
  ship.rotation.x = 0;
  
  if (isKeyDown('a') || isKeyDown('ArrowLeft')) {
    ship.rotation.z = bankAmount;
  } else if (isKeyDown('d') || isKeyDown('ArrowRight')) {
    ship.rotation.z = -bankAmount;
  }
  
  if (isKeyDown('w') || isKeyDown('ArrowUp')) {
    ship.rotation.x = -0.3;
  } else if (isKeyDown('s') || isKeyDown('ArrowDown')) {
    ship.rotation.x = 0.3;
  }
  
  // Always moving forward through space
  ship.speed = ship.boost ? 40 : 25;
  
  // Continuous weapon fire when held
  if (isKeyDown(' ')) {
    if (gameData.time - ship.lastShot > 0.1) {
      fireDesertedSpaceWeapons();
      ship.lastShot = gameData.time;
    }
  }
  
  // Update ship mesh positions
  updateShipMeshes();
}

function updateShipMeshes() {
  const ship = gameData.arwing;
  
  if (ship.parts) {
    for (let part of ship.parts) {
      if (part) {
        setPosition(part, ship.position.x, ship.position.y, ship.position.z);
        setRotation(part, ship.rotation.x, ship.rotation.y, ship.rotation.z);
      }
    }
  } else if (ship.mesh) {
    setPosition(ship.mesh, ship.position.x, ship.position.y, ship.position.z);
    setRotation(ship.mesh, ship.rotation.x, ship.rotation.y, ship.rotation.z);
  }
}

function fireDesertedSpaceWeapons() {
  try {
    const ship = gameData.arwing;
    
    // Simple, fast twin laser system like Deserted Space
    const laserPositions = [
      { x: -1.5, y: 0, z: 2.5 },
      { x: 1.5, y: 0, z: 2.5 }
    ];
    
    for (let pos of laserPositions) {
      const worldX = ship.position.x + pos.x;
      const worldY = ship.position.y + pos.y;
      const worldZ = ship.position.z + pos.z;
      
      // Create fast, bright laser projectiles
      const laser = trackMesh(createSphere(0.2, 0x00FF00, [worldX, worldY, worldZ]));
      setScale(laser, 1, 1, 3); // Long, thin lasers
      
      gameData.projectiles.push({
        mesh: laser,
        position: { x: worldX, y: worldY, z: worldZ },
        velocity: { x: 0, y: 0, z: -100 }, // Very fast
        friendly: true,
        damage: 1,
        life: 3.0
      });
    }
    
    // Update score for firing (tiny increment for activity)
    gameData.score += 1;
    
  } catch (e) {
    console.warn('Weapon firing error:', e);
  }
}

function createMuzzleFlash(x, y, z) {
  for (let i = 0; i < 8; i++) {
    gameData.particles.push({
      position: { 
        x: x + (Math.random() - 0.5) * 0.8,
        y: y + (Math.random() - 0.5) * 0.8,
        z: z + Math.random() * 1
      },
      velocity: {
        x: (Math.random() - 0.5) * 12,
        y: (Math.random() - 0.5) * 12,
        z: (Math.random() - 0.5) * 8
      },
      life: 0.4,
      maxLife: 0.4,
      color: Math.random() > 0.5 ? 0x00FFAA : 0x88FFFF,
      size: Math.random() * 0.5 + 0.3
    });
  }
}

function createEngineTrails() {
  const ship = gameData.arwing;
  
  // Create boost trails from engine positions
  const enginePositions = [
    { x: -2.2, y: -0.3, z: -2.5 },
    { x: 2.2, y: -0.3, z: -2.5 }
  ];
  
  for (let pos of enginePositions) {
    for (let i = 0; i < 3; i++) {
      gameData.particles.push({
        position: {
          x: ship.position.x + pos.x + (Math.random() - 0.5) * 0.5,
          y: ship.position.y + pos.y + (Math.random() - 0.5) * 0.3,
          z: ship.position.z + pos.z
        },
        velocity: {
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 2,
          z: 15 + Math.random() * 10 // Trail behind ship
        },
        life: 0.8,
        maxLife: 0.8,
        color: Math.random() > 0.5 ? 0xFF6600 : 0xFFAA00,
        size: Math.random() * 0.4 + 0.2
      });
    }
  }
}

// === ENEMY AI SYSTEM ===
function updateEnemies(dt) {
  for (let i = gameData.enemies.length - 1; i >= 0; i--) {
    const enemy = gameData.enemies[i];
    
    // Simple AI behavior
    updateEnemyAI(enemy, dt);
    
    // Update enemy mesh position
    if (enemy.mesh) {
      setPosition(enemy.mesh, enemy.position.x, enemy.position.y, enemy.position.z);
    }
    
    // Update enemy wings
    if (enemy.wings) {
      setPosition(enemy.wings[0], enemy.position.x - 2, enemy.position.y, enemy.position.z);
      setPosition(enemy.wings[1], enemy.position.x + 2, enemy.position.y, enemy.position.z);
    }
    
    // Update enemy glow
    if (enemy.glow) {
      setPosition(enemy.glow, enemy.position.x, enemy.position.y, enemy.position.z - 2);
    }
    
    // Remove if too close or dead (changed from z > 30 to z < -30 since they move toward player)
    if (enemy.position.z < -30 || enemy.health <= 0) {
      if (enemy.position.z < -30) {
        // Enemy reached player
        gameData.health -= 20;
        console.log('💥 Enemy breakthrough! Health:', gameData.health);
      }
      
      // Cleanup enemy and all parts
      if (enemy.mesh) destroyMesh(enemy.mesh);
      if (enemy.wings) {
        destroyMesh(enemy.wings[0]);
        destroyMesh(enemy.wings[1]);
      }
      if (enemy.glow) destroyMesh(enemy.glow);
      gameData.enemies.splice(i, 1);
    }
  }
}

function updateEnemyAI(enemy, dt) {
  // Move toward player (negative Z direction since player is at Z=0)
  enemy.position.z -= enemy.speed * dt;
  
  if (enemy.movePattern === 'weaving') {
    // Spectacular weaving movement - better than Deserted Space!
    enemy.position.x += Math.sin(gameData.time * 3 + enemy.position.z * 0.1) * 25 * dt;
    enemy.position.y += Math.cos(gameData.time * 2 + enemy.position.z * 0.05) * 12 * dt;
  }
  
  // Occasional shooting
  if (gameData.time - enemy.lastShot > 2 && Math.random() > 0.98) {
    fireEnemyWeapon(enemy);
    enemy.lastShot = gameData.time;
  }
}

function fireEnemyWeapon(enemy) {
  try {
    const laser = trackMesh(createSphere(0.12, 0xFF3300, [
      enemy.position.x, 
      enemy.position.y, 
      enemy.position.z + 1
    ]));
    
    gameData.projectiles.push({
      mesh: laser,
      position: { ...enemy.position },
      velocity: { x: 0, y: 0, z: 25 },
      friendly: false,
      damage: 15,
      life: 2.0
    });
    
  } catch (e) {
    console.warn('Enemy weapon error:', e);
  }
}

// === PROJECTILE SYSTEM ===
function updateProjectiles(dt) {
  for (let i = gameData.projectiles.length - 1; i >= 0; i--) {
    const proj = gameData.projectiles[i];
    
    // Move projectile
    proj.position.x += proj.velocity.x * dt;
    proj.position.y += proj.velocity.y * dt;
    proj.position.z += proj.velocity.z * dt;
    
    proj.life -= dt;
    
    if (proj.mesh) {
      setPosition(proj.mesh, proj.position.x, proj.position.y, proj.position.z);
    }
    
    // Collision detection
    if (proj.friendly) {
      // Player projectiles vs enemies
      for (let j = gameData.enemies.length - 1; j >= 0; j--) {
        const enemy = gameData.enemies[j];
        const distance = Math.sqrt(
          Math.pow(proj.position.x - enemy.position.x, 2) +
          Math.pow(proj.position.y - enemy.position.y, 2) +
          Math.pow(proj.position.z - enemy.position.z, 2)
        );
        
        if (distance < 2.5) {
          // Hit enemy!
          enemy.health -= proj.damage;
          
          // Score and effects
          gameData.score += 50;
          createHitEffect(enemy.position.x, enemy.position.y, enemy.position.z);
          
          // Remove projectile
          if (proj.mesh) destroyMesh(proj.mesh);
          gameData.projectiles.splice(i, 1);
          
          // Check if enemy destroyed
          if (enemy.health <= 0) {
            gameData.score += enemy.type === 'bomber' ? 300 : enemy.type === 'interceptor' ? 150 : 200;
            gameData.kills++;
            createExplosion(enemy.position.x, enemy.position.y, enemy.position.z);
            console.log(`💥 ${enemy.type} destroyed! +${enemy.type === 'bomber' ? 300 : enemy.type === 'interceptor' ? 150 : 200} points`);
          }
          
          break;
        }
      }
    } else {
      // Enemy projectiles vs player
      const player = gameData.arwing;
      const distance = Math.sqrt(
        Math.pow(proj.position.x - player.position.x, 2) +
        Math.pow(proj.position.y - player.position.y, 2) +
        Math.pow(proj.position.z - player.position.z, 2)
      );
      
      if (distance < 2.0) {
        // Player hit!
        gameData.health -= proj.damage;
        gameData.shields = Math.max(0, gameData.shields - proj.damage);
        
        createHitEffect(player.position.x, player.position.y, player.position.z);
        
        // Remove projectile
        if (proj.mesh) destroyMesh(proj.mesh);
        gameData.projectiles.splice(i, 1);
        
        console.log(`💥 Player hit! Health: ${gameData.health}, Shields: ${gameData.shields}`);
        continue;
      }
    }
    
    // Remove if out of range or lifetime expired
    if (proj.life <= 0 || Math.abs(proj.position.z) > 100) {
      if (proj.mesh) destroyMesh(proj.mesh);
      gameData.projectiles.splice(i, 1);
    }
  }
}

function createHitEffect(x, y, z) {
  for (let i = 0; i < 10; i++) {
    gameData.particles.push({
      position: { 
        x: x + (Math.random() - 0.5) * 2,
        y: y + (Math.random() - 0.5) * 2,
        z: z + (Math.random() - 0.5) * 2
      },
      velocity: {
        x: (Math.random() - 0.5) * 15,
        y: (Math.random() - 0.5) * 15,
        z: (Math.random() - 0.5) * 10
      },
      life: 0.8,
      maxLife: 0.8,
      color: 0xFF6600,
      size: Math.random() * 0.4 + 0.3
    });
  }
}

function createExplosion(x, y, z) {
  for (let i = 0; i < 25; i++) {
    gameData.particles.push({
      position: { 
        x: x + (Math.random() - 0.5) * 3,
        y: y + (Math.random() - 0.5) * 3,
        z: z + (Math.random() - 0.5) * 3
      },
      velocity: {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 15
      },
      life: 1.2,
      maxLife: 1.2,
      color: Math.random() > 0.5 ? 0xFF3300 : 0xFF8800,
      size: Math.random() * 0.6 + 0.4
    });
  }
}

// === PARTICLE SYSTEM ===
function updateParticles(dt) {
  for (let i = gameData.particles.length - 1; i >= 0; i--) {
    const p = gameData.particles[i];
    
    // Update physics
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    p.position.z += p.velocity.z * dt;
    
    // Apply gravity and drag
    p.velocity.y -= 8 * dt;
    p.velocity.x *= 0.95;
    p.velocity.y *= 0.95;
    p.velocity.z *= 0.95;
    
    // Age particle
    p.life -= dt;
    
    if (p.life <= 0) {
      gameData.particles.splice(i, 1);
    }
  }
}

// updateStarfield duplicate removed - already defined above at line 385

function updateSpaceFloor(dt) {
  // Simple, stable starfield update - no more crashes!
  updateStarfield(dt);
  
  // Animate all space elements with Crystal Cathedral effects!
  for (let element of gameData.spaceFloor) {
    if (element.mesh) {
      // Move toward player
      element.customZ += scrollSpeed * dt;
      
      let y = -58; // Default height
      let x = element.x;
      
      // SPECTACULAR animations for different element types
      if (element.type === 'pillar') {
        // Crystal pillars pulse with holographic energy
        element.glowPhase += dt * 2;
        const glow = Math.sin(element.glowPhase) * 0.5 + 0.5;
        y = element.height/2 - 60 + Math.sin(element.glowPhase * 0.5) * 2;
        
        // Update pillar cap if it exists
        if (element.cap) {
          setPosition(element.cap, x, element.height - 40 + Math.sin(element.glowPhase) * 3, element.customZ);
        }
      } else if (element.type === 'crystal') {
        // Floating crystals with complex motion
        element.floatPhase += dt * 1.5;
        y = element.originalY + Math.sin(element.floatPhase) * 8;
        x = element.x + Math.cos(element.floatPhase * 0.7) * 5;
      } else if (element.type === 'horizontal' || element.type === 'vertical') {
        // Holographic grid lines pulse
        element.glowPhase += dt * 4;
        const pulseIntensity = Math.sin(element.glowPhase) * 0.3 + 0.7;
        y = -55 + Math.sin(element.glowPhase) * 2;
        
        // Change color cycling
        const intensity = Math.sin(element.glowPhase * 2) * 0.5 + 0.5;
        // Note: We can't easily change mesh colors in real-time, but the bobbing looks great
      }
      
      setPosition(element.mesh, x, y, element.customZ);
      
      // Reset when element passes the player
      if (element.customZ > 100) {
        element.customZ = element.originalZ - 200;
      }
    }
  }
  
  // Animate atmospheric particles like Crystal Cathedral
  if (gameData.atmosphericParticles) {
    for (let particle of gameData.atmosphericParticles) {
      if (particle.mesh) {
        // Move particles toward player
        particle.customZ += particle.speed * dt;
        
        // Floating motion like Crystal Cathedral
        particle.phase += dt * 2;
        const floatY = particle.originalY + Math.sin(particle.phase) * 6;
        const driftX = particle.x + Math.cos(particle.phase * 0.5) * 4;
        
        setPosition(particle.mesh, driftX, floatY, particle.customZ);
        
        // Reset when too close
        if (particle.customZ > 40) {
          particle.customZ = particle.originalZ - 200;
          particle.x = (Math.random() - 0.5) * 300;
          particle.originalY = (Math.random() - 0.5) * 80;
        }
      }
    }
  }
}

function updateCamera(dt) {
  // Smooth camera follow
  const target = gameData.arwing.position;
  const cam = gameData.camera;
  
  const targetX = target.x * 0.4;
  const targetY = target.y * 0.3 + 5;
  const targetZ = target.z + 18;
  
  cam.position.x += (targetX - cam.position.x) * cam.followSmoothing;
  cam.position.y += (targetY - cam.position.y) * cam.followSmoothing;
  cam.position.z += (targetZ - cam.position.z) * cam.followSmoothing;
  
  // Camera shake
  if (cam.shake > 0) {
    cam.shake -= dt * 3;
    const intensity = cam.shakeIntensity * cam.shake;
    
    const shakeX = (Math.random() - 0.5) * intensity;
    const shakeY = (Math.random() - 0.5) * intensity;
    const shakeZ = (Math.random() - 0.5) * intensity * 0.5;
    
    if (typeof setCameraPosition === 'function') {
      setCameraPosition(
        cam.position.x + shakeX,
        cam.position.y + shakeY,
        cam.position.z + shakeZ
      );
    }
  } else {
    if (typeof setCameraPosition === 'function') {
      setCameraPosition(cam.position.x, cam.position.y, cam.position.z);
    }
  }
}

function updateEffects(dt) {
  // Screen flash effect
  if (gameData.effects.screenFlash > 0) {
    gameData.effects.screenFlash -= dt * 4;
  }
  
  // Energy regeneration
  if (gameData.energy < 100) {
    gameData.energy = Math.min(100, gameData.energy + 20 * dt);
  }
  
  // Shield regeneration (if not taking damage)
  if (gameData.shields < 100 && gameData.time - (gameData.lastDamageTime || 0) > 3) {
    gameData.shields = Math.min(100, gameData.shields + 15 * dt);
  }
}

function updateTargetingSystem() {
  // Update targeting based on mouse position
  // This would be used for more advanced targeting mechanics
}

// === DRAWING FUNCTIONS ===
function drawGameEnvironment() {
  // Deep space background with slight blue tint
  cls(0x000015);
  
  // Advanced starfield
  drawAdvancedStarfield();
  
  // 3D space floor and objects render automatically
  
  // Particle effects overlay
  drawParticleEffects();
}

function drawParticleEffects() {
  for (let p of gameData.particles) {
    if (p.position.z > -50 && p.position.z < 50) {
      // 3D to 2D projection
      const depth = Math.abs(p.position.z) + 10;
      const screenX = 320 + (p.position.x / depth) * 600;
      const screenY = 180 + (p.position.y / depth) * 600;
      
      if (screenX > -20 && screenX < 660 && screenY > -20 && screenY < 380) {
        const alpha = Math.floor(255 * (p.life / p.maxLife));
        const size = p.size * (30 / depth);
        
        rect(screenX - size/2, screenY - size/2, size, size, rgba8(
          (p.color >> 16) & 0xFF,
          (p.color >> 8) & 0xFF,
          p.color & 0xFF,
          alpha
        ), true);
      }
    }
  }
}

function drawProfessionalHUD() {
  try {
    // Deserted Space style HUD - clean and minimal
    
    // Large score display (top center)
    drawDesertedSpaceScore();
    
    // Health indicator (bottom left)
    drawDesertedSpaceHealth();
    
    // Simple crosshair (center)
    drawDesertedSpaceCrosshair();
    
    // Speed/status indicators (top corners)
    drawDesertedSpaceStatus();
    
    // Enemy count (top right)
    drawDesertedSpaceEnemyCount();
    
  } catch (e) {
    console.warn('HUD draw error:', e);
  }
}

function drawDesertedSpaceScore() {
  // Large, prominent score like Deserted Space
  const scoreText = gameData.score.toString().padStart(8, '0');
  const scorePulse = Math.sin(gameData.time * 2) * 0.2 + 0.8;
  
  // Background for score
  rect(250, 10, 140, 40, rgba8(0, 0, 0, 100), true);
  rect(250, 10, 140, 40, rgba8(0, 255, 100, 150), false);
  
  // Score text - large and bright
  print('SCORE', 260, 18, rgba8(255, 255, 255, 200));
  print(scoreText, 260, 32, rgba8(0, 255, 0, Math.floor(255 * scorePulse)));
}

function drawDesertedSpaceHealth() {
  // Simple health bar like Deserted Space
  const healthWidth = (gameData.health / 100) * 120;
  
  rect(20, 320, 130, 25, rgba8(20, 20, 20, 180), true);
  rect(20, 320, 130, 25, rgba8(100, 100, 100, 200), false);
  
  // Health bar color
  let healthColor = rgba8(0, 255, 0, 200);
  if (gameData.health < 50) healthColor = rgba8(255, 255, 0, 200);
  if (gameData.health < 25) healthColor = rgba8(255, 0, 0, 200);
  
  rect(25, 325, healthWidth, 15, healthColor, true);
  print('HULL', 30, 328, rgba8(255, 255, 255, 255));
}

function drawDesertedSpaceCrosshair() {
  // Simple, clean crosshair
  const centerX = 320, centerY = 180;
  const crosshairColor = rgba8(0, 255, 0, 150);
  
  // Main cross
  line(centerX - 20, centerY, centerX + 20, centerY, crosshairColor);
  line(centerX, centerY - 20, centerX, centerY + 20, crosshairColor);
  
  // Center dot
  rect(centerX - 2, centerY - 2, 4, 4, rgba8(255, 255, 255, 255), true);
}

function drawDesertedSpaceStatus() {
  // Top left - Wave info
  print(`WAVE ${gameData.wave}`, 20, 20, rgba8(255, 255, 255, 200));
  print(`ENEMIES: ${gameData.enemies.length}`, 20, 35, rgba8(255, 200, 0, 200));
  
  // Top right - Speed
  const speed = Math.floor(gameData.arwing.speed || 25);
  print(`SPEED: ${speed}`, 500, 20, rgba8(0, 200, 255, 200));
  
  if (gameData.arwing.boost) {
    print('BOOST', 500, 35, rgba8(255, 100, 0, 255));
  }
}

function drawDesertedSpaceEnemyCount() {
  // Enemy radar dots - simple version
  const radarX = 580, radarY = 80;
  const radarSize = 40;
  
  // Radar background
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 20, 0, 100), true);
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 255, 0, 150), false);
  
  // Player center
  rect(radarX - 1, radarY - 1, 2, 2, rgba8(0, 255, 255, 255), true);
  
  // Enemy dots
  for (let i = 0; i < Math.min(gameData.enemies.length, 8); i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dotX = radarX + Math.cos(angle) * 15;
    const dotY = radarY + Math.sin(angle) * 15;
    rect(dotX - 1, dotY - 1, 2, 2, rgba8(255, 0, 0, 200), true);
  }
}

function drawHealthPanel() {
  // Enhanced health bar with prominent styling
  rect(15, 15, 180, 35, rgba8(20, 20, 20, 220), true);
  rect(15, 15, 180, 35, rgba8(100, 100, 100, 255), false);
  rect(17, 17, 176, 31, rgba8(50, 50, 50, 150), false);
  
  // Health bar with glow effect
  const healthWidth = (gameData.health / 100) * 170;
  let healthColor = gameData.health > 60 ? rgba8(0, 255, 0, 220) : 
                   gameData.health > 30 ? rgba8(255, 255, 0, 220) : rgba8(255, 0, 0, 220);
  
  // Add pulsing effect for low health
  if (gameData.health < 30) {
    const pulse = Math.sin(gameData.time * 8) * 0.3 + 0.7;
    healthColor = rgba8(255, Math.floor(100 * pulse), 0, 220);
  }
  
  rect(20, 20, healthWidth, 25, healthColor, true);
  
  // Health text
  print('HULL INTEGRITY', 25, 23, rgba8(255, 255, 255, 255));
  print(`${Math.floor(gameData.health)}%`, 150, 35, rgba8(255, 255, 255, 255));
}

function drawShieldsPanel() {
  // Enhanced shields bar
  rect(15, 55, 180, 30, rgba8(20, 20, 20, 220), true);
  rect(15, 55, 180, 30, rgba8(100, 100, 100, 255), false);
  
  const shieldWidth = (gameData.shields / 100) * 170;
  
  // Shield color with energy effect
  const shieldPulse = Math.sin(gameData.time * 6) * 0.2 + 0.8;
  const shieldColor = rgba8(0, Math.floor(150 * shieldPulse), 255, 200);
  
  rect(20, 60, shieldWidth, 20, shieldColor, true);
  
  // Shield text
  print('SHIELD POWER', 25, 63, rgba8(255, 255, 255, 255));
  print(`${Math.floor(gameData.shields)}%`, 150, 75, rgba8(255, 255, 255, 255));
}

function drawEnergyPanel() {
  // Enhanced energy bar
  rect(15, 90, 180, 30, rgba8(20, 20, 20, 220), true);
  rect(15, 90, 180, 30, rgba8(100, 100, 100, 255), false);
  
  const energyWidth = (gameData.energy / 100) * 170;
  
  // Energy color with charging effect
  const energyPulse = Math.sin(gameData.time * 5) * 0.3 + 0.7;
  const energyColor = rgba8(255, Math.floor(150 * energyPulse), 0, 200);
  
  rect(20, 95, energyWidth, 20, energyColor, true);
  
  print('WEAPON ENERGY', 25, 98, rgba8(255, 255, 255, 255));
  print(`${Math.floor(gameData.energy)}%`, 150, 110, rgba8(255, 255, 255, 255));
}

function drawScorePanel() {
  // Large, prominent score display like Deserted Space
  rect(450, 15, 180, 80, rgba8(10, 10, 30, 200), true);
  rect(450, 15, 180, 80, rgba8(0, 255, 255, 150), false);
  rect(452, 17, 176, 76, rgba8(0, 150, 255, 80), false);
  
  // Big, bright score text
  print('SCORE', 460, 25, rgba8(0, 255, 255, 255));
  
  // Animate score display
  const scorePulse = Math.sin(gameData.time * 4) * 0.2 + 0.8;
  const scoreColor = rgba8(255, Math.floor(255 * scorePulse), 0, 255);
  print(gameData.score.toString(), 460, 45, scoreColor);
  
  print(`WAVE ${gameData.wave}`, 460, 65, rgba8(150, 255, 150, 255));
  print(`KILLS: ${gameData.kills}`, 460, 80, rgba8(255, 200, 100, 255));
}

function drawStatusPanel() {
  // Enhanced status indicators
  let y = 105;
  
  // Speed indicator
  const speed = Math.floor(gameData.arwing.speed || 15);
  print(`SPEED: ${speed}`, 460, y, rgba8(0, 200, 255, 255));
  y += 15;
  
  if (gameData.arwing.boost) {
    const boostPulse = Math.sin(gameData.time * 10) * 0.5 + 0.5;
    print('>>> BOOST ACTIVE <<<', 460, y, rgba8(255, Math.floor(200 * boostPulse), 0, 255));
    y += 15;
  }
  
  if (gameData.shields < 25) {
    const alertPulse = Math.sin(gameData.time * 8) * 0.5 + 0.5;
    print('!!! LOW SHIELDS !!!', 460, y, rgba8(255, Math.floor(100 * alertPulse), 0, 255));
    y += 15;
  }
  
  if (gameData.energy < 20) {
    print('LOW WEAPON ENERGY', 460, y, rgba8(255, 255, 0, 255));
    y += 15;
  }
  
  // Combat status
  if (gameData.enemies.length > 0) {
    print(`TARGETS: ${gameData.enemies.length}`, 460, y, rgba8(255, 100, 100, 255));
  }
}

function drawTargetingHUD() {
  // Large, prominent central crosshair
  const centerX = 320, centerY = 180;
  
  // Dynamic crosshair with bright colors
  const pulse = Math.sin(gameData.time * 8) * 0.4 + 0.6;
  const crosshairColor = rgba8(0, 255, 100, Math.floor(pulse * 255));
  
  // Main crosshair - larger and more visible
  line(centerX - 25, centerY, centerX + 25, centerY, crosshairColor);
  line(centerX, centerY - 25, centerX, centerY + 25, crosshairColor);
  
  // Inner crosshair
  line(centerX - 10, centerY, centerX + 10, centerY, rgba8(255, 255, 255, 200));
  line(centerX, centerY - 10, centerX, centerY + 10, rgba8(255, 255, 255, 200));
  
  // Animated targeting brackets
  const bracketSize = 12;
  const bracketOffset = Math.sin(gameData.time * 6) * 3 + 30;
  const bracketColor = rgba8(0, 255, 255, Math.floor(pulse * 255));
  
  // Top-left bracket
  line(centerX - bracketOffset, centerY - bracketOffset, 
       centerX - bracketOffset + bracketSize, centerY - bracketOffset, bracketColor);
  line(centerX - bracketOffset, centerY - bracketOffset, 
       centerX - bracketOffset, centerY - bracketOffset + bracketSize, bracketColor);
  
  // Top-right bracket
  line(centerX + bracketOffset, centerY - bracketOffset, 
       centerX + bracketOffset - bracketSize, centerY - bracketOffset, bracketColor);
  line(centerX + bracketOffset, centerY - bracketOffset, 
       centerX + bracketOffset, centerY - bracketOffset + bracketSize, bracketColor);
  
  // Bottom-left bracket
  line(centerX - bracketOffset, centerY + bracketOffset, 
       centerX - bracketOffset + bracketSize, centerY + bracketOffset, bracketColor);
  line(centerX - bracketOffset, centerY + bracketOffset, 
       centerX - bracketOffset, centerY + bracketOffset - bracketSize, bracketColor);
  
  // Bottom-right bracket
  line(centerX + bracketOffset, centerY + bracketOffset, 
       centerX + bracketOffset - bracketSize, centerY + bracketOffset, bracketColor);
  line(centerX + bracketOffset, centerY + bracketOffset, 
       centerX + bracketOffset, centerY + bracketOffset - bracketSize, bracketColor);
  
  // Weapon ready indicator
  if (gameData.energy > 10) {
    print('WEAPONS READY', 270, 150, rgba8(0, 255, 0, Math.floor(pulse * 255)));
  } else {
    print('RECHARGING...', 275, 150, rgba8(255, 100, 0, 255));
  }
}

function drawAdvancedRadar() {
  const radarX = 550, radarY = 280;
  const radarSize = 60;
  
  // Radar background
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 50, 0, 150), true);
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 255, 0, 255), false);
  
  // Grid lines
  line(radarX - radarSize/2, radarY, radarX + radarSize/2, radarY, rgba8(0, 150, 0, 100));
  line(radarX, radarY - radarSize/2, radarX, radarY + radarSize/2, rgba8(0, 150, 0, 100));
  
  // Player dot (center)
  rect(radarX - 2, radarY - 2, 4, 4, rgba8(0, 255, 255, 255), true);
  
  // Enemy dots
  for (let enemy of gameData.enemies) {
    const relX = (enemy.position.x / 50) * (radarSize/2);
    const relZ = (enemy.position.z / 100) * (radarSize/2);
    const dotX = radarX + relX;
    const dotY = radarY + relZ;
    
    if (Math.abs(relX) < radarSize/2 && Math.abs(relZ) < radarSize/2) {
      const color = enemy.type === 'bomber' ? rgba8(255, 100, 0, 255) : rgba8(255, 0, 0, 255);
      rect(dotX - 1, dotY - 1, 3, 3, color, true);
    }
  }
}

function drawGameOverScreen() {
  cls(0x000011);
  
  // Game over text
  print('MISSION FAILED', 240, 100, rgba8(255, 0, 0, 255));
  print(`FINAL SCORE: ${gameData.score}`, 220, 130, rgba8(255, 255, 0, 255));
  print(`WAVES COMPLETED: ${gameData.wave - 1}`, 200, 160, rgba8(0, 255, 255, 255));
  print(`ENEMIES DESTROYED: ${gameData.kills}`, 180, 190, rgba8(150, 255, 150, 255));
  
  print('PRESS SPACE TO RESTART', 210, 240, rgba8(255, 255, 255, 255));
}

// Initialize the game
console.log('🚀 PROFESSIONAL STAR FOX NOVA 64 - Loading...');