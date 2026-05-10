import { logger } from './logger.js';

const _cartResetHooks = new Map();

export function registerCartResetHook(name, hook) {
  if (typeof name !== 'string' || !name) {
    throw new TypeError('registerCartResetHook(name, hook) requires a non-empty string name');
  }
  if (typeof hook !== 'function') {
    throw new TypeError(`registerCartResetHook("${name}") requires a function hook`);
  }
  _cartResetHooks.set(name, hook);
  return () => unregisterCartResetHook(name);
}

export function unregisterCartResetHook(name) {
  return _cartResetHooks.delete(name);
}

export function listCartResetHooks() {
  return Array.from(_cartResetHooks.keys());
}

export async function runCartResetHooks(context = {}) {
  for (const [name, hook] of _cartResetHooks.entries()) {
    try {
      await hook(context);
    } catch (error) {
      logger.error(`❌ Cart reset hook "${name}" failed:`, error?.message || error, error?.stack);
    }
  }
}
