// examples/flash-demo/code.js
// ┌─────────────────────────────────────────────────────────────────────────────
// │  NOVA64 FLASH DEMO — 10 classic-era 2D style scenes using the Stage API
// │  SPACE / ENTER / → = next scene      ← = previous scene
// └─────────────────────────────────────────────────────────────────────────────

// Dimensions are resolved at runtime from the actual framebuffer size so the
// demo fills the screen regardless of launch resolution.
let W, H, CX, CY;

// ─── Scene manager state ──────────────────────────────────────────────────────
let _si = 0; // active scene index
let _st = { t: 0 }; // active scene state
let _gT = 0; // global time accumulator
let _fade = 0; // 0..255 black cover intensity
let _fadeDir = 0; // 1 = fading out, -1 = fading in, 0 = stable
let _pending = -1; // next scene index (during fade-out)
let _navCD = 0; // nav key cooldown

// Pending setTimeout IDs — cancelled in _cleanupScene so stale callbacks
// (e.g. node.tweenTo from previous scene) can't fire after a scene change.
const _timeouts = [];
function _trackTimeout(id) {
  _timeouts.push(id);
  return id;
}

function _startFade(next) {
  if (_pending >= 0) return;
  _pending = next;
  _fadeDir = 1;
}

function _cleanupScene() {
  // 1. Kill every active nova-style tween to prevent leaks into the new scene.
  if (typeof killAllTweens === 'function') killAllTweens();

  // 2. Cancel any stale setTimeout callbacks from the exiting scene.
  while (_timeouts.length) clearTimeout(_timeouts.pop());

  // 3. Clear particle emitters.  s.emitters must hold raw emitter objects.
  //    Gracefully unwrap {em,life} wrappers in case the format differs.
  if (_st.emitters) {
    for (const e of _st.emitters) {
      const em = e && e.em ? e.em : e;
      try {
        clearEmitter2D(em);
      } catch (_) {}
    }
  }
}

function _launchScene(idx) {
  _cleanupScene();
  _si = idx;
  _st = { t: 0 };
  _pending = -1;
  _fadeDir = -1;
  SCENES[idx].init(_st);
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export function init() {
  // Resolve actual framebuffer dimensions at cart boot time.
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
  CX = W >> 1;
  CY = H >> 1;
  _si = 0;
  _st = { t: 0 };
  SCENES[0].init(_st);
}

export function update(dt) {
  _gT += dt;
  _st.t += dt;
  _navCD = Math.max(0, _navCD - dt);

  if (_navCD <= 0 && _fadeDir === 0) {
    if (keyp('Space') || keyp('Enter') || keyp('ArrowRight')) {
      _startFade((_si + 1) % SCENES.length);
      _navCD = 0.35;
    }
    if (keyp('ArrowLeft')) {
      _startFade((_si - 1 + SCENES.length) % SCENES.length);
      _navCD = 0.35;
    }
  }

  if (_fadeDir === 1) {
    _fade += dt * 700;
    if (_fade >= 255) {
      _fade = 255;
      _launchScene(_pending);
    }
  } else if (_fadeDir === -1) {
    _fade -= dt * 480;
    if (_fade <= 0) {
      _fade = 0;
      _fadeDir = 0;
    }
  }

  SCENES[_si].update(_st, dt);
  updateTweens(dt);
}

export function draw() {
  SCENES[_si].draw(_st);

  // Bottom HUD strip
  rectfill(0, H - 14, W, 14, rgba8(0, 0, 0, 200));
  print(`${_si + 1}/${SCENES.length}  ${SCENES[_si].name}`, 4, H - 11, 0x667788);
  print('◄ SPACE ►', W - 54, H - 11, 0x445566);

  // Fade cover
  if (_fade > 0) {
    rectfill(0, 0, W, H, rgba8(0, 0, 0, Math.min(255, _fade) | 0));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// S1 — TWEEN BOUNCE
// Hype-style createTween with easeOutBounce + pingpong loop
// ══════════════════════════════════════════════════════════════════════════════
const _S1C = [0xff4466, 0xff8844, 0xffcc44, 0x44ff88, 0x44aaff, 0xaa44ff];

function s1_init(s) {
  s.balls = _S1C.map((color, i) => {
    const r = 11 + (i % 3) * 3;
    const tw = createTween({
      from: -r * 2,
      to: H - r * 2 - 12,
      duration: 0.52 + i * 0.07,
      ease: 'easeOutBounce',
      loop: 'pingpong',
    });
    tw.pause();
    _trackTimeout(setTimeout(() => tw.play(), i * 115));
    return { x: 28 + (i / 5) * (W - 56), r, color, tw };
  });
}

function s1_update(s, dt) {
  for (const b of s.balls) b.tw.tick(dt);
}

function s1_draw(s) {
  cls(0x0a0a1a);
  rectfill(0, H - 12, W, 12, 0x1e2f40);
  line(0, H - 12, W, H - 12, 0x3a5060);

  for (const b of s.balls) {
    const y = b.tw.value ?? -b.r * 2;
    const cy = (y + b.r) | 0;
    const yNorm = Math.max(0, Math.min(1, (y + b.r * 2) / (H - 12)));

    // Shadow on ground
    const sw = Math.max(2, (b.r * 2 * (0.2 + 0.8 * yNorm)) | 0);
    circle(b.x | 0, H - 7, sw >> 1, rgba8(0, 10, 20, 160), true);

    // Ball body
    circle(b.x | 0, cy, b.r, b.color, true);

    // Specular highlight
    const sr = Math.max(1, (b.r / 3) | 0);
    circle((b.x - b.r * 0.35) | 0, (cy - b.r * 0.32) | 0, sr, rgba8(255, 255, 255, 200), true);
  }

  print('TWEEN BOUNCE', 4, 4, 0x888888);
  print('hype-style createTween  easeOutBounce  pingpong', 4, 12, 0x445566);
}

// ══════════════════════════════════════════════════════════════════════════════
// S2 — PARTICLE FIREWORKS
// createEmitter2D + burstEmitter2D with BM.ADD ('lighter') blend
// ══════════════════════════════════════════════════════════════════════════════
const _S2C = [0xff4466, 0xffcc44, 0x44aaff, 0x44ff88, 0xaa44ff, 0xff8844];

function s2_init(s) {
  // s.emitters = raw emitter objects — what _cleanupScene iterates.
  // s._fw      = {em, life} lifecycle wrappers — used only in s2_update.
  s.emitters = [];
  s._fw = [];
  s.timer = 0;
  s.interval = 0.5;
  s.launched = 0;
  _s2_launch(s);
}

function _s2_launch(s) {
  const x = 30 + Math.random() * (W - 60);
  const y = 18 + Math.random() * (H * 0.52);
  const tint = _S2C[s.launched % _S2C.length];
  s.launched++;
  const em = createEmitter2D({
    x,
    y,
    tint,
    blendMode: 'lighter',
    maxParticles: 90,
    emitRate: 0,
    speed: [12, 80],
    angle: [-Math.PI, Math.PI],
    life: [0.5, 1.4],
    scale: [0.5, 2.5],
    fadeOut: true,
    scaleDown: true,
    gravity: 32,
  });
  burstEmitter2D(em, 75);
  s.emitters.push(em); // raw — for _cleanupScene
  s._fw.push({ em, life: 2.8 }); // wrapper — for lifetime tracking
}

function s2_update(s, dt) {
  s.timer += dt;
  if (s.timer >= s.interval) {
    s.timer = 0;
    s.interval = 0.6 + Math.random() * 1.4;
    _s2_launch(s);
  }
  s._fw = s._fw.filter(e => {
    e.life -= dt;
    updateEmitter2D(e.em, dt);
    return e.life > 0;
  });
  // Keep raw list in sync so GC can collect expired emitters
  s.emitters = s._fw.map(e => e.em);
}

function s2_draw(s) {
  cls(0x050510);
  // Stars
  for (let i = 0; i < 55; i++) {
    const sx = (i * 137 + 5) % W;
    const sy = (i * 91 + 7) % (H - 32);
    pset(sx, sy, Math.sin(_gT * 2 + i) > 0.55 ? 0xffffff : 0x223344);
  }
  // City silhouette
  for (let bx = 0; bx < W; bx += 18) {
    const bh = 15 + ((bx * 13) % 28);
    rectfill(bx, H - 30 - bh, 14, bh, 0x0c0c1c);
  }
  rectfill(0, H - 30, W, 30, 0x090916);
  for (const fw of s._fw) drawEmitter2D(fw.em);
  print('FIREWORKS', 4, 4, 0x888888);
  print('createEmitter2D  burstEmitter2D  BM.ADD', 4, 12, 0x445566);
}

// ══════════════════════════════════════════════════════════════════════════════
// S3 — AURORA SKY
// withBlend('screen') for aurora bands over a night sky on the stage canvas
// ══════════════════════════════════════════════════════════════════════════════
const _S3B = [
  { h: 160, phase: 0.0, freq: 0.7, y: 0.22, w: 0.4, spd: 0.12 },
  { h: 200, phase: 1.4, freq: 0.9, y: 0.3, w: 0.32, spd: 0.09 },
  { h: 270, phase: 2.8, freq: 0.55, y: 0.18, w: 0.28, spd: 0.15 },
  { h: 120, phase: 0.9, freq: 1.1, y: 0.34, w: 0.22, spd: 0.18 },
  { h: 320, phase: 3.5, freq: 0.65, y: 0.15, w: 0.36, spd: 0.07 },
];

function s3_init(s) {}
function s3_update(s, dt) {}

function s3_draw(s) {
  const t = s.t;
  cls(0x020710);

  // Sky + stars on stage canvas
  withBlend('source-over', ctx => {
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#020710');
    grd.addColorStop(1, '#0a1428');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const sx = (i * 137 + 3) % W;
      const sy = (i * 83 + 7) % Math.floor(H * 0.64);
      ctx.fillStyle = Math.sin(t * 1.8 + i * 0.7) > 0.4 ? '#fff' : '#334455';
      ctx.fillRect(sx, sy, 1, 1);
    }
  });

  // Aurora bands — each screen-blended over the previous stage canvas content
  for (const b of _S3B) {
    withBlend('screen', ctx => {
      const yMid = (b.y + Math.sin(t * b.spd + b.phase) * 0.08) * H;
      const bH = b.w * H;
      const a = 0.4 + 0.35 * Math.sin(t * 0.22 + b.phase);
      const grd = ctx.createLinearGradient(0, yMid - bH / 2, 0, yMid + bH / 2);
      grd.addColorStop(0, `hsla(${b.h},90%,60%,0)`);
      grd.addColorStop(0.5, `hsla(${b.h},90%,65%,${a.toFixed(3)})`);
      grd.addColorStop(1, `hsla(${b.h},90%,60%,0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, yMid - bH / 2, W, bH);
    });
  }

  // Terrain silhouette on stage canvas
  withBlend('source-over', ctx => {
    const ty = H * 0.64;
    ctx.fillStyle = '#050510';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x++) {
      ctx.lineTo(x, ty + 10 + 8 * Math.sin(x * 0.07) + 4 * Math.sin(x * 0.19 + 2));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  });

  print('AURORA', 4, 4, 0xffffff);
  print('withBlend(screen)  animated gradient bands', 4, 12, 0x334455);
}

// ══════════════════════════════════════════════════════════════════════════════
// S4 — CRT TYPEWRITER TERMINAL
// Hype-style tween onUpdate reveals chars, drawScanlines overlay
// ══════════════════════════════════════════════════════════════════════════════
const _S4L = [
  { text: 'NOVA64 KERNEL v3.14 ONLINE', col: 0x44ff88 },
  { text: '> LOADING GPU BACKEND.......', col: 0xaaddff },
  { text: '> MOUNTING CART FILESYSTEM.', col: 0xaaddff },
  { text: '> CALIBRATING PIXEL CLOCK...', col: 0xaaddff },
  { text: '', col: 0 },
  { text: 'ALL SYSTEMS NOMINAL.', col: 0xffcc44 },
  { text: 'INSERT CART OR PRESS SPACE →', col: 0xffffff },
];

function s4_init(s) {
  s.shown = _S4L.map(() => '');
  s.tweens = [];
  s.blink = 0;
  s.cursor = true;
  _S4L.forEach((ln, i) => {
    if (!ln.text) return;
    const tw = createTween({
      from: 0,
      to: ln.text.length,
      duration: ln.text.length / 20,
      ease: 'linear',
      loop: 'none',
      onUpdate: v => {
        s.shown[i] = ln.text.slice(0, Math.ceil(v));
      },
      onComplete: () => {
        s.shown[i] = ln.text;
      },
    });
    tw.pause();
    _trackTimeout(setTimeout(() => tw.play(), 350 + i * 520));
    s.tweens.push(tw);
  });
}

function s4_update(s, dt) {
  for (const tw of s.tweens) if (!tw.done) tw.tick(dt);
  s.blink += dt;
  if (s.blink > 0.5) {
    s.blink = 0;
    s.cursor = !s.cursor;
  }
}

function s4_draw(s) {
  cls(0x030608);
  drawScanlines(55, 2);
  rect(3, 3, W - 6, H - 6, 0x1a4a1a);
  rectfill(6, 6, W - 12, 13, 0x0d2a0d);
  print('▒▒ NOVA64 TERMINAL ▒▒', 10, 9, 0x44aa44);

  for (let i = 0; i < _S4L.length; i++) {
    const ln = _S4L[i];
    if (!ln.text) continue;
    print(s.shown[i], 14, 26 + i * 15, ln.col);
  }

  // Blinking cursor
  if (s.cursor) {
    let lastI = -1;
    for (let i = _S4L.length - 1; i >= 0; i--) {
      if (_S4L[i].text && s.shown[i]) {
        lastI = i;
        break;
      }
    }
    if (lastI >= 0) {
      const cx = 14 + s.shown[lastI].length * 6;
      const cy = 26 + lastI * 15 - 1;
      rectfill(cx, cy, 5, 9, 0x44ff88);
    }
  }
  print('TYPEWRITER', 4, 4, 0x224422);
  print('hype-style createTween  onUpdate  drawScanlines', 4, 12, 0x1a3a1a);
}

// ══════════════════════════════════════════════════════════════════════════════
// S5 — LOGO REVEAL
// Stage graphicsNode per letter + tweenTo scale/alpha + easeOutElastic
// ══════════════════════════════════════════════════════════════════════════════
const _S5L = ['N', 'O', 'V', 'A', '6', '4'];
const _S5C = [0xff4466, 0xff8844, 0xffcc44, 0x44ff88, 0x44aaff, 0xaa44ff];

function s5_init(s) {
  s.root = createContainer();
  s.nodes = _S5L.map((ch, i) => {
    const col = _S5C[i];
    const node = createGraphicsNode((ctx, n) => {
      if (n.alpha <= 0.02 || n.scaleX <= 0.02) return;
      ctx.save();
      ctx.globalAlpha = n.alpha;
      ctx.translate(n.x, n.y);
      ctx.scale(n.scaleX, n.scaleY);
      ctx.shadowColor = `#${col.toString(16).padStart(6, '0')}`;
      ctx.shadowBlur = 18;
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = `#${col.toString(16).padStart(6, '0')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, 0, 0);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeText(ch, 0, 0);
      ctx.restore();
    });
    node.x = W / 2 - _S5L.length * 22 + i * 44;
    node.y = CY - 8;
    node.alpha = 0;
    node.scaleX = 0.1;
    node.scaleY = 0.1;
    addChild(s.root, node);
    _trackTimeout(
      setTimeout(
        () => {
          node.tweenTo({ alpha: 1, scaleX: 1, scaleY: 1 }, 0.65, { ease: 'easeOutElastic' });
        },
        i * 110 + 250
      )
    );
    return node;
  });
  s.tag = { alpha: 0 };
  _trackTimeout(
    setTimeout(
      () => {
        createTween(s.tag, { alpha: 1 }, 0.8, { ease: 'easeInCubic' });
      },
      _S5L.length * 110 + 700
    )
  );
}

function s5_update(s, dt) {
  /* updateTweens called globally */
}

function s5_draw(s) {
  cls(0x08080f);
  for (let i = 0; i < 60; i++) pset((i * 137 + 3) % W, (i * 91 + 7) % H, 0x14143a);
  drawStage(s.root);
  printCentered(
    'ULTIMATE 3D FANTASY CONSOLE',
    CX,
    CY + 28,
    rgba8(200, 200, 220, Math.floor(s.tag.alpha * 180))
  );
  print('LOGO REVEAL', 4, 4, 0x333355);
  print('Stage graphicsNode + tweenTo easeOutElastic  stagger', 4, 12, 0x22223a);
}

// ══════════════════════════════════════════════════════════════════════════════
// S6 — CARD FLIP
// Stage graphicsNode with tweenTo on _flip (-1→1) driving render width
// ══════════════════════════════════════════════════════════════════════════════
const _S6S = ['♠', '♥', '♦', '♣'];
const _S6SC = [0xffffff, 0xff4444, 0xff4444, 0xffffff];
const _S6V = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const _CW = 40,
  _CH = 58;

function _s6Card(val, suit, sc, cx, cy) {
  const node = createGraphicsNode((ctx, n) => {
    const flip = n._flip ?? -1;
    const aw = Math.abs(flip) * _CW;
    if (aw < 0.5) return;

    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = flip >= 0 ? '#fffef0' : '#1a3a7a';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-aw / 2, -_CH / 2, aw, _CH);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (flip >= 0 && aw > _CW * 0.35) {
      ctx.font = `bold ${Math.floor(10 * Math.abs(flip))}px monospace`;
      ctx.fillStyle = `#${sc.toString(16).padStart(6, '0')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val + suit, 0, 0);
    }
    ctx.restore();
  });
  node.x = cx;
  node.y = cy;
  node._flip = -1;
  return node;
}

function s6_init(s) {
  s.root = createContainer();
  const cols = 7,
    rows = 2;
  const sx = CX - ((cols - 1) * (_CW + 8)) / 2;
  const sy = CY - ((rows - 1) * (_CH + 12)) / 2;
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, idx++) {
      const val = _S6V[idx % _S6V.length];
      const suit = _S6S[idx % 4];
      const sc = _S6SC[idx % 4];
      const node = _s6Card(val, suit, sc, sx + c * (_CW + 8), sy + r * (_CH + 12));
      addChild(s.root, node);
      _trackTimeout(
        setTimeout(
          () => {
            node.tweenTo({ _flip: 1 }, 0.52, { ease: 'easeInOutBack' });
          },
          400 + idx * 80
        )
      );
    }
  }
}

function s6_update(s, dt) {
  /* updateTweens called globally */
}

function s6_draw(s) {
  cls(0x2a5530);
  for (let y2 = 0; y2 < H; y2 += 20) line(0, y2, W, y2, 0x264c2b);
  drawStage(s.root);
  print('CARD FLIP', 4, 4, 0x88aa88);
  print('Stage graphicsNode + tweenTo easeInOutBack', 4, 12, 0x4a7a50);
}

// ══════════════════════════════════════════════════════════════════════════════
// S7 — PARTICLE TRAIL
// createEmitter2D following mouse, spark bursts on fast movement
// ══════════════════════════════════════════════════════════════════════════════
let _s7MX = 0,
  _s7MY = 0;
const _S7TC = [0xff4466, 0x44aaff, 0xaa44ff, 0x44ff88, 0xffcc44];

function _s7BindMouse() {
  const canvas = document.querySelector('canvas');
  if (!canvas || canvas._s7) return;
  canvas._s7 = true;
  const toLocal = e => {
    const r = canvas.getBoundingClientRect();
    _s7MX = (e.clientX - r.left) * (W / canvas.clientWidth);
    _s7MY = (e.clientY - r.top) * (H / canvas.clientHeight);
  };
  canvas.addEventListener('mousemove', toLocal, { passive: true });
  canvas.addEventListener('touchmove', e => toLocal(e.touches[0]), { passive: true });
}

function s7_init(s) {
  _s7MX = CX;
  _s7MY = CY;
  _s7BindMouse();
  s.trail = createEmitter2D({
    x: CX,
    y: CY,
    tint: 0x88ccff,
    blendMode: 'lighter',
    maxParticles: 300,
    emitRate: 90,
    speed: [5, 28],
    angle: [-Math.PI, Math.PI],
    life: [0.3, 0.8],
    scale: [0.3, 1.8],
    fadeOut: true,
    scaleDown: true,
    gravity: -12,
  });
  s.spark = createEmitter2D({
    x: CX,
    y: CY,
    tint: 0xffcc44,
    blendMode: 'lighter',
    maxParticles: 80,
    emitRate: 0,
    speed: [30, 85],
    angle: [-Math.PI, Math.PI],
    life: [0.25, 0.6],
    scale: [0.3, 1.3],
    fadeOut: true,
    gravity: 40,
  });
  s.emitters = [s.trail, s.spark];
  s.sparkCD = 0;
  s.prevX = CX;
  s.prevY = CY;
  s.colorIdx = 0;
  s.colorCD = 0;
}

function s7_update(s, dt) {
  s.trail.x = _s7MX;
  s.trail.y = _s7MY;
  s.spark.x = _s7MX;
  s.spark.y = _s7MY;

  const dx = _s7MX - s.prevX,
    dy = _s7MY - s.prevY;
  const spd = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 0.001);
  s.prevX = _s7MX;
  s.prevY = _s7MY;

  // Cycle tint color over time
  s.colorCD -= dt;
  if (s.colorCD <= 0) {
    s.colorIdx = (s.colorIdx + 1) % _S7TC.length;
    s.trail.tint = _S7TC[s.colorIdx];
    s.colorCD = 0.8;
  }

  s.sparkCD -= dt;
  if (spd > 75 && s.sparkCD <= 0) {
    burstEmitter2D(s.spark, (6 + Math.random() * 10) | 0);
    s.sparkCD = 0.06;
  }

  updateEmitter2D(s.trail, dt);
  updateEmitter2D(s.spark, dt);

  // Auto-orbit when idle
  if (spd < 3) {
    _s7MX = CX + Math.cos(s.t * 1.1) * 85;
    _s7MY = CY + Math.sin(s.t * 0.9) * 52;
  }
}

function s7_draw(s) {
  cls(0x050510);
  for (let x2 = 0; x2 < W; x2 += 40) line(x2, 0, x2, H, 0x0c1222);
  for (let y2 = 0; y2 < H; y2 += 40) line(0, y2, W, y2, 0x0c1222);
  drawEmitter2D(s.trail);
  drawEmitter2D(s.spark);
  const mx = _s7MX | 0,
    my = _s7MY | 0;
  line(mx - 8, my, mx + 8, my, rgba8(255, 255, 255, 80));
  line(mx, my - 8, mx, my + 8, rgba8(255, 255, 255, 80));
  print('PARTICLE TRAIL', 4, 4, 0x888888);
  print('createEmitter2D  BM.ADD  mouse follow', 4, 12, 0x445566);
  print('Move your mouse!', CX - 48, CY + 65, 0x445566);
}

// ══════════════════════════════════════════════════════════════════════════════
// S8 — SIDE-SCROLL PLATFORMER
// WASD + arrows with manual camera offset; tile collision
// ══════════════════════════════════════════════════════════════════════════════
const _TW = 20,
  _TH = 20,
  _MC = 50,
  _MR = 12;

function _s8Map() {
  const m = Array.from({ length: _MR }, () => Array(_MC).fill(0));
  for (let x = 0; x < _MC; x++) m[_MR - 1][x] = 1; // ground
  [
    [5, 8, 6],
    [14, 6, 8],
    [26, 9, 5],
    [35, 7, 7],
    [44, 8, 5],
  ].forEach(([tx, ty, tw]) => {
    for (let x = tx; x < tx + tw; x++) m[ty][x] = 1;
  });
  for (let x = 20; x < 24; x++) m[_MR - 1][x] = 0; // gap
  return m;
}

function s8_init(s) {
  s.map = _s8Map();
  s.px = 40;
  s.py = 80;
  s.pvx = 0;
  s.pvy = 0;
  s.onGround = false;
  s.camX = 0;
}

function s8_update(s, dt) {
  const left = key('ArrowLeft') || key('KeyA');
  const right = key('ArrowRight') || key('KeyD');
  const jump = keyp('ArrowUp') || keyp('KeyW'); // NOTE: Space = next scene

  s.pvx = left ? -115 : right ? 115 : 0;
  if (jump && s.onGround) s.pvy = -255;
  s.pvy = Math.min(s.pvy + 420 * dt, 400);

  s.px += s.pvx * dt;
  s.py += s.pvy * dt;
  s.onGround = false;

  const pw = 10,
    ph = 16;
  const t0x = Math.max(0, (s.px / _TW) | 0);
  const t1x = Math.min(_MC - 1, ((s.px + pw - 1) / _TW) | 0);
  const t0y = Math.max(0, (s.py / _TH) | 0);
  const t1y = Math.min(_MR - 1, ((s.py + ph - 1) / _TH) | 0);

  for (let ty = t0y; ty <= t1y; ty++) {
    for (let tx = t0x; tx <= t1x; tx++) {
      if (!s.map[ty]?.[tx]) continue;
      const tl = tx * _TW,
        tr = tl + _TW;
      const tt = ty * _TH,
        tb = tt + _TH;
      const ol = s.px + pw - tl,
        or2 = tr - s.px;
      const ot = s.py + ph - tt,
        ob = tb - s.py;
      const mn = Math.min(ol, or2, ot, ob);
      if (mn === ot && s.pvy >= 0) {
        s.py = tt - ph;
        s.pvy = 0;
        s.onGround = true;
      } else if (mn === ob && s.pvy < 0) {
        s.py = tb;
        s.pvy = 0;
      } else if (mn === ol) s.px = tl - pw;
      else if (mn === or2) s.px = tr;
    }
  }

  s.px = Math.max(0, Math.min(_MC * _TW - pw, s.px));
  if (s.py > _MR * _TH) {
    s.py = 0;
    s.pvy = 0;
    s.px = 40;
  }

  const targetCam = s.px - CX + 10;
  const maxCam = _MC * _TW - W;
  s.camX += (Math.max(0, Math.min(maxCam, targetCam)) - s.camX) * 6 * dt;
}

function s8_draw(s) {
  cls(0x87ceeb);

  // Parallax mountains
  for (let mx = 0; mx < _MC * _TW + 40; mx += 60) {
    const px = (mx - s.camX * 0.3) | 0;
    if (px < -70 || px > W + 10) continue;
    for (let i = 0; i < 60; i++) {
      const mh = 36 + ((mx * 7) % 24);
      const fh = (mh * Math.max(0, 1 - Math.abs(i - 30) / 30)) | 0;
      if (fh > 0) rectfill(px + i, H - _MR * _TH - fh, 1, fh, 0x8aabb8);
    }
  }

  // Tilemap
  const cx = s.camX | 0;
  for (let ty = 0; ty < _MR; ty++) {
    for (let tx = 0; tx < _MC; tx++) {
      if (!s.map[ty][tx]) continue;
      const wx = tx * _TW - cx,
        wy = ty * _TH;
      if (wx < -_TW || wx > W) continue;
      rectfill(wx, wy, _TW, _TH, 0x5a8a3a);
      rectfill(wx, wy, _TW, 4, 0x78c850);
      line(wx, wy + 4, wx + _TW, wy + 4, 0x4a7a2a);
    }
  }

  // Player
  const ppx = (s.px - cx) | 0,
    ppy = s.py | 0;
  rectfill(ppx, ppy, 10, 16, 0xff8844);
  rectfill(ppx + 2, ppy + 2, 4, 4, 0xffd0a0);
  pset(ppx + 3, ppy + 4, 0x000000);

  // Goal flag
  const gx = _MC * _TW - 30 - cx;
  line(gx, _MR * _TH - _TH, gx, _MR * _TH - _TH - 28, 0xeeeeff);
  rectfill(gx + 1, _MR * _TH - _TH - 28, 14, 10, 0xff4444);

  print('PLATFORMER', 4, 4, 0x223344);
  print('arrows/WASD  W/Up=jump  (Space=next scene)', 4, 12, 0x4a6a44);
}

// ══════════════════════════════════════════════════════════════════════════════
// S9 — STAGE MENU
// createTextNode + tweenTo slide-in + animated selection cursor
// ══════════════════════════════════════════════════════════════════════════════
const _S9I = ['▶  START GAME', '⚙  OPTIONS', '🏆  SCORES', 'ℹ  ABOUT'];
const _S9CN = [0xffffff, 0xaaddff, 0xaaddff, 0xaaddff];
const _S9CH = [0xffcc44, 0x44ffaa, 0xff88cc, 0x88aaff];

function s9_init(s) {
  s.root = createContainer();
  s.sel = 0;
  s.selCD = 0;

  // Cursor highlight bar
  s.cursor = createGraphicsNode((ctx, n) => {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(n.x, n.y, W - 54, 24);
    ctx.restore();
  });
  s.cursor.x = 44;
  s.cursor.y = 70 + s.sel * 32 - 3;
  addChild(s.root, s.cursor);

  // Menu items
  s.items = _S9I.map((text, i) => {
    const node = createTextNode(text, {
      font: 'bold 13px monospace',
      fill: `#${_S9CN[i].toString(16).padStart(6, '0')}`,
      align: 'left',
    });
    node.x = -W;
    node.y = 70 + i * 32;
    addChild(s.root, node);
    _trackTimeout(
      setTimeout(
        () => {
          node.tweenTo({ x: 48 }, 0.5, { ease: 'easeOutBack' });
        },
        280 + i * 85
      )
    );
    return node;
  });
}

function s9_update(s, dt) {
  s.selCD -= dt;
  const up = keyp('ArrowUp') || keyp('KeyW');
  const down = keyp('ArrowDown') || keyp('KeyS');
  if ((up || down) && s.selCD <= 0) {
    s.selCD = 0.16;
    s.sel = (s.sel + (up ? -1 : 1) + _S9I.length) % _S9I.length;
    s.cursor.tweenTo({ y: 70 + s.sel * 32 - 3 }, 0.18, { ease: 'easeOutCubic' });
  }
  s.items.forEach((nd, i) => {
    const col = i === s.sel ? _S9CH[i] : _S9CN[i];
    nd.fill = `#${col.toString(16).padStart(6, '0')}`;
  });
}

function s9_draw(s) {
  cls(0x0d1a2e);
  for (let i = 0; i < 18; i++) pset(((_gT * 12 + i * 137) | 0) % W, (i * 83) % H, 0x1a2a3a);
  rectfill(0, 0, W, 42, rgba8(0, 0, 0, 110));
  printCentered('NOVA  64', CX, 12, 0xffcc44);
  printCentered('ULTIMATE 3D FANTASY CONSOLE', CX, 27, 0x445566);
  drawStage(s.root);
  rectfill(0, H - 20, W, 20, rgba8(0, 0, 0, 150));
  printCentered('[↑↓] Navigate   [SPACE] Next Scene', CX, H - 12, 0x334455);
  print('STAGE MENU', 4, 4, 0x223344);
  print('createTextNode + tweenTo slide-in + cursor', 4, 12, 0x1a2a3a);
}

// ══════════════════════════════════════════════════════════════════════════════
// S10 — ANALOGUE CLOCK
// Pure framebuffer drawing; hands driven by real system time
// ══════════════════════════════════════════════════════════════════════════════
const _CR = 82;

function s10_init(s) {
  const now = new Date();
  s.base = now.getSeconds() + now.getMinutes() * 60 + now.getHours() * 3600;
}

function s10_update(s, dt) {
  /* s.t accumulates in global update */
}

function s10_draw(s) {
  const tot = s.base + s.t;
  const sec = tot % 60;
  const min = (tot / 60) % 60;
  const hr = (tot / 3600) % 12;
  cls(0x1a1a2e);

  // Tick marks
  for (let d = 0; d < 360; d += 6) {
    const a = (d * Math.PI) / 180;
    const major = d % 30 === 0;
    const r1 = _CR - (major ? 14 : 6);
    line(
      (CX + Math.cos(a) * r1) | 0,
      (CY + Math.sin(a) * r1) | 0,
      (CX + Math.cos(a) * _CR) | 0,
      (CY + Math.sin(a) * _CR) | 0,
      major ? 0xffffff : 0x445566
    );
  }
  circle(CX, CY, _CR, 0x334455, false);
  circle(CX, CY, _CR - 5, 0x223344, false);

  // Hand drawing helper
  function hand(angle, len, thick, col) {
    const a = angle - Math.PI / 2;
    const lx = (CX + Math.cos(a) * len) | 0;
    const ly = (CY + Math.sin(a) * len) | 0;
    const ex = (CX - Math.cos(a) * 9) | 0;
    const ey = (CY - Math.sin(a) * 9) | 0;
    for (let t2 = -thick; t2 <= thick; t2++) {
      const pa = a + Math.PI / 2;
      const ox = (Math.cos(pa) * t2) | 0;
      const oy = (Math.sin(pa) * t2) | 0;
      line(ex + ox, ey + oy, lx + ox, ly + oy, col);
    }
  }

  hand((hr / 12) * Math.PI * 2, (_CR * 0.5) | 0, 2, 0xffffff);
  hand((min / 60) * Math.PI * 2, (_CR * 0.72) | 0, 2, 0xaaddff);
  hand((sec / 60) * Math.PI * 2, (_CR * 0.86) | 0, 1, 0xff4444);

  circle(CX, CY, 5, 0xff4444, true);
  circle(CX, CY, 2, 0xffffff, true);

  const hh = String(Math.floor(hr)).padStart(2, '0');
  const mm = String(Math.floor(min)).padStart(2, '0');
  const ss = String(Math.floor(sec)).padStart(2, '0');
  printCentered(`${hh}:${mm}:${ss}`, CX, CY + _CR + 14, 0xaaddff);

  print('CLOCK', 4, 4, 0x445566);
  print('analogue hands  smooth interpolation  real time', 4, 12, 0x2a3a4a);
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENES registry — defined after all scene functions (function hoisting)
// ══════════════════════════════════════════════════════════════════════════════
const SCENES = [
  { name: 'TWEEN BOUNCE', init: s1_init, update: s1_update, draw: s1_draw },
  { name: 'FIREWORKS', init: s2_init, update: s2_update, draw: s2_draw },
  { name: 'AURORA', init: s3_init, update: s3_update, draw: s3_draw },
  { name: 'CRT TERMINAL', init: s4_init, update: s4_update, draw: s4_draw },
  { name: 'LOGO REVEAL', init: s5_init, update: s5_update, draw: s5_draw },
  { name: 'CARD FLIP', init: s6_init, update: s6_update, draw: s6_draw },
  { name: 'PARTICLE TRAIL', init: s7_init, update: s7_update, draw: s7_draw },
  { name: 'PLATFORMER', init: s8_init, update: s8_update, draw: s8_draw },
  { name: 'STAGE MENU', init: s9_init, update: s9_update, draw: s9_draw },
  { name: 'CLOCK', init: s10_init, update: s10_update, draw: s10_draw },
];
