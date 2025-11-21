// runtime/gpu-canvas2d.js
import { Framebuffer64 } from './framebuffer.js';

export class GpuCanvas2D {
  constructor(canvas, w, h) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false });
    this.fb = new Framebuffer64(w, h);
    this.imageData = this.ctx.createImageData(w, h);
    this.tmp8 = this.imageData.data;
    this.w = w; this.h = h;
  }

  beginFrame() {
    // no-op
  }

  endFrame() {
    // Down-convert RGBA64 (16-bit per channel) to RGBA8 with simple ordered dithering
    const { w, h } = { w: this.w, h: this.h };
    const p = this.fb.pixels;
    const dither = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]; // 4x4 Bayer normalized by /16
    let k = 0;
    for (let y=0;y<h;y++) {
      for (let x=0;x<w;x++) {
        const i = (y*w + x) * 4;
        const t = dither[(y&3)*4 + (x&3)] / 16;
        // 16-bit -> 8-bit (divide by 257), add tiny dither
        const r8 = Math.max(0, Math.min(255, ((p[i]   / 257) + t)))|0;
        const g8 = Math.max(0, Math.min(255, ((p[i+1] / 257) + t)))|0;
        const b8 = Math.max(0, Math.min(255, ((p[i+2] / 257) + t)))|0;
        const a8 = Math.max(0, Math.min(255, (p[i+3] / 257)))|0;
        this.tmp8[k++] = r8;
        this.tmp8[k++] = g8;
        this.tmp8[k++] = b8;
        this.tmp8[k++] = a8;
      }
    }
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  // API surface used by stdApi to draw into the FB
  getFramebuffer() { return this.fb; }
}
