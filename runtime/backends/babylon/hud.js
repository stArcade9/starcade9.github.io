// runtime/backends/babylon/hud.js
// 2D HUD and framebuffer composite helpers for the Babylon backend.

import { normalizeColorValue } from './common.js';

export function createBabylonHudApi(self) {
  return {
    _compositeFramebuffer() {
      if (!self._hudCtx) return;
      const W = self.fb.width;
      const H = self.fb.height;
      const src = self.fb.pixels;
      let hasContent = false;
      let nonZeroPixels = 0;

      for (let i = 0; i < W * H * 4; i += 4) {
        if (src[i + 3] > 0) {
          hasContent = true;
          nonZeroPixels++;
        }
      }

      if (globalThis._debugLogger?.devOnly) {
        self._compositeDebugCounter++;
        if (self._compositeDebugCounter % 60 === 0 && hasContent) {
          globalThis._debugLogger.devOnly(
            `Framebuffer composite: ${nonZeroPixels} non-zero pixels`
          );
        }
      }

      if (!hasContent) return;

      if (!self._fbCanvas) {
        self._fbCanvas = document.createElement('canvas');
        self._fbCanvasCtx = self._fbCanvas.getContext('2d', { alpha: true });
      }
      if (self._fbCanvas.width !== W || self._fbCanvas.height !== H) {
        self._fbCanvas.width = W;
        self._fbCanvas.height = H;
      }

      if (!self._fbImageData || self._fbImageData.width !== W || self._fbImageData.height !== H) {
        self._fbImageData = self._fbCanvasCtx.createImageData(W, H);
      }

      const dst = self._fbImageData.data;
      for (let i = 0; i < W * H; i++) {
        const s = i * 4;
        dst[s] = src[s] / 257;
        dst[s + 1] = src[s + 1] / 257;
        dst[s + 2] = src[s + 2] / 257;
        dst[s + 3] = src[s + 3] / 257;
      }

      self._fbCanvasCtx.putImageData(self._fbImageData, 0, 0);
      self._hudCtx.globalCompositeOperation = 'source-over';
      self._hudCtx.drawImage(self._fbCanvas, 0, 0);
    },

    cls(color = 0x000000) {
      if (!self._hudCtx) return;
      const colorNum = normalizeColorValue(color);
      const r = (colorNum >> 16) & 0xff;
      const g = (colorNum >> 8) & 0xff;
      const b = colorNum & 0xff;
      self._hudCtx.fillStyle = `rgb(${r},${g},${b})`;
      self._hudCtx.fillRect(0, 0, self.w, self.h);
    },

    print(text, x, y, color = 0xffffff, size = 12) {
      if (!self._hudCtx) return;
      const colorNum = normalizeColorValue(color);
      const r = (colorNum >> 16) & 0xff;
      const g = (colorNum >> 8) & 0xff;
      const b = colorNum & 0xff;
      self._hudCtx.fillStyle = `rgb(${r},${g},${b})`;
      self._hudCtx.font = `${size}px monospace`;
      self._hudCtx.fillText(String(text), x, y + size);
    },
  };
}
