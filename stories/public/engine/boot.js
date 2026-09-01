// stories/public/engine/boot.js
//
// Minimal Nova64 bootstrap for the token-chapter experience shell. This is a
// deliberately faithful adaptation of the repo's real bootstrap sequence
// (../../../src/main.js) — same imports, same API-assembly order, same
// buildNamespace()/Nova64 construction — with only the parts specific to the
// full desktop console UI removed: the on-screen cart-select panel, the F9
// debug panel, the ?demo=/?game= dictionaries, and the Game Studio postMessage
// bridge. None of that exists in this minimal viewer, so there's nothing for
// those to attach to.
//
// Loaded via dynamic import() from the client, never bundled by Next.js —
// it runs against the plain runtime copy synced into ./nova64/ (see
// scripts/sync-nova64.mjs), exactly like console.html/cart-runner.html do
// against the repo-root runtime/ directory.

import { Nova64, NOVA64_VERSION } from '../nova64/console.js';
import { GpuThreeJS } from '../nova64/gpu-threejs.js';
import { logger } from '../nova64/logger.js';
globalThis.novaLogger = logger;
import { createLogger } from '../nova64/debug-logger.js';
globalThis._debugLogger = createLogger('API');
import { stdApi } from '../nova64/api.js';
import { spriteApi } from '../nova64/api-sprites.js';
import { threeDApi } from '../nova64/api-3d.js';
import { editorApi } from '../nova64/editor.js';
import { physicsApi } from '../nova64/physics.js';
import { textInputApi } from '../nova64/textinput.js';
import { aabb, circle as circleCollision, raycastTilemap } from '../nova64/collision.js';
import { audioApi } from '../nova64/audio.js';
import { inputApi } from '../nova64/input.js';
import { storageApi } from '../nova64/storage.js';
import { screenApi } from '../nova64/screens.js';
import { skyboxApi } from '../nova64/api-skybox.js';
import { uiApi } from '../nova64/ui.js';
import { effectsApi } from '../nova64/api-effects.js';
import { voxelApi } from '../nova64/api-voxel.js';
import { storeApi } from '../nova64/store.js';
import { buildNamespace, NAMESPACE_MAP } from '../nova64/namespace.js';
import { api2d } from '../nova64/api-2d.js';
import { presetsApi } from '../nova64/api-presets.js';
import { generativeApi } from '../nova64/api-generative.js';
import { gameUtilsApi } from '../nova64/api-gameutils.js';
import { nftSeedApi } from '../nova64/nft-seed.js';
import { wadApi } from '../nova64/wad.js';
// Deliberately not importing manifest.js: it uses import.meta.glob(...), a
// Vite-only build-time feature that throws when this file is loaded as a
// plain static ES module (our case — no Vite bundling here; the main site's
// build handles it fine because it goes through real Vite). Our carts don't
// use meta.json-driven config anyway (tokenSeed/chapterSeed/complete come
// through the __chapterContext bridge instead), and `_manifest` is optional
// on Nova64 — omitting it entirely avoids the crash rather than working
// around it.
import { canvasUIApi } from '../nova64/canvas-ui.js';
import { hypeApi } from '../nova64/hype.js';
import { xrModule } from '../nova64/xr.js';
import { mediapipeModule } from '../nova64/mediapipe.js';
import { blendApi } from '../nova64/api-blend.js';
import { stageApi } from '../nova64/stage.js';
import { movieClipApi } from '../nova64/movie-clip.js';
import { filtersApi } from '../nova64/api-filters.js';
import { camera2DApi } from '../nova64/camera-2d.js';
import { particles2DApi } from '../nova64/api-particles-2d.js';
import { tweenApi } from '../nova64/tween.js';
import { registerCartResetHook } from '../nova64/cart-reset.js';

/**
 * Boots the Nova64 runtime against `canvas` and loads `cartUrl`. Must be
 * called synchronously from (or in the same gesture-derived async chain as) a
 * user touch/click handler — it creates and resumes the Web Audio context,
 * which mobile Safari/Chrome only allow in response to a user gesture.
 *
 * Callable more than once per page: the experience shell fully unmounts and
 * remounts its <ViewerCanvas> for each fresh chapter session (e.g. after a
 * countdown resolves and the visitor taps to start the next chapter), and
 * each mount boots its own Nova64 instance. A module-level "only once ever"
 * guard used to live here, but it broke both that legitimate re-boot case
 * and React StrictMode's dev-mode double-effect-invocation (which discards
 * and re-runs the mount effect once, tripping the guard on the very first
 * real boot). ViewerCanvas's own per-mount cleanup (its `cancelled` flag)
 * already prevents a stale boot from attaching after unmount, so no
 * additional guard is needed here.
 */
export async function bootNova64({ canvas, cartUrl, onCartLoaded, onCartError }) {
  // Unlock Web Audio for this tab. Nova64's own AudioSystem (runtime/audio.js)
  // lazily creates its AudioContext on first sfx() call, which may happen well
  // after this gesture; creating+resuming a context here during the gesture
  // unlocks audio playback for the origin so that later context also runs.
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const warmup = new AudioCtx();
      await warmup.resume();
    }
  } catch {
    // Non-fatal — some browsers don't need this, and a locked context just
    // means silent playback rather than a broken experience.
  }

  // Narrative text now renders as real HTML/CSS over the canvas (see
  // viewer-canvas.tsx), not the engine's fixed bitmap font, so canvas
  // resolution no longer has to trade off against text legibility — render
  // at device-pixel resolution (capped at 2x) for crisp 3D edges/bloom.
  // Any cart-drawn 2D elements (icons, particles) should scale their own
  // fixed-pixel sizes proportionally to screenWidth()/screenHeight() rather
  // than assuming a fixed reference resolution.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));

  const gpu = new GpuThreeJS(canvas, canvas.width, canvas.height);

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) continue;
      const d = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(width * d);
      const h = Math.round(height * d);
      if (w !== canvas.width || h !== canvas.height) gpu.resize(w, h);
    }
  });
  resizeObserver.observe(canvas.parentElement || canvas);

  const api = stdApi(gpu);
  const sApi = spriteApi(gpu);
  const threeDApiInstance = threeDApi(gpu);
  const eApi = editorApi(sApi);
  const pApi = physicsApi();
  const tApi = textInputApi();
  const aApi = audioApi();
  const iApi = inputApi();
  const stApi = storageApi('nova64');
  const scrApi = screenApi();
  const skyApi = skyboxApi(gpu);
  const fxApi = effectsApi(gpu);
  const vxApi = voxelApi(gpu);
  const storeApiInst = storeApi();
  const api2dInst = api2d(gpu);
  const presetsInst = presetsApi(gpu);
  const genArtInst = generativeApi(gpu);
  const gameUtilsInst = gameUtilsApi();
  const nftSeedInst = nftSeedApi();
  const wadInst = wadApi();
  const hypeInst = hypeApi();
  const blendInst = blendApi(gpu);
  const stageInst = stageApi(gpu);
  const movieClipInst = movieClipApi(gpu);
  const filtersInst = filtersApi(gpu);
  const camera2DInst = camera2DApi(gpu);
  const particles2DInst = particles2DApi(gpu);
  const tweenInst = tweenApi();
  const xrInst = xrModule(gpu);
  const mpInst = mediapipeModule(gpu);

  const nova64api = {};
  api.exposeTo(nova64api);
  sApi.exposeTo(nova64api);
  threeDApiInstance.exposeTo(nova64api);
  eApi.exposeTo(nova64api);
  pApi.exposeTo(nova64api);
  tApi.exposeTo(nova64api);
  Object.assign(nova64api, { aabb, circleCollision, raycastTilemap });
  aApi.exposeTo(nova64api);
  iApi.exposeTo(nova64api);
  stApi.exposeTo(nova64api);
  scrApi.exposeTo(nova64api);
  skyApi.exposeTo(nova64api);
  fxApi.exposeTo(nova64api);
  vxApi.exposeTo(nova64api);
  storeApiInst.exposeTo(nova64api);
  api2dInst.exposeTo(nova64api);
  presetsInst.exposeTo(nova64api);
  genArtInst.exposeTo(nova64api);
  gameUtilsInst.exposeTo(nova64api);
  nftSeedInst.exposeTo(nova64api);
  wadInst.exposeTo(nova64api);
  hypeInst.exposeTo(nova64api);
  blendInst.exposeTo(nova64api);
  stageInst.exposeTo(nova64api);
  movieClipInst.exposeTo(nova64api);
  filtersInst.exposeTo(nova64api);
  camera2DInst.exposeTo(nova64api);
  particles2DInst.exposeTo(nova64api);
  tweenInst.exposeTo(nova64api);
  xrInst.exposeTo(nova64api);
  globalThis._xrRenderStereo = () => xrInst._renderStereo();
  mpInst.exposeTo(nova64api);

  const uiApiInstance = uiApi(gpu, nova64api);
  uiApiInstance.exposeTo(nova64api);
  canvasUIApi().exposeTo(nova64api);
  iApi.connectUI(uiApiInstance.setMousePosition, uiApiInstance.setMouseButton);

  globalThis.nova64 = buildNamespace(nova64api, NAMESPACE_MAP);
  if (nova64api.getCamera) sApi.setCameraRef(nova64api.getCamera());

  // No manifest instance (see the manifest.js import comment above) — Nova64
  // treats it as fully optional and simply skips meta.json/env-based
  // cart config, which our carts don't rely on.
  const nova = new Nova64(gpu);
  globalThis.NOVA64_VERSION = NOVA64_VERSION;
  globalThis.__nova64Runtime = nova;

  registerCartResetHook('input', () => iApi.reset?.());
  registerCartResetHook('ui', () => {
    nova64api.clearButtons?.();
    nova64api.clearPanels?.();
  });
  registerCartResetHook('screens', () => nova64api.screens?.reset?.());
  registerCartResetHook('store', () => storeApiInst.reset?.());
  registerCartResetHook('voxel', ({ modulePath }) => {
    nova64api.resetVoxelWorld?.({ restoreDefaults: true, cartPath: modulePath });
  });
  registerCartResetHook('scene', () => {
    nova64api.clearScene?.();
    nova64api.clearSkybox?.();
  });
  registerCartResetHook('camera', () => {
    nova64api.setCameraPosition?.(0, 5, 10);
    nova64api.setCameraTarget?.(0, 0, 0);
  });
  registerCartResetHook('fog', () => nova64api.setFog?.(0x87ceeb, 50, 200));

  nova.onCartDidLoad = (path) => onCartLoaded?.(path);

  let stopped = false;
  let last = performance.now();

  function loop() {
    if (stopped) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    storeApiInst.tick(dt);
    skyApi._tick(dt);
    genArtInst._advanceFrame();
    fxApi.update(dt);
    if (typeof nova64api._updateTSLMaterials === 'function') nova64api._updateTSLMaterials(dt);

    if (nova.cart && nova.cart.update) {
      try {
        if (typeof nova64api.updateAnimations === 'function') nova64api.updateAnimations(dt);
        nova.cart.update(dt);
      } catch (e) {
        console.error('[nova64] cart update() error:', e);
      }
    }
    scrApi.manager.update(dt);

    gpu.beginFrame();
    if (nova.cart && nova.cart.draw) {
      try {
        nova.cart.draw();
      } catch (e) {
        console.error('[nova64] cart draw() error:', e);
      }
    }
    scrApi.manager.draw();
    try {
      gpu.endFrame();
    } catch (e) {
      console.error('[nova64] gpu.endFrame() error:', e);
    }

    iApi.step();
    xrInst._tick();
  }

  const renderer = gpu.getRenderer?.();
  if (renderer && typeof renderer.setAnimationLoop === 'function') {
    renderer.setAnimationLoop(loop);
  } else {
    const raf = () => {
      loop();
      if (!stopped) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  try {
    await nova.loadCart(cartUrl);
  } catch (err) {
    onCartError?.(err);
  }

  return {
    loadCart: (url) => nova.loadCart(url),
    stop() {
      stopped = true;
      // Carts may run their own Web Audio score alongside Nova64's sfx
      // channels (content/audio/score.ts registers itself here). Nothing else
      // tears it down: its scheduler is driven by the cart's update(), which
      // stops being called on unmount, but its sustained pad and surf voices
      // would keep sounding over a page the visitor has already left.
      globalThis.__coastalSignalScore?.stop?.();
      resizeObserver.disconnect();
      const r = gpu.getRenderer?.();
      if (r && typeof r.setAnimationLoop === 'function') r.setAnimationLoop(null);
    },
  };
}
