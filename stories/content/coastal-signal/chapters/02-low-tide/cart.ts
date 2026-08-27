// Coastal Signal — Chapter 02: Low Tide
// The exhale after Chapter One's rush: the tide has gone out over a bright,
// golden-hour shore. This is a moment in an interactive story, not a scored
// minigame — the search below exists to make "noticing something" a real,
// felt action rather than a formality, not to turn the chapter into a
// competitive hunt. Rather than a blind "tap anywhere N times" counter (the
// old version — any tap, anywhere on screen, advanced to the next stone in
// array order with no connection to where you actually tapped, which read
// as arbitrary and thin), each touch is a genuine probe: nearby stones pulse
// warmer the closer you are, and — important given the engine exposes no
// touch-release event to carts, only press-edge/held-state/position — every
// touch (hit or miss) gets an immediate, visible response (a warmth-scaled
// ripple), so a tap never just silently does nothing. Calm doesn't mean
// static or passive — the light, water, stones, gulls and tide are always
// gently moving.
import { getChapterContext } from '../../../chapter-context';
import { mulberry32 } from '../../../../lib/seed';
import { packColor } from '../../../pack-color';
import { OceanSurface } from '../../../ocean/ocean-surface';

declare const nova64: any;

// Same fixed virtual input space nova64.input.mouseX()/mouseY() report in
// regardless of real canvas resolution — see Chapter One's cart.ts for the
// full note; every reticle/zone calculation here is done in this space.
const INPUT_W = 640;
const INPUT_H = 360;

type Beat = 'settle' | 'comb' | 'rest' | 'closing';

const SETTLE_SECONDS = 1.3;
const REST_HOLD_SECONDS = 1.2;
const CLOSING_SECONDS = 1.3;
const STONE_COUNT = 4;
const WAVE_INTERVAL_SECONDS = 5.5;
const ZONE_RADIUS = 70;

let time = 0;
let beatTime = 0;
let beat: Beat = 'settle';
let chapterCtx: ReturnType<typeof getChapterContext> | null = null;
let completeSent = false;

let foamEmitter: any;
let sparkleEmitter: any;
let dustEmitter: any;
// Feedback for every probe/touch — including misses — scaled by how close
// the nearest stone was; keeps a tap from ever silently doing nothing.
let probeEmitter: any;
let stones: {
  mesh: any;
  pos: [number, number, number];
  size: number;
  found: boolean;
  special: boolean;
  glowColor: number;
  bobPhase: number;
  // Where this stone's scanner hit-zone sits in the fixed input space — the
  // actual target the reticle search is testing against.
  zoneX: number;
  zoneY: number;
}[] = [];
let foundCount = 0;
let swaySpeed = 0.05;
let swayRadius = 5;
// The scanner reticle, in the fixed input space — starts centred rather
// than snapping to (0,0) before the first touch/drag.
let reticleX = INPUT_W / 2;
let reticleY = INPUT_H / 2;
let stoneGlowColor = 0x8fd8d0;
let planetRing: any = null;

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

  const baseHue = 0.5 + rand() * 0.12; // teal/blue family, for the stones and water
  const foamColor = tealShift > 0.5 ? 0x8fd8d0 : 0x9fc8e0;
  stoneGlowColor = foamColor;
  // Golden-hour low tide — bright pale sky overhead, warm low-sun horizon —
  // not the near-black night sky this chapter had originally. Pushed
  // brighter still than the last pass (matching the same correction made in
  // Chapter One): the earlier brightness fix was made cautiously alongside
  // an unrelated bloom-clamp fix, and ended up more muted/drab than needed.
  const skyTop = hsvToHex(baseHue, 0.42, 0.92);
  const skyHorizon = hsvToHex(0.09 + rand() * 0.03, 0.62, 0.96);

  nova64.light.createGradientSkybox(skyTop, skyHorizon);
  nova64.light.setAmbientLight(0xffffff, 1.2);
  nova64.light.setFog(skyHorizon, 18, 55);
  nova64.camera.setCameraTarget(0, 0.3, 0);
  nova64.camera.setCameraPosition(0, 2.4, 6);
  // One warm accent light over the stone cluster, on top of the bright
  // ambient above — briefly brightens in colour with the tide rhythm below.
  pointLightId = nova64.light.createPointLight(stoneGlowColor, 2.6, 16, 0, 1.8, 0);

  // A soft low sun near the horizon, behind the stones — cheap, static, and
  // does a lot of work selling "golden hour" without any extra motion cost.
  nova64.scene.createSphere(1.6, skyHorizon, [-6, 2.6, -18], 6, {
    emissive: skyHorizon,
    emissiveIntensity: 1.4,
  });

  // A headland framing the cove — this chapter was just four stones and a
  // water ring floating in an empty void; a static ring of rocky cliffs
  // around the horizon gives the scene an actual place to be in.
  const CLIFF_COUNT = 9;
  for (let i = 0; i < CLIFF_COUNT; i++) {
    const cliffAngle = (i / CLIFF_COUNT) * Math.PI * 2 + rand() * 0.3;
    const cliffDist = 22 + rand() * 10;
    const height = 5 + rand() * 9;
    const cx = Math.cos(cliffAngle) * cliffDist;
    const cz = Math.sin(cliffAngle) * cliffDist - 8;
    const cliffColor = hsvToHex((baseHue - 0.2 + (rand() - 0.5) * 0.06 + 1) % 1, 0.25 + rand() * 0.12, 0.32 + rand() * 0.15);
    const mesh = nova64.scene.createCone(height * (0.5 + rand() * 0.25), height, cliffColor, [cx, -0.6 + height / 2, cz], {
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
    const mesh = nova64.scene.createSphere(size, planetColor, [px, py, pz], 6, {
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

  // A tide ring around the stone cluster — leaves a dry patch under the
  // stones themselves (the tide surrounds them, it doesn't submerge them).
  // See content/ocean/ for the shared wave-field math driving both this and
  // Chapter One's ocean.
  ocean = new OceanSurface({
    rows: 9,
    cols: 9,
    width: 28,
    depth: 20,
    originY: -0.32,
    waveHeight: 0.25,
    centerHoleRadius: 5.5,
    // Vivid, unambiguous blue rather than a muted tint — combined with the
    // low roughness in ocean-surface.ts, this reads as shiny water instead
    // of a dull dark panel.
    colorDeep: hsvToHex((baseHue + 1) % 1, 0.8, 0.75),
    colorShallow: hsvToHex((baseHue + 0.05 + 1) % 1, 0.7, 0.97),
    rand,
  });

  // Stones: reflective, translucent, each an independently-random hue in the
  // teal/blue family — not one flat colour repeated four times. One stone,
  // chosen at random per token, is a hidden shimmering rarity.
  stones = [];
  const specialIndex = Math.floor(rand() * STONE_COUNT);
  for (let i = 0; i < STONE_COUNT; i++) {
    const special = i === specialIndex;
    const angle = (i / STONE_COUNT) * Math.PI * 2 + rand() * 0.4;
    const radius = 2.2 + rand() * 2;
    const size = special ? 0.42 : 0.3 + rand() * 0.3;
    const pos: [number, number, number] = [Math.cos(angle) * radius, size * 0.4, Math.sin(angle) * radius];
    const color = special ? 0xd8b4ff : hsvToHex((baseHue + (rand() - 0.5) * 0.15 + 1) % 1, 0.3 + rand() * 0.2, 0.7);
    // A soft ambient glow even before being found — unfound stones used to
    // sit as flat, dark, easy-to-ignore rocks with nothing drawing the eye
    // to them; a gentle emissive baseline (well below the bright "found"
    // glow later) invites a closer look instead.
    const mesh = nova64.scene.createSphere(size, color, pos, 6, {
      metallic: true,
      roughness: 0.3,
      transparent: true,
      opacity: special ? 0.85 : 0.65 + rand() * 0.2,
      emissive: color,
      emissiveIntensity: special ? 0.55 : 0.3,
    });
    nova64.scene.setScale(mesh, 0.01, 0.01, 0.01);
    // Spread each stone's scanner zone across distinct, well-separated
    // regions of the screen — the actual thing the reticle search tests
    // against, independent of the stone's 3D position (this scene has no
    // world-to-screen projection utility available to keep a zone in exact
    // sync with a moving stone/camera, so the zone is authored directly in
    // screen space instead of derived from one).
    const zoneX = 90 + (i / (STONE_COUNT - 1)) * 460 + (rand() - 0.5) * 30;
    const zoneY = 150 + (rand() - 0.5) * 70;
    stones.push({
      mesh,
      pos,
      size,
      found: false,
      special,
      glowColor: special ? 0xd8b4ff : stoneGlowColor,
      bobPhase: rand() * Math.PI * 2,
      zoneX,
      zoneY,
    });
  }

  // Driftwood and shells scattered around the sand — non-interactive set
  // dressing, but the difference between "four balls floating in a void"
  // and an actual beach with things lying around on it.
  const DRIFTWOOD_COUNT = 4;
  for (let i = 0; i < DRIFTWOOD_COUNT; i++) {
    const woodAngle = rand() * Math.PI * 2;
    const woodDist = 5 + rand() * 6;
    const wx = Math.cos(woodAngle) * woodDist;
    const wz = Math.sin(woodAngle) * woodDist;
    const woodColor = hsvToHex(0.08 + rand() * 0.03, 0.4 + rand() * 0.15, 0.22 + rand() * 0.12);
    const mesh = nova64.scene.createCube(1, woodColor, [wx, -0.08, wz], { flatShading: true, roughness: 0.9 });
    nova64.scene.setScale(mesh, 0.9 + rand() * 0.7, 0.12 + rand() * 0.05, 0.16 + rand() * 0.06);
    nova64.scene.setRotation(mesh, 0, rand() * Math.PI * 2, (rand() - 0.5) * 0.2);
  }
  const SHELL_COUNT = 7;
  for (let i = 0; i < SHELL_COUNT; i++) {
    const shellAngle = rand() * Math.PI * 2;
    const shellDist = 4 + rand() * 7;
    const sx = Math.cos(shellAngle) * shellDist;
    const sz = Math.sin(shellAngle) * shellDist;
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
  // A touch more bloom bleed than the LowPolyMode default, kept gentle —
  // this is the quiet chapter, not the spectacle.
  nova64.fx.setBloomStrength(0.7);

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
    maxParticles: 40,
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
    colors: [stoneGlowColor, 0xffffff],
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
  // A soft ripple at the exact touch point on every probe — deliberately
  // neutral (not the golden "found" colour), so it reads as "your touch
  // registered" rather than pre-empting the hit celebration. Rate/burst
  // strength is scaled by proximity when it's fired (see update()).
  probeEmitter = nova64.fx.createEmitter2D({
    blendMode: 'add',
    x: 0,
    y: 0,
    rate: 0,
    maxParticles: 40,
    life: 0.55,
    lifeVariance: 0.15,
    speed: 14,
    speedVariance: 6,
    angle: 0,
    angleVariance: Math.PI * 2,
    gravity: 0,
    startSize: 2.2,
    endSize: 0,
    startAlpha: 0.7,
    endAlpha: 0,
    colors: [0xdfe8f0, 0x9fc8e0],
  });

  setBeat('settle');
}

function combCaption(): string {
  return `${foundCount}/${STONE_COUNT} found — touch the sand where it feels warm`;
}

function setBeat(next: Beat) {
  beat = next;
  beatTime = 0;
  if (next === 'settle') chapterCtx?.setCaption('The tide has gone out, and something is caught in the wet sand');
  // Plain, literal instruction first ("touch the sand"), then the feedback
  // rule that makes the search legible ("warmer the closer") — every touch
  // gets a visible response even on a miss, so this promise holds up.
  else if (next === 'comb') chapterCtx?.setCaption('Touch the sand to search — it feels warmer the closer you are');
  else if (next === 'rest') chapterCtx?.setCaption("You're in no hurry here. Touch when it feels right.");
  else if (next === 'closing') chapterCtx?.setCaption('You stay a while longer');
}

export function update(dt: number) {
  time += dt;
  beatTime += dt;

  // A bit more amplitude/speed than before, plus a slow height bob — the
  // old sway was so subtle it read as a static shot. Held still during the
  // search itself (below) since the stones' scanner zones are authored in
  // fixed screen space — a moving camera would drift the 3D stones out from
  // under their own zones.
  if (beat !== 'comb') {
    const camAngle = Math.sin(time * swaySpeed) * 0.5;
    const camHeight = 2.4 + Math.sin(time * swaySpeed * 0.6) * 0.25;
    nova64.camera.setCameraPosition(Math.sin(camAngle) * swayRadius, camHeight, Math.cos(camAngle) * 6);
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

  // Tide ring: height and tilt driven by the shared wave-field math
  // (content/ocean/wave-field.ts), same as Chapter One's ocean. Passes dt,
  // not the chapter's own `time` — OceanSurface tracks its own wave clock
  // (see ocean-surface.ts) so both chapters' oceans move at the same
  // real-world pace regardless of what each chapter's own time means.
  ocean?.update(dt);

  if (planetRing) nova64.scene.rotateMesh(planetRing, 0, dt * 0.06, 0);

  // Gulls: same cross-then-pause cycle as Chapter One's ambient stars, with
  // a gentle glide bob — visible only while actually crossing.
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

  // A rhythmic wave washing in every WAVE_INTERVAL_SECONDS — a foam/sparkle
  // burst plus a brief warm brightening of the accent light (colour only;
  // the engine has no dynamic point-light intensity setter) — gives the
  // whole chapter a living pulse instead of one flat unchanging tableau.
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

  // The reticle: wherever the player is dragging/touching, in the same
  // fixed input space the zone coordinates are authored in. Held at the
  // screen centre when not actively pointing at anything (before the first
  // touch) rather than snapping to (0,0).
  reticleX = nova64.input.mouseX?.() ?? reticleX;
  reticleY = nova64.input.mouseY?.() ?? reticleY;

  // Closest not-yet-found stone to the reticle, if within range — the
  // actual hot/cold search target this frame.
  let closest: (typeof stones)[number] | null = null;
  let closestDist = Infinity;
  if (beat === 'comb') {
    for (const stone of stones) {
      if (stone.found) continue;
      const d = Math.hypot(reticleX - stone.zoneX, reticleY - stone.zoneY);
      if (d < closestDist) {
        closestDist = d;
        closest = stone;
      }
    }
  }

  const introEase = nova64.util.ease(Math.min(1, time / SETTLE_SECONDS), 'easeOutCubic');
  for (const stone of stones) {
    if (!stone.found) {
      // Proximity-driven pulse — closer to the reticle means faster and
      // bigger, giving real-time "warmer/colder" feedback instead of the
      // stones sitting inert until tapped.
      const proximity = stone === closest ? Math.max(0, 1 - closestDist / (ZONE_RADIUS * 2.4)) : 0;
      const pulse = 1 + Math.sin(time * (6 + proximity * 10)) * (0.03 + proximity * 0.14);
      const s = introEase * pulse;
      nova64.scene.setScale(stone.mesh, s, s, s);
      // A small idle bob on unfound stones — enough to read as "alive," not
      // enough to make them harder to tap.
      const bob = Math.sin(time * 0.8 + stone.bobPhase) * 0.03;
      nova64.scene.setPosition(stone.mesh, stone.pos[0], stone.pos[1] + bob, stone.pos[2]);
    }
    nova64.scene.rotateMesh(stone.mesh, 0, dt * 0.04, 0);
  }

  if (beat === 'settle') {
    if (beatTime >= SETTLE_SECONDS) setBeat('comb');
    return;
  }

  if (beat === 'comb') {
    if (nova64.input.mousePressed?.()) {
      const px = (reticleX / INPUT_W) * w;
      const py = (reticleY / INPUT_H) * h;
      if (closest && closestDist <= ZONE_RADIUS) {
        const next = closest;
        next.found = true;
        foundCount++;
        nova64.scene.destroyMesh(next.mesh);
        next.mesh = nova64.scene.createSphere(next.size * 1.15, next.glowColor, next.pos, 6, {
          emissive: next.glowColor,
          emissiveIntensity: next.special ? 1.8 : 1.2,
        });
        sparkleEmitter.x = w / 2;
        sparkleEmitter.y = h * 0.5;
        sparkleEmitter.rate = next.special ? 500 : 300;
        nova64.fx.updateEmitter2D(sparkleEmitter, 1 / 30);
        sparkleEmitter.rate = 0;
        // The hidden rarity gets its own moment before falling back to the
        // running counter on the next tap.
        chapterCtx?.setCaption(next.special ? '✦ This one feels different ✦' : combCaption());
        if (foundCount >= STONE_COUNT) setBeat('rest');
      } else {
        // A miss still gets an immediate, visible response at the exact
        // touch point, scaled by how close the nearest stone actually was —
        // a tap never just silently does nothing, which is what made the
        // search feel broken/unclear rather than merely "not there yet."
        const nearProximity = closest ? Math.max(0, 1 - closestDist / (ZONE_RADIUS * 3)) : 0;
        probeEmitter.x = px;
        probeEmitter.y = py;
        probeEmitter.rate = 60 + nearProximity * 200;
        nova64.fx.updateEmitter2D(probeEmitter, 1 / 20);
        probeEmitter.rate = 0;
      }
    }
    return;
  }

  if (beat === 'rest') {
    if (beatTime >= REST_HOLD_SECONDS && nova64.input.mousePressed?.()) {
      // A gentle acknowledgment before the actual completion call — the old
      // version called complete() directly on tap with no feedback, so a
      // second impatient tap (waiting on the network round trip) fired a
      // second completion request the server correctly rejected as a
      // conflict. Now the tap always gets an immediate visible response.
      sparkleEmitter.x = w / 2;
      sparkleEmitter.y = h * 0.55;
      sparkleEmitter.rate = 220;
      nova64.fx.updateEmitter2D(sparkleEmitter, 1 / 25);
      sparkleEmitter.rate = 0;
      setBeat('closing');
    }
    return;
  }

  if (beat === 'closing') {
    if (beatTime >= CLOSING_SECONDS && !completeSent) {
      completeSent = true;
      void chapterCtx?.complete({ discovered: ['coastal-signal:chapter-02:settled'] });
    }
  }
}

export function draw() {
  // Narrative captions render as real HTML/CSS over the canvas (see
  // viewer-canvas.tsx's setCaption bridge) — vector typography, not the
  // engine's fixed bitmap font.
  nova64.fx.drawEmitter2D(dustEmitter);
  nova64.fx.drawEmitter2D(foamEmitter);
  nova64.fx.drawEmitter2D(sparkleEmitter);
  nova64.fx.drawEmitter2D(probeEmitter);

  // The scanner reticle — the one thing that makes the search legible as a
  // search rather than blind tapping. Converted from the fixed 640x360
  // input space to real screen pixels, same conversion Chapter One's camera
  // icon uses.
  if (beat === 'comb') {
    const w = typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
    const h = typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
    const rx = (reticleX / INPUT_W) * w;
    const ry = (reticleY / INPUT_H) * h;
    const r = 16 * Math.max(0.8, Math.min(2, w / 700));
    // packColor's alpha is 0-255, not 0-1 — 204 ≈ 80% opacity.
    const reticleColor = packColor(0xffffff, 204);
    nova64.draw.circle(rx, ry, r, reticleColor, false);
    nova64.draw.rectfill(rx - 1, ry - r * 1.6, 2, r * 0.8, reticleColor);
    nova64.draw.rectfill(rx - 1, ry + r * 0.8, 2, r * 0.8, reticleColor);
    nova64.draw.rectfill(rx - r * 1.6, ry - 1, r * 0.8, 2, reticleColor);
    nova64.draw.rectfill(rx + r * 0.8, ry - 1, r * 0.8, 2, reticleColor);
  }
}
