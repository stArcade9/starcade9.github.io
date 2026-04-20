// runtime/api-3d.js
// Thin orchestrator — delegates to runtime/api-3d/*.js sub-modules
import * as THREE from 'three';
globalThis.THREE = THREE; // @deprecated — use the global `engine` adapter instead
import { engine, initAdapter } from './engine-adapter.js';
import { materialsModule } from './api-3d/materials.js';
import { primitivesModule } from './api-3d/primitives.js';
import { transformsModule } from './api-3d/transforms.js';
import { cameraModule } from './api-3d/camera.js';
import { lightsModule } from './api-3d/lights.js';
import { modelsModule } from './api-3d/models.js';
import { instancingModule } from './api-3d/instancing.js';
import { pbrModule } from './api-3d/pbr.js';
import { sceneModule } from './api-3d/scene.js';
import { particlesModule } from './api-3d/particles.js';
import { tslModule } from './api-3d/tsl.js';

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

  return {
    exposeTo(target) {
      Object.assign(target, {
        engine,
        // Primitive creation
        createCube: ctx.createCube,
        createSphere: ctx.createSphere,
        createCylinder: ctx.createCylinder,
        createPlane: ctx.createPlane,
        createAdvancedCube: ctx.createAdvancedCube,
        createAdvancedSphere: ctx.createAdvancedSphere,
        createTorus: ctx.createTorus,
        createCone: ctx.createCone,
        createCapsule: ctx.createCapsule,

        // Mesh management
        destroyMesh: ctx.destroyMesh,
        removeMesh: ctx.removeMesh,

        // Model and texture loading
        loadModel: ctx.loadModel,
        loadVoxModel: ctx.loadVoxModel,
        playAnimation: ctx.playAnimation,
        updateAnimations: ctx.updateAnimations,
        loadTexture: ctx.loadTexture,

        // Transforms
        setPosition: ctx.setPosition,
        setRotation: ctx.setRotation,
        setScale: ctx.setScale,
        getPosition: ctx.getPosition,
        getRotation: ctx.getRotation,
        rotateMesh: ctx.rotateMesh,
        moveMesh: ctx.moveMesh,

        // Mesh helpers
        setFlatShading: ctx.setFlatShading,
        setMeshVisible: ctx.setMeshVisible,
        setMeshOpacity: ctx.setMeshOpacity,
        setCastShadow: ctx.setCastShadow,
        setReceiveShadow: ctx.setReceiveShadow,

        // Camera
        setCameraPosition: ctx.setCameraPosition,
        setCameraTarget: ctx.setCameraTarget,
        setCameraLookAt: ctx.setCameraLookAt,
        setCameraFOV: ctx.setCameraFOV,

        // Scene / atmosphere
        setFog: ctx.setFog,
        clearFog: ctx.clearFog,
        setLightDirection: ctx.setLightDirection,
        setLightColor: ctx.setLightColor,
        setAmbientLight: ctx.setAmbientLight,
        setDirectionalLight: ctx.setDirectionalLight,
        clearScene: ctx.clearScene,

        // Effects
        enablePixelation: ctx.enablePixelation,
        enableDithering: ctx.enableDithering,

        // Dynamic lights
        createPointLight: ctx.createPointLight,
        setPointLightPosition: ctx.setPointLightPosition,
        setPointLightColor: ctx.setPointLightColor,
        removeLight: ctx.removeLight,

        // GPU instancing
        createInstancedMesh: ctx.createInstancedMesh,
        setInstanceTransform: ctx.setInstanceTransform,
        setInstanceColor: ctx.setInstanceColor,
        finalizeInstances: ctx.finalizeInstances,
        removeInstancedMesh: ctx.removeInstancedMesh,

        // LOD system
        createLODMesh: ctx.createLODMesh,
        setLODPosition: ctx.setLODPosition,
        removeLODMesh: ctx.removeLODMesh,
        updateLODs: ctx.updateLODs,

        // Normal / PBR maps
        loadNormalMap: ctx.loadNormalMap,
        setNormalMap: ctx.setNormalMap,
        setPBRMaps: ctx.setPBRMaps,
        setPBRProperties: ctx.setPBRProperties,

        // GPU particle system
        createParticleSystem: ctx.createParticleSystem,
        setParticleEmitter: ctx.setParticleEmitter,
        emitParticle: ctx.emitParticle,
        burstParticles: ctx.burstParticles,
        updateParticles: ctx.updateParticles,
        removeParticleSystem: ctx.removeParticleSystem,
        getParticleStats: ctx.getParticleStats,

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

        // Interaction / stats / convenience
        raycastFromCamera: ctx.raycastFromCamera,
        get3DStats: ctx.get3DStats,
        setupScene: ctx.setupScene,

        // Direct Three.js access for advanced users
        getScene: () => scene,
        getCamera: () => camera,
        getRenderer: () => renderer,
        getMesh: ctx.getMesh,
        // engine adapter already assigned above
      });
    },
  };
}
