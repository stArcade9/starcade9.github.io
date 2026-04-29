// WAD Texture Manager for Nova64
// Extracts textures, flats, and sprites from DOOM WAD files
// and creates Three.js textures for rendering

// DOOM thing type → sprite prefix mapping
const THING_SPRITE_PREFIX = {
  // Monsters
  3004: 'POSS',
  9: 'SPOS',
  3001: 'TROO',
  3006: 'SKUL',
  65: 'CPOS',
  3005: 'HEAD',
  66: 'SKEL',
  68: 'BSPI',
  71: 'PAIN',
  84: 'SSWV',
  3002: 'SARG',
  58: 'SARG',
  67: 'FATT',
  69: 'BOS2',
  3003: 'BOSS',
  64: 'VILE',
  16: 'CYBR',
  7: 'SPID',
  // Items
  2011: 'STIM',
  2012: 'MEDI',
  2014: 'BON1',
  2015: 'BON2',
  2018: 'ARM1',
  2019: 'ARM2',
  2007: 'CLIP',
  2008: 'SHEL',
  2010: 'ROCK',
  2047: 'CELL',
  2001: 'SHOT',
  2002: 'MGUN',
  2003: 'LAUN',
  2004: 'PLAS',
  2006: 'BFUG',
  // Decorations
  2035: 'BAR1',
  70: 'FCAN',
  44: 'TBLU',
  45: 'TGRN',
  46: 'TRED',
  48: 'ELEC',
  34: 'CAND',
  35: 'CBRA',
};

export { THING_SPRITE_PREFIX };

export class WADTextureManager {
  constructor(wadLoader) {
    this.wad = wadLoader;
    this.palette = null;
    this.patchNames = null;
    this.textureDefs = null;
    this.flatLumps = null;
    this.spriteLumps = null;
    this.wallTexCache = new Map();
    this.flatTexCache = new Map();
    this.spriteTexCache = new Map();
    this._init = false;
  }

  init() {
    if (this._init) return;
    this.palette = this.wad.getPalette();
    if (!this.palette) {
      console.warn('WAD has no PLAYPAL');
      return;
    }
    this.patchNames = this.wad.getPNames();
    this.textureDefs = {
      ...this.wad.getTextureDefs('TEXTURE1'),
      ...this.wad.getTextureDefs('TEXTURE2'),
    };
    this.flatLumps = this.wad.getFlatLumps();
    this.spriteLumps = this.wad.getSpriteLumps();
    this._init = true;
    console.log(
      `WAD textures: ${Object.keys(this.textureDefs).length} wall, ` +
        `${Object.keys(this.flatLumps).length} flats, ` +
        `${Object.keys(this.spriteLumps).length} sprites`
    );
  }

  // Parse DOOM picture format (patches and sprites)
  parsePicture(data) {
    if (!data || data.length < 8) return null;
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const width = dv.getUint16(0, true);
    const height = dv.getUint16(2, true);
    const leftOfs = dv.getInt16(4, true);
    const topOfs = dv.getInt16(6, true);

    if (width === 0 || height === 0 || width > 4096 || height > 4096) return null;
    if (8 + width * 4 > data.length) return null;

    const colOffsets = [];
    for (let x = 0; x < width; x++) {
      colOffsets.push(dv.getUint32(8 + x * 4, true));
    }

    // RGBA pixel buffer (transparent by default)
    const pixels = new Uint8Array(width * height * 4);

    for (let x = 0; x < width; x++) {
      let ofs = colOffsets[x];
      if (ofs >= data.length) continue;

      for (let safety = 0; safety < 256; safety++) {
        if (ofs >= data.length) break;
        const topdelta = data[ofs++];
        if (topdelta === 0xff) break;
        if (ofs >= data.length) break;
        const length = data[ofs++];
        ofs++; // skip pre-padding

        for (let j = 0; j < length; j++) {
          if (ofs >= data.length) break;
          const y = topdelta + j;
          if (y < height) {
            const palIdx = data[ofs];
            const pi = (y * width + x) * 4;
            pixels[pi] = this.palette[palIdx * 3];
            pixels[pi + 1] = this.palette[palIdx * 3 + 1];
            pixels[pi + 2] = this.palette[palIdx * 3 + 2];
            pixels[pi + 3] = 255;
          }
          ofs++;
        }
        ofs++; // skip post-padding
      }
    }

    return { width, height, leftOfs, topOfs, pixels };
  }

  // Composite a wall texture from its patch definitions
  compositeWallTexture(texDef) {
    const { width, height, patches } = texDef;
    const pixels = new Uint8Array(width * height * 4);

    for (const p of patches) {
      if (p.patchIdx < 0 || p.patchIdx >= this.patchNames.length) continue;
      const patchName = this.patchNames[p.patchIdx];
      const patchLump = this.wad.getLump(patchName);
      if (!patchLump) continue;

      const pic = this.parsePicture(patchLump.data);
      if (!pic) continue;

      // Blit patch onto composite
      for (let py = 0; py < pic.height; py++) {
        for (let px = 0; px < pic.width; px++) {
          const srcIdx = (py * pic.width + px) * 4;
          if (pic.pixels[srcIdx + 3] === 0) continue; // transparent

          const dx = p.originX + px;
          const dy = p.originY + py;
          if (dx < 0 || dx >= width || dy < 0 || dy >= height) continue;

          const dstIdx = (dy * width + dx) * 4;
          pixels[dstIdx] = pic.pixels[srcIdx];
          pixels[dstIdx + 1] = pic.pixels[srcIdx + 1];
          pixels[dstIdx + 2] = pic.pixels[srcIdx + 2];
          pixels[dstIdx + 3] = 255;
        }
      }
    }

    return { width, height, pixels };
  }

  // Get a wall texture as Three.js DataTexture (shared base)
  getWallTexture(name) {
    if (!name || name === '-' || !this._init) return null;
    name = name.toUpperCase();

    const cached = this.wallTexCache.get(name);
    if (cached !== undefined) return cached;

    const texDef = this.textureDefs[name];
    if (!texDef) {
      this.wallTexCache.set(name, null);
      return null;
    }

    const comp = this.compositeWallTexture(texDef);
    // Flip vertically: DOOM textures are top-down, Three.js DataTexture is bottom-up
    const flipped = new Uint8Array(comp.width * comp.height * 4);
    const rowBytes = comp.width * 4;
    for (let y = 0; y < comp.height; y++) {
      const srcRow = y * rowBytes;
      const dstRow = (comp.height - 1 - y) * rowBytes;
      flipped.set(comp.pixels.subarray(srcRow, srcRow + rowBytes), dstRow);
    }

    const tex = engine.createDataTexture(flipped, comp.width, comp.height, {
      format: 'rgba',
      filter: 'nearest',
      wrap: 'repeat',
      generateMipmaps: false,
    });

    this.wallTexCache.set(name, tex);
    return tex;
  }

  // Get texture definition info (width, height) for UV calculation
  getTextureDef(name) {
    if (!name || name === '-') return null;
    return this.textureDefs[name.toUpperCase()] || null;
  }

  // Get a flat texture (floor/ceiling) as Three.js DataTexture
  getFlatTexture(name) {
    if (!name || name === '-' || !this._init) return null;
    name = name.toUpperCase();

    const cached = this.flatTexCache.get(name);
    if (cached !== undefined) return cached;

    const flatData = this.flatLumps[name];
    if (!flatData) {
      this.flatTexCache.set(name, null);
      return null;
    }

    const pixels = new Uint8Array(64 * 64 * 4);
    for (let i = 0; i < 4096; i++) {
      const palIdx = flatData[i];
      pixels[i * 4] = this.palette[palIdx * 3];
      pixels[i * 4 + 1] = this.palette[palIdx * 3 + 1];
      pixels[i * 4 + 2] = this.palette[palIdx * 3 + 2];
      pixels[i * 4 + 3] = 255;
    }

    const tex = engine.createDataTexture(pixels, 64, 64, {
      format: 'rgba',
      filter: 'nearest',
      wrap: 'repeat',
      generateMipmaps: false,
    });

    this.flatTexCache.set(name, tex);
    return tex;
  }

  // Get sprite texture for a DOOM thing type
  getSpriteTexture(thingType) {
    const prefix = THING_SPRITE_PREFIX[thingType];
    if (!prefix) return null;

    const cached = this.spriteTexCache.get(thingType);
    if (cached !== undefined) return cached;

    // Try front-facing angle 1, then rotationless angle 0
    let spriteData = this.spriteLumps[prefix + 'A1'];
    if (!spriteData) spriteData = this.spriteLumps[prefix + 'A0'];

    // Some sprites have combined angle names like "A2A8"
    if (!spriteData) {
      const key = Object.keys(this.spriteLumps).find(k => k.startsWith(prefix + 'A'));
      if (key) spriteData = this.spriteLumps[key];
    }

    if (!spriteData) {
      this.spriteTexCache.set(thingType, null);
      return null;
    }

    const pic = this.parsePicture(spriteData);
    if (!pic) {
      this.spriteTexCache.set(thingType, null);
      return null;
    }

    // Flip vertically for Three.js
    const flipped = new Uint8Array(pic.width * pic.height * 4);
    const rowBytes = pic.width * 4;
    for (let y = 0; y < pic.height; y++) {
      const srcRow = y * rowBytes;
      const dstRow = (pic.height - 1 - y) * rowBytes;
      flipped.set(pic.pixels.subarray(srcRow, srcRow + rowBytes), dstRow);
    }

    const tex = engine.createDataTexture(flipped, pic.width, pic.height, {
      format: 'rgba',
      filter: 'nearest',
      generateMipmaps: false,
    });

    const result = {
      texture: tex,
      width: pic.width,
      height: pic.height,
      leftOfs: pic.leftOfs,
      topOfs: pic.topOfs,
    };
    this.spriteTexCache.set(thingType, result);
    return result;
  }

  // Dispose all cached textures
  dispose() {
    for (const tex of this.wallTexCache.values()) if (tex) tex.dispose();
    for (const tex of this.flatTexCache.values()) if (tex) tex.dispose();
    for (const s of this.spriteTexCache.values()) if (s) s.texture.dispose();
    this.wallTexCache.clear();
    this.flatTexCache.clear();
    this.spriteTexCache.clear();
  }
}

// Apply wall texture UVs to a mesh geometry for correct tiling
function getMeshTexture(mesh) {
  const materials = Array.isArray(mesh?.material) ? mesh.material : [mesh?.material];
  for (const material of materials) {
    if (!material) continue;
    if (material.map) return material.map;
    if (material.diffuseTexture) return material.diffuseTexture;
    if (material.albedoTexture) return material.albedoTexture;
  }
  return null;
}

function applyTextureOffsets(texture, ofsU, ofsV) {
  if (!texture) return;
  if (texture.offset?.set) {
    texture.offset.set(ofsU, ofsV);
  } else {
    if ('uOffset' in texture) texture.uOffset = ofsU;
    if ('vOffset' in texture) texture.vOffset = ofsV;
  }
  try {
    engine.invalidateTexture(texture);
  } catch {
    // Offset changes are runtime metadata on some backends.
  }
}

export function setWallUVs(meshId, wallDoomLen, wallDoomH, texWidth, texHeight, xoff, yoff) {
  const mesh = getMesh(meshId);
  if (!mesh || !texWidth || !texHeight) return;

  const uvAttr = mesh.geometry?.attributes?.uv ?? mesh.geometry?.getAttribute?.('uv');

  const tileU = wallDoomLen / texWidth;
  const tileV = wallDoomH / texHeight;
  const ofsU = (xoff || 0) / texWidth;
  const ofsV = (yoff || 0) / texHeight;

  if (!uvAttr) {
    const texture = getMeshTexture(mesh);
    if (!texture) return;
    engine.setTextureRepeat(texture, tileU, tileV);
    applyTextureOffsets(texture, ofsU, ofsV);
    return;
  }

  // BoxGeometry face order: +x(0-3), -x(4-7), +y(8-11), -y(12-15), +z(16-19), -z(20-23)
  // Main visible faces are +z (front) and -z (back)
  const setFace = (start, tu, tv) => {
    uvAttr.setXY(start, ofsU, ofsV);
    uvAttr.setXY(start + 1, ofsU + tu, ofsV);
    uvAttr.setXY(start + 2, ofsU, ofsV + tv);
    uvAttr.setXY(start + 3, ofsU + tu, ofsV + tv);
  };

  // Front and back faces (main wall surface)
  setFace(16, tileU, tileV);
  setFace(20, tileU, tileV);
  // Side edges (thin, use wall height tiling)
  setFace(0, 0.5, tileV);
  setFace(4, 0.5, tileV);
  // Top/bottom edges
  setFace(8, tileU, 0.5);
  setFace(12, tileU, 0.5);

  uvAttr.needsUpdate = true;
}
