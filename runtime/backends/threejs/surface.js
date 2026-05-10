// runtime/backends/threejs/surface.js
// Contract-driven cart-facing surface exposure for the Three.js backend.

import { applyBackendSurface } from '../../shared/backend-surface.js';
import { engine } from '../../engine-adapter.js';
import { THREEJS_BACKEND_CAPABILITIES } from './capabilities.js';

function createThreeSurfaceSource(ctx, scene, camera, renderer, gpu) {
  return Object.assign({}, ctx, {
    engine,
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getBackendCapabilities: () => gpu.getBackendCapabilities?.() ?? THREEJS_BACKEND_CAPABILITIES,
  });
}

export function createThreeSurfaceApi({ ctx, scene, camera, renderer, gpu }) {
  const surfaceSource = createThreeSurfaceSource(ctx, scene, camera, renderer, gpu);

  return {
    exposeTo(target) {
      applyBackendSurface(target, surfaceSource);
      Object.assign(target, {
        // TSL (Three Shading Language)
        createTSLMaterial: ctx.createTSLMaterial,
        createTSLShaderMaterial: ctx.createTSLShaderMaterial,
        _updateTSLMaterials: ctx._updateTSLMaterials,
        // Convenience factories (Phase 1 Shader Pack)
        createLavaMaterial: ctx.createLavaMaterial,
        createVortexMaterial: ctx.createVortexMaterial,
        createPlasmaMaterial: ctx.createPlasmaMaterial,
        createWaterMaterial: ctx.createWaterMaterial,
        createHologramMaterial: ctx.createHologramMaterial,
        createShockwaveMaterial: ctx.createShockwaveMaterial,
        // TSL building blocks (prefixed with tsl*)
        tslFn: ctx.tslFn,
        tslUniform: ctx.tslUniform,
        tslFloat: ctx.tslFloat,
        tslInt: ctx.tslInt,
        tslVec2: ctx.tslVec2,
        tslVec3: ctx.tslVec3,
        tslVec4: ctx.tslVec4,
        tslColor: ctx.tslColor,
        tslSin: ctx.tslSin,
        tslCos: ctx.tslCos,
        tslMix: ctx.tslMix,
        tslStep: ctx.tslStep,
        tslSmoothstep: ctx.tslSmoothstep,
        tslClamp: ctx.tslClamp,
        tslFract: ctx.tslFract,
        tslFloor: ctx.tslFloor,
        tslAbs: ctx.tslAbs,
        tslPow: ctx.tslPow,
        tslHash: ctx.tslHash,
        tslUv: ctx.tslUv,
        tslTime: ctx.tslTime,
        tslPositionLocal: ctx.tslPositionLocal,
        tslPositionWorld: ctx.tslPositionWorld,
        tslNormalLocal: ctx.tslNormalLocal,
        tslNormalWorld: ctx.tslNormalWorld,
        tslLoop: ctx.tslLoop,
      });
    },
  };
}
