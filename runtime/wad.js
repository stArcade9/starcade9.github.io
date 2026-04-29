// runtime/wad.js — WAD File Parser, Level Converter & Texture Manager for Nova64
// Supports classic DOOM WAD format (IWAD and PWAD)
/* global getMesh */

import { engine } from './engine-adapter.js';

// ── Thing type mappings ──

const THING_MONSTERS = {
  3004: 'grunt',
  9: 'grunt',
  3001: 'grunt',
  3006: 'grunt',
  65: 'shooter',
  3005: 'shooter',
  66: 'shooter',
  68: 'shooter',
  71: 'shooter',
  84: 'shooter',
  3002: 'tank',
  58: 'tank',
  67: 'tank',
  69: 'tank',
  3003: 'boss',
  64: 'boss',
  16: 'boss',
  7: 'boss',
};

const THING_ITEMS = {
  2011: 'health',
  2012: 'health',
  2014: 'health',
  2015: 'armor',
  2018: 'armor',
  2019: 'armor',
  2007: 'ammo',
  2008: 'ammo',
  2010: 'ammo',
  2047: 'ammo',
  2048: 'ammo',
  2049: 'ammo',
  2001: 'ammo',
  2002: 'ammo',
  2003: 'ammo',
  2004: 'ammo',
  2006: 'ammo',
};

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

// ── Binary lump parsers ──

function readStr8(bytes, offset) {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const c = bytes[offset + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.toUpperCase();
}

function readVerts(dv) {
  if (!dv) return [];
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 4)
    out.push({ x: dv.getInt16(i, true), y: dv.getInt16(i + 2, true) });
  return out;
}

function readLines(dv) {
  if (!dv) return [];
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 14)
    out.push({
      v1: dv.getUint16(i, true),
      v2: dv.getUint16(i + 2, true),
      flags: dv.getUint16(i + 4, true),
      right: dv.getInt16(i + 10, true),
      left: dv.getInt16(i + 12, true),
    });
  return out;
}

function readSides(dv) {
  if (!dv) return [];
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 30) {
    out.push({
      xoff: dv.getInt16(i, true),
      yoff: dv.getInt16(i + 2, true),
      upper: readStr8(bytes, i + 4),
      lower: readStr8(bytes, i + 12),
      middle: readStr8(bytes, i + 20),
      sector: dv.getUint16(i + 28, true),
    });
  }
  return out;
}

function readSectors(dv) {
  if (!dv) return [];
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 26)
    out.push({
      floorH: dv.getInt16(i, true),
      ceilH: dv.getInt16(i + 2, true),
      floorFlat: readStr8(bytes, i + 4),
      ceilFlat: readStr8(bytes, i + 12),
      light: dv.getInt16(i + 20, true),
    });
  return out;
}

function readThings(dv) {
  if (!dv) return [];
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 10)
    out.push({
      x: dv.getInt16(i, true),
      y: dv.getInt16(i + 2, true),
      angle: dv.getUint16(i + 4, true),
      type: dv.getUint16(i + 6, true),
      flags: dv.getUint16(i + 8, true),
    });
  return out;
}

// ── Collision rasterizer ──

function rasterSeg(out, x1, z1, x2, z2, r) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.ceil(len / 2.5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({ x: x1 + (x2 - x1) * t, z: z1 + (z2 - z1) * t, r });
  }
}

// ── WADLoader class ──

class WADLoader {
  constructor() {
    this.directory = [];
    this.buffer = null;
  }

  load(arrayBuffer) {
    this.buffer = arrayBuffer;
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (tag !== 'IWAD' && tag !== 'PWAD') throw new Error('Invalid WAD file');

    const numLumps = view.getInt32(4, true);
    const dirOfs = view.getInt32(8, true);

    this.directory = [];
    for (let i = 0; i < numLumps; i++) {
      const o = dirOfs + i * 16;
      const filepos = view.getInt32(o, true);
      const size = view.getInt32(o + 4, true);
      let name = '';
      for (let j = 0; j < 8; j++) {
        const c = bytes[o + 8 + j];
        if (c === 0) break;
        name += String.fromCharCode(c);
      }
      this.directory.push({ name: name.toUpperCase(), filepos, size });
    }
    return this;
  }

  getMapNames() {
    return this.directory.filter(e => /^(E\dM\d|MAP\d\d)$/.test(e.name)).map(e => e.name);
  }

  getMap(name) {
    const idx = this.directory.findIndex(e => e.name === name);
    if (idx < 0) return null;

    const lumps = {};
    for (let i = idx + 1; i < this.directory.length && i <= idx + 11; i++) {
      const e = this.directory[i];
      if (/^(E\dM\d|MAP\d\d)$/.test(e.name)) break;
      if (e.size > 0) lumps[e.name] = new DataView(this.buffer, e.filepos, e.size);
    }

    return {
      name,
      vertexes: readVerts(lumps.VERTEXES),
      linedefs: readLines(lumps.LINEDEFS),
      sidedefs: readSides(lumps.SIDEDEFS),
      sectors: readSectors(lumps.SECTORS),
      things: readThings(lumps.THINGS),
    };
  }

  getPalette() {
    const lump = this.directory.find(e => e.name === 'PLAYPAL');
    if (!lump || lump.size < 768) return null;
    return new Uint8Array(this.buffer, lump.filepos, 768);
  }

  getLump(name) {
    const lump = this.directory.find(e => e.name === name.toUpperCase());
    if (!lump || lump.size === 0) return null;
    return { data: new Uint8Array(this.buffer, lump.filepos, lump.size), size: lump.size };
  }

  getFlatLumps() {
    const flats = {};
    let inFlats = false;
    for (const e of this.directory) {
      if (e.name === 'F_START' || e.name === 'FF_START') {
        inFlats = true;
        continue;
      }
      if (e.name === 'F_END' || e.name === 'FF_END') {
        inFlats = false;
        continue;
      }
      if (inFlats && e.size === 4096) {
        flats[e.name] = new Uint8Array(this.buffer, e.filepos, 4096);
      }
    }
    return flats;
  }

  getPNames() {
    const lump = this.getLump('PNAMES');
    if (!lump) return [];
    const dv = new DataView(lump.data.buffer, lump.data.byteOffset, lump.data.byteLength);
    const count = dv.getInt32(0, true);
    const names = [];
    for (let i = 0; i < count; i++) {
      names.push(readStr8(lump.data, 4 + i * 8));
    }
    return names;
  }

  getTextureDefs(lumpName) {
    const lump = this.getLump(lumpName);
    if (!lump) return {};
    const dv = new DataView(lump.data.buffer, lump.data.byteOffset, lump.data.byteLength);
    const count = dv.getInt32(0, true);
    const textures = {};
    for (let i = 0; i < count; i++) {
      const offset = dv.getInt32(4 + i * 4, true);
      if (offset + 22 > lump.size) continue;
      const name = readStr8(lump.data, offset);
      const width = dv.getInt16(offset + 12, true);
      const height = dv.getInt16(offset + 14, true);
      const patchCount = dv.getInt16(offset + 20, true);
      const patches = [];
      for (let j = 0; j < patchCount; j++) {
        const po = offset + 22 + j * 10;
        if (po + 6 > lump.size) break;
        patches.push({
          originX: dv.getInt16(po, true),
          originY: dv.getInt16(po + 2, true),
          patchIdx: dv.getInt16(po + 4, true),
        });
      }
      textures[name] = { name, width, height, patches };
    }
    return textures;
  }

  getSpriteLumps() {
    const sprites = {};
    let inSprites = false;
    for (const e of this.directory) {
      if (e.name === 'S_START' || e.name === 'SS_START') {
        inSprites = true;
        continue;
      }
      if (e.name === 'S_END' || e.name === 'SS_END') {
        inSprites = false;
        continue;
      }
      if (inSprites && e.size > 0) {
        sprites[e.name] = new Uint8Array(this.buffer, e.filepos, e.size);
      }
    }
    return sprites;
  }
}

// ── convertWADMap ──

function convertWADMap(map, scale) {
  if (!scale) scale = 1 / 20;
  const { vertexes, linedefs, sidedefs, sectors, things } = map;

  let mnX = Infinity,
    mxX = -Infinity,
    mnY = Infinity,
    mxY = -Infinity;
  for (const v of vertexes) {
    if (v.x < mnX) mnX = v.x;
    if (v.x > mxX) mxX = v.x;
    if (v.y < mnY) mnY = v.y;
    if (v.y > mxY) mxY = v.y;
  }
  const cx = (mnX + mxX) / 2,
    cy = (mnY + mxY) / 2;

  let playerThing = null;
  for (const t of things) {
    if (t.type === 1) {
      playerThing = t;
      break;
    }
  }

  let playerSectorFloor = 0;
  if (playerThing) {
    let minDist = Infinity;
    for (const line of linedefs) {
      const va = vertexes[line.v1],
        vb = vertexes[line.v2];
      if (!va || !vb) continue;
      const dx = vb.x - va.x,
        dy = vb.y - va.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1) continue;
      let t = ((playerThing.x - va.x) * dx + (playerThing.y - va.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = va.x + t * dx,
        py = va.y + t * dy;
      const d = Math.hypot(playerThing.x - px, playerThing.y - py);
      const sideIdxs = [];
      if (line.right >= 0) sideIdxs.push(line.right);
      if (line.left >= 0) sideIdxs.push(line.left);
      for (const si of sideIdxs) {
        const side = sidedefs[si];
        if (side && sectors[side.sector]) {
          if (d < minDist) {
            minDist = d;
            playerSectorFloor = sectors[side.sector].floorH;
          }
        }
      }
    }
  }

  const baseFloor = playerSectorFloor;
  const walls = [];
  const colSegs = [];

  for (const line of linedefs) {
    const va = vertexes[line.v1],
      vb = vertexes[line.v2];
    if (!va || !vb) continue;

    const x1 = (va.x - cx) * scale,
      z1 = (va.y - cy) * scale;
    const x2 = (vb.x - cx) * scale,
      z2 = (vb.y - cy) * scale;
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.05) continue;

    const mx = (x1 + x2) / 2,
      mz = (z1 + z2) / 2;
    const ang = -Math.atan2(z2 - z1, x2 - x1);

    let fSec = null,
      bSec = null;
    if (line.right >= 0 && sidedefs[line.right])
      fSec = sectors[sidedefs[line.right].sector] || null;
    if (line.left >= 0 && sidedefs[line.left]) bSec = sectors[sidedefs[line.left].sector] || null;

    const fF = fSec ? (fSec.floorH - baseFloor) * scale : 0;
    const fC = fSec ? (fSec.ceilH - baseFloor) * scale : 8;
    const bF = bSec ? (bSec.floorH - baseFloor) * scale : 0;
    const bC = bSec ? (bSec.ceilH - baseFloor) * scale : 8;
    const light = fSec ? Math.max(0.25, fSec.light / 255) : 0.5;

    if (!bSec) {
      const h = fC - fF;
      if (h > 0.05) {
        const fSide = line.right >= 0 ? sidedefs[line.right] : null;
        const texName = fSide && fSide.middle !== '-' ? fSide.middle : null;
        walls.push({
          x: mx,
          y: fF + h / 2,
          z: mz,
          len,
          h,
          ang,
          light,
          texName,
          xoff: fSide ? fSide.xoff : 0,
          yoff: fSide ? fSide.yoff : 0,
        });
        rasterSeg(colSegs, x1, z1, x2, z2, 1.0);
      }
    } else {
      const fSide = line.right >= 0 ? sidedefs[line.right] : null;
      const bSide = line.left >= 0 ? sidedefs[line.left] : null;

      const loH = Math.abs(bF - fF);
      if (loH > 0.3) {
        const bot = Math.min(fF, bF);
        let loTex = null;
        if (fSide && fSide.lower && fSide.lower !== '-') loTex = fSide.lower;
        else if (bSide && bSide.lower && bSide.lower !== '-') loTex = bSide.lower;
        walls.push({
          x: mx,
          y: bot + loH / 2,
          z: mz,
          len,
          h: loH,
          ang,
          light,
          step: true,
          texName: loTex,
          xoff: fSide ? fSide.xoff : 0,
          yoff: fSide ? fSide.yoff : 0,
        });
        if (loH > 1.0) rasterSeg(colSegs, x1, z1, x2, z2, 0.8);
      }

      const hiH = Math.abs(fC - bC);
      if (hiH > 0.3) {
        const bot = Math.min(fC, bC);
        let upTex = null;
        if (fSide && fSide.upper && fSide.upper !== '-') upTex = fSide.upper;
        else if (bSide && bSide.upper && bSide.upper !== '-') upTex = bSide.upper;
        walls.push({
          x: mx,
          y: bot + hiH / 2,
          z: mz,
          len,
          h: hiH,
          ang,
          light,
          upper: true,
          texName: upTex,
          xoff: fSide ? fSide.xoff : 0,
          yoff: fSide ? fSide.yoff : 0,
        });
      }

      if (line.flags & 1) rasterSeg(colSegs, x1, z1, x2, z2, 1.0);
    }
  }

  let playerStart = { x: 0, z: 0, angle: Math.PI / 4, floorH: 0 };
  const enemies = [],
    items = [];

  for (const t of things) {
    const tx = (t.x - cx) * scale,
      tz = (t.y - cy) * scale;
    const ta = ((t.angle - 90) * Math.PI) / 180;

    if (t.type === 1) {
      playerStart = { x: tx, z: tz, angle: ta, floorH: 0 };
    } else if (THING_MONSTERS[t.type]) {
      enemies.push({ x: tx, z: tz, type: THING_MONSTERS[t.type], doomType: t.type });
    } else if (THING_ITEMS[t.type]) {
      items.push({ x: tx, z: tz, type: THING_ITEMS[t.type], doomType: t.type });
    }
  }

  const sectorData = sectors.map(s => ({
    floorH: (s.floorH - baseFloor) * scale,
    ceilH: (s.ceilH - baseFloor) * scale,
    floorFlat: s.floorFlat,
    ceilFlat: s.ceilFlat,
    light: Math.max(0.25, s.light / 255),
  }));

  return { walls, colSegs, enemies, items, playerStart, sectors: sectorData };
}

// ── WADTextureManager class ──

class WADTextureManager {
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
        ofs++;

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
        ofs++;
      }
    }

    return { width, height, leftOfs, topOfs, pixels };
  }

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

      for (let py = 0; py < pic.height; py++) {
        for (let px = 0; px < pic.width; px++) {
          const srcIdx = (py * pic.width + px) * 4;
          if (pic.pixels[srcIdx + 3] === 0) continue;

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
    const flipped = new Uint8Array(comp.width * comp.height * 4);
    const rowBytes = comp.width * 4;
    for (let y = 0; y < comp.height; y++) {
      const srcRow = y * rowBytes;
      const dstRow = (comp.height - 1 - y) * rowBytes;
      flipped.set(comp.pixels.subarray(srcRow, srcRow + rowBytes), dstRow);
    }

    const tex = engine.createDataTexture(flipped, comp.width, comp.height, {
      filter: 'nearest',
      wrap: 'repeat',
      generateMipmaps: false,
    });

    this.wallTexCache.set(name, tex);
    return tex;
  }

  getTextureDef(name) {
    if (!name || name === '-') return null;
    return this.textureDefs[name.toUpperCase()] || null;
  }

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
      filter: 'nearest',
      wrap: 'repeat',
      generateMipmaps: false,
    });

    this.flatTexCache.set(name, tex);
    return tex;
  }

  getSpriteTexture(thingType) {
    const prefix = THING_SPRITE_PREFIX[thingType];
    if (!prefix) return null;

    const cached = this.spriteTexCache.get(thingType);
    if (cached !== undefined) return cached;

    let spriteData = this.spriteLumps[prefix + 'A1'];
    if (!spriteData) spriteData = this.spriteLumps[prefix + 'A0'];

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

    const flipped = new Uint8Array(pic.width * pic.height * 4);
    const rowBytes = pic.width * 4;
    for (let y = 0; y < pic.height; y++) {
      const srcRow = y * rowBytes;
      const dstRow = (pic.height - 1 - y) * rowBytes;
      flipped.set(pic.pixels.subarray(srcRow, srcRow + rowBytes), dstRow);
    }

    const tex = engine.createDataTexture(flipped, pic.width, pic.height, {
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

  dispose() {
    for (const tex of this.wallTexCache.values()) if (tex) tex.dispose();
    for (const tex of this.flatTexCache.values()) if (tex) tex.dispose();
    for (const s of this.spriteTexCache.values()) if (s) s.texture.dispose();
    this.wallTexCache.clear();
    this.flatTexCache.clear();
    this.spriteTexCache.clear();
  }
}

// ── setWallUVs helper ──

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
    // Offset changes are runtime-only metadata on some backends.
  }
}

function setBabylonMeshUVs(mesh, next) {
  if (!next?.length) return false;

  try {
    mesh.makeGeometryUnique?.();
    mesh.markVerticesDataAsUpdatable?.('uv', true);
    mesh.geometry?.markVerticesDataAsUpdatable?.('uv', true);

    if (typeof mesh.setVerticesData === 'function') {
      mesh.setVerticesData('uv', next, true);
    } else if (typeof mesh.updateVerticesData === 'function') {
      mesh.updateVerticesData('uv', next, true, true);
    } else {
      return false;
    }
  } catch {
    return false;
  }

  const applied = mesh?.getVerticesData?.('uv');
  return (
    !!applied && applied.length === next.length && Math.abs((applied[0] ?? 0) - next[0]) < 1e-6
  );
}

function setBabylonBoxFaceUVs(mesh, faceRects) {
  const uvData = mesh?.getVerticesData?.('uv');
  if (!uvData || uvData.length < 48) return false;

  const next = typeof uvData.slice === 'function' ? uvData.slice() : Float32Array.from(uvData);
  const setFace = (faceIndex, rect) => {
    const start = faceIndex * 8;
    next[start] = rect.z;
    next[start + 1] = rect.w;
    next[start + 2] = rect.x;
    next[start + 3] = rect.w;
    next[start + 4] = rect.x;
    next[start + 5] = rect.y;
    next[start + 6] = rect.z;
    next[start + 7] = rect.y;
  };

  for (const [faceIndex, rect] of Object.entries(faceRects)) {
    setFace(Number(faceIndex), rect);
  }

  return setBabylonMeshUVs(mesh, next);
}

function setBabylonPlaneUVs(mesh, ofsU, ofsV, tileU, tileV) {
  const rawUvData = mesh?.getVerticesData?.('uv');
  if (!rawUvData || (rawUvData.length !== 8 && rawUvData.length !== 16)) return false;

  const next =
    typeof rawUvData.slice === 'function' ? rawUvData.slice() : Float32Array.from(rawUvData);
  const writeFace = start => {
    next[start] = ofsU + tileU;
    next[start + 1] = ofsV + tileV;
    next[start + 2] = ofsU;
    next[start + 3] = ofsV + tileV;
    next[start + 4] = ofsU;
    next[start + 5] = ofsV;
    next[start + 6] = ofsU + tileU;
    next[start + 7] = ofsV;
  };

  writeFace(0);
  if (next.length === 16) writeFace(8);
  return setBabylonMeshUVs(mesh, next);
}

function setWallUVs(meshId, wallDoomLen, wallDoomH, texWidth, texHeight, xoff, yoff) {
  const mesh = getMesh(meshId);
  if (!mesh || !texWidth || !texHeight) return;

  const uvAttr = mesh.geometry?.attributes?.uv ?? mesh.geometry?.getAttribute?.('uv');

  const tileU = wallDoomLen / texWidth;
  const tileV = wallDoomH / texHeight;
  const ofsU = (xoff || 0) / texWidth;
  const ofsV = (yoff || 0) / texHeight;
  const setFace = (start, tu, tv) => {
    uvAttr.setXY(start, ofsU, ofsV);
    uvAttr.setXY(start + 1, ofsU + tu, ofsV);
    uvAttr.setXY(start + 2, ofsU, ofsV + tv);
    uvAttr.setXY(start + 3, ofsU + tu, ofsV + tv);
  };

  if (uvAttr?.count === 4 || uvAttr?.array?.length === 8) {
    setFace(0, tileU, tileV);
    uvAttr.needsUpdate = true;
    return;
  }

  if (!uvAttr) {
    if (setBabylonPlaneUVs(mesh, ofsU, ofsV, tileU, tileV)) return;

    const faceRects = {
      // Babylon box face order: front, back, right, left, top, bottom.
      0: { x: ofsU, y: ofsV, z: ofsU + tileU, w: ofsV + tileV },
      1: { x: ofsU, y: ofsV, z: ofsU + tileU, w: ofsV + tileV },
      2: { x: ofsU, y: ofsV, z: ofsU + 0.5, w: ofsV + tileV },
      3: { x: ofsU, y: ofsV, z: ofsU + 0.5, w: ofsV + tileV },
      4: { x: ofsU, y: ofsV, z: ofsU + tileU, w: ofsV + 0.5 },
      5: { x: ofsU, y: ofsV, z: ofsU + tileU, w: ofsV + 0.5 },
    };

    const texture = getMeshTexture(mesh);
    if (!texture) return;
    if (setBabylonBoxFaceUVs(mesh, faceRects)) {
      engine.setTextureRepeat(texture, 1, 1);
      applyTextureOffsets(texture, 0, 0);
      return;
    }
    engine.setTextureRepeat(texture, tileU, tileV);
    applyTextureOffsets(texture, ofsU, ofsV);
    return;
  }

  setFace(16, tileU, tileV);
  setFace(20, tileU, tileV);
  setFace(0, 0.5, tileV);
  setFace(4, 0.5, tileV);
  setFace(8, tileU, 0.5);
  setFace(12, tileU, 0.5);

  uvAttr.needsUpdate = true;
}

// ── Public API (exposeTo pattern) ──

export function wadApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        WADLoader,
        WADTextureManager,
        convertWADMap,
        setWallUVs,
        THING_MONSTERS,
        THING_ITEMS,
        THING_SPRITE_PREFIX,
      });
    },
  };
}
