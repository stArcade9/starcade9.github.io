// runtime/api-3d/primitives.js
// Mesh creation (createMesh) and all shape primitives

import * as THREE from 'three';
import { logger } from '../logger.js';

export function primitivesModule({
  scene,
  gpu,
  meshes,
  mixers,
  modelAnimations,
  counters,
  getCachedMaterial,
}) {
  function createMesh(geometry, material, position = [0, 0, 0]) {
    if (!geometry || !material) {
      logger.error('createMesh: geometry and material are required');
      return null;
    }

    let mesh;
    if (geometry.type && !geometry.isBufferGeometry) {
      // Mock object path (used in tests)
      mesh = {
        type: 'Mesh',
        geometry,
        material,
        position: {
          x: 0,
          y: 0,
          z: 0,
          set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
          },
        },
        rotation: {
          x: 0,
          y: 0,
          z: 0,
          set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
          },
        },
        scale: {
          x: 1,
          y: 1,
          z: 1,
          set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
          },
          setScalar(s) {
            this.x = s;
            this.y = s;
            this.z = s;
          },
        },
        castShadow: true,
        receiveShadow: true,
      };
    } else {
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    if (Array.isArray(position) && position.length >= 3) {
      mesh.position.set(position[0], position[1], position[2]);
    } else if (typeof position === 'object' && position.x !== undefined) {
      mesh.position.set(position.x, position.y || 0, position.z || 0);
    } else {
      mesh.position.set(0, 0, 0);
    }

    if (scene.add) scene.add(mesh);
    if (material?.userData?.animated && gpu.registerAnimatedMesh) {
      gpu.registerAnimatedMesh(mesh);
    }

    const id = ++counters.mesh;
    meshes.set(id, mesh);
    return id;
  }

  function destroyMesh(id) {
    const mesh = meshes.get(id);
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry?.dispose();
      if (mesh.material?.map) mesh.material.map.dispose();
      mesh.material?.dispose();
      meshes.delete(id);
      mixers.delete(id);
      modelAnimations.delete(id);
    }
  }

  function getMesh(id) {
    return meshes.get(id);
  }

  function createCube(size = 1, color = 0xffffff, position = [0, 0, 0], options = {}) {
    try {
      if (typeof size !== 'number' || size <= 0) {
        logger.warn('createCube: invalid size, using default');
        size = 1;
      }
      if (typeof color !== 'number') {
        logger.warn('createCube: invalid color, using white');
        color = 0xffffff;
      }
      return createMesh(
        gpu.createBoxGeometry(size, size, size),
        getCachedMaterial({ color, ...options }),
        position
      );
    } catch (e) {
      logger.error('createCube failed:', e);
      return null;
    }
  }

  function createAdvancedCube(size = 1, materialOptions = {}, position = [0, 0, 0]) {
    try {
      if (typeof size !== 'number' || size <= 0) size = 1;
      return createMesh(
        gpu.createBoxGeometry(size, size, size),
        getCachedMaterial(materialOptions),
        position
      );
    } catch (e) {
      logger.error('createAdvancedCube failed:', e);
      return null;
    }
  }

  function createSphere(
    radius = 1,
    color = 0xffffff,
    position = [0, 0, 0],
    segments = 8,
    options = {}
  ) {
    try {
      if (typeof radius !== 'number' || radius <= 0) {
        logger.warn('createSphere: invalid radius, using default');
        radius = 1;
      }
      if (typeof segments !== 'number' || segments < 3) {
        logger.warn('createSphere: invalid segments, using default');
        segments = 8;
      }
      return createMesh(
        gpu.createSphereGeometry(radius, segments),
        getCachedMaterial({ color, ...options }),
        position
      );
    } catch (e) {
      logger.error('createSphere failed:', e);
      return null;
    }
  }

  function createAdvancedSphere(
    radius = 1,
    materialOptions = {},
    position = [0, 0, 0],
    segments = 16
  ) {
    try {
      if (typeof radius !== 'number' || radius <= 0) radius = 1;
      if (typeof segments !== 'number' || segments < 3) segments = 16;
      return createMesh(
        gpu.createSphereGeometry(radius, segments),
        getCachedMaterial(materialOptions),
        position
      );
    } catch (e) {
      logger.error('createAdvancedSphere failed:', e);
      return null;
    }
  }

  function createPlane(width = 1, height = 1, color = 0xffffff, position = [0, 0, 0]) {
    try {
      if (typeof width !== 'number' || width <= 0) {
        logger.warn('createPlane: invalid width, using default');
        width = 1;
      }
      if (typeof height !== 'number' || height <= 0) {
        logger.warn('createPlane: invalid height, using default');
        height = 1;
      }
      return createMesh(
        gpu.createPlaneGeometry(width, height),
        getCachedMaterial({ color }),
        position
      );
    } catch (e) {
      logger.error('createPlane failed:', e);
      return null;
    }
  }

  function createCylinder(
    radiusTop = 1,
    radiusBottom = 1,
    height = 1,
    color = 0xffffff,
    position = [0, 0, 0],
    options = {}
  ) {
    try {
      const geom = gpu.createCylinderGeometry
        ? gpu.createCylinderGeometry(radiusTop, radiusBottom, height, options.segments || 16)
        : gpu.createBoxGeometry(radiusTop, height, radiusTop);
      return createMesh(geom, getCachedMaterial({ ...options, color }), position);
    } catch (e) {
      logger.error('createCylinder err', e);
      return createCube(radiusTop * 2, color, position);
    }
  }

  function createTorus(
    radius = 1,
    tube = 0.3,
    color = 0xffffff,
    position = [0, 0, 0],
    options = {}
  ) {
    try {
      const geometry = new THREE.TorusGeometry(
        radius,
        tube,
        options.radialSegments || 8,
        options.tubularSegments || 16
      );
      return createMesh(geometry, gpu.createN64Material({ color, ...options }), position);
    } catch (e) {
      logger.error('createTorus failed:', e);
      return null;
    }
  }

  function createCone(
    radius = 1,
    height = 2,
    color = 0xffffff,
    position = [0, 0, 0],
    options = {}
  ) {
    try {
      return createMesh(
        gpu.createConeGeometry(radius, height, options.segments || 16),
        getCachedMaterial({ color, ...options }),
        position
      );
    } catch (e) {
      logger.error('createCone failed:', e);
      return null;
    }
  }

  function createCapsule(
    radius = 0.5,
    height = 1,
    color = 0xffffff,
    position = [0, 0, 0],
    options = {}
  ) {
    try {
      return createMesh(
        gpu.createCapsuleGeometry(radius, height, options.segments || 8),
        getCachedMaterial({ color, ...options }),
        position
      );
    } catch (e) {
      logger.error('createCapsule failed:', e);
      return null;
    }
  }

  return {
    createMesh,
    destroyMesh,
    getMesh,
    removeMesh: destroyMesh,
    createCube,
    createAdvancedCube,
    createSphere,
    createAdvancedSphere,
    createPlane,
    createCylinder,
    createTorus,
    createCone,
    createCapsule,
  };
}
