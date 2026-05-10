// Babylon backend skybox support for the shared skybox API surface.

import {
  Color3,
  Color4,
  CubeTexture,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Texture,
} from '@babylonjs/core';
import '@babylonjs/core/Helpers/sceneHelpers.js';

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

function toCssColor(hex, alpha = 1) {
  const value = normalizeColorValue(hex);
  return `rgba(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${value & 0xff}, ${alpha})`;
}

function createSkySphere(self, name, texture) {
  const mesh = MeshBuilder.CreateSphere(
    name,
    { diameter: 900, segments: 32, sideOrientation: Mesh.BACKSIDE },
    self.scene
  );
  const material = new StandardMaterial(`${name}_mat`, self.scene);
  material.backFaceCulling = true;
  material.disableLighting = true;
  material.diffuseColor = new Color3(1, 1, 1);
  material.specularColor = Color3.Black();
  material.emissiveColor = new Color3(1, 1, 1);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
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

function drawGradient(ctx, width, height, topColor, bottomColor) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, toCssColor(topColor));
  gradient.addColorStop(1, toCssColor(bottomColor));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawStars(ctx, width, height, starCount = 1000, starSize = 2) {
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const c = Math.random();
    const alpha = 0.55 + Math.random() * 0.45;
    const size = Math.max(1, starSize * (0.45 + Math.random() * 0.75));

    if (c < 0.7) ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    else if (c < 0.85) ctx.fillStyle = `rgba(190,210,255,${alpha})`;
    else if (c < 0.95) ctx.fillStyle = `rgba(255,245,180,${alpha})`;
    else ctx.fillStyle = `rgba(255,185,160,${alpha})`;

    ctx.fillRect(x, y, size, size);
  }
}

function drawNebulae(ctx, width, height, color) {
  for (let i = 0; i < 3; i++) {
    const x = width * (0.2 + Math.random() * 0.6);
    const y = height * (0.2 + Math.random() * 0.5);
    const radius = width * (0.08 + Math.random() * 0.12);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, toCssColor(color, 0.22));
    gradient.addColorStop(0.45, toCssColor(color, 0.1));
    gradient.addColorStop(1, toCssColor(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

function reorderCubeFacesForBabylon(urls) {
  if (!Array.isArray(urls) || urls.length !== 6) return urls;
  const [px, nx, py, ny, pz, nz] = urls;
  return [px, py, pz, nx, ny, nz];
}

export function createBabylonSkyboxApi(self) {
  let skyboxMesh = null;
  let skyboxTexture = null;
  let environmentTexture = null;
  let autoAnimate = false;
  let rotationSpeed = 1;
  const defaultClearColor = self.scene.clearColor?.clone?.() ?? new Color4(0.04, 0.04, 0.06, 1);

  function clearSkyboxState() {
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

  function createGradientSkybox(topColor = 0x1a6aa8, bottomColor = 0xf48c60) {
    clearSkyboxState();

    const texture = new DynamicTexture(
      'nova64_babylon_gradient_sky',
      { width: 1024, height: 512 },
      self.scene,
      false
    );
    const ctx = texture.getContext();
    drawGradient(ctx, 1024, 512, topColor, bottomColor);
    texture.update(false);

    skyboxTexture = texture;
    skyboxMesh = createSkySphere(self, 'nova64_babylon_gradient_sky', texture);
    return skyboxMesh;
  }

  function createSolidSkybox(color = 0x000000) {
    clearSkyboxState();
    self.scene.clearColor = toColor4(color, 1);
    return self.scene.clearColor;
  }

  function createSpaceSkybox(options = {}) {
    const { starCount = 1000, starSize = 2, nebulae = true, nebulaColor = 0x4422aa } = options;

    clearSkyboxState();

    const width = 2048;
    const height = 1024;
    const texture = new DynamicTexture(
      'nova64_babylon_space_sky',
      { width, height },
      self.scene,
      false
    );
    const ctx = texture.getContext();

    drawGradient(ctx, width, height, 0x000511, 0x000000);
    if (nebulae) drawNebulae(ctx, width, height, nebulaColor);
    drawStars(ctx, width, height, starCount, starSize);

    texture.update(false);

    skyboxTexture = texture;
    skyboxMesh = createSkySphere(self, 'nova64_babylon_space_sky', texture);
    return { starField: skyboxMesh, skyboxMesh };
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
    if (skyboxMesh) skyboxMesh.rotation.y += delta;

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
