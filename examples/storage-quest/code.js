// examples/storage-quest/code.js
// Demonstrates Nova64's persistent storage API.
// Collect gems to earn points, upgrade your ship, and watch everything
// persist across full page reloads via saveData/loadData.

const { print, printCentered, rect, rgba8 } = nova64.draw;
const { createCube, createPlane, createSphere, removeMesh, rotateMesh, setPosition } = nova64.scene;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog } = nova64.light;
const { key, keyp } = nova64.input;
const { sfx } = nova64.audio;
const { deleteData, loadData, saveData } = nova64.data;
const SAVE_KEY = 'storagequest';
const GEM_COLORS = [0xffdd00, 0x00ffaa, 0xff4488, 0x44aaff];
const UPGRADE_COST = [0, 50, 150, 400]; // cumulative cost per level (level 0 = start)

let state; // the persistent game state
let ship;
let gems = [];
let particles = [];
let upgradeFlash = 0;
let saveFlash = 0;

function defaultState() {
  return { score: 0, highScore: 0, level: 1, shipLevel: 0, totalGems: 0, runs: 0 };
}

function spawnGems(count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 6;
    const color = GEM_COLORS[(gems.length + i) % GEM_COLORS.length];
    gems.push({
      mesh: createSphere(0.25, color, [Math.cos(angle) * r, 0.5, Math.sin(angle) * r], 6, {
        material: 'holographic',
        emissive: color,
      }),
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      spin: Math.random() * Math.PI * 2,
      color,
    });
  }
}

export function init() {
  // Load persistent state or create fresh
  state = loadData(SAVE_KEY, defaultState());
  state.runs = (state.runs || 0) + 1;

  setCameraPosition(0, 12, 16);
  setCameraTarget(0, 0, 0);
  setAmbientLight(0x334466, 1.1);
  setFog(0x050515, 20, 45);

  // Ground
  const ground = createPlane(30, 30, 0x0a0a22, [0, 0, 0]);
  rotateMesh(ground, -Math.PI / 2, 0, 0);

  // Ship color reflects upgrade level
  const shipColors = [0x0088ff, 0x00ffaa, 0xffaa00, 0xff44aa];
  const sz = 0.5 + state.shipLevel * 0.15;
  ship = createCube(sz * 2, shipColors[state.shipLevel % shipColors.length], [0, 0.6, 0], {
    material: 'metallic',
    emissive: 0x002244,
  });

  spawnGems(5 + state.level * 2);
}

export function update(dt) {
  const speed = 4 + state.shipLevel * 0.8;
  let mx = 0,
    mz = 0;
  if (key('KeyW') || key('ArrowUp')) mz -= speed * dt;
  if (key('KeyS') || key('ArrowDown')) mz += speed * dt;
  if (key('KeyA') || key('ArrowLeft')) mx -= speed * dt;
  if (key('KeyD') || key('ArrowRight')) mx += speed * dt;

  // Move ship — read position, apply delta, write back
  const pos = getMeshPosition(ship);
  const nx = Math.max(-13, Math.min(13, pos.x + mx));
  const nz = Math.max(-13, Math.min(13, pos.z + mz));
  setPosition(ship, nx, pos.y, nz);
  rotateMesh(ship, 0, dt * 0.5, 0);

  // Gem spin and collection
  gems = gems.filter(g => {
    g.spin += dt * 1.2;
    rotateMesh(g.mesh, dt * 0.5, dt, 0);
    const dist = Math.hypot(nx - g.x, nz - g.z);
    if (dist < 1.0) {
      // Collect!
      removeMesh(g.mesh);
      state.score += 10 * state.level;
      state.totalGems++;
      if (state.score > state.highScore) state.highScore = state.score;
      sfx('coin');
      // Spawn particle burst
      for (let p = 0; p < 6; p++) {
        particles.push({
          x: g.x,
          y: 0.5,
          z: g.z,
          vx: (Math.random() - 0.5) * 4,
          vy: 1 + Math.random() * 2,
          vz: (Math.random() - 0.5) * 4,
          life: 0.6,
          color: g.color,
          mesh: createSphere(0.1, g.color, [g.x, 0.5, g.z], 4),
        });
      }
      return false;
    }
    return true;
  });

  // Auto-save and level up when all gems collected
  if (gems.length === 0) {
    state.level++;
    saveData(SAVE_KEY, state);
    saveFlash = 1.5;
    sfx('powerup');
    spawnGems(5 + state.level * 2);
  }

  // Particles
  particles = particles.filter(p => {
    p.vy -= 3 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    setPosition(p.mesh, p.x, p.y, p.z);
    if (p.life <= 0) {
      removeMesh(p.mesh);
      return false;
    }
    return true;
  });

  // Upgrade ship (press U)
  if (keyp('KeyU') && state.shipLevel < 3) {
    const cost = UPGRADE_COST[state.shipLevel + 1];
    if (state.score >= cost) {
      state.score -= cost;
      state.shipLevel++;
      saveData(SAVE_KEY, state);
      saveFlash = 1.5;
      upgradeFlash = 2;
      sfx('powerup');
    }
  }

  // Manual save (press Enter)
  if (keyp('Enter')) {
    saveData(SAVE_KEY, state);
    saveFlash = 1.5;
    sfx('confirm');
  }

  // Reset save (press R + Shift together)
  if (key('ShiftLeft') && keyp('KeyR')) {
    deleteData(SAVE_KEY);
    state = defaultState();
    saveFlash = 1.5;
    sfx('error');
  }

  upgradeFlash = Math.max(0, upgradeFlash - dt);
  saveFlash = Math.max(0, saveFlash - dt);
}

export function draw() {
  // Header
  rect(0, 0, 320, 18, rgba8(10, 5, 30, 255), true);
  printCentered('STORAGE QUEST', 4, 0xffffff);

  // Score panel
  rect(4, 22, 150, 60, rgba8(15, 10, 40, 200), true);
  rect(4, 22, 150, 60, rgba8(60, 40, 120, 180), false);
  print(`SCORE`, 10, 27, 0xaaaaff);
  print(`${state.score}`, 10, 36, 0xffffff);
  print(`BEST: ${state.highScore}`, 10, 46, 0x888888);
  print(`LEVEL: ${state.level}`, 10, 56, 0x88aaff);
  print(`GEMS: ${state.totalGems}`, 10, 66, 0xffdd44);

  // Persistence panel
  rect(160, 22, 156, 60, rgba8(15, 10, 40, 200), true);
  rect(160, 22, 156, 60, rgba8(60, 40, 120, 180), false);
  print('PERSISTENT DATA', 166, 27, 0xaaaaff);
  print(`Runs: ${state.runs}`, 166, 37, 0xdddddd);
  print(`Ship lvl: ${state.shipLevel}`, 166, 47, 0xdddddd);
  const nextCost = state.shipLevel < 3 ? UPGRADE_COST[state.shipLevel + 1] : 'MAX';
  print(`Upgrade: ${nextCost}pts`, 166, 57, 0xffaa44);
  print('(U to upgrade)', 166, 67, 0x555577);

  // Save indicator
  if (saveFlash > 0) {
    const alpha = Math.floor((saveFlash / 1.5) * 220);
    rect(100, 86, 120, 12, rgba8(0, 180, 100, alpha), true);
    print(
      upgradeFlash > 0 ? 'SHIP UPGRADED!' : 'DATA SAVED!',
      112,
      89,
      upgradeFlash > 0 ? 0xffdd00 : 0xffffff
    );
  }

  // Gem counter
  print(`Gems remaining: ${gems.length}`, 10, 90, 0xdddddd);

  // Controls footer
  rect(0, 170, 320, 10, rgba8(10, 5, 30, 255), true);
  print('WASD: move  U: upgrade  Enter: save  Shift+R: reset', 2, 172, 0x333355);
}
