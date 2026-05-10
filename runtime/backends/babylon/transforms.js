// runtime/backends/babylon/transforms.js
// Mesh and light transforms for the Babylon backend.

import { normalizeVectorArgs } from './common.js';

// Helper to extract numeric ID from either a number or a mesh proxy
function getMeshId(idOrProxy) {
  if (typeof idOrProxy === 'number') return idOrProxy;
  if (idOrProxy && typeof idOrProxy === 'object') {
    // Check for __meshId property (mesh proxy)
    if (typeof idOrProxy.__meshId === 'number') return idOrProxy.__meshId;
    // Try valueOf for numeric coercion
    const val = idOrProxy.valueOf?.();
    if (typeof val === 'number') return val;
  }
  return null;
}

export function createBabylonTransformsApi(self) {
  // Helper to get mesh from ID or proxy
  function resolveMesh(idOrProxy) {
    const id = getMeshId(idOrProxy);
    if (id === null) return null;
    return self._meshes.get(id) ?? null;
  }

  return {
    destroyMesh(idOrProxy) {
      const id = getMeshId(idOrProxy);
      const mesh = self._meshes.get(id);
      if (!mesh) return false;
      mesh.dispose?.();
      self._meshes.delete(id);
      self._instancedMeshes?.delete?.(id);
      self._lodObjects?.delete?.(id);
      return true;
    },

    removeMesh(idOrProxy) {
      return this.destroyMesh(idOrProxy);
    },

    getMesh(idOrProxy) {
      return resolveMesh(idOrProxy);
    },

    setPosition(idOrProxy, x, y, z) {
      const position = normalizeVectorArgs(x, y, z, 0);
      const mesh = resolveMesh(idOrProxy);
      if (mesh) {
        mesh.position.copyFromFloats(position.x, position.y, position.z);
        return true;
      }
      const id = getMeshId(idOrProxy);
      const light = self._cartLights.get(id);
      if (light) {
        light.position.copyFromFloats(position.x, position.y, position.z);
        return true;
      }
      return false;
    },

    getPosition(idOrProxy) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return null;
      return [mesh.position.x, mesh.position.y, mesh.position.z];
    },

    getRotation(idOrProxy) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return null;
      return [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z];
    },

    setScale(idOrProxy, x, y, z) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      if (Array.isArray(x) || (x && typeof x === 'object')) {
        const scale = normalizeVectorArgs(x, y, z, 1);
        mesh.scaling.copyFromFloats(scale.x, scale.y, scale.z);
        return true;
      }

      if (typeof y === 'undefined') {
        const uniformScale = Number.isFinite(x) && x > 0 ? x : 1;
        mesh.scaling.copyFromFloats(uniformScale, uniformScale, uniformScale);
        return true;
      }

      const scale = normalizeVectorArgs(x, y, z, 1);
      mesh.scaling.copyFromFloats(scale.x, scale.y, scale.z);
      return true;
    },

    setRotation(idOrProxy, x, y, z) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      const rotation = normalizeVectorArgs(x, y, z, 0);
      mesh.rotation.copyFromFloats(rotation.x, rotation.y, rotation.z);
      return true;
    },

    rotateMesh(idOrProxy, rx, ry, rz) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      const rotation = normalizeVectorArgs(rx, ry, rz, 0);
      mesh.rotation.x += rotation.x;
      mesh.rotation.y += rotation.y;
      mesh.rotation.z += rotation.z;
      return true;
    },

    moveMesh(idOrProxy, dx, dy, dz) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      mesh.position.x += dx;
      mesh.position.y += dy;
      mesh.position.z += dz;
      return true;
    },

    setMeshVisible(idOrProxy, visible) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      mesh.isVisible = visible;
      return true;
    },

    setMeshOpacity(idOrProxy, opacity) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh?.material) return false;
      mesh.material.alpha = opacity;
      return true;
    },

    setReceiveShadow(idOrProxy, receive) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      mesh.receiveShadows = receive;
      return true;
    },

    setCastShadow(idOrProxy, cast) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      mesh.castShadow = cast;
      return true;
    },

    setFlatShading(idOrProxy, enabled = true) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh || !enabled || typeof mesh.convertToFlatShadedMesh !== 'function') return false;
      mesh.convertToFlatShadedMesh();
      return true;
    },
  };
}
