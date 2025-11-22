import { Nova64 } from '../runtime/console.js';
import { GpuThreeJS } from '../runtime/gpu-threejs.js';
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

const canvas = document.getElementById('screen');

// Create fullscreen button - stored globally for cleanup if needed
globalThis.fullscreenButton = createFullscreenButton(canvas);

// ONLY use Three.js renderer - Nintendo 64/PlayStation style 3D console
let gpu;
try { 
  gpu = new GpuThreeJS(canvas, 640, 360); 
  console.log('✅ Using Three.js renderer - Nintendo 64/PlayStation GPU mode');
}
catch (e) { 
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
    paused = false; pauseBtn.textContent = 'Pause';
    await loadCart(sel.value);
  });
  
  // Renderer is now fixed to Three.js only - no UI controls needed
  // Editor button now handled by inline onclick in HTML to open OS9 shell

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  });
  stepBtn.addEventListener('click', () => { stepOnce = true; });
  shotBtn.addEventListener('click', () => {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'nova64.png'; a.click();
  });
}

let last = performance.now();
let uMs=0, dMs=0, fps=0;
let currentDt = 0;

// Expose timing functions globally
globalThis.getDeltaTime = () => currentDt;
globalThis.getFPS = () => fps;

function loop() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last)/1000);
  currentDt = dt;
  last = now;

  if (!paused || stepOnce) {
    iApi.step();
    const u0 = performance.now();
    
    // Update cart first (for manual screen management)
    // Check if cart exists to prevent errors during scene transitions
    if (nova.cart && nova.cart.update) {
      nova.cart.update(dt);
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
      nova.cart.draw();
    }
    
    // Then draw screen manager (for automatic screen rendering)
    scrApi.manager.draw();
    
    const d1 = performance.now();
    dMs = d1 - d0;
    gpu.endFrame();
  }
  if (stepOnce) { stepOnce = false; }

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

// Map game IDs to their paths
const gameMap = {
  'fzero': '/examples/f-zero-nova-3d/code.js',
  'knight': '/examples/strider-demo-3d/code.js',
  'cyberpunk': '/examples/cyberpunk-city-3d/code.js',
  'strider': '/examples/strider-demo-3d/code.js',
  'demoscene': '/examples/demoscene/code.js',
  'space-combat': '/examples/star-fox-nova-3d/code.js',
  'minecraft': '/examples/minecraft-demo/code.js',
};

// default cart - load from URL param or default to hello-3d
(async () => {
  let gamePath = '/examples/hello-3d/code.js';
  
  if (gamePathParam) {
    gamePath = gamePathParam;
  } else if (gameParam && gameMap[gameParam]) {
    gamePath = gameMap[gameParam];
  }
  
  console.log(`🎮 Loading game: ${gamePath}`);
  await loadCart(gamePath);
  requestAnimationFrame(loop);
})();

// Listen for messages from Game Studio to execute code
window.addEventListener('message', (event) => {
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
        'cls', 'pset', 'pget', 'rectfill', 'rect', 'circfill', 'circ', 'line', 'print',
        'btn', 'btnp', 'rgba8', 'spr', 'map', 'mset', 'mget',
        'rect3d', 'cube3d', 'sphere3d', 'cylinder3d', 'cone3d', 'model3d', 'light3d',
        'setCamera', 'lookAt', 'fog3d', 'clearScene', 'updateModel',
        'createSkybox', 'updateSkybox', 'removeSkybox',
        'bloom', 'chromaticAberration', 'vignette', 'scanlines', 'crt', 'glitch',
        'createVoxelEngine', 'voxelSet', 'voxelGet', 'voxelClear', 'voxelRender',
        'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number',
        userCode + '\n; return { update: typeof update !== "undefined" ? update : null, draw: typeof draw !== "undefined" ? draw : null, render: typeof render !== "undefined" ? render : null };'
      );
      
      console.log('🚀 Executing game function...');
      // Call with the API functions and capture the returned functions
      const gameFunctions = gameFunction(
        api.cls, api.pset, api.pget, api.rectfill, api.rect, api.circfill, api.circ, api.line, api.print,
        iApi.btn, iApi.btnp, api.rgba8, sApi.spr, sApi.map, sApi.mset, sApi.mget,
        threeDApi_instance.rect3d, threeDApi_instance.cube3d, threeDApi_instance.sphere3d, 
        threeDApi_instance.cylinder3d, threeDApi_instance.cone3d, threeDApi_instance.model3d, threeDApi_instance.light3d,
        threeDApi_instance.setCamera, threeDApi_instance.lookAt, threeDApi_instance.fog3d, 
        threeDApi_instance.clearScene, threeDApi_instance.updateModel,
        skyApi.createSkybox, skyApi.updateSkybox, skyApi.removeSkybox,
        fxApi.bloom, fxApi.chromaticAberration, fxApi.vignette, fxApi.scanlines, fxApi.crt, fxApi.glitch,
        vxApi.createVoxelEngine, vxApi.voxelSet, vxApi.voxelGet, vxApi.voxelClear, vxApi.voxelRender,
        console, Math, Date, Array, Object, String, Number
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
        event.source.postMessage({ 
          type: 'EXECUTE_ERROR', 
          error: error.message 
        }, event.origin);
      }
    }
  }
});