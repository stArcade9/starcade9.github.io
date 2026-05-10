// runtime/backends/threejs/capabilities.js
// Explicit capability flags for the Three.js backend.

export const THREEJS_BACKEND_CAPABILITIES = Object.freeze({
  backend: 'threejs',
  cameraAccess: true,
  engineAdapter: true,
  rendererAccess: true,
  pointLights: true,
  instancing: true,
  lod: true,
  voxModels: true,
  raycast: true,
  sceneSetup: true,
  pbrProperties: true,
  skybox: true,
  particles: true,
  dithering: true,
  animatedMeshes: true,
  pixelRatioRead: true,
  loadModel: true,
  loadTexture: true,
  playAnimation: true,
  pbrMaps: true,
});
