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
      mesh: nova64.scene.createSphere(
        0.25,
        color,
        [Math.cos(angle) * r, 0.5, Math.sin(angle) * r],
        6,
        {
          material: 'holographic',
          emissive: color,
        }
      ),
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      spin: Math.random() * Math.PI * 2,
      color,
    });
  }
}

export function init() {
  // Load persistent state or create fresh
  state = nova64.data.loadData(SAVE_KEY, defaultState());
  state.runs = (state.runs || 0) + 1;

  nova64.camera.setCameraPosition(0, 12, 16);
  nova64.camera.setCameraTarget(0, 0, 0);
  nova64.light.setAmbientLight(0x334466, 1.1);
  nova64.light.setFog(0x050515, 20, 45);

  // Ground
  const ground = nova64.scene.createPlane(30, 30, 0x0a0a22, [0, 0, 0]);
  nova64.scene.rotateMesh(ground, -Math.PI / 2, 0, 0);

  // Ship color reflects upgrade level
  const shipColors = [0x0088ff, 0x00ffaa, 0xffaa00, 0xff44aa];
  const sz = 0.5 + state.shipLevel * 0.15;
  ship = nova64.scene.createCube(
    sz * 2,
    shipColors[state.shipLevel % shipColors.length],
    [0, 0.6, 0],
    {
      material: 'metallic',
      emissive: 0x002244,
    }
  );

  spawnGems(5 + state.level * 2);
}

export function update(dt) {
  const speed = 4 + state.shipLevel * 0.8;
  let mx = 0,
    mz = 0;
  if (nova64.input.key('KeyW') || nova64.input.key('ArrowUp')) mz -= speed * dt;
  if (nova64.input.key('KeyS') || nova64.input.key('ArrowDown')) mz += speed * dt;
  if (nova64.input.key('KeyA') || nova64.input.key('ArrowLeft')) mx -= speed * dt;
  if (nova64.input.key('KeyD') || nova64.input.key('ArrowRight')) mx += speed * dt;

  // Move ship — read position, apply delta, write back
  const pos = getMeshPosition(ship);
  const nx = Math.max(-13, Math.min(13, pos.x + mx));
  const nz = Math.max(-13, Math.min(13, pos.z + mz));
  nova64.scene.setPosition(ship, nx, pos.y, nz);
  nova64.scene.rotateMesh(ship, 0, dt * 0.5, 0);

  // Gem spin and collection
  gems = gems.filter(g => {
    g.spin += dt * 1.2;
    nova64.scene.rotateMesh(g.mesh, dt * 0.5, dt, 0);
    const dist = Math.hypot(nx - g.x, nz - g.z);
    if (dist < 1.0) {
      // Collect!
      nova64.scene.removeMesh(g.mesh);
      state.score += 10 * state.level;
      state.totalGems++;
      if (state.score > state.highScore) state.highScore = state.score;
      nova64.audio.sfx('coin');
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
          mesh: nova64.scene.createSphere(0.1, g.color, [g.x, 0.5, g.z], 4),
        });
      }
      return false;
    }
    return true;
  });

  // Auto-save and level up when all gems collected
  if (gems.length === 0) {
    state.level++;
    nova64.data.saveData(SAVE_KEY, state);
    saveFlash = 1.5;
    nova64.audio.sfx('powerup');
    spawnGems(5 + state.level * 2);
  }

  // Particles
  particles = particles.filter(p => {
    p.vy -= 3 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    nova64.scene.setPosition(p.mesh, p.x, p.y, p.z);
    if (p.life <= 0) {
      nova64.scene.removeMesh(p.mesh);
      return false;
    }
    return true;
  });

  // Upgrade ship (press U)
  if (nova64.input.keyp('KeyU') && state.shipLevel < 3) {
    const cost = UPGRADE_COST[state.shipLevel + 1];
    if (state.score >= cost) {
      state.score -= cost;
      state.shipLevel++;
      nova64.data.saveData(SAVE_KEY, state);
      saveFlash = 1.5;
      upgradeFlash = 2;
      nova64.audio.sfx('powerup');
    }
  }

  // Manual save (press Enter)
  if (nova64.input.keyp('Enter')) {
    nova64.data.saveData(SAVE_KEY, state);
    saveFlash = 1.5;
    nova64.audio.sfx('confirm');
  }

  // Reset save (press R + Shift together)
  if (nova64.input.key('ShiftLeft') && nova64.input.keyp('KeyR')) {
    nova64.data.deleteData(SAVE_KEY);
    state = defaultState();
    saveFlash = 1.5;
    nova64.audio.sfx('error');
  }

  upgradeFlash = Math.max(0, upgradeFlash - dt);
  saveFlash = Math.max(0, saveFlash - dt);
}

export function draw() {
  // Header
  nova64.draw.rect(0, 0, 320, 18, nova64.draw.rgba8(10, 5, 30, 255), true);
  nova64.draw.printCentered('STORAGE QUEST', 4, 0xffffff);

  // Score panel
  nova64.draw.rect(4, 22, 150, 60, nova64.draw.rgba8(15, 10, 40, 200), true);
  nova64.draw.rect(4, 22, 150, 60, nova64.draw.rgba8(60, 40, 120, 180), false);
  nova64.draw.print(`SCORE`, 10, 27, 0xaaaaff);
  nova64.draw.print(`${state.score}`, 10, 36, 0xffffff);
  nova64.draw.print(`BEST: ${state.highScore}`, 10, 46, 0x888888);
  nova64.draw.print(`LEVEL: ${state.level}`, 10, 56, 0x88aaff);
  nova64.draw.print(`GEMS: ${state.totalGems}`, 10, 66, 0xffdd44);

  // Persistence panel
  nova64.draw.rect(160, 22, 156, 60, nova64.draw.rgba8(15, 10, 40, 200), true);
  nova64.draw.rect(160, 22, 156, 60, nova64.draw.rgba8(60, 40, 120, 180), false);
  nova64.draw.print('PERSISTENT DATA', 166, 27, 0xaaaaff);
  nova64.draw.print(`Runs: ${state.runs}`, 166, 37, 0xdddddd);
  nova64.draw.print(`Ship lvl: ${state.shipLevel}`, 166, 47, 0xdddddd);
  const nextCost = state.shipLevel < 3 ? UPGRADE_COST[state.shipLevel + 1] : 'MAX';
  nova64.draw.print(`Upgrade: ${nextCost}pts`, 166, 57, 0xffaa44);
  nova64.draw.print('(U to upgrade)', 166, 67, 0x555577);

  // Save indicator
  if (saveFlash > 0) {
    const alpha = Math.floor((saveFlash / 1.5) * 220);
    nova64.draw.rect(100, 86, 120, 12, nova64.draw.rgba8(0, 180, 100, alpha), true);
    nova64.draw.print(
      upgradeFlash > 0 ? 'SHIP UPGRADED!' : 'DATA SAVED!',
      112,
      89,
      upgradeFlash > 0 ? 0xffdd00 : 0xffffff
    );
  }

  // Gem counter
  nova64.draw.print(`Gems remaining: ${gems.length}`, 10, 90, 0xdddddd);

  // Controls footer
  nova64.draw.rect(0, 170, 320, 10, nova64.draw.rgba8(10, 5, 30, 255), true);
  nova64.draw.print('WASD: move  U: upgrade  Enter: save  Shift+R: reset', 2, 172, 0x333355);
}
