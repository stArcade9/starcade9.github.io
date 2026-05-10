// Voxel Creatures — Entity system showcase with wandering mobs
const { print, rect, rectfill, rgba8 } = nova64.draw;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { setFog } = nova64.light;
const { key, keyp } = nova64.input;
const {
  cleanupVoxelEntities,
  damageVoxelEntity,
  enableVoxelTextures,
  forceLoadVoxelChunks,
  getVoxelEntitiesByType,
  getVoxelEntityCount,
  getVoxelHighestBlock,
  moveVoxelEntity,
  spawnVoxelEntity,
  updateVoxelEntities,
  updateVoxelWorld,
} = nova64.voxel;
let player = { x: 0, y: 80, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, onGround: false };
let loaded = false;
let entityCount = 0;
let selectedMob = 0;
let msg = '';
let msgTimer = 0;

const MOB_DEFS = [
  { type: 'pig', color: 0xffaaaa, size: [0.8, 0.8, 0.8], health: 10 },
  { type: 'cow', color: 0x886644, size: [1.0, 1.2, 1.0], health: 15 },
  { type: 'chicken', color: 0xffffff, size: [0.5, 0.6, 0.5], health: 5 },
  { type: 'sheep', color: 0xeeeeee, size: [0.8, 0.9, 0.8], health: 10 },
  { type: 'zombie', color: 0x44aa44, size: [0.7, 1.6, 0.7], health: 20 },
  { type: 'slime', color: 0x44ff44, size: [0.6, 0.6, 0.6], health: 8 },
];

// Simple wander AI
function wanderAI(ent, dt) {
  if (!ent.data.timer) ent.data.timer = 0;
  if (ent.data.walking === undefined) ent.data.walking = false;
  if (!ent.data.dir) ent.data.dir = Math.random() * Math.PI * 2;

  ent.data.timer -= dt;
  if (ent.data.timer <= 0) {
    ent.data.walking = Math.random() > 0.35;
    ent.data.dir = Math.random() * Math.PI * 2;
    ent.data.timer = 1 + Math.random() * 3;
  }

  if (ent.data.walking) {
    const spd = ent.type === 'slime' ? 1.0 : ent.type === 'chicken' ? 2.0 : 1.5;
    ent.vx = Math.sin(ent.data.dir) * spd;
    ent.vz = Math.cos(ent.data.dir) * spd;
    // Slimes hop
    if (ent.type === 'slime' && ent.onGround && Math.random() < 0.05) ent.vy = 7;
    // Chickens flutter
    if (ent.type === 'chicken' && ent.onGround && Math.random() < 0.03) ent.vy = 5;
  } else {
    ent.vx = 0;
    ent.vz = 0;
  }

  if (ent.mesh && (ent.vx !== 0 || ent.vz !== 0)) {
    ent.mesh.rotation.y = Math.atan2(ent.vx, ent.vz);
  }
}

// Chase AI — follows the player
function chaseAI(ent, dt, ctx) {
  const dx = player.x - ent.x;
  const dz = player.z - ent.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < 30 && dist > 2) {
    const spd = 2.5;
    ent.vx = (dx / dist) * spd;
    ent.vz = (dz / dist) * spd;
    if (ent.onGround && Math.random() < 0.02) ent.vy = 6;
  } else {
    wanderAI(ent, dt);
  }

  if (ent.mesh && (ent.vx !== 0 || ent.vz !== 0)) {
    ent.mesh.rotation.y = Math.atan2(ent.vx, ent.vz);
  }
}

function spawnMob(xOff, zOff) {
  if (typeof spawnVoxelEntity !== 'function') return;
  const def = MOB_DEFS[selectedMob];
  const mx = player.x + xOff;
  const mz = player.z + zOff;
  let my = 70;
  if (typeof getVoxelHighestBlock === 'function') {
    my = nova64.voxel.getVoxelHighestBlock(Math.floor(mx), Math.floor(mz)) + 1;
  }
  if (my < 5) my = 70;

  const ai = def.type === 'zombie' ? chaseAI : wanderAI;
  nova64.voxel.spawnVoxelEntity(def.type, [mx, my, mz], {
    color: def.color,
    size: def.size,
    health: def.health,
    gravity: true,
    ai,
  });
}

export function init() {
  nova64.camera.setCameraPosition(0, 80, 0);
  nova64.light.setFog(0x87ceeb, 30, 100);
  if (typeof enableVoxelTextures === 'function') nova64.voxel.enableVoxelTextures(true);
}

export function update(dt) {
  if (!loaded) {
    if (typeof forceLoadVoxelChunks === 'function') {
      nova64.voxel.forceLoadVoxelChunks(0, 0);
    } else if (typeof updateVoxelWorld === 'function') {
      nova64.voxel.updateVoxelWorld(0, 0);
    }
    if (typeof getVoxelHighestBlock === 'function') {
      player.y = nova64.voxel.getVoxelHighestBlock(0, 0) + 2;
    }
    // Spawn initial creatures
    for (let i = 0; i < 8; i++) {
      selectedMob = i % MOB_DEFS.length;
      spawnMob((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
    }
    selectedMob = 0;
    loaded = true;
    return;
  }

  // Movement
  const cosY = Math.cos(player.yaw);
  const sinY = Math.sin(player.yaw);
  if (nova64.input.key('ArrowLeft')) player.yaw -= 0.04;
  if (nova64.input.key('ArrowRight')) player.yaw += 0.04;
  if (nova64.input.key('ArrowUp') && player.pitch < 1.4) player.pitch += 0.04;
  if (nova64.input.key('ArrowDown') && player.pitch > -1.4) player.pitch -= 0.04;

  let dx = 0,
    dz = 0;
  if (nova64.input.key('KeyW')) {
    dx -= sinY;
    dz -= cosY;
  }
  if (nova64.input.key('KeyS')) {
    dx += sinY;
    dz += cosY;
  }
  if (nova64.input.key('KeyA')) {
    dx -= cosY;
    dz += sinY;
  }
  if (nova64.input.key('KeyD')) {
    dx += cosY;
    dz -= sinY;
  }

  if (dx !== 0 || dz !== 0) {
    const len = Math.sqrt(dx * dx + dz * dz);
    player.vx = (dx / len) * 0.15;
    player.vz = (dz / len) * 0.15;
  } else {
    player.vx = 0;
    player.vz = 0;
  }

  if (nova64.input.key('Space') && player.onGround) {
    player.vy = 0.35;
    player.onGround = false;
  }
  player.vy -= 0.02;

  if (typeof moveVoxelEntity === 'function') {
    const r = nova64.voxel.moveVoxelEntity(
      [player.x, player.y, player.z],
      [player.vx, player.vy, player.vz],
      [0.6, 1.8, 0.6],
      1.0
    );
    player.x = r.position[0];
    player.y = r.position[1];
    player.z = r.position[2];
    player.vy = r.velocity[1];
    player.onGround = r.grounded;
  }

  if (player.y < -10) {
    player.y = 80;
    player.vy = 0;
  }

  // Tab through mob types
  for (let i = 0; i < MOB_DEFS.length; i++) {
    if (nova64.input.keyp(`Digit${i + 1}`)) selectedMob = i;
  }

  // Spawn mob
  if (nova64.input.keyp('KeyE')) {
    spawnMob((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
    showMsg(`Spawned ${MOB_DEFS[selectedMob].type}!`);
  }

  // Spawn a bunch
  if (nova64.input.keyp('KeyR')) {
    for (let i = 0; i < 5; i++) {
      spawnMob((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
    }
    showMsg(`Spawned 5x ${MOB_DEFS[selectedMob].type}!`);
  }

  // Clear all entities
  if (nova64.input.keyp('KeyC') && typeof cleanupVoxelEntities === 'function') {
    // Mark all alive entities as dead first
    if (typeof getVoxelEntitiesByType === 'function') {
      for (const def of MOB_DEFS) {
        const ents = nova64.voxel.getVoxelEntitiesByType(def.type);
        for (const e of ents) {
          if (typeof damageVoxelEntity === 'function') nova64.voxel.damageVoxelEntity(e.id, 9999);
        }
      }
    }
    nova64.voxel.cleanupVoxelEntities();
    showMsg('All creatures cleared!');
  }

  // Camera
  nova64.camera.setCameraPosition(player.x, player.y + 0.8, player.z);
  nova64.camera.setCameraTarget(
    player.x - Math.sin(player.yaw) * Math.cos(player.pitch),
    player.y + 0.8 + Math.sin(player.pitch),
    player.z - Math.cos(player.yaw) * Math.cos(player.pitch)
  );

  // Update entities
  if (typeof updateVoxelEntities === 'function') {
    nova64.voxel.updateVoxelEntities(1 / 60, [player.x, player.y, player.z]);
  }
  if (typeof getVoxelEntityCount === 'function') {
    entityCount = nova64.voxel.getVoxelEntityCount();
  }

  if (typeof updateVoxelWorld === 'function') nova64.voxel.updateVoxelWorld(player.x, player.z);
  if (msgTimer > 0) msgTimer--;
}

function showMsg(text) {
  msg = text;
  msgTimer = 120;
}

export function draw() {
  if (!loaded) {
    nova64.draw.rectfill(0, 0, 640, 360, nova64.draw.rgba8(10, 10, 20));
    nova64.draw.print('LOADING CREATURE WORLD...', 215, 175, 0xffffff);
    return;
  }

  // Top bar
  nova64.draw.rect(0, 0, 640, 18, nova64.draw.rgba8(0, 0, 0, 150), true);
  nova64.draw.print('VOXEL CREATURES', 5, 4, 0xffaa44);
  nova64.draw.print(`Entities: ${entityCount}`, 420, 4, nova64.draw.rgba8(180, 255, 180));
  const pos = `${Math.floor(player.x)}, ${Math.floor(player.y)}, ${Math.floor(player.z)}`;
  nova64.draw.print(pos, 540, 4, nova64.draw.rgba8(200, 200, 200));

  // Crosshair
  nova64.draw.rect(319, 172, 2, 16, nova64.draw.rgba8(255, 255, 255, 180), true);
  nova64.draw.rect(312, 179, 16, 2, nova64.draw.rgba8(255, 255, 255, 180), true);

  // Mob selector
  const selY = 335;
  nova64.draw.rect(10, selY, MOB_DEFS.length * 48 + 10, 24, nova64.draw.rgba8(0, 0, 0, 180), true);
  for (let i = 0; i < MOB_DEFS.length; i++) {
    const bx = 15 + i * 48;
    if (i === selectedMob) {
      nova64.draw.rect(bx - 1, selY - 1, 46, 26, nova64.draw.rgba8(255, 255, 100), false);
    }
    nova64.draw.rect(bx + 2, selY + 2, 16, 18, MOB_DEFS[i].color, true);
    nova64.draw.print(`${i + 1}`, bx + 22, selY + 6, 0xffffff);
  }
  nova64.draw.print(MOB_DEFS[selectedMob].type.toUpperCase(), 15, selY - 14, 0xffdd88);

  // Controls
  nova64.draw.print(
    'WASD=Move  E=Spawn  R=Spawn5  C=Clear  1-6=Select Mob',
    10,
    20,
    nova64.draw.rgba8(255, 255, 255, 160)
  );

  // Message
  if (msgTimer > 0) {
    const alpha = Math.min(255, msgTimer * 4);
    nova64.draw.print(
      msg,
      (640 - msg.length * 8) / 2,
      160,
      nova64.draw.rgba8(255, 255, 100, alpha)
    );
  }
}
