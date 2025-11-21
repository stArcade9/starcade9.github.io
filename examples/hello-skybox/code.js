// 🌌 EXAMPLE: Using the Nova64 Skybox API
// This example shows how easy it is to create beautiful space backgrounds

// Screen management
let gameState = 'start'; // 'start', 'demo'
let startScreenTime = 0;
let uiButtons = [];
let time = 0;

export async function init() {
  console.log('🎮 Space Game Starting...');
  
  // Setup camera
  setCameraPosition(0, 5, 15);
  setCameraTarget(0, 0, 0);
  
  // ⭐ CREATE BEAUTIFUL SKYBOX - ONE LINE! ⭐
  createSpaceSkybox({
    starCount: 2000,        // Number of stars
    starSize: 2.5,          // Size of star particles
    nebulae: true,          // Enable nebula gradient
    nebulaColor: 0x1a0033   // Purple nebula color
  });
  
  // Add atmospheric fog
  setFog(0x000511, 50, 300);
  
  // Setup lighting
  setLightDirection(-0.3, -1, -0.5);
  setLightColor(0xffffff);
  setAmbientLight(0x404060);
  
  // Create your game objects
  const ship = createCube(2, 0x0099ff, [0, 0, 0]);
  setScale(ship, 3, 1.5, 4);
  
  // Initialize start screen
  initStartScreen();
  
  console.log('✅ Ready to play!');
}

function initStartScreen() {
  uiButtons = [];
  
  uiButtons.push(
    createButton(centerX(220), 150, 220, 55, '🌌 VIEW DEMO', () => {
      console.log('🎯 VIEW DEMO CLICKED! Changing gameState to demo...');
      gameState = 'demo';
      console.log('✅ gameState is now:', gameState);
    }, {
      normalColor: rgba8(100, 50, 200, 255),
      hoverColor: rgba8(130, 80, 230, 255),
      pressedColor: rgba8(70, 30, 170, 255)
    })
  );
  
  uiButtons.push(
    createButton(centerX(200), 350, 200, 45, 'ℹ API INFO', () => {
      console.log('Skybox API - Create beautiful space backgrounds in one line!');
    }, {
      normalColor: rgba8(50, 150, 255, 255),
      hoverColor: rgba8(80, 180, 255, 255),
      pressedColor: rgba8(30, 120, 220, 255)
    })
  );
}

export function update(dt) {
  time += dt;
  
  if (gameState === 'start') {
    startScreenTime += dt;
    updateAllButtons();
    animateSkybox(dt);
    return;
  }
  
  // ⭐ ANIMATE SKYBOX - ONE LINE! ⭐
  animateSkybox(dt);
  
  // Your game logic here...
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // Your 2D HUD here...
  print('SKYBOX API DEMO', 20, 20, rgba8(255, 255, 0, 255));
  print(`Time: ${time.toFixed(1)}s`, 20, 40, rgba8(255, 255, 255, 255));
  print('Beautiful space background with one function call!', 20, 320, rgba8(100, 200, 255, 200));
}

function drawStartScreen() {
  // Deep space gradient background
  drawGradientRect(0, 0, 640, 360,
    rgba8(10, 5, 30, 230),
    rgba8(5, 2, 15, 245),
    true
  );
  
  // Animated title
  setFont('huge');
  setTextAlign('center');
  const twinkle = Math.sin(startScreenTime * 3) * 0.3 + 0.7;
  const starColor = rgba8(
    255,
    Math.floor(twinkle * 255),
    Math.floor(twinkle * 100),
    255
  );
  
  const float = Math.sin(startScreenTime * 2) * 8;
  drawTextShadow('🌌 SKYBOX API', 320, 60 + float, starColor, rgba8(0, 0, 0, 255), 6, 1);
  
  // Subtitle
  setFont('large');
  const pulse = Math.sin(startScreenTime * 4) * 0.2 + 0.8;
  drawTextOutline('Space Backgrounds Made Easy', 320, 150, 
    rgba8(150, 100, 255, Math.floor(pulse * 255)), 
    rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(480), 200, 480, 190, {
    bgColor: rgba8(15, 10, 35, 210),
    borderColor: rgba8(100, 50, 200, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(25, 15, 50, 210)
  });
  drawPanel(panel);
  
  setFont('normal');
  setTextAlign('center');
  drawText('BEAUTIFUL SPACE SKYBOXES', 320, 220, rgba8(255, 215, 0, 255), 1);
  
  setFont('small');
  drawText('⭐ Create stunning space backgrounds in one line', 320, 245, uiColors.light, 1);
  drawText('⭐ 2000 animated stars + nebula gradients', 320, 260, uiColors.light, 1);
  drawText('⭐ Perfect for space shooters and sci-fi games', 320, 275, uiColors.light, 1);
  drawText('⭐ Full GPU acceleration with Three.js', 320, 290, uiColors.light, 1);
  
  setFont('tiny');
  drawText('API: createSpaceSkybox() + animateSkybox(dt)', 320, 310, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('⭐ SEE THE SKYBOX API IN ACTION ⭐', 320, 425, rgba8(150, 100, 255, alpha), 1);
  
  // Info
  setFont('tiny');
  drawText('Nova64 Skybox System', 320, 345, rgba8(120, 100, 150, 150), 1);
}

// That's it! Beautiful space background in 3 lines:
// 1. createSpaceSkybox({ ... });
// 2. setFog(...);
// 3. animateSkybox(dt);
