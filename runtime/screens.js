// runtime/screens.js
// Nova64 Screen Management System
// Screen state machine with animated transitions (fade, slide-left, slide-right, wipe)

export class ScreenManager {
  constructor() {
    this.screens = new Map();
    this.currentScreen = null;
    this.defaultScreen = null;
    // Transition state
    this._tr = null; // { type, progress, duration, fromName, toName, data, onEnd }
  }

  addScreen(name, screenDefinition) {
    if (typeof screenDefinition === 'function') {
      const Cls = screenDefinition;
      this.screens.set(name, new Cls());
    } else {
      this.screens.set(name, screenDefinition);
    }
    if (!this.defaultScreen) this.defaultScreen = name;
    return this;
  }

  // Immediate switch (no animation)
  switchTo(screenName, data = {}) {
    const screen = this.screens.get(screenName);
    if (!screen) { console.warn("Screen '" + screenName + "' not found"); return false; }
    if (this.currentScreen) {
      const c = this.screens.get(this.currentScreen);
      if (c && typeof c.exit === 'function') c.exit();
    }
    this.currentScreen = screenName;
    if (typeof screen.enter === 'function') screen.enter(data);
    return true;
  }

  // Animated transition
  // type: 'fade' | 'slide-left' | 'slide-right' | 'wipe' | 'instant'
  transitionTo(screenName, type = 'fade', duration = 0.4, data = {}) {
    if (this._tr && this._tr.active) return;
    const toScreen = this.screens.get(screenName);
    if (!toScreen) { console.warn("Screen '" + screenName + "' not found"); return; }
    this._tr = { active: true, type, duration, progress: 0,
                 fromName: this.currentScreen, toName: screenName, data, onEnd: null };
    if (typeof toScreen.enter === 'function') toScreen.enter(data);
  }

  onTransitionEnd(cb) {
    if (this._tr) this._tr.onEnd = cb;
  }

  start(screenName = null) {
    this.switchTo(screenName || this.defaultScreen);
  }

  update(dt) {
    if (this._tr && this._tr.active) {
      this._tr.progress += dt / this._tr.duration;
      if (this._tr.progress >= 1) { this._tr.progress = 1; this._finishTransition(); }
      const from = this._tr && this._tr.fromName ? this.screens.get(this._tr.fromName) : null;
      const to   = this._tr ? this.screens.get(this._tr.toName) : null;
      if (from && typeof from.update === 'function') from.update(dt);
      if (to   && typeof to.update   === 'function') to.update(dt);
      return;
    }
    if (this.currentScreen) {
      const s = this.screens.get(this.currentScreen);
      if (s && typeof s.update === 'function') s.update(dt);
    }
  }

  _finishTransition() {
    const tr = this._tr;
    if (tr.fromName) {
      const old = this.screens.get(tr.fromName);
      if (old && typeof old.exit === 'function') old.exit();
    }
    this.currentScreen = tr.toName;
    this._tr = null;
    if (typeof tr.onEnd === 'function') tr.onEnd();
  }

  draw() {
    if (this._tr && this._tr.active) { this._drawTransition(); return; }
    if (this.currentScreen) {
      const s = this.screens.get(this.currentScreen);
      if (s && typeof s.draw === 'function') s.draw();
    }
  }

  _drawTransition() {
    const { type, progress, fromName, toName } = this._tr;
    const from = fromName ? this.screens.get(fromName) : null;
    const to   = this.screens.get(toName);
    const t = Math.max(0, Math.min(1, progress));
    const e = t * t * (3 - 2 * t); // smoothstep

    if (type === 'fade') {
      // Cross-fade via black
      const midBlack = t < 0.5 ? Math.round(e * 510) : 0;
      if (t < 0.5) {
        if (from && typeof from.draw === 'function') from.draw();
        if (midBlack > 0 && typeof globalThis.rect === 'function')
          globalThis.rect(0, 0, 640, 360, globalThis.rgba8(0,0,0, Math.min(255, midBlack)), true);
      } else {
        if (to && typeof to.draw === 'function') to.draw();
        const fadeIn = Math.round((1 - e) * 510);
        if (fadeIn > 0 && typeof globalThis.rect === 'function')
          globalThis.rect(0, 0, 640, 360, globalThis.rgba8(0,0,0, Math.min(255, fadeIn)), true);
      }
    } else if (type === 'slide-left' || type === 'slide-right') {
      const dir  = type === 'slide-left' ? -1 : 1;
      const off  = Math.round(e * 640);
      const setC = typeof globalThis.setCamera === 'function' ? globalThis.setCamera : null;
      if (from && typeof from.draw === 'function') {
        if (setC) setC(dir * off, 0);
        from.draw();
      }
      if (to && typeof to.draw === 'function') {
        if (setC) setC(dir * off - dir * 640, 0);
        to.draw();
      }
      if (setC) setC(0, 0);
    } else if (type === 'wipe') {
      if (to   && typeof to.draw   === 'function') to.draw();
      if (from && typeof from.draw === 'function') {
        const wipeX = Math.round(e * 640);
        if (typeof globalThis.setCamera === 'function') globalThis.setCamera(wipeX, 0);
        from.draw();
        if (typeof globalThis.setCamera === 'function') globalThis.setCamera(0, 0);
      }
    } else {
      if (to && typeof to.draw === 'function') to.draw();
    }
  }

  getCurrentScreen()       { return this.currentScreen; }
  getCurrentScreenObject() { return this.currentScreen ? this.screens.get(this.currentScreen) : null; }
  isTransitioning()        { return !!(this._tr && this._tr.active); }

  reset() {
    if (this.currentScreen) {
      const s = this.screens.get(this.currentScreen);
      if (s && typeof s.exit === 'function') s.exit();
    }
    this.screens = new Map();
    this.currentScreen = null;
    this.defaultScreen = null;
    this._tr = null;
  }
}

// Base Screen class for class-based patterns
export class Screen {
  constructor() { this.data = {}; }
  enter(data = {}) { this.data = { ...this.data, ...data }; }
  exit() {}
  update(dt) {}
  draw() {}
}

// Factory
export function screenApi() {
  const manager = new ScreenManager();
  return {
    manager,
    exposeTo(target) {
      target.ScreenManager    = ScreenManager;
      target.Screen           = Screen;
      target.screens          = manager;
      target.addScreen        = (name, def)             => manager.addScreen(name, def);
      target.switchToScreen   = (name, data)            => manager.switchTo(name, data);
      target.switchScreen     = (name, data)            => manager.switchTo(name, data);
      target.transitionTo     = (name, type, dur, data) => manager.transitionTo(name, type, dur, data);
      target.onTransitionEnd  = (cb)                    => manager.onTransitionEnd(cb);
      target.isTransitioning  = ()                      => manager.isTransitioning();
      target.getCurrentScreen = ()                      => manager.getCurrentScreen();
      target.startScreens     = (initial)               => manager.start(initial);
    }
  };
}
