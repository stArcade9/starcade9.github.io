// stage-cards — playing card flip animation using Stage display list
// Shows: createContainer, createGraphicsNode, tweenTo, easeInOutBack, BM.ADD

const { BM, cls, line, print, screenHeight, screenWidth } = nova64.draw;
const { addChild, createContainer, createGraphicsNode, drawStage } = nova64.ui;
const { updateTweens } = nova64.tween;

let W = 640,
  H = 360;
const CARD_W = 44,
  CARD_H = 64;
const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = [0xffffff, 0xff4444, 0xff4444, 0xffffff];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let root,
  cards,
  time = 0;

function _makeCard(value, suit, suitColor, cx, cy) {
  // Each card: a graphics node that draws itself based on node.flip (0=face-down, 1=face-up)
  const node = createGraphicsNode((ctx, n) => {
    const hw = (CARD_W * Math.abs(n.flip || 0)) / 2;
    if (hw < 1) return;

    ctx.save();
    ctx.translate(n.x, n.y);

    // Card shadow
    ctx.shadowColor = '#0004';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Card face or back depending on flip direction
    const faceUp = (n.flip || 0) >= 0;
    const w = CARD_W * Math.abs(n.flip || 0);
    const h = CARD_H;

    ctx.fillStyle = faceUp ? '#fffef0' : '#1a3a7a';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    if (faceUp) {
      // Value + suit
      ctx.font = `bold ${Math.floor(10 * Math.abs(n.flip))}px monospace`;
      ctx.fillStyle = `#${suitColor.toString(16).padStart(6, '0')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value + suit, 0, 0);
    } else {
      // Back pattern
      ctx.strokeStyle = '#fff3';
      ctx.lineWidth = 1;
      for (let r = -3; r <= 3; r++) {
        for (let c = -2; c <= 2; c++) {
          ctx.strokeRect(c * 8 - 3, r * 8 - 3, 6, 6);
        }
      }
    }
    ctx.restore();
  });
  node.x = cx;
  node.y = cy;
  node.flip = -1; // start face-down
  return node;
}

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
  root = createContainer();
  cards = [];

  const cols = 8,
    rows = 2;
  const startX = W / 2 - ((cols - 1) * (CARD_W + 8)) / 2;
  const startY = H / 2 - ((rows - 1) * (CARD_H + 12)) / 2 - 10;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const val = VALUES[idx % VALUES.length];
      const suit = SUITS[idx % 4];
      const sCol = SUIT_COLORS[idx % 4];
      const x = startX + c * (CARD_W + 8);
      const y = startY + r * (CARD_H + 12);
      const node = _makeCard(val, suit, sCol, x, y);
      addChild(root, node);
      cards.push({ node, delay: idx * 0.08 });
    }
  }

  // Stagger-flip all cards face-up
  for (const { node, delay } of cards) {
    setTimeout(
      () => {
        node.tweenTo({ flip: 1 }, 0.6, { ease: 'inOutBack' }).play();
      },
      delay * 1000 + 400
    );
  }
}

export function update(dt) {
  time += dt;
  updateTweens(dt);
}

export function draw() {
  cls(0x2c5f2e);

  // Felt pattern
  for (let y = 0; y < H; y += 20) {
    line(0, y, W, y, 0x274e28);
  }

  drawStage(root);

  print('STAGE CARDS', 4, 4, 0xffffff);
  print('Stage nodes • tweenTo • easeInOutBack', 4, H - 12, 0x88aa88);
}
