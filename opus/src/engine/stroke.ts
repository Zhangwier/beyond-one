// The film's motif is drawn, not typeset: 一 (héng), the single horizontal stroke —
// "one", and one person's reach — plus the two strokes of 人 (丿 piě and ㇏ nà), which
// the finale lays across it to write 大. Drawn procedurally in a Song-typeface idiom
// so 一 can stretch to any length while keeping its entry cut and its end serif.
import type { C } from './env';
import { clamp, lerp } from './util';

/**
 * Song-style 一 from x0 to x1 on baseline y, stem thickness h.
 * `serif` 0..1 grows the triangular end ornament (0 = plain bar).
 */
export function hengPath(c: C, x0: number, x1: number, y: number, h: number, serif = 1) {
  const len = Math.max(0, x1 - x0);
  const sh = Math.min(h * 2.4, len * 0.35) * serif; // serif width
  const st = h * 1.9 * serif; // serif height above the stem
  c.beginPath();
  c.moveTo(x0, y + h * 0.5);
  c.lineTo(x0 + Math.min(h * 0.35, len * 0.2), y - h * 0.5);
  c.lineTo(x1 - sh, y - h * 0.5);
  // the end ornament: rise to a peak, fall to a rounded shoulder
  c.quadraticCurveTo(x1 - sh * 0.55, y - h * 0.5 - st * 0.35, x1 - sh * 0.42, y - h * 0.5 - st);
  c.quadraticCurveTo(x1 + sh * 0.05, y - h * 0.2, x1, y + h * 0.05);
  c.quadraticCurveTo(x1 - sh * 0.08, y + h * 0.75, x1 - sh * 0.38, y + h * 0.5);
  c.lineTo(x0, y + h * 0.5);
  c.closePath();
}

export function heng(c: C, x0: number, x1: number, y: number, h: number, color: string, serif = 1) {
  if (x1 <= x0) return;
  c.fillStyle = color;
  hengPath(c, x0, x1, y, h, serif);
  c.fill();
}

type Pt = [number, number];
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/**
 * A brush ribbon along a cubic bezier, with a width profile w(s) (s 0..1), drawn up to
 * progress p (the pen has travelled that far). This is how strokes are *written*.
 */
export function ribbon(c: C, b: [Pt, Pt, Pt, Pt], w: (s: number) => number, p = 1, color = '#000', N = 48) {
  p = clamp(p);
  if (p <= 0.001) return;
  const L: Pt[] = [], R: Pt[] = [];
  const n = Math.max(2, Math.ceil(N * p));
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * p;
    const a = bez(...b, s);
    const e = bez(...b, Math.min(1, s + 0.002));
    const f = bez(...b, Math.max(0, s - 0.002));
    let dx = e[0] - f[0], dy = e[1] - f[1];
    const m = Math.hypot(dx, dy) || 1;
    dx /= m; dy /= m;
    const ww = w(s) / 2;
    L.push([a[0] - dy * ww, a[1] + dx * ww]);
    R.push([a[0] + dy * ww, a[1] - dx * ww]);
  }
  c.beginPath();
  c.moveTo(L[0]![0], L[0]![1]);
  for (const q of L) c.lineTo(q[0], q[1]);
  // rounded pen head
  for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i]![0], R[i]![1]);
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

/**
 * 人, Song-ish, centred at (cx, cy) with height H. pPie/pNa are writing progress.
 * Returns the two bezier controls so callers can attach things to them.
 */
export function ren(c: C, cx: number, cy: number, H: number, pPie: number, pNa: number, color: string) {
  const top = cy - H * 0.5, bot = cy + H * 0.5;
  const pie: [Pt, Pt, Pt, Pt] = [
    [cx + H * 0.02, top],
    [cx + H * 0.02, top + H * 0.38],
    [cx - H * 0.12, bot - H * 0.22],
    [cx - H * 0.46, bot],
  ];
  const na: [Pt, Pt, Pt, Pt] = [
    [cx + H * 0.0, top + H * 0.36],
    [cx + H * 0.1, top + H * 0.62],
    [cx + H * 0.26, bot - H * 0.08],
    [cx + H * 0.5, bot - H * 0.02],
  ];
  const k = H * 0.075;
  ribbon(c, pie, (s) => k * lerp(1.15, 0.12, Math.pow(s, 1.4)) * (s < 0.04 ? 0.6 + s * 10 : 1), pPie, color);
  ribbon(c, na, (s) => k * (s < 0.82 ? lerp(0.25, 1.55, s / 0.82) : lerp(1.55, 0.2, (s - 0.82) / 0.18)), pNa, color);
  return { pie, na };
}

/** Engineering dimension line with end ticks and a centred label slot. */
export function dimension(c: C, x0: number, x1: number, y: number, lw: number, color: string, tick = 10) {
  c.strokeStyle = color;
  c.lineWidth = lw;
  c.beginPath();
  c.moveTo(x0, y); c.lineTo(x1, y);
  c.moveTo(x0, y - tick); c.lineTo(x0, y + tick);
  c.moveTo(x1, y - tick); c.lineTo(x1, y + tick);
  c.stroke();
}
