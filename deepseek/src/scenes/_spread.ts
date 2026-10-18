// _spread.ts — the film's page grammar.
//
// Every plate is a spread in a drawn treatise: a left column of type, a right field of
// drawing, a footer of measurements. Fixing the grid once is what lets thirteen plates
// look like one object, and it keeps text out of the drawing.
import type { Ctx } from '../engine/engine.ts';
import { W, H, sstep } from '../engine/core.ts';

export const GRID = {
  typeX: 96,
  typeW: 318,
  fieldX0: 452,
  fieldX1: W - 96,      // 1824
  fieldY0: 118,
  fieldY1: H - 132,     // 948
  footY: H - 78,
};

export type HeadOpts = {
  num: string;          // 序 / 一 / 二 …
  tag: string;          // latin kicker
  alpha?: number;
};

export function head(ctx: CanvasRenderingContext2D, o: HeadOpts) {
  const a = o.alpha ?? 1;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#15120E';
  ctx.globalAlpha = a * 0.92;
  ctx.font = '300 15px "NotoSerifSC", serif';
  ctx.fillText(o.num, GRID.typeX, 92);
  ctx.globalAlpha = a * 0.40;
  ctx.font = '300 8.5px "NotoSansSC", monospace';
  // the kicker is written with spaces between letters, so it needs no tracking
  ctx.fillText(o.tag.replace(/  +/g, ' '), GRID.typeX + 22, 91);
  ctx.globalAlpha = a * 0.18;
  ctx.fillRect(GRID.typeX, 104, 120, 1);
  ctx.restore();
}

/** the essay's voice: two or three lines, never more. */
export function essay(ctx: CanvasRenderingContext2D, lines: string[], o: { y?: number; alpha?: number; size?: number; note?: string } = {}) {
  const size = o.size ?? 27;
  const y = o.y ?? 152;
  const a = o.alpha ?? 1;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#15120E';
  ctx.font = `300 ${size}px "NotoSerifSC", serif`;
  for (let i = 0; i < lines.length; i++) {
    ctx.globalAlpha = a * 0.9;
    ctx.fillText(lines[i], GRID.typeX, y + i * (size * 1.55));
  }
  if (o.note) {
    ctx.globalAlpha = a * 0.28;
    ctx.font = '300 8.5px "NotoSansSC", monospace';
    ctx.fillText(o.note, GRID.typeX, y + lines.length * (size * 1.55) + 6);
  }
  ctx.restore();
}

export function foot(ctx: CanvasRenderingContext2D, left: string, right?: { big: string; small: string }, alpha = 1) {
  ctx.save();
  ctx.fillStyle = '#15120E';
  ctx.textAlign = 'left';
  ctx.globalAlpha = alpha * 0.32;
  ctx.font = '300 8.5px "NotoSansSC", monospace';
  ctx.fillText(left, GRID.typeX, GRID.footY);
  if (right) {
    ctx.textAlign = 'right';
    ctx.globalAlpha = alpha * 0.9;
    ctx.font = '200 40px "NotoSansSC", monospace';
    ctx.fillText(right.big, GRID.fieldX1, GRID.footY + 4);
    ctx.globalAlpha = alpha * 0.32;
    ctx.font = '300 8.5px "NotoSansSC", monospace';
    ctx.fillText(right.small, GRID.fieldX1, GRID.footY - 42);
  }
  ctx.restore();
}

/** a hairline tick ruler along the bottom of the field — the film's measuring stick */
export function ruler(ctx: CanvasRenderingContext2D, progress: number, alpha = 0.3) {
  const x0 = GRID.fieldX0, x1 = GRID.fieldX1, y = GRID.fieldY1 + 26;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#15120E';
  ctx.fillRect(x0, y, x1 - x0, 1);
  for (let i = 0; i <= 40; i++) {
    const on = i / 40 <= progress;
    const h = i % 10 === 0 ? 7 : i % 5 === 0 ? 4 : 2;
    ctx.globalAlpha = alpha * (on ? 1 : 0.3);
    ctx.fillRect(x0 + ((x1 - x0) * i) / 40, y, 1, h);
  }
  ctx.restore();
}
