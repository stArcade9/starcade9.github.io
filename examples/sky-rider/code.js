// Nova64 Game Cart: SKY RIDER
// Space Harrier-style 2.5D forward shooter.
// Arrows move, Z fires, X starts / retries.
// Showcases: instanced ground tiles for the scrolling checkerboard, real-time
// enemy spawns, projectile pool, bloom + CRT post.

const FLOOR_Y = -2;
const TILE = 6;
const TILE_ROWS = 18;
const TILE_COLS = 7;
const SCROLL_SPEED = 22;
const PLAYER_SPEED = 18;
const PLAYER_X_BOUND = 12;
const PLAYER_Y_MIN = -1;
const PLAYER_Y_MAX = 7;
const BULLET_SPEED = 70;
const BULLET_LIFE = 1.6;
const FIRE_COOLDOWN = 0.18;
const ENEMY_SPAWN_INTERVAL_START = 1.4;
const ENEMY_SPEED = 26;
const ENEMY_HIT_RADIUS = 1.6;
const MAX_BULLETS = 12;
const MAX_ENEMIES = 14;

const COL_GROUND_A = rgba8(60, 24, 130, 255);
const COL_GROUND_B = rgba8(120, 50, 210, 255);
const COL_PLAYER  = rgba8(80, 255, 230, 255);
const COL_BULLET  = rgba8(255, 240, 120, 255);
const COL_ENEMY_A = rgba8(255, 80, 120, 255);
const COL_ENEMY_B = rgba8(255, 180, 60, 255);
const COL_SKY_TOP = rgba8(225, 60, 180, 255);
const COL_SKY_BOT = rgba8(40, 6, 60, 255);

let tilePlanes = [];
let playerMesh = null;
let bulletMesh = null;
let bullets = [];
let enemyMesh = null;
let enemies = [];
let sunMesh = null;

let player = { x: 0, y: 2.5 };
let scrollOff = 0;
let score = 0;
let best = 0;
let lives = 3;
let cooldown = 0;
let spawnT = 0;
let spawnInterval = ENEMY_SPAWN_INTERVAL_START;
let time = 0;
let state = 'start';
let startT = 0;
let shakeT = 0;

function writeMat4(out, off, sx, sy, sz, tx, ty, tz) {
   out[off+0]=sx; out[off+1]=0;  out[off+2]=0;  out[off+3]=0;
   out[off+4]=0;  out[off+5]=sy; out[off+6]=0;  out[off+7]=0;
   out[off+8]=0;  out[off+9]=0;  out[off+10]=sz;out[off+11]=0;
   out[off+12]=tx;out[off+13]=ty;out[off+14]=tz;out[off+15]=1;
}

function buildScene() {
   for (const t of tilePlanes) { destroyMesh(t.mesh); }
   tilePlanes = [];
   if (playerMesh) { destroyMesh(playerMesh); playerMesh = null; }
   if (bulletMesh) { destroyMesh(bulletMesh); bulletMesh = null; }
   if (enemyMesh) { destroyMesh(enemyMesh); enemyMesh = null; }
   if (sunMesh) { destroyMesh(sunMesh); sunMesh = null; }
   bullets = [];
   enemies = [];

   // Floor: web-parity approach, individual rotated planes per tile instead
   // of flat-slab instanced cubes. This matches examples/space-harrier-3d.
   for (let r = 0; r < TILE_ROWS; r++) {
      for (let c = 0; c < TILE_COLS; c++) {
         const wx = (c - (TILE_COLS - 1) / 2) * TILE;
         const wz = -r * TILE - 2;
         const col = ((r + c) & 1) ? COL_GROUND_A : COL_GROUND_B;
         const plane = createPlane(TILE, TILE, col, [wx, FLOOR_Y, wz]);
         rotateMesh(plane, -Math.PI / 2, 0, 0);
         tilePlanes.push({ mesh: plane, r, c, wx });
      }
   }

   playerMesh = createCube(1.4, 0.7, 1.4, COL_PLAYER);
   setMeshEmissive(playerMesh, COL_PLAYER, 1.4);
   setPosition(playerMesh, 0, 2.5, 4);
   setRotation(playerMesh, 0, Math.PI / 4, 0);

   bulletMesh = createInstancedMesh('cube', MAX_BULLETS);
   setMeshEmissive(bulletMesh, COL_BULLET, 1.9);
   const hiddenB = new Array(MAX_BULLETS * 16).fill(0);
   for (let i = 0; i < MAX_BULLETS; i++) {
      hiddenB[i * 16 + 15] = 1;
      setInstanceColor(bulletMesh, i, COL_BULLET);
   }
   setInstanceTransforms(bulletMesh, 0, hiddenB);

   enemyMesh = createInstancedMesh('cube', MAX_ENEMIES);
   setMeshEmissive(enemyMesh, COL_ENEMY_A, 1.5);
   const hiddenE = new Array(MAX_ENEMIES * 16).fill(0);
   for (let i = 0; i < MAX_ENEMIES; i++) hiddenE[i * 16 + 15] = 1;
   setInstanceTransforms(enemyMesh, 0, hiddenE);

   sunMesh = createSphere(16, rgba8(255, 220, 120, 255));
   setMeshEmissive(sunMesh, rgba8(255, 200, 80, 255), 2.2);
   setPosition(sunMesh, 0, 14, -90);
}

function resetRun() {
   player.x = 0;
   player.y = 2.5;
   scrollOff = 0;
   score = 0;
   lives = 3;
   cooldown = 0;
   spawnT = 0;
   spawnInterval = ENEMY_SPAWN_INTERVAL_START;
   time = 0;
   shakeT = 0;
   bullets = [];
   enemies = [];
}

export function init() {
   state = 'start';
   startT = 0;
   best = best || 0;

   setCameraPosition(0, 4, 8);
   setCameraTarget(0, 3, -10);
   setCameraFOV(72);
   setAmbientLight(rgba8(220, 180, 240, 255), 1.1);
   setLightDirection(-0.2, -1, -0.4);
   setFog(rgba8(180, 60, 200, 255), 18, 92);
   setSkyColor(COL_SKY_TOP, COL_SKY_BOT);

   nova64.post.setBloom(2.2);
   nova64.post.setChromatic(0.005);
   nova64.post.setVignette(0.15, 0.78);
   nova64.post.setCRT(true);

   buildScene();
   resetRun();
}

function fireBullet() {
   if (bullets.length >= MAX_BULLETS) return;
   const slot = bullets.length;
   bullets.push({ x: player.x, y: player.y, z: 2, slot, life: BULLET_LIFE });
}

function spawnEnemy() {
   if (enemies.length >= MAX_ENEMIES) return;
   const slot = enemies.length;
   const lane = (Math.random() - 0.5) * 2 * 10;
   const alt = 1.5 + Math.random() * 5;
   const variant = Math.random() < 0.5 ? 0 : 1;
   enemies.push({
      x: lane,
      y: alt,
      z: -88,
      slot,
      seed: Math.random() * Math.PI * 2,
      variant,
      hit: false,
   });
}

function uploadInstances() {
   if (bulletMesh) {
      const N = MAX_BULLETS;
      const data = new Array(N * 16).fill(0);
      for (let i = 0; i < N; i++) data[i * 16 + 15] = 1;
      for (const b of bullets) {
         writeMat4(data, b.slot * 16, 0.32, 0.32, 1.3, b.x, b.y, b.z);
      }
      setInstanceTransforms(bulletMesh, 0, data);
   }

   if (enemyMesh) {
      const N = MAX_ENEMIES;
      const data = new Array(N * 16).fill(0);
      for (let i = 0; i < N; i++) data[i * 16 + 15] = 1;
      for (const e of enemies) {
         const s = 1.1 + (e.variant ? 0.2 : 0);
         writeMat4(data, e.slot * 16, s, s, s, e.x, e.y, e.z);
         setInstanceColor(enemyMesh, e.slot, e.variant ? COL_ENEMY_B : COL_ENEMY_A);
      }
      setInstanceTransforms(enemyMesh, 0, data);
   }

   // Scroll floor planes: shift Z by scrollOff modulo TILE, recolor by phase.
   const off = scrollOff % TILE;
   for (const t of tilePlanes) {
      const wz = -t.r * TILE - 2 + off;
      setPosition(t.mesh, t.wx, FLOOR_Y, wz);
      const phase = Math.floor((t.r * TILE - scrollOff) / TILE) + t.c;
      const col = (phase & 1) ? COL_GROUND_A : COL_GROUND_B;
      setMeshColor(t.mesh, col);
   }
}

function updatePlay(dt) {
   if (btnp('x')) {} // x reserved for pause toggle if needed later
   if (btn('left'))  player.x -= PLAYER_SPEED * dt;
   if (btn('right')) player.x += PLAYER_SPEED * dt;
   if (btn('up'))    player.y += PLAYER_SPEED * dt;
   if (btn('down'))  player.y -= PLAYER_SPEED * dt;
   if (player.x < -PLAYER_X_BOUND) player.x = -PLAYER_X_BOUND;
   if (player.x >  PLAYER_X_BOUND) player.x =  PLAYER_X_BOUND;
   if (player.y < PLAYER_Y_MIN) player.y = PLAYER_Y_MIN;
   if (player.y > PLAYER_Y_MAX) player.y = PLAYER_Y_MAX;

   cooldown -= dt;
   if (btn('z') && cooldown <= 0) {
      fireBullet();
      cooldown = FIRE_COOLDOWN;
   }

   scrollOff += SCROLL_SPEED * dt;

   spawnT += dt;
   if (spawnT >= spawnInterval) {
      spawnT = 0;
      spawnEnemy();
      spawnInterval = Math.max(0.45, spawnInterval - 0.02);
   }

   for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.z -= BULLET_SPEED * dt;
      b.life -= dt;
      if (b.life <= 0 || b.z < -100) {
         bullets.splice(i, 1);
         continue;
      }
   }

   for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.z += ENEMY_SPEED * dt;
      e.x += Math.sin(time * 1.8 + e.seed) * 4 * dt;
      e.y += Math.cos(time * 2.3 + e.seed) * 1.6 * dt;
      if (e.z > 6) {
         enemies.splice(i, 1);
         lives -= 1;
         shakeT = 0.4;
         if (lives <= 0) {
            state = 'over';
            if (score > best) best = score;
         }
         continue;
      }
      for (let j = bullets.length - 1; j >= 0; j--) {
         const b = bullets[j];
         const dx = b.x - e.x, dy = b.y - e.y, dz = b.z - e.z;
         if (dx*dx + dy*dy + dz*dz < ENEMY_HIT_RADIUS * ENEMY_HIT_RADIUS) {
            enemies.splice(i, 1);
            bullets.splice(j, 1);
            score += 100;
            break;
         }
      }
   }

   for (let i = 0; i < bullets.length; i++) bullets[i].slot = i;
   for (let i = 0; i < enemies.length; i++) enemies[i].slot = i;
}

export function update(dt) {
   time += dt;
   if (state === 'start') {
      startT += dt;
      if (btnp('z') || btnp('x')) { state = 'playing'; resetRun(); }
      return;
   }
   if (state === 'over') {
      if (btnp('z') || btnp('x')) { state = 'playing'; resetRun(); }
      return;
   }

   updatePlay(dt);

   const camShake = shakeT > 0 ? Math.sin(time * 60) * shakeT * 0.4 : 0;
   shakeT = Math.max(0, shakeT - dt);
   setCameraPosition(player.x * 0.18 + camShake, 4 + player.y * 0.05, 8);
   setCameraTarget(player.x * 0.6, 3 + player.y * 0.4, -10);
   setPosition(playerMesh, player.x, player.y, 4);
   setRotation(playerMesh, 0, Math.PI / 4 + Math.sin(time * 4) * 0.06, Math.sin(time * 6) * 0.12);

   uploadInstances();
}

function drawHud() {
   printOutlineTight('SKY RIDER', 8, 6, rgba8(80, 255, 230, 255), rgba8(0, 0, 0, 220));
   printTight('SCORE ' + score, 8, 22, rgba8(255, 220, 80, 255));
   printTight('BEST  ' + best,  8, 34, rgba8(255, 140, 220, 255));
   printTight('LIVES ' + lives, 8, 46, rgba8(255, 80, 120, 255));
   printTight('T ' + time.toFixed(1) + 's', 560, 6, rgba8(180, 200, 255, 220));
   printTight('ENEMIES ' + enemies.length, 528, 18, rgba8(220, 160, 240, 200));
}

export function draw() {
   cls(rgba8(2, 2, 14, 255));

   if (state === 'start') {
      rectfill(116, 86, 524, 198, rgba8(6, 6, 22, 232));
      glowRect(116, 86, 524, 198, rgba8(255, 80, 200, 220), 6);
      printBold('SKY RIDER', 238, 100, rgba8(80, 255, 230, 255));
      printTight('Endless forward shooter, Space Harrier vibes.', 144, 124, rgba8(220, 230, 255, 230));
      printTight('Arrows: bank / climb / dive', 200, 142, rgba8(200, 220, 255, 220));
      printTight('Z: fire   X: confirm', 218, 154, rgba8(200, 220, 255, 220));
      printTight('Survive the wave. Best score persists.', 168, 170, rgba8(255, 200, 140, 220));
      printFlash(256, 184, 'Z to start', rgba8(255, 220, 80, 255), -startT, 1.6);
      return;
   }

   drawHud();

   if (state === 'over') {
      rectfill(180, 124, 460, 222, rgba8(8, 4, 18, 240));
      glowRect(180, 124, 460, 222, rgba8(255, 80, 160, 230), 6);
      printBold('SKY DOWN', 246, 138, rgba8(255, 80, 160, 255));
      printTight('Final: ' + score, 268, 162, rgba8(255, 220, 80, 255));
      printTight('Best:  ' + best,  268, 176, rgba8(120, 200, 255, 255));
      printFlash(248, 198, 'Z to retry', rgba8(255, 220, 80, 255), -time, 1.6);
   }
}
