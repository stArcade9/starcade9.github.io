// BREAKWATER CIRCUIT — The freight port closes at midnight. We open at 12:01.
import { course, LENGTH, STEP, sample, sectors, pads, newCraft, step, aiInput } from './race.js';
const S = nova64.scene,
  D = nova64.draw,
  I = nova64.input;
const { setCameraPosition, setCameraTarget, setCameraFOV } = nova64.camera;
const { createGradientSkybox, setAmbientLight, setLightDirection, setLightColor, setFog } =
  nova64.light;
const C = {
  ink: 0x01040a,
  sea: 0x00158d,
  road: 0x101945,
  edge: 0x008cff,
  green: 0x00ff75,
  cyan: 0x00ffe0,
  white: 0xf5fff8,
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let state = 'title',
  mode = 'race',
  player,
  rivals = [],
  ships = [],
  meshes = [],
  batches = [];
let acc = 0,
  clock = 0,
  countdown = 3,
  muted = false,
  auto = false,
  best = 0,
  selected = 0,
  beat = 0,
  soundClock = 0;
let ribbonMesh = null;
let camera = null,
  lastNotice = '',
  pointerWasDown = false;
const timeText = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
function box(w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const id = S.createCube(1, color, [x, y, z], {
    material: 'standard',
    roughness: 0.82,
    metalness: 0,
  });
  S.setScale(id, w, h, d);
  S.setRotation(id, rx, ry, rz);
  meshes.push(id);
  return id;
}
// Convert course yaw/pitch/bank to the XYZ Euler convention used by mesh APIs.
function orientation(yaw, pitch, bank) {
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cx = Math.cos(pitch),
    sx = Math.sin(pitch),
    cz = Math.cos(bank),
    sz = Math.sin(bank);
  const y = Math.asin(clamp(sy * cx, -1, 1));
  if (Math.abs(sy * cx) > 0.999999) return [Math.atan2(cx * sz, cx * cz), y, 0];
  return [Math.atan2(sx, cy * cx), y, Math.atan2(cy * sz - sy * sx * cz, cy * cz + sy * sx * sz)];
}
// Static scenery is grouped by material, so the port has detail without thousands of draw calls.
function buildPort() {
  const groups = new Map();
  const add = (c, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) => {
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push([x, y, z, rx, ry, rz, w, h, d]);
  };
  const at = (s, lift, lane, c, w, h, d, roll = 0, turn = 0) => {
    const p = sample(s);
    add(
      c,
      p.x - p.tz * lane,
      p.y + lift + lane * Math.sin(p.bank),
      p.z + p.tx * lane,
      w,
      h,
      d,
      ...orientation(p.yaw + turn, p.pitch, p.bank + roll)
    );
  };
  add(C.sea, 100, -5, -60, 1600, 2, 1600);
  for (let i = 0; i < course.length; i++) {
    const a = course[i],
      b = course[(i + 1) % course.length],
      len = (b.s || LENGTH) - a.s,
      s = a.s + len / 2;
    const p = sample(s);
    at(s, -0.55, 0, C.road, p.width, 1, len + 1.5);
    for (const side of [-1, 1]) {
      at(s, 0.6, side * (p.width / 2 + 0.2), 0x132b9e, 0.8, 1.8, len + 1);
      at(s, 1.55, side * (p.width / 2 + 0.2), i % 6 < 2 ? C.green : C.ink, 1, 0.16, len + 0.8);
      at(s, 0.03, side * (p.width / 2 - 1), C.edge, 0.2, 0.08, len + 0.8);
    }
    if (i % 4 === 0) at(s, 0.04, 0, 0x93a4a4, 0.16, 0.08, 2.7);
    if (i % 16 === 0) {
      at(s, -6, 0, 0x111149, 3, 11, 4);
      for (const side of [-1, 1]) {
        at(s, 5, side * (p.width / 2 + 2), C.ink, 0.35, 10, 0.35);
        at(s, 9.7, side * (p.width / 2), C.green, 4, 0.25, 0.65);
      }
    }
    // Painted entry chevrons before every marked bend.
    if (
      i % 8 === 0 &&
      sectors.some(q => q.slip && s / LENGTH > q.start - 0.03 && s / LENGTH < q.start + 0.06)
    ) {
      for (const side of [-1, 1]) at(s, 0.09, side * 2, C.green, 0.25, 0.08, 3, side * 0.0);
    }
  }
  for (const f of pads)
    for (let j = 0; j < 5; j++) {
      const s = f * LENGTH - 6 + j * 2.4;
      at(s, 0.11, -1.3, C.cyan, 2.8, 0.1, 0.45, 0, -0.55);
      at(s, 0.11, 1.3, C.cyan, 2.8, 0.1, 0.45, 0, 0.55);
      at(s, 0.1, -3.2, C.ink, 0.5, 0.1, 2.8);
      at(s, 0.1, 3.2, C.ink, 0.5, 0.1, 2.8);
    }
  // Shared checkpoint gates: the same eight distances are used by race.js.
  for (let i = 0; i < 8; i++) {
    const s = (i * LENGTH) / 8,
      p = sample(s);
    for (const side of [-1, 1]) at(s, 4.5, side * (p.width / 2 + 1.5), C.ink, 1, 9, 1);
    at(s, 9, 0, i === 0 ? C.green : 0x053fff, p.width + 4, 1.1, 1.2);
    for (let n = 0; n <= i; n++) at(s, 9, (-i / 2 + n) * 1.1, C.white, 0.5, 0.7, 1.3);
  }
  for (let x = -10; x <= 10; x += 2)
    for (let z = 0; z < 2; z++) at(z * 2, 0.12, x, (x / 2 + z) % 2 ? C.ink : C.white, 2, 0.1, 2);
  // Original league arrows: the bend direction is visible before committing to entry.
  for (const sector of sectors.filter(q => q.slip)) {
    for (let i = 0; i < 5; i++) {
      const s = (sector.start - 0.025 + i * 0.012) * LENGTH;
      at(s, 3.4, -13, C.ink, 0.4, 4.4, 8);
      at(s, 3.4, -12.7, C.green, 0.45, 3, 6);
      at(s - 1, 4, -12.4, C.ink, 0.5, 0.5, 2);
      at(s + 1, 2.8, -12.4, C.ink, 0.5, 0.5, 2);
    }
  }
  // Dockside league pylons: white/cyan/orange punctuation against blue water.
  for (let i = 0; i < 12; i++) {
    const s = (i * LENGTH) / 12;
    at(s, 8, -21, C.ink, 2, 17, 5);
    at(s, 11, -19.9, i % 2 ? C.cyan : C.green, 0.3, 9, 4.6);
    for (let n = 0; n < 3; n++) at(s - 1.4 + n * 1.4, 10, -19.7, C.ink, 0.4, 5, 0.6);
  }
  // 01: customs terminal and floodlit freight stencils.
  for (let i = 0; i < 7; i++) {
    const s = 20 + i * 16;
    at(s, 4, 25, C.ink, 14, 8, 12);
    at(s, 6, 17.9, C.green, 0.12, 1, 8);
    at(s, 9, 25, 0x1e39ce, 15, 1, 13);
  }
  // 02: three unmistakable gantry cranes, cantilevered over the sea.
  for (let i = 0; i < 3; i++) {
    const p = sample(LENGTH * (0.18 + i * 0.055));
    for (const side of [-1, 1]) add(0x005cff, p.x + side * 24, p.y + 18, p.z, 2, 36, 3);
    add(C.green, p.x, p.y + 36, p.z, 78, 3, 4);
    add(C.ink, p.x + 10, p.y + 26, p.z, 0.25, 18, 0.25);
    add(0x00ff75, p.x + 10, p.y + 17, p.z, 8, 2, 4);
    for (let k = -3; k <= 3; k++) add(C.ink, p.x + k * 10, p.y + 36, p.z, 1, 2.8, 4.2, 0, 0, 0.4);
  }
  // 03: corrugated freight stacks outside the road envelope.
  const colors = [0xc900a9, 0x003cff, 0x00c872];
  for (let i = 0; i < 28; i++) {
    const s = LENGTH * (0.36 + (i % 14) * 0.012),
      lane = i < 14 ? -24 : 24;
    at(s, 3 + (i % 3) * 2, lane, colors[i % 3], 10, 6 + (i % 3) * 4, 9);
    for (let rib = -3; rib <= 3; rib++)
      at(s + rib, 4, lane - Math.sign(lane) * 5.1, 0x00d9ff, 0.15, 4, 0.13);
    if (i % 3 === 0) at(s, 5, lane - Math.sign(lane) * 5.15, C.white, 0.16, 1.4, 3);
  }
  // 04: concrete seawall and a distant turbine field beyond the crest.
  for (let i = 0; i < 18; i++) {
    const s = LENGTH * (0.54 + i * 0.012);
    at(s, -4, 17, 0x122ab0, 6, 16, 18);
    at(s, 5, 19, C.green, 1, 1, 1);
  }
  for (let i = 0; i < 6; i++) {
    const x = 360 + i * 40,
      z = 90 - i * 55;
    add(0x5a17ce, x, 22, z, 1.5, 54, 1.5);
    for (let n = 0; n < 3; n++) {
      const a = (n * Math.PI * 2) / 3;
      add(0x00d5ff, x + Math.sin(a) * 10, 49 + Math.cos(a) * 10, z, 1.5, 22, 0.6, 0, 0, -a);
    }
  }
  // 05: striped lighthouse at the final hairpin; near-field bollards carry speed.
  const lighthouse = sample(LENGTH * 0.86);
  for (let i = 0; i < 8; i++)
    add(i % 2 ? C.white : 0x005bff, lighthouse.x - 28, 5 + i * 4, lighthouse.z, 8, 4, 8);
  add(C.green, lighthouse.x - 28, 38, lighthouse.z, 11, 3, 11);
  for (let i = 0; i < 55; i++) at((i * LENGTH) / 55, 1.8, -15, 0x00ff75, 0.7, 3, 0.7);
  // Open light-vaults twist above the track: rhythm and parallax without covering turn sightlines.
  for (const [start, end] of [
    [0.09, 0.25],
    [0.36, 0.49],
    [0.7, 0.8],
  ]) {
    for (let s = start * LENGTH, ring = 0; s < end * LENGTH; s += 16, ring++) {
      for (let n = 0; n < 10; n++) {
        const a = (n * Math.PI) / 9;
        const hue = [0x004dff, 0x00ffb9, 0x7e13ff, 0x00bfff][(ring + Math.floor(n / 3)) % 4];
        at(s, 2 + Math.sin(a) * 15, Math.cos(a) * 16, hue, 5.8, 0.23, 0.75, a + Math.PI / 2);
      }
    }
  }
  // Electric-blue tide bands and violet horizon sculptures make the port feel alive.
  for (let i = 0; i < 80; i++) {
    const x = -180 + (i % 16) * 40,
      z = -350 + Math.floor(i / 16) * 150;
    add(i % 3 ? 0x0032c7 : 0x087dff, x, -3.8, z, 24, 0.12, 1.2, 0, 0.25, 0);
  }
  for (const [color, items] of groups) {
    const id = S.createInstancedMesh('cube', items.length, color, {
      size: 1,
      material: 'standard',
      roughness: 0.9,
      metalness: 0,
      emissive: [C.green, C.cyan, 0x004dff, 0x00ffb9, 0x7e13ff, 0x00bfff].includes(color)
        ? color
        : 0,
      emissiveIntensity: 0.45,
    });
    items.forEach((v, i) => S.setInstanceTransform(id, i, ...v));
    S.finalizeInstances(id);
    batches.push(id);
  }
  ribbonMesh = S.createInstancedMesh('cube', 192, 0xffffff, {
    size: 1,
    emissive: 0x003aff,
    emissiveIntensity: 0.4,
  });
  batches.push(ribbonMesh);
}
function animateRibbons() {
  for (let i = 0; i < 192; i++) {
    const s = (Math.floor(i / 2) * LENGTH) / 96,
      p = sample(s),
      side = i % 2 ? 1 : -1;
    const wave = 0.5 + 0.5 * Math.sin(s * 0.035 - clock * 2.5);
    S.setInstanceTransform(
      ribbonMesh,
      i,
      p.x - p.tz * side * 9.6,
      p.y + 0.22,
      p.z + p.tx * side * 9.6,
      ...orientation(p.yaw, p.pitch, p.bank),
      0.28,
      0.12,
      5 + wave * 4
    );
    const g = Math.round(80 + wave * 175),
      b = Math.round(255 - wave * 90);
    S.setInstanceColor(ribbonMesh, i, (g << 8) | b);
  }
  S.finalizeInstances(ribbonMesh);
}
async function makeShip(index) {
  const id = await S.loadModel(new URL(`./assets/hydrofoil-${index}.glb`, import.meta.url).href);
  meshes.push(id);
  const parts = [{ id, x: 0, y: 0, z: 0 }];
  for (const x of [-1.65, 1.65]) {
    const id = box(0.36, 0.22, 0.8, C.cyan, 0, 0, 0);
    S.setMeshEmissive(id, C.cyan, 0.45);
    parts.push({ id, x, y: -0.05, z: 2.7, w: 0.36, h: 0.22, d: 0.8, engine: true });
  }
  return parts;
}
function positionShip(parts, p, i) {
  const r = sample(p.s),
    yaw = r.yaw - p.heading,
    cr = Math.cos(yaw),
    sr = Math.sin(yaw);
  const x = r.x - r.tz * p.lane,
    y = r.y + p.hover + p.lane * Math.sin(r.bank),
    z = r.z + r.tx * p.lane;
  const roll = clamp(-p.slip * 0.024 + p.heading * 0.12, -0.43, 0.43) + r.bank;
  parts.forEach(part => {
    const oy = part.y + Math.sin(roll) * part.x;
    S.setPosition(part.id, x + part.x * cr + part.z * sr, y + oy, z - part.x * sr + part.z * cr);
    S.setRotation(part.id, ...orientation(yaw, r.pitch + (part.rx || 0), roll));
    if (part.engine) S.setScale(part.id, part.w, part.h, p.boost > 0 ? 3.5 : part.d);
    S.setMeshVisible(part.id, i === 0 || mode === 'race');
  });
}
function sound(opts) {
  if (!muted) nova64.audio.sfx(opts);
}
function music(dt) {
  // Original 136 BPM electro phrase; engine and wind share the runtime's short-voice synth.
  soundClock += dt;
  const tick = 60 / 136 / 4;
  if (soundClock < tick) return;
  soundClock -= tick;
  beat++;
  const n = beat % 32;
  if (n % 8 === 0 || n === 11 || n === 22)
    sound({ wave: 'sine', freq: 105, dur: 0.14, vol: 0.25, sweep: -600 });
  else if (n % 8 === 4) sound({ wave: 'noise', dur: 0.07, vol: 0.13 });
  else if (n % 2 === 0) sound({ wave: 'noise', dur: 0.025, vol: 0.045 });
  if (n % 2 === 1)
    sound({
      wave: 'triangle',
      freq: [65.4, 65.4, 98, 87.3, 77.8, 65.4, 116.5, 98][Math.floor(n / 4)],
      dur: 0.14,
      vol: 0.13,
    });
  if (n % 4 === 2)
    sound({
      wave: 'sine',
      freq: [261.6, 311.1, 392, 466.2][Math.floor(n / 8)],
      dur: 0.22,
      vol: 0.055,
    });
  if (n % 2 === 0 && state === 'racing')
    sound({ wave: 'sawtooth', freq: 38 + player.speed * 1.7, dur: 0.18, vol: 0.025 });
  if (n % 8 === 3 && player.speed > 50)
    sound({ wave: 'noise', dur: 0.18, vol: player.speed * 0.0003 });
}
function resetRace() {
  player = newCraft();
  rivals = Array.from({ length: 5 }, (_, i) => newCraft(8 + Math.floor(i / 2) * 7, i % 2 ? 3 : -3));
  // Rivals begin ahead of the line but must still visit every ordered checkpoint.
  best = nova64.data.loadData('breakwater_best_' + mode, 0);
  acc = 0;
  countdown = 3;
  state = 'countdown';
  camera = null;
  lastNotice = '';
  soundClock = 0;
  beat = 0;
}
export async function init() {
  meshes.forEach(id => S.destroyMesh(id));
  batches.forEach(id => S.removeInstancedMesh(id));
  meshes = [];
  batches = [];
  createGradientSkybox(0x200053, 0x001b73, {
    horizonColor: 0x0627a5,
    clouds: 0,
    stars: 0.35,
    aurora: 0.8,
    auroraColors: [0x00ffb9, 0x6b13ff],
    wind: 0.6,
  });
  nova64.light.enableSkyboxAutoAnimate(0.35);
  setAmbientLight(0xc8d9ff, 1.35);
  setLightDirection(-0.5, 1, 0.2);
  setLightColor(0xdcecff);
  setFog(0x0627a5, 260, 850);
  nova64.post.setBloom(0.6, 0.55, 0.75);
  nova64.fx.enableFXAA();
  nova64.post.setVignette(0.25, 0.95);
  nova64.post.setChromatic(0.0006);
  setCameraFOV(68);
  buildPort();
  ships = await Promise.all([0, 1, 2, 3, 4, 5].map(makeShip));
  auto = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  muted = nova64.data.loadData('breakwater_muted', false);
  resetRace();
  state = 'title';
}
function hit(x, y, w, h) {
  return I.mouseX() >= x && I.mouseX() < x + w && I.mouseY() >= y && I.mouseY() < y + h;
}
function toggleMute() {
  muted = !muted;
  nova64.data.saveData('breakwater_muted', muted);
}
export function update(dt) {
  dt = Math.min(dt, 0.1);
  clock += dt;
  const pointer = I.mouseDown(),
    clicked = pointer && !pointerWasDown;
  pointerWasDown = pointer;
  if (I.keyp('KeyM') || (clicked && hit(549, 6, 83, 24))) toggleMute();
  if (I.keyp('KeyT') || (clicked && hit(438, 6, 105, 24))) auto = !auto;
  const confirm = I.keyp('Enter') || I.btnp(12);
  if (state === 'title' || state === 'results') {
    if (I.keyp('ArrowUp') || I.keyp('ArrowDown') || I.keyp('Tab') || I.btnp(5))
      selected = 1 - selected;
    if (clicked && hit(24, 213, 268, 39)) {
      mode = 'race';
      resetRace();
    } else if (clicked && hit(24, 260, 268, 39)) {
      mode = 'trial';
      resetRace();
    } else if (confirm || I.keyp('Space')) {
      mode = selected ? 'trial' : 'race';
      resetRace();
    }
  } else if (confirm || I.keyp('Escape') || I.keyp('KeyP')) {
    if (state === 'paused') state = countdown > 0 ? 'countdown' : 'racing';
    else state = 'paused';
  }
  if (state === 'paused' && (I.keyp('KeyR') || (clicked && hit(235, 229, 170, 39)))) resetRace();
  if (state === 'paused' && clicked && hit(235, 184, 170, 39))
    state = countdown > 0 ? 'countdown' : 'racing';
  if (state === 'racing' && I.keyp('KeyR')) {
    step(player, { recover: true });
  }
  if (state === 'countdown') {
    const before = Math.ceil(countdown);
    countdown -= dt;
    if (Math.ceil(countdown) !== before)
      sound({ wave: 'sine', freq: countdown > 0 ? 440 : 880, dur: 0.13, vol: 0.2 });
    if (countdown <= 0) {
      countdown = 0;
      state = 'racing';
    }
  }
  if (state === 'racing') {
    const steer =
      (I.key('ArrowRight') || I.key('KeyD') ? 1 : 0) -
      (I.key('ArrowLeft') || I.key('KeyA') ? 1 : 0) +
      (I.gamepadAxis('leftX') || 0);
    const brake = I.key('ArrowDown') || I.btn(5);
    const input = {
      steer,
      throttle: auto || I.key('ArrowUp') || I.key('KeyW') || I.btn(4),
      brake,
      leftBrake: I.key('KeyQ') || I.btn(6) || (brake && steer < 0),
      rightBrake: I.key('KeyE') || I.btn(7) || (brake && steer > 0),
      boost: I.key('Space') || I.btn(13),
    };
    acc += dt;
    while (acc >= STEP) {
      step(player, input);
      if (mode === 'race') rivals.forEach((r, i) => step(r, aiInput(r, i + 1)));
      acc -= STEP;
    }
    if (player.notice !== lastNotice && player.noticeTime > 0) {
      lastNotice = player.notice;
      if (lastNotice === 'STRIP KICK')
        sound({ wave: 'triangle', freq: 210, dur: 0.15, sweep: 3500, vol: 0.25 });
      else if (lastNotice.includes('SLIP'))
        sound({ wave: 'sine', freq: 660, dur: 0.3, sweep: 660, vol: 0.25 });
      else if (lastNotice.includes('CONTACT') || lastNotice.includes('SCRAPE'))
        sound({ wave: 'noise', dur: 0.08, vol: 0.18 });
    }
    if (player.finished) {
      state = 'results';
      if (!best || player.time < best) {
        best = player.time;
        nova64.data.saveData('breakwater_best_' + mode, best);
      }
    }
  }
  if (state === 'racing' || state === 'countdown') music(dt);
  animateRibbons();
  ships.forEach((parts, i) => positionShip(parts, i === 0 ? player : rivals[i - 1], i));
  const r = sample(player.s),
    behind = sample(player.s - 9.5),
    ahead = sample(player.s + 20 + player.speed * 0.22);
  const pos = [
    behind.x - r.tz * player.lane * 0.65,
    Math.max(behind.y + 3.8, r.y + 3.4),
    behind.z + r.tx * player.lane * 0.65,
  ];
  if (state === 'title') {
    pos[0] = r.x + 14;
    pos[1] = r.y + 8;
    pos[2] = r.z + 15;
  }
  if (!camera) camera = pos;
  camera = camera.map((v, i) => v + (pos[i] - v) * (1 - Math.exp(-dt * 11)));
  setCameraPosition(...camera);
  setCameraTarget(ahead.x, ahead.y + 1.5, ahead.z);
  setCameraFOV(72 + Math.min(3, player.speed / 30) + (player.boost > 0 ? 6 : 0));
}
// Draw in the runtime framebuffer; input remains in its documented 640 x 360 design space.
function color(c) {
  return typeof c === 'bigint' ? c : D.rgba8((c >> 16) & 255, (c >> 8) & 255, c & 255, 255);
}
function rect(x, y, w, h, c) {
  D.rect(
    (x * D.screenWidth()) / 640,
    (y * D.screenHeight()) / 360,
    (w * D.screenWidth()) / 640,
    (h * D.screenHeight()) / 360,
    color(c),
    true
  );
}
function text(str, x, y, c = C.white, size = 1) {
  D.print(
    str,
    (x * D.screenWidth()) / 640,
    (y * D.screenHeight()) / 360,
    color(c),
    size * Math.min(D.screenWidth() / 640, D.screenHeight() / 360)
  );
}
function button(label, x, y, w, active) {
  rect(x, y, w, 39, active ? C.green : C.ink);
  text(label, x + 12, y + 14, active ? C.ink : C.white, 1.3);
}
function leagueMark(x, y, c = C.green) {
  for (let bar = 0; bar < 3; bar++)
    for (let row = 0; row < 7; row++) rect(x + bar * 11 + row, y + row * 2, 5, 2, c);
}
function raceButton(label, number, y, active) {
  rect(24, y, 268, 39, active ? C.green : C.white);
  rect(24, y, 38, 39, C.ink);
  text(number, 32, y + 12, active ? C.green : C.cyan, 1.7);
  text(label, 72, y + 13, C.ink, 1.35);
  text('>', 274, y + 12, C.ink, 1.6);
}
export function draw() {
  D.cls3D();
  rect(12, 8, 616, 26, C.ink);
  leagueMark(20, 14);
  text('BW/64', 62, 16, C.white, 1.1);
  text('MIDNIGHT FREIGHT LEAGUE', 130, 17, C.cyan, 0.85);
  text('AUTO ' + (auto ? 'ON' : 'OFF') + ' [T]', 440, 17, C.white, 0.8);
  text(muted ? 'MUTE [M]' : 'SND+ [M]', 554, 17, C.green, 0.8);
  if (state === 'title' || state === 'results') {
    rect(24, 52, 296, 149, C.ink);
    rect(24, 52, 5, 149, C.green);
    text('SPILLWAY / COASTAL DIVISION', 40, 65, C.cyan, 0.9);
    text(
      state === 'results' ? 'CLASSIFIED' : 'BREAKWATER',
      40,
      88,
      C.white,
      state === 'results' ? 3.6 : 4.1
    );
    text(state === 'results' ? timeText(player.time) : 'CIRCUIT_', 40, 124, C.green, 3.8);
    text(
      state === 'results'
        ? `P${position()} / ${mode === 'race' ? '06' : '01'}    PENALTY +${player.penalty}.00`
        : 'PORT CLOSES 00:00 / WE OPEN 00:01',
      40,
      167,
      C.white,
      0.95
    );
    text(
      state === 'results'
        ? `PERSONAL BEST / ${timeText(best)}`
        : '3 LAPS. NO WEAPONS. KEEP YOUR LINE.',
      40,
      184,
      C.cyan,
      0.9
    );
    raceButton(state === 'results' ? 'RACE AGAIN' : 'QUICK RACE', '01', 213, selected === 0);
    raceButton('TIME TRIAL', '02', 260, selected === 1);
    rect(534, 52, 94, 95, C.green);
    text('00', 545, 62, C.ink, 5);
    text(':01', 545, 108, C.ink, 2.8);
    rect(534, 151, 94, 22, C.ink);
    text('AFTER HOURS', 541, 159, C.white, 0.9);
    for (let i = 0; i < 12; i++) rect(534 + i * 8, 180, 3 + (i % 3), 16, C.white);
    rect(24, 312, 604, 40, C.ink);
    text('W/UP THROTTLE   A/D STEER   Q/E AIRBRAKES   SPACE BOOST', 34, 320, C.white, 0.95);
    text('ENTER START/PAUSE   PAD: X GAS / B BOOST / LB+RB BRAKES', 34, 337, C.cyan, 0.85);
    return;
  }
  // Asymmetric timing blocks: position is oversized, essentials stay out of the racing line.
  rect(12, 46, 88, 77, C.green);
  text('POSITION', 20, 53, C.ink, 0.85);
  text(String(position()).padStart(2, '0'), 18, 68, C.ink, 4.5);
  text('/' + (mode === 'race' ? '06' : '01'), 68, 107, C.ink, 1);
  rect(104, 46, 74, 27, C.ink);
  text('LAP', 110, 53, C.cyan, 0.75);
  text(`${Math.min(3, player.lap + 1)}/3`, 136, 53, C.white, 1.35);
  rect(104, 77, 104, 25, C.white);
  text(timeText(player.time), 112, 85, C.ink, 1.15);
  rect(504, 46, 124, 59, C.ink);
  text('VELOCITY / KMH', 514, 54, C.cyan, 0.75);
  text(String(Math.round(player.speed * 5)).padStart(3, '0'), 514, 70, C.white, 3.1);
  for (let i = 0; i < 16; i++)
    rect(506 + i * 7.5, 110, 5, 4, i < player.speed / 7 ? C.green : C.ink);
  // The route diagram is cartographic, never a substitute for physical checkpoint order.
  for (let i = 0; i < course.length; i += 3) {
    const p = course[i];
    rect(534 + p.x * 0.2, 183 + p.z * 0.14, 1.3, 1.3, C.white);
  }
  for (const p of [player, ...(mode === 'race' ? rivals : [])]) {
    const q = sample(p.s);
    rect(533 + q.x * 0.2, 182 + q.z * 0.14, 3, 3, p === player ? C.green : C.cyan);
  }
  rect(188, 304, 264, 42, C.ink);
  rect(188, 304, 34, 42, C.cyan);
  text(String(player.sector + 1).padStart(2, '0'), 193, 315, C.ink, 2);
  text(sectors[player.sector].name.slice(5), 230, 312, C.white, 0.9);
  for (let i = 0; i < 20; i++)
    rect(230 + i * 9, 331, 6, 6, i < player.charge * 20 ? C.cyan : 0x1f3c4b);
  text(player.charge >= 1 ? 'GO' : 'SC', 419, 330, C.green, 0.9);
  if (player.noticeTime > 0) {
    rect(188, 273, 264, 23, C.green);
    text(player.notice, 200, 281, C.ink, 1);
  }
  if (state === 'countdown') {
    rect(276, 135, 88, 88, C.green);
    text('GRID / ARMED', 284, 145, C.ink, 0.8);
    text(String(Math.ceil(countdown)), 302, 165, C.ink, 5);
    leagueMark(300, 206, C.ink);
  }
  if (state === 'paused') {
    rect(185, 112, 270, 160, C.ink);
    text('HOLD / PAUSED', 208, 134, C.green, 2);
    button('RESUME', 235, 184, 170, true);
    button('RETRY [R]', 235, 229, 170, false);
  }
}
function position() {
  return mode === 'trial' ? 1 : 1 + rivals.filter(r => r.s > player.s).length;
}
