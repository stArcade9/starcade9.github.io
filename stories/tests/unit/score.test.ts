// The score engine (content/audio/score.ts) can only really be judged by ear,
// but the parts of it that can silently break are all mechanical: where notes
// land on the clock, which chord tone a pattern index resolves to, and
// whether the AudioParam ramps it schedules are legal. Those are what this
// covers, against a recording stub of the Web Audio API.
//
// The two failures worth having a regression test for, specifically:
//   * scheduling a note at a time already in the past — Web Audio renders
//     every such note instantly, so one backgrounded tab turns a bar of
//     arpeggio into a single loud cluster;
//   * an exponential ramp to zero, which throws and kills the whole voice.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { score, mtof, chordTone, type Cue } from '@/content/audio/score';

interface RampCall {
  kind: 'linear' | 'exponential' | 'target' | 'set';
  value: number;
  time: number;
}

class FakeParam {
  value = 0;
  calls: RampCall[] = [];
  setValueAtTime(v: number, t: number) {
    this.value = v;
    this.calls.push({ kind: 'set', value: v, time: t });
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.calls.push({ kind: 'linear', value: v, time: t });
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.calls.push({ kind: 'exponential', value: v, time: t });
  }
  setTargetAtTime(v: number, t: number) {
    this.calls.push({ kind: 'target', value: v, time: t });
  }
  cancelScheduledValues(_t: number) {}
}

interface StartedOsc {
  freq: number;
  time: number;
  type: string;
}

class FakeContext {
  currentTime = 0;
  sampleRate = 48000;
  destination = { connect() {}, disconnect() {} };
  startedOscillators: StartedOsc[] = [];
  startedSources: number[] = [];
  allParams: FakeParam[] = [];
  closed = false;

  private param(): FakeParam {
    const p = new FakeParam();
    this.allParams.push(p);
    return p;
  }
  private node(extra: Record<string, unknown> = {}) {
    return { connect: () => {}, disconnect: () => {}, ...extra };
  }
  createGain() {
    return this.node({ gain: this.param() });
  }
  createStereoPanner() {
    return this.node({ pan: this.param() });
  }
  createBiquadFilter() {
    return this.node({ type: 'lowpass', frequency: this.param(), Q: this.param() });
  }
  createDelay() {
    return this.node({ delayTime: this.param() });
  }
  createDynamicsCompressor() {
    return this.node({
      threshold: this.param(),
      knee: this.param(),
      ratio: this.param(),
      attack: this.param(),
      release: this.param(),
    });
  }
  createOscillator() {
    const ctx = this;
    const freq = this.param();
    const osc = {
      type: 'sine',
      frequency: freq,
      detune: this.param(),
      onended: null as (() => void) | null,
      connect: () => {},
      disconnect: () => {},
      start(t: number) {
        ctx.startedOscillators.push({ freq: freq.value, time: t, type: osc.type });
      },
      stop(_t: number) {},
    };
    return osc;
  }
  createBufferSource() {
    const ctx = this;
    return this.node({
      buffer: null,
      loop: false,
      onended: null,
      start(t: number) {
        ctx.startedSources.push(t);
      },
      stop(_t: number) {},
    });
  }
  createBuffer(_channels: number, length: number, _rate: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

const TEST_CUE: Cue = {
  name: 'test',
  bpm: 96,
  chords: [
    [45, 57, 60, 64],
    [41, 57, 60, 65],
  ],
  levels: { pad: 0.4, bass: 0.5, arp: 0.45, surf: 0.2, bell: 0.3 },
  padCutoff: 2000,
  arp: [0, null, 2, null, 1, null, 3, null],
  bellChance: 1, // deterministic: a bell every bar
  swell: 3,
};

let ctx: FakeContext;

/** Run `seconds` of frames at `dt`, advancing the fake audio clock with them. */
function run(seconds: number, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) {
    ctx.currentTime += dt;
    score.update(dt);
  }
}

beforeEach(() => {
  ctx = new FakeContext();
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = function () {
    return ctx;
  };
  score.start(() => 0.5);
});

afterEach(() => {
  score.stop();
});

describe('note maths', () => {
  it('converts MIDI to frequency at the standard reference', () => {
    expect(mtof(69)).toBeCloseTo(440, 6);
    expect(mtof(57)).toBeCloseTo(220, 6);
    expect(mtof(81)).toBeCloseTo(880, 6);
  });

  it('wraps chord tones past the end of a voicing up an octave', () => {
    const chord = [45, 57, 60, 64];
    expect(chordTone(chord, 0)).toBe(45);
    expect(chordTone(chord, 3)).toBe(64);
    // This wrap is what lets Chapter Two hand `stinger` an ever-increasing
    // ember count and get a rising line instead of a repeating one.
    expect(chordTone(chord, 4)).toBe(45 + 12);
    expect(chordTone(chord, 7)).toBe(64 + 12);
    expect(chordTone(chord, 8)).toBe(45 + 24);
  });
});

describe('the scheduler', () => {
  it('builds the sustained voices once and starts them', () => {
    // 4 pad voices x 2 detuned oscillators, plus the cutoff LFO.
    expect(ctx.startedOscillators.length).toBe(9);
    // The looping surf noise source.
    expect(ctx.startedSources.length).toBe(1);
  });

  it('never schedules a note in the past, even across a long stall', () => {
    score.cue(TEST_CUE, 0.2);
    run(2);

    const before = ctx.startedOscillators.length;
    // A two-second hitch: the audio clock jumps but only one frame is
    // delivered. Without the resync this schedules a whole bar of arpeggio
    // at times already gone, and Web Audio fires all of it at once.
    ctx.currentTime += 2;
    score.update(1 / 60);
    const burst = ctx.startedOscillators.length - before;
    expect(burst).toBeLessThan(8);

    run(1);
    for (const osc of ctx.startedOscillators) {
      expect(Number.isFinite(osc.freq)).toBe(true);
      expect(osc.freq).toBeGreaterThan(0);
    }
  });

  it('lays the arpeggio out on a rising, non-repeating grid', () => {
    score.cue(TEST_CUE, 0.2);
    const before = ctx.startedOscillators.length;
    run(4);
    // The arpeggio is the only triangle voice; bass and bells are sines, and
    // bells are deliberately nudged off the grid by a random offset within
    // the bar, so they'd be out of order here by design.
    const notes = ctx.startedOscillators.slice(before).filter((n) => n.type === 'triangle');
    expect(notes.length).toBeGreaterThan(10);

    const times = notes.map((n) => n.time);
    for (let i = 1; i < times.length; i++) {
      // Strictly increasing, and never two notes on the same instant — a step
      // that repeats or goes backwards means the bar phase is corrupted.
      expect(times[i]!).toBeGreaterThan(times[i - 1]!);
      // Four rests to a bar in this pattern, so the tightest legal spacing is
      // two 16ths: about 0.3s at 96bpm, and wider while the tempo is still
      // easing up to it from the engine's starting 72.
      expect(times[i]! - times[i - 1]!).toBeGreaterThan(0.15);
    }
    expect(Math.min(...times)).toBeGreaterThan(0);
  });

  it('advances the progression, so more than one chord is heard', () => {
    score.cue(TEST_CUE, 0.2);
    const before = ctx.startedOscillators.length;
    run(6);
    const notes = ctx.startedOscillators.slice(before);
    // The two test chords share A3 and C4 but differ at the root and top, so
    // a progression that never advances shows up as a smaller pitch set.
    const pitches = new Set(notes.map((n) => n.freq.toFixed(3)));
    expect(pitches.size).toBeGreaterThan(4);
  });

  it('crossfades layer levels to the values the cue asks for', () => {
    score.cue(TEST_CUE, 1);
    const targets = ctx.allParams.flatMap((p) => p.calls.filter((c) => c.kind === 'target').map((c) => c.value));
    for (const level of [0.4, 0.5, 0.2]) {
      expect(targets.some((v) => Math.abs(v - level) < 1e-9)).toBe(true);
    }
  });

  it('runs every stinger without an illegal ramp', () => {
    score.cue(TEST_CUE, 0.2);
    run(1);
    for (const name of ['ping', 'chime', 'spark', 'thump', 'swell', 'shimmer'] as const) {
      score.stinger(name, { degree: 5, gain: 0.8 });
    }
    // exponentialRampToValueAtTime throws on a zero or negative target, which
    // would take out the voice mid-note.
    for (const param of ctx.allParams) {
      for (const call of param.calls) {
        if (call.kind === 'exponential') expect(call.value).toBeGreaterThan(0);
        expect(Number.isFinite(call.value)).toBe(true);
        expect(Number.isFinite(call.time)).toBe(true);
      }
    }
  });

  it('is inert before start and after stop', () => {
    score.stop();
    const before = ctx.startedOscillators.length;
    score.cue(TEST_CUE, 0.2);
    run(2);
    score.stinger('chime');
    expect(ctx.startedOscillators.length).toBe(before);
  });

  it('hands over cleanly when a new cart starts its own score', () => {
    score.cue(TEST_CUE, 0.2);
    run(0.5);
    // Nova64's loadCart swaps chapters without a page reload, so the incoming
    // cart's start() has to silence the outgoing one — nothing else will.
    score.start();
    run(0.5);
    expect(ctx.closed).toBe(false); // same instance restarting is a no-op
  });
});
