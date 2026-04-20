// examples/hype-demo/code.js
// Nova64 HYPE Framework Showcase
// Demonstrates: Oscillators, Tweens, Color Pools, Layouts, Triggers, Swarm
//
// ─── Scene ────────────────────────────────────────────────────────────────────
//  Section 0  (0-10s)   — Circle Layout + Oscillators (vertical bounce)
//  Section 1  (10-25s)  — Grid Layout + Scale Oscillators (mixed waveforms)
//  Section 2  (25-45s)  — Camera Tween (easeInOutCubic, pingpong)
//  Section 3  (45-60s)  — Proximity Trigger (two spheres, onEnter/onExit)
//  Section 4  (60-80s)  — HSwarm Flock (Reynolds steering, 30 agents)
//  Section 5  (80-95s)  — Path Layout + Tween Rider (bezier path traverse)
//  Section 6  (95-110s) — Sphere Layout + ColorPool shuffle (Fibonacci sphere)
//  Section 7  (110-125s)— HPool dynamic request/release + RandomTrigger
//  Section 8  (125-140s)— Lissajous Trail (3 oscillators, coprime freqs)
//  Section 9  (140-155s)— TimeTrigger Cascade (domino ripple of scale tweens)
//  Section 10 (155-175s)— Sawtooth Traveling Wave (20 cubes, saw OSC)
//  Loops back at 175s

const DEMO_DURATION = 175;
const SECTION_STARTS = [0, 10, 25, 45, 60, 80, 95, 110, 125, 140, 155];
const SECTION_ENDS = [10, 25, 45, 60, 80, 95, 110, 125, 140, 155, DEMO_DURATION];

// ─── Shared state ─────────────────────────────────────────────────────────────
let time = 0;
let section = 0;

// Section 1 — circle layout + color pool
let s1Cubes = [];
let s1Pool;
let s1Oscillators = [];

// Section 2 — grid layout + oscillators
let s2Cubes = [];
let s2Oscillators = [];

// Section 3 — camera tween
let s3Tween;

// Section 4 — proximity trigger
let s4SphereA, s4SphereB;
let s4Proximity;
let s4InsideColor, s4OutsideColor;
let s4APos = { x: -6, y: 0, z: -8 };
let s4BPos = { x: 6, y: 0, z: -8 };
let s4AOsc, s4BOsc;
let s4Highlight = false;

// Section 5 — swarm
let s5Swarm;
let s5Meshes = [];
let s5GoalTimer;

// Section 6 — path layout + tween rider
let s6PathMeshes = [];
let s6RiderMesh;
let s6PathLayout;
let s6RiderTween;
let s6RiderPos = { x: 0, y: 0, z: 0 };

// Section 7 — sphere layout + color pool
let s7Meshes = [];
let s7ColorPool;
let s7SwapTimer;
let s7RotOsc;

// Section 8 — HPool dynamic objects
let s8Pool;
let s8RandomTrigger;
let s8ReleaseTrigger;
let s8Active = []; // pool objects + their tweens

// Section 9 — Lissajous trail
const LISS_TRAIL = 48;
let s9TrailMeshes = [];
let s9OscX, s9OscY, s9OscZ, s9OscScale;
let s9History = [];

// Section 10 — TimeTrigger cascade
const CASCADE_COUNT = 10;
let s10Cubes = [];
let s10Tweens = [];
let s10CascadeTimer;
let s10Index = 0;

// Section 11 — Sawtooth traveling wave
const WAVE_COUNT = 20;
let s11Cubes = [];
let s11Oscillators = [];
let s11ColorPool;

// ─── Palette ──────────────────────────────────────────────────────────────────
let palette;

export function init() {
  // ── Palette ──────────────────────────────────────────────────────────────
  palette = createColorPool(
    [
      rgba8(255, 60, 120),
      rgba8(60, 200, 255),
      rgba8(255, 200, 60),
      rgba8(120, 255, 120),
      rgba8(200, 80, 255),
      rgba8(255, 140, 60),
      rgba8(60, 255, 220),
      rgba8(255, 255, 60),
    ],
    'sequential'
  );

  // ── Section 1 — Circle Layout + ColorPool ────────────────────────────────
  const circLayout = createCircleLayout({ count: 12, radius: 5, plane: 'xz', cy: 0 });
  circLayout.each(({ x, y, z }, i) => {
    const color = 0x4488ff + i * 0x100800;
    const cube = createCube(0.6, color, [x, y, z]);
    s1Cubes.push({ mesh: cube, x, y, z, i });
    // Oscillator per cube — vertical bounce offset by index
    const osc = createOscillator({
      waveform: 'sin',
      min: -1.5,
      max: 1.5,
      speed: 0.6,
      offset: i / 12,
    });
    s1Oscillators.push(osc);
  });

  // ── Section 2 — Grid Layout + Oscillators ────────────────────────────────
  const gridLayout = createGridLayout({
    cols: 4,
    rows: 4,
    spacingX: 2.2,
    spacingY: 2.2,
    originY: 0,
    originZ: -8,
  });
  gridLayout.each(({ x, y, z }, i) => {
    const cube = createCube(0.8, 0x223344, [x, y - 4, z]);
    s2Cubes.push({ mesh: cube, baseX: x, baseY: y - 4, baseZ: z });
    const osc = createOscillator({
      waveform: i % 3 === 0 ? 'sin' : i % 3 === 1 ? 'tri' : 'cos',
      min: -1,
      max: 1,
      speed: 0.4 + (i % 4) * 0.15,
      offset: i / 16,
    });
    s2Oscillators.push(osc);
  });

  // ── Section 3 — Camera Tween ──────────────────────────────────────────────
  s3Tween = createTween({
    from: [0, 8, 16],
    to: [8, 3, 6],
    duration: 4,
    ease: 'easeInOutCubic',
    loop: 'pingpong',
    onUpdate([x, y, z]) {
      setCameraPosition(x, y, z);
      setCameraTarget(0, 0, -4);
    },
  });

  // ── Section 4 — Proximity Trigger ────────────────────────────────────────
  s4SphereA = createSphere(0.7, 0xff4488, [s4APos.x, s4APos.y, s4APos.z]);
  s4SphereB = createSphere(0.7, 0x44aaff, [s4BPos.x, s4BPos.y, s4BPos.z]);

  s4AOsc = createOscillator({ waveform: 'sin', min: -5, max: 5, speed: 0.4, offset: 0 });
  s4BOsc = createOscillator({ waveform: 'cos', min: -5, max: 5, speed: 0.4, offset: 0 });

  s4Proximity = createProximityTrigger({
    getFrom: () => s4APos,
    getTo: () => s4BPos,
    radius: 2.5,
    onEnter() {
      s4Highlight = true;
    },
    onExit() {
      s4Highlight = false;
    },
  });

  // ── Section 5 — Swarm ─────────────────────────────────────────────────────
  s5Swarm = createHSwarm({
    count: 30,
    separation: 1.8,
    alignment: 0.8,
    cohesion: 0.6,
    speed: 4,
    maxForce: 2,
    neighborRadius: 3,
    bounds: { x: 0, y: 0, z: -10, w: 20, h: 12, d: 10 },
    initFn(agent, i) {
      agent.x = (Math.random() - 0.5) * 16;
      agent.y = (Math.random() - 0.5) * 8;
      agent.z = -10 + (Math.random() - 0.5) * 8;
    },
  });

  for (let i = 0; i < s5Swarm.agents.length; i++) {
    const mesh = createCube(0.25, 0x00eeff, [0, 0, -10]);
    s5Meshes.push(mesh);
  }

  s5Swarm.addGoal(0, 0, -10, 0.5);

  // Rotate goals every 4 seconds via TimeTrigger
  s5GoalTimer = createTimeTrigger({
    interval: 4,
    repeat: true,
    callback() {
      s5Swarm.clearGoals();
      const angle = Math.random() * Math.PI * 2;
      s5Swarm.addGoal(Math.cos(angle) * 5, Math.sin(angle) * 3, -10, 0.8);
    },
  });

  // ── Section 6 — Path Layout + Tween Rider ────────────────────────────────
  // Bezier control points forming an S-curve in 3D space
  s6PathLayout = createPathLayout({
    mode: 'bezier',
    count: 8,
    points: [
      { x: -7, y: -2, z: -10 },
      { x: -3, y: 4, z: -8 },
      { x: 3, y: -4, z: -8 },
      { x: 7, y: 2, z: -10 },
      { x: 7, y: 2, z: -10 },
      { x: 4, y: 5, z: -12 },
      { x: -4, y: -5, z: -12 },
      { x: -7, y: -2, z: -10 },
    ],
  });

  s6PathLayout.each(({ x, y, z }, i) => {
    const mesh = createSphere(0.3, 0x334466, [x, y, z]);
    s6PathMeshes.push({ mesh, x, y, z });
  });

  s6RiderMesh = createSphere(0.6, 0xffaa00, [0, 0, -10]);

  s6RiderTween = createTween({
    from: 0,
    to: 1,
    duration: 6,
    ease: 'easeInOutCubic',
    loop: 'pingpong',
    onUpdate(t) {
      const pos = s6PathLayout.getAt(t);
      s6RiderPos.x = pos.x;
      s6RiderPos.y = pos.y;
      s6RiderPos.z = pos.z;
      setPosition(s6RiderMesh, pos.x, pos.y, pos.z);
    },
  });
  s6RiderTween.start();

  // ── Section 7 — Sphere Layout + ColorPool Shuffle ────────────────────────
  s7ColorPool = createColorPool(
    [
      rgba8(255, 60, 100),
      rgba8(255, 140, 40),
      rgba8(255, 220, 40),
      rgba8(80, 220, 60),
      rgba8(40, 200, 255),
      rgba8(120, 80, 255),
      rgba8(255, 80, 200),
      rgba8(200, 255, 100),
    ],
    'shuffle'
  );

  const sphereLayout = createSphereLayout({ count: 24, radius: 4.5 });
  sphereLayout.each(({ x, y, z }) => {
    const mesh = createSphere(0.35, 0x224466, [x, y - 2, z - 10]);
    s7Meshes.push({ mesh, ox: x, oy: y - 2, oz: z - 10 });
  });

  // Rotate color assignments every 1.5s
  s7SwapTimer = createTimeTrigger({
    interval: 1.5,
    repeat: true,
    callback() {
      s7ColorPool.shuffle();
    },
  });

  // Slow saw oscillator spins the whole formation
  s7RotOsc = createOscillator({ waveform: 'saw', min: 0, max: Math.PI * 2, speed: 0.08 });

  // ── Section 8 — HPool Dynamic Objects ────────────────────────────────────
  let _s8HueIdx = 0;
  const HUE_COLORS = [0xff3366, 0xff8800, 0xffee00, 0x00ee66, 0x00aaff, 0xaa44ff, 0xff44aa];

  s8Pool = createHPool({
    build() {
      return { mesh: createCube(0.5, 0x334455, [0, 0, -8]), tween: null };
    },
    onCreate(obj) {
      setMeshVisible(obj.mesh, false);
    },
    onRequest(obj) {
      const color = HUE_COLORS[_s8HueIdx % HUE_COLORS.length];
      _s8HueIdx++;
      // Quick tween: scale 0.01 → 1 with bounce
      obj.tween = createTween({
        from: [0.01, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, -8],
        to: [1, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, -8],
        duration: 1.2,
        ease: 'easeOutBounce',
        onUpdate([sc, x, y, z]) {
          setScale(obj.mesh, sc, sc, sc);
          setPosition(obj.mesh, x, y, z);
        },
      });
      obj.tween.start();
      obj.color = color;
      setMeshVisible(obj.mesh, true);
    },
    onRelease(obj) {
      setMeshVisible(obj.mesh, false);
    },
    max: 12,
  });

  // Pre-warm pool with 12 objects so no build cost during demo
  const warmObjs = s8Pool.requestAll(12);
  warmObjs.forEach(o => s8Pool.release(o));

  s8RandomTrigger = createRandomTrigger({
    chance: 0.04,
    callback() {
      s8Pool.request();
    },
  });

  s8ReleaseTrigger = createTimeTrigger({
    interval: 2.5,
    repeat: true,
    callback() {
      if (s8Pool.active.length > 0) s8Pool.release(s8Pool.active[0]);
    },
  });

  // ── Section 9 — Lissajous Trail ────────────────────────────────────────────
  // Coprime frequency ratios 3:4:5 → complex 3D Lissajous figure
  s9OscX = createOscillator({ waveform: 'sin', min: -5, max: 5, speed: 0.3 });
  s9OscY = createOscillator({ waveform: 'sin', min: -3, max: 3, speed: 0.4 });
  s9OscZ = createOscillator({ waveform: 'cos', min: -4, max: 4, speed: 0.5 });
  s9OscScale = createOscillator({ waveform: 'sin', min: 0.15, max: 0.55, speed: 0.7 });

  for (let i = 0; i < LISS_TRAIL; i++) {
    const fade = 1 - i / LISS_TRAIL;
    const c = Math.round(fade * 200);
    const mesh = createCube(0.18, rgba8(c, Math.round(fade * 140), 255), [0, 0, -8]);
    s9TrailMeshes.push(mesh);
    s9History.push({ x: 0, y: 0, z: -8 });
  }

  // ── Section 10 — TimeTrigger Cascade ────────────────────────────────────────
  for (let i = 0; i < CASCADE_COUNT; i++) {
    const mesh = createCube(0.7, 0x223344, [(i - CASCADE_COUNT / 2 + 0.5) * 1.8, 0, -8]);
    s10Cubes.push(mesh);
    const tw = createTween({
      from: 0.4,
      to: 1.4,
      duration: 0.6,
      ease: 'easeOutBounce',
      loop: 'none',
      onUpdate(sc) {
        setScale(mesh, sc, sc, sc);
      },
    });
    s10Tweens.push(tw);
  }

  s10CascadeTimer = createTimeTrigger({
    interval: 0.25,
    repeat: true,
    callback() {
      const tw = s10Tweens[s10Index % CASCADE_COUNT];
      tw.start();
      s10Index++;
    },
  });

  // ── Section 11 — Sawtooth Traveling Wave ────────────────────────────────────
  s11ColorPool = createColorPool(
    [
      rgba8(255, 60, 120),
      rgba8(60, 200, 255),
      rgba8(255, 220, 60),
      rgba8(120, 255, 120),
      rgba8(200, 80, 255),
      rgba8(255, 140, 60),
    ],
    'sequential'
  );

  for (let i = 0; i < WAVE_COUNT; i++) {
    const color = s11ColorPool.next();
    const mesh = createCube(0.65, color, [(i - WAVE_COUNT / 2 + 0.5) * 1.5, 0, -8]);
    s11Cubes.push(mesh);
    // Sawtooth oscillator — each cube phase-offset by i/WAVE_COUNT
    const osc = createOscillator({
      waveform: 'saw',
      min: -2,
      max: 2,
      speed: 0.7,
      offset: i / WAVE_COUNT,
    });
    s11Oscillators.push(osc);
  }

  // ── Initial camera ────────────────────────────────────────────────────────
  setCameraPosition(0, 8, 16);
  setCameraTarget(0, 0, 0);
  setFog(0x0a0a1a, 20, 50);
  setAmbientLight(0x223344, 0.4);
  createPointLight(0xffffff, 1.5, [0, 8, 4]);

  // Canvas tap → next section
  document.addEventListener(
    'pointerdown',
    e => {
      if (e.target && e.target.tagName === 'CANVAS') _nextSection();
    },
    { passive: true }
  );

  _setSection(0);
}

function _nextSection() {
  const next = (section + 1) % 11;
  time = SECTION_STARTS[next];
  _setSection(next);
}

function _setSection(s) {
  section = s;

  // Reset scene visibility per section — hide everything then show what's needed
  s1Cubes.forEach(({ mesh }) => mesh && setMeshVisible(mesh, false));
  s2Cubes.forEach(({ mesh }) => mesh && setMeshVisible(mesh, false));
  if (s4SphereA) setMeshVisible(s4SphereA, false);
  if (s4SphereB) setMeshVisible(s4SphereB, false);
  s5Meshes.forEach(m => m && setMeshVisible(m, false));
  s6PathMeshes.forEach(({ mesh }) => setMeshVisible(mesh, false));
  if (s6RiderMesh) setMeshVisible(s6RiderMesh, false);
  s7Meshes.forEach(({ mesh }) => setMeshVisible(mesh, false));
  s8Pool.active.forEach(o => setMeshVisible(o.mesh, false));
  s8Pool.releaseAll();
  s9TrailMeshes.forEach(m => setMeshVisible(m, false));
  s10Cubes.forEach(m => setMeshVisible(m, false));
  s11Cubes.forEach(m => setMeshVisible(m, false));

  if (s === 0) {
    s1Cubes.forEach(({ mesh }) => setMeshVisible(mesh, true));
    setCameraPosition(0, 5, 14);
    setCameraTarget(0, 0, 0);
  } else if (s === 1) {
    s2Cubes.forEach(({ mesh }) => setMeshVisible(mesh, true));
    setCameraPosition(-2, 6, 10);
    setCameraTarget(0, -2, -8);
  } else if (s === 2) {
    s3Tween.start();
    s2Cubes.forEach(({ mesh }) => setMeshVisible(mesh, true));
  } else if (s === 3) {
    setMeshVisible(s4SphereA, true);
    setMeshVisible(s4SphereB, true);
    setCameraPosition(0, 6, 2);
    setCameraTarget(0, 0, -8);
  } else if (s === 4) {
    s5Meshes.forEach(m => setMeshVisible(m, true));
    setCameraPosition(0, 10, 5);
    setCameraTarget(0, 0, -10);
  } else if (s === 5) {
    s6PathMeshes.forEach(({ mesh }) => setMeshVisible(mesh, true));
    setMeshVisible(s6RiderMesh, true);
    s6RiderTween.start();
    setCameraPosition(0, 6, 4);
    setCameraTarget(0, 0, -10);
  } else if (s === 6) {
    s7Meshes.forEach(({ mesh }) => setMeshVisible(mesh, true));
    s7RotOsc.reset();
    setCameraPosition(0, 4, 10);
    setCameraTarget(0, -2, -10);
  } else if (s === 7) {
    setCameraPosition(0, 5, 8);
    setCameraTarget(0, 0, -8);
  } else if (s === 8) {
    s9TrailMeshes.forEach(m => setMeshVisible(m, true));
    s9History.forEach(h => {
      h.x = 0;
      h.y = 0;
      h.z = -8;
    });
    [s9OscX, s9OscY, s9OscZ, s9OscScale].forEach(o => o.reset());
    setCameraPosition(0, 6, 10);
    setCameraTarget(0, 0, -8);
  } else if (s === 9) {
    s10Cubes.forEach(m => {
      setMeshVisible(m, true);
      setScale(m, 0.4, 0.4, 0.4);
    });
    s10Index = 0;
    setCameraPosition(0, 4, 10);
    setCameraTarget(0, 0, -8);
  } else if (s === 10) {
    s11Cubes.forEach(m => setMeshVisible(m, true));
    setCameraPosition(0, 5, 14);
    setCameraTarget(0, 0, -8);
  }
}

export function update(dt) {
  time += dt;

  // Spacebar / tap → advance to next section
  if (keyp('Space')) _nextSection();

  // Section transitions
  const prevSection = section;
  if (time < 10) section = 0;
  else if (time < 25) section = 1;
  else if (time < 45) section = 2;
  else if (time < 60) section = 3;
  else if (time < 80) section = 4;
  else if (time < 95) section = 5;
  else if (time < 110) section = 6;
  else if (time < 125) section = 7;
  else if (time < 140) section = 8;
  else if (time < 155) section = 9;
  else if (time < DEMO_DURATION) section = 10;
  else {
    time = 0;
    section = 0;
  }

  if (section !== prevSection) {
    _setSection(section);
  }

  // ── Section 0 — Circle + OSC ──────────────────────────────────────────────
  if (section === 0) {
    for (let i = 0; i < s1Cubes.length; i++) {
      const { mesh, x, z } = s1Cubes[i];
      s1Oscillators[i].tick(dt);
      const yVal = s1Oscillators[i].value;
      setPosition(mesh, x, yVal, z);
      rotateMesh(mesh, dt * 0.5, dt * 0.8, 0);
    }
  }

  // ── Section 1 — Grid + scale OSC ──────────────────────────────────────────
  if (section === 1) {
    for (let i = 0; i < s2Cubes.length; i++) {
      const { mesh, baseX, baseY, baseZ } = s2Cubes[i];
      s2Oscillators[i].tick(dt);
      const sc = 0.5 + (s2Oscillators[i].value + 1) * 0.4;
      setScale(mesh, sc, sc, sc);
      rotateMesh(mesh, 0, dt * (0.5 + (i % 4) * 0.2), 0);
    }
  }

  // ── Section 2 — Camera Tween ───────────────────────────────────────────────
  if (section === 2) {
    s3Tween.tick(dt);
    for (let i = 0; i < s2Cubes.length; i++) {
      s2Oscillators[i].tick(dt);
      const { mesh } = s2Cubes[i];
      const sc = 0.5 + (s2Oscillators[i].value + 1) * 0.4;
      setScale(mesh, sc, sc, sc);
      rotateMesh(mesh, 0, dt * 0.6, 0);
    }
  }

  // ── Section 3 — Proximity Trigger ─────────────────────────────────────────
  if (section === 3) {
    s4AOsc.tick(dt);
    s4BOsc.tick(dt);
    s4APos.x = -3 + s4AOsc.value;
    s4BPos.x = 3 + s4BOsc.value;
    setPosition(s4SphereA, s4APos.x, s4APos.y, s4APos.z);
    setPosition(s4SphereB, s4BPos.x, s4BPos.y, s4BPos.z);
    s4Proximity.tick(dt);
  }

  // ── Section 4 — Swarm ─────────────────────────────────────────────────────
  if (section === 4) {
    s5GoalTimer.tick(dt);
    s5Swarm.tick(dt);
    for (let i = 0; i < s5Swarm.agents.length; i++) {
      const a = s5Swarm.agents[i];
      setPosition(s5Meshes[i], a.x, a.y, a.z);
      rotateMesh(s5Meshes[i], dt, dt * 1.3, 0);
    }
  }

  // ── Section 5 — Path Layout + Tween Rider ─────────────────────────────────
  if (section === 5) {
    s6RiderTween.tick(dt);
    // Gently pulse the waypoint spheres
    const sectionT = (time - 80) / 15;
    for (let i = 0; i < s6PathMeshes.length; i++) {
      const sc = 0.7 + Math.sin(time * 1.5 + i * 0.8) * 0.3;
      setScale(s6PathMeshes[i].mesh, sc, sc, sc);
    }
    rotateMesh(s6RiderMesh, dt * 0.4, dt * 1.2, dt * 0.7);
  }

  // ── Section 6 — Sphere Layout + ColorPool Shuffle ─────────────────────────
  if (section === 6) {
    s7SwapTimer.tick(dt);
    s7RotOsc.tick(dt);
    const theta = s7RotOsc.value;
    for (let i = 0; i < s7Meshes.length; i++) {
      const { mesh, ox, oy, oz } = s7Meshes[i];
      // Rotate positions around Y axis
      const rx = ox * Math.cos(theta) - oz * Math.sin(theta);
      const rz = ox * Math.sin(theta) + oz * Math.cos(theta);
      setPosition(mesh, rx, oy, rz - 10);
      // Pulse scale per sphere
      const sc = 0.7 + Math.sin(time * 1.8 + i * 0.4) * 0.3;
      setScale(mesh, sc, sc, sc);
      rotateMesh(mesh, dt * 0.3, dt * 0.5, 0);
    }
  }

  // ── Section 7 — HPool Dynamic Objects ────────────────────────────────────
  if (section === 7) {
    s8RandomTrigger.tick(dt);
    s8ReleaseTrigger.tick(dt);
    for (const obj of s8Pool.active) {
      if (obj.tween && !obj.tween.done) obj.tween.tick(dt);
      rotateMesh(obj.mesh, dt * 0.6, dt, 0);
    }
  }

  // ── Section 8 — Lissajous Trail ─────────────────────────────────────────
  if (section === 8) {
    s9OscX.tick(dt);
    s9OscY.tick(dt);
    s9OscZ.tick(dt);
    s9OscScale.tick(dt);

    const cx = s9OscX.value;
    const cy = s9OscY.value;
    const cz = s9OscZ.value - 8;

    // Shift history buffer
    s9History.unshift({ x: cx, y: cy, z: cz });
    if (s9History.length > LISS_TRAIL) s9History.pop();

    for (let i = 0; i < s9TrailMeshes.length; i++) {
      if (i >= s9History.length) break;
      const h = s9History[i];
      const age = 1 - i / LISS_TRAIL;
      const sc = age * s9OscScale.value;
      setPosition(s9TrailMeshes[i], h.x, h.y, h.z);
      setScale(s9TrailMeshes[i], sc, sc, sc);
    }
  }

  // ── Section 9 — TimeTrigger Cascade ──────────────────────────────────────
  if (section === 9) {
    s10CascadeTimer.tick(dt);
    for (const tw of s10Tweens) {
      if (!tw.done) tw.tick(dt);
    }
  }

  // ── Section 10 — Sawtooth Traveling Wave ─────────────────────────────────
  if (section === 10) {
    for (let i = 0; i < WAVE_COUNT; i++) {
      s11Oscillators[i].tick(dt);
      const yVal = s11Oscillators[i].value;
      const { x, z } = { x: (i - WAVE_COUNT / 2 + 0.5) * 1.5, z: -8 };
      setPosition(s11Cubes[i], x, yVal, z);
      // Scale slightly with wave height
      const sc = 0.5 + Math.abs(yVal) * 0.18;
      setScale(s11Cubes[i], sc, sc, sc);
      rotateMesh(s11Cubes[i], dt * 0.3, dt * 0.5, 0);
    }
  }
}

export function draw() {
  const W = 640,
    H = 360;

  // ── Palette shortcuts (rgba8 = confirmed working color format) ────────────
  const cWhite = rgba8(255, 255, 255);
  const cCyan = rgba8(0, 238, 255);
  const cGrey = rgba8(136, 153, 204);

  // ── HUD labels ────────────────────────────────────────────────────────────
  const labels = [
    'Circle Layout + Oscillators',
    'Grid Layout + Scale OSC',
    'Camera Tween (pingpong)',
    'Proximity Trigger',
    'HSwarm Flock',
    'Path Layout + Tween Rider',
    'Sphere Layout + ColorPool',
    'HPool + RandomTrigger',
    'Lissajous Trail (3 OSC)',
    'TimeTrigger Cascade',
    'Sawtooth Wave',
  ];

  drawPanel(4, 4, 220, 14, {
    bgColor: rgba8(0, 0, 12, 210),
    borderLight: cCyan,
    borderDark: rgba8(0, 60, 80),
  });
  print(`HYPE: ${labels[section]}`, 8, 8, cWhite);

  // Section counter badge
  drawPanel(W - 38, 4, 34, 14, {
    bgColor: rgba8(0, 0, 12, 210),
    borderLight: cGrey,
    borderDark: rgba8(30, 40, 70),
  });
  print(`${section + 1}/11`, W - 34, 8, cGrey);

  // Nav hint
  print('SPACE: next', W - 74, H - 10, rgba8(80, 90, 110));

  // ── Section-specific HUD ──────────────────────────────────────────────────
  // Section-specific info bar — helper to reduce boilerplate
  const panel = col => ({
    bgColor: rgba8(0, 0, 12, 210),
    borderLight: col,
    borderDark: rgba8(0, 0, 0),
  });

  if (section === 3) {
    const dist = s4Proximity?.distance?.toFixed(1) ?? '0.0';
    const col = s4Highlight ? rgba8(255, 80, 60) : rgba8(100, 220, 180);
    drawPanel(4, H - 24, 170, 14, panel(col));
    print(`Dist: ${dist}  ${s4Highlight ? 'CONTACT!' : ''}`, 8, H - 20, col);
  }

  if (section === 4) {
    drawPanel(4, H - 24, 210, 14, panel(cCyan));
    print(
      `Agents: ${s5Swarm?.agents?.length ?? 0}  Goals: ${s5Swarm?.goals?.length ?? 0}`,
      8,
      H - 20,
      cWhite
    );
  }

  if (section === 5) {
    const t = (s6RiderTween?.progress ?? 0).toFixed(2);
    drawPanel(4, H - 24, 190, 14, panel(rgba8(255, 170, 0)));
    print(`Path t: ${t}  Waypoints: ${s6PathMeshes.length}`, 8, H - 20, rgba8(255, 170, 0));
  }

  if (section === 6) {
    drawPanel(4, H - 24, 215, 14, panel(rgba8(255, 128, 255)));
    print(`Fibonacci sphere  24 pts  ColorPool: shuffle`, 8, H - 20, rgba8(255, 128, 255));
  }

  if (section === 7) {
    drawPanel(4, H - 24, 215, 14, panel(rgba8(136, 255, 68)));
    print(
      `Pool active: ${s8Pool?.active?.length ?? 0}  waiting: ${s8Pool?.available ?? 0}`,
      8,
      H - 20,
      rgba8(136, 255, 68)
    );
  }

  if (section === 8) {
    drawPanel(4, H - 24, 215, 14, panel(rgba8(136, 136, 255)));
    const rx = (s9OscX?.value ?? 0).toFixed(2);
    const ry = (s9OscY?.value ?? 0).toFixed(2);
    print(`Lissajous  x:${rx} y:${ry}  trail:${LISS_TRAIL}`, 8, H - 20, rgba8(136, 136, 255));
  }

  if (section === 9) {
    drawPanel(4, H - 24, 215, 14, panel(rgba8(255, 204, 68)));
    print(
      `Cascade idx: ${s10Index % CASCADE_COUNT}/${CASCADE_COUNT}  interval: 0.25s`,
      8,
      H - 20,
      rgba8(255, 204, 68)
    );
  }

  if (section === 10) {
    drawPanel(4, H - 24, 215, 14, panel(rgba8(68, 255, 204)));
    print(`Saw wave  ${WAVE_COUNT} cubes  phase: 1/${WAVE_COUNT}`, 8, H - 20, rgba8(68, 255, 204));
  }

  // ── Timer bar ─────────────────────────────────────────────────────────────
  const secStart = SECTION_STARTS[section];
  const secEnd = SECTION_ENDS[section];
  const t = Math.min(1, (time - secStart) / (secEnd - secStart));
  drawProgressBar(4, H - 6, W - 8, 4, t, cCyan, rgba8(17, 34, 51), rgba8(34, 68, 85));
}
