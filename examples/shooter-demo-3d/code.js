// STAR COMBAT 64 - True 3D Space Fighter
// Nintendo 64 / PlayStation style 3D space combat with full GPU acceleration

// Screen management
const { drawPanel, print, printCentered, rect, rgba8 } = nova64.draw;
const {
  createCube,
  createPlane,
  createSphere,
  destroyMesh,
  engine,
  get3DStats,
  getPosition,
  rotateMesh,
  setPosition,
  setRotation,
  setScale,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { setFog, setLightDirection } = nova64.light;
const { enableBloom, enableDithering, enableFXAA, enablePixelation, enableVignette } = nova64.fx;
const { btn, btnp, isKeyPressed, key } = nova64.input;
const { sfx } = nova64.audio;
const {
  Screen,
  addScreen,
  centerX,
  createButton,
  createPanel,
  drawAllButtons,
  drawGradientRect,
  drawText,
  drawTextOutline,
  drawTextShadow,
  setFont,
  setTextAlign,
  switchToScreen,
  uiColors,
  updateAllButtons,
} = nova64.ui;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let startScreenTime = 0;
let uiButtons = [];

// Game data with screen management
let gameData = {
  time: 0,
  score: 0,
  level: 1,
  lives: 3,
  playerShip: null,
  playerBullets: [],
  enemies: [],
  enemyBullets: [],
  powerups: [],
  explosions: [],
  stars: [],
  player: {
    x: 0,
    y: 0,
    z: -5,
    health: 100,
    shield: 100,
    energy: 100,
    fireCooldown: 0,
    weaponLevel: 1,
  },
  inputState: {
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
    charge: false,
  },
};

export async function init() {
  // Setup 3D scene with N64-style aesthetics
  nova64.camera.setCameraPosition(0, 2, 0);
  nova64.camera.setCameraTarget(0, 0, -10);
  nova64.camera.setCameraFOV(75);

  // Setup dramatic space lighting
  nova64.light.setLightDirection(-0.5, -1, -0.8);
  nova64.light.setFog(0x000511, 20, 80);

  // Enable retro effects + post-processing
  nova64.fx.enablePixelation(1);
  nova64.fx.enableDithering(true);
  nova64.fx.enableBloom(1.0, 0.4, 0.4); // Weapon fire & engine trail
  nova64.fx.enableFXAA();
  nova64.fx.enableVignette(1.4, 0.88);

  // Initialize start screen
  initStartScreen();

  // Setup screen management
  nova64.ui.addScreen('title', {
    draw: drawTitleScreen,
    update: updateTitleScreen,
  });

  nova64.ui.addScreen('game', {
    draw: drawGameScreen,
    update: updateGameScreen,
    enter: enterGameScreen,
    exit: exitGameScreen,
  });

  nova64.ui.addScreen('gameover', {
    draw: drawGameOverScreen,
    update: updateGameOverScreen,
  });

  // Start with title screen
  nova64.ui.switchToScreen('title');
}

// === TITLE SCREEN ===
function drawTitleScreen() {
  // Background gradient
  nova64.ui.drawGradientRect(
    0,
    0,
    640,
    360,
    nova64.draw.rgba8(0, 10, 40, 255),
    nova64.draw.rgba8(0, 0, 20, 255),
    true
  );

  // Title
  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawTextShadow(
    'STAR COMBAT 64',
    320,
    120,
    nova64.draw.rgba8(255, 102, 0, 255),
    nova64.draw.rgba8(0, 0, 0, 255),
    4,
    1
  );

  // Subtitle
  nova64.ui.setFont('large');
  nova64.ui.drawText('3D Space Fighter', 320, 160, nova64.draw.rgba8(0, 255, 255, 255), 1);

  // Prompt
  nova64.ui.setFont('normal');
  const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
  nova64.ui.drawText(
    'Press SPACE, ENTER, or A Button',
    320,
    200,
    nova64.draw.rgba8(255, 255, 0, Math.floor(pulse * 255)),
    1
  );

  // Controls
  nova64.ui.setFont('small');
  nova64.ui.drawText(
    'ARROWS: Move • Z: Fire • X: Charge Shot',
    320,
    240,
    nova64.draw.rgba8(255, 255, 255, 255),
    1
  );

  // Draw buttons if they exist
  if (uiButtons && uiButtons.length > 0) {
    nova64.ui.drawAllButtons();
  }
}

function updateTitleScreen() {
  // Check for Space key, Enter, or gamepad button
  if (
    nova64.input.isKeyPressed('Space') ||
    nova64.input.isKeyPressed('Enter') ||
    nova64.input.btnp(4) ||
    nova64.input.btnp(12)
  ) {
    nova64.ui.switchToScreen('game');
  }

  // Also update buttons if they exist
  if (uiButtons && uiButtons.length > 0) {
    nova64.ui.updateAllButtons();
  }
}

// === GAME SCREEN ===
async function enterGameScreen() {
  // Reset game state
  gameData.score = 0;
  gameData.level = 1;
  gameData.lives = 3;
  gameData.time = 0;

  // Reset player
  gameData.player = {
    x: 0,
    y: 0,
    z: -5,
    health: 100,
    shield: 100,
    energy: 100,
    fireCooldown: 0,
    weaponLevel: 1,
  };

  gameData.flags = { bossActive: false, waveSpawning: false, bossPhase: 0 };
  gameData.combo = 0;
  gameData.comboTimer = 0;

  // Clear arrays
  gameData.playerBullets = [];
  gameData.enemies = [];
  gameData.enemyBullets = [];
  gameData.powerups = [];
  gameData.explosions = [];
  gameData.stars = [];

  // Create player ship - sleek fighter
  gameData.playerShip = createPlayerShip();

  // Create star field environment
  await createStarField();

  // Create space environment
  await createSpaceEnvironment();

  // Spawn initial wave
  spawnEnemyWave();
}

function drawGameScreen() {
  // 3D scene is automatically rendered by GPU backend
  // Draw UI overlay using 2D API
  drawUI();
}

function updateGameScreen(dt) {
  gameData.time += dt;

  updateInput(dt);
  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updatePowerups(dt);
  updateExplosions(dt);
  updateStarField(dt);
  checkCollisions(dt);
  updateGameLogic(dt);

  updateCamera(dt);

  // Check game over
  if (gameData.lives <= 0 || gameData.player.health <= 0) {
    nova64.ui.switchToScreen('gameover');
  }
}

function exitGameScreen() {
  // Clean up 3D objects
  if (gameData.playerShip) {
    if (gameData.playerShip.body) nova64.scene.destroyMesh(gameData.playerShip.body);
    if (gameData.playerShip.leftWing) nova64.scene.destroyMesh(gameData.playerShip.leftWing);
    if (gameData.playerShip.rightWing) nova64.scene.destroyMesh(gameData.playerShip.rightWing);
    if (gameData.playerShip.cockpit) nova64.scene.destroyMesh(gameData.playerShip.cockpit);
  }

  // Clean up all other 3D objects
  [
    ...gameData.playerBullets,
    ...gameData.enemies,
    ...gameData.enemyBullets,
    ...gameData.powerups,
    ...gameData.explosions,
    ...gameData.stars,
  ].forEach(obj => {
    if (obj.mesh) nova64.scene.destroyMesh(obj.mesh);
  });
}

// === GAME OVER SCREEN ===
function drawGameOverScreen() {
  // Dark red background
  nova64.ui.drawGradientRect(
    0,
    0,
    640,
    360,
    nova64.draw.rgba8(40, 0, 0, 255),
    nova64.draw.rgba8(20, 0, 0, 255),
    true
  );

  // Mission Failed
  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawTextShadow(
    'MISSION FAILED',
    320,
    120,
    nova64.draw.rgba8(255, 0, 0, 255),
    nova64.draw.rgba8(100, 0, 0, 255),
    4,
    1
  );

  // Stats
  nova64.ui.setFont('large');
  nova64.ui.drawText(
    `Final Score: ${gameData.score}`,
    320,
    170,
    nova64.draw.rgba8(255, 255, 255, 255),
    1
  );
  nova64.ui.drawText(
    `Level Reached: ${gameData.level}`,
    320,
    200,
    nova64.draw.rgba8(255, 255, 255, 255),
    1
  );

  // Prompts
  nova64.ui.setFont('normal');
  const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
  nova64.ui.drawText(
    'Press SPACE to try again',
    320,
    260,
    nova64.draw.rgba8(0, 255, 255, Math.floor(pulse * 255)),
    1
  );
  nova64.ui.drawText(
    'Press ESC for title screen',
    320,
    290,
    nova64.draw.rgba8(0, 255, 255, 200),
    1
  );
}

function updateGameOverScreen() {
  if (nova64.input.isKeyPressed(' ')) {
    nova64.ui.switchToScreen('game');
  } else if (nova64.input.isKeyPressed('Escape')) {
    nova64.ui.switchToScreen('title');
  }
}

function initStartScreen() {
  uiButtons = [];

  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(240),
      150,
      240,
      60,
      '🚀 LAUNCH FIGHTER',
      () => {
        gameState = 'playing';
        nova64.ui.switchToScreen('game');
      },
      {
        normalColor: nova64.draw.rgba8(255, 100, 0, 255),
        hoverColor: nova64.draw.rgba8(255, 130, 30, 255),
        pressedColor: nova64.draw.rgba8(220, 70, 0, 255),
      }
    )
  );

  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(200),
      355,
      200,
      45,
      '🎮 CONTROLS',
      () => {
        // Controls info shown on screen
      },
      {
        normalColor: nova64.draw.rgba8(0, 255, 255, 255),
        hoverColor: nova64.draw.rgba8(60, 255, 255, 255),
        pressedColor: nova64.draw.rgba8(0, 220, 220, 255),
      }
    )
  );
}

export function update(dt) {
  if (gameState === 'start') {
    startScreenTime += dt;
    nova64.ui.updateAllButtons();
    return;
  }
  // Screen management handles updates
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  // Screen management handles drawing
}

function drawStartScreen() {
  // Space gradient background
  nova64.ui.drawGradientRect(
    0,
    0,
    640,
    360,
    nova64.draw.rgba8(10, 5, 25, 235),
    nova64.draw.rgba8(5, 2, 12, 250),
    true
  );

  // Animated title
  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  const pulse = Math.sin(startScreenTime * 4) * 0.3 + 0.7;
  const fireColor = nova64.draw.rgba8(255, Math.floor(pulse * 150), 0, 255);

  const shake = Math.sin(startScreenTime * 15) * 2;
  nova64.ui.drawTextShadow(
    'STAR',
    320 + shake,
    50,
    fireColor,
    nova64.draw.rgba8(0, 0, 0, 255),
    7,
    1
  );
  nova64.ui.drawTextShadow(
    'COMBAT 64',
    320,
    105,
    nova64.draw.rgba8(0, 255, 255, 255),
    nova64.draw.rgba8(0, 0, 0, 255),
    7,
    1
  );

  // Subtitle
  nova64.ui.setFont('large');
  const glow = Math.sin(startScreenTime * 5) * 0.2 + 0.8;
  nova64.ui.drawTextOutline(
    '🚀 3D Space Fighter 🚀',
    320,
    165,
    nova64.draw.rgba8(255, 255, 0, Math.floor(glow * 255)),
    nova64.draw.rgba8(0, 0, 0, 255),
    1
  );

  // Info panel
  const panel = nova64.ui.createPanel(nova64.ui.centerX(480), 210, 480, 190, {
    bgColor: nova64.draw.rgba8(15, 10, 30, 215),
    borderColor: nova64.draw.rgba8(255, 100, 0, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: nova64.draw.rgba8(25, 15, 45, 215),
  });
  nova64.draw.drawPanel(panel);

  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawText('MISSION BRIEFING', 320, 230, nova64.draw.rgba8(255, 100, 0, 255), 1);

  nova64.ui.setFont('small');
  nova64.ui.drawText('🚀 Pilot advanced fighter spacecraft', 320, 255, uiColors.light, 1);
  nova64.ui.drawText('🚀 Destroy enemy forces and collect powerups', 320, 270, uiColors.light, 1);
  nova64.ui.drawText('🚀 Use charge shots for devastating attacks', 320, 285, uiColors.light, 1);
  nova64.ui.drawText('🚀 Nintendo 64 / PlayStation style combat', 320, 300, uiColors.light, 1);

  nova64.ui.setFont('tiny');
  nova64.ui.drawText('ARROWS: Move | Z: Fire | X: Charge Shot', 320, 320, uiColors.secondary, 1);

  // Draw buttons
  nova64.ui.drawAllButtons();

  // Pulsing prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  nova64.ui.setFont('normal');
  nova64.ui.drawText(
    '🚀 PREPARE FOR COMBAT 🚀',
    320,
    430,
    nova64.draw.rgba8(255, 150, 0, alpha),
    1
  );

  // Info
  nova64.ui.setFont('tiny');
  nova64.ui.drawText(
    '3D Space Combat Simulator',
    320,
    345,
    nova64.draw.rgba8(150, 150, 200, 150),
    1
  );
}

function createPlayerShip() {
  // Create main body
  const body = nova64.scene.createCube(1.5, 0x4488ff, [0, 0, -5]);
  nova64.scene.setScale(body, 1.5, 0.6, 2.5);

  // Create wings
  const leftWing = nova64.scene.createCube(1.8, 0x2266dd, [-1.2, 0, -5]);
  nova64.scene.setScale(leftWing, 1.8, 0.3, 1.2);

  const rightWing = nova64.scene.createCube(1.8, 0x2266dd, [1.2, 0, -5]);
  nova64.scene.setScale(rightWing, 1.8, 0.3, 1.2);

  // Create cockpit
  const cockpit = nova64.scene.createSphere(0.4, 0x88ccff, [0, 0.3, -4.5]);
  nova64.scene.setScale(cockpit, 0.8, 0.6, 1.0);

  return { body, leftWing, rightWing, cockpit };
}

async function createStarField() {
  gameData.stars = [];
  const stars = gameData.stars;

  // Create 3D starfield
  for (let i = 0; i < 200; i++) {
    const star = nova64.scene.createSphere(0.05, 0xffffff, [
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 60,
      -Math.random() * 100 - 10,
    ]);

    const brightness = Math.random();

    // Vary star sizes and colors
    nova64.scene.setScale(star, brightness * 2 + 0.5);

    stars.push({
      mesh: star,
      originalZ: nova64.scene.getPosition(star)[2],
      speed: 2 + Math.random() * 4,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
}

async function createSpaceEnvironment() {
  // Create distant nebula planes
  for (let i = 0; i < 5; i++) {
    const nebula = nova64.scene.createPlane(40, 25, 0x220033 + i * 0x001122, [
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 30,
      -60 - i * 10,
    ]);
    nova64.scene.setRotation(
      nebula,
      Math.random() * 0.5,
      Math.random() * 0.5,
      Math.random() * 6.28
    );
  }

  // Create space station or planet in distance
  nova64.scene.createSphere(8, 0x664422, [30, -15, -70]);

  // Add some space debris
  for (let i = 0; i < 10; i++) {
    const debris = nova64.scene.createCube(0.3, 0x444444, [
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 40,
      -20 - Math.random() * 40,
    ]);
    nova64.scene.setRotation(
      debris,
      Math.random() * 6.28,
      Math.random() * 6.28,
      Math.random() * 6.28
    );
  }
}

function updateInput(_dt) {
  const inputState = gameData.inputState;
  inputState.left = nova64.input.btn(0);
  inputState.right = nova64.input.btn(1);
  inputState.up = nova64.input.btn(2);
  inputState.down = nova64.input.btn(3);
  inputState.charge = nova64.input.btn(4); // Z
  inputState.fire = nova64.input.btn(5); // X
}

function updatePlayer(dt) {
  // Update player position
  const speed = 12 * dt;
  const inputState = gameData.inputState;
  const player = gameData.player;
  const playerShip = gameData.playerShip;

  if (inputState.left && player.x > -12) player.x -= speed;
  if (inputState.right && player.x < 12) player.x += speed;
  if (inputState.up && player.y < 8) player.y += speed;
  if (inputState.down && player.y > -6) player.y -= speed;

  // Update ship positions
  nova64.scene.setPosition(playerShip.body, player.x, player.y, player.z);
  nova64.scene.setPosition(playerShip.leftWing, player.x - 1.2, player.y, player.z);
  nova64.scene.setPosition(playerShip.rightWing, player.x + 1.2, player.y, player.z);
  nova64.scene.setPosition(playerShip.cockpit, player.x, player.y + 0.3, player.z + 0.5);

  // Tilt ship based on movement
  const tiltX = inputState.up ? 0.2 : inputState.down ? -0.2 : 0;
  const tiltZ = inputState.left ? 0.3 : inputState.right ? -0.3 : 0;

  nova64.scene.setRotation(playerShip.body, tiltX, 0, tiltZ);
  nova64.scene.setRotation(playerShip.leftWing, tiltX, 0, tiltZ);
  nova64.scene.setRotation(playerShip.rightWing, tiltX, 0, tiltZ);

  // Handle firing
  player.fireCooldown -= dt;

  if (inputState.fire && player.fireCooldown <= 0) {
    fireBullet('normal');
    player.fireCooldown = 0.15;
  }

  if (inputState.charge && player.energy >= 20 && player.fireCooldown <= 0) {
    fireBullet('charged');
    player.energy -= 20;
    player.fireCooldown = 0.4;
  }

  // Regenerate energy and shield
  if (player.energy < 100) player.energy += 30 * dt;
  if (player.shield < 100) player.shield += 15 * dt;

  // Engine glow effect - animate engine exhaust
  const gameTime = gameData.time;
  nova64.scene.rotateMesh(playerShip.body, 0, 0, Math.sin(gameTime * 20) * 0.02);
}

function fireBullet(type) {
  const player = gameData.player;
  const playerBullets = gameData.playerBullets;

  if (type === 'charged') {
    const bullet = {
      type: type,
      damage: 3,
      speed: 25,
      life: 3.0,
      mesh: nova64.scene.createSphere(0.15, 0x00ffff, [player.x, player.y, player.z + 1]),
    };
    nova64.scene.setScale(bullet.mesh, 1.5);
    playerBullets.push(bullet);
    nova64.audio.sfx('explosion');
    return;
  }

  const level = player.weaponLevel;
  const positions = [];

  if (level === 1) {
    positions.push([player.x, player.y, player.z + 1]);
  } else if (level === 2) {
    positions.push([player.x - 0.5, player.y, player.z + 1]);
    positions.push([player.x + 0.5, player.y, player.z + 1]);
  } else {
    positions.push([player.x, player.y, player.z + 1.2]);
    positions.push([player.x - 0.8, player.y, player.z + 0.8]);
    positions.push([player.x + 0.8, player.y, player.z + 0.8]);
  }

  positions.forEach(pos => {
    const bullet = {
      type: type,
      damage: 1,
      speed: 25,
      life: 3.0,
      mesh: nova64.scene.createCube(0.1, 0xffff00, pos),
    };
    nova64.scene.setScale(bullet.mesh, 0.3, 0.3, 1.0);
    playerBullets.push(bullet);
  });
  nova64.audio.sfx('laser');
}

function spawnEnemyWave() {
  const level = gameData.level;

  if (level > 0 && level % 5 === 0 && !gameData.flags.bossActive) {
    // Boss wave!
    spawnEnemy(0, 6, -35, 'boss');
    gameData.flags.bossActive = true;
    gameData.flags.bossPhase = 0;
    return;
  }
  gameData.flags.bossActive = false;

  const waveSize = 4 + level * 2;
  const formations = ['line', 'V', 'diamond', 'circle'];
  const formation = formations[level % formations.length];

  for (let i = 0; i < waveSize; i++) {
    let x, y, z;

    switch (formation) {
      case 'line':
        x = (i - waveSize / 2) * 3;
        y = 6;
        z = -25;
        break;
      case 'V':
        x = (i - waveSize / 2) * 2;
        y = 6 - Math.abs(i - waveSize / 2) * 0.5;
        z = -25;
        break;
      case 'diamond': {
        const angle = (i / waveSize) * Math.PI * 2;
        x = Math.cos(angle) * 8;
        y = Math.sin(angle) * 4 + 6;
        z = -25;
        break;
      }
      case 'circle': {
        const circleAngle = (i / waveSize) * Math.PI * 2;
        x = Math.cos(circleAngle) * 6;
        y = Math.sin(circleAngle) * 3 + 6;
        z = -25;
        break;
      }
    }

    let typeToSpawn = formation;
    if (level >= 2 && Math.random() < 0.25) {
      typeToSpawn = 'fast';
    } else if (level >= 3 && Math.random() < 0.15) {
      typeToSpawn = 'tank';
    }

    spawnEnemy(x, y, z, typeToSpawn);
  }
}

function spawnEnemy(x, y, z, type) {
  const level = gameData.level;
  const enemies = gameData.enemies;

  let body,
    engine,
    parts = null;
  let health = 2 + level;
  let maxHealth = health;
  let vz = 8;
  let vy = 0;
  let vx = 0;
  let fireCooldown = Math.random() * 2;

  if (type === 'boss') {
    health = 50 + level * 10;
    maxHealth = health;
    vz = 2; // Slow incoming speed
    body = nova64.scene.createCube(3.0, 0xff0000, [x, y, z]);
    const wingL = nova64.scene.createCube(1.5, 0x333333, [x - 2, y, z]);
    const wingR = nova64.scene.createCube(1.5, 0x333333, [x + 2, y, z]);
    parts = { body, wingL, wingR };
  } else if (type === 'fast') {
    health = 1 + Math.floor(level / 2);
    vz = 14;
    body = nova64.scene.createCube(0.4, 0xffaa00, [x, y, z]);
    engine = nova64.scene.createSphere(0.2, 0xffffff, [x, y, z - 0.5]);
    parts = { body, engine };
  } else if (type === 'tank') {
    health = 10 + level * 3;
    vz = 4;
    body = nova64.scene.createCube(1.2, 0xff00ff, [x, y, z]);
    engine = nova64.scene.createSphere(0.5, 0x5500aa, [x, y, z - 0.8]);
    parts = { body, engine };
  } else {
    // Normal / formations
    body = nova64.scene.createCube(0.6, 0xff4444, [x, y, z]);
    engine = nova64.scene.createSphere(0.3, 0xff8800, [x, y, z - 0.5]);
    parts = { body, engine };
  }

  const enemy = {
    type: type,
    health: health,
    mesh: parts,
    x: x,
    y: y,
    z: z,
    vx: vx,
    vy: vy,
    vz: vz,
    fireCooldown: fireCooldown,
    behavior: type,
    alive: true,
    timer: 0,
    hitFlash: 0,
    maxHealth: maxHealth,
  };

  enemies.push(enemy);
}

function updateBullets(dt) {
  const playerBullets = gameData.playerBullets;
  const enemyBullets = gameData.enemyBullets;
  const gameTime = gameData.time;

  // Update player bullets
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];
    bullet.life -= dt;

    const pos = nova64.scene.getPosition(bullet.mesh);
    pos[2] -= bullet.speed * dt;
    nova64.scene.setPosition(bullet.mesh, pos[0], pos[1], pos[2]);

    // Add bullet glow animation
    if (bullet.type === 'charged') {
      const glow = 1.2 + Math.sin(gameTime * 10) * 0.3;
      nova64.scene.setScale(bullet.mesh, glow);
    }

    if (bullet.life <= 0 || pos[2] < -50) {
      nova64.scene.destroyMesh(bullet.mesh);
      playerBullets.splice(i, 1);
    }
  }

  // Update enemy bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    bullet.life -= dt;

    const pos = nova64.scene.getPosition(bullet.mesh);
    pos[2] += bullet.speed * dt;
    pos[0] += (bullet.vx || 0) * bullet.speed * dt;
    nova64.scene.setPosition(bullet.mesh, pos[0], pos[1], pos[2]);

    if (bullet.life <= 0 || pos[2] > 5) {
      nova64.scene.destroyMesh(bullet.mesh);
      enemyBullets.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  const enemies = gameData.enemies;
  const gameTime = gameData.time;
  const player = gameData.player;
  let lives = gameData.lives;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (!enemy.alive) continue;

    enemy.timer += dt;
    enemy.fireCooldown -= dt;

    // Hit flash decay
    if (enemy.hitFlash > 0) enemy.hitFlash -= dt * 4;

    if (enemy.type === 'boss') {
      _updateBoss(enemy, dt, player, gameTime);
    } else {
      // Advance toward player
      enemy.z += enemy.vz * dt;

      // Smart AI behaviors based on type
      if (enemy.type === 'fast') {
        // Fast enemies: strafe toward player, then dodge away
        const dx = player.x - enemy.x;
        const approach = enemy.z > -18 ? 1 : 0;
        enemy.vx += (dx * 0.8 + Math.sin(gameTime * 6 + i * 3) * 4) * dt * 3;
        enemy.vx *= 0.95; // Damping
        enemy.vy = Math.sin(gameTime * 4 + i) * 2 * approach;
      } else if (enemy.type === 'tank') {
        // Tank enemies: slow, steady advance, aim at player, fire often
        const dx = player.x - enemy.x;
        enemy.vx = dx * 0.3;
        enemy.vy = Math.sin(gameTime * 0.5 + i) * 0.5;
      } else {
        // Formation enemies: follow formation but drift toward player
        const dx = player.x - enemy.x;
        switch (enemy.behavior) {
          case 'line':
            enemy.vx = Math.sin(gameTime + i) * 2 + dx * 0.1;
            break;
          case 'V':
            enemy.vx = Math.sin(gameTime * 2 + i) * 3 + dx * 0.15;
            enemy.vy = Math.cos(gameTime + i) * 1;
            break;
          case 'circle':
            enemy.vx = Math.cos(gameTime + i * 2) * 4;
            enemy.vy = Math.sin(gameTime + i * 2) * 2;
            break;
          case 'diamond':
            enemy.vx = Math.sin(gameTime * 1.5 + i) * 3 + dx * 0.2;
            enemy.vy = Math.cos(gameTime * 0.8 + i) * 1.5;
            break;
        }
      }

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Clamp to play area
      enemy.x = Math.max(-14, Math.min(14, enemy.x));
      enemy.y = Math.max(-8, Math.min(10, enemy.y));

      // Update mesh positions
      if (enemy.mesh.body) nova64.scene.setPosition(enemy.mesh.body, enemy.x, enemy.y, enemy.z);
      if (enemy.mesh.engine)
        nova64.scene.setPosition(enemy.mesh.engine, enemy.x, enemy.y, enemy.z - 0.5);

      // Rotate enemy ships
      if (enemy.type === 'fast') {
        if (enemy.mesh.body) nova64.scene.rotateMesh(enemy.mesh.body, 0, dt * 5, dt * 5);
      } else {
        if (enemy.mesh.body) nova64.scene.rotateMesh(enemy.mesh.body, 0, dt * 2, 0);
      }
      if (enemy.mesh.engine) nova64.scene.rotateMesh(enemy.mesh.engine, 0, dt * 4, 0);

      // Enemy firing — smarter targeting
      if (enemy.fireCooldown <= 0 && enemy.z > -20) {
        const fireChance = enemy.type === 'tank' ? 0.8 : 0.3;
        if (Math.random() < fireChance * dt) {
          // Aim toward player with some spread
          const spread = enemy.type === 'tank' ? 0.5 : 1.5;
          fireEnemyBullet(enemy.x, enemy.y, enemy.z, player.x + (Math.random() - 0.5) * spread);
          enemy.fireCooldown =
            enemy.type === 'tank' ? 0.8 + Math.random() * 0.5 : 1.5 + Math.random();
        }
      }
    }

    // Remove enemies that passed player
    if (enemy.z > 5) {
      if (enemy.mesh.body) nova64.scene.destroyMesh(enemy.mesh.body);
      if (enemy.mesh.engine) nova64.scene.destroyMesh(enemy.mesh.engine);
      if (enemy.mesh.wingL) nova64.scene.destroyMesh(enemy.mesh.wingL);
      if (enemy.mesh.wingR) nova64.scene.destroyMesh(enemy.mesh.wingR);

      enemies.splice(i, 1);

      if (enemy.type === 'boss') {
        gameData.flags.bossActive = false;
      } else {
        lives--;
      }
    }
  }

  gameData.lives = lives;
}

// Boss with multi-phase attack patterns
function _updateBoss(boss, dt, player, gameTime) {
  boss.z += boss.vz * dt;

  if (boss.z > -15) {
    boss.vz = 0;

    // Phase transitions based on health percentage
    const healthPct = boss.health / boss.maxHealth;
    let phase = 0;
    if (healthPct < 0.33) phase = 2;
    else if (healthPct < 0.66) phase = 1;
    gameData.flags.bossPhase = phase;

    switch (phase) {
      case 0: // Phase 1: Slow strafe, triple shot
        boss.x = Math.sin(boss.timer * 0.5) * 8;
        boss.y = 6 + Math.sin(boss.timer * 0.3) * 2;
        if (boss.fireCooldown <= 0) {
          for (let a = -1; a <= 1; a++) {
            fireEnemyBullet(boss.x + a * 2, boss.y, boss.z + 2, player.x);
          }
          boss.fireCooldown = 1.0;
        }
        break;

      case 1: // Phase 2: Fast strafe, spread shot + aimed shot
        boss.x = Math.sin(boss.timer * 1.2) * 10;
        boss.y = 6 + Math.cos(boss.timer * 0.8) * 3;
        if (boss.fireCooldown <= 0) {
          // Spread fan
          for (let a = -2; a <= 2; a++) {
            fireEnemyBullet(boss.x + a * 1.5, boss.y, boss.z + 2, player.x + a * 3);
          }
          // Aimed shot
          fireEnemyBullet(boss.x, boss.y - 1, boss.z + 2, player.x);
          boss.fireCooldown = 0.7;
        }
        break;

      case 2: // Phase 3: Erratic movement, rapid fire + sweep
        boss.x = Math.sin(boss.timer * 2) * 8 + Math.cos(boss.timer * 3.7) * 3;
        boss.y = 5 + Math.sin(boss.timer * 1.5) * 4;
        if (boss.fireCooldown <= 0) {
          // Sweep pattern
          const sweepAngle = boss.timer * 4;
          for (let a = 0; a < 3; a++) {
            const sx = boss.x + Math.cos(sweepAngle + a * 2) * 4;
            fireEnemyBullet(sx, boss.y, boss.z + 2, player.x);
          }
          boss.fireCooldown = 0.4;
        }
        break;
    }
  }

  nova64.scene.setPosition(boss.mesh.body, boss.x, boss.y, boss.z);
  nova64.scene.setPosition(boss.mesh.wingL, boss.x - 2, boss.y, boss.z);
  nova64.scene.setPosition(boss.mesh.wingR, boss.x + 2, boss.y, boss.z);
  nova64.scene.setRotation(boss.mesh.body, boss.timer * 0.5, boss.timer, 0);
}

function fireEnemyBullet(x, y, z, targetX) {
  const enemyBullets = gameData.enemyBullets;

  // Slight horizontal tracking toward target
  const dx = targetX !== undefined ? (targetX - x) * 0.05 : 0;

  const bullet = {
    speed: 25 * 0.7,
    vx: dx,
    mesh: nova64.scene.createCube(0.08, 0xff4444, [x, y, z]),
    life: 2.0,
  };

  nova64.scene.setScale(bullet.mesh, 0.2, 0.2, 0.8);
  enemyBullets.push(bullet);
}

function updatePowerups(dt) {
  const powerups = gameData.powerups;

  // Spawn random powerups
  if (Math.random() < 0.01 * dt && powerups.length < 3) {
    spawnPowerup();
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    powerup.z += powerup.speed * dt;
    powerup.rotationY += dt * 3;

    nova64.scene.setPosition(powerup.mesh, powerup.x, powerup.y, powerup.z);
    nova64.scene.setRotation(powerup.mesh, 0, powerup.rotationY, 0);

    if (powerup.z > 5) {
      nova64.scene.destroyMesh(powerup.mesh);
      powerups.splice(i, 1);
    }
  }
}

const powerupColors = {
  health: 0x00ff00,
  shield: 0x0088ff,
  weapon: 0xffff00,
  energy: 0xff00ff,
};

function spawnPowerup() {
  const types = ['health', 'shield', 'weapon', 'energy'];
  const type = types[Math.floor(Math.random() * types.length)];
  spawnPowerupAt((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, -30, type);
}

function spawnPowerupAt(x, y, z, type) {
  const powerups = gameData.powerups;
  const powerup = {
    type: type,
    x: x,
    y: y,
    z: z,
    speed: 8 * 0.5,
    rotationY: 0,
    mesh: nova64.scene.createCube(0.8, powerupColors[type] || 0xffffff, [x, y, z]),
  };
  powerups.push(powerup);
}

function updateExplosions(dt) {
  const explosions = gameData.explosions;

  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    explosion.life -= dt;
    explosion.scale += dt * 3;

    nova64.scene.setScale(explosion.mesh, explosion.scale);

    if (explosion.life <= 0) {
      nova64.scene.destroyMesh(explosion.mesh);
      explosions.splice(i, 1);
    }
  }
}

function createExplosion(x, y, z) {
  const explosions = gameData.explosions;

  const explosion = {
    mesh: nova64.scene.createSphere(0.5, 0xff6600, [x, y, z]),
    life: 0.5,
    scale: 0.1,
  };

  explosions.push(explosion);
}

function updateStarField(dt) {
  const stars = gameData.stars;

  for (const star of stars) {
    const pos = nova64.scene.getPosition(star.mesh);
    pos[2] += star.speed * dt;

    // Twinkle effect
    star.twinkle += dt * 5;
    const brightness = 0.5 + Math.sin(star.twinkle) * 0.5;
    nova64.scene.setScale(star.mesh, brightness * 2 + 0.5);

    if (pos[2] > 10) {
      pos[2] = star.originalZ - 100;
    }

    nova64.scene.setPosition(star.mesh, pos[0], pos[1], pos[2]);
  }
}

function checkCollisions(_dt) {
  const playerBullets = gameData.playerBullets;
  const enemyBullets = gameData.enemyBullets;
  const enemies = gameData.enemies;
  const player = gameData.player;
  let score = gameData.score;
  let lives = gameData.lives;

  // Player bullets vs enemies
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];
    const bulletPos = nova64.scene.getPosition(bullet.mesh);

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (!enemy.alive) continue;

      const distance = Math.sqrt(
        Math.pow(bulletPos[0] - enemy.x, 2) +
          Math.pow(bulletPos[1] - enemy.y, 2) +
          Math.pow(bulletPos[2] - enemy.z, 2)
      );

      let collisionRadius = enemy.type === 'boss' ? 4.0 : 1.5;
      if (distance < collisionRadius) {
        // Hit!
        enemy.health -= bullet.damage;
        enemy.hitFlash = 1.0; // Flash white on hit
        nova64.audio.sfx('hit');
        nova64.scene.destroyMesh(bullet.mesh);
        playerBullets.splice(i, 1);

        if (enemy.health <= 0) {
          gameData.combo++;
          gameData.comboTimer = 2.0;
          let multiplier = Math.min(gameData.combo, 10);

          // Enemy destroyed
          nova64.audio.sfx('explosion');
          if (enemy.type === 'boss') {
            createExplosion(enemy.x, enemy.y, enemy.z);
            createExplosion(enemy.x - 2, enemy.y, enemy.z);
            createExplosion(enemy.x + 2, enemy.y, enemy.z);
            createExplosion(enemy.x, enemy.y + 2, enemy.z);
            if (enemy.mesh.body) nova64.scene.destroyMesh(enemy.mesh.body);
            if (enemy.mesh.wingL) nova64.scene.destroyMesh(enemy.mesh.wingL);
            if (enemy.mesh.wingR) nova64.scene.destroyMesh(enemy.mesh.wingR);
            score += 5000 * multiplier;
            gameData.flags.bossActive = false;
            // Boss always drops weapon upgrade
            spawnPowerupAt(enemy.x, enemy.y, enemy.z, 'weapon');
          } else {
            createExplosion(enemy.x, enemy.y, enemy.z);
            if (enemy.mesh.body) nova64.scene.destroyMesh(enemy.mesh.body);
            if (enemy.mesh.engine) nova64.scene.destroyMesh(enemy.mesh.engine);
            let baseScore = enemy.type === 'tank' ? 300 : enemy.type === 'fast' ? 200 : 100;
            score += baseScore * multiplier;
            // Chance to drop powerup on kill
            let dropChance = enemy.type === 'tank' ? 0.4 : enemy.type === 'fast' ? 0.25 : 0.15;
            if (Math.random() < dropChance) {
              const dropTypes = ['health', 'shield', 'weapon', 'energy'];
              spawnPowerupAt(
                enemy.x,
                enemy.y,
                enemy.z,
                dropTypes[Math.floor(Math.random() * dropTypes.length)]
              );
            }
          }
          enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  // Enemy bullets vs player
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    const bulletPos = nova64.scene.getPosition(bullet.mesh);

    const distance = Math.sqrt(
      Math.pow(bulletPos[0] - player.x, 2) +
        Math.pow(bulletPos[1] - player.y, 2) +
        Math.pow(bulletPos[2] - player.z, 2)
    );

    if (distance < 2.0) {
      if (player.shield > 0) {
        player.shield -= 15;
        nova64.audio.sfx('hit');
      } else {
        player.health -= 25;
        nova64.audio.sfx('hit');
      }

      nova64.scene.destroyMesh(bullet.mesh);
      enemyBullets.splice(i, 1);

      if (player.health <= 0) {
        lives--;
        player.health = 100;
        nova64.audio.sfx('death');
        if (lives <= 0) {
          gameState = 'gameOver';
        }
      }
    }
  }

  // Player vs powerups
  const powerups = gameData.powerups;
  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    const distance = Math.sqrt(
      Math.pow(powerup.x - player.x, 2) +
        Math.pow(powerup.y - player.y, 2) +
        Math.pow(powerup.z - player.z, 2)
    );

    if (distance < 2.0) {
      // Collect powerup
      switch (powerup.type) {
        case 'health':
          player.health = Math.min(100, player.health + 25);
          break;
        case 'shield':
          player.shield = Math.min(100, player.shield + 50);
          break;
        case 'weapon':
          player.weaponLevel = Math.min(3, player.weaponLevel + 1);
          break;
        case 'energy':
          player.energy = 100;
          break;
      }

      nova64.scene.destroyMesh(powerup.mesh);
      powerups.splice(i, 1);
      score += 50;
      nova64.audio.sfx(powerup.type === 'weapon' ? 'powerup' : 'coin');
    }
  }

  gameData.score = score;
  gameData.lives = lives;
}

function updateGameLogic(dt) {
  const enemies = gameData.enemies;
  let level = gameData.level;
  const lives = gameData.lives;

  if (gameData.comboTimer > 0) {
    gameData.comboTimer -= dt;
    if (gameData.comboTimer <= 0) {
      gameData.comboTimer = 0;
      gameData.combo = 0;
    }
  }

  // Wave warning timer
  if (gameData.waveWarning === undefined) gameData.waveWarning = 0;
  if (gameData.waveWarning > 0) gameData.waveWarning -= dt;

  // Spawn new wave when all enemies are cleared
  if (enemies.length === 0 && !gameData.waveClearPause) {
    gameData.waveClearPause = true;
    gameData.waveClearTimer = 2.0;
    // Wave clear bonus
    if (level > 0) {
      gameData.score += level * 500;
      nova64.audio.sfx('powerup');
    }
  }

  if (gameData.waveClearPause) {
    gameData.waveClearTimer -= dt;
    if (gameData.waveClearTimer <= 0) {
      gameData.waveClearPause = false;
      level++;
      gameData.level = level;
      gameData.waveWarning = 2.0;
      spawnEnemyWave();
    }
    return;
  }

  // Game over check
  if (lives <= 0) {
    gameState = 'gameOver';
  }
}

function updateCamera(_dt) {
  const player = gameData.player;

  // Dynamic camera movement based on player position
  const targetX = player.x * 0.1;
  const targetY = 2 + player.y * 0.05;

  nova64.camera.setCameraPosition(targetX, targetY, 0);
  nova64.camera.setCameraTarget(player.x * 0.3, player.y * 0.2, -10);
}

function drawUI() {
  // HUD Background
  nova64.draw.rect(16, 16, 400, 80, nova64.draw.rgba8(0, 0, 0, 150), true);
  nova64.draw.rect(16, 16, 400, 80, nova64.draw.rgba8(0, 100, 200, 100), false);

  // Score and Level
  nova64.draw.print(
    `SCORE: ${gameData.score.toString().padStart(8, '0')}`,
    24,
    24,
    nova64.draw.rgba8(255, 255, 0, 255)
  );
  nova64.draw.print(`LEVEL: ${gameData.level}`, 24, 40, nova64.draw.rgba8(0, 255, 255, 255));
  nova64.draw.print(`LIVES: ${gameData.lives}`, 24, 56, nova64.draw.rgba8(255, 100, 100, 255));

  if (gameData.combo > 1) {
    let c = Math.min(gameData.combo, 10);
    nova64.draw.print(`COMBO x${c}`, 24, 72, nova64.draw.rgba8(255, 150, 0, 255));
  }

  // Health bar
  nova64.draw.print('HULL:', 200, 24, nova64.draw.rgba8(255, 255, 255, 255));
  nova64.draw.rect(240, 22, 100, 8, nova64.draw.rgba8(100, 0, 0, 255), true);
  nova64.draw.rect(
    240,
    22,
    Math.floor((gameData.player.health / 100) * 100),
    8,
    nova64.draw.rgba8(255, 0, 0, 255),
    true
  );

  // Shield bar
  nova64.draw.print('SHIELD:', 200, 40, nova64.draw.rgba8(255, 255, 255, 255));
  nova64.draw.rect(260, 38, 100, 8, nova64.draw.rgba8(0, 0, 100, 255), true);
  nova64.draw.rect(
    260,
    38,
    Math.floor((gameData.player.shield / 100) * 100),
    8,
    nova64.draw.rgba8(0, 100, 255, 255),
    true
  );

  // Energy bar
  nova64.draw.print('ENERGY:', 200, 56, nova64.draw.rgba8(255, 255, 255, 255));
  nova64.draw.rect(260, 54, 100, 8, nova64.draw.rgba8(100, 0, 100, 255), true);
  nova64.draw.rect(
    260,
    54,
    Math.floor((gameData.player.energy / 100) * 100),
    8,
    nova64.draw.rgba8(255, 0, 255, 255),
    true
  );

  // 3D Stats
  const stats = nova64.scene.get3DStats();
  if (stats) {
    nova64.draw.print(
      `3D: ${stats.meshes || 0} meshes`,
      450,
      24,
      nova64.draw.rgba8(150, 150, 150, 255)
    );
    nova64.draw.print(
      `GPU: ${stats.renderer || 'ThreeJS'}`,
      450,
      40,
      nova64.draw.rgba8(150, 150, 150, 255)
    );
  }

  // Boss health bar
  if (gameData.flags.bossActive) {
    const boss = gameData.enemies.find(e => e.type === 'boss');
    if (boss) {
      const bw = 300;
      const bx = (640 - bw) / 2;
      const phaseName = ['PHASE 1', 'PHASE 2 - ENRAGED', 'PHASE 3 - DESPERATE'][
        gameData.flags.bossPhase || 0
      ];
      nova64.draw.print('BOSS', bx, 96, nova64.draw.rgba8(255, 50, 50));
      nova64.draw.print(phaseName, bx + 50, 96, nova64.draw.rgba8(255, 200, 50));
      nova64.draw.rect(bx, 108, bw, 10, nova64.draw.rgba8(80, 0, 0), true);
      const hp = Math.max(0, boss.health / boss.maxHealth);
      nova64.draw.rect(bx, 108, Math.floor(hp * bw), 10, nova64.draw.rgba8(255, 0, 0), true);
      nova64.draw.rect(bx, 108, bw, 10, nova64.draw.rgba8(200, 100, 100), false);
    }
  }

  // Wave clear bonus display
  if (gameData.waveClearPause && gameData.level > 0) {
    const alpha = Math.floor(Math.min(1, gameData.waveClearTimer) * 255);
    nova64.draw.printCentered(
      `WAVE ${gameData.level} CLEAR!`,
      320,
      160,
      nova64.draw.rgba8(0, 255, 100, alpha),
      2
    );
    nova64.draw.printCentered(
      `+${gameData.level * 500} BONUS`,
      320,
      190,
      nova64.draw.rgba8(255, 255, 0, alpha)
    );
  }

  // Wave warning
  if (gameData.waveWarning > 0) {
    const alpha = Math.floor(Math.min(1, gameData.waveWarning) * 255);
    const warnText =
      gameData.level % 5 === 0 ? 'WARNING: BOSS INCOMING!' : `WAVE ${gameData.level}`;
    nova64.draw.printCentered(warnText, 320, 180, nova64.draw.rgba8(255, 100, 0, alpha), 2);
  }

  // Weapon level indicator
  const wpnColors = [
    nova64.draw.rgba8(255, 255, 0),
    nova64.draw.rgba8(0, 255, 255),
    nova64.draw.rgba8(255, 100, 255),
  ];
  nova64.draw.print(
    `WPN LV${gameData.player.weaponLevel}`,
    24,
    80,
    wpnColors[gameData.player.weaponLevel - 1] || nova64.draw.rgba8(255, 255, 255)
  );

  // Controls
  nova64.draw.print(
    'ARROWS=MOVE  X=FIRE  Z=CHARGE',
    24,
    340,
    nova64.draw.rgba8(150, 150, 150, 200)
  );
}
