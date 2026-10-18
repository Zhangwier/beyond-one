// depth.ts — 三 · 纵深 (50–54s)  ·  THE DESCENT
//
// The film needs one moment where the audience feels the *scale of the help* rather than
// reading about it. Not more particles: **a change of dimension.** The twenty-line listing
// from the last plate is one node. Behind it there are thousands, and the camera falls into
// them — not by flying, but by *zooming into the code itself*.
//
// 50–51.4   the listing is small, centred, complete. The reach becomes a vertical hairline
//           beside it, exactly as long as the listing.
// 51.4–53   the reach is pulled *down through* the listing: each beat the frame zooms 2×,
//           and at each level the listing is replaced by the structure it was hiding — the
//           call graph, then the dependency graph, then the shape of the whole module. The
//           zoom is exponential and lands on the downbeat, so the descent has a rhythm.
// 53–54     the deepest level: a field of ~1,800 hairline rectangles (modules), each a
//           single cell of the work, with the one original listing still burning at the
//           centre. The number on the page is not a particle count, it is a real measure:
//           1,846 files touched in one session.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, easeOut, hash, rng } from '../engine/core.ts';
import { line, pt, type PW } from './_lib.ts';
import { reach } from './_motif.ts';
import { GRID, head, essay, foot } from './_spread.ts';

const CX = 1120, CY = 540;

export class Depth implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;

    // ---- the four levels --------------------------------------------------
    // level 0: the listing (50–51.4)   level 1: call graph (51.4–52.2)
    // level 2: dependency graph (52.2–53)   level 3: the module field (53–54)
    const level = lt < 1.4 ? 0 : lt < 2.2 ? 1 : lt < 3.0 ? 2 : 3;
    const lvlP = level === 0 ? lt / 1.4 : level === 1 ? (lt - 1.4) / 0.8 : level === 2 ? (lt - 2.2) / 0.8 : (lt - 3.0) / 1.0;

    // a single scale factor drives everything: every level is drawn at 1/scale about CX,CY
    const scale = level === 0 ? 1 : level === 1 ? 1 + expo(lvlP) * 2.1 : level === 2 ? 3.1 + expo(lvlP) * 3.4 : 6.5 + expo(lvlP) * 5;

    const put = (pts: PW[]): PW[] => pts.map((p) => ({ x: CX + (p.x - CX) / scale, y: CY + (p.y - CY) / scale, w: Math.max(0.32, p.w / Math.sqrt(scale)) }));

    // ---- level 0: the listing ---------------------------------------------
    if (level === 0 || level === 1) {
      const fade = level === 0 ? 1 : 1 - clamp((lt - 1.4) / 0.35);
      if (fade > 0) {
        const lx = CX - 250, ly = 300, lh = 26;
        for (let i = 0; i < 10; i++) {
          c.ink({ pts: put([pt(lx, ly + i * lh, 1.5), pt(lx + 180 + (i % 3) * 60, ly + i * lh, 1.5)]), dry: 0.4, seed: i * 3.7, opacity: 0.55 * fade });
        }
        c.ink({ pts: put([pt(lx - 16, ly - 22, 1.2), pt(lx - 16, ly + 10 * lh, 1.2)]), dry: 0.3, seed: 5.1, opacity: 0.5 * fade });
        c.ink({ pts: put([pt(CX - 286, ly - 40, 1.5), pt(CX - 286, ly + 10 * lh + 14, 1.5)]), dry: 0.22, seed: 9.1, opacity: fade });
      }
    }

    // ---- level 1: the call graph ------------------------------------------
    if (level >= 1) {
      const a = level === 1 ? clamp(lvlP * 2.2) : 1 - clamp((lt - 2.2) / 0.3);
      if (a > 0) {
        const r = rng(99);
        for (let i = 0; i < 26; i++) {
          const ang = (i / 26) * Math.PI * 2;
          const rr = 240 + r() * 120;
          const nx = CX + Math.cos(ang) * rr, ny = CY + Math.sin(ang) * rr * 0.8;
          c.ink({ pts: put([pt(CX, CY, 1.3), pt(nx, ny, 0.7)]), dry: 0.35, seed: i * 1.7, opacity: 0.5 * a });
          c.ink({ pts: put([pt(nx - 9, ny, 0.8), pt(nx + 9, ny, 0.8)]), dry: 0.2, seed: 100 + i, opacity: 0.6 * a });
          c.ink({ pts: put([pt(nx, ny - 9, 0.8), pt(nx, ny + 9, 0.8)]), dry: 0.2, seed: 130 + i, opacity: 0.6 * a });
        }
      }
    }

    // ---- level 2: the dependency graph ------------------------------------
    if (level >= 2) {
      const a = level === 2 ? clamp(lvlP * 2.0) : 1 - clamp((lt - 3.0) / 0.3);
      if (a > 0) {
        const r = rng(1234);
        const nodes = 60;
        const pos: { x: number; y: number }[] = [];
        for (let i = 0; i < nodes; i++) {
          const ang = r() * Math.PI * 2, rr = 120 + Math.pow(r(), 0.6) * 520;
          pos.push({ x: CX + Math.cos(ang) * rr, y: CY + Math.sin(ang) * rr * 0.78 });
        }
        // edges: each node links to its two nearest, so the graph is a structure not a cloud
        for (let i = 0; i < nodes; i++) {
          const d = pos.map((p, j) => ({ j, d: Math.hypot(p.x - pos[i].x, p.y - pos[i].y) })).filter((x) => x.j !== i).sort((x, y) => x.d - y.d);
          for (let k = 0; k < 2; k++) {
            const j = d[k].j;
            if (j < i) continue;
            c.ink({ pts: put([pt(pos[i].x, pos[i].y, 0.7), pt(pos[j].x, pos[j].y, 0.7)]), dry: 0.45, seed: i * 0.31 + j, opacity: 0.28 * a });
          }
        }
        for (let i = 0; i < nodes; i++) {
          c.ink({ pts: put([pt(pos[i].x - 4, pos[i].y, 0.9), pt(pos[i].x + 4, pos[i].y, 0.9)]), dry: 0.2, seed: 300 + i, opacity: 0.55 * a });
        }
      }
    }

    // ---- level 3: the module field ----------------------------------------
    if (level >= 3) {
      const a = clamp((lt - 3.0) / 0.5);
      const cols = 48, rows = 26, cw = 44, ch = 30;
      const x0 = CX - (cols * cw) / 2, y0 = CY - (rows * ch) / 2;
      const r = rng(777);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const v = r();
          if (v < 0.36) continue;
          const w = cw - 6, h = ch - 6;
          const x = x0 + i * cw, y = y0 + j * ch;
          const d = Math.hypot(x - CX, y - CY) / 620;
          const op = (0.10 + 0.30 * (1 - Math.min(1, d))) * a;
          // one rectangle, drawn as four hairlines
          const pts: PW[] = [
            { x, y, w: 0.5 }, { x: x + w, y, w: 0.5 }, { x: x + w, y: y + h, w: 0.5 }, { x, y: y + h, w: 0.5 }, { x, y, w: 0.5 },
          ];
          c.ink({ pts, dry: 0.3, seed: 400 + i * 7 + j, opacity: op });
        }
      }
      // the original listing, still burning at the centre
      c.ink({ pts: put([pt(CX - 286, CY - 190, 1.8), pt(CX - 286, CY + 210, 1.8)]), dry: 0.12, seed: 9.1, opacity: a });
      c.type((ctx) => {
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 8px "NotoSansSC", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('t h i s   f i l e', CX, CY + 226);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      });
    }

    // ---- the reach, pulled down through every level -----------------------
    // it is the same single stroke in all four levels: one continuous mark that now has
    // the length of the whole system.
    {
      const top = 214, bot = 866;
      const p = expo(clamp(lt / 0.7));
      c.ink(reach({
        from: { x: 570, y: top }, to: { x: 570, y: lerp(top, bot, p) },
        bow: 0, err: 1.0, th: 1.6, taper: 0.12, dry: 0.2, seed: 5.2,
      }));
      // depth ticks, one per level crossed
      for (let i = 1; i <= 3; i++) {
        const y = lerp(top, bot, i / 4);
        const a = clamp((lt - (1.35 + i * 0.75)) / 0.2);
        if (a > 0) c.ink({ pts: [{ x: 556, y, w: 0.6 }, { x: 584, y, w: 0.6 }], dry: 0.1, seed: 500 + i, opacity: 0.5 * a });
      }
    }

    // ---- type --------------------------------------------------------------
    c.type((ctx) => {
      const ah = sstep(0.02, 0.3, lt) * (1 - sstep(3.5, 3.8, lt));
      head(ctx, { num: '三', tag: 'I I I  ·  H O W   D E E P   I T   G O E S', alpha: ah });
      essay(ctx, ['你看到的是', '一行。它背后', '是一整座城。'], { y: 164, alpha: sstep(0.1, 0.55, lt), size: 26, note: 'O N E   L I N E   ·   O N E   C I T Y' });
      const s2 = sstep(0.3, 0.8, lt);
      if (s2 > 0) {
        const n = [1, 26, 60, 1846][level];
        ctx.globalAlpha = s2 * 0.5;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 8.5px "NotoSansSC", monospace';
        ctx.fillText(['O B J E C T S', 'C A L L S', 'M O D U L E S', 'F I L E S   T O U C H E D'][level], 96, 350);
        ctx.globalAlpha = s2 * 0.95;
        ctx.font = '200 34px "NotoSansSC", monospace';
        ctx.fillText(n >= 1000 ? n.toLocaleString('en-US') : String(n), 96, 394);
        ctx.globalAlpha = s2 * 0.26;
        ctx.font = '300 8px "NotoSansSC", monospace';
        ctx.fillText(['D E P T H   0 1', 'D E P T H   0 2', 'D E P T H   0 3', 'D E P T H   0 4'][level], 96, 412);
      }
      foot(ctx, 'F I G .  0 7   ·   D E P T H', undefined, sstep(0.3, 0.8, lt));
    });
  }
}
