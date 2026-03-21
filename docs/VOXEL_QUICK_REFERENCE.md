# Nova64 Voxel Engine - Quick Reference

## 🎮 Getting Started (3 lines)

```javascript
export function init() {
  updateVoxelWorld(0, 0); // Generate world
}

export function update(dt) {
  if (Math.random() < 0.1) updateVoxelWorld(playerX, playerZ);
}
```

## 📦 Block Types

```javascript
BLOCK_TYPES.AIR; // 0  - Empty
BLOCK_TYPES.GRASS; // 1  - Green grass
BLOCK_TYPES.DIRT; // 2  - Brown dirt
BLOCK_TYPES.STONE; // 3  - Gray stone
BLOCK_TYPES.SAND; // 4  - Yellow sand
BLOCK_TYPES.WATER; // 5  - Blue water (transparent)
BLOCK_TYPES.WOOD; // 6  - Tree trunk
BLOCK_TYPES.LEAVES; // 7  - Green leaves
BLOCK_TYPES.COBBLESTONE; // 8  - Gray cobble
BLOCK_TYPES.PLANKS; // 9  - Wood planks
BLOCK_TYPES.GLASS; // 10 - Transparent
BLOCK_TYPES.BRICK; // 11 - Red brick
BLOCK_TYPES.SNOW; // 12 - White snow
BLOCK_TYPES.ICE; // 13 - Ice
BLOCK_TYPES.BEDROCK; // 14 - Bottom layer
```

## 🔧 Core Functions

### World Management

```javascript
// Load chunks around player (call in update loop)
updateVoxelWorld(playerX, playerZ);
```

### Block Get/Set

```javascript
// Get block type at position
const block = getVoxelBlock(x, y, z);

// Place block
setVoxelBlock(x, y, z, BLOCK_TYPES.STONE);

// Remove block
setVoxelBlock(x, y, z, BLOCK_TYPES.AIR);
```

### Raycasting (Mining/Building)

```javascript
const result = raycastVoxelBlock(
  [playerX, playerY, playerZ], // Origin
  [dirX, dirY, dirZ], // Direction (normalized)
  10 // Max distance
);

if (result.hit) {
  const [x, y, z] = result.position;
  console.log(`Hit ${result.blockType} at ${x},${y},${z}`);
  console.log(`Distance: ${result.distance}`);
}
```

### Collision Detection

```javascript
const isColliding = checkVoxelCollision(
  [x, y, z], // Center position
  0.3 // Radius (half-size)
);

// Player collision example
const onGround = checkVoxelCollision([player.x, player.y, player.z], 0.3);
```

### Structure Generation

```javascript
// Place a tree
placeVoxelTree(x, y, z);

// Forest
for (let i = 0; i < 20; i++) {
  const x = Math.random() * 200 - 100;
  const z = Math.random() * 200 - 100;
  placeVoxelTree(x, 35, z);
}
```

## 💡 Common Patterns

### Mining System

```javascript
// In update()
const lookDir = getCameraDirection();
const eyePos = [player.x, player.y + 1.6, player.z];
const result = raycastVoxelBlock(eyePos, lookDir, 10);

if (result.hit && isMousePressed(0)) {
  const [x, y, z] = result.position;
  setVoxelBlock(x, y, z, BLOCK_TYPES.AIR);
  console.log('Block broken!');
}
```

### Building System

```javascript
// In update()
const result = raycastVoxelBlock(eyePos, lookDir, 10);

if (result.hit && isMousePressed(2)) {
  // Place adjacent to hit block
  const [x, y, z] = result.position;
  const placeX = x - Math.sign(lookDir[0]);
  const placeY = y - Math.sign(lookDir[1]);
  const placeZ = z - Math.sign(lookDir[2]);

  setVoxelBlock(placeX, placeY, placeZ, selectedBlockType);
}
```

### Player Physics

```javascript
// Gravity
player.velY -= 20 * dt;

// Apply movement
player.y += player.velY * dt;

// Ground collision
const onGround = checkVoxelCollision([player.x, player.y, player.z], 0.3);
if (onGround && player.velY <= 0) {
  player.y = Math.floor(player.y) + 1;
  player.velY = 0;
}

// Jump
if (isKeyPressed('Space') && onGround) {
  player.velY = 8.0;
}
```

### Find Ground Height

```javascript
function getGroundHeight(x, z) {
  for (let y = 63; y >= 0; y--) {
    const block = getVoxelBlock(x, y, z);
    if (block !== BLOCK_TYPES.AIR && block !== BLOCK_TYPES.WATER) {
      return y + 1;
    }
  }
  return 0;
}
```

### Build Structure

```javascript
// Simple house
function buildHouse(x, y, z) {
  // Floor (8x8)
  for (let dx = 0; dx < 8; dx++) {
    for (let dz = 0; dz < 8; dz++) {
      setVoxelBlock(x + dx, y, z + dz, BLOCK_TYPES.PLANKS);
    }
  }

  // Walls (4 blocks high)
  for (let dy = 1; dy <= 4; dy++) {
    // Front and back
    for (let dx = 0; dx < 8; dx++) {
      setVoxelBlock(x + dx, y + dy, z, BLOCK_TYPES.WOOD);
      setVoxelBlock(x + dx, y + dy, z + 7, BLOCK_TYPES.WOOD);
    }
    // Left and right
    for (let dz = 0; dz < 8; dz++) {
      setVoxelBlock(x, y + dy, z + dz, BLOCK_TYPES.WOOD);
      setVoxelBlock(x + 7, y + dy, z + dz, BLOCK_TYPES.WOOD);
    }
  }

  // Roof
  for (let dx = 0; dx < 8; dx++) {
    for (let dz = 0; dz < 8; dz++) {
      setVoxelBlock(x + dx, y + 5, z + dz, BLOCK_TYPES.BRICK);
    }
  }

  // Door (2 blocks high)
  setVoxelBlock(x + 3, y + 1, z, BLOCK_TYPES.AIR);
  setVoxelBlock(x + 3, y + 2, z, BLOCK_TYPES.AIR);
}
```

## 🎯 Minimal Minecraft Clone

```javascript
const player = {
  pos: [8, 40, 8],
  vel: [0, 0, 0],
  rot: [0, 0],
  selectedBlock: BLOCK_TYPES.GRASS,
};

let locked = false;

export function init() {
  setAmbientLight(0x666666);
  updateVoxelWorld(0, 0);

  const canvas = document.getElementById('screen');
  canvas.addEventListener('click', () => canvas.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });
  canvas.addEventListener('mousemove', e => {
    if (locked) {
      player.rot[0] -= e.movementX * 0.002;
      player.rot[1] -= e.movementY * 0.002;
    }
  });
}

export function update(dt) {
  if (!locked) return;

  // Movement
  const speed = 4;
  if (isKeyDown('KeyW')) player.vel[2] -= speed * dt;
  if (isKeyDown('KeyS')) player.vel[2] += speed * dt;
  if (isKeyDown('KeyA')) player.vel[0] -= speed * dt;
  if (isKeyDown('KeyD')) player.vel[0] += speed * dt;

  // Physics
  player.vel[1] -= 20 * dt;
  if (isKeyPressed('Space') && checkVoxelCollision(player.pos, 0.3)) {
    player.vel[1] = 8;
  }

  player.pos[0] += player.vel[0] * dt;
  player.pos[1] += player.vel[1] * dt;
  player.pos[2] += player.vel[2] * dt;

  if (checkVoxelCollision(player.pos, 0.3)) {
    player.pos[1] = Math.floor(player.pos[1]) + 1;
    player.vel[1] = 0;
  }

  player.vel[0] *= 0.8;
  player.vel[2] *= 0.8;

  // Camera
  setCameraPosition(player.pos[0], player.pos[1] + 1.6, player.pos[2]);
  const lookDir = [
    -Math.sin(player.rot[0]) * Math.cos(player.rot[1]),
    Math.sin(player.rot[1]),
    -Math.cos(player.rot[0]) * Math.cos(player.rot[1]),
  ];
  setCameraLookAt(lookDir);

  // Block interaction
  const result = raycastVoxelBlock(
    [player.pos[0], player.pos[1] + 1.6, player.pos[2]],
    lookDir,
    10
  );

  if (result.hit) {
    const [x, y, z] = result.position;
    if (isMousePressed(0)) setVoxelBlock(x, y, z, BLOCK_TYPES.AIR);
    if (isMousePressed(2)) setVoxelBlock(x, y, z, player.selectedBlock);
  }

  // World update
  if (Math.random() < 0.1) updateVoxelWorld(player.pos[0], player.pos[2]);

  // Block selection
  for (let i = 1; i <= 9; i++) {
    if (isKeyPressed(i.toString())) player.selectedBlock = i;
  }
}

export function draw() {
  cls();
  if (locked) {
    rectfill(318, 179, 322, 181, rgba8(1, 1, 1, 1));
    rectfill(319, 178, 321, 182, rgba8(1, 1, 1, 1));
  }
  print(`FPS: ${Math.round(1 / getDeltaTime())}`, 4, 4, rgba8(1, 1, 1, 1));
}
```

## ⚡ Performance Tips

### ✅ DO:

```javascript
// Update chunks occasionally
if (frameCount % 10 === 0) {
  updateVoxelWorld(playerX, playerZ);
}

// Use collision detection
const onGround = checkVoxelCollision(pos, 0.3);

// Batch block changes
for (let i = 0; i < 100; i++) {
  setVoxelBlock(x + i, y, z, type);
}
```

### ❌ DON'T:

```javascript
// Don't update every frame
export function update() {
  updateVoxelWorld(x, z); // TOO EXPENSIVE!
}

// Don't check many blocks manually
for (let x = -10; x < 10; x++) {
  for (let z = -10; z < 10; z++) {
    getVoxelBlock(x, y, z); // Use collision instead!
  }
}
```

## 🌍 World Info

- **Chunk Size**: 16×64×16 blocks
- **Render Distance**: 4 chunks (64 blocks)
- **World Height**: 0-63 blocks
- **Bedrock Layer**: Y=0 (indestructible)
- **Water Level**: Y=30
- **Surface**: Y=20-52 (varies with noise)
- **Infinite**: Chunks generate on demand

## 🎨 Terrain Features

- **Height**: Multi-octave Perlin noise
- **Biomes**: Grass, Sand, Snow (based on temperature/moisture)
- **Caves**: 3D noise threshold underground
- **Trees**: Procedural with random height
- **Water**: Fills below Y=30

## 🔍 Debugging

```javascript
// Check block under player
const block = getVoxelBlock(Math.floor(player.x), Math.floor(player.y) - 1, Math.floor(player.z));
console.log(`Standing on: ${block}`);

// Draw debug info
print(`Pos: ${Math.floor(player.x)}, ${Math.floor(player.y)}, ${Math.floor(player.z)}`, 4, 4);
print(`Chunks loaded: ${chunkCount}`, 4, 12);
```

## 📊 Performance Costs

| Operation               | Cost   | Notes                |
| ----------------------- | ------ | -------------------- |
| `updateVoxelWorld()`    | High   | Call every 10 frames |
| `setVoxelBlock()`       | Medium | Auto-updates chunk   |
| `getVoxelBlock()`       | Low    | Fast lookup          |
| `raycastVoxelBlock()`   | Low    | <0.1ms per ray       |
| `checkVoxelCollision()` | Low    | Checks ~8 blocks     |
| `placeVoxelTree()`      | Medium | Places ~100 blocks   |

## 🚀 Ready to Build!

Check out the full Minecraft demo in `examples/minecraft-demo/` for a complete working game!

See `VOXEL_ENGINE_GUIDE.md` for detailed documentation and advanced examples.
