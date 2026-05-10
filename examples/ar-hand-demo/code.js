// AR Hand Tracking Demo — use your hands to control 3D objects
// Uses MediaPipe hand landmarks + webcam background for AR effect.

const { print } = nova64.draw;
const { createSphere, removeMesh, rotateMesh, setPosition, setScale } = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { createPointLight, setAmbientLight } = nova64.light;
const { getHandGesture, getHandLandmarks, initHandTracking, showCameraBackground } = nova64.input;
const { remove } = nova64.data;
const { remap } = nova64.util;

let cursor;
let particles = [];
let trackingError = null;
const PARTICLE_LIFETIME = 2;

export async function init() {
  // Create a cursor sphere that follows the index finger tip
  cursor = nova64.scene.createSphere(0.15, 0xff00ff, [0, 0, -3], { material: 'holographic' });

  // Ambient light
  nova64.light.setAmbientLight(0xffffff, 0.8);
  nova64.light.createPointLight(0xff44ff, 2.0, 10, [0, 2, -2]);

  nova64.camera.setCameraPosition(0, 0, 0);
  nova64.camera.setCameraTarget(0, 0, -1);
  nova64.camera.setCameraFOV(60);

  try {
    // Start hand tracking (requests webcam permission)
    await nova64.input.initHandTracking({ numHands: 2 });

    // Show webcam as scene background for AR passthrough effect
    nova64.input.showCameraBackground();
  } catch (err) {
    trackingError = err?.message || 'Hand tracking unavailable';
    console.warn('AR hand tracking unavailable:', err);
  }
}

export function update(dt) {
  const hands = nova64.input.getHandLandmarks();

  if (hands.length > 0 && hands[0]) {
    // Map hand landmark to 3D space
    // Landmarks are normalized 0–1; remap to scene coordinates
    const indexTip = hands[0][8]; // landmark 8 = index finger tip
    if (indexTip) {
      const x = (indexTip.x - 0.5) * 8; // center and scale
      const y = -(indexTip.y - 0.5) * 6; // flip Y
      const z = -3 - (indexTip.z || 0) * 2; // depth
      nova64.scene.setPosition(cursor, x, y, z);

      // Spawn trail particles from fingertip
      const p = nova64.scene.createSphere(0.05, Math.random() * 0xffffff, [x, y, z]);
      particles.push({ mesh: p, life: PARTICLE_LIFETIME });
    }

    // Detect pinch gesture (thumb tip close to index tip)
    const thumbTip = hands[0][4];
    const idxTip = hands[0][8];
    if (thumbTip && idxTip) {
      const dx = thumbTip.x - idxTip.x;
      const dy = thumbTip.y - idxTip.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.04) {
        // Pinch detected — spawn a bigger orb
        const ox = (idxTip.x - 0.5) * 8;
        const oy = -(idxTip.y - 0.5) * 6;
        const orb = nova64.scene.createSphere(0.3, 0x00ffcc, [ox, oy, -3], {
          material: 'holographic',
        });
        particles.push({ mesh: orb, life: PARTICLE_LIFETIME * 2 });
      }
    }
  }

  // Second hand — gesture display
  const gestures = nova64.input.getHandGesture();

  // Decay and remove old particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].life -= dt;
    if (particles[i].life <= 0) {
      nova64.scene.removeMesh(particles[i].mesh);
      particles.splice(i, 1);
    } else {
      // Fade out by scaling down
      const s = particles[i].life / PARTICLE_LIFETIME;
      nova64.scene.setScale(particles[i].mesh, s, s, s);
      nova64.scene.rotateMesh(particles[i].mesh, dt, dt * 0.5, 0);
    }
  }
}

export function draw() {
  nova64.draw.print('AR Hand Tracking', 10, 10, 0x00ffcc);

  if (trackingError) {
    nova64.draw.print('Camera or hand tracking unavailable', 10, 35, 0xffcc00);
    nova64.draw.print('Demo scene is running without AR input', 10, 55, 0xaaaaaa);
    nova64.draw.print(`Particles: ${particles.length}`, 10, 115, 0xaaaaaa);
    return;
  }

  const hands = nova64.input.getHandLandmarks();
  if (hands.length === 0) {
    nova64.draw.print('Show your hand to the camera...', 10, 35, 0xffcc00);
  } else {
    nova64.draw.print(`Hands detected: ${hands.length}`, 10, 35, 0x88ff88);

    const gestures = nova64.input.getHandGesture();
    for (let i = 0; i < gestures.length; i++) {
      if (gestures[i]) {
        nova64.draw.print(`Hand ${i + 1}: ${gestures[i].name}`, 10, 55 + i * 20, 0xffffff);
      }
    }

    nova64.draw.print('Pinch to spawn orbs!', 10, 95, 0xff88ff);
  }

  nova64.draw.print(`Particles: ${particles.length}`, 10, 115, 0xaaaaaa);
}
