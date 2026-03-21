// runtime/api-3d/models.js
// GLTF model loading, skeletal animation, and texture loading

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function modelsModule({ scene, gpu, meshes, mixers, modelAnimations, counters }) {
  async function loadModel(url, position = [0, 0, 0], scale = 1) {
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
                child.material = gpu.createN64Material({
                  color: child.material.color,
                  texture: child.material.map,
                });
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

  return { loadModel, playAnimation, updateAnimations, loadTexture };
}
