// Nova64 game: Stealth Runner
// Move through spotlight-lit corridors without being caught.
// Arrow keys/WASD to move. Reach the exit (green) without touching a spotlight.

let t = 0;
let px = 80, py = 180;
let spots = [];
let caught = false;
let win = false;
let level = 1;

const SPEED = 70;
const EXIT_X = 540, EXIT_Y = 160;

function buildLevel(lv) {
   for (let i = 0; i < spots.length; i++) destroySpotlight(spots[i]);
   spots = [];
   caught = false;
   win = false;
   px = 80; py = 180;

   const count = 2 + lv;
   for (let i = 0; i < count; i++) {
      const cx = 180 + i * 90;
      const cy = 100 + (i % 2) * 140;
      const r  = 55 + lv * 4;
      const s  = createSpotlight(cx, cy, r);
      setSpotlightColor(s, rgba8(0, 0, 10, 210));
      spots.push({ handle: s, cx: cx, cy: cy, base_cx: cx, base_cy: cy, r: r,
                   ox: (i % 2 === 0 ? 1 : -1) * 60, oy: (i % 3 === 0 ? 1 : -1) * 40,
                   spd: 0.4 + i * 0.15 + lv * 0.1 });
   }
}

export function init() {
   buildLevel(1);
}

export function update(dt) {
   if (caught || win) {
      if (btnp("z")) {
         if (win) level++;
         buildLevel(level);
      }
      return;
   }
   t += dt;

   const left  = btn("left");
   const right = btn("right");
   const up    = btn("up");
   const down  = btn("down");
   if (left)  px -= SPEED * dt;
   if (right) px += SPEED * dt;
   if (up)    py -= SPEED * dt;
   if (down)  py += SPEED * dt;
   px = Math.max(20, Math.min(620, px));
   py = Math.max(40, Math.min(320, py));

   // Move spotlights
   for (let i = 0; i < spots.length; i++) {
      const sp = spots[i];
      const nx = sp.base_cx + Math.cos(t * sp.spd + i) * sp.ox;
      const ny = sp.base_cy + Math.sin(t * sp.spd * 0.7 + i) * sp.oy;
      sp.cx = nx; sp.cy = ny;
      setSpotlightPos(sp.handle, nx, ny);

      // Caught check
      const dx = px - nx, dy = py - ny;
      if (dx*dx + dy*dy < sp.r * sp.r) caught = true;
   }

   // Win check
   if (Math.abs(px - EXIT_X) < 16 && Math.abs(py - EXIT_Y) < 16) win = true;
}

export function draw() {
   cls(rgba8(4, 6, 12, 255));

   // Floor
   for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 11; col++) {
         const c = (row + col) % 2 === 0 ? rgba8(14, 16, 28, 255) : rgba8(10, 12, 20, 255);
         rectfill(col * 60, 40 + row * 40, 58, 38, c);
      }
   }

   // Exit
   rectfill(EXIT_X - 14, EXIT_Y - 14, 28, 28, rgba8(20, 160, 40, 255));
   print('EXIT', EXIT_X - 11, EXIT_Y - 4, rgba8(180, 255, 180, 255));

   // Player (drawn before spotlight overlay)
   rectfill(px - 6, py - 8, 12, 16, caught ? rgba8(255, 60, 60, 255) : rgba8(60, 140, 255, 255));

   // Spotlight overlay (darkens everything outside the circles)
   for (let i = 0; i < spots.length; i++)
      drawSpotlight(spots[i].handle);

   // HUD
   rectfill(0, 0, 640, 36, rgba8(6, 6, 16, 220));
   printBold('STEALTH RUNNER', 10, 6, rgba8(80, 200, 255, 255));
   print('LEVEL ' + level, 490, 6, rgba8(200, 200, 255, 200));
   print('reach the exit  avoid the light', 10, 20, rgba8(120, 120, 180, 160));

   if (caught) {
      rectfill(160, 130, 320, 80, rgba8(180, 20, 20, 220));
      printBold('CAUGHT!', 270, 148, rgba8(255, 220, 80, 255));
      print('press Z to retry', 248, 168, rgba8(255, 200, 200, 200));
   }
   if (win) {
      rectfill(160, 130, 320, 80, rgba8(20, 100, 20, 220));
      printBold('ESCAPED!', 262, 148, rgba8(80, 255, 120, 255));
      print('press Z for next level', 232, 168, rgba8(180, 255, 180, 200));
   }
}
