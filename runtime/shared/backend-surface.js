// runtime/shared/backend-surface.js
// Shared backend surface contract for cart-facing 3D runtime APIs.

const REQUIRED_BACKEND_SURFACE_GROUPS = Object.freeze({
  core: Object.freeze(['engine', 'getBackendCapabilities']),
  primitives: Object.freeze([
    'createCube',
    'createAdvancedCube',
    'createSphere',
    'createAdvancedSphere',
    'createPlane',
    'createCylinder',
    'createCone',
  ]),
  meshes: Object.freeze([
    'destroyMesh',
    'removeMesh',
    'getMesh',
    'setPosition',
    'setRotation',
    'setScale',
    'getPosition',
    'getRotation',
    'rotateMesh',
    'moveMesh',
    'setMeshVisible',
  ]),
  camera: Object.freeze([
    'getScene',
    'getCamera',
    'getRenderer',
    'setCameraPosition',
    'setCameraTarget',
    'setCameraLookAt',
    'setCameraFOV',
  ]),
  lights: Object.freeze([
    'setAmbientLight',
    'setLightDirection',
    'setLightColor',
    'setDirectionalLight',
    'createPointLight',
    'setPointLightPosition',
    'setPointLightColor',
    'removeLight',
  ]),
  scene: Object.freeze([
    'setFog',
    'clearFog',
    'clearScene',
    'get3DStats',
    'enablePixelation',
    'enableDithering',
  ]),
  models: Object.freeze(['loadVoxModel']),
});

const CAPABILITY_GATED_BACKEND_SURFACE_GROUPS = Object.freeze({
  primitives: Object.freeze(['createTorus', 'createCapsule']),
  models: Object.freeze(['loadModel', 'playAnimation', 'updateAnimations', 'loadTexture']),
  meshOptions: Object.freeze([
    'setFlatShading',
    'setMeshOpacity',
    'setCastShadow',
    'setReceiveShadow',
  ]),
  instancing: Object.freeze([
    'createInstancedMesh',
    'setInstanceTransform',
    'setInstanceColor',
    'finalizeInstances',
    'removeInstancedMesh',
  ]),
  lod: Object.freeze(['createLODMesh', 'setLODPosition', 'removeLODMesh', 'updateLODs']),
  pbr: Object.freeze(['loadNormalMap', 'setNormalMap', 'setPBRMaps', 'setPBRProperties']),
  particles: Object.freeze([
    'createParticleSystem',
    'setParticleEmitter',
    'emitParticle',
    'burstParticles',
    'updateParticles',
    'removeParticleSystem',
    'getParticleStats',
  ]),
  effects: Object.freeze([
    'enableBloom',
    'disableBloom',
    'setBloomStrength',
    'setBloomRadius',
    'setBloomThreshold',
    'enableFXAA',
    'disableFXAA',
    'enableChromaticAberration',
    'disableChromaticAberration',
    'enableVignette',
    'disableVignette',
    'enableGlitch',
    'disableGlitch',
    'setGlitchIntensity',
    'setGlitchOptions',
    'enableRetroEffects',
    'disableRetroEffects',
    'enableSharpen',
    'disableSharpen',
    'enableGrain',
    'disableGrain',
  ]),
  utilities: Object.freeze(['raycastFromCamera', 'setupScene', 'setClearColor']),
});

function flattenGroups(groups) {
  return Object.freeze(
    Object.values(groups)
      .flatMap(keys => keys)
      .filter((key, index, list) => list.indexOf(key) === index)
  );
}

export const REQUIRED_BACKEND_SURFACE = REQUIRED_BACKEND_SURFACE_GROUPS;
export const CAPABILITY_GATED_BACKEND_SURFACE = CAPABILITY_GATED_BACKEND_SURFACE_GROUPS;
export const REQUIRED_BACKEND_SURFACE_KEYS = flattenGroups(REQUIRED_BACKEND_SURFACE_GROUPS);
export const CAPABILITY_GATED_BACKEND_SURFACE_KEYS = flattenGroups(
  CAPABILITY_GATED_BACKEND_SURFACE_GROUPS
);

function bindSurfaceKey(source, key) {
  const value = source[key];
  if (typeof value === 'function') return value.bind(source);
  return value;
}

export function collectBackendSurface(source, keys) {
  const surface = {};
  for (const key of keys) {
    if (!(key in source)) continue;
    surface[key] = bindSurfaceKey(source, key);
  }
  return surface;
}

export function applyBackendSurface(target, source, options = {}) {
  const includeCapability = options.includeCapability ?? true;
  const keys = includeCapability
    ? [...REQUIRED_BACKEND_SURFACE_KEYS, ...CAPABILITY_GATED_BACKEND_SURFACE_KEYS]
    : REQUIRED_BACKEND_SURFACE_KEYS;
  Object.assign(target, collectBackendSurface(source, keys));
  return target;
}

export function getMissingBackendSurfaceKeys(source, keys = REQUIRED_BACKEND_SURFACE_KEYS) {
  return keys.filter(key => !(key in source));
}
