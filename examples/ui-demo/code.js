// 🎨 Nova64 UI System Demo - First Class Interface
// Showcases all professional UI components

const { circle, cls, line, rgba8 } = nova64.draw;
const { isKeyDown } = nova64.input;
const {
  createButton,
  createPanel,
  drawAllButtons,
  drawAllPanels,
  drawGradientRect,
  drawText,
  drawTextOutline,
  drawTextShadow,
  getMousePosition,
  isMouseDown,
  setFont,
  setMouseButton,
  setMousePosition,
  setTextAlign,
  setTextBaseline,
  uiColors,
  uiProgressBar,
  updateAllButtons,
} = nova64.ui;
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
  time: 0,
};

export async function init() {
  console.log('🎨 Nova64 UI System Demo - Loading...');

  // Create demo panels
  demo.panel1 = nova64.ui.createPanel(20, 20, 280, 200, {
    title: 'Player Stats',
    borderColor: uiColors.primary,
    shadow: true,
    gradient: true,
  });

  demo.panel2 = nova64.ui.createPanel(320, 20, 300, 150, {
    title: 'Control Panel',
    borderColor: uiColors.success,
    shadow: true,
    bgColor: nova64.draw.rgba8(20, 40, 60, 220),
  });

  demo.panel3 = nova64.ui.createPanel(20, 240, 600, 100, {
    title: 'Button Showcase',
    borderColor: uiColors.warning,
    shadow: true,
  });

  // Create demo buttons
  demo.buttons.push(
    nova64.ui.createButton(
      40,
      270,
      120,
      35,
      'PRIMARY',
      () => {
        console.log('Primary clicked!');
        demo.health = Math.min(100, demo.health + 10);
      },
      { normalColor: uiColors.primary }
    )
  );

  demo.buttons.push(
    nova64.ui.createButton(
      170,
      270,
      120,
      35,
      'SUCCESS',
      () => {
        console.log('Success clicked!');
        demo.mana = Math.min(100, demo.mana + 15);
      },
      { normalColor: uiColors.success }
    )
  );

  demo.buttons.push(
    nova64.ui.createButton(
      300,
      270,
      120,
      35,
      'WARNING',
      () => {
        console.log('Warning clicked!');
        demo.exp += 50;
      },
      { normalColor: uiColors.warning }
    )
  );

  demo.buttons.push(
    nova64.ui.createButton(
      430,
      270,
      120,
      35,
      'DANGER',
      () => {
        console.log('Danger clicked!');
        demo.health = Math.max(0, demo.health - 20);
      },
      { normalColor: uiColors.danger }
    )
  );

  demo.buttons.push(
    nova64.ui.createButton(
      560,
      270,
      50,
      35,
      'X',
      () => {
        console.log('Close clicked!');
      },
      {
        normalColor: nova64.draw.rgba8(100, 100, 100, 255),
        textColor: uiColors.white,
      }
    )
  );

  console.log('✅ UI Demo Ready!');
  console.log('🖱️  Click buttons to interact');
}

export function update(dt) {
  demo.time += dt;

  // Simulate mouse position from keyboard for demo
  // In real game, you'd use actual mouse input
  if (nova64.input.isKeyDown('arrowleft')) {
    nova64.ui.setMousePosition(
      Math.max(0, nova64.ui.getMousePosition().x - 200 * dt),
      nova64.ui.getMousePosition().y
    );
  }
  if (nova64.input.isKeyDown('arrowright')) {
    nova64.ui.setMousePosition(
      Math.min(640, nova64.ui.getMousePosition().x + 200 * dt),
      nova64.ui.getMousePosition().y
    );
  }
  if (nova64.input.isKeyDown('arrowup')) {
    nova64.ui.setMousePosition(
      nova64.ui.getMousePosition().x,
      Math.max(0, nova64.ui.getMousePosition().y - 200 * dt)
    );
  }
  if (nova64.input.isKeyDown('arrowdown')) {
    nova64.ui.setMousePosition(
      nova64.ui.getMousePosition().x,
      Math.min(360, nova64.ui.getMousePosition().y + 200 * dt)
    );
  }

  // Space to click
  nova64.ui.setMouseButton(nova64.input.isKeyDown('space'));

  // Update all buttons
  nova64.ui.updateAllButtons();

  // Animate values
  if (demo.health < 100) demo.health += dt * 2;
  if (demo.mana < 100) demo.mana += dt * 3;
}

export function draw() {
  // Clear background
  nova64.draw.cls();

  // Draw gradient background
  nova64.ui.drawGradientRect(
    0,
    0,
    640,
    360,
    nova64.draw.rgba8(10, 10, 30, 255),
    nova64.draw.rgba8(30, 10, 50, 255),
    true
  );

  // Draw all panels
  nova64.ui.drawAllPanels();

  // ============================================
  // Panel 1: Player Stats
  // ============================================

  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('left');
  nova64.ui.setTextBaseline('top');

  // Health bar
  nova64.ui.drawText('HEALTH', 40, 50, uiColors.danger, 1);
  nova64.ui.uiProgressBar(40, 70, 240, 20, demo.health, 100, {
    fillColor:
      demo.health > 50 ? uiColors.success : demo.health > 25 ? uiColors.warning : uiColors.danger,
    showText: true,
  });

  // Mana bar
  nova64.ui.drawText('MANA', 40, 100, uiColors.primary, 1);
  nova64.ui.uiProgressBar(40, 120, 240, 20, demo.mana, 100, {
    fillColor: uiColors.primary,
    showText: true,
  });

  // Experience bar
  nova64.ui.drawText('EXPERIENCE', 40, 150, uiColors.warning, 1);
  nova64.ui.uiProgressBar(40, 170, 240, 20, demo.exp, demo.maxExp, {
    fillColor: uiColors.warning,
    showText: true,
  });

  // Level indicator
  nova64.ui.setFont('large');
  nova64.ui.setTextAlign('center');
  nova64.ui.setTextBaseline('middle');
  const level = Math.floor(demo.exp / 1000) + 1;
  nova64.ui.drawTextShadow(
    'LVL ' + level,
    280,
    200,
    uiColors.white,
    nova64.draw.rgba8(0, 0, 0, 200),
    3,
    1
  );

  // ============================================
  // Panel 2: Control Panel
  // ============================================

  nova64.ui.setFont('normal');
  nova64.ui.setTextAlign('left');
  nova64.ui.setTextBaseline('top');

  // Score with outline
  nova64.ui.setFont('large');
  const scoreText = 'SCORE: ' + demo.score.toString().padStart(8, '0');
  nova64.ui.drawTextOutline(
    scoreText,
    340,
    50,
    uiColors.warning,
    nova64.draw.rgba8(0, 0, 0, 255),
    1
  );

  // Time
  nova64.ui.setFont('normal');
  const minutes = Math.floor(demo.time / 60);
  const seconds = Math.floor(demo.time % 60);
  const timeText = `TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  nova64.ui.drawText(timeText, 340, 90, uiColors.light, 1);

  // Status indicators
  nova64.ui.drawText('STATUS: ACTIVE', 340, 115, uiColors.success, 1);

  // Pulsing indicator
  const pulse = Math.sin(demo.time * 3) * 0.5 + 0.5;
  const pulseColor = nova64.draw.rgba8(0, 255, 0, Math.floor(pulse * 255));
  nova64.draw.circle(560, 125, 5, pulseColor, true);

  // ============================================
  // Panel 3: Buttons
  // ============================================

  nova64.ui.drawAllButtons();

  // ============================================
  // Header Title
  // ============================================

  nova64.ui.setFont('huge');
  nova64.ui.setTextAlign('center');
  nova64.ui.setTextBaseline('top');
  const titleY = 5 + Math.sin(demo.time * 2) * 2;
  nova64.ui.drawTextOutline(
    'NOVA64 UI SYSTEM',
    320,
    titleY,
    uiColors.primary,
    nova64.draw.rgba8(0, 0, 0, 255),
    1
  );

  // ============================================
  // Instructions
  // ============================================

  nova64.ui.setFont('small');
  nova64.ui.setTextAlign('center');
  nova64.ui.setTextBaseline('bottom');
  nova64.ui.drawText(
    'ARROW KEYS: Move Cursor  |  SPACE: Click  |  Buttons: Test UI',
    320,
    355,
    nova64.draw.rgba8(200, 200, 200, 255),
    1
  );

  // ============================================
  // Cursor
  // ============================================

  const mouse = nova64.ui.getMousePosition();

  // Cursor shadow
  nova64.draw.line(
    mouse.x + 2,
    mouse.y + 2,
    mouse.x + 12,
    mouse.y + 12,
    nova64.draw.rgba8(0, 0, 0, 150)
  );
  nova64.draw.line(
    mouse.x + 2,
    mouse.y + 2,
    mouse.x + 7,
    mouse.y + 12,
    nova64.draw.rgba8(0, 0, 0, 150)
  );

  // Cursor
  nova64.draw.line(mouse.x, mouse.y, mouse.x + 10, mouse.y + 10, uiColors.white);
  nova64.draw.line(mouse.x, mouse.y, mouse.x + 5, mouse.y + 10, uiColors.white);
  nova64.draw.line(mouse.x + 5, mouse.y + 10, mouse.x + 10, mouse.y + 10, uiColors.white);

  // Cursor highlight
  if (nova64.ui.isMouseDown()) {
    nova64.draw.circle(mouse.x, mouse.y, 15, nova64.draw.rgba8(255, 255, 0, 100), false);
  } else {
    nova64.draw.circle(mouse.x, mouse.y, 12, nova64.draw.rgba8(255, 255, 255, 80), false);
  }

  // ============================================
  // Font Showcase (bottom right)
  // ============================================

  nova64.ui.setTextAlign('right');
  nova64.ui.setTextBaseline('bottom');

  let fontY = 340;
  nova64.ui.setFont('tiny');
  nova64.ui.drawText('Tiny Font', 630, fontY, uiColors.light, 1);
  fontY -= 10;

  nova64.ui.setFont('small');
  nova64.ui.drawText('Small Font', 630, fontY, uiColors.light, 1);
  fontY -= 12;

  nova64.ui.setFont('normal');
  nova64.ui.drawText('Normal Font', 630, fontY, uiColors.light, 1);
  fontY -= 14;

  nova64.ui.setFont('large');
  nova64.ui.drawText('Large Font', 630, fontY, uiColors.light, 1);
  fontY -= 18;

  nova64.ui.setFont('huge');
  nova64.ui.drawText('Huge Font', 630, fontY, uiColors.light, 1);
}
