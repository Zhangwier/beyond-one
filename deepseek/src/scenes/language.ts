// language.ts — 二 · 语言 (34–40s)  ·  THE FOURTH VOICE
//
// The film's first close-up: one column of text becomes the page. This plate exists to show
// what "the machine reads it for you" physically looks like, without a single robot, cursor
// or chat bubble.
//
// 34–35    a paragraph of a foreign paper typesets into the field, right-aligned, dense.
//          It is real-looking technical prose in a field the person does not read.
// 35–37.5  the reach crosses it. Wherever the stroke passes, the text is *replaced by
//          structure*: margin brackets, a numbered claim, a formula, a citation trail.
//          This is the visual claim: reading becomes a map.
// 37.5–40  the structure folds down into three lines of plain Chinese — the machine's
//          summary — but the plate puts the *source* back on top of it: every summary line
//          is tethered by a hairline to the exact sentence it came from. The audience must
//          see that the summary is not free: it has a source, and the source is checkable.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, easeOut, hash } from '../engine/core.ts';
import { line, pt, rect, type PW } from './_lib.ts';
import { reach } from './_motif.ts';
import { GRID, head, essay, foot } from './_spread.ts';

// the foreign paragraph, as data: each line, and which summary it feeds
const PARA = [
  'We consider the asymptotic behaviour of the',
  'reverse process under a bounded score error,',
  'and show that the KL divergence between the',
  'learned and true marginals is controlled by',
  'the discretisation step times the Lipschitz',
  'constant of the drift, uniformly in t. This',
  'improves on the O(√ε) bound of Chen et al.',
  'by a factor of log(1/ε), at the cost of an',
  'additional assumption on the second moment.',
];
const SUM = [
  { zh: '结论：误差上界可以更紧。', src: [0, 2] },
  { zh: '条件：要求二阶矩有限。', src: [5, 8] },
  { zh: '代价：多一个假设。', src: [7, 8] },
];

export class Language implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;
    const x0 = 620, y0 = 210, lh = 34;

    // ---- the paragraph ----------------------------------------------------
    const typed = expo(clamp(lt / 1.15));
    const nLines = Math.floor(PARA.length * typed);
    c.type((ctx) => {
      ctx.fillStyle = '#15120E';
      ctx.font = '300 25px "NotoSerifSC", serif';
      for (let i = 0; i <= nLines && i < PARA.length; i++) {
        const p = i < nLines ? 1 : typed * PARA.length - nLines;
        ctx.globalAlpha = 0.86 * p;
        ctx.fillText(PARA[i], x0, y0 + i * lh);
      }
      // the citation column, in the machine voice: dense, grey, unreadable at a glance
      ctx.font = '300 8.5px "NotoSansSC", monospace';
      for (let i = 0; i < 9; i++) {
        ctx.globalAlpha = 0.17 * typed;
        ctx.fillText(`[${i + 1}] arXiv:2${i}0${i}9.0${(hash(i, 3) * 9999).toFixed(0).padStart(4, '0')}`, 1436, y0 + i * lh);
      }
      ctx.globalAlpha = 1;
    });

    // ---- the structure that reading reveals -------------------------------
    // The stroke sweeps down the paragraph; behind it, structure appears.
    if (lt > 1.0) {
      const sweep = expo(clamp((lt - 1.0) / 2.4));
      const sy = y0 - 44 + sweep * (PARA.length * lh + 10);

      // the reach itself, vertical, down the left margin of the paragraph
      c.ink(reach({
        from: { x: 588, y: y0 - 44 }, to: { x: 588, y: sy },
        bow: 0, bow2: 0, err: 1.0, th: 1.5, taper: 0.15, dry: 0.24, seed: 5.5,
      }));

      // margins: a bracket beside each claim, revealed as the sweep passes it
      for (let i = 0; i < PARA.length; i++) {
        const yy = y0 + i * lh;
        const seen = clamp((sy - yy + 60) / 90);
        if (seen <= 0) continue;
        c.ink({ pts: [{ x: 600, y: yy - 15, w: 0.7 }, { x: 608, y: yy - 15, w: 0.7 }, { x: 608, y: yy + 3, w: 0.7 }, { x: 600, y: yy + 3, w: 0.7 }], dry: 0.14, seed: 70 + i, opacity: 0.55 * seen });
      }
      // the three claims the paragraph is actually making, bracketed in the right margin
      const claims = [
        { l0: 0, l1: 2, label: '①' },
        { l0: 5, l1: 6, label: '②' },
        { l0: 7, l1: 8, label: '③' },
      ];
      for (const cl of claims) {
        const yA = y0 + cl.l0 * lh - 22, yB = y0 + cl.l1 * lh + 6;
        const seen = clamp((sy - yB + 80) / 90);
        if (seen <= 0) continue;
        const bx = 1424;
        c.ink({ pts: [{ x: bx, y: yA, w: 0.8 }, { x: bx + 9, y: yA, w: 0.8 }, { x: bx + 9, y: yB, w: 0.8 }, { x: bx, y: yB, w: 0.8 }], dry: 0.1, seed: 80 + cl.l0, opacity: 0.8 * seen });
        c.type((ctx) => {
          ctx.fillStyle = '#15120E';
          ctx.globalAlpha = 0.7 * seen;
          ctx.font = '300 11px "NotoSansSC", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(cl.label, bx - 8, (yA + yB) / 2 + 4);
          ctx.textAlign = 'left';
        });
      }
    }

    // ---- the summary, tethered to its source ------------------------------
    if (lt > 3.9) {
      const p = sstep(3.9, 4.5, lt);
      c.type((ctx) => {
        ctx.fillStyle = '#15120E';
        // a rule, then the three lines
        ctx.globalAlpha = p * 0.2;
        ctx.fillRect(x0, 588, 520, 1);
        for (let i = 0; i < SUM.length; i++) {
          const a = sstep(3.9 + i * 0.28, 4.35 + i * 0.28, lt);
          if (a <= 0) continue;
          ctx.globalAlpha = a * 0.92;
          ctx.font = '300 21px "NotoSerifSC", serif';
          ctx.fillText(SUM[i].zh, x0, 632 + i * 44);
          ctx.globalAlpha = a * 0.3;
          ctx.font = '300 8px "NotoSansSC", monospace';
          ctx.fillText(`S O U R C E   L ${SUM[i].src[0] + 1} – ${SUM[i].src[1] + 1}`, x0 + 246, 630 + i * 44);
        }
        ctx.globalAlpha = 1;
      });
      // the tethers: from each summary line back into the paragraph, entering at its source
      for (let i = 0; i < SUM.length; i++) {
        const a = sstep(4.15 + i * 0.28, 4.6 + i * 0.28, lt);
        if (a <= 0) continue;
        const ly = 632 + i * 44 - 6;
        const targetY = y0 + ((SUM[i].src[0] + SUM[i].src[1]) / 2) * lh - 8;
        // a single elbow that avoids the paragraph body: down, across, then up the gutter
        const gx = 512;
        const pts: PW[] = [
          { x: x0 - 12, y: ly, w: 0.5 },
          { x: gx, y: ly, w: 0.5 },
          { x: gx, y: targetY, w: 0.5 },
          { x: x0 - 12, y: targetY, w: 0.5 },
        ];
        c.ink({ pts, dry: 0.24, seed: 90 + i, opacity: 0.30 * a });
        // the arrival mark at the source line
        c.ink({ pts: [{ x: x0 - 4, y: targetY - 4, w: 0.5 }, { x: x0 - 10, y: targetY, w: 0.5 }, { x: x0 - 4, y: targetY + 4, w: 0.5 }], dry: 0.1, seed: 95 + i, opacity: 0.34 * a });
      }
    }

    // ---- the plate's type -------------------------------------------------
    c.type((ctx) => {
      const ah = sstep(0.02, 0.35, lt) * (1 - sstep(5.5, 5.85, lt));
      head(ctx, { num: '二', tag: 'I I  ·  R E A D I N G   A S   A   M A P', alpha: ah });
      essay(ctx, ['它先替你读懂，', '再让你决定', '信不信。'], { y: 168, alpha: sstep(0.1, 0.6, lt), size: 25, note: 'I T   R E A D S   F I R S T' });
      const s2 = sstep(0.5, 1.0, lt);
      if (s2 > 0) {
        ctx.globalAlpha = s2 * 0.42;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 9px "NotoSansSC", monospace';
        ctx.fillText('L A N G U A G E   ·   N O T   Y O U R S', 96, 344);
        ctx.globalAlpha = s2 * 0.32;
        ctx.font = '300 10px "NotoSerifSC", serif';
        ctx.fillText('一篇你不读的论文', 96, 372);
      }
      foot(ctx, 'F I G .  0 4   ·   S T R U C T U R E   F R O M   P R O S E', undefined, sstep(0.3, 0.8, lt));
    });
  }
}
