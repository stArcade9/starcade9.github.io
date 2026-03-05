// runtime/console.js
export class Nova64 {
  constructor(gpu) {
    this.gpu = gpu;
    this.cart = null;
    this._loadGeneration = 0; // Guard against concurrent loadCart race conditions
  }
  async loadCart(modulePath) {
    // Bump generation — any earlier in-flight loadCart will see the mismatch and bail.
    const gen = ++this._loadGeneration;
    console.log(`🧹 Clearing previous scene before loading new cart... (gen=${gen})`);
    
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
    
    console.log('✅ Scene cleared, loading new cart:', modulePath);
    
    const mod = await import(/* @vite-ignore */ (modulePath + '?t=' + Date.now()));

    // RACE-CONDITION GUARD: If a newer loadCart was called while we awaited the
    // import, our generation is stale — abort so only the latest cart initialises.
    if (gen !== this._loadGeneration) {
      console.warn(`⚠️ loadCart(${modulePath}) superseded by a newer load (gen ${gen} vs ${this._loadGeneration}), aborting.`);
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

    this.cart = {
      init: mod.init || (()=>{}),
      update: mod.update || (()=>{}),
      draw: mod.draw || (()=>{})
    };
    try {
      await this.cart.init();
      // Final guard: if yet ANOTHER loadCart fired during init, don't keep this cart
      if (gen !== this._loadGeneration) {
        console.warn(`⚠️ loadCart(${modulePath}) superseded during init (gen ${gen} vs ${this._loadGeneration}), aborting.`);
        this.cart = null;
        return;
      }
      console.log('✅ Cart init() complete:', modulePath);
    } catch (e) {
      console.error('❌ Cart init() threw:', e.message, e.stack);
    }
  }
}
