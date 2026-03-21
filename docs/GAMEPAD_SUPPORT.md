# Nova64 Gamepad Support Documentation

## Overview

Nova64 now has full support for video game controllers (gamepads) with automatic detection and mapping to the standard button layout.

## Features

✅ **Automatic Detection**: Gamepads are automatically detected when connected  
✅ **Standard Mapping**: Uses the standard gamepad button layout (Xbox/PlayStation compatible)  
✅ **Analog Sticks**: Full support for both left and right analog sticks with deadzone  
✅ **Button States**: Both held (btn) and pressed (btnp) states supported  
✅ **Dual Input**: Keyboard and gamepad work simultaneously - use either or both!

## Button Mapping

### D-Pad and Face Buttons

```
btn(0)  - D-pad Up    / Arrow Up
btn(1)  - D-pad Left  / Arrow Left
btn(2)  - D-pad Right / Arrow Right
btn(3)  - D-pad Down  / Arrow Down
btn(4)  - X button    / Z key
btn(5)  - Y button    / X key
btn(6)  - LB button   / C key
btn(7)  - RB button   / V key
btn(8)  - LT button   / A key
btn(9)  - RT button   / S key
btn(12) - Start       / Enter
btn(13) - Select      / Space
```

### Analog Sticks

Access analog stick values directly:

```javascript
// Left analog stick
const leftX = leftStickX(); // -1.0 to 1.0 (left to right)
const leftY = leftStickY(); // -1.0 to 1.0 (up to down)

// Right analog stick
const rightX = rightStickX(); // -1.0 to 1.0 (left to right)
const rightY = rightStickY(); // -1.0 to 1.0 (up to down)

// Or use the gamepadAxis function
const lx = gamepadAxis('leftX');
const ly = gamepadAxis('leftY');
const rx = gamepadAxis('rightX');
const ry = gamepadAxis('rightY');
```

**Note**: A deadzone of 0.15 is applied automatically to prevent stick drift.

## API Functions

### Button Functions

```javascript
// Check if button is currently held down
if (btn(0)) {
  // D-pad up is being held (keyboard or gamepad)
}

// Check if button was just pressed this frame
if (btnp(4)) {
  // X button was just pressed (not held)
  shoot();
}
```

### Analog Stick Functions

```javascript
// Left stick for movement
export function update(dt) {
  const moveX = leftStickX();
  const moveY = leftStickY();

  if (Math.abs(moveX) > 0 || Math.abs(moveY) > 0) {
    player.x += moveX * speed * dt;
    player.y += moveY * speed * dt;
  }
}

// Right stick for camera control
export function update(dt) {
  const camX = rightStickX();
  const camY = rightStickY();

  camera.rotation += camX * sensitivity * dt;
  camera.pitch += camY * sensitivity * dt;
}
```

### Detection

```javascript
// Check if a gamepad is connected
if (gamepadConnected()) {
  print('Gamepad Ready!', 10, 10, rgba8(0, 255, 0, 255));
}
```

## Usage Examples

### Basic Movement

```javascript
export function update(dt) {
  // Movement with D-pad or left stick
  if (btn(0) || leftStickY() < -0.3) {
    player.y -= speed * dt; // Move up
  }
  if (btn(3) || leftStickY() > 0.3) {
    player.y += speed * dt; // Move down
  }
  if (btn(1) || leftStickX() < -0.3) {
    player.x -= speed * dt; // Move left
  }
  if (btn(2) || leftStickX() > 0.3) {
    player.x += speed * dt; // Move right
  }

  // Action buttons
  if (btnp(4)) {
    jump();
  }
  if (btnp(5)) {
    attack();
  }
}
```

### Racing Game Controls

```javascript
export function update(dt) {
  // Use left stick for steering
  const steer = leftStickX();
  car.angle += steer * turnSpeed * dt;

  // RT for accelerate, LT for brake
  if (btn(9)) {
    // RT
    car.speed += acceleration * dt;
  }
  if (btn(8)) {
    // LT
    car.speed -= braking * dt;
  }

  // A button for boost
  if (btnp(4)) {
    activateBoost();
  }
}
```

### Menu Navigation

```javascript
let menuIndex = 0;
const menuItems = ['Start Game', 'Options', 'Quit'];

export function update(dt) {
  // Navigate menu with D-pad or left stick
  if (btnp(3) || leftStickY() > 0.7) {
    menuIndex = (menuIndex + 1) % menuItems.length;
  }
  if (btnp(0) || leftStickY() < -0.7) {
    menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length;
  }

  // Select with A button or Start
  if (btnp(4) || btnp(12)) {
    selectMenuItem(menuIndex);
  }
}
```

### Camera Control

```javascript
export function update(dt) {
  // Left stick for player movement
  const moveX = leftStickX();
  const moveZ = leftStickY();

  player.x += moveX * speed * dt;
  player.z += moveZ * speed * dt;

  // Right stick for camera rotation
  const camX = rightStickX();
  const camY = rightStickY();

  camera.yaw += camX * sensitivity * dt;
  camera.pitch += camY * sensitivity * dt;
}
```

## Best Practices

### 1. Support Both Input Methods

Always support both keyboard and gamepad for maximum accessibility:

```javascript
// Good - supports both
const leftPressed = btn(1) || leftStickX() < -0.3;
const rightPressed = btn(2) || leftStickX() > 0.3;
```

### 2. Use btnp() for Actions

Use `btnp()` for discrete actions like jumping, shooting, or menu selection:

```javascript
if (btnp(4)) {
  jump(); // Only triggers once per press
}
```

Use `btn()` for continuous actions like movement or aiming:

```javascript
if (btn(9)) {
  accelerate(); // Continuously accelerates while held
}
```

### 3. Tune Your Deadzones

The default deadzone is 0.15. For analog movement, you may want to apply additional thresholds:

```javascript
const moveX = leftStickX();
const moveY = leftStickY();

// Apply custom threshold
const threshold = 0.2;
if (Math.abs(moveX) < threshold) moveX = 0;
if (Math.abs(moveY) < threshold) moveY = 0;
```

### 4. Show Gamepad Prompts

Display appropriate button prompts based on input method:

```javascript
export function draw() {
  if (gamepadConnected()) {
    print('Press A to Jump', 10, 10, rgba8(255, 255, 255, 255));
  } else {
    print('Press Z to Jump', 10, 10, rgba8(255, 255, 255, 255));
  }
}
```

### 5. Test With Multiple Controllers

Different gamepads may have slightly different button mappings. Test with:

- Xbox controllers
- PlayStation controllers
- Generic USB gamepads
- Switch Pro controllers

## Troubleshooting

### Gamepad Not Detected

1. Make sure the gamepad is connected before loading the game
2. Try pressing a button to wake up the gamepad
3. Check browser console for any errors
4. Some browsers require HTTPS for gamepad API

### Buttons Not Working

1. Verify button mapping with `console.log(btn(0), btn(1), btn(2))`
2. Check if gamepadConnected() returns true
3. Try a different gamepad or browser

### Stick Drift

If you experience stick drift:

1. The default deadzone is 0.15
2. Increase it in your game code with custom thresholds
3. Consider calibrating the physical controller

## Migration Guide

### Existing Games

To add gamepad support to existing games:

1. **No changes needed!** All existing `btn()` and `btnp()` calls now work with gamepads automatically

2. **Optional**: Add analog stick support for smoother movement:

```javascript
// Before (keyboard only)
if (btn(1)) player.x -= speed * dt;
if (btn(2)) player.x += speed * dt;

// After (keyboard + analog stick)
const moveX = leftStickX();
if (btn(1) || moveX < -0.3) player.x -= speed * dt;
if (btn(2) || moveX > 0.3) player.x += speed * dt;

// Even better (smooth analog movement)
player.x += leftStickX() * speed * dt;
```

3. **Optional**: Show gamepad indicator:

```javascript
if (gamepadConnected()) {
  print('🎮', 600, 10, rgba8(0, 255, 0, 255));
}
```

## Technical Details

- **Polling**: Gamepad state is polled automatically every frame
- **Latency**: Sub-frame latency for responsive controls
- **Compatibility**: Works with the standard Gamepad API (Chrome, Firefox, Edge, Safari)
- **Multiple Gamepads**: Currently uses first connected gamepad (index 0)
- **Deadzone**: 0.15 applied to all analog axes

## Future Enhancements

Planned features:

- [ ] Rumble/vibration support
- [ ] Multiple gamepad support (local multiplayer)
- [ ] Button remapping
- [ ] Configurable deadzones
- [ ] Analog button pressure (triggers)
- [ ] Motion controls (gyro/accelerometer)

## Conclusion

Gamepad support in Nova64 makes your games more accessible and enjoyable. Players can use whatever input method they prefer, and analog sticks provide smoother, more precise control for 3D games.

For questions or issues, please refer to the Nova64 documentation or submit an issue on GitHub.
