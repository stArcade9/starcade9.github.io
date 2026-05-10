// runtime/backends/babylon/tsl.js
// TSL (Three Shading Language) equivalent for Babylon.js backend
// Provides preset procedural shader materials with full parity to Three.js tsl.js

import {
  Color3,
  Constants,
  Effect,
  ShaderMaterial,
  StandardMaterial,
  Vector2,
  Vector3,
} from '@babylonjs/core';

import { applyBabylonMaterialCompatibility } from './compat.js';

// ─── Shared GLSL helpers ─────────────────────────────────────────────────────

const COMMON_VERTEX = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

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

/** Format a color option to a GLSL vec3 literal. */
function _c(colorOpt, fallback) {
  if (!colorOpt) return fallback.map(v => v.toFixed(4)).join(', ');
  const c = hexToColor3(colorOpt);
  return `${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)}`;
}

function hexToColor3(hex) {
  if (hex instanceof Color3) return hex;
  if (typeof hex === 'number') {
    return new Color3(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255);
  }
  return new Color3(1, 1, 1);
}

// ─── GLSL fragment shaders for each preset ───────────────────────────────────

const PRESET_SHADERS = {
  plasma: opts => ({
    vertex: COMMON_VERTEX,
    fragment: /* glsl */ `
      precision highp float;
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
    opts,
  }),

  galaxy: opts => ({
    vertex: COMMON_VERTEX,
    fragment: /* glsl */ `
      precision highp float;
      uniform float uTime;
      varying vec2 vUv;
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
    opts,
  }),

  lava: opts => ({
    vertex: COMMON_VERTEX,
    fragment: /* glsl */ `
      precision highp float;
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
    opts,
  }),

  electricity: opts => {
    const col = opts.color ? hexToColor3(opts.color) : new Color3(0.27, 0.67, 1.0);
    return {
      vertex: COMMON_VERTEX,
      fragment: /* glsl */ `
        precision highp float;
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
      opts,
    };
  },

  rainbow: opts => ({
    vertex: COMMON_VERTEX,
    fragment: /* glsl */ `
      precision highp float;
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
    opts,
  }),

  void: opts => ({
    vertex: COMMON_VERTEX,
    fragment: /* glsl */ `
      precision highp float;
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
    opts,
  }),

  // ─── Phase 1 Shader Pack ─────────────────────────────────────────────────

  lava2: opts => ({
    vertex: COMMON_VERTEX,
    fragment:
      NOISE_LIB +
      /* glsl */ `
      precision highp float;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float speed = ${(opts.speed || 0.2).toFixed(4)};
        float scale = ${(opts.scale || 4.0).toFixed(4)};
        float intensity = ${(opts.intensity || 3.0).toFixed(4)};
        float t = uTime * speed;
        vec2 uv = vUv * scale;
        uv.x += _fbm(vUv * 3.0 + t * 0.3) * 0.4;
        uv.y += _fbm(vUv * 2.5 - t * 0.2) * 0.4;
        float n = _fbm(uv + t);
        float crack = smoothstep(0.42, 0.48, n);
        float crackGlow = smoothstep(0.38, 0.48, n) - crack;
        vec3 colA = vec3(${_c(opts.colorA, [1.0, 0.9, 0.1])});
        vec3 colB = vec3(${_c(opts.colorB, [0.15, 0.02, 0.0])});
        vec3 col = mix(colB, colA, crack);
        col += vec3(1.0, 0.4, 0.0) * crackGlow * intensity;
        col *= 0.9 + sin(t * 2.0) * 0.1;
        gl_FragColor = vec4(col, ${(opts.opacity || 1.0).toFixed(4)});
      }
    `,
    opts,
  }),

  vortex: opts => ({
    vertex: COMMON_VERTEX,
    fragment:
      UTIL_LIB +
      /* glsl */ `
      precision highp float;
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
        float swirl = angle * scale - radius * 12.0 + t * 2.0;
        float arms = sin(swirl) * 0.5 + 0.5;
        arms = pow(arms, 1.5);
        float radGrad = smoothstep(0.5, 0.0, radius);
        float core = exp(-radius * 8.0) * 1.5;
        vec3 colA = vec3(${_c(opts.colorA, [0.3, 0.0, 1.0])});
        vec3 colB = vec3(${_c(opts.colorB, [0.0, 1.0, 0.8])});
        vec3 col = mix(colA, colB, arms) * (radGrad * intensity + core);
        float ring = smoothstep(0.48, 0.45, radius) * smoothstep(0.35, 0.45, radius);
        col += vec3(${_c(opts.colorB, [0.0, 1.0, 0.8])}) * ring * 0.5;
        float alpha = radGrad * 0.9 + core;
        gl_FragColor = vec4(col, alpha * ${(opts.opacity || 0.9).toFixed(4)});
      }
    `,
    opts,
  }),

  plasma2: opts => ({
    vertex: COMMON_VERTEX,
    fragment: /* glsl */ `
      precision highp float;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float speed = ${(opts.speed || 1.0).toFixed(4)};
        float scale = ${(opts.scale || 1.0).toFixed(4)};
        float t = uTime * speed;
        vec2 uv = vUv * scale;
        float v1 = sin(uv.x * 10.0 + t);
        float v2 = sin(uv.y * 8.0 - t * 0.7);
        float v3 = sin((uv.x + uv.y) * 6.0 + t * 1.3);
        float v4 = sin(length(uv - 0.5) * 14.0 - t * 1.8);
        float pattern = (v1 + v2 + v3 + v4) * 0.25;
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
    opts,
  }),

  water: opts => ({
    vertex: COMMON_VERTEX,
    fragment:
      NOISE_LIB +
      /* glsl */ `
      precision highp float;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float speed = ${(opts.speed || 0.5).toFixed(4)};
        float scale = ${(opts.scale || 6.0).toFixed(4)};
        float intensity = ${(opts.intensity || 0.03).toFixed(4)};
        float t = uTime * speed;
        vec2 uv = vUv * scale;
        float wave1 = sin(uv.x * 3.0 + uv.y * 1.5 + t * 2.0) * 0.5 + 0.5;
        float wave2 = sin(uv.x * 1.8 - uv.y * 2.5 + t * 1.5) * 0.5 + 0.5;
        float wave3 = sin(uv.x * 5.0 + t * 3.0) * 0.3;
        vec2 distUv = vUv;
        distUv.x += _noise(uv + t) * intensity;
        distUv.y += _noise(uv * 1.3 - t * 0.7) * intensity;
        float n = _fbm(distUv * scale * 1.5 + t * 0.5);
        vec3 colA = vec3(${_c(opts.colorA, [0.0, 0.05, 0.2])});
        vec3 colB = vec3(${_c(opts.colorB, [0.1, 0.5, 0.7])});
        float depth = (wave1 + wave2) * 0.5;
        vec3 col = mix(colA, colB, depth);
        float spec = pow(wave1 * wave2, 3.0) * 1.5;
        col += vec3(0.6, 0.8, 1.0) * spec;
        float foam = smoothstep(0.75, 0.85, depth + n * 0.3);
        col = mix(col, vec3(0.8, 0.9, 1.0), foam * 0.4);
        float fresnel = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 0.5) * pow(1.0 - abs(vUv.y - 0.5) * 2.0, 0.5);
        fresnel = pow(1.0 - fresnel, 2.0);
        col += vec3(0.3, 0.6, 0.9) * fresnel * 0.3;
        gl_FragColor = vec4(col, ${(opts.opacity || 0.85).toFixed(4)});
      }
    `,
    opts,
  }),

  hologram: opts => {
    const col = opts.colorA ? hexToColor3(opts.colorA) : new Color3(0.0, 1.0, 0.8);
    return {
      vertex: COMMON_VERTEX,
      fragment:
        NOISE_LIB +
        /* glsl */ `
        precision highp float;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float speed = ${(opts.speed || 1.0).toFixed(4)};
          float lineCount = ${(opts.scale || 80.0).toFixed(4)};
          float intensity = ${(opts.intensity || 1.0).toFixed(4)};
          float t = uTime * speed;
          float scan = sin(vUv.y * lineCount + t * 4.0) * 0.5 + 0.5;
          scan = smoothstep(0.3, 0.7, scan) * 0.35 + 0.65;
          float flicker = _hash(vec2(floor(t * 12.0), 0.0)) * 0.15 + 0.85;
          float edgeX = pow(abs(vUv.x - 0.5) * 2.0, 2.0);
          float edgeY = pow(abs(vUv.y - 0.5) * 2.0, 2.0);
          float fresnel = pow(max(edgeX, edgeY), 1.2);
          float glitchY = floor(vUv.y * 20.0 + t * 2.0);
          float glitch = step(0.92, _hash(vec2(glitchY, floor(t * 8.0))));
          float glitchOff = glitch * ((_hash(vec2(glitchY, t)) - 0.5) * 0.1);
          vec3 baseCol = vec3(${col.r.toFixed(4)}, ${col.g.toFixed(4)}, ${col.b.toFixed(4)});
          vec3 color = baseCol * scan * flicker * intensity;
          color += baseCol * fresnel * 0.8;
          color.r += glitchOff * 2.0;
          float alpha = (0.4 + fresnel * 0.4) * scan * flicker;
          gl_FragColor = vec4(color, alpha * ${(opts.opacity || 0.7).toFixed(4)});
        }
      `,
      opts,
    };
  },

  shockwave: opts => {
    const col = opts.colorA ? hexToColor3(opts.colorA) : new Color3(0.0, 0.67, 1.0);
    return {
      vertex: COMMON_VERTEX,
      fragment: /* glsl */ `
        precision highp float;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float speed = ${(opts.speed || 0.3).toFixed(4)};
          float intensity = ${(opts.intensity || 2.0).toFixed(4)};
          float t = mod(uTime * speed, 1.0);
          vec2 center = vUv - 0.5;
          float dist = length(center);
          float ringPos = t * 0.6;
          float ringWidth = 0.04 + t * 0.02;
          float ring = smoothstep(ringPos - ringWidth, ringPos, dist)
                     * smoothstep(ringPos + ringWidth, ringPos, dist);
          float fade = 1.0 - t;
          fade = fade * fade;
          float ripple = sin(dist * 40.0 - t * 20.0) * 0.5 + 0.5;
          float innerRipple = ripple * smoothstep(ringPos, ringPos - 0.1, dist) * 0.3;
          vec3 baseCol = vec3(${col.r.toFixed(4)}, ${col.g.toFixed(4)}, ${col.b.toFixed(4)});
          vec3 color = baseCol * (ring * intensity + innerRipple) * fade;
          color += vec3(1.0) * ring * fade * 0.5;
          float alpha = (ring + innerRipple * 0.5) * fade;
          gl_FragColor = vec4(color, alpha * ${(opts.opacity || 0.9).toFixed(4)});
        }
      `,
      opts,
    };
  },
};

// ─── Module factory ──────────────────────────────────────────────────────────

export function createBabylonTslApi(self) {
  // Track all preset materials so we can animate uTime
  const _animatedMaterials = [];

  // Register shaders in ShadersStore for each preset on-demand
  const _registeredShaders = new Set();

  function registerShaderIfNeeded(presetName, vertex, fragment) {
    if (_registeredShaders.has(presetName)) return;
    Effect.ShadersStore[`${presetName}VertexShader`] = vertex;
    Effect.ShadersStore[`${presetName}FragmentShader`] = fragment;
    _registeredShaders.add(presetName);
  }

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
      console.warn(`[Nova64 TSL Babylon] Unknown preset: "${preset}"`);
      // Return a basic material as fallback
      const fallback = new StandardMaterial(`tsl_fallback_${Date.now()}`, self.scene);
      fallback.diffuseColor = new Color3(1, 0, 1);
      return fallback;
    }

    const shaderDef = factory(options);
    const shaderName = `tsl_${preset}_${Date.now()}`;

    // Register the shader in Babylon's ShadersStore
    registerShaderIfNeeded(shaderName, shaderDef.vertex, shaderDef.fragment);

    const mat = new ShaderMaterial(
      shaderName,
      self.scene,
      {
        vertex: shaderName,
        fragment: shaderName,
      },
      {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'uTime'],
      }
    );

    mat.setFloat('uTime', 0);

    // Set transparency and double-sided rendering
    mat.alpha = shaderDef.opts.opacity ?? 0.9;
    mat.backFaceCulling = false;
    mat.alphaMode = Constants.ALPHA_COMBINE;

    // Apply compatibility methods
    applyBabylonMaterialCompatibility(mat);

    _animatedMaterials.push(mat);
    return mat;
  }

  /**
   * createTSLShaderMaterial(vertexShader, fragmentShader, uniforms, opts)
   * Creates a custom ShaderMaterial with supplied GLSL code.
   * Automatically adds uTime uniform and animates it.
   */
  function createTSLShaderMaterial(vertexShader, fragmentShader, uniforms = {}, opts = {}) {
    const shaderName = `tsl_custom_${Date.now()}`;

    // Use provided vertex shader or common vertex
    const vertex = vertexShader || COMMON_VERTEX;

    // Register shaders
    Effect.ShadersStore[`${shaderName}VertexShader`] = vertex;
    Effect.ShadersStore[`${shaderName}FragmentShader`] = fragmentShader;

    // Collect uniform names
    const uniformNames = ['worldViewProjection', 'uTime', ...Object.keys(uniforms)];

    const mat = new ShaderMaterial(
      shaderName,
      self.scene,
      {
        vertex: shaderName,
        fragment: shaderName,
      },
      {
        attributes: ['position', 'uv', 'normal'],
        uniforms: uniformNames,
      }
    );

    // Set initial uniform values
    mat.setFloat('uTime', 0);
    for (const [key, value] of Object.entries(uniforms)) {
      if (typeof value === 'number') {
        mat.setFloat(key, value);
      } else if (value instanceof Color3) {
        mat.setColor3(key, value);
      } else if (value instanceof Vector3) {
        mat.setVector3(key, value);
      } else if (value instanceof Vector2) {
        mat.setVector2(key, value);
      } else if (Array.isArray(value)) {
        if (value.length === 2) {
          mat.setVector2(key, new Vector2(value[0], value[1]));
        } else if (value.length === 3) {
          mat.setVector3(key, new Vector3(value[0], value[1], value[2]));
        }
      }
    }

    // Set transparency and double-sided rendering
    mat.alpha = opts.opacity ?? 1.0;
    mat.backFaceCulling = opts.backFaceCulling ?? false;
    mat.alphaMode = opts.transparent !== false ? Constants.ALPHA_COMBINE : Constants.ALPHA_DISABLE;

    applyBabylonMaterialCompatibility(mat);

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

  // Update uTime for all tracked materials — called in the game loop
  function _updateTSLMaterials(dt) {
    for (const mat of _animatedMaterials) {
      if (mat.isDisposed?.()) continue;
      try {
        const effect = mat.getEffect();
        if (effect && effect.isReady()) {
          const currentTime = mat._uTime ?? 0;
          mat._uTime = currentTime + dt;
          mat.setFloat('uTime', mat._uTime);
        }
      } catch (e) {
        // Material may be disposed or not ready
      }
    }
  }

  // Cleanup disposed materials from the tracking array
  function _cleanupTSLMaterials() {
    for (let i = _animatedMaterials.length - 1; i >= 0; i--) {
      if (_animatedMaterials[i].isDisposed?.()) {
        _animatedMaterials.splice(i, 1);
      }
    }
  }

  // ─── TSL building blocks (stubs for Babylon - not applicable) ──────────────
  // Babylon.js doesn't have TSL (Three Shading Language), so these are no-ops
  // that warn when used. Cart developers should use createTSLMaterial presets
  // or createTSLShaderMaterial with GLSL.
  const tslStub = name => () => {
    console.warn(
      `[Nova64 TSL Babylon] ${name} is not available in Babylon.js backend. Use createTSLMaterial presets or createTSLShaderMaterial with GLSL.`
    );
    return null;
  };

  return {
    // Preset material factory
    createTSLMaterial,
    createTSLShaderMaterial,
    _updateTSLMaterials,
    _cleanupTSLMaterials,

    // Convenience factories (Phase 1 Shader Pack)
    createLavaMaterial,
    createVortexMaterial,
    createPlasmaMaterial,
    createWaterMaterial,
    createHologramMaterial,
    createShockwaveMaterial,

    // TSL node functions — stubs for Babylon (not supported)
    // These exist for API parity but warn when used
    tslFn: tslStub('tslFn'),
    tslUniform: tslStub('tslUniform'),
    tslFloat: tslStub('tslFloat'),
    tslInt: tslStub('tslInt'),
    tslVec2: tslStub('tslVec2'),
    tslVec3: tslStub('tslVec3'),
    tslVec4: tslStub('tslVec4'),
    tslColor: tslStub('tslColor'),
    tslSin: tslStub('tslSin'),
    tslCos: tslStub('tslCos'),
    tslMix: tslStub('tslMix'),
    tslStep: tslStub('tslStep'),
    tslSmoothstep: tslStub('tslSmoothstep'),
    tslClamp: tslStub('tslClamp'),
    tslFract: tslStub('tslFract'),
    tslFloor: tslStub('tslFloor'),
    tslCeil: tslStub('tslCeil'),
    tslAbs: tslStub('tslAbs'),
    tslPow: tslStub('tslPow'),
    tslSqrt: tslStub('tslSqrt'),
    tslMin: tslStub('tslMin'),
    tslMax: tslStub('tslMax'),
    tslDot: tslStub('tslDot'),
    tslCross: tslStub('tslCross'),
    tslNormalize: tslStub('tslNormalize'),
    tslLength: tslStub('tslLength'),
    tslDistance: tslStub('tslDistance'),
    tslReflect: tslStub('tslReflect'),
    tslHash: tslStub('tslHash'),
    tslUv: tslStub('tslUv'),
    tslTime: tslStub('tslTime'),
    tslPositionLocal: tslStub('tslPositionLocal'),
    tslPositionWorld: tslStub('tslPositionWorld'),
    tslNormalLocal: tslStub('tslNormalLocal'),
    tslNormalWorld: tslStub('tslNormalWorld'),
    tslNormalView: tslStub('tslNormalView'),
    tslLoop: tslStub('tslLoop'),
  };
}
