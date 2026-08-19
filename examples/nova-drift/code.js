// Nova64 Game Cart: NOVA DRIFT
// 6DOF asteroid field — collect 15 crystals before hostile drones end you.
// Z/Up=Thrust  X/Down=Brake  Left/Right=Yaw  C/V=Pitch  B=BOOST (B key or joypad)
// Boost rams destroy drones. Radar shows crystal/drone positions.

const TOTAL = 15;
const THRUST = 0.32;
const TURN_SPD = 0.95;
const PITCH_SPD = 0.72;
const DRAG = 0.88;
const COLLECT_DIST_SQ = 100;
const DRONE_SPAWN_AT = 5;
const DRONE_BASE_SPEED = 0.14;
const DRONE_DAMAGE = 25;
const DRONE_HIT_DIST = 12;
const BOOST_DRAIN = 55;
const BOOST_REGEN = 22;
const RADAR_CX = 320, RADAR_CY = 334, RADAR_R = 30;
const MAX_RADAR_DIST = 180;

const CRYSTAL_PALETTE = [
   rgba8(0x00, 0xff, 0xcc, 255),
   rgba8(0xff, 0x44, 0xff, 255),
   rgba8(0xff, 0xdd, 0x00, 255),
   rgba8(0x44, 0xaa, 0xff, 255),
];

let time, pos, vel, yaw, pitch;
let score, best, hp, collected;
let asteroids, crystals, planets, drones;
let boostFuel, damageTimer, dronesSpawned;
let gameOver;

function rng() {
   rng._s = ((rng._s | 0) * 1664525 + 1013904223) >>> 0;
   return rng._s / 0x100000000;
}
function writeMat(out, off, sx, sy, sz, tx, ty, tz) {
   out[off+0]=sx; out[off+1]=0;  out[off+2]=0;  out[off+3]=0;
   out[off+4]=0;  out[off+5]=sy; out[off+6]=0;  out[off+7]=0;
   out[off+8]=0;  out[off+9]=0;  out[off+10]=sz;out[off+11]=0;
   out[off+12]=tx;out[off+13]=ty;out[off+14]=tz;out[off+15]=1;
}

function cleanup() {
   if (asteroids && asteroids._mesh) destroyMesh(asteroids._mesh);
   for (const p of (planets  || [])) destroyMesh(p);
   for (const c of (crystals || [])) { if (c.active) destroyMesh(c.mesh); }
   for (const d of (drones   || [])) { if (d.active) destroyMesh(d.mesh); }
}

export function init() {
   cleanup();
   rng._s = 0xc0ffee;
   best = loadData('nd_best', 0);
   time = 0;
   pos  = { x: 0, y: 0, z: 10 };
   vel  = { x: 0, y: 0, z: 0  };
   yaw  = 0; pitch = 0;
   score = 0; hp = 100; collected = 0;
   boostFuel = 100; damageTimer = 0;
   dronesSpawned = false; gameOver = false;
   asteroids = []; crystals = []; planets = []; drones = [];

   setSkyColor(rgba8(8, 4, 28, 255), rgba8(0, 0, 8, 255));
   setFog(rgba8(0, 5, 17, 255), 80, 420);
   setAmbientLight(rgba8(40, 50, 90, 255), 1.0);
   setLightDirection(-0.4, -1, -0.3);
   nova64.post.setBloom(1.4);
   nova64.post.setChromatic(0.003);
   nova64.post.setVignette(0.10, 0.85);
   nova64.post.setCRT(true);
   setCameraFOV(75);

   // Asteroid field (instanced)
   const aMesh = createInstancedMesh('sphere', 45);
   setMeshColor(aMesh, rgba8(85, 68, 51, 255));
   setMeshEmissive(aMesh, rgba8(34, 28, 22, 255), 0.06);
   const aData = new Array(45 * 16);
   for (let i = 0; i < 45; i++) {
      const a = rng() * Math.PI * 2;
      const dist = 30 + rng() * 200;
      const x = Math.cos(a) * dist + (rng() - 0.5) * 60;
      const y = (rng() - 0.5) * 80;
      const z = Math.sin(a) * dist + (rng() - 0.5) * 60;
      const r = 2 + rng() * 9;
      writeMat(aData, i * 16, r, r, r, x, y, z);
      asteroids.push({ x, y, z, r });
   }
   setInstanceTransforms(aMesh, 0, aData);
   asteroids._mesh = aMesh;

   // Planets
   const planetDefs = [
      { x:  250, y: -40, z: -300, r: 50, color: rgba8(0x33, 0x55, 0xaa, 255) },
      { x: -400, y:  30, z: -150, r: 70, color: rgba8(0xaa, 0x33, 0x33, 255) },
      { x:   80, y:  60, z:  320, r: 35, color: rgba8(0x22, 0x88, 0x55, 255) },
   ];
   for (const p of planetDefs) {
      const m = createSphere(p.r, p.color);
      setMeshEmissive(m, p.color, 0.18);
      setPosition(m, p.x, p.y, p.z);
      planets.push(m);
   }

   // Crystals
   for (let i = 0; i < TOTAL; i++) {
      const a = (i / TOTAL) * Math.PI * 2 + (rng() - 0.5) * 0.8;
      const dist = 40 + rng() * 120;
      const x = Math.cos(a) * dist;
      const y = (rng() - 0.5) * 50;
      const z = Math.sin(a) * dist;
      const color = CRYSTAL_PALETTE[i % CRYSTAL_PALETTE.length];
      const m = createCube(2.5, 2.5, 2.5, color);
      setMeshEmissive(m, color, 1.6);
      setPosition(m, x, y, z);
      crystals.push({ mesh: m, x, y, z, active: true, color });
   }

   setCameraPosition(pos.x, pos.y, pos.z);
   setCameraTarget(0, 0, 0);
}

function spawnDrones() {
   const droneColors = [rgba8(255, 40, 40, 255), rgba8(255, 100, 40, 255), rgba8(200, 40, 200, 255)];
   for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + rngRandom() * 0.5;
      const dist = 65 + i * 30;
      const dx = Math.cos(angle) * dist, dz = Math.sin(angle) * dist;
      const col = droneColors[i];
      const m = createCube(1.8, 1.8, 1.8, col);
      setMeshEmissive(m, col, 1.8);
      const sx = pos.x + dx, sy = pos.y + (rngRandom() - 0.5) * 20, sz = pos.z + dz;
      setPosition(m, sx, sy, sz);
      drones.push({ mesh: m, x: sx, y: sy, z: sz, vel: {x:0,y:0,z:0}, active: true });
   }
   sfx('blip');
}

// ── Update ────────────────────────────────────────────────────────────────────
export function update(dt) {
   if (gameOver) {
      if (btnp('z') || btnp('x')) init();
      return;
   }

   time += dt;
   damageTimer = Math.max(0, damageTimer - dt);

   const boosting = (btn('b') || key('KeyB')) && boostFuel > 1;
   boostFuel = boosting
      ? Math.max(0,   boostFuel - BOOST_DRAIN * dt)
      : Math.min(100, boostFuel + BOOST_REGEN * dt);

   // Flight controls
   if (btn('left'))  yaw   += TURN_SPD * dt;
   if (btn('right')) yaw   -= TURN_SPD * dt;
   if (btn('c'))     pitch  = Math.min(pitch + PITCH_SPD * dt,  1.3);
   if (btn('v'))     pitch  = Math.max(pitch - PITCH_SPD * dt, -1.3);

   const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
   const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
   const fdx = -sinY * cosP, fdy = sinP, fdz = -cosY * cosP;
   const thrustMult = boosting ? 2.8 : 1.0;

   if (btn('z') || btn('up')) {
      vel.x += fdx * THRUST * thrustMult;
      vel.y += fdy * THRUST * thrustMult;
      vel.z += fdz * THRUST * thrustMult;
   }
   if (btn('x') || btn('down')) {
      vel.x -= fdx * THRUST * 0.5;
      vel.y -= fdy * THRUST * 0.5;
      vel.z -= fdz * THRUST * 0.5;
   }

   vel.x *= DRAG; vel.y *= DRAG; vel.z *= DRAG;
   pos.x += vel.x; pos.y += vel.y; pos.z += vel.z;
   const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);

   setCameraPosition(pos.x, pos.y, pos.z);
   setCameraTarget(pos.x + fdx, pos.y + fdy, pos.z + fdz);

   // Collect crystals
   for (const c of crystals) {
      if (!c.active) continue;
      rotateMesh(c.mesh, 0.5 * dt, 1.2 * dt, 0.3 * dt);
      const dx = pos.x - c.x, dy = pos.y - c.y, dz = pos.z - c.z;
      if (dx*dx + dy*dy + dz*dz < COLLECT_DIST_SQ) {
         destroyMesh(c.mesh); c.active = false;
         collected++; score += 100;
         sfx('coin');
         if (score > best) { best = score; saveData('nd_best', best); }
         if (collected === TOTAL) sfx('powerup');
      }
   }

   // Spawn drones after 5 crystals
   if (collected >= DRONE_SPAWN_AT && !dronesSpawned) {
      dronesSpawned = true;
      spawnDrones();
   }

   // Drone AI
   for (const d of drones) {
      if (!d.active) continue;
      const ddx = pos.x - d.x, ddy = pos.y - d.y, ddz = pos.z - d.z;
      const ddist = Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz) || 1;
      const dspd = Math.min(DRONE_BASE_SPEED + time * 0.0015, 0.30);
      const wobble = Math.sin(time * 2.5 + d.x * 0.1) * 0.05;
      d.vel.x = d.vel.x * 0.85 + ddx / ddist * dspd + wobble;
      d.vel.y = d.vel.y * 0.85 + ddy / ddist * dspd;
      d.vel.z = d.vel.z * 0.85 + ddz / ddist * dspd;
      d.x += d.vel.x; d.y += d.vel.y; d.z += d.vel.z;
      setPosition(d.mesh, d.x, d.y, d.z);
      rotateMesh(d.mesh, dt * 1.1, dt * 1.6, dt * 0.8);
      setMeshEmissive(d.mesh, rgba8(255, 40, 40, 255), 1.6 + Math.sin(time * 8) * 0.5);

      // Drone hits player
      if (ddist < DRONE_HIT_DIST && damageTimer <= 0) {
         hp -= DRONE_DAMAGE; damageTimer = 1.5; sfx('hit');
         if (hp <= 0) { hp = 0; gameOver = true; sfx('death'); return; }
      }
      // Player boosts into drone
      if (ddist < 10 && speed > 0.4 && boosting) {
         destroyMesh(d.mesh); d.active = false;
         hp = Math.max(0, hp - 15); score += 250;
         sfx('explosion');
         if (score > best) { best = score; saveData('nd_best', best); }
      }
   }
}

// ── Draw ──────────────────────────────────────────────────────────────────────
export function draw() {
   // Bottom HUD panel
   rectfill(0, 300, 640, 68, rgba8(0, 0, 8, 215));
   hline(0, 300, 640, rgba8(60, 180, 255, 200));

   const spd = Math.round(Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z) * 60);
   const bearing = (((-yaw * 180 / Math.PI) % 360) + 360) % 360;
   const pitchDeg = Math.round(pitch * 180 / Math.PI);

   // ── Left: flight data ──
   printBold('NOVA DRIFT', 8, 305, rgba8(80, 200, 255, 255));
   printTight('SPD  ' + spd + ' u/s',                          8, 320, rgba8(160, 220, 255, 220));
   printTight('YAW  ' + Math.round(bearing) + '\xB0',          8, 332, rgba8(160, 220, 255, 180));
   printTight('PTCH ' + (pitchDeg >= 0 ? '+' : '') + pitchDeg + '\xB0', 8, 344, rgba8(160, 220, 255, 160));
   printTight('SCORE ' + score,                                 8, 358, rgba8(255, 220, 80, 255));

   // ── Center-left: bars ──
   printTight('BOOST', 148, 308, rgba8(80, 200, 255, 200));
   drawProgressBar(148, 320, 100, 9, boostFuel / 100, rgba8(80, 220, 255, 255), rgba8(10, 20, 40, 200), rgba8(60, 140, 220, 180));
   printTight('HP', 148, 334, hp > 50 ? rgba8(80, 255, 160, 200) : rgba8(255, 80, 80, 200));
   const hpCol = hp > 50 ? rgba8(80, 255, 160, 255) : hp > 25 ? rgba8(255, 200, 40, 255) : rgba8(255, 60, 60, 255);
   drawProgressBar(148, 346, 100, 9, hp / 100, hpCol, rgba8(20, 10, 10, 200), rgba8(60, 120, 80, 180));
   printTight('BEST  ' + best, 148, 360, rgba8(180, 120, 255, 180));

   // ── Center: radar ──
   glowCircle(RADAR_CX, RADAR_CY, RADAR_R, rgba8(40, 160, 255, 180), 2);
   circ(RADAR_CX, RADAR_CY, Math.floor(RADAR_R * 0.55), rgba8(20, 60, 120, 80));
   hline(RADAR_CX - RADAR_R + 4, RADAR_CY, RADAR_R * 2 - 8, rgba8(30, 70, 130, 80));
   vline(RADAR_CX, RADAR_CY - RADAR_R + 4, RADAR_R * 2 - 8, rgba8(30, 70, 130, 80));
   pset(RADAR_CX, RADAR_CY - RADAR_R + 2, rgba8(120, 220, 255, 255)); // "N" (forward)

   for (const c of crystals) {
      if (!c.active) continue;
      const dx = c.x - pos.x, dz = c.z - pos.z;
      const dist3d = Math.sqrt(dx*dx + (c.y-pos.y)*(c.y-pos.y) + dz*dz);
      const relBearing = Math.atan2(dx, -dz) - yaw;
      const rd = Math.min(RADAR_R - 4, dist3d / MAX_RADAR_DIST * RADAR_R);
      glowCircle(Math.floor(RADAR_CX + Math.sin(relBearing)*rd), Math.floor(RADAR_CY - Math.cos(relBearing)*rd), 2, c.color, 2);
   }
   if (Math.floor(time * 4) % 2 === 0) {
      for (const d of drones) {
         if (!d.active) continue;
         const dx = d.x - pos.x, dz = d.z - pos.z;
         const dist3d = Math.sqrt(dx*dx + (d.y-pos.y)*(d.y-pos.y) + dz*dz);
         const relBearing = Math.atan2(dx, -dz) - yaw;
         const rd = Math.min(RADAR_R - 4, dist3d / MAX_RADAR_DIST * RADAR_R);
         glowCircle(Math.floor(RADAR_CX + Math.sin(relBearing)*rd), Math.floor(RADAR_CY - Math.cos(relBearing)*rd), 3, rgba8(255, 40, 40, 255), 3);
      }
   }
   circfill(RADAR_CX, RADAR_CY, 2, rgba8(80, 255, 200, 255));

   // ── Right: status ──
   const remaining = crystals.filter(c => c.active).length;
   printBold('CRYSTALS', 476, 305, rgba8(80, 255, 200, 220));
   printBold('' + (TOTAL - remaining) + ' / ' + TOTAL, 502, 322, rgba8(255, 220, 80, 255));
   if (dronesSpawned) {
      const da = drones.filter(d => d.active).length;
      printTight('DRONES  ' + da, 476, 342, rgba8(255, 80, 80, 220));
   }
   printTight('B=BOOST (hold)', 476, 356, rgba8(60, 140, 220, 160));

   // Damage flash
   if (damageTimer > 1.2) {
      const flash = Math.floor((damageTimer - 1.2) / 0.3 * 80);
      rectfill(0, 0, 640, 300, rgba8(255, 0, 0, flash));
   }

   // Drone warning
   if (dronesSpawned && time < 22) {
      const a = Math.floor(Math.max(0, Math.min(1, (time - 5) * 2, (22 - time) * 0.5)) * 220);
      if (a > 10) printCentered('! HOSTILE DRONES DETECTED !', 320, 274, rgba8(255, 80, 80, a));
   }

   // Win overlay
   if (collected >= TOTAL && !gameOver) {
      rectfill(140, 96, 360, 100, rgba8(2, 16, 10, 240));
      glowRect(140, 96, 360, 100, rgba8(80, 255, 160, 230), 6);
      printBold('ALL CRYSTALS!', 186, 110, rgba8(80, 255, 160, 255));
      printTight('FINAL SCORE  ' + score, 214, 134, rgba8(255, 220, 80, 255));
      printTight('BEST         ' + best,  214, 148, rgba8(120, 200, 255, 255));
      printCentered('NOVA DRIFT — COMPLETE', 320, 162, rgba8(0, 255, 200, Math.floor(Math.sin(time * 4) * 80 + 175)));
   }

   // Game over overlay
   if (gameOver) {
      rectfill(158, 132, 324, 100, rgba8(8, 4, 18, 240));
      glowRect(158, 132, 324, 100, rgba8(255, 40, 40, 230), 7);
      printBold('SHIP DESTROYED', 176, 148, rgba8(255, 60, 60, 255));
      printTight('SCORE ' + score, 242, 170, rgba8(255, 220, 80, 255));
      printTight('BEST  ' + best,  242, 184, rgba8(120, 200, 255, 255));
      printFlash(218, 202, 'Z to restart', rgba8(200, 200, 255, 255), -time, 1.6);
   }

   // Early hint
   if (time < 8) {
      const a = Math.min(255, Math.floor((8 - time) * 50));
      printCentered('Z/Up Thrust  X/Down Brake  L/R Yaw  C/V Pitch  B Boost', 320, 278, rgba8(200, 200, 200, a));
   }
}
