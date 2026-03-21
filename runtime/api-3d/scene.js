// runtime/api-3d/scene.js
// clearScene, setupScene, raycasting, stats, N64 effects

import * as THREE from 'three';
import { logger } from '../logger.js';

export function sceneModule(ctx) {
  const {
    scene,
    camera,
    renderer,
    gpu,
    meshes,
    cartLights,
    materialCache,
    instancedMeshes,
    lodObjects,
  } = ctx;

  // These come from other modules — resolved at call-time via ctx
  function getDisposeMaterial() {
    return ctx.disposeMaterial;
  }
  function getRemoveLight() {
    return ctx.removeLight;
  }

  function clearScene() {
    const disposeMaterial = getDisposeMaterial();
    const removeLight = getRemoveLight();

    logger.info(
      '🧹 Clearing 3D scene... meshes:',
      meshes.size,
      'lights:',
      cartLights.size,
      'materials:',
      materialCache.size
    );

    // Dispose all cart meshes
    for (const [, mesh] of meshes) {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial);
        else disposeMaterial(mesh.material);
      }
    }
    meshes.clear();

    // Remove dynamic lights
    cartLights.forEach((_, id) => removeLight(id));
    cartLights.clear();

    // Flush material cache
    materialCache.forEach(disposeMaterial);
    materialCache.clear();

    // Remove any remaining scene children (e.g. from loadModel / direct additions)
    while (scene.children.length > 0) {
      const child = scene.children[0];
      scene.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(disposeMaterial);
        else disposeMaterial(child.material);
      }
    }

    // Re-add minimal default lighting so scenes aren't black
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7.5);
    scene.add(dir);

    // Reset animated mesh registry in GPU backend
    if (gpu.clearAnimatedMeshes) gpu.clearAnimatedMeshes();

    // Dispose instanced meshes
    for (const { mesh } of instancedMeshes.values()) {
      scene.remove(mesh);
      mesh.geometry?.dispose();
      mesh.material?.dispose();
    }
    instancedMeshes.clear();

    // Dispose LOD objects
    for (const lod of lodObjects.values()) {
      scene.remove(lod);
      for (const { object } of lod.levels) {
        object.geometry?.dispose();
        object.material?.dispose();
      }
    }
    lodObjects.clear();

    logger.info('✅ Scene cleared completely');
  }

  /**
   * setupScene(opts) — One-call scene configuration.
   * opts: { camera, light, fog, skybox, effects }
   */
  function setupScene(opts = {}) {
    const cam = opts.camera ?? {};
    ctx.setCameraPosition(cam.x ?? 0, cam.y ?? 5, cam.z ?? 10);
    ctx.setCameraTarget(cam.targetX ?? 0, cam.targetY ?? 0, cam.targetZ ?? 0);
    if (cam.fov) ctx.setCameraFOV(cam.fov);

    const light = opts.light ?? {};
    if (light.direction) {
      const d = light.direction;
      ctx.setLightDirection(d[0] ?? -0.3, d[1] ?? -1, d[2] ?? -0.5);
    }
    if (light.color !== undefined) ctx.setLightColor(light.color);
    if (light.ambient !== undefined) ctx.setAmbientLight(light.ambient);

    if (opts.fog && opts.fog !== false) {
      ctx.setFog(opts.fog.color ?? 0x000000, opts.fog.near ?? 10, opts.fog.far ?? 50);
    }

    if (opts.skybox && typeof globalThis.createSpaceSkybox === 'function') {
      globalThis.createSpaceSkybox(opts.skybox);
    }

    if (opts.effects && typeof globalThis.enableRetroEffects === 'function') {
      globalThis.enableRetroEffects(typeof opts.effects === 'object' ? opts.effects : {});
    }
  }

  function raycastFromCamera(x, y) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (x / renderer.domElement.clientWidth) * 2 - 1,
      -(y / renderer.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const objects = Array.from(meshes.values()).filter(m => m.type === 'Mesh');
    const hits = raycaster.intersectObjects(objects);
    if (hits.length > 0) {
      for (const [id, mesh] of meshes) {
        if (mesh === hits[0].object) {
          return { meshId: id, point: hits[0].point, distance: hits[0].distance };
        }
      }
    }
    return null;
  }

  function get3DStats() {
    return gpu.getStats();
  }
  function enablePixelation(factor = 2) {
    gpu.enablePixelation(factor);
  }
  function enableDithering(enabled = true) {
    gpu.enableDithering(enabled);
  }

  return {
    clearScene,
    setupScene,
    raycastFromCamera,
    get3DStats,
    enablePixelation,
    enableDithering,
  };
}
