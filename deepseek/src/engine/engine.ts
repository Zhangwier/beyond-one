// engine.ts — deterministic time. render(t) is a pure function of t: no accumulation, no
// Date.now, no Math.random. The offline renderer asks for frames in any order and always
// gets the same pixels.
import { GL, RT, Layer, W, H } from './core.ts';
import { Paper } from './paper.ts';
import { Compose, Blit, type ComposeOpts } from './compose.ts';
import { Brush, type Stroke } from './brush.ts';
import { loadFonts } from './type.ts';
import { audio, loadAudio, type Features } from './audio.ts';
import { fsQuad } from './core.ts';

export type Post = Partial<ComposeOpts>;

export type Ctx = {
  gl: WebGL2RenderingContext;
  scale: number;
  W: number; H: number;
  brush: Brush;
  brushRT: RT;
  t: number;
  lt: number;
  p: number;
  start: number;
  end: number;
  feats: Features;
  post: Post;
  /** queue ink strokes (flush order is preserved, back to front) */
  ink: (...s: Stroke[]) => void;
  /** draw into the typographic layer with Canvas2D */
  type: (fn: (ctx: CanvasRenderingContext2D) => void) => void;
  /** draw into the accent layer (the fil's single vermilion) */
  accent: (fn: (ctx: CanvasRenderingContext2D) => void) => void;
  /** the paper's own colour for this frame (scenes can shift it) */
  paper: [number, number, number];
};

export abstract class Scene {
  abstract render(c: Ctx): void;
}
export type SceneClass = new () => Scene;

export type Entry = { id: string; start: number; end: number; name: string; scene: string; params?: any };

export class Engine {
  gl: GL;
  glc: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  scale: number;
  paperRT: RT;
  outRT: RT;
  paper: Paper;
  brush: Brush;
  compose: Compose;
  blit: Blit;
  quad: WebGLVertexArrayObject;
  typeLayer: Layer;
  accentLayer: Layer;

  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas;
    this.scale = scale;
    this.gl = new GL(canvas, scale);
    const gl = this.gl.gl;
    this.glc = gl;
    this.quad = fsQuad(gl);
    const pw = Math.round(W * scale), ph = Math.round(H * scale);
    this.paperRT = new RT(gl, pw, ph);
    this.outRT = new RT(gl, pw, ph);
    this.paper = new Paper(gl);
    this.brush = new Brush(gl, scale);
    this.compose = new Compose(gl);
    this.blit = new Blit(gl);
    this.typeLayer = new Layer(gl, scale);
    this.accentLayer = new Layer(gl, scale);
  }

  async init() {
    await Promise.all([loadFonts(), loadAudio()]);
  }

  strokes: Stroke[] = [];
  typeFns: ((ctx: CanvasRenderingContext2D) => void)[] = [];
  accentFns: ((ctx: CanvasRenderingContext2D) => void)[] = [];

  render(t: number, entry: Entry, scene: Scene) {
    const gl = this.glc;
    this.strokes = [];
    this.typeFns = [];
    this.accentFns = [];
    const c: Ctx = {
      gl, scale: this.scale, W, H,
      brush: this.brush,
      brushRT: this.brush.rt,
      t, lt: t - entry.start, p: (t - entry.start) / Math.max(1e-6, entry.end - entry.start),
      start: entry.start, end: entry.end,
      feats: audio(),
      post: {},
      ink: (...s) => this.strokes.push(...s),
      type: (fn) => this.typeFns.push(fn),
      accent: (fn) => this.accentFns.push(fn),
      paper: [0.910, 0.882, 0.822],
    };

    // 1. the sheet
    this.paper.render(gl, this.quad, this.paperRT, t, c.paper);
    // 2. the ink buffers start clean
    this.brush.clear();
    // 3. the scene decides what is on the page
    scene.render(c);
    // 4. flush
    if (this.strokes.length) this.brush.draw(this.strokes);
    this.typeLayer.clear();
    for (const f of this.typeFns) f(this.typeLayer.ctx);
    if (this.accentFns.length) {
      this.accentLayer.clear();
      for (const f of this.accentFns) f(this.accentLayer.ctx);
    }
    // 5. paper × ink
    this.compose.draw(gl, this.quad, this.outRT, this.paperRT, this.brush.rt,
      this.typeFns.length ? this.typeLayer : null,
      this.accentFns.length ? this.accentLayer : null,
      { ...c.post, brushOn: this.strokes.length > 0, typeOn: this.typeFns.length > 0, accentOn: this.accentFns.length > 0 });
    // 6. to screen
    this.blit.draw(gl, this.quad, this.outRT, t, c.post.grain ?? 0.006);
    return c;
  }
}
