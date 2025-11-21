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
    this.master.gain.value = 0.2;
    this.master.connect(ctx.destination);
    for (let i=0;i<this.channels;i++) {
      const g = ctx.createGain();
      g.gain.value = 0.0;
      g.connect(this.master);
      this.gains.push(g);
    }
  }
  // sfx({ wave:'square'|'sine'|'saw'|'noise', freq:Hz, dur:sec, vol:0..1, sweep:Hz/sec })
  sfx(opts={}) {
    this._ensure();
    const ctx = this.ctx;
    const {
      wave='square', freq=440, dur=0.2, vol=0.5, sweep=0
    } = opts;
    const g = this.gains[Math.floor(Math.random()*this.channels)];
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
      for (let i=0;i<bufferSize;i++) data[i] = Math.random()*2-1;
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
    if (sweep !== 0) osc.frequency.linearRampToValueAtTime(Math.max(1, freq + sweep*dur), now + dur);
    osc.connect(g);
    osc.start(now);
    osc.stop(now + dur);
  }
}

export const audio = new AudioSystem();

export function audioApi() {
  return {
    exposeTo(target) {
      Object.assign(target, { sfx: (idOrOpts, maybeOpts) => {
        // id-based presets (very minimal)
        const presets = {
          0: { wave:'square', freq:880, dur:0.1, vol:0.4 },
          1: { wave:'sine', freq:220, dur:0.3, vol:0.3, sweep: -100 },
          2: { wave:'noise', dur:0.2, vol:0.3 }
        };
        if (typeof idOrOpts === 'number') {
          audio.sfx(Object.assign({}, presets[idOrOpts]|{}, maybeOpts||{}));
        } else {
          audio.sfx(idOrOpts||{});
        }
      }});
    }
  };
}
