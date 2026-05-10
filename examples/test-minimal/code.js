// ABSOLUTE MINIMUM TEST - Does 2D work at all?

const { print, rect, rgba8 } = nova64.draw;

export async function init() {
  console.log('⚡ ULTRA SIMPLE TEST');
}

export function update(dt) {
  // Nothing
}

export function draw() {
  // Draw ONE red rectangle - simplest possible test
  console.log('🎨 Attempting to draw red rectangle...');
  nova64.draw.rect(50, 50, 200, 100, nova64.draw.rgba8(255, 0, 0, 255), true);
  console.log('✅ nova64.draw.rect() called successfully');

  // Draw text
  console.log('🎨 Attempting to draw text...');
  nova64.draw.print('TEST TEXT', 100, 100, nova64.draw.rgba8(255, 255, 0, 255), 1);
  console.log('✅ nova64.draw.print() called successfully');
}
