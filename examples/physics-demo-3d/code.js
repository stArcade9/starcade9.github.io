// PHYSICS LAB 3D - Advanced 3D Physics Simulation
// Nintendo 64 / PlayStation style 3D physics with full GPU acceleration

// Game state
const { cls, drawPanel, print, printCentered, rect, rgba8 } = nova64.draw;
const {
  createCone,
  createCube,
  createCylinder,
  createPlane,
  createSphere,
  destroyMesh,
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
const { btnp, key, keyp } = nova64.input;
const {
  Screen,
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
  uiColors,
  updateAllButtons,
} = nova64.ui;
let gameTime = 0;
let selectedDemo = 0;
let showDebugInfo = true;

// Scoring & sandbox
let destructionScore = 0;
let objectsCreated = 0;
let biggestImpact = 0;
let collisionCount = 0;
let highScore = 0;

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
  { name: 'COLLISION CASCADE', setup: setupCollisionCascade },
  { name: 'SANDBOX', setup: setupSandbox },
];

// Physics constants
const GRAVITY = -15;
const BOUNCE_DAMPING = 0.8;
const AIR_RESISTANCE = 0.995;

export async function init() {
  nova64.draw.cls();

  // Setup 3D scene with N64-style aesthetics
  nova64.camera.setCameraPosition(0, 15, 25);
  nova64.camera.setCameraTarget(0, 5, 0);
  nova64.camera.setCameraFOV(60);

  // Setup dramatic lighting
  nova64.light.setLightDirection(-0.5, -1, -0.2);
  nova64.light.setFog(0x1a1a2e, 40, 120);

  // Enable retro effects
  nova64.fx.enablePixelation(1);
  nova64.fx.enableDithering(true);
  nova64.fx.enableBloom(1.0, 0.4, 0.3);
  nova64.fx.enableFXAA();
  nova64.fx.enableVignette(1.2, 0.9);

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
    nova64.ui.createButton(
      nova64.ui.centerX(240),
      150,
      240,
      60,
      '⚛ START SIMULATION',
      () => {
        console.log('🎯 START SIMULATION CLICKED! Changing gameState to simulating...');
        gameState = 'simulating';
        console.log('✅ gameState is now:', gameState);
      },
      {
        normalColor: nova64.draw.rgba8(50, 200, 100, 255),
        hoverColor: nova64.draw.rgba8(80, 230, 130, 255),
        pressedColor: nova64.draw.rgba8(30, 170, 80, 255),
      }
    )
  );

  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(200),
      355,
      200,
      45,
      '📊 DEMOS',
      () => {
        console.log('Physics demos: Bouncing, Pendulum, Fountain, Gravity, Cascade');
      },
      {
        normalColor: nova64.draw.rgba8(100, 150, 255, 255),
        hoverColor: nova64.draw.rgba8(130, 180, 255, 255),
        pressedColor: nova64.draw.rgba8(70, 120, 220, 255),
      }
    )
  );
}

export function update(dt) {
  gameTime += dt;

  if (gameState === 'start') {
    startScreenTime += dt;
    nova64.ui.updateAllButtons();

    // Animate physics in background
    updatePhysics(dt);
    _local_updateParticles(dt);
    updateForceFields(dt);
    return;
  }

  handleInput(dt);
  updatePhysics(dt);
  _local_updateParticles(dt);
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
  nova64.ui.drawGradientRect(
    0,
    0,
    640,
    360,
    nova64.draw.rgba8(20, 40, 30, 230),
    nova64.draw.rgba8(10, 20, 15, 245),
    true
  );

  // Animated title
  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  const pulse = Math.sin(startScreenTime * 3) * 0.3 + 0.7;
  const sciColor = nova64.draw.rgba8(
    Math.floor(pulse * 100),
    Math.floor(pulse * 255),
    Math.floor(pulse * 150),
    255
  );

  const bounce = Math.abs(Math.sin(startScreenTime * 4)) * 15;
  nova64.ui.drawTextShadow(
    'PHYSICS',
    320,
    50 + bounce,
    sciColor,
    nova64.draw.rgba8(0, 0, 0, 255),
    6,
    1
  );
  nova64.ui.drawTextShadow(
    'LAB 3D',
    320,
    105,
    nova64.draw.rgba8(255, 255, 255, 255),
    nova64.draw.rgba8(0, 0, 0, 255),
    6,
    1
  );

  // Subtitle
  nova64.ui.setFont('large');
  const glow = Math.sin(startScreenTime * 4) * 0.2 + 0.8;
  nova64.ui.drawTextOutline(
    'Advanced 3D Physics Simulation',
    320,
    165,
    nova64.draw.rgba8(100, 255, 150, Math.floor(glow * 255)),
    nova64.draw.rgba8(0, 0, 0, 255),
    1
  );

  // Info panel
  const panel = nova64.ui.createPanel(nova64.ui.centerX(480), 210, 480, 190, {
    bgColor: nova64.draw.rgba8(20, 35, 25, 210),
    borderColor: nova64.draw.rgba8(50, 200, 100, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: nova64.draw.rgba8(30, 50, 35, 210),
  });
  nova64.draw.drawPanel(panel);

  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawText('5 PHYSICS SIMULATIONS', 320, 230, nova64.draw.rgba8(100, 255, 150, 255), 1);

  nova64.ui.setFont('small');
  nova64.ui.drawText(
    '⚛ Bouncing Spheres - Realistic collision physics',
    320,
    255,
    uiColors.light,
    1
  );
  nova64.ui.drawText('⚛ Pendulum Chain - Connected body dynamics', 320, 270, uiColors.light, 1);
  nova64.ui.drawText('⚛ Particle Fountain - Mass particle system', 320, 285, uiColors.light, 1);
  nova64.ui.drawText('⚛ Gravity Well - Force field simulation', 320, 300, uiColors.light, 1);

  nova64.ui.setFont('tiny');
  nova64.ui.drawText('Use LEFT/RIGHT arrows to cycle demos', 320, 320, uiColors.secondary, 1);

  // Draw buttons
  nova64.ui.drawAllButtons();

  // Pulsing prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  nova64.ui.setFont('normal');
  nova64.ui.drawText(
    '⚛ EXPERIENCE REAL-TIME 3D PHYSICS ⚛',
    320,
    430,
    nova64.draw.rgba8(100, 255, 150, alpha),
    1
  );

  // Tech info
  nova64.ui.setFont('tiny');
  nova64.ui.drawText(
    'Nintendo 64 / PlayStation Style Rendering',
    320,
    345,
    nova64.draw.rgba8(150, 200, 150, 150),
    1
  );
}

async function createWorld() {
  // Create ground plane
  const ground = nova64.scene.createPlane(50, 50, 0x444466, [0, 0, 0]);
  nova64.scene.setRotation(ground, -Math.PI / 2, 0, 0);

  // Create invisible walls for physics boundaries
  const wallHeight = 20;
  const walls = [
    nova64.scene.createCube(1, wallHeight, 50, [-25, wallHeight / 2, 0]), // Left wall
    nova64.scene.createCube(1, wallHeight, 50, [25, wallHeight / 2, 0]), // Right wall
    nova64.scene.createCube(50, wallHeight, 1, [0, wallHeight / 2, -25]), // Back wall
    nova64.scene.createCube(50, wallHeight, 1, [0, wallHeight / 2, 25]), // Front wall
  ];

  // Make walls transparent
  walls.forEach(wall => {
    // Note: In a real implementation, you'd set material transparency
  });

  // Add some decorative elements
  for (let i = 0; i < 8; i++) {
    const pillar = nova64.scene.createCube(2, 12, 0x666688, [
      (Math.random() - 0.5) * 40,
      6,
      (Math.random() - 0.5) * 40,
    ]);
    nova64.scene.setScale(pillar, 0.8, 1, 0.8);
  }
}

function handleInput(dt) {
  // Switch demos
  if (nova64.input.btnp(0)) {
    // Left
    selectedDemo = (selectedDemo - 1 + demos.length) % demos.length;
    resetDemo();
  }
  if (nova64.input.btnp(1)) {
    // Right
    selectedDemo = (selectedDemo + 1) % demos.length;
    resetDemo();
  }

  // Toggle debug info
  if (nova64.input.btnp(2)) {
    // Up
    showDebugInfo = !showDebugInfo;
  }

  // Interact with current demo
  if (nova64.input.btnp(5) || nova64.input.keyp('Space')) {
    // X or SPACE
    interactWithDemo();
  }

  // Chaos mode (G key) — only in sandbox
  if (nova64.input.keyp('KeyG') && selectedDemo === 5) {
    spawnChaosBurst();
  }

  // Reset demo
  if (nova64.input.btnp(4)) {
    // Z
    resetDemo();
  }
}

function resetDemo() {
  // Clear existing objects
  physicsObjects.forEach(obj => nova64.scene.destroyMesh(obj.mesh));
  particles.forEach(p => nova64.scene.destroyMesh(p.mesh));
  physicsObjects = [];
  particles = [];
  forceFields = [];
  constraints = [];

  // Save high score before reset
  if (destructionScore > highScore) highScore = destructionScore;
  destructionScore = 0;
  objectsCreated = 0;
  biggestImpact = 0;
  collisionCount = 0;

  // Setup new demo
  demos[selectedDemo].setup();
}

function setupBouncingSpheres() {
  // Create bouncing spheres with different materials
  const materials = [
    { color: 0xff4444, bounce: 0.9, size: 0.8 },
    { color: 0x44ff44, bounce: 0.7, size: 1.0 },
    { color: 0x4444ff, bounce: 0.5, size: 1.2 },
    { color: 0xffff44, bounce: 1.1, size: 0.6 },
  ];

  for (let i = 0; i < 12; i++) {
    const material = materials[i % materials.length];
    const sphere = createPhysicsObject({
      mesh: nova64.scene.createSphere(material.size, material.color, [
        (Math.random() - 0.5) * 20,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 20,
      ]),
      x: 0,
      y: 0,
      z: 0,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * 5,
      vz: (Math.random() - 0.5) * 10,
      radius: material.size,
      bounce: material.bounce,
      mass: material.size,
      type: 'sphere',
    });

    // Update position from mesh
    const pos = nova64.scene.getPosition(sphere.mesh);
    sphere.x = pos[0];
    sphere.y = pos[1];
    sphere.z = pos[2];

    physicsObjects.push(sphere);
  }
}

function setupPendulumChain() {
  // Create a chain of connected pendulums
  const chainLength = 6;
  const segmentLength = 2;

  for (let i = 0; i < chainLength; i++) {
    const sphere = createPhysicsObject({
      mesh: nova64.scene.createSphere(0.5, 0xff6600 + i * 0x001100, [
        i * segmentLength,
        10 - i * segmentLength,
        0,
      ]),
      x: i * segmentLength,
      y: 10 - i * segmentLength,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 0.5,
      bounce: 0.1,
      mass: 1,
      type: 'pendulum',
      chainIndex: i,
    });

    physicsObjects.push(sphere);

    // Create constraint to previous sphere (except first)
    if (i > 0) {
      constraints.push({
        objA: physicsObjects[physicsObjects.length - 2],
        objB: sphere,
        restLength: segmentLength,
        strength: 0.8,
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
    x: 0,
    y: 5,
    z: 0,
    spawnRate: 0.1,
    lastSpawn: 0,
  };

  forceFields.push(fountain);
}

function setupGravityWell() {
  // Create objects that orbit around a central gravity well
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 8 + Math.random() * 4;

    const sphere = createPhysicsObject({
      mesh: nova64.scene.createSphere(0.6, 0x44ffff, [
        Math.cos(angle) * radius,
        8,
        Math.sin(angle) * radius,
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
      type: 'orbiter',
    });

    physicsObjects.push(sphere);
  }

  // Create central gravity well
  forceFields.push({
    type: 'gravity',
    x: 0,
    y: 8,
    z: 0,
    strength: 50,
    radius: 15,
  });
}

function setupCollisionCascade() {
  // Create a domino-like cascade effect
  for (let i = 0; i < 10; i++) {
    const cube = createPhysicsObject({
      mesh: nova64.scene.createCube(1, 0x8844ff, [i * 2.5 - 12, 2, Math.sin(i * 0.5) * 3]),
      x: i * 2.5 - 12,
      y: 2,
      z: Math.sin(i * 0.5) * 3,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 1,
      bounce: 0.3,
      mass: 2,
      type: 'domino',
    });

    nova64.scene.setScale(cube.mesh, 0.8, 3, 0.4);
    physicsObjects.push(cube);
  }

  // Add initial impulse object
  const impulse = createPhysicsObject({
    mesh: nova64.scene.createSphere(1, 0xff4444, [-20, 5, 0]),
    x: -20,
    y: 5,
    z: 0,
    vx: 15,
    vy: 0,
    vz: 0,
    radius: 1,
    bounce: 0.9,
    mass: 3,
    type: 'impulse',
  });

  physicsObjects.push(impulse);
}

function setupSandbox() {
  // Sandbox mode with objectives!
  // Start with a tower of blocks to knock down
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const cube = createPhysicsObject({
        mesh: nova64.scene.createCube(
          1.2,
          [0xff4444, 0x44ff44, 0x4488ff, 0xffff44, 0xff88ff][row],
          [(col - 1) * 1.5, row * 1.5 + 1, 0]
        ),
        x: (col - 1) * 1.5,
        y: row * 1.5 + 1,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        radius: 0.8,
        bounce: 0.3,
        mass: 1,
        type: 'target',
      });
      physicsObjects.push(cube);
    }
  }
}

const SANDBOX_SHAPES = ['sphere', 'cube', 'cone', 'cylinder'];
const SANDBOX_COLORS = [
  0xff4444, 0x44ff44, 0x4488ff, 0xffff44, 0xff88ff, 0x44ffff, 0xff8800, 0x88ff00,
];

function sandboxSpawnObject() {
  if (physicsObjects.length >= 60) return; // raised cap for more chaos
  objectsCreated++;
  const shape = SANDBOX_SHAPES[Math.floor(Math.random() * SANDBOX_SHAPES.length)];
  const color = SANDBOX_COLORS[Math.floor(Math.random() * SANDBOX_COLORS.length)];
  const size = 0.5 + Math.random() * 1.5;
  const sx = (Math.random() - 0.5) * 16;
  const sy = 12 + Math.random() * 8;
  const sz = (Math.random() - 0.5) * 16;
  let mesh;
  if (shape === 'sphere') mesh = nova64.scene.createSphere(size, color, [sx, sy, sz]);
  else if (shape === 'cube') mesh = nova64.scene.createCube(size, color, [sx, sy, sz]);
  else if (shape === 'cone') mesh = nova64.scene.createCone(size, size * 2, color, [sx, sy, sz]);
  else mesh = nova64.scene.createCylinder(size * 0.5, size * 1.5, color, [sx, sy, sz]);

  physicsObjects.push(
    createPhysicsObject({
      mesh,
      x: sx,
      y: sy,
      z: sz,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 4,
      vz: (Math.random() - 0.5) * 8,
      radius: size * 0.8,
      bounce: 0.5 + Math.random() * 0.5,
      mass: size,
      type: 'sandbox',
    })
  );
}

function spawnChaosBurst() {
  for (let i = 0; i < 6; i++) sandboxSpawnObject();
  // Also kick existing objects
  physicsObjects.forEach(obj => {
    obj.vx += (Math.random() - 0.5) * 20;
    obj.vy += Math.random() * 15;
    obj.vz += (Math.random() - 0.5) * 20;
  });
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
    chainIndex: props.chainIndex || 0,
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
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

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
    nova64.scene.setPosition(obj.mesh, obj.x, obj.y, obj.z);

    // Add rotation for visual interest
    if (obj.type !== 'pendulum') {
      nova64.scene.rotateMesh(obj.mesh, obj.vx * dt * 0.1, obj.vy * dt * 0.1, obj.vz * dt * 0.1);
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
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

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
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
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
    const impulse = (-(1 + restitution) * velocityAlongNormal) / (1 / objA.mass + 1 / objB.mass);

    // Track destruction score from impact force
    const impactForce = Math.abs(impulse);
    destructionScore += Math.floor(impactForce * 10);
    collisionCount++;
    if (impactForce > biggestImpact) biggestImpact = impactForce;

    if (!objA.anchored) {
      objA.vx -= (impulse * normalX) / objA.mass;
      objA.vy -= (impulse * normalY) / objA.mass;
      objA.vz -= (impulse * normalZ) / objA.mass;
    }
    if (!objB.anchored) {
      objB.vx += (impulse * normalX) / objB.mass;
      objB.vy += (impulse * normalY) / objB.mass;
      objB.vz += (impulse * normalZ) / objB.mass;
    }

    // Create collision particles
    createCollisionParticles(objA.x + separationX, objA.y + separationY, objA.z + separationZ);
  }
}

function _local_updateParticles(dt) {
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

    nova64.scene.setPosition(particle.mesh, particle.x, particle.y, particle.z);

    // Fade out
    const scale = particle.life / particle.maxLife;
    nova64.scene.setScale(particle.mesh, scale);

    if (particle.life <= 0) {
      nova64.scene.destroyMesh(particle.mesh);
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

  nova64.camera.setCameraPosition(x, height, z);
  nova64.camera.setCameraTarget(0, 5, 0);
}

function interactWithDemo() {
  switch (selectedDemo) {
    case 0: {
      // Bouncing spheres - add a new sphere
      const sphere = createPhysicsObject({
        mesh: nova64.scene.createSphere(1, 0xffffff, [0, 15, 0]),
        x: 0,
        y: 15,
        z: 0,
        vx: (Math.random() - 0.5) * 10,
        vy: 0,
        vz: (Math.random() - 0.5) * 10,
        radius: 1,
        bounce: 0.9,
        mass: 1,
        type: 'sphere',
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

    case 4: {
      // Collision cascade - reset impulse
      const impulseObj = physicsObjects.find(obj => obj.type === 'impulse');
      if (impulseObj) {
        impulseObj.x = -20;
        impulseObj.y = 5;
        impulseObj.z = 0;
        impulseObj.vx = 15;
        impulseObj.vy = 0;
        impulseObj.vz = 0;
        nova64.scene.setPosition(impulseObj.mesh, impulseObj.x, impulseObj.y, impulseObj.z);
      }
      break;
    }

    case 5: {
      // Sandbox — spawn a random object
      sandboxSpawnObject();
      break;
    }
  }
}

function spawnParticle(x, y, z) {
  const particle = {
    mesh: nova64.scene.createSphere(0.2, 0xff6600, [x, y, z]),
    x: x,
    y: y,
    z: z,
    vx: (Math.random() - 0.5) * 8,
    vy: Math.random() * 12 + 5,
    vz: (Math.random() - 0.5) * 8,
    life: 3,
    maxLife: 3,
  };

  particles.push(particle);
}

function createBounceParticles(x, y, z) {
  for (let i = 0; i < 3; i++) {
    const particle = {
      mesh: nova64.scene.createSphere(0.1, 0xffaa44, [x, y, z]),
      x: x,
      y: y,
      z: z,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3,
      vz: (Math.random() - 0.5) * 4,
      life: 1,
      maxLife: 1,
    };
    particles.push(particle);
  }
}

function createCollisionParticles(x, y, z) {
  for (let i = 0; i < 5; i++) {
    const particle = {
      mesh: nova64.scene.createSphere(0.08, 0xff4444, [x, y, z]),
      x: x,
      y: y,
      z: z,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4,
      vz: (Math.random() - 0.5) * 6,
      life: 0.8,
      maxLife: 0.8,
    };
    particles.push(particle);
  }
}

function drawUI() {
  // HUD Background
  nova64.draw.rect(16, 16, 450, 105, nova64.draw.rgba8(0, 0, 0, 150), true);
  nova64.draw.rect(16, 16, 450, 105, nova64.draw.rgba8(100, 100, 200, 100), false);

  // Title and Demo Info
  nova64.draw.print('PHYSICS LAB 3D', 24, 24, nova64.draw.rgba8(100, 200, 255, 255));
  nova64.draw.print(
    `DEMO: ${demos[selectedDemo].name}`,
    24,
    40,
    nova64.draw.rgba8(255, 255, 255, 255)
  );

  // Stats
  nova64.draw.print(
    `OBJECTS: ${physicsObjects.length}`,
    24,
    56,
    nova64.draw.rgba8(255, 215, 0, 255)
  );
  nova64.draw.print(
    `PARTICLES: ${particles.length}`,
    24,
    72,
    nova64.draw.rgba8(255, 100, 100, 255)
  );

  // Destruction score — the fun metric!
  const scoreColor =
    destructionScore > 500
      ? nova64.draw.rgba8(255, 50, 50)
      : destructionScore > 100
        ? nova64.draw.rgba8(255, 200, 50)
        : nova64.draw.rgba8(100, 255, 100);
  nova64.draw.print(`DESTRUCTION: ${destructionScore}`, 24, 88, scoreColor);
  nova64.draw.print(`COLLISIONS: ${collisionCount}`, 24, 104, nova64.draw.rgba8(200, 150, 255));

  // Right side stats
  nova64.draw.print(
    `BIGGEST HIT: ${biggestImpact.toFixed(1)}`,
    250,
    56,
    nova64.draw.rgba8(255, 150, 50)
  );
  if (highScore > 0) {
    nova64.draw.print(`HIGH SCORE: ${highScore}`, 250, 72, nova64.draw.rgba8(255, 215, 0));
  }
  nova64.draw.print(`SPAWNED: ${objectsCreated}`, 250, 88, nova64.draw.rgba8(150, 200, 255));

  // 3D Stats
  const stats = nova64.scene.get3DStats();
  if (stats) {
    nova64.draw.print(
      `3D MESHES: ${stats.meshes || 0}`,
      250,
      104,
      nova64.draw.rgba8(150, 150, 255, 255)
    );
  }

  // Debug info
  if (showDebugInfo) {
    nova64.draw.print('DEBUG: ON', 250, 40, nova64.draw.rgba8(100, 255, 100, 255));
  } else {
    nova64.draw.print('DEBUG: OFF', 250, 40, nova64.draw.rgba8(255, 100, 100, 255));
  }

  // Sandbox objectives hint
  if (selectedDemo === 5) {
    const hint = 'KNOCK DOWN THE TOWER! SPAM SPACE FOR CHAOS!';
    nova64.draw.printCentered(hint, 320, 135, nova64.draw.rgba8(255, 200, 100, 200));
  }

  // Controls
  nova64.draw.print(
    '←→ CHANGE DEMO  ↑ DEBUG  SPC/X INTERACT  Z RESET  G CHAOS(sandbox)',
    24,
    340,
    nova64.draw.rgba8(150, 150, 150, 200)
  );
}
