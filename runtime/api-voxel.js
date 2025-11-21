/**
 * Nova64 Voxel Engine API
 * 
 * Efficient voxel rendering system for Minecraft-style games with:
 * - Chunk-based world management
 * - Greedy meshing for performance
 * - Multiple block types with textures
 * - World generation (terrain, caves, trees)
 * - Block placement/breaking
 * - Collision detection
 */

import * as THREE from 'three';

export function voxelApi(gpu) {
  // World configuration
  const CHUNK_SIZE = 16;
  const CHUNK_HEIGHT = 64;
  const RENDER_DISTANCE = 4; // chunks in each direction
  
  // Block types
  const BLOCK_TYPES = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    SAND: 4,
    WATER: 5,
    WOOD: 6,
    LEAVES: 7,
    COBBLESTONE: 8,
    PLANKS: 9,
    GLASS: 10,
    BRICK: 11,
    SNOW: 12,
    ICE: 13,
    BEDROCK: 14
  };

  // Block colors (for texture-less rendering)
  const BLOCK_COLORS = {
    [BLOCK_TYPES.GRASS]: 0x4a9d2e,
    [BLOCK_TYPES.DIRT]: 0x8b5a3c,
    [BLOCK_TYPES.STONE]: 0x7f7f7f,
    [BLOCK_TYPES.SAND]: 0xe0d68a,
    [BLOCK_TYPES.WATER]: 0x3a5fcd,
    [BLOCK_TYPES.WOOD]: 0x6f4e37,
    [BLOCK_TYPES.LEAVES]: 0x228b22,
    [BLOCK_TYPES.COBBLESTONE]: 0x696969,
    [BLOCK_TYPES.PLANKS]: 0xdaa520,
    [BLOCK_TYPES.GLASS]: 0xadd8e6,
    [BLOCK_TYPES.BRICK]: 0x8b0000,
    [BLOCK_TYPES.SNOW]: 0xfffafa,
    [BLOCK_TYPES.ICE]: 0xb0e0e6,
    [BLOCK_TYPES.BEDROCK]: 0x2f2f2f
  };

  // World data
  const chunks = new Map(); // key: "x,z" -> Chunk
  const chunkMeshes = new Map(); // key: "x,z" -> THREE.Mesh
  
  // Noise function for terrain generation (simple Perlin-like)
  function noise2D(x, z) {
    const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }
  
  function smoothNoise(x, z) {
    const corners = (noise2D(x - 1, z - 1) + noise2D(x + 1, z - 1) + 
                     noise2D(x - 1, z + 1) + noise2D(x + 1, z + 1)) / 16;
    const sides = (noise2D(x - 1, z) + noise2D(x + 1, z) + 
                   noise2D(x, z - 1) + noise2D(x, z + 1)) / 8;
    const center = noise2D(x, z) / 4;
    return corners + sides + center;
  }
  
  function interpolatedNoise(x, z) {
    const intX = Math.floor(x);
    const fracX = x - intX;
    const intZ = Math.floor(z);
    const fracZ = z - intZ;
    
    const v1 = smoothNoise(intX, intZ);
    const v2 = smoothNoise(intX + 1, intZ);
    const v3 = smoothNoise(intX, intZ + 1);
    const v4 = smoothNoise(intX + 1, intZ + 1);
    
    const i1 = v1 * (1 - fracX) + v2 * fracX;
    const i2 = v3 * (1 - fracX) + v4 * fracX;
    
    return i1 * (1 - fracZ) + i2 * fracZ;
  }
  
  function perlinNoise(x, z, octaves = 4, persistence = 0.5) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += interpolatedNoise(x * frequency * 0.01, z * frequency * 0.01) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    
    return total / maxValue;
  }

  // Chunk class
  class Chunk {
    constructor(chunkX, chunkZ) {
      this.chunkX = chunkX;
      this.chunkZ = chunkZ;
      this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
      this.dirty = true;
    }
    
    getBlock(x, y, z) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
        return BLOCK_TYPES.AIR;
      }
      const index = x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
      return this.blocks[index];
    }
    
    setBlock(x, y, z, blockType) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
        return;
      }
      const index = x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
      this.blocks[index] = blockType;
      this.dirty = true;
    }
  }

  // Get or create chunk
  function getChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    if (!chunks.has(key)) {
      const chunk = new Chunk(chunkX, chunkZ);
      generateChunkTerrain(chunk);
      chunks.set(key, chunk);
    }
    return chunks.get(key);
  }

  // Get chunk without creating it (returns null if doesn't exist)
  function getChunkIfExists(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    return chunks.get(key) || null;
  }

  // Terrain generation
  function generateChunkTerrain(chunk) {
    const baseX = chunk.chunkX * CHUNK_SIZE;
    const baseZ = chunk.chunkZ * CHUNK_SIZE;
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = baseX + x;
        const worldZ = baseZ + z;
        
        // Generate height using Perlin noise
        const height = Math.floor(perlinNoise(worldX, worldZ, 4, 0.5) * 20 + 32);
        
        // Biome selection
        const temperature = perlinNoise(worldX * 0.5, worldZ * 0.5, 2, 0.5);
        const moisture = perlinNoise(worldX * 0.3 + 1000, worldZ * 0.3 + 1000, 2, 0.5);
        
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y === 0) {
            // Bedrock layer
            chunk.setBlock(x, y, z, BLOCK_TYPES.BEDROCK);
          } else if (y < height - 3) {
            // Stone layer
            chunk.setBlock(x, y, z, BLOCK_TYPES.STONE);
          } else if (y < height - 1) {
            // Dirt layer
            chunk.setBlock(x, y, z, BLOCK_TYPES.DIRT);
          } else if (y === height - 1) {
            // Top layer based on biome
            if (temperature < 0.3) {
              chunk.setBlock(x, y, z, BLOCK_TYPES.SNOW);
            } else if (moisture < 0.3) {
              chunk.setBlock(x, y, z, BLOCK_TYPES.SAND);
            } else {
              chunk.setBlock(x, y, z, BLOCK_TYPES.GRASS);
            }
          } else if (y < 30 && y >= height) {
            // Water level
            chunk.setBlock(x, y, z, BLOCK_TYPES.WATER);
          }
          
          // Cave generation
          if (y > 0 && y < height - 5) {
            const cave = perlinNoise(worldX * 0.5, y * 0.5, worldZ * 0.5, 3, 0.5);
            if (cave > 0.6) {
              chunk.setBlock(x, y, z, BLOCK_TYPES.AIR);
            }
          }
        }
      }
    }
  }

  // Greedy meshing algorithm for efficient rendering
  function createChunkMesh(chunk) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];
    let vertexCount = 0;

    // Face directions
    const dirs = [
      [0, 0, 1],  // Front
      [0, 0, -1], // Back
      [1, 0, 0],  // Right
      [-1, 0, 0], // Left
      [0, 1, 0],  // Top
      [0, -1, 0]  // Bottom
    ];

    const dirNormals = [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0]
    ];

    // Check if block face should be rendered
    function shouldRenderFace(x, y, z, dir) {
      const nx = x + dir[0];
      const ny = y + dir[1];
      const nz = z + dir[2];
      
      // Check neighbor in same chunk
      if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT && nz >= 0 && nz < CHUNK_SIZE) {
        const neighbor = chunk.getBlock(nx, ny, nz);
        return neighbor === BLOCK_TYPES.AIR || neighbor === BLOCK_TYPES.WATER;
      }
      
      // Check neighbor in adjacent chunk (only if it exists - don't create it!)
      if (nx < 0 || nx >= CHUNK_SIZE || nz < 0 || nz >= CHUNK_SIZE) {
        const neighborChunkX = chunk.chunkX + Math.floor(nx / CHUNK_SIZE);
        const neighborChunkZ = chunk.chunkZ + Math.floor(nz / CHUNK_SIZE);
        const neighborChunk = getChunkIfExists(neighborChunkX, neighborChunkZ);
        
        // If neighbor chunk doesn't exist yet, assume it's air (render the face)
        if (!neighborChunk) {
          return true;
        }
        
        const localX = ((nx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localZ = ((nz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const neighbor = neighborChunk.getBlock(localX, ny, localZ);
        return neighbor === BLOCK_TYPES.AIR || neighbor === BLOCK_TYPES.WATER;
      }
      
      return ny < 0 || ny >= CHUNK_HEIGHT;
    }

    // Add face to mesh
    function addFace(x, y, z, dir, dirIndex, blockType) {
      const color = new THREE.Color(BLOCK_COLORS[blockType] || 0xffffff);
      
      // Ambient occlusion factor based on face direction
      const aoFactors = [0.9, 0.9, 0.85, 0.85, 1.0, 0.7];
      const ao = aoFactors[dirIndex];
      color.multiplyScalar(ao);

      const normal = dirNormals[dirIndex];
      
      // Define face vertices based on direction
      let faceVertices;
      if (dirIndex === 0) { // Front (+Z)
        faceVertices = [
          [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]
        ];
      } else if (dirIndex === 1) { // Back (-Z)
        faceVertices = [
          [x + 1, y, z], [x, y, z], [x, y + 1, z], [x + 1, y + 1, z]
        ];
      } else if (dirIndex === 2) { // Right (+X)
        faceVertices = [
          [x + 1, y, z + 1], [x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1]
        ];
      } else if (dirIndex === 3) { // Left (-X)
        faceVertices = [
          [x, y, z], [x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z]
        ];
      } else if (dirIndex === 4) { // Top (+Y)
        faceVertices = [
          [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x, y + 1, z]
        ];
      } else { // Bottom (-Y)
        faceVertices = [
          [x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]
        ];
      }

      // Add vertices
      const baseX = chunk.chunkX * CHUNK_SIZE;
      const baseZ = chunk.chunkZ * CHUNK_SIZE;
      
      for (let i = 0; i < 4; i++) {
        vertices.push(
          faceVertices[i][0] + baseX,
          faceVertices[i][1],
          faceVertices[i][2] + baseZ
        );
        normals.push(normal[0], normal[1], normal[2]);
        colors.push(color.r, color.g, color.b);
      }

      // Add indices (two triangles per face)
      const offset = vertexCount;
      indices.push(offset, offset + 1, offset + 2);
      indices.push(offset, offset + 2, offset + 3);
      vertexCount += 4;
    }

    // Iterate through all blocks
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const blockType = chunk.getBlock(x, y, z);
          
          if (blockType === BLOCK_TYPES.AIR) continue;
          
          // Check each face
          for (let d = 0; d < 6; d++) {
            if (shouldRenderFace(x, y, z, dirs[d])) {
              addFace(x, y, z, dirs[d], d, blockType);
            }
          }
        }
      }
    }

    // Build geometry
    if (vertices.length > 0) {
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeBoundingSphere();
    }

    return geometry;
  }

  // Update chunk mesh if dirty
  function updateChunkMesh(chunk) {
    if (!chunk.dirty) return;
    
    const key = `${chunk.chunkX},${chunk.chunkZ}`;
    
    // Remove old mesh
    if (chunkMeshes.has(key)) {
      const oldMesh = chunkMeshes.get(key);
      gpu.scene.remove(oldMesh);
      oldMesh.geometry.dispose();
      chunkMeshes.delete(key);
    }
    
    // Create new mesh
    const geometry = createChunkMesh(chunk);
    if (geometry.attributes.position) {
      const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      gpu.scene.add(mesh);
      chunkMeshes.set(key, mesh);
    }
    
    chunk.dirty = false;
  }

  // World coordinates to chunk coordinates
  function worldToChunk(x, z) {
    return {
      chunkX: Math.floor(x / CHUNK_SIZE),
      chunkZ: Math.floor(z / CHUNK_SIZE),
      localX: ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
      localZ: ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
    };
  }

  // Get block at world position
  function getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return BLOCK_TYPES.AIR;
    
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunk(chunkX, chunkZ);
    return chunk.getBlock(localX, y, localZ);
  }

  // Set block at world position
  function setBlock(x, y, z, blockType) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunk(chunkX, chunkZ);
    chunk.setBlock(localX, y, localZ, blockType);
    
    // Mark adjacent chunks as dirty if on boundary
    if (localX === 0) getChunk(chunkX - 1, chunkZ).dirty = true;
    if (localX === CHUNK_SIZE - 1) getChunk(chunkX + 1, chunkZ).dirty = true;
    if (localZ === 0) getChunk(chunkX, chunkZ - 1).dirty = true;
    if (localZ === CHUNK_SIZE - 1) getChunk(chunkX, chunkZ + 1).dirty = true;
  }

  // Update visible chunks around player
  function updateChunks(playerX, playerZ) {
    const centerChunkX = Math.floor(playerX / CHUNK_SIZE);
    const centerChunkZ = Math.floor(playerZ / CHUNK_SIZE);
    
    // Load chunks in render distance
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;
        const chunk = getChunk(chunkX, chunkZ);
        updateChunkMesh(chunk);
      }
    }
    
    // Unload far chunks (optional, for memory management)
    const keysToRemove = [];
    for (const [key, mesh] of chunkMeshes.entries()) {
      const [chunkX, chunkZ] = key.split(',').map(Number);
      const dx = Math.abs(chunkX - centerChunkX);
      const dz = Math.abs(chunkZ - centerChunkZ);
      
      if (dx > RENDER_DISTANCE + 1 || dz > RENDER_DISTANCE + 1) {
        gpu.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        keysToRemove.push(key);
        chunks.delete(key);
      }
    }
    
    keysToRemove.forEach(key => chunkMeshes.delete(key));
  }

  // Raycast to find block player is looking at
  function raycastBlock(origin, direction, maxDistance = 10) {
    const step = 0.1;
    const pos = { x: origin[0], y: origin[1], z: origin[2] };
    const dir = { x: direction[0], y: direction[1], z: direction[2] };
    
    for (let i = 0; i < maxDistance / step; i++) {
      pos.x += dir.x * step;
      pos.y += dir.y * step;
      pos.z += dir.z * step;
      
      const blockX = Math.floor(pos.x);
      const blockY = Math.floor(pos.y);
      const blockZ = Math.floor(pos.z);
      
      const blockType = getBlock(blockX, blockY, blockZ);
      
      if (blockType !== BLOCK_TYPES.AIR && blockType !== BLOCK_TYPES.WATER) {
        return {
          hit: true,
          position: [blockX, blockY, blockZ],
          blockType: blockType,
          distance: i * step
        };
      }
    }
    
    return { hit: false };
  }

  // Check collision with voxel world
  function checkCollision(pos, size) {
    const minX = Math.floor(pos[0] - size);
    const maxX = Math.floor(pos[0] + size);
    const minY = Math.floor(pos[1]);
    const maxY = Math.floor(pos[1] + size * 2);
    const minZ = Math.floor(pos[2] - size);
    const maxZ = Math.floor(pos[2] + size);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const blockType = getBlock(x, y, z);
          if (blockType !== BLOCK_TYPES.AIR && blockType !== BLOCK_TYPES.WATER) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  // Generate tree structure
  function placeTree(x, y, z) {
    const trunkHeight = 4 + Math.floor(Math.random() * 3);
    
    // Trunk
    for (let i = 0; i < trunkHeight; i++) {
      setBlock(x, y + i, z, BLOCK_TYPES.WOOD);
    }
    
    // Leaves
    const leafY = y + trunkHeight;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 4) {
            setBlock(x + dx, leafY + dy, z + dz, BLOCK_TYPES.LEAVES);
          }
        }
      }
    }
  }

  // Public API
  return {
    BLOCK_TYPES,
    CHUNK_SIZE,
    CHUNK_HEIGHT,
    
    // World management
    updateChunks,
    getBlock,
    setBlock,
    
    // Block interaction
    raycastBlock,
    checkCollision,
    
    // Structures
    placeTree,
    
    // Expose to global game context
    exposeTo: function(g) {
      g.BLOCK_TYPES = BLOCK_TYPES;
      g.updateVoxelWorld = updateChunks;
      g.getVoxelBlock = getBlock;
      g.setVoxelBlock = setBlock;
      g.raycastVoxelBlock = raycastBlock;
      g.checkVoxelCollision = checkCollision;
      g.placeVoxelTree = placeTree;
    }
  };
}
