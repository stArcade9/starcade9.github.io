// HELLO 3D WORLD - Simple Nintendo 64/PlayStation style 3D demo
// Demonstrates basic 3D rendering with GPU acceleration

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
  
  cls();
  
  // Setup 3D scene
  setCameraPosition(0, 5, 15);
  setCameraTarget(0, 0, 0);
  setCameraFOV(60);
  
  // Nintendo 64 style lighting
  setLightDirection(-0.5, -1, -0.3);
  setFog(0x202040, 20, 100);
  
  // Enable retro effects
  enablePixelation(1);
  enableDithering(true);
  
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
    createButton(centerX(220), 150, 220, 55, '▶ START DEMO', () => {
      console.log('🎯 START BUTTON CLICKED! Changing gameState to playing...');
      gameState = 'playing';
      console.log('✅ gameState is now:', gameState);
    }, {
      normalColor: rgba8(50, 180, 255, 255),
      hoverColor: rgba8(80, 200, 255, 255),
      pressedColor: rgba8(20, 140, 220, 255)
    })
  );
  
  // Info button
  uiButtons.push(
    createButton(centerX(200), 350, 200, 45, 'ℹ INFO', () => {
      console.log('Hello 3D World - Basic 3D demo with GPU acceleration');
    }, {
      normalColor: rgba8(100, 100, 255, 255),
      hoverColor: rgba8(130, 130, 255, 255),
      pressedColor: rgba8(70, 70, 220, 255)
    })
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
    const cube = createCube(2, colors[i], [x, 0, z]);
    
    cubes.push({
      mesh: cube,
      x: x, y: 0, z: z,
      rotationSpeed: 1 + Math.random() * 2,
      bobPhase: Math.random() * Math.PI * 2,
      glowPhase: Math.random() * Math.PI * 2
    });
  }
  
  // Create magical glowing spheres
  for (let i = 0; i < 4; i++) {
    const sphere = createSphere(1, 0x88ddff, [
      (Math.random() - 0.5) * 12,
      2 + Math.random() * 4,
      (Math.random() - 0.5) * 12
    ]);
    
    spheres.push({
      mesh: sphere,
      x: (Math.random() - 0.5) * 12,
      y: 2 + Math.random() * 4,
      z: (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2,
      vz: (Math.random() - 0.5) * 4,
      trail: []
    });
  }
  
  // Create stunning ground plane
  const ground = createPlane(40, 40, 0x444466, [0, -2, 0]);
  setRotation(ground, -Math.PI/2, 0, 0);
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
    updateAllButtons();
    
    // KEYBOARD FALLBACK: Press ENTER or SPACE to start
    if (isKeyPressed('Enter') || isKeyPressed(' ') || isKeyPressed('Space')) {
      console.log('🎮 Keyboard start pressed!');
      gameState = 'playing';
      return;
    }
    
    // Still animate 3D scene in background
    cubes.forEach(cube => {
      cube.bobPhase += dt * 2;
      const bobY = Math.sin(cube.bobPhase) * 2;
      setPosition(cube.mesh, cube.x, bobY, cube.z);
      rotateMesh(cube.mesh, dt * cube.rotationSpeed, dt * cube.rotationSpeed * 0.7, 0);
    });
    
    cameraAngle += dt * 0.2;
    const camX = Math.cos(cameraAngle) * 15;
    const camZ = Math.sin(cameraAngle) * 15;
    setCameraPosition(camX, 8, camZ);
    setCameraTarget(0, 0, 0);
    return;
  }
  
  // Playing state
  // Rotate cubes
  cubes.forEach(cube => {
    cube.bobPhase += dt * 2;
    const bobY = Math.sin(cube.bobPhase) * 2;
    
    setPosition(cube.mesh, cube.x, bobY, cube.z);
    rotateMesh(cube.mesh, dt * cube.rotationSpeed, dt * cube.rotationSpeed * 0.7, 0);
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
    
    setPosition(sphere.mesh, sphere.x, sphere.y, sphere.z);
  });
  
  // Rotate camera
  cameraAngle += dt * 0.3;
  const camX = Math.cos(cameraAngle) * 15;
  const camZ = Math.sin(cameraAngle) * 15;
  
  setCameraPosition(camX, 8, camZ);
  setCameraTarget(0, 0, 0);
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // Playing - Simple HUD
  print('🎮 HELLO 3D WORLD', 8, 8, rgba8(0, 255, 255, 255));
  print('Nintendo 64 / PlayStation Style', 8, 24, rgba8(255, 200, 0, 255));
  print(`Time: ${time.toFixed(1)}s`, 8, 40, rgba8(255, 255, 255, 255));
  print(`Objects: ${cubes.length + spheres.length + 1}`, 8, 56, rgba8(100, 255, 100, 255));
  
  // 3D Stats
  const stats = get3DStats();
  if (stats && stats.render) {
    print(`3D Meshes: ${stats.meshes || 0}`, 8, 72, rgba8(150, 150, 255, 255));
    print(`GPU: ${stats.renderer || 'Three.js'}`, 8, 88, rgba8(150, 150, 255, 255));
  }
  
  print('WASD: Move camera manually', 8, 320, rgba8(200, 200, 200, 200));
  print('Full GPU 3D acceleration with Three.js!', 8, 340, rgba8(100, 255, 100, 180));
}

function drawStartScreen() {
  // Bright gradient background
  drawGradientRect(0, 0, 640, 360,
    rgba8(30, 60, 120, 230),
    rgba8(10, 30, 80, 240),
    true
  );
  
  // Animated title with rainbow glow
  const rainbow = [
    rgba8(255, 0, 0, 255),
    rgba8(255, 127, 0, 255),
    rgba8(255, 255, 0, 255),
    rgba8(0, 255, 0, 255),
    rgba8(0, 0, 255, 255),
    rgba8(148, 0, 211, 255)
  ];
  const colorIndex = Math.floor(startScreenTime * 2) % rainbow.length;
  
  setFont('huge');
  setTextAlign('center');
  const bounce = Math.sin(startScreenTime * 3) * 8;
  drawTextShadow('HELLO', 320, 60 + bounce, rainbow[colorIndex], rgba8(0, 0, 0, 255), 5, 1);
  drawTextShadow('3D WORLD', 320, 110 + bounce, rgba8(0, 255, 255, 255), rgba8(0, 0, 0, 255), 5, 1);
  
  // Subtitle
  setFont('large');
  const pulse = Math.sin(startScreenTime * 4) * 0.3 + 0.7;
  drawTextOutline('Nintendo 64 / PlayStation Style', 320, 160, 
    rgba8(255, 200, 0, Math.floor(pulse * 255)), 
    rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(450), 200, 450, 180, {
    bgColor: rgba8(20, 40, 80, 200),
    borderColor: rgba8(50, 180, 255, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(30, 50, 100, 200)
  });
  drawPanel(panel);
  
  setFont('normal');
  setTextAlign('center');
  drawText('BASIC 3D RENDERING DEMO', 320, 220, rgba8(0, 255, 255, 255), 1);
  
  setFont('small');
  drawText('Experience GPU-accelerated 3D graphics with Three.js', 320, 245, uiColors.light, 1);
  drawText('Watch spinning cubes and bouncing spheres', 320, 260, uiColors.light, 1);
  drawText('Full retro Nintendo 64 visual effects enabled', 320, 275, uiColors.light, 1);
  
  setFont('tiny');
  drawText('Camera rotates automatically around the scene', 320, 300, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // DEBUG: Show mouse position and button bounds
  const mx = mouseX();
  const my = mouseY();
  if (mx >= 0 && my >= 0) {
    setFont('tiny');
    setTextAlign('left');
    drawText(`Mouse: ${mx}, ${my}`, 10, 10, rgba8(255, 255, 0, 255), 1);
    // Draw crosshair at mouse position
    line(mx - 10, my, mx + 10, my, rgba8(0, 255, 0, 255));
    line(mx, my - 10, mx, my + 10, rgba8(0, 255, 0, 255));
  }
  
  // Pulsing start prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  setFont('normal');
  setTextAlign('center');
  drawText('▶ PRESS START DEMO ◀', 320, 425, rgba8(50, 200, 255, alpha), 1);
  
  // Nova64 branding
  setFont('tiny');
  drawText('Nova64 v0.2.0 - Fantasy Console', 320, 345, rgba8(150, 150, 200, 150), 1);
}