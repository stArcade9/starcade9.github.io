// runtime/backends/babylon/camera.js
// Camera controls for the Babylon backend.

import { normalizeVectorArgs } from './common.js';

export function createBabylonCameraApi(self) {
  return {
    setCameraPosition(x, y, z) {
      const position = normalizeVectorArgs(x, y, z, 0);
      self.camera.position.copyFromFloats(position.x, position.y, position.z);
      self.camera.setTarget(self._cameraTarget);
    },

    setCameraTarget(x, y, z) {
      const target = normalizeVectorArgs(x, y, z, 0);
      self._cameraTarget.copyFromFloats(target.x, target.y, target.z);
      self.camera.setTarget(self._cameraTarget);
    },

    setCameraLookAt(x, y, z) {
      const lookAt = normalizeVectorArgs(x, y, z, 0);
      const isDirectionVector = Array.isArray(x) || (x && typeof x === 'object');
      if (isDirectionVector) {
        self._cameraTarget.copyFromFloats(
          self.camera.position.x + lookAt.x,
          self.camera.position.y + lookAt.y,
          self.camera.position.z + lookAt.z
        );
      } else {
        self._cameraTarget.copyFromFloats(lookAt.x, lookAt.y, lookAt.z);
      }
      self.camera.setTarget(self._cameraTarget);
    },

    setCameraFOV(fovDegrees) {
      self.camera.fov = (fovDegrees * Math.PI) / 180;
    },
  };
}
