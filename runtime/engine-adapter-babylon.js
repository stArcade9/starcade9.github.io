// runtime/engine-adapter-babylon.js
// Babylon.js engine adapter for Nova64 — Phase 2 backend.
//
// This adapter implements the full Nova64 Adapter Contract using the Babylon.js
// runtime as the backend instead of Three.js.
//
// Usage (browser):
//   import * as BABYLON from '@babylonjs/core';
//   import { createBabylonEngineAdapter } from './engine-adapter-babylon.js';
//   const scene = new BABYLON.Scene(engine);
//   const adapter = createBabylonEngineAdapter(BABYLON, scene);
//   setEngineAdapter(adapter); // from engine-adapter.js
//
// Usage (tests — pass a mock BABYLON namespace):
//   const adapter = createBabylonEngineAdapter(mockBABYLON, mockScene, opts);
//   runAdapterConformanceTests(adapter, runner, { name: 'Babylon' });
//
// See docs/ADAPTER_CONTRACT.md for the full contract specification.

import { ADAPTER_CONTRACT_VERSION } from './engine-adapter.js';
import {
  applyBabylonColorCompatibility,
  applyBabylonMaterialCompatibility,
  applyBabylonMeshCompatibility,
  applyBabylonTextureCompatibility,
} from './backends/babylon/compat.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeNameGen(prefix) {
  let n = 0;
  return () => `${prefix}_${++n}`;
}

/**
 * Convert a Nova64 color option (hex number OR { r, g, b } object) to a
 * BABYLON.Color3.  Returns null if nothing usable is provided.
 */
function toColor3(BABYLON, colorOpt) {
  if (colorOpt === undefined || colorOpt === null) return null;
  if (typeof colorOpt === 'number') {
    return new BABYLON.Color3(
      ((colorOpt >> 16) & 0xff) / 255,
      ((colorOpt >> 8) & 0xff) / 255,
      (colorOpt & 0xff) / 255
    );
  }
  if (typeof colorOpt === 'object' && !Array.isArray(colorOpt)) {
    return new BABYLON.Color3(colorOpt.r ?? 0, colorOpt.g ?? 0, colorOpt.b ?? 0);
  }
  return null;
}

function applyBabylonTextureColorSpace(texture) {
  if (!texture) return texture;
  if ('gammaSpace' in texture) texture.gammaSpace = true;
  return texture;
}

function textureHasTransparency(data) {
  if (!data?.length) return false;
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 255) < 255) return true;
  }
  return false;
}

function configureStandardTextureAlpha(material, texture, matOpts = {}) {
  if (!material || !texture) return;

  const needsAlpha =
    texture.hasAlpha === true || !!matOpts.transparent || matOpts.alphaTest !== undefined;
  if (!needsAlpha) return;

  texture.hasAlpha = true;
  material.opacityTexture = texture;

  if ('useAlphaFromDiffuseTexture' in material) {
    material.useAlphaFromDiffuseTexture = true;
  }
  if ('useAlphaFromAlbedoTexture' in material) {
    material.useAlphaFromAlbedoTexture = true;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a Babylon.js engine adapter that implements the Nova64 Adapter Contract.
 *
 * @param {object} BABYLON   — Babylon.js namespace (import * as BABYLON from '@babylonjs/core')
 * @param {object} scene     — active BABYLON.Scene instance
 * @param {object} [opts]
 *   resolveMesh {function}  — (meshId) => mesh | null  (default: globalThis.getMesh)
 * @returns {EngineAdapter}
 */
export function createBabylonEngineAdapter(BABYLON, scene, opts = {}) {
  if (!BABYLON || typeof BABYLON !== 'object') {
    throw new Error('createBabylonEngineAdapter: BABYLON namespace is required');
  }
  if (!scene || typeof scene !== 'object') {
    throw new Error('createBabylonEngineAdapter: scene (BABYLON.Scene) is required');
  }

  const genMaterialName = makeNameGen('nova64_mat');
  const genTextureName = makeNameGen('nova64_tex');
  const resolveMesh = opts.resolveMesh ?? (meshId => globalThis.getMesh?.(meshId) ?? null);

  // Sampling mode lookup: Nova64 filter → Babylon sampling mode constant
  const SAMPLING = {
    nearest: BABYLON.Texture?.NEAREST_SAMPLINGMODE ?? 1,
    linear: BABYLON.Texture?.BILINEAR_SAMPLINGMODE ?? 2,
  };

  // Wrap mode lookup: Nova64 wrap → Babylon wrap constant
  const WRAP = {
    repeat: BABYLON.Texture?.WRAP_ADDRESSMODE ?? 1,
    clamp: BABYLON.Texture?.CLAMP_ADDRESSMODE ?? 0,
  };

  // Babylon alpha mode constants (may not be present in mock — fall back to numbers)
  const ALPHA_TEST = BABYLON.Material?.MATERIAL_ALPHATEST ?? 1;

  // ---------------------------------------------------------------------------
  // Feature capability set — declared up front so getCapabilities() is cheap
  // ---------------------------------------------------------------------------
  const FEATURES = Object.freeze([
    'material:basic',
    'material:phong',
    'material:standard',
    'texture:data',
    'texture:canvas',
    'texture:repeat',
    'geometry:plane',
    'camera:read',
    // Babylon-specific extensions (namespaced to avoid collisions)
    'babylon:pbr',
    'babylon:dynamic-texture',
    'babylon:vertex-data',
    'babylon:back-face-culling',
  ]);
  const featureSet = new Set(FEATURES);

  // ---------------------------------------------------------------------------
  // Adapter implementation
  // ---------------------------------------------------------------------------

  return {
    // -------------------------------------------------------------------------
    // Material
    // -------------------------------------------------------------------------

    /**
     * Create a Babylon material.
     *
     * 'basic'    → BABYLON.StandardMaterial (disableLighting = true, flat-shaded)
     * 'phong'    → BABYLON.StandardMaterial (default Blinn-Phong)
     * 'standard' → BABYLON.PBRMaterial      (physically based)
     */
    createMaterial(type, matOpts = {}) {
      const name = genMaterialName();
      let mat;

      if (type === 'standard') {
        mat = new BABYLON.PBRMaterial(name, scene);

        if (matOpts.roughness !== undefined) mat.roughness = matOpts.roughness;
        if (matOpts.metalness !== undefined) mat.metallic = matOpts.metalness;
        if (matOpts.flatShading !== undefined) mat.forceIrradianceInFragment = matOpts.flatShading;

        const diffuse = toColor3(BABYLON, matOpts.color);
        if (diffuse) mat.albedoColor = diffuse;
        if (mat.ambientColor?.copyFromFloats) mat.ambientColor.copyFromFloats(1, 1, 1);
        if (matOpts.map) {
          const map = applyBabylonTextureColorSpace(matOpts.map);
          mat.albedoTexture = map;
          applyBabylonTextureCompatibility(map);
          configureStandardTextureAlpha(mat, map, matOpts);
        }

        if (matOpts.emissive !== undefined) {
          mat.emissiveColor = toColor3(BABYLON, matOpts.emissive) ?? mat.emissiveColor;
        }
      } else {
        // 'basic' and 'phong'
        mat = new BABYLON.StandardMaterial(name, scene);

        const diffuse = toColor3(BABYLON, matOpts.color);
        if (diffuse) mat.diffuseColor = diffuse;
        if (mat.ambientColor?.copyFromFloats) mat.ambientColor.copyFromFloats(1, 1, 1);

        if (type === 'basic') {
          mat.disableLighting = true;
          if (mat.specularColor?.copyFromFloats) mat.specularColor.copyFromFloats(0, 0, 0);
          mat.emissiveColor = diffuse ?? new BABYLON.Color3(1, 1, 1);
        } else {
          if (mat.specularColor?.copyFromFloats) mat.specularColor.copyFromFloats(0.08, 0.08, 0.08);
          mat.specularPower = 32;
        }

        if (matOpts.map) {
          const map = applyBabylonTextureColorSpace(matOpts.map);
          mat.diffuseTexture = map;
          applyBabylonTextureCompatibility(map);
          if (type === 'basic') {
            mat.emissiveTexture = map;
            if (!diffuse) {
              mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
            }
          } else {
            // For 'phong' materials with textures:
            // In Three.js, texture * diffuseColor produces the final color.
            // In Babylon, diffuseColor is not applied as a multiplier when diffuseTexture exists.
            // Solution: Also use emissiveTexture + emissiveColor to restore texture brightness
            // that would otherwise be lost in dim lighting conditions.
            mat.emissiveTexture = map;
            if (diffuse) {
              // Use color as emissive intensity to bring back texture vibrancy
              const boost = 0.6;
              mat.emissiveColor = new BABYLON.Color3(
                diffuse.r * boost,
                diffuse.g * boost,
                diffuse.b * boost
              );
            } else {
              mat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            }
          }
          configureStandardTextureAlpha(mat, map, matOpts);
        }

        if (matOpts.emissive !== undefined) {
          mat.emissiveColor = toColor3(BABYLON, matOpts.emissive) ?? mat.emissiveColor;
        }
      }

      // Common options
      if (matOpts.transparent !== undefined) {
        mat.alpha = matOpts.transparent ? (matOpts.opacity ?? 0.5) : 1;
      }

      if (matOpts.alphaTest !== undefined) {
        mat.alphaMode = ALPHA_TEST;
        if ('alphaCutOff' in mat) mat.alphaCutOff = matOpts.alphaTest;
      }

      if (matOpts.side === 'double') {
        mat.backFaceCulling = false;
        if ('twoSidedLighting' in mat) mat.twoSidedLighting = true;
        if ('separateCullingPass' in mat) mat.separateCullingPass = true;
      } else if (matOpts.side === 'front') {
        mat.backFaceCulling = true;
      }
      // 'back' is non-standard in Babylon — leave as default

      return applyBabylonMaterialCompatibility(mat);
    },

    // -------------------------------------------------------------------------
    // Textures
    // -------------------------------------------------------------------------

    /**
     * Create a BABYLON.RawTexture from a raw RGBA pixel buffer.
     */
    createDataTexture(data, width, height, texOpts = {}) {
      const generateMipmaps = texOpts.generateMipmaps ?? true;
      const samplingMode = SAMPLING[texOpts.filter] ?? SAMPLING.nearest;
      const pixels = data instanceof Uint8Array ? data : new Uint8Array(data);

      const tex = BABYLON.RawTexture.CreateRGBATexture(
        pixels,
        width,
        height,
        scene,
        generateMipmaps,
        false, // invertY
        samplingMode
      );
      applyBabylonTextureColorSpace(tex);
      tex.hasAlpha = textureHasTransparency(pixels);

      if (texOpts.wrap) {
        const wrapMode = WRAP[texOpts.wrap] ?? WRAP.clamp;
        tex.wrapU = wrapMode;
        tex.wrapV = wrapMode;
      }

      return applyBabylonTextureCompatibility(tex);
    },

    /**
     * Create a BABYLON.DynamicTexture from an HTMLCanvasElement.
     * The source canvas content is drawn into the DynamicTexture immediately.
     */
    createCanvasTexture(canvas, texOpts = {}) {
      const name = genTextureName();
      const w = canvas?.width ?? 256;
      const h = canvas?.height ?? 256;
      const samplingMode = SAMPLING[texOpts.filter] ?? SAMPLING.linear;
      const generateMipmaps = texOpts.generateMipmaps ?? true;

      const tex = new BABYLON.DynamicTexture(
        name,
        { width: w, height: h },
        scene,
        generateMipmaps,
        samplingMode
      );
      applyBabylonTextureColorSpace(tex);
      tex.hasAlpha = true;

      // Copy source canvas content into the DynamicTexture's internal canvas
      if (canvas) {
        const ctx = tex.getContext();
        if (ctx && typeof ctx.drawImage === 'function') {
          ctx.drawImage(canvas, 0, 0);
          tex.update(false);
        }
      }

      if (texOpts.wrap) {
        const wrapMode = WRAP[texOpts.wrap] ?? WRAP.clamp;
        tex.wrapU = wrapMode;
        tex.wrapV = wrapMode;
      }

      return applyBabylonTextureCompatibility(tex);
    },

    cloneTexture(tex) {
      const clone = tex?.clone?.() ?? null;
      return applyBabylonTextureCompatibility(clone);
    },

    /**
     * Set UV tiling on a texture (uScale/vScale in Babylon terminology).
     */
    setTextureRepeat(tex, x, y) {
      if (!tex) return;
      applyBabylonTextureCompatibility(tex);
      tex.uScale = x;
      tex.vScale = y;
      // Enable wrap mode so repeat actually tiles
      tex.wrapU = WRAP.repeat;
      tex.wrapV = WRAP.repeat;
    },

    /**
     * Mark a texture as dirty so Babylon re-uploads it on the next frame.
     * Works for DynamicTexture (has update()); no-ops gracefully for others.
     */
    invalidateTexture(tex) {
      applyBabylonTextureCompatibility(tex);
      if (tex && typeof tex.update === 'function') {
        try {
          tex.update();
        } catch {
          // Some Babylon texture types require arguments — ignore safely
        }
      }
    },

    // -------------------------------------------------------------------------
    // Color
    // -------------------------------------------------------------------------

    createColor(r, g, b) {
      return applyBabylonColorCompatibility(new BABYLON.Color3(r, g, b));
    },

    // -------------------------------------------------------------------------
    // Geometry
    // -------------------------------------------------------------------------

    /**
     * Return an opaque Babylon plane geometry descriptor.
     *
     * In Babylon.js, geometry is not separated from meshes at creation time the
     * way Three.js BufferGeometry is.  We return a frozen descriptor so that a
     * Babylon GPU layer can call BABYLON.MeshBuilder.CreateGround() (or the
     * equivalent VertexData.CreateGround) when it actually needs a mesh object.
     *
     * The descriptor is intentionally backend-opaque — cart code must not
     * inspect its fields.
     */
    createPlaneGeometry(width, height, segX = 1, segY = 1) {
      return Object.freeze({
        __babylonGeometry: true,
        geometryType: 'plane',
        width,
        height,
        subdivisionsX: segX,
        subdivisionsY: segY,
      });
    },

    // -------------------------------------------------------------------------
    // Mesh
    // -------------------------------------------------------------------------

    setMeshMaterial(meshId, material) {
      const mesh = resolveMesh(meshId);
      if (!mesh) return;
      applyBabylonMeshCompatibility(mesh);
      mesh.material = applyBabylonMaterialCompatibility(material);
    },

    // -------------------------------------------------------------------------
    // Camera
    // -------------------------------------------------------------------------

    getCameraPosition() {
      const cam = scene.activeCamera;
      if (!cam || !cam.position) return { x: 0, y: 0, z: 0 };
      return {
        x: Number(cam.position.x) || 0,
        y: Number(cam.position.y) || 0,
        z: Number(cam.position.z) || 0,
      };
    },

    // -------------------------------------------------------------------------
    // Capabilities
    // -------------------------------------------------------------------------

    getCapabilities() {
      return Object.freeze({
        backend: 'babylon',
        contractVersion: ADAPTER_CONTRACT_VERSION,
        adapterVersion: '1.0.0',
        features: FEATURES,
        supports: feature => featureSet.has(feature),
      });
    },
  };
}
