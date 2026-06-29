// The Last Save File
// A mobile-first Nova64 campaign cart: an interactive recovered-save ad.

const SAVE_KEY = 'theLastSaveFile.campaign.v1';
const DESIGN_W = 640;
const DESIGN_H = 360;

const COLORS = {
  ink: 0x02040a,
  white: 0xffffff,
  bios: 0x9be7ff,
  muted: 0x63808c,
  amber: 0xffcc77,
  cyan: 0x2ee9ff,
  magenta: 0xff4bd8,
  green: 0x73ff9f,
  moon: 0xd9defa,
};

const BUTTONS = [
  {
    label: 'BOOT NOVA64',
    url: 'https://nova64.io?gCampaign=1&intro=random',
    key: 'boot',
  },
  {
    label: 'SEE LOST GAMES',
    url: '/examples/gallery?gCampaign=1&intro=random',
    key: 'gallery',
  },
  {
    label: 'ENTER ST.ARCADE9',
    url: 'https://starcade9.io?gCampaign=1&intro=random',
    key: 'starcade9',
  },
];

// The four Nova64 "verbs" as a clean 2x2 grid of neon signs. Single source of
// truth shared by the renderer and the tap hit-test so they never drift.
// A clean horizontal row of neon verb signs along the lower screen, so they
// frame the action without blocking the view of the city.
const CITY_SIGNS = [
  { label: 'MAKE', color: COLORS.cyan, x: 62, y: 250, w: 120, h: 34 },
  { label: 'PLAY', color: COLORS.magenta, x: 194, y: 250, w: 120, h: 34 },
  { label: 'REMIX', color: COLORS.green, x: 326, y: 250, w: 120, h: 34 },
  { label: 'SHARE', color: COLORS.amber, x: 458, y: 250, w: 120, h: 34 },
];

let memory;
let scene = 'bars';
let sceneTime = 0;
let totalTime = 0;
let transition = 0;
let glitchCooldown = 0;
let transitionFrom = '';
let deniedNo = false;
let cityX = 0;
let citySignPulse = '';
let citySignTimer = 0;
let ctaHover = -1;
let tv = null;
let tvScreen = null;
let tvFloorGlow = null;
let tvLight = null;
let inviteLight = null;
let cartGlowMesh = null;
let loaderOverlayVisible = false;
let loaderResolved = [];

const roomMeshes = [];
const cityMeshes = [];
const inviteMeshes = [];
const cars = [];
const sunBands = [];
const rainDrops = [];
const sparks = [];
const dust = [];
const tvMaterials = [];
const buttonRects = [];

function defaultMemory() {
  return {
    firstPlayedAt: '',
    lastPlayedAt: '',
    runs: 0,
    furthestScene: 'bars',
    completed: false,
    lastChoice: '',
  };
}

export function init() {
  memory = nova64.data.loadData(SAVE_KEY, defaultMemory());
  const now = new Date().toISOString();
  if (!memory.firstPlayedAt) memory.firstPlayedAt = now;
  memory.lastPlayedAt = now;
  memory.runs = (memory.runs || 0) + 1;
  nova64.data.saveData(SAVE_KEY, memory);

  setupWorld();
  setupEffects();
  showGroup(roomMeshes, false);
  showGroup(cityMeshes, false);
  showGroup(inviteMeshes, false);
  enterScene('bars');
}

export function update(dt) {
  totalTime += dt;
  sceneTime += dt;
  if (transition > 0) transition = Math.max(0, transition - dt * 1.5);
  if (tv && typeof tv.update === 'function') tv.update(dt);

  // Occasional signal-interference glitch bursts for atmosphere (the haunted
  // television / a hacked feed) — uses the real post-process glitch (the same
  // damage-glitch Space Harrier uses) via nova64.fx.glitchBurst.
  if (glitchCooldown > 0) {
    glitchCooldown -= dt;
  } else if (scene === 'room' || scene === 'city' || scene === 'invite') {
    if (Math.random() < dt * 0.09) {
      tryCall(nova64.fx.glitchBurst, 0.45 + Math.random() * 0.35, 0.16 + Math.random() * 0.22);
      glitchCooldown = 2.5 + Math.random() * 3.5;
    }
  }

  updateRain(dt);
  updateDust(dt);
  updateSparks(dt);
  updateTvFlicker();
  updateLoader(dt);
  updateGlitch(dt);
  updateInput(dt);
  updateScene(dt);
}

export function draw() {
  const d = nova64.draw;
  // Transparent clear so the rendered 3D room/city shows through the 2D overlay.
  // (cls() fills opaque and would hide the 3D scene; the 2D-only scenes below
  // paint their own opaque background.)
  if (typeof d.cls3D === 'function') d.cls3D();
  else d.cls(d.rgba8(0, 0, 0, 0));

  if (scene === 'boot') drawBoot();
  if (scene === 'bars') drawOpeningBars();
  if (scene === 'loader') drawNovaLoader();
  if (scene === 'glitch') drawGlitchIn();
  if (scene === 'room') drawRoomOverlay();
  if (scene === 'city') drawCityOverlay();
  if (scene === 'invite') drawInvitationOverlay();

  drawCrtOverlay();
  if (transition > 0) {
    const a = Math.floor(transition * 255);
    nova64.draw.rectfill(0, 0, DESIGN_W, DESIGN_H, nova64.draw.rgba8(0, 0, 0, a));
  }
}

function setupWorld() {
  setupRoom();
  setupCity();
  setupInvitation();
}

function setupEffects() {
  tryCall(nova64.fx.enableDithering, true);
  tryCall(nova64.fx.enablePixelation, 1.5);
  tryCall(nova64.fx.enableVignette, 0.55);
  tryCall(nova64.fx.enableBloom, 0.85);
  tryCall(nova64.light.setAmbientLight, 0x1a1b2d, 1.2);
  tryCall(nova64.light.setLightDirection, -0.4, -0.8, -0.2);
  tryCall(nova64.light.setFog, 0x05060e, 12, 42);
}

function setupRoom() {
  const s = nova64.scene;

  const floor = addMesh(roomMeshes, s.createPlane(9, 9, 0x2c2a3d, [0, 0, 0]));
  s.setRotation(floor, -Math.PI / 2, 0, 0);

  addMesh(roomMeshes, s.createCube(9, 4.5, 0.18, 0x2a2f48, [0, 2.2, -3.2]));
  addMesh(roomMeshes, s.createCube(0.18, 4.5, 7, 0x232844, [-4.4, 2.2, 0.1]));
  addMesh(roomMeshes, s.createCube(0.18, 4.5, 7, 0x2b2440, [4.4, 2.2, 0.1]));

  addMesh(roomMeshes, s.createCube(1.9, 1.25, 0.12, 0x0a0e18, [2.35, 2.45, -3.02]));
  addMesh(
    roomMeshes,
    s.createCube(1.55, 0.95, 0.08, 0x101b31, [2.35, 2.45, -2.92], {
      emissive: 0x071b3a,
    })
  );

  addMesh(roomMeshes, s.createCube(2.35, 0.35, 1.65, 0x252032, [-2.35, 0.25, -1.25]));
  addMesh(roomMeshes, s.createCube(2.0, 0.18, 1.5, 0x41304e, [-2.35, 0.55, -1.25]));
  addMesh(roomMeshes, s.createCube(0.72, 0.2, 0.48, 0x786a86, [-3.05, 0.8, -1.75]));

  for (let i = 0; i < 5; i++) {
    const mag = addMesh(
      roomMeshes,
      s.createCube(0.58, 0.03, 0.42, i % 2 ? 0xff4bd8 : 0x2ee9ff, [
        -0.9 + i * 0.22,
        0.04 + i * 0.02,
        0.95 + i * 0.03,
      ])
    );
    s.setRotation(mag, 0, 0.25 + i * 0.17, 0);
  }

  addMesh(roomMeshes, s.createCube(0.9, 0.12, 0.42, 0x12131b, [0.18, 0.1, 1.4]));
  addMesh(roomMeshes, s.createCube(0.04, 0.04, 1.35, 0x090909, [-0.25, 0.12, 0.75]));

  addMesh(roomMeshes, s.createCube(0.72, 0.14, 0.48, 0x2c2632, [1.45, 0.16, 1.0]));
  addMesh(
    roomMeshes,
    s.createCube(0.58, 0.03, 0.32, 0x78f7ff, [1.45, 0.245, 1.0], {
      emissive: 0x24d9ff,
    })
  );
  cartGlowMesh = addMesh(
    roomMeshes,
    s.createCube(1.2, 0.025, 0.8, 0x124a58, [1.45, 0.05, 1.0], {
      emissive: 0x1ceaff,
    })
  );

  // CRT television — the hero of this scene. A big wood-dark cabinet with a
  // deep bezel so the screen sits recessed and the bloom reads as glass glow.
  addMesh(roomMeshes, s.createCube(3.0, 1.98, 0.52, 0x07080d, [-0.5, 1.04, -2.22]));
  addMesh(roomMeshes, s.createCube(0.98, 0.3, 0.62, 0x0d0e14, [-0.5, 0.12, -2.22]));
  addMesh(roomMeshes, s.createCube(2.76, 1.74, 0.12, 0x04050b, [-0.5, 1.06, -1.99]));
  tvScreen = addMesh(
    roomMeshes,
    s.createCube(2.52, 1.48, 0.05, 0xffffff, [-0.5, 1.06, -1.92], {
      emissive: 0x223a4f,
    })
  );
  // Light the carpet in front of the set. Bloom catches this so the room reads
  // as lit *by* the television rather than by a flat ambient.
  tvFloorGlow = addMesh(
    roomMeshes,
    s.createPlane(3.6, 2.4, 0x0a2f47, [-0.5, 0.03, -0.95], { emissive: 0x0d3a57 })
  );
  s.setRotation(tvFloorGlow, -Math.PI / 2, 0, 0);

  // A real point light at the screen so the bedroom is genuinely lit *by* the
  // television — gives the dark room shape and depth instead of a black void.
  if (typeof nova64.light.createPointLight === 'function') {
    tvLight = nova64.light.createPointLight(0x7fc4ff, 7, 13, -0.5, 1.15, -1.4);
  }

  if (nova64.video && typeof nova64.video.loadTexture === 'function') {
    tv = nova64.video.loadTexture('/assets/sample.mp4', {
      muted: true,
      loop: true,
    });
    if (tv && typeof tv.applyToMesh === 'function') tv.applyToMesh(tvScreen);
  }
  illuminateTvScreen();
  setupDust();

  for (let i = 0; i < 36; i++) {
    rainDrops.push({
      x: 414 + Math.random() * 108,
      y: 42 + Math.random() * 112,
      speed: 34 + Math.random() * 48,
      len: 9 + Math.random() * 12,
      sway: Math.random() * Math.PI * 2,
    });
  }
}

// `video.loadTexture().applyToMesh()` only binds the clip as a diffuse map, so
// under the room's dim ambient the screen reads dark. Promote it to an emissive
// map so the CRT self-illuminates and the bloom pass turns it into real glass
// glow. Best-effort + Three-specific; silently skipped on hosts that lack
// getMesh or emissive materials (Godot / RetroArch), where the diffuse map and
// the static emissive tint still give a lit-enough screen.
function illuminateTvScreen() {
  tvMaterials.length = 0;
  if (!nova64.scene || typeof nova64.scene.getMesh !== 'function') return;
  let node;
  try {
    node = nova64.scene.getMesh(tvScreen);
  } catch (_error) {
    return;
  }
  if (!node || typeof node.traverse !== 'function') return;
  node.traverse(child => {
    if (!child || !child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat) continue;
      try {
        let mapped = false;
        if (tv && tv.texture && 'emissiveMap' in mat) {
          mat.emissiveMap = tv.texture;
          mapped = true;
        }
        if (mapped) {
          if (mat.emissive && typeof mat.emissive.set === 'function') mat.emissive.set(0xffffff);
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = 1.1;
          mat.needsUpdate = true;
          tvMaterials.push(mat);
        }
      } catch (_error) {
        // Material doesn't support emissive tweaks on this host; leave as-is.
      }
    }
  });
}

function updateTvFlicker() {
  if (tvMaterials.length === 0) return;
  if (scene !== 'room' && scene !== 'glitch') return;
  // Two beating sine waves for the gentle CRT shimmer, plus a rare brightness
  // dip like a tube settling.
  let intensity = 1.05 + Math.sin(totalTime * 12.5) * 0.06 + Math.sin(totalTime * 37) * 0.035;
  if (Math.random() < 0.01) intensity *= 0.5;
  intensity = clamp(intensity, 0.45, 1.35);
  for (const mat of tvMaterials) {
    if ('emissiveIntensity' in mat) mat.emissiveIntensity = intensity;
  }
}

function setupDust() {
  dust.length = 0;
  for (let i = 0; i < 26; i++) {
    dust.push({
      x: 40 + Math.random() * 420,
      y: 130 + Math.random() * 190,
      vx: (Math.random() - 0.5) * 6,
      vy: -3 - Math.random() * 7,
      r: 0.6 + Math.random() * 1.3,
      a: 26 + Math.random() * 46,
      ph: Math.random() * Math.PI * 2,
    });
  }
}

function updateDust(dt) {
  if (scene !== 'room' && scene !== 'glitch') return;
  for (const m of dust) {
    m.ph += dt;
    m.x += (m.vx + Math.sin(m.ph) * 4) * dt;
    m.y += m.vy * dt;
    if (m.y < 110) {
      m.y = 300 + Math.random() * 40;
      m.x = 40 + Math.random() * 420;
    }
  }
}

// Force a mesh's material emissiveIntensity (Three escape hatch, guarded) so we
// can make some emissives blaze far brighter than others under bloom.
function setMeshEmissiveIntensity(meshId, intensity) {
  if (meshId == null || !nova64.scene || typeof nova64.scene.getMesh !== 'function') return;
  let node;
  try {
    node = nova64.scene.getMesh(meshId);
  } catch (_error) {
    return;
  }
  if (!node || typeof node.traverse !== 'function') return;
  node.traverse(child => {
    if (!child || !child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (mat && 'emissiveIntensity' in mat) {
        mat.emissiveIntensity = intensity;
        mat.needsUpdate = true;
      }
    }
  });
}

function setupCity() {
  const s = nova64.scene;
  const ground = addMesh(cityMeshes, s.createPlane(60, 90, 0x05030c, [0, 0, -22]));
  s.setRotation(ground, -Math.PI / 2, 0, 0);

  // ── Outrun retro sun at the vanishing point ──────────────────────────────
  // Bright emissive disc (warm, distinct from the pink sky) banded across its
  // lower half with BRIGHT glowing gold lines — the classic look, high contrast.
  const SUN = 0xff3d1a; // deep red-orange so the neon-yellow bands pop hard
  const SUN_R = 9.5;
  const sunMesh = addMesh(
    cityMeshes,
    s.createSphere(SUN_R, SUN, [0, 5.6, -62], 32, { emissive: SUN })
  );
  const BAND = 0xeaff00; // electric neon yellow
  for (let i = 0; i < 8; i++) {
    const by = 5.2 - i * 0.86; // bands climb down from just under the center
    const dy = 5.6 - by;
    const hw = Math.sqrt(Math.max(0.1, SUN_R * SUN_R - dy * dy)); // chord half-width
    const th = 0.3 + Math.random() * 0.7; // random, chunky thickness
    const band = addMesh(
      cityMeshes,
      s.createCube(hw * 2 - 0.5, th, 0.16, BAND, [0, by, -61.0], { emissive: BAND })
    );
    sunBands.push({ mesh: band, baseY: by, i });
  }
  // The muted look came from bands + sun glowing at equal intensity, so they
  // blended. Dim the sun and make the bands BLAZE far brighter — searing neon
  // lines on a deep disc. (Band materials are cached per colour, so one call
  // lifts every band.)
  setMeshEmissiveIntensity(sunMesh, 0.7);
  if (sunBands[0]) setMeshEmissiveIntensity(sunBands[0].mesh, 1.7);

  // ── Neon grid floor (the outrun signature) ───────────────────────────────
  const GRID_A = COLORS.magenta;
  const GRID_B = COLORS.cyan;
  for (let gx = -7; gx <= 7; gx++) {
    if (gx === 0) continue; // center reserved for the brighter road dashes
    const col = gx % 2 ? GRID_B : GRID_A;
    addMesh(
      cityMeshes,
      s.createCube(0.07, 0.03, 76, col, [gx * 2.0, 0.02, -30], { emissive: col })
    );
  }
  for (let gz = 0; gz <= 19; gz++) {
    const col = gz % 2 ? GRID_B : GRID_A;
    addMesh(
      cityMeshes,
      s.createCube(30, 0.03, 0.07, col, [0, 0.02, 4 - gz * 4], { emissive: col })
    );
  }
  // Bright dashed center line streaking down the avenue (kept — the cool part).
  for (let i = 0; i < 16; i++) {
    const col = i % 2 ? COLORS.magenta : COLORS.cyan;
    addMesh(
      cityMeshes,
      s.createCube(0.14, 0.05, 2.4, col, [0, 0.05, 2 - i * 4], { emissive: col })
    );
  }

  // ── Stars across the upper sky ───────────────────────────────────────────
  let starW = null;
  let starB = null;
  for (let i = 0; i < 54; i++) {
    const sx = (Math.random() - 0.5) * 80;
    const sy = 13 + Math.random() * 23;
    const sz = -28 - Math.random() * 50;
    const white = Math.random() > 0.5;
    const col = white ? 0xffffff : 0xbfe0ff;
    const star = addMesh(
      cityMeshes,
      s.createCube(0.16, 0.16, 0.16, col, [sx, sy, sz], { emissive: col })
    );
    if (white) starW = star;
    else starB = star;
  }
  // Make the stars actually shine — blaze far brighter than ambient so bloom
  // turns them into bright points. (Materials cached per colour, so one each.)
  setMeshEmissiveIntensity(starW, 2.4);
  setMeshEmissiveIntensity(starB, 2.4);

  // Skyscrapers — dark glass bodies with a glowing rooftop beacon and a grid of
  // lit windows so the skyline reads as a living neon city (bloom does the glow).
  const neon = [COLORS.cyan, COLORS.magenta, COLORS.amber, COLORS.green, 0x6f8cff];
  const tints = [0x0e1430, 0x160e2a, 0x0b1f24, 0x121026, 0x0c1830];
  for (let i = 0; i < 32; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (4.6 + Math.random() * 8.4);
    const z = -3 - i * 1.95;
    const h = 2.0 + Math.random() * 9;
    const bw = 1.3 + Math.random() * 1.6;
    addMesh(cityMeshes, s.createCube(bw, h, 1.3, tints[i % tints.length], [x, h * 0.5, z]));

    // rooftop beacon
    const beacon = neon[i % neon.length];
    addMesh(
      cityMeshes,
      s.createCube(0.22, 0.22, 0.22, beacon, [x, h + 0.16, z], { emissive: beacon })
    );

    // window grid on the street-facing face
    const rows = Math.min(4, Math.max(1, Math.floor(h / 2.3)));
    const frontZ = z + 0.67;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 2; c++) {
        const lit = Math.random() > 0.3;
        const wc = neon[(i + r + c) % neon.length];
        addMesh(
          cityMeshes,
          s.createCube(
            0.16,
            0.26,
            0.05,
            lit ? wc : 0x070710,
            [x - 0.3 + c * 0.6, 1.0 + r * 1.25, frontZ],
            lit ? { emissive: wc } : {}
          )
        );
      }
    }
  }

  const signs = [
    [-3.0, 2.3, -8, COLORS.cyan],
    [3.0, 3.0, -15, COLORS.magenta],
    [-3.2, 2.7, -22, COLORS.green],
    [3.2, 3.4, -29, COLORS.amber],
  ];
  for (const sign of signs) {
    addMesh(
      cityMeshes,
      s.createCube(1.8, 0.55, 0.1, sign[3], [sign[0], sign[1], sign[2]], {
        emissive: sign[3],
      })
    );
  }

  // Traffic — glowing cars streaming both ways down the avenue (animated in
  // updateScene). Bright headlights/taillights bloom into light streaks.
  const HEAD = 0xfff0c0;
  const TAIL = 0xff2746;
  for (let i = 0; i < 9; i++) {
    const dir = i % 2 === 0 ? 1 : -1; // +1 = toward camera, -1 = away
    const lane = dir > 0 ? -1.5 : 1.5;
    const z = -3 - Math.random() * 50;
    const body = addMesh(cityMeshes, s.createCube(0.55, 0.34, 0.95, 0x07070e, [lane, 0.22, z]));
    const head = addMesh(
      cityMeshes,
      s.createCube(0.46, 0.12, 0.12, HEAD, [lane, 0.24, z + dir * 0.5], { emissive: HEAD })
    );
    const tail = addMesh(
      cityMeshes,
      s.createCube(0.46, 0.1, 0.12, TAIL, [lane, 0.24, z - dir * 0.5], { emissive: TAIL })
    );
    cars.push({ body, head, tail, lane, dir, z, speed: 7 + Math.random() * 9 });
  }
}

function setupInvitation() {
  const s = nova64.scene;
  addMesh(inviteMeshes, s.createCube(5.2, 0.08, 3.2, 0x06111a, [0, -0.05, 0]));
  addMesh(
    inviteMeshes,
    s.createCube(4.4, 0.05, 2.6, 0x0b4c64, [0, 0.02, 0], {
      emissive: 0x0a9fc0,
    })
  );
  addMesh(inviteMeshes, s.createCube(4.6, 2.8, 0.16, 0x070914, [0, 1.55, -1.45]));
  addMesh(
    inviteMeshes,
    s.createCube(0.14, 3.0, 0.1, COLORS.cyan, [-2.15, 1.5, -1.32], {
      emissive: COLORS.cyan,
    })
  );
  addMesh(
    inviteMeshes,
    s.createCube(0.14, 3.0, 0.1, COLORS.magenta, [2.15, 1.5, -1.32], {
      emissive: COLORS.magenta,
    })
  );
  addMesh(
    inviteMeshes,
    s.createCylinder(1.0, 1.16, 0.18, 0x122a34, [0, 0.42, 0], {
      segments: 12,
      emissive: 0x0a6f83,
    })
  );
  addMesh(inviteMeshes, s.createCube(3.1, 0.36, 2.0, 0x25212c, [0, 1.2, 0]));
  addMesh(
    inviteMeshes,
    s.createCube(2.3, 0.08, 1.15, COLORS.cyan, [0, 1.43, 0.08], {
      emissive: COLORS.cyan,
    })
  );

  // Key light over the pedestal so the cart reads as a lit display piece.
  if (typeof nova64.light.createPointLight === 'function') {
    inviteLight = nova64.light.createPointLight(0x6fe0ff, 9, 12, 0, 2.4, 1.4);
  }
}

function updateInput(dt) {
  const input = nova64.input;
  const keyboardTap = input.keyp('Space') || input.keyp('Enter') || input.btnp(12);
  const pointerTap = input.mousePressed();
  const tap = pointerTap || keyboardTap;
  const x = input.mouseX();
  const y = input.mouseY();

  if (scene === 'boot') {
    const noTap = pointerTap && inRect(x, y, 378, 270, 116, 34);
    const yesTap = pointerTap && sceneTime > 4.2 && !noTap;
    if (keyboardTap || yesTap) {
      playSound('confirm');
      startNovaLoader();
      return;
    }
    if (noTap) {
      deniedNo = true;
      playSound('error');
    }
  }

  if (scene === 'room') {
    const cartTap = tap && sceneTime > 27 && inRect(x, y, 388, 205, 104, 72);
    const impatientTap = tap && sceneTime > 34;
    if (cartTap || impatientTap || sceneTime > 45) {
      playSound('powerup');
      enterScene('city');
    }
  }

  if (scene === 'city') {
    const left = input.key('ArrowLeft') || input.key('KeyA') || input.leftStickX() < -0.2;
    const right = input.key('ArrowRight') || input.key('KeyD') || input.leftStickX() > 0.2;
    let touchMove = 0;
    if (input.mouseDown()) touchMove = x < DESIGN_W / 2 ? -1 : 1;
    if (left) touchMove -= 1;
    if (right) touchMove += 1;
    cityX = clamp(cityX + touchMove * dt * 2.1, -1.4, 1.4);
    if (tap) checkCitySigns(x, y);
    if (sceneTime > 30 || input.keyp('Enter')) enterScene('invite');
  }

  if (scene === 'invite') {
    ctaHover = -1;
    for (let i = 0; i < buttonRects.length; i++) {
      const r = buttonRects[i];
      if (inRect(x, y, r.x, r.y, r.w, r.h)) ctaHover = i;
    }
    if (tap && ctaHover >= 0) chooseButton(ctaHover);
  }
}

function updateScene(_dt) {
  if (scene === 'bars') {
    setCamera(0, 1.5, 6, 0, 1, 0, 48);
    if (sceneTime > 1.45) enterScene('boot');
    return;
  }

  if (scene === 'boot') {
    setCamera(0, 1.5, 6, 0, 1, 0, 48);
    return;
  }

  if (scene === 'loader') {
    setCamera(0, 1.5, 6, 0, 1, 0, 48);
    return;
  }

  if (scene === 'glitch' || scene === 'room') {
    const roomTime = scene === 'glitch' ? 0 : sceneTime;
    // A clear dolly-in over the first ~22s settles the frame on the glowing
    // CRT, then a slow creep keeps the zoom breathing so it never feels parked.
    // A lazy handheld sway sells the "watching from the carpet" feeling.
    const push = easeInOut(clamp(roomTime / 22, 0, 1));
    const creep = clamp((roomTime - 22) / 30, 0, 1);
    const sway = Math.sin(totalTime * 0.55);
    const bob = Math.sin(totalTime * 0.8);
    const camX = -0.28 + push * 0.2 + sway * 0.06;
    const camY = 1.62 - push * 0.34 - creep * 0.06 + bob * 0.015;
    const camZ = 6.4 - push * 3.1 - creep * 0.7;
    const fov = 56 - push * 19 - creep * 4;
    setCamera(camX, camY, camZ, -0.5, 1.06 + sway * 0.02, -1.95, fov);
    const glow = 0.5 + Math.sin(totalTime * 4) * 0.25;
    if (cartGlowMesh) {
      nova64.scene.setScale(cartGlowMesh, 1 + glow * 0.08, 1, 1 + glow * 0.08);
    }
    if (tvFloorGlow) {
      const fs = 1 + Math.sin(totalTime * 3.1) * 0.05;
      nova64.scene.setScale(tvFloorGlow, fs, 1, fs);
    }
    return;
  }

  if (scene === 'city') {
    const walk = sceneTime * 1.6;
    setCamera(cityX * 1.2, 3.2, 8 - walk * 0.22, cityX * 0.65, 1.6, -8 - walk * 0.55, 58);
    for (const c of cars) {
      c.z += c.dir * c.speed * _dt;
      if (c.dir > 0 && c.z > 8) c.z = -60 - Math.random() * 6;
      else if (c.dir < 0 && c.z < -64) c.z = 8 + Math.random() * 6;
      nova64.scene.setPosition(c.body, c.lane, 0.22, c.z);
      nova64.scene.setPosition(c.head, c.lane, 0.24, c.z + c.dir * 0.5);
      nova64.scene.setPosition(c.tail, c.lane, 0.24, c.z - c.dir * 0.5);
    }
    // Sun bands drift up and down as a fast traveling wave — hypnotic outrun motion.
    for (const b of sunBands) {
      const y = b.baseY + Math.sin(totalTime * 4.2 + b.i * 0.6) * 0.45;
      nova64.scene.setPosition(b.mesh, 0, y, -61.2);
    }
    if (citySignTimer > 0) citySignTimer -= _dt;
    return;
  }

  if (scene === 'invite') {
    const orbit = Math.sin(totalTime * 0.45) * 0.18;
    setCamera(orbit, 1.75, 5.65, 0, 1.08, -0.15, 43);
    if (inviteMeshes[6]) nova64.scene.setRotation(inviteMeshes[6], 0.08, totalTime * 0.68, 0.02);
    if (inviteMeshes[7]) nova64.scene.setRotation(inviteMeshes[7], 0.08, totalTime * 0.68, 0.02);
  }
}

function updateLoader(_dt) {
  if (scene !== 'loader') return;
  const tasks = [
    ['lost-save://memory-card', 0.8, 'READING MEMORY CARD'],
    ['lost-save://city-009', 1.85, 'LOADING CITY_009'],
    ['lost-save://television-signal', 3.05, 'TUNING CRT SIGNAL'],
  ];
  for (let i = 0; i < tasks.length; i++) {
    const [id, time, status] = tasks[i];
    if (sceneTime > time && !loaderResolved[i]) {
      loaderResolved[i] = true;
      if (nova64.loader && typeof nova64.loader.setStatus === 'function') {
        nova64.loader.setStatus(status);
      }
      if (nova64.loader && typeof nova64.loader.resolve === 'function') {
        nova64.loader.resolve(id);
      }
    }
  }
  if (loaderOverlayVisible && sceneTime > 0.75) hideNovaLoader();
  if (sceneTime > 4.35) {
    hideNovaLoader();
    enterScene('glitch');
  }
}

function updateGlitch(_dt) {
  if (scene !== 'glitch') return;
  if (sceneTime > 4.0) enterScene('room');
}

function updateRain(dt) {
  for (const r of rainDrops) {
    r.sway += dt * 2.2;
    r.y += r.speed * dt;
    r.x += Math.sin(r.sway) * dt * 2.2;
    if (r.y > 162) {
      r.y = 42;
      r.x = 414 + Math.random() * 108;
    }
  }
}

function updateSparks(dt) {
  if (scene === 'room' && Math.random() < dt * 11) {
    sparks.push({
      x: 444 + Math.random() * 50,
      y: 224 + Math.random() * 28,
      life: 0.45 + Math.random() * 0.4,
      color: Math.random() > 0.5 ? COLORS.cyan : COLORS.magenta,
    });
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    sparks[i].life -= dt;
    sparks[i].y -= dt * 12;
    if (sparks[i].life <= 0) sparks.splice(i, 1);
  }
}

function enterScene(next) {
  transitionFrom = scene;
  scene = next;
  sceneTime = 0;
  transition = next === 'loader' ? 0.18 : transitionFrom ? 1 : 0;
  deniedNo = false;

  showGroup(roomMeshes, next === 'room' || next === 'glitch');
  showGroup(cityMeshes, next === 'city');
  showGroup(inviteMeshes, next === 'invite');
  if (tvLight !== null && typeof nova64.light.setLightVisible === 'function') {
    nova64.light.setLightVisible(tvLight, next === 'room' || next === 'glitch');
  }
  if (inviteLight !== null && typeof nova64.light.setLightVisible === 'function') {
    nova64.light.setLightVisible(inviteLight, next === 'invite');
  }
  if (next !== 'city') tryCall(nova64.light.clearSkybox);

  if (next === 'bars') {
    tryCall(nova64.light.setAmbientLight, 0x101524, 1.0);
    tryCall(nova64.light.setFog, 0x01030a, 10, 32);
  }
  if (next === 'loader') {
    tryCall(nova64.light.setAmbientLight, 0x101524, 1.2);
    tryCall(nova64.light.setFog, 0x01030a, 10, 32);
  }
  if (next === 'glitch') {
    tryCall(nova64.light.setAmbientLight, 0x0c1020, 1.0);
    tryCall(nova64.light.setLightDirection, -0.2, -0.65, -0.7);
    tryCall(nova64.light.setFog, 0x02040a, 7, 28);
  }
  if (next === 'room') memory.furthestScene = 'room';
  if (next === 'city') memory.furthestScene = 'city';
  if (next === 'invite') memory.furthestScene = 'invite';
  if (next === 'room') {
    // Low ambient base; the TV point light does the real work so the room is a
    // pool of screen-light fading into the dark — the emissive TV + bloom stays
    // the brightest thing in frame.
    tryCall(nova64.light.setAmbientLight, 0x191f33, 1.0);
    tryCall(nova64.light.setLightDirection, -0.2, -0.65, -0.7);
    tryCall(nova64.light.setFog, 0x070a16, 14, 52);
  }
  if (next === 'city') {
    // Vaporwave sunset: purple zenith → hot-pink horizon, with STRONG bloom so
    // the grid, neon windows, sun and street dashes all glow. Low ambient keeps
    // the towers as dark silhouettes against the sun.
    tryCall(nova64.light.createGradientSkybox, 0x180a2e, 0xff4d72);
    // Low threshold + wide radius so SATURATED neon (not just whites) blooms —
    // the default 0.6 threshold is above magenta/orange luminance, which is why
    // the grid/sun looked flat. This is what makes the outrun scene glow.
    tryCall(nova64.fx.enableBloom, 1.15, 0.85, 0.18);
    tryCall(nova64.light.setAmbientLight, 0x241a44, 1.35);
    tryCall(nova64.light.setLightDirection, 0.0, -0.6, -0.8);
    // Push fog far out so the distant sun/bands aren't muted by haze; the grid
    // and skybox still give depth.
    tryCall(nova64.light.setFog, 0x3a1450, 62, 190);
  }
  if (next === 'invite') {
    tryCall(nova64.fx.enableBloom, 0.85); // reset the city's heavy bloom
    tryCall(nova64.light.setAmbientLight, 0x3a4a78, 2.5);
    tryCall(nova64.light.setLightDirection, -0.55, -0.55, -0.35);
    tryCall(nova64.light.setFog, 0x070a18, 16, 50);
  }
  if ((next === 'glitch' || next === 'room') && tv) {
    if (typeof tv.seek === 'function') tv.seek(1.2);
    if (typeof tv.play === 'function') tv.play();
  }
  nova64.data.saveData(SAVE_KEY, memory);
}

function startNovaLoader() {
  loaderResolved = [false, false, false];
  enterScene('loader');
  if (!nova64.loader || typeof nova64.loader.show !== 'function') return;
  loaderOverlayVisible = true;
  nova64.loader.show({
    title: 'NOVA64',
    subtitle: 'LOAD CITY_009',
    status: 'BOOTING MEMORY-SAVE',
  });
  if (typeof nova64.loader.track === 'function') {
    nova64.loader.track([
      'lost-save://memory-card',
      'lost-save://city-009',
      'lost-save://television-signal',
    ]);
  }
}

function hideNovaLoader() {
  if (!loaderOverlayVisible) return;
  loaderOverlayVisible = false;
  if (nova64.loader && typeof nova64.loader.hide === 'function') nova64.loader.hide();
}

function uiColor(hex, alpha = 255) {
  return nova64.draw.rgba8((hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff, alpha);
}

function drawOpeningBars() {
  const d = nova64.draw;
  d.rectfill(0, 0, DESIGN_W, DESIGN_H, uiColor(0xffffff));
  const bars = [0xf4e84a, 0x46e6e6, 0x42d35a, 0xf04eda, 0xe54a4a, 0x3556e8];
  const w = Math.ceil(DESIGN_W / bars.length);
  for (let i = 0; i < bars.length; i++) d.rectfill(i * w, 72, w + 1, 166, uiColor(bars[i]));
  d.rectfill(0, 238, DESIGN_W, 54, uiColor(0x050505));
  d.rectfill(44, 252, 92, 26, uiColor(0xffffff));
  d.rectfill(136, 252, 92, 26, uiColor(0x111111));
  d.rectfill(228, 252, 92, 26, uiColor(0x3556e8));
  d.rectfill(320, 252, 92, 26, uiColor(0xf4e84a));
  d.rectfill(412, 252, 92, 26, uiColor(0xf04eda));
  d.rectfill(504, 252, 92, 26, uiColor(0x46e6e6));
  drawLightPanelBox(142, 130, 356, 74, COLORS.ink);
  d.printCentered('NOVA64 SIGNAL TEST', DESIGN_W / 2, 148, uiColor(COLORS.ink), 2);
  d.printCentered('PLEASE STAND BY', DESIGN_W / 2, 178, uiColor(COLORS.ink), 2);
  drawRgbShift(0.45, 2);
}

function drawNovaLoader() {
  const d = nova64.draw;
  d.rectfill(0, 0, DESIGN_W, DESIGN_H, uiColor(0x000000));
  d.drawNoise(0, 0, DESIGN_W, DESIGN_H, 28, Math.floor(totalTime * 20));
  drawLightPanelBox(156, 104, 328, 142, COLORS.cyan);
  d.printCentered('NOVA64', DESIGN_W / 2, 126, uiColor(COLORS.ink), 3);
  d.printCentered('LOAD CITY_009', DESIGN_W / 2, 164, uiColor(COLORS.ink), 2);

  const progress = clamp(sceneTime / 4.35, 0, 1);
  d.rectfill(204, 198, 232, 16, d.rgba8(2, 12, 18, 230));
  d.rect(204, 198, 232, 16, uiColor(COLORS.cyan), false);
  d.rectfill(208, 202, Math.floor(224 * progress), 8, d.rgba8(46, 233, 255, 238));

  const status =
    sceneTime < 1.2
      ? 'READING MEMORY CARD'
      : sceneTime < 2.65
        ? 'LOADING CITY_009'
        : 'TUNING CRT SIGNAL';
  d.printCentered(status, DESIGN_W / 2, 224, uiColor(COLORS.ink), 1);
}

function drawGlitchIn() {
  drawRoomOverlay();
  if (sceneTime < 1.25) {
    drawColorBars(sceneTime);
    return;
  }

  const d = nova64.draw;
  const intensity = clamp(1 - (sceneTime - 1.25) / 2.75, 0, 1);
  d.drawNoise(0, 0, DESIGN_W, DESIGN_H, 90 * intensity, Math.floor(totalTime * 40));
  for (let i = 0; i < 12; i++) {
    const y = Math.floor((i * 31 + totalTime * 120) % DESIGN_H);
    const h = 3 + ((i * 7) % 12);
    const x = Math.floor(Math.sin(totalTime * 6 + i) * 26 * intensity);
    d.rectfill(x, y, DESIGN_W, h, d.rgba8(46, 233, 255, 28 + 80 * intensity));
    d.rectfill(-x, y + h + 2, DESIGN_W, 2, d.rgba8(255, 75, 216, 28 + 68 * intensity));
  }
  drawRgbShift(intensity, 4);
  drawLightPanelBox(152, 142, 336, 62, COLORS.magenta);
  d.printCentered('SIGNAL RESTORED', DESIGN_W / 2, 154, uiColor(COLORS.ink), 2);
  d.printCentered('CITY_009 // BEDROOM NODE', DESIGN_W / 2, 184, uiColor(COLORS.ink), 1);
}

function drawColorBars(_time) {
  const d = nova64.draw;
  const bars = [0xc8c8c8, 0xf4e84a, 0x46e6e6, 0x42d35a, 0xf04eda, 0xe54a4a, 0x3556e8];
  const w = Math.ceil(DESIGN_W / bars.length);
  for (let i = 0; i < bars.length; i++) d.rectfill(i * w, 0, w + 1, DESIGN_H, uiColor(bars[i]));
  d.rectfill(0, 258, DESIGN_W, 102, uiColor(0x050505));
  d.rectfill(36, 278, 92, 46, uiColor(0x12325c));
  d.rectfill(128, 278, 92, 46, uiColor(0xffffff));
  d.rectfill(220, 278, 92, 46, uiColor(0x2b104d));
  d.rectfill(312, 278, 92, 46, uiColor(0x050505));
  d.rectfill(404, 278, 92, 46, uiColor(0x111111));
  d.rectfill(496, 278, 108, 46, uiColor(0xd8d8d8));
  drawLightPanelBox(174, 132, 292, 72, COLORS.ink);
  d.printCentered('NOVA64 SIGNAL', DESIGN_W / 2, 148, uiColor(COLORS.ink), 2);
  d.printCentered('PLEASE STAND BY', DESIGN_W / 2, 178, uiColor(COLORS.ink), 2);
  d.drawNoise(0, 0, DESIGN_W, DESIGN_H, 18, Math.floor(totalTime * 30));
  drawRgbShift(0.55, 3);
}

function drawBoot() {
  const d = nova64.draw;
  d.rectfill(0, 0, DESIGN_W, DESIGN_H, uiColor(0x000000));
  d.drawNoise(0, 0, DESIGN_W, DESIGN_H, 32, Math.floor(totalTime * 12));

  const logoReady = sceneTime > 0.45;
  if (logoReady) {
    drawLightPanelBox(194, 58, 252, 72, COLORS.cyan);
    d.printCentered('NOVA64', DESIGN_W / 2, 82, uiColor(COLORS.ink), 3);
    d.printCentered('BIOS v0.64', DESIGN_W / 2, 116, uiColor(COLORS.ink), 2);
  }

  const lines = [
    'SIGNAL FOUND',
    memory.runs > 1 ? 'MEMORY CARD REMEMBERED' : 'MEMORY CARD DETECTED',
    'SAVE FILE: CITY_009',
    memory.runs > 1 ? 'LAST LOADED: ' + formatLastPlayed() : 'LAST PLAYED: 1999',
    'LOAD FILE?',
  ];
  if (sceneTime > 1.2) drawLightPanelBox(98, 138, 444, 116, COLORS.cyan);
  for (let i = 0; i < lines.length; i++) {
    if (sceneTime > 1.2 + i * 0.55) d.print(lines[i], 122, 150 + i * 21, uiColor(COLORS.ink), 2);
  }

  if (sceneTime > 4.2) {
    drawChoice('YES', 246, 270, true);
    drawChoice('NO', 378, 270, false);
  }
  if (deniedNo) {
    drawLightPanelBox(220, 290, 200, 22, COLORS.magenta);
    d.printCentered('NO WAS NOT SAVED.', DESIGN_W / 2, 298, uiColor(COLORS.ink), 1);
  }
  if (memory.completed && memory.lastChoice) {
    drawLightPanelBox(196, 318, 248, 22, COLORS.cyan);
    d.printCentered(
      'LAST EXIT: ' + memory.lastChoice.toUpperCase(),
      DESIGN_W / 2,
      326,
      uiColor(COLORS.ink),
      1
    );
  }
}

function drawRoomOverlay() {
  const d = nova64.draw;

  // Dust drifting in the TV's light (kept low so it never veils the screen).
  for (const m of dust) {
    const tw = 0.55 + Math.sin(totalTime * 2 + m.ph) * 0.45;
    d.circle(m.x, m.y, m.r, d.rgba8(170, 212, 244, Math.floor(m.a * tw)), true);
  }
  for (const p of sparks) {
    d.circle(p.x, p.y, 1 + p.life * 3, uiColor(p.color), false);
  }

  const lines = timedLines([
    [1.0, 'Before everything was online,'],
    [4.8, 'a game could feel like a secret.'],
    [8.7, 'A world inside a plastic shell.'],
    [12.4, 'A rumor passed between friends.'],
    [16.2, 'A place you could only reach after school.'],
    [24.0, 'The television remembered the way in.'],
  ]);
  drawFilmCaption(lines);

  if (tv && tv.ok === false) d.print('SIGNAL BLEED', 116, 139, uiColor(COLORS.cyan), 1);
  if (sceneTime > 25 && Math.sin(totalTime * 4) > -0.3) {
    d.printCentered('tap the glowing cart', DESIGN_W / 2, 280, uiColor(COLORS.amber), 1);
  }
}

// Slim film-style caption riding a translucent lower band, so the glowing TV
// stays visible behind the words instead of being walled off by a bright slab.
function drawFilmCaption(lines) {
  const d = nova64.draw;
  const bandY = 296;
  const bandH = DESIGN_H - bandY;
  d.rectfill(0, bandY, DESIGN_W, bandH, d.rgba8(2, 4, 10, 190));
  d.rectfill(0, bandY, DESIGN_W, 2, d.rgba8(255, 204, 119, 150));
  if (lines.length === 0) return;
  const visible = lines.slice(-2);
  const startY = bandY + (bandH - visible.length * 22) / 2 + 2;
  for (let i = 0; i < visible.length; i++) {
    d.printCentered(visible[i], DESIGN_W / 2, startY + i * 22, uiColor(COLORS.amber), 2);
  }
}

function drawCityOverlay() {
  const d = nova64.draw;
  // Thin top vignette for the hint; the rest of the view stays clear for the city.
  d.drawGradient(0, 0, DESIGN_W, 56, d.rgba8(4, 5, 14, 150), d.rgba8(0, 0, 0, 0), 'v');
  if (Math.sin(totalTime * 3) > -0.3) {
    d.printCentered(
      'hold left / right   -   tap a sign',
      DESIGN_W / 2,
      20,
      uiColor(COLORS.amber),
      1
    );
  }

  drawCitySigns();

  const lines = timedLines([
    [1.0, 'Nova64 is a fantasy console'],
    [5.3, 'for tiny games, strange worlds,'],
    [9.2, 'and impossible nostalgia.'],
    [14.0, 'Not a retro console.'],
    [18.0, 'A new machine from the timeline'],
    [22.0, 'where the weird games won.'],
  ]);
  drawFilmCaption(lines);
}

// Neon verb signs — dark glass plates with a glowing colored border, brightening
// to white when tapped.
function drawCitySigns() {
  const d = nova64.draw;
  for (const s of CITY_SIGNS) {
    const on = citySignPulse === s.label && citySignTimer > 0;
    d.rectfill(s.x, s.y, s.w, s.h, d.rgba8(2, 8, 16, on ? 235 : 190));
    d.rect(s.x, s.y, s.w, s.h, uiColor(s.color), false);
    d.rect(s.x + 2, s.y + 2, s.w - 4, s.h - 4, d.rgba8(255, 255, 255, on ? 90 : 28), false);
    if (on) d.rect(s.x - 2, s.y - 2, s.w + 4, s.h + 4, uiColor(COLORS.white), false);
    d.printCentered(
      s.label,
      s.x + s.w / 2,
      s.y + (s.h - 14) / 2,
      uiColor(on ? COLORS.white : s.color),
      2
    );
  }
}

function drawInvitationOverlay() {
  const d = nova64.draw;
  // Light top + bottom vignettes only, so the glowing 3D cart-on-pedestal stays
  // the hero behind the UI instead of being veiled into black.
  d.drawGradient(0, 0, DESIGN_W, 86, d.rgba8(4, 7, 16, 150), d.rgba8(0, 0, 0, 0), 'v');
  d.drawGradient(0, 286, DESIGN_W, 74, d.rgba8(0, 0, 0, 0), d.rgba8(4, 7, 16, 170), 'v');

  // Title
  drawPanelBox(150, 18, 340, 56, COLORS.cyan, 205);
  d.printCentered('YOU FOUND A CART.', DESIGN_W / 2, 30, uiColor(COLORS.white), 2);
  if (sceneTime > 1.5) d.printCentered('Now make one.', DESIGN_W / 2, 54, uiColor(COLORS.amber), 2);

  if (sceneTime > 3) drawButtons();

  if (sceneTime > 6) {
    drawPanelBox(168, 310, 304, 42, COLORS.magenta, 168);
    d.printCentered('Keep the card.', DESIGN_W / 2, 318, uiColor(COLORS.amber), 1);
    d.printCentered('Someone else may need it.', DESIGN_W / 2, 334, uiColor(COLORS.white), 1);
  }
}

function drawButtons() {
  const d = nova64.draw;
  buttonRects.length = 0;
  const w = 320;
  const x = (DESIGN_W - w) / 2;
  const h = 34;
  const startY = 168;
  const gap = 42;
  for (let i = 0; i < BUTTONS.length; i++) {
    const y = startY + i * gap;
    buttonRects.push({ x, y, w, h });
    const hover = ctaHover === i;
    const accent = hover ? COLORS.amber : COLORS.cyan;
    d.rectfill(x, y, w, h, d.rgba8(3, 12, 20, hover ? 240 : 206));
    d.rect(x, y, w, h, uiColor(accent), false);
    // left accent tab so the row reads as a selectable button
    d.rectfill(x + 3, y + 3, 4, h - 6, uiColor(accent));
    d.printCentered(
      BUTTONS[i].label,
      x + w / 2 + 2,
      y + (h - 8) / 2,
      uiColor(hover ? COLORS.amber : COLORS.white),
      2
    );
  }
}

function drawChoice(label, x, y, selected) {
  const d = nova64.draw;
  d.rectfill(x, y, 116, 34, selected ? d.rgba8(244, 247, 255, 255) : d.rgba8(0, 2, 8, 242));
  d.rect(x, y, 116, 34, uiColor(selected ? COLORS.cyan : COLORS.muted), false);
  d.printCentered(label, x + 58, y + 10, uiColor(selected ? COLORS.ink : COLORS.white), 2);
}

function drawLightPanelBox(x, y, w, h, borderColor) {
  const d = nova64.draw;
  d.rectfill(x, y, w, h, d.rgba8(244, 247, 255, 246));
  d.rect(x, y, w, h, uiColor(borderColor), false);
  d.rect(x + 2, y + 2, w - 4, h - 4, d.rgba8(0, 2, 8, 52), false);
}

function drawPanelBox(x, y, w, h, borderColor, alpha = 220) {
  const d = nova64.draw;
  d.rectfill(x, y, w, h, d.rgba8(0, 2, 8, alpha));
  d.rect(x, y, w, h, uiColor(borderColor), false);
  d.rect(x + 2, y + 2, w - 4, h - 4, d.rgba8(255, 255, 255, 28), false);
}

function drawCrtOverlay() {
  const d = nova64.draw;
  if (scene === 'boot' || scene === 'loader' || scene === 'glitch') {
    const amount = scene === 'glitch' ? 0.55 : 0.18 + Math.sin(totalTime * 5) * 0.08;
    drawRgbShift(amount, scene === 'glitch' ? 3 : 1);
  }
  d.drawScanlines(54, 3);
  if (Math.random() < 0.045) {
    const y = Math.floor(Math.random() * DESIGN_H);
    d.rectfill(0, y, DESIGN_W, 1, d.rgba8(180, 235, 255, 42));
  }
  d.rect(6, 6, DESIGN_W - 12, DESIGN_H - 12, d.rgba8(145, 220, 245, 32), false);
}

function drawRgbShift(intensity = 0.3, offset = 2) {
  const d = nova64.draw;
  const a = Math.floor(clamp(intensity, 0, 1) * 72);
  if (a <= 0) return;
  const drift = Math.sin(totalTime * 7) > 0 ? offset : -offset;
  d.rect(10 + drift, 10, DESIGN_W - 20, DESIGN_H - 20, d.rgba8(255, 40, 60, a), false);
  d.rect(10 - drift, 12, DESIGN_W - 20, DESIGN_H - 24, d.rgba8(40, 120, 255, a), false);
  for (let i = 0; i < 5; i++) {
    const y = Math.floor((totalTime * 70 + i * 59) % DESIGN_H);
    d.rectfill(drift * 2, y, DESIGN_W, 1, d.rgba8(255, 32, 64, a * 0.6));
    d.rectfill(-drift * 2, y + 2, DESIGN_W, 1, d.rgba8(32, 96, 255, a * 0.55));
  }
}

function timedLines(items) {
  return items.filter(item => sceneTime >= item[0]).map(item => item[1]);
}

function checkCitySigns(x, y) {
  for (const s of CITY_SIGNS) {
    if (inRect(x, y, s.x, s.y, s.w, s.h)) {
      citySignPulse = s.label;
      citySignTimer = 1.1;
      playSound('coin');
      return;
    }
  }
}

function chooseButton(index) {
  const choice = BUTTONS[index];
  memory.completed = true;
  memory.lastChoice = choice.key;
  memory.furthestScene = 'invite';
  memory.lastPlayedAt = new Date().toISOString();
  nova64.data.saveData(SAVE_KEY, memory);
  playSound('confirm');
  if (typeof window !== 'undefined' && window.location) {
    window.location.href = choice.url;
  }
}

function setCamera(x, y, z, tx, ty, tz, fov) {
  nova64.camera.setCameraPosition(x, y, z);
  nova64.camera.setCameraTarget(tx, ty, tz);
  if (nova64.camera.setCameraFOV) nova64.camera.setCameraFOV(fov);
}

function addMesh(group, mesh) {
  if (mesh !== null && mesh !== undefined) group.push(mesh);
  return mesh;
}

function showGroup(group, visible) {
  for (const mesh of group) {
    if (mesh !== null && mesh !== undefined) nova64.scene.setMeshVisible(mesh, visible);
  }
}

function tryCall(fn, ...args) {
  if (typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch (_error) {
    // Optional effect unsupported on this host.
  }
}

function playSound(name) {
  tryCall(nova64.audio && nova64.audio.sfx, name);
}

function pulseColor(base) {
  return Math.sin(totalTime * 5) > 0 ? base : COLORS.white;
}

function formatLastPlayed() {
  if (!memory.lastPlayedAt) return '1999';
  const d = new Date(memory.lastPlayedAt);
  if (Number.isNaN(d.getTime())) return '1999';
  return String(d.getFullYear());
}

function inRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
