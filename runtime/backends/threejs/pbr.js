// runtime/api-3d/pbr.js
// Normal maps, PBR roughness/metalness/AO maps

import * as THREE from 'three';
import { normalizeColorToHex } from './materials.js';

export function pbrModule({ meshes }) {
  const _texLoader = new THREE.TextureLoader();

  // createSphere/createCube return a mesh *proxy* on Three.js, not a number.
  // Looking that object up in the Map never matched, so setPBRProperties,
  // setPBRMaps and setNormalMap silently returned false for cart-created
  // meshes and every "PBR" surface stayed a flat Lambert material.
  function resolveMesh(idOrProxy) {
    if (typeof idOrProxy === 'number') return meshes.get(idOrProxy);
    if (idOrProxy && typeof idOrProxy === 'object') {
      if (typeof idOrProxy.__meshId === 'number') return meshes.get(idOrProxy.__meshId);
      const val = idOrProxy.valueOf?.();
      if (typeof val === 'number') return meshes.get(val);
    }
    return null;
  }

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
    const mesh = resolveMesh(meshId);
    if (!mesh) return false;
    _upgradeToStandard(mesh);
    mesh.material.normalMap = texture;
    mesh.material.needsUpdate = true;
    return true;
  }

  function setPBRMaps(meshId, maps = {}) {
    const mesh = resolveMesh(meshId);
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
   * Set PBR properties on a mesh without requiring texture maps. The mesh gets
   * its own MeshPhysicalMaterial (cached materials are shared between meshes),
   * so the change only affects this mesh. Anything not passed keeps the value
   * from the current material.
   *
   * Colours accept hex numbers or rgba8() BigInts.
   *
   * @param {number} meshId - ID returned by createSphere / createCube etc.
   * @param {object} [opts]
   * Core
   * @param {number} [opts.metalness]          0 (dielectric) → 1 (metal)
   * @param {number} [opts.roughness]          0 (mirror) → 1 (fully rough)
   * @param {number} [opts.envMapIntensity]    strength of environment reflections
   * @param {number} [opts.color]              surface colour
   * @param {number} [opts.emissive]           glow colour
   * @param {number} [opts.emissiveIntensity]
   * @param {number} [opts.opacity]            < 1 makes the surface translucent
   * Refraction (glass, gems, liquids)
   * @param {number} [opts.transmission]       0 → 1 light passing through (glass ≈ 1)
   * @param {number} [opts.ior]                index of refraction (water 1.33, glass 1.5, diamond 2.42)
   * @param {number} [opts.thickness]          volume thickness, bends the refraction
   * @param {number} [opts.dispersion]         rainbow fringes from splitting light (0 = none; 3–8 reads well on gems)
   * @param {number} [opts.attenuationColor]   tint picked up travelling through the volume
   * @param {number} [opts.attenuationDistance]
   * Coatings & special surfaces
   * @param {number} [opts.clearcoat]          lacquer layer (car paint ≈ 1)
   * @param {number} [opts.clearcoatRoughness]
   * @param {number} [opts.sheen]              velvet / cloth rim
   * @param {number} [opts.sheenColor]
   * @param {number} [opts.sheenRoughness]
   * @param {number} [opts.iridescence]        thin-film rainbow (soap bubble, oil)
   * @param {number} [opts.iridescenceIOR]
   * @param {number} [opts.anisotropy]         brushed-metal streaks (0 → 1)
   * @param {number} [opts.anisotropyRotation]
   * @param {number} [opts.specularIntensity]
   * @param {number} [opts.specularColor]
   * @returns {boolean} true on success
   */
  function setPBRProperties(meshId, opts = {}) {
    const mesh = resolveMesh(meshId);
    if (!mesh) return false;
    const old = mesh.material || {};
    const clamp01 = (v) => Math.max(0, Math.min(1, Number(v)));
    const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
    const col = (v, fallback) =>
      v !== undefined && v !== null ? new THREE.Color(normalizeColorToHex(v)) : fallback;

    const transmission = clamp01(num(opts.transmission, old.transmission ?? 0));
    const opacity = clamp01(num(opts.opacity, old.opacity ?? 1));
    const mat = new THREE.MeshPhysicalMaterial({
      color: col(opts.color, old.color?.clone() ?? new THREE.Color(0xffffff)),
      map: old.map ?? null,
      normalMap: old.normalMap ?? null,
      metalness: clamp01(num(opts.metalness, old.metalness ?? 0)),
      roughness: clamp01(num(opts.roughness, old.roughness ?? 0.6)),
      envMapIntensity: num(opts.envMapIntensity, old.envMapIntensity ?? 1),
      emissive: col(opts.emissive, old.emissive?.clone() ?? new THREE.Color(0)),
      emissiveIntensity: num(opts.emissiveIntensity, old.emissiveIntensity ?? 0),
      transmission,
      ior: Math.max(1, Math.min(2.333, num(opts.ior, old.ior ?? 1.5))),
      thickness: Math.max(0, num(opts.thickness, old.thickness ?? (transmission > 0 ? 1 : 0))),
      dispersion: Math.max(0, num(opts.dispersion, old.dispersion ?? 0)),
      attenuationColor: col(opts.attenuationColor, old.attenuationColor?.clone() ?? new THREE.Color(0xffffff)),
      attenuationDistance: num(opts.attenuationDistance, old.attenuationDistance ?? Infinity),
      clearcoat: clamp01(num(opts.clearcoat, old.clearcoat ?? 0)),
      clearcoatRoughness: clamp01(num(opts.clearcoatRoughness, old.clearcoatRoughness ?? 0)),
      sheen: clamp01(num(opts.sheen, old.sheen ?? 0)),
      sheenColor: col(opts.sheenColor, old.sheenColor?.clone() ?? new THREE.Color(0xffffff)),
      sheenRoughness: clamp01(num(opts.sheenRoughness, old.sheenRoughness ?? 1)),
      iridescence: clamp01(num(opts.iridescence, old.iridescence ?? 0)),
      iridescenceIOR: num(opts.iridescenceIOR, old.iridescenceIOR ?? 1.3),
      anisotropy: clamp01(num(opts.anisotropy, old.anisotropy ?? 0)),
      anisotropyRotation: num(opts.anisotropyRotation, old.anisotropyRotation ?? 0),
      specularIntensity: num(opts.specularIntensity, old.specularIntensity ?? 1),
      specularColor: col(opts.specularColor, old.specularColor?.clone() ?? new THREE.Color(0xffffff)),
      transparent: opacity < 1 || (old.transparent ?? false),
      opacity,
      side: old.side ?? THREE.FrontSide,
    });
    // The old material may be cached and shared with other meshes; don't dispose it.
    mesh.material = mat;
    mat.needsUpdate = true;
    return true;
  }

  return { loadNormalMap, setNormalMap, setPBRMaps, setPBRProperties };
}
