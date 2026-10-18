// motif.ts — the film's one moving figure.
//
// THE REACH is a single hand-drawn stroke that leaves the centre, bends, and ends in a
// fine open loop. It is always exactly one continuous mark, and the film never stacks a
// second one on top of it. Its state is a small set of numbers, and every chapter changes
// those numbers in a way that means something:
//
//   reach(t)   how far from the centre the mark has travelled (0 = a dot)
//   spread     how many derivative marks it has thrown off (always an integer)
//   loopR      radius of the terminal loop; 0 = a plain terminus, >0 = the mark turns back
//   wobble     high-frequency error in the path (the film's only "wrongness")
//
// What it means: the mark is one person's capacity. A dot at the centre is a mind with
// no room to move. Spread copies are help that came from outside. The loop is the moment
// the mark returns on itself — a human checking the machine's work.
import { clamp, lerp, sstep, hash, rng } from './engine/core.ts';
import type { Stroke } from './engine/brush.ts';

export type ReachState = {
  x: number; y: number;        // centre
  reach: number;               // px
  angle: number;               // base direction, radians
  bend: number;                // curvature
  loopR: number;               // terminal loop radius
  wobble: number;              // path error amplitude
  copies: number;              // number of derivative marks (integer)
  copySpread: number;          // angular spread of copies
  width: number;               // half width at the origin
  taper: number;               // width falloff along length
  dry: number;
  seed: number;
};

export const baseState = (t = 0): ReachState => ({
  x: 960, y: 540, reach: 0, angle: -Math.PI / 2, bend: 0, loopR: 0,
  wobble: 0, copies: 0, copySpread: 1.1, width: 2.4, taper: 0.35, dry: 0.2, seed: 1 + t * 0,
});

/**
 * Sample the reach as one polyline. `u` in 0..1 along the mark.
 * The endpoint is where the loop is drawn: the loop is part of the same stroke so a
 * partial `progress` reveals the loop last, like a pen lifting at the end of a word.
 */
export function reachPoints(s: ReachState, progress = 1, steps = 90, side = 0): { x: number; y: number; w: number }[] {
  const pts: { x: number; y: number; w: number }[] = [];
  const N = Math.max(2, Math.round(steps * clamp(progress, 0, 1)));
  const ang = s.angle + side * 0.0;
  const dirx = Math.cos(ang), diry = Math.sin(ang);
  const perpx = -diry, perpy = dirx;
  // length of the straight-ish part before the loop
  const L = Math.max(0.001, s.reach - s.loopR);
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * clamp(progress, 0, 1);
    // curvature: quadratic bend, normalised so both ends meet the loop
    const bend = s.bend * Math.sin(u * Math.PI) * L * 0.16;
    // wobble: deterministic multi-frequency error, zero at both ends
    const wob = s.wobble * Math.sin(u * Math.PI) *
      (Math.sin(u * 37 + s.seed) * 0.6 + Math.sin(u * 91 + s.seed * 3.1) * 0.4);
    let x = s.x + dirx * u * L + perpx * (bend + wob);
    let y = s.y + diry * u * L + perpy * (bend + wob);
    if (s.loopR > 0.5) {
      // the terminal loop: a full turn whose tangent matches the stroke direction at u=1
      const tail = Math.max(0, u - 1 + 0.0);
      const loopU = s.loopR > 0.5 ? clamp((u - 1) * 0, 0, 1) : 0;
    }
    const w = Math.max(0.35, s.width * (1 - u * s.taper));
    pts.push({ x, y, w });
  }
  // terminal loop, appended as its own arc so it can be revealed separately
  if (s.loopR > 0.5) {
    const loopP = clamp((progress - 0.82) / 0.18, 0, 1);
    if (loopP > 0) {
      const ex = s.x + dirx * L + perpx * 0;
      const ey = s.y + diry * L + perpy * 0;
      // circle tangent at the end: centre offset to one side
      const cx = ex + perpx * s.loopR, cy = ey + perpy * s.loopR;
      const a0 = Math.atan2(ey - cy, ex - cx);
      const n = Math.max(4, Math.round(26 * loopP));
      for (let i = 1; i <= n; i++) {
        const a = a0 + (i / n) * Math.PI * 2 * loopP;
        pts.push({
          x: cx + Math.cos(a) * s.loopR,
          y: cy + Math.sin(a) * s.loopR,
          w: Math.max(0.3, s.width * (1 - s.taper) * (1 - loopP * 0.55)),
        });
      }
    }
  }
  return pts;
}

/** The mark plus its helpers, as strokes ready for the brush. */
export function reachStrokes(s: ReachState, progress: number, opts: { copyAlpha?: number } = {}): Stroke[] {
  const out: Stroke[] = [];
  const n = Math.max(0, Math.floor(s.copies));
  for (let k = n; k >= 0; k--) {
    const spread = n === 0 ? 0 : s.copySpread * (k / Math.max(1, n) - 0.5) * 2;
    const st: ReachState = {
      ...s,
      angle: s.angle + spread,
      width: s.width * (k === 0 ? 1 : 0.62),
      loopR: s.loopR * (k === 0 ? 1 : 0.55),
      wobble: s.wobble * (k === 0 ? 1 : 1.4),
      seed: s.seed + k * 7.7,
    };
    out.push({
      pts: reachPoints(st, k === 0 ? progress : progress, 80 + k * 6, k),
      dry: s.dry + (k === 0 ? 0 : 0.18),
      seed: s.seed + k * 13.3,
      opacity: k === 0 ? 1 : 0.30 + 0.12 * (n - k),
    });
  }
  return out;
}

/** A deterministic charcoal "field" of short ticks — used as evidence of many small attempts. */
export function hatchField(n: number, x: number, y: number, w: number, h: number, seed = 3): Stroke[] {
  const r = rng(seed);
  const out: Stroke[] = [];
  for (let i = 0; i < n; i++) {
    const px = x + r() * w;
    const py = y + r() * h;
    const a = -0.9 + r() * 0.5;
    const len = 6 + r() * 18;
    out.push({
      pts: [
        { x: px, y: py, w: 0.9 },
        { x: px + Math.cos(a) * len, y: py + Math.sin(a) * len, w: 0.4 },
      ],
      dry: 0.5 + r() * 0.4,
      seed: 2 + i * 0.37,
      opacity: 0.5 + r() * 0.35,
    });
  }
  return out;
}
