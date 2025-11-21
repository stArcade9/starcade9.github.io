// runtime/assets.js
export class SpriteSheet {
  constructor(image, width, tileSize=8) {
    this.image = image;             // HTMLImageElement
    this.sheetWidth = width;
    this.tileSize = tileSize;
    this.cols = Math.floor(width / tileSize);
  }
}

export async function loadImageElement(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

export async function loadSpriteSheet(url, tileSize=8) {
  const img = await loadImageElement(url);
  return new SpriteSheet(img, img.naturalWidth, tileSize);
}

export async function loadTilemap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load tilemap: ' + url);
  return await res.json(); // { width, height, data }
}
