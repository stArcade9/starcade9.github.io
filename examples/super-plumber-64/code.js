// SUPER PLUMBER 64 - A Super Mario 64 inspired 3D platformer
// Features: Triple jump, ground pound, coins, stars, platforming

/* eslint-disable no-undef */
// Nova64 runtime provides these globals

let gameState = 'start';  // Start with start screen
let camera = { x: 0, y: 15, z: 30, rotY: 0, distance: 25 };
let player = {
  x: 0, y: 5, z: 0,
  vx: 0, vy: 0, vz: 0,
  rotY: 0,
  onGround: false,
  jumpCount: 0,      // For triple jump
  lastJumpTime: 0,
  groundPounding: false,
  groundPoundTime: 0
};

let coins = [];
let stars = [];
let platforms = [];
let objects = {
  player: null,
  coins: [],
  stars: [],
  platforms: []
};

let score = 0;
let starsCollected = 0;
let time = 0;

// Level data
const LEVEL_PLATFORMS = [
  // Starting platform
  { x: 0, y: 0, z: 0, w: 12, h: 2, d: 12, color: 0x00aa00 },
  
  // Path platforms
  { x: 15, y: 2, z: 0, w: 8, h: 2, d: 8, color: 0x00cc00 },
  { x: 30, y: 5, z: -5, w: 10, h: 2, d: 10, color: 0x00dd00 },
  { x: 45, y: 8, z: 0, w: 8, h: 2, d: 8, color: 0x00ee00 },
  
  // Side platforms
  { x: 0, y: 10, z: -20, w: 10, h: 2, d: 10, color: 0x0099ff },
  { x: 20, y: 12, z: -25, w: 8, h: 2, d: 8, color: 0x0088ff },
  
  // High platform with star
  { x: 60, y: 20, z: 5, w: 12, h: 2, d: 12, color: 0xffaa00 },
  
  // Lower platforms for exploration
  { x: -15, y: 3, z: 15, w: 8, h: 2, d: 8, color: 0xff6600 },
  { x: -25, y: 6, z: 25, w: 10, h: 2, d: 10, color: 0xff8800 },
  
  // Moving platform path
  { x: 35, y: 15, z: -15, w: 6, h: 2, d: 6, color: 0xff0088 },
  { x: 50, y: 18, z: -20, w: 8, h: 2, d: 8, color: 0xff0088 }
];

const COIN_POSITIONS = [
  // Path coins
  { x: 15, y: 5, z: 0 },
  { x: 22, y: 7, z: -2 },
  { x: 30, y: 9, z: -5 },
  { x: 38, y: 11, z: -2 },
  { x: 45, y: 12, z: 0 },
  
  // Side path coins
  { x: 0, y: 14, z: -20 },
  { x: 5, y: 14, z: -22 },
  { x: 15, y: 16, z: -25 },
  { x: 20, y: 16, z: -25 },
  
  // Low area coins
  { x: -15, y: 7, z: 15 },
  { x: -20, y: 9, z: 20 },
  { x: -25, y: 10, z: 25 },
  
  // High area coins
  { x: 35, y: 19, z: -15 },
  { x: 42, y: 21, z: -17 },
  { x: 50, y: 22, z: -20 }
];

const STAR_POSITIONS = [
  { x: 60, y: 25, z: 5 },   // High platform
  { x: -25, y: 12, z: 25 }, // Far exploration
  { x: 50, y: 24, z: -20 }  // Upper path
];

export function init() {
  console.log('🎮 SUPER PLUMBER 64 - Starting!');
  
  // Setup camera
  setCameraFOV(75);
  
  // Lighting
  setAmbientLight(0x404040);
  setDirectionalLight(0xffffff, 1.0);
  setLightDirection(-0.5, -1, -0.3);
  
  // Sky and fog - create beautiful space background
  createSpaceSkybox({
    starCount: 500,
    starSize: 1.5,
    nebulae: true,
    nebulaColor: 0x87CEEB
  });
  setFog(0x87CEEB, 80, 200);
  
  // Create player (colorful character)
  objects.player = createAdvancedCube(1.5, {
    color: 0xff0000,        // Red like Mario
    emissive: 0xff0000,
    emissiveIntensity: 0.3,
    flatShading: true
  }, [player.x, player.y, player.z]);
  
  // Create platforms
  LEVEL_PLATFORMS.forEach((plat) => {
    const platform = createAdvancedCube(1, {
      color: plat.color,
      emissive: plat.color,
      emissiveIntensity: 0.2,
      flatShading: true
    }, [plat.x, plat.y, plat.z]);
    
    setScale(platform, [plat.w, plat.h, plat.d]);
    objects.platforms.push(platform);
    platforms.push(plat);
  });
  
  // Create coins (yellow spinning)
  COIN_POSITIONS.forEach(pos => {
    const coin = createAdvancedCube(0.5, {
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.8,
      flatShading: true
    }, [pos.x, pos.y, pos.z]);
    
    objects.coins.push(coin);
    coins.push({ ...pos, collected: false, mesh: coin, rotY: 0 });
  });
  
  // Create stars (shiny collectibles)
  STAR_POSITIONS.forEach(pos => {
    const star = createAdvancedCube(0.8, {
      color: 0xffaa00,
      emissive: 0xffff88,
      emissiveIntensity: 1.2,
      flatShading: true
    }, [pos.x, pos.y, pos.z]);
    
    objects.stars.push(star);
    stars.push({ ...pos, collected: false, mesh: star, rotY: 0, bobY: 0 });
  });
  
  // Enable bloom for shiny collectibles
  enableBloom(1.0, 0.6, 0.4);
  enableFXAA();
}

export function update(dt) {
  time += dt;
  
  // Handle start screen
  if (gameState === 'start') {
    if (isKeyDown('Enter') || isKeyDown('Space') || isKeyDown('z') || btnp(4) || btnp(13)) {
      gameState = 'playing';
      console.log('🎮 Super Plumber 64 - Game Started!');
    }
    return;
  }
  
  if (gameState !== 'playing') return;
  
  // Input handling
  const moveSpeed = 12;
  const turnSpeed = 3;
  
  // Camera rotation with shoulder buttons / QE keys
  if (btn(8) || isKeyDown('q')) {
    camera.rotY += turnSpeed * dt;
  }
  if (btn(9) || isKeyDown('e')) {
    camera.rotY -= turnSpeed * dt;
  }
  
  // Gamepad right stick camera
  if (gamepadConnected()) {
    camera.rotY -= rightStickX() * turnSpeed * dt;
  }
  
  // Movement relative to camera
  let moveX = 0;
  let moveZ = 0;
  
  if (btn(0) || isKeyDown('ArrowLeft') || isKeyDown('a')) moveX = -1;   // Left
  if (btn(1) || isKeyDown('ArrowRight') || isKeyDown('d')) moveX = 1;   // Right
  if (btn(2) || isKeyDown('ArrowUp') || isKeyDown('w')) moveZ = -1;     // Forward
  if (btn(3) || isKeyDown('ArrowDown') || isKeyDown('s')) moveZ = 1;    // Backward
  
  // Gamepad left stick
  if (gamepadConnected()) {
    const lx = leftStickX();
    const ly = leftStickY();
    if (Math.abs(lx) > 0.1) moveX = lx;
    if (Math.abs(ly) > 0.1) moveZ = ly;
  }
  
  // Apply camera rotation to movement
  if (moveX !== 0 || moveZ !== 0) {
    const angle = Math.atan2(moveX, moveZ) + camera.rotY;
    const speed = Math.sqrt(moveX * moveX + moveZ * moveZ);
    player.vx = Math.sin(angle) * moveSpeed * speed;
    player.vz = Math.cos(angle) * moveSpeed * speed;
    player.rotY = angle;
  } else {
    // Friction
    player.vx *= 0.85;
    player.vz *= 0.85;
  }
  
  // Jump mechanics (Triple jump!)
  const jumpPressed = btnp(4) || btnp(13) || isKeyPressed('Space') || isKeyPressed('z');
  if (jumpPressed && player.onGround && !player.groundPounding) {
    const now = time;
    const timeSinceLastJump = now - player.lastJumpTime;
    
    // Triple jump logic
    if (timeSinceLastJump < 0.5) {
      player.jumpCount++;
    } else {
      player.jumpCount = 1;
    }
    
    // Higher jumps for combos
    if (player.jumpCount === 1) {
      player.vy = 12;  // Normal jump
    } else if (player.jumpCount === 2) {
      player.vy = 14;  // Double jump - higher
    } else if (player.jumpCount >= 3) {
      player.vy = 18;  // Triple jump - highest!
      player.jumpCount = 0; // Reset
    }
    
    player.lastJumpTime = now;
    player.onGround = false;
  }
  
  // Ground pound (press down + jump in air)
  const downPressed = btn(3) || isKeyDown('ArrowDown') || isKeyDown('s');
  if ((btnp(4) || isKeyPressed('Space') || isKeyPressed('z')) && !player.onGround && !player.groundPounding && downPressed) {
    player.groundPounding = true;
    player.vy = -25; // Fast downward
    player.groundPoundTime = time;
  }
  
  // Gravity
  if (!player.onGround || player.groundPounding) {
    player.vy -= 35 * dt;
  }
  
  // Apply velocity
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.z += player.vz * dt;
  
  // Collision with platforms
  player.onGround = false;
  platforms.forEach(plat => {
    const halfW = plat.w / 2;
    const halfD = plat.d / 2;
    const platTop = plat.y + plat.h / 2;
    const platBottom = plat.y - plat.h / 2;
    
    // Check if player is above platform
    if (player.x > plat.x - halfW && player.x < plat.x + halfW &&
        player.z > plat.z - halfD && player.z < plat.z + halfD) {
      
      // Landing on top
      if (player.y - 0.75 <= platTop && player.y - 0.75 >= platBottom && player.vy <= 0) {
        player.y = platTop + 0.75;
        player.vy = 0;
        player.onGround = true;
        
        // Ground pound bounce
        if (player.groundPounding) {
          player.vy = 8; // Small bounce
          player.groundPounding = false;
          player.jumpCount = 0;
        }
      }
    }
  });
  
  // Fall detection - respawn
  if (player.y < -10) {
    player.x = 0;
    player.y = 10;
    player.z = 0;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    player.groundPounding = false;
  }
  
  // Update player mesh
  setPosition(objects.player, [player.x, player.y, player.z]);
  setRotation(objects.player, [0, player.rotY, 0]);
  
  // Scale player during ground pound
  if (player.groundPounding) {
    const scale = 1.0 + Math.sin(time * 20) * 0.2;
    setScale(objects.player, [1.5, scale * 1.5, 1.5]);
  } else {
    setScale(objects.player, [1.5, 1.5, 1.5]);
  }
  
  // Animate coins (spin)
  coins.forEach((coin) => {
    if (!coin.collected) {
      coin.rotY += 3 * dt;
      setRotation(coin.mesh, [0, coin.rotY, 0]);
      
      // Collect coins
      const dist = Math.sqrt(
        (player.x - coin.x) ** 2 +
        (player.y - coin.y) ** 2 +
        (player.z - coin.z) ** 2
      );
      
      if (dist < 2) {
        coin.collected = true;
        score += 10;
        destroyMesh(coin.mesh);
      }
    }
  });
  
  // Animate stars (bob and spin)
  stars.forEach((star, i) => {
    if (!star.collected) {
      star.rotY += 2 * dt;
      star.bobY = Math.sin(time * 2 + i) * 1;
      setRotation(star.mesh, [0, star.rotY, Math.sin(time * 3 + i) * 0.3]);
      setPosition(star.mesh, [star.x, star.y + star.bobY, star.z]);
      
      // Collect stars
      const dist = Math.sqrt(
        (player.x - star.x) ** 2 +
        (player.y - (star.y + star.bobY)) ** 2 +
        (player.z - star.z) ** 2
      );
      
      if (dist < 3) {
        star.collected = true;
        starsCollected++;
        score += 100;
        destroyMesh(star.mesh);
      }
    }
  });
  
  // Camera follow player (3rd person)
  const camDist = camera.distance;
  const camHeight = 8;
  camera.x = player.x - Math.sin(camera.rotY) * camDist;
  camera.z = player.z - Math.cos(camera.rotY) * camDist;
  camera.y = player.y + camHeight;
  
  setCameraPosition(camera.x, camera.y, camera.z);
  setCameraTarget(player.x, player.y + 2, player.z);
}

export function draw() {
  // Start screen
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // HUD - 2D overlay
  
  // Score
  drawTextOutline(
    `COINS: ${score}`,
    10, 10,
    rgba8(255, 255, 0, 255),
    rgba8(0, 0, 0, 255),
    2
  );
  
  // Stars
  drawTextOutline(
    `STARS: ${starsCollected}/3`,
    10, 30,
    rgba8(255, 170, 0, 255),
    rgba8(0, 0, 0, 255),
    2
  );
  
  // Jump indicator
  if (player.jumpCount > 0 && time - player.lastJumpTime < 0.5) {
    const jumps = ['JUMP!', 'DOUBLE!', 'TRIPLE!!!'][player.jumpCount - 1] || 'JUMP!';
    drawTextOutline(
      jumps,
      280, 50,
      rgba8(255, 255, 255, 255),
      rgba8(255, 100, 0, 255),
      2
    );
  }
  
  // Ground pound indicator
  if (player.groundPounding) {
    drawTextOutline(
      'GROUND POUND!',
      240, 80,
      rgba8(255, 50, 50, 255),
      rgba8(0, 0, 0, 255),
      2
    );
  }
  
  // Controls
  print('ARROWS: Move  SPACE: Jump', 10, 340, rgba8(255, 255, 255, 200), 1);
  print('Q/E: Rotate Camera  DOWN+JUMP: Ground Pound', 10, 352, rgba8(255, 255, 255, 200), 1);
  
  // Win condition
  if (starsCollected >= 3) {
    drawTextShadow(
      'ALL STARS COLLECTED!',
      200, 180,
      rgba8(255, 255, 0, 255),
      rgba8(255, 100, 0, 255),
      3, 3
    );
    drawTextShadow(
      'YOU WIN!',
      280, 200,
      rgba8(0, 255, 0, 255),
      rgba8(0, 100, 0, 255),
      3, 3
    );
  }
}

function drawStartScreen() {
  // Dark background overlay
  rect(0, 0, 640, 360, rgba8(10, 10, 30, 220), true);
  
  // Title with shadow effect (centered manually)
  drawTextShadow(
    'SUPER PLUMBER 64',
    200, 80,
    rgba8(255, 0, 0, 255),
    rgba8(100, 0, 0, 255),
    3, 3
  );
  
  // Subtitle
  drawTextOutline(
    'A Mario-Style 3D Platformer',
    180, 120,
    rgba8(255, 255, 100, 255),
    rgba8(100, 50, 0, 255),
    2
  );
  
  // Pulsing start prompt
  const pulse = Math.sin(time * 3) * 0.5 + 0.5;
  const alpha = Math.floor(pulse * 200 + 55);
  drawTextOutline(
    'PRESS SPACE TO START',
    190, 180,
    rgba8(255, 255, 255, alpha),
    rgba8(0, 0, 0, 255),
    2
  );
  
  // Controls
  print('Controls:', 280, 230, rgba8(200, 200, 200, 255), 1);
  print('ARROWS / WASD = Move', 240, 250, rgba8(180, 180, 180, 255), 1);
  print('SPACE / Z = Jump', 250, 270, rgba8(180, 180, 180, 255), 1);
  print('Q / E = Camera', 265, 290, rgba8(180, 180, 180, 255), 1);
  print('DOWN + JUMP = Ground Pound', 210, 310, rgba8(180, 180, 180, 255), 1);
  
  // Features
  print('* Triple Jump System', 30, 230, rgba8(255, 200, 100, 255), 1);
  print('* Ground Pound Attack', 30, 250, rgba8(255, 200, 100, 255), 1);
  print('* Collect Coins & Stars', 30, 270, rgba8(255, 200, 100, 255), 1);
  print('* 3D Platforming Action', 30, 290, rgba8(255, 200, 100, 255), 1);
}
