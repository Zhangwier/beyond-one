// type.ts — the film's typographic system.
// Two voices only: a Song serif (the human, the essay) and a grotesk/mono (the machine,
// annotations, coordinates). Every glyph is placed individually so any character can be
// moved, rotated, revealed or turned into points without leaving the same layout.
import { W, H } from './core.ts';

export type FontSpec = {
  css: string;
  family: string;
  weight: number;
  cjk: boolean;
};

export const F = {
  /** essay voice — Noto Serif SC */
  serif: (w = 400): FontSpec => ({ css: `"NotoSerifSC", serif`, family: 'NotoSerifSC', weight: w, cjk: true }),
  /** machine voice — Noto Sans SC, wide tracking, small caps feel */
  sans: (w = 400): FontSpec => ({ css: `"NotoSansSC", sans-serif`, family: 'NotoSansSC', weight: w, cjk: true }),
  /** latin mono — coordinates, counters, plate numbers */
  mono: (w = 400): FontSpec => ({ css: `"NotoSansSC", monospace`, family: 'NotoSansSC', weight: w, cjk: false }),
};

let ready = false;
export async function loadFonts(): Promise<void> {
  if (ready) return;
  const faces = [
    new FontFace('NotoSerifSC', 'url(/fonts/NotoSerifSC-VF.ttf)', { weight: '200 900' }),
    new FontFace('NotoSansSC', 'url(/fonts/NotoSansSC-VF.ttf)', { weight: '100 900' }),
  ];
  await Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff))));
  await document.fonts.ready;
  ready = true;
}

export function fontCss(spec: FontSpec, size: number): string {
  return `${spec.weight} ${size}px ${spec.css}`;
}

/** Measure one line with tracking (px, can be negative). */
export function measure(ctx: CanvasRenderingContext2D, text: string, spec: FontSpec, size: number, tracking = 0): number {
  ctx.font = fontCss(spec, size);
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return w - (text.length ? tracking : 0);
}

export type Glyph = { ch: string; x: number; w: number; i: number };

export function layout(ctx: CanvasRenderingContext2D, text: string, spec: FontSpec, size: number, tracking = 0): Glyph[] {
  ctx.font = fontCss(spec, size);
  const out: Glyph[] = [];
  let x = 0;
  let i = 0;
  for (const ch of text) {
    const w = ctx.measureText(ch).width;
    out.push({ ch, x, w, i: i++ });
    x += w + tracking;
  }
  return out;
}

export type TextOpts = {
  spec?: FontSpec;
  size?: number;
  tracking?: number;
  align?: 'left' | 'center' | 'right';
  baseline?: 'alphabetic' | 'middle' | 'top';
  color?: string;
  alpha?: number;
  /** per-glyph transform: return dx, dy, rot, scale, alpha */
  glyph?: (g: Glyph, k: number, n: number) => { dx?: number; dy?: number; rot?: number; scale?: number; alpha?: number; color?: string } | void;
  /** reveal: 0..1 number of glyphs visible (fractional = partial glyph) */
  reveal?: number;
  /** vertical clip: 0..1 amount of the line's height shown (wipe from top) */
  wipe?: number;
  stroke?: number; // stroke width; outline type when > 0
};

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: TextOpts = {}): number {
  const spec = o.spec ?? F.serif();
  const size = o.size ?? 64;
  const tracking = o.tracking ?? 0;
  const glyphs = layout(ctx, text, spec, size, tracking);
  const total = glyphs.length ? glyphs[glyphs.length - 1].x + glyphs[glyphs.length - 1].w : 0;
  let ox = x;
  if (o.align === 'center') ox = x - total / 2;
  if (o.align === 'right') ox = x - total;

  ctx.save();
  if (o.wipe !== undefined) {
    const top = o.baseline === 'middle' ? y - size * 0.75 : y - size * 0.95;
    ctx.beginPath();
    ctx.rect(ox - size, top, total + size * 2, size * 1.3 * o.wipe);
    ctx.clip();
  }
  ctx.font = fontCss(spec, size);
  ctx.textBaseline = (o.baseline === 'middle' ? 'middle' : o.baseline === 'top' ? 'top' : 'alphabetic') as CanvasTextBaseline;
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) { ctx.restore(); return total; }
  const n = glyphs.length;
  const reveal = o.reveal ?? 1;
  for (let k = 0; k < n; k++) {
    const g = glyphs[k];
    if (reveal <= 0) break;
    const frac = Math.min(1, Math.max(0, reveal * n - k));
    if (frac <= 0) break;
    const tr = (o.glyph ? o.glyph(g, k, n) : {}) || {};
    ctx.save();
    const px = ox + g.x + (tr.dx ?? 0);
    const py = y + (tr.dy ?? 0);
    if (tr.rot || tr.scale !== undefined) {
      ctx.translate(px + g.w / 2, py);
      if (tr.rot) ctx.rotate(tr.rot);
      if (tr.scale !== undefined) ctx.scale(tr.scale, tr.scale);
      ctx.translate(-(px + g.w / 2), -py);
    }
    ctx.globalAlpha = alpha * (tr.alpha ?? 1);
    ctx.fillStyle = tr.color ?? o.color ?? '#15120E';
    if (frac < 1) {
      // partial glyph: reveal left→right by clipping the glyph box
      ctx.beginPath();
      ctx.rect(ox + g.x - 2, py - size * 1.3, g.w * frac + 2, size * 2.6);
      ctx.clip();
    }
    if (o.stroke) {
      ctx.strokeStyle = ctx.fillStyle as string;
      ctx.lineWidth = o.stroke;
      ctx.strokeText(g.ch, ox + g.x + (tr.dx ?? 0) * 0, y + (tr.dy ?? 0) * 0 + 0, 0);
    }
    ctx.fillText(g.ch, ox + g.x + (tr.dx ?? 0) * 0, y + (tr.dy ?? 0) * 0);
    ctx.restore();
  }
  ctx.restore();
  return total;
}

/** An offscreen mask of a string (white on transparent) for point sampling and shader masks. */
export function textCanvas(text: string, spec: FontSpec, size: number, tracking = 0, pad = 40): { canvas: HTMLCanvasElement; w: number; h: number } {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const w0 = measure(ctx, text, spec, size, tracking);
  c.width = Math.ceil(w0 + pad * 2);
  c.height = Math.ceil(size * 1.6 + pad * 2);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  drawText(ctx, text, pad, c.height / 2, { spec, size, tracking, baseline: 'middle', color: '#fff' });
  return { canvas: c, w: w0, h: size };
}

/** Deterministic point sampling of a text mask — the glyphs become a cloud of ink dots. */
export function textPoints(text: string, spec: FontSpec, size: number, step = 4): { x: number; y: number }[] {
  const { canvas, w, h } = textCanvas(text, spec, size, 0, 10);
  const ctx = canvas.getContext('2d')!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const pts: { x: number; y: number }[] = [];
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const a = data[(y * canvas.width + x) * 4 + 3];
      if (a > 120) pts.push({ x: x - 10 - w / 2, y: y - canvas.height / 2 });
    }
  }
  return pts;
}
