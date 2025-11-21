// ⭐ STAR FOX NOVA 64 - DESERTED SPACE QUALITY ⭐
// Smooth physics-based movement with motion effects

let gameState = 'start'; // 'start', 'playing', 'gameover'
let startScreenTime = 0;
let startButtons = [];

let game = {
  // Player with velocity-based movement
  player: { 
    x: 0, y: 0, z: 0, 
    vx: 0, vy: 0, // Velocity for smooth gliding
    mesh: null,
    weapon: 'normal', // normal, rapid, spread, laser
    weaponTimer: 0,
    shield: 0, // Bonus shield power
    maxShield: 100
  },
  
  // Game objects
  enemies: [],
  bullets: [],
  particles: [],
  powerups: [], // Collectible power-ups!
  debris: [], // Moving space debris for motion sense!
  gridLines: [], // Moving floor grid like Deserted Space!
  
  // Game state
  score: 0,
  health: 100,
  maxHealth: 100,
  wave: 1,
  kills: 0,
  time: 0,
  gameOver: false,
  
  // Spawn timers
  enemySpawnTimer: 0,
  enemySpawnRate: 3.5,
  powerupTimer: 0,
  
  // Boss battle
  boss: null,
  bossPhase: 0,
  bossSpawned: false,
  
  // Camera
  cameraShake: 0,
  
  // Motion effects
  baseSpeed: 40 // Background motion speed
};

export async function init() {
  console.log('🚀 STAR FOX NOVA 64 - Loading...');
  
  // Setup 3D camera like Deserted Space - behind and above ship
  setCameraPosition(0, 6, 25);
  setCameraTarget(0, 0, -20); // Look ahead into the distance
  setCameraFOV(75);
  
  // Create beautiful space skybox like Deserted Space
  createSpaceSkybox({
    starCount: 2000,
    starSize: 2.5,
    nebulae: true,
    nebulaColor: 0x1a0033
  });
  
  // Add dramatic lighting
  setLightDirection(-0.3, -1, -0.5);
  setLightColor(0xffffff);
  setAmbientLight(0x404060);
  
  // Space fog for depth
  setFog(0x000511, 50, 300);
  
  // Enable N64 retro effects
  enablePixelation(1);
  enableDithering(true);
  
  // Create player ship
  createPlayerShip();
  
  // Create moving debris for sense of MOTION!
  createDebrisField();
  
  // Create moving floor grid like Deserted Space!
  createFloorGrid();
  
  // Create start screen UI
  initStartScreen();
  
  console.log('✅ Star Fox Nova 64 Ready!');
  console.log('🎮 Press WASD to move, SPACE to fire');
  console.log('🎮 Controls: Arrow Keys or WASD = Move, SPACE = Fire!');
}

function initStartScreen() {
  // Create START button - positioned for easy clicking
  startButtons.push(
    createButton(centerX(200), 150, 200, 50, '▶ START MISSION', () => {
      console.log('🎯 START MISSION CLICKED! Changing gameState to playing...');
      gameState = 'playing';
      console.log('✅ gameState is now:', gameState);
      console.log('🚀 Mission started!');
    }, {
      normalColor: uiColors.success,
      hoverColor: rgba8(60, 220, 120, 255),
      pressedColor: rgba8(30, 160, 80, 255)
    })
  );
  
  // Create HOW TO PLAY button
  startButtons.push(
    createButton(centerX(200), 270, 200, 40, '? HOW TO PLAY', () => {
      console.log('📖 Controls: WASD/Arrows = Move, Space = Fire');
    }, {
      normalColor: uiColors.primary,
      hoverColor: rgba8(50, 150, 255, 255),
      pressedColor: rgba8(20, 100, 200, 255)
    })
  );
}

function createDebrisField() {
  // Create 100 moving space debris objects for motion sense
  for (let i = 0; i < 100; i++) {
    const x = (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 100;
    const z = -Math.random() * 300;
    
    const size = 0.3 + Math.random() * 0.8;
    const debris = createCube(size, 0x444466, [x, y, z]);
    
    game.debris.push({
      mesh: debris,
      x, y, z,
      speed: 30 + Math.random() * 40,
      spinX: Math.random() * 2,
      spinY: Math.random() * 2,
      rot: 0
    });
  }
  console.log('🌌 Created debris field for motion sense');
}

function createFloorGrid() {
  // Create moving floor grid lines like Deserted Space!
  const gridSize = 20;
  const gridSpacing = 20;
  const gridColor = 0x0066ff;
  
  // Create grid lines along X axis
  for (let i = -gridSize; i <= gridSize; i++) {
    const x = i * gridSpacing;
    for (let j = 0; j < 20; j++) {
      const z = -j * gridSpacing;
      const line = createCube(0.2, gridColor, [x, -15, z]);
      setScale(line, 0.3, 0.3, gridSpacing);
      
      game.gridLines.push({
        mesh: line,
        x: x,
        y: -15,
        z: z,
        type: 'x'
      });
    }
  }
  
  // Create grid lines along Z axis
  for (let j = 0; j < 20; j++) {
    const z = -j * gridSpacing;
    for (let i = -gridSize; i <= gridSize; i++) {
      const x = i * gridSpacing;
      const line = createCube(0.2, gridColor, [x, -15, z]);
      setScale(line, gridSpacing, 0.3, 0.3);
      
      game.gridLines.push({
        mesh: line,
        x: x,
        y: -15,
        z: z,
        type: 'z'
      });
    }
  }
  
  console.log('🌐 Created floor grid with', game.gridLines.length, 'lines');
}

function createPlayerShip() {
  // Create awesome Arwing-style ship with WINGS!
  const ship = createCube(2, 0x00aaff, [0, 0, 0]);
  setScale(ship, 2, 1, 5); // Long and sleek
  game.player.mesh = ship;
  
  // Add wings (visual only, stored for reference)
  const leftWing = createCube(1, 0x0088cc, [-3, 0, 0]);
  setScale(leftWing, 4, 0.3, 2);
  
  const rightWing = createCube(1, 0x0088cc, [3, 0, 0]);
  setScale(rightWing, 4, 0.3, 2);
  
  game.player.x = 0;
  game.player.y = 0;
  game.player.z = 0;
  game.player.wings = [leftWing, rightWing];
}

export function update(dt) {
  // Handle start screen
  if (gameState === 'start') {
    startScreenTime += dt;
    
    // KEYBOARD FALLBACK: Press ENTER or SPACE to start
    if (isKeyPressed('Enter') || isKeyPressed(' ') || isKeyPressed('Space')) {
      console.log('🚀 Starting mission via keyboard!');
      gameState = 'playing';
      return;
    }
    
    // Animate debris and grid even on start screen
    updateDebris(dt);
    updateFloorGrid(dt);
    animateSkybox(dt * 0.5);
    
    // Update buttons
    updateAllButtons();
    return;
  }
  
  // Handle game over
  if (gameState === 'gameover') {
    updateAllButtons();
    return;
  }
  
  // Playing game
  game.time += dt;
  
  // Update player
  updatePlayer(dt);
  
  // Update debris for MOTION sense
  updateDebris(dt);
  
  // Update floor grid for MOTION
  updateFloorGrid(dt);
  
  // Update enemies
  updateEnemies(dt);
  
  // Update bullets
  updateBullets(dt);
  
  // Update particles
  updateParticles(dt);
  
  // Spawn enemies
  spawnEnemies(dt);
  
  // Spawn and update power-ups
  spawnPowerups(dt);
  updatePowerups(dt);
  
  // Update weapon timer
  if (game.player.weaponTimer > 0) {
    game.player.weaponTimer -= dt;
    if (game.player.weaponTimer <= 0) {
      game.player.weapon = 'normal';
      console.log('⚡ Power-up expired - back to normal weapon');
    }
  }
  
  // Check collisions
  checkCollisions();
  checkPowerupCollisions();
  
  // Update camera shake
  if (game.cameraShake > 0) {
    game.cameraShake *= 0.9;
    const shakeX = (Math.random() - 0.5) * game.cameraShake;
    const shakeY = (Math.random() - 0.5) * game.cameraShake;
    setCameraPosition(shakeX, 6 + shakeY, 25);
  }
  
  // Animate skybox
  animateSkybox(dt * 0.5);
  
  // Game over check (only log once)
  if (game.health <= 0 && !game.gameOver) {
    game.gameOver = true;
    game.health = 0;
    gameState = 'gameover';
    console.log('💀 GAME OVER! Final Score:', game.score);
    initGameOverScreen();
  }
}

function updateDebris(dt) {
  // Move debris toward camera for MOTION sense
  for (let i = 0; i < game.debris.length; i++) {
    const d = game.debris[i];
    
    // Move toward camera with base speed
    d.z += (game.baseSpeed + game.player.vx * 0.5) * dt;
    d.rot += dt * 2;
    
    // Recycle when passed camera
    if (d.z > 30) {
      d.z = -300 - Math.random() * 50;
      d.x = (Math.random() - 0.5) * 200;
      d.y = (Math.random() - 0.5) * 100;
    }
    
    setPosition(d.mesh, d.x, d.y, d.z);
    setRotation(d.mesh, d.rot * d.spinX, d.rot * d.spinY, 0);
  }
}

function updateFloorGrid(dt) {
  // Move floor grid toward camera like Deserted Space!
  const gridSpeed = game.baseSpeed;
  const gridSpacing = 20;
  
  for (let i = 0; i < game.gridLines.length; i++) {
    const line = game.gridLines[i];
    
    // Move toward camera
    line.z += gridSpeed * dt;
    
    // Recycle when passed camera
    if (line.z > 20) {
      line.z -= gridSpacing * 20;
    }
    
    setPosition(line.mesh, line.x, line.y, line.z);
  }
}

function updatePlayer(dt) {
  // Smooth physics-based movement like Deserted Space
  const acceleration = 80;
  const maxSpeed = 35;
  const friction = 0.88; // Gliding friction
  
  // Apply acceleration from input
  if (isKeyDown('a') || isKeyDown('arrowleft')) {
    game.player.vx -= acceleration * dt;
  }
  if (isKeyDown('d') || isKeyDown('arrowright')) {
    game.player.vx += acceleration * dt;
  }
  if (isKeyDown('w') || isKeyDown('arrowup')) {
    game.player.vy += acceleration * dt;
  }
  if (isKeyDown('s') || isKeyDown('arrowdown')) {
    game.player.vy -= acceleration * dt;
  }
  
  // Apply friction for smooth gliding
  game.player.vx *= friction;
  game.player.vy *= friction;
  
  // Clamp velocity
  const speed = Math.sqrt(game.player.vx * game.player.vx + game.player.vy * game.player.vy);
  if (speed > maxSpeed) {
    game.player.vx = (game.player.vx / speed) * maxSpeed;
    game.player.vy = (game.player.vy / speed) * maxSpeed;
  }
  
  // Update position
  game.player.x += game.player.vx * dt;
  game.player.y += game.player.vy * dt;
  
  // Soft boundaries with bounce
  if (game.player.x < -35) {
    game.player.x = -35;
    game.player.vx *= -0.3;
  }
  if (game.player.x > 35) {
    game.player.x = 35;
    game.player.vx *= -0.3;
  }
  if (game.player.y < -18) {
    game.player.y = -18;
    game.player.vy *= -0.3;
  }
  if (game.player.y > 18) {
    game.player.y = 18;
    game.player.vy *= -0.3;
  }
  
  // Update mesh with smooth tilting based on velocity
  if (game.player.mesh) {
    setPosition(game.player.mesh, game.player.x, game.player.y, game.player.z);
    
    // Dynamic tilt based on velocity (looks way cooler!)
    const tiltX = -game.player.vy * 0.02; // Pitch with vertical movement
    const tiltZ = -game.player.vx * 0.03; // Roll with horizontal movement
    const tiltY = game.player.vx * 0.01;  // Slight yaw
    setRotation(game.player.mesh, tiltX, tiltY, tiltZ);
    
    // Update wings to follow ship
    if (game.player.wings) {
      game.player.wings.forEach((wing, i) => {
        const offset = i === 0 ? -3 : 3;
        setPosition(wing, game.player.x + offset, game.player.y, game.player.z);
        setRotation(wing, tiltX, tiltY, tiltZ);
      });
    }
  }
  
  // Shooting - Try multiple key codes for space bar!
  if (isKeyDown('space') || isKeyDown(' ') || isKeyDown('Space')) {
    let fireRate = 0.15;
    if (game.player.weapon === 'rapid') fireRate = 0.08;
    if (game.player.weapon === 'laser') fireRate = 0.25;
    
    if (!game.lastShot || game.time - game.lastShot > fireRate) {
      fireBullet();
      game.lastShot = game.time;
    }
  }
}

function fireBullet() {
  // Different weapons!
  if (game.player.weapon === 'normal') {
    // Dual lasers
    for (const offset of [-2, 2]) {
      const bullet = createCube(0.8, 0x00ff00, [
        game.player.x + offset,
        game.player.y,
        game.player.z - 3
      ]);
      setScale(bullet, 0.3, 0.3, 2.5);
      
      game.bullets.push({
        mesh: bullet,
        x: game.player.x + offset,
        y: game.player.y,
        z: game.player.z - 3,
        speed: 150
      });
    }
  } else if (game.player.weapon === 'rapid') {
    // Rapid fire - single but fast
    const bullet = createCube(0.8, 0x00ffff, [
      game.player.x,
      game.player.y,
      game.player.z - 3
    ]);
    setScale(bullet, 0.4, 0.4, 2);
    
    game.bullets.push({
      mesh: bullet,
      x: game.player.x,
      y: game.player.y,
      z: game.player.z - 3,
      speed: 180
    });
  } else if (game.player.weapon === 'spread') {
    // Spread shot - 5 bullets!
    for (let i = -2; i <= 2; i++) {
      const angle = i * 0.15;
      const bullet = createCube(0.8, 0xffaa00, [
        game.player.x + i * 1.5,
        game.player.y,
        game.player.z - 3
      ]);
      setScale(bullet, 0.35, 0.35, 2.2);
      
      game.bullets.push({
        mesh: bullet,
        x: game.player.x + i * 1.5,
        y: game.player.y,
        z: game.player.z - 3,
        speed: 140,
        vx: Math.sin(angle) * 30
      });
    }
  } else if (game.player.weapon === 'laser') {
    // HUGE laser beam
    const bullet = createCube(1.5, 0xff00ff, [
      game.player.x,
      game.player.y,
      game.player.z - 3
    ]);
    setScale(bullet, 1, 1, 10);
    
    game.bullets.push({
      mesh: bullet,
      x: game.player.x,
      y: game.player.y,
      z: game.player.z - 3,
      speed: 200,
      damage: 3 // More damage!
    });
  }
}

function spawnEnemies(dt) {
  // Don't spawn if game over
  if (game.gameOver) return;
  
  game.enemySpawnTimer += dt;
  
  // Progressive difficulty
  const spawnRate = Math.max(1.2, game.enemySpawnRate / (1 + game.wave * 0.15));
  
  if (game.enemySpawnTimer >= spawnRate) {
    game.enemySpawnTimer = 0;
    
    // Spawn further away so player can react
    const x = (Math.random() - 0.5) * 50;
    const y = (Math.random() - 0.5) * 25;
    const z = -150 - Math.random() * 50; // Much further away!
    
    // Different enemy types based on wave!
    let enemyType = 'normal';
    let color = 0xff0000;
    let size = 4;
    let health = 1;
    let speed = 35 + game.wave * 3;
    
    if (game.wave >= 3 && Math.random() < 0.3) {
      enemyType = 'fast';
      color = 0xff8800;
      size = 3;
      speed = 55 + game.wave * 4;
    } else if (game.wave >= 5 && Math.random() < 0.2) {
      enemyType = 'tank';
      color = 0xff0088;
      size = 5;
      health = 3;
      speed = 25 + game.wave * 2;
    }
    
    const enemy = createCube(3, color, [x, y, z]);
    setScale(enemy, size, size, size);
    
    game.enemies.push({
      mesh: enemy,
      x, y, z,
      speed,
      spin: Math.random() * 2,
      type: enemyType,
      health,
      maxHealth: health
    });
  }
}

function spawnPowerups(dt) {
  if (game.gameOver) return;
  
  game.powerupTimer += dt;
  
  // Spawn powerup every 15 seconds
  if (game.powerupTimer >= 15) {
    game.powerupTimer = 0;
    
    const types = ['shield', 'rapid', 'spread', 'laser'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const x = (Math.random() - 0.5) * 40;
    const y = (Math.random() - 0.5) * 20;
    const z = -120 - Math.random() * 30;
    
    let color = 0x00ffff;
    if (type === 'shield') color = 0x00ff88;
    if (type === 'rapid') color = 0x00ccff;
    if (type === 'spread') color = 0xffaa00;
    if (type === 'laser') color = 0xff00ff;
    
    const powerup = createCube(2, color, [x, y, z]);
    setScale(powerup, 2.5, 2.5, 2.5);
    
    game.powerups.push({
      mesh: powerup,
      x, y, z,
      type,
      spin: 0,
      bob: Math.random() * Math.PI * 2
    });
    
    console.log(`⭐ Power-up spawned: ${type}`);
  }
}

function updatePowerups(dt) {
  for (let i = game.powerups.length - 1; i >= 0; i--) {
    const p = game.powerups[i];
    
    // Move toward player
    p.z += 25 * dt;
    
    // Spin and bob
    p.spin += dt * 3;
    p.bob += dt * 2;
    const bobY = Math.sin(p.bob) * 2;
    
    setPosition(p.mesh, p.x, p.y + bobY, p.z);
    setRotation(p.mesh, p.spin, p.spin * 0.7, 0);
    
    // Remove if passed player
    if (p.z > 30) {
      destroyMesh(p.mesh);
      game.powerups.splice(i, 1);
    }
  }
}

function checkPowerupCollisions() {
  for (let i = game.powerups.length - 1; i >= 0; i--) {
    const p = game.powerups[i];
    
    const dx = game.player.x - p.x;
    const dy = game.player.y - p.y;
    const dz = game.player.z - p.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (dist < 5) {
      // Collected!
      createPowerupEffect(p.x, p.y, p.z, p.type);
      
      if (p.type === 'shield') {
        game.player.shield = Math.min(game.player.maxShield, game.player.shield + 50);
        console.log('🛡️ Shield power-up! Shield:', game.player.shield);
      } else {
        game.player.weapon = p.type;
        game.player.weaponTimer = 15; // 15 seconds
        console.log(`⚡ Weapon power-up: ${p.type}`);
      }
      
      destroyMesh(p.mesh);
      game.powerups.splice(i, 1);
      game.score += 50;
    }
  }
}

function createPowerupEffect(x, y, z, type) {
  let color = 0x00ffff;
  if (type === 'shield') color = 0x00ff88;
  if (type === 'rapid') color = 0x00ccff;
  if (type === 'spread') color = 0xffaa00;
  if (type === 'laser') color = 0xff00ff;
  
  // Star burst effect
  for (let i = 0; i < 20; i++) {
    const angle1 = (i / 20) * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 15;
    
    const particle = createCube(0.8, color, [x, y, z]);
    
    game.particles.push({
      mesh: particle,
      x, y, z,
      vx: Math.cos(angle1) * Math.cos(angle2) * speed,
      vy: Math.sin(angle2) * speed,
      vz: Math.sin(angle1) * Math.cos(angle2) * speed,
      life: 1.2,
      maxLife: 1.2
    });
  }
}

function updateEnemies(dt) {
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const enemy = game.enemies[i];
    
    // Move toward player (coming from behind camera)
    enemy.z += enemy.speed * dt;
    enemy.spin += dt * enemy.spin;
    
    // Update mesh
    setPosition(enemy.mesh, enemy.x, enemy.y, enemy.z);
    setRotation(enemy.mesh, 0, enemy.spin, 0);
    
    // Remove if passed player
    if (enemy.z > 30) {
      if (!game.gameOver) {
        // Damage shield first, then health
        if (game.player.shield > 0) {
          game.player.shield = Math.max(0, game.player.shield - 20);
          console.log('🛡️ Shield absorbed hit! Shield:', game.player.shield);
        } else {
          game.health -= 15;
          console.log('💥 Enemy got through! Health:', game.health);
        }
        game.cameraShake = 1.0;
      }
      destroyMesh(enemy.mesh);
      game.enemies.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    
    // Travel away from camera (toward enemies)
    bullet.z -= bullet.speed * dt;
    
    // Handle spread shot sideways velocity
    if (bullet.vx) {
      bullet.x += bullet.vx * dt;
    }
    
    setPosition(bullet.mesh, bullet.x, bullet.y, bullet.z);
    
    // Remove if too far
    if (bullet.z < -200) {
      destroyMesh(bullet.mesh);
      game.bullets.splice(i, 1);
    }
  }
}

function checkCollisions() {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    let bulletHit = false;
    
    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const enemy = game.enemies[j];
      
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dz = bullet.z - enemy.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (dist < 5) {
        // HIT!
        const damage = bullet.damage || 1;
        enemy.health -= damage;
        
        // Create hit effect
        createHitEffect(enemy.x, enemy.y, enemy.z);
        game.cameraShake = 0.3;
        
        // Remove enemy if dead
        if (enemy.health <= 0) {
          createExplosion(enemy.x, enemy.y, enemy.z);
          destroyMesh(enemy.mesh);
          game.enemies.splice(j, 1);
          
          // Update score based on enemy type
          let points = 100;
          if (enemy.type === 'fast') points = 150;
          if (enemy.type === 'tank') points = 200;
          game.score += points;
          game.kills++;
          
          // Wave progression
          if (game.kills >= game.wave * 10) {
            game.wave++;
            console.log(`🌊 Wave ${game.wave}! Get ready for tougher enemies!`);
          }
        }
        
        // Remove bullet (unless it's a laser which can hit multiple)
        if (bullet.damage !== 3) {
          bulletHit = true;
        }
        
        break;
      }
    }
    
    if (bulletHit) {
      destroyMesh(bullet.mesh);
      game.bullets.splice(i, 1);
    }
  }
}

function createHitEffect(x, y, z) {
  // Small flash on hit
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const speed = 10 + Math.random() * 5;
    
    const particle = createCube(0.5, 0xffff00, [x, y, z]);
    
    game.particles.push({
      mesh: particle,
      x, y, z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 10,
      life: 0.3,
      maxLife: 0.3
    });
  }
}

function createExplosion(x, y, z) {
  const colors = [0xff6600, 0xff3300, 0xffaa00];
  
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const speed = 15 + Math.random() * 15;
    
    const particle = createCube(0.8, colors[i % 3], [x, y, z]);
    
    game.particles.push({
      mesh: particle,
      x, y, z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 20,
      life: 0.8,
      maxLife: 0.8
    });
  }
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    
    const scale = p.life / p.maxLife;
    setPosition(p.mesh, p.x, p.y, p.z);
    setScale(p.mesh, scale, scale, scale);
    
    if (p.life <= 0) {
      destroyMesh(p.mesh);
      game.particles.splice(i, 1);
    }
  }
}

function drawSpeedLines() {
  // Draw motion speed lines like Deserted Space!
  const numLines = 30;
  const speed = Math.abs(game.player.vx) + Math.abs(game.player.vy) + game.baseSpeed;
  const lineAlpha = Math.min(200, speed * 3);
  
  for (let i = 0; i < numLines; i++) {
    const x = Math.random() * 640;
    const y = Math.random() * 360;
    const length = 20 + speed * 0.5;
    
    const angle = Math.atan2(
      180 - y + game.player.vy * 10,
      320 - x + game.player.vx * 10
    );
    
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    
    line(x, y, x2, y2, rgba8(100, 150, 255, lineAlpha));
  }
}

export function draw() {
  // Draw SPEED LINES for motion sense!
  drawSpeedLines();
  
  // Handle start screen
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // Handle game over
  if (gameState === 'gameover') {
    drawGameOverScreen();
    return;
  }
  
  // Draw 2D HUD overlay (during gameplay)
  
  // HUD panel (BIGGER AND MORE VISIBLE)
  rect(10, 10, 300, 130, rgba8(0, 0, 0, 200), true);
  rect(10, 10, 300, 130, rgba8(0, 255, 255, 200), false);
  
  // Health bar
  print('HEALTH', 20, 22, rgba8(0, 255, 255, 255), 1);
  const healthPct = game.health / game.maxHealth;
  const healthWidth = Math.floor(healthPct * 220);
  const healthColor = healthPct > 0.5 ? rgba8(0, 255, 0, 255) :
                      healthPct > 0.25 ? rgba8(255, 255, 0, 255) :
                      rgba8(255, 0, 0, 255);
  
  rect(20, 40, 220, 18, rgba8(40, 40, 40, 255), true);
  if (healthWidth > 0) {
    rect(20, 40, healthWidth, 18, healthColor, true);
  }
  rect(20, 40, 220, 18, rgba8(255, 255, 255, 200), false);
  
  // Shield bar (if player has shield)
  if (game.player.shield > 0) {
    print('SHIELD', 20, 60, rgba8(0, 255, 200, 255), 1);
    const shieldPct = game.player.shield / game.player.maxShield;
    const shieldWidth = Math.floor(shieldPct * 220);
    
    rect(20, 78, 220, 12, rgba8(40, 40, 40, 255), true);
    if (shieldWidth > 0) {
      rect(20, 78, shieldWidth, 12, rgba8(0, 255, 200, 255), true);
    }
    rect(20, 78, 220, 12, rgba8(255, 255, 255, 200), false);
  }
  
  // Score
  const scoreStr = game.score.toString().padStart(6, '0');
  print('SCORE: ' + scoreStr, 20, 95, rgba8(255, 255, 0, 255), 1);
  
  // Wave
  print('WAVE: ' + game.wave, 20, 110, rgba8(255, 180, 0, 255), 1);
  
  // Weapon indicator
  if (game.player.weapon !== 'normal') {
    const timeLeft = Math.ceil(game.player.weaponTimer);
    let weaponName = game.player.weapon.toUpperCase();
    let weaponColor = rgba8(255, 255, 255, 255);
    if (game.player.weapon === 'rapid') weaponColor = rgba8(0, 200, 255, 255);
    if (game.player.weapon === 'spread') weaponColor = rgba8(255, 170, 0, 255);
    if (game.player.weapon === 'laser') weaponColor = rgba8(255, 0, 255, 255);
    
    rect(245, 12, 180, 30, rgba8(0, 0, 0, 200), true);
    rect(245, 12, 180, 30, weaponColor, false);
    print(`⚡${weaponName} ${timeLeft}s`, 255, 20, weaponColor, 1);
  }
  
  // BIGGER BRIGHTER CROSSHAIR
  const cx = 320, cy = 180;
  line(cx - 20, cy, cx + 20, cy, rgba8(0, 255, 0, 255));
  line(cx, cy - 20, cx, cy + 20, rgba8(0, 255, 0, 255));
  circle(cx, cy, 25, rgba8(0, 255, 0, 200), false);
  circle(cx, cy, 5, rgba8(255, 255, 0, 255), true); // Center dot
  
  // BIGGER RADAR
  const rx = 520, ry = 10, rs = 100;
  rect(rx, ry, rs, rs, rgba8(0, 0, 0, 200), true);
  rect(rx, ry, rs, rs, rgba8(0, 255, 0, 200), false);
  
  // Radar grid
  line(rx + rs/2, ry, rx + rs/2, ry + rs, rgba8(0, 120, 0, 150));
  line(rx, ry + rs/2, rx + rs, ry + rs/2, rgba8(0, 120, 0, 150));
  
  // Player dot - BIGGER
  rect(rx + rs/2 - 2, ry + rs/2 - 2, 5, 5, rgba8(0, 255, 255, 255), true);
  
  // Enemy dots
  game.enemies.forEach(e => {
    const relX = (e.x / 80) * (rs / 2);
    const relZ = (e.z / 150) * (rs / 2);
    const dx = Math.floor(rx + rs/2 + relX);
    const dy = Math.floor(ry + rs/2 - relZ);
    
    if (dx >= rx && dx <= rx + rs && dy >= ry && dy <= ry + rs) {
      rect(dx - 2, dy - 2, 5, 5, rgba8(255, 0, 0, 255), true);
      // Pulse effect
      const pulse = Math.sin(game.time * 5) * 0.5 + 0.5;
      circle(dx, dy, 8, rgba8(255, 0, 0, Math.floor(pulse * 150)), false);
    }
  });
  
  print('RADAR', rx + 25, ry + rs + 5, rgba8(0, 255, 0, 255), 1);
}

function drawStartScreen() {
  // Gradient background overlay
  drawGradientRect(0, 0, 640, 360,
    rgba8(10, 10, 30, 200),
    rgba8(30, 10, 50, 220),
    true
  );
  
  // Animated title
  const bounce = Math.sin(startScreenTime * 2) * 10;
  setFont('huge');
  setTextAlign('center');
  drawTextShadow('STAR FOX', 320, 50 + bounce, uiColors.primary, rgba8(0, 0, 0, 255), 4, 1);
  
  setFont('large');
  const pulse = Math.sin(startScreenTime * 3) * 0.3 + 0.7;
  const pulseColor = rgba8(
    Math.floor(255 * pulse),
    Math.floor(180 * pulse),
    50,
    255
  );
  drawTextOutline('NOVA 64', 320, 110, pulseColor, rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(400), 330, 400, 180, {
    bgColor: rgba8(0, 0, 0, 180),
    borderColor: uiColors.primary,
    borderWidth: 2,
    shadow: true
  });
  drawPanel(panel);
  
  // Mission briefing
  setFont('normal');
  setTextAlign('center');
  drawText('MISSION BRIEFING', 320, 160, uiColors.warning, 1);
  
  setFont('small');
  drawText('Hostile forces detected in Sector 7', 320, 185, uiColors.light, 1);
  drawText('Eliminate all enemy fighters', 320, 200, uiColors.light, 1);
  drawText('', 320, 215, uiColors.light, 1);
  
  setFont('tiny');
  drawText('CONTROLS: WASD/Arrows = Move  |  Space = Fire', 320, 240, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing "press start" indicator
  const alpha = Math.floor((Math.sin(startScreenTime * 4) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('▶ PRESS START TO BEGIN ◀', 320, 280, rgba8(0, 255, 100, alpha), 1);
}

function drawGameOverScreen() {
  // Dark overlay
  rect(0, 0, 640, 360, rgba8(0, 0, 0, 200), true);
  
  // Flashing GAME OVER
  const flash = Math.floor(game.time * 3) % 2 === 0;
  setFont('huge');
  setTextAlign('center');
  const gameOverColor = flash ? rgba8(255, 50, 50, 255) : rgba8(200, 0, 0, 255);
  drawTextShadow('GAME OVER', 320, 80, gameOverColor, rgba8(0, 0, 0, 255), 4, 1);
  
  // Stats panel
  const statsPanel = createPanel(centerX(400), centerY(200), 400, 200, {
    bgColor: rgba8(20, 0, 0, 200),
    borderColor: uiColors.danger,
    borderWidth: 3,
    shadow: true,
    title: 'MISSION FAILED',
    titleBgColor: uiColors.danger
  });
  drawPanel(statsPanel);
  
  // Stats
  setFont('large');
  setTextAlign('center');
  drawText('Final Score: ' + game.score, 320, 200, uiColors.warning, 1);
  
  setFont('normal');
  drawText('Wave Reached: ' + game.wave, 320, 235, uiColors.secondary, 1);
  drawText('Enemies Destroyed: ' + game.kills, 320, 255, uiColors.success, 1);
  
  // Draw buttons
  drawAllButtons();
}

function initGameOverScreen() {
  clearButtons();
  
  // Restart button
  startButtons.push(
    createButton(centerX(180), 300, 180, 45, '↻ TRY AGAIN', () => {
      restartGame();
    }, {
      normalColor: uiColors.success,
      hoverColor: rgba8(60, 220, 120, 255),
      pressedColor: rgba8(30, 160, 80, 255)
    })
  );
  
  // Main menu button
  startButtons.push(
    createButton(centerX(180), 360, 180, 40, '← MAIN MENU', () => {
      gameState = 'start';
      startScreenTime = 0;
      restartGame();
      initStartScreen();
    }, {
      normalColor: uiColors.primary,
      hoverColor: rgba8(50, 150, 255, 255),
      pressedColor: rgba8(20, 100, 200, 255)
    })
  );
}

function restartGame() {
  // Reset game
  game.enemies.forEach(e => destroyMesh(e.mesh));
  game.bullets.forEach(b => destroyMesh(b.mesh));
  game.particles.forEach(p => destroyMesh(p.mesh));
  
  game.enemies = [];
  game.bullets = [];
  game.particles = [];
  game.score = 0;
  game.health = 100;
  game.wave = 1;
  game.kills = 0;
  game.enemySpawnTimer = 0;
  game.gameOver = false;
  game.player.vx = 0;
  game.player.vy = 0;
  game.player.x = 0;
  game.player.y = 0;
  
  gameState = 'playing';
  
  console.log('🔄 Game restarted!');
}
