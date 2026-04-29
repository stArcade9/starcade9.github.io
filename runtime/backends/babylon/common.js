// runtime/backends/babylon/common.js
// Shared Babylon backend helpers.

import { Color3, Vector3 } from '@babylonjs/core';

function toFiniteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeColorValue(color) {
  return typeof color === 'bigint' ? Number(color) : (color ?? 0);
}

export function hexToColor3(hex) {
  const value = normalizeColorValue(hex);
  return new Color3(
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255
  );
}

export function normalizePosition(pos) {
  if (Array.isArray(pos) && pos.length >= 3) return new Vector3(pos[0], pos[1], pos[2]);
  if (pos && typeof pos === 'object' && pos.x !== undefined) {
    return new Vector3(pos.x, pos.y ?? 0, pos.z ?? 0);
  }
  return Vector3.Zero();
}

export function normalizeVectorArgs(x, y, z, fallback = 0) {
  if (Array.isArray(x)) {
    return {
      x: toFiniteNumber(x[0], fallback),
      y: toFiniteNumber(x[1], fallback),
      z: toFiniteNumber(x[2], fallback),
    };
  }

  if (x && typeof x === 'object') {
    return {
      x: toFiniteNumber(x.x, fallback),
      y: toFiniteNumber(x.y, fallback),
      z: toFiniteNumber(x.z, fallback),
    };
  }

  return {
    x: toFiniteNumber(x, fallback),
    y: toFiniteNumber(y, fallback),
    z: toFiniteNumber(z, fallback),
  };
}

export function normalizePointLightArgs(distanceOrPosition, x, y, z, defaultDistance = 20) {
  if (
    Array.isArray(distanceOrPosition) ||
    (distanceOrPosition && typeof distanceOrPosition === 'object')
  ) {
    return {
      distance: defaultDistance,
      position: normalizeVectorArgs(distanceOrPosition, 0, 0, 0),
    };
  }

  if (Array.isArray(x) || (x && typeof x === 'object')) {
    return {
      distance: toFiniteNumber(distanceOrPosition, defaultDistance),
      position: normalizeVectorArgs(x, y, z, 0),
    };
  }

  return {
    distance: toFiniteNumber(distanceOrPosition, defaultDistance),
    position: normalizeVectorArgs(x, y, z, 0),
  };
}

export function isBabylonVerboseDebugEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('babylonDebug') === '1') return true;
  try {
    return window.localStorage?.getItem('nova64:babylonDebug') === '1';
  } catch {
    return false;
  }
}
