// perf.mjs — time each plate. The export is only feasible if a frame is a few tens of ms.
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import fs from 'node:fs';
const EXE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const { srv, port } = await serve(0);
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/web/index.html?export=1`);
await page.waitForFunction(() => window.__film?.ready || window.__ERR, null, { timeout: 60000 });
const tl = await page.evaluate(() => window.__film.timeline);
const rows = [];
for (const e of tl) {
  const r = await page.evaluate(async (e) => {
    const t0 = performance.now();
    let n = 0;
    for (let t = e.start + 0.1; t < e.end - 0.1; t += 0.37) { window.__film.render(t); n++; }
    // force a GPU sync by reading a pixel
    const gl = document.getElementById('c').getContext('webgl2');
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return { ms: (performance.now() - t0) / n, n };
  }, e);
  rows.push([e.id, e.scene, r.ms.toFixed(1), r.n]);
}
for (const r of rows) console.log(`${r[0].padEnd(4)} ${r[1].padEnd(9)} ${r[2].padStart(7)} ms/frame  (${r[3]} frames)`);
const avg = rows.reduce((a, b) => a + +b[2], 0) / rows.length;
console.log(`\naverage ${avg.toFixed(1)} ms/frame  →  84 s at 60 fps = 5040 frames = ${((avg * 5040) / 60000).toFixed(1)} min`);
await browser.close(); srv.close();
