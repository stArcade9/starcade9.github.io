// SIMPLE STAR FOX NOVA 64 - Stable and Working
// Like Deserted Space quality, no crashes

let gameData = {
  arwing: null,
  enemies: [],
  projectiles: [],
  particles: [],
  stars: [],
  score: 0,
  health: 100,
  waveNumber: 1,
  time: 0,
  camera: { shake: 0 }
};

let gameSettings = {
  graphics: {
    enableParticles: true,
    starDensity: 200
  },
  physics: {
    acceleration: 15,
    maxSpeed: 25,
    friction: 0.88
  },
  gameplay: {
    difficulty: 1.0,
    enemySpawnRate: 2.0
  }
};

// Game state management
let gameState = {
  currentScreen: 'start',
  transition: false
};

export async function init() {
  console.log('🚀 STAR FOX NOVA 64 - Simple and Stable');
  
  // Clear everything
  cls();
  
  // Simple, effective 3D setup
  setCameraPosition(0, 5, 15);
  setCameraTarget(0, 0, 0);
  setCameraFOV(75);
  
  // Clean lighting
  setLightDirection(0, -1, -0.5);
  setLightColor(0xffffff);
  setAmbientLight(0x404040);
  
  // Create starfield
  createStarfield();
  
  return initScreens({
    start: createStartScreen(),
    game: createGameScreen(),
    pause: createPauseScreen(),
    gameOver: createGameOverScreen()
  });
}

function createStarfield() {
  console.log('🌌 Creating stable starfield...');
  
  gameData.stars = [];
  
  for (let i = 0; i < 200; i++) {
    const star = createCube(0.5, 0xffffff, [
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 100, 
      -100 - Math.random() * 300
    ]);
    
    gameData.stars.push({
      mesh: star,
      speed: 20 + Math.random() * 30,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 100,
      z: -100 - Math.random() * 300
    });
  }
  
  console.log('✅ Starfield created with', gameData.stars.length, 'stars');
}

function updateStarfield(dt) {
  for (let star of gameData.stars) {
    star.z += star.speed * dt;
    setPosition(star.mesh, star.x, star.y, star.z);
    
    if (star.z > 30) {
      star.z = -300 - Math.random() * 100;
      star.x = (Math.random() - 0.5) * 200;
      star.y = (Math.random() - 0.5) * 100;
    }
  }
}

// Screen creation functions
function createStartScreen() {
  return {
    enter() {
      console.log('Start screen entered');
    },
    
    update(dt) {
      updateStarfield(dt);
      
      if (isKeyPressed('space') || isKeyPressed('enter')) {
        switchScreen('game');
      }
    },
    
    draw() {
      // Title text
      color(0xffffff);
      text('STAR FOX NOVA 64', 100, 100, 32);
      text('PRESS SPACE TO START', 120, 200, 16);
      text('WASD: Move | SPACE: Fire', 120, 250, 12);
    }
  };
}

function createGameScreen() {
  return {
    enter() {
      console.log('🎮 Starting game...');
      resetGame();
      createArwing();
    },
    
    update(dt) {
      gameData.time += dt;
      
      updateStarfield(dt);
      updateArwing(dt);
      updateEnemies(dt);
      updateProjectiles(dt);
      updateParticles(dt);
      
      spawnEnemies(dt);
      
      if (gameData.health <= 0) {
        switchScreen('gameOver');
      }
      
      if (isKeyPressed('escape')) {
        switchScreen('pause');
      }
    },
    
    draw() {
      drawHUD();
    }
  };
}

function createPauseScreen() {
  return {
    enter() {},
    update(dt) {
      if (isKeyPressed('escape') || isKeyPressed('space')) {
        switchScreen('game');
      }
    },
    draw() {
      color(0xffffff);
      text('PAUSED', 200, 150, 32);
      text('PRESS ESC TO RESUME', 150, 200, 16);
    }
  };
}

function createGameOverScreen() {
  return {
    enter() {},
    update(dt) {
      updateStarfield(dt);
      
      if (isKeyPressed('space') || isKeyPressed('enter')) {
        switchScreen('start');
      }
    },
    draw() {
      color(0xff4444);
      text('GAME OVER', 150, 150, 32);
      color(0xffffff);
      text('Score: ' + gameData.score, 180, 200, 16);
      text('PRESS SPACE TO RESTART', 130, 250, 16);
    }
  };
}

function resetGame() {
  gameData.enemies = [];
  gameData.projectiles = [];
  gameData.particles = [];
  gameData.score = 0;
  gameData.health = 100;
  gameData.waveNumber = 1;
  gameData.time = 0;
}

function createArwing() {
  const arwing = createCube(2, 0x0099ff, [0, 0, 0]);
  setScale(arwing, 3, 1.5, 4);
  
  gameData.arwing = {
    mesh: arwing,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    speed: 30,
    lastShot: 0
  };
}

function updateArwing(dt) {
  if (!gameData.arwing) return;
  
  const arwing = gameData.arwing;
  const speed = 50;
  
  // Movement
  if (isKeyDown('a') || isKeyDown('arrowleft')) {
    arwing.position.x -= speed * dt;
  }
  if (isKeyDown('d') || isKeyDown('arrowright')) {
    arwing.position.x += speed * dt;
  }
  if (isKeyDown('w') || isKeyDown('arrowup')) {
    arwing.position.y += speed * dt;
  }
  if (isKeyDown('s') || isKeyDown('arrowdown')) {
    arwing.position.y -= speed * dt;
  }
  
  // Boundaries
  arwing.position.x = Math.max(-40, Math.min(40, arwing.position.x));
  arwing.position.y = Math.max(-20, Math.min(20, arwing.position.y));
  
  // Update mesh position
  setPosition(arwing.mesh, arwing.position.x, arwing.position.y, arwing.position.z);
  
  // Shooting
  if (isKeyDown('space') && gameData.time - arwing.lastShot > 0.1) {
    fireProjectile();
    arwing.lastShot = gameData.time;
  }
}

function fireProjectile() {
  const arwing = gameData.arwing;
  const projectile = createCube(0.5, 0xffff00, [
    arwing.position.x,
    arwing.position.y,
    arwing.position.z + 2
  ]);
  
  gameData.projectiles.push({
    mesh: projectile,
    position: {
      x: arwing.position.x,
      y: arwing.position.y,
      z: arwing.position.z + 2
    },
    velocity: { x: 0, y: 0, z: 100 }
  });
}

function updateProjectiles(dt) {
  for (let i = gameData.projectiles.length - 1; i >= 0; i--) {
    const proj = gameData.projectiles[i];
    
    proj.position.z += proj.velocity.z * dt;
    setPosition(proj.mesh, proj.position.x, proj.position.y, proj.position.z);
    
    if (proj.position.z > 100) {
      destroyMesh(proj.mesh);
      gameData.projectiles.splice(i, 1);
    }
  }
}

function spawnEnemies(dt) {
  if (Math.random() < gameSettings.gameplay.enemySpawnRate * dt) {
    spawnEnemy();
  }
}

function spawnEnemy() {
  const x = (Math.random() - 0.5) * 80;
  const y = (Math.random() - 0.5) * 40;
  const z = 100 + Math.random() * 50;
  
  const enemy = createCube(1.5, 0xff3030, [x, y, z]);
  setScale(enemy, 2, 1, 3);
  
  gameData.enemies.push({
    mesh: enemy,
    position: { x, y, z },
    velocity: { x: 0, y: 0, z: -30 },
    health: 1
  });
}

function updateEnemies(dt) {
  for (let i = gameData.enemies.length - 1; i >= 0; i--) {
    const enemy = gameData.enemies[i];
    
    enemy.position.z += enemy.velocity.z * dt;
    setPosition(enemy.mesh, enemy.position.x, enemy.position.y, enemy.position.z);
    
    if (enemy.position.z < -30 || enemy.health <= 0) {
      if (enemy.position.z < -30) {
        gameData.health -= 10;
      }
      destroyMesh(enemy.mesh);
      gameData.enemies.splice(i, 1);
    }
  }
  
  // Check collisions
  checkCollisions();
}

function checkCollisions() {
  for (let i = gameData.projectiles.length - 1; i >= 0; i--) {
    const proj = gameData.projectiles[i];
    
    for (let j = gameData.enemies.length - 1; j >= 0; j--) {
      const enemy = gameData.enemies[j];
      
      const dx = proj.position.x - enemy.position.x;
      const dy = proj.position.y - enemy.position.y;
      const dz = proj.position.z - enemy.position.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (distance < 4) {
        // Hit!
        createExplosion(enemy.position.x, enemy.position.y, enemy.position.z);
        
        destroyMesh(proj.mesh);
        gameData.projectiles.splice(i, 1);
        
        destroyMesh(enemy.mesh);
        gameData.enemies.splice(j, 1);
        
        gameData.score += 100;
        break;
      }
    }
  }
}

function createExplosion(x, y, z) {
  for (let i = 0; i < 8; i++) {
    const particle = createCube(0.5, 0xff6600, [x, y, z]);
    
    gameData.particles.push({
      mesh: particle,
      position: { x, y, z },
      velocity: {
        x: (Math.random() - 0.5) * 40,
        y: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 40
      },
      life: 1.0
    });
  }
}

function updateParticles(dt) {
  for (let i = gameData.particles.length - 1; i >= 0; i--) {
    const p = gameData.particles[i];
    
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    p.position.z += p.velocity.z * dt;
    
    setPosition(p.mesh, p.position.x, p.position.y, p.position.z);
    
    p.life -= dt;
    if (p.life <= 0) {
      destroyMesh(p.mesh);
      gameData.particles.splice(i, 1);
    }
  }
}

function drawHUD() {
  color(0xffffff);
  text('Health: ' + gameData.health, 10, 10, 16);
  text('Score: ' + gameData.score, 10, 30, 16);
  text('Wave: ' + gameData.waveNumber, 10, 50, 16);
  
  color(0x00ff00);
  text('Enemies: ' + gameData.enemies.length, 10, 400, 12);
}

export function update(dt) {
  // This will be handled by the screen manager
}

export function draw() {
  // This will be handled by the screen manager
}