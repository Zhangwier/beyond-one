// 序章 · 有限 — one stroke, one person.
// 0.0–0.5  the stroke is written at 14× (brush swipe), the end serif lands ON bar 0.
// bar 0.5  zoom-out (outExpo): the mighty stroke is tiny in a vast field.
// bar 1    dimension line: 一个人. Three limits are annotated on the beats.
// bar 2    the field fills with dots — things one might want to do. Only those inside the
//          stroke's reach band are dark. A live tally shows how few.
// bar 3    one far dot (outside reach) is chosen; the camera dives through its ring.
import type { C } from '../engine/env';
import type { Scene, Frame } from '../engine/scene';
import { camera, clear, W, H } from '../engine/core';
import { P, rgba } from '../engine/palette';
import { bar, BEAT, T0 } from '../engine/score';
import { heng, dimension } from '../engine/stroke';
import { text } from '../engine/type';
import { clamp, ease, keys, lerp, mulberry32, prog, pulse } from '../engine/util';

const SL = 260; // stroke length (world)
const SH = 8; // stroke thickness
const SX0 = -SL / 2 - 40, SX1 = SX0 + SL; // the stroke sits slightly left of centre
const TARGET: [number, number] = [610, -205]; // the chosen dot

interface Dot { x: number; y: number; r: number; t: number }
const DOTS: Dot[] = (() => {
  const rnd = mulberry32(11);
  const out: Dot[] = [];
  let k = 0;
  while (out.length < 260 && k < 5000) {
    k++;
    const x = (rnd() * 2 - 1) * 900, y = (rnd() * 2 - 1) * 470;
    if (Math.abs(y) < 40 && x > SX0 - 30 && x < SX1 + 30) continue; // keep the stroke clear
    if (Math.hypot(x - TARGET[0], y - TARGET[1]) < 60) continue;
    if (y > 120 && y < 300 && x > SX0 - 40 && x < SX1 + 260) continue; // keep annotations clear
    if (out.some((d) => Math.hypot(d.x - x, d.y - y) < 34)) continue;
    // appear in 8 waves (one per pluck, 8ths from bar 2), sweeping outward from the stroke
    const wave = Math.min(7, Math.floor((Math.hypot(x, y * 1.4) / 1050) * 8 + rnd() * 1.2));
    out.push({ x, y, r: 3 + rnd() * 3.5, t: bar(2) + wave * BEAT * 0.5 + rnd() * 0.08 });
  }
  return out;
})();
const inReach = (d: Dot) => d.x > SX0 && d.x < SX1;

export default class Prologue implements Scene {
  id = 'prologue';
  start = 0;
  end = bar(4);

  samples(t: number) {
    if (t < T0 + 0.05) return 8; // the swipe
    if (t > bar(0.5) && t < bar(0.5) + 0.9) return 8; // the zoom-out
    if (t > bar(3.3)) return 10; // the dive
    return 1;
  }

  render(c: C, f: Frame) {
    const t = f.t;
    clear(c, P.paper);

    // ---- camera ----
    // opening: 14× on the stroke, the pen tracked; then outExpo pull-back to 1×; then the dive.
    const zOpen = keys(t, [[0, 15.5], [T0, 14], [bar(0.5), 13.2, ease.linear]]);
    const zOut = prog(t, bar(0.5), bar(0.5) + 1.3, ease.outExpo);
    let zoom = Math.exp(lerp(Math.log(zOpen), Math.log(1), zOut));
    const penX = lerp(SX0, SX1, prog(t, 0, T0, ease.inOutCubic));
    let cx = lerp(Math.min(penX, SX1 - 40), 0, zOut), cy = lerp(-4, 0, zOut);
    // the dive: centre on the target, zoom ×120 by bar 4 (inExpo)
    const dive = prog(t, bar(3.25), bar(4), ease.inExpo);
    const dpos = prog(t, bar(3), bar(3.6), ease.inOutCubic);
    cx = lerp(cx, TARGET[0], dpos); cy = lerp(cy, TARGET[1], dpos);
    zoom *= Math.exp(lerp(0, Math.log(140), dive)) * lerp(1, 1.15, dpos);
    const sh = pulse(t, T0, 0.06) * 10;
    c.save();
    camera(c, cx, cy, zoom, 0, [sh * 0.6, -sh]);

    // ---- the field: a faint registration grid (crosshairs every 120) ----
    const gridA = prog(t, bar(0.5) + 0.2, bar(1), ease.outCubic) * 0.55;
    if (gridA > 0) {
      c.strokeStyle = rgba(P.graphite, 0.35 * gridA);
      c.lineWidth = 1 / zoom;
      c.beginPath();
      for (let gx = -1080; gx <= 1080; gx += 120) for (let gy = -600; gy <= 600; gy += 120) {
        c.moveTo(gx - 5, gy); c.lineTo(gx + 5, gy); c.moveTo(gx, gy - 5); c.lineTo(gx, gy + 5);
      }
      c.stroke();
    }

    // ---- reach band: two hairlines from the stroke's ends (bar 2) ----
    const band = prog(t, bar(1.75), bar(2.25), ease.inOutCubic);
    if (band > 0) {
      c.fillStyle = rgba(P.ink, 0.035 * band);
      c.fillRect(SX0, -600 * band, SL, 1200 * band);
      c.strokeStyle = rgba(P.ink, 0.45);
      c.lineWidth = 1 / zoom;
      c.setLineDash([4 / zoom, 6 / zoom]);
      c.beginPath();
      c.moveTo(SX0, -600 * band); c.lineTo(SX0, 600 * band);
      c.moveTo(SX1, -600 * band); c.lineTo(SX1, 600 * band);
      c.stroke();
      c.setLineDash([]);
    }

    // ---- dots: things one might want to do ----
    let shown = 0, reach = 0;
    for (const d of DOTS) {
      const a = prog(t, d.t, d.t + 0.25, ease.outBack);
      if (a <= 0) continue;
      shown++;
      const ir = inReach(d);
      if (ir) reach++;
      const r = d.r * a;
      c.beginPath();
      c.arc(d.x, d.y, r, 0, Math.PI * 2);
      if (ir) { c.fillStyle = P.ink; c.fill(); }
      else { c.strokeStyle = rgba(P.graphite, 0.75); c.lineWidth = 1.2 / zoom; c.stroke(); }
    }

    // ---- the chosen dot (bar 3): a ring outside reach, pulsing on the beat ----
    const ch = prog(t, bar(3), bar(3) + 0.4, ease.outBack);
    if (ch > 0) {
      const beatP = pulse(t, bar(3) + Math.floor((t - bar(3)) / BEAT) * BEAT, 0.12);
      c.strokeStyle = P.ink;
      c.lineWidth = 2 / Math.min(zoom, 3);
      c.beginPath();
      c.arc(TARGET[0], TARGET[1], 9 * ch + beatP * 3, 0, Math.PI * 2);
      c.stroke();
      // a hairline from the stroke's end to the ring: the distance is the point
      const lp = prog(t, bar(3) + 0.1, bar(3.4), ease.inOutCubic);
      c.strokeStyle = rgba(P.ink, 0.6);
      c.lineWidth = 1 / zoom;
      c.setLineDash([2 / zoom, 5 / zoom]);
      c.beginPath();
      c.moveTo(SX1 + 6, -6);
      c.lineTo(lerp(SX1 + 6, TARGET[0] - 12, lp), lerp(-6, TARGET[1] + 8, lp));
      c.stroke();
      c.setLineDash([]);
      text(c, '?', TARGET[0] + 18, TARGET[1] - 14, { fam: 'Serif-Regular', size: 26, color: P.ink, alpha: lp });
    }

    // ---- THE STROKE ----
    const penP = prog(t, 0, T0, ease.inOutCubic);
    const x1 = lerp(SX0 + 4, SX1, penP);
    const serif = prog(t, T0 - 0.08, T0 + 0.05, ease.outBack);
    heng(c, SX0, x1, 0, SH, P.ink, serif);

    // ---- dimension: 一个人 ----
    const dimP = prog(t, bar(0.5) + 1.1, bar(1) + 0.4, ease.outExpo);
    if (dimP > 0) {
      const mid = (SX0 + SX1) / 2;
      dimension(c, lerp(mid, SX0, dimP), lerp(mid, SX1, dimP), -46, 1 / zoom, P.ink, 7);
      const la = prog(t, bar(1), bar(1) + 0.3);
      c.fillStyle = P.paper;
      c.fillRect(mid - 58, -64, 116, 34);
      text(c, '一个人', mid, -38, { fam: 'Serif-Bold', size: 30, color: P.ink, align: 'center', alpha: la, track: 4 });
    }
    // three limits, one per beat (bar 1 beats 2,3,4)
    const notes = ['知识 · 有限', '时间 · 有限', '精力 · 有限'];
    notes.forEach((s, i) => {
      const a = prog(t, bar(1) + BEAT * (i + 1), bar(1) + BEAT * (i + 1) + 0.18, ease.outCubic);
      if (a <= 0) return;
      const yy = 44 + i * 26;
      c.strokeStyle = rgba(P.ink, 0.5 * a);
      c.lineWidth = 1 / zoom;
      c.beginPath(); c.moveTo(SX0, yy - 6); c.lineTo(SX0 + 14 * a, yy - 6); c.stroke();
      text(c, s, SX0 + 22, yy, { fam: 'Mono', size: 16, color: P.graphite, alpha: a });
    });

    // tally (bar 2 →): how much of what you'd want lies within reach
    const ta = prog(t, bar(2), bar(2) + 0.3);
    if (ta > 0) {
      text(c, '想做的事', 700, -420, { fam: 'Mono', size: 15, color: P.graphite, alpha: ta, align: 'right' });
      text(c, `${String(reach).padStart(2, '0')} / ${shown}`, 700, -388, { fam: 'Mono-Med', size: 22, color: P.ink, alpha: ta, align: 'right' });
      text(c, '在能力范围内', 700, -364, { fam: 'Mono', size: 15, color: P.graphite, alpha: ta, align: 'right' });
    }
    c.restore();

    // the dive ends inside the ring: a white-out of paper (the ring passes the lens)
    const fade = prog(t, bar(3.85), bar(4), ease.inCubic);
    return { ground: 'paper', fade: fade * 0.9 } as const;
  }
}
