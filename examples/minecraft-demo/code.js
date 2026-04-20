// Minecraft Demo - Ultimate Edition with Biomes, Ores, and Caves
let lastDayTime = -1;

let player = {
  x: 0,
  y: 80,
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
let selectedHotbarIdx = 0;
let saveMessage = '';
let saveMessageTimer = 0;
let texturesEnabled = true;
let mobSpawnTimer = 0;
let frameCount = 0;

const BLOCK_NAMES = {
  1: 'GRASS',
  2: 'DIRT',
  3: 'STONE',
  4: 'SAND',
  5: 'WATER',
  6: 'WOOD',
  7: 'LEAVES',
  8: 'COBBLESTONE',
  9: 'PLANKS',
  11: 'BRICK',
  15: 'COAL ORE',
  16: 'IRON ORE',
  21: 'TORCH',
  22: 'GLOWSTONE',
};
const BLOCK_COLORS = {
  1: 0x55cc33,
  2: 0x996644,
  3: 0xaaaaaa,
  4: 0xffdd88,
  5: 0x2288dd,
  6: 0x774422,
  7: 0x116622,
  8: 0x667788,
  9: 0xddaa55,
  11: 0xcc4433,
  15: 0x444444,
  16: 0xccaa88,
  21: 0xffdd44,
  22: 0xffeeaa,
};
const HOTBAR_BLOCKS = [1, 3, 9, 6, 11, 21, 22, 8, 4];

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

// AI for wandering mobs — simple random walk with idle pauses
function wanderAI(ent, dt) {
  if (!ent.data.nextAction) ent.data.nextAction = 0;
  if (ent.data.walking === undefined) ent.data.walking = false;
  if (!ent.data.moveDir) ent.data.moveDir = Math.random() * Math.PI * 2;

  ent.data.nextAction -= dt;
  if (ent.data.nextAction <= 0) {
    if (Math.random() < 0.4) {
      // Idle
      ent.data.walking = false;
      ent.vx = 0;
      ent.vz = 0;
      ent.data.nextAction = 1.5 + Math.random() * 2;
    } else {
      // Walk in a random direction
      ent.data.walking = true;
      ent.data.moveDir = Math.random() * Math.PI * 2;
      ent.data.nextAction = 1 + Math.random() * 3;
    }
  }

  if (ent.data.walking) {
    const speed = ent.type === 'chicken' ? 1.5 : 2.0;
    ent.vx = Math.sin(ent.data.moveDir) * speed;
    ent.vz = Math.cos(ent.data.moveDir) * speed;

    // Random jump when on ground
    if (ent.onGround && Math.random() < 0.01) {
      ent.vy = 6;
    }
  }

  // Rotate mesh to face movement direction
  if (ent.mesh && (ent.vx !== 0 || ent.vz !== 0)) {
    ent.mesh.rotation.y = Math.atan2(ent.vx, ent.vz);
  }
}

// Spawn a few mobs around a position
function spawnMobs(cx, cz) {
  if (typeof spawnVoxelEntity !== 'function') return;
  if (typeof getVoxelHighestBlock !== 'function') return;

  const MOB_TYPES = [
    { type: 'pig', color: 0xffaaaa, size: [0.8, 0.8, 0.8], health: 10 },
    { type: 'cow', color: 0x886644, size: [1.0, 1.2, 1.0], health: 15 },
    { type: 'chicken', color: 0xffffff, size: [0.5, 0.6, 0.5], health: 5 },
    { type: 'sheep', color: 0xeeeeee, size: [0.8, 0.9, 0.8], health: 10 },
  ];

  for (let i = 0; i < 3; i++) {
    const def = MOB_TYPES[Math.floor(Math.random() * MOB_TYPES.length)];
    const mx = cx + (Math.random() - 0.5) * 30;
    const mz = cz + (Math.random() - 0.5) * 30;
    const my = getVoxelHighestBlock(Math.floor(mx), Math.floor(mz)) + 1;
    if (my < 5) continue;

    spawnVoxelEntity(def.type, [mx, my, mz], {
      color: def.color,
      size: def.size,
      health: def.health,
      gravity: true,
      ai: wanderAI,
    });
  }
}

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

  const tex = engine.createCanvasTexture(canvas, { filter: 'nearest' });

  globalThis.window.VOXEL_MATERIAL = engine.createMaterial('standard', {
    vertexColors: true,
    map: tex,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.0,
  });
}

export function init() {
  createVoxelTexture();
  setCameraPosition(0, 80, 0);

  // Configure world for good performance: smaller render distance = fewer chunks
  if (typeof configureVoxelWorld === 'function') {
    configureVoxelWorld({
      renderDistance: 3, // 49 chunks instead of default 81
      maxMeshRebuildsPerFrame: 3,
      enableLOD: true,
    });
  }

  // Fog end must match render distance (3 chunks × 16 = 48 blocks)
  setFog(0x87ceeb, 25, 50);

  // Enable procedural texture atlas
  if (typeof enableVoxelTextures === 'function') {
    enableVoxelTextures(true);
  }
}

export function update() {
  if (loadState === 0) {
    loadState = 1;
    return;
  } else if (loadState === 1) {
    loadState = 2;
    return;
  } else if (loadState === 2) {
    if (typeof forceLoadVoxelChunks === 'function') {
      forceLoadVoxelChunks(0, 0);
    } else if (typeof updateVoxelWorld === 'function') {
      updateVoxelWorld(0, 0);
    }
    // Use the new getVoxelHighestBlock API
    if (typeof getVoxelHighestBlock === 'function') {
      player.y = getVoxelHighestBlock(Math.floor(player.x), Math.floor(player.z)) + 2;
    } else {
      player.y = 80;
    }
    if (player.y < 5) player.y = 80;
    loadState = 3;
    isLoaded = true;
    // Spawn initial mobs
    spawnMobs(player.x, player.z);
    return;
  }

  if (!isLoaded) return;

  frameCount++;

  // Day/night cycle: ~10 minute full cycle at 60fps (was 3 seconds!)
  time += 0.00028;
  const dayPhase = (Math.sin(time * Math.PI * 2) + 1) * 0.5; // 0=night, 1=day
  const skyR = Math.round(10 + 125 * dayPhase);
  const skyG = Math.round(10 + 196 * dayPhase);
  const skyB = Math.round(20 + 215 * dayPhase);
  // Only update fog when sky color actually changes
  if (frameCount % 30 === 0) {
    setFog((skyR << 16) | (skyG << 8) | skyB, 25, 50);
  }

  // Sync voxel lighting sparingly — setVoxelDayTime marks ALL chunks dirty
  if (typeof setVoxelDayTime === 'function' && frameCount % 60 === 0) {
    const quantized = Math.round((time % 1.0) * 20) / 20; // 20 steps per cycle
    if (quantized !== lastDayTime) {
      lastDayTime = quantized;
      setVoxelDayTime(quantized);
    }
  }

  // Detect current biome (throttled — no need every frame)
  if (typeof getVoxelBiome === 'function' && frameCount % 30 === 0) {
    currentBiome = getVoxelBiome(player.x, player.z);
  }

  handleInput();
  updatePhysics();
  updateCamera();
  handleBlockInteraction();

  // Update chunks every few frames — budget-limited internally but still has overhead
  if (typeof updateVoxelWorld === 'function' && frameCount % 5 === 0) {
    updateVoxelWorld(player.x, player.z);
  }

  // Update entities (physics + AI)
  if (typeof updateVoxelEntities === 'function') {
    updateVoxelEntities(1 / 60, [player.x, player.y, player.z]);
  }

  // Periodically spawn mobs if count is low
  if (typeof getVoxelEntityCount === 'function') {
    mobSpawnTimer++;
    if (mobSpawnTimer > 300 && getVoxelEntityCount() < 12) {
      spawnMobs(player.x, player.z);
      mobSpawnTimer = 0;
    }
    // Cleanup dead entities
    if (mobSpawnTimer % 120 === 0 && typeof cleanupVoxelEntities === 'function') {
      cleanupVoxelEntities();
    }
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
  for (let i = 0; i < HOTBAR_BLOCKS.length && i < 9; i++) {
    if (keyp(`Digit${i + 1}`)) {
      selectedHotbarIdx = i;
      selectedBlock = HOTBAR_BLOCKS[i];
    }
  }

  if (btnp(0)) {
    selectedHotbarIdx = 0;
    selectedBlock = HOTBAR_BLOCKS[0];
  }
  if (btnp(1)) {
    selectedHotbarIdx = 1;
    selectedBlock = HOTBAR_BLOCKS[1];
  }
  if (btnp(2)) {
    selectedHotbarIdx = 2;
    selectedBlock = HOTBAR_BLOCKS[2];
  }
  if (btnp(3)) {
    selectedHotbarIdx = 3;
    selectedBlock = HOTBAR_BLOCKS[3];
  }

  // B key = respawn with new biome (random world + random position)
  if (keyp('KeyB') && typeof resetVoxelWorld === 'function') {
    resetVoxelWorld();
    player.x = (Math.random() - 0.5) * 400;
    player.z = (Math.random() - 0.5) * 400;
    updateVoxelWorld(player.x, player.z);
    if (typeof getVoxelHighestBlock === 'function') {
      player.y = getVoxelHighestBlock(Math.floor(player.x), Math.floor(player.z)) + 2;
    } else {
      player.y = 80;
    }
    if (player.y < 5) player.y = 80;
    player.vy = 0;
    player.onGround = false;
    player.yaw = 0;
    player.pitch = 0;
    spawnMobs(player.x, player.z);
  }

  // P key = save world
  if (keyp('KeyP') && typeof saveVoxelWorld === 'function') {
    saveVoxelWorld('minecraft-demo')
      .then(() => {
        saveMessage = 'World Saved!';
        saveMessageTimer = 120;
      })
      .catch(() => {
        saveMessage = 'Save Failed!';
        saveMessageTimer = 120;
      });
  }

  // L key = load world
  if (keyp('KeyL') && typeof loadVoxelWorld === 'function') {
    loadVoxelWorld('minecraft-demo')
      .then(loaded => {
        if (loaded) {
          saveMessage = 'World Loaded!';
          saveMessageTimer = 120;
          updateVoxelWorld(player.x, player.z);
        } else {
          saveMessage = 'No Save Found';
          saveMessageTimer = 120;
        }
      })
      .catch(() => {
        saveMessage = 'Load Failed!';
        saveMessageTimer = 120;
      });
  }

  // T key = toggle textures
  if (keyp('KeyT') && typeof enableVoxelTextures === 'function') {
    texturesEnabled = !texturesEnabled;
    enableVoxelTextures(texturesEnabled);
    saveMessage = texturesEnabled ? 'Textures ON' : 'Textures OFF';
    saveMessageTimer = 90;
  }
}

function updatePhysics() {
  player.vy -= 0.02;

  // Use the new swept AABB physics if available
  if (typeof moveVoxelEntity === 'function') {
    const result = moveVoxelEntity(
      [player.x, player.y, player.z],
      [player.vx, player.vy, player.vz],
      [0.6, 1.8, 0.6],
      1.0
    );
    player.x = result.position[0];
    player.y = result.position[1];
    player.z = result.position[2];
    player.vx = result.velocity[0];
    player.vy = result.velocity[1];
    player.vz = result.velocity[2];
    player.onGround = result.grounded;

    // Water buoyancy
    if (result.inWater && key('Space')) {
      player.vy = 0.12;
    }
  } else {
    // Legacy fallback
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
  }

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
    const dx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dy = Math.sin(player.pitch);
    const dz = -Math.cos(player.yaw) * Math.cos(player.pitch);

    const result = raycastVoxelBlock([player.x, player.y + 0.8, player.z], [dx, dy, dz], 6);

    if (result && result.hit) {
      if (keyp('KeyF') || keyp('KeyQ')) {
        // Break block
        setVoxelBlock(result.position[0], result.position[1], result.position[2], 0);
      }
      if (keyp('KeyE') || keyp('KeyR')) {
        // Place block on adjacent face
        setVoxelBlock(result.adjacent[0], result.adjacent[1], result.adjacent[2], selectedBlock);
      }
    }
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
    'WASD=Move Space=Jump F=Break E=Place 1-9=Block P=Save L=Load T=Textures',
    20,
    20,
    rgba8(255, 255, 255, 200)
  );

  // Entity count
  if (typeof getVoxelEntityCount === 'function') {
    const ec = getVoxelEntityCount();
    if (ec > 0) print(`Mobs: ${ec}`, 430, 4, rgba8(180, 255, 180));
  }

  // Save/load message
  if (saveMessageTimer > 0) {
    saveMessageTimer--;
    const alpha = Math.min(255, saveMessageTimer * 4);
    const msgX = (640 - saveMessage.length * 8) / 2;
    print(saveMessage, msgX, 160, rgba8(255, 255, 100, alpha));
  }
}
