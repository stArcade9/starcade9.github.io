// NEO-DOOM: FAST, BRIGHT, FUN ARENA SHOOTER
// Fixed lighting, fixed mouse lock, fast movement

let gameTime = 0;
let gameState = 'start'; // start, playing, gameover

let player = {
  x: 2,
  y: 1.5,
  z: 2,
  yaw: 0,
  pitch: 0,
  health: 100,
  score: 0,
};

let entities = {
  walls: [],
  enemies: [],
  bullets: [],
  particles: [],
};

// A bright, high-contrast arena layout
const MAP = [
  '########################',
  '#..E.......#...........#',
  '#.###.####.#.#.#####.E.#',
  '#.#......#.#.#.#...#...#',
  '#.#..E...#...#.#...###.#',
  '#.######.#####.#E......#',
  '#..............#...###.#',
  '###.############...#...#',
  '#......#...E...#...###.#',
  '#.####.#.#####.#E......#',
  '#.#....#.#...#.#.###.###',
  '#.#E...#.#.E.#.#...#...#',
  '#.######.#.###.###.#...#',
  '#......................#',
  '########################',
];

// Bright, colorful materials (no metallic to avoid black rendering)
const MAT = {
  floor: { material: 'standard', color: 0x223344, roughness: 1.0 },
  wall: { material: 'standard', color: 0xdddddd, roughness: 0.8 },
  wallColor: { material: 'standard', color: 0x00aaff, roughness: 0.8 },
  enemy: { material: 'emissive', color: 0xff3300, intensity: 2.0 },
  enemyEye: { material: 'emissive', color: 0xffffff, intensity: 3.0 },
  bullet: { material: 'emissive', color: 0x00ffcc, intensity: 4.0 },
  particle: { material: 'emissive', color: 0xffaa00, intensity: 2.0 },
};

let mouseInit = false;

export function init() {
  // Bright cyan ambient fog
  setFog(0x001122, 5, 80);

  // Strong lighting so things are actually visible!
  setAmbientLight(0xffffff, 0.6);
  setDirectionalLight([-1, -2, -1], 0xffffee, 1.2);

  // Bright checkerboard/neon floor
  let floor = createPlane(200, 200, 0x112233, [0, 0, 0], MAT.floor);
  setRotation(floor, -Math.PI / 2, 0, 0);

  // Initialize mouse click safely
  if (!mouseInit) {
    mouseInit = true;
    document.addEventListener('mousedown', e => {
      // Must be called in direct response to click
      if (!document.pointerLockElement) {
        document.body.requestPointerLock().catch(e => console.log('Pointer lock blocked:', e));
      }
      if (gameState === 'start' || gameState === 'gameover') {
        startGame();
      }
    });

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement && gameState === 'playing') {
        player.yaw -= e.movementX * 0.003;
        player.pitch -= e.movementY * 0.003;
        if (player.pitch > 1.2) player.pitch = 1.2;
        if (player.pitch < -1.2) player.pitch = -1.2;
      }
    });
  }
}

function cleanupLevel() {
  for (let w of entities.walls) destroyMesh(w.m);
  for (let e of entities.enemies) {
    destroyMesh(e.m1);
    destroyMesh(e.m2);
  }
  for (let b of entities.bullets) destroyMesh(b.m);
  for (let p of entities.particles) destroyMesh(p.m);
  entities = { walls: [], enemies: [], bullets: [], particles: [] };
}

function startGame() {
  cleanupLevel();
  gameState = 'playing';
  gameTime = 0;
  player.health = 100;
  player.score = 0;

  const SIZE = 4;
  for (let z = 0; z < MAP.length; z++) {
    for (let x = 0; x < MAP[z].length; x++) {
      let char = MAP[z][x];
      let px = (x - 12) * SIZE;
      let pz = (z - 7) * SIZE;

      if (char === '#') {
        // Bright white and blue chunky walls
        let isColor = (x + z) % 3 === 0;
        let m = createCube(
          SIZE,
          isColor ? MAT.wallColor.color : MAT.wall.color,
          [px, 3, pz],
          isColor ? MAT.wallColor : MAT.wall
        );
        setScale(m, 1, 1.5, 1); // 6 units tall
        entities.walls.push({ m, x: px, z: pz, r: SIZE / 2 });
      } else if (char === 'E') {
        spawnEnemy(px, pz);
      }
    }
  }

  player.x = -11 * SIZE; // Safe spawn point (x=1)
  player.z = -6 * SIZE; // Safe spawn point (z=1)
  player.yaw = Math.PI / 4;
  player.pitch = 0;
}

function spawnEnemy(x, z) {
  let m1 = createCube(1.5, MAT.enemy.color, [x, 2, z], MAT.enemy);
  let m2 = createCube(0.8, MAT.enemyEye.color, [x, 2.5, z + 0.5], MAT.enemyEye);
  entities.enemies.push({ m1, m2, x, z, y: 2, health: 3, speed: 0.15 + Math.random() * 0.1 });
}

function getWallCollision(nx, nz, radius) {
  for (let w of entities.walls) {
    if (Math.abs(nx - w.x) < w.r + radius && Math.abs(nz - w.z) < w.r + radius) {
      return true;
    }
  }
  return false;
}

function shoot() {
  let fx = Math.sin(player.yaw) * Math.cos(player.pitch);
  let fy = Math.sin(player.pitch);
  let fz = Math.cos(player.yaw) * Math.cos(player.pitch);

  let bx = player.x + fx;
  let by = player.y + fy + 0.2; // roughly eye level
  let bz = player.z + fz;

  let m = createCube(0.2, MAT.bullet.color, [bx, by, bz], MAT.bullet);
  setScale(m, 1, 1, 6);
  setRotation(m, -player.pitch, player.yaw, 0);

  entities.bullets.push({ m, x: bx, y: by, z: bz, vx: fx * 3, vy: fy * 3, vz: fz * 3, life: 30 });
}

function spawnGibs(cx, cy, cz, color, count) {
  for (let i = 0; i < count; i++) {
    let m = createCube(0.3, color, [cx, cy, cz], {
      material: 'emissive',
      color: color,
      intensity: 2,
    });
    entities.particles.push({
      m,
      x: cx,
      y: cy,
      z: cz,
      vx: (Math.random() - 0.5) * 1.5,
      vy: Math.random() * 1.5,
      vz: (Math.random() - 0.5) * 1.5,
      life: 20 + Math.random() * 10,
    });
  }
}

export function update() {
  gameTime++;

  if (gameState !== 'playing') {
    // Look around idle animation - high up to avoid clipping walls
    let r = 40;
    setCameraPosition(Math.sin(gameTime * 0.005) * r, 30, Math.cos(gameTime * 0.005) * r);
    setCameraTarget(0, 0, 0);
    return;
  }

  // Very Fast Movement
  let speed = 0.35;
  let fx = Math.sin(player.yaw);
  let fz = Math.cos(player.yaw);
  let rx = Math.cos(player.yaw);
  let rz = -Math.sin(player.yaw);

  let dx = 0;
  let dz = 0;
  if (key('KeyW') || key('ArrowUp')) {
    dx += fx;
    dz += fz;
  }
  if (key('KeyS') || key('ArrowDown')) {
    dx -= fx;
    dz -= fz;
  }
  if (key('KeyA') || key('ArrowLeft')) {
    dx += rx;
    dz += rz;
  }
  if (key('KeyD') || key('ArrowRight')) {
    dx -= rx;
    dz -= rz;
  }

  // Normalize diagonal speed
  let len = Math.hypot(dx, dz);
  if (len > 0) {
    dx = (dx / len) * speed;
    dz = (dz / len) * speed;
  }

  // Smooth Sliding Collision
  let plrRadius = 1.0;
  if (!getWallCollision(player.x + dx, player.z, plrRadius)) player.x += dx;
  if (!getWallCollision(player.x, player.z + dz, plrRadius)) player.z += dz;

  // Bobbing
  if (len > 0) player.y = 1.5 + Math.sin(gameTime * 0.4) * 0.2;
  else player.y = 1.5 + Math.sin(gameTime * 0.05) * 0.05;

  // Camera update
  let headY = player.y + 1.0;
  let tx = player.x + Math.sin(player.yaw) * Math.cos(player.pitch);
  let ty = headY + Math.sin(player.pitch);
  let tz = player.z + Math.cos(player.yaw) * Math.cos(player.pitch);

  setCameraPosition(player.x, headY, player.z);
  setCameraTarget(tx, ty, tz);
  setCameraFOV(100); // Quake Pro FOV

  // Rapid Fire
  if ((mouseDown() || key('Space') || btn('A')) && gameTime % 4 === 0) {
    shoot();
    player.pitch += 0.02; // Tiny recoil
  }

  // Update Bullets
  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    let b = entities.bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.z += b.vz;
    setPosition(b.m, b.x, b.y, b.z);
    b.life--;

    let hit = false;

    // Check enemy collision
    for (let j = entities.enemies.length - 1; j >= 0; j--) {
      let e = entities.enemies[j];
      if (Math.hypot(b.x - e.x, b.z - e.z) < 1.8 && Math.abs(b.y - e.y) < 2.0) {
        hit = true;
        e.health -= 1;
        spawnGibs(b.x, b.y, b.z, 0xffaa00, 3); // sparks
        if (e.health <= 0) {
          destroyMesh(e.m1);
          destroyMesh(e.m2);
          entities.enemies.splice(j, 1);
          player.score += 100;
          spawnGibs(e.x, e.y, e.z, MAT.enemy.color, 15); // blood
        }
        break;
      }
    }

    if (!hit && getWallCollision(b.x, b.z, 0)) {
      hit = true;
      spawnGibs(b.x, b.y, b.z, 0x00ffff, 4); // wall hit sparks
    }

    if (b.life <= 0 || hit) {
      destroyMesh(b.m);
      entities.bullets.splice(i, 1);
    }
  }

  // Update Enemies
  for (let i = entities.enemies.length - 1; i >= 0; i--) {
    let e = entities.enemies[i];
    let dist = Math.hypot(player.x - e.x, player.z - e.z);

    // Move towards player fast
    if (dist < 30 && dist > 1.5) {
      let ex = e.x + ((player.x - e.x) / dist) * e.speed;
      let ez = e.z + ((player.z - e.z) / dist) * e.speed;
      if (!getWallCollision(ex, e.z, 1.2)) e.x = ex;
      if (!getWallCollision(e.x, ez, 1.2)) e.z = ez;
    }

    // Animate
    let t = gameTime * 0.1 + i;
    e.y = 2 + Math.sin(t) * 0.5;
    setPosition(e.m1, e.x, e.y, e.z);
    setRotation(e.m1, t, t, 0); // Tumbling core

    // Eye points at player roughly
    let eyeYaw = Math.atan2(player.x - e.x, player.z - e.z);
    setPosition(e.m2, e.x + Math.sin(eyeYaw) * 0.8, e.y + 0.5, e.z + Math.cos(eyeYaw) * 0.8);
    setRotation(e.m2, 0, eyeYaw, 0);

    // Hit player
    if (dist < 2.0 && gameTime % 15 === 0) {
      player.health -= 10;
      setFog(0xff0000, 1, 20); // Pain flash
      if (player.health <= 0) {
        gameState = 'gameover';
        if (document.pointerLockElement) document.exitPointerLock();
      }
    }
  }

  // Particles
  for (let i = entities.particles.length - 1; i >= 0; i--) {
    let p = entities.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    p.vy -= 0.1; // gravity
    if (p.y < 0) {
      p.y = 0;
      p.vy *= -0.5;
    }
    p.life--;
    setPosition(p.m, p.x, p.y, p.z);
    let s = p.life / 20;
    setScale(p.m, s, s, s);
    if (p.life <= 0) {
      destroyMesh(p.m);
      entities.particles.splice(i, 1);
    }
  }

  // Random enemy respawn
  if (gameTime % 120 === 0 && entities.enemies.length < 15) {
    let rs = 4; // SIZE constant used in init
    spawnEnemy((Math.random() - 0.5) * 10 * rs, (Math.random() - 0.5) * 10 * rs);
  }

  // Restore fog
  if (player.health > 0) setFog(0x001122, 5, 80);
}

export function draw() {
  if (gameState === 'start') {
    rectfill(0, 0, 640, 360, rgba8(0, 0, 0, 187));
    print('NEO-DOOM', 180, 120, rgba8(0, 255, 204, 255));
    print('CLICK ANYWHERE TO START AND LOCK MOUSE', 70, 170, rgba8(255, 255, 255, 255));
    print('WASD to Move  |  Mouse to Aim  |  Click to Shoot', 40, 220, rgba8(170, 170, 170, 255));
  } else if (gameState === 'gameover') {
    rectfill(0, 0, 640, 360, rgba8(187, 0, 0, 187));
    print('YOU DIED', 200, 120, rgba8(255, 255, 255, 255));
    print(`FINAL SCORE: ${player.score}`, 160, 160, rgba8(255, 170, 0, 255));
    print('CLICK TO RESTART', 140, 220, rgba8(170, 170, 170, 255));
  } else {
    // HUD
    let hColor = player.health > 30 ? rgba8(0, 255, 204, 255) : rgba8(255, 0, 0, 255);
    print(`HP: ${player.health}%`, 20, 320, hColor);
    print(`SCORE: ${player.score}`, 200, 320, rgba8(255, 170, 0, 255));

    // Crosshair
    rectfill(159, 119, 3, 3, rgba8(255, 255, 255, 255));

    // Fast DOOM-style animated gun bob
    let isMoving = key('KeyW') || key('KeyS') || key('KeyA') || key('KeyD');
    let bobX = isMoving ? Math.sin(gameTime * 0.3) * 10 : 0;
    let bobY = isMoving ? Math.abs(Math.sin(gameTime * 0.3)) * 10 : 0;
    let recoil = mouseDown() && gameTime % 4 < 2 ? 15 : 0;

    let gx = 160 + bobX;
    let gy = 260 + bobY + recoil;

    // Gun graphics
    rectfill(gx - 15, gy - 60, 30, 100, rgba8(51, 51, 51, 255)); // Barrel
    rectfill(gx - 20, gy - 20, 40, 80, rgba8(85, 85, 85, 255)); // Stock
    rectfill(gx - 5, gy - 70, 10, 60, rgba8(0, 255, 204, 255)); // Glow

    if (recoil) {
      rectfill(gx - 25, gy - 90, 50, 40, rgba8(0, 255, 204, 170)); // Muzzle flash
      rectfill(gx - 10, gy - 80, 20, 20, rgba8(255, 255, 255, 255));
    }
  }
}

// trigger rebuild update

console.log('Force Reload successful');
