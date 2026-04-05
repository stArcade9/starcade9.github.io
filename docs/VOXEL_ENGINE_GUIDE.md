# Nova64 Voxel Engine API Guide

## Overview

The Nova64 Voxel Engine enables Minecraft-style block-based games with infinite procedurally generated worlds. It features:

- **Chunk-based world management** - Efficient memory usage with 16×128×16 chunks
- **Simplex noise** - Seeded 2D + 3D simplex noise with fractal Brownian motion (fBm)
- **True 3D caves** - Winding tunnel networks carved with 3D noise
- **Per-vertex ambient occlusion** - Smooth corner shadows without lightmaps
- **DDA voxel raycasting** - Pixel-perfect block targeting (Amanatides & Woo)
- **Block registry** - Extensible block definitions with solid/transparent/fluid/light properties
- **36 built-in block types** - Including ores, torches, lava, glowstone, slabs, stairs, fences, flowers
- **Configurable world generation** - Carts can supply custom terrain generators
- **Transparent block rendering** - Separate pass for water, glass, ice, leaves
- **Biome system** - 8 biomes based on temperature/moisture noise

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
BLOCK_TYPES.WATER; // 5 - Blue water (transparent, fluid)
BLOCK_TYPES.WOOD; // 6 - Dark brown wood log
BLOCK_TYPES.LEAVES; // 7 - Green tree leaves (transparent)
BLOCK_TYPES.COBBLESTONE; // 8 - Gray cobblestone
BLOCK_TYPES.PLANKS; // 9 - Wooden planks
BLOCK_TYPES.GLASS; // 10 - Light blue glass (transparent)
BLOCK_TYPES.BRICK; // 11 - Red brick
BLOCK_TYPES.SNOW; // 12 - White snow
BLOCK_TYPES.ICE; // 13 - Light blue ice (transparent)
BLOCK_TYPES.BEDROCK; // 14 - Dark gray bedrock (bottom layer)
BLOCK_TYPES.COAL_ORE; // 15 - Coal ore (any depth)
BLOCK_TYPES.IRON_ORE; // 16 - Iron ore (below y=64)
BLOCK_TYPES.GOLD_ORE; // 17 - Gold ore (below y=32)
BLOCK_TYPES.DIAMOND_ORE; // 18 - Diamond ore (below y=16)
BLOCK_TYPES.GRAVEL; // 19 - Gravel pockets
BLOCK_TYPES.CLAY; // 20 - Clay (near water)
BLOCK_TYPES.TORCH; // 21 - Torch (light emitter, non-solid)
BLOCK_TYPES.GLOWSTONE; // 22 - Glowstone (max light emitter)
BLOCK_TYPES.LAVA; // 23 - Lava (fluid, light emitter)
BLOCK_TYPES.OBSIDIAN; // 24 - Obsidian
BLOCK_TYPES.MOSSY_COBBLESTONE; // 25 - Mossy cobblestone

// Shape blocks (non-cube geometry)
BLOCK_TYPES.STONE_SLAB;     // 26 - Half-height stone slab (bottom)
BLOCK_TYPES.STONE_SLAB_TOP; // 27 - Half-height stone slab (top)
BLOCK_TYPES.PLANK_SLAB;     // 28 - Half-height plank slab (bottom)
BLOCK_TYPES.STONE_STAIR;    // 29 - Stone staircase
BLOCK_TYPES.PLANK_STAIR;    // 30 - Plank staircase
BLOCK_TYPES.FENCE;          // 31 - Thin fence post
BLOCK_TYPES.FLOWER;         // 32 - Flower (cross shape, non-solid)
BLOCK_TYPES.TALL_GRASS;     // 33 - Tall grass (cross shape, non-solid)
BLOCK_TYPES.BRICK_SLAB;     // 34 - Half-height brick slab (bottom)
BLOCK_TYPES.BRICK_STAIR;    // 35 - Brick staircase
```

### Custom Block Registration

```javascript
// Register a custom block type for your cart
registerVoxelBlock(100, {
  name: 'crystal',
  color: 0xff00ff,
  solid: true,
  transparent: true,
  lightEmit: 10,
  lightBlock: 0,
  shape: 'slab_bottom',       // Optional: 'cube' (default), 'slab_bottom', 'slab_top', 'stair', 'fence', 'cross'
  boundingBox: [0,0,0, 1,0.5,1], // Optional: custom [minX,minY,minZ, maxX,maxY,maxZ]
});
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

### getVoxelHighestBlock(x, z)

Returns the Y coordinate of the highest non-air, non-water block at the given (x, z) position. Useful for spawning players above terrain.

```javascript
const groundY = getVoxelHighestBlock(Math.floor(player.x), Math.floor(player.z));
player.y = groundY + 2;
```

### getVoxelBiome(x, z)

Returns the biome name at the given world position. Biomes include: "Frozen Tundra", "Taiga", "Desert", "Jungle", "Savanna", "Forest", "Snowy Hills", "Plains".

```javascript
const biome = getVoxelBiome(player.x, player.z);
print(`Biome: ${biome}`, 10, 10, 0xffffff);
```

### configureVoxelWorld(options)

Configure world generation parameters. Call before generating any chunks.

```javascript
configureVoxelWorld({
  seed: 42,           // World seed (deterministic generation)
  chunkHeight: 128,   // Vertical chunk size (default: 128)
  renderDistance: 6,   // Chunks in each direction (default: 4)
  seaLevel: 62,       // Water level (default: 62)
  generateTerrain: (chunk, ctx) => {
    // Custom terrain generator — ctx provides BLOCK_TYPES, noise, CHUNK_SIZE, etc.
    for (let x = 0; x < ctx.CHUNK_SIZE; x++) {
      for (let z = 0; z < ctx.CHUNK_SIZE; z++) {
        const height = Math.floor(ctx.noise.fbm2D(
          chunk.chunkX * ctx.CHUNK_SIZE + x,
          chunk.chunkZ * ctx.CHUNK_SIZE + z,
          4, 0.5, 2.0, 0.01
        ) * 20 + 64);
        for (let y = 0; y < height; y++) {
          chunk.setBlock(x, y, z, ctx.BLOCK_TYPES.STONE);
        }
        chunk.setBlock(x, height - 1, z, ctx.BLOCK_TYPES.GRASS);
      }
    }
  },
});
```

## Noise Functions

### simplexNoise2D(x, z, octaves, persistence, lacunarity, scale)

Multi-octave 2D fractal noise. Returns values in range 0..1.

```javascript
const height = simplexNoise2D(worldX, worldZ, 4, 0.5, 2.0, 0.01) * 30 + 60;
```

### simplexNoise3D(x, y, z, octaves, persistence, lacunarity, scale)

Multi-octave 3D fractal noise. Returns values in range 0..1. Use for caves, ore veins, etc.

```javascript
const density = simplexNoise3D(x, y, z, 3, 0.5, 2.0, 0.04);
if (density > 0.7) {
  // Spawn ore here
}
```

## Block Manipulation

### getVoxelBlock(x, y, z)

Returns the block type at the specified world coordinates.

**Parameters:**

- `x` - World X coordinate
- `y` - World Y coordinate (0-127)
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
- `y` - World Y coordinate (0-127)
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
  normal: [nx, ny, nz],   // Face normal of the hit surface
  adjacent: [x, y, z],    // Block position adjacent to hit face (for placing)
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
  // Break block
  if (isKeyPressed('KeyF')) {
    setVoxelBlock(result.position[0], result.position[1], result.position[2], BLOCK_TYPES.AIR);
  }

  // Place block on adjacent face
  if (isKeyPressed('KeyE')) {
    setVoxelBlock(result.adjacent[0], result.adjacent[1], result.adjacent[2], BLOCK_TYPES.COBBLESTONE);
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

## Custom Block Shapes

Blocks can have non-cube shapes. Non-cube shapes skip greedy mesh merging and emit custom geometry.

### Available Shapes

| Shape | Geometry | Bounding Box |
|-------|----------|-------------|
| `cube` | Full block (default) | [0,0,0, 1,1,1] |
| `slab_bottom` | Half-height box, bottom | [0,0,0, 1,0.5,1] |
| `slab_top` | Half-height box, top | [0,0.5,0, 1,1,1] |
| `stair` | Bottom slab + back upper half | [0,0,0, 1,1,1] |
| `fence` | Thin centered post | [0.375,0,0.375, 0.625,1,0.625] |
| `cross` | Two diagonal X-quads | [0.15,0,0.15, 0.85,1,0.85] |

### Shape Query Functions

```javascript
getVoxelBlockShape(BLOCK_TYPES.STONE_SLAB);     // 'slab_bottom'
getVoxelBlockBoundingBox(BLOCK_TYPES.FENCE);     // [0.375,0,0.375, 0.625,1,0.625]
isVoxelBlockFullCube(BLOCK_TYPES.STONE);         // true
isVoxelBlockFullCube(BLOCK_TYPES.STONE_SLAB);    // false
```

Non-cube blocks don't occlude neighboring cube faces. Collision uses shape-specific bounding boxes.

## Lighting System

BFS flood-fill light propagation with sky light (downward) and block light (torches, glowstone, lava). Smooth per-vertex interpolation combined with ambient occlusion.

```javascript
// Get light level (0-15) at a position
const light = getVoxelLightLevel(x, y, z);

// Day/night cycle (0.0 to 1.0)
let time = 0;
export function update(dt) {
  time = (time + dt * 0.01) % 1;
  setVoxelDayTime(time);
}
```

## Fluid Simulation

Water spreads 7 blocks horizontally with BFS flow. Lava spreads 3 blocks. Fluids retract when source is removed.

```javascript
// Place a water source
setVoxelFluidSource(10, 70, 10, BLOCK_TYPES.WATER);

// Place a lava source
setVoxelFluidSource(20, 70, 20, BLOCK_TYPES.LAVA);

// Remove a fluid source (flowing blocks retract)
removeVoxelFluidSource(10, 70, 10);

// Check fluid level (0=full, 7=thinnest, -1=no fluid)
const level = getVoxelFluidLevel(10, 69, 10);
```

## Entity System

Spawn entities with physics, AI, health, and spatial hashing for efficient radius queries.

```javascript
// Spawn a zombie
const zombie = spawnVoxelEntity('zombie', [10, 65, 10], {
  health: 20,
  size: [0.6, 1.8, 0.6],
  mesh: createCube(1, 0x00ff00, [0, 0, 0]),
  onUpdate: (entity, dt) => {
    // AI logic — chase player, patrol, etc.
  },
});

// Damage / heal entities
damageVoxelEntity(zombie.id, 5);
healVoxelEntity(zombie.id, 3);

// Spatial queries
const nearby = getVoxelEntitiesInRadius([px, py, pz], 16);
const allZombies = getVoxelEntitiesByType('zombie');
const total = getVoxelEntityCount();

// Tick all entities (call in update)
updateVoxelEntities(dt);

// Cleanup
removeVoxelEntity(zombie.id);
cleanupVoxelEntities(); // Remove all
```

## ECS Components & Archetypes

Attach arbitrary components to entities for flexible game logic.

```javascript
// Attach components
setVoxelEntityComponent(id, 'inventory', { slots: 10, items: [] });
setVoxelEntityComponent(id, 'hostile', { aggroRange: 16 });

// Query/check components
const inv = getVoxelEntityComponent(id, 'inventory');
if (hasVoxelEntityComponent(id, 'hostile')) { /* ... */ }
removeVoxelEntityComponent(id, 'hostile');

// Query all entities with specific components
const enemies = queryVoxelEntities(['hostile', 'ai']);
const nearbyEnemies = queryVoxelEntities(['hostile'], e =>
  dist(e.position, player.pos) < 32
);

// Define reusable archetypes
createVoxelEntityArchetype('skeleton', {
  health: 15,
  hostile: { damage: 2 },
  ai: { type: 'wander' },
});
const skel = spawnVoxelEntityFromArchetype('skeleton', [20, 65, 20]);

// Built-in archetypes: 'mob', 'item', 'projectile', 'npc', 'vehicle'
```

### A* Pathfinding

```javascript
const path = findVoxelPath([0, 65, 0], [30, 68, 30], {
  maxSteps: 1000,
  entityHeight: 2,
});
// Returns array of [x,y,z] waypoints, or null if no path found
```

## Schematics & Import/Export

Export and import regions or entire worlds. Regions use RLE compression.

```javascript
// Export a 10×10×10 building
const schematic = exportVoxelRegion(0, 60, 0, 9, 69, 9);

// Paste it somewhere else
importVoxelRegion(schematic, 100, 60, 100);

// Paste without overwriting existing blocks
importVoxelRegion(schematic, 200, 60, 200, { skipAir: true });

// Export/import entire worlds as JSON
const worldData = exportVoxelWorldJSON();
importVoxelWorldJSON(worldData);
```

## World Persistence

Save and load worlds via IndexedDB.

```javascript
// Save current world
await saveVoxelWorld('my-world');

// Load a saved world
await loadVoxelWorld('my-world');

// List all saved worlds
const worlds = await listVoxelWorlds(); // ['my-world', 'test-world']

// Delete a saved world
await deleteVoxelWorld('old-world');
```

## Texture Atlas

```javascript
// Enable/disable procedural textures (27 pixel-art tiles)
enableVoxelTextures(true);

// Load a custom texture atlas
loadVoxelTextureAtlas('atlas.png', mapping);
```

## Swept AABB Physics (moveVoxelEntity)

Full physics integration with per-axis collision, auto-step, water drag, and ground detection.

```javascript
const result = moveVoxelEntity(
  player.pos,                // [x, y, z]
  player.vel,                // [vx, vy, vz]
  [0.6, 1.8, 0.6],          // collision box [w, h, d]
  dt
);
player.pos = result.position;
player.vel = result.velocity;
player.grounded = result.grounded;
// Also: result.hitCeiling, result.onIce, result.jumped
```

## Force-Loading Chunks

```javascript
// Synchronously load all chunks in render distance (use in init)
forceLoadVoxelChunks(playerX, playerZ);
```

## Troubleshooting

### Blocks Not Appearing

- Call `updateVoxelWorld()` after placing blocks
- Check if coordinates are within valid range (Y: 0-127)
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

| Function | Description |
|----------|-------------|
| `configureVoxelWorld(opts)` | Configure world gen params |
| `updateVoxelWorld(x, z)` | Load/unload chunks around player |
| `forceLoadVoxelChunks(x, z)` | Sync-load all chunks in range |
| `resetVoxelWorld()` | Clear all chunks and entities |
| `getVoxelConfig()` | Get current world config |
| `getVoxelBlock(x, y, z)` | Get block type at position |
| `setVoxelBlock(x, y, z, type)` | Place/remove block |
| `getVoxelHighestBlock(x, z)` | Highest solid block Y |
| `getVoxelBiome(x, z)` | Biome name at position |
| `registerVoxelBlock(id, opts)` | Register custom block |
| `getVoxelBlockShape(id)` | Get block shape string |
| `getVoxelBlockBoundingBox(id)` | Get block collision box |
| `isVoxelBlockFullCube(id)` | Check if block is full cube |
| `raycastVoxelBlock(o, d, max)` | DDA voxel raycasting |
| `checkVoxelCollision(pos, size)` | AABB collision check |
| `checkVoxelFluid(pos, size)` | Check if in fluid |
| `moveVoxelEntity(pos, vel, size, dt)` | Swept AABB physics |
| `getVoxelLightLevel(x, y, z)` | Light level 0–15 |
| `setVoxelDayTime(t)` | Day/night cycle (0–1) |
| `setVoxelFluidSource(x, y, z, type)` | Place fluid source |
| `removeVoxelFluidSource(x, y, z)` | Remove fluid source |
| `getVoxelFluidLevel(x, y, z)` | Fluid level at position |
| `spawnVoxelEntity(type, pos, opts)` | Spawn entity |
| `removeVoxelEntity(id)` | Remove entity |
| `getVoxelEntity(id)` | Get entity by ID |
| `damageVoxelEntity(id, amt)` | Damage entity |
| `healVoxelEntity(id, amt)` | Heal entity |
| `updateVoxelEntities(dt)` | Tick all entities |
| `getVoxelEntitiesInRadius(pos, r)` | Spatial query |
| `getVoxelEntitiesByType(type)` | Query by type |
| `getVoxelEntityCount()` | Total entity count |
| `cleanupVoxelEntities()` | Remove all entities |
| `setVoxelEntityComponent(id, name, data)` | Attach ECS component |
| `getVoxelEntityComponent(id, name)` | Get ECS component |
| `hasVoxelEntityComponent(id, name)` | Check component |
| `removeVoxelEntityComponent(id, name)` | Remove component |
| `queryVoxelEntities(comps, fn)` | Query by components |
| `createVoxelEntityArchetype(name, comps)` | Define archetype |
| `spawnVoxelEntityFromArchetype(name, pos)` | Spawn from archetype |
| `findVoxelPath(start, end, opts)` | A* pathfinding |
| `exportVoxelRegion(...)` | Export region schematic |
| `importVoxelRegion(data, x, y, z)` | Import schematic |
| `exportVoxelWorldJSON()` | Export world as JSON |
| `importVoxelWorldJSON(json)` | Import world from JSON |
| `saveVoxelWorld(name)` | Save to IndexedDB |
| `loadVoxelWorld(name)` | Load from IndexedDB |
| `listVoxelWorlds()` | List saved worlds |
| `deleteVoxelWorld(name)` | Delete saved world |
| `enableVoxelTextures(on)` | Toggle texture atlas |
| `loadVoxelTextureAtlas(url)` | Load custom atlas |
| `simplexNoise2D(x,z,...)` | 2D fractal noise |
| `simplexNoise3D(x,y,z,...)` | 3D fractal noise |
| `placeVoxelTree(x, y, z)` | Generate tree |
| `BLOCK_TYPES.*` | 36 block type constants |

---

**Ready to build your Minecraft clone!** Check out the complete example in `examples/minecraft-demo/` for a fully playable game with all features implemented.
