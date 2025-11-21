// WING COMMANDER SPACE COMBAT
// First-person asteroid field combat with enemy ships
// Inspired by Wing Commander, Star Fox, and classic space shooters

// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
  // Player ship
  SHIP_SPEED: 25,
  SHIP_TURN_SPEED: 2.5,
  SHIP_BOOST_SPEED: 45,
  SHIP_STRAFE_SPEED: 15,
  
  // Combat
  LASER_SPEED: 80,
  LASER_COOLDOWN: 0.15,
  MISSILE_SPEED: 40,
  MISSILE_COOLDOWN: 1.5,
  MISSILE_TURN_RATE: 3,
  
  // Enemies
  ENEMY_SPAWN_DISTANCE: 150,
  ENEMY_SPEED: 20,
  ENEMY_HEALTH: 3,
  
  // Asteroids
  ASTEROID_COUNT: 50,
  ASTEROID_SPAWN_RANGE: 200,
  
  // Visuals
  COCKPIT_OVERLAY: true,
  CROSSHAIR: true,
  RADAR_RANGE: 100,
};

// ============================================
// GAME STATE
// ============================================
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
let gameTime = 0;
let score = 0;
let kills = 0;
let wave = 1;

// Player ship state
let player = {
  pos: { x: 0, y: 0, z: 0 },
  vel: { x: 0, y: 0, z: 0 },
  pitch: 0,  // Up/down rotation
  yaw: 0,    // Left/right rotation
  roll: 0,   // Barrel roll rotation
  health: 100,
  maxHealth: 100,
  shields: 100,
  maxShields: 100,
  energy: 100,
  maxEnergy: 100,
  boosting: false,
  missiles: 10,
  laserCooldown: 0,
  missileCooldown: 0,
  targetLocked: null,
};

// Camera (first-person from cockpit)
let camera = {
  pos: { x: 0, y: 0, z: 0 },
  pitch: 0,
  yaw: 0,
  roll: 0,
  shake: 0,
};

// Game objects
let asteroids = [];
let enemies = [];
let projectiles = [];
let explosions = [];
let stars = [];
let cockpitMesh = null;
let crosshairMesh = null;

// ============================================
// INITIALIZATION
// ============================================
export async function init() {
  // Reset game state
  gameState = 'start';
  gameTime = 0;
  score = 0;
  kills = 0;
  wave = 1;
  
  // Reset player
  player = {
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    pitch: 0,
    yaw: 0,
    roll: 0,
    health: 100,
    maxHealth: 100,
    shields: 100,
    maxShields: 100,
    energy: 100,
    maxEnergy: 100,
    boosting: false,
    missiles: 10,
    laserCooldown: 0,
    missileCooldown: 0,
    targetLocked: null,
  };
  
  // Reset camera
  camera = {
    pos: { x: 0, y: 0, z: 0 },
    pitch: 0,
    yaw: 0,
    roll: 0,
    shake: 0,
  };
  
  // Clear arrays
  asteroids = [];
  enemies = [];
  projectiles = [];
  explosions = [];
  stars = [];
  
  // Create starfield
  createStarfield();
  
  // Create asteroid field
  createAsteroidField();
  
  // Create cockpit overlay
  if (CONFIG.COCKPIT_OVERLAY) {
    createCockpit();
  }
  
  // Create crosshair
  if (CONFIG.CROSSHAIR) {
    createCrosshair();
  }
  
  // Spawn initial enemies
  spawnWave(wave);
  
  // Setup lighting
  setAmbientLight(0x333333);
  setLightColor(0xffffff);
  setLightDirection(0.5, -0.5, 0.5);
  
  // Setup camera
  updateCamera(0);
}

// ============================================
// SCENE CREATION
// ============================================
function createStarfield() {
  // Create distant stars
  for (let i = 0; i < 300; i++) {
    const distance = 400 + Math.random() * 400;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = (Math.random() - 0.5) * Math.PI;
    
    const star = {
      x: Math.cos(angle1) * Math.cos(angle2) * distance,
      y: Math.sin(angle2) * distance,
      z: Math.sin(angle1) * Math.cos(angle2) * distance,
      brightness: 0.3 + Math.random() * 0.7,
      mesh: createSphere(0.3 + Math.random() * 0.5, 0xffffff, [0, 0, 0])
    };
    
    setPosition(star.mesh, star.x, star.y, star.z);
    stars.push(star);
  }
}

function createAsteroidField() {
  for (let i = 0; i < CONFIG.ASTEROID_COUNT; i++) {
    spawnAsteroid();
  }
}

function spawnAsteroid() {
  const range = CONFIG.ASTEROID_SPAWN_RANGE;
  const size = 2 + Math.random() * 6;
  const x = (Math.random() - 0.5) * range * 2;
  const y = (Math.random() - 0.5) * range;
  const z = (Math.random() - 0.5) * range * 2;
  
  const asteroid = {
    pos: { x, y, z },
    vel: {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: (Math.random() - 0.5) * 2,
    },
    rotation: {
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2,
      z: Math.random() * Math.PI * 2,
    },
    rotationSpeed: {
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.5,
      z: (Math.random() - 0.5) * 0.5,
    },
    size,
    health: Math.ceil(size / 2),
    mesh: createCube(size, 0x666666, [x, y, z]),
  };
  
  asteroids.push(asteroid);
}

function createCockpit() {
  // Create semi-transparent cockpit frame
  // Left frame
  const leftFrame = createCube(0.5, 0x333333, [-8, 0, -5]);
  setScale(leftFrame, 0.2, 8, 0.2);
  
  // Right frame
  const rightFrame = createCube(0.5, 0x333333, [8, 0, -5]);
  setScale(rightFrame, 0.2, 8, 0.2);
  
  // Top frame
  const topFrame = createCube(0.5, 0x333333, [0, 6, -5]);
  setScale(topFrame, 16, 0.2, 0.2);
  
  // Bottom frame (with HUD console)
  const bottomFrame = createCube(0.5, 0x222222, [0, -5, -5]);
  setScale(bottomFrame, 16, 1.5, 0.2);
  
  cockpitMesh = { leftFrame, rightFrame, topFrame, bottomFrame };
}

function createCrosshair() {
  // Simple crosshair in center of view
  const size = 0.3;
  const distance = 15;
  
  // Horizontal line
  const horizontal = createCube(size, 0x00ff00, [0, 0, -distance]);
  setScale(horizontal, 2, 0.05, 0.05);
  
  // Vertical line
  const vertical = createCube(size, 0x00ff00, [0, 0, -distance]);
  setScale(vertical, 0.05, 2, 0.05);
  
  // Center dot
  const center = createSphere(0.05, 0xff0000, [0, 0, -distance]);
  
  crosshairMesh = { horizontal, vertical, center };
}

function spawnWave(waveNum) {
  const enemyCount = 3 + waveNum * 2;
  
  for (let i = 0; i < enemyCount; i++) {
    setTimeout(() => spawnEnemy(), i * 1000);
  }
}

function spawnEnemy() {
  const distance = CONFIG.ENEMY_SPAWN_DISTANCE;
  const angle = Math.random() * Math.PI * 2;
  
  const enemy = {
    pos: {
      x: Math.cos(angle) * distance,
      y: (Math.random() - 0.5) * 50,
      z: Math.sin(angle) * distance,
    },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    health: CONFIG.ENEMY_HEALTH,
    maxHealth: CONFIG.ENEMY_HEALTH,
    shootCooldown: 0,
    aiState: 'approach',
    mesh: createEnemyShip(),
  };
  
  enemies.push(enemy);
}

function createEnemyShip() {
  // Simple enemy ship - red diamond shape
  const body = createCube(2, 0xff3333, [0, 0, 0]);
  setScale(body, 3, 1, 3);
  
  return body;
}

// ============================================
// UPDATE LOOP
// ============================================
export function update() {
  const dt = 1/60;
  
  if (gameState === 'start') {
    // Check for start input - FIXED: Use isKeyDown instead of isKeyPressed
    if (isKeyDown('Enter') || isKeyDown('Space') || isKeyDown(' ')) {
      gameState = 'playing';
    }
    return;
  }
  
  if (gameState === 'paused') {
    // Check for unpause
    if (isKeyPressed('Escape')) {
      gameState = 'playing';
    }
    return;
  }
  
  if (gameState === 'gameover') return;
  
  if (gameState !== 'playing') return;
  
  gameTime += dt;
  
  // Update game
  updateInput(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateAsteroids(dt);
  updateExplosions(dt);
  updateCamera(dt);
  updateTargeting();
  
  // Regenerate shields and energy
  if (player.shields < player.maxShields) {
    player.shields = Math.min(player.maxShields, player.shields + 5 * dt);
  }
  if (player.energy < player.maxEnergy) {
    player.energy = Math.min(player.maxEnergy, player.energy + 20 * dt);
  }
  
  // Cooldowns
  if (player.laserCooldown > 0) player.laserCooldown -= dt;
  if (player.missileCooldown > 0) player.missileCooldown -= dt;
  
  // Check for wave completion
  if (enemies.length === 0) {
    wave++;
    score += 1000 * wave;
    spawnWave(wave);
  }
  
  // Check game over
  if (player.health <= 0) {
    gameState = 'gameover';
  }
}

// ============================================
// INPUT HANDLING
// ============================================
function updateInput(dt) {
  const turnSpeed = CONFIG.SHIP_TURN_SPEED * dt;
  const speed = player.boosting ? CONFIG.SHIP_BOOST_SPEED : CONFIG.SHIP_SPEED;
  
  // Mouse control for pitch/yaw (optional - for now keyboard)
  
  // Pitch (up/down) - W/S or Arrow Up/Down
  if (isKeyDown('KeyW') || isKeyDown('ArrowUp')) {
    player.pitch -= turnSpeed;
  }
  if (isKeyDown('KeyS') || isKeyDown('ArrowDown')) {
    player.pitch += turnSpeed;
  }
  
  // Yaw (left/right) - A/D or Arrow Left/Right
  if (isKeyDown('KeyA') || isKeyDown('ArrowLeft')) {
    player.yaw -= turnSpeed;
    player.roll = Math.max(-0.5, player.roll - dt * 2);
  } else if (isKeyDown('KeyD') || isKeyDown('ArrowRight')) {
    player.yaw += turnSpeed;
    player.roll = Math.min(0.5, player.roll + dt * 2);
  } else {
    // Return to level
    player.roll *= 0.9;
  }
  
  // Boost - Shift
  player.boosting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');
  
  // Strafe - Q/E
  const strafeSpeed = CONFIG.SHIP_STRAFE_SPEED * dt;
  if (isKeyDown('KeyQ')) {
    player.vel.x -= Math.cos(player.yaw + Math.PI/2) * strafeSpeed;
    player.vel.z -= Math.sin(player.yaw + Math.PI/2) * strafeSpeed;
  }
  if (isKeyDown('KeyE')) {
    player.vel.x += Math.cos(player.yaw + Math.PI/2) * strafeSpeed;
    player.vel.z += Math.sin(player.yaw + Math.PI/2) * strafeSpeed;
  }
  
  // Fire lasers - Space or Left Click
  if ((isKeyDown('Space') || isKeyDown(' ')) && player.laserCooldown <= 0 && player.energy >= 5) {
    fireLasers();
    player.laserCooldown = CONFIG.LASER_COOLDOWN;
    player.energy -= 5;
  }
  
  // Fire missile - M or Right Click
  if (isKeyPressed('KeyM') && player.missileCooldown <= 0 && player.missiles > 0) {
    fireMissile();
    player.missileCooldown = CONFIG.MISSILE_COOLDOWN;
    player.missiles--;
  }
  
  // Target lock - T
  if (isKeyPressed('KeyT')) {
    lockTarget();
  }
  
  // Pause - Escape
  if (isKeyPressed('Escape')) {
    gameState = 'paused';
  }
  
  // Apply movement in direction ship is facing
  const forward = {
    x: Math.sin(player.yaw) * Math.cos(player.pitch),
    y: Math.sin(player.pitch),
    z: -Math.cos(player.yaw) * Math.cos(player.pitch),
  };
  
  player.vel.x += forward.x * speed * dt;
  player.vel.y += forward.y * speed * dt;
  player.vel.z += forward.z * speed * dt;
  
  // Apply drag
  player.vel.x *= 0.98;
  player.vel.y *= 0.98;
  player.vel.z *= 0.98;
}

// ============================================
// PLAYER UPDATE
// ============================================
function updatePlayer(dt) {
  // Update position
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.z += player.vel.z * dt;
  
  // Clamp pitch to prevent over-rotation
  player.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.pitch));
  
  // Wrap yaw
  if (player.yaw > Math.PI) player.yaw -= Math.PI * 2;
  if (player.yaw < -Math.PI) player.yaw += Math.PI * 2;
}

// ============================================
// COMBAT SYSTEM
// ============================================
function fireLasers() {
  // Fire dual lasers from ship wings
  const forward = {
    x: Math.sin(player.yaw) * Math.cos(player.pitch),
    y: Math.sin(player.pitch),
    z: -Math.cos(player.yaw) * Math.cos(player.pitch),
  };
  
  const right = {
    x: Math.cos(player.yaw),
    y: 0,
    z: Math.sin(player.yaw),
  };
  
  // Left laser
  createLaser(
    player.pos.x - right.x * 2,
    player.pos.y - right.y * 2,
    player.pos.z - right.z * 2,
    forward.x, forward.y, forward.z,
    'player'
  );
  
  // Right laser
  createLaser(
    player.pos.x + right.x * 2,
    player.pos.y + right.y * 2,
    player.pos.z + right.z * 2,
    forward.x, forward.y, forward.z,
    'player'
  );
  
  // Camera shake
  camera.shake = 0.1;
}

function createLaser(x, y, z, dx, dy, dz, owner) {
  const color = owner === 'player' ? 0x00ff00 : 0xff0000;
  const mesh = createCube(0.3, color, [x, y, z]);
  setScale(mesh, 0.2, 0.2, 2);
  
  const projectile = {
    pos: { x, y, z },
    vel: {
      x: dx * CONFIG.LASER_SPEED,
      y: dy * CONFIG.LASER_SPEED,
      z: dz * CONFIG.LASER_SPEED,
    },
    damage: 1,
    owner,
    life: 3,
    mesh,
  };
  
  projectiles.push(projectile);
}

function fireMissile() {
  const forward = {
    x: Math.sin(player.yaw) * Math.cos(player.pitch),
    y: Math.sin(player.pitch),
    z: -Math.cos(player.yaw) * Math.cos(player.pitch),
  };
  
  const mesh = createCube(0.5, 0xffff00, [
    player.pos.x,
    player.pos.y,
    player.pos.z,
  ]);
  setScale(mesh, 0.3, 0.3, 1.5);
  
  const missile = {
    pos: { ...player.pos },
    vel: {
      x: forward.x * CONFIG.MISSILE_SPEED,
      y: forward.y * CONFIG.MISSILE_SPEED,
      z: forward.z * CONFIG.MISSILE_SPEED,
    },
    damage: 5,
    owner: 'player',
    life: 10,
    mesh,
    target: player.targetLocked,
    isMissile: true,
  };
  
  projectiles.push(missile);
}

function lockTarget() {
  // Find closest enemy in front of player
  let closest = null;
  let minDist = 100;
  
  const forward = {
    x: Math.sin(player.yaw) * Math.cos(player.pitch),
    y: Math.sin(player.pitch),
    z: -Math.cos(player.yaw) * Math.cos(player.pitch),
  };
  
  enemies.forEach(enemy => {
    const toEnemy = {
      x: enemy.pos.x - player.pos.x,
      y: enemy.pos.y - player.pos.y,
      z: enemy.pos.z - player.pos.z,
    };
    
    const dist = Math.sqrt(toEnemy.x**2 + toEnemy.y**2 + toEnemy.z**2);
    const len = Math.sqrt(forward.x**2 + forward.y**2 + forward.z**2);
    const dot = (toEnemy.x * forward.x + toEnemy.y * forward.y + toEnemy.z * forward.z) / (dist * len);
    
    if (dot > 0.9 && dist < minDist) {
      closest = enemy;
      minDist = dist;
    }
  });
  
  player.targetLocked = closest;
}

function updateTargeting() {
  // Clear lock if target destroyed
  if (player.targetLocked && !enemies.includes(player.targetLocked)) {
    player.targetLocked = null;
  }
}

// ============================================
// ENEMY AI
// ============================================
function updateEnemies(dt) {
  enemies.forEach(enemy => {
    // Simple AI - approach and circle player
    const toPlayer = {
      x: player.pos.x - enemy.pos.x,
      y: player.pos.y - enemy.pos.y,
      z: player.pos.z - enemy.pos.z,
    };
    
    const dist = Math.sqrt(toPlayer.x**2 + toPlayer.y**2 + toPlayer.z**2);
    
    if (dist > 80) {
      // Approach
      enemy.vel.x = (toPlayer.x / dist) * CONFIG.ENEMY_SPEED * dt;
      enemy.vel.y = (toPlayer.y / dist) * CONFIG.ENEMY_SPEED * dt;
      enemy.vel.z = (toPlayer.z / dist) * CONFIG.ENEMY_SPEED * dt;
    } else if (dist > 30) {
      // Circle
      const perpendicular = {
        x: -toPlayer.z,
        y: 0,
        z: toPlayer.x,
      };
      const perpLen = Math.sqrt(perpendicular.x**2 + perpendicular.z**2);
      
      enemy.vel.x = (perpendicular.x / perpLen) * CONFIG.ENEMY_SPEED * dt;
      enemy.vel.z = (perpendicular.z / perpLen) * CONFIG.ENEMY_SPEED * dt;
    } else {
      // Retreat
      enemy.vel.x = -(toPlayer.x / dist) * CONFIG.ENEMY_SPEED * dt;
      enemy.vel.y = -(toPlayer.y / dist) * CONFIG.ENEMY_SPEED * dt;
      enemy.vel.z = -(toPlayer.z / dist) * CONFIG.ENEMY_SPEED * dt;
    }
    
    // Update position
    enemy.pos.x += enemy.vel.x;
    enemy.pos.y += enemy.vel.y;
    enemy.pos.z += enemy.vel.z;
    
    // Update mesh
    setPosition(enemy.mesh, enemy.pos.x, enemy.pos.y, enemy.pos.z);
    
    // Shoot at player
    enemy.shootCooldown -= dt;
    if (enemy.shootCooldown <= 0 && dist < 100) {
      enemyShoot(enemy, toPlayer, dist);
      enemy.shootCooldown = 2 + Math.random();
    }
  });
}

function enemyShoot(enemy, toPlayer, dist) {
  createLaser(
    enemy.pos.x,
    enemy.pos.y,
    enemy.pos.z,
    toPlayer.x / dist,
    toPlayer.y / dist,
    toPlayer.z / dist,
    'enemy'
  );
}

// ============================================
// PROJECTILE UPDATE
// ============================================
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    
    // Missile homing
    if (proj.isMissile && proj.target && enemies.includes(proj.target)) {
      const toTarget = {
        x: proj.target.pos.x - proj.pos.x,
        y: proj.target.pos.y - proj.pos.y,
        z: proj.target.pos.z - proj.pos.z,
      };
      
      const dist = Math.sqrt(toTarget.x**2 + toTarget.y**2 + toTarget.z**2);
      const turnRate = CONFIG.MISSILE_TURN_RATE * dt;
      
      proj.vel.x += (toTarget.x / dist) * turnRate;
      proj.vel.y += (toTarget.y / dist) * turnRate;
      proj.vel.z += (toTarget.z / dist) * turnRate;
    }
    
    // Update position
    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;
    proj.pos.z += proj.vel.z * dt;
    
    setPosition(proj.mesh, proj.pos.x, proj.pos.y, proj.pos.z);
    
    // Lifetime
    proj.life -= dt;
    if (proj.life <= 0) {
      destroyMesh(proj.mesh);
      projectiles.splice(i, 1);
      continue;
    }
    
    // Check collisions
    let hit = false;
    
    // Hit enemies
    if (proj.owner === 'player') {
      enemies.forEach((enemy, ei) => {
        const dist = Math.sqrt(
          (proj.pos.x - enemy.pos.x)**2 +
          (proj.pos.y - enemy.pos.y)**2 +
          (proj.pos.z - enemy.pos.z)**2
        );
        
        if (dist < 3) {
          enemy.health -= proj.damage;
          hit = true;
          
          if (enemy.health <= 0) {
            createExplosion(enemy.pos.x, enemy.pos.y, enemy.pos.z, 5);
            destroyMesh(enemy.mesh);
            enemies.splice(ei, 1);
            score += 100;
            kills++;
          }
        }
      });
    }
    
    // Hit player
    if (proj.owner === 'enemy') {
      const dist = Math.sqrt(
        (proj.pos.x - player.pos.x)**2 +
        (proj.pos.y - player.pos.y)**2 +
        (proj.pos.z - player.pos.z)**2
      );
      
      if (dist < 3) {
        if (player.shields > 0) {
          player.shields -= proj.damage * 10;
          if (player.shields < 0) {
            player.health += player.shields;
            player.shields = 0;
          }
        } else {
          player.health -= proj.damage * 10;
        }
        hit = true;
        camera.shake = 0.3;
      }
    }
    
    // Hit asteroids
    asteroids.forEach((asteroid, ai) => {
      const dist = Math.sqrt(
        (proj.pos.x - asteroid.pos.x)**2 +
        (proj.pos.y - asteroid.pos.y)**2 +
        (proj.pos.z - asteroid.pos.z)**2
      );
      
      if (dist < asteroid.size) {
        asteroid.health -= proj.damage;
        hit = true;
        
        if (asteroid.health <= 0) {
          createExplosion(asteroid.pos.x, asteroid.pos.y, asteroid.pos.z, asteroid.size);
          destroyMesh(asteroid.mesh);
          asteroids.splice(ai, 1);
          score += 10;
          
          // Respawn asteroid elsewhere
          setTimeout(() => spawnAsteroid(), 5000);
        }
      }
    });
    
    if (hit) {
      destroyMesh(proj.mesh);
      projectiles.splice(i, 1);
    }
  }
}

// ============================================
// ASTEROID UPDATE
// ============================================
function updateAsteroids(dt) {
  asteroids.forEach(asteroid => {
    // Update position
    asteroid.pos.x += asteroid.vel.x * dt;
    asteroid.pos.y += asteroid.vel.y * dt;
    asteroid.pos.z += asteroid.vel.z * dt;
    
    // Update rotation
    asteroid.rotation.x += asteroid.rotationSpeed.x * dt;
    asteroid.rotation.y += asteroid.rotationSpeed.y * dt;
    asteroid.rotation.z += asteroid.rotationSpeed.z * dt;
    
    // Wrap around play area
    const range = CONFIG.ASTEROID_SPAWN_RANGE;
    if (Math.abs(asteroid.pos.x - player.pos.x) > range) {
      asteroid.pos.x = player.pos.x + (Math.random() - 0.5) * range;
    }
    if (Math.abs(asteroid.pos.z - player.pos.z) > range) {
      asteroid.pos.z = player.pos.z + (Math.random() - 0.5) * range;
    }
    
    // Update mesh
    setPosition(asteroid.mesh, asteroid.pos.x, asteroid.pos.y, asteroid.pos.z);
    setRotation(asteroid.mesh, asteroid.rotation.x, asteroid.rotation.y, asteroid.rotation.z);
  });
}

// ============================================
// EXPLOSIONS
// ============================================
function createExplosion(x, y, z, size) {
  for (let i = 0; i < size * 3; i++) {
    const particle = {
      pos: { x, y, z },
      vel: {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20,
      },
      life: 0.5 + Math.random() * 0.5,
      mesh: createSphere(0.3, 0xff6600, [x, y, z]),
    };
    explosions.push(particle);
  }
}

function updateExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const exp = explosions[i];
    
    exp.pos.x += exp.vel.x * dt;
    exp.pos.y += exp.vel.y * dt;
    exp.pos.z += exp.vel.z * dt;
    
    setPosition(exp.mesh, exp.pos.x, exp.pos.y, exp.pos.z);
    
    exp.life -= dt;
    const scale = exp.life;
    setScale(exp.mesh, scale, scale, scale);
    
    if (exp.life <= 0) {
      destroyMesh(exp.mesh);
      explosions.splice(i, 1);
    }
  }
}

// ============================================
// CAMERA UPDATE
// ============================================
function updateCamera(dt) {
  // First-person camera - follows player ship orientation
  camera.pos.x = player.pos.x;
  camera.pos.y = player.pos.y;
  camera.pos.z = player.pos.z;
  
  camera.pitch = player.pitch;
  camera.yaw = player.yaw;
  camera.roll = player.roll;
  
  // Camera shake
  if (camera.shake > 0) {
    camera.shake -= dt * 3;
    camera.pos.x += (Math.random() - 0.5) * camera.shake;
    camera.pos.y += (Math.random() - 0.5) * camera.shake;
  }
  
  // Calculate look direction
  const forward = {
    x: Math.sin(camera.yaw) * Math.cos(camera.pitch),
    y: Math.sin(camera.pitch),
    z: -Math.cos(camera.yaw) * Math.cos(camera.pitch),
  };
  
  // Set camera
  setCameraPosition(camera.pos.x, camera.pos.y, camera.pos.z);
  setCameraTarget(
    camera.pos.x + forward.x * 100,
    camera.pos.y + forward.y * 100,
    camera.pos.z + forward.z * 100
  );
  
  // Update cockpit elements to follow camera
  if (crosshairMesh) {
    const dist = 15;
    setPosition(crosshairMesh.horizontal, 
      camera.pos.x + forward.x * dist,
      camera.pos.y + forward.y * dist,
      camera.pos.z + forward.z * dist
    );
    setPosition(crosshairMesh.vertical,
      camera.pos.x + forward.x * dist,
      camera.pos.y + forward.y * dist,
      camera.pos.z + forward.z * dist
    );
    setPosition(crosshairMesh.center,
      camera.pos.x + forward.x * dist,
      camera.pos.y + forward.y * dist,
      camera.pos.z + forward.z * dist
    );
  }
}

// ============================================
// DRAW / UI
// ============================================
export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  if (gameState === 'playing') {
    drawHUD();
  } else if (gameState === 'paused') {
    drawHUD();
    drawPauseScreen();
  } else if (gameState === 'gameover') {
    drawGameOver();
  }
}

function drawStartScreen() {
  // Background
  rect(0, 0, 640, 360, rgba8(0, 0, 0, 200), true);
  
  // Title
  print('WING COMMANDER', 200, 80, rgba8(255, 255, 0, 255));
  print('SPACE COMBAT', 220, 110, rgba8(200, 200, 200, 255));
  
  // Instructions
  const pulse = Math.sin(gameTime * 3) * 0.5 + 0.5;
  print('PRESS SPACE OR ENTER TO START', 170, 160, rgba8(255, 255, 255, Math.floor(pulse * 255)));
  
  // Controls
  rect(120, 200, 400, 140, rgba8(20, 20, 40, 220), true);
  rect(120, 200, 400, 140, rgba8(100, 100, 255, 180), false);
  
  print('CONTROLS:', 270, 215, rgba8(255, 255, 100, 255));
  
  print('W/S or Arrows = Pitch Up/Down', 140, 240, rgba8(200, 200, 200, 255));
  print('A/D or Arrows = Yaw Left/Right', 140, 260, rgba8(200, 200, 200, 255));
  print('Q/E = Strafe Left/Right', 140, 280, rgba8(200, 200, 200, 255));
  print('SPACE = Fire Lasers', 140, 300, rgba8(200, 200, 200, 255));
  print('M = Fire Missile', 140, 320, rgba8(200, 200, 200, 255));
  
  print('SHIFT = Boost', 370, 260, rgba8(200, 200, 200, 255));
  print('T = Target Lock', 370, 280, rgba8(200, 200, 200, 255));
  print('ESC = Pause', 370, 300, rgba8(200, 200, 200, 255));
}

function drawHUD() {
  // Top HUD bar
  rect(0, 0, 640, 40, rgba8(0, 0, 0, 180), true);
  rect(0, 0, 640, 1, rgba8(0, 255, 255, 255), true);
  
  // Score and stats
  print(`SCORE: ${score.toString().padStart(8, '0')}`, 10, 10, rgba8(0, 255, 255, 255));
  print(`KILLS: ${kills}`, 10, 25, rgba8(255, 100, 100, 255));
  
  print(`WAVE: ${wave}`, 250, 10, rgba8(255, 255, 0, 255));
  print(`ENEMIES: ${enemies.length}`, 250, 25, rgba8(255, 100, 100, 255));
  
  // Health bar
  print('HULL:', 400, 10, rgba8(255, 255, 255, 255));
  rect(445, 8, 100, 10, rgba8(50, 0, 0, 255), true);
  rect(445, 8, Math.floor((player.health / player.maxHealth) * 100), 10, rgba8(255, 0, 0, 255), true);
  rect(445, 8, 100, 10, rgba8(255, 0, 0, 100), false);
  
  // Shield bar
  print('SHIELDS:', 400, 25, rgba8(255, 255, 255, 255));
  rect(465, 23, 80, 10, rgba8(0, 0, 50, 255), true);
  rect(465, 23, Math.floor((player.shields / player.maxShields) * 80), 10, rgba8(0, 100, 255, 255), true);
  rect(465, 23, 80, 10, rgba8(0, 100, 255, 100), false);
  
  // Bottom HUD
  rect(0, 320, 640, 40, rgba8(0, 0, 0, 180), true);
  rect(0, 359, 640, 1, rgba8(0, 255, 255, 255), true);
  
  // Energy
  print('ENERGY:', 10, 330, rgba8(255, 255, 255, 255));
  rect(70, 328, 100, 10, rgba8(50, 50, 0, 255), true);
  rect(70, 328, Math.floor((player.energy / player.maxEnergy) * 100), 10, rgba8(0, 255, 0, 255), true);
  
  // Missiles
  print(`MISSILES: ${player.missiles}`, 10, 345, rgba8(255, 255, 0, 255));
  
  // Speed indicator
  const speed = Math.sqrt(player.vel.x**2 + player.vel.y**2 + player.vel.z**2);
  print(`SPEED: ${Math.floor(speed)}`, 250, 330, rgba8(200, 200, 200, 255));
  
  // Target lock indicator
  if (player.targetLocked) {
    print('TARGET LOCKED', 250, 345, rgba8(255, 0, 0, 255));
  }
  
  // Boost indicator
  if (player.boosting) {
    print('BOOST', 450, 330, rgba8(255, 100, 0, 255));
  }
  
  // Radar (simple)
  drawRadar();
}

function drawRadar() {
  const radarX = 560;
  const radarY = 290;
  const radarSize = 60;
  
  // Radar background
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 20, 0, 180), true);
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 255, 0, 100), false);
  
  // Center (player)
  rect(radarX - 2, radarY - 2, 4, 4, rgba8(0, 255, 255, 255), true);
  
  // Enemies on radar
  enemies.forEach(enemy => {
    const dx = enemy.pos.x - player.pos.x;
    const dz = enemy.pos.z - player.pos.z;
    const dist = Math.sqrt(dx**2 + dz**2);
    
    if (dist < CONFIG.RADAR_RANGE) {
      const scale = (radarSize / 2) / CONFIG.RADAR_RANGE;
      const x = radarX + dx * scale;
      const y = radarY + dz * scale;
      
      const color = enemy === player.targetLocked ? rgba8(255, 0, 0, 255) : rgba8(255, 100, 100, 255);
      rect(Math.floor(x) - 1, Math.floor(y) - 1, 2, 2, color, true);
    }
  });
}

function drawPauseScreen() {
  rect(0, 0, 640, 360, rgba8(0, 0, 0, 150), true);
  print('PAUSED', 280, 160, rgba8(255, 255, 255, 255));
  print('Press ESC to resume', 230, 190, rgba8(200, 200, 200, 255));
}

function drawGameOver() {
  rect(0, 0, 640, 360, rgba8(0, 0, 0, 200), true);
  
  print('GAME OVER', 250, 120, rgba8(255, 50, 50, 255));
  print(`FINAL SCORE: ${score}`, 240, 160, rgba8(255, 255, 0, 255));
  print(`KILLS: ${kills}`, 280, 190, rgba8(255, 100, 100, 255));
  print(`WAVE REACHED: ${wave}`, 250, 220, rgba8(200, 200, 200, 255));
  
  const pulse = Math.sin(gameTime * 3) * 0.5 + 0.5;
  print('Press SPACE or ENTER to restart', 200, 270, rgba8(255, 255, 255, Math.floor(pulse * 255)));
  
  if (isKeyDown('KeyR') || isKeyDown('Enter') || isKeyDown('Space') || isKeyDown(' ')) {
    init();
  }
}
