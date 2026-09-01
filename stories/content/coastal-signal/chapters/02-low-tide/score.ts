// Coastal Signal — Chapter 02: the score
//
// Picks up where Chapter One's climax left off — same C/F major world — but
// slower and warmer throughout. Chapter One is a ride; this is a walk, and
// the tempi, the spacing of the arpeggio, and the fact that the surf sits
// louder in nearly every cue are all there to keep it at that pace.
//
// Two things here are driven by the mechanic rather than by the beat clock:
//
//  * `setIntensity(kindled / EMBER_COUNT)` opens the pad and thickens the
//    arpeggio as embers are gathered, so the walk's music grows with the
//    flame the player is carrying instead of looping until the beat ends.
//  * each bind fires `stinger('chime', { degree: kindled })`. Degrees past
//    the end of the voicing wrap and lift an octave (see `chordTone`), so
//    eight embers play a line that climbs a full two octaves through the
//    chord that happens to be sounding — always in key, never the same note
//    twice, and it is the collection sound *and* a melody at once.
//
// The `spirit` cue is the one deliberate hole in the score: the arpeggio
// stops dead, the tempo nearly halves, and the pad drops to two very wide
// slow chords. Six captions of the longest writing in the story play over it,
// and anything with a pulse would fight them.
import type { Cue } from '../../../audio/score';

// C  C3 G3 C4 E4  |  G  G2 G3 B3 D4  |  Am  A2 A3 C4 E4  |  F6/9  F2 A3 C4 G4
const C = [48, 55, 60, 64];
const G = [43, 55, 59, 62];
const Am = [45, 57, 60, 64];
// The Lydian-tinged F — a 9th instead of the root on top. Most of this
// chapter's warmth comes from this one voicing.
const F9 = [41, 57, 60, 67];

/** Spacious enough to walk to — one note per beat, with a gap. */
const ARP_WALK = [0, null, null, 2, null, 1, null, null];
/** The flare: continuous, climbing, and an octave higher. */
const ARP_FLARE = [0, 2, 4, 2, 1, 3, 5, 3];

export const CUES = {
  // prologue1 — under the water, holding it for a second. Bare fifths again,
  // as Chapter One opened, but rooted on G rather than A so it reads as the
  // same idea in a new place rather than a reprise.
  undertow: {
    name: 'undertow',
    bpm: 50,
    chords: [[43, 50, 55, 62]],
    levels: { pad: 0.32, surf: 0.4 },
    padCutoff: 330,
    swell: 7,
  },

  // prologue2 — long enough for the tide to notice. A sixth appears in the
  // voicing and the first bells with it.
  remember: {
    name: 'remember',
    bpm: 52,
    chords: [
      [43, 50, 55, 62],
      [43, 50, 55, 64],
    ],
    levels: { pad: 0.36, surf: 0.38, bell: 0.45 },
    padCutoff: 460,
    bellChance: 0.45,
    swell: 7,
    barsPerChord: 2,
  },

  // prologue3 — it left pieces of itself behind. The only minor cue in the
  // chapter, and it lasts one beat.
  pieces: {
    name: 'pieces',
    bpm: 54,
    chords: [Am, F9],
    levels: { pad: 0.42, surf: 0.32, bell: 0.5 },
    padCutoff: 700,
    bellChance: 0.55,
    swell: 6.5,
    barsPerChord: 2,
  },

  // prologue4 — the shore remembers too, and the ambient light comes up on
  // the beach. Resolves to major and the bass arrives underneath.
  shore: {
    name: 'shore',
    bpm: 58,
    chords: [F9, C, G],
    levels: { pad: 0.46, bass: 0.42, surf: 0.3, bell: 0.4 },
    padCutoff: 1100,
    bellChance: 0.4,
    swell: 6.5,
  },

  // settle — the tide is out. Still no arpeggio: the walk should be the first
  // thing in the chapter that has a pulse.
  settle: {
    name: 'settle',
    bpm: 64,
    chords: [C, F9],
    levels: { pad: 0.48, bass: 0.44, surf: 0.32, bell: 0.35 },
    padCutoff: 1500,
    bellChance: 0.35,
    swell: 6,
    barsPerChord: 2,
  },

  // walk — the body of the chapter. Written to sit at its thinnest here and
  // be filled in by `setIntensity` as embers are gathered, so the mix at the
  // end of the shoreline is audibly not the mix at the start of it.
  walk: {
    name: 'walk',
    bpm: 74,
    chords: [C, G, Am, F9],
    levels: { pad: 0.42, bass: 0.48, arp: 0.4, surf: 0.24, bell: 0.35 },
    padCutoff: 1900,
    arp: ARP_WALK,
    arpOctave: 1,
    bellChance: 0.4,
    swell: 6,
  },

  // spirit — she comes out of the water. Nothing with a pulse: two wide
  // chords, four bars each, the sea louder than anything else, and a bell
  // roughly once a phrase. Everything here is in service of six captions.
  spirit: {
    name: 'spirit',
    bpm: 44,
    chords: [
      [36, 55, 60, 67],
      [41, 57, 60, 65],
    ],
    levels: { pad: 0.54, bass: 0.36, surf: 0.42, bell: 0.4 },
    padCutoff: 1000,
    bellChance: 0.5,
    bellOctave: 2,
    swell: 5.5,
    barsPerChord: 4,
  },

  // flare — sending it back up. The one cue in either chapter that runs the
  // arpeggio two octaves up: it should read as the light climbing.
  flare: {
    name: 'flare',
    bpm: 82,
    chords: [F9, C],
    levels: { pad: 0.58, bass: 0.5, arp: 0.5, surf: 0.2, bell: 0.75 },
    padCutoff: 4000,
    arp: ARP_FLARE,
    arpOctave: 2,
    bellChance: 0.9,
    swell: 5,
    barsPerChord: 2,
  },

  // closing — she slips back under. Everything drops away except the pad and
  // the sea, which is what the chapter opened on.
  closing: {
    name: 'closing',
    bpm: 60,
    chords: [C],
    levels: { pad: 0.4, surf: 0.36, bell: 0.4 },
    padCutoff: 1400,
    bellChance: 0.5,
    swell: 5,
  },
} satisfies Record<string, Cue>;
