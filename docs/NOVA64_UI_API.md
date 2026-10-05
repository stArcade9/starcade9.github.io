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
nova64.ui.setFont('tiny'); // 1x size
nova64.ui.setFont('small'); // 1x size, more spacing
nova64.ui.setFont('normal'); // 2x size (default)
nova64.ui.setFont('large'); // 3x size
nova64.ui.setFont('huge'); // 4x size

// Text alignment
nova64.ui.setTextAlign('left'); // Default
nova64.ui.setTextAlign('center'); // Center-aligned
nova64.ui.setTextAlign('right'); // Right-aligned

// Text baseline
nova64.ui.setTextBaseline('top'); // Default
nova64.ui.setTextBaseline('middle'); // Vertically centered
nova64.ui.setTextBaseline('bottom'); // Bottom-aligned

// Measure text
const metrics = measureText('Hello', 2);
// Returns: { width: 60, height: 16 }

// Draw text
nova64.ui.drawText('Hello World', x, y, color, scale);

// Draw text with shadow
nova64.ui.drawTextShadow('Title', x, y, color, shadowColor, offset, scale);

// Draw text with outline
nova64.ui.drawTextOutline('SCORE', x, y, color, outlineColor, scale);
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
nova64.draw.drawPanel(panel);

// Draw all panels
nova64.ui.drawAllPanels();

// Remove panel
nova64.ui.removePanel(panel);

// Clear all panels
nova64.ui.clearPanels();
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
nova64.ui.updateButton(button);

// Update all buttons
nova64.ui.updateAllButtons();

// Draw single button
nova64.ui.drawButton(button);

// Draw all buttons
nova64.ui.drawAllButtons();

// Remove button
nova64.ui.removeButton(button);

// Clear all buttons
nova64.ui.clearButtons();
```

### Progress Bars

```javascript
// Draw progress bar
nova64.draw.drawProgressBar(x, y, width, height, currentValue, maxValue, {
  bgColor: rgba8(50, 50, 50, 255),
  fillColor: uiColors.success,
  borderColor: uiColors.white,
  showText: true,
  textColor: uiColors.white,
});

// Example: Health bar that changes color
const healthColor =
  health > 50 ? uiColors.success : health > 25 ? uiColors.warning : uiColors.danger;

nova64.draw.drawProgressBar(x, y, 200, 20, health, 100, {
  fillColor: healthColor,
  showText: true,
});
```

### Advanced Shapes

```javascript
// Rounded rectangle
nova64.draw.drawRoundedRect(x, y, width, height, radius, color, filled);

// Gradient rectangle
nova64.ui.drawGradientRect(x, y, width, height, color1, color2, vertical);

// Example
nova64.ui.drawGradientRect(
  0,
  0,
  640,
  360,
  nova64.draw.rgba8(10, 10, 30, 255), // Top color
  nova64.draw.rgba8(30, 10, 50, 255), // Bottom color
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
  nova64.ui.createButton(cell.x, cell.y, cell.width, cell.height, `Btn ${i}`, () => {
    console.log(`Button ${i} clicked`);
  });
});
```

### Mouse/Input

```javascript
// Set mouse position (from actual mouse or keyboard)
nova64.ui.setMousePosition(x, y);

// Set mouse button state
nova64.ui.setMouseButton(isDown);

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
    nova64.ui.createButton(
      nova64.ui.centerX(100),
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
    nova64.ui.createButton(
      nova64.ui.centerX(100),
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
    nova64.ui.createButton(
      nova64.ui.centerX(100),
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
  nova64.ui.updateAllButtons();

  // Game logic
  ui.health = Math.max(0, ui.health - dt * 2);
  ui.score += Math.floor(dt * 100);
}

export function draw() {
  // Clear screen
  nova64.draw.cls();

  // Draw gradient background
  nova64.ui.drawGradientRect(0, 0, 640, 360, rgba8(20, 20, 40, 255), rgba8(40, 20, 60, 255), true);

  // Draw panels
  nova64.ui.drawAllPanels();

  // Draw health bar
  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('left');
  nova64.ui.drawText('HEALTH', 20, 40, uiColors.white, 1);
  nova64.draw.drawProgressBar(20, 60, 200, 20, ui.health, 100, {
    fillColor: ui.health > 50 ? uiColors.success : uiColors.danger,
  });

  // Draw score
  nova64.ui.setFont('large');
  nova64.ui.setTextAlign('center');
  const scoreText = 'SCORE: ' + ui.score.toString().padStart(6, '0');
  nova64.ui.drawTextOutline(scoreText, 320, 100, uiColors.warning, uiColors.black, 1);

  // Draw buttons
  nova64.ui.drawAllButtons();

  // Draw title
  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawTextShadow('MY GAME', 320, 30, uiColors.primary, uiColors.black, 3, 1);
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
nova64.draw.drawPanel(statsPanel);

// Then draw contents inside panel bounds
nova64.ui.drawText('Health: 100', 20, 40);
nova64.ui.drawText('Mana: 50', 20, 60);
```

### 2. Update Buttons Every Frame

```javascript
export function update(dt) {
  // Always update buttons to track hover/click
  nova64.ui.updateAllButtons();
}

export function draw() {
  // Always draw buttons after updating
  nova64.ui.drawAllButtons();
}
```

### 3. Use Font Sizes Appropriately

```javascript
nova64.ui.setFont('huge'); // Game titles
nova64.ui.setFont('large'); // Section headers
nova64.ui.setFont('normal'); // Body text (default)
nova64.ui.setFont('small'); // Details
nova64.ui.setFont('tiny'); // Fine print
```

### 4. Center Important Elements

```javascript
// Title centered horizontally
const titleX = centerX(200);
nova64.ui.drawText('GAME TITLE', titleX, 50);

// Dialog centered both ways
const dialogWidth = 300;
const dialogHeight = 200;
const dialogX = centerX(dialogWidth);
const dialogY = centerY(dialogHeight);
nova64.ui.createPanel(dialogX, dialogY, dialogWidth, dialogHeight);
```

### 5. Use Color Palette Consistently

```javascript
// Good: Use semantic colors
nova64.ui.createButton(x, y, w, h, 'Accept', callback, {
  normalColor: uiColors.success,
});

nova64.ui.createButton(x, y, w, h, 'Cancel', callback, {
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
nova64.draw.print('Score: 100', 10, 10, rgba8(255, 255, 0, 255));
nova64.draw.rect(10, 30, 200, 20, rgba8(0, 255, 0, 255), true);
```

### After (Professional)

```javascript
nova64.ui.setFont('large');
nova64.ui.setTextAlign('left');
nova64.ui.drawTextOutline('Score: 100', 10, 10, uiColors.warning, uiColors.black, 1);
nova64.draw.drawProgressBar(10, 30, 200, 20, score, maxScore, {
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
