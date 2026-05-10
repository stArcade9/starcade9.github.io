// runtime/index.js
// Public entry point for the Nova64 runtime package

export { threeDApi } from './api-3d.js';
export { uiApi } from './ui.js';
export { logger } from './logger.js';
export {
  engine,
  initAdapter,
  createThreeEngineAdapter,
  createUnityBridgeAdapter,
  createCommandBufferAdapter,
  setEngineAdapter,
  installUnityBridge,
  resetEngineAdapter,
  ADAPTER_CONTRACT_VERSION,
} from './engine-adapter.js';
export { createBabylonEngineAdapter } from './engine-adapter-babylon.js';
export { GpuBabylon } from './gpu-babylon.js';

// Re-export sub-modules for tree-shaking (direct backend imports)
export * from './backends/threejs/materials.js';
export * from './backends/threejs/primitives.js';
export * from './backends/threejs/transforms.js';
export * from './backends/threejs/camera.js';
export * from './backends/threejs/lights.js';
export * from './backends/threejs/models.js';
export * from './backends/threejs/instancing.js';
export * from './backends/threejs/pbr.js';
export * from './backends/threejs/scene.js';
export * from './backends/threejs/particles.js';
export * from './backends/threejs/tsl.js';

export * from './ui/text.js';
export * from './ui/panels.js';
export * from './ui/buttons.js';
export * from './ui/widgets.js';
