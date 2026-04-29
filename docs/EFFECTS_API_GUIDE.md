# Nova64 Effects, Shaders & Post-Processing API

## Overview

Nova64 now includes a comprehensive effects system with custom shaders, post-processing, and particle effects for creating stunning visual experiences.

## Features

✅ **Post-Processing Effects**: Bloom, FXAA anti-aliasing  
✅ **Custom Shaders**: Holographic, energy shield, water, fire/plasma  
✅ **Particle Systems**: GPU-accelerated particle effects  
✅ **Real-time Updates**: Animated shaders with time-based effects  
✅ **Easy Integration**: Simple API for adding effects to any game

---

## Post-Processing Effects

### Bloom Effect

Creates a glow around bright objects for a cinematic look.

```javascript
// Enable bloom with default settings
enableBloom();

// Enable with custom settings
enableBloom(
  1.5, // strength (0-3, default: 1.0)
  0.5, // radius (0-1, default: 0.5)
  0.85 // threshold (0-1, default: 0.85)
);

// Adjust bloom at runtime
setBloomStrength(2.0); // Increase intensity
setBloomRadius(0.8); // Wider glow
setBloomThreshold(0.5); // Glow on darker objects

// Disable bloom
disableBloom();
```

**Best For**: Sci-fi environments, neon cities, energy effects, explosions

### FXAA Anti-Aliasing

Smooths jagged edges for cleaner visuals.

```javascript
// Enable FXAA
enableFXAA();

// Disable FXAA
disableFXAA();
```

**Best For**: All games - improves visual quality with minimal performance cost

---

## Custom Shaders

### Holographic Shader

Creates a futuristic holographic effect with scanlines and glitches.

```javascript
export async function init() {
  // Create holographic material
  const holo = createShaderMaterial('holographic', {
    color: new THREE.Color(0x00ffff), // Cyan hologram
    scanlineSpeed: 3.0, // Fast scanlines
    glitchAmount: 0.15, // Subtle glitch
    opacity: 0.7, // Semi-transparent
  });

  // Create a holographic cube
  const cube = createCube(2, 0xffffff, [0, 0, -5]);
  const mesh = getMesh(cube);
  mesh.material = holo.material;
}

// Update at runtime
export function update(dt) {
  updateShaderUniform(holo.id, 'color', new THREE.Color(0xff00ff)); // Change color
  updateShaderUniform(holo.id, 'scanlineSpeed', 5.0); // Faster effect
}
```

**Parameters**:

- `color`: Hologram color (THREE.Color)
- `scanlineSpeed`: Speed of scanline animation (0-10)
- `glitchAmount`: Intensity of glitch effect (0-1)
- `opacity`: Transparency (0-1)

**Best For**: Holograms, UI elements, data displays, sci-fi terminals

### Energy Shield Shader

Creates a force field effect with hexagon pattern and hit ripples.

```javascript
export async function init() {
  // Create shield material
  const shield = createShaderMaterial('shield', {
    color: new THREE.Color(0x0088ff), // Blue shield
    opacity: 0.5, // Transparent
    hitPosition: new THREE.Vector3(0, 0, 0),
    hitStrength: 0, // No hit initially
  });

  // Create spherical shield around player
  const shieldMesh = createSphere(3, 0xffffff, [0, 0, 0], 32);
  const mesh = getMesh(shieldMesh);
  mesh.material = shield.material;
}

// Trigger hit effect
function onShieldHit(position) {
  updateShaderUniform(shield.id, 'hitPosition', position);
  updateShaderUniform(shield.id, 'hitStrength', 1.0);

  // Fade out hit effect
  setTimeout(() => {
    updateShaderUniform(shield.id, 'hitStrength', 0.0);
  }, 500);
}
```

**Parameters**:

- `color`: Shield color (THREE.Color)
- `opacity`: Base transparency (0-1)
- `hitPosition`: World position of impact (THREE.Vector3)
- `hitStrength`: Impact intensity (0-1)

**Best For**: Force fields, protective barriers, energy shields, bubble effects

### Water Shader

Animated water surface with waves and caustics.

```javascript
export async function init() {
  // Create water material
  const water = createShaderMaterial('water', {
    color: new THREE.Color(0x0088ff), // Ocean blue
    waveSpeed: 1.0, // Wave animation speed
    waveHeight: 0.3, // Wave amplitude
    transparency: 0.8, // See-through water
  });

  // Create water plane
  const waterPlane = createPlane(50, 50, [0, -1, 0]);
  const mesh = getMesh(waterPlane);
  mesh.material = water.material;
  mesh.rotation.x = -Math.PI / 2; // Horizontal
}
```

**Parameters**:

- `color`: Water color (THREE.Color)
- `waveSpeed`: Animation speed (0-5)
- `waveHeight`: Wave amplitude (0-2)
- `transparency`: Opacity (0-1)

**Best For**: Oceans, lakes, rivers, liquid surfaces, underwater scenes

### Fire/Plasma Shader

Animated fire effect with noise-based flames.

```javascript
export async function init() {
  // Create fire material
  const fire = createShaderMaterial('fire', {
    color1: new THREE.Color(0xff4400), // Orange base
    color2: new THREE.Color(0xffff00), // Yellow tips
    intensity: 1.5, // Brightness
    speed: 2.0, // Animation speed
  });

  // Create fire plane
  const firePlane = createPlane(2, 3, [0, 1.5, 0]);
  const mesh = getMesh(firePlane);
  mesh.material = fire.material;
}
```

**Parameters**:

- `color1`: Base fire color (THREE.Color)
- `color2`: Flame tip color (THREE.Color)
- `intensity`: Brightness (0-3)
- `speed`: Animation speed (0-5)

**Best For**: Fire, explosions, energy beams, plasma effects, lava

---

## Particle Systems

Create GPU-accelerated particle effects for explosions, smoke, sparks, etc.

### Basic Particle System

```javascript
let explosionParticles;

export async function init() {
  // Create explosion particle system
  explosionParticles = createParticleSystem(1000, {
    color: 0xff8800, // Orange
    size: 0.2, // Particle size
    speed: 5.0, // Initial velocity
    lifetime: 2.0, // Seconds before respawn
    spread: 1.0, // Spawn area radius
    gravity: -2.0, // Downward acceleration
  });

  explosionParticles.position.set(0, 0, -5);
}

export function update(dt) {
  // Update particle physics
  updateParticles(explosionParticles, dt);
}
```

### Advanced Examples

**Smoke Effect**:

```javascript
const smoke = createParticleSystem(500, {
  color: 0x888888, // Gray smoke
  size: 0.5,
  speed: 1.0,
  lifetime: 3.0,
  spread: 0.5,
  gravity: 1.0, // Rises up
});
```

**Sparks**:

```javascript
const sparks = createParticleSystem(200, {
  color: 0xffff00, // Yellow sparks
  size: 0.1,
  speed: 8.0,
  lifetime: 0.5, // Short-lived
  spread: 0.2,
  gravity: -5.0, // Falls quickly
});
```

**Magic Spell**:

```javascript
const magic = createParticleSystem(300, {
  color: 0xff00ff, // Purple magic
  size: 0.15,
  speed: 2.0,
  lifetime: 2.5,
  spread: 1.0,
  gravity: 0.5, // Slow rise
});
```

---

## Complete Game Examples

### Sci-Fi Space Shooter

```javascript
let shieldEffect, engineParticles, explosionEffect;
let bloomEnabled = false;

export async function init() {
  // Enable bloom for glowing effects
  enableBloom(1.5, 0.5, 0.8);
  bloomEnabled = true;

  // Enable anti-aliasing
  enableFXAA();

  // Create player shield
  const shield = createShaderMaterial('shield', {
    color: new THREE.Color(0x00ffff),
    opacity: 0.3,
  });

  const playerShield = createSphere(2, 0xffffff, [0, 0, 0], 32);
  const shieldMesh = getMesh(playerShield);
  shieldMesh.material = shield.material;
  shieldEffect = shield.id;

  // Engine trail particles
  engineParticles = createParticleSystem(500, {
    color: 0x0088ff,
    size: 0.1,
    speed: 3.0,
    lifetime: 1.0,
    spread: 0.3,
    gravity: 0,
  });
  engineParticles.position.set(0, 0, 2); // Behind player
}

export function update(dt) {
  // Update particle effects
  updateParticles(engineParticles, dt);

  // Follow player position
  engineParticles.position.copy(player.position);
  engineParticles.position.z += 2;

  // Pulse bloom intensity based on speed
  const bloomIntensity = 1.0 + player.speed * 0.5;
  setBloomStrength(bloomIntensity);
}

function onPlayerHit(hitPosition) {
  // Flash shield on hit
  updateShaderUniform(shieldEffect, 'hitPosition', hitPosition);
  updateShaderUniform(shieldEffect, 'hitStrength', 1.0);

  setTimeout(() => {
    updateShaderUniform(shieldEffect, 'hitStrength', 0.0);
  }, 300);
}

function createExplosion(position) {
  const explosion = createParticleSystem(300, {
    color: 0xff4400,
    size: 0.3,
    speed: 10.0,
    lifetime: 1.5,
    spread: 0.1,
    gravity: 0,
  });
  explosion.position.copy(position);

  // Remove after lifetime
  setTimeout(() => {
    scene.remove(explosion);
  }, 1500);
}
```

### Cyberpunk City

```javascript
let hologramBillboards = [];
let neonGlow;

export async function init() {
  // Enable bloom for neon glow
  enableBloom(2.0, 0.8, 0.6);
  enableFXAA();

  // Create holographic billboards
  for (let i = 0; i < 10; i++) {
    const holo = createShaderMaterial('holographic', {
      color: new THREE.Color(Math.random() * 0xffffff),
      scanlineSpeed: 2.0 + Math.random() * 3.0,
      glitchAmount: 0.1,
      opacity: 0.8,
    });

    const billboard = createPlane(4, 3, [
      (Math.random() - 0.5) * 50,
      10 + Math.random() * 20,
      (Math.random() - 0.5) * 50,
    ]);

    const mesh = getMesh(billboard);
    mesh.material = holo.material;

    hologramBillboards.push(holo.id);
  }

  // Add atmospheric particles (rain/dust)
  const atmosphere = createParticleSystem(2000, {
    color: 0x4488ff,
    size: 0.05,
    speed: 5.0,
    lifetime: 3.0,
    spread: 30.0,
    gravity: -8.0, // Falling rain
  });
  atmosphere.position.set(0, 50, 0);
}

export function update(dt) {
  // Random glitch effects on holograms
  hologramBillboards.forEach(holoId => {
    if (Math.random() < 0.01) {
      // 1% chance per frame
      updateShaderUniform(holoId, 'glitchAmount', 0.5);
      setTimeout(() => {
        updateShaderUniform(holoId, 'glitchAmount', 0.1);
      }, 100);
    }
  });
}
```

### Fantasy Water World

```javascript
let oceanSurface, bubbleParticles;

export async function init() {
  enableFXAA();

  // Create animated ocean
  const ocean = createShaderMaterial('water', {
    color: new THREE.Color(0x0066cc),
    waveSpeed: 0.5,
    waveHeight: 0.5,
    transparency: 0.7,
  });

  const waterPlane = createPlane(100, 100, [0, 0, 0]);
  const mesh = getMesh(waterPlane);
  mesh.material = ocean.material;
  mesh.rotation.x = -Math.PI / 2;
  oceanSurface = ocean.id;

  // Underwater bubbles
  bubbleParticles = createParticleSystem(500, {
    color: 0xaaddff,
    size: 0.2,
    speed: 2.0,
    lifetime: 4.0,
    spread: 20.0,
    gravity: 2.0, // Bubbles rise
  });
  bubbleParticles.position.set(0, -5, 0);
}

export function update(dt) {
  updateParticles(bubbleParticles, dt);

  // Vary wave intensity based on game events
  const waveIntensity = 0.3 + Math.sin(Date.now() * 0.001) * 0.2;
  updateShaderUniform(oceanSurface, 'waveHeight', waveIntensity);
}
```

---

## Performance Tips

### 1. **Use Bloom Wisely**

```javascript
// Good - bloom on bright emissive objects
setBloomThreshold(0.85); // Only very bright objects glow

// Bad - everything glows (performance hit)
setBloomThreshold(0.0);
```

### 2. **Limit Particle Count**

```javascript
// Mobile/Low-end: 500 particles max
const particles = createParticleSystem(500, {...});

// Desktop/High-end: 2000 particles
const particles = createParticleSystem(2000, {...});
```

### 3. **Reuse Particle Systems**

```javascript
// Good - one system for all explosions
const explosionPool = createParticleSystem(1000, {...});

// Bad - new system for each explosion (memory leak!)
function explode() {
  createParticleSystem(500, {...}); // Don't do this repeatedly!
}
```

### 4. **Shader Complexity**

- Holographic: Low cost
- Shield/Water: Medium cost
- Fire: Higher cost (noise calculations)

---

## Troubleshooting

### Effects Not Visible

**Problem**: Called `enableBloom()` but no effect visible

**Solution**: Check bloom threshold and material emissive

```javascript
enableBloom(1.5, 0.5, 0.5); // Lower threshold

// Make materials emissive for bloom
const material = createN64Material({
  color: 0xff0000,
  emissive: 0xff0000,
  emissiveIntensity: 1.0,
});
```

### Particles Not Moving

**Problem**: Particles created but stationary

**Solution**: Call `updateParticles()` every frame

```javascript
export function update(dt) {
  updateParticles(myParticles, dt); // Must call this!
}
```

### Shader Appears Black

**Problem**: Custom shader shows as black

**Solution**: Check lighting and transparency

```javascript
const shader = createShaderMaterial('holographic', {
  color: new THREE.Color(0xff0000), // Ensure color is set
  opacity: 1.0, // Not fully transparent
});
```

---

## API Reference

### Post-Processing

- `enableBloom(strength, radius, threshold)` - Enable bloom glow
- `disableBloom()` - Disable bloom
- `setBloomStrength(value)` - Adjust bloom intensity (0-3)
- `setBloomRadius(value)` - Adjust bloom spread (0-1)
- `setBloomThreshold(value)` - Minimum brightness for bloom (0-1)
- `enableFXAA()` - Enable anti-aliasing
- `disableFXAA()` - Disable anti-aliasing

### Custom Shaders

- `createShaderMaterial(name, uniforms)` - Create shader material
  - Shaders: `'holographic'`, `'shield'`, `'water'`, `'fire'`
- `updateShaderUniform(shaderId, name, value)` - Update shader parameter

### Particles

- `createParticleSystem(count, options)` - Create particle effect
- `updateParticles(system, deltaTime)` - Update particle physics

---

## Conclusion

The Nova64 effects system brings professional-quality visuals to your games with minimal code. Combine bloom, custom shaders, and particles to create stunning sci-fi, fantasy, or modern environments.

For more examples, check out the updated game demos in `/examples/`.

Happy creating! ✨
