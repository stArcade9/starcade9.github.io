// Skybox API for Nova64 - Space, gradient, and solid sky backgrounds
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

// ── Procedural sky shaders ───────────────────────────────────────────────────
import {
  DOME_VERT,
  GRADIENT_FRAG,
  NOISE_GLSL,
  SPACE_FRAG,
  STAR_FRAG,
  STAR_VERT,
} from './sky-shaders.js';

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
  let _envTarget = null; // WebGLCubeRenderTarget owned by createEnvironmentSkybox
  let _hdrTexture = null;
  let _domeEnv = false; // scene.environment was baked from a procedural dome // equirect DataTexture owned by createHDRSkybox

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
    const {
      starCount = 1000,
      starSize = 2,
      nebulaColor = 0x4422aa,
      nebulaIntensity = 1,
      milkyWay = true,
      seed = Math.random() * 100,
    } = options;
    const nebulae = options.nebulae ?? options.nebula ?? true;

    _clearSky();

    // Bright foreground stars: soft round sprites with diffraction spikes + twinkle.
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starPhase = new Float32Array(starCount);
    // Rough blackbody palette: blue-white O/B through orange K/M.
    const palette = [
      [0.62, 0.72, 1.0, 0.12],
      [0.8, 0.86, 1.0, 0.2],
      [1.0, 1.0, 1.0, 0.33],
      [1.0, 0.95, 0.82, 0.18],
      [1.0, 0.82, 0.6, 0.11],
      [1.0, 0.62, 0.48, 0.06],
    ];
    const bandN = new THREE.Vector3(0.3, 1, 0.45).normalize();
    for (let i = 0; i < starCount; i++) {
      // Bias ~40% of stars toward the galactic band so the sky has structure.
      let x, y, z;
      for (let tries = 0; tries < 4; tries++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = Math.sin(phi) * Math.cos(theta);
        y = Math.sin(phi) * Math.sin(theta);
        z = Math.cos(phi);
        const off = Math.abs(x * bandN.x + y * bandN.y + z * bandN.z);
        if (!milkyWay || Math.random() > 0.4 || off < 0.25) break;
      }
      const radius = 420 + Math.random() * 260;
      starPositions.set([x * radius, y * radius, z * radius], i * 3);
      let r = Math.random();
      let c = palette[palette.length - 1];
      for (const entry of palette) {
        if ((r -= entry[3]) <= 0) {
          c = entry;
          break;
        }
      }
      starColors.set([c[0], c[1], c[2]], i * 3);
      // Power-law magnitudes: lots of faint stars, a handful of bright ones.
      starSizes[i] = 0.6 + Math.pow(Math.random(), 9) * 5.5;
      starPhase[i] = Math.random();
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));

    starField = new THREE.Points(
      starGeometry,
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: starSize * 3.0 },
          uScale: { value: _pixelScale() },
        },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      })
    );
    starField.frustumCulled = false;
    starField.renderOrder = -999;
    gpu.scene.add(starField);

    const base = new THREE.Color(nebulaColor);
    const nebB = base.clone().offsetHSL(0.12, 0.1, 0.08);
    const nebC = base.clone().offsetHSL(-0.42, -0.1, 0.12);
    // Keep the nebula vivid even when a cart passes a very dark tint.
    for (const col of [base, nebB, nebC]) {
      const hsl = {};
      col.getHSL(hsl);
      col.setHSL(hsl.h, Math.max(hsl.s, 0.55), Math.min(Math.max(hsl.l, 0.38), 0.6));
    }
    skyboxMesh = _skyDome(SPACE_FRAG, {
      uNebA: { value: base },
      uNebB: { value: nebB },
      uNebC: { value: nebC },
      uNebula: { value: nebulae ? nebulaIntensity : 0 },
      uMilky: { value: milkyWay ? 1 : 0 },
      uSeed: { value: seed },
    });
    if (options.reflect !== false) _bakeDomeEnvironment(skyboxMesh, options.reflectIntensity ?? 1);
    return { starField, skyboxMesh };
  }

  // ── Gradient skybox ─────────────────────────────────────────────────────────
  /**
   * Create a two-colour gradient sky (daylight, sunset, alien worlds, etc.).
   * @param {number} [topColor=0x1a6aa8]    - hex colour at the zenith
   * @param {number} [bottomColor=0xf48c60] - hex colour at the horizon
   */
  function createGradientSkybox(topColor = 0x1a6aa8, bottomColor = 0xf48c60, extra) {
    let opts = {};
    if (topColor && typeof topColor === 'object') {
      opts = topColor;
      bottomColor = opts.bottomColor ?? bottomColor;
      topColor = opts.topColor ?? 0x1a6aa8;
    } else if (extra && typeof extra === 'object') {
      opts = extra;
    } else if (typeof extra === 'number') {
      opts = { horizonColor: extra };
    }
    if (backendSkybox) {
      return backendSkybox.createGradientSkybox(topColor, bottomColor, opts);
    }
    if (!_supportsSkybox()) {
      _warnUnsupportedSkybox('createGradientSkybox');
      return null;
    }
    _clearSky();
    const top = new THREE.Color(topColor);
    const bottom = new THREE.Color(bottomColor);
    const horizon =
      opts.horizonColor !== undefined
        ? new THREE.Color(opts.horizonColor)
        : bottom.clone().lerp(new THREE.Color(0xffffff), 0.18);
    const lum = top.r * 0.2126 + top.g * 0.7152 + top.b * 0.0722;
    const sun = opts.sun;
    const sunDir = new THREE.Vector3(...((sun && sun.dir) || [-0.4, 0.12, -1])).normalize();
    skyboxMesh = _skyDome(GRADIENT_FRAG, {
      uTop: { value: top },
      uBottom: { value: bottom },
      uHorizon: { value: horizon },
      uSunDir: { value: sunDir },
      uSunColor: { value: new THREE.Color((sun && sun.color) ?? 0xffd9a0) },
      uSunSize: { value: sun ? (sun.size ?? 1) : 0 },
      uClouds: { value: opts.clouds ?? 0.5 },
      uToon: { value: opts.toon ?? 0 },
      uBands: { value: opts.toonBands ?? 3 },
      uCloudScale: { value: opts.cloudScale ?? 0.9 },
      uCloudLow: { value: opts.cloudsLow ?? 0 },
      uWind: { value: opts.wind ?? 1 },
      uRays: { value: opts.rays ?? 0 },
      uRainbow: { value: opts.rainbow ?? 0 },
      uOcean: { value: opts.ocean ? 1 : 0 },
      uDeep: { value: new THREE.Color(opts.oceanColor ?? 0x0a3a5a) },
      uWaves: { value: opts.waves ?? 6 },
      uOutline: { value: opts.outline ?? 0 },
      uInk: { value: new THREE.Color(opts.inkColor ?? 0x1a2a55) },
      uSkyBands: { value: opts.skyBands ?? 0 },
      uAurora: { value: opts.aurora ?? 0 },
      uAuroraA: { value: new THREE.Color(opts.auroraColors?.[0] ?? 0x2bff9a) },
      uAuroraB: { value: new THREE.Color(opts.auroraColors?.[1] ?? 0xa04bff) },
      uMeteors: { value: opts.meteors ?? 0 },
      // Auto night-sky stars when the zenith is dark.
      uStars: { value: opts.stars ?? Math.max(0, Math.min(1, 1 - lum * 6)) },
      uSeed: { value: opts.seed ?? Math.random() * 100 },
    });

    // Reflections come from the sky itself, so metals pick up its colours.
    if (opts.reflect !== false) _bakeDomeEnvironment(skyboxMesh, opts.reflectIntensity ?? 1);

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
            const next = pmrem.fromCubemap(cubeTexture).texture;
            pmrem.dispose();
            gpu.scene.environment?.dispose();
            gpu.scene.environment = next;
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

  // ── Environment skybox (drives reflections + refraction) ─────────────────────
  // Presets: a sky dome plus glowing light panels/sun at HDR brightness. The
  // scene is rendered into a cube map for the visible background and
  // pre-filtered (PMREM) into scene.environment, so metals reflect, and glass
  // refracts, exactly the sky you see.
  const ENV_PRESETS = {
    neon: {
      top: 0x12063a,
      horizon: 0xc2188f,
      bottom: 0x05020d,
      panels: [
        { color: 0x22e6ff, intensity: 6, pos: [-9, 3, -6], size: [2, 12], rotY: 0.9 },
        { color: 0xff2bd6, intensity: 6, pos: [9, 3, -6], size: [2, 12], rotY: -0.9 },
        { color: 0xffffff, intensity: 4, pos: [0, 11, 0], size: [10, 4], rotX: Math.PI / 2 },
        { color: 0x6a5cff, intensity: 3, pos: [0, 2, 12], size: [16, 3], rotY: Math.PI },
      ],
    },
    sunset: {
      top: 0x1b2a6b,
      horizon: 0xff8a3d,
      bottom: 0x2b160d,
      sun: { color: 0xffc27a, intensity: 14, dir: [-0.6, 0.18, -1], radius: 3 },
      panels: [
        { color: 0x9fc7ff, intensity: 1.5, pos: [0, 12, 0], size: [18, 18], rotX: Math.PI / 2 },
      ],
    },
    aurora: {
      top: 0x02122a,
      horizon: 0x0fd9a6,
      bottom: 0x020409,
      panels: [
        { color: 0x29ffb0, intensity: 5, pos: [-6, 9, -10], size: [16, 2], rotX: 0.5 },
        { color: 0xa65cff, intensity: 4, pos: [6, 10, -8], size: [12, 2], rotX: 0.6 },
        { color: 0xffffff, intensity: 2.5, pos: [0, 4, 12], size: [8, 4], rotY: Math.PI },
      ],
    },
    studio: {
      top: 0x3a3f4a,
      horizon: 0x8a909c,
      bottom: 0x1c1e22,
      panels: [
        { color: 0xffffff, intensity: 8, pos: [0, 10, 2], size: [8, 4], rotX: Math.PI / 2 },
        { color: 0xffe9d0, intensity: 5, pos: [-10, 4, 0], size: [3, 8], rotY: Math.PI / 2 },
        { color: 0xd0e4ff, intensity: 4, pos: [10, 4, 0], size: [3, 8], rotY: -Math.PI / 2 },
      ],
    },
  };

  function _bigintToHex(c) {
    const r = Math.round(Number((c >> 48n) & 0xffffn) / 257);
    const g = Math.round(Number((c >> 32n) & 0xffffn) / 257);
    const b = Math.round(Number((c >> 16n) & 0xffffn) / 257);
    return (r << 16) | (g << 8) | b;
  }

  function _envDome(top, horizon, bottom) {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(top) },
        uHorizon: { value: new THREE.Color(horizon) },
        uBottom: { value: new THREE.Color(bottom) },
      },
      vertexShader:
        'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; varying vec3 vDir;' +
        'void main(){ float h = vDir.y; vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(h, 0.6)) : mix(uHorizon, uBottom, pow(-h, 0.4));' +
        ' gl_FragColor = vec4(c, 1.0); }',
    });
    return new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), mat);
  }

  /**
   * Create a vivid procedural skybox that also lights PBR materials.
   * @param {'neon'|'sunset'|'aurora'|'studio'} [preset='neon']
   * @param {object} [opts]
   * @param {number} [opts.top]        sky colour overhead
   * @param {number} [opts.horizon]    colour at the horizon
   * @param {number} [opts.bottom]     colour below
   * @param {number} [opts.intensity=1]  multiplies every light panel / the sun
   * @param {number} [opts.blur=0]     0..1, blur the visible sky (reflections stay sharp)
   * @param {number} [opts.resolution=512] cube face size
   * @returns {object|null} the cube texture used as the background
   */
  function createEnvironmentSkybox(preset = 'neon', opts = {}) {
    if (preset && typeof preset === 'object') {
      opts = preset;
      preset = opts.preset || 'neon';
    }
    const p = ENV_PRESETS[preset] || ENV_PRESETS.neon;
    const hex = (v, d) =>
      v === undefined || v === null ? d : typeof v === 'bigint' ? _bigintToHex(v) : v;
    const top = hex(opts.top, p.top);
    const horizon = hex(opts.horizon, p.horizon);
    const bottom = hex(opts.bottom, p.bottom);
    if (backendSkybox) {
      // Babylon: no cube-render path here yet; keep the look with its gradient sky.
      return backendSkybox.createGradientSkybox(top, horizon);
    }
    if (!_supportsSkybox() || !gpu.renderer) {
      _warnUnsupportedSkybox('createEnvironmentSkybox');
      return null;
    }
    _clearSky();
    const gain = typeof opts.intensity === 'number' ? opts.intensity : 1;
    const envScene = new THREE.Scene();
    envScene.add(_envDome(top, horizon, bottom));
    for (const panel of p.panels || []) {
      const m = new THREE.MeshBasicMaterial({
        color: new THREE.Color(panel.color).multiplyScalar(panel.intensity * gain),
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(panel.size[0], panel.size[1]), m);
      mesh.position.set(...panel.pos);
      mesh.rotation.set(panel.rotX || 0, panel.rotY || 0, 0);
      envScene.add(mesh);
    }
    if (p.sun) {
      const d = new THREE.Vector3(...p.sun.dir).normalize().multiplyScalar(40);
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(p.sun.radius, 24, 12),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(p.sun.color).multiplyScalar(p.sun.intensity * gain),
          toneMapped: false,
        })
      );
      sun.position.copy(d);
      envScene.add(sun);
    }

    const size = Math.max(64, Math.min(2048, opts.resolution || 512));
    _envTarget = new THREE.WebGLCubeRenderTarget(size, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 100, _envTarget);
    cubeCamera.update(gpu.renderer, envScene);
    gpu.scene.background = _envTarget.texture;
    if ('backgroundBlurriness' in gpu.scene) {
      gpu.scene.backgroundBlurriness = Math.max(0, Math.min(1, opts.blur || 0));
    }
    try {
      const pmrem = new THREE.PMREMGenerator(gpu.renderer);
      const next = pmrem.fromScene(envScene, 0.02).texture;
      pmrem.dispose();
      gpu.scene.environment?.dispose();
      gpu.scene.environment = next;
    } catch (_) {
      // Reflections are a bonus; the sky still renders without them.
    }
    envScene.traverse(o => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
    return _envTarget.texture;
  }

  // ── HDR photo skybox (equirectangular .hdr, e.g. Poly Haven CC0) ─────────────
  /**
   * Load a real HDR panorama as the sky AND the reflection/refraction map.
   * Bundled: /assets/sky/hdr/{neon_photostudio,studio_small_09,venice_sunset,
   * kloppenheim_06_puresky}_1k.hdr (CC0, see public/assets/sky/hdr/CREDITS.md).
   * @param {string} url
   * @param {object} [opts]
   * @param {number} [opts.blur=0]       0..1, blur the visible sky only
   * @param {number} [opts.intensity=1]  scales background + reflections
   * @param {number} [opts.rotation=0]   radians, spin the panorama
   * @returns {Promise<object|null>} resolves with the texture once loaded
   */
  function createHDRSkybox(url, opts = {}) {
    if (backendSkybox) {
      // Babylon: keep a pleasant fallback until it gets an HDR path.
      return Promise.resolve(backendSkybox.createGradientSkybox(0x1a6aa8, 0xf48c60));
    }
    if (!_supportsSkybox() || !gpu.renderer) {
      _warnUnsupportedSkybox('createHDRSkybox');
      return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
      new HDRLoader().load(
        url,
        texture => {
          _clearSky();
          texture.mapping = THREE.EquirectangularReflectionMapping;
          _hdrTexture = texture;
          gpu.scene.background = texture;
          const intensity = typeof opts.intensity === 'number' ? opts.intensity : 1;
          if ('backgroundBlurriness' in gpu.scene) {
            gpu.scene.backgroundBlurriness = Math.max(0, Math.min(1, opts.blur || 0));
          }
          if ('backgroundIntensity' in gpu.scene) gpu.scene.backgroundIntensity = intensity;
          if ('environmentIntensity' in gpu.scene) gpu.scene.environmentIntensity = intensity;
          if (typeof opts.rotation === 'number') {
            if (gpu.scene.backgroundRotation) gpu.scene.backgroundRotation.y = opts.rotation;
            if (gpu.scene.environmentRotation) gpu.scene.environmentRotation.y = opts.rotation;
          }
          try {
            const pmrem = new THREE.PMREMGenerator(gpu.renderer);
            const next = pmrem.fromEquirectangular(texture).texture;
            pmrem.dispose();
            gpu.scene.environment?.dispose();
            gpu.scene.environment = next;
          } catch (_) {
            // Reflections are a bonus.
          }
          resolve(texture);
        },
        undefined,
        err => reject(err)
      );
    });
  }

  // ── Shared procedural sky dome ───────────────────────────────────────────────
  function _pixelScale() {
    const h = gpu.renderer?.domElement?.height || 600;
    return h * 0.5;
  }

  function _skyDome(fragmentShader, uniforms) {
    const geo = new THREE.SphereGeometry(750, 64, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, ...uniforms },
      vertexShader: DOME_VERT,
      fragmentShader: NOISE_GLSL + fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -1000;
    gpu.scene.add(mesh);
    return mesh;
  }

  // Render a procedural dome into scene.environment so PBR metals and glass
  // reflect the sky you actually see (not the default studio room).
  function _bakeDomeEnvironment(dome, intensity = 1) {
    if (!gpu.renderer || !dome) return;
    try {
      const envScene = new THREE.Scene();
      const geo = new THREE.SphereGeometry(50, 64, 32);
      envScene.add(new THREE.Mesh(geo, dome.material));
      const pmrem = new THREE.PMREMGenerator(gpu.renderer);
      const next = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
      pmrem.dispose();
      geo.dispose();
      gpu.scene.environment?.dispose();
      gpu.scene.environment = next;
      _domeEnv = true;
      if ('environmentIntensity' in gpu.scene) gpu.scene.environmentIntensity = intensity;
    } catch (_) {
      // Reflections are a bonus; the sky still renders without them.
    }
  }

  // Keep the sky centred on the camera so it never parallaxes or clips.
  function _followCamera(dt) {
    const cam = gpu.camera;
    for (const obj of [skyboxMesh, starField]) {
      if (!obj) continue;
      if (cam) obj.position.copy(cam.position);
      const u = obj.material?.uniforms;
      if (u?.uTime) u.uTime.value += dt;
      if (u?.uScale) u.uScale.value = _pixelScale();
    }
  }

  // Back to the RoomEnvironment reflections the renderer starts with.
  function _restoreDefaultEnvironment() {
    try {
      const pmrem = new THREE.PMREMGenerator(gpu.renderer);
      const next = pmrem.fromScene(new RoomEnvironment()).texture;
      pmrem.dispose();
      gpu.scene.environment?.dispose();
      gpu.scene.environment = next;
    } catch (_) {
      // optional
    }
  }

  function _clearSky() {
    if (_hdrTexture) {
      if (gpu.scene.background === _hdrTexture) gpu.scene.background = null;
      if ('backgroundIntensity' in gpu.scene) gpu.scene.backgroundIntensity = 1;
      if ('environmentIntensity' in gpu.scene) gpu.scene.environmentIntensity = 1;
      if (gpu.scene.backgroundRotation) gpu.scene.backgroundRotation.y = 0;
      if (gpu.scene.environmentRotation) gpu.scene.environmentRotation.y = 0;
      _hdrTexture.dispose();
      _hdrTexture = null;
      if (!_envTarget) _restoreDefaultEnvironment();
    }
    if (_envTarget) {
      if (gpu.scene.background === _envTarget.texture) gpu.scene.background = null;
      if ('backgroundBlurriness' in gpu.scene) gpu.scene.backgroundBlurriness = 0;
      _envTarget.dispose();
      _envTarget = null;
      // Don't leak this sky's reflections into the next cart.
      _restoreDefaultEnvironment();
    }
    if (_domeEnv) {
      _domeEnv = false;
      _restoreDefaultEnvironment();
    }
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
    if ('environmentIntensity' in gpu.scene) gpu.scene.environmentIntensity = 1;
  }

  // ── Named sky presets ───────────────────────────────────────────────────────
  const SKY_PRESETS = {
    deepspace: { kind: 'space', starCount: 2500, nebulaColor: 0x8a2be2, nebulaIntensity: 1.3 },
    cosmos: {
      kind: 'space',
      starCount: 3500,
      starSize: 2.4,
      nebulaColor: 0xff3fa4,
      nebulaIntensity: 1.35,
    },
    sunset: {
      top: 0x1a1050,
      bottom: 0xff6a2a,
      horizonColor: 0xffb070,
      clouds: 0.7,
      rays: 0.6,
      sun: { dir: [0, 0.1, -1], color: 0xffc080, size: 1.6 },
    },
    ocean: {
      top: 0x1f6fd1,
      bottom: 0x8fd3ff,
      horizonColor: 0xdff4ff,
      clouds: 0.55,
      cloudsLow: 0.8,
      cloudScale: 1.1,
      ocean: true,
      oceanColor: 0x05506e,
      waves: 7,
      sun: { dir: [0.5, 0.22, -1], color: 0xfff1c8, size: 1.3 },
    },
    meadow: {
      top: 0x1e7bff,
      bottom: 0x8fe0ff,
      horizonColor: 0xf0fdff,
      clouds: 0.4,
      toon: 1,
      toonBands: 2,
      cloudScale: 0.42,
      cloudsLow: 0.5,
      wind: 2.5,
      rainbow: 1,
      stars: 0,
      outline: 1,
      inkColor: 0x1c3f8a,
      skyBands: 7,
      sun: { dir: [-0.3, 0.55, -1], color: 0xfff3b0, size: 2.2 },
    },
    highlands: {
      top: 0x2f6fc8,
      bottom: 0x8cc8ee,
      horizonColor: 0xffd29a,
      clouds: 0.75,
      toon: 0.85,
      toonBands: 3,
      cloudsLow: 0.6,
      cloudScale: 0.55,
      rays: 0.6,
      outline: 0.35,
      inkColor: 0x40507a,
      sun: { dir: [0.6, 0.16, -1], color: 0xffd28a, size: 2 },
    },
    aurora: {
      top: 0x020818,
      bottom: 0x0b2a3a,
      horizonColor: 0x1c5a5a,
      clouds: 0.25,
      stars: 1,
      aurora: 1.2,
      meteors: 1,
      ocean: true,
      oceanColor: 0x020c14,
      waves: 3,
      auroraColors: [0x2bff9a, 0xb04bff],
    },
  };

  /**
   * Apply a named, tweakable sky. Every preset also drives PBR reflections.
   * @param {'deepspace'|'cosmos'|'sunset'|'ocean'|'meadow'|'highlands'|'aurora'} name
   * @param {object} [overrides] any createGradientSkybox / createSpaceSkybox option
   */
  function createSkyPreset(name = 'meadow', overrides = {}) {
    const p = SKY_PRESETS[name] || SKY_PRESETS.meadow;
    const cfg = { ...p, ...overrides };
    if (cfg.kind === 'space') return createSpaceSkybox(cfg);
    return createGradientSkybox(cfg.top, cfg.bottom, cfg);
  }

  function getSkyPresets() {
    return Object.keys(SKY_PRESETS);
  }

  // ── Animation controls ───────────────────────────────────────────────────────
  /** Rotate the star-field one frame. Call in update(dt). */
  function animateSkybox(dt) {
    if (backendSkybox) {
      return backendSkybox.animateSkybox(dt);
    }
    const a = dt * 0.01 * _rotSpeed;
    if (starField) starField.rotation.y += a;
    if (skyboxMesh?.material?.uniforms?.uSeed && starField) skyboxMesh.rotation.y += a;
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
    _followCamera(dt || 0);
  }

  return {
    _tick,
    exposeTo(target) {
      Object.assign(target, {
        createSpaceSkybox,
        createGradientSkybox,
        createSolidSkybox,
        createImageSkybox,
        createEnvironmentSkybox,
        createHDRSkybox,
        createSkyPreset,
        getSkyPresets,
        animateSkybox,
        setSkyboxSpeed,
        enableSkyboxAutoAnimate,
        disableSkyboxAutoAnimate,
        clearSkybox,
      });
    },
  };
}
