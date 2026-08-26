// Coastal Signal — Chapter 01: Arrival
// A Space Harrier–style forward rail ride on a hovering board: the world
// scrolls toward a fixed rider through a cool blue dusk, over a low-poly
// reflective endless ocean, past reflective multicolor asteroid-chunks and
// randomised drifting clouds, with a rare shooting star and a hidden signal
// fragment tucked into the ride. Drag left/right to steer and bank, tap the
// corner icon to swap first-/third-person, and a warm glowing signal grows
// on the horizon as you close in on it — catching it is the chapter's
// climax. Every moving element streams toward the rider (Z increases from
// far negative toward the camera, recycling once it's passed) — never away
// from them.
import { getChapterContext } from '../../../chapter-context';
import { mulberry32 } from '../../../../lib/seed';
import { packColor } from '../../../pack-color';

declare const nova64: any;

// nova64.input.mouseX()/mouseY() report in a fixed virtual 640x360 space regardless
// of real canvas resolution (see runtime/input.js updateMousePosition) — every
// input calculation below is done in this space, never against screenWidth().
const INPUT_W = 640;
const INPUT_H = 360;

const FORWARD_SPEED = 7; // world units/sec
const THROTTLE_MULT = 1.8;
const FIRE_COOLDOWN = 0.14; // seconds between shots while firing is held
const LATERAL_RANGE = 3.4;
const CLOUD_COUNT = 8;
const RIDGE_COUNT = 9;
const SIGNAL_SPAWN_DIST = 95; // total ride distance before the signal appears ahead
const SIGNAL_SPAWN_Z = -55;
const CAM_ICON_ZONE = { x0: 552, y0: 10, x1: 630, y1: 54 }; // input-space hit box

const BLOCK_WALL_Z = -42;
const PROJECTILE_SPEED = 34;

// Voxel invader squadron — bilaterally-symmetric pixel-art aliens (classic
// Space Invaders sprite technique: randomise one half of each row, mirror it
// onto the other half), each cell built as a front + background depth layer.
// Waves repeat throughout the ride until WAVE_STOP_BUFFER units before the
// signal appears, and are only cleared once well past the camera
// (WAVE_CLEAR_Z), so they visibly fly through and by rather than halting.
// Each block tracks its own spawnDist rather than sharing one for the whole
// wave, which is what lets a new wave start (WAVE_INTERVAL) before the
// previous one has fully cleared (the clear travel distance, WAVE_CLEAR_Z -
// BLOCK_WALL_Z = 56, is longer than the interval) — multiple waves are
// airborne at once instead of strictly one-at-a-time.
const INVADER_COUNT = 3;
const INVADER_COLS = 6;
const INVADER_ROWS = 4;
const INVADER_CELL = 0.34;
const INVADER_BG_Z_OFFSET = 0.22;
const INVADER_SPACING = 2.6;
const FIRST_WAVE_DIST = 26;
const WAVE_INTERVAL = 24;
const WAVE_STOP_BUFFER = 20;
const WAVE_CLEAR_Z = 14;

type Beat = 'intro' | 'ride' | 'rising' | 'ready' | 'climax';

let beat: Beat = 'intro';
let beatTime = 0;
let rideHintCleared = false;
let completeSent = false;
let chapterCtx: ReturnType<typeof getChapterContext> | null = null;
let rand: () => number = Math.random;

let dist = 0;
let steerX = 0;
let fireTimer = 0;
let cameraMode: 'first' | 'third' = 'third';

interface ShipPart {
  mesh: any;
  ox: number;
  oy: number;
  oz: number;
  extraRotX: number;
  extraRotZ: number;
}
let shipParts: ShipPart[] = [];
let sprayEmitter: any;
let wakeEmitter: any;
let dustEmitter: any;
let burstEmitter: any;
let cometTrailEmitter: any;
let muzzleEmitter: any;

interface Cloud {
  mesh: any;
  type: 'puff' | 'stretched';
  baseX: number;
  baseY: number;
  speedMult: number;
  offset: number;
  bobPhase: number;
  bobSpeed: number;
  bobAmount: number;
}
let clouds: Cloud[] = [];

// A handful of small, dim stars drifting across the sky, each on its own
// independent cross-then-pause cycle (wall-clock, same as the shooting-star
// comet below) — ambient background life, not an easter egg, so no caption
// and much subtler than the comet.
interface Star {
  mesh: any;
  y: number;
  z: number;
  crossDuration: number;
  pauseDuration: number;
  timer: number;
  startX: number;
  endX: number;
}
let stars: Star[] = [];

interface Ridge {
  mesh: any;
  baseX: number;
  offset: number;
  spin: [number, number, number];
  special: boolean;
  foundSpecial: boolean;
}
let ridges: Ridge[] = [];

interface Peak {
  mesh: any;
  baseX: number;
  baseY: number;
  offset: number;
  speedMult: number;
}
let peaks: Peak[] = [];

interface WaterTile {
  mesh: any;
  baseX: number;
  baseZ: number;
  baseY: number;
  bobPhase: number;
  bobAmount: number;
}
let waterTiles: WaterTile[] = [];

let crest: any = null;
let ring: any = null;
let crestSpawnDist = 0;

let comet: { mesh: any; t: number; duration: number; startX: number; endX: number; y: number; z: number } | null =
  null;
let cometSpawnDist = 0;
let cometHasSpawned = false;

interface Block {
  mesh: any;
  bgMesh: any;
  gridX: number;
  gridY: number;
  color: number;
  alive: boolean;
  currentZ: number;
  spawnDist: number;
}
let blocks: Block[] = [];
let nextWaveDist = FIRST_WAVE_DIST;

interface Projectile {
  mesh: any;
  x: number;
  y: number;
  z: number;
}
let projectiles: Projectile[] = [];

let hue = 0;
let crestColor = 0;
let ringColor = 0;
let boardColor = 0;

function hsvToHex(h: number, s: number, v: number): number {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return ((r * 255) << 16) | ((g * 255) << 8) | (b * 255);
}

const RIDE_HINT_SECONDS = 3.2;
const BEAT_CAPTIONS: Record<Beat, string | null> = {
  intro: 'Something is reaching for you',
  // A brief one-time controls hint, then cleared once RIDE_HINT_SECONDS
  // passes (see update()) — after that, pure visuals, no HUD text.
  ride: 'Drag/arrows to steer · hold space to fire · enter to throttle · C for camera',
  rising: "It knows you're here",
  ready: 'Tap to catch it',
  climax: 'You caught it',
};

function setBeat(next: Beat) {
  beat = next;
  beatTime = 0;
  chapterCtx?.setCaption(BEAT_CAPTIONS[next]);
}

export function init() {
  const ctx = getChapterContext();
  chapterCtx = ctx;
  rand = mulberry32(ctx.chapterSeed);
  // A bright, cheerful daytime sky-blue — Mario-World-bright, not moody dusk
  // — with the warm amber signal still the one thing that doesn't belong.
  hue = 0.55 + rand() * 0.08;

  // More saturated, less pure-white than the first pass — "bright" should
  // read as vivid colour, not a washed-out white glare.
  const skyTop = hsvToHex((hue - 0.03 + 1) % 1, 0.62, 0.72);
  const skyHorizon = hsvToHex(hue, 0.45, 0.8);
  crestColor = hsvToHex(0.1 + rand() * 0.03, 0.75, 1); // warm sunny amber — the one accent
  ringColor = hsvToHex((hue + 0.5) % 1, 0.12, 0.95);
  boardColor = hsvToHex((hue - 0.1 + 1) % 1, 0.45, 0.9);

  nova64.light.createGradientSkybox(skyTop, skyHorizon);
  nova64.light.setAmbientLight(0xffffff, 0.85);
  // A soft haze near the horizon — pushes the far edge of the ocean grid
  // into an atmospheric blend instead of a visible seam, and reads as
  // "sunny sea air" rather than gloom.
  nova64.light.setFog(skyHorizon, 20, 66);
  nova64.light.createPointLight(skyHorizon, 1.6, 40, 0, 3, -20);

  nova64.fx.enablePSXMode();
  // enableBloom's real signature is (strength, radius, THRESHOLD) — this was
  // previously called as if threshold were the middle argument, passing 0.18
  // as the threshold. That's a very low bar (bloom fires on almost any lit
  // pixel), which is exactly what was blowing the whole bright sky/water out
  // to solid white instead of just letting the crest/invaders/engine glow
  // bleed. A high threshold keeps bloom selective to genuinely emissive
  // things; strength/radius stay a bit above the PSX default for some bleed
  // on those highlights.
  nova64.fx.enableBloom(1.1, 0.4, 0.82);
  nova64.fx.enableVignette(0.6, 0.88);
  nova64.fx.enableChromaticAberration(0.0012);

  // A real fighter-craft silhouette, not a slab: slim fuselage, a forward
  // nose cone, swept wings, a glassy cockpit bump, and twin engine glows —
  // several small parts read as a ship far better than one flat shape did.
  shipParts = [];
  const hullColor = boardColor;
  const wingColor = hsvToHex((hue - 0.05 + 1) % 1, 0.3, 0.75);
  const cockpitColor = hsvToHex((hue + 0.5) % 1, 0.4, 1);

  const fuselage = nova64.scene.createCube(1, hullColor, [0, 0, 0], { metallic: true, roughness: 0.2 });
  nova64.scene.setScale(fuselage, 0.32, 0.11, 1.9);
  shipParts.push({ mesh: fuselage, ox: 0, oy: 0, oz: 0, extraRotX: 0, extraRotZ: 0 });

  const nose = nova64.scene.createCone(0.15, 0.55, hullColor, [0, 0, 0], { metallic: true, roughness: 0.15 });
  shipParts.push({ mesh: nose, ox: 0, oy: 0, oz: -1.05, extraRotX: -Math.PI / 2, extraRotZ: 0 });

  const wingL = nova64.scene.createCube(1, wingColor, [0, 0, 0], {
    metallic: true,
    roughness: 0.3,
    transparent: true,
    opacity: 0.88,
  });
  nova64.scene.setScale(wingL, 0.85, 0.035, 0.5);
  shipParts.push({ mesh: wingL, ox: 0.5, oy: -0.03, oz: 0.2, extraRotX: 0, extraRotZ: 0.28 });

  const wingR = nova64.scene.createCube(1, wingColor, [0, 0, 0], {
    metallic: true,
    roughness: 0.3,
    transparent: true,
    opacity: 0.88,
  });
  nova64.scene.setScale(wingR, 0.85, 0.035, 0.5);
  shipParts.push({ mesh: wingR, ox: -0.5, oy: -0.03, oz: 0.2, extraRotX: 0, extraRotZ: -0.28 });

  const cockpit = nova64.scene.createSphere(0.11, cockpitColor, [0, 0, 0], 6, {
    emissive: cockpitColor,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.85,
  });
  shipParts.push({ mesh: cockpit, ox: 0, oy: 0.09, oz: -0.5, extraRotX: 0, extraRotZ: 0 });

  const engineL = nova64.scene.createSphere(0.09, crestColor, [0, 0, 0], 5, {
    emissive: crestColor,
    emissiveIntensity: 1.8,
  });
  shipParts.push({ mesh: engineL, ox: 0.13, oy: -0.02, oz: 0.92, extraRotX: 0, extraRotZ: 0 });

  const engineR = nova64.scene.createSphere(0.09, crestColor, [0, 0, 0], 5, {
    emissive: crestColor,
    emissiveIntensity: 1.8,
  });
  shipParts.push({ mesh: engineR, ox: -0.13, oy: -0.02, oz: 0.92, extraRotX: 0, extraRotZ: 0 });

  // Clouds: two distinct silhouettes, not one shape at random sizes — low
  // puffy cumulus and higher, wider, wispier cirrus streaks — plus every
  // other parameter (size, squash, speed, opacity, bob phase) independently
  // randomised so no two of the same type drift alike either.
  clouds = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cloudType: Cloud['type'] = rand() < 0.55 ? 'puff' : 'stretched';
    const size = cloudType === 'puff' ? 1.0 + rand() * 2.3 : 1.5 + rand() * 2.6;
    const tint = hsvToHex((hue + (rand() - 0.5) * 0.1 + 1) % 1, 0.15 + rand() * 0.15, 0.9 + rand() * 0.1);
    const mesh = nova64.scene.createSphere(size, tint, [0, 0, 0], 5, {
      flatShading: true,
      roughness: 0.9,
      transparent: true,
      opacity: cloudType === 'puff' ? 0.5 + rand() * 0.35 : 0.3 + rand() * 0.22,
    });
    if (cloudType === 'puff') {
      nova64.scene.setScale(mesh, 1.2 + rand() * 0.9, 0.3 + rand() * 0.35, 0.8 + rand() * 0.6);
    } else {
      // Cirrus streak: much wider and flatter, longer along the flight axis
      // too — reads as a thin high-altitude wisp rather than a puffy blob.
      nova64.scene.setScale(mesh, 2.8 + rand() * 2.4, 0.12 + rand() * 0.1, 1.6 + rand() * 1.3);
    }
    clouds.push({
      mesh,
      type: cloudType,
      baseX: (rand() - 0.5) * 30,
      baseY: cloudType === 'puff' ? 3 + rand() * 4 : 6.5 + rand() * 3.5,
      speedMult: 0.45 + rand() * 0.75,
      offset: rand() * 90,
      bobPhase: rand() * Math.PI * 2,
      bobSpeed: 0.15 + rand() * 0.3,
      bobAmount: cloudType === 'puff' ? 0.2 + rand() * 0.4 : 0.08 + rand() * 0.15,
    });
  }

  // A handful of small, dim stars that drift across the sky on their own
  // slow cross-then-pause cycles — ambient background life, deliberately
  // subtler and more numerous than the one-time shooting-star easter egg
  // below (which still gets its own fanfare/caption; these don't).
  const STAR_COUNT = 4;
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const mesh = nova64.scene.createSphere(0.07 + rand() * 0.05, 0xf4f7ff, [0, 0, 0], 4, {
      emissive: 0xf4f7ff,
      emissiveIntensity: 0.9 + rand() * 0.5,
    });
    stars.push({
      mesh,
      y: 10 + rand() * 6,
      z: -35 - rand() * 25,
      crossDuration: 16 + rand() * 10,
      pauseDuration: 6 + rand() * 14,
      timer: rand() * 20,
      startX: -24 - rand() * 6,
      endX: 24 + rand() * 6,
    });
  }

  // Distant terrain: a mix of low-poly rocky hills (flat-shaded, matte) and
  // reflective pyramids (low-segment cones, metallic, catching the bright
  // sky) breaking up the empty background — a denser, larger, closer range
  // than the first pass, which was too small and too far out to read as a
  // real landscape rather than background clutter.
  const PEAK_COUNT = 12;
  peaks = [];
  for (let i = 0; i < PEAK_COUNT; i++) {
    const isPyramid = rand() < 0.45;
    const height = 6 + rand() * 12;
    const radius = height * (0.45 + rand() * 0.25);
    const color = isPyramid
      ? hsvToHex((hue + 0.5 + (rand() - 0.5) * 0.08 + 1) % 1, 0.15, 0.88)
      : hsvToHex((hue - 0.18 + (rand() - 0.5) * 0.06 + 1) % 1, 0.32 + rand() * 0.15, 0.3 + rand() * 0.15);
    const mesh = nova64.scene.createCone(radius, height, color, [0, 0, 0], isPyramid
      ? { metallic: true, roughness: 0.12, flatShading: true, segments: 4 }
      : { flatShading: true, roughness: 0.95, segments: 6 });
    peaks.push({
      mesh,
      baseX: (rand() < 0.5 ? -1 : 1) * (14 + rand() * 20),
      baseY: -0.6 + height / 2,
      offset: rand() * 140,
      speedMult: 0.3 + rand() * 0.2,
    });
  }

  // Asteroid-chunks: reflective (metallic), multicolor (independent hue per
  // chunk, not tied to the scene's blue bias), translucent, mixed shapes.
  // One, chosen at random per token, is the hidden signal fragment.
  ridges = [];
  const specialIndex = Math.floor(rand() * RIDGE_COUNT);
  for (let i = 0; i < RIDGE_COUNT; i++) {
    const special = i === specialIndex;
    const size = special ? 0.55 : 0.35 + rand() * 0.45;
    const color = special ? 0xffd76a : hsvToHex(rand(), 0.55 + rand() * 0.3, 0.9);
    const materialOpts = {
      metallic: true,
      roughness: 0.2 + rand() * 0.2,
      transparent: true,
      opacity: special ? 0.9 : 0.6 + rand() * 0.25,
      ...(special ? { emissive: 0xffcc33, emissiveIntensity: 1.1 } : {}),
    };
    const shapePick = rand();
    const mesh =
      shapePick < 0.4
        ? nova64.scene.createSphere(size, color, [0, 0, 0], 5, materialOpts)
        : shapePick < 0.7
          ? nova64.scene.createCone(size * 0.7, size * 1.5, color, [0, 0, 0], materialOpts)
          : nova64.scene.createTorus(size * 0.8, size * 0.28, color, [0, 0, 0], materialOpts);
    ridges.push({
      mesh,
      baseX: (rand() - 0.5) * LATERAL_RANGE * 2.6,
      offset: rand() * 60,
      spin: [0.3 + rand() * 0.8, 0.2 + rand() * 0.7, 0.1 + rand() * 0.5],
      special,
      foundSpecial: false,
    });
  }

  // Low-poly reflective ocean: since the board never actually translates in
  // world Z (the classic Space-Harrier illusion — the rider stays fixed near
  // Z=0 and the world scrolls toward them instead), a single static grid of
  // tiles that's larger than the fog-out distance reads as endless with no
  // recycling logic needed at all, unlike the clouds/ridges/waves above.
  // Kept close under the board (not far below it) so it reads as a surfboard
  // skimming the water, not a distant sea floor — vivid tropical tint, and a
  // travelling swell (driven by dist + each tile's Z, in update()) on top of
  // each tile's own bob so the whole surface visibly rolls, not just jitters.
  const WATER_ROWS = 8;
  const WATER_COLS = 8;
  const WATER_Y = -0.55;
  waterTiles = [];
  for (let row = 0; row < WATER_ROWS; row++) {
    for (let col = 0; col < WATER_COLS; col++) {
      const baseZ = -60 + (row / (WATER_ROWS - 1)) * 72;
      const baseX = -42 + (col / (WATER_COLS - 1)) * 84;
      const baseY = WATER_Y + (rand() - 0.5) * 0.2;
      // Darker and more saturated than the first pass — against a brighter
      // sky, a pale tint just merged into the background instead of reading
      // as distinct water.
      const tint = hsvToHex((hue + 0.03 + (rand() - 0.5) * 0.04 + 1) % 1, 0.75 + rand() * 0.15, 0.55 + rand() * 0.15);
      const mesh = nova64.scene.createPlane(13, 12, tint, [baseX, baseY, baseZ], {
        metallic: true,
        roughness: 0.1 + rand() * 0.08,
        transparent: true,
        opacity: 0.95,
      });
      // Plane geometry defaults to facing +Z; tip it flat (-90° on X) to lie
      // like a water surface, with a slight random tilt per tile for the
      // faceted low-poly look instead of one perfectly flat sheet.
      nova64.scene.setRotation(mesh, -Math.PI / 2 + (rand() - 0.5) * 0.08, 0, (rand() - 0.5) * 0.08);
      waterTiles.push({
        mesh,
        baseX,
        baseZ,
        baseY,
        bobPhase: rand() * Math.PI * 2,
        bobAmount: 0.14 + rand() * 0.16,
      });
    }
  }

  // A shooting star crosses the sky exactly once per ride, at a
  // seeded-random moment — a small easter egg, not a random per-frame roll.
  cometSpawnDist = 30 + rand() * 45;
  cometHasSpawned = false;

  sprayEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 30,
    maxParticles: 160,
    life: 0.6,
    lifeVariance: 0.2,
    speed: 30,
    speedVariance: 14,
    angle: -Math.PI / 2,
    angleVariance: 0.6,
    gravity: 50,
    startSize: 2,
    endSize: 0,
    startAlpha: 0.7,
    endAlpha: 0,
    colors: [0xffffff, crestColor],
  });
  // A second, gentler thruster wake either side of the board's trail —
  // always present, brightens with speed, reads as propulsion.
  wakeEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 24,
    maxParticles: 100,
    life: 0.5,
    lifeVariance: 0.15,
    speed: 14,
    speedVariance: 6,
    angle: Math.PI / 2,
    angleVariance: 0.3,
    gravity: -6,
    startSize: 1.6,
    endSize: 0,
    startAlpha: 0.55,
    endAlpha: 0,
    colors: [crestColor, 0xffffff],
  });
  // Sparse ambient dust motes across the whole frame — atmospheric depth,
  // independent of steering or speed.
  dustEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 6,
    maxParticles: 90,
    life: 3,
    lifeVariance: 1,
    speed: 4,
    speedVariance: 3,
    angle: 0,
    angleVariance: Math.PI * 2,
    gravity: 0,
    startSize: 1.2,
    endSize: 0,
    startAlpha: 0.35,
    endAlpha: 0,
    colors: [0xffffff, ringColor],
  });
  burstEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 0,
    maxParticles: 160,
    life: 1.1,
    lifeVariance: 0.4,
    speed: 60,
    speedVariance: 30,
    angle: -Math.PI / 2,
    angleVariance: Math.PI,
    gravity: 10,
    startSize: 3,
    endSize: 0,
    startAlpha: 1,
    endAlpha: 0,
    colors: [0xffffff, crestColor, skyHorizon],
  });
  cometTrailEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 0,
    maxParticles: 120,
    life: 0.5,
    lifeVariance: 0.15,
    speed: 8,
    speedVariance: 6,
    angle: Math.PI,
    angleVariance: 0.4,
    gravity: 0,
    startSize: 2.4,
    endSize: 0,
    startAlpha: 0.9,
    endAlpha: 0,
    colors: [0xffffff, 0xbfe0ff],
  });
  muzzleEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 0,
    maxParticles: 60,
    life: 0.3,
    lifeVariance: 0.1,
    speed: 40,
    speedVariance: 15,
    angle: -Math.PI / 2,
    angleVariance: 0.5,
    gravity: -20,
    startSize: 2.5,
    endSize: 0,
    startAlpha: 1,
    endAlpha: 0,
    colors: [0xffffff, 0xbfe0ff],
  });

  setBeat('intro');
}

function inZone(x: number, y: number, z: { x0: number; y0: number; x1: number; y1: number }): boolean {
  return x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
}

// Randomise the left half of each row, mirror it onto the right half — the
// classic technique for a symmetric pixel-art alien sprite instead of
// visible noise.
function generateInvaderPattern(rows: number, cols: number): boolean[][] {
  const half = Math.ceil(cols / 2);
  const pattern: boolean[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowCells: boolean[] = [];
    for (let col = 0; col < half; col++) rowCells[col] = rand() > 0.45;
    for (let col = half; col < cols; col++) rowCells[col] = rowCells[cols - 1 - col] ?? false;
    pattern.push(rowCells);
  }
  return pattern;
}

function updateCamera(boardX: number, boardY: number) {
  if (cameraMode === 'third') {
    nova64.camera.setCameraPosition(boardX * 0.5, boardY + 2.3, 6.5);
    nova64.camera.setCameraTarget(boardX * 0.7, boardY + 0.2, -6);
  } else {
    nova64.camera.setCameraPosition(boardX, boardY + 0.55, 0.4);
    nova64.camera.setCameraTarget(boardX + steerX * 2.5, boardY + 0.1, -12);
  }
}

export function update(dt: number) {
  beatTime += dt;

  // Steering: mouse/touch drag OR arrow keys / A-D, recentres when neither
  // is active — classic rail-shooter feel, never "stuck" off to one side.
  // A touch/drag that's actually on the camera icon must NOT also steer the
  // board — that was yanking the board hard right the instant you tapped
  // the icon, which read as the button being broken rather than a steering
  // side-effect.
  const pressingIcon =
    nova64.input.mouseDown?.() && inZone(nova64.input.mouseX(), nova64.input.mouseY(), CAM_ICON_ZONE);
  const dragging = nova64.input.mouseDown?.() && !pressingIcon;
  const keyLeft = nova64.input.key?.('ArrowLeft') || nova64.input.key?.('KeyA');
  const keyRight = nova64.input.key?.('ArrowRight') || nova64.input.key?.('KeyD');
  const keyboardSteer = keyRight && !keyLeft ? 1 : keyLeft && !keyRight ? -1 : 0;
  const targetSteer = dragging
    ? Math.max(-1, Math.min(1, (nova64.input.mouseX() / INPUT_W - 0.5) * 2.4))
    : keyboardSteer;
  if (!pressingIcon) steerX += (targetSteer - steerX) * Math.min(1, dt * (dragging ? 4 : 3));

  const boardX = steerX * LATERAL_RANGE;
  const boardY = 0.9 + Math.sin(dist * 0.35) * 0.12 + Math.abs(steerX) * 0.05;
  const bank = -steerX * 0.6;

  // Every ship part moves rigidly together as one body. Each part's local
  // offset (wing sweep, nose position) must also orbit around the fuselage's
  // centre as the ship rolls — setting a part's own rotation to the shared
  // bank while leaving its (ox, oy) position offset unrotated made the wings
  // twist in place around their own centre instead of banking together with
  // the fuselage, which read as unnatural during steering. Rotating the
  // offset itself by the bank angle first fixes that.
  const bankCos = Math.cos(bank);
  const bankSin = Math.sin(bank);
  for (const part of shipParts) {
    const rotOx = part.ox * bankCos - part.oy * bankSin;
    const rotOy = part.ox * bankSin + part.oy * bankCos;
    nova64.scene.setPosition(part.mesh, boardX + rotOx, boardY + rotOy, part.oz);
    nova64.scene.setRotation(part.mesh, part.extraRotX, 0, bank + part.extraRotZ);
    nova64.scene.setMeshVisible?.(part.mesh, cameraMode === 'third');
  }

  // Throttle: hold Enter or T for a speed boost — a little vehicle-control
  // flourish on top of steering, continuous for as long as it's held.
  const throttling = nova64.input.key?.('Enter') || nova64.input.key?.('KeyT');
  const speed = FORWARD_SPEED * (throttling ? THROTTLE_MULT : 1);
  if (beat !== 'climax') dist += dt * speed;

  // Clouds and asteroid-chunks stream toward the camera on an endless loop,
  // each with its own independent bob — the constant sense of motion the
  // whole scene is built around. Z must increase from far-negative toward
  // the camera as dist grows (then wrap back once past it) so every item
  // reads as approaching, never receding — the previous formula here
  // subtracted the cycling term, which made objects drift away and then
  // teleport back instead of closing in.
  for (const c of clouds) {
    const cyclePos = (dist * c.speedMult + c.offset) % 90;
    const z = -85 + cyclePos;
    const bob = Math.sin(dist * c.bobSpeed + c.bobPhase) * c.bobAmount;
    nova64.scene.setPosition(c.mesh, c.baseX, c.baseY + bob, z);
  }
  // Ambient stars: each on its own cross-then-pause cycle (wall-clock, not
  // dist-driven, matching the comet below) — visible only while actually
  // crossing, so the loop reset happens off-frame instead of a visible pop.
  for (const s of stars) {
    s.timer += dt;
    const cycle = s.crossDuration + s.pauseDuration;
    const phase = s.timer % cycle;
    if (phase < s.crossDuration) {
      const f = phase / s.crossDuration;
      const x = s.startX + (s.endX - s.startX) * f;
      nova64.scene.setPosition(s.mesh, x, s.y, s.z);
      nova64.scene.setMeshVisible?.(s.mesh, true);
    } else {
      nova64.scene.setMeshVisible?.(s.mesh, false);
    }
  }
  // Slow, wide-cycle parallax so the hills/pyramids read as a distant range
  // rather than close, fast-passing detail.
  for (const p of peaks) {
    const cyclePos = (dist * p.speedMult + p.offset) % 140;
    const z = -130 + cyclePos;
    nova64.scene.setPosition(p.mesh, p.baseX, p.baseY, z);
  }
  for (const r of ridges) {
    const cyclePos = (dist * 1.4 + r.offset) % 50;
    const worldZ = -46 + cyclePos;
    nova64.scene.setPosition(r.mesh, r.baseX, -0.4, worldZ);
    nova64.scene.rotateMesh(r.mesh, dt * r.spin[0], dt * r.spin[1], dt * r.spin[2]);

    // Hidden signal fragment: passing close to the special chunk (once)
    // triggers a small delighted callout and a burst of sparks.
    if (r.special && !r.foundSpecial && worldZ > -3 && worldZ < 3 && Math.abs(r.baseX - boardX) < 1.6) {
      r.foundSpecial = true;
      chapterCtx?.setCaption('✦ You found a signal fragment ✦');
      burstEmitter.x = (typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640) / 2;
      burstEmitter.y = (typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360) * 0.5;
      nova64.fx.updateEmitter2D(burstEmitter, 1 / 30);
      burstEmitter.rate = 0;
    }
  }

  // The ocean grid never needs to recycle (it's already larger than the
  // fog-out distance — see init()) — a travelling swell (phase offset by
  // each tile's own Z, so it rolls across the grid as dist advances) plus a
  // smaller independent per-tile bob makes the whole surface read as
  // visibly rolling water, not a flat static floor or per-tile jitter.
  for (const t of waterTiles) {
    const swell = Math.sin(dist * 0.3 + t.baseZ * 0.12) * 0.3;
    const bob = Math.sin(dist * 0.7 + t.bobPhase) * t.bobAmount;
    nova64.scene.setPosition(t.mesh, t.baseX, t.baseY + swell + bob, t.baseZ);
  }

  // Shooting star: spawns once at its seeded distance, streaks across the
  // sky over ~1.4s, then is gone for good this ride.
  if (!cometHasSpawned && dist >= cometSpawnDist) {
    cometHasSpawned = true;
    const y = 6 + rand() * 3;
    const z = -20 - rand() * 15;
    comet = { mesh: null, t: 0, duration: 1.4, startX: -14, endX: 14, y, z };
  }
  if (comet) {
    comet.t += dt;
    const f = Math.min(1, comet.t / comet.duration);
    const x = comet.startX + (comet.endX - comet.startX) * f;
    if (!comet.mesh) {
      comet.mesh = nova64.scene.createSphere(0.2, 0xffffff, [x, comet.y, comet.z], 4, {
        emissive: 0xffffff,
        emissiveIntensity: 2,
      });
    }
    nova64.scene.setPosition(comet.mesh, x, comet.y, comet.z);
    cometTrailEmitter.x = ((x + 14) / 28) * (typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640);
    cometTrailEmitter.y = (typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360) * 0.18;
    cometTrailEmitter.rate = 200;
    if (f >= 1) {
      nova64.scene.destroyMesh(comet.mesh);
      comet = null;
    }
  }
  cometTrailEmitter.rate = comet ? cometTrailEmitter.rate : 0;
  nova64.fx.updateEmitter2D(cometTrailEmitter, dt);

  // Voxel-invader waves: a fresh squadron spawns every WAVE_INTERVAL — no
  // longer gated on the previous wave having fully cleared, so with an
  // interval shorter than a wave's full clear travel, two or three waves are
  // airborne at once instead of strictly one-at-a-time. Each with its own
  // random symmetric pattern. They fly all the way through and past the ship
  // (cleared well behind the camera, not right in front of it — stopping
  // them near the screen made them look like they'd frozen instead of flown
  // past) and stop spawning as the ride nears the signal so the climax has a
  // clear stage.
  if (beat === 'ride' && dist >= nextWaveDist && dist < SIGNAL_SPAWN_DIST - WAVE_STOP_BUFFER) {
    const waveSpawnDist = dist;
    nextWaveDist = dist + WAVE_INTERVAL;
    // A small squadron of symmetric voxel-invader sprites, not a plain grid —
    // each cell is a front voxel plus a slightly-recessed background voxel
    // for depth, glowing via emissive material (our engine's proven bloom
    // path, rather than the scaled-duplicate-shell outline technique).
    for (let inv = 0; inv < INVADER_COUNT; inv++) {
      const invaderBaseX = (inv - (INVADER_COUNT - 1) / 2) * INVADER_SPACING;
      const invaderColor = hsvToHex(rand(), 0.7, 0.95);
      const bgColor = hsvToHex(rand(), 0.5, 0.5);
      const pattern = generateInvaderPattern(INVADER_ROWS, INVADER_COLS);
      for (let row = 0; row < INVADER_ROWS; row++) {
        for (let col = 0; col < INVADER_COLS; col++) {
          if (!pattern[row]?.[col]) continue;
          const gridX = invaderBaseX + (col - (INVADER_COLS - 1) / 2) * INVADER_CELL;
          const gridY = 0.7 + (INVADER_ROWS - 1 - row) * INVADER_CELL;
          const mesh = nova64.scene.createCube(INVADER_CELL * 0.85, invaderColor, [gridX, gridY, BLOCK_WALL_Z], {
            emissive: invaderColor,
            emissiveIntensity: 1.1,
          });
          const bgMesh = nova64.scene.createCube(
            INVADER_CELL * 0.85,
            bgColor,
            [gridX, gridY, BLOCK_WALL_Z + INVADER_BG_Z_OFFSET],
            { emissive: bgColor, emissiveIntensity: 0.4, transparent: true, opacity: 0.7 },
          );
          blocks.push({
            mesh,
            bgMesh,
            gridX,
            gridY,
            color: invaderColor,
            alive: true,
            currentZ: BLOCK_WALL_Z,
            spawnDist: waveSpawnDist,
          });
        }
      }
    }
    chapterCtx?.setCaption('Invaders ahead — fire!');
  }
  // Each block moves from its own spawnDist, independent of every other
  // block — this is what lets multiple waves coexist without one wave's
  // position math clobbering another's. Shot blocks (alive: false, meshes
  // already destroyed by the hit-test below) and blocks that have travelled
  // past WAVE_CLEAR_Z are spliced out here, same pattern as projectiles.
  const hadBlocks = blocks.length > 0;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (!b) continue;
    if (!b.alive) {
      blocks.splice(i, 1);
      continue;
    }
    const z = BLOCK_WALL_Z + (dist - b.spawnDist);
    b.currentZ = z;
    nova64.scene.setPosition(b.mesh, b.gridX, b.gridY, z);
    nova64.scene.setPosition(b.bgMesh, b.gridX, b.gridY, z + INVADER_BG_Z_OFFSET);
    if (z > WAVE_CLEAR_Z) {
      nova64.scene.destroyMesh(b.mesh);
      nova64.scene.destroyMesh(b.bgMesh);
      blocks.splice(i, 1);
    }
  }
  // Only clear the caption on the frame the last block of a (possibly
  // overlapping) run of waves actually disappears — not every frame the
  // array happens to be empty, which would also wipe the ride-hint caption
  // before the first wave ever spawns.
  if (hadBlocks && blocks.length === 0 && beat === 'ride') chapterCtx?.setCaption(null);

  // Fire: continuous while held — Space bar, mouse held down and dragging,
  // or a touch held on the canvas — not just a single tap/press. Held-state
  // checks (key/mouseDown), not edge-triggered (keyp/mousePressed), gated by
  // a cooldown so "held" reads as rapid fire rather than one shot per frame.
  fireTimer -= dt;
  const wantsToFire = !pressingIcon && (nova64.input.key?.('Space') || nova64.input.mouseDown?.());
  if (wantsToFire && fireTimer <= 0) {
    fireTimer = FIRE_COOLDOWN;
    const px = boardX;
    const py = boardY + 0.25;
    const pz = -0.6;
    const mesh = nova64.scene.createSphere(0.13, 0xbfe0ff, [px, py, pz], 5, {
      emissive: 0xbfe0ff,
      emissiveIntensity: 2.2,
    });
    projectiles.push({ mesh, x: px, y: py, z: pz });
    const mw = typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
    const mh = typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
    muzzleEmitter.x = mw / 2;
    muzzleEmitter.y = mh * 0.82;
    muzzleEmitter.rate = 500;
    nova64.fx.updateEmitter2D(muzzleEmitter, 1 / 30);
    muzzleEmitter.rate = 0;
  }
  nova64.fx.updateEmitter2D(muzzleEmitter, dt);

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p) continue;
    p.z -= dt * PROJECTILE_SPEED;
    nova64.scene.setPosition(p.mesh, p.x, p.y, p.z);
    let hit = false;
    for (const b of blocks) {
      if (
        b.alive &&
        Math.abs(p.z - b.currentZ) < 0.9 &&
        Math.abs(p.x - b.gridX) < INVADER_CELL * 0.6 &&
        Math.abs(p.y - b.gridY) < INVADER_CELL * 0.6
      ) {
        b.alive = false;
        nova64.scene.destroyMesh(b.mesh);
        nova64.scene.destroyMesh(b.bgMesh);
        hit = true;
        burstEmitter.x =
          (typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640) / 2;
        burstEmitter.y =
          (typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360) * 0.5;
        nova64.fx.updateEmitter2D(burstEmitter, 1 / 40);
        burstEmitter.rate = 0;
        break;
      }
    }
    if (hit || p.z < BLOCK_WALL_Z - 6) {
      nova64.scene.destroyMesh(p.mesh);
      projectiles.splice(i, 1);
    }
  }

  updateCamera(boardX, boardY);

  const w = typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
  const h = typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
  sprayEmitter.x = w / 2;
  sprayEmitter.y = h * 0.86;
  sprayEmitter.rate = 24 + Math.abs(steerX) * 60;
  wakeEmitter.x = w / 2;
  wakeEmitter.y = h * 0.9;
  wakeEmitter.rate = 16 + FORWARD_SPEED * 2;
  // Fixed emission point near screen centre; the emitter's own wide
  // angleVariance + long life spreads motes across the frame over time.
  dustEmitter.x = w * 0.5;
  dustEmitter.y = h * 0.4;
  nova64.fx.updateEmitter2D(sprayEmitter, dt);
  nova64.fx.updateEmitter2D(wakeEmitter, dt);
  nova64.fx.updateEmitter2D(dustEmitter, dt);
  nova64.fx.updateEmitter2D(burstEmitter, dt);

  // Camera toggle — tap/click the icon (checked in the same fixed 640x360
  // input space mouseX()/mouseY() use, never the real DPR-scaled canvas
  // size), or press C on a keyboard.
  if (
    (nova64.input.mousePressed?.() && inZone(nova64.input.mouseX(), nova64.input.mouseY(), CAM_ICON_ZONE)) ||
    nova64.input.keyp?.('KeyC')
  ) {
    cameraMode = cameraMode === 'third' ? 'first' : 'third';
  }

  if (beat === 'intro' && beatTime > 2.2) setBeat('ride');
  if (beat === 'ride' && !rideHintCleared && beatTime > RIDE_HINT_SECONDS) {
    rideHintCleared = true;
    chapterCtx?.setCaption(null);
  }

  if (beat === 'ride' && dist >= SIGNAL_SPAWN_DIST && !crest) {
    crestSpawnDist = dist;
    crest = nova64.scene.createSphere(0.55, crestColor, [0, 1.1, SIGNAL_SPAWN_Z], 7, {
      emissive: crestColor,
      emissiveIntensity: 1.7,
    });
    ring = nova64.scene.createTorus(1.3, 0.045, ringColor, [0, 1.1, SIGNAL_SPAWN_Z], { metallic: true, roughness: 0.15 });
    setBeat('rising');
  }

  if (beat === 'rising' && crest && ring) {
    const traveled = dist - crestSpawnDist;
    const z = SIGNAL_SPAWN_Z + traveled;
    nova64.scene.setPosition(crest, 0, 1.1, z);
    nova64.scene.setPosition(ring, 0, 1.1, z);
    nova64.scene.rotateMesh(ring, 0, dt * 0.5, 0);
    if (z > -8) setBeat('ready');
  }

  if (beat === 'ready') {
    if (ring) nova64.scene.rotateMesh(ring, 0, dt * 0.6, 0);
    if (crest) nova64.scene.rotateMesh(crest, dt * 0.1, dt * 0.2, 0);
    if (nova64.input.mousePressed?.() && !inZone(nova64.input.mouseX(), nova64.input.mouseY(), CAM_ICON_ZONE)) {
      burstEmitter.x = w / 2;
      burstEmitter.y = h * 0.4;
      nova64.fx.setBloomStrength(2.6);
      nova64.fx.updateEmitter2D(burstEmitter, 1 / 20);
      burstEmitter.rate = 0;
      setBeat('climax');
    }
  }

  if (beat === 'climax' && beatTime >= 1.1 && !completeSent) {
    completeSent = true;
    void chapterCtx?.complete({ discovered: ['coastal-signal:chapter-01:caught-the-signal'] });
  }
}

export function draw() {
  nova64.fx.drawEmitter2D(dustEmitter);
  nova64.fx.drawEmitter2D(sprayEmitter);
  nova64.fx.drawEmitter2D(wakeEmitter);
  nova64.fx.drawEmitter2D(cometTrailEmitter);
  nova64.fx.drawEmitter2D(muzzleEmitter);
  nova64.fx.drawEmitter2D(burstEmitter);

  const w = typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
  const h = typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
  // Icon geometry scales with screen size relative to a ~700px reference,
  // rather than fixed pixel units, so it stays a consistent proportion of
  // the frame at any canvas resolution.
  const uiScale = Math.max(0.8, Math.min(2, w / 700));

  const iconX = (591 / INPUT_W) * w;
  const iconY = (32 / INPUT_H) * h;
  const iw = 20 * uiScale;
  const ih = 14 * uiScale;
  nova64.draw.rectfill(iconX - iw, iconY - ih, iw * 2, ih * 2, packColor(0x000000));
  nova64.draw.rect(iconX - iw, iconY - ih, iw * 2, ih * 2, packColor(0xffffff), false);
  nova64.draw.rectfill(iconX - iw * 0.5, iconY - ih * 0.45, iw * 0.7, ih * 0.85, packColor(0xffffff));
  nova64.draw.circle(iconX + iw * 0.4, iconY, ih * 0.45, packColor(0xffffff), false);
  nova64.draw.print(cameraMode === 'third' ? '3RD' : '1ST', iconX - 12 * uiScale, iconY + 16 * uiScale, packColor(0xffffff));

  // Narrative captions render as real HTML/CSS over the canvas (see
  // viewer-canvas.tsx's setCaption bridge) — vector typography, not the
  // engine's fixed bitmap font. Only the starburst visual stays in-canvas.
  if (beat === 'climax') {
    nova64.draw.drawStarburst(w / 2, h * 0.4, 30, 12, 8, packColor(0xffffff), true);
  }
}
