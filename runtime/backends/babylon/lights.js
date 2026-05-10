// runtime/backends/babylon/lights.js
// Dynamic light controls for the Babylon backend.

import { DirectionalLight, PointLight, Vector3 } from '@babylonjs/core';
import { hexToColor3, normalizePointLightArgs, normalizeVectorArgs } from './common.js';
import {
  applyBabylonLightCompatibility,
  setBabylonDirectionalLightFromPosition,
} from './compat.js';

export function createBabylonLightsApi(self) {
  return {
    setAmbientLight(color = 0x404040, intensity = 1) {
      // Babylon lighting needs to be boosted to match Three.js visual parity
      // Three.js uses AmbientLight + HemisphereLight separately
      const col3 = hexToColor3(color);
      const adjustedIntensity = Math.max(intensity, 0);

      // Set scene ambient color (affects materials with ambientColor)
      if (self.scene) {
        self.scene.ambientColor = col3.scale(adjustedIntensity);
      }

      // Update hemisphere light to provide fill lighting
      if (self._hemisphereLight) {
        self._hemisphereLight.diffuse = col3;
        // Boost hemisphere intensity to compensate for Babylon's different lighting model
        self._hemisphereLight.intensity = adjustedIntensity * 1.2;
        self._hemisphereLight.groundColor = col3.scale(0.3);
      }
    },

    setLightDirection(x, y, z) {
      if (!self._mainLight) return;
      setBabylonDirectionalLightFromPosition(self._mainLight, normalizeVectorArgs(x, y, z, 0));
    },

    setLightColor(color = 0xffffff) {
      if (!self._mainLight) return;
      self._mainLight.diffuse = hexToColor3(color);
    },

    createPointLight(
      color = 0xffffff,
      intensity = 1,
      distanceOrPosition = 20,
      x = 0,
      y = 5,
      z = 0
    ) {
      const { distance, position } = normalizePointLightArgs(distanceOrPosition, x, y, z);
      const id = `pointLight_${Date.now()}`;
      const light = new PointLight(id, new Vector3(position.x, position.y, position.z), self.scene);
      light.diffuse = hexToColor3(color);
      light.intensity = intensity;
      if (distance > 0) light.range = distance;
      applyBabylonLightCompatibility(light);
      const lightId = ++self._counter;
      self._cartLights.set(lightId, light);
      return lightId;
    },

    setPointLightPosition(lightId, x, y, z) {
      const light = self._cartLights.get(lightId);
      if (!light || !(light instanceof PointLight)) return false;
      const position = normalizeVectorArgs(x, y, z, 0);
      light.position.copyFromFloats(position.x, position.y, position.z);
      return true;
    },

    setPointLightColor(lightId, color = 0xffffff, intensity) {
      const light = self._cartLights.get(lightId);
      if (!light) return false;
      light.diffuse = hexToColor3(color);
      if (intensity !== undefined) light.intensity = intensity;
      return true;
    },

    removeLight(lightId) {
      const light = self._cartLights.get(lightId);
      if (!light) return false;
      light.dispose();
      self._cartLights.delete(lightId);
      return true;
    },

    setDirectionalLight(direction, color = 0xffffff, intensity = 1.0) {
      self._cartLights.forEach((light, id) => {
        if (light instanceof DirectionalLight) {
          light.dispose();
          self._cartLights.delete(id);
        }
      });

      const light =
        self._mainLight ?? new DirectionalLight('main', new Vector3(-1, -2, -1), self.scene);
      self._mainLight = light;
      light.diffuse = hexToColor3(color);
      // Boost intensity to match Three.js lighting model
      light.intensity = intensity * 1.5;
      applyBabylonLightCompatibility(light);

      if (Array.isArray(direction) && direction.length >= 3) {
        setBabylonDirectionalLightFromPosition(light, direction);
      } else if (direction && typeof direction === 'object') {
        setBabylonDirectionalLightFromPosition(light, direction);
      } else {
        setBabylonDirectionalLightFromPosition(light, { x: 1, y: 2, z: 1 });
      }

      return 0;
    },
  };
}
