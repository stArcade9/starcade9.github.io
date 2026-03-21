// GPU Particle System Demo — Nova64
// Visually rich: fire columns, blizzard, electric forge
// Controls: 1/2/3 = scene, SPACE = burst, WASD = orbit, QE = zoom

let scene = 0; // 0=inferno, 1=blizzard, 2=forge
let systemIds = [];
let lightIds = []; // { id, baseX, baseZ, phase, fire/aurora/forge/electric }
let propIds = [];
let orbitAngle = 0.3;
let orbitDist = 18;
let orbitY = 8;
let frameCount = 0;
let burstCooldown = 0;
let sceneTime = 0;

const SCENES = ['\uD83D\uDD25 Inferno', '\u2745 Blizzard', '\u26A1 Forge'];

export function init() {
  setCameraFOV(70);
  buildScene(scene);
}

function clearSystems() {
  systemIds.forEach(id => removeParticleSystem(id));
  systemIds = [];
  lightIds = [];
  propIds = [];
  sceneTime = 0;
}

function buildScene(idx) {
  clearSystems();
  clearScene();
  if (idx === 0) buildFire();
  else if (idx === 1) buildBlizzard();
  else if (idx === 2) buildForge();
}

// ── Scene 0: Inferno — 3 brazier fire columns with smoke and embers ───────────
function buildFire() {
  setAmbientLight(0x110400, 0.25);
  setFog(0x050100, 12, 50);
  enableBloom(3.5, 0.85, 0.05);

  const floor = createPlane(40, 40, 0x221100, [0, 0, 0], { material: 'standard', roughness: 1 });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  const cols = [
    [-5, 0, 0],
    [0, 0, -3],
    [5, 0, 0],
  ];
  const endColors = [0xff3300, 0xff6600, 0xff9900];
  for (const [px, , pz] of cols) {
    propIds.push(
      createCylinder(0.35, 2.5, 0x443322, [px, 1.25, pz], { material: 'standard', roughness: 0.9 })
    );
    propIds.push(
      createTorus(0.55, 0.15, 0x553300, [px, 2.6, pz], {
        material: 'standard',
        roughness: 0.6,
        metalness: 0.4,
      })
    );
  }

  for (let f = 0; f < 3; f++) {
    const [fpx, , fpz] = cols[f];
    // Core flames
    systemIds.push(
      createParticleSystem(280, {
        shape: 'sphere',
        segments: 3,
        gravity: -5,
        drag: 0.97,
        emitterX: fpx,
        emitterY: 2.7,
        emitterZ: fpz,
        emitRate: 75,
        minLife: 0.8,
        maxLife: 1.6,
        minSpeed: 2,
        maxSpeed: 5,
        spread: 0.35,
        minSize: 0.06,
        maxSize: 0.28,
        startColor: 0xffdd00,
        endColor: endColors[f],
      })
    );
    // Wide embers
    systemIds.push(
      createParticleSystem(100, {
        shape: 'sphere',
        segments: 3,
        gravity: -1.5,
        drag: 0.91,
        emitterX: fpx,
        emitterY: 3.0,
        emitterZ: fpz,
        emitRate: 20,
        minLife: 0.5,
        maxLife: 2.5,
        minSpeed: 3,
        maxSpeed: 10,
        spread: 1.2,
        minSize: 0.02,
        maxSize: 0.07,
        startColor: 0xffffff,
        endColor: 0xff1100,
      })
    );
    // Dark smoke
    systemIds.push(
      createParticleSystem(130, {
        shape: 'sphere',
        segments: 4,
        gravity: -0.8,
        drag: 0.99,
        emitterX: fpx,
        emitterY: 4.2,
        emitterZ: fpz,
        emitRate: 28,
        minLife: 2.0,
        maxLife: 3.5,
        minSpeed: 0.4,
        maxSpeed: 1.2,
        spread: 0.6,
        minSize: 0.15,
        maxSize: 0.55,
        startColor: 0x333333,
        endColor: 0x111111,
      })
    );
    // Flickering point light per column
    lightIds.push({
      id: createPointLight(0xff5500, 6, 18, fpx, 3.5, fpz),
      baseX: fpx,
      baseZ: fpz,
      phase: f * 2.1,
    });
  }
}

// ── Scene 1: Blizzard — howling wind-driven snow with aurora ──────────────────
function buildBlizzard() {
  setAmbientLight(0x0a1525, 0.5);
  setFog(0x060c18, 14, 50);
  enableBloom(1.8, 0.5, 0.1);

  const floor = createPlane(60, 60, 0x8899bb, [0, 0, 0], {
    material: 'standard',
    roughness: 0.3,
    metalness: 0.1,
  });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  [
    [-8, 0.5, -4],
    [5, 0.8, 3],
    [-3, 0.4, 7],
    [9, 0.6, -2],
    [-6, 0.3, 5],
    [4, 0.5, -8],
  ].forEach(([rx, ry, rz]) =>
    propIds.push(
      createSphere(0.8, 0x99aabb, [rx, ry, rz], {
        material: 'standard',
        roughness: 0.4,
        metalness: 0.05,
      })
    )
  );

  // Wind-driven snow
  systemIds.push(
    createParticleSystem(900, {
      shape: 'sphere',
      segments: 3,
      gravity: 3.5,
      drag: 0.995,
      emitterX: -10,
      emitterY: 10,
      emitterZ: 0,
      emitRate: 200,
      minLife: 2.5,
      maxLife: 4.5,
      minSpeed: 7,
      maxSpeed: 15,
      spread: 0.85,
      minSize: 0.04,
      maxSize: 0.18,
      startColor: 0xffffff,
      endColor: 0xaabbdd,
    })
  );
  // Fine drifting mist
  systemIds.push(
    createParticleSystem(400, {
      shape: 'sphere',
      segments: 3,
      gravity: 1.0,
      drag: 0.998,
      emitterX: 0,
      emitterY: 8,
      emitterZ: 0,
      emitRate: 80,
      minLife: 4.0,
      maxLife: 7.0,
      minSpeed: 0.5,
      maxSpeed: 2.5,
      spread: Math.PI,
      minSize: 0.02,
      maxSize: 0.08,
      startColor: 0xddeeff,
      endColor: 0x6688aa,
    })
  );
  // Ground ice crystals blasted up by wind
  systemIds.push(
    createParticleSystem(200, {
      shape: 'sphere',
      segments: 3,
      gravity: 12,
      drag: 0.93,
      emitterX: 0,
      emitterY: 0.1,
      emitterZ: 0,
      emitRate: 35,
      minLife: 0.5,
      maxLife: 1.3,
      minSpeed: 2,
      maxSpeed: 8,
      spread: 0.6,
      minSize: 0.02,
      maxSize: 0.09,
      startColor: 0xeeffff,
      endColor: 0x3366aa,
    })
  );

  lightIds.push({
    id: createPointLight(0x0044ff, 3, 40, 0, 14, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    aurora: true,
  });
  lightIds.push({
    id: createPointLight(0x00ff88, 2, 30, 5, 11, -5),
    baseX: 5,
    baseZ: -5,
    phase: 1.7,
    aurora: true,
  });
}

// ── Scene 2: Forge — electric anvil with sparks and plasma ────────────────────
function buildForge() {
  setAmbientLight(0x050510, 0.2);
  setFog(0x020208, 12, 40);
  enableBloom(4.0, 0.9, 0.05);

  const floor = createPlane(30, 30, 0x1a1a2a, [0, 0, 0], {
    material: 'standard',
    roughness: 0.8,
    metalness: 0.6,
  });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  propIds.push(
    createCube(2.5, 0.6, 0x222222, [0, 0.3, 0], {
      material: 'standard',
      roughness: 0.5,
      metalness: 0.9,
    })
  );
  propIds.push(
    createCube(2.0, 0.4, 0x333344, [0, 0.8, 0], {
      material: 'standard',
      roughness: 0.3,
      metalness: 1.0,
    })
  );
  propIds.push(
    createCylinder(0.5, 0.2, 0xff6600, [0, 1.1, 0], {
      material: 'standard',
      roughness: 0.6,
      metalness: 0.8,
      emissive: 0xff3300,
      emissiveIntensity: 3.0,
    })
  );

  // Gold sparks — burst only
  systemIds.push(
    createParticleSystem(700, {
      shape: 'sphere',
      segments: 3,
      gravity: 18,
      drag: 0.91,
      emitterX: 0,
      emitterY: 1.2,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.4,
      maxLife: 1.2,
      minSpeed: 6,
      maxSpeed: 24,
      spread: Math.PI * 0.7,
      minSize: 0.015,
      maxSize: 0.1,
      startColor: 0xffffff,
      endColor: 0xff2200,
    })
  );
  // Blue plasma arcs — burst only
  systemIds.push(
    createParticleSystem(300, {
      shape: 'sphere',
      segments: 3,
      gravity: 8,
      drag: 0.88,
      emitterX: 0,
      emitterY: 1.2,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.2,
      maxLife: 0.7,
      minSpeed: 8,
      maxSpeed: 20,
      spread: Math.PI,
      minSize: 0.01,
      maxSize: 0.06,
      startColor: 0xaaffff,
      endColor: 0x0000ff,
    })
  );
  // Constant embers from hot metal
  systemIds.push(
    createParticleSystem(150, {
      shape: 'sphere',
      segments: 3,
      gravity: 5,
      drag: 0.94,
      emitterX: 0,
      emitterY: 1.1,
      emitterZ: 0,
      emitRate: 40,
      minLife: 0.5,
      maxLife: 1.8,
      minSpeed: 1,
      maxSpeed: 5,
      spread: 0.8,
      minSize: 0.02,
      maxSize: 0.08,
      startColor: 0xffcc00,
      endColor: 0xff2200,
    })
  );
  // Lightning streaks — burst only
  systemIds.push(
    createParticleSystem(120, {
      shape: 'sphere',
      segments: 3,
      gravity: 0,
      drag: 0.85,
      emitterX: 0,
      emitterY: 3,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.08,
      maxLife: 0.25,
      minSpeed: 12,
      maxSpeed: 35,
      spread: 0.3,
      minSize: 0.01,
      maxSize: 0.04,
      startColor: 0xffffff,
      endColor: 0x4444ff,
    })
  );

  lightIds.push({
    id: createPointLight(0xff4400, 8, 15, 0, 2, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    forge: true,
  });
  lightIds.push({
    id: createPointLight(0x4488ff, 5, 12, 0, 3, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    electric: true,
  });
  burstCooldown = 0.1; // kick off first hammer blow immediately
}

export function update(dt) {
  frameCount++;
  sceneTime += dt;
  burstCooldown = Math.max(0, burstCooldown - dt);

  // Camera orbit
  if (key('KeyA') || key('ArrowLeft')) orbitAngle -= dt * 1.2;
  if (key('KeyD') || key('ArrowRight')) orbitAngle += dt * 1.2;
  if (key('KeyW') || key('ArrowUp')) orbitY = Math.min(20, orbitY + dt * 5);
  if (key('KeyS') || key('ArrowDown')) orbitY = Math.max(2, orbitY - dt * 5);
  if (key('KeyQ')) orbitDist = Math.min(40, orbitDist + dt * 8);
  if (key('KeyE')) orbitDist = Math.max(6, orbitDist - dt * 8);

  const cx = Math.sin(orbitAngle) * orbitDist;
  const cz = Math.cos(orbitAngle) * orbitDist;
  setCameraPosition(cx, orbitY, cz);
  setCameraTarget(0, 2, 0);

  // Scene switch
  if (keyp('Digit1') || keyp('Numpad1')) {
    scene = 0;
    buildScene(0);
  }
  if (keyp('Digit2') || keyp('Numpad2')) {
    scene = 1;
    buildScene(1);
  }
  if (keyp('Digit3') || keyp('Numpad3')) {
    scene = 2;
    buildScene(2);
  }

  // Manual burst
  if (keyp('Space') && burstCooldown <= 0) {
    triggerBurst();
    burstCooldown = 0.3;
  }

  // Animated lights
  for (const ldata of lightIds) {
    const t = sceneTime + ldata.phase;
    if (ldata.aurora) {
      setPointLightPosition(
        ldata.id,
        ldata.baseX + Math.sin(t * 0.4) * 6,
        10 + Math.sin(t * 0.7) * 2,
        ldata.baseZ + Math.cos(t * 0.3) * 4
      );
    } else if (ldata.forge) {
      setPointLightPosition(
        ldata.id,
        (Math.random() - 0.5) * 0.4,
        1.0 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.4
      );
    } else if (ldata.electric) {
      setPointLightPosition(
        ldata.id,
        (Math.random() - 0.5) * 0.7,
        2.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.7
      );
    } else {
      // Fire column flicker
      setPointLightPosition(
        ldata.id,
        ldata.baseX + (Math.random() - 0.5) * 0.7,
        2.8 + Math.sin(t * 14 + ldata.phase) * 0.6,
        ldata.baseZ + (Math.random() - 0.5) * 0.5
      );
    }
  }

  // Blizzard: animate wind gust and periodic ice burst
  if (scene === 1) {
    if (systemIds[0]) {
      setParticleEmitter(systemIds[0], {
        emitterX: -10 + Math.sin(sceneTime * 0.25) * 5,
        emitterY: 9 + Math.sin(sceneTime * 0.5) * 2,
      });
    }
    if (frameCount % 75 === 0 && systemIds[2]) burstParticles(systemIds[2], 50);
  }

  // Forge: auto-hammer every 1.4s
  if (scene === 2 && burstCooldown <= 0) {
    triggerBurst();
    burstCooldown = 1.4;
  }

  updateParticles(dt);
}

function triggerBurst() {
  if (scene === 0) {
    // Extra ember burst from each brazier
    for (let i = 1; i < systemIds.length; i += 3) burstParticles(systemIds[i], 50);
  } else if (scene === 1) {
    if (systemIds[2]) burstParticles(systemIds[2], 90);
  } else if (scene === 2) {
    if (systemIds[0]) burstParticles(systemIds[0], 180);
    if (systemIds[1]) burstParticles(systemIds[1], 100);
    if (systemIds[3]) burstParticles(systemIds[3], 70);
  }
}

export function draw() {
  const total = systemIds.reduce((s, id) => {
    const st = getParticleStats(id);
    return s + (st ? st.active : 0);
  }, 0);

  drawRoundedRect(0, 0, 320, 14, 0, rgba8(0, 0, 0, 150));
  printCentered('[1] Inferno   [2] Blizzard   [3] Forge', 160, 2, rgba8(220, 200, 150, 255));

  drawRoundedRect(0, 220, 320, 20, 0, rgba8(0, 0, 0, 130));
  print('Scene: ' + SCENES[scene] + '   Particles: ' + total, 6, 222, rgba8(180, 255, 180, 255));
  print('[SPACE] Burst   [WASD] Orbit   [QE] Zoom', 6, 231, rgba8(110, 110, 110, 220));
}
