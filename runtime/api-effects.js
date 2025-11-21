// runtime/api-effects.js
// Advanced effects, shading, and post-processing API for Nova64
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

export function effectsApi(gpu) {
  if (!gpu.getScene || !gpu.getCamera || !gpu.getRenderer) {
    return { exposeTo: () => {} };
  }

  const scene = gpu.getScene();
  const camera = gpu.getCamera();
  const renderer = gpu.getRenderer();

  // Post-processing composer
  let composer = null;
  let renderPass = null;
  let bloomPass = null;
  let fxaaPass = null;

  // Effect states
  let effectsEnabled = false;

  // Custom shader materials
  const customShaders = new Map();

  // Initialize post-processing
  function initPostProcessing() {
    if (composer) return; // Already initialized

    composer = new EffectComposer(renderer);
    
    // Base render pass
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    effectsEnabled = true;
  }

  // === BLOOM EFFECTS ===
  function enableBloom(strength = 1.0, radius = 0.5, threshold = 0.85) {
    initPostProcessing();

    if (bloomPass) {
      composer.removePass(bloomPass);
    }

    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      strength,
      radius,
      threshold
    );

    composer.addPass(bloomPass);

    return true;
  }

  function disableBloom() {
    if (bloomPass && composer) {
      composer.removePass(bloomPass);
      bloomPass = null;
    }
  }

  function setBloomStrength(strength) {
    if (bloomPass) {
      bloomPass.strength = strength;
    }
  }

  function setBloomRadius(radius) {
    if (bloomPass) {
      bloomPass.radius = radius;
    }
  }

  function setBloomThreshold(threshold) {
    if (bloomPass) {
      bloomPass.threshold = threshold;
    }
  }

  // === ANTI-ALIASING ===
  function enableFXAA() {
    initPostProcessing();

    if (fxaaPass) return;

    fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);

    composer.addPass(fxaaPass);
  }

  function disableFXAA() {
    if (fxaaPass && composer) {
      composer.removePass(fxaaPass);
      fxaaPass = null;
    }
  }

  // === CUSTOM SHADERS ===
  
  // Holographic shader
  const holographicShader = {
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(0x00ffff) },
      scanlineSpeed: { value: 2.0 },
      glitchAmount: { value: 0.1 },
      opacity: { value: 0.8 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      uniform float scanlineSpeed;
      uniform float glitchAmount;
      uniform float opacity;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        // Scanlines
        float scanline = sin(vUv.y * 100.0 + time * scanlineSpeed) * 0.5 + 0.5;
        
        // Glitch effect
        float glitch = step(0.95, sin(time * 10.0 + vUv.y * 50.0)) * glitchAmount;
        
        // Edge glow
        float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
        edge = pow(edge, 3.0);
        
        // Combine effects
        vec3 finalColor = color * (scanline * 0.5 + 0.5) + vec3(edge * 0.3);
        finalColor += vec3(glitch);
        
        gl_FragColor = vec4(finalColor, opacity);
      }
    `
  };

  // Energy shield shader
  const shieldShader = {
    uniforms: {
      time: { value: 0 },
      hitPosition: { value: new THREE.Vector3(0, 0, 0) },
      hitStrength: { value: 0 },
      color: { value: new THREE.Color(0x00ffff) },
      opacity: { value: 0.6 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 hitPosition;
      uniform float hitStrength;
      uniform vec3 color;
      uniform float opacity;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        // Fresnel effect
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
        
        // Hexagon pattern
        vec2 hexUv = vUv * 20.0;
        float hexPattern = abs(sin(hexUv.x * 3.14159) * sin(hexUv.y * 3.14159));
        hexPattern = step(0.5, hexPattern);
        
        // Hit ripple
        float distToHit = length(vPosition - hitPosition);
        float ripple = sin(distToHit * 5.0 - time * 10.0) * 0.5 + 0.5;
        ripple *= smoothstep(2.0, 0.0, distToHit) * hitStrength;
        
        // Pulsing energy
        float pulse = sin(time * 2.0) * 0.2 + 0.8;
        
        // Combine effects
        vec3 finalColor = color * (fresnel + hexPattern * 0.3 + ripple) * pulse;
        float finalOpacity = opacity * (fresnel * 0.5 + 0.5 + ripple);
        
        gl_FragColor = vec4(finalColor, finalOpacity);
      }
    `
  };

  // Water/liquid shader
  const waterShader = {
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(0x0088ff) },
      waveSpeed: { value: 1.0 },
      waveHeight: { value: 0.5 },
      transparency: { value: 0.7 }
    },
    vertexShader: `
      uniform float time;
      uniform float waveSpeed;
      uniform float waveHeight;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vElevation;
      
      void main() {
        vUv = uv;
        vNormal = normal;
        
        // Wave displacement
        vec3 pos = position;
        float wave1 = sin(pos.x * 2.0 + time * waveSpeed) * waveHeight;
        float wave2 = sin(pos.z * 3.0 + time * waveSpeed * 1.5) * waveHeight * 0.5;
        pos.y += wave1 + wave2;
        vElevation = wave1 + wave2;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      uniform float transparency;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vElevation;
      
      void main() {
        // Foam on wave peaks
        float foam = smoothstep(0.3, 0.5, vElevation);
        
        // Caustics pattern
        vec2 causticsUv = vUv * 10.0 + time * 0.1;
        float caustics = abs(sin(causticsUv.x * 3.14159) * sin(causticsUv.y * 3.14159));
        
        // Depth fade
        float depth = vUv.y;
        vec3 deepColor = color * 0.5;
        vec3 shallowColor = color * 1.5;
        vec3 finalColor = mix(deepColor, shallowColor, depth);
        
        // Add foam and caustics
        finalColor += vec3(foam * 0.5);
        finalColor += vec3(caustics * 0.2);
        
        gl_FragColor = vec4(finalColor, transparency);
      }
    `
  };

  // Fire/plasma shader
  const fireShader = {
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0xff4400) },
      color2: { value: new THREE.Color(0xffff00) },
      intensity: { value: 1.0 },
      speed: { value: 2.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform float intensity;
      uniform float speed;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      // Noise function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }
      
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      
      void main() {
        vec2 uv = vUv;
        
        // Multiple layers of noise for fire effect
        float n1 = noise(uv * 5.0 + time * speed);
        float n2 = noise(uv * 10.0 + time * speed * 1.5);
        float n3 = noise(uv * 20.0 + time * speed * 2.0);
        
        // Combine noise layers
        float firePattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
        
        // Vertical gradient (fire rises)
        float gradient = 1.0 - uv.y;
        firePattern *= gradient;
        
        // Color mixing
        vec3 fireColor = mix(color1, color2, firePattern);
        
        // Intensity and flickering
        float flicker = sin(time * 10.0) * 0.1 + 0.9;
        fireColor *= intensity * flicker;
        
        // Alpha based on pattern
        float alpha = firePattern * intensity;
        
        gl_FragColor = vec4(fireColor, alpha);
      }
    `
  };

  // Create material with custom shader
  function createShaderMaterial(shaderName, customUniforms = {}) {
    let shader;
    
    switch(shaderName) {
      case 'holographic':
        shader = holographicShader;
        break;
      case 'shield':
        shader = shieldShader;
        break;
      case 'water':
        shader = waterShader;
        break;
      case 'fire':
        shader = fireShader;
        break;
      default:
        console.warn(`Unknown shader: ${shaderName}`);
        return null;
    }

    // Merge custom uniforms with shader uniforms
    const uniforms = { ...shader.uniforms };
    for (const key in customUniforms) {
      if (uniforms[key]) {
        uniforms[key].value = customUniforms[key];
      }
    }

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });

    const id = `shader_${Date.now()}_${Math.random()}`;
    customShaders.set(id, material);

    return { id, material };
  }

  // Update shader uniforms
  function updateShaderUniform(shaderId, uniformName, value) {
    const material = customShaders.get(shaderId);
    if (material && material.uniforms[uniformName]) {
      material.uniforms[uniformName].value = value;
      return true;
    }
    return false;
  }

  // Update all shader time uniforms
  function updateShaderTime(deltaTime) {
    customShaders.forEach(material => {
      if (material.uniforms.time) {
        material.uniforms.time.value += deltaTime;
      }
    });
  }

  // === PARTICLE EFFECTS ===
  function createParticleSystem(count, options = {}) {
    const {
      color = 0xffffff,
      size = 0.1,
      speed = 1.0,
      lifetime = 2.0,
      spread = 1.0,
      gravity = -1.0
    } = options;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Random positions in spread area
      positions[i3] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = (Math.random() - 0.5) * spread;
      positions[i3 + 2] = (Math.random() - 0.5) * spread;

      // Random velocities
      velocities[i3] = (Math.random() - 0.5) * speed;
      velocities[i3 + 1] = Math.random() * speed;
      velocities[i3 + 2] = (Math.random() - 0.5) * speed;

      // Random lifetimes
      lifetimes[i] = Math.random() * lifetime;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const material = new THREE.PointsMaterial({
      color: color,
      size: size,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.velocities = velocities;
    particles.userData.lifetimes = lifetimes;
    particles.userData.maxLifetime = lifetime;
    particles.userData.gravity = gravity;
    particles.userData.speed = speed;
    particles.userData.spread = spread;

    scene.add(particles);

    return particles;
  }

  // Update particle system
  function updateParticles(particleSystem, deltaTime) {
    if (!particleSystem || !particleSystem.geometry) return;

    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.userData.velocities;
    const lifetimes = particleSystem.userData.lifetimes;
    const maxLifetime = particleSystem.userData.maxLifetime;
    const gravity = particleSystem.userData.gravity;
    const speed = particleSystem.userData.speed;
    const spread = particleSystem.userData.spread;

    for (let i = 0; i < positions.length; i += 3) {
      const idx = i / 3;
      
      // Update lifetime
      lifetimes[idx] -= deltaTime;

      if (lifetimes[idx] <= 0) {
        // Reset particle
        positions[i] = (Math.random() - 0.5) * spread;
        positions[i + 1] = 0;
        positions[i + 2] = (Math.random() - 0.5) * spread;

        velocities[i] = (Math.random() - 0.5) * speed;
        velocities[i + 1] = Math.random() * speed;
        velocities[i + 2] = (Math.random() - 0.5) * speed;

        lifetimes[idx] = maxLifetime;
      } else {
        // Update position
        positions[i] += velocities[i] * deltaTime;
        positions[i + 1] += velocities[i + 1] * deltaTime;
        positions[i + 2] += velocities[i + 2] * deltaTime;

        // Apply gravity
        velocities[i + 1] += gravity * deltaTime;
      }
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  // === RENDERING ===
  function renderEffects() {
    if (effectsEnabled && composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  // Update effects (called every frame)
  function updateEffects(deltaTime) {
    updateShaderTime(deltaTime);
  }

  // === EXPOSE API ===
  return {
    exposeTo(target) {
      Object.assign(target, {
        // Post-processing
        enableBloom: enableBloom,
        disableBloom: disableBloom,
        setBloomStrength: setBloomStrength,
        setBloomRadius: setBloomRadius,
        setBloomThreshold: setBloomThreshold,
        enableFXAA: enableFXAA,
        disableFXAA: disableFXAA,

        // Custom shaders
        createShaderMaterial: createShaderMaterial,
        updateShaderUniform: updateShaderUniform,

        // Particles
        createParticleSystem: createParticleSystem,
        updateParticles: updateParticles,

        // Rendering
        renderEffects: renderEffects,
        updateEffects: updateEffects,

        // Utility
        isEffectsEnabled: () => effectsEnabled
      });
    },

    // Internal update called by main loop
    update(deltaTime) {
      updateEffects(deltaTime);
    },

    // Internal render called by main loop
    render() {
      renderEffects();
    }
  };
}
