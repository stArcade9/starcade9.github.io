// runtime/data.js — Game data query system
// Provides typed accessors for entities (enemies, NPCs, bosses), items,
// UI config, and gameplay config declared in the cart manifest.
// All getters return copies with i18n names resolved via t().
import { logger } from './logger.js';

// ── State ────────────────────────────────────────────────────
let _enemies = {}; // { id: { ...template } }
let _npcs = {};
let _bosses = {};
let _items = {};
let _uiConfig = null;
let _gameplay = null;
let _tFunc = k => k; // i18n t() reference, injected at init

// ── Helpers ──────────────────────────────────────────────────

/** Parse hex color string to number. Supports "#RRGGBB", "0xRRGGBB". */
function parseColor(c) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') return parseInt(c.replace(/^#|^0x/i, ''), 16) || 0;
  return 0;
}

/** Deep-copy an object and resolve any i18n key fields via t(). */
function resolve(obj) {
  if (!obj) return null;
  const copy = JSON.parse(JSON.stringify(obj));
  // Resolve known name/description fields
  if (copy.name && typeof copy.name === 'string') copy.name = _tFunc(copy.name);
  if (copy.description && typeof copy.description === 'string')
    copy.description = _tFunc(copy.description);
  if (copy.dialog && typeof copy.dialog === 'string') copy.dialog = _tFunc(copy.dialog);
  // Parse color fields from hex strings
  if (typeof copy.color === 'string') copy.color = parseColor(copy.color);
  return copy;
}

/** Deep-copy a plain object. */
function clone(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : null;
}

// ── Entity API ───────────────────────────────────────────────

/** getEnemy(id) — Returns enemy template with i18n-resolved name. */
function getEnemy(id) {
  return resolve(_enemies[id]) || null;
}

/** getNPC(id) — Returns NPC template with i18n-resolved name. */
function getNPC(id) {
  return resolve(_npcs[id]) || null;
}

/** getBoss(id) — Returns boss template with i18n-resolved name. */
function getBoss(id) {
  return resolve(_bosses[id]) || null;
}

/** getEnemies() — Returns all enemy templates as { id: template } map. */
function getEnemies() {
  const out = {};
  for (const [id, tmpl] of Object.entries(_enemies)) {
    out[id] = resolve(tmpl);
  }
  return out;
}

/** getEnemiesByTier(tier) — Returns enemy templates matching a difficulty tier. */
function getEnemiesByTier(tier) {
  const out = {};
  for (const [id, tmpl] of Object.entries(_enemies)) {
    if (tmpl.tier === tier) out[id] = resolve(tmpl);
  }
  return out;
}

/** getNPCs() — Returns all NPC templates. */
function getNPCs() {
  const out = {};
  for (const [id, tmpl] of Object.entries(_npcs)) {
    out[id] = resolve(tmpl);
  }
  return out;
}

/** getBosses() — Returns all boss templates. */
function getBosses() {
  const out = {};
  for (const [id, tmpl] of Object.entries(_bosses)) {
    out[id] = resolve(tmpl);
  }
  return out;
}

// ── Item API ─────────────────────────────────────────────────

/** getItem(id) — Returns item template with i18n-resolved name/description. */
function getItem(id) {
  return resolve(_items[id]) || null;
}

/** getItems() — Returns all item templates. */
function getItems() {
  const out = {};
  for (const [id, tmpl] of Object.entries(_items)) {
    out[id] = resolve(tmpl);
  }
  return out;
}

/** getItemsByType(type) — Returns items matching a type ('consumable','weapon', etc.). */
function getItemsByType(type) {
  const out = {};
  for (const [id, tmpl] of Object.entries(_items)) {
    if (tmpl.type === type) out[id] = resolve(tmpl);
  }
  return out;
}

/** getItemsByRarity(rarity) — Returns items matching a rarity tier. */
function getItemsByRarity(rarity) {
  const out = {};
  for (const [id, tmpl] of Object.entries(_items)) {
    if (tmpl.rarity === rarity) out[id] = resolve(tmpl);
  }
  return out;
}

// ── Config API ───────────────────────────────────────────────

/** getUIConfig() — Returns the UI config section (copy). */
function getUIConfig() {
  return clone(_uiConfig);
}

/** getGameplay() — Returns the gameplay config section (copy). */
function getGameplay() {
  return clone(_gameplay);
}

// ── Internal ─────────────────────────────────────────────────

/** Load data sections from manifest. Called by manifest.js. */
function _loadData(config, tFunc) {
  if (tFunc) _tFunc = tFunc;

  // Entities
  const ent = config.entities;
  if (ent) {
    _enemies = ent.enemies ? { ...ent.enemies } : {};
    _npcs = ent.npcs ? { ...ent.npcs } : {};
    _bosses = ent.bosses ? { ...ent.bosses } : {};
    const total =
      Object.keys(_enemies).length + Object.keys(_npcs).length + Object.keys(_bosses).length;
    logger.info(
      `📦 Data loaded: ${total} entities (${Object.keys(_enemies).length} enemies, ${Object.keys(_npcs).length} NPCs, ${Object.keys(_bosses).length} bosses)`
    );
  }

  // Items
  if (config.items) {
    _items = { ...config.items };
    logger.info(`📦 Data loaded: ${Object.keys(_items).length} items`);
  }

  // UI config
  if (config.ui) {
    _uiConfig = clone(config.ui);
  }

  // Gameplay
  if (config.gameplay) {
    _gameplay = clone(config.gameplay);
  }
}

/** Reset all state. Called on cart unload. */
function _resetData() {
  _enemies = {};
  _npcs = {};
  _bosses = {};
  _items = {};
  _uiConfig = null;
  _gameplay = null;
}

// ── Module export ────────────────────────────────────────────

export function dataApi() {
  return {
    exposeTo(target) {
      target.getEnemy = getEnemy;
      target.getNPC = getNPC;
      target.getBoss = getBoss;
      target.getEnemies = getEnemies;
      target.getEnemiesByTier = getEnemiesByTier;
      target.getNPCs = getNPCs;
      target.getBosses = getBosses;
      target.getItem = getItem;
      target.getItems = getItems;
      target.getItemsByType = getItemsByType;
      target.getItemsByRarity = getItemsByRarity;
      target.getUIConfig = getUIConfig;
      target.getGameplay = getGameplay;
    },
    _load: _loadData,
    _reset: _resetData,
  };
}
