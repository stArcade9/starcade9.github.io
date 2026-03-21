# 🚀 Ultimate 3D Migration Guide for Nova64

Transform your Nova64 experiences into **spectacular 3D fantasy console adventures** with advanced materials, cinematic lighting, and Nintendo 64/PlayStation aesthetics!

## 🌟 **Migration to v0.2.0**

### 🎯 **Breaking Changes**

- **Three.js Only**: Nova64 now exclusively uses Three.js for maximum 3D performance
- **Enhanced API**: New 3D functions with improved parameter structure
- **Material System**: Advanced material options with new configuration format
- **Camera Controls**: Improved camera system with smooth interpolation

### ✅ **Backward Compatibility**

- **100% 2D Compatibility**: All existing 2D carts work without modification
- **Gradual Migration**: Add 3D elements incrementally to existing projects
- **API Preservation**: Core 2D functions remain unchanged

## 🌟 **Revolutionary 3D Transformation**

### 🎪 **Advanced Rendering Pipeline**

1. **🎯 3D Scene Rendering**: Automatic Three.js rendering with advanced materials and lighting
2. **🎨 2D Overlay Compositing**: High-precision transparent overlay for HUD and UI elements
3. **✅ 100% Backward Compatibility**: All existing 2D carts work flawlessly with zero changes
4. **⚡ Hot Reloading**: Instant updates without losing game state during development

### 📐 **Coordinate Systems**

- **🌍 3D World Space**: Standard 3D coordinates (Y-up) with perspective projection
- **🖥️ 2D Screen Space**: 320×180 pixel overlay coordinates (Y-down) for UI elements
- **🎯 Hybrid Mapping**: Seamless conversion between 2D screen and 3D world positions

## 🎯 **Spectacular Migration Steps**

### 🌟 **Step 1: Advanced 3D Scene Setup**

Transform your cart into a cinematic 3D experience:

```javascript
// ❌ Before (Basic 2D)
export function init() {
  cls();
  // Basic 2D initialization...
}

// ✅ After (Ultimate 3D Fantasy Console)
export function init() {
  console.log('🚀 Initializing spectacular 3D world...');

  // 🎪 Advanced 3D scene setup
  setCameraPosition(0, 5, 10); // Cinematic camera position
  setCameraTarget(0, 0, 0); // Look at world origin
  setCameraFOV(75); // Wide-angle perspective

  // 🌫️ Atmospheric effects for depth and mood
  setFog(0x1a1a2e, 8, 25); // Mysterious purple fog

  // 💡 Enhanced lighting system
  setAmbientLight(0x404060, 0.3); // Subtle ambient lighting
  setDirectionalLight(0xffffff, 0.8); // Strong directional light

  // ✨ Visual enhancement effects
  enablePostProcessing(true); // ACES tone mapping + bloom
  setRenderQuality('high'); // 4K shadows, full effects

  // 🎨 Existing 2D initialization (still works!)
  cls();
  // ... your existing 2D setup
}
```

### 🎨 **Step 2: Advanced 3D Object Creation**

Add spectacular 3D objects with professional materials:

```javascript
let player2D = { x: 160, y: 90 }; // Existing 2D player
let player3D,
  worldObjects = []; // New 3D representations
let particleEffects = []; // Dynamic particle systems

export function init() {
  // Previous 3D setup...

  // 👤 Create spectacular 3D player with advanced materials
  player3D = createCube(0, 1, 0, 1, {
    material: 'metallic', // Professional metallic surface
    color: 0x0088ff, // Bright blue primary color
    emissive: 0x002244, // Subtle blue glow
    metalness: 0.8, // High metallic reflection
    roughness: 0.2, // Smooth, polished surface
  });

  // 🌍 Create immersive world environment
  const ground = createPlane(0, -1, 0, 30, 30, {
    material: 'standard',
    color: 0x2a4d3a, // Forest green ground
    roughness: 0.8, // Natural rough surface
  });
  rotateMesh(ground, -Math.PI / 2, 0, 0); // Make horizontal

  // ✨ Add magical floating crystals
  for (let i = 0; i < 8; i++) {
    const crystal = createCube(
      Math.cos((i * Math.PI) / 4) * 5, // Circular arrangement
      2 + Math.sin(i * 0.5), // Varied heights
      Math.sin((i * Math.PI) / 4) * 5,
      0.6,
      {
        material: 'holographic', // Ultimate visual effect
        color: 0xff0088,
        emissive: 0x440022,
      }
    );
    worldObjects.push({ mesh: crystal, spin: i * 0.1 });
  }
}
```

### 📐 **Step 3: Advanced Coordinate Transformation**

Seamlessly convert between 2D screen and 3D world coordinates:

```javascript
// 🎯 Professional coordinate mapping with perspective correction
function screen2DToWorld3D(screenX, screenY, depth = 0) {
  // Advanced mapping with camera-relative positioning
  const worldX = (screenX - 160) / 32; // Center and scale X
  const worldZ = (screenY - 90) / 32 + depth; // Y becomes Z with depth
  const worldY = 0; // Ground level default
  return { x: worldX, y: worldY, z: worldZ };
}

function world3DToScreen2D(worldX, worldY, worldZ) {
  // Project 3D world coordinates to 2D screen space
  const screenX = worldX * 32 + 160;
  const screenY = worldZ * 32 + 90;
  return { x: screenX, y: screenY };
}

// 🎪 Advanced raycasting for precise 3D interaction
function screenToWorldRay(mouseX, mouseY) {
  // Cast ray from camera through screen point for object picking
  const ray = raycastFromCamera(mouseX, mouseY);
  if (ray && ray.object) {
    console.log(`Hit 3D object: ${ray.object.uuid} at distance ${ray.distance}`);
    return ray;
  }
  return null;
}

// 🌍 Convert 2D game coordinates to immersive 3D positions
function enhance2DWith3D(gameObject2D) {
  const world3D = screen2DToWorld3D(gameObject2D.x, gameObject2D.y);

  // Create spectacular 3D representation
  const mesh3D = createCube(world3D.x, world3D.y + 1, world3D.z, 0.8, {
    material: 'emissive',
    color: gameObject2D.color || 0xff4488,
    emissive: 0x220011,
  });

  return { ...gameObject2D, mesh3D, world3D };
}
```

### ⚡ **Step 4: Enhanced Update System**

Create smooth, responsive hybrid 2D/3D gameplay:

```javascript
export function update() {
  // 🎮 Enhanced input system with WASD + arrows support
  const moveSpeed = 0.12;
  const rotationSpeed = 0.05;

  // Modern WASD movement (enhanced input system)
  if (key('KeyW') || btn(2)) {
    // W or Up
    player2D.y -= 2;
    player3D.velocity.z = -moveSpeed;
  }
  if (key('KeyS') || btn(3)) {
    // S or Down
    player2D.y += 2;
    player3D.velocity.z = moveSpeed;
  }
  if (key('KeyA') || btn(0)) {
    // A or Left
    player2D.x -= 2;
    player3D.velocity.x = -moveSpeed;
  }
  if (key('KeyD') || btn(1)) {
    // D or Right
    player2D.x += 2;
    player3D.velocity.x = moveSpeed;
  }
  if (key('Space') || btn(4)) {
    // Space or Z button
    player3D.velocity.y = 0.08; // Jump with physics
  }

  // 🎯 Advanced 3D physics and positioning
  const world3D = screen2DToWorld3D(player2D.x, player2D.y);

  // Smooth 3D positioning with interpolation
  const currentPos = getMeshPosition(player3D);
  const targetX = lerp(currentPos.x, world3D.x, 0.1);
  const targetZ = lerp(currentPos.z, world3D.z, 0.1);
  setPosition(player3D, targetX, currentPos.y, targetZ);

  // Apply physics (gravity, ground collision)
  player3D.velocity.y -= 0.01; // Gravity
  if (currentPos.y <= 1) {
    // Ground collision
    setPosition(player3D, targetX, 1, targetZ);
    player3D.velocity.y = 0;
  }

  // 🎪 Spectacular world object animations
  worldObjects.forEach((obj, i) => {
    obj.spin += rotationSpeed;
    rotateMesh(obj.mesh, obj.spin, obj.spin * 1.3, obj.spin * 0.7);

    // Dynamic floating motion
    const floatY = 2 + Math.sin(time * 0.02 + i) * 0.4;
    const pos = getMeshPosition(obj.mesh);
    setPosition(obj.mesh, pos.x, floatY, pos.z);
  });

  // 📷 Cinematic camera following
  setCameraPosition(world3D.x + 4, world3D.y + 3, world3D.z + 6);
  setCameraTarget(world3D.x, world3D.y + 1, world3D.z);
}
```

### 🎨 **Step 5: Professional Hybrid Rendering**

Create stunning 3D scenes with polished 2D HUD overlays:

```javascript
export function draw() {
  // 🎪 Advanced 3D rendering with cinematic effects
  draw3d(() => {
    // 3D scene renders automatically with all objects
    // Advanced lighting, materials, and post-processing active

    // 🌟 Optional: Add dynamic lighting effects
    const lightIntensity = 0.8 + Math.sin(time * 0.05) * 0.2;
    setDirectionalLight(0xffffff, lightIntensity);

    // 💫 Optional: Dynamic atmospheric effects
    const fogColor = Math.floor(Math.sin(time * 0.03) * 20 + 40);
    setFog((fogColor << 16) + (fogColor << 8) + (fogColor + 20), 8, 25);
  });

  // 📊 Professional HUD system (rendered over 3D)
  cls(); // Clear 2D overlay (transparent background)

  // 🏆 Game statistics with modern styling
  print('🏆 SCORE: 1,337', 10, 10, 0xffffff);
  print('❤️  HEALTH: ██████████', 10, 26, 0xff4444);
  print('💎 CRYSTALS: ' + collectedCrystals, 10, 42, 0x44ff88);
  print('⚡ ENERGY: ' + Math.floor(playerEnergy), 10, 58, 0x4488ff);

  // 🗺️ Advanced minimap with 3D awareness
  const mapX = 240,
    mapY = 10,
    mapSize = 70;
  rect(mapX, mapY, mapSize, mapSize, 0x333333, true); // Map background
  rect(mapX, mapY, mapSize, mapSize, 0x888888, false); // Map border

  // Draw 3D objects on minimap
  worldObjects.forEach(obj => {
    const pos = getMeshPosition(obj.mesh);
    const mapPosX = mapX + (pos.x + 10) * (mapSize / 20);
    const mapPosY = mapY + (pos.z + 10) * (mapSize / 20);
    pset(mapPosX, mapPosY, 0xff0088); // Crystal positions
  });

  // Player position on minimap
  const playerPos = getMeshPosition(player3D);
  const playerMapX = mapX + (playerPos.x + 10) * (mapSize / 20);
  const playerMapY = mapY + (playerPos.z + 10) * (mapSize / 20);
  rect(playerMapX - 1, playerMapY - 1, 3, 3, 0x00ff00, true); // Player dot

  // 🎮 Control instructions
  print('WASD: Move • Space: Jump • Mouse: Look', 10, 165, 0x888888);

  // 📈 Performance overlay (optional debug info)
  if (showDebug) {
    const stats = get3DStats();
    print(`FPS: ${Math.round(1000 / deltaTime)}`, 270, 10, 0x88ff88);
    print(`Triangles: ${stats.triangles}`, 270, 26, 0x88ff88);
    print(`Objects: ${stats.objects}`, 270, 42, 0x88ff88);
  }
}
```

## Common Patterns

### Camera Following 2D Character

```js
export function update(dt) {
  // Update 2D player...

  // Make 3D camera follow 2D position
  const [worldX, , worldZ] = screen2DToWorld3D(player2D.x, player2D.y);
  setCameraPosition(worldX, 5, worldZ + 5);
  setCameraTarget(worldX, 0, worldZ);
}
```

### 3D Background with 2D Gameplay

Perfect for platformers or shoot-em-ups:

```js
let terrain3D = [];
let enemies2D = [];

export function init() {
  // Create 3D terrain
  for (let x = -10; x <= 10; x += 2) {
    terrain3D.push(createCube(2, 0x336633, [x, -2, 0]));
  }

  // Traditional 2D enemies
  enemies2D.push({ x: 200, y: 100, vx: -1 });
}

export function update(dt) {
  // Update 2D gameplay
  enemies2D.forEach(enemy => {
    enemy.x += enemy.vx;
  });

  // Animate 3D background
  terrain3D.forEach((cube, i) => {
    rotateMesh(cube, 0, dt * 0.1, 0);
  });
}

export function draw() {
  cls();

  // Draw 2D gameplay elements
  enemies2D.forEach(enemy => {
    rect(enemy.x, enemy.y, 16, 16, rgba8(255, 0, 0, 255), true);
  });
}
```

### Mixed 2D/3D Particles

```js
let particles2D = [];
let particles3D = [];

function spawnExplosion(x, y) {
  // 2D particles for UI/effects
  for (let i = 0; i < 10; i++) {
    particles2D.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1.0,
    });
  }

  // 3D particles for world objects
  const [worldX, , worldZ] = screen2DToWorld3D(x, y);
  for (let i = 0; i < 5; i++) {
    const particle = createCube(0.1, 0xffaa00, [worldX, 0, worldZ]);
    particles3D.push({
      mesh: particle,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2,
      vz: (Math.random() - 0.5) * 2,
      life: 1.0,
    });
  }
}
```

## Performance Tips

### Efficient 3D Object Management

```js
// Object pooling for frequently created/destroyed objects
let particlePool = [];

function getPooledParticle() {
  if (particlePool.length > 0) {
    return particlePool.pop();
  }
  return createCube(0.1, 0xffaa00);
}

function returnToPool(meshId) {
  setPosition(meshId, 1000, 1000, 1000); // Move offscreen
  particlePool.push(meshId);
}
```

### LOD (Level of Detail)

```js
export function update(dt) {
  const cameraPos = getCamera().position;

  objects3D.forEach(obj => {
    const distance = distanceTo(obj.position, cameraPos);

    if (distance > 20) {
      // Hide distant objects
      setPosition(obj.mesh, 1000, 1000, 1000);
    } else if (distance > 10) {
      // Use low-detail version
      setScale(obj.mesh, 0.5);
    } else {
      // Full detail
      setScale(obj.mesh, 1);
    }
  });
}
```

## Debugging

### Visual Debugging

```js
export function draw() {
  cls();

  // Show 3D object count
  print(`3D Objects: ${get3DStats().render.geometries}`, 8, 8, rgba8(255, 255, 255, 255));

  // Show renderer type
  const rendererInfo = typeof createCube === 'function' ? 'Three.js' : 'WebGL2';
  print(`Renderer: ${rendererInfo}`, 8, 24, rgba8(200, 200, 200, 255));

  // Performance overlay
  const stats = get3DStats();
  if (stats.render) {
    print(`Triangles: ${stats.render.triangles}`, 8, 40, rgba8(150, 255, 150, 255));
    print(`Draw Calls: ${stats.render.calls}`, 8, 56, rgba8(150, 255, 150, 255));
  }
}
```

### Console Debugging

```js
// Check if 3D features are available
if (typeof createCube === 'function') {
  console.log('3D features available');
} else {
  console.log('Running in 2D-only mode');
}

// Get object information
const cube = createCube(1, 0xff0000);
console.log('Cube position:', getPosition(cube));
console.log('Cube rotation:', getRotation(cube));
```

## Best Practices

1. **Start Simple**: Add one 3D element at a time to existing carts
2. **Maintain 2D Feel**: Use 3D to enhance, not replace, the 2D aesthetic
3. **Performance First**: Monitor triangle count and draw calls
4. **Consistent Style**: Use N64-style effects (`enablePixelation`, `enableDithering`)
5. **Test Fallbacks**: Ensure carts work on WebGL2-only systems

## Example: Upgrading a Shooter

```js
// Before: Pure 2D shooter
let player = { x: 160, y: 140 };
let bullets = [];
let enemies = [];

// After: 3D background + 2D gameplay
let player = { x: 160, y: 140 };
let player3D;
let bullets = [];
let enemies = [];
let stars3D = [];

export function init() {
  // 3D setup
  setCameraPosition(0, 0, 5);
  setFog(0x000011, 10, 50);

  // Create 3D starfield
  for (let i = 0; i < 50; i++) {
    const star = createCube(0.1, 0xffffff, [
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 20,
      Math.random() * -30,
    ]);
    stars3D.push(star);
  }

  // 3D player ship
  player3D = createCube(0.5, 0x00ff00, [0, 0, 0]);
}

export function update(dt) {
  // 2D player movement
  if (btn(0)) player.x -= 3;
  if (btn(1)) player.x += 3;

  // Mirror to 3D
  const worldX = (player.x - 160) / 40;
  setPosition(player3D, worldX, 0, 2);

  // Animate starfield
  stars3D.forEach(star => {
    moveMesh(star, 0, 0, dt * 5);
    const pos = getPosition(star);
    if (pos[2] > 5) {
      setPosition(star, pos[0], pos[1], -30);
    }
  });

  // Standard 2D game logic...
}

export function draw() {
  cls(); // Clear for 2D overlay

  // 2D gameplay elements render on top of 3D
  rect(player.x - 8, player.y - 8, 16, 16, rgba8(0, 255, 0, 255), true);

  bullets.forEach(bullet => {
    pset(bullet.x, bullet.y, rgba8(255, 255, 0, 255));
  });

  enemies.forEach(enemy => {
    rect(enemy.x, enemy.y, 12, 12, rgba8(255, 0, 0, 255), true);
  });
}
```

This approach lets you gradually enhance existing games with 3D elements while maintaining their core 2D gameplay feel.
