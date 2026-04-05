// BOIDS FLOCKING SIMULATION — Mesmerizing Emergent Behavior
// Uses the Nova64 generative art API for noise and HSB colors
// Watch hundreds of autonomous agents self-organize into beautiful flocks

const NUM_BOIDS = 350;
const SEPARATION_RADIUS = 12;
const ALIGNMENT_RADIUS = 25;
const COHESION_RADIUS = 35;
const MAX_SPEED = 3.2;
const MAX_FORCE = 0.12;
const TRAIL_LENGTH = 8;
const W = 640,
  H = 360;

let boids = [];
let predator = null;
let mode = 0; // 0=flock, 1=predator, 2=vortex, 3=fireworks
const MODES = ['FLOCKING', 'PREDATOR CHASE', 'COSMIC VORTEX', 'FIREWORKS'];
let modeTimer = 0;
let autoSwitch = true;
let time = 0;
let backgroundColor = 0;

class Boid {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * MAX_SPEED * 0.5;
    this.vy = Math.sin(angle) * MAX_SPEED * 0.5;
    this.hue = Math.random() * 360;
    this.trail = [];
    this.size = 2 + Math.random() * 1.5;
  }

  update(flock) {
    // Reynolds flocking rules
    let sepX = 0,
      sepY = 0,
      sepCount = 0;
    let aliVx = 0,
      aliVy = 0,
      aliCount = 0;
    let cohX = 0,
      cohY = 0,
      cohCount = 0;

    for (const other of flock) {
      if (other === this) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < SEPARATION_RADIUS && d > 0) {
        sepX -= dx / d;
        sepY -= dy / d;
        sepCount++;
      }
      if (d < ALIGNMENT_RADIUS) {
        aliVx += other.vx;
        aliVy += other.vy;
        aliCount++;
      }
      if (d < COHESION_RADIUS) {
        cohX += other.x;
        cohY += other.y;
        cohCount++;
      }
    }

    let fx = 0,
      fy = 0;

    // Separation
    if (sepCount > 0) {
      sepX /= sepCount;
      sepY /= sepCount;
      fx += sepX * 1.8;
      fy += sepY * 1.8;
    }
    // Alignment
    if (aliCount > 0) {
      aliVx /= aliCount;
      aliVy /= aliCount;
      fx += (aliVx - this.vx) * 0.08;
      fy += (aliVy - this.vy) * 0.08;
    }
    // Cohesion
    if (cohCount > 0) {
      cohX /= cohCount;
      cohY /= cohCount;
      fx += (cohX - this.x) * 0.003;
      fy += (cohY - this.y) * 0.003;
    }

    // Mode-specific forces
    if (mode === 1 && predator) {
      // Flee from predator
      const dx = this.x - predator.x;
      const dy = this.y - predator.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 80 && d > 0) {
        const flee = (80 - d) / 80;
        fx += (dx / d) * flee * 0.5;
        fy += (dy / d) * flee * 0.5;
      }
    } else if (mode === 2) {
      // Vortex — spiral toward center with noise
      const cx = W / 2,
        cy = H / 2;
      const dx = cx - this.x,
        dy = cy - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const n = noise(this.x * 0.005, this.y * 0.005, time * 0.3);
      const angle = Math.atan2(dy, dx) + Math.PI * 0.4 + n * 2;
      fx += Math.cos(angle) * 0.15;
      fy += Math.sin(angle) * 0.15;
      if (d > 150) {
        fx += dx * 0.001;
        fy += dy * 0.001;
      }
    } else if (mode === 3) {
      // Fireworks — noise bursts from center
      const n = noise(this.x * 0.01 + time, this.y * 0.01, time * 0.5);
      fx += Math.cos(n * TWO_PI * 2) * 0.2;
      fy += Math.sin(n * TWO_PI * 2) * 0.2;
    }

    // Clamp force
    const fm = Math.sqrt(fx * fx + fy * fy);
    if (fm > MAX_FORCE) {
      fx = (fx / fm) * MAX_FORCE;
      fy = (fy / fm) * MAX_FORCE;
    }

    this.vx += fx;
    this.vy += fy;

    // Clamp speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Wrap edges
    if (this.x < -10) this.x += W + 20;
    if (this.x > W + 10) this.x -= W + 20;
    if (this.y < -10) this.y += H + 20;
    if (this.y > H + 10) this.y -= H + 20;

    // Trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > TRAIL_LENGTH) this.trail.shift();

    // Color drift
    this.hue = (this.hue + speed * 0.3) % 360;
  }
}

export function init() {
  noiseSeed(42);
  boids = [];
  for (let i = 0; i < NUM_BOIDS; i++) {
    boids.push(new Boid(Math.random() * W, Math.random() * H));
  }
  predator = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
}

export function update(dt) {
  time += dt;
  modeTimer += dt;

  // Auto-switch modes every 12 seconds
  if (autoSwitch && modeTimer > 12) {
    mode = (mode + 1) % MODES.length;
    modeTimer = 0;
  }

  // Manual mode switch
  if (keyp('ArrowRight')) {
    mode = (mode + 1) % MODES.length;
    modeTimer = 0;
    autoSwitch = false;
  }
  if (keyp('ArrowLeft')) {
    mode = (mode - 1 + MODES.length) % MODES.length;
    modeTimer = 0;
    autoSwitch = false;
  }
  if (keyp('Space') || btnp(13)) {
    autoSwitch = !autoSwitch;
    modeTimer = 0;
  }

  // Predator follows a lissajous curve
  if (mode === 1) {
    predator.x = W / 2 + Math.sin(time * 0.7) * 200;
    predator.y = H / 2 + Math.cos(time * 1.1) * 120;
  }

  // Update all boids with spatial optimization (grid)
  for (const b of boids) {
    b.update(boids);
  }

  // Slowly shift background hue
  backgroundColor = hsb((time * 5) % 360, 15, 5);
}

export function draw() {
  cls(backgroundColor);

  // Draw trails
  for (const b of boids) {
    for (let i = 1; i < b.trail.length; i++) {
      const alpha = (i / b.trail.length) * 0.4;
      const col = hsb(b.hue, 70, 80 + i * 2, alpha);
      line(b.trail[i - 1].x | 0, b.trail[i - 1].y | 0, b.trail[i].x | 0, b.trail[i].y | 0, col);
    }
  }

  // Draw boids as directional triangles
  for (const b of boids) {
    const angle = Math.atan2(b.vy, b.vx);
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    const brightness = 60 + speed * 12;
    const col = hsb(b.hue, 80, Math.min(100, brightness));
    const s = b.size;

    // Triangle pointing in direction of movement
    const x1 = b.x + Math.cos(angle) * s * 2;
    const y1 = b.y + Math.sin(angle) * s * 2;
    const x2 = b.x + Math.cos(angle + 2.4) * s;
    const y2 = b.y + Math.sin(angle + 2.4) * s;
    const x3 = b.x + Math.cos(angle - 2.4) * s;
    const y3 = b.y + Math.sin(angle - 2.4) * s;

    line(x1 | 0, y1 | 0, x2 | 0, y2 | 0, col);
    line(x2 | 0, y2 | 0, x3 | 0, y3 | 0, col);
    line(x3 | 0, y3 | 0, x1 | 0, y1 | 0, col);
  }

  // Draw predator in chase mode
  if (mode === 1) {
    const pulse = Math.sin(time * 6) * 0.3 + 0.7;
    const r = 6 + pulse * 4;
    circle(predator.x | 0, predator.y | 0, r, rgba8(255, 50, 50, 200), true);
    circle(predator.x | 0, predator.y | 0, r + 3, rgba8(255, 100, 50, 100), false);
    // Danger zone ring
    circle(predator.x | 0, predator.y | 0, 80, rgba8(255, 30, 30, 30), false);
  }

  // HUD
  rect(0, 0, 640, 24, rgba8(0, 0, 0, 150), true);
  print(
    `BOIDS FLOCKING  |  MODE: ${MODES[mode]}  |  ${NUM_BOIDS} AGENTS`,
    10,
    8,
    rgba8(180, 220, 255)
  );

  const controlText = autoSwitch
    ? 'AUTO-SWITCHING (SPACE to pause)  |  LEFT/RIGHT to manual'
    : 'MANUAL  |  LEFT/RIGHT switch  |  SPACE to auto';
  print(controlText, 10, 348, rgba8(120, 120, 150, 200));
}
