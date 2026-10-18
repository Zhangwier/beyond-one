// The score is the single source of truth for time. The synthesizer (scripts/synth.ts)
// writes the music FROM this file, and every scene reads its cue times FROM this file,
// so a visual hit and its sound are the same number, not an analysis that drifts.

export const BPM = 100;
export const BEAT = 60 / BPM; // 0.6 s
export const BAR = BEAT * 4; // 2.4 s
/** Song time of bar 0, beat 0. The 0.5 s before it is the opening brush swipe. */
export const T0 = 0.5;
export const BARS = 35;
export const DURATION = 88; // seconds, incl. the tail

/** Song time of bar b (fractional bars allowed: bar(3.5) = third bar, beat 3). */
export const bar = (b: number) => T0 + b * BAR;
/** Song time of absolute beat index. */
export const beat = (n: number) => T0 + n * BEAT;
/** Continuous beat index at time t. */
export const beatAt = (t: number) => (t - T0) / BEAT;
export const barAt = (t: number) => (t - T0) / BAR;

/** Sections, in bars. */
export const S = {
  prologue: [0, 4],
  complexity: [4, 10],
  connection: [10, 16],
  breakthrough: [16, 24],
  judgment: [24, 29],
  horizon: [29, 35],
} as const;

/** Named musical events (bars). Scenes and synth both read these. */
export const CUE = {
  open: 0, // first hit: the giant stroke
  reveal: 0.5, // zoom-out from the stroke to the field
  question: 4, // the question is typed
  domains: 5, // domains burst from the words (1 per beat, 6 beats)
  solo: 7, // the lone stroke tries to cover the map
  maxim1: 9, // 现实的问题，从不按学科出现
  invert: 10, // cut to ink: connection
  align: 13, // nodes fall into one path
  research: 16,
  code: 18,
  analysis: 20,
  create: 22,
  stop: 24, // tape stop: the error
  trace: 25,
  fix: 26.5, // the corrected limit slams down
  seal: 27.5,
  collapse: 29,
  climax: 31, // 大
  horizon: 32,
  line1: 33,
  line2: 34,
  title: 35,
} as const;

export const at = (c: keyof typeof CUE) => bar(CUE[c]);
