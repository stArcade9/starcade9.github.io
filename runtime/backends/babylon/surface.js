// runtime/backends/babylon/surface.js
// Contract-driven cart-facing surface exposure for Babylon.

import { applyBackendSurface } from '../../shared/backend-surface.js';

export function createBabylonSurfaceApi(self) {
  return {
    exposeTo(target) {
      applyBackendSurface(target, self);
      Object.assign(target, {
        cls: c => self.cls(c),

        // TSL (Procedural Shader Materials)
        createTSLMaterial: self.createTSLMaterial,
        createTSLShaderMaterial: self.createTSLShaderMaterial,
        _updateTSLMaterials: self._updateTSLMaterials,

        // Convenience factories (Phase 1 Shader Pack)
        createLavaMaterial: self.createLavaMaterial,
        createVortexMaterial: self.createVortexMaterial,
        createPlasmaMaterial: self.createPlasmaMaterial,
        createWaterMaterial: self.createWaterMaterial,
        createHologramMaterial: self.createHologramMaterial,
        createShockwaveMaterial: self.createShockwaveMaterial,

        // TSL building blocks (stubs for Babylon - warn when used)
        tslFn: self.tslFn,
        tslUniform: self.tslUniform,
        tslFloat: self.tslFloat,
        tslInt: self.tslInt,
        tslVec2: self.tslVec2,
        tslVec3: self.tslVec3,
        tslVec4: self.tslVec4,
        tslColor: self.tslColor,
        tslSin: self.tslSin,
        tslCos: self.tslCos,
        tslMix: self.tslMix,
        tslStep: self.tslStep,
        tslSmoothstep: self.tslSmoothstep,
        tslClamp: self.tslClamp,
        tslFract: self.tslFract,
        tslFloor: self.tslFloor,
        tslAbs: self.tslAbs,
        tslPow: self.tslPow,
        tslHash: self.tslHash,
        tslUv: self.tslUv,
        tslTime: self.tslTime,
        tslPositionLocal: self.tslPositionLocal,
        tslPositionWorld: self.tslPositionWorld,
        tslNormalLocal: self.tslNormalLocal,
        tslNormalWorld: self.tslNormalWorld,
        tslLoop: self.tslLoop,
      });
    },
  };
}
