// F-ZERO NOVA - Ultimate 3D Racing Experience 
// Nintendo 64 F-Zero style racing with full GPU acceleration and retro effects

// Ensure API functions are available
if (typeof get3DStats === 'undefined') {
  globalThis.get3DStats = () => ({ meshes: 0, renderer: 'Unknown' });
}

// Screen management
let gameState = 'start'; // 'start', 'racing'
let startScreenTime = 0;
let uiButtons = [];

let gameTime = 0;
let raceTrack = [];
let player = null;
let opponents = [];
let trackPieces = [];
let particles = [];
let powerUps = [];
let lapTime = 0;
let currentLap = 1;
let maxLaps = 3;
let racePosition = 1;
let speed = 0;
let maxSpeed = 120;
let boost = 0;
let health = 100;

// Track configuration
const TRACK_WIDTH = 20;
const TRACK_SEGMENTS = 200;
const TRACK_RADIUS = 150;
const OPPONENT_COUNT = 7;

// Colors (F-Zero inspired)
const COLORS = {
  player: 0x0088ff,
  opponents: [0xff4444, 0x44ff44, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0x8844ff],
  track: [0x333366, 0x444477, 0x555588],
  powerup: [0xff0080, 0x80ff00, 0x0080ff, 0xff8000],
  particle: [0xff6600, 0x0066ff, 0x66ff00, 0xff0066]
};

export async function init() {
  console.log("🏁 F-ZERO NOVA - Initializing Ultimate 3D Racing...");
  
  try {
    // Professional 3D setup
    setCameraPosition(-20, 15, 20);
    setCameraTarget(0, 2, 0);
    setCameraFOV(90); // Wide FOV for racing
    
    // Advanced multi-layered lighting system
    setupAdvancedLighting();
    
    // Dynamic atmospheric fog with color shifting
    setupDynamicFog();
    
    // Professional post-processing pipeline
    setupPostProcessingEffects();
    
    await buildRaceTrack();
    createPlayer();
    spawnOpponents();
    spawnPowerUps();
    initRaceParticles();
    
    // Initialize start screen
    initStartScreen();
    
    console.log("✅ F-ZERO NOVA - Initialization complete!");
  } catch (error) {
    console.error("❌ F-ZERO NOVA - Initialization failed:", error);
    // Fallback initialization
    setCameraPosition(-20, 15, 20);
    setCameraTarget(0, 2, 0);
    setFog(0x220044, 50, 300);
  }
}

function initStartScreen() {
  uiButtons = [];
  
  uiButtons.push(
    createButton(centerX(240), 150, 240, 60, '🏁 START RACE', () => {
      console.log('🎯 START RACE CLICKED! Changing gameState to racing...');
      gameState = 'racing';
      // Reset race state
      currentLap = 1;
      lapTime = 0;
      speed = 0;
      health = 100;
      console.log('✅ gameState is now:', gameState);
    }, {
      normalColor: rgba8(255, 150, 0, 255),
      hoverColor: rgba8(255, 180, 30, 255),
      pressedColor: rgba8(220, 120, 0, 255)
    })
  );
  
  uiButtons.push(
    createButton(centerX(200), 355, 200, 45, '🎮 CONTROLS', () => {
      console.log('Controls: ARROWS=Steer/Accelerate, SPACE=Boost, Z=Brake');
    }, {
      normalColor: rgba8(100, 200, 255, 255),
      hoverColor: rgba8(130, 220, 255, 255),
      pressedColor: rgba8(70, 170, 230, 255)
    })
  );
}

export function update(dt) {
  gameTime += dt;
  
  if (gameState === 'start') {
    startScreenTime += dt;
    updateAllButtons();
    
    // Animate scene in background
    updateOpponents(dt);
    updateTrack(dt);
    updateParticles(dt);
    updateAdvancedLighting(dt);
    
    // Cinematic camera orbit
    const angle = gameTime * 0.3;
    setCameraPosition(Math.cos(angle) * 30, 18, Math.sin(angle) * 30);
    setCameraTarget(0, 2, 0);
    return;
  }
  
  lapTime += dt;
  
  handleInput(dt);
  updatePlayer(dt);
  updateOpponents(dt);
  updateTrack(dt);
  updateParticles(dt);
  updatePowerUps(dt);
  updateCamera(dt);
  updateRaceLogic(dt);
  
  // Advanced visual effects
  updateAdvancedLighting(dt);
  updatePostProcessing(dt);
  updateTrackLighting(dt);
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // 3D scene automatically rendered
  try {
    drawRacingHUD();
  } catch (error) {
    console.error('Error in F-Zero draw function:', error);
    // Fallback minimal HUD
    cls();
    print('F-ZERO NOVA', 10, 10, rgba8(255, 255, 255, 255));
    print('Error: Reloading...', 10, 30, rgba8(255, 0, 0, 255));
  }
}

function drawStartScreen() {
  // Racing gradient background (orange to red)
  drawGradientRect(0, 0, 640, 360,
    rgba8(80, 30, 10, 235),
    rgba8(40, 15, 5, 250),
    true
  );
  
  // Animated title with speed effect
  setFont('huge');
  setTextAlign('center');
  const speed = Math.sin(startScreenTime * 5) * 0.4 + 0.6;
  const speedColor = rgba8(
    255,
    Math.floor(speed * 180),
    0,
    255
  );
  
  const offset = Math.sin(startScreenTime * 8) * 5;
  drawTextShadow('F-ZERO', 320 + offset, 50, speedColor, rgba8(0, 0, 0, 255), 8, 1);
  drawTextShadow('NOVA', 320, 110, rgba8(100, 200, 255, 255), rgba8(0, 0, 0, 255), 8, 1);
  
  // Subtitle
  setFont('large');
  const pulse = Math.sin(startScreenTime * 6) * 0.2 + 0.8;
  drawTextOutline('🏁 Extreme 3D Racing 🏁', 320, 170, 
    rgba8(255, 255, 0, Math.floor(pulse * 255)), 
    rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(480), 215, 480, 185, {
    bgColor: rgba8(30, 15, 10, 220),
    borderColor: rgba8(255, 150, 0, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(50, 25, 15, 220)
  });
  drawPanel(panel);
  
  setFont('normal');
  setTextAlign('center');
  drawText('RACE SPECIFICATIONS', 320, 235, rgba8(255, 150, 0, 255), 1);
  
  setFont('small');
  drawText('🏁 High-speed futuristic racing', 320, 260, uiColors.light, 1);
  drawText('🏁 Maximum speed: 120 km/h with boost', 320, 275, uiColors.light, 1);
  drawText('🏁 3 laps against 7 AI opponents', 320, 290, uiColors.light, 1);
  drawText('🏁 Nintendo 64 F-Zero inspired graphics', 320, 305, uiColors.light, 1);
  
  setFont('tiny');
  drawText('ARROWS: Steer/Accelerate | SPACE: Boost | Z: Brake', 320, 325, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 7) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('🏁 PREPARE FOR MAXIMUM VELOCITY 🏁', 320, 435, rgba8(255, 200, 0, alpha), 1);
  
  // Info
  setFont('tiny');
  drawText('Advanced 3D Racing Engine', 320, 350, rgba8(200, 150, 100, 150), 1);
}

async function buildRaceTrack() {
  // Create main track loop with elevation changes and banking
  for (let i = 0; i < TRACK_SEGMENTS; i++) {
    const angle = (i / TRACK_SEGMENTS) * Math.PI * 2;
    const nextAngle = ((i + 1) / TRACK_SEGMENTS) * Math.PI * 2;
    
    // Track position with curves and elevation
    const x = Math.cos(angle) * TRACK_RADIUS;
    const z = Math.sin(angle) * TRACK_RADIUS;
    const y = Math.sin(angle * 3) * 8 + Math.cos(angle * 1.5) * 4; // Elevation changes
    
    const nextX = Math.cos(nextAngle) * TRACK_RADIUS;
    const nextZ = Math.sin(nextAngle) * TRACK_RADIUS;
    const nextY = Math.sin(nextAngle * 3) * 8 + Math.cos(nextAngle * 1.5) * 4;
    
    // Calculate banking angle
    const bankingAngle = Math.sin(angle * 2) * 0.3;
    
    // Create track segment
    const segment = createTrackSegment(x, y, z, nextX, nextY, nextZ, bankingAngle, i);
    trackPieces.push(segment);
    
    // Add track decorations with lighting
    if (i % 10 === 0) {
      await createTrackDecorations(x, y, z, angle);
    }
    
    // Add lighting elements along the track
    if (i % 5 === 0) {
      createTrackLighting(x, y, z, angle, i);
    }
    
    // Start/finish line with special lighting
    if (i === 0) {
      createStartFinishLine(x, y, z, angle);
      createStartLineLighting(x, y, z, angle);
    }
    
    // Boost pads
    if (i % 25 === 0) {
      createBoostPad(x, y + 0.5, z, angle);
    }
  }
  
  // Create outer barriers
  for (let i = 0; i < TRACK_SEGMENTS; i++) {
    const angle = (i / TRACK_SEGMENTS) * Math.PI * 2;
    const outerRadius = TRACK_RADIUS + TRACK_WIDTH;
    const innerRadius = TRACK_RADIUS - TRACK_WIDTH;
    
    const x = Math.cos(angle) * TRACK_RADIUS;
    const z = Math.sin(angle) * TRACK_RADIUS;
    const y = Math.sin(angle * 3) * 8 + Math.cos(angle * 1.5) * 4;
    
    // Outer barrier
    const outerX = Math.cos(angle) * outerRadius;
    const outerZ = Math.sin(angle) * outerRadius;
    const outerBarrier = createCube(2, 6, 2, 0x666688, [outerX, y + 3, outerZ]);
    
    // Inner barrier  
    const innerX = Math.cos(angle) * innerRadius;
    const innerZ = Math.sin(angle) * innerRadius;
    const innerBarrier = createCube(2, 6, 2, 0x666688, [innerX, y + 3, innerZ]);
    
    // Add neon lighting to barriers
    if (i % 5 === 0) {
      const neonColor = COLORS.powerup[i % COLORS.powerup.length];
      const neonOuter = createCube(2.2, 0.5, 2.2, neonColor, [outerX, y + 5.5, outerZ]);
      const neonInner = createCube(2.2, 0.5, 2.2, neonColor, [innerX, y + 5.5, innerZ]);
    }
  }
}

function createTrackSegment(x, y, z, nextX, nextY, nextZ, banking, index) {
  // Main track surface
  const centerX = (x + nextX) / 2;
  const centerY = (y + nextY) / 2;  
  const centerZ = (z + nextZ) / 2;
  
  const length = Math.sqrt((nextX-x)**2 + (nextY-y)**2 + (nextZ-z)**2);
  const angle = Math.atan2(nextZ - z, nextX - x);
  
  const trackColor = COLORS.track[index % COLORS.track.length];
  const segment = createCube(length, 0.5, TRACK_WIDTH, trackColor, [centerX, centerY, centerZ]);
  
  setRotation(segment, 0, angle, banking);
  
  // Racing line markers
  if (index % 8 === 0) {
    const marker = createCube(length, 0.1, 1, 0xffffff, [centerX, centerY + 0.3, centerZ]);
    setRotation(marker, 0, angle, banking);
  }
  
  return {
    mesh: segment,
    x: centerX, y: centerY, z: centerZ,
    angle: angle,
    banking: banking,
    index: index
  };
}

async function createTrackDecorations(x, y, z, angle) {
  // Grandstands
  if (Math.random() < 0.3) {
    const standX = x + Math.cos(angle + Math.PI/2) * 40;
    const standZ = z + Math.sin(angle + Math.PI/2) * 40;
    const grandstand = createCube(20, 12, 8, 0x555577, [standX, y + 6, standZ]);
    
    // Stadium lights
    for (let i = 0; i < 4; i++) {
      const lightX = standX + (i - 1.5) * 6;
      const light = createSphere(1, 0xffffaa, [lightX, y + 18, standZ]);
    }
  }
  
  // Sponsor banners
  if (Math.random() < 0.4) {
    const bannerX = x + Math.cos(angle + Math.PI/2) * 25;
    const bannerZ = z + Math.sin(angle + Math.PI/2) * 25;
    const banner = createCube(12, 4, 0.5, COLORS.powerup[Math.floor(Math.random() * COLORS.powerup.length)], 
                             [bannerX, y + 8, bannerZ]);
    setRotation(banner, 0, angle, 0);
  }
}

function createStartFinishLine(x, y, z, angle) {
  // Checkered pattern start/finish
  for (let i = 0; i < 8; i++) {
    const stripX = x + Math.cos(angle + Math.PI/2) * (i - 4) * 2.5;
    const stripZ = z + Math.sin(angle + Math.PI/2) * (i - 4) * 2.5;
    const color = i % 2 === 0 ? 0xffffff : 0x000000;
    const strip = createCube(2, 0.1, 2, color, [stripX, y + 0.3, stripZ]);
  }
  
  // Start gantry
  const gantry = createCube(TRACK_WIDTH * 2, 8, 2, 0x888899, [x, y + 8, z]);
  setRotation(gantry, 0, angle + Math.PI/2, 0);
  
  // Digital display
  const display = createCube(16, 4, 0.5, 0x002200, [x, y + 10, z + 1]);
  setRotation(display, 0, angle + Math.PI/2, 0);
}

function createBoostPad(x, y, z, angle) {
  // Glowing boost pad
  const pad = createCube(8, 0.3, 4, 0x00ff88, [x, y, z]);
  setRotation(pad, 0, angle + Math.PI/2, 0);
  
  // Energy field effect
  const field = createCube(8.5, 1, 4.5, 0x0088ff, [x, y + 0.5, z]);
  setRotation(field, 0, angle + Math.PI/2, 0);
  
  trackPieces.push({
    type: 'boost',
    mesh: pad,
    field: field,
    x: x, y: y, z: z,
    angle: angle
  });
}

function createPlayer() {
  // Sleek F-Zero style racer
  const body = createCube(4, 0.8, 2, COLORS.player, [0, 2, 0]);
  const cockpit = createSphere(1.2, 0x004488, [0, 2.5, 0.3]);
  const wing = createCube(6, 0.2, 0.8, 0x0066aa, [0, 2.8, -1.5]);
  
  // Hover engines
  const engine1 = createCube(0.8, 0.6, 1.5, 0xff4400, [-1.5, 1.5, -0.8]);
  const engine2 = createCube(0.8, 0.6, 1.5, 0xff4400, [1.5, 1.5, -0.8]);
  
  // Underglow
  const glow = createCube(4.5, 0.2, 2.5, 0x00aaff, [0, 1, 0]);
  
  player = {
    body: body,
    cockpit: cockpit,
    wing: wing,
    engines: [engine1, engine2],
    glow: glow,
    x: 0, y: 2, z: -TRACK_RADIUS,
    vx: 0, vy: 0, vz: 0,
    rotation: 0,
    tilt: 0,
    trackPosition: 0,
    lanePosition: 0,
    speed: 0,
    health: 100,
    boost: 0
  };
}

function spawnOpponents() {
  for (let i = 0; i < OPPONENT_COUNT; i++) {
    const opponent = createOpponent(i);
    opponents.push(opponent);
  }
}

function createOpponent(index) {
  const color = COLORS.opponents[index % COLORS.opponents.length];
  const startPos = (index + 1) * -15; // Stagger starting positions
  
  const body = createCube(4, 0.8, 2, color, [0, 2, startPos]);
  const cockpit = createSphere(1, color - 0x222222, [0, 2.4, startPos + 0.2]);
  const glow = createCube(4.2, 0.2, 2.2, color + 0x333333, [0, 1, startPos]);
  
  return {
    body: body,
    cockpit: cockpit,
    glow: glow,
    x: 0, y: 2, z: startPos,
    vx: 0, vy: 0, vz: 0,
    rotation: 0,
    trackPosition: startPos,
    lanePosition: (Math.random() - 0.5) * 8,
    speed: 40 + Math.random() * 30,
    maxSpeed: 80 + Math.random() * 40,
    aiType: Math.random() < 0.5 ? 'aggressive' : 'defensive',
    nextDecision: Math.random() * 2
  };
}

function spawnPowerUps() {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * TRACK_RADIUS;
    const z = Math.sin(angle) * TRACK_RADIUS;
    const y = Math.sin(angle * 3) * 8 + Math.cos(angle * 1.5) * 4 + 3;
    
    const type = Math.floor(Math.random() * 4);
    const color = COLORS.powerup[type];
    const powerup = createSphere(1, color, [x, y, z]);
    
    powerUps.push({
      mesh: powerup,
      type: ['boost', 'health', 'shield', 'speed'][type],
      x: x, y: y, z: z,
      rotation: 0,
      active: true
    });
  }
}

function initRaceParticles() {
  // Create exhaust particles for all vehicles
  for (let i = 0; i < 50; i++) {
    createExhaustParticle(0, 0, 0);
  }
}

function handleInput(dt) {
  const acceleration = 80;
  const steering = 40;
  const braking = 60;
  
  // Acceleration
  if (btn(2)) { // Up
    speed = Math.min(speed + acceleration * dt, maxSpeed);
  } else {
    speed = Math.max(speed - 20 * dt, 0);
  }
  
  // Braking
  if (btn(3)) { // Down  
    speed = Math.max(speed - braking * dt, 0);
  }
  
  // Steering
  if (btn(0)) { // Left
    player.lanePosition = Math.max(player.lanePosition - steering * dt, -TRACK_WIDTH/2);
    player.tilt = Math.max(player.tilt - dt * 3, -0.5);
  } else if (btn(1)) { // Right
    player.lanePosition = Math.min(player.lanePosition + steering * dt, TRACK_WIDTH/2);
    player.tilt = Math.min(player.tilt + dt * 3, 0.5);
  } else {
    player.tilt *= 0.9;
  }
  
  // Boost
  if (btnp(5) && boost > 20) { // X
    speed += 40;
    boost -= 20;
    createBoostEffect();
  }
}

function updatePlayer(dt) {
  // Update track position
  player.trackPosition += speed * dt;
  
  // Wrap around track
  const trackLength = TRACK_SEGMENTS * 10; // Approximate
  if (player.trackPosition >= trackLength) {
    player.trackPosition -= trackLength;
    currentLap++;
    lapTime = 0;
    
    // Spectacular lap completion celebration
    createLapCompletionEffect();
    console.log(`🏁 LAP ${currentLap - 1} COMPLETED! Spectacular celebration!`);
  }
  
  // Calculate world position from track position
  const normalizedPos = (player.trackPosition / trackLength) * Math.PI * 2;
  const trackX = Math.cos(normalizedPos) * TRACK_RADIUS;
  const trackZ = Math.sin(normalizedPos) * TRACK_RADIUS;
  const trackY = Math.sin(normalizedPos * 3) * 8 + Math.cos(normalizedPos * 1.5) * 4;
  
  // Apply lane offset
  const laneX = trackX + Math.cos(normalizedPos + Math.PI/2) * player.lanePosition;
  const laneZ = trackZ + Math.sin(normalizedPos + Math.PI/2) * player.lanePosition;
  
  player.x = laneX;
  player.y = trackY + 2;
  player.z = laneZ;
  player.rotation = normalizedPos + Math.PI/2;
  
  // Update mesh positions
  setPosition(player.body, player.x, player.y, player.z);
  setPosition(player.cockpit, player.x, player.y + 0.5, player.z + 0.3);
  setPosition(player.wing, player.x, player.y + 0.8, player.z - 1.5);
  setPosition(player.glow, player.x, player.y - 1, player.z);
  
  setPosition(player.engines[0], player.x - 1.5, player.y - 0.5, player.z - 0.8);
  setPosition(player.engines[1], player.x + 1.5, player.y - 0.5, player.z - 0.8);
  
  // Apply rotations
  setRotation(player.body, player.tilt * 0.2, player.rotation, player.tilt);
  setRotation(player.cockpit, 0, player.rotation, 0);
  setRotation(player.wing, 0, player.rotation, player.tilt * 0.5);
  
  // Create exhaust particles
  if (speed > 10) {
    createExhaustParticle(player.x, player.y - 0.5, player.z - 2);
  }
  
  // Boost decay
  boost = Math.max(0, boost - 10 * dt);
  
  // Speed effects
  if (speed > 80) {
    createSpeedParticles();
  }
}

function updateOpponents(dt) {
  opponents.forEach((opponent, index) => {
    // AI decision making
    opponent.nextDecision -= dt;
    if (opponent.nextDecision <= 0) {
      // Change lane or adjust speed based on AI type
      if (opponent.aiType === 'aggressive') {
        opponent.speed = Math.min(opponent.speed + 10, opponent.maxSpeed);
        opponent.lanePosition += (Math.random() - 0.5) * 8;
      } else {
        opponent.speed = Math.max(opponent.speed - 5, 20);
        // Stay in lane more
      }
      
      opponent.lanePosition = Math.max(-TRACK_WIDTH/2, 
                                     Math.min(TRACK_WIDTH/2, opponent.lanePosition));
      opponent.nextDecision = 1 + Math.random() * 3;
    }
    
    // Update position similar to player
    opponent.trackPosition += opponent.speed * dt;
    
    const trackLength = TRACK_SEGMENTS * 10;
    if (opponent.trackPosition >= trackLength) {
      opponent.trackPosition -= trackLength;
    }
    
    const normalizedPos = (opponent.trackPosition / trackLength) * Math.PI * 2;
    const trackX = Math.cos(normalizedPos) * TRACK_RADIUS;
    const trackZ = Math.sin(normalizedPos) * TRACK_RADIUS;
    const trackY = Math.sin(normalizedPos * 3) * 8 + Math.cos(normalizedPos * 1.5) * 4;
    
    const laneX = trackX + Math.cos(normalizedPos + Math.PI/2) * opponent.lanePosition;
    const laneZ = trackZ + Math.sin(normalizedPos + Math.PI/2) * opponent.lanePosition;
    
    opponent.x = laneX;
    opponent.y = trackY + 2;
    opponent.z = laneZ;
    opponent.rotation = normalizedPos + Math.PI/2;
    
    // Update mesh positions
    setPosition(opponent.body, opponent.x, opponent.y, opponent.z);
    setPosition(opponent.cockpit, opponent.x, opponent.y + 0.4, opponent.z + 0.2);
    setPosition(opponent.glow, opponent.x, opponent.y - 1, opponent.z);
    
    setRotation(opponent.body, 0, opponent.rotation, 0);
    
    // Occasional exhaust
    if (Math.random() < 0.3) {
      createExhaustParticle(opponent.x, opponent.y - 0.5, opponent.z - 1.5);
    }
  });
}

function updateTrack(dt) {
  // Animate boost pads
  trackPieces.forEach(piece => {
    if (piece.type === 'boost') {
      piece.pulsePhase = (piece.pulsePhase || 0) + dt * 4;
      const intensity = 0.7 + 0.3 * Math.sin(piece.pulsePhase);
      // In real implementation, would modify material emission
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
    
    particle.vy -= 20 * dt; // Gravity
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
    }
  }
}

function updatePowerUps(dt) {
  powerUps.forEach(powerup => {
    if (!powerup.active) return;
    
    // Rotation animation
    powerup.rotation += dt * 3;
    setRotation(powerup.mesh, 0, powerup.rotation, 0);
    
    // Bob up and down
    const bobY = powerup.y + Math.sin(gameTime * 2 + powerup.x) * 0.5;
    setPosition(powerup.mesh, powerup.x, bobY, powerup.z);
    
    // Check collision with player
    const dx = powerup.x - player.x;
    const dy = powerup.y - player.y;
    const dz = powerup.z - player.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance < 3) {
      collectPowerUp(powerup);
    }
  });
}

function updateCamera(dt) {
  // Dynamic racing camera
  const followDistance = 8 + speed * 0.1;
  const followHeight = 4 + speed * 0.02;
  const lookAhead = speed * 0.05;
  
  const cameraX = player.x - Math.sin(player.rotation) * followDistance;
  const cameraY = player.y + followHeight;
  const cameraZ = player.z - Math.cos(player.rotation) * followDistance;
  
  const targetX = player.x + Math.sin(player.rotation) * lookAhead;
  const targetY = player.y + 1;
  const targetZ = player.z + Math.cos(player.rotation) * lookAhead;
  
  setCameraPosition(cameraX, cameraY, cameraZ);
  setCameraTarget(targetX, targetY, targetZ);
  
  // Field of view based on speed
  const fov = 90 + speed * 0.2;
  setCameraFOV(Math.min(fov, 120));
}

function updateRaceLogic(dt) {
  // Calculate race position
  let position = 1;
  opponents.forEach(opponent => {
    if (opponent.trackPosition > player.trackPosition) {
      position++;
    }
  });
  racePosition = position;
  
  // Check for race completion
  if (currentLap > maxLaps) {
    // Race finished!
    console.log(`Race completed! Final position: ${racePosition}`);
  }
}

function collectPowerUp(powerup) {
  switch (powerup.type) {
    case 'boost':
      boost = Math.min(100, boost + 30);
      break;
    case 'health':
      health = Math.min(100, health + 25);
      break;
    case 'shield':
      // Temporary invincibility
      break;
    case 'speed':
      maxSpeed += 10;
      break;
  }
  
  // Hide powerup
  powerup.active = false;
  setScale(powerup.mesh, 0);
  
  // Create spectacular collection effect
  const pos = getPosition(powerup.mesh);
  if (pos) {
    createPowerUpCollectionEffect(pos[0], pos[1], pos[2], powerup.type);
  }
  createCollectionEffect(powerup.x, powerup.y, powerup.z);
}

function createExhaustParticle(x, y, z) {
  // Dynamic particle color based on speed and boost
  let particleColor;
  const speedFactor = Math.min(speed / maxSpeed, 1.0);
  const boostFactor = boost / 100;
  
  if (boostFactor > 0.5) {
    // Boost particles - hot orange/yellow
    particleColor = 0xff6600 + Math.floor(boostFactor * 0x009900);
  } else if (speedFactor > 0.7) {
    // High speed particles - blue to white
    const intensity = Math.floor(speedFactor * 255);
    particleColor = (intensity << 16) | (intensity << 8) | 0xff;
  } else {
    // Normal particles - use original random colors
    particleColor = COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)];
  }
  
  const particle = createSphere(0.3, particleColor, [x, y, z]);
  
  particles.push({
    mesh: particle,
    x: x, y: y, z: z,
    vx: (Math.random() - 0.5) * 8,
    vy: Math.random() * 3,
    vz: -Math.random() * 12 - 5,
    life: 1.5,
    maxLife: 1.5,
    type: 'exhaust',
    color: particleColor
  });
}

function createSpeedParticles() {
  const speedFactor = Math.min(speed / maxSpeed, 1.0);
  const particleCount = Math.floor(3 + speedFactor * 3); // More particles at higher speeds
  
  for (let i = 0; i < particleCount; i++) {
    // Dynamic speed particle colors
    const intensity = Math.floor(128 + speedFactor * 127);
    const speedColor = (intensity << 8) | 0xff | (Math.floor(speedFactor * 0xaa) << 16);
    
    const particle = createSphere(0.15 + speedFactor * 0.1, speedColor, [
      player.x + (Math.random() - 0.5) * 8,
      player.y + (Math.random() - 0.5) * 3,
      player.z + (Math.random() - 0.5) * 6
    ]);
    
    particles.push({
      mesh: particle,
      x: player.x, y: player.y, z: player.z,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 5,
      vz: -Math.random() * 30 - 10,
      life: 0.8,
      maxLife: 0.8,
      type: 'speed'
    });
  }
}

function createBoostEffect() {
  for (let i = 0; i < 15; i++) {
    const particle = createSphere(0.4, 0x00ffaa, [
      player.x + (Math.random() - 0.5) * 4,
      player.y + (Math.random() - 0.5) * 2,
      player.z - 2
    ]);
    
    particles.push({
      mesh: particle,
      x: player.x, y: player.y, z: player.z - 2,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 8,
      vz: -Math.random() * 20 - 15,
      life: 1.2,
      maxLife: 1.2,
      type: 'boost'
    });
  }
}

function createCollectionEffect(x, y, z) {
  for (let i = 0; i < 10; i++) {
    const particle = createSphere(0.2, 0xffffff, [x, y, z]);
    
    particles.push({
      mesh: particle,
      x: x, y: y, z: z,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * 8,
      vz: (Math.random() - 0.5) * 12,
      life: 1,
      maxLife: 1,
      type: 'collection'
    });
  }
}

function drawRacingHUD() {
  // Main race HUD
  rect(16, 16, 600, 140, rgba8(0, 0, 40, 200), true);
  rect(16, 16, 600, 140, rgba8(0, 150, 255, 120), false);
  
  // Title
  print('🏁 F-ZERO NOVA', 24, 24, rgba8(0, 255, 255, 255));
  print('ULTIMATE N64 RACING EXPERIENCE', 24, 40, rgba8(255, 200, 0, 255));
  
  // Race stats
  print(`LAP: ${currentLap}/${maxLaps}`, 24, 60, rgba8(255, 255, 100, 255));
  print(`POSITION: ${racePosition}/${OPPONENT_COUNT + 1}`, 24, 76, rgba8(255, 150, 50, 255));
  print(`LAP TIME: ${lapTime.toFixed(1)}s`, 24, 92, rgba8(100, 255, 100, 255));
  
  // Vehicle stats
  print(`SPEED: ${speed.toFixed(0)} KM/H`, 200, 60, rgba8(255, 100, 100, 255));
  print(`MAX SPEED: ${maxSpeed}`, 200, 76, rgba8(255, 200, 200, 255));
  print(`BOOST: ${boost.toFixed(0)}%`, 200, 92, rgba8(0, 200, 255, 255));
  print(`HEALTH: ${health.toFixed(0)}%`, 200, 108, rgba8(255, 255, 255, 255));
  
  // Technical stats
  print(`TRACK POS: ${player.trackPosition.toFixed(0)}`, 380, 60, rgba8(200, 200, 255, 255));
  print(`LANE: ${player.lanePosition.toFixed(1)}`, 380, 76, rgba8(200, 200, 255, 255));
  print(`TILT: ${player.tilt.toFixed(2)}`, 380, 92, rgba8(200, 200, 255, 255));
  
  // 3D Performance & Effects
  const stats = get3DStats();
  if (stats) {
    print(`3D MESHES: ${stats.meshes || 0}`, 500, 60, rgba8(150, 255, 150, 255));
    print(`GPU: ${stats.renderer || 'ThreeJS'}`, 500, 76, rgba8(150, 255, 150, 255));
  }
  
  // Visual effects status
  const speedFactor = Math.min(speed / maxSpeed, 1.0);
  const effectsColor = speedFactor > 0.8 ? rgba8(255, 255, 0, 255) : rgba8(150, 255, 150, 255);
  print(`EFFECTS: ${(speedFactor * 100).toFixed(0)}%`, 500, 92, effectsColor);
  print(`BLOOM: ${postProcessing.bloom.enabled ? 'ON' : 'OFF'}`, 500, 108, rgba8(255, 150, 255, 255));
  
  // Speed gauge (circular)
  const gaugeX = 580;
  const gaugeY = 200;
  const gaugeRadius = 40;
  
  // Gauge background
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2 - Math.PI/2;
    const x1 = gaugeX + Math.cos(angle) * (gaugeRadius - 5);
    const y1 = gaugeY + Math.sin(angle) * (gaugeRadius - 5);
    const x2 = gaugeX + Math.cos(angle) * gaugeRadius;
    const y2 = gaugeY + Math.sin(angle) * gaugeRadius;
    
    const intensity = i < (speed / maxSpeed) * 32 ? 255 : 50;
    const greenIntensity = Math.floor(intensity / 2); // Ensure integer division
    line(x1, y1, x2, y2, rgba8(intensity, greenIntensity, 0, 255));
  }
  
  // Speed needle
  const needleAngle = (speed / maxSpeed) * Math.PI * 2 - Math.PI/2;
  const needleX = gaugeX + Math.cos(needleAngle) * (gaugeRadius - 8);
  const needleY = gaugeY + Math.sin(needleAngle) * (gaugeRadius - 8);
  line(gaugeX, gaugeY, needleX, needleY, rgba8(255, 255, 255, 255));
  
  print('SPEED', gaugeX - 15, gaugeY + gaugeRadius + 8, rgba8(255, 255, 255, 255));
  
  // Mini-map (track layout)
  const mapX = 500;
  const mapY = 300;
  const mapSize = 80;
  
  rect(mapX - mapSize/2, mapY - mapSize/2, mapSize, mapSize, rgba8(0, 0, 50, 150), true);
  
  // Draw track outline
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const x = mapX + Math.cos(angle) * mapSize * 0.3;
    const y = mapY + Math.sin(angle) * mapSize * 0.3;
    pset(x, y, rgba8(100, 100, 255, 200));
  }
  
  // Player position
  const playerAngle = (player.trackPosition / (TRACK_SEGMENTS * 10)) * Math.PI * 2;
  const playerMapX = mapX + Math.cos(playerAngle) * mapSize * 0.3;
  const playerMapY = mapY + Math.sin(playerAngle) * mapSize * 0.3;
  pset(playerMapX, playerMapY, rgba8(255, 255, 255, 255));
  
  // Opponent positions
  opponents.forEach(opponent => {
    const oppAngle = (opponent.trackPosition / (TRACK_SEGMENTS * 10)) * Math.PI * 2;
    const oppMapX = mapX + Math.cos(oppAngle) * mapSize * 0.3;
    const oppMapY = mapY + Math.sin(oppAngle) * mapSize * 0.3;
    pset(oppMapX, oppMapY, rgba8(255, 100, 100, 200));
  });
  
  print('TRACK', mapX - 15, mapY + mapSize/2 + 8, rgba8(255, 255, 255, 255));
  
  // Controls
  print('↑↓ ACCELERATE/BRAKE | ←→ STEER | X BOOST', 24, 340, rgba8(255, 255, 255, 200));
  print('Experience ultimate Nintendo 64 / F-Zero style 3D racing!', 24, 360, rgba8(100, 255, 100, 180));
}

// ============================================================================
// ADVANCED LIGHTING & POST-PROCESSING SYSTEM
// ============================================================================

let lightingSystem = {
  mainLight: { color: 0xaaaaff, intensity: 1.0, direction: [-0.4, -0.8, -0.3] },
  ambientLight: { color: 0x444466, intensity: 0.3 },
  speedLight: { color: 0x00aaff, intensity: 0.0 },
  boostLight: { color: 0xffaa00, intensity: 0.0 },
  trackLights: [],
  dynamicFog: { color: 0x220044, near: 50, far: 300, pulse: 0 }
};

let postProcessing = {
  bloom: { enabled: true, intensity: 0.8, threshold: 0.6 },
  motionBlur: { enabled: true, intensity: 0.8 },
  chromaticAberration: { enabled: true, intensity: 0.3 },
  vignette: { enabled: true, intensity: 0.4 },
  scanlines: { enabled: true, intensity: 0.2 },
  pixelation: { enabled: true, factor: 1.2 },
  colorGrading: { enabled: true, temperature: 0.1, tint: -0.05 }
};

function setupAdvancedLighting() {
  console.log("🌟 Setting up advanced lighting system...");
  
  // Main directional light (sun/moon)
  if (typeof setLightDirection === 'function') {
    setLightDirection(...lightingSystem.mainLight.direction);
  }
  if (typeof setLightColor === 'function') {
    setLightColor(lightingSystem.mainLight.color);
  }
  if (typeof setLightIntensity === 'function') {
    setLightIntensity(lightingSystem.mainLight.intensity);
  }
  
  // Enhanced ambient lighting
  if (typeof setAmbientLight === 'function') {
    setAmbientLight(lightingSystem.ambientLight.color, lightingSystem.ambientLight.intensity);
  }
  
  // Add point lights for track illumination
  setupTrackLighting();
  
  console.log("✅ Advanced lighting system initialized");
}

function setupTrackLighting() {
  // Create point lights along the track for dynamic illumination
  console.log("🔸 Setting up track point lights...");
  
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x = Math.cos(angle) * TRACK_RADIUS;
    const z = Math.sin(angle) * TRACK_RADIUS;
    const y = 15; // Elevated light positions
    
    const lightColor = i % 2 === 0 ? 0x00aaff : 0xaa00ff; // Alternating blue/purple
    
    if (typeof addPointLight === 'function') {
      try {
        const lightId = addPointLight(x, y, z, lightColor, 2.0, 80);
        lightingSystem.trackLights.push({
          id: lightId,
          position: [x, y, z],
          color: lightColor,
          intensity: 2.0,
          baseIntensity: 2.0,
          pulsePhase: i * 0.5
        });
        console.log(`✅ Point light ${i} created successfully`);
      } catch (error) {
        console.warn(`⚠️ Failed to create point light ${i}:`, error);
      }
    } else {
      console.log("🔸 Point lights not supported, using basic lighting");
    }
  }
}

function setupDynamicFog() {
  console.log("🌫️ Setting up dynamic atmospheric fog...");
  
  // Initial fog setup
  setFog(lightingSystem.dynamicFog.color, 
         lightingSystem.dynamicFog.near, 
         lightingSystem.dynamicFog.far);
  
  console.log("✅ Dynamic fog system initialized");
}

function setupPostProcessingEffects() {
  console.log("🎪 Setting up post-processing pipeline...");
  
  // Enable core post-processing effects
  if (typeof enableBloom === 'function' && postProcessing.bloom.enabled) {
    enableBloom(postProcessing.bloom.intensity);
    if (typeof setBloomThreshold === 'function') {
      setBloomThreshold(postProcessing.bloom.threshold);
    }
  }
  
  if (typeof enableMotionBlur === 'function' && postProcessing.motionBlur.enabled) {
    enableMotionBlur(postProcessing.motionBlur.intensity);
  }
  
  if (typeof enablePixelation === 'function' && postProcessing.pixelation.enabled) {
    enablePixelation(postProcessing.pixelation.factor);
  }
  
  if (typeof enableDithering === 'function') {
    enableDithering(true);
  }
  
  // Advanced effects (if available)
  if (typeof enableChromaticAberration === 'function' && postProcessing.chromaticAberration.enabled) {
    enableChromaticAberration(postProcessing.chromaticAberration.intensity);
  }
  
  if (typeof enableVignette === 'function' && postProcessing.vignette.enabled) {
    enableVignette(postProcessing.vignette.intensity);
  }
  
  if (typeof enableScanlines === 'function' && postProcessing.scanlines.enabled) {
    enableScanlines(postProcessing.scanlines.intensity);
  }
  
  if (typeof enableColorGrading === 'function' && postProcessing.colorGrading.enabled) {
    enableColorGrading(postProcessing.colorGrading.temperature, postProcessing.colorGrading.tint);
  }
  
  console.log("✅ Post-processing pipeline initialized");
}

function updateAdvancedLighting(dt) {
  lightingSystem.dynamicFog.pulse += dt * 2;
  
  // Dynamic fog color shifting based on speed and time
  const speedFactor = Math.min(speed / maxSpeed, 1.0);
  const timeFactor = Math.sin(gameTime * 0.5) * 0.5 + 0.5;
  
  // Base fog color with speed-based intensity
  const baseR = 0x22 + Math.floor(speedFactor * 0x44);
  const baseG = 0x00 + Math.floor(timeFactor * 0x22);
  const baseB = 0x44 + Math.floor((speedFactor + timeFactor) * 0x33);
  
  const fogColor = (baseR << 16) | (baseG << 8) | baseB;
  
  // Dynamic fog distance based on speed
  const dynamicNear = 50 - speedFactor * 20;
  const dynamicFar = 300 + speedFactor * 100;
  
  setFog(fogColor, dynamicNear, dynamicFar);
  
  // Update track point lights with pulsing effects
  if (lightingSystem.trackLights && lightingSystem.trackLights.length > 0) {
    lightingSystem.trackLights.forEach((light, index) => {
      light.pulsePhase += dt * 3;
      const pulseIntensity = 0.7 + 0.3 * Math.sin(light.pulsePhase);
      const newIntensity = light.baseIntensity * pulseIntensity;
      
      if (typeof updatePointLight === 'function') {
        try {
          updatePointLight(light.id, light.position[0], light.position[1], light.position[2], 
                          light.color, newIntensity, 80);
        } catch (error) {
          // Silently ignore point light update errors
        }
      }
    });
  }
  
  // Speed-based lighting effects
  lightingSystem.speedLight.intensity = Math.min(speedFactor * 0.5, 0.5);
  lightingSystem.boostLight.intensity = Math.min(boost / 100 * 0.8, 0.8);
  
  // Boost lighting effect
  if (boost > 50) {
    const boostPulse = Math.sin(gameTime * 8) * 0.5 + 0.5;
    if (typeof setAmbientLight === 'function') {
      const boostAmbient = 0x444466 + Math.floor(boostPulse * 0x222200);
      setAmbientLight(boostAmbient, 0.3 + boostPulse * 0.2);
    }
  }
  
  // Main light direction sway for dynamic feel
  const lightSway = Math.sin(gameTime * 0.3) * 0.1;
  if (typeof setLightDirection === 'function') {
    setLightDirection(-0.4 + lightSway, -0.8, -0.3 + lightSway * 0.5);
  }
}

function updatePostProcessing(dt) {
  const speedFactor = Math.min(speed / maxSpeed, 1.0);
  
  // Dynamic motion blur based on speed
  if (typeof setMotionBlurIntensity === 'function') {
    const motionBlurIntensity = 0.3 + speedFactor * 0.7;
    setMotionBlurIntensity(motionBlurIntensity);
  }
  
  // Dynamic bloom based on boost and speed
  if (typeof setBloomIntensity === 'function') {
    const boostFactor = boost / 100;
    const bloomIntensity = 0.5 + speedFactor * 0.3 + boostFactor * 0.4;
    setBloomIntensity(Math.min(bloomIntensity, 1.2));
  }
  
  // Chromatic aberration increases with speed
  if (typeof setChromaticAberrationIntensity === 'function') {
    const aberrationIntensity = 0.1 + speedFactor * 0.4;
    setChromaticAberrationIntensity(aberrationIntensity);
  }
  
  // Vignette intensity based on health and speed
  if (typeof setVignetteIntensity === 'function') {
    const healthFactor = (100 - health) / 100;
    const vignetteIntensity = 0.2 + healthFactor * 0.5 + speedFactor * 0.2;
    setVignetteIntensity(Math.min(vignetteIntensity, 0.8));
  }
  
  // Scanlines flicker with speed
  if (typeof setScanlineIntensity === 'function') {
    const scanlineFlicker = Math.sin(gameTime * 30) * 0.1 + 0.9;
    const scanlineIntensity = (0.1 + speedFactor * 0.2) * scanlineFlicker;
    setScanlineIntensity(scanlineIntensity);
  }
  
  // Dynamic pixelation for extreme speeds
  if (typeof setPixelationFactor === 'function') {
    let pixelationFactor = 1.0;
    if (speed > 100) {
      pixelationFactor = 1.2 + (speed - 100) / 100;
    }
    setPixelationFactor(Math.min(pixelationFactor, 2.0));
  }
  
  // Color grading shifts for different racing conditions
  if (typeof updateColorGrading === 'function') {
    const temperature = -0.1 + speedFactor * 0.3; // Warmer at high speeds
    const tint = -0.05 + Math.sin(gameTime * 0.2) * 0.1; // Subtle color shifting
    updateColorGrading(temperature, tint);
  }
}

// ============================================================================
// ENHANCED TRACK LIGHTING SYSTEM
// ============================================================================

function createTrackLighting(x, y, z, angle, segmentIndex) {
  // Create glowing track markers
  const markerHeight = y + 8;
  const markerSize = 0.8;
  
  // Alternating neon colors for track sides
  const leftColor = segmentIndex % 4 === 0 ? 0x00ffff : 0xff00ff;
  const rightColor = segmentIndex % 4 === 0 ? 0xff00ff : 0x00ffff;
  
  // Left side marker
  const leftX = x + Math.cos(angle + Math.PI/2) * (TRACK_WIDTH/2 + 3);
  const leftZ = z + Math.sin(angle + Math.PI/2) * (TRACK_WIDTH/2 + 3);
  const leftMarker = createCube(leftX, markerHeight, leftZ, markerSize, {
    material: 'emissive',
    color: leftColor,
    emissive: leftColor,
    transparent: true,
    opacity: 0.8
  });
  
  // Right side marker
  const rightX = x + Math.cos(angle - Math.PI/2) * (TRACK_WIDTH/2 + 3);
  const rightZ = z + Math.sin(angle - Math.PI/2) * (TRACK_WIDTH/2 + 3);
  const rightMarker = createCube(rightX, markerHeight, rightZ, markerSize, {
    material: 'emissive',
    color: rightColor,
    emissive: rightColor,
    transparent: true,
    opacity: 0.8
  });
  
  // Store markers for animation
  trackPieces[trackPieces.length - 1].leftMarker = leftMarker;
  trackPieces[trackPieces.length - 1].rightMarker = rightMarker;
  trackPieces[trackPieces.length - 1].markerColors = { left: leftColor, right: rightColor };
}

function createStartLineLighting(x, y, z, angle) {
  // Create spectacular start/finish line lighting
  for (let i = -3; i <= 3; i++) {
    const markerX = x + Math.cos(angle + Math.PI/2) * i * 3;
    const markerZ = z + Math.sin(angle + Math.PI/2) * i * 3;
    const markerY = y + 12;
    
    const startMarker = createSphere(markerX, markerY, markerZ, 1.2, {
      material: 'holographic',
      color: 0xffff00,
      emissive: 0xaaaa00,
      transparent: true,
      opacity: 0.9
    });
    
    // Store for special animation
    if (!lightingSystem.startLineMarkers) {
      lightingSystem.startLineMarkers = [];
    }
    lightingSystem.startLineMarkers.push({
      mesh: startMarker,
      baseY: markerY,
      pulsePhase: i * 0.5
    });
  }
  
  // Add rainbow light beams
  for (let i = 0; i < 5; i++) {
    const beamColor = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff][i];
    const beamX = x + Math.cos(angle + Math.PI/2) * (i - 2) * 2;
    const beamZ = z + Math.sin(angle + Math.PI/2) * (i - 2) * 2;
    
    const lightBeam = createPlane(beamX, y + 15, beamZ, 1, 25, {
      material: 'emissive',
      color: beamColor,
      emissive: beamColor,
      transparent: true,
      opacity: 0.6
    });
    rotateMesh(lightBeam, -Math.PI/2, angle, 0);
  }
}

function updateTrackLighting(dt) {
  // Animate track markers
  trackPieces.forEach((piece, index) => {
    if (piece.leftMarker && piece.rightMarker) {
      const pulsePhase = gameTime * 4 + index * 0.2;
      const pulseIntensity = 0.6 + 0.4 * Math.sin(pulsePhase);
      
      // Update marker opacity based on pulse
      if (typeof setMeshOpacity === 'function') {
        setMeshOpacity(piece.leftMarker, pulseIntensity);
        setMeshOpacity(piece.rightMarker, pulseIntensity);
      }
      
      // Rotate markers for dynamic effect
      rotateMesh(piece.leftMarker, 0, dt * 2, 0);
      rotateMesh(piece.rightMarker, 0, -dt * 2, 0);
    }
  });
  
  // Animate start line markers
  if (lightingSystem.startLineMarkers) {
    lightingSystem.startLineMarkers.forEach(marker => {
      marker.pulsePhase += dt * 3;
      const bounce = Math.sin(marker.pulsePhase) * 2;
      const currentPos = getPosition(marker.mesh);
      if (currentPos) {
        setPosition(marker.mesh, 
          currentPos[0], 
          marker.baseY + bounce, 
          currentPos[2]
        );
      }
      
      // Rainbow color cycling
      const hue = (gameTime * 2 + marker.pulsePhase) % (Math.PI * 2);
      const r = Math.floor((Math.sin(hue) * 0.5 + 0.5) * 255);
      const g = Math.floor((Math.sin(hue + Math.PI * 2/3) * 0.5 + 0.5) * 255);
      const b = Math.floor((Math.sin(hue + Math.PI * 4/3) * 0.5 + 0.5) * 255);
      const rainbowColor = (r << 16) | (g << 8) | b;
      
      if (typeof setMeshColor === 'function') {
        setMeshColor(marker.mesh, rainbowColor);
      }
    });
  }
}

// ============================================================================
// SPECTACULAR VISUAL EFFECTS SYSTEM
// ============================================================================

function createSpectacularExplosion(x, y, z, size = 1.0, color = 0xff6600) {
  // Create multi-layered explosion effect
  const explosionLayers = [
    { size: size * 0.5, color: 0xffffff, life: 0.3 },
    { size: size * 1.0, color: 0xffff00, life: 0.6 },
    { size: size * 1.5, color: 0xff6600, life: 0.9 },
    { size: size * 2.0, color: 0xff0000, life: 1.2 },
    { size: size * 2.5, color: 0x880000, life: 1.5 }
  ];
  
  explosionLayers.forEach((layer, index) => {
    setTimeout(() => {
      const explosionSphere = createSphere(x, y, z, layer.size, {
        material: 'emissive',
        color: layer.color,
        emissive: layer.color,
        transparent: true,
        opacity: 0.8
      });
      
      particles.push({
        mesh: explosionSphere,
        x: x, y: y, z: z,
        vx: 0, vy: 0, vz: 0,
        life: layer.life,
        maxLife: layer.life,
        type: 'explosion',
        expandRate: layer.size * 2
      });
    }, index * 50);
  });
  
  // Create particle shower
  for (let i = 0; i < 20; i++) {
    const sparkParticle = createSphere(0.1, 0xffff00, [x, y, z]);
    particles.push({
      mesh: sparkParticle,
      x: x, y: y, z: z,
      vx: (Math.random() - 0.5) * 20,
      vy: Math.random() * 15 + 5,
      vz: (Math.random() - 0.5) * 20,
      life: 2.0,
      maxLife: 2.0,
      type: 'spark'
    });
  }
}

function createPowerUpCollectionEffect(x, y, z, powerUpType) {
  const colors = {
    'boost': [0xff6600, 0xffaa00, 0xffff00],
    'health': [0x00ff00, 0x44ff44, 0x88ff88],
    'shield': [0x0088ff, 0x44aaff, 0x88ccff],
    'speed': [0xff0088, 0xff44aa, 0xff88cc]
  };
  
  const typeColors = colors[powerUpType] || colors['boost'];
  
  // Create expanding rings
  for (let ring = 0; ring < 3; ring++) {
    setTimeout(() => {
      const ringMesh = createSphere(x, y, z, ring + 1, {
        material: 'holographic',
        color: typeColors[ring],
        emissive: typeColors[ring],
        transparent: true,
        opacity: 0.6,
        wireframe: true
      });
      
      particles.push({
        mesh: ringMesh,
        x: x, y: y, z: z,
        vx: 0, vy: 2, vz: 0,
        life: 1.5,
        maxLife: 1.5,
        type: 'collection_ring',
        expandRate: 3
      });
    }, ring * 100);
  }
  
  // Create upward energy stream
  for (let i = 0; i < 10; i++) {
    const energyParticle = createSphere(0.2, typeColors[i % typeColors.length], [
      x + (Math.random() - 0.5) * 2,
      y,
      z + (Math.random() - 0.5) * 2
    ]);
    
    particles.push({
      mesh: energyParticle,
      x: x, y: y, z: z,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 8 + 4,
      vz: (Math.random() - 0.5) * 2,
      life: 2.0,
      maxLife: 2.0,
      type: 'energy_stream'
    });
  }
}

function createLapCompletionEffect() {
  // Spectacular lap completion celebration
  const celebrationColors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];
  
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const fireworkParticle = createSphere(0.3, celebrationColors[i % celebrationColors.length], [
        player.x + (Math.random() - 0.5) * 20,
        player.y + Math.random() * 15 + 10,
        player.z + (Math.random() - 0.5) * 20
      ]);
      
      particles.push({
        mesh: fireworkParticle,
        x: player.x, y: player.y + 15, z: player.z,
        vx: (Math.random() - 0.5) * 15,
        vy: Math.random() * 10 + 5,
        vz: (Math.random() - 0.5) * 15,
        life: 3.0,
        maxLife: 3.0,
        type: 'firework'
      });
    }, i * 20);
  }
  
  // Screen flash effect
  if (typeof screenFlash === 'function') {
    screenFlash(0xffffff, 0.3);
  }
}