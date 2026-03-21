# Free GLB Assets for Nova64

This document lists **MIT, CC0, and Creative Commons** licensed GLB/glTF models that can be freely used in Nova64 projects.

## 🎯 Official glTF Sample Models (Khronos Group)

**Repository**: https://github.com/KhronosGroup/glTF-Sample-Models

**License**: Various (CC0, CC-BY 4.0, MIT equivalent)

### Recommended Models for Games:

#### Characters & Creatures

- **Fox** - CC0 & CC-BY 4.0 - Animated low-poly fox
  - `2.0/Fox/glTF-Binary/Fox.glb`
  - Perfect for platformers, includes walk/run animations
- **Cesium Man** - CC-BY 4.0 - Animated character
  - `2.0/CesiumMan/glTF-Binary/CesiumMan.glb`
  - Good for testing character animations
- **Rigged Simple** - CC-BY 4.0 - Basic rigged character
  - `2.0/RiggedSimple/glTF-Binary/RiggedSimple.glb`
  - Great for learning skinning/animation

#### Vehicles

- **Cesium Milk Truck** - CC-BY 4.0
  - `2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb`
  - Retro style truck with texture

#### Objects & Props

- **Avocado** - CC-BY 4.0
  - `2.0/Avocado/glTF-Binary/Avocado.glb`
  - Food prop with PBR textures
- **Water Bottle** - CC0 (Public Domain)
  - `2.0/WaterBottle/glTF-Binary/WaterBottle.glb`
  - Photorealistic bottle
- **Flight Helmet** - CC0 (Public Domain)
  - `2.0/FlightHelmet/glTF-Binary/FlightHelmet.glb`
  - High quality prop

- **Duck** - Public Domain
  - `2.0/Duck/glTF-Binary/Duck.glb`
  - Classic COLLADA duck model

#### Environment

- **Sponza** - CC-BY 4.0
  - `2.0/Sponza/glTF-Binary/Sponza.glb`
  - Building interior for testing lighting

- **A Beautiful Game** - CC-BY 4.0
  - `2.0/ABeautifulGame/glTF-Binary/ABeautifulGame.glb`
  - Chess set with PBR materials

#### Basic Shapes (CC-BY 4.0 / CC0)

- **Box** - `2.0/Box/glTF-Binary/Box.glb`
- **Box Textured** - `2.0/BoxTextured/glTF-Binary/BoxTextured.glb`
- **Cube** - `2.0/Cube/glTF-Binary/Cube.glb`
- **Suzanne** (Blender Monkey) - `2.0/Suzanne/glTF-Binary/Suzanne.glb`

### How to Download:

```bash
# Clone the entire repository
git clone https://github.com/KhronosGroup/glTF-Sample-Models.git

# Or download individual models via raw GitHub URLs:
# https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb
```

---

## 🎨 Kenney Assets (CC0 - Public Domain)

**Website**: https://kenney.nl/assets

**License**: CC0 1.0 Universal (Public Domain)

Kenney offers **hundreds of themed game assets**, all free with CC0 license:

### Asset Packs (with glTF/GLB support):

- **Pirate Kit** (30+ models) - Ships, cannons, treasure
- **Racing Kit** - Cars, tracks, obstacles
- **Space Kit** - Spaceships, asteroids, planets
- **Castle Kit** - Medieval buildings, props
- **Nature Kit** - Trees, rocks, plants
- **City Kit** - Buildings, vehicles, street furniture
- **Platformer Kit** - Platforms, enemies, collectibles
- **Furniture Pack** - Interior props
- **Food Pack** - Various food items

**Download**: Browse https://kenney.nl/assets?q=3d and filter by 3D models

---

## 🌟 Poly Haven (CC0)

**Website**: https://polyhaven.com/models

**License**: CC0 (Public Domain)

High-quality photorealistic 3D models, all CC0:

### Categories:

- **Furniture** - Chairs, tables, lamps
- **Plants** - Trees, bushes, flowers
- **Rocks & Nature** - Photoscanned rocks, terrain
- **Props** - Various objects
- **Food** - Realistic food items

**Format**: Models available in multiple formats including glTF/GLB

---

## 🎮 Quaternius (CC0)

**Website**: https://quaternius.com/

**License**: CC0 (Public Domain)

**Massive collection** of low-poly game-ready assets:

### Popular Packs:

- **Ultimate Animated Animals** - 100+ animated creatures
- **Ultimate Platformer Pack** - Platforms, enemies, collectibles
- **Ultimate Space Pack** - Spaceships, aliens, stations
- **Ultimate Fantasy Pack** - Dragons, knights, castles
- **Ultimate Stylized Nature** - Trees, rocks, plants
- **Ultimate Retro Pack** - Low-poly retro style assets

**Download**: Available on https://quaternius.com/ and https://opengameart.org/

---

## 🎪 Poly Pizza (CC0)

**Website**: https://poly.pizza/

**License**: CC0 (Public Domain)

Archive of Google Poly models (before it shut down):

- Thousands of low-poly models
- Perfect for retro/stylized games
- Easy search and download
- All CC0 license

---

## 📦 Sketchfab

**Website**: https://sketchfab.com/

**License**: Various (filter by Creative Commons)

### How to Find Free Models:

1. Go to https://sketchfab.com/
2. Search for models
3. Filter by:
   - "Downloadable" ✓
   - License: "Creative Commons" (CC-BY, CC0)
4. Download in glTF/GLB format

**Note**: Always check individual licenses - many are CC-BY 4.0 (requires attribution)

---

## 🎨 OpenGameArt.org

**Website**: https://opengameart.org/

**License**: Various (CC0, CC-BY, GPL, OGA-BY)

Community-contributed game assets:

### Search Tips:

- Filter by "3D Art"
- Check "glTF" or "GLB" in search
- Verify license before use
- Many CC0 and CC-BY assets available

---

## 🏛️ Smithsonian Open Access

**Website**: https://3d.si.edu/

**License**: CC0 (Public Domain)

Historical artifacts and specimens:

- Museum quality 3D scans
- Perfect for educational content
- Dinosaurs, artifacts, sculptures
- All free to use (CC0)

---

## 📋 Quick Reference: License Comparison

| License       | Commercial Use | Attribution Required | Modifications OK |
| ------------- | -------------- | -------------------- | ---------------- |
| **CC0**       | ✅ Yes         | ❌ No                | ✅ Yes           |
| **CC-BY 4.0** | ✅ Yes         | ✅ **Yes**           | ✅ Yes           |
| **MIT**       | ✅ Yes         | ✅ **Yes** (in code) | ✅ Yes           |

---

## 🔧 How to Use GLB Files in Nova64

1. **Download** GLB files to your project:

   ```bash
   mkdir -p /path/to/nova64/models
   cd /path/to/nova64/models
   # Download your GLB files here
   ```

2. **Load in Nova64 code**:

   ```javascript
   export async function init() {
     // Load GLB model
     const fox = await loadModel('/models/Fox.glb', [0, 0, 0], 1.0);

     // Or with options
     const player = await loadModel(
       '/models/character.glb',
       [0, 2, 0], // position
       2.0 // scale
     );
   }
   ```

3. **Animate GLB models** (if they have animations):
   ```javascript
   export function update(dt) {
     // Play animation
     playAnimation(modelMesh, 'Walk', dt);
   }
   ```

---

## 📥 Recommended Downloads for Nova64

### For Platformers:

- Fox (animated character) - CC-BY 4.0
- Kenney Platformer Kit - CC0
- Quaternius Ultimate Platformer Pack - CC0

### For Racing Games:

- Kenney Racing Kit - CC0
- Kenney Car Kit - CC0

### For Space Games:

- Kenney Space Kit - CC0
- Quaternius Ultimate Space Pack - CC0

### For RPG/Adventure:

- Quaternius Ultimate Fantasy Pack - CC0
- Kenney Castle Kit - CC0

---

## 🎯 Direct Download Links

Create a models directory and download these starter models:

```bash
# Create models directory
mkdir -p models

# Download from Khronos glTF samples (use raw.githubusercontent.com)
# Example URLs:
# https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb
# https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb
# https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb
```

---

## ⚖️ License Compliance

### When using CC-BY 4.0 models:

Add attribution to your game credits or README:

```markdown
## Credits

3D Models:

- Fox by PixelMannen (CC0) and @tomkranis (CC-BY 4.0)
  https://sketchfab.com/models/371dea88d7e04a76af5763f2a36866bc
- [Model Name] by [Author] (CC-BY 4.0)
  [Source URL]
```

### When using CC0 models:

No attribution required, but it's nice to credit creators!

---

## 🚀 Next Steps

1. Choose a model pack based on your game genre
2. Download GLB files to your `models/` directory
3. Load them in your Nova64 game using `loadModel()`
4. Add proper attribution for CC-BY licensed models
5. Have fun making games! 🎮

---

**Last Updated**: October 2025

**Note**: Always verify licenses before use. This list focuses on models that are free for commercial use.
