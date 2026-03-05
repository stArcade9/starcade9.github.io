// runtime/api-3d.js
// 3D API for Nova64 using Three.js backend
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function threeDApi(gpu) {
  // Only provide 3D API if GPU supports it
  if (!gpu.getScene) {
    return { exposeTo: () => {} };
  }

  const scene = gpu.getScene();
  const camera = gpu.getCamera();
  const renderer = gpu.getRenderer();

  // Mesh management
  const meshes = new Map();
  let meshIdCounter = 0;
  const mixers = new Map();
  const modelAnimations = new Map();

  // Material cache
  const materials = new Map();

  function createMesh(geometry, material, position = [0, 0, 0]) {
    if (!geometry || !material) {
      console.error('createMesh: geometry and material are required');
      return null;
    }
    
    let mesh;
    
    // Handle both real Three.js objects and mock objects
    if (geometry.type && !geometry.isBufferGeometry) {
      // This is a mock object, create a real mesh for testing
      mesh = {
        type: 'Mesh',
        geometry: geometry,
        material: material,
        position: { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; }},
        rotation: { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; }},
        scale: { 
          x: 1, y: 1, z: 1, 
          set: function(x, y, z) { this.x = x; this.y = y; this.z = z; },
          setScalar: function(s) { this.x = s; this.y = s; this.z = s; }
        },
        castShadow: true,
        receiveShadow: true
      };
    } else {
      // Real Three.js objects
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    
    // Ensure position is an array with 3 elements
    if (Array.isArray(position) && position.length >= 3) {
      mesh.position.set(position[0], position[1], position[2]);
    } else if (typeof position === 'object' && position.x !== undefined) {
      mesh.position.set(position.x, position.y || 0, position.z || 0);
    } else {
      mesh.position.set(0, 0, 0);
    }
    
    // Add to scene (scene.add handles both real and mock)
    if (scene.add) {
      scene.add(mesh);
    }
    
    const id = ++meshIdCounter;
    meshes.set(id, mesh);
    return id;
  }

  function destroyMesh(id) {
    const mesh = meshes.get(id);
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.dispose();
      meshes.delete(id);
      mixers.delete(id);
      modelAnimations.delete(id);
    }
  }

  function getMesh(id) {
    return meshes.get(id);
  }

  // Primitive creation functions with error handling
  function createCylinder(radiusTop = 1, radiusBottom = 1, height = 1, color = 0xffffff, position = [0, 0, 0], options = {}) {
    try {
      const geometry = gpu.createCylinderGeometry ? gpu.createCylinderGeometry(radiusTop, radiusBottom, height, options.segments || 16) : gpu.createBoxGeometry(radiusTop, height, radiusTop);
      
      const materialOptions = { ...options, color };
      const material = gpu.createN64Material(materialOptions);
      
      return createMesh(geometry, material, position);
    } catch (e) {
      console.error('createCylinder err', e);
      return createCube(radiusTop*2, color, position);
    }
  }

  function createCube(size = 1, color = 0xffffff, position = [0, 0, 0], options = {}) {
    try {
      // Validate inputs
      if (typeof size !== 'number' || size <= 0) {
        console.warn('createCube: invalid size, using default');
        size = 1;
      }
      if (typeof color !== 'number') {
        console.warn('createCube: invalid color, using white');
        color = 0xffffff;
      }
      
      const geometry = gpu.createBoxGeometry(size, size, size);
      const material = gpu.createN64Material({ color, ...options });
      return createMesh(geometry, material, position);
    } catch (error) {
      console.error('createCube failed:', error);
      return null;
    }
  }

  // Advanced cube with material options
  function createAdvancedCube(size = 1, materialOptions = {}, position = [0, 0, 0]) {
    try {
      if (typeof size !== 'number' || size <= 0) {
        size = 1;
      }
      
      const geometry = gpu.createBoxGeometry(size, size, size);
      const material = gpu.createN64Material(materialOptions);
      return createMesh(geometry, material, position);
    } catch (error) {
      console.error('createAdvancedCube failed:', error);
      return null;
    }
  }

  function createSphere(radius = 1, color = 0xffffff, position = [0, 0, 0], segments = 8, options = {}) {
    try {
      // Validate inputs
      if (typeof radius !== 'number' || radius <= 0) {
        console.warn('createSphere: invalid radius, using default');
        radius = 1;
      }
      if (typeof segments !== 'number' || segments < 3) {
        console.warn('createSphere: invalid segments, using default');
        segments = 8;
      }
      
      const geometry = gpu.createSphereGeometry(radius, segments);
      const material = gpu.createN64Material({ color, ...options });
      return createMesh(geometry, material, position);
    } catch (error) {
      console.error('createSphere failed:', error);
      return null;
    }
  }

  // Advanced sphere with material options
  function createAdvancedSphere(radius = 1, materialOptions = {}, position = [0, 0, 0], segments = 16) {
    try {
      if (typeof radius !== 'number' || radius <= 0) {
        radius = 1;
      }
      if (typeof segments !== 'number' || segments < 3) {
        segments = 16;
      }
      
      const geometry = gpu.createSphereGeometry(radius, segments);
      const material = gpu.createN64Material(materialOptions);
      return createMesh(geometry, material, position);
    } catch (error) {
      console.error('createAdvancedSphere failed:', error);
      return null;
    }
  }

  function createPlane(width = 1, height = 1, color = 0xffffff, position = [0, 0, 0]) {
    try {
      // Validate inputs
      if (typeof width !== 'number' || width <= 0) {
        console.warn('createPlane: invalid width, using default');
        width = 1;
      }
      if (typeof height !== 'number' || height <= 0) {
        console.warn('createPlane: invalid height, using default');
        height = 1;
      }
      
      const geometry = gpu.createPlaneGeometry(width, height);
      const material = gpu.createN64Material({ color });
      return createMesh(geometry, material, position);
    } catch (error) {
      console.error('createPlane failed:', error);
      return null;
    }
  }

  // Model loading
  async function loadModel(url, position = [0, 0, 0], scale = 1) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(...position);
          model.scale.setScalar(scale);
          
          // Apply N64-style materials
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              // Replace materials with N64-style versions
              if (child.material) {
                const n64Mat = gpu.createN64Material({
                  color: child.material.color,
                  texture: child.material.map
                });
                child.material = n64Mat;
              }
            }
          });
          
          scene.add(model);
          const id = ++meshIdCounter;
          meshes.set(id, model);
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            mixers.set(id, mixer);
            modelAnimations.set(id, gltf.animations);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
          }
          resolve(id);
        },
        undefined,
        reject
      );
    });
  }

  // Texture loading

  function playAnimation(meshId, nameOrIndex = 0, loop = true, timeScale = 1.0) {
    const mixer = mixers.get(meshId);
    if (!mixer) return;
    const animations = modelAnimations.get(meshId);
    if (!animations) return;
    let clip = null;
    if (typeof nameOrIndex === "number") {
      clip = animations[nameOrIndex];
    } else {
      clip = THREE.AnimationClip.findByName(animations, nameOrIndex);
    }
    if (clip) {
      mixer.stopAllAction();
      const action = mixer.clipAction(clip);
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
      action.timeScale = timeScale;
      action.play();
    }
  }

  function updateAnimations(dt) {
    mixers.forEach(mixer => mixer.update(dt));
  }

  function loadTexture(url) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        url,
        (texture) => {
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.generateMipmaps = false;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  // Transform functions with validation
  function setPosition(meshId, x, y, z) {
    try {
      const mesh = getMesh(meshId);
      if (!mesh) {
        console.warn(`setPosition: mesh with id ${meshId} not found`);
        return false;
      }
      
      // Validate numeric inputs
      x = typeof x === 'number' ? x : 0;
      y = typeof y === 'number' ? y : 0;
      z = typeof z === 'number' ? z : 0;
      
      mesh.position.set(x, y, z);
      return true;
    } catch (error) {
      console.error('setPosition failed:', error);
      return false;
    }
  }

  function setRotation(meshId, x, y, z) {
    try {
      const mesh = getMesh(meshId);
      if (!mesh) {
        console.warn(`setRotation: mesh with id ${meshId} not found`);
        return false;
      }
      
      // Validate numeric inputs
      x = typeof x === 'number' ? x : 0;
      y = typeof y === 'number' ? y : 0;
      z = typeof z === 'number' ? z : 0;
      
      mesh.rotation.set(x, y, z);
      return true;
    } catch (error) {
      console.error('setRotation failed:', error);
      return false;
    }
  }

  function setScale(meshId, x, y, z) {
    try {
      const mesh = getMesh(meshId);
      if (!mesh) {
        console.warn(`setScale: mesh with id ${meshId} not found`);
        return false;
      }
      
      // Validate numeric inputs
      x = typeof x === 'number' && x > 0 ? x : 1;
      
      if (typeof y === 'undefined') {
        mesh.scale.setScalar(x);
      } else {
        y = typeof y === 'number' && y > 0 ? y : 1;
        z = typeof z === 'number' && z > 0 ? z : 1;
        mesh.scale.set(x, y, z);
      }
      return true;
    } catch (error) {
      console.error('setScale failed:', error);
      return false;
    }
  }

  function getPosition(meshId) {
    const mesh = getMesh(meshId);
    return mesh ? [mesh.position.x, mesh.position.y, mesh.position.z] : null;
  }

  function getRotation(meshId) {
    const mesh = getMesh(meshId);
    return mesh ? [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z] : null;
  }

  // Additional transform functions
  function rotateMesh(meshId, deltaX, deltaY, deltaZ) {
    try {
      const mesh = getMesh(meshId);
      if (!mesh) {
        console.warn(`rotateMesh: mesh with id ${meshId} not found`);
        return false;
      }
      
      // Validate numeric inputs
      deltaX = typeof deltaX === 'number' ? deltaX : 0;
      deltaY = typeof deltaY === 'number' ? deltaY : 0;
      deltaZ = typeof deltaZ === 'number' ? deltaZ : 0;
      
      mesh.rotation.x += deltaX;
      mesh.rotation.y += deltaY;
      mesh.rotation.z += deltaZ;
      return true;
    } catch (error) {
      console.error('rotateMesh failed:', error);
      return false;
    }
  }

  // Camera controls 
  function setCameraPosition(x, y, z) {
    gpu.setCameraPosition(x, y, z);
  }

  function setCameraTarget(x, y, z) {
    gpu.setCameraTarget(x, y, z);
  }

  function setCameraFOV(fov) {
    gpu.setCameraFOV(fov);
  }

  // Scene controls
  function setFog(color, near = 10, far = 50) {
    gpu.setFog(color, near, far);
  }

  function clearFog() {
    if (scene) scene.fog = null;
  }

  function setLightDirection(x, y, z) {
    gpu.setLightDirection(x, y, z);
  }

  function setLightColor(color) {
    if (gpu.setLightColor) {
      gpu.setLightColor(color);
    }
  }

  function setAmbientLight(color, intensity) {
    if (gpu.setAmbientLight) {
      gpu.setAmbientLight(color, intensity);
    }
  }

  function setDirectionalLight(direction, color = 0xffffff, intensity = 1.0) {
    // Remove existing directional lights
    const lightsToRemove = [];
    scene.children.forEach(child => {
      if (child.type === 'DirectionalLight') {
        lightsToRemove.push(child);
      }
    });
    lightsToRemove.forEach(light => scene.remove(light));
    
    // Add new directional light
    const directionalLight = new THREE.DirectionalLight(color, intensity);
    if (Array.isArray(direction) && direction.length >= 3) {
      directionalLight.position.set(direction[0], direction[1], direction[2]);
    } else {
      directionalLight.position.set(1, 2, 1);
    }
    scene.add(directionalLight);
  }

  function setCameraLookAt(direction) {
    // Set camera to look in a specific direction (for first-person view)
    if (Array.isArray(direction) && direction.length >= 3) {
      const lookTarget = {
        x: camera.position.x + direction[0],
        y: camera.position.y + direction[1],
        z: camera.position.z + direction[2]
      };
      camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
    } else if (typeof direction === 'object' && direction.x !== undefined) {
      const lookTarget = {
        x: camera.position.x + direction.x,
        y: camera.position.y + direction.y,
        z: camera.position.z + direction.z
      };
      camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
    }
  }

  function clearScene() {
    console.log('🧹 Clearing 3D scene... Current meshes:', meshes.size);
    
    // Remove ALL meshes including lights - complete clean slate
    for (const [, mesh] of meshes) {
      scene.remove(mesh);
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        // Handle both single materials and material arrays
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => {
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
        } else {
          if (mesh.material.map) mesh.material.map.dispose();
          mesh.material.dispose();
        }
      }
    }
    meshes.clear();
    
    // Clear all children from scene (in case anything was added directly)
    while (scene.children.length > 0) {
      const child = scene.children[0];
      scene.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    
    // Re-add basic lighting so scenes aren't completely dark
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    console.log('✅ Scene cleared completely');
  }

  // Animation helpers (duplicate removed - already defined above)

  function moveMesh(meshId, x, y, z) {
    const mesh = getMesh(meshId);
    if (mesh) {
      mesh.position.x += x;
      mesh.position.y += y;
      mesh.position.z += z;
    }
  }

  // N64-style effects
  function enablePixelation(factor = 2) {
    gpu.enablePixelation(factor);
  }

  function enableDithering(enabled = true) {
    gpu.enableDithering(enabled);
  }

  // NOTE: enableBloom is intentionally NOT defined here.
  // The real UnrealBloomPass implementation lives in api-effects.js and
  // is exposed to globalThis by that module. Defining a stub here would
  // only overwrite the real one depending on init order.

  // === NEW: flat shading ===
  function setFlatShading(meshId, enabled = true) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    if (mesh.material) {
      mesh.material.flatShading = enabled;
      mesh.material.needsUpdate = true;
    }
    return true;
  }

  // === NEW: visibility / opacity / shadow per-mesh ===
  function setMeshVisible(meshId, visible) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    mesh.visible = visible;
    return true;
  }

  function setMeshOpacity(meshId, opacity) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    if (mesh.material) {
      mesh.material.transparent = opacity < 1;
      mesh.material.opacity = opacity;
      mesh.material.needsUpdate = true;
    }
    return true;
  }

  function setCastShadow(meshId, cast) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    mesh.castShadow = cast;
    return true;
  }

  function setReceiveShadow(meshId, receive) {
    const mesh = getMesh(meshId);
    if (!mesh) return false;
    mesh.receiveShadow = receive;
    return true;
  }

  // === NEW: createTorus ===
  function createTorus(x = 0, y = 0, z = 0, radius = 1, tube = 0.3, color = 0xffffff, options = {}) {
    try {
      const geometry = new THREE.TorusGeometry(radius, tube, options.radialSegments || 8, options.tubularSegments || 16);
      const material = gpu.createN64Material({ color, ...options });
      return createMesh(geometry, material, [x, y, z]);
    } catch (e) {
      console.error('createTorus failed:', e);
      return null;
    }
  }

  // === NEW: dynamic point lights from carts ===
  const cartLights = new Map();
  let lightIdCounter = 0;

  function createPointLight(color = 0xffffff, intensity = 2, distance = 20, x = 0, y = 0, z = 0) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(x, y, z);
    scene.add(light);
    const id = ++lightIdCounter;
    cartLights.set(id, light);
    return id;
  }

  function setPointLightPosition(lightId, x, y, z) {
    const light = cartLights.get(lightId);
    if (!light) return false;
    light.position.set(x, y, z);
    return true;
  }

  function setPointLightColor(lightId, color) {
    const light = cartLights.get(lightId);
    if (!light) return false;
    light.color.setHex(color);
    return true;
  }

  function removeLight(lightId) {
    const light = cartLights.get(lightId);
    if (!light) return false;
    scene.remove(light);
    cartLights.delete(lightId);
    return true;
  }

  // Raycasting for object picking
  function raycastFromCamera(x, y) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Convert screen coordinates to normalized device coordinates
    mouse.x = (x / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(y / renderer.domElement.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const objects = Array.from(meshes.values()).filter(mesh => mesh.type === 'Mesh');
    const intersects = raycaster.intersectObjects(objects);
    
    if (intersects.length > 0) {
      // Find the mesh ID
      const hitMesh = intersects[0].object;
      for (const [id, mesh] of meshes) {
        if (mesh === hitMesh) {
          return {
            meshId: id,
            point: intersects[0].point,
            distance: intersects[0].distance
          };
        }
      }
    }
    return null;
  }

  // Performance monitoring
  function get3DStats() {
    return gpu.getStats();
  }

  /**
   * setupScene(opts)
   * One-call to configure camera, lighting, fog, and skybox.
   * opts: {
   *   camera:  { x, y, z, targetX, targetY, targetZ, fov } (default: 0,5,10 looking at 0,0,0)
   *   light:   { direction: [x,y,z], color: hex, ambient: hex } (default: directional white + grey ambient)
   *   fog:     { color: hex, near, far } | false               (default: false)
   *   skybox:  { starCount, starSize, nebulae, nebulaColor } | false (default: false)
   *   effects: opts for enableRetroEffects() | false            (default: false)
   * }
   */
  function setupScene(opts = {}) {
    // Camera
    const cam = opts.camera ?? {};
    setCameraPosition(cam.x ?? 0, cam.y ?? 5, cam.z ?? 10);
    setCameraTarget(cam.targetX ?? 0, cam.targetY ?? 0, cam.targetZ ?? 0);
    if (cam.fov) setCameraFOV(cam.fov);

    // Lighting
    const light = opts.light ?? {};
    if (light.direction) {
      const d = light.direction;
      setLightDirection(d[0] ?? -0.3, d[1] ?? -1, d[2] ?? -0.5);
    }
    if (light.color !== undefined) setLightColor(light.color);
    if (light.ambient !== undefined) setAmbientLight(light.ambient);

    // Fog
    if (opts.fog && opts.fog !== false) {
      setFog(opts.fog.color ?? 0x000000, opts.fog.near ?? 10, opts.fog.far ?? 50);
    }

    // Skybox — delegate to globalThis if available
    if (opts.skybox && opts.skybox !== false && typeof globalThis.createSpaceSkybox === 'function') {
      globalThis.createSpaceSkybox(opts.skybox);
    }

    // Effects — delegate to globalThis if available
    if (opts.effects && opts.effects !== false && typeof globalThis.enableRetroEffects === 'function') {
      globalThis.enableRetroEffects(typeof opts.effects === 'object' ? opts.effects : {});
    }
  }

  return {
    exposeTo(target) {
      Object.assign(target, {
        // Primitive creation
        createCube,
        createSphere, 
        createCylinder,
        createPlane,
        
        // Advanced primitive creation with material options
        createAdvancedCube,
        createAdvancedSphere,
        
        // Mesh management
        destroyMesh,
        
        // Model and texture loading
        loadModel,
        playAnimation,
        updateAnimations,
        loadTexture,
        
        // Transforms
        setPosition,
        setRotation,
        setScale,
        getPosition,
        getRotation,
        rotateMesh,
        moveMesh,
        
        // Camera
        setCameraPosition,
        setCameraTarget,
        setCameraLookAt,
        setCameraFOV,
        
        // Scene
        setFog,
        clearFog,
        setLightDirection,
        setLightColor,
        setAmbientLight,
        setDirectionalLight,
        clearScene,
        
        // Effects
        enablePixelation,
        enableDithering,

        // Mesh helpers
        setFlatShading,
        setMeshVisible,
        setMeshOpacity,
        setCastShadow,
        setReceiveShadow,

        // Extra primitives
        createTorus,

        // Dynamic lights
        createPointLight,
        setPointLightPosition,
        setPointLightColor,
        removeLight,

        // Interaction
        raycastFromCamera,
        
        // Stats
        get3DStats,

        // Convenience
        setupScene,

        // Direct Three.js access for advanced users
        getScene: () => scene,
        getCamera: () => camera,
        getRenderer: () => renderer,
        getMesh
      });
    }
  };
}