// runtime/console.js
import { logger } from './logger.js';

export const NOVA64_VERSION = '0.4.8';

export class Nova64 {
  constructor(gpu, manifestInst) {
    this.gpu = gpu;
    this.cart = null;
    this._manifest = manifestInst || null;
    this._loadGeneration = 0; // Guard against concurrent loadCart race conditions
    this.onCartWillLoad = null; // (path) => void — called before cart import
    this.onCartDidLoad = null; // (path) => void — called after cart init() completes
  }
  async loadCart(modulePath) {
    // Bump generation — any earlier in-flight loadCart will see the mismatch and bail.
    const gen = ++this._loadGeneration;
    logger.info(`🧹 Clearing previous scene before loading new cart... (gen=${gen})`);

    // CRITICAL: Null out cart FIRST to prevent old update() from running during transition
    this.cart = null;

    // Clear UI buttons and panels from previous cart
    if (typeof globalThis.clearButtons === 'function') {
      globalThis.clearButtons();
    }
    if (typeof globalThis.clearPanels === 'function') {
      globalThis.clearPanels();
    }

    // Reset screen manager to clear registered screens from previous cart
    if (globalThis.screens && typeof globalThis.screens.reset === 'function') {
      globalThis.screens.reset();
    }

    // Clear the 3D scene completely before loading new cart
    if (typeof globalThis.clearScene === 'function') {
      globalThis.clearScene();
    }

    // Also clear any skybox
    if (typeof globalThis.clearSkybox === 'function') {
      globalThis.clearSkybox();
    }

    // Reset camera to default position
    if (typeof globalThis.setCameraPosition === 'function') {
      globalThis.setCameraPosition(0, 5, 10);
    }
    if (typeof globalThis.setCameraTarget === 'function') {
      globalThis.setCameraTarget(0, 0, 0);
    }

    // Reset fog to default
    if (typeof globalThis.setFog === 'function') {
      globalThis.setFog(0x87ceeb, 50, 200);
    }

    // Reset manifest (env + i18n + data + assets)
    if (this._manifest) this._manifest._reset();

    logger.info('✅ Scene cleared, loading new cart:', modulePath);

    // Lifecycle: onCartWillLoad — always log version, then call user callback
    logger.info(`🎮 Nova64 v${NOVA64_VERSION} — Loading: ${modulePath}`);
    if (typeof this.onCartWillLoad === 'function') {
      try {
        this.onCartWillLoad(modulePath);
      } catch (e) {
        logger.error('onCartWillLoad error:', e);
      }
    }

    const mod = await import(/* @vite-ignore */ modulePath + '?t=' + Date.now());

    // RACE-CONDITION GUARD: If a newer loadCart was called while we awaited the
    // import, our generation is stale — abort so only the latest cart initialises.
    if (gen !== this._loadGeneration) {
      logger.warn(
        `⚠️ loadCart(${modulePath}) superseded by a newer load (gen ${gen} vs ${this._loadGeneration}), aborting.`
      );
      return;
    }

    // Clear scene AGAIN right before init — in case a concurrent loadCart
    // already ran and added its own objects while we were awaiting import.
    if (typeof globalThis.clearScene === 'function') {
      globalThis.clearScene();
    }
    if (typeof globalThis.clearSkybox === 'function') {
      globalThis.clearSkybox();
    }
    if (typeof globalThis.clearButtons === 'function') {
      globalThis.clearButtons();
    }
    if (typeof globalThis.clearPanels === 'function') {
      globalThis.clearPanels();
    }

    // Auto-load manifest: meta.json (preferred) or export const env (fallback)
    if (this._manifest) await this._manifest._loadFromCart(mod, modulePath);

    this.cart = {
      init: mod.init || (() => {}),
      update: mod.update || (() => {}),
      draw: mod.draw || (() => {}),
    };
    try {
      await this.cart.init();
      // Final guard: if yet ANOTHER loadCart fired during init, don't keep this cart
      if (gen !== this._loadGeneration) {
        logger.warn(
          `⚠️ loadCart(${modulePath}) superseded during init (gen ${gen} vs ${this._loadGeneration}), aborting.`
        );
        this.cart = null;
        return;
      }
      logger.info('✅ Cart init() complete:', modulePath);

      // Lifecycle: onCartDidLoad — cart is fully initialised and rendering
      if (typeof this.onCartDidLoad === 'function') {
        try {
          this.onCartDidLoad(modulePath);
        } catch (e) {
          logger.error('onCartDidLoad error:', e);
        }
      }
    } catch (e) {
      logger.error('❌ Cart init() threw:', e.message, e.stack);
    }
  }
}
