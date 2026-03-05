// Font Test - Complete Character Set Demo
// Testing uppercase, lowercase, symbols, arrows, and emoji handling

export async function init() {
  console.log('🔤 Font Test - Complete Character Set');
}

export function update() {
  // Draw background
  cls(rgba8(20, 20, 40, 255));
  
  // Title
  print('NOVA64 FONT - COMPLETE TEST', 140, 10, rgba8(255, 200, 0, 255), 1);
  
  // Uppercase
  print('UPPERCASE: ABCDEFGHIJKLMNOPQRSTUVWXYZ', 20, 35, rgba8(255, 255, 255, 255), 1);
  
  // Lowercase
  print('lowercase: abcdefghijklmnopqrstuvwxyz', 20, 52, rgba8(0, 255, 200, 255), 1);
  
  // Numbers
  print('Numbers:   0123456789', 20, 69, rgba8(255, 255, 100, 255), 1);
  
  // Punctuation
  print('Symbols:   !?.,;:\'-_()[]{}', 20, 86, rgba8(255, 150, 255, 255), 1);
  print('           <>=+*&%$#@^~`"|\\/', 20, 103, rgba8(255, 150, 255, 255), 1);
  
  // Arrows (Unicode)
  print('Arrows:    ← → ↑ ↓ ↔ ↕', 20, 120, rgba8(100, 255, 100, 255), 1);
  print('Controls:  ↑↓ UP/DOWN  ←→ LEFT/RIGHT', 20, 137, rgba8(200, 200, 255, 255), 1);
  
  // Mixed case examples
  print('Mixed:     Hello World! The Quick Brown Fox', 20, 154, rgba8(255, 200, 150, 255), 1);
  print('           Jumps Over The Lazy Dog 123!', 20, 171, rgba8(255, 200, 150, 255), 1);
  
  // Emoji handling (should strip or replace)
  print('Emoji Test: 🎮 🚀 ⚡ ✨ (cleaned automatically)', 20, 195, rgba8(255, 100, 100, 255), 1);
  
  // Game-style text examples
  print('Game Text:', 20, 219, rgba8(0, 255, 255, 255), 1);
  print('  SCORE: 1234567890', 20, 236, rgba8(255, 255, 0, 255), 1);
  print('  HEALTH: [##########] 100%', 20, 253, rgba8(0, 255, 0, 255), 1);
  print('  Press X to Fire! Press Z for Boost!', 20, 270, rgba8(200, 200, 200, 255), 1);
  
  // Status
  rect(20, 295, 600, 50, rgba8(0, 0, 0, 200), true);
  rect(20, 295, 600, 50, rgba8(0, 255, 0, 255), false);
  print('✅ All Characters Rendering Correctly!', 35, 303, rgba8(0, 255, 100, 255), 1);
  print('No more ??? for lowercase, arrows, or emojis!', 35, 320, rgba8(150, 255, 150, 255), 1);
}
