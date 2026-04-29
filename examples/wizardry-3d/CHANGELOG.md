# Wizardry Nova 64 — Changelog

First-person grid-based dungeon RPG inspired by _Wizardry: Proving Grounds of the Mad Overlord_, built entirely on the Nova64 3D Fantasy Console API.

**Current size:** ~3,489 lines | **Tests:** 45/45 passing

---

## Batch 19 — `d602a0b`

_+45/−10 lines_

| API              | Integration                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `novaStore`      | Tracks game phase in `switchState()` for cross-system awareness      |
| `enableBloom`    | Explicitly re-enables bloom when restoring default visual preset     |
| `btn`            | PICO-8 style directional buttons (2=Up, 3=Down) for explore movement |
| `btnp`           | PICO-8 button presses (4=Z, 5=X, 6=C) for combat action selection    |
| `rightStickY`    | Gamepad vertical stick for shop target member selection              |
| `pset`           | Pixel confetti sparkles on the victory screen celebration            |
| `isInvulnerable` | Shield indicator on party members during invulnerability frames      |
| `setCamera`      | 2D camera shake offset applied/reset in draw for full-screen shake   |
| `updateSpawner`  | Properly ticks encounter spawner each frame during explore state     |
| `getScene`       | Three.js scene object count in inventory debug stats                 |

---

## Batch 18 — `6dfc3db`

_+68/−21 lines_

| API                    | Integration                                             |
| ---------------------- | ------------------------------------------------------- |
| `createAdvancedCube`   | Boss marker pillar with full PBR (metalness, roughness) |
| `createAdvancedSphere` | Boss orb with emissive glow on boss tile markers        |
| `createLODMesh`        | Torch LOD variants (cone close, cube far) for perf      |
| `setLODPosition`       | LOD torch positioning during level build                |
| `removeLODMesh`        | LOD cleanup in `clearLevel()`                           |
| `updateLODs`           | Per-frame LOD distance evaluation in update loop        |
| `gamepadAxis`          | Shop item browsing via `leftY` gamepad axis             |
| `animateSkybox`        | Manual skybox rotation tick each frame                  |
| `colorMode`/`color`    | HSB hue-cycling glow ring on spell VFX starburst        |
| `createGameStore`      | Tracks kills, steps, chests opened, fountains used      |
| `getRenderer`          | Renderer program count in inventory debug stats         |

---

## Batch 17 — `4f3687b`

_+72/−11 lines_

| API                         | Integration                                              |
| --------------------------- | -------------------------------------------------------- |
| `leftStickX`/`leftStickY`   | Gamepad left stick for explore movement                  |
| `rightStickX`               | Gamepad right stick horizontal for turning               |
| `rightStickY`               | _(see batch 19 for additional use)_                      |
| `gamepadConnected`          | Gamepad indicator icon on explore HUD                    |
| `mouseDown`                 | Combined with `mousePressed` for raycast click condition |
| `raycastFromCamera`         | Click-to-inspect tiles in explore mode                   |
| `setCameraLookAt`           | View direction vector replacing `setCameraTarget`        |
| `resetMatrix`               | Clean matrix state before title screen spirals           |
| `setTextBaseline`           | Baseline alignment in shop gold display                  |
| `createButton`              | Game over screen "Try Again" button                      |
| `updateButton`/`drawButton` | Button tick and render in game over state                |

---

## Batch 16 — `ec1b49a`

_+50/−14 lines_

| API                             | Integration                                                 |
| ------------------------------- | ----------------------------------------------------------- |
| `pushMatrix`/`popMatrix`        | Matrix save/restore for rotated class icon emblems on title |
| `translate`                     | Position matrix for title party preview diamonds            |
| `rotate`                        | Animated rotation on class emblem diamonds                  |
| `scale2d`                       | Scaled 2D emblem rects on title screen                      |
| `TWO_PI`/`HALF_PI`/`QUARTER_PI` | Constants replacing `Math.PI` expressions throughout        |
| `enableDithering`               | New "dithered" visual preset mode in V-key cycle            |
| `mouseX`/`mouseY`               | Mouse position for combat enemy click targeting             |
| `mousePressed`                  | Mouse press detection for combat target selection           |
| `setTextAlign`                  | Right-aligned gold display in shop                          |
| `drawText`                      | Alternate text draw for shop gold display                   |
| `uiProgressBar`                 | XP progress bars in inventory panel                         |

---

## Batch 15 — `7938f6b`

_+124/−13 lines_

| API                    | Integration                                           |
| ---------------------- | ----------------------------------------------------- |
| `createInstancedMesh`  | Crystal decorations scattered on dungeon floors       |
| `setInstanceTransform` | Per-instance position/rotation/scale for crystals     |
| `setInstanceColor`     | Per-instance tinting matching floor theme             |
| `finalizeInstances`    | Finalize instanced mesh buffer after setup            |
| `removeInstancedMesh`  | Crystal cleanup in `clearLevel()`                     |
| `flowField`            | Boss room animated energy flow visualization          |
| `noiseMap`             | Procedural fog overlay on deep floors (floor 3+)      |
| `getParticleStats`     | Active/max particle count in debug stats              |
| `frameCount`           | Frame counter in debug info + title spiral phase      |
| `centerX`/`centerY`    | Centered inventory panel + restart button positioning |
| `grid`                 | Grid layout for spell list in combat                  |
| `setFont`/`getFont`    | Save/restore font around inventory rendering          |

---

## Batch 14 — `ebd1473`

_+53/−4 lines_

| API                        | Integration                                   |
| -------------------------- | --------------------------------------------- |
| `drawFloatingTexts3D`      | World-space damage numbers above monsters     |
| `worldToScreen` (helper)   | 3D→2D projection for floating texts           |
| `enableLowPolyMode`        | Low-poly visual preset in V-key cycle         |
| `createSolidSkybox`        | Dark merchant atmosphere in shop              |
| `disableSkyboxAutoAnimate` | Still skybox in shop                          |
| `clearSkybox`              | Skybox cleanup before rebuilding levels       |
| `isEffectsEnabled`         | Report post-FX status in minimal mode message |
| `noiseSeed`                | Consistent noise patterns seeded per floor    |
| `drawSkyGradient`          | Title screen gradient background              |

---

## Batch 13 — `0b64738`

_+57/−2 lines_

| API                        | Integration                                         |
| -------------------------- | --------------------------------------------------- |
| `createShaderMaterial`     | Animated water shader on fountain meshes            |
| `updateShaderUniform`      | Per-frame `time` uniform update for water animation |
| `lerpColor`                | Smooth color blending in spell VFX arcs             |
| `hsb`                      | HSB color for quadratic bezier buff arcs            |
| `quadCurve`                | Quadratic bezier energy arc for buff/heal spells    |
| `noiseDetail`              | Richer noise octaves on deeper floors               |
| `rad2deg`                  | Yaw display in compass panel                        |
| `disableBloom`             | Bloom disable in minimal visual preset              |
| `enableFXAA`/`disableFXAA` | FXAA toggle per visual preset mode                  |

---

## Batch 12 — `87bbb56`

_+43/−10 lines_

| API                    | Integration                                        |
| ---------------------- | -------------------------------------------------- |
| `arc`                  | Compass arc sweep around facing direction          |
| `randRange`/`randInt`  | Monster stat scaling + encounter generation        |
| `drawGlowTextCentered` | Centered glow titles (victory screen)              |
| `dist3d`               | Monster distance from player in combat info        |
| `n64Palette`           | Classic N64 color palette for boss/gold indicators |
| `createSpaceSkybox`    | Dragon's Lair (floor 5) space skybox with nebula   |
| `setSkyboxSpeed`       | Per-floor skybox rotation speed                    |
| `deg2rad`              | Compass arc angle conversion                       |
| `emitParticle`         | Ambient dust motes near player during exploration  |
| `get3DStats`           | Triangle/draw call/mesh count in debug panel       |

---

## Batch 11 — `4bfe5c5`

_+83/−12 lines_

| API                                                 | Integration                                       |
| --------------------------------------------------- | ------------------------------------------------- |
| `enableN64Mode`/`enablePSXMode`/`disablePresetMode` | Visual preset toggle (V key)                      |
| `noise`                                             | Perlin noise fog wisps during explore/combat      |
| `drawGradientRect`                                  | Selected item highlight in shop browser           |
| `bezier`                                            | Curved spell energy arc from caster to impact     |
| `createCapsule`                                     | Ghost/wraith monster shape                        |
| `setDirectionalLight`                               | Per-floor directional light angle for shadows     |
| `drawFlash`                                         | Screen flash overlay for damage/magic/discoveries |
| `clearFog`                                          | No fog in merchant shop area                      |
| `getRotation`                                       | Query spin state for trap rune direction reversal |
| `circleCollision`                                   | _(exposed, used in conjunction with aabb)_        |

---

## Batch 10 — `6453655`

_+103/−10 lines_

| API                                                     | Integration                                       |
| ------------------------------------------------------- | ------------------------------------------------- |
| `circle`                                                | Targeting circle around crosshair + victory burst |
| `ellipse`                                               | Aura behind title text + fog wisps                |
| `ease`                                                  | Smooth transitions (floor wipe, victory slide-in) |
| `poly`                                                  | Victory crown + game over skull polygon icons     |
| `setBloomStrength`/`setBloomRadius`/`setBloomThreshold` | Dynamic bloom per floor + combat                  |
| `setCastShadow`/`setReceiveShadow`                      | Floor shadow reception + ghost shadow disable     |
| `setPointLightPosition`                                 | Torch flame position sway                         |
| `updateParticles`                                       | Per-frame particle system tick                    |
| `dist`                                                  | Distance-based encounter scaling from start       |
| `remap`                                                 | Encounter chance remapping by distance            |

---

## Batch 9 — `8052eb5`

_+86/−47 lines_

| API                                                                                    | Integration                                   |
| -------------------------------------------------------------------------------------- | --------------------------------------------- |
| `createCooldownSet`/`updateCooldowns`/`cooldownReady`/`useCooldown`/`cooldownProgress` | Input + movement cooldown system              |
| `drawTextShadow`                                                                       | Combat log + floor messages with drop shadows |
| `smoothstep`                                                                           | Title screen fade-in interpolation            |
| `setCastShadow`                                                                        | Ghost enemies don't cast shadows              |
| `aabb`                                                                                 | Thief trap proximity warning collision check  |

---

## Batch 8 — `417f047`

_+42/−5 lines_

| API                                | Integration                                         |
| ---------------------------------- | --------------------------------------------------- |
| `enableRetroEffects`               | Init-time bloom + vignette + FXAA + dithering setup |
| `setBloomStrength`                 | Boss encounter bloom intensification                |
| `moveMesh`                         | Enemy lunge forward/back animation on attack        |
| `setMeshVisible`                   | Death blink-out animation on killed enemies         |
| `sfx` (custom)                     | Custom waveform SFX for heal, buff, spell, laser    |
| `enableVignette`/`disableVignette` | Fountain cleansing visual                           |

---

## Batch 7 — `301e737`

_+76/−17 lines_

| API                                                                     | Integration                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `createHitState`/`triggerHit`/`isVisible`/`isFlashing`/`updateHitState` | Party invulnerability frames on enemy hit                                   |
| `enableChromaticAberration`/`disableChromaticAberration`                | Boss hit distortion effect (timed)                                          |
| `setVolume`                                                             | Context-sensitive volume (combat louder, shop quieter)                      |
| `sfx` (presets)                                                         | Named presets: hit, explosion, death, coin, powerup, confirm, select, error |
| `drawPulsingText`                                                       | Animated title screen prompts                                               |

---

## Batch 6 — `f4808db`

_+67/−15 lines_

| API                       | Integration                                        |
| ------------------------- | -------------------------------------------------- |
| `createStateMachine`      | Game flow state tracking with elapsed time         |
| `createSpawner`           | Encounter spawner that scales enemy count per wave |
| `enableSkyboxAutoAnimate` | Atmospheric skybox rotation                        |
| `enablePixelation`        | Deeper floors get retro pixelation effect          |
| `createTimer`             | Floor message display timer                        |
| `burstParticles`          | Particle burst on boss entrance + chest open       |

---

## Batch 5 — `118370f`

_+87/−14 lines_

| API             | Integration                                        |
| --------------- | -------------------------------------------------- |
| `drawCrosshair` | Pulsing targeting reticle on selected enemy        |
| `drawWave`      | Animated energy wave on explore HUD + title screen |
| `drawTriangle`  | Directional compass arrow indicators               |
| `colorMix`      | Buff glow indicators on party HP bars              |
| `measureText`   | Dynamic gold text alignment in inventory           |
| `hexColor`      | Cleaner color definitions in game over + victory   |
| `createPool`    | Hit spark particle pool on attack impacts          |

---

## Pre-batch foundations (batches 1–4)

Commits `e28df4d` through `dc0cd95` established the core game:

- **Dungeon generation** — Room carving, corridor connection, door/chest/fountain/trap/boss placement
- **Party system** — 4-class RPG party (Fighter, Mage, Priest, Thief) with leveling + equipment
- **Turn-based combat** — Attack/magic/defend with auto-combat option
- **3D rendering** — First-person grid movement, monster meshes, torch lights, particle effects
- **Spell system** — Fireball, Ice Bolt, Heal, Bless, Turn Undead, Revive, Mana Shield
- **Shop system** — Floor-transition merchant with potions and buffs
- **Save/load** — localStorage persistence for full game state
- **Minimap** — Fog-of-war tile minimap with player blink + tile colors
- **Floating damage** — 2D floating text system for combat feedback

---

## Nova64 API Coverage Summary

The wizardry-3d demo uses **170+ distinct Nova64 API calls** across all runtime modules:

### 3D Graphics

`createCube`, `createSphere`, `createCone`, `createCylinder`, `createPlane`, `createTorus`, `createCapsule`, `createAdvancedCube`, `createAdvancedSphere`, `setPosition`, `getPosition`, `setScale`, `setRotation`, `getRotation`, `rotateMesh`, `moveMesh`, `setFlatShading`, `setMeshOpacity`, `setMeshVisible`, `setCastShadow`, `setReceiveShadow`, `setPBRProperties`, `destroyMesh`, `getMesh`, `getScene`

### Camera

`setCameraPosition`, `setCameraTarget`, `setCameraLookAt`, `setCameraFOV`

### Lighting

`setAmbientLight`, `setLightDirection`, `setLightColor`, `setDirectionalLight`, `createPointLight`, `setPointLightColor`, `setPointLightPosition`, `removeLight`, `setFog`, `clearFog`

### Skybox

`createGradientSkybox`, `createSpaceSkybox`, `createSolidSkybox`, `clearSkybox`, `setSkyboxSpeed`, `enableSkyboxAutoAnimate`, `disableSkyboxAutoAnimate`, `animateSkybox`

### Particles

`createParticleSystem`, `setParticleEmitter`, `updateParticles`, `removeParticleSystem`, `burstParticles`, `emitParticle`, `getParticleStats`

### Materials & Shaders

`createShaderMaterial`, `updateShaderUniform`, `createInstancedMesh`, `setInstanceTransform`, `setInstanceColor`, `finalizeInstances`, `removeInstancedMesh`, `createLODMesh`, `removeLODMesh`, `updateLODs`

### Post-Processing

`enableRetroEffects`, `enableBloom`, `disableBloom`, `enableVignette`, `disableVignette`, `enableChromaticAberration`, `disableChromaticAberration`, `enablePixelation`, `enableFXAA`, `disableFXAA`, `enableDithering`, `enableN64Mode`, `enablePSXMode`, `disablePresetMode`, `enableLowPolyMode`, `isEffectsEnabled`, `setBloomStrength`, `setBloomRadius`, `setBloomThreshold`, `getRenderer`

### 2D Drawing

`cls`, `pset`, `line`, `rect`, `rectfill`, `circle`, `ellipse`, `arc`, `bezier`, `quadCurve`, `poly`, `drawTriangle`, `drawDiamond`, `drawRoundedRect`, `drawCheckerboard`, `drawGradient`, `drawGradientRect`, `drawRadialGradient`, `drawSkyGradient`, `drawStarburst`, `drawSpiral`, `drawWave`, `drawNoise`, `drawScanlines`, `drawFlash`, `drawCrosshair`

### Text

`print`, `printCentered`, `printRight`, `drawText`, `drawGlowText`, `drawGlowTextCentered`, `drawPulsingText`, `drawTextShadow`, `drawTextOutline`, `scrollingText`, `measureText`, `setTextAlign`, `setTextBaseline`, `setFont`, `getFont`

### UI

`drawPanel`, `drawHealthBar`, `drawProgressBar`, `uiProgressBar`, `createButton`, `updateButton`, `drawButton`

### Color

`rgba8`, `hexColor`, `hslColor`, `hsb`, `colorLerp`, `colorMix`, `lerpColor`, `n64Palette`, `colorMode`, `color`

### Math

`lerp`, `clamp`, `pulse`, `smoothstep`, `ease`, `dist`, `dist3d`, `remap`, `randRange`, `randInt`, `deg2rad`, `rad2deg`, `noise`, `noiseDetail`, `noiseSeed`, `noiseMap`, `flowField`, `TWO_PI`, `HALF_PI`, `QUARTER_PI`

### 2D Transform

`pushMatrix`, `popMatrix`, `translate`, `rotate`, `scale2d`, `resetMatrix`, `setCamera`, `centerX`, `centerY`, `grid`, `frameCount`

### Input

`key`, `keyp`, `btn`, `btnp`, `mouseX`, `mouseY`, `mouseDown`, `mousePressed`, `leftStickX`, `leftStickY`, `rightStickX`, `rightStickY`, `gamepadAxis`, `gamepadConnected`

### Game Utils

`createShake`, `triggerShake`, `updateShake`, `getShakeOffset`, `createCooldownSet`, `updateCooldowns`, `cooldownReady`, `useCooldown`, `cooldownProgress`, `createHitState`, `triggerHit`, `isInvulnerable`, `isVisible`, `isFlashing`, `updateHitState`, `createSpawner`, `updateSpawner`, `createPool`, `createFloatingTextSystem`, `drawFloatingTexts`, `drawFloatingTexts3D`, `createStateMachine`, `createTimer`, `createMinimap`, `drawMinimap`

### Audio

`sfx` (presets + custom waveforms), `setVolume`

### Storage & State

`saveData`, `loadData`, `deleteData`, `createGameStore`, `novaStore`

### Collision

`aabb`, `circleCollision`, `raycastFromCamera`
