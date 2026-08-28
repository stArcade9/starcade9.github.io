// Coastal Signal — Chapter 02: Low Tide
// Rewritten concept, not just a re-tuned version of the last one: the old
// beat was a static hunt for hidden stones scattered around one fixed spot
// — however well it played, "stand still and search a small area" was
// never going to feel like anything next to Chapter One's rail-ride, and
// no amount of tuning the search mechanic itself was going to change that.
// This chapter now has continuous motion instead: the tide has gone out
// and left small embers of the same signal Chapter One caught scattered
// along the shoreline. Steer along the beach (same continuous drag/arrow
// steering as Chapter One) and walking near an ember gathers it into a
// small flame that grows with every one collected; reaching the end of the
// shoreline makes that flame flare up and answer the signal back —
// mirroring Chapter One's falling light with a rising one. Collection is
// proximity-based (walk near an ember), not a tap-and-hit-test — this also
// sidesteps a real engine constraint the old version had to work around:
// nova64 exposes no touch/mouse-release event to carts, only press-edge,
// held-state, and position, so anything requiring "aim, then commit" is
// awkward; "walk near it" needs none of that.
import { getChapterContext } from '../../../chapter-context';
import { mulberry32 } from '../../../../lib/seed';
import { OceanSurface } from '../../../ocean/ocean-surface';
import { ownMaterial } from '../../../own-material';

declare const nova64: any;

// Same fixed virtual input space nova64.input.mouseX()/mouseY() report in
// regardless of real canvas resolution — see Chapter One's cart.ts for the
// full note.
const INPUT_W = 640;

// prologue1-4 continue directly from Chapter One's own prologue/climax —
// same in-engine technique (a dark scene, one held point of light, ambient
// lerping up into the real scene), not a separate overlay or new routing.
type Beat = 'prologue1' | 'prologue2' | 'prologue3' | 'prologue4' | 'settle' | 'walk' | 'spirit' | 'flare' | 'closing';

const SETTLE_SECONDS = 1.3;
const FLARE_SECONDS = 1.9;
const CLOSING_SECONDS = 1.2;
const WAVE_INTERVAL_SECONDS = 5.5;
const PROLOGUE1_SECONDS = 2.4;
const PROLOGUE2_SECONDS = 2.4;
const PROLOGUE3_SECONDS = 2.4;
const PROLOGUE4_SECONDS = 2.6; // also the ambient-light reveal — see update()

// The emotional centre of the chapter: between the walk and the flare, the
// ocean itself comes up out of the water and explains — in her own words —
// why the coast, the boardwalk, and the cartridge in the player's hand are
// the same old impulse wearing three different ages. Deliberately the
// longest uninterrupted stretch of writing in the story; it's the payoff the
// two chapters of collecting have been building toward, and the last line
// hands the player their reason for the flare that follows.
const SPIRIT_LINE_SECONDS = 3.3;
const SPIRIT_LINES = [
  'The water goes still. Something steps out of the shine on the waves.',
  'I have kept this coast since before the pier — before anyone thought to build a place here just for delight.',
  'Then you strung bulbs along the water and called it a boardwalk. I liked it. It was the first thing you made that was only for joy.',
  "Your machines learned it too. Cabinets humming under the neon, quarters still warm from somebody else's pocket.",
  'The tide, the boardwalk, the cartridge in your hand — the same old wanting, wearing whatever the age gives it.',
  'This one washed out and kept calling. I kept its light lit. Now you have — so send it back up, where I can see it.',
];
const SPIRIT_SECONDS = SPIRIT_LINE_SECONDS * SPIRIT_LINES.length;

const WALK_SPEED = 2.4; // world units/sec — a walking pace, not a rail-ride pace
const WALK_LATERAL_RANGE = 3.2;
const EMBER_COUNT = 8;
const WALK_DISTANCE = 52; // total shoreline distance for the walk beat
// Embers are magnetic rather than merely collidable: get near one and it
// pulls free of the sand and comes to you, then binds into the flame you're
// carrying. The attract radius is deliberately well under the full lateral
// span (2 * WALK_LATERAL_RANGE), so steering toward one still matters — this
// makes the walk forgiving and tactile, not automatic.
const EMBER_ATTRACT_RADIUS = 2.8;
const EMBER_BIND_RADIUS = 0.4;
// The bind itself: one swell, a colour shift from its own ember hue into the
// flame's amber, and a fade — the moment the light stops being its own and
// becomes part of yours.
const EMBER_BIND_SECONDS = 0.7;

let time = 0;
let beatTime = 0;
let beat: Beat = 'prologue1';
let chapterCtx: ReturnType<typeof getChapterContext> | null = null;
let completeSent = false;

let foamEmitter: any;
let sparkleEmitter: any;
let dustEmitter: any;
// A continuous light trail following the carried flame during the walk —
// reinforces "you're carrying a light" the whole time, not just at the
// discrete collection/climax moments.
let trailEmitter: any;

let swaySpeed = 0.05;
let swayRadius = 5;
let stoneGlowColor = 0x8fd8d0;
let signalColor = 0xffcc66;
let planetRing: any = null;
let planetMesh: any = null;
let sunMesh: any = null;
let targetAmbient = 1.4;
let prologueSpark: any = null;

let walkDist = 0;
// Eases toward the walker's lane position rather than snapping to it
// exactly — a small trailing lag that gives the carried flame some
// physical weight instead of moving as a rigidly-attached prop.
let flameX = 0;
let walkSteer = 0;
let kindled = 0;
let flameMesh: any = null;

// waiting → sitting in the sand on its own lane; drawn → pulled loose and
// travelling toward the carried flame; binding → merging into it (the pulse,
// colour shift and fade). Live x/y/z are tracked per ember because once one
// is drawn it no longer sits on its lane and can't be derived from walkDist.
type EmberPhase = 'waiting' | 'drawn' | 'binding';
interface Ember {
  mesh: any;
  laneX: number;
  spawnDist: number;
  phase: EmberPhase;
  bobPhase: number;
  x: number;
  y: number;
  z: number;
  bindT: number;
  color: number;
}
let embers: Ember[] = [];

let flare: { mesh: any; glowMesh: any; t: number; duration: number; startY: number; laneX: number } | null = null;
// A dedicated, much bigger particle burst for the climax — the ember-
// collection sparkle (sparkleEmitter) stays modest so this moment reads as
// a clear step up from it, not the same effect reused.
let flareEmitter: any;

// The ocean spirit's form — a translucent female figure assembled from the
// engine's named primitives (spheres and capsules; there's no custom-geometry
// or model-loading path open to carts), deliberately built as an original
// silhouette: head, flowing hair, tapered torso, drifting arms, and a body
// that dissolves into wisps at the bottom instead of resolving into legs, so
// she reads as made of water and light rather than as a solid person standing
// on the beach. Each part carries its own drift phase so nothing moves in
// lockstep — that independent motion is most of what sells "suspended in
// water" over "a rigid prop."
interface SpiritPart {
  mesh: any;
  ox: number;
  oy: number;
  oz: number;
  swayAmp: number;
  swayPhase: number;
  bobAmp: number;
  opacity: number;
}
interface SpiritForm {
  parts: SpiritPart[];
  light: number | null;
  laneX: number;
}
let spirit: SpiritForm | null = null;
let spiritLineIndex = 0;
let spiritEmitter: any;

interface Gull {
  mesh: any;
  y: number;
  z: number;
  crossDuration: number;
  pauseDuration: number;
  timer: number;
  startX: number;
  endX: number;
  bobPhase: number;
}
let gulls: Gull[] = [];
// createPointLight only returns a numeric id — position/colour/visibility
// can be changed after creation, but not intensity, so the tide pulse below
// is driven by a brief colour brightening (setPointLightColor) rather than
// an intensity change.
let pointLightId: number | null = null;
let waveTimer = WAVE_INTERVAL_SECONDS * 0.5;
let waveFlashTimer = 0;

let ocean: OceanSurface | null = null;

// Straight per-channel blend between two packed 0xRRGGBB colours — used to
// carry an ember's own hue over into the flame's amber as it binds.
function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const r = Math.round(ar + (((b >> 16) & 0xff) - ar) * t);
  const g = Math.round(ag + (((b >> 8) & 0xff) - ag) * t);
  const bl = Math.round(ab + ((b & 0xff) - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

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

export function init() {
  const ctx = getChapterContext();
  chapterCtx = ctx;
  const rand = mulberry32(ctx.chapterSeed);
  const tealShift = rand();
  swaySpeed = 0.04 + rand() * 0.04;
  swayRadius = 4 + rand() * 2;

  const baseHue = 0.5 + rand() * 0.12; // teal/blue family, for the water
  const foamColor = tealShift > 0.5 ? 0x8fd8d0 : 0x9fc8e0;
  stoneGlowColor = foamColor;
  signalColor = hsvToHex(0.1 + rand() * 0.04, 0.75, 1); // warm amber, same family as Chapter One's crest
  // Golden-hour low tide — bright pale sky overhead, warm low-sun horizon.
  const skyTop = hsvToHex(baseHue, 0.42, 0.92);
  const skyHorizon = hsvToHex(0.09 + rand() * 0.03, 0.62, 0.96);

  nova64.light.createGradientSkybox(skyTop, skyHorizon);
  // Pushed brighter again — a cheerful, sunny "Mario World" feel, not just
  // technically well-lit. Scene starts dark for the prologue and lerps up
  // to this target once the cold open finishes.
  targetAmbient = 1.4;
  nova64.light.setAmbientLight(0xffffff, 0.05);
  nova64.light.setFog(skyHorizon, 18, 55);
  nova64.camera.setCameraTarget(0, 0.3, -4);
  nova64.camera.setCameraPosition(0, 2.2, 5);
  // One warm accent light that travels with the walker, on top of the
  // bright ambient above — briefly brightens in colour with the tide
  // rhythm below.
  pointLightId = nova64.light.createPointLight(stoneGlowColor, 2.6, 16, 0, 1.8, 0);

  // A soft low sun near the horizon — cheap, static, and does a lot of work
  // selling "golden hour" without any extra motion cost.
  sunMesh = nova64.scene.createSphere(1.6, skyHorizon, [-6, 2.6, -18], 6, {
    emissive: skyHorizon,
    emissiveIntensity: 1.4,
  });

  // A headland framing the cove — static ring of rocky cliffs around the
  // horizon so the shore has an actual place to be in, not an empty void.
  const CLIFF_COUNT = 9;
  for (let i = 0; i < CLIFF_COUNT; i++) {
    const cliffAngle = (i / CLIFF_COUNT) * Math.PI * 2 + rand() * 0.3;
    const cliffDist = 22 + rand() * 10;
    const height = 5 + rand() * 9;
    const cx = Math.cos(cliffAngle) * cliffDist;
    const cz = Math.sin(cliffAngle) * cliffDist - 8;
    const cliffColor = hsvToHex((baseHue - 0.2 + (rand() - 0.5) * 0.06 + 1) % 1, 0.25 + rand() * 0.12, 0.32 + rand() * 0.15);
    // Anchored well below the tide's lowest possible point (same fix as
    // Chapter One's peaks) — a fixed base at -0.6 sat only just above the
    // water's own oscillation range, and once per-tile jitter was added to
    // the ocean, some cliffs' bases would dip visibly above the locally
    // troughed water, reading as floating instead of rising out of it.
    const mesh = nova64.scene.createCone(height * (0.5 + rand() * 0.25), height, cliffColor, [cx, -1.4 + height / 2, cz], {
      flatShading: true,
      roughness: 0.95,
      segments: 6,
    });
    nova64.scene.rotateMesh(mesh, 0, rand() * Math.PI * 2, 0);
  }

  // A ringed planet low in the golden-hour sky — same fantastical flourish
  // as Chapter One, and shared visual identity between the two chapters.
  {
    const size = 3.5 + rand() * 2;
    const planetColor = hsvToHex((baseHue + 0.3 + rand() * 0.3 + 1) % 1, 0.5 + rand() * 0.2, 0.75 + rand() * 0.15);
    const planetRingColor = hsvToHex((baseHue + 0.55 + rand() * 0.2 + 1) % 1, 0.3 + rand() * 0.2, 0.94);
    const px = 9 + rand() * 6;
    const py = 9 + rand() * 4;
    const pz = -26 - rand() * 8;
    planetMesh = nova64.scene.createSphere(size, planetColor, [px, py, pz], 6, {
      flatShading: true,
      roughness: 0.6,
      emissive: planetColor,
      emissiveIntensity: 0.25,
    });
    const ring = nova64.scene.createTorus(size * 1.7, size * 0.14, planetRingColor, [px, py, pz], {
      metallic: true,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85,
    });
    nova64.scene.setRotation(ring, 1.3, 0, 0.4);
    planetRing = ring;
  }

  // The tide, running the length of the walk — same shared wave-field math
  // as Chapter One's ocean (see content/ocean/), leaving a dry strip down
  // the middle for the walker.
  ocean = new OceanSurface({
    rows: 13,
    cols: 8,
    width: 22,
    depth: WALK_DISTANCE + 20,
    originZ: -WALK_DISTANCE / 2,
    originY: -0.32,
    waveHeight: 0.25,
    centerHoleRadius: 3.2,
    colorDeep: hsvToHex((baseHue + 1) % 1, 0.75, 0.85),
    colorShallow: hsvToHex((baseHue + 0.05 + 1) % 1, 0.62, 1),
    rand,
  });

  // The walker's own small flame — grows in size and glow with every ember
  // gathered. Always emissive (it's meant to be a light source, not a lit
  // surface), so no PBR/shading subtlety to worry about here.
  flameMesh = nova64.scene.createSphere(0.16, signalColor, [0, 0.55, 0.4], 6, {
    emissive: signalColor,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.92,
  });

  // Embers scattered along the shoreline — spread out with a bit of jitter
  // so the walk isn't a perfectly even metronome, alternating sides so it
  // asks for some actual steering rather than sitting still and drifting
  // through them.
  embers = [];
  for (let i = 0; i < EMBER_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const laneX = side * (0.8 + rand() * (WALK_LATERAL_RANGE - 0.8));
    const spawnDist = 8 + (i / EMBER_COUNT) * (WALK_DISTANCE - 12) + rand() * 3;
    const emberColor = hsvToHex((0.1 + rand() * 0.06 + 1) % 1, 0.7 + rand() * 0.2, 1);
    // Its own material (see own-material.ts): each ember animates its glow
    // while being drawn in, then shifts colour and fades as it binds, and is
    // destroyed afterwards — all three of which go wrong on a shared one.
    const mesh = ownMaterial(
      nova64.scene.createSphere(0.13, emberColor, [laneX, 0.4, -spawnDist], 5, {
        emissive: emberColor,
        emissiveIntensity: 1.7,
        transparent: true,
        opacity: 1,
      }),
      1.7
    );
    embers.push({
      mesh,
      laneX,
      spawnDist,
      phase: 'waiting',
      bobPhase: rand() * Math.PI * 2,
      x: laneX,
      y: 0.4,
      z: -spawnDist,
      bindT: 0,
      color: emberColor,
    });
  }

  // Driftwood and shells scattered around the sand — non-interactive set
  // dressing, the difference between an empty beach and a real one.
  const DRIFTWOOD_COUNT = 5;
  for (let i = 0; i < DRIFTWOOD_COUNT; i++) {
    const wx = (rand() - 0.5) * 12;
    const wz = -rand() * WALK_DISTANCE;
    const woodColor = hsvToHex(0.08 + rand() * 0.03, 0.4 + rand() * 0.15, 0.22 + rand() * 0.12);
    const mesh = nova64.scene.createCube(1, woodColor, [wx, -0.08, wz], { flatShading: true, roughness: 0.9 });
    nova64.scene.setScale(mesh, 0.9 + rand() * 0.7, 0.12 + rand() * 0.05, 0.16 + rand() * 0.06);
    nova64.scene.setRotation(mesh, 0, rand() * Math.PI * 2, (rand() - 0.5) * 0.2);
  }
  const SHELL_COUNT = 10;
  for (let i = 0; i < SHELL_COUNT; i++) {
    const sx = (rand() - 0.5) * 12;
    const sz = -rand() * WALK_DISTANCE;
    const shellColor = hsvToHex((baseHue + (rand() - 0.5) * 0.1 + 1) % 1, 0.15 + rand() * 0.15, 0.75 + rand() * 0.15);
    const mesh = nova64.scene.createCone(0.08 + rand() * 0.06, 0.05 + rand() * 0.04, shellColor, [sx, -0.1, sz], {
      flatShading: true,
      roughness: 0.5,
      segments: 5,
    });
    nova64.scene.setRotation(mesh, Math.PI / 2, rand() * Math.PI * 2, 0);
  }

  // Gulls gliding across the sky — same cross-then-pause cycle as Chapter
  // One's ambient stars, lower and closer, with a gentle up-down glide bob.
  const GULL_COUNT = 3;
  gulls = [];
  for (let i = 0; i < GULL_COUNT; i++) {
    const mesh = nova64.scene.createCube(1, 0x2a2a30, [0, 0, 0], { flatShading: true, roughness: 0.8 });
    nova64.scene.setScale(mesh, 0.28 + rand() * 0.1, 0.02, 0.09);
    gulls.push({
      mesh,
      y: 7 + rand() * 5,
      z: -10 - rand() * 12,
      crossDuration: 10 + rand() * 8,
      pauseDuration: 5 + rand() * 10,
      timer: rand() * 15,
      startX: -16 - rand() * 5,
      endX: 16 + rand() * 5,
      bobPhase: rand() * Math.PI * 2,
    });
  }

  nova64.fx.enableLowPolyMode();
  // enableLowPolyMode's own bloom preset (strength 0.4, threshold 0.7) is
  // quite conservative — fine for a plain scene, but it meant the embers
  // and flame only ever glowed faintly during the walk, with the one-off
  // strength bump at the climax the only real "glow" moment. The first fix
  // for that (threshold 0.5) repeated a mistake already made and corrected
  // in Chapter One: combined with how bright this chapter's ambient light
  // and sky/water now are, a threshold that permissive caught nearly the
  // whole frame, not just the intended light sources — bloom washing
  // everything out is exactly what a too-low threshold does. Threshold
  // back up near Chapter One's own corrected value, selective to genuinely
  // emissive things (embers, flame, flare) rather than the general
  // ambient-lit scene.
  nova64.fx.enableBloom(1.2, 0.4, 0.8);

  foamEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 2,
    maxParticles: 50,
    life: 3.5,
    lifeVariance: 1.2,
    speed: 5,
    speedVariance: 3,
    angle: -Math.PI / 2,
    angleVariance: Math.PI * 0.6,
    gravity: 0,
    startSize: 1.8,
    endSize: 0,
    startAlpha: 0.3,
    endAlpha: 0,
    colors: [foamColor, 0xffffff],
  });
  sparkleEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 0,
    maxParticles: 60,
    life: 0.7,
    lifeVariance: 0.2,
    speed: 20,
    speedVariance: 10,
    angle: -Math.PI / 2,
    angleVariance: Math.PI,
    gravity: 10,
    startSize: 2,
    endSize: 0,
    startAlpha: 1,
    endAlpha: 0,
    colors: [signalColor, 0xffffff],
  });
  // The climax burst — bigger, longer-lived, and with a slight upward drift
  // (negative gravity) matching a rising light, deliberately more
  // spectacular than the per-ember sparkle above so this moment reads as a
  // clear step up, not a repeat of the same effect.
  flareEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 0,
    maxParticles: 160,
    life: 1.4,
    lifeVariance: 0.5,
    speed: 35,
    speedVariance: 20,
    angle: -Math.PI / 2,
    angleVariance: Math.PI * 1.6,
    gravity: -8,
    startSize: 3.2,
    endSize: 0,
    startAlpha: 1,
    endAlpha: 0,
    colors: [signalColor, 0xffffff, 0xfff6d8],
  });
  dustEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 4,
    maxParticles: 70,
    life: 3.5,
    lifeVariance: 1,
    speed: 3,
    speedVariance: 2,
    angle: 0,
    angleVariance: Math.PI * 2,
    gravity: 0,
    startSize: 1,
    endSize: 0,
    startAlpha: 0.25,
    endAlpha: 0,
    colors: [0xffffff, stoneGlowColor],
  });
  trailEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 0,
    maxParticles: 60,
    life: 0.5,
    lifeVariance: 0.15,
    speed: 6,
    speedVariance: 4,
    angle: -Math.PI / 2,
    angleVariance: 0.9,
    gravity: -3,
    startSize: 1.6,
    endSize: 0,
    startAlpha: 0.6,
    endAlpha: 0,
    colors: [signalColor, 0xffffff],
  });
  // A slow rising mist around the spirit's form — teal/foam colours, distinct
  // from the warm-amber signal effects, so the spirit reads as "the ocean"
  // and not as another piece of the cartridge's own light.
  spiritEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 0,
    maxParticles: 50,
    life: 2.2,
    lifeVariance: 0.6,
    speed: 4,
    speedVariance: 2,
    angle: -Math.PI / 2,
    angleVariance: 0.5,
    gravity: -1,
    startSize: 2,
    endSize: 0,
    startAlpha: 0.4,
    endAlpha: 0,
    colors: [stoneGlowColor, 0xffffff],
  });

  // The one thing visible in the dark prologue — a small, gently pulsing
  // point of light (the ember, still faintly warm), sitting right where the
  // carried flame will first appear. Destroyed once the world finishes
  // revealing itself (end of prologue4, see update()) — same technique as
  // Chapter One's own cold open.
  prologueSpark = nova64.scene.createSphere(0.12, signalColor, [0, 0.55, 0.4], 6, {
    emissive: signalColor,
    emissiveIntensity: 1.6,
  });

  // Every other glowing prop hidden until the reveal (see setWorldVisible),
  // and a deliberate close-up shot on the spark rather than the wide walk
  // camera the rest of the chapter uses.
  setWorldVisible(false);
  nova64.camera.setCameraPosition(0, 0.7, 1.6);
  nova64.camera.setCameraTarget(0, 0.6, 0.4);

  setBeat('prologue1');
}

function setBeat(next: Beat) {
  beat = next;
  beatTime = 0;
  if (next === 'prologue1') chapterCtx?.setCaption('You held it for only a second.');
  else if (next === 'prologue2') chapterCtx?.setCaption('Long enough for the tide to notice.');
  else if (next === 'prologue3') chapterCtx?.setCaption('It left pieces of itself behind.');
  else if (next === 'prologue4') chapterCtx?.setCaption('The shore remembers, too.');
  else if (next === 'settle') chapterCtx?.setCaption('The tide has gone out, and left something of the signal behind');
  else if (next === 'walk') chapterCtx?.setCaption('Steer along the shore — gather the light as you pass it');
  else if (next === 'spirit') {
    spiritLineIndex = 0;
    chapterCtx?.setCaption(SPIRIT_LINES[0]!);
    const laneX = walkSteer * WALK_LATERAL_RANGE;
    const parts: SpiritPart[] = [];
    const SPIRIT_Z = -1.4;
    // Two tones: the body is foam-teal, while a few interior accents use a
    // paler near-white so she has a visible core rather than reading as one
    // flat wash of colour.
    const pale = 0xdff6f2;

    // Every part goes through here so each one lands in `parts` with its own
    // drift parameters — the per-part phase offsets are what make her move
    // like something suspended in water instead of a rigid prop.
    const limb = (
      mesh: any,
      ox: number,
      oy: number,
      oz: number,
      opacity: number,
      drift: { sway?: number; phase?: number; bob?: number } = {}
    ) => {
      parts.push({
        mesh,
        ox,
        oy,
        oz,
        opacity,
        swayAmp: drift.sway ?? 0.02,
        swayPhase: drift.phase ?? 0,
        bobAmp: drift.bob ?? 0.03,
      });
      return mesh;
    };
    const orb = (
      radius: number,
      ox: number,
      oy: number,
      oz: number,
      opacity: number,
      glow: number,
      opts: {
        color?: number;
        scale?: [number, number, number];
        rot?: [number, number, number];
        sway?: number;
        phase?: number;
        bob?: number;
      } = {}
    ) => {
      const mesh = ownMaterial(
        nova64.scene.createSphere(radius, opts.color ?? stoneGlowColor, [laneX + ox, oy, SPIRIT_Z + oz], 10, {
          emissive: opts.color ?? stoneGlowColor,
          emissiveIntensity: glow,
          transparent: true,
          opacity,
        }),
        glow
      );
      if (opts.scale) nova64.scene.setScale(mesh, opts.scale[0], opts.scale[1], opts.scale[2]);
      if (opts.rot) nova64.scene.setRotation(mesh, opts.rot[0], opts.rot[1], opts.rot[2]);
      return limb(mesh, ox, oy, oz, opacity, opts);
    };

    // --- Head and face ---
    orb(0.14, 0, 1.9, 0, 0.6, 1.5, { scale: [0.92, 1.06, 0.92], sway: 0.03, phase: 0.6, bob: 0.045 });
    // A brighter inner glow just behind the face, so the head reads as lit
    // from within rather than as a plain translucent ball.
    orb(0.075, 0, 1.89, 0.03, 0.75, 2.2, { color: pale, sway: 0.03, phase: 0.6, bob: 0.045 });
    orb(0.05, 0, 1.73, 0, 0.5, 1.3, { scale: [0.8, 1.2, 0.8], sway: 0.028, phase: 0.55, bob: 0.04 });

    // --- Hair: a long mane flowing back and outward, each strand drifting
    // further and later than the one above it, like it's caught in a slow
    // current. This is most of what makes the silhouette read as feminine. ---
    for (let i = 0; i < 7; i++) {
      const f = i / 6;
      const side = i % 2 === 0 ? -1 : 1;
      orb(0.115 - f * 0.045, side * (0.09 + f * 0.13), 1.94 - f * 0.72, -0.1 - f * 0.1, 0.44 - f * 0.14, 1.15, {
        scale: [1.1, 1.55, 0.65],
        rot: [0, 0, side * (0.15 + f * 0.35)],
        sway: 0.05 + f * 0.09,
        phase: 1 + f * 1.8,
        bob: 0.045 + f * 0.05,
      });
    }
    // Two longer trailing locks that fall well past the shoulders.
    for (const side of [-1, 1]) {
      orb(0.06, side * 0.2, 1.18, -0.14, 0.3, 1.1, {
        scale: [0.9, 2.6, 0.6],
        rot: [0, 0, side * 0.2],
        sway: 0.13,
        phase: side > 0 ? 2.6 : 3.4,
        bob: 0.07,
      });
    }

    // --- Torso: shoulders, chest, a narrowed waist, hips ---
    orb(0.08, -0.17, 1.61, 0, 0.5, 1.2, { sway: 0.028, phase: 0.9 });
    orb(0.08, 0.17, 1.61, 0, 0.5, 1.2, { sway: 0.028, phase: 1.1 });
    orb(0.175, 0, 1.48, 0, 0.52, 1.25, { scale: [1, 0.95, 0.85], sway: 0.025, phase: 0.4 });
    orb(0.115, 0, 1.26, 0, 0.5, 1.2, { scale: [1, 1.1, 0.9], sway: 0.03, phase: 0.35 });
    orb(0.165, 0, 1.04, 0, 0.48, 1.15, { scale: [1, 0.85, 0.9], sway: 0.035, phase: 0.3 });
    // The heart-light — the one clearly brighter point in her whole form, and
    // what the caption beats are effectively speaking from.
    orb(0.07, 0, 1.46, 0.06, 0.85, 2.6, { color: pale, sway: 0.025, phase: 0.4 });

    // --- Arms: upper arm, forearm, and hand per side, each angled slightly
    // differently so they hang and drift rather than sticking out straight. ---
    for (const side of [-1, 1]) {
      const phase = side > 0 ? 1.6 : 2.2;
      const upper = ownMaterial(
        nova64.scene.createCapsule(0.048, 0.34, stoneGlowColor, [laneX + side * 0.23, 1.45, SPIRIT_Z], {
          emissive: stoneGlowColor,
          emissiveIntensity: 1.15,
          transparent: true,
          opacity: 0.46,
        }),
        1.15
      );
      nova64.scene.setRotation(upper, 0, 0, side * 0.3);
      limb(upper, side * 0.23, 1.45, 0, 0.46, { sway: 0.045, phase, bob: 0.035 });

      const fore = ownMaterial(
        nova64.scene.createCapsule(0.04, 0.32, stoneGlowColor, [laneX + side * 0.33, 1.13, SPIRIT_Z + 0.04], {
          emissive: stoneGlowColor,
          emissiveIntensity: 1.15,
          transparent: true,
          opacity: 0.44,
        }),
        1.15
      );
      nova64.scene.setRotation(fore, 0, 0, side * 0.14);
      limb(fore, side * 0.33, 1.13, 0.04, 0.44, { sway: 0.07, phase: phase + 0.5, bob: 0.05 });

      orb(0.05, side * 0.37, 0.95, 0.06, 0.5, 1.4, { sway: 0.09, phase: phase + 0.9, bob: 0.06 });
    }

    // --- Below the hips she stops being a person: the body narrows into a
    // column of wisps that trails toward the sand and never resolves into
    // legs. Deliberate — a ghost of the ocean shouldn't be standing on it. ---
    for (let i = 0; i < 6; i++) {
      const f = i / 5;
      orb(0.15 - f * 0.09, Math.sin(f * 2.6) * 0.07, 0.9 - f * 0.15, -f * 0.04, 0.4 - f * 0.06, 1.05, {
        scale: [1 + f * 0.5, 0.75, 1 + f * 0.5],
        sway: 0.05 + f * 0.11,
        phase: 2 + f * 1.7,
        bob: 0.03 + f * 0.03,
      });
    }
    // Two broad, very faint veils around the lower body — the suggestion of a
    // dress caught in the current, without any actual cloth simulation.
    for (const side of [-1, 1]) {
      orb(0.3, side * 0.11, 0.82, -0.05, 0.14, 0.9, {
        scale: [1.15, 1.5, 0.75],
        rot: [0, 0, side * 0.25],
        sway: 0.09,
        phase: side > 0 ? 1.2 : 2.9,
        bob: 0.05,
      });
    }

    const light = nova64.light.createPointLight(stoneGlowColor, 2.2, 11, laneX, 1.45, SPIRIT_Z);
    spirit = { parts, light, laneX };
    spiritEmitter.rate = 16;
    // A held, personal, slightly low shot — framed on her upper body so the
    // face and heart-light carry the scene. The walk's wide camera would put
    // her too far away for this to land as a real visitation.
    nova64.camera.setCameraPosition(laneX * 0.2 + 0.25, 1.45, 1.15);
    nova64.camera.setCameraTarget(laneX * 0.6, 1.42, SPIRIT_Z);
  } else if (next === 'flare') {
    chapterCtx?.setCaption('You send it back up — and the whole coast is watching');
    const laneX = walkSteer * WALK_LATERAL_RANGE;
    // Flare itself never updates the camera per-frame, so it just holds
    // whatever the previous beat last set — explicitly restore the walk's
    // own framing here rather than leaving it inherited from spirit's
    // close-up shot, which is too tight to hold the flare's rising arc.
    nova64.camera.setCameraPosition(laneX * 0.35, 2.1, 4.6);
    nova64.camera.setCameraTarget(laneX * 0.55, 0.5, -6);
    // A bright core plus a larger, softer, translucent halo around it — the
    // combination that actually reads as "glowing like a star" rather than
    // a single opaque bright ball. Bloom boosted for this one moment, same
    // technique Chapter One's own climax uses.
    nova64.fx.setBloomStrength(3.2);
    flare = {
      mesh: nova64.scene.createSphere(0.22, signalColor, [laneX, 0.6, 0.4], 6, {
        emissive: signalColor,
        emissiveIntensity: 3.4,
      }),
      glowMesh: nova64.scene.createSphere(0.55, signalColor, [laneX, 0.6, 0.4], 6, {
        emissive: signalColor,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.45,
      }),
      t: 0,
      duration: FLARE_SECONDS,
      startY: 0.6,
      laneX,
    };
  } else if (next === 'closing') chapterCtx?.setCaption('She slips back under. The light keeps climbing.');
}

// Hides/reveals the chapter's emissive props for the prologue — matte,
// non-emissive things (cliffs, driftwood, shells, the tide) already read as
// dark and unobtrusive under near-zero ambient light on their own, same as
// Chapter One's ocean; only things that glow regardless of ambient
// (sun, planet+ring, embers, the carried flame) and the point light itself
// (which — unlike ambient — actively illuminates everything near the
// stones) need to be explicitly hidden for the prologue's dark shot.
function setWorldVisible(visible: boolean) {
  nova64.scene.setMeshVisible?.(sunMesh, visible);
  nova64.scene.setMeshVisible?.(planetMesh, visible);
  nova64.scene.setMeshVisible?.(planetRing, visible);
  for (const e of embers) nova64.scene.setMeshVisible?.(e.mesh, visible);
  if (flameMesh) nova64.scene.setMeshVisible?.(flameMesh, visible);
  if (pointLightId !== null) nova64.light.setLightVisible?.(pointLightId, visible);
}

export function update(dt: number) {
  time += dt;
  beatTime += dt;

  // The prologue plays before any walk logic — just a timer per stage, a
  // gentle pulse on the one visible spark, and (on the final stage) the
  // ambient-light reveal. Everything else in update() below is the chapter
  // itself and shouldn't run yet. Mirrors Chapter One's cold open exactly.
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
        setBeat('settle');
      }
    }
    return;
  }

  const w = typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
  const h = typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
  foamEmitter.x = w / 2;
  foamEmitter.y = h * 0.76;
  dustEmitter.x = w * 0.5;
  dustEmitter.y = h * 0.4;
  nova64.fx.updateEmitter2D(foamEmitter, dt);
  nova64.fx.updateEmitter2D(sparkleEmitter, dt);
  nova64.fx.updateEmitter2D(dustEmitter, dt);

  ocean?.update(dt);
  if (planetRing) nova64.scene.rotateMesh(planetRing, 0, dt * 0.06, 0);

  for (const g of gulls) {
    g.timer += dt;
    const cycle = g.crossDuration + g.pauseDuration;
    const phase = g.timer % cycle;
    if (phase < g.crossDuration) {
      const f = phase / g.crossDuration;
      const x = g.startX + (g.endX - g.startX) * f;
      const bob = Math.sin(time * 1.4 + g.bobPhase) * 0.3;
      nova64.scene.setPosition(g.mesh, x, g.y + bob, g.z);
      nova64.scene.setMeshVisible?.(g.mesh, true);
    } else {
      nova64.scene.setMeshVisible?.(g.mesh, false);
    }
  }

  waveTimer -= dt;
  if (waveTimer <= 0) {
    waveTimer = WAVE_INTERVAL_SECONDS;
    waveFlashTimer = 0.5;
    foamEmitter.rate = 90;
    nova64.fx.updateEmitter2D(foamEmitter, 1 / 20);
    foamEmitter.rate = 2;
    if (pointLightId !== null) nova64.light.setPointLightColor(pointLightId, 0xffffff);
  } else if (waveFlashTimer > 0) {
    waveFlashTimer -= dt;
    if (waveFlashTimer <= 0 && pointLightId !== null) nova64.light.setPointLightColor(pointLightId, stoneGlowColor);
  }

  if (beat === 'settle') {
    if (beatTime >= SETTLE_SECONDS) setBeat('walk');
    return;
  }

  if (beat === 'walk') {
    // Same continuous drag/arrow steering as Chapter One, just at a walking
    // pace — proven, reliable input handling, not a new mechanic to debug.
    const dragging = nova64.input.mouseDown?.();
    const keyLeft = nova64.input.key?.('ArrowLeft') || nova64.input.key?.('KeyA');
    const keyRight = nova64.input.key?.('ArrowRight') || nova64.input.key?.('KeyD');
    const keyboardSteer = keyRight && !keyLeft ? 1 : keyLeft && !keyRight ? -1 : 0;
    const targetSteer = dragging
      ? Math.max(-1, Math.min(1, (nova64.input.mouseX() / INPUT_W - 0.5) * 2.4))
      : keyboardSteer;
    walkSteer += (targetSteer - walkSteer) * Math.min(1, dt * 3);

    walkDist += dt * WALK_SPEED;
    const laneX = walkSteer * WALK_LATERAL_RANGE;

    nova64.camera.setCameraPosition(laneX * 0.35, 2.1, 4.6);
    nova64.camera.setCameraTarget(laneX * 0.55, 0.5, -6);

    // A small trailing lag rather than snapping straight to laneX — gives
    // the carried flame some physical weight as you steer, instead of
    // feeling rigidly bolted to the walker.
    flameX += (laneX - flameX) * Math.min(1, dt * 5);
    const flameBob = Math.sin(time * 2) * 0.04;
    nova64.scene.setPosition(flameMesh, flameX, 0.55 + flameBob, 0.4);

    // A continuous light trail while walking — the flame should feel alive
    // the whole time, not just at the moment of each pickup.
    trailEmitter.x = w / 2 + (laneX - flameX) * 40;
    trailEmitter.y = h * 0.62;
    trailEmitter.rate = 30;
    nova64.fx.updateEmitter2D(trailEmitter, dt);

    // The flame's live world position — everything an ember does once it's
    // been pulled loose is measured against this, not against the lane.
    const flameY = 0.55 + flameBob;
    const flameZ = 0.4;

    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i]!;
      const mat = e.mesh.material;

      if (e.phase === 'waiting') {
        // Still sitting where the tide left it, riding the shoreline toward
        // the walker.
        e.x = e.laneX;
        e.y = 0.4 + Math.sin(time * 1.6 + e.bobPhase) * 0.06;
        e.z = walkDist - e.spawnDist;
        nova64.scene.rotateMesh(e.mesh, 0, dt * 0.8, 0);

        const dx = flameX - e.x;
        const dy = flameY - e.y;
        const dz = flameZ - e.z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < EMBER_ATTRACT_RADIUS) {
          e.phase = 'drawn';
        } else if (e.z > 1.6) {
          // Walked past without ever coming into range — this one stays lost.
          nova64.scene.destroyMesh(e.mesh);
          embers.splice(i, 1);
          continue;
        }
      } else if (e.phase === 'drawn') {
        const dx = flameX - e.x;
        const dy = flameY - e.y;
        const dz = flameZ - e.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4;
        // Accelerating pull rather than a constant-speed tween — it hesitates,
        // then rushes the last stretch, which is what reads as magnetic.
        const closeness = 1 - Math.min(1, d / EMBER_ATTRACT_RADIUS);
        const pull = Math.min(1, dt * (2.2 + closeness * 9));
        e.x += dx * pull;
        e.y += dy * pull;
        e.z += dz * pull;
        // Spins up and brightens the closer it gets — it's waking up.
        nova64.scene.rotateMesh(e.mesh, 0, dt * (1.5 + closeness * 6), 0);
        if (mat) mat.emissiveIntensity = 1.7 + closeness * 1.8;

        if (d < EMBER_BIND_RADIUS) {
          e.phase = 'binding';
          e.bindT = 0;
          kindled++;
          const flameScale = 1 + kindled * 0.18;
          nova64.scene.setScale(flameMesh, flameScale, flameScale, flameScale);
          if (flameMesh.material) flameMesh.material.emissiveIntensity = 1.7 + kindled * 0.3;
          sparkleEmitter.x = w / 2;
          sparkleEmitter.y = h * 0.5;
          sparkleEmitter.rate = 420;
          nova64.fx.updateEmitter2D(sparkleEmitter, 1 / 22);
          sparkleEmitter.rate = 0;
        }
      } else {
        // Bound: locked to the flame, swelling once, turning its colour, and
        // fading out into it.
        e.bindT += dt;
        const f = Math.min(1, e.bindT / EMBER_BIND_SECONDS);
        e.x = flameX;
        e.y = flameY;
        e.z = flameZ;
        const swell = 1 + Math.sin(f * Math.PI) * 1.6;
        nova64.scene.setScale(e.mesh, swell, swell, swell);
        nova64.scene.rotateMesh(e.mesh, 0, dt * 7, 0);
        if (mat) {
          const blended = mixColor(e.color, signalColor, f);
          mat.color?.setHex?.(blended);
          mat.emissive?.setHex?.(blended);
          mat.emissiveIntensity = 1.7 + Math.sin(f * Math.PI) * 3.4;
          // Eased so it holds its brightness through the swell and then goes
          // quickly, rather than dimming from the first frame.
          mat.opacity = 1 - f * f;
        }
        if (f >= 1) {
          nova64.scene.destroyMesh(e.mesh);
          embers.splice(i, 1);
          continue;
        }
      }

      nova64.scene.setPosition(e.mesh, e.x, e.y, e.z);
    }

    if (walkDist >= WALK_DISTANCE) setBeat('spirit');
    return;
  }

  if (beat === 'spirit') {
    // She fades up out of nothing and dissolves back into it — the same
    // material-opacity ramp on every part at once, which is what makes her
    // read as condensing out of the sea air rather than simply appearing.
    const materialize = Math.min(1, beatTime / 1.2);
    const dissolve = Math.min(1, Math.max(0, (SPIRIT_SECONDS - beatTime) / 1.0));
    const presence = materialize * dissolve;
    // A slow swell through the whole figure, timed to her speaking: each new
    // line rises to a small crest and settles, so the form itself carries the
    // cadence of the dialogue instead of standing inert behind captions.
    const linePhase = (beatTime % SPIRIT_LINE_SECONDS) / SPIRIT_LINE_SECONDS;
    const breath = Math.sin(linePhase * Math.PI) * 0.35 + Math.sin(time * 0.9) * 0.12;

    if (spirit) {
      // The whole figure hovers, rising very slightly as she speaks.
      const hover = Math.sin(time * 0.7) * 0.05 + breath * 0.06;
      for (const p of spirit.parts) {
        const sway = Math.sin(time * 0.9 + p.swayPhase) * p.swayAmp;
        const drift = Math.cos(time * 0.6 + p.swayPhase * 1.3) * p.swayAmp * 0.6;
        const bob = Math.sin(time * 1.25 + p.swayPhase * 0.7) * p.bobAmp;
        nova64.scene.setPosition(
          p.mesh,
          spirit.laneX + p.ox + sway,
          p.oy + bob + hover,
          -1.4 + p.oz + drift
        );
        if (p.mesh.material) p.mesh.material.opacity = p.opacity * presence;
      }
      if (spirit.light !== null) {
        nova64.light.setPointLightPosition(spirit.light, spirit.laneX, 1.45 + hover, -1.4);
      }
      spiritEmitter.x = w / 2 + spirit.laneX * 30;
      spiritEmitter.y = h * 0.55;
      spiritEmitter.rate = 10 + breath * 22;
      nova64.fx.updateEmitter2D(spiritEmitter, dt);
    }

    const lineIndex = Math.min(SPIRIT_LINES.length - 1, Math.floor(beatTime / SPIRIT_LINE_SECONDS));
    if (lineIndex !== spiritLineIndex) {
      spiritLineIndex = lineIndex;
      chapterCtx?.setCaption(SPIRIT_LINES[lineIndex]!);
      // A soft pulse of foam-light on each new line — she's speaking, and the
      // scene should acknowledge it somewhere other than the caption text.
      sparkleEmitter.x = w / 2 + (spirit?.laneX ?? 0) * 30;
      sparkleEmitter.y = h * 0.42;
      sparkleEmitter.rate = 140;
      nova64.fx.updateEmitter2D(sparkleEmitter, 1 / 26);
      sparkleEmitter.rate = 0;
    }

    if (beatTime >= SPIRIT_SECONDS) {
      if (spirit) {
        for (const p of spirit.parts) nova64.scene.destroyMesh(p.mesh);
        if (spirit.light !== null) nova64.light.removeLight?.(spirit.light);
        spirit = null;
      }
      spiritEmitter.rate = 0;
      setBeat('flare');
    }
    return;
  }

  if (beat === 'flare') {
    if (flare) {
      flare.t += dt;
      const f = Math.min(1, flare.t / flare.duration);
      const y = flare.startY + f * 9;
      const z = 0.4 - f * 2;
      nova64.scene.setPosition(flare.mesh, flare.laneX, y, z);
      nova64.scene.setPosition(flare.glowMesh, flare.laneX, y, z);

      // Core grows through the first half then holds bright until the very
      // end, where both it and the halo fade together.
      const growF = Math.min(1, f / 0.5);
      const coreScale = 1 + Math.sin((growF * Math.PI) / 2) * 0.9;
      nova64.scene.setScale(flare.mesh, coreScale, coreScale, coreScale);
      if (flare.mesh.material) flare.mesh.material.opacity = f < 0.75 ? 1 : 1 - (f - 0.75) / 0.25;

      // The halo keeps expanding and softening the whole time — this is
      // what actually sells "glowing," not just a bright opaque ball.
      const glowScale = 1 + f * 2 + Math.sin(time * 8) * 0.06;
      nova64.scene.setScale(flare.glowMesh, glowScale, glowScale, glowScale);
      if (flare.glowMesh.material) flare.glowMesh.material.opacity = 0.45 * (1 - f * 0.55);

      const fw = typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
      const fh = typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
      flareEmitter.x = fw / 2;
      flareEmitter.y = fh * (0.5 - f * 0.15);
      flareEmitter.rate = 90;
      nova64.fx.updateEmitter2D(flareEmitter, dt);

      if (f >= 1) {
        nova64.scene.destroyMesh(flare.mesh);
        nova64.scene.destroyMesh(flare.glowMesh);
        flare = null;
        flareEmitter.rate = 0;
        setBeat('closing');
      }
    }
    return;
  }

  if (beat === 'closing') {
    if (beatTime >= CLOSING_SECONDS && !completeSent) {
      completeSent = true;
      void chapterCtx?.complete({ discovered: ['coastal-signal:chapter-02:answered'] });
    }
  }
}

export function draw() {
  // Narrative captions render as real HTML/CSS over the canvas (see
  // viewer-canvas.tsx's setCaption bridge) — vector typography, not the
  // engine's fixed bitmap font.
  nova64.fx.drawEmitter2D(dustEmitter);
  nova64.fx.drawEmitter2D(foamEmitter);
  nova64.fx.drawEmitter2D(trailEmitter);
  nova64.fx.drawEmitter2D(sparkleEmitter);
  nova64.fx.drawEmitter2D(flareEmitter);
  nova64.fx.drawEmitter2D(spiritEmitter);
}
