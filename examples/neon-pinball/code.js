// Nova64 Game Cart: NEON PINBALL
// Z = left flipper / hold Z while serving to charge plunger, release to launch.
// X = right flipper.  Chain bumper hits for combos.  One drain guard per game.

const BALL_R = 6;
const GRAVITY = 280;
const TX = 60, TY = 42, TW = 520, TH = 308;
const TX2 = TX + TW, TY2 = TY + TH;
const LFX = 210, RFX = 430, FY = TY2 - 12, FL = 95;

const SERVE_X = 320, SERVE_Y = 295;  // ball rests here during serve
const MAX_SPEED = 480;

const BUMPERS = [
   { x: 210, y: 130, r: 22, col: 0 },
   { x: 320, y: 108, r: 26, col: 1 },
   { x: 430, y: 130, r: 22, col: 2 },
   { x: 265, y: 205, r: 18, col: 2 },
   { x: 375, y: 205, r: 18, col: 0 },
];
const BCOLS = [
   [255,  60, 200],
   [ 60, 220, 255],
   [140, 255,  60],
];

// ── State ─────────────────────────────────────────────────────────────────────
let state; // 'serving' | 'playing' | 'lost'
let t, bx, by, vx, vy;
let launchPower, zWasDown;
let score, best, lives;
let combo, comboTimer;
let trail, bursts, bumperFlash;
let drainSaved, savedTimer;  // one-per-game drain guard

export function init() {
   best = loadData('np_best', 0);
   t = 0; state = 'serving';
   score = 0; lives = 3;
   combo = 0; comboTimer = 0;
   trail = []; bursts = [];
   bumperFlash = [0, 0, 0, 0, 0];
   launchPower = 0; zWasDown = false;
   drainSaved = false; savedTimer = 0;
   bx = SERVE_X; by = SERVE_Y; vx = 0; vy = 0;
   sfx('blip');
}

// ── Bumper hit ────────────────────────────────────────────────────────────────
function reflectBumper(i) {
   const b = BUMPERS[i];
   const dx = bx - b.x, dy = by - b.y;
   const len = Math.sqrt(dx*dx + dy*dy) || 1;
   const nx = dx/len, ny = dy/len;
   const dot = vx*nx + vy*ny;
   vx -= 2*dot*nx; vy -= 2*dot*ny;
   const spd = Math.sqrt(vx*vx + vy*vy);
   const ns = Math.max(spd, 180) * 1.12;
   vx = vx/spd*ns; vy = vy/spd*ns;
   bx = b.x + nx*(b.r + BALL_R + 1);
   by = b.y + ny*(b.r + BALL_R + 1);
   const c = BCOLS[b.col];
   const burst = createBurst(b.x, b.y, 16, 55);
   setBurstColors(burst, rgba8(c[0],c[1],c[2],255), rgba8(255,255,200,255), rgba8(255,255,255,160));
   bursts.push(burst);
   combo++;
   comboTimer = 2.5;
   score += 100 * Math.max(1, combo);
   if (score > best) { best = score; saveData('np_best', best); }
   sfx('blip');
}

// ── Update ────────────────────────────────────────────────────────────────────
export function update(dt) {
   t += dt;
   savedTimer = Math.max(0, savedTimer - dt);

   // ── Lost ──
   if (state === 'lost') {
      if (btnp('z') || btnp('x')) init();
      return;
   }

   // ── Serving (plunger) ──
   if (state === 'serving') {
      const zNow = btn('z');
      if (zNow) launchPower = Math.min(1, launchPower + dt * 0.75);
      if (!zNow && zWasDown && launchPower > 0.05) {
         // Release → launch
         const power = launchPower;
         bx = SERVE_X; by = SERVE_Y;
         vx = (rngRandom() - 0.5) * 40;
         vy = -(140 + power * 320);
         launchPower = 0;
         state = 'playing';
         sfx('select');
      }
      zWasDown = zNow;
      return;
   }

   // ── Playing ──
   if (comboTimer > 0) comboTimer -= dt;
   else combo = 0;

   // Ball trail
   trail.push({ x: bx, y: by, age: 0 });
   for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].age += dt;
      if (trail[i].age > 0.1) trail.splice(i, 1);
   }

   // Physics
   vy += GRAVITY * dt;
   bx += vx * dt;
   by += vy * dt;

   // Walls
   if (bx < TX + BALL_R)  { bx = TX + BALL_R;  vx =  Math.abs(vx); sfx('hit'); }
   if (bx > TX2 - BALL_R) { bx = TX2 - BALL_R; vx = -Math.abs(vx); sfx('hit'); }
   if (by < TY + BALL_R)  { by = TY + BALL_R;  vy =  Math.abs(vy) * 0.8; }

   // Gutter diagonals
   if (bx < LFX && by > FY - 25) {
      const wall = TY2 - (bx - TX) * 0.4;
      if (by > wall) vx = Math.abs(vx) + 15;
   }
   if (bx > RFX && by > FY - 25) {
      const wall = TY2 - (TX2 - bx) * 0.4;
      if (by > wall) vx = -(Math.abs(vx) + 15);
   }

   // Drain
   if (by > TY2 + 20) {
      trail = [];
      if (!drainSaved) {
         drainSaved = true;
         savedTimer = 1.8;
         bx = SERVE_X; by = SERVE_Y; vx = 0; vy = 0;
         launchPower = 0; zWasDown = false;
         state = 'serving';
         sfx('coin');
      } else {
         lives--;
         sfx('death');
         combo = 0;
         if (lives <= 0) {
            state = 'lost';
         } else {
            bx = SERVE_X; by = SERVE_Y; vx = 0; vy = 0;
            launchPower = 0; zWasDown = false;
            state = 'serving';
         }
      }
      return;
   }

   // Flippers
   const lFlip = btn('z') ? 1 : 0;
   const rFlip = btn('x') ? 1 : 0;
   if (vy > 0) {
      const ldx = bx - LFX;
      if (ldx > 0 && ldx < FL && Math.abs(by - FY) < 14 && lFlip) {
         vy = -Math.abs(vy) * 1.15; vx += 45; score += 10;
         sfx('hit');
      }
      const rdx = RFX - bx;
      if (rdx > 0 && rdx < FL && Math.abs(by - FY) < 14 && rFlip) {
         vy = -Math.abs(vy) * 1.15; vx -= 45; score += 10;
         sfx('hit');
      }
   }

   // Bumpers
   for (let i = 0; i < BUMPERS.length; i++) {
      const b = BUMPERS[i];
      const dx = bx - b.x, dy = by - b.y;
      if (dx*dx + dy*dy < (b.r + BALL_R)*(b.r + BALL_R)) {
         reflectBumper(i);
         bumperFlash[i] = 0.18;
      }
      if (bumperFlash[i] > 0) bumperFlash[i] -= dt;
   }

   // Speed cap
   const spd = Math.sqrt(vx*vx + vy*vy);
   if (spd > MAX_SPEED) { vx = vx/spd*MAX_SPEED; vy = vy/spd*MAX_SPEED; }

   // Bursts
   for (let i = bursts.length - 1; i >= 0; i--) {
      updateBurst(bursts[i], dt);
      if (isBurstDone(bursts[i])) { destroyBurst(bursts[i]); bursts.splice(i, 1); }
   }
}

// ── Draw ──────────────────────────────────────────────────────────────────────
export function draw() {
   cls(rgba8(4, 2, 14, 255));

   // ── Table ─────────────────────────────────────────────────────────────────
   rectfill(TX, TY, TW, TH, rgba8(8, 6, 20, 255));
   for (let gx = TX+52; gx < TX2; gx += 52) vline(gx, TY+2, TH-4, rgba8(14,12,32,255));
   for (let gy = TY+44; gy < TY2; gy += 44) hline(TX+2, gy, TW-4, rgba8(14,12,32,255));
   glowRect(TX, TY, TW, TH, rgba8(80, 60, 210, 230), 4);
   const ca = rgba8(120, 140, 255, 200), cs = 16;
   hline(TX,     TY,     cs, ca); vline(TX,     TY,     cs, ca);
   hline(TX2-cs, TY,     cs, ca); vline(TX2,    TY,     cs, ca);
   hline(TX,     TY2,    cs, ca); vline(TX,     TY2-cs, cs, ca);
   hline(TX2-cs, TY2,    cs, ca); vline(TX2,    TY2-cs, cs, ca);

   // Gutters
   const gc = rgba8(60, 80, 200, 200);
   glowLine(TX,  FY-28, LFX-18, TY2+8, gc, 3);
   glowLine(TX2, FY-28, RFX+18, TY2+8, gc, 3);

   // ── Bumpers ───────────────────────────────────────────────────────────────
   for (let i = 0; i < BUMPERS.length; i++) {
      const b = BUMPERS[i];
      const c = BCOLS[b.col];
      const lit = bumperFlash[i] > 0;
      const pulse = 0.65 + 0.35 * Math.sin(t * 3.2 + i * 1.4);
      const col = lit ? rgba8(255, 255, 180, 255) : rgba8(c[0], c[1], c[2], Math.floor(160 + 95*pulse));
      glowCircle(b.x, b.y, b.r,     col, lit ? 14 : Math.floor(4 + 5*pulse));
      circfill(  b.x, b.y, b.r - 7, lit ? rgba8(255,255,220,255) : rgba8(c[0],c[1],c[2],230));
      circ(      b.x, b.y, b.r,     rgba8(200,200,255,60));
   }

   // ── Flippers ──────────────────────────────────────────────────────────────
   const lFlipNow = btn('z') && state === 'playing' ? 1 : 0;
   const rFlipNow = btn('x') ? 1 : 0;
   const lAngle = lFlipNow ? -0.5 : 0.4;
   const rAngle = rFlipNow ? Math.PI + 0.5 : Math.PI - 0.4;
   const ltx = LFX + Math.cos(lAngle)*FL, lty = FY + Math.sin(lAngle)*FL;
   const rtx = RFX + Math.cos(rAngle)*FL, rty = FY + Math.sin(rAngle)*FL;
   const fc = rgba8(80, 210, 255, 255);
   glowLine(LFX, FY, ltx, lty, fc, lFlipNow ? 7 : 3);
   glowLine(RFX, FY, rtx, rty, fc, rFlipNow ? 7 : 3);
   circfill(LFX, FY, 5, rgba8(130, 230, 255, 255));
   circfill(RFX, FY, 5, rgba8(130, 230, 255, 255));

   // ── Ball trail ────────────────────────────────────────────────────────────
   for (const tr of trail) {
      const a = 1 - tr.age / 0.1;
      const r = Math.floor(BALL_R * a * 0.65);
      if (r > 0) circfill(Math.floor(tr.x), Math.floor(tr.y), r, rgba8(255, 200, 60, Math.floor(160*a)));
   }

   // ── Ball ──────────────────────────────────────────────────────────────────
   glowCircle(bx, by, BALL_R + 1, rgba8(255, 240, 80, 255), 7);
   circfill(bx, by, BALL_R - 1, rgba8(255, 255, 190, 255));

   // ── Particle bursts ───────────────────────────────────────────────────────
   for (const b of bursts) drawBurst(b);

   // ── Plunger serve overlay ─────────────────────────────────────────────────
   if (state === 'serving') {
      const barH = 80, barX = 570, barY = 200;
      rectfill(barX, barY, 16, barH, rgba8(20, 10, 40, 220));
      rect(barX, barY, 16, barH, rgba8(80, 60, 180, 200));
      const filled = Math.floor(barH * launchPower);
      if (filled > 0) {
         const barCol = launchPower > 0.7 ? rgba8(255, 80, 80, 255) : rgba8(80, 220, 255, 255);
         rectfill(barX, barY + barH - filled, 16, filled, barCol);
         if (launchPower > 0.7) glowRect(barX, barY + barH - filled, 16, filled, rgba8(255, 80, 80, 200), 4);
      }
      printTight('PWR', barX - 1, barY + barH + 4, rgba8(160, 180, 255, 220));
      if (!drainSaved) {
         printTight('Hold Z, release to launch', 198, SERVE_Y + 16, rgba8(200, 220, 255, 200));
         printTight('Z left flipper  X right flipper', 192, SERVE_Y + 30, rgba8(160, 160, 200, 180));
      } else {
         printTight('Hold Z, release to launch', 198, SERVE_Y + 16, rgba8(200, 220, 255, 200));
      }
   }

   // ── SAVED! flash ──────────────────────────────────────────────────────────
   if (savedTimer > 0) {
      const a = Math.floor(Math.min(255, savedTimer / 1.8 * 255));
      printBold('SAVED!', 270, SERVE_Y - 20, rgba8(80, 255, 160, a));
      printTight('Drain guard used!', 248, SERVE_Y - 6, rgba8(140, 220, 140, Math.floor(a * 0.7)));
   }

   // ── HUD ───────────────────────────────────────────────────────────────────
   rectfill(0, 0, 640, 38, rgba8(4, 4, 14, 235));
   glowLine(0, 38, 640, 38, rgba8(60, 80, 200, 160), 2);
   printBold('NEON PINBALL', 8, 5, rgba8(200, 80, 255, 255));
   printTight('Z:left  X:right', 8, 23, rgba8(90, 110, 190, 160));
   printBold('SCORE', 248, 5, rgba8(110, 150, 255, 200));
   printBold('' + score, 300, 5, rgba8(255, 240, 80, 255));
   printTight('BEST ' + best, 436, 5, rgba8(180, 120, 255, 200));
   if (comboTimer > 0 && combo > 1) {
      const alpha = Math.floor((comboTimer / 2.5) * 255);
      printBold('x' + combo + ' COMBO!', 290, 22, rgba8(255, 200, 50, alpha));
   }
   for (let i = 0; i < lives; i++) glowCircle(536 + i * 28, 20, 9, rgba8(80, 200, 255, 255), 5);
   if (!drainSaved) {
      printTight('GUARD', 526, 5, rgba8(80, 255, 160, 200));
   }

   // ── Lost overlay ──────────────────────────────────────────────────────────
   if (state === 'lost') {
      rectfill(148, 132, 344, 118, rgba8(8, 4, 28, 240));
      glowRect(148, 132, 344, 118, rgba8(255, 60, 60, 200), 5);
      printBold('GAME OVER', 218, 148, rgba8(255, 80, 60, 255));
      printBold('SCORE  ' + score, 224, 172, rgba8(200, 200, 255, 255));
      printTight('BEST   ' + best,  230, 188, rgba8(180, 120, 255, 200));
      printFlash(222, 208, 'Z / X TO REPLAY', rgba8(180, 180, 255, 255), t, 2.0);
   }
}
