// MINIMAL 2D OVERLAY TEST - Tests if 2D rendering works AT ALL

const { print, rect, rgba8 } = nova64.draw;
const { createCube } = nova64.scene;
const { setCameraPosition, setCameraTarget } = nova64.camera;

let testTime = 0;

export async function init() {
  console.log('🧪 MINIMAL 2D OVERLAY TEST - Starting...');

  // Just setup a basic 3D scene so we have something
  setCameraPosition(0, 5, 15);
  setCameraTarget(0, 0, 0);

  // Create one cube so we know 3D works
  const cube = createCube(2, 0xff0000, [0, 0, 0]);
  console.log('✅ Created test cube');
}

export function update(dt) {
  testTime += dt;
}

export function draw() {
  // ABSOLUTE SIMPLEST 2D DRAWING - Just a filled rectangle
  console.log('🎨 Drawing 2D overlay...');

  // Try to draw a big red rectangle
  rect(100, 100, 400, 200, rgba8(255, 0, 0, 255), true);

  // Try to draw text
  print('HELLO 2D OVERLAY', 150, 150, rgba8(255, 255, 0, 255), 1);

  console.log('✅ Draw calls completed');
}
