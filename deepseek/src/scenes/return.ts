// return.ts — 终 · 复调 (64–72s)  ·  THE POLYPHONY
//
// The film's structural revelation, and the reason the motif was one stroke all along.
//
// For sixty-four seconds there has been exactly one mark on the page, and every plate moved
// it: out, short, completed, branched, closed. In this plate the mark is **repeated** — and
// the way it is repeated is the argument.
//
// 64–65.4   one petal: a stroke that leaves the centre, sweeps out, turns at the tip and comes
//           home on a tighter radius. The way back is not the way out.
// 65.4      a second petal, mirrored: now the figure has two hands.
// 66.4      four-fold symmetry; 67.4 eight-fold. Each tooth is a capability, and every tooth
//           is the *same* stroke, so the wheel is one gesture read eight ways.
// 68.4–72   the wheel turns by one tooth per beat — the film's climax made of order, not speed.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo } from '../engine/core.ts';
import { circle, line, pt, type PW } from './_lib.ts';
import { petal } from './_motif.ts';
import { GRID, head, essay, foot, ruler } from './_spread.ts';

const CX = 1128, CY = 548;
const SKILLS = ['证明', '测量', '编程', '分析', '翻译', '检索', '校对', '起草'];
const SKILL_EN = ['PROOF', 'MEASURE', 'CODE', 'ANALYSE', 'TRANSLATE', 'RETRIEVE', 'CHECK', 'DRAFT'];

export class Return implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;

    const order = lt < 1.4 ? 1 : lt < 2.4 ? 2 : lt < 3.4 ? 4 : 8;
    const teeth = order;
    const turn = lt > 4.4 ? (lt - 4.4) * (Math.PI / teeth) * 0.5 : 0;
    const pulse = 1 + 0.012 * Math.max(0, Math.exp(-((lt % 1) / 0.16)));
    const R = 292 * pulse;

    // ---- the teeth --------------------------------------------------------
    for (let k = 0; k < teeth; k++) {
      const born = k < 1 ? 0 : k < 2 ? 1.4 : k < 4 ? 2.4 : 3.4;
      const p = expo(clamp((lt - born) / 0.65));
      if (p <= 0) continue;
      const rot = turn + (k / teeth) * Math.PI * 2;
      // petal() is in local coordinates about (0,0); the wheel lives at (CX, CY)
      const pts = petal(R, 0, rot, { width: 0.26 }).map((q) => ({ x: CX + q.x, y: CY + q.y, w: q.w }));
      // reveal the whole petal to p: it is drawn as one stroke, out then home
      const n = Math.max(2, Math.floor(pts.length * p));
      const alt = k % 2;
      c.ink({ pts: pts.slice(0, n), dry: 0.18 + alt * 0.1, seed: 10 + k * 3.7, opacity: 1 - alt * 0.12 });
    }

    // ---- the centre: still the original dot ------------------------------
    c.ink({ pts: circle(CX, CY, 5.0 * (1 + 0.05 * Math.exp(-lt / 0.3)), 3.2, 26), dry: 0.05, seed: 2.2 });

    // ---- the instrument rings --------------------------------------------
    if (lt > 3.9) {
      const p = sstep(3.9, 4.9, lt);
      for (let r = 0; r < 2; r++) {
        const rr = R * (1.15 + r * 0.05);
        const pts: PW[] = [];
        for (let i = 0; i <= 140; i++) {
          const a = (i / 140) * Math.PI * 2;
          pts.push({ x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr, w: r === 0 ? 0.75 : 0.4 });
        }
        c.ink({ pts, dry: 0.32 + r * 0.2, seed: 90 + r, opacity: p * (r === 0 ? 0.52 : 0.26) });
      }
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const rr = R * 1.205;
        const len = i % 12 === 0 ? 9 : i % 4 === 0 ? 5 : 2.5;
        c.ink({
          pts: [
            { x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr, w: 0.42 },
            { x: CX + Math.cos(a) * (rr + len), y: CY + Math.sin(a) * (rr + len), w: 0.42 },
          ], dry: 0.4, seed: 200 + i * 0.7, opacity: p * 0.3,
        });
      }
    }

    // ---- the labels --------------------------------------------------------
    if (lt > 4.2) {
      c.type((ctx) => {
        for (let k = 0; k < 8; k++) {
          const rot = turn + (k / 8) * Math.PI * 2;
          const rr = R * 0.66;
          const x = CX + Math.cos(rot) * rr;
          const y = CY + Math.sin(rot) * rr;
          const a = sstep(4.2 + k * 0.08, 4.55 + k * 0.08, lt);
          if (a <= 0) continue;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot + Math.PI / 2);
          // no tab: the labels sit in the open space between the outward and home strokes
          ctx.globalAlpha = a * 0.88;
          ctx.fillStyle = '#15120E';
          ctx.font = '300 14px "NotoSerifSC", serif';
          ctx.textAlign = 'center';
          ctx.fillText(SKILLS[k], 0, 0);
          ctx.globalAlpha = a * 0.32;
          ctx.font = '300 6px "NotoSansSC", monospace';
          ctx.fillText(SKILL_EN[k], 0, 11);
          ctx.restore();
          ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 1;
      });
    }

    // ---- type --------------------------------------------------------------
    c.type((ctx) => {
      const ah = sstep(0.02, 0.3, lt) * (1 - sstep(7.4, 7.75, lt));
      head(ctx, { num: '终', tag: 'V  ·  T H E   W H E E L', alpha: ah });
      essay(ctx, ['一只手画出的线，', '现在有八只手', '一起握着了。'], { y: 164, alpha: sstep(0.1, 0.55, lt) * (1 - sstep(7.35, 7.7, lt)), size: 25, note: 'O N E   H A N D   ·   E I G H T   H A N D S' });
      const s2 = sstep(0.3, 0.8, lt);
      if (s2 > 0) {
        ctx.globalAlpha = s2 * 0.5;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 8.5px "NotoSansSC", monospace';
        ctx.fillText('S Y M M E T R Y   O R D E R', 96, 350);
        ctx.globalAlpha = s2 * 0.95;
        ctx.font = '200 34px "NotoSansSC", monospace';
        ctx.fillText(String(teeth).padStart(2, '0') + '×', 96, 392);
        ctx.globalAlpha = s2 * 0.26;
        ctx.font = '300 8px "NotoSansSC", monospace';
        ctx.fillText('C A P A B I L I T I E S   I N   R E A C H', 96, 410);
      }
      foot(ctx, 'F I G .  1 0   ·   T H E   W H E E L', { big: String(teeth), small: 'F O L D   S Y M M E T R Y' }, sstep(3.6, 4.2, lt));
    });
  }
}
