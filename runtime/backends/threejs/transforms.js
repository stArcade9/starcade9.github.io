// runtime/api-3d/transforms.js
// Mesh position, rotation, scale, visibility, and shadow controls

import { logger } from '../../logger.js';

export function transformsModule({ getMesh }) {
  function normalizeVectorArgs(x, y, z) {
    if (Array.isArray(x)) return [x[0] ?? 0, x[1] ?? 0, x[2] ?? 0];
    if (x && typeof x === 'object') return [x.x ?? 0, x.y ?? 0, x.z ?? 0];
    return [x, y, z];
  }

  function setPosition(meshId, x, y, z) {
    try {
      const mesh = getMesh(meshId);
      if (!mesh) {
        logger.warn(`setPosition: mesh with id ${meshId} not found`);
        return false;
      }
      const [px, py, pz] = normalizeVectorArgs(x, y, z);
      mesh.position.set(
        typeof px === 'number' ? px : 0,
        typeof py === 'number' ? py : 0,
        typeof pz === 'number' ? pz : 0
      );
      return true;
    } catch (e) {
      logger.error('setPosition failed:', e);
      return false;
    }
  }

  function setRotation(meshId, x, y, z) {
    try {
      const mesh = getMesh(meshId);
      if (!mesh) {
        logger.warn(`setRotation: mesh with id ${meshId} not found`);
        return false;
      }
      const [rx, ry, rz] = normalizeVectorArgs(x, y, z);
      mesh.rotation.set(
        typeof rx === 'number' ? rx : 0,
        typeof ry === 'number' ? ry : 0,
        typeof rz === 'number' ? rz : 0
      );
      return true;
    } catch (e) {
      logger.error('setRotation failed:', e);
      return false;
    }
  }

  function setScale(meshId, x, y, z) {
    try {
      const mesh = getMesh(meshId);
      if (!mesh) {
        logger.warn(`setScale: mesh with id ${meshId} not found`);
        return false;
      }
      if (Array.isArray(x) || (x && typeof x === 'object')) {
        const [sx, sy, sz] = normalizeVectorArgs(x, y, z);
        mesh.scale.set(
          typeof sx === 'number' && sx > 0 ? sx : 1,
          typeof sy === 'number' && sy > 0 ? sy : 1,
          typeof sz === 'number' && sz > 0 ? sz : 1
        );
        return true;
      }

      x = typeof x === 'number' && x > 0 ? x : 1;
      if (typeof y === 'undefined') {
        mesh.scale.setScalar(x);
      } else {
        mesh.scale.set(
          x,
          typeof y === 'number' && y > 0 ? y : 1,
          typeof z === 'number' && z > 0 ? z : 1
        );
      }
      return true;
    } catch (e) {
      logger.error('setScale failed:', e);
      return false;
    }
  }

  function getPosition(meshId) {
    const mesh = getMesh(meshId);
    return mesh ? [mesh.position.x, mesh.position.y, mesh.position.z] : null;
  }

  function getRotation(meshId) {
    const mesh = getMesh(meshId);
    return mesh ? [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z] : null;
  }

  function rotateMesh(meshId, dX, dY, dZ) {
    try {
      const mesh = getMesh(meshId);
      if (!mesh) {
        logger.warn(`rotateMesh: mesh with id ${meshId} not found`);
        return false;
      }
      mesh.rotation.x += typeof dX === 'number' ? dX : 0;
      mesh.rotation.y += typeof dY === 'number' ? dY : 0;
      mesh.rotation.z += typeof dZ === 'number' ? dZ : 0;
      return true;
    } catch (e) {
      logger.error('rotateMesh failed:', e);
      return false;
    }
  }

  function moveMesh(meshId, x, y, z) {
    const mesh = getMesh(meshId);
    if (mesh) {
      mesh.position.x += x;
      mesh.position.y += y;
      mesh.position.z += z;
    }
  }

  function setFlatShading(meshId, enabled = true) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    if (mesh.material) {
      mesh.material.flatShading = enabled;
      mesh.material.needsUpdate = true;
    }
    return true;
  }

  function setMeshVisible(meshId, visible) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    mesh.visible = visible;
    return true;
  }

  function setMeshOpacity(meshId, opacity) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    if (mesh.material) {
      mesh.material.transparent = opacity < 1;
      mesh.material.opacity = opacity;
      mesh.material.needsUpdate = true;
    }
    return true;
  }

  function setCastShadow(meshId, cast) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    mesh.castShadow = cast;
    return true;
  }

  function setReceiveShadow(meshId, receive) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    mesh.receiveShadow = receive;
    return true;
  }

  return {
    setPosition,
    setRotation,
    setScale,
    getPosition,
    getRotation,
    rotateMesh,
    moveMesh,
    setFlatShading,
    setMeshVisible,
    setMeshOpacity,
    setCastShadow,
    setReceiveShadow,
  };
}
