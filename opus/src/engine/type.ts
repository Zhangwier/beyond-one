// Typography system. Three voices, strict hierarchy:
//  Serif (思源宋体 / Noto Serif SC): the human voice — the question, the maxims, the final line.
//  Sans  (思源黑体 / Noto Sans SC, Thin→Black): structure — domain names, labels, numbers.
//  Mono  (IBM Plex Mono): the machine/data voice — code, units, annotations.
import type { C } from './env';

export type Fam =
  | 'Sans-Thin' | 'Sans-Light' | 'Sans-Regular' | 'Sans-Bold' | 'Sans-Black'
  | 'Serif-Light' | 'Serif-Regular' | 'Serif-Bold'
  | 'Mono' | 'Mono-Med';

export const FONT_FILES: Record<Fam, string> = {
  'Sans-Thin': 'NotoSansSC-Thin.otf',
  'Sans-Light': 'NotoSansSC-Light.otf',
  'Sans-Regular': 'NotoSansSC-Regular.otf',
  'Sans-Bold': 'NotoSansSC-Bold.otf',
  'Sans-Black': 'NotoSansSC-Black.otf',
  'Serif-Light': 'NotoSerifSC-Light.otf',
  'Serif-Regular': 'NotoSerifSC-Regular.otf',
  'Serif-Bold': 'NotoSerifSC-Bold.otf',
  Mono: 'PlexMono.ttf',
  'Mono-Med': 'PlexMonoMed.ttf',
};

/** Mono falls back to Sans for CJK glyphs Plex lacks. */
export const font = (fam: Fam, px: number) =>
  fam.startsWith('Mono') ? `${px}px "${fam}", "Sans-Regular"` : `${px}px "${fam}"`;

export interface TOpts {
  fam?: Fam;
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  base?: 'alphabetic' | 'middle' | 'top';
  alpha?: number;
  track?: number; // extra px between glyphs
}

/** Per-glyph layout (needed for per-character animation). */
export function layout(c: C, s: string, fam: Fam, size: number, track = 0) {
  c.font = font(fam, size);
  const chars = Array.from(s);
  const xs: number[] = [];
  const ws: number[] = [];
  let x = 0;
  for (const ch of chars) {
    const w = c.measureText(ch).width;
    xs.push(x);
    ws.push(w);
    x += w + track;
  }
  return { chars, xs, ws, width: Math.max(0, x - track) };
}

export function text(c: C, s: string, x: number, y: number, o: TOpts = {}) {
  const fam = o.fam ?? 'Sans-Regular', size = o.size ?? 24;
  c.save();
  c.globalAlpha *= o.alpha ?? 1;
  c.fillStyle = o.color ?? '#000';
  c.textBaseline = o.base ?? 'alphabetic';
  c.font = font(fam, size);
  if (!o.track) {
    c.textAlign = o.align ?? 'left';
    c.fillText(s, x, y);
  } else {
    const L = layout(c, s, fam, size, o.track);
    const x0 = o.align === 'center' ? x - L.width / 2 : o.align === 'right' ? x - L.width : x;
    c.textAlign = 'left';
    L.chars.forEach((ch, i) => c.fillText(ch, x0 + L.xs[i]!, y));
  }
  c.restore();
}

/**
 * Per-glyph kinetic draw. `fn(i, n)` returns a per-glyph state; glyphs with a<=0 are skipped.
 */
export function glyphs(
  c: C, s: string, x: number, y: number, o: TOpts,
  fn: (i: number, n: number, ch: string) => { a?: number; dx?: number; dy?: number; s?: number; rot?: number; color?: string; fam?: Fam },
) {
  const fam = o.fam ?? 'Sans-Regular', size = o.size ?? 24;
  const L = layout(c, s, fam, size, o.track ?? 0);
  const x0 = o.align === 'center' ? x - L.width / 2 : o.align === 'right' ? x - L.width : x;
  c.save();
  c.textBaseline = o.base ?? 'alphabetic';
  c.textAlign = 'center';
  const n = L.chars.length;
  L.chars.forEach((ch, i) => {
    const st = fn(i, n, ch);
    const a = (st.a ?? 1) * (o.alpha ?? 1);
    if (a <= 0.002) return;
    const cx = x0 + L.xs[i]! + L.ws[i]! / 2 + (st.dx ?? 0);
    const cy = y + (st.dy ?? 0);
    c.save();
    c.globalAlpha *= Math.min(1, a);
    c.translate(cx, cy);
    if (st.rot) c.rotate(st.rot);
    if (st.s !== undefined && st.s !== 1) c.scale(st.s, st.s);
    c.font = font(st.fam ?? fam, size);
    c.fillStyle = st.color ?? o.color ?? '#000';
    c.fillText(ch, 0, 0);
    c.restore();
  });
  c.restore();
  return { x0, width: L.width, xs: L.xs.map((v) => v + x0), ws: L.ws };
}

export const width = (c: C, s: string, fam: Fam, size: number, track = 0) => layout(c, s, fam, size, track).width;
