// runtime/api-loader.js
// nova64.loader — reusable cart boot/asset loader overlay.
//
// Provides a themable DOM overlay (matching the homepage hero-loader visual
// style) with a progress bar + status text, plus a tracking system that
// automatically follows assets loaded via `nova64.scene.loadModel`,
// `nova64.scene.loadTexture`, and `nova64.image.preload` while the loader
// is visible.
//
// Typical usage:
//   nova64.loader.show({ title: 'INDIE ODYSSEY', subtitle: 'BOOT' });
//   nova64.loader.track([
//     '/indie-odyssey/models/enemies/dataImp.glb',
//     '/indie-odyssey/images/spritesheet/dataImp.png',
//   ]);
//   await nova64.loader.whenReady();
//   nova64.loader.hide();
//   startGame();
//
// Cart authors can also rely on auto-tracking. Anything passed to
// `nova64.scene.loadModel(url, ...)` while the loader is shown is added
// to the pending set automatically. Call `nova64.loader.whenReady()` to
// await the queue draining.

const OVERLAY_ID = '__nova64_loader_overlay__';

export function loaderApi() {
  // Per-instance state. The loader is a singleton — only one is visible
  // at a time (calling show() while one is up replaces it).
  const state = {
    overlay: null,
    title: null,
    subtitle: null,
    statusEl: null,
    barEl: null,
    percentEl: null,
    visible: false,
    // Set of tracked URLs that are still pending.
    pending: new Set(),
    // Total URLs ever tracked in this session — used so progress only goes
    // up. Resetting the loader (calling show()) resets this.
    totalSeen: 0,
    readyCallbacks: [],
    statusText: 'LOADING…',
  };

  function ensureOverlay() {
    if (state.overlay) return state.overlay;
    if (typeof document === 'undefined') return null;
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('aria-live', 'polite');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:radial-gradient(circle at center, rgba(8,12,30,0.96) 0%, rgba(0,0,0,0.98) 100%)',
      'color:#aef',
      'font-family:"Press Start 2P", "JetBrains Mono", monospace',
      'pointer-events:auto',
      'transition:opacity 0.45s ease',
      'opacity:0',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'min-width:280px',
      'max-width:80vw',
      'text-align:center',
      'padding:32px 40px',
      'border:2px solid #1faaff',
      'box-shadow:0 0 20px rgba(31,170,255,0.5), inset 0 0 30px rgba(31,170,255,0.15)',
      'background:rgba(2,8,20,0.7)',
      'border-radius:6px',
    ].join(';');

    const title = document.createElement('div');
    title.style.cssText =
      'font-size:22px;letter-spacing:4px;margin-bottom:8px;color:#1faaff;text-shadow:0 0 8px rgba(31,170,255,0.7)';
    title.textContent = 'NOVA64';
    state.title = title;

    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:10px;letter-spacing:3px;margin-bottom:24px;color:#7af';
    subtitle.textContent = 'LOADING';
    state.subtitle = subtitle;

    const status = document.createElement('div');
    status.style.cssText =
      'font-size:9px;letter-spacing:2px;margin-bottom:14px;color:#9cf;min-height:1em';
    status.textContent = state.statusText;
    state.statusEl = status;

    const barWrap = document.createElement('div');
    barWrap.style.cssText = [
      'width:240px',
      'height:6px',
      'background:rgba(31,170,255,0.15)',
      'border:1px solid #1faaff',
      'overflow:hidden',
      'margin:0 auto',
    ].join(';');

    const bar = document.createElement('div');
    bar.style.cssText = [
      'width:0%',
      'height:100%',
      'background:linear-gradient(90deg, #1faaff, #00ffff)',
      'box-shadow:0 0 12px rgba(0,255,255,0.7)',
      'transition:width 0.18s ease-out',
    ].join(';');
    barWrap.appendChild(bar);
    state.barEl = bar;

    const percent = document.createElement('div');
    percent.style.cssText = 'font-size:9px;letter-spacing:3px;margin-top:8px;color:#7af';
    percent.textContent = '0%';
    state.percentEl = percent;

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(status);
    card.appendChild(barWrap);
    card.appendChild(percent);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    state.overlay = overlay;
    return overlay;
  }

  function updateProgressUI() {
    if (!state.visible || !state.barEl) return;
    const totalSeen = Math.max(1, state.totalSeen);
    const done = totalSeen - state.pending.size;
    const ratio = Math.max(0, Math.min(1, done / totalSeen));
    const pct = Math.round(ratio * 100);
    state.barEl.style.width = pct + '%';
    if (state.percentEl) state.percentEl.textContent = pct + '%';
  }

  function fireReady() {
    const cbs = state.readyCallbacks.slice();
    state.readyCallbacks.length = 0;
    for (const cb of cbs) {
      try {
        cb();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[nova64.loader] onReady callback threw:', e);
      }
    }
  }

  function maybeReady() {
    if (state.pending.size === 0 && state.totalSeen > 0) {
      fireReady();
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Show the loader overlay. Options:
   *   { title?: string, subtitle?: string, status?: string }
   * Calling show() while already visible just refreshes the labels.
   * Each show() resets the tracked-asset counters.
   */
  function show(opts = {}) {
    ensureOverlay();
    if (!state.overlay) return; // SSR / non-browser host
    if (opts.title != null && state.title) state.title.textContent = String(opts.title);
    if (opts.subtitle != null && state.subtitle) state.subtitle.textContent = String(opts.subtitle);
    if (opts.status != null) setStatus(opts.status);

    state.pending.clear();
    state.totalSeen = 0;
    state.visible = true;
    state.overlay.style.display = 'flex';
    // Force layout flush before fading in.
    void state.overlay.offsetHeight;
    state.overlay.style.opacity = '1';
    updateProgressUI();
  }

  /**
   * Add URLs to the tracked-assets set. The progress bar reflects the
   * fraction of tracked URLs that have completed (regardless of success
   * — failed loads still count as done so the loader can drain).
   * Accepts a single URL or an array.
   */
  function track(urls) {
    if (!urls) return;
    const arr = Array.isArray(urls) ? urls : [urls];
    for (const u of arr) {
      if (typeof u !== 'string' || !u) continue;
      if (state.pending.has(u)) continue;
      state.pending.add(u);
      state.totalSeen++;
    }
    updateProgressUI();
  }

  /**
   * Mark a previously-tracked URL as resolved (success or failure both
   * count). Called by the auto-tracking hooks in api-3d / api-2d when a
   * load promise settles. Safe to call with a URL that was never
   * tracked (no-op).
   */
  function resolve(url) {
    if (typeof url !== 'string') return;
    if (state.pending.delete(url)) {
      updateProgressUI();
      if (state.visible) maybeReady();
    }
  }

  /**
   * Set the human-readable status line under the title.
   */
  function setStatus(text) {
    state.statusText = String(text ?? '');
    if (state.statusEl) state.statusEl.textContent = state.statusText;
  }

  /**
   * Register a callback that fires once all currently-tracked assets
   * have resolved. If nothing is tracked yet, the callback fires on the
   * next track-then-resolve cycle (i.e. it waits for the FIRST drain).
   * Returns an unsubscribe function.
   */
  function onReady(cb) {
    if (typeof cb !== 'function') return () => {};
    state.readyCallbacks.push(cb);
    if (state.pending.size === 0 && state.totalSeen > 0) {
      // Already drained — fire on the next tick so callers can assume
      // synchronous-vs-async parity.
      Promise.resolve().then(() => {
        const idx = state.readyCallbacks.indexOf(cb);
        if (idx >= 0) {
          state.readyCallbacks.splice(idx, 1);
          try {
            cb();
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[nova64.loader] onReady callback threw:', e);
          }
        }
      });
    }
    return () => {
      const idx = state.readyCallbacks.indexOf(cb);
      if (idx >= 0) state.readyCallbacks.splice(idx, 1);
    };
  }

  /**
   * Promise-style alternative to onReady — resolves once the tracked set
   * drains. Convenient for `await nova64.loader.whenReady()`.
   */
  function whenReady() {
    return new Promise(resolve => onReady(resolve));
  }

  /**
   * Hide the loader. Fades out then removes from the DOM. Safe to call
   * multiple times.
   */
  function hide() {
    if (!state.visible || !state.overlay) {
      state.visible = false;
      return;
    }
    state.visible = false;
    state.overlay.style.opacity = '0';
    const overlay = state.overlay;
    setTimeout(() => {
      if (overlay && overlay.style) overlay.style.display = 'none';
    }, 500);
  }

  function isVisible() {
    return state.visible;
  }
  function progress() {
    if (state.totalSeen === 0) return 0;
    const done = state.totalSeen - state.pending.size;
    return Math.max(0, Math.min(1, done / state.totalSeen));
  }

  function exposeTo(target) {
    target.loader = {
      show,
      hide,
      track,
      resolve,
      setStatus,
      onReady,
      whenReady,
      isVisible,
      progress,
    };
  }

  return {
    show,
    hide,
    track,
    resolve,
    setStatus,
    onReady,
    whenReady,
    isVisible,
    progress,
    exposeTo,
    // Internal hook for the auto-tracking integration in scene.loadModel etc.
    _trackUrl: url => {
      if (!state.visible) return;
      track(url);
    },
    _resolveUrl: url => {
      if (!state.visible) return;
      resolve(url);
    },
  };
}
