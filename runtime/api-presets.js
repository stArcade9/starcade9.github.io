// runtime/api-presets.js
// One-call visual style presets for Nova64 — no new engine code required,
// each function is a curated combination of existing effects API calls.

export function presetsApi(gpu) {
  // Internal: apply flat shading to every mesh currently in the scene
  function _flatShadeMeshes() {
    if (!gpu || !gpu.scene) return;
    gpu.scene.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material.flatShading = true;
        obj.material.needsUpdate = true;
      }
    });
  }

  function _smoothShadeMeshes() {
    if (!gpu || !gpu.scene) return;
    gpu.scene.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material.flatShading = false;
        obj.material.needsUpdate = true;
      }
    });
  }

  /**
   * Nintendo 64 aesthetic: no bloom, crisp FXAA, flat vignette edge,
   * and flat shading on all scene meshes.
   */
  function enableN64Mode() {
    const g = globalThis;
    if (typeof g.disableBloom === 'function') g.disableBloom();
    if (typeof g.enableFXAA === 'function') g.enableFXAA();
    if (typeof g.disableVignette === 'function') g.disableVignette();
    if (typeof g.disableChromaticAberration === 'function') g.disableChromaticAberration();
    _flatShadeMeshes();
  }

  /**
   * PlayStation 1 aesthetic: soft bloom, aggressive vignette, chromatic
   * aberration, and flat shading (matches the PSX dithered look).
   */
  function enablePSXMode() {
    const g = globalThis;
    if (typeof g.enableBloom === 'function') g.enableBloom(0.8, 0.6, 0.4);
    if (typeof g.enableVignette === 'function') g.enableVignette(2.0, 0.75);
    if (typeof g.enableChromaticAberration === 'function') g.enableChromaticAberration();
    if (typeof g.enableFXAA === 'function') g.enableFXAA();
    _flatShadeMeshes();
  }

  /**
   * Low-poly / indie style: flat-shaded meshes, subtle bloom highlight, light
   * vignette, no chromatic aberration.
   */
  function enableLowPolyMode() {
    const g = globalThis;
    if (typeof g.disableChromaticAberration === 'function') g.disableChromaticAberration();
    if (typeof g.enableBloom === 'function') g.enableBloom(0.4, 0.3, 0.7);
    if (typeof g.enableVignette === 'function') g.enableVignette(0.8, 0.95);
    if (typeof g.enableFXAA === 'function') g.enableFXAA();
    _flatShadeMeshes();
  }

  /** Restore default smooth shading and disable visual presets. */
  function disablePresetMode() {
    const g = globalThis;
    if (typeof g.disableBloom === 'function') g.disableBloom();
    if (typeof g.disableVignette === 'function') g.disableVignette();
    if (typeof g.disableChromaticAberration === 'function') g.disableChromaticAberration();
    _smoothShadeMeshes();
  }

  return {
    exposeTo(target) {
      Object.assign(target, {
        enableN64Mode,
        enablePSXMode,
        enableLowPolyMode,
        disablePresetMode,
      });
    },
  };
}
