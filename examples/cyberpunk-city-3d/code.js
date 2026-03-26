// CYBERPUNK CITY 3D - Ultimate Nintendo 64 Style 3D City
// Full GPU-accelerated 3D world with dynamic lighting, flying vehicles, and retro effects

let gameTime = 0;
let cityObjects = [];
let vehicles = [];
let particles = [];
let buildings = [];
let player = null;
let camera = { x: 0, y: 20, z: 30, targetX: 0, targetY: 10, targetZ: 0 };
let cityLights = [];
let neonSigns = [];
let flying = false;
let speed = 0;

// Screen management
let gameState = 'start'; // 'start', 'exploring'
let startScreenTime = 0;
let uiButtons = [];

let dataPackets = [];
let playerScore = 0;

// Mission system
let currentMission = null;
let missionIndex = 0;
let missionTimer = 0;
let missionMsg = '';
let missionMsgTimer = 0;

// Security drones
let drones = [];
let droneProjectiles = [];

// Player combat
let playerHealth = 100;
let playerMaxHealth = 100;
let playerDmgCD = 0;
let dronesDestroyed = 0;
let shake = null;
let checkpointMesh = null;
let checkpointGlow = null;

function spawnPackets() {
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * CITY_SIZE * 1.5;
    const y = 3 + Math.random() * 20;
    const z = (Math.random() - 0.5) * CITY_SIZE * 1.5;
    const mesh = createAdvancedCube(2, { material: 'emissive', emissive: 0x00ff00, intensity: 3 }, [
      x,
      y,
      z,
    ]);
    dataPackets.push({ mesh, x, y, z, active: true, offset: Math.random() * 10 });
  }
}

function spawnDrones() {
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * CITY_SIZE * 1.2;
    const y = 8 + Math.random() * 15;
    const z = (Math.random() - 0.5) * CITY_SIZE * 1.2;
    const body = createCube(1.5, 0.6, 1.5, 0xff2222, [x, y, z]);
    const glow = createCube(1.8, 0.3, 1.8, 0xff0000, [x, y - 0.4, z]);
    drones.push({
      body,
      glow,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      hp: 60,
      alive: true,
      shootCD: 2 + Math.random() * 2,
      target: { x: (Math.random() - 0.5) * CITY_SIZE, y, z: (Math.random() - 0.5) * CITY_SIZE },
      waypointTimer: 3 + Math.random() * 4,
      respawnTimer: 0,
    });
  }
}

function updateDrones(dt) {
  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];
    if (!d.alive) {
      d.respawnTimer -= dt;
      if (d.respawnTimer <= 0) {
        d.x = (Math.random() - 0.5) * CITY_SIZE * 1.2;
        d.y = 8 + Math.random() * 15;
        d.z = (Math.random() - 0.5) * CITY_SIZE * 1.2;
        d.body = createCube(1.5, 0.6, 1.5, 0xff2222, [d.x, d.y, d.z]);
        d.glow = createCube(1.8, 0.3, 1.8, 0xff0000, [d.x, d.y - 0.4, d.z]);
        d.hp = 60;
        d.alive = true;
        d.shootCD = 2 + Math.random() * 2;
      }
      continue;
    }

    const dx = player.x - d.x;
    const dy = player.y - d.y;
    const dz = player.z - d.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 30) {
      d.vx += (dx / dist) * 12 * dt;
      d.vy += (dy / dist) * 12 * dt;
      d.vz += (dz / dist) * 12 * dt;

      d.shootCD -= dt;
      if (d.shootCD <= 0 && dist < 25) {
        d.shootCD = 1.5 + Math.random();
        const pspd = 30;
        droneProjectiles.push({
          mesh: createSphere(0.3, 0xff4444, [d.x, d.y, d.z]),
          x: d.x,
          y: d.y,
          z: d.z,
          vx: (dx / dist) * pspd,
          vy: (dy / dist) * pspd,
          vz: (dz / dist) * pspd,
          life: 3,
        });
        sfx('laser');
      }
    } else {
      d.waypointTimer -= dt;
      if (d.waypointTimer <= 0) {
        d.target.x = (Math.random() - 0.5) * CITY_SIZE;
        d.target.z = (Math.random() - 0.5) * CITY_SIZE;
        d.target.y = 8 + Math.random() * 15;
        d.waypointTimer = 4 + Math.random() * 4;
      }
      const tx = d.target.x - d.x;
      const ty = d.target.y - d.y;
      const tz = d.target.z - d.z;
      const td = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
      d.vx += (tx / td) * 6 * dt;
      d.vy += (ty / td) * 6 * dt;
      d.vz += (tz / td) * 6 * dt;
    }

    d.vx *= 0.95;
    d.vy *= 0.95;
    d.vz *= 0.95;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.z += d.vz * dt;
    setPosition(d.body, d.x, d.y, d.z);
    setPosition(d.glow, d.x, d.y - 0.4, d.z);
    setRotation(d.body, 0, gameTime * 3, 0);

    // Player ram damage when boosting
    if (dist < 3 && player.boost > 1.5) {
      d.hp -= 40;
      sfx('hit');
      triggerShake(shake, 0.5);
      if (d.hp <= 0) {
        d.alive = false;
        d.respawnTimer = 8;
        destroyMesh(d.body);
        destroyMesh(d.glow);
        dronesDestroyed++;
        playerScore += 200;
        sfx('explosion');
        for (let j = 0; j < 10; j++) {
          const p = createSphere(0.2, 0xff4400, [d.x, d.y, d.z]);
          particles.push({
            mesh: p,
            x: d.x,
            y: d.y,
            z: d.z,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            vz: (Math.random() - 0.5) * 15,
            life: 1.5,
            maxLife: 1.5,
            type: 'explosion',
          });
        }
        if (currentMission && currentMission.type === 'DRONE_SWEEP') {
          currentMission.progress++;
        }
        playerHealth = Math.min(playerMaxHealth, playerHealth + 10);
      }
    }
  }
}

function updateProjectiles(dt) {
  for (let i = droneProjectiles.length - 1; i >= 0; i--) {
    const p = droneProjectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    setPosition(p.mesh, p.x, p.y, p.z);

    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dz = p.z - player.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 3 && playerDmgCD <= 0) {
      playerHealth = Math.max(0, playerHealth - 10);
      playerDmgCD = 0.8;
      triggerShake(shake, 0.4);
      sfx('hit');
      destroyMesh(p.mesh);
      droneProjectiles.splice(i, 1);
      if (playerHealth <= 0) {
        playerHealth = playerMaxHealth;
        playerScore = Math.max(0, playerScore - 500);
        missionMsg = 'SYSTEM CRASH - REBOOTING...';
        missionMsgTimer = 3;
        sfx('death');
      }
      continue;
    }

    if (p.life <= 0) {
      destroyMesh(p.mesh);
      droneProjectiles.splice(i, 1);
    }
  }
}

const MISSION_TYPES = ['DATA_HEIST', 'DRONE_SWEEP', 'SPEED_RUN'];

function startNextMission() {
  removeCheckpoint();
  missionIndex++;
  const type = MISSION_TYPES[(missionIndex - 1) % MISSION_TYPES.length];
  const tier = Math.floor((missionIndex - 1) / 3) + 1;

  if (type === 'DATA_HEIST') {
    currentMission = {
      type,
      name: `DATA HEIST #${missionIndex}`,
      desc: `Collect ${2 + tier} data packets`,
      target: 2 + tier,
      progress: 0,
      timeLimit: 45 + tier * 10,
      reward: 500 * tier,
    };
    respawnPackets(currentMission.target + 3);
  } else if (type === 'DRONE_SWEEP') {
    currentMission = {
      type,
      name: `DRONE SWEEP #${missionIndex}`,
      desc: `Destroy ${1 + tier} drones`,
      target: 1 + tier,
      progress: 0,
      timeLimit: 60 + tier * 15,
      reward: 800 * tier,
    };
  } else {
    const cx = (Math.random() - 0.5) * CITY_SIZE * 0.8;
    const cz = (Math.random() - 0.5) * CITY_SIZE * 0.8;
    currentMission = {
      type,
      name: `SPEED RUN #${missionIndex}`,
      desc: 'Reach the checkpoint!',
      target: 1,
      progress: 0,
      timeLimit: 25 + tier * 5,
      reward: 400 * tier,
      cx,
      cz,
    };
    createCheckpointMarker(cx, 10, cz);
  }
  missionTimer = currentMission.timeLimit;
  missionMsg = `NEW: ${currentMission.name}`;
  missionMsgTimer = 3;
  sfx('powerup');
}

function respawnPackets(count) {
  const active = dataPackets.filter(p => p.active).length;
  const needed = Math.max(0, count - active);
  for (let i = 0; i < needed; i++) {
    const x = (Math.random() - 0.5) * CITY_SIZE * 1.2;
    const y = 3 + Math.random() * 20;
    const z = (Math.random() - 0.5) * CITY_SIZE * 1.2;
    const mesh = createAdvancedCube(2, { material: 'emissive', emissive: 0x00ff00, intensity: 3 }, [
      x,
      y,
      z,
    ]);
    dataPackets.push({ mesh, x, y, z, active: true, offset: Math.random() * 10 });
  }
}

function createCheckpointMarker(x, y, z) {
  checkpointMesh = createCylinder(1, 30, 0x00ffff, [x, y, z], { segments: 6 });
  checkpointGlow = createCylinder(2, 32, 0x004488, [x, y - 1, z], { segments: 6 });
}

function removeCheckpoint() {
  if (checkpointMesh) {
    destroyMesh(checkpointMesh);
    checkpointMesh = null;
  }
  if (checkpointGlow) {
    destroyMesh(checkpointGlow);
    checkpointGlow = null;
  }
}

function updateMission(dt) {
  if (!currentMission) return;
  missionTimer -= dt;
  if (missionMsgTimer > 0) missionMsgTimer -= dt;

  if (currentMission.progress >= currentMission.target) {
    playerScore += currentMission.reward;
    missionMsg = `COMPLETE! +${currentMission.reward} CREDITS`;
    missionMsgTimer = 3;
    sfx('coin');
    triggerShake(shake, 0.3);
    playerHealth = Math.min(playerMaxHealth, playerHealth + 20);
    const m = currentMission;
    currentMission = null;
    setTimeout(() => startNextMission(), 2500);
    return;
  }

  if (currentMission.type === 'SPEED_RUN') {
    const dx = player.x - currentMission.cx;
    const dz = player.z - currentMission.cz;
    if (Math.sqrt(dx * dx + dz * dz) < 8) {
      currentMission.progress = 1;
    }
    if (checkpointMesh) setRotation(checkpointMesh, 0, gameTime * 2, 0);
  }

  if (missionTimer <= 0) {
    missionMsg = 'MISSION FAILED - RETRYING';
    missionMsgTimer = 2;
    sfx('error');
    currentMission.progress = 0;
    missionTimer = currentMission.timeLimit;
    if (currentMission.type === 'SPEED_RUN') {
      removeCheckpoint();
      currentMission.cx = (Math.random() - 0.5) * CITY_SIZE * 0.8;
      currentMission.cz = (Math.random() - 0.5) * CITY_SIZE * 0.8;
      createCheckpointMarker(currentMission.cx, 10, currentMission.cz);
    }
  }
}

// City configuration
const CITY_SIZE = 100;
const BUILDING_COUNT = 50;
// GPU instancing for city grid elements
let glowSphereInstanceId = null;
const VEHICLE_COUNT = 12;
const PARTICLE_COUNT = 200;

// 🌈 NEON COLORS - Bright and vibrant!
const COLORS = {
  building: [0x4a4a7a, 0x5a5a8a, 0x6a6a9a, 0x3a3a6a], // Brighter buildings
  neon: [0xff0099, 0x00ff99, 0x9900ff, 0xffff00, 0x00ffff, 0xff6600], // Intense neons
  neonGlow: [0xff55cc, 0x55ffcc, 0xcc55ff, 0xffffaa, 0xaaffff, 0xffaa66], // Glow halos
  vehicle: [0xff6666, 0x66ff66, 0x6666ff, 0xffff66, 0xff66ff], // Brighter vehicles
  particle: [0xffaa00, 0xaa00ff, 0x00ffaa, 0xff00aa, 0xaaffff, 0xffaaff], // Glowing particles
  underglow: [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000], // Vehicle underglows
};

export async function init() {
  cls();

  // Setup dramatic 3D scene
  setCameraPosition(0, 20, 30);
  setCameraTarget(0, 10, 0);
  setCameraFOV(75);

  // 🌈 BRIGHT NEON LIGHTING - Make it pop!
  setLightDirection(-0.3, -0.7, -0.4);
  setLightColor(0xffaaff); // Bright magenta/pink key light
  setAmbientLight(0x664488); // Much brighter purple ambient

  // 🌫️ Atmospheric fog with neon tint
  setFog(0x441166, 30, 180); // Purple/magenta fog

  // 🎨 Enable ALL visual effects for maximum impact
  enablePixelation(1);
  enableDithering(true);
  enableBloom(1.5, 0.3, 0.25); // Strong neon glow
  enableFXAA(); // Anti-aliasing
  enableChromaticAberration(0.003); // Cyberpunk lens distortion
  enableVignette(1.6, 0.85); // Dark vignette for immersion

  await buildCyberpunkCity();
  createPlayer();
  spawnVehicles();
  initParticleSystem();
  spawnPackets();
  spawnDrones();
  shake = createShake(0.3);

  // Initialize start screen
  initStartScreen();

  console.log('🌃 CYBERPUNK CITY 3D - NEON ENHANCED!');
  console.log('WASD: Move | SHIFT: Fly Mode | SPACE: Boost | X: Switch Vehicle');
}

function initStartScreen() {
  uiButtons = [];

  uiButtons.push(
    createButton(
      centerX(240),
      150,
      240,
      60,
      '▶ ENTER THE CITY ▶',
      () => {
        gameState = 'exploring';
        startNextMission();
      },
      {
        normalColor: rgba8(255, 0, 100, 255),
        hoverColor: rgba8(255, 60, 150, 255),
        pressedColor: rgba8(200, 0, 80, 255),
      }
    )
  );

  uiButtons.push(
    createButton(
      centerX(200),
      355,
      200,
      45,
      '🎮 CONTROLS',
      () => {
        console.log('Cyberpunk City - WASD: Move, SHIFT: Fly, SPACE: Boost');
      },
      {
        normalColor: rgba8(0, 255, 255, 255),
        hoverColor: rgba8(60, 255, 255, 255),
        pressedColor: rgba8(0, 200, 200, 255),
      }
    )
  );
}

export function update(dt) {
  gameTime += dt;

  if (gameState === 'start') {
    startScreenTime += dt;
    updateAllButtons();

    // Animate scene in background
    updateVehicles(dt);
    updateParticles(dt);
    updatePackets(dt);
    updateCityLights(dt);
    updateNeonSigns(dt);

    // Slow camera orbit
    camera.x = Math.cos(gameTime * 0.2) * 40;
    camera.z = Math.sin(gameTime * 0.2) * 40;
    camera.y = 25;
    setCameraPosition(camera.x, camera.y, camera.z);
    setCameraTarget(0, 10, 0);
    return;
  }

  handleInput(dt);
  updatePlayer(dt);
  updateVehicles(dt);
  updateParticles(dt);
  updatePackets(dt);
  updateCityLights(dt);
  updateCamera(dt);
  updateNeonSigns(dt);
  updateDrones(dt);
  updateProjectiles(dt);
  updateMission(dt);
  if (shake) updateShake(shake, dt);
  if (playerDmgCD > 0) playerDmgCD -= dt;
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }

  // 3D scene automatically rendered by GPU
  drawHUD();
}

function drawStartScreen() {
  // Neon gradient background — dual-band
  drawGradient(0, 0, 640, 200, rgba8(50, 10, 50, 235), rgba8(10, 5, 20, 245), 'v');
  drawGradient(0, 200, 640, 160, rgba8(10, 5, 20, 245), rgba8(20, 5, 40, 240), 'v');

  // Animated noise "digital rain" static
  drawNoise(0, 0, 640, 360, 22, Math.floor(startScreenTime * 30));

  // Radial spotlight behind title
  drawRadialGradient(320, 88, 200, rgba8(180, 0, 120, 35), rgba8(0, 0, 0, 0));

  // Neon title with glow effect
  const neonPulse = Math.sin(startScreenTime * 4) * 0.3 + 0.7;
  const pinkNeon = rgba8(255, Math.floor(neonPulse * 100), Math.floor(neonPulse * 200), 255);
  const cyanNeon = rgba8(0, Math.floor(neonPulse * 255), 255, 255);

  const flicker = Math.random() > 0.95 ? -2 : 0;
  drawGlowTextCentered('CYBERPUNK', 320, 50 + flicker, pinkNeon, rgba8(150, 0, 100, 150), 2);
  drawGlowTextCentered('CITY 3D', 320, 105 + flicker, cyanNeon, rgba8(0, 80, 140, 150), 2);

  // Glitch subtitle
  const glitch = Math.random() > 0.97 ? Math.floor(Math.random() * 4) - 2 : 0;
  setFont('large');
  setTextAlign('center');
  drawText('▶ Nintendo 64 / PlayStation Style ◀', 320 + glitch, 162, rgba8(255, 255, 0, 255), 1);

  // Info panel
  const panel = createPanel(centerX(480), 208, 480, 118, {
    bgColor: rgba8(30, 10, 30, 210),
    borderColor: rgba8(255, 0, 100, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(50, 20, 50, 210),
  });
  drawPanel(panel);

  setFont('normal');
  setTextAlign('center');
  drawText('EXPLORE THE NEON METROPOLIS', 320, 225, rgba8(255, 0, 255, 255), 1);

  setFont('small');
  drawText('▶ 50+ Procedural Buildings with Neon Lights', 320, 247, uiColors.light, 1);
  drawText('▶ Flying Vehicles & Dynamic Particle System', 320, 262, uiColors.light, 1);
  drawText('▶ Full Player Control + Flying Mode', 320, 277, uiColors.light, 1);
  drawText('▶ Retro N64 Effects: Pixelation, Dithering, Bloom', 320, 292, uiColors.light, 1);

  setFont('tiny');
  drawText('WASD: Move | SHIFT: Fly | SPACE: Boost', 320, 310, uiColors.secondary, 1);

  // Draw buttons
  drawAllButtons();

  // Animated neon wave at horizon
  drawWave(0, 348, 640, 7, 0.032, startScreenTime * 2.5, rgba8(255, 0, 255, 110), 2);
  drawWave(0, 353, 640, 5, 0.045, startScreenTime * 2.5 + 1.2, rgba8(0, 255, 255, 85), 2);

  // Pulsing neon prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('▶ WELCOME TO THE FUTURE ◀', 320, 430, rgba8(255, 0, 255, alpha), 1);

  // Build info
  setFont('tiny');
  drawText('GPU-Accelerated 3D City Simulation', 320, 338, rgba8(150, 100, 200, 150), 1);

  // CRT scanlines
  drawScanlines(52, 2);
}

async function buildCyberpunkCity() {
  // 🌃 Create ground with brighter base
  const ground = createPlane(CITY_SIZE * 2, CITY_SIZE * 2, 0x2a2a55, [0, 0, 0]);
  setRotation(ground, -Math.PI / 2, 0, 0);

  // ⚡ Add BRIGHT NEON grid lines for cyberpunk aesthetic
  for (let i = -CITY_SIZE; i <= CITY_SIZE; i += 10) {
    // Horizontal lines - CYAN neon
    createCube(CITY_SIZE * 2, 0.15, 0.3, 0x00ffff, [0, 0.15, i]);
    // Vertical lines - MAGENTA neon
    createCube(0.3, 0.15, CITY_SIZE * 2, 0xff00ff, [i, 0.15, 0]);

    // Add glow effect underneath
    createCube(CITY_SIZE * 2, 0.05, 0.5, 0x0088aa, [0, 0.05, i]);
    createCube(0.5, 0.05, CITY_SIZE * 2, 0xaa0088, [i, 0.05, 0]);
  }

  // ✨ Intersection glow points — GPU instanced (121 spheres → 1 draw call)
  const gridCount = Math.ceil((CITY_SIZE * 2) / 20 + 1);
  const totalGlows = gridCount * gridCount;
  glowSphereInstanceId = createInstancedMesh('sphere', totalGlows, 0x00ffff, {
    size: 0.5,
    segments: 6,
    emissive: 0x008888,
    emissiveIntensity: 1.0,
  });
  let glowIdx = 0;
  for (let i = -CITY_SIZE; i <= CITY_SIZE; i += 20) {
    for (let j = -CITY_SIZE; j <= CITY_SIZE; j += 20) {
      const neonIdx = Math.floor(Math.random() * COLORS.neon.length);
      setInstanceTransform(glowSphereInstanceId, glowIdx, i, 0.5, j);
      setInstanceColor(glowSphereInstanceId, glowIdx, COLORS.neon[neonIdx]);
      glowIdx++;
    }
  }
  finalizeInstances(glowSphereInstanceId);

  // Generate procedural buildings
  for (let i = 0; i < BUILDING_COUNT; i++) {
    await createBuilding(i);
  }

  // Create central megastructure
  await createMegaStructure();

  // Add flying platforms
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 40;
    const platform = createCube(8, 1, 8, 0x666699, [
      Math.cos(angle) * radius,
      15 + Math.sin(gameTime + i) * 3,
      Math.sin(angle) * radius,
    ]);

    // Add neon underglow
    const glow = createCube(8.5, 0.2, 8.5, COLORS.neon[i % COLORS.neon.length], [
      Math.cos(angle) * radius,
      14.5 + Math.sin(gameTime + i) * 3,
      Math.sin(angle) * radius,
    ]);

    cityObjects.push({ type: 'platform', mesh: platform, glow: glow, angle: angle, index: i });
  }
}

async function createBuilding(index) {
  const x = (Math.random() - 0.5) * CITY_SIZE * 1.5;
  const z = (Math.random() - 0.5) * CITY_SIZE * 1.5;

  // Avoid center area
  if (Math.abs(x) < 15 && Math.abs(z) < 15) return;

  const width = 3 + Math.random() * 6;
  const depth = 3 + Math.random() * 6;
  const height = 8 + Math.random() * 25;

  // Main building
  const building = createCube(
    width,
    height,
    depth,
    COLORS.building[index % COLORS.building.length],
    [x, height / 2, z]
  );

  // 🎨 Add COLORFUL detail layers (no more black blocks!)
  const detailColor1 = COLORS.neon[index % COLORS.neon.length];
  const detailColor2 = COLORS.neonGlow[(index + 2) % COLORS.neonGlow.length];
  const detail1 = createCube(width * 0.9, height * 0.3, depth * 0.9, detailColor1, [
    x,
    height * 0.15,
    z,
  ]);
  const detail2 = createCube(width * 0.8, height * 0.2, depth * 0.8, detailColor2, [
    x,
    height * 0.9,
    z,
  ]);

  // 💡 Windows with BRIGHT NEON animated lighting
  const windowRows = Math.floor(height / 3);
  const windows = [];

  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < 3; col++) {
      const windowX = x + (col - 1) * width * 0.25;
      const windowY = 2 + row * 3;
      const windowZ = z + depth * 0.51;

      // Use BRIGHT neon glow colors for windows
      const windowColor = COLORS.neonGlow[(row * 3 + col) % COLORS.neonGlow.length];
      const window = createCube(0.8, 0.8, 0.1, windowColor, [windowX, windowY, windowZ]);

      // Add window glow halo (brighter larger cube behind)
      createCube(1.2, 1.2, 0.05, windowColor, [windowX, windowY, windowZ - 0.1]);

      windows.push({
        mesh: window,
        flickerTime: Math.random() * 10,
        baseColor: windowColor,
        dimColor: windowColor & 0x555555, // Dim by masking bits
      });
    }
  }

  // ⚡ Neon sign on top (50% chance, BRIGHT)
  if (Math.random() < 0.5) {
    const signColor = COLORS.neon[Math.floor(Math.random() * COLORS.neon.length)];
    const glowColor = COLORS.neonGlow[Math.floor(Math.random() * COLORS.neonGlow.length)];

    // Main sign
    const sign = createCube(width * 1.2, 1, 0.2, signColor, [x, height + 1, z]);

    // Glow halo around sign (larger, behind)
    const signGlow = createCube(width * 1.4, 1.5, 0.1, glowColor, [x, height + 1, z - 0.2]);

    neonSigns.push({
      mesh: sign,
      glow: signGlow,
      color: signColor,
      glowColor: glowColor,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  buildings.push({
    main: building,
    details: [detail1, detail2],
    windows: windows,
    x: x,
    z: z,
    height: height,
  });
}

async function createMegaStructure() {
  // 🏙️ Central tower (BRIGHT PURPLE with neon accents)
  createCube(12, 60, 12, 0x8855cc, [0, 30, 0]);

  // Add colorful stripes to tower
  for (let i = 0; i < 10; i++) {
    const stripeColor = COLORS.neon[i % COLORS.neon.length];
    createCube(12.5, 2, 12.5, stripeColor, [0, 6 + i * 6, 0]);
  }

  // 🌉 Connecting bridges (BRIGHT CYAN)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const bridgeX = Math.cos(angle) * 20;
    const bridgeZ = Math.sin(angle) * 20;

    const bridgeColor = COLORS.neonGlow[i % COLORS.neonGlow.length];
    const bridge = createCube(16, 2, 4, bridgeColor, [bridgeX / 2, 25, bridgeZ / 2]);
    setRotation(bridge, 0, angle, 0);

    // Add underglow to bridges
    const bridgeGlow = createCube(17, 0.5, 4.5, COLORS.underglow[i % COLORS.underglow.length], [
      bridgeX / 2,
      24,
      bridgeZ / 2,
    ]);
    setRotation(bridgeGlow, 0, angle, 0);
  }

  // Antenna array on top
  for (let i = 0; i < 6; i++) {
    const antenna = createCube(0.3, 8, 0.3, 0xffffff, [
      Math.random() * 8 - 4,
      64,
      Math.random() * 8 - 4,
    ]);

    // Blinking light on antenna
    const light = createSphere(0.5, 0xff0000, [Math.random() * 8 - 4, 68, Math.random() * 8 - 4]);

    cityLights.push({
      mesh: light,
      blinkTime: Math.random() * 2,
      isOn: true,
    });
  }
}

function createPlayer() {
  // Sleek hovercar
  const body = createCube(3, 0.8, 1.5, 0x4444ff, [0, 2, 0]);
  const cockpit = createSphere(1, 0x2222aa, [0, 2.8, 0.2]);

  // Thrusters
  const thruster1 = createCube(0.4, 0.4, 0.8, 0xff4400, [-1.2, 1.8, -0.8]);
  const thruster2 = createCube(0.4, 0.4, 0.8, 0xff4400, [1.2, 1.8, -0.8]);

  // Underglow
  const glow = createCube(3.5, 0.2, 2, 0x00ffff, [0, 1.2, 0]);

  player = {
    body: body,
    cockpit: cockpit,
    thrusters: [thruster1, thruster2],
    glow: glow,
    x: 0,
    y: 2,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rotation: 0,
    tilt: 0,
    boost: 1,
  };
}

function spawnVehicles() {
  for (let i = 0; i < VEHICLE_COUNT; i++) {
    const vehicle = createTrafficVehicle(i);
    vehicles.push(vehicle);
  }
}

function createTrafficVehicle(index) {
  const x = (Math.random() - 0.5) * CITY_SIZE;
  const z = (Math.random() - 0.5) * CITY_SIZE;
  const y = 1.5 + Math.random() * 8;

  const color = COLORS.vehicle[index % COLORS.vehicle.length];

  // 🚗 Main vehicle body
  const body = createCube(2.5, 0.6, 1.2, color, [x, y, z]);

  // ⚡ BRIGHT NEON UNDERGLOW (use underglow colors)
  const underglowColor = COLORS.underglow[index % COLORS.underglow.length];
  const glow = createCube(3.2, 0.3, 1.8, underglowColor, [x, y - 0.5, z]);

  // ✨ Add second glow layer for extra brightness
  const glow2 = createCube(3.5, 0.15, 2.0, underglowColor, [x, y - 0.6, z]);

  return {
    body: body,
    glow: glow,
    glow2: glow2,
    underglowColor: underglowColor,
    x: x,
    y: y,
    z: z,
    vx: (Math.random() - 0.5) * 8,
    vy: 0,
    vz: (Math.random() - 0.5) * 8,
    target: { x: x, y: y, z: z },
    speed: 2 + Math.random() * 4,
    turnRate: Math.random() * 2 + 1,
    nextWaypoint: Math.random() * 10,
  };
}

function initParticleSystem() {
  // Create ambient particles (dust, sparks, etc.)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    createAmbientParticle();
  }
}

function createAmbientParticle() {
  const x = (Math.random() - 0.5) * CITY_SIZE * 2;
  const y = Math.random() * 40;
  const z = (Math.random() - 0.5) * CITY_SIZE * 2;

  const particle = createSphere(
    0.1,
    COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)],
    [x, y, z]
  );

  particles.push({
    mesh: particle,
    x: x,
    y: y,
    z: z,
    vx: (Math.random() - 0.5) * 2,
    vy: Math.random() * 0.5,
    vz: (Math.random() - 0.5) * 2,
    life: 5 + Math.random() * 10,
    maxLife: 15,
    type: 'ambient',
  });
}

function handleInput(dt) {
  // 🚀 IMPROVED CONTROLS - Much more responsive!
  const moveSpeed = flying ? 40 : 25; // Faster base speed
  const accel = flying ? 60 : 45; // Snappy acceleration
  const maxSpeed = flying ? 35 : 25; // Higher max speed

  let inputX = 0;
  let inputZ = 0;

  // ⬅️➡️ Horizontal movement with smooth acceleration
  if (btn(0)) {
    // Left
    inputX = -1;
    player.tilt = Math.max(player.tilt - dt * 3, -0.4);
  }
  if (btn(1)) {
    // Right
    inputX = 1;
    player.tilt = Math.min(player.tilt + dt * 3, 0.4);
  }

  // ⬆️⬇️ Forward/backward movement
  if (btn(2)) {
    // Up
    inputZ = -1;
  }
  if (btn(3)) {
    // Down
    inputZ = 1;
  }

  // Apply acceleration with max speed cap
  if (inputX !== 0) {
    player.vx += inputX * accel * dt;
    player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
  }
  if (inputZ !== 0) {
    player.vz += inputZ * accel * dt;
    player.vz = Math.max(-maxSpeed, Math.min(maxSpeed, player.vz));
  }

  // 🎮 Vertical movement (much more responsive)
  if (btn(4)) {
    // Z - Down
    player.vy -= moveSpeed * dt * 0.8; // Faster vertical
  }
  if (btn(5)) {
    // X - Up
    player.vy += moveSpeed * dt * 0.8; // Faster vertical
  }

  // 💨 BOOST - More powerful!
  if (btnp(6)) {
    // Space
    player.boost = 4; // Stronger boost
    const boostDir = { x: player.vx, z: player.vz };
    const mag = Math.sqrt(boostDir.x * boostDir.x + boostDir.z * boostDir.z);
    if (mag > 0) {
      player.vx += (boostDir.x / mag) * 15; // Add velocity in current direction
      player.vz += (boostDir.z / mag) * 15;
    }
    createBoostParticles();
  }

  // ✈️ Flight mode toggle
  if (btnp(7)) {
    // Shift
    flying = !flying;
  }

  // 🎯 Return tilt to center when not turning
  if (inputX === 0) {
    player.tilt *= 0.9; // Smooth return to center
  }
}

function updatePlayer(dt) {
  // 💨 Apply boost multiplier (decays smoothly)
  let boostMult = 1;
  if (player.boost > 1) {
    boostMult = player.boost;
    player.boost = Math.max(1, player.boost - dt * 4);
  }

  // 🌍 Physics - Apply velocity to position
  player.x += player.vx * boostMult * dt;
  player.y += player.vy * dt;
  player.z += player.vz * boostMult * dt;

  // ✈️ Hover physics (auto-stabilize height when not flying)
  if (!flying) {
    const groundHeight = 2.5;
    const hoverForce = (groundHeight - player.y) * 8; // Stronger hover
    player.vy += hoverForce * dt;

    // Clamp vertical position
    if (player.y < groundHeight - 0.5) {
      player.y = groundHeight - 0.5;
      player.vy = Math.max(0, player.vy);
    }
  } else {
    // In flight mode, add slight upward drift
    player.vy += dt * 0.5;
  }

  // 🎮 IMPROVED DAMPING - Smoother deceleration
  const dampFactor = flying ? 0.92 : 0.88; // More aggressive damping
  player.vx *= dampFactor;
  player.vz *= dampFactor;
  player.vy *= 0.94; // Vertical damping

  // Stop tiny movements (dead zone)
  if (Math.abs(player.vx) < 0.1) player.vx = 0;
  if (Math.abs(player.vz) < 0.1) player.vz = 0;
  if (Math.abs(player.vy) < 0.1) player.vy = 0;

  // Update rotation based on movement
  if (Math.abs(player.vx) > 0.1 || Math.abs(player.vz) > 0.1) {
    player.rotation = Math.atan2(player.vx, player.vz);
  }

  // Update mesh positions
  setPosition(player.body, player.x, player.y, player.z);
  setPosition(player.cockpit, player.x, player.y + 0.8, player.z + 0.2);
  setPosition(player.glow, player.x, player.y - 0.8, player.z);

  setPosition(player.thrusters[0], player.x - 1.2, player.y - 0.2, player.z - 0.8);
  setPosition(player.thrusters[1], player.x + 1.2, player.y - 0.2, player.z - 0.8);

  // Apply rotations
  setRotation(player.body, player.tilt * 0.3, player.rotation, player.tilt);
  setRotation(player.cockpit, 0, player.rotation, 0);

  // Create thruster particles
  if (Math.abs(player.vx) > 5 || Math.abs(player.vz) > 5) {
    createThrusterParticles();
  }

  // Boundary check
  const boundary = CITY_SIZE;
  if (Math.abs(player.x) > boundary) player.x = Math.sign(player.x) * boundary;
  if (Math.abs(player.z) > boundary) player.z = Math.sign(player.z) * boundary;
  if (player.y < 1) player.y = 1;
  if (player.y > 50) player.y = 50;
}

function updateVehicles(dt) {
  vehicles.forEach(vehicle => {
    // AI behavior - move to random waypoints
    vehicle.nextWaypoint -= dt;
    if (vehicle.nextWaypoint <= 0) {
      vehicle.target.x = (Math.random() - 0.5) * CITY_SIZE * 0.8;
      vehicle.target.z = (Math.random() - 0.5) * CITY_SIZE * 0.8;
      vehicle.target.y = 1.5 + Math.random() * 8;
      vehicle.nextWaypoint = 3 + Math.random() * 5;
    }

    // Move towards target
    const dx = vehicle.target.x - vehicle.x;
    const dy = vehicle.target.y - vehicle.y;
    const dz = vehicle.target.z - vehicle.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > 1) {
      vehicle.vx += (dx / distance) * vehicle.speed * dt;
      vehicle.vy += (dy / distance) * vehicle.speed * dt;
      vehicle.vz += (dz / distance) * vehicle.speed * dt;
    }

    // Apply physics
    vehicle.x += vehicle.vx * dt;
    vehicle.y += vehicle.vy * dt;
    vehicle.z += vehicle.vz * dt;

    // Damping
    vehicle.vx *= 0.95;
    vehicle.vy *= 0.98;
    vehicle.vz *= 0.95;

    // Update mesh positions (body + both glow layers)
    setPosition(vehicle.body, vehicle.x, vehicle.y, vehicle.z);
    setPosition(vehicle.glow, vehicle.x, vehicle.y - 0.5, vehicle.z);
    setPosition(vehicle.glow2, vehicle.x, vehicle.y - 0.6, vehicle.z);

    // Occasional thruster particles
    if (Math.random() < 0.1) {
      createVehicleThrusterParticles(vehicle.x, vehicle.y, vehicle.z);
    }
  });
}

function updatePackets(dt) {
  for (let i = dataPackets.length - 1; i >= 0; i--) {
    let p = dataPackets[i];
    if (!p.active) continue;

    // Rotate and hover
    p.offset += dt * 3;
    setRotation(p.mesh, p.offset, p.offset * 0.5, p.offset * 0.2);
    setPosition(p.mesh, p.x, p.y + Math.sin(p.offset) * 0.5, p.z);

    // Collision with player
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const dz = player.z - p.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 4.0) {
      p.active = false;
      playerScore += 100;
      setScale(p.mesh, 0, 0, 0);
      sfx('coin');
      if (currentMission && currentMission.type === 'DATA_HEIST') {
        currentMission.progress++;
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];

    // Physics
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.z += particle.vz * dt;

    particle.life -= dt;

    // Update position
    setPosition(particle.mesh, particle.x, particle.y, particle.z);

    // Fade out
    const alpha = particle.life / particle.maxLife;
    setScale(particle.mesh, alpha);

    // Remove dead particles
    if (particle.life <= 0) {
      destroyMesh(particle.mesh);
      particles.splice(i, 1);

      // Respawn ambient particles
      if (particle.type === 'ambient') {
        createAmbientParticle();
      }
    }
  }
}

function updateCityLights(dt) {
  // Update blinking lights
  cityLights.forEach(light => {
    light.blinkTime -= dt;
    if (light.blinkTime <= 0) {
      light.isOn = !light.isOn;
      light.blinkTime = 0.5 + Math.random() * 1.5;

      // Change light color/visibility
      if (light.isOn) {
        setScale(light.mesh, 1);
      } else {
        setScale(light.mesh, 0.3);
      }
    }
  });

  // Update building windows
  buildings.forEach(building => {
    building.windows.forEach(window => {
      window.flickerTime -= dt;
      if (window.flickerTime <= 0) {
        // 💡 Random flicker effect - future enhancement: change mesh color
        // const _isOn = Math.random() < 0.8; // Would toggle window brightness
        window.flickerTime = 0.5 + Math.random() * 3;
      }
    });
  });
}

function updateCamera(dt) {
  // Smooth camera follow
  const followDistance = 15;
  const followHeight = 8;

  camera.targetX = player.x - Math.sin(player.rotation) * followDistance;
  camera.targetY = player.y + followHeight;
  camera.targetZ = player.z - Math.cos(player.rotation) * followDistance;

  // Smooth interpolation
  camera.x += (camera.targetX - camera.x) * 3 * dt;
  camera.y += (camera.targetY - camera.y) * 3 * dt;
  camera.z += (camera.targetZ - camera.z) * 3 * dt;

  setCameraPosition(camera.x, camera.y, camera.z);
  setCameraTarget(player.x, player.y + 2, player.z);
}

function updateNeonSigns(dt) {
  neonSigns.forEach(sign => {
    sign.pulsePhase += dt * 4;
    // ⚡ Future enhancement: Use Math.sin(sign.pulsePhase) to pulse glow intensity
  });

  // Update floating platforms
  cityObjects.forEach(obj => {
    if (obj.type === 'platform') {
      const newY = 15 + Math.sin(gameTime * 0.5 + obj.index) * 3;
      setPosition(obj.mesh, Math.cos(obj.angle) * 40, newY, Math.sin(obj.angle) * 40);
      setPosition(obj.glow, Math.cos(obj.angle) * 40, newY - 0.5, Math.sin(obj.angle) * 40);
    }
  });
}

function createBoostParticles() {
  // 💨 BRIGHTER BOOST PARTICLES - More visual impact!
  for (let i = 0; i < 30; i++) {
    const boostColors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00];
    const particle = createSphere(0.25, boostColors[i % boostColors.length], [
      player.x + (Math.random() - 0.5) * 5,
      player.y + (Math.random() - 0.5) * 2.5,
      player.z + (Math.random() - 0.5) * 5,
    ]);

    particles.push({
      mesh: particle,
      x: player.x,
      y: player.y,
      z: player.z,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 8,
      vz: (Math.random() - 0.5) * 20,
      life: 2.0,
      maxLife: 2.0,
      type: 'boost',
    });
  }
}

function createThrusterParticles() {
  // 🔥 BRIGHTER THRUSTER TRAIL - Alternating colors
  const thrusterColors = [0xff6600, 0xffaa00, 0xff00ff, 0x00ffff];
  for (let i = 0; i < 3; i++) {
    const thrusterX = player.x + (i === 0 ? -1.2 : 1.2);
    const particle = createSphere(
      0.2,
      thrusterColors[Math.floor(Math.random() * thrusterColors.length)],
      [thrusterX, player.y - 0.5, player.z - 1]
    );

    particles.push({
      mesh: particle,
      x: thrusterX,
      y: player.y - 0.5,
      z: player.z - 1,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3,
      vz: Math.random() * 10 + 6,
      life: 1.0,
      maxLife: 1.0,
      type: 'thruster',
    });
  }
}

function createVehicleThrusterParticles(x, y, z) {
  const particle = createSphere(0.1, 0x4488ff, [x, y - 0.3, z - 0.8]);

  particles.push({
    mesh: particle,
    x: x,
    y: y - 0.3,
    z: z - 0.8,
    vx: (Math.random() - 0.5) * 2,
    vy: -Math.random(),
    vz: Math.random() * 3 + 2,
    life: 0.5,
    maxLife: 0.5,
    type: 'vehicle',
  });
}

function drawHUD() {
  // Health bar
  const hbx = 16,
    hby = 16,
    hbw = 150,
    hbh = 12;
  rect(hbx, hby, hbw, hbh, rgba8(40, 0, 0, 200), true);
  const hFrac = playerHealth / playerMaxHealth;
  if (hFrac > 0) rect(hbx, hby, Math.floor(hbw * hFrac), hbh, rgba8(255, 50, 50, 255), true);
  rect(hbx, hby, hbw, hbh, rgba8(255, 100, 100, 150), false);
  print(`HP ${playerHealth}/${playerMaxHealth}`, hbx + 4, hby + 2, rgba8(255, 255, 255, 255));

  // Score and stats
  print(`CREDITS: ${playerScore}`, 480, 18, rgba8(255, 255, 100, 255));
  print(`DRONES: ${dronesDestroyed}`, 480, 34, rgba8(255, 150, 150, 255));

  // Mode & speed
  const speedMag = Math.sqrt(player.vx * player.vx + player.vz * player.vz);
  print(
    `${flying ? 'FLIGHT' : 'HOVER'} ${speedMag.toFixed(0)}m/s`,
    16,
    34,
    rgba8(0, 255, 255, 255)
  );
  print(`ALT: ${player.y.toFixed(0)}m`, 16, 50, rgba8(100, 255, 100, 255));

  // Mission panel
  if (currentMission) {
    const mpx = 200,
      mpy = 16,
      mpw = 240,
      mph = 50;
    rect(mpx, mpy, mpw, mph, rgba8(0, 0, 30, 200), true);
    rect(mpx, mpy, mpw, mph, rgba8(0, 200, 255, 150), false);
    print(currentMission.name, mpx + 6, mpy + 4, rgba8(0, 255, 255, 255));
    print(currentMission.desc, mpx + 6, mpy + 18, rgba8(200, 200, 255, 255));
    const tColor = missionTimer < 10 ? rgba8(255, 80, 80, 255) : rgba8(255, 255, 200, 255);
    print(
      `${currentMission.progress}/${currentMission.target}  TIME: ${Math.ceil(missionTimer)}s`,
      mpx + 6,
      mpy + 34,
      tColor
    );
  }

  // Mission message (center, fading)
  if (missionMsgTimer > 0) {
    const alpha = Math.min(1, missionMsgTimer) * 255;
    rect(160, 160, 320, 24, rgba8(0, 0, 0, Math.floor(alpha * 0.6)), true);
    print(missionMsg, 180, 166, rgba8(255, 255, 0, Math.floor(alpha)));
  }

  // Damage flash
  if (playerDmgCD > 0.4) {
    rect(0, 0, 640, 360, rgba8(255, 0, 0, 60), true);
  }

  // Controls
  print('WASD:Move SHIFT:Fly SPACE:Boost(ram drones!)', 16, 344, rgba8(200, 200, 255, 180));

  // Mini-map (radar)
  const radarSize = 80;
  const radarX = 560;
  const radarY = 260;
  rect(
    radarX - radarSize / 2,
    radarY - radarSize / 2,
    radarSize,
    radarSize,
    rgba8(0, 50, 0, 150),
    true
  );
  rect(
    radarX - radarSize / 2,
    radarY - radarSize / 2,
    radarSize,
    radarSize,
    rgba8(0, 255, 0, 100),
    false
  );
  rect(radarX - 1, radarY - 1, 2, 2, rgba8(255, 255, 255, 255), true);

  // Vehicle dots (magenta)
  vehicles.forEach(v => {
    const rx = ((v.x - player.x) / CITY_SIZE) * radarSize * 0.4;
    const rz = ((v.z - player.z) / CITY_SIZE) * radarSize * 0.4;
    if (Math.abs(rx) < radarSize / 2 && Math.abs(rz) < radarSize / 2) {
      rect(radarX + rx - 1, radarY + rz - 1, 2, 2, rgba8(255, 0, 255, 200), true);
    }
  });

  // Drone dots (red)
  drones.forEach(d => {
    if (!d.alive) return;
    const rx = ((d.x - player.x) / CITY_SIZE) * radarSize * 0.4;
    const rz = ((d.z - player.z) / CITY_SIZE) * radarSize * 0.4;
    if (Math.abs(rx) < radarSize / 2 && Math.abs(rz) < radarSize / 2) {
      rect(radarX + rx - 1, radarY + rz - 1, 3, 3, rgba8(255, 50, 50, 255), true);
    }
  });

  // Checkpoint dot (cyan, blinking)
  if (currentMission && currentMission.type === 'SPEED_RUN') {
    const rx = ((currentMission.cx - player.x) / CITY_SIZE) * radarSize * 0.4;
    const rz = ((currentMission.cz - player.z) / CITY_SIZE) * radarSize * 0.4;
    if (
      Math.abs(rx) < radarSize / 2 &&
      Math.abs(rz) < radarSize / 2 &&
      Math.sin(gameTime * 8) > 0
    ) {
      rect(radarX + rx - 2, radarY + rz - 2, 4, 4, rgba8(0, 255, 255, 255), true);
    }
  }

  // Data packet dots (green)
  dataPackets.forEach(p => {
    if (!p.active) return;
    const rx = ((p.x - player.x) / CITY_SIZE) * radarSize * 0.4;
    const rz = ((p.z - player.z) / CITY_SIZE) * radarSize * 0.4;
    if (Math.abs(rx) < radarSize / 2 && Math.abs(rz) < radarSize / 2) {
      rect(radarX + rx, radarY + rz, 2, 2, rgba8(0, 255, 0, 200), true);
    }
  });

  print('RADAR', radarX - 15, radarY + radarSize / 2 + 4, rgba8(0, 255, 0, 255));
}
