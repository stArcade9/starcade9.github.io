# 🎮 NOVA64 API REFERENCE

**Version:** 0.4.9<br>
**Date:** March 20, 2026  
**Resolution:** 640×360 pixels  
**Target:** Nintendo 64 / PlayStation aesthetic

---

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [Core 2D API](#core-2d-api)
3. [Color System](#color-system)
4. [Input System](#input-system)
5. [3D Graphics API](#3d-graphics-api)
6. [Visual Effects API](#visual-effects-api)
7. [Voxel Engine API](#voxel-engine-api)
8. [UI System](#ui-system)
9. [Audio System](#audio-system)
10. [Utility Functions](#utility-functions)

---

## 🚀 Getting Started

### Basic Game Structure

Every Nova64 game follows this pattern:

```javascript
// Initialization - runs once
export function init() {
  // Setup game state, load assets, initialize objects
  console.log('🎮 Game initialized!');
}

// Update - runs every frame (~60 FPS)
export function update(dt) {
  // dt = delta time in seconds (typically 0.016)
  // Handle input, update physics, game logic
}

// Draw - runs every frame after update
export function draw() {
  // Render 2D graphics, UI, text
  // 3D graphics are auto-rendered by GPU
}
```

### Screen Resolution

- **Internal:** 640×360 pixels (16:9 aspect ratio)
- **Scaling:** Automatically scales to fit browser window
- **Retro Look:** Pixel-perfect rendering with optional CRT effects

---

## 🎨 Core 2D API

### Drawing Functions

#### `cls(color?)`

Clear the screen with a color.

```javascript
nova64.draw.cls(); // Clear to black
nova64.draw.cls(rgba8(0, 0, 0, 255)); // Clear to black
nova64.draw.cls(rgba8(20, 40, 80, 255)); // Clear to dark blue
```

#### `pset(x, y, color)`

Set a single pixel.

```javascript
nova64.draw.pset(100, 100, rgba8(255, 0, 0, 255)); // Red pixel at (100, 100)
```

#### `line(x0, y0, x1, y1, color)`

Draw a line between two points.

```javascript
nova64.draw.line(0, 0, 640, 360, rgba8(255, 255, 255, 255)); // Diagonal white line
```

#### `rect(x, y, width, height, color, fill?)`

Draw a rectangle.

```javascript
nova64.draw.rect(50, 50, 100, 80, rgba8(0, 255, 0, 255)); // Green outline
nova64.draw.rect(50, 50, 100, 80, rgba8(0, 255, 0, 255), true); // Green filled
```

#### `rectfill(x, y, width, height, color)`

Draw a filled rectangle (alias for `rect(..., true)`).

```javascript
nova64.draw.rectfill(10, 10, 200, 100, rgba8(255, 128, 0, 255)); // Orange rectangle
```

#### `circle(x, y, radius, color, fill?)`

Draw a circle.

```javascript
nova64.draw.circle(320, 180, 50, rgba8(255, 0, 255, 255)); // Magenta outline
nova64.draw.circle(320, 180, 50, rgba8(255, 0, 255, 255), true); // Magenta filled
```

#### `print(text, x, y, color?, scale?)`

Draw text using built-in bitmap font.

```javascript
nova64.draw.print('HELLO WORLD', 10, 10); // White text
nova64.draw.print('SCORE: 1000', 10, 20, rgba8(255, 255, 0, 255)); // Yellow text
nova64.draw.print('BIG', 100, 100, rgba8(255, 255, 255, 255), 2); // 2x scale (future)
```

**Built-in Font Characters:**

```
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789
!@#$%^&*()_+-=[]{}|;:'",.<>?/\~`
```

### Camera Functions

#### `setCamera(x, y)`

Set camera offset for scrolling.

```javascript
nova64.draw.setCamera(playerX - 320, playerY - 180); // Center camera on player
```

#### `getCamera()`

Get current camera position.

```javascript
const cam = getCamera();
console.log(`Camera at ${cam.x}, ${cam.y}`);
```

---

## 🌈 Color System

### `rgba8(r, g, b, a?)`

Create a color from 8-bit RGBA values (0-255).

```javascript
const red = rgba8(255, 0, 0, 255); // Opaque red
const green = rgba8(0, 255, 0, 255); // Opaque green
const blue = rgba8(0, 0, 255, 255); // Opaque blue
const cyan = rgba8(0, 255, 255, 255); // Cyan
const yellow = rgba8(255, 255, 0, 255); // Yellow
const white = rgba8(255, 255, 255, 255); // White
const trans = rgba8(255, 0, 0, 128); // 50% transparent red
```

### Common Colors

```javascript
const COLORS = {
  black: rgba8(0, 0, 0, 255),
  white: rgba8(255, 255, 255, 255),
  red: rgba8(255, 0, 0, 255),
  green: rgba8(0, 255, 0, 255),
  blue: rgba8(0, 0, 255, 255),
  cyan: rgba8(0, 255, 255, 255),
  magenta: rgba8(255, 0, 255, 255),
  yellow: rgba8(255, 255, 0, 255),
  orange: rgba8(255, 128, 0, 255),
  purple: rgba8(128, 0, 255, 255),
  gray: rgba8(128, 128, 128, 255),
};
```

---

## 🎮 Input System

### Keyboard Input

#### `btn(i)` - Check if button is held down

Maps button numbers to keys:

| Button | Keyboard      | Gamepad     |
| ------ | ------------- | ----------- |
| 0      | ← Arrow Left  | D-pad Left  |
| 1      | → Arrow Right | D-pad Right |
| 2      | ↑ Arrow Up    | D-pad Up    |
| 3      | ↓ Arrow Down  | D-pad Down  |
| 4      | Z             | A/Cross     |
| 5      | X             | B/Circle    |
| 6      | C             | X/Square    |
| 7      | V             | Y/Triangle  |
| 8      | A             | L Trigger   |
| 9      | S             | R Trigger   |
| 12     | Enter         | Start       |
| 13     | Space         | Select      |

```javascript
if (btn(0)) {
  // Left arrow held
  playerX -= 5;
}
if (btn(4)) {
  // Z key held
  shoot();
}
```

#### `btnp(i)` - Check if button was just pressed (single frame)

```javascript
if (btnp(13)) {
  // Space just pressed
  jump();
}
```

#### `isKeyDown(keyCode)` - Direct key checking (held)

```javascript
if (isKeyDown('ArrowLeft')) playerX -= 2;
if (isKeyDown('ArrowRight')) playerX += 2;
if (isKeyDown('a') || isKeyDown('A')) shootLeft();
if (isKeyDown('Space')) boost();
```

#### `isKeyPressed(keyCode)` - Direct key checking (just pressed)

```javascript
if (isKeyPressed('Enter')) startGame();
if (isKeyPressed('Space')) jump();
if (isKeyPressed('r') || isKeyPressed('R')) restart();
```

**Key Code Examples:**

- Arrow keys: `'ArrowLeft'`, `'ArrowRight'`, `'ArrowUp'`, `'ArrowDown'`
- Letters: `'a'`, `'A'`, `'KeyA'` (all work)
- Special: `'Space'`, `'Enter'`, `'Shift'`, `'Escape'`

### Mouse Input

#### `mouseX()` / `mouseY()`

Get mouse position (scaled to 640×360).

```javascript
const mx = mouseX();
const my = mouseY();
nova64.draw.print(`Mouse: ${mx}, ${my}`, 10, 10);
```

#### `mouseDown()` / `mousePressed()`

Check mouse button state.

```javascript
if (mouseDown()) {
  // Mouse button held
  dragObject(mouseX(), mouseY());
}

if (mousePressed()) {
  // Mouse just clicked
  clickButton(mouseX(), mouseY());
}
```

### Gamepad Input

#### `gamepadConnected()`

Check if a gamepad is connected.

```javascript
if (gamepadConnected()) {
  nova64.draw.print('🎮 GAMEPAD READY', 10, 10);
}
```

#### Analog Stick Functions

```javascript
// Left stick
const lx = leftStickX(); // -1.0 to 1.0
const ly = leftStickY(); // -1.0 to 1.0

// Right stick
const rx = rightStickX(); // -1.0 to 1.0
const ry = rightStickY(); // -1.0 to 1.0

// Deadzone: 0.15 (automatically applied)
```

**Example: Smooth analog movement**

```javascript
function update(dt) {
  const moveSpeed = 100; // pixels per second

  // Analog stick movement
  if (gamepadConnected()) {
    playerX += leftStickX() * moveSpeed * dt;
    playerY += leftStickY() * moveSpeed * dt;
  }

  // Keyboard fallback
  if (btn(0)) playerX -= moveSpeed * dt; // Left
  if (btn(1)) playerX += moveSpeed * dt; // Right
  if (btn(2)) playerY -= moveSpeed * dt; // Up
  if (btn(3)) playerY += moveSpeed * dt; // Down
}
```

---

## 🎲 3D Graphics API

Nova64 uses Three.js for 3D rendering with a simplified API.

### Camera Functions

#### `setCameraPosition(x, y, z)`

Set camera position in 3D space.

```javascript
nova64.camera.setCameraPosition(0, 10, 20); // Behind and above origin
```

#### `setCameraTarget(x, y, z)`

Set what the camera looks at.

```javascript
nova64.camera.setCameraTarget(0, 0, 0); // Look at origin
```

#### `setCameraLookAt(x, y, z)`

Set camera direction vector (for FPS controls).

```javascript
nova64.camera.setCameraLookAt(player.x, player.y, player.z);
```

#### `setCameraFOV(degrees)`

Set field of view (30-120, default 75).

```javascript
nova64.camera.setCameraFOV(90); // Wider view for FPS games
```

### Lighting

#### `setAmbientLight(hexColor)`

Set global ambient lighting.

```javascript
nova64.light.setAmbientLight(0x404040); // Gray ambient
nova64.light.setAmbientLight(0x1a1a2a); // Dark blue ambient
```

#### `setLightDirection(x, y, z)`

Set the main directional light direction vector.

```javascript
nova64.light.setLightDirection(-0.5, -1, -0.3); // From top-left
nova64.light.setLightDirection(1, 1, 0.5); // From upper-right
```

#### `setLightColor(hexColor, intensity?)`

Configure directional light colour and intensity.

```javascript
nova64.light.setLightColor(0xffffff, 1.0); // White light, full intensity
nova64.light.setLightColor(0xffd4a0, 0.8); // Warm sunset light
```

#### `createPointLight(hexColor, intensity, [x, y, z], distance?)`

Add a point light at a world-space position.

```javascript
const lamp = createPointLight(0xff8800, 2.0, [5, 3, 0], 20);
```

### Fog

#### `setFog(hexColor, near, far)`

Add distance fog for atmosphere.

```javascript
nova64.light.setFog(0x000020, 30, 150); // Dark blue fog
```

### 3D Objects

#### `createCube(size, color, position, options?)` / `createCube(width, height, depth, color, position, options?)`

Create a cube or rectangular box mesh.

```javascript
const cube = createCube(2, 0xff0000, [0, 0, 0]); // Red 2x2x2 cube
const box = createCube(4, 2, 1, 0x00ff00, [5, 1, 0], {
  flatShading: true,
});
```

#### `createAdvancedCube(size, materialOptions, position)`

Create cube with emissive materials (for bloom).

```javascript
const neonCube = createAdvancedCube(
  1,
  {
    color: 0x00ffff, // Cyan base
    emissive: 0x00ffff, // Cyan glow
    emissiveIntensity: 0.8, // Glow strength (0-2+)
    flatShading: true, // Retro look
  },
  [0, 1, 0]
);
```

#### `createSphere(radius, color, position, options?)` / `createSphere(radius, color, position, segments?, options?)`

Create a sphere.

```javascript
const sphere = createSphere(1, 0xff00ff, [0, 2, 0], 8); // Low-poly
const glowSphere = createSphere(1, 0xffff00, [3, 1, 0], {
  emissive: 0xffff00,
  emissiveIntensity: 1.0,
});
```

#### `createPlane(width, depth, color, position)`

Create a flat plane.

```javascript
const floor = createPlane(100, 100, 0x008800, [0, 0, 0]);
```

### Mesh Manipulation

#### `setPosition(meshId, x, y, z)` or `setPosition(meshId, [x, y, z])`

Move a mesh.

```javascript
nova64.scene.setPosition(cube, playerX, playerY, playerZ);
nova64.scene.setPosition(sphere, [10, 5, 3]);
```

#### `setRotation(meshId, x, y, z)` or `setRotation(meshId, [x, y, z])`

Rotate a mesh (radians).

```javascript
nova64.scene.setRotation(cube, 0, Math.PI / 4, 0); // Rotate 45° around Y
nova64.scene.setRotation(box, [angle, 0, 0]);
```

#### `setScale(meshId, x, y, z)` or `setScale(meshId, [x, y, z])`

Scale a mesh.

```javascript
nova64.scene.setScale(cube, 2, 1, 2); // Wide and deep
nova64.scene.setScale(sphere, [0.5, 0.5, 0.5]); // Half size
```

#### `destroyMesh(meshId)`

Remove a mesh from the scene.

```javascript
nova64.scene.destroyMesh(cube);
```

### Skybox

#### `createSpaceSkybox(options?)`

Procedural starfield and nebulae — the default Nova64 space look.

```javascript
nova64.light.createSpaceSkybox(); // Default stars + nebulae
nova64.light.createSpaceSkybox({ starCount: 2000, nebulaCount: 4 });
```

#### `createGradientSkybox(topColor, bottomColor)`

Two-colour gradient sky — great for outdoor scenes and sunsets.

```javascript
nova64.light.createGradientSkybox(0x0077ff, 0x004488); // Blue sky
nova64.light.createGradientSkybox(0xff6a00, 0x1a0033); // Sunset
```

#### `createSolidSkybox(color)`

Flat solid colour sky — good for caves or indoor scenes.

```javascript
nova64.light.createSolidSkybox(0x000000); // Pure black
```

#### `createImageSkybox([px, nx, py, ny, pz, nz])`

Cube-map skybox from 6 image URLs. Also enables image-based lighting (IBL).

```javascript
nova64.light.createImageSkybox([
  '/assets/sky_px.jpg',
  '/assets/sky_nx.jpg',
  '/assets/sky_py.jpg',
  '/assets/sky_ny.jpg',
  '/assets/sky_pz.jpg',
  '/assets/sky_nz.jpg',
]);
```

#### `clearSkybox()`

Remove the current skybox.

```javascript
nova64.light.clearSkybox();
```

#### `enableSkyboxAutoAnimate(speed?)` / `disableSkyboxAutoAnimate()`

Auto-rotate the skybox every frame.

```javascript
nova64.light.enableSkyboxAutoAnimate(0.5); // Slow drift
nova64.light.disableSkyboxAutoAnimate();
```

#### `animateSkybox(dt)`

Manually advance skybox animation by delta-time (call in `update`).

```javascript
export function update(dt) {
  nova64.light.animateSkybox(dt);
}
```

#### `setSkyboxSpeed(multiplier)`

Scale the auto-animation speed.

```javascript
nova64.light.setSkyboxSpeed(2.0); // Double speed
```

---

## ✨ Visual Effects API

### Post-Processing

#### `enableBloom(strength?, radius?, threshold?)`

Add bloom glow effect.

```javascript
nova64.fx.enableBloom(); // Default settings
nova64.fx.enableBloom(1.2, 0.6, 0.3); // Balanced neon glow
nova64.fx.enableBloom(2.0, 0.8, 0.2); // Strong dramatic glow
```

**Parameters:**

- `strength` (0.5-3.0): Glow intensity. **Optimal: 1.0-1.5**
- `radius` (0.0-1.0): Glow spread. **Optimal: 0.6-0.8**
- `threshold` (0.0-1.0): Brightness cutoff. **Optimal: 0.2-0.4**

#### `disableBloom()`

Turn off bloom effect.

```javascript
nova64.fx.disableBloom();
```

#### `setBloomStrength(value)`

Adjust bloom strength at runtime.

```javascript
nova64.fx.setBloomStrength(1.5); // Increase intensity
```

#### `enableFXAA()`

Enable anti-aliasing (smooths edges).

```javascript
nova64.fx.enableFXAA(); // Usually paired with bloom
```

#### `disableFXAA()`

Disable anti-aliasing.

```javascript
nova64.fx.disableFXAA();
```

### Optimal Bloom Settings Guide

| Use Case    | Strength | Radius  | Threshold | Emissive |
| ----------- | -------- | ------- | --------- | -------- |
| Subtle glow | 0.5-0.8  | 0.4-0.5 | 0.4-0.5   | 0.3-0.5  |
| Neon/Tron   | 1.0-1.5  | 0.6-0.8 | 0.2-0.3   | 0.6-0.8  |
| Dramatic    | 1.5-2.0  | 0.8-1.0 | 0.1-0.2   | 0.8-1.2  |
| Extreme     | 2.0+     | 1.0     | 0.1       | 1.0+     |

**Warning:** Too much bloom causes white-out! Keep strength ≤ 1.5 for most scenes.

### Example: Neon Scene

```javascript
export function init() {
  // Enable balanced bloom for neon aesthetic
  nova64.fx.enableBloom(1.2, 0.6, 0.3);
  nova64.fx.enableFXAA();

  // Dark environment
  nova64.light.setAmbientLight(0x1a1a2a);
  nova64.light.setFog(0x000020, 30, 150);

  // Glowing objects
  const neonCube = createAdvancedCube(
    1,
    {
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8, // Sweet spot for visibility
    },
    [0, 1, 0]
  );
}
```

---

## 🧱 Voxel Engine API

Build Minecraft-style block worlds.

### World Management

#### `updateVoxelWorld(playerX, playerZ)`

Load/unload chunks around player.

```javascript
nova64.voxel.updateVoxelWorld(player.x, player.z); // Call when player moves
```

### Block Types

```javascript
BLOCK_TYPES = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5, // Transparent
  WOOD: 6,
  LEAVES: 7,
  COBBLESTONE: 8,
  PLANKS: 9,
  GLASS: 10, // Transparent
  BRICK: 11,
  SNOW: 12,
  ICE: 13,
  BEDROCK: 14,
};
```

### Block Interaction

#### `getVoxelBlock(x, y, z)`

Get block type at position.

```javascript
const block = getVoxelBlock(10, 35, 10);
if (block === BLOCK_TYPES.STONE) {
  console.log('Found stone!');
}
```

#### `setVoxelBlock(x, y, z, blockType)`

Place or remove a block.

```javascript
nova64.voxel.setVoxelBlock(10, 35, 10, BLOCK_TYPES.STONE); // Place stone
nova64.voxel.setVoxelBlock(10, 35, 10, BLOCK_TYPES.AIR); // Remove block
```

#### `raycastVoxelBlock(origin, direction, maxDistance)`

Find block player is looking at.

```javascript
const result = raycastVoxelBlock(
  [player.x, player.y + 1.6, player.z], // Eye position
  lookDirection, // [dx, dy, dz]
  10 // Max reach
);

if (result.hit) {
  const [x, y, z] = result.position;
  console.log(`Looking at block at ${x}, ${y}, ${z}`);
}
```

### Physics

#### `checkVoxelCollision(position, size)`

Check if position collides with solid blocks.

```javascript
const colliding = checkVoxelCollision(
  [player.x, player.y, player.z],
  0.3 // Collision radius
);

if (colliding) {
  console.log('Hit a block!');
}
```

### Structures

#### `placeVoxelTree(x, y, z)`

Generate a tree.

```javascript
nova64.voxel.placeVoxelTree(20, 35, 20); // Trunk + leaves
```

### Example: Basic Voxel Game

```javascript
let player = { x: 0, y: 50, z: 0, vy: 0 };

export function init() {
  nova64.voxel.updateVoxelWorld(0, 0); // Initial world gen
  nova64.camera.setCameraFOV(95); // Wide FOV for voxels
}

export function update(dt) {
  // Movement
  const speed = 10;
  if (btn(0)) player.x -= speed * dt;
  if (btn(1)) player.x += speed * dt;
  if (btn(2)) player.z -= speed * dt;
  if (btn(3)) player.z += speed * dt;

  // Gravity
  player.vy -= 20 * dt;
  player.y += player.vy * dt;

  // Ground collision
  const onGround = checkVoxelCollision([player.x, player.y, player.z], 0.3);
  if (onGround && player.vy < 0) {
    player.vy = 0;
  }

  // Jump
  if (btnp(13) && onGround) {
    player.vy = 10;
  }

  // Update world
  nova64.voxel.updateVoxelWorld(player.x, player.z);
}
```

---

## 🖼️ UI System

### Buttons

#### `createButton(x, y, width, height, text, callback, options?)`

Create an interactive button.

```javascript
const startBtn = createButton(
  200,
  150,
  240,
  60,
  'START GAME',
  () => {
    gameState = 'playing';
  },
  {
    normalColor: rgba8(0, 128, 255, 255),
    hoverColor: rgba8(50, 150, 255, 255),
    pressedColor: rgba8(0, 100, 200, 255),
  }
);
```

#### `updateAllButtons()`

Check for button clicks (call in `update()`).

```javascript
export function update(dt) {
  const clicked = updateAllButtons();
  if (clicked) {
    console.log('A button was clicked!');
  }
}
```

#### `drawAllButtons()`

Render all buttons (call in `draw()`).

```javascript
export function draw() {
  nova64.ui.drawAllButtons();
}
```

#### `clearButtons()`

Remove all buttons.

```javascript
nova64.ui.clearButtons(); // Clear menu when starting game
```

### Panels

#### `createPanel(x, y, width, height, options?)`

Create a styled panel background.

```javascript
const panel = createPanel(50, 50, 300, 200, {
  bgColor: rgba8(20, 20, 40, 200), // Semi-transparent dark blue
  borderColor: rgba8(0, 255, 255, 255), // Cyan border
  borderWidth: 3,
  shadow: true,
  gradient: true,
  gradientColor: rgba8(40, 40, 80, 200),
});
```

#### `drawPanel(panel)`

Draw a panel.

```javascript
nova64.draw.drawPanel(panel);
```

### Pre-defined UI Colors

```javascript
const uiColors = {
  primary: rgba8(0, 128, 255, 255), // Blue
  secondary: rgba8(128, 128, 128, 255), // Gray
  success: rgba8(0, 255, 0, 255), // Green
  warning: rgba8(255, 255, 0, 255), // Yellow
  danger: rgba8(255, 0, 0, 255), // Red
  light: rgba8(220, 220, 220, 255), // Light gray
  dark: rgba8(40, 40, 40, 255), // Dark gray
};
```

### Text Helpers

#### `setFont(size)`

Change font size (future feature).

```javascript
nova64.ui.setFont('normal'); // 8px (default)
nova64.ui.setFont('large'); // 16px
nova64.ui.setFont('huge'); // 24px
```

#### `setTextAlign(align)`

Set text alignment.

```javascript
nova64.ui.setTextAlign('left'); // Default
nova64.ui.setTextAlign('center'); // Centered
nova64.ui.setTextAlign('right'); // Right-aligned
```

#### `drawText(text, x, y, color, align?)`

Draw text with alignment.

```javascript
nova64.ui.drawText('GAME OVER', 320, 180, rgba8(255, 0, 0, 255), 1); // Centered
```

#### `drawTextShadow(text, x, y, color, shadowColor, shadowOffset, align?)`

Draw text with shadow.

```javascript
nova64.ui.drawTextShadow(
  'TITLE',
  320,
  50,
  nova64.draw.rgba8(255, 255, 255, 255), // White text
  nova64.draw.rgba8(0, 0, 0, 255), // Black shadow
  4,
  1 // Offset, alignment
);
```

#### `drawTextOutline(text, x, y, color, outlineColor, thickness, align?)`

Draw text with outline.

```javascript
nova64.ui.drawTextOutline(
  'SCORE: 1000',
  320,
  20,
  nova64.draw.rgba8(255, 255, 0, 255), // Yellow text
  nova64.draw.rgba8(0, 0, 0, 255), // Black outline
  2,
  1 // Thickness, alignment
);
```

### Gradient Rectangle

#### `drawGradientRect(x, y, width, height, colorTop, colorBottom, vertical?)`

Draw a gradient-filled rectangle.

```javascript
// Vertical gradient
nova64.ui.drawGradientRect(
  0,
  0,
  640,
  360,
  nova64.draw.rgba8(0, 50, 100, 255), // Top: dark blue
  nova64.draw.rgba8(0, 0, 20, 255), // Bottom: darker
  true
);
```

---

## 🔊 Audio System

### Music

#### `playMusic(trackName, options?)`

Play background music.

```javascript
playMusic('theme', { loop: true, volume: 0.7 });
```

#### `stopMusic()`

Stop current music.

```javascript
stopMusic();
```

### Sound Effects

#### `playSound(soundName, options?)`

Play a sound effect.

```javascript
playSound('jump', { volume: 0.5 });
playSound('explosion', { volume: 1.0, pitch: 1.2 });
```

#### `stopSound(soundName)`

Stop a specific sound.

```javascript
stopSound('laser');
```

---

## 🛠️ Utility Functions

### Math Helpers

```javascript
// Clamp value between min and max
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Linear interpolation
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Distance between two points
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Random integer between min and max (inclusive)
function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random float between min and max
function rndFloat(min, max) {
  return Math.random() * (max - min) + min;
}
```

### Timing

#### `getDeltaTime()`

Get frame delta time (seconds).

```javascript
const dt = getDeltaTime(); // ~0.016 for 60 FPS
```

#### `getFPS()`

Get current frames per second.

```javascript
const fps = getFPS();
nova64.draw.print(`FPS: ${Math.round(fps)}`, 10, 10);
```

### Storage

#### `save(key, value)`

Save data to browser storage.

```javascript
save('highScore', 10000);
save('playerName', 'ACE');
```

#### `load(key, defaultValue?)`

Load data from storage.

```javascript
const score = load('highScore', 0);
const name = load('playerName', 'PLAYER');
```

---

## 📝 Complete Example Game

```javascript
// Simple platformer demonstrating multiple APIs

let player = {
  x: 100,
  y: 100,
  vx: 0,
  vy: 0,
  width: 16,
  height: 16,
  onGround: false,
};

let gameState = 'menu';
let score = 0;

export function init() {
  console.log('🎮 Platformer initialized!');

  // Create menu button
  nova64.ui.createButton(
    200,
    200,
    240,
    60,
    'START GAME',
    () => {
      gameState = 'playing';
    },
    {
      normalColor: rgba8(0, 128, 255, 255),
      hoverColor: rgba8(50, 150, 255, 255),
    }
  );
}

export function update(dt) {
  if (gameState === 'menu') {
    nova64.ui.updateAllButtons();
    return;
  }

  // Horizontal movement
  const moveSpeed = 200;
  if (btn(0))
    player.vx = -moveSpeed; // Left
  else if (btn(1))
    player.vx = moveSpeed; // Right
  else player.vx *= 0.8; // Friction

  // Jump
  if (btnp(13) && player.onGround) {
    player.vy = -400; // Jump velocity
  }

  // Gravity
  player.vy += 1000 * dt;

  // Apply velocity
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Ground collision (simple)
  if (player.y > 300) {
    player.y = 300;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  // Wrap screen
  if (player.x < 0) player.x = 640;
  if (player.x > 640) player.x = 0;

  // Camera follows player
  nova64.draw.setCamera(player.x - 320, 0);

  // Score increases over time
  score += Math.floor(dt * 10);
}

export function draw() {
  // Clear to sky blue
  nova64.draw.cls(rgba8(100, 150, 255, 255));

  if (gameState === 'menu') {
    // Menu screen
    nova64.ui.drawTextShadow('PLATFORMER', 320, 100, rgba8(255, 255, 255, 255), rgba8(0, 0, 0, 255), 4, 1);
    nova64.ui.drawAllButtons();
    return;
  }

  // Draw ground
  nova64.draw.rectfill(0, 316, 640, 44, rgba8(50, 150, 50, 255));

  // Draw player
  nova64.draw.rectfill(
    player.x - player.width / 2,
    player.y - player.height,
    player.width,
    player.height,
    nova64.draw.rgba8(255, 0, 0, 255)
  );

  // Draw HUD (no camera offset)
  nova64.draw.setCamera(0, 0);
  nova64.draw.print(`SCORE: ${score}`, 10, 10, rgba8(255, 255, 255, 255));
  nova64.draw.print(`FPS: ${Math.round(getFPS())}`, 10, 25, rgba8(255, 255, 0, 255));
}
```

---

## 🎯 Best Practices

### Performance

1. **Use `rectfill()` instead of filled `rect()`** - More explicit
2. **Minimize `pset()` calls** - Draw shapes instead of individual pixels
3. **Clear buttons when not needed** - Call `clearButtons()` on state changes
4. **Use camera for scrolling** - Don't offset every draw call manually
5. **Keep bloom moderate** - Strength 1.0-1.5, emissive 0.6-0.8
6. **Update voxel world sparingly** - Only when player moves significantly

### Code Organization

```javascript
// Good: Separate concerns
const GAME_STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
};

let gameState = GAME_STATES.MENU;

function updateMenu(dt) {
  /* ... */
}
function updatePlaying(dt) {
  /* ... */
}
function updateGameOver(dt) {
  /* ... */
}

export function update(dt) {
  switch (gameState) {
    case GAME_STATES.MENU:
      updateMenu(dt);
      break;
    case GAME_STATES.PLAYING:
      updatePlaying(dt);
      break;
    case GAME_STATES.GAMEOVER:
      updateGameOver(dt);
      break;
  }
}
```

### Input Handling

```javascript
// Good: Support multiple input methods
function update(dt) {
  let moving = false;

  // Keyboard
  if (btn(0)) {
    player.x -= speed * dt;
    moving = true;
  }
  if (btn(1)) {
    player.x += speed * dt;
    moving = true;
  }

  // Gamepad analog
  if (gamepadConnected()) {
    const stickX = leftStickX();
    if (Math.abs(stickX) > 0.1) {
      player.x += stickX * speed * dt;
      moving = true;
    }
  }

  // Apply friction when not moving
  if (!moving) {
    player.vx *= 0.9;
  }
}
```

---

## 🐛 Common Issues

### "Function is not defined"

**Problem:** Calling API function that doesn't exist.  
**Solution:** Check spelling, ensure function is exposed by runtime.

```javascript
// Wrong
addCube(1, 0xff0000, [0, 0, 0]); // ❌ No such function

// Right
createCube(1, 0xff0000, [0, 0, 0]); // ✅ Correct name
```

### White screen / Everything too bright

**Problem:** Bloom settings too high.  
**Solution:** Reduce bloom strength and emissive intensities.

```javascript
// Wrong - causes white-out
enableBloom(5.0, 1.0, 0.05); // ❌ Too extreme

// Right - balanced glow
enableBloom(1.2, 0.6, 0.3); // ✅ Visible details
```

### 3D scene not visible

**Problem:** Drawing `cls()` in `draw()` clears GPU-rendered scene.  
**Solution:** Remove `cls()` from `draw()` - 3D is auto-rendered.

```javascript
// Wrong
export function draw() {
  cls(); // ❌ Clears 3D scene!
  print('HUD', 10, 10);
}

// Right
export function draw() {
  // ✅ 3D scene renders first automatically
  print('HUD', 10, 10); // 2D overlay on top
}
```

### Button not responding

**Problem:** Not calling `updateAllButtons()` or button callback not firing.  
**Solution:** Call update function, check keyboard support with `isKeyDown()`.

```javascript
export function update(dt) {
  nova64.ui.updateAllButtons(); // ✅ Required!

  // Keyboard fallback
  if (isKeyDown('Space') || isKeyDown('Enter')) {
    startGame();
  }
}
```

---

## 📚 Additional Resources

- **EFFECTS_API_GUIDE.md** - Detailed effects documentation
- **VOXEL_ENGINE_GUIDE.md** - Complete voxel system guide
- **START_SCREEN_GUIDE.md** - Creating start screens
- **GAMEPAD_SUPPORT.md** - Controller mapping details
- **Examples folder** - 20+ working game demos

---

## 🎨 Example Games Included

1. **hello-3d** - Basic 3D shapes
2. **demoscene** - Visual effects showcase (5 scenes)
3. **tron-racer-3d** - Light cycle racing with bloom
4. **cyberpunk-city-3d** - Flying city explorer
5. **minecraft-demo** - Voxel world builder
6. **f-zero-nova-3d** - Futuristic racing
7. **star-fox-nova-3d** - Space combat
8. **shooter-demo-3d** - Space shooter
9. **3d-advanced** - Epic space battle
10. **knight-platformer** - Side-scrolling action

---

**Built with ❤️ by the Nova64 team**  
**Target Platform:** Nintendo 64 / PlayStation aesthetic  
**Resolution:** 640×360 @ 60 FPS  
**Powered by:** Three.js + Custom Runtime

🎮 **Happy Game Development!** 🎮
