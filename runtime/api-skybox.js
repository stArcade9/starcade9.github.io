// Skybox API for Nova64 - Space, gradient, and solid sky backgrounds
import * as THREE from 'three';

export function skyboxApi(gpu) {
  const backendSkybox =
    typeof gpu.createSpaceSkybox === 'function' &&
    typeof gpu.createGradientSkybox === 'function' &&
    typeof gpu.createSolidSkybox === 'function' &&
    typeof gpu.clearSkybox === 'function'
      ? gpu
      : null;
  let skyboxMesh = null;
  let starField = null;
  let _rotSpeed = 1.0; // multiplier for animateSkybox speed
  let _auto = false; // enableSkyboxAutoAnimate flag
  let _unsupportedWarned = false;

  function _supportsSkybox() {
    if (backendSkybox) return true;
    const caps = gpu.getBackendCapabilities?.();
    if (caps && caps.skybox === false) return false;
    return (
      !!gpu.scene && typeof gpu.scene.add === 'function' && typeof gpu.scene.remove === 'function'
    );
  }

  function _warnUnsupportedSkybox(name) {
    if (_unsupportedWarned) return;
    _unsupportedWarned = true;
    console.warn(
      `[Nova64:WARN] ${name} is not supported by the active backend yet; skipping skybox setup`
    );
  }

  // ── Space skybox ────────────────────────────────────────────────────────────
  /**
   * Create a procedural space background with stars and optional nebula.
   * @param {object} [options]
   * @param {number} [options.starCount=1000]
   * @param {number} [options.starSize=2]
   * @param {boolean} [options.nebulae=true]
   * @param {number} [options.nebulaColor=0x4422aa]
   */
  function createSpaceSkybox(options = {}) {
    if (backendSkybox) {
      return backendSkybox.createSpaceSkybox(options);
    }
    if (!_supportsSkybox()) {
      _warnUnsupportedSkybox('createSpaceSkybox');
      return null;
    }
    const { starCount = 1000, starSize = 2, nebulae = true, nebulaColor = 0x4422aa } = options;

    _clearSky();

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    const starColors = [];

    for (let i = 0; i < starCount; i++) {
      const radius = 500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      const c = Math.random();
      if (c < 0.7) starColors.push(1, 1, 1);
      else if (c < 0.85) starColors.push(0.7, 0.8, 1);
      else if (c < 0.95) starColors.push(1, 1, 0.7);
      else starColors.push(1, 0.7, 0.6);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    starField = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        size: starSize,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
      })
    );
    gpu.scene.add(starField);

    if (nebulae) {
      skyboxMesh = _gradientSphere(0x000511, nebulaColor);
    }
    return { starField, skyboxMesh };
  }

  // ── Gradient skybox ─────────────────────────────────────────────────────────
  /**
   * Create a two-colour gradient sky (daylight, sunset, alien worlds, etc.).
   * @param {number} [topColor=0x1a6aa8]    - hex colour at the zenith
   * @param {number} [bottomColor=0xf48c60] - hex colour at the horizon
   */
  function createGradientSkybox(topColor = 0x1a6aa8, bottomColor = 0xf48c60) {
    if (topColor && typeof topColor === 'object') {
      bottomColor = topColor.bottomColor ?? bottomColor;
      topColor = topColor.topColor ?? 0x1a6aa8;
    }
    if (backendSkybox) {
      return backendSkybox.createGradientSkybox(topColor, bottomColor);
    }
    if (!_supportsSkybox()) {
      _warnUnsupportedSkybox('createGradientSkybox');
      return null;
    }
    _clearSky();
    skyboxMesh = _gradientSphere(topColor, bottomColor);
    return skyboxMesh;
  }

  // ── Solid-colour skybox ──────────────────────────────────────────────────────
  /**
   * Fill the background with a single colour (indoor, cave, void scenes).
   * @param {number} [color=0x000000]
   */
  function createSolidSkybox(color = 0x000000) {
    if (backendSkybox) {
      return backendSkybox.createSolidSkybox(color);
    }
    if (!_supportsSkybox()) {
      _warnUnsupportedSkybox('createSolidSkybox');
      return null;
    }
    _clearSky();
    gpu.scene.background = new THREE.Color(color);
    return gpu.scene.background;
  }

  // ── Image-based (cube map) skybox ────────────────────────────────────────────
  /**
   * Load a cube-map skybox from six image URLs.
   * The cube map is also wired up as the scene environment map so PBR metallic
   * surfaces automatically reflect the sky.
   *
   * @param {string[]} urls - Six face URLs in order: [+X, -X, +Y, -Y, +Z, -Z]
   *                          i.e. [right, left, top, bottom, front, back]
   * @returns {Promise<THREE.CubeTexture>} Resolves when all six faces are loaded.
   *
   * @example
   * await createImageSkybox([
   *   '/assets/sky/px.jpg', '/assets/sky/nx.jpg',
   *   '/assets/sky/py.jpg', '/assets/sky/ny.jpg',
   *   '/assets/sky/pz.jpg', '/assets/sky/nz.jpg',
   * ]);
   */
  function createImageSkybox(urls) {
    if (backendSkybox) {
      return backendSkybox.createImageSkybox(urls);
    }
    if (!_supportsSkybox()) {
      _warnUnsupportedSkybox('createImageSkybox');
      return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
      if (!Array.isArray(urls) || urls.length !== 6) {
        reject(
          new Error('createImageSkybox: requires exactly 6 face URLs [+X, -X, +Y, -Y, +Z, -Z]')
        );
        return;
      }

      _clearSky();

      const loader = new THREE.CubeTextureLoader();
      loader.load(
        urls,
        cubeTexture => {
          cubeTexture.colorSpace = THREE.SRGBColorSpace;
          gpu.scene.background = cubeTexture;

          // Process through PMREMGenerator so metallic/PBR surfaces reflect the sky
          try {
            const pmrem = new THREE.PMREMGenerator(gpu.renderer);
            pmrem.compileCubemapShader();
            gpu.scene.environment = pmrem.fromCubemap(cubeTexture).texture;
            pmrem.dispose();
          } catch (_) {
            // PMREM is optional; the skybox still renders without env reflections
          }

          resolve(cubeTexture);
        },
        undefined,
        err => reject(err)
      );
    });
  }

  // ── Shared gradient-sphere helper ────────────────────────────────────────────
  function _gradientSphere(topColor, bottomColor) {
    const geo = new THREE.SphereGeometry(800, 32, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(topColor) },
        bottomColor: { value: new THREE.Color(bottomColor) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h * 0.5 + 0.5, 0.0)), 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    gpu.scene.add(mesh);
    return mesh;
  }

  function _clearSky() {
    if (skyboxMesh) {
      gpu.scene.remove(skyboxMesh);
      skyboxMesh.geometry?.dispose();
      skyboxMesh.material?.dispose();
      skyboxMesh = null;
    }
    if (starField) {
      gpu.scene.remove(starField);
      starField.geometry?.dispose();
      starField.material?.dispose();
      starField = null;
    }
    if (gpu.scene.background instanceof THREE.Color) {
      gpu.scene.background = null;
    }
  }

  // ── Animation controls ───────────────────────────────────────────────────────
  /** Rotate the star-field one frame. Call in update(dt). */
  function animateSkybox(dt) {
    if (backendSkybox) {
      return backendSkybox.animateSkybox(dt);
    }
    if (starField) starField.rotation.y += dt * 0.01 * _rotSpeed;
  }

  /** Control star rotation speed (0 = frozen, 1 = default, -1 = reverse). */
  function setSkyboxSpeed(multiplier) {
    if (backendSkybox) {
      return backendSkybox.setSkyboxSpeed(multiplier);
    }
    _rotSpeed = multiplier;
  }

  /** Auto-animate skybox in the engine loop — no need to call animateSkybox manually. */
  function enableSkyboxAutoAnimate(speed = 1) {
    if (backendSkybox) {
      return backendSkybox.enableSkyboxAutoAnimate(speed);
    }
    _auto = true;
    _rotSpeed = speed;
  }
  function disableSkyboxAutoAnimate() {
    if (backendSkybox) {
      return backendSkybox.disableSkyboxAutoAnimate();
    }
    _auto = false;
  }

  function clearSkybox() {
    if (backendSkybox) {
      return backendSkybox.clearSkybox();
    }
    _clearSky();
  }

  // Internal: called by src/main.js every frame
  function _tick(dt) {
    if (backendSkybox && typeof backendSkybox.tickSkybox === 'function') {
      return backendSkybox.tickSkybox(dt);
    }
    if (_auto) animateSkybox(dt);
  }

  return {
    _tick,
    exposeTo(target) {
      Object.assign(target, {
        createSpaceSkybox,
        createGradientSkybox,
        createSolidSkybox,
        createImageSkybox,
        animateSkybox,
        setSkyboxSpeed,
        enableSkyboxAutoAnimate,
        disableSkyboxAutoAnimate,
        clearSkybox,
      });
    },
  };
}
