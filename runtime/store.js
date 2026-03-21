// runtime/store.js
// Zustand-powered reactive game state for Nova64 carts
import { logger } from './logger.js';
// Usage from any cart:
//   const store = createGameStore({ hp: 100, score: 0 });
//   store.setState({ score: store.getState().score + 10 });
//   store.subscribe(state => logger.debug('score changed:', state.score));
//
// The built-in novaStore is a global singleton all carts can read/write:
//   novaStore.setState({ level: 2 });
//   const { score, lives } = novaStore.getState();

let _createStore;

// Try to use real Zustand vanilla, fall back to a compatible hand-rolled version
// so the file works even before `npm install` resolves.
async function _loadZustand() {
  try {
    const mod = await import('zustand/vanilla');
    _createStore = mod.createStore;
    logger.info('✅ Nova64 Store: using Zustand/vanilla');
  } catch {
    // Hand-rolled Zustand-compatible store (same API surface)
    _createStore = function createStorePolyfill(initializer) {
      let state;
      const listeners = new Set();

      const setState = (partial, replace = false) => {
        const next = typeof partial === 'function' ? partial(state) : partial;
        const nextState = replace ? next : Object.assign({}, state, next);
        if (nextState !== state) {
          const prev = state;
          state = nextState;
          listeners.forEach(l => l(state, prev));
        }
      };

      const getState = () => state;

      const subscribe = listener => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      };

      const destroy = () => listeners.clear();

      const api = { setState, getState, subscribe, destroy };
      state =
        typeof initializer === 'function' ? initializer(setState, getState, api) : initializer;
      return api;
    };
    logger.info(
      'ℹ️ Nova64 Store: using built-in store polyfill (run pnpm install to enable Zustand)'
    );
  }
}

// Pre-initialize synchronously with polyfill so stores work immediately,
// then swap to real Zustand if available — existing stores keep their state.
_createStore = function createStorePolyfill(initializer) {
  let state;
  const listeners = new Set();

  const setState = (partial, replace = false) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    const nextState = replace ? next : Object.assign({}, state, next);
    if (nextState !== state) {
      const prev = state;
      state = nextState;
      listeners.forEach(l => l(state, prev));
    }
  };

  const getState = () => state;
  const subscribe = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const destroy = () => listeners.clear();

  const api = { setState, getState, subscribe, destroy };
  state =
    typeof initializer === 'function' ? initializer(setState, getState, api) : initializer || {};
  return api;
};

// Attempt to upgrade to real Zustand asynchronously
_loadZustand();

/**
 * createGameStore(initialState) → store
 * Creates a new reactive store for a cart.
 * Identical to Zustand vanilla's createStore.
 *
 * @param {object|function} initialState  Plain object or Zustand initializer fn
 * @returns {{ getState, setState, subscribe, destroy }}
 */
export function createGameStore(initialState) {
  return _createStore(initialState);
}

/**
 * novaStore — built-in singleton store, auto-ticked by the main loop.
 * All carts can read/write without any setup.
 *
 * getState() returns:
 *   { gameState, score, lives, level, time, paused, playerX, playerY }
 */
export const novaStore = _createStore({
  gameState: 'start', // 'start' | 'playing' | 'paused' | 'gameover' | 'win'
  score: 0,
  lives: 3,
  level: 1,
  time: 0,
  paused: false,
  playerX: 0,
  playerY: 0,
});

export function storeApi() {
  return {
    exposeTo(target) {
      target.createGameStore = createGameStore;
      target.novaStore = novaStore;
    },

    // Called by main loop each frame to increment global time
    tick(dt) {
      const s = novaStore.getState();
      if (!s.paused) {
        novaStore.setState({ time: s.time + dt });
      }
    },

    reset() {
      novaStore.setState(
        {
          gameState: 'start',
          score: 0,
          lives: 3,
          level: 1,
          time: 0,
          paused: false,
          playerX: 0,
          playerY: 0,
        },
        /*replace=*/ true
      );
    },
  };
}
