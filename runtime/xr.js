// runtime/xr.js
// WebXR (VR + AR) and Cardboard VR support for Nova64
// Extends the camera/renderer system with immersive mode capabilities.
//
// Cart usage:
//   enableVR()           — show "Enter VR" button, start VR session on click
//   enableAR()           — show "Start AR" button, start AR passthrough session
//   enableCardboardVR()  — stereoscopic split-screen + gyroscope for phones
//   disableXR()          — exit and clean up any XR/Cardboard session
//   isXRActive()         — true while presenting
//   getXRControllers()   — [{ position, rotation, gamepad, grip }, ...]
//   getXRHands()         — hand-tracking joint data (if supported)
//   setXRReferenceSpace(type) — 'local' | 'local-floor' | 'bounded-floor'
//   setCameraRigPosition(x,y,z) — move the player rig in VR world space

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

export function xrModule(gpu) {
  const renderer = gpu.getRenderer();
  const scene = gpu.getScene();
  const camera = gpu.getCamera();

  // ── State ──────────────────────────────────────────────────────────────────
  let xrButton = null; // DOM button element
  let xrMode = null; // 'vr' | 'ar' | 'cardboard' | null
  let cameraRig = null; // THREE.Group wrapping the camera for VR movement
  let controllers = []; // { controller, grip, hand } per index
  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory();
  let vrHUD = null; // world-space HUD plane for VR

  // Cardboard-specific
  let stereoEffect = null;
  let deviceOrientationFn = null;
  let cardboardActive = false;

  // ── Camera Rig ─────────────────────────────────────────────────────────────
  // Wrap the camera in a group so cart code can move the "player" position
  // while the XR system controls head orientation within the rig.
  function ensureCameraRig() {
    if (cameraRig) return cameraRig;
    cameraRig = new THREE.Group();
    cameraRig.name = '__nova64_xr_rig';
    cameraRig.add(camera);
    scene.add(cameraRig);
    return cameraRig;
  }

  function removeCameraRig() {
    if (!cameraRig) return;
    scene.remove(cameraRig);
    cameraRig.remove(camera);
    scene.add(camera); // put camera back in scene root
    cameraRig = null;
  }

  // ── Controller helpers ─────────────────────────────────────────────────────
  function setupController(index) {
    const controller = renderer.xr.getController(index);
    controller.name = `xr-controller-${index}`;

    // Visual ray for pointing
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ccff }));
    line.scale.z = 3;
    controller.add(line);

    // Grip model
    const grip = renderer.xr.getControllerGrip(index);
    grip.add(controllerModelFactory.createControllerModel(grip));

    // Hand tracking (Quest, Vision Pro)
    const hand = renderer.xr.getHand(index);
    hand.add(handModelFactory.createHandModel(hand, 'mesh'));

    cameraRig.add(controller);
    cameraRig.add(grip);
    cameraRig.add(hand);

    return { controller, grip, hand };
  }

  function cleanupControllers() {
    for (const { controller, grip, hand } of controllers) {
      if (cameraRig) {
        cameraRig.remove(controller);
        cameraRig.remove(grip);
        cameraRig.remove(hand);
      }
      // dispose geometries
      controller.children.forEach(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
    controllers = [];
  }

  // ── VR HUD (world-space billboard) ─────────────────────────────────────────
  function createVRHUD() {
    if (vrHUD) return;
    const hudW = 1.6; // meters wide
    const hudH = 0.9; // meters tall
    const hudDist = 2; // meters from camera

    const geo = new THREE.PlaneGeometry(hudW, hudH);
    // Share the overlay texture from the 2D framebuffer system
    const mat = new THREE.MeshBasicMaterial({
      map: gpu.overlay2D.texture,
      transparent: true,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    vrHUD = new THREE.Mesh(geo, mat);
    vrHUD.name = '__nova64_vr_hud';
    vrHUD.renderOrder = 9999;
    vrHUD.frustumCulled = false;
    // Position will be updated each frame to follow the camera
    vrHUD._hudDistance = hudDist;
    scene.add(vrHUD);
  }

  function updateVRHUD() {
    if (!vrHUD) return;
    // Place HUD in front of the camera at a fixed distance
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    const pos = camera.getWorldPosition(new THREE.Vector3());
    vrHUD.position.copy(pos).add(dir.multiplyScalar(vrHUD._hudDistance));
    vrHUD.quaternion.copy(camera.quaternion);
  }

  function removeVRHUD() {
    if (!vrHUD) return;
    scene.remove(vrHUD);
    vrHUD.geometry.dispose();
    vrHUD.material.dispose();
    vrHUD = null;
  }

  // ── Enable VR ──────────────────────────────────────────────────────────────
  function enableVR(options = {}) {
    if (xrMode) disableXR();
    xrMode = 'vr';

    const refSpace = options.referenceSpace || 'local-floor';

    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType(refSpace);

    ensureCameraRig();

    // Setup controllers
    controllers = [setupController(0), setupController(1)];

    // Create the "Enter VR" button and append to parent
    xrButton = VRButton.createButton(renderer);
    xrButton.style.position = 'absolute';
    xrButton.style.bottom = '40px';
    xrButton.style.left = '50%';
    xrButton.style.transform = 'translateX(-50%)';
    xrButton.style.zIndex = '999';
    (renderer.domElement.parentElement || document.body).appendChild(xrButton);

    // Create VR HUD
    createVRHUD();

    // Listen for session start/end
    renderer.xr.addEventListener('sessionstart', () => {
      console.log('🥽 WebXR VR session started');
      // Disable post-processing (not compatible with multi-view)
      if (typeof globalThis.isEffectsEnabled === 'function' && globalThis.isEffectsEnabled()) {
        console.warn('⚠️ Post-processing disabled in VR (multi-view not supported)');
        globalThis.__xrEffectsWereEnabled = true;
        if (typeof globalThis.disableAllEffects === 'function') globalThis.disableAllEffects();
      }
    });

    renderer.xr.addEventListener('sessionend', () => {
      console.log('🥽 WebXR VR session ended');
      // Re-enable effects if they were on before
      if (globalThis.__xrEffectsWereEnabled) {
        globalThis.__xrEffectsWereEnabled = false;
      }
    });

    console.log('🥽 VR enabled — click "Enter VR" button to start');
  }

  // ── Enable AR ──────────────────────────────────────────────────────────────
  function enableAR(options = {}) {
    if (xrMode) disableXR();
    xrMode = 'ar';

    const refSpace = options.referenceSpace || 'local';

    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType(refSpace);

    ensureCameraRig();
    controllers = [setupController(0), setupController(1)];

    xrButton = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'hand-tracking'],
      ...(options.sessionInit || {}),
    });
    xrButton.style.position = 'absolute';
    xrButton.style.bottom = '40px';
    xrButton.style.left = '50%';
    xrButton.style.transform = 'translateX(-50%)';
    xrButton.style.zIndex = '999';
    (renderer.domElement.parentElement || document.body).appendChild(xrButton);

    renderer.xr.addEventListener('sessionstart', () => {
      console.log('📱 WebXR AR session started');
      if (typeof globalThis.isEffectsEnabled === 'function' && globalThis.isEffectsEnabled()) {
        console.warn('⚠️ Post-processing disabled in AR');
        globalThis.__xrEffectsWereEnabled = true;
        if (typeof globalThis.disableAllEffects === 'function') globalThis.disableAllEffects();
      }
    });

    renderer.xr.addEventListener('sessionend', () => {
      console.log('📱 WebXR AR session ended');
      if (globalThis.__xrEffectsWereEnabled) globalThis.__xrEffectsWereEnabled = false;
    });

    console.log('📱 AR enabled — click "Start AR" button to begin');
  }

  // ── Cardboard VR (phones without WebXR) ────────────────────────────────────
  async function enableCardboardVR() {
    if (xrMode) disableXR();
    xrMode = 'cardboard';
    cardboardActive = true;

    // Dynamically import StereoEffect (avoid bundling if unused)
    const { StereoEffect } = await import('three/examples/jsm/effects/StereoEffect.js');
    stereoEffect = new StereoEffect(renderer);
    stereoEffect.setSize(renderer.domElement.width, renderer.domElement.height);

    // Use DeviceOrientation for head tracking
    const onOrientation = e => {
      if (!cardboardActive) return;
      const alpha = THREE.MathUtils.degToRad(e.alpha || 0); // z-axis
      const beta = THREE.MathUtils.degToRad(e.beta || 0); // x-axis
      const gamma = THREE.MathUtils.degToRad(e.gamma || 0); // y-axis

      // ZXY Euler from device orientation
      const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      // Rotate 90° around X to convert from device frame to WebGL frame
      const q = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
      camera.quaternion.multiply(q);
      // Account for screen orientation
      const orient = THREE.MathUtils.degToRad(window.orientation || 0);
      const qScreen = new THREE.Quaternion();
      qScreen.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -orient);
      camera.quaternion.multiply(qScreen);
    };
    deviceOrientationFn = onOrientation;

    // Request permission on iOS 13+
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') {
          console.warn('⚠️ Device orientation permission denied');
          return;
        }
      } catch (e) {
        console.warn('⚠️ Could not request device orientation permission', e);
      }
    }
    window.addEventListener('deviceorientation', onOrientation);

    // Enter fullscreen + lock landscape
    try {
      await renderer.domElement.requestFullscreen?.();
      await screen.orientation?.lock?.('landscape-primary').catch(() => {});
    } catch (e) {
      /* not critical */
    }

    console.log('📦 Cardboard VR enabled — place phone in headset');
  }

  // ── Disable / cleanup ──────────────────────────────────────────────────────
  function disableXR() {
    if (xrMode === 'vr' || xrMode === 'ar') {
      // End active session
      const session = renderer.xr.getSession();
      if (session) session.end().catch(() => {});
      renderer.xr.enabled = false;
      cleanupControllers();
      removeVRHUD();
    }

    if (xrMode === 'cardboard') {
      cardboardActive = false;
      stereoEffect = null;
      if (deviceOrientationFn) {
        window.removeEventListener('deviceorientation', deviceOrientationFn);
        deviceOrientationFn = null;
      }
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }

    // Remove button
    if (xrButton && xrButton.parentElement) {
      xrButton.parentElement.removeChild(xrButton);
    }
    xrButton = null;

    removeCameraRig();
    xrMode = null;
  }

  // ── Queries ────────────────────────────────────────────────────────────────
  function isXRActive() {
    if (xrMode === 'cardboard') return cardboardActive;
    return renderer.xr.isPresenting;
  }

  function isXRSupported() {
    return typeof navigator.xr !== 'undefined';
  }

  function getXRSession() {
    return renderer.xr.getSession();
  }

  function getXRMode() {
    return xrMode;
  }

  function getXRControllers() {
    return controllers.map(({ controller, grip }, i) => {
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      controller.getWorldPosition(pos);
      controller.getWorldQuaternion(quat);

      // Read gamepad state if available
      const session = renderer.xr.getSession();
      const sources = session?.inputSources || [];
      const source = sources[i];
      const gp = source?.gamepad;

      return {
        index: i,
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
        buttons: gp
          ? Array.from(gp.buttons).map(b => ({
              pressed: b.pressed,
              touched: b.touched,
              value: b.value,
            }))
          : [],
        axes: gp ? Array.from(gp.axes) : [],
        grip: {
          position: (() => {
            const p = new THREE.Vector3();
            grip.getWorldPosition(p);
            return { x: p.x, y: p.y, z: p.z };
          })(),
        },
      };
    });
  }

  function getXRHands() {
    return controllers
      .map(({ hand }, i) => {
        if (!hand || hand.children.length === 0) return null;
        const joints = {};
        hand.joints &&
          Object.entries(hand.joints).forEach(([name, joint]) => {
            const pos = new THREE.Vector3();
            joint.getWorldPosition(pos);
            joints[name] = { x: pos.x, y: pos.y, z: pos.z };
          });
        return { index: i, joints };
      })
      .filter(Boolean);
  }

  function setXRReferenceSpace(type) {
    renderer.xr.setReferenceSpaceType(type);
  }

  function setCameraRigPosition(x, y, z) {
    if (!cameraRig) ensureCameraRig();
    cameraRig.position.set(x, y, z);
  }

  // ── Per-frame update (called from gpu.endFrame or main loop) ───────────────
  function _tick() {
    if (!isXRActive()) return;
    updateVRHUD();
  }

  // ── Stereo render for Cardboard ────────────────────────────────────────────
  // Returns true if stereo rendered (caller should skip normal render)
  function _renderStereo() {
    if (!cardboardActive || !stereoEffect) return false;
    stereoEffect.render(scene, camera);
    return true;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    _tick,
    _renderStereo,

    exposeTo(target) {
      Object.assign(target, {
        enableVR,
        enableAR,
        enableCardboardVR,
        disableXR,
        isXRActive,
        isXRSupported,
        getXRSession,
        getXRMode,
        getXRControllers,
        getXRHands,
        setXRReferenceSpace,
        setCameraRigPosition,
      });
    },
  };
}
