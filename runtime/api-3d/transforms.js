// runtime/api-3d/transforms.js
// Mesh position, rotation, scale, visibility, and shadow controls

import { logger } from '../logger.js';

export function transformsModule({ getMesh }) {
  function setPosition(meshId, x, y, z) {
    try {
      const mesh = getMesh(meshId);
      if (!mesh) {
        logger.warn(`setPosition: mesh with id ${meshId} not found`);
        return false;
      }
      mesh.position.set(
        typeof x === 'number' ? x : 0,
        typeof y === 'number' ? y : 0,
        typeof z === 'number' ? z : 0
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
      mesh.rotation.set(
        typeof x === 'number' ? x : 0,
        typeof y === 'number' ? y : 0,
        typeof z === 'number' ? z : 0
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
