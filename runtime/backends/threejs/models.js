// runtime/api-3d/models.js
// GLTF model loading, VOX model loading, skeletal animation, and texture loading

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VOXLoader, buildMesh as voxBuildMesh } from 'three/examples/jsm/loaders/VOXLoader.js';

export function modelsModule({ scene, gpu, meshes, mixers, modelAnimations, counters }) {
  async function loadModel(url, position = [0, 0, 0], scale = 1, materialOptions = {}) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        gltf => {
          const model = gltf.scene;
          model.position.set(...position);
          model.scale.setScalar(scale);
          model.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                const mat = gpu.createN64Material({
                  color: child.material.color,
                  texture: child.material.map,
                  ...materialOptions,
                });
                // fog must be set before the shader compiles on next render
                if (materialOptions.fog === false) mat.fog = false;
                child.material = mat;
              }
            }
          });
          scene.add(model);
          const id = ++counters.mesh;
          meshes.set(id, model);
          if (gltf.animations?.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            mixers.set(id, mixer);
            modelAnimations.set(id, gltf.animations);
            mixer.clipAction(gltf.animations[0]).play();
          }
          resolve(id);
        },
        undefined,
        reject
      );
    });
  }

  function playAnimation(meshId, nameOrIndex = 0, loop = true, timeScale = 1.0) {
    const mixer = mixers.get(meshId);
    const animations = modelAnimations.get(meshId);
    if (!mixer || !animations) return;
    const clip =
      typeof nameOrIndex === 'number'
        ? animations[nameOrIndex]
        : THREE.AnimationClip.findByName(animations, nameOrIndex);
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
      new THREE.TextureLoader().load(
        url,
        tex => {
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
          resolve(tex);
        },
        undefined,
        reject
      );
    });
  }

  async function loadVoxModel(url, position = [0, 0, 0], scale = 1, options = {}) {
    return new Promise((resolve, reject) => {
      const loader = new VOXLoader();
      loader.load(
        url,
        result => {
          // Use scene graph if available (handles nTRN/nGRP/nSHP transforms),
          // otherwise build meshes from raw chunks
          let model;
          if (result.scene) {
            model = result.scene;
          } else {
            model = new THREE.Group();
            for (const chunk of result.chunks) {
              model.add(voxBuildMesh(chunk));
            }
          }

          model.position.set(...position);
          if (typeof scale === 'number') {
            model.scale.setScalar(scale);
          }

          model.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (options.material === 'n64' && child.material) {
                child.material = gpu.createN64Material({
                  color: child.material.color || new THREE.Color(0xffffff),
                  vertexColors: child.geometry.hasAttribute('color'),
                  ...options,
                });
              }
            }
          });

          scene.add(model);
          const id = ++counters.mesh;
          meshes.set(id, model);
          resolve(id);
        },
        undefined,
        reject
      );
    });
  }

  return { loadModel, loadVoxModel, playAnimation, updateAnimations, loadTexture };
}
