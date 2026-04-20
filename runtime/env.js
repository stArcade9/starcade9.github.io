// runtime/env.js — Environment configuration system
// Carts can export `env` or place `env.json` alongside code.js
// Supports per-level presets with deep merge from defaults.
import { logger } from './logger.js';

// ── Active state ────────────────────────────────────────────────
let _defaults = null; // merged defaults from cart env
let _levels = {}; // level name → overrides
let _currentLevel = null; // current level name
let _applied = null; // the resolved config currently applied
let _cheats = {}; // cheat flags (noclip, godMode, etc.)
let _cheatsEnabled = false;
let _overlayVisible = false;
let _overlayEl = null;
let _onCheatsChanged = null; // cart-provided callback
let _rawMeta = null; // raw meta.json contents for display

// ── Built-in cheats (always available) ──────────────────────────
const _builtinCheats = {
  godMode: false, // invincibility — cart reads via getCheats().godMode
};

// ── Schema defaults ─────────────────────────────────────────────
const SCHEMA_DEFAULTS = {
  sky: {
    type: 'none', // 'none' | 'solid' | 'gradient' | 'space' | 'images'
    color: 0x000000,
    topColor: 0x1a6aa8,
    bottomColor: 0xf48c60,
    images: null, // [+X, -X, +Y, -Y, +Z, -Z] urls
    spaceOptions: null, // { starCount, starSize, nebulae, nebulaColor }
    autoAnimate: false,
    animateSpeed: 1,
  },
  fog: {
    enabled: true,
    color: 0x87ceeb,
    near: 50,
    far: 200,
  },
  camera: {
    position: [0, 5, 10],
    target: [0, 0, 0],
    fov: null, // null = keep engine default (75)
  },
  lighting: {
    ambient: null, // null = keep engine default
    directional: null, // { direction: [x,y,z], color, intensity }
    points: [], // [{ color, intensity, distance, position: [x,y,z] }]
  },
  effects: {
    bloom: null, // null=off, or { strength, radius, threshold }
    vignette: null, // null=off, or { darkness, offset }
    chromaticAberration: null, // null=off, or { amount }
    glitch: null, // null=off, or { intensity }
    fxaa: false,
    n64Mode: false,
    psxMode: false,
    lowPolyMode: false,
  },
  voxel: null, // null=not a voxel game, or { renderDistance, seed, seaLevel, textures, ... }
  cheats: {
    enabled: false, // whether cheat overlay can be opened
    items: {}, // { noclip: false, godMode: false, speedMultiplier: 1, ... }
  },
};

// ── Helpers ──────────────────────────────────────────────────────

/** Escape HTML entities for safe rendering in dev console */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Deep merge b into a (a wins for non-objects, b fills gaps) */
function deepMerge(base, override) {
  if (override === null || override === undefined) return base;
  if (base === null || base === undefined) return override;
  if (typeof base !== 'object' || typeof override !== 'object') return override;
  if (Array.isArray(override)) return override; // arrays replace, don't merge
  const out = { ...base };
  for (const k of Object.keys(override)) {
    out[k] = deepMerge(out[k], override[k]);
  }
  return out;
}

/** Resolve a level config by merging level overrides onto defaults */
function resolveLevel(levelName) {
  if (!_defaults) return null;
  if (!levelName || !_levels[levelName]) return { ..._defaults };
  return deepMerge(_defaults, _levels[levelName]);
}

/** Parse hex color: supports 0xRRGGBB, "#RRGGBB", "RRGGBB" */
function parseColor(c) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') {
    const hex = c.replace(/^#/, '');
    return parseInt(hex, 16);
  }
  return 0x000000;
}

// ── Apply environment to engine ─────────────────────────────────

function applyEnv(config) {
  if (!config) return;
  _applied = config;

  // Sky
  const sky = config.sky;
  if (sky) {
    if (typeof globalThis.clearSkybox === 'function') globalThis.clearSkybox();
    switch (sky.type) {
      case 'solid':
        if (typeof globalThis.createSolidSkybox === 'function')
          globalThis.createSolidSkybox(parseColor(sky.color));
        break;
      case 'gradient':
        if (typeof globalThis.createGradientSkybox === 'function')
          globalThis.createGradientSkybox(parseColor(sky.topColor), parseColor(sky.bottomColor));
        break;
      case 'space':
        if (typeof globalThis.createSpaceSkybox === 'function')
          globalThis.createSpaceSkybox(sky.spaceOptions || {});
        break;
      case 'images':
        if (sky.images && typeof globalThis.createImageSkybox === 'function')
          globalThis.createImageSkybox(sky.images);
        break;
      // 'none' — leave cleared
    }
    if (sky.autoAnimate && typeof globalThis.enableSkyboxAutoAnimate === 'function') {
      globalThis.enableSkyboxAutoAnimate(sky.animateSpeed ?? 1);
    }
  }

  // Fog
  const fog = config.fog;
  if (fog) {
    if (fog.enabled === false) {
      if (typeof globalThis.clearFog === 'function') globalThis.clearFog();
    } else if (typeof globalThis.setFog === 'function') {
      globalThis.setFog(parseColor(fog.color), fog.near ?? 50, fog.far ?? 200);
    }
  }

  // Camera
  const cam = config.camera;
  if (cam) {
    if (cam.position && typeof globalThis.setCameraPosition === 'function') {
      const p = cam.position;
      globalThis.setCameraPosition(p[0] ?? 0, p[1] ?? 5, p[2] ?? 10);
    }
    if (cam.target && typeof globalThis.setCameraTarget === 'function') {
      const t = cam.target;
      globalThis.setCameraTarget(t[0] ?? 0, t[1] ?? 0, t[2] ?? 0);
    }
    if (cam.fov != null && typeof globalThis.setCameraFOV === 'function') {
      globalThis.setCameraFOV(cam.fov);
    }
  }

  // Lighting
  const light = config.lighting;
  if (light) {
    if (light.ambient != null && typeof globalThis.setAmbientLight === 'function') {
      globalThis.setAmbientLight(parseColor(light.ambient));
    }
    if (light.directional && typeof globalThis.setDirectionalLight === 'function') {
      const d = light.directional;
      globalThis.setDirectionalLight(
        d.direction || [1, 2, 1],
        parseColor(d.color ?? 0xffffff),
        d.intensity ?? 1
      );
    }
    if (light.points && typeof globalThis.createPointLight === 'function') {
      for (const pt of light.points) {
        const pos = pt.position || [0, 0, 0];
        globalThis.createPointLight(
          parseColor(pt.color ?? 0xffffff),
          pt.intensity ?? 2,
          pt.distance ?? 20,
          pos[0],
          pos[1],
          pos[2]
        );
      }
    }
  }

  // Effects
  const fx = config.effects;
  if (fx) {
    if (fx.bloom && typeof globalThis.enableBloom === 'function') {
      const b = typeof fx.bloom === 'object' ? fx.bloom : {};
      globalThis.enableBloom(b.strength, b.radius, b.threshold);
    }
    if (fx.vignette && typeof globalThis.enableVignette === 'function') {
      const v = typeof fx.vignette === 'object' ? fx.vignette : {};
      globalThis.enableVignette(v.darkness, v.offset);
    }
    if (fx.chromaticAberration && typeof globalThis.enableChromaticAberration === 'function') {
      const ca = typeof fx.chromaticAberration === 'object' ? fx.chromaticAberration : {};
      globalThis.enableChromaticAberration(ca.amount);
    }
    if (fx.glitch && typeof globalThis.enableGlitch === 'function') {
      const gl = typeof fx.glitch === 'object' ? fx.glitch : {};
      globalThis.enableGlitch(gl.intensity);
    }
    if (fx.fxaa && typeof globalThis.enableFXAA === 'function') globalThis.enableFXAA();
    if (fx.n64Mode && typeof globalThis.enableN64Mode === 'function') globalThis.enableN64Mode();
    if (fx.psxMode && typeof globalThis.enablePSXMode === 'function') globalThis.enablePSXMode();
    if (fx.lowPolyMode && typeof globalThis.enableLowPolyMode === 'function')
      globalThis.enableLowPolyMode();
  }

  // Voxel
  const vox = config.voxel;
  if (vox && typeof globalThis.configureVoxelWorld === 'function') {
    globalThis.configureVoxelWorld(vox);
    if (vox.textures != null && typeof globalThis.enableVoxelTextures === 'function') {
      globalThis.enableVoxelTextures(!!vox.textures);
    }
  }

  // Cheats — store flags but don't apply (cart reads them)
  const ch = config.cheats;
  if (ch) {
    _cheatsEnabled = !!ch.enabled;
    _cheats = { ...(ch.items || {}) };
  }
  // Merge built-in cheats (don't override cart-defined ones)
  for (const [k, v] of Object.entries(_builtinCheats)) {
    if (!(k in _cheats)) _cheats[k] = v;
  }
}

// ── Cheat overlay ───────────────────────────────────────────────

function buildOverlay() {
  if (_overlayEl) return;

  const el = document.createElement('div');
  el.id = 'nova64-cheat-overlay';
  el.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.85); z-index: 99999;
    display: none; font-family: 'VT323', 'Courier New', monospace;
    color: #0ff; padding: 40px; box-sizing: border-box;
    overflow-y: auto;
  `;

  el.innerHTML = `
    <div style="max-width:600px; margin:0 auto;">
      <h2 style="color:#ff0;font-size:28px;margin:0 0 8px">⚙️ NOVA64 DEV CONSOLE</h2>
      <p style="color:#888;font-size:14px;margin:0 0 20px">Press <kbd style="color:#ff0">Shift+X</kbd> to close</p>
      <div id="nova64-cheat-sections"></div>
      <div id="nova64-env-info" style="margin-top:24px;border-top:1px solid #333;padding-top:16px"></div>
      <div id="nova64-manifest-info" style="margin-top:16px;border-top:1px solid #333;padding-top:16px"></div>
    </div>
  `;
  document.body.appendChild(el);
  _overlayEl = el;
}

function renderOverlay() {
  if (!_overlayEl) buildOverlay();
  const sections = _overlayEl.querySelector('#nova64-cheat-sections');
  const envInfo = _overlayEl.querySelector('#nova64-env-info');

  // Cheat toggles — ensure built-in cheats are always present
  for (const [k, v] of Object.entries(_builtinCheats)) {
    if (!(k in _cheats)) _cheats[k] = v;
  }
  let html = '';
  const keys = Object.keys(_cheats);
  if (keys.length > 0) {
    html += '<h3 style="color:#0f0;font-size:20px;margin:0 0 12px">🎮 CHEATS</h3>';
    for (const k of keys) {
      const val = _cheats[k];
      const id = `cheat-${k}`;
      if (typeof val === 'boolean') {
        html += `
          <label style="display:block;margin:6px 0;font-size:16px;cursor:pointer">
            <input type="checkbox" id="${id}" ${val ? 'checked' : ''} style="margin-right:8px;cursor:pointer">
            ${k}
          </label>`;
      } else if (typeof val === 'number') {
        html += `
          <div style="display:flex;align-items:center;margin:6px 0;font-size:16px;gap:8px">
            <span style="min-width:140px">${k}:</span>
            <input type="number" id="${id}" value="${val}" step="0.1" style="
              width:80px;background:#111;color:#0ff;border:1px solid #0ff;
              padding:4px 8px;font-family:inherit;font-size:14px">
          </div>`;
      } else if (typeof val === 'string') {
        html += `
          <div style="display:flex;align-items:center;margin:6px 0;font-size:16px;gap:8px">
            <span style="min-width:140px">${k}:</span>
            <input type="text" id="${id}" value="${val}" style="
              width:200px;background:#111;color:#0ff;border:1px solid #0ff;
              padding:4px 8px;font-family:inherit;font-size:14px">
          </div>`;
      }
    }
  } else {
    html +=
      '<p style="color:#666;font-size:14px">No cheats defined in this cart\'s env config.</p>';
  }
  sections.innerHTML = html;

  // Bind change listeners
  for (const k of keys) {
    const id = `cheat-${k}`;
    const input = _overlayEl.querySelector(`#${id}`);
    if (!input) continue;
    if (input.type === 'checkbox') {
      input.onchange = () => {
        _cheats[k] = input.checked;
        if (_onCheatsChanged) _onCheatsChanged({ ..._cheats });
      };
    } else if (input.type === 'number') {
      input.onchange = () => {
        _cheats[k] = parseFloat(input.value) || 0;
        if (_onCheatsChanged) _onCheatsChanged({ ..._cheats });
      };
    } else {
      input.onchange = () => {
        _cheats[k] = input.value;
        if (_onCheatsChanged) _onCheatsChanged({ ..._cheats });
      };
    }
  }

  // Environment info
  let info = '<h3 style="color:#0f0;font-size:20px;margin:0 0 12px">🌍 ENVIRONMENT</h3>';
  if (_applied) {
    if (_currentLevel)
      info += `<div style="margin:4px 0">Level: <span style="color:#ff0">${_currentLevel}</span></div>`;
    if (_applied.sky)
      info += `<div style="margin:4px 0">Sky: <span style="color:#ff0">${_applied.sky.type || 'none'}</span></div>`;
    if (_applied.fog)
      info += `<div style="margin:4px 0">Fog: <span style="color:#ff0">${_applied.fog.enabled !== false ? `color=0x${parseColor(_applied.fog.color).toString(16).padStart(6, '0')} near=${_applied.fog.near} far=${_applied.fog.far}` : 'off'}</span></div>`;
    if (_applied.camera)
      info += `<div style="margin:4px 0">Camera: <span style="color:#ff0">pos=[${(_applied.camera.position || []).join(',')}] fov=${_applied.camera.fov ?? 'default'}</span></div>`;
    if (_applied.voxel)
      info += `<div style="margin:4px 0">Voxel: <span style="color:#ff0">rd=${_applied.voxel.renderDistance ?? 4} seed=${_applied.voxel.seed ?? 'random'}</span></div>`;
  } else {
    info += '<div style="color:#666">No env config loaded.</div>';
  }
  const levels = Object.keys(_levels);
  if (levels.length > 0) {
    info += '<div style="margin:12px 0 4px;color:#0f0">Levels:</div>';
    for (const l of levels) {
      const isCurrent = l === _currentLevel;
      info += `<button data-level="${l}" style="
        display:inline-block;margin:2px 4px;padding:4px 12px;
        background:${isCurrent ? '#0ff' : '#222'};color:${isCurrent ? '#000' : '#0ff'};
        border:1px solid #0ff;cursor:pointer;font-family:inherit;font-size:14px
      ">${l}</button>`;
    }
  }
  envInfo.innerHTML = info;

  // Bind level buttons
  for (const btn of _overlayEl.querySelectorAll('[data-level]')) {
    btn.onclick = () => {
      const name = btn.getAttribute('data-level');
      setLevel(name);
      renderOverlay();
    };
  }

  // ── Manifest info (entities, items, i18n, assets) ──
  const manifestEl = _overlayEl.querySelector('#nova64-manifest-info');
  let mhtml = '';

  // i18n info
  if (typeof globalThis.getLocale === 'function') {
    const locale = globalThis.getLocale();
    const locales =
      typeof globalThis.getAvailableLocales === 'function' ? globalThis.getAvailableLocales() : [];
    mhtml += '<h3 style="color:#0f0;font-size:20px;margin:0 0 12px">🌐 i18n</h3>';
    mhtml += `<div style="margin:4px 0">Locale: <span style="color:#ff0">${locale}</span></div>`;
    if (locales.length > 1) {
      mhtml += '<div style="margin:4px 0">Available: ';
      for (const loc of locales) {
        const isCurr = loc === locale;
        mhtml += `<button data-locale="${loc}" style="
          display:inline-block;margin:2px 4px;padding:2px 8px;
          background:${isCurr ? '#0ff' : '#222'};color:${isCurr ? '#000' : '#0ff'};
          border:1px solid #0ff;cursor:pointer;font-family:inherit;font-size:12px
        ">${loc}</button>`;
      }
      mhtml += '</div>';
    }
  }

  // Entity summary
  if (typeof globalThis.getEnemies === 'function') {
    const enemies = globalThis.getEnemies();
    const eCount = Object.keys(enemies).length;
    if (eCount > 0) {
      mhtml += '<h3 style="color:#0f0;font-size:20px;margin:12px 0 8px">👾 ENTITIES</h3>';
      mhtml += `<div style="margin:4px 0">Enemies: <span style="color:#ff0">${eCount}</span></div>`;
      for (const [id, e] of Object.entries(enemies)) {
        mhtml += `<div style="margin:2px 0;color:#888;font-size:13px">  ${id}: ${e.name || id} (hp=${e.hp ?? '?'} atk=${e.atk ?? '?'} tier=${e.tier ?? '?'})</div>`;
      }
    }
    const bosses = typeof globalThis.getBosses === 'function' ? globalThis.getBosses() : {};
    const bCount = Object.keys(bosses).length;
    if (bCount > 0) {
      mhtml += `<div style="margin:4px 0">Bosses: <span style="color:#ff0">${bCount}</span></div>`;
      for (const [id, b] of Object.entries(bosses)) {
        mhtml += `<div style="margin:2px 0;color:#888;font-size:13px">  ${id}: ${b.name || id} (hp=${b.hp ?? '?'})</div>`;
      }
    }
    const npcs = typeof globalThis.getNPCs === 'function' ? globalThis.getNPCs() : {};
    const nCount = Object.keys(npcs).length;
    if (nCount > 0) {
      mhtml += `<div style="margin:4px 0">NPCs: <span style="color:#ff0">${nCount}</span></div>`;
    }
  }

  // Item summary
  if (typeof globalThis.getItems === 'function') {
    const items = globalThis.getItems();
    const iCount = Object.keys(items).length;
    if (iCount > 0) {
      mhtml += '<h3 style="color:#0f0;font-size:20px;margin:12px 0 8px">🎒 ITEMS</h3>';
      mhtml += `<div style="margin:4px 0">Total: <span style="color:#ff0">${iCount}</span></div>`;
      for (const [id, item] of Object.entries(items)) {
        mhtml += `<div style="margin:2px 0;color:#888;font-size:13px">  ${id}: ${item.name || id} [${item.type || '?'}] ${item.rarity ? `(${item.rarity})` : ''}</div>`;
      }
    }
  }

  // Asset status
  if (typeof globalThis.getAssetStatus === 'function') {
    const status = globalThis.getAssetStatus();
    if (status.total > 0) {
      mhtml += '<h3 style="color:#0f0;font-size:20px;margin:12px 0 8px">📂 ASSETS</h3>';
      mhtml += `<div style="margin:4px 0">Loaded: <span style="color:#ff0">${status.loaded}/${status.total} (${status.percent}%)</span></div>`;
      for (const [name, detail] of Object.entries(status.details)) {
        const color =
          detail.status === 'loaded' ? '#0f0' : detail.status === 'error' ? '#f44' : '#ff0';
        mhtml += `<div style="margin:2px 0;color:#888;font-size:13px">  ${name}: <span style="color:${color}">${detail.status}</span> [${detail.type}]</div>`;
      }
    }
  }

  // Meta
  if (typeof globalThis.getMeta === 'function') {
    const meta = globalThis.getMeta();
    if (meta) {
      mhtml += '<h3 style="color:#0f0;font-size:20px;margin:12px 0 8px">📋 CART META</h3>';
      if (meta.name)
        mhtml += `<div style="margin:4px 0">${meta.name} v${meta.version || '?'}</div>`;
      if (meta.author) mhtml += `<div style="margin:4px 0;color:#888">by ${meta.author}</div>`;
      if (meta.description)
        mhtml += `<div style="margin:4px 0;color:#888;font-size:13px">${meta.description}</div>`;
    }
  }

  // Raw meta.json — editable live
  if (_rawMeta) {
    mhtml +=
      '<h3 style="color:#0f0;font-size:20px;margin:12px 0 8px">📄 meta.json <span style="font-size:12px;color:#888">(editable)</span></h3>';
    mhtml += `<textarea id="nova64-meta-editor" style="width:100%;min-height:200px;max-height:400px;background:#111;padding:8px;border:1px solid #333;border-radius:4px;font:12px monospace;color:#0ff;resize:vertical;white-space:pre;tab-size:2">${escapeHtml(JSON.stringify(_rawMeta, null, 2))}</textarea>`;
    mhtml += '<div style="margin:6px 0;display:flex;gap:8px;align-items:center">';
    mhtml +=
      '<button id="nova64-meta-apply" style="padding:4px 16px;background:#0a0;color:#000;border:1px solid #0f0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:bold;border-radius:3px">Apply</button>';
    mhtml +=
      '<button id="nova64-meta-reset" style="padding:4px 12px;background:#222;color:#f44;border:1px solid #f44;cursor:pointer;font-family:inherit;font-size:13px;border-radius:3px">Reset</button>';
    mhtml += '<span id="nova64-meta-status" style="color:#888;font-size:12px"></span>';
    mhtml += '</div>';
  }

  manifestEl.innerHTML = mhtml;

  // Bind locale buttons
  for (const btn of _overlayEl.querySelectorAll('[data-locale]')) {
    btn.onclick = () => {
      const loc = btn.getAttribute('data-locale');
      if (typeof globalThis.setLocale === 'function') globalThis.setLocale(loc);
      renderOverlay();
    };
  }

  // Bind meta.json editor
  const metaApply = _overlayEl.querySelector('#nova64-meta-apply');
  const metaReset = _overlayEl.querySelector('#nova64-meta-reset');
  const metaEditor = _overlayEl.querySelector('#nova64-meta-editor');
  const metaStatus = _overlayEl.querySelector('#nova64-meta-status');
  if (metaApply && metaEditor) {
    metaApply.onclick = () => {
      try {
        const parsed = JSON.parse(metaEditor.value);
        // Apply env defaults from the edited meta
        if (parsed.defaults) {
          const merged = deepMerge(SCHEMA_DEFAULTS, parsed.defaults);
          applyEnv(merged);
        }
        _rawMeta = parsed;
        if (metaStatus) {
          metaStatus.style.color = '#0f0';
          metaStatus.textContent = '✓ Applied';
        }
      } catch (err) {
        if (metaStatus) {
          metaStatus.style.color = '#f44';
          metaStatus.textContent = '✗ ' + err.message;
        }
      }
    };
  }
  if (metaReset && metaEditor && _rawMeta) {
    metaReset.onclick = () => {
      metaEditor.value = JSON.stringify(_rawMeta, null, 2);
      if (metaStatus) {
        metaStatus.style.color = '#888';
        metaStatus.textContent = 'Reset to last saved';
      }
    };
  }

  _overlayEl.style.display = 'block';
}

function hideOverlay() {
  if (_overlayEl) _overlayEl.style.display = 'none';
  _overlayVisible = false;
}

function toggleOverlay() {
  // Dev console is always accessible with Shift+X (no cheatsEnabled gate)
  if (_overlayVisible) {
    hideOverlay();
  } else {
    renderOverlay();
    _overlayVisible = true;
  }
}

// ── Public API ──────────────────────────────────────────────────

/**
 * loadEnv(config) — Load an environment configuration.
 * Called by the console when a cart exports `env`, or by the cart itself.
 *
 * config shape:
 * {
 *   defaults: { sky, fog, camera, lighting, effects, voxel, cheats },
 *   levels: { "level-1": { ...overrides }, "level-2": { ... } }
 * }
 */
function loadEnv(config) {
  if (!config) return;
  _defaults = deepMerge(SCHEMA_DEFAULTS, config.defaults || config);
  _levels = config.levels || {};
  _currentLevel = null;
  _cheats = {};
  _cheatsEnabled = false;
  _onCheatsChanged = config.onCheatsChanged || null;
  applyEnv(_defaults);
  logger.info('🌍 Environment loaded', _currentLevel ? `level=${_currentLevel}` : '(defaults)');
}

/**
 * setLevel(name) — Switch to a named level preset.
 * Merges level overrides onto defaults and re-applies.
 */
function setLevel(name) {
  const resolved = resolveLevel(name);
  if (!resolved) {
    logger.warn(`⚠️ Level "${name}" not found in env config`);
    return;
  }
  _currentLevel = name;
  applyEnv(resolved);
  logger.info(`🌍 Level switched to "${name}"`);
}

/** getEnv() — Returns the currently applied environment config (read-only copy). */
function getEnv() {
  return _applied ? JSON.parse(JSON.stringify(_applied)) : null;
}

/** getLevel() — Returns current level name or null. */
function getLevel() {
  return _currentLevel;
}

/** getLevels() — Returns array of available level names. */
function getLevels() {
  return Object.keys(_levels);
}

/** getCheats() — Returns a copy of current cheat flags. */
function getCheats() {
  return { _enabled: _cheatsEnabled, ..._cheats };
}

/** setCheat(key, value) — Set a single cheat flag programmatically. */
function setCheat(key, value) {
  _cheats[key] = value;
  if (_onCheatsChanged) _onCheatsChanged({ ..._cheats });
}

/** resetEnv() — Clear env state (called on cart unload). */
function resetEnv() {
  _defaults = null;
  _levels = {};
  _currentLevel = null;
  _applied = null;
  _cheats = {};
  _cheatsEnabled = false;
  _onCheatsChanged = null;
  _rawMeta = null;
  hideOverlay();
}

// ── Keyboard listener for Shift+X ───────────────────────────────
function initKeyListener() {
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyX' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Shift+X toggles dev console — always available
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      toggleOverlay();
    }
  });
}

// ── Module export ───────────────────────────────────────────────

export function envApi() {
  if (typeof window !== 'undefined') initKeyListener();

  return {
    exposeTo(target) {
      target.loadEnv = loadEnv;
      target.setLevel = setLevel;
      target.getEnv = getEnv;
      target.getLevel = getLevel;
      target.getLevels = getLevels;
      target.getCheats = getCheats;
      target.setCheat = setCheat;
    },
    _reset: resetEnv,
    /** Store raw meta.json for display in dev console */
    _setRawMeta(meta) {
      _rawMeta = meta;
    },
    _loadFromCart(mod) {
      // Called by console.js after import — check if cart exports env
      if (mod.env) {
        loadEnv(mod.env);
      }
    },
  };
}
