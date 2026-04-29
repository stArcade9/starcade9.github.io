// runtime/ui/panels.js
// Panel (dialog box) creation and rendering

import { unpackRGBA64 } from '../api.js';

/**
 * @param {{ g: object, colors: object, panels: Array, state: object,
 *           drawText: Function, setTextAlign: Function }} ctx
 */
export function uiPanelsModule({ g, colors, panels, state, drawText, setTextAlign }) {
  function createPanel(x, y, width, height, options = {}) {
    const panel = {
      id: `panel_${Date.now()}_${Math.random()}`,
      x,
      y,
      width,
      height,
      bgColor: options.bgColor || g.rgba8(0, 0, 0, 200),
      borderColor: options.borderColor || colors.primary,
      borderWidth: options.borderWidth !== undefined ? options.borderWidth : 2,
      cornerRadius: options.cornerRadius || 0,
      shadow: options.shadow || false,
      shadowOffset: options.shadowOffset || 4,
      title: options.title || null,
      titleColor: options.titleColor || colors.white,
      titleBgColor: options.titleBgColor || colors.primary,
      padding: options.padding || 10,
      visible: options.visible !== undefined ? options.visible : true,
      gradient: options.gradient || false,
      gradientColor: options.gradientColor || g.rgba8(0, 0, 50, 200),
    };
    panels.push(panel);
    return panel;
  }

  function drawPanel(panel) {
    if (!panel.visible) return;
    const { x, y, width, height } = panel;

    if (panel.shadow) {
      const so = panel.shadowOffset;
      g.rect(x + so, y + so, width, height, g.rgba8(0, 0, 0, 100), true);
    }

    if (panel.gradient) {
      const steps = 20;
      const bgU = unpackRGBA64(panel.bgColor);
      const grU = unpackRGBA64(panel.gradientColor);
      const bgR = Math.floor(bgU.r / 257),
        bgG = Math.floor(bgU.g / 257),
        bgB = Math.floor(bgU.b / 257),
        bgA = Math.floor(bgU.a / 257);
      const grR = Math.floor(grU.r / 257),
        grG = Math.floor(grU.g / 257),
        grB = Math.floor(grU.b / 257);
      for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const h = Math.floor(height / steps);
        const r = Math.floor(bgR + (grR - bgR) * ratio);
        const gv = Math.floor(bgG + (grG - bgG) * ratio);
        const b = Math.floor(bgB + (grB - bgB) * ratio);
        g.rect(x, y + i * h, width, h, g.rgba8(r, gv, b, bgA), true);
      }
    } else {
      g.rect(x, y, width, height, panel.bgColor, true);
    }

    if (panel.cornerRadius > 0) {
      const cr = panel.cornerRadius;
      g.rect(x, y, cr, cr, panel.bgColor, true);
      g.rect(x + width - cr, y, cr, cr, panel.bgColor, true);
      g.rect(x, y + height - cr, cr, cr, panel.bgColor, true);
      g.rect(x + width - cr, y + height - cr, cr, cr, panel.bgColor, true);
    }

    if (panel.borderWidth > 0) {
      for (let i = 0; i < panel.borderWidth; i++) {
        g.rect(x + i, y + i, width - i * 2, height - i * 2, panel.borderColor, false);
      }
    }

    if (panel.title) {
      const titleHeight = 20;
      g.rect(x, y - titleHeight, width, titleHeight, panel.titleBgColor, true);
      g.rect(x, y - titleHeight, width, titleHeight, panel.borderColor, false);
      const oldAlign = state.textAlign;
      setTextAlign('center');
      drawText(panel.title, x + width / 2, y - titleHeight + 4, panel.titleColor, 1);
      setTextAlign(oldAlign);
    }
  }

  function drawAllPanels() {
    panels.forEach(p => drawPanel(p));
  }
  function removePanel(p) {
    const i = panels.indexOf(p);
    if (i >= 0) panels.splice(i, 1);
  }
  function clearPanels() {
    panels.length = 0;
  }

  return { createPanel, drawPanel, drawAllPanels, removePanel, clearPanels };
}
