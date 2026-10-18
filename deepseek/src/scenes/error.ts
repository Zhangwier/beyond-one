// error.ts — 四 · 讹 (54–59s)  ·  THE WRONG ANSWER
//
// The film's honesty plate, and the only one shot in negative: the paper turns to ink, the
// ink to paper. It is a deliberate rupture in the visual grammar — chapter four is where the
// film stops admiring the machine.
//
// 54.0  a hard cut to negative, on the impact in the score. Everything stops.
// 54–55.5 a summary card is typeset: three confident sentences about a source. They are
//        wrong. The wrongness is not hidden: the card's own citation lines are shown beside
//        it, and each is bracketed in vermilion. The camera does not move. Nothing moves.
//        This is the only still stretch in the film, and it is the most uncomfortable.
// 55.5–56.5 the three sentences are struck through one at a time, on the beat, in vermilion —
//        the second of the two uses of that colour. The strike is the person's.
// 56.5–59  a dissonant tone holds. The card does not disappear; it *stays*, struck through,
//        and a single line of type replaces the confident one: 这段是错的。
//        The film does not resolve the error. It holds it.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, hash } from '../engine/core.ts';
import { line, pt, type PW } from './_lib.ts';
import { GRID, head, essay, foot } from './_spread.ts';

const CLAIMS = [
  { zh: '该文证明：扩散模型的误差', src: 'L 1 – 2' },
  { zh: '上界与维度无关。', src: 'L 3 – 5' },
  { zh: '因此可以无限加深网络。', src: 'L 6 – 9' },
];

export class Error implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;

    // ---- the negative -----------------------------------------------------
    // full inversion, with a short flash on the cut
    const cutFlash = lt < 0.10 ? 0.55 * (1 - lt / 0.10) : 0;
    c.post.invert = clamp(sstep(0.0, 0.06, lt) - cutFlash * 0.0);
    c.post.fadeInk = 1;

    const x0 = 640, y0 = 288;

    // the card: a rule above, a rule below, nothing else. No box, no shadow.
    c.ink({ pts: [pt(x0 - 40, y0 - 84, 0.8), pt(x0 + 880, y0 - 84, 0.8)], dry: 0.1, seed: 1.2, opacity: 0.45 });
    c.ink({ pts: [pt(x0 - 40, y0 + 268, 0.8), pt(x0 + 880, y0 + 268, 0.8)], dry: 0.1, seed: 2.2, opacity: 0.45 });

    // ---- the three confident sentences -----------------------------------
    for (let i = 0; i < CLAIMS.length; i++) {
      const a = sstep(0.15 + i * 0.28, 0.6 + i * 0.28, lt);
      if (a <= 0) continue;
      c.type((ctx) => {
        ctx.fillStyle = '#E9E2D3';
        ctx.globalAlpha = a * 0.96;
        ctx.font = '300 40px "NotoSerifSC", serif';
        ctx.fillText(CLAIMS[i].zh, x0, y0 + i * 74);
        // the citation, small, right under the claim: the evidence is present, and wrong
        ctx.globalAlpha = a * 0.4;
        ctx.font = '300 10px "NotoSansSC", monospace';
        ctx.fillText('S O U R C E   ' + CLAIMS[i].src, x0, y0 + i * 74 + 26);
        ctx.globalAlpha = 1;
      });
    }

    // ---- the strikes ------------------------------------------------------
    for (let i = 0; i < CLAIMS.length; i++) {
      const born = 1.55 + i * 0.5;
      const p = expo(clamp((lt - born) / 0.32));
      if (p <= 0) continue;
      const yy = y0 + i * 74 - 12;
      const len = 700 * p;
      c.accent((ctx) => {
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = '#B7351F';
        ctx.fillRect(x0 - 6, yy, len, 3);
        // a second, thinner stroke slightly below, as if struck twice
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x0 - 6, yy + 5, len * 0.97, 1.2);
      });
    }

    // ---- the correction ---------------------------------------------------
    if (lt > 3.0) {
      const p = sstep(3.0, 3.6, lt);
      c.type((ctx) => {
        ctx.fillStyle = '#E9E2D3';
        ctx.globalAlpha = p * 0.95;
        ctx.font = '300 34px "NotoSerifSC", serif';
        ctx.fillText('这段是错的。', x0, y0 + 330);
        ctx.globalAlpha = p * 0.4;
        ctx.font = '300 10px "NotoSansSC", monospace';
        ctx.fillText('T H I S   I S   W R O N G   ·   A N D   I T   R E A D S   F I N E', x0, y0 + 356);
        ctx.globalAlpha = 1;
      });
      // a measured bracket around the struck card: the error is contained, addressed
      const q = sstep(3.2, 3.8, lt);
      if (q > 0) {
        c.ink({ pts: [{ x: x0 - 74, y: y0 - 104, w: 1.0 }, { x: x0 - 96, y: y0 - 104, w: 1.0 }, { x: x0 - 96, y: y0 + 288, w: 1.0 }, { x: x0 - 74, y: y0 + 288, w: 1.0 }], dry: 0.08, seed: 8.1, opacity: 0.7 * q });
        c.type((ctx) => {
          ctx.fillStyle = '#E9E2D3';
          ctx.globalAlpha = q * 0.6;
          ctx.font = '300 9px "NotoSansSC", monospace';
          ctx.save();
          ctx.translate(x0 - 106, y0 + 92);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText('H A L L U C I N A T I O N   ·   C O N T A I N E D', 0, 0);
          ctx.restore();
          ctx.globalAlpha = 1;
        });
      }
    }

    // ---- the frame's own type --------------------------------------------
    c.type((ctx) => {
      const ah = sstep(0.05, 0.4, lt);
      ctx.fillStyle = '#E9E2D3';
      ctx.textAlign = 'left';
      ctx.globalAlpha = ah * 0.92;
      ctx.font = '300 15px "NotoSerifSC", serif';
      ctx.fillText('四', 96, 92);
      ctx.globalAlpha = ah * 0.4;
      ctx.font = '300 8.5px "NotoSansSC", monospace';
      ctx.fillText('I V  ·  I T   I S   W R O N G', 116, 91);
      ctx.globalAlpha = ah * 0.85;
      ctx.font = '300 26px "NotoSerifSC", serif';
      ctx.fillText('它答得很像。', 96, 170);
      ctx.fillText('像，不等于对。', 96, 208);
      ctx.globalAlpha = ah * 0.28;
      ctx.font = '300 8.5px "NotoSansSC", monospace';
      ctx.fillText('C O N F I D E N C E   ≠   C O R R E C T N E S S', 96, 232);
      ctx.globalAlpha = ah * 0.3;
      ctx.font = '300 8px "NotoSansSC", monospace';
      ctx.fillText('F I G .  0 8   ·   A   W R O N G   S U M M A R Y', 96, H - 78);
      ctx.globalAlpha = 1;
    });
  }
}
