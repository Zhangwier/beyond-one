// Browser preview: identical scene code, HTMLCanvas instead of Skia.
// Keys: space play/pause · ←/→ ±1 s (shift ±5) · , / . one frame · [ / ] prev/next scene · l loop scene · h hide UI
// URL: ?t=23.5  &scale=2  &blur=1 (motion blur like the export)
import { env } from '../src/engine/env';
import { FONT_FILES } from '../src/engine/type';
import { renderFrame, findScene, W, H } from '../src/engine/core';
import { makeTimeline } from '../src/timeline';
import { DURATION, barAt } from '../src/engine/score';

const q = new URLSearchParams(location.search);
const scale = parseFloat(q.get('scale') ?? '1');
const blur = q.get('blur') === '1';
const FPS = 60;

async function boot() {
  await Promise.all(Object.entries(FONT_FILES).map(async ([fam, file]) => {
    const ff = new FontFace(fam, `url(../fonts/${file})`);
    await ff.load();
    (document as any).fonts.add(ff);
  }));
  env.makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c as any; };
  env.makePath = (d?: string) => new Path2D(d);
  env.audio = await (await fetch('../data/audio.json')).json();

  const scenes = makeTimeline();
  const cv = document.getElementById('c') as HTMLCanvasElement;
  cv.width = W * scale; cv.height = H * scale;
  const ctx = cv.getContext('2d')!;
  const scratch = document.createElement('canvas'); scratch.width = cv.width; scratch.height = cv.height;
  const audio = new Audio('../out/score.wav');
  const hud = document.getElementById('hud')!;
  let t = parseFloat(q.get('t') ?? '0');
  let playing = false, loop: [number, number] | null = null;
  audio.currentTime = t;

  const seek = (x: number) => { t = Math.max(0, Math.min(DURATION, x)); audio.currentTime = t; };
  addEventListener('keydown', (e) => {
    const s = findScene(scenes, t);
    if (e.key === ' ') { playing = !playing; playing ? audio.play() : audio.pause(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') seek(t + (e.shiftKey ? 5 : 1));
    else if (e.key === 'ArrowLeft') seek(t - (e.shiftKey ? 5 : 1));
    else if (e.key === '.') seek(Math.round(t * FPS + 1) / FPS);
    else if (e.key === ',') seek(Math.round(t * FPS - 1) / FPS);
    else if (e.key === ']') { const i = scenes.indexOf(s); seek(scenes[Math.min(scenes.length - 1, i + 1)]!.start); }
    else if (e.key === '[') { const i = scenes.indexOf(s); seek(t - s.start > 0.5 ? s.start : scenes[Math.max(0, i - 1)]!.start); }
    else if (e.key === 'l') loop = loop ? null : [s.start, s.end];
    else if (e.key === 'h') hud.style.display = hud.style.display === 'none' ? '' : 'none';
  });
  const frame = () => {
    if (playing) {
      t = audio.currentTime;
      if (loop && t >= loop[1]) seek(loop[0]);
      if (t >= DURATION) { playing = false; audio.pause(); }
    }
    // quantize to the export's frame grid so preview == export
    const tq = Math.round(t * FPS) / FPS;
    renderFrame(ctx as any, scenes, tq, { scale, fps: FPS, scratch: blur ? scratch : undefined });
    const s = findScene(scenes, tq);
    hud.textContent = `${tq.toFixed(3)} s · bar ${barAt(tq).toFixed(2)} · ${s.id}${loop ? ' · loop' : ''}${playing ? '' : ' · paused'}`;
    requestAnimationFrame(frame);
  };
  frame();
}
boot();
