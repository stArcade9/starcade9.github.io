// Wave Survival Arena — Nova64
// Arrow keys to move, Z to shoot. 3 lives, player HP, power-up drops, enemy variety.
// High score saved between sessions.

let t = 0;
let px = 320, py = 280;
let playerHp = 3, maxHp = 3, lives = 3;
let invincible = 0, flashTimer = 0;
let bullets = [];
let enemies = [];
let bursts = [];
let powerups = [];
let score = 0, best = 0;
let mgr = 0;
let shootCooldown = 0;
let waveDelay = 0;
let shootAngle = -Math.PI / 2;

// Active power-up timers
let rapidFire = 0, spreadShot = 0, speedBoost = 0;

const SPEED = 90;
const BULLET_SPEED = 260;
const ARENA_X = 40, ARENA_Y = 50, ARENA_W = 560, ARENA_H = 260;
const GRID_STEP = 40;
const PU_TYPES = ['RAPID', 'SPREAD', 'SPEED', 'SHIELD'];
const PU_COLS  = [rgba8(255,200,40,255), rgba8(40,200,255,255), rgba8(120,255,80,255), rgba8(255,120,255,255)];

function spawnEnemy(wave) {
   const side = Math.floor(rngRandom() * 4);
   let ex, ey;
   if (side === 0) { ex = ARENA_X + rngRandom() * ARENA_W; ey = ARENA_Y; }
   else if (side === 1) { ex = ARENA_X + rngRandom() * ARENA_W; ey = ARENA_Y + ARENA_H; }
   else if (side === 2) { ex = ARENA_X; ey = ARENA_Y + rngRandom() * ARENA_H; }
   else                 { ex = ARENA_X + ARENA_W; ey = ARENA_Y + rngRandom() * ARENA_H; }

   const roll = rngRandom();
   let type, hp, spd, r, col;
   if (roll < 0.22 && wave >= 2) {
      // Speeder: fast, tiny, fragile
      type = 'fast'; hp = 1; spd = 80 + wave * 8; r = 6; col = rgba8(255,160,60,255);
   } else if (roll < 0.38 && wave >= 3) {
      // Tank: slow, bulky, lots of HP
      type = 'tank'; hp = 4 + Math.floor(wave / 3); spd = 24 + wave * 2; r = 16; col = rgba8(180,60,60,255);
   } else {
      // Standard
      type = 'std'; hp = 1 + Math.floor(wave / 3); spd = 40 + wave * 5; r = 10; col = rgba8(220,40,40,255);
   }
   enemies.push({ x: ex, y: ey, hp, maxHp: hp, spd, r, col, type, phase: rngRandom() * 6.28 });
}

function dropPowerup(x, y) {
   if (rngRandom() > 0.30) return;
   powerups.push({ x, y, type: Math.floor(rngRandom() * PU_TYPES.length), life: 8 });
}

function hitPlayer() {
   if (invincible > 0) return;
   sfx('hit');
   playerHp--;
   flashTimer = 0.28;
   invincible = 1.5;
   if (playerHp <= 0) {
      sfx('death');
      lives--;
      playerHp = maxHp;
      if (lives <= 0 && score > best) {
         best = score;
         saveData('ws_best', best);
      }
   }
}

export function init() {
   best = loadData('ws_best', 0);
   score = 0; lives = 3; maxHp = 3; playerHp = 3;
   t = 0; waveDelay = 0;
   enemies = []; bursts = []; bullets = []; powerups = [];
   rapidFire = 0; spreadShot = 0; speedBoost = 0;
   invincible = 0; flashTimer = 0;
   px = 320; py = 280;
   shootAngle = -Math.PI / 2; shootCooldown = 0;
   mgr = createWaveManager();
   startWave(mgr, 4);
   for (let i = 0; i < 4; i++) spawnEnemy(1);
}

export function update(dt) {
   t += dt;
   if (lives <= 0) {
      if (btnp('z') || btnp('x')) init();
      return;
   }

   shootCooldown -= dt;
   if (invincible > 0)  invincible  -= dt;
   if (flashTimer > 0)  flashTimer  -= dt;
   if (rapidFire > 0)   rapidFire   -= dt;
   if (spreadShot > 0)  spreadShot  -= dt;
   if (speedBoost > 0)  speedBoost  -= dt;

   // Movement
   const spd = SPEED * (speedBoost > 0 ? 1.65 : 1.0);
   let mdx = 0, mdy = 0;
   if (btn('left'))  mdx -= 1;
   if (btn('right')) mdx += 1;
   if (btn('up'))    mdy -= 1;
   if (btn('down'))  mdy += 1;
   if (mdx !== 0 || mdy !== 0) {
      const ml = Math.sqrt(mdx*mdx + mdy*mdy);
      shootAngle = Math.atan2(mdy / ml, mdx / ml);
      px += (mdx / ml) * spd * dt;
      py += (mdy / ml) * spd * dt;
   }
   px = Math.max(ARENA_X + 8, Math.min(ARENA_X + ARENA_W - 8, px));
   py = Math.max(ARENA_Y + 8, Math.min(ARENA_Y + ARENA_H - 8, py));

   // Shoot — aim at nearest enemy or last move direction
   const fireCooldown = rapidFire > 0 ? 0.07 : 0.15;
   if (btn('z') && shootCooldown <= 0) {
      shootCooldown = fireCooldown;
      let ax = Math.cos(shootAngle), ay = Math.sin(shootAngle);
      let bestDist = Infinity;
      for (const e of enemies) {
         const dx = e.x - px, dy = e.y - py;
         const d = Math.sqrt(dx*dx + dy*dy);
         if (d < bestDist) { bestDist = d; ax = dx / d; ay = dy / d; }
      }
      sfx('laser');
      bullets.push({ x: px, y: py, dx: ax, dy: ay });
      if (spreadShot > 0) {
         for (const off of [-0.28, 0.28]) {
            const a = Math.atan2(ay, ax) + off;
            bullets.push({ x: px, y: py, dx: Math.cos(a), dy: Math.sin(a) });
         }
      }
   }

   // Bullets
   for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.dx * BULLET_SPEED * dt;
      b.y += b.dy * BULLET_SPEED * dt;
      if (b.x < ARENA_X || b.x > ARENA_X + ARENA_W || b.y < ARENA_Y || b.y > ARENA_Y + ARENA_H)
         bullets.splice(i, 1);
   }

   // Power-ups
   for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.life -= dt;
      if (pu.life <= 0) { powerups.splice(i, 1); continue; }
      if (Math.abs(px - pu.x) < 14 && Math.abs(py - pu.y) < 14) {
         sfx('powerup');
         if (pu.type === 0)      rapidFire  = 8;
         else if (pu.type === 1) spreadShot = 8;
         else if (pu.type === 2) speedBoost = 8;
         else                    invincible = Math.max(invincible, 3.5); // SHIELD
         powerups.splice(i, 1);
      }
   }

   // Enemies
   for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = px - e.x, dy = py - e.y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      e.x += (dx / len) * e.spd * dt;
      e.y += (dy / len) * e.spd * dt;

      let killed = false;
      for (let j = bullets.length - 1; j >= 0; j--) {
         const bul = bullets[j];
         if (Math.abs(bul.x - e.x) < e.r + 3 && Math.abs(bul.y - e.y) < e.r + 3) {
            e.hp--;
            bullets.splice(j, 1);
            if (e.hp <= 0) {
               sfx('explosion');
               const burst = createBurst(e.x, e.y, e.type === 'tank' ? 28 : 18, 55);
               setBurstColors(burst, rgba8(255,100,40,255), rgba8(255,220,60,255), rgba8(255,255,200,255));
               bursts.push(burst);
               dropPowerup(e.x, e.y);
               enemyDefeated(mgr);
               score += (e.type === 'tank' ? 30 : e.type === 'fast' ? 15 : 10) * getWaveNumber(mgr);
               enemies.splice(i, 1);
               killed = true;
            }
            break;
         }
      }
      if (killed) continue;

      // Player contact
      if (Math.abs(px - e.x) < e.r + 7 && Math.abs(py - e.y) < e.r + 7) hitPlayer();
   }

   // Bursts
   for (let i = bursts.length - 1; i >= 0; i--) {
      updateBurst(bursts[i], dt);
      if (isBurstDone(bursts[i])) { destroyBurst(bursts[i]); bursts.splice(i, 1); }
   }

   // Wave progression
   if (!isWaveActive(mgr) && enemies.length === 0) {
      waveDelay -= dt;
      if (waveDelay <= 0) {
         sfx('select');
         const next = getWaveNumber(mgr) + 1;
         const count = 4 + next * 2;
         startWave(mgr, count);
         for (let i = 0; i < count; i++) spawnEnemy(next);
         waveDelay = 3.0;
      }
   }
}

export function draw() {
   const flash = flashTimer > 0 && Math.floor(flashTimer * 22) % 2 === 0;
   cls(flash ? rgba8(60, 10, 10, 255) : rgba8(6, 6, 18, 255));

   if (lives <= 0) {
      rectfill(180, 128, 460, 224, rgba8(8, 4, 18, 240));
      glowRect(180, 128, 460, 224, rgba8(255, 80, 160, 230), 6);
      printBold('GAME OVER', 258, 144, rgba8(255, 80, 160, 255));
      printTight('Score: ' + score, 270, 170, rgba8(255, 220, 80, 255));
      printTight('Best:  ' + best,  270, 186, rgba8(120, 200, 255, 255));
      printFlash(248, 206, 'Z to retry', rgba8(255, 220, 80, 255), -t, 1.6);
      return;
   }

   // Arena grid
   for (let gx = ARENA_X; gx <= ARENA_X + ARENA_W; gx += GRID_STEP)
      vline(gx, ARENA_Y, ARENA_H, rgba8(20, 24, 50, 255));
   for (let gy = ARENA_Y; gy <= ARENA_Y + ARENA_H; gy += GRID_STEP)
      hline(ARENA_X, gy, ARENA_W, rgba8(20, 24, 50, 255));

   rectfill(ARENA_X, ARENA_Y, ARENA_W, ARENA_H, rgba8(10, 12, 26, 180));
   glowRect(ARENA_X, ARENA_Y, ARENA_W, ARENA_H, rgba8(60, 80, 200, 200), 5);

   // Corner accents
   const ca = rgba8(100, 120, 255, 180), cs = 10;
   hline(ARENA_X, ARENA_Y, cs, ca);                        vline(ARENA_X, ARENA_Y, cs, ca);
   hline(ARENA_X + ARENA_W - cs, ARENA_Y, cs, ca);         vline(ARENA_X + ARENA_W, ARENA_Y, cs, ca);
   hline(ARENA_X, ARENA_Y + ARENA_H, cs, ca);              vline(ARENA_X, ARENA_Y + ARENA_H - cs, cs, ca);
   hline(ARENA_X + ARENA_W - cs, ARENA_Y + ARENA_H, cs, ca); vline(ARENA_X + ARENA_W, ARENA_Y + ARENA_H - cs, cs, ca);

   // Power-up icons
   for (const pu of powerups) {
      const pulse = 0.7 + 0.3 * Math.sin(t * 5 + pu.life);
      glowCircle(pu.x, pu.y, Math.floor(9 * pulse), PU_COLS[pu.type], 6);
      printTight(PU_TYPES[pu.type][0], pu.x - 3, pu.y - 4, PU_COLS[pu.type]);
   }

   // Enemies
   for (const e of enemies) {
      const pulse = 0.7 + 0.3 * Math.sin(t * 4 + e.phase);
      glowCircle(e.x, e.y, Math.floor(e.r * pulse), e.col, Math.floor(4 + 3 * pulse));
      circfill(e.x, e.y, Math.floor(e.r * 0.38), rgba8(255, 140, 140, 255));
      for (let h = 0; h < e.maxHp; h++) {
         const hx = e.x - (e.maxHp - 1) * 4 + h * 8;
         circfill(hx, e.y - e.r - 6, 2, h < e.hp ? rgba8(255, 80, 80, 255) : rgba8(60, 20, 20, 180));
      }
   }

   // Bullets — glowing streaks
   for (const b of bullets) {
      const tx = b.x - b.dx * 10, ty = b.y - b.dy * 10;
      glowLine(tx, ty, b.x, b.y, rgba8(255, 240, 80, 255), 3);
      glowCircle(b.x, b.y, 3, rgba8(255, 255, 180, 255), 4);
   }

   // Player (flicker while invincible)
   if (invincible <= 0 || Math.floor(t * 12) % 2 === 0) {
      glowCircle(px, py, 9, rgba8(60, 160, 255, 255), 6);
      circfill(px, py, 6, rgba8(120, 200, 255, 255));
      const pdx = Math.cos(shootAngle), pdy = Math.sin(shootAngle);
      glowLine(px + pdx * 8, py + pdy * 8, px + pdx * 16, py + pdy * 16, rgba8(200, 240, 255, 200), 3);
   }

   for (const b of bursts) drawBurst(b);

   // HUD bar
   rectfill(0, 0, 640, 44, rgba8(4, 4, 14, 230));
   glowLine(0, 44, 640, 44, rgba8(60, 80, 200, 160), 2);

   printBold('WAVE ' + getWaveNumber(mgr), 10, 5, rgba8(255, 200, 60, 255));
   print('enemies: ' + getRemainingEnemies(mgr), 10, 22, rgba8(255, 100, 80, 200));
   printBold('SCORE ' + score, 452, 5, rgba8(80, 220, 255, 255));
   print('BEST ' + best, 452, 22, rgba8(140, 160, 220, 160));

   // Lives (green circles) + HP pips
   for (let i = 0; i < lives; i++) circfill(248 + i * 14, 10, 5, rgba8(80, 220, 120, 255));
   for (let i = 0; i < maxHp; i++)
      circfill(248 + i * 14, 28, 4, i < playerHp ? rgba8(255, 80, 80, 255) : rgba8(60, 20, 20, 180));

   // Active power-up timers
   let puX = 248;
   if (rapidFire > 0)  { printTight('RAPID '  + rapidFire.toFixed(0)  + 's', puX, 38, PU_COLS[0]); puX += 78; }
   if (spreadShot > 0) { printTight('SPREAD ' + spreadShot.toFixed(0) + 's', puX, 38, PU_COLS[1]); puX += 88; }
   if (speedBoost > 0) { printTight('SPEED '  + speedBoost.toFixed(0) + 's', puX, 38, PU_COLS[2]); }

   if (!isWaveActive(mgr) && enemies.length === 0)
      printFlash(220, 18, 'WAVE CLEAR!', rgba8(80, 255, 120, 255), t, 3.0);
}
