// close.ts — 终 · 一句话 (78–84s)
//
// The film's last act, and its only direct address to the audience.
//
// 78.0   the spiral has left the frame. What is left is the paper and a single hairline
//        crossing the bottom of the page — the trace the stroke made as it went.
// 78–80  the page empties. One line of type is set, and it is not a slogan: it is the exact
//        question the film has been asking, stated plainly, at the size of a title.
// 80–82  the line is "measured": a thin rule runs under it, a bracket marks its length, and
//        a small number beneath it counts the words — the film's final instrument reading,
//        which is deliberately mundane. The grand claim is made small and checkable.
// 82–84  a single dot appears at the end of the line. It is the same dot as frame one of the
//        film, the same size, in the same place relative to the sentence. The film closes on
//        the mark it opened with, and the last thing the audience reads is the sentence.
//
// The final sentence:
//   当智能不再只来自你自己的大脑，
//   你能抵达的边界，就不再是你一个人的边界。
// and, small, beneath it:
//   所以用它。然后自己判断。
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, easeOut } from '../engine/core.ts';
import { line, pt, circle, type PW } from './_lib.ts';
import { GRID, head, foot } from './_spread.ts';

const CX = W / 2;

export class Close implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;

    // ---- the trace leaving the page --------------------------------------
    // the spiral's tail continues off-screen for the first second, then is gone
    const tail = 1 - clamp(lt / 1.1);
    if (tail > 0) {
      const pts: PW[] = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        pts.push({ x: lerp(-40, W + 200, u), y: 900 + Math.sin(u * 2.6) * 18 - u * 40, w: 0.9 * tail });
      }
      c.ink({ pts, dry: 0.3, seed: 4.4, opacity: tail });
    }

    // ---- the sentence ------------------------------------------------------
    // set one line at a time, on the beat: 78.4, 79.4
    const l1 = sstep(0.4, 1.3, lt);
    const l2 = sstep(1.4, 2.3, lt);
    const y1 = 452, y2 = 528;

    c.type((ctx) => {
      ctx.fillStyle = '#15120E';
      ctx.textAlign = 'center';
      // line one
      if (l1 > 0) {
        const size = 52;
        ctx.font = `300 ${size}px "NotoSerifSC", serif`;
        const chars = [...'当智能不再只来自你自己的大脑，'];
        const total = ctx.measureText('当智能不再只来自你自己的大脑，').width;
        let x = CX - total / 2;
        ctx.textAlign = 'left';
        for (let i = 0; i < chars.length; i++) {
          const w = ctx.measureText(chars[i]).width;
          const p = clamp(l1 * chars.length * 0.8 - i * 0.8 + 0.8);
          if (p > 0) {
            ctx.globalAlpha = 0.95 * p;
            ctx.fillText(chars[i], x, y1 + (1 - easeOut(p)) * 12);
          }
          x += w;
        }
      }
      // line two
      if (l2 > 0) {
        const size = 52;
        ctx.font = `300 ${size}px "NotoSerifSC", serif`;
        const str = '你能抵达的边界，就不再是一个人的边界。';
        const total = ctx.measureText(str).width;
        let x = CX - total / 2;
        ctx.textAlign = 'left';
        const chars = [...str];
        for (let i = 0; i < chars.length; i++) {
          const w = ctx.measureText(chars[i]).width;
          const p = clamp(l2 * chars.length * 0.8 - i * 0.8 + 0.8);
          if (p > 0) {
            ctx.globalAlpha = 0.95 * p;
            ctx.fillText(chars[i], x, y2 + (1 - easeOut(p)) * 12);
          }
          x += w;
        }
      }
      ctx.textAlign = 'center';
      ctx.globalAlpha = 1;
    });

    // ---- the measurement of the sentence ----------------------------------
    if (lt > 2.6) {
      const p = expo(clamp((lt - 2.6) / 0.9));
      const half = 560 * p;
      c.ink({ pts: [{ x: CX - half, y: 596, w: 0.6 }, { x: CX + half, y: 596, w: 0.6 }], dry: 0.14, seed: 21.1, opacity: 0.45 });
      // bracket ends
      c.ink({ pts: [{ x: CX - half, y: 590, w: 0.6 }, { x: CX - half, y: 602, w: 0.6 }], dry: 0.1, seed: 22.1, opacity: 0.45 });
      c.ink({ pts: [{ x: CX + half, y: 590, w: 0.6 }, { x: CX + half, y: 602, w: 0.6 }], dry: 0.1, seed: 23.1, opacity: 0.45 });
      c.type((ctx) => {
        ctx.fillStyle = '#15120E';
        ctx.textAlign = 'center';
        ctx.globalAlpha = p * 0.32;
        ctx.font = '300 9px "NotoSansSC", monospace';
        ctx.fillText('2 4 字  ·  2 5 画  ·  一 个 句 号', CX, 622);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      });
    }

    // ---- the last word ------------------------------------------------------
    const last = sstep(4.2, 5.0, lt);
    if (last > 0) {
      c.type((ctx) => {
        ctx.fillStyle = '#15120E';
        ctx.textAlign = 'center';
        ctx.globalAlpha = last * 0.92;
        ctx.font = '300 26px "NotoSerifSC", serif';
        ctx.fillText('所以用它。', CX - 96, 764);
        ctx.globalAlpha = last * 0.92;
        ctx.fillText('然后自己判断。', CX + 108, 764);
        // the mark between the two clauses: a single full stop, the film's first mark
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      });
      // the full stop, drawn, between the two sentences
      const dp = expo(clamp((lt - 4.9) / 0.4));
      if (dp > 0) c.ink({ pts: circle(CX, 756, 3.4 * dp, 2.6, 24), dry: 0.05, seed: 2.2, opacity: 1 });
      // the two rules that hold the clauses apart
      const rp = sstep(4.6, 5.2, lt);
      c.ink({ pts: [{ x: CX - 220, y: 730, w: 0.55 }, { x: CX - 26, y: 730, w: 0.55 }], dry: 0.16, seed: 31, opacity: 0.3 * rp });
      c.ink({ pts: [{ x: CX + 26, y: 730, w: 0.55 }, { x: CX + 236, y: 730, w: 0.55 }], dry: 0.16, seed: 32, opacity: 0.3 * rp });
    }

    // ---- the colophon ------------------------------------------------------
    c.type((ctx) => {
      const a = sstep(4.8, 5.6, lt);
      if (a <= 0) return;
      ctx.fillStyle = '#15120E';
      ctx.textAlign = 'center';
      ctx.globalAlpha = a * 0.34;
      ctx.font = '300 8.5px "NotoSansSC", monospace';
      ctx.fillText('A   F I L M   W R I T T E N   I N   C O D E   ·   8 4   S E C O N D S   ·   6 0   B P M', CX, 956);
      ctx.globalAlpha = a * 0.22;
      ctx.fillText('超 出 一 人 之 力   ·   B E Y O N D   O N E', CX, 976);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    });

    // ---- the page finally empties, except the mark -------------------------
    // (the film ends on paper, not on black)
    if (lt > 5.2) {
      c.post.fade = 1;
    }
  }
}
