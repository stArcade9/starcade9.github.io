// GAME OF LIFE 3D — Conway's Game of Life rendered with 3D cubes
// A mesmerizing cellular automata with multiple rulesets and patterns
// Uses the Nova64 3D engine for a stunning visual twist on classic CA

const GRID_W = 40;
const GRID_H = 30;
const CELL_SIZE = 0.9;

let grid = [];
let nextGrid = [];
let meshGrid = []; // 3D cube mesh IDs
let generation = 0;
let tickTimer = 0;
let tickSpeed = 0.12; // seconds per generation
let paused = false;
let gameState = 'start';
let time = 0;
let ruleset = 0;
const RULESETS = [
  { name: 'CONWAY (B3/S23)', birth: [3], survive: [2, 3] },
  { name: 'HIGH LIFE (B36/S23)', birth: [3, 6], survive: [2, 3] },
  { name: 'DAY & NIGHT (B3678/S34678)', birth: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8] },
  { name: 'SEEDS (B2/S)', birth: [2], survive: [] },
  { name: 'DIAMOEBA (B35678/S5678)', birth: [3, 5, 6, 7, 8], survive: [5, 6, 7, 8] },
];
let cameraAngle = 0;
let cameraHeight = 25;
let cameraDistance = 35;
let pattern = 0;

function createGrid() {
  const g = [];
  for (let y = 0; y < GRID_H; y++) {
    g[y] = [];
    for (let x = 0; x < GRID_W; x++) {
      g[y][x] = 0;
    }
  }
  return g;
}

function clearMeshes() {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (meshGrid[y] && meshGrid[y][x]) {
        destroyMesh(meshGrid[y][x]);
        meshGrid[y][x] = null;
      }
    }
  }
}

function randomize(density = 0.3) {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      grid[y][x] = Math.random() < density ? 1 : 0;
    }
  }
  generation = 0;
}

function placeGlider(gx, gy) {
  const shape = [
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1],
  ];
  for (let dy = 0; dy < 3; dy++)
    for (let dx = 0; dx < 3; dx++)
      if (shape[dy][dx]) grid[(gy + dy) % GRID_H][(gx + dx) % GRID_W] = 1;
}

function placeRPentomino(gx, gy) {
  const shape = [
    [0, 1, 1],
    [1, 1, 0],
    [0, 1, 0],
  ];
  for (let dy = 0; dy < 3; dy++)
    for (let dx = 0; dx < 3; dx++)
      if (shape[dy][dx]) grid[(gy + dy) % GRID_H][(gx + dx) % GRID_W] = 1;
}

function placePulsar(gx, gy) {
  const offsets = [
    [2, 0],
    [3, 0],
    [4, 0],
    [8, 0],
    [9, 0],
    [10, 0],
    [0, 2],
    [5, 2],
    [7, 2],
    [12, 2],
    [0, 3],
    [5, 3],
    [7, 3],
    [12, 3],
    [0, 4],
    [5, 4],
    [7, 4],
    [12, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [8, 5],
    [9, 5],
    [10, 5],
    [2, 7],
    [3, 7],
    [4, 7],
    [8, 7],
    [9, 7],
    [10, 7],
    [0, 8],
    [5, 8],
    [7, 8],
    [12, 8],
    [0, 9],
    [5, 9],
    [7, 9],
    [12, 9],
    [0, 10],
    [5, 10],
    [7, 10],
    [12, 10],
    [2, 12],
    [3, 12],
    [4, 12],
    [8, 12],
    [9, 12],
    [10, 12],
  ];
  for (const [dx, dy] of offsets) grid[(gy + dy) % GRID_H][(gx + dx) % GRID_W] = 1;
}

function loadPattern(idx) {
  grid = createGrid();
  clearMeshes();
  meshGrid = [];
  for (let y = 0; y < GRID_H; y++) meshGrid[y] = new Array(GRID_W).fill(null);

  if (idx === 0) {
    // Random soup
    randomize(0.35);
  } else if (idx === 1) {
    // Glider fleet
    for (let i = 0; i < 8; i++) {
      placeGlider((i * 5) % GRID_W, (i * 4) % GRID_H);
    }
  } else if (idx === 2) {
    // R-pentomino explosion
    placeRPentomino(GRID_W / 2 - 1, GRID_H / 2 - 1);
  } else if (idx === 3) {
    // Pulsar
    placePulsar(GRID_W / 2 - 6, GRID_H / 2 - 6);
  }
  generation = 0;
}

function countNeighbors(x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + GRID_W) % GRID_W;
      const ny = (y + dy + GRID_H) % GRID_H;
      count += grid[ny][nx];
    }
  }
  return count;
}

function step() {
  const rules = RULESETS[ruleset];
  nextGrid = createGrid();
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const n = countNeighbors(x, y);
      if (grid[y][x]) {
        nextGrid[y][x] = rules.survive.includes(n) ? 1 : 0;
      } else {
        nextGrid[y][x] = rules.birth.includes(n) ? 1 : 0;
      }
    }
  }
  grid = nextGrid;
  generation++;
}

export function init() {
  grid = createGrid();
  nextGrid = createGrid();
  meshGrid = [];
  for (let y = 0; y < GRID_H; y++) meshGrid[y] = new Array(GRID_W).fill(null);

  setAmbientLight(0xffffff, 0.3);
  setLightDirection(-1, -2, -1);
  setFog(0x050510, 30, 80);
  enableBloom(1.0, 0.4, 0.3);

  loadPattern(0);
  gameState = 'start';
  time = 0;
}

export function update(dt) {
  time += dt;

  if (gameState === 'start') {
    if (keyp('Space') || keyp('Enter')) {
      gameState = 'running';
    }
    // Still animate camera on start
    cameraAngle += dt * 0.2;
    updateCamera();
    return;
  }

  // Controls
  if (keyp('Space')) paused = !paused;
  if (keyp('ArrowRight')) {
    ruleset = (ruleset + 1) % RULESETS.length;
    loadPattern(pattern);
  }
  if (keyp('ArrowLeft')) {
    ruleset = (ruleset - 1 + RULESETS.length) % RULESETS.length;
    loadPattern(pattern);
  }
  if (keyp('ArrowUp')) {
    pattern = (pattern + 1) % 4;
    loadPattern(pattern);
  }
  if (keyp('ArrowDown')) {
    tickSpeed = tickSpeed === 0.12 ? 0.04 : tickSpeed === 0.04 ? 0.25 : 0.12;
  }
  if (keyp('KeyR')) loadPattern(pattern);

  // Simulation tick
  if (!paused) {
    tickTimer += dt;
    if (tickTimer >= tickSpeed) {
      tickTimer = 0;
      step();
    }
  }

  // Camera orbit
  cameraAngle += dt * 0.15;
  updateCamera();

  // Sync 3D cubes with grid
  syncMeshes();
}

function updateCamera() {
  const cx = GRID_W * CELL_SIZE * 0.5;
  const cz = GRID_H * CELL_SIZE * 0.5;
  const camX = cx + Math.cos(cameraAngle) * cameraDistance;
  const camZ = cz + Math.sin(cameraAngle) * cameraDistance;
  setCameraPosition(camX, cameraHeight, camZ);
  setCameraTarget(cx, 0, cz);
}

function syncMeshes() {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const alive = grid[y][x];
      const hasMesh = meshGrid[y][x] != null;

      if (alive && !hasMesh) {
        // Birth — create a cube
        const hue = ((x + y) * 7 + generation * 2) % 360;
        const col = hsb(hue, 80, 90);
        const px = x * CELL_SIZE;
        const pz = y * CELL_SIZE;
        const height = 0.5 + Math.sin(generation * 0.3 + x * 0.2 + y * 0.2) * 0.3;
        meshGrid[y][x] = createCube(CELL_SIZE * 0.85, col, [px, height, pz]);
        setScale(meshGrid[y][x], 1, 0.5 + height, 1);
      } else if (!alive && hasMesh) {
        // Death — remove the cube
        destroyMesh(meshGrid[y][x]);
        meshGrid[y][x] = null;
      } else if (alive && hasMesh) {
        // Alive — animate height and color
        const hue = ((x + y) * 7 + generation * 2) % 360;
        const height = 0.5 + Math.sin(generation * 0.3 + x * 0.2 + y * 0.2) * 0.3;
        const px = x * CELL_SIZE;
        const pz = y * CELL_SIZE;
        setPosition(meshGrid[y][x], px, height, pz);
        setScale(meshGrid[y][x], 1, 0.5 + height, 1);
      }
    }
  }
}

function countAlive() {
  let c = 0;
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) c += grid[y][x];
  return c;
}

export function draw() {
  if (gameState === 'start') {
    // Dark overlay
    rect(0, 0, 640, 360, rgba8(0, 0, 20, 180), true);
    printCentered('GAME OF LIFE 3D', 320, 80, rgba8(100, 200, 255));
    printCentered("Conway's Cellular Automata in Three Dimensions", 320, 110, rgba8(150, 150, 200));
    const pulse = Math.sin(time * 3) * 0.5 + 0.5;
    printCentered('PRESS SPACE TO BEGIN', 320, 180, rgba8(255, 255, 100, 100 + pulse * 155));
    printCentered(
      'LEFT/RIGHT = Ruleset  |  UP = Pattern  |  R = Reset',
      320,
      240,
      rgba8(120, 120, 160)
    );
    printCentered('DOWN = Speed  |  SPACE = Pause', 320, 260, rgba8(120, 120, 160));
    return;
  }

  // Minimal HUD over 3D scene
  rect(0, 0, 640, 20, rgba8(0, 0, 0, 120), true);
  const alive = countAlive();
  const speedLabel = tickSpeed <= 0.04 ? 'FAST' : tickSpeed >= 0.25 ? 'SLOW' : 'MED';
  print(
    `${RULESETS[ruleset].name}  |  GEN: ${generation}  |  ALIVE: ${alive}  |  SPEED: ${speedLabel}${paused ? '  [PAUSED]' : ''}`,
    10,
    6,
    rgba8(180, 220, 255)
  );
  print(
    'LEFT/RIGHT=Rules UP=Pattern DOWN=Speed R=Reset SPACE=Pause',
    10,
    348,
    rgba8(100, 100, 130, 180)
  );
}
