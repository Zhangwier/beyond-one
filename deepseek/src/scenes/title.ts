// title.ts — 序 · 有限 (0–12s)
//
// Frame 1: one wet ink dot at the exact centre of the bone sheet. Nothing else. The dot is
// the whole argument in one mark — one point, one mind, no reach yet.
//
// 0–1s   the dot breathes once.
// 1–9.4s the dot grows the first stroke of the film: a spiral that tries to close a circle
//        and cannot. Its radius doubles roughly every 1.7 s, so the failure gets bigger.
// 3–4s   the missing arc is dimensioned, hairlines closing from both ends, ticks at the ends.
// 5–7s   the title sets one character per beat above the mark.
// 7.4s   the sentence the film will test for the next seventy seconds.
//
// Every second is a hat in the score.
import type { Scene, Ctx } from '../engine/engine.ts';
import { W, H, clamp, sstep, lerp, easeOut, expo } from '../engine/core.ts';
import { arc, pt } from './_lib.ts';

export class Title implements Scene {
  render(c: Ctx) {
    const t = c.t;
    const cx = W / 2, cy = H / 2 - 6;

    // ---- the mark --------------------------------------------------------
    const TURNS = 0.86;              // the circle it cannot close
    const a0 = -Math.PI / 2 + 0.10;
    const grown = clamp((t - 1.0) / 9.4);
    const radius = 34 + 344 * expo(clamp((t - 1.0) / 9.2));

    if (t < 0.94) {
      const pulse = 1 + 0.13 * Math.exp(-t / 0.17);
      const r = 3.1 * pulse;
      const ring = arc(cx, cy, r, 0, Math.PI * 2, 2.2, 24, r * 0.9);
      c.ink({ pts: ring, dry: 0.05, seed: 2.2 });
    } else {
      const n = Math.max(12, Math.floor(grown * 620));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const r = lerp(0, radius, Math.pow(u, 0.80));
        const a = a0 + u * Math.PI * 2 * TURNS;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, w: Math.max(0.42, 2.5 * (1 - 0.5 * u)) });
      }
      c.ink({ pts, dry: 0.14 + 0.30 * clamp((t - 1) / 9), seed: 4.1 });
    }

    // ---- the dimension on the missing arc --------------------------------
    if (t > 3.0) {
      const g1 = a0 + Math.PI * 2 * TURNS;
      const gr = Math.max(radius * 1.02, 42);
      const p0 = { x: cx + Math.cos(a0) * gr, y: cy + Math.sin(a0) * gr };
      const p1 = { x: cx + Math.cos(g1) * gr, y: cy + Math.sin(g1) * gr };
      const ext = expo(clamp((t - 3.0) / 1.1));
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      const A = { x: lerp(mid.x, p0.x, ext), y: lerp(mid.y, p0.y, ext) };
      const B = { x: lerp(mid.x, p1.x, ext), y: lerp(mid.y, p1.y, ext) };
      c.ink({ pts: [{ ...A, w: 0.55 }, { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, w: 0.55 }, { ...B, w: 0.55 }], dry: 0.08, seed: 9.2, opacity: 0.5 });
      if (ext > 0.95) {
        const ends = [
          { x: p0.x + Math.cos(a0) * 26, y: p0.y + Math.sin(a0) * 26 },
          { x: p1.x + Math.cos(g1) * 26, y: p1.y + Math.sin(g1) * 26 },
        ];
        const lo = sstep(1.0, 1.7, t - 2.0);
        c.ink({ pts: [p0, { ...ends[0], w: 0.5 }].map((p0x: any) => ({ ...p0x, w: 0.5 })), dry: 0.06, seed: 3.1, opacity: 0.45 * lo });
        c.ink({ pts: [p1, { ...ends[1], w: 0.5 }].map((p0x: any) => ({ ...p0x, w: 0.5 })), dry: 0.06, seed: 5.1, opacity: 0.45 * lo });
      }
    }

    // ---- type ------------------------------------------------------------
    c.type((ctx) => {
      ctx.textAlign = 'left';

      // plate name
      const ah = sstep(0.9, 1.5, t) * (1 - sstep(10.4, 11.1, t));
      if (ah > 0.002) {
        ctx.globalAlpha = ah * 0.9;
        ctx.fillStyle = '#15120E';
        ctx.font = '300 16px "NotoSerifSC", serif';
        ctx.fillText('序', 96, 96);
        ctx.globalAlpha = ah * 0.45;
        ctx.font = '300 10px "NotoSansSC", monospace';
        ctx.fillText('P R O L O G U E', 124, 95);
        ctx.globalAlpha = ah * 0.32;
        ctx.fillText('一 个 人 所 能 拿 出 的 东 西', 96, 122);
        ctx.globalAlpha = 1;
      }

      // countdown
      if (t > 0.6 && t < 11.2) {
        const a = sstep(0.6, 1.0, t) * (1 - sstep(10.1, 10.8, t));
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = '#15120E';
        ctx.font = '200 13px "NotoSansSC", monospace';
        const n = Math.min(9, Math.floor(clamp(t, 0, 9)));
        ctx.fillText('0' + n, 96, H - 96);
        ctx.globalAlpha = a * 0.38;
        ctx.fillText('/ 09', 120, H - 96);
        for (let i = 0; i < 10; i++) {
          const on = t >= i;
          ctx.globalAlpha = a * (on ? 0.72 : 0.16);
          ctx.fillRect(96 + i * 13, H - 78, 8, on ? 2 : 1);
        }
        ctx.globalAlpha = a * 0.28;
        ctx.font = '300 9px "NotoSansSC", monospace';
        ctx.fillText('T I M E   A V A I L A B L E   ·   1 0 0 %', 96, H - 56);
        ctx.globalAlpha = 1;
      }

      // capacity readout: falls as the unmet arc grows
      {
        const a = sstep(2.0, 2.6, t) * (1 - sstep(8.9, 9.6, t));
        if (a > 0.002) {
          const x = W - 96;
          const cap = lerp(1.0, 0.28, sstep(3.0, 8.6, t));
          ctx.textAlign = 'right';
          ctx.globalAlpha = a * 0.4;
          ctx.fillStyle = '#15120E';
          ctx.font = '300 9px "NotoSansSC", monospace';
          ctx.fillText('C A P A C I T Y', x, 92);
          ctx.globalAlpha = a * 0.94;
          ctx.font = '200 64px "NotoSansSC", monospace';
          ctx.fillText(cap.toFixed(2), x + 2, 154);
          const bw = 236;
          ctx.globalAlpha = a * 0.18;
          ctx.fillRect(x - bw, 176, bw, 1);
          ctx.globalAlpha = a * 0.88;
          ctx.fillRect(x - bw, 176, bw * cap, 2);
          ctx.globalAlpha = a * 0.26;
          ctx.font = '300 9px "NotoSansSC", monospace';
          ctx.fillText('K N O W L E D G E  ·  S K I L L  ·  T I M E', x, 198);
          ctx.globalAlpha = a * 0.5;
          ctx.font = '300 11px "NotoSerifSC", serif';
          ctx.fillText('一 人 所 有', x, 218);
          ctx.textAlign = 'left';
          ctx.globalAlpha = 1;
        }
      }

      // the title, one character per beat
      {
        const t0 = 4.9;
        const chars = '超出一人之力';
        const reveal = (t - t0) / 1.9;
        if (reveal > 0 && t < 11.4) {
          const size = 112;
          const track = 4;
          ctx.font = `300 ${size}px "NotoSerifSC", serif`;
          const ws = [...chars].map((ch) => ctx.measureText(ch).width);
          const total = ws.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
          let x = cx - total / 2;
          const y = Math.max(196, cy - radius - 108);
          for (let i = 0; i < chars.length; i++) {
            const u = clamp(reveal * chars.length - i);
            if (u > 0) {
              ctx.globalAlpha = u * 0.97;
              ctx.fillStyle = '#15120E';
              ctx.fillText(chars[i], x, y + (1 - easeOut(u)) * 16);
            }
            x += ws[i] + track;
          }
          ctx.globalAlpha = 1;
        }
      }

      // the sentence the film will spend 84 seconds testing
      {
        const a = sstep(7.6, 8.5, t) * (1 - sstep(10.1, 10.9, t));
        if (a > 0.002) {
          ctx.globalAlpha = a * 0.6;
          ctx.fillStyle = '#15120E';
          ctx.font = '300 16px "NotoSerifSC", serif';
          ctx.textAlign = 'center';
          ctx.fillText('一个人能做的，比一个人想做的少。', cx, H - 172);
          ctx.globalAlpha = a * 0.28;
          ctx.font = '300 9px "NotoSansSC", monospace';
          ctx.fillText('O N E   P E R S O N   ·   O N E   R E A C H', cx, H - 148);
          ctx.textAlign = 'left';
          ctx.globalAlpha = 1;
        }
      }
    });
  }
}
