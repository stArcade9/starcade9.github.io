// WADLoader, WADTextureManager, convertWADMap, setWallUVs are provided by the Nova64 runtime
// FREEDOOM WAD EXPLORER — Browse & play through classic DOOM levels via FreeDoom

export const env = {
  meta: {
    name: 'FreeDoom WAD Explorer',
    version: '1.0.0',
    author: 'Nova64',
    description: 'Explore classic DOOM levels from the open-source FreeDoom WAD',
  },
};

// ── State ──
let gameTime = 0;
let gameState = 'loading'; // loading, menu, playing, gameover, levelclear, victory
let loadProgress = 0;
let loadError = null;

let wadLoader = null;
let texMgr = null;
let mapNames = [];
let currentMapIdx = 0;
let menuClickReady = false;
let menuEnterTime = 0;

let player = { x: 0, y: 1.5, z: 0, yaw: 0, pitch: 0, health: 100, armor: 0, ammo: 50, score: 0 };
let playerFloorBase = 0; // Y offset of the floor the player stands on
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
let enemyLights = [];
let floorMesh = null;
let ceilingMesh = null;

let mouseInit = false;
let shake = null;
let damageFlash = 0;
let killFlash = 0;
let muzzleFlash = 0;
let shootCooldown = 0;

// ── Materials ──
const MAT = {
  floor: { material: 'standard', color: 0x223344, roughness: 1.0 },
  wall: { material: 'standard', color: 0xdddddd, roughness: 0.8 },
  enemy: { material: 'emissive', color: 0xff3300, intensity: 2.0 },
  enemyEye: { material: 'emissive', color: 0xffffff, intensity: 3.0 },
  shooter: { material: 'emissive', color: 0x00ff44, intensity: 2.0 },
  tank: { material: 'emissive', color: 0x9933ff, intensity: 2.0 },
  boss: { material: 'emissive', color: 0xffcc00, intensity: 3.0 },
  bullet: { material: 'emissive', color: 0x00ffcc, intensity: 4.0 },
  enemyBullet: { material: 'emissive', color: 0xff4400, intensity: 3.0 },
  healthPickup: { material: 'emissive', color: 0x00ff44, intensity: 3.0 },
  ammoPickup: { material: 'emissive', color: 0xffcc00, intensity: 3.0 },
  armorPickup: { material: 'emissive', color: 0x4488ff, intensity: 3.0 },
};

const ACCENT_COLORS = [0x00aaff, 0xff6600, 0xcc00ff, 0x00ff88, 0xff0066, 0xffaa00];
const FOG_COLORS = [0x001122, 0x221100, 0x110022, 0x002211, 0x220011, 0x111122];

// ── Init ──
export function init() {
  shake = createShake({ maxIntensity: 8, decay: 0.88, noiseScale: 0.15 });
  setFog(0x001122, 8, 80);
  setAmbientLight(0x334466, 0.4);
  setDirectionalLight([-1, -2, -1], 0xaabbdd, 0.8);

  floorMesh = createPlane(400, 400, 0x112233, [0, 0, 0], MAT.floor);
  setRotation(floorMesh, -Math.PI / 2, 0, 0);
  ceilingMesh = createPlane(400, 400, 0x0a0a15, [0, 12, 0], {
    material: 'standard',
    color: 0x0a0a15,
    roughness: 1.0,
  });
  setRotation(ceilingMesh, Math.PI / 2, 0, 0);

  if (!mouseInit) {
    mouseInit = true;
    document.addEventListener('mousedown', () => {
      if (!document.pointerLockElement && gameState === 'playing') {
        document.body.requestPointerLock().catch(() => {});
      }
      if (gameState === 'gameover' || gameState === 'victory') {
        currentMapIdx = 0;
        gameState = 'menu';
        menuClickReady = false;
        menuEnterTime = gameTime;
      }
    });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement && gameState === 'playing') {
        player.yaw -= e.movementX * 0.0025;
        player.pitch -= e.movementY * 0.0022;
        player.pitch = Math.max(-1.0, Math.min(1.0, player.pitch));
      }
    });

    // Drag-and-drop WAD loading (fallback if file not on server)
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', async e => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file && file.name.toLowerCase().endsWith('.wad')) await loadWADFromFile(file);
    });

    // Keyboard handling
    document.addEventListener('keydown', e => {
      // Prevent Enter/Space/Arrows from triggering browser defaults in menu
      // Stop Enter/Space from reaching Nova64 console's START handler (which reloads the cart)
      if (gameState === 'menu' && ['Enter', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (gameState === 'playing' && e.code === 'Enter') {
        e.stopPropagation();
      }

      // Direct menu input handling via DOM events (more reliable than keyp)
      if (gameState === 'menu') {
        if (e.code === 'ArrowUp' && currentMapIdx > 0) {
          currentMapIdx--;
        }
        if (e.code === 'ArrowDown' && currentMapIdx < mapNames.length - 1) {
          currentMapIdx++;
        }
        if (e.code === 'Enter') {
          startLevel();
        }
      }

      if (e.code === 'KeyL' && (gameState === 'loading' || gameState === 'missing')) {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.wad';
        inp.onchange = async () => {
          if (inp.files[0]) await loadWADFromFile(inp.files[0]);
        };
        inp.click();
      }
    });
  }

  // Load WAD
  loadWAD();
}

async function loadWAD() {
  try {
    const resp = await fetch('/freedoom1.wad');
    if (!resp.ok) {
      gameState = 'missing';
      return;
    }
    const total = parseInt(resp.headers.get('content-length') || '0', 10);
    const reader = resp.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total > 0) loadProgress = received / total;
    }

    const buf = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      buf.set(chunk, offset);
      offset += chunk.length;
    }

    wadLoader = new WADLoader();
    wadLoader.load(buf.buffer);
    mapNames = wadLoader.getMapNames();

    if (mapNames.length === 0) {
      loadError = 'No maps found in WAD';
      return;
    }

    // Initialize texture manager
    texMgr = new WADTextureManager(wadLoader);
    texMgr.init();

    gameState = 'menu';
    menuClickReady = false;
    menuEnterTime = gameTime;
  } catch (err) {
    gameState = 'missing';
    console.error('WAD load failed:', err);
  }
}

async function loadWADFromFile(file) {
  gameState = 'loading';
  loadProgress = 0;
  loadError = null;
  try {
    const buf = await file.arrayBuffer();
    loadProgress = 1;
    wadLoader = new WADLoader();
    wadLoader.load(buf);
    mapNames = wadLoader.getMapNames();
    if (mapNames.length === 0) {
      loadError = 'No maps found in WAD';
      return;
    }
    // Initialize texture manager
    texMgr = new WADTextureManager(wadLoader);
    texMgr.init();

    gameState = 'menu';
    menuClickReady = false;
    menuEnterTime = gameTime;
  } catch (err) {
    loadError = 'Invalid WAD file: ' + err.message;
    console.error('WAD parse error:', err);
  }
}

// ── Level building ──

function cleanupLevel() {
  for (let w of entities.walls) if (w.m) destroyMesh(w.m);
  for (let e of entities.enemies) {
    destroyMesh(e.body);
    destroyMesh(e.head);
    if (e.detail) destroyMesh(e.detail);
    if (e.sprite) destroyMesh(e.sprite);
    if (e.light) removeLight(e.light);
  }
  for (let b of entities.bullets) destroyMesh(b.m);
  for (let b of entities.enemyBullets) destroyMesh(b.m);
  for (let p of entities.particles) destroyMesh(p.m);
  for (let p of entities.pickups) destroyMesh(p.m);
  for (let p of entities.pickups) if (p.sprite) destroyMesh(p.sprite);
  for (let l of enemyLights) removeLight(l);
  enemyLights = [];
  entities = { walls: [], enemies: [], bullets: [], particles: [], pickups: [], enemyBullets: [] };
}

function startLevel() {
  try {
    _startLevelInner();
  } catch (err) {
    console.error('startLevel() crashed:', err);
    // Still transition to playing even if textures fail
    gameState = 'playing';
  }
}

function _startLevelInner() {
  cleanupLevel();
  gameState = 'playing';
  gameTime = 0;
  kills = 0;
  totalEnemies = 0;
  levelClearTimer = 0;
  damageFlash = 0;
  killFlash = 0;
  muzzleFlash = 0;
  shootCooldown = 0;

  player.health = 100;
  player.armor = 0;
  player.ammo = 50;

  const mapName = mapNames[currentMapIdx];
  const mapData = wadLoader.getMap(mapName);
  if (!mapData) return;

  const converted = convertWADMap(mapData);
  const accent = ACCENT_COLORS[currentMapIdx % ACCENT_COLORS.length];
  const SCALE = 1 / 20; // WAD coordinate scale factor

  // Build walls
  for (let i = 0; i < converted.walls.length; i++) {
    const w = converted.walls[i];
    const bri = w.light || 0.5;

    // Try to apply WAD texture
    let textured = false;
    if (texMgr && w.texName) {
      const tex = texMgr.getWallTexture(w.texName);
      if (tex) {
        const m = createCube(1, 0xffffff, [w.x, w.y, w.z], {
          material: 'standard',
          roughness: 0.9,
        });
        setScale(m, w.len, w.h, 0.5);
        setRotation(m, 0, w.ang, 0);

        // Set UV tiling for correct texture mapping
        const texDef = texMgr.getTextureDef(w.texName);
        if (texDef) {
          setWallUVs(m, w.len / SCALE, w.h / SCALE, texDef.width, texDef.height, w.xoff, w.yoff);
        }

        // Apply texture with sector lighting
        const mesh = getMesh(m);
        mesh.material = new THREE.MeshPhongMaterial({
          map: tex,
          color: new THREE.Color(bri, bri, bri),
        });

        entities.walls.push({ m, x: w.x, z: w.z, r: 0 });
        textured = true;
      }
    }

    if (!textured) {
      // Fallback: solid color
      const isAccent = i % 4 === 0 || w.step;
      let color, mat;

      if (w.step) {
        mat = { material: 'emissive', color: accent, intensity: 0.5 * bri };
        color = accent;
      } else if (isAccent) {
        mat = { material: 'emissive', color: accent, intensity: 0.2 * bri };
        color = accent;
      } else {
        const v = Math.floor(bri * 180 + 40);
        color = (v << 16) | (v << 8) | v;
        mat = { material: 'standard', color, roughness: 0.85 };
      }

      const m = createCube(1, color, [w.x, w.y, w.z], mat);
      setScale(m, w.len, w.h, 0.5);
      setRotation(m, 0, w.ang, 0);
      entities.walls.push({ m, x: w.x, z: w.z, r: 0 });
    }
  }

  // Collision
  for (const seg of converted.colSegs) {
    entities.walls.push({ m: null, x: seg.x, z: seg.z, r: seg.r });
  }

  // Enemies (cap 60)
  const maxEnemies = 60;
  for (const e of converted.enemies.slice(0, maxEnemies)) {
    spawnEnemy(e.x, e.z, e.type, e.doomType);
    totalEnemies++;
  }

  // Pickups
  for (const item of converted.items) {
    spawnPickupAt(item.x, 1, item.z, item.type, item.doomType);
  }

  // Player start — set Y to the sector floor height the player starts on
  playerFloorBase = converted.playerStart.floorH || 0;
  player.x = converted.playerStart.x;
  player.z = converted.playerStart.z;
  player.y = playerFloorBase + 1.0;
  player.yaw = converted.playerStart.angle;
  player.pitch = 0;

  setFog(FOG_COLORS[currentMapIdx % FOG_COLORS.length], 20, 150);

  // Add a floor plane
  const floorSize = 400;
  const floor = createPlane(floorSize, floorSize, 0x222222, [0, 0, 0]);
  setRotation(floor, -Math.PI / 2, 0, 0);
  entities.walls.push({ m: floor, x: 0, z: 0, r: 0 });

  // Texture the floor with the most common floor flat
  if (texMgr && converted.sectors) {
    const flatCounts = {};
    for (const s of converted.sectors) {
      if (s.floorFlat && s.floorFlat !== '-' && s.floorFlat !== 'F_SKY1') {
        flatCounts[s.floorFlat] = (flatCounts[s.floorFlat] || 0) + 1;
      }
    }
    const sorted = Object.entries(flatCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const flatTex = texMgr.getFlatTexture(sorted[0][0]);
      if (flatTex) {
        const floorTex = flatTex.clone();
        // 64 DOOM pixels per flat tile at scale 1/20 = 3.2 world units
        const tilesPerUnit = 20 / 64;
        floorTex.repeat.set(floorSize * tilesPerUnit, floorSize * tilesPerUnit);
        floorTex.wrapS = THREE.RepeatWrapping;
        floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.needsUpdate = true;
        const floorMesh = getMesh(floor);
        floorMesh.material = new THREE.MeshPhongMaterial({
          map: floorTex,
          side: THREE.DoubleSide,
        });
      }
    }
  }
}

// ── Enemy spawning ──

function spawnEnemy(x, z, type, doomType) {
  let mat, hp, spd, size, dmg, detailMat;
  switch (type) {
    case 'shooter':
      mat = MAT.shooter;
      detailMat = { material: 'emissive', color: 0x88ffaa, intensity: 1.5 };
      hp = 8;
      spd = 4.5;
      size = 1.4;
      dmg = 10;
      break;
    case 'tank':
      mat = MAT.tank;
      detailMat = { material: 'emissive', color: 0xcc66ff, intensity: 1.5 };
      hp = 20;
      spd = 2.5;
      size = 2.4;
      dmg = 20;
      break;
    case 'boss':
      mat = MAT.boss;
      detailMat = { material: 'emissive', color: 0xffee88, intensity: 2.0 };
      hp = 60;
      spd = 3.5;
      size = 3.5;
      dmg = 18;
      break;
    default:
      mat = MAT.enemy;
      detailMat = { material: 'emissive', color: 0xff8844, intensity: 1.5 };
      hp = 5;
      spd = 5.5;
      size = 1.4;
      dmg = 12;
      break;
  }

  let body = createCube(size, mat.color, [x, 2, z], mat);
  setScale(body, 0.7, 1.2, 0.7);
  let head = createCube(size * 0.55, MAT.enemyEye.color, [x, 2 + size * 0.7, z], MAT.enemyEye);
  setScale(head, 1, 0.6, 0.8);

  let detail = null;
  if (type === 'tank') {
    detail = createCube(size * 0.9, detailMat.color, [x, 2, z], detailMat);
    setScale(detail, 1.3, 0.3, 1.3);
  } else if (type === 'boss') {
    detail = createCube(size * 0.6, detailMat.color, [x, 2 + size, z], detailMat);
    setScale(detail, 1.5, 0.4, 0.5);
  } else if (type === 'shooter') {
    detail = createCube(size * 0.2, detailMat.color, [x, 2, z + size * 0.5], detailMat);
    setScale(detail, 0.4, 0.4, 2.0);
  }

  let light = null;
  if (enemyLights.length < 20) {
    light = createPointLight(mat.color, 1.2, 12, [x, 3, z]);
    enemyLights.push(light);
  }

  // WAD sprite billboard (if available, hide cube meshes)
  let sprite = null,
    spriteH = 0;
  if (texMgr && doomType) {
    const spriteInfo = texMgr.getSpriteTexture(doomType);
    if (spriteInfo) {
      const sc = 1 / 20;
      spriteH = spriteInfo.height * sc;
      const sprW = spriteInfo.width * sc;
      sprite = createPlane(sprW, spriteH, 0xffffff, [x, spriteH / 2, z]);
      const spriteMesh = getMesh(sprite);
      spriteMesh.material = new THREE.MeshBasicMaterial({
        map: spriteInfo.texture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
      });
      // Hide cube meshes
      getMesh(body).visible = false;
      getMesh(head).visible = false;
      if (detail) getMesh(detail).visible = false;
    }
  }

  entities.enemies.push({
    body,
    head,
    detail,
    light,
    sprite,
    spriteH,
    x,
    z,
    y: 2,
    health: hp,
    maxHealth: hp,
    speed: spd,
    type,
    dmg,
    size,
    fireTimer: Math.random() * 60,
    hitFlash: 0,
  });
}

// ── Collision ──

function getWallCollision(nx, nz, radius) {
  for (let w of entities.walls) {
    if (w.r <= 0) continue;
    if (Math.abs(nx - w.x) < w.r + radius && Math.abs(nz - w.z) < w.r + radius) return true;
  }
  return false;
}

// ── Shooting ──

function shoot() {
  if (player.ammo <= 0 || shootCooldown > 0) return;
  player.ammo--;
  shootCooldown = 0.1;

  let fx = Math.sin(player.yaw) * Math.cos(player.pitch);
  let fy = Math.sin(player.pitch);
  let fz = Math.cos(player.yaw) * Math.cos(player.pitch);
  let headY = player.y + 1.0;
  let rx = Math.cos(player.yaw),
    rz = -Math.sin(player.yaw);
  let bx = player.x + fx * 1.5 + rx * 0.3;
  let by = headY + fy * 1.5 - 0.3;
  let bz = player.z + fz * 1.5 + rz * 0.3;

  let spread = 0.015;
  let sx = fx + (Math.random() - 0.5) * spread;
  let sy = fy + (Math.random() - 0.5) * spread;
  let sz = fz + (Math.random() - 0.5) * spread;
  let bulletSpeed = 80;

  let m = createCube(0.15, MAT.bullet.color, [bx, by, bz], MAT.bullet);
  setScale(m, 0.5, 0.5, 4);
  setRotation(m, -player.pitch, player.yaw, 0);

  entities.bullets.push({
    m,
    x: bx,
    y: by,
    z: bz,
    vx: sx * bulletSpeed,
    vy: sy * bulletSpeed,
    vz: sz * bulletSpeed,
    life: 1.5,
  });
  player.pitch += 0.015;
  muzzleFlash = 0.06;
  triggerShake(shake, 1.5);
  sfx('laser');
}

function enemyShoot(e, angleOffset) {
  let dx = player.x - e.x,
    dy = player.y + 1 - e.y,
    dz = player.z - e.z;
  let hDist = Math.hypot(dx, dz);
  if (hDist < 0.1) return;
  let baseAngle = Math.atan2(dx, dz) + (angleOffset || 0);
  let dist3d = Math.hypot(dx, dy, dz);
  let spd = e.type === 'boss' ? 28 : 22;
  let bx = e.x,
    by = e.y + 0.5,
    bz = e.z;
  let m = createCube(0.25, MAT.enemyBullet.color, [bx, by, bz], MAT.enemyBullet);
  setScale(m, 0.6, 0.6, 3);
  entities.enemyBullets.push({
    m,
    x: bx,
    y: by,
    z: bz,
    vx: Math.sin(baseAngle) * spd,
    vy: (dy / dist3d) * spd,
    vz: Math.cos(baseAngle) * spd,
    life: 3.0,
    dmg: e.type === 'boss' ? 15 : 10,
  });
}

// ── Pickups & Effects ──

function spawnPickupAt(x, y, z, type, doomType) {
  let mat =
    type === 'health' ? MAT.healthPickup : type === 'armor' ? MAT.armorPickup : MAT.ammoPickup;
  let m = createCube(0.6, mat.color, [x, y, z], mat);

  // WAD sprite for pickup (if available)
  let sprite = null,
    spriteH = 0;
  if (texMgr && doomType) {
    const spriteInfo = texMgr.getSpriteTexture(doomType);
    if (spriteInfo) {
      const sc = 1 / 20;
      spriteH = spriteInfo.height * sc;
      const sprW = spriteInfo.width * sc;
      sprite = createPlane(sprW, spriteH, 0xffffff, [x, spriteH / 2, z]);
      const spriteMesh = getMesh(sprite);
      spriteMesh.material = new THREE.MeshBasicMaterial({
        map: spriteInfo.texture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
      });
      getMesh(m).visible = false;
    }
  }

  entities.pickups.push({ m, sprite, spriteH, x, y, z, type, life: 30 });
}

function spawnPickupRandom(x, y, z) {
  let r = Math.random();
  let type = r < 0.4 ? 'ammo' : r < 0.75 ? 'health' : 'armor';
  spawnPickupAt(x, y, z, type);
}

function spawnGibs(cx, cy, cz, color, count) {
  for (let i = 0; i < count; i++) {
    let size = 0.15 + Math.random() * 0.25;
    let m = createCube(size, color, [cx, cy, cz], { material: 'emissive', color, intensity: 2.5 });
    let life = 0.4 + Math.random() * 0.6;
    entities.particles.push({
      m,
      x: cx,
      y: cy,
      z: cz,
      vx: (Math.random() - 0.5) * 0.4,
      vy: Math.random() * 0.5,
      vz: (Math.random() - 0.5) * 0.4,
      life,
      maxLife: life,
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
  damageFlash = 0.25;
  triggerShake(shake, Math.min(dmg * 0.8, 6));
  sfx('hit');
  if (player.health <= 0) {
    gameState = 'gameover';
    triggerShake(shake, 10);
    sfx('death');
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

// ── Update ──

export function update(dt) {
  if (!dt) dt = 1 / 60;
  gameTime += dt;
  if (damageFlash > 0) damageFlash -= dt;
  if (killFlash > 0) killFlash -= dt;
  if (muzzleFlash > 0) muzzleFlash -= dt;
  if (shootCooldown > 0) shootCooldown -= dt;
  updateShake(shake, dt);

  if (
    gameState === 'loading' ||
    gameState === 'menu' ||
    gameState === 'gameover' ||
    gameState === 'victory' ||
    gameState === 'missing'
  ) {
    let r = 40;
    setCameraPosition(Math.sin(gameTime * 0.3) * r, 30, Math.cos(gameTime * 0.3) * r);
    setCameraTarget(0, 0, 0);
    return;
  }

  if (gameState === 'levelclear') {
    levelClearTimer -= dt;
    if (levelClearTimer <= 0) {
      currentMapIdx++;
      if (currentMapIdx >= mapNames.length) {
        gameState = 'victory';
        if (document.pointerLockElement) document.exitPointerLock();
      } else {
        startLevel();
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

  // ── Player movement ──
  let isSprinting = key('ShiftLeft') || key('ShiftRight');
  let speed = isSprinting ? 22 : 14;
  let fx = Math.sin(player.yaw),
    fz = Math.cos(player.yaw);
  let rx = Math.cos(player.yaw),
    rz = -Math.sin(player.yaw);
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
    dx = (dx / len) * speed * dt;
    dz = (dz / len) * speed * dt;
  }

  let plrRadius = 0.8;
  if (!getWallCollision(player.x + dx, player.z, plrRadius)) player.x += dx;
  if (!getWallCollision(player.x, player.z + dz, plrRadius)) player.z += dz;

  // Head bob
  let bobFreq = isSprinting ? 12 : 8;
  let bobAmp = isSprinting ? 0.25 : 0.15;
  if (len > 0) player.y = playerFloorBase + 1.0 + Math.sin(gameTime * bobFreq) * bobAmp;
  else player.y = playerFloorBase + 1.0 + Math.sin(gameTime * 1.5) * 0.03;

  // Camera
  let headY = player.y + 1.0;
  let shakeOff = shake ? { x: shake.offsetX || 0, y: shake.offsetY || 0 } : { x: 0, y: 0 };
  let camX = player.x + shakeOff.x * 0.02;
  let camY = headY + shakeOff.y * 0.02;
  let tilt = damageFlash > 0 ? Math.sin(gameTime * 40) * damageFlash * 0.05 : 0;
  setCameraPosition(camX, camY, player.z);
  setCameraTarget(
    camX + Math.sin(player.yaw) * Math.cos(player.pitch),
    camY + Math.sin(player.pitch + tilt),
    player.z + Math.cos(player.yaw) * Math.cos(player.pitch)
  );
  setCameraFOV(isSprinting ? 95 : 85);

  // Shooting
  if (mouseDown() || key('Space') || btn('A')) shoot();

  // ── Bullets ──
  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    let b = entities.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    setPosition(b.m, b.x, b.y, b.z);
    b.life -= dt;
    let hit = false;

    for (let j = entities.enemies.length - 1; j >= 0; j--) {
      let e = entities.enemies[j];
      let hitR = e.size * 0.55;
      if (Math.hypot(b.x - e.x, b.z - e.z) < hitR + 0.4 && Math.abs(b.y - e.y) < hitR + 1.0) {
        hit = true;
        e.health -= 1;
        e.hitFlash = 0.1;
        spawnGibs(b.x, b.y, b.z, 0xffaa00, 3);
        if (e.health <= 0) {
          destroyMesh(e.body);
          destroyMesh(e.head);
          if (e.detail) destroyMesh(e.detail);
          if (e.sprite) destroyMesh(e.sprite);
          if (e.light) {
            removeLight(e.light);
            let li = enemyLights.indexOf(e.light);
            if (li >= 0) enemyLights.splice(li, 1);
          }
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
          spawnGibs(e.x, e.y, e.z, gibColor, 18);
          killFlash = 0.15;
          triggerShake(shake, 3);
          sfx('explosion');
          if (Math.random() < 0.55) spawnPickupRandom(e.x, 1, e.z);
        } else {
          sfx('hit');
        }
        break;
      }
    }
    if (!hit && getWallCollision(b.x, b.z, 0)) {
      hit = true;
      spawnGibs(b.x, b.y, b.z, 0x00ffff, 5);
    }
    if (b.life <= 0 || hit) {
      destroyMesh(b.m);
      entities.bullets.splice(i, 1);
    }
  }

  // ── Enemy Bullets ──
  for (let i = entities.enemyBullets.length - 1; i >= 0; i--) {
    let b = entities.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    setPosition(b.m, b.x, b.y, b.z);
    b.life -= dt;
    let hit = false;
    if (Math.hypot(b.x - player.x, b.z - player.z) < 1.3 && Math.abs(b.y - player.y) < 2.0) {
      hit = true;
      applyDamage(b.dmg);
    }
    if (!hit && getWallCollision(b.x, b.z, 0)) hit = true;
    if (b.life <= 0 || hit) {
      destroyMesh(b.m);
      entities.enemyBullets.splice(i, 1);
    }
  }

  // ── Enemies ──
  for (let i = entities.enemies.length - 1; i >= 0; i--) {
    let e = entities.enemies[i];
    let dist = Math.hypot(player.x - e.x, player.z - e.z);
    if (e.hitFlash > 0) e.hitFlash -= dt;

    let minDist = e.type === 'shooter' ? 10 : 1.8;
    let moveSpeed = e.speed * dt;
    if (dist < 35 && dist > minDist) {
      let moveX = ((player.x - e.x) / dist) * moveSpeed;
      let moveZ = ((player.z - e.z) / dist) * moveSpeed;
      if (e.type !== 'grunt' && Math.sin(gameTime * 3 + i * 7) > 0.7) {
        let perpX = -moveZ,
          perpZ = moveX;
        moveX += perpX * 0.5;
        moveZ += perpZ * 0.5;
      }
      if (!getWallCollision(e.x + moveX, e.z, 1.1)) e.x += moveX;
      if (!getWallCollision(e.x, e.z + moveZ, 1.1)) e.z += moveZ;
    }
    if (e.type === 'shooter' && dist < 7 && dist > 0.1) {
      let ex = e.x - ((player.x - e.x) / dist) * moveSpeed * 0.6;
      let ez = e.z - ((player.z - e.z) / dist) * moveSpeed * 0.6;
      if (!getWallCollision(ex, e.z, 1.1)) e.x = ex;
      if (!getWallCollision(e.x, ez, 1.1)) e.z = ez;
    }

    let t = gameTime * 2 + i;
    e.y = e.type === 'boss' ? 3 + Math.sin(t) * 0.6 : 2 + Math.sin(t * 1.5) * 0.3;
    let faceYaw = Math.atan2(player.x - e.x, player.z - e.z);
    setPosition(e.body, e.x, e.y, e.z);
    setRotation(e.body, 0, faceYaw, 0);
    setPosition(
      e.head,
      e.x + Math.sin(faceYaw) * e.size * 0.4,
      e.y + e.size * 0.55,
      e.z + Math.cos(faceYaw) * e.size * 0.4
    );
    setRotation(e.head, 0, faceYaw, 0);
    if (e.detail) {
      if (e.type === 'tank') {
        setPosition(e.detail, e.x, e.y + e.size * 0.2, e.z);
        setRotation(e.detail, 0, faceYaw, 0);
      } else if (e.type === 'boss') {
        setPosition(e.detail, e.x, e.y + e.size * 0.7, e.z);
        setRotation(e.detail, 0, faceYaw + Math.sin(t) * 0.2, 0);
      } else if (e.type === 'shooter') {
        setPosition(
          e.detail,
          e.x + Math.sin(faceYaw) * e.size * 0.6,
          e.y + e.size * 0.1,
          e.z + Math.cos(faceYaw) * e.size * 0.6
        );
        setRotation(e.detail, 0, faceYaw, 0);
      }
    }
    if (e.light) setPointLightPosition(e.light, e.x, e.y + 1, e.z);

    // Update sprite billboard
    if (e.sprite) {
      setPosition(e.sprite, e.x, e.spriteH / 2, e.z);
      const cam = getCamera();
      const sdx = cam.position.x - e.x;
      const sdz = cam.position.z - e.z;
      setRotation(e.sprite, 0, Math.atan2(sdx, sdz), 0);
    }

    if ((e.type === 'shooter' || e.type === 'boss') && dist < 28) {
      e.fireTimer += dt;
      let fireRate = e.type === 'boss' ? 0.7 : 1.4;
      if (e.fireTimer >= fireRate) {
        e.fireTimer = 0;
        enemyShoot(e, 0);
        if (e.type === 'boss') {
          enemyShoot(e, -0.12);
          enemyShoot(e, 0.12);
        }
      }
    }
    if (e.type !== 'shooter' && dist < 2.2) {
      e.fireTimer += dt;
      if (e.fireTimer >= 0.5) {
        e.fireTimer = 0;
        applyDamage(e.dmg);
      }
    }
  }

  // ── Pickups ──
  for (let i = entities.pickups.length - 1; i >= 0; i--) {
    let p = entities.pickups[i];
    p.life -= dt;
    let bobY = p.y + Math.sin(gameTime * 3 + i) * 0.3;
    setPosition(p.m, p.x, bobY, p.z);
    setRotation(p.m, 0, gameTime * 2, 0);

    // Billboard pickup sprite
    if (p.sprite) {
      setPosition(p.sprite, p.x, p.spriteH / 2 + Math.sin(gameTime * 3 + i) * 0.3, p.z);
      const cam = getCamera();
      const sdx = cam.position.x - p.x;
      const sdz = cam.position.z - p.z;
      setRotation(p.sprite, 0, Math.atan2(sdx, sdz), 0);
    }

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
        if (p.sprite) destroyMesh(p.sprite);
        entities.pickups.splice(i, 1);
        continue;
      }
    }
    if (p.life <= 0) {
      destroyMesh(p.m);
      if (p.sprite) destroyMesh(p.sprite);
      entities.pickups.splice(i, 1);
    }
  }

  // ── Particles ──
  for (let i = entities.particles.length - 1; i >= 0; i--) {
    let p = entities.particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.z += p.vz * dt * 60;
    p.vy -= 6 * dt;
    if (p.y < 0) {
      p.y = 0;
      p.vy *= -0.4;
    }
    p.life -= dt;
    setPosition(p.m, p.x, p.y, p.z);
    let s = Math.max(0, p.life / p.maxLife);
    setScale(p.m, s, s, s);
    if (p.life <= 0) {
      destroyMesh(p.m);
      entities.particles.splice(i, 1);
    }
  }

  // Level clear
  if (entities.enemies.length === 0 && kills >= totalEnemies && totalEnemies > 0) {
    gameState = 'levelclear';
    levelClearTimer = 3.0;
    player.score += 500;
    sfx('powerup');
  }
}

// ── Draw ──

export function draw() {
  if (gameState === 'loading' || gameState === 'missing') return drawLoading();
  if (gameState === 'menu') return drawMenu();
  if (gameState === 'gameover') return drawGameOver();
  if (gameState === 'victory') return drawVictory();
  if (gameState === 'levelclear') {
    drawHUD();
    drawLevelClear();
    return;
  }
  drawHUD();
}

function drawLoading() {
  let W = 640,
    H = 360;
  rectfill(0, 0, W, H, rgba8(0, 0, 0, 220));
  printCentered('FREEDOOM WAD EXPLORER', W / 2, 45, rgba8(0, 200, 255, 255));

  if (gameState === 'missing') {
    // WAD not found — show download/drop instructions
    printCentered('WAD FILE NOT FOUND', W / 2, 90, rgba8(255, 200, 0, 255));

    rectfill(W / 2 - 200, 111, 400, 2, rgba8(255, 200, 0, 100));

    printCentered('To play, you need a .WAD file:', W / 2, 132, rgba8(200, 200, 200, 255));

    printCentered(
      '1. Download FreeDoom (free, open-source):',
      W / 2,
      162,
      rgba8(150, 150, 150, 255)
    );
    printCentered('github.com/freedoom/freedoom/releases', W / 2, 182, rgba8(100, 200, 255, 255));

    printCentered(
      '2. Extract freedoom1.wad or freedoom2.wad',
      W / 2,
      212,
      rgba8(150, 150, 150, 255)
    );

    printCentered('3. Then either:', W / 2, 242, rgba8(150, 150, 150, 255));

    let pulse = Math.sin(gameTime * 3) * 0.3 + 0.7;
    let a = Math.floor(pulse * 255);
    printCentered('DRAG & DROP .WAD file here', W / 2, 270, rgba8(0, 255, 204, a));
    printCentered('or press L to browse', W / 2, 293, rgba8(0, 255, 204, a));

    rectfill(W / 2 - 200, 315, 400, 2, rgba8(100, 100, 100, 80));
    printCentered('Also works with DOOM shareware WADs', W / 2, 330, rgba8(100, 100, 100, 180));
  } else if (loadError) {
    printCentered('LOAD ERROR', W / 2, 120, rgba8(255, 50, 50, 255));
    printCentered(loadError, W / 2, 150, rgba8(200, 100, 100, 255));
    printCentered('Drop a valid .WAD file or press L', W / 2, 195, rgba8(150, 150, 150, 200));
  } else {
    let pct = Math.floor(loadProgress * 100);
    printCentered(`Loading WAD... ${pct}%`, W / 2, 150, rgba8(200, 200, 200, 255));
    drawProgressBar(
      W / 2 - 160,
      180,
      320,
      15,
      loadProgress,
      rgba8(0, 200, 255, 255),
      rgba8(40, 40, 40, 200)
    );
  }
}

function drawMenu() {
  let W = 640,
    H = 360;
  rectfill(0, 0, W, H, rgba8(0, 0, 0, 200));

  let pulse = Math.sin(gameTime * 4) * 0.3 + 0.7;
  let g = Math.floor(pulse * 255);
  printCentered('FREEDOOM', W / 2, 53, rgba8(0, g, 204, 255));
  printCentered('WAD EXPLORER', W / 2, 78, rgba8(255, 100, 0, 255));

  let sepW = 240 + Math.sin(gameTime * 2) * 40;
  rectfill(W / 2 - sepW / 2, 99, sepW, 3, rgba8(0, 255, 204, 180));

  printCentered(`${mapNames.length} MAPS LOADED`, W / 2, 120, rgba8(0, 255, 100, 255));

  // Map list (show current + surrounding)
  let startIdx = Math.max(0, currentMapIdx - 2);
  let endIdx = Math.min(mapNames.length, startIdx + 5);
  for (let i = startIdx; i < endIdx; i++) {
    let isCurrent = i === currentMapIdx;
    let y = 150 + (i - startIdx) * 21;
    let color = isCurrent ? rgba8(255, 255, 0, 255) : rgba8(140, 140, 140, 200);
    let prefix = isCurrent ? '> ' : '  ';
    printCentered(`${prefix}${mapNames[i]}`, W / 2, y, color);
  }

  printCentered('UP/DOWN - Select Map', W / 2, 263, rgba8(150, 150, 150, 255));
  printCentered('ENTER - Play', W / 2, 285, rgba8(150, 150, 150, 255));

  if (Math.sin(gameTime * 5) > 0) {
    printCentered('>>> SELECT A MAP & PRESS ENTER <<<', W / 2, 323, rgba8(0, 255, 204, 255));
  }

  // Input handled in update()
}

function drawGameOver() {
  let W = 640,
    H = 360;
  let a = Math.floor(160 + Math.sin(gameTime * 3) * 30);
  rectfill(0, 0, W, H, rgba8(120, 0, 0, a));
  printCentered('Y O U   D I E D', W / 2, 75, rgba8(255, 50, 50, 255));
  rectfill(W / 2 - 120, 102, 240, 2, rgba8(255, 50, 50, 150));
  printCentered(`MAP: ${mapNames[currentMapIdx]}`, W / 2, 128, rgba8(255, 170, 0, 255));
  printCentered(`KILLS: ${kills} / ${totalEnemies}`, W / 2, 158, rgba8(255, 255, 255, 255));
  printCentered(`SCORE: ${player.score}`, W / 2, 188, rgba8(255, 204, 0, 255));
  if (Math.sin(gameTime * 5) > 0)
    printCentered('CLICK TO RESTART', W / 2, 255, rgba8(200, 200, 200, 255));
}

function drawVictory() {
  let W = 640,
    H = 360;
  let a = Math.floor(180 + Math.sin(gameTime * 2) * 20);
  rectfill(0, 0, W, H, rgba8(0, 30, 0, a));
  printCentered('V I C T O R Y', W / 2, 68, rgba8(0, 255, 100, 255));
  printCentered('ALL MAPS CLEARED', W / 2, 120, rgba8(255, 255, 255, 255));
  printCentered(`FINAL SCORE: ${player.score}`, W / 2, 165, rgba8(255, 204, 0, 255));
  printCentered(`TOTAL KILLS: ${kills}`, W / 2, 195, rgba8(255, 170, 0, 255));
  if (Math.sin(gameTime * 5) > 0)
    printCentered('CLICK TO PLAY AGAIN', W / 2, 270, rgba8(200, 200, 200, 255));
}

function drawLevelClear() {
  let W = 640,
    H = 360;
  let cx = W / 2,
    cy = H / 2;
  rectfill(cx - 160, cy - 45, 320, 83, rgba8(0, 0, 0, 210));
  rectfill(cx - 160, cy - 45, 320, 3, rgba8(0, 255, 100, 200));
  printCentered(`${mapNames[currentMapIdx]} CLEAR!`, cx, cy - 27, rgba8(0, 255, 100, 255));
  printCentered(`+500 BONUS`, cx, cy, rgba8(255, 170, 0, 255));
  let next =
    currentMapIdx + 1 < mapNames.length
      ? `NEXT: ${mapNames[currentMapIdx + 1]}`
      : 'FINAL VICTORY AWAITS';
  printCentered(next, cx, cy + 23, rgba8(200, 200, 200, 200));
}

function drawHUD() {
  let W = 640,
    H = 360;

  if (damageFlash > 0)
    rectfill(0, 0, W, H, rgba8(255, 0, 0, Math.floor(Math.min(damageFlash * 400, 120))));
  if (killFlash > 0)
    rectfill(0, 0, W, H, rgba8(255, 200, 0, Math.floor(Math.min(killFlash * 300, 60))));

  // Bottom bar
  rectfill(0, H - 48, W, 48, rgba8(0, 0, 0, 180));
  rectfill(0, H - 48, W, 2, rgba8(0, 255, 204, 80));

  // Health
  let hp = Math.max(0, player.health);
  let hColor =
    hp > 60 ? rgba8(0, 255, 100, 255) : hp > 25 ? rgba8(255, 200, 0, 255) : rgba8(255, 40, 40, 255);
  let hpFlicker = hp <= 25 && Math.sin(gameTime * 15) > 0 ? rgba8(255, 100, 100, 255) : hColor;
  drawProgressBar(16, H - 21, 140, 11, hp / 100, hpFlicker, rgba8(40, 40, 40, 200));
  print(`HP ${hp}`, 16, H - 38, hColor);
  if (player.armor > 0) {
    drawProgressBar(
      16,
      H - 9,
      140,
      6,
      player.armor / 100,
      rgba8(68, 136, 255, 255),
      rgba8(40, 40, 40, 180)
    );
    print(`ARM ${player.armor}`, 16, H - 8, rgba8(68, 136, 255, 200));
  }

  // Ammo
  let ammoColor = player.ammo > 10 ? rgba8(255, 204, 0, 255) : rgba8(255, 50, 50, 255);
  print(`AMMO`, W - 140, H - 38, rgba8(180, 180, 180, 200));
  print(`${player.ammo}`, W - 66, H - 38, ammoColor);
  if (player.ammo <= 0 && Math.sin(gameTime * 12) > 0)
    printCentered('NO AMMO!', W / 2, H / 2 + 30, rgba8(255, 50, 50, 255));

  // Score / Map
  printCentered(
    `${mapNames[currentMapIdx]} | SCORE: ${player.score}`,
    W / 2,
    6,
    rgba8(255, 170, 0, 255)
  );
  let killStr = `${kills}/${totalEnemies}`;
  print(killStr, W - 90, 21, rgba8(255, 255, 255, 255));

  // Crosshair
  let cx = W / 2,
    cy = H / 2;
  let spread = mouseDown() ? 8 : 12;
  let cAlpha = rgba8(0, 255, 204, 200);
  rectfill(cx, cy, 1, 1, rgba8(255, 255, 255, 255));
  rectfill(cx - spread - 6, cy, 6, 1, cAlpha);
  rectfill(cx + spread + 2, cy, 6, 1, cAlpha);
  rectfill(cx, cy - spread - 6, 1, 6, cAlpha);
  rectfill(cx, cy + spread + 2, 1, 6, cAlpha);

  // Gun viewmodel
  let isMoving = key('KeyW') || key('KeyS') || key('KeyA') || key('KeyD');
  let isSprinting = key('ShiftLeft') || key('ShiftRight');
  let bobSpeed = isSprinting ? 14 : 9;
  let bobAmplitude = isSprinting ? 9 : 5;
  let bobX = isMoving ? Math.sin(gameTime * bobSpeed) * bobAmplitude : Math.sin(gameTime * 1.5) * 1;
  let bobY = isMoving ? Math.abs(Math.sin(gameTime * bobSpeed)) * bobAmplitude * 0.7 : 0;
  let recoilKick = muzzleFlash > 0 ? 18 : 0;

  let gx = W * 0.65 + bobX,
    gy = H - 10 + bobY + recoilKick;
  rectfill(gx - 6, gy - 120, 12, 75, rgba8(60, 60, 70, 255));
  rectfill(gx - 5, gy - 123, 9, 8, rgba8(80, 80, 90, 255));
  rectfill(gx - 2, gy - 117, 3, 68, rgba8(0, 200, 200, 120));
  rectfill(gx - 21, gy - 53, 42, 68, rgba8(55, 55, 65, 255));
  rectfill(gx - 24, gy - 45, 48, 53, rgba8(70, 70, 80, 255));
  rectfill(gx - 24, gy - 42, 5, 30, rgba8(0, 180, 180, 180));
  rectfill(gx + 20, gy - 42, 5, 30, rgba8(0, 180, 180, 180));
  rectfill(gx - 12, gy + 8, 24, 38, rgba8(45, 45, 50, 255));

  if (muzzleFlash > 0) {
    let fa = Math.floor(muzzleFlash * 3000);
    rectfill(gx - 23, gy - 143, 45, 30, rgba8(0, 255, 255, Math.min(fa, 200)));
    rectfill(gx - 12, gy - 150, 24, 18, rgba8(255, 255, 255, Math.min(fa, 255)));
    rectfill(gx - 5, gy - 158, 9, 12, rgba8(255, 255, 200, Math.min(fa, 200)));
  }
  if (isSprinting && isMoving) print('SPRINT', W / 2 - 30, H - 60, rgba8(255, 200, 0, 180));
}
