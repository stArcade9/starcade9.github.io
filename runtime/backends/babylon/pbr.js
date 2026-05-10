// PBR scalar material helpers for the Babylon backend.

import { PBRMaterial } from '@babylonjs/core';

import { warnUnsupportedBabylonFeature } from './capabilities.js';
import { hexToColor3 } from './common.js';
import { applyBabylonMaterialCompatibility } from './compat.js';

function clamp01(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function color3ToHex(color, fallback = 0xffffff) {
  if (!color) return fallback;
  return (
    ((Math.round((color.r ?? 1) * 255) & 0xff) << 16) |
    ((Math.round((color.g ?? 1) * 255) & 0xff) << 8) |
    (Math.round((color.b ?? 1) * 255) & 0xff)
  );
}

function getMeshTargets(root) {
  if (!root) return [];

  const targets = [];
  if ('material' in root) targets.push(root);
  if (typeof root.getChildMeshes === 'function') {
    targets.push(...root.getChildMeshes(false));
  }

  return targets.filter((mesh, index, list) => mesh && list.indexOf(mesh) === index);
}

function ensureOwnedPbrMaterial(self, mesh) {
  const current = mesh.material ?? null;

  if (current instanceof PBRMaterial) {
    if (current._nova64OwnedByMesh === true) return current;
    const cloned = current.clone(`${current.name ?? mesh.name ?? 'nova64'}_pbr`);
    cloned._nova64OwnedByMesh = true;
    mesh.material = applyBabylonMaterialCompatibility(cloned);
    return cloned;
  }

  const next = self._adapter.createMaterial('standard', {
    color: color3ToHex(current?.albedoColor ?? current?.diffuseColor),
    emissive: color3ToHex(current?.emissiveColor, 0x000000),
    roughness: clamp01(current?.roughness, 0.6),
    metalness: clamp01(current?.metallic ?? current?.metalness, 0.0),
    transparent: (current?.alpha ?? 1) < 1,
    opacity: current?.alpha ?? 1,
  });

  if (current?.albedoTexture) next.albedoTexture = current.albedoTexture;
  if (current?.diffuseTexture) next.albedoTexture = current.diffuseTexture;
  if (current?.emissiveTexture) next.emissiveTexture = current.emissiveTexture;
  next._nova64OwnedByMesh = true;
  mesh.material = next;
  return next;
}

export function createBabylonPbrApi(self) {
  return {
    async loadNormalMap(url) {
      void url;
      warnUnsupportedBabylonFeature(
        'pbr-maps',
        'PBR texture maps are not fully supported by the Babylon.js backend yet'
      );
      return null;
    },

    setNormalMap(meshId, texture) {
      void meshId;
      void texture;
      warnUnsupportedBabylonFeature(
        'pbr-maps',
        'PBR texture maps are not fully supported by the Babylon.js backend yet'
      );
      return false;
    },

    setPBRMaps(meshId, maps = {}) {
      void meshId;
      void maps;
      warnUnsupportedBabylonFeature(
        'pbr-maps',
        'PBR texture maps are not fully supported by the Babylon.js backend yet'
      );
      return false;
    },

    setPBRProperties(meshId, opts = {}) {
      const root = self._meshes.get(meshId);
      const targets = getMeshTargets(root);
      if (targets.length === 0) return false;

      for (const mesh of targets) {
        const material = ensureOwnedPbrMaterial(self, mesh);
        if (!material) continue;

        if (opts.color !== undefined) material.albedoColor = hexToColor3(opts.color);
        if (opts.emissive !== undefined) material.emissiveColor = hexToColor3(opts.emissive);
        if (opts.metalness !== undefined) {
          material.metallic = clamp01(opts.metalness, material.metallic ?? 0);
        }
        if (opts.roughness !== undefined) {
          material.roughness = clamp01(opts.roughness, material.roughness ?? 0.6);
        }
        if (opts.envMapIntensity !== undefined) {
          material.environmentIntensity = Math.max(0, Number(opts.envMapIntensity) || 0);
        }
        if (opts.opacity !== undefined) {
          material.alpha = clamp01(opts.opacity, material.alpha ?? 1);
        }
      }

      return true;
    },
  };
}
