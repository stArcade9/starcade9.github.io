// runtime/ui/text.js
// Font management and text rendering

/**
 * @param {{ g: object, fonts: object, state: { currentFont: string, textAlign: string, textBaseline: string }, colors: object }} ctx
 */
export function uiTextModule({ g, fonts, state, colors }) {
  function setFont(fontName) {
    if (fonts[fontName]) state.currentFont = fontName;
  }

  function getFont() {
    return fonts[state.currentFont];
  }

  function setTextAlign(align) {
    state.textAlign = align;
  }

  function setTextBaseline(baseline) {
    state.textBaseline = baseline;
  }

  function measureText(text, scale = 1) {
    const font = getFont();
    const charWidth = 6 * scale * font.size;
    const charHeight = 8 * scale * font.size;
    return { width: text.length * charWidth, height: charHeight };
  }

  function drawText(text, x, y, color = colors.white, scale = 1) {
    const font = getFont();
    const finalScale = scale * font.size;
    const metrics = measureText(text, scale);

    let drawX = x;
    if (state.textAlign === 'center') drawX = x - metrics.width / 2;
    else if (state.textAlign === 'right') drawX = x - metrics.width;

    let drawY = y;
    if (state.textBaseline === 'middle') drawY = y - metrics.height / 2;
    else if (state.textBaseline === 'bottom') drawY = y - metrics.height;

    g.print(text, Math.floor(drawX), Math.floor(drawY), color, finalScale);
  }

  function drawTextShadow(
    text,
    x,
    y,
    color = colors.white,
    shadowColor = colors.black,
    offset = 2,
    scale = 1
  ) {
    drawText(text, x + offset, y + offset, shadowColor, scale);
    drawText(text, x, y, color, scale);
  }

  function drawTextOutline(
    text,
    x,
    y,
    color = colors.white,
    outlineColor = colors.black,
    scale = 1
  ) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        if (ox !== 0 || oy !== 0) drawText(text, x + ox, y + oy, outlineColor, scale);
      }
    }
    drawText(text, x, y, color, scale);
  }

  return {
    setFont,
    getFont,
    setTextAlign,
    setTextBaseline,
    measureText,
    drawText,
    drawTextShadow,
    drawTextOutline,
  };
}
