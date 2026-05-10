# 🎮 Nova64 Ultimate 3D Fantasy Console API

## 🌟 **Revolutionary 3D Graphics System**

Nova64 delivers **spectacular Nintendo 64/PlayStation-style 3D graphics** with modern performance, featuring advanced materials, cinematic lighting, and 100% test coverage (35/35 tests passing).

### 🚀 **What's New in v0.2.5**

- **New Primitives**: `createCone`, `createCapsule`, `createTorus` — expands the primitive library to 7 shapes
- **PBR Material Control**: `setPBRProperties(meshId, {metalness, roughness, envMapIntensity})` — tune materials at runtime
- **Image Skybox + IBL**: `createImageSkybox([6 urls])` — cube-map backgrounds with image-based lighting
- **Gradient & Solid Skyboxes**: `createGradientSkybox(top, bottom)`, `createSolidSkybox(color)`
- **Skybox Animation API**: `setSkyboxSpeed()`, `enableSkyboxAutoAnimate()`, `disableSkyboxAutoAnimate()`
- **`removeMesh` Alias**: `removeMesh()` is now identical to `destroyMesh()` — both work
- **Cylinder Fixed**: `createCylinder()` now correctly produces a cylinder, not a box

### ✨ **Key Features**

- **🚀 Three.js Integration**: Hardware-accelerated 3D rendering with WebGL2
- **🎨 Advanced Materials**: Holographic, metallic, emissive, and animated surfaces
- **💡 Cinematic Lighting**: Multi-layered ambient, directional, and point lighting
- **🌫️ Atmospheric Effects**: Dynamic fog, volumetric lighting, particle systems
- **📐 High-Quality Shadows**: 4K shadow maps with soft shadow filtering
- **🎪 Post-Processing**: ACES tone mapping, bloom effects, motion blur

## 🏗️ **Progressive Enhancement Architecture**

Nova64's intelligent renderer system ensures maximum compatibility:

1. **🎯 Three.js** (Ultimate) - Complete 3D fantasy console with advanced effects
2. **⚡ WebGL2** (Enhanced) - High-performance 2D with shader effects and tone mapping
3. **🖼️ Canvas2D** (Compatible) - Universal 2D fallback for any device

**🔧 Renderer Control**: Use control panel dropdown or `localStorage.setItem('nova64-render-mode', 'threejs')`

## 🎯 **Complete 3D API Reference** (35+ Functions)

### 🎨 **Advanced Object Creation**

#### `createCube(size, color, position, options?)` / `createCube(width, height, depth, color, position, options?)` ⭐

Creates a cube or rectangular box mesh.

- `size` (number): Cube side length (default: 1)
- `width`, `height`, `depth` (number): Box dimensions when using the rectangular signature
- `color` (hex): Colour, e.g. `0xff4488`
- `position` (array): `[x, y, z]` world position (default: `[0, 0, 0]`)
- `options` (object): Material options — see Material Options table
- **Returns**: mesh ID (number)

```javascript
// Basic cube
const box = createCube(2, 0xff4488, [0, 1, 0]);

// Rectangular box
const wall = createCube(8, 3, 0.5, 0x666688, [0, 1.5, -4]);

// Holographic cube
const holoCube = createCube(1.5, 0x00ff88, [3, 1, -3], {
  material: 'holographic',
  emissive: 0x004400,
  metalness: 0.8,
  roughness: 0.2,
});
```

#### `createSphere(radius, color, position, options?)` ⭐

Creates a sphere mesh.

- `radius` (number): Sphere radius (default: 1)
- `color` (hex): Colour
- `position` (array): `[x, y, z]`
- `options` (object): Material options; also accepts `segments` (default: 8)
- **Returns**: mesh ID (number)

```javascript
// Metallic planet
const planet = createSphere(2, 0x4488ff, [0, 2, -8], {
  material: 'metallic',
  metalness: 0.9,
  roughness: 0.1,
});

// Low-poly N64 orb
const orb = createSphere(0.8, 0xffff00, [-4, 1, -5], {
  material: 'emissive',
  segments: 8,
});
```

#### `createPlane(width, height, color, position, options?)` ⭐

Creates a flat plane — ground, walls, ceilings.

- `width, height` (numbers): Plane dimensions
- `color` (hex): Colour
- `position` (array): `[x, y, z]`
- `options` (object): Material options
- **Returns**: mesh ID (number)

```javascript
// Ground plane
const ground = createPlane(100, 100, 0x228b22, [0, 0, 0]);

// Holographic wall
const wall = createPlane(8, 6, 0x00ffff, [5, 3, -10], {
  material: 'holographic',
  transparent: true,
  opacity: 0.7,
});
```

#### `loadModel(url, position, scale)` (async)

Loads GLTF/GLB 3D models with automatic N64-style material conversion.

- `url` (string): Path to .gltf or .glb file
- `position` (array): [x, y, z] position (default: [0, 0, 0])
- `scale` (number): Uniform scale factor (default: 1)
- Returns: Promise resolving to mesh ID

```js
const spaceship = await loadModel('/assets/ship.glb', [0, 0, 0], 0.5);
```

### Object Manipulation

#### `setPosition(meshId, x, y, z)`

Sets absolute position of a 3D object.

```js
setPosition(cube, 5, 2, -3);
```

#### `setRotation(meshId, x, y, z)`

Sets absolute rotation in radians.

```js
setRotation(cube, 0, Math.PI / 4, 0); // 45° Y rotation
```

#### `setScale(meshId, x, y, z)` or `setScale(meshId, uniform)`

Sets object scale. Use single number for uniform scaling.

```js
setScale(cube, 2); // Double size uniformly
setScale(cube, 1, 2, 1); // Stretch vertically only
```

#### `rotateMesh(meshId, x, y, z)`

Rotates by the specified amounts (additive).

```js
// Spin cube each frame
rotateMesh(cube, 0, dt, 0);
```

#### `moveMesh(meshId, x, y, z)`

Moves by the specified offset (additive).

```js
moveMesh(cube, 0, Math.sin(time) * dt, 0); // Bob up and down
```

#### `destroyMesh(meshId)`

Removes object from scene and frees memory.

```js
destroyMesh(cube);
```

### Camera Controls

#### `setCameraPosition(x, y, z)`

Sets camera position in world space.

```js
setCameraPosition(0, 5, 10); // Behind and above origin
```

#### `setCameraTarget(x, y, z)`

Sets what the camera looks at.

```js
setCameraTarget(0, 0, 0); // Look at origin
```

#### `setCameraFOV(degrees)`

Sets field of view angle.

```js
setCameraFOV(75); // Wide angle view
```

### Scene Effects

#### `setFog(color, near, far)`

Adds atmospheric fog for depth perception.

- `color` (hex): Fog color as 0xRRGGBB
- `near` (number): Distance where fog starts
- `far` (number): Distance where fog is fully opaque

```js
setFog(0x003366, 10, 50); // Blue distance fog
```

#### `setLightDirection(x, y, z)`

Sets the main directional light direction.

```js
setLightDirection(1, 1, 0.5); // Light from upper-right
```

#### `enablePixelation(factor)`

Applies N64-style pixelation effect.

- `factor` (number): Pixelation intensity (1 = none, 2+ = pixelated)

```js
enablePixelation(2); // Double-pixel rendering
```

#### `enableDithering(enabled)`

Toggles color dithering for authentic retro look.

```js
enableDithering(true);
```

### Advanced Features

#### `raycastFromCamera(x, y)`

Cast a ray from camera through screen coordinates for object picking.

- Returns: `{ meshId, point, distance }` or `null`

```js
const hit = raycastFromCamera(mouseX, mouseY);
if (hit) {
  console.log(`Clicked object ${hit.meshId} at distance ${hit.distance}`);
}
```

#### `get3DStats()`

Returns rendering performance statistics.

```js
const stats = get3DStats();
console.log(`Triangles: ${stats.render.triangles}, Calls: ${stats.render.calls}`);
```

#### Direct Three.js Access

For advanced users who need full Three.js control:

```js
const scene = getScene();
const camera = getCamera();
const renderer = getRenderer();
const mesh = getMesh(meshId);
```

## N64-Style Best Practices

### Geometry

- Keep polygon counts low (< 1000 tri per object)
- Use `segments` parameter on spheres (6-12 recommended)
- Prefer simple, angular shapes over smooth curves

### Materials

- Use flat, saturated colors
- Avoid complex textures
- Embrace vertex lighting over per-pixel

### Performance

- Batch similar objects when possible
- Use fog to hide distant detail
- Keep scene complexity moderate (< 50 active objects)

### Aesthetic

- Use pixelation factor 1.5-2.0 for authentic feel
- Enable dithering for color banding
- Limit color palette for true retro look

## Example Cart Structure

```js
let objects = [];
let time = 0;

export async function init() {
  // Setup scene
  setCameraPosition(0, 5, 10);
  setFog(0x001122, 10, 30);
  enablePixelation(1.5);

  // Create objects
  objects.push(createCube(1, 0xff0000, [0, 0, 0]));

  // Load models if needed
  const model = await loadModel('/assets/ship.glb');
  objects.push(model);
}

export function update(dt) {
  time += dt;

  // Animate objects
  objects.forEach((obj, i) => {
    rotateMesh(obj, 0, dt, 0);
  });

  // Move camera
  const camX = Math.cos(time * 0.5) * 10;
  const camZ = Math.sin(time * 0.5) * 10;
  setCameraPosition(camX, 5, camZ);
  setCameraTarget(0, 0, 0);
}

export function draw() {
  cls(); // Clear 2D overlay
  // 3D renders automatically

  // Add 2D HUD elements
  print('3D Scene Active', 8, 8, rgba8(255, 255, 255, 255));
  print(`Objects: ${objects.length}`, 8, 24, rgba8(200, 200, 200, 255));
}
```

## Migration from 2D

Existing 2D carts continue to work unchanged. To add 3D elements:

1. Initialize 3D scene in `init()`
2. Create/animate 3D objects in `update()`
3. Use `draw()` for 2D overlay elements
4. 3D rendering happens automatically between `update()` and `draw()`

The 2D framebuffer becomes a transparent overlay rendered on top of the 3D scene, perfect for HUD elements, text, and UI.
