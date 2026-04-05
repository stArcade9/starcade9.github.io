// CREATIVE CODING 3D — Nova64
// 4 spectacular generative 3D scenes:
//   1) Gyroscope — nested rotating rings with color-cycling cubes
//   2) Cosmic Jellyfish — bioluminescent deep-sea creature
//   3) Particle Storm — vortex of GPU particles with orbiting attractors
//   4) Sacred Geometry — interlocking polyhedra + orbiting halos
// Controls: 1-4 = scene, SPACE = reset, WASD = orbit, Q/E = zoom

const W = 640,
  H = 360;
let scene = 0;
let meshes = [];
let lights = [];
let particleSystems = [];
let time = 0;
let orbitAngle = 0;
let orbitDist = 20;
let orbitY = 6;
let initialized = false;

const SCENE_NAMES = ['Gyroscope', 'Cosmic Jellyfish', 'Particle Storm', 'Sacred Geometry'];

export function init() {
  initialized = false;
  setCameraFOV(65);
  buildScene(0);
}

function clearAll() {
  for (const id of meshes) removeMesh(id);
  for (const id of particleSystems) removeParticleSystem(id);
  meshes = [];
  lights = [];
  particleSystems = [];
  time = 0;
}

function buildScene(idx) {
  clearAll();
  clearScene();
  scene = idx;
  if (idx === 0) buildGyroscope();
  else if (idx === 1) buildJellyfish();
  else if (idx === 2) buildParticleStorm();
  else if (idx === 3) buildSacredGeometry();
  initialized = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 0: GYROSCOPE
// 3 nested rings rotating on different axes, each made of cubes that
// pulse and cycle color. Central glowing sphere. Dramatic lighting.
// ═══════════════════════════════════════════════════════════════════════════

const RING_SIZES = [10, 7, 4];
const CUBES_PER_RING = [24, 18, 12];
let gyroRings = [];
let gyroCore;

function buildGyroscope() {
  setAmbientLight(0x111122, 0.2);
  setFog(0x050510, 20, 80);
  enableBloom(2.0, 0.6, 0.2);
  createGradientSkybox(0x020208, 0x080820, 0x0a0a30);
  gyroRings = [];

  const axes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const hues = [0, 120, 240];
  const speeds = [0.4, -0.6, 0.8];

  for (let r = 0; r < 3; r++) {
    const ring = {
      ids: [],
      radius: RING_SIZES[r],
      axis: axes[r],
      speed: speeds[r],
      hueBase: hues[r],
    };
    const count = CUBES_PER_RING[r];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const rad = ring.radius;
      let x, y, z;
      if (r === 0) {
        x = 0;
        y = Math.cos(angle) * rad;
        z = Math.sin(angle) * rad;
      } else if (r === 1) {
        x = Math.cos(angle) * rad;
        y = 0;
        z = Math.sin(angle) * rad;
      } else {
        x = Math.cos(angle) * rad;
        y = Math.sin(angle) * rad;
        z = 0;
      }
      const cubeSize = 0.5 + (r === 2 ? 0.3 : 0);
      const color = hslToHex((hues[r] + i * (360 / count)) % 360, 0.8, 0.6);
      const id = createCube(cubeSize, color, [x, y, z], { material: 'holographic' });
      meshes.push(id);
      ring.ids.push({ id, angle, idx: i, count });
    }
    gyroRings.push(ring);
  }

  // Central core — pulsing emissive sphere
  gyroCore = createSphere(1.5, 0xffffff, [0, 0, 0], 16, { material: 'emissive' });
  meshes.push(gyroCore);

  // Orbiting accent spheres
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const id = createSphere(
      0.25,
      0xff88ff,
      [Math.cos(a) * 14, Math.sin(a * 3) * 2, Math.sin(a) * 14],
      8,
      { material: 'emissive' }
    );
    meshes.push(id);
  }

  const pl1 = createPointLight(0x4488ff, 3, 50, [0, 0, 0]);
  const pl2 = createPointLight(0xff4488, 2, 40, [12, 5, 0]);
  const pl3 = createPointLight(0x44ff88, 2, 40, [-12, -5, 0]);
  lights.push(pl1, pl2, pl3);

  orbitDist = 22;
  orbitY = 8;
}

function _updateGyroscope(dt) {
  for (let r = 0; r < gyroRings.length; r++) {
    const ring = gyroRings[r];
    const rotAngle = time * ring.speed;
    const cosA = Math.cos(rotAngle),
      sinA = Math.sin(rotAngle);

    for (const cube of ring.ids) {
      const baseAngle = cube.angle;
      const rad = ring.radius;
      let bx, by, bz;

      if (r === 0) {
        bx = 0;
        by = Math.cos(baseAngle) * rad;
        bz = Math.sin(baseAngle) * rad;
      } else if (r === 1) {
        bx = Math.cos(baseAngle) * rad;
        by = 0;
        bz = Math.sin(baseAngle) * rad;
      } else {
        bx = Math.cos(baseAngle) * rad;
        by = Math.sin(baseAngle) * rad;
        bz = 0;
      }

      let fx = bx,
        fy = by,
        fz = bz;
      if (r === 0) {
        fy = by * cosA - bz * sinA;
        fz = by * sinA + bz * cosA;
      } else if (r === 1) {
        fx = bx * cosA + bz * sinA;
        fz = -bx * sinA + bz * cosA;
      } else {
        fx = bx * cosA - by * sinA;
        fy = bx * sinA + by * cosA;
      }

      setPosition(cube.id, fx, fy, fz);

      const pulse = 1 + Math.sin(time * 3 + cube.idx * 0.5) * 0.3;
      const s = (0.5 + (r === 2 ? 0.3 : 0)) * pulse;
      setScale(cube.id, s, s, s);
      rotateMesh(cube.id, dt * 2, dt * 3, 0);
    }
  }

  // Core pulse
  const coreScale = 1.5 + Math.sin(time * 2) * 0.4 + Math.sin(time * 5) * 0.15;
  setScale(gyroCore, coreScale, coreScale, coreScale);

  // Orbit accent spheres
  const accentStart = gyroRings.reduce((sum, r) => sum + r.ids.length, 0) + 1;
  for (let i = 0; i < 6; i++) {
    const idx = accentStart + i;
    if (idx < meshes.length) {
      const a = (i / 6) * Math.PI * 2 + time * 0.5;
      const wobble = Math.sin(time * 2 + i) * 3;
      setPosition(meshes[idx], Math.cos(a) * 14, wobble, Math.sin(a) * 14);
    }
  }

  // Move lights
  if (lights[1])
    setPointLightPosition(
      lights[1],
      Math.cos(time * 0.7) * 12,
      5 + Math.sin(time) * 3,
      Math.sin(time * 0.7) * 12
    );
  if (lights[2])
    setPointLightPosition(
      lights[2],
      Math.cos(time * 0.5 + 2) * 12,
      -5 + Math.cos(time * 0.8) * 3,
      Math.sin(time * 0.5 + 2) * 12
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1: COSMIC JELLYFISH
// A giant bioluminescent jellyfish floating in deep space.
// Bell made of layered torus rings, tentacles of sphere chains with
// sinusoidal wave propagation, glowing inner organs.
// ═══════════════════════════════════════════════════════════════════════════

let jellyBell = [];
let jellyTentacles = [];
let jellyOrgans = [];
let jellyVeils = [];

function buildJellyfish() {
  setAmbientLight(0x050515, 0.15);
  setFog(0x010108, 25, 90);
  enableBloom(2.5, 0.7, 0.15);
  createGradientSkybox(0x000004, 0x020210, 0x040420);
  jellyBell = [];
  jellyTentacles = [];
  jellyOrgans = [];
  jellyVeils = [];

  // Bell — dome of torus rings stacked vertically
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const y = 4 - t * 6;
    const radius = Math.sin(t * Math.PI) * 5 + 0.5;
    const tube = 0.08 + (1 - t) * 0.12;
    const hue = 260 + t * 40;
    const color = hslToHex(hue, 0.7, 0.5);
    const id = createTorus(radius, tube, color, [0, y, 0], { material: 'holographic' });
    meshes.push(id);
    jellyBell.push({ id, baseY: y, baseRadius: radius, t, phase: i * 0.5 });
  }

  // Bell cap — large translucent sphere
  const cap = createSphere(4, 0x6644cc, [0, 2, 0], 16, { material: 'holographic' });
  meshes.push(cap);
  setMeshOpacity(cap, 0.25);
  setScale(cap, 1, 0.6, 1);
  jellyBell.push({ id: cap, baseY: 2, baseRadius: 4, t: 0.5, phase: 0, isCap: true });

  // Inner organs — glowing emissive spheres
  const organColors = [0xff2288, 0xff44aa, 0xcc22ff, 0xff6644, 0x44aaff];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const dist = 1 + Math.random() * 1.5;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const orgY = 0.5 + Math.random();
    const id = createSphere(0.3 + Math.random() * 0.4, organColors[i], [x, orgY, z], 8, {
      material: 'emissive',
    });
    meshes.push(id);
    jellyOrgans.push({
      id,
      baseX: x,
      baseY: orgY,
      baseZ: z,
      phase: i * 1.2,
      speed: 1 + Math.random(),
    });
  }

  // Tentacles — 8 long chains of small spheres
  for (let t = 0; t < 8; t++) {
    const baseAngle = (t / 8) * Math.PI * 2;
    const tentacle = [];
    const segCount = 20;
    const isLong = t % 2 === 0;
    const length = isLong ? 18 : 12;
    const hue = 270 + (t / 8) * 60;

    for (let s = 0; s < segCount; s++) {
      const progress = s / (segCount - 1);
      const dist = 3.5 + progress * 1;
      const x = Math.cos(baseAngle) * dist;
      const z = Math.sin(baseAngle) * dist;
      const y = -2 - progress * length;
      const size = 0.25 * (1 - progress * 0.7);
      const color = hslToHex(hue + progress * 30, 0.6, 0.4 + (1 - progress) * 0.3);
      const id = createSphere(size, color, [x, y, z], 6, { material: 'emissive' });
      meshes.push(id);
      tentacle.push({ id, baseX: x, baseY: y, baseZ: z, progress, phase: t * 0.8 + s * 0.15 });
    }
    jellyTentacles.push(tentacle);
  }

  // Trailing veil — thin torus rings below bell
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const radius = 4 - t * 1.5;
    const y = -2 - t * 3;
    const color = hslToHex(280 + t * 20, 0.5, 0.3);
    const id = createTorus(radius, 0.03, color, [0, y, 0], { material: 'emissive' });
    meshes.push(id);
    jellyVeils.push({ id, baseY: y, baseRadius: radius, t, phase: i * 0.7 });
  }

  // Ambient particles — tiny floating plankton
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 30;
    const y = (Math.random() - 0.5) * 25;
    const z = (Math.random() - 0.5) * 30;
    const size = 0.06 + Math.random() * 0.1;
    const color = hslToHex(200 + Math.random() * 80, 0.5, 0.6);
    const id = createSphere(size, color, [x, y, z], 4, { material: 'emissive' });
    meshes.push(id);
  }

  const pl1 = createPointLight(0x6644ff, 3, 50, [0, 2, 0]);
  const pl2 = createPointLight(0xff2288, 2, 40, [0, -5, 0]);
  const pl3 = createPointLight(0x2244ff, 1.5, 60, [10, 0, 10]);
  lights.push(pl1, pl2, pl3);

  orbitDist = 25;
  orbitY = 2;
}

function _updateJellyfish(dt) {
  // Jellyfish "swimming" — bell contracts and expands
  const breathCycle = Math.sin(time * 1.2) * 0.5 + 0.5;
  const contractAmount = breathCycle * 0.25;

  for (const ring of jellyBell) {
    if (ring.isCap) {
      const scaleXZ = 1 - contractAmount * 0.3;
      const scaleY = 0.6 + contractAmount * 0.15;
      setScale(ring.id, scaleXZ, scaleY, scaleXZ);
      setPosition(ring.id, 0, ring.baseY + Math.sin(time * 0.4) * 0.5, 0);
    } else {
      const expansion = 1 - contractAmount * (1 - ring.t);
      const wobble = Math.sin(time * 1.5 + ring.phase) * 0.3;
      setScale(ring.id, expansion, 1, expansion);
      setPosition(ring.id, 0, ring.baseY + wobble + Math.sin(time * 0.4) * 0.5, 0);
      rotateMesh(ring.id, 0, dt * (0.1 + ring.t * 0.2), 0);
    }
  }

  // Organs pulse independently
  for (const organ of jellyOrgans) {
    const pulse = 1 + Math.sin(time * organ.speed * 2 + organ.phase) * 0.5;
    setScale(organ.id, pulse, pulse, pulse);
    const drift = Math.sin(time * 0.8 + organ.phase) * 0.3;
    setPosition(
      organ.id,
      organ.baseX + drift,
      organ.baseY + Math.sin(time * 0.4) * 0.5,
      organ.baseZ
    );
  }

  // Tentacles wave — propagating sine wave down each chain
  for (const tentacle of jellyTentacles) {
    for (const seg of tentacle) {
      const waveX = Math.sin(time * 1.5 + seg.phase) * (2 + seg.progress * 4);
      const waveZ = Math.cos(time * 1.2 + seg.phase * 1.3) * (1.5 + seg.progress * 3);
      const gentle = Math.sin(time * 0.4) * 0.5;
      setPosition(
        seg.id,
        seg.baseX + waveX * seg.progress,
        seg.baseY + gentle + Math.sin(time * 2 + seg.progress * 3) * seg.progress * 0.5,
        seg.baseZ + waveZ * seg.progress
      );
    }
  }

  // Veils drift
  for (const veil of jellyVeils) {
    const drift = Math.sin(time * 0.8 + veil.phase) * 0.5;
    const yOff = Math.sin(time * 0.4) * 0.5;
    setPosition(veil.id, drift * 0.5, veil.baseY + yOff, drift * 0.3);
    const expansion = 1 + Math.sin(time * 1.2 + veil.phase) * 0.1;
    setScale(veil.id, expansion, 1, expansion);
    rotateMesh(veil.id, 0, dt * 0.15, 0);
  }

  // Internal light follows breathing
  if (lights[0]) {
    setPointLightColor(lights[0], hslToHex(260 + Math.sin(time) * 20, 0.8, 0.5));
    setPointLightPosition(lights[0], 0, 2 + Math.sin(time * 0.4) * 0.5, 0);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 2: PARTICLE STORM
// GPU particle vortex with orbiting attractor spheres and dynamic forces.
// Thousands of particles spiral and collide in a chaotic storm.
// ═══════════════════════════════════════════════════════════════════════════

let stormAttractors = [];
let stormEmitters = [];
const ATTRACTOR_COUNT = 4;

function buildParticleStorm() {
  setAmbientLight(0x0a0a15, 0.15);
  setFog(0x020205, 30, 100);
  enableBloom(2.2, 0.8, 0.1);
  createGradientSkybox(0x000005, 0x050515, 0x0a0a25);
  stormAttractors = [];
  stormEmitters = [];

  // Attractor spheres — visible glowing orbs that "pull" particles
  const attractorColors = [0xff2244, 0x44ff88, 0x4488ff, 0xff8844];
  for (let i = 0; i < ATTRACTOR_COUNT; i++) {
    const angle = (i / ATTRACTOR_COUNT) * Math.PI * 2;
    const dist = 8;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const id = createSphere(0.8, attractorColors[i], [x, 0, z], 12, { material: 'emissive' });
    meshes.push(id);

    // Halo ring around each attractor
    const haloId = createTorus(1.5, 0.05, attractorColors[i], [x, 0, z], { material: 'emissive' });
    meshes.push(haloId);

    stormAttractors.push({
      sphereId: id,
      haloId,
      angle,
      dist,
      baseColor: attractorColors[i],
      orbitSpeed: 0.3 + i * 0.15,
    });
  }

  // Central vortex core
  const core = createSphere(0.5, 0xffffff, [0, 0, 0], 12, { material: 'emissive' });
  meshes.push(core);

  // Multiple particle systems with different characteristics
  const psColors = [
    { start: 0xff4466, end: 0x440011 },
    { start: 0x44ff88, end: 0x004411 },
    { start: 0x4488ff, end: 0x001144 },
    { start: 0xffaa44, end: 0x441100 },
  ];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const ps = createParticleSystem(300, {
      shape: 'sphere',
      segments: 4,
      startColor: psColors[i].start,
      endColor: psColors[i].end,
      emissive: psColors[i].start,
      emissiveIntensity: 3,
      gravity: 0,
      drag: 0.98,
      emitterX: Math.cos(angle) * 5,
      emitterY: 0,
      emitterZ: Math.sin(angle) * 5,
      emitRate: 60,
      minLife: 2,
      maxLife: 5,
      minSpeed: 2,
      maxSpeed: 8,
      spread: Math.PI,
      minSize: 0.15,
      maxSize: 0.6,
    });
    particleSystems.push(ps);
    stormEmitters.push({ id: ps, angle, idx: i });
  }

  // Structural elements — thin rings showing vortex shape
  for (let i = 0; i < 8; i++) {
    const y = -6 + i * 1.5;
    const radius = 4 + Math.abs(y) * 0.5;
    const id = createTorus(radius, 0.02, 0x222244, [0, y, 0], { material: 'emissive' });
    meshes.push(id);
    setMeshOpacity(id, 0.3);
  }

  const pl1 = createPointLight(0xffffff, 2, 30, [0, 0, 0]);
  const pl2 = createPointLight(0xff4488, 3, 50, [10, 5, 0]);
  const pl3 = createPointLight(0x4488ff, 3, 50, [-10, -5, 0]);
  lights.push(pl1, pl2, pl3);

  orbitDist = 24;
  orbitY = 8;
}

function _updateParticleStorm(dt) {
  // Orbit attractors
  for (const attr of stormAttractors) {
    attr.angle += dt * attr.orbitSpeed;
    const wobbleY = Math.sin(time * 1.5 + attr.angle * 2) * 3;
    const x = Math.cos(attr.angle) * attr.dist;
    const z = Math.sin(attr.angle) * attr.dist;
    setPosition(attr.sphereId, x, wobbleY, z);
    setPosition(attr.haloId, x, wobbleY, z);

    // Pulse attractor
    const pulse = 0.8 + Math.sin(time * 3 + attr.angle) * 0.3;
    setScale(attr.sphereId, pulse, pulse, pulse);

    // Rotate halo
    rotateMesh(attr.haloId, dt * 2, dt * 3, dt);
    const haloScale = 1.5 + Math.sin(time * 2 + attr.angle) * 0.3;
    setScale(attr.haloId, haloScale, haloScale, haloScale);
  }

  // Move emitters in spiral pattern
  for (const em of stormEmitters) {
    em.angle += dt * 0.8;
    const spiralDist = 5 + Math.sin(time * 0.5 + em.idx) * 3;
    const y = Math.sin(time + em.idx * 1.5) * 4;
    setParticleEmitter(em.id, {
      emitterX: Math.cos(em.angle) * spiralDist,
      emitterY: y,
      emitterZ: Math.sin(em.angle) * spiralDist,
      spread: Math.PI * 0.3 + Math.sin(time) * 0.2,
    });
  }

  // Core pulsing
  const coreIdx = ATTRACTOR_COUNT * 2;
  if (coreIdx < meshes.length) {
    const coreScale = 0.5 + Math.sin(time * 4) * 0.2 + Math.abs(Math.sin(time * 7)) * 0.15;
    setScale(meshes[coreIdx], coreScale, coreScale, coreScale);
  }

  // Rotate structural rings
  const ringStart = coreIdx + 1;
  for (let i = 0; i < 8; i++) {
    const idx = ringStart + i;
    if (idx < meshes.length) {
      rotateMesh(meshes[idx], 0, dt * (0.2 + i * 0.05) * (i % 2 === 0 ? 1 : -1), dt * 0.1);
    }
  }

  updateParticles(dt);

  // Orbiting lights
  if (lights[1])
    setPointLightPosition(
      lights[1],
      Math.cos(time * 0.4) * 12,
      5 + Math.sin(time * 0.6) * 3,
      Math.sin(time * 0.4) * 12
    );
  if (lights[2])
    setPointLightPosition(
      lights[2],
      Math.cos(time * 0.3 + 3) * 12,
      -5 + Math.cos(time * 0.5) * 3,
      Math.sin(time * 0.3 + 3) * 12
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3: SACRED GEOMETRY
// Interlocking polyhedra, rotating halos of spheres, Metatron's cube
// pattern visible through orbiting vertices. Meditative and hypnotic.
// ═══════════════════════════════════════════════════════════════════════════

let sacredVertices = [];
let sacredEdges = [];
let sacredHalos = [];
let sacredCenter = [];

function buildSacredGeometry() {
  setAmbientLight(0x0f0f1a, 0.2);
  setFog(0x050510, 25, 80);
  enableBloom(1.8, 0.5, 0.15);
  createGradientSkybox(0x030308, 0x0a0a1e, 0x0f0f2a);
  sacredVertices = [];
  sacredEdges = [];
  sacredHalos = [];
  sacredCenter = [];

  // Icosahedron vertices (golden ratio)
  const phi = (1 + Math.sqrt(5)) / 2;
  const icoVerts = [
    [-1, phi, 0],
    [1, phi, 0],
    [-1, -phi, 0],
    [1, -phi, 0],
    [0, -1, phi],
    [0, 1, phi],
    [0, -1, -phi],
    [0, 1, -phi],
    [phi, 0, -1],
    [phi, 0, 1],
    [-phi, 0, -1],
    [-phi, 0, 1],
  ];
  const scale = 4;

  // Create vertex spheres for icosahedron
  for (let i = 0; i < icoVerts.length; i++) {
    const [x, y, z] = icoVerts[i];
    const hue = (i / icoVerts.length) * 360;
    const color = hslToHex(hue, 0.7, 0.6);
    const id = createSphere(0.35, color, [x * scale, y * scale, z * scale], 8, {
      material: 'emissive',
    });
    meshes.push(id);
    sacredVertices.push({
      id,
      baseX: x * scale,
      baseY: y * scale,
      baseZ: z * scale,
      hue,
      phase: i * 0.5,
    });
  }

  // Create edges — thin cylinders connecting adjacent vertices
  const icoEdges = [
    [0, 1],
    [0, 5],
    [0, 7],
    [0, 10],
    [0, 11],
    [1, 5],
    [1, 7],
    [1, 8],
    [1, 9],
    [2, 3],
    [2, 4],
    [2, 6],
    [2, 10],
    [2, 11],
    [3, 4],
    [3, 6],
    [3, 8],
    [3, 9],
    [4, 5],
    [4, 9],
    [4, 11],
    [5, 9],
    [5, 11],
    [6, 7],
    [6, 8],
    [6, 10],
    [7, 8],
    [7, 10],
    [8, 9],
    [10, 11],
  ];
  for (const [a, b] of icoEdges) {
    const va = icoVerts[a],
      vb = icoVerts[b];
    const mx = ((va[0] + vb[0]) * scale) / 2;
    const my = ((va[1] + vb[1]) * scale) / 2;
    const mz = ((va[2] + vb[2]) * scale) / 2;
    const dx = (vb[0] - va[0]) * scale;
    const dy = (vb[1] - va[1]) * scale;
    const dz = (vb[2] - va[2]) * scale;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const id = createCylinder(0.04, 0.04, len, 0x4466aa, [mx, my, mz], { material: 'emissive' });
    meshes.push(id);
    const ax = Math.atan2(Math.sqrt(dx * dx + dz * dz), dy);
    const ay = Math.atan2(dx, dz);
    setRotation(id, ax - Math.PI / 2, ay, 0);
    sacredEdges.push({ id });
  }

  // Orbiting halos — 3 rings of spheres at different planes
  const haloColors = [0xaa66ff, 0x66aaff, 0xffaa66];
  const haloRadii = [9, 11, 13];
  const haloCounts = [16, 20, 24];
  for (let h = 0; h < 3; h++) {
    const halo = {
      ids: [],
      radius: haloRadii[h],
      count: haloCounts[h],
      axis: h,
      speed: (h + 1) * 0.2,
    };
    for (let i = 0; i < haloCounts[h]; i++) {
      const angle = (i / haloCounts[h]) * Math.PI * 2;
      const x = Math.cos(angle) * haloRadii[h];
      const z = Math.sin(angle) * haloRadii[h];
      const size = 0.15 + (h === 0 ? 0.1 : 0);
      const id = createSphere(size, haloColors[h], [x, 0, z], 6, { material: 'holographic' });
      meshes.push(id);
      halo.ids.push({ id, angle, idx: i });
    }
    sacredHalos.push(halo);
  }

  // Central seed of life — 7 torus rings
  const seedRadius = 2;
  const centerId = createTorus(seedRadius, 0.06, 0xffffff, [0, 0, 0], { material: 'holographic' });
  meshes.push(centerId);
  sacredCenter.push({ id: centerId, angle: 0 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * seedRadius;
    const z = Math.sin(a) * seedRadius;
    const id = createTorus(seedRadius, 0.05, 0xccaaff, [x, 0, z], { material: 'holographic' });
    meshes.push(id);
    sacredCenter.push({ id, angle: a });
  }

  const pl1 = createPointLight(0x8866ff, 3, 50, [0, 0, 0]);
  const pl2 = createPointLight(0xff6688, 2, 40, [8, 8, 0]);
  const pl3 = createPointLight(0x66ff88, 2, 40, [-8, -8, 0]);
  lights.push(pl1, pl2, pl3);

  orbitDist = 24;
  orbitY = 8;
}

function _updateSacredGeometry(dt) {
  // Slowly rotate the whole icosahedron
  const rotY = time * 0.15;
  const rotX = time * 0.1;
  const cosY = Math.cos(rotY),
    sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX),
    sinX = Math.sin(rotX);

  for (const v of sacredVertices) {
    let x = v.baseX,
      y = v.baseY,
      z = v.baseZ;
    const rx = x * cosY + z * sinY;
    const rz = -x * sinY + z * cosY;
    const ry = y * cosX - rz * sinX;
    const rz2 = y * sinX + rz * cosX;

    setPosition(v.id, rx, ry, rz2);

    const pulse = 1 + Math.sin(time * 2 + v.phase) * 0.3;
    setScale(v.id, 0.35 * pulse, 0.35 * pulse, 0.35 * pulse);
  }

  // Rotate edges with vertices
  for (const e of sacredEdges) {
    rotateMesh(e.id, dt * 0.1, dt * 0.15, 0);
  }

  // Orbit halos around different axes
  for (let h = 0; h < sacredHalos.length; h++) {
    const halo = sacredHalos[h];
    const rotAngle = time * halo.speed * (h % 2 === 0 ? 1 : -1);
    const tilt = (h * Math.PI) / 3;

    for (const sphere of halo.ids) {
      const a = sphere.angle + rotAngle;
      const r = halo.radius + Math.sin(time * 1.5 + sphere.idx * 0.3) * 0.5;
      let x = Math.cos(a) * r;
      let y = 0;
      let z = Math.sin(a) * r;

      const cosT = Math.cos(tilt),
        sinT = Math.sin(tilt);
      const ty = y * cosT - z * sinT;
      const tz = y * sinT + z * cosT;

      setPosition(sphere.id, x, ty, tz);

      const breathe = 0.15 + Math.sin(time * 3 + sphere.idx * 0.2) * 0.05;
      setScale(sphere.id, breathe * 5, breathe * 5, breathe * 5);
    }
  }

  // Seed of life — rotate torus rings
  for (const ring of sacredCenter) {
    rotateMesh(ring.id, dt * 0.3, dt * 0.2, dt * 0.1);
    const pulse = 1 + Math.sin(time * 1.5 + ring.angle) * 0.1;
    setScale(ring.id, pulse, pulse, pulse);
  }

  // Dynamic lights
  if (lights[0]) {
    const lColor = hslToHex((time * 20) % 360, 0.6, 0.5);
    setPointLightColor(lights[0], lColor);
  }
  if (lights[1])
    setPointLightPosition(
      lights[1],
      Math.cos(time * 0.3) * 10,
      8 + Math.sin(time * 0.5) * 4,
      Math.sin(time * 0.3) * 10
    );
  if (lights[2])
    setPointLightPosition(
      lights[2],
      Math.cos(time * 0.25 + 3) * 10,
      -8 + Math.cos(time * 0.4) * 4,
      Math.sin(time * 0.25 + 3) * 10
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const ri = Math.round((r + m) * 255);
  const gi = Math.round((g + m) * 255);
  const bi = Math.round((b + m) * 255);
  return (ri << 16) | (gi << 8) | bi;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════

export function update(dt) {
  if (!initialized) return;
  time += dt;

  // Scene switching
  for (let i = 1; i <= 4; i++) {
    if (keyp('Digit' + i)) buildScene(i - 1);
  }
  if (keyp('Space')) buildScene(scene);

  // Camera orbit
  if (key('KeyA') || key('ArrowLeft')) orbitAngle -= dt * 1.8;
  if (key('KeyD') || key('ArrowRight')) orbitAngle += dt * 1.8;
  if (key('KeyW') || key('ArrowUp')) orbitY += dt * 5;
  if (key('KeyS') || key('ArrowDown')) orbitY -= dt * 5;
  if (key('KeyQ')) orbitDist = Math.max(8, orbitDist - dt * 10);
  if (key('KeyE')) orbitDist = Math.min(50, orbitDist + dt * 10);
  orbitY = Math.max(-10, Math.min(25, orbitY));

  // Auto-rotate
  orbitAngle += dt * 0.12;

  const cx = Math.cos(orbitAngle) * orbitDist;
  const cz = Math.sin(orbitAngle) * orbitDist;
  setCameraPosition(cx, orbitY, cz);
  setCameraTarget(0, 0, 0);

  // Scene-specific updates
  if (scene === 0) _updateGyroscope(dt);
  else if (scene === 1) _updateJellyfish(dt);
  else if (scene === 2) _updateParticleStorm(dt);
  else if (scene === 3) _updateSacredGeometry(dt);
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAW — 2D HUD overlay
// ═══════════════════════════════════════════════════════════════════════════

export function draw() {
  const name = SCENE_NAMES[scene];
  drawPanel(8, 4, 260, 28, {
    bgColor: rgba8(0, 0, 0, 160),
    borderLight: rgba8(80, 80, 140, 120),
    borderDark: rgba8(40, 40, 80, 120),
  });
  print(`${scene + 1}/4  ${name}`, 16, 12, rgba8(220, 200, 255));
  print('[1-4] SCENE  [SPACE] RESET  [WASD] ORBIT  [Q/E] ZOOM', 10, H - 18, rgba8(100, 100, 150));
  print('CREATIVE CODING 3D', W - 170, 12, rgba8(140, 100, 200));
}
