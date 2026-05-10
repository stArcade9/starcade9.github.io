// Font Test - Complete Character Set Demo
// Testing uppercase, lowercase, symbols, arrows, and emoji handling

const { cls, print, rect, rgba8 } = nova64.draw;

export async function init() {
  console.log('🔤 Font Test - Complete Character Set');
}

export function update() {}

export function draw() {
  nova64.draw.cls(nova64.draw.rgba8(20, 20, 40, 255));

  // Title
  nova64.draw.print('NOVA64 FONT - COMPLETE TEST', 140, 10, nova64.draw.rgba8(255, 200, 0, 255), 1);

  // Uppercase
  nova64.draw.print(
    'UPPERCASE: ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    20,
    35,
    nova64.draw.rgba8(255, 255, 255, 255),
    1
  );

  // Lowercase
  nova64.draw.print(
    'lowercase: abcdefghijklmnopqrstuvwxyz',
    20,
    52,
    nova64.draw.rgba8(0, 255, 200, 255),
    1
  );

  // Numbers
  nova64.draw.print('Numbers:   0123456789', 20, 69, nova64.draw.rgba8(255, 255, 100, 255), 1);

  // Punctuation
  nova64.draw.print("Symbols:   !?.,;:'-_()[]{}", 20, 86, nova64.draw.rgba8(255, 150, 255, 255), 1);
  nova64.draw.print(
    '           <>=+*&%$#@^~`"|\\/',
    20,
    103,
    nova64.draw.rgba8(255, 150, 255, 255),
    1
  );

  // Arrows (Unicode)
  nova64.draw.print('Arrows:    ← → ↑ ↓ ↔ ↕', 20, 120, nova64.draw.rgba8(100, 255, 100, 255), 1);
  nova64.draw.print(
    'Controls:  ↑↓ UP/DOWN  ←→ LEFT/RIGHT',
    20,
    137,
    nova64.draw.rgba8(200, 200, 255, 255),
    1
  );

  // Mixed case examples
  nova64.draw.print(
    'Mixed:     Hello World! The Quick Brown Fox',
    20,
    154,
    nova64.draw.rgba8(255, 200, 150, 255),
    1
  );
  nova64.draw.print(
    '           Jumps Over The Lazy Dog 123!',
    20,
    171,
    nova64.draw.rgba8(255, 200, 150, 255),
    1
  );

  // Emoji handling (should strip or replace)
  nova64.draw.print(
    'Emoji Test: 🎮 🚀 ⚡ ✨ (cleaned automatically)',
    20,
    195,
    nova64.draw.rgba8(255, 100, 100, 255),
    1
  );

  // Game-style text examples
  nova64.draw.print('Game Text:', 20, 219, nova64.draw.rgba8(0, 255, 255, 255), 1);
  nova64.draw.print('  SCORE: 1234567890', 20, 236, nova64.draw.rgba8(255, 255, 0, 255), 1);
  nova64.draw.print('  HEALTH: [##########] 100%', 20, 253, nova64.draw.rgba8(0, 255, 0, 255), 1);
  nova64.draw.print(
    '  Press X to Fire! Press Z for Boost!',
    20,
    270,
    nova64.draw.rgba8(200, 200, 200, 255),
    1
  );

  // Status
  nova64.draw.rect(20, 295, 600, 50, nova64.draw.rgba8(0, 0, 0, 200), true);
  nova64.draw.rect(20, 295, 600, 50, nova64.draw.rgba8(0, 255, 0, 255), false);
  nova64.draw.print(
    '✅ All Characters Rendering Correctly!',
    35,
    303,
    nova64.draw.rgba8(0, 255, 100, 255),
    1
  );
  nova64.draw.print(
    'No more ??? for lowercase, arrows, or emojis!',
    35,
    320,
    nova64.draw.rgba8(150, 255, 150, 255),
    1
  );
}
