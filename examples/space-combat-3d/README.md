# Wing Commander Space Combat

First-person space combat game inspired by Wing Commander, Star Fox, and classic space shooters.

## Features

### ✈️ First-Person Flight Combat
- True first-person cockpit view
- Full 6DOF movement (pitch, yaw, roll, strafe)
- Realistic flight physics with inertia
- Boost system for high-speed maneuvers

### 🎯 Combat Systems
- **Dual Lasers**: Rapid-fire energy weapons
- **Homing Missiles**: Lock-on tracking missiles
- **Target Lock System**: Press T to lock onto enemies
- **Energy Management**: Balance between weapons and shields

### 🤖 Enemy AI
- Intelligent enemy fighters with multiple behavior states
- Approach, circle, and retreat tactics
- Enemy ships fire back at player
- Progressive wave system with increasing difficulty

### 🌌 Asteroid Field
- Dynamic asteroid field with 50 asteroids
- Rotating asteroids that can be destroyed
- Asteroids respawn to maintain field density
- Destructible obstacles add tactical elements

### 📊 HUD & Interface
- **Health/Shield bars**: Track your survivability
- **Energy meter**: Monitor weapon power
- **Radar system**: Track nearby enemies
- **Target lock indicator**: Shows when locked
- **Speed gauge**: Monitor your velocity
- **Score tracking**: Points and kills counter

### 🎮 Controls

**Flight:**
- `W/S` or `↑/↓` - Pitch up/down
- `A/D` or `←/→` - Yaw left/right (auto-roll for realism)
- `Q/E` - Strafe left/right
- `Shift` - Boost (increases speed)

**Combat:**
- `Space` - Fire lasers
- `M` - Fire missile (requires target lock)
- `T` - Target nearest enemy

**System:**
- `Enter/Space` - Start game
- `Escape` - Pause
- `R` - Restart (on game over)

## Gameplay Tips

1. **Target Lock**: Press `T` when facing an enemy to lock on. This enables missile tracking.

2. **Energy Management**: 
   - Lasers cost 5 energy per shot
   - Shields regenerate slowly when not taking damage
   - Energy regenerates at 20/second

3. **Shields First**: Your shields absorb damage before hull integrity is affected. Keep them up!

4. **Use Boost Wisely**: Boost increases speed but makes you harder to control. Use for evasion or closing distance.

5. **Strafe in Combat**: Use Q/E to strafe sideways while keeping enemies in front. Makes you harder to hit!

6. **Asteroid Cover**: Use asteroids as cover from enemy fire.

7. **Lead Your Shots**: Enemies are moving - aim ahead of them!

## Technical Details

### Performance
- 50 asteroids with rotation and collision
- Multiple enemies with AI
- Projectile physics and tracking
- Particle explosions
- Smooth 60 FPS performance

### Fixed Issues
- ✅ **Start button working**: Changed from `isKeyPressed()` to `isKeyDown()` for reliable input
- ✅ **Multiple input methods**: Enter, Space, or clicking all work
- ✅ **Clean console**: Removed all console.log spam
- ✅ **Restart on game over**: Press Space, Enter, or R to restart

### Game Balance
- Player Health: 100
- Player Shields: 100
- Missiles: 10 (no resupply)
- Enemy Health: 3 hits
- Laser Damage: 1
- Missile Damage: 5

## Wave System
- Wave 1: 3 enemies
- Wave 2: 5 enemies
- Wave 3: 7 enemies
- Each wave: +2 enemies
- Bonus score: 1000 × wave number per completion

## Future Enhancements
- Power-ups (health, shields, missiles)
- Different enemy types (bombers, interceptors)
- Capital ship battles
- Multiplayer dogfights
- More weapon types (plasma cannon, torpedoes)
- Nebula effects and environmental hazards
- Mission objectives beyond survival

## Credits
Inspired by:
- Wing Commander (Origin Systems)
- Star Fox (Nintendo)
- TIE Fighter (LucasArts)
- Elite Dangerous (Frontier)
