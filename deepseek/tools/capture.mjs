// capture.mjs 鈥?the film's renderer. Drives the page through playwright, one frame at a
// time, and pipes raw pixels to ffmpeg. The page never decides what time it is: we say
// `render(t)`, we get that exact frame. That is what makes the preview and the export
// the same film.
//
//   node tools/capture.mjs stills --t 0.2,3,7.5 [--scale 1] [--out out/stills]
//   node tools/capture.mjs sheet  --from 0 --to 12 [--n 9] [--cols 3] [--out out/sheet.png]
//   node tools/capture.mjs clip   --from 0 --to 12 [--fps 30] [--out out/clip.mp4]
//   node tools/capture.mjs film   [--fps 60] [--crf 15] [--out out/film.mp4] [--from 0 --to 84]
//   node tools/capture.mjs probe  (GPU string + boot errors)
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const mode = argv[0] || 'stills';
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes('--' + k);

const SCALE = +(opt('scale', '1'));
const OW = 1920 * SCALE, OH = 1080 * SCALE;

const EXE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));

async function open({ width = 1920, height = 1080 } = {}) {
  const { srv, port } = await serve(0);
  const browser = await chromium.launch({
    executablePath: EXE,
    headless: true,
    args: [
      '--use-angle=d3d11',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--enable-zero-copy',
      '--disable-frame-rate-limit',
      '--disable-gpu-vsync',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion',
      '--autoplay-policy=no-user-gesture-required',
      '--allow-file-access-from-files',
      '--js-flags=--max-old-space-size=4096',
    ],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('[pageerror] ' + (e.stack || e.message)));
  const forced = process.env.SCENE ? `&scene=${process.env.SCENE}` : '';
  const url = `http://127.0.0.1:${port}/web/index.html?export=1&scale=${SCALE}${forced}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => window.__film?.ready || window.__ERR, null, { timeout: 90000 });
  } catch (e) {
    throw new Error(`boot timeout\n${logs.join('\n')}\n${await page.evaluate(() => document.getElementById('err')?.textContent || '')}`);
  }
  const err = await page.evaluate(() => window.__ERR || null);
  if (err) { await browser.close(); srv.close(); throw new Error('BOOT:\n' + err + '\n' + logs.join('\n')); }
  const size = await page.evaluate(() => [window.__film.width, window.__film.height]);
  if (size[0] !== OW || size[1] !== OH) { console.warn(`warn: page renders ${size.join('x')}, expected ${OW}x${OH}`); }
  const sceneErrors = await page.evaluate(() => window.__film.errors);
  if (sceneErrors?.length) console.warn('scene load errors:\n' + sceneErrors.join('\n'));
  return { browser, page, srv, logs, size };
}

/** PNG bytes of the canvas at time t (straight from the drawing buffer, no page scaling) */
async function framePNG(page, t) {
  const b64 = await page.evaluate((tt) => {
    window.__film.render(tt);
    const c = document.getElementById('c');
    return c.toDataURL('image/png').split(',')[1];
  }, t);
  return Buffer.from(b64, 'base64');
}

async function frameRGB(page, t) {
  const b64 = await page.evaluate((tt) => {
    window.__film.render(tt);
    const c = document.getElementById('c');
    return c.toDataURL('image/png').split(',')[1];
  }, t);
  return Buffer.from(b64, 'base64'); // png; decoded by ffmpeg on the image2pipe input
}

async function stills() {
  const times = (opt('t', '0')).split(',').map(Number);
  const out = path.resolve(ROOT, opt('out', 'out/stills'));
  fs.mkdirSync(out, { recursive: true });
  const { browser, page, srv, logs } = await open();
  const files = [];
  for (const t of times) {
    const f = path.join(out, `t_${t.toFixed(2).padStart(7, '0')}.png`);
    fs.writeFileSync(f, await framePNG(page, t));
    files.push(f);
    console.log(f);
  }
  await browser.close(); srv.close();
  if (logs.length) console.log('LOGS:\n' + logs.slice(0, 30).join('\n'));
}

async function sheet() {
  const from = +opt('from', '0'), to = +opt('to', '12');
  const n = +opt('n', '9'), cols = +opt('cols', '3');
  const out = path.resolve(ROOT, opt('out', 'out/sheet.png'));
  const times = Array.from({ length: n }, (_, i) => from + ((to - from) * i) / Math.max(1, n - 1));
  const { browser, page, srv, logs } = await open();
  const dataUrl = await page.evaluate(async ({ times, cols }) => {
    const cw = 480, ch = 270, pad = 6, lab = 18;
    const rows = Math.ceil(times.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * (cw + pad) + pad;
    cv.height = rows * (ch + lab + pad) + pad;
    const g = cv.getContext('2d');
    g.fillStyle = '#1b1a18'; g.fillRect(0, 0, cv.width, cv.height);
    const src = document.getElementById('c');
    for (let i = 0; i < times.length; i++) {
      window.__film.render(times[i]);
      const x = pad + (i % cols) * (cw + pad);
      const y = pad + Math.floor(i / cols) * (ch + lab + pad);
      g.drawImage(src, x, y + lab, cw, ch);
      g.fillStyle = '#cfc6b3'; g.font = '13px monospace';
      g.fillText(times[i].toFixed(2) + 's', x + 2, y + 13);
    }
    return cv.toDataURL('image/png');
  }, { times, cols });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(out);
  await browser.close(); srv.close();
  if (logs.length) console.log('LOGS:\n' + logs.slice(0, 20).join('\n'));
}

async function renderTo(outFile, from, to, fps, crf, audio = true, workers = 1) {
  const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
  const total = f1 - f0;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  // the encoder
  const args = ['-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-vcodec', 'png', '-r', String(fps), '-i', 'pipe:0'];
  if (audio) args.push('-ss', String(from), '-t', String(total / fps), '-i', path.join(ROOT, 'audio/score.wav'));
  args.push(
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-x264-params', 'aq-mode=3:deblock=-1,-1', '-tune', 'film',
  );
  if (audio) args.push('-c:a', 'aac', '-b:a', '320k', '-shortest');
  args.push('-movflags', '+faststart', outFile);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });

  // one headless page per worker; each renders a contiguous chunk and hands back PNGs
  const W = Math.max(1, Math.min(workers, total));
  const chunk = Math.ceil(total / W);
  const pages = [];
  for (let k = 0; k < W; k++) pages.push(await open());

  const t0 = Date.now();
  let written = 0;
  const spool = new Map(); // frame index -> Buffer, bounded by ~72 frames in flight
  const order = [];
  for (let n = f0; n < f1; n++) order.push(n);

  // producer: every page renders its chunk and pushes buffers into the reorder window
  let cursor = 0;
  const nextFrame = () => (cursor < total ? f0 + cursor++ : null);
  const results = new Map();
  let flushing = false;
  const flush = async () => {
    if (flushing) return;
    flushing = true;
    try {
      while (results.has(nextWrite)) {
        const buf = results.get(nextWrite);
        results.delete(nextWrite);
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        written++;
        nextWrite++;
        if (written % 30 === 0 || written === total) {
          const el = (Date.now() - t0) / 1000;
          const eta = (el / written) * (total - written);
          process.stdout.write(`\r${written}/${total}  ${(written / el).toFixed(1)} fps  eta ${(eta / 60).toFixed(1)}m   `);
        }
      }
    } finally {
      flushing = false;
    }
  };
  let nextWrite = f0;
  let done = 0;
  await Promise.all(pages.map(async (p) => {
    for (;;) {
      const n = nextFrame();
      if (n === null || done) break;
      // keep memory bounded: wait for the writer to catch up
      while (results.size > 64) await new Promise((r) => setTimeout(r, 12));
      const t = n / fps;
      const buf = await frameRGB(p.page, t);
      results.set(n, buf);
      await flush();
    }
  }));
  await flush();
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  for (const p of pages) { await p.browser.close(); p.srv.close(); }
  const el = (Date.now() - t0) / 1000;
  console.log(`\n${path.basename(outFile)}  ${total} frames in ${(el / 60).toFixed(1)} min (${(total / el).toFixed(1)} fps, ${W} workers)`);
  const logs = pages.flatMap((p) => p.logs).slice(0, 20);
  if (logs.length) console.log('LOGS:\n' + logs.join('\n'));
}

async function main() {
  if (mode === 'probe') {
    const { browser, page, srv } = await open();
    const info = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        film: { w: window.__film.width, h: window.__film.height, d: window.__film.duration },
        timeline: window.__film.timeline.map((e) => `${e.id} ${e.name} ${e.start}-${e.end}`),
      };
    });
    console.log(JSON.stringify(info, null, 2));
    await browser.close(); srv.close();
    return;
  }
  if (mode === 'stills') return stills();
  if (mode === 'sheet') return sheet();
  if (mode === 'clip') {
    const fps = +opt('fps', '30');
    return renderTo(path.resolve(ROOT, opt('out', 'out/clip.mp4')), +opt('from', '0'), +opt('to', '12'), fps, +opt('crf', '18'), flag('noaudio') ? false : true, +opt('workers', '3'));
  }
  if (mode === 'film') {
    const fps = +opt('fps', '60');
    return renderTo(path.resolve(ROOT, opt('out', 'out/film.mp4')), +opt('from', '0'), +opt('to', '84'), fps, +opt('crf', '15'), true, +opt('workers', '4'));
  }
  console.log('modes: stills | sheet | clip | film | probe');
}

main().catch((e) => { console.error(e); process.exit(1); });
