// runtime/api-3d.js
// Thin orchestrator — delegates to runtime/api-3d/*.js sub-modules
import * as THREE from 'three';
globalThis.THREE = THREE; // @deprecated — use the global `engine` adapter instead
import { initAdapter } from './engine-adapter.js';
import { materialsModule } from './backends/threejs/materials.js';
import { primitivesModule } from './backends/threejs/primitives.js';
import { transformsModule } from './backends/threejs/transforms.js';
import { cameraModule } from './backends/threejs/camera.js';
import { lightsModule } from './backends/threejs/lights.js';
import { modelsModule } from './backends/threejs/models.js';
import { instancingModule } from './backends/threejs/instancing.js';
import { pbrModule } from './backends/threejs/pbr.js';
import { sceneModule } from './backends/threejs/scene.js';
import { particlesModule } from './backends/threejs/particles.js';
import { tslModule } from './backends/threejs/tsl.js';
import { createThreeSurfaceApi } from './backends/threejs/surface.js';

export function threeDApi(gpu) {
  if (!gpu.getScene) return { exposeTo: () => {} };

  const scene = gpu.getScene();
  const camera = gpu.getCamera();
  const renderer = gpu.getRenderer();

  // Shared state — passed by reference into every sub-module
  const meshes = new Map();
  const mixers = new Map();
  const modelAnimations = new Map();
  const materialCache = new Map();
  const cartLights = new Map();
  const instancedMeshes = new Map();
  const lodObjects = new Map();
  const counters = { mesh: 0, light: 0, instance: 0, lod: 0 };

  // Build context — each module appends its exports so later modules can call earlier ones
  const ctx = {
    scene,
    camera,
    renderer,
    gpu,
    meshes,
    mixers,
    modelAnimations,
    materialCache,
    cartLights,
    instancedMeshes,
    lodObjects,
    counters,
  };

  Object.assign(ctx, materialsModule(ctx));
  Object.assign(ctx, primitivesModule(ctx));
  Object.assign(ctx, transformsModule(ctx));
  Object.assign(ctx, cameraModule(ctx));
  Object.assign(ctx, lightsModule(ctx));
  Object.assign(ctx, modelsModule(ctx));
  Object.assign(ctx, instancingModule(ctx));
  Object.assign(ctx, pbrModule(ctx));
  Object.assign(ctx, particlesModule(ctx));
  Object.assign(ctx, tslModule(ctx));
  Object.assign(ctx, sceneModule(ctx)); // last: uses late binding to call other modules

  // Wire engine adapter — provides carts with renderer-agnostic helpers
  initAdapter(gpu);

  return createThreeSurfaceApi({ ctx, scene, camera, renderer, gpu });
}
