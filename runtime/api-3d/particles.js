// runtime/api-3d/particles.js
// GPU particle system: typed-array physics simulation, single InstancedMesh draw call
//
// API:
//   createParticleSystem(maxParticles, options) → systemId
//   setParticleEmitter(systemId, emitter)          configure emission
//   emitParticle(systemId, overrides?)             fire one particle
//   burstParticles(systemId, count, overrides?)    fire N particles at once
//   updateParticles(dt)                            step all systems (call each frame)
//   removeParticleSystem(systemId)                 cleanup

import * as THREE from 'three';

export function particlesModule({ scene, counters }) {
  // Per-particle typed arrays layout (indices into Float32Array pools):
  //   px py pz  — position
  //   vx vy vz  — velocity
  //   age life  — lifetime tracking
  //   r g b     — color (0-1)
  //   size      — scale
  //   active    — 1 = alive, 0 = dead

  const STRIDE = 13; // slots per particle

  const particleSystems = new Map();
  let psCounter = 0;

  const _dummy = new THREE.Object3D();
  const _color = new THREE.Color();

  function createParticleSystem(maxParticles = 200, options = {}) {
    const {
      shape = 'sphere',
      size = 1.0,
      segments = 4,
      color = 0xffffff,
      startColor = color,
      endColor = 0x000000,
      emissive = startColor,
      emissiveIntensity = 2.0,
      gravity = -9.8,
      drag = 0.95,
      blending = 'normal', // 'normal' | 'additive'
      // Emitter defaults
      emitterX = 0,
      emitterY = 0,
      emitterZ = 0,
      emitRate = 20, // particles per second
      minLife = 0.8,
      maxLife = 2.0,
      minSpeed = 2,
      maxSpeed = 8,
      spread = Math.PI, // half-angle cone spread (PI = hemisphere)
      minSize = 0.05,
      maxSize = 0.3,
      // TSL-standard enhancements
      turbulence = 0, // turbulence noise strength (0 = off)
      turbulenceScale = 1.0, // spatial frequency of turbulence
      attractorX = null, // attractor point (null = off)
      attractorY = null,
      attractorZ = null,
      attractorStrength = 0, // pull strength toward attractor
      sizeOverLife = null, // [start, mid, end] size multiplier curve (null = default shrink)
      opacity = 1.0,
      opacityOverLife = null, // [start, mid, end] opacity curve (null = default fade-out)
      rotationSpeed = 0, // random spin speed
    } = options;

    // Geometry
    let geometry;
    if (shape === 'cube') {
      geometry = new THREE.BoxGeometry(size, size, size);
    } else {
      geometry = new THREE.SphereGeometry(size, segments, segments);
    }

    const stdMat = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(emissive),
      emissiveIntensity,
      roughness: 0.8,
      metalness: 0.0,
      transparent: true,
      opacity,
      blending: blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: blending === 'additive' ? false : true,
    });

    const mesh = new THREE.InstancedMesh(geometry, stdMat, maxParticles);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    // Hide all instances initially by scaling to zero
    _dummy.position.set(0, -9999, 0);
    _dummy.scale.set(0, 0, 0);
    _dummy.updateMatrix();
    for (let i = 0; i < maxParticles; i++) {
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Enable per-instance color
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxParticles * 3), 3);

    scene.add(mesh);

    // Typed-array particle state pool
    const pool = new Float32Array(maxParticles * STRIDE);
    // All start inactive (age = life = 0, active slot = 0)

    const id = ++psCounter;
    particleSystems.set(id, {
      mesh,
      pool,
      maxParticles,
      freeList: Array.from({ length: maxParticles }, (_, i) => i),
      activeCount: 0,
      emitAccum: 0,
      emitter: {
        x: emitterX,
        y: emitterY,
        z: emitterZ,
        emitRate,
        minLife,
        maxLife,
        minSpeed,
        maxSpeed,
        spread,
        minSize,
        maxSize,
      },
      config: {
        gravity,
        drag,
        startColor: new THREE.Color(startColor),
        endColor: new THREE.Color(endColor),
        turbulence,
        turbulenceScale,
        attractorX,
        attractorY,
        attractorZ,
        attractorStrength,
        sizeOverLife,
        opacityOverLife,
        rotationSpeed,
      },
    });

    counters.particle = (counters.particle || 0) + 1;
    return id;
  }

  function setParticleEmitter(systemId, emitter = {}) {
    const sys = particleSystems.get(systemId);
    if (!sys) return;
    Object.assign(sys.emitter, emitter);
  }

  function _spawnParticle(sys, overrides = {}) {
    if (sys.freeList.length === 0) return; // pool full
    const idx = sys.freeList.pop();
    const base = idx * STRIDE;
    const { pool, emitter } = sys;

    const ex = overrides.x ?? emitter.x;
    const ey = overrides.y ?? emitter.y;
    const ez = overrides.z ?? emitter.z;

    // Random direction within spread cone (pointing up by default)
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * (overrides.spread ?? emitter.spread);
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const speed = emitter.minSpeed + Math.random() * (emitter.maxSpeed - emitter.minSpeed);
    const vx = overrides.vx ?? st * Math.cos(phi) * speed;
    const vy = overrides.vy ?? ct * speed;
    const vz = overrides.vz ?? st * Math.sin(phi) * speed;

    const life = emitter.minLife + Math.random() * (emitter.maxLife - emitter.minLife);
    const sz = emitter.minSize + Math.random() * (emitter.maxSize - emitter.minSize);

    // position
    pool[base + 0] = ex;
    pool[base + 1] = ey;
    pool[base + 2] = ez;
    // velocity
    pool[base + 3] = vx;
    pool[base + 4] = vy;
    pool[base + 5] = vz;
    // age, life
    pool[base + 6] = 0;
    pool[base + 7] = life > 0 ? life : 1;
    // color (start)
    const sc = sys.config.startColor;
    pool[base + 8] = overrides.r ?? sc.r;
    pool[base + 9] = overrides.g ?? sc.g;
    pool[base + 10] = overrides.b ?? sc.b;
    // size
    pool[base + 11] = sz;
    // active
    pool[base + 12] = 1;

    sys.activeCount++;
  }

  function emitParticle(systemId, overrides = {}) {
    const sys = particleSystems.get(systemId);
    if (sys) _spawnParticle(sys, overrides);
  }

  function burstParticles(systemId, count = 10, overrides = {}) {
    const sys = particleSystems.get(systemId);
    if (!sys) return;
    for (let i = 0; i < count; i++) _spawnParticle(sys, overrides);
  }

  function updateParticles(dt) {
    particleSystems.forEach(sys => {
      const { pool, maxParticles, mesh, config, emitter } = sys;

      // Auto-emit based on rate
      sys.emitAccum += emitter.emitRate * dt;
      while (sys.emitAccum >= 1 && sys.freeList.length > 0) {
        _spawnParticle(sys);
        sys.emitAccum -= 1;
      }

      let needsUpdate = false;

      for (let i = 0; i < maxParticles; i++) {
        const base = i * STRIDE;
        if (pool[base + 12] === 0) continue; // inactive

        // Step age
        pool[base + 6] += dt;
        const age = pool[base + 6];
        const life = pool[base + 7];

        if (age >= life) {
          // Kill particle
          pool[base + 12] = 0;
          sys.freeList.push(i);
          sys.activeCount--;

          // Scale to zero
          _dummy.position.set(0, -9999, 0);
          _dummy.scale.set(0, 0, 0);
          _dummy.updateMatrix();
          mesh.setMatrixAt(i, _dummy.matrix);
          needsUpdate = true;
          continue;
        }

        // Physics integration
        pool[base + 3] *= config.drag; // drag on vx
        pool[base + 5] *= config.drag; // drag on vz
        pool[base + 4] += config.gravity * dt; // gravity on vy

        // Turbulence noise — pseudo-3D curl noise approximation
        if (config.turbulence > 0) {
          const ts = config.turbulenceScale;
          const px = pool[base + 0] * ts;
          const py = pool[base + 1] * ts;
          const pz = pool[base + 2] * ts;
          // Simple noise: use sin of shifted coordinates for cheap turbulence
          const tx = Math.sin(py * 1.7 + pz * 2.3 + age * 3.0) * config.turbulence;
          const ty = Math.sin(pz * 1.3 + px * 2.1 + age * 2.5) * config.turbulence;
          const tz = Math.sin(px * 1.9 + py * 1.5 + age * 2.8) * config.turbulence;
          pool[base + 3] += tx * dt;
          pool[base + 4] += ty * dt;
          pool[base + 5] += tz * dt;
        }

        // Attractor force
        if (config.attractorStrength > 0 && config.attractorX !== null) {
          const dx = config.attractorX - pool[base + 0];
          const dy = config.attractorY - pool[base + 1];
          const dz = config.attractorZ - pool[base + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
          const force = config.attractorStrength / dist;
          pool[base + 3] += (dx / dist) * force * dt;
          pool[base + 4] += (dy / dist) * force * dt;
          pool[base + 5] += (dz / dist) * force * dt;
        }

        pool[base + 0] += pool[base + 3] * dt; // px
        pool[base + 1] += pool[base + 4] * dt; // py
        pool[base + 2] += pool[base + 5] * dt; // pz

        // Interpolate color start→end
        const t = age / life;
        const r = pool[base + 8] * (1 - t) + config.endColor.r * t;
        const g = pool[base + 9] * (1 - t) + config.endColor.g * t;
        const b = pool[base + 10] * (1 - t) + config.endColor.b * t;
        _color.setRGB(r, g, b);
        mesh.setColorAt(i, _color);

        // Shrink as particle ages — use sizeOverLife curve if provided
        let sizeMul;
        if (config.sizeOverLife) {
          const [s0, s1, s2] = config.sizeOverLife;
          sizeMul = t < 0.5 ? s0 + (s1 - s0) * (t * 2) : s1 + (s2 - s1) * ((t - 0.5) * 2);
        } else {
          sizeMul = 1 - t * 0.8;
        }
        const sz = pool[base + 11] * sizeMul;

        // Opacity over life — for transparent/additive particles
        if (config.opacityOverLife && mesh.material.transparent) {
          const [o0, o1, o2] = config.opacityOverLife;
          const opac = t < 0.5 ? o0 + (o1 - o0) * (t * 2) : o1 + (o2 - o1) * ((t - 0.5) * 2);
          mesh.material.opacity = opac;
        }

        // Rotation
        const rot = config.rotationSpeed > 0 ? age * config.rotationSpeed : 0;

        _dummy.position.set(pool[base + 0], pool[base + 1], pool[base + 2]);
        _dummy.scale.set(sz, sz, sz);
        if (rot) {
          _dummy.rotation.set(rot * 0.7, rot, rot * 0.3);
        }
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
        needsUpdate = true;
      }

      if (needsUpdate) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    });
  }

  function removeParticleSystem(systemId) {
    const sys = particleSystems.get(systemId);
    if (!sys) return false;
    scene.remove(sys.mesh);
    sys.mesh.geometry?.dispose();
    sys.mesh.material?.dispose();
    particleSystems.delete(systemId);
    return true;
  }

  function getParticleStats(systemId) {
    const sys = particleSystems.get(systemId);
    if (!sys) return null;
    return {
      active: sys.activeCount,
      max: sys.maxParticles,
      free: sys.freeList.length,
    };
  }

  return {
    createParticleSystem,
    setParticleEmitter,
    emitParticle,
    burstParticles,
    updateParticles,
    removeParticleSystem,
    getParticleStats,
  };
}
