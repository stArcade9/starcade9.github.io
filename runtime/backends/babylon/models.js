// runtime/backends/babylon/models.js
// Babylon backend model loaders.

import { MeshBuilder, TransformNode } from '@babylonjs/core';

import { normalizePosition } from './common.js';
import {
  applyBabylonMaterialCompatibility,
  applyBabylonMeshCompatibility,
  applyBabylonNodeCompatibility,
} from './compat.js';

export function createBabylonModelsApi(self) {
  return {
    async loadVoxModel(url, position = [0, 0, 0], scale = 1, options = {}) {
      const { VOXLoader } = await import('three/examples/jsm/loaders/VOXLoader.js');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch .vox file: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const loader = new VOXLoader();
      const result = loader.parse(buffer);
      const chunks = result?.chunks ?? [];
      if (chunks.length === 0) {
        throw new Error('No voxels found in .vox model');
      }

      const root = new TransformNode(`nova64_vox_${self._counter + 1}`, self.scene);
      root.position.copyFrom(normalizePosition(position));
      applyBabylonNodeCompatibility(root);

      if (typeof scale === 'number') {
        root.scaling.copyFromFloats(scale, scale, scale);
      } else if (Array.isArray(scale) && scale.length >= 3) {
        root.scaling.copyFromFloats(scale[0], scale[1], scale[2]);
      }

      const materialCache = new Map();
      const materialOptions = { ...options };
      if (materialOptions.material === 'n64') {
        materialOptions.material = 'standard';
      }
      delete materialOptions.color;

      let voxelCount = 0;
      for (const chunk of chunks) {
        const data = chunk?.data ?? [];
        const size = chunk?.size ?? { x: 0, y: 0, z: 0 };
        const palette = chunk?.palette ?? [];
        const originX = -(size.x / 2) + 0.5;
        const originZ = -(size.y / 2) + 0.5;

        for (let i = 0; i < data.length; i += 4) {
          const vx = data[i + 0];
          const vy = data[i + 1];
          const vz = data[i + 2];
          const colorIdx = data[i + 3];
          const paletteHex = palette[colorIdx] ?? 0xffffffff;
          const r = (paletteHex >> 0) & 0xff;
          const g = (paletteHex >> 8) & 0xff;
          const b = (paletteHex >> 16) & 0xff;
          const color = (r << 16) | (g << 8) | b;

          let material = materialCache.get(color);
          if (!material) {
            material = self.createN64Material({
              ...materialOptions,
              color,
            });
            materialCache.set(color, material);
          }

          const mesh = MeshBuilder.CreateBox(
            `${root.name}_voxel_${voxelCount}`,
            { size: 1 },
            self.scene
          );
          applyBabylonMeshCompatibility(mesh);
          mesh.parent = root;
          mesh.material = applyBabylonMaterialCompatibility(material);
          mesh.receiveShadows = true;
          mesh.position.copyFromFloats(originX + vx, vz + 0.5, originZ + vy);
          voxelCount++;
        }
      }

      if (voxelCount === 0) {
        root.dispose();
        throw new Error('No voxels found in .vox model');
      }

      const id = ++self._counter;
      self._meshes.set(id, applyBabylonNodeCompatibility(root));
      return id;
    },
  };
}
