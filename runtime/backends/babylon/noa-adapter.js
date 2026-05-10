// runtime/backends/babylon/noa-adapter.js
// NOA Engine adapter for Nova64 Babylon.js voxel backend.
// Provides backwards-compatible voxel API using noa-engine for enhanced features.
//
// This adapter wraps noa-engine to provide the same interface as the built-in
// voxel.js backend, enabling seamless switching between implementations.

import {
  Color3,
  Constants,
  Effect,
  Mesh,
  MeshBuilder,
  ShaderMaterial,
  StandardMaterial,
  Vector2,
  VertexData,
} from '@babylonjs/core';

import {
  applyBabylonMaterialCompatibility,
  applyBabylonMeshCompatibility,
  applyBabylonTextureCompatibility,
} from './compat.js';

// NOA adapter configuration
const NOA_ADAPTER_VERSION = '0.1.0';
const NOA_MODULE_SPECIFIER = 'noa-engine';

// Shader name for custom voxel chunk rendering
const VOXEL_SHADER_NAME = 'nova64VoxelChunkNoa';

// Adapter state
let noaEngine = null;
let noaModule = null;
let noaInitialized = false;
let noaError = null;

// Block type mapping: Nova64 block IDs to NOA material IDs
const blockToNoaMaterial = new Map();
const noaMaterialToBlock = new Map();

// Mesh cache for Nova64-style chunk mesh management
const chunkMeshCache = new Map();

function ensureVoxelShaderRegistered() {
  if (Effect.ShadersStore[`${VOXEL_SHADER_NAME}VertexShader`]) return;

  Effect.ShadersStore[`${VOXEL_SHADER_NAME}VertexShader`] = `
    precision highp float;

    attribute vec3 position;
    attribute vec2 uv;
    attribute vec2 uv2;
    attribute vec4 color;

    uniform mat4 worldViewProjection;

    varying vec2 vUv;
    varying vec2 vUv2;
    varying vec4 vColor;

    void main(void) {
      gl_Position = worldViewProjection * vec4(position, 1.0);
      vUv = uv;
      vUv2 = uv2;
      vColor = color;
    }
  `;

  Effect.ShadersStore[`${VOXEL_SHADER_NAME}FragmentShader`] = `
    precision highp float;

    varying vec2 vUv;
    varying vec2 vUv2;
    varying vec4 vColor;

    uniform sampler2D textureSampler;
    uniform vec2 uTileSize;
    uniform float uOpacity;
    uniform float uUseAtlasTiling;

    void main(void) {
      vec2 sampleUv = vUv;
      if (uUseAtlasTiling > 0.5) {
        sampleUv = vUv2 + fract(vUv) * uTileSize;
      }

      vec4 texel = texture2D(textureSampler, sampleUv);
      vec4 outColor = vec4(texel.rgb * vColor.rgb, texel.a * vColor.a * uOpacity);

      if (outColor.a <= 0.01) {
        discard;
      }

      gl_FragColor = outColor;
    }
  `;
}

function cloneFloatArray(values, translate = null, stride = 1) {
  const source =
    values instanceof Float32Array
      ? values
      : values
        ? new Float32Array(values)
        : new Float32Array(0);

  if (!translate || stride !== 3) return source;

  const cloned = new Float32Array(source);
  for (let i = 0; i < cloned.length; i += 3) {
    cloned[i] += translate[0] ?? 0;
    cloned[i + 1] += translate[1] ?? 0;
    cloned[i + 2] += translate[2] ?? 0;
  }
  return cloned;
}

function cloneIndexArray(values) {
  if (values instanceof Uint16Array || values instanceof Uint32Array) return values;
  return values ? new Uint32Array(values) : new Uint32Array(0);
}

function expandColors(colors) {
  const source =
    colors instanceof Float32Array
      ? colors
      : colors
        ? new Float32Array(colors)
        : new Float32Array(0);
  if (source.length === 0) return source;
  if (source.length % 4 === 0) return source;

  const expanded = new Float32Array((source.length / 3) * 4);
  for (let src = 0, dst = 0; src < source.length; src += 3, dst += 4) {
    expanded[dst] = source[src];
    expanded[dst + 1] = source[src + 1];
    expanded[dst + 2] = source[src + 2];
    expanded[dst + 3] = 1;
  }
  return expanded;
}

function toColor3(hex) {
  return Color3.FromHexString(`#${(Number(hex) & 0xffffff).toString(16).padStart(6, '0')}`);
}

function hexToRgb01(hex) {
  const n = Number(hex) & 0xffffff;
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

function getWhiteTexture(self) {
  if (!self._noaWhiteTexture) {
    self._noaWhiteTexture = self._adapter.createDataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
      {
        filter: 'nearest',
        wrap: 'repeat',
        generateMipmaps: false,
      }
    );
  }
  return self._noaWhiteTexture;
}

// NOA Engine initialization and configuration
async function initializeNoaEngine(self, options = {}) {
  if (noaInitialized) return { success: true, engine: noaEngine };
  if (noaError) return { success: false, error: noaError };

  try {
    // Dynamic import of noa-engine
    noaModule = await import(/* @vite-ignore */ NOA_MODULE_SPECIFIER);
    const Engine = noaModule.Engine || noaModule.default;

    if (!Engine) {
      throw new Error('noa-engine does not export Engine class');
    }

    // Configure NOA with Nova64-compatible settings
    const noaOptions = {
      debug: options.debug ?? false,
      showFPS: false,
      inverseY: false,
      inverseX: false,
      sensitivityX: 10,
      sensitivityY: 10,
      playerHeight: 1.8,
      playerWidth: 0.6,
      playerStart: [0, 80, 0],
      playerAutoStep: true,
      tickRate: 30,
      blockTestDistance: 10,
      stickyPointerLock: true,
      dragCameraOutsidePointerLock: true,
      skipDefaultHighlighting: true,

      // Chunk configuration
      chunkSize: options.chunkSize ?? 16,
      chunkAddDistance: options.chunkAddDistance ?? (options.renderDistance ?? 4) + 0.5,
      chunkRemoveDistance: options.chunkRemoveDistance ?? (options.renderDistance ?? 4) + 1.5,

      // Use the existing Babylon.js scene/engine if possible
      domElement: self.canvas,
      ...options.noaConfig,
    };

    // Create NOA engine instance
    noaEngine = new Engine(noaOptions);

    // Store reference for cleanup
    self._noaEngine = noaEngine;

    noaInitialized = true;
    console.info('[Nova64:NOA] noa-engine initialized successfully');

    return { success: true, engine: noaEngine };
  } catch (error) {
    noaError = error;
    console.warn('[Nova64:NOA] Failed to initialize noa-engine:', error.message);
    return { success: false, error };
  }
}

// Register Nova64 block types with NOA's registry
function registerNovaBlocksWithNoa(registry, noaEngine) {
  if (!noaEngine || !registry) return;

  const noaRegistry = noaEngine.registry;

  // Register materials and blocks for each Nova64 block type
  for (const block of registry.blocks) {
    if (!block || block.id === 0) continue; // Skip air

    const [r, g, b] = hexToRgb01(block.color);

    // Register material with NOA
    const matId = noaRegistry.registerMaterial(block.name, {
      color: [r, g, b],
      roughness: 0.8,
      metalness: 0.1,
    });

    // Register block with NOA
    const noaBlockId = noaRegistry.registerBlock(matId, {
      solid: block.solid,
      opaque: !block.transparent,
      fluid: block.fluid,
      fluidDensity: block.fluid ? 1.0 : 0,
      viscosity: block.fluid ? 0.5 : 0,
    });

    // Store mappings
    blockToNoaMaterial.set(block.id, { materialId: matId, blockId: noaBlockId });
    noaMaterialToBlock.set(noaBlockId, block.id);
  }
}

// Convert Nova64 chunk data to NOA format
function convertChunkToNoa(chunk, noaEngine) {
  if (!noaEngine || !chunk) return null;

  const chunkSize = chunk.blocks.length;
  const noaChunk = noaEngine.world.getChunkAt(chunk.chunkX, 0, chunk.chunkZ);

  if (!noaChunk) return null;

  // Copy block data
  for (let i = 0; i < chunkSize; i++) {
    const novaBlockId = chunk.blocks[i];
    const mapping = blockToNoaMaterial.get(novaBlockId);
    if (mapping) {
      noaChunk.set(i, mapping.blockId);
    }
  }

  return noaChunk;
}

// Convert NOA chunk data back to Nova64 format
function convertChunkFromNoa(noaChunk, nova64Chunk) {
  if (!noaChunk || !nova64Chunk) return;

  const size = nova64Chunk.blocks.length;
  for (let i = 0; i < size; i++) {
    const noaBlockId = noaChunk.get(i);
    const nova64Id = noaMaterialToBlock.get(noaBlockId) ?? 0;
    nova64Chunk.blocks[i] = nova64Id;
  }
}

// Create NOA-compatible adapter API
export function createBabylonNoaAdapterApi(self) {
  let adapterEnabled = false;
  let adapterStatus = {
    version: NOA_ADAPTER_VERSION,
    initialized: false,
    active: false,
    error: null,
    features: {
      physics: false,
      entities: false,
      terrain: false,
      meshing: false,
    },
  };

  // Check if NOA should be used
  async function enableNoaAdapter(options = {}) {
    if (adapterEnabled) return adapterStatus;

    const result = await initializeNoaEngine(self, options);

    if (result.success) {
      adapterEnabled = true;
      adapterStatus = {
        ...adapterStatus,
        initialized: true,
        active: true,
        error: null,
        features: {
          physics: true,
          entities: true,
          terrain: true,
          meshing: true,
        },
      };
    } else {
      adapterStatus = {
        ...adapterStatus,
        initialized: false,
        active: false,
        error: result.error?.message ?? 'Unknown error',
      };
    }

    return adapterStatus;
  }

  function disableNoaAdapter() {
    if (!adapterEnabled) return;

    if (noaEngine) {
      // Cleanup NOA resources
      try {
        noaEngine.dispose?.();
      } catch {
        // Ignore disposal errors
      }
      noaEngine = null;
    }

    adapterEnabled = false;
    noaInitialized = false;
    noaError = null;

    adapterStatus = {
      ...adapterStatus,
      active: false,
      features: {
        physics: false,
        entities: false,
        terrain: false,
        meshing: false,
      },
    };
  }

  function getNoaAdapterStatus() {
    return {
      ...adapterStatus,
      noaVersion: noaModule?.version ?? null,
      engineReady: noaEngine !== null,
    };
  }

  function isNoaActive() {
    return adapterEnabled && noaEngine !== null;
  }

  // NOA-backed voxel operations (fallback to standard if NOA not active)
  function noaCreateVoxelTextureFromCanvas(canvas) {
    if (!canvas) return null;
    return self._adapter.createCanvasTexture(canvas, {
      filter: 'nearest',
      wrap: 'repeat',
      generateMipmaps: false,
    });
  }

  function noaCreateVoxelTextureFromImage(image) {
    if (!image || typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width || 1;
    canvas.height = image.naturalHeight || image.height || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return noaCreateVoxelTextureFromCanvas(canvas);
  }

  function noaCreateVoxelChunkMaterial(opts = {}) {
    ensureVoxelShaderRegistered();

    const transparent = !!opts.transparent || (opts.opacity ?? 1) < 1;
    const texture = applyBabylonTextureCompatibility(opts.texture ?? getWhiteTexture(self));

    if (!opts.atlasTiling) {
      // Use StandardMaterial for non-atlas rendering
      const material = new StandardMaterial(`nova64_noa_chunk_${self._counter + 1}`, self.scene);
      material.diffuseTexture = texture;
      material.diffuseColor = new Color3(1, 1, 1);
      material.ambientColor = new Color3(1, 1, 1);
      material.emissiveTexture = texture;
      material.disableLighting = true;
      material.emissiveColor = new Color3(
        opts.emissiveBoost ?? 0.22,
        opts.emissiveBoost ?? 0.22,
        opts.emissiveBoost ?? 0.22
      );
      material.specularColor = new Color3(0.01, 0.01, 0.01);
      material.specularPower = 8;
      material.alpha = opts.opacity ?? 1;
      material.useVertexColors = true;
      material.useVertexAlpha = transparent;
      material.backFaceCulling = false;
      material.separateCullingPass = false;
      material.alphaMode = Constants.ALPHA_COMBINE;
      material.fogEnabled = true;

      if (transparent) {
        texture.hasAlpha = true;
        material.opacityTexture = texture;
        if ('useAlphaFromDiffuseTexture' in material) {
          material.useAlphaFromDiffuseTexture = true;
        }
      }

      return applyBabylonMaterialCompatibility(material);
    }

    // Use ShaderMaterial for atlas tiling
    const material = new ShaderMaterial(
      `nova64_noa_chunk_${self._counter + 1}`,
      self.scene,
      {
        vertex: VOXEL_SHADER_NAME,
        fragment: VOXEL_SHADER_NAME,
      },
      {
        attributes: ['position', 'uv', 'uv2', 'color'],
        uniforms: ['worldViewProjection', 'uTileSize', 'uOpacity', 'uUseAtlasTiling'],
        samplers: ['textureSampler'],
        needAlphaBlending: transparent,
        needAlphaTesting: transparent,
      }
    );

    material.setTexture('textureSampler', texture);
    material.setVector2('uTileSize', new Vector2(opts.tileSizeU ?? 1, opts.tileSizeV ?? 1));
    material.setFloat('uOpacity', opts.opacity ?? 1);
    material.setFloat('uUseAtlasTiling', opts.atlasTiling ? 1 : 0);
    material.backFaceCulling = false;
    material.separateCullingPass = false;
    material.alphaMode = Constants.ALPHA_COMBINE;
    material.fogEnabled = true;

    return applyBabylonMaterialCompatibility(material);
  }

  function noaCreateVoxelChunkMesh(meshData, material, opts = {}) {
    if (!meshData?.positions?.length) return null;

    const mesh = new Mesh(opts.name || `nova64_noa_chunk_${self._counter + 1}`, self.scene);
    const vertexData = new VertexData();

    vertexData.positions = cloneFloatArray(meshData.positions, opts.translate, 3);
    vertexData.normals = cloneFloatArray(meshData.normals);
    vertexData.colors = expandColors(meshData.colors);
    vertexData.uvs = cloneFloatArray(meshData.uvs);
    vertexData.uvs2 = cloneFloatArray(meshData.uv2s);
    vertexData.indices = cloneIndexArray(meshData.indices);
    vertexData.applyToMesh(mesh, false);

    mesh.material = applyBabylonMaterialCompatibility(material);
    mesh.position.set(opts.position?.[0] ?? 0, opts.position?.[1] ?? 0, opts.position?.[2] ?? 0);
    mesh.receiveShadows = opts.receiveShadow !== false;
    mesh.castShadow = !!opts.castShadow;
    mesh.renderingGroupId = opts.renderOrder && opts.renderOrder > 0 ? 1 : 0;
    mesh.alphaIndex = opts.renderOrder ?? 0;

    applyBabylonMeshCompatibility(mesh);

    // Cache for cleanup
    const key = opts.chunkKey ?? `${opts.position?.[0] ?? 0},${opts.position?.[2] ?? 0}`;
    if (chunkMeshCache.has(key)) {
      const old = chunkMeshCache.get(key);
      old.dispose?.(false, false);
    }
    chunkMeshCache.set(key, mesh);

    return mesh;
  }

  function noaCreateVoxelEntityMaterial(color = 0xffffff) {
    const material = new StandardMaterial(`nova64_noa_entity_${self._counter + 1}`, self.scene);
    material.diffuseColor = toColor3(color);
    material.ambientColor = new Color3(1, 1, 1);
    material.specularColor = new Color3(0.08, 0.08, 0.08);
    material.specularPower = 32;
    return applyBabylonMaterialCompatibility(material);
  }

  function noaCreateVoxelEntityMesh(size = [1, 1, 1], material) {
    const mesh = MeshBuilder.CreateBox(
      `nova64_noa_entity_${self._counter + 1}`,
      {
        width: size[0] ?? 1,
        height: size[1] ?? 1,
        depth: size[2] ?? 1,
      },
      self.scene
    );
    mesh.material = applyBabylonMaterialCompatibility(material);
    mesh.receiveShadows = true;
    mesh.castShadow = true;
    applyBabylonMeshCompatibility(mesh);
    return mesh;
  }

  function noaDisposeVoxelMesh(mesh) {
    mesh?.dispose?.(false, false);
  }

  // NOA-specific enhanced features
  function noaGetPhysicsBody(entityId) {
    if (!isNoaActive()) return null;
    const ent = noaEngine.entities.getPhysicsBody(entityId);
    return ent ?? null;
  }

  function noaSetBlockAt(x, y, z, blockId) {
    if (!isNoaActive()) return false;
    const mapping = blockToNoaMaterial.get(blockId);
    if (!mapping) return false;
    noaEngine.setBlock(mapping.blockId, x, y, z);
    return true;
  }

  function noaGetBlockAt(x, y, z) {
    if (!isNoaActive()) return 0;
    const noaBlockId = noaEngine.getBlock(x, y, z);
    return noaMaterialToBlock.get(noaBlockId) ?? 0;
  }

  function noaAddEntity(position, opts = {}) {
    if (!isNoaActive()) return null;

    const entityId = noaEngine.entities.add(
      position,
      opts.width ?? 0.6,
      opts.height ?? 1.8,
      null, // mesh - we'll handle this separately
      [], // additional
      true, // physics
      false // shadow
    );

    return entityId;
  }

  function noaRemoveEntity(entityId) {
    if (!isNoaActive()) return false;
    noaEngine.entities.remove(entityId);
    return true;
  }

  function noaTick() {
    if (!isNoaActive()) return;
    noaEngine.tick();
  }

  function noaRender() {
    if (!isNoaActive()) return;
    noaEngine.render();
  }

  // Cleanup function
  function noaCleanupAll() {
    for (const mesh of chunkMeshCache.values()) {
      mesh?.dispose?.(false, false);
    }
    chunkMeshCache.clear();

    if (self._noaWhiteTexture) {
      self._noaWhiteTexture.dispose?.();
      self._noaWhiteTexture = null;
    }

    disableNoaAdapter();
  }

  return {
    // Adapter control
    enableNoaAdapter,
    disableNoaAdapter,
    getNoaAdapterStatus,
    isNoaActive,
    noaCleanupAll,

    // Standard voxel API (NOA-enhanced when active)
    noaCreateVoxelTextureFromCanvas,
    noaCreateVoxelTextureFromImage,
    noaCreateVoxelChunkMaterial,
    noaCreateVoxelChunkMesh,
    noaCreateVoxelEntityMaterial,
    noaCreateVoxelEntityMesh,
    noaDisposeVoxelMesh,

    // NOA-specific features (only work when NOA is active)
    noaGetPhysicsBody,
    noaSetBlockAt,
    noaGetBlockAt,
    noaAddEntity,
    noaRemoveEntity,
    noaTick,
    noaRender,

    // Internal utilities
    registerNovaBlocksWithNoa,
    convertChunkToNoa,
    convertChunkFromNoa,
  };
}
