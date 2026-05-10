// runtime/backends/babylon/capabilities.js
// Explicit capability flags for the Babylon backend.

export const BABYLON_BACKEND_CAPABILITIES = Object.freeze({
  backend: 'babylon',
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
  dithering: false,
  animatedMeshes: false,
  pixelRatioRead: true,
  loadModel: false,
  loadTexture: false,
  playAnimation: false,
  pbrMaps: false,
  noaPrototype: true,
});

const warnedFeatures = new Set();

export function warnUnsupportedBabylonFeature(feature, message) {
  if (warnedFeatures.has(feature)) return;
  warnedFeatures.add(feature);
  console.warn(
    `[Nova64:WARN] ⚠️ ${message ?? `${feature} is not currently supported by the Babylon.js backend`}`
  );
}
