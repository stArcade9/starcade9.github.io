// PHYSICS LAB 3D - Advanced 3D Physics Simulation
// Nintendo 64 / PlayStation style 3D physics with full GPU acceleration

// Game state
let gameTime = 0;
let selectedDemo = 0;
let showDebugInfo = true;

// Screen management
let gameState = 'start'; // 'start', 'simulating'
let startScreenTime = 0;
let uiButtons = [];

// 3D Physics objects
let physicsObjects = [];
let particles = [];
let forceFields = [];
let constraints = [];

// Demo configurations
const demos = [
  { name: 'BOUNCING SPHERES', setup: setupBouncingSpheres },
  { name: 'PENDULUM CHAIN', setup: setupPendulumChain },
  { name: 'PARTICLE FOUNTAIN', setup: setupParticleFountain },
  { name: 'GRAVITY WELL', setup: setupGravityWell },
  { name: 'COLLISION CASCADE', setup: setupCollisionCascade }
];

// Physics constants
const GRAVITY = -15;
const BOUNCE_DAMPING = 0.8;
const AIR_RESISTANCE = 0.995;

export async function init() {
  cls();
  
  // Setup 3D scene with N64-style aesthetics
  setCameraPosition(0, 15, 25);
  setCameraTarget(0, 5, 0);
  setCameraFOV(60);
  
  // Setup dramatic lighting
  setLightDirection(-0.5, -1, -0.2);
  setFog(0x1a1a2e, 40, 120);
  
  // Enable retro effects
  enablePixelation(1);
  enableDithering(true);
  
  // Create world environment
  await createWorld();
  
  // Start with first demo
  demos[selectedDemo].setup();
  
  // Initialize start screen
  initStartScreen();
  
  console.log('Physics Lab 3D - 3D Physics Simulation initialized');
  console.log('Use LEFT/RIGHT to change demos, UP to toggle debug, X to interact');
}

function initStartScreen() {
  uiButtons = [];
  
  uiButtons.push(
    createButton(centerX(240), 150, 240, 60, '⚛ START SIMULATION', () => {
      console.log('🎯 START SIMULATION CLICKED! Changing gameState to simulating...');
      gameState = 'simulating';
      console.log('✅ gameState is now:', gameState);
    }, {
      normalColor: rgba8(50, 200, 100, 255),
      hoverColor: rgba8(80, 230, 130, 255),
      pressedColor: rgba8(30, 170, 80, 255)
    })
  );
  
  uiButtons.push(
    createButton(centerX(200), 355, 200, 45, '📊 DEMOS', () => {
      console.log('Physics demos: Bouncing, Pendulum, Fountain, Gravity, Cascade');
    }, {
      normalColor: rgba8(100, 150, 255, 255),
      hoverColor: rgba8(130, 180, 255, 255),
      pressedColor: rgba8(70, 120, 220, 255)
    })
  );
}

export function update(dt) {
  gameTime += dt;
  
  if (gameState === 'start') {
    startScreenTime += dt;
    updateAllButtons();
    
    // Animate physics in background
    updatePhysics(dt);
    updateParticles(dt);
    updateForceFields(dt);
    return;
  }
  
  handleInput(dt);
  updatePhysics(dt);
  updateParticles(dt);
  updateForceFields(dt);
  updateCamera(dt);
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // 3D scene is automatically rendered by GPU backend
  // Draw UI overlay using 2D API
  drawUI();
}

function drawStartScreen() {
  // Scientific gradient background
  drawGradientRect(0, 0, 640, 360,
    rgba8(20, 40, 30, 230),
    rgba8(10, 20, 15, 245),
    true
  );
  
  // Animated title
  setFont('huge');
  setTextAlign('center');
  const pulse = Math.sin(startScreenTime * 3) * 0.3 + 0.7;
  const sciColor = rgba8(
    Math.floor(pulse * 100),
    Math.floor(pulse * 255),
    Math.floor(pulse * 150),
    255
  );
  
  const bounce = Math.abs(Math.sin(startScreenTime * 4)) * 15;
  drawTextShadow('PHYSICS', 320, 50 + bounce, sciColor, rgba8(0, 0, 0, 255), 6, 1);
  drawTextShadow('LAB 3D', 320, 105, rgba8(255, 255, 255, 255), rgba8(0, 0, 0, 255), 6, 1);
  
  // Subtitle
  setFont('large');
  const glow = Math.sin(startScreenTime * 4) * 0.2 + 0.8;
  drawTextOutline('Advanced 3D Physics Simulation', 320, 165, 
    rgba8(100, 255, 150, Math.floor(glow * 255)), 
    rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(480), 210, 480, 190, {
    bgColor: rgba8(20, 35, 25, 210),
    borderColor: rgba8(50, 200, 100, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(30, 50, 35, 210)
  });
  drawPanel(panel);
  
  setFont('normal');
  setTextAlign('center');
  drawText('5 PHYSICS SIMULATIONS', 320, 230, rgba8(100, 255, 150, 255), 1);
  
  setFont('small');
  drawText('⚛ Bouncing Spheres - Realistic collision physics', 320, 255, uiColors.light, 1);
  drawText('⚛ Pendulum Chain - Connected body dynamics', 320, 270, uiColors.light, 1);
  drawText('⚛ Particle Fountain - Mass particle system', 320, 285, uiColors.light, 1);
  drawText('⚛ Gravity Well - Force field simulation', 320, 300, uiColors.light, 1);
  
  setFont('tiny');
  drawText('Use LEFT/RIGHT arrows to cycle demos', 320, 320, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('⚛ EXPERIENCE REAL-TIME 3D PHYSICS ⚛', 320, 430, rgba8(100, 255, 150, alpha), 1);
  
  // Tech info
  setFont('tiny');
  drawText('Nintendo 64 / PlayStation Style Rendering', 320, 345, rgba8(150, 200, 150, 150), 1);
}

async function createWorld() {
  // Create ground plane
  const ground = createPlane(50, 50, 0x444466, [0, 0, 0]);
  setRotation(ground, -Math.PI/2, 0, 0);
  
  // Create invisible walls for physics boundaries
  const wallHeight = 20;
  const walls = [
    createCube(1, wallHeight, 50, [-25, wallHeight/2, 0]), // Left wall
    createCube(1, wallHeight, 50, [25, wallHeight/2, 0]),  // Right wall
    createCube(50, wallHeight, 1, [0, wallHeight/2, -25]), // Back wall
    createCube(50, wallHeight, 1, [0, wallHeight/2, 25])   // Front wall
  ];
  
  // Make walls transparent
  walls.forEach(wall => {
    // Note: In a real implementation, you'd set material transparency
  });
  
  // Add some decorative elements
  for (let i = 0; i < 8; i++) {
    const pillar = createCube(2, 12, 0x666688, [
      (Math.random() - 0.5) * 40,
      6,
      (Math.random() - 0.5) * 40
    ]);
    setScale(pillar, 0.8, 1, 0.8);
  }
}

function handleInput(dt) {
  // Switch demos
  if (btnp(0)) { // Left
    selectedDemo = (selectedDemo - 1 + demos.length) % demos.length;
    resetDemo();
  }
  if (btnp(1)) { // Right
    selectedDemo = (selectedDemo + 1) % demos.length;
    resetDemo();
  }
  
  // Toggle debug info
  if (btnp(2)) { // Up
    showDebugInfo = !showDebugInfo;
  }
  
  // Interact with current demo
  if (btnp(5)) { // X
    interactWithDemo();
  }
  
  // Reset demo
  if (btnp(4)) { // Z
    resetDemo();
  }
}

function resetDemo() {
  // Clear existing objects
  physicsObjects.forEach(obj => destroyMesh(obj.mesh));
  particles.forEach(p => destroyMesh(p.mesh));
  physicsObjects = [];
  particles = [];
  forceFields = [];
  constraints = [];
  
  // Setup new demo
  demos[selectedDemo].setup();
}

function setupBouncingSpheres() {
  // Create bouncing spheres with different materials
  const materials = [
    { color: 0xff4444, bounce: 0.9, size: 0.8 },
    { color: 0x44ff44, bounce: 0.7, size: 1.0 },
    { color: 0x4444ff, bounce: 0.5, size: 1.2 },
    { color: 0xffff44, bounce: 1.1, size: 0.6 }
  ];
  
  for (let i = 0; i < 12; i++) {
    const material = materials[i % materials.length];
    const sphere = createPhysicsObject({
      mesh: createSphere(material.size, material.color, [
        (Math.random() - 0.5) * 20,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 20
      ]),
      x: 0, y: 0, z: 0,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * 5,
      vz: (Math.random() - 0.5) * 10,
      radius: material.size,
      bounce: material.bounce,
      mass: material.size,
      type: 'sphere'
    });
    
    // Update position from mesh
    const pos = getPosition(sphere.mesh);
    sphere.x = pos[0]; sphere.y = pos[1]; sphere.z = pos[2];
    
    physicsObjects.push(sphere);
  }
}

function setupPendulumChain() {
  // Create a chain of connected pendulums
  const chainLength = 6;
  const segmentLength = 2;
  
  for (let i = 0; i < chainLength; i++) {
    const sphere = createPhysicsObject({
      mesh: createSphere(0.5, 0xff6600 + i * 0x001100, [
        i * segmentLength,
        10 - i * segmentLength,
        0
      ]),
      x: i * segmentLength,
      y: 10 - i * segmentLength,
      z: 0,
      vx: 0, vy: 0, vz: 0,
      radius: 0.5,
      bounce: 0.1,
      mass: 1,
      type: 'pendulum',
      chainIndex: i
    });
    
    physicsObjects.push(sphere);
    
    // Create constraint to previous sphere (except first)
    if (i > 0) {
      constraints.push({
        objA: physicsObjects[physicsObjects.length - 2],
        objB: sphere,
        restLength: segmentLength,
        strength: 0.8
      });
    } else {
      // First sphere is anchored
      sphere.anchored = true;
    }
  }
}

function setupParticleFountain() {
  // Create a particle fountain effect
  const fountain = {
    x: 0, y: 5, z: 0,
    spawnRate: 0.1,
    lastSpawn: 0
  };
  
  forceFields.push(fountain);
}

function setupGravityWell() {
  // Create objects that orbit around a central gravity well
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 8 + Math.random() * 4;
    
    const sphere = createPhysicsObject({
      mesh: createSphere(0.6, 0x44ffff, [
        Math.cos(angle) * radius,
        8,
        Math.sin(angle) * radius
      ]),
      x: Math.cos(angle) * radius,
      y: 8,
      z: Math.sin(angle) * radius,
      vx: -Math.sin(angle) * 5,
      vy: 0,
      vz: Math.cos(angle) * 5,
      radius: 0.6,
      bounce: 0.8,
      mass: 1,
      type: 'orbiter'
    });
    
    physicsObjects.push(sphere);
  }
  
  // Create central gravity well
  forceFields.push({
    type: 'gravity',
    x: 0, y: 8, z: 0,
    strength: 50,
    radius: 15
  });
}

function setupCollisionCascade() {
  // Create a domino-like cascade effect
  for (let i = 0; i < 10; i++) {
    const cube = createPhysicsObject({
      mesh: createCube(1, 0x8844ff, [
        i * 2.5 - 12,
        2,
        Math.sin(i * 0.5) * 3
      ]),
      x: i * 2.5 - 12,
      y: 2,
      z: Math.sin(i * 0.5) * 3,
      vx: 0, vy: 0, vz: 0,
      radius: 1,
      bounce: 0.3,
      mass: 2,
      type: 'domino'
    });
    
    setScale(cube.mesh, 0.8, 3, 0.4);
    physicsObjects.push(cube);
  }
  
  // Add initial impulse object
  const impulse = createPhysicsObject({
    mesh: createSphere(1, 0xff4444, [-20, 5, 0]),
    x: -20, y: 5, z: 0,
    vx: 15, vy: 0, vz: 0,
    radius: 1,
    bounce: 0.9,
    mass: 3,
    type: 'impulse'
  });
  
  physicsObjects.push(impulse);
}

function createPhysicsObject(props) {
  return {
    mesh: props.mesh,
    x: props.x || 0,
    y: props.y || 0,
    z: props.z || 0,
    vx: props.vx || 0,
    vy: props.vy || 0,
    vz: props.vz || 0,
    radius: props.radius || 1,
    bounce: props.bounce || 0.8,
    mass: props.mass || 1,
    type: props.type || 'generic',
    anchored: props.anchored || false,
    chainIndex: props.chainIndex || 0
  };
}

function updatePhysics(dt) {
  physicsObjects.forEach(obj => {
    if (obj.anchored) return;
    
    // Apply gravity
    obj.vy += GRAVITY * dt;
    
    // Apply force fields
    forceFields.forEach(field => {
      if (field.type === 'gravity') {
        const dx = field.x - obj.x;
        const dy = field.y - obj.y;
        const dz = field.z - obj.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance < field.radius && distance > 0.1) {
          const force = field.strength / (distance * distance);
          obj.vx += (dx / distance) * force * dt;
          obj.vy += (dy / distance) * force * dt;
          obj.vz += (dz / distance) * force * dt;
        }
      }
    });
    
    // Update position
    obj.x += obj.vx * dt;
    obj.y += obj.vy * dt;
    obj.z += obj.vz * dt;
    
    // Ground collision
    if (obj.y - obj.radius < 0) {
      obj.y = obj.radius;
      obj.vy *= -obj.bounce;
      createBounceParticles(obj.x, obj.y, obj.z);
    }
    
    // Wall collisions
    const wallBounds = 24;
    if (obj.x - obj.radius < -wallBounds) {
      obj.x = -wallBounds + obj.radius;
      obj.vx *= -obj.bounce;
    }
    if (obj.x + obj.radius > wallBounds) {
      obj.x = wallBounds - obj.radius;
      obj.vx *= -obj.bounce;
    }
    if (obj.z - obj.radius < -wallBounds) {
      obj.z = -wallBounds + obj.radius;
      obj.vz *= -obj.bounce;
    }
    if (obj.z + obj.radius > wallBounds) {
      obj.z = wallBounds - obj.radius;
      obj.vz *= -obj.bounce;
    }
    
    // Air resistance
    obj.vx *= AIR_RESISTANCE;
    obj.vy *= AIR_RESISTANCE;
    obj.vz *= AIR_RESISTANCE;
    
    // Update mesh position
    setPosition(obj.mesh, obj.x, obj.y, obj.z);
    
    // Add rotation for visual interest
    if (obj.type !== 'pendulum') {
      rotateMesh(obj.mesh, obj.vx * dt * 0.1, obj.vy * dt * 0.1, obj.vz * dt * 0.1);
    }
  });
  
  // Handle object-object collisions
  for (let i = 0; i < physicsObjects.length; i++) {
    for (let j = i + 1; j < physicsObjects.length; j++) {
      checkCollision(physicsObjects[i], physicsObjects[j]);
    }
  }
  
  // Update constraints (for pendulum chains)
  constraints.forEach(constraint => {
    const dx = constraint.objB.x - constraint.objA.x;
    const dy = constraint.objB.y - constraint.objA.y;
    const dz = constraint.objB.z - constraint.objA.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance > 0) {
      const difference = (constraint.restLength - distance) / distance;
      const force = difference * constraint.strength * 0.5;
      
      const offsetX = dx * force;
      const offsetY = dy * force;
      const offsetZ = dz * force;
      
      if (!constraint.objA.anchored) {
        constraint.objA.x -= offsetX;
        constraint.objA.y -= offsetY;
        constraint.objA.z -= offsetZ;
      }
      if (!constraint.objB.anchored) {
        constraint.objB.x += offsetX;
        constraint.objB.y += offsetY;
        constraint.objB.z += offsetZ;
      }
    }
  });
}

function checkCollision(objA, objB) {
  const dx = objB.x - objA.x;
  const dy = objB.y - objA.y;
  const dz = objB.z - objA.z;
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
  const minDistance = objA.radius + objB.radius;
  
  if (distance < minDistance && distance > 0) {
    // Separate objects
    const overlap = minDistance - distance;
    const separationX = (dx / distance) * overlap * 0.5;
    const separationY = (dy / distance) * overlap * 0.5;
    const separationZ = (dz / distance) * overlap * 0.5;
    
    if (!objA.anchored) {
      objA.x -= separationX;
      objA.y -= separationY;
      objA.z -= separationZ;
    }
    if (!objB.anchored) {
      objB.x += separationX;
      objB.y += separationY;
      objB.z += separationZ;
    }
    
    // Calculate collision response
    const normalX = dx / distance;
    const normalY = dy / distance;
    const normalZ = dz / distance;
    
    const relativeVx = objB.vx - objA.vx;
    const relativeVy = objB.vy - objA.vy;
    const relativeVz = objB.vz - objA.vz;
    
    const velocityAlongNormal = relativeVx * normalX + relativeVy * normalY + relativeVz * normalZ;
    
    if (velocityAlongNormal > 0) return; // Objects separating
    
    const restitution = Math.min(objA.bounce, objB.bounce);
    const impulse = -(1 + restitution) * velocityAlongNormal / (1/objA.mass + 1/objB.mass);
    
    if (!objA.anchored) {
      objA.vx -= impulse * normalX / objA.mass;
      objA.vy -= impulse * normalY / objA.mass;
      objA.vz -= impulse * normalZ / objA.mass;
    }
    if (!objB.anchored) {
      objB.vx += impulse * normalX / objB.mass;
      objB.vy += impulse * normalY / objB.mass;
      objB.vz += impulse * normalZ / objB.mass;
    }
    
    // Create collision particles
    createCollisionParticles(
      objA.x + separationX,
      objA.y + separationY,
      objA.z + separationZ
    );
  }
}

function updateParticles(dt) {
  // Handle particle fountain
  forceFields.forEach(field => {
    if (field.spawnRate) {
      field.lastSpawn -= dt;
      if (field.lastSpawn <= 0) {
        spawnParticle(field.x, field.y, field.z);
        field.lastSpawn = field.spawnRate;
      }
    }
  });
  
  // Update existing particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.life -= dt;
    
    // Physics
    particle.vy += GRAVITY * dt * 0.5; // Less gravity for particles
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.z += particle.vz * dt;
    
    // Ground bounce
    if (particle.y < 0.1) {
      particle.y = 0.1;
      particle.vy *= -0.3;
    }
    
    setPosition(particle.mesh, particle.x, particle.y, particle.z);
    
    // Fade out
    const scale = particle.life / particle.maxLife;
    setScale(particle.mesh, scale);
    
    if (particle.life <= 0) {
      destroyMesh(particle.mesh);
      particles.splice(i, 1);
    }
  }
}

function updateForceFields(dt) {
  // Visual effects for force fields could go here
}

function updateCamera(dt) {
  // Smooth camera rotation around the scene
  const radius = 25;
  const height = 15;
  const angle = gameTime * 0.2;
  
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  
  setCameraPosition(x, height, z);
  setCameraTarget(0, 5, 0);
}

function interactWithDemo() {
  switch (selectedDemo) {
    case 0: { // Bouncing spheres - add a new sphere
      const sphere = createPhysicsObject({
        mesh: createSphere(1, 0xffffff, [0, 15, 0]),
        x: 0, y: 15, z: 0,
        vx: (Math.random() - 0.5) * 10,
        vy: 0,
        vz: (Math.random() - 0.5) * 10,
        radius: 1,
        bounce: 0.9,
        mass: 1,
        type: 'sphere'
      });
      physicsObjects.push(sphere);
      break;
    }
      
    case 3: // Gravity well - add impulse
      physicsObjects.forEach(obj => {
        if (obj.type === 'orbiter') {
          obj.vx += (Math.random() - 0.5) * 5;
          obj.vz += (Math.random() - 0.5) * 5;
        }
      });
      break;
      
    case 4: { // Collision cascade - reset impulse
      const impulseObj = physicsObjects.find(obj => obj.type === 'impulse');
      if (impulseObj) {
        impulseObj.x = -20;
        impulseObj.y = 5;
        impulseObj.z = 0;
        impulseObj.vx = 15;
        impulseObj.vy = 0;
        impulseObj.vz = 0;
        setPosition(impulseObj.mesh, impulseObj.x, impulseObj.y, impulseObj.z);
      }
      break;
    }
  }
}

function spawnParticle(x, y, z) {
  const particle = {
    mesh: createSphere(0.2, 0xff6600, [x, y, z]),
    x: x, y: y, z: z,
    vx: (Math.random() - 0.5) * 8,
    vy: Math.random() * 12 + 5,
    vz: (Math.random() - 0.5) * 8,
    life: 3,
    maxLife: 3
  };
  
  particles.push(particle);
}

function createBounceParticles(x, y, z) {
  for (let i = 0; i < 3; i++) {
    const particle = {
      mesh: createSphere(0.1, 0xffaa44, [x, y, z]),
      x: x, y: y, z: z,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3,
      vz: (Math.random() - 0.5) * 4,
      life: 1,
      maxLife: 1
    };
    particles.push(particle);
  }
}

function createCollisionParticles(x, y, z) {
  for (let i = 0; i < 5; i++) {
    const particle = {
      mesh: createSphere(0.08, 0xff4444, [x, y, z]),
      x: x, y: y, z: z,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4,
      vz: (Math.random() - 0.5) * 6,
      life: 0.8,
      maxLife: 0.8
    };
    particles.push(particle);
  }
}

function drawUI() {
  // HUD Background
  rect(16, 16, 450, 90, rgba8(0, 0, 0, 150), true);
  rect(16, 16, 450, 90, rgba8(100, 100, 200, 100), false);
  
  // Title and Demo Info
  print('PHYSICS LAB 3D', 24, 24, rgba8(100, 200, 255, 255));
  print(`DEMO: ${demos[selectedDemo].name}`, 24, 40, rgba8(255, 255, 255, 255));
  
  // Stats
  print(`OBJECTS: ${physicsObjects.length}`, 24, 56, rgba8(255, 215, 0, 255));
  print(`PARTICLES: ${particles.length}`, 24, 72, rgba8(255, 100, 100, 255));
  print(`CONSTRAINTS: ${constraints.length}`, 24, 88, rgba8(100, 255, 100, 255));
  
  // 3D Stats
  const stats = get3DStats();
  if (stats) {
    print(`3D MESHES: ${stats.meshes || 0}`, 250, 56, rgba8(150, 150, 255, 255));
    print(`GPU: ${stats.renderer || 'ThreeJS'}`, 250, 72, rgba8(150, 150, 255, 255));
  }
  
  // Debug info
  if (showDebugInfo) {
    print('DEBUG: ON', 250, 40, rgba8(100, 255, 100, 255));
    print(`GRAVITY: ${GRAVITY}`, 350, 56, rgba8(200, 200, 200, 255));
    print(`DAMPING: ${BOUNCE_DAMPING}`, 350, 72, rgba8(200, 200, 200, 255));
  } else {
    print('DEBUG: OFF', 250, 40, rgba8(255, 100, 100, 255));
  }
  
  // Controls
  print('←→ CHANGE DEMO  ↑ DEBUG  X INTERACT  Z RESET', 24, 340, rgba8(150, 150, 150, 200));
}