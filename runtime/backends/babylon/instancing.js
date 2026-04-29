// runtime/backends/babylon/instancing.js
// Thin-instance support and LOD helpers for the Babylon backend.

import {
  Matrix,
  MeshBuilder,
  Quaternion,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

import { hexToColor3, normalizePosition, normalizeVectorArgs } from './common.js';
import { applyBabylonMaterialCompatibility, applyBabylonMeshCompatibility } from './compat.js';

function createLodLevelMesh(self, lodId, levelIndex, level = {}) {
  const { shape = 'cube', size = 1, color = 0xffffff, options = {} } = level;
  const name = `lod_${lodId}_level_${levelIndex}`;
  let mesh;

  switch (shape) {
    case 'sphere':
      mesh = MeshBuilder.CreateSphere(
        name,
        { diameter: size * 2, segments: options.segments || 8 },
        self.scene
      );
      break;
    case 'plane':
      mesh = MeshBuilder.CreatePlane(
        name,
        { width: size, height: options.height || size },
        self.scene
      );
      break;
    case 'cylinder':
      mesh = MeshBuilder.CreateCylinder(
        name,
        {
          diameterTop: size,
          diameterBottom: size,
          height: options.height || size * 2,
          tessellation: options.segments || 8,
        },
        self.scene
      );
      break;
    case 'cone':
      mesh = MeshBuilder.CreateCylinder(
        name,
        {
          diameterTop: 0,
          diameterBottom: size,
          height: options.height || size * 2,
          tessellation: options.segments || 8,
        },
        self.scene
      );
      break;
    case 'cube':
    default:
      mesh = MeshBuilder.CreateBox(name, { size }, self.scene);
      break;
  }

  mesh.material = self.createN64Material({ color, ...options });
  mesh.receiveShadows = true;
  mesh.castShadow = true;
  return mesh;
}

function updateSingleLod(self, entry) {
  if (!entry || entry.levels.length === 0) return;

  const rootPosition = entry.root.getAbsolutePosition?.() ?? entry.root.position;
  const distance = Vector3.Distance(self.camera.position, rootPosition);
  let nextIndex = 0;

  for (let i = 0; i < entry.levels.length; i++) {
    if (distance >= entry.levels[i].distance) nextIndex = i;
    else break;
  }

  if (entry.activeIndex === nextIndex) return;
  entry.activeIndex = nextIndex;
  entry.levels.forEach((level, index) => {
    level.mesh.isVisible = index === nextIndex;
  });
}

export function createBabylonInstancingApi(self) {
  return {
    createInstancedMesh(shape = 'cube', count = 100, color = 0xffffff, options = {}) {
      const {
        size = 1,
        width = 1,
        height = 1,
        segments = 6,
        roughness = 0.7,
        metalness = 0.0,
        emissive = 0x000000,
        emissiveIntensity = 1.0,
      } = options;

      let baseMesh;
      const meshName = `instancedMesh_${++self._counter}`;

      switch (shape) {
        case 'sphere':
          baseMesh = MeshBuilder.CreateSphere(
            meshName,
            { diameter: size * 2, segments },
            self.scene
          );
          break;
        case 'plane':
          baseMesh = MeshBuilder.CreatePlane(meshName, { width, height }, self.scene);
          break;
        case 'cylinder':
          baseMesh = MeshBuilder.CreateCylinder(
            meshName,
            { diameter: size * 2, height: height || 2, tessellation: 16 },
            self.scene
          );
          break;
        case 'cone':
          baseMesh = MeshBuilder.CreateCylinder(
            meshName,
            { diameterTop: 0, diameterBottom: size * 2, height: height || 2, tessellation: 16 },
            self.scene
          );
          break;
        case 'cube':
        default:
          baseMesh = MeshBuilder.CreateBox(meshName, { size }, self.scene);
      }

      const mat = new StandardMaterial(`${meshName}_mat`, self.scene);
      mat.diffuseColor = hexToColor3(color);
      mat.roughness = roughness;
      mat.metallic = metalness;
      mat.emissiveColor = hexToColor3(emissive);
      if (emissive !== 0x000000) {
        mat.emissiveColor.scaleInPlace(emissiveIntensity);
      }

      baseMesh.material = mat;
      applyBabylonMaterialCompatibility(mat);
      applyBabylonMeshCompatibility(baseMesh);
      baseMesh.isVisible = false;
      baseMesh.thinInstanceEnablePicking = false;

      const bufferMatrices = new Float32Array(16 * count);
      baseMesh.thinInstanceSetBuffer('matrix', bufferMatrices, 16);

      const instanceId = self._counter;
      self._instancedMeshes.set(instanceId, {
        mesh: baseMesh,
        count,
        currentIndex: 0,
        matrices: bufferMatrices,
        colors: new Float32Array(4 * count),
        hasColors: false,
      });
      self._meshes.set(instanceId, baseMesh);
      return instanceId;
    },

    setInstanceTransform(
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
      const entry = self._instancedMeshes.get(instancedId);
      if (!entry || index < 0 || index >= entry.count) return false;

      const matrix = Matrix.Compose(
        new Vector3(sx, sy, sz),
        Quaternion.RotationYawPitchRoll(ry, rx, rz),
        new Vector3(x, y, z)
      );
      matrix.copyToArray(entry.matrices, index * 16);
      entry.mesh.thinInstanceBufferUpdated('matrix');
      return true;
    },

    setInstanceColor(instancedId, index, color) {
      const entry = self._instancedMeshes.get(instancedId);
      if (!entry || index < 0 || index >= entry.count) return false;

      const c = hexToColor3(color);
      const offset = index * 4;
      entry.colors[offset] = c.r;
      entry.colors[offset + 1] = c.g;
      entry.colors[offset + 2] = c.b;
      entry.colors[offset + 3] = 1.0;
      entry.hasColors = true;
      return true;
    },

    finalizeInstances(instancedId) {
      const entry = self._instancedMeshes.get(instancedId);
      if (!entry) return false;
      entry.mesh.thinInstanceBufferUpdated('matrix');
      if (entry.hasColors) {
        entry.mesh.thinInstanceSetBuffer('color', entry.colors, 4);
      }
      return true;
    },

    removeInstancedMesh(instancedId) {
      const entry = self._instancedMeshes.get(instancedId);
      if (!entry) return false;
      entry.mesh.dispose();
      self._instancedMeshes.delete(instancedId);
      self._meshes.delete(instancedId);
      return true;
    },

    createLODMesh(levels = [], position = [0, 0, 0]) {
      const lodId = ++self._counter;
      const root = new TransformNode(`lod_${lodId}`, self.scene);
      root.position.copyFrom(normalizePosition(position));

      const sortedLevels = [...levels].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
      const levelEntries = sortedLevels.map((level, index) => {
        const mesh = createLodLevelMesh(self, lodId, index, level);
        mesh.parent = root;
        mesh.isVisible = false;
        return {
          mesh,
          distance: Number(level.distance) || 0,
        };
      });

      const entry = {
        root,
        levels: levelEntries,
        activeIndex: -1,
      };

      self._lodObjects.set(lodId, entry);
      self._meshes.set(lodId, root);
      updateSingleLod(self, entry);
      return lodId;
    },

    setLODPosition(lodId, x, y, z) {
      const entry = self._lodObjects.get(lodId);
      if (!entry) return false;
      const position = normalizeVectorArgs(x, y, z, 0);
      entry.root.position.copyFromFloats(position.x, position.y, position.z);
      updateSingleLod(self, entry);
      return true;
    },

    removeLODMesh(lodId) {
      const entry = self._lodObjects.get(lodId);
      if (!entry) return false;
      for (const level of entry.levels) {
        level.mesh.material?.dispose?.();
      }
      entry.root.dispose?.();
      self._lodObjects.delete(lodId);
      self._meshes.delete(lodId);
      return true;
    },

    updateLODs() {
      self._lodObjects.forEach(entry => updateSingleLod(self, entry));
    },
  };
}
