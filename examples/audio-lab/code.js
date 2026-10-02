// examples/audio-lab/code.js
// Interactive spatial 3D audio playground.
// Spawn floating sound emitters and walk around them to hear positional audio.
// Press keys 1-5 to trigger different sound effects. Press B to spawn an emitter.

const { print, printCentered, rect, rgba8 } = nova64.draw;
const { createCube, createPlane, createSphere, rotateMesh, setPosition, setScale } = nova64.scene;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog } = nova64.light;
const { key, keyp } = nova64.input;
const { setVolume, sfx } = nova64.audio;
const { createCooldown, createCooldownSet, pulse, updateCooldown, updateCooldowns, useCooldown } =
  nova64.util;

const PRESETS = [
  { key: 'Digit1', label: '1: Jump', opts: { wave: 'sine', freq: 440, dur: 0.15, sweep: 200 } },
  { key: 'Digit2', label: '2: Coin', opts: { wave: 'square', freq: 880, dur: 0.1, sweep: -200 } },
  {
    key: 'Digit3',
    label: '3: Laser',
    opts: { wave: 'sawtooth', freq: 660, dur: 0.2, sweep: -400 },
  },
  { key: 'Digit4', label: '4: Explosion', opts: { wave: 'noise', freq: 80, dur: 0.4, vol: 0.6 } },
  {
    key: 'Digit5',
    label: '5: Power Up',
    opts: { wave: 'triangle', freq: 220, dur: 0.3, sweep: 660 },
  },
];

const EMITTER_COLORS = [0xff4400, 0x44ff00, 0x0088ff, 0xff00ff, 0xffaa00];

let player = { x: 0, y: 1, z: 0 };
let playerMesh;
let ground;
let emitters = []; // { mesh, x, z, color, pulse }
let sfxCDs; // cooldown set for sound triggers
let volume = 0.5;
let spawnCD;

export function init() {
  setCameraPosition(0, 6, 10);
  setCameraTarget(0, 0, 0);
  setAmbientLight(0x334466, 1.2);
  setFog(0x050510, 15, 40);

  ground = createPlane(40, 40, 0x111133, [0, 0, 0]);
  rotateMesh(ground, -Math.PI / 2, 0, 0);

  playerMesh = createCube(0.6, 0xffffff, [0, 1, 0], { material: 'emissive', emissive: 0xffffff });
  if (typeof setVolume === 'function') setVolume(volume);

  // Initialize cooldowns for sound triggers
  const cdDefs = {};
  PRESETS.forEach(p => {
    cdDefs[p.key] = 0.15;
  });
  sfxCDs = createCooldownSet(cdDefs);
  spawnCD = createCooldown(0.5);
}

export function update(dt) {
  const speed = 5;

  // WASD movement
  if (key('KeyW')) player.z -= speed * dt;
  if (key('KeyS')) player.z += speed * dt;
  if (key('KeyA')) player.x -= speed * dt;
  if (key('KeyD')) player.x += speed * dt;

  // Clamp to arena
  player.x = Math.max(-18, Math.min(18, player.x));
  player.z = Math.max(-18, Math.min(18, player.z));

  setPosition(playerMesh, player.x, player.y, player.z);
  setCameraPosition(player.x, player.y + 5, player.z + 8);
  setCameraTarget(player.x, player.y, player.z);

  // Volume: Q/E
  if (keyp('KeyQ')) {
    volume = Math.max(0, volume - 0.1);
    if (typeof setVolume === 'function') setVolume(volume);
  }
  if (keyp('KeyE')) {
    volume = Math.min(1, volume + 0.1);
    if (typeof setVolume === 'function') setVolume(volume);
  }

  // Sound trigger keys 1-5
  updateCooldowns(sfxCDs, dt);
  PRESETS.forEach(({ key: k, opts }) => {
    if (keyp(k) && useCooldown(sfxCDs[k])) {
      if (typeof sfx === 'function') sfx(opts);
    }
  });

  // B key: spawn emitter at player position
  updateCooldown(spawnCD, dt);
  if (keyp('KeyB') && emitters.length < 5 && useCooldown(spawnCD)) {
    const color = EMITTER_COLORS[emitters.length % EMITTER_COLORS.length];
    const mesh = createSphere(0.5, color, [player.x, 1.5, player.z], 12, {
      material: 'holographic',
      emissive: color,
      emissiveIntensity: 0.6,
    });
    emitters.push({ mesh, x: player.x, z: player.z, color, pulse: Math.random() * Math.PI * 2 });
    if (typeof sfx === 'function') sfx({ wave: 'sine', freq: 660, dur: 0.2, sweep: 220 });
  }

  // Animate emitter pulse and trigger proximity sfx
  emitters.forEach(e => {
    e.pulse += dt * 2;
    const s = 1 + Math.sin(e.pulse) * 0.15;
    setScale(e.mesh, s, s, s);

    // Proximity sound: if player steps close, play a soft tone
    const dist = Math.hypot(player.x - e.x, player.z - e.z);
    if (dist < 1.5 && typeof sfx === 'function') {
      sfx({ wave: 'sine', freq: 880, dur: 0.05 });
    }
  });
}

export function draw() {
  // Header bar
  rect(0, 0, 320, 18, rgba8(10, 10, 40, 255), true);
  printCentered('AUDIO LAB', 4, 0xffffff);

  // Preset strip
  print('SFX:', 4, 22, 0xaaaaff);
  PRESETS.forEach(({ label }, i) => {
    print(label, 4 + i * 62, 30, 0x88aadd);
  });

  // Volume bar
  print('VOL', 4, 42, 0xaaaaff);
  const volW = Math.round(volume * 80);
  rect(26, 42, 80, 7, rgba8(30, 30, 60, 200), true);
  rect(26, 42, volW, 7, rgba8(80, 200, 100, 255), true);
  rect(26, 42, 80, 7, rgba8(80, 100, 180, 180), false);
  print('Q/E to adjust', 112, 43, 0x555577);

  // Emitter count
  print(`Emitters: ${emitters.length}/5  (B to spawn)`, 4, 54, 0xdddddd);

  // Emitter list with color dots
  emitters.forEach((e, i) => {
    const dist = Math.round(Math.hypot(player.x - e.x, player.z - e.z) * 10) / 10;
    const r = (e.color >> 16) & 0xff;
    const g = (e.color >> 8) & 0xff;
    const b = e.color & 0xff;
    rect(4, 64 + i * 10, 6, 6, rgba8(r, g, b, 255), true);
    print(`Emitter ${i + 1}  dist: ${dist}m`, 14, 65 + i * 10, 0xaaaacc);
  });

  // Controls footer
  rect(0, 170, 320, 10, rgba8(10, 10, 40, 255), true);
  print('WASD: move  1-5: SFX  B: spawn emitter  Q/E: volume', 2, 172, 0x444466);
}
