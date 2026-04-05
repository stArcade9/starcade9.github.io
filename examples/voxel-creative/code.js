// Voxel Creative — Free-building sandbox with block palette and fly mode
let player = { x: 8, y: 70, z: 8, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: -0.3, onGround: false };
let selectedBlock = 1;
let selectedIdx = 0;
let loaded = false;
let msg = '';
let msgTimer = 0;

// Building palette
const PALETTE = [
  { id: 1, name: 'GRASS', color: 0x55cc33 },
  { id: 3, name: 'STONE', color: 0xaaaaaa },
  { id: 9, name: 'PLANKS', color: 0xddaa55 },
  { id: 6, name: 'WOOD', color: 0x774422 },
  { id: 11, name: 'BRICK', color: 0xcc4433 },
  { id: 8, name: 'COBBLE', color: 0x667788 },
  { id: 4, name: 'SAND', color: 0xffdd88 },
  { id: 22, name: 'GLOW', color: 0xffeeaa },
  { id: 21, name: 'TORCH', color: 0xffdd44 },
];

export function init() {
  setCameraPosition(8, 70, 8);
  setFog(0x87ceeb, 40, 120);
  if (typeof enableVoxelTextures === 'function') enableVoxelTextures(true);
  if (typeof configureVoxelWorld === 'function') {
    configureVoxelWorld({ renderDistance: 4, seed: 42 });
  }
}

export function update(dt) {
  if (!loaded) {
    if (typeof forceLoadVoxelChunks === 'function') {
      forceLoadVoxelChunks(player.x, player.z);
    } else if (typeof updateVoxelWorld === 'function') {
      updateVoxelWorld(player.x, player.z);
    }
    if (typeof getVoxelHighestBlock === 'function') {
      player.y = getVoxelHighestBlock(Math.floor(player.x), Math.floor(player.z)) + 3;
    }
    loaded = true;
    showMsg('Welcome! Fly around and build freely.');
    return;
  }

  // Movement (fly mode)
  const cosY = Math.cos(player.yaw);
  const sinY = Math.sin(player.yaw);
  if (key('ArrowLeft')) player.yaw -= 0.04;
  if (key('ArrowRight')) player.yaw += 0.04;
  if (key('ArrowUp') && player.pitch < 1.4) player.pitch += 0.04;
  if (key('ArrowDown') && player.pitch > -1.4) player.pitch -= 0.04;

  let dx = 0,
    dz = 0,
    dy = 0;
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
  if (key('Space')) dy += 1;
  if (key('ShiftLeft')) dy -= 1;

  const speed = 0.2;
  if (dx !== 0 || dz !== 0) {
    const len = Math.sqrt(dx * dx + dz * dz);
    player.x += (dx / len) * speed;
    player.z += (dz / len) * speed;
  }
  player.y += dy * speed;

  // Block selection
  for (let i = 0; i < PALETTE.length && i < 9; i++) {
    if (keyp(`Digit${i + 1}`)) {
      selectedIdx = i;
      selectedBlock = PALETTE[i].id;
    }
  }

  // Place / break
  if (typeof raycastVoxelBlock === 'function') {
    const rdx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const rdy = Math.sin(player.pitch);
    const rdz = -Math.cos(player.yaw) * Math.cos(player.pitch);
    const hit = raycastVoxelBlock([player.x, player.y + 0.8, player.z], [rdx, rdy, rdz], 8);

    if (hit && hit.hit) {
      if (keyp('KeyF') || keyp('KeyQ')) {
        setVoxelBlock(hit.position[0], hit.position[1], hit.position[2], 0);
      }
      if (keyp('KeyE') || keyp('KeyR')) {
        setVoxelBlock(hit.adjacent[0], hit.adjacent[1], hit.adjacent[2], selectedBlock);
      }
    }
  }

  // Flat platform helper — place a layer of blocks
  if (keyp('KeyP')) {
    const bx = Math.floor(player.x);
    const by = Math.floor(player.y) - 2;
    const bz = Math.floor(player.z);
    for (let ox = -3; ox <= 3; ox++) {
      for (let oz = -3; oz <= 3; oz++) {
        setVoxelBlock(bx + ox, by, bz + oz, selectedBlock);
      }
    }
    showMsg('Platform placed!');
  }

  // Camera
  setCameraPosition(player.x, player.y + 0.8, player.z);
  setCameraTarget(
    player.x - Math.sin(player.yaw) * Math.cos(player.pitch),
    player.y + 0.8 + Math.sin(player.pitch),
    player.z - Math.cos(player.yaw) * Math.cos(player.pitch)
  );

  if (typeof updateVoxelWorld === 'function') updateVoxelWorld(player.x, player.z);
  if (msgTimer > 0) msgTimer--;
}

function showMsg(text) {
  msg = text;
  msgTimer = 180;
}

export function draw() {
  if (!loaded) {
    rectfill(0, 0, 640, 360, rgba8(10, 10, 30));
    print('LOADING CREATIVE WORLD...', 220, 175, 0xffffff);
    return;
  }

  // Top bar
  rect(0, 0, 640, 18, rgba8(0, 0, 0, 150), true);
  print('VOXEL CREATIVE', 5, 4, 0x88ddff);
  const pos = `${Math.floor(player.x)}, ${Math.floor(player.y)}, ${Math.floor(player.z)}`;
  print(pos, 540, 4, rgba8(200, 200, 200));

  // Crosshair
  rect(319, 172, 2, 16, rgba8(255, 255, 255, 200), true);
  rect(312, 179, 16, 2, rgba8(255, 255, 255, 200), true);

  // Hotbar
  const hbY = 335;
  const hbW = PALETTE.length * 32 + 8;
  const hbX = (640 - hbW) / 2;
  rect(hbX, hbY, hbW, 24, rgba8(0, 0, 0, 180), true);
  for (let i = 0; i < PALETTE.length; i++) {
    const bx = hbX + 4 + i * 32;
    if (i === selectedIdx) {
      rect(bx - 1, hbY - 1, 30, 26, rgba8(255, 255, 100), false);
    }
    rect(bx + 2, hbY + 2, 24, 18, PALETTE[i].color, true);
    print(`${i + 1}`, bx + 10, hbY + 5, rgba8(255, 255, 255, 220));
  }
  // Block name
  print(
    PALETTE[selectedIdx].name,
    (640 - PALETTE[selectedIdx].name.length * 8) / 2,
    hbY - 14,
    0xffffff
  );

  // Controls
  print(
    'WASD=Move  Space/Shift=Up/Down  F=Break  E=Place  P=Platform  1-9=Block',
    20,
    20,
    rgba8(255, 255, 255, 160)
  );

  // Message
  if (msgTimer > 0) {
    const alpha = Math.min(255, msgTimer * 4);
    print(msg, (640 - msg.length * 8) / 2, 160, rgba8(255, 255, 100, alpha));
  }
}
