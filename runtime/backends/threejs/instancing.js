// runtime/api-3d/instancing.js
// GPU instancing (InstancedMesh) and LOD (Level of Detail) system

import * as THREE from 'three';

export function instancingModule({
  scene,
  camera,
  gpu,
  instancedMeshes,
  lodObjects,
  counters,
  getCachedMaterial,
}) {
  const _iDummy = new THREE.Object3D();

  // --- Instancing ---

  function createInstancedMesh(shape = 'cube', count = 100, color = 0xffffff, options = {}) {
    // If the GPU backend has its own createInstancedMesh (e.g., Babylon.js), use that
    if (typeof gpu.createInstancedMesh === 'function') {
      return gpu.createInstancedMesh(shape, count, color, options);
    }

    // Otherwise, use Three.js implementation
    let geometry;
    switch (shape) {
      case 'sphere':
        geometry = gpu.createSphereGeometry(options.size || 1, options.segments || 6);
        break;
      case 'plane':
        geometry = gpu.createPlaneGeometry(options.width || 1, options.height || 1);
        break;
      case 'cylinder':
        geometry = gpu.createCylinderGeometry(
          options.size || 0.5,
          options.size || 0.5,
          options.height || 2,
          8
        );
        break;
      default:
        geometry = gpu.createBoxGeometry(options.size || 1, options.size || 1, options.size || 1);
    }
    const material = getCachedMaterial({ color, ...options });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    const id = ++counters.instance;
    instancedMeshes.set(id, { mesh, count });
    return id;
  }

  function setInstanceTransform(
    instancedId,
    index,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1
  ) {
    // Delegate to GPU backend if it has its own implementation
    if (typeof gpu.setInstanceTransform === 'function') {
      return gpu.setInstanceTransform(instancedId, index, x, y, z, rx, ry, rz, sx, sy, sz);
    }

    // Three.js implementation
    const entry = instancedMeshes.get(instancedId);
    if (!entry || index < 0 || index >= entry.count) return false;
    _iDummy.position.set(x, y, z);
    _iDummy.rotation.set(rx, ry, rz);
    _iDummy.scale.set(sx, sy, sz);
    _iDummy.updateMatrix();
    entry.mesh.setMatrixAt(index, _iDummy.matrix);
    return true;
  }

  function setInstanceColor(instancedId, index, color) {
    // Delegate to GPU backend if it has its own implementation
    if (typeof gpu.setInstanceColor === 'function') {
      return gpu.setInstanceColor(instancedId, index, color);
    }

    // Three.js implementation
    const entry = instancedMeshes.get(instancedId);
    if (!entry) return false;
    entry.mesh.setColorAt(index, new THREE.Color(color));
    if (entry.mesh.instanceColor) entry.mesh.instanceColor.needsUpdate = true;
    return true;
  }

  function finalizeInstances(instancedId) {
    // Delegate to GPU backend if it has its own implementation
    if (typeof gpu.finalizeInstances === 'function') {
      return gpu.finalizeInstances(instancedId);
    }

    // Three.js implementation
    const entry = instancedMeshes.get(instancedId);
    if (!entry) return false;
    entry.mesh.instanceMatrix.needsUpdate = true;
    try {
      entry.mesh.computeBoundingSphere();
    } catch {
      /* mock or incomplete geometry — skip */
    }
    return true;
  }

  function removeInstancedMesh(instancedId) {
    // Delegate to GPU backend if it has its own implementation
    if (typeof gpu.removeInstancedMesh === 'function') {
      return gpu.removeInstancedMesh(instancedId);
    }

    // Three.js implementation
    const entry = instancedMeshes.get(instancedId);
    if (!entry) return false;
    scene.remove(entry.mesh);
    entry.mesh.geometry?.dispose();
    entry.mesh.material?.dispose();
    instancedMeshes.delete(instancedId);
    return true;
  }

  // --- LOD ---

  function createLODMesh(levels = [], position = [0, 0, 0]) {
    const lod = new THREE.LOD();
    for (const {
      shape = 'cube',
      size = 1,
      color = 0xffffff,
      distance = 0,
      options = {},
    } of levels) {
      let geometry;
      switch (shape) {
        case 'sphere':
          geometry = gpu.createSphereGeometry(size, options.segments || 8);
          break;
        case 'plane':
          geometry = gpu.createPlaneGeometry(size, options.height || size);
          break;
        case 'cylinder':
          geometry = gpu.createCylinderGeometry(
            size * 0.5,
            size * 0.5,
            options.height || size * 2,
            options.segments || 8
          );
          break;
        default:
          geometry = gpu.createBoxGeometry(size, size, size);
      }
      const mat = getCachedMaterial({ color, ...options });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      lod.addLevel(mesh, distance);
    }
    if (Array.isArray(position) && position.length >= 3) {
      lod.position.set(position[0], position[1], position[2]);
    }
    scene.add(lod);
    const id = ++counters.lod;
    lodObjects.set(id, lod);
    return id;
  }

  function setLODPosition(lodId, x, y, z) {
    const lod = lodObjects.get(lodId);
    if (!lod) return false;
    lod.position.set(x, y, z);
    return true;
  }

  function removeLODMesh(lodId) {
    const lod = lodObjects.get(lodId);
    if (!lod) return false;
    scene.remove(lod);
    for (const { object } of lod.levels) {
      object.geometry?.dispose();
      object.material?.dispose();
    }
    lodObjects.delete(lodId);
    return true;
  }

  function updateLODs() {
    for (const lod of lodObjects.values()) lod.update(camera);
  }

  return {
    createInstancedMesh,
    setInstanceTransform,
    setInstanceColor,
    finalizeInstances,
    removeInstancedMesh,
    createLODMesh,
    setLODPosition,
    removeLODMesh,
    updateLODs,
  };
}
