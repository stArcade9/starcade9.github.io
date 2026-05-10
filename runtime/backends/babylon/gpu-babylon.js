// runtime/backends/babylon/gpu-babylon.js
// Babylon.js GPU backend composed from backend-specific modules.

import { initializeBabylonBackend } from './bootstrap.js';
import { createBabylonHudApi } from './hud.js';
import { createBabylonSceneApi } from './scene.js';
import { createBabylonPrimitivesApi } from './primitives.js';
import { createBabylonTransformsApi } from './transforms.js';
import { createBabylonCameraApi } from './camera.js';
import { createBabylonLightsApi } from './lights.js';
import { createBabylonModelsApi } from './models.js';
import { createBabylonSkyboxApi } from './skybox.js';
import { createBabylonPbrApi } from './pbr.js';
import { createBabylonInstancingApi } from './instancing.js';
import { createBabylonParticlesApi } from './particles.js';
import { createBabylonSurfaceApi } from './surface.js';
import { createBabylonVoxelApi } from './voxel.js';
import { createBabylonNoaPrototypeApi } from './noa-prototype.js';
import { createBabylonNoaAdapterApi } from './noa-adapter.js';
import { createBabylonEffectsApi } from './effects.js';
import { createBabylonTslApi } from './tsl.js';

export class GpuBabylon {
  constructor(canvas, w, h) {
    initializeBabylonBackend(this, canvas, w, h);

    Object.assign(
      this,
      createBabylonSceneApi(this),
      createBabylonHudApi(this),
      createBabylonPrimitivesApi(this),
      createBabylonTransformsApi(this),
      createBabylonCameraApi(this),
      createBabylonLightsApi(this),
      createBabylonModelsApi(this),
      createBabylonSkyboxApi(this),
      createBabylonPbrApi(this),
      createBabylonInstancingApi(this),
      createBabylonParticlesApi(this),
      createBabylonVoxelApi(this),
      createBabylonNoaPrototypeApi(this),
      createBabylonNoaAdapterApi(this),
      createBabylonEffectsApi(this),
      createBabylonTslApi(this),
      createBabylonSurfaceApi(this)
    );
  }
}
