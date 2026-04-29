// runtime/backends/babylon/primitives.js
// Material, geometry, and primitive mesh creation for Babylon.

import { Mesh, MeshBuilder } from '@babylonjs/core';

import { normalizePosition } from './common.js';
import { applyBabylonMaterialCompatibility, applyBabylonMeshCompatibility } from './compat.js';

export function createBabylonPrimitivesApi(self) {
  return {
    createN64Material(opts = {}) {
      const type =
        opts.material === 'holographic' || opts.material === 'emissive'
          ? 'standard'
          : (opts.material ?? 'standard');
      return self._adapter.createMaterial(type, {
        color: opts.color ?? 0xffffff,
        roughness: opts.roughness ?? 0.7,
        metalness: opts.metalness ?? 0,
        emissive: opts.emissive ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
        wireframe: opts.wireframe ?? false,
        flatShading: opts.flatShading ?? false,
      });
    },

    _addMesh(babylonMesh, material) {
      if (!babylonMesh) {
        console.error('[GpuBabylon] _addMesh called with null/undefined mesh');
        return null;
      }
      applyBabylonMeshCompatibility(babylonMesh);
      if (material) babylonMesh.material = applyBabylonMaterialCompatibility(material);
      babylonMesh.receiveShadows = true;
      const id = ++self._counter;
      self._meshes.set(id, babylonMesh);

      // Create a proxy that acts like an ID but also exposes mesh properties
      // This allows carts to use both `setPosition(meshId, ...)` AND `mesh.position.x`
      // Many carts assume createCube/createSphere return mesh objects with .position, .material, etc.
      const proxy = new Proxy(babylonMesh, {
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
          // Forward all other property access to the actual Babylon mesh
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

      // Also store proxy in meshes map so getMesh returns the proxy
      self._meshes.set(id, proxy);

      return proxy;
    },

    createBoxGeometry(w, h, d) {
      return Object.freeze({ __babylonGeometry: true, geometryType: 'box', w, h, d });
    },

    createSphereGeometry(r, segments = 8) {
      return Object.freeze({ __babylonGeometry: true, geometryType: 'sphere', r, segments });
    },

    createPlaneGeometry(width, height) {
      return Object.freeze({ __babylonGeometry: true, geometryType: 'plane', width, height });
    },

    createCylinderGeometry(rTop, rBottom, h, segments = 16) {
      return Object.freeze({
        __babylonGeometry: true,
        geometryType: 'cylinder',
        rTop,
        rBottom,
        h,
        segments,
      });
    },

    createConeGeometry(r, h, segments = 16) {
      return Object.freeze({ __babylonGeometry: true, geometryType: 'cone', r, h, segments });
    },

    createCapsuleGeometry(r, h, segments = 8) {
      return Object.freeze({ __babylonGeometry: true, geometryType: 'capsule', r, h, segments });
    },

    createTorusGeometry(radius, tube, radialSegments = 8, tubularSegments = 16) {
      return Object.freeze({
        __babylonGeometry: true,
        geometryType: 'torus',
        radius,
        tube,
        radialSegments,
        tubularSegments,
      });
    },

    createMesh(geometryDesc, material, position = [0, 0, 0]) {
      if (!geometryDesc) return null;

      const pos = normalizePosition(position);
      let mesh;
      const name = `nova64_mesh_${self._counter + 1}`;

      switch (geometryDesc.geometryType) {
        case 'box':
          mesh = MeshBuilder.CreateBox(
            name,
            {
              width: geometryDesc.w,
              height: geometryDesc.h,
              depth: geometryDesc.d,
              updatable: true,
            },
            self.scene
          );
          break;
        case 'sphere':
          mesh = MeshBuilder.CreateSphere(
            name,
            { diameter: geometryDesc.r * 2, segments: geometryDesc.segments },
            self.scene
          );
          break;
        case 'plane':
          mesh = MeshBuilder.CreatePlane(
            name,
            {
              width: geometryDesc.width,
              height: geometryDesc.height,
              sideOrientation: Mesh.DOUBLESIDE,
              updatable: true,
            },
            self.scene
          );
          break;
        case 'cylinder':
          mesh = MeshBuilder.CreateCylinder(
            name,
            {
              diameterTop: (geometryDesc.rTop ?? 1) * 2,
              diameterBottom: (geometryDesc.rBottom ?? 1) * 2,
              height: geometryDesc.h ?? 2,
              tessellation: geometryDesc.segments ?? 16,
            },
            self.scene
          );
          break;
        case 'cone':
          mesh = MeshBuilder.CreateCylinder(
            name,
            {
              diameterTop: 0,
              diameterBottom: (geometryDesc.r ?? 1) * 2,
              height: geometryDesc.h ?? 2,
              tessellation: geometryDesc.segments ?? 16,
            },
            self.scene
          );
          break;
        case 'capsule':
          mesh = MeshBuilder.CreateCapsule(
            name,
            {
              radius: geometryDesc.r ?? 0.5,
              height: geometryDesc.h ?? 2,
              tessellation: geometryDesc.segments ?? 8,
            },
            self.scene
          );
          break;
        case 'torus':
          mesh = MeshBuilder.CreateTorus(
            name,
            {
              diameter: (geometryDesc.radius ?? 1) * 2,
              thickness: (geometryDesc.tube ?? 0.3) * 2,
              tessellation: geometryDesc.tubularSegments ?? 16,
            },
            self.scene
          );
          break;
        default:
          mesh = MeshBuilder.CreateBox(name, { size: 1 }, self.scene);
      }

      if (!mesh) {
        console.error('[GpuBabylon] createMesh: MeshBuilder returned null');
        return null;
      }
      mesh.position.copyFrom(pos);
      return self._addMesh(mesh, material);
    },

    createCube(size = 1, color = 0xffffff, position = [0, 0, 0], options = {}) {
      return self.createMesh(
        self.createBoxGeometry(size, size, size),
        self.createN64Material({ color, ...options }),
        position
      );
    },

    createAdvancedCube(size = 1, materialOptions = {}, position = [0, 0, 0]) {
      return self.createMesh(
        self.createBoxGeometry(size, size, size),
        self.createN64Material(materialOptions),
        position
      );
    },

    createSphere(radius = 1, color = 0xffffff, position = [0, 0, 0], segments = 8, options = {}) {
      return self.createMesh(
        self.createSphereGeometry(radius, segments),
        self.createN64Material({ color, ...options }),
        position
      );
    },

    createAdvancedSphere(radius = 1, materialOptions = {}, position = [0, 0, 0], segments = 16) {
      return self.createMesh(
        self.createSphereGeometry(radius, segments),
        self.createN64Material(materialOptions),
        position
      );
    },

    createPlane(width = 1, height = 1, color = 0xffffff, position = [0, 0, 0], options = {}) {
      return self.createMesh(
        self.createPlaneGeometry(width, height),
        self.createN64Material({ color, ...options }),
        position
      );
    },

    createCylinder(
      rTop = 1,
      rBottom = 1,
      h = 2,
      color = 0xffffff,
      position = [0, 0, 0],
      options = {}
    ) {
      return self.createMesh(
        self.createCylinderGeometry(rTop, rBottom, h),
        self.createN64Material({ color, ...options }),
        position
      );
    },

    createCone(radius = 1, height = 2, color = 0xffffff, position = [0, 0, 0], options = {}) {
      return self.createMesh(
        self.createConeGeometry(radius, height),
        self.createN64Material({ color, ...options }),
        position
      );
    },

    createCapsule(radius = 0.5, height = 1, color = 0xffffff, position = [0, 0, 0], options = {}) {
      return self.createMesh(
        self.createCapsuleGeometry(radius, height, options.segments || 8),
        self.createN64Material({ color, ...options }),
        position
      );
    },

    createTorus(radius = 1, tube = 0.3, color = 0xffffff, position = [0, 0, 0], options = {}) {
      return self.createMesh(
        self.createTorusGeometry(
          radius,
          tube,
          options.radialSegments || 8,
          options.tubularSegments || 16
        ),
        self.createN64Material({ color, ...options }),
        position
      );
    },
  };
}
