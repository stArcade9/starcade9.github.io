# Wing Commander Space Combat

A first-person space combat game inspired by Wing Commander, featuring asteroid field combat and enemy fighters.

## Features

### ✅ First-Person Cockpit View
- True first-person camera from pilot perspective
- 6-degrees of freedom flight (pitch, yaw, roll)
- Camera stays at origin, world moves around you
- Smooth camera shake on hits

### ✅ Flight Controls
- **Arrow Keys**: Pitch and Yaw (up/down/left/right)
- **Q/E**: Roll (barrel roll left/right)
- **W/S**: Speed up/slow down
- **SHIFT**: Boost (drains energy)
- **Z/SPACE**: Fire lasers
- **X**: Fire homing missile

### ✅ Combat System
- **Dual lasers** firing from wing positions
- **Homing missiles** that track enemies
- **Enemy fighters** with AI attack patterns:
  - Straight attack
  - Weaving maneuvers
  - Circle strafing
- **Asteroids** to dodge and destroy

### ✅ Game Mechanics
- Health and shield system
- Energy management (regenerates when not boosting)
- Weapon cooldowns
- Limited missiles (20 per mission)
- Score and kill tracking
- Progressive difficulty (more enemies spawn)

### ✅ Visual Effects
- Star field background
- Explosion effects with particles
- Laser trails
- Missile smoke trails
- Screen shake on impacts
- HUD with all vital information

### ✅ Fixed Start Button Issue
- **ENTER key** works to start game
- **SPACE key** works to start game
- **Mouse click** on START button works
- Uses `isKeyDown()` instead of `isKeyPressed()` for reliable detection

## HUD Information

### Top Left Panel
- **SCORE**: Points earned
- **KILLS**: Enemies destroyed
- **HULL**: Ship health (red bar)
- **SHIELD**: Shield energy (blue bar)

### Top Right Panel
- **ENERGY**: Boost and weapon energy (green bar)
- **SPEED**: Current velocity

### Center Top Panel
- **WEAPONS**: Laser and missile status
- Shows cooldown and ammo count

### Bottom Center (When Targeting)
- **TARGET**: Distance to nearest enemy

### Center
- **Crosshair**: Green targeting reticle with corner brackets

## Gameplay Tips

1. **Keep Moving**: Stationary targets are easy to hit
2. **Manage Energy**: Boost when needed, regenerate when safe
3. **Use Missiles Wisely**: Only 20 missiles, save for tough enemies
4. **Shield First**: Shields regenerate, hull damage doesn't
5. **Aim Ahead**: Lasers have travel time
6. **Dodge Asteroids**: They do massive damage
7. **Roll and Weave**: Use Q/E to barrel roll out of danger

## Enemy Patterns

### Fighter Types
1. **Straight Attackers**: Rush directly at you
2. **Weavers**: Zigzag while approaching
3. **Circle Strafers**: Orbit around you while firing

### Strategy
- Missiles work best on straight attackers
- Lead your shots against weavers
- Circle strafers require prediction

## Technical Details

### Camera System
```javascript
// First-person view - camera at origin, world moves
setCameraPosition(0, 0, 0);
setCameraTarget(lookX, lookY, lookZ); // Based on ship rotation
```

### Movement System
```javascript
// Ship rotation affects forward direction
forward.x = -sin(yaw) * cos(pitch)
forward.y = sin(pitch)
forward.z = -cos(yaw) * cos(pitch)

// World moves opposite to player velocity
worldPos -= playerVelocity * deltaTime
```

### Collision Detection
- Sphere-sphere collision for all objects
- Distance checks for laser hits
- Proximity detection for player collisions

## Configuration

Edit `CONFIG` object to tune gameplay:

```javascript
const CONFIG = {
  SHIP_SPEED: 20,              // Base speed
  SHIP_TURN_SPEED: 2.5,        // Rotation speed
  SHIP_BOOST_MULTIPLIER: 2,    // Boost factor
  LASER_SPEED: 80,             // Laser velocity
  LASER_COOLDOWN: 0.15,        // Seconds between shots
  MISSILE_SPEED: 40,           // Missile velocity
  MISSILE_COOLDOWN: 1.0,       // Seconds between launches
  ASTEROID_SPAWN_DISTANCE: 100 // Spawn distance
};
```

## Future Enhancements

- [ ] Cockpit frame overlay
- [ ] Power-up pickups (health, missiles, energy)
- [ ] Multiple weapon types
- [ ] Boss battles
- [ ] Mission objectives
- [ ] Wingman AI allies
- [ ] Capital ship battles
- [ ] Hyperspace jumps between sectors
- [ ] Saving/loading progress
- [ ] Sound effects and music

## Known Issues

- None currently!

## Credits

Inspired by:
- Wing Commander series
- X-Wing vs TIE Fighter
- Freespace 2
- Elite Dangerous

Built with Nova64 fantasy console.
