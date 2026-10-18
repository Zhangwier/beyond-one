// 第三章 · 突破 — four concrete extensions, one continuous line.
// The camera travels along the reach line; at each step the line opens into a panel.
// bar 16  研究: the standard is scanned, the one row that matters is found, its value lifted out.
// bar 18  编程: code is written; when it runs, every data row becomes a point that flies on.
// bar 20  分析: the points land on a chart whose x-axis IS the reach line; rain hangs from the
//         top; the machine draws a limit line and reports: 超标 0 / 30.
// bar 22  表达: the machine drafts the answer for the neighbours: 可以放心游泳。
// The cost counter in the corner falls with each step: ≈ 4 年 → ≈ 3 周.
// (The draft is wrong. The film does not say so yet: the bug is visible on screen in bar 18.)
import type { C } from '../engine/env';
import type { Scene, Frame } from '../engine/scene';
import { camera, clear } from '../engine/core';
import { P, rgba } from '../engine/palette';
import { bar, BEAT, BAR } from '../engine/score';
import { heng } from '../engine/stroke';
import { glyphs, text, width } from '../engine/type';
import { ease, keys, lerp, prog, pulse, clamp, hash } from '../engine/util';
import { CODE, CODE_BUG_LINE, DAYS, LIMIT_WRONG } from './_shared';

const BLUE = P.machineOnInk;
const BONE = P.paper;
export const PX = [0, 2300, 4600, 6900]; // panel centres along the line
export const LY = 400; // the reach line (world y)
const STEPS = ['研究', '编程', '分析', '表达'];
const COST = ['≈ 4 年', '≈ 1 年', '≈ 4 个月', '≈ 3 周'];

// --- chart geometry (shared with ch4) ---
export const CH = { x0: PX[2]! - 760, x1: PX[2]! + 700, yTop: -330, yBot: LY };
export const logY = (v: number) => {
  const a = Math.log10(100), b = Math.log10(100000);
  return lerp(CH.yBot, CH.yTop, (Math.log10(Math.max(100, v)) - a) / (b - a));
};
export const dayX = (d: number) => lerp(CH.x0 + 40, CH.x1 - 20, d / 29);

export const DOC = [
  '地表水环境质量标准  GB 3838—2002',
  '3  水域功能和标准分类',
  'Ⅰ类  主要适用于源头水、国家自然保护区；',
  'Ⅱ类  主要适用于集中式生活饮用水地表水源地一级保护区……',
  'Ⅲ类  主要适用于……渔业水域及游泳区；',
  'Ⅳ类  主要适用于一般工业用水区及人体非直接接触的娱乐用水区；',
  'Ⅴ类  主要适用于农业用水区及一般景观要求水域。',
  '表 1  地表水环境质量标准基本项目标准限值',
  '18  铅                    ≤   0.01    0.01    0.05    0.05    0.1',
  '19  氰化物                ≤   0.005   0.05    0.2     0.2     0.2',
  '20  挥发酚                ≤   0.002   0.002   0.005   0.01    0.1',
  '21  石油类                ≤   0.05    0.05    0.05    0.5     1.0',
  '22  阴离子表面活性剂      ≤   0.2     0.2     0.2     0.3     0.3',
  '23  硫化物                ≤   0.05    0.1     0.2     0.5     1.0',
  '24  粪大肠菌群（个/L）    ≤   200     2000    10000   20000   40000',
];
export const DOC_HIT_CLASS = 4, DOC_HIT_ROW = 14;

/** The research page (also re-used by ch4 as the source of truth). */
export function drawDoc(c: C, x: number, y: number, t0: number, t: number, fg: string, dim: string, hl: string, scan = true) {
  DOC.forEach((line, i) => {
    const a = prog(t, t0 + i * 0.03, t0 + i * 0.03 + 0.15);
    if (a <= 0) return;
    const yy = y + i * 40 + (i >= 7 ? 22 : 0) + (i >= 1 ? 14 : 0);
    const isTitle = i === 0 || i === 1 || i === 7;
    if (i >= 8) { tableRow(c, line, x, yy, dim, a); return; }
    text(c, line, x, yy, { fam: i === 0 ? 'Sans-Bold' : 'Sans-Regular', size: i === 0 ? 32 : isTitle ? 24 : 23, color: isTitle ? fg : dim, alpha: a });
  });
  if (!scan) return;
  // scanning bar: one line per 16th, from bar start + 1 beat
  const ts = t0 + BEAT;
  const k = (t - ts) / (BEAT * 0.25);
  if (k > 0 && k < DOC.length + 1) {
    const i = Math.min(DOC.length - 1, Math.floor(k));
    const yy = y + i * 40 + (i >= 7 ? 22 : 0) + (i >= 1 ? 14 : 0);
    c.fillStyle = rgba(hl, 0.16);
    c.fillRect(x - 12, yy - 30, 1140, 40);
  }
}

/** Table rows are set in real columns (CJK names break monospace alignment). */
export const COLX = (k: number) => 400 + k * 120; // value column k (0 = Ⅰ类 … 2 = Ⅲ类)
export function tableRow(c: C, line: string, x: number, y: number, color: string, a = 1) {
  const parts = line.split('≤');
  const head = parts[0]!.trim(), vals = parts[1]!.trim().split(/\s+/);
  text(c, head, x, y, { fam: 'Sans-Regular', size: 23, color, alpha: a });
  text(c, '≤', x + 330, y, { fam: 'Mono', size: 23, color, alpha: a });
  vals.forEach((v, k) => text(c, v, x + COLX(k), y, { fam: 'Mono', size: 23, color, alpha: a }));
}

export function docRowY(y: number, i: number) {
  return y + i * 40 + (i >= 7 ? 22 : 0) + (i >= 1 ? 14 : 0);
}

export default class Breakthrough implements Scene {
  id = 'breakthrough';
  start = bar(16);
  end = bar(24);

  samples(t: number) {
    for (const b of [18, 20, 22]) if (t > bar(b) - 0.02 && t < bar(b) + 0.55) return 10;
    if (t < bar(16) + 0.25) return 6;
    if (t > bar(19) && t < bar(19) + 1.4) return 3; // flying points
    return 1;
  }

  render(c: C, f: Frame) {
    const t = f.t;
    clear(c, P.ink);
    // camera: hold on each panel, whip on the downbeat
    const seg = Math.max(0, Math.min(3, Math.floor((t - bar(16)) / (BAR * 2))));
    const ws = bar(16 + seg * 2);
    const whip = seg === 0 ? 1 : prog(t, ws, ws + 0.55, ease.outExpo);
    const camX = lerp(PX[Math.max(0, seg - 1)]!, PX[seg]!, whip);
    const drift = (t - ws) / (BAR * 2);
    const arrive = prog(t, bar(16), bar(16) + 0.5, ease.outExpo);
    const zoom = lerp(1.6, 1, arrive) * (1 + 0.035 * drift) * (1 + 0.006 * f.low);
    c.save();
    camera(c, camX, 0, zoom);

    // ---- the reach line: the person's stroke at the start, the blue line beyond ----
    heng(c, PX[0]! - 1100, PX[0]! - 830, LY, 8, BONE);
    heng(c, PX[0]! - 838, PX[3]! + 900, LY + 0.5, 4, BLUE);
    STEPS.forEach((s, i) => {
      const done = t > bar(16 + i * 2) + 0.3;
      c.fillStyle = done ? BLUE : P.ink;
      c.strokeStyle = BLUE; c.lineWidth = 2;
      c.beginPath(); c.arc(PX[i]! - 820, LY, 9, 0, Math.PI * 2); c.fill(); c.stroke();
      text(c, `${String(i + 1).padStart(2, '0')}  ${s}`, PX[i]! - 800, LY + 46, { fam: 'Sans-Bold', size: 26, color: done ? BONE : P.graphite });
    });

    this.research(c, t);
    this.code(c, t);
    this.analysis(c, t);
    this.create(c, t);
    c.restore();

    // ---- cost counter (screen space, top right) ----
    const ci = seg;
    const roll = prog(t, bar(16 + ci * 2) + 0.1, bar(16 + ci * 2) + 0.4, ease.outExpo);
    text(c, '所需时间', 1800, 92, { fam: 'Mono', size: 22, color: P.ash, align: 'right' });
    c.save();
    c.beginPath(); c.rect(1300, 100, 520, 76); c.clip();
    if (ci > 0) text(c, COST[ci - 1]!, 1800, 160 - roll * 70, { fam: 'Sans-Black', size: 56, color: BONE, align: 'right', alpha: 1 - roll });
    text(c, COST[ci]!, 1800, 160 + (1 - roll) * 70, { fam: 'Sans-Black', size: 56, color: ci === 0 ? BONE : BLUE, align: 'right' });
    c.restore();
    return { ground: 'ink' } as const;
  }

  // ---------- 01 研究 ----------
  research(c: C, t: number) {
    const t0 = bar(16), x = PX[0]! - 760, y = -330;
    if (t > bar(18.6)) return;
    drawDoc(c, x, y, t0, t, BONE, rgba(P.ash, 0.8), BLUE);
    // lock on the class line and the row (bar 16 beat 3.5)
    const lock = prog(t, t0 + BEAT * 3.6, t0 + BEAT * 3.9, ease.outExpo);
    if (lock > 0) {
      c.strokeStyle = BLUE; c.lineWidth = 2.5;
      const y1 = docRowY(y, DOC_HIT_CLASS), y2 = docRowY(y, DOC_HIT_ROW);
      c.strokeRect(x - 12, y1 - 31, 500 * lock, 42);
      c.strokeRect(x - 12, y2 - 31, 1000 * lock, 42);
      // the Ⅲ column
      const cx = x + COLX(2);
      c.fillStyle = rgba(BLUE, 0.25 * lock);
      c.fillRect(cx - 8, y2 - 31, 88, 42);
    }
    // lift: the value flies out into a summary card on the right
    const lift = prog(t, bar(17), bar(17) + 0.5, ease.inOutCubic);
    if (lift > 0) {
      const y2 = docRowY(y, DOC_HIT_ROW);
      const sx = x + COLX(2), sy = y2;
      const ex = PX[0]! + 380, ey = 90;
      const fx = lerp(sx, ex, lift), fy = lerp(sy, ey, lift) - Math.sin(lift * Math.PI) * 120;
      const size = lerp(23, 120, lift);
      text(c, '10000', fx, fy, { fam: lift < 0.5 ? 'Mono' : 'Sans-Black', size, color: lift < 1 ? BLUE : BONE });
      const ca = prog(t, bar(17) + 0.45, bar(17) + 0.7);
      if (ca > 0) {
        text(c, 'AI 摘要', ex, -170, { fam: 'Mono', size: 20, color: BLUE, alpha: ca });
        text(c, 'Ⅲ类水（含游泳区）', ex, -110, { fam: 'Sans-Bold', size: 36, color: BONE, alpha: ca });
        text(c, '粪大肠菌群 ≤', ex, -50, { fam: 'Sans-Regular', size: 30, color: P.ash, alpha: ca });
        text(c, '个 / L', ex + width(c, '10000', 'Sans-Black', 120) + 18, 90, { fam: 'Sans-Bold', size: 40, color: BONE, alpha: ca });
        c.fillStyle = rgba(BLUE, ca); c.fillRect(ex - 24, -190, 4, 300);
      }
    }
  }

  // ---------- 02 编程 ----------
  code(c: C, t: number) {
    const t0 = bar(18), x = PX[1]! - 760, y = -260;
    if (t < t0 - 0.6 || t > bar(20.6)) return;
    // characters stream in at a fixed rate (the machine writes fast, not instantly)
    const cps = 70;
    let budget = Math.max(0, (t - (t0 + 0.25)) * cps);
    text(c, 'river.py', x, y - 70, { fam: 'Mono', size: 18, color: P.ash });
    c.fillStyle = rgba(P.ash, 0.4); c.fillRect(x, y - 54, 1100, 1);
    CODE.forEach((line, i) => {
      const n = Math.min(line.length, Math.floor(budget));
      budget -= line.length + 4;
      const yy = y + i * 50;
      text(c, String(i + 1).padStart(2, ' '), x - 50, yy, { fam: 'Mono', size: 22, color: rgba(BLUE, 0.6) });
      if (n <= 0) return;
      const s = line.slice(0, n);
      // syntax: comments ash, strings blue, rest bone
      const hashI = s.indexOf('#');
      const codePart = hashI >= 0 ? s.slice(0, hashI) : s;
      text(c, codePart, x, yy, { fam: 'Mono', size: 27, color: BONE });
      if (hashI >= 0) text(c, s.slice(hashI), x + width(c, codePart, 'Mono', 27), yy, { fam: 'Mono', size: 27, color: P.ash });
      if (n < line.length) { c.fillStyle = BLUE; c.fillRect(x + width(c, s, 'Mono', 27) + 2, yy - 22, 12, 28); }
    });
    // run (bar 19): output rows stream on the right and each becomes a point flying to the chart panel
    const run = bar(19);
    if (t > run) {
      text(c, '$ python river.py', x, y + CODE.length * 50 + 30, { fam: 'Mono', size: 22, color: BLUE });
      DAYS.forEach((d, i) => {
        const ti = run + 0.15 + i * 0.03;
        const a = prog(t, ti, ti + 0.1);
        if (a <= 0) return;
        const rx = PX[1]! + 470, ry = -330 + i * 23.5;
        const fly = prog(t, bar(19.5) + i * 0.02, bar(20) + 0.45 + i * 0.006, ease.inOutCubic);
        const label = `d${String(d.d + 1).padStart(2, '0')}  ${String(d.rain).padStart(2, ' ')}mm  ${String(d.cfu).padStart(5, ' ')}`;
        if (fly < 0.05) text(c, label, rx, ry, { fam: 'Mono', size: 19, color: d.cfu > 1500 ? BONE : P.ash, alpha: a });
        if (fly > 0) {
          const ex = dayX(d.d), ey = logY(d.cfu);
          const sx = rx + 190, sy = ry - 6;
          const fx = lerp(sx, ex, fly), fy = lerp(sy, ey, fly) - Math.sin(fly * Math.PI) * (80 + hash(i) * 120);
          c.fillStyle = BONE;
          c.beginPath(); c.arc(fx, fy, lerp(3, 6, fly), 0, Math.PI * 2); c.fill();
        }
      });
    }
    void CODE_BUG_LINE;
  }

  // ---------- 03 分析 ----------
  analysis(c: C, t: number) {
    const t0 = bar(20);
    if (t < bar(19.4) || t > bar(22.6)) return;
    const ax = prog(t, bar(19.6), t0 + 0.4, ease.outExpo);
    // y axis (log), ticks
    c.strokeStyle = rgba(BONE, 0.8); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(CH.x0, CH.yBot); c.lineTo(CH.x0, lerp(CH.yBot, CH.yTop, ax)); c.stroke();
    [100, 1000, 10000, 100000].forEach((v) => {
      const yy = logY(v);
      if (yy < lerp(CH.yBot, CH.yTop, ax) - 1) return;
      c.fillStyle = rgba(BONE, 0.8); c.fillRect(CH.x0 - 10, yy, 10, 1.5);
      c.fillStyle = rgba(BONE, 0.08); c.fillRect(CH.x0, yy, CH.x1 - CH.x0, 1);
      text(c, v >= 1000 ? `${v / 1000}k` : String(v), CH.x0 - 18, yy + 7, { fam: 'Mono', size: 18, color: P.ash, align: 'right', alpha: ax });
    });
    text(c, '菌落 / 100mL（对数）', CH.x0, CH.yTop - 30, { fam: 'Mono', size: 18, color: P.ash, alpha: ax });
    // rain hangs from the top
    DAYS.forEach((d, i) => {
      if (!d.rain) return;
      const a = prog(t, t0 + 0.3 + i * 0.015, t0 + 0.6 + i * 0.015, ease.outCubic);
      const h = d.rain * 4.2 * a;
      c.fillStyle = rgba(P.ash, 0.55);
      c.fillRect(dayX(d.d) - 9, CH.yTop - 8, 18, h);
    });
    text(c, '降雨', CH.x1, CH.yTop - 30, { fam: 'Mono', size: 18, color: P.ash, align: 'right', alpha: prog(t, t0 + 0.5, t0 + 0.8) });
    // the series line connects the landed points
    const lp = prog(t, t0 + 0.5, t0 + BEAT * 3, ease.inOutCubic);
    c.strokeStyle = rgba(BONE, 0.7); c.lineWidth = 1.6;
    c.beginPath();
    const nn = Math.floor(lp * 29);
    for (let i = 0; i <= nn; i++) { const d = DAYS[i]!; i === 0 ? c.moveTo(dayX(d.d), logY(d.cfu)) : c.lineTo(dayX(d.d), logY(d.cfu)); }
    c.stroke();
    if (t > bar(20) + 0.45) DAYS.forEach((d) => { c.fillStyle = BONE; c.beginPath(); c.arc(dayX(d.d), logY(d.cfu), 6, 0, Math.PI * 2); c.fill(); });
    // the machine draws the limit (from the code's LIMIT) and reports
    const lim = prog(t, bar(21), bar(21) + 0.6, ease.inOutCubic);
    if (lim > 0) {
      const yy = logY(LIMIT_WRONG);
      c.strokeStyle = BLUE; c.lineWidth = 3; c.setLineDash([14, 10]);
      c.beginPath(); c.moveTo(CH.x0, yy); c.lineTo(lerp(CH.x0, CH.x1, lim), yy); c.stroke(); c.setLineDash([]);
      text(c, 'LIMIT = 10000', CH.x1, yy - 16, { fam: 'Mono-Med', size: 22, color: BLUE, align: 'right', alpha: lim });
      const ra = prog(t, bar(21.5), bar(21.5) + 0.3);
      text(c, '滞后相关 r = 0.80', CH.x0 + 30, CH.yTop + 40, { fam: 'Mono', size: 22, color: BLUE, alpha: ra });
      text(c, '超标  0 / 30 天', CH.x0 + 30, CH.yTop + 76, { fam: 'Mono-Med', size: 26, color: BLUE, alpha: prog(t, bar(21.5) + BEAT, bar(21.5) + BEAT + 0.3) });
    }
  }

  // ---------- 04 表达 ----------
  create(c: C, t: number) {
    const t0 = bar(22);
    if (t < t0 - 0.6) return;
    drawPoster(c, PX[3]!, t, t0, BONE, BLUE, false);
  }
}

/** The river poster. `fixed` = the corrected version (ch4). */
export function drawPoster(c: C, X: number, t: number, t0: number, fg: string, blue: string, fixed: boolean, alpha = 1) {
  c.save();
  c.globalAlpha *= alpha;
  // the river: a meander drawn as two banks
  const rp = prog(t, t0, t0 + 0.9, ease.inOutCubic);
  const riverY = (x: number) => 150 + Math.sin(x * 0.0042 + 0.6) * 70 + Math.sin(x * 0.011) * 18;
  for (const off of [-16, 16]) {
    c.strokeStyle = rgba(fg, 0.85); c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 100 * rp; i++) { const x = X - 780 + i * 15.6; const y = riverY(x) + off; i === 0 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke();
  }
  // stations
  [-520, -60, 420].forEach((dx, i) => {
    const a = prog(t, t0 + 0.6 + i * 0.15, t0 + 0.8 + i * 0.15, ease.outBack);
    if (a <= 0) return;
    const x = X + dx, y = riverY(X + dx);
    c.fillStyle = fixed ? fg : blue;
    c.beginPath(); c.arc(x, y, 9 * a, 0, Math.PI * 2); c.fill();
    text(c, `S${i + 1}`, x + 16, y - 20, { fam: 'Mono', size: 18, color: P.ash, alpha: a });
  });
  // headline (the draft)
  const ha = prog(t, t0 + BEAT * 2, t0 + BEAT * 2 + 0.3, ease.outCubic);
  if (!fixed && ha > 0) {
    text(c, 'AI 草稿 · 给邻居的告示', X - 760, -300, { fam: 'Mono', size: 20, color: blue, alpha: ha });
    glyphs(c, '可以放心游泳。', X - 760, -170, { fam: 'Serif-Bold', size: 120, color: blue }, (i) => {
      const a = prog(t, t0 + BEAT * 2 + i * BEAT * 0.25, t0 + BEAT * 2 + i * BEAT * 0.25 + 0.15, ease.outCubic);
      return { a, dy: (1 - a) * 20 };
    });
    text(c, '30 天监测 · 0 天超标', X - 760, -80, { fam: 'Sans-Regular', size: 34, color: fg, alpha: prog(t, t0 + BAR, t0 + BAR + 0.3) });
  }
  c.restore();
}
