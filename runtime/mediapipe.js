// runtime/mediapipe.js
// MediaPipe Vision integration for Nova64 — hand, face, and pose tracking.
// Models are lazy-loaded from CDN on first use (5–20 MB each), so there is
// zero impact on carts that don't call init*Tracking().
//
// Cart usage:
//   await initHandTracking()     — start webcam + hand landmarker
//   getHandLandmarks()           — poll 21-point landmarks per hand
//   getHandGesture()             — poll gesture name ('thumbs_up', 'fist', …)
//   await initFaceTracking()     — start webcam + face landmarker
//   getFaceLandmarks()           — poll 478-point face mesh
//   getFaceBlendShapes()         — poll blend shape coefficients
//   await initPoseTracking()     — start webcam + pose landmarker
//   getPoseLandmarks()           — poll 33-point body pose
//   startCamera(facing?)         — start webcam ('user' | 'environment')
//   stopCamera()                 — stop webcam
//   getCameraTexture()           — THREE.VideoTexture of webcam
//   showCameraBackground()       — set webcam as scene.background (AR effect)
//   hideCameraBackground()       — remove webcam background

import * as THREE from 'three';

// CDN base for MediaPipe WASM + model files
const MP_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_CDN = 'https://storage.googleapis.com/mediapipe-models';

export function mediapipeModule(gpu) {
  const scene = gpu.getScene();
  const backendName = gpu.getBackendCapabilities?.().backend ?? gpu.backendName ?? 'unknown';

  // ── Shared state ───────────────────────────────────────────────────────────
  let vision = null; // FilesetResolver instance (shared)
  let videoEl = null; // <video> element for webcam
  let videoStream = null; // MediaStream
  let videoTexture = null; // THREE.VideoTexture
  let cameraBackgroundActive = false;
  let prevBackground = null;
  let prevClearColor = null;
  let prevVideoStyle = null;

  // Per-tracker state
  let handLandmarker = null;
  let handResults = { landmarks: [], gestures: [] };
  let handRunning = false;

  let faceLandmarker = null;
  let faceResults = { landmarks: [], blendShapes: [] };
  let faceRunning = false;

  let poseLandmarker = null;
  let poseResults = { landmarks: [] };
  let poseRunning = false;

  let rafId = null;

  // ── Lazy-load the MediaPipe vision WASM runtime ────────────────────────────
  async function ensureVision() {
    if (vision) return vision;
    // Dynamic import — not bundled, loaded from CDN at runtime
    const { FilesetResolver } = await import(
      /* webpackIgnore: true */
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18'
    );
    vision = await FilesetResolver.forVisionTasks(MP_CDN);
    return vision;
  }

  // ── Webcam management ──────────────────────────────────────────────────────
  async function startCamera(facing = 'user') {
    if (videoEl && videoStream) return videoEl;
    videoEl = document.createElement('video');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('autoplay', '');
    videoEl.style.display = 'none';
    document.body.appendChild(videoEl);

    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (err) {
      videoEl.remove();
      videoEl = null;
      throw err;
    }
    videoEl.srcObject = videoStream;
    await videoEl.play();
    console.log('📷 Camera started:', facing);
    return videoEl;
  }

  function stopCamera() {
    hideCameraBackground();

    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      videoStream = null;
    }
    if (videoEl) {
      videoEl.pause();
      videoEl.remove();
      videoEl = null;
    }
    if (videoTexture) {
      videoTexture.dispose();
      videoTexture = null;
    }
    hideCameraBackground();
    console.log('📷 Camera stopped');
  }

  function getCameraTexture() {
    if (videoTexture) return videoTexture;
    if (!videoEl) return null;
    videoTexture = new THREE.VideoTexture(videoEl);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    return videoTexture;
  }

  function showCameraBackground() {
    if (cameraBackgroundActive) return;

    if (backendName !== 'threejs') {
      if (!videoEl) {
        console.warn('Call startCamera() before showCameraBackground()');
        return;
      }

      const canvas = gpu.canvas ?? gpu.getRenderer?.()?.domElement ?? null;
      const container = canvas?.parentElement ?? document.body;
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }

      prevVideoStyle = videoEl.getAttribute('style') ?? '';
      videoEl.style.cssText =
        'display:block;position:absolute;inset:0;width:100%;height:100%;' +
        'object-fit:cover;z-index:0;pointer-events:none;background:#000;';
      if (canvas) {
        container.insertBefore(videoEl, canvas);
      } else if (!videoEl.parentElement) {
        container.appendChild(videoEl);
      }

      if (scene?.clearColor?.clone) {
        prevClearColor = scene.clearColor.clone();
        if ('a' in scene.clearColor) scene.clearColor.a = 0;
      }

      cameraBackgroundActive = true;
      return;
    }

    const tex = getCameraTexture();
    if (!tex) {
      console.warn('⚠️ Call startCamera() before showCameraBackground()');
      return;
    }
    prevBackground = scene.background;
    scene.background = tex;
    cameraBackgroundActive = true;
  }

  function hideCameraBackground() {
    if (!cameraBackgroundActive) return;

    if (backendName !== 'threejs') {
      if (videoEl) {
        videoEl.setAttribute('style', prevVideoStyle || 'display:none;');
      }
      if (prevClearColor) {
        scene.clearColor = prevClearColor;
      }
      prevVideoStyle = null;
      prevClearColor = null;
      cameraBackgroundActive = false;
      return;
    }

    scene.background = prevBackground;
    prevBackground = null;
    cameraBackgroundActive = false;
  }

  // ── Detection loop ─────────────────────────────────────────────────────────
  // Runs landmark detection on each video frame and caches results for polling.
  function startDetectionLoop() {
    if (rafId !== null) return; // already running

    const detect = () => {
      if (!videoEl || videoEl.readyState < 2) {
        rafId = requestAnimationFrame(detect);
        return;
      }
      const ts = performance.now();

      if (handLandmarker && handRunning) {
        try {
          const r = handLandmarker.detectForVideo(videoEl, ts);
          handResults = {
            landmarks: r.landmarks || [],
            gestures: r.gestures || [],
          };
        } catch {
          /* frame skip */
        }
      }

      if (faceLandmarker && faceRunning) {
        try {
          const r = faceLandmarker.detectForVideo(videoEl, ts);
          faceResults = {
            landmarks: r.faceLandmarks || [],
            blendShapes: r.faceBlendshapes || [],
          };
        } catch {
          /* frame skip */
        }
      }

      if (poseLandmarker && poseRunning) {
        try {
          const r = poseLandmarker.detectForVideo(videoEl, ts);
          poseResults = {
            landmarks: r.landmarks || [],
          };
        } catch {
          /* frame skip */
        }
      }

      rafId = requestAnimationFrame(detect);
    };
    rafId = requestAnimationFrame(detect);
  }

  function stopDetectionLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ── Hand tracking ──────────────────────────────────────────────────────────
  async function initHandTracking(options = {}) {
    await startCamera(options.facing || 'user');
    const v = await ensureVision();

    const { HandLandmarker } = await import(
      /* webpackIgnore: true */
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18'
    );
    handLandmarker = await HandLandmarker.createFromOptions(v, {
      baseOptions: {
        modelAssetPath: `${MODEL_CDN}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: options.delegate || 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: options.numHands || 2,
    });
    handRunning = true;
    startDetectionLoop();
    console.log('🤚 Hand tracking initialized');
  }

  function getHandLandmarks() {
    return handResults.landmarks;
  }

  function getHandGesture() {
    // Return first gesture per hand: [{ name, score }, ...]
    return handResults.gestures.map(g =>
      g && g.length > 0 ? { name: g[0].categoryName, score: g[0].score } : null
    );
  }

  // ── Face tracking ──────────────────────────────────────────────────────────
  async function initFaceTracking(options = {}) {
    await startCamera(options.facing || 'user');
    const v = await ensureVision();

    const { FaceLandmarker } = await import(
      /* webpackIgnore: true */
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18'
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(v, {
      baseOptions: {
        modelAssetPath: `${MODEL_CDN}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: options.delegate || 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: options.numFaces || 1,
      outputFaceBlendshapes: true,
    });
    faceRunning = true;
    startDetectionLoop();
    console.log('😀 Face tracking initialized');
  }

  function getFaceLandmarks() {
    return faceResults.landmarks;
  }

  function getFaceBlendShapes() {
    return faceResults.blendShapes;
  }

  // ── Pose tracking ──────────────────────────────────────────────────────────
  async function initPoseTracking(options = {}) {
    await startCamera(options.facing || 'user');
    const v = await ensureVision();

    const { PoseLandmarker } = await import(
      /* webpackIgnore: true */
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18'
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(v, {
      baseOptions: {
        modelAssetPath: `${MODEL_CDN}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: options.delegate || 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: options.numPoses || 1,
    });
    poseRunning = true;
    startDetectionLoop();
    console.log('🏃 Pose tracking initialized');
  }

  function getPoseLandmarks() {
    return poseResults.landmarks;
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  function stopTracking() {
    handRunning = false;
    faceRunning = false;
    poseRunning = false;
    stopDetectionLoop();
    if (handLandmarker) {
      handLandmarker.close();
      handLandmarker = null;
    }
    if (faceLandmarker) {
      faceLandmarker.close();
      faceLandmarker = null;
    }
    if (poseLandmarker) {
      poseLandmarker.close();
      poseLandmarker = null;
    }
    stopCamera();
    handResults = { landmarks: [], gestures: [] };
    faceResults = { landmarks: [], blendShapes: [] };
    poseResults = { landmarks: [] };
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    _cleanup: stopTracking,

    exposeTo(target) {
      Object.assign(target, {
        initHandTracking,
        getHandLandmarks,
        getHandGesture,
        initFaceTracking,
        getFaceLandmarks,
        getFaceBlendShapes,
        initPoseTracking,
        getPoseLandmarks,
        startCamera,
        stopCamera,
        getCameraTexture,
        showCameraBackground,
        hideCameraBackground,
        stopTracking,
      });
    },
  };
}
