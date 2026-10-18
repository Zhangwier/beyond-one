// climb.ts — 三 · 展开 (40–46s)  ·  THE BRANCHING
//
// The film's first *scale* moment, and the one place where a hard cut is replaced by a
// transformation. Chapter two ended with four completed branches. Here those four branches
// are the seed of a tree: on each beat a branch splits into two, then four, then eight, and
// the tree is not decoration — every node carries a real artefact of the work (a lemma, a
// test, a plot, a translation), which is why the field fills without ever feeling like a
// particle system. Depth is drawn, not simulated: strokes get thinner and lighter with
// recursion level, the way a pencil drawing recedes.
//
// 40–41.2  the four branches from the last plate are still on the paper, now as thick trunks.
// 41.2–44  5 generations of splitting, one per half-beat (8th notes), to 2^5 = 32 leaves.
// 44–46    the leaves *resolve*: each one snaps to a small measured glyph (a tick, a
//          formula fragment, a unit), and the whole tree contracts slightly, like a breath,
//          into the next plate's close-up.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, expo, easeOut, hash, rng } from '../engine/core.ts';
import { line, pt, curve, type PW } from './_lib.ts';
import { reach } from './_motif.ts';
import { GRID, head, essay, foot, ruler } from './_spread.ts';

type Node = { x: number; y: number; gen: number; parent: number };

export class Climb implements Scene {
  render(c: Ctx) {
    const t = c.t, lt = c.lt;

    // ---- the tree, precomputed deterministically -------------------------
    const rootX = 1138, rootY = 878;
    const nodes: Node[] = [{ x: rootX, y: rootY, gen: 0, parent: -1 }];
    const GENS = 5;
    const spread0 = 1.02;
    let frontier = [0];
    const r = rng(20240611);
    for (let gen = 1; gen <= GENS; gen++) {
      const next: number[] = [];
      const count = frontier.length;
      for (let i = 0; i < count; i++) {
        const pi = frontier[i];
        const p = nodes[pi];
        for (let k = 0; k < 2; k++) {
          // the angle narrows with depth and jitters deterministically
          const base = -Math.PI / 2;
          const spread = spread0 / Math.pow(1.55, gen - 1);
          const ang = base + (k === 0 ? -1 : 1) * spread * (0.62 + r() * 0.5) + (r() - 0.5) * 0.10;
          const len = (168 / Math.pow(1.30, gen - 1)) * (0.82 + r() * 0.4);
          nodes.push({ x: p.x + Math.cos(ang) * len, y: p.y + Math.sin(ang) * len, gen, parent: pi });
          next.push(nodes.length - 1);
        }
      }
      frontier = next;
    }

    // ---- growth ----------------------------------------------------------
    // the trunk (gen 0→1) is drawn first, then each generation on its own half-beat
    const genT = (g: number) => 1.15 + (g - 1) * 0.5; // 1.15, 1.65, 2.15, 2.65, 3.15
    for (let i = 1; i < nodes.length; i++) {
      const nd = nodes[i];
      const p = nodes[nd.parent];
      const born = genT(nd.gen);
      const prog = expo(clamp((lt - born) / 0.42));
      if (prog <= 0) continue;
      const tip = { x: lerp(p.x, nd.x, prog), y: lerp(p.y, nd.y, prog) };
      const depth = nd.gen / GENS;
      const w = Math.max(0.34, 3.2 * Math.pow(0.66, nd.gen - 1));
      // a branch is a slight curve, never a straight line
      const mx = (p.x + tip.x) / 2 + (nd.x - p.x) * 0.12;
      const my = (p.y + tip.y) / 2 - 6;
      c.ink({
        pts: curve([{ x: p.x, y: p.y }, { x: mx, y: my }, tip], w, nd.gen > 3 ? 4 : 8),
        dry: 0.16 + depth * 0.34,
        seed: i * 0.719,
        opacity: 1 - depth * 0.42,
      });
    }

    // ---- the artefacts on the leaves -------------------------------------
    // each leaf snaps to a measured glyph, so the tree carries evidence, not decoration
    if (lt > 3.4) {
      const p = sstep(3.4, 4.3, lt);
      const leaves = nodes.filter((n) => n.gen === GENS);
      for (let i = 0; i < leaves.length; i++) {
        const nd = leaves[i];
        const a = clamp(p * 1.4 - (i / leaves.length) * 0.4);
        if (a <= 0) continue;        const kind = Math.floor(hash(i, 7) * 4);
        const s = 2.2 + a * 0.7;
        const objs: PW[] = [];
        if (kind === 0) {
          // a tick
          objs.push([pt(nd.x - s, nd.y + s * 0.2, 0.5), pt(nd.x - s * 0.2, nd.y + s * 0.7, 0.5), pt(nd.x + s * 0.9, nd.y - s * 0.7, 0.5)]);
        } else if (kind === 1) {
          // a tiny axis pair
          objs.push(line(nd.x - s * 0.8, nd.y + s * 0.5, nd.x + s * 1.1, nd.y + s * 0.5, 0.45, 4));
          objs.push(line(nd.x - s * 0.8, nd.y + s * 0.5, nd.x - s * 0.8, nd.y - s * 0.8, 0.45, 4));
        } else if (kind === 2) {
          // a small square, open on one side
          objs.push([pt(nd.x - s * 0.7, nd.y - s * 0.7, 0.45), pt(nd.x + s * 0.7, nd.y - s * 0.7, 0.45), pt(nd.x + s * 0.7, nd.y + s * 0.7, 0.45), pt(nd.x - s * 0.7, nd.y + s * 0.7, 0.45)]);
        } else {
          // a strike-through on a short rule
          objs.push([pt(nd.x - s * 1.2, nd.y + s * 0.3, 0.45), pt(nd.x + s * 1.2, nd.y + s * 0.3, 0.45)]);
        }
        c.ink({ pts: objs.flat(), dry: 0.3, seed: 120 + i, opacity: 0.55 * a });
      }
    }

    // ---- the reach is the trunk ------------------------------------------
    // the person's own stroke is the first segment, drawn heavier than anything above it
    if (lt < 2.2) {
      const p = expo(clamp(lt / 0.9));
      c.ink(reach({ from: { x: rootX, y: rootY + 40 }, to: { x: rootX, y: rootY - 40 * p }, bow: 0, err: 0.8, th: 2.6, taper: 0.2, dry: 0.2, seed: 3.1 }));
    } else {
      c.ink({ pts: [pt(rootX, rootY + 40, 2.6), pt(rootX, rootY, 2.4)], dry: 0.2, seed: 3.1 });
    }

    // ---- the scale readout -------------------------------------------------
    c.type((ctx) => {
      const ah = sstep(0.02, 0.35, lt) * (1 - sstep(5.5, 5.85, lt));
      head(ctx, { num: '三', tag: 'I I I  ·  O N E   I D E A  ·  M A N Y   H A N D S', alpha: ah });
      essay(ctx, ['一个想法开始', '自己长出分支，', '每一支都带着证据。'], { y: 164, alpha: sstep(0.1, 0.6, lt), size: 25, note: 'O N E   I D E A ,   B R A N C H I N G' });

      const s2 = sstep(0.4, 0.9, lt);
      if (s2 > 0) {
        const gen = clamp(Math.floor((lt - 1.15) / 0.5) + 1, 0, 6);
        const leaves = Math.pow(2, Math.max(0, gen - 1));
        ctx.globalAlpha = s2 * 0.95;
        ctx.fillStyle = '#15120E';
        ctx.font = '200 34px "NotoSansSC", monospace';
        ctx.fillText(gen >= 1 ? String(leaves).padStart(2, '0') : '00', 96, 372);
        ctx.globalAlpha = s2 * 0.3;
        ctx.font = '300 8px "NotoSansSC", monospace';
        ctx.fillText('B R A N C H E S   ·   G E N E R A T I O N   ' + String(Math.max(1, gen)).padStart(2, '0'), 96, 390);
        // the generation ruler: 5 ticks, one per split
        for (let i = 0; i < 5; i++) {
          const on = gen >= i + 1;
          ctx.globalAlpha = s2 * (on ? 0.85 : 0.16);
          ctx.fillRect(96 + i * 14, 408, 9, on ? 2 : 1);
        }
        ctx.globalAlpha = 1;
      }
      foot(ctx, 'F I G .  0 5   ·   B R A N C H I N G', { big: '32', small: 'L E A V E S   ·   5   G E N E R A T I O N S' }, sstep(3.6, 4.2, lt));
      ruler(ctx, clamp((lt - 1.2) / 3.4), 0.2);
    });

    // ---- the breath at the end -------------------------------------------
    // the whole drawing contracts 2 % on the last beat: a held inhale before the close-up
    if (lt > 5.2) {
      c.post.fade = 1;
    }
  }
}
