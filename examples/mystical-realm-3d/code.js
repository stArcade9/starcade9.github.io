// MYSTICAL REALM 3D - Creative Nintendo 64/PlayStation style fantasy world
// Showcases advanced 3D features: dynamic lighting, particle systems, procedural generation

// Game state management
const { cls, drawPanel, drawProgressBar, print, rect, rgba8 } = nova64.draw;
const {
  createAdvancedCube,
  createAdvancedSphere,
  createCube,
  createInstancedMesh,
  createPlane,
  createSphere,
  finalizeInstances,
  get3DStats,
  getPosition,
  removeMesh,
  rotateMesh,
  setInstanceTransform,
  setMeshVisible,
  setPosition,
  setRotation,
} = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog, setLightColor, setLightDirection } = nova64.light;
const { enableBloom, enableDithering, enableFXAA, enablePixelation, enableVignette } = nova64.fx;
const { key, keyp } = nova64.input;
const { sfx } = nova64.audio;
const {
  centerY,
  createButton,
  createPanel,
  drawAllButtons,
  drawGradientRect,
  drawText,
  drawTextOutline,
  drawTextShadow,
  setFont,
  setTextAlign,
  uiColors,
  updateAllButtons,
} = nova64.ui;
const {
  arc,
  createCooldown,
  createShake,
  getShakeOffset,
  triggerShake,
  updateCooldown,
  updateShake,
  useCooldown,
} = nova64.util;

let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
let startScreenTime = 0;
let uiButtons = [];
let score = 0;
let crystalsCollected = 0;
let creaturesKept = 0;
let playTime = 0;
let magicBolts = []; // { mesh, x, y, z, vx, vy, vz, life }

let world = {
  terrain: [],
  crystals: [],
  particles: [],
  creatures: [],
  weather: { type: 'clear', intensity: 0 },
};

let player = {
  x: 0,
  y: 5,
  z: 0,
  rotation: 0,
  speed: 8,
  jumpVelocity: 0,
  onGround: false,
  health: 100,
  maxHealth: 100,
  magicCooldown: 0,
  magicCharges: 3,
  maxMagicCharges: 3,
  magicRechargeTimer: 0,
};

let camera = {
  offset: { x: 0, y: 12, z: 20 },
  target: { x: 0, y: 0, z: 0 },
};

let shake;
let magicCD;

let time = 0;
let dayNightCycle = 0;
let lightningTimer = 0;

// GPU instancing for trees (new feature)
let treeTrunkInstanceId = null;
let treeCrownInstanceId = null;
let treeMeta = []; // [{x, z, swayPhase}]

export async function init() {
  nova64.draw.cls();

  console.log('🏰 Initializing Mystical Realm 3D...');

  shake = nova64.util.createShake({ decay: 5 });
  magicCD = nova64.util.createCooldown(0.35);

  // Setup camera
  nova64.camera.setCameraPosition(camera.offset.x, camera.offset.y, camera.offset.z);
  nova64.camera.setCameraTarget(0, 0, 0);
  nova64.camera.setCameraFOV(65);

  // Enable all retro effects for maximum N64/PSX nostalgia
  nova64.fx.enablePixelation(1);
  nova64.fx.enableDithering(true);
  nova64.fx.enableBloom(0.7, 0.5, 0.5); // Soft magical glow
  nova64.fx.enableFXAA(); // Smooth edges
  nova64.fx.enableVignette(1.2, 0.9); // Cinematic border

  // Generate the mystical world
  await generateTerrain();
  await spawnCrystals();
  await createCreatures();

  // Set initial lighting
  updateLighting();

  // Initialize start screen
  initStartScreen();

  console.log('✨ Mystical Realm 3D loaded! Explore the fantasy world!');
}

function initStartScreen() {
  uiButtons = [];

  // START button
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(220),
      150,
      220,
      55,
      '▶ BEGIN QUEST',
      () => {
        console.log('🎯 BEGIN QUEST CLICKED! Changing gameState to playing...');
        gameState = 'playing';
        playTime = 0;
        score = 0;
        crystalsCollected = 0;
        console.log('✅ gameState is now:', gameState);
        console.log('🏰 Quest begun!');
      },
      {
        normalColor: nova64.draw.rgba8(100, 50, 200, 255),
        hoverColor: nova64.draw.rgba8(130, 70, 230, 255),
        pressedColor: nova64.draw.rgba8(70, 30, 160, 255),
      }
    )
  );

  // CONTROLS button
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(220),
      290,
      220,
      45,
      '? CONTROLS',
      () => {
        console.log('🎮 WASD/Arrows = Move, SPACE = Jump, Collect crystals!');
      },
      {
        normalColor: uiColors.primary,
        hoverColor: nova64.draw.rgba8(50, 150, 255, 255),
        pressedColor: nova64.draw.rgba8(20, 100, 200, 255),
      }
    )
  );
}

async function generateTerrain() {
  console.log('🌍 Generating mystical terrain...');

  // Create main ground plane with texture-like pattern
  const mainGround = nova64.scene.createPlane(100, 100, 0x2a4a2a, [0, 0, 0]);
  nova64.scene.setRotation(mainGround, -Math.PI / 2, 0, 0);
  world.terrain.push({ mesh: mainGround, type: 'ground' });

  // Generate procedural hills and mountains
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    const height = 3 + Math.random() * 8;
    const width = 4 + Math.random() * 6;

    const hill = nova64.scene.createCube(width, height, width, 0x3a5a3a, [x, height / 2, z]);
    world.terrain.push({
      mesh: hill,
      type: 'hill',
      originalY: height / 2,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  // Create mystical stone circles
  for (let circle = 0; circle < 3; circle++) {
    const centerX = (Math.random() - 0.5) * 60;
    const centerZ = (Math.random() - 0.5) * 60;
    const radius = 8 + Math.random() * 4;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      const height = 6 + Math.random() * 4;

      const stone = nova64.scene.createAdvancedCube(
        1.5,
        {
          color: 0x555555,
          emissive: 0x111144,
          emissiveIntensity: 0.4,
          metallic: true,
          animated: true,
        },
        [x, height / 2, z]
      );

      world.terrain.push({
        mesh: stone,
        type: 'monolith',
        originalY: height / 2,
        glowPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  // Ancient trees — GPU instanced (30 draw calls → 2)
  treeTrunkInstanceId = nova64.scene.createInstancedMesh('cube', 15, 0x4a3a2a, { size: 1 });
  treeCrownInstanceId = nova64.scene.createInstancedMesh('sphere', 15, 0x2a5a2a, {
    size: 4,
    segments: 8,
  });
  treeMeta = [];
  for (let i = 0; i < 15; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = (Math.random() - 0.5) * 90;
    treeMeta.push({ x, z, swayPhase: Math.random() * Math.PI * 2 });
    nova64.scene.setInstanceTransform(treeTrunkInstanceId, i, x, 4, z, 0, 0, 0, 1, 8, 1);
    nova64.scene.setInstanceTransform(treeCrownInstanceId, i, x, 10, z);
  }
  nova64.scene.finalizeInstances(treeTrunkInstanceId);
  nova64.scene.finalizeInstances(treeCrownInstanceId);
}

async function spawnCrystals() {
  console.log('💎 Spawning mystical crystals...');

  for (let i = 0; i < 25; i++) {
    const x = (Math.random() - 0.5) * 70;
    const z = (Math.random() - 0.5) * 70;
    const y = 2;

    // Create stunning holographic crystals
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
    const emissiveColors = [0x331111, 0x113311, 0x111133, 0x333311, 0x331133, 0x113333];
    const colorIndex = Math.floor(Math.random() * colors.length);

    const crystal = nova64.scene.createAdvancedSphere(
      0.8,
      {
        color: colors[colorIndex],
        emissive: emissiveColors[colorIndex],
        emissiveIntensity: 0.7,
        holographic: true,
        animated: true,
        metallic: Math.random() > 0.5,
        transparent: true,
        opacity: 0.9,
      },
      [x, y, z],
      12
    );

    world.crystals.push({
      mesh: crystal,
      x,
      y,
      z,
      color: colors[colorIndex],
      rotationSpeed: 1 + Math.random() * 2,
      bobPhase: Math.random() * Math.PI * 2,
      glowIntensity: Math.random(),
      collected: false,
    });
  }
}

async function createCreatures() {
  console.log('🦋 Creating mystical creatures...');

  // Flying magical orbs — passive, high altitude
  for (let i = 0; i < 8; i++) {
    const orb = nova64.scene.createAdvancedSphere(
      0.5,
      {
        color: 0xffff88,
        emissive: 0x888844,
        emissiveIntensity: 1.0,
        holographic: true,
        animated: true,
        transparent: true,
        opacity: 0.8,
      },
      [0, 15, 0],
      16
    );

    world.creatures.push({
      mesh: orb,
      type: 'orb',
      x: (Math.random() - 0.5) * 60,
      y: 15 + Math.random() * 10,
      z: (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 1,
      vz: (Math.random() - 0.5) * 2,
      glowPhase: Math.random() * Math.PI * 2,
      trail: [],
      stunTimer: 0,
      caught: false,
      aggressive: false,
      atk: 0,
    });
  }

  // Shadow wisps — ground-level, aggressive, chase the player
  for (let i = 0; i < 6; i++) {
    const wisp = nova64.scene.createAdvancedSphere(
      0.6,
      {
        color: 0x9933cc,
        emissive: 0x440066,
        emissiveIntensity: 0.9,
        holographic: true,
        animated: true,
        transparent: true,
        opacity: 0.85,
      },
      [0, 3, 0],
      12
    );

    world.creatures.push({
      mesh: wisp,
      type: 'wisp',
      x: (Math.random() - 0.5) * 70,
      y: 3,
      z: (Math.random() - 0.5) * 70,
      vx: 0,
      vy: 0,
      vz: 0,
      glowPhase: Math.random() * Math.PI * 2,
      trail: [],
      stunTimer: 0,
      caught: false,
      aggressive: true,
      atk: 8,
      aggroRange: 18,
      speed: 5 + Math.random() * 3,
      attackCD: 0,
    });
  }

  // Fire sprites — fast, aggressive, appear near monoliths
  for (let i = 0; i < 4; i++) {
    const sprite = nova64.scene.createAdvancedSphere(
      0.4,
      {
        color: 0xff4400,
        emissive: 0x882200,
        emissiveIntensity: 1.0,
        holographic: true,
        animated: true,
        transparent: true,
        opacity: 0.9,
      },
      [0, 4, 0],
      10
    );

    world.creatures.push({
      mesh: sprite,
      type: 'fire',
      x: (Math.random() - 0.5) * 50,
      y: 4,
      z: (Math.random() - 0.5) * 50,
      vx: 0,
      vy: 0,
      vz: 0,
      glowPhase: Math.random() * Math.PI * 2,
      trail: [],
      stunTimer: 0,
      caught: false,
      aggressive: true,
      atk: 12,
      aggroRange: 14,
      speed: 8 + Math.random() * 3,
      attackCD: 0,
    });
  }
}

export function update(dt) {
  // Handle start screen
  if (gameState === 'start') {
    startScreenTime += dt;
    nova64.ui.updateAllButtons();
    // Still update world animations in background
    time += dt;
    dayNightCycle += dt * 0.1;
    updateTerrain(dt);
    updateCrystals(dt);
    updateLighting();
    return;
  }

  // Handle game over
  if (gameState === 'gameover') {
    nova64.ui.updateAllButtons();
    return;
  }

  // Handle win
  if (gameState === 'win') {
    time += dt;
    nova64.ui.updateAllButtons();
    return;
  }

  // Playing state
  time += dt;
  dayNightCycle += dt * 0.1;
  playTime += dt;

  // Update player movement
  updatePlayer(dt);

  // Update camera
  updateCamera(dt);

  // Update world elements
  updateTerrain(dt);
  updateCrystals(dt);
  updateCreatures(dt);
  updateWeather(dt);

  // Update lighting based on time of day
  updateLighting();

  // Particle system
  _local_updateParticles(dt);

  // Check for crystal collection
  checkCrystalCollection();

  // Magic bolts and creature catching
  updateMagicBolts(dt);
  checkCreatureCollection();
  checkWinCondition();

  // Check game over
  if (player.health <= 0 && gameState === 'playing') {
    gameState = 'gameover';
    initGameOverScreen();
  }
}

function updatePlayer(dt) {
  // Simple physics
  player.jumpVelocity -= 25 * dt; // gravity
  player.y += player.jumpVelocity * dt;

  // Ground collision
  if (player.y <= 2) {
    player.y = 2;
    player.jumpVelocity = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  // Input handling
  let inputX = 0,
    inputZ = 0;

  if (nova64.input.key('KeyW') || nova64.input.key('ArrowUp')) inputZ = -1;
  if (nova64.input.key('KeyS') || nova64.input.key('ArrowDown')) inputZ = 1;
  if (nova64.input.key('KeyA') || nova64.input.key('ArrowLeft')) inputX = -1;
  if (nova64.input.key('KeyD') || nova64.input.key('ArrowRight')) inputX = 1;

  if (nova64.input.key('Space') && player.onGround) {
    player.jumpVelocity = 12;
    player.onGround = false;
  }

  // Movement
  if (inputX !== 0 || inputZ !== 0) {
    const moveSpeed = player.speed * dt;
    player.x += inputX * moveSpeed;
    player.z += inputZ * moveSpeed;

    // Rotation based on movement
    if (inputX !== 0 || inputZ !== 0) {
      player.rotation = Math.atan2(inputX, inputZ);
    }
  }

  // Magic recharge
  nova64.util.updateCooldown(magicCD, dt);
  player.magicRechargeTimer -= dt;
  if (player.magicRechargeTimer <= 0 && player.magicCharges < player.maxMagicCharges) {
    player.magicCharges++;
    player.magicRechargeTimer = 3;
  }

  // Cast magic bolt
  if (nova64.input.keyp('KeyE') && player.magicCharges > 0 && nova64.util.useCooldown(magicCD)) {
    fireMagicBolt();
    nova64.audio.sfx('jump');
  }

  // Keep player in bounds
  player.x = Math.max(-45, Math.min(45, player.x));
  player.z = Math.max(-45, Math.min(45, player.z));
}

function fireMagicBolt() {
  const dx = -Math.sin(player.rotation);
  const dz = -Math.cos(player.rotation);
  const speed = 28;
  magicBolts.push({
    mesh: nova64.scene.createSphere(0.35, 0xff44ff, [player.x + dx, player.y + 1.5, player.z + dz]),
    x: player.x + dx,
    y: player.y + 1.5,
    z: player.z + dz,
    vx: dx * speed,
    vy: 1.5,
    vz: dz * speed,
    life: 2.5,
  });
  player.magicCharges--;
  nova64.util.triggerShake(shake, 0.8);
}

function updateMagicBolts(dt) {
  for (let i = magicBolts.length - 1; i >= 0; i--) {
    const bolt = magicBolts[i];
    bolt.life -= dt;
    if (bolt.life <= 0) {
      nova64.scene.removeMesh(bolt.mesh);
      magicBolts.splice(i, 1);
      continue;
    }
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.z += bolt.vz * dt;
    bolt.vy -= 4 * dt; // gentle arc
    nova64.scene.setPosition(bolt.mesh, bolt.x, bolt.y, bolt.z);

    // Check hit on creatures
    world.creatures.forEach(creature => {
      if (creature.caught || creature.stunTimer > 0) return;
      const dx = bolt.x - creature.x;
      const dy = bolt.y - creature.y;
      const dz = bolt.z - creature.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 2.5) {
        creature.stunTimer = 5;
        creature.vx = 0;
        creature.vy = 0;
        creature.vz = 0;
        nova64.scene.removeMesh(bolt.mesh);
        magicBolts.splice(i, 1);
        score += 10;
        nova64.util.triggerShake(shake, 1.5);
        nova64.audio.sfx('explosion');
      }
    });
  }
}

function checkCreatureCollection() {
  world.creatures.forEach(creature => {
    if (creature.caught || creature.stunTimer <= 0) return;
    const dx = player.x - creature.x;
    const dy = player.y - creature.y;
    const dz = player.z - creature.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 3) {
      creature.caught = true;
      nova64.scene.setMeshVisible(creature.mesh, false);
      creaturesKept++;
      score += 50;
      nova64.util.triggerShake(shake, 2);
      nova64.audio.sfx('coin');
      // Particle burst
      for (let i = 0; i < 8; i++) spawnParticle(creature.x, creature.y, creature.z, 0xff88ff);
    }
  });
}

function checkWinCondition() {
  if (gameState !== 'playing') return;
  const allCrystals = world.crystals.every(c => c.collected);
  const allCreatures = world.creatures.every(c => c.caught);
  if (allCrystals && allCreatures) {
    gameState = 'win';
    initWinScreen();
  }
}

function initWinScreen() {
  uiButtons = [];
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(200),
      340,
      200,
      50,
      '↻ PLAY AGAIN',
      () => {
        resetGame();
        gameState = 'playing';
      },
      {
        normalColor: uiColors.success,
        hoverColor: nova64.draw.rgba8(60, 220, 120, 255),
        pressedColor: nova64.draw.rgba8(30, 160, 80, 255),
      }
    )
  );
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(200),
      405,
      200,
      45,
      '← MAIN MENU',
      () => {
        resetGame();
        gameState = 'start';
        initStartScreen();
      },
      {
        normalColor: uiColors.primary,
        hoverColor: nova64.draw.rgba8(50, 150, 255, 255),
        pressedColor: nova64.draw.rgba8(20, 100, 200, 255),
      }
    )
  );
}

function drawWinScreen() {
  nova64.ui.drawGradientRect(
    0,
    0,
    640,
    480,
    nova64.draw.rgba8(10, 30, 10, 220),
    nova64.draw.rgba8(20, 80, 20, 240),
    true
  );
  const glow = (Math.sin(time * 3) + 1) * 0.5;
  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawTextShadow(
    'QUEST COMPLETE!',
    320,
    60,
    nova64.draw.rgba8(255, 215, 0, 255),
    nova64.draw.rgba8(0, 0, 0, 255),
    5,
    1
  );
  nova64.ui.setFont('large');
  nova64.ui.drawText(
    'The realm is saved!',
    320,
    130,
    nova64.draw.rgba8(Math.floor(100 + 155 * glow), 255, 100, 255),
    1
  );
  const panel = nova64.ui.createPanel(nova64.ui.centerX(420), 170, 420, 140, {
    bgColor: nova64.draw.rgba8(20, 40, 20, 220),
    borderColor: nova64.draw.rgba8(100, 200, 100, 255),
    borderWidth: 3,
    shadow: true,
    title: 'FINAL SCORE',
    titleBgColor: nova64.draw.rgba8(60, 160, 60, 255),
  });
  nova64.draw.drawPanel(panel);
  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('center');
  const minutes = Math.floor(playTime / 60);
  const seconds = Math.floor(playTime % 60);
  nova64.ui.drawText(`Score: ${score}`, 320, 215, nova64.draw.rgba8(255, 215, 0, 255), 1);
  nova64.ui.drawText(
    `Crystals: ${crystalsCollected} / ${world.crystals.length}`,
    320,
    240,
    uiColors.light,
    1
  );
  nova64.ui.drawText(
    `Creatures caught: ${creaturesKept} / ${world.creatures.length}`,
    320,
    265,
    uiColors.light,
    1
  );
  nova64.ui.drawText(`Time: ${minutes}m ${seconds}s`, 320, 290, uiColors.secondary, 1);
  nova64.ui.drawAllButtons();
}

function updateCamera(dt) {
  // Smooth camera follow
  const targetX = player.x + camera.offset.x;
  const targetY = player.y + camera.offset.y;
  const targetZ = player.z + camera.offset.z;

  // Add camera shake for dramatic effect
  nova64.util.updateShake(shake, dt);
  const [shakeX, shakeY] = nova64.util.getShakeOffset(shake);

  nova64.camera.setCameraPosition(targetX + shakeX, targetY + shakeY, targetZ);
  nova64.camera.setCameraTarget(player.x, player.y + 2, player.z);
}

function updateTerrain(dt) {
  world.terrain.forEach(element => {
    if (element.type === 'hill') {
      // Gentle bobbing motion
      element.bobPhase += dt;
      const bobY = Math.sin(element.bobPhase * 0.5) * 0.2;
      nova64.scene.setPosition(
        element.mesh,
        nova64.scene.getPosition(element.mesh)[0],
        element.originalY + bobY,
        nova64.scene.getPosition(element.mesh)[2]
      );
    } else if (element.type === 'monolith') {
      // Mysterious glowing
      element.glowPhase += dt * 3;
      const glow = (Math.sin(element.glowPhase) + 1) * 0.5;
      // Color intensity varies
    }
  });

  // Animate instanced tree crowns (sway in wind)
  if (treeCrownInstanceId !== null && treeMeta.length > 0) {
    for (let i = 0; i < treeMeta.length; i++) {
      const t = treeMeta[i];
      t.swayPhase += dt * 2;
      const swayX = Math.sin(t.swayPhase) * 0.3;
      nova64.scene.setInstanceTransform(treeCrownInstanceId, i, t.x + swayX, 10, t.z);
    }
    nova64.scene.finalizeInstances(treeCrownInstanceId);
  }
}

function updateCrystals(dt) {
  world.crystals.forEach(crystal => {
    if (crystal.collected) return;

    // Rotation
    nova64.scene.rotateMesh(crystal.mesh, 0, dt * crystal.rotationSpeed, 0);

    // Bobbing motion
    crystal.bobPhase += dt * 2;
    const bobY = Math.sin(crystal.bobPhase) * 0.5;
    nova64.scene.setPosition(crystal.mesh, crystal.x, crystal.y + bobY, crystal.z);

    // Glowing effect
    crystal.glowIntensity += dt * 2;
  });
}

function updateCreatures(dt) {
  world.creatures.forEach(creature => {
    if (creature.caught) return;

    if (creature.stunTimer > 0) {
      // Stunned — blink and drift toward ground
      creature.stunTimer -= dt;
      creature.glowPhase += dt * 20;
      nova64.scene.setMeshVisible(creature.mesh, Math.sin(creature.glowPhase * 5) > 0);
      const groundY = creature.type === 'orb' ? 4 : 2;
      creature.y = Math.max(groundY, creature.y - 4 * dt);
      nova64.scene.setPosition(creature.mesh, creature.x, creature.y, creature.z);
      return;
    }

    // Normal visible state
    nova64.scene.setMeshVisible(creature.mesh, true);
    creature.glowPhase += dt * 5;

    // Aggressive creatures chase and attack player
    if (creature.aggressive && creature.attackCD > 0) {
      creature.attackCD -= dt;
    }

    if (creature.type === 'orb') {
      // Flying movement — passive
      creature.x += creature.vx * dt;
      creature.y += creature.vy * dt;
      creature.z += creature.vz * dt;

      if (Math.abs(creature.x) > 40) creature.vx *= -0.8;
      if (creature.y < 10 || creature.y > 25) creature.vy *= -0.8;
      if (Math.abs(creature.z) > 40) creature.vz *= -0.8;

      if (Math.random() < 0.01) {
        creature.vx += (Math.random() - 0.5) * 2;
        creature.vy += (Math.random() - 0.5) * 1;
        creature.vz += (Math.random() - 0.5) * 2;
      }
    } else if (creature.type === 'wisp' || creature.type === 'fire') {
      // Aggressive ground creatures — chase player when in range
      const dx = player.x - creature.x;
      const dz = player.z - creature.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < creature.aggroRange && dist > 1.5) {
        const spd = creature.speed * dt;
        creature.x += (dx / dist) * spd;
        creature.z += (dz / dist) * spd;
      } else if (dist >= creature.aggroRange) {
        // Idle wander
        if (Math.random() < 0.02) {
          creature.vx = (Math.random() - 0.5) * 3;
          creature.vz = (Math.random() - 0.5) * 3;
        }
        creature.x += creature.vx * dt;
        creature.z += creature.vz * dt;
        creature.vx *= 0.98;
        creature.vz *= 0.98;
      }

      // Hover bob
      const baseY = creature.type === 'wisp' ? 3 : 4;
      creature.y = baseY + Math.sin(creature.glowPhase) * 0.5;

      // Deal damage on contact
      if (dist < 2.5 && creature.attackCD <= 0) {
        player.health -= creature.atk;
        creature.attackCD = 1.2;
        nova64.util.triggerShake(shake, 2);
        nova64.audio.sfx('explosion');
        for (let i = 0; i < 4; i++) spawnParticle(player.x, player.y + 1, player.z, 0xff2222);
      }

      // Keep in bounds
      creature.x = Math.max(-44, Math.min(44, creature.x));
      creature.z = Math.max(-44, Math.min(44, creature.z));
    }

    nova64.scene.setPosition(creature.mesh, creature.x, creature.y, creature.z);
  });
}

function updateWeather(dt) {
  // Weather system
  if (Math.random() < 0.001) {
    // Random weather change
    const weathers = ['clear', 'rain', 'storm', 'mystical'];
    world.weather.type = weathers[Math.floor(Math.random() * weathers.length)];
    world.weather.intensity = Math.random();
  }

  // Lightning effects during storms
  if (world.weather.type === 'storm') {
    lightningTimer += dt;
    if (lightningTimer > 2 + Math.random() * 3) {
      // Lightning flash
      nova64.light.setLightColor(0xffffff);
      nova64.util.triggerShake(shake, 3);
      lightningTimer = 0;
    }
  }
}

function updateLighting() {
  // Day/night cycle
  const dayPhase = (Math.sin(dayNightCycle) + 1) * 0.5;

  // Sunrise/sunset colors
  let lightColor = 0xffffff;
  let ambientColor = 0x404040;
  let fogColor = 0x202040;

  if (dayPhase < 0.3) {
    // Night
    lightColor = 0x4444aa;
    ambientColor = 0x202040;
    fogColor = 0x101030;
  } else if (dayPhase < 0.5) {
    // Dawn
    lightColor = 0xffaa44;
    ambientColor = 0x404030;
    fogColor = 0x403020;
  } else if (dayPhase < 0.8) {
    // Day
    lightColor = 0xffffdd;
    ambientColor = 0x606060;
    fogColor = 0x808080;
  } else {
    // Dusk
    lightColor = 0xff6644;
    ambientColor = 0x404020;
    fogColor = 0x402010;
  }

  // Apply lighting
  nova64.light.setLightDirection(-0.5, -1, -0.3);
  nova64.light.setLightColor(lightColor);
  nova64.light.setAmbientLight(ambientColor);
  nova64.light.setFog(fogColor, 30, 80);
}

function _local_updateParticles(dt) {
  // Simple particle system for mystical effects
  if (Math.random() < 0.1) {
    // Add sparkle particles around crystals
    world.crystals.forEach(crystal => {
      if (!crystal.collected && Math.random() < 0.05) {
        spawnParticle(crystal.x, crystal.y + 2, crystal.z, crystal.color);
      }
    });
  }
}

function spawnParticle(x, y, z, color) {
  const particle = nova64.scene.createSphere(0.1, color, [x, y, z]);
  world.particles.push({
    mesh: particle,
    x,
    y,
    z,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    vz: (Math.random() - 0.5) * 4,
    life: 2,
    maxLife: 2,
  });
}

function checkCrystalCollection() {
  world.crystals.forEach(crystal => {
    if (crystal.collected) return;

    const dx = player.x - crystal.x;
    const dy = player.y - crystal.y;
    const dz = player.z - crystal.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < 3) {
      crystal.collected = true;
      crystalsCollected++;
      score += 25;
      nova64.scene.setPosition(crystal.mesh, -1000, -1000, -1000);
      nova64.audio.sfx('coin');

      // Particle burst effect
      for (let i = 0; i < 10; i++) {
        spawnParticle(
          crystal.x + (Math.random() - 0.5) * 2,
          crystal.y + Math.random() * 2,
          crystal.z + (Math.random() - 0.5) * 2,
          crystal.color
        );
      }

      nova64.util.triggerShake(shake, 1);
    }
  });
}

export function draw() {
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

  // Handle win
  if (gameState === 'win') {
    drawWinScreen();
    return;
  }

  // Playing state - Atmospheric UI
  const dayPhase = (Math.sin(dayNightCycle) + 1) * 0.5;
  let timeOfDay = 'Day';
  if (dayPhase < 0.3) timeOfDay = 'Night';
  else if (dayPhase < 0.5) timeOfDay = 'Dawn';
  else if (dayPhase > 0.8) timeOfDay = 'Dusk';

  // Title and info
  nova64.draw.print('🏰 MYSTICAL REALM 3D', 8, 8, nova64.draw.rgba8(255, 215, 0, 255));
  nova64.draw.print(
    'Nintendo 64 / PlayStation Fantasy World',
    8,
    24,
    nova64.draw.rgba8(200, 150, 255, 255)
  );

  // Game stats
  const collectedCrystals = world.crystals.filter(c => c.collected).length;
  nova64.draw.print(
    `Time: ${timeOfDay} | Weather: ${world.weather.type}`,
    8,
    50,
    nova64.draw.rgba8(150, 200, 255, 255)
  );
  nova64.draw.print(
    `Crystals: ${collectedCrystals}/${world.crystals.length}`,
    8,
    66,
    nova64.draw.rgba8(255, 200, 100, 255)
  );
  const caughtCount = world.creatures.filter(c => c.caught).length;
  nova64.draw.print(
    `Creatures: ${caughtCount}/${world.creatures.length}`,
    8,
    82,
    nova64.draw.rgba8(255, 150, 255, 255)
  );
  nova64.draw.print(
    `Position: ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}`,
    8,
    98,
    nova64.draw.rgba8(100, 255, 150, 255)
  );

  // 3D stats
  const stats = nova64.scene.get3DStats();
  if (stats && stats.render) {
    nova64.draw.print(
      `3D Objects: ${world.terrain.length + world.crystals.length + world.creatures.length}`,
      8,
      114,
      nova64.draw.rgba8(150, 150, 255, 255)
    );
    nova64.draw.print(
      `GPU: ${stats.renderer || 'Three.js'} | Effects: Bloom+Dither+Pixel`,
      8,
      130,
      nova64.draw.rgba8(150, 150, 255, 255)
    );
  }

  // Magic charge indicator
  nova64.draw.print('Magic:', 8, 148, nova64.draw.rgba8(255, 100, 255, 255));
  for (let i = 0; i < player.maxMagicCharges; i++) {
    const filled = i < player.magicCharges;
    nova64.draw.print(
      filled ? '✦' : '✧',
      60 + i * 18,
      148,
      filled ? nova64.draw.rgba8(255, 100, 255, 255) : nova64.draw.rgba8(100, 50, 100, 180)
    );
  }

  // Controls
  nova64.draw.print(
    'WASD: Move | Space: Jump | E: Magic Bolt',
    8,
    300,
    nova64.draw.rgba8(200, 200, 200, 180)
  );
  nova64.draw.print(
    'Stun creatures with magic, walk into them to catch!',
    8,
    316,
    nova64.draw.rgba8(255, 255, 100, 200)
  );
  nova64.draw.print(
    'Collect all crystals + catch all creatures to win!',
    8,
    332,
    nova64.draw.rgba8(100, 255, 100, 180)
  );

  // Weather indicator
  if (world.weather.type === 'storm') {
    nova64.draw.print('⚡ STORM APPROACHING ⚡', 200, 8, nova64.draw.rgba8(255, 255, 0, 255));
  } else if (world.weather.type === 'mystical') {
    nova64.draw.print(
      '✨ Mystical energies swirl... ✨',
      200,
      8,
      nova64.draw.rgba8(255, 100, 255, 255)
    );
  }

  // Health bar
  const healthPct = player.health / player.maxHealth;
  const hpColor =
    healthPct > 0.5
      ? nova64.draw.rgba8(50, 200, 50, 255)
      : healthPct > 0.25
        ? nova64.draw.rgba8(220, 180, 30, 255)
        : nova64.draw.rgba8(200, 40, 40, 255);
  nova64.draw.drawProgressBar(
    16,
    168,
    160,
    10,
    healthPct,
    hpColor,
    nova64.draw.rgba8(20, 10, 30, 220)
  );
  nova64.draw.print(
    `HP ${player.health}/${player.maxHealth}`,
    16,
    158,
    nova64.draw.rgba8(255, 200, 255, 220)
  );
}

function drawStartScreen() {
  // Mystical gradient background
  nova64.ui.drawGradientRect(
    0,
    0,
    640,
    360,
    nova64.draw.rgba8(20, 10, 40, 220),
    nova64.draw.rgba8(50, 20, 80, 240),
    true
  );

  // Animated title with magical glow
  const glow = Math.sin(startScreenTime * 2) * 0.3 + 0.7;
  const glowColor = nova64.draw.rgba8(
    Math.floor(200 * glow),
    Math.floor(100 * glow),
    Math.floor(255 * glow),
    255
  );

  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  const bounce = Math.sin(startScreenTime * 2) * 12;
  nova64.ui.drawTextShadow(
    'MYSTICAL',
    320,
    50 + bounce,
    glowColor,
    nova64.draw.rgba8(0, 0, 0, 255),
    5,
    1
  );
  nova64.ui.drawTextShadow(
    'REALM',
    320,
    100 + bounce,
    nova64.draw.rgba8(255, 215, 0, 255),
    nova64.draw.rgba8(0, 0, 0, 255),
    5,
    1
  );

  // Subtitle with pulse
  nova64.ui.setFont('large');
  const pulse = Math.sin(startScreenTime * 3) * 0.2 + 0.8;
  nova64.ui.drawTextOutline(
    '3D Fantasy Adventure',
    320,
    150,
    nova64.draw.rgba8(150, 100, 255, Math.floor(pulse * 255)),
    nova64.draw.rgba8(0, 0, 0, 255),
    1
  );

  // Info panel
  const panel = nova64.ui.createPanel(nova64.ui.centerX(420), 340, 420, 200, {
    bgColor: nova64.draw.rgba8(20, 10, 40, 200),
    borderColor: nova64.draw.rgba8(100, 50, 200, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: nova64.draw.rgba8(40, 20, 60, 200),
  });
  nova64.draw.drawPanel(panel);

  // Quest description
  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawText('QUEST BRIEFING', 320, 185, nova64.draw.rgba8(255, 215, 0, 255), 1);

  nova64.ui.setFont('small');
  nova64.ui.drawText('A mystical realm awaits exploration', 320, 210, uiColors.light, 1);
  nova64.ui.drawText(
    'Collect magical crystals scattered across the land',
    320,
    225,
    uiColors.light,
    1
  );
  nova64.ui.drawText(
    'Navigate through day, night, and mystical storms',
    320,
    240,
    uiColors.light,
    1
  );

  nova64.ui.setFont('tiny');
  nova64.ui.drawText(
    'WASD = Move  |  Space = Jump  |  E = Magic Bolt',
    320,
    270,
    uiColors.secondary,
    1
  );
  nova64.ui.drawText(
    'Stun creatures • Catch them • Collect all crystals to WIN!',
    320,
    284,
    nova64.draw.rgba8(255, 100, 255, 180),
    1
  );

  // Draw buttons
  nova64.ui.drawAllButtons();

  // Pulsing start prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 5) * 0.5 + 0.5) * 255);
  nova64.ui.setFont('normal');
  nova64.ui.drawText(
    '▶ PRESS BEGIN QUEST TO START ◀',
    320,
    305,
    nova64.draw.rgba8(200, 100, 255, alpha),
    1
  );

  // Mystical particles hint
  nova64.ui.setFont('tiny');
  nova64.ui.drawText(
    'Nintendo 64 / PlayStation Style Graphics',
    320,
    340,
    nova64.draw.rgba8(150, 150, 200, 150),
    1
  );
}

function drawGameOverScreen() {
  // Dark mystical overlay
  nova64.draw.rect(0, 0, 640, 360, nova64.draw.rgba8(10, 5, 20, 220), true);

  // Game over title
  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  const flash = Math.floor(time * 2) % 2 === 0;
  const color = flash
    ? nova64.draw.rgba8(200, 100, 255, 255)
    : nova64.draw.rgba8(150, 50, 200, 255);
  nova64.ui.drawTextShadow('QUEST ENDED', 320, 80, color, nova64.draw.rgba8(0, 0, 0, 255), 5, 1);

  // Stats panel
  const statsPanel = nova64.ui.createPanel(
    nova64.ui.centerX(420),
    nova64.ui.centerY(220),
    420,
    220,
    {
      bgColor: nova64.draw.rgba8(20, 10, 40, 220),
      borderColor: nova64.draw.rgba8(100, 50, 200, 255),
      borderWidth: 3,
      shadow: true,
      title: 'FINAL STATISTICS',
      titleBgColor: nova64.draw.rgba8(100, 50, 200, 255),
    }
  );
  nova64.draw.drawPanel(statsPanel);

  // Stats
  nova64.ui.setFont('large');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawText(
    `Crystals Collected: ${crystalsCollected}`,
    320,
    200,
    nova64.draw.rgba8(255, 215, 0, 255),
    1
  );

  nova64.ui.setFont('normal');
  const minutes = Math.floor(playTime / 60);
  const seconds = Math.floor(playTime % 60);
  nova64.ui.drawText(`Time Played: ${minutes}m ${seconds}s`, 320, 235, uiColors.secondary, 1);
  nova64.ui.drawText(`Score: ${score}`, 320, 260, uiColors.success, 1);

  // Draw buttons
  nova64.ui.drawAllButtons();
}

function initGameOverScreen() {
  uiButtons = [];

  // Try again button
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(200),
      310,
      200,
      50,
      '↻ TRY AGAIN',
      () => {
        resetGame();
        gameState = 'playing';
      },
      {
        normalColor: uiColors.success,
        hoverColor: nova64.draw.rgba8(60, 220, 120, 255),
        pressedColor: nova64.draw.rgba8(30, 160, 80, 255),
      }
    )
  );

  // Main menu button
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(200),
      375,
      200,
      45,
      '← MAIN MENU',
      () => {
        resetGame();
        gameState = 'start';
        initStartScreen();
      },
      {
        normalColor: uiColors.primary,
        hoverColor: nova64.draw.rgba8(50, 150, 255, 255),
        pressedColor: nova64.draw.rgba8(20, 100, 200, 255),
      }
    )
  );
}

function resetGame() {
  player.health = player.maxHealth;
  player.x = 0;
  player.y = 5;
  player.z = 0;
  player.jumpVelocity = 0;
  player.magicCharges = player.maxMagicCharges;
  magicCD.remaining = 0;
  player.magicRechargeTimer = 0;
  playTime = 0;
  score = 0;
  crystalsCollected = 0;
  creaturesKept = 0;

  // Reset crystals
  world.crystals.forEach(c => (c.collected = false));

  // Reset creatures
  world.creatures.forEach(c => {
    c.stunTimer = 0;
    c.caught = false;
    nova64.scene.setMeshVisible(c.mesh, true);
  });

  // Remove stray magic bolts
  magicBolts.forEach(b => nova64.scene.removeMesh(b.mesh));
  magicBolts = [];
}
