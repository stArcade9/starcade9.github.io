// runtime/gpu-webgl2.js
// WebGL2 backend with RGBA16F upload + tone mapping and a simple sprite renderer.
import { Framebuffer64 } from './framebuffer.js';

const VERT_FSQ = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = 0.5 * (a_pos + 1.0);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG_TONEMAP = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o_col;
uniform sampler2D u_tex;
// Simple ACES-like tonemapper (approx) then gamma to sRGB.
vec3 tonemapACES( vec3 x ) {
  float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}
void main() {
  vec4 c = texture(u_tex, v_uv);
  c.rgb = tonemapACES(c.rgb);
  c.rgb = pow(c.rgb, vec3(1.0/2.2));
  o_col = c;
}`;

// Sprite shader (screen-space)
const VERT_SPR = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;      // quad verts in pixels (0..1) scaled in VS
layout(location=1) in vec2 i_pos;      // instance: screen position (pixels)
layout(location=2) in vec2 i_size;     // instance: size in pixels
layout(location=3) in vec4 i_uv;       // instance: uv rect (u0,v0,u1,v1)
out vec2 v_uv;
uniform vec2 u_resolution;
void main() {
  vec2 px = i_pos + a_pos * i_size;     // pixel space
  v_uv = mix(i_uv.xy, i_uv.zw, a_pos);
  vec2 ndc = (px / u_resolution)*2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
}`;

const FRAG_SPR = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o_col;
uniform sampler2D u_tex;
void main(){
  vec4 c = texture(u_tex, v_uv);
  o_col = c;
}`;

export class GpuWebGL2 {
  constructor(canvas, w, h) {
    this.canvas = canvas;
    /** @type {WebGL2RenderingContext} */
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    this.fb = new Framebuffer64(w, h);
    this.w = w; this.h = h;

    // Programs
    this.progFSQ = this._makeProgram(VERT_FSQ, FRAG_TONEMAP);
    this.progSPR = this._makeProgram(VERT_SPR, FRAG_SPR);

    // Fullscreen triangle VBO
    this.vboFSQ = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboFSQ);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

    // Quad for sprites (two-triangle unit quad encoded as [0,0]-[1,1])
    this.vboQuad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboQuad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0,0, 1,0, 0,1,
      1,0, 1,1, 0,1
    ]), gl.STATIC_DRAW);

    // Instance buffers
    this.instPos = gl.createBuffer();
    this.instSize = gl.createBuffer();
    this.instUV = gl.createBuffer();

    // Texture for framebuffer upload (RGBA16F, accepts FLOAT data)
    this.texFB = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texFB);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, null);

    this.tmpF32 = new Float32Array(w*h*4); // normalized 0..1

    // Sprite batch state
    this.spriteBatches = new Map(); // texture -> array of instances
    this.texCache = new WeakMap(); // HTMLImageElement -> WebGLTexture

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  _makeProgram(vsSrc, fsSrc) {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, vsSrc); gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs));
    const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, fsSrc); gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs));
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  beginFrame() {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  // Queue a sprite instance; img is HTMLImageElement, uv rect in pixels of the image
  queueSprite(img, sx, sy, sw, sh, dx, dy, scale=1) {
    const gltex = this._getTexture(img);
    let arr = this.spriteBatches.get(gltex);
    if (!arr) { arr = []; this.spriteBatches.set(gltex, arr); }
    arr.push({ sx, sy, sw, sh, dx, dy, scale, tex: gltex, iw: img.naturalWidth, ih: img.naturalHeight });
  }

  _getTexture(img) {
    let tex = this.texCache.get(img);
    if (tex) return tex;
    const gl = this.gl;
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.naturalWidth, img.naturalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
    this.texCache.set(img, tex);
    return tex;
  }

  endFrame() {
    const gl = this.gl;

    // Upload framebuffer as RGBA16F using Float32 normalized data
    const p = this.fb.pixels;
    const f = this.tmpF32;
    let k = 0;
    for (let i=0;i<p.length;i+=4) {
      f[k++] = p[i]   / 65535.0;
      f[k++] = p[i+1] / 65535.0;
      f[k++] = p[i+2] / 65535.0;
      f[k++] = p[i+3] / 65535.0;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texFB);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.w, this.h, gl.RGBA, gl.FLOAT, f);

    // Draw FSQ with tone mapping
    gl.useProgram(this.progFSQ);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texFB);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboFSQ);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Draw sprite batches on top
    if (this.spriteBatches.size) {
      gl.useProgram(this.progSPR);
      const uRes = gl.getUniformLocation(this.progSPR, 'u_resolution');
      gl.uniform2f(uRes, this.canvas.width, this.canvas.height);
      // bind quad verts
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vboQuad);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);

      // instance attribute locations
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instPos);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribDivisor(1, 1);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.instSize);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribDivisor(2, 1);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.instUV);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribDivisor(3, 1);

      for (const [tex, arr] of this.spriteBatches.entries()) {
        const n = arr.length;
        const pos = new Float32Array(n*2);
        const size = new Float32Array(n*2);
        const uvs = new Float32Array(n*4);
        for (let i=0;i<n;i++) {
          const s = arr[i];
          pos[i*2+0] = s.dx;
          pos[i*2+1] = s.dy;
          size[i*2+0] = s.sw * s.scale;
          size[i*2+1] = s.sh * s.scale;
          const u0 = s.sx / s.iw, v0 = s.sy / s.ih;
          const u1 = (s.sx + s.sw) / s.iw, v1 = (s.sy + s.sh) / s.ih;
          uvs[i*4+0] = u0; uvs[i*4+1] = v0; uvs[i*4+2] = u1; uvs[i*4+3] = v1;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instPos); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instSize); gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instUV); gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
      }

      this.spriteBatches.clear();
    }
  }

  // API surface hooks needed by higher-level APIs
  getFramebuffer() { return this.fb; }
  supportsSpriteBatch() { return true; }

  updateTextureForImage(img) {
    const gl = this.gl;
    let tex = this.texCache.get(img);
    if (!tex) {
      tex = gl.createTexture();
      this.texCache.set(img, tex);
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.naturalWidth, img.naturalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
  }

}