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

// City configuration
const CITY_SIZE = 100;
const BUILDING_COUNT = 50;
const VEHICLE_COUNT = 12;
const PARTICLE_COUNT = 200;

// 🌈 NEON COLORS - Bright and vibrant!
const COLORS = {
  building: [0x4a4a7a, 0x5a5a8a, 0x6a6a9a, 0x3a3a6a], // Brighter buildings
  neon: [0xff0099, 0x00ff99, 0x9900ff, 0xffff00, 0x00ffff, 0xff6600], // Intense neons
  neonGlow: [0xff55cc, 0x55ffcc, 0xcc55ff, 0xffffaa, 0xaaffff, 0xffaa66], // Glow halos
  vehicle: [0xff6666, 0x66ff66, 0x6666ff, 0xffff66, 0xff66ff], // Brighter vehicles
  particle: [0xffaa00, 0xaa00ff, 0x00ffaa, 0xff00aa, 0xaaffff, 0xffaaff], // Glowing particles
  underglow: [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000] // Vehicle underglows
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
  enableBloom(true); // Critical for neon glow!
  
  // 🎆 Add post-processing effects if available
  try {
    enableChromaticAberration && enableChromaticAberration(0.002);
    enableVignette && enableVignette(0.3);
    enableScanlines && enableScanlines(0.15);
  } catch (e) {
    // Effects not available, continue
  }
  
  await buildCyberpunkCity();
  createPlayer();
  spawnVehicles();
  initParticleSystem();
  
  // Initialize start screen
  initStartScreen();
  
  console.log('🌃 CYBERPUNK CITY 3D - NEON ENHANCED!');
  console.log('WASD: Move | SHIFT: Fly Mode | SPACE: Boost | X: Switch Vehicle');
}

function initStartScreen() {
  uiButtons = [];
  
  uiButtons.push(
    createButton(centerX(240), 150, 240, 60, '▶ ENTER THE CITY ▶', () => {
      console.log('🎯 ENTER THE CITY CLICKED! Changing gameState to exploring...');
      gameState = 'exploring';
      console.log('✅ gameState is now:', gameState);
    }, {
      normalColor: rgba8(255, 0, 100, 255),
      hoverColor: rgba8(255, 60, 150, 255),
      pressedColor: rgba8(200, 0, 80, 255)
    })
  );
  
  uiButtons.push(
    createButton(centerX(200), 355, 200, 45, '🎮 CONTROLS', () => {
      console.log('Cyberpunk City - WASD: Move, SHIFT: Fly, SPACE: Boost');
    }, {
      normalColor: rgba8(0, 255, 255, 255),
      hoverColor: rgba8(60, 255, 255, 255),
      pressedColor: rgba8(0, 200, 200, 255)
    })
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
  updateCityLights(dt);
  updateCamera(dt);
  updateNeonSigns(dt);
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
  // Neon gradient background
  drawGradientRect(0, 0, 640, 360,
    rgba8(50, 10, 50, 230),
    rgba8(10, 5, 20, 245),
    true
  );
  
  // Neon title with glow
  const neonPulse = Math.sin(startScreenTime * 4) * 0.3 + 0.7;
  const pinkNeon = rgba8(
    255,
    Math.floor(neonPulse * 100),
    Math.floor(neonPulse * 200),
    255
  );
  const cyanNeon = rgba8(0, Math.floor(neonPulse * 255), 255, 255);
  
  setFont('huge');
  setTextAlign('center');
  const flicker = Math.random() > 0.95 ? -2 : 0;
  drawTextShadow('CYBERPUNK', 320, 50 + flicker, pinkNeon, rgba8(0, 0, 0, 255), 7, 1);
  drawTextShadow('CITY 3D', 320, 105 + flicker, cyanNeon, rgba8(0, 0, 0, 255), 7, 1);
  
  // Subtitle
  setFont('large');
  const glitch = Math.random() > 0.97 ? Math.floor(Math.random() * 4) - 2 : 0;
  drawTextOutline('▶ Nintendo 64 / PlayStation Style ◀', 320 + glitch, 165, 
    rgba8(255, 255, 0, 255), 
    rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(480), 210, 480, 190, {
    bgColor: rgba8(30, 10, 30, 210),
    borderColor: rgba8(255, 0, 100, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(50, 20, 50, 210)
  });
  drawPanel(panel);
  
  setFont('normal');
  setTextAlign('center');
  drawText('EXPLORE THE NEON METROPOLIS', 320, 230, rgba8(255, 0, 255, 255), 1);
  
  setFont('small');
  drawText('▶ 50+ Procedural Buildings with Neon Lights', 320, 255, uiColors.light, 1);
  drawText('▶ Flying Vehicles & Dynamic Particle System', 320, 270, uiColors.light, 1);
  drawText('▶ Full Player Control + Flying Mode', 320, 285, uiColors.light, 1);
  drawText('▶ Retro N64 Effects: Pixelation, Dithering, Bloom', 320, 300, uiColors.light, 1);
  
  setFont('tiny');
  drawText('WASD: Move | SHIFT: Fly | SPACE: Boost', 320, 320, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing neon prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('▶ WELCOME TO THE FUTURE ◀', 320, 430, rgba8(255, 0, 255, alpha), 1);
  
  // Build info
  setFont('tiny');
  drawText('GPU-Accelerated 3D City Simulation', 320, 345, rgba8(150, 100, 200, 150), 1);
}

async function buildCyberpunkCity() {
  // 🌃 Create ground with brighter base
  const ground = createPlane(CITY_SIZE * 2, CITY_SIZE * 2, 0x2a2a55, [0, 0, 0]);
  setRotation(ground, -Math.PI/2, 0, 0);
  
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
  
  // ✨ Add intersection glow points
  for (let i = -CITY_SIZE; i <= CITY_SIZE; i += 20) {
    for (let j = -CITY_SIZE; j <= CITY_SIZE; j += 20) {
      const glowColor = COLORS.neon[Math.floor(Math.random() * COLORS.neon.length)];
      createSphere(0.5, glowColor, [i, 0.5, j]);
    }
  }
  
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
      Math.sin(angle) * radius
    ]);
    
    // Add neon underglow
    const glow = createCube(8.5, 0.2, 8.5, COLORS.neon[i % COLORS.neon.length], [
      Math.cos(angle) * radius,
      14.5 + Math.sin(gameTime + i) * 3,
      Math.sin(angle) * radius
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
  const building = createCube(width, height, depth, COLORS.building[index % COLORS.building.length], [x, height/2, z]);
  
  // 🎨 Add COLORFUL detail layers (no more black blocks!)
  const detailColor1 = COLORS.neon[index % COLORS.neon.length];
  const detailColor2 = COLORS.neonGlow[(index + 2) % COLORS.neonGlow.length];
  const detail1 = createCube(width * 0.9, height * 0.3, depth * 0.9, detailColor1, [x, height * 0.15, z]);
  const detail2 = createCube(width * 0.8, height * 0.2, depth * 0.8, detailColor2, [x, height * 0.9, z]);
  
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
        dimColor: windowColor & 0x555555 // Dim by masking bits
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
      pulsePhase: Math.random() * Math.PI * 2
    });
  }
  
  buildings.push({
    main: building,
    details: [detail1, detail2],
    windows: windows,
    x: x, z: z, height: height
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
    const bridge = createCube(16, 2, 4, bridgeColor, [bridgeX/2, 25, bridgeZ/2]);
    setRotation(bridge, 0, angle, 0);
    
    // Add underglow to bridges
    const bridgeGlow = createCube(17, 0.5, 4.5, COLORS.underglow[i % COLORS.underglow.length], [bridgeX/2, 24, bridgeZ/2]);
    setRotation(bridgeGlow, 0, angle, 0);
  }
  
  // Antenna array on top
  for (let i = 0; i < 6; i++) {
    const antenna = createCube(0.3, 8, 0.3, 0xffffff, [
      Math.random() * 8 - 4,
      64,
      Math.random() * 8 - 4
    ]);
    
    // Blinking light on antenna
    const light = createSphere(0.5, 0xff0000, [
      Math.random() * 8 - 4,
      68,
      Math.random() * 8 - 4
    ]);
    
    cityLights.push({
      mesh: light,
      blinkTime: Math.random() * 2,
      isOn: true
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
    x: 0, y: 2, z: 0,
    vx: 0, vy: 0, vz: 0,
    rotation: 0,
    tilt: 0,
    boost: 1
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
    x: x, y: y, z: z,
    vx: (Math.random() - 0.5) * 8,
    vy: 0,
    vz: (Math.random() - 0.5) * 8,
    target: { x: x, y: y, z: z },
    speed: 2 + Math.random() * 4,
    turnRate: Math.random() * 2 + 1,
    nextWaypoint: Math.random() * 10
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
  
  const particle = createSphere(0.1, COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)], [x, y, z]);
  
  particles.push({
    mesh: particle,
    x: x, y: y, z: z,
    vx: (Math.random() - 0.5) * 2,
    vy: Math.random() * 0.5,
    vz: (Math.random() - 0.5) * 2,
    life: 5 + Math.random() * 10,
    maxLife: 15,
    type: 'ambient'
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
  if (btn(0)) { // Left
    inputX = -1;
    player.tilt = Math.max(player.tilt - dt * 3, -0.4);
  }
  if (btn(1)) { // Right  
    inputX = 1;
    player.tilt = Math.min(player.tilt + dt * 3, 0.4);
  }
  
  // ⬆️⬇️ Forward/backward movement
  if (btn(2)) { // Up
    inputZ = -1;
  }
  if (btn(3)) { // Down
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
  if (btn(4)) { // Z - Down
    player.vy -= moveSpeed * dt * 0.8; // Faster vertical
  }
  if (btn(5)) { // X - Up
    player.vy += moveSpeed * dt * 0.8; // Faster vertical
  }
  
  // 💨 BOOST - More powerful!
  if (btnp(6)) { // Space
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
  if (btnp(7)) { // Shift
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
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
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
      setPosition(obj.mesh, 
        Math.cos(obj.angle) * 40,
        newY,
        Math.sin(obj.angle) * 40
      );
      setPosition(obj.glow,
        Math.cos(obj.angle) * 40,
        newY - 0.5,
        Math.sin(obj.angle) * 40
      );
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
      player.z + (Math.random() - 0.5) * 5
    ]);
    
    particles.push({
      mesh: particle,
      x: player.x, y: player.y, z: player.z,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 8,
      vz: (Math.random() - 0.5) * 20,
      life: 2.0,
      maxLife: 2.0,
      type: 'boost'
    });
  }
}

function createThrusterParticles() {
  // 🔥 BRIGHTER THRUSTER TRAIL - Alternating colors
  const thrusterColors = [0xff6600, 0xffaa00, 0xff00ff, 0x00ffff];
  for (let i = 0; i < 3; i++) {
    const thrusterX = player.x + (i === 0 ? -1.2 : 1.2);
    const particle = createSphere(0.2, thrusterColors[Math.floor(Math.random() * thrusterColors.length)], [
      thrusterX,
      player.y - 0.5,
      player.z - 1
    ]);
    
    particles.push({
      mesh: particle,
      x: thrusterX, y: player.y - 0.5, z: player.z - 1,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3,
      vz: Math.random() * 10 + 6,
      life: 1.0,
      maxLife: 1.0,
      type: 'thruster'
    });
  }
}

function createVehicleThrusterParticles(x, y, z) {
  const particle = createSphere(0.1, 0x4488ff, [x, y - 0.3, z - 0.8]);
  
  particles.push({
    mesh: particle,
    x: x, y: y - 0.3, z: z - 0.8,
    vx: (Math.random() - 0.5) * 2,
    vy: -Math.random(),
    vz: Math.random() * 3 + 2,
    life: 0.5,
    maxLife: 0.5,
    type: 'vehicle'
  });
}

function drawHUD() {
  // Main HUD background
  rect(16, 16, 500, 120, rgba8(0, 0, 20, 180), true);
  rect(16, 16, 500, 120, rgba8(0, 100, 200, 100), false);
  
  // Title
  print('🌃 CYBERPUNK CITY 3D', 24, 24, rgba8(0, 255, 255, 255));
  print('ULTIMATE N64/PSX FANTASY CONSOLE', 24, 40, rgba8(255, 100, 255, 255));
  
  // Player stats
  const speedMag = Math.sqrt(player.vx*player.vx + player.vz*player.vz);
  print(`SPEED: ${speedMag.toFixed(1)}`, 24, 60, rgba8(255, 255, 100, 255));
  print(`ALTITUDE: ${player.y.toFixed(1)}m`, 24, 76, rgba8(100, 255, 100, 255));
  print(`MODE: ${flying ? 'FLIGHT' : 'HOVER'}`, 24, 92, rgba8(255, 150, 50, 255));
  print(`BOOST: ${player.boost.toFixed(1)}x`, 24, 108, rgba8(255, 50, 50, 255));
  
  // Position
  print(`X: ${player.x.toFixed(1)}`, 200, 60, rgba8(200, 200, 255, 255));
  print(`Y: ${player.y.toFixed(1)}`, 200, 76, rgba8(200, 200, 255, 255));
  print(`Z: ${player.z.toFixed(1)}`, 200, 92, rgba8(200, 200, 255, 255));
  
  // Scene stats
  print(`BUILDINGS: ${buildings.length}`, 320, 60, rgba8(150, 255, 150, 255));
  print(`VEHICLES: ${vehicles.length}`, 320, 76, rgba8(255, 255, 150, 255));
  print(`PARTICLES: ${particles.length}`, 320, 92, rgba8(255, 150, 255, 255));
  print(`LIGHTS: ${cityLights.length}`, 320, 108, rgba8(150, 150, 255, 255));
  
  // Performance
  const stats = get3DStats();
  if (stats) {
    print(`3D MESHES: ${stats.meshes || 0}`, 420, 60, rgba8(100, 255, 255, 255));
    print(`RENDERER: ${stats.renderer || 'ThreeJS'}`, 420, 76, rgba8(100, 255, 255, 255));
  }
  
  // Controls
  rect(16, 350, 580, 60, rgba8(0, 0, 0, 150), true);
  print('WASD: Move | SHIFT: Flight Mode | SPACE: Boost | ZX: Up/Down', 24, 360, rgba8(255, 255, 255, 200));
  print('Experience true Nintendo 64 / PlayStation style 3D with GPU acceleration!', 24, 380, rgba8(100, 255, 100, 180));
  
  // Mini-map (simple radar)
  const radarSize = 80;
  const radarX = 540;
  const radarY = 200;
  
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 50, 0, 150), true);
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 255, 0, 100), false);
  
  // 📍 Player dot (bright white)
  rect(radarX - 1, radarY - 1, 2, 2, rgba8(255, 255, 255, 255), true);
  
  // 📍 Vehicle dots (magenta)
  vehicles.forEach(vehicle => {
    const relX = (vehicle.x - player.x) / CITY_SIZE * radarSize * 0.4;
    const relZ = (vehicle.z - player.z) / CITY_SIZE * radarSize * 0.4;
    if (Math.abs(relX) < radarSize/2 && Math.abs(relZ) < radarSize/2) {
      rect(radarX + relX - 1, radarY + relZ - 1, 2, 2, rgba8(255, 0, 255, 200), true);
    }
  });
  
  print('RADAR', radarX - 15, radarY + radarSize/2 + 8, rgba8(0, 255, 0, 255));
}