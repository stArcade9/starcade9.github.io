import { Nova64 } from '../runtime/console.js';
import { GpuThreeJS } from '../runtime/gpu-threejs.js';
import { logger } from '../runtime/logger.js';
globalThis.novaLogger = logger;
import { stdApi } from '../runtime/api.js';
import { spriteApi } from '../runtime/api-sprites.js';
import { threeDApi } from '../runtime/api-3d.js';
import { editorApi } from '../runtime/editor.js';
import { physicsApi } from '../runtime/physics.js';
import { textInputApi } from '../runtime/textinput.js';
import { aabb, circle as circleCollision, raycastTilemap } from '../runtime/collision.js';
import { audioApi } from '../runtime/audio.js';
import { inputApi } from '../runtime/input.js';
import { storageApi } from '../runtime/storage.js';
import { screenApi } from '../runtime/screens.js';
import { skyboxApi } from '../runtime/api-skybox.js';
import { uiApi } from '../runtime/ui.js';
import { effectsApi } from '../runtime/api-effects.js';
import { voxelApi } from '../runtime/api-voxel.js';
import { createFullscreenButton } from '../runtime/fullscreen-button.js';
import { storeApi } from '../runtime/store.js';
import { api2d } from '../runtime/api-2d.js';
import { presetsApi } from '../runtime/api-presets.js';
import { generativeApi } from '../runtime/api-generative.js';
import { gameUtilsApi } from '../runtime/api-gameutils.js';
import { nftSeedApi } from '../runtime/nft-seed.js';
import { wadApi } from '../runtime/wad.js';
import { manifestApi } from '../runtime/manifest.js';

const canvas = document.getElementById('screen');

// Create fullscreen button - stored globally for cleanup if needed
globalThis.fullscreenButton = createFullscreenButton(canvas);

// ONLY use Three.js renderer - Nintendo 64/PlayStation style 3D console
let gpu;
try {
  gpu = new GpuThreeJS(canvas, 640, 360);
  console.log('✅ Using Three.js renderer - Nintendo 64/PlayStation GPU mode');
} catch (e) {
  console.error('❌ Three.js renderer failed to initialize:', e);
  throw new Error('Fantasy console requires 3D GPU support (Three.js)');
}

const api = stdApi(gpu);
const sApi = spriteApi(gpu);
const threeDApi_instance = threeDApi(gpu);
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
const manifestInst = manifestApi();

// Create UI API - needs to be created after api is fully initialized
let uiApiInstance;

// gather and expose to global
const nova64api = {};
api.exposeTo(nova64api);
sApi.exposeTo(nova64api);
threeDApi_instance.exposeTo(nova64api);
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
manifestInst.exposeTo(nova64api);

// Now create UI API after nova64api has rgba8 and other functions
uiApiInstance = uiApi(gpu, nova64api);
uiApiInstance.exposeTo(nova64api);

// Connect input system to UI system for mouse events
iApi.connectUI(uiApiInstance.setMousePosition, uiApiInstance.setMouseButton);

Object.assign(globalThis, nova64api);
// inject camera ref into sprite system
if (nova64api.getCamera) sApi.setCameraRef(nova64api.getCamera());

const nova = new Nova64(gpu, manifestInst);

let paused = false;
let stepOnce = false;
let statsEl = document.getElementById('stats');
let _currentCartPath = '';

async function loadCart(path) {
  _currentCartPath = path;
  await nova.loadCart(path);
}

function attachUI() {
  const sel = document.getElementById('cart');
  if (!sel) return; // headless / cart-runner mode — no panel UI
  const pauseBtn = document.getElementById('pause');
  const stepBtn = document.getElementById('step');
  const shotBtn = document.getElementById('shot');

  sel.addEventListener('change', async () => {
    paused = false;
    pauseBtn.textContent = 'Pause';
    await loadCart(sel.value);
  });

  // Renderer is now fixed to Three.js only - no UI controls needed
  // Editor button now handled by inline onclick in HTML to open OS9 shell

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  });
  stepBtn.addEventListener('click', () => {
    stepOnce = true;
  });
  shotBtn.addEventListener('click', () => {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nova64.png';
    a.click();
  });

  // START button (Enter key) resets the current cart when pressed
  let _resetPending = false;
  window.addEventListener('keydown', async e => {
    if (e.code !== 'Enter') return;
    // Ignore if typing in a form element
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // Only reset if a cart is loaded and not already resetting
    if (!_currentCartPath || _resetPending) return;
    _resetPending = true;
    logger.info('🔄 START pressed — resetting cart:', _currentCartPath);
    paused = false;
    pauseBtn.textContent = 'Pause';
    try {
      await loadCart(_currentCartPath);
    } finally {
      _resetPending = false;
    }
  });
}

let last = performance.now();
let uMs = 0,
  dMs = 0,
  fps = 0;
let currentDt = 0;

// Expose timing functions globally
globalThis.getDeltaTime = () => currentDt;
globalThis.getFPS = () => fps;

function loop() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  currentDt = dt;
  last = now;

  if (!paused || stepOnce) {
    const u0 = performance.now();

    // Tick the global novaStore time counter
    storeApiInst.tick(dt);
    // Auto-animate skybox if enabled
    skyApi._tick(dt);
    // Advance generative art frame counter
    genArtInst._advanceFrame();
    // Update post-processing shader uniforms (time, etc.)
    fxApi.update(dt);
    // Update procedural TSL material time uniforms
    if (typeof globalThis._updateTSLMaterials === 'function') {
      globalThis._updateTSLMaterials(dt);
    }

    // Update cart first (for manual screen management)
    // Check if cart exists to prevent errors during scene transitions
    if (nova.cart && nova.cart.update) {
      try {
        if (typeof globalThis.updateAnimations === 'function') {
          globalThis.updateAnimations(dt);
        }
        nova.cart.update(dt);
      } catch (e) {
        console.error('❌ Cart update() error:', e.message);
      }
    }

    // Then update screen manager (for automatic screen management)
    scrApi.manager.update(dt);

    const u1 = performance.now();
    uMs = u1 - u0;

    gpu.beginFrame();
    const d0 = performance.now();

    // Draw cart first (for manual rendering)
    // Check if cart exists to prevent errors during scene transitions
    if (nova.cart && nova.cart.draw) {
      try {
        nova.cart.draw();
      } catch (e) {
        console.error('❌ Cart draw() error:', e.message, e.stack);
      }
    }

    // Then draw screen manager (for automatic screen rendering)
    scrApi.manager.draw();

    const d1 = performance.now();
    dMs = d1 - d0;
    try {
      gpu.endFrame();
    } catch (e) {
      console.error('❌ gpu.endFrame() error:', e.message, e.stack);
    }

    // Snapshot input state at END of frame so keyp/isKeyPressed correctly
    // detect transitions on the next frame (key pressed between frames).
    iApi.step();
  }
  if (stepOnce) {
    stepOnce = false;
  }

  fps = Math.round(1000 / (performance.now() - now));

  // 3D GPU stats
  let statsText = `3D GPU (Three.js) • fps: ${fps}, update: ${uMs.toFixed(2)}ms, draw: ${dMs.toFixed(2)}ms`;

  // Add 3D stats if available
  if (typeof get3DStats === 'function') {
    const stats3D = get3DStats();
    if (stats3D.render) {
      statsText += ` • triangles: ${stats3D.render.triangles}, calls: ${stats3D.render.calls}`;
    }
  }

  if (statsEl) statsEl.textContent = statsText;
  requestAnimationFrame(loop);
}

attachUI();

// Check for game parameter in URL
const urlParams = new URLSearchParams(window.location.search);
const gameParam = urlParams.get('game');
const gamePathParam = urlParams.get('path'); // Allow direct path parameter
const demoParam = urlParams.get('demo'); // Also handle ?demo= from console.html links
const studioMode = urlParams.get('studio') === '1'; // Game Studio embeds console.html?studio=1

// Map game IDs to their paths
const gameMap = {
  'space-harrier': '/examples/space-harrier-3d/code.js',
  fzero: '/examples/f-zero-nova-3d/code.js',
  knight: '/examples/strider-demo-3d/code.js',
  cyberpunk: '/examples/cyberpunk-city-3d/code.js',
  strider: '/examples/strider-demo-3d/code.js',
  demoscene: '/examples/demoscene/code.js',
  'space-combat': '/examples/star-fox-nova-3d/code.js',
  minecraft: '/examples/minecraft-demo/code.js',
  'voxel-terrain': '/examples/voxel-terrain/code.js',
  'voxel-creative': '/examples/voxel-creative/code.js',
  'voxel-creatures': '/examples/voxel-creatures/code.js',
  'nft-worlds': '/examples/nft-worlds/code.js',
  'nft-art': '/examples/nft-art-generator/code.js',
  boids: '/examples/boids-flocking/code.js',
  'game-of-life': '/examples/game-of-life-3d/code.js',
  nature: '/examples/nature-explorer-3d/code.js',
  dungeon: '/examples/dungeon-crawler-3d/code.js',
  wizardry: '/examples/wizardry-3d/code.js',
  'creative-coding': '/examples/creative-coding/code.js',
  'tsl-showcase': '/examples/tsl-showcase/code.js',
};

// Map demo names (from ?demo= URL param) to paths
const demoMap = {
  'hello-world': '/examples/hello-world/code.js',
  'crystal-cathedral-3d': '/examples/crystal-cathedral-3d/code.js',
  'f-zero-nova-3d': '/examples/f-zero-nova-3d/code.js',
  'star-fox-nova-3d': '/examples/star-fox-nova-3d/code.js',
  'minecraft-demo': '/examples/minecraft-demo/code.js',
  'super-plumber-64': '/examples/super-plumber-64/code.js',
  'cyberpunk-city-3d': '/examples/cyberpunk-city-3d/code.js',
  'strider-demo-3d': '/examples/strider-demo-3d/code.js',
  demoscene: '/examples/demoscene/code.js',
  'space-harrier-3d': '/examples/space-harrier-3d/code.js',
  'hello-3d': '/examples/hello-3d/code.js',
  'mystical-realm-3d': '/examples/mystical-realm-3d/code.js',
  'physics-demo-3d': '/examples/physics-demo-3d/code.js',
  'shooter-demo-3d': '/examples/shooter-demo-3d/code.js',
  'hello-skybox': '/examples/hello-skybox/code.js',
  'fps-demo-3d': '/examples/fps-demo-3d/code.js',
  'wad-demo': '/examples/wad-demo/code.js',
  'adventure-comic-3d': '/examples/adventure-comic-3d/code.js',
  'input-showcase': '/examples/input-showcase/code.js',
  'audio-lab': '/examples/audio-lab/code.js',
  'storage-quest': '/examples/storage-quest/code.js',
  'instancing-demo': '/examples/instancing-demo/code.js',
  'particles-demo': '/examples/particles-demo/code.js',
  'screen-demo': '/examples/screen-demo/code.js',
  'ui-demo': '/examples/ui-demo/code.js',
  'wing-commander-space': '/examples/wing-commander-space/code.js',
  'space-combat-3d': '/examples/space-combat-3d/code.js',
  'model-viewer-3d': '/examples/model-viewer-3d/code.js',
  '3d-advanced': '/examples/3d-advanced/code.js',
  'pbr-showcase': '/examples/pbr-showcase/code.js',
  'skybox-showcase': '/examples/skybox-showcase/code.js',
  'generative-art': '/examples/generative-art/code.js',
  'boids-flocking': '/examples/boids-flocking/code.js',
  'game-of-life-3d': '/examples/game-of-life-3d/code.js',
  'nature-explorer-3d': '/examples/nature-explorer-3d/code.js',
  'dungeon-crawler-3d': '/examples/dungeon-crawler-3d/code.js',
  'wizardry-3d': '/examples/wizardry-3d/code.js',
  'voxel-terrain': '/examples/voxel-terrain/code.js',
  'voxel-creative': '/examples/voxel-creative/code.js',
  'voxel-creatures': '/examples/voxel-creatures/code.js',
  'nft-worlds': '/examples/nft-worlds/code.js',
  'nft-art-generator': '/examples/nft-art-generator/code.js',
  'creative-coding': '/examples/creative-coding/code.js',
  'tsl-showcase': '/examples/tsl-showcase/code.js',
};

// default cart - load from URL param or default to space-harrier-3d
(async () => {
  // Studio mode: skip auto-loading a cart; wait for EXECUTE_CODE from Game Studio
  if (studioMode) {
    console.log('🎮 Studio mode: waiting for code from Game Studio…');
    requestAnimationFrame(loop);
    // Defer EXECUTE_READY until after window load so the parent's iframe
    // onLoad handler fires first, avoiding any timing race.
    const sendReady = () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'EXECUTE_READY' }, '*');
      }
    };
    if (document.readyState === 'complete') {
      setTimeout(sendReady, 0);
    } else {
      window.addEventListener('load', () => setTimeout(sendReady, 0));
    }
    return;
  }

  let gamePath = document.getElementById('cart')?.value || '/examples/space-harrier-3d/code.js';

  if (gamePathParam) {
    gamePath = gamePathParam;
  } else if (demoParam && demoMap[demoParam]) {
    // Handle ?demo= parameter (from console.html links / index.html demo cards)
    gamePath = demoMap[demoParam];
  } else if (demoParam) {
    // Fallback: try constructing path from demo name directly
    gamePath = `/examples/${demoParam}/code.js`;
  } else if (gameParam && gameMap[gameParam]) {
    gamePath = gameMap[gameParam];
  }

  console.log(`🎮 Loading game: ${gamePath}`);
  await loadCart(gamePath);
  requestAnimationFrame(loop);
})();

// Listen for messages from Game Studio to execute code
window.addEventListener('message', async event => {
  if (event.data && event.data.type === 'EXECUTE_CODE') {
    const postLog = msg => {
      if (event.source) event.source.postMessage({ type: 'CART_LOG', message: msg }, event.origin);
    };
    console.log('🎮 Game Studio: Executing code...');
    console.log('📝 Code to execute:', event.data.code.substring(0, 200) + '...');
    console.log('🔧 Available APIs:', {
      api: typeof api,
      iApi: typeof iApi,
      threeDApi_instance: typeof threeDApi_instance,
    });

    try {
      // Stop current game loop if running
      console.log('⏸️ Pausing game...');
      paused = true;

      // Full scene reset — clear all 3D objects, lights, effects, fog, skybox, camera
      console.log('🧹 Resetting scene for new cart...');
      if (typeof nova64api.clearScene === 'function') nova64api.clearScene();
      if (typeof nova64api.clearFog === 'function') nova64api.clearFog();
      if (typeof nova64api.clearSkybox === 'function') nova64api.clearSkybox();
      if (typeof nova64api.disableBloom === 'function') nova64api.disableBloom();
      if (typeof nova64api.disableVignette === 'function') nova64api.disableVignette();
      if (typeof nova64api.disableChromaticAberration === 'function')
        nova64api.disableChromaticAberration();
      if (typeof nova64api.disableGlitch === 'function') nova64api.disableGlitch();
      if (typeof nova64api.setCameraPosition === 'function') nova64api.setCameraPosition(0, 5, 10);
      if (typeof nova64api.setCameraTarget === 'function') nova64api.setCameraTarget(0, 0, 0);
      console.log('✅ Scene reset complete');
      postLog('🧹 Scene reset for new cart');

      // Execute the new code
      const userCode = event.data.code;

      console.log('🔨 Creating game function...');
      // Dynamically build param list from nova64api so ALL Nova64 APIs are local variables
      // in user code — avoids window.print and other globalThis clobbering issues.
      const _apiNames = Object.keys(nova64api).filter(
        k => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) && k.length >= 3
      );
      const _apiValues = _apiNames.map(k => nova64api[k]);
      const gameFunction = new Function(
        ..._apiNames,
        userCode +
          '\n; return { init: typeof init !== "undefined" ? init : null, update: typeof update !== "undefined" ? update : null, draw: typeof draw !== "undefined" ? draw : null, render: typeof render !== "undefined" ? render : null };'
      );

      console.log('🚀 Executing game function...');
      const gameFunctions = gameFunction(..._apiValues);

      console.log('📋 Game functions:', gameFunctions);

      // Call init() if defined (modern Nova64 carts use init for one-time setup)
      if (gameFunctions.init && typeof gameFunctions.init === 'function') {
        console.log('🎬 Calling init()...');
        const initResult = gameFunctions.init();
        if (initResult instanceof Promise) await initResult;
        console.log('✅ init() completed');
        postLog('🎬 init() completed');
      }

      // Replace the cart's update/draw functions — always reset to drop stale handlers
      console.log('🔄 Installing cart functions...');
      nova.cart = {};
      if (gameFunctions.update) {
        nova.cart.update = gameFunctions.update;
      }
      if (gameFunctions.draw) {
        nova.cart.draw = gameFunctions.draw;
      } else if (gameFunctions.render) {
        nova.cart.draw = gameFunctions.render;
      }

      // Resume the game loop
      console.log('▶️ Resuming game loop...');
      paused = false;

      console.log('✅ Game Studio: Code executed successfully!');
      postLog('✅ Cart loaded and running!');

      // Send success message back
      if (event.source) {
        event.source.postMessage({ type: 'EXECUTE_SUCCESS' }, event.origin);
      }
    } catch (error) {
      console.error('❌ Game Studio: Error executing code:', error);
      console.error('Stack trace:', error.stack);
      // Always resume so the next Run attempt isn't permanently frozen
      paused = false;
      if (event.source) {
        event.source.postMessage(
          {
            type: 'EXECUTE_ERROR',
            error: error.message,
          },
          event.origin
        );
      }
    }
  }
});
