// Procedural sky shaders shared by the Three.js runtime (api-skybox.js) and the
// Babylon backend (backends/babylon/skybox.js), so both engines draw the same sky.
// Written in GLSL ES 1.0 style; Babylon converts it for WebGL2 automatically.

export const DOME_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

// 3D value noise / fBm sampled on the view direction: seamless, no pole pinch.
export const NOISE_GLSL = /* glsl */ `
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
                   mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                   mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise3(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; }
    return v;
  }
  float tinyStars(vec3 d, float freq, float density, float t) {
    vec3 p = d * freq;
    vec3 c = floor(p);
    float h = hash3(c);
    if (h < 1.0 - density) return 0.0;
    vec3 o = vec3(hash3(c + 11.1), hash3(c + 23.7), hash3(c + 37.3)) * 0.6 + 0.2;
    float r = length(fract(p) - o);
    float tw = 0.65 + 0.35 * sin(t * (1.0 + h * 4.0) + h * 80.0);
    return smoothstep(0.16, 0.0, r) * tw * (0.4 + 0.6 * fract(h * 97.0));
  }
  // Occasional shooting star streaking across the upper sky.
  float meteors(vec3 d, float t, float seed) {
    float period = 2.6;
    float cyc = floor(t / period + seed);
    float lt = fract(t / period + seed);
    if (lt > 0.22) return 0.0;
    vec3 r = vec3(hash3(vec3(cyc, 1.0, seed)), hash3(vec3(cyc, 7.0, seed)), hash3(vec3(cyc, 13.0, seed)));
    vec3 start = normalize(vec3(r.x * 2.0 - 1.0, 0.35 + r.y * 0.5, r.z * 2.0 - 1.0));
    vec3 dir = normalize(cross(start, vec3(0.0, 1.0, 0.0)) * (r.y > 0.5 ? 1.0 : -1.0) + vec3(0.0, -0.45, 0.0));
    float k = lt / 0.22;
    vec3 head = start + dir * k * 0.55;
    vec3 tail = head - dir * 0.16;
    vec3 ba = head - tail;
    float hh = clamp(dot(d - tail, ba) / dot(ba, ba), 0.0, 1.0);
    float dist = length(d - tail - ba * hh);
    return (1.0 - smoothstep(0.0, 0.0025, dist)) * hh * hh * sin(k * 3.14159);
  }
  float dither() {
    return (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  }
`;

export const SPACE_FRAG = /* glsl */ `
  uniform vec3 uNebA; uniform vec3 uNebB; uniform vec3 uNebC;
  uniform float uNebula; uniform float uMilky; uniform float uSeed; uniform float uTime;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 s = vec3(uSeed, uSeed * 0.37, uSeed * 1.71);
    // Deep space base: near-black with a faint cool lift.
    vec3 col = mix(vec3(0.004, 0.005, 0.014), vec3(0.012, 0.014, 0.035), d.y * 0.5 + 0.5);

    // Galactic band.
    vec3 bandN = normalize(vec3(0.3, 1.0, 0.45));
    float bd = dot(d, bandN);
    float band = exp(-bd * bd * 14.0) * uMilky;
    float core = exp(-bd * bd * 60.0) * uMilky;

    // Domain-warped nebula clouds.
    float n1 = fbm(d * 1.8 + s);
    float n2 = fbm(d * 3.6 + s.zxy + n1 * 2.2);
    float n3 = fbm(d * 7.5 - s + n2 * 1.3);
    float cloud = smoothstep(0.42, 0.85, n2) * (0.25 + 0.75 * smoothstep(0.35, 0.7, n1));
    cloud *= (0.45 + band * 0.9);
    vec3 neb = mix(uNebA, uNebB, smoothstep(0.35, 0.75, n1));
    neb = mix(neb, uNebC, smoothstep(0.55, 0.85, n3) * 0.55);
    float glow = pow(cloud, 1.6);
    col += neb * glow * 1.5 * uNebula;
    col += neb * smoothstep(0.65, 0.95, n3) * cloud * 1.1 * uNebula; // bright filaments

    // Milky-way haze with dark dust lanes.
    float haze = band * (0.35 + 0.65 * n1);
    col += vec3(0.42, 0.45, 0.62) * haze * 0.16 + vec3(0.9, 0.78, 0.6) * core * n2 * 0.18;
    float dust = smoothstep(0.48, 0.7, fbm(d * 11.0 + s.yzx));
    col *= 1.0 - band * dust * 0.7;

    // Thousands of tiny background stars, denser in the band.
    float st = tinyStars(d, 260.0, 0.06 + band * 0.12, uTime)
             + tinyStars(d, 520.0, 0.05 + band * 0.18, uTime * 1.3) * 0.6;
    col += vec3(0.85, 0.9, 1.0) * st * (1.0 - dust * band * 0.8);
    col += vec3(1.0, 0.9, 0.75) * meteors(d, uTime, uSeed) * 2.0;

    gl_FragColor = vec4(col + dither(), 1.0);
  }`;

export const GRADIENT_FRAG = /* glsl */ `
  uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uHorizon;
  uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunSize;
  uniform float uClouds; uniform float uStars; uniform float uSeed; uniform float uTime;
  uniform float uToon; uniform float uBands; uniform float uCloudScale; uniform float uCloudLow;
  uniform float uRays; uniform float uRainbow; uniform float uOcean; uniform vec3 uDeep;
  uniform float uWaves; uniform float uWind;
  uniform float uOutline; uniform vec3 uInk; uniform float uSkyBands;
  uniform float uAurora; uniform vec3 uAuroraA; uniform vec3 uAuroraB; uniform float uMeteors;
  varying vec3 vDir;

  vec3 hue(float t) {
    return clamp(abs(mod(t * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  }

  // Sky without clouds; reused for ocean reflections.
  vec3 skyCol(vec3 d) {
    float h = d.y;
    // Cel-shaded sky: snap the gradient into flat bands.
    if (uSkyBands > 0.0 && h > 0.0) h = floor(h * uSkyBands + 0.5) / uSkyBands;
    vec3 col;
    if (h >= 0.0) {
      col = mix(uHorizon, uBottom, smoothstep(0.0, 0.12, h));
      col = mix(col, uTop, pow(smoothstep(0.0, 1.0, h), 0.55));
    } else {
      col = mix(uHorizon, uBottom * 0.45, smoothstep(0.0, 0.35, -h));
    }
    col += uHorizon * exp(-abs(h) * 18.0) * 0.35;
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    if (uSunSize > 0.0) {
      float disk = smoothstep(1.0 - 0.0009 * uSunSize, 1.0 - 0.0005 * uSunSize, sd);
      vec3 real = uSunColor * (disk * 4.0 + pow(sd, 400.0 / uSunSize) * 1.2 + pow(sd, 18.0) * 0.35);
      // Cartoon sun: flat disk, ink rim, a halo ring and a soft flat glow band.
      float r = 1.0 - sd;
      float R = 0.0016 * uSunSize;
      float tdisk = step(r, R);
      float rim = step(r, R * 1.18) - tdisk;
      float ring = step(r, R * 2.6) - step(r, R * 2.2);
      float glowB = step(r, R * 5.0) - step(r, R * 2.6);
      vec3 toon = uSunColor * 1.15 * tdisk;
      toon += uSunColor * (ring * 0.45 + glowB * 0.12);
      vec3 sunAdd = mix(real, toon, uToon);
      col = mix(col, uInk, rim * uOutline * uToon);
      col += sunAdd;
      col = mix(col, col + uSunColor * 0.25, pow(sd, 4.0) * (1.0 - smoothstep(0.0, 0.6, d.y)) * (1.0 - uToon * 0.7));
    }
    return col;
  }

  float cloudField(vec2 uv, vec2 drift) {
    float w = fbm(vec3(uv * 0.55 + drift * 0.5, uSeed + 3.0));
    // Billowy noise: rounder, puffier shapes when toon is on.
    float base = fbm(vec3(uv * 1.15 + drift + w * 0.9, uSeed));
    float puff = 1.0 - abs(fbm(vec3(uv * 2.3 + drift * 1.4, uSeed + 7.0)) * 2.0 - 1.0);
    return mix(base, base * 0.75 + puff * 0.3, uToon);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 sdir = normalize(uSunDir);
    float sd = max(dot(d, sdir), 0.0);
    vec3 col = skyCol(d);

    // Crepuscular rays fanning out from the sun.
    if (uRays > 0.0 && uSunSize > 0.0) {
      vec3 tx = normalize(cross(sdir, vec3(0.001, 1.0, 0.0)));
      vec3 ty = cross(tx, sdir);
      vec2 a = normalize(vec2(dot(d, tx), dot(d, ty)) + 1e-5);
      float ray = noise3(vec3(a * 5.0, uTime * 0.08 + uSeed));
      ray = smoothstep(0.45, 0.85, ray) * pow(sd, 3.0) * smoothstep(-0.05, 0.1, h);
      col += uSunColor * ray * uRays * 0.55;
    }

    // Rainbow at ~42 degrees from the anti-solar point.
    if (uRainbow > 0.0 && h > 0.0) {
      float ang = acos(clamp(dot(d, -sdir), -1.0, 1.0));
      float t = (ang - 0.68) / 0.06;
      float m = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.85, t);
      col += hue(1.0 - clamp(t, 0.0, 1.0)) * 0.8 * m * uRainbow * smoothstep(0.0, 0.25, h);
    }

    // Night stars fade in when the zenith is dark.
    if (uStars > 0.0 && h > 0.0) {
      float st = tinyStars(d, 240.0, 0.05, uTime) + tinyStars(d, 480.0, 0.06, uTime * 1.2) * 0.5;
      col += vec3(0.9, 0.93, 1.0) * st * uStars * smoothstep(0.02, 0.3, h);
    }

    // Aurora curtains rippling overhead.
    if (uAurora > 0.0 && h > 0.0) {
      vec2 uv = d.xz / (h + 0.35);
      float fadeH = smoothstep(0.04, 0.25, h) * (1.0 - smoothstep(0.75, 1.0, h));
      for (int i = 0; i < 2; i++) {
        float fi = float(i);
        float wave = sin(uv.x * (1.1 + fi * 0.4) + uTime * (0.22 + fi * 0.07) + noise3(vec3(uv * 0.7, uTime * 0.05 + fi * 9.0)) * 4.0);
        float y = uv.y - (0.55 * wave + 0.3 - fi * 1.1);
        float curtain = exp(-y * y * 5.0) * (0.6 + 0.4 * smoothstep(-0.6, 0.0, y));
        float streak = 0.45 + 0.55 * noise3(vec3(uv.x * 16.0 + fi * 3.0, uTime * 0.7, fi));
        vec3 ac = mix(uAuroraA, uAuroraB, clamp(-y * 0.8 + 0.5 + fi * 0.3, 0.0, 1.0));
        col += ac * curtain * streak * fadeH * uAurora * 1.1;
      }
    }

    if (uMeteors > 0.0 && h > 0.0) {
      col += vec3(1.0, 0.95, 0.85) * meteors(d, uTime, uSeed) * uMeteors * 2.2;
      col += vec3(0.8, 0.9, 1.0) * meteors(d, uTime + 1.3, uSeed + 0.5) * uMeteors * 1.6;
    }

    // Cloud layer projected onto a flat ceiling, self-shadowed toward the sun.
    if (uClouds > 0.0 && h > 0.0) {
      vec2 uv = d.xz / (h + 0.1) * uCloudScale;
      vec2 drift = vec2(uTime * 0.012, uTime * 0.004) * uWind;
      float c = cloudField(uv, drift);
      vec2 toSun = normalize(sdir.xz + 1e-4) * 0.12;
      float c2 = cloudField(uv + toSun, drift);
      float cover = mix(0.48, 0.44, uToon) - uClouds * 0.06;
      float soft = mix(0.32, 0.03, uToon);
      float m = smoothstep(cover, cover + soft, c);
      float heightMask = mix(smoothstep(0.0, 0.2, h), smoothstep(0.0, 0.05, h) * (1.0 - smoothstep(0.15, 0.55, h)), uCloudLow);
      m *= heightMask * min(uClouds * 1.6, 1.0);
      float lightAmt = clamp(0.55 + (c - c2) * 5.0, 0.0, 1.0);
      float banded = floor(lightAmt * uBands + 0.5) / uBands;
      lightAmt = mix(lightAmt, banded, uToon);
      vec3 lit = mix(uHorizon, vec3(1.0), 0.55 + 0.3 * uToon) + uSunColor * pow(sd, 6.0) * uSunSize * 0.6;
      vec3 shade = mix(mix(uTop, uBottom, 0.5) * 0.8, mix(uTop, vec3(1.0), 0.45), uToon * 0.6);
      vec3 cc = mix(shade, lit, lightAmt);
      // Silver lining on cloud edges facing the sun.
      cc += uSunColor * (m * (1.0 - m) * 3.0) * (0.25 + pow(sd, 3.0)) * 0.5;
      col = mix(col, cc, m * 0.92);
      if (uOutline > 0.0) {
        float ink = 1.0 - smoothstep(0.0, 0.006 + 0.01 * h, abs(c - cover - soft * 0.5));
        col = mix(col, uInk, ink * uOutline * heightMask * min(uClouds * 1.6, 1.0));
      }
    }

    // Open ocean below the horizon: waves, fresnel sky reflection, sun glitter.
    if (uOcean > 0.0 && h < 0.0) {
      float t = -h;
      vec2 uv = d.xz / (t + 0.015) * 0.6;
      vec2 q = uv + vec2(uTime * 0.25, uTime * 0.11);
      float e = 0.08;
      float n0 = fbm(vec3(q, uSeed)) + fbm(vec3(q * 2.7 - uTime * 0.2, uSeed + 5.0)) * 0.4;
      float nx = fbm(vec3(q + vec2(e, 0.0), uSeed)) + fbm(vec3((q + vec2(e, 0.0)) * 2.7 - uTime * 0.2, uSeed + 5.0)) * 0.4;
      float nz = fbm(vec3(q + vec2(0.0, e), uSeed)) + fbm(vec3((q + vec2(0.0, e)) * 2.7 - uTime * 0.2, uSeed + 5.0)) * 0.4;
      float fade = smoothstep(0.0, 0.25, t);
      vec3 nrm = normalize(vec3((n0 - nx) * uWaves * fade, 1.0, (n0 - nz) * uWaves * fade));
      vec3 r = reflect(d, nrm);
      r.y = abs(r.y);
      float fres = 0.03 + 0.97 * pow(1.0 - max(dot(-d, nrm), 0.0), 5.0);
      vec3 deep = uDeep * (0.6 + 0.6 * smoothstep(0.35, 0.75, n0));
      vec3 water = mix(deep, skyCol(r), fres);
      float glint = pow(max(dot(r, sdir), 0.0), 220.0);
      water += uSunColor * glint * 5.0 * step(0.001, uSunSize);
      water += vec3(0.9) * smoothstep(0.72, 0.9, n0) * 0.25 * fade; // whitecaps
      col = mix(col, water, uOcean * smoothstep(0.0, 0.004, t));
      col = mix(col, uHorizon, exp(-t * 60.0) * 0.6); // haze at the horizon line
    }
    // Soft highlight roll-off: day skies stay vivid without drowning in bloom.
    vec3 over = max(col - 0.85, 0.0);
    col = min(col, vec3(0.85)) + over / (1.0 + over * 4.0);
    gl_FragColor = vec4(col + dither(), 1.0);
  }`;

export const STAR_VERT = /* glsl */ `
  attribute float aSize; attribute float aPhase;
  uniform float uSize; uniform float uScale; uniform float uTime;
  varying vec3 vColor; varying float vTw; varying float vBig;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(uSize * aSize * (uScale / -mv.z), 1.5, 48.0);
    vTw = 0.7 + 0.3 * sin(uTime * (0.8 + aPhase * 3.0) + aPhase * 50.0);
    vColor = color;
    vBig = smoothstep(1.8, 4.5, aSize);
    gl_Position = projectionMatrix * mv;
  }`;

export const STAR_FRAG = /* glsl */ `
  varying vec3 vColor; varying float vTw; varying float vBig;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c) * 2.0;
    float core = exp(-r * r * 18.0);
    float halo = exp(-r * 4.5) * 0.35;
    float spikes = (exp(-abs(c.x) * 60.0) + exp(-abs(c.y) * 60.0)) * (1.0 - r) * vBig * 0.7;
    float a = (core * 1.6 + halo + max(spikes, 0.0)) * vTw * (1.0 - smoothstep(0.85, 1.0, r));
    gl_FragColor = vec4(vColor * a, a);
  }`;
