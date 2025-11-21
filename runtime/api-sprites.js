// runtime/api-sprites.js
import { loadSpriteSheet, loadTilemap, loadImageElement } from './assets.js';

export function spriteApi(gpu) {
  const fb = gpu.getFramebuffer();
  const assets = { sheet: null, map: null, tileSize: 8 };
  let camRef = { x: 0, y: 0 };

  function _setCameraRef(ref) { camRef = ref; }
  function getSpriteSheetImage() { return assets.sheet?.image || null; }

  async function loadSprites(url, tileSize=8) {
    assets.sheet = await loadSpriteSheet(url, tileSize);
    assets.tileSize = tileSize;
    if (gpu.updateTextureForImage) gpu.updateTextureForImage(assets.sheet.image);
  }
  async function loadMap(url) { assets.map = await loadTilemap(url); globalThis.__nova_map = assets.map; }

  async function applySpriteSheetDataURL(dataURL) {
    const img = await loadImageElement(dataURL);
    if (!assets.sheet) assets.sheet = { image: img, sheetWidth: img.naturalWidth, tileSize: 8, cols: Math.floor(img.naturalWidth/8) };
    else {
      assets.sheet.image = img;
      assets.sheet.sheetWidth = img.naturalWidth;
      assets.sheet.cols = Math.floor(img.naturalWidth / assets.tileSize);
    }
    if (gpu.updateTextureForImage) gpu.updateTextureForImage(img);
  }

  function spr(id, x, y, { flipX=false, flipY=false, scale=1, parallax=1 } = {}) {
    const ts = assets.tileSize;
    if (!assets.sheet) return;
    const cols = Math.floor(assets.sheet.sheetWidth / ts);
    const sx0 = (id % cols) * ts;
    const sy0 = Math.floor(id / cols) * ts;
    // camera
    const camX = Math.floor(camRef.x * parallax);
    const camY = Math.floor(camRef.y * parallax);
    const dx = (x|0) - camX;
    const dy = (y|0) - camY;

    if (gpu.supportsSpriteBatch && gpu.supportsSpriteBatch()) {
      gpu.queueSprite(assets.sheet.image, sx0, sy0, ts, ts, dx, dy, scale);
      return;
    }
  }

  function mapDraw(mx, my, w, h, dx, dy, { scale=1, parallax=1 } = {}) {
    if (!assets.map) return;
    const ts = assets.tileSize;
    const { width, height, data } = assets.map;
    const camX = Math.floor(camRef.x * parallax);
    const camY = Math.floor(camRef.y * parallax);
    const baseX = dx - camX;
    const baseY = dy - camY;
    for (let ty=0; ty<h; ty++) {
      for (let tx=0; tx<w; tx++) {
        const gx = mx + tx;
        const gy = my + ty;
        if (gx<0 || gy<0 || gx>=width || gy>=height) continue;
        const id = data[gy*width + gx];
        spr(id, baseX + tx*ts*scale, baseY + ty*ts*scale, { scale, parallax });
      }
    }
  }

  return {
    exposeTo(target) {
      Object.assign(target, { spr, mapDraw, loadSprites, loadMap, getSpriteSheetImage, applySpriteSheetDataURL });
    },
    setCameraRef(ref) { camRef = ref; },
    getSpriteSheetImage,
    applySpriteSheetDataURL
  };
}
