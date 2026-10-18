// connect.ts — 二 · 连接 (22–34s)  ·  THE EXTENSION
//
// The turn. Up to here the page has been empty and centred. Now the field becomes a work
// surface: a hairline lattice is laid over it in one continuous pass (22–23.2), the four
// requirements from chapter one are re-marked on it, and the reach is drawn to each of them
// — stopping at 44 %, as before.
//
// 26–30 the completions. One per beat. Each one arrives from off the page, on the far side
// of its node, and lands exactly on the stub's terminus: same ink, a different hand
// (thinner, drier, longer). Nothing anthropomorphic — the audience reads "something outside
// supplied the rest of this line", which is the only claim the film makes about AI.
//
// 30–34 the four branches are labelled with what the collaboration actually did: read it,
// run it, cross-check it, translate it. The footer counts 01 → 04.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, easeOut } from '../engine/core.ts';
import { line, pt, curve, type PW } from './_lib.ts';
import { reach } from './_motif.ts';
import { GRID, head, essay, foot, ruler } from './_spread.ts';

const CX = 1138, CY = 520;

export class Connect implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;

    // ---- the lattice -----------------------------------------------------
    const g = expo(clamp(lt / 1.25));
    if (g > 0.001) {
      const x0 = GRID.fieldX0, x1 = GRID.fieldX1, y0 = 150, y1 = 900;
      const cols = 9, rows = 6;
      const nV = Math.floor(cols * clamp(g / 0.55));
      for (let i = 0; i < nV; i++) {
        const x = lerp(x0, x1, i / (cols - 1));
        c.ink({ pts: line(x, y0, x, y1, 0.55, 2), dry: 0.42, seed: i * 2.1, opacity: 0.5 });
      }
      const nH = Math.floor(rows * clamp((g - 0.5) / 0.5));
      for (let j = 0; j < nH; j++) {
        const y = lerp(y0, y1, j / (rows - 1));
        c.ink({ pts: line(x0, y, x1, y, 0.55, 2), dry: 0.42, seed: 20 + j * 1.7, opacity: 0.5 });
      }
      const f = expo(clamp((lt - 0.85) / 0.6));
      if (f > 0) {
        c.ink({ pts: line(lerp(CX, x0, f), y0, lerp(CX, x1, f), y0, 1.35, 30), dry: 0.1, seed: 31.1 });
        c.ink({ pts: line(lerp(CX, x0, f), y1, lerp(CX, x1, f), y1, 1.35, 30), dry: 0.1, seed: 32.1 });
        c.ink({ pts: [pt(x0, lerp(y0, CY, f), 1.35), pt(x0, lerp(y1, CY, f), 1.35)], dry: 0.1, seed: 33.1 });
        c.ink({ pts: [pt(x1, lerp(y0, CY, f), 1.35), pt(x1, lerp(y1, CY, f), 1.35)], dry: 0.1, seed: 34.1 });
      }
    }

    // ---- the four nodes ---------------------------------------------------
    const nodes = [
      { x: 706, y: 300, nm: 'A', zh: '证明', act: 'READ', meta: 'p . 1 1 4' },
      { x: 1570, y: 300, nm: 'B', zh: '测量', act: 'RUN', meta: 't = 0 4 : 1 2' },
      { x: 706, y: 762, nm: 'C', zh: '程序', act: 'CHECK', meta: 'Δ 0 . 0 0 7' },
      { x: 1570, y: 762, nm: 'D', zh: '另一个语言', act: 'TRANSLATE', meta: 'g l o s s' },
    ];
    for (let i = 0; i < 4; i++) {
      const nd = nodes[i];
      const p = sstep(1.3 + i * 0.1, 1.75 + i * 0.1, lt);
      if (p <= 0) continue;
      c.ink({ pts: [pt(nd.x - 7, nd.y, 0.8), pt(nd.x + 7, nd.y, 0.8)], dry: 0.1, seed: nd.x, opacity: 0.6 * p });
      c.ink({ pts: [pt(nd.x, nd.y - 7, 0.8), pt(nd.x, nd.y + 7, 0.8)], dry: 0.1, seed: nd.y, opacity: 0.6 * p });
      c.type((ctx) => {
        ctx.fillStyle = '#15120E';
        ctx.globalAlpha = p * 0.85;
        ctx.font = '300 8px "NotoSansSC", monospace';
        ctx.fillText(nd.nm, nd.x - 20, nd.y - 14);
        ctx.globalAlpha = p * 0.85;
        ctx.font = '300 13px "NotoSerifSC", serif';
        ctx.fillText(nd.zh, nd.x + 14, nd.y + 5);
      });
    }

    // ---- the stubs --------------------------------------------------------
    for (let i = 0; i < 4; i++) {
      const nd = nodes[i];
      const born = 1.5 + i * 0.16;
      const p = expo(clamp((lt - born) / 1.0));
      if (p <= 0) continue;
      const to = { x: CX + (nd.x - CX) * 0.44 * p, y: CY + (nd.y - CY) * 0.44 * p };
      c.ink(reach({ from: { x: CX, y: CY }, to, bow: (i % 2 ? 1 : -1) * 22 * p, err: 2.0, th: 1.9, taper: 0.32, dry: 0.22, seed: 3.2 + i * 5.1 }));
    }

    // ---- the completions --------------------------------------------------
    // Each completion fills exactly one gap: from the stub's terminus to its own node.
    // It starts at the node and runs inward, so the audience sees the outside supply the
    // missing segment of a line the person had already begun.
    for (let i = 0; i < 4; i++) {
      const nd = nodes[i];
      const born = 4.0 + i * 1.0;
      const p = expo(clamp((lt - born) / 1.25));
      if (p <= 0) continue;
      const dx = nd.x - CX, dy = nd.y - CY;
      const L = Math.hypot(dx, dy) || 1;
      const tip = { x: CX + dx * 0.44, y: CY + dy * 0.44 };
      // drawn from the node toward the tip: the gap closes as the stroke arrives
      const node = { x: nd.x - (dx / L) * 26, y: nd.y - (dy / L) * 26 };
      const cur = { x: lerp(node.x, tip.x, p), y: lerp(node.y, tip.y, p) };
      c.ink(reach({
        from: node, to: cur,
        bow: (i % 2 ? 1 : -1) * 13, bow2: 5, err: 1.1, th: 1.1, taper: 0.35,
        dry: 0.5, seed: 40 + i * 7.3, opacity: 0.95,
      }));
      // the junction: a short cross tick where the two hands meet
      if (p > 0.9) {
        const q = clamp((p - 0.9) / 0.1);
        const nx = -dy / L, ny = dx / L;
        c.ink({ pts: [{ x: tip.x + nx * 10, y: tip.y + ny * 10, w: 0.7 }, { x: tip.x - nx * 10, y: tip.y - ny * 10, w: 0.7 }], dry: 0.1, seed: 60 + i, opacity: 0.85 * q });
      }
      if (p > 0.97) {
        c.type((ctx) => {
          ctx.fillStyle = '#15120E';
          const right = dx > 0;
          const lx = nd.x + (right ? -14 : 14);
          ctx.textAlign = right ? 'right' : 'left';
          ctx.globalAlpha = 0.92;
          ctx.font = '300 9px "NotoSansSC", monospace';
          ctx.fillText(nd.act, lx, nd.y + 42);
          ctx.globalAlpha = 0.36;
          ctx.fillText(nd.meta, lx, nd.y + 56);
          ctx.textAlign = 'left';
        });
      }
    }

    // ---- the four branches, complete --------------------------------------
    if (lt > 8.4) {
      const p = sstep(8.4, 9.2, lt);
      c.type((ctx) => {
        ctx.fillStyle = '#15120E';
        ctx.globalAlpha = p * 0.5;
        ctx.font = '300 9px "NotoSerifSC", serif';
        ctx.fillText('四段陌生的知识，被接到了同一条线上。', GRID.fieldX0, 966);
        ctx.globalAlpha = p * 0.26;
        ctx.font = '300 8px "NotoSansSC", monospace';
        ctx.fillText('F O U R   F O R E I G N   F I E L D S   ·   O N E   L I N E', GRID.fieldX0, 982);
      });
    }

    // ---- the spread's type ------------------------------------------------
    c.type((ctx) => {
      const ah = sstep(0.02, 0.4, lt) * (1 - sstep(9.7, 10.1, lt));
      head(ctx, { num: '二', tag: 'I I  ·  N O T   A   T O O L  ·  A N   E X T E N S I O N', alpha: ah });
      essay(ctx, ['它不是替你回答，', '是把缺的那一半，', '递到你手边。'], { y: 164, alpha: sstep(0.1, 0.7, lt), size: 26, note: 'N O T   A N   A N S W E R' });
      const s2 = sstep(0.25, 0.8, lt);
      if (s2 > 0.002) {
        const n = Math.floor(clamp((lt - 4.0) / 1.0, 0, 4));
        ctx.globalAlpha = s2 * 0.95;
        ctx.fillStyle = '#15120E';
        ctx.font = '200 34px "NotoSansSC", monospace';
        ctx.fillText(`0${n} / 04`, 96, 392);
        ctx.globalAlpha = s2 * 0.28;
        ctx.font = '300 8px "NotoSansSC", monospace';
        ctx.fillText('B R A N C H E S   C O M P L E T E D', 96, 410);
        // four tick marks, one per completion
        for (let i = 0; i < 4; i++) {
          const on = lt >= 4.0 + i * 1.0;
          ctx.globalAlpha = s2 * (on ? 0.8 : 0.16);
          ctx.fillRect(96 + i * 16, 430, 10, on ? 2 : 1);
        }
        ctx.globalAlpha = 1;
      }
      foot(ctx, 'F I G .  0 3   ·   C O M P L E T I O N', undefined, sstep(0.3, 0.9, lt));
      ruler(ctx, clamp((lt - 4) / 5), 0.2);
    });
  }
}
