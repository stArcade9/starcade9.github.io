// HELLO 3D WORLD - Simple Nintendo 64/PlayStation style 3D demo
// Demonstrates basic 3D rendering with GPU acceleration
//
// 💡 TIP: All globals also live under the `nova64` namespace:
//   const { createCube, setPosition, rotateMesh } = nova64.scene;
//   const { setCameraPosition, setCameraTarget } = nova64.camera;
//   const { print, rgba8, cls } = nova64.draw;
//   const { key, isKeyPressed } = nova64.input;

let cubes = [];
let spheres = [];
let time = 0;
let cameraAngle = 0;
let initialized = false; // Prevents update() from running during scene transitions

// Screen management
let gameState = 'start'; // 'start', 'playing'
let startScreenTime = 0;
let uiButtons = [];

export async function init() {
  // Clear arrays immediately to prevent update() from accessing deleted meshes
  initialized = false; // Mark as not ready during initialization
  cubes = [];
  spheres = [];

  nova64.draw.cls();

  // Setup 3D scene
  nova64.camera.setCameraPosition(0, 5, 15);
  nova64.camera.setCameraTarget(0, 0, 0);
  nova64.camera.setCameraFOV(60);

  // Nintendo 64 style lighting
  nova64.light.setLightDirection(-0.5, -1, -0.3);
  nova64.light.setFog(0x202040, 20, 100);

  // Enable retro effects
  nova64.fx.enablePixelation(1);
  nova64.fx.enableDithering(true);

  // Create some basic 3D objects
  createScene();

  // Initialize start screen
  initStartScreen();

  initialized = true; // Now safe to update
  console.log('🎮 Hello 3D World - Nintendo 64/PlayStation style demo loaded!');
}

function initStartScreen() {
  uiButtons = [];

  // Start button - positioned higher for easier clicking
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(220),
      150,
      220,
      55,
      '▶ START DEMO',
      () => {
        console.log('🎯 START BUTTON CLICKED! Changing gameState to playing...');
        gameState = 'playing';
        console.log('✅ gameState is now:', gameState);
      },
      {
        normalColor: nova64.draw.rgba8(50, 180, 255, 255),
        hoverColor: nova64.draw.rgba8(80, 200, 255, 255),
        pressedColor: nova64.draw.rgba8(20, 140, 220, 255),
      }
    )
  );

  // Info button
  uiButtons.push(
    nova64.ui.createButton(
      nova64.ui.centerX(200),
      350,
      200,
      45,
      'ℹ INFO',
      () => {
        console.log('Hello 3D World - Basic 3D demo with GPU acceleration');
      },
      {
        normalColor: nova64.draw.rgba8(100, 100, 255, 255),
        hoverColor: nova64.draw.rgba8(130, 130, 255, 255),
        pressedColor: nova64.draw.rgba8(70, 70, 220, 255),
      }
    )
  );
}

function createScene() {
  // Create stunning holographic spinning cubes with advanced materials
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  const emissiveColors = [0x330000, 0x003300, 0x000033, 0x333300, 0x330033, 0x003333];

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * 8;
    const z = Math.sin(angle) * 8;

    // Create cube with enhanced visual effects
    const cube = nova64.scene.createCube(2, colors[i], [x, 0, z]);

    cubes.push({
      mesh: cube,
      x: x,
      y: 0,
      z: z,
      rotationSpeed: 1 + Math.random() * 2,
      bobPhase: Math.random() * Math.PI * 2,
      glowPhase: Math.random() * Math.PI * 2,
    });
  }

  // Create magical glowing spheres
  for (let i = 0; i < 4; i++) {
    const sphere = nova64.scene.createSphere(1, 0x88ddff, [
      (Math.random() - 0.5) * 12,
      2 + Math.random() * 4,
      (Math.random() - 0.5) * 12,
    ]);

    spheres.push({
      mesh: sphere,
      x: (Math.random() - 0.5) * 12,
      y: 2 + Math.random() * 4,
      z: (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2,
      vz: (Math.random() - 0.5) * 4,
      trail: [],
    });
  }

  // Create stunning ground plane
  const ground = nova64.scene.createPlane(40, 40, 0x444466, [0, -2, 0]);
  nova64.scene.setRotation(ground, -Math.PI / 2, 0, 0);
}

export function update(dt) {
  // Safety check: Don't update if not initialized OR if arrays are empty (prevents errors during scene transitions)
  // When scene is cleared, arrays are emptied on next init() call
  if (!initialized || cubes.length === 0) {
    return;
  }

  time += dt;

  if (gameState === 'start') {
    startScreenTime += dt;
    nova64.ui.updateAllButtons();

    // KEYBOARD FALLBACK: Press ENTER or SPACE to start
    if (
      nova64.input.isKeyPressed('Enter') ||
      nova64.input.isKeyPressed(' ') ||
      nova64.input.isKeyPressed('Space')
    ) {
      console.log('🎮 Keyboard start pressed!');
      gameState = 'playing';
      return;
    }

    // Still animate 3D scene in background
    cubes.forEach(cube => {
      cube.bobPhase += dt * 2;
      const bobY = Math.sin(cube.bobPhase) * 2;
      nova64.scene.setPosition(cube.mesh, cube.x, bobY, cube.z);
      nova64.scene.rotateMesh(cube.mesh, dt * cube.rotationSpeed, dt * cube.rotationSpeed * 0.7, 0);
    });

    cameraAngle += dt * 0.2;
    const camX = Math.cos(cameraAngle) * 15;
    const camZ = Math.sin(cameraAngle) * 15;
    nova64.camera.setCameraPosition(camX, 8, camZ);
    nova64.camera.setCameraTarget(0, 0, 0);
    return;
  }

  // Playing state
  // Rotate cubes
  cubes.forEach(cube => {
    cube.bobPhase += dt * 2;
    const bobY = Math.sin(cube.bobPhase) * 2;

    nova64.scene.setPosition(cube.mesh, cube.x, bobY, cube.z);
    nova64.scene.rotateMesh(cube.mesh, dt * cube.rotationSpeed, dt * cube.rotationSpeed * 0.7, 0);
  });

  // Bounce spheres
  spheres.forEach(sphere => {
    sphere.x += sphere.vx * dt;
    sphere.y += sphere.vy * dt;
    sphere.z += sphere.vz * dt;

    // Simple physics
    sphere.vy -= 9.8 * dt; // gravity

    // Ground bounce
    if (sphere.y < 1) {
      sphere.y = 1;
      sphere.vy *= -0.8;
    }

    // Wall bounds
    if (Math.abs(sphere.x) > 10) {
      sphere.vx *= -1;
      sphere.x = Math.sign(sphere.x) * 10;
    }
    if (Math.abs(sphere.z) > 10) {
      sphere.vz *= -1;
      sphere.z = Math.sign(sphere.z) * 10;
    }

    nova64.scene.setPosition(sphere.mesh, sphere.x, sphere.y, sphere.z);
  });

  // Rotate camera
  cameraAngle += dt * 0.3;
  const camX = Math.cos(cameraAngle) * 15;
  const camZ = Math.sin(cameraAngle) * 15;

  nova64.camera.setCameraPosition(camX, 8, camZ);
  nova64.camera.setCameraTarget(0, 0, 0);
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }

  // Playing - Simple HUD
  nova64.draw.print('🎮 HELLO 3D WORLD', 8, 8, nova64.draw.rgba8(0, 255, 255, 255));
  nova64.draw.print('Nintendo 64 / PlayStation Style', 8, 24, nova64.draw.rgba8(255, 200, 0, 255));
  nova64.draw.print(`Time: ${time.toFixed(1)}s`, 8, 40, nova64.draw.rgba8(255, 255, 255, 255));
  nova64.draw.print(
    `Objects: ${cubes.length + spheres.length + 1}`,
    8,
    56,
    nova64.draw.rgba8(100, 255, 100, 255)
  );

  // 3D Stats
  const stats = nova64.scene.get3DStats();
  if (stats && stats.render) {
    nova64.draw.print(
      `3D Meshes: ${stats.meshes || 0}`,
      8,
      72,
      nova64.draw.rgba8(150, 150, 255, 255)
    );
    nova64.draw.print(
      `GPU: ${stats.renderer || 'Three.js'}`,
      8,
      88,
      nova64.draw.rgba8(150, 150, 255, 255)
    );
  }

  nova64.draw.print('WASD: Move camera manually', 8, 320, nova64.draw.rgba8(200, 200, 200, 200));
  nova64.draw.print(
    'Full GPU 3D acceleration with Three.js!',
    8,
    340,
    nova64.draw.rgba8(100, 255, 100, 180)
  );
}

function drawStartScreen() {
  // Bright gradient background
  nova64.ui.drawGradientRect(
    0,
    0,
    640,
    360,
    nova64.draw.rgba8(30, 60, 120, 230),
    nova64.draw.rgba8(10, 30, 80, 240),
    true
  );

  // Animated title with rainbow glow
  const rainbow = [
    nova64.draw.rgba8(255, 0, 0, 255),
    nova64.draw.rgba8(255, 127, 0, 255),
    nova64.draw.rgba8(255, 255, 0, 255),
    nova64.draw.rgba8(0, 255, 0, 255),
    nova64.draw.rgba8(0, 0, 255, 255),
    nova64.draw.rgba8(148, 0, 211, 255),
  ];
  const colorIndex = Math.floor(startScreenTime * 2) % rainbow.length;

  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  const bounce = Math.sin(startScreenTime * 3) * 8;
  nova64.ui.drawTextShadow(
    'HELLO',
    320,
    60 + bounce,
    rainbow[colorIndex],
    nova64.draw.rgba8(0, 0, 0, 255),
    5,
    1
  );
  nova64.ui.drawTextShadow(
    '3D WORLD',
    320,
    110 + bounce,
    nova64.draw.rgba8(0, 255, 255, 255),
    nova64.draw.rgba8(0, 0, 0, 255),
    5,
    1
  );

  // Subtitle
  nova64.ui.setFont('large');
  const pulse = Math.sin(startScreenTime * 4) * 0.3 + 0.7;
  nova64.ui.drawTextOutline(
    'Nintendo 64 / PlayStation Style',
    320,
    160,
    nova64.draw.rgba8(255, 200, 0, Math.floor(pulse * 255)),
    nova64.draw.rgba8(0, 0, 0, 255),
    1
  );

  // Info panel
  const panel = nova64.ui.createPanel(nova64.ui.centerX(450), 200, 450, 180, {
    bgColor: nova64.draw.rgba8(20, 40, 80, 200),
    borderColor: nova64.draw.rgba8(50, 180, 255, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: nova64.draw.rgba8(30, 50, 100, 200),
  });
  nova64.draw.drawPanel(panel);

  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawText('BASIC 3D RENDERING DEMO', 320, 220, nova64.draw.rgba8(0, 255, 255, 255), 1);

  nova64.ui.setFont('small');
  nova64.ui.drawText(
    'Experience GPU-accelerated 3D graphics with Three.js',
    320,
    245,
    nova64.ui.uiColors.light,
    1
  );
  nova64.ui.drawText(
    'Watch spinning cubes and bouncing spheres',
    320,
    260,
    nova64.ui.uiColors.light,
    1
  );
  nova64.ui.drawText(
    'Full retro Nintendo 64 visual effects enabled',
    320,
    275,
    nova64.ui.uiColors.light,
    1
  );

  nova64.ui.setFont('tiny');
  nova64.ui.drawText(
    'Camera rotates automatically around the scene',
    320,
    300,
    nova64.ui.uiColors.secondary,
    1
  );

  // Draw buttons
  nova64.ui.drawAllButtons();

  // DEBUG: Show mouse position and button bounds
  const mx = nova64.input.mouseX();
  const my = nova64.input.mouseY();
  if (mx >= 0 && my >= 0) {
    nova64.ui.setFont('tiny');
    nova64.ui.setTextAlign('left');
    nova64.ui.drawText(`Mouse: ${mx}, ${my}`, 10, 10, nova64.draw.rgba8(255, 255, 0, 255), 1);
    // Draw crosshair at mouse position
    nova64.draw.line(mx - 10, my, mx + 10, my, nova64.draw.rgba8(0, 255, 0, 255));
    nova64.draw.line(mx, my - 10, mx, my + 10, nova64.draw.rgba8(0, 255, 0, 255));
  }

  // Pulsing start prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('center');
  nova64.ui.drawText('▶ PRESS START DEMO ◀', 320, 425, nova64.draw.rgba8(50, 200, 255, alpha), 1);

  // Nova64 branding
  nova64.ui.setFont('tiny');
  nova64.ui.drawText(
    'Nova64 v0.2.0 - Fantasy Console',
    320,
    345,
    nova64.draw.rgba8(150, 150, 200, 150),
    1
  );
}
