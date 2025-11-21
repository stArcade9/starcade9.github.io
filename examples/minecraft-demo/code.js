/**
 * Nova64 Minecraft Demo
 * 
 * Minecraft-style voxel game with:
 * - Infinite procedurally generated world
 * - Block placement and breaking
 * - First-person controls
 * - Multiple block types
 * - Trees and terrain
 */

// Player state
const player = {
  pos: [8, 40, 8],
  vel: [0, 0, 0],
  rot: [0, 0], // [yaw, pitch]
  onGround: false,
  speed: 4.0,
  jumpPower: 8.0,
  gravity: -20.0,
  mouseSensitivity: 0.002,
  selectedBlock: 1, // GRASS
  reach: 10
};

// Camera state
let mouseLocked = false;

// Game state
let targetBlock = null;

// Block selection hotbar
const hotbar = [
  BLOCK_TYPES.GRASS,
  BLOCK_TYPES.DIRT,
  BLOCK_TYPES.STONE,
  BLOCK_TYPES.WOOD,
  BLOCK_TYPES.PLANKS,
  BLOCK_TYPES.COBBLESTONE,
  BLOCK_TYPES.GLASS,
  BLOCK_TYPES.BRICK,
  BLOCK_TYPES.SAND
];

export function init() {
  console.log('🎮 Minecraft Demo - Voxel Engine');
  
  // Setup lighting for voxel world
  setAmbientLight(0x666666);
  setDirectionalLight([1, 2, 1], 0xffffff, 0.6);
  
  // Setup fog for distance
  setFog(0x87ceeb, 80, 200);
  
  // Setup camera with wide FOV for full-screen immersive first-person view
  setCameraFOV(95); // Wide angle like Minecraft (default is 75)
  setCameraPosition(player.pos[0], player.pos[1] + 1.6, player.pos[2]);
  setCameraLookAt([0, 0, -1]);
  
  // Generate initial chunks
  console.log('🌍 Generating world...');
  updateVoxelWorld(player.pos[0], player.pos[2]);
  console.log('✅ World generated! Adding trees...');
  
  // Add some trees
  placeVoxelTree(10, 35, 10);
  placeVoxelTree(20, 33, 15);
  placeVoxelTree(-5, 36, 8);
  placeVoxelTree(15, 34, -10);
  console.log('🌳 Trees placed!');
  
  // Request pointer lock on click
  const canvas = document.getElementById('screen');
  canvas.addEventListener('click', () => {
    if (!mouseLocked) {
      canvas.requestPointerLock();
    }
  });
  
  document.addEventListener('pointerlockchange', () => {
    mouseLocked = document.pointerLockElement === canvas;
    if (mouseLocked) {
      console.log('🎯 Mouse locked - WASD to move, Space to jump, 1-9 to select blocks');
    } else {
      console.log('🖱️ Click to play - ESC to exit');
    }
  });
  
  // Mouse movement
  canvas.addEventListener('mousemove', (e) => {
    if (mouseLocked) {
      player.rot[0] -= e.movementX * player.mouseSensitivity;
      player.rot[1] -= e.movementY * player.mouseSensitivity;
      
      // Clamp pitch
      player.rot[1] = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.rot[1]));
    }
  });
  
  console.log('✅ Minecraft demo initialized');
  console.log('📋 Controls:');
  console.log('   Click canvas to lock mouse');
  console.log('   WASD - Move');
  console.log('   Space - Jump');
  console.log('   Mouse - Look around');
  console.log('   Left Click - Break block');
  console.log('   Right Click - Place block');
  console.log('   1-9 - Select block type');
  console.log('   ESC - Exit pointer lock');
}

export function update(dt) {
  // Clamp delta time to prevent huge jumps
  dt = Math.min(dt, 0.1);
  
  if (!mouseLocked) return;
  
  // Update player movement
  updatePlayerMovement(dt);
  
  // Update player physics
  updatePlayerPhysics(dt);
  
  // Update camera
  updateCamera();
  
  // Update chunks based on player position
  if (Math.random() < 0.1) { // Update every ~10 frames
    updateVoxelWorld(player.pos[0], player.pos[2]);
  }
  
  // Block interaction
  updateBlockInteraction();
  
  // Block selection with number keys
  for (let i = 0; i < 9; i++) {
    if (isKeyPressed((i + 1).toString())) {
      player.selectedBlock = hotbar[i];
    }
  }
}

function updatePlayerMovement(dt) {
  const moveDir = [0, 0, 0];
  
  // Calculate movement direction
  const forward = [
    Math.sin(player.rot[0]),
    0,
    Math.cos(player.rot[0])
  ];
  
  const right = [
    Math.sin(player.rot[0] + Math.PI / 2),
    0,
    Math.cos(player.rot[0] + Math.PI / 2)
  ];
  
  // WASD movement
  if (isKeyDown('KeyW')) {
    moveDir[0] -= forward[0];
    moveDir[2] -= forward[2];
  }
  if (isKeyDown('KeyS')) {
    moveDir[0] += forward[0];
    moveDir[2] += forward[2];
  }
  if (isKeyDown('KeyA')) {
    moveDir[0] -= right[0];
    moveDir[2] -= right[2];
  }
  if (isKeyDown('KeyD')) {
    moveDir[0] += right[0];
    moveDir[2] += right[2];
  }
  
  // Normalize movement
  const moveLength = Math.sqrt(moveDir[0] * moveDir[0] + moveDir[2] * moveDir[2]);
  if (moveLength > 0) {
    moveDir[0] /= moveLength;
    moveDir[2] /= moveLength;
  }
  
  // Apply movement to velocity
  const targetVelX = moveDir[0] * player.speed;
  const targetVelZ = moveDir[2] * player.speed;
  
  // Smooth acceleration
  player.vel[0] += (targetVelX - player.vel[0]) * 10 * dt;
  player.vel[2] += (targetVelZ - player.vel[2]) * 10 * dt;
  
  // Jump
  if (isKeyPressed('Space') && player.onGround) {
    player.vel[1] = player.jumpPower;
    player.onGround = false;
  }
  
  // Sprint with Shift
  const sprintMult = isKeyDown('ShiftLeft') ? 2.0 : 1.0;
  player.vel[0] *= sprintMult;
  player.vel[2] *= sprintMult;
}

function updatePlayerPhysics(dt) {
  // Apply gravity
  player.vel[1] += player.gravity * dt;
  
  // Save old position
  const oldPos = [...player.pos];
  
  // Apply velocity
  player.pos[0] += player.vel[0] * dt;
  player.pos[1] += player.vel[1] * dt;
  player.pos[2] += player.vel[2] * dt;
  
  // Collision detection (simple AABB)
  const playerSize = 0.3;
  const playerHeight = 1.8;
  
  // Check collision
  const collisionBottom = checkVoxelCollision(
    [player.pos[0], player.pos[1], player.pos[2]],
    playerSize
  );
  
  const collisionTop = checkVoxelCollision(
    [player.pos[0], player.pos[1] + playerHeight, player.pos[2]],
    playerSize
  );
  
  // Ground collision
  if (collisionBottom && player.vel[1] <= 0) {
    player.pos[1] = Math.floor(player.pos[1]) + 1;
    player.vel[1] = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }
  
  // Ceiling collision
  if (collisionTop && player.vel[1] > 0) {
    player.vel[1] = 0;
  }
  
  // Wall collision (X axis)
  player.pos[1] = oldPos[1];
  const collisionX = checkVoxelCollision([player.pos[0], player.pos[1] + 0.9, player.pos[2]], playerSize);
  if (collisionX) {
    player.pos[0] = oldPos[0];
    player.vel[0] = 0;
  }
  player.pos[1] = player.pos[1] + player.vel[1] * dt;
  
  // Wall collision (Z axis)
  player.pos[1] = oldPos[1];
  const collisionZ = checkVoxelCollision([player.pos[0], player.pos[1] + 0.9, player.pos[2]], playerSize);
  if (collisionZ) {
    player.pos[2] = oldPos[2];
    player.vel[2] = 0;
  }
  player.pos[1] = player.pos[1] + player.vel[1] * dt;
  
  // Prevent falling through world
  if (player.pos[1] < 0) {
    player.pos[1] = 40;
    player.vel[1] = 0;
  }
}

function updateCamera() {
  // Set camera position (at player eyes)
  const eyeHeight = 1.6;
  setCameraPosition(
    player.pos[0],
    player.pos[1] + eyeHeight,
    player.pos[2]
  );
  
  // Set camera rotation
  const yaw = player.rot[0];
  const pitch = player.rot[1];
  
  const lookDir = [
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  ];
  
  setCameraLookAt(lookDir);
}

function updateBlockInteraction() {
  // Get camera look direction
  const yaw = player.rot[0];
  const pitch = player.rot[1];
  
  const lookDir = [
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  ];
  
  const eyeHeight = 1.6;
  const rayOrigin = [
    player.pos[0],
    player.pos[1] + eyeHeight,
    player.pos[2]
  ];
  
  // Raycast to find target block
  const result = raycastVoxelBlock(rayOrigin, lookDir, player.reach);
  
  if (result.hit) {
    targetBlock = result;
    
    // Break block with left click
    if (isMousePressed(0)) {
      const [x, y, z] = result.position;
      setVoxelBlock(x, y, z, BLOCK_TYPES.AIR);
      console.log(`💥 Broke block at ${x}, ${y}, ${z}`);
    }
    
    // Place block with right click
    if (isMousePressed(2)) {
      // Calculate placement position (one block back along ray)
      const [x, y, z] = result.position;
      const placeX = Math.floor(x - Math.sign(lookDir[0]) * 0.5);
      const placeY = Math.floor(y - Math.sign(lookDir[1]) * 0.5);
      const placeZ = Math.floor(z - Math.sign(lookDir[2]) * 0.5);
      
      // Don't place block inside player
      const playerBlockX = Math.floor(player.pos[0]);
      const playerBlockY = Math.floor(player.pos[1]);
      const playerBlockZ = Math.floor(player.pos[2]);
      
      const tooClose = (
        Math.abs(placeX - playerBlockX) < 1 &&
        Math.abs(placeY - playerBlockY) < 2 &&
        Math.abs(placeZ - playerBlockZ) < 1
      );
      
      if (!tooClose) {
        setVoxelBlock(placeX, placeY, placeZ, player.selectedBlock);
        console.log(`🧱 Placed block type ${player.selectedBlock} at ${placeX}, ${placeY}, ${placeZ}`);
      }
    }
  } else {
    targetBlock = null;
  }
}

export function draw() {
  // 3D world is rendered automatically by GPU
  // Do NOT call cls() here - it would clear the GPU-rendered 3D scene!
  
  // Draw crosshair
  if (mouseLocked) {
    const cx = 320;
    const cy = 180;
    const size = 8;
    
    // Crosshair color changes if looking at block
    const color = targetBlock ? rgba8(1, 1, 1, 1) : rgba8(0.7, 0.7, 0.7, 1);
    
    // Draw crosshair lines
    rectfill(cx - size, cy - 1, cx + size, cy + 1, color);
    rectfill(cx - 1, cy - size, cx + 1, cy + size, color);
  }
  
  // Draw hotbar
  drawHotbar();
  
  // Draw instructions
  if (!mouseLocked) {
    const msg = 'CLICK TO PLAY';
    const x = 320 - msg.length * 4;
    rectfill(x - 4, 176, x + msg.length * 8 + 4, 196, rgba8(0, 0, 0, 0.7));
    print(msg, x, 180, rgba8(1, 1, 1, 1));
  }
  
  // Draw debug info
  print(`FPS: ${Math.round(1 / getDeltaTime())}`, 4, 4, rgba8(1, 1, 1, 1));
  print(`Pos: ${Math.floor(player.pos[0])}, ${Math.floor(player.pos[1])}, ${Math.floor(player.pos[2])}`, 4, 12, rgba8(1, 1, 1, 1));
  print(`Block: ${getBlockName(player.selectedBlock)}`, 4, 20, rgba8(1, 1, 1, 1));
  
  if (targetBlock) {
    const [x, y, z] = targetBlock.position;
    print(`Looking at: ${getBlockName(targetBlock.blockType)} (${x}, ${y}, ${z})`, 4, 28, rgba8(1, 1, 1, 1));
    print(`Distance: ${targetBlock.distance.toFixed(1)}m`, 4, 36, rgba8(1, 1, 1, 1));
  }
}

function drawHotbar() {
  const barWidth = 9 * 36;
  const barHeight = 40;
  const barX = 320 - barWidth / 2;
  const barY = 340;
  
  // Draw hotbar background
  rectfill(barX - 2, barY - 2, barX + barWidth + 2, barY + barHeight + 2, rgba8(0, 0, 0, 0.5));
  
  // Draw slots
  for (let i = 0; i < 9; i++) {
    const slotX = barX + i * 36;
    const slotY = barY;
    const blockType = hotbar[i];
    
    // Highlight selected slot
    if (blockType === player.selectedBlock) {
      rectfill(slotX, slotY, slotX + 32, slotY + 32, rgba8(1, 1, 1, 0.3));
    }
    
    // Draw slot border
    rect(slotX, slotY, slotX + 32, slotY + 32, rgba8(1, 1, 1, 1));
    
    // Draw block color
    const color = getBlockColor(blockType);
    rectfill(slotX + 4, slotY + 4, slotX + 28, slotY + 28, color);
    
    // Draw number
    print((i + 1).toString(), slotX + 2, slotY + 2, rgba8(1, 1, 1, 1));
  }
}

function getBlockColor(blockType) {
  const colors = {
    [BLOCK_TYPES.GRASS]: rgba8(0.29, 0.61, 0.18, 1),
    [BLOCK_TYPES.DIRT]: rgba8(0.55, 0.35, 0.24, 1),
    [BLOCK_TYPES.STONE]: rgba8(0.5, 0.5, 0.5, 1),
    [BLOCK_TYPES.SAND]: rgba8(0.88, 0.84, 0.54, 1),
    [BLOCK_TYPES.WOOD]: rgba8(0.44, 0.31, 0.22, 1),
    [BLOCK_TYPES.PLANKS]: rgba8(0.85, 0.65, 0.13, 1),
    [BLOCK_TYPES.COBBLESTONE]: rgba8(0.41, 0.41, 0.41, 1),
    [BLOCK_TYPES.GLASS]: rgba8(0.68, 0.85, 0.90, 0.5),
    [BLOCK_TYPES.BRICK]: rgba8(0.55, 0, 0, 1)
  };
  return colors[blockType] || rgba8(1, 1, 1, 1);
}

function getBlockName(blockType) {
  const names = {
    [BLOCK_TYPES.GRASS]: 'Grass',
    [BLOCK_TYPES.DIRT]: 'Dirt',
    [BLOCK_TYPES.STONE]: 'Stone',
    [BLOCK_TYPES.SAND]: 'Sand',
    [BLOCK_TYPES.WOOD]: 'Wood',
    [BLOCK_TYPES.PLANKS]: 'Planks',
    [BLOCK_TYPES.COBBLESTONE]: 'Cobblestone',
    [BLOCK_TYPES.GLASS]: 'Glass',
    [BLOCK_TYPES.BRICK]: 'Brick'
  };
  return names[blockType] || 'Unknown';
}
