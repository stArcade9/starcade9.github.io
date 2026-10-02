// tween-typewriter — Text reveal typewriter effect with cursor blink
// Shows: hype-style createTween (scalar), easeLinear, onUpdate callback,
//        createContainer, createTextNode, tweenTo, cursor animation

const { cls, line, print, printCentered, rect, rectfill, screenHeight, screenWidth } = nova64.draw;
const { Screen, addChild, createContainer, createTextNode, drawStage } = nova64.ui;
const { createTween } = nova64.tween;
const { t } = nova64.data;

let W = 640,
  H = 360;

const LINES = [
  { text: 'NOVA64 CONSOLE ONLINE', color: 0x44ff88, delay: 0.2 },
  { text: '> LOADING KERNEL v3.14...', color: 0xaaddff, delay: 0.5 },
  { text: '> INITIALIZING GPU BACKEND', color: 0xaaddff, delay: 1.2 },
  { text: '> MOUNTING CART FILESYSTEM', color: 0xaaddff, delay: 1.9 },
  { text: '', color: 0, delay: 2.4 },
  { text: 'ALL SYSTEMS NOMINAL.', color: 0xffcc44, delay: 2.8 },
  { text: 'INSERT CARTRIDGE OR', color: 0xffffff, delay: 3.4 },
  { text: 'PRESS START', color: 0xff4466, delay: 4.0 },
];
const CHAR_SPEED = 22; // chars/sec

let root;
let lineNodes = [];
let lineTweens = [];
let displayTexts = [];
let time = 0;
let cursorBlink = 0;
let showCursor = true;

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
  root = createContainer();
  displayTexts = LINES.map(() => '');

  LINES.forEach((line, i) => {
    // Text node starts empty
    const tn = createTextNode('', {
      font: '10px monospace',
      fill: `#${line.color.toString(16).padStart(6, '0')}`,
      align: 'left',
    });
    tn.x = 14;
    tn.y = 28 + i * 16;
    tn.alpha = 0;
    addChild(root, tn);
    lineNodes.push(tn);
  });

  // Schedule each line's typewriter tween
  LINES.forEach((line, i) => {
    if (!line.text) {
      lineNodes[i].alpha = 1; // blank line, instantly visible (empty)
      return;
    }
    const chars = line.text.length;
    const dur = chars / CHAR_SPEED;

    // After delay, reveal text progressively
    setTimeout(() => {
      lineNodes[i].alpha = 1;
      const tw = createTween({
        from: 0,
        to: chars,
        duration: dur,
        ease: 'linear',
        loop: 'none',
        onUpdate(v) {
          lineNodes[i].text = line.text.slice(0, Math.ceil(v));
        },
        onComplete() {
          lineNodes[i].text = line.text;
        },
      });
      tw.play();
      lineTweens.push(tw);
    }, line.delay * 1000);
  });
}

export function update(dt) {
  time += dt;

  // Advance hype-style tweens manually
  for (const tw of lineTweens) {
    if (!tw.done) tw.tick(dt);
  }

  // Cursor blink
  cursorBlink += dt;
  if (cursorBlink > 0.5) {
    cursorBlink = 0;
    showCursor = !showCursor;
  }
}

export function draw() {
  cls(0x030608);

  // Scanlines
  for (let y = 0; y < H; y += 2) {
    rectfill(0, y, W, 1, 0x00000033);
  }

  // Screen border
  rect(2, 2, W - 4, H - 4, 0x224422);
  rect(4, 4, W - 8, H - 8, 0x112211);

  // Header bar
  rectfill(6, 6, W - 12, 14, 0x112211);
  print('▒▒▒ NOVA64 BOOT TERMINAL ▒▒▒', 8, 9, 0x44aa44);

  drawStage(root);

  // Blinking cursor on last active line
  let lastActive = -1;
  for (let i = 0; i < LINES.length; i++) {
    if (lineNodes[i].alpha > 0 && LINES[i].text) lastActive = i;
  }
  if (showCursor && lastActive >= 0) {
    const ln = lineNodes[lastActive];
    const txt = ln.text ?? '';
    const cx = ln.x + txt.length * 6.02; // monospace ~6px per char at 10px
    const cy = ln.y - 1;
    rectfill(cx, cy, 6, 10, 0x44ff88);
  }

  // Bottom prompt
  const allDone =
    lineTweens.length >= LINES.filter(l => l.text).length && lineTweens.every(t => t.done);
  if (allDone) {
    const b = 0.5 + 0.5 * Math.sin(time * 4);
    const c = Math.floor(b * 255);
    printCentered('[ PRESS START OR INSERT CART ]', H - 14, (c << 8) | 0);
  }

  print('TWEEN TYPEWRITER', 4, H - 12, 0x224422);
}
