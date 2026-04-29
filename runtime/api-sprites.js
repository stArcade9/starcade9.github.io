// runtime/api-sprites.js
import { loadSpriteSheet, loadTilemap, loadImageElement } from './assets.js';

export function spriteApi(gpu) {
  const assets = { sheet: null, map: null, tileSize: 8 };
  let camRef = { x: 0, y: 0 };

  // ─── TexturePacker atlas registry ──────────────────────────────────────────
  // atlases: Map<atlasId, { image: HTMLImageElement, frames: Map<name, {x,y,w,h}> }>
  const atlases = new Map();
  let _atlasCounter = 0;

  // ─── helpers ────────────────────────────────────────────────────────────────

  function getSpriteSheetImage() {
    return assets.sheet?.image || null;
  }

  async function loadSprites(url, tileSize = 8) {
    assets.sheet = await loadSpriteSheet(url, tileSize);
    assets.tileSize = tileSize;
    if (gpu.updateTextureForImage) gpu.updateTextureForImage(assets.sheet.image);
  }

  async function loadMap(url) {
    assets.map = await loadTilemap(url);
    globalThis.__nova_map = assets.map;
  }

  async function applySpriteSheetDataURL(dataURL) {
    const img = await loadImageElement(dataURL);
    if (!assets.sheet)
      assets.sheet = {
        image: img,
        sheetWidth: img.naturalWidth,
        tileSize: 8,
        cols: Math.floor(img.naturalWidth / 8),
      };
    else {
      assets.sheet.image = img;
      assets.sheet.sheetWidth = img.naturalWidth;
      assets.sheet.cols = Math.floor(img.naturalWidth / assets.tileSize);
    }
    if (gpu.updateTextureForImage) gpu.updateTextureForImage(img);
  }

  // ─── Internal: draw a source rect from an image onto the stage ctx ─────────
  function _blit(
    img,
    sx,
    sy,
    sw,
    sh,
    dx,
    dy,
    dw,
    dh,
    {
      flipX = false,
      flipY = false,
      rot = 0,
      alpha = 1,
      anchorX = 0,
      anchorY = 0,
      blendMode = 'source-over',
      tint = null,
    } = {}
  ) {
    const ctx = gpu.getStageCtx?.();
    if (!ctx) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = blendMode;

    // Translate to destination + anchor pivot
    ctx.translate(dx + anchorX * dw, dy + anchorY * dh);
    if (rot) ctx.rotate(rot);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

    // Offset back by anchor so pivot point aligns with dx,dy
    const ox = -anchorX * dw;
    const oy = -anchorY * dh;

    if (tint !== null) {
      // Tint via OffscreenCanvas: draw sprite, multiply tint color, mask with original alpha
      const oc = new OffscreenCanvas(sw, sh);
      const oc2 = oc.getContext('2d');
      oc2.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const tr = (tint >> 16) & 0xff;
      const tg = (tint >> 8) & 0xff;
      const tb = tint & 0xff;
      oc2.globalCompositeOperation = 'multiply';
      oc2.fillStyle = `rgb(${tr},${tg},${tb})`;
      oc2.fillRect(0, 0, sw, sh);
      oc2.globalCompositeOperation = 'destination-in';
      oc2.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      ctx.drawImage(oc, ox, oy, dw, dh);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, ox, oy, dw, dh);
    }

    ctx.restore();
  }

  // ─── spr — draw uniform-grid sprite by index ────────────────────────────────
  function spr(
    id,
    x,
    y,
    {
      flipX = false,
      flipY = false,
      scale = 1,
      scaleX,
      scaleY,
      parallax = 1,
      rot = 0,
      alpha = 1,
      anchorX = 0,
      anchorY = 0,
      blendMode = 'source-over',
      tint = null,
    } = {}
  ) {
    if (!assets.sheet) return;
    const ts = assets.tileSize;
    const cols = Math.floor(assets.sheet.sheetWidth / ts);
    const sx0 = (id % cols) * ts;
    const sy0 = Math.floor(id / cols) * ts;

    const camX = Math.floor(camRef.x * parallax);
    const camY = Math.floor(camRef.y * parallax);
    const dx = (x | 0) - camX;
    const dy = (y | 0) - camY;
    const dw = ts * (scaleX ?? scale);
    const dh = ts * (scaleY ?? scale);

    _blit(assets.sheet.image, sx0, sy0, ts, ts, dx, dy, dw, dh, {
      flipX,
      flipY,
      rot,
      alpha,
      anchorX,
      anchorY,
      blendMode,
      tint,
    });
  }

  // ─── sprRect — draw an arbitrary source rect from the spritesheet ───────────
  function sprRect(sx, sy, sw, sh, dx, dy, opts = {}) {
    if (!assets.sheet) return;
    const { scale = 1, scaleX, scaleY, ...rest } = opts;
    _blit(
      assets.sheet.image,
      sx,
      sy,
      sw,
      sh,
      dx,
      dy,
      sw * (scaleX ?? scale),
      sh * (scaleY ?? scale),
      rest
    );
  }

  // ─── loadAtlas — load a TexturePacker JSON Hash atlas ───────────────────────
  async function loadAtlas(url) {
    const resp = await fetch(url);
    const json = await resp.json();
    // Resolve the image path relative to the atlas JSON URL
    const imgUrl = new URL(json.meta.image, new URL(url, location.href)).href;
    const img = await loadImageElement(imgUrl);
    const frames = new Map();
    for (const [name, data] of Object.entries(json.frames)) {
      // Support both { frame: {x,y,w,h} } (JSON Array / Hash) and flat { x,y,w,h }
      const f = data.frame ?? data;
      frames.set(name, { x: f.x, y: f.y, w: f.w, h: f.h });
    }
    const id = `atlas_${_atlasCounter++}`;
    atlases.set(id, { image: img, frames });
    return id;
  }

  // ─── sprByName — draw a named atlas frame ───────────────────────────────────
  function sprByName(name, x, y, opts = {}) {
    const { parallax = 1, ...blitOpts } = opts;
    const { scale = 1, scaleX, scaleY, ...rest } = blitOpts;
    for (const atlas of atlases.values()) {
      const frame = atlas.frames.get(name);
      if (frame) {
        const camX = Math.floor(camRef.x * parallax);
        const camY = Math.floor(camRef.y * parallax);
        _blit(
          atlas.image,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          (x | 0) - camX,
          (y | 0) - camY,
          frame.w * (scaleX ?? scale),
          frame.h * (scaleY ?? scale),
          rest
        );
        return;
      }
    }
  }

  // ─── getAtlasFrame — query frame rect by name ───────────────────────────────
  function getAtlasFrame(name) {
    for (const [id, atlas] of atlases) {
      const frame = atlas.frames.get(name);
      if (frame) return { ...frame, atlasId: id };
    }
    return null;
  }

  // ─── mapDraw — render a region of the tile map ──────────────────────────────
  function mapDraw(mx, my, w, h, dx, dy, { scale = 1, parallax = 1 } = {}) {
    if (!assets.map) return;
    const ts = assets.tileSize;
    const { width, height, data } = assets.map;
    const camX = Math.floor(camRef.x * parallax);
    const camY = Math.floor(camRef.y * parallax);
    const baseX = dx - camX;
    const baseY = dy - camY;
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const gx = mx + tx;
        const gy = my + ty;
        if (gx < 0 || gy < 0 || gx >= width || gy >= height) continue;
        const id = data[gy * width + gx];
        spr(id, baseX + tx * ts * scale, baseY + ty * ts * scale, { scale });
      }
    }
  }

  return {
    exposeTo(target) {
      Object.assign(target, {
        spr,
        sprRect,
        mapDraw,
        loadSprites,
        loadMap,
        loadAtlas,
        sprByName,
        getAtlasFrame,
        getSpriteSheetImage,
        applySpriteSheetDataURL,
      });
    },
    setCameraRef(ref) {
      camRef = ref;
    },
    getSpriteSheetImage,
    applySpriteSheetDataURL,
  };
}
