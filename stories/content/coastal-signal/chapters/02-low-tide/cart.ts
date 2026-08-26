// Coastal Signal — Chapter 02: Low Tide
// The exhale after Chapter One's rush: the tide has gone out, and a few wet
// stones catch the light. A quiet beachcombing beat (tap to notice each one)
// gives this chapter its own small arc without competing with Chapter One's
// energy — deliberately calmer, deliberately sparser.
import { getChapterContext } from '../../../chapter-context';
import { mulberry32 } from '../../../../lib/seed';

declare const nova64: any;

type Beat = 'settle' | 'comb' | 'rest' | 'closing';

const SETTLE_SECONDS = 1.3;
const REST_HOLD_SECONDS = 1.2;
const CLOSING_SECONDS = 1.3;
const STONE_COUNT = 4;

let time = 0;
let beatTime = 0;
let beat: Beat = 'settle';
let chapterCtx: ReturnType<typeof getChapterContext> | null = null;
let completeSent = false;

let foamEmitter: any;
let sparkleEmitter: any;
let dustEmitter: any;
let stones: {
  mesh: any;
  pos: [number, number, number];
  size: number;
  found: boolean;
  special: boolean;
  glowColor: number;
}[] = [];
let foundCount = 0;
let swaySpeed = 0.05;
let swayRadius = 5;
let stoneGlowColor = 0x8fd8d0;

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

  const baseHue = 0.5 + rand() * 0.12; // teal/blue family, matching Chapter One's dusk
  const foamColor = tealShift > 0.5 ? 0x8fd8d0 : 0x9fc8e0;
  stoneGlowColor = foamColor;
  const skyTop = 0x0a1420;
  const skyHorizon = tealShift > 0.5 ? 0x2c5a56 : 0x2c4a5a;

  nova64.light.createGradientSkybox(skyTop, skyHorizon);
  // Softer than Chapter One (this is the calmer chapter) but still bright
  // enough to read clearly — dim-but-clear, not dark.
  nova64.light.setAmbientLight(0xffffff, 0.75);
  nova64.light.setFog(skyTop, 8, 22);
  nova64.camera.setCameraTarget(0, 0.3, 0);
  nova64.camera.setCameraPosition(0, 2.4, 6);
  // One cool moonlit accent light over the stone cluster, on top of the
  // bright ambient above — an accent, not the scene's only light.
  nova64.light.createPointLight(stoneGlowColor, 2.2, 16, 0, 1.8, 0);

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
    const mesh = nova64.scene.createSphere(size, color, pos, 6, {
      metallic: true,
      roughness: 0.3,
      transparent: true,
      opacity: special ? 0.85 : 0.65 + rand() * 0.2,
    });
    nova64.scene.setScale(mesh, 0.01, 0.01, 0.01);
    stones.push({ mesh, pos, size, found: false, special, glowColor: special ? 0xd8b4ff : stoneGlowColor });
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

  setBeat('settle');
}

function combCaption(): string {
  return `${foundCount}/${STONE_COUNT} noticed — tap to look closer`;
}

function setBeat(next: Beat) {
  beat = next;
  beatTime = 0;
  if (next === 'settle') chapterCtx?.setCaption('The tide has gone out. What did it leave behind?');
  else if (next === 'comb') chapterCtx?.setCaption(combCaption());
  else if (next === 'rest') chapterCtx?.setCaption("You're in no hurry here. Touch when it feels right.");
  else if (next === 'closing') chapterCtx?.setCaption('You stay a while longer');
}

export function update(dt: number) {
  time += dt;
  beatTime += dt;

  const camAngle = Math.sin(time * swaySpeed) * 0.3;
  nova64.camera.setCameraPosition(Math.sin(camAngle) * swayRadius, 2.4, Math.cos(camAngle) * 6);

  const w = typeof nova64.draw.screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
  const h = typeof nova64.draw.screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
  foamEmitter.x = w / 2;
  foamEmitter.y = h * 0.76;
  dustEmitter.x = w * 0.5;
  dustEmitter.y = h * 0.4;
  nova64.fx.updateEmitter2D(foamEmitter, dt);
  nova64.fx.updateEmitter2D(sparkleEmitter, dt);
  nova64.fx.updateEmitter2D(dustEmitter, dt);

  const introEase = nova64.util.ease(Math.min(1, time / SETTLE_SECONDS), 'easeOutCubic');
  for (const stone of stones) {
    if (!stone.found) nova64.scene.setScale(stone.mesh, introEase, introEase, introEase);
    nova64.scene.rotateMesh(stone.mesh, 0, dt * 0.04, 0);
  }

  if (beat === 'settle') {
    if (beatTime >= SETTLE_SECONDS) setBeat('comb');
    return;
  }

  if (beat === 'comb') {
    if (nova64.input.mousePressed?.()) {
      const next = stones.find((s) => !s.found);
      if (next) {
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
      }
      if (foundCount >= STONE_COUNT) setBeat('rest');
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
  // engine's fixed bitmap font. Nothing left to draw here but the scene itself.
  nova64.fx.drawEmitter2D(dustEmitter);
  nova64.fx.drawEmitter2D(foamEmitter);
  nova64.fx.drawEmitter2D(sparkleEmitter);
}
