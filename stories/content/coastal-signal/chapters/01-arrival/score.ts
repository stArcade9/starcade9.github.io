// Coastal Signal — Chapter 01: the score
//
// One cue per story beat, in the same order `setBeat()` runs them. The engine
// is in content/audio/score.ts; what lives here is only the composition, so
// re-scoring a beat never means touching the synth.
//
// Key: A minor for the whole cold open and ride — the cartridge is lost, and
// the ride is a search, not a victory lap. The prologue voices it as bare
// fifths with no third at all (`VOID`/`SPARK`), which is what makes those
// beats read as unresolved rather than sad; the third only arrives once the
// boardwalk lights do. The climax finally lifts the same material into F/C
// major, so catching the signal is heard as a resolution of something that
// has been hanging since the first bar rather than as a new tune.
//
// Chord voicings deliberately share tones between neighbours (A3 and C4 sit
// still across Am → F → C), so the pad's glide between them moves only one or
// two voices and the progression drifts rather than steps.
import type { Cue } from '../../../audio/score';

// Am  A2 A3 C4 E4   |   F  F2 A3 C4 F4   |   C  C3 G3 C4 E4   |   G  G2 G3 B3 D4
const Am = [45, 57, 60, 64];
const F = [41, 57, 60, 65];
const C = [48, 55, 60, 64];
const G = [43, 55, 59, 62];

/** Arpeggio patterns over a 16th grid, tiled to fill the bar. */
const ARP_SPARSE = [0, null, null, 2, null, null, 1, null];
const ARP_RIDE = [0, null, 2, null, 1, null, 3, null];
const ARP_CLIMB = [0, 2, 1, 3, 2, 4, 3, 5];
const ARP_URGENT = [0, 4, 2, 5, 1, 4, 3, 6];

export const CUES = {
  // prologue1 — the dark void. Almost nothing: a closed-down pad on an open
  // fifth, and the sea. Deliberately quiet enough that the first ping lands.
  void: {
    name: 'void',
    bpm: 52,
    chords: [[45, 52, 57, 64]],
    levels: { pad: 0.3, surf: 0.34 },
    padCutoff: 300,
    swell: 8,
  },

  // prologue2 — one spark. A minor sixth creeps into the voicing and the
  // bells start, sparsely; this is the cartridge's first sign of life.
  spark: {
    name: 'spark',
    bpm: 54,
    chords: [
      [45, 52, 57, 64],
      [45, 52, 57, 65],
    ],
    levels: { pad: 0.34, surf: 0.32, bell: 0.5 },
    padCutoff: 440,
    bellChance: 0.45,
    bellOctave: 2,
    swell: 7.5,
    barsPerChord: 2,
  },

  // prologue3 — fragments knocked loose and orbiting. Real harmonic motion
  // for the first time, and the pad opens enough to hear it move.
  scatter: {
    name: 'scatter',
    bpm: 58,
    chords: [Am, F],
    levels: { pad: 0.42, surf: 0.28, bell: 0.45 },
    padCutoff: 620,
    bellChance: 0.5,
    swell: 7,
    barsPerChord: 2,
  },

  // prologue4 — the boardwalk on the horizon. The bass enters under it, and
  // C major arrives: the first warm colour in the chapter, timed to the only
  // warm colour on screen.
  boardwalk: {
    name: 'boardwalk',
    bpm: 60,
    chords: [Am, F, C, G],
    levels: { pad: 0.46, bass: 0.4, surf: 0.24, bell: 0.4 },
    padCutoff: 900,
    bellChance: 0.4,
    swell: 7,
  },

  // prologue5 — it stabilises and powers on. The arpeggio starts sparse here
  // rather than at full stride, so the ride's own entry still has somewhere
  // to go.
  ignition: {
    name: 'ignition',
    bpm: 68,
    chords: [Am, F, C, G],
    levels: { pad: 0.46, bass: 0.46, arp: 0.3, surf: 0.2, bell: 0.35 },
    padCutoff: 1400,
    arp: ARP_SPARSE,
    arpOctave: 1,
    bellChance: 0.35,
    swell: 6.5,
  },

  // intro / ride — the theme. Everything in, tempo up to a real pace. The
  // cart raises `setIntensity` across the ride, which thickens the arpeggio
  // and opens the pad as the signal gets closer, so this one cue covers a lot
  // of ground without a cut.
  ride: {
    name: 'ride',
    bpm: 96,
    chords: [Am, F, C, G],
    levels: { pad: 0.4, bass: 0.5, arp: 0.42, surf: 0.16, bell: 0.3 },
    padCutoff: 2000,
    arp: ARP_RIDE,
    arpOctave: 1,
    bellChance: 0.3,
    swell: 6,
  },

  // rising — the signal is visible ahead. Same harmony rotated to start on F,
  // so it lifts without changing key, and the arpeggio goes continuous.
  rising: {
    name: 'rising',
    bpm: 104,
    chords: [F, C, G, Am],
    levels: { pad: 0.44, bass: 0.52, arp: 0.5, surf: 0.12, bell: 0.5 },
    padCutoff: 3000,
    arp: ARP_CLIMB,
    arpOctave: 1,
    bellChance: 0.6,
    swell: 6,
  },

  // ready — the last stretch. Filter wide open, arpeggio reaching higher up
  // the chord each step. The most harmonically unresolved cue in the chapter,
  // which is the point: it wants somewhere to land.
  ready: {
    name: 'ready',
    bpm: 110,
    chords: [F, G, Am, G],
    levels: { pad: 0.46, bass: 0.54, arp: 0.56, surf: 0.1, bell: 0.6 },
    padCutoff: 4200,
    arp: ARP_URGENT,
    arpOctave: 1,
    bellChance: 0.75,
    swell: 5,
  },

  // climax — caught. Tempo drops away, the arpeggio stops entirely, and the
  // whole thing opens onto wide F and C major voicings carried by bells. The
  // release of everything the ride was holding.
  climax: {
    name: 'climax',
    bpm: 76,
    chords: [
      [41, 60, 65, 69],
      [36, 55, 64, 67],
    ],
    levels: { pad: 0.6, bass: 0.5, surf: 0.2, bell: 0.7 },
    padCutoff: 3400,
    bellChance: 0.95,
    bellOctave: 2,
    swell: 5,
    barsPerChord: 2,
  },
} satisfies Record<string, Cue>;
