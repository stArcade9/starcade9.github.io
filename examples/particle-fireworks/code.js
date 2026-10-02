// Nova64 Cart: FIREWORKS SPECTACULAR
// Z = launch firework  |  X = next show  |  Automatic shows cycle every 15s
// Three themed shows: Grand Finale, Aurora Borealis, Gold Rush.

const { BM, cls, print, pset, rectfill, line, screenHeight, screenWidth } = nova64.draw;
const { burstEmitter2D, createEmitter2D, drawEmitter2D, updateEmitter2D } = nova64.fx;

let W = 640, H = 360;

// ── Show definitions ──────────────────────────────────────────────────────────
const SHOWS = [
   {
      name: 'GRAND FINALE',
      interval: [0.35, 0.85],
      palettes: [
         [0xff4444, 0xff8844, 0xffcc44, 0xffffff],
         [0xff44aa, 0xff4488, 0xff8844, 0xffffff],
         [0x44aaff, 0x4488ff, 0xaa44ff, 0xffffff],
         [0x44ff88, 0x88ff44, 0xffff44, 0xffffff],
      ],
      count: [70, 130], gravity: [40, 80], life: [0.7, 1.8],
   },
   {
      name: 'AURORA BOREALIS',
      interval: [1.2, 2.2],
      palettes: [
         [0x44ffcc, 0x44aaff, 0xaa44ff, 0x88ffaa],
         [0x22ddaa, 0x2288ff, 0x8844ff, 0x44ffdd],
      ],
      count: [90, 160], gravity: [15, 40], life: [1.2, 2.4],
   },
   {
      name: 'GOLD RUSH',
      interval: [0.5, 1.1],
      palettes: [
         [0xffcc22, 0xffaa00, 0xff6600, 0xffee88],
         [0xffd700, 0xff8800, 0xffcc44, 0xffffff],
      ],
      count: [60, 110], gravity: [60, 110], life: [0.6, 1.5],
   },
];

// ── State ─────────────────────────────────────────────────────────────────────
let emitters = [];   // { em, life }
let rockets = [];    // { x, y, vy, targetY, color, done, emDone }
let showIdx = 0, showTimer = 0, showNameTimer = 0;
let launchTimer = 0, launchInterval = 1.0;
let time = 0;

// ── City geometry (pre-generated once) ───────────────────────────────────────
let buildings = [];

function buildCity() {
   buildings = [];
   let bx = 0;
   while (bx < W) {
      const bw = 13 + ((bx * 17 + 3) % 18);
      const bh = 22 + ((bx * 13 + 7) % 44);
      const hasAntenna = bh > 38;
      buildings.push({ bx, bw, bh, hasAntenna });
      bx += bw + 1;
   }
}

// ── Firework launch ───────────────────────────────────────────────────────────
function launchRocket(x, y) {
   const show = SHOWS[showIdx];
   const pal = show.palettes[Math.floor(Math.random() * show.palettes.length)];
   const color = pal[Math.floor(Math.random() * pal.length)];
   const speed = 220 + Math.random() * 120;
   rockets.push({
      x, startY: H - 34, y: H - 34,
      vy: -speed, targetY: y,
      color, pal, done: false, emDone: false,
      count:   Math.floor(show.count[0]   + Math.random() * (show.count[1]   - show.count[0])),
      gravity: show.gravity[0] + Math.random() * (show.gravity[1] - show.gravity[0]),
      life:    show.life,
   });
}

function burstRocket(r) {
   const em = createEmitter2D({
      blendMode: BM.ADD,
      x: r.x, y: r.targetY,
      emitRate: 0,
      maxParticles: r.count,
      life: r.life,
      speed: [18, 110],
      angle: [-Math.PI, Math.PI],
      gravity: r.gravity,
      scale: [0.4, 1.3],
      alpha: [0.8, 1.0],
      fadeOut: true,
      scaleDown: true,
      tint: r.pal[Math.floor(Math.random() * r.pal.length)],
   });
   burstEmitter2D(em, r.count);
   emitters.push({ em, life: r.life[1] + 0.5 });

   // Secondary burst (20% chance)
   if (Math.random() < 0.2) {
      const em2 = createEmitter2D({
         blendMode: BM.ADD,
         x: r.x, y: r.targetY,
         emitRate: 0,
         maxParticles: Math.floor(r.count * 0.5),
         life: [r.life[0] * 0.6, r.life[1] * 0.6],
         speed: [60, 150],
         angle: [-Math.PI, Math.PI],
         gravity: r.gravity * 0.6,
         scale: [0.25, 0.7],
         alpha: [0.6, 1.0],
         fadeOut: true,
         scaleDown: true,
         tint: r.pal[(Math.floor(Math.random() * r.pal.length) + 1) % r.pal.length],
      });
      burstEmitter2D(em2, Math.floor(r.count * 0.5));
      emitters.push({ em: em2, life: r.life[1] * 0.6 + 0.3 });
   }
   sfx('explosion');
}

export function init() {
   W = typeof screenWidth  === 'function' ? screenWidth()  : 640;
   H = typeof screenHeight === 'function' ? screenHeight() : 360;
   emitters = []; rockets = [];
   showIdx = 0; showTimer = 0; showNameTimer = 4.0;
   launchTimer = 0; launchInterval = 0.8; time = 0;
   buildCity();
   launchRocket(W * 0.5, H * 0.25);
}

export function update(dt) {
   time += dt;
   showTimer += dt;

   // Show cycling
   if (showTimer >= 15) {
      showTimer = 0;
      showIdx = (showIdx + 1) % SHOWS.length;
      showNameTimer = 3.0;
      sfx('select');
   }
   if (showNameTimer > 0) showNameTimer -= dt;

   // Manual launch
   if (btnp('z')) {
      launchRocket(60 + Math.random() * (W - 120), 30 + Math.random() * (H * 0.5));
      launchTimer = 0;
   }
   if (btnp('x')) {
      showTimer = 0;
      showIdx = (showIdx + 1) % SHOWS.length;
      showNameTimer = 3.0;
      sfx('select');
   }

   // Auto launch
   launchTimer += dt;
   if (launchTimer >= launchInterval) {
      launchTimer = 0;
      const show = SHOWS[showIdx];
      launchInterval = show.interval[0] + Math.random() * (show.interval[1] - show.interval[0]);
      launchRocket(
         60 + Math.random() * (W - 120),
         28 + Math.random() * (H * 0.52)
      );
   }

   // Update rockets
   for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      if (!r.done) {
         r.y += r.vy * dt;
         if (r.y <= r.targetY) {
            r.done = true;
            burstRocket(r);
         }
      } else {
         r.emDone = true;
         rockets.splice(i, 1);
      }
   }

   // Update and prune emitters
   emitters = emitters.filter(e => {
      e.life -= dt;
      updateEmitter2D(e.em, dt);
      return e.life > 0;
   });
}

function drawCity() {
   rectfill(0, H - 30, W, 30, rgba8(6, 6, 18, 255));
   for (const b of buildings) {
      rectfill(b.bx, H - 30 - b.bh, b.bw - 1, b.bh, rgba8(8, 8, 22, 255));
      // Windows
      for (let wy = H - 28 - b.bh; wy < H - 34; wy += 6) {
         for (let wx = b.bx + 2; wx < b.bx + b.bw - 2; wx += 4) {
            if (Math.sin(b.bx * 7 + wy * 13) > 0.2) {
               const flicker = 0.85 + 0.15 * Math.sin(time * 0.5 + b.bx + wy);
               pset(wx, wy, rgba8(255, 240, 160, Math.floor(160 * flicker)));
            }
         }
      }
      // Antenna
      if (b.hasAntenna) {
         const ax = b.bx + Math.floor(b.bw / 2);
         for (let ay = H - 30 - b.bh - 10; ay < H - 30 - b.bh; ay++) {
            pset(ax, ay, rgba8(50, 50, 70, 255));
         }
         if (Math.floor(time * 1.2) % 2 === 0) {
            pset(ax, H - 30 - b.bh - 10, rgba8(255, 50, 50, 255));
         }
      }
   }
}

function drawStars() {
   for (let i = 0; i < 48; i++) {
      const sx = (i * 137 + 3) % W;
      const sy = (i * 97 + 11) % (H - 50);
      const br = Math.floor((0.5 + 0.5 * Math.sin(time * 2 + i)) * 200);
      pset(sx, sy, rgba8(br, br, Math.min(255, br + 40), 255));
   }
}

export function draw() {
   cls(rgba8(4, 3, 14, 255));

   drawStars();

   // Rising rockets
   for (const r of rockets) {
      if (!r.done) {
         const alpha = Math.floor(Math.min(255, (r.startY - r.y) / (r.startY - r.targetY) * 255));
         const trailLen = 18;
         const ty = Math.min(r.startY, r.y + trailLen);
         glowLine(r.x, r.y, r.x, ty, rgba8(255, 255, 200, Math.floor(alpha * 0.7)), 3);
         glowCircle(r.x, r.y, 2, rgba8(255, 255, 220, alpha), 5);
      }
   }

   // Emitter particles
   for (const e of emitters) drawEmitter2D(e.em);

   drawCity();

   // Show name title card
   if (showNameTimer > 0) {
      const fade = Math.min(1, showNameTimer / 0.6) * Math.min(1, showNameTimer);
      const alpha = Math.floor(fade * 255);
      const name = SHOWS[showIdx].name;
      const px = Math.floor(W / 2 - name.length * 4);
      rectfill(px - 10, 10, name.length * 8 + 20, 22, rgba8(0, 0, 0, Math.floor(fade * 180)));
      printBold(name, px, 15, rgba8(255, 230, 80, alpha));
   }

   // HUD
   printTight('Z LAUNCH   X NEXT SHOW', 8, H - 14, rgba8(100, 120, 200, 180));
   printTight(SHOWS[showIdx].name, W - SHOWS[showIdx].name.length * 5 - 8, H - 14, rgba8(160, 180, 255, 180));
}
