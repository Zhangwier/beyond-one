// _lib.ts — drawing primitives shared by the plates.
// Everything returns polylines in logical px; the brush turns them into ink.
import { clamp, lerp, rng, W, H } from '../engine/core.ts';
import type { Stroke } from '../engine/brush.ts';

export type P = { x: number; y: number };
export type PW = { x: number; y: number; w: number };

export const pt = (x: number, y: number, w = 2): PW => ({ x, y, w });

export function line(x0: number, y0: number, x1: number, y1: number, w = 1.4, n = 24, taper = 0): PW[] {
  const out: PW[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const ww = w * (1 - taper * u);
    out.push({ x: lerp(x0, x1, u), y: lerp(y0, y1, u), w: Math.max(0.28, ww) });
  }
  return out;
}

export function poly(pts: P[], w = 1.4, closed = false): PW[] {
  const list = closed ? [...pts, pts[0]] : pts;
  return list.map((p) => ({ x: p.x, y: p.y, w }));
}

export function arc(cx: number, cy: number, r: number, a0: number, a1: number, w = 1.4, n = 0, ry = 0): PW[] {
  const N = n || Math.max(8, Math.ceil(Math.abs(a1 - a0) * r * 0.5));
  const out: PW[] = [];
  for (let i = 0; i <= N; i++) {
    const a = lerp(a0, a1, i / N);
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * (ry || r), w });
  }
  return out;
}

export function circle(cx: number, cy: number, r: number, w = 1.4, n = 90, ry = 0, a0 = 0, a1 = Math.PI * 2): PW[] {
  return arc(cx, cy, r, a0, a1, w, n, ry);
}

/** a hand-drawn rectangle: four strokes with tiny overshoots at the corners */
export function rect(x: number, y: number, w: number, h: number, sw = 1.2, inset = 3): Stroke[] {
  return [
    { pts: line(x - inset, y, x + w + inset, y, sw, 40) },
    { pts: line(x + w, y - inset, x + w, y + h + inset, sw, 40) },
    { pts: line(x + w + inset, y + h, x - inset, y + h, sw, 40) },
    { pts: line(x, y + h + inset, x, y - inset, sw, 40) },
  ];
}

/** Catmull-Rom through control points, evenly sampled. */
export function curve(ctrl: P[], w = 1.6, per = 12): PW[] {
  if (ctrl.length < 2) return ctrl.map((p) => ({ ...p, w }));
  const P2 = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out: PW[] = [];
  for (let i = 1; i < P2.length - 2; i++) {
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const p0 = P2[i - 1], p1 = P2[i], p2 = P2[i + 1], p3 = P2[i + 2];
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        w,
      });
    }
  }
  out.push({ ...ctrl[ctrl.length - 1], w });
  return out;
}

/** Sub-polyline by arc-length fraction range [a,b]. */
export function slice(pts: PW[], a: number, b: number): PW[] {
  if (!pts.length) return [];
  const lens: number[] = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const L = lens[lens.length - 1];
  if (L < 1e-6) return [];
  const out: PW[] = [];
  const s0 = clamp(a) * L, s1 = clamp(b) * L;
  for (let i = 0; i < pts.length; i++) {
    if (lens[i] < s0 || lens[i] > s1) continue;
    out.push(pts[i]);
  }
  // exact endpoints
  const at = (s: number): PW => {
    let i = 1;
    while (i < lens.length && lens[i] < s) i++;
    const t = (s - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
    return { x: lerp(pts[i - 1].x, pts[i].x, t), y: lerp(pts[i - 1].y, pts[i].y, t), w: lerp(pts[i - 1].w, pts[i].w, t) };
  };
  if (s0 > 0) out.unshift(at(s0));
  if (s1 < L) out.push(at(s1));
  return out;
}

export function lengthOf(pts: PW[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

export function pointAt(pts: PW[], u: number): PW {
  const s = slice(pts, 0, clamp(u));
  return s.length ? s[s.length - 1] : pts[0];
}

/** Rotate/scale/translate a polyline about a pivot. */
export function xform(pts: PW[], o: { x?: number; y?: number; rot?: number; scale?: number; sx?: number; sy?: number; ox?: number; oy?: number }): PW[] {
  const { x = 0, y = 0, rot = 0, scale = 1, sx = scale, sy = scale, ox = 0, oy = 0 } = o;
  const c = Math.cos(rot), s = Math.sin(rot);
  return pts.map((p) => {
    const px = (p.x - x) * sx, py = (p.y - y) * sy;
    return { x: x + px * c - py * s + ox, y: y + px * s + py * c + oy, w: p.w * Math.sqrt(Math.abs(sx * sy)) };
  });
}

/** merge several polylines into one stroke (they keep their order) */
export function join(...parts: PW[][]): PW[] {
  const out: PW[] = [];
  for (const p of parts) for (const q of p) out.push(q);
  return out;
}

/** deterministic short strokes scattered along a band — "activity" without particles */
export function ticks(n: number, x: number, y: number, w: number, h: number, seed: number, o: { len?: number; alpha?: number; angle?: number } = {}): Stroke[] {
  const r = rng(seed);
  const out: Stroke[] = [];
  const len = o.len ?? 10;
  const ang = o.angle ?? -1.2;
  for (let i = 0; i < n; i++) {
    const px = x + r() * w, py = y + r() * h;
    const a = ang + (r() - 0.5) * 0.5;
    const L = len * (0.4 + r() * 0.8);
    out.push({
      pts: [pt(px, py, 0.9), pt(px + Math.cos(a) * L, py + Math.sin(a) * L, 0.35)],
      dry: 0.35 + r() * 0.45,
      seed: seed + i * 0.71,
      opacity: o.alpha ?? 0.6,
    });
  }
  return out;
}

// ---------------------------------------------------------------- 3D
export type V3 = { x: number; y: number; z: number };
export function project(p: V3, o: { cx: number; cy: number; fov: number; rx?: number; ry?: number; rz?: number }): P & { s: number } {
  const { cx, cy, fov, rx = 0, ry = 0, rz = 0 } = o;
  let { x, y, z } = p;
  // rotate about Y then X
  let c = Math.cos(ry), s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rx); s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(rz); s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  const d = fov / (fov + z);
  return { x: cx + x * d, y: cy + y * d, s: d };
}

export function poly3(pts: V3[], o: Parameters<typeof project>[1], w = 1.2): PW[] {
  return pts.map((p) => { const q = project(p, o); return { x: q.x, y: q.y, w: Math.max(0.3, w * q.s) }; });
}
