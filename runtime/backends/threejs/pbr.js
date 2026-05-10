// runtime/api-3d/pbr.js
// Normal maps, PBR roughness/metalness/AO maps

import * as THREE from 'three';

export function pbrModule({ meshes }) {
  const _texLoader = new THREE.TextureLoader();

  function loadNormalMap(url) {
    return new Promise((resolve, reject) => {
      _texLoader.load(
        url,
        texture => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          resolve(texture);
        },
        undefined,
        err => reject(err)
      );
    });
  }

  function _upgradeToStandard(mesh) {
    if (!mesh?.material) return;
    if (mesh.material.isMeshStandardMaterial) return;
    const old = mesh.material;
    const standard = new THREE.MeshStandardMaterial({
      color: old.color?.clone() ?? new THREE.Color(0xffffff),
      map: old.map ?? null,
      metalness: 0.0,
      roughness: 0.6,
      transparent: old.transparent ?? false,
      opacity: old.opacity ?? 1.0,
    });
    old.dispose();
    mesh.material = standard;
  }

  function setNormalMap(meshId, texture) {
    const mesh = meshes.get(meshId);
    if (!mesh) return false;
    _upgradeToStandard(mesh);
    mesh.material.normalMap = texture;
    mesh.material.needsUpdate = true;
    return true;
  }

  function setPBRMaps(meshId, maps = {}) {
    const mesh = meshes.get(meshId);
    if (!mesh) return false;
    _upgradeToStandard(mesh);
    const mat = mesh.material;
    if (maps.normalMap) {
      mat.normalMap = maps.normalMap;
    }
    if (maps.roughnessMap) {
      mat.roughnessMap = maps.roughnessMap;
    }
    if (maps.aoMap) {
      mat.aoMap = maps.aoMap;
    }
    if (maps.metalness !== undefined) mat.metalness = maps.metalness;
    if (maps.roughness !== undefined) mat.roughness = maps.roughness;
    mat.needsUpdate = true;
    return true;
  }

  /**
   * Set PBR scalar properties on a mesh without requiring texture maps.
   * Clones the material so the change only affects this specific mesh.
   *
   * @param {number} meshId - ID returned by createSphere / createCube etc.
   * @param {object} [opts]
   * @param {number} [opts.metalness]        - 0 (dielectric) → 1 (fully metallic)
   * @param {number} [opts.roughness]        - 0 (mirror-smooth) → 1 (fully rough)
   * @param {number} [opts.envMapIntensity]  - Strength of environment reflections
   * @param {number} [opts.color]            - Override surface colour (hex)
   * @returns {boolean} true on success
   */
  function setPBRProperties(meshId, opts = {}) {
    const mesh = meshes.get(meshId);
    if (!mesh) return false;

    // Replace with a fresh MeshStandardMaterial so we own it exclusively
    // (avoids mutating a shared cached material that other meshes may use)
    const old = mesh.material;
    mesh.material = new THREE.MeshStandardMaterial({
      color:
        opts.color !== undefined
          ? new THREE.Color(opts.color)
          : (old.color?.clone() ?? new THREE.Color(0xffffff)),
      map: old.map ?? null,
      metalness:
        opts.metalness !== undefined
          ? Math.max(0, Math.min(1, opts.metalness))
          : (old.metalness ?? 0.0),
      roughness:
        opts.roughness !== undefined
          ? Math.max(0, Math.min(1, opts.roughness))
          : (old.roughness ?? 0.6),
      envMapIntensity: opts.envMapIntensity ?? old.envMapIntensity ?? 1.0,
      emissive: old.emissive?.clone() ?? new THREE.Color(0),
      emissiveIntensity: old.emissiveIntensity ?? 0,
      transparent: old.transparent ?? false,
      opacity: old.opacity ?? 1.0,
      side: old.side ?? THREE.FrontSide,
    });
    mesh.material.needsUpdate = true;
    return true;
  }

  return { loadNormalMap, setNormalMap, setPBRMaps, setPBRProperties };
}
