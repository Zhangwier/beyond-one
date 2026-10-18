// 第四章 · 判断 — the machine is wrong; the person checks, corrects, decides.
// bar 24    tape stop → silence → lights on: the draft on paper. Four clock ticks: thinking.
//           A red pen point appears: 等一下。
// bar 25    red circles on the three post-rain spikes: 雨后为什么这么高？
// bar 26    trace the cause: the code's LIMIT and the standard's unit side by side.
//           个/L vs 菌落/100mL — the limit was used 10× too high.
// bar 26.5  the fix: 10000 → 1000. The limit line DROPS one decade (boom). Six days now exceed.
// bar 27    the headline is struck and rewritten by the person: 雨后 48 小时内，不宜下水。
// bar 27.5  the seal — 人 — is stamped: the person signs for the result.
// bar 28    maxim: 能力可以借，判断不能借。
import type { C } from '../engine/env';
import type { Scene, Frame } from '../engine/scene';
import { camera, clear } from '../engine/core';
import { P, rgba } from '../engine/palette';
import { bar, BEAT } from '../engine/score';
import { glyphs, text, width } from '../engine/type';
import { ease, keys, lerp, prog, pulse, clamp, hash } from '../engine/util';
import { CODE, DAYS, LIMIT_RIGHT, LIMIT_WRONG } from './_shared';
import { ren } from '../engine/stroke';

const RED = P.human, BLUE = P.machineOnPaper, INK = P.ink;
// chart region (screen/world, camera at centre)
const G = { x0: 190, x1: 1010, yTop: 470, yBot: 950 };
const ly = (v: number) => lerp(G.yBot, G.yTop, (Math.log10(Math.max(100, v)) - 2) / 3);
const dx = (d: number) => lerp(G.x0 + 24, G.x1 - 10, d / 29);
const SPIKES = [[6, 7], [14, 15], [22, 23]];

/** A hand-drawn red ellipse (pen), drawn up to p. */
function penEllipse(c: C, x: number, y: number, rx: number, ry: number, p: number, seed: number, lw = 4) {
  if (p <= 0) return;
  c.strokeStyle = RED; c.lineWidth = lw; c.lineCap = 'round';
  c.beginPath();
  const N = 60, a0 = -2.2 + seed;
  for (let i = 0; i <= N * p; i++) {
    const u = i / N;
    const a = a0 + u * Math.PI * 2.15;
    const wob = 1 + 0.05 * Math.sin(u * 9 + seed * 3) + 0.04 * u;
    const px = x + Math.cos(a) * rx * wob, py = y + Math.sin(a) * ry * wob;
    i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
  }
  c.stroke();
  c.lineCap = 'butt';
}
/** A red underline/strike stroke from (x0,y) to (x1,y), drawn up to p. */
function penLine(c: C, x0: number, y0: number, x1: number, y1: number, p: number, lw = 4) {
  if (p <= 0) return;
  c.strokeStyle = RED; c.lineWidth = lw; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(lerp(x0, x1, p), lerp(y0, y1, p) ); c.stroke();
  c.lineCap = 'butt';
}

export default class Judgment implements Scene {
  id = 'judgment';
  start = bar(24);
  end = bar(29);

  samples(t: number) {
    if (t > bar(26.5) - 0.05 && t < bar(26.5) + 0.35) return 10;
    if (t > bar(27.5) - 0.05 && t < bar(27.5) + 0.25) return 8;
    return 1;
  }

  render(c: C, f: Frame) {
    const t = f.t;
    clear(c, P.paper);
    const dropRaw = prog(t, bar(26.5), bar(26.5) + 0.32);
    const drop = dropRaw <= 0 ? 0 : ease.outBack(dropRaw);
    const limit = Math.pow(10, lerp(Math.log10(LIMIT_WRONG), Math.log10(LIMIT_RIGHT), clamp(drop, 0, 1.08)));
    const shake = pulse(t, bar(26.5) + 0.25, 0.08) * 14 + pulse(t, bar(27.5) + 0.08, 0.06) * 8;
    // camera: full board → chart (bar 25) → code/doc (bar 26) → full (26.5) → headline (27) → full
    const camX = keys(t, [[bar(24.9), 960], [bar(25), 640, ease.outExpo], [bar(25.95), 640], [bar(26), 1380, ease.outExpo], [bar(26.45), 1380], [bar(26.5), 960, ease.outExpo], [bar(27.4), 960]]);
    const camY = keys(t, [[bar(24.9), 540], [bar(25), 650, ease.outExpo], [bar(25.95), 650], [bar(26), 660, ease.outExpo], [bar(26.45), 660], [bar(26.5), 540, ease.outExpo]]);
    const zoom = keys(t, [[bar(24), 1.03], [bar(24.9), 1.0], [bar(25), 1.35, ease.outExpo], [bar(25.95), 1.4], [bar(26), 1.45, ease.outExpo], [bar(26.45), 1.48], [bar(26.5), 1.0, ease.outExpo], [bar(28), 1.0], [bar(29), 1.06, ease.inCubic]]);
    const maximIn = prog(t, bar(28), bar(28) + 0.4, ease.inOutCubic);
    c.save();
    camera(c, camX, camY, zoom, 0, [Math.sin(t * 90) * shake, Math.cos(t * 77) * shake]);
    c.globalAlpha = 1 - 0.85 * maximIn;

    // ---- headline (the draft, then the person's rewrite) ----
    const strike = prog(t, bar(27), bar(27) + 0.3, ease.outCubic);
    text(c, 'AI 草稿 · 给邻居的告示', 160, 120, { fam: 'Mono', size: 22, color: BLUE });
    const hw = width(c, '可以放心游泳。', 'Serif-Bold', 110);
    text(c, '可以放心游泳。', 160, 260, { fam: 'Serif-Bold', size: 110, color: BLUE, alpha: lerp(1, 0.35, strike) });
    penLine(c, 150, 222, 160 + hw + 10, 214, strike, 7);
    const rw = bar(27) + BEAT * 1;
    if (t > rw) {
      glyphs(c, '雨后 48 小时内，不宜下水。', 160, 380, { fam: 'Serif-Bold', size: 84, color: INK }, (i) => {
        const a = prog(t, rw + i * BEAT * 0.12, rw + i * BEAT * 0.12 + 0.1);
        return { a, dy: (1 - a) * 10 };
      });
    }

    // ---- the chart ----
    c.strokeStyle = INK; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(G.x0, G.yTop); c.lineTo(G.x0, G.yBot); c.lineTo(G.x1, G.yBot); c.stroke();
    [100, 1000, 10000, 100000].forEach((v) => {
      const yy = ly(v);
      c.fillStyle = rgba(INK, 0.08); c.fillRect(G.x0, yy, G.x1 - G.x0, 1);
      text(c, v >= 1000 ? `${v / 1000}k` : String(v), G.x0 - 14, yy + 6, { fam: 'Mono', size: 16, color: P.graphite, align: 'right' });
    });
    text(c, '菌落 / 100mL', G.x0, G.yTop - 22, { fam: 'Mono', size: 16, color: P.graphite });
    DAYS.forEach((d) => { if (d.rain) { c.fillStyle = rgba(P.graphite, 0.35); c.fillRect(dx(d.d) - 7, G.yTop, 14, d.rain * 3); } });
    c.strokeStyle = rgba(INK, 0.7); c.lineWidth = 1.5;
    c.beginPath(); DAYS.forEach((d, i) => (i ? c.lineTo(dx(d.d), ly(d.cfu)) : c.moveTo(dx(d.d), ly(d.cfu)))); c.stroke();
    let over = 0;
    DAYS.forEach((d) => {
      const isOver = d.cfu > limit;
      if (isOver) over++;
      const fl = isOver ? pulse(t, bar(26.5) + 0.12 + d.d * 0.004, 0.2) : 0;
      c.fillStyle = isOver ? RED : INK;
      c.beginPath(); c.arc(dx(d.d), ly(d.cfu), 5 + (isOver ? 2 : 0) + fl * 6, 0, Math.PI * 2); c.fill();
    });
    // limit line: blue dashed (machine) until the person sets it: red solid
    const yl = ly(limit);
    if (dropRaw <= 0) {
      c.strokeStyle = BLUE; c.lineWidth = 2.5; c.setLineDash([12, 9]);
      c.beginPath(); c.moveTo(G.x0, yl); c.lineTo(G.x1, yl); c.stroke(); c.setLineDash([]);
      text(c, 'LIMIT = 10000', G.x1, yl - 12, { fam: 'Mono-Med', size: 18, color: BLUE, align: 'right' });
    } else {
      c.strokeStyle = RED; c.lineWidth = 3;
      c.beginPath(); c.moveTo(G.x0, yl); c.lineTo(G.x1, yl); c.stroke();
      text(c, 'LIMIT = 1000', G.x1, yl - 12, { fam: 'Mono-Med', size: 18, color: RED, align: 'right' });
      // ghost of the old line, fading
      const gy = ly(LIMIT_WRONG);
      c.strokeStyle = rgba(BLUE, 0.4 * (1 - prog(t, bar(26.5), bar(27)))); c.setLineDash([12, 9]); c.lineWidth = 2;
      c.beginPath(); c.moveTo(G.x0, gy); c.lineTo(G.x1, gy); c.stroke(); c.setLineDash([]);
    }
    text(c, `超标  ${over} / 30 天`, G.x0 + 20, G.yTop + 34, { fam: 'Mono-Med', size: 22, color: over ? RED : BLUE });

    // ---- the person's pen: 等一下 / circles / question ----
    const wait = prog(t, bar(24) + BEAT * 2, bar(24) + BEAT * 2 + 0.25);
    if (wait > 0) {
      c.fillStyle = rgba(RED, 1 - prog(t, bar(25), bar(25) + 0.3)); c.beginPath(); c.arc(1150, 232, 8 * wait, 0, Math.PI * 2); c.fill();
      text(c, '等一下。', 1180, 252, { fam: 'Serif-Bold', size: 60, color: RED, alpha: prog(t, bar(24) + BEAT * 3, bar(24) + BEAT * 3 + 0.2) * (1 - prog(t, bar(25), bar(25) + 0.3)) });
    }
    SPIKES.forEach((sp, i) => {
      const t0 = bar(25) + i * BEAT * 0.5 + 0.05;
      const x = (dx(sp[0]!) + dx(sp[1]!)) / 2, y = (ly(DAYS[sp[0]!]!.cfu) + ly(DAYS[sp[1]!]!.cfu)) / 2;
      penEllipse(c, x, y, 46, 34, prog(t, t0, t0 + 0.28, ease.inOutCubic), i * 1.7);
    });
    const q = prog(t, bar(25) + BEAT * 2, bar(25) + BEAT * 2.4);
    if (q > 0) text(c, '雨后为什么这么高？', dx(14) - 40, ly(DAYS[14]!.cfu) - 64, { fam: 'Serif-Bold', size: 30, color: RED, alpha: q });

    // ---- evidence: code + standard (right) ----
    const ex = 1110, ey = 520;
    text(c, 'river.py', ex, ey - 40, { fam: 'Mono', size: 16, color: P.graphite });
    CODE.slice(2, 5).forEach((line, i) => {
      const yy = ey + i * 40;
      const hashI = line.indexOf('#');
      const isBug = i === 1;
      const fixP = isBug ? prog(t, bar(26.5) - 0.1, bar(26.5) + 0.1) : 0;
      const shown = isBug && fixP > 0.5 ? 'LIMIT = 10000 / 10           ' : hashI >= 0 ? line.slice(0, hashI) : line;
      text(c, shown, ex, yy, { fam: 'Mono', size: 20, color: isBug && fixP > 0.5 ? RED : INK });
      if (hashI >= 0) text(c, isBug && fixP > 0.5 ? '# 个/L → 个/100mL' : line.slice(hashI), ex + width(c, shown, 'Mono', 20), yy, { fam: 'Mono', size: 20, color: isBug && fixP > 0.5 ? RED : P.graphite });
    });
    // underline the comment 菌落/100mL and the LIMIT line
    const u1 = prog(t, bar(26) + 0.1, bar(26) + 0.35, ease.inOutCubic);
    const commentX = ex + width(c, 'd = pd.read_csv("river.csv")  # 日期, 降雨mm, ', 'Mono', 20);
    penLine(c, commentX, ey + 8, commentX + width(c, '菌落/100mL', 'Mono', 20), ey + 8, u1, 3.5);
    penEllipse(c, ex + 100, ey + 40 - 7, 118, 26, prog(t, bar(26) + BEAT * 0.75, bar(26) + BEAT * 0.75 + 0.3), 0.4, 3.5);
    // the standard's row
    const sy = ey + 190;
    text(c, 'GB 3838—2002  表 1', ex, sy - 36, { fam: 'Mono', size: 16, color: P.graphite });
    text(c, '24  粪大肠菌群（个/L）  ≤  … 10000 …', ex, sy, { fam: 'Mono', size: 20, color: INK });
    const unitX = ex + width(c, '24  粪大肠菌群（', 'Mono', 20);
    penEllipse(c, unitX + width(c, '个/L', 'Mono', 20) / 2, sy - 7, 40, 22, prog(t, bar(26) + BEAT * 1.25, bar(26) + BEAT * 1.25 + 0.3), 1.1, 3.5);
    const note = prog(t, bar(26) + BEAT * 1.6, bar(26) + BEAT * 1.9);
    if (note > 0) {
      text(c, '单位不一样：', ex, sy + 66, { fam: 'Serif-Bold', size: 30, color: RED, alpha: note });
      text(c, '10000 个/L = 1000 个/100mL', ex, sy + 110, { fam: 'Serif-Bold', size: 30, color: RED, alpha: note });
    }

    // ---- the seal: 人 ----
    const st = bar(27.5);
    const sa = prog(t, st - 0.12, st + 0.04, ease.inQuad);
    if (sa > 0) {
      const s = lerp(2.6, 1, sa);
      const x = 1640, y = 300;
      c.save();
      c.translate(x, y); c.rotate(-0.06); c.scale(s, s);
      c.globalAlpha *= Math.min(1, sa * 1.5);
      c.fillStyle = RED;
      const S = 150;
      c.fillRect(-S / 2, -S / 2, S, S);
      ren(c, 0, 4, S * 0.78, 1, 1, P.paper);
      // seal texture: a few paper specks knocked out (deterministic)
      c.fillStyle = P.paper;
      for (let i = 0; i < 26; i++) c.fillRect(-S / 2 + hash(i, 1) * S, -S / 2 + hash(i, 2) * S, 1 + hash(i, 3) * 3, 1 + hash(i, 4) * 2);
      c.restore();
      text(c, '核实 · 负责', x, y + 120, { fam: 'Mono', size: 18, color: RED, align: 'center', alpha: prog(t, st + 0.2, st + 0.5) });
    }
    c.globalAlpha = 1;
    c.restore();

    // ---- maxim ----
    if (maximIn > 0) {
      const m0 = bar(28);
      glyphs(c, '能力可以借，判断不能借。', 960, 560, { fam: 'Serif-Bold', size: 96, align: 'center', base: 'middle', color: INK }, (i) => {
        const ti = m0 + i * BEAT * 0.25;
        const a = prog(t, ti, ti + 0.14, ease.outCubic);
        return { a, dy: (1 - a) * 16, color: i === 6 || i === 7 ? RED : INK };
      });
    }
    return { ground: 'paper' } as const;
  }
}
