// runtime/framebuffer.js
export class Framebuffer64 {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.pixels = new Uint16Array(w * h * 4); // RGBA16 per pixel
  }

  fill(r=0, g=0, b=0, a=65535) {
    const p = this.pixels;
    for (let i=0; i<p.length; i+=4) {
      p[i] = r; p[i+1] = g; p[i+2] = b; p[i+3] = a;
    }
  }

  pset(x, y, r, g, b, a=65535) {
    if (x<0 || y<0 || x>=this.width || y>=this.height) return;
    const i = (y * this.width + x) * 4;
    const p = this.pixels;
    p[i] = r; p[i+1] = g; p[i+2] = b; p[i+3] = a;
  }
}
