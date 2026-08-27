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
import { OceanSurface } from '../../../ocean/ocean-surface';

declare const nova64: any;

// nova64.input.mouseX()/mouseY() report in a fixed virtual 640x360 space regardless
// of real canvas resolution (see runtime/input.js updateMousePosition) — every
// input calculation below is done in this space, never against screenWidth().
const INPUT_W = 640;
const INPUT_H = 360;

const FORWARD_SPEED = 11; // world units/sec — faster overall pace
const THROTTLE_MULT = 2;
const FIRE_COOLDOWN = 0.14; // seconds between shots while firing is held
const LATERAL_RANGE = 3.4;
const CLOUD_COUNT = 8;
const RIDGE_COUNT = 9;
const SIGNAL_SPAWN_DIST = 95; // total ride distance before the signal appears ahead
const SIGNAL_SPAWN_Z = -55;
const CAM_ICON_ZONE = { x0: 552, y0: 10, x1: 630, y1: 54 }; // input-space hit box

const BLOCK_WALL_Z = -42;
const PROJECTILE_SPEED = 55; // faster bullets read as snappier and clear the screen sooner

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

// prologue1-4 play once, before the ride itself begins — a short in-engine
// "cartridge booting" cinematic (a dark scene with a single pulsing spark,
// resolving up into the bright ride) establishing the "forgotten cartridge"
// framing, built the same way every other beat in this file is: nova64's
// own scene/light/caption APIs, no separate overlay or new routing.
type Beat = 'prologue1' | 'prologue2' | 'prologue3' | 'prologue4' | 'intro' | 'ride' | 'rising' | 'ready' | 'climax';

let beat: Beat = 'prologue1';
let beatTime = 0;
let rideHintCleared = false;
let completeSent = false;
let chapterCtx: ReturnType<typeof getChapterContext> | null = null;
let rand: () => number = Math.random;
// The scene's real ambient intensity, captured so the prologue can start
// the world dark and lerp up to this exact value rather than a guessed one.
let targetAmbient = 1.15;
let prologueSpark: any = null;

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

interface Flora {
  capMesh: any;
  stemMesh: any;
  baseX: number;
  baseY: number;
  stemHeight: number;
  capOffset: number;
  offset: number;
}
let flora: Flora[] = [];

interface Planet {
  mesh: any;
  ring: any;
  spin: number;
}
let planets: Planet[] = [];

let ocean: OceanSurface | null = null;

let crest: any = null;
let ring: any = null;
let crestSpawnDist = 0;

// Large glowing rings along the flight path, threaded by steering into
// them — a Sonic/WipEout-style rail-shooter flourish, pure delight rather
// than a scored challenge (missing one has no penalty, just no burst).
interface FlyRing {
  mesh: any;
  baseX: number;
  baseY: number;
  offset: number;
  holeRadius: number;
  passed: boolean;
  spinSpeed: number;
}
let flyRings: FlyRing[] = [];
const RING_CYCLE = 110;
const RING_FAR_Z = -100;

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

interface Explosion {
  mesh: any;
  t: number;
  duration: number;
}
let explosions: Explosion[] = [];

interface Debris {
  mesh: any;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  t: number;
  duration: number;
}
let debris: Debris[] = [];

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
const PROLOGUE1_SECONDS = 2.6;
const PROLOGUE2_SECONDS = 2.6;
const PROLOGUE3_SECONDS = 2.6;
const PROLOGUE4_SECONDS = 2.8; // also the ambient-light reveal — see update()
const BEAT_CAPTIONS: Record<Beat, string | null> = {
  prologue1: 'Every cartridge remembers something.',
  prologue2: 'This one was lost before it finished loading.',
  prologue3: 'Somewhere off this coast, it never powered down.',
  prologue4: 'Tonight, it finally got a signal back.',
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

// Hides/reveals every ride prop except the ocean (which already reads as
// dark and unobtrusive at low ambient on its own — see ocean-surface.ts) —
// used to clear the scene for the prologue. Without this, the prologue's
// "dark void with one spark" was really the full, busy ride scene with
// ambient turned down: every emissive object (ship engine glow, glowing
// fly-through rings, planets, crystal peaks, the signal-fragment asteroid)
// ignores ambient light entirely and stayed visible regardless, which is
// what actually made the opening read as cluttered/odd rather than clean.
function setWorldVisible(visible: boolean) {
  for (const p of shipParts) nova64.scene.setMeshVisible?.(p.mesh, visible);
  for (const c of clouds) nova64.scene.setMeshVisible?.(c.mesh, visible);
  for (const p of peaks) nova64.scene.setMeshVisible?.(p.mesh, visible);
  for (const p of planets) {
    nova64.scene.setMeshVisible?.(p.mesh, visible);
    nova64.scene.setMeshVisible?.(p.ring, visible);
  }
  for (const r of flyRings) nova64.scene.setMeshVisible?.(r.mesh, visible);
  for (const f of flora) {
    nova64.scene.setMeshVisible?.(f.capMesh, visible);
    nova64.scene.setMeshVisible?.(f.stemMesh, visible);
  }
  for (const r of ridges) nova64.scene.setMeshVisible?.(r.mesh, visible);
  for (const s of stars) nova64.scene.setMeshVisible?.(s.mesh, visible);
}

export function init() {
  const ctx = getChapterContext();
  chapterCtx = ctx;
  rand = mulberry32(ctx.chapterSeed);
  // A bright, cheerful daytime sky-blue — Mario-World-bright, not moody dusk
  // — with the warm amber signal still the one thing that doesn't belong.
  hue = 0.55 + rand() * 0.08;

  // The previous pass fixed a real bloom bug (see enableBloom below) that
  // was blowing the scene to white, but I also pulled base brightness down
  // at the same time to be safe — with the bloom threshold now correctly
  // high, that extra caution wasn't needed. Pushed vividness and value back
  // up for a genuinely bright, saturated, engaging sky rather than a
  // drab/muted one.
  const skyTop = hsvToHex((hue - 0.03 + 1) % 1, 0.68, 0.9);
  const skyHorizon = hsvToHex(hue, 0.5, 0.98);
  crestColor = hsvToHex(0.1 + rand() * 0.03, 0.78, 1); // warm sunny amber — the one accent
  ringColor = hsvToHex((hue + 0.5) % 1, 0.12, 0.98);
  boardColor = hsvToHex((hue - 0.1 + 1) % 1, 0.5, 0.92);

  nova64.light.createGradientSkybox(skyTop, skyHorizon);
  // The world is fully built bright from the start (unchanged below) — the
  // prologue just starts ambient light very low and lerps it up to this
  // target as the final prologue beat plays (see update()), so the ride
  // visually "powers on" into view rather than needing a second, separate
  // scene to be built and torn down for the cinematic.
  targetAmbient = 1.15;
  nova64.light.setAmbientLight(0xffffff, 0.05);
  // A soft haze near the horizon — pushes the far edge of the ocean grid
  // into an atmospheric blend instead of a visible seam, and reads as
  // "sunny sea air" rather than gloom. Pushed out from 66 to 92 so the new
  // ringed planets (out past 55-73 units) read clearly instead of fogging
  // into invisibility — THREE.Fog is plain camera-distance fog, so anything
  // beyond "far" is fully fog-coloured regardless of how high up it sits.
  nova64.light.setFog(skyHorizon, 20, 92);
  nova64.light.createPointLight(skyHorizon, 2.2, 40, 0, 3, -20);

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

  // Distant terrain: three distinct silhouettes, not two — low-poly rocky
  // hills (flat-shaded, matte), reflective metallic pyramids, and tall thin
  // faceted crystal spires (translucent, glowing, a fantastical colour
  // family unrelated to the sky's blue bias) — breaking up the background
  // with real variety instead of two similar cone shapes repeated.
  const PEAK_COUNT = 12;
  peaks = [];
  for (let i = 0; i < PEAK_COUNT; i++) {
    const typeRoll = rand();
    const peakType: 'hill' | 'pyramid' | 'crystal' = typeRoll < 0.4 ? 'hill' : typeRoll < 0.72 ? 'pyramid' : 'crystal';
    const height = peakType === 'crystal' ? 9 + rand() * 11 : 6 + rand() * 12;
    const radius = peakType === 'crystal' ? height * (0.16 + rand() * 0.09) : height * (0.45 + rand() * 0.25);
    const color =
      // A wide, fully-random hue (not a narrow band near one fixed offset)
      // and real saturation — the old 0.15 saturation made every pyramid
      // read as a similar pale, nearly colourless silver regardless of the
      // random hue underneath it.
      peakType === 'pyramid'
        ? hsvToHex(rand(), 0.55 + rand() * 0.3, 0.8 + rand() * 0.15)
        : peakType === 'crystal'
          ? hsvToHex((hue + 0.38 + rand() * 0.22 + 1) % 1, 0.55 + rand() * 0.25, 0.78 + rand() * 0.18)
          : hsvToHex((hue - 0.18 + (rand() - 0.5) * 0.06 + 1) % 1, 0.32 + rand() * 0.15, 0.3 + rand() * 0.15);
    const mesh = nova64.scene.createCone(
      radius,
      height,
      color,
      [0, 0, 0],
      peakType === 'pyramid'
        ? { metallic: true, roughness: 0.12, flatShading: true, segments: 4 }
        : peakType === 'crystal'
          ? {
              flatShading: true,
              roughness: 0.15,
              segments: 5,
              transparent: true,
              opacity: 0.72,
              emissive: color,
              emissiveIntensity: 0.7,
            }
          : { flatShading: true, roughness: 0.95, segments: 6 },
    );
    peaks.push({
      mesh,
      baseX: (rand() < 0.5 ? -1 : 1) * (14 + rand() * 20),
      // The ocean (waveHeight 0.6, origin -0.55) oscillates down to roughly
      // -1.17 at its lowest — peaks sat with their base fixed at -0.6, well
      // above that, so whenever a peak's X/Z happened to be over a wave
      // trough the gap between its flat base and the dipped water surface
      // was visible ("floating"). Anchoring the base well below the
      // water's lowest possible point means peaks always read as rising up
      // out of the water, never hovering above it, without needing to
      // track the water's per-frame height at every peak's position.
      baseY: -1.6 + height / 2,
      offset: rand() * 140,
      speedMult: 0.3 + rand() * 0.2,
    });
  }

  // A few small mushrooms and flowers dotted along the passing shoreline —
  // original low-poly shapes/colours (a solid-colour dome cap on a stem, a
  // simple bloom on a stem), evoking that same cheerful, whimsical garden
  // feeling without copying any specific character design. Deliberately
  // just a handful, not a garden.
  const MUSHROOM_COUNT = 5;
  const FLOWER_COUNT = 6;
  flora = [];
  for (let i = 0; i < MUSHROOM_COUNT; i++) {
    const capColor = hsvToHex(rand(), 0.55 + rand() * 0.25, 0.85 + rand() * 0.15);
    const stemHeight = 0.26 + rand() * 0.12;
    const capRadius = 0.15 + rand() * 0.06;
    const stemMesh = nova64.scene.createCylinder(0.045, 0.055, stemHeight, 0xf0e6d2, [0, 0, 0], {
      flatShading: true,
      roughness: 0.8,
    });
    const capMesh = nova64.scene.createSphere(capRadius, capColor, [0, 0, 0], 5, {
      flatShading: true,
      roughness: 0.5,
    });
    nova64.scene.setScale(capMesh, 1, 0.6, 1);
    flora.push({
      capMesh,
      stemMesh,
      baseX: (rand() - 0.5) * 26,
      baseY: -0.2 + rand() * 1.1,
      stemHeight,
      capOffset: capRadius * 0.4,
      offset: rand() * 90,
    });
  }
  for (let i = 0; i < FLOWER_COUNT; i++) {
    const bloomColor = hsvToHex(rand(), 0.6 + rand() * 0.3, 0.9 + rand() * 0.1);
    const stemHeight = 0.3 + rand() * 0.16;
    const bloomRadius = 0.08 + rand() * 0.04;
    const stemMesh = nova64.scene.createCylinder(0.028, 0.028, stemHeight, 0x3a7d3a, [0, 0, 0], {
      flatShading: true,
      roughness: 0.7,
    });
    const capMesh = nova64.scene.createSphere(bloomRadius, bloomColor, [0, 0, 0], 5, {
      flatShading: true,
      emissive: bloomColor,
      emissiveIntensity: 0.3,
    });
    flora.push({
      capMesh,
      stemMesh,
      baseX: (rand() - 0.5) * 26,
      baseY: -0.2 + rand() * 1.1,
      stemHeight,
      capOffset: bloomRadius * 0.5,
      offset: rand() * 90,
    });
  }

  // Large ringed planets far in the sky — mostly static (vast, distant
  // things should read as still against the nearer scenery's fast motion,
  // not zoom past like foreground obstacles), with only a slow independent
  // ring spin for life. A fantastical flourish in the empty sky rather than
  // flat blue nothing.
  const PLANET_COUNT = 1 + (rand() < 0.5 ? 1 : 0);
  planets = [];
  for (let i = 0; i < PLANET_COUNT; i++) {
    const size = 4.5 + rand() * 3;
    const planetColor = hsvToHex((hue + 0.3 + rand() * 0.3 + 1) % 1, 0.5 + rand() * 0.25, 0.7 + rand() * 0.2);
    const planetRingColor = hsvToHex((hue + 0.55 + rand() * 0.2 + 1) % 1, 0.35 + rand() * 0.2, 0.92);
    const px = (i === 0 ? -1 : 1) * (18 + rand() * 14);
    const py = 20 + rand() * 10;
    const pz = -55 - rand() * 18;
    const mesh = nova64.scene.createSphere(size, planetColor, [px, py, pz], 6, {
      flatShading: true,
      roughness: 0.6,
      emissive: planetColor,
      emissiveIntensity: 0.25,
    });
    const ring = nova64.scene.createTorus(size * 1.7, size * 0.16, planetRingColor, [px, py, pz], {
      metallic: true,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85,
    });
    nova64.scene.setRotation(ring, 1.3 + rand() * 0.25, 0, 0.35 + rand() * 0.3);
    planets.push({ mesh, ring, spin: 0.05 + rand() * 0.08 });
  }

  // Large glowing rings spaced along the flight path — a Sonic/WipEout-style
  // rail-shooter flourish, threaded by steering into them. Torus geometry's
  // default orientation already faces along Z (the flight axis), so no
  // extra rotation is needed for the hole to face the oncoming player.
  const RING_COUNT = 6;
  flyRings = [];
  for (let i = 0; i < RING_COUNT; i++) {
    const holeRadius = 2.2 + rand() * 0.8;
    const tube = 0.16 + rand() * 0.08;
    const ringGlowColor = hsvToHex(rand(), 0.55, 1);
    const mesh = nova64.scene.createTorus(holeRadius, tube, ringGlowColor, [0, 0, 0], {
      metallic: true,
      roughness: 0.2,
      emissive: ringGlowColor,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.88,
    });
    flyRings.push({
      mesh,
      baseX: (rand() - 0.5) * LATERAL_RANGE * 1.5,
      baseY: 0.85 + (rand() - 0.5) * 0.4,
      // Spread evenly across the cycle (plus jitter) rather than fully
      // random, so rings don't randomly cluster or leave long empty gaps.
      offset: (i / RING_COUNT) * RING_CYCLE + rand() * 8,
      holeRadius,
      passed: false,
      spinSpeed: 0.3 + rand() * 0.4,
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

  // Ocean: since the board never actually translates in world Z (the
  // classic Space-Harrier illusion — the rider stays fixed near Z=0 and the
  // world scrolls toward them instead), a single static grid that's larger
  // than the fog-out distance reads as endless with no recycling logic
  // needed, unlike the clouds/ridges/waves above. Kept close under the
  // board (not far below it) so it reads as a surfboard skimming the
  // water, not a distant sea floor. See content/ocean/ for the shared
  // wave-field math driving both this and Chapter Two's water.
  ocean = new OceanSurface({
    rows: 16,
    cols: 16,
    width: 84,
    depth: 72,
    originY: -0.55,
    waveHeight: 0.6,
    // Vivid, unambiguous blue rather than a muted/dark tint — combined with
    // the low roughness in ocean-surface.ts, this is what actually reads as
    // "shiny blue water" instead of a dark, hard-to-see panel.
    colorDeep: hsvToHex((hue + 0.03 + 1) % 1, 0.78, 0.85),
    colorShallow: hsvToHex((hue + 0.05 + 1) % 1, 0.65, 1),
    rand,
  });

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

  // The one thing visible in the dark prologue — a small, gently pulsing
  // point of light (the cartridge, still trying). Destroyed once the world
  // finishes revealing itself (end of prologue4, see update()).
  prologueSpark = nova64.scene.createSphere(0.14, crestColor, [0, 1.2, -4], 6, {
    emissive: crestColor,
    emissiveIntensity: 1.6,
  });

  // Every other ride prop hidden until the reveal (see setWorldVisible), and
  // a deliberate, centred shot on the spark — the previous version never
  // explicitly set a camera for the prologue at all, leaving it at
  // whatever the engine's own unset default happened to be, which is very
  // likely the real reason the opening looked wrong rather than composed.
  setWorldVisible(false);
  nova64.camera.setCameraPosition(0, 1.2, 1.5);
  nova64.camera.setCameraTarget(0, 1.2, -4);

  setBeat('prologue1');
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

  // The prologue plays before any ride logic — just a timer per stage, a
  // gentle pulse on the one visible spark, and (on the final stage) the
  // ambient-light reveal. Everything else in update() below is the ride
  // itself and shouldn't run yet.
  if (beat === 'prologue1' || beat === 'prologue2' || beat === 'prologue3' || beat === 'prologue4') {
    if (prologueSpark) {
      const pulse = 1 + Math.sin(beatTime * 3) * 0.25;
      nova64.scene.setScale(prologueSpark, pulse, pulse, pulse);
    }
    if (beat === 'prologue1' && beatTime >= PROLOGUE1_SECONDS) setBeat('prologue2');
    else if (beat === 'prologue2' && beatTime >= PROLOGUE2_SECONDS) setBeat('prologue3');
    else if (beat === 'prologue3' && beatTime >= PROLOGUE3_SECONDS) setBeat('prologue4');
    else if (beat === 'prologue4') {
      // The world "powers on" — ambient light lerps from the dark prologue
      // starting value up to its real target as this final stage plays.
      const f = Math.min(1, beatTime / PROLOGUE4_SECONDS);
      nova64.light.setAmbientLight(0xffffff, 0.05 + (targetAmbient - 0.05) * f);
      if (f >= 1) {
        if (prologueSpark) {
          nova64.scene.destroyMesh(prologueSpark);
          prologueSpark = null;
        }
        setWorldVisible(true);
        setBeat('intro');
      }
    }
    return;
  }

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
  // Mushrooms/flowers ride the same approach-toward-camera conveyor as the
  // asteroid-chunks (a shorter, closer cycle than the distant peaks — these
  // are meant to be noticed passing by, not background scenery).
  for (const f of flora) {
    const cyclePos = (dist * 1.1 + f.offset) % 90;
    const z = -85 + cyclePos;
    nova64.scene.setPosition(f.stemMesh, f.baseX, f.baseY + f.stemHeight / 2, z);
    nova64.scene.setPosition(f.capMesh, f.baseX, f.baseY + f.stemHeight + f.capOffset, z);
    nova64.scene.rotateMesh(f.capMesh, 0, dt * 0.3, 0);
  }
  // Planets stay fixed in place (vast/distant things shouldn't zoom past
  // like foreground scenery) — only the ring itself slowly turns.
  for (const p of planets) {
    nova64.scene.rotateMesh(p.ring, 0, dt * p.spin, 0);
  }

  // Large fly-through rings: same approach-toward-camera conveyor as the
  // rest of the ride, plus an idle spin, plus a proximity check right as
  // each one crosses near the board's Z to see if the player threaded it.
  // Missing one has no penalty — it's a delight, not a scored gate.
  for (const r of flyRings) {
    const cyclePos = (dist * 1 + r.offset) % RING_CYCLE;
    const z = RING_FAR_Z + cyclePos;
    nova64.scene.setPosition(r.mesh, r.baseX, r.baseY, z);
    nova64.scene.rotateMesh(r.mesh, 0, 0, dt * r.spinSpeed);
    if (z < RING_FAR_Z + 4) r.passed = false;
    if (!r.passed && z > -1.5 && z < 1.5) {
      const throughDist = Math.hypot(boardX - r.baseX, boardY - r.baseY);
      if (throughDist < r.holeRadius * 0.75) {
        r.passed = true;
        const rw = typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
        const rh = typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
        burstEmitter.x = rw / 2;
        burstEmitter.y = rh * 0.45;
        nova64.fx.updateEmitter2D(burstEmitter, 1 / 30);
        burstEmitter.rate = 0;
      }
    }
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
  // fog-out distance — see init()); each tile's height and tilt come from
  // the shared wave-field math (content/ocean/wave-field.ts). Passes dt, not
  // dist — OceanSurface tracks its own wave clock (see ocean-surface.ts).
  ocean?.update(dt);

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

        // A real explosion at the exact 3D hit point (not just a generic
        // screen-centred particle flash) — a quick expanding, fading flash
        // plus a handful of flying debris fragments tinted the block's own
        // colour, instead of the block just silently vanishing.
        const boom = nova64.scene.createSphere(0.12, b.color, [b.gridX, b.gridY, b.currentZ], 5, {
          emissive: b.color,
          emissiveIntensity: 2.4,
          transparent: true,
          opacity: 0.95,
        });
        explosions.push({ mesh: boom, t: 0, duration: 0.3 });
        for (let k = 0; k < 5; k++) {
          const chunk = nova64.scene.createCube(INVADER_CELL * 0.35, b.color, [b.gridX, b.gridY, b.currentZ], {
            emissive: b.color,
            emissiveIntensity: 1.3,
            transparent: true,
            opacity: 1,
          });
          debris.push({
            mesh: chunk,
            x: b.gridX,
            y: b.gridY,
            z: b.currentZ,
            vx: (rand() - 0.5) * 3.5,
            vy: 1.5 + rand() * 2.5,
            vz: (rand() - 0.5) * 2 + 1,
            t: 0,
            duration: 0.45 + rand() * 0.25,
          });
        }
        break;
      }
    }
    // Travel well past the invader wall and toward the fog-out distance
    // before disappearing, so a miss reads as "flew off into the distance"
    // rather than an abrupt nearby pop — the old despawn distance
    // (BLOCK_WALL_Z - 6, only 6 units past the wall) vanished projectiles
    // while they were still large/close in frame.
    if (hit || p.z < -95) {
      nova64.scene.destroyMesh(p.mesh);
      projectiles.splice(i, 1);
    }
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    if (!e) continue;
    e.t += dt;
    const f = Math.min(1, e.t / e.duration);
    const s = 0.4 + f * 2.2;
    nova64.scene.setScale(e.mesh, s, s, s);
    if (e.mesh.material) e.mesh.material.opacity = 0.95 * (1 - f);
    if (f >= 1) {
      nova64.scene.destroyMesh(e.mesh);
      explosions.splice(i, 1);
    }
  }

  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    if (!d) continue;
    d.t += dt;
    d.vy -= dt * 4.5; // gravity
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.z += d.vz * dt;
    nova64.scene.setPosition(d.mesh, d.x, d.y, d.z);
    const f = Math.min(1, d.t / d.duration);
    if (d.mesh.material) d.mesh.material.opacity = 1 - f;
    const s = 1 - f * 0.7;
    nova64.scene.setScale(d.mesh, s, s, s);
    if (f >= 1) {
      nova64.scene.destroyMesh(d.mesh);
      debris.splice(i, 1);
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
