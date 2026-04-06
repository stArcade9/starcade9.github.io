// runtime/manifest.js — Cart manifest orchestrator
// Dispatches manifest sections to subsystems: env, i18n, data, asset-loader.
// Replaces env.js as the primary entry point for cart configuration.
import { logger } from './logger.js';
import { envApi } from './env.js';
import { i18nApi } from './i18n.js';
import { dataApi } from './data.js';
import { assetLoaderApi } from './asset-loader.js';

// ── Subsystem instances ──────────────────────────────────────
let _envInst = null;
let _i18nInst = null;
let _dataInst = null;
let _assetInst = null;
let _meta = null;
let _cartBasePath = '';

// ── Public API ───────────────────────────────────────────────

/** getMeta() — Returns the cart metadata (name, version, author, description). */
function getMeta() {
  return _meta ? { ..._meta } : null;
}

// ── Internal ─────────────────────────────────────────────────

/**
 * Load a full manifest config. Dispatches sections to subsystems.
 * Called when a cart exports `env`.
 */
function _loadManifest(config, cartPath) {
  if (!config) return;

  // Determine cart base path for asset resolution
  if (cartPath) {
    const lastSlash = cartPath.lastIndexOf('/');
    _cartBasePath = lastSlash > 0 ? cartPath.substring(0, lastSlash) : '';
  }

  // Meta
  if (config.meta) {
    _meta = { ...config.meta };
    logger.info(
      `🎮 Cart: "${_meta.name || 'untitled'}" v${_meta.version || '?'} by ${_meta.author || '?'}`
    );
  }

  // Text / i18n — load BEFORE data so t() is available
  if (config.text && _i18nInst) {
    _i18nInst._load(config.text);
  }

  // Environment (sky, fog, camera, lighting, effects, voxel, cheats)
  // env.js expects { defaults, levels, onCheatsChanged }
  if (_envInst) {
    // Build env-compatible config from manifest
    const envConfig = {};
    if (config.defaults) envConfig.defaults = config.defaults;
    if (config.levels) envConfig.levels = config.levels;
    if (config.onCheatsChanged) envConfig.onCheatsChanged = config.onCheatsChanged;
    // If the config has defaults or levels, it's an env-aware manifest
    if (envConfig.defaults || envConfig.levels) {
      _envInst._loadFromCart({ env: envConfig });
    }
  }

  // Data (entities, items, ui, gameplay) — load after i18n
  if (_dataInst) {
    const hasData = config.entities || config.items || config.ui || config.gameplay;
    if (hasData) {
      _dataInst._load(config, _i18nInst ? _i18nInst.t : k => k);
    }
  }

  // Assets — preload after everything else is wired
  if (config.assets && _assetInst) {
    // Fire and forget — cart can await preloadAssets() in init() if needed
    _assetInst._load(config.assets, _cartBasePath);
  }
}

/** Reset all subsystems. Called on cart unload. */
function _resetAll() {
  _meta = null;
  _cartBasePath = '';
  if (_envInst) _envInst._reset();
  if (_i18nInst) _i18nInst._reset();
  if (_dataInst) _dataInst._reset();
  if (_assetInst) _assetInst._reset();
}

// ── Module export ────────────────────────────────────────────

export function manifestApi() {
  // Create subsystem instances
  _envInst = envApi();
  _i18nInst = i18nApi();
  _dataInst = dataApi();
  _assetInst = assetLoaderApi();

  return {
    exposeTo(target) {
      // Expose all subsystem APIs
      _envInst.exposeTo(target);
      _i18nInst.exposeTo(target);
      _dataInst.exposeTo(target);
      _assetInst.exposeTo(target);
      // Manifest-level API
      target.getMeta = getMeta;
    },
    _reset: _resetAll,
    async _loadFromCart(mod, cartPath) {
      // Try fetching meta.json from the cart directory (convention over configuration)
      const basePath = cartPath ? cartPath.replace(/\/[^/]+$/, '') : '';
      if (basePath) {
        try {
          const metaUrl = basePath + '/meta.json?t=' + Date.now();
          const res = await fetch(metaUrl);
          if (res.ok) {
            const meta = await res.json();
            logger.info('📄 Loaded meta.json from', basePath);
            _loadManifest(meta, cartPath);
            return; // meta.json is the primary source — skip export const env
          }
        } catch {
          // No meta.json or fetch failed — fall through to export const env
        }
      }

      // Fallback: check if cart exports env (legacy inline manifest)
      if (mod.env) {
        _loadManifest(mod.env, cartPath);
      }
    },
  };
}
