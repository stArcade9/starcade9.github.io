// runtime/backends/threejs/gpu-threejs.js
// Three.js backend for 3D rendering with N64-style effects and 2D overlay support.
import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Framebuffer64 } from '../../framebuffer.js';
import { THREEJS_BACKEND_CAPABILITIES } from './capabilities.js';
import { normalizeColorToHex } from './materials.js';

export class GpuThreeJS {
  constructor(canvas, w, h) {
    this.canvas = canvas;
    this.w = w;
    this.h = h;
    this.backendName = 'threejs';

    // Pre-acquire the WebGL2 context with alpha:false locked in BEFORE
    // handing the canvas to THREE.WebGLRenderer. Once a canvas has a
    // context, subsequent getContext() calls return that same context
    // regardless of the attributes the caller asks for — so anything
    // calling getContext() on this canvas (e.g. a cart's diagnostic
    // probe) can't downgrade us to alpha:true.
    const preCtx = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      stencil: true,
      preserveDrawingBuffer: false,
    });
    if (preCtx?.getContextAttributes) {
      const a = preCtx.getContextAttributes();
      console.log('[gpu-threejs] WebGL2 ctx attrs locked:', {
        alpha: a.alpha,
        premultiplied: a.premultipliedAlpha,
        preserveDB: a.preserveDrawingBuffer,
      });
    }

    // Initialize Three.js renderer — it will see the pre-acquired context
    // via canvas.getContext('webgl2') and honor its existing alpha:false.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: preCtx, // pass the locked context explicitly
      antialias: true, // Enable for smoother graphics
      alpha: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      precision: 'highp',
      stencil: true,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    });

    // false = do NOT set inline style.width/height — CSS controls display size
    this.renderer.setSize(canvas.width, canvas.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Enhanced pixel density
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Preserve fantasy-console palette colors by default. ACES filmic tone
    // mapping is useful for HDR/PBR scenes, but as a global default it compresses
    // saturated cart colors (notably cyan/blue) into a muted, washed-out range.
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    // Note: PCFSoftShadowMap is deprecated in r182, PCFShadowMap now provides soft shadows
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;

    // Enable advanced rendering features (using modern Three.js approach)
    // Note: physicallyCorrectLights and useLegacyLights are deprecated in latest Three.js

    // Enable additional WebGL capabilities
    this.renderer.sortObjects = true;
    this.renderer.setClearColor(0x0a0a0f, 1.0);

    const gl = this.renderer.getContext();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Create main scene and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    this.camera.position.z = 5;

    // N64-style lighting setup
    this.setupN64Lighting();

    // 2D overlay system - maintain compatibility with existing 2D API
    this.fb = new Framebuffer64(w, h);
    this.overlay2D = this.create2DOverlay(w, h);

    // Sprite batching for 2D elements
    this.spriteBatches = new Map();
    this.texCache = new WeakMap();

    // Registered animated mesh list — avoids scene.traverse() every frame
    this.animatedMeshes = [];

    // Frustum for per-frame culling of animated material updates
    this.frustum = new THREE.Frustum();
    this._projScreenMatrix = new THREE.Matrix4();

    // Camera controls and state
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraOffset = new THREE.Vector3(0, 0, 5);

    // Performance tracking
    this.stats = {
      triangles: 0,
      drawCalls: 0,
      geometries: 0,
    };
  }

  getBackendCapabilities() {
    return THREEJS_BACKEND_CAPABILITIES;
  }

  setupN64Lighting() {
    // Neutral ambient base — carts override via setAmbientLight()
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    // Hemisphere: neutral ground (0x383838) avoids warm-brown tinting on coloured objects
    const hemisphereLight = new THREE.HemisphereLight(0xc8d8ff, 0x383838, 0.5);
    this.scene.add(hemisphereLight);

    // Single main directional with shadows — carts steer via setLightDirection/Color
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.mainLight.position.set(5, 8, 3);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.1;
    this.mainLight.shadow.camera.far = 200;
    this.mainLight.shadow.camera.left = -100;
    this.mainLight.shadow.camera.right = 100;
    this.mainLight.shadow.camera.top = 100;
    this.mainLight.shadow.camera.bottom = -100;
    this.mainLight.shadow.bias = -0.00005;
    this.mainLight.shadow.normalBias = 0.02;
    this.scene.add(this.mainLight);

    // Environment map for PBR metallic reflections
    try {
      const pmremGenerator = new PMREMGenerator(this.renderer);
      pmremGenerator.compileEquirectangularShader();
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
      pmremGenerator.dispose();
    } catch (_) {
      // Non-critical; silently skip on unsupported renderers
    }

    // Store lights for dynamic control via setAmbientLight / setLightDirection etc.
    this.lights = {
      main: this.mainLight,
      ambient: ambientLight,
      hemisphere: hemisphereLight,
    };
  }

  create2DOverlay(w, h) {
    // Create orthographic camera for 2D overlay
    const overlay2DCamera = new THREE.OrthographicCamera(0, w, h, 0, -1, 1);
    const overlay2DScene = new THREE.Scene();

    // Create texture from framebuffer for 2D overlay
    // Keep a persistent Uint8Array - modify in-place rather than replacing ref
    const overlayPixels = new Uint8Array(w * h * 4);
    const overlayTexture = new THREE.DataTexture(overlayPixels, w, h, THREE.RGBAFormat);
    overlayTexture.needsUpdate = true;
    // flipY=false means data row 0 = bottom of screen; we account for this in update
    overlayTexture.flipY = false;

    // Create plane for 2D overlay
    const overlayGeometry = new THREE.PlaneGeometry(w, h);
    const overlayMaterial = new THREE.MeshBasicMaterial({
      map: overlayTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
    overlayMesh.position.set(w / 2, h / 2, 0);
    overlay2DScene.add(overlayMesh);

    return {
      camera: overlay2DCamera,
      scene: overlay2DScene,
      texture: overlayTexture,
      pixels: overlayPixels,
    };
  }

  // ─── Stage Canvas2D overlay ──────────────────────────────────────────────────
  // A dedicated transparent canvas placed over the WebGL canvas in the DOM.
  // Used by Stage, MovieClip, enhanced spr(), blend modes, and filters.
  // z-index 11 → sits above the Three.js canvas (WebGL + framebuffer overlay).
  getStageCtx() {
    if (this._stageCtx) return this._stageCtx;
    const canvas = document.createElement('canvas');
    canvas.width = this.fb.width;
    canvas.height = this.fb.height;
    canvas.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;' +
      'z-index:11;pointer-events:none;background:transparent;image-rendering:pixelated;';
    canvas.setAttribute('aria-hidden', 'true');
    const container = this.canvas.parentElement || document.body;
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(canvas);
    this._stageCanvas = canvas;
    this._stageCtx = canvas.getContext('2d', { alpha: true });
    return this._stageCtx;
  }

  clearStage() {
    if (this._stageCtx) {
      this._stageCtx.setTransform(1, 0, 0, 1, 0, 0);
      this._stageCtx.clearRect(0, 0, this._stageCanvas.width, this._stageCanvas.height);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  beginFrame() {
    // Clear sprite batches
    this.spriteBatches.clear();

    // Clear 2D framebuffer
    this.fb.fill(0, 0, 0, 0);

    // Clear stage Canvas2D overlay
    this.clearStage();
  }

  endFrame() {
    // Update animations
    this.update(0.016);

    // Update LOD levels based on current camera position
    const updateLODs = globalThis.updateLODs ?? globalThis.nova64?.scene?.updateLODs;
    if (typeof updateLODs === 'function') {
      updateLODs();
    }

    // Cardboard VR: use StereoEffect instead of normal render
    if (typeof globalThis._xrRenderStereo === 'function' && globalThis._xrRenderStereo()) {
      // Stereo already rendered — skip normal render but still do 2D overlay
      // (2D overlay in cardboard mode is rendered flat, visible in both eyes)
      this.update2DOverlay();
      return;
    }

    // Render 3D scene first - check if post-processing effects are enabled
    const isEffectsEnabled = globalThis.isEffectsEnabled ?? globalThis.nova64?.fx?.isEffectsEnabled;
    const renderEffects = globalThis.renderEffects ?? globalThis.nova64?.fx?.renderEffects;
    if (typeof isEffectsEnabled === 'function' && isEffectsEnabled()) {
      // Use post-processing composer
      if (typeof renderEffects === 'function') {
        renderEffects();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    } else {
      // Standard rendering
      this.renderer.render(this.scene, this.camera);
    }

    // RENDER 2D HUD OVERLAY!
    // In WebXR VR/AR mode, skip the ortho overlay (it doesn't work in stereo).
    // The VR HUD billboard is updated separately by xr._tick().
    if (this.renderer.xr.isPresenting) return;
    this.update2DOverlay();
  }

  update2DOverlay() {
    // Update 2D overlay texture from framebuffer
    // Framebuffer is Uint16Array with R,G,B,A as separate 16-bit values
    const fb = this.fb.pixels;
    const W = this.fb.width;
    const H = this.fb.height;
    // Modify the persistent pixel buffer in-place (more reliable than replacing ref)
    const textureData = this.overlay2D.pixels;

    // fb row 0 = top of screen; WebGL textures have row 0 at bottom (flipY=false).
    // Flip Y only: fb row y → texture row (H-1-y) so the image appears right-side-up.
    // No X flip: fb col x → texture col x → UV u=x/W → screen position x (left→right).
    for (let y = 0; y < H; y++) {
      const srcRow = y * W * 4; // framebuffer row (y=0 = top of screen)
      const dstRow = (H - 1 - y) * W * 4; // texture row  (row 0 = GL bottom = UV v=0)
      for (let x = 0; x < W; x++) {
        const src = srcRow + x * 4;
        const dst = dstRow + x * 4; // same column — no X flip
        textureData[dst] = fb[src] / 257; // R
        textureData[dst + 1] = fb[src + 1] / 257; // G
        textureData[dst + 2] = fb[src + 2] / 257; // B
        textureData[dst + 3] = fb[src + 3] / 257; // A
      }
    }

    // Mark texture for GPU upload on this frame
    this.overlay2D.texture.needsUpdate = true;

    // CRITICAL: Reset render target to screen (null) before overlay render.
    // EffectComposer can leave the renderer pointing at an internal buffer.
    this.renderer.setRenderTarget(null);
    this.renderer.autoClear = false;
    this.renderer.render(this.overlay2D.scene, this.overlay2D.camera);
    this.renderer.autoClear = true;
  }

  updateCameraPosition() {
    // Update camera based on target and offset
    this.camera.position.copy(this.cameraOffset).add(this.cameraTarget);
    this.camera.lookAt(this.cameraTarget);
  }

  // Scene accessors
  getScene() {
    return this.scene;
  }
  getCamera() {
    return this.camera;
  }
  getRenderer() {
    return this.renderer;
  }

  // Set the background clear color
  setClearColor(color) {
    this.renderer.setClearColor(color, 1.0);
  }

  // Resize the 3D renderer to a new physical pixel resolution.
  // CSS display size is controlled by the stylesheet — this only updates
  // the WebGL back-buffer and 3D camera aspect ratio.
  // The 2D framebuffer and overlay stay at the original logical resolution
  // so that cart HUD code (which draws at e.g. 640×360) is automatically
  // scaled up by the GPU when the overlay quad is rendered.
  resize(w, h) {
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.renderer.setSize(w, h, false); // false = don't touch inline styles
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // NOTE: Do NOT resize fb or overlay2D — they stay at the logical
    // resolution so all 2D/HUD drawing keeps working at the original
    // coordinate system.  The overlay orthographic camera already maps
    // its logical-sized quad across the full WebGL viewport.
  }

  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
  }

  setCameraTarget(x, y, z) {
    this.cameraTarget.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  setCameraFOV(fov) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  setFog(color, near = 10, far = 50) {
    this.scene.fog = new THREE.Fog(normalizeColorToHex(color), near, far);
  }

  setLightDirection(x, y, z) {
    if (this.mainLight) {
      this.mainLight.position.set(x, y, z);
    }
  }

  setLightColor(color) {
    if (this.mainLight) {
      this.mainLight.color.setHex(color);
    }
  }

  setAmbientLight(color, intensity) {
    if (this.lights && this.lights.ambient) {
      this.lights.ambient.color.setHex(color);
      if (typeof intensity === 'number') {
        this.lights.ambient.intensity = intensity;
      }
    }
  }

  // Enhanced material creation with stunning visuals but simplified shaders
  createN64Material(options = {}) {
    const {
      color = 0xffffff,
      texture = null,
      normalMap = null,
      roughnessMap = null,
      aoMap = null,
      metallic = false,
      emissive = 0x000000,
      emissiveIntensity = 0,
      roughness = 0.6,
      transparent = false,
      opacity = 1,
      alphaTest = 0.5,
      animated = false,
      holographic = false,
    } = options;

    let material;

    if (holographic || emissiveIntensity > 0.5) {
      material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: new THREE.Color(emissive),
        emissiveIntensity: Math.max(emissiveIntensity, 0.4),
        metalness: 0.8,
        roughness: 0.1,
        envMapIntensity: 2.5,
        transparent: true,
        opacity: options.opacity ?? 0.9,
        side: THREE.DoubleSide,
        fog: true,
      });
    } else if (metallic) {
      material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.9,
        roughness: roughness * 0.4,
        envMapIntensity: 2.5,
        transparent: transparent,
        opacity,
        alphaTest: alphaTest,
        side: THREE.DoubleSide,
        fog: true,
      });
    } else {
      // Default cart geometry should preserve authored palette colors. A global
      // MeshStandardMaterial path adds white environment/specular response to
      // simple cubes and makes examples like hello-world look pale instead of
      // vivid. PBR/metallic cases stay on the branches above.
      material = new THREE.MeshLambertMaterial({
        color: color,
        emissive: emissive !== 0x000000 ? new THREE.Color(emissive) : new THREE.Color(0),
        emissiveIntensity: emissive !== 0x000000 ? Math.max(emissiveIntensity, 0.3) : 0,
        transparent: transparent,
        opacity,
        alphaTest: alphaTest,
        side: THREE.DoubleSide,
        fog: true,
      });
    }

    // Enhanced texture handling with better filtering
    if (texture) {
      material.map = texture;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      // Add texture animation for dynamic effects
      if (animated) {
        texture.offset.set(Math.random() * 0.1, Math.random() * 0.1);
        material.userData.animateTexture = true;
      }
    }

    // Normal map assignment (all paths already use MeshStandardMaterial)
    if (normalMap && material.normalMap !== undefined) {
      material.normalMap = normalMap;
      normalMap.wrapS = THREE.RepeatWrapping;
      normalMap.wrapT = THREE.RepeatWrapping;
      material.normalMapType = THREE.TangentSpaceNormalMap;
    }
    if (roughnessMap && material.roughnessMap !== undefined) {
      material.roughnessMap = roughnessMap;
    }
    if (aoMap && material.aoMap !== undefined) {
      material.aoMap = aoMap;
      material.aoMapIntensity = 1.0;
    }

    // Store animation flags
    material.userData.animated = animated;
    material.userData.holographic = holographic;

    return material;
  }

  // Geometry helpers
  createBoxGeometry(width = 1, height = 1, depth = 1) {
    return new THREE.BoxGeometry(width, height, depth);
  }

  createSphereGeometry(radius = 1, segments = 8) {
    return new THREE.SphereGeometry(radius, segments, segments);
  }

  createPlaneGeometry(width = 1, height = 1) {
    return new THREE.PlaneGeometry(width, height);
  }

  createCylinderGeometry(radiusTop = 1, radiusBottom = 1, height = 1, segments = 16) {
    return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
  }

  createConeGeometry(radius = 1, height = 2, segments = 16) {
    return new THREE.ConeGeometry(radius, height, segments);
  }

  createCapsuleGeometry(radius = 0.5, height = 1, segments = 8) {
    // Capsule = cylinder + two hemisphere caps
    return new THREE.CapsuleGeometry(radius, height, segments, segments * 2);
  }

  // 2D compatibility methods
  getFramebuffer() {
    return this.fb;
  }
  supportsSpriteBatch() {
    return true;
  }

  queueSprite(img, sx, sy, sw, sh, dx, dy, scale = 1) {
    const gltex = this._getTexture(img);
    let arr = this.spriteBatches.get(gltex);
    if (!arr) {
      arr = [];
      this.spriteBatches.set(gltex, arr);
    }
    arr.push({
      sx,
      sy,
      sw,
      sh,
      dx,
      dy,
      scale,
      tex: gltex,
      iw: img.naturalWidth,
      ih: img.naturalHeight,
    });
  }

  _getTexture(img) {
    let tex = this.texCache.get(img);
    if (tex) return tex;

    tex = new THREE.Texture(img);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    this.texCache.set(img, tex);
    return tex;
  }

  flushSprites() {
    // For now, just render sprite batches to 2D overlay
    for (const [, sprites] of this.spriteBatches) {
      for (const sprite of sprites) {
        this.renderSpriteToFramebuffer(sprite);
      }
    }
  }

  renderSpriteToFramebuffer(_sprite) {
    // Placeholder — sprite-to-framebuffer compositing not yet implemented
  }

  // Performance stats
  getStats() {
    return {
      ...this.stats,
      memory: this.renderer.info.memory,
      render: this.renderer.info.render,
    };
  }

  // N64-style post-processing
  enablePixelation(factor = 2) {
    if (factor <= 0) {
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    } else {
      this.renderer.setPixelRatio(1 / factor);
    }
  }

  enableDithering(enabled = true) {
    this.renderer.dithering = enabled;
  }

  enableBloom(enabled = true) {
    void enabled;
    // Real bloom is provided by runtime/api-effects.js. Do not fake bloom by
    // raising global exposure, because that desaturates simple cart palettes.
    this.renderer.toneMappingExposure = 1.0;
  }

  enableMotionBlur(factor = 0.5) {
    // Motion blur would require post-processing pipeline
    // For now, just store the setting
    this.motionBlurFactor = factor;
  }

  // Register a mesh with animated material so update() can skip scene.traverse()
  registerAnimatedMesh(mesh) {
    if (mesh && !this.animatedMeshes.includes(mesh)) {
      this.animatedMeshes.push(mesh);
    }
  }

  // Called by clearScene() in api-3d.js to reset the list
  clearAnimatedMeshes() {
    this.animatedMeshes = [];
  }

  // Animation system for dynamic materials and effects
  update(deltaTime) {
    const time = performance.now() * 0.001;

    // Rebuild frustum from current camera state for this frame
    this.camera.updateMatrixWorld();
    this._projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this._projScreenMatrix);

    // Prune disposed objects then update only registered animated meshes
    this.animatedMeshes = this.animatedMeshes.filter(m => m.parent);
    for (const object of this.animatedMeshes) {
      const material = object.material;
      if (!material || !material.userData.animated) continue;

      // Skip material updates for objects outside the view frustum
      if (!this.frustum.intersectsObject(object)) continue;

      // Animate texture offsets for flowing effects
      if (material.userData.animateTexture && material.map) {
        material.map.offset.x += deltaTime * 0.1;
        material.map.offset.y += deltaTime * 0.05;
      }

      // Animate emissive pulsing for holographic materials
      if (material.emissive && material.userData.holographic) {
        material.emissiveIntensity = 0.3 + Math.sin(time * 4) * 0.2;
      }
    }

    // Fog animation for atmospheric depth
    if (this.scene.fog && this.scene.fog.density) {
      this.scene.fog.density = 0.005 + Math.sin(time * 0.5) * 0.001;
    }
  }

  // Enhanced rendering with post-processing effects
  render() {
    // This method is for direct rendering calls
    // Main rendering is handled by endFrame()
    this.renderer.render(this.scene, this.camera);

    // Update performance stats
    this.stats.triangles = this.renderer.info.render.triangles;
    this.stats.drawCalls = this.renderer.info.render.calls;
    this.stats.geometries = this.renderer.info.memory.geometries;
  }
}
