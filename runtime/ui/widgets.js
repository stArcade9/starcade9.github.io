// runtime/ui/widgets.js
// Progress bars, shapes, layout helpers, and mouse input

import { unpackRGBA64 } from '../api.js';

/**
 * @param {{ g: object, colors: object, mouse: { x:number, y:number, down:boolean, pressed:boolean },
 *           state: object, drawText: Function, drawTextOutline: Function,
 *           setTextAlign: Function, setTextBaseline: Function }} ctx
 */
export function uiWidgetsModule({
  g,
  colors,
  mouse,
  state,
  drawTextOutline,
  setTextAlign,
  setTextBaseline,
}) {
  // ── Progress bar ──────────────────────────────────────────────────────────
  function drawProgressBar(x, y, width, height, value, maxValue, options = {}) {
    const bgColor = options.bgColor || g.rgba8(50, 50, 50, 255);
    const fillColor = options.fillColor || colors.success;
    const borderColor = options.borderColor || colors.white;
    const showText = options.showText !== undefined ? options.showText : true;
    const textColor = options.textColor || colors.white;

    g.rect(x, y, width, height, bgColor, true);
    const fillWidth = Math.floor((value / maxValue) * width);
    if (fillWidth > 0) g.rect(x, y, fillWidth, height, fillColor, true);
    g.rect(x, y, width, height, borderColor, false);

    if (showText) {
      const text = `${Math.floor(value)}/${Math.floor(maxValue)}`;
      const oldAlign = state.textAlign;
      const oldBaseline = state.textBaseline;
      setTextAlign('center');
      setTextBaseline('middle');
      drawTextOutline(text, x + width / 2, y + height / 2, textColor, colors.black, 1);
      setTextAlign(oldAlign);
      setTextBaseline(oldBaseline);
    }
  }

  // ── Shapes ────────────────────────────────────────────────────────────────
  function drawRoundedRect(x, y, width, height, radius, color, filled = true) {
    if (radius === 0) {
      g.rect(x, y, width, height, color, filled);
      return;
    }
    g.rect(x + radius, y, width - radius * 2, height, color, filled);
    g.rect(x, y + radius, radius, height - radius * 2, color, filled);
    g.rect(x + width - radius, y + radius, radius, height - radius * 2, color, filled);
    g.circle(x + radius, y + radius, radius, color, filled);
    g.circle(x + width - radius, y + radius, radius, color, filled);
    g.circle(x + radius, y + height - radius, radius, color, filled);
    g.circle(x + width - radius, y + height - radius, radius, color, filled);
  }

  function drawGradientRect(x, y, width, height, color1, color2, vertical = true) {
    const steps = vertical ? height : width;
    const c1 = unpackRGBA64(color1);
    const c2 = unpackRGBA64(color2);
    const r1 = Math.floor(c1.r / 257),
      g1 = Math.floor(c1.g / 257),
      b1 = Math.floor(c1.b / 257),
      a1 = Math.floor(c1.a / 257);
    const r2 = Math.floor(c2.r / 257),
      g2 = Math.floor(c2.g / 257),
      b2 = Math.floor(c2.b / 257),
      a2 = Math.floor(c2.a / 257);
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.floor(r1 + (r2 - r1) * ratio);
      const gv = Math.floor(g1 + (g2 - g1) * ratio);
      const b = Math.floor(b1 + (b2 - b1) * ratio);
      const a = Math.floor(a1 + (a2 - a1) * ratio);
      const c = g.rgba8(r, gv, b, a);
      if (vertical) g.rect(x, y + i, width, 1, c, true);
      else g.rect(x + i, y, 1, height, c, true);
    }
  }

  // ── Layout helpers ────────────────────────────────────────────────────────
  function centerX(width, screenWidth = 640) {
    return Math.floor((screenWidth - width) / 2);
  }
  function centerY(height, screenHeight = 360) {
    return Math.floor((screenHeight - height) / 2);
  }

  function grid(cols, rows, cellWidth, cellHeight, paddingX = 0, paddingY = 0) {
    const cells = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({
          x: col * (cellWidth + paddingX),
          y: row * (cellHeight + paddingY),
          width: cellWidth,
          height: cellHeight,
          col,
          row,
        });
      }
    }
    return cells;
  }

  // ── Mouse input ───────────────────────────────────────────────────────────
  function setMousePosition(x, y) {
    mouse.x = x;
    mouse.y = y;
  }
  function setMouseButton(down) {
    mouse.pressed = down && !mouse.down;
    mouse.down = down;
  }
  function getMousePosition() {
    return { x: mouse.x, y: mouse.y };
  }
  function isMouseDown() {
    return mouse.down;
  }
  function isMousePressed() {
    return mouse.pressed;
  }

  return {
    drawProgressBar,
    drawRoundedRect,
    drawGradientRect,
    centerX,
    centerY,
    grid,
    setMousePosition,
    setMouseButton,
    getMousePosition,
    isMouseDown,
    isMousePressed,
  };
}
