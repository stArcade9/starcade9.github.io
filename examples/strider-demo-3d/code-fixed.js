// SHADOW NINJA 3D - PROPERLY DESIGNED PLATFORMER
// Fixed version with real game design principles
// VERSION: v007-PROPER-GAME-DESIGN

console.log('🎮 Loading proper platformer...');

// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
  // Player physics - tuned for fun gameplay
  PLAYER_SPEED: 8,
  JUMP_POWER: 12,
  GRAVITY: 30,
  FRICTION: 0.85,
  AIR_CONTROL: 0.6,
  
  // Camera settings
  CAMERA_DISTANCE: 15,
  CAMERA_HEIGHT: 5,
  CAMERA_SMOOTH: 0.08,
  
  // Level design
  PLATFORM_SIZE: 5,
  PLATFORM_GAP: 3,
  
  // Visual
  USE_GLB_MODELS: false  // Set true to use GLB models (requires model files)
};

// ============================================
// GAME STATE
// ============================================
let gameState = 'start';
let gameTime = 0;
let score = 0;
let coins = 0;

// Player
let player = {
  pos: { x: 0, y: 2, z: 0 },
  vel: { x: 0, y: 0, z: 0 },
  grounded: false,
  facingRight: true,
  canJump: true,
  coyoteTime: 0,  // Grace period after leaving platform
  jumpBufferTime: 0,  // Grace period before landing
};

// Camera
let camera = {
  pos: { x: 0, y: 5, z: 15 },
  target: { x: 0, y: 3, z: 0 }
};

// Game objects
let platforms = [];
let collectibles = [];
let enemies = [];
let playerMesh = null;
let uiButtons = [];

// ============================================
// INITIALIZATION
// ============================================
export async function init() {
  console.log('🎮 Initializing proper platformer...');
  
  // Reset everything
  gameState = 'start';
  gameTime = 0;
  score = 0;
  coins = 0;
  
  player = {
    pos: { x: 0, y: 2, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    grounded: false,
    facingRight: true,
    canJump: true,
    coyoteTime: 0,
    jumpBufferTime: 0,
  };
  
  camera = {
    pos: { x: 0, y: 5, z: 15 },
    target: { x: 0, y: 3, z: 0 }
  };
  
  platforms = [];
  collectibles = [];
  enemies = [];
  
  // Create player
  if (CONFIG.USE_GLB_MODELS) {
    // Try to load GLB model
    try {
      playerMesh = await loadModel('/models/ninja.glb', [0, 2, 0], 1);
    } catch (e) {
      console.warn('GLB model not found, using fallback');
      playerMesh = createSimplePlayer();
    }
  } else {
    playerMesh = createSimplePlayer();
  }
  
  // Build level
  createLevel();
  
  // Setup lighting
  setAmbientLight(0xffffff);
  setLightColor(0xffffff);
  setLightDirection(0.5, -0.7, 0.5);
  
  // Setup camera
  setCameraPosition(camera.pos.x, camera.pos.y, camera.pos.z);
  setCameraTarget(camera.target.x, camera.target.y, camera.target.z);
  
  // Create UI
  createUI();
  
  // Focus canvas for input
  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.focus();
    canvas.tabIndex = 1;
  }
  
  console.log('✅ Platformer ready!');
}

// ============================================
// PLAYER CREATION
// ============================================
function createSimplePlayer() {
  // Create a visible, well-designed character
  const meshes = {};
  
  // Body - bright blue
  meshes.body = createCube(0.8, 0x4466ff, [0, 0, 0]);
  setScale(meshes.body, 1, 1.5, 0.8);
  
  // Head - white
  meshes.head = createSphere(0.4, 0xffffff, [0, 1, 0]);
  
  // Eyes - glowing yellow
  meshes.leftEye = createSphere(0.12, 0xffff00, [-0.15, 1.1, 0.35]);
  meshes.rightEye = createSphere(0.12, 0xffff00, [0.15, 1.1, 0.35]);
  
  // Feet - orange
  meshes.leftFoot = createCube(0.3, 0xff8844, [-0.25, -1, 0]);
  setScale(meshes.leftFoot, 0.3, 0.3, 0.5);
  meshes.rightFoot = createCube(0.3, 0xff8844, [0.25, -1, 0]);
  setScale(meshes.rightFoot, 0.3, 0.3, 0.5);
  
  return meshes;
}

// ============================================
// LEVEL CREATION - PROPER DESIGN
// ============================================
function createLevel() {
  platforms = [];
  collectibles = [];
  enemies = [];
  
  // Ground - solid foundation
  const ground = {
    x: 25, y: -1, z: 0,
    width: 100, height: 2, depth: 10,
    mesh: createCube(100, 0x66bb66, [25, -1, 0])
  };
  setScale(ground.mesh, 1, 2, 1);
  platforms.push(ground);
  
  // Tutorial section - teach basics (X: 0-20)
  addPlatform(5, 2, 4);    // First jump
  addCoin(5, 4);
  
  addPlatform(10, 3, 4);   // Second jump
  addCoin(10, 5);
  
  addPlatform(15, 2, 4);   // Come back down
  addCoin(15, 4);
  
  // Easy section - build confidence (X: 20-40)
  addPlatform(22, 4, 3.5);
  addCoin(22, 6);
  
  addPlatform(27, 5.5, 3.5);
  addCoin(27, 7.5);
  
  addPlatform(32, 7, 3.5);
  addCoin(32, 9);
  
  addPlatform(37, 5, 4);
  addCoin(37, 7);
  
  // Medium section - introduce challenges (X: 40-60)
  addPlatform(42, 4, 3);
  addEnemy(42, 5);
  
  addPlatform(47, 6, 3);
  addCoin(47, 8);
  
  addPlatform(52, 8, 3);
  addCoin(52, 10);
  
  addPlatform(57, 6, 3);
  addEnemy(57, 7);
  
  // Hard section - test skills (X: 60-80)
  addPlatform(62, 9, 2.5);
  addCoin(62, 11);
  
  addPlatform(66, 11, 2.5);
  addCoin(66, 13);
  
  addPlatform(70, 9, 2.5);
  addCoin(70, 11);
  
  addPlatform(74, 7, 3);
  addEnemy(74, 8);
  
  // Victory platform
  addPlatform(80, 5, 5);
  addCoin(80, 7);
  addCoin(81, 8);
  addCoin(82, 9);
  
  // Background decoration
  createBackground();
}

function addPlatform(x, y, width = 4) {
  const platform = {
    x, y, z: 0,
    width, height: 0.8, depth: 4,
    mesh: createCube(width, 0x8866ff, [x, y, 0])
  };
  setScale(platform.mesh, 1, 0.8, 1);
  platforms.push(platform);
  
  // Add edge glow
  const edge = createCube(width + 0.1, 0xffff00, [x, y + 0.45, 0]);
  setScale(edge, 1, 0.1, 1);
}

function addCoin(x, y) {
  const coin = {
    x, y, z: 0,
    collected: false,
    rotation: 0,
    mesh: createSphere(0.3, 0xffdd00, [x, y, 0])
  };
  collectibles.push(coin);
}

function addEnemy(x, y) {
  const enemy = {
    x, y, z: 0,
    vx: 2,
    patrol: { min: x - 2, max: x + 2 },
    mesh: createCube(0.6, 0xff4444, [x, y, 0])
  };
  setScale(enemy.mesh, 0.8, 0.8, 0.8);
  enemies.push(enemy);
}

function createBackground() {
  // Sky gradient simulation
  const skyTop = createPlane(200, 100, 0x88bbff, [40, 30, -30]);
  setRotation(skyTop, 0, 0, 0);
  
  // Ground
  const groundPlane = createPlane(200, 100, 0x66aa66, [40, -5, -5]);
  setRotation(groundPlane, -Math.PI/2, 0, 0);
  
  // Mountains in background
  for (let i = 0; i < 8; i++) {
    const x = i * 15 - 10;
    const height = 15 + Math.random() * 10;
    const mountain = createCube(12, 0x8866aa, [x, height/2, -25]);
    setScale(mountain, 1, height, 1);
  }
  
  // Clouds
  for (let i = 0; i < 10; i++) {
    const cloud = createSphere(2, 0xffffff, [
      Math.random() * 80 - 10,
      15 + Math.random() * 10,
      -15 - Math.random() * 10
    ]);
  }
}

// ============================================
// UPDATE LOOP - PROPER PHYSICS
// ============================================
export function update() {
  const dt = 1/60;
  gameTime += dt;
  
  if (gameState === 'start') {
    updateStartScreen();
    return;
  }
  
  if (gameState === 'playing') {
    updateInput(dt);
    updatePhysics(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateCollectibles(dt);
    updateCamera(dt);
  }
}

function updateStartScreen() {
  // Check for start input
  if (isKeyDown('Enter') || isKeyDown('Space')) {
    gameState = 'playing';
    console.log('🎮 Game started!');
  }
}

// ============================================
// INPUT - RESPONSIVE CONTROLS
// ============================================
function updateInput(dt) {
  const moveSpeed = CONFIG.PLAYER_SPEED;
  const controlMultiplier = player.grounded ? 1 : CONFIG.AIR_CONTROL;
  
  // Horizontal movement
  if (isKeyDown('ArrowLeft')) {
    player.vel.x = -moveSpeed * controlMultiplier;
    player.facingRight = false;
  } else if (isKeyDown('ArrowRight')) {
    player.vel.x = moveSpeed * controlMultiplier;
    player.facingRight = true;
  } else if (player.grounded) {
    // Apply friction only when grounded
    player.vel.x *= CONFIG.FRICTION;
  }
  
  // Jump with buffer and coyote time
  if (isKeyPressed('Space') || isKeyPressed('ArrowUp')) {
    player.jumpBufferTime = 0.1;  // 100ms buffer
  }
  
  // Coyote time - grace period after leaving platform
  if (player.grounded) {
    player.coyoteTime = 0.15;  // 150ms grace
  } else {
    player.coyoteTime -= dt;
  }
  
  // Execute jump if conditions met
  if (player.jumpBufferTime > 0) {
    if (player.coyoteTime > 0 || player.grounded) {
      player.vel.y = CONFIG.JUMP_POWER;
      player.coyoteTime = 0;
      player.jumpBufferTime = 0;
      player.grounded = false;
    }
  }
  
  player.jumpBufferTime -= dt;
}

// ============================================
// PHYSICS - PROPER COLLISION
// ============================================
function updatePhysics(dt) {
  // Apply gravity
  player.vel.y -= CONFIG.GRAVITY * dt;
  
  // Apply velocity
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  
  // Check collisions
  player.grounded = false;
  
  for (const platform of platforms) {
    // Simple AABB collision
    const playerLeft = player.pos.x - 0.4;
    const playerRight = player.pos.x + 0.4;
    const playerTop = player.pos.y + 1.5;
    const playerBottom = player.pos.y - 1;
    
    const platformLeft = platform.x - platform.width / 2;
    const platformRight = platform.x + platform.width / 2;
    const platformTop = platform.y + platform.height / 2;
    const platformBottom = platform.y - platform.height / 2;
    
    // Check overlap
    if (playerRight > platformLeft && 
        playerLeft < platformRight &&
        player.pos.z > platform.z - platform.depth / 2 &&
        player.pos.z < platform.z + platform.depth / 2) {
      
      // Landing on top
      if (playerBottom <= platformTop && 
          playerBottom > platformTop - 1 &&
          player.vel.y <= 0) {
        player.pos.y = platformTop + 1;
        player.vel.y = 0;
        player.grounded = true;
      }
    }
  }
  
  // Death - fall off world
  if (player.pos.y < -10) {
    resetPlayer();
  }
  
  // Victory - reached end
  if (player.pos.x > 82) {
    gameState = 'victory';
  }
}

function resetPlayer() {
  player.pos.x = 0;
  player.pos.y = 2;
  player.vel.x = 0;
  player.vel.y = 0;
  score = Math.max(0, score - 50);
}

// ============================================
// GAME OBJECT UPDATES
// ============================================
function updatePlayer(dt) {
  if (!playerMesh || !playerMesh.body) return;
  
  // Update all body parts
  const parts = Object.values(playerMesh);
  const offsetX = player.facingRight ? 0 : 0;
  
  setPosition(playerMesh.body, player.pos.x + offsetX, player.pos.y, player.pos.z);
  setPosition(playerMesh.head, player.pos.x, player.pos.y + 1, player.pos.z);
  setPosition(playerMesh.leftEye, player.pos.x - 0.15, player.pos.y + 1.1, player.pos.z + 0.35);
  setPosition(playerMesh.rightEye, player.pos.x + 0.15, player.pos.y + 1.1, player.pos.z + 0.35);
  
  // Animate feet based on movement
  const footBob = player.grounded && Math.abs(player.vel.x) > 1 ? Math.sin(gameTime * 10) * 0.1 : 0;
  setPosition(playerMesh.leftFoot, player.pos.x - 0.25, player.pos.y - 1 + footBob, player.pos.z);
  setPosition(playerMesh.rightFoot, player.pos.x + 0.25, player.pos.y - 1 - footBob, player.pos.z);
  
  // Rotate body based on direction
  setRotation(playerMesh.body, 0, player.facingRight ? 0 : Math.PI, 0);
}

function updateEnemies(dt) {
  enemies.forEach(enemy => {
    // Simple patrol AI
    enemy.x += enemy.vx * dt;
    
    if (enemy.x < enemy.patrol.min || enemy.x > enemy.patrol.max) {
      enemy.vx *= -1;
    }
    
    setPosition(enemy.mesh, enemy.x, enemy.y, enemy.z);
    
    // Check collision with player
    const dist = Math.sqrt(
      Math.pow(enemy.x - player.pos.x, 2) +
      Math.pow(enemy.y - player.pos.y, 2)
    );
    
    if (dist < 1) {
      resetPlayer();
    }
  });
}

function updateCollectibles(dt) {
  collectibles.forEach(coin => {
    if (coin.collected) return;
    
    // Animate rotation
    coin.rotation += dt * 5;
    setRotation(coin.mesh, 0, coin.rotation, 0);
    
    // Bob up and down
    const bob = Math.sin(gameTime * 3 + coin.x) * 0.2;
    setPosition(coin.mesh, coin.x, coin.y + bob, coin.z);
    
    // Check collection
    const dist = Math.sqrt(
      Math.pow(coin.x - player.pos.x, 2) +
      Math.pow(coin.y - player.pos.y, 2)
    );
    
    if (dist < 1) {
      coin.collected = true;
      destroyMesh(coin.mesh);
      coins++;
      score += 10;
    }
  });
}

function updateCamera(dt) {
  // Smooth follow camera
  const targetX = player.pos.x + 3;  // Look slightly ahead
  const targetY = player.pos.y;
  
  camera.target.x += (targetX - camera.target.x) * CONFIG.CAMERA_SMOOTH;
  camera.target.y += (targetY - camera.target.y) * CONFIG.CAMERA_SMOOTH;
  
  camera.pos.x = camera.target.x - 5;
  camera.pos.y = camera.target.y + CONFIG.CAMERA_HEIGHT;
  camera.pos.z = CONFIG.CAMERA_DISTANCE;
  
  setCameraPosition(camera.pos.x, camera.pos.y, camera.pos.z);
  setCameraTarget(camera.target.x, camera.target.y, 0);
}

// ============================================
// UI
// ============================================
function createUI() {
  uiButtons = [];
  // Add start button or other UI as needed
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
  } else if (gameState === 'playing') {
    drawHUD();
  } else if (gameState === 'victory') {
    drawVictoryScreen();
  }
}

function drawStartScreen() {
  rect(0, 0, 640, 360, rgba8(10, 10, 30, 200), true);
  
  print('SHADOW NINJA', 250, 100, rgba8(255, 255, 255, 255));
  print('PROPER PLATFORMER', 230, 130, rgba8(180, 180, 255, 255));
  
  const pulse = Math.sin(gameTime * 3) * 0.5 + 0.5;
  print('PRESS SPACE TO START', 220, 180, rgba8(255, 255, 100, Math.floor(pulse * 255)));
  
  print('Controls:', 280, 220, rgba8(200, 200, 200, 255));
  print('ARROWS = Move', 260, 250, rgba8(180, 180, 180, 255));
  print('SPACE = Jump', 265, 280, rgba8(180, 180, 180, 255));
}

function drawHUD() {
  // Score
  rect(10, 10, 150, 60, rgba8(0, 0, 0, 150), true);
  rect(10, 10, 150, 60, rgba8(100, 100, 255, 180), false);
  print(`Score: ${score}`, 20, 25, rgba8(255, 255, 255, 255));
  print(`Coins: ${coins}`, 20, 45, rgba8(255, 215, 0, 255));
}

function drawVictoryScreen() {
  rect(0, 0, 640, 360, rgba8(0, 50, 0, 200), true);
  
  print('VICTORY!', 270, 120, rgba8(100, 255, 100, 255));
  print(`Final Score: ${score}`, 250, 160, rgba8(255, 255, 255, 255));
  print(`Coins: ${coins}`, 280, 190, rgba8(255, 215, 0, 255));
  
  print('Press R to Restart', 240, 240, rgba8(200, 200, 200, 255));
  
  if (isKeyDown('KeyR')) {
    init();
  }
}
