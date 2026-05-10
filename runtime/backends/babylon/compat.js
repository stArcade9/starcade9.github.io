// runtime/backends/babylon/compat.js
// Three-style compatibility shims for Babylon scene graph, materials, lights, and textures.

import { Constants, Vector3 } from '@babylonjs/core';

const COLOR_COMPAT = Symbol('nova64.babylon.colorCompat');
const TEXTURE_COMPAT = Symbol('nova64.babylon.textureCompat');
const MATERIAL_COMPAT = Symbol('nova64.babylon.materialCompat');
const NODE_COMPAT = Symbol('nova64.babylon.nodeCompat');
const SCENE_COMPAT = Symbol('nova64.babylon.sceneCompat');
const LIGHT_COMPAT = Symbol('nova64.babylon.lightCompat');
const TEXTURE_VERSION = Symbol('nova64.babylon.textureVersion');
const MATERIAL_VERSION = Symbol('nova64.babylon.materialVersion');

function defineCompatProperty(target, key, descriptor) {
  const own = Object.getOwnPropertyDescriptor(target, key);
  if (own && own.configurable === false) return false;
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: false,
    ...descriptor,
  });
  return true;
}

function normalizeHex(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value >>> 0;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/^#/, '');
    const parsed = Number.parseInt(normalized, 16);
    if (Number.isFinite(parsed)) return parsed >>> 0;
  }
  return null;
}

function setColorFromHex(color, value) {
  const hex = normalizeHex(value);
  if (hex === null || !color?.copyFromFloats) return color;
  color.copyFromFloats(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255);
  return color;
}

function setColorFromValue(color, value) {
  if (!color) return color;
  const hex = normalizeHex(value);
  if (hex !== null) return setColorFromHex(color, hex);
  if (value && typeof value === 'object') {
    if (typeof value.r === 'number' && typeof value.g === 'number' && typeof value.b === 'number') {
      color.copyFromFloats?.(value.r, value.g, value.b);
    }
  }
  return color;
}

function getColorHex(color) {
  if (!color) return 0;
  const r = Math.max(0, Math.min(255, Math.round((color.r ?? 0) * 255)));
  const g = Math.max(0, Math.min(255, Math.round((color.g ?? 0) * 255)));
  const b = Math.max(0, Math.min(255, Math.round((color.b ?? 0) * 255)));
  return (r << 16) | (g << 8) | b;
}

function createVector2Proxy(readX, readY, writeXY) {
  const proxy = {};
  defineCompatProperty(proxy, 'x', {
    get: () => readX(),
    set: value => writeXY(value, readY()),
  });
  defineCompatProperty(proxy, 'y', {
    get: () => readY(),
    set: value => writeXY(readX(), value),
  });
  proxy.set = (x, y = x) => {
    writeXY(x, y);
    return proxy;
  };
  return proxy;
}

function getMaterialTextureKey(material) {
  if (!material || typeof material !== 'object') return null;
  if ('albedoTexture' in material) return 'albedoTexture';
  if ('diffuseTexture' in material) return 'diffuseTexture';
  return null;
}

function getMaterialColorKey(material) {
  if (!material || typeof material !== 'object') return null;
  if ('albedoColor' in material) return 'albedoColor';
  if ('diffuseColor' in material) return 'diffuseColor';
  return null;
}

function getBabylonClassName(value) {
  try {
    return value?.getClassName?.() ?? null;
  } catch {
    return null;
  }
}

function visitNode(node, callback, visited) {
  if (!node || visited.has(node)) return;
  const compatibleNode = applyBabylonObjectCompatibility(node);
  visited.add(compatibleNode);
  callback(compatibleNode);
  const children = compatibleNode.getChildren?.() ?? [];
  for (const child of children) {
    visitNode(child, callback, visited);
  }
}

function getSceneChildren(scene) {
  const children = [];
  const seen = new Set();
  const add = value => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    children.push(applyBabylonObjectCompatibility(value));
  };

  for (const root of scene?.rootNodes ?? []) add(root);
  for (const light of scene?.lights ?? []) add(light);
  for (const camera of scene?.cameras ?? []) {
    if (camera !== scene?.activeCamera) add(camera);
  }
  for (const mesh of scene?.meshes ?? []) {
    if (!mesh.parent) add(mesh);
  }

  return children;
}

export function applyBabylonColorCompatibility(color) {
  if (!color || color[COLOR_COMPAT]) return color;
  color[COLOR_COMPAT] = true;
  const nativeSet = typeof color.set === 'function' ? color.set.bind(color) : null;
  if (typeof color.setHex !== 'function') color.setHex = value => setColorFromHex(color, value);
  if (typeof color.getHex !== 'function') color.getHex = () => getColorHex(color);
  if (typeof color.getHexString !== 'function') {
    color.getHexString = () => getColorHex(color).toString(16).padStart(6, '0');
  }
  if (typeof color.setRGB !== 'function') {
    color.setRGB = (r, g, b) => {
      color.copyFromFloats?.(r, g, b);
      return color;
    };
  }
  color.set = (...args) => {
    if (args.length <= 1) return setColorFromValue(color, args[0]);
    if (nativeSet) {
      nativeSet(...args);
      return color;
    }
    color.copyFromFloats?.(args[0] ?? 0, args[1] ?? 0, args[2] ?? 0);
    return color;
  };
  return color;
}

export function applyBabylonTextureCompatibility(texture) {
  if (!texture || texture[TEXTURE_COMPAT]) return texture;
  texture[TEXTURE_COMPAT] = true;

  if (!('wrapS' in texture)) {
    defineCompatProperty(texture, 'wrapS', {
      get: () => texture.wrapU,
      set: value => {
        texture.wrapU = value;
      },
    });
  }
  if (!('wrapT' in texture)) {
    defineCompatProperty(texture, 'wrapT', {
      get: () => texture.wrapV,
      set: value => {
        texture.wrapV = value;
      },
    });
  }
  if (!('repeat' in texture)) {
    defineCompatProperty(texture, 'repeat', {
      value: createVector2Proxy(
        () => texture.uScale ?? 1,
        () => texture.vScale ?? 1,
        (x, y) => {
          texture.uScale = x;
          texture.vScale = y;
        }
      ),
    });
  }
  if (!('offset' in texture)) {
    defineCompatProperty(texture, 'offset', {
      value: createVector2Proxy(
        () => texture.uOffset ?? 0,
        () => texture.vOffset ?? 0,
        (x, y) => {
          texture.uOffset = x;
          texture.vOffset = y;
        }
      ),
    });
  }
  if (!('needsUpdate' in texture)) {
    let needsUpdate = false;
    if (!('version' in texture)) {
      defineCompatProperty(texture, 'version', {
        get: () => texture[TEXTURE_VERSION] ?? 0,
      });
    }
    defineCompatProperty(texture, 'needsUpdate', {
      get: () => needsUpdate,
      set: value => {
        needsUpdate = !!value;
        if (!needsUpdate) return;
        texture[TEXTURE_VERSION] = (texture[TEXTURE_VERSION] ?? 0) + 1;
        try {
          texture.update?.();
        } catch {
          // Some Babylon texture types require optional arguments.
        }
        texture
          .getScene?.()
          ?.markAllMaterialsAsDirty?.(Constants.MATERIAL_TextureDirtyFlag, material =>
            material.hasTexture?.(texture)
          );
      },
    });
  }

  return texture;
}

export function applyBabylonMaterialCompatibility(material) {
  if (!material) return material;
  const colorKey = getMaterialColorKey(material);
  const textureKey = getMaterialTextureKey(material);

  if (material[MATERIAL_COMPAT]) {
    if (colorKey) applyBabylonColorCompatibility(material[colorKey]);
    if (textureKey) applyBabylonTextureCompatibility(material[textureKey]);
    return material;
  }

  material[MATERIAL_COMPAT] = true;

  // Ensure needAlphaBlendingForMesh exists - Babylon.js rendering requires this method
  // This is a safeguard for materials that may have been cloned or created without
  // proper prototype chain (e.g., plain objects mistakenly used as materials)
  if (typeof material.needAlphaBlendingForMesh !== 'function') {
    material.needAlphaBlendingForMesh = function () {
      return (this.alpha ?? 1) < 1 || !!this.opacityTexture || this.alphaMode > 0;
    };
  }
  if (typeof material.needAlphaTesting !== 'function') {
    material.needAlphaTesting = function () {
      return this.alphaMode === Constants.MATERIAL_ALPHATEST;
    };
  }

  if (colorKey) {
    applyBabylonColorCompatibility(material[colorKey]);
    if (!('color' in material)) {
      defineCompatProperty(material, 'color', {
        get: () => applyBabylonColorCompatibility(material[colorKey]),
        set: value => {
          setColorFromValue(material[colorKey], value);
        },
      });
    }
  }

  for (const key of [
    'ambientColor',
    'diffuseColor',
    'albedoColor',
    'specularColor',
    'emissiveColor',
  ]) {
    if (key in material && material[key]) applyBabylonColorCompatibility(material[key]);
  }

  if (textureKey) {
    if (material[textureKey]) applyBabylonTextureCompatibility(material[textureKey]);
    if (!('map' in material)) {
      defineCompatProperty(material, 'map', {
        get: () => applyBabylonTextureCompatibility(material[textureKey]),
        set: value => {
          material[textureKey] = value;
          applyBabylonTextureCompatibility(material[textureKey]);
        },
      });
    }
  }

  if (!('transparent' in material)) {
    defineCompatProperty(material, 'transparent', {
      get: () => (material.alpha ?? 1) < 1 || !!material.opacityTexture,
      set: value => {
        if (!value) material.alpha = 1;
      },
    });
  }
  if (!('opacity' in material)) {
    defineCompatProperty(material, 'opacity', {
      get: () => material.alpha ?? 1,
      set: value => {
        material.alpha = value;
      },
    });
  }
  if (!('needsUpdate' in material)) {
    let needsUpdate = false;
    if (!('version' in material)) {
      defineCompatProperty(material, 'version', {
        get: () => material[MATERIAL_VERSION] ?? 0,
      });
    }
    defineCompatProperty(material, 'needsUpdate', {
      get: () => needsUpdate,
      set: value => {
        needsUpdate = !!value;
        if (!needsUpdate) return;
        material[MATERIAL_VERSION] = (material[MATERIAL_VERSION] ?? 0) + 1;
        material.markAsDirty?.(Constants.MATERIAL_AllDirtyFlag);
      },
    });
  }

  return material;
}

export function applyBabylonNodeCompatibility(node) {
  if (!node || node[NODE_COMPAT]) return node;
  node[NODE_COMPAT] = true;

  if (!('children' in node)) {
    defineCompatProperty(node, 'children', {
      get: () => node.getChildren?.() ?? [],
    });
  }
  if (typeof node.traverse !== 'function') {
    node.traverse = callback => {
      visitNode(node, callback, new Set());
    };
  }
  if (!('isObject3D' in node)) {
    defineCompatProperty(node, 'isObject3D', {
      get: () => true,
    });
  }
  if (!('type' in node)) {
    defineCompatProperty(node, 'type', {
      get: () => node.getClassName?.() ?? 'Node',
    });
  }

  return node;
}

export function applyBabylonMeshCompatibility(mesh) {
  if (!mesh) return mesh;
  applyBabylonNodeCompatibility(mesh);
  if (!('visible' in mesh)) {
    defineCompatProperty(mesh, 'visible', {
      get() {
        return this.isVisible;
      },
      set(value) {
        this.isVisible = value;
      },
    });
  }
  if (!('isMesh' in mesh)) {
    defineCompatProperty(mesh, 'isMesh', {
      get: () => true,
    });
  }
  if (mesh.material) applyBabylonMaterialCompatibility(mesh.material);
  return mesh;
}

export function applyBabylonLightCompatibility(light) {
  if (!light) return light;
  applyBabylonNodeCompatibility(light);
  if (light[LIGHT_COMPAT]) return light;
  light[LIGHT_COMPAT] = true;
  if (!('isLight' in light)) {
    defineCompatProperty(light, 'isLight', {
      get: () => true,
    });
  }
  if (!('color' in light)) {
    defineCompatProperty(light, 'color', {
      get: () => applyBabylonColorCompatibility(light.diffuse),
      set: value => {
        setColorFromValue(light.diffuse, value);
      },
    });
  }
  applyBabylonColorCompatibility(light.diffuse);
  return light;
}

export function applyBabylonSceneCompatibility(scene) {
  if (!scene || scene[SCENE_COMPAT]) return scene;
  scene[SCENE_COMPAT] = true;

  if (!('children' in scene)) {
    defineCompatProperty(scene, 'children', {
      get: () => getSceneChildren(scene),
    });
  }
  if (typeof scene.traverse !== 'function') {
    scene.traverse = callback => {
      callback(scene);
      const visited = new Set();
      for (const child of getSceneChildren(scene)) {
        visitNode(child, callback, visited);
      }
    };
  }
  if (!('type' in scene)) {
    defineCompatProperty(scene, 'type', {
      get: () => 'Scene',
    });
  }

  return scene;
}

export function applyBabylonObjectCompatibility(value) {
  if (!value || typeof value !== 'object') return value;
  const className = getBabylonClassName(value);
  if (className?.endsWith('Light')) return applyBabylonLightCompatibility(value);
  if (className?.includes('Mesh')) return applyBabylonMeshCompatibility(value);
  return applyBabylonNodeCompatibility(value);
}

export function setBabylonDirectionalLightFromPosition(light, value) {
  if (!light) return;
  const position = Array.isArray(value)
    ? { x: value[0] ?? 0, y: value[1] ?? 0, z: value[2] ?? 0 }
    : value && typeof value === 'object'
      ? { x: value.x ?? 0, y: value.y ?? 0, z: value.z ?? 0 }
      : { x: 0, y: 0, z: 0 };
  light.position = light.position ?? new Vector3(0, 0, 0);
  light.position.copyFromFloats(position.x, position.y, position.z);
  light.direction = Vector3.Zero().subtract(light.position).normalize();
}
