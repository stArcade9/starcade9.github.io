// Every nova64.draw.* function (print, printCentered, drawGlowTextCentered,
// drawProgressBar, drawPixelBorder, drawWave, drawStarburst, rect, rectfill,
// circle, cls, line, ...) expects a packed 64-bit RGBA64 color — the same
// format nova64.draw.rgba8(r,g,b,a) produces — NOT a plain 0xRRGGBB hex int.
// Passing a plain hex int is silently misread by the strict bit-unpacking
// (see runtime/font.js's unpackRGBA64 / runtime/api-2d.js's _unpack) and
// renders as near-black regardless of the intended color. This has no effect
// on 3D mesh/light colors (nova64.scene.*/nova64.light.*), which are a
// separate, plain-hex Three.js color system — only the 2D overlay/HUD layer
// needs this conversion.
declare const nova64: any;

export function packColor(hex: number, alpha = 255): unknown {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return nova64.draw.rgba8(r, g, b, alpha);
}
