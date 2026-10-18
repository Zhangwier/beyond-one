// arrive.ts — 一 · 抵达 (20–22s)  ·  THE SHORT NOTE
//
// Two seconds, one idea: the reach cannot finish the figure, so it stops — and the stopping
// is the chapter's punctuation.
//
// 20.0  a hard cut. The contour field from the previous plate is gone; only one ring remains,
//       open at the top, the way a chart keeps the axis it has already used.
// 20.1  the reach draws its last segment toward a single marked point, fast, and stops 210 px
//       short. The stop is a *dead stop*: no ease-out, the line simply ceases.
// 20.6  the gap is bracketed and dimensioned, and three ticks count what is missing: a lemma,
//       a dataset, a proof — each unreadable, each outside the field.
// 21.2  a single line of type is set in the left column. Nothing else moves for 0.8 s.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, hash } from '../engine/core.ts';
import { line, pt, circle, ticks, type PW } from './_lib.ts';
import { reach } from './_motif.ts';
import { GRID, head, essay, foot } from './_spread.ts';

const CX = 1138, CY = 540;

export class Arrive implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;

    // ---- the one remaining ring, open at the top --------------------------
    {
      const a0 = -Math.PI / 2 + 0.10, a1 = -Math.PI / 2 - 0.10 + Math.PI * 2;
      const pts: PW[] = [];
      for (let i = 0; i <= 150; i++) {
        const a = lerp(a0, a1, i / 150) + Math.PI / 2;
        pts.push({ x: CX + Math.cos(a) * 300, y: CY + Math.sin(a) * 268, w: 0.8 });
      }
      c.ink({ pts, dry: 0.34, seed: 3.3, opacity: 0.26 });
    }

    // ---- three unreadable requirements in the ring -----------------------
    // not labels: small dense blocks of text at the size of texture, each with a unit
    {
      const blocks = [
        { x: CX - 196, y: CY - 96, w: 74, h: 44 },
        { x: CX + 96, y: CY + 58, w: 92, h: 36 },
        { x: CX - 70, y: CY + 140, w: 60, h: 52 },
      ];
      for (let b = 0; b < blocks.length; b++) {
        const bl = blocks[b];
        const a = sstep(0.55 + b * 0.1, 0.9 + b * 0.1, lt) * 0.34;
        for (let i = 0; i < 6; i++) {
          const y = bl.y + (bl.h * i) / 6;
          c.ink({ pts: [pt(bl.x, y, 0.45), pt(bl.x + bl.w * (0.5 + hash(b, i) * 0.5), y, 0.45)], dry: 0.3, seed: 40 + b * 7 + i, opacity: a });
        }
      }
    }

    // ---- the marked point ------------------------------------------------
    const tx = 700, ty = 314;
    const markA = sstep(0.05, 0.3, lt);
    if (markA > 0) {
      c.ink({ pts: [pt(tx - 9, ty, 0.9), pt(tx + 9, ty, 0.9)], dry: 0.1, seed: 7, opacity: 0.75 * markA });
      c.ink({ pts: [pt(tx, ty - 9, 0.9), pt(tx, ty + 9, 0.9)], dry: 0.1, seed: 8, opacity: 0.75 * markA });
      c.ink({ pts: circle(tx, ty, 15, 0.6, 40), dry: 0.2, seed: 9, opacity: 0.4 * markA });
    }

    // ---- the reach, then the dead stop -----------------------------------
    // one straight-ish stroke, leaving the centre and ceasing without deceleration
    const p = expo(clamp(lt / 0.55));
    const stop = 0.47;
    const to = { x: CX + (tx - CX) * stop * p, y: CY + (ty - CY) * stop * p };
    c.ink(reach({ from: { x: CX, y: CY }, to, bow: -6 * p, err: 1.6, th: 2.0, taper: 0.5, dry: 0.26, seed: 3.4 }));

    // ---- the dimension, drawn along the SAME axis as the gap --------------
    const ap = sstep(0.6, 1.15, lt);
    if (ap > 0) {
      const a = to, b = { x: tx - 20, y: ty };
      const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
      const nx = -uy, ny = ux;
      // a dimension line offset to one side, with witness lines back to the gap's ends
      const off = 30;
      const a2 = { x: a.x + nx * off, y: a.y + ny * off };
      const b2 = { x: b.x + nx * off, y: b.y + ny * off };
      c.ink({ pts: [{ x: a.x, y: a.y, w: 0.6 }, { x: a2.x, y: a2.y, w: 0.6 }], dry: 0.08, seed: 13.3, opacity: 0.4 * ap });
      c.ink({ pts: [{ x: b.x, y: b.y, w: 0.6 }, { x: b2.x, y: b2.y, w: 0.6 }], dry: 0.08, seed: 14.3, opacity: 0.4 * ap });
      c.ink({ pts: [{ x: a2.x, y: a2.y, w: 0.6 }, { x: b2.x, y: b2.y, w: 0.6 }], dry: 0.08, seed: 12.3, opacity: 0.55 * ap });
      c.ink({ pts: [{ x: a2.x - ux * 7, y: a2.y - uy * 7, w: 0.6 }, { x: a2.x + ux * 7, y: a2.y + uy * 7, w: 0.6 }], dry: 0.08, seed: 15.3, opacity: 0.55 * ap });
      c.ink({ pts: [{ x: b2.x - ux * 7, y: b2.y - uy * 7, w: 0.6 }, { x: b2.x + ux * 7, y: b2.y + uy * 7, w: 0.6 }], dry: 0.08, seed: 16.3, opacity: 0.55 * ap });
      c.type((ctx) => {
        ctx.globalAlpha = clamp((ap - 0.4) / 0.6) * 0.72;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 9px "NotoSansSC", monospace';
        const mx = (a2.x + b2.x) / 2, my = (a2.y + b2.y) / 2;
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(Math.atan2(uy, ux));
        ctx.textAlign = 'center';
        ctx.fillText('2 1 0   p x', 0, -7);
        ctx.restore();
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      });
    }

    // ---- three counts of what is missing ---------------------------------
    // packed close, at the foot of the ring, so the missing-ness reads as a list, not as
    // three scattered labels
    if (lt > 0.95) {
      const items = ['一 个 引 理', '一 组 数 据', '一 份 证 明'];
      for (let i = 0; i < 3; i++) {
        const a = sstep(0.95 + i * 0.18, 1.25 + i * 0.18, lt);
        if (a <= 0) continue;
        const yy = 700 + i * 26;
        c.ink({ pts: [pt(760, yy, 0.55), pt(800, yy, 0.55)], dry: 0.15, seed: 60 + i, opacity: 0.36 * a });
        c.type((ctx) => {
          ctx.globalAlpha = a * 0.62;
          ctx.fillStyle = '#15120E';
          ctx.font = '300 11px "NotoSerifSC", serif';
          ctx.fillText(items[i], 812, yy + 4);
          ctx.globalAlpha = a * 0.3;
          ctx.font = '300 8px "NotoSansSC", monospace';
          ctx.fillText('[ 0 / 1 ]', 900, yy + 4);
          ctx.globalAlpha = 1;
        });
      }
    }

    // ---- type --------------------------------------------------------------
    c.type((ctx) => {
      head(ctx, { num: '一', tag: 'I  ·  S T O P P E D   H E R E', alpha: sstep(0.05, 0.3, lt) * (1 - sstep(1.75, 1.95, lt)) });
      essay(ctx, ['到这里，', '就停了。'], { y: 168, alpha: sstep(0.2, 0.5, lt) * (1 - sstep(1.7, 1.95, lt)), size: 30, note: 'T H E   M A R K   E N D S   H E R E' });
      const a2 = sstep(0.8, 1.1, lt);
      if (a2 > 0) {
        ctx.globalAlpha = a2 * 0.55;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 10px "NotoSerifSC", serif';
        ctx.fillText('不是没有答案。', GRID.typeX, 300);
        ctx.fillText('是答案长在别人的领域里。', GRID.typeX, 322);
      }
      foot(ctx, 'F I G .  0 2   ·   T H E   G A P', undefined, a2);
    });
  }
}
