// Hello World — Nova64 showcase
// Orbiting geometry in a star field with post-processing. Z · Space = next preset.

const { printCentered, rgba8 } = nova64.draw;
const {
  createCube,
  createSphere,
  createTorus,
  rotateMesh,
  setPosition,
  setScale,
  removeMesh,
  setMeshEmissive,
} = nova64.scene;
const { setCameraPosition, setCameraTarget, setCameraFOV } = nova64.camera;
const {
  setAmbientLight,
  setLightDirection,
  setFog,
  clearSkybox,
  createSpaceSkybox,
  enableSkyboxAutoAnimate,
} = nova64.light;
const { enableBloom, enableChromaticAberration, enableVignette } = nova64.fx;
const { btnp, keyp } = nova64.input;

const PRESETS = [
  {
    nebula: 0x2244ff,
    core: rgba8(0, 170, 255, 255),
    ring: rgba8(80, 60, 220, 255),
    orb: rgba8(255, 220, 80, 255),
    fog: rgba8(0, 2, 18, 255),
    name: 'COSMIC BLUE',
  },
  {
    nebula: 0xff2244,
    core: rgba8(255, 80, 40, 255),
    ring: rgba8(220, 60, 120, 255),
    orb: rgba8(255, 200, 40, 255),
    fog: rgba8(12, 2, 6, 255),
    name: 'NEBULA RED',
  },
  {
    nebula: 0x44ff88,
    core: rgba8(40, 220, 120, 255),
    ring: rgba8(60, 180, 80, 255),
    orb: rgba8(200, 255, 120, 255),
    fog: rgba8(0, 8, 4, 255),
    name: 'AURORA GREEN',
  },
];

let preset = 0,
  t = 0;
let core,
  ring1,
  ring2,
  orbs = [];
const ORB_COUNT = 6;
const ORBIT_R = 2.8;

function buildScene() {
  clearSkybox();
  if (core) {
    removeMesh(core);
    removeMesh(ring1);
    removeMesh(ring2);
  }
  for (const o of orbs) removeMesh(o);
  orbs = [];

  const P = PRESETS[preset];
  createSpaceSkybox({ starCount: 1200, nebulae: true, nebulaColor: P.nebula });
  enableSkyboxAutoAnimate(0.4);
  setFog(P.fog, 25, 90);

  core = createCube(1.1, P.core, [0, 0, 0]);
  setMeshEmissive(core, P.core, 1.4);

  ring1 = createTorus(2.0, 0.09, P.ring, [0, 0, 0]);
  setMeshEmissive(ring1, P.ring, 1.8);

  ring2 = createTorus(2.8, 0.07, rgba8(180, 140, 255, 255), [0, 0, 0]);
  setMeshEmissive(ring2, rgba8(180, 140, 255, 255), 1.4);

  for (let i = 0; i < ORB_COUNT; i++) {
    const a = (i / ORB_COUNT) * Math.PI * 2;
    const orb = createSphere(0.22, P.orb, [Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R]);
    setMeshEmissive(orb, P.orb, 2.0);
    orbs.push(orb);
  }
}

export function init() {
  preset = 0;
  t = 0;
  setCameraFOV(60);
  setAmbientLight(0x112233, 0.4);
  setLightDirection(-0.5, -1, -0.3);
  enableBloom(2.2);
  enableChromaticAberration(0.003);
  enableVignette(0.15, 0.82);
  buildScene();
}

export function update(dt) {
  t += dt;
  if (btnp('z') || btnp('x') || keyp('Space')) {
    preset = (preset + 1) % PRESETS.length;
    buildScene();
  }
  rotateMesh(core, dt * 0.7, dt * 1.1, dt * 0.4);
  rotateMesh(ring1, dt * 0.5, 0, dt * 0.6);
  rotateMesh(ring2, 0, dt * 0.7, dt * 0.3);
  for (let i = 0; i < ORB_COUNT; i++) {
    const a = (i / ORB_COUNT) * Math.PI * 2 + t * 0.8;
    const bob = Math.sin(t * 1.4 + i) * 0.45;
    const s = 0.22 + Math.sin(t * 2.2 + i) * 0.06;
    setPosition(orbs[i], Math.cos(a) * ORBIT_R, bob, Math.sin(a) * ORBIT_R);
    setScale(orbs[i], s, s, s);
  }
  const ca = t * 0.18,
    cy = 3.5 + Math.sin(t * 0.25) * 1.5;
  setCameraPosition(Math.cos(ca) * 8, cy, Math.sin(ca) * 8);
  setCameraTarget(0, 0, 0);
}

export function draw() {
  printCentered('Hello, Nova64!', 16, rgba8(255, 255, 255, 230));
  printCentered(PRESETS[preset].name, 336, rgba8(200, 220, 255, 200));
  printCentered('Z \xB7 SPACE — next preset', 350, rgba8(140, 160, 220, 160));
}
