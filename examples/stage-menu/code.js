// stage-menu — Animated main menu with Stage display list + tweenTo slide-ins
// Shows: createContainer, createTextNode, createGraphicsNode, tweenTo,
//        easeOutBack stagger, addChild, hitTest, blendMode

const { cls, print, pset, rectfill, screenHeight, screenWidth } = nova64.draw;
const { keyp } = nova64.input;
const { addChild, createContainer, createGraphicsNode, createTextNode, drawStage, hitTest } =
  nova64.ui;
const { updateTweens } = nova64.tween;
const { color } = nova64.util;

let W = 640,
  H = 360;
const ITEMS = ['▶  START GAME', '⚙  OPTIONS', '🏆  LEADERBOARD', 'ℹ  ABOUT'];
const COLORS_DEF = [0xffffff, 0xaaddff, 0xaaddff, 0xaaddff];
const COLORS_HOV = [0xffcc44, 0x44ffaa, 0xff88cc, 0x88aaff];

let root, titleNode, menuItems;
let selected = 0;
let time = 0;
let bgRoot;
let navCooldown = 0;

function _makeBgStripe(x, y, w, h, color) {
  return nova64.ui.createGraphicsNode((ctx, n) => {
    ctx.save();
    ctx.globalAlpha = n.alpha;
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(n.x, n.y, w * (n.scaleX || 1), h);
    ctx.restore();
  });
}

export function init() {
  W = typeof screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
  H = typeof screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
  root = nova64.ui.createContainer();
  bgRoot = nova64.ui.createContainer();
  nova64.ui.addChild(root, bgRoot);

  // Decorative background stripes
  const stripeColors = [0x1a2a4a, 0x16223c, 0x1e2f52, 0x131d34];
  for (let i = 0; i < H; i += 20) {
    const s = _makeBgStripe(0, i, W, 20, stripeColors[i % 4]);
    s.x = 0;
    s.y = i;
    nova64.ui.addChild(bgRoot, s);
  }

  // Title node — slide in from top
  titleNode = nova64.ui.createTextNode('NOVA 64', {
    font: 'bold 48px monospace',
    fill: '#ffcc44',
    align: 'center',
    stroke: '#cc8800',
    strokeWidth: 3,
  });
  titleNode.x = W / 2;
  titleNode.y = -60; // start above screen
  nova64.ui.addChild(root, titleNode);

  // Animate title in
  titleNode.tweenTo({ y: 60 }, 0.7, { ease: 'easeOutBack' }).play();

  // Menu items — stagger slide-in from left
  menuItems = [];
  for (let i = 0; i < ITEMS.length; i++) {
    const node = nova64.ui.createTextNode(ITEMS[i], {
      font: 'bold 24px monospace',
      fill: `#${COLORS_DEF[i].toString(16).padStart(6, '0')}`,
      align: 'left',
    });
    node.x = -W; // start off-left
    node.y = 140 + i * 50;
    node._idx = i;
    nova64.ui.addChild(root, node);

    setTimeout(
      () => {
        node.tweenTo({ x: 100 }, 0.55, { ease: 'easeOutBack' }).play();
      },
      300 + i * 90
    );

    menuItems.push(node);
  }

  // Cursor node (animated bar)
  const cursor = nova64.ui.createGraphicsNode((ctx, n) => {
    ctx.save();
    ctx.globalAlpha = n.alpha * 0.35;
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(n.x, n.y, W - 80, 40);
    ctx.restore();
  });
  cursor.x = 90;
  cursor.y = 140 + selected * 50 - 8;
  cursor._isCursor = true;
  nova64.ui.addChild(root, cursor);

  root._cursor = cursor;
}

export function update(dt) {
  time += dt;
  navCooldown -= dt;
  nova64.tween.updateTweens(dt);

  // Navigate
  const up = nova64.input.keyp('ArrowUp') || nova64.input.keyp('KeyW');
  const down = nova64.input.keyp('ArrowDown') || nova64.input.keyp('KeyS');

  if ((up || down) && navCooldown <= 0) {
    navCooldown = 0.15;
    const prev = selected;
    if (up) selected = (selected - 1 + ITEMS.length) % ITEMS.length;
    if (down) selected = (selected + 1) % ITEMS.length;

    // Tween cursor to new position
    root._cursor.tweenTo({ y: 140 + selected * 50 - 8 }, 0.22, { ease: 'easeOutCubic' }).play();
  }

  // Update item text color
  for (let i = 0; i < menuItems.length; i++) {
    const col = i === selected ? COLORS_HOV[i] : COLORS_DEF[i];
    const fill = `#${col.toString(16).padStart(6, '0')}`;
    if (menuItems[i].fill !== fill) menuItems[i].fill = fill;
  }
}

export function draw() {
  nova64.draw.cls(0x0d1a2e);

  // Scrolling background gradient dots
  for (let i = 0; i < 20; i++) {
    const dx = ((i * 127 + time * 18) % W) | 0;
    const dy = ((i * 83 + time * 9) % H) | 0;
    nova64.draw.pset(dx, dy, 0x334455);
  }

  nova64.ui.drawStage(root);

  // Subtitle tagline
  const alpha = 0.5 + 0.5 * Math.sin(time * 2.4);
  const bright = Math.floor(alpha * 120 + 60);
  nova64.draw.print(
    'ULTIMATE 3D FANTASY CONSOLE',
    W / 2 - 82,
    95,
    (bright << 16) | (bright << 8) | 0xff
  );

  // Bottom bar
  nova64.draw.rectfill(0, H - 16, W, 16, 0x000000cc);
  nova64.draw.print('[↑↓] Navigate   [Enter] Select', 4, H - 11, 0x556677);
}
