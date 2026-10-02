// tween-bounce — bouncing balls demo using the unified Tween engine
// Shows: createTween (hype-style value tween), Ease.outBounce, Stage

const { cls, print, rectfill, screenHeight, screenWidth } = nova64.draw;
const { engine } = nova64.scene;
const { Ease, createTween } = nova64.tween;
const BALLS = [];
let W = 640,
  H = 360;
const COLORS = [0xff4466, 0x44aaff, 0xffcc00, 0x44ff88, 0xff8844, 0xaa44ff];
const BALL_COUNT = 6;

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
  for (let i = 0; i < BALL_COUNT; i++) {
    const x = 30 + (i / (BALL_COUNT - 1)) * (W - 60);
    const radius = 12 + Math.random() * 8;
    const dur = 0.6 + Math.random() * 0.5;
    const delay = i * 0.12;
    const color = COLORS[i % COLORS.length];

    // Hype-style scalar tween — produces a y-value we drive manually
    const tw = createTween({
      from: -radius,
      to: H - radius * 2 - 10,
      duration: dur,
      ease: 'easeOutBounce',
      loop: 'pingpong',
    });
    // Stagger entry: pause, then play after delay
    tw.pause();
    setTimeout(() => tw.play(), delay * 1000);

    BALLS.push({ x, radius, color, tw });
  }
}

export function update(dt) {
  for (const b of BALLS) b.tw.tick(dt);
}

export function draw() {
  cls(0x0a0a1a);

  // Ground
  rectfill(0, H - 10, W, 10, 0x223344);

  // Balls
  for (const b of BALLS) {
    const y = b.tw.value ?? -b.radius;

    // Shadow — scale with height
    const shadowScale = 0.3 + 0.7 * (y / (H - b.radius * 2 - 10));
    const sw = b.radius * 2 * shadowScale;
    ellipsefill(b.x, H - 8, sw, 6, 0x00000088);

    // Ball body
    ellipsefill(b.x, y + b.radius, b.radius * 2, b.radius * 2, b.color);

    // Specular highlight
    ellipsefill(
      b.x - b.radius * 0.3,
      y + b.radius * 0.4,
      b.radius * 0.55,
      b.radius * 0.4,
      0xffffff55
    );
  }

  print('TWEEN BOUNCE', 4, 4, 0xffffff);
  print('6 balls • easeOutBounce • pingpong', 4, 12, 0x778899);
}
