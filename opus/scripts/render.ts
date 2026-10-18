// Offline renderer (Node + Skia via @napi-rs/canvas → ffmpeg). Same scene code as the preview.
//   npx tsx scripts/render.ts stills --t 1,2.5,10 [--scale 2] [--out out/stills]
//   npx tsx scripts/render.ts sheet  --from 0 --to 10 --n 12 --cols 4 --out out/sheet.png
//   npx tsx scripts/render.ts video  [--from 0 --to 88] [--fps 60] [--scale 1|2] [--workers 2] [--crf 16] [--out out/film.mp4]
import { createCanvas, GlobalFonts, Path2D } from '@napi-rs/canvas';
import { readFileSync, mkdirSync, writeFileSync, unlinkSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawn, fork } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../src/engine/env';
import { FONT_FILES } from '../src/engine/type';
import { renderFrame, W, H } from '../src/engine/core';
import { makeTimeline } from '../src/timeline';
import { DURATION } from '../src/engine/score';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const [fam, file] of Object.entries(FONT_FILES)) GlobalFonts.registerFromPath(join(ROOT, 'fonts', file), fam);
env.makeCanvas = (w, h) => createCanvas(Math.round(w), Math.round(h)) as any;
env.makePath = (d?: string) => new Path2D(d) as any;
env.audio = JSON.parse(readFileSync(join(ROOT, 'data/audio.json'), 'utf8'));

const args = process.argv.slice(2);
const mode = args[0] ?? 'stills';
const opt = (k: string, d?: string) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1]! : d; };
const scale = parseFloat(opt('scale', '1')!);
const fps = parseInt(opt('fps', '60')!);
const scenes = makeTimeline();

function mk() {
  const cv = createCanvas(W * scale, H * scale);
  const scratch = createCanvas(W * scale, H * scale);
  return { cv, c: cv.getContext('2d') as any, scratch };
}

async function stills() {
  const ts = opt('t', '1')!.split(',').map(Number);
  const out = opt('out', join(ROOT, 'out/stills'))!;
  mkdirSync(out, { recursive: true });
  const { cv, c, scratch } = mk();
  for (const t of ts) {
    const t0 = Date.now();
    renderFrame(c, scenes, t, { scale, fps, scratch });
    const f = join(out, `t${t.toFixed(2).padStart(6, '0')}.png`);
    writeFileSync(f, await cv.encode('png'));
    console.log(f, Date.now() - t0, 'ms');
  }
}

async function sheet() {
  const from = parseFloat(opt('from', '0')!), to = parseFloat(opt('to', '10')!);
  const nn = parseInt(opt('n', '12')!), cols = parseInt(opt('cols', '4')!);
  const rows = Math.ceil(nn / cols), tw = 480, th = 270;
  const sh = createCanvas(cols * tw, rows * (th + 22));
  const g = sh.getContext('2d');
  g.fillStyle = '#222'; g.fillRect(0, 0, sh.width, sh.height);
  const { cv, c, scratch } = mk();
  for (let i = 0; i < nn; i++) {
    const t = from + ((to - from) * i) / Math.max(1, nn - 1);
    renderFrame(c, scenes, t, { scale, fps, scratch });
    const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + 22);
    g.drawImage(cv as any, x, y, tw, th);
    g.fillStyle = '#ddd'; g.font = '14px "Mono"'; g.fillText(`t=${t.toFixed(2)}`, x + 6, y + th + 16);
  }
  const out = opt('out', join(ROOT, 'out/sheet.png'))!;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, await sh.encode('png'));
  console.log(out);
}

/** Render frames [f0, f1) to an mp4 segment (no audio). */
async function segment(f0: number, f1: number, out: string, crf: string, preset: string) {
  const { cv, c, scratch } = mk();
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W * scale}x${H * scale}`, '-r', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-pix_fmt', 'yuv420p', '-tune', 'grain', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    renderFrame(c, scenes, f / fps, { scale, fps, scratch });
    const px = (cv as any).data() as Buffer; // raw RGBA, fully opaque frame
    if (!ff.stdin.write(Buffer.from(px))) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - f0) % 120 === 0) process.stdout.write(`  [${f0}-${f1}] frame ${f} ${(((Date.now() - t0) / Math.max(1, f - f0 + 1))).toFixed(0)} ms/f\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
}

async function video() {
  const from = parseFloat(opt('from', '0')!), to = parseFloat(opt('to', String(DURATION))!);
  const out = resolve(opt('out', join(ROOT, 'out/film.mp4'))!);
  const workers = parseInt(opt('workers', '2')!);
  const crf = opt('crf', '16')!, preset = opt('preset', 'medium')!;
  const F0 = Math.round(from * fps), F1 = Math.round(to * fps);
  mkdirSync(dirname(out), { recursive: true });
  const segs: string[] = [];
  const per = Math.ceil((F1 - F0) / workers);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, (_, k) => {
    const a = F0 + k * per, b = Math.min(F1, a + per);
    const seg = join(tmpdir(), `beyond-part${k}-${process.pid}.mp4`);
    segs.push(seg);
    return new Promise<void>((res, rej) => {
      const ch = fork(fileURLToPath(import.meta.url), ['segment', '--f0', String(a), '--f1', String(b), '--seg', seg, '--scale', String(scale), '--fps', String(fps), '--crf', crf, '--preset', preset], { execArgv: process.execArgv });
      ch.on('exit', (code) => (code === 0 ? res() : rej(new Error('worker failed ' + code))));
    });
  }));
  const list = join(tmpdir(), `beyond-${process.pid}.txt`);
  const tmpOut = join(tmpdir(), `beyond-${process.pid}.mp4`);
  writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  await new Promise((r) => spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ss', String(from), '-t', String(to - from), '-i', join(ROOT, 'out/score.wav'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-movflags', '+faststart', '-shortest', tmpOut], { stdio: 'inherit' }).on('close', r));
  if (!existsSync(tmpOut)) throw new Error('mux failed; segments kept in ' + tmpdir());
  copyFileSync(tmpOut, out); unlinkSync(tmpOut);
  for (const s of segs) if (existsSync(s)) unlinkSync(s);
  unlinkSync(list);
  console.log('wrote', out, ((Date.now() - t0) / 1000).toFixed(0), 's');
}

if (mode === 'stills') await stills();
else if (mode === 'sheet') await sheet();
else if (mode === 'video') await video();
else if (mode === 'segment') await segment(parseInt(opt('f0')!), parseInt(opt('f1')!), opt('seg')!, opt('crf', '16')!, opt('preset', 'medium')!);
