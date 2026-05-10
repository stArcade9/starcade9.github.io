// ─── NFT Worlds — Seed-Generated Voxel Worlds ─────────────────────────
// Enter any token ID, hash, or text to generate a unique deterministic world.
// Same seed = same world, always.

const { drawRect, prinprintCentered } = nova64.draw;
const { clearScene, getPosition } = nova64.scene;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog } = nova64.light;
const { key, keyp } = nova64.input;
const { configureVoxelWorld, resetVoxelWorld, setVoxelDayTime, updateVoxelWorld } = nova64.voxel;
const { createSeedFromHash, createSeedRNG, exportSeedMetadata, seedToTraits, t } = nova64.data;
const WORLD_SCHEMA = {
  biome: {
    values: ['forest', 'desert', 'tundra', 'ocean', 'mushroom', 'crystal', 'volcanic', 'floating'],
    weights: [3, 2, 2, 2, 1, 1, 1, 1],
  },
  density: { type: 'float', min: 0.3, max: 1.0 },
  treeFrequency: { type: 'float', min: 0.01, max: 0.08 },
  hillScale: { type: 'float', min: 8, max: 40 },
  hillHeight: { type: 'float', min: 5, max: 25 },
  caveDepth: { type: 'float', min: 0.3, max: 0.7 },
  oreRichness: { type: 'float', min: 0.005, max: 0.04 },
  waterLevel: { type: 'int', min: 25, max: 45 },
  palette: { values: ['warm', 'cool', 'neon', 'earth', 'mono', 'pastel', 'dark', 'vivid'] },
  timeOfDay: { values: ['dawn', 'noon', 'dusk', 'night'], weights: [2, 3, 2, 1] },
  features: { type: 'int', min: 1, max: 5 },
};

const BIOME_COLORS = {
  forest: { grass: 0x3a8c3f, dirt: 0x8b5e3c, stone: 0x808080, accent: 0x2d6a2d },
  desert: { grass: 0xd4a844, dirt: 0xc4943c, stone: 0xb8a080, accent: 0xe8c060 },
  tundra: { grass: 0xc8d8d8, dirt: 0x9aaa9a, stone: 0xa0a8b0, accent: 0xe0f0ff },
  ocean: { grass: 0x408060, dirt: 0x6a8a6a, stone: 0x607070, accent: 0x4488cc },
  mushroom: { grass: 0x6a3a6a, dirt: 0x8b4a6a, stone: 0x705878, accent: 0xcc44cc },
  crystal: { grass: 0x40a0b0, dirt: 0x508090, stone: 0x607888, accent: 0x44ddff },
  volcanic: { grass: 0x4a3a3a, dirt: 0x3a2a2a, stone: 0x5a4848, accent: 0xff4400 },
  floating: { grass: 0x60b060, dirt: 0x7a6a50, stone: 0x888888, accent: 0xaaddff },
};

const TIME_LIGHT = {
  dawn: { ambient: 0x443355, fog: 0xffaa77, dayTime: 0.25 },
  noon: { ambient: 0x8899aa, fog: 0x88bbdd, dayTime: 0.5 },
  dusk: { ambient: 0x553344, fog: 0xff7744, dayTime: 0.75 },
  night: { ambient: 0x111122, fog: 0x222244, dayTime: 0.0 },
};

let currentSeed = '';
let currentTraits = null;
let currentRNG = null;
let seedInput = '';
let inputActive = true;
let showMetadata = false;
let metadataJSON = '';
let worldGenerated = false;
let cursorBlink = 0;

// Preset seeds for quick browsing
const PRESETS = [
  '0xd3adb33f1234567890abcdef',
  '42',
  'nova64',
  '0xBAADF00DCAFE',
  'hello world',
  '0x7777777777777777',
  'ethereum',
  '1337',
];
let presetIdx = 0;

export function init() {
  seedInput = PRESETS[0];
  inputActive = true;
  worldGenerated = false;
  showMetadata = false;
}

export function update(dt) {
  cursorBlink += dt;

  if (showMetadata) {
    if (nova64.input.keyp('Escape') || nova64.input.keyp('KeyM')) {
      showMetadata = false;
    }
    return;
  }

  if (inputActive) {
    // Handle typing
    for (let i = 48; i <= 57; i++) {
      if (nova64.input.keyp('Digit' + String.fromCharCode(i))) seedInput += String.fromCharCode(i);
    }
    for (let i = 65; i <= 90; i++) {
      const code = 'Key' + String.fromCharCode(i);
      if (nova64.input.keyp(code)) {
        seedInput +=
          nova64.input.key('ShiftLeft') || nova64.input.key('ShiftRight')
            ? String.fromCharCode(i)
            : String.fromCharCode(i + 32);
      }
    }
    if (nova64.input.keyp('Space')) seedInput += ' ';
    if (nova64.input.keyp('Minus')) seedInput += '-';
    if (nova64.input.keyp('Equal')) seedInput += '=';
    if (nova64.input.keyp('Period')) seedInput += '.';
    if (nova64.input.keyp('Slash')) seedInput += '/';
    if (nova64.input.keyp('Backspace') && seedInput.length > 0) {
      seedInput = seedInput.slice(0, -1);
    }

    // Enter to generate
    if (nova64.input.keyp('Enter') && seedInput.length > 0) {
      generateWorld(seedInput);
      inputActive = false;
    }

    // Tab to cycle presets
    if (nova64.input.keyp('Tab')) {
      presetIdx = (presetIdx + 1) % PRESETS.length;
      seedInput = PRESETS[presetIdx];
    }

    return;
  }

  // World navigation
  if (nova64.input.keyp('Escape')) {
    inputActive = true;
    worldGenerated = false;
    nova64.voxel.resetVoxelWorld();
    nova64.scene.clearScene();
  }
  if (nova64.input.keyp('KeyM')) {
    metadataJSON = nova64.data.exportSeedMetadata(currentSeed, currentTraits, {
      name: `Nova64 World #${nova64.data.createSeedFromHash(currentSeed)}`,
      description: `Procedurally generated voxel world from seed "${currentSeed}"`,
      collection: 'Nova64 NFT Worlds',
    });
    showMetadata = true;
    console.log('📋 NFT Metadata:\n' + metadataJSON);
  }

  // Arrow keys to try adjacent seeds
  if (nova64.input.keyp('BracketRight')) {
    presetIdx = (presetIdx + 1) % PRESETS.length;
    generateWorld(PRESETS[presetIdx]);
  }
  if (nova64.input.keyp('BracketLeft')) {
    presetIdx = (presetIdx - 1 + PRESETS.length) % PRESETS.length;
    generateWorld(PRESETS[presetIdx]);
  }

  // Standard voxel world update
  const cam = nova64.scene.getPosition(null); // camera
  if (cam) {
    nova64.voxel.updateVoxelWorld(cam[0] || 0, cam[1] || 0, cam[2] || 0);
  }
}

function generateWorld(seed) {
  currentSeed = seed;
  const numericSeed = typeof seed === 'number' ? seed : nova64.data.createSeedFromHash(seed);
  currentRNG = nova64.data.createSeedRNG(numericSeed);
  currentTraits = nova64.data.seedToTraits(numericSeed, WORLD_SCHEMA);

  // Reset and configure world
  nova64.voxel.resetVoxelWorld();
  nova64.scene.clearScene();

  const traits = currentTraits;
  const biomeColors = BIOME_COLORS[traits.biome] || BIOME_COLORS.forest;
  const timeLight = TIME_LIGHT[traits.timeOfDay] || TIME_LIGHT.noon;

  nova64.voxel.configureVoxelWorld({
    seed: numericSeed,
    renderDistance: 4,
    chunkSize: 16,
    worldHeight: 128,
  });

  // Apply time of day
  nova64.voxel.setVoxelDayTime(timeLight.dayTime);
  nova64.light.setAmbientLight(timeLight.ambient);
  nova64.light.setFog(timeLight.fog, 20, 80);

  // Position camera
  const spawnY = traits.waterLevel + traits.hillHeight + 10;
  nova64.camera.setCameraPosition(8, spawnY, 8);
  nova64.camera.setCameraTarget(32, traits.waterLevel, 32);

  worldGenerated = true;
  seedInput = String(seed);
}

export function draw() {
  if (showMetadata) {
    drawMetadataOverlay();
    return;
  }

  if (inputActive) {
    drawSeedInput();
    return;
  }

  drawWorldHUD();
}

function drawSeedInput() {
  // Title
  nova64.draw.printCentered('🌐 NFT WORLDS', 30, 0x44ddff);
  nova64.draw.printCentered('Seed-Generated Voxel Worlds', 50, 0x888888);

  // Input box
  const boxY = 100;
  nova64.draw.drawRect(80, boxY - 5, 480, 30, 0x1a1a2e);
  nova64.draw.drawRect(82, boxY - 3, 476, 26, 0x2a2a4e);

  const cursor = Math.floor(cursorBlink * 2) % 2 === 0 ? '▋' : '';
  nova64.draw.print('> ' + seedInput + cursor, 90, boxY + 2, 0x44ff44);

  // Instructions
  nova64.draw.printCentered('Type a seed (token ID, hash, or any text)', 155, 0x666688);
  nova64.draw.printCentered('ENTER to generate  |  TAB to cycle presets', 175, 0x666688);

  // Preset list
  nova64.draw.print('Presets:', 90, 210, 0x888888);
  for (let i = 0; i < PRESETS.length; i++) {
    const c = i === presetIdx ? 0x44ddff : 0x555566;
    const arrow = i === presetIdx ? '▸ ' : '  ';
    nova64.draw.print(arrow + PRESETS[i], 100, 230 + i * 16, c);
  }
}

function drawWorldHUD() {
  if (!currentTraits) return;
  const t = currentTraits;

  // Seed info (top left)
  nova64.draw.print('SEED: ' + seedInput, 10, 10, 0x44ff44);
  nova64.draw.print('ID: ' + nova64.data.createSeedFromHash(currentSeed), 10, 26, 0x888888);

  // Traits (top right)
  const rx = 440;
  nova64.draw.print('TRAITS', rx, 10, 0x44ddff);
  nova64.draw.print('Biome: ' + t.biome, rx, 28, 0xdddddd);
  nova64.draw.print('Palette: ' + t.palette, rx, 44, 0xdddddd);
  nova64.draw.print('Time: ' + t.timeOfDay, rx, 60, 0xdddddd);
  nova64.draw.print('Terrain: ' + t.hillHeight.toFixed(0) + 'm', rx, 76, 0xdddddd);
  nova64.draw.print('Density: ' + (t.density * 100).toFixed(0) + '%', rx, 92, 0xdddddd);
  nova64.draw.print('Caves: ' + (t.caveDepth * 100).toFixed(0) + '%', rx, 108, 0xdddddd);
  nova64.draw.print('Ores: ' + (t.oreRichness * 100).toFixed(1) + '%', rx, 124, 0xdddddd);
  nova64.draw.print('Water: Y' + t.waterLevel, rx, 140, 0x4488cc);
  nova64.draw.print('Features: ' + t.features, rx, 156, 0xdddddd);

  // Controls (bottom)
  nova64.draw.print('[ESC] New Seed  [M] Metadata  [/] Browse', 10, 340, 0x555566);
}

function drawMetadataOverlay() {
  // Dark overlay
  nova64.draw.drawRect(30, 20, 580, 320, 0x0a0a1e);
  nova64.draw.drawRect(32, 22, 576, 316, 0x1a1a3e);

  nova64.draw.printCentered('NFT METADATA (ERC-721)', 32, 0x44ddff);
  nova64.draw.print('Press M or ESC to close', 40, 50, 0x555566);

  // Show JSON lines
  const lines = metadataJSON.split('\n');
  const maxLines = Math.min(lines.length, 18);
  for (let i = 0; i < maxLines; i++) {
    const line = lines[i];
    let color = 0xaaaaaa;
    if (line.includes('"name"') || line.includes('"trait_type"')) color = 0x44ddff;
    else if (line.includes('"value"')) color = 0x44ff44;
    else if (line.includes('"seed"')) color = 0xffaa44;
    nova64.draw.print(line.slice(0, 72), 44, 70 + i * 14, color);
  }
  if (lines.length > maxLines) {
    nova64.draw.print(
      '... (' + (lines.length - maxLines) + ' more lines — see console)',
      44,
      70 + maxLines * 14,
      0x555566
    );
  }
}
