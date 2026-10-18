// 第一章 · 复杂 — a single question unfolds into six disciplines.
// bar 4     the question is typed (key clicks on 16ths).
// bar 5     each key word throws a leader line and a domain card opens, one per beat.
// bar 6     the map settles; each domain shows what learning it alone would cost.
// bar 7–9   the person's stroke (same 一 as the prologue, one card wide) slides under the
//           cards on the kicks. What it covers turns ink; what it leaves fades. The
//           running total of years climbs; the sixth card is never reached.
// bar 9     maxim: 现实的问题，从不按学科出现。
import type { C } from '../engine/env';
import type { Scene, Frame } from '../engine/scene';
import { camera, clear } from '../engine/core';
import { P, rgba } from '../engine/palette';
import { bar, BEAT } from '../engine/score';
import { heng } from '../engine/stroke';
import { glyphs, text } from '../engine/type';
import { ease, keys, lerp, prog, pulse, clamp } from '../engine/util';
import { DOMAINS, QUESTION, CARD_W, CARD_H, card } from './_shared';

const VISIT = [0, 1, 2, 5, 4]; // the order the lone stroke tries: chem, micro, std, stat, code — sample never
const MAXIM = '现实的问题，从不按学科出现。';

export function questionLayout(c: C, t: number, size: number, alphaFn: (i: number) => number, colorFn: (i: number) => string, y = 0) {
  return glyphs(c, QUESTION, 0, y, { fam: 'Serif-Regular', size, align: 'center', base: 'middle' }, (i) => ({ a: alphaFn(i), color: colorFn(i) }));
}

export default class Complexity implements Scene {
  id = 'complexity';
  start = bar(4);
  end = bar(10);

  samples(t: number) {
    // the stroke's slides
    for (let k = 0; k < 5; k++) { const tk = bar(7) + k * BEAT * 2; if (t > tk - 0.02 && t < tk + 0.3) return 6; }
    return 1;
  }

  render(c: C, f: Frame) {
    const t = f.t;
    clear(c, P.paper);
    const zoom = keys(t, [[bar(4), 1.12], [bar(5), 1.0, ease.outCubic], [bar(6.5), 0.86, ease.inOutCubic], [bar(9), 0.84], [bar(10), 0.8, ease.linear]]);
    const camY = keys(t, [[bar(4), 0], [bar(6.5), 20], [bar(9), 20]]);
    c.save();
    camera(c, 0, camY, zoom);

    // ---- typed question ----
    const typeT = (i: number) => bar(4) + BEAT * 0.5 + i * BEAT * 0.25;
    const qSize = lerp(68, 46, prog(t, bar(5) - 0.15, bar(5) + 0.35, ease.inOutCubic));
    const keyIdx = new Set(DOMAINS.map((d) => d.from));
    const lit = (i: number) => DOMAINS.some((d, j) => d.from === i && t >= bar(5) + j * BEAT);
    const maximDim = 1 - 0.8 * prog(t, bar(9) - 0.2, bar(9) + 0.3);
    c.globalAlpha = maximDim;
    const Q = questionLayout(
      c, t, qSize,
      (i) => prog(t, typeT(i), typeT(i) + 0.05),
      (i) => (t < bar(5) ? P.ink : keyIdx.has(i) ? (lit(i) ? P.ink : P.graphite) : rgba(P.graphite, 0.75)),
    );
    // caret
    const nTyped = QUESTION.length;
    const lastT = typeT(nTyped - 1);
    if (t < bar(5)) {
      const typed = Math.max(0, Math.min(nTyped, Math.floor((t - typeT(0)) / (BEAT * 0.25)) + 1));
      const cxp = typed === 0 ? Q.x0 : Q.xs[typed - 1]! + Q.ws[typed - 1]!;
      const blink = t > lastT ? (Math.floor((t - lastT) / 0.3) % 2 === 0 ? 1 : 0) : 1;
      c.fillStyle = rgba(P.ink, blink);
      c.fillRect(cxp + 4, -qSize * 0.55, 3, qSize * 1.1);
    }

    // ---- leaders + cards ----
    DOMAINS.forEach((d, j) => {
      const tb = bar(5) + j * BEAT;
      const lp = prog(t, tb, tb + 0.22, ease.outExpo);
      if (lp <= 0) return;
      const gi = d.from;
      const sx = Q.xs[gi]! + Q.ws[gi]! / 2, sy = d.pos[1] < 0 ? -qSize * 0.62 : qSize * 0.62;
      const ex = d.pos[0], ey = d.pos[1] + (d.pos[1] < 0 ? CARD_H / 2 : -CARD_H / 2);
      // leader: vertical out of the glyph, then diagonal to the card (an elbow)
      const midY = lerp(sy, ey, 0.45);
      c.strokeStyle = rgba(P.ink, 0.55);
      c.lineWidth = 1.2 / zoom;
      c.beginPath();
      c.moveTo(sx, sy);
      const seg1 = Math.min(1, lp * 2), seg2 = clamp(lp * 2 - 1);
      c.lineTo(sx, lerp(sy, midY, seg1));
      if (seg2 > 0) c.lineTo(lerp(sx, ex, seg2), lerp(midY, ey, seg2));
      c.stroke();
      // the glyph that spawned it gets a tick mark
      c.fillStyle = P.ink;
      c.fillRect(sx - 2, sy - 2, 4, 4);

      // card ink: covered by the lone stroke?
      const vi = VISIT.indexOf(j);
      let ink = 0.0;
      if (vi >= 0) {
        const t0 = bar(7) + vi * BEAT * 2;
        ink = prog(t, t0 + 0.12, t0 + 0.3) * (1 - 0.75 * prog(t, t0 + BEAT * 2, t0 + BEAT * 2 + 0.6));
      }
      const reveal = prog(t, tb + 0.1, tb + 0.45, ease.outCubic);
      const tagA = prog(t, bar(6) + j * BEAT * 0.5, bar(6) + j * BEAT * 0.5 + 0.2);
      card(c, d, d.pos[0], d.pos[1], {
        ink: t < bar(7) ? 1 : ink > 0.5 ? 1 : 0, fg: P.ink, dim: t < bar(7) ? P.ink : rgba(P.graphite, lerp(0.55, 1, ink)),
        reveal, lw: (1.2 + ink * 1.6) / zoom * 1, tag: d.learn, tagA,
      });
      // hit flash on reveal
      const fl = pulse(t, tb + 0.1, 0.08);
      if (fl > 0.02) { c.fillStyle = rgba(P.ink, 0.12 * fl); c.fillRect(d.pos[0] - CARD_W / 2, d.pos[1] - CARD_H / 2, CARD_W, CARD_H); }
    });

    // ---- the lone stroke ----
    const sIn = prog(t, bar(7) - 0.3, bar(7), ease.outCubic);
    if (sIn > 0) {
      let k = Math.floor((t - bar(7)) / (BEAT * 2));
      k = Math.max(0, Math.min(VISIT.length - 1, k));
      const posOf = (i: number) => { const d = DOMAINS[VISIT[Math.max(0, Math.min(VISIT.length - 1, i))]!]!; return [d.pos[0], d.pos[1] + CARD_H / 2 + 20] as const; };
      const t0 = bar(7) + k * BEAT * 2;
      const mv = prog(t, t0 - 0.0, t0 + 0.28, ease.outExpo);
      const a = k === 0 ? [posOf(0)[0], posOf(0)[1] + 80] : posOf(k - 1);
      const b2 = posOf(k);
      const x = lerp(a[0], b2[0], k === 0 ? 1 : mv), y = lerp(a[1], b2[1], k === 0 ? sIn : mv);
      c.globalAlpha = maximDim * sIn;
      heng(c, x - CARD_W / 2, x + CARD_W / 2, y, 8, P.ink);
      c.globalAlpha = maximDim;
      // after the last try: the stroke can't reach the sixth card — a dotted gap to it
      const gapA = prog(t, bar(8) + BEAT * 2.5, bar(8) + BEAT * 3.5);
      if (gapA > 0) {
        const s = DOMAINS[3]!;
        c.strokeStyle = rgba(P.ink, 0.5 * gapA);
        c.setLineDash([3 / zoom, 6 / zoom]);
        c.lineWidth = 1.2 / zoom;
        c.beginPath();
        c.moveTo(x - CARD_W / 2 - 10, y);
        c.lineTo(s.pos[0] + CARD_W / 2, y);
        c.stroke();
        c.setLineDash([]);
        text(c, '来不及', (x - CARD_W / 2 + s.pos[0] + CARD_W / 2) / 2, y - 14, { fam: 'Mono', size: 16, color: P.graphite, align: 'center', alpha: gapA });
      }
    }

    // ---- running total ----
    const totA = prog(t, bar(7), bar(7) + 0.3);
    if (totA > 0) {
      let months = 0;
      VISIT.forEach((j, vi) => { if (t >= bar(7) + vi * BEAT * 2 + 0.15) months += DOMAINS[j]!.months; });
      const extra = t > bar(8) + BEAT * 3 ? 6 : 0;
      const m = months + extra;
      const y = Math.floor(m / 12), mo = m % 12;
      const s = `${extra ? '≈ ' : ''}${y > 0 ? `${y} 年` : ''}${mo > 0 ? ` ${mo} 个月` : ''}`.trim() || '0';
      text(c, '一个人学会全部', 0, 92, { fam: 'Mono', size: 16, color: P.graphite, align: 'center', alpha: totA });
      const bump = pulse(t, bar(7) + Math.floor((t - bar(7)) / (BEAT * 2)) * BEAT * 2 + 0.15, 0.1);
      text(c, s, 0, 150 + bump * -4, { fam: 'Sans-Black', size: 50, color: P.ink, align: 'center', alpha: totA });
    }
    c.globalAlpha = 1;
    c.restore();

    // ---- maxim (screen space) ----
    const m0 = bar(9);
    if (t >= m0 - 0.05) {
      const bg = prog(t, m0 - 0.1, m0 + 0.2);
      c.fillStyle = rgba(P.paper, 0.55 * bg);
      c.fillRect(0, 380, 1920, 320);
      glyphs(c, MAXIM, 960, 560, { fam: 'Serif-Bold', size: 84, align: 'center', base: 'middle', color: P.ink }, (i) => {
        const ti = m0 + i * BEAT * 0.25;
        const a = prog(t, ti, ti + 0.12, ease.outCubic);
        return { a, dy: (1 - a) * 18 };
      });
      // a hairline rule grows under it, then — on the last beat — the breath: everything holds
      const rl = prog(t, m0 + BEAT * 3.5, m0 + BEAT * 4 - 0.05, ease.outExpo);
      if (rl > 0) { c.fillStyle = P.ink; c.fillRect(960 - 560 * rl, 630, 1120 * rl, 2); }
    }
    return { ground: 'paper' } as const;
  }
}
