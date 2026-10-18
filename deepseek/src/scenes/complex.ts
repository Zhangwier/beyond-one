// complex.ts — 一 · 复杂 (12–20s)
//
// The one problem, arriving. A question mark is drawn by hand in the field (12–13.4 s).
// From 14 s it is *measured*: three contour rings expand out of it, one per beat, and the
// rings are the distance between the person and the answer, drawn as terrain. Then, one per
// beat, the four things the question actually needs are set around it — a proof, a
// measurement, a program, a text in another language — each with its own unit and cost.
//
// 17.4–20 the reach is drawn from the centre toward the proof. It stops short; the gap is
// bracketed and labelled. The footer counts what one person holds: 01 of 04.
//
// Layout obeys the spread: type lives only in the left column, drawing only in the field.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo } from '../engine/core.ts';
import { line, circle, type PW } from './_lib.ts';
import { reach } from './_motif.ts';
import { GRID, head, essay, foot, ruler } from './_spread.ts';

const CX = 1138, CY = 500;
const RING_R = [128, 176, 220];

export class Complex implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;

    // ---- the question mark ----------------------------------------------
    const drawQ = expo(clamp(lt / 1.4));
    if (drawQ > 0) {
      const R = 74;
      const a0 = Math.PI * 1.10, a1 = Math.PI * 2.44;
      const hookN = Math.max(6, Math.floor(56 * clamp(drawQ / 0.62)));
      const hook: PW[] = [];
      for (let i = 0; i <= hookN; i++) {
        const u = i / 56;
        const a = lerp(a0, a1, u);
        hook.push({ x: CX + Math.cos(a) * R, y: CY - 44 + Math.sin(a) * R, w: 3.8 * (1 - 0.3 * u) });
      }
      const se = { x: CX + Math.cos(a1) * R, y: CY - 44 + Math.sin(a1) * R };
      const stemP = clamp((drawQ - 0.6) / 0.26);
      const tail: PW[] = [];
      if (stemP > 0) {
        const m = Math.max(2, Math.round(20 * stemP));
        for (let i = 0; i <= m; i++) {
          const u = i / 20;
          tail.push({ x: lerp(se.x, CX - 2, u), y: lerp(se.y, CY + 62, u), w: 3.8 * (1 - 0.38 * u) });
        }
      }
      c.ink({ pts: [...hook, ...tail], dry: 0.13, seed: 2.6 });
      const dotP = clamp((drawQ - 0.88) / 0.12);
      if (dotP > 0) c.ink({ pts: circle(CX - 2, CY + 118, 6.2 * dotP, 3.6, 24, 6.2 * dotP * 0.92), dry: 0.05, seed: 8.1 });
    }

    // ---- contour rings ---------------------------------------------------
    for (let i = 0; i < 3; i++) {
      const born = 2.0 + i * 0.95;
      const p = clamp((lt - born) / 1.75);
      if (p <= 0) continue;
      const r = 30 + (RING_R[i] - 30) * expo(p);
      const pts: PW[] = [];
      const N = 168;
      for (let j = 0; j <= N; j++) {
        const a = (j / N) * Math.PI * 2;
        const wob = 1 + 0.046 * Math.sin(a * 3 + i * 2.1) + 0.026 * Math.sin(a * 5 - i * 1.3) + 0.014 * Math.sin(a * 7 + i * 4);
        pts.push({ x: CX + Math.cos(a) * r * wob, y: CY + Math.sin(a) * r * 0.92 * wob, w: 1.05 - i * 0.09 });
      }
      c.ink({ pts, dry: 0.14 + i * 0.05, seed: 4 + i * 3.3, opacity: 1 - i * 0.12 });
    }

    // contour values sit on the ring, turned along it, with a paper tab behind them
    c.type((ctx) => {
      for (let i = 0; i < 3; i++) {
        const p = sstep(2.7 + i * 0.95, 3.4 + i * 0.95, lt);
        if (p <= 0) continue;
        const a = 2.42 + i * 0.52;
        const x = CX + Math.cos(a) * RING_R[i] * 0.99;
        const y = CY + Math.sin(a) * RING_R[i] * 0.92;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a - Math.PI / 2);
        // an opaque paper tab, exactly the width of the number, so the ring is cut cleanly
        ctx.globalAlpha = p * 0.92;
        ctx.fillStyle = '#E9E2D3';
        ctx.fillRect(-18, -7, 36, 15);
        ctx.globalAlpha = p * 0.72;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 9px "NotoSansSC", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(['11.0', '28.4', '57.9'][i], 0, 3);
        ctx.textAlign = 'left';
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    });

    // ---- the four requirements, around the field -------------------------
    const reqs = [
      { at: 4.55, nm: 'A', zh: '证明', meta: '4 年 · 领域外', ax: 706, ay: 268, side: -1 as const, kind: 'proof' },
      { at: 5.35, nm: 'B', zh: '测量', meta: '18 个月 · 设备', ax: 1590, ay: 268, side: 1 as const, kind: 'measure' },
      { at: 6.15, nm: 'C', zh: '程序', meta: '6 个月 · 工程', ax: 706, ay: 806, side: -1 as const, kind: 'program' },
      { at: 6.95, nm: 'D', zh: '另一个语言', meta: '2 年 · 语料', ax: 1586, ay: 806, side: 1 as const, kind: 'language' },
    ];
    for (const r of reqs) {
      const p = clamp((lt - r.at) / 0.5);
      if (p <= 0) continue;
      const e = expo(p);
      const objs: PW[] = [];
      const ox = r.ax;
      if (r.kind === 'proof') {
        objs.push(line(ox, r.ay - 8, ox, r.ay + 26, 1.0, 8));
        objs.push(line(ox, r.ay + 26, ox + 58, r.ay + 26, 1.0, 12));
        for (let i = 0; i < 3; i++) objs.push(line(ox + 6, r.ay + 2 + i * 8, ox + 34 + i * 10, r.ay + 2 + i * 8, 0.55, 6));
      } else if (r.kind === 'measure') {
        objs.push(line(ox - 58, r.ay + 22, ox + 58, r.ay + 22, 0.85, 20));
        for (let i = 0; i <= 10; i++) objs.push(line(ox - 58 + i * 11.6, r.ay + 22, ox - 58 + i * 11.6, r.ay + 22 - (i % 5 === 0 ? 10 : 5), 0.5, 2));
        objs.push(line(ox - 58, r.ay - 2, ox - 58, r.ay + 22, 1.0, 4));
        objs.push(line(ox + 58, r.ay - 2, ox + 58, r.ay + 22, 1.0, 4));
      } else if (r.kind === 'program') {
        objs.push(line(ox, r.ay - 8, ox + 10, r.ay - 8, 0.9, 2));
        objs.push(line(ox, r.ay - 8, ox, r.ay + 22, 0.9, 5));
        objs.push(line(ox, r.ay + 22, ox + 10, r.ay + 22, 0.9, 2));
        for (let i = 0; i < 3; i++) objs.push(line(ox + 20 + i * 7, r.ay - 1 + i * 8, ox + 74, r.ay - 1 + i * 8, 0.6, 8));
      } else {
        objs.push(line(ox - 58, r.ay - 2, ox - 14, r.ay - 2, 0.9, 8));
        objs.push(line(ox - 58, r.ay + 14, ox - 24, r.ay + 14, 0.9, 8));
        objs.push(line(ox + 6, r.ay - 2, ox + 58, r.ay - 2, 0.65, 8));
        objs.push(line(ox + 6, r.ay + 14, ox + 46, r.ay + 14, 0.65, 8));
        objs.push(line(ox - 2, r.ay - 10, ox - 2, r.ay + 22, 0.45, 4));
      }
      c.ink({ pts: objs, dry: 0.12, seed: r.at * 3.7, opacity: 0.95 });
      c.type((ctx) => {
        ctx.fillStyle = '#15120E';
        ctx.textAlign = r.side < 0 ? 'left' : 'right';
        const lx = r.side < 0 ? r.ax : r.ax;
        ctx.globalAlpha = e * 0.85;
        ctx.font = '300 8px "NotoSansSC", monospace';
        ctx.fillText(r.nm, lx + (r.side < 0 ? 0 : 0), r.ay - 22);
        ctx.globalAlpha = e * 0.93;
        ctx.font = '300 22px "NotoSerifSC", serif';
        ctx.fillText(r.zh, lx, r.ay + 54);
        ctx.globalAlpha = e * 0.34;
        ctx.font = '300 8.5px "NotoSansSC", monospace';
        ctx.fillText(r.meta, lx, r.ay + 70);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      });
    }

    // ---- the reach falls short ------------------------------------------
    if (lt > 7.35) {
      const p = expo(clamp((lt - 7.35) / 1.45));
      const target = { x: 706, y: 268 };
      const dx = target.x - CX, dy = target.y - CY;
      const stop = 0.50;
      const to = { x: CX + dx * stop * p, y: CY + dy * stop * p };
      c.ink(reach({ from: { x: CX - 2, y: CY + 34 }, to, bow: -30 * p, err: 2.4, th: 1.85, taper: 0.5, dry: 0.24 + 0.2 * p, seed: 3.4 }));
      if (p > 0.97) {
        const a = to, b = target;
        const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
        const ap = sstep(8.75, 9.2, lt);
        if (ap > 0) {
          c.ink({ pts: [{ x: a.x + nx * 11 * ap, y: a.y + ny * 11 * ap, w: 0.7 }, { x: b.x + nx * 11 * ap, y: b.y + ny * 11 * ap, w: 0.7 }], dry: 0.08, seed: 12.3, opacity: 0.42 });
          c.ink({ pts: [{ x: a.x, y: a.y, w: 0.7 }, { x: a.x + nx * 13 * ap, y: a.y + ny * 13 * ap, w: 0.7 }], dry: 0.08, seed: 13.3, opacity: 0.42 });
          c.ink({ pts: [{ x: b.x, y: b.y, w: 0.7 }, { x: b.x + nx * 13 * ap, y: b.y + ny * 13 * ap, w: 0.7 }], dry: 0.08, seed: 14.3, opacity: 0.42 });
          c.type((ctx) => {
            ctx.globalAlpha = clamp((ap - 0.5) / 0.5) * 0.72;
            ctx.fillStyle = '#15120E';
            ctx.font = '300 9px "NotoSansSC", monospace';
            ctx.fillText('未 覆 盖', a.x + nx * 20, a.y + ny * 20);
            ctx.globalAlpha = 1;
          });
        }
      }
    }

    // ---- the spread's type ------------------------------------------------
    c.type((ctx) => {
      const ah = sstep(0.05, 0.5, lt) * (1 - sstep(7.55, 7.95, lt));
      head(ctx, { num: '一', tag: 'I  ·  T H E  S H A P E  O F  O N E  P R O B L E M', alpha: ah });
      essay(ctx, ['一个问题，', '从来不是一件事。'], { y: 170, alpha: sstep(0.15, 0.85, lt), size: 28, note: 'A  P R O B L E M  I S  A  C R O S S - S E C T I O N' });
      const s2 = sstep(0.3, 0.9, lt);
      if (s2 > 0.002) {
        const n = 1 + Math.floor(clamp((lt - 4.55) / 0.8, 0, 3));
        ctx.globalAlpha = s2 * 0.55;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 11px "NotoSerifSC", serif';
        ctx.fillText('这题需要四种能力。', GRID.typeX, 344);
        ctx.globalAlpha = s2 * 0.35;
        ctx.font = '300 8.5px "NotoSansSC", monospace';
        ctx.fillText('一个人手里：0 1', GRID.typeX, 366);
        ctx.globalAlpha = s2 * 0.9;
        ctx.font = '200 34px "NotoSansSC", monospace';
        ctx.fillText(`0${n} / 04`, GRID.typeX, 416);
        ctx.globalAlpha = s2 * 0.25;
        ctx.font = '300 8.5px "NotoSansSC", monospace';
        ctx.fillText('D I S C I P L I N E S   R E Q U I R E D', GRID.typeX, 436);
        ctx.globalAlpha = 1;
      }
      foot(ctx, 'F I G .  0 1   ·   D I S T A N C E   T O   T H E   A N S W E R', undefined, sstep(0.4, 1.0, lt));
      ruler(ctx, clamp((lt - 2) / 6), 0.22);
    });
  }
}
