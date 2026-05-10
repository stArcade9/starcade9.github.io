// 🌌 NOVA DRIFT — Deep Space Crystal Hunter
// Free-fly through an asteroid field, collect all 15 energy crystals
//
// Controls:  W / SPACE = thrust   S = brake
//            A / D     = yaw      Q / E = pitch

const { print, rgba8 } = nova64.draw;
const { createCube, createSphere, removeMesh, rotateMesh } = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const {
  animateSkybox,
  createSpaceSkybox,
  setAmbientLight,
  setFog,
  setLightColor,
  setLightDirection,
} = nova64.light;
const { enableBloom, enableFXAA, enableVignette } = nova64.fx;
const { key } = nova64.input;
const { sfx } = nova64.audio;
const { clamp } = nova64.util;

let time = 0;
let pos = { x: 0, y: 0, z: 10 };
let vel = { x: 0, y: 0, z: 0 };
let yaw = 0; // horizontal bearing, degrees
let pitch = 0; // vertical bearing,   degrees
let score = 0;
let collected = 0;

const TOTAL = 15;
const THRUST = 14;
const TURN_SPD = 55;
const PITCH_SPD = 40;
const DRAG = 0.88;

let asteroids = [];
let crystals = [];

// ── Init ─────────────────────────────────────────────────────────────────────
export async function init() {
  // Deep-space skybox
  nova64.light.createSpaceSkybox({
    starCount: 3000,
    starSize: 2.2,
    nebulae: true,
    nebulaColor: 0x0a0033,
  });
  nova64.light.setFog(0x000511, 100, 500);

  // Cinematic lighting
  nova64.light.setAmbientLight(0x202040, 1.0);
  nova64.light.setLightDirection(-0.4, -1, -0.3);
  nova64.light.setLightColor(0xaaaaff);

  // Post-processing
  nova64.fx.enableBloom(1.0, 0.5, 0.5);
  nova64.fx.enableFXAA();
  nova64.fx.enableVignette(1.0, 0.85);

  // ── Asteroid field ──────────────────────────────────────────────────────
  for (let i = 0; i < 45; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 200;
    const x = Math.cos(angle) * dist + (Math.random() - 0.5) * 60;
    const y = (Math.random() - 0.5) * 80;
    const z = Math.sin(angle) * dist + (Math.random() - 0.5) * 60;
    const r = 2 + Math.random() * 9;
    const mesh = nova64.scene.createSphere(r, 0x554433, [x, y, z], 7, {
      material: 'standard',
      roughness: 0.95,
    });
    asteroids.push({
      mesh,
      x,
      y,
      z,
      rx: (Math.random() - 0.5) * 0.3,
      ry: (Math.random() - 0.5) * 0.3,
      rz: (Math.random() - 0.5) * 0.15,
    });
  }

  // ── Distant planets ─────────────────────────────────────────────────────
  const planetDefs = [
    { x: 250, y: -40, z: -300, r: 50, color: 0x3355aa },
    { x: -400, y: 30, z: -150, r: 70, color: 0xaa3333 },
    { x: 80, y: 60, z: 320, r: 35, color: 0x228855 },
  ];
  for (const p of planetDefs) {
    nova64.scene.createSphere(p.r, p.color, [p.x, p.y, p.z], 20, {
      material: 'standard',
      roughness: 0.7,
    });
  }

  // ── Energy crystals ──────────────────────────────────────────────────────
  const palette = [0x00ffcc, 0xff44ff, 0xffdd00, 0x44aaff];
  for (let i = 0; i < TOTAL; i++) {
    const angle = (i / TOTAL) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const dist = 40 + Math.random() * 120;
    const x = Math.cos(angle) * dist;
    const y = (Math.random() - 0.5) * 50;
    const z = Math.sin(angle) * dist;
    const color = palette[i % palette.length];
    const mesh = nova64.scene.createCube(2.5, color, [x, y, z], {
      material: 'emissive',
      emissive: color,
    });
    crystals.push({ mesh, x, y, z, active: true });
  }

  nova64.camera.setCameraFOV(75);
  nova64.camera.setCameraPosition(pos.x, pos.y, pos.z);
  nova64.camera.setCameraTarget(0, 0, 0);
}

// ── Update ────────────────────────────────────────────────────────────────────
export function update(dt) {
  time += dt;

  // Yaw
  if (nova64.input.key('KeyA') || nova64.input.key('ArrowLeft')) yaw += TURN_SPD * dt;
  if (nova64.input.key('KeyD') || nova64.input.key('ArrowRight')) yaw -= TURN_SPD * dt;

  // Pitch  (clamp to ±75°)
  if (nova64.input.key('KeyQ') || nova64.input.key('ArrowUp'))
    pitch = Math.min(pitch + PITCH_SPD * dt, 75);
  if (nova64.input.key('KeyE') || nova64.input.key('ArrowDown'))
    pitch = Math.max(pitch - PITCH_SPD * dt, -75);

  // Forward direction
  const yRad = (yaw * Math.PI) / 180;
  const pRad = (pitch * Math.PI) / 180;
  const fdx = -Math.sin(yRad) * Math.cos(pRad);
  const fdy = Math.sin(pRad);
  const fdz = -Math.cos(yRad) * Math.cos(pRad);

  // Thrust / brake
  if (nova64.input.key('KeyW') || nova64.input.key('Space')) {
    vel.x += fdx * THRUST * dt;
    vel.y += fdy * THRUST * dt;
    vel.z += fdz * THRUST * dt;
  }
  if (nova64.input.key('KeyS')) {
    vel.x -= fdx * THRUST * 0.5 * dt;
    vel.y -= fdy * THRUST * 0.5 * dt;
    vel.z -= fdz * THRUST * 0.5 * dt;
  }

  // Drag + integrate
  vel.x *= DRAG;
  vel.y *= DRAG;
  vel.z *= DRAG;
  pos.x += vel.x;
  pos.y += vel.y;
  pos.z += vel.z;

  nova64.camera.setCameraPosition(pos.x, pos.y, pos.z);
  nova64.camera.setCameraTarget(pos.x + fdx, pos.y + fdy, pos.z + fdz);

  // Rotate asteroids
  for (const a of asteroids) {
    nova64.scene.rotateMesh(a.mesh, a.rx * dt, a.ry * dt, a.rz * dt);
  }

  // Spin crystals + collect on proximity
  for (const c of crystals) {
    if (!c.active) continue;
    nova64.scene.rotateMesh(c.mesh, 0.5 * dt, 1.2 * dt, 0.3 * dt);
    const dx = pos.x - c.x,
      dy = pos.y - c.y,
      dz = pos.z - c.z;
    if (dx * dx + dy * dy + dz * dz < 100) {
      // ≤ 10 unit radius
      nova64.scene.removeMesh(c.mesh);
      c.active = false;
      collected++;
      score += 100;
      nova64.audio.sfx('coin');
      if (collected >= TOTAL) nova64.audio.sfx('powerup');
    }
  }

  nova64.light.animateSkybox(dt);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
export function draw() {
  const spd = Math.round(Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z) * 10);

  // Top-left HUD
  nova64.draw.print(
    `CRYSTALS  ${score.toString().padStart(6, '0')}`,
    16,
    16,
    nova64.draw.rgba8(0, 255, 200, 255)
  );
  nova64.draw.print(
    `SPEED     ${spd.toString().padStart(3)} u/s`,
    16,
    36,
    nova64.draw.rgba8(160, 200, 255, 210)
  );
  nova64.draw.print(
    `REMAINING ${collected} / ${TOTAL}`,
    16,
    56,
    nova64.draw.rgba8(255, 220, 80, 200)
  );

  // Controls hint — fades out after 8 s
  if (time < 8) {
    const a = Math.min(255, Math.floor((8 - time) * 50));
    nova64.draw.print(
      'W / SPACE — Thrust     S — Brake',
      320,
      328,
      nova64.draw.rgba8(200, 200, 200, a)
    );
    nova64.draw.print(
      'A / D     — Turn       Q / E — Pitch',
      320,
      346,
      nova64.draw.rgba8(200, 200, 200, a)
    );
  }

  // Victory screen
  if (collected >= TOTAL) {
    const pulse = Math.floor((Math.sin(time * 4) * 0.5 + 0.5) * 255);
    nova64.draw.print('ALL CRYSTALS COLLECTED!', 320, 170, nova64.draw.rgba8(0, 255, 200, pulse));
    nova64.draw.print(`FINAL SCORE  ${score}`, 320, 194, nova64.draw.rgba8(255, 220, 0, 255));
  }
}
