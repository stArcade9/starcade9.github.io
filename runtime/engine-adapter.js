// runtime/engine-adapter.js
// Backend-agnostic engine adapter — wraps Three.js internals so cart code
// doesn't need to import or reference THREE directly.
//
// Cart authors: use the global `engine` object instead of `THREE.*`.
// Runtime authors: swap this module to port Nova64 to a different renderer.
//
// Adapter Contract version: 1.0.0
// All adapters MUST implement the full engine surface listed in ADAPTER_CONTRACT.md
// and MUST return a valid capabilities object from getCapabilities().

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

/** Current adapter contract version exposed on every capabilities object. */
export const ADAPTER_CONTRACT_VERSION = '1.0.0';

/**
 * Build a frozen capabilities object for an adapter.
 * @param {{ backend: string, version: string, features: string[] }} opts
 */
function buildCapabilities(opts) {
  const featureSet = new Set(opts.features ?? []);
  return Object.freeze({
    backend: opts.backend,
    contractVersion: ADAPTER_CONTRACT_VERSION,
    adapterVersion: opts.version,
    features: Object.freeze([...featureSet]),
    /**
     * Test whether this backend supports a named feature.
     * @param {string} feature
     */
    supports(feature) {
      return featureSet.has(feature);
    },
  });
}

// gpu reference is set via initAdapter(gpu) — called from api-3d.js during boot
let _gpu = null;
let _activeAdapter = null;
let _customAdapterInstalled = false;

function createUnityHandle(kind, id, extra = {}) {
  return Object.freeze({
    __nova64Handle: true,
    backend: 'unity',
    kind,
    id,
    ...extra,
  });
}

function isUnityHandle(value) {
  return !!(value && typeof value === 'object' && value.__nova64Handle === true);
}

function serializeBridgeValue(value) {
  if (isUnityHandle(value)) {
    return {
      handle: true,
      backend: value.backend,
      kind: value.kind,
      id: value.id,
    };
  }
  if (Array.isArray(value)) return value.map(serializeBridgeValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = serializeBridgeValue(item);
    return out;
  }
  return value;
}

function normalizeVec3(value) {
  return {
    x: Number(value?.x) || 0,
    y: Number(value?.y) || 0,
    z: Number(value?.z) || 0,
  };
}

function bridgeCall(bridge, method, payload = {}) {
  if (typeof bridge.call === 'function') return bridge.call(method, payload);
  if (typeof bridge.invoke === 'function') return bridge.invoke(method, payload);
  if (typeof bridge.send === 'function') {
    bridge.send({ method, payload });
    return undefined;
  }
  if (typeof bridge.postMessage === 'function') {
    bridge.postMessage({ type: 'nova64', method, payload });
    return undefined;
  }
  throw new Error(
    'Unity bridge must expose call(method, payload), invoke(method, payload), send(message), or postMessage(message)'
  );
}

function getActiveAdapter() {
  if (!_activeAdapter) _activeAdapter = createThreeEngineAdapter();
  return _activeAdapter;
}

export function createThreeEngineAdapter(options = {}) {
  const getGpu = options.getGpu ?? (() => _gpu);
  const resolveMesh = options.resolveMesh ?? (meshId => globalThis.getMesh?.(meshId) ?? null);

  return {
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
      if (opts.opacity !== undefined) params.opacity = opts.opacity;
      if (opts.alphaTest !== undefined) params.alphaTest = opts.alphaTest;
      if (opts.side !== undefined) params.side = SIDE_MAP[opts.side] ?? THREE.FrontSide;
      if (opts.opacity !== undefined && params.transparent === undefined && opts.opacity < 1) {
        params.transparent = true;
      }
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
      const format = THREE.RGBAFormat;
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

    cloneTexture(tex) {
      return tex.clone();
    },

    setTextureRepeat(tex, x, y) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(x, y);
      tex.needsUpdate = true;
    },

    invalidateTexture(tex) {
      tex.needsUpdate = true;
    },

    createColor(r, g, b) {
      return new THREE.Color(r, g, b);
    },

    createPlaneGeometry(width, height, segX = 1, segY = 1) {
      return new THREE.PlaneGeometry(width, height, segX, segY);
    },

    setMeshMaterial(meshId, material) {
      const mesh = resolveMesh(meshId);
      if (mesh) mesh.material = material;
    },

    getCameraPosition() {
      const gpu = getGpu();
      if (!gpu) return { x: 0, y: 0, z: 0 };
      const cam = gpu.getCamera ? gpu.getCamera() : (gpu.camera ?? null);
      if (!cam) return { x: 0, y: 0, z: 0 };
      return { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    },

    /**
     * Report what this backend can do.
     * Capabilities are version-stable identifiers — carts can feature-detect
     * using engine.getCapabilities().supports('materialType:standard').
     */
    getCapabilities() {
      return buildCapabilities({
        backend: 'threejs',
        version: '1.0.0',
        features: [
          'material:basic',
          'material:phong',
          'material:standard',
          'texture:data',
          'texture:canvas',
          'texture:repeat',
          'geometry:plane',
          'camera:read',
        ],
      });
    },
  };
}

export function createUnityBridgeAdapter(bridge, options = {}) {
  if (!bridge || typeof bridge !== 'object') {
    throw new Error('createUnityBridgeAdapter requires a bridge object');
  }

  let nextHandleId = 1;
  const autoPrefix = options.methodPrefix ?? '';
  const call = (method, payload = {}) => bridgeCall(bridge, `${autoPrefix}${method}`, payload);
  const makeHandle = (kind, result, extra = {}) => {
    const id = result?.id ?? result?.handleId ?? result;
    return createUnityHandle(kind, id ?? `${kind}:${nextHandleId++}`, extra);
  };

  return {
    createMaterial(type, opts = {}) {
      const result = call('material.create', {
        type,
        opts: serializeBridgeValue(opts),
      });
      return makeHandle('material', result, { materialType: type });
    },

    createDataTexture(data, width, height, opts = {}) {
      const result = call('texture.createData', {
        width,
        height,
        data,
        opts: serializeBridgeValue(opts),
      });
      return makeHandle('texture', result, { width, height, source: 'data' });
    },

    createCanvasTexture(canvas, opts = {}) {
      const result = call('texture.createCanvas', {
        width: canvas?.width ?? 0,
        height: canvas?.height ?? 0,
        dataURL: typeof canvas?.toDataURL === 'function' ? canvas.toDataURL() : null,
        opts: serializeBridgeValue(opts),
      });
      return makeHandle('texture', result, {
        width: canvas?.width ?? 0,
        height: canvas?.height ?? 0,
        source: 'canvas',
      });
    },

    cloneTexture(tex) {
      const result = call('texture.clone', {
        texture: serializeBridgeValue(tex),
      });
      return makeHandle('texture', result, { source: 'clone' });
    },

    setTextureRepeat(tex, x, y) {
      call('texture.setRepeat', {
        texture: serializeBridgeValue(tex),
        x,
        y,
      });
    },

    invalidateTexture(tex) {
      call('texture.invalidate', {
        texture: serializeBridgeValue(tex),
      });
    },

    createColor(r, g, b) {
      return { r, g, b };
    },

    createPlaneGeometry(width, height, segX = 1, segY = 1) {
      const result = call('geometry.createPlane', { width, height, segX, segY });
      return makeHandle('geometry', result, { geometryType: 'plane' });
    },

    setMeshMaterial(meshId, material) {
      call('mesh.setMaterial', {
        meshId,
        material: serializeBridgeValue(material),
      });
    },

    getCameraPosition() {
      if (typeof bridge.getCameraPosition === 'function') {
        return normalizeVec3(bridge.getCameraPosition());
      }
      return normalizeVec3(call('camera.getPosition'));
    },

    getCapabilities() {
      let features = options.features;
      if (!features && typeof bridge.getCapabilities === 'function') {
        try {
          features = bridge.getCapabilities();
        } catch {
          features = [];
        }
      }
      return buildCapabilities({
        backend: 'unity',
        version: '1.0.0',
        features: features ?? ['material:basic', 'texture:data', 'geometry:plane', 'camera:read'],
      });
    },
  };
}

export function setEngineAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('setEngineAdapter requires an adapter object');
  }
  _activeAdapter = adapter;
  _customAdapterInstalled = true;
  return engine;
}

export function installUnityBridge(bridge, options = {}) {
  return setEngineAdapter(createUnityBridgeAdapter(bridge, options));
}

export function resetEngineAdapter() {
  _customAdapterInstalled = false;
  _activeAdapter = createThreeEngineAdapter();
  return engine;
}

/**
 * Wrap any adapter with a command buffer.
 *
 * Mutating calls (createMaterial, setMeshMaterial, etc.) are queued instead
 * of dispatched immediately. Call adapter.flush() to drain the buffer to the
 * inner adapter.  Read-through calls (getCameraPosition, getCapabilities) are
 * always forwarded immediately.
 *
 * This is the recommended transport for any host bridge where frame-batched
 * dispatch is more efficient than one-call-per-operation.
 *
 * @param {object} innerAdapter   — any adapter returned by createThreeEngineAdapter or createUnityBridgeAdapter
 * @param {object} [opts]
 *   autoFlush {boolean}  — if true, flush() is called automatically after each mutating call (default: false)
 *   maxQueueSize {number} — warn when queue exceeds this size (default: 512)
 * @returns {object} adapter with additional flush() / pendingCount() methods
 */
export function createCommandBufferAdapter(innerAdapter, opts = {}) {
  if (!innerAdapter || typeof innerAdapter !== 'object') {
    throw new Error('createCommandBufferAdapter requires an adapter object');
  }

  const autoFlush = opts.autoFlush ?? false;
  const maxQueueSize = opts.maxQueueSize ?? 512;
  let queue = [];

  function enqueue(method, args) {
    if (queue.length >= maxQueueSize) {
      console.warn(
        `[nova64/command-buffer] Queue size exceeded ${maxQueueSize}. ` +
          'Call flush() or enable autoFlush to drain.'
      );
    }
    queue.push({ method, args });
    if (autoFlush) flush(); // eslint-disable-line no-use-before-define
  }

  function flush() {
    const pending = queue;
    queue = [];
    for (const { method, args } of pending) {
      if (typeof innerAdapter[method] === 'function') {
        innerAdapter[method](...args);
      }
    }
  }

  /**
   * For mutating calls that also return a value (e.g. createMaterial),
   * we need to return something useful to the caller even before flush().
   * We return a deferred-result handle so the calling code can still pass
   * the opaque value into other calls that will also be buffered.
   */
  function deferredHandle(method, args) {
    const placeholder = Object.freeze({
      __nova64CommandBuffer: true,
      method,
      args,
      toString() {
        return `[deferred ${method}]`;
      },
    });
    enqueue(method, args);
    return placeholder;
  }

  // Read-through capability/camera helpers are not buffered.
  return {
    // --- Deferred mutating calls ---
    createMaterial(...args) {
      return deferredHandle('createMaterial', args);
    },
    createDataTexture(...args) {
      return deferredHandle('createDataTexture', args);
    },
    createCanvasTexture(...args) {
      return deferredHandle('createCanvasTexture', args);
    },
    cloneTexture(...args) {
      return deferredHandle('cloneTexture', args);
    },
    setTextureRepeat(...args) {
      enqueue('setTextureRepeat', args);
    },
    invalidateTexture(...args) {
      enqueue('invalidateTexture', args);
    },
    createColor(...args) {
      return deferredHandle('createColor', args);
    },
    createPlaneGeometry(...args) {
      return deferredHandle('createPlaneGeometry', args);
    },
    setMeshMaterial(...args) {
      enqueue('setMeshMaterial', args);
    },

    // --- Read-through calls ---
    getCameraPosition(...args) {
      return innerAdapter.getCameraPosition(...args);
    },
    getCapabilities(...args) {
      return innerAdapter.getCapabilities(...args);
    },

    // --- Buffer management ---
    /**
     * Drain the pending command queue to the inner adapter.
     * Call this once per frame from your host bridge update loop.
     */
    flush,

    /**
     * Return the number of commands currently waiting in the buffer.
     */
    pendingCount() {
      return queue.length;
    },

    /**
     * Discard all pending commands without dispatching them.
     */
    discardPending() {
      queue = [];
    },
  };
}

export function initAdapter(gpu) {
  _gpu = gpu;
  if (_customAdapterInstalled) return engine;
  if (globalThis.__NOVA64_UNITY_BRIDGE__) {
    _activeAdapter = createUnityBridgeAdapter(globalThis.__NOVA64_UNITY_BRIDGE__);
    _customAdapterInstalled = true;
    return engine;
  }
  _activeAdapter = createThreeEngineAdapter();
  return engine;
}

export const engine = {
  createMaterial(...args) {
    return getActiveAdapter().createMaterial(...args);
  },

  createDataTexture(...args) {
    return getActiveAdapter().createDataTexture(...args);
  },

  createCanvasTexture(...args) {
    return getActiveAdapter().createCanvasTexture(...args);
  },

  cloneTexture(...args) {
    return getActiveAdapter().cloneTexture(...args);
  },

  setTextureRepeat(...args) {
    return getActiveAdapter().setTextureRepeat(...args);
  },

  invalidateTexture(...args) {
    return getActiveAdapter().invalidateTexture(...args);
  },

  createColor(...args) {
    return getActiveAdapter().createColor(...args);
  },

  createPlaneGeometry(...args) {
    return getActiveAdapter().createPlaneGeometry(...args);
  },

  setMeshMaterial(...args) {
    return getActiveAdapter().setMeshMaterial(...args);
  },

  getCameraPosition(...args) {
    return getActiveAdapter().getCameraPosition(...args);
  },

  getCapabilities(...args) {
    return getActiveAdapter().getCapabilities(...args);
  },
};
