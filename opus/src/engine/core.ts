// Renderer core: t → pixels. Used verbatim by the browser preview and the offline export.
import { env, type C } from './env';
import { makeFrame, type Scene, type PostOut } from './scene';
import { P } from './palette';
import { hash, mulberry32 } from './util';

export const W = 1920, H = 1080;

let grainTiles: any[] | null = null;
let vignettes: Record<string, any> = {};

function ensurePost(scale: number) {
  if (grainTiles) return;
  grainTiles = [];
  // 4 pre-baked grain tiles (fine, 1 physical px) chosen per frame by hash: deterministic grain
  for (let k = 0; k < 4; k++) {
    const sz = 256;
    const cv = env.makeCanvas(sz, sz);
    const g = cv.getContext('2d');
    const img = g.createImageData(sz, sz);
    const r = mulberry32(1000 + k);
    for (let i = 0; i < sz * sz; i++) {
      const v = Math.floor(r() * 255);
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainTiles.push(cv);
  }
  for (const ground of ['paper', 'ink']) {
    const cv = env.makeCanvas(W * scale / 4, H * scale / 4);
    const g = cv.getContext('2d');
    g.scale(scale / 4, scale / 4);
    const rg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, ground === 'paper' ? 'rgba(70,55,35,0.13)' : 'rgba(0,0,0,0.55)');
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);
    vignettes[ground] = cv;
  }
}

export function findScene(scenes: Scene[], t: number) {
  for (const s of scenes) if (t >= s.start && t < s.end) return s;
  return t < scenes[0]!.start ? scenes[0]! : scenes[scenes.length - 1]!;
}

function drawScene(c: C, s: Scene, t: number, scale: number): PostOut {
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  return (s.render(c, makeFrame(t, s)) as PostOut) ?? {};
}

/**
 * Render song time t into context c (canvas of W*scale × H*scale).
 * `shutter` (fraction of a frame) and the scene's samples() give motion blur:
 * k sub-frames averaged exactly with running-mean alpha 1/k.
 */
export function renderFrame(c: C, scenes: Scene[], t: number, opts: { scale?: number; fps?: number; shutter?: number; scratch?: any; maxSamples?: number } = {}) {
  const scale = opts.scale ?? 1, fps = opts.fps ?? 60, shutter = opts.shutter ?? 0.5;
  ensurePost(scale);
  const s = findScene(scenes, t);
  const n = Math.min(opts.maxSamples ?? 16, Math.max(1, Math.round(s.samples?.(t) ?? 1)));
  let post: PostOut;
  if (n <= 1 || !opts.scratch) {
    post = drawScene(c, s, t, scale);
  } else {
    const sc = opts.scratch.getContext('2d') as C;
    post = {};
    for (let k = 0; k < n; k++) {
      const tk = t + ((k + 0.5) / n - 0.5) * (shutter / fps);
      const sk = findScene(scenes, tk) === s ? s : findScene(scenes, tk);
      const target = k === 0 ? c : sc;
      const pk = drawScene(target, sk, tk, scale);
      if (k === Math.floor(n / 2)) post = pk;
      if (k > 0) {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1 / (k + 1);
        c.drawImage(opts.scratch, 0, 0);
        c.globalAlpha = 1;
      }
    }
  }
  applyPost(c, post, t, scale, fps);
}

function applyPost(c: C, post: PostOut, t: number, scale: number, fps: number) {
  const ground = post.ground ?? 'paper';
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  if (post.fade) {
    c.globalAlpha = post.fade;
    c.fillStyle = ground === 'paper' ? P.paper : P.ink;
    c.fillRect(0, 0, W * scale, H * scale);
    c.globalAlpha = 1;
  }
  if (post.flash) {
    c.globalAlpha = Math.min(1, post.flash);
    c.fillStyle = '#FFFDF7';
    c.fillRect(0, 0, W * scale, H * scale);
    c.globalAlpha = 1;
  }
  // vignette
  const v = post.vignette ?? 1;
  if (v > 0) {
    c.globalAlpha = v;
    c.drawImage(vignettes[ground], 0, 0, W * scale, H * scale);
    c.globalAlpha = 1;
  }
  // grain: 'overlay' at low opacity keeps paper tactile and ink velvety
  const g = post.grain ?? (ground === 'paper' ? 0.07 : 0.09);
  if (g > 0 && grainTiles) {
    const fi = Math.floor(t * fps + 0.0001);
    const tile = grainTiles[Math.floor(hash(fi, 7) * 4)]!;
    const ox = Math.floor(hash(fi, 1) * 256), oy = Math.floor(hash(fi, 2) * 256);
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = g;
    const pat = c.createPattern(tile, 'repeat')!;
    c.translate(-ox, -oy);
    c.fillStyle = pat;
    c.fillRect(0, 0, W * scale + 256, H * scale + 256);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}

/** 2D camera: world → screen. zoom about world point (x,y) placed at screen centre. */
export function camera(c: C, x: number, y: number, zoom: number, rot = 0, shake: [number, number] = [0, 0]) {
  c.translate(W / 2 + shake[0], H / 2 + shake[1]);
  if (rot) c.rotate(rot);
  c.scale(zoom, zoom);
  c.translate(-x, -y);
}

export function clear(c: C, color: string) {
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = color;
  c.fillRect(0, 0, 99999, 99999);
  c.restore();
}
