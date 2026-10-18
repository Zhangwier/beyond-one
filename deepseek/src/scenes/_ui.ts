// _ui.ts — the film's annotation voice: small mono labels, hairlines, measured numbers.
// Nothing here is decoration; every call is a measurement the audience can read.
export const MONO = { css: '"NotoSansSC", monospace', family: 'NotoSansSC', weight: 300, cjk: false } as const;
export const SANS = { css: '"NotoSansSC", sans-serif', family: 'NotoSansSC', weight: 300, cjk: true } as const;
export const SERIF = { css: '"NotoSerifSC", serif', family: 'NotoSerifSC', weight: 300, cjk: true } as const;

export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: {
  size?: number; alpha?: number; color?: string; align?: CanvasTextAlign; track?: number; weight?: number;
} = {}) {
  const size = o.size ?? 12;
  const track = o.track ?? 1.6;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 0.6;
  ctx.fillStyle = o.color ?? '#15120E';
  ctx.font = `${o.weight ?? 300} ${size}px "NotoSansSC", monospace`;
  ctx.textAlign = o.align ?? 'left';
  if (track) {
    // letter spacing for the machine voice
    const chars = [...text];
    const widths = chars.map((c) => ctx.measureText(c).width + track);
    const total = widths.reduce((a, b) => a + b, 0) - (chars.length ? track : 0);
    let x0 = x;
    if ((o.align ?? 'left') === 'center') x0 = x - total / 2;
    if ((o.align ?? 'left') === 'right') x0 = x - total;
    let px = x0;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], px, y);
      px += widths[i];
    }
    ctx.textAlign = prevAlign;
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

export function hair(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, alpha = 0.25, w = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#15120E';
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

/** a live counter that rolls without flicker: deterministic on time, not on frames */
export function counter(v: number, digits = 2, unit = ''): string {
  const s = Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(digits);
  return unit ? `${s} ${unit}` : s;
}

export function dwell(t: number, a: number, b: number, fade = 0.18): number {
  if (t < a - fade || t > b + fade) return 0;
  if (t < a) return (t - (a - fade)) / fade;
  if (t > b) return 1 - (t - b) / fade;
  return 1;
}

export function tickNumber(n: number, width = 2): string {
  const s = String(Math.max(0, Math.floor(n)));
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

/** A monospace column of coordinates, used as the film's "instrument" texture. */
export function coordColumn(ctx: CanvasRenderingContext2D, x: number, y: number, rows: string[], o: { alpha?: number; size?: number; gap?: number; align?: CanvasTextAlign } = {}) {
  const size = o.size ?? 11;
  const gap = o.gap ?? 18;
  ctx.save();
  ctx.font = `300 ${size}px "NotoSansSC", monospace`;
  ctx.textAlign = o.align ?? 'left';
  ctx.fillStyle = '#15120E';
  for (let i = 0; i < rows.length; i++) {
    ctx.globalAlpha = (o.alpha ?? 0.45) * (1 - i / (rows.length + 2));
    ctx.fillText(rows[i], x, y + i * gap);
  }
  ctx.restore();
}
