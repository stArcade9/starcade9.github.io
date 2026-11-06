// PBR SHOWCASE — physically based materials lit by the skybox
//
// Every scene uses createEnvironmentSkybox(): the sky you see is also the
// reflection/refraction map, so metals mirror it and glass bends it.
//
//  [1] Material Matrix — metalness × roughness, 5 × 5
//  [2] Metals          — gold, chrome, copper… around brushed titanium
//  [3] Glass & Gems    — refraction (ior), dispersion, coloured absorption
//  [4] Coatings        — clearcoat car paint, iridescence, velvet sheen
//  [5] Neon & Mirror   — emissive light on a mirror floor
//  [6] Showroom        — hero pieces on a turntable
//  [7] POV-Ray 1995    — checkerboard, chrome & glass, traced line by line
//
// Skies: real CC0 HDR panoramas from Poly Haven (public/assets/sky/hdr/) via
// createHDRSkybox(), plus the procedural createEnvironmentSkybox('neon').
//
// Controls: 1-7 / Tab = scene · WASD / arrows = orbit · Q E = zoom · P = pause
// orbit · R = re-trace (POV-Ray) · Space / Enter (touch A) = next scene

const { print, rectfill, rgba8 } = nova64.draw;
const HDR = (name) => `/assets/sky/hdr/${name}_1k.hdr`;
const { clearScene, createCapsule, createCone, createCube, createCylinder, createPlane, createSphere, createTorus, rotateMesh, setPBRProperties, setPosition, setRotation } = nova64.scene;
const { createEnvironmentSkybox, createGradientSkybox, createHDRSkybox, createPointLight, setAmbientLight, clearFog, setLightColor, setLightDirection, setPointLightPosition } = nova64.light;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { disableBloom, disableFXAA, disableVignette, enableBloom, enableFXAA, enableVignette, setToneMapping } = nova64.fx;
const { key, keyp } = nova64.input;

const SCENES = [
  { name: 'Material Matrix', sky: 'Studio Small 09', hdr: 'studio_small_09', skyIntensity: 0.45, note: 'left->right: metalness 0->1   top->bottom: roughness 0->1', dist: 15, height: 1.2, sway: 0.35 },
  { name: 'Metals', sky: 'Venice Sunset', hdr: 'venice_sunset', note: 'conductors tint their reflections; roughness blurs them', dist: 13, height: 3.2 },
  { name: 'Glass & Gems', sky: 'Neon Photostudio', hdr: 'neon_photostudio', skyIntensity: 0.8, note: 'transmission + ior bend the neon behind; dispersion splits it', dist: 11, height: 2.4 },
  { name: 'Coatings', sky: 'Kloppenheim sky', hdr: 'kloppenheim_06_puresky', skyIntensity: 0.5, note: 'clearcoat lacquer, thin-film iridescence, cloth sheen', dist: 12, height: 2.6 },
  { name: 'Neon & Mirror', sky: 'procedural neon', procedural: 'neon', skyIntensity: 0.3, note: 'emissive surfaces reflected in a near-perfect mirror', dist: 14, height: 3.5 },
  { name: 'Showroom', sky: 'Venice Sunset', hdr: 'venice_sunset', note: 'everything at once: chrome, glass, gold and paint', dist: 12, height: 3 },
  { name: 'POV-Ray 1995', sky: 'sky_sphere gradient', pov: true, note: 'plane { checker }  sphere { finish { reflection 0.8 } }  -- R to re-trace', dist: 13, height: 3.2 },
];

// POV-Ray mode: reveal the frame one scanline at a time like a 486 tracing it.
const POV_LINES = 240;
const POV_SECONDS = 9;
let povStart = 0; // wall-clock ms, so the trace takes POV_SECONDS on any GPU
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

let scene = 0;
let time = 0;
let orbit = 0;
let tilt = 0;
let zoom = 1;
let autoOrbit = true;
let spinners = []; // { id, axis: [x,y,z], speed }
let bobbers = []; // { id, x, y, z, amp, phase }
let legend = []; // { name, props }
let sweepLight = null;

// ── Helpers ──────────────────────────────────────────────────────────────────
function sphere(r, color, pos, props, segments = 64) {
  const id = createSphere(r, color, pos, segments);
  setPBRProperties(id, { color, ...props });
  return id;
}

function pedestal(x, z, h = 0.5, r = 0.9) {
  const id = createCylinder(r, r * 1.08, h, 0x1a1d24, [x, -3 + h / 2, z]);
  setPBRProperties(id, { metalness: 0.2, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 });
  return id;
}

function mirrorFloor(roughness = 0.12) {
  const id = createPlane(80, 80, 0x0b0d12, [0, -3, 0]);
  setRotation(id, -Math.PI / 2, 0, 0);
  setPBRProperties(id, { metalness: 0.9, roughness, envMapIntensity: 1.2 });
}

function note(name, props) {
  legend.push({ name, props });
}

// ── Scenes ───────────────────────────────────────────────────────────────────
function buildMatrix() {
  const S = 2.3;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      sphere(0.92, 0xe8c07a, [(col - 2) * S, (2 - row) * S + 1.2, 0], {
        metalness: col / 4,
        roughness: row / 4,
        envMapIntensity: 1.2,
      });
    }
  }
  note('Gold-tinted base', '');
  note('metalness', '0 -> 1 across');
  note('roughness', '0 -> 1 down');
}

function buildMetals() {
  mirrorFloor(0.2);
  const metals = [
    ['Gold', 0xffc94d, 0.12],
    ['Chrome', 0xf2f4f7, 0.02],
    ['Copper', 0xf08a5d, 0.18],
    ['Rose Gold', 0xf3b3a6, 0.1],
    ['Silver', 0xdcdfe4, 0.25],
    ['Brass', 0xd6b04a, 0.32],
    ['Cobalt', 0x5c7cff, 0.14],
    ['Gunmetal', 0x4a4e58, 0.4],
  ];
  metals.forEach(([name, color, roughness], i) => {
    const a = (i / metals.length) * Math.PI * 2;
    const x = Math.cos(a) * 5.4;
    const z = Math.sin(a) * 5.4;
    pedestal(x, z);
    const id = sphere(0.95, color, [x, -1.55, z], { metalness: 1, roughness, envMapIntensity: 1.3 });
    bobbers.push({ id, x, y: -1.55, z, amp: 0.12, phase: i });
    note(name, `rough ${roughness.toFixed(2)}`);
  });
  const ring = createTorus(1.7, 0.55, 0xb8bcc6, [0, 0.4, 0]);
  // (anisotropy needs per-vertex tangents the built-in torus doesn't have; it
  // produced NaNs that bloom spread across the whole frame.)
  setPBRProperties(ring, { metalness: 1, roughness: 0.22, clearcoat: 0.6, envMapIntensity: 1.4 });
  spinners.push({ id: ring, axis: [0.4, 0.9, 0.2], speed: 0.6 });
  note('Titanium ring', 'metal + clearcoat');
}

function buildGems() {
  mirrorFloor(0.08);
  // Neon bars behind the glass so the refraction has something to bend.
  [0x22e6ff, 0xff2bd6, 0xffd23f, 0x7cff4f, 0x6a5cff].forEach((c, i) => {
    const id = createCube(0.35, 7, 0.35, c, [(i - 2) * 1.6, 0.5, -4.5]);
    setPBRProperties(id, { color: c, emissive: c, emissiveIntensity: 2.5, roughness: 0.4 });
  });
  const gems = [
    ['Clear glass', 0xffffff, { transmission: 1, ior: 1.5, thickness: 1.6, roughness: 0.02 }, 64],
    ['Water', 0xd8f4ff, { transmission: 1, ior: 1.33, thickness: 2, roughness: 0.04, attenuationColor: 0x58b8ff, attenuationDistance: 3 }, 64],
    ['Diamond', 0xffffff, { transmission: 1, ior: 2.33, thickness: 1.2, roughness: 0, dispersion: 6 }, 7],
    ['Ruby', 0xffd0d6, { transmission: 1, ior: 1.77, thickness: 1.4, roughness: 0.02, attenuationColor: 0xff1f4b, attenuationDistance: 0.8, dispersion: 2 }, 9],
    ['Emerald', 0xd8ffe6, { transmission: 1, ior: 1.58, thickness: 1.4, roughness: 0.03, attenuationColor: 0x15d66b, attenuationDistance: 0.8, dispersion: 1.5 }, 10],
    ['Sapphire', 0xd8e4ff, { transmission: 1, ior: 1.77, thickness: 1.4, roughness: 0.02, attenuationColor: 0x2a5cff, attenuationDistance: 0.8, dispersion: 2 }, 8],
  ];
  gems.forEach(([name, color, props, segments], i) => {
    const x = (i - 2.5) * 2.1;
    pedestal(x, 0, 0.45, 0.75);
    const id = sphere(0.85, color, [x, -1.65, 0], { metalness: 0, envMapIntensity: 1.2, ...props }, segments);
    spinners.push({ id, axis: [0.15, 1, 0], speed: 0.5 + i * 0.05 });
    note(name, `ior ${props.ior}${props.dispersion ? ` disp ${props.dispersion}` : ''}`);
  });
}

function buildCoatings() {
  mirrorFloor(0.25);
  const items = [
    ['Candy paint', 0xb3001e, { metalness: 0.6, roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.03 }, 'clearcoat'],
    ['Pearl', 0xf4efe6, { metalness: 0, roughness: 0.3, iridescence: 1, iridescenceIOR: 1.6, sheen: 0.4, sheenColor: 0xffe0f0 }, 'iridescence+sheen'],
    ['Soap bubble', 0xffffff, { transmission: 1, ior: 1.1, thickness: 0.05, roughness: 0, iridescence: 1, iridescenceIOR: 1.33 }, 'thin film'],
    ['Velvet', 0x5b1a8c, { metalness: 0, roughness: 0.9, sheen: 1, sheenColor: 0xd28cff, sheenRoughness: 0.35 }, 'sheen'],
    ['Glazed ceramic', 0x2f8f9d, { metalness: 0, roughness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08 }, 'clearcoat'],
  ];
  items.forEach(([name, color, props, label], i) => {
    const x = (i - 2) * 2.6;
    pedestal(x, 0);
    const id = sphere(1, color, [x, -1.5, 0], { envMapIntensity: 1.2, ...props });
    bobbers.push({ id, x, y: -1.5, z: 0, amp: 0.1, phase: i * 1.3 });
    note(name, label);
  });
}

function buildNeon() {
  mirrorFloor(0.04);
  [
    [0x22e6ff, -4],
    [0xff2bd6, 0],
    [0xffd23f, 4],
  ].forEach(([c, x], i) => {
    const ring = createTorus(1.4, 0.16, c, [x, 0, 0]);
    setPBRProperties(ring, { color: c, emissive: c, emissiveIntensity: 1.6, roughness: 0.3 });
    spinners.push({ id: ring, axis: [0, 1, 0.3], speed: 0.4 + i * 0.2 });
    const cap = createCapsule(0.35, 1.6, c, [x, -2, 2.5]);
    setPBRProperties(cap, { color: c, emissive: c, emissiveIntensity: 1.1, roughness: 0.2 });
  });
  const ball = sphere(1.2, 0xf2f4f7, [0, -1.8, -3.5], { metalness: 1, roughness: 0.02 });
  bobbers.push({ id: ball, x: 0, y: -1.8, z: -3.5, amp: 0.25, phase: 0 });
  note('Neon rings', 'emissive 1.6');
  note('Mirror floor', 'rough 0.04');
  note('Chrome sphere', 'rough 0.02');
}

function buildShowroom() {
  mirrorFloor(0.15);
  const disc = createCylinder(5, 5.2, 0.4, 0x15171d, [0, -2.8, 0]);
  setPBRProperties(disc, { metalness: 0.5, roughness: 0.25, clearcoat: 1 });
  spinners.push({ id: disc, axis: [0, 1, 0], speed: 0.2 });

  const chrome = sphere(1.1, 0xf2f4f7, [-2.6, -1.4, 0], { metalness: 1, roughness: 0.03 });
  const glass = createTorus(1.1, 0.42, 0xffffff, [0, -0.9, -1.6]);
  setPBRProperties(glass, { transmission: 1, ior: 1.5, thickness: 1, roughness: 0.02, dispersion: 3 });
  const gold = createCapsule(0.6, 1.6, 0xffc94d, [2.6, -1.3, 0]);
  setPBRProperties(gold, { color: 0xffc94d, metalness: 1, roughness: 0.15 });
  const paint = createCone(0.9, 1.9, 0x0a3cff, [0, -1.5, 2]);
  setPBRProperties(paint, { color: 0x0a3cff, metalness: 0.5, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.04 });
  for (const id of [chrome, glass, gold, paint]) spinners.push({ id, axis: [0.2, 1, 0], speed: 0.35 });
  note('Chrome sphere', '');
  note('Glass torus', 'disp 3');
  note('Gold capsule', '');
  note('Paint cone', 'clearcoat');
}

function buildPovRay() {
  // The classic: an infinite checkerboard, a mirror ball, a glass ball and a
  // shiny red one under a blue sky_sphere.
  const N = 12;
  const T = 2.5;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const white = (i + j) % 2 === 0;
      const c = white ? 0xf2f2f2 : 0x101010;
      const id = createPlane(T, T, c, [(i - N / 2 + 0.5) * T, -3, (j - N / 2 + 0.5) * T]);
      setRotation(id, -Math.PI / 2, 0, 0);
      setPBRProperties(id, { color: c, metalness: 0, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0 });
    }
  }
  sphere(1.6, 0xffffff, [-2.4, -1.4, 0], { metalness: 1, roughness: 0 });
  sphere(1.2, 0xffffff, [1.6, -1.8, 1.4], { transmission: 1, ior: 1.5, thickness: 2, roughness: 0 });
  sphere(1, 0xd01010, [2.8, -2, -2.4], { metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0 });
  const t = createTorus(1, 0.3, 0xffcc33, [-0.4, -2.7, 3]);
  setRotation(t, Math.PI / 2, 0, 0);
  setPBRProperties(t, { color: 0xffcc33, metalness: 1, roughness: 0.15 });
  note('plane', 'checker White Black');
  note('sphere', 'reflection 0.8');
  note('sphere', 'ior 1.5 (glass)');
  note('sphere', 'phong 1 (red)');
  note('torus', 'metal gold');
  povStart = nowMs();
}

const BUILDERS = [buildMatrix, buildMetals, buildGems, buildCoatings, buildNeon, buildShowroom, buildPovRay];

function buildScene(idx) {
  scene = (idx + SCENES.length) % SCENES.length;
  clearScene();
  spinners = [];
  bobbers = [];
  legend = [];
  const s = SCENES[scene];
  applySky(s);
  applySceneLook(s);
  clearFog();
  setAmbientLight(0x202634, 0.35);
  setLightDirection(-0.5, -1, -0.4);
  setLightColor(0xffffff);
  sweepLight = createPointLight(0xffffff, 18, 30, 0, 4, 6);
  BUILDERS[scene]();
  orbit = scene === 0 ? 0 : 0.6;
  tilt = 0;
  zoom = 1;
}

// Skies. HDR photo skies and procedural environment skies are web-runtime
// features; hosts without them (e.g. the RetroArch core) get a gradient sky.
function applySky(s) {
  if (s.hdr && typeof createHDRSkybox === 'function') {
    const p = createHDRSkybox(HDR(s.hdr), { blur: scene === 0 ? 0.3 : 0.05, intensity: s.skyIntensity ?? 1 });
    p?.catch?.(() => createEnvironmentSkybox?.('studio'));
  } else if (typeof createEnvironmentSkybox === 'function') {
    if (s.pov) createEnvironmentSkybox('studio', { top: 0x1c48d8, horizon: 0xcfe4ff, bottom: 0x7f9fd6, intensity: 0.5 });
    else createEnvironmentSkybox(s.procedural || 'neon', { blur: 0.05, intensity: s.skyIntensity ?? 1 });
  } else {
    createGradientSkybox?.(s.pov ? 0x1c48d8 : 0x1a2a6b, s.pov ? 0xcfe4ff : 0xff8a3d);
  }
}

// Modern scenes: filmic tone mapping, bloom, FXAA. POV-Ray: none of that --
// hard aliased edges and plain linear output, like a 1995 TGA. (Pixelation
// would also blur the 2D status bar, so the retro look comes from no AA.)
function applySceneLook(s) {
  if (s.pov) {
    disableBloom();
    disableVignette();
    disableFXAA();
    setToneMapping?.('linear', 1);
  } else {
    setToneMapping?.('aces', 1.15);
    enableBloom(0.9, 0.5, 0.82);
    enableVignette(0.9, 0.85);
    enableFXAA();
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
export function init() {
  setCameraFOV(52);
  buildScene(0);
}

export function update(dt) {
  time += dt;
  for (let i = 0; i < SCENES.length; i++) {
    if (keyp(`Digit${i + 1}`)) buildScene(i);
  }
  if (keyp('Tab') || keyp('Space') || keyp('Enter')) buildScene(scene + 1);
  if (keyp('KeyP')) autoOrbit = !autoOrbit;
  if (keyp('KeyR') && SCENES[scene].pov) povStart = nowMs();

  const s = SCENES[scene];
  if (key('KeyA') || key('ArrowLeft')) orbit -= dt * 1.2;
  if (key('KeyD') || key('ArrowRight')) orbit += dt * 1.2;
  if (key('KeyW') || key('ArrowUp')) tilt = Math.min(1, tilt + dt);
  if (key('KeyS') || key('ArrowDown')) tilt = Math.max(-0.6, tilt - dt);
  if (key('KeyQ')) zoom = Math.max(0.55, zoom - dt * 0.6);
  if (key('KeyE')) zoom = Math.min(1.6, zoom + dt * 0.6);
  // The matrix sways gently so it stays readable; the other sets orbit slowly.
  // POV-Ray holds still: you don't move the camera mid-trace.
  if (autoOrbit && !s.sway && !s.pov) orbit += dt * 0.12;

  const yaw = s.sway && autoOrbit ? orbit + Math.sin(time * 0.35) * s.sway : orbit;
  const dist = s.dist * zoom;
  setCameraPosition(Math.sin(yaw) * dist, s.height + tilt * 4, Math.cos(yaw) * dist);
  setCameraTarget(0, scene === 0 ? 1.2 : -1, 0);

  for (const sp of spinners) {
    rotateMesh(sp.id, sp.axis[0] * sp.speed * dt, sp.axis[1] * sp.speed * dt, sp.axis[2] * sp.speed * dt);
  }
  for (const b of bobbers) setPosition(b.id, b.x, b.y + Math.sin(time * 1.4 + b.phase) * b.amp, b.z);
  // A light that sweeps around the set so highlights glide across surfaces.
  if (sweepLight) setPointLightPosition(sweepLight, Math.cos(time * 0.6) * 8, 5, Math.sin(time * 0.6) * 8);
}

function drawPovRay() {
  const elapsed = (nowMs() - povStart) / 1000;
  const line = Math.min(POV_LINES, Math.floor((elapsed / POV_SECONDS) * POV_LINES));
  const y = Math.floor((line / POV_LINES) * 330);
  // Not traced yet: black, like the VGA screen before the scanline reaches it.
  if (y < 330) rectfill(0, y, 640, 330 - y, rgba8(0, 0, 0, 255));
  if (line < POV_LINES) rectfill(0, Math.max(0, y - 1), 640, 2, rgba8(255, 255, 255, 140));
  // DOS status bar
  rectfill(0, 330, 640, 30, rgba8(0, 0, 170, 255));
  print('POV-Ray for DOS 2.2   pbr.pov  320x240  +A0.3 +Q9', 8, 334, rgba8(255, 255, 85, 255));
  if (line < POV_LINES) {
    print(`Rendering line ${line + 1} of ${POV_LINES}...`, 8, 347, rgba8(255, 255, 255, 255));
    rectfill(300, 348, 200, 7, rgba8(0, 0, 90, 255));
    rectfill(300, 348, Math.floor((line / POV_LINES) * 200), 7, rgba8(85, 255, 255, 255));
  } else {
    const secs = POV_SECONDS * 37.2; // what it took on a 486DX2/66
    print(`Done. Total time ${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s   76800 pixels   R = re-trace`, 8, 347, rgba8(85, 255, 85, 255));
  }
}

export function draw() {
  if (SCENES[scene].pov) {
    drawPovRay();
    print('7 POV-Ray 1995   1-6 modern scenes   Tab next', 8, 6, rgba8(170, 170, 170, 255));
    return;
  }
  // Scene tabs
  rectfill(0, 0, 640, 18, rgba8(6, 8, 14, 190));
  let x = 6;
  SCENES.forEach((sc, i) => {
    const label = `${i + 1} ${sc.name}`;
    const w = label.length * 6 + 6;
    if (i === scene) rectfill(x - 3, 2, w, 14, rgba8(120, 90, 255, 200));
    print(label, x, 6, i === scene ? rgba8(255, 255, 255, 255) : rgba8(150, 160, 190, 255));
    x += w + 2;
  });

  // Caption
  const s = SCENES[scene];
  rectfill(0, 330, 640, 30, rgba8(6, 8, 14, 170));
  print(`${s.name.toUpperCase()}  skybox: ${s.sky}`, 8, 335, rgba8(255, 214, 120, 255));
  print(s.note, 8, 347, rgba8(190, 200, 225, 255));

  // Material legend
  const lh = 11;
  const top = 26;
  rectfill(458, top - 4, 180, legend.length * lh + 8, rgba8(6, 8, 14, 150));
  legend.forEach((l, i) => {
    print(l.name, 464, top + i * lh, rgba8(235, 240, 255, 255));
    if (l.props) print(l.props, 556, top + i * lh, rgba8(140, 150, 185, 255));
  });

  print('1-7/Tab scene  WASD orbit  QE zoom  P pause', 8, 22, rgba8(110, 120, 150, 255));
}
