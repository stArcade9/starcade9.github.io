// Coastal Signal — shared ocean wave field
//
// Pure math, deliberately kept free of any nova64/rendering dependency: a
// "sum of sines" height field — a handful of travelling sine waves at
// different directions, frequencies, and speeds added together. This is a
// standard, widely-used technique for a stylised ocean surface (the same
// general approach shows up across many independent ocean-shader
// implementations, including the well-known Gerstner/sum-of-sines family
// used in things like aframe-extras' ocean component) — this is an
// original implementation written for Nova64, not a copy of any one
// project's code.
//
// Kept isolated like this on purpose: today it's evaluated in plain
// TypeScript once per water tile per frame (see ocean-surface.ts), but the
// height/slope formulas below are written so they could be ported into a
// GLSL vertex shader almost as-is if this ever graduates into a true
// per-vertex engine-level ocean (nova64.scene.createOceanSurface or
// similar) — same formula, just evaluated per-vertex on the GPU instead of
// per-tile on the CPU.

export interface WaveFieldOptions {
  /** Overall vertical scale of the wave field, in world units. */
  waveHeight?: number;
}

const DEFAULT_WAVE_HEIGHT = 0.6;

/**
 * Wave height at a given horizontal position and time. Two long-wavelength
 * swells carry almost all of the amplitude (wavelengths of ~50-125 world
 * units) with a much smaller amount of short-wavelength ripple layered on
 * top (~15-18 units) — the swells dominate on purpose. Evaluated on a grid
 * of rigid tiles (see ocean-surface.ts) rather than per-vertex, so if
 * adjacent tiles disagree about height by a lot, the water reads as broken
 * tiles rather than a rolling surface; keeping the short-wavelength detail
 * subtle relative to the long swells is what keeps neighbouring tiles
 * roughly agreeing with each other.
 */
export function oceanHeight(x: number, z: number, time: number, waveHeight: number = DEFAULT_WAVE_HEIGHT): number {
  let h = 0;
  h += Math.sin(x * 0.09 + z * 0.05 + time * 0.6) * 0.55;
  h += Math.sin(x * 0.05 - z * 0.11 + time * 0.42 + 1.7) * 0.35;
  h += Math.sin(x * 0.35 + z * 0.28 + time * 1.3) * 0.08;
  h += Math.sin(x * 0.5 - z * 0.4 + time * 1.8) * 0.05;
  return h * waveHeight;
}

/**
 * Local slope of the height field at (x, z), via finite differences — the
 * same technique a per-vertex shader would use to derive a normal from the
 * height field. Used here to tilt each water tile to roughly match the
 * wave surface it's sitting on, instead of a purely cosmetic bob.
 */
export function oceanSlope(
  x: number,
  z: number,
  time: number,
  waveHeight: number = DEFAULT_WAVE_HEIGHT,
  eps: number = 0.5,
): { dx: number; dz: number } {
  const hL = oceanHeight(x - eps, z, time, waveHeight);
  const hR = oceanHeight(x + eps, z, time, waveHeight);
  const hD = oceanHeight(x, z - eps, time, waveHeight);
  const hU = oceanHeight(x, z + eps, time, waveHeight);
  return { dx: (hR - hL) / (2 * eps), dz: (hU - hD) / (2 * eps) };
}
