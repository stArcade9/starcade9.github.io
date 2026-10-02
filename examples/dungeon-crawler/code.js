// Nova64 Game Cart: CRYSTAL DUNGEON
// Top-down dungeon crawler. Arrow keys to move, Z to attack.
// Clear each room to unlock the exit. Reach the crystal!
//
// Showcases: createCube, createSphere, createCylinder, createTorus,
//             createInstancedMesh, setInstanceTransform, setInstanceColor,
//             setInstanceVisible, project3DToScreen, getMeshPos, setMeshPos,
//             setMeshColor, setCamera, getViewDirection

const CELL = 2;          // world units per tile
const ROOM_W = 9;
const ROOM_H = 7;
const WALL_H = 1.6;
const CAM_H  = 10;
const ENEMY_SPEED = 2.5;
const ATTACK_RANGE = 1.8;
const ATTACK_COOLDOWN = 0.4;

// ─── Tilemap (1=wall, 0=floor, 2=exit) ────────────────────────────────────────
const MAP = [
   [1,1,1,1,1,1,1,1,1],
   [1,0,0,0,1,0,0,0,1],
   [1,0,0,0,0,0,0,0,1],
   [1,0,0,0,1,0,0,0,1],
   [1,0,0,0,0,0,0,0,1],
   [1,0,0,0,1,0,0,2,1],
   [1,1,1,1,1,1,1,1,1],
];

const ENEMY_SPAWNS = [{tx:2,ty:2},{tx:6,ty:2},{tx:2,ty:4},{tx:6,ty:4},{tx:4,ty:3}];

// ─── State ────────────────────────────────────────────────────────────────────
let player, px, pz, pAngle;
let hp = 5, maxHp = 5;
let attackTimer = 0, invincTimer = 0;
let score = 0, won = false, dead = false;
let t = 0;

let wallMeshes = [], floorMesh, exitMesh, crystalMesh;
let wallInstanced;
let enemies = [];
let hitEffects = [];
let swingMesh;
let swingActive = false, swingAngle = 0;

// ─── Init ─────────────────────────────────────────────────────────────────────
export function init() {
   t = 0; score = 0; won = false; dead = false;
   hp = maxHp; attackTimer = 0; invincTimer = 0;

   // Floor
   floorMesh = createCube(ROOM_W * CELL, 0.1, ROOM_H * CELL, rgba8(30, 40, 60, 255));
   setPosition(floorMesh, (ROOM_W - 1) * CELL / 2, -0.05, (ROOM_H - 1) * CELL / 2);

   // Walls via instanced mesh
   const wallCount = countTiles(1);
   wallInstanced = createInstancedMesh('cube', wallCount);
   let wi = 0;
   for (let ty = 0; ty < ROOM_H; ty++) {
      for (let tx = 0; tx < ROOM_W; tx++) {
         if (MAP[ty][tx] !== 1) continue;
         const wx = tx * CELL, wz = ty * CELL;
         setInstanceTransform(wallInstanced, wi, [
            CELL,0,0,0, 0,WALL_H,0,0, 0,0,CELL,0, wx,WALL_H/2,wz,1
         ]);
         const shade = 50 + (tx + ty) % 5 * 8;
         setInstanceColor(wallInstanced, wi, rgba8(shade, shade + 10, shade + 30, 255));
         wi++;
      }
   }

   // Exit tile
   const [ex, ez] = tileToWorld(7, 5);
   exitMesh = createCylinder(0.6, 0.6, 0.08, rgba8(80, 255, 120, 200));
   setPosition(exitMesh, ex, 0.04, ez);

   // Crystal on exit
   crystalMesh = createTorus(0.3, 0.08, rgba8(140, 240, 255, 255));
   setPosition(crystalMesh, ex, 1.0, ez);

   // Player (sphere)
   const [spx, spz] = tileToWorld(1, 1);
   px = spx; pz = spz; pAngle = 0;
   player = createSphere(0.38, rgba8(255, 220, 80, 255));
   setPosition(player, px, 0.38, pz);

   // Attack swing indicator (thin cylinder)
   swingMesh = createCylinder(0.06, 0.06, 1.4, rgba8(255, 200, 40, 200));
   setMeshVisible(swingMesh, false);

   // Enemies
   enemies = [];
   for (const sp of ENEMY_SPAWNS) {
      const [ex2, ez2] = tileToWorld(sp.tx, sp.ty);
      const m = createSphere(0.36, rgba8(220, 60, 80, 255));
      setPosition(m, ex2, 0.36, ez2);
      enemies.push({ mesh: m, x: ex2, z: ez2, hp: 2, maxHp: 2, hitTimer: 0 });
   }

   // Camera: top-down perspective
   setCameraPosition(px, CAM_H, pz + 2);
   setCameraTarget(px, 0, pz);
}

function countTiles(v) {
   let n = 0;
   for (const row of MAP) for (const c of row) if (c === v) n++;
   return n;
}

function tileToWorld(tx, ty) {
   return [tx * CELL, ty * CELL];
}

function tileAt(wx, wz) {
   const tx = Math.round(wx / CELL), tz = Math.round(wz / CELL);
   if (tx < 0 || tx >= ROOM_W || tz < 0 || tz >= ROOM_H) return 1;
   return MAP[tz][tx];
}

function canMove(wx, wz) {
   const r = 0.35;
   return tileAt(wx - r, wz) !== 1 && tileAt(wx + r, wz) !== 1 &&
          tileAt(wx, wz - r) !== 1 && tileAt(wx, wz + r) !== 1;
}

// ─── Update ───────────────────────────────────────────────────────────────────
export function update(dt) {
   if (won || dead) { if (btnp("z")) init(); return; }
   t += dt;
   attackTimer -= dt;
   invincTimer -= dt;

   // Player move
   const spd = 4 * dt;
   let mx = 0, mz = 0;
   if (btn("left"))  { mx -= spd; pAngle = -Math.PI / 2; }
   if (btn("right")) { mx += spd; pAngle =  Math.PI / 2; }
   if (btn("up"))    { mz -= spd; pAngle = Math.PI; }
   if (btn("down"))  { mz += spd; pAngle = 0; }

   if (canMove(px + mx, pz))    px += mx;
   if (canMove(px, pz + mz))    pz += mz;
   setPosition(player, px, 0.38, pz);
   setRotation(player, 0, pAngle, 0);

   // Camera follows
   setCameraPosition(px, CAM_H, pz + 3);
   setCameraTarget(px, 0, pz);

   // Crystal spin
   setRotation(crystalMesh, t * 0.8, t * 1.2, 0);

   // Attack
   const attacking = btnp("z") && attackTimer <= 0;
   if (attacking) {
      attackTimer = ATTACK_COOLDOWN;
      swingActive = true; swingAngle = 0;
      // Check each enemy
      for (const e of enemies) {
         if (e.hp <= 0) continue;
         const dx = e.x - px, dz = e.z - pz;
         if (Math.sqrt(dx*dx + dz*dz) < ATTACK_RANGE) {
            e.hp--;
            e.hitTimer = 0.2;
            score += 20;
            hitEffects.push({ x: e.x, z: e.z, age: 0 });
            if (e.hp <= 0) {
               setMeshVisible(e.mesh, false);
               score += 50;
            }
         }
      }
   }

   if (swingActive) {
      swingAngle += dt * 12;
      const sx = px + Math.sin(pAngle + swingAngle * 0.5) * 0.8;
      const sz = pz + Math.cos(pAngle + swingAngle * 0.5) * 0.8;
      setPosition(swingMesh, sx, 0.6, sz);
      setMeshVisible(swingMesh, true);
      if (swingAngle > Math.PI) swingActive = false;
   } else {
      setMeshVisible(swingMesh, false);
   }

   // Enemy AI
   for (const e of enemies) {
      if (e.hp <= 0) continue;
      e.hitTimer -= dt;
      const dx = px - e.x, dz = pz - e.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < 0.01) continue;
      // Simple chase
      const spd2 = ENEMY_SPEED * dt;
      const nx = e.x + (dx / dist) * spd2;
      const nz = e.z + (dz / dist) * spd2;
      if (canMove(nx, e.z)) e.x = nx;
      if (canMove(e.x, nz)) e.z = nz;
      setPosition(e.mesh, e.x, 0.36, e.z);
      setRotation(e.mesh, 0, Math.atan2(dx, dz), 0);
      setMeshColor(e.mesh, e.hitTimer > 0 ? rgba8(255, 255, 80, 255) : rgba8(220, 60, 80, 255));

      // Damage player
      if (dist < 0.7 && invincTimer <= 0) {
         hp--;
         invincTimer = 0.8;
         if (hp <= 0) { dead = true; return; }
      }
   }

   // Exit check — all enemies dead?
   const allDead = enemies.every(e => e.hp <= 0);
   if (allDead) {
      setMeshColor(exitMesh, rgba8(80, 255, 120, 255));
      const [ex, ez] = tileToWorld(7, 5);
      const ddx = px - ex, ddz = pz - ez;
      if (Math.sqrt(ddx*ddx + ddz*ddz) < 1.0) won = true;
   } else {
      setMeshColor(exitMesh, rgba8(80, 80, 80, 150));
   }

   // Hit effects age
   hitEffects = hitEffects.filter(h => { h.age += dt; return h.age < 0.3; });
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
export function draw() {
   cls(rgba8(6, 8, 18, 255));

   if (won) {
      printBold('ROOM CLEARED!', 196, 140, rgba8(80, 255, 160, 255));
      print('Score: ' + score, 254, 162, rgba8(200, 220, 255, 255));
      print('Z to play again', 218, 182, rgba8(160, 200, 255, 180));
      return;
   }
   if (dead) {
      printBold('DEFEATED', 222, 150, rgba8(255, 80, 80, 255));
      print('Z to retry', 248, 170, rgba8(200, 200, 255, 200));
      return;
   }

   // Hit effects overlay via project3DToScreen
   for (const h of hitEffects) {
      const p = project3DToScreen(h.x, 0.5, h.z);
      if (p && p.visible) {
         const r = Math.floor((1 - h.age / 0.3) * 16);
         circfill(Math.floor(p.x), Math.floor(p.y), r, rgba8(255, 200, 40, 200 - h.age * 600));
      }
   }

   // Enemy HP bars
   for (const e of enemies) {
      if (e.hp <= 0) continue;
      const p = project3DToScreen(e.x, 1.0, e.z);
      if (p && p.visible) {
         rect(Math.floor(p.x) - 14, Math.floor(p.y) - 4, 28, 4, rgba8(40, 20, 20, 180));
         rect(Math.floor(p.x) - 14, Math.floor(p.y) - 4,
              Math.floor(28 * e.hp / e.maxHp), 4, rgba8(220, 60, 60, 220));
      }
   }

   // HUD
   printBold('CRYSTAL DUNGEON', 4, 4, rgba8(140, 200, 255, 255));
   print('Score: ' + score, 4, 18, rgba8(200, 220, 255, 220));

   // HP bar
   rect(4, 340, 100, 10, rgba8(40, 20, 20, 220));
   rect(4, 340, Math.floor(100 * hp / maxHp), 10, rgba8(255, 80, 80, 220));
   print('HP', 110, 340, rgba8(200, 200, 220, 200));

   // Enemies remaining
   const rem = enemies.filter(e => e.hp > 0).length;
   print('Enemies: ' + rem, 4, 28, rgba8(200, 160, 160, 200));
   if (rem === 0) {
      print('> Reach the EXIT!', 4, 40, rgba8(80, 255, 120, 220));
   }

   // Controls reminder
   print('Arrows:move  Z:attack', 4, 348, rgba8(120, 140, 180, 140));
}
