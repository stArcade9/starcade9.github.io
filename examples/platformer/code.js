// Nova64 Game Cart: PRISM JUMP
// 3D platformer. Arrows move/rotate camera, Z jumps (double-jump!).
// 3 lives, collect coins, reach the golden star. Persistent best score.

const GRAVITY = -16;
const JUMP_SPEED = 7;
const MOVE_SPEED = 5;
const CAM_DIST = 6;
const CAM_HEIGHT = 3;

const COL_PLAYER = rgba8(255, 220, 80, 255);
const COL_GOAL   = rgba8(255, 200, 40, 255);
const COL_COIN   = rgba8(255, 200, 40, 255);

const PLATFORM_DEFS = [
   { x:  0, y: -1, z:  0, w: 6, d: 4, color: rgba8(60,  100, 180, 255) },
   { x:  5, y:  0, z: -3, w: 3, d: 2, color: rgba8(80,  140, 200, 255) },
   { x:  9, y:  1, z: -2, w: 2, d: 2, color: rgba8(100, 160, 220, 255), moveAxis: 'x', amp: 1.8, spd: 1.2 },
   { x:  7, y:  2, z:  2, w: 2, d: 3, color: rgba8(120, 180, 230, 255), moveAxis: 'z', amp: 1.2, spd: 0.9 },
   { x:  3, y:  3, z:  4, w: 3, d: 2, color: rgba8(140, 200, 240, 255) },
   { x: -1, y:  4, z:  3, w: 2, d: 2, color: rgba8(160, 220, 255, 255) },  // goal pad
];

// ── Global state ──────────────────────────────────────────────────────────────
let player, goalMesh;
let playerX, playerY, playerZ;
let velX, velY, velZ;
let grounded, wasGrounded, jumpsLeft;
let platforms = [], coins = [];
let camYaw = 0;
let t = 0, goalAngle = 0;
let score = 0, best = 0, lives = 3;
let state = 'playing'; // 'playing' | 'dead' | 'game_over' | 'won'

// ── Scene helpers ─────────────────────────────────────────────────────────────
function buildLevel() {
   for (const p of platforms) if (p.mesh) destroyMesh(p.mesh);
   platforms = [];
   for (const c of coins)     if (c.mesh) destroyMesh(c.mesh);
   coins = [];

   for (const def of PLATFORM_DEFS) {
      const mesh = createCube(def.w, 0.5, def.d, def.color, [def.x, def.y - 0.25, def.z]);
      setMeshEmissive(mesh, def.color, 0.22);
      platforms.push({ mesh, baseX: def.x, baseZ: def.z, cx: def.x, cz: def.z, ...def });
   }

   for (let i = 1; i < PLATFORM_DEFS.length - 1; i++) {
      const p = PLATFORM_DEFS[i];
      const mesh = createSphere(0.18, COL_COIN, [p.x, p.y + 0.85, p.z]);
      setMeshEmissive(mesh, COL_COIN, 2.0);
      coins.push({ mesh, x: p.x, z: p.z, baseY: p.y + 0.85, collected: false });
   }
}

function spawnPlayer() {
   playerX = 0; playerY = 0.5; playerZ = 0;
   velX = 0; velY = 0; velZ = 0;
   grounded = true; wasGrounded = true; jumpsLeft = 2;
   setPosition(player, playerX, playerY, playerZ);
}

export function init() {
   best = loadData('pj_best', 0);

   clearSkybox();
   createGradientSkybox(0x2a5fa0, 0x080820);
   setFog(rgba8(18, 24, 52, 255), 28, 80);
   setAmbientLight(rgba8(120, 160, 220, 255), 0.85);
   setLightDirection(-0.3, -1, -0.2);
   nova64.post.setBloom(1.8);
   nova64.post.setChromatic(0.002);
   nova64.post.setVignette(0.22, 0.78);

   if (player)   destroyMesh(player);
   if (goalMesh) destroyMesh(goalMesh);

   player = createSphere(0.4, COL_PLAYER);
   setMeshEmissive(player, COL_PLAYER, 1.2);

   goalMesh = createTorus(0.5, 0.12, COL_GOAL);
   setMeshEmissive(goalMesh, COL_GOAL, 2.2);
   const gp = PLATFORM_DEFS[PLATFORM_DEFS.length - 1];
   setPosition(goalMesh, gp.x, gp.y + 1.2, gp.z);

   buildLevel();

   lives = 3; score = 0; state = 'playing';
   camYaw = 0; t = 0; goalAngle = 0;
   spawnPlayer();
   setCamera([playerX, playerY + CAM_HEIGHT, playerZ + CAM_DIST], [playerX, playerY, playerZ]);
}

function isOnPlatform(px, py, pz) {
   for (const p of platforms) {
      if (Math.abs(px - p.cx) <= p.w / 2 + 0.32 &&
          Math.abs(pz - p.cz) <= p.d / 2 + 0.32 &&
          py >= p.y - 0.08 && py <= p.y + 0.75) {
         return p.y;
      }
   }
   return null;
}

// ── Update ────────────────────────────────────────────────────────────────────
export function update(dt) {
   t += dt;

   // Moving platforms
   for (const p of platforms) {
      if (!p.moveAxis) continue;
      if (p.moveAxis === 'x') p.cx = p.baseX + Math.sin(t * p.spd) * p.amp;
      else                    p.cz = p.baseZ + Math.sin(t * p.spd) * p.amp;
      setPosition(p.mesh, p.cx, p.y - 0.25, p.cz);
   }

   // Goal pulse
   goalAngle += dt * 1.5;
   setRotation(goalMesh, goalAngle * 0.5, goalAngle, 0);
   const gs = 1.0 + Math.sin(t * 4) * 0.12;
   setScale(goalMesh, gs, gs, gs);
   setMeshEmissive(goalMesh, COL_GOAL, 2.0 + Math.sin(t * 5) * 0.5);

   // Coin bob
   for (const c of coins) {
      if (!c.collected) setPosition(c.mesh, c.x, c.baseY + Math.sin(t * 3) * 0.12, c.z);
   }

   if (state !== 'playing') {
      if (btnp(BUTTON_Z) || btnp(BUTTON_X)) {
         if (state === 'dead')     { state = 'playing'; spawnPlayer(); }
         else                      { init(); }
      }
      return;
   }

   // Camera
   const camX = playerX + Math.sin(camYaw) * CAM_DIST;
   const camZ = playerZ + Math.cos(camYaw) * CAM_DIST;
   setCamera([camX, playerY + CAM_HEIGHT, camZ], [playerX, playerY + 0.5, playerZ]);

   // Movement
   const fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
   const rgtX =  Math.cos(camYaw), rgtZ = -Math.sin(camYaw);
   let moveX = 0, moveZ = 0;
   if (btn(BUTTON_UP))    { moveX += fwdX; moveZ += fwdZ; }
   if (btn(BUTTON_DOWN))  { moveX -= fwdX; moveZ -= fwdZ; }
   if (btn(BUTTON_LEFT))  { moveX -= rgtX; moveZ -= rgtZ; camYaw -= dt * 1.5; }
   if (btn(BUTTON_RIGHT)) { moveX += rgtX; moveZ += rgtZ; camYaw += dt * 1.5; }

   const mlen = Math.sqrt(moveX * moveX + moveZ * moveZ);
   if (mlen > 0.01) { moveX /= mlen; moveZ /= mlen; }
   velX = moveX * MOVE_SPEED;
   velZ = moveZ * MOVE_SPEED;

   // Jump
   if (btnp(BUTTON_Z) && jumpsLeft > 0) {
      velY = JUMP_SPEED + (jumpsLeft < 2 ? 0.5 : 0);
      jumpsLeft--;
      grounded = false;
      sfx('jump');
   }

   // Physics
   velY += GRAVITY * dt;
   playerX += velX * dt;
   playerY += velY * dt;
   playerZ += velZ * dt;

   // Platform landing
   const landY = isOnPlatform(playerX, playerY, playerZ);
   wasGrounded = grounded;
   if (landY !== null && velY <= 0) {
      playerY = landY + 0.4;
      velY = 0;
      grounded = true;
      jumpsLeft = 2;
      if (!wasGrounded) sfx('land');
   } else {
      grounded = false;
   }

   // Squash / stretch
   const squash = grounded ? 0.85 : 1.0 + Math.min(0.3, Math.abs(velY) * 0.03);
   setScale(player, 0.4 * (1 / squash), 0.4 * squash, 0.4 * (1 / squash));
   setPosition(player, playerX, playerY, playerZ);
   if (mlen > 0.1) setRotation(player, moveZ * 0.4, 0, -moveX * 0.4);

   // Coin collection
   for (const c of coins) {
      if (c.collected) continue;
      const dx = playerX - c.x, dy = playerY - c.baseY, dz = playerZ - c.z;
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.65) {
         c.collected = true;
         setMeshVisible(c.mesh, false);
         score += 50;
         sfx('coin');
         if (score > best) { best = score; saveData('pj_best', best); }
      }
   }

   // Goal reached
   const gp = PLATFORM_DEFS[PLATFORM_DEFS.length - 1];
   const dx2 = playerX - gp.x, dy2 = playerY - gp.y, dz2 = playerZ - gp.z;
   if (Math.sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2) < 1.5) {
      score += 500;
      if (score > best) { best = score; saveData('pj_best', best); }
      state = 'won';
      sfx('select');
   }

   // Fall death
   if (playerY < -8) {
      lives--;
      sfx(lives <= 0 ? 'death' : 'hit');
      if (lives <= 0) { state = 'game_over'; }
      else            { state = 'dead'; }
   }
}

// ── Draw ──────────────────────────────────────────────────────────────────────
export function draw() {
   cls(rgba8(8, 12, 28, 255));

   if (state === 'game_over') {
      rectfill(178, 136, 462, 220, rgba8(8, 4, 18, 240));
      glowRect(178, 136, 462, 220, rgba8(255, 60, 60, 240), 7);
      printBold('GAME OVER', 238, 150, rgba8(255, 60, 60, 255));
      printTight('Score: ' + score, 268, 172, rgba8(255, 220, 80, 255));
      printTight('Best:  ' + best,  268, 186, rgba8(120, 200, 255, 255));
      printFlash(248, 204, 'Z to restart', rgba8(255, 220, 80, 255), -t, 1.6);
      return;
   }

   if (state === 'won') {
      rectfill(172, 134, 468, 218, rgba8(4, 16, 6, 240));
      glowRect(172, 134, 468, 218, rgba8(80, 255, 160, 240), 7);
      printBold('YOU WIN!', 242, 148, rgba8(80, 255, 160, 255));
      printTight('Score: ' + score, 268, 170, rgba8(255, 220, 80, 255));
      printTight('Best:  ' + best,  268, 184, rgba8(120, 200, 255, 255));
      printFlash(238, 202, 'Z to play again', rgba8(255, 220, 80, 255), -t, 1.6);
      return;
   }

   // HUD
   printBold('PRISM JUMP', 8, 6, rgba8(120, 200, 255, 255));
   printTight('SCORE ' + score, 8, 22, rgba8(255, 220, 80, 255));
   printTight('BEST  ' + best,  8, 34, rgba8(200, 120, 255, 200));
   for (let i = 0; i < 3; i++) {
      const col = i < lives ? rgba8(255, 80, 120, 255) : rgba8(40, 30, 50, 255);
      glowCircle(562 + i * 18, 14, 7, col, 4);
   }
   if (!grounded) {
      printTight(jumpsLeft > 0 ? 'AIR  x' + jumpsLeft : 'NO JUMP', 8, 46, rgba8(160, 220, 255, 200));
   }

   if (state === 'dead') {
      rectfill(218, 152, 422, 202, rgba8(8, 4, 18, 230));
      glowRect(218, 152, 422, 202, rgba8(255, 80, 80, 220), 5);
      printBold('FELL OFF!', 240, 166, rgba8(255, 80, 80, 255));
      printTight('Lives: ' + lives + '  —  Z to respawn', 232, 184, rgba8(200, 220, 255, 255));
   }

   // Goal compass
   const gp = PLATFORM_DEFS[PLATFORM_DEFS.length - 1];
   const gdx = gp.x - playerX, gdz = gp.z - playerZ;
   const gangle = Math.atan2(gdx, gdz) - camYaw;
   const ax = 580, ay = 330, ar = 14;
   glowCircle(ax, ay, ar + 2, rgba8(255, 200, 40, 80), 2);
   line(ax, ay, ax + Math.floor(Math.sin(gangle) * ar), ay - Math.floor(Math.cos(gangle) * ar), rgba8(255, 220, 40, 220));
   printTight('GOAL', 565, 346, rgba8(200, 180, 60, 200));
}
