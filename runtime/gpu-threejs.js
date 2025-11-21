// runtime/gpu-threejs.js
// Three.js backend for 3D rendering with N64-style effects and 2D overlay support
import * as THREE from 'three';
import { Framebuffer64 } from './framebuffer.js';

export class GpuThreeJS {
  constructor(canvas, w, h) {
    this.canvas = canvas;
    this.w = w;
    this.h = h;

    // Initialize Three.js renderer with maximum quality settings
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true, // Enable for smoother graphics
      alpha: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
      precision: "highp",
      stencil: true,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false
    });
    
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Enhanced pixel density
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Dramatically enhanced visual rendering setup
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.6;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    // Camera controls and state
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraOffset = new THREE.Vector3(0, 0, 5);

    // Performance tracking
    this.stats = {
      triangles: 0,
      drawCalls: 0,
      geometries: 0
    };
  }

  setupN64Lighting() {
    // Multi-layered ambient lighting for rich atmosphere
    const ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    this.scene.add(ambientLight);
    
    // Hemisphere light for more natural lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.4);
    this.scene.add(hemisphereLight);

    // Main directional light with ultra-high quality shadows
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    this.mainLight.position.set(5, 8, 3);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 4096;
    this.mainLight.shadow.mapSize.height = 4096;
    this.mainLight.shadow.camera.near = 0.1;
    this.mainLight.shadow.camera.far = 200;
    this.mainLight.shadow.camera.left = -100;
    this.mainLight.shadow.camera.right = 100;
    this.mainLight.shadow.camera.top = 100;
    this.mainLight.shadow.camera.bottom = -100;
    this.mainLight.shadow.bias = -0.00005;
    this.mainLight.shadow.normalBias = 0.02;
    this.scene.add(this.mainLight);

    // Dramatic colored fill lights for cinematic atmosphere
    const fillLight1 = new THREE.DirectionalLight(0x4080ff, 0.8);
    fillLight1.position.set(-8, 4, -5);
    fillLight1.castShadow = false;
    this.scene.add(fillLight1);
    
    const fillLight2 = new THREE.DirectionalLight(0xff4080, 0.6);
    fillLight2.position.set(5, -3, 8);
    fillLight2.castShadow = false;
    this.scene.add(fillLight2);
    
    const fillLight3 = new THREE.DirectionalLight(0x80ff40, 0.4);
    fillLight3.position.set(-3, 6, -2);
    fillLight3.castShadow = false;
    this.scene.add(fillLight3);

    // Point lights for localized dramatic effects
    const pointLight1 = new THREE.PointLight(0xffaa00, 2, 30);
    pointLight1.position.set(10, 15, 10);
    pointLight1.castShadow = true;
    pointLight1.shadow.mapSize.width = 1024;
    pointLight1.shadow.mapSize.height = 1024;
    this.scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x00aaff, 1.5, 25);
    pointLight2.position.set(-10, 10, -10);
    pointLight2.castShadow = true;
    pointLight2.shadow.mapSize.width = 1024;
    pointLight2.shadow.mapSize.height = 1024;
    this.scene.add(pointLight2);

    // Dramatic volumetric fog with color gradients
    this.scene.fog = new THREE.FogExp2(0x202050, 0.008);
    
    // Store lights for dynamic control
    this.lights = {
      main: this.mainLight,
      fill1: fillLight1,
      fill2: fillLight2,
      fill3: fillLight3,
      point1: pointLight1,
      point2: pointLight2,
      ambient: ambientLight,
      hemisphere: hemisphereLight
    };
  }

  create2DOverlay(w, h) {
    // Create orthographic camera for 2D overlay
    const overlay2DCamera = new THREE.OrthographicCamera(0, w, h, 0, -1, 1);
    const overlay2DScene = new THREE.Scene();

    // Create texture from framebuffer for 2D overlay
    const overlayTexture = new THREE.DataTexture(
      new Uint8Array(w * h * 4), 
      w, h, THREE.RGBAFormat
    );
    overlayTexture.needsUpdate = true;

    // Create plane for 2D overlay
    const overlayGeometry = new THREE.PlaneGeometry(w, h);
    const overlayMaterial = new THREE.MeshBasicMaterial({ 
      map: overlayTexture,
      transparent: true,
      blending: THREE.NormalBlending
    });
    const overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
    overlayMesh.position.set(w/2, h/2, 0);
    overlay2DScene.add(overlayMesh);

    return { camera: overlay2DCamera, scene: overlay2DScene, texture: overlayTexture };
  }

  beginFrame() {
    // Clear sprite batches
    this.spriteBatches.clear();
    
    // Clear 2D framebuffer
    this.fb.fill(0, 0, 0, 0);
  }

  endFrame() {
    // Update animations
    this.update(0.016);
    
    // Render 3D scene first - check if post-processing effects are enabled
    if (typeof globalThis.isEffectsEnabled === 'function' && globalThis.isEffectsEnabled()) {
      // Use post-processing composer
      if (typeof globalThis.renderEffects === 'function') {
        globalThis.renderEffects();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    } else {
      // Standard rendering
      this.renderer.render(this.scene, this.camera);
    }
    
    // RENDER 2D HUD OVERLAY!
    this.update2DOverlay();
  }

  update2DOverlay() {
    // Update 2D overlay texture from framebuffer
    // Framebuffer is Uint16Array with R,G,B,A as separate 16-bit values
    const fb = this.fb.pixels;
    const textureData = new Uint8Array(this.fb.width * this.fb.height * 4);
    
    // fb.pixels stores: [r16, g16, b16, a16, r16, g16, b16, a16, ...]
    // We need to convert to: [r8, g8, b8, a8, r8, g8, b8, a8, ...]
    for (let i = 0; i < fb.length; i += 4) {
      const idx = (i / 4) * 4; // Output index
      
      // Convert 16-bit (0-65535) to 8-bit (0-255) by dividing by 257
      textureData[idx]     = fb[i]     / 257; // R
      textureData[idx + 1] = fb[i + 1] / 257; // G
      textureData[idx + 2] = fb[i + 2] / 257; // B
      textureData[idx + 3] = fb[i + 3] / 257; // A
    }
    
    this.overlay2D.texture.image.data = textureData;
    this.overlay2D.texture.needsUpdate = true;
    
    // Render 2D overlay on top of 3D scene
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
  getScene() { return this.scene; }
  getCamera() { return this.camera; }
  getRenderer() { return this.renderer; }

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
    this.scene.fog = new THREE.Fog(color, near, far);
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

  setAmbientLight(color) {
    if (this.lights && this.lights.ambient) {
      this.lights.ambient.color.setHex(color);
    }
  }

  // Enhanced material creation with stunning visuals but simplified shaders
  createN64Material(options = {}) {
    const { 
      color = 0xffffff, 
      texture = null, 
      metallic = false,
      emissive = 0x000000,
      emissiveIntensity = 0,
      roughness = 0.6,
      transparent = false,
      alphaTest = 0.5,
      animated = false,
      holographic = false
    } = options;

    let material;
    
    if (holographic || emissiveIntensity > 0.5) {
      // Create stunning holographic/glowing materials - simplified to avoid shader errors
      material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: new THREE.Color(emissive),
        emissiveIntensity: Math.max(emissiveIntensity, 0.4),
        metalness: 0.8,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        fog: true
      });
      
    } else if (metallic) {
      // Enhanced metallic materials with environment reflections
      material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.9,
        roughness: roughness * 0.4,
        envMapIntensity: 2.5,
        transparent: transparent,
        alphaTest: alphaTest,
        side: THREE.DoubleSide,
        fog: true
      });
      
    } else {
      // Enhanced standard materials with better lighting
      material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: transparent,
        alphaTest: alphaTest,
        side: THREE.DoubleSide,
        shininess: 60,
        specular: 0x444444,
        fog: true,
        reflectivity: 0.2
      });
      
      // Add emissive glow if specified
      if (emissive !== 0x000000) {
        material.emissive = new THREE.Color(emissive);
        material.emissiveIntensity = Math.max(emissiveIntensity, 0.3);
      }
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

  // 2D compatibility methods
  getFramebuffer() { return this.fb; }
  supportsSpriteBatch() { return true; }

  queueSprite(img, sx, sy, sw, sh, dx, dy, scale = 1) {
    const gltex = this._getTexture(img);
    let arr = this.spriteBatches.get(gltex);
    if (!arr) { 
      arr = []; 
      this.spriteBatches.set(gltex, arr); 
    }
    arr.push({ sx, sy, sw, sh, dx, dy, scale, tex: gltex, iw: img.naturalWidth, ih: img.naturalHeight });
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
    for (const [tex, sprites] of this.spriteBatches) {
      for (const sprite of sprites) {
        // Simple sprite rendering to 2D framebuffer
        this.renderSpriteToFramebuffer(sprite);
      }
    }
  }

  renderSpriteToFramebuffer(sprite) {
    // Simple implementation - could be optimized
    const { sx, sy, sw, sh, dx, dy, scale } = sprite;
    // This would require implementing sprite rendering to the framebuffer
    // For now, this is a placeholder
  }

  // Performance stats
  getStats() {
    return {
      ...this.stats,
      memory: this.renderer.info.memory,
      render: this.renderer.info.render
    };
  }

  // N64-style post-processing
  enablePixelation(factor = 2) {
    this.renderer.setPixelRatio(1 / factor);
  }

  enableDithering(enabled = true) {
    this.renderer.dithering = enabled;
  }

  enableBloom(enabled = true) {
    // For now, just increase exposure for bloom-like effect
    if (enabled) {
      this.renderer.toneMappingExposure = 1.8;
    } else {
      this.renderer.toneMappingExposure = 1.4;
    }
  }

  enableMotionBlur(factor = 0.5) {
    // Motion blur would require post-processing pipeline
    // For now, just store the setting
    this.motionBlurFactor = factor;
  }

  // Animation system for dynamic materials and effects
  update(deltaTime) {
    const time = performance.now() * 0.001;
    
    // Update animated materials without complex shaders
    this.scene.traverse((object) => {
      if (object.material && object.material.userData.animated) {
        const material = object.material;
        
        // Animate texture offsets for flowing effects
        if (material.userData.animateTexture && material.map) {
          material.map.offset.x += deltaTime * 0.1;
          material.map.offset.y += deltaTime * 0.05;
        }
        
        // Animate emissive pulsing
        if (material.emissive && material.userData.holographic) {
          const intensity = 0.3 + Math.sin(time * 4) * 0.2;
          material.emissiveIntensity = intensity;
        }
      }
    });
    
    // Dynamic lighting effects
    if (this.lights) {
      // Subtle light movement for atmosphere
      this.lights.point1.position.x = 10 + Math.sin(time * 0.5) * 3;
      this.lights.point1.position.y = 15 + Math.cos(time * 0.7) * 2;
      
      this.lights.point2.position.x = -10 + Math.cos(time * 0.6) * 4;
      this.lights.point2.position.z = -10 + Math.sin(time * 0.4) * 3;
      
      // Color cycling for dramatic effect
      const hue1 = (time * 50) % 360;
      const hue2 = (time * 30 + 180) % 360;
      
      this.lights.fill2.color.setHSL(hue1 / 360, 0.7, 0.5);
      this.lights.fill3.color.setHSL(hue2 / 360, 0.6, 0.4);
    }
    
    // Fog animation for atmospheric depth
    if (this.scene.fog && this.scene.fog.density) {
      this.scene.fog.density = 0.008 + Math.sin(time * 0.5) * 0.002;
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