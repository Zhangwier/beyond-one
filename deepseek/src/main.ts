// main.ts — the film's entry point. Two modes:
//   preview: real-time playback (space, arrows, , . for frame step, [ ] for scenes, h to hide)
//   export:  window.__film.render(t) draws exactly one frame and returns; nothing animates by itself
import { Engine } from './engine/engine.ts';
import { timeline, entryAt, DURATION } from './timeline.ts';
import { W, H } from './engine/core.ts';
import * as scenes from './scenes/index.ts';

const q = new URLSearchParams(location.search);
const scale = Math.max(1, Math.min(4, +(q.get('scale') || 1)));
const canvas = document.getElementById('c') as HTMLCanvasElement;
const err = document.getElementById('err') as HTMLDivElement;
const hud = document.getElementById('hud') as HTMLDivElement;
const tt = document.getElementById('tt') as HTMLElement;
const nm = document.getElementById('nm') as HTMLElement;
const fpsEl = document.getElementById('fps') as HTMLElement;
const bar = document.getElementById('bar') as HTMLDivElement;

const engine = new Engine(canvas, scale);
const sceneMap = new Map<string, any>();
const loadErrors: string[] = [];

function showErr(e: unknown) {
  err.style.display = 'block';
  err.textContent = String((e as any)?.stack || e);
  (window as any).__ERR = err.textContent;
}

window.addEventListener('error', (e) => showErr(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showErr(e.reason));

let t = +(q.get('t') || 0);
const still = q.get('still') === '1' || q.has('export');

function draw(t: number) {
  // ?scene=<id> renders a single plate at any time (for isolated tests)
  const forced = q.get('scene');
  const entry = forced
    ? { id: 'DBG', scene: forced, name: forced, start: 0, end: DURATION }
    : entryAt(t);
  const scene = sceneMap.get(entry.scene);
  if (!scene) {
    // never fail silently: a missing scene is an error, not an empty frame
    if (!loadErrors.includes('missing ' + entry.scene)) loadErrors.push('missing ' + entry.scene);
    console.error('missing scene for entry', entry.id, entry.scene);
    return;
  }
  engine.render(t, entry, scene);
  tt.textContent = t.toFixed(2);
  nm.textContent = entry.name;
  bar.style.width = `${(t / DURATION) * 100}%`;
}

async function boot() {
  await engine.init();
  for (const [k, v] of Object.entries(scenes)) {
    if (typeof v === 'function') {
      // timeline ids are lowercase (title, connect…); the modules export class names
      const key = k.charAt(0).toLowerCase() + k.slice(1);
      try { sceneMap.set(key, new v()); } catch (e) { loadErrors.push(`${k}: ${String(e)}`); }
    }
  }
  draw(t);
  (window as any).__film = {
    render: (tt: number) => { t = tt; draw(tt); return true; },
    engine,
    ready: true,
    width: Math.round(W * scale),
    height: Math.round(H * scale),
    duration: DURATION,
    timeline,
    errors: loadErrors,
  };
  (window as any).__ready = true;

  if (!still) {
    let playing = true;
    let last = performance.now();
    let frames = 0, acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing) {
        t = (t + dt) % DURATION;
        draw(t);
        frames++; acc += dt;
        if (acc > 0.5) { fpsEl.textContent = `${(frames / acc).toFixed(0)} fps`; frames = 0; acc = 0; }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { playing = !playing; e.preventDefault(); }
      if (e.code === 'ArrowRight') { t = Math.min(DURATION - 0.001, t + (e.shiftKey ? 5 : 1)); draw(t); }
      if (e.code === 'ArrowLeft') { t = Math.max(0, t - (e.shiftKey ? 5 : 1)); draw(t); }
      if (e.key === ',') { t = Math.max(0, t - 1 / 60); draw(t); }
      if (e.key === '.') { t = Math.min(DURATION - 0.001, t + 1 / 60); draw(t); }
      if (e.key === '[') { const i = timeline.findIndex((x) => x.id === entryAt(t).id); draw(timeline[Math.max(0, i - 1)].start); }
      if (e.key === ']') { const i = timeline.findIndex((x) => x.id === entryAt(t).id); draw(timeline[Math.min(timeline.length - 1, i + 1)].start); }
      if (e.key === 'h') hud.style.display = hud.style.display === 'none' ? '' : 'none';
    });
  } else {
    hud.style.display = 'none';
  }
}

boot().catch(showErr);
