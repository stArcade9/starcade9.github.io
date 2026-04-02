# Nova64 Effects Quick Reference

## 🚀 Quick Start

### Enable Bloom (Glow Effects)

```javascript
enableBloom(); // Use defaults
enableBloom(1.5, 0.5, 0.85); // Custom: strength, radius, threshold
```

### Enable Anti-Aliasing

```javascript
enableFXAA(); // Smooth edges
```

---

## 🎨 Custom Shaders

### Holographic

```javascript
const holo = createShaderMaterial('holographic', {
  color: new THREE.Color(0x00ffff), // Cyan
  scanlineSpeed: 3.0,
  glitchAmount: 0.15,
  opacity: 0.7,
});
const cube = createCube(2, 0xffffff, [0, 0, -5]);
getMesh(cube).material = holo.material;
```

### Energy Shield

```javascript
const shield = createShaderMaterial('shield', {
  color: new THREE.Color(0x0088ff), // Blue
  opacity: 0.5,
});
const sphere = createSphere(3, 0xffffff, [0, 0, 0], 32);
getMesh(sphere).material = shield.material;

// Trigger hit effect
updateShaderUniform(shield.id, 'hitPosition', new THREE.Vector3(x, y, z));
updateShaderUniform(shield.id, 'hitStrength', 1.0);
```

### Water

```javascript
const water = createShaderMaterial('water', {
  color: new THREE.Color(0x0088ff),
  waveSpeed: 1.0,
  waveHeight: 0.3,
  transparency: 0.8,
});
const plane = createPlane(50, 50, [0, -1, 0]);
getMesh(plane).material = water.material;
getMesh(plane).rotation.x = -Math.PI / 2; // Horizontal
```

### Fire/Plasma

```javascript
const fire = createShaderMaterial('fire', {
  color1: new THREE.Color(0xff4400), // Orange
  color2: new THREE.Color(0xffff00), // Yellow
  intensity: 1.5,
  speed: 2.0,
});
const plane = createPlane(2, 3, [0, 1.5, 0]);
getMesh(plane).material = fire.material;
```

---

## 💥 Particles

### Explosion

```javascript
const explosion = createParticleSystem(500, {
  color: 0xff4400, // Orange
  size: 0.3,
  speed: 10.0,
  lifetime: 1.5,
  spread: 0.1,
  gravity: -2.0,
});
explosion.position.set(x, y, z);

export function update(dt) {
  updateParticles(explosion, dt);
}
```

### Smoke

```javascript
const smoke = createParticleSystem(500, {
  color: 0x888888, // Gray
  size: 0.5,
  speed: 1.0,
  lifetime: 3.0,
  spread: 0.5,
  gravity: 1.0, // Rises
});
```

### Sparks

```javascript
const sparks = createParticleSystem(200, {
  color: 0xffff00, // Yellow
  size: 0.1,
  speed: 8.0,
  lifetime: 0.5,
  spread: 0.2,
  gravity: -5.0, // Falls fast
});
```

### Magic Effect

```javascript
const magic = createParticleSystem(300, {
  color: 0xff00ff, // Purple
  size: 0.15,
  speed: 2.0,
  lifetime: 2.5,
  spread: 1.0,
  gravity: 0.5, // Slow rise
});
```

---

## 🎮 Complete Game Template

```javascript
let playerShield, engineTrail, shieldId;

export async function init() {
  // Enable effects
  enableBloom(1.5, 0.5, 0.8);
  enableFXAA();

  // Create shield
  const shield = createShaderMaterial('shield', {
    color: new THREE.Color(0x00ffff),
    opacity: 0.3,
  });
  playerShield = createSphere(2, 0xffffff, [0, 0, 0], 32);
  getMesh(playerShield).material = shield.material;
  shieldId = shield.id;

  // Engine particles
  engineTrail = createParticleSystem(500, {
    color: 0x0088ff,
    size: 0.1,
    speed: 3.0,
    lifetime: 1.0,
    spread: 0.3,
    gravity: 0,
  });
}

export function update(dt) {
  // Update particles
  updateParticles(engineTrail, dt);

  // Follow player
  engineTrail.position.set(player.x, player.y, player.z + 2);

  // Dynamic bloom
  setBloomStrength(1.0 + player.speed * 0.5);
}

function onHit(position) {
  updateShaderUniform(shieldId, 'hitPosition', position);
  updateShaderUniform(shieldId, 'hitStrength', 1.0);

  setTimeout(() => {
    updateShaderUniform(shieldId, 'hitStrength', 0.0);
  }, 300);
}

function createExplosion(pos) {
  const exp = createParticleSystem(300, {
    color: 0xff4400,
    size: 0.3,
    speed: 10.0,
    lifetime: 1.5,
    gravity: 0,
  });
  exp.position.copy(pos);
}
```

---

## ⚡ Performance Tips

### Bloom

```javascript
// Good - only bright objects glow
setBloomThreshold(0.85);

// Bad - performance hit
setBloomThreshold(0.0);
```

### Particles

```javascript
// Mobile: 500 max
const particles = createParticleSystem(500, {...});

// Desktop: 2000 max
const particles = createParticleSystem(2000, {...});
```

### Shaders

```javascript
// Reuse materials!
const holoPink = createShaderMaterial('holographic', {
  color: new THREE.Color(0xff00ff),
});

// Use on multiple objects
getMesh(cube1).material = holoPink.material;
getMesh(cube2).material = holoPink.material;
```

---

## 🐛 Common Issues

### No Bloom Visible

```javascript
// Make objects emissive
const material = createN64Material({
  color: 0xff0000,
  emissive: 0xff0000,
  emissiveIntensity: 1.0,
});
```

### Particles Not Moving

```javascript
// Must call every frame!
export function update(dt) {
  updateParticles(myParticles, dt);
}
```

### Shader Too Dark

```javascript
// Increase opacity
const shader = createShaderMaterial('holographic', {
  opacity: 1.0, // Full opacity
});
```

---

## 📊 Effect Costs

| Effect           | FPS Cost | Best For           |
| ---------------- | -------- | ------------------ |
| Bloom            | ~5-10%   | Glow, neon, energy |
| FXAA             | ~2%      | Always recommended |
| Holographic      | ~2%      | UI, holograms      |
| Shield           | ~2%      | Force fields       |
| Water            | ~5%      | Oceans, liquids    |
| Fire             | ~8%      | Fire, explosions   |
| Particles (500)  | ~2%      | Effects            |
| Particles (2000) | ~10%     | Heavy effects      |

---

## 🎯 Use Cases

### Sci-Fi

```javascript
enableBloom(2.0, 0.8, 0.6);  // Bright neon glow
enableGlitch(0.3);            // Digital distortion
const holo = createShaderMaterial('holographic', {...});
const shield = createShaderMaterial('shield', {...});
```

### Fantasy

```javascript
enableBloom(1.2, 0.5, 0.9);  // Subtle magic glow
const water = createShaderMaterial('water', {...});
const magic = createParticleSystem(300, {...});
```

### Damage Feedback

```javascript
// Glitch + shake + chromatic aberration on hit
enableGlitch(0.5);
enableChromaticAberration(0.008);
// Fade out over time in update()
setGlitchIntensity(glitchTimer * 2.0);
// When timer expires
disableGlitch();
```

### Modern

```javascript
enableFXAA(); // Clean visuals
const rain = createParticleSystem(2000, {
  gravity: -8.0, // Falling rain
});
```

---

For complete docs, see **EFFECTS_API_GUIDE.md**
