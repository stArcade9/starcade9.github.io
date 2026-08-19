// tween-logo — staggered logo reveal sequence using tween.js
// Shows: createTween (nova-style on stage nodes), easeInOutBack stagger,
//        easeOutElastic, chain tweens with onComplete, screen flash

const { cls, line, print, printCentered, pset, rectfill, screenHeight, screenWidth } = nova64.draw;
const { Screen, addChild, createContainer, createGraphicsNode, drawStage, grid } = nova64.ui;
const { createTween, updateTweens } = nova64.tween;

let W = 640,
  H = 360;

const LETTERS = ['N', 'O', 'V', 'A', '6', '4'];
const LETTER_COLORS = [0xff4466, 0xff8844, 0xffcc44, 0x44ff88, 0x44aaff, 0xaa44ff];

let nodes = [];
let flashAlpha = 0;
let root;
let time = 0;
let phase = 0; // 0=in, 1=idle, 2=out
let phaseTimer = 0;

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
  root = createContainer();

  const totalW = LETTERS.length * 44;
  const startX = (W - totalW) / 2 + 20;

  LETTERS.forEach((ch, i) => {
    const node = createGraphicsNode((ctx, n) => {
      ctx.save();
      ctx.globalAlpha = n.alpha;
      ctx.translate(n.x, n.y);
      ctx.scale(n.scaleX, n.scaleY);

      // Glow
      ctx.shadowColor = `#${LETTER_COLORS[i].toString(16).padStart(6, '0')}`;
      ctx.shadowBlur = 18;
      ctx.font = 'bold 38px monospace';
      ctx.fillStyle = `#${LETTER_COLORS[i].toString(16).padStart(6, '0')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, 0, 0);

      // Outline
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeText(ch, 0, 0);
      ctx.restore();
    });

    node.x = startX + i * 44;
    node.y = H / 2 - 20;
    node.alpha = 0;
    node.scaleX = 0.1;
    node.scaleY = 0.1;

    addChild(root, node);
    nodes.push(node);
  });

  // Stagger launch: each letter drops in with easeOutElastic
  nodes.forEach((node, i) => {
    setTimeout(
      () => {
        createTween(node, { alpha: 1, scaleX: 1, scaleY: 1 }, 0.65, {
          ease: 'easeOutElastic',
        });
        if (i === nodes.length - 1) {
          // Flash on last letter
          setTimeout(() => {
            flashAlpha = 1.0;
          }, 650);
        }
      },
      i * 100 + 200
    );
  });
}

export function update(dt) {
  time += dt;
  phaseTimer += dt;
  updateTweens(dt);

  // Decay screen flash
  flashAlpha = Math.max(0, flashAlpha - dt * 3.5);

  // Auto restart sequence every 4 seconds
  if (phaseTimer > 4) {
    phaseTimer = 0;
    // Fly all letters off-screen then reset
    nodes.forEach((node, i) => {
      setTimeout(() => {
        createTween(node, { y: -60, alpha: 0 }, 0.45, { ease: 'easeInBack' });
      }, i * 60);
    });
    setTimeout(
      () => {
        nodes.forEach((node, i) => {
          const totalW = nodes.length * 44;
          const startX = (W - totalW) / 2 + 20;
          node.x = startX + i * 44;
          node.y = H / 2 + 80;
          node.alpha = 0;
          node.scaleX = 0.1;
          node.scaleY = 0.1;
          setTimeout(() => {
            createTween(node, { alpha: 1, y: H / 2 - 20, scaleX: 1, scaleY: 1 }, 0.6, {
              ease: 'easeOutElastic',
            });
          }, i * 100);
        });
      },
      nodes.length * 60 + 500
    );
  }
}

export function draw() {
  cls(0x08080f);

  // Starfield
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137 + 7) % W;
    const sy = (i * 91 + 3) % H;
    const b = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.8 + i * 0.7));
    const c = Math.floor(b * 200);
    pset(sx, sy, (c << 16) | (c << 8) | c);
  }

  // Subtle grid lines
  for (let x = 0; x < W; x += 32) line(x, 0, x, H, 0x111122);
  for (let y = 0; y < H; y += 32) line(0, y, W, y, 0x111122);

  drawStage(root);

  // Screen flash
  if (flashAlpha > 0) {
    const a = Math.floor(flashAlpha * 255);
    rectfill(0, 0, W, H, (a << 24) | 0xffffff);
  }

  // Tagline — fades in after reveal
  const tAlpha = nodes[nodes.length - 1]?.alpha ?? 0;
  if (tAlpha > 0.5) {
    const ta = Math.floor((tAlpha - 0.5) * 2 * 200);
    const col = (ta << 16) | (ta << 8) | ta;
    printCentered('ULTIMATE  3D  FANTASY  CONSOLE', H / 2 + 20, col);
  }

  print('TWEEN LOGO', 4, 4, 0xffffff);
  print('Nova-style createTween • easeOutElastic • stagger', 4, H - 12, 0x778899);
}
