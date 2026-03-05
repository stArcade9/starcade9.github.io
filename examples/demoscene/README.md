# 🎬 NOVA64 DEMOSCENE - TRON ODYSSEY

An epic visual journey through a neon digital realm, showcasing the full capabilities of the Nova64 engine.

## ✨ Features

### Visual Effects
- **💫 Advanced Bloom**: Intense neon glow with dynamic strength adjustment
- **🎨 Post-Processing**: FXAA anti-aliasing and shader effects
- **✨ GPU Particles**: Hundreds of animated particles with physics
- **🌫️ Atmospheric Fog**: Dynamic fog for depth and atmosphere
- **🎪 Procedural Geometry**: Real-time generated neon structures

### Scenes

The demo features 5 unique scenes, each showcasing different aspects of the engine:

#### 1. GRID AWAKENING (8s)
- Pulsing neon grid floor
- Floating crystalline structures
- Expanding energy rings
- Camera rises dramatically

#### 2. DATA TUNNEL (10s)
- High-speed tunnel fly-through
- Streaming data particles
- Dynamic geometry generation
- Camera barrel roll effect

#### 3. DIGITAL CITY (12s)
- 40+ procedural neon towers
- Flying light cycles with trails
- Pulsating building effects
- Orbiting camera movement

#### 4. ENERGY CORE (10s)
- Swirling energy fields
- Intense bloom increase
- Spiral camera movement
- Particle explosion buildup

#### 5. THE VOID (8s)
- Fade to darkness
- Final particle burst
- Dramatic camera pullback
- Demo loops back to start

## 🎮 Controls

- **Mouse**: Navigate UI buttons on start screen
- **Click "BEGIN ODYSSEY"**: Start the visual journey
- The demo plays automatically through all 5 scenes
- Seamless transitions between scenes
- Auto-loops after completion

## 🛠️ Technical Details

### Engine Features Showcased
- Three.js 3D rendering with WebGL2
- UnrealBloomPass for neon glow
- FXAAShader for anti-aliasing
- Dynamic mesh creation/destruction
- Real-time particle physics
- Cinematic camera choreography
- Procedural geometry generation

### Performance
- Optimized for 60 FPS
- Automatic LOD and culling
- Efficient particle management
- Smart object pooling
- Progressive scene loading

### Code Structure
```javascript
// 5 distinct scene update functions
updateGridAwakening()    // Scene 0
updateDataTunnel()       // Scene 1
updateDigitalCity()      // Scene 2
updateEnergyCore()       // Scene 3
updateTheVoid()          // Scene 4

// Automated scene transitions
// Dynamic camera choreography
// Real-time effects management
```

## 🎨 Visual Style

The demo embraces a **Tron-like cyberpunk aesthetic**:
- Neon cyan, magenta, and yellow colors
- Dark space with glowing geometry
- Grid-based architecture
- Energy trails and particle effects
- Smooth, cinematic camera movements

## 🚀 How It Works

### Start Screen
1. Animated 3D scene in background
2. Pulsing title with color shift
3. Two interactive buttons
4. Slow camera orbit

### Demo Mode
1. Each scene has a defined duration
2. Progress bar shows scene completion
3. Automatic transitions with fade effects
4. Scene-specific camera paths
5. Dynamic effects adjust per scene

### Scene Transitions
- 2-second smooth transitions
- Fade to black with scene name display
- Cleanup of previous scene objects
- Setup of new scene geometry
- Seamless camera continuity

## 📊 Stats Display

The HUD shows:
- Current scene name and number
- Progress bar with percentage
- Active effects list
- Scene description text
- Nova64 branding

## 🎬 Making Your Own Demoscene

This code demonstrates best practices for:
1. **Scene Management**: Multiple scenes with state machine
2. **Camera Choreography**: Scripted camera movements
3. **Effect Control**: Dynamic bloom and fog adjustments
4. **Particle Systems**: Creation, update, and cleanup
5. **Procedural Generation**: Real-time geometry creation
6. **Transition Effects**: Smooth scene changes

### Key Patterns

```javascript
// Scene state machine
const SCENES = [
  { name: 'SCENE NAME', duration: 8, color: 0x00ffff },
  // ...
];

// Scene-specific update
function updateScene(dt, progress) {
  // progress = 0.0 to 1.0 over scene duration
  // Use progress for camera paths and animations
}

// Automatic transitions
if (sceneTime >= SCENES[currentScene].duration) {
  startSceneTransition();
}
```

## 🌟 Credits

- **Engine**: Nova64 Fantasy Console
- **3D**: Three.js
- **Effects**: UnrealBloomPass, FXAAShader
- **Style**: Tron, Cyberpunk, Demoscene culture

## 📝 Notes

- Demo is fully automatic - no user input required during playback
- Loops infinitely for continuous display
- Optimized for both desktop and capable mobile devices
- All geometry generated procedurally at runtime
- No external 3D models or textures required

---

**Nova64: The Ultimate Fantasy Console** 🎮✨  
*Now with demoscene-quality visual effects!*
