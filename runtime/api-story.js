// runtime/api-story.js
// nova64.story — reusable slide-based intro / cutscene / chapter-break helper.
//
// Models the pattern indie-odyssey ships in `examples/indie-odyssey/code.js`
// (drawStoryFrameImage / drawStoryPixelGrid / drawStoryTransitionFrame /
// storyFrameCanvas) as a first-class engine API so other carts don't have to
// hand-roll it.
//
// Usage:
//   await nova64.story.play([
//     { image: 'assets/intro_01.jpeg', text: 'The shardgrid awakens.' },
//     { image: 'assets/intro_02.jpeg', text: 'A new operator boots up.' },
//     { image: 'assets/intro_03.jpeg', text: 'Welcome to the network.' },
//   ], {
//     transition: 'pixel-melt',   // or 'fade' | 'crt-cut' | 'none'
//     advanceKey: 'Enter',         // also supports gamepad A
//     autoAdvance: 0,              // seconds; 0 = wait for input
//     onAdvance: () => beep(),
//     onFinish: () => setScreen('game'),
//   });
//
// The story canvas is a dedicated DOM overlay (z=13, transparent background
// per the lesson from the indie-odyssey CSS-background incident — see
// mempalace `feedback_render_bug_strategy.md`). Resolves the returned
// Promise when the player advances past the last slide or `stop()` is
// called.

const OVERLAY_ID = '__nova64_story_overlay__';
const TRANSITIONS = new Set(['pixel-melt', 'fade', 'crt-cut', 'none']);

function hasDocument() {
  return (
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function' &&
    typeof document.getElementById === 'function' &&
    document.body
  );
}

export function storyApi() {
  // Singleton state. Multiple play() calls are allowed but the new one
  // replaces the old (the old promise resolves with `superseded: true`).
  const state = {
    canvas: null,
    ctx: null,
    slides: [],
    index: 0,
    visible: false,
    transition: 'pixel-melt',
    transitionT: 0,
    transitionDur: 0.7,
    activeTransition: null,
    advanceKey: 'Enter',
    autoAdvance: 0,
    autoTimer: 0,
    images: new Map(), // src -> { img, status }
    onAdvance: null,
    onFinish: null,
    onSkip: null,
    sessionId: 0,
    resolvers: [],
    keyListener: null,
  };

  function ensureCanvas() {
    if (state.canvas) return state.canvas;
    if (!hasDocument()) return null;
    const canvas = document.createElement('canvas');
    canvas.id = OVERLAY_ID;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'pointer-events:none',
      'z-index:13',
      'display:none',
      'background:transparent',
      'image-rendering:pixelated',
    ].join(';');
    const parent = document.getElementById('screen')?.parentElement || document.body;
    if (
      parent &&
      typeof getComputedStyle === 'function' &&
      getComputedStyle(parent).position === 'static'
    ) {
      parent.style.position = 'relative';
    }
    parent.appendChild(canvas);
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    return canvas;
  }

  function ensureSize(W, H) {
    if (!state.canvas) return;
    if (state.canvas.width !== W || state.canvas.height !== H) {
      state.canvas.width = W;
      state.canvas.height = H;
    }
  }

  function getCartViewport() {
    // Snap to the cart framebuffer's logical size so the slide art aligns
    // with the cart's draw calls.
    if (typeof globalThis.width === 'function' && typeof globalThis.height === 'function') {
      return { W: globalThis.width(), H: globalThis.height() };
    }
    if (!hasDocument()) return { W: 640, H: 360 };
    const screen = document.getElementById('screen');
    return {
      W: screen?.width || 640,
      H: screen?.height || 360,
    };
  }

  function preloadImage(src) {
    if (!src || state.images.has(src)) return state.images.get(src);
    const entry = { img: null, status: 'loading' };
    state.images.set(src, entry);
    const ImageCtor = globalThis.Image;
    if (typeof ImageCtor !== 'function') {
      entry.status = 'unavailable';
      return entry;
    }
    const img = new ImageCtor();
    img.decoding = 'async';
    img.onload = () => {
      entry.img = img;
      entry.status = 'ready';
    };
    img.onerror = () => {
      entry.status = 'error';
    };
    img.src = src;
    return entry;
  }

  function imageEntry(src) {
    if (!src) return null;
    return state.images.get(src) || preloadImage(src);
  }

  // ── Drawing ─────────────────────────────────────────────────────────────

  function drawFrame(ctx, slide, W, H, alpha = 1) {
    if (!slide) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const entry = imageEntry(slide.image);
    if (entry?.img && entry.status === 'ready') {
      ctx.imageSmoothingEnabled = true;
      const iw = entry.img.naturalWidth || entry.img.width;
      const ih = entry.img.naturalHeight || entry.img.height;
      const sR = iw / ih;
      const dR = W / H;
      let dx = 0,
        dy = 0,
        dw = W,
        dh = H;
      if (sR > dR) {
        dh = W / sR;
        dy = (H - dh) / 2;
      } else {
        dw = H * sR;
        dx = (W - dw) / 2;
      }
      ctx.fillStyle = slide.background || '#030711';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(entry.img, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = slide.background || '#030711';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#88aaff';
      ctx.font = `${Math.max(8, Math.floor(H / 36))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(
        entry?.status === 'error' ? 'image load failed' : 'loading image…',
        W / 2,
        H / 2
      );
    }
    if (slide.text) {
      ctx.globalAlpha = alpha;
      const boxH = Math.max(48, Math.floor(H * 0.22));
      ctx.fillStyle = slide.textBackground || 'rgba(8, 12, 24, 0.78)';
      ctx.fillRect(0, H - boxH, W, boxH);
      ctx.strokeStyle = slide.textBorder || '#0ea5e9';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, H - boxH + 0.5, W - 1, boxH - 1);
      ctx.fillStyle = slide.textColor || '#e0f2ff';
      ctx.font = `${Math.max(10, Math.floor(H / 30))}px monospace`;
      ctx.textAlign = 'left';
      wrapText(
        ctx,
        slide.text,
        Math.max(8, W * 0.04),
        H - boxH + Math.floor(boxH * 0.35),
        W * 0.92,
        Math.floor(H / 22)
      );
    }
    if (slide.prompt !== false) {
      ctx.fillStyle = slide.promptColor || 'rgba(146, 200, 255, 0.85)';
      ctx.font = `${Math.max(8, Math.floor(H / 40))}px monospace`;
      ctx.textAlign = 'center';
      const pulse = 0.7 + Math.sin(performance.now() / 350) * 0.3;
      ctx.globalAlpha = alpha * pulse;
      ctx.fillText(slide.prompt || 'Press Enter to continue', W / 2, H - 6);
    }
    ctx.restore();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(/\s+/);
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth) {
        ctx.fillText(line, x, yy);
        line = w;
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawPixelGrid(ctx, W, H, progress) {
    const block = 8 + Math.floor((1 - progress) * 28);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.25 * (1 - progress));
    ctx.fillStyle = '#00131f';
    for (let y = 0; y < H; y += block) {
      for (let x = 0; x < W; x += block) {
        if ((((x / block) | 0) + ((y / block) | 0)) % 3 === 0) {
          ctx.fillRect(x, y, block, block);
        }
      }
    }
    ctx.restore();
  }

  function drawTransition(ctx, fromSlide, toSlide, progress, W, H) {
    const e = progress * progress * (3 - 2 * progress);
    switch (state.transition) {
      case 'fade':
        ctx.clearRect(0, 0, W, H);
        drawFrame(ctx, fromSlide, W, H, 1 - e);
        drawFrame(ctx, toSlide, W, H, e);
        break;
      case 'crt-cut': {
        ctx.clearRect(0, 0, W, H);
        const cut = Math.floor(H * e);
        drawFrame(ctx, fromSlide, W, H, 1);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, H / 2 - cut / 2, W, cut);
        drawFrame(ctx, toSlide, W, H, e);
        break;
      }
      case 'none':
        ctx.clearRect(0, 0, W, H);
        drawFrame(ctx, toSlide, W, H, 1);
        break;
      case 'pixel-melt':
      default:
        ctx.clearRect(0, 0, W, H);
        drawFrame(ctx, fromSlide, W, H, 1 - e * 0.5);
        drawFrame(ctx, toSlide, W, H, e);
        drawPixelGrid(ctx, W, H, e);
        break;
    }
  }

  // ── Per-frame tick ──────────────────────────────────────────────────────

  function tick(dt) {
    if (!state.visible) return;
    pollInput();
    if (!state.ctx) {
      if (state.activeTransition) {
        state.transitionT += dt;
        if (state.transitionT >= state.transitionDur) finishActiveTransition();
      } else if (state.autoAdvance > 0) {
        state.autoTimer += dt;
        if (state.autoTimer >= state.autoAdvance) next();
      }
      return;
    }
    const { W, H } = getCartViewport();
    ensureSize(W, H);
    const ctx = state.ctx;
    if (state.activeTransition) {
      state.transitionT += dt;
      const t = Math.min(1, state.transitionT / state.transitionDur);
      drawTransition(ctx, state.activeTransition.from, state.activeTransition.to, t, W, H);
      if (t >= 1) {
        finishActiveTransition();
      }
    } else {
      ctx.clearRect(0, 0, W, H);
      drawFrame(ctx, state.slides[state.index], W, H, 1);
      if (state.autoAdvance > 0) {
        state.autoTimer += dt;
        if (state.autoTimer >= state.autoAdvance) next();
      }
    }
  }

  function finishActiveTransition() {
    if (!state.activeTransition) return;
    state.index = state.activeTransition.toIndex;
    state.activeTransition = null;
    state.transitionT = 0;
    state.autoTimer = 0;
    if (state.onAdvance) {
      try {
        state.onAdvance(state.index, state.slides[state.index]);
      } catch (_) {
        /* swallow */
      }
    }
  }

  function pollInput() {
    const input = globalThis.nova64?.input;
    const keyp = input?.keyp;
    const btnp = input?.btnp;
    if (typeof keyp !== 'function' && typeof btnp !== 'function') return;
    const pressed = (...keys) => typeof keyp === 'function' && keys.some(k => keyp(k));
    if (pressed('Escape')) {
      skip();
      return;
    }
    if (
      pressed(state.advanceKey, 'Space', ' ', 'Enter') ||
      (typeof btnp === 'function' && btnp(0))
    ) {
      next();
    }
  }

  // ── Slide navigation ───────────────────────────────────────────────────

  function next() {
    if (!state.visible || state.activeTransition) return;
    const isLast = state.index >= state.slides.length - 1;
    if (isLast) {
      finish();
      return;
    }
    state.activeTransition = {
      from: state.slides[state.index],
      to: state.slides[state.index + 1],
      toIndex: state.index + 1,
    };
    state.transitionT = 0;
  }

  function skip() {
    if (!state.visible) return;
    if (state.onSkip) {
      try {
        state.onSkip(state.index);
      } catch (_) {
        /* swallow */
      }
    }
    finish();
  }

  function finish() {
    const sid = state.sessionId;
    state.visible = false;
    state.activeTransition = null;
    if (state.canvas) state.canvas.style.display = 'none';
    if (
      typeof window !== 'undefined' &&
      typeof window.removeEventListener === 'function' &&
      state.keyListener
    ) {
      window.removeEventListener('keydown', state.keyListener);
      state.keyListener = null;
    }
    if (state.onFinish) {
      try {
        state.onFinish();
      } catch (_) {
        /* swallow */
      }
    }
    const resolvers = state.resolvers.splice(0, state.resolvers.length);
    for (const r of resolvers) {
      try {
        r({ finished: true, superseded: false, sessionId: sid });
      } catch (_) {
        /* swallow */
      }
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  function play(slides, opts = {}) {
    if (!Array.isArray(slides) || slides.length === 0) {
      return Promise.resolve({ finished: true, superseded: false, empty: true });
    }
    // Supersede any previous play() — resolve old promise with superseded.
    if (state.visible || state.resolvers.length) {
      const prev = state.resolvers.splice(0, state.resolvers.length);
      for (const r of prev) {
        try {
          r({ finished: false, superseded: true });
        } catch (_) {
          /* swallow */
        }
      }
    }
    ensureCanvas();
    state.sessionId++;
    state.slides = slides.slice();
    state.index = 0;
    state.transition = TRANSITIONS.has(opts.transition) ? opts.transition : 'pixel-melt';
    state.transitionDur =
      typeof opts.transitionDuration === 'number' ? Math.max(0.05, opts.transitionDuration) : 0.7;
    state.advanceKey = opts.advanceKey || 'Enter';
    state.autoAdvance = typeof opts.autoAdvance === 'number' ? opts.autoAdvance : 0;
    state.onAdvance = typeof opts.onAdvance === 'function' ? opts.onAdvance : null;
    state.onFinish = typeof opts.onFinish === 'function' ? opts.onFinish : null;
    state.onSkip = typeof opts.onSkip === 'function' ? opts.onSkip : null;
    state.autoTimer = 0;
    state.transitionT = 0;
    state.activeTransition = null;
    state.visible = true;

    // Preload every slide's image so transitions don't blink to placeholder.
    for (const s of state.slides) {
      if (s?.image) preloadImage(s.image);
    }

    if (state.canvas) state.canvas.style.display = 'block';

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      state.keyListener = e => {
        const k = e.key;
        if (k === state.advanceKey || k === 'Space' || k === ' ' || k === 'Enter') {
          e.preventDefault();
          next();
        } else if (k === 'Escape') {
          e.preventDefault();
          skip();
        }
      };
      window.addEventListener('keydown', state.keyListener);
    }

    return new Promise(res => {
      state.resolvers.push(res);
    });
  }

  function stop() {
    finish();
  }
  function isPlaying() {
    return state.visible;
  }
  function currentIndex() {
    return state.index;
  }
  function totalSlides() {
    return state.slides.length;
  }

  function exposeTo(target) {
    target.story = {
      play,
      next,
      skip,
      stop,
      isPlaying,
      currentIndex,
      totalSlides,
      _tick: tick,
    };
  }

  return {
    play,
    next,
    skip,
    stop,
    isPlaying,
    currentIndex,
    totalSlides,
    exposeTo,
    // Engine main-loop hook.
    _tick: tick,
  };
}
