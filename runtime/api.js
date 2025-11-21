// runtime/api.js
// Helpers to pack/unpack 64-bit color (RGBA64)
function packRGBA64(r16, g16, b16, a16) {
  // Ensure all values are integers before converting to BigInt
  const r = BigInt(Math.floor(r16));
  const g = BigInt(Math.floor(g16));
  const b = BigInt(Math.floor(b16));
  const a = BigInt(Math.floor(a16));
  return (r << 48n) | (g << 32n) | (b << 16n) | a;
}
function unpackRGBA64(c) {
  // Handle both BigInt and regular number inputs
  if (typeof c === 'bigint') {
    return {
      r: Number((c >> 48n) & 0xffffn),
      g: Number((c >> 32n) & 0xffffn),
      b: Number((c >> 16n) & 0xffffn),
      a: Number(c & 0xffffn)
    };
  } else {
    // Handle regular number input - convert to BigInt first
    const bigC = BigInt(Math.floor(c));
    return {
      r: Number((bigC >> 48n) & 0xffffn),
      g: Number((bigC >> 32n) & 0xffffn),
      b: Number((bigC >> 16n) & 0xffffn),
      a: Number(bigC & 0xffffn)
    };
  }
}
function rgba8(r, g, b, a=255) {
  // Clamp input values to 0-255 range and ensure they're integers
  const clampedR = Math.max(0, Math.min(255, Math.floor(r)));
  const clampedG = Math.max(0, Math.min(255, Math.floor(g)));
  const clampedB = Math.max(0, Math.min(255, Math.floor(b)));
  const clampedA = Math.max(0, Math.min(255, Math.floor(a)));
  
  const s = 257;
  return packRGBA64(clampedR * s, clampedG * s, clampedB * s, clampedA * s);
}

import { BitmapFont } from './font.js';

export function stdApi(gpu) {
  const fb = gpu.getFramebuffer();

  // Camera
  const camRef = { x: 0, y: 0 };
  function setCamera(x, y) { camRef.x = x|0; camRef.y = y|0; }
  function getCamera() { return camRef; }

  function _colorToRGBA16(c) {
    if (typeof c === 'bigint' || typeof c === 'number') {
      return unpackRGBA64(c);
    }
    return { r: 65535, g: 65535, b: 65535, a: 65535 };
  }
  function cls(color) {
    const { r, g, b, a } = (typeof color === 'bigint') ? unpackRGBA64(color) : { r:0, g:0, b:0, a:65535 };
    fb.fill(r,g,b,a);
  }
  function pset(x, y, color) {
    const { r, g, b, a } = _colorToRGBA16(color);
    fb.pset((x|0)-camRef.x, (y|0)-camRef.y, r,g,b,a);
  }
  function line(x0, y0, x1, y1, color) {
    const { r, g, b, a } = _colorToRGBA16(color);
    x0 = (x0|0)-camRef.x; y0 = (y0|0)-camRef.y; x1 = (x1|0)-camRef.x; y1 = (y1|0)-camRef.y;
    let dx = Math.abs(x1-x0), sx = x0<x1 ? 1 : -1;
    let dy = -Math.abs(y1-y0), sy = y0<y1 ? 1 : -1;
    let err = dx + dy;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (x0>=0 && y0>=0 && x0<fb.width && y0<fb.height) fb.pset(x0, y0, r,g,b,a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2*err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function rect(x, y, w, h, color, fill = false) {
    const { r, g, b, a } = _colorToRGBA16(color);
    x = (x|0)-camRef.x; y = (y|0)-camRef.y; w|=0; h|=0;
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(fb.width, x + w), y1 = Math.min(fb.height, y + h);
    if (fill) {
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) fb.pset(xx, yy, r,g,b,a);
      }
    } else {
      for (let xx = x0; xx < x1; xx++) {
        if (y>=0 && y<fb.height) fb.pset(xx, y, r,g,b,a);
        if ((y+h-1)>=0 && (y+h-1)<fb.height) fb.pset(xx, y+h-1, r,g,b,a);
      }
      for (let yy = y0; yy < y1; yy++) {
        if (x>=0 && x<fb.width) fb.pset(x, yy, r,g,b,a);
        if ((x+w-1)>=0 && (x+w-1)<fb.width) fb.pset(x+w-1, yy, r,g,b,a);
      }
    }
  }

  function circle(x, y, radius, color, fill = false) {
    const { r, g, b, a } = _colorToRGBA16(color);
    x = (x|0)-camRef.x; y = (y|0)-camRef.y; radius|=0;
    
    if (fill) {
      // Filled circle using scanline algorithm
      for (let dy = -radius; dy <= radius; dy++) {
        const dx = Math.floor(Math.sqrt(radius * radius - dy * dy));
        for (let xx = x - dx; xx <= x + dx; xx++) {
          const yy = y + dy;
          if (xx >= 0 && xx < fb.width && yy >= 0 && yy < fb.height) {
            fb.pset(xx, yy, r, g, b, a);
          }
        }
      }
    } else {
      // Midpoint circle algorithm (Bresenham)
      let dx = radius, dy = 0, err = 0;
      while (dx >= dy) {
        const plots = [
          [x + dx, y + dy], [x + dy, y + dx],
          [x - dy, y + dx], [x - dx, y + dy],
          [x - dx, y - dy], [x - dy, y - dx],
          [x + dy, y - dx], [x + dx, y - dy]
        ];
        for (const [px, py] of plots) {
          if (px >= 0 && px < fb.width && py >= 0 && py < fb.height) {
            fb.pset(px, py, r, g, b, a);
          }
        }
        if (err <= 0) {
          dy += 1;
          err += 2 * dy + 1;
        }
        if (err > 0) {
          dx -= 1;
          err -= 2 * dx + 1;
        }
      }
    }
  }

  function rectfill(x, y, w, h, color) {
    rect(x, y, w, h, color, true);
  }

  function print(text, x, y, color=rgba8(255,255,255,255), scale=1) {
    // Support text scaling
    if (scale === 1) {
      BitmapFont.draw(fb, text, (x|0)-camRef.x, (y|0)-camRef.y, color);
    } else {
      // For larger text, we'll need to draw each character scaled
      // For now, just draw normally
      BitmapFont.draw(fb, text, (x|0)-camRef.x, (y|0)-camRef.y, color);
    }
  }

  return {
    exposeTo(target) {
      Object.assign(target, { cls, pset, line, rect, rectfill, circle, print, packRGBA64, rgba8, setCamera, getCamera });
    }
  };
}

export { packRGBA64, rgba8, unpackRGBA64 };
