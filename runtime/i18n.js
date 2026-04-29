// runtime/i18n.js — Internationalization / text lookup system
// Carts define text strings in env.text; this module provides t() for lookup.
// Supports locale switching, {param} interpolation, and dot-notation keys.
import { logger } from './logger.js';

// ── State ────────────────────────────────────────────────────
let _defaultLocale = 'en';
let _currentLocale = 'en';
let _strings = {}; // default locale strings  { key: value }
let _locales = {}; // { locale: { key: value } }

// ── Core API ─────────────────────────────────────────────────

/**
 * t(key, params) — Translate a string key.
 * Fallback chain: currentLocale → defaultLocale → key itself.
 * Supports {param} interpolation: t('hello', { name: 'World' }) → 'Hello, World!'
 */
function t(key, params) {
  if (key == null) return '';
  const k = String(key);

  // Try current locale first (if different from default)
  let str;
  if (_currentLocale !== _defaultLocale && _locales[_currentLocale]) {
    str = _locales[_currentLocale][k];
  }
  // Fall back to default strings
  if (str === undefined) {
    str = _strings[k];
  }
  // Fall back to key itself
  if (str === undefined) {
    return k;
  }

  // Interpolation: replace {paramName} with params[paramName]
  if (params && typeof params === 'object') {
    return String(str).replace(/\{(\w+)\}/g, (_, p) =>
      params[p] !== undefined ? String(params[p]) : `{${p}}`
    );
  }
  return String(str);
}

/** setLocale(locale) — Switch the active locale. */
function setLocale(locale) {
  if (!locale) return;
  _currentLocale = String(locale);
  logger.info(`🌐 Locale set to "${_currentLocale}"`);
}

/** getLocale() — Returns the current locale string. */
function getLocale() {
  return _currentLocale;
}

/** getAvailableLocales() — Returns array of configured locale codes. */
function getAvailableLocales() {
  const set = new Set([_defaultLocale, ...Object.keys(_locales)]);
  return [...set];
}

/** addStrings(strings, locale) — Merge additional strings at runtime. */
function addStrings(strings, locale) {
  if (!strings || typeof strings !== 'object') return;
  if (locale && locale !== _defaultLocale) {
    _locales[locale] = { ...(_locales[locale] || {}), ...strings };
  } else {
    _strings = { ..._strings, ...strings };
  }
}

// ── Internal ─────────────────────────────────────────────────

/** Load text config from manifest. Called by manifest.js. */
function _loadText(textConfig) {
  if (!textConfig) return;
  _defaultLocale = textConfig.defaultLocale || 'en';
  _currentLocale = _defaultLocale;
  _strings = { ...(textConfig.strings || {}) };
  _locales = {};
  if (textConfig.locales) {
    for (const [loc, strs] of Object.entries(textConfig.locales)) {
      _locales[loc] = { ...strs };
    }
  }
  const count = Object.keys(_strings).length;
  const locCount = Object.keys(_locales).length;
  logger.info(`🌐 i18n loaded: ${count} strings, ${locCount} extra locales`);
}

/** Reset all state. Called on cart unload. */
function _resetI18n() {
  _defaultLocale = 'en';
  _currentLocale = 'en';
  _strings = {};
  _locales = {};
}

// ── Module export ────────────────────────────────────────────

export function i18nApi() {
  return {
    exposeTo(target) {
      target.t = t;
      target.setLocale = setLocale;
      target.getLocale = getLocale;
      target.getAvailableLocales = getAvailableLocales;
      target.addStrings = addStrings;
    },
    _load: _loadText,
    _reset: _resetI18n,
    // Expose t for internal use by data.js
    t,
  };
}
