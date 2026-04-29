// runtime/canvas-ui.js
// NML (Nova Markup Language) — XML-driven Canvas2D GUI system for Nova64.
//
// Usage (inside a cart):
//   let ui;
//   export function init() {
//     ui = parseCanvasUI(`<ui><text x="10" y="10" color="#fff" size="20">Hello!</text></ui>`);
//   }
//   export function update(dt) { updateCanvasUI(ui, dt); }
//   export function draw()     { renderCanvasUI(ui, { score }, handlers); }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const NML_W = 640;
const NML_H = 360;

// ─── NML PARSER ──────────────────────────────────────────────────────────────
// Parses a subset of XML into { tag, attrs:{}, children:[], text:'' } nodes.

function parseNML(xmlString) {
  const str = xmlString.trim();
  let pos = 0;

  function skipWS() {
    while (pos < str.length && /\s/.test(str[pos])) pos++;
  }

  function skipComment() {
    if (str.startsWith('<!--', pos)) {
      const end = str.indexOf('-->', pos + 4);
      pos = end >= 0 ? end + 3 : str.length;
      return true;
    }
    return false;
  }

  function readAttrValue() {
    if (str[pos] === '"' || str[pos] === "'") {
      const q = str[pos++];
      let v = '';
      while (pos < str.length && str[pos] !== q) v += str[pos++];
      pos++; // closing quote
      return v;
    }
    let v = '';
    while (pos < str.length && !/[\s>/]/.test(str[pos])) v += str[pos++];
    return v;
  }

  function readAttrs() {
    const attrs = {};
    skipWS();
    while (pos < str.length && str[pos] !== '>' && !(str[pos] === '/' && str[pos + 1] === '>')) {
      if (/[a-zA-Z_:]/.test(str[pos])) {
        let name = '';
        while (pos < str.length && /[a-zA-Z0-9_:-]/.test(str[pos])) name += str[pos++];
        skipWS();
        if (str[pos] === '=') {
          pos++;
          skipWS();
          attrs[name] = readAttrValue();
        } else {
          attrs[name] = true;
        }
        skipWS();
      } else {
        pos++;
      }
    }
    return attrs;
  }

  function readText() {
    let t = '';
    while (pos < str.length && str[pos] !== '<') t += str[pos++];
    return t.trim();
  }

  function parseNode() {
    skipWS();
    if (pos >= str.length) return null;
    if (skipComment()) return null;
    if (str[pos] !== '<') {
      const t = readText();
      return t ? { tag: '#text', attrs: {}, children: [], text: t } : null;
    }
    pos++; // '<'
    if (str[pos] === '/') return null; // closing tag handled by parent
    if (str[pos] === '!') return null; // DOCTYPE / CDATA

    let tag = '';
    while (pos < str.length && /[a-zA-Z0-9_-]/.test(str[pos])) tag += str[pos++];
    tag = tag.toLowerCase();

    const attrs = readAttrs();
    const children = [];
    let text = '';

    if (str[pos] === '/' && str[pos + 1] === '>') {
      pos += 2;
      return { tag, attrs, children, text };
    }

    if (str[pos] === '>') {
      pos++;

      // Inline <svg> — capture raw inner XML instead of parsing children
      if (tag === 'svg' && !attrs.src) {
        let depth = 1,
          inner = '';
        while (pos < str.length && depth > 0) {
          if (str.startsWith('<svg', pos) && /[\s>/]/.test(str[pos + 4])) depth++;
          else if (str.startsWith('</svg>', pos)) {
            depth--;
            if (depth === 0) {
              pos += 6;
              break;
            }
          }
          if (depth > 0) inner += str[pos++];
        }
        attrs._innerSvg = inner.trim();
        return { tag, attrs, children, text };
      }

      // Normal element: parse children / text
      while (pos < str.length) {
        skipWS();
        if (str.startsWith('</', pos)) {
          while (pos < str.length && str[pos] !== '>') pos++;
          pos++;
          break;
        }
        if (skipComment()) continue;
        if (str[pos] === '<') {
          const child = parseNode();
          if (child) children.push(child);
        } else {
          text += readText();
        }
      }
    }
    return { tag, attrs, children, text: text.trim() };
  }

  return parseNode(); // returns root node (<ui>)
}

// ─── ATTRIBUTE HELPERS ────────────────────────────────────────────────────────

function resolveVal(val, parentDim) {
  if (val === undefined || val === null) return undefined;
  const s = String(val);
  if (s.endsWith('%')) return (parseFloat(s) / 100) * (parentDim || 0);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function resolveColor(val) {
  if (!val) return null;
  const s = String(val).trim();
  // #rrggbbaa → rgba()
  if (/^#[0-9a-fA-F]{8}$/.test(s)) {
    const r = parseInt(s.slice(1, 3), 16);
    const g = parseInt(s.slice(3, 5), 16);
    const b = parseInt(s.slice(5, 7), 16);
    const a = (parseInt(s.slice(7, 9), 16) / 255).toFixed(3);
    return `rgba(${r},${g},${b},${a})`;
  }
  return s; // pass-through: #rrggbb, named colours, rgba(...)
}

// Replace {varName} tokens with values from a data object
function bindData(val, data) {
  if (!val || !data) return val || '';
  return String(val).replace(/\{(\w+)\}/g, (_, k) => (data[k] !== undefined ? data[k] : ''));
}

// Compute absolute { x, y, w, h } for a node given its parent rect
function resolveRect(attrs, parentRect, NW, NH) {
  const pw = parentRect ? parentRect.w : NW;
  const ph = parentRect ? parentRect.h : NH;
  const px = parentRect ? parentRect.x : 0;
  const py = parentRect ? parentRect.y : 0;

  let x = resolveVal(attrs.x, pw) || 0;
  let y = resolveVal(attrs.y, ph) || 0;
  const w = resolveVal(attrs.width || attrs.w, pw) || 0;
  const h = resolveVal(attrs.height || attrs.h, ph) || 0;

  const anchor = attrs.anchor || '';
  const ax =
    attrs['anchor-x'] ||
    (anchor === 'center' || anchor === 'center-x' ? 'center' : anchor === 'right' ? 'right' : null);
  const ay =
    attrs['anchor-y'] ||
    (anchor === 'center' || anchor === 'center-y'
      ? 'center'
      : anchor === 'bottom'
        ? 'bottom'
        : null);
  if (ax === 'center') x -= w / 2;
  else if (ax === 'right') x -= w;
  if (ay === 'center') y -= h / 2;
  else if (ay === 'bottom') y -= h;

  return { x: px + x, y: py + y, w, h };
}

// ─── IMAGE / SVG CACHE ───────────────────────────────────────────────────────

const _imgCache = new Map();

function loadImg(src) {
  if (_imgCache.has(src)) return _imgCache.get(src);
  const entry = { img: new Image(), ready: false };
  entry.img.onload = () => {
    entry.ready = true;
  };
  entry.img.src = src;
  _imgCache.set(src, entry);
  return entry;
}

function loadInlineSvg(innerXml, w, h) {
  const key = `_svg_inline_${w}_${h}_${innerXml.length}_${innerXml.slice(0, 40)}`;
  if (_imgCache.has(key)) return _imgCache.get(key);
  const svgSrc = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${innerXml}</svg>`;
  const blob = new Blob([svgSrc], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const entry = { img: new Image(), ready: false, _blobUrl: url };
  entry.img.onload = () => {
    entry.ready = true;
  };
  entry.img.src = url;
  _imgCache.set(key, entry);
  return entry;
}

// ─── MOUSE INPUT ─────────────────────────────────────────────────────────────

function initMouse(overlayCanvas) {
  if (globalThis._nmlMouseReady) return;
  globalThis._nmlMouseReady = true;
  globalThis._nmlMouse = { x: -1, y: -1, down: false, wasDown: false };
  const m = globalThis._nmlMouse;

  function scalePos(clientX, clientY) {
    const r = overlayCanvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * NML_W,
      y: ((clientY - r.top) / r.height) * NML_H,
    };
  }

  window.addEventListener('mousemove', e => {
    const p = scalePos(e.clientX, e.clientY);
    m.x = p.x;
    m.y = p.y;
  });
  window.addEventListener('mousedown', e => {
    const p = scalePos(e.clientX, e.clientY);
    m.x = p.x;
    m.y = p.y;
    m.down = true;
  });
  window.addEventListener('mouseup', () => {
    m.down = false;
  });

  window.addEventListener(
    'touchstart',
    e => {
      if (e.changedTouches.length) {
        const p = scalePos(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        m.x = p.x;
        m.y = p.y;
        m.down = true;
      }
    },
    { passive: true }
  );
  window.addEventListener(
    'touchend',
    () => {
      m.down = false;
    },
    { passive: true }
  );
  window.addEventListener(
    'touchmove',
    e => {
      if (e.changedTouches.length) {
        const p = scalePos(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        m.x = p.x;
        m.y = p.y;
      }
    },
    { passive: true }
  );
}

// ─── ELEMENT RENDERERS ───────────────────────────────────────────────────────

function applyFont(ctx, attrs) {
  const size = parseFloat(attrs.size || attrs['font-size'] || 14);
  const weight = attrs.bold || attrs.weight === 'bold' ? 'bold' : attrs.weight || 'normal';
  const family = attrs.font || attrs['font-family'] || 'monospace';
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

function rRect(ctx, x, y, w, h, r) {
  if (r > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function applyStroke(ctx, attrs) {
  ctx.strokeStyle = resolveColor(attrs.stroke || attrs.color) || '#ffffff';
  ctx.lineWidth = parseFloat(attrs['stroke-width'] || attrs['line-width'] || 1);
}

// <rect>
function drawRect(ctx, rect, attrs) {
  const fill = resolveColor(attrs.fill);
  const stroke = resolveColor(attrs.stroke);
  const r = parseFloat(attrs.radius || 0);
  ctx.beginPath();
  rRect(ctx, rect.x, rect.y, rect.w, rect.h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    applyStroke(ctx, attrs);
    ctx.stroke();
  }
}

// <circle>  (x,y = center)
function drawCircle(ctx, cx, cy, attrs) {
  const r = parseFloat(attrs.r || 20);
  const fill = resolveColor(attrs.fill);
  const stroke = resolveColor(attrs.stroke);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    applyStroke(ctx, attrs);
    ctx.stroke();
  }
}

// <ellipse>  (x,y = center)
function drawEllipse(ctx, cx, cy, attrs) {
  const rx = parseFloat(attrs.rx || 30);
  const ry = parseFloat(attrs.ry || 20);
  const fill = resolveColor(attrs.fill);
  const stroke = resolveColor(attrs.stroke);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    applyStroke(ctx, attrs);
    ctx.stroke();
  }
}

// <triangle>  (x,y = center)
function drawTriangle(ctx, cx, cy, attrs) {
  const size = parseFloat(attrs.size || 40);
  const rot = (parseFloat(attrs.rotation || 0) * Math.PI) / 180;
  const fill = resolveColor(attrs.fill);
  const stroke = resolveColor(attrs.stroke);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -size / 2);
  ctx.lineTo(size / 2, size / 2);
  ctx.lineTo(-size / 2, size / 2);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    applyStroke(ctx, attrs);
    ctx.stroke();
  }
  ctx.restore();
}

// <star>  (x,y = center)
function drawStar(ctx, cx, cy, attrs) {
  const r = parseFloat(attrs.r || 30);
  const innerR = parseFloat(attrs['inner-r'] || r * 0.42);
  const pts = parseInt(attrs.points || 5);
  const rot = ((parseFloat(attrs.rotation || 0) - 90) * Math.PI) / 180;
  const fill = resolveColor(attrs.fill);
  const stroke = resolveColor(attrs.stroke);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const angle = (i * Math.PI) / pts;
    const rad = i % 2 === 0 ? r : innerR;
    i === 0
      ? ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
      : ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    applyStroke(ctx, attrs);
    ctx.stroke();
  }
  ctx.restore();
}

// <line>
function drawLine(ctx, attrs, parentRect, NW, NH) {
  const px = parentRect ? parentRect.x : 0;
  const py = parentRect ? parentRect.y : 0;
  const pw = parentRect ? parentRect.w : NW;
  const ph = parentRect ? parentRect.h : NH;
  const x1 = px + resolveVal(attrs.x1, pw);
  const y1 = py + resolveVal(attrs.y1, ph);
  const x2 = px + resolveVal(attrs.x2, pw);
  const y2 = py + resolveVal(attrs.y2, ph);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  applyStroke(ctx, {
    stroke: attrs.color || attrs.stroke || '#ffffff',
    'stroke-width': attrs.width || 1,
  });
  ctx.stroke();
}

// <path d="M...">  — uses Canvas2D Path2D (natively handles SVG path strings)
function drawPath(ctx, rx, ry, attrs) {
  if (!attrs.d) return;
  const path = new Path2D(attrs.d);
  const fill = resolveColor(attrs.fill);
  const stroke = resolveColor(attrs.stroke || attrs.color);
  ctx.save();
  if (rx || ry) ctx.translate(rx, ry);
  if (fill && fill !== 'none') {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }
  if (stroke && stroke !== 'none') {
    applyStroke(ctx, attrs);
    ctx.stroke(path);
  }
  ctx.restore();
}

// <text>
function drawText(ctx, rect, attrs, rawText, data) {
  const text = bindData(rawText || attrs.text || '', data);
  if (!text) return;
  applyFont(ctx, attrs);
  ctx.textAlign = attrs['anchor-x'] || attrs['text-anchor'] || attrs.align || 'left';
  ctx.textBaseline = attrs.baseline || 'top';
  ctx.fillStyle = resolveColor(attrs.color || '#ffffff');

  if (attrs.shadow === 'true' || attrs.shadow === true) {
    ctx.shadowColor = resolveColor(attrs['shadow-color'] || '#000');
    ctx.shadowBlur = parseFloat(attrs['shadow-blur'] || 4);
    ctx.shadowOffsetX = parseFloat(attrs['shadow-x'] || 1);
    ctx.shadowOffsetY = parseFloat(attrs['shadow-y'] || 1);
  }
  if (attrs.outline) {
    ctx.save();
    ctx.strokeStyle = resolveColor(attrs.outline);
    ctx.lineWidth = parseFloat(attrs['outline-width'] || 2);
    ctx.lineJoin = 'round';
    ctx.strokeText(text, rect.x, rect.y);
    ctx.restore();
  }
  ctx.fillText(text, rect.x, rect.y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// <image> and <svg src="...">
function drawImage(ctx, rect, attrs) {
  if (!attrs.src) return;
  const e = loadImg(attrs.src);
  if (!e.ready) return;
  const dw = rect.w || e.img.naturalWidth;
  const dh = rect.h || e.img.naturalHeight;
  ctx.drawImage(e.img, rect.x, rect.y, dw, dh);
}

// <svg> inline block
function drawInlineSvg(ctx, rect, attrs) {
  const inner = attrs._innerSvg || '';
  const w = Math.ceil(rect.w) || 128;
  const h = Math.ceil(rect.h) || 128;
  const e = loadInlineSvg(inner, w, h);
  if (e.ready) ctx.drawImage(e.img, rect.x, rect.y, w, h);
}

// <sprite>
function drawSprite(ctx, rect, attrs, data) {
  if (!attrs.src) return;
  const e = loadImg(attrs.src);
  if (!e.ready) return;
  const tw = parseInt(attrs['tile-width'] || 16);
  const th = parseInt(attrs['tile-height'] || 16);
  const frame = parseInt(bindData(attrs.frame || '0', data)) || 0;
  const cols = Math.max(1, Math.floor(e.img.naturalWidth / tw));
  const scale = parseFloat(attrs.scale || 1);
  ctx.drawImage(
    e.img,
    (frame % cols) * tw,
    Math.floor(frame / cols) * th,
    tw,
    th,
    rect.x,
    rect.y,
    tw * scale,
    th * scale
  );
}

// <spritesheet>  — frame driven by nodeState.frame, advanced in update()
function drawSpritesheet(ctx, rect, attrs, nodeState) {
  if (!attrs.src) return;
  const e = loadImg(attrs.src);
  if (!e.ready) return;
  const tw = parseInt(attrs['tile-width'] || 16);
  const th = parseInt(attrs['tile-height'] || 16);
  const cols = Math.max(1, Math.floor(e.img.naturalWidth / tw));
  const rows = Math.max(1, Math.floor(e.img.naturalHeight / th));
  const totalFrames = parseInt(attrs.frames || cols * rows);
  const loop = attrs.loop !== 'false';
  const f = Math.floor(nodeState.frame || 0);
  const frame = loop ? f % totalFrames : Math.min(f, totalFrames - 1);
  const scale = parseFloat(attrs.scale || 1);
  ctx.drawImage(
    e.img,
    (frame % cols) * tw,
    Math.floor(frame / cols) * th,
    tw,
    th,
    rect.x,
    rect.y,
    tw * scale,
    th * scale
  );
}

// <slideshow>  — frame index and fade alpha driven by nodeState, advanced in update()
function drawSlideshow(ctx, rect, attrs, nodeState) {
  const frames = nodeState.frames || [];
  if (!frames.length) return;
  const idx = nodeState.slideIdx || 0;
  const nextIdx = (idx + 1) % frames.length;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const cur = frames[idx];
  if (cur && cur.ready) ctx.drawImage(cur.img, rect.x, rect.y, rect.w, rect.h);
  if (nodeState.fading) {
    const next = frames[nextIdx];
    if (next && next.ready) {
      ctx.globalAlpha = 1 - (nodeState.fadeAlpha ?? 1);
      ctx.drawImage(next.img, rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

// <button>
function drawButton(ctx, rect, attrs, data, handlers, nodeState) {
  const mouse = globalThis._nmlMouse || { x: -1, y: -1, down: false, wasDown: false };
  const hovered =
    mouse.x >= rect.x &&
    mouse.x <= rect.x + rect.w &&
    mouse.y >= rect.y &&
    mouse.y <= rect.y + rect.h;
  nodeState.hovered = hovered;

  // Trigger once on press (down transition while hovered)
  if (hovered && mouse.down && !mouse.wasDown) {
    const fn = attrs.onclick && handlers && handlers[attrs.onclick];
    if (typeof fn === 'function') fn();
  }

  const r = parseFloat(attrs.radius || 6);
  const fillColor = resolveColor(
    hovered ? attrs.hover || attrs['fill-hover'] || '#3366cc' : attrs.fill || '#224499'
  );
  const strokeColor = resolveColor(attrs.stroke || (hovered ? '#88bbff' : '#4466aa'));

  ctx.beginPath();
  rRect(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = parseFloat(attrs['stroke-width'] || 1.5);
  ctx.stroke();

  const label = bindData(attrs.text || attrs.label || '', data);
  if (label) {
    ctx.font = `bold ${parseFloat(attrs['font-size'] || attrs.size || 13)}px ${attrs.font || 'monospace'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = resolveColor(attrs['text-color'] || attrs['label-color'] || '#ffffff');
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
}

// <progressbar>
function drawProgressbar(ctx, rect, attrs, data) {
  const value = parseFloat(bindData(attrs.value || '0', data)) || 0;
  const max = parseFloat(attrs.max || 100);
  const pct = Math.min(1, Math.max(0, value / max));
  const r = parseFloat(attrs.radius || 3);

  ctx.beginPath();
  rRect(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.fillStyle = resolveColor(attrs.background || attrs.bg || '#333');
  ctx.fill();

  if (pct > 0) {
    ctx.save();
    ctx.beginPath();
    rRect(ctx, rect.x, rect.y, rect.w * pct, rect.h, r);
    ctx.fillStyle = resolveColor(attrs.fill || '#44aa44');
    ctx.fill();
    ctx.restore();
  }

  const label = bindData(attrs.label || '', data);
  if (label) {
    ctx.font = `bold ${parseFloat(attrs['font-size'] || 10)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = resolveColor(attrs['label-color'] || '#fff');
    ctx.fillText(label, rect.x + 5, rect.y + rect.h / 2);
  }
}

// ─── RECURSIVE NODE RENDERER ─────────────────────────────────────────────────

function renderNode(ctx, node, parentRect, data, handlers, state, NW, NH) {
  const { tag, children, text } = node;
  if (!tag || tag === '#text' || tag === 'frame') return;

  // Apply data binding to all attribute values so {var} tokens resolve for numeric attrs too
  const attrs = {};
  for (const [k, v] of Object.entries(node.attrs)) {
    attrs[k] = typeof v === 'string' ? bindData(v, data) : v;
  }

  // Root wrapper — just recurse children
  if (tag === 'ui') {
    const root = { x: 0, y: 0, w: NW, h: NH };
    for (const child of children) renderNode(ctx, child, root, data, handlers, state, NW, NH);
    return;
  }

  // Node-level state keyed by id attribute or generated key
  const nodeId = attrs.id || `${tag}@${attrs.x},${attrs.y},${attrs.width},${attrs.src || ''}`;
  if (!state.has(nodeId)) state.set(nodeId, {});
  const ns = state.get(nodeId);

  // Center-point elements: x,y is center
  const isCenterPt = tag === 'circle' || tag === 'ellipse' || tag === 'triangle' || tag === 'star';
  const pw = parentRect ? parentRect.w : NW;
  const ph = parentRect ? parentRect.h : NH;
  const px = parentRect ? parentRect.x : 0;
  const py = parentRect ? parentRect.y : 0;
  const cx = px + resolveVal(attrs.x || attrs.cx || 0, pw);
  const cy = py + resolveVal(attrs.y || attrs.cy || 0, ph);

  // Rect-based elements
  const rect =
    isCenterPt || tag === 'line'
      ? { x: cx, y: cy, w: 0, h: 0 }
      : resolveRect(attrs, parentRect, NW, NH);

  try {
    switch (tag) {
      case 'rect':
        drawRect(ctx, rect, attrs);
        break;
      case 'circle':
        drawCircle(ctx, cx, cy, attrs);
        break;
      case 'ellipse':
        drawEllipse(ctx, cx, cy, attrs);
        break;
      case 'triangle':
        drawTriangle(ctx, cx, cy, attrs);
        break;
      case 'star':
        drawStar(ctx, cx, cy, attrs);
        break;
      case 'line':
        drawLine(ctx, attrs, parentRect, NW, NH);
        break;
      case 'path':
        drawPath(ctx, rect.x, rect.y, attrs);
        break;
      case 'text':
        drawText(ctx, rect, attrs, text, data);
        break;
      case 'image':
        drawImage(ctx, rect, attrs);
        break;
      case 'svg':
        attrs._innerSvg !== undefined
          ? drawInlineSvg(ctx, rect, attrs)
          : drawImage(ctx, rect, attrs);
        break;
      case 'sprite':
        drawSprite(ctx, rect, attrs, data);
        break;
      case 'spritesheet':
        drawSpritesheet(ctx, rect, attrs, ns);
        break;
      case 'slideshow':
        drawSlideshow(ctx, rect, attrs, ns);
        break;
      case 'button':
        drawButton(ctx, rect, attrs, data, handlers, ns);
        break;
      case 'progressbar':
        drawProgressbar(ctx, rect, attrs, data);
        break;

      case 'panel': {
        const fill = resolveColor(attrs.fill || '#001122cc');
        const stroke = resolveColor(attrs.stroke || '#0088ff');
        const r = parseFloat(attrs.radius || 6);
        const titleH = attrs.title ? parseFloat(attrs['title-height'] || 28) : 0;

        ctx.beginPath();
        rRect(ctx, rect.x, rect.y, rect.w, rect.h, r);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = parseFloat(attrs['stroke-width'] || 1.5);
        ctx.stroke();

        if (attrs.title) {
          ctx.save();
          ctx.beginPath();
          rRect(ctx, rect.x, rect.y, rect.w, titleH, r);
          ctx.fillStyle = stroke;
          ctx.globalAlpha = 0.35;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
          ctx.font = `bold ${parseFloat(attrs['title-size'] || 11)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = resolveColor(attrs['title-color'] || '#fff');
          ctx.fillText(attrs.title, rect.x + rect.w / 2, rect.y + titleH / 2);
        }
        for (const child of children) renderNode(ctx, child, rect, data, handlers, state, NW, NH);
        break;
      }

      case 'group': {
        ctx.save();
        if (attrs.clip !== 'false' && rect.w > 0 && rect.h > 0) {
          ctx.beginPath();
          ctx.rect(rect.x, rect.y, rect.w, rect.h);
          ctx.clip();
        }
        for (const child of children) renderNode(ctx, child, rect, data, handlers, state, NW, NH);
        ctx.restore();
        break;
      }

      default:
        break;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[CanvasUI] render error in <' + tag + '>:', e);
    ctx.restore(); // recover canvas state
  }
}

// ─── CANVASUISCENE ───────────────────────────────────────────────────────────

class CanvasUIScene {
  constructor(ast, opts = {}) {
    this.ast = ast;
    this.state = new Map();
    this.NW = parseInt(ast?.attrs?.width || NML_W);
    this.NH = parseInt(ast?.attrs?.height || NML_H);

    if (opts.canvas || opts.ctx) {
      // ── Canvas-in-canvas mode: render into a caller-supplied canvas/context ──
      // No DOM overlay is created; caller owns the canvas lifecycle.
      this.canvas = opts.canvas || opts.ctx.canvas;
      this.ctx = opts.ctx || this.canvas.getContext('2d');
      this._sx = this.canvas.width / this.NW;
      this._sy = this.canvas.height / this.NH;
      this._owned = false; // we do NOT remove this canvas on destroy()
    } else {
      // ── Overlay mode: create a new <canvas> on top of #screen ──
      const mainCanvas = document.getElementById('screen');
      this.canvas = document.createElement('canvas');
      // background:transparent overrides console.html's global `canvas { background:#000 }`
      this.canvas.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;' +
        'z-index:10;pointer-events:auto;background:transparent;';
      // Pixel resolution: match main canvas for crisp rendering
      const pw = mainCanvas ? mainCanvas.width : this.NW;
      const ph = mainCanvas ? mainCanvas.height : this.NH;
      this.canvas.width = pw;
      this.canvas.height = ph;
      this._sx = pw / this.NW;
      this._sy = ph / this.NH;
      this._owned = true;

      const container = mainCanvas ? mainCanvas.parentElement : document.body;
      if (container && getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      (container || document.body).appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      initMouse(this.canvas);
    }

    this._initSlideshows(ast);
  }

  // Pre-register slideshow nodes so their state (frames array) is ready before first render
  _initSlideshows(node) {
    if (!node || !node.children) return;
    for (const child of node.children) {
      if (child.tag === 'slideshow') {
        const id = child.attrs.id || `slideshow@${child.attrs.x},${child.attrs.y}`;
        child.attrs.id = id;
        if (!this.state.has(id)) {
          const frames = child.children
            .filter(c => c.tag === 'frame' && c.attrs.src)
            .map(f => loadImg(f.attrs.src));
          this.state.set(id, {
            frames,
            slideIdx: 0,
            fading: false,
            fadeAlpha: 1,
            timer: 0,
            interval: parseFloat(child.attrs.interval || 4000),
          });
        }
      }
      this._initSlideshows(child);
    }
  }

  // Pre-register spritesheet nodes across the tree
  _initSpritesheets(node) {
    if (!node || !node.children) return;
    for (const child of node.children) {
      if (child.tag === 'spritesheet') {
        const id = child.attrs.id || `ss@${child.attrs.src},${child.attrs['tile-width']}`;
        child.attrs.id = id;
        if (!this.state.has(id)) {
          this.state.set(id, { frame: 0, fps: parseFloat(child.attrs.fps || 8) });
        }
      }
      this._initSpritesheets(child);
    }
  }

  update(dt) {
    // Capture wasDown at the start of each frame
    if (globalThis._nmlMouse) globalThis._nmlMouse.wasDown = globalThis._nmlMouse.down;

    this.state.forEach(s => {
      // Advance spritesheet frames
      if ('fps' in s) {
        s.frame = (s.frame || 0) + s.fps * dt;
      }
      // Advance slideshow timers
      if ('frames' in s) {
        if (!s.fading) {
          s.timer += dt * 1000;
          if (s.timer >= s.interval) {
            s.timer = 0;
            s.fading = true;
            s.fadeAlpha = 1;
          }
        } else {
          s.fadeAlpha -= dt * 2.5; // ~0.4 s fade
          if (s.fadeAlpha <= 0) {
            s.fading = false;
            s.fadeAlpha = 1;
            s.slideIdx = (s.slideIdx + 1) % Math.max(1, s.frames.length);
          }
        }
      }
    });
  }

  render(data = {}, handlers = {}) {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(this._sx, this._sy);
    renderNode(ctx, this.ast, null, data, handlers, this.state, this.NW, this.NH);
    ctx.restore();
  }

  destroy() {
    if (this._owned && this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export function parseCanvasUI(xmlString, opts = {}) {
  const ast = parseNML(xmlString);
  if (!ast) throw new Error('[CanvasUI] Failed to parse NML — check your markup');
  return new CanvasUIScene(ast, opts);
}

export function updateCanvasUI(scene, dt) {
  if (scene?.update) scene.update(dt);
}

export function renderCanvasUI(scene, data = {}, handlers = {}) {
  if (scene?.render) scene.render(data, handlers);
}

export function destroyCanvasUI(scene) {
  if (scene?.destroy) scene.destroy();
}

export function canvasUIApi() {
  return {
    exposeTo(target) {
      target.parseCanvasUI = parseCanvasUI;
      target.updateCanvasUI = updateCanvasUI;
      target.renderCanvasUI = renderCanvasUI;
      target.destroyCanvasUI = destroyCanvasUI;
    },
  };
}
