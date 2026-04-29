// runtime/api-3d/lights.js
// Dynamic point lights created by carts at runtime

import * as THREE from 'three';

export function lightsModule({ scene, cartLights, counters }) {
  function normalizeVectorArgs(x, y, z) {
    if (Array.isArray(x)) return [x[0] ?? 0, x[1] ?? 0, x[2] ?? 0];
    if (x && typeof x === 'object') return [x.x ?? 0, x.y ?? 0, x.z ?? 0];
    return [x ?? 0, y ?? 0, z ?? 0];
  }

  function normalizePointLightArgs(distanceOrPosition, x, y, z) {
    if (
      Array.isArray(distanceOrPosition) ||
      (distanceOrPosition && typeof distanceOrPosition === 'object')
    ) {
      return { distance: 20, position: normalizeVectorArgs(distanceOrPosition) };
    }
    if (Array.isArray(x) || (x && typeof x === 'object')) {
      return {
        distance: typeof distanceOrPosition === 'number' ? distanceOrPosition : 20,
        position: normalizeVectorArgs(x, y, z),
      };
    }
    return {
      distance: typeof distanceOrPosition === 'number' ? distanceOrPosition : 20,
      position: normalizeVectorArgs(x, y, z),
    };
  }

  /**
   * Creates a dynamic point light in the 3D scene.
   * @param {number} [color=0xffffff] - Hex color
   * @param {number} [intensity=2] - Brightness multiplier
   * @param {number} [distance=20] - Max range (0 = infinite)
   * @param {number} [x=0] - World X position
   * @param {number} [y=0] - World Y position
   * @param {number} [z=0] - World Z position
   * @returns {number} Light ID
   */
  function createPointLight(
    color = 0xffffff,
    intensity = 2,
    distanceOrPosition = 20,
    x = 0,
    y = 0,
    z = 0
  ) {
    const { distance, position } = normalizePointLightArgs(distanceOrPosition, x, y, z);
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(position[0], position[1], position[2]);
    scene.add(light);
    const id = ++counters.light;
    cartLights.set(id, light);
    return id;
  }

  function setPointLightPosition(lightId, x, y, z) {
    const light = cartLights.get(lightId);
    if (!light) return false;
    const position = normalizeVectorArgs(x, y, z);
    light.position.set(position[0], position[1], position[2]);
    return true;
  }

  function setPointLightColor(lightId, color) {
    const light = cartLights.get(lightId);
    if (!light) return false;
    light.color.setHex(color);
    return true;
  }

  function removeLight(lightId) {
    const light = cartLights.get(lightId);
    if (!light) return false;
    scene.remove(light);
    if (light.shadow?.map) light.shadow.map.dispose();
    if (light.dispose) light.dispose();
    cartLights.delete(lightId);
    return true;
  }

  return { createPointLight, setPointLightPosition, setPointLightColor, removeLight };
}
