// runtime/backends/babylon/particles.js
// GPU particle system for Babylon.js backend using SolidParticleSystem.
// API-compatible with Three.js particles module.

import {
  Color3,
  Color4,
  MeshBuilder,
  SolidParticleSystem,
  StandardMaterial,
} from '@babylonjs/core';

import { hexToColor3 } from './common.js';
import { applyBabylonMaterialCompatibility, applyBabylonMeshCompatibility } from './compat.js';

const STRIDE = 13; // slots per particle:
// px py pz vx vy vz age life r g b size active

export function createBabylonParticlesApi(self) {
  const particleSystems = new Map();
  let psCounter = 0;

  function createParticleSystem(maxParticlesOrOptions = 200, options = {}) {
    // Normalize arguments (support both signatures)
    let maxParticles, particleOptions;
    if (
      maxParticlesOrOptions &&
      typeof maxParticlesOrOptions === 'object' &&
      !Array.isArray(maxParticlesOrOptions)
    ) {
      maxParticles = Number.isFinite(maxParticlesOrOptions.maxParticles)
        ? maxParticlesOrOptions.maxParticles
        : 200;
      particleOptions = maxParticlesOrOptions;
    } else {
      maxParticles = Number.isFinite(maxParticlesOrOptions) ? maxParticlesOrOptions : 200;
      particleOptions = options;
    }

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
      blending = 'normal',
      // Emitter defaults
      emitterX = 0,
      emitterY = 0,
      emitterZ = 0,
      emitRate = 20,
      minLife = 0.8,
      maxLife = 2.0,
      minSpeed = 2,
      maxSpeed = 8,
      spread = Math.PI,
      minSize = 0.05,
      maxSize = 0.3,
      // Advanced features
      turbulence = 0,
      turbulenceScale = 1.0,
      attractorX = null,
      attractorY = null,
      attractorZ = null,
      attractorStrength = 0,
      sizeOverLife = null,
      opacity = 1.0,
      opacityOverLife = null,
      rotationSpeed = 0,
    } = particleOptions;

    const id = ++psCounter;

    // Create SolidParticleSystem
    const sps = new SolidParticleSystem(`sps_${id}`, self.scene, {
      updatable: true,
      isPickable: false,
      enableDepthSort: false,
      particleIntersection: false,
      boundingSphereOnly: false,
      bSphereRadiusFactor: 1.0,
    });

    // Create shape mesh (temporary, will be disposed after building SPS)
    let shapeMesh;
    if (shape === 'cube') {
      shapeMesh = MeshBuilder.CreateBox(`particle_shape_${id}`, { size: size }, self.scene);
    } else {
      shapeMesh = MeshBuilder.CreateSphere(
        `particle_shape_${id}`,
        { diameter: size, segments: segments },
        self.scene
      );
    }

    // Add particles to SPS
    sps.addShape(shapeMesh, maxParticles);
    shapeMesh.dispose(); // No longer needed

    // Build the SPS mesh
    const spsMesh = sps.buildMesh();
    spsMesh.hasVertexAlpha = true;

    // Create material - use emissive-based rendering for bright particle glow
    const mat = new StandardMaterial(`particle_mat_${id}`, self.scene);
    const sc = hexToColor3(startColor);
    const ec = hexToColor3(emissive);

    // For particles, we want bright emissive glow like Three.js MeshStandardMaterial
    mat.disableLighting = true;

    // Use emissive color for the particle color (self-lit appearance)
    const intensity = Math.min(emissiveIntensity, 4.0);
    mat.emissiveColor = ec.scale(intensity);
    mat.diffuseColor = sc;
    mat.specularColor = new Color3(0, 0, 0);

    // Enable vertex colors for per-particle coloring
    mat.useVertexColors = true;
    mat.alpha = opacity;

    if (blending === 'additive') {
      mat.alphaMode = 2; // ALPHA_ADD
      mat.disableDepthWrite = true;
    } else {
      mat.alphaMode = 1; // ALPHA_COMBINE
    }

    spsMesh.material = mat;
    applyBabylonMaterialCompatibility(mat);
    applyBabylonMeshCompatibility(spsMesh);

    // Particle state pool
    const pool = new Float32Array(maxParticles * STRIDE);

    const startColorObj = hexToColor3(startColor);
    const endColorObj = hexToColor3(endColor);

    // Initialize all particles as inactive
    sps.initParticles = function () {
      for (let i = 0; i < sps.nbParticles; i++) {
        const p = sps.particles[i];
        p.isVisible = false;
        p.position.set(0, -9999, 0);
        p.scaling.set(0, 0, 0);
        p.color = new Color4(1, 1, 1, 1);
      }
    };

    // Update function called by setParticles()
    sps.updateParticle = function (particle) {
      const sys = particleSystems.get(id);
      if (!sys) return particle;

      const idx = particle.idx;
      const base = idx * STRIDE;
      const poolData = sys.pool;

      // Check if active
      if (poolData[base + 12] === 0) {
        particle.isVisible = false;
        particle.position.set(0, -9999, 0);
        particle.scaling.set(0, 0, 0);
        return particle;
      }

      particle.isVisible = true;

      // Read position from pool
      particle.position.x = poolData[base + 0];
      particle.position.y = poolData[base + 1];
      particle.position.z = poolData[base + 2];

      // Read size and apply
      const age = poolData[base + 6];
      const life = poolData[base + 7];
      const t = life > 0 ? age / life : 1;

      // Size over life
      let sizeMul;
      if (sys.config.sizeOverLife) {
        const [s0, s1, s2] = sys.config.sizeOverLife;
        sizeMul = t < 0.5 ? s0 + (s1 - s0) * (t * 2) : s1 + (s2 - s1) * ((t - 0.5) * 2);
      } else {
        sizeMul = 1 - t * 0.8;
      }
      const sz = poolData[base + 11] * sizeMul;
      particle.scaling.set(sz, sz, sz);

      // Color interpolation
      const r = poolData[base + 8] * (1 - t) + sys.config.endColor.r * t;
      const g = poolData[base + 9] * (1 - t) + sys.config.endColor.g * t;
      const b = poolData[base + 10] * (1 - t) + sys.config.endColor.b * t;

      // Opacity over life
      let alpha;
      if (sys.config.opacityOverLife) {
        const [o0, o1, o2] = sys.config.opacityOverLife;
        alpha = t < 0.5 ? o0 + (o1 - o0) * (t * 2) : o1 + (o2 - o1) * ((t - 0.5) * 2);
      } else {
        alpha = sys.config.opacity * (1 - t * 0.5); // Fade out slightly
      }

      particle.color.r = r;
      particle.color.g = g;
      particle.color.b = b;
      particle.color.a = alpha;

      // Rotation
      if (sys.config.rotationSpeed > 0) {
        const rot = age * sys.config.rotationSpeed;
        particle.rotation.x = rot * 0.7;
        particle.rotation.y = rot;
        particle.rotation.z = rot * 0.3;
      }

      return particle;
    };

    // Initialize particles
    sps.initParticles();
    sps.setParticles();

    particleSystems.set(id, {
      sps,
      mesh: spsMesh,
      material: mat,
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
        startColor: startColorObj,
        endColor: endColorObj,
        turbulence,
        turbulenceScale,
        attractorX,
        attractorY,
        attractorZ,
        attractorStrength,
        sizeOverLife,
        opacityOverLife,
        rotationSpeed,
        opacity,
      },
    });

    return id;
  }

  function setParticleEmitter(systemId, emitter = {}) {
    const sys = particleSystems.get(systemId);
    if (!sys) return false;
    Object.assign(sys.emitter, emitter);
    return true;
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
    if (!sys) return false;
    _spawnParticle(sys, overrides);
    return true;
  }

  function burstParticles(systemId, count = 10, overrides = {}) {
    const sys = particleSystems.get(systemId);
    if (!sys) return 0;
    let emitted = 0;
    for (let i = 0; i < count && sys.freeList.length > 0; i++) {
      _spawnParticle(sys, overrides);
      emitted++;
    }
    return emitted;
  }

  function updateParticles(dt) {
    let totalActive = 0;

    particleSystems.forEach(sys => {
      const { pool, maxParticles, sps, config, emitter } = sys;

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

        needsUpdate = true;
      }

      if (needsUpdate) {
        // Update SPS - this will call updateParticle for each particle
        sps.setParticles();
      }

      totalActive += sys.activeCount;
    });

    return totalActive;
  }

  function removeParticleSystem(systemId) {
    const sys = particleSystems.get(systemId);
    if (!sys) return false;
    sys.sps.dispose();
    sys.material.dispose();
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
