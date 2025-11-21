// SHADOW NINJA 3D - True 3.5D Ninja Platformer  
// Nintendo 64 / PlayStation style 3D ninja action with parkour and stealth
// Inspired by Strider, Shinobi, and Ninja Gaiden
// VERSION: v006-NUCLEAR-CACHE-BUST-${Date.now()}

// 🚨 CACHE DETECTION: If you see logs repeating in console, browser cache is stuck!
const CACHE_BUSTER_V006 = 'FRESH_CODE_LOADED_' + Date.now();
console.log('🚀🚀🚀 CACHE BUSTER V006 LOADED:', CACHE_BUSTER_V006);

// Helper function for 3D vectors
function vec3(x, y, z) {
  return { x: x, y: y, z: z };
}

// Game state
let gameTime = 0;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let startScreenTime = 0;
let uiButtons = [];
let score = 0;
let level = 1;
let combo = 0;
let comboTimer = 0;

// 🔥 DEFINE BUTTON CALLBACK AT MODULE LEVEL TO AVOID SCOPE ISSUES
const startGameCallback = () => {
  console.log('🎯🎯🎯 START BUTTON CLICKED V006! FRESH CODE! 🎯🎯🎯');
  console.log('📊 BEFORE: gameState =', gameState);
  gameState = 'playing';
  console.log('📊 AFTER: gameState =', gameState);
  console.log('✅✅✅ STATE CHANGED TO PLAYING! ✅✅✅');
};

// 3D Game objects
let playerKnight = null;
let platforms = [];
let enemies = [];
let coins = [];
let particles = [];
let environment = [];

// Player state - NINJA POWERS!
let player = {
  x: 0, y: 0, z: 0,
  vx: 0, vy: 0, vz: 0,
  onGround: false,
  health: 100,
  energy: 100,
  coins: 0,
  shuriken: 20,
  facingRight: true,
  jumpPower: 10,
  speed: 8,
  doubleJump: true,
  attackCooldown: 0,
  // Ninja abilities
  wallRunning: false,
  wallRunTime: 0,
  maxWallRunTime: 1.5,
  dashCooldown: 0,
  dashDuration: 0,
  crouching: false,
  stealth: false,
  grapplePoints: [],
  grappling: false,
  grappleTarget: null,
  airDashAvailable: true,
  slideDuration: 0
};

// Camera state
let camera = {
  x: 0, y: 8, z: 15,
  targetX: 0, targetY: 5, targetZ: 0,
  smoothing: 0.1
};

export function init() {
  console.log('��� KNIGHT PLATFORMER V006 INIT START 🚀🚀🚀');
  console.log('📦 gameState BEFORE init:', gameState);
  console.log('�️ Clearing arrays. Current particles:', particles.length);
  
  // Clear all arrays to prevent mesh errors
  enemies = []
  coins = []
  particles = []
  platforms = []
  environment = []
  playerKnight = null
  
  // Reset player state completely
  // Start ON the starting platform - PERFECT ONBOARDING!
  player = {
    pos: vec3(-10, 2, 0),  // Start on LEFT side of ground platform at comfortable height
    vel: vec3(0, 0, 0),
    yaw: 0,  // Face RIGHT to see the level ahead
    grounded: true,  // Start grounded so player doesn't fall!
    attacking: false,
    attackTime: 0,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    isDashing: false,
    dashTime: 0,
    wallRunning: false,
    wallRunTime: 0,
    wallSide: 0,
    doubleJumpAvailable: true,
    grappling: false,
    grappleTarget: null,
    sliding: false,
    slideTime: 0,
    shurikenCount: 10
  }
  
  score = 0
  combo = 0
  comboTimer = 0
  gameTime = 0
  level = 1
  // 🔥 DON'T RESET gameState HERE - button callback may have already changed it!
  // gameState = 'start'  // ← REMOVED - was resetting state after button click!
  startScreenTime = 0
  
  // Create start button - callback is defined at module level
  uiButtons = [];
  
  uiButtons.push(
    createButton(210, 310, 220, 50, '▶ START GAME', startGameCallback, {
      normalColor: rgba8(150, 80, 255, 255),
      hoverColor: rgba8(180, 110, 255, 255),
      pressedColor: rgba8(120, 60, 220, 255)
    })
  );
  
  // Force canvas focus for keyboard events
  console.log('🎮 Focusing canvas for input...')
  const canvas = document.querySelector('canvas')
  if (canvas) {
    canvas.focus()
    canvas.tabIndex = 1
  }
  
  // Create game objects and store references
  playerKnight = createNinjaPlayer()
  createNinjaWorld()
  createPlatforms()
  createGrapplePoints()
  spawnEnemies()
  spawnCoins()
  
  // 📷 OPTIMAL SIDE-SCROLLER CAMERA (like Strider/Shinobi)
  // Camera positioned for perfect gameplay view!
  camera.x = player.pos.x;
  camera.y = 6;  // Eye-level height for immersive side-scrolling
  camera.z = 18;  // Closer for better visibility and control
  camera.targetX = player.pos.x;
  camera.targetY = 5;  // Look slightly ahead
  camera.targetZ = 0;  // Straight ahead on the action plane
  
  // Set initial camera position
  setCameraPosition(camera.x, camera.y, camera.z);
  setCameraTarget(camera.targetX, camera.targetY, camera.targetZ);
  
  // 💡 MAXIMUM BRIGHTNESS - Crystal clear visibility!
  setAmbientLight(0xffffff);  // FULL WHITE ambient - no shadows!
  setLightColor(0xffffff);     // FULL WHITE directional light
  setLightDirection(0.5, -0.5, 0.8);  // From front and above for maximum visibility
  
  console.log('✅✅✅ KNIGHT PLATFORMER V006 INIT COMPLETE ✅✅✅');
  console.log('📦 gameState AFTER init:', gameState);
  console.log('📷 Camera initialized at:', camera.x, camera.y, camera.z);
}

function initStartScreen() {
  uiButtons = [];
  console.log('🥷 Start screen initialized');
}

export function update() {
  const dt = 1/60;
  
  console.log('🔄 UPDATE called - gameState:', gameState, 'playerKnight:', playerKnight ? 'exists' : 'null');
  
  // Safety check: Don't update if game objects aren't initialized yet
  if (playerKnight === null) {
    // Game not initialized yet, skip this frame
    console.log('⚠️ UPDATE: playerKnight is null, returning early');
    return;
  }
  
  // Handle start screen
  if (gameState === 'start') {
    startScreenTime += dt;
    
    // DEBUG: Log keyboard state
    const enterDown = isKeyDown('Enter');
    const spaceDown = isKeyDown('Space');
    if (enterDown || spaceDown) {
      console.log('⌨️ Keyboard detected! Enter:', enterDown, 'Space:', spaceDown);
    }
    
    // Update UI buttons (may change gameState via callback)
    updateAllButtons();
    
    // ✨ CRITICAL: Re-check gameState IMMEDIATELY after updateAllButtons()
    // The button callback executes SYNCHRONOUSLY and may have changed gameState
    if (gameState !== 'start') {
      console.log('🎮🎮🎮 Button changed gameState to:', gameState, '- starting game!');
      // DON'T return - fall through to playing state below
    } else {
      // Still on start screen - check for keyboard/gamepad input
      // KEYBOARD FALLBACK: Press ENTER or SPACE to start
      // Use isKeyDown (held) instead of isKeyPressed (transition) for more reliable detection
      if (isKeyDown('Enter') || isKeyDown(' ') || isKeyDown('Space') || btnp(0) || btnp(1)) {
        console.log('🥷🥷🥷 Starting Shadow Ninja 3D via keyboard or button!');
        gameState = 'playing';
        console.log('🎮🎮🎮 Game started! State:', gameState);
        // Fall through to playing state
      } else {
        // Check for any OTHER button press to start
        for (let i = 2; i < 10; i++) {
          if (btnp(i)) {
            console.log(`🥷 Starting Shadow Ninja 3D via button ${i}!`);
            gameState = 'playing';
            console.log('🎮 Game started! State:', gameState);
            break;
          }
        }
        
        // ✨ CRITICAL FIX: Only return if STILL on start screen after ALL checks (including UI button callback)
        if (gameState === 'start') {
          console.log('📺 UPDATE: Start screen done, returning');
          return;
        } else {
          console.log('🚀 gameState changed to:', gameState, '- continuing to game!');
        }
      }
    }
  }
  
  // If we reach here and still on start screen somehow, return
  if (gameState === 'start') {
    return;
  }
  
  // Playing state - main game loop
  gameTime += dt;
  
  // Update input
  updateInput(dt);
  
  // Update player
  updatePlayer(dt);
  
  // Update enemies
  updateEnemies(dt);
  
  // Update coins
  updateCoins(dt);
  
  // Update particles
  updateParticles(dt);
  
  // Update camera to follow player (CRITICAL for 2.5D side-scroller view)
  updateCamera(dt);
  
  // Update combo timer
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      combo = 0;
    }
  }
  
  // Check for player death
  if (player.health <= 0) {
    gameState = 'gameover';
    console.log('💀 Game Over! Final Score:', score);
  }
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // 3D scene is automatically rendered by GPU backend
  // Draw UI overlay using 2D API
  drawUI();
}

function drawStartScreen() {
  // Dark background
  rect(0, 0, 640, 360, rgba8(10, 5, 30, 255), true);
  
  // Title with glow effect
  print('SHADOW NINJA 3D', 180, 70, rgba8(180, 80, 255, 255));
  
  // Subtitle
  const pulse = Math.sin(startScreenTime * 3) * 0.25 + 0.75;
  print('Strider-Style 3.5D Ninja Platformer', 160, 100, rgba8(200, 150, 255, Math.floor(pulse * 255)));
  
  // START PROMPT - Make it obvious
  const promptPulse = Math.sin(startScreenTime * 5) * 0.5 + 0.5;
  print('PRESS ENTER OR SPACE TO START', 190, 120, rgba8(255, 255, 100, Math.floor(promptPulse * 255)));
  
  // Controls panel
  rect(100, 140, 440, 160, rgba8(20, 10, 40, 220), true);
  rect(100, 140, 440, 160, rgba8(150, 80, 255, 255), false);
  
  // Controls title
  print('NINJA ABILITIES:', 220, 155, rgba8(255, 200, 255, 255));
  
  // Controls - two columns
  print('ARROWS = Move', 120, 180, rgba8(200, 200, 255, 255));
  print('DOWN = Slide', 120, 200, rgba8(200, 200, 255, 255));
  print('UP = Jump/Double Jump', 120, 220, rgba8(200, 200, 255, 255));
  print('Z = Attack', 120, 240, rgba8(200, 200, 255, 255));
  print('X = Dash/Air Dash', 120, 260, rgba8(200, 200, 255, 255));
  
  print('C = Throw Shuriken', 340, 180, rgba8(200, 200, 255, 255));
  print('G = Grappling Hook', 340, 200, rgba8(200, 200, 255, 255));
  print('Wall Running Active', 340, 220, rgba8(150, 255, 150, 255));
  print('Combo System', 340, 240, rgba8(255, 255, 150, 255));
  print('Energy Management', 340, 260, rgba8(150, 200, 255, 255));
  
  // Draw start button
  drawAllButtons();
}

function createNinjaPlayer() {
  // 🥷 BRIGHT NINJA - Highly visible and COOL!
  
  // Main body - BRIGHT BLUE ninja suit
  const body = createCube(1, 0x4466ff, [0, 0, 0]);  // Bright blue suit
  setScale(body, 1.2, 2, 0.9);  // Tall and athletic
  
  // Chest armor - BRIGHT CYAN GLOWING plate
  const chest = createCube(0.8, 0x44ffff, [0, 0.4, 0.46]);  // Bright cyan chest plate
  setScale(chest, 1.1, 1.2, 0.1);
  
  // Head - BRIGHT GRAY helmet
  const head = createCube(0.7, 0x888888, [0, 1.5, 0]);  // Gray ninja helmet
  setScale(head, 0.9, 0.9, 0.9);
  
  // GLOWING YELLOW VISOR - highly visible eyes
  const visor = createCube(0.8, 0xffff44, [0, 1.5, 0.36]);  // Yellow glowing visor
  setScale(visor, 0.85, 0.3, 0.05);
  
  // BRIGHT RED HEADBAND - flowing behind
  const headband = createCube(1.5, 0xff4444, [0, 1.7, -0.4]);  // Bright red ribbon
  setScale(headband, 0.15, 0.1, 1.2);
  
  // BRIGHT PURPLE ENERGY KATANA - glowing blade
  const katana = createCube(0.08, 0xdd88ff, [-0.5, 0.9, -0.4]);  // Bright purple katana
  setScale(katana, 0.08, 2, 0.08);
  setRotation(katana, 0, 0, -0.4);  // Angled on back
  
  // Katana handle - BRIGHT SILVER
  const katanaHandle = createCube(0.12, 0xdddddd, [-0.5, -0.3, -0.4]);
  setScale(katanaHandle, 0.12, 0.4, 0.12);
  setRotation(katanaHandle, 0, 0, -0.4);
  
  // BRIGHT CYAN SCARF - flowing behind
  const scarf = createCube(0.4, 0x44ddff, [0, 1, -0.6]);  // Bright cyan trail
  setScale(scarf, 0.7, 1.2, 0.15);
  
  // Arms - BRIGHT BLUE with energy
  const leftArm = createCube(0.3, 0x4466ff, [-0.7, 0.2, 0]);
  setScale(leftArm, 0.3, 1.3, 0.3);
  
  const rightArm = createCube(0.3, 0x4466ff, [0.7, 0.2, 0]);
  setScale(rightArm, 0.3, 1.3, 0.3);
  
  // BRIGHT arm guards - YELLOW ENERGY
  const leftGuard = createCube(0.32, 0xffff44, [-0.7, -0.3, 0]);
  setScale(leftGuard, 0.35, 0.25, 0.35);
  
  const rightGuard = createCube(0.32, 0xffff44, [0.7, -0.3, 0]);
  setScale(rightGuard, 0.35, 0.25, 0.35);
  
  // Legs - BRIGHT BLUE pants
  const leftLeg = createCube(0.35, 0x4466ff, [-0.4, -1.3, 0]);
  setScale(leftLeg, 0.35, 1.4, 0.35);
  
  const rightLeg = createCube(0.35, 0x4466ff, [0.4, -1.3, 0]);
  setScale(rightLeg, 0.35, 1.4, 0.35);
  
  // Knee guards - BRIGHT YELLOW
  const leftKnee = createCube(0.36, 0xffff44, [-0.4, -1, 0]);
  setScale(leftKnee, 0.38, 0.2, 0.38);
  
  const rightKnee = createCube(0.36, 0xffff44, [0.4, -1, 0]);
  setScale(rightKnee, 0.38, 0.2, 0.38);
  
  // NO AURA - it blocks visibility!
  
  return { 
    body, chest, head, visor, headband, 
    katana, katanaHandle, scarf,
    leftArm, rightArm, leftGuard, rightGuard,
    leftLeg, rightLeg, leftKnee, rightKnee
  };
}

async function createNinjaWorld() {
  // 🌈 BRIGHT COLORFUL WORLD - Maximum visibility!
  
  // BRIGHT BLUE ground - easy to see!
  const ground = createPlane(400, 400, 0x6699ff, [25, -3, 0]);
  setRotation(ground, -Math.PI/2, 0, 0);
  
  // BRIGHT YELLOW grid lines on ground for depth perception
  for (let i = -10; i <= 20; i++) {
    const gridLine = createCube(200, 0.15, 0xffee44, [i * 5, -2.8, 0]);
    setScale(gridLine, 1, 1, 1);
    setRotation(gridLine, -Math.PI/2, 0, 0);
  }
  
  // COLORFUL BUILDINGS - Bright and visible!
  const buildingColors = [
    0xff6688,  // Bright pink
    0x66ff88,  // Bright green
    0x6688ff,  // Bright blue
    0xffaa66,  // Bright orange
    0xaa66ff,  // Bright purple
  ];
  
  // Background buildings - BRIGHT colors!
  for (let i = 0; i < 12; i++) {
    const color = buildingColors[i % buildingColors.length];
    const x = (i - 6) * 15;
    const height = 20 + Math.random() * 15;
    
    // Main building - BRIGHT!
    const building = createCube(8, height, color, [x, height/2 - 3, -40]);
    setScale(building, 1, 1, 1);
    
    // WHITE accent strips for contrast
    for (let j = 0; j < 3; j++) {
      const strip = createCube(8.3, 1, 0xffffff, [
        x, 
        (height/4) * (j + 1) - 3, 
        -39.7
      ]);
      setScale(strip, 1, 1, 1);
    }
  }
  
  // BRIGHT FLOATING PLATFORMS in background
  const bgPlatforms = [
    { x: -15, y: 8, color: 0xff88ff },
    { x: 5, y: 10, color: 0x88ffff },
    { x: 25, y: 9, color: 0xffff88 },
    { x: 40, y: 11, color: 0x88ff88 }
  ];
  
  bgPlatforms.forEach(plat => {
    const platform = createCube(6, 1, plat.color, [plat.x, plat.y, -25]);
    setScale(platform, 1, 1, 1);
  });
  
  // BRIGHT DECORATIVE SPHERES
  for (let i = 0; i < 15; i++) {
    const colors = [0xff8888, 0x88ff88, 0x8888ff, 0xffff88, 0xff88ff, 0x88ffff];
    const orbColor = colors[i % colors.length];
    createSphere(0.8, orbColor, [
      -20 + i * 5,
      4 + Math.sin(i) * 3,
      -15 - Math.cos(i) * 5
    ]);
  }
  
  // BRIGHT YELLOW SUN/LIGHT SOURCE in sky
  createSphere(10, 0xffffaa, [0, 30, -70]);
}

function createPlatforms() {
  platforms = [];
  
  // 🏗️ MAIN GROUND - Long continuous platform for easy side-scrolling!
  const mainGround = {
    mesh: createCube(100, 1, 0x6644ff, [-10, 0, 0]),  // BRIGHT PURPLE main platform!
    x: -10, y: 0, z: 0,
    width: 100, height: 1, depth: 8,
    type: 'ground'
  };
  setScale(mainGround.mesh, 1, 1, 1);
  platforms.push(mainGround);
  
  // Add BRIGHT YELLOW glowing edge to main platform
  const mainEdge = createCube(100, 0.2, 0xffff00, [-10, 1.1, 0]);
  setScale(mainEdge, 1, 1, 1);
  
  // EASY ACCESSIBLE PLATFORMS - Progressive difficulty on the same Z plane (Z=0)!
  const easyPlatforms = [
    // Tutorial section - easy jumps
    { x: -5, y: 3, w: 6, color: 0x88aa66 },
    { x: 2, y: 4.5, w: 5, color: 0x6688aa },
    { x: 8, y: 6, w: 5, color: 0xaa6688 },
    { x: 14, y: 7.5, w: 4.5, color: 0x66aa88 },
    
    // Mid-section - gaining height
    { x: 20, y: 9, w: 5, color: 0xaa8866 },
    { x: 26, y: 10.5, w: 4, color: 0x88aa66 },
    { x: 31, y: 12, w: 4, color: 0x6688aa },
    
    // Upper section - skill jumps
    { x: 37, y: 13, w: 4.5, color: 0xaa6688 },
    { x: 43, y: 14, w: 4, color: 0x66aa88 },
    { x: 48, y: 15, w: 5, color: 0xaa8866 }
  ];
  
  easyPlatforms.forEach((data, i) => {
    const platform = {
      mesh: createCube(data.w, 0.8, data.color, [data.x, data.y, 0]),  // All at Z=0!
      x: data.x, y: data.y, z: 0,
      width: data.w, height: 0.8, depth: 4,
      type: 'floating',
      id: i
    };
    setScale(platform.mesh, 1, 1, 1);
    platforms.push(platform);
    
    // Add BRIGHT WHITE edge to each platform
    const edgeLight = createCube(data.w + 0.1, 0.15, 0xffffff, [data.x, data.y + 0.48, 0]);
    setScale(edgeLight, 1, 1, 1);
    
    // Add BRIGHT YELLOW underglow
    const underglow = createCube(data.w - 0.2, 0.12, 0xffee44, [data.x, data.y - 0.42, 0]);
    setScale(underglow, 1, 1, 1);
  });
  
  // COLLECTIBLE PLATFORMS - coins trail
  const coinPlatforms = [
    { x: 5, y: 2, w: 3 },
    { x: 11, y: 3.5, w: 2.5 },
    { x: 17, y: 5, w: 3 },
    { x: 23, y: 6.5, w: 2.5 }
  ];
  
  coinPlatforms.forEach((data, i) => {
    const platform = {
      mesh: createCube(data.w, 0.5, 0xffaa44, [data.x, data.y, 0]),  // BRIGHT ORANGE platforms!
      x: data.x, y: data.y, z: 0,
      width: data.w, height: 0.5, depth: 3,
      type: 'coin',
      id: i + 100
    };
    setScale(platform.mesh, 1, 1, 1);
    platforms.push(platform);
    
    // BRIGHT YELLOW glow for coin platforms
    const glow = createCube(data.w + 0.2, 0.12, 0xffff44, [data.x, data.y + 0.32, 0]);
    setScale(glow, 1, 1, 1);
  });
}

function createGrapplePoints() {
  player.grapplePoints = [];
  
  // Add grapple points in strategic locations
  const grappleData = [
    { x: 18, y: 12, z: 5 },
    { x: 35, y: 15, z: 8 },
    { x: 20, y: 22, z: -8 },
    { x: -5, y: 24, z: -18 },
    { x: -30, y: 18, z: -10 },
    { x: -40, y: 12, z: 2 }
  ];
  
  grappleData.forEach(data => {
    const point = {
      mesh: createSphere(0.4, 0x00ffff, [data.x, data.y, data.z]),
      x: data.x, y: data.y, z: data.z,
      active: true
    };
    player.grapplePoints.push(point);
  });
}

function spawnEnemies() {
  enemies = [];
  
  // Ground patrol enemies - ON THE SAME Z PLANE as player!
  const enemyPositions = [
    { x: 10, y: 1.5 },
    { x: 25, y: 1.5 },
    { x: 35, y: 1.5 },
    { x: 50, y: 1.5 }
  ];
  
  enemyPositions.forEach((pos, i) => {
    const enemy = {
      mesh: createCube(1, 0xff3355, [pos.x, pos.y, 0]),  // Red cyber-enemies at Z=0!
      x: pos.x, y: pos.y, z: 0,
      vx: -2,  // Move left
      health: 3,
      type: 'patrol',
      patrolRange: 8,
      originalX: pos.x,
      attackCooldown: 0
    };
    setScale(enemy.mesh, 1, 1.5, 1);
    enemies.push(enemy);
    
    // Red glowing eyes
    const leftEye = createSphere(0.15, 0xff0000, [pos.x - 0.3, pos.y + 0.5, 0.51]);
    const rightEye = createSphere(0.15, 0xff0000, [pos.x + 0.3, pos.y + 0.5, 0.51]);
  });
  
  // Flying drones - hovering enemies on same Z plane
  const dronePositions = [
    { x: 18, y: 8 },
    { x: 33, y: 10 },
    { x: 46, y: 12 }
  ];
  
  dronePositions.forEach((pos, i) => {
    const enemy = {
      mesh: createSphere(0.6, 0xff8844, [pos.x, pos.y, 0]),  // Orange drones at Z=0!
      x: pos.x, y: pos.y, z: 0,
      vx: 0, vy: 0, vz: 0,
      health: 2,
      type: 'flyer',
      orbitCenter: { x: pos.x, y: pos.y, z: 0 },
      orbitRadius: 3,
      orbitAngle: i * 2,
      attackCooldown: 0
    };
    enemies.push(enemy);
    
    // Cyan propeller effect
    const propeller = createCube(1.2, 0.1, 0x00ffff, [pos.x, pos.y + 0.7, 0]);
    setScale(propeller, 1, 1, 1);
  });
}

function spawnCoins() {
  coins = [];
  
  // Place coins on platforms
  platforms.forEach((platform, i) => {
    if (i > 8) { // Skip ground platforms
      const coin = {
        mesh: createSphere(0.3, 0xffdd00, [platform.x, platform.y + 1.5, platform.z]),
        x: platform.x, y: platform.y + 1.5, z: platform.z,
        collected: false,
        rotationY: 0,
        bobOffset: Math.random() * Math.PI * 2
      };
      coins.push(coin);
    }
  });
  
  // Bonus coins in hard to reach places
  for (let i = 0; i < 8; i++) {
    const coin = {
      mesh: createSphere(0.25, 0xffaa00, [
        (Math.random() - 0.5) * 60,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 30
      ]),
      x: 0, y: 0, z: 0,
      collected: false,
      rotationY: 0,
      bobOffset: Math.random() * Math.PI * 2
    };
    const pos = getPosition(coin.mesh);
    coin.x = pos[0]; coin.y = pos[1]; coin.z = pos[2];
    coins.push(coin);
  }
}

function updateInput(dt) {
  const moveSpeed = 15;  // Base movement speed
  const dashMultiplier = player.isDashing && player.dashTime > 0 ? 2.5 : 1.0;
  
  // Update timers
  if (player.attackTime > 0) player.attackTime -= dt;
  if (player.dashTime > 0) player.dashTime -= dt;
  if (player.slideTime > 0) player.slideTime -= dt;
  
  // Sliding
  if (player.sliding && player.slideTime > 0) {
    const slideDir = Math.cos(player.yaw);
    player.vel.x = slideDir * moveSpeed * 1.5;
    return; // Override other controls during slide
  } else {
    player.sliding = false;
  }
  
  // Grappling hook movement
  if (player.grappling && player.grappleTarget) {
    const dx = player.grappleTarget.x - player.pos.x;
    const dy = player.grappleTarget.y - player.pos.y;
    const dz = player.grappleTarget.z - player.pos.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (dist > 1.5) {
      const pullSpeed = 20;
      player.vel.x = (dx / dist) * pullSpeed;
      player.vel.y = (dy / dist) * pullSpeed;
      player.vel.z = (dz / dist) * pullSpeed;
    } else {
      player.grappling = false;
      player.grappleTarget = null;
    }
    return; // Override other controls during grapple
  }
  
  // 🎮 SIDE-SCROLLER MOVEMENT - Simple and responsive!
  // Debug - log key states
  const leftPressed = isKeyDown('ArrowLeft');
  const rightPressed = isKeyDown('ArrowRight');
  const spacePressed = isKeyDown('Space');
  
  if (leftPressed || rightPressed || spacePressed) {
    console.log('⌨️ KEYS:', 'Left:', leftPressed, 'Right:', rightPressed, 'Space:', spacePressed);
  }
  
  // Horizontal movement - LEFT/RIGHT arrows
  if (leftPressed) {
    player.vel.x = -moveSpeed * dashMultiplier;
    player.yaw = Math.PI;  // Face left
    console.log('⬅️ MOVING LEFT at speed', player.vel.x);
  } else if (rightPressed) {
    player.vel.x = moveSpeed * dashMultiplier;
    player.yaw = 0;  // Face right
    console.log('➡️ MOVING RIGHT at speed', player.vel.x);
  } else {
    player.vel.x *= 0.8; // Friction - stop quickly
  }
  
  // Z-axis movement locked for true side-scroller feel
  // Player stays on single plane like Strider
  player.vel.z *= 0.9;  // Dampen any z-movement
  
  // Down arrow = crouch/slide
  if (isKeyDown('ArrowDown') && player.grounded && !player.sliding) {
    player.sliding = true;
    player.slideTime = 0.5;
    player.stamina -= 5;
  }
  
  // Jump - Space or Z
  if ((isKeyPressed('Space') || isKeyPressed('KeyZ')) && player.grounded) {
    player.vel.y = 18;  // Jump power
    player.grounded = false;
    player.doubleJumpAvailable = true;
  } else if ((isKeyPressed('Space') || isKeyPressed('KeyZ')) && player.doubleJumpAvailable && player.stamina >= 15) {
    // Double jump
    player.vel.y = 16;
    player.doubleJumpAvailable = false;
    player.stamina -= 15;
  }
  
  // Dash - X key
  if (isKeyPressed('KeyX') && player.stamina >= 20) {
    player.isDashing = true;
    player.dashTime = 0.3;
    player.stamina -= 20;
  }
  
  // Attack - Z key
  if (isKeyPressed('KeyZ') && player.attackTime <= 0) {
    performAttack();
    player.attackTime = 0.4;
    player.attacking = true;
  } else if (player.attackTime <= 0) {
    player.attacking = false;
  }
  
  // Shuriken - C key
  if (isKeyPressed('KeyC') && player.shurikenCount > 0 && player.stamina >= 5) {
    throwShuriken();
    player.shurikenCount--;
    player.stamina -= 5;
  }
  
  // Grapple - G key
  if (isKeyPressed('KeyG')) {
    const nearestGrapple = findNearestGrapplePoint();
    if (nearestGrapple && !player.grappling) {
      player.grappling = true;
      player.grappleTarget = nearestGrapple;
    }
  }
}

function updatePlayer(dt) {
  // Update combo timer
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      combo = 0;
    }
  }
  
  // Check for wall running
  player.wallRunning = false;
  if (!player.grounded && Math.abs(player.vel.x) > 5) {
    // Check if near any wall structure
    for (let i = 0; i < 8; i++) {
      const wallX = (i - 4) * 15;
      const wallZ = i % 2 === 0 ? -20 : -30;
      
      const distToWall = Math.sqrt((player.pos.x - wallX) ** 2 + (player.pos.z - wallZ) ** 2);
      if (distToWall < 3) {
        player.wallRunning = true;
        player.wallRunTime += dt;
        
        // Wall running slows vertical fall and provides slight upward boost
        player.vel.y = Math.max(player.vel.y, -5);
        if (player.wallRunTime < 10) {  // max wall run time
          player.vel.y += 3 * dt; // Slight upward boost
        }
        break;
      }
    }
  }
  
  // Reset wall run time if not wall running
  if (!player.wallRunning) {
    player.wallRunTime = 0;
  }
  
  // Apply gravity (reduced during wall run)
  const gravityMultiplier = player.wallRunning ? 0.3 : 1.0;
  player.vel.y -= 25 * gravityMultiplier * dt;
  
  // Update position
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.z += player.vel.z * dt;
  
  // Platform collision detection
  player.grounded = false;
  
  for (const platform of platforms) {
    // Simple AABB collision
    if (player.pos.x > platform.x - platform.width/2 && 
        player.pos.x < platform.x + platform.width/2 &&
        player.pos.z > platform.z - platform.depth/2 && 
        player.pos.z < platform.z + platform.depth/2) {
      
      if (player.pos.y <= platform.y + platform.height && 
          player.pos.y + player.vel.y * dt > platform.y + platform.height) {
        player.pos.y = platform.y + platform.height;
        player.vel.y = 0;
        player.grounded = true;
        player.doubleJumpAvailable = true;
      }
    }
  }
  
  // World boundaries
  if (player.pos.x < -50) player.pos.x = -50;
  if (player.pos.x > 50) player.pos.x = 50;
  if (player.pos.z < -30) player.pos.z = -30;
  if (player.pos.z > 30) player.pos.z = 30;
  
  // Fall reset
  if (player.pos.y < -10) {
    player.pos.x = 0;
    player.pos.y = 2;
    player.pos.z = 0;
    player.vel.x = 0;
    player.vel.y = 0;
    player.vel.z = 0;
    player.health -= 20;
    combo = 0;
    comboTimer = 0;
  }
  
  // Update ninja meshes
  updatePlayerMeshes();
  
  // Regenerate stamina
  if (player.stamina < player.maxStamina) {
    player.stamina += 25 * dt;
  }
}

function updatePlayerMeshes() {
  // Safety check
  if (!playerKnight || !playerKnight.body) {
    console.log('⚠️ Player meshes missing!');
    return;
  }
  
  // Calculate facing direction for rotation
  const facingDir = player.yaw;
  
  // BODY - main torso (NO AURA - keeps ninja visible!)
  if (playerKnight.body) {
    setPosition(playerKnight.body, player.pos.x, player.pos.y, player.pos.z);
    setRotation(playerKnight.body, 0, facingDir, 0);
  }
  
  // CHEST ARMOR - cyan plate
  if (playerKnight.chest) {
    const chestZ = player.pos.z + Math.sin(facingDir) * 0.46;
    setPosition(playerKnight.chest, player.pos.x, player.pos.y + 0.4, chestZ);
    setRotation(playerKnight.chest, 0, facingDir, 0);
  }
  
  // HEAD - helmet
  if (playerKnight.head) {
    setPosition(playerKnight.head, player.pos.x, player.pos.y + 1.5, player.pos.z);
    setRotation(playerKnight.head, 0, facingDir, 0);
  }
  
  // VISOR - cyan glowing eyes
  if (playerKnight.visor) {
    const visorZ = player.pos.z + Math.sin(facingDir) * 0.36;
    setPosition(playerKnight.visor, player.pos.x, player.pos.y + 1.5, visorZ);
    setRotation(playerKnight.visor, 0, facingDir, 0);
  }
  
  // HEADBAND - red energy ribbon flowing behind
  if (playerKnight.headband) {
    const headbandZ = player.pos.z - Math.sin(facingDir) * 0.4;
    const flowOffset = Math.sin(gameTime * 5) * 0.1;
    setPosition(playerKnight.headband, player.pos.x, player.pos.y + 1.7 + flowOffset, headbandZ);
    setRotation(playerKnight.headband, 0, facingDir, Math.sin(gameTime * 3) * 0.1);
  }
  
  // KATANA - purple energy blade on back
  if (playerKnight.katana) {
    const katanaX = player.pos.x - Math.cos(facingDir) * 0.5;
    const katanaZ = player.pos.z - Math.sin(facingDir) * 0.4;
    setPosition(playerKnight.katana, katanaX, player.pos.y + 0.9, katanaZ);
    setRotation(playerKnight.katana, 0, facingDir, -0.4);
  }
  
  // KATANA HANDLE
  if (playerKnight.katanaHandle) {
    const handleX = player.pos.x - Math.cos(facingDir) * 0.5;
    const handleZ = player.pos.z - Math.sin(facingDir) * 0.4;
    setPosition(playerKnight.katanaHandle, handleX, player.pos.y - 0.3, handleZ);
    setRotation(playerKnight.katanaHandle, 0, facingDir, -0.4);
  }
  
  // SCARF - flowing cyan energy trail
  if (playerKnight.scarf) {
    const scarfX = player.pos.x - Math.cos(facingDir) * 0.5;
    const scarfZ = player.pos.z - Math.sin(facingDir) * 0.6;
    const flowY = Math.sin(gameTime * 4) * 0.15;
    setPosition(playerKnight.scarf, scarfX, player.pos.y + 1 + flowY, scarfZ);
    setRotation(playerKnight.scarf, 0, facingDir, Math.sin(gameTime * 2) * 0.15);
  }
  
  // ARMS - with running animation
  const armSwing = Math.abs(player.vel.x) > 1 ? Math.sin(gameTime * 12) * 0.4 : 0;
  if (playerKnight.leftArm) {
    setPosition(playerKnight.leftArm, player.pos.x - 0.7, player.pos.y + 0.2, player.pos.z);
    setRotation(playerKnight.leftArm, armSwing, facingDir, 0);
  }
  if (playerKnight.rightArm) {
    setPosition(playerKnight.rightArm, player.pos.x + 0.7, player.pos.y + 0.2, player.pos.z);
    setRotation(playerKnight.rightArm, -armSwing, facingDir, 0);
  }
  
  // GLOWING ARM GUARDS
  if (playerKnight.leftGuard) {
    setPosition(playerKnight.leftGuard, player.pos.x - 0.7, player.pos.y - 0.3, player.pos.z);
  }
  if (playerKnight.rightGuard) {
    setPosition(playerKnight.rightGuard, player.pos.x + 0.7, player.pos.y - 0.3, player.pos.z);
  }
  
  // LEGS - with running animation
  const legSwing = Math.abs(player.vel.x) > 1 ? Math.sin(gameTime * 14) * 0.3 : 0;
  if (playerKnight.leftLeg) {
    setPosition(playerKnight.leftLeg, player.pos.x - 0.4, player.pos.y - 1.3, player.pos.z);
    setRotation(playerKnight.leftLeg, -legSwing, facingDir, 0);
  }
  if (playerKnight.rightLeg) {
    setPosition(playerKnight.rightLeg, player.pos.x + 0.4, player.pos.y - 1.3, player.pos.z);
    setRotation(playerKnight.rightLeg, legSwing, facingDir, 0);
  }
  
  // KNEE GUARDS - cyan glow
  if (playerKnight.leftKnee) {
    setPosition(playerKnight.leftKnee, player.pos.x - 0.4, player.pos.y - 1, player.pos.z);
  }
  if (playerKnight.rightKnee) {
    setPosition(playerKnight.rightKnee, player.pos.x + 0.4, player.pos.y - 1, player.pos.z);
  }
}

function performAttack() {
  // Create katana slash effect - purple arc
  const slashAngle = player.yaw;  // Use yaw for direction
  const slashDir = Math.cos(player.yaw);
  const slashX = player.pos.x + slashDir * 1.5;
  
  // Multiple slash particles for arc effect
  for (let i = 0; i < 8; i++) {
    const angle = slashAngle + (i - 4) * 0.3;
    const offset = 1.5;
    particles.push({
      mesh: createSphere(0.15, 0xaa44ff, [
        slashX + Math.cos(angle) * offset,
        player.pos.y + 0.5 + Math.sin(i * 0.5) * 0.5,
        player.pos.z
      ]),
      vx: Math.cos(angle) * 3,
      vy: Math.sin(i * 0.5) * 2,
      vz: 0,
      life: 0.3,
      maxLife: 0.3
    });
  }
  
  // Check for enemy hits
  enemies.forEach(enemy => {
    const dx = enemy.x - player.pos.x;
    const dy = enemy.y - player.pos.y;
    const dz = enemy.z - player.pos.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance < 3) {
      // Combo system - more damage with higher combo
      const damage = 2 + Math.floor(combo / 5);
      enemy.health -= damage;
      
      // Award combo
      combo++;
      comboTimer = 2.0;
      
      createHitParticles(enemy.x, enemy.y, enemy.z);
      
      if (enemy.health <= 0) {
        destroyMesh(enemy.mesh);
        enemy.dead = true;
        score += 100 * (1 + Math.floor(combo / 10)); // Bonus score for combos
      }
    }
  });
}

function updateEnemies(dt) {
  enemies.forEach(enemy => {
    if (enemy.dead) return;
    
    enemy.attackCooldown -= dt;
    
    switch (enemy.type) {
      case 'patrol':
        // Patrol back and forth
        enemy.x += enemy.vx * dt;
        
        if (Math.abs(enemy.x - enemy.originalX) > enemy.patrolRange) {
          enemy.vx *= -1;
        }
        
        setPosition(enemy.mesh, enemy.x, enemy.y, enemy.z);
        
        // Attack player if close
        {
          const distToPlayer = Math.sqrt(
            Math.pow(enemy.x - player.x, 2) + 
            Math.pow(enemy.z - player.z, 2)
          );
          
          if (distToPlayer < 4 && enemy.attackCooldown <= 0) {
            // Simple attack - damage player
            if (distToPlayer < 2) {
              player.health -= 10;
              enemy.attackCooldown = 2;
            }
          }
        }
        break;
        
      case 'flyer':
        // Orbit around center point
        enemy.orbitAngle += dt * 2;
        enemy.x = enemy.orbitCenter.x + Math.cos(enemy.orbitAngle) * enemy.orbitRadius;
        enemy.z = enemy.orbitCenter.z + Math.sin(enemy.orbitAngle) * enemy.orbitRadius;
        enemy.y = enemy.orbitCenter.y + Math.sin(enemy.orbitAngle * 2) * 2;
        
        setPosition(enemy.mesh, enemy.x, enemy.y, enemy.z);
        rotateMesh(enemy.mesh, 0, dt * 3, 0);
        break;
    }
  });
  
  // Remove dead enemies
  enemies = enemies.filter(enemy => !enemy.dead);
}

function updateCoins(dt) {
  coins.forEach(coin => {
    if (coin.collected) return;
    
    // Animate coins
    coin.rotationY += dt * 4;
    coin.bobOffset += dt * 3;
    const newY = coin.y + Math.sin(coin.bobOffset) * 0.3;
    
    setPosition(coin.mesh, coin.x, newY, coin.z);
    setRotation(coin.mesh, 0, coin.rotationY, 0);
    
    // Check collection
    const distance = Math.sqrt(
      Math.pow(coin.x - player.x, 2) +
      Math.pow(newY - player.y, 2) +
      Math.pow(coin.z - player.z, 2)
    );
    
    if (distance < 1.5) {
      coin.collected = true;
      destroyMesh(coin.mesh);
      player.coins += 10;
      score += 50;
      createCoinParticles(coin.x, coin.y, coin.z);
    }
  });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    if (!particle || !particle.mesh) {
      particles.splice(i, 1);
      continue;
    }
    
    particle.life -= dt;
    
    const pos = getPosition(particle.mesh);
    if (!pos) {
      // Mesh doesn't exist anymore, remove particle
      particles.splice(i, 1);
      continue;
    }
    
    pos[0] += particle.vx * dt;
    pos[1] += particle.vy * dt;
    pos[2] += particle.vz * dt;
    
    // Shuriken don't have gravity and spin
    if (particle.isShuriken) {
      particle.rotation += dt * 20;
      setRotation(particle.mesh, 0, 0, particle.rotation);
    } else {
      particle.vy -= 10 * dt; // Gravity for normal particles
    }
    
    setPosition(particle.mesh, pos[0], pos[1], pos[2]);
    
    if (!particle.isShuriken) {
      const scale = particle.life / particle.maxLife;
      setScale(particle.mesh, scale, scale, scale);
    }
    
    if (particle.life <= 0) {
      destroyMesh(particle.mesh);
      particles.splice(i, 1);
    }
  }
}

function updateCamera(_dt) {
  // 📷 PERFECT SIDE-SCROLLER CAMERA (like Strider, Shinobi, Ninja Gaiden)
  // Camera follows player smoothly - optimal for gameplay!
  
  camera.targetX = player.pos.x + 3;  // Look slightly ahead
  camera.targetY = 5;  // Center on action
  camera.targetZ = 0;  // LOCKED - straight ahead view
  
  // Smooth horizontal following only
  camera.x += (player.pos.x - camera.x) * 0.1;
  camera.y = 6;  // Perfect eye-level view!
  camera.z = 18;  // Close enough to see details, far enough to see platforms!
  
  setCameraPosition(camera.x, camera.y, camera.z);
  setCameraTarget(camera.targetX, camera.targetY, camera.targetZ);
}

function checkCollisions(dt) {
  // Already handled in updatePlayer and updateEnemies
}

function updateGameLogic(dt) {
  // Check for level completion
  const remainingCoins = coins.filter(coin => !coin.collected).length;
  if (remainingCoins === 0) {
    level++;
    score += 1000;
    // Could spawn new level here
  }
  
  // Game over check
  if (player.health <= 0) {
    gameState = 'gameOver';
  }
}

function createJumpParticles() {
  for (let i = 0; i < 5; i++) {
    const particle = {
      mesh: createSphere(0.1, 0x88ccff, [player.x, player.y - 0.5, player.z]),
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3,
      vz: (Math.random() - 0.5) * 4,
      life: 1,
      maxLife: 1
    };
    particles.push(particle);
  }
}

function createDoubleJumpParticles() {
  for (let i = 0; i < 8; i++) {
    const particle = {
      mesh: createSphere(0.15, 0xffff44, [player.x, player.y, player.z]),
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      vz: (Math.random() - 0.5) * 6,
      life: 1.5,
      maxLife: 1.5
    };
    particles.push(particle);
  }
}

function createHitParticles(x, y, z) {
  for (let i = 0; i < 10; i++) {
    const particle = {
      mesh: createSphere(0.08, 0xff4444, [x, y, z]),
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 6,
      vz: (Math.random() - 0.5) * 8,
      life: 0.8,
      maxLife: 0.8
    };
    particles.push(particle);
  }
}

function createCoinParticles(x, y, z) {
  for (let i = 0; i < 6; i++) {
    const particle = {
      mesh: createSphere(0.05, 0xffdd00, [x, y, z]),
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 4 + 2,
      vz: (Math.random() - 0.5) * 5,
      life: 1.2,
      maxLife: 1.2
    };
    particles.push(particle);
  }
}

function createDashParticles() {
  for (let i = 0; i < 10; i++) {
    const particle = {
      mesh: createSphere(0.12, 0xaa44ff, [player.x, player.y + 0.5, player.z]),
      vx: (Math.random() - 0.5) * 3 - (player.facingRight ? 5 : -5),
      vy: (Math.random() - 0.5) * 2,
      vz: (Math.random() - 0.5) * 3,
      life: 0.5,
      maxLife: 0.5
    };
    particles.push(particle);
  }
}

function createAirDashParticles() {
  for (let i = 0; i < 15; i++) {
    const particle = {
      mesh: createSphere(0.15, 0x00ffff, [player.x, player.y, player.z]),
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      vz: (Math.random() - 0.5) * 8,
      life: 0.8,
      maxLife: 0.8
    };
    particles.push(particle);
  }
}

function createSlideParticles() {
  for (let i = 0; i < 8; i++) {
    const particle = {
      mesh: createSphere(0.08, 0x8844aa, [player.x, player.y - 0.3, player.z]),
      vx: (Math.random() - 0.5) * 4 - (player.facingRight ? 3 : -3),
      vy: Math.random() * 2,
      vz: (Math.random() - 0.5) * 4,
      life: 0.6,
      maxLife: 0.6
    };
    particles.push(particle);
  }
}

function createGrappleEffect() {
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const x = player.x + (player.grappleTarget.x - player.x) * t;
    const y = player.y + (player.grappleTarget.y - player.y) * t;
    const z = player.z + (player.grappleTarget.z - player.z) * t;
    
    const particle = {
      mesh: createSphere(0.1, 0x00ffff, [x, y, z]),
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.4,
      maxLife: 0.4
    };
    particles.push(particle);
  }
}

function throwShuriken() {
  const shuriken = {
    mesh: createCube(0.3, 0xcccccc, [
      player.x + (player.facingRight ? 1 : -1),
      player.y + 0.5,
      player.z
    ]),
    vx: (player.facingRight ? 1 : -1) * 25,
    vy: 0,
    vz: 0,
    life: 2,
    maxLife: 2,
    rotation: 0,
    isShuriken: true
  };
  setScale(shuriken.mesh, 0.8, 0.1, 0.8);
  particles.push(shuriken);
  
  // Check for enemy hits
  setTimeout(() => {
    enemies.forEach(enemy => {
      const dx = enemy.x - (player.x + (player.facingRight ? 5 : -5));
      const dy = enemy.y - player.y;
      const dz = enemy.z - player.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (distance < 3 && !enemy.dead) {
        enemy.health -= 1;
        createHitParticles(enemy.x, enemy.y, enemy.z);
        combo++;
        comboTimer = 2;
        
        if (enemy.health <= 0) {
          destroyMesh(enemy.mesh);
          enemy.dead = true;
          score += 150;
        }
      }
    });
  }, 100);
}

function findNearestGrapplePoint() {
  let nearest = null;
  let minDist = 20; // Max grapple range
  
  player.grapplePoints.forEach(point => {
    if (!point.active) return;
    
    const dx = point.x - player.x;
    const dy = point.y - player.y;
    const dz = point.z - player.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (dist < minDist) {
      minDist = dist;
      nearest = point;
    }
  });
  
  return nearest;
}

function drawUI() {
  // Ninja HUD Background - dark with purple/cyan accents
  rect(16, 16, 420, 100, rgba8(10, 10, 26, 200), true);
  rect(16, 16, 420, 100, rgba8(136, 51, 170, 180), false);
  rect(17, 17, 418, 98, rgba8(0, 255, 255, 80), false);
  
  // Score and Level
  print(`SCORE: ${score.toString().padStart(8, '0')}`, 24, 24, rgba8(0, 255, 255, 255));
  print(`LEVEL: ${level}`, 24, 40, rgba8(170, 68, 255, 255));
  print(`COINS: ${player.coins}`, 24, 56, rgba8(255, 215, 0, 255));
  
  // Shuriken count
  print(`SHURIKEN: ${player.shuriken}`, 24, 72, rgba8(200, 200, 200, 255));
  
  // Combo meter
  if (combo > 0) {
    print(`COMBO x${combo}`, 24, 88, rgba8(255, 100, 255, 255));
    const comboBarWidth = Math.floor((comboTimer / 2.0) * 80);
    rect(100, 90, 80, 6, rgba8(50, 20, 60, 255), true);
    rect(100, 90, comboBarWidth, 6, rgba8(255, 100, 255, 255), true);
  }
  
  // Health bar - red with dark background
  print('HEALTH:', 220, 24, rgba8(255, 255, 255, 255));
  rect(285, 22, 120, 10, rgba8(50, 0, 0, 255), true);
  rect(285, 22, Math.floor((player.health / 100) * 120), 10, rgba8(255, 0, 80, 255), true);
  rect(285, 22, 120, 10, rgba8(255, 0, 80, 100), false);
  
  // Energy bar - cyan with dark background
  print('ENERGY:', 220, 42, rgba8(255, 255, 255, 255));
  rect(285, 40, 120, 10, rgba8(0, 20, 40, 255), true);
  rect(285, 40, Math.floor((player.energy / 100) * 120), 10, rgba8(0, 255, 255, 255), true);
  rect(285, 40, 120, 10, rgba8(0, 255, 255, 100), false);
  
  // Ability indicators
  print('ABILITIES:', 220, 60, rgba8(200, 200, 200, 255));
  
  // Dash indicator
  const dashReady = player.dashCooldown <= 0 && player.energy >= 20;
  rect(285, 58, 24, 8, dashReady ? rgba8(170, 68, 255, 255) : rgba8(50, 20, 60, 255), true);
  print('DSH', 288, 60, rgba8(255, 255, 255, 255));
  
  // Air Dash indicator
  const airDashReady = player.airDashAvailable && player.energy >= 25;
  rect(312, 58, 24, 8, airDashReady ? rgba8(0, 255, 255, 255) : rgba8(20, 50, 60, 255), true);
  print('AIR', 315, 60, rgba8(255, 255, 255, 255));
  
  // Grapple indicator
  const grappleReady = findNearestGrapplePoint() !== null;
  rect(339, 58, 24, 8, grappleReady ? rgba8(0, 255, 255, 255) : rgba8(20, 50, 60, 255), true);
  print('GRP', 342, 60, rgba8(255, 255, 255, 255));
  
  // Shuriken indicator  
  const shurikenReady = player.shuriken > 0 && player.energy >= 5;
  rect(366, 58, 24, 8, shurikenReady ? rgba8(200, 200, 200, 255) : rgba8(40, 40, 40, 255), true);
  print('SHR', 369, 60, rgba8(255, 255, 255, 255));
  
  // 3D Stats - smaller and in corner
  const stats = get3DStats();
  if (stats) {
    print(`${stats.meshes || 0}m`, 580, 24, rgba8(100, 100, 100, 200));
  }
  
  // Position info - debug mode
  // print(`POS: ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}`, 220, 90, rgba8(100, 100, 100, 150));
  
  // Controls hint
  print('X=DASH  C=SHURIKEN  G=GRAPPLE  Z=ATTACK', 16, 340, rgba8(136, 51, 170, 200));
  
  if (gameState === 'gameOver') {
    rect(0, 0, 640, 360, rgba8(0, 0, 0, 200), true);
    print('GAME OVER', 260, 150, rgba8(255, 50, 50, 255));
    print(`FINAL SCORE: ${score}`, 230, 180, rgba8(255, 255, 0, 255));
    print(`COINS COLLECTED: ${player.coins}`, 220, 200, rgba8(255, 215, 0, 255));
    print('PRESS R TO RESTART', 220, 240, rgba8(255, 255, 255, 255));
    
    if (btnp(17)) { // R key
      // Reset game
      score = 0;
      level = 1;
      player.health = 100;
      player.energy = 100;
      player.coins = 0;
      player.x = 0; player.y = 2; player.z = 0;
      gameState = 'playing';
      clearScene();
      init();
    }
  }
}