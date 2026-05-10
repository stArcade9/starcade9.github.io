// runtime/api-3d/primitives.js
// Mesh creation (createMesh) and all shape primitives

import * as THREE from 'three';
import { logger } from '../../logger.js';

function isPositionLike(value) {
  return Array.isArray(value) || (value && typeof value === 'object' && value.x !== undefined);
}

function isOptionsLike(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && value.x === undefined;
}

function normalizeCylinderArgs(
  radiusTop = 1,
  radiusBottom = 1,
  height = 1,
  color = 0xffffff,
  position = [0, 0, 0],
  options = {},
  argCount = 6
) {
  if (argCount <= 3 && Number.isFinite(height) && (height === 0 || Math.abs(height) > 128)) {
    return {
      radiusTop,
      radiusBottom: radiusTop,
      height: radiusBottom,
      color: height,
      position,
      options: options ?? {},
    };
  }

  if (isPositionLike(color) || isOptionsLike(color)) {
    return {
      radiusTop,
      radiusBottom: radiusTop,
      height: radiusBottom,
      color: height,
      position: isPositionLike(color) ? color : [0, 0, 0],
      options: isPositionLike(color) ? (position ?? {}) : color,
    };
  }

  if (Number.isInteger(color) && color >= 3 && color <= 128 && isPositionLike(position)) {
    return {
      radiusTop,
      radiusBottom: radiusTop,
      height: radiusBottom,
      color: height,
      position,
      options: { ...(options ?? {}), segments: color },
    };
  }

  return { radiusTop, radiusBottom, height, color, position, options: options ?? {} };
}

function normalizeCubeArgs(size = 1, color = 0xffffff, position = [0, 0, 0], options = {}, args) {
  const list = Array.from(args ?? []);
  const [width, height, depth, boxColor, boxPosition, boxOptions] = list;

  if (
    list.length >= 4 &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    Number.isFinite(depth) &&
    Number.isFinite(boxColor)
  ) {
    return {
      width,
      height,
      depth,
      color: boxColor,
      position: isPositionLike(boxPosition) ? boxPosition : [0, 0, 0],
      options: isPositionLike(boxPosition) ? (boxOptions ?? {}) : (boxPosition ?? {}),
    };
  }

  return {
    width: size,
    height: size,
    depth: size,
    color,
    position,
    options: options ?? {},
  };
}

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

    // Create a proxy that acts like an ID but also exposes mesh properties
    // This allows carts to use both `setPosition(meshId, ...)` AND `mesh.position.x`
    // Many carts assume createCube/createSphere return mesh objects with .position, .material, etc.
    const proxy = new Proxy(mesh, {
      get(target, prop) {
        // For numeric coercion (when used as ID in Map lookups, etc.)
        if (prop === Symbol.toPrimitive) {
          return hint => (hint === 'number' ? id : String(id));
        }
        if (prop === 'valueOf') {
          return () => id;
        }
        if (prop === 'toString') {
          return () => String(id);
        }
        // Special property to get the raw numeric ID
        if (prop === '__meshId') {
          return id;
        }
        // Forward all other property access to the actual Three.js mesh
        const value = target[prop];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    });

    meshes.set(id, proxy);
    return proxy;
  }

  function destroyMesh(idOrProxy) {
    // Extract numeric ID from proxy if needed
    let id = idOrProxy;
    if (typeof idOrProxy !== 'number' && idOrProxy && typeof idOrProxy === 'object') {
      id = idOrProxy.__meshId ?? idOrProxy.valueOf?.() ?? idOrProxy;
    }
    const mesh = meshes.get(id);
    if (mesh) {
      // The mesh is a Proxy that forwards to the actual Three.js mesh
      // scene.remove, dispose etc. all work through the Proxy's forwarding
      scene.remove(mesh);
      mesh.geometry?.dispose?.();
      if (mesh.material?.map) mesh.material.map.dispose?.();
      mesh.material?.dispose?.();
      meshes.delete(id);
      mixers.delete(id);
      modelAnimations.delete(id);
    }
  }

  function getMesh(idOrProxy) {
    // Handle both raw IDs and proxy objects
    if (typeof idOrProxy === 'number') return meshes.get(idOrProxy);
    if (idOrProxy && typeof idOrProxy === 'object') {
      // Check for __meshId property (mesh proxy)
      if (typeof idOrProxy.__meshId === 'number') return meshes.get(idOrProxy.__meshId);
      // Try valueOf for numeric coercion
      const val = idOrProxy.valueOf?.();
      if (typeof val === 'number') return meshes.get(val);
    }
    return null;
  }

  function createCube(size = 1, color = 0xffffff, position = [0, 0, 0], options = {}) {
    try {
      const args = normalizeCubeArgs(size, color, position, options, arguments);
      if (
        typeof args.width !== 'number' ||
        typeof args.height !== 'number' ||
        typeof args.depth !== 'number' ||
        args.width <= 0 ||
        args.height <= 0 ||
        args.depth <= 0
      ) {
        logger.warn('createCube: invalid size, using default');
        args.width = 1;
        args.height = 1;
        args.depth = 1;
      }
      if (typeof args.color !== 'number') {
        logger.warn('createCube: invalid color, using white');
        args.color = 0xffffff;
      }
      return createMesh(
        gpu.createBoxGeometry(args.width, args.height, args.depth),
        getCachedMaterial({ color: args.color, ...args.options }),
        args.position
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
      if (isOptionsLike(segments)) {
        options = segments;
        segments = 8;
      }
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

  function createPlane(
    width = 1,
    height = 1,
    color = 0xffffff,
    position = [0, 0, 0],
    options = {}
  ) {
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
        getCachedMaterial({ color, ...options }),
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
      const args = normalizeCylinderArgs(
        radiusTop,
        radiusBottom,
        height,
        color,
        position,
        options,
        arguments.length
      );
      const geom = gpu.createCylinderGeometry
        ? gpu.createCylinderGeometry(
            args.radiusTop,
            args.radiusBottom,
            args.height,
            args.options.segments || 16
          )
        : gpu.createBoxGeometry(args.radiusTop, args.height, args.radiusTop);
      return createMesh(
        geom,
        getCachedMaterial({ ...args.options, color: args.color }),
        args.position
      );
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
