// runtime/api-3d/materials.js
// Material cache and full disposal utility

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
    const key = getMaterialKey(options);
    if (materialCache.has(key)) return materialCache.get(key);
    const material = gpu.createN64Material(options);
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
