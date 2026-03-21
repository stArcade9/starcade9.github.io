// runtime/api-3d/camera.js
// Camera controls, fog, and scene lighting helpers

import * as THREE from 'three';

export function cameraModule({ scene, camera, gpu }) {
  function setCameraPosition(x, y, z) {
    gpu.setCameraPosition(x, y, z);
  }
  function setCameraTarget(x, y, z) {
    gpu.setCameraTarget(x, y, z);
  }
  function setCameraFOV(fov) {
    gpu.setCameraFOV(fov);
  }

  function setCameraLookAt(direction) {
    if (Array.isArray(direction) && direction.length >= 3) {
      camera.lookAt(
        camera.position.x + direction[0],
        camera.position.y + direction[1],
        camera.position.z + direction[2]
      );
    } else if (typeof direction === 'object' && direction.x !== undefined) {
      camera.lookAt(
        camera.position.x + direction.x,
        camera.position.y + direction.y,
        camera.position.z + direction.z
      );
    }
  }

  function setFog(color, near = 10, far = 50) {
    gpu.setFog(color, near, far);
  }
  function clearFog() {
    if (scene) scene.fog = null;
  }
  function setLightDirection(x, y, z) {
    gpu.setLightDirection(x, y, z);
  }
  function setLightColor(color) {
    if (gpu.setLightColor) gpu.setLightColor(color);
  }
  function setAmbientLight(color, intensity) {
    if (gpu.setAmbientLight) gpu.setAmbientLight(color, intensity);
  }

  function setDirectionalLight(direction, color = 0xffffff, intensity = 1.0) {
    const toRemove = scene.children.filter(c => c.type === 'DirectionalLight');
    toRemove.forEach(l => scene.remove(l));
    const light = new THREE.DirectionalLight(color, intensity);
    if (Array.isArray(direction) && direction.length >= 3) {
      light.position.set(direction[0], direction[1], direction[2]);
    } else {
      light.position.set(1, 2, 1);
    }
    scene.add(light);
  }

  return {
    setCameraPosition,
    setCameraTarget,
    setCameraFOV,
    setCameraLookAt,
    setFog,
    clearFog,
    setLightDirection,
    setLightColor,
    setAmbientLight,
    setDirectionalLight,
  };
}
