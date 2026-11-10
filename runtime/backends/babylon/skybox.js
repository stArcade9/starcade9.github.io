// Babylon backend skybox support for the shared skybox API surface.

import {
  Color3,
  Color4,
  Constants,
  CubeTexture,
  Effect,
  Mesh,
  MeshBuilder,
  ReflectionProbe,
  RenderTargetTexture,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import '@babylonjs/core/Helpers/sceneHelpers.js';

import { GRADIENT_FRAG, NOISE_GLSL, SPACE_FRAG, STAR_FRAG } from '../../sky-shaders.js';
import { normalizeColorValue } from './common.js';
import { applyBabylonMaterialCompatibility, applyBabylonMeshCompatibility } from './compat.js';

function toColor4(hex, alpha = 1) {
  const value = normalizeColorValue(hex);
  return new Color4(
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    alpha
  );
}

function createCubeSkyMesh(self, texture) {
  if (typeof self.scene.createDefaultSkybox === 'function') {
    const mesh = self.scene.createDefaultSkybox(texture, false, 900, 0, false);
    if (mesh) {
      if (mesh.material) mesh.material.fogEnabled = false;
      mesh.isPickable = false;
      mesh.infiniteDistance = true;
      mesh.ignoreCameraMaxZ = true;
      mesh.alwaysSelectAsActiveMesh = true;
      return mesh;
    }
  }

  const mesh = MeshBuilder.CreateBox('nova64_babylon_cube_skybox', { size: 900 }, self.scene);
  const material = new StandardMaterial('nova64_babylon_cube_skybox_mat', self.scene);
  material.backFaceCulling = false;
  material.disableLighting = true;
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.reflectionTexture = texture;
  material.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  material.fogEnabled = false;

  mesh.material = material;
  applyBabylonMaterialCompatibility(material);
  applyBabylonMeshCompatibility(mesh);
  mesh.isPickable = false;
  mesh.infiniteDistance = true;
  mesh.ignoreCameraMaxZ = true;
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}

function reorderCubeFacesForBabylon(urls) {
  if (!Array.isArray(urls) || urls.length !== 6) return urls;
  const [px, nx, py, ny, pz, nz] = urls;
  return [px, py, pz, nx, ny, nz];
}

// ── Procedural sky (parity with the Three.js runtime) ───────────────────────
// The fragment shaders are shared with runtime/api-skybox.js via sky-shaders.js;
// only the vertex stages differ (Babylon's matrix uniform names).
const SKY_VERT = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }`;

const BABYLON_STAR_VERT = `
  precision highp float;
  attribute vec3 position; attribute vec4 color;
  attribute float aSize; attribute float aPhase;
  uniform mat4 worldView; uniform mat4 projection;
  uniform float uSize; uniform float uScale; uniform float uTime;
  varying vec3 vColor; varying float vTw; varying float vBig;
  void main() {
    vec4 mv = worldView * vec4(position, 1.0);
    gl_PointSize = clamp(uSize * aSize * (uScale / -mv.z), 1.5, 48.0);
    vTw = 0.7 + 0.3 * sin(uTime * (0.8 + aPhase * 3.0) + aPhase * 50.0);
    vColor = color.rgb;
    vBig = smoothstep(1.8, 4.5, aSize);
    gl_Position = projection * mv;
  }`;

const GRADIENT_UNIFORMS = [
  'uTop',
  'uBottom',
  'uHorizon',
  'uSunDir',
  'uSunColor',
  'uSunSize',
  'uClouds',
  'uToon',
  'uBands',
  'uCloudScale',
  'uCloudLow',
  'uWind',
  'uRays',
  'uRainbow',
  'uOcean',
  'uDeep',
  'uWaves',
  'uOutline',
  'uInk',
  'uSkyBands',
  'uAurora',
  'uAuroraA',
  'uAuroraB',
  'uMeteors',
  'uStars',
  'uSeed',
  'uTime',
];
const SPACE_UNIFORMS = ['uNebA', 'uNebB', 'uNebC', 'uNebula', 'uMilky', 'uSeed', 'uTime'];

function registerSkyShaders() {
  const store = Effect.ShadersStore;
  if (store.nova64SkyVertexShader) return;
  store.nova64SkyVertexShader = SKY_VERT;
  store.nova64SkyGradientFragmentShader = 'precision highp float;\n' + NOISE_GLSL + GRADIENT_FRAG;
  store.nova64SkySpaceFragmentShader = 'precision highp float;\n' + NOISE_GLSL + SPACE_FRAG;
  store.nova64SkyStarsVertexShader = BABYLON_STAR_VERT;
  store.nova64SkyStarsFragmentShader = 'precision highp float;\n' + STAR_FRAG;
}

function hexToColor3(hex) {
  const v = normalizeColorValue(hex);
  return new Color3(((v >> 16) & 0xff) / 255, ((v >> 8) & 0xff) / 255, (v & 0xff) / 255);
}

// HSL helpers matching THREE.Color.getHSL/setHSL/offsetHSL (used for nebula tints).
function rgbToHsl(c) {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l <= 0.5 ? d / (max + min) : d / (2 - max - min);
  let h;
  if (max === c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6 : 0);
  else if (max === c.g) h = (c.b - c.r) / d + 2;
  else h = (c.r - c.g) / d + 4;
  return { h: h / 6, s, l };
}
function hslToColor3(h, s, l) {
  h = ((h % 1) + 1) % 1;
  s = Math.min(Math.max(s, 0), 1);
  l = Math.min(Math.max(l, 0), 1);
  if (s === 0) return new Color3(l, l, l);
  const q = l <= 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = t => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t);
    return p;
  };
  return new Color3(hue(h + 1 / 3), hue(h), hue(h - 1 / 3));
}
function offsetHsl(c, dh, ds, dl) {
  const { h, s, l } = rgbToHsl(c);
  return hslToColor3(h + dh, s + ds, l + dl);
}

export function createBabylonSkyboxApi(self) {
  let skyboxMesh = null;
  let skyboxTexture = null;
  let environmentTexture = null;
  let autoAnimate = false;
  let rotationSpeed = 1;
  let starMesh = null; // procedural space sky: twinkling point stars
  let skyMaterials = []; // procedural ShaderMaterials that need uTime / uScale
  let isSpaceDome = false;
  let skyProbe = null; // reflection probe baking the dome into environmentTexture
  let envBeforeSky = null;
  const defaultClearColor = self.scene.clearColor?.clone?.() ?? new Color4(0.04, 0.04, 0.06, 1);

  function clearSkyboxState() {
    if (skyProbe) {
      if (self.scene.environmentTexture === skyProbe.cubeTexture) {
        self.scene.environmentTexture = envBeforeSky;
        if ('environmentIntensity' in self.scene) self.scene.environmentIntensity = 1;
      }
      skyProbe.dispose();
      skyProbe = null;
      envBeforeSky = null;
    }
    if (starMesh) {
      starMesh.dispose?.();
      starMesh = null;
    }
    for (const m of skyMaterials) m.dispose?.();
    skyMaterials = [];
    isSpaceDome = false;
    if (skyboxMesh) {
      skyboxMesh.dispose?.();
      skyboxMesh = null;
    }

    if (environmentTexture) {
      if (self.scene.environmentTexture === environmentTexture) {
        self.scene.environmentTexture = null;
      }
      environmentTexture.dispose?.();
      environmentTexture = null;
    }

    if (skyboxTexture) {
      skyboxTexture.dispose?.();
      skyboxTexture = null;
    }

    self.scene.clearColor = defaultClearColor.clone?.() ?? defaultClearColor;
  }

  function pixelScale() {
    return (
      (self.engine?.getRenderHeight?.() || self.scene.getEngine?.().getRenderHeight?.() || 600) *
      0.5
    );
  }

  function prepareSkyMesh(mesh) {
    mesh.isPickable = false;
    mesh.infiniteDistance = true;
    mesh.ignoreCameraMaxZ = true;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.applyFog = false;
    // Keep the sky out of the emissive glow layer so bloom doesn't flood it.
    for (const layer of self.scene.effectLayers || []) layer.addExcludedMesh?.(mesh);
  }

  function skyDome(fragmentName, uniformNames) {
    registerSkyShaders();
    const mesh = MeshBuilder.CreateSphere(
      'nova64_procedural_sky',
      { diameter: 1500, segments: 48, sideOrientation: Mesh.BACKSIDE },
      self.scene
    );
    const material = new ShaderMaterial(
      'nova64_procedural_sky_mat',
      self.scene,
      { vertex: 'nova64Sky', fragment: fragmentName },
      { attributes: ['position'], uniforms: ['worldViewProjection', ...uniformNames] }
    );
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    material.fogEnabled = false;
    mesh.material = material;
    prepareSkyMesh(mesh);
    skyMaterials.push(material);
    return { mesh, material };
  }

  // Render the dome once into a cube map and use it for PBR reflections.
  function bakeEnvironment(dome, intensity = 1) {
    try {
      envBeforeSky = self.scene.environmentTexture ?? null;
      skyProbe = new ReflectionProbe('nova64_sky_probe', 128, self.scene);
      skyProbe.renderList.push(dome);
      skyProbe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
      self.scene.environmentTexture = skyProbe.cubeTexture;
      if ('environmentIntensity' in self.scene) self.scene.environmentIntensity = intensity;
    } catch (_) {
      // Reflections are a bonus; the sky still renders without them.
    }
  }

  function createGradientSkybox(topColor = 0x1a6aa8, bottomColor = 0xf48c60, opts = {}) {
    clearSkyboxState();
    opts = opts && typeof opts === 'object' ? opts : {};
    const top = hexToColor3(topColor);
    const bottom = hexToColor3(bottomColor);
    const horizon =
      opts.horizonColor !== undefined
        ? hexToColor3(opts.horizonColor)
        : Color3.Lerp(bottom, Color3.White(), 0.18);
    const lum = top.r * 0.2126 + top.g * 0.7152 + top.b * 0.0722;
    const sun = opts.sun;
    const sunDir = new Vector3(...((sun && sun.dir) || [-0.4, 0.12, -1])).normalize();

    const { mesh, material } = skyDome('nova64SkyGradient', GRADIENT_UNIFORMS);
    material.setColor3('uTop', top);
    material.setColor3('uBottom', bottom);
    material.setColor3('uHorizon', horizon);
    material.setVector3('uSunDir', sunDir);
    material.setColor3('uSunColor', hexToColor3((sun && sun.color) ?? 0xffd9a0));
    material.setFloat('uSunSize', sun ? (sun.size ?? 1) : 0);
    material.setFloat('uClouds', opts.clouds ?? 0.5);
    material.setFloat('uToon', opts.toon ?? 0);
    material.setFloat('uBands', opts.toonBands ?? 3);
    material.setFloat('uCloudScale', opts.cloudScale ?? 0.9);
    material.setFloat('uCloudLow', opts.cloudsLow ?? 0);
    material.setFloat('uWind', opts.wind ?? 1);
    material.setFloat('uRays', opts.rays ?? 0);
    material.setFloat('uRainbow', opts.rainbow ?? 0);
    material.setFloat('uOcean', opts.ocean ? 1 : 0);
    material.setColor3('uDeep', hexToColor3(opts.oceanColor ?? 0x0a3a5a));
    material.setFloat('uWaves', opts.waves ?? 6);
    material.setFloat('uOutline', opts.outline ?? 0);
    material.setColor3('uInk', hexToColor3(opts.inkColor ?? 0x1a2a55));
    material.setFloat('uSkyBands', opts.skyBands ?? 0);
    material.setFloat('uAurora', opts.aurora ?? 0);
    material.setColor3('uAuroraA', hexToColor3(opts.auroraColors?.[0] ?? 0x2bff9a));
    material.setColor3('uAuroraB', hexToColor3(opts.auroraColors?.[1] ?? 0xa04bff));
    material.setFloat('uMeteors', opts.meteors ?? 0);
    material.setFloat('uStars', opts.stars ?? Math.max(0, Math.min(1, 1 - lum * 6)));
    material.setFloat('uSeed', opts.seed ?? Math.random() * 100);
    material.setFloat('uTime', 0);
    material._novaTime = 0;

    skyboxMesh = mesh;
    if (opts.reflect !== false) bakeEnvironment(mesh, opts.reflectIntensity ?? 1);
    return skyboxMesh;
  }

  function createSolidSkybox(color = 0x000000) {
    clearSkyboxState();
    self.scene.clearColor = toColor4(color, 1);
    return self.scene.clearColor;
  }

  function createSpaceSkybox(options = {}) {
    const {
      starCount = 1000,
      starSize = 2,
      nebulaColor = 0x4422aa,
      nebulaIntensity = 1,
      milkyWay = true,
      seed = Math.random() * 100,
    } = options;
    const nebulae = options.nebulae ?? options.nebula ?? true;

    clearSkyboxState();
    registerSkyShaders();

    // Bright foreground stars: same distribution and palette as the Three.js runtime.
    const palette = [
      [0.62, 0.72, 1.0, 0.12],
      [0.8, 0.86, 1.0, 0.2],
      [1.0, 1.0, 1.0, 0.33],
      [1.0, 0.95, 0.82, 0.18],
      [1.0, 0.82, 0.6, 0.11],
      [1.0, 0.62, 0.48, 0.06],
    ];
    const band = new Vector3(0.3, 1, 0.45).normalize();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 4);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);
    const indices = new Uint32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      let x, y, z;
      for (let tries = 0; tries < 4; tries++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = Math.sin(phi) * Math.cos(theta);
        y = Math.sin(phi) * Math.sin(theta);
        z = Math.cos(phi);
        const off = Math.abs(x * band.x + y * band.y + z * band.z);
        if (!milkyWay || Math.random() > 0.4 || off < 0.25) break;
      }
      const radius = 420 + Math.random() * 260;
      positions.set([x * radius, y * radius, z * radius], i * 3);
      let r = Math.random();
      let c = palette[palette.length - 1];
      for (const entry of palette) {
        if ((r -= entry[3]) <= 0) {
          c = entry;
          break;
        }
      }
      colors.set([c[0], c[1], c[2], 1], i * 4);
      sizes[i] = 0.6 + Math.pow(Math.random(), 9) * 5.5;
      phases[i] = Math.random();
      indices[i] = i;
    }
    starMesh = new Mesh('nova64_sky_stars', self.scene);
    const data = new VertexData();
    data.positions = positions;
    data.colors = colors;
    data.indices = indices;
    data.applyToMesh(starMesh, false);
    starMesh.setVerticesData('aSize', sizes, false, 1);
    starMesh.setVerticesData('aPhase', phases, false, 1);
    const starMat = new ShaderMaterial(
      'nova64_sky_stars_mat',
      self.scene,
      { vertex: 'nova64SkyStars', fragment: 'nova64SkyStars' },
      {
        attributes: ['position', 'color', 'aSize', 'aPhase'],
        uniforms: ['worldView', 'projection', 'uSize', 'uScale', 'uTime'],
        needAlphaBlending: true,
      }
    );
    starMat.pointsCloud = true;
    starMat.alphaMode = Constants.ALPHA_ADD;
    starMat.disableDepthWrite = true;
    starMat.backFaceCulling = false;
    starMat.fogEnabled = false;
    starMat.setFloat('uSize', starSize * 3.0);
    starMat.setFloat('uScale', pixelScale());
    starMat.setFloat('uTime', 0);
    starMat._novaTime = 0;
    starMesh.material = starMat;
    prepareSkyMesh(starMesh);
    skyMaterials.push(starMat);

    const base = hexToColor3(nebulaColor);
    const nebB = offsetHsl(base, 0.12, 0.1, 0.08);
    const nebC = offsetHsl(base, -0.42, -0.1, 0.12);
    // Keep the nebula vivid even when a cart passes a very dark tint.
    const vivid = col => {
      const { h, s, l } = rgbToHsl(col);
      return hslToColor3(h, Math.max(s, 0.55), Math.min(Math.max(l, 0.38), 0.6));
    };
    const { mesh, material } = skyDome('nova64SkySpace', SPACE_UNIFORMS);
    material.setColor3('uNebA', vivid(base));
    material.setColor3('uNebB', vivid(nebB));
    material.setColor3('uNebC', vivid(nebC));
    material.setFloat('uNebula', nebulae ? nebulaIntensity : 0);
    material.setFloat('uMilky', milkyWay ? 1 : 0);
    material.setFloat('uSeed', seed);
    material.setFloat('uTime', 0);
    material._novaTime = 0;
    skyboxMesh = mesh;
    isSpaceDome = true;

    if (options.reflect !== false) bakeEnvironment(mesh, options.reflectIntensity ?? 1);
    return { starField: starMesh, skyboxMesh };
  }

  function createImageSkybox(urls) {
    if (!Array.isArray(urls) || urls.length !== 6) {
      return Promise.reject(
        new Error('createImageSkybox: requires exactly 6 face URLs [+X, -X, +Y, -Y, +Z, -Z]')
      );
    }

    clearSkyboxState();

    return new Promise((resolve, reject) => {
      const orderedFiles = reorderCubeFacesForBabylon(urls);
      const cubeTexture = new CubeTexture(
        '',
        self.scene,
        null,
        false,
        orderedFiles,
        () => {
          cubeTexture.coordinatesMode = Texture.CUBIC_MODE;
          if ('gammaSpace' in cubeTexture) cubeTexture.gammaSpace = false;
          cubeTexture.rotationY = Math.PI;
          self.scene.environmentTexture = cubeTexture;
          environmentTexture = cubeTexture;

          skyboxTexture = cubeTexture.clone();
          skyboxTexture.coordinatesMode = Texture.SKYBOX_MODE;
          if ('gammaSpace' in skyboxTexture) skyboxTexture.gammaSpace = true;
          skyboxTexture.rotationY = cubeTexture.rotationY;

          skyboxMesh = createCubeSkyMesh(self, skyboxTexture);
          resolve(cubeTexture);
        },
        (message, exception) => {
          reject(exception ?? new Error(message ?? 'Failed to load cube skybox'));
        }
      );
    });
  }

  function animateSkybox(dt) {
    const delta = dt * 0.01 * rotationSpeed;
    // Procedural gradient skies animate through uTime (clouds drift); only
    // star fields and textured skies rotate, matching the Three.js runtime.
    if (starMesh) starMesh.rotation.y += delta;
    if (skyboxMesh && (isSpaceDome || skyMaterials.length === 0)) skyboxMesh.rotation.y += delta;

    if (environmentTexture) {
      environmentTexture.rotationY += delta;
      if (skyboxMesh?.material?.reflectionTexture) {
        skyboxMesh.material.reflectionTexture.rotationY = environmentTexture.rotationY;
      }
    }
  }

  function setSkyboxSpeed(multiplier) {
    rotationSpeed = Number.isFinite(multiplier) ? multiplier : 1;
  }

  function enableSkyboxAutoAnimate(speed = 1) {
    autoAnimate = true;
    setSkyboxSpeed(speed);
  }

  function disableSkyboxAutoAnimate() {
    autoAnimate = false;
  }

  function clearSkybox() {
    clearSkyboxState();
  }

  function tickSkybox(dt) {
    if (autoAnimate) animateSkybox(dt);
    const step = dt || 0;
    for (const m of skyMaterials) {
      m._novaTime += step;
      m.setFloat('uTime', m._novaTime);
    }
    if (starMesh?.material) starMesh.material.setFloat('uScale', pixelScale());
  }

  return {
    createSpaceSkybox,
    createGradientSkybox,
    createSolidSkybox,
    createImageSkybox,
    animateSkybox,
    setSkyboxSpeed,
    enableSkyboxAutoAnimate,
    disableSkyboxAutoAnimate,
    clearSkybox,
    tickSkybox,
  };
}
