// 🎨 Nova64 UI System - First Class 2D Interface
// Thin orchestrator — delegates to runtime/ui/*.js sub-modules

import { uiTextModule } from './ui/text.js';
import { uiPanelsModule } from './ui/panels.js';
import { uiButtonsModule } from './ui/buttons.js';
import { uiWidgetsModule } from './ui/widgets.js';

export function uiApi(gpu, g) {
  // Shared state objects passed by reference into sub-modules
  const state = { currentFont: 'normal', textAlign: 'left', textBaseline: 'top' };
  const mouse = { x: 0, y: 0, down: false, pressed: false };
  const panels = [];
  const buttons = [];

  const fonts = {
    tiny: { size: 1, spacing: 1 },
    small: { size: 1, spacing: 2 },
    normal: { size: 2, spacing: 1 },
    large: { size: 3, spacing: 1 },
    huge: { size: 4, spacing: 2 },
  };

  const rgba8 = g.rgba8;
  const colors = {
    primary: rgba8(0, 120, 255, 255),
    secondary: rgba8(100, 100, 255, 255),
    success: rgba8(0, 255, 100, 255),
    warning: rgba8(255, 200, 0, 255),
    danger: rgba8(255, 50, 50, 255),
    dark: rgba8(20, 20, 30, 255),
    light: rgba8(240, 240, 250, 255),
    white: rgba8(255, 255, 255, 255),
    black: rgba8(0, 0, 0, 255),
    transparent: rgba8(0, 0, 0, 0),
  };

  const ctx = { g, fonts, state, mouse, colors, panels, buttons };

  // Init modules — each appends its exports to ctx for later modules to use
  const textMod = uiTextModule(ctx);
  Object.assign(ctx, textMod);

  const panelMod = uiPanelsModule(ctx);
  Object.assign(ctx, panelMod);

  const buttonMod = uiButtonsModule(ctx);
  Object.assign(ctx, buttonMod);

  const widgetMod = uiWidgetsModule(ctx);
  Object.assign(ctx, widgetMod);

  return {
    // Expose these directly for main.js to wire input before exposeTo is called
    setMousePosition: ctx.setMousePosition,
    setMouseButton: ctx.setMouseButton,

    exposeTo(target) {
      Object.assign(target, {
        // Font / text system
        setFont: ctx.setFont,
        getFont: ctx.getFont,
        setTextAlign: ctx.setTextAlign,
        setTextBaseline: ctx.setTextBaseline,
        measureText: ctx.measureText,
        drawText: ctx.drawText,
        drawTextShadow: ctx.drawTextShadow,
        drawTextOutline: ctx.drawTextOutline,

        // Panel system
        createPanel: ctx.createPanel,
        drawPanel: ctx.drawPanel,
        drawAllPanels: ctx.drawAllPanels,
        removePanel: ctx.removePanel,
        clearPanels: ctx.clearPanels,

        // Button system
        createButton: ctx.createButton,
        updateButton: ctx.updateButton,
        drawButton: ctx.drawButton,
        updateAllButtons: ctx.updateAllButtons,
        drawAllButtons: ctx.drawAllButtons,
        removeButton: ctx.removeButton,
        clearButtons: ctx.clearButtons,

        // Progress bars
        drawProgressBar: ctx.drawProgressBar,

        // Advanced shapes
        drawRoundedRect: ctx.drawRoundedRect,
        drawGradientRect: ctx.drawGradientRect,

        // Layout helpers
        centerX: ctx.centerX,
        centerY: ctx.centerY,
        grid: ctx.grid,

        // Mouse input
        setMousePosition: ctx.setMousePosition,
        setMouseButton: ctx.setMouseButton,
        getMousePosition: ctx.getMousePosition,
        isMouseDown: ctx.isMouseDown,
        isMousePressed: ctx.isMousePressed,

        // Color palette and font defs
        uiColors: colors,
        uiFonts: fonts,
      });
    },
  };
}
