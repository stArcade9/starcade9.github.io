// Nova64 Game Cart: STAR RIFT
// Vertical space shooter. Arrow keys move. Z shoots (hold). X start / retry.
// Enemy fire, boss every 3rd wave, power-up drops, persistent high score.

const FIELD_W = 12, FIELD_H = 7;
const BULLET_SPEED = 20;
const EBULLET_SPEED = 5.5;
const PLAYER_SPEED = 8;
const SHOOT_CD_BASE = 0.18;
const E_COLS = 7, E_ROWS = 3;
const BOSS_HP_BASE = 22;
const PU_DROP_CHANCE = 0.28;

const COL_PLAYER  = rgba8(80,  200, 255, 255);
const COL_BULLET  = rgba8(120, 255, 200, 255);
const COL_EBULLET = rgba8(255, 80,  80,  255);
const COL_BOSS    = rgba8(200, 60,  255, 255);
const COL_PU_R    = rgba8(255, 200, 40,  255);  // rapid fire
const COL_PU_S    = rgba8(80,  255, 160, 255);  // spread shot

// ── State ─────────────────────────────────────────────────────────────────────
let state, wave, stateTimer, startT, t;
let player, ringMesh;
let playerX, playerY, shootTimer, eShootTimer;
let bullets = [], eBullets = [], enemies = [], powerups = [], explosions = [];
let boss = null;
let score, best, lives;
let enemyDir, enemySpeed;
let rapidTimer, spreadTimer;

// ── Scene init ────────────────────────────────────────────────────────────────
function initScene() {
   clearSkybox();
   createSpaceSkybox({ starCount: 1200, nebulae: true, nebulaColor: 0x2244cc });
   enableSkyboxAutoAnimate(0.4);
   setFog(rgba8(2, 4, 16, 255), 22, 70);
   setCameraPosition(0, 4, 12);
   setCameraTarget(0, 0, 0);
   setLightDirection(-0.4, -1, -0.3);
   setAmbientLight(rgba8(80, 120, 220, 255), 0.7);
   nova64.post.setBloom(2.4);
   nova64.post.setChromatic(0.003);
   nova64.post.setVignette(0.2, 0.75);
   nova64.post.setCRT(true);
   ringMesh = createTorus(3.5, 0.12, rgba8(60, 120, 220, 100));
   setPosition(ringMesh, 0, 0, -10);
}

// ── Wave spawning ──────────────────────────────────────────────────────────────
function clearEntities() {
   for (const e of enemies) if (e.alive) destroyMesh(e.mesh);
   enemies = [];
   if (boss) { destroyMesh(boss.mesh); boss = null; }
   for (const b of bullets) destroyMesh(b.mesh);  bullets = [];
   for (const b of eBullets) destroyMesh(b.mesh); eBullets = [];
   for (const p of powerups) destroyMesh(p.mesh); powerups = [];
}

function spawnWave(w) {
   clearEntities();
   enemyDir = 1;
   enemySpeed = 1.2 + w * 0.35;
   eShootTimer = 2.0 - w * 0.06;
   shootTimer = 0;

   const isBossWave = (w % 3 === 2);
   if (isBossWave) {
      const hp = BOSS_HP_BASE + w * 5;
      const bMesh = createTorus(1.1, 0.22, COL_BOSS);
      setMeshEmissive(bMesh, COL_BOSS, 2.2);
      setPosition(bMesh, 0, 2.2, 0);
      boss = { mesh: bMesh, x: 0, y: 2.2, hp, maxHp: hp, dir: 1, shootTimer: 0, speed: 2.0 + w * 0.2 };
      sfx('select');
   } else {
      const cols = Math.min(E_COLS + Math.floor(w / 3), 10);
      const rows = E_ROWS + (w > 2 ? 1 : 0);
      const eColPalette = [
         rgba8(255, 80,  80,  255), rgba8(255, 160, 40, 255),
         rgba8(200, 60,  255, 255), rgba8(80,  200, 255, 255),
      ];
      for (let row = 0; row < rows; row++) {
         for (let col = 0; col < cols; col++) {
            const x = (col - (cols - 1) / 2) * 1.65;
            const y = 1.2 + row * 1.25;
            const col3 = eColPalette[row % eColPalette.length];
            const mesh = createSphere(0.35, col3);
            setMeshEmissive(mesh, col3, 0.7);
            setPosition(mesh, x, y, 0);
            enemies.push({ mesh, x, y, alive: true, bobPhase: (col + row * 3) * 0.7, hp: 1 + (row > 2 ? 1 : 0) });
         }
      }
      sfx('blip');
   }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function spawnBullet(x, y, vx) {
   const m = createSphere(0.09, COL_BULLET);
   setMeshEmissive(m, COL_BULLET, 2.4);
   setPosition(m, x, y, 0);
   bullets.push({ mesh: m, x, y, vx: vx || 0 });
}

function spawnEBullet(x, y, vx) {
   const m = createSphere(0.09, COL_EBULLET);
   setMeshEmissive(m, COL_EBULLET, 2.0);
   setPosition(m, x, y, 0);
   eBullets.push({ mesh: m, x, y, vx: vx || 0 });
}

function spawnPowerup(x, y) {
   const type = Math.random() < 0.5 ? 'rapid' : 'spread';
   const col = type === 'rapid' ? COL_PU_R : COL_PU_S;
   const m = createSphere(0.22, col);
   setMeshEmissive(m, col, 2.2);
   setPosition(m, x, y, 0);
   powerups.push({ mesh: m, x, y, type, velY: -1.2 });
}

function spawnExplosion(wx, wy) {
   explosions.push({ wx, wy, age: 0, life: 0.55 });
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function init() {
   best = loadData('ss_best', 0);
   state = 'start'; startT = 0; t = 0; stateTimer = 0;
   score = 0; lives = 3; wave = 0;
   rapidTimer = 0; spreadTimer = 0;
   bullets = []; eBullets = []; enemies = []; powerups = []; explosions = [];
   boss = null;

   initScene();
   player = createCone(0.4, 0.9, COL_PLAYER);
   setMeshEmissive(player, COL_PLAYER, 1.5);
   playerX = 0; playerY = -2.8;
   setPosition(player, playerX, playerY, 0);
}

// ── Update ────────────────────────────────────────────────────────────────────
export function update(dt) {
   t += dt;

   // ── title screen ──
   if (state === 'start') {
      startT += dt;
      setRotation(ringMesh, 0, t * 0.3, t * 0.2);
      if (btnp('z') || btnp('x')) { state = 'playing'; wave = 0; spawnWave(0); }
      return;
   }

   // ── game over / win ──
   if (state === 'game_over') {
      if (btnp('z') || btnp('x')) {
         score = 0; lives = 3; wave = 0;
         rapidTimer = 0; spreadTimer = 0;
         spawnWave(0); state = 'playing';
      }
      return;
   }

   // ── wave clear ──
   if (state === 'wave_clear') {
      stateTimer -= dt;
      if (stateTimer <= 0) { wave++; spawnWave(wave); state = 'playing'; }
      return;
   }

   // ── playing ──────────────────────────────────────────────────────────────
   shootTimer  = Math.max(-1, shootTimer  - dt);
   eShootTimer = Math.max(-1, eShootTimer - dt);
   rapidTimer  = Math.max(0,  rapidTimer  - dt);
   spreadTimer = Math.max(0,  spreadTimer - dt);

   // Player move
   const spd = PLAYER_SPEED * dt;
   if (btn('left')  && playerX > -FIELD_W / 2) playerX -= spd;
   if (btn('right') && playerX <  FIELD_W / 2) playerX += spd;
   if (btn('up')    && playerY <  FIELD_H / 2 - 1) playerY += spd * 0.6;
   if (btn('down')  && playerY > -FIELD_H / 2)      playerY -= spd * 0.6;
   setPosition(player, playerX, playerY, 0);
   setRotation(player, Math.sin(t * 3) * 0.06, 0, -playerX * 0.06);

   // Shoot
   const shootCd = rapidTimer > 0 ? SHOOT_CD_BASE * 0.38 : SHOOT_CD_BASE;
   if (btn('z') && shootTimer <= 0) {
      spawnBullet(playerX, playerY + 0.5, 0);
      if (spreadTimer > 0) {
         spawnBullet(playerX - 0.1, playerY + 0.3, -4);
         spawnBullet(playerX + 0.1, playerY + 0.3,  4);
      }
      sfx('laser');
      shootTimer = shootCd;
   }

   // Player bullets
   for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y += BULLET_SPEED * dt;
      b.x += b.vx * dt;
      setPosition(b.mesh, b.x, b.y, 0);
      if (b.y > FIELD_H + 2 || Math.abs(b.x) > FIELD_W + 1) {
         destroyMesh(b.mesh); bullets.splice(i, 1);
      }
   }

   // Enemy bullets
   for (let i = eBullets.length - 1; i >= 0; i--) {
      const b = eBullets[i];
      b.y -= EBULLET_SPEED * dt;
      b.x += b.vx * dt;
      setPosition(b.mesh, b.x, b.y, 0);
      const dx = b.x - playerX, dy = b.y - playerY;
      if (Math.sqrt(dx * dx + dy * dy) < 0.55) {
         destroyMesh(b.mesh); eBullets.splice(i, 1);
         lives--; sfx('hit');
         if (lives <= 0) { clearEntities(); state = 'game_over'; sfx('death'); return; }
         continue;
      }
      if (b.y < -FIELD_H - 2 || Math.abs(b.x) > FIELD_W + 1) {
         destroyMesh(b.mesh); eBullets.splice(i, 1);
      }
   }

   // Power-ups
   for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.velY * dt;
      const s = 0.22 + Math.sin(t * 6 + i) * 0.05;
      setPosition(p.mesh, p.x, p.y, 0);
      setScale(p.mesh, s, s, s);
      const dx = p.x - playerX, dy = p.y - playerY;
      if (Math.sqrt(dx * dx + dy * dy) < 0.65) {
         if (p.type === 'rapid') rapidTimer = 8;
         else spreadTimer = 8;
         sfx('powerup');
         destroyMesh(p.mesh); powerups.splice(i, 1);
         continue;
      }
      if (p.y < -FIELD_H - 2) { destroyMesh(p.mesh); powerups.splice(i, 1); }
   }

   // Explosions age
   explosions = explosions.filter(ex => { ex.age += dt; return ex.age < ex.life; });

   // Ring spin
   setRotation(ringMesh, 0, t * 0.3, t * 0.2);

   // ── Boss wave ─────────────────────────────────────────────────────────────
   if (boss) {
      boss.x += boss.dir * boss.speed * dt;
      if (Math.abs(boss.x) > FIELD_W / 2 - 1.0) boss.dir *= -1;
      const by = boss.y + Math.sin(t * 1.6) * 0.25;
      setPosition(boss.mesh, boss.x, by, 0);
      setRotation(boss.mesh, t * 0.5, t * 0.9, 0);
      setMeshEmissive(boss.mesh, COL_BOSS, 1.8 + Math.sin(t * 5) * 0.4);

      boss.shootTimer -= dt;
      if (boss.shootTimer <= 0) {
         const aim = (playerX - boss.x) * 0.35;
         spawnEBullet(boss.x, by, aim);
         spawnEBullet(boss.x, by, aim - 2.8);
         spawnEBullet(boss.x, by, aim + 2.8);
         boss.shootTimer = 1.0 + (boss.hp / boss.maxHp) * 0.4;
      }

      for (let bi = bullets.length - 1; bi >= 0; bi--) {
         const b = bullets[bi];
         const dx = b.x - boss.x, dy = b.y - by;
         if (Math.sqrt(dx * dx + dy * dy) < 1.3) {
            destroyMesh(b.mesh); bullets.splice(bi, 1);
            boss.hp--;
            score += 50;
            if (score > best) { best = score; saveData('ss_best', best); }
            if (boss.hp <= 0) {
               spawnExplosion(boss.x, boss.y);
               destroyMesh(boss.mesh); boss = null;
               sfx('explosion');
               score += 5000;
               if (score > best) { best = score; saveData('ss_best', best); }
               stateTimer = 3.0; state = 'wave_clear';
            }
         }
      }
      return; // skip grid logic during boss fight
   }

   // ── Enemy grid ────────────────────────────────────────────────────────────
   const alive = enemies.filter(e => e.alive);
   if (alive.length === 0) {
      stateTimer = 2.5; state = 'wave_clear'; sfx('select'); return;
   }

   const leftmost  = alive.reduce((m, e) => Math.min(m, e.x), Infinity);
   const rightmost = alive.reduce((m, e) => Math.max(m, e.x), -Infinity);
   if ((rightmost > FIELD_W / 2 - 0.5 && enemyDir > 0) ||
       (leftmost  < -FIELD_W / 2 + 0.5 && enemyDir < 0)) {
      for (const e of alive) e.y -= 0.55;
      enemyDir *= -1;
      enemySpeed += 0.12;
   }

   for (const e of alive) {
      e.x += enemyDir * enemySpeed * dt;
      e.y += Math.sin(t * 1.8 + e.bobPhase) * 0.003;
      setPosition(e.mesh, e.x, e.y, 0);
      setRotation(e.mesh, 0, t * 1.2 + e.bobPhase, 0);
      if (e.y < playerY + 0.5) {
         lives--; sfx('hit');
         destroyMesh(e.mesh); e.alive = false;
         if (lives <= 0) { clearEntities(); state = 'game_over'; sfx('death'); return; }
      }
   }

   // Enemy fire
   if (eShootTimer <= 0 && alive.length > 0) {
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      spawnEBullet(shooter.x, shooter.y, (playerX - shooter.x) * 0.45);
      eShootTimer = Math.max(0.5, 2.0 - wave * 0.06);
   }

   // Bullets vs enemies
   for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      let hit = false;
      for (const e of enemies) {
         if (!e.alive) continue;
         const dx = b.x - e.x, dy = b.y - e.y;
         if (Math.sqrt(dx * dx + dy * dy) < 0.52) {
            e.hp--;
            if (e.hp <= 0) {
               spawnExplosion(e.x, e.y);
               destroyMesh(e.mesh); e.alive = false;
               sfx('explosion');
               score += 100 + wave * 20;
               if (score > best) { best = score; saveData('ss_best', best); }
               if (Math.random() < PU_DROP_CHANCE) spawnPowerup(e.x, e.y);
            }
            destroyMesh(b.mesh); bullets.splice(bi, 1); hit = true; break;
         }
      }
      if (hit) continue;
   }
}

// ── Draw ──────────────────────────────────────────────────────────────────────
export function draw() {
   cls(rgba8(2, 3, 12, 255));

   // Explosions projected to screen
   for (const ex of explosions) {
      const p = project3DToScreen(ex.wx, ex.wy, 0);
      if (p && p.visible) {
         const pct = ex.age / ex.life;
         const r = Math.floor(10 + (1 - pct) * 24);
         glowCircle(p.x, p.y, Math.floor(r * (1 - pct * 0.4)), rgba8(255, Math.floor(160 - pct * 120), 40, Math.floor(255 * (1 - pct))), Math.floor(3 + r * 0.4));
      }
   }

   if (state === 'start') {
      rectfill(148, 96, 492, 210, rgba8(4, 6, 22, 232));
      glowRect(148, 96, 492, 210, rgba8(80, 180, 255, 220), 6);
      printBold('STAR RIFT', 246, 110, rgba8(80, 200, 255, 255));
      printTight('Arrows move  |  Z shoots (hold)', 196, 136, rgba8(200, 220, 255, 220));
      printTight('Enemies shoot back!  Survive to wave 3 for the boss.', 150, 150, rgba8(200, 200, 255, 200));
      printTight('Gold orb = RAPID FIRE 8s', 216, 164, rgba8(255, 200, 40, 220));
      printTight('Green orb = SPREAD SHOT 8s', 208, 178, rgba8(80, 255, 160, 220));
      if (best > 0) printTight('BEST  ' + best, 288, 194, rgba8(120, 200, 255, 200));
      printFlash(256, 204, 'Z to launch', rgba8(255, 220, 80, 255), -startT, 1.6);
      return;
   }

   // HUD
   printBold('STAR RIFT', 8, 6, rgba8(80, 180, 255, 240));
   printTight('SCORE ' + score, 8, 22, rgba8(255, 220, 80, 255));
   printTight('BEST  ' + best,  8, 34, rgba8(200, 120, 255, 200));
   printTight('WAVE  ' + (wave + 1), 8, 46, rgba8(120, 200, 255, 220));
   const isBossWave = (wave % 3 === 2);
   if (isBossWave) printTight('BOSS WAVE', 8, 58, rgba8(200, 60, 255, 255));
   for (let i = 0; i < 3; i++) {
      const col = i < lives ? rgba8(80, 255, 200, 255) : rgba8(30, 30, 50, 255);
      glowCircle(562 + i * 18, 14, 7, col, 4);
   }
   if (rapidTimer > 0)  printTight('RAPID x2  ' + rapidTimer.toFixed(1) + 's', 8, 70, rgba8(255, 200, 40, 255));
   if (spreadTimer > 0) printTight('SPREAD 3x ' + spreadTimer.toFixed(1) + 's', 8, rapidTimer > 0 ? 82 : 70, rgba8(80, 255, 160, 255));

   // Boss HP bar
   if (boss) {
      const pct = boss.hp / boss.maxHp;
      drawProgressBar(160, 352, 320, 12, pct, rgba8(200, 60, 255, 255), rgba8(30, 10, 50, 200), rgba8(200, 60, 255, 180));
      printTight('BOSS  ' + boss.hp + '/' + boss.maxHp, 274, 338, rgba8(200, 60, 255, 255));
   }

   // Wave clear overlay
   if (state === 'wave_clear') {
      const bossKill = (wave % 3 === 2);
      const msg = bossKill ? 'BOSS DESTROYED!' : 'WAVE ' + (wave + 1) + ' CLEAR!';
      const glow = bossKill ? rgba8(200, 60, 255, 230) : rgba8(80, 255, 200, 220);
      rectfill(172, 154, 468, 208, rgba8(4, 6, 22, 232));
      glowRect(172, 154, 468, 208, glow, 6);
      printBold(msg, bossKill ? 206 : 224, 168, bossKill ? rgba8(200, 60, 255, 255) : rgba8(80, 255, 200, 255));
      printTight('Score: ' + score, 272, 190, rgba8(255, 220, 80, 255));
   }

   // Game over overlay
   if (state === 'game_over') {
      rectfill(178, 136, 462, 222, rgba8(8, 4, 18, 240));
      glowRect(178, 136, 462, 222, rgba8(255, 60, 60, 240), 7);
      printBold('GAME OVER', 238, 150, rgba8(255, 60, 60, 255));
      printTight('Score: ' + score, 268, 172, rgba8(255, 220, 80, 255));
      printTight('Best:  ' + best,  268, 186, rgba8(120, 200, 255, 255));
      printFlash(252, 206, 'Z to retry', rgba8(255, 220, 80, 255), -t, 1.6);
   }
}
