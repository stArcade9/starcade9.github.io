// particle-trail — Mouse-following particle trail using createEmitter2D
// Shows: createEmitter2D, following pointer/touch, color gradients, BM.ADD

const { BM, cls, line, print, screenHeight, screenWidth } = nova64.draw;
const { createEmitter2D, drawEmitter2D, updateEmitter2D } = nova64.fx;
const { color } = nova64.util;

let W = 640,
  H = 360;

let trailEmitter;
let sparkEmitter;
let mouseX = W / 2;
let mouseY = H / 2;
let prevX = W / 2;
let prevY = H / 2;
let time = 0;

// Track mouse / touch in the page canvas
function _setupPointer() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const rect = () => canvas.getBoundingClientRect();
  const scaleX = () => W / canvas.clientWidth;
  const scaleY = () => H / canvas.clientHeight;

  canvas.addEventListener(
    'mousemove',
    e => {
      const r = rect();
      mouseX = (e.clientX - r.left) * scaleX();
      mouseY = (e.clientY - r.top) * scaleY();
    },
    { passive: true }
  );

  canvas.addEventListener(
    'touchmove',
    e => {
      const r = rect();
      const t = e.touches[0];
      mouseX = (t.clientX - r.left) * scaleX();
      mouseY = (t.clientY - r.top) * scaleY();
    },
    { passive: true }
  );
}

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
  _setupPointer();

  trailEmitter = createEmitter2D({
    blendMode: 'add',
    x: mouseX,
    y: mouseY,
    rate: 80, // 80 per second when mouse moves
    maxParticles: 400,
    life: 0.6,
    lifeVariance: 0.2,
    speed: 18,
    speedVariance: 10,
    angle: 0,
    angleVariance: Math.PI, // all directions
    gravity: -15,
    startSize: 6,
    endSize: 1,
    startAlpha: 0.85,
    endAlpha: 0,
    colors: [0xffffff, 0xaaddff, 0x44aaff, 0x6644ff],
  });

  sparkEmitter = createEmitter2D({
    blendMode: 'add',
    x: mouseX,
    y: mouseY,
    rate: 0,
    maxParticles: 60,
    life: 0.4,
    lifeVariance: 0.15,
    speed: 55,
    speedVariance: 30,
    angle: 0,
    angleVariance: Math.PI,
    gravity: 80,
    startSize: 4,
    endSize: 0,
    startAlpha: 1,
    endAlpha: 0,
    colors: [0xffcc44, 0xff8844, 0xff4444],
  });
}

export function update(dt) {
  time += dt;

  // Move speed for emission rate scaling
  const dx = mouseX - prevX;
  const dy = mouseY - prevY;
  const spd = Math.sqrt(dx * dx + dy * dy) / dt;
  prevX = mouseX;
  prevY = mouseY;

  // Update emitter positions
  trailEmitter.x = mouseX;
  trailEmitter.y = mouseY;
  sparkEmitter.x = mouseX;
  sparkEmitter.y = mouseY;

  // Scale emission rate by movement speed
  trailEmitter.rate = Math.min(200, spd * 0.5);

  // Occasional spark burst when moving fast
  if (spd > 100 && Math.random() < 0.15) {
    burst(sparkEmitter, (8 + 0) | (Math.random() * 12));
  }

  updateEmitter2D(trailEmitter, dt);
  updateEmitter2D(sparkEmitter, dt);

  // Idle drift — use tween to gently move target
  if (spd < 2) {
    mouseX += Math.sin(time * 1.3) * 0.5;
    mouseY += Math.cos(time * 1.1) * 0.5;
  }
}

export function draw() {
  // Dark fade-trail for motion blur effect
  cls(0x050510);

  // Grid
  for (let x = 0; x < W; x += 40) line(x, 0, x, H, 0x0d1a2a);
  for (let y = 0; y < H; y += 40) line(0, y, W, y, 0x0d1a2a);

  drawEmitter2D(trailEmitter);
  drawEmitter2D(sparkEmitter);

  // Crosshair at pointer
  line(mouseX - 8, mouseY, mouseX + 8, mouseY, 0xffffff44);
  line(mouseX, mouseY - 8, mouseX, mouseY + 8, 0xffffff44);

  print('PARTICLE TRAIL', 4, 4, 0xffffff);
  print('Move your mouse! createEmitter2D • BM.ADD', 4, H - 12, 0x778899);
}
