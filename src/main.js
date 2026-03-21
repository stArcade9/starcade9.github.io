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

// Create UI API - needs to be created after api is fully initialized
let uiApiInstance;

// gather and expose to global
const g = {};
api.exposeTo(g);
sApi.exposeTo(g);
threeDApi_instance.exposeTo(g);
eApi.exposeTo(g);
pApi.exposeTo(g);
tApi.exposeTo(g);
Object.assign(g, { aabb, circleCollision, raycastTilemap });
aApi.exposeTo(g);
iApi.exposeTo(g);
stApi.exposeTo(g);
scrApi.exposeTo(g);
skyApi.exposeTo(g);
fxApi.exposeTo(g);
vxApi.exposeTo(g);
storeApiInst.exposeTo(g);
api2dInst.exposeTo(g);
presetsInst.exposeTo(g);

// Now create UI API after g has rgba8 and other functions
uiApiInstance = uiApi(gpu, g);
uiApiInstance.exposeTo(g);

// Connect input system to UI system for mouse events
iApi.connectUI(uiApiInstance.setMousePosition, uiApiInstance.setMouseButton);

Object.assign(globalThis, g);
// inject camera ref into sprite system
if (g.getCamera) sApi.setCameraRef(g.getCamera());

const nova = new Nova64(gpu);

let paused = false;
let stepOnce = false;
let statsEl = document.getElementById('stats');

async function loadCart(path) {
  await nova.loadCart(path);
}

function attachUI() {
  const sel = document.getElementById('cart');
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
    // Update post-processing shader uniforms (time, etc.)
    fxApi.update(dt);

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

  statsEl.textContent = statsText;
  requestAnimationFrame(loop);
}

attachUI();

// Check for game parameter in URL
const urlParams = new URLSearchParams(window.location.search);
const gameParam = urlParams.get('game');
const gamePathParam = urlParams.get('path'); // Allow direct path parameter
const demoParam = urlParams.get('demo'); // Also handle ?demo= from console.html links

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
};

// default cart - load from URL param or default to space-harrier-3d
(async () => {
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
window.addEventListener('message', event => {
  if (event.data && event.data.type === 'EXECUTE_CODE') {
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

      // Reset the 3D scene
      console.log('🧹 Clearing 3D scene...');
      if (threeDApi_instance && typeof threeDApi_instance.clearScene === 'function') {
        threeDApi_instance.clearScene();
        console.log('✅ Scene cleared');
      } else {
        console.warn('⚠️ clearScene not available');
      }

      // Execute the new code
      const userCode = event.data.code;

      console.log('🔨 Creating game function...');
      // Create a function from the code and execute it
      const gameFunction = new Function(
        'cls',
        'pset',
        'pget',
        'rectfill',
        'rect',
        'circfill',
        'circ',
        'line',
        'print',
        'btn',
        'btnp',
        'rgba8',
        'spr',
        'map',
        'mset',
        'mget',
        'rect3d',
        'cube3d',
        'sphere3d',
        'cylinder3d',
        'cone3d',
        'model3d',
        'light3d',
        'setCamera',
        'lookAt',
        'fog3d',
        'clearScene',
        'updateModel',
        'createSpaceSkybox',
        'animateSkybox',
        'clearSkybox',
        'bloom',
        'chromaticAberration',
        'vignette',
        'scanlines',
        'crt',
        'glitch',
        'createVoxelEngine',
        'voxelSet',
        'voxelGet',
        'voxelClear',
        'voxelRender',
        'console',
        'Math',
        'Date',
        'Array',
        'Object',
        'String',
        'Number',
        userCode +
          '\n; return { update: typeof update !== "undefined" ? update : null, draw: typeof draw !== "undefined" ? draw : null, render: typeof render !== "undefined" ? render : null };'
      );

      console.log('🚀 Executing game function...');
      // Call with the API functions and capture the returned functions
      const gameFunctions = gameFunction(
        api.cls,
        api.pset,
        api.pget,
        api.rectfill,
        api.rect,
        api.circfill,
        api.circ,
        api.line,
        api.print,
        iApi.btn,
        iApi.btnp,
        api.rgba8,
        sApi.spr,
        sApi.map,
        sApi.mset,
        sApi.mget,
        threeDApi_instance.rect3d,
        threeDApi_instance.cube3d,
        threeDApi_instance.sphere3d,
        threeDApi_instance.cylinder3d,
        threeDApi_instance.cone3d,
        threeDApi_instance.model3d,
        threeDApi_instance.light3d,
        threeDApi_instance.setCamera,
        threeDApi_instance.lookAt,
        threeDApi_instance.fog3d,
        threeDApi_instance.clearScene,
        threeDApi_instance.updateModel,
        g.createSpaceSkybox,
        g.animateSkybox,
        g.clearSkybox,
        fxApi.bloom,
        fxApi.chromaticAberration,
        fxApi.vignette,
        fxApi.scanlines,
        fxApi.crt,
        fxApi.glitch,
        vxApi.createVoxelEngine,
        vxApi.voxelSet,
        vxApi.voxelGet,
        vxApi.voxelClear,
        vxApi.voxelRender,
        console,
        Math,
        Date,
        Array,
        Object,
        String,
        Number
      );

      console.log('📋 Game functions:', gameFunctions);

      // Replace the cart's update/draw functions with the new ones
      if (gameFunctions.update || gameFunctions.draw || gameFunctions.render) {
        console.log('🔄 Replacing cart functions...');
        if (!nova.cart) {
          nova.cart = {};
        }
        if (gameFunctions.update) {
          nova.cart.update = gameFunctions.update;
          console.log('✅ Replaced update function');
        }
        if (gameFunctions.draw) {
          nova.cart.draw = gameFunctions.draw;
          console.log('✅ Replaced draw function');
        } else if (gameFunctions.render) {
          // Support both draw() and render() naming conventions
          nova.cart.draw = gameFunctions.render;
          console.log('✅ Replaced draw function (from render)');
        }
      } else {
        console.log('ℹ️ No update/draw functions found in code');
      }

      // Resume the game loop
      console.log('▶️ Resuming game loop...');
      paused = false;

      console.log('✅ Game Studio: Code executed successfully!');

      // Send success message back
      if (event.source) {
        event.source.postMessage({ type: 'EXECUTE_SUCCESS' }, event.origin);
      }
    } catch (error) {
      console.error('❌ Game Studio: Error executing code:', error);
      console.error('Stack trace:', error.stack);
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
