// 终章 · 可能性 — 一 + 人 = 大, and then the horizon.
// bar 29    on paper: the reach line returns, the person's black stroke at its centre.
//           The four results of the work (standard, code, chart, notice) fly in and fold
//           into the line as notches: the work becomes reach. The blue grows out both ways.
// bar 30.5  the red seal's 人 lifts out above the line.
// bar 31    CLIMAX (the film's first major chord): 人 is written across 一 → 大.
//           The arms are blue at their ends, ink at the core; the body is red.
//           Caption: 一（能力）＋ 人（判断）＝ 大
// bar 32    zoom out. The prologue's zoom-out revealed a short stroke in a vast field; this
//           one never finds the stroke's ends: 大's arms become the horizon, the person a
//           small red figure on it. The field of things-one-might-do returns — now inside reach.
// bar 33/34 那件你以为一个人做不成的事， / 现在，可以开始了。
// bar 35    title.
import type { C } from '../engine/env';
import type { Scene, Frame } from '../engine/scene';
import { camera, clear, W, H } from '../engine/core';
import { P, rgba } from '../engine/palette';
import { bar, BEAT, BAR, DURATION } from '../engine/score';
import { heng, hengPath, ren } from '../engine/stroke';
import { glyphs, text } from '../engine/type';
import { ease, keys, lerp, prog, pulse, mulberry32, clamp } from '../engine/util';

const INK = P.ink, RED = P.human, BLUE = P.machineOnPaper;
const HREN = 640; // height of 人 at the climax (world)
const LINE_H = 30; // stroke thickness of the 一 at the climax
const ZEND = 0.11; // final zoom (horizon)

interface Dot { x: number; y: number; r: number; d: number }
const DOTS: Dot[] = (() => {
  const r = mulberry32(23), out: Dot[] = [];
  let k = 0;
  while (out.length < 230 && k < 6000) {
    k++;
    // screen-space distribution at the final zoom, mapped to world
    const sx = (r() * 2 - 1) * 900, sy = -480 + r() * 860;
    if (Math.abs(sy - 0) < 50) continue; // keep clear of the horizon (screen y offset handled below)
    if (sy < -180 && sy > -430 && Math.abs(sx) < 700) continue; // keep clear of the final text block
    if (out.some((d) => Math.hypot(d.x * ZEND - sx, d.y * ZEND - sy) < 30)) continue;
    out.push({ x: sx / ZEND, y: sy / ZEND, r: 3 + r() * 3.5, d: Math.abs(sx) / 900 });
  }
  return out;
})();

export default class Horizon implements Scene {
  id = 'horizon';
  start = bar(29);
  end = DURATION + 1;

  samples(t: number) {
    if (t > bar(31) - 0.3 && t < bar(31) + 0.12) return 8;
    if (t > bar(32) && t < bar(33)) return 4;
    return 1;
  }

  render(c: C, f: Frame) {
    const t = f.t;
    clear(c, P.paper);
    // ---- camera ----
    const zIn = keys(t, [[bar(29), 1.25], [bar(30.75), 1.0], [bar(31), 0.98, ease.linear], [bar(32), 1.06, ease.linear]]);
    const zOut = prog(t, bar(32), bar(33.2), ease.inOutCubic);
    const zoom = Math.exp(lerp(Math.log(zIn), Math.log(ZEND), zOut));
    // keep the line at screen y: centre → lower third (y=+250 from centre) during the zoom-out
    const lineScreen = lerp(-110, 250, zOut);
    const camY = -lineScreen / zoom;
    const hit = pulse(t, bar(31), 0.09);
    c.save();
    camera(c, 0, camY, zoom * (1 + hit * 0.025), 0, [0, hit * 6]);

    // ---- the line (一) ----
    const grow = prog(t, bar(29.5), bar(31), ease.inOutCubic); // blue arms grow out both ways
    const core = 130; // half-length of the person's own stroke
    const armWorld = lerp(core, 640, grow);
    const inf = zOut > 0 ? Math.max(armWorld, (W / zoom) * 0.62) : armWorld;
    const thick = lerp(10, LINE_H, prog(t, bar(30.75), bar(31), ease.inCubic));
    // gradient: blue ends → ink core (the person's own skill stays at the centre)
    const g = c.createLinearGradient(-inf, 0, inf, 0);
    const k = Math.min(0.49, core / inf);
    g.addColorStop(0, BLUE); g.addColorStop(Math.max(0.001, 0.5 - k * 1.8), BLUE);
    g.addColorStop(0.5 - k, INK); g.addColorStop(0.5 + k, INK);
    g.addColorStop(Math.min(0.999, 0.5 + k * 1.8), BLUE); g.addColorStop(1, BLUE);
    c.fillStyle = g;
    hengPath(c, -inf, inf, 0, thick, zOut > 0.5 ? 0 : 1 - zOut * 2);
    c.fill();

    // notches: the four results folded into the line
    const NOTCH = [-420, -230, 230, 420];
    const notchA = 1 - prog(t, bar(32), bar(32.4));
    NOTCH.forEach((nx, i) => {
      const t0 = bar(29) + BEAT * (0.5 + i);
      const fly = prog(t, t0, t0 + 0.5, ease.inOutCubic);
      if (fly <= 0) return;
      const lbl = ['GB 3838', 'river.py', 'r = 0.80', '告示'][i]!;
      const sx = (i < 2 ? -1 : 1) * 900, sy = -300 + (i % 2) * 120;
      const x = lerp(sx, nx, fly), y = lerp(sy, -thick, fly);
      if (fly < 1) text(c, lbl, x, y, { fam: 'Mono', size: 30, color: BLUE, align: 'center', alpha: 1 - fly * 0.6 });
      if (fly >= 1) {
        c.fillStyle = rgba(INK, notchA);
        c.fillRect(nx - 1.5, -thick / 2 - 16, 3, 16);
        text(c, lbl, nx, -thick / 2 - 28, { fam: 'Mono', size: 20, color: P.graphite, align: 'center', alpha: notchA * (1 - prog(t, bar(30.6), bar(30.9))) });
      }
    });

    // ---- 人 ----
    const cy = HREN * 0.14; // so that the 捺 starts at the line
    const lift = prog(t, bar(30.5), bar(30.75), ease.outCubic);
    if (lift > 0 && t < bar(30.75)) {
      // the seal arrives small, red, above the line
      const s = 60 * lift;
      c.fillStyle = RED;
      c.fillRect(-s / 2, -230 - s / 2, s, s);
      ren(c, 0, -228, s * 0.78, 1, 1, P.paper);
    }
    const pPie = prog(t, bar(30.75), bar(30.75) + BEAT * 0.55, ease.inOutCubic);
    const pNa = prog(t, bar(30.75) + BEAT * 0.5, bar(31), ease.inCubic);
    if (pPie > 0) ren(c, 0, cy, HREN, pPie, pNa, RED);

    // ---- the field returns: things one might do, now inside reach ----
    if (zOut > 0.3) {
      for (const d of DOTS) {
        const a = prog(zOut, 0.3 + d.d * 0.4, 0.45 + d.d * 0.4);
        if (a <= 0) continue;
        const fill = prog(t, bar(32.6) + d.d * BAR * 0.6, bar(32.6) + d.d * BAR * 0.6 + 0.25);
        const r = (d.r / zoom) * a;
        c.beginPath(); c.arc(d.x, d.y + lineScreen / ZEND * 0 , r, 0, Math.PI * 2);
        if (fill > 0.5) { c.fillStyle = rgba(INK, 0.85); c.fill(); }
        else { c.strokeStyle = rgba(P.graphite, 0.75 * a); c.lineWidth = 1.2 / zoom; c.stroke(); }
      }
    }
    c.restore();

    // ---- caption at the climax ----
    const capA = prog(t, bar(31.5), bar(31.5) + 0.3) * (1 - prog(t, bar(32), bar(32) + 0.3));
    if (capA > 0) {
      text(c, '一（能力）＋ 人（判断）＝ 大', 960, 1030, { fam: 'Mono', size: 24, color: P.graphite, align: 'center', alpha: capA });
    }

    // ---- final lines ----
    const fadeOut = prog(t, bar(35) - 0.25, bar(35));
    const l1 = bar(33);
    if (t > l1 && t < bar(35)) {
      glyphs(c, '那件你以为一个人做不成的事，', 960, 420, { fam: 'Serif-Bold', size: 64, align: 'center', base: 'middle', color: INK }, (i) => {
        const a = prog(t, l1 + i * 0.07, l1 + i * 0.07 + 0.25, ease.outCubic);
        return { a: a * (1 - fadeOut), dy: (1 - a) * 10 };
      });
    }
    const l2 = bar(34);
    if (t > l2 && t < bar(35)) {
      glyphs(c, '现在，可以开始了。', 960, 530, { fam: 'Serif-Bold', size: 64, align: 'center', base: 'middle', color: INK }, (i) => {
        const a = prog(t, l2 + i * 0.09, l2 + i * 0.09 + 0.25, ease.outCubic);
        return { a: a * (1 - fadeOut), dy: (1 - a) * 10, color: i === 5 || i === 6 ? RED : INK };
      });
    }
    // ---- title ----
    const tt = bar(35);
    if (t >= tt - 0.02) {
      const a = prog(t, tt, tt + 0.6, ease.outCubic) * (1 - prog(t, DURATION - 2.2, DURATION - 0.6));
      glyphs(c, '超出一人之力', 960, 470, { fam: 'Serif-Bold', size: 104, align: 'center', base: 'middle', color: INK, track: 18 }, (i) => ({ a, color: i === 3 ? RED : INK }));
      text(c, '当智能不再只来自我们自己的大脑', 960, 580, { fam: 'Sans-Light', size: 26, color: P.graphite, align: 'center', alpha: prog(t, tt + 0.8, tt + 1.4) * (1 - prog(t, DURATION - 2.2, DURATION - 0.6)) });
    }
    const end = prog(t, DURATION - 1.4, DURATION - 0.2);
    return { ground: 'paper', fade: end } as const;
  }
}
