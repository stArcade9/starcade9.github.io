// runtime/backends/babylon/transforms.js
// Mesh and light transforms for the Babylon backend.

import { hexToColor3, normalizeVectorArgs } from './common.js';

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

// Give a mesh its own material (cloned once) so per-mesh edits stay per-mesh.
function ownMaterial(mesh) {
  if (!mesh || !mesh.material) return null;
  if (!mesh.__nova64OwnMaterial) {
    const clone = mesh.material.clone?.(`${mesh.material.name || 'mat'}#${mesh.uniqueId ?? ''}`);
    if (clone) mesh.material = clone;
    mesh.__nova64OwnMaterial = true;
  }
  return mesh.material;
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

    // ── meshOptions (parity with the Three.js backend's transforms.js) ──────
    // Materials can be shared between meshes, so a mesh gets its own copy
    // before its colour/opacity changes; otherwise recolouring one cube would
    // recolour every cube made with the same material.
    setMeshColor(idOrProxy, color) {
      const mat = ownMaterial(resolveMesh(idOrProxy));
      if (!mat) return false;
      const c = hexToColor3(color);
      if ('albedoColor' in mat) mat.albedoColor = c;
      else if ('diffuseColor' in mat) mat.diffuseColor = c;
      return true;
    },

    setMeshEmissive(idOrProxy, color, intensity = 1) {
      const mat = ownMaterial(resolveMesh(idOrProxy));
      if (!mat || !('emissiveColor' in mat)) return false;
      const scale = typeof intensity === 'number' ? intensity : 1;
      mat.emissiveColor = hexToColor3(color).scale(scale);
      return true;
    },

    setMeshOpacity(idOrProxy, opacity) {
      const mat = ownMaterial(resolveMesh(idOrProxy));
      if (!mat) return false;
      const a = Math.max(0, Math.min(1, Number(opacity)));
      mat.alpha = Number.isFinite(a) ? a : 1;
      // PBR materials only blend when asked to; 2 = MATERIAL_ALPHABLEND.
      if ('transparencyMode' in mat) mat.transparencyMode = mat.alpha < 1 ? 2 : null;
      return true;
    },

    setFlatShading(idOrProxy, enabled = true) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      // Babylon flat-shades by splitting shared vertices; it can't be undone,
      // so it is applied once and later calls only report the state.
      if (
        enabled &&
        !mesh.__nova64FlatShaded &&
        typeof mesh.convertToFlatShadedMesh === 'function'
      ) {
        mesh.convertToFlatShadedMesh();
        mesh.__nova64FlatShaded = true;
      }
      return true;
    },

    setCastShadow(idOrProxy, cast = true) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      mesh.__nova64CastShadow = !!cast;
      for (const light of mesh.getScene?.()?.lights ?? []) {
        const gen = light.getShadowGenerator?.();
        if (!gen) continue;
        if (cast) gen.addShadowCaster?.(mesh);
        else gen.removeShadowCaster?.(mesh);
      }
      return true;
    },

    setReceiveShadow(idOrProxy, receive = true) {
      const mesh = resolveMesh(idOrProxy);
      if (!mesh) return false;
      mesh.receiveShadows = !!receive;
      return true;
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
  };
}
