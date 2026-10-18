// stitch.ts — 三 · 缝合 (46–50s)  ·  THE SEAMS
//
// The film's close-up on craft: what "it writes the program" physically looks like. No code
// rain, no floating brackets. A real listing, legible, and the interest is in the *seams* —
// the three places where the machine's output had to be joined to the person's intent.
//
// 46–47.2   ten lines of Python type out, line by line, in the machine voice.
// 47.2–48.7 three seams are marked in vermilion: an off-by-one range, a silent `except`, an
//           undefined name. These are the only three marks of that colour in the chapter,
//           and the film does not mock them — they are exactly why review exists.
// 48.7–50   the reach runs down the margin, touching each seam, and the count says 3.
//           The listing stays complete: nothing is fixed here. Fixing is chapter four.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, hash } from '../engine/core.ts';
import { line, pt, type PW } from './_lib.ts';
import { reach } from './_motif.ts';
import { GRID, head, essay, foot } from './_spread.ts';

const CODE = [
  { t: 'def sample(model, prompt, k=8, T=0.7):', seam: 0 },
  { t: '    out = []', seam: 0 },
  { t: '    for i in range(k+1):', seam: 1 },
  { t: '        logits = model(prompt, temp=T)', seam: 0 },
  { t: '        try:', seam: 0 },
  { t: '            tok = top_k(logits, 1)', seam: 0 },
  { t: '        except Exception:', seam: 2 },
  { t: '            tok = fallback', seam: 0 },
  { t: '        out.append(tok)', seam: 0 },
  { t: '    return out[:k] if overwrite else out', seam: 3 },
];
const SEAMS = [
  { line: 2, note: '多抽了一个', en: 'o f f - b y - o n e', why: 'k + 1 次，不是 k 次' },
  { line: 6, note: '异常被吞掉了', en: 's i l e n t   e x c e p t', why: '出错时它不告诉你' },
  { line: 9, note: '变量并不存在', en: 'u n d e f i n e d   n a m e', why: '运行到这一行就会崩' },
];

export class Stitch implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;
    const x0 = 604, y0 = 196, lh = 38;

    // ---- the listing ------------------------------------------------------
    const typed = expo(clamp(lt / 1.1));
    const n = Math.floor(CODE.length * typed);
    c.type((ctx) => {
      ctx.font = '300 20px "NotoSansSC", monospace';
      for (let i = 0; i <= n && i < CODE.length; i++) {
        const p = i < n ? 1 : typed * CODE.length - n;
        ctx.globalAlpha = 0.9 * p;
        ctx.fillStyle = '#15120E';
        ctx.fillText(CODE[i].t, x0, y0 + i * lh);
      }
      ctx.font = '300 9px "NotoSansSC", monospace';
      for (let i = 0; i < CODE.length; i++) {
        if (i > n) break;
        ctx.globalAlpha = 0.2 * (i < n ? 1 : typed * CODE.length - n);
        ctx.fillStyle = '#15120E';
        ctx.fillText(String(i + 1).padStart(2, '0'), x0 - 34, y0 + i * lh);
      }
      ctx.globalAlpha = 1;
    });

    // ---- the three seams --------------------------------------------------
    for (let s = 0; s < SEAMS.length; s++) {
      const sm = SEAMS[s];
      const born = 1.15 + s * 0.5;
      const p = expo(clamp((lt - born) / 0.4));
      if (p <= 0) continue;
      const yy = y0 + sm.line * lh;
      c.accent((ctx) => {
        ctx.globalAlpha = 0.92 * p;
        ctx.fillStyle = '#B7351F';
        ctx.fillRect(x0 - 8, yy + 7, 470 * p, 2.2);
        ctx.fillRect(x0 - 8, yy + 1, 2, 9);
      });
      if (p > 0.7) {
        const q = (p - 0.7) / 0.3;
        c.ink({ pts: [{ x: x0 - 46, y: yy - 12, w: 0.7 }, { x: x0 - 56, y: yy - 12, w: 0.7 }, { x: x0 - 56, y: yy + 12, w: 0.7 }, { x: x0 - 46, y: yy + 12, w: 0.7 }], dry: 0.1, seed: 200 + s, opacity: 0.55 * q });
        // a leader to the note in the right margin
        c.ink({ pts: [pt(x0 + 470, yy + 8, 0.5), pt(1440, yy + 8, 0.5)], dry: 0.24, seed: 210 + s, opacity: 0.28 * q });
        c.type((ctx) => {
          ctx.globalAlpha = q * 0.86;
          ctx.fillStyle = '#15120E';
          ctx.font = '300 7.5px "NotoSansSC", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(['①', '②', '③'][s], x0 - 62, yy + 4);
          ctx.textAlign = 'left';
          ctx.globalAlpha = q * 0.72;
          ctx.font = '300 14px "NotoSerifSC", serif';
          ctx.fillText(sm.note, 1452, yy + 2);
          ctx.globalAlpha = q * 0.3;
          ctx.font = '300 7px "NotoSansSC", monospace';
          ctx.fillText(sm.en, 1452, yy + 16);
          ctx.globalAlpha = q * 0.4;
          ctx.font = '300 10px "NotoSerifSC", serif';
          ctx.fillText(sm.why, 1452, yy + 32);
          ctx.globalAlpha = 1;
        });
      }
    }

    // ---- the reach down the margin ---------------------------------------
    if (lt > 2.7) {
      const p = expo(clamp((lt - 2.7) / 1.3));
      const top = y0 - 34;
      const bot = y0 + CODE.length * lh - 20;
      c.ink(reach({ from: { x: 540, y: top }, to: { x: 540, y: lerp(top, bot + 30, p) }, bow: 0, err: 1.1, th: 1.6, taper: 0.1, dry: 0.28, seed: 5.2 }));
      for (let s = 0; s < SEAMS.length; s++) {
        const yy = y0 + SEAMS[s].line * lh;
        if (lerp(top, bot + 30, p) > yy) {
          c.ink({ pts: [{ x: 531, y: yy - 8, w: 0.6 }, { x: 549, y: yy + 8, w: 0.6 }], dry: 0.1, seed: 220 + s, opacity: 0.5 });
        }
      }
    }

    // ---- type -------------------------------------------------------------
    c.type((ctx) => {
      const ah = sstep(0.02, 0.28, lt) * (1 - sstep(3.8, 4.05, lt));
      head(ctx, { num: '三', tag: 'I I I  ·  T H E   S E A M S', alpha: ah });
      essay(ctx, ['它写得很快。', '缝在哪儿，', '你得自己看。'], { y: 164, alpha: sstep(0.08, 0.5, lt) * (1 - sstep(3.75, 4.0, lt)), size: 25, note: 'I T   W R I T E S   F A S T' });
      const s2 = sstep(0.3, 0.8, lt);
      if (s2 > 0) {
        const found = clamp(Math.floor((lt - 1.15) / 0.5) + 1, 0, 3);
        ctx.globalAlpha = s2 * 0.5;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 8.5px "NotoSansSC", monospace';
        ctx.fillText('S E A M S   F O U N D', 96, 356);
        ctx.globalAlpha = s2 * 0.95;
        ctx.font = '200 40px "NotoSansSC", monospace';
        ctx.fillText('0' + found, 96, 400);
        ctx.globalAlpha = s2 * 0.26;
        ctx.font = '300 8px "NotoSansSC", monospace';
        ctx.fillText('R E V I E W   R E Q U I R E D', 96, 420);
        for (let i = 0; i < 3; i++) {
          const on = found > i;
          ctx.globalAlpha = s2 * (on ? 0.85 : 0.16);
          ctx.fillStyle = on ? '#B7351F' : '#15120E';
          ctx.fillRect(96 + i * 16, 438, 10, on ? 2 : 1);
        }
        ctx.fillStyle = '#15120E';
        ctx.globalAlpha = 1;
      }
      foot(ctx, 'F I G .  0 6   ·   S E A M S', undefined, sstep(0.3, 0.8, lt));
    });
  }
}
