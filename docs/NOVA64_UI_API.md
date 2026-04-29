# 🎨 Nova64 UI System - First Class Interface

## Overview

Nova64 now has a **professional-grade UI system** with buttons, panels, advanced text rendering, progress bars, and layout helpers. This makes Nova64 the most powerful fantasy console for creating polished game interfaces!

## Features

### ✅ Complete Font System

- **5 font sizes**: tiny, small, normal, large, huge
- **Text alignment**: left, center, right
- **Text baseline**: top, middle, bottom
- **Text effects**: shadows, outlines
- **Text measurement**: get width/height before rendering

### ✅ Panel System

- **Customizable panels** with borders, shadows, gradients
- **Title bars** with custom colors
- **Corner rounding** and decorations
- **Gradient backgrounds**
- **Flexible styling** options

### ✅ Button System

- **Interactive buttons** with hover/press states
- **Callback functions** on click
- **Multiple color states**: normal, hover, pressed, disabled
- **Auto-update system** for all buttons
- **Flexible positioning** and sizing

### ✅ Progress Bars

- **Horizontal progress bars** with fill
- **Customizable colors** based on value
- **Text display** showing current/max values
- **Border and background** styling

### ✅ Advanced Shapes

- **Rounded rectangles** with radius
- **Gradient rectangles** (vertical/horizontal)
- **Enhanced drawing** primitives

### ✅ Layout Helpers

- **Center positioning** for X and Y
- **Grid layout system** for arranging elements
- **Automatic calculations**

### ✅ Mouse/Input Support

- **Mouse position** tracking
- **Click detection** with pressed/held states
- **Button hover detection**
- **Input system integration**

## API Reference

### Font System

```javascript
// Set font size
setFont('tiny'); // 1x size
setFont('small'); // 1x size, more spacing
setFont('normal'); // 2x size (default)
setFont('large'); // 3x size
setFont('huge'); // 4x size

// Text alignment
setTextAlign('left'); // Default
setTextAlign('center'); // Center-aligned
setTextAlign('right'); // Right-aligned

// Text baseline
setTextBaseline('top'); // Default
setTextBaseline('middle'); // Vertically centered
setTextBaseline('bottom'); // Bottom-aligned

// Measure text
const metrics = measureText('Hello', 2);
// Returns: { width: 60, height: 16 }

// Draw text
drawText('Hello World', x, y, color, scale);

// Draw text with shadow
drawTextShadow('Title', x, y, color, shadowColor, offset, scale);

// Draw text with outline
drawTextOutline('SCORE', x, y, color, outlineColor, scale);
```

### Panel System

```javascript
// Create panel
const panel = createPanel(x, y, width, height, {
  bgColor: rgba8(0, 0, 0, 200),
  borderColor: uiColors.primary,
  borderWidth: 2,
  cornerRadius: 0,
  shadow: true,
  shadowOffset: 4,
  title: 'Panel Title',
  titleColor: uiColors.white,
  titleBgColor: uiColors.primary,
  padding: 10,
  visible: true,
  gradient: true,
  gradientColor: rgba8(0, 0, 50, 200),
});

// Draw single panel
drawPanel(panel);

// Draw all panels
drawAllPanels();

// Remove panel
removePanel(panel);

// Clear all panels
clearPanels();
```

### Button System

```javascript
// Create button
const button = createButton(
  x,
  y,
  width,
  height,
  'Click Me',
  () => {
    console.log('Button clicked!');
  },
  {
    enabled: true,
    visible: true,
    normalColor: uiColors.primary,
    hoverColor: rgba8(50, 150, 255, 255),
    pressedColor: rgba8(0, 80, 200, 255),
    disabledColor: rgba8(100, 100, 100, 255),
    textColor: uiColors.white,
    borderColor: uiColors.white,
    borderWidth: 2,
    rounded: false,
  }
);

// Update single button
updateButton(button);

// Update all buttons
updateAllButtons();

// Draw single button
drawButton(button);

// Draw all buttons
drawAllButtons();

// Remove button
removeButton(button);

// Clear all buttons
clearButtons();
```

### Progress Bars

```javascript
// Draw progress bar
drawProgressBar(x, y, width, height, currentValue, maxValue, {
  bgColor: rgba8(50, 50, 50, 255),
  fillColor: uiColors.success,
  borderColor: uiColors.white,
  showText: true,
  textColor: uiColors.white,
});

// Example: Health bar that changes color
const healthColor =
  health > 50 ? uiColors.success : health > 25 ? uiColors.warning : uiColors.danger;

drawProgressBar(x, y, 200, 20, health, 100, {
  fillColor: healthColor,
  showText: true,
});
```

### Advanced Shapes

```javascript
// Rounded rectangle
drawRoundedRect(x, y, width, height, radius, color, filled);

// Gradient rectangle
drawGradientRect(x, y, width, height, color1, color2, vertical);

// Example
drawGradientRect(
  0,
  0,
  640,
  360,
  rgba8(10, 10, 30, 255), // Top color
  rgba8(30, 10, 50, 255), // Bottom color
  true // Vertical gradient
);
```

### Layout Helpers

```javascript
// Center element horizontally
const x = centerX(elementWidth, 640);

// Center element vertically
const y = centerY(elementHeight, 360);

// Create grid layout
const cells = grid(cols, rows, cellWidth, cellHeight, paddingX, paddingY);
// Returns array of { x, y, width, height, col, row }

// Example: 3x2 grid of buttons
const buttonGrid = grid(3, 2, 80, 40, 10, 10);
buttonGrid.forEach((cell, i) => {
  createButton(cell.x, cell.y, cell.width, cell.height, `Btn ${i}`, () => {
    console.log(`Button ${i} clicked`);
  });
});
```

### Mouse/Input

```javascript
// Set mouse position (from actual mouse or keyboard)
setMousePosition(x, y);

// Set mouse button state
setMouseButton(isDown);

// Get mouse position
const pos = getMousePosition();
console.log(pos.x, pos.y);

// Check mouse state
if (isMouseDown()) {
  // Mouse button held
}

if (isMousePressed()) {
  // Mouse button just pressed this frame
}
```

### Color Palette

```javascript
// Built-in colors
uiColors.primary; // Blue
uiColors.secondary; // Light blue
uiColors.success; // Green
uiColors.warning; // Yellow
uiColors.danger; // Red
uiColors.dark; // Dark gray
uiColors.light; // Light gray
uiColors.white; // White
uiColors.black; // Black
uiColors.transparent; // Transparent
```

## Complete Example

```javascript
// UI Demo Game

let ui = {
  healthPanel: null,
  menuButtons: [],
  health: 100,
  score: 0,
};

export async function init() {
  // Create health panel
  ui.healthPanel = createPanel(10, 10, 220, 80, {
    title: 'Player Stats',
    borderColor: uiColors.primary,
    shadow: true,
  });

  // Create menu buttons
  ui.menuButtons.push(
    createButton(
      centerX(100),
      200,
      100,
      40,
      'START',
      () => {
        console.log('Game started!');
      },
      { normalColor: uiColors.success }
    )
  );

  ui.menuButtons.push(
    createButton(
      centerX(100),
      250,
      100,
      40,
      'OPTIONS',
      () => {
        console.log('Options opened!');
      },
      { normalColor: uiColors.primary }
    )
  );

  ui.menuButtons.push(
    createButton(
      centerX(100),
      300,
      100,
      40,
      'QUIT',
      () => {
        console.log('Game quit!');
      },
      { normalColor: uiColors.danger }
    )
  );
}

export function update(dt) {
  // Handle mouse input
  // (In real game, use actual mouse events)

  // Update all buttons
  updateAllButtons();

  // Game logic
  ui.health = Math.max(0, ui.health - dt * 2);
  ui.score += Math.floor(dt * 100);
}

export function draw() {
  // Clear screen
  cls();

  // Draw gradient background
  drawGradientRect(0, 0, 640, 360, rgba8(20, 20, 40, 255), rgba8(40, 20, 60, 255), true);

  // Draw panels
  drawAllPanels();

  // Draw health bar
  setFont('normal');
  setTextAlign('left');
  drawText('HEALTH', 20, 40, uiColors.white, 1);
  drawProgressBar(20, 60, 200, 20, ui.health, 100, {
    fillColor: ui.health > 50 ? uiColors.success : uiColors.danger,
  });

  // Draw score
  setFont('large');
  setTextAlign('center');
  const scoreText = 'SCORE: ' + ui.score.toString().padStart(6, '0');
  drawTextOutline(scoreText, 320, 100, uiColors.warning, uiColors.black, 1);

  // Draw buttons
  drawAllButtons();

  // Draw title
  setFont('huge');
  setTextAlign('center');
  drawTextShadow('MY GAME', 320, 30, uiColors.primary, uiColors.black, 3, 1);
}
```

## Best Practices

### 1. Use Panels for Grouping

```javascript
// Create a panel for related UI elements
const statsPanel = createPanel(10, 10, 200, 150, {
  title: 'Statistics',
  shadow: true,
});

// Draw panel first
drawPanel(statsPanel);

// Then draw contents inside panel bounds
drawText('Health: 100', 20, 40);
drawText('Mana: 50', 20, 60);
```

### 2. Update Buttons Every Frame

```javascript
export function update(dt) {
  // Always update buttons to track hover/click
  updateAllButtons();
}

export function draw() {
  // Always draw buttons after updating
  drawAllButtons();
}
```

### 3. Use Font Sizes Appropriately

```javascript
setFont('huge'); // Game titles
setFont('large'); // Section headers
setFont('normal'); // Body text (default)
setFont('small'); // Details
setFont('tiny'); // Fine print
```

### 4. Center Important Elements

```javascript
// Title centered horizontally
const titleX = centerX(200);
drawText('GAME TITLE', titleX, 50);

// Dialog centered both ways
const dialogWidth = 300;
const dialogHeight = 200;
const dialogX = centerX(dialogWidth);
const dialogY = centerY(dialogHeight);
createPanel(dialogX, dialogY, dialogWidth, dialogHeight);
```

### 5. Use Color Palette Consistently

```javascript
// Good: Use semantic colors
createButton(x, y, w, h, 'Accept', callback, {
  normalColor: uiColors.success,
});

createButton(x, y, w, h, 'Cancel', callback, {
  normalColor: uiColors.danger,
});

// Consistent throughout your game
```

## Performance Tips

1. **Create UI elements once in `init()`**, not every frame
2. **Only update buttons when needed** (e.g., on menu screens)
3. **Use `visible` property** to hide/show without recreating
4. **Clear panels/buttons** when switching screens

## Migration from Old API

### Before (Basic)

```javascript
print('Score: 100', 10, 10, rgba8(255, 255, 0, 255));
rect(10, 30, 200, 20, rgba8(0, 255, 0, 255), true);
```

### After (Professional)

```javascript
setFont('large');
setTextAlign('left');
drawTextOutline('Score: 100', 10, 10, uiColors.warning, uiColors.black, 1);
drawProgressBar(10, 30, 200, 20, score, maxScore, {
  fillColor: uiColors.success,
});
```

## Try It Now!

```bash
# Start dev server
pnpm dev

# Open browser
http://localhost:5173/?demo=ui-demo
```

Use **Arrow Keys** to move cursor, **Space** to click buttons!

---

**Nova64: The Best Fantasy Console** 🎮✨  
_Now with first-class UI system!_
