// ⭐ SPACE HARRIER NOVA 64 - Exceptional 2.5D/3D Rail Shooter ⭐

let gameState = 'start';
let gameTime = 0;
let inputLockout = 0.6; // seconds to wait before accepting 'start' input


// Colors
const PALETTE = {
  sky: 0xaa22ff,
  ground1: 0x22cc55,
  ground2: 0x118833,
  playerBody: 0xff3333,
  playerHead: 0xffccaa,
  gun: 0xcccccc,
  bullet: 0xffff00,
  enemy: 0xaa22ff,
  enemyEye: 0x00ff00,
  enemyShot: 0xff00ff,
  treeTrunk: 0x8B4513,
  treeLeaves: 0x11aa55,
  pillar: 0xffaa00,
  explosion: 0xff5500
};

let game = {
  player: {
    x: 0, y: 0, z: -5,
    health: 100,
    weaponTimer: 0,
    meshes: {}, 
    animPhase: 0,
    bobPhase: 0
  },
  speed: 45,
  distance: 0,
  score: 0,
  
  gridPlanes: [],
  scenery: [],
  enemies: [],
  bullets: [],
  enemyBullets: [],
  particles: [],
  enemySpawnTimer: 0
};

export async function init() {
  console.log('🚀 SPACE HARRIER NOVA 64 - Loading...');

  setCameraPosition(0, 5, 12);
  setCameraTarget(0, 3, -50);
  setCameraFOV(70);

  // Vibrant alien sky and effects
  setAmbientLight(0xffffff, 1.0);
  setLightDirection(-0.5, -1, -0.5);
  setLightColor(0xfff0dd);
  setFog(PALETTE.sky, 30, 150);

  // Retro presentation with modern shader touch
  if (typeof enablePixelation === 'function') enablePixelation(1);
  if (typeof enableDithering === 'function') enableDithering(true);
  enableBloom(1.2, 0.5, 0.1); // Alien sky & bullet glow
  enableFXAA();
  enableVignette(1.3, 0.9);

  createCheckeredFloor();
  createPlayer();

  for(let i=0; i<40; i++) {
    spawnScenery(true);
  }

  initStartScreen();
}

function createCheckeredFloor() {
  const cols = 22;
  const rows = 35;
  const size = 5;
  const startX = -(cols * size) / 2;
  const startZ = 20;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isAlt = (r + c) % 2 === 0;
      const color = isAlt ? PALETTE.ground1 : PALETTE.ground2;
      const x = startX + c * size + (size/2);
      const z = startZ - r * size - (size/2);
      const y = -2;

      const plane = createPlane(size, size, color, [x, y, z]);
      rotateMesh(plane, -Math.PI/2, 0, 0);

      game.gridPlanes.push({
        mesh: plane, x: x, y: y, z: z, size: size
      });
    }
  }
}

function createPlayer() {
  const p = game.player;
  const bx = p.x, by = p.y, bz = p.z;

  p.meshes.body = createCube(1.2, PALETTE.playerBody, [bx, by, bz]);
  setScale(p.meshes.body, 1.0, 1.3, 0.8);

  p.meshes.head = createSphere(0.6, PALETTE.playerHead, [bx, by + 1.2, bz], 8);
  
  p.meshes.hair = createCube(0.7, 0x5a2d0c, [bx, by + 1.5, bz + 0.1]);
  setScale(p.meshes.hair, 1.1, 0.4, 1.1);
  
  p.meshes.jetpack = createCube(0.8, 0x888888, [bx, by + 0.2, bz + 0.6]);
  setScale(p.meshes.jetpack, 1.2, 1.5, 0.5);

  p.meshes.gun = createCube(0.5, PALETTE.gun, [bx + 0.8, by, bz - 1.5]);
  setScale(p.meshes.gun, 0.6, 0.6, 3.5);

  p.meshes.armL = createCube(0.4, PALETTE.playerBody, [bx - 0.8, by + 0.2, bz]);
  setScale(p.meshes.armL, 0.7, 1.8, 0.7);

  p.meshes.armR = createCube(0.4, PALETTE.playerBody, [bx + 0.8, by + 0.2, bz]);
  setScale(p.meshes.armR, 0.7, 1.8, 0.7);

  p.meshes.legL = createCube(0.4, PALETTE.playerBody, [bx - 0.4, by - 1.0, bz]);
  setScale(p.meshes.legL, 0.8, 2.0, 0.8);

  p.meshes.legR = createCube(0.4, PALETTE.playerBody, [bx + 0.4, by - 1.0, bz]);
  setScale(p.meshes.legR, 0.8, 2.0, 0.8);
  
  p.meshes.flameL = createCube(0.3, 0xffaa00, [bx - 0.3, by - 0.6, bz + 0.6]);
  p.meshes.flameR = createCube(0.3, 0xffaa00, [bx + 0.3, by - 0.6, bz + 0.6]);
}

function spawnScenery(randomZ = false) {
  const isLeft = Math.random() > 0.5;
  const x = (isLeft ? -1 : 1) * (15 + Math.random() * 25);
  const z = randomZ ? (10 - Math.random() * 120) : -120;
  const y = -2;
  
  const type = Math.random() > 0.5 ? 'tree' : 'pillar';
  let parts = [];

  if (type === 'tree') {
    const height = 3 + Math.random() * 6;
    const trunk = createCube(1, PALETTE.treeTrunk, [x, y + height/2, z]);
    setScale(trunk, 1, height, 1);
    
    // Exceptional foliage look
    const top = createSphere(2.5 + Math.random(), PALETTE.treeLeaves, [x, y + height + 1, z], 6);
    parts.push({mesh: trunk, oy: y + height/2});
    parts.push({mesh: top, oy: y + height + 1});
  } else {
    // Exceptional floating glowing rings/pillars
    const pHeight = 6 + Math.random() * 8;
    // We try to pass a nice high-end color and maybe emissive
    const pillarOptions = {
        material: 'holographic',
        color: PALETTE.pillar,
        emissive: 0xaa2200,
        opacity: 0.8,
        transparent: true
    };
    // Use createAdvancedCube for holographic/emissive material support
    const pillar = createAdvancedCube(1, pillarOptions, [x, y + pHeight/2, z]);

    setScale(pillar, 2, pHeight, 2);
    parts.push({mesh: pillar, oy: y + pHeight/2});
  }

  game.scenery.push({
    parts: parts,
    x: x,
    z: z
  });
}

function spawnEnemy() {
  const x = (Math.random() - 0.5) * 40;
  const z = -120;
  const y = 3 + Math.random() * 15;

  const core = createSphere(2.5, PALETTE.enemy, [x, y, z], 8);
  const eye = createSphere(1.2, PALETTE.enemyEye, [x, y, z + 2.0], 8);
  
  const wingL = createCube(1.5, 0x5500aa, [x - 3, y, z]);
  setScale(wingL, 3, 0.2, 1);
  const wingR = createCube(1.5, 0x5500aa, [x + 3, y, z]);
  setScale(wingR, 3, 0.2, 1);

  game.enemies.push({
    parts: [
      {mesh: core, ox: 0, oy: 0, oz: 0},
      {mesh: eye, ox: 0, oy: 0, oz: 2.0},
      {mesh: wingL, ox: -3, oy: 0, oz: 0},
      {mesh: wingR, ox: 3, oy: 0, oz: 0}
    ],
    x: x, y: y, z: z,
    health: 30,
    vx: (Math.random() - 0.5) * 20,
    vy: (Math.random() - 0.5) * 10,
    vz: 30 + Math.random() * 30, // Faster approach
    timer: 0
  });
}

function firePlayerBullet() {
  const p = game.player;
  const x = p.x + 0.8; 
  const y = p.y;
  const z = p.z - 2;

  const bullet = createCube(0.8, PALETTE.bullet, [x, y, z]);
  setScale(bullet, 0.5, 0.5, 6.0);

  game.bullets.push({
    mesh: bullet, x: x, y: y, z: z,
    vz: -180, life: 2.0
  });
}

function fireEnemyBullet(ex, ey, ez) {
  const bullet = createSphere(1.2, PALETTE.enemyShot, [ex, ey, ez], 6);
  
  const p = game.player;
  const dx = p.x - ex, dy = p.y - ey, dz = p.z - ez;
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
  const speed = 70 + game.score * 0.001; 
  
  game.enemyBullets.push({
    mesh: bullet, x: ex, y: ey, z: ez,
    vx: (dx/dist) * speed, vy: (dy/dist) * speed, vz: (dz/dist) * speed,
    life: 3.0
  });
}

function createExplosion(x, y, z, color) {
  for(let i=0; i<15; i++) {
    const p = createCube(0.8, color, [x, y, z]);
    const speed = 15 + Math.random() * 25;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    
    game.particles.push({
      mesh: p, x: x, y: y, z: z,
      vx: Math.cos(angle1) * Math.sin(angle2) * speed,
      vy: Math.sin(angle1) * speed,
      vz: Math.cos(angle1) * Math.cos(angle2) * speed,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1.0
    });
  }
}

export function update(dt) {
  gameTime += dt;

  if (gameState === 'start' || gameState === 'gameover') {
    if (inputLockout > 0) inputLockout -= dt;
    updateAllButtons();
    updateGrid(dt * 0.4);

    // Animate player idly
    updatePlayer(dt, true);

    if (inputLockout <= 0 && isKeyPressed('Space')) startGame();
    return;
  }

  game.distance += game.speed * dt;
  game.score += dt * 25;
  game.speed = Math.min(100, 45 + game.score * 0.002);

  updatePlayer(dt, false);
  updateGrid(dt);
  updateScenery(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateEnemyBullets(dt);
  updateParticles(dt);
}

function startGame() {
  if (gameState === 'playing') return;
  inputLockout = 0.3; // brief lockout after start too
  gameState = 'playing';
  game.score = 0;
  game.player.health = 100;
  game.speed = 45;
  
  game.enemies.forEach(e => e.parts.forEach(p => destroyMesh(p.mesh)));
  game.enemyBullets.forEach(b => destroyMesh(b.mesh));
  game.bullets.forEach(b => destroyMesh(b.mesh));
  
  game.enemies = [];
  game.enemyBullets = [];
  game.bullets = [];
  clearButtons();
}

function updatePlayer(dt, isIdle) {
  const p = game.player;
  if(!isIdle && p.health <= 0) {
    createExplosion(p.x, p.y, p.z, PALETTE.playerBody);
    gameState = 'gameover';
    initGameOverScreen();
    return;
  }

  let dx = 0; let dy = 0;
  if (!isIdle) {
    if (key('ArrowLeft') || key('a')) dx = -1;
    if (key('ArrowRight') || key('d')) dx = 1;
    if (key('ArrowUp') || key('w')) dy = 1;
    if (key('ArrowDown') || key('s')) dy = -1;
  }

  const moveSpeed = 45;
  p.x += dx * moveSpeed * dt;
  p.y += dy * moveSpeed * dt;

  if (p.x < -22) p.x = -22;
  if (p.x > 22) p.x = 22;
  if (p.y < 0) p.y = 0;
  if (p.y > 18) p.y = 18;

  const isGrounded = p.y < 0.5;
  p.animPhase += dt * (isGrounded ? 18 : 6); 
  p.bobPhase += dt * moveSpeed * 0.25;
  
  const bY = p.y + (isGrounded && dx !== 0 ? Math.abs(Math.sin(p.bobPhase)) * 0.8 : 0);

  setPosition(p.meshes.body, p.x, bY, p.z);
  setPosition(p.meshes.head, p.x, bY + 1.2, p.z);
  setPosition(p.meshes.gun, p.x + 0.8, bY - 0.2, p.z - 1.5);
  
  if (isGrounded && (dx !== 0 || isIdle)) {
    // idle running in place effectively
    const legSwing = Math.sin(p.animPhase) * 1.5;
    setPosition(p.meshes.legL, p.x - 0.4, bY - 1.0, p.z + legSwing);
    setPosition(p.meshes.legR, p.x + 0.4, bY - 1.0, p.z - legSwing);
  } else {
    setPosition(p.meshes.legL, p.x - 0.4, bY - 1.0, p.z + 0.5);
    setPosition(p.meshes.legR, p.x + 0.4, bY - 1.0, p.z + 0.5);
  }

  p.weaponTimer -= dt;
  if (!isIdle && key('Space') && p.weaponTimer <= 0) {
    firePlayerBullet();
    p.weaponTimer = 0.12; 
  }
}

function updateGrid(dt) {
  const totalLength = 35 * 5; 
  game.gridPlanes.forEach(g => {
    g.z += game.speed * dt;
    if (g.z > 20) {
      g.z -= totalLength;
    }
    setPosition(g.mesh, g.x, g.y, g.z);
  });
}

function updateScenery(dt) {
  game.scenery.forEach(s => {
    s.z += game.speed * dt;
    if (s.z > 20) {
      s.z -= 140 + Math.random() * 60;
      s.x = (Math.random() > 0.5 ? -1 : 1) * (15 + Math.random() * 30);
    }
    s.parts.forEach(p => {
      setPosition(p.mesh, s.x, p.oy, s.z);
    });
  });
}

function updateEnemies(dt) {
  game.enemySpawnTimer -= dt;
  if (game.enemySpawnTimer <= 0) {
    if (Math.random() > 0.3) spawnEnemy();
    game.enemySpawnTimer = 1.0 + Math.random() * 1.5;
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    e.timer += dt;
    
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.z += e.vz * dt;
    
    if(e.x < -30 || e.x > 30) e.vx *= -1;
    if(e.y < 2 || e.y > 20) e.vy *= -1;

    const bob = Math.sin(e.timer * 4) * 2;

    e.parts.forEach(p => {
      setPosition(p.mesh, e.x + p.ox, e.y + p.oy + bob, e.z + p.oz);
    });

    if (e.timer > 1.5 && Math.random() < 0.02) {
      fireEnemyBullet(e.x, e.y + bob, e.z);
    }

    if (e.z > 20) {
      e.parts.forEach(p => destroyMesh(p.mesh));
      game.enemies.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.z += b.vz * dt;
    b.life -= dt;
    setPosition(b.mesh, b.x, b.y, b.z);

    if (b.life <= 0 || b.z < -150) {
      destroyMesh(b.mesh);
      game.bullets.splice(i, 1);
      continue;
    }

    let hit = false;
    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const e = game.enemies[j];
      if (Math.abs(b.x - e.x) < 3.0 && Math.abs(b.y - e.y) < 3.0 && Math.abs(b.z - e.z) < 4.0) {
        e.health -= 15;
        hit = true;
        if(e.health <= 0) {
          createExplosion(e.x, e.y, e.z, PALETTE.explosion);
          game.score += 500;
          e.parts.forEach(p => destroyMesh(p.mesh));
          game.enemies.splice(j, 1);
        }
        break;
      }
    }

    if(hit) {
      destroyMesh(b.mesh);
      game.bullets.splice(i, 1);
    }
  }
}

function updateEnemyBullets(dt) {
  const p = game.player;
  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const b = game.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    
    setPosition(b.mesh, b.x, b.y, b.z);

    if (Math.abs(b.x - p.x) < 1.5 && Math.abs(b.y - p.y) < 2.0 && Math.abs(b.z - p.z) < 2.0) {
      p.health -= 25;
      createExplosion(p.x, p.y, p.z, PALETTE.playerBody);
      destroyMesh(b.mesh);
      game.enemyBullets.splice(i, 1);
      continue;
    }

    if (b.life <= 0 || b.z > 20) {
      destroyMesh(b.mesh);
      game.enemyBullets.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    
    setPosition(p.mesh, p.x, p.y, p.z);
    
    const alpha = p.life / p.maxLife;
    setScale(p.mesh, alpha, alpha, alpha);
    
    if (p.life <= 0) {
      destroyMesh(p.mesh);
      game.particles.splice(i, 1);
    }
  }
}

function initStartScreen() {
  clearButtons();
  createButton(centerX(240), 252, 240, 52, "▶ START MISSION", () => {
    startGame();
  }, { normalColor: uiColors.success, hoverColor: rgba8(60, 220, 120, 255) });
}

function drawStartScreen() {
  // Solid opaque base — guaranteed to cover the 3D scene
  cls(rgba8(5, 0, 15, 255));

  // Rich alien-world gradient layered on top
  drawGradient(0, 0, 640, 360, rgba8(20, 5, 55, 255), rgba8(4, 0, 18, 255), 'v');

  // Radial spotlight glow behind title
  drawRadialGradient(320, 105, 230, rgba8(200, 60, 255, 48), rgba8(0, 0, 0, 0));

  // Cosmic starfield noise
  drawNoise(0, 0, 640, 360, 22, Math.floor(gameTime * 6));

  // Distant planet arc at horizon
  drawRadialGradient(320, 440, 280, rgba8(80, 0, 160, 70), rgba8(0, 0, 0, 0));

  // Corner starbursts — pulsing
  const sp = Math.sin(gameTime * 2) * 0.5 + 0.5;
  drawStarburst(30, 30, 18, 7, 6, rgba8(255, 140, 0, Math.floor(sp * 210)), true);
  drawStarburst(610, 30, 18, 7, 6, rgba8(255, 140, 0, Math.floor(sp * 210)), true);
  drawStarburst(30, 330, 12, 5, 5, rgba8(180, 0, 255, Math.floor((1 - sp) * 180)), true);
  drawStarburst(610, 330, 12, 5, 5, rgba8(180, 0, 255, Math.floor((1 - sp) * 180)), true);

  // More scattered star shots across the sky
  drawStarburst(90, 70, 7, 3, 4, rgba8(255, 255, 180, Math.floor(sp * 160)), true);
  drawStarburst(550, 55, 6, 2, 4, rgba8(200, 180, 255, Math.floor((1 - sp) * 150)), true);
  drawStarburst(480, 80, 5, 2, 5, rgba8(255, 200, 100, Math.floor(sp * 130)), true);

  // Energy wave at the horizon line
  drawWave(0, 185, 640, 6, 0.028, gameTime * 2.2, rgba8(180, 0, 255, 100), 2);
  drawWave(0, 190, 640, 4, 0.042, gameTime * 2.8 + 1.0, rgba8(255, 100, 0, 75), 2);

  // Main title — SPACE HARRIER with orange/flame glow
  const titleBob = Math.sin(gameTime * 1.8) * 7;
  drawGlowTextCentered('SPACE', 320, 44 + titleBob,
    rgba8(255, 160, 0, 255), rgba8(160, 50, 0, 170), 2);
  drawGlowTextCentered('HARRIER', 320, 98 + titleBob,
    rgba8(255, 80, 20, 255), rgba8(120, 20, 0, 160), 2);

  // Subtitle
  const subPulse = Math.sin(gameTime * 3) * 0.25 + 0.75;
  setFont('large');
  setTextAlign('center');
  drawText('NOVA 64 EDITION', 320, 152, rgba8(120, 200, 255, Math.floor(subPulse * 255)), 1);

  // Tagline
  setFont('normal');
  drawText('THE LEGENDARY RAIL SHOOTER RETURNS', 320, 174, rgba8(200, 150, 255, 200), 1);

  // Info panel
  const panel = createPanel(centerX(440), 200, 440, 92, {
    bgColor: rgba8(15, 5, 35, 215),
    borderColor: rgba8(180, 60, 255, 255),
    borderWidth: 2,
    shadow: true
  });
  drawPanel(panel);

  setFont('small');
  setTextAlign('center');
  drawText('◆ Blast through waves of alien enemies', 320, 218, uiColors.light, 1);
  drawText('◆ Dodge projectiles & collect power-ups', 320, 233, uiColors.light, 1);
  drawText('◆ Retro N64 rail-shooter with 3D visuals', 320, 248, uiColors.light, 1);

  // Buttons
  drawAllButtons();

  // Controls hint
  setFont('tiny');
  drawText('WASD / Arrows: Move  ◆  Space: Shoot', 320, 318, uiColors.secondary, 1);

  // Pulsing prompt
  const alpha = Math.floor((Math.sin(gameTime * 5) * 0.5 + 0.5) * 255);
  drawText('◆ PRESS SPACE TO LAUNCH ◆', 320, 334, rgba8(255, 160, 0, alpha), 1);

  // CRT scanlines
  drawScanlines(45, 2);
}

function initGameOverScreen() {
  clearButtons();
  createButton(centerX(220), 260, 220, 50, "↻ RETRY", () => {
    gameState = 'start';
    inputLockout = 0.6;
    initStartScreen();
  }, { normalColor: uiColors.danger, hoverColor: rgba8(250, 60, 60, 255) });
}


export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }

  if (gameState === 'gameover') {
    rect(0, 0, 640, 360, rgba8(100, 0, 0, 150), true);
    setFont('huge');
    setTextAlign('center');
    drawTextShadow('GAME OVER', 320, 120, uiColors.danger, rgba8(0,0,0,255), 4, 1);
    
    setFont('normal');
    drawText('SCORE: ' + Math.floor(game.score), 320, 180, uiColors.warning, 1);
    drawAllButtons();
    return;
  }

  setFont('normal');
  setTextAlign('left');
  drawText('SCORE: ' + Math.floor(game.score), 20, 20, uiColors.warning, 1);
  drawText('SPEED: ' + Math.floor(game.speed), 20, 40, uiColors.light, 1);
  
  rect(420, 20, 200, 20, rgba8(50, 0, 0, 200), true);
  const hpWidth = Math.max(0, game.player.health * 2);
  rect(420, 20, hpWidth, 20, hpWidth > 40 ? uiColors.success : uiColors.danger, true);
  rect(420, 20, 200, 20, uiColors.light, false);
}

