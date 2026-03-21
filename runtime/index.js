// runtime/index.js
// Public entry point for the Nova64 runtime package

export { threeDApi } from './api-3d.js';
export { uiApi } from './ui.js';
export { logger } from './logger.js';

// Re-export sub-modules for tree-shaking
export * from './api-3d/materials.js';
export * from './api-3d/primitives.js';
export * from './api-3d/transforms.js';
export * from './api-3d/camera.js';
export * from './api-3d/lights.js';
export * from './api-3d/models.js';
export * from './api-3d/instancing.js';
export * from './api-3d/pbr.js';
export * from './api-3d/scene.js';

export * from './ui/text.js';
export * from './ui/panels.js';
export * from './ui/buttons.js';
export * from './ui/widgets.js';
