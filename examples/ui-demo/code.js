// 🎨 Nova64 UI System Demo - First Class Interface
// Showcases all professional UI components

let demo = {
  panel1: null,
  panel2: null,
  panel3: null,
  buttons: [],
  health: 75,
  mana: 50,
  exp: 380,
  maxExp: 1000,
  score: 12345,
  time: 0
};

export async function init() {
  console.log('🎨 Nova64 UI System Demo - Loading...');
  
  // Create demo panels
  demo.panel1 = createPanel(20, 20, 280, 200, {
    title: 'Player Stats',
    borderColor: uiColors.primary,
    shadow: true,
    gradient: true
  });
  
  demo.panel2 = createPanel(320, 20, 300, 150, {
    title: 'Control Panel',
    borderColor: uiColors.success,
    shadow: true,
    bgColor: rgba8(20, 40, 60, 220)
  });
  
  demo.panel3 = createPanel(20, 240, 600, 100, {
    title: 'Button Showcase',
    borderColor: uiColors.warning,
    shadow: true
  });
  
  // Create demo buttons
  demo.buttons.push(
    createButton(40, 270, 120, 35, 'PRIMARY', () => {
      console.log('Primary clicked!');
      demo.health = Math.min(100, demo.health + 10);
    }, { normalColor: uiColors.primary })
  );
  
  demo.buttons.push(
    createButton(170, 270, 120, 35, 'SUCCESS', () => {
      console.log('Success clicked!');
      demo.mana = Math.min(100, demo.mana + 15);
    }, { normalColor: uiColors.success })
  );
  
  demo.buttons.push(
    createButton(300, 270, 120, 35, 'WARNING', () => {
      console.log('Warning clicked!');
      demo.exp += 50;
    }, { normalColor: uiColors.warning })
  );
  
  demo.buttons.push(
    createButton(430, 270, 120, 35, 'DANGER', () => {
      console.log('Danger clicked!');
      demo.health = Math.max(0, demo.health - 20);
    }, { normalColor: uiColors.danger })
  );
  
  demo.buttons.push(
    createButton(560, 270, 50, 35, 'X', () => {
      console.log('Close clicked!');
    }, { 
      normalColor: rgba8(100, 100, 100, 255),
      textColor: uiColors.white
    })
  );
  
  console.log('✅ UI Demo Ready!');
  console.log('🖱️  Click buttons to interact');
}

export function update(dt) {
  demo.time += dt;
  
  // Simulate mouse position from keyboard for demo
  // In real game, you'd use actual mouse input
  if (isKeyDown('arrowleft')) {
    setMousePosition(Math.max(0, getMousePosition().x - 200 * dt), getMousePosition().y);
  }
  if (isKeyDown('arrowright')) {
    setMousePosition(Math.min(640, getMousePosition().x + 200 * dt), getMousePosition().y);
  }
  if (isKeyDown('arrowup')) {
    setMousePosition(getMousePosition().x, Math.max(0, getMousePosition().y - 200 * dt));
  }
  if (isKeyDown('arrowdown')) {
    setMousePosition(getMousePosition().x, Math.min(360, getMousePosition().y + 200 * dt));
  }
  
  // Space to click
  setMouseButton(isKeyDown('space'));
  
  // Update all buttons
  updateAllButtons();
  
  // Animate values
  if (demo.health < 100) demo.health += dt * 2;
  if (demo.mana < 100) demo.mana += dt * 3;
}

export function draw() {
  // Clear background
  cls();
  
  // Draw gradient background
  drawGradientRect(0, 0, 640, 360, 
    rgba8(10, 10, 30, 255), 
    rgba8(30, 10, 50, 255), 
    true
  );
  
  // Draw all panels
  drawAllPanels();
  
  // ============================================
  // Panel 1: Player Stats
  // ============================================
  
  setFont('normal');
  setTextAlign('left');
  setTextBaseline('top');
  
  // Health bar
  drawText('HEALTH', 40, 50, uiColors.danger, 1);
  drawProgressBar(40, 70, 240, 20, demo.health, 100, {
    fillColor: demo.health > 50 ? uiColors.success : demo.health > 25 ? uiColors.warning : uiColors.danger,
    showText: true
  });
  
  // Mana bar
  drawText('MANA', 40, 100, uiColors.primary, 1);
  drawProgressBar(40, 120, 240, 20, demo.mana, 100, {
    fillColor: uiColors.primary,
    showText: true
  });
  
  // Experience bar
  drawText('EXPERIENCE', 40, 150, uiColors.warning, 1);
  drawProgressBar(40, 170, 240, 20, demo.exp, demo.maxExp, {
    fillColor: uiColors.warning,
    showText: true
  });
  
  // Level indicator
  setFont('large');
  setTextAlign('center');
  setTextBaseline('middle');
  const level = Math.floor(demo.exp / 1000) + 1;
  drawTextShadow('LVL ' + level, 280, 200, uiColors.white, rgba8(0, 0, 0, 200), 3, 1);
  
  // ============================================
  // Panel 2: Control Panel
  // ============================================
  
  setFont('normal');
  setTextAlign('left');
  setTextBaseline('top');
  
  // Score with outline
  setFont('large');
  const scoreText = 'SCORE: ' + demo.score.toString().padStart(8, '0');
  drawTextOutline(scoreText, 340, 50, uiColors.warning, rgba8(0, 0, 0, 255), 1);
  
  // Time
  setFont('normal');
  const minutes = Math.floor(demo.time / 60);
  const seconds = Math.floor(demo.time % 60);
  const timeText = `TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  drawText(timeText, 340, 90, uiColors.light, 1);
  
  // Status indicators
  drawText('STATUS: ACTIVE', 340, 115, uiColors.success, 1);
  
  // Pulsing indicator
  const pulse = Math.sin(demo.time * 3) * 0.5 + 0.5;
  const pulseColor = rgba8(0, 255, 0, Math.floor(pulse * 255));
  circle(560, 125, 5, pulseColor, true);
  
  // ============================================
  // Panel 3: Buttons
  // ============================================
  
  drawAllButtons();
  
  // ============================================
  // Header Title
  // ============================================
  
  setFont('huge');
  setTextAlign('center');
  setTextBaseline('top');
  const titleY = 5 + Math.sin(demo.time * 2) * 2;
  drawTextOutline('NOVA64 UI SYSTEM', 320, titleY, uiColors.primary, rgba8(0, 0, 0, 255), 1);
  
  // ============================================
  // Instructions
  // ============================================
  
  setFont('small');
  setTextAlign('center');
  setTextBaseline('bottom');
  drawText('ARROW KEYS: Move Cursor  |  SPACE: Click  |  Buttons: Test UI', 
    320, 355, rgba8(200, 200, 200, 255), 1);
  
  // ============================================
  // Cursor
  // ============================================
  
  const mouse = getMousePosition();
  
  // Cursor shadow
  line(mouse.x + 2, mouse.y + 2, mouse.x + 12, mouse.y + 12, rgba8(0, 0, 0, 150));
  line(mouse.x + 2, mouse.y + 2, mouse.x + 7, mouse.y + 12, rgba8(0, 0, 0, 150));
  
  // Cursor
  line(mouse.x, mouse.y, mouse.x + 10, mouse.y + 10, uiColors.white);
  line(mouse.x, mouse.y, mouse.x + 5, mouse.y + 10, uiColors.white);
  line(mouse.x + 5, mouse.y + 10, mouse.x + 10, mouse.y + 10, uiColors.white);
  
  // Cursor highlight
  if (isMouseDown()) {
    circle(mouse.x, mouse.y, 15, rgba8(255, 255, 0, 100), false);
  } else {
    circle(mouse.x, mouse.y, 12, rgba8(255, 255, 255, 80), false);
  }
  
  // ============================================
  // Font Showcase (bottom right)
  // ============================================
  
  setTextAlign('right');
  setTextBaseline('bottom');
  
  let fontY = 340;
  setFont('tiny');
  drawText('Tiny Font', 630, fontY, uiColors.light, 1);
  fontY -= 10;
  
  setFont('small');
  drawText('Small Font', 630, fontY, uiColors.light, 1);
  fontY -= 12;
  
  setFont('normal');
  drawText('Normal Font', 630, fontY, uiColors.light, 1);
  fontY -= 14;
  
  setFont('large');
  drawText('Large Font', 630, fontY, uiColors.light, 1);
  fontY -= 18;
  
  setFont('huge');
  drawText('Huge Font', 630, fontY, uiColors.light, 1);
}
