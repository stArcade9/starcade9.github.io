// runtime/engine-adapter.js
// Backend-agnostic engine adapter — wraps Three.js internals so cart code
// doesn't need to import or reference THREE directly.
//
// Cart authors: use the global `engine` object instead of `THREE.*`.
// Runtime authors: swap this module to port Nova64 to a different renderer.

import * as THREE from 'three';

const SIDE_MAP = {
  double: THREE.DoubleSide,
  front: THREE.FrontSide,
  back: THREE.BackSide,
};

const FILTER_MAP = {
  nearest: THREE.NearestFilter,
  linear: THREE.LinearFilter,
};

const WRAP_MAP = {
  repeat: THREE.RepeatWrapping,
  clamp: THREE.ClampToEdgeWrapping,
};

// gpu reference is set via initAdapter(gpu) — called from api-3d.js during boot
let _gpu = null;

export function initAdapter(gpu) {
  _gpu = gpu;
}

export const engine = {
  /**
   * Create a material.
   * @param {'basic'|'phong'|'standard'} type
   * @param {object} opts
   *   map         — texture object (from engine.createDataTexture etc.)
   *   color       — 0xRRGGBB number OR { r, g, b } for fractional
   *   transparent — boolean
   *   alphaTest   — number 0–1
   *   side        — 'front' | 'back' | 'double'
   *   roughness   — number (standard only)
   *   metalness   — number (standard only)
   *   emissive    — 0xRRGGBB number (standard only)
   */
  createMaterial(type, opts = {}) {
    const params = {};
    if (opts.map !== undefined) params.map = opts.map;
    if (opts.transparent !== undefined) params.transparent = opts.transparent;
    if (opts.alphaTest !== undefined) params.alphaTest = opts.alphaTest;
    if (opts.side !== undefined) params.side = SIDE_MAP[opts.side] ?? THREE.FrontSide;
    if (opts.color !== undefined) {
      params.color =
        opts.color !== null && typeof opts.color === 'object' && !Array.isArray(opts.color)
          ? new THREE.Color(opts.color.r, opts.color.g, opts.color.b)
          : opts.color;
    }
    if (type === 'phong') {
      return new THREE.MeshPhongMaterial(params);
    }
    if (type === 'standard') {
      if (opts.roughness !== undefined) params.roughness = opts.roughness;
      if (opts.metalness !== undefined) params.metalness = opts.metalness;
      if (opts.emissive !== undefined) params.emissive = opts.emissive;
      if (opts.flatShading !== undefined) params.flatShading = opts.flatShading;
      if (opts.vertexColors !== undefined) params.vertexColors = opts.vertexColors;
      return new THREE.MeshStandardMaterial(params);
    }
    // default: 'basic'
    return new THREE.MeshBasicMaterial(params);
  },

  /**
   * Create a DataTexture from a raw pixel buffer.
   * @param {Uint8Array|Uint8ClampedArray} data
   * @param {number} width
   * @param {number} height
   * @param {object} opts
   *   format          — 'rgba' (default)
   *   filter          — 'nearest' | 'linear' (applied to min + mag)
   *   wrap            — 'repeat' | 'clamp' (applied to wrapS + wrapT)
   *   generateMipmaps — boolean (default true; set false for pixel-art / WAD textures)
   */
  createDataTexture(data, width, height, opts = {}) {
    const format = THREE.RGBAFormat; // only format we expose for now
    const tex = new THREE.DataTexture(data, width, height, format);
    const filter = FILTER_MAP[opts.filter] ?? THREE.NearestFilter;
    tex.minFilter = filter;
    tex.magFilter = filter;
    const wrap = WRAP_MAP[opts.wrap] ?? THREE.ClampToEdgeWrapping;
    tex.wrapS = wrap;
    tex.wrapT = wrap;
    if (opts.generateMipmaps !== undefined) tex.generateMipmaps = opts.generateMipmaps;
    tex.needsUpdate = true;
    return tex;
  },

  /**
   * Create a CanvasTexture from an HTMLCanvasElement.
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts  filter, wrap (same keys as createDataTexture)
   */
  createCanvasTexture(canvas, opts = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    const filter = FILTER_MAP[opts.filter] ?? THREE.LinearFilter;
    tex.minFilter = filter;
    tex.magFilter = filter;
    if (opts.wrap) {
      const wrap = WRAP_MAP[opts.wrap] ?? THREE.ClampToEdgeWrapping;
      tex.wrapS = wrap;
      tex.wrapT = wrap;
    }
    tex.needsUpdate = true;
    return tex;
  },

  /** Clone a texture. */
  cloneTexture(tex) {
    return tex.clone();
  },

  /**
   * Set repeat wrapping + tile count on a texture.
   * @param {object} tex  — any engine-created texture
   * @param {number} x    — repeat count on U axis
   * @param {number} y    — repeat count on V axis
   */
  setTextureRepeat(tex, x, y) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(x, y);
    tex.needsUpdate = true;
  },

  /** Mark a texture as needing a GPU re-upload. */
  invalidateTexture(tex) {
    tex.needsUpdate = true;
  },

  /**
   * Create a color object (opaque to carts).
   * Can be passed to createMaterial({ color: engine.createColor(...) }).
   * @param {number} r  0–1
   * @param {number} g  0–1
   * @param {number} b  0–1
   */
  createColor(r, g, b) {
    return new THREE.Color(r, g, b);
  },

  /**
   * Create a plane geometry (opaque to carts).
   * @param {number} width
   * @param {number} height
   * @param {number} [segX=1]
   * @param {number} [segY=1]
   */
  createPlaneGeometry(width, height, segX = 1, segY = 1) {
    return new THREE.PlaneGeometry(width, height, segX, segY);
  },

  /**
   * Assign a material to a mesh identified by its Nova64 mesh ID.
   * Uses getMesh() from the global scope (exposed by api-3d.js).
   * @param {number} meshId
   * @param {object} material  — result of engine.createMaterial()
   */
  setMeshMaterial(meshId, material) {
    const mesh = globalThis.getMesh(meshId);
    if (mesh) mesh.material = material;
  },

  /**
   * Return the current camera position as a plain { x, y, z } object.
   * Reads from the Three.js PerspectiveCamera held by the gpu backend.
   */
  getCameraPosition() {
    if (!_gpu) return { x: 0, y: 0, z: 0 };
    const cam = _gpu.getCamera ? _gpu.getCamera() : (_gpu.camera ?? null);
    if (!cam) return { x: 0, y: 0, z: 0 };
    return { x: cam.position.x, y: cam.position.y, z: cam.position.z };
  },
};
