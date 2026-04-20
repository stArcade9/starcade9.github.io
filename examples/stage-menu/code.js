// stage-menu — Animated main menu with Stage display list + tweenTo slide-ins
// Shows: createContainer, createTextNode, createGraphicsNode, tweenTo,
//        easeOutBack stagger, addChild, hitTest, blendMode

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
  return createGraphicsNode((ctx, n) => {
    ctx.save();
    ctx.globalAlpha = n.alpha;
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(n.x, n.y, w * (n.scaleX || 1), h);
    ctx.restore();
  });
}

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
  root = createContainer();
  bgRoot = createContainer();
  addChild(root, bgRoot);

  // Decorative background stripes
  const stripeColors = [0x1a2a4a, 0x16223c, 0x1e2f52, 0x131d34];
  for (let i = 0; i < H; i += 20) {
    const s = _makeBgStripe(0, i, W, 20, stripeColors[i % 4]);
    s.x = 0;
    s.y = i;
    addChild(bgRoot, s);
  }

  // Title node — slide in from top
  titleNode = createTextNode('NOVA 64', {
    font: 'bold 48px monospace',
    fill: '#ffcc44',
    align: 'center',
    stroke: '#cc8800',
    strokeWidth: 3,
  });
  titleNode.x = W / 2;
  titleNode.y = -60; // start above screen
  addChild(root, titleNode);

  // Animate title in
  titleNode.tweenTo({ y: 60 }, 0.7, { ease: 'easeOutBack' }).play();

  // Menu items — stagger slide-in from left
  menuItems = [];
  for (let i = 0; i < ITEMS.length; i++) {
    const node = createTextNode(ITEMS[i], {
      font: 'bold 24px monospace',
      fill: `#${COLORS_DEF[i].toString(16).padStart(6, '0')}`,
      align: 'left',
    });
    node.x = -W; // start off-left
    node.y = 140 + i * 50;
    node._idx = i;
    addChild(root, node);

    setTimeout(
      () => {
        node.tweenTo({ x: 100 }, 0.55, { ease: 'easeOutBack' }).play();
      },
      300 + i * 90
    );

    menuItems.push(node);
  }

  // Cursor node (animated bar)
  const cursor = createGraphicsNode((ctx, n) => {
    ctx.save();
    ctx.globalAlpha = n.alpha * 0.35;
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(n.x, n.y, W - 80, 40);
    ctx.restore();
  });
  cursor.x = 90;
  cursor.y = 140 + selected * 50 - 8;
  cursor._isCursor = true;
  addChild(root, cursor);

  root._cursor = cursor;
}

export function update(dt) {
  time += dt;
  navCooldown -= dt;
  updateTweens(dt);

  // Navigate
  const up = keyp('ArrowUp') || keyp('KeyW');
  const down = keyp('ArrowDown') || keyp('KeyS');

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
  cls(0x0d1a2e);

  // Scrolling background gradient dots
  for (let i = 0; i < 20; i++) {
    const dx = ((i * 127 + time * 18) % W) | 0;
    const dy = ((i * 83 + time * 9) % H) | 0;
    pset(dx, dy, 0x334455);
  }

  drawStage(root);

  // Subtitle tagline
  const alpha = 0.5 + 0.5 * Math.sin(time * 2.4);
  const bright = Math.floor(alpha * 120 + 60);
  print('ULTIMATE 3D FANTASY CONSOLE', W / 2 - 82, 95, (bright << 16) | (bright << 8) | 0xff);

  // Bottom bar
  rectfill(0, H - 16, W, 16, 0x000000cc);
  print('[↑↓] Navigate   [Enter] Select', 4, H - 11, 0x556677);
}
