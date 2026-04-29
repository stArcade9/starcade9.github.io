// runtime/backends/babylon/scene.js
// Scene, fog, render loop, and backend lifecycle methods for Babylon.

import { Color4, Scene, Vector3 } from '@babylonjs/core';

import { BABYLON_BACKEND_CAPABILITIES, warnUnsupportedBabylonFeature } from './capabilities.js';
import { setupDefaultLights } from './bootstrap.js';
import { hexToColor3 } from './common.js';

function logRenderDebug(self) {
  console.log('[GpuBabylon:DEBUG]', {
    frame: self._debugFrameCount,
    drawCalls: self.renderer.drawCalls ?? 0,
    meshes: self._meshes.size,
    sceneMeshes: self.scene.meshes.length,
    activeMeshes: self.scene.getActiveMeshes().length,
    camera: {
      x: self.camera.position.x,
      y: self.camera.position.y,
      z: self.camera.position.z,
    },
  });
}

export function createBabylonSceneApi(self) {
  return {
    getFramebuffer() {
      return self.fb;
    },

    supportsSpriteBatch() {
      return false;
    },

    getScene() {
      return self.scene;
    },

    getCamera() {
      return self.camera;
    },

    getRenderer() {
      return self.renderer;
    },

    getBackendCapabilities() {
      return self.backendCapabilities;
    },

    setClearColor(color) {
      const r = ((color >> 16) & 0xff) / 255;
      const g = ((color >> 8) & 0xff) / 255;
      const b = (color & 0xff) / 255;
      self.scene.clearColor = new Color4(r, g, b, 1);
    },

    resize(w, h) {
      self.w = w;
      self.h = h;
      self.canvas.width = w;
      self.canvas.height = h;
      if (self._hudCanvas) {
        self._hudCanvas.width = w;
        self._hudCanvas.height = h;
      }
      self.fb.resize(w, h);
      self._fbImageData = null;
      self.renderer.resize();
    },

    beginFrame() {
      self.fb.fill(0, 0, 0, 0);
      self._hudCtx?.clearRect(0, 0, self.w, self.h);
    },

    endFrame() {
      self._debugFrameCount++;
      self.scene.render();
      if (
        self._debugEnabled &&
        (self._debugFrameCount === 1 || self._debugFrameCount % 120 === 0)
      ) {
        logRenderDebug(self);
      }
      self._compositeFramebuffer?.();
      self.stats.drawCalls = self.renderer.drawCalls ?? 0;
    },

    update(dt) {
      // Update effects (glitch time, etc.)
      if (typeof self.updateEffects === 'function') {
        self.updateEffects(dt);
      }
      // Update TSL animated materials (uTime uniform)
      if (typeof self._updateTSLMaterials === 'function') {
        self._updateTSLMaterials(dt);
      }
      // Update skybox animation
      if (typeof self.tickSkybox === 'function') {
        self.tickSkybox(dt);
      }
    },

    render() {
      self.scene.render();
    },

    get3DStats() {
      return {
        triangles: self.stats.triangles,
        drawCalls: self.renderer.drawCalls ?? 0,
        meshes: self._meshes.size,
        backend: 'babylon',
      };
    },

    setFog(color = 0x000000, near = 10, far = 100) {
      self.scene.fogMode = Scene.FOGMODE_LINEAR;
      self.scene.fogColor = hexToColor3(color);
      self.scene.fogStart = near;
      self.scene.fogEnd = far;
    },

    clearFog() {
      self.scene.fogMode = Scene.FOGMODE_NONE;
    },

    clearScene() {
      self.clearSkybox?.();
      self._meshes.forEach(mesh => mesh.dispose?.());
      self._meshes.clear();
      self._instancedMeshes?.clear?.();
      self._lodObjects?.clear?.();
      self._particleSystems?.clear?.();
      self._cartLights.forEach(light => light.dispose?.());
      self._cartLights.clear();
      setupDefaultLights(self);
      self._hudCtx?.clearRect(0, 0, self.w, self.h);
    },

    clearAnimatedMeshes() {
      warnUnsupportedBabylonFeature(
        'animated-meshes',
        'Animated mesh registry reset is not used by the Babylon.js backend'
      );
      return false;
    },

    enablePixelation(factor = 2) {
      self.renderer.setHardwareScalingLevel(factor <= 0 ? 1 : factor);
    },

    enableDithering(_enabled = true) {
      if (!BABYLON_BACKEND_CAPABILITIES.dithering) {
        warnUnsupportedBabylonFeature(
          'dithering',
          'Dithering is not supported with the Babylon.js backend'
        );
      }
      return false;
    },

    setupScene(opts = {}) {
      const cam = opts.camera ?? {};
      self.setCameraPosition(cam.x ?? 0, cam.y ?? 5, cam.z ?? 10);
      self.setCameraTarget(cam.targetX ?? 0, cam.targetY ?? 0, cam.targetZ ?? 0);
      if (cam.fov) self.setCameraFOV(cam.fov);

      const light = opts.light ?? {};
      if (light.direction) {
        const d = light.direction;
        self.setLightDirection(d[0] ?? -0.3, d[1] ?? -1, d[2] ?? -0.5);
      }
      if (light.color !== undefined) self.setLightColor(light.color);
      if (light.ambient !== undefined) self.setAmbientLight(light.ambient);

      if (opts.fog && opts.fog !== false) {
        self.setFog(opts.fog.color ?? 0x000000, opts.fog.near ?? 10, opts.fog.far ?? 50);
      }

      if (opts.skybox && typeof globalThis.createSpaceSkybox === 'function') {
        globalThis.createSpaceSkybox(opts.skybox);
      }

      if (opts.effects && typeof globalThis.enableRetroEffects === 'function') {
        globalThis.enableRetroEffects(typeof opts.effects === 'object' ? opts.effects : {});
      }
    },

    raycastFromCamera(x, y) {
      const registeredMeshes = [...self._meshes.values()];
      const hit = self.scene.pick(x, y, mesh => {
        let current = mesh;
        while (current) {
          if (registeredMeshes.includes(current)) return true;
          current = current.parent;
        }
        return false;
      });

      if (!hit?.pickedMesh) return null;

      for (const [meshId, mesh] of self._meshes) {
        let current = hit.pickedMesh;
        while (current) {
          if (current === mesh) {
            return {
              meshId,
              point: hit.pickedPoint ?? new Vector3(0, 0, 0),
              distance: hit.distance ?? 0,
            };
          }
          current = current.parent;
        }
      }

      return null;
    },

    getPixelRatio() {
      const scaling = self.renderer.getHardwareScalingLevel?.() ?? 1;
      return scaling > 0 ? 1 / scaling : 1;
    },
  };
}
