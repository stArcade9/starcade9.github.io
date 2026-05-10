// Voxel Terrain Explorer — Showcases biomes, day/night, textures, and lighting
const { print, rect, rectfill, rgba8 } = nova64.draw;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { setFog } = nova64.light;
const { key, keyp } = nova64.input;
const {
  configureVoxelWorld,
  enableVoxelTextures,
  getVoxelBiome,
  getVoxelHighestBlock,
  getVoxelLightLevel,
  moveVoxelEntity,
  setVoxelDayTime,
  updateVoxelWorld,
} = nova64.voxel;
const { color } = nova64.util;

let lastDayTime = -1;
let player = { x: 0, y: 80, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, onGround: false };
let time = 0.25; // Start at sunrise
let loadFrame = 0;
let loaded = false;
let biome = 'Plains';
let lightLevel = 15;
let texturesOn = true;
let flyMode = false;
let aoOn = false;
let shadowsOn = false;
let lightingOn = false;

export function init() {
  nova64.camera.setCameraPosition(0, 80, 0);
  nova64.light.setFog(0x87ceeb, 20, 60);
  if (typeof enableVoxelTextures === 'function') nova64.voxel.enableVoxelTextures(true);
  if (typeof configureVoxelWorld === 'function') {
    nova64.voxel.configureVoxelWorld({
      renderDistance: 3,
      enableAO: false,
      enableLighting: false,
      enableShadows: false,
      enableCaves: false,
      enableOres: false,
      maxTerrainGenPerFrame: 4,
      maxMeshRebuildsPerFrame: 6,
    });
  }
}

export function update(dt) {
  // Progressive loading — spread across multiple frames instead of blocking
  if (!loaded) {
    loadFrame++;
    if (typeof updateVoxelWorld === 'function') {
      nova64.voxel.updateVoxelWorld(0, 0);
    }
    // After a few frames of progressive loading, find ground and start
    if (loadFrame >= 8) {
      if (typeof getVoxelHighestBlock === 'function') {
        const groundY = nova64.voxel.getVoxelHighestBlock(0, 0);
        if (groundY > 0) player.y = groundY + 2;
      }
      loaded = true;
    }
    return;
  }

  // Day/night cycle (slow)
  time += 0.0003;
  if (time > 1) time -= 1;
  if (typeof setVoxelDayTime === 'function') {
    const quantized = Math.round(time * 100) / 100;
    if (quantized !== lastDayTime) {
      lastDayTime = quantized;
      nova64.voxel.setVoxelDayTime(quantized);
    }
  }

  // Sky color from time of day
  const sunAngle = time * Math.PI * 2;
  const sunFactor = Math.max(0, Math.sin(sunAngle));
  const skyR = Math.floor(10 + sunFactor * 125);
  const skyG = Math.floor(10 + sunFactor * 196);
  const skyB = Math.floor(20 + sunFactor * 215);
  nova64.light.setFog((skyR << 16) | (skyG << 8) | skyB, 20, 60);

  // Input
  const cosY = Math.cos(player.yaw);
  const sinY = Math.sin(player.yaw);
  if (nova64.input.key('ArrowLeft')) player.yaw -= 0.04;
  if (nova64.input.key('ArrowRight')) player.yaw += 0.04;
  if (nova64.input.key('ArrowUp') && player.pitch < 1.4) player.pitch += 0.04;
  if (nova64.input.key('ArrowDown') && player.pitch > -1.4) player.pitch -= 0.04;

  let dx = 0,
    dz = 0;
  const speed = flyMode ? 0.3 : 0.12;
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
    player.vx = (dx / len) * speed;
    player.vz = (dz / len) * speed;
  } else {
    player.vx = 0;
    player.vz = 0;
  }

  // Toggle fly mode
  if (nova64.input.keyp('KeyG')) flyMode = !flyMode;

  // Toggle textures
  if (nova64.input.keyp('KeyT') && typeof enableVoxelTextures === 'function') {
    texturesOn = !texturesOn;
    nova64.voxel.enableVoxelTextures(texturesOn);
  }

  // Toggle AO (marks chunks dirty to rebuild)
  if (nova64.input.keyp('KeyO') && typeof configureVoxelWorld === 'function') {
    aoOn = !aoOn;
    nova64.voxel.configureVoxelWorld({ enableAO: aoOn });
  }

  // Toggle shadows
  if (nova64.input.keyp('KeyL') && typeof configureVoxelWorld === 'function') {
    shadowsOn = !shadowsOn;
    nova64.voxel.configureVoxelWorld({ enableShadows: shadowsOn });
  }

  // Toggle lighting
  if (nova64.input.keyp('KeyP') && typeof configureVoxelWorld === 'function') {
    lightingOn = !lightingOn;
    nova64.voxel.configureVoxelWorld({ enableLighting: lightingOn });
  }

  if (flyMode) {
    player.vy = 0;
    if (nova64.input.key('Space')) player.vy = 0.2;
    if (nova64.input.key('ShiftLeft')) player.vy = -0.2;
    player.y += player.vy;
    player.x += player.vx;
    player.z += player.vz;
  } else {
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
      if (r.inWater && nova64.input.key('Space')) player.vy = 0.12;
    }
  }

  if (player.y < -10) {
    player.y = 80;
    player.vy = 0;
  }

  // Camera
  nova64.camera.setCameraPosition(player.x, player.y + 0.8, player.z);
  nova64.camera.setCameraTarget(
    player.x - Math.sin(player.yaw) * Math.cos(player.pitch),
    player.y + 0.8 + Math.sin(player.pitch),
    player.z - Math.cos(player.yaw) * Math.cos(player.pitch)
  );

  // Biome + light (throttled — every 10 frames)
  if (loadFrame++ % 10 === 0) {
    if (typeof getVoxelBiome === 'function') biome = nova64.voxel.getVoxelBiome(player.x, player.z);
    if (lightingOn && typeof getVoxelLightLevel === 'function') {
      lightLevel = nova64.voxel.getVoxelLightLevel(
        Math.floor(player.x),
        Math.floor(player.y + 1),
        Math.floor(player.z)
      );
    }
  }

  if (typeof updateVoxelWorld === 'function') nova64.voxel.updateVoxelWorld(player.x, player.z);
}

export function draw() {
  if (!loaded) {
    nova64.draw.rectfill(0, 0, 640, 360, nova64.draw.rgba8(10, 10, 20));
    nova64.draw.print('GENERATING TERRAIN...', 240, 175, 0xffffff);
    return;
  }

  // HUD background
  nova64.draw.rect(0, 0, 640, 18, nova64.draw.rgba8(0, 0, 0, 140), true);
  nova64.draw.print('VOXEL TERRAIN EXPLORER', 5, 4, 0xffdd88);

  // Position
  const pos = `${Math.floor(player.x)}, ${Math.floor(player.y)}, ${Math.floor(player.z)}`;
  nova64.draw.print(pos, 540, 4, nova64.draw.rgba8(200, 200, 200));

  // Biome
  nova64.draw.print(biome, 210, 4, 0x88ff88);

  // Time of day
  const hours = Math.floor(time * 24);
  const mins = Math.floor((time * 24 - hours) * 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  nova64.draw.print(timeStr, 380, 4, 0xffff88);

  // Light level
  nova64.draw.print(`Light: ${lightLevel}`, 440, 4, lightLevel > 7 ? 0xffffaa : 0xff8844);

  // Crosshair
  nova64.draw.rect(319, 172, 2, 16, nova64.draw.rgba8(255, 255, 255, 180), true);
  nova64.draw.rect(312, 179, 16, 2, nova64.draw.rgba8(255, 255, 255, 180), true);

  // Controls
  const mode = flyMode ? '[FLY]' : '[WALK]';
  nova64.draw.print(
    `WASD=Move  Arrows=Look  Space=Jump  G=Fly${mode}`,
    10,
    330,
    nova64.draw.rgba8(255, 255, 255, 160)
  );
  nova64.draw.print(
    `T=Tex${texturesOn ? ':ON' : ':OFF'}  O=AO${aoOn ? ':ON' : ':OFF'}  L=Shad${shadowsOn ? ':ON' : ':OFF'}  P=Light${lightingOn ? ':ON' : ':OFF'}`,
    10,
    345,
    nova64.draw.rgba8(200, 200, 200, 140)
  );
}
