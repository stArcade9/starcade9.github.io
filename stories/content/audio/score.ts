// Coastal Signal — the score
//
// Nova64's own audio API (runtime/audio.js) exposes exactly two things to a
// cart: `sfx()` — a one-shot oscillator or noise burst on one of eight
// channels — and `setVolume()`. There is no scheduler, no sustained voice, no
// filter, no send, and no notion of a key or a tempo. That's plenty for a
// jump or a coin, and nothing like enough for music: `sfx()` fires at
// whatever moment the frame happens to land on, which is audibly not a beat,
// and it has no way to hold a chord underneath anything.
//
// So this is a small Web Audio score engine built alongside the engine rather
// than inside it — the same treatment `ocean-surface.ts` and `own-material.ts`
// get, and for the same reason: it's this story's problem, not Nova64's, and
// forking the shared runtime for it would push the change onto the root site
// too. It creates its own AudioContext; the viewer's boot gesture
// (public/engine/boot.js) has already unlocked audio for the origin by the
// time any cart's init() runs, so it starts unmuted.
//
// The design goal is that the music is *authored against the beats*, not
// looped underneath them. Each chapter defines a table of cues — one per
// story beat — and calls `score.cue()` from the same `setBeat()` that sets
// the caption. Crossfades, tempo, and harmony all move with the story, and
// one-shot events (a sonar ping, an ember binding, the flare) go through
// `stinger()`, which reads the *current chord* so a game event is heard as
// part of the score rather than as a sound effect over it.
//
// Voices, all synthesised — there are no audio assets to ship or decode:
//
//   pad   4 sawtooth pairs, detuned, through one lowpass whose cutoff
//         breathes on a slow LFO. Holds the harmony. At a low cutoff with a
//         bare-fifth voicing it reads as a drone; opened up with a full
//         voicing it's the warm 80s bed the whole story sits on.
//   bass  one sine per bar, two octaves under the chord root, slow attack —
//         the swell of water rather than a plucked bass note.
//   arp   short triangle plucks on a 16th grid, pattern per cue. The
//         "distant arcade attract mode" element, and the one that carries
//         most of the sense of pace.
//   bell  sparse high sine with a long decay, mostly heard through the
//         delay. This is the signal itself, musically.
//   surf  looped noise through a lowpass, swelling and opening every few
//         seconds like a wave breaking. Present in nearly every cue; it's
//         what ties an entirely synthetic score to a coast.
//
// Everything runs into a feedback delay (a cheap, warm substitute for a
// reverb impulse we'd otherwise have to ship) and then a compressor, so that
// stacking a stinger on top of a full cue can't clip.

/** Which voice a cue is setting a level for. */
export type LayerName = 'pad' | 'bass' | 'arp' | 'bell' | 'surf';

/**
 * One named mix — the musical state of a single story beat. Chapters keep a
 * table of these next to their cart and hand them to `score.cue()`.
 */
export interface Cue {
  /** Identifies the cue in logs and lets `cue()` no-op on a repeat. */
  name: string;
  /** Target tempo. Eased toward rather than snapped, so beats can accelerate. */
  bpm: number;
  /** Progression, as absolute MIDI note numbers. Advances every `barsPerChord`. */
  chords: number[][];
  /** Per-voice gain, 0..1. Anything omitted fades to silence. */
  levels: Partial<Record<LayerName, number>>;
  /** Pad lowpass cutoff in Hz — the single strongest lever on the mood. */
  padCutoff: number;
  /**
   * Arpeggio pattern over a 16th-note grid, tiled to fill a bar. Entries are
   * indices into the current chord; indices past the end wrap and lift an
   * octave (see `chordTone`), so `[0,1,2,3]` is a rising arpeggio that keeps
   * climbing. `null` is a rest.
   */
  arp?: (number | null)[];
  /** Octaves to lift the whole arpeggio by. Default 1. */
  arpOctave?: number;
  /** Probability, per bar, of a bell landing. Default 0. */
  bellChance?: number;
  /** Octaves above the chord for bells. Default 2. */
  bellOctave?: number;
  /** Seconds between surf swells. Default 7. */
  swell?: number;
  /** Bars each chord is held for. Default 1. */
  barsPerChord?: number;
}

export type StingerName = 'ping' | 'chime' | 'spark' | 'thump' | 'swell' | 'shimmer';

interface StingerOptions {
  /**
   * Which chord tone to build the stinger from — wraps and lifts octaves, so
   * a caller can just pass an ever-increasing counter (Chapter Two hands it
   * the number of embers gathered) and get a rising line for free.
   */
  degree?: number;
  /** Scales the stinger's level. Default 1. */
  gain?: number;
}

const LOOKAHEAD = 0.35; // seconds of notes kept scheduled ahead of the clock
const STEPS_PER_BAR = 16; // 16th notes
const PAD_VOICES = 4;
const MIN_GAIN = 0.0001; // exponentialRamp can never reach zero

const LAYER_NAMES: LayerName[] = ['pad', 'bass', 'arp', 'bell', 'surf'];

// How much of each voice is fed to the delay. Bells are almost entirely wet —
// that long tail is what makes a single high note read as "distance" rather
// than as a beep — while bass stays completely dry so the low end doesn't
// smear.
const SEND_AMOUNT: Record<LayerName, number> = {
  pad: 0.16,
  bass: 0,
  arp: 0.34,
  bell: 0.62,
  surf: 0.1,
};

function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Read chord tone `index`, wrapping past the end of the voicing and lifting an
 * octave each time round. Lets patterns and stingers address "the 7th note of
 * this chord" without every cue having to spell out extended voicings.
 */
function chordTone(chord: number[], index: number): number {
  const len = chord.length;
  if (len === 0) return 60;
  const wrapped = ((index % len) + len) % len;
  const octave = Math.floor(index / len);
  return chord[wrapped]! + octave * 12;
}

interface Layer {
  out: GainNode;
  send: GainNode;
}

interface ToneOptions {
  freq: number;
  time: number;
  duration: number;
  gain: number;
  wave?: OscillatorType;
  attack?: number;
  /** Frequency to glide to across the note — a sweep, in Hz. */
  sweepTo?: number;
  /** Extra delay send for this one note, on top of its layer's. */
  send?: number;
  pan?: number;
  /** Where the note goes. Defaults to the dry bus. */
  destination?: AudioNode;
}

class Score {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private dry: GainNode | null = null;
  private delayIn: GainNode | null = null;

  private layers: Partial<Record<LayerName, Layer>> = {};
  private padVoices: OscillatorNode[][] = [];
  private padFilter: BiquadFilterNode | null = null;
  private surfFilter: BiquadFilterNode | null = null;
  private surfSwell: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private current: Cue | null = null;
  private bpm = 72;
  private targetBpm = 72;
  private nextStepTime = 0;
  private step = 0;
  private barCount = -1;
  private lastChordIndex = 0;
  private swellTimer = 0;
  private intensity = 1;
  private running = false;
  /** The level to return to when unmuted — `setVolume` sets this, mute doesn't. */
  private baseVolume = 0.6;
  private muted = false;
  private rand: () => number = Math.random;

  /**
   * Bring the score up. Safe to call from a cart's `init()`: the viewer's
   * boot already resumed a context during the visitor's tap, so the origin is
   * unlocked by now.
   *
   * Any score left running by a previous cart is stopped first. That matters
   * because Nova64's `loadCart()` swaps chapters without reloading the page —
   * the old chapter's module (and its still-sounding oscillators) would
   * otherwise stay alive with nothing left to call `update()` on it.
   */
  start(seedRand?: () => number): void {
    const registry = globalThis as { __coastalSignalScore?: Score };
    if (registry.__coastalSignalScore && registry.__coastalSignalScore !== this) {
      registry.__coastalSignalScore.stop();
    }
    registry.__coastalSignalScore = this;
    if (seedRand) this.rand = seedRand;
    if (this.running) return;

    const AudioCtor = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext;
    const Fallback = (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const Ctor = AudioCtor ?? Fallback;
    if (!Ctor) return; // no Web Audio — the chapter still plays, just silent

    let ctx: AudioContext;
    try {
      ctx = new Ctor();
    } catch {
      return;
    }
    this.ctx = ctx;
    void ctx.resume?.();
    this.muted = (globalThis as { __coastalSignalMuted?: boolean }).__coastalSignalMuted === true;
    this.build(ctx);
    this.running = true;
    this.nextStepTime = ctx.currentTime + 0.1;
    this.step = 0;
    this.barCount = -1;
  }

  /** Fade out and release the audio hardware. */
  stop(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.running = false;
    const registry = globalThis as { __coastalSignalScore?: Score };
    if (registry.__coastalSignalScore === this) delete registry.__coastalSignalScore;
    try {
      const now = ctx.currentTime;
      this.master?.gain.cancelScheduledValues(now);
      this.master?.gain.setValueAtTime(this.master.gain.value, now);
      this.master?.gain.linearRampToValueAtTime(0, now + 0.35);
    } catch {
      // A context already closed by a page teardown — nothing to fade.
    }
    const closing = ctx;
    this.ctx = null;
    this.current = null;
    this.padVoices = [];
    this.layers = {};
    setTimeout(() => {
      void closing.close?.().catch(() => {});
    }, 450);
  }

  /**
   * Ride the master down to silence over `seconds` without tearing anything
   * else down. The shell calls this through the global registry as a screen
   * transition starts closing, so the music is already gone by the time the
   * cart is unmounted — otherwise it plays at full level behind the wipe and
   * then stops dead, which reads as a bug rather than as an ending.
   */
  fadeOut(seconds = 0.5): void {
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(MIN_GAIN, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(MIN_GAIN, now + Math.max(0.05, seconds));
  }

  /** Master level, 0..1. Remembered across a mute/unmute. */
  setVolume(v: number): void {
    this.baseVolume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }

  /**
   * Silence without stopping. The viewer's audio toggle drives this through
   * the global registry; the preference itself lives on `globalThis` so that
   * a cart loaded *after* the visitor muted comes up silent too, rather than
   * blaring for the moment between its start() and the toggle re-applying.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    (globalThis as { __coastalSignalMuted?: boolean }).__coastalSignalMuted = muted;
    this.applyVolume();
  }

  private applyVolume(): void {
    if (!this.master || !this.ctx) return;
    const target = this.muted ? 0 : this.baseVolume;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  /**
   * A continuous 0..1 "how far along is this beat" control, applied on top of
   * the active cue: it lifts the arpeggio and bell levels and opens the pad
   * filter. Chapter Two drives it from the number of embers gathered, so the
   * walk's music thickens as the player's flame grows without needing a
   * separate cue per pickup.
   */
  setIntensity(v: number): void {
    const next = Math.max(0, Math.min(1, v));
    // Carts drive this from a continuously-changing quantity (distance
    // travelled, embers gathered), so it arrives every frame. Re-ramping five
    // AudioParams sixty times a second for a change too small to hear is
    // pointless — only act once the move is actually audible.
    if (Math.abs(next - this.intensity) < 0.02) return;
    this.intensity = next;
    if (this.current) this.applyLevels(this.current, 1.2);
  }

  /** Crossfade to a new mix over `fade` seconds. Repeat calls with the same cue are ignored. */
  cue(next: Cue, fade = 1.6): void {
    if (!this.ctx || !this.running) return;
    if (this.current?.name === next.name) return;
    const now = this.ctx.currentTime;
    this.current = next;
    this.targetBpm = next.bpm;
    this.applyLevels(next, fade);
    this.padFilter?.frequency.setTargetAtTime(this.cutoff(next), now, Math.max(0.08, fade / 3));
    // Restart the progression from its first chord, and glide the pad there
    // now rather than waiting for the next bar — the harmonic move is part of
    // how a beat change reads, so it should be simultaneous with it.
    this.barCount = -1;
    this.lastChordIndex = 0;
    this.applyChord(0, now, Math.max(0.25, fade * 0.4));
    this.swellTimer = Math.min(this.swellTimer, 1.2);
  }

  /**
   * Advance the scheduler. Call once per frame from the cart's `update()`.
   *
   * Deliberately driven by the render loop rather than by a `setInterval`:
   * a timer would outlive a cart that stopped being ticked, and would keep
   * the music playing over a backgrounded tab. Notes are scheduled against
   * `AudioContext.currentTime` (not the frame clock), so timing is sample-
   * accurate regardless of how uneven the frames are — the frames only decide
   * how far ahead we've scheduled.
   */
  update(dt: number): void {
    const ctx = this.ctx;
    const cue = this.current;
    if (!ctx || !cue || !this.running) return;

    // Ease rather than jump, so a beat change that also changes tempo reads
    // as the music accelerating into it.
    this.bpm += (this.targetBpm - this.bpm) * Math.min(1, dt / 1.5);

    const now = ctx.currentTime;
    // Resync after a stall. If the tab is backgrounded, or a chapter hitches
    // on a big allocation, `now` can overtake the scheduling cursor by
    // seconds — and the loop below would then schedule every missed step at a
    // time already in the past, which Web Audio renders as all of them firing
    // at once. Jump the cursor forward instead and drop the missed notes,
    // keeping the step/bar phase so the arpeggio and the progression resume
    // where they were rather than restarting mid-bar.
    if (this.nextStepTime < now) this.nextStepTime = now + 0.02;

    let guard = 0;
    while (this.nextStepTime < now + LOOKAHEAD && guard++ < 256) {
      this.scheduleStep(this.step, this.nextStepTime, cue);
      this.nextStepTime += 60 / this.bpm / 4;
      this.step = (this.step + 1) % STEPS_PER_BAR;
    }

    // Surf swells run on their own slow clock rather than on the bar grid —
    // waves shouldn't be in time with the music.
    this.swellTimer -= dt;
    if (this.swellTimer <= 0) {
      this.swellTimer = cue.swell ?? 7;
      if ((cue.levels.surf ?? 0) > 0.001) this.scheduleSwell(now);
    }
  }

  /**
   * Fire a one-shot over the top of the running cue. Pitched stingers read
   * the chord that's sounding right now, so they land inside the harmony
   * instead of across it.
   */
  stinger(name: StingerName, opts: StingerOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.running || !this.dry) return;
    const t = ctx.currentTime + 0.02;
    const g = opts.gain ?? 1;
    const chord = this.chordAt(this.lastChordIndex);
    const degree = opts.degree ?? 0;

    switch (name) {
      case 'ping': {
        // Sonar: a high, clean sine that sags slightly as it decays, thrown
        // hard into the delay so what you mostly hear is its return.
        const f = mtof(chordTone(chord, degree) + 24);
        this.tone({ freq: f, time: t, duration: 0.55, gain: 0.3 * g, wave: 'sine', sweepTo: f * 0.94, send: 0.85 });
        break;
      }
      case 'chime': {
        // Two octaves stacked an octave apart — the upper one quieter and
        // slightly later, which is what gives it a struck, bell-like body
        // rather than a plain tone.
        const base = chordTone(chord, degree) + 12;
        this.tone({ freq: mtof(base), time: t, duration: 1.5, gain: 0.26 * g, wave: 'triangle', send: 0.6, pan: -0.2 });
        this.tone({
          freq: mtof(base + 12),
          time: t + 0.015,
          duration: 1.1,
          gain: 0.14 * g,
          wave: 'sine',
          send: 0.7,
          pan: 0.25,
        });
        break;
      }
      case 'spark': {
        this.noise({ time: t, duration: 0.24, gain: 0.22 * g, from: 900, to: 5200, q: 3, send: 0.4 });
        this.tone({
          freq: mtof(chordTone(chord, degree) + 24),
          time: t,
          duration: 0.18,
          gain: 0.12 * g,
          wave: 'triangle',
          send: 0.3,
        });
        break;
      }
      case 'thump': {
        // Impact: a short sine drop plus a filtered click. Pitched to the
        // chord root so repeated hits during the ride stay musical.
        const root = mtof(chord[0]! - 12);
        this.tone({ freq: root, time: t, duration: 0.26, gain: 0.4 * g, wave: 'sine', sweepTo: root * 0.5 });
        this.noise({ time: t, duration: 0.09, gain: 0.16 * g, from: 400, to: 180, q: 1.2 });
        break;
      }
      case 'swell': {
        // The big one — for a climax. Noise opening upward under an octave
        // rise, long enough to feel like the whole mix is being lifted.
        this.noise({ time: t, duration: 2.4, gain: 0.3 * g, from: 200, to: 6500, q: 0.9, attack: 1.6, send: 0.5 });
        const base = mtof(chordTone(chord, degree));
        this.tone({
          freq: base,
          time: t,
          duration: 2.6,
          gain: 0.24 * g,
          wave: 'sawtooth',
          attack: 1.4,
          sweepTo: base * 2,
          send: 0.55,
        });
        break;
      }
      case 'shimmer': {
        // A quick flourish up the chord — used where a single note would be
        // too small for the moment but a full cue change too large.
        for (let i = 0; i < 4; i++) {
          this.tone({
            freq: mtof(chordTone(chord, degree + i) + 12),
            time: t + i * 0.055,
            duration: 0.9,
            gain: 0.18 * g,
            wave: 'triangle',
            send: 0.6,
            pan: -0.3 + i * 0.2,
          });
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------- internals

  private build(ctx: AudioContext): void {
    // Compressor last, so a stinger stacked on a full cue is glued rather
    // than clipped. Everything upstream can then be mixed for feel.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);

    const master = ctx.createGain();
    // Deliberately conservative. Web Audio has no makeup gain on its
    // compressor, so headroom has to be left rather than recovered, and a
    // score under a chapter should sit below the sfx channels (Nova64's own
    // master sits at 0.4) rather than compete with them. `setVolume()` is
    // there for a cart or a mix pass that wants more.
    master.gain.value = this.muted ? 0 : this.baseVolume;
    master.connect(comp);
    this.master = master;

    const dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(master);
    this.dry = dry;

    // Feedback delay standing in for a reverb — no impulse response to ship,
    // and its rhythmic tail suits an arcade score better than a real room
    // would anyway. The lowpass in the feedback path is what stops repeats
    // from turning brittle as they stack.
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.38;
    const fb = ctx.createGain();
    fb.gain.value = 0.42;
    const fbFilter = ctx.createBiquadFilter();
    fbFilter.type = 'lowpass';
    fbFilter.frequency.value = 2200;
    delay.connect(fbFilter);
    fbFilter.connect(fb);
    fb.connect(delay);

    const delayOut = ctx.createGain();
    delayOut.gain.value = 0.5;
    delay.connect(delayOut);
    delayOut.connect(master);

    const delayIn = ctx.createGain();
    delayIn.gain.value = 1;
    delayIn.connect(delay);
    this.delayIn = delayIn;

    for (const name of LAYER_NAMES) {
      const out = ctx.createGain();
      out.gain.value = 0;
      out.connect(dry);
      const send = ctx.createGain();
      send.gain.value = SEND_AMOUNT[name];
      out.connect(send);
      send.connect(delayIn);
      this.layers[name] = { out, send };
    }

    this.buildPad(ctx);
    this.buildSurf(ctx);
  }

  private buildPad(ctx: AudioContext): void {
    const padOut = this.layers.pad!.out;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.9;
    filter.connect(padOut);
    this.padFilter = filter;

    // A very slow cutoff LFO. Connecting a gain node to an AudioParam *adds*
    // to its scheduled value, so this rides on top of whatever cutoff the
    // active cue has ramped to rather than fighting it.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.055;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 180;
    lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);
    lfo.start();

    for (let i = 0; i < PAD_VOICES; i++) {
      const voiceGain = ctx.createGain();
      // Eight sawtooths sum here across the four voices — low per-voice, or
      // the pad alone eats the whole mix before anything else is added.
      voiceGain.gain.value = 0.11;
      const pan = ctx.createStereoPanner();
      pan.pan.value = (i / (PAD_VOICES - 1)) * 1.1 - 0.55;
      voiceGain.connect(pan);
      pan.connect(filter);

      // Two saws a few cents apart per chord tone. The slow beating between
      // them is the entire reason the pad sounds like an instrument and not
      // like an oscillator.
      const pair: OscillatorNode[] = [];
      for (const detune of [-7, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.detune.value = detune;
        osc.frequency.value = mtof(50 + i * 5);
        osc.connect(voiceGain);
        osc.start();
        pair.push(osc);
      }
      this.padVoices.push(pair);
    }
  }

  private buildSurf(ctx: AudioContext): void {
    const buffer = this.getNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.7;

    // Two gains in series, and the separation matters: `swell` carries the
    // per-wave envelope while the layer's own gain carries the cue crossfade.
    // Sharing one node would mean a cue change mid-wave stamping on the wave.
    const swell = ctx.createGain();
    swell.gain.value = 0.15;

    src.connect(filter);
    filter.connect(swell);
    swell.connect(this.layers.surf!.out);
    src.start();

    this.surfFilter = filter;
    this.surfSwell = swell;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = Math.floor(ctx.sampleRate * 3);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Lightly integrated white noise — a one-pole leak gives it a pinkish
    // tilt, which sits under a mix far better than flat white does.
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /** The cue's pad cutoff, opened by the intensity control. */
  private cutoff(cue: Cue): number {
    return cue.padCutoff * (1 + this.intensity * 0.45);
  }

  private applyLevels(cue: Cue, fade: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const tau = Math.max(0.05, fade / 3);
    for (const name of LAYER_NAMES) {
      const layer = this.layers[name];
      if (!layer) continue;
      let level = cue.levels[name] ?? 0;
      // The arpeggio and bells are what the intensity control is really for —
      // they're the voices that should thicken as a beat progresses, while
      // the pad and surf bed stays put underneath.
      if (name === 'arp' || name === 'bell') level *= 0.55 + this.intensity * 0.45;
      layer.out.gain.setTargetAtTime(level, now, tau);
    }
    this.padFilter?.frequency.setTargetAtTime(this.cutoff(cue), now, tau);
  }

  private chordAt(index: number): number[] {
    const cue = this.current;
    if (!cue || cue.chords.length === 0) return [57, 60, 64];
    return cue.chords[index % cue.chords.length]!;
  }

  private applyChord(index: number, time: number, glide: number): void {
    const chord = this.chordAt(index);
    for (let i = 0; i < this.padVoices.length; i++) {
      const freq = mtof(chordTone(chord, i));
      for (const osc of this.padVoices[i]!) {
        osc.frequency.setTargetAtTime(freq, time, Math.max(0.02, glide / 3));
      }
    }
  }

  private scheduleStep(step: number, time: number, cue: Cue): void {
    if (step === 0) {
      this.barCount++;
      const barsPerChord = Math.max(1, cue.barsPerChord ?? 1);
      const index = Math.floor(this.barCount / barsPerChord) % Math.max(1, cue.chords.length);
      if (index !== this.lastChordIndex) {
        this.lastChordIndex = index;
        this.applyChord(index, time, 0.35);
      }
      this.scheduleBass(time, cue);
      const chance = (cue.bellChance ?? 0) * (0.4 + this.intensity * 0.6);
      if (chance > 0 && this.rand() < chance) this.scheduleBell(time, cue);
    }

    const pattern = cue.arp;
    if (!pattern || pattern.length === 0) return;
    if ((cue.levels.arp ?? 0) <= 0.001) return;
    const slot = pattern[step % pattern.length];
    if (slot === null || slot === undefined) return;

    const chord = this.chordAt(this.lastChordIndex);
    const note = chordTone(chord, slot) + 12 * (cue.arpOctave ?? 1);
    // Alternating pan across steps — a cheap, effective way to give a
    // monophonic arpeggio some width without a second voice.
    const pan = (step % 4) / 3 - 0.5;
    this.tone({
      freq: mtof(note),
      time,
      duration: 0.34,
      gain: 0.3,
      wave: 'triangle',
      pan: pan * 0.7,
      destination: this.layers.arp!.out,
    });
  }

  private scheduleBass(time: number, cue: Cue): void {
    if ((cue.levels.bass ?? 0) <= 0.001) return;
    const chord = this.chordAt(this.lastChordIndex);
    const beat = 60 / this.bpm;
    this.tone({
      freq: mtof(chord[0]! - 12),
      time,
      duration: beat * 3.4,
      gain: 0.5,
      wave: 'sine',
      attack: beat * 0.35, // slow enough to swell rather than pluck
      destination: this.layers.bass!.out,
    });
  }

  private scheduleBell(time: number, cue: Cue): void {
    const chord = this.chordAt(this.lastChordIndex);
    const degree = Math.floor(this.rand() * chord.length);
    const note = chordTone(chord, degree) + 12 * (cue.bellOctave ?? 2);
    this.tone({
      freq: mtof(note),
      time: time + this.rand() * 0.2,
      duration: 2.6,
      gain: 0.3,
      wave: 'sine',
      pan: this.rand() * 1.2 - 0.6,
      destination: this.layers.bell!.out,
    });
  }

  private scheduleSwell(now: number): void {
    const swell = this.surfSwell;
    const filter = this.surfFilter;
    if (!swell || !filter) return;
    // A wave: rises for about two seconds as the filter opens, breaks, then
    // draws back with the cutoff closing behind it.
    const rise = 1.9;
    const fall = 3.4;
    swell.gain.cancelScheduledValues(now);
    swell.gain.setValueAtTime(Math.max(MIN_GAIN, swell.gain.value), now);
    swell.gain.linearRampToValueAtTime(0.75, now + rise);
    swell.gain.exponentialRampToValueAtTime(0.12, now + rise + fall);

    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setValueAtTime(Math.max(80, filter.frequency.value), now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + rise);
    filter.frequency.exponentialRampToValueAtTime(420, now + rise + fall);
  }

  /**
   * One synthesised note. Nodes are created per note and stopped when it
   * ends — the browser reclaims them, and it keeps every voice's envelope
   * genuinely independent, which a fixed pool of oscillators would not.
   */
  private tone(opts: ToneOptions): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { freq, time, duration, gain } = opts;
    const attack = opts.attack ?? 0.006;

    const osc = ctx.createOscillator();
    osc.type = opts.wave ?? 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    if (opts.sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), time + duration);
    }

    const env = ctx.createGain();
    env.gain.setValueAtTime(MIN_GAIN, time);
    env.gain.linearRampToValueAtTime(gain, time + attack);
    env.gain.exponentialRampToValueAtTime(MIN_GAIN, time + duration);

    let node: AudioNode = env;
    if (opts.pan !== undefined) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, opts.pan));
      env.connect(pan);
      node = pan;
    }

    osc.connect(env);
    node.connect(opts.destination ?? this.dry!);
    if (opts.send && this.delayIn) {
      const send = ctx.createGain();
      send.gain.value = opts.send;
      node.connect(send);
      send.connect(this.delayIn);
    }

    osc.start(time);
    osc.stop(time + duration + 0.05);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }

  /** A filtered noise burst — impacts, sparks, and the rising climax swell. */
  private noise(opts: {
    time: number;
    duration: number;
    gain: number;
    from: number;
    to: number;
    q?: number;
    attack?: number;
    send?: number;
  }): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = opts.q ?? 1;
    filter.frequency.setValueAtTime(Math.max(20, opts.from), opts.time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), opts.time + opts.duration);

    const env = ctx.createGain();
    const attack = opts.attack ?? 0.005;
    env.gain.setValueAtTime(MIN_GAIN, opts.time);
    env.gain.linearRampToValueAtTime(opts.gain, opts.time + attack);
    env.gain.exponentialRampToValueAtTime(MIN_GAIN, opts.time + opts.duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.dry);
    if (opts.send && this.delayIn) {
      const send = ctx.createGain();
      send.gain.value = opts.send;
      env.connect(send);
      send.connect(this.delayIn);
    }

    src.start(opts.time);
    src.stop(opts.time + opts.duration + 0.05);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      env.disconnect();
    };
  }
}

/**
 * The one score for the running cart. Chapters call `score.start()` in
 * `init()`, `score.update(dt)` once per frame, `score.cue()` from `setBeat()`,
 * and `score.stinger()` on events.
 */
export const score = new Score();

/** Re-exported so chapter cue tables can spell notes readably. */
export { mtof, chordTone };
