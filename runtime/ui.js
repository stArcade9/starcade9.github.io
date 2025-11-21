// 🎨 Nova64 UI System - First Class 2D Interface
// Professional UI components for fantasy console games

import { unpackRGBA64 } from './api.js';

export function uiApi(gpu, g) {
  // UI State
  let buttons = [];
  let panels = [];
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mousePressed = false;
  
  // Font definitions
  const fonts = {
    tiny: { size: 1, spacing: 1 },
    small: { size: 1, spacing: 2 },
    normal: { size: 2, spacing: 1 },
    large: { size: 3, spacing: 1 },
    huge: { size: 4, spacing: 2 }
  };
  
  let currentFont = 'normal';
  let textAlign = 'left'; // left, center, right
  let textBaseline = 'top'; // top, middle, bottom
  
  // Get rgba8 from the global API object
  const rgba8 = g.rgba8;
  
  // Color palette
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
    transparent: rgba8(0, 0, 0, 0)
  };
  
  // ============================================
  // FONT & TEXT SYSTEM
  // ============================================
  
  function setFont(fontName) {
    if (fonts[fontName]) {
      currentFont = fontName;
    }
  }
  
  function getFont() {
    return fonts[currentFont];
  }
  
  function setTextAlign(align) {
    textAlign = align;
  }
  
  function setTextBaseline(baseline) {
    textBaseline = baseline;
  }
  
  function measureText(text, scale = 1) {
    const font = getFont();
    const charWidth = 6 * scale * font.size;
    const charHeight = 8 * scale * font.size;
    return {
      width: text.length * charWidth,
      height: charHeight
    };
  }
  
  function drawText(text, x, y, color = colors.white, scale = 1) {
    const font = getFont();
    const finalScale = scale * font.size;
    const metrics = measureText(text, scale);
    
    let drawX = x;
    if (textAlign === 'center') {
      drawX = x - metrics.width / 2;
    } else if (textAlign === 'right') {
      drawX = x - metrics.width;
    }
    
    let drawY = y;
    if (textBaseline === 'middle') {
      drawY = y - metrics.height / 2;
    } else if (textBaseline === 'bottom') {
      drawY = y - metrics.height;
    }
    
    g.print(text, Math.floor(drawX), Math.floor(drawY), color, finalScale);
  }
  
  function drawTextShadow(text, x, y, color = colors.white, shadowColor = colors.black, offset = 2, scale = 1) {
    drawText(text, x + offset, y + offset, shadowColor, scale);
    drawText(text, x, y, color, scale);
  }
  
  function drawTextOutline(text, x, y, color = colors.white, outlineColor = colors.black, scale = 1) {
    // Draw outline in 8 directions
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        if (ox !== 0 || oy !== 0) {
          drawText(text, x + ox, y + oy, outlineColor, scale);
        }
      }
    }
    drawText(text, x, y, color, scale);
  }
  
  // ============================================
  // PANEL SYSTEM
  // ============================================
  
  function createPanel(x, y, width, height, options = {}) {
    const panel = {
      id: `panel_${Date.now()}_${Math.random()}`,
      x, y, width, height,
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
      gradientColor: options.gradientColor || g.rgba8(0, 0, 50, 200)
    };
    
    panels.push(panel);
    return panel;
  }
  
  function drawPanel(panel) {
    if (!panel.visible) return;
    
    const { x, y, width, height } = panel;
    
    // Shadow
    if (panel.shadow) {
      const so = panel.shadowOffset;
      g.rect(x + so, y + so, width, height, g.rgba8(0, 0, 0, 100), true);
    }
    
    // Background with gradient
    if (panel.gradient) {
      // Simple vertical gradient simulation
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const h = Math.floor(height / steps);
        
        // Unpack BigInt colors
        const bgUnpacked = unpackRGBA64(panel.bgColor);
        const grUnpacked = unpackRGBA64(panel.gradientColor);
        
        // Convert 16-bit to 8-bit
        const bgR = Math.floor(bgUnpacked.r / 257);
        const bgG = Math.floor(bgUnpacked.g / 257);
        const bgB = Math.floor(bgUnpacked.b / 257);
        const bgA = Math.floor(bgUnpacked.a / 257);
        
        const grR = Math.floor(grUnpacked.r / 257);
        const grG = Math.floor(grUnpacked.g / 257);
        const grB = Math.floor(grUnpacked.b / 257);
        
        const r = Math.floor(bgR + (grR - bgR) * ratio);
        const gVal = Math.floor(bgG + (grG - bgG) * ratio);
        const b = Math.floor(bgB + (grB - bgB) * ratio);
        
        g.rect(x, y + i * h, width, h, rgba8(r, gVal, b, bgA), true);
      }
    } else {
      g.rect(x, y, width, height, panel.bgColor, true);
    }
    
    // Corner decorations
    if (panel.cornerRadius > 0) {
      const cr = panel.cornerRadius;
      // Simple corner rounding with small rects
      g.rect(x, y, cr, cr, panel.bgColor, true);
      g.rect(x + width - cr, y, cr, cr, panel.bgColor, true);
      g.rect(x, y + height - cr, cr, cr, panel.bgColor, true);
      g.rect(x + width - cr, y + height - cr, cr, cr, panel.bgColor, true);
    }
    
    // Border
    if (panel.borderWidth > 0) {
      for (let i = 0; i < panel.borderWidth; i++) {
        g.rect(x + i, y + i, width - i * 2, height - i * 2, panel.borderColor, false);
      }
    }
    
    // Title bar
    if (panel.title) {
      const titleHeight = 20;
      g.rect(x, y - titleHeight, width, titleHeight, panel.titleBgColor, true);
      g.rect(x, y - titleHeight, width, titleHeight, panel.borderColor, false);
      
      const oldAlign = textAlign;
      setTextAlign('center');
      drawText(panel.title, x + width / 2, y - titleHeight + 4, panel.titleColor, 1);
      setTextAlign(oldAlign);
    }
  }
  
  function drawAllPanels() {
    panels.forEach(panel => drawPanel(panel));
  }
  
  function removePanel(panel) {
    const idx = panels.indexOf(panel);
    if (idx >= 0) panels.splice(idx, 1);
  }
  
  function clearPanels() {
    panels = [];
  }
  
  // ============================================
  // BUTTON SYSTEM
  // ============================================
  
  function createButton(x, y, width, height, text, callback, options = {}) {
    const button = {
      id: `button_${Date.now()}_${Math.random()}`,
      x, y, width, height,
      text,
      callback,
      enabled: options.enabled !== undefined ? options.enabled : true,
      visible: options.visible !== undefined ? options.visible : true,
      
      // Colors
      normalColor: options.normalColor || colors.primary,
      hoverColor: options.hoverColor || g.rgba8(50, 150, 255, 255),
      pressedColor: options.pressedColor || g.rgba8(0, 80, 200, 255),
      disabledColor: options.disabledColor || g.rgba8(100, 100, 100, 255),
      textColor: options.textColor || colors.white,
      
      // Border
      borderColor: options.borderColor || colors.white,
      borderWidth: options.borderWidth !== undefined ? options.borderWidth : 2,
      
      // State
      hovered: false,
      pressed: false,
      
      // Style
      rounded: options.rounded || false,
      icon: options.icon || null
    };
    
    buttons.push(button);
    return button;
  }
  
  function updateButton(button) {
    if (!button.enabled || !button.visible) {
      button.hovered = false;
      button.pressed = false;
      return false;
    }
    
    // Check if mouse is over button
    const over = mouseX >= button.x && mouseX <= button.x + button.width &&
                 mouseY >= button.y && mouseY <= button.y + button.height;
    
    button.hovered = over;
    
    // Visual pressed state when mouse is down over button
    button.pressed = over && mouseDown;
    
    // Trigger callback only on press (not hold)
    if (over && mousePressed) {
      if (button.callback) {
        button.callback();
      }
      return true;
    }
    
    return false;
  }
  
  function drawButton(button) {
    if (!button.visible) return;
    
    const { x, y, width, height } = button;
    
    // Determine color based on state
    let bgColor = button.normalColor;
    if (!button.enabled) {
      bgColor = button.disabledColor;
    } else if (button.pressed) {
      bgColor = button.pressedColor;
    } else if (button.hovered) {
      bgColor = button.hoverColor;
    }
    
    // Draw button background
    g.rect(x, y, width, height, bgColor, true);
    
    // Draw border
    if (button.borderWidth > 0) {
      const borderColor = button.hovered ? button.hoverColor : button.borderColor;
      for (let i = 0; i < button.borderWidth; i++) {
        g.rect(x + i, y + i, width - i * 2, height - i * 2, borderColor, false);
      }
    }
    
    // Draw pressed effect
    if (button.pressed) {
      g.rect(x + 2, y + 2, width - 4, height - 4, g.rgba8(255, 255, 255, 50), true);
    }
    
    // Draw text
    const oldAlign = textAlign;
    const oldBaseline = textBaseline;
    setTextAlign('center');
    setTextBaseline('middle');
    
    const textY = button.pressed ? y + height / 2 + 1 : y + height / 2;
    drawText(button.text, x + width / 2, textY, button.textColor, 1);
    
    setTextAlign(oldAlign);
    setTextBaseline(oldBaseline);
  }
  
  function updateAllButtons() {
    let anyClicked = false;
    buttons.forEach(button => {
      if (updateButton(button)) {
        anyClicked = true;
      }
    });
    // Reset mousePressed after checking all buttons (prevents multiple triggers per frame)
    mousePressed = false;
    return anyClicked;
  }
  
  function drawAllButtons() {
    buttons.forEach(button => drawButton(button));
  }
  
  function removeButton(button) {
    const idx = buttons.indexOf(button);
    if (idx >= 0) buttons.splice(idx, 1);
  }
  
  function clearButtons() {
    buttons = [];
  }
  
  // ============================================
  // PROGRESS BAR
  // ============================================
  
  function drawProgressBar(x, y, width, height, value, maxValue, options = {}) {
    const bgColor = options.bgColor || g.rgba8(50, 50, 50, 255);
    const fillColor = options.fillColor || colors.success;
    const borderColor = options.borderColor || colors.white;
    const showText = options.showText !== undefined ? options.showText : true;
    const textColor = options.textColor || colors.white;
    
    // Background
    g.rect(x, y, width, height, bgColor, true);
    
    // Fill
    const fillWidth = Math.floor((value / maxValue) * width);
    if (fillWidth > 0) {
      g.rect(x, y, fillWidth, height, fillColor, true);
    }
    
    // Border
    g.rect(x, y, width, height, borderColor, false);
    
    // Text
    if (showText) {
      const text = `${Math.floor(value)}/${Math.floor(maxValue)}`;
      const oldAlign = textAlign;
      const oldBaseline = textBaseline;
      setTextAlign('center');
      setTextBaseline('middle');
      drawTextOutline(text, x + width / 2, y + height / 2, textColor, colors.black, 1);
      setTextAlign(oldAlign);
      setTextBaseline(oldBaseline);
    }
  }
  
  // ============================================
  // ADVANCED SHAPES
  // ============================================
  
  function drawRoundedRect(x, y, width, height, radius, color, filled = true) {
    if (radius === 0) {
      g.rect(x, y, width, height, color, filled);
      return;
    }
    
    // Main rectangles
    g.rect(x + radius, y, width - radius * 2, height, color, filled);
    g.rect(x, y + radius, radius, height - radius * 2, color, filled);
    g.rect(x + width - radius, y + radius, radius, height - radius * 2, color, filled);
    
    // Corners (approximate with circles)
    g.circle(x + radius, y + radius, radius, color, filled);
    g.circle(x + width - radius, y + radius, radius, color, filled);
    g.circle(x + radius, y + height - radius, radius, color, filled);
    g.circle(x + width - radius, y + height - radius, radius, color, filled);
  }
  
  function drawGradientRect(x, y, width, height, color1, color2, vertical = true) {
    const steps = vertical ? height : width;
    
    // Unpack BigInt colors to RGBA components (16-bit values)
    const c1 = unpackRGBA64(color1);
    const c2 = unpackRGBA64(color2);
    
    // Convert 16-bit to 8-bit
    const r1 = Math.floor(c1.r / 257);
    const g1 = Math.floor(c1.g / 257);
    const b1 = Math.floor(c1.b / 257);
    const a1 = Math.floor(c1.a / 257);
    
    const r2 = Math.floor(c2.r / 257);
    const g2 = Math.floor(c2.g / 257);
    const b2 = Math.floor(c2.b / 257);
    const a2 = Math.floor(c2.a / 257);
    
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.floor(r1 + (r2 - r1) * ratio);
      const gVal = Math.floor(g1 + (g2 - g1) * ratio);
      const b = Math.floor(b1 + (b2 - b1) * ratio);
      const a = Math.floor(a1 + (a2 - a1) * ratio);
      
      const color = rgba8(r, gVal, b, a);
      
      if (vertical) {
        g.rect(x, y + i, width, 1, color, true);
      } else {
        g.rect(x + i, y, 1, height, color, true);
      }
    }
  }
  
  // ============================================
  // LAYOUT HELPERS
  // ============================================
  
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
          col, row
        });
      }
    }
    return cells;
  }
  
  // ============================================
  // MOUSE INPUT
  // ============================================
  
  function setMousePosition(x, y) {
    mouseX = x;
    mouseY = y;
  }
  
  function setMouseButton(down) {
    mousePressed = down && !mouseDown;
    mouseDown = down;
  }
  
  function getMousePosition() {
    return { x: mouseX, y: mouseY };
  }
  
  function isMouseDown() {
    return mouseDown;
  }
  
  function isMousePressed() {
    return mousePressed;
  }
  
  // ============================================
  // EXPOSE API
  // ============================================
  
  return {
    // Expose these directly for main.js to connect input system
    setMousePosition,
    setMouseButton,
    
    exposeTo(target) {
      Object.assign(target, {
        // Font system
        setFont,
        getFont,
        setTextAlign,
        setTextBaseline,
        measureText,
        drawText,
        drawTextShadow,
        drawTextOutline,
        
        // Panel system
        createPanel,
        drawPanel,
        drawAllPanels,
        removePanel,
        clearPanels,
        
        // Button system
        createButton,
        updateButton,
        drawButton,
        updateAllButtons,
        drawAllButtons,
        removeButton,
        clearButtons,
        
        // Progress bars
        drawProgressBar,
        
        // Advanced shapes
        drawRoundedRect,
        drawGradientRect,
        
        // Layout helpers
        centerX,
        centerY,
        grid,
        
        // Mouse input
        setMousePosition,
        setMouseButton,
        getMousePosition,
        isMouseDown,
        isMousePressed,
        
        // Color palette
        uiColors: colors,
        uiFonts: fonts
      });
    }
  };
}
