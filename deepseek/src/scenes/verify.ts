// verify.ts — 四 · 核 (59–64s)  ·  THE RETURN STROKE
//
// The film's answer to the error, and the moment its single motif earns its meaning.
//
// The preceding plate ended in negative: a confident summary, struck through, held. This
// plate does not cut away from it. It *stays in the negative* and does the one thing the
// film has never done: the reach **turns around**. For sixty-five seconds the mark has
// always gone outward from a centre. Here it leaves the person's hand, travels to the
// machine's card — and then comes back along a second path, looping at the far end, and
// terminates where it began. It is the only closed loop in the film, and it closes on the
// beat the dissonance resolves.
//
// 59.0   the card is still there, struck through. The loop begins at the bottom of the card.
// 59–61.2 the reach travels back: it re-enters the claim, follows the citation to the source
//        line, and *verifies* it — at each of the three strikes a small correction mark is
//        added, not an erasure: the error stays visible, the correction is written beside it.
// 61.2   the loop closes: the stroke returns to its origin and the paper comes back from
//        negative to bone, in one even dissolve — the film's only soft transition.
// 61.2–64 the card is re-set as a corrected note: the wrong claim in grey, the correction in
//        ink, and the source line now *opened* (a real citation with a page and a quote).
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, easeOut } from '../engine/core.ts';
import { line, pt, curve, circle, type PW } from './_lib.ts';
import { reach } from './_motif.ts';
import { GRID, head, essay, foot } from './_spread.ts';

const CLAIMS = [
  { zh: '该文证明：扩散模型的误差', src: 'L 1 – 2', fix: '只给出了上界，并未证明紧性。' },
  { zh: '上界与维度无关。', src: 'L 3 – 5', fix: '上界含 log d 项，与维度有关。' },
  { zh: '因此可以无限加深网络。', src: 'L 6 – 9', fix: '原文没有讨论网络深度。' },
];
const LH = 96; // line pitch: claim, source, correction

export class Verify implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;
    const x0 = 640, y0 = 288;

    // ---- the dissolve back to paper --------------------------------------
    // one even crossfade, timed to the loop closing at 2.2 s
    const back = sstep(2.15, 3.0, lt);
    c.post.invert = 1 - back;
    c.post.fadeInk = 1 - back;

    const inkCol = () => (back > 0.5 ? '#15120E' : '#E9E2D3');

    // the card's rules
    c.ink({ pts: [pt(x0 - 40, y0 - 84, 0.8), pt(x0 + 880, y0 - 84, 0.8)], dry: 0.1, seed: 1.2, opacity: 0.4 });
    c.ink({ pts: [pt(x0 - 40, y0 + 268, 0.8), pt(x0 + 880, y0 + 268, 0.8)], dry: 0.1, seed: 2.2, opacity: 0.4 });

    // ---- the wrong claims, kept ------------------------------------------
    for (let i = 0; i < CLAIMS.length; i++) {
      c.type((ctx) => {
        ctx.fillStyle = back > 0.5 ? '#6B655B' : '#8C8578';
        ctx.globalAlpha = 0.85;
        ctx.font = '300 34px "NotoSerifSC", serif';
        ctx.fillText(CLAIMS[i].zh, x0, y0 + i * LH);
        ctx.globalAlpha = 0.4;
        ctx.font = '300 9px "NotoSansSC", monospace';
        ctx.fillText('S O U R C E   ' + CLAIMS[i].src, x0, y0 + i * LH + 22);
        ctx.globalAlpha = 1;
      });
      // the strike stays
      c.accent((ctx) => {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#B7351F';
        ctx.fillRect(x0 - 6, y0 + i * LH - 10, 660, 2);
      });
    }

    // ---- the reach returns -----------------------------------------------
    // out along the left edge, around the far end, and back along the right edge, closing.
    // The bottom run is a wide, shallow arc: one continuous mark that turns around.
    const sweep = expo(clamp(lt / 2.2));
    const leftX = x0 - 74, rightX = x0 + 806;
    const topY = y0 - 116, botY = y0 + 3 * LH + 4;
    const pts: PW[] = [];
    const N = 260;
    const maxU = clamp(sweep, 0, 1);
    const arcY = botY + 54;
    for (let i = 0; i <= N * maxU; i++) {
      const u = i / N;
      let x: number, y: number;
      if (u < 0.24) {
        const k = u / 0.24;
        x = leftX; y = lerp(topY, botY, k);
      } else if (u < 0.46) {
        // the turn: a shallow arc below the card
        const k = (u - 0.24) / 0.22;
        const a = Math.PI + k * Math.PI;
        x = (leftX + rightX) / 2 + Math.cos(a) * (rightX - leftX) / 2;
        y = botY + Math.sin(a) * 0 + (1 - Math.cos(k * Math.PI)) * 0;
        y = botY + Math.sin(k * Math.PI) * 46;
      } else if (u < 0.70) {
        const k = (u - 0.46) / 0.24;
        x = rightX; y = lerp(botY, topY, k);
      } else if (u < 0.94) {
        const k = (u - 0.70) / 0.24;
        x = lerp(rightX, leftX, k); y = topY;
      } else {
        const k = (u - 0.94) / 0.06;
        x = leftX; y = lerp(topY, topY + 26, k);
      }
      pts.push({ x, y, w: Math.max(0.5, 1.9 * (1 - 0.45 * u)) });
    }
    c.ink({ pts, dry: 0.2 + 0.18 * sweep, seed: 6.6, opacity: 0.95 });

    // the arrowhead at the moving end, and a terminal tick when it closes
    if (pts.length > 3) {
      const a = pts[pts.length - 3], b = pts[pts.length - 1];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      c.ink({
        pts: [
          { x: b.x, y: b.y, w: 0.9 },
          { x: b.x - Math.cos(ang - 0.5) * 13, y: b.y - Math.sin(ang - 0.5) * 13, w: 0.7 },
        ], dry: 0.1, seed: 11.1, opacity: 0.9,
      });
      c.ink({
        pts: [
          { x: b.x, y: b.y, w: 0.9 },
          { x: b.x - Math.cos(ang + 0.5) * 13, y: b.y - Math.sin(ang + 0.5) * 13, w: 0.7 },
        ], dry: 0.1, seed: 12.1, opacity: 0.9,
      });
    }

    // ---- the three corrections, written beside the strikes ----------------
    for (let i = 0; i < CLAIMS.length; i++) {
      const born = 1.0 + i * 0.34;
      const p = sstep(born, born + 0.34, lt);
      if (p <= 0) continue;
      c.type((ctx) => {
        ctx.fillStyle = inkCol();
        ctx.globalAlpha = p * 0.9;
        ctx.font = '300 14px "NotoSerifSC", serif';
        ctx.fillText('↳ ' + CLAIMS[i].fix, x0 + 8, y0 + i * LH + 48);
        ctx.globalAlpha = 1;
      });
      // a small correction tick beside the number
      const q = expo(clamp((lt - born) / 0.3));
      c.ink({ pts: [{ x: x0 - 100, y: y0 + i * LH - 20, w: 0.8 }, { x: x0 - 94, y: y0 + i * LH - 14, w: 0.8 }, { x: x0 - 82, y: y0 + i * LH - 30, w: 0.8 }], dry: 0.1, seed: 300 + i, opacity: 0.85 * q });
    }

    // ---- the corrected note ------------------------------------------------
    if (lt > 2.6) {
      const p = sstep(2.6, 3.1, lt);
      c.type((ctx) => {
        ctx.fillStyle = '#15120E';
        ctx.globalAlpha = p * 0.95;
        ctx.font = '300 30px "NotoSerifSC", serif';
        ctx.fillText('改过来了。', x0, y0 + 3 * LH + 84);
        ctx.globalAlpha = p * 0.42;
        ctx.font = '300 10px "NotoSansSC", monospace';
        ctx.fillText('C O R R E C T E D   ·   S O U R C E   R E O P E N E D', x0, y0 + 3 * LH + 108);
        ctx.globalAlpha = p * 0.5;
        ctx.font = '300 9px "NotoSansSC", monospace';
        ctx.fillText('p . 1 1 4 ,   § 3 ,   " u n i f o r m l y   i n   t "', x0, y0 + 3 * LH + 128);
        ctx.globalAlpha = 1;
      });
    }

    // ---- type --------------------------------------------------------------
    c.type((ctx) => {
      const ink = inkCol();
      const ah = sstep(0.05, 0.4, lt);
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      ctx.globalAlpha = ah * 0.92;
      ctx.font = '300 15px "NotoSerifSC", serif';
      ctx.fillText('四', 96, 92);
      ctx.globalAlpha = ah * 0.4;
      ctx.font = '300 8.5px "NotoSansSC", monospace';
      ctx.fillText('I V  ·  T H E   R E T U R N   S T R O K E', 116, 91);
      ctx.globalAlpha = ah * 0.88;
      ctx.font = '300 25px "NotoSerifSC", serif';
      ctx.fillText('最后一句，', 96, 170);
      ctx.fillText('必须由人来说。', 96, 206);
      ctx.globalAlpha = ah * 0.28;
      ctx.font = '300 8.5px "NotoSansSC", monospace';
      ctx.fillText('T H E   L A S T   W O R D   I S   H U M A N', 96, 230);
      ctx.globalAlpha = ah * 0.3;
      ctx.font = '300 8px "NotoSansSC", monospace';
      ctx.fillText('F I G .  0 9   ·   C L O S E D   L O O P', 96, H - 78);
      ctx.globalAlpha = 1;
    });
  }
}
