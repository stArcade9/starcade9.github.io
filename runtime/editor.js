// runtime/editor.js
// Simple in-browser sprite editor for the loaded sprite sheet.
import { loadImageElement } from './assets.js';

export class SpriteEditor {
  constructor(spriteApi) {
    this.spriteApi = spriteApi;
    this.opened = false;
    this.scale = 16; // canvas zoom
    this.brush = { r:255, g:255, b:255, a:255 };
    this._buildUI();
  }

  _buildUI() {
    const wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.inset = '0';
    wrap.style.display = 'none';
    wrap.style.background = 'rgba(0,0,0,0.8)';
    wrap.style.zIndex = '9999';
    wrap.style.placeItems = 'center';
    wrap.style.gridTemplateRows = 'auto auto';
    wrap.style.padding = '16px';

    const panel = document.createElement('div');
    panel.style.background = '#151822';
    panel.style.border = '1px solid #1f2433';
    panel.style.borderRadius = '12px';
    panel.style.padding = '12px';
    panel.style.display = 'grid';
    panel.style.gap = '8px';
    panel.style.color = '#dcdfe4';

    const row = (children=[])=>{
      const r = document.createElement('div');
      r.style.display = 'flex';
      r.style.gap = '8px';
      r.style.alignItems = 'center';
      children.forEach(c=>r.appendChild(c));
      return r;
    };

    const title = document.createElement('div');
    title.textContent = 'Sprite Editor';
    title.style.fontWeight = '700';
    const info = document.createElement('div');
    info.textContent = 'Paint directly on the sprite sheet. Save applies to the running cart.';
    info.style.fontSize = '12px'; info.style.opacity = '0.7';

    const canvas = document.createElement('canvas');
    canvas.style.background = '#000';
    canvas.style.borderRadius = '8px';
    canvas.style.imageRendering = 'pixelated';
    this.canvas = canvas;

    const color = document.createElement('input');
    color.type = 'color'; color.value = '#ffffff';
    color.addEventListener('input', ()=>{
      const hex = color.value.replace('#','');
      const r = parseInt(hex.slice(0,2),16);
      const g = parseInt(hex.slice(2,4),16);
      const b = parseInt(hex.slice(4,6),16);
      this.brush.r = r; this.brush.g = g; this.brush.b = b;
    });
    const alpha = document.createElement('input');
    alpha.type = 'range'; alpha.min='0'; alpha.max='255'; alpha.value='255';
    alpha.addEventListener('input', ()=>{ this.brush.a = parseInt(alpha.value,10); });

    const scaleSel = document.createElement('select');
    [8,12,16,20,24,32].forEach(s=>{
      const opt = document.createElement('option');
      opt.value = String(s); opt.textContent = s+'x';
      if (s===this.scale) opt.selected = true;
      scaleSel.appendChild(opt);
    });
    scaleSel.addEventListener('change', ()=>{
      this.scale = parseInt(scaleSel.value,10);
      this._resizeCanvas();
      this._redraw();
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save to runtime';
    saveBtn.addEventListener('click', async ()=>{
      await this.applyToRuntime();
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', ()=> this.close());

    panel.appendChild(title);
    panel.appendChild(info);
    panel.appendChild(row([document.createTextNode('Zoom'), scaleSel, document.createTextNode('Color'), color, document.createTextNode('Alpha'), alpha, saveBtn, closeBtn]));
    panel.appendChild(canvas);

    wrap.appendChild(panel);
    document.body.appendChild(wrap);

    this.wrap = wrap;

    // interactions
    let painting = false;
    const onPaint = (e)=>{
      if (!painting) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / this.scale);
      const y = Math.floor((e.clientY - rect.top) / this.scale);
      this._plot(x,y, this.brush);
    };
    canvas.addEventListener('mousedown', (e)=>{ painting=true; onPaint(e); });
    window.addEventListener('mousemove', onPaint);
    window.addEventListener('mouseup', ()=>{ painting=false; });
  }

  async open() {
    const img = this.spriteApi.getSpriteSheetImage?.();
    if (!img) { alert('Sprite sheet not loaded in this cart.'); return; }
    await this._loadImage(img);
    this.opened = true;
    this.wrap.style.display = 'grid';
  }
  close() { this.opened = false; this.wrap.style.display = 'none'; }

  async _loadImage(img) {
    // draw image into editor canvas
    this.img = img;
    this.sheetW = img.naturalWidth;
    this.sheetH = img.naturalHeight;
    this._resizeCanvas();
    const ctx = this.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    this._redraw(); // draw grid
  }

  _resizeCanvas() {
    this.canvas.width = this.sheetW * this.scale;
    this.canvas.height = this.sheetH * this.scale;
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
  }

  _plot(x, y, {r,g,b,a}) {
    if (x<0||y<0||x>=this.sheetW||y>=this.sheetH) return;
    const ctx = this.canvas.getContext('2d');
    const imgd = ctx.getImageData(x, y, 1, 1);
    imgd.data[0]=r; imgd.data[1]=g; imgd.data[2]=b; imgd.data[3]=a;
    ctx.putImageData(imgd, x, y);
    // upscale pixel block
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.canvas, x, y, 1, 1, x*this.scale, y*this.scale, this.scale, this.scale);
    // grid overlay redraw for that cell
  }

  _redraw() {
    const ctx = this.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.img, 0, 0);
    // draw grid overlay
    ctx.save();
    ctx.scale(this.scale, this.scale);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#3a3f55';
    ctx.lineWidth = 1/this.scale;
    for (let x=0; x<=this.sheetW; x+=8) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,this.sheetH); ctx.stroke(); }
    for (let y=0; y<=this.sheetH; y+=8) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(this.sheetW,y); ctx.stroke(); }
    ctx.restore();
  }

  async applyToRuntime() {
    const dataURL = this.canvas.toDataURL('image/png');
    await this.spriteApi.applySpriteSheetDataURL(dataURL);
    alert('Sprite sheet applied to runtime.');
  }
}

export function editorApi(spriteApi) {
  const editor = new SpriteEditor(spriteApi);
  return {
    exposeTo(target) {
      Object.assign(target, {
        openSpriteEditor: ()=>editor.open(),
        closeSpriteEditor: ()=>editor.close()
      });
    },
    open: ()=>editor.open()
  };
}
