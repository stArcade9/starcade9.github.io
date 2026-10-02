// runtime/api-3d/materials.js
// Material cache and full disposal utility

/**
 * Convert an rgba8() BigInt (RGBA64) or regular hex number to a Three.js-compatible
 * 24-bit hex integer (0xRRGGBB). Passes regular numbers through unchanged.
 * Needed because rgba8() returns a BigInt and JSON.stringify / THREE.Color
 * cannot handle BigInt values.
 */
export function normalizeColorToHex(c) {
  if (typeof c === 'bigint') {
    const r = Math.round(Number((c >> 48n) & 0xffffn) / 257);
    const g = Math.round(Number((c >> 32n) & 0xffffn) / 257);
    const b = Math.round(Number((c >> 16n) & 0xffffn) / 257);
    return (r << 16) | (g << 8) | b;
  }
  return typeof c === 'number' ? c : 0xffffff;
}

export function materialsModule({ gpu, materialCache }) {
  function getMaterialKey(options) {
    return JSON.stringify({
      material: options.material || 'standard',
      color: options.color || 0xffffff,
      emissive: options.emissive || 0x000000,
      metalness: options.metalness,
      roughness: options.roughness,
      transparent: options.transparent,
      opacity: options.opacity,
      wireframe: options.wireframe,
    });
  }

  function getCachedMaterial(options) {
    const normalized = {
      ...options,
      color: normalizeColorToHex(options.color ?? 0xffffff),
      ...(options.emissive !== undefined && { emissive: normalizeColorToHex(options.emissive) }),
    };
    const key = getMaterialKey(normalized);
    if (materialCache.has(key)) return materialCache.get(key);
    const material = gpu.createN64Material(normalized);
    materialCache.set(key, material);
    return material;
  }

  function disposeMaterial(material) {
    const textureProps = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'aoMap',
      'emissiveMap',
      'bumpMap',
      'displacementMap',
      'alphaMap',
      'lightMap',
      'envMap',
    ];
    textureProps.forEach(prop => {
      if (material[prop]?.dispose) material[prop].dispose();
    });
    material.dispose();
  }

  return { getMaterialKey, getCachedMaterial, disposeMaterial };
}
