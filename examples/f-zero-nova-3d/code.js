// F-ZERO NOVA 64 - High-speed anti-gravity racing
// Inspired by F-Zero X and WipEout

const CONFIG = {
  TRACK_SEGMENTS: 60,
  TRACK_RADIUS: 80,
  TRACK_WIDTH: 16,
  SEGMENT_LENGTH: 8,
  AI_RACERS: 5,
  MAX_LAPS: 3,
  GRAVITY: 15,
  AIR_RESISTANCE: 0.98,
  GROUND_FRICTION: 0.92,
  TURN_SPEED: 2.5,
  ACCELERATION: 45,
  MAX_SPEED: 180,
  BOOST_POWER: 80,
  BOOST_COST: 25
};

let gameState = 'menu';
let gameTime = 0;
let countdownTimer = 3;

let trackSegments = [];
let trackMeshes = [];
let startButtons = [];

let player = {
  position: 0,
  speed: 0,
  lateralPos: 0,
  height: 0,
  verticalVel: 0,
  tilt: 0,
  roll: 0,
  lap: 1,
  energy: 100,
  boostCharge: 100,
  lapTime: 0,
  bestLapTime: 0,
  totalTime: 0,
  meshes: {}
};

let aiRacers = [];
let raceStarted = false;
let racePosition = 1;
let particles = [];
let speedLines = [];

export async function init() {
  console.log('🏁 F-ZERO NOVA 64 - Initializing...');
  
  setCameraPosition(0, 25, 50);
  setCameraTarget(0, 0, 0);
  setCameraFOV(85);
  
  // VERY bright lighting - almost daylight
  setAmbientLight(0xffffff, 2.0);
  setFog(0x002040, 150, 500);
  
  // Add space skybox for better visibility
  createSpaceSkybox();
  
  await buildTrack();
  createPlayerShip();
  
  for (let i = 0; i < CONFIG.AI_RACERS; i++) {
    createAIRacer(i);
  }
  
  createSpeedLines();
  initStartScreen();
  
  console.log('✅ F-ZERO NOVA 64 - Ready! Track has', trackSegments.length, 'segments');
}

function initStartScreen() {
  startButtons.push(
    createButton(centerX(220), 220, 220, 55, '▶ START RACE', () => {
      console.log('🏁 START RACE clicked! Switching to countdown...');
      gameState = 'countdown';
      countdownTimer = 3;
      console.log('✅ gameState:', gameState, 'countdownTimer:', countdownTimer);
    }, {
      normalColor: rgba8(0, 200, 100, 255),
      hoverColor: rgba8(0, 255, 120, 255),
      pressedColor: rgba8(0, 160, 80, 255)
    })
  );
}

async function buildTrack() {
  console.log('🏗️ Building race track...');
  
  for (let i = 0; i < CONFIG.TRACK_SEGMENTS; i++) {
    const t = i / CONFIG.TRACK_SEGMENTS;
    const angle = t * Math.PI * 2;
    
    const radiusVariation = Math.sin(angle * 2) * 20 + Math.cos(angle * 3) * 10;
    const radius = CONFIG.TRACK_RADIUS + radiusVariation;
    const elevation = Math.sin(angle * 1.5) * 15 + Math.cos(angle * 2.5) * 8;
    const banking = Math.sin(angle * 2) * 0.4;
    
    const segment = {
      x: Math.cos(angle) * radius,
      y: elevation,
      z: Math.sin(angle) * radius,
      angle: angle,
      banking: banking,
      width: CONFIG.TRACK_WIDTH,
      boostPad: (i % 12 === 0)
    };
    
    trackSegments.push(segment);
  }
  
  for (let i = 0; i < trackSegments.length; i++) {
    const segment = trackSegments[i];
    const nextSegment = trackSegments[(i + 1) % trackSegments.length];
    
    const midX = (segment.x + nextSegment.x) / 2;
    const midY = (segment.y + nextSegment.y) / 2;
    const midZ = (segment.z + nextSegment.z) / 2;
    
    const dx = nextSegment.x - segment.x;
    const dz = nextSegment.z - segment.z;
    const segmentAngle = Math.atan2(dz, dx);
    const segmentLength = Math.sqrt(dx * dx + dz * dz);
    
    // SUPER bright track colors - light gray/white
    const trackColor = i % 2 === 0 ? 0xccccdd : 0xddddee;
    
    const trackMesh = createPlane(segmentLength, segment.width, trackColor, [midX, midY, midZ]);
    rotateMesh(trackMesh, -Math.PI/2, segmentAngle, segment.banking);
    trackMeshes.push(trackMesh);
    
    // Bright yellow center line markers
    if (i % 2 === 0) {
      const markerMesh = createPlane(segmentLength * 0.8, 1.5, 0xffff00, [midX, midY + 0.1, midZ]);
      rotateMesh(markerMesh, -Math.PI/2, segmentAngle, segment.banking);
    }
    
    // Cyan side stripes
    const stripeWidth = 1.0;
    const stripeOffset = segment.width * 0.4;
    const stripeLeft = createPlane(segmentLength * 0.9, stripeWidth, 0x00ffff, [
      midX + Math.cos(segmentAngle + Math.PI/2) * stripeOffset,
      midY + 0.12,
      midZ + Math.sin(segmentAngle + Math.PI/2) * stripeOffset
    ]);
    rotateMesh(stripeLeft, -Math.PI/2, segmentAngle, segment.banking);
    
    const stripeRight = createPlane(segmentLength * 0.9, stripeWidth, 0x00ffff, [
      midX + Math.cos(segmentAngle - Math.PI/2) * stripeOffset,
      midY + 0.12,
      midZ + Math.sin(segmentAngle - Math.PI/2) * stripeOffset
    ]);
    rotateMesh(stripeRight, -Math.PI/2, segmentAngle, segment.banking);
    
    // Glowing green boost pads
    if (segment.boostPad) {
      const boostMesh = createPlane(segmentLength * 0.6, segment.width * 0.7, 0x00ff88, [midX, midY + 0.15, midZ]);
      rotateMesh(boostMesh, -Math.PI/2, segmentAngle, segment.banking);
      segment.boostMesh = boostMesh;
    }
    
    const barrierHeight = 5;
    const barrierColor = 0xddddff; // Almost white barriers
    
    const leftX = midX + Math.cos(segmentAngle + Math.PI/2) * (segment.width/2 + 1);
    const leftZ = midZ + Math.sin(segmentAngle + Math.PI/2) * (segment.width/2 + 1);
    const leftBarrier = createCube(barrierHeight, barrierColor, [leftX, midY + barrierHeight/2, leftZ]);
    rotateMesh(leftBarrier, 0, segmentAngle, 0);
    setScale(leftBarrier, 1/barrierHeight, 1, segmentLength/barrierHeight);
    
    const rightX = midX + Math.cos(segmentAngle - Math.PI/2) * (segment.width/2 + 1);
    const rightZ = midZ + Math.sin(segmentAngle - Math.PI/2) * (segment.width/2 + 1);
    const rightBarrier = createCube(barrierHeight, barrierColor, [rightX, midY + barrierHeight/2, rightZ]);
    rotateMesh(rightBarrier, 0, segmentAngle, 0);
    setScale(rightBarrier, 1/barrierHeight, 1, segmentLength/barrierHeight);
    
    // Every segment gets bright neon lights!
    const lightColor = i % 6 === 0 ? 0xff0099 : i % 3 === 0 ? 0x00ffff : 0xff9900;
    createCube(1.0, lightColor, [leftX, midY + barrierHeight + 0.5, leftZ]);
    createCube(1.0, lightColor, [rightX, midY + barrierHeight + 0.5, rightZ]);
  }
  
  const startSegment = trackSegments[0];
  // Bright yellow/white checkered finish line
  const finishMesh = createPlane(CONFIG.SEGMENT_LENGTH, CONFIG.TRACK_WIDTH, 0xffff00, [startSegment.x, startSegment.y + 0.2, startSegment.z]);
  rotateMesh(finishMesh, -Math.PI/2, startSegment.angle, 0);
  
  // Add tall glowing posts at start/finish
  createCube(8, 0xff0000, [startSegment.x - CONFIG.TRACK_WIDTH/2, startSegment.y + 4, startSegment.z]);
  createCube(8, 0xff0000, [startSegment.x + CONFIG.TRACK_WIDTH/2, startSegment.y + 4, startSegment.z]);
  
  console.log('✅ Track built with', trackSegments.length, 'segments');
}

function createPlayerShip() {
  const startSegment = trackSegments[0];
  
  // VERY bright cyan ship - highly visible
  player.meshes.body = createCube(2, 0x00ffff, [startSegment.x, startSegment.y + 2, startSegment.z]);
  setScale(player.meshes.body, 1, 0.3, 1.75);
  
  player.meshes.cockpit = createSphere(0.8, 0x00ccff, [startSegment.x, startSegment.y + 2.5, startSegment.z + 0.3], 8);
  
  player.meshes.wingLeft = createCube(1.5, 0x00ddff, [startSegment.x - 2, startSegment.y + 2, startSegment.z]);
  setScale(player.meshes.wingLeft, 1, 0.2, 1.33);
  
  player.meshes.wingRight = createCube(1.5, 0x00ddff, [startSegment.x + 2, startSegment.y + 2, startSegment.z]);
  setScale(player.meshes.wingRight, 1, 0.2, 1.33);
  
  // Super bright orange engines
  player.meshes.engineLeft = createCube(0.6, 0xff8800, [startSegment.x - 1.5, startSegment.y + 1.5, startSegment.z - 1.5]);
  setScale(player.meshes.engineLeft, 1, 1, 1.33);
  
  player.meshes.engineRight = createCube(0.6, 0xff8800, [startSegment.x + 1.5, startSegment.y + 1.5, startSegment.z - 1.5]);
  setScale(player.meshes.engineRight, 1, 1, 1.33);
  
  // Bright white underglow
  player.meshes.glow = createCube(2.5, 0xffffff, [startSegment.x, startSegment.y + 1, startSegment.z]);
  setScale(player.meshes.glow, 1, 0.08, 1.52);
}

function createAIRacer(index) {
  const startSegment = trackSegments[0];
  const offsetZ = -8 * (index + 1);
  const lateralOffset = ((index % 3) - 1) * 4;
  
  const colors = [0xff0044, 0x00ff44, 0xffaa00, 0xff00ff, 0x00ffff];
  const color = colors[index % colors.length];
  
  const ai = {
    // Start AI racers slightly behind player (0.98 means almost at finish line, behind start)
    position: 0.98 - 0.01 * (index + 1),
    speed: 0,
    lateralPos: lateralOffset / CONFIG.TRACK_WIDTH,
    height: 0,
    verticalVel: 0,
    lap: 1,
    lapTime: 0,
    targetLateralPos: lateralOffset / CONFIG.TRACK_WIDTH,
    aggressiveness: 0.3 + Math.random() * 0.4,
    maxSpeed: CONFIG.MAX_SPEED * (0.85 + Math.random() * 0.15),
    meshes: {}
  };
  
  // Position AI racer at their starting track position
  const aiSegmentIndex = Math.floor(ai.position * trackSegments.length);
  const aiSegment = trackSegments[aiSegmentIndex % trackSegments.length];
  const lateralX = Math.cos(aiSegment.angle + Math.PI/2) * ai.lateralPos * CONFIG.TRACK_WIDTH * 0.5;
  const lateralZ = Math.sin(aiSegment.angle + Math.PI/2) * ai.lateralPos * CONFIG.TRACK_WIDTH * 0.5;
  
  ai.meshes.body = createCube(1.8, color, [aiSegment.x + lateralX, aiSegment.y + 2, aiSegment.z + lateralZ]);
  setScale(ai.meshes.body, 1, 0.28, 1.67);
  setRotation(ai.meshes.body, 0, aiSegment.angle + Math.PI/2, 0);
  
  ai.meshes.glow = createCube(2, color, [aiSegment.x + lateralX, aiSegment.y + 1.2, aiSegment.z + lateralZ]);
  setScale(ai.meshes.glow, 1, 0.1, 1.6);
  setRotation(ai.meshes.glow, 0, aiSegment.angle + Math.PI/2, 0);
  
  aiRacers.push(ai);
}

function handleInput(dt) {
  if (gameState !== 'racing') return;
  
  const upPressed = key('ArrowUp') || key('KeyW');
  const downPressed = key('ArrowDown') || key('KeyS');
  const leftPressed = key('ArrowLeft') || key('KeyA');
  const rightPressed = key('ArrowRight') || key('KeyD');
  
  // Auto-accelerate to 70% max speed if no input, full speed if pressing up
  const targetSpeed = upPressed ? CONFIG.MAX_SPEED : CONFIG.MAX_SPEED * 0.7;
  
  if (upPressed) {
    // Accelerate faster when pressing up
    player.speed = Math.min(player.speed + CONFIG.ACCELERATION * dt, CONFIG.MAX_SPEED);
  } else if (player.speed < targetSpeed) {
    // Auto-accelerate to cruising speed
    player.speed = Math.min(player.speed + CONFIG.ACCELERATION * 0.5 * dt, targetSpeed);
  } else {
    // Apply air resistance
    player.speed *= CONFIG.AIR_RESISTANCE;
  }
  
  if (downPressed) {
    player.speed *= 0.95;
  }
  
  const turnInput = (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0);
  
  if (turnInput !== 0) {
    const speedFactor = Math.max(0.3, 1 - (player.speed / CONFIG.MAX_SPEED) * 0.7);
    player.lateralPos += turnInput * CONFIG.TURN_SPEED * speedFactor * dt;
    player.lateralPos = Math.max(-0.9, Math.min(0.9, player.lateralPos));
    player.roll = turnInput * 0.5;
  } else {
    player.lateralPos *= 0.95;
    player.roll *= 0.9;
  }
  
  if (key('Space') && player.boostCharge >= CONFIG.BOOST_COST) {
    player.speed = Math.min(player.speed + CONFIG.BOOST_POWER, CONFIG.MAX_SPEED * 1.3);
    player.boostCharge -= CONFIG.BOOST_COST;
    createBoostParticles();
  }
  
  if (player.boostCharge < 100) {
    player.boostCharge += 15 * dt;
  }
}

function updatePlayer(dt) {
  if (gameState !== 'racing') return;
  if (trackSegments.length === 0) return; // Safety check
  
  const speedNormalized = player.speed / 100;
  player.position += speedNormalized * dt * 0.08;
  
  if (player.position >= 1) {
    player.position -= 1;
    player.lap++;
    player.bestLapTime = player.lapTime > 0 ? 
                        (player.bestLapTime === 0 ? player.lapTime : Math.min(player.bestLapTime, player.lapTime)) : 
                        player.bestLapTime;
    player.lapTime = 0;
    
    if (player.lap > CONFIG.MAX_LAPS) {
      finishRace();
    }
  }
  
  player.lapTime += dt;
  player.totalTime += dt;
  
  const segmentIndex = Math.floor(player.position * trackSegments.length);
  const segment = trackSegments[segmentIndex % trackSegments.length];
  const nextSegment = trackSegments[(segmentIndex + 1) % trackSegments.length];
  
  const segmentT = (player.position * trackSegments.length) % 1;
  const interpX = segment.x + (nextSegment.x - segment.x) * segmentT;
  const interpY = segment.y + (nextSegment.y - segment.y) * segmentT;
  const interpZ = segment.z + (nextSegment.z - segment.z) * segmentT;
  
  const lateralX = Math.cos(segment.angle + Math.PI/2) * player.lateralPos * CONFIG.TRACK_WIDTH * 0.5;
  const lateralZ = Math.sin(segment.angle + Math.PI/2) * player.lateralPos * CONFIG.TRACK_WIDTH * 0.5;
  
  const worldX = interpX + lateralX;
  const worldY = interpY + player.height + 2;
  const worldZ = interpZ + lateralZ;
  
  if (segment.boostPad && Math.abs(segmentT - 0.5) < 0.3) {
    player.speed = Math.min(player.speed + 50 * dt, CONFIG.MAX_SPEED * 1.2);
    player.boostCharge = Math.min(100, player.boostCharge + 30 * dt);
  }
  
  const targetTilt = segment.banking + player.roll;
  player.tilt += (targetTilt - player.tilt) * 5 * dt;
  
  const shipAngle = segment.angle + Math.PI/2;
  
  setPosition(player.meshes.body, worldX, worldY, worldZ);
  setRotation(player.meshes.body, player.tilt * 0.3, shipAngle, player.tilt);
  
  setPosition(player.meshes.cockpit, worldX, worldY + 0.5, worldZ + 0.3);
  setRotation(player.meshes.cockpit, 0, shipAngle, 0);
  
  setPosition(player.meshes.wingLeft, worldX - 2, worldY, worldZ);
  setRotation(player.meshes.wingLeft, player.tilt * 0.2, shipAngle, player.tilt * 0.5);
  
  setPosition(player.meshes.wingRight, worldX + 2, worldY, worldZ);
  setRotation(player.meshes.wingRight, player.tilt * 0.2, shipAngle, player.tilt * 0.5);
  
  setPosition(player.meshes.engineLeft, worldX - 1.5, worldY - 0.5, worldZ - 1.5);
  setRotation(player.meshes.engineLeft, 0, shipAngle, 0);
  
  setPosition(player.meshes.engineRight, worldX + 1.5, worldY - 0.5, worldZ - 1.5);
  setRotation(player.meshes.engineRight, 0, shipAngle, 0);
  
  setPosition(player.meshes.glow, worldX, worldY - 1, worldZ);
  setRotation(player.meshes.glow, 0, shipAngle, player.tilt * 0.3);
  
  if (player.speed > 20 && Math.random() < 0.3) {
    createExhaustParticle(worldX - 1.5, worldY - 0.5, worldZ - 2);
    createExhaustParticle(worldX + 1.5, worldY - 0.5, worldZ - 2);
  }
}

function updateAI(dt) {
  if (gameState !== 'racing') return;
  if (trackSegments.length === 0) return; // Safety check
  
  aiRacers.forEach((ai, index) => {
    const targetSpeed = ai.maxSpeed * (0.9 + Math.random() * 0.1);
    ai.speed += (targetSpeed - ai.speed) * 2 * dt;
    
    const speedNormalized = ai.speed / 100;
    ai.position += speedNormalized * dt * 0.08;
    
    if (ai.position >= 1) {
      ai.position -= 1;
      ai.lap++;
      ai.lapTime = 0;
    }
    
    // Wrap negative positions to positive range [0, 1)
    while (ai.position < 0) {
      ai.position += 1;
    }
    
    ai.lapTime += dt;
    
    const segmentIndex = Math.floor(ai.position * trackSegments.length);
    const segment = trackSegments[segmentIndex % trackSegments.length];
    const nextSegment = trackSegments[(segmentIndex + 1) % trackSegments.length];
    
    const segmentT = (ai.position * trackSegments.length) % 1;
    const interpX = segment.x + (nextSegment.x - segment.x) * segmentT;
    const interpY = segment.y + (nextSegment.y - segment.y) * segmentT;
    const interpZ = segment.z + (nextSegment.z - segment.z) * segmentT;
    
    ai.targetLateralPos += (Math.random() - 0.5) * 0.5 * dt;
    ai.targetLateralPos = Math.max(-0.8, Math.min(0.8, ai.targetLateralPos));
    ai.lateralPos += (ai.targetLateralPos - ai.lateralPos) * 2 * dt;
    
    const lateralX = Math.cos(segment.angle + Math.PI/2) * ai.lateralPos * CONFIG.TRACK_WIDTH * 0.5;
    const lateralZ = Math.sin(segment.angle + Math.PI/2) * ai.lateralPos * CONFIG.TRACK_WIDTH * 0.5;
    
    const worldX = interpX + lateralX;
    const worldY = interpY + ai.height + 2;
    const worldZ = interpZ + lateralZ;
    const shipAngle = segment.angle + Math.PI/2;
    
    setPosition(ai.meshes.body, worldX, worldY, worldZ);
    setRotation(ai.meshes.body, 0, shipAngle, 0);
    
    setPosition(ai.meshes.glow, worldX, worldY - 0.8, worldZ);
    setRotation(ai.meshes.glow, 0, shipAngle, 0);
  });
}

function updateCamera(dt) {
  if (gameState === 'menu') {
    const angle = gameTime * 0.3;
    setCameraPosition(
      Math.cos(angle) * 50,
      30,
      Math.sin(angle) * 50
    );
    setCameraTarget(0, 0, 0);
    return;
  }
  
  // During countdown, show starting position
  if (gameState === 'countdown') {
    if (trackSegments.length > 0) {
      const startSegment = trackSegments[0];
      setCameraPosition(
        startSegment.x,
        startSegment.y + 15,
        startSegment.z + 30
      );
      setCameraTarget(startSegment.x, startSegment.y, startSegment.z);
    }
    return;
  }
  
  if (gameState !== 'racing') return;
  if (trackSegments.length === 0) return; // Safety check
  
  const segmentIndex = Math.floor(player.position * trackSegments.length);
  const segment = trackSegments[segmentIndex % trackSegments.length];
  const nextSegment = trackSegments[(segmentIndex + 1) % trackSegments.length];
  
  const segmentT = (player.position * trackSegments.length) % 1;
  const interpX = segment.x + (nextSegment.x - segment.x) * segmentT;
  const interpY = segment.y + (nextSegment.y - segment.y) * segmentT;
  const interpZ = segment.z + (nextSegment.z - segment.z) * segmentT;
  
  const lateralX = Math.cos(segment.angle + Math.PI/2) * player.lateralPos * CONFIG.TRACK_WIDTH * 0.5;
  const lateralZ = Math.sin(segment.angle + Math.PI/2) * player.lateralPos * CONFIG.TRACK_WIDTH * 0.5;
  
  const playerX = interpX + lateralX;
  const playerY = interpY + 2;
  const playerZ = interpZ + lateralZ;
  
  const speedFactor = player.speed / CONFIG.MAX_SPEED;
  const cameraDistance = 12 + speedFactor * 6;
  const cameraHeight = 6 + speedFactor * 2;
  const lookAhead = speedFactor * 8;
  
  const shipAngle = segment.angle + Math.PI/2;
  
  const cameraX = playerX - Math.sin(shipAngle) * cameraDistance;
  const cameraY = playerY + cameraHeight;
  const cameraZ = playerZ - Math.cos(shipAngle) * cameraDistance;
  
  const targetX = playerX + Math.sin(shipAngle) * lookAhead;
  const targetY = playerY;
  const targetZ = playerZ + Math.cos(shipAngle) * lookAhead;
  
  setCameraPosition(cameraX, cameraY, cameraZ);
  setCameraTarget(targetX, targetY, targetZ);
  
  const fov = 85 + speedFactor * 25;
  setCameraFOV(fov);
}

function calculateRacePosition() {
  let position = 1;
  
  aiRacers.forEach(ai => {
    const aiProgress = ai.lap - 1 + ai.position;
    const playerProgress = player.lap - 1 + player.position;
    
    if (aiProgress > playerProgress) {
      position++;
    }
  });
  
  racePosition = position;
}

function finishRace() {
  gameState = 'finished';
  console.log('🏁 Race finished! Position:', racePosition);
}

function createSpeedLines() {
  for (let i = 0; i < 20; i++) {
    const line = createCube(0.1, 0xffffff, [0, -1000, 0]);
    setScale(line, 1, 1, 10);
    speedLines.push({
      mesh: line,
      active: false
    });
  }
}

function updateSpeedLines(dt) {
  const speedFactor = player.speed / CONFIG.MAX_SPEED;
  
  if (speedFactor > 0.6 && gameState === 'racing') {
    speedLines.forEach((line, index) => {
      if (Math.random() < 0.1) {
        line.active = true;
        line.life = 1;
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 30;
        line.x = Math.cos(angle) * radius;
        line.y = Math.random() * 20 - 10;
        line.z = 60;
        
        setPosition(line.mesh, line.x, line.y, line.z);
      }
      
      if (line.active) {
        line.z -= (80 + player.speed * 0.5) * dt;
        line.life -= dt;
        
        setPosition(line.mesh, line.x, line.y, line.z);
        
        if (line.z < -30 || line.life <= 0) {
          line.active = false;
          setPosition(line.mesh, 0, -1000, 0);
        }
      }
    });
  }
}

function createExhaustParticle(x, y, z) {
  const colors = [0xff6600, 0xff4400, 0xff8800, 0xffaa00];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const particle = createSphere(0.3, color, [x, y, z], 6);
  
  particles.push({
    mesh: particle,
    x: x, y: y, z: z,
    vx: (Math.random() - 0.5) * 5,
    vy: (Math.random() - 0.5) * 2,
    vz: -player.speed * 0.3,
    life: 0.8,
    maxLife: 0.8
  });
}

function createBoostParticles() {
  for (let i = 0; i < 5; i++) {
    const particle = createSphere(0.4, 0x00ffff, [0, 0, 0], 6);
    
    const segmentIndex = Math.floor(player.position * trackSegments.length);
    const segment = trackSegments[segmentIndex % trackSegments.length];
    
    particles.push({
      mesh: particle,
      x: segment.x,
      y: segment.y + 2,
      z: segment.z,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 5,
      vz: -20,
      life: 1.2,
      maxLife: 1.2
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    
    setPosition(p.mesh, p.x, p.y, p.z);
    
    const alpha = p.life / p.maxLife;
    setScale(p.mesh, alpha, alpha, alpha);
    
    if (p.life <= 0) {
      destroyMesh(p.mesh);
      particles.splice(i, 1);
    }
  }
}

export function update(dt) {
  gameTime += dt;
  
  if (gameState === 'menu') {
    updateCamera(dt);
    updateButtons(startButtons, dt);
    
    if (key('Space')) {
      gameState = 'countdown';
      countdownTimer = 3;
    }
    return;
  }
  
  if (gameState === 'countdown') {
    countdownTimer -= dt;
    updateCamera(dt);
    
    if (countdownTimer <= 0) {
      console.log('🚦 Countdown finished! Starting race...');
      gameState = 'racing';
      raceStarted = true;
      // Give player initial forward speed so they start moving
      player.speed = 60;
      console.log('✅ Race started! gameState:', gameState, 'Initial speed:', player.speed);
    }
    return;
  }
  
  if (gameState === 'racing') {
    handleInput(dt);
    updatePlayer(dt);
    updateAI(dt);
    updateCamera(dt);
    calculateRacePosition();
    updateParticles(dt);
    updateSpeedLines(dt);
  }
  
  if (gameState === 'finished') {
    updateCamera(dt);
    
    if (key('Space')) {
      restartRace();
    }
  }
}

export function draw() {
  // DON'T call cls() - it clears the 3D scene!
  // Just draw 2D overlay on top of 3D rendering
  
  if (gameState === 'menu') {
    drawMenu();
    return;
  }
  
  if (gameState === 'countdown') {
    drawCountdown();
    return;
  }
  
  if (gameState === 'racing') {
    drawHUD();
  }
  
  if (gameState === 'finished') {
    drawResults();
  }
}

function drawMenu() {
  setTextAlign('center');
  setFont('huge');
  const titlePulse = Math.sin(gameTime * 3) * 0.3 + 0.7;
  drawTextShadow('F-ZERO', 320, 60, rgba8(255, 100, 0, Math.floor(titlePulse * 255)), 
                 rgba8(0, 0, 0, 255), 4, 1);
  drawTextShadow('NOVA 64', 320, 120, rgba8(0, 200, 255, 255), rgba8(0, 0, 0, 255), 4, 1);
  
  setFont('large');
  drawText('ANTI-GRAVITY RACING', 320, 180, rgba8(255, 255, 255, 255), 1);
  
  // Draw start button
  drawButtons(startButtons);
  
  setFont('small');
  drawText('ARROW KEYS or WASD: Steer and Accelerate', 320, 300, rgba8(200, 200, 200, 255), 1);
  drawText('SPACE: Boost', 320, 320, rgba8(200, 200, 200, 255), 1);
  drawText('DOWN or S: Brake', 320, 340, rgba8(200, 200, 200, 255), 1);
}

function drawCountdown() {
  setTextAlign('center');
  setFont('huge');
  const count = Math.ceil(countdownTimer);
  const text = count > 0 ? count.toString() : 'GO!';
  const color = count > 0 ? rgba8(255, 200, 0, 255) : rgba8(0, 255, 100, 255);
  
  drawTextShadow(text, 320, 160, color, rgba8(0, 0, 0, 255), 8, 1);
}

function drawHUD() {
  const speedPercent = (player.speed / CONFIG.MAX_SPEED) * 100;
  print('SPEED: ' + Math.floor(player.speed) + ' KM/H', 20, 20, rgba8(255, 255, 255, 255));
  
  const barWidth = 200;
  const barHeight = 20;
  rect(20, 35, barWidth, barHeight, rgba8(50, 50, 50, 200), true);
  rect(20, 35, barWidth * (speedPercent / 100), barHeight, rgba8(255, 100, 0, 255), true);
  rect(20, 35, barWidth, barHeight, rgba8(255, 255, 255, 255), false);
  
  print('BOOST: ' + Math.floor(player.boostCharge) + '%', 20, 65, rgba8(0, 255, 255, 255));
  rect(20, 80, barWidth, 15, rgba8(50, 50, 50, 200), true);
  rect(20, 80, barWidth * (player.boostCharge / 100), 15, rgba8(0, 255, 255, 255), true);
  rect(20, 80, barWidth, 15, rgba8(255, 255, 255, 255), false);
  
  print('LAP: ' + player.lap + '/' + CONFIG.MAX_LAPS, 20, 110, rgba8(255, 255, 100, 255));
  print('POSITION: ' + racePosition + '/' + (CONFIG.AI_RACERS + 1), 20, 130, rgba8(255, 150, 50, 255));
  print('TIME: ' + player.lapTime.toFixed(2) + 's', 20, 150, rgba8(100, 255, 100, 255));
  
  if (player.bestLapTime > 0) {
    print('BEST: ' + player.bestLapTime.toFixed(2) + 's', 20, 170, rgba8(255, 255, 0, 255));
  }
  
  const mapX = 540;
  const mapY = 40;
  const mapRadius = 35;
  
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const x = mapX + Math.cos(angle) * mapRadius;
    const y = mapY + Math.sin(angle) * mapRadius;
    pset(x, y, rgba8(100, 100, 150, 255));
  }
  
  const playerAngle = player.position * Math.PI * 2;
  const px = mapX + Math.cos(playerAngle) * mapRadius;
  const py = mapY + Math.sin(playerAngle) * mapRadius;
  rect(px - 2, py - 2, 4, 4, rgba8(0, 255, 255, 255), true);
  
  aiRacers.forEach(ai => {
    const aiAngle = ai.position * Math.PI * 2;
    const ax = mapX + Math.cos(aiAngle) * mapRadius;
    const ay = mapY + Math.sin(aiAngle) * mapRadius;
    pset(ax, ay, rgba8(255, 100, 100, 255));
  });
  
  print('MAP', mapX - 12, mapY + mapRadius + 8, rgba8(255, 255, 255, 255));
}

function drawResults() {
  setTextAlign('center');
  setFont('huge');
  drawTextShadow('RACE FINISHED', 320, 100, rgba8(255, 255, 0, 255), rgba8(0, 0, 0, 255), 4, 1);
  
  setFont('large');
  const positionText = racePosition === 1 ? '1ST PLACE!' : 
                       racePosition === 2 ? '2ND PLACE' :
                       racePosition === 3 ? '3RD PLACE' : racePosition + 'TH PLACE';
  const positionColor = racePosition === 1 ? rgba8(255, 215, 0, 255) : rgba8(200, 200, 200, 255);
  drawText(positionText, 320, 160, positionColor, 1);
  
  setFont('normal');
  print('TOTAL TIME: ' + player.totalTime.toFixed(2) + 's', 240, 210, rgba8(255, 255, 255, 255));
  
  if (player.bestLapTime > 0) {
    print('BEST LAP: ' + player.bestLapTime.toFixed(2) + 's', 240, 230, rgba8(255, 255, 100, 255));
  }
  
  const pulse = Math.sin(gameTime * 4) * 0.4 + 0.6;
  print('PRESS SPACE TO RESTART', 240, 280, rgba8(255, 255, 255, Math.floor(pulse * 255)));
}

function restartRace() {
  player.position = 0;
  player.speed = 0;
  player.lateralPos = 0;
  player.height = 0;
  player.lap = 1;
  player.energy = 100;
  player.boostCharge = 100;
  player.lapTime = 0;
  player.bestLapTime = 0;
  player.totalTime = 0;
  
  aiRacers.forEach((ai, index) => {
    // Position AI racers at valid starting positions (just behind start line)
    ai.position = 0.98 - 0.01 * (index + 1);
    ai.speed = 0;
    ai.lap = 1;
    ai.lapTime = 0;
  });
  
  gameState = 'countdown';
  countdownTimer = 3;
}

// UI Helper Functions
function centerX(width) {
  return (640 - width) / 2;
}

function createButton(x, y, width, height, text, onClick, colors = {}) {
  return {
    x, y, width, height, text, onClick,
    normalColor: colors.normalColor || rgba8(80, 80, 120, 255),
    hoverColor: colors.hoverColor || rgba8(100, 100, 150, 255),
    pressedColor: colors.pressedColor || rgba8(60, 60, 100, 255),
    hovered: false,
    pressed: false,
    wasPressed: false
  };
}

function updateButtons(buttons, dt) {
  const mx = mouseX();
  const my = mouseY();
  const isPressed = mousePressed();
  
  buttons.forEach(btn => {
    const inBounds = mx >= btn.x && mx <= btn.x + btn.width &&
                     my >= btn.y && my <= btn.y + btn.height;
    
    btn.hovered = inBounds;
    btn.pressed = inBounds && isPressed;
    
    if (inBounds && isPressed && !btn.wasPressed) {
      btn.onClick();
    }
    
    btn.wasPressed = isPressed;
  });
}

function drawButtons(buttons) {
  buttons.forEach(btn => {
    let color = btn.normalColor;
    if (btn.pressed) {
      color = btn.pressedColor;
    } else if (btn.hovered) {
      color = btn.hoverColor;
    }
    
    rect(btn.x, btn.y, btn.width, btn.height, color, true);
    rect(btn.x, btn.y, btn.width, btn.height, rgba8(255, 255, 255, 255), false);
    
    setTextAlign('center');
    setFont('large');
    const textX = btn.x + btn.width / 2;
    const textY = btn.y + btn.height / 2 - 10;
    drawText(btn.text, textX, textY, rgba8(255, 255, 255, 255), 1);
  });
}
