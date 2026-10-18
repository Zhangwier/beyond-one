// _motif.ts — THE REACH, and the rules that keep it meaning one thing.
//
// The film has exactly one figure: a single continuous ink stroke that starts somewhere
// and ends somewhere else. Every plate uses it, and no plate uses two of them.
//
// The numbers:
//   from / to      where the person is and where the work is
//   bow            how the stroke bends on its way (a straight line means no thought)
//   err            high-frequency error in the path — the plate's own difficulty
//   loopA / loopB  one or two returning loops at the ends (a loop = a mark turning on itself)
//   grew           how much of the stroke exists (0..1), always revealed in stroke order
//   th            half width at the origin
//   dry            bristle breakup along the length
//
// What it means, plate by plate, is the whole film; the geometry never changes meaning
// inside a plate.
import { W, H, lerp, clamp, rng, hash } from '../engine/core.ts';
import type { Stroke } from '../engine/brush.ts';
import { type PW, pt, curve, slice, lengthOf } from './_lib.ts';

export type Reach = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  bow: number;          // normal offset at the midpoint, px
  bow2?: number;        // secondary bow (a second harmonic), px
  err?: number;         // path error amplitude, px
  th?: number;          // half width at the origin
  taper?: number;       // width falloff 0..1
  dry?: number;
  grew?: number;        // 0..1 of the stroke that exists
  loops?: { at: number; r: number; dir: 1 | -1; sweep?: number }[]; // u along stroke
  seed?: number;
  opacity?: number;
  /** draw only u in [a,b] */
  window?: [number, number];
};

export function reachPts(r: Reach, steps = 220): PW[] {
  const from = r.from, to = r.to;
  const dx = to.x - from.x, dy = to.y - from.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const err = r.err ?? 0;
  const seed = r.seed ?? 1;
  const out: PW[] = [];
  const th = r.th ?? 2.2;
  const taper = r.taper ?? 0.5;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const bow = (r.bow ?? 0) * Math.sin(u * Math.PI) + (r.bow2 ?? 0) * Math.sin(u * Math.PI * 2);
    const e = err * Math.sin(u * Math.PI) * (Math.sin(u * 23 + seed) * 0.62 + Math.sin(u * 61 + seed * 2.3) * 0.38);
    out.push({
      x: from.x + dx * u + nx * (bow + e),
      y: from.y + dy * u + ny * (bow + e),
      w: Math.max(0.3, th * (1 - taper * u)),
    });
  }
  // returning loops are spliced in at the given u, tangentially, as one continuous mark
  if (r.loops?.length) {
    for (const lp of r.loops) {
      const idx = Math.round(clamp(lp.at, 0, 1) * steps);
      const p = out[idx];
      const p1 = out[Math.max(0, idx - 2)], p2 = out[Math.min(steps, idx + 2)];
      let tx = p2.x - p1.x, ty = p2.y - p1.y;
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      // centre of the loop lies to one side of the tangent
      const cx = p.x - ty * lp.r * lp.dir, cy = p.y + tx * lp.r * lp.dir;
      const a0 = Math.atan2(p.y - cy, p.x - cx);
      const sweep = lp.sweep ?? Math.PI * 1.75;
      const n = 48;
      const loop: PW[] = [];
      for (let k = 1; k <= n; k++) {
        const a = a0 + (sweep * lp.dir * k) / n;
        loop.push({ x: cx + Math.cos(a) * lp.r, y: cy + Math.sin(a) * lp.r, w: p.w * (1 - 0.35 * (k / n)) });
      }
      out.splice(idx + 1, 0, ...loop);
    }
  }
  return out;
}

/** the mark, revealed to `grew`, optionally windowed */
export function reach(r: Reach): Stroke {
  const pts = reachPts(r, 200);
  let d = pts;
  if (r.window) d = slice(pts, r.window[0], r.window[1]);
  const grew = clamp(r.grew ?? 1);
  if (grew < 1) {
    // reveal along the drawn length, not along the parameter: a pen moves at a rate
    const L = lengthOf(d);
    let acc = 0;
    const cut: PW[] = [];
    const target = L * grew;
    for (let i = 0; i < d.length; i++) {
      if (i > 0) acc += Math.hypot(d[i].x - d[i - 1].x, d[i].y - d[i - 1].y);
      if (acc > target) break;
      cut.push(d[i]);
    }
    d = cut;
  }
  return { pts: d, dry: r.dry ?? 0.22, seed: r.seed ?? 1.7, opacity: r.opacity ?? 1 };
}

/** a handwritten tick, used wherever the film counts something */
export function tick(x: number, y: number, len = 9, ang = -1.25, w = 1.0): PW[] {
  return [
    { x, y, w },
    { x: x + Math.cos(ang) * len, y: y + Math.sin(ang) * len, w: w * 0.6 },
  ];
}

/**
 * One petal of the film's wheel: a stroke that leaves the centre, sweeps out to a tip, turns
 * on itself at the tip, and comes home on a *different* curve. The two curves are quadratics
 * with control points pulled to either side, so the petal is a lens with a pointed tip: it
 * reads as one gesture made with a pen, and the gap between the way out and the way back is
 * the argument (the way back is never the way out).
 *
 * Returned as one continuous polyline (the tip loop is spliced in), so the brush never draws
 * a chord across the shape.
 */
export function petal(R: number, spread: number, rot = 0, opts: { width?: number; steps?: number } = {}): PW[] {
  const width = opts.width ?? 0.26;
  const N = opts.steps ?? 58;
  const chain: PW[] = [];
  const q = (p0: P, c: P, p1: P, t: number): P => {
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  };
  const base: P = { x: 0, y: 0 };
  const axis = -Math.PI / 2 + spread * 0.0;
  const tip: P = { x: Math.cos(axis) * R, y: Math.sin(axis) * R };
  // perpendicular at the waist, which is half-way out along the petal's own axis
  const waist: P = { x: tip.x * 0.5, y: tip.y * 0.5 };
  const px = Math.cos(axis + Math.PI / 2), py = Math.sin(axis + Math.PI / 2);
  const halfW = R * width;
  const c1: P = { x: waist.x + px * halfW, y: waist.y + py * halfW };
  const c2: P = { x: waist.x - px * halfW * 0.82, y: waist.y - py * halfW * 0.82 };
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = q(base, c1, tip, t);
    chain.push({ x: p.x, y: p.y, w: Math.max(0.42, 2.05 * (1 - 0.4 * t)) });
  }
  // the turn at the tip: a small loop tangent to the arrival (the pen turning, not a hole)
  {
    const lr = 7.5;
    const prev = chain[chain.length - 2];
    const dir = Math.atan2(tip.y - prev.y, tip.x - prev.x);
    const cx = tip.x + Math.cos(dir - Math.PI / 2) * lr;
    const cy = tip.y + Math.sin(dir - Math.PI / 2) * lr;
    for (let i = 1; i <= 24; i++) {
      const a = (dir - Math.PI / 2) + Math.PI + (i / 24) * Math.PI * 2 * 0.9;
      chain.push({ x: cx + Math.cos(a) * lr, y: cy + Math.sin(a) * lr, w: 0.55 });
    }
  }
  // home along the other side
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = q(tip, c2, base, t);
    chain.push({ x: p.x, y: p.y, w: Math.max(0.34, 1.15 * (1 - 0.5 * t)) });
  }
  const cs = Math.cos(rot), sn = Math.sin(rot);
  return chain.map((p) => ({ x: p.x * cs - p.y * sn, y: p.x * sn + p.y * cs, w: p.w }));
}


/** four ticks and a crossbar: the fifth stroke closes the group */
export function tallyMarks(n: number, x: number, y: number, gap = 9, len = 13): PW[][] {
  const groups = Math.floor(n / 5), rest = n % 5;
  const out: PW[][] = [];
  for (let g = 0; g < groups; g++) {
    const gx = x + g * gap * 6;
    for (let i = 0; i < 4; i++) out.push(tick(gx + i * gap, y, len, -1.32 + i * 0.02, 1.0));
    out.push([{ x: gx - 4, y: y + 3, w: 0.9 }, { x: gx + gap * 4 - 2, y: y - 1, w: 0.9 }]);
  }
  for (let i = 0; i < rest; i++) out.push(tick(x + groups * gap * 6 + i * gap, y, len, -1.32, 1.0));
  return out;
}
