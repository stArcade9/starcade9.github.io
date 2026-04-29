// runtime/audio.js
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.channels = 8;
    this.gains = [];
  }
  _ensure() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(ctx.destination);
    for (let i = 0; i < this.channels; i++) {
      const g = ctx.createGain();
      g.gain.value = 0.0;
      g.connect(this.master);
      this.gains.push(g);
    }
  }
  setVolume(v) {
    this._ensure();
    this.master.gain.value = Math.max(0, Math.min(1, v));
  }
  // sfx({ wave:'square'|'sine'|'sawtooth'|'triangle'|'noise', freq:Hz, dur:sec, vol:0..1, sweep:Hz/sec })
  sfx(opts = {}) {
    this._ensure();
    const ctx = this.ctx;
    const { wave = 'square', freq = 440, dur = 0.2, vol = 0.5, sweep = 0 } = opts;
    const g = this.gains[Math.floor(Math.random() * this.channels)];
    const now = ctx.currentTime;
    const v = Math.max(0, Math.min(1, vol));
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(v, now + 0.005);
    g.gain.linearRampToValueAtTime(0.0001, now + dur);

    if (wave === 'noise') {
      const bufferSize = 1 << 14;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(g);
      src.start(now);
      src.stop(now + dur);
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now);
    if (sweep !== 0)
      osc.frequency.linearRampToValueAtTime(Math.max(1, freq + sweep * dur), now + dur);
    osc.connect(g);
    osc.start(now);
    osc.stop(now + dur);
  }
}

export const audio = new AudioSystem();

// Named SFX presets — use sfx('jump'), sfx('coin'), sfx(0), or sfx({wave, freq, ...})
const SFX_PRESETS = {
  // Numeric shortcuts (backward compat)
  0: { wave: 'square', freq: 880, dur: 0.1, vol: 0.4 },
  1: { wave: 'sine', freq: 220, dur: 0.3, vol: 0.3, sweep: -100 },
  2: { wave: 'noise', dur: 0.2, vol: 0.3 },
  // Named presets
  jump: { wave: 'square', freq: 300, dur: 0.12, vol: 0.4, sweep: 200 },
  land: { wave: 'noise', dur: 0.08, vol: 0.3 },
  coin: { wave: 'sine', freq: 1046, dur: 0.15, vol: 0.5, sweep: 400 },
  powerup: { wave: 'sine', freq: 440, dur: 0.4, vol: 0.5, sweep: 880 },
  explosion: { wave: 'noise', dur: 0.4, vol: 0.8 },
  laser: { wave: 'square', freq: 1200, dur: 0.1, vol: 0.4, sweep: -800 },
  hit: { wave: 'square', freq: 200, dur: 0.15, vol: 0.5, sweep: -100 },
  death: { wave: 'sawtooth', freq: 440, dur: 0.6, vol: 0.5, sweep: -400 },
  select: { wave: 'sine', freq: 660, dur: 0.08, vol: 0.3 },
  confirm: { wave: 'sine', freq: 880, dur: 0.12, vol: 0.3, sweep: 220 },
  error: { wave: 'square', freq: 180, dur: 0.3, vol: 0.4, sweep: -30 },
  blip: { wave: 'square', freq: 440, dur: 0.06, vol: 0.3 },
};

export function audioApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        /**
         * Play a sound effect.
         * @param {number|string|object} idOrOpts - Preset id (0/1/2), preset name ('jump','coin',...), or options object
         * @param {object} [maybeOpts] - Extra options to merge when using a preset id/name
         */
        sfx: (idOrOpts, maybeOpts) => {
          if (typeof idOrOpts === 'number' || typeof idOrOpts === 'string') {
            const preset = SFX_PRESETS[idOrOpts];
            if (preset) {
              audio.sfx(Object.assign({}, preset, maybeOpts || {}));
            }
          } else {
            audio.sfx(idOrOpts || {});
          }
        },
        /**
         * Set master volume (0 = silent, 1 = full).
         * @param {number} v
         */
        setVolume: v => audio.setVolume(v),
      });
    },
  };
}
