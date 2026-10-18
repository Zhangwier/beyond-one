// beyond.ts — V · BEYOND (72-78s)  ·  THE OPENING
//
// The film's visual climax, and it is made of order rather than speed.
//
// On the downbeat at 72.0 the wheel breaks. Not shatters — unfolds. Each petal keeps its
// curve and travels outward along its own axis, and as they separate, the space between them
// is revealed to be a curve of the same family: the petals were always one continuous spiral,
// and the wheel was that spiral seen closed. The spiral then unrolls and slides out of the
// frame on the right — the reach, at the largest scale the film allows.
//
// 72.0-74.4  the petals separate along their axes, one per 8th note; the centre dot stays.
// 74.4-76    the separated petals reconnect end to end: the drawing becomes a single spiral.
// 76-78      the spiral slides right, flattens, and the paper tilts 1.2 degrees.
//            The last thing on screen is the mark crossing the right edge of the page.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, easeInOut } from '../engine/core.ts';
import { line, pt, circle, type PW } from './_lib.ts';
import { petal } from './_motif.ts';
import { head, essay, foot } from './_spread.ts';

const CX = 1042, CY = 548;

export class Beyond implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;

    const sep = easeInOut(clamp(lt / 2.4));
    const unroll = easeInOut(clamp((lt - 2.4) / 1.6));
    const stretch = expo(clamp((lt - 4.0) / 2.0));

    // the page tilts 1.2 degrees over the last two seconds: the drawing is no longer level
    const tilt = ((-1.2 * Math.PI) / 180) * sstep(4.0, 6.0, lt);
    const cs = Math.cos(tilt), sn = Math.sin(tilt);
    const T = (p: PW): PW => {
      const dx = p.x - CX, dy = p.y - CY;
      return { x: CX + dx * cs - dy * sn, y: CY + dx * sn + dy * cs, w: p.w };
    };

    // ---- phase A: the eight petals, separating ---------------------------
    const petalFade = 1 - clamp((lt - 2.2) / 0.5);
    if (petalFade > 0.001) {
      for (let k = 0; k < 8; k++) {
        const rot = (k / 8) * Math.PI * 2;
        const born = k * 0.14;
        const p = expo(clamp((lt - born) / 0.75));
        if (p <= 0) continue;
        const R = 292 * (1 + sep * 0.30);
        // local petal coordinates, offset to the wheel's centre, then tilted with the page
        const pts = petal(R, 0, rot, { width: 0.26 }).map((q) => T({ x: CX + q.x, y: CY + q.y, w: q.w }));
        const n = Math.max(2, Math.floor(pts.length * p));
        c.ink({
          pts: pts.slice(0, n),
          dry: 0.19 + (k % 2) * 0.1,
          seed: 10 + k * 3.7,
          opacity: petalFade * (1 - (k % 2) * 0.1),
        });
      }
      c.ink({ pts: circle(CX, CY, 5.0, 3.2, 26), dry: 0.05, seed: 2.2, opacity: petalFade });
    }

    // ---- phase B: the spiral --------------------------------------------
    // the same petals, joined end to end, then pulled sideways as one loose coil
    if (unroll > 0.001) {
      const a = unroll;
      const pts: PW[] = [];
      const TOTAL = 520;
      const drawn = Math.max(2, Math.floor(TOTAL * a));
      const TURNS = 6.2;
      for (let i = 0; i <= drawn; i++) {
        const u = i / TOTAL;
        const ang = -Math.PI / 2 + u * Math.PI * 2 * TURNS;
        const baseR = 18 + u * 268;
        const shift = stretch * u * u * 520;
        const flatten = 1 - stretch * 0.30 * u;
        pts.push({
          x: CX + Math.cos(ang) * baseR + shift,
          y: CY + Math.sin(ang) * baseR * flatten,
          w: Math.max(0.42, 2.0 * (1 - u * 0.6)),
        });
      }
      c.ink({ pts: pts.map(T), dry: 0.18 + 0.16 * a, seed: 5.5, opacity: 1 });
      if (pts.length > 2 && stretch < 0.55) {
        const e = pts[pts.length - 1];
        c.ink({ pts: circle(e.x, e.y, 3.0, 2.2, 18), dry: 0.05, seed: 9.9 });
      }
    }

    // ---- the ruler, stretched with the drawing ---------------------------
    if (lt > 4.4) {
      const y = 960;
      const x0 = 300, x1 = lerp(300, W + 400, stretch);
      c.ink({ pts: line(x0, y, x1, y, 0.7, 180, 0), dry: 0.28, seed: 77, opacity: 0.35 });
      for (let i = 0; i <= 60; i++) {
        const xx = lerp(x0, x1, i / 60);
        const len = i % 10 === 0 ? 9 : i % 5 === 0 ? 5 : 2;
        c.ink({ pts: [pt(xx, y, 0.5), pt(xx, y + len, 0.5)], dry: 0.3, seed: 80 + i, opacity: 0.3 });
      }
    }

    // ---- type -----------------------------------------------------------
    c.type((ctx) => {
      ctx.save();
      if (lt > 4.0) {
        ctx.translate(CX, CY);
        ctx.rotate(tilt);
        ctx.translate(-CX, -CY);
      }
      const ah = sstep(0.02, 0.28, lt);
      head(ctx, { num: '终', tag: 'V · BEYOND', alpha: ah });
      essay(ctx, ['那条线没有', '变长。', '是拿笔的手，', '变多了。'], {
        y: 150, alpha: sstep(0.1, 0.5, lt), size: 24, note: 'THE LINE DID NOT GROW',
      });
      ctx.restore();
      foot(ctx, 'FIG. 11 · THE UNFOLDING', { big: '6.2', small: 'TURNS · ONE STROKE' }, sstep(2.4, 3.0, lt));
    });
  }
}
