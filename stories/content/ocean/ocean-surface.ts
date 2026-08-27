// Coastal Signal — shared ocean surface
//
// Builds and animates a grid of reflective tiles using nova64.scene's
// existing primitives (createPlane/setPosition/setRotation/loadTexture) —
// the only surface carts currently have available, since there's no
// nova64.scene hook to hand a cart a custom mesh+shader (no
// createMesh/setMaterial exposed to cart code, and bundling a second copy
// of three.js into a cart bundle just to build one isn't worth the size/
// duplication cost). So this is a CPU/tile approximation of a shader-driven
// ocean, not the real thing — each tile's height AND tilt are driven by the
// same wave-field math a real per-vertex shader would use (see
// wave-field.ts), evaluated once per tile per frame instead of once per
// vertex per frame on the GPU.
//
// Two things this file specifically works around:
//
// 1. A `metallic:true` + very low roughness material is a near-mirror in
//    PBR terms — at that combination almost ALL of its visible colour
//    comes from reflecting the scene's environment map, with very little
//    diffuse contribution from its own base colour. Nova64's environment
//    map is a generic neutral studio preset (see gpu-threejs.js's
//    setupN64Lighting), not the sky — so a plain metallic water material
//    can render close to black if that environment doesn't happen to be
//    bright/colourful in the right spot. To sidestep depending on how
//    bright that environment map turns out to be, tiles use
//    `emissiveIntensity` (in createN64Material's "holographic" branch —
//    see runtime/backends/threejs/gpu-threejs.js) so their blue colour is
//    always visible as emitted light, independent of any reflection.
// 2. Since carts can't build a custom shader (see above), a canvas-drawn
//    texture (gradient + a few streak highlights, generated once at
//    startup, no external assets) stands in for the "shiny water" detail a
//    real shader would paint per-pixel — nova64.scene.loadTexture() already
//    supports data: URLs via three.js's TextureLoader, so this needs no
//    engine changes either.
//
// Deliberately isolated in its own file/module so this can graduate into a
// true nova64.scene.createOceanSurface() (real subdivided geometry + a
// custom vertex/fragment shader, wave math ported straight from
// wave-field.ts) later without disturbing how chapters use it — chapters
// only interact with the OceanSurface class below, not the tile mechanics.
import { oceanHeight, oceanSlope } from './wave-field';

declare const nova64: any;

export interface OceanSurfaceOptions {
  rows: number;
  cols: number;
  /** Total span covered, in world units. */
  width: number;
  depth: number;
  originX?: number;
  originY?: number;
  originZ?: number;
  waveHeight?: number;
  colorDeep?: number;
  colorShallow?: number;
  opacity?: number;
  /** Tiles whose centre falls within this radius of (originX, originZ) are skipped — a dry patch. */
  centerHoleRadius?: number;
  /** Seeded RNG (mulberry32 etc.) for per-tile jitter — keeps a token's ocean deterministic. */
  rand: () => number;
}

interface OceanTile {
  mesh: any;
  baseX: number;
  baseZ: number;
  baseY: number;
  // Each tile's own small independent bob (own phase/speed/amplitude,
  // unrelated to the shared wave-field) — the actual technique a well-known
  // reference ocean implementation uses (per-vertex randomised angle/
  // amplitude/speed on a flat-shaded, modestly-subdivided plane) rather
  // than a smooth continuous shader surface. Applied on top of the shared
  // wave height so neighbouring tiles don't move in perfect lockstep,
  // which is what actually reads as glittering water instead of one
  // uniform surface undulating as a block.
  jitterPhase: number;
  jitterSpeed: number;
  jitterAmp: number;
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.max(0, Math.min(255, Math.round(a + (b - a) * t)));
}

function mixColor(a: number, b: number, t: number): number {
  const r = lerpChannel((a >> 16) & 0xff, (b >> 16) & 0xff, t);
  const g = lerpChannel((a >> 8) & 0xff, (b >> 8) & 0xff, t);
  const bl = lerpChannel(a & 0xff, b & 0xff, t);
  return (r << 16) | (g << 8) | bl;
}

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/**
 * A small canvas-drawn water texture: a vertical deep→shallow gradient plus
 * a handful of wavy horizontal highlight streaks (a cheap stand-in for
 * specular glints) and a light scatter of bright flecks (a stand-in for
 * sparkle/foam catching the light). Generated once, tiled across every
 * tile via REPEAT wrapping (createN64Material already sets that up for any
 * texture). Returns a data: URL, which nova64.scene.loadTexture() accepts
 * directly (three.js's TextureLoader natively supports data: URLs).
 */
function createWaterTextureDataUrl(colorDeep: number, colorShallow: number, rand: () => number): string {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, hexToCss(colorShallow));
  gradient.addColorStop(1, hexToCss(colorDeep));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  const streakCount = 10;
  for (let i = 0; i < streakCount; i++) {
    const baseY = ((i + 0.5) / streakCount) * size;
    const phase = rand() * Math.PI * 2;
    ctx.globalAlpha = 0.35 + rand() * 0.4;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const y = baseY + Math.sin(x * 0.08 + phase) * 8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  const flecks = 70;
  for (let i = 0; i < flecks; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.6 + rand() * 1.4;
    ctx.globalAlpha = 0.3 + rand() * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL();
}

export class OceanSurface {
  private tiles: OceanTile[] = [];
  private waveHeight: number;
  private colorDeep: number;
  private colorShallow: number;
  private foamColor: number;
  // A single large, flat, static plane well beyond the detailed tile grid —
  // the grid only needs to cover where the camera actually looks closely;
  // this backdrop means there's always water-coloured surface extending far
  // past the grid's own edges instead of a visible boundary where the
  // tiles just stop. Never animated (no wave motion, no jitter) since at
  // that distance it reads the same either way and animating it would be
  // wasted cost.
  private horizonMesh: any = null;
  // Sampled well wider than the tile spacing, so slope reflects the
  // dominant long-wavelength swell rather than short-wavelength ripple —
  // keeps neighbouring tiles agreeing with each other on which way they're
  // tilting, instead of each one reacting to its own tiny local wiggle.
  private slopeSampleEps: number;
  // wave-field.ts's coefficients are tuned assuming "time" advances like
  // real seconds. Chapter One was calling update(dist) — dist grows ~7-12
  // units/sec, 7-12x faster than a second — so its waves were completing a
  // full cycle roughly every ~1s instead of the intended ~10s, which is
  // exactly what "pulsates" was: not a rendering bug, a pacing bug. Tracking
  // an internal phase advanced by dt decouples wave speed from whatever
  // "time" concept each caller happens to use (dist, wall-clock seconds,
  // whatever) — update() takes a per-frame delta now, not an absolute value.
  private phase = 0;

  constructor(options: OceanSurfaceOptions) {
    const {
      rows,
      cols,
      width,
      depth,
      originX = 0,
      originY = 0,
      originZ = 0,
      waveHeight = 0.6,
      colorDeep = 0x0a3d5c,
      colorShallow = 0x2fa9c9,
      opacity = 1,
      centerHoleRadius = 0,
      rand,
    } = options;

    this.waveHeight = waveHeight;
    this.colorDeep = colorDeep;
    this.colorShallow = colorShallow;
    this.foamColor = mixColor(colorShallow, 0xffffff, 0.7);

    const spacingX = width / cols;
    const spacingZ = depth / rows;
    this.slopeSampleEps = Math.max(spacingX, spacingZ) * 1.5;
    // Generous overlap (tiles are ~80% larger than their grid spacing) so
    // gaps never show between tiles as they independently tilt — a coarse
    // rigid grid reads as broken water almost entirely because of visible
    // seams, not because of the wave shape itself.
    const tileW = spacingX * 1.8;
    const tileD = spacingZ * 1.8;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const baseX = originX - width / 2 + (col / Math.max(1, cols - 1)) * width;
        const baseZ = originZ - depth / 2 + (row / Math.max(1, rows - 1)) * depth;
        if (centerHoleRadius > 0 && Math.hypot(baseX - originX, baseZ - originZ) < centerHoleRadius) continue;

        // Both `metallic:true` (metalness 0.9) and emissiveIntensity>0.5
        // (createN64Material's "holographic" branch, metalness 0.8) put
        // this on a PBR metal path — and at high metalness almost ALL of a
        // material's visible brightness comes from specular/environment
        // reflection, not from its own `color`, by design (real metals
        // have near-zero diffuse response). That's exactly what read as
        // "dark, flat, no shading, looks opaque": the fixed emissive floor
        // was carrying nearly the whole picture, and the per-frame `color`
        // updates barely registered. Leaving `metallic` unset routes to
        // createN64Material's plain MeshLambertMaterial branch instead —
        // ordinary diffuse shading, driven directly by `color` and the
        // scene's actual lights, which is what reliably produces visible
        // shading as a tile's normal changes with the wave slope. A low,
        // fixed emissive floor (kept ≤0.5 so it does NOT tip into the
        // holographic branch) still guarantees the surface is never fully
        // black in deep shadow, without dominating the diffuse response.
        // flatShading is what a faceted low-poly water surface actually
        // relies on — every other low-poly object in this project already
        // uses it (clouds, peaks, cliffs, shells); the ocean tiles never
        // had it, which is a real part of why they read as flatter/duller
        // than everything else instead of catching light per-facet.
        const mesh = nova64.scene.createPlane(tileW, tileD, colorShallow, [baseX, originY, baseZ], {
          emissive: colorDeep,
          emissiveIntensity: 0.44,
          flatShading: true,
          transparent: opacity < 1,
          opacity,
        });
        nova64.scene.setRotation(mesh, -Math.PI / 2, 0, 0);
        this.tiles.push({
          mesh,
          baseX,
          baseZ,
          baseY: originY,
          jitterPhase: rand() * Math.PI * 2,
          jitterSpeed: 1.4 + rand() * 1.8,
          jitterAmp: 0.04 + rand() * 0.07,
        });
      }
    }

    // Positioned safely below the lowest point any tile could dip to (wave
    // + jitter combined) so it never pokes through the animated tiles near
    // the camera — it's only ever visible past the detailed grid's edges.
    const horizonSize = Math.max(width, depth) * 6;
    const lowestTileDip = waveHeight * 1.1 + 0.12;
    this.horizonMesh = nova64.scene.createPlane(
      horizonSize,
      horizonSize,
      colorDeep,
      [originX, originY - lowestTileDip, originZ],
      { emissive: colorDeep, emissiveIntensity: 0.4, flatShading: true },
    );
    nova64.scene.setRotation(this.horizonMesh, -Math.PI / 2, 0, 0);

    const textureUrl = createWaterTextureDataUrl(colorDeep, colorShallow, rand);
    if (textureUrl) {
      nova64.scene.loadTexture(textureUrl)?.then?.((texture: any) => {
        for (const t of this.tiles) {
          if (!t.mesh?.material) continue;
          t.mesh.material.map = texture;
          t.mesh.material.needsUpdate = true;
        }
      });
    }
  }

  /** Call once per frame with the frame's dt (seconds) — NOT an absolute time/dist value. */
  update(dt: number): void {
    this.phase += dt;
    const time = this.phase;
    for (const t of this.tiles) {
      const h = oceanHeight(t.baseX, t.baseZ, time, this.waveHeight);
      const slope = oceanSlope(t.baseX, t.baseZ, time, this.waveHeight, this.slopeSampleEps);
      // Each tile's own independent bob, layered on top of the shared wave
      // shape — small enough not to break the overall swell, but enough
      // that neighbouring tiles are never in perfect lockstep.
      const jitter = Math.sin(time * t.jitterSpeed + t.jitterPhase) * t.jitterAmp;
      nova64.scene.setPosition(t.mesh, t.baseX, t.baseY + h + jitter, t.baseZ);
      // Tilt the tile to roughly match the wave surface's local slope at
      // its centre — kept gentle (not a 1:1 match to the raw slope) so
      // tiles stay closer to coplanar with their neighbours instead of
      // visibly gapping apart at the edges.
      nova64.scene.setRotation(t.mesh, -Math.PI / 2 - slope.dz * 0.22, 0, slope.dx * 0.22);

      // Colour tracks the ACTUAL current wave height every frame — crests
      // read lighter with a foam highlight, troughs read darker/deeper —
      // instead of a fixed random tint assigned once at creation, which
      // just looked like a random patchwork unrelated to the motion. Only
      // `color` updates (not `emissive`, which stays fixed — see
      // constructor) so this drives real normal/lighting-dependent shading
      // as tiles tilt, instead of a flat additive glow overriding it.
      const depthMix = Math.max(0, Math.min(1, (h / Math.max(this.waveHeight, 0.001)) * 0.5 + 0.5));
      let color = mixColor(this.colorDeep, this.colorShallow, depthMix);
      if (depthMix > 0.72) {
        color = mixColor(color, this.foamColor, (depthMix - 0.72) / 0.28);
      }
      t.mesh.material.color.setHex(color);
    }
  }
}
