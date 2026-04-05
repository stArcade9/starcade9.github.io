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
   * Presets: 'plasma', 'galaxy', 'lava', 'electricity', 'rainbow', 'void'
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
