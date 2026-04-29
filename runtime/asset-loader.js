// runtime/asset-loader.js — Convention-based asset preloader
// Carts declare logical asset names in env.assets; this module preloads
// and provides access by name. Uses existing loadTexture/loadModel APIs.
import { logger } from './logger.js';

// ── State ────────────────────────────────────────────────────
let _assets = {}; // { logicalName: { type, path, data, status } }
let _basePath = ''; // cart directory base path
let _loaded = 0;
let _total = 0;

// ── Core API ─────────────────────────────────────────────────

/**
 * preloadAssets(assetConfig, basePath) — Begin preloading all declared assets.
 * Returns a Promise that resolves when all assets are loaded.
 * Carts can call this in init() or let manifest auto-call it.
 */
async function preloadAssets(assetConfig, basePath) {
  if (!assetConfig) return;
  _basePath = basePath || '';
  _assets = {};
  _loaded = 0;
  _total = 0;

  const entries = [];

  // Textures
  if (assetConfig.textures) {
    for (const [name, path] of Object.entries(assetConfig.textures)) {
      entries.push({ name, type: 'texture', path: resolvePath(path) });
    }
  }

  // Models
  if (assetConfig.models) {
    for (const [name, path] of Object.entries(assetConfig.models)) {
      entries.push({ name, type: 'model', path: resolvePath(path) });
    }
  }

  // Sounds (just register, audio is created on-demand)
  if (assetConfig.sounds) {
    for (const [name, path] of Object.entries(assetConfig.sounds)) {
      _assets[name] = { type: 'sound', path: resolvePath(path), data: path, status: 'ready' };
    }
  }

  _total = entries.length;
  if (_total === 0) {
    logger.info('📂 No assets to preload');
    return;
  }

  logger.info(`📂 Preloading ${_total} assets...`);

  const promises = entries.map(async entry => {
    _assets[entry.name] = { type: entry.type, path: entry.path, data: null, status: 'loading' };
    try {
      let data;
      if (entry.type === 'texture' && typeof globalThis.loadTexture === 'function') {
        data = await globalThis.loadTexture(entry.path);
      } else if (entry.type === 'model' && typeof globalThis.loadModel === 'function') {
        data = await globalThis.loadModel(entry.path);
      } else {
        // Can't load this type — store path for manual use
        data = entry.path;
      }
      _assets[entry.name].data = data;
      _assets[entry.name].status = 'loaded';
      _loaded++;
    } catch (err) {
      _assets[entry.name].status = 'error';
      _assets[entry.name].error = err.message || String(err);
      _loaded++;
      logger.warn(`📂 Failed to load asset "${entry.name}": ${err.message || err}`);
    }
  });

  await Promise.all(promises);
  logger.info(`📂 Assets loaded: ${_loaded}/${_total}`);
}

/**
 * getAsset(name) — Retrieve a preloaded asset by its logical name.
 * Returns the loaded data (texture ID, model ID, path) or null.
 */
function getAsset(name) {
  const entry = _assets[name];
  return entry ? entry.data : null;
}

/**
 * getAssetStatus() — Get loading progress.
 * Returns { loaded, total, percent, details }
 */
function getAssetStatus() {
  const details = {};
  for (const [name, entry] of Object.entries(_assets)) {
    details[name] = { type: entry.type, status: entry.status };
    if (entry.error) details[name].error = entry.error;
  }
  return {
    loaded: _loaded,
    total: _total,
    percent: _total > 0 ? Math.round((_loaded / _total) * 100) : 100,
    details,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function resolvePath(path) {
  if (!path) return '';
  // Absolute URLs or data URIs pass through
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/')) {
    return path;
  }
  // Relative to cart's base directory
  return _basePath ? `${_basePath}/${path}` : path;
}

// ── Internal ─────────────────────────────────────────────────

/** Reset all state. Called on cart unload. */
function _resetAssets() {
  _assets = {};
  _basePath = '';
  _loaded = 0;
  _total = 0;
}

// ── Module export ────────────────────────────────────────────

export function assetLoaderApi() {
  return {
    exposeTo(target) {
      target.preloadAssets = preloadAssets;
      target.getAsset = getAsset;
      target.getAssetStatus = getAssetStatus;
    },
    _load: preloadAssets,
    _reset: _resetAssets,
  };
}
