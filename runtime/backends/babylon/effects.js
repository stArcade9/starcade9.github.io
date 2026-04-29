// runtime/backends/babylon/effects.js
// Post-processing effects for Babylon.js backend - parity with Three.js api-effects.js

import {
  Color3,
  Color4,
  Constants,
  DefaultRenderingPipeline,
  Effect,
  PostProcess,
  ShaderMaterial,
} from '@babylonjs/core';

import { applyBabylonMaterialCompatibility } from './compat.js';

// Register custom shaders for Babylon.js post-processing

// Chromatic Aberration shader
Effect.ShadersStore['chromaticAberrationFragmentShader'] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float amount;

  void main(void) {
    vec2 dir = vUV - 0.5;
    float dist = length(dir);
    vec2 offset = normalize(dir) * dist * amount;
    float r = texture2D(textureSampler, vUV + offset).r;
    float g = texture2D(textureSampler, vUV).g;
    float b = texture2D(textureSampler, vUV - offset).b;
    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

// Advanced Glitch shader - inspired by seacloud9's implementation
// Supports displacement texture, chromatic aberration, scanlines, and snow noise
Effect.ShadersStore['glitchFragmentShader'] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float intensity;
  uniform float time;
  uniform float seed;
  uniform float distortion_x;
  uniform float distortion_y;
  uniform float col_s;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main(void) {
    vec2 p = vUV;
    float xs = floor(gl_FragCoord.x / 0.5);
    float ys = floor(gl_FragCoord.y / 0.5);

    // Generate pseudo-displacement from noise
    float seed_scaled = seed * 0.01;
    float disp_x = rand(p * seed_scaled) * 2.0 - 1.0;
    float disp_y = rand(p * seed_scaled + vec2(1.0, 1.0)) * 2.0 - 1.0;

    // Horizontal band distortion
    float band_width = col_s * intensity;
    if (p.y < distortion_x + band_width && p.y > distortion_x - band_width * seed_scaled) {
      if (rand(vec2(time, distortion_x)) > 0.5) {
        p.y = 1.0 - (p.y + distortion_y * intensity * 0.1);
      } else {
        p.y = distortion_y;
      }
    }

    // Vertical band distortion
    if (p.x < distortion_y + band_width && p.x > distortion_y - band_width * seed_scaled) {
      if (rand(vec2(time + 1.0, distortion_y)) > 0.5) {
        p.x = distortion_x;
      } else {
        p.x = 1.0 - (p.x + distortion_x * intensity * 0.1);
      }
    }

    // Apply displacement noise
    p.x += disp_x * intensity * 0.02 * (seed_scaled / 5.0);
    p.y += disp_y * intensity * 0.02 * (seed_scaled / 5.0);

    // Scanline displacement (horizontal jitter)
    float scanJitter = step(0.99 - intensity * 0.3, rand(vec2(time * 1.3, floor(p.y * 40.0))))
                      * (rand(vec2(time, floor(p.y * 40.0))) - 0.5) * intensity * 0.15;
    p.x += scanJitter;

    // Block glitch (larger rectangular artifacts)
    float blockY = floor(p.y * 8.0);
    float blockShift = step(0.97 - intensity * 0.15, rand(vec2(blockY, time * 0.7)))
                      * (rand(vec2(blockY + 1.0, time)) - 0.5) * intensity * 0.1;
    p.x += blockShift;

    // Chromatic aberration / RGB channel split
    float angle = time * 0.5;
    vec2 offset = intensity * 0.015 * vec2(cos(angle), sin(angle));
    float r = texture2D(textureSampler, p + offset).r;
    float g = texture2D(textureSampler, p).g;
    float b = texture2D(textureSampler, p - offset).b;
    float a = texture2D(textureSampler, p).a;

    vec4 color = vec4(r, g, b, a);

    // Snow/grain noise overlay
    float snow = 200.0 * intensity * 0.1 * rand(vec2(xs * seed_scaled, ys * seed_scaled * 50.0)) * 0.2;
    color.rgb += vec3(snow);

    // Color corruption (random bright pixels)
    float corruption = step(0.995 - intensity * 0.05, rand(p + time)) * intensity;
    color.r += corruption;
    color.b += corruption * 0.5;

    gl_FragColor = color;
  }
`;

// Vignette shader (custom, more control than pipeline)
Effect.ShadersStore['vignetteCustomFragmentShader'] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float darkness;
  uniform float offset;

  void main(void) {
    vec4 texel = texture2D(textureSampler, vUV);
    vec2 uv = (vUV - vec2(0.5)) * vec2(offset);
    float vignette = 1.0 - dot(uv, uv) * darkness;
    gl_FragColor = vec4(texel.rgb * clamp(vignette, 0.0, 1.0), texel.a);
  }
`;

export function createBabylonEffectsApi(self) {
  let pipeline = null;
  let chromaticAberrationPost = null;
  let glitchPost = null;
  let vignettePost = null;
  let glitchTime = 0;
  let effectsEnabled = false;

  function trySetPipelineValue(key, value) {
    if (!pipeline || !(key in pipeline)) return false;
    try {
      pipeline[key] = value;
      return true;
    } catch {
      return false;
    }
  }

  // Initialize the default rendering pipeline
  function initPipeline() {
    if (pipeline) return pipeline;

    pipeline = new DefaultRenderingPipeline(
      'nova64_effects_pipeline',
      false, // HDR disabled - prevents color/brightness issues
      self.scene,
      [self.camera]
    );

    // Disable all effects by default
    trySetPipelineValue('bloomEnabled', false);
    trySetPipelineValue('fxaaEnabled', false);
    trySetPipelineValue('chromaticAberrationEnabled', false);
    trySetPipelineValue('vignetteEnabled', false);
    trySetPipelineValue('sharpenEnabled', false);
    trySetPipelineValue('grainEnabled', false);

    // Enable image processing for proper color output
    pipeline.imageProcessingEnabled = true;
    if (pipeline.imageProcessing) {
      pipeline.imageProcessing.toneMappingEnabled = false;
      pipeline.imageProcessing.exposure = 1.0;
      pipeline.imageProcessing.contrast = 1.0;
    }

    effectsEnabled = true;
    return pipeline;
  }

  // === BLOOM ===
  function enableBloom(strength = 1.0, radius = 0.5, threshold = 0.6) {
    const p = initPipeline();
    const needsLargeGlow = strength >= 1.0;
    p.bloomEnabled = true;
    p.bloomWeight = needsLargeGlow ? strength * 2.2 : strength;
    p.bloomKernel = Math.max(16, Math.round(radius * (needsLargeGlow ? 256 : 128)));
    p.bloomThreshold = needsLargeGlow ? Math.max(0, threshold * 0.75) : threshold;
    p.bloomScale = needsLargeGlow ? 0.35 : 0.5;
    return true;
  }

  function disableBloom() {
    if (pipeline) {
      pipeline.bloomEnabled = false;
    }
  }

  function setBloomStrength(strength) {
    if (pipeline) {
      pipeline.bloomWeight = strength;
    }
  }

  function setBloomRadius(radius) {
    if (pipeline) {
      pipeline.bloomKernel = Math.round(radius * 128);
    }
  }

  function setBloomThreshold(threshold) {
    if (pipeline) {
      pipeline.bloomThreshold = threshold;
    }
  }

  // === FXAA ===
  function enableFXAA() {
    const p = initPipeline();
    p.fxaaEnabled = true;
    return true;
  }

  function disableFXAA() {
    if (pipeline) {
      pipeline.fxaaEnabled = false;
    }
  }

  // === CHROMATIC ABERRATION ===
  function enableChromaticAberration(amount = 0.002) {
    initPipeline();

    // Use pipeline's built-in chromatic aberration if available
    // Note: DefaultRenderingPipeline properties are directly on pipeline, not nested
    if (pipeline.chromaticAberrationEnabled !== undefined) {
      pipeline.chromaticAberrationEnabled = true;
      // Properties are directly on pipeline in Babylon.js DefaultRenderingPipeline
      if (pipeline.chromaticAberration) {
        pipeline.chromaticAberration.aberrationAmount = amount * 500;
        pipeline.chromaticAberration.radialIntensity = 1.0;
      }
      return true;
    }

    // Fallback to custom post-process
    if (chromaticAberrationPost) {
      chromaticAberrationPost.dispose();
    }

    chromaticAberrationPost = new PostProcess(
      'chromaticAberration',
      'chromaticAberration',
      ['amount'],
      null,
      1.0,
      self.camera
    );
    chromaticAberrationPost.onApply = effect => {
      effect.setFloat('amount', amount);
    };

    return true;
  }

  function disableChromaticAberration() {
    if (pipeline && pipeline.chromaticAberrationEnabled !== undefined) {
      pipeline.chromaticAberrationEnabled = false;
    }
    if (chromaticAberrationPost) {
      chromaticAberrationPost.dispose();
      chromaticAberrationPost = null;
    }
  }

  // === VIGNETTE ===
  function enableVignette(darkness = 1.0, offset = 0.9) {
    initPipeline();

    // Prefer Babylon's built-in vignette only when its image-processing config
    // exists; some headless/WebGL paths expose the setters before that config is ready.
    const imageProcessingConfig =
      pipeline?.imageProcessingConfiguration ??
      pipeline?.imageProcessing?.imageProcessingConfiguration ??
      null;
    if (imageProcessingConfig && trySetPipelineValue('vignetteEnabled', true)) {
      imageProcessingConfig.vignetteWeight = darkness;
      imageProcessingConfig.vignetteStretch = offset * 2;
      imageProcessingConfig.vignetteColor = new Color4(0, 0, 0, 1);
      imageProcessingConfig.vignetteCameraFov = self.camera?.fov ?? 0.8;
      return true;
    }

    // Fallback to custom post-process
    if (vignettePost) {
      vignettePost.dispose();
    }

    vignettePost = new PostProcess(
      'vignetteCustom',
      'vignetteCustom',
      ['darkness', 'offset'],
      null,
      1.0,
      self.camera
    );
    vignettePost.onApply = effect => {
      effect.setFloat('darkness', darkness);
      effect.setFloat('offset', offset);
    };

    return true;
  }

  function disableVignette() {
    trySetPipelineValue('vignetteEnabled', false);
    if (vignettePost) {
      vignettePost.dispose();
      vignettePost = null;
    }
  }

  // === GLITCH ===
  let glitchIntensity = 0.5;
  let glitchSeed = Math.random() * 100;
  let glitchDistortionX = 0.5;
  let glitchDistortionY = 0.5;
  let glitchColS = 0.05;

  function enableGlitch(intensity = 0.5, options = {}) {
    initPipeline();
    glitchIntensity = Math.max(0, Math.min(1, intensity));

    // Optional configuration
    if (options.seed !== undefined) glitchSeed = options.seed;
    if (options.distortionX !== undefined) glitchDistortionX = options.distortionX;
    if (options.distortionY !== undefined) glitchDistortionY = options.distortionY;
    if (options.bandWidth !== undefined) glitchColS = options.bandWidth;

    if (glitchPost) {
      return true;
    }

    // Create glitch post-process with all uniforms
    glitchPost = new PostProcess(
      'glitch',
      'glitch',
      ['intensity', 'time', 'seed', 'distortion_x', 'distortion_y', 'col_s'],
      null,
      1.0,
      self.camera
    );

    glitchPost.onApply = effect => {
      effect.setFloat('intensity', glitchIntensity);
      effect.setFloat('time', glitchTime);
      // Randomize seed and distortion for dynamic effect
      effect.setFloat('seed', glitchSeed + Math.random() * 10);
      effect.setFloat('distortion_x', glitchDistortionX + (Math.random() - 0.5) * 0.1);
      effect.setFloat('distortion_y', glitchDistortionY + (Math.random() - 0.5) * 0.1);
      effect.setFloat('col_s', glitchColS);
    };

    return true;
  }

  function disableGlitch() {
    if (glitchPost) {
      glitchPost.dispose();
      glitchPost = null;
    }
  }

  function setGlitchIntensity(intensity) {
    glitchIntensity = Math.max(0, Math.min(1, intensity));
  }

  function setGlitchOptions(options = {}) {
    if (options.seed !== undefined) glitchSeed = options.seed;
    if (options.distortionX !== undefined) glitchDistortionX = options.distortionX;
    if (options.distortionY !== undefined) glitchDistortionY = options.distortionY;
    if (options.bandWidth !== undefined) glitchColS = options.bandWidth;
  }

  // === RETRO EFFECTS CONVENIENCE ===
  function enableRetroEffects(opts = {}) {
    // Pixelation
    const pixelFactor = opts.pixelation !== undefined ? opts.pixelation : 1;
    if (pixelFactor !== false && typeof self.enablePixelation === 'function') {
      self.enablePixelation(pixelFactor);
    }

    // Dithering
    const dither = opts.dithering !== undefined ? opts.dithering : true;
    if (dither !== false && typeof self.enableDithering === 'function') {
      self.enableDithering(dither);
    }

    // Bloom
    const bloom = opts.bloom !== undefined ? opts.bloom : {};
    if (bloom !== false) {
      const b = typeof bloom === 'object' ? bloom : {};
      enableBloom(b.strength ?? 1.0, b.radius ?? 0.4, b.threshold ?? 0.6);
    }

    // FXAA
    const fxaa = opts.fxaa !== undefined ? opts.fxaa : true;
    if (fxaa !== false) {
      enableFXAA();
    }

    // Vignette
    const vig = opts.vignette !== undefined ? opts.vignette : {};
    if (vig !== false) {
      const v = typeof vig === 'object' ? vig : {};
      enableVignette(v.darkness ?? 1.3, v.offset ?? 0.9);
    }

    // Chromatic aberration
    const chrom = opts.chromatic !== undefined ? opts.chromatic : false;
    if (chrom !== false) {
      enableChromaticAberration(typeof chrom === 'number' ? chrom : 0.002);
    }

    return true;
  }

  function disableRetroEffects() {
    disableBloom();
    disableFXAA();
    disableVignette();
    disableChromaticAberration();
    disableGlitch();
    if (typeof self.enablePixelation === 'function') self.enablePixelation(0);
    if (typeof self.enableDithering === 'function') self.enableDithering(false);
  }

  // === SHARPEN ===
  function enableSharpen(amount = 0.3) {
    const p = initPipeline();
    p.sharpenEnabled = true;
    p.sharpen.edgeAmount = amount;
    return true;
  }

  function disableSharpen() {
    if (pipeline) {
      pipeline.sharpenEnabled = false;
    }
  }

  // === GRAIN ===
  function enableGrain(intensity = 0.05, animated = true) {
    const p = initPipeline();
    p.grainEnabled = true;
    p.grain.intensity = intensity;
    p.grain.animated = animated;
    return true;
  }

  function disableGrain() {
    if (pipeline) {
      pipeline.grainEnabled = false;
    }
  }

  // === UPDATE (called each frame) ===
  function updateEffects(deltaTime) {
    glitchTime += deltaTime;
    updateShaderTime(deltaTime);
  }

  // === CLEANUP ===
  function disposeEffects() {
    if (chromaticAberrationPost) {
      chromaticAberrationPost.dispose();
      chromaticAberrationPost = null;
    }
    if (glitchPost) {
      glitchPost.dispose();
      glitchPost = null;
    }
    if (vignettePost) {
      vignettePost.dispose();
      vignettePost = null;
    }
    if (pipeline) {
      pipeline.dispose();
      pipeline = null;
    }
    effectsEnabled = false;
  }

  // === CUSTOM SHADER MATERIALS ===
  // Babylon.js equivalents of the Three.js shader materials from api-effects.js
  const customShaders = new Map();

  // Register Babylon vertex/fragment shaders in the ShadersStore
  // Holographic shader
  Effect.ShadersStore['holographicVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    varying vec3 vPosition;
    void main() {
      vUV = uv;
      vPosition = position;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;
  Effect.ShadersStore['holographicFragmentShader'] = `
    precision highp float;
    uniform float time;
    uniform vec3 color;
    uniform float scanlineSpeed;
    uniform float glitchAmount;
    uniform float opacity;
    varying vec2 vUV;
    varying vec3 vPosition;
    void main() {
      float scanline = sin(vUV.y * 100.0 + time * scanlineSpeed) * 0.5 + 0.5;
      float glitch = step(0.95, sin(time * 10.0 + vUV.y * 50.0)) * glitchAmount;
      float edge = 1.0 - abs(vUV.x - 0.5) * 2.0;
      edge = pow(edge, 3.0);
      vec3 finalColor = color * (scanline * 0.5 + 0.5) + vec3(edge * 0.3);
      finalColor += vec3(glitch);
      gl_FragColor = vec4(finalColor, opacity);
    }
  `;

  // Water shader
  Effect.ShadersStore['waterMaterialVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    uniform float time;
    uniform float waveSpeed;
    uniform float waveHeight;
    varying vec2 vUV;
    varying float vElevation;
    void main() {
      vUV = uv;
      vec3 pos = position;
      float wave1 = sin(pos.x * 2.0 + time * waveSpeed) * waveHeight;
      float wave2 = sin(pos.z * 3.0 + time * waveSpeed * 1.5) * waveHeight * 0.5;
      pos.y += wave1 + wave2;
      vElevation = wave1 + wave2;
      gl_Position = worldViewProjection * vec4(pos, 1.0);
    }
  `;
  Effect.ShadersStore['waterMaterialFragmentShader'] = `
    precision highp float;
    uniform float time;
    uniform vec3 color;
    uniform float transparency;
    varying vec2 vUV;
    varying float vElevation;
    void main() {
      float foam = smoothstep(0.3, 0.5, vElevation);
      vec2 causticsUv = vUV * 10.0 + time * 0.1;
      float caustics = abs(sin(causticsUv.x * 3.14159) * sin(causticsUv.y * 3.14159));
      float depth = vUV.y;
      vec3 deepColor = color * 0.5;
      vec3 shallowColor = color * 1.5;
      vec3 finalColor = mix(deepColor, shallowColor, depth);
      finalColor += vec3(foam * 0.5);
      finalColor += vec3(caustics * 0.2);
      gl_FragColor = vec4(finalColor, transparency);
    }
  `;

  // Fire shader
  Effect.ShadersStore['fireMaterialVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    varying vec3 vPosition;
    void main() {
      vUV = uv;
      vPosition = position;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;
  Effect.ShadersStore['fireMaterialFragmentShader'] = `
    precision highp float;
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float intensity;
    uniform float speed;
    varying vec2 vUV;
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
      vec2 uv = vUV;
      float n1 = noise(uv * 5.0 + time * speed);
      float n2 = noise(uv * 10.0 + time * speed * 1.5);
      float n3 = noise(uv * 20.0 + time * speed * 2.0);
      float firePattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
      float gradient = 1.0 - uv.y;
      firePattern *= gradient;
      vec3 fireColor = mix(color1, color2, firePattern);
      float flicker = sin(time * 10.0) * 0.1 + 0.9;
      fireColor *= intensity * flicker;
      float alpha = firePattern * intensity;
      gl_FragColor = vec4(fireColor, alpha);
    }
  `;

  // Shield shader
  Effect.ShadersStore['shieldMaterialVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    uniform mat4 world;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUV = uv;
      vNormal = normalize(mat3(world) * normal);
      vPosition = (world * vec4(position, 1.0)).xyz;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;
  Effect.ShadersStore['shieldMaterialFragmentShader'] = `
    precision highp float;
    uniform float time;
    uniform vec3 hitPosition;
    uniform float hitStrength;
    uniform vec3 color;
    uniform float opacity;
    uniform vec3 cameraPosition;
    varying vec2 vUV;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
      vec2 hexUv = vUV * 20.0;
      float hexPattern = abs(sin(hexUv.x * 3.14159) * sin(hexUv.y * 3.14159));
      hexPattern = step(0.5, hexPattern);
      float distToHit = length(vPosition - hitPosition);
      float ripple = sin(distToHit * 5.0 - time * 10.0) * 0.5 + 0.5;
      ripple *= smoothstep(2.0, 0.0, distToHit) * hitStrength;
      float pulse = sin(time * 2.0) * 0.2 + 0.8;
      vec3 finalColor = color * (fresnel + hexPattern * 0.3 + ripple) * pulse;
      float finalOpacity = opacity * (fresnel * 0.5 + 0.5 + ripple);
      gl_FragColor = vec4(finalColor, finalOpacity);
    }
  `;

  // Shader configurations matching api-effects.js
  const shaderConfigs = {
    holographic: {
      shaderName: 'holographic',
      uniforms: ['time', 'color', 'scanlineSpeed', 'glitchAmount', 'opacity'],
      defaults: {
        time: 0,
        color: new Color3(0, 1, 1),
        scanlineSpeed: 2.0,
        glitchAmount: 0.1,
        opacity: 0.8,
      },
    },
    water: {
      shaderName: 'waterMaterial',
      uniforms: ['time', 'color', 'waveSpeed', 'waveHeight', 'transparency'],
      defaults: {
        time: 0,
        color: new Color3(0, 0.53, 1),
        waveSpeed: 1.0,
        waveHeight: 0.5,
        transparency: 0.7,
      },
    },
    fire: {
      shaderName: 'fireMaterial',
      uniforms: ['time', 'color1', 'color2', 'intensity', 'speed'],
      defaults: {
        time: 0,
        color1: new Color3(1, 0.27, 0),
        color2: new Color3(1, 1, 0),
        intensity: 1.0,
        speed: 2.0,
      },
    },
    shield: {
      shaderName: 'shieldMaterial',
      uniforms: ['time', 'hitPosition', 'hitStrength', 'color', 'opacity', 'cameraPosition'],
      defaults: {
        time: 0,
        hitPosition: [0, 0, 0],
        hitStrength: 0,
        color: new Color3(0, 1, 1),
        opacity: 0.6,
        cameraPosition: [0, 0, 0],
      },
    },
  };

  function createShaderMaterial(shaderName, customUniforms = {}) {
    const config = shaderConfigs[shaderName];
    if (!config) {
      console.warn(`[Babylon Effects] Unknown shader: ${shaderName}`);
      return null;
    }

    const material = new ShaderMaterial(
      `shader_${shaderName}_${Date.now()}`,
      self.scene,
      {
        vertex: config.shaderName,
        fragment: config.shaderName,
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['world', 'worldViewProjection', ...config.uniforms],
      }
    );

    // Set default uniform values
    for (const [key, value] of Object.entries(config.defaults)) {
      if (customUniforms[key] !== undefined) {
        const val = customUniforms[key];
        if (val instanceof Color3) {
          material.setColor3(key, val);
        } else if (Array.isArray(val) && val.length === 3) {
          material.setVector3(key, { x: val[0], y: val[1], z: val[2] });
        } else {
          material.setFloat(key, val);
        }
      } else if (value instanceof Color3) {
        material.setColor3(key, value);
      } else if (Array.isArray(value) && value.length === 3) {
        material.setVector3(key, { x: value[0], y: value[1], z: value[2] });
      } else {
        material.setFloat(key, value);
      }
    }

    // Enable transparency and double-sided rendering
    material.alpha = config.defaults.opacity ?? config.defaults.transparency ?? 0.8;
    material.backFaceCulling = false;
    material.alphaMode = Constants.ALPHA_COMBINE;

    // Apply compatibility methods (needAlphaBlendingForMesh, etc.)
    applyBabylonMaterialCompatibility(material);

    const id = `shader_${Date.now()}_${Math.random()}`;
    customShaders.set(id, material);

    return { id, material };
  }

  function updateShaderUniform(shaderId, uniformName, value) {
    const material = customShaders.get(shaderId);
    if (!material) return false;

    if (value instanceof Color3) {
      material.setColor3(uniformName, value);
    } else if (Array.isArray(value) && value.length === 3) {
      material.setVector3(uniformName, { x: value[0], y: value[1], z: value[2] });
    } else {
      material.setFloat(uniformName, value);
    }
    return true;
  }

  function updateShaderTime(deltaTime) {
    customShaders.forEach(material => {
      // Update time uniform for animated shaders
      // Store time on material object since Babylon doesn't have getUniform
      if (material.isDisposed?.()) return;
      try {
        const currentTime = material._shaderTime ?? 0;
        material._shaderTime = currentTime + deltaTime;
        material.setFloat('time', material._shaderTime);
      } catch (e) {
        // Material may be disposed or not ready
      }
    });

    // Also increment glitchTime for post-process effects
    glitchTime += deltaTime;
  }

  return {
    // Bloom
    enableBloom,
    disableBloom,
    setBloomStrength,
    setBloomRadius,
    setBloomThreshold,

    // FXAA
    enableFXAA,
    disableFXAA,

    // Chromatic aberration
    enableChromaticAberration,
    disableChromaticAberration,

    // Vignette
    enableVignette,
    disableVignette,

    // Glitch
    enableGlitch,
    disableGlitch,
    setGlitchIntensity,
    setGlitchOptions,

    // Sharpen (Babylon-specific bonus)
    enableSharpen,
    disableSharpen,

    // Grain (Babylon-specific bonus)
    enableGrain,
    disableGrain,

    // Convenience
    enableRetroEffects,
    disableRetroEffects,

    // Custom shader materials (parity with api-effects.js)
    createShaderMaterial,
    updateShaderUniform,

    // Status
    isEffectsEnabled: () => effectsEnabled,

    // Internal
    updateEffects,
    disposeEffects,
  };
}
