// ABSOLUTE MINIMUM TEST - Does 2D work at all?

export async function init() {
  console.log('⚡ ULTRA SIMPLE TEST');
}

export function update(dt) {
  // Nothing
}

export function draw() {
  // Draw ONE red rectangle - simplest possible test
  console.log('🎨 Attempting to draw red rectangle...');
  rect(50, 50, 200, 100, rgba8(255, 0, 0, 255), true);
  console.log('✅ rect() called successfully');
  
  // Draw text
  console.log('🎨 Attempting to draw text...');
  print('TEST TEXT', 100, 100, rgba8(255, 255, 0, 255), 1);
  console.log('✅ print() called successfully');
}
