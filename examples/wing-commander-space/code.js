// WING COMMANDER SPACE COMBAT - First Person View
// Asteroid field combat with cockpit view like Wing Commander
// VERSION: v001-INITIAL

console.log('🚀 Wing Commander Space Combat Loading...');

// Helper function for 3D vectors
function vec3(x, y, z) {
  return { x: x || 0, y: y || 0, z: z || 0 };
}

// Game configuration
const CONFIG = {
  // Ship controls
  SHIP_SPEED: 20,
  SHIP_TURN_SPEED: 2.5,
  SHIP_BOOST_MULTIPLIER: 2,
  
  // Combat
  LASER_SPEED: 80,
  LASER_COOLDOWN: 0.15,
  MISSILE_SPEED: 40,
  MISSILE_COOLDOWN: 1.0,
  
  // Asteroids
  ASTEROID_MIN_SPEED: 5,
  ASTEROID_MAX_SPEED: 15,
  ASTEROID_SPAWN_DISTANCE: 100,
  
  // Camera
  CAMERA_FOV: 85,
  CAMERA_SHAKE_INTENSITY: 0.3,
  
  // Visual
  USE_COCKPIT_OVERLAY: true
};

// Game state
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
let gameTime = 0;
let score = 0;
let kills = 0;

// Player state
let player = {
  pos: vec3(0, 0, 0),
  vel: vec3(0, 0, 0),
  rot: vec3(0, 0, 0), // pitch, yaw, roll
  health: 100,
  shield: 100,
  energy: 100,
  boosting: false,
  laserCooldown: 0,
  missileCooldown: 0,
  missileCount: 20
};

// Game objects
let asteroids = [];
let enemies = [];
let playerLasers = [];
let enemyLasers = [];
let missiles = [];
let explosions = [];
let particles = [];
let stars = [];

// Cockpit meshes
let cockpit = {
  frame: null,
  hud: null,
  crosshair: null
};

// Camera shake
let cameraShake = { x: 0, y: 0, z: 0, intensity: 0 };

// UI
let uiButtons = [];

// ============================================
// INITIALIZATION
// ============================================
export async function init() {
  console.log('🎮 Initializing Wing Commander Space Combat...');
  
  // Reset game state
  gameState = 'start';
  gameTime = 0;
  score = 0;
  kills = 0;
  
  // Reset player
  player = {
    pos: vec3(0, 0, 0),
    vel: vec3(0, 0, 0),
    rot: vec3(0, 0, 0),
    health: 100,
    shield: 100,
    energy: 100,
    boosting: false,
    laserCooldown: 0,
    missileCooldown: 0,
    missileCount: 20
  };
  
  // Clear arrays
  asteroids = [];
  enemies = [];
  playerLasers = [];
  enemyLasers = [];
  missiles = [];
  explosions = [];
  particles = [];
  stars = [];
  
  // Setup 3D environment
  setupCamera();
  setupLighting();
  
  // Create star field
  createStarField();
  
  // Create UI
  createStartScreenUI();
  
  // Focus canvas for keyboard input
  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.focus();
    canvas.tabIndex = 1;
  }
  
  console.log('✅ Wing Commander Space Combat Ready!');
}

function setupCamera() {
  // First person view from cockpit
  setCameraPosition(0, 0, 0);
  setCameraTarget(0, 0, -10);
  setCameraFOV(CONFIG.CAMERA_FOV);
}

function setupLighting() {
  // Space lighting - dim ambient with directional sun
  setAmbientLight(0x222244);
  setLightColor(0xffffee);
  setLightDirection(0.3, -0.5, -0.8);
}

function createStarField() {
  // Create distant stars
  for (let i = 0; i < 500; i++) {
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = (Math.random() - 0.5) * Math.PI;
    const distance = 200 + Math.random() * 300;
    
    const x = Math.cos(angle1) * Math.cos(angle2) * distance;
    const y = Math.sin(angle2) * distance;
    const z = Math.sin(angle1) * Math.cos(angle2) * distance;
    
    const brightness = 0.5 + Math.random() * 0.5;
    const color = brightness > 0.8 ? 0xffffee : 0xaabbff;
    
    const star = {
      mesh: createSphere(0.3, color, [x, y, z]),
      pos: vec3(x, y, z),
      brightness: brightness
    };
    stars.push(star);
  }
}

function createStartScreenUI() {
  uiButtons = [];
  
  // Start button with working keyboard fallback
  uiButtons.push(
    createButton(200, 200, 240, 60, '🚀 LAUNCH FIGHTER', () => {
      console.log('🎯 LAUNCH FIGHTER clicked!');
      startGame();
    }, {
      normalColor: rgba8(255, 100, 0, 255),
      hoverColor: rgba8(255, 140, 40, 255),
      pressedColor: rgba8(200, 60, 0, 255)
    })
  );
}

function startGame() {
  console.log('🚀 Starting game...');
  gameState = 'playing';
  gameTime = 0;
  
  // Spawn initial asteroids
  for (let i = 0; i < 15; i++) {
    spawnAsteroid();
  }
  
  // Spawn initial enemies
  for (let i = 0; i < 3; i++) {
    spawnEnemy();
  }
}

// ============================================
// GAME OBJECTS
// ============================================
function spawnAsteroid() {
  // Random position in front of player
  const angle1 = (Math.random() - 0.5) * Math.PI * 0.5;
  const angle2 = (Math.random() - 0.5) * Math.PI * 0.5;
  const distance = CONFIG.ASTEROID_SPAWN_DISTANCE;
  
  const x = Math.sin(angle1) * distance;
  const y = Math.sin(angle2) * distance;
  const z = -distance;
  
  const size = 2 + Math.random() * 4;
  const speed = CONFIG.ASTEROID_MIN_SPEED + Math.random() * (CONFIG.ASTEROID_MAX_SPEED - CONFIG.ASTEROID_MIN_SPEED);
  
  // Gray/brown asteroid colors
  const colors = [0x888888, 0x666666, 0x997755, 0x775544];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const asteroid = {
    mesh: createCube(size, color, [x, y, z]),
    pos: vec3(x, y, z),
    vel: vec3((Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed, speed * 1.5),
    rot: vec3(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5),
    size: size,
    health: Math.floor(size * 2)
  };
  
  setScale(asteroid.mesh, size, size, size);
  asteroids.push(asteroid);
}

function spawnEnemy() {
  // Spawn enemy fighter ahead
  const angle1 = (Math.random() - 0.5) * Math.PI * 0.3;
  const angle2 = (Math.random() - 0.5) * Math.PI * 0.3;
  const distance = 60 + Math.random() * 40;
  
  const x = Math.sin(angle1) * distance;
  const y = Math.sin(angle2) * distance;
  const z = -distance;
  
  // Red enemy fighter
  const body = createCube(2, 0xff3333, [x, y, z]);
  setScale(body, 2, 1, 3);
  
  const wing1 = createCube(4, 0xcc2222, [x - 2, y, z]);
  setScale(wing1, 4, 0.2, 1.5);
  
  const wing2 = createCube(4, 0xcc2222, [x + 2, y, z]);
  setScale(wing2, 4, 0.2, 1.5);
  
  const enemy = {
    body: body,
    wings: [wing1, wing2],
    pos: vec3(x, y, z),
    vel: vec3(0, 0, 5 + Math.random() * 5),
    rot: vec3(0, Math.PI, 0),
    health: 30,
    fireCooldown: 0,
    attackPattern: Math.floor(Math.random() * 3)
  };
  
  enemies.push(enemy);
}

function firePlayerLaser() {
  if (player.laserCooldown > 0) return;
  
  // Fire two lasers from wing positions
  for (let i = -1; i <= 1; i += 2) {
    const laser = {
      mesh: createCube(0.2, 0x00ff00, [i * 1.5, -0.5, -2]),
      pos: vec3(player.pos.x + i * 1.5, player.pos.y - 0.5, player.pos.z - 2),
      vel: vec3(0, 0, -CONFIG.LASER_SPEED),
      life: 3,
      damage: 10
    };
    setScale(laser.mesh, 0.2, 0.2, 2);
    playerLasers.push(laser);
  }
  
  player.laserCooldown = CONFIG.LASER_COOLDOWN;
  player.energy -= 2;
}

function fireMissile() {
  if (player.missileCooldown > 0 || player.missileCount <= 0) return;
  
  const missile = {
    mesh: createCube(0.3, 0xffaa00, [0, 0, -2]),
    pos: vec3(player.pos.x, player.pos.y, player.pos.z - 2),
    vel: vec3(0, 0, -CONFIG.MISSILE_SPEED),
    rot: vec3(0, 0, 0),
    life: 5,
    damage: 50,
    target: null,
    trail: []
  };
  setScale(missile.mesh, 0.3, 0.3, 1);
  missiles.push(missile);
  
  player.missileCooldown = CONFIG.MISSILE_COOLDOWN;
  player.missileCount--;
}

// ============================================
// UPDATE LOOP
// ============================================
export function update() {
  const dt = 1/60;
  
  if (gameState === 'start') {
    updateStartScreen(dt);
    return;
  }
  
  if (gameState === 'playing') {
    gameTime += dt;
    
    updateInput(dt);
    updatePlayer(dt);
    updateAsteroids(dt);
    updateEnemies(dt);
    updateLasers(dt);
    updateMissiles(dt);
    updateExplosions(dt);
    updateParticles(dt);
    updateCamera(dt);
    checkCollisions(dt);
    
    // Spawn more asteroids
    if (asteroids.length < 15 && Math.random() < 0.02) {
      spawnAsteroid();
    }
    
    // Spawn more enemies
    if (enemies.length < 5 && Math.random() < 0.01) {
      spawnEnemy();
    }
  }
}

function updateStartScreen(dt) {
  gameTime += dt;
  
  // Update buttons
  updateAllButtons();
  
  // KEYBOARD FALLBACK - Use isKeyDown for reliable detection
  if (isKeyDown('Enter') || isKeyDown('Space') || isKeyDown(' ')) {
    console.log('⌨️ Keyboard start detected!');
    startGame();
  }
}

function updateInput(dt) {
  // Ship rotation with arrow keys (pitch and yaw)
  if (isKeyDown('ArrowUp')) {
    player.rot.x -= CONFIG.SHIP_TURN_SPEED * dt;
  }
  if (isKeyDown('ArrowDown')) {
    player.rot.x += CONFIG.SHIP_TURN_SPEED * dt;
  }
  if (isKeyDown('ArrowLeft')) {
    player.rot.y += CONFIG.SHIP_TURN_SPEED * dt;
  }
  if (isKeyDown('ArrowRight')) {
    player.rot.y -= CONFIG.SHIP_TURN_SPEED * dt;
  }
  
  // Roll with Q/E
  if (isKeyDown('KeyQ')) {
    player.rot.z += CONFIG.SHIP_TURN_SPEED * dt;
  }
  if (isKeyDown('KeyE')) {
    player.rot.z -= CONFIG.SHIP_TURN_SPEED * dt;
  }
  
  // Speed control with W/S
  const speedMultiplier = isKeyDown('KeyW') ? 1 : (isKeyDown('KeyS') ? -0.5 : 0.5);
  player.boosting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  
  const finalSpeed = CONFIG.SHIP_SPEED * speedMultiplier * (player.boosting ? CONFIG.SHIP_BOOST_MULTIPLIER : 1);
  
  // Convert rotation to velocity (forward is negative Z)
  const forward = {
    x: -Math.sin(player.rot.y) * Math.cos(player.rot.x),
    y: Math.sin(player.rot.x),
    z: -Math.cos(player.rot.y) * Math.cos(player.rot.x)
  };
  
  player.vel.x = forward.x * finalSpeed;
  player.vel.y = forward.y * finalSpeed;
  player.vel.z = forward.z * finalSpeed;
  
  // Weapons
  if (isKeyDown('KeyZ') || isKeyDown('Space')) {
    firePlayerLaser();
  }
  
  if (isKeyPressed('KeyX')) {
    fireMissile();
  }
  
  // Cooldowns
  if (player.laserCooldown > 0) player.laserCooldown -= dt;
  if (player.missileCooldown > 0) player.missileCooldown -= dt;
  
  // Energy regeneration
  if (player.energy < 100 && !player.boosting) {
    player.energy += 10 * dt;
  }
  if (player.boosting && player.energy > 0) {
    player.energy -= 20 * dt;
  }
}

function updatePlayer(dt) {
  // Update position (but keep camera at origin)
  // We move the world, not the player for first-person view
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.z += player.vel.z * dt;
  
  // Clamp rotation
  player.rot.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.rot.x));
  
  // Shield regeneration
  if (player.shield < 100) {
    player.shield += 5 * dt;
  }
}

function updateAsteroids(dt) {
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i];
    
    // Move relative to player
    asteroid.pos.x -= player.vel.x * dt;
    asteroid.pos.y -= player.vel.y * dt;
    asteroid.pos.z -= player.vel.z * dt;
    
    // Add asteroid velocity
    asteroid.pos.x += asteroid.vel.x * dt;
    asteroid.pos.y += asteroid.vel.y * dt;
    asteroid.pos.z += asteroid.vel.z * dt;
    
    // Rotate asteroid
    asteroid.rot.x += 0.5 * dt;
    asteroid.rot.y += 0.3 * dt;
    asteroid.rot.z += 0.2 * dt;
    
    setPosition(asteroid.mesh, asteroid.pos.x, asteroid.pos.y, asteroid.pos.z);
    setRotation(asteroid.mesh, asteroid.rot.x, asteroid.rot.y, asteroid.rot.z);
    
    // Remove if too far behind
    if (asteroid.pos.z > 50 || asteroid.health <= 0) {
      destroyMesh(asteroid.mesh);
      asteroids.splice(i, 1);
      
      if (asteroid.health <= 0) {
        createExplosion(asteroid.pos, asteroid.size);
        score += 10;
      }
    }
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    
    // Move relative to player
    enemy.pos.x -= player.vel.x * dt;
    enemy.pos.y -= player.vel.y * dt;
    enemy.pos.z -= player.vel.z * dt;
    
    // AI movement patterns
    switch (enemy.attackPattern) {
      case 0: // Straight attack
        enemy.vel.z = 10;
        break;
      case 1: // Weaving
        enemy.vel.x = Math.sin(gameTime * 2) * 5;
        enemy.vel.z = 8;
        break;
      case 2: // Circle strafe
        enemy.vel.x = Math.cos(gameTime * 1.5) * 8;
        enemy.vel.y = Math.sin(gameTime * 1.5) * 8;
        enemy.vel.z = 5;
        break;
    }
    
    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;
    enemy.pos.z += enemy.vel.z * dt;
    
    // Update meshes
    setPosition(enemy.body, enemy.pos.x, enemy.pos.y, enemy.pos.z);
    setRotation(enemy.body, enemy.rot.x, enemy.rot.y, enemy.rot.z);
    
    enemy.wings.forEach((wing, idx) => {
      const offset = (idx === 0 ? -2 : 2);
      setPosition(wing, enemy.pos.x + offset, enemy.pos.y, enemy.pos.z);
      setRotation(wing, enemy.rot.x, enemy.rot.y, enemy.rot.z);
    });
    
    // Fire at player
    enemy.fireCooldown -= dt;
    if (enemy.fireCooldown <= 0 && enemy.pos.z < 20 && enemy.pos.z > -30) {
      fireEnemyLaser(enemy);
      enemy.fireCooldown = 1 + Math.random();
    }
    
    // Remove if too far or dead
    if (enemy.pos.z > 50 || enemy.health <= 0) {
      destroyMesh(enemy.body);
      enemy.wings.forEach(w => destroyMesh(w));
      enemies.splice(i, 1);
      
      if (enemy.health <= 0) {
        createExplosion(enemy.pos, 3);
        score += 100;
        kills++;
      }
    }
  }
}

function fireEnemyLaser(enemy) {
  const laser = {
    mesh: createCube(0.15, 0xff0000, [enemy.pos.x, enemy.pos.y, enemy.pos.z]),
    pos: vec3(enemy.pos.x, enemy.pos.y, enemy.pos.z),
    vel: vec3(0, 0, 30),
    life: 2,
    damage: 5
  };
  setScale(laser.mesh, 0.15, 0.15, 1.5);
  enemyLasers.push(laser);
}

function updateLasers(dt) {
  // Player lasers
  for (let i = playerLasers.length - 1; i >= 0; i--) {
    const laser = playerLasers[i];
    
    // Move relative to player
    laser.pos.x -= player.vel.x * dt;
    laser.pos.y -= player.vel.y * dt;
    laser.pos.z -= player.vel.z * dt;
    
    // Add laser velocity
    laser.pos.z += laser.vel.z * dt;
    
    laser.life -= dt;
    
    setPosition(laser.mesh, laser.pos.x, laser.pos.y, laser.pos.z);
    
    if (laser.life <= 0) {
      destroyMesh(laser.mesh);
      playerLasers.splice(i, 1);
    }
  }
  
  // Enemy lasers
  for (let i = enemyLasers.length - 1; i >= 0; i--) {
    const laser = enemyLasers[i];
    
    // Move relative to player
    laser.pos.x -= player.vel.x * dt;
    laser.pos.y -= player.vel.y * dt;
    laser.pos.z -= player.vel.z * dt;
    
    laser.pos.z += laser.vel.z * dt;
    laser.life -= dt;
    
    setPosition(laser.mesh, laser.pos.x, laser.pos.y, laser.pos.z);
    
    if (laser.life <= 0 || laser.pos.z > 10) {
      destroyMesh(laser.mesh);
      enemyLasers.splice(i, 1);
    }
  }
}

function updateMissiles(dt) {
  for (let i = missiles.length - 1; i >= 0; i--) {
    const missile = missiles[i];
    
    // Find target if none
    if (!missile.target && enemies.length > 0) {
      missile.target = enemies[0];
    }
    
    // Home in on target
    if (missile.target && missile.target.health > 0) {
      const dx = missile.target.pos.x - missile.pos.x;
      const dy = missile.target.pos.y - missile.pos.y;
      const dz = missile.target.pos.z - missile.pos.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (dist > 0) {
        const homingStrength = 10;
        missile.vel.x += (dx / dist) * homingStrength * dt;
        missile.vel.y += (dy / dist) * homingStrength * dt;
        missile.vel.z += (dz / dist) * homingStrength * dt;
      }
    }
    
    // Move relative to player
    missile.pos.x -= player.vel.x * dt;
    missile.pos.y -= player.vel.y * dt;
    missile.pos.z -= player.vel.z * dt;
    
    missile.pos.x += missile.vel.x * dt;
    missile.pos.y += missile.vel.y * dt;
    missile.pos.z += missile.vel.z * dt;
    
    missile.life -= dt;
    
    setPosition(missile.mesh, missile.pos.x, missile.pos.y, missile.pos.z);
    
    // Trail particles
    if (Math.random() < 0.5) {
      createParticle(missile.pos, 0xff6600, 0.5);
    }
    
    if (missile.life <= 0) {
      destroyMesh(missile.mesh);
      missiles.splice(i, 1);
    }
  }
}

function updateExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    
    explosion.life -= dt;
    explosion.scale += dt * 5;
    
    // Move relative to player
    explosion.pos.x -= player.vel.x * dt;
    explosion.pos.y -= player.vel.y * dt;
    explosion.pos.z -= player.vel.z * dt;
    
    setPosition(explosion.mesh, explosion.pos.x, explosion.pos.y, explosion.pos.z);
    setScale(explosion.mesh, explosion.scale, explosion.scale, explosion.scale);
    
    // Fade out
    const alpha = Math.max(0, explosion.life / 0.5);
    
    if (explosion.life <= 0) {
      destroyMesh(explosion.mesh);
      explosions.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    
    particle.life -= dt;
    
    // Move relative to player
    particle.pos.x -= player.vel.x * dt;
    particle.pos.y -= player.vel.y * dt;
    particle.pos.z -= player.vel.z * dt;
    
    particle.pos.x += particle.vel.x * dt;
    particle.pos.y += particle.vel.y * dt;
    particle.pos.z += particle.vel.z * dt;
    
    setPosition(particle.mesh, particle.pos.x, particle.pos.y, particle.pos.z);
    
    const scale = particle.life / particle.maxLife;
    setScale(particle.mesh, scale, scale, scale);
    
    if (particle.life <= 0) {
      destroyMesh(particle.mesh);
      particles.splice(i, 1);
    }
  }
}

function updateCamera(dt) {
  // First person camera - apply rotation but stay at origin
  const shake = cameraShake.intensity;
  const shakeX = (Math.random() - 0.5) * shake;
  const shakeY = (Math.random() - 0.5) * shake;
  
  // Reduce shake over time
  cameraShake.intensity *= 0.9;
  
  // Set camera position with shake
  setCameraPosition(shakeX, shakeY, 0);
  
  // Look direction based on ship rotation
  const lookDist = 10;
  const lookX = -Math.sin(player.rot.y) * Math.cos(player.rot.x) * lookDist;
  const lookY = Math.sin(player.rot.x) * lookDist;
  const lookZ = -Math.cos(player.rot.y) * Math.cos(player.rot.x) * lookDist;
  
  setCameraTarget(lookX, lookY, lookZ);
  
  // Apply roll by rotating camera
  // Note: setCameraRotation might not be available, this is visual only
}

function checkCollisions(dt) {
  // Player lasers vs asteroids
  for (let i = playerLasers.length - 1; i >= 0; i--) {
    const laser = playerLasers[i];
    
    for (let j = asteroids.length - 1; j >= 0; j--) {
      const asteroid = asteroids[j];
      const dist = distance(laser.pos, asteroid.pos);
      
      if (dist < asteroid.size) {
        asteroid.health -= laser.damage;
        destroyMesh(laser.mesh);
        playerLasers.splice(i, 1);
        
        createParticle(laser.pos, 0xffaa00, 0.3);
        cameraShake.intensity = 0.2;
        break;
      }
    }
  }
  
  // Player lasers vs enemies
  for (let i = playerLasers.length - 1; i >= 0; i--) {
    const laser = playerLasers[i];
    
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const dist = distance(laser.pos, enemy.pos);
      
      if (dist < 3) {
        enemy.health -= laser.damage;
        destroyMesh(laser.mesh);
        playerLasers.splice(i, 1);
        
        createParticle(laser.pos, 0xff0000, 0.3);
        cameraShake.intensity = 0.3;
        break;
      }
    }
  }
  
  // Missiles vs enemies
  for (let i = missiles.length - 1; i >= 0; i--) {
    const missile = missiles[i];
    
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const dist = distance(missile.pos, enemy.pos);
      
      if (dist < 4) {
        enemy.health -= missile.damage;
        createExplosion(missile.pos, 2);
        destroyMesh(missile.mesh);
        missiles.splice(i, 1);
        
        cameraShake.intensity = 0.8;
        break;
      }
    }
  }
  
  // Enemy lasers vs player
  for (let i = enemyLasers.length - 1; i >= 0; i--) {
    const laser = enemyLasers[i];
    const dist = Math.sqrt(laser.pos.x*laser.pos.x + laser.pos.y*laser.pos.y + laser.pos.z*laser.pos.z);
    
    if (dist < 2) {
      if (player.shield > 0) {
        player.shield -= laser.damage;
      } else {
        player.health -= laser.damage;
      }
      
      destroyMesh(laser.mesh);
      enemyLasers.splice(i, 1);
      cameraShake.intensity = 0.5;
    }
  }
  
  // Asteroids vs player
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i];
    const dist = Math.sqrt(
      asteroid.pos.x * asteroid.pos.x +
      asteroid.pos.y * asteroid.pos.y +
      asteroid.pos.z * asteroid.pos.z
    );
    
    if (dist < asteroid.size + 2) {
      if (player.shield > 0) {
        player.shield -= 20;
      } else {
        player.health -= 20;
      }
      
      createExplosion(asteroid.pos, asteroid.size);
      destroyMesh(asteroid.mesh);
      asteroids.splice(i, 1);
      cameraShake.intensity = 1.0;
    }
  }
  
  // Check game over
  if (player.health <= 0) {
    gameState = 'gameover';
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

function createExplosion(pos, size) {
  const explosion = {
    mesh: createSphere(size, 0xff6600, [pos.x, pos.y, pos.z]),
    pos: vec3(pos.x, pos.y, pos.z),
    scale: size,
    life: 0.5
  };
  explosions.push(explosion);
  
  // Spawn particles
  for (let i = 0; i < 10; i++) {
    createParticle(pos, 0xff6600, 0.8);
  }
}

function createParticle(pos, color, life) {
  const particle = {
    mesh: createSphere(0.2, color, [pos.x, pos.y, pos.z]),
    pos: vec3(pos.x, pos.y, pos.z),
    vel: vec3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10),
    life: life,
    maxLife: life
  };
  particles.push(particle);
}

// ============================================
// DRAW FUNCTIONS
// ============================================
export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  if (gameState === 'playing') {
    drawHUD();
    drawCrosshair();
  }
  
  if (gameState === 'gameover') {
    drawGameOver();
  }
}

function drawStartScreen() {
  // Space background
  rect(0, 0, 640, 360, rgba8(0, 0, 20, 255), true);
  
  // Title
  print('WING COMMANDER', 180, 80, rgba8(255, 200, 0, 255));
  print('SPACE COMBAT', 200, 110, rgba8(0, 200, 255, 255));
  
  // Pulsing start prompt
  const pulse = Math.sin(gameTime * 3) * 0.5 + 0.5;
  print('PRESS ENTER OR SPACE TO START', 170, 150, rgba8(255, 255, 100, Math.floor(pulse * 255)));
  
  // Controls
  rect(150, 180, 340, 150, rgba8(10, 10, 40, 220), true);
  rect(150, 180, 340, 150, rgba8(100, 100, 255, 180), false);
  
  print('CONTROLS:', 260, 195, rgba8(255, 255, 255, 255));
  print('ARROWS - Pitch/Yaw', 180, 220, rgba8(200, 200, 255, 255));
  print('Q/E - Roll', 180, 240, rgba8(200, 200, 255, 255));
  print('W/S - Speed Up/Down', 180, 260, rgba8(200, 200, 255, 255));
  print('Z/SPACE - Fire Lasers', 180, 280, rgba8(200, 200, 255, 255));
  print('X - Fire Missile', 180, 300, rgba8(200, 200, 255, 255));
  print('SHIFT - Boost', 180, 320, rgba8(200, 200, 255, 255));
  
  // Draw buttons
  drawAllButtons();
}

function drawHUD() {
  // HUD background panel
  rect(10, 10, 300, 100, rgba8(0, 0, 0, 180), true);
  rect(10, 10, 300, 100, rgba8(0, 255, 255, 100), false);
  
  // Stats
  print(`SCORE: ${score}`, 20, 25, rgba8(255, 255, 0, 255));
  print(`KILLS: ${kills}`, 20, 45, rgba8(255, 100, 100, 255));
  
  // Health bar
  print('HULL:', 20, 65, rgba8(255, 255, 255, 255));
  rect(70, 63, 100, 12, rgba8(50, 0, 0, 255), true);
  rect(70, 63, Math.floor(player.health), 12, rgba8(255, 0, 0, 255), true);
  rect(70, 63, 100, 12, rgba8(255, 0, 0, 100), false);
  
  // Shield bar
  print('SHIELD:', 20, 85, rgba8(255, 255, 255, 255));
  rect(85, 83, 100, 12, rgba8(0, 20, 50, 255), true);
  rect(85, 83, Math.floor(player.shield), 12, rgba8(0, 150, 255, 255), true);
  rect(85, 83, 100, 12, rgba8(0, 150, 255, 100), false);
  
  // Energy bar (top right)
  rect(530, 10, 100, 25, rgba8(0, 0, 0, 180), true);
  print('ENERGY', 540, 18, rgba8(255, 255, 255, 255));
  rect(535, 28, 95, 5, rgba8(0, 50, 0, 255), true);
  rect(535, 28, Math.floor(player.energy * 0.95), 5, rgba8(0, 255, 0, 255), true);
  
  // Weapon status
  rect(330, 10, 180, 50, rgba8(0, 0, 0, 180), true);
  print('WEAPONS', 370, 20, rgba8(255, 255, 255, 255));
  
  const laserColor = player.laserCooldown > 0 ? rgba8(100, 100, 100, 255) : rgba8(0, 255, 0, 255);
  print(`LASER: READY`, 340, 35, laserColor);
  
  const missileColor = player.missileCooldown > 0 ? rgba8(100, 100, 100, 255) : rgba8(255, 150, 0, 255);
  print(`MISSILE: ${player.missileCount}`, 340, 50, missileColor);
  
  // Speed indicator
  const speed = Math.sqrt(player.vel.x*player.vel.x + player.vel.y*player.vel.y + player.vel.z*player.vel.z);
  print(`SPEED: ${Math.floor(speed)}`, 530, 45, rgba8(200, 200, 255, 255));
  
  // Target info (bottom center)
  if (enemies.length > 0) {
    const target = enemies[0];
    const targetDist = distance(vec3(0, 0, 0), target.pos);
    
    rect(220, 320, 200, 30, rgba8(0, 0, 0, 180), true);
    rect(220, 320, 200, 30, rgba8(255, 0, 0, 100), false);
    print(`TARGET: ${Math.floor(targetDist)}m`, 250, 330, rgba8(255, 0, 0, 255));
  }
}

function drawCrosshair() {
  const cx = 320;
  const cy = 180;
  const size = 15;
  
  // Center dot
  rect(cx - 2, cy - 2, 4, 4, rgba8(0, 255, 0, 255), true);
  
  // Cross lines
  rect(cx - size, cy - 1, size - 5, 2, rgba8(0, 255, 0, 200), true);
  rect(cx + 5, cy - 1, size - 5, 2, rgba8(0, 255, 0, 200), true);
  rect(cx - 1, cy - size, 2, size - 5, rgba8(0, 255, 0, 200), true);
  rect(cx - 1, cy + 5, 2, size - 5, rgba8(0, 255, 0, 200), true);
  
  // Corner brackets
  const bracket = 30;
  // Top left
  rect(cx - bracket, cy - bracket, 10, 2, rgba8(0, 255, 0, 150), true);
  rect(cx - bracket, cy - bracket, 2, 10, rgba8(0, 255, 0, 150), true);
  // Top right
  rect(cx + bracket - 10, cy - bracket, 10, 2, rgba8(0, 255, 0, 150), true);
  rect(cx + bracket - 2, cy - bracket, 2, 10, rgba8(0, 255, 0, 150), true);
  // Bottom left
  rect(cx - bracket, cy + bracket - 2, 10, 2, rgba8(0, 255, 0, 150), true);
  rect(cx - bracket, cy + bracket - 10, 2, 10, rgba8(0, 255, 0, 150), true);
  // Bottom right
  rect(cx + bracket - 10, cy + bracket - 2, 10, 2, rgba8(0, 255, 0, 150), true);
  rect(cx + bracket - 2, cy + bracket - 10, 2, 10, rgba8(0, 255, 0, 150), true);
}

function drawGameOver() {
  rect(0, 0, 640, 360, rgba8(20, 0, 0, 230), true);
  
  print('MISSION FAILED', 220, 120, rgba8(255, 50, 50, 255));
  print(`FINAL SCORE: ${score}`, 230, 160, rgba8(255, 255, 255, 255));
  print(`ENEMIES DESTROYED: ${kills}`, 210, 190, rgba8(255, 255, 255, 255));
  
  const pulse = Math.sin(gameTime * 3) * 0.5 + 0.5;
  print('PRESS ENTER TO RESTART', 210, 240, rgba8(255, 255, 100, Math.floor(pulse * 255)));
  
  if (isKeyDown('Enter') || isKeyDown('Space')) {
    init();
  }
}
