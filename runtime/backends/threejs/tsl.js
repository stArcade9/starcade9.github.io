// runtime/api-3d/tsl.js
// TSL (Three Shading Language) utilities exposed to Nova64 cart developers
// Preset materials use GLSL ShaderMaterial for WebGLRenderer compatibility.
// Raw TSL building blocks (tslFn, tslVec3, etc.) are re-exported from three/tsl
// for advanced users who opt into WebGPURenderer.
import * as THREE from 'three';
import {
  Fn,
  uniform,
  float,
  int,
  vec2,
  vec3,
  vec4,
  color,
  sin,
  cos,
  mix,
  step,
  smoothstep,
  clamp,
  fract,
  floor,
  ceil,
  abs as tslAbs,
  pow,
  sqrt,
  min as tslMin,
  max as tslMax,
  dot,
  cross,
  normalize,
  length,
  distance,
  reflect,
  hash,
  uv,
  time as tslTime,
  positionLocal,
  positionWorld,
  normalLocal,
  normalWorld,
  normalView,
  Loop,
} from 'three/tsl';

// ─── Shared GLSL helpers ─────────────────────────────────────────────────────

const COMMON_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function makePresetMaterial(fragmentGlsl, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: COMMON_VERTEX,
    fragmentShader: fragmentGlsl,
    transparent: opts.transparent !== false,
    side: opts.side || THREE.DoubleSide,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : false,
  });
}

// ─── Shared GLSL noise library ───────────────────────────────────────────────

const NOISE_LIB = /* glsl */ `
float _hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float _noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(_hash(i), _hash(i + vec2(1.0, 0.0)), f.x),
    mix(_hash(i + vec2(0.0, 1.0)), _hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float _fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * _noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
`;

// ─── Shared GLSL utility helpers ─────────────────────────────────────────────

const UTIL_LIB = /* glsl */ `
float _remap(float v, float lo, float hi, float nlo, float nhi) {
  return nlo + (v - lo) / (hi - lo) * (nhi - nlo);
}
vec2 _rotateUV(vec2 uv, float angle) {
  float c = cos(angle), s = sin(angle);
  uv -= 0.5;
  uv = mat2(c, -s, s, c) * uv;
  return uv + 0.5;
}
vec2 _polarCoords(vec2 uv) {
  vec2 p = uv - 0.5;
  return vec2(length(p), atan(p.y, p.x));
}
`;

// ─── GLSL fragment shaders for each preset ───────────────────────────────────

const PRESET_SHADERS = {
  plasma: opts =>
    makePresetMaterial(
      /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float speed = ${(opts.speed || 2.0).toFixed(4)};
      float t = uTime * speed;
      float n1 = sin(vUv.x * 10.0 + t) * 0.5 + 0.5;
      float n2 = sin(vUv.y * 8.0 - t * 0.7) * 0.5 + 0.5;
      float n3 = sin((vUv.x + vUv.y) * 6.0 + t * 1.3) * 0.5 + 0.5;
      float pattern = (n1 + n2 + n3) / 3.0;
      vec3 col1 = vec3(${_c(opts.color1, [1.0, 0.2, 0.5])});
      vec3 col2 = vec3(${_c(opts.color2, [0.2, 0.5, 1.0])});
      vec3 col = mix(col1, col2, pattern);
      gl_FragColor = vec4(col, ${(opts.opacity || 0.9).toFixed(4)});
    }
  `,
      opts
    ),

  galaxy: opts =>
    makePresetMaterial(
      /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    // Simple hash for stars
    float hash2(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    void main() {
      float speed = ${(opts.speed || 0.5).toFixed(4)};
      float t = uTime * speed;
      vec2 p = vUv - 0.5;
      float angle = atan(p.y, p.x) + t;
      float radius = length(p);
      float spiral = sin(angle * 3.0 - radius * 10.0 + t) * 0.5 + 0.5;
      float stars = step(0.98, hash2(vUv * 100.0 + t * 0.1));
      float r = spiral * 0.6 + radius * 0.5;
      float g = spiral * 0.3 + stars;
      float b = spiral * 0.8 + (1.0 - radius) * 0.4;
      float alpha = smoothstep(0.5, 0.1, radius);
      gl_FragColor = vec4(r, g, b, alpha * ${(opts.opacity || 0.9).toFixed(4)});
    }
  `,
      opts
    ),

  lava: opts =>
    makePresetMaterial(
      /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    float hash2(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    void main() {
      float speed = ${(opts.speed || 1.0).toFixed(4)};
      float t = uTime * speed;
      float n1 = hash2(vUv * 5.0 + t);
      float n2 = hash2(vUv * 10.0 + t * 1.5);
      float n3 = hash2(vUv * 20.0 - t * 0.5);
      float lava = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
      float hot = smoothstep(0.3, 0.7, lava);
      float r = hot * 1.5 + 0.2;
      float g = hot * hot * 0.8;
      float b = hot * hot * hot * 0.3;
      gl_FragColor = vec4(r, g, b, ${(opts.opacity || 1.0).toFixed(4)});
    }
  `,
      opts
    ),

  electricity: opts => {
    const col = opts.color ? new THREE.Color(opts.color) : new THREE.Color(0x44aaff);
    return makePresetMaterial(
      /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      void main() {
        float speed = ${(opts.speed || 3.0).toFixed(4)};
        float t = uTime * speed;
        float bolt1 = abs(vUv.x - 0.5 - sin(vUv.y * 20.0 + t) * 0.1);
        float bolt2 = abs(vUv.x - 0.5 - sin(vUv.y * 15.0 + t * 1.3) * 0.08);
        float glow1 = smoothstep(0.08, 0.0, bolt1);
        float glow2 = smoothstep(0.06, 0.0, bolt2);
        float combined = glow1 + glow2;
        float flicker = hash2(vec2(t * 10.0, 0.0)) * 0.3 + 0.7;
        vec3 baseCol = vec3(${col.r.toFixed(4)}, ${col.g.toFixed(4)}, ${col.b.toFixed(4)});
        gl_FragColor = vec4(baseCol * combined * flicker, combined * ${(opts.opacity || 0.9).toFixed(4)});
      }
    `,
      opts
    );
  },

  rainbow: opts =>
    makePresetMaterial(
      /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float speed = ${(opts.speed || 1.0).toFixed(4)};
      float t = uTime * speed;
      float phase = (vUv.x + vUv.y) * 2.0 + t;
      float r = sin(phase) * 0.5 + 0.5;
      float g = sin(phase + 2.094) * 0.5 + 0.5;
      float b = sin(phase + 4.189) * 0.5 + 0.5;
      gl_FragColor = vec4(r, g, b, ${(opts.opacity || 1.0).toFixed(4)});
    }
  `,
      opts
    ),

  void: opts =>
    makePresetMaterial(
      /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float speed = ${(opts.speed || 0.3).toFixed(4)};
      float t = uTime * speed;
      vec2 p = vUv - 0.5;
      float dist = length(p);
      float swirl = sin(dist * 20.0 - t * 3.0) * 0.5 + 0.5;
      float dark = smoothstep(0.4, 0.0, dist);
      float edge = smoothstep(0.0, 0.3, dist) * smoothstep(0.5, 0.3, dist);
      float r = edge * swirl * 0.3;
      float g = edge * swirl * 0.1;
      float b = edge * swirl * 0.5 + dark * 0.1;
      gl_FragColor = vec4(r, g, b, ${(opts.opacity || 0.95).toFixed(4)});
    }
  `,
      opts
    ),

  // ─── Phase 1 Shader Pack ─────────────────────────────────────────────────

  lava2: opts =>
    makePresetMaterial(
      NOISE_LIB +
        /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float speed = ${(opts.speed || 0.2).toFixed(4)};
      float scale = ${(opts.scale || 4.0).toFixed(4)};
      float intensity = ${(opts.intensity || 3.0).toFixed(4)};
      float t = uTime * speed;
      // Flowing distorted UVs
      vec2 uv = vUv * scale;
      uv.x += _fbm(vUv * 3.0 + t * 0.3) * 0.4;
      uv.y += _fbm(vUv * 2.5 - t * 0.2) * 0.4;
      float n = _fbm(uv + t);
      // Crack mask — bright cracks where noise crosses threshold
      float crack = smoothstep(0.42, 0.48, n);
      float crackGlow = smoothstep(0.38, 0.48, n) - crack;
      // Color ramp: dark crust → orange → bright yellow cracks
      vec3 colA = vec3(${_c(opts.colorA, [1.0, 0.9, 0.1])});  // hot (cracks)
      vec3 colB = vec3(${_c(opts.colorB, [0.15, 0.02, 0.0])}); // cool (crust)
      vec3 col = mix(colB, colA, crack);
      // Emissive glow around cracks
      col += vec3(1.0, 0.4, 0.0) * crackGlow * intensity;
      // Subtle pulsing
      col *= 0.9 + sin(t * 2.0) * 0.1;
      gl_FragColor = vec4(col, ${(opts.opacity || 1.0).toFixed(4)});
    }
  `,
      opts
    ),

  vortex: opts =>
    makePresetMaterial(
      UTIL_LIB +
        /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float speed = ${(opts.speed || 1.0).toFixed(4)};
      float scale = ${(opts.scale || 5.0).toFixed(4)};
      float intensity = ${(opts.intensity || 1.5).toFixed(4)};
      float t = uTime * speed;
      vec2 polar = _polarCoords(vUv);
      float radius = polar.x;
      float angle = polar.y;
      // Swirl — angle offset increases toward center
      float swirl = angle * scale - radius * 12.0 + t * 2.0;
      float arms = sin(swirl) * 0.5 + 0.5;
      arms = pow(arms, 1.5);
      // Radial gradient — bright center, fading edges
      float radGrad = smoothstep(0.5, 0.0, radius);
      // Center glow
      float core = exp(-radius * 8.0) * 1.5;
      vec3 colA = vec3(${_c(opts.colorA, [0.3, 0.0, 1.0])});
      vec3 colB = vec3(${_c(opts.colorB, [0.0, 1.0, 0.8])});
      vec3 col = mix(colA, colB, arms) * (radGrad * intensity + core);
      // Edge ring
      float ring = smoothstep(0.48, 0.45, radius) * smoothstep(0.35, 0.45, radius);
      col += vec3(${_c(opts.colorB, [0.0, 1.0, 0.8])}) * ring * 0.5;
      float alpha = radGrad * 0.9 + core;
      gl_FragColor = vec4(col, alpha * ${(opts.opacity || 0.9).toFixed(4)});
    }
  `,
      opts
    ),

  plasma2: opts =>
    makePresetMaterial(
      /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float speed = ${(opts.speed || 1.0).toFixed(4)};
      float scale = ${(opts.scale || 1.0).toFixed(4)};
      float t = uTime * speed;
      vec2 uv = vUv * scale;
      // 4-layer sine plasma for smooth no-banding result
      float v1 = sin(uv.x * 10.0 + t);
      float v2 = sin(uv.y * 8.0 - t * 0.7);
      float v3 = sin((uv.x + uv.y) * 6.0 + t * 1.3);
      float v4 = sin(length(uv - 0.5) * 14.0 - t * 1.8);
      float pattern = (v1 + v2 + v3 + v4) * 0.25;
      // RGB phase shift — retro look
      vec3 colA = vec3(${_c(opts.colorA, [1.0, 0.1, 0.3])});
      vec3 colB = vec3(${_c(opts.colorB, [0.1, 0.3, 1.0])});
      float r = sin(pattern * 3.14159 + 0.0) * 0.5 + 0.5;
      float g = sin(pattern * 3.14159 + 2.094) * 0.5 + 0.5;
      float b = sin(pattern * 3.14159 + 4.189) * 0.5 + 0.5;
      vec3 rgb = vec3(r, g, b);
      vec3 col = mix(colA, colB, pattern * 0.5 + 0.5) * 0.5 + rgb * 0.5;
      gl_FragColor = vec4(col, ${(opts.opacity || 1.0).toFixed(4)});
    }
  `,
      opts
    ),

  water: opts =>
    makePresetMaterial(
      NOISE_LIB +
        /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float speed = ${(opts.speed || 0.5).toFixed(4)};
      float scale = ${(opts.scale || 6.0).toFixed(4)};
      float intensity = ${(opts.intensity || 0.03).toFixed(4)};
      float t = uTime * speed;
      vec2 uv = vUv * scale;
      // Layered sine waves for surface ripples
      float wave1 = sin(uv.x * 3.0 + uv.y * 1.5 + t * 2.0) * 0.5 + 0.5;
      float wave2 = sin(uv.x * 1.8 - uv.y * 2.5 + t * 1.5) * 0.5 + 0.5;
      float wave3 = sin(uv.x * 5.0 + t * 3.0) * 0.3;
      // Distort UVs with noise for natural look
      vec2 distUv = vUv;
      distUv.x += _noise(uv + t) * intensity;
      distUv.y += _noise(uv * 1.3 - t * 0.7) * intensity;
      float n = _fbm(distUv * scale * 1.5 + t * 0.5);
      // Color: deep → shallow
      vec3 colA = vec3(${_c(opts.colorA, [0.0, 0.05, 0.2])});  // deep
      vec3 colB = vec3(${_c(opts.colorB, [0.1, 0.5, 0.7])});   // shallow
      float depth = (wave1 + wave2) * 0.5;
      vec3 col = mix(colA, colB, depth);
      // Specular highlights (fake caustics)
      float spec = pow(wave1 * wave2, 3.0) * 1.5;
      col += vec3(0.6, 0.8, 1.0) * spec;
      // Foam on wave peaks
      float foam = smoothstep(0.75, 0.85, depth + n * 0.3);
      col = mix(col, vec3(0.8, 0.9, 1.0), foam * 0.4);
      // Fresnel-like edge highlight
      float fresnel = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 0.5) * pow(1.0 - abs(vUv.y - 0.5) * 2.0, 0.5);
      fresnel = pow(1.0 - fresnel, 2.0);
      col += vec3(0.3, 0.6, 0.9) * fresnel * 0.3;
      gl_FragColor = vec4(col, ${(opts.opacity || 0.85).toFixed(4)});
    }
  `,
      opts
    ),

  hologram: opts => {
    const col = opts.colorA ? new THREE.Color(opts.colorA) : new THREE.Color(0x00ffcc);
    return makePresetMaterial(
      NOISE_LIB +
        /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float speed = ${(opts.speed || 1.0).toFixed(4)};
        float lineCount = ${(opts.scale || 80.0).toFixed(4)};
        float intensity = ${(opts.intensity || 1.0).toFixed(4)};
        float t = uTime * speed;
        // Scanlines
        float scan = sin(vUv.y * lineCount + t * 4.0) * 0.5 + 0.5;
        scan = smoothstep(0.3, 0.7, scan) * 0.35 + 0.65;
        // Flicker
        float flicker = _hash(vec2(floor(t * 12.0), 0.0)) * 0.15 + 0.85;
        // Fresnel edge glow
        float edgeX = pow(abs(vUv.x - 0.5) * 2.0, 2.0);
        float edgeY = pow(abs(vUv.y - 0.5) * 2.0, 2.0);
        float fresnel = pow(max(edgeX, edgeY), 1.2);
        // Horizontal glitch bars
        float glitchY = floor(vUv.y * 20.0 + t * 2.0);
        float glitch = step(0.92, _hash(vec2(glitchY, floor(t * 8.0))));
        float glitchOff = glitch * ((_hash(vec2(glitchY, t)) - 0.5) * 0.1);
        vec3 baseCol = vec3(${col.r.toFixed(4)}, ${col.g.toFixed(4)}, ${col.b.toFixed(4)});
        vec3 color = baseCol * scan * flicker * intensity;
        // Add brighter fresnel edge
        color += baseCol * fresnel * 0.8;
        // Glitch color shift
        color.r += glitchOff * 2.0;
        float alpha = (0.4 + fresnel * 0.4) * scan * flicker;
        gl_FragColor = vec4(color, alpha * ${(opts.opacity || 0.7).toFixed(4)});
      }
    `,
      opts
    );
  },

  shockwave: opts => {
    const col = opts.colorA ? new THREE.Color(opts.colorA) : new THREE.Color(0x00aaff);
    return makePresetMaterial(
      /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float speed = ${(opts.speed || 0.3).toFixed(4)};
        float intensity = ${(opts.intensity || 2.0).toFixed(4)};
        float t = mod(uTime * speed, 1.0); // 0→1 cycle, auto-repeats
        vec2 center = vUv - 0.5;
        float dist = length(center);
        // Expanding ring
        float ringPos = t * 0.6; // ring expands from 0 to 0.6 radius
        float ringWidth = 0.04 + t * 0.02; // ring gets slightly wider as it expands
        float ring = smoothstep(ringPos - ringWidth, ringPos, dist)
                   * smoothstep(ringPos + ringWidth, ringPos, dist);
        // Fade out as ring expands
        float fade = 1.0 - t;
        fade = fade * fade; // ease-out
        // Inner ripple
        float ripple = sin(dist * 40.0 - t * 20.0) * 0.5 + 0.5;
        float innerRipple = ripple * smoothstep(ringPos, ringPos - 0.1, dist) * 0.3;
        vec3 baseCol = vec3(${col.r.toFixed(4)}, ${col.g.toFixed(4)}, ${col.b.toFixed(4)});
        vec3 color = baseCol * (ring * intensity + innerRipple) * fade;
        // White-hot center of ring
        color += vec3(1.0) * ring * fade * 0.5;
        float alpha = (ring + innerRipple * 0.5) * fade;
        gl_FragColor = vec4(color, alpha * ${(opts.opacity || 0.9).toFixed(4)});
      }
    `,
      opts
    );
  },
};

/** Format a color option to a GLSL vec3 literal. */
function _c(colorOpt, fallback) {
  if (!colorOpt) return fallback.map(v => v.toFixed(4)).join(', ');
  const c = new THREE.Color(colorOpt);
  return `${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)}`;
}

// ─── Module factory ──────────────────────────────────────────────────────────

export function tslModule(_ctx) {
  // Track all preset materials so we can animate uTime
  const _animatedMaterials = [];

  /**
   * createTSLMaterial(preset, options)
   * Returns a ShaderMaterial with an animated procedural shader.
   * The material's uTime uniform is updated automatically each frame.
   *
   * Presets: 'plasma', 'galaxy', 'lava', 'electricity', 'rainbow', 'void',
   *          'lava2', 'vortex', 'plasma2', 'water', 'hologram', 'shockwave'
   */
  function createTSLMaterial(preset, options = {}) {
    const factory = PRESET_SHADERS[preset];
    if (!factory) {
      console.warn(`[Nova64 TSL] Unknown preset: "${preset}"`);
      return new THREE.MeshBasicMaterial({ color: 0xff00ff });
    }
    const mat = factory(options);
    _animatedMaterials.push(mat);
    return mat;
  }

  /**
   * createTSLShaderMaterial(vertexShader, fragmentShader, uniforms, opts)
   * Creates a custom ShaderMaterial with supplied GLSL code.
   * Automatically adds uTime uniform and animates it.
   */
  function createTSLShaderMaterial(vertexShader, fragmentShader, uniforms = {}, opts = {}) {
    const finalUniforms = { uTime: { value: 0 }, ...uniforms };
    const mat = new THREE.ShaderMaterial({
      uniforms: finalUniforms,
      vertexShader: vertexShader || COMMON_VERTEX,
      fragmentShader,
      transparent: opts.transparent !== false,
      side: opts.side || THREE.DoubleSide,
      depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : false,
    });
    _animatedMaterials.push(mat);
    return mat;
  }

  // ─── Convenience factory functions (Phase 1 Shader Pack) ─────────────────
  function createLavaMaterial(opts = {}) {
    return createTSLMaterial('lava2', opts);
  }
  function createVortexMaterial(opts = {}) {
    return createTSLMaterial('vortex', opts);
  }
  function createPlasmaMaterial(opts = {}) {
    return createTSLMaterial('plasma2', opts);
  }
  function createWaterMaterial(opts = {}) {
    return createTSLMaterial('water', opts);
  }
  function createHologramMaterial(opts = {}) {
    return createTSLMaterial('hologram', opts);
  }
  function createShockwaveMaterial(opts = {}) {
    return createTSLMaterial('shockwave', opts);
  }

  // Update uTime for all tracked materials — called in the game loop via api-3d
  function _updateTSLMaterials(dt) {
    for (const mat of _animatedMaterials) {
      if (mat.uniforms && mat.uniforms.uTime) {
        mat.uniforms.uTime.value += dt;
      }
    }
  }

  // ─── Expose raw TSL building blocks for advanced / future WebGPU users ─────
  const tslExports = {
    // Preset material factory
    createTSLMaterial,
    createTSLShaderMaterial,
    _updateTSLMaterials,

    // Convenience factories (Phase 1 Shader Pack)
    createLavaMaterial,
    createVortexMaterial,
    createPlasmaMaterial,
    createWaterMaterial,
    createHologramMaterial,
    createShockwaveMaterial,

    // TSL node functions — available as globals for cart developers
    // These build TSL node graphs (require WebGPURenderer to render)
    tslFn: Fn,
    tslUniform: uniform,
    tslFloat: float,
    tslInt: int,
    tslVec2: vec2,
    tslVec3: vec3,
    tslVec4: vec4,
    tslColor: color,
    tslSin: sin,
    tslCos: cos,
    tslMix: mix,
    tslStep: step,
    tslSmoothstep: smoothstep,
    tslClamp: clamp,
    tslFract: fract,
    tslFloor: floor,
    tslCeil: ceil,
    tslAbs: tslAbs,
    tslPow: pow,
    tslSqrt: sqrt,
    tslMin: tslMin,
    tslMax: tslMax,
    tslDot: dot,
    tslCross: cross,
    tslNormalize: normalize,
    tslLength: length,
    tslDistance: distance,
    tslReflect: reflect,
    tslHash: hash,
    tslUv: uv,
    tslTime: tslTime,
    tslPositionLocal: positionLocal,
    tslPositionWorld: positionWorld,
    tslNormalLocal: normalLocal,
    tslNormalWorld: normalWorld,
    tslNormalView: normalView,
    tslLoop: Loop,
  };

  return tslExports;
}
