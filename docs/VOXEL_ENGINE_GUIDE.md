# Nova64 Voxel Engine API Guide

## Overview

The Nova64 Voxel Engine enables Minecraft-style block-based games with infinite procedurally generated worlds. It features:

- **Chunk-based world management** - Efficient memory usage with 16x64x16 chunks
- **Greedy meshing** - Optimized rendering with minimal draw calls
- **Procedural terrain generation** - Perlin noise with biomes, caves, and height variation
- **Multiple block types** - 15 different block materials
- **Real-time editing** - Place and break blocks instantly
- **Collision detection** - Full physics support for player and entities
- **Infinite worlds** - Chunks load/unload dynamically

## Quick Start

```javascript
export function init() {
  // Setup lighting
  setAmbientLight(0x666666);
  setDirectionalLight([1, 2, 1], 0xffffff, 0.6);

  // Generate world around player
  updateVoxelWorld(playerX, playerZ);

  // Add some trees
  placeVoxelTree(10, 35, 10);
}

export function update(dt) {
  // Update chunks as player moves
  updateVoxelWorld(playerX, playerZ);

  // Get block at position
  const block = getVoxelBlock(x, y, z);

  // Place or remove blocks
  if (isKeyPressed('Space')) {
    setVoxelBlock(x, y, z, BLOCK_TYPES.STONE);
  }
}
```

## Block Types

### Available Blocks

```javascript
BLOCK_TYPES.AIR; // 0 - Empty space
BLOCK_TYPES.GRASS; // 1 - Green grass block
BLOCK_TYPES.DIRT; // 2 - Brown dirt
BLOCK_TYPES.STONE; // 3 - Gray stone
BLOCK_TYPES.SAND; // 4 - Yellow sand
BLOCK_TYPES.WATER; // 5 - Blue water (transparent)
BLOCK_TYPES.WOOD; // 6 - Dark brown wood log
BLOCK_TYPES.LEAVES; // 7 - Green tree leaves
BLOCK_TYPES.COBBLESTONE; // 8 - Gray cobblestone
BLOCK_TYPES.PLANKS; // 9 - Wooden planks
BLOCK_TYPES.GLASS; // 10 - Light blue glass (transparent)
BLOCK_TYPES.BRICK; // 11 - Red brick
BLOCK_TYPES.SNOW; // 12 - White snow
BLOCK_TYPES.ICE; // 13 - Light blue ice
BLOCK_TYPES.BEDROCK; // 14 - Dark gray bedrock (bottom layer)
```

## World Management

### updateVoxelWorld(playerX, playerZ)

Updates visible chunks around the player position. Call this in your `update()` function when the player moves significantly.

**Parameters:**

- `playerX` - Player's X world coordinate
- `playerZ` - Player's Z world coordinate

**Example:**

```javascript
export function update(dt) {
  // Update every few frames to reduce overhead
  if (Math.random() < 0.1) {
    updateVoxelWorld(player.pos[0], player.pos[2]);
  }
}
```

**Performance:** Automatically loads chunks within render distance (4 chunks = 64 blocks) and unloads distant chunks to manage memory.

## Block Manipulation

### getVoxelBlock(x, y, z)

Returns the block type at the specified world coordinates.

**Parameters:**

- `x` - World X coordinate
- `y` - World Y coordinate (0-63)
- `z` - World Z coordinate

**Returns:** Block type constant (0-14) or `BLOCK_TYPES.AIR` if out of bounds

**Example:**

```javascript
const blockUnderPlayer = getVoxelBlock(
  Math.floor(playerX),
  Math.floor(playerY) - 1,
  Math.floor(playerZ)
);

if (blockUnderPlayer === BLOCK_TYPES.WATER) {
  console.log('Player is standing on water!');
}
```

### setVoxelBlock(x, y, z, blockType)

Places or removes a block at the specified world coordinates. Automatically updates chunk meshes.

**Parameters:**

- `x` - World X coordinate
- `y` - World Y coordinate (0-63)
- `z` - World Z coordinate
- `blockType` - Block type constant (use `BLOCK_TYPES.AIR` to remove)

**Example:**

```javascript
// Break block (set to air)
setVoxelBlock(10, 35, 10, BLOCK_TYPES.AIR);

// Place stone block
setVoxelBlock(10, 35, 10, BLOCK_TYPES.STONE);

// Build a wall
for (let y = 0; y < 5; y++) {
  setVoxelBlock(20, 30 + y, 20, BLOCK_TYPES.BRICK);
}
```

**Performance:** Efficiently updates only affected chunks. Adjacent chunks are automatically marked dirty if the block is on a boundary.

## Raycasting

### raycastVoxelBlock(origin, direction, maxDistance)

Casts a ray from a point in a direction to find the first solid block hit. Perfect for mining/building mechanics.

**Parameters:**

- `origin` - Starting point `[x, y, z]`
- `direction` - Ray direction `[dx, dy, dz]` (should be normalized)
- `maxDistance` - Maximum ray distance (default: 10)

**Returns:** Object with:

```javascript
{
  hit: true,              // Whether a block was hit
  position: [x, y, z],    // Block coordinates
  blockType: 3,           // Type of block hit
  distance: 5.2           // Distance to block
}
```

**Example:**

```javascript
// Camera/player looking direction
const lookDir = [
  -Math.sin(yaw) * Math.cos(pitch),
  Math.sin(pitch),
  -Math.cos(yaw) * Math.cos(pitch),
];

const result = raycastVoxelBlock(
  [playerX, playerY + eyeHeight, playerZ],
  lookDir,
  10 // 10 block reach
);

if (result.hit) {
  // Left click to break
  if (isMousePressed(0)) {
    const [x, y, z] = result.position;
    setVoxelBlock(x, y, z, BLOCK_TYPES.AIR);
  }

  // Right click to place
  if (isMousePressed(2)) {
    // Calculate adjacent block position
    const placeX = Math.floor(result.position[0] - Math.sign(lookDir[0]) * 0.5);
    const placeY = Math.floor(result.position[1] - Math.sign(lookDir[1]) * 0.5);
    const placeZ = Math.floor(result.position[2] - Math.sign(lookDir[2]) * 0.5);

    setVoxelBlock(placeX, placeY, placeZ, BLOCK_TYPES.COBBLESTONE);
  }
}
```

## Collision Detection

### checkVoxelCollision(position, size)

Checks if an axis-aligned bounding box collides with any solid blocks.

**Parameters:**

- `position` - Center position `[x, y, z]`
- `size` - Half-size of bounding box (radius)

**Returns:** `true` if colliding with solid block, `false` otherwise

**Example:**

```javascript
const playerSize = 0.3; // 0.6 block width
const playerHeight = 1.8; // 1.8 blocks tall

// Check if player's feet are on solid ground
const onGround = checkVoxelCollision([player.pos[0], player.pos[1], player.pos[2]], playerSize);

// Check head collision
const hitCeiling = checkVoxelCollision(
  [player.pos[0], player.pos[1] + playerHeight, player.pos[2]],
  playerSize
);

// Simple physics
if (onGround && player.vel[1] <= 0) {
  player.vel[1] = 0;
  player.canJump = true;
}

if (hitCeiling && player.vel[1] > 0) {
  player.vel[1] = 0;
}
```

## Structure Generation

### placeVoxelTree(x, y, z)

Generates a tree structure at the specified coordinates. Trees consist of wood trunk with leaf canopy.

**Parameters:**

- `x` - World X coordinate for tree base
- `y` - World Y coordinate for ground level
- `z` - World Z coordinate for tree base

**Example:**

```javascript
export function init() {
  // Generate initial world
  updateVoxelWorld(0, 0);

  // Add trees to landscape
  placeVoxelTree(10, 35, 10);
  placeVoxelTree(20, 33, 15);
  placeVoxelTree(-5, 36, 8);

  // Cluster of trees
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * 100 - 50;
    const z = Math.random() * 100 - 50;
    const y = getGroundHeight(x, z);
    placeVoxelTree(x, y, z);
  }
}
```

**Tree Structure:**

- Trunk: 4-6 blocks tall of `BLOCK_TYPES.WOOD`
- Leaves: Spherical canopy of `BLOCK_TYPES.LEAVES`
- Automatic variation in size

## Complete Minecraft-Style Game Example

```javascript
const player = {
  pos: [8, 40, 8],
  vel: [0, 0, 0],
  rot: [0, 0], // yaw, pitch
  onGround: false,
  selectedBlock: BLOCK_TYPES.GRASS,
};

let mouseLocked = false;

export function init() {
  // Setup world
  setAmbientLight(0x666666);
  setDirectionalLight([1, 2, 1], 0xffffff, 0.6);
  setFog(0x87ceeb, 80, 200);

  // Generate terrain
  updateVoxelWorld(player.pos[0], player.pos[2]);

  // Add trees
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 200 - 100;
    const z = Math.random() * 200 - 100;
    placeVoxelTree(x, 35, z);
  }

  // Pointer lock for mouse control
  const canvas = document.getElementById('screen');
  canvas.addEventListener('click', () => {
    if (!mouseLocked) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    mouseLocked = document.pointerLockElement === canvas;
  });

  canvas.addEventListener('mousemove', e => {
    if (mouseLocked) {
      player.rot[0] -= e.movementX * 0.002;
      player.rot[1] -= e.movementY * 0.002;
      player.rot[1] = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.rot[1]));
    }
  });
}

export function update(dt) {
  if (!mouseLocked) return;

  // Movement
  const forward = [-Math.sin(player.rot[0]), 0, -Math.cos(player.rot[0])];
  const right = [-Math.sin(player.rot[0] + Math.PI / 2), 0, -Math.cos(player.rot[0] + Math.PI / 2)];

  const speed = 4.0;
  if (isKeyDown('KeyW')) {
    player.vel[0] += forward[0] * speed * dt;
    player.vel[2] += forward[2] * speed * dt;
  }
  if (isKeyDown('KeyS')) {
    player.vel[0] -= forward[0] * speed * dt;
    player.vel[2] -= forward[2] * speed * dt;
  }
  if (isKeyDown('KeyA')) {
    player.vel[0] += right[0] * speed * dt;
    player.vel[2] += right[2] * speed * dt;
  }
  if (isKeyDown('KeyD')) {
    player.vel[0] -= right[0] * speed * dt;
    player.vel[2] -= right[2] * speed * dt;
  }

  // Jump
  if (isKeyPressed('Space') && player.onGround) {
    player.vel[1] = 8.0;
  }

  // Gravity
  player.vel[1] -= 20.0 * dt;

  // Apply velocity
  player.pos[0] += player.vel[0] * dt;
  player.pos[1] += player.vel[1] * dt;
  player.pos[2] += player.vel[2] * dt;

  // Collision
  const collision = checkVoxelCollision(player.pos, 0.3);
  if (collision && player.vel[1] <= 0) {
    player.pos[1] = Math.floor(player.pos[1]) + 1;
    player.vel[1] = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  // Damping
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
  const rayOrigin = [player.pos[0], player.pos[1] + 1.6, player.pos[2]];
  const result = raycastVoxelBlock(rayOrigin, lookDir, 10);

  if (result.hit) {
    const [x, y, z] = result.position;

    // Break block
    if (isMousePressed(0)) {
      setVoxelBlock(x, y, z, BLOCK_TYPES.AIR);
    }

    // Place block
    if (isMousePressed(2)) {
      const placeX = x - Math.sign(lookDir[0]);
      const placeY = y - Math.sign(lookDir[1]);
      const placeZ = z - Math.sign(lookDir[2]);
      setVoxelBlock(placeX, placeY, placeZ, player.selectedBlock);
    }
  }

  // Update world chunks
  if (Math.random() < 0.1) {
    updateVoxelWorld(player.pos[0], player.pos[2]);
  }

  // Block selection
  for (let i = 1; i <= 9; i++) {
    if (isKeyPressed(i.toString())) {
      player.selectedBlock = i;
    }
  }
}

export function draw() {
  cls();

  // Draw crosshair
  if (mouseLocked) {
    const cx = 320,
      cy = 180,
      size = 8;
    rectfill(cx - size, cy - 1, cx + size, cy + 1, rgba8(1, 1, 1, 1));
    rectfill(cx - 1, cy - size, cx + 1, cy + size, rgba8(1, 1, 1, 1));
  }

  // HUD
  print(`FPS: ${Math.round(1 / getDeltaTime())}`, 4, 4, rgba8(1, 1, 1, 1));
  print(
    `Pos: ${Math.floor(player.pos[0])}, ${Math.floor(player.pos[1])}, ${Math.floor(player.pos[2])}`,
    4,
    12,
    rgba8(1, 1, 1, 1)
  );
}
```

## Terrain Generation

The voxel engine uses **Perlin noise** for realistic terrain with:

### Features:

- **Height variation** - Hills and valleys (20-52 blocks high)
- **Biomes** - Grass, sand, snow based on temperature/moisture
- **Cave systems** - Underground tunnels and caverns
- **Water level** - Ocean at Y=30
- **Bedrock layer** - Indestructible bottom (Y=0)

### Biome Selection:

```javascript
Temperature > 0.7 → Snow biome
Moisture < 0.3 → Desert (sand)
Default → Grass/dirt
```

### Layer Structure:

```
Y=0     → Bedrock (indestructible)
Y=1-30  → Stone
Y=31-33 → Dirt
Y=34    → Surface (grass/sand/snow)
Y=35-64 → Air (or water below Y=30)
```

## Performance Tips

### Chunk Management

- **Render distance**: 4 chunks (64 blocks) - adjustable in code
- **Chunk size**: 16x64x16 blocks per chunk
- **Auto-unloading**: Distant chunks automatically removed from memory

### Optimization Techniques Used:

1. **Greedy meshing** - Combines adjacent faces to reduce vertices
2. **Face culling** - Hidden faces not rendered
3. **Chunk dirty flags** - Only rebuild when blocks change
4. **BufferGeometry** - GPU-optimized mesh storage
5. **Flat shading** - Fast lighting calculation
6. **Ambient occlusion** - Per-face brightness variation

### Best Practices:

```javascript
// ✅ Good - Update chunks occasionally
if (frameCount % 10 === 0) {
  updateVoxelWorld(playerX, playerZ);
}

// ❌ Bad - Don't update every frame
export function update(dt) {
  updateVoxelWorld(playerX, playerZ); // Too expensive!
}

// ✅ Good - Batch block changes
for (let i = 0; i < 100; i++) {
  setVoxelBlock(x + i, y, z, BLOCK_TYPES.STONE);
}
// Chunks updated once after loop

// ✅ Good - Check collision efficiently
const onGround = checkVoxelCollision(playerFeetPos, 0.3);

// ❌ Bad - Don't check every nearby block manually
for (let x = -5; x < 5; x++) {
  for (let z = -5; z < 5; z++) {
    if (getVoxelBlock(px + x, py, pz + z) !== BLOCK_TYPES.AIR) {
      // This is way too slow!
    }
  }
}
```

## Common Patterns

### Finding Ground Height

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

### Building Structures

```javascript
// House
function buildHouse(x, y, z) {
  // Floor
  for (let dx = 0; dx < 8; dx++) {
    for (let dz = 0; dz < 8; dz++) {
      setVoxelBlock(x + dx, y, z + dz, BLOCK_TYPES.PLANKS);
    }
  }

  // Walls
  for (let dy = 1; dy < 5; dy++) {
    for (let dx = 0; dx < 8; dx++) {
      setVoxelBlock(x + dx, y + dy, z, BLOCK_TYPES.WOOD);
      setVoxelBlock(x + dx, y + dy, z + 7, BLOCK_TYPES.WOOD);
    }
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

  // Door
  setVoxelBlock(x + 3, y + 1, z, BLOCK_TYPES.AIR);
  setVoxelBlock(x + 3, y + 2, z, BLOCK_TYPES.AIR);
}
```

### Mining System

```javascript
let mining = false;
let miningProgress = 0;
let miningBlock = null;

function updateMining(dt) {
  const result = raycastVoxelBlock(eyePos, lookDir, 10);

  if (result.hit && isMouseDown(0)) {
    // Same block
    if (
      miningBlock &&
      miningBlock[0] === result.position[0] &&
      miningBlock[1] === result.position[1] &&
      miningBlock[2] === result.position[2]
    ) {
      miningProgress += dt;

      // Break after 1 second
      if (miningProgress >= 1.0) {
        const [x, y, z] = miningBlock;
        setVoxelBlock(x, y, z, BLOCK_TYPES.AIR);
        miningProgress = 0;
        miningBlock = null;
      }
    } else {
      // New block
      miningBlock = result.position;
      miningProgress = 0;
    }
  } else {
    miningProgress = 0;
    miningBlock = null;
  }
}
```

## Troubleshooting

### Blocks Not Appearing

- Call `updateVoxelWorld()` after placing blocks
- Check if coordinates are within valid range (Y: 0-63)
- Verify chunks are loading (check console logs)

### Performance Issues

- Reduce render distance in code (change `RENDER_DISTANCE`)
- Update chunks less frequently
- Limit block placement/breaking rate

### Collision Not Working

- Ensure player size matches collision box
- Check Y coordinate (height above ground)
- Verify blocks are solid (not AIR or WATER)

### Raycasting Missing Blocks

- Increase ray step precision (reduce step size)
- Check max distance parameter
- Ensure camera position is correct

## API Reference Summary

| Function                               | Description                        | Parameters                  |
| -------------------------------------- | ---------------------------------- | --------------------------- |
| `updateVoxelWorld(x, z)`               | Load/update chunks around position | x, z: world coords          |
| `getVoxelBlock(x, y, z)`               | Get block type at position         | x, y, z: world coords       |
| `setVoxelBlock(x, y, z, type)`         | Place/remove block                 | coords + block type         |
| `raycastVoxelBlock(origin, dir, dist)` | Find block along ray               | origin, direction, distance |
| `checkVoxelCollision(pos, size)`       | Check AABB collision               | position, half-size         |
| `placeVoxelTree(x, y, z)`              | Generate tree structure            | x, y, z: base position      |
| `BLOCK_TYPES.*`                        | Block type constants               | 15 types (AIR to BEDROCK)   |

---

**Ready to build your Minecraft clone!** Check out the complete example in `examples/minecraft-demo/` for a fully playable game with all features implemented.
