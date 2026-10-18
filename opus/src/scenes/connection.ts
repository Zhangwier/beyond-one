// 第二章 · 连接 — the machine appears only as a new way of organizing.
// bar 10    hard cut to ink: same map, same question, lights off — the thinking space.
// bar 10.5  six ultramarine links, one every two beats (bells). Each link lands on a card
//           and that card's jargon is translated into plain words beneath it. One card
//           (水化学) is not needed for this question: it is struck out — pruning is help too.
// bar 13    decomposition: cards fall into one row in dependency order; the curved links
//           straighten into a single horizontal line. The person's black stroke sits at its
//           start; the blue line carries on past every step. Labels: 你会的 / 借助 AI 可以抵达的.
// bar 14.5  maxim: 陌生的领域，变得可以进入。
// bar 15.5  the camera pushes into the first step (标准) — it becomes ch3's first panel.
import type { C } from '../engine/env';
import type { Scene, Frame } from '../engine/scene';
import { camera, clear } from '../engine/core';
import { P, rgba } from '../engine/palette';
import { bar, BEAT } from '../engine/score';
import { heng } from '../engine/stroke';
import { glyphs, text } from '../engine/type';
import { ease, keys, lerp, prog, pulse, clamp } from '../engine/util';
import { DOMAINS, CARD_W, CARD_H, card } from './_shared';
import { questionLayout } from './complexity';

const BLUE = P.machineOnInk;
// chain: question → 标准 → 微生物 → 采样 → 编程 → 统计 → question
const CHAIN = ['q', 'std', 'micro', 'sample', 'code', 'stat', 'q'];
const LABELS = ['先弄清：什么算能游泳', '限值管的是哪个指标', '水要怎么取才算数', '数据交给程序', '算出规律', '回到问题'];
const ROW = ['std', 'micro', 'sample', 'code', 'stat'];
export const ROW_X = [-740, -370, 0, 370, 740];
export const ROW_S = 0.9; // card scale in the row
export const LINE_Y = CARD_H * ROW_S / 2 + 78;

const dom = (id: string) => DOMAINS.find((d) => d.id === id)!;

export default class Connection implements Scene {
  id = 'connection';
  start = bar(10);
  end = bar(16);

  samples(t: number) {
    if (t > bar(13) && t < bar(13) + BEAT * 4.5) return 4;
    if (t > bar(15.5)) return 6;
    return 1;
  }

  render(c: C, f: Frame) {
    const t = f.t;
    clear(c, P.ink);
    const align = (i: number) => prog(t, bar(13) + i * BEAT * 0.5, bar(13) + i * BEAT * 0.5 + BEAT * 1.6, ease.spring);
    const alignAll = prog(t, bar(13), bar(13) + BEAT * 4, ease.inOutCubic);
    // push into the first row card at the end (ch3 panel); slight zoom pulse on kicks
    const push = prog(t, bar(15.5), bar(16), ease.inExpo);
    const zoom0 = keys(t, [[bar(10), 0.86], [bar(13), 0.87], [bar(14), 1.0], [bar(15.5), 1.02]]);
    const zoom = Math.exp(lerp(Math.log(zoom0), Math.log(5.6), push)) * (1 + 0.006 * f.low);
    const cx = lerp(0, ROW_X[0]!, push), cy = lerp(alignAll * 40, 0, push);
    c.save();
    camera(c, cx, cy, zoom);

    // card positions: map → row
    const posOf = (id: string): [number, number, number] => {
      if (id === 'q') {
        const y = lerp(0, -330, alignAll);
        return [0, y, 1];
      }
      const d = dom(id);
      const ri = ROW.indexOf(id);
      if (ri < 0) return [d.pos[0], d.pos[1], 1];
      const a = align(ri);
      return [lerp(d.pos[0], ROW_X[ri]!, a), lerp(d.pos[1], 0, a), lerp(1, ROW_S, a)];
    };

    // ---- question ----
    const qy = posOf('q')[1];
    const Q = questionLayout(c, t, lerp(46, 40, alignAll), () => 1, () => P.paper, qy);

    // ---- links ----
    const linkT = (k: number) => bar(10.5) + k * BEAT * 2;
    const anchor = (id: string, toward: [number, number]): [number, number] => {
      const [x, y, s] = posOf(id);
      if (id === 'q') return [x + (toward[0] > x ? 1 : -1) * Math.min(Math.abs(toward[0] - x), Q.width / 2 + 16), y + (toward[1] > y ? 30 : -30)];
      const hw = CARD_W * s / 2, hh = CARD_H * s / 2;
      const dx = toward[0] - x, dy = toward[1] - y;
      if (Math.abs(dx) / hw > Math.abs(dy) / hh) return [x + Math.sign(dx) * hw, y + clamp(dy / Math.max(1, Math.abs(dx)) * hw, -hh, hh)];
      return [x + clamp(dx / Math.max(1, Math.abs(dy)) * hh, -hw, hw), y + Math.sign(dy) * hh];
    };
    const lineY = LINE_Y;
    for (let k = 0; k < 6; k++) {
      const lp = prog(t, linkT(k), linkT(k) + 0.45, ease.outExpo);
      if (lp <= 0) continue;
      const A = posOf(CHAIN[k]!), B = posOf(CHAIN[k + 1]!);
      const a = anchor(CHAIN[k]!, [B[0], B[1]]), b = anchor(CHAIN[k + 1]!, [A[0], A[1]]);
      // curved link bowing away from the centre
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const nl = Math.hypot(nx, ny) || 1;
      const bow = 0.18 * nl * (my * ny + mx * nx > 0 ? 1 : -1);
      let qx = mx + (nx / nl) * bow, qy2 = my + (ny / nl) * bow;
      // straightened: links between consecutive row cards become segments of one line below the row
      let ax = a[0], ay = a[1], bx = b[0], by = b[1];
      const st = k >= 1 && k <= 4 ? Math.min(align(k - 1), align(k)) : 0;
      if (st > 0) {
        const ra = posOf(CHAIN[k]!), rb = posOf(CHAIN[k + 1]!);
        ax = lerp(ax, ra[0], st); ay = lerp(ay, lineY, st);
        bx = lerp(bx, rb[0], st); by = lerp(by, lineY, st);
        qx = lerp(qx, (ax + bx) / 2, st); qy2 = lerp(qy2, lineY, st);
      }
      const fadeEnds = k === 0 || k === 5 ? 1 - alignAll : 1;
      if (fadeEnds <= 0.01) continue;
      c.strokeStyle = rgba(BLUE, 0.95 * fadeEnds);
      c.lineWidth = lerp(1.6, 3, st) / zoom * Math.max(1, zoom * 0.7);
      c.beginPath();
      const N = 40;
      for (let i = 0; i <= Math.ceil(N * lp); i++) {
        const u = Math.min(lp, i / N);
        const x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * qx + u * u * bx;
        const y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * qy2 + u * u * by;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
      // pen head pulse
      const head = pulse(t, linkT(k) + 0.45, 0.15);
      if (lp < 1 || head > 0.05) {
        const u = lp;
        const x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * qx + u * u * bx;
        const y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * qy2 + u * u * by;
        c.fillStyle = BLUE;
        c.beginPath(); c.arc(x, y, (4 + head * 6) / Math.max(1, zoom * 0.8), 0, Math.PI * 2); c.fill();
      }
      // label at the curve's middle
      const la = prog(t, linkT(k) + 0.25, linkT(k) + 0.5) * (1 - alignAll);
      if (la > 0) {
        const lx = 0.25 * ax + 0.5 * qx + 0.25 * bx, ly = 0.25 * ay + 0.5 * qy2 + 0.25 * by;
        text(c, LABELS[k]!, lx, ly - 10, { fam: 'Sans-Regular', size: 24, color: BLUE, align: 'center', alpha: la });
      }
    }

    // ---- cards ----
    DOMAINS.forEach((d, j) => {
      const [x, y, s] = posOf(d.id);
      const k = CHAIN.indexOf(d.id) - 1; // the link that lands on it
      const landed = k >= 0 ? prog(t, linkT(k) + 0.4, linkT(k) + 0.6) : 0;
      const plainP = k >= 0 ? prog(t, linkT(k) + 0.45, linkT(k) + 1.0) : 0;
      if (d.id === 'chem') {
        // pruned: struck through, labelled, then gone in the alignment
        const sp = prog(t, bar(12.75), bar(12.75) + 0.35, ease.outExpo);
        const gone = prog(t, bar(13), bar(13) + 0.5);
        c.save();
        c.globalAlpha = 1 - gone;
        card(c, d, x, y, { ink: 0, fg: P.paper, dim: rgba(P.ash, lerp(0.75, 0.35, sp)), lw: 1.2 / zoom });
        if (sp > 0) {
          c.strokeStyle = BLUE; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x - CARD_W / 2 - 10, y); c.lineTo(x - CARD_W / 2 - 10 + (CARD_W + 20) * sp, y); c.stroke();
          text(c, '这个问题暂时不需要', x - CARD_W / 2, y + CARD_H / 2 + 32, { fam: 'Sans-Regular', size: 20, color: BLUE, alpha: sp });
        }
        c.restore();
        return;
      }
      c.save();
      c.translate(x, y); c.scale(s, s); c.translate(-x, -y);
      const ri = ROW.indexOf(d.id);
      card(c, d, x, y, {
        ink: landed > 0.5 ? 1 : 0, fg: P.paper, dim: rgba(P.ash, 0.95), lw: (1.4 + landed) / zoom / s,
        jargonFade: plainP, plainP: plainP * (1 - alignAll * 0.0), plainColor: BLUE,
        idx: ri >= 0 && alignAll > 0.5 ? ri : j, tag: undefined,
      });
      c.restore();
      // step numbers once aligned
      if (ri >= 0) {
        const na = align(ri);
        if (na > 0.3) text(c, `STEP ${String(ri + 1).padStart(2, '0')}`, x - CARD_W * s / 2, y - CARD_H * s / 2 - 16, { fam: 'Mono', size: 15, color: P.ash, alpha: clamp((na - 0.3) * 2) * (1 - push) });
      }
    });

    // ---- the person's stroke, and the reach line ----
    const sp = prog(t, bar(13.5), bar(13.5) + BEAT * 1.2, ease.outExpo);
    {
      // starts where ch1 left it (under 编程), dims during ch2, then slides to the line's start
      const from: [number, number] = [dom('code').pos[0], dom('code').pos[1] + CARD_H / 2 + 20];
      const to: [number, number] = [ROW_X[0]! - CARD_W * ROW_S / 2, lineY];
      const x0 = lerp(from[0] - CARD_W / 2, to[0], sp), y = lerp(from[1], to[1], sp);
      const len = lerp(CARD_W, CARD_W * ROW_S, sp);
      heng(c, x0, x0 + len, y, 8, P.paper);
      // the blue extension: from the end of the person's stroke to the far end
      const ext = prog(t, bar(14), bar(14) + BEAT * 2, ease.inOutCubic);
      if (ext > 0) {
        const xe = ROW_X[4]! + CARD_W * ROW_S / 2;
        heng(c, x0 + len - 8, lerp(x0 + len, xe, ext), y + 0.5, 5, BLUE, ext);
        const la = prog(t, bar(14) + BEAT * 1.5, bar(14) + BEAT * 2.2) * (1 - push);
        text(c, '你会的', x0 + len / 2, y + 42, { fam: 'Sans-Regular', size: 20, color: P.paper, align: 'center', alpha: la });
        text(c, '借助 AI，可以抵达的', (x0 + len + xe) / 2, y + 42, { fam: 'Sans-Regular', size: 20, color: BLUE, align: 'center', alpha: la });
      }
    }
    c.restore();

    // ---- maxim ----
    const m0 = bar(14.5);
    const ma = prog(t, m0, m0 + 0.3) * (1 - prog(t, bar(15.5), bar(15.5) + 0.25));
    if (ma > 0) {
      glyphs(c, '陌生的领域，变得可以进入。', 960, 980, { fam: 'Serif-Bold', size: 54, align: 'center', base: 'middle', color: P.paper }, (i) => {
        const ti = m0 + i * BEAT * 0.25;
        const a = prog(t, ti, ti + 0.12, ease.outCubic);
        return { a: a * ma, dy: (1 - a) * 12 };
      });
    }
    return { ground: 'ink', flash: pulse(t, bar(10), 0.05) * 0.0 } as const;
  }
}
