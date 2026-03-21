// runtime/api-3d/lights.js
// Dynamic point lights created by carts at runtime

import * as THREE from 'three';

export function lightsModule({ scene, cartLights, counters }) {
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
  function createPointLight(color = 0xffffff, intensity = 2, distance = 20, x = 0, y = 0, z = 0) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(x, y, z);
    scene.add(light);
    const id = ++counters.light;
    cartLights.set(id, light);
    return id;
  }

  function setPointLightPosition(lightId, x, y, z) {
    const light = cartLights.get(lightId);
    if (!light) return false;
    light.position.set(x, y, z);
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
