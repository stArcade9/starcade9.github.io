// Minecraft Demo - Ultimate Edition with Biomes
let player = {
  x: 0,
  y: 30,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  speed: 0.15,
  jump: 0.35,
  size: 0.6,
  onGround: false,
  yaw: 0,
  pitch: 0,
};

let selectedBlock = 1; // 1 = Grass
let time = 0;
let loadState = 0;
let isLoaded = false;
let loadProgress = 0;
let currentBiome = 'Plains';

const BLOCK_NAMES = {
  1: 'GRASS',
  2: 'DIRT',
  3: 'STONE',
  4: 'SAND',
  5: 'WATER',
  6: 'WOOD',
  7: 'LEAVES',
  8: 'PLANKS',
};
const BLOCK_COLORS = {
  1: 0x55cc33,
  2: 0x886644,
  3: 0x888888,
  4: 0xddcc88,
  5: 0x3388ff,
  6: 0x664422,
  7: 0x228833,
  8: 0xccaa66,
};
const HOTBAR_BLOCKS = [1, 2, 3, 8, 6, 4];

// Biome detection (mirrors runtime terrain gen noise)
function detectBiome(px, pz) {
  // Use same perlinNoise-based logic as runtime generateChunkTerrain
  // We approximate using sin-based hash since we don't have perlinNoise exposed
  const tx = px * 0.5,
    tz = pz * 0.5;
  const temperature =
    Math.sin(tx * 0.01 * 3.7 + tz * 0.01 * 2.3) * 0.3 +
    Math.sin(tx * 0.01 * 7.1 + tz * 0.01 * 5.9) * 0.15 +
    0.5;
  const mx = px * 0.3 + 1000,
    mz = pz * 0.3 + 1000;
  const moisture =
    Math.sin(mx * 0.01 * 3.7 + mz * 0.01 * 2.3) * 0.3 +
    Math.sin(mx * 0.01 * 7.1 + mz * 0.01 * 5.9) * 0.15 +
    0.5;

  if (temperature < 0.2) return 'Frozen Tundra';
  if (temperature < 0.35 && moisture > 0.5) return 'Taiga';
  if (temperature > 0.7 && moisture < 0.25) return 'Desert';
  if (temperature > 0.6 && moisture > 0.6) return 'Jungle';
  if (moisture < 0.3) return 'Savanna';
  if (temperature > 0.4 && moisture > 0.4) return 'Forest';
  if (temperature < 0.35) return 'Snowy Hills';
  return 'Plains';
}

const BIOME_COLORS = {
  'Frozen Tundra': rgba8(200, 220, 255),
  Taiga: rgba8(100, 180, 140),
  Desert: rgba8(255, 220, 130),
  Jungle: rgba8(80, 220, 80),
  Savanna: rgba8(220, 180, 100),
  Forest: rgba8(100, 200, 100),
  'Snowy Hills': rgba8(220, 230, 255),
  Plains: rgba8(150, 220, 150),
};

function createVoxelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      let noise = Math.random() * 60 - 30;
      let isBorder = x % 16 === 0 || y % 16 === 0 ? -20 : 0;
      let val = 180 + noise + isBorder;
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new globalThis.THREE.CanvasTexture(canvas);
  tex.magFilter = globalThis.THREE.NearestFilter;
  tex.minFilter = globalThis.THREE.NearestFilter;

  globalThis.window.VOXEL_MATERIAL = new globalThis.THREE.MeshStandardMaterial({
    vertexColors: true,
    map: tex,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.0,
  });
}

function getHighestBlockAlt(hx, hz) {
  for (let i = 60; i > 0; i--) {
    if (getVoxelBlock(hx, i, hz) !== 0) return i;
  }
  return 30;
}

export function init() {
  createVoxelTexture();
  setCameraPosition(0, 30, 0);
  setFog(0x87ceeb, 10, 60);

  // We don't block here, we let the update/draw loop handle state
}

export function update() {
  if (loadState === 0) {
    loadState = 1;
    return;
  } else if (loadState === 1) {
    // Wait a few frames for the canvas to present the loading text
    loadState = 2;
    return;
  } else if (loadState === 2) {
    if (typeof updateVoxelWorld === 'function') {
      updateVoxelWorld(0, 0); // Gen initial chunks
    }
    player.y = getHighestBlockAlt(Math.floor(player.x), Math.floor(player.z)) + 2;
    if (player.y < 5) player.y = 40; // Fallback
    loadState = 3;
    isLoaded = true;
    return;
  }

  if (!isLoaded) return;

  time += 0.005;
  let skyR = Math.sin(time) > 0 ? 135 : 10;
  let skyG = Math.sin(time) > 0 ? 206 : 10;
  let skyB = Math.sin(time) > 0 ? 235 : 20;
  setFog((skyR << 16) | (skyG << 8) | skyB, 20, 80);

  // Detect current biome
  currentBiome = detectBiome(player.x, player.z);

  handleInput();
  updatePhysics();
  updateCamera();
  handleBlockInteraction();

  if (typeof updateVoxelWorld === 'function') {
    updateVoxelWorld(player.x, player.z);
  }
}

function handleInput() {
  if (key('ArrowLeft')) player.yaw -= 0.05;
  if (key('ArrowRight')) player.yaw += 0.05;
  if (key('ArrowUp') && player.pitch < Math.PI / 2) player.pitch += 0.05;
  if (key('ArrowDown') && player.pitch > -Math.PI / 2) player.pitch -= 0.05;

  let dx = 0,
    dz = 0;
  const cosY = Math.cos(player.yaw);
  const sinY = Math.sin(player.yaw);

  if (key('KeyW')) {
    dx -= sinY;
    dz -= cosY;
  }
  if (key('KeyS')) {
    dx += sinY;
    dz += cosY;
  }
  if (key('KeyA')) {
    dx -= cosY;
    dz += sinY;
  }
  if (key('KeyD')) {
    dx += cosY;
    dz -= sinY;
  }

  if (dx !== 0 || dz !== 0) {
    const len = Math.sqrt(dx * dx + dz * dz);
    player.vx = (dx / len) * player.speed;
    player.vz = (dz / len) * player.speed;
  } else {
    player.vx = 0;
    player.vz = 0;
  }

  if (key('Space') && player.onGround) {
    player.vy = player.jump;
    player.onGround = false;
  }

  // Number keys for block selection
  if (keyp('Digit1')) selectedBlock = HOTBAR_BLOCKS[0];
  if (keyp('Digit2')) selectedBlock = HOTBAR_BLOCKS[1];
  if (keyp('Digit3')) selectedBlock = HOTBAR_BLOCKS[2];
  if (keyp('Digit4')) selectedBlock = HOTBAR_BLOCKS[3];
  if (keyp('Digit5')) selectedBlock = HOTBAR_BLOCKS[4];
  if (keyp('Digit6')) selectedBlock = HOTBAR_BLOCKS[5];

  if (btnp(0)) selectedBlock = 1; // Grass
  if (btnp(1)) selectedBlock = 2; // Dirt
  if (btnp(2)) selectedBlock = 3; // Stone
  if (btnp(3)) selectedBlock = 8; // Planks

  // B key = respawn with new biome (random world + random position)
  if (keyp('KeyB') && typeof resetVoxelWorld === 'function') {
    resetVoxelWorld();
    // Scatter to a random position so we land in a different biome
    player.x = (Math.random() - 0.5) * 400;
    player.z = (Math.random() - 0.5) * 400;
    updateVoxelWorld(player.x, player.z);
    player.y = getHighestBlockAlt(Math.floor(player.x), Math.floor(player.z)) + 2;
    if (player.y < 5) player.y = 40;
    player.vy = 0;
    player.onGround = false;
    player.yaw = 0;
    player.pitch = 0;
  }
}

function updatePhysics() {
  player.vy -= 0.02;

  let nx = player.x + player.vx;
  let ny = player.y + player.vy;
  let nz = player.z + player.vz;

  player.onGround = false;

  if (
    checkCollision(player.x, ny - player.size, player.z) ||
    checkCollision(player.x, ny + 0.2, player.z)
  ) {
    if (player.vy < 0) player.onGround = true;
    player.vy = 0;
    ny = player.y;
  }
  if (
    checkCollision(
      nx + (player.vx > 0 ? player.size : -player.size),
      player.y - player.size + 0.1,
      player.z
    )
  ) {
    player.vx = 0;
    nx = player.x;
  }
  if (
    checkCollision(
      player.x,
      player.y - player.size + 0.1,
      nz + (player.vz > 0 ? player.size : -player.size)
    )
  ) {
    player.vz = 0;
    nz = player.z;
  }

  player.x = nx;
  player.y = ny;
  player.z = nz;

  // Antifall fallback
  if (player.y < -10) {
    player.y = 40;
    player.vy = 0;
  }
}

function checkCollision(x, y, z) {
  if (typeof checkVoxelCollision === 'function') {
    return checkVoxelCollision([x, y, z], player.size);
  }
  const block = getVoxelBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  return block !== 0 && block !== undefined;
}

function updateCamera() {
  setCameraPosition(player.x, player.y + 0.8, player.z);
  const targetX = player.x - Math.sin(player.yaw) * Math.cos(player.pitch);
  const targetY = player.y + 0.8 + Math.sin(player.pitch);
  const targetZ = player.z - Math.cos(player.yaw) * Math.cos(player.pitch);
  setCameraTarget(targetX, targetY, targetZ);
}

function handleBlockInteraction() {
  if (typeof raycastVoxelBlock === 'function') {
    const targetX = player.x - Math.sin(player.yaw) * Math.cos(player.pitch);
    const targetY = player.y + 0.8 + Math.sin(player.pitch);
    const targetZ = player.z - Math.cos(player.yaw) * Math.cos(player.pitch);

    const dx = targetX - player.x;
    const dy = targetY - (player.y + 0.8);
    const dz = targetZ - player.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const rayStr = raycastVoxelBlock(
      player.x,
      player.y + 0.8,
      player.z,
      dx / len,
      dy / len,
      dz / len,
      5
    );
    if (rayStr) {
      if (btnp(4)) {
        setVoxelBlock(rayStr.hit.x, rayStr.hit.y, rayStr.hit.z, 0); // break
      }
      if (btnp(5)) {
        setVoxelBlock(rayStr.prev.x, rayStr.prev.y, rayStr.prev.z, selectedBlock); // place
      }
    }
    return;
  }
}

export function draw() {
  if (!isLoaded) {
    rectfill(0, 0, 640, 360, rgba8(10, 10, 20, 255));
    print('NOVA64 MINECRAFT EDITION', 20, 40, rgba8(255, 255, 255, 255));
    print('GENERATING WORLD...', 20, 60, rgba8(255, 255, 255, 255));
    return;
  }

  // Title bar
  rect(0, 0, 640, 16, rgba8(0, 0, 0, 150), true);
  print('MINECRAFT ULTIMATE 64', 5, 4, 0xffdd88);
  const pos = `${Math.floor(player.x)}, ${Math.floor(player.y)}, ${Math.floor(player.z)}`;
  print(pos, 560, 4, rgba8(200, 200, 200, 200));

  // Biome indicator
  const biomeCol = BIOME_COLORS[currentBiome] || rgba8(200, 200, 200);
  print(currentBiome, 220, 4, biomeCol);

  // Crosshair
  const cx = 320,
    cy = 180;
  rect(cx - 1, cy - 8, 2, 16, rgba8(255, 255, 255, 200), true);
  rect(cx - 8, cy - 1, 16, 2, rgba8(255, 255, 255, 200), true);

  // Hotbar
  const hbY = 340;
  const hbW = HOTBAR_BLOCKS.length * 32 + 8;
  const hbX = (640 - hbW) / 2;
  rect(hbX, hbY, hbW, 20, rgba8(0, 0, 0, 180), true);
  rect(hbX, hbY, hbW, 20, rgba8(100, 100, 100, 150), false);
  for (let i = 0; i < HOTBAR_BLOCKS.length; i++) {
    const bx = hbX + 4 + i * 32;
    const bid = HOTBAR_BLOCKS[i];
    const col = BLOCK_COLORS[bid] || 0xffffff;
    if (bid === selectedBlock) {
      rect(bx - 1, hbY - 1, 30, 22, rgba8(255, 255, 255, 255), false);
    }
    rect(bx + 2, hbY + 2, 24, 16, col, true);
    print(`${i + 1}`, bx + 10, hbY + 4, rgba8(255, 255, 255, 220));
  }
  // Block name below hotbar
  const bname = BLOCK_NAMES[selectedBlock] || 'UNKNOWN';
  print(bname, (640 - bname.length * 8) / 2, hbY - 14, rgba8(255, 255, 255, 200));

  // Controls hint
  print(
    'WASD=Move  Space=Jump  Arrows=Look  L/R Click=Break/Place  1-6=Block  B=New Biome',
    30,
    20,
    rgba8(255, 255, 255, 200)
  );
}
