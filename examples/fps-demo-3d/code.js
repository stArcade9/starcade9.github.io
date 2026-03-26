// NEO-DOOM: FAST, BRIGHT, FUN ARENA SHOOTER
// 3 levels, 4 enemy types, pickups, boss fights

let gameTime = 0;
let gameState = 'start'; // start, playing, gameover, levelclear, victory

let player = {
  x: 2,
  y: 1.5,
  z: 2,
  yaw: 0,
  pitch: 0,
  health: 100,
  armor: 0,
  score: 0,
  ammo: 50,
};

let level = 1;
let kills = 0;
let totalEnemies = 0;
let levelClearTimer = 0;

let entities = {
  walls: [],
  enemies: [],
  bullets: [],
  particles: [],
  pickups: [],
  enemyBullets: [],
};

// 3 maps with different layouts and enemy compositions
const MAPS = [
  // Level 1: Classic maze (grunts only)
  [
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
  ],
  // Level 2: Open arena with pillars (grunts + shooters)
  [
    '########################',
    '#......................#',
    '#..##..S.......##..S..#',
    '#..##..........##.....#',
    '#......E..............#',
    '#...........##........#',
    '#..S........##....S...#',
    '#.........E.......E...#',
    '#...##................#',
    '#...##.....S....##....#',
    '#.........E.....##....#',
    '#..E..............S...#',
    '#.......##............#',
    '#.......##.....E......#',
    '########################',
  ],
  // Level 3: Corridors (grunts + shooters + tanks + boss)
  [
    '########################',
    '#..T...#......#...S...#',
    '#.####.#.####.#.####..#',
    '#......#.#..#.#.#.....#',
    '#.##.###.#..#...#.###.#',
    '#....S...#..#####.T...#',
    '#.######.#............#',
    '#........####.####.####',
    '#.####.#.......#...S..#',
    '#.T....#.#####.#.####.#',
    '#.######.#...#.#......#',
    '#........#.B.#...####.#',
    '#.####.###...###......#',
    '#.S....................#',
    '########################',
  ],
];

const MAT = {
  floor: { material: 'standard', color: 0x223344, roughness: 1.0 },
  wall: { material: 'standard', color: 0xdddddd, roughness: 0.8 },
  wallColor: { material: 'standard', color: 0x00aaff, roughness: 0.8 },
  wall2: { material: 'standard', color: 0xff6600, roughness: 0.8 },
  wall3: { material: 'standard', color: 0xcc00ff, roughness: 0.8 },
  enemy: { material: 'emissive', color: 0xff3300, intensity: 2.0 },
  enemyEye: { material: 'emissive', color: 0xffffff, intensity: 3.0 },
  shooter: { material: 'emissive', color: 0x00ff44, intensity: 2.0 },
  tank: { material: 'emissive', color: 0x9933ff, intensity: 2.0 },
  boss: { material: 'emissive', color: 0xffcc00, intensity: 3.0 },
  bullet: { material: 'emissive', color: 0x00ffcc, intensity: 4.0 },
  enemyBullet: { material: 'emissive', color: 0xff4400, intensity: 3.0 },
  particle: { material: 'emissive', color: 0xffaa00, intensity: 2.0 },
  healthPickup: { material: 'emissive', color: 0x00ff44, intensity: 3.0 },
  ammoPickup: { material: 'emissive', color: 0xffcc00, intensity: 3.0 },
  armorPickup: { material: 'emissive', color: 0x4488ff, intensity: 3.0 },
};

let mouseInit = false;

export function init() {
  setFog(0x001122, 5, 80);
  setAmbientLight(0xffffff, 0.6);
  setDirectionalLight([-1, -2, -1], 0xffffee, 1.2);

  let floor = createPlane(200, 200, 0x112233, [0, 0, 0], MAT.floor);
  setRotation(floor, -Math.PI / 2, 0, 0);

  if (!mouseInit) {
    mouseInit = true;
    document.addEventListener('mousedown', () => {
      if (!document.pointerLockElement) {
        document.body.requestPointerLock().catch(() => {});
      }
      if (gameState === 'start' || gameState === 'gameover' || gameState === 'victory') {
        startGame(1);
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
  for (let b of entities.enemyBullets) destroyMesh(b.m);
  for (let p of entities.particles) destroyMesh(p.m);
  for (let p of entities.pickups) destroyMesh(p.m);
  entities = { walls: [], enemies: [], bullets: [], particles: [], pickups: [], enemyBullets: [] };
}

function startGame(lvl) {
  cleanupLevel();
  gameState = 'playing';
  gameTime = 0;
  level = lvl;
  kills = 0;
  totalEnemies = 0;
  levelClearTimer = 0;

  // Full reset on level 1, keep stats on level transitions
  if (lvl === 1) {
    player.health = 100;
    player.armor = 0;
    player.score = 0;
    player.ammo = 50;
  }
  // Bonus ammo each level
  player.ammo += lvl > 1 ? 25 : 0;

  const map = MAPS[lvl - 1];
  const SIZE = 4;
  let accentMat = lvl === 1 ? MAT.wallColor : lvl === 2 ? MAT.wall2 : MAT.wall3;

  for (let z = 0; z < map.length; z++) {
    for (let x = 0; x < map[z].length; x++) {
      let char = map[z][x];
      let px = (x - 12) * SIZE;
      let pz = (z - 7) * SIZE;

      if (char === '#') {
        let isColor = (x + z) % 3 === 0;
        let m = createCube(
          SIZE,
          isColor ? accentMat.color : MAT.wall.color,
          [px, 3, pz],
          isColor ? accentMat : MAT.wall
        );
        setScale(m, 1, 1.5, 1);
        entities.walls.push({ m, x: px, z: pz, r: SIZE / 2 });
      } else if (char === 'E') {
        spawnEnemy(px, pz, 'grunt');
        totalEnemies++;
      } else if (char === 'S') {
        spawnEnemy(px, pz, 'shooter');
        totalEnemies++;
      } else if (char === 'T') {
        spawnEnemy(px, pz, 'tank');
        totalEnemies++;
      } else if (char === 'B') {
        spawnEnemy(px, pz, 'boss');
        totalEnemies++;
      }
    }
  }

  player.x = -11 * SIZE;
  player.z = -6 * SIZE;
  player.yaw = Math.PI / 4;
  player.pitch = 0;
}

function spawnEnemy(x, z, type) {
  let mat, hp, spd, size, dmg;
  switch (type) {
    case 'shooter':
      mat = MAT.shooter;
      hp = 5;
      spd = 0.1 + Math.random() * 0.05;
      size = 1.5;
      dmg = 8;
      break;
    case 'tank':
      mat = MAT.tank;
      hp = 12;
      spd = 0.08;
      size = 2.2;
      dmg = 20;
      break;
    case 'boss':
      mat = MAT.boss;
      hp = 40 + level * 10;
      spd = 0.12;
      size = 3.5;
      dmg = 15;
      break;
    default: // grunt
      mat = MAT.enemy;
      hp = 3;
      spd = 0.15 + Math.random() * 0.1;
      size = 1.5;
      dmg = 10;
      break;
  }
  let m1 = createCube(size, mat.color, [x, 2, z], mat);
  let m2 = createCube(size * 0.5, MAT.enemyEye.color, [x, 2.5, z + 0.5], MAT.enemyEye);
  entities.enemies.push({
    m1,
    m2,
    x,
    z,
    y: 2,
    health: hp,
    maxHealth: hp,
    speed: spd,
    type,
    dmg,
    size,
    fireTimer: 0,
  });
}

function getWallCollision(nx, nz, radius) {
  for (let w of entities.walls) {
    if (Math.abs(nx - w.x) < w.r + radius && Math.abs(nz - w.z) < w.r + radius) return true;
  }
  return false;
}

function shoot() {
  if (player.ammo <= 0) return;
  player.ammo--;

  let fx = Math.sin(player.yaw) * Math.cos(player.pitch);
  let fy = Math.sin(player.pitch);
  let fz = Math.cos(player.yaw) * Math.cos(player.pitch);

  // Spawn bullet from camera/head height, offset slightly down and right for gun position
  let headY = player.y + 1.0;
  let rx = Math.cos(player.yaw);
  let rz = -Math.sin(player.yaw);
  let bx = player.x + fx * 1.5 + rx * 0.3;
  let by = headY + fy * 1.5 - 0.3;
  let bz = player.z + fz * 1.5 + rz * 0.3;

  let m = createCube(0.2, MAT.bullet.color, [bx, by, bz], MAT.bullet);
  setScale(m, 1, 1, 6);
  setRotation(m, -player.pitch, player.yaw, 0);

  entities.bullets.push({ m, x: bx, y: by, z: bz, vx: fx * 3, vy: fy * 3, vz: fz * 3, life: 30 });
  sfx('laser');
}

function enemyShoot(e, angleOffset) {
  let dx = player.x - e.x;
  let dy = player.y + 1 - e.y;
  let dz = player.z - e.z;
  let hDist = Math.hypot(dx, dz);
  if (hDist < 0.1) return;

  let baseAngle = Math.atan2(dx, dz) + (angleOffset || 0);
  let dist3d = Math.hypot(dx, dy, dz);
  let spd = e.type === 'boss' ? 2.0 : 1.5;
  let bx = e.x,
    by = e.y + 0.5,
    bz = e.z;
  let m = createCube(0.3, MAT.enemyBullet.color, [bx, by, bz], MAT.enemyBullet);

  entities.enemyBullets.push({
    m,
    x: bx,
    y: by,
    z: bz,
    vx: Math.sin(baseAngle) * spd,
    vy: (dy / dist3d) * spd,
    vz: Math.cos(baseAngle) * spd,
    life: 60,
    dmg: e.type === 'boss' ? 12 : 8,
  });
}

function spawnPickup(x, y, z) {
  let r = Math.random();
  let type, mat;
  if (r < 0.4) {
    type = 'ammo';
    mat = MAT.ammoPickup;
  } else if (r < 0.75) {
    type = 'health';
    mat = MAT.healthPickup;
  } else {
    type = 'armor';
    mat = MAT.armorPickup;
  }

  let m = createCube(0.6, mat.color, [x, y, z], mat);
  entities.pickups.push({ m, x, y, z, type, life: 600 });
}

function spawnGibs(cx, cy, cz, color, count) {
  for (let i = 0; i < count; i++) {
    let m = createCube(0.3, color, [cx, cy, cz], { material: 'emissive', color, intensity: 2 });
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

function applyDamage(dmg) {
  if (player.armor > 0) {
    let absorbed = Math.min(player.armor, Math.floor(dmg * 0.6));
    player.armor -= absorbed;
    dmg -= absorbed;
  }
  player.health -= dmg;
  setFog(0xff0000, 1, 20);
  sfx('hit');
  if (player.health <= 0) {
    gameState = 'gameover';
    sfx('death');
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

export function update() {
  gameTime++;

  // Level clear transition
  if (gameState === 'levelclear') {
    levelClearTimer--;
    if (levelClearTimer <= 0) {
      if (level >= 3) {
        gameState = 'victory';
        if (document.pointerLockElement) document.exitPointerLock();
      } else {
        startGame(level + 1);
      }
    }
    let headY = player.y + 1.0;
    setCameraPosition(player.x, headY, player.z);
    setCameraTarget(
      player.x + Math.sin(player.yaw),
      headY + Math.sin(player.pitch),
      player.z + Math.cos(player.yaw)
    );
    return;
  }

  if (gameState !== 'playing') {
    let r = 40;
    setCameraPosition(Math.sin(gameTime * 0.005) * r, 30, Math.cos(gameTime * 0.005) * r);
    setCameraTarget(0, 0, 0);
    return;
  }

  // Player Movement
  let speed = 0.35;
  let fx = Math.sin(player.yaw);
  let fz = Math.cos(player.yaw);
  let rx = Math.cos(player.yaw);
  let rz = -Math.sin(player.yaw);

  let dx = 0,
    dz = 0;
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

  let len = Math.hypot(dx, dz);
  if (len > 0) {
    dx = (dx / len) * speed;
    dz = (dz / len) * speed;
  }

  let plrRadius = 1.0;
  if (!getWallCollision(player.x + dx, player.z, plrRadius)) player.x += dx;
  if (!getWallCollision(player.x, player.z + dz, plrRadius)) player.z += dz;

  if (len > 0) player.y = 1.5 + Math.sin(gameTime * 0.4) * 0.2;
  else player.y = 1.5 + Math.sin(gameTime * 0.05) * 0.05;

  // Camera
  let headY = player.y + 1.0;
  let tx = player.x + Math.sin(player.yaw) * Math.cos(player.pitch);
  let ty = headY + Math.sin(player.pitch);
  let tz = player.z + Math.cos(player.yaw) * Math.cos(player.pitch);
  setCameraPosition(player.x, headY, player.z);
  setCameraTarget(tx, ty, tz);
  setCameraFOV(100);

  // Shooting
  if ((mouseDown() || key('Space') || btn('A')) && gameTime % 4 === 0) {
    shoot();
    if (player.ammo > 0) player.pitch += 0.02;
  }

  // Update Player Bullets
  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    let b = entities.bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.z += b.vz;
    setPosition(b.m, b.x, b.y, b.z);
    b.life--;
    let hit = false;

    for (let j = entities.enemies.length - 1; j >= 0; j--) {
      let e = entities.enemies[j];
      let hitR = e.size * 0.6;
      if (Math.hypot(b.x - e.x, b.z - e.z) < hitR + 0.5 && Math.abs(b.y - e.y) < hitR + 1.0) {
        hit = true;
        e.health -= 1;
        spawnGibs(b.x, b.y, b.z, 0xffaa00, 3);
        if (e.health <= 0) {
          destroyMesh(e.m1);
          destroyMesh(e.m2);
          entities.enemies.splice(j, 1);
          kills++;
          let pts =
            e.type === 'boss' ? 1000 : e.type === 'tank' ? 300 : e.type === 'shooter' ? 200 : 100;
          player.score += pts;
          let gibColor =
            e.type === 'boss'
              ? 0xffcc00
              : e.type === 'tank'
                ? 0x9933ff
                : e.type === 'shooter'
                  ? 0x00ff44
                  : 0xff3300;
          spawnGibs(e.x, e.y, e.z, gibColor, 15);
          sfx('explosion');
          if (Math.random() < 0.6) spawnPickup(e.x, 1, e.z);
        } else {
          sfx('hit');
        }
        break;
      }
    }

    if (!hit && getWallCollision(b.x, b.z, 0)) {
      hit = true;
      spawnGibs(b.x, b.y, b.z, 0x00ffff, 4);
    }
    if (b.life <= 0 || hit) {
      destroyMesh(b.m);
      entities.bullets.splice(i, 1);
    }
  }

  // Update Enemy Bullets
  for (let i = entities.enemyBullets.length - 1; i >= 0; i--) {
    let b = entities.enemyBullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.z += b.vz;
    setPosition(b.m, b.x, b.y, b.z);
    b.life--;
    let hit = false;

    if (Math.hypot(b.x - player.x, b.z - player.z) < 1.5 && Math.abs(b.y - player.y) < 2.0) {
      hit = true;
      applyDamage(b.dmg);
    }
    if (!hit && getWallCollision(b.x, b.z, 0)) hit = true;
    if (b.life <= 0 || hit) {
      destroyMesh(b.m);
      entities.enemyBullets.splice(i, 1);
    }
  }

  // Update Enemies
  for (let i = entities.enemies.length - 1; i >= 0; i--) {
    let e = entities.enemies[i];
    let dist = Math.hypot(player.x - e.x, player.z - e.z);

    // Movement - shooters keep distance, others charge
    let minDist = e.type === 'shooter' ? 8 : 1.5;
    if (dist < 30 && dist > minDist) {
      let ex = e.x + ((player.x - e.x) / dist) * e.speed;
      let ez = e.z + ((player.z - e.z) / dist) * e.speed;
      if (!getWallCollision(ex, e.z, 1.2)) e.x = ex;
      if (!getWallCollision(e.x, ez, 1.2)) e.z = ez;
    }
    // Shooters retreat if too close
    if (e.type === 'shooter' && dist < 6 && dist > 0.1) {
      let ex = e.x - ((player.x - e.x) / dist) * e.speed * 0.5;
      let ez = e.z - ((player.z - e.z) / dist) * e.speed * 0.5;
      if (!getWallCollision(ex, e.z, 1.2)) e.x = ex;
      if (!getWallCollision(e.x, ez, 1.2)) e.z = ez;
    }

    // Animate
    let t = gameTime * 0.1 + i;
    e.y = e.type === 'boss' ? 3 + Math.sin(t) * 0.8 : 2 + Math.sin(t) * 0.5;
    setPosition(e.m1, e.x, e.y, e.z);
    setRotation(e.m1, t, t, 0);

    let eyeYaw = Math.atan2(player.x - e.x, player.z - e.z);
    let eyeOff = e.size * 0.5;
    setPosition(
      e.m2,
      e.x + Math.sin(eyeYaw) * eyeOff,
      e.y + e.size * 0.3,
      e.z + Math.cos(eyeYaw) * eyeOff
    );
    setRotation(e.m2, 0, eyeYaw, 0);

    // Ranged attacks (shooters + boss)
    if ((e.type === 'shooter' || e.type === 'boss') && dist < 25) {
      e.fireTimer++;
      let fireRate = e.type === 'boss' ? 45 : 90;
      if (e.fireTimer >= fireRate) {
        e.fireTimer = 0;
        enemyShoot(e, 0);
        if (e.type === 'boss') {
          enemyShoot(e, -0.15);
          enemyShoot(e, 0.15);
        }
      }
    }

    // Melee attack (not shooters)
    if (e.type !== 'shooter' && dist < 2.0 && gameTime % 15 === 0) {
      applyDamage(e.dmg);
    }
  }

  // Update Pickups
  for (let i = entities.pickups.length - 1; i >= 0; i--) {
    let p = entities.pickups[i];
    p.life--;
    let py = p.y + Math.sin(gameTime * 0.1 + i) * 0.3;
    setPosition(p.m, p.x, py, p.z);
    setRotation(p.m, 0, gameTime * 0.05, 0);

    // Collect
    if (Math.hypot(player.x - p.x, player.z - p.z) < 2.0) {
      let picked = false;
      if (p.type === 'health' && player.health < 100) {
        player.health = Math.min(100, player.health + 25);
        sfx('powerup');
        picked = true;
      } else if (p.type === 'ammo') {
        player.ammo += 20;
        sfx('coin');
        picked = true;
      } else if (p.type === 'armor' && player.armor < 100) {
        player.armor = Math.min(100, player.armor + 25);
        sfx('powerup');
        picked = true;
      }
      if (picked) {
        destroyMesh(p.m);
        entities.pickups.splice(i, 1);
        continue;
      }
    }
    if (p.life <= 0) {
      destroyMesh(p.m);
      entities.pickups.splice(i, 1);
    }
  }

  // Particles
  for (let i = entities.particles.length - 1; i >= 0; i--) {
    let p = entities.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    p.vy -= 0.1;
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

  // Level clear check
  if (entities.enemies.length === 0 && kills >= totalEnemies && totalEnemies > 0) {
    gameState = 'levelclear';
    levelClearTimer = 180;
    player.score += level * 500;
    sfx('powerup');
  }

  // Restore fog (color per level)
  if (player.health > 0) {
    let fogColor = level === 1 ? 0x001122 : level === 2 ? 0x221100 : 0x110022;
    setFog(fogColor, 5, 80);
  }
}

export function draw() {
  if (gameState === 'start') {
    rectfill(0, 0, 640, 360, rgba8(0, 0, 0, 187));
    print('NEO-DOOM', 100, 80, rgba8(0, 255, 204, 255));
    print('3 LEVELS OF DEMON CARNAGE', 60, 110, rgba8(255, 100, 0, 255));
    print('CLICK TO START AND LOCK MOUSE', 50, 150, rgba8(255, 255, 255, 255));
    print('WASD Move | Mouse Aim | Click Shoot', 30, 180, rgba8(170, 170, 170, 255));
  } else if (gameState === 'gameover') {
    rectfill(0, 0, 640, 360, rgba8(187, 0, 0, 187));
    print('YOU DIED', 120, 80, rgba8(255, 255, 255, 255));
    print(`LEVEL ${level}  KILLS: ${kills}/${totalEnemies}`, 80, 110, rgba8(255, 170, 0, 255));
    print(`FINAL SCORE: ${player.score}`, 90, 140, rgba8(255, 170, 0, 255));
    print('CLICK TO RESTART', 90, 190, rgba8(170, 170, 170, 255));
  } else if (gameState === 'victory') {
    rectfill(0, 0, 640, 360, rgba8(0, 50, 0, 200));
    print('VICTORY!', 120, 70, rgba8(0, 255, 100, 255));
    print('ALL DEMONS SLAIN', 90, 100, rgba8(255, 255, 255, 255));
    print(`FINAL SCORE: ${player.score}`, 90, 140, rgba8(255, 170, 0, 255));
    print('CLICK TO PLAY AGAIN', 80, 190, rgba8(170, 170, 170, 255));
  } else if (gameState === 'levelclear') {
    drawHUD();
    rectfill(60, 90, 200, 50, rgba8(0, 0, 0, 200));
    print(`LEVEL ${level} CLEAR!`, 95, 100, rgba8(0, 255, 100, 255));
    print(`+${level * 500} BONUS`, 110, 120, rgba8(255, 170, 0, 255));
  } else {
    drawHUD();
  }
}

function drawHUD() {
  // Health bar
  let hColor = player.health > 30 ? rgba8(0, 255, 100, 255) : rgba8(255, 0, 0, 255);
  drawProgressBar(10, 220, 80, 8, Math.max(0, player.health) / 100, hColor, rgba8(50, 50, 50, 200));
  print(`HP: ${Math.max(0, player.health)}`, 10, 210, hColor);

  // Armor bar
  if (player.armor > 0) {
    drawProgressBar(
      10,
      200,
      80,
      6,
      player.armor / 100,
      rgba8(68, 136, 255, 255),
      rgba8(50, 50, 50, 200)
    );
    print(`ARM: ${player.armor}`, 10, 190, rgba8(68, 136, 255, 255));
  }

  // Ammo
  let ammoColor = player.ammo > 10 ? rgba8(255, 204, 0, 255) : rgba8(255, 50, 50, 255);
  print(`AMMO: ${player.ammo}`, 260, 218, ammoColor);
  if (player.ammo <= 0) print('NO AMMO!', 130, 135, rgba8(255, 50, 50, 255));

  // Score + Level + Kills
  print(`SCORE: ${player.score}`, 120, 5, rgba8(255, 170, 0, 255));
  print(`LEVEL ${level}`, 10, 5, rgba8(0, 255, 204, 255));
  print(`KILLS: ${kills}/${totalEnemies}`, 240, 5, rgba8(255, 255, 255, 255));

  // Crosshair
  rectfill(159, 119, 3, 3, rgba8(255, 255, 255, 200));
  rectfill(151, 120, 6, 1, rgba8(255, 255, 255, 150));
  rectfill(164, 120, 6, 1, rgba8(255, 255, 255, 150));
  rectfill(160, 111, 1, 6, rgba8(255, 255, 255, 150));
  rectfill(160, 124, 1, 6, rgba8(255, 255, 255, 150));

  // Gun
  let isMoving = key('KeyW') || key('KeyS') || key('KeyA') || key('KeyD');
  let bobX = isMoving ? Math.sin(gameTime * 0.3) * 10 : 0;
  let bobY = isMoving ? Math.abs(Math.sin(gameTime * 0.3)) * 10 : 0;
  let recoil = mouseDown() && gameTime % 4 < 2 ? 15 : 0;
  let gx = 160 + bobX;
  let gy = 260 + bobY + recoil;

  rectfill(gx - 15, gy - 60, 30, 100, rgba8(51, 51, 51, 255));
  rectfill(gx - 20, gy - 20, 40, 80, rgba8(85, 85, 85, 255));
  rectfill(gx - 5, gy - 70, 10, 60, rgba8(0, 255, 204, 255));

  if (recoil) {
    rectfill(gx - 25, gy - 90, 50, 40, rgba8(0, 255, 204, 170));
    rectfill(gx - 10, gy - 80, 20, 20, rgba8(255, 255, 255, 255));
  }
}
