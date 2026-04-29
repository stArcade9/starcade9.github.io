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
  const backendName = gpu.getBackendCapabilities?.().backend ?? gpu.backendName ?? 'unknown';

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
  let babylonXR = null;
  let babylonXRState = null;
  let babylonReferenceSpace = 'local-floor';
  let babylonCardboardModule = null;
  let babylonSessionSupported = false;

  function hasThreeWebXR() {
    return (
      backendName === 'threejs' &&
      !!renderer?.xr &&
      typeof renderer.xr.setReferenceSpaceType === 'function' &&
      typeof renderer.xr.getController === 'function' &&
      typeof renderer.xr.getSession === 'function'
    );
  }

  function hasThreeRenderer() {
    return backendName === 'threejs' && renderer?.isWebGLRenderer === true;
  }

  function hasBabylonScene() {
    return (
      backendName === 'babylon' &&
      !!scene &&
      typeof scene.createDefaultXRExperienceAsync === 'function'
    );
  }

  function hasNativeWebXR() {
    return typeof navigator !== 'undefined' && !!navigator.xr;
  }

  function getRendererParent() {
    const domElement = renderer?.domElement ?? gpu.canvas;
    return domElement?.parentElement || document.body;
  }

  function getRenderCanvas() {
    return renderer?.domElement ?? renderer?.getRenderingCanvas?.() ?? gpu.canvas ?? null;
  }

  function styleXRButton(button) {
    button.style.position = 'absolute';
    button.style.bottom = '40px';
    button.style.left = '50%';
    button.style.transform = 'translateX(-50%)';
    button.style.zIndex = '999';
    button.style.padding = '10px 14px';
    button.style.border = '1px solid rgba(255,255,255,0.45)';
    button.style.borderRadius = '4px';
    button.style.background = 'rgba(15,18,28,0.82)';
    button.style.color = '#fff';
    button.style.font = '600 13px system-ui, sans-serif';
  }

  function removeXRButton() {
    if (xrButton && xrButton.parentElement) {
      xrButton.parentElement.removeChild(xrButton);
    }
    xrButton = null;
  }

  function showUnsupportedXRButton(mode) {
    removeXRButton();

    const label = mode === 'ar' ? 'AR' : mode === 'cardboard' ? 'Cardboard VR' : 'VR';
    xrButton = document.createElement('button');
    xrButton.type = 'button';
    xrButton.disabled = true;
    xrButton.dataset.nova64XrStatus = 'unsupported';
    xrButton.textContent = `${label} unavailable on ${backendName === 'babylon' ? 'Babylon.js' : 'this backend'}`;
    styleXRButton(xrButton);
    getRendererParent().appendChild(xrButton);

    console.warn(`WebXR ${label} is not available on the ${backendName} backend yet`);
    return false;
  }

  function showCardboardFallbackButton() {
    removeXRButton();

    xrButton = document.createElement('button');
    xrButton.type = 'button';
    xrButton.dataset.nova64XrStatus = 'cardboard-fallback';
    xrButton.textContent = 'Use Cardboard VR';
    styleXRButton(xrButton);
    xrButton.addEventListener('click', () => {
      enableCardboardVR().catch(err => console.warn('Cardboard VR fallback failed:', err));
    });
    getRendererParent().appendChild(xrButton);
    console.warn('WebXR VR is not available; Cardboard VR fallback is ready');
    return false;
  }

  async function ensureBabylonModule() {
    if (!babylonCardboardModule) {
      babylonCardboardModule = await import('@babylonjs/core');
    }
    return babylonCardboardModule;
  }

  async function enableBabylonXR(mode, options = {}) {
    const sessionMode = mode === 'ar' ? 'immersive-ar' : 'immersive-vr';
    const referenceSpace = options.referenceSpace || (mode === 'ar' ? 'local' : 'local-floor');
    babylonReferenceSpace = referenceSpace;

    if (!hasNativeWebXR()) {
      babylonSessionSupported = false;
      return mode === 'vr' ? showCardboardFallbackButton() : showUnsupportedXRButton('ar');
    }

    if (!hasBabylonScene()) {
      babylonSessionSupported = false;
      return showUnsupportedXRButton(mode);
    }

    removeXRButton();
    xrButton = document.createElement('button');
    xrButton.type = 'button';
    xrButton.dataset.nova64XrStatus = 'babylon-ready';
    xrButton.textContent = mode === 'ar' ? 'Start AR' : 'Enter VR';
    styleXRButton(xrButton);
    getRendererParent().appendChild(xrButton);

    scene
      .createDefaultXRExperienceAsync({
        disableDefaultUI: true,
        disableTeleportation: mode === 'ar',
        ignoreNativeCameraTransformation: mode === 'ar',
        optionalFeatures: true,
        inputOptions: {
          disableOnlineControllerRepository: true,
        },
      })
      .then(experience => {
        babylonXR = experience;
        babylonSessionSupported = true;
        babylonXRState = experience.baseExperience.state;
        experience.baseExperience.onStateChangedObservable.add(state => {
          babylonXRState = state;
        });

        xrButton.addEventListener('click', async () => {
          try {
            await experience.baseExperience.enterXRAsync(
              sessionMode,
              babylonReferenceSpace,
              experience.renderTarget,
              {
                optionalFeatures:
                  mode === 'ar'
                    ? ['hit-test', 'dom-overlay', 'hand-tracking']
                    : ['local-floor', 'bounded-floor', 'hand-tracking'],
                ...(options.sessionInit || {}),
              }
            );
          } catch (err) {
            console.warn(`Babylon.js ${mode.toUpperCase()} session failed:`, err);
          }
        });
        return true;
      })
      .catch(err => {
        babylonXR = null;
        babylonXRState = null;
        babylonSessionSupported = false;
        console.warn(`Babylon.js ${mode.toUpperCase()} setup failed:`, err);
        return mode === 'vr' ? showCardboardFallbackButton() : showUnsupportedXRButton('ar');
      });

    return true;
  }

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

    if (backendName === 'babylon') {
      return enableBabylonXR('vr', options);
    }

    if (!hasNativeWebXR()) {
      return showCardboardFallbackButton();
    }

    if (!hasThreeWebXR()) {
      return showUnsupportedXRButton('vr');
    }

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
    getRendererParent().appendChild(xrButton);

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

    if (backendName === 'babylon') {
      return enableBabylonXR('ar', options);
    }

    if (!hasThreeWebXR()) {
      return showUnsupportedXRButton('ar');
    }

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
    getRendererParent().appendChild(xrButton);

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

    if (backendName === 'babylon') {
      const BABYLON = await ensureBabylonModule();
      if (typeof camera?.setCameraRigMode !== 'function') {
        cardboardActive = false;
        return showUnsupportedXRButton('cardboard');
      }

      cardboardActive = true;
      camera.setCameraRigMode(BABYLON.Camera.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_PARALLEL, {
        interaxialDistance: 0.063,
      });
      scene.activeCamera = camera;

      const onOrientation = e => {
        if (!cardboardActive) return;
        const alpha = BABYLON.Tools.ToRadians(e.alpha || 0);
        const beta = BABYLON.Tools.ToRadians(e.beta || 0);
        const gamma = BABYLON.Tools.ToRadians(e.gamma || 0);
        camera.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(alpha, beta, -gamma);
      };
      deviceOrientationFn = onOrientation;

      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm !== 'granted') {
            cardboardActive = false;
            console.warn('âš ï¸ Device orientation permission denied');
            return false;
          }
        } catch (e) {
          console.warn('âš ï¸ Could not request device orientation permission', e);
        }
      }
      window.addEventListener('deviceorientation', onOrientation);

      try {
        await getRenderCanvas()?.requestFullscreen?.();
        await screen.orientation?.lock?.('landscape-primary').catch(() => {});
      } catch (e) {
        /* not critical */
      }

      console.log('ðŸ“¦ Babylon.js Cardboard VR enabled');
      return true;
    }

    if (!hasThreeRenderer()) {
      cardboardActive = false;
      return showUnsupportedXRButton('cardboard');
    }

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
      if (hasThreeWebXR()) {
        // End active session
        const session = renderer.xr.getSession();
        if (session) session.end().catch(() => {});
        renderer.xr.enabled = false;
        cleanupControllers();
        removeVRHUD();
      }
      if (backendName === 'babylon' && babylonXR) {
        babylonXR.baseExperience.exitXRAsync().catch(() => {});
        babylonXR.dispose?.();
        babylonXR = null;
        babylonXRState = null;
        babylonSessionSupported = false;
      }
    }

    if (xrMode === 'cardboard') {
      cardboardActive = false;
      stereoEffect = null;
      if (backendName === 'babylon' && typeof camera?.setCameraRigMode === 'function') {
        ensureBabylonModule().then(BABYLON => {
          camera.setCameraRigMode(BABYLON.Camera.RIG_MODE_NONE);
        });
      }
      if (deviceOrientationFn) {
        window.removeEventListener('deviceorientation', deviceOrientationFn);
        deviceOrientationFn = null;
      }
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }

    // Remove button
    removeXRButton();

    removeCameraRig();
    xrMode = null;
  }

  // ── Queries ────────────────────────────────────────────────────────────────
  function isXRActive() {
    if (xrMode === 'cardboard') return cardboardActive;
    if (backendName === 'babylon') return babylonXRState === 2;
    return hasThreeWebXR() ? renderer.xr.isPresenting : false;
  }

  function isXRSupported() {
    if (backendName === 'babylon') return babylonSessionSupported;
    return hasThreeWebXR() && typeof navigator.xr !== 'undefined';
  }

  function getXRSession() {
    if (backendName === 'babylon') {
      return babylonXR?.baseExperience?.sessionManager?.session ?? null;
    }
    return hasThreeWebXR() ? renderer.xr.getSession() : null;
  }

  function getXRMode() {
    return xrMode;
  }

  function getXRControllers() {
    if (backendName === 'babylon') {
      return (babylonXR?.input?.controllers ?? []).map((source, i) => {
        const node = source.grip ?? source.pointer;
        const pos = node?.absolutePosition ?? node?.position ?? { x: 0, y: 0, z: 0 };
        const quat = node?.absoluteRotationQuaternion ?? node?.rotationQuaternion ?? null;
        const gp = source.inputSource?.gamepad;

        return {
          index: i,
          position: { x: pos.x ?? 0, y: pos.y ?? 0, z: pos.z ?? 0 },
          rotation: {
            x: quat?.x ?? 0,
            y: quat?.y ?? 0,
            z: quat?.z ?? 0,
            w: quat?.w ?? 1,
          },
          buttons: gp
            ? Array.from(gp.buttons).map(b => ({
                pressed: b.pressed,
                touched: b.touched,
                value: b.value,
              }))
            : [],
          axes: gp ? Array.from(gp.axes) : [],
          grip: {
            position: { x: pos.x ?? 0, y: pos.y ?? 0, z: pos.z ?? 0 },
          },
        };
      });
    }

    if (!hasThreeWebXR() || controllers.length === 0) return [];

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
    if (backendName === 'babylon') return [];

    if (!hasThreeWebXR() || controllers.length === 0) return [];

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
    if (backendName === 'babylon') {
      babylonReferenceSpace = type;
      return true;
    }
    if (!hasThreeWebXR()) return false;
    renderer.xr.setReferenceSpaceType(type);
    return true;
  }

  function setCameraRigPosition(x, y, z) {
    if (backendName === 'babylon') {
      camera?.position?.set?.(x, y, z);
      return true;
    }
    if (!hasThreeWebXR()) return false;
    if (!cameraRig) ensureCameraRig();
    cameraRig.position.set(x, y, z);
    return true;
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
