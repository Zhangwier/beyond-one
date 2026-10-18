// core.ts — WebGL2 plumbing for a paper-and-ink film.
// Everything is drawn in *logical* pixels (1920x1080); `scale` multiplies the backing
// store so 4K is a true 3840x2160 render of the same layout, not an upscale.
export const W = 1920;
export const H = 1080;

export const PAL = {
  paper: '#E9E2D3', // bone
  paper2: '#DCD3C0',
  ink: '#15120E',
  graphite: '#6B655B',
  vermilion: '#B7351F', // used exactly twice in the film
};

export function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export const LIN = {
  paper: hex(PAL.paper),
  paper2: hex(PAL.paper2),
  ink: hex(PAL.ink),
  graphite: hex(PAL.graphite),
  vermilion: hex(PAL.vermilion),
};

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const inv = (a: number, b: number, x: number) => clamp((x - a) / (b - a || 1e-9));
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const sstep = (a: number, b: number, x: number) => smooth(inv(a, b, x));
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeIn = (x: number) => x * x * x;
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const expo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const springish = (x: number, k = 7) => (x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(11 * x * (1 - Math.exp(-k * x))));
/** window: 0 before a, 1 inside [a,b], 0 after b, with soft edges of width e */
export const win = (t: number, a: number, b: number, e = 0.06) => sstep(a, a + e, t) * (1 - sstep(b - e, b, t));
export const remap = (x: number, a: number, b: number, c: number, d: number) => c + (d - c) * inv(a, b, x);

/** deterministic hash in [0,1) */
export function hash(x: number, y = 0): number {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ gl
export class GL {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  scale: number;
  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas;
    this.scale = scale;
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    // float render targets if offered (smoother ink gradients in the HDR-ish passes)
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
  }
  viewport() {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
}

export function program(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string, name = ''): WebGLProgram {
  const vs = shader(gl, gl.VERTEX_SHADER, vsSrc, name + ':vs');
  const fs = shader(gl, gl.FRAGMENT_SHADER, fsSrc, name + ':fs');
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`${name} link: ${gl.getProgramInfoLog(p)}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}

function shader(gl: WebGL2RenderingContext, type: number, src: string, name: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s) || '';
    const lines = src.split('\n').map((l, i) => `${String(i + 1).padStart(3)} ${l}`).join('\n');
    throw new Error(`${name} compile: ${log}\n${lines}`);
  }
  return s;
}

export class Prog {
  p: WebGLProgram;
  gl: WebGL2RenderingContext;
  u: Record<string, WebGLUniformLocation | null> = {};
  constructor(gl: WebGL2RenderingContext, vs: string, fs: string, name = '') {
    this.gl = gl;
    this.p = program(gl, vs, fs, name);
    const n = gl.getProgramParameter(this.p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(this.p, i)!;
      const nm = info.name.replace(/\[0\]$/, '');
      this.u[nm] = gl.getUniformLocation(this.p, info.name);
    }
  }
  use() { this.gl.useProgram(this.p); return this; }
  f(n: string, v: number) { const l = this.u[n]; if (l) this.gl.uniform1f(l, v); return this; }
  i(n: string, v: number) { const l = this.u[n]; if (l) this.gl.uniform1i(l, v); return this; }
  v2(n: string, x: number, y: number) { const l = this.u[n]; if (l) this.gl.uniform2f(l, x, y); return this; }
  v3(n: string, x: number, y: number, z: number) { const l = this.u[n]; if (l) this.gl.uniform3f(l, x, y, z); return this; }
  v4(n: string, x: number, y: number, z: number, w: number) { const l = this.u[n]; if (l) this.gl.uniform4f(l, x, y, z, w); return this; }
  col(n: string, c: [number, number, number], a = 1) { return this.v4(n, c[0], c[1], c[2], a); }
}

/** fullscreen triangle */
export function fsQuad(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const b = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
}

export class RT {
  gl: WebGL2RenderingContext;
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  w: number;
  h: number;
  constructor(gl: WebGL2RenderingContext, w: number, h: number) {
    this.gl = gl;
    this.w = w;
    this.h = h;
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  bind() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.w, this.h);
  }
  static unbind(gl: WebGL2RenderingContext) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

/** Canvas2D layer → texture. `w,h` are logical; the backing store follows `scale`. */
export class Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: WebGLTexture;
  scale: number;
  w: number;
  h: number;
  gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext, scale: number, w = W, h = H) {
    this.gl = gl;
    this.scale = scale;
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(w * scale);
    this.canvas.height = Math.round(h * scale);
    const ctx = this.canvas.getContext('2d', { alpha: true })!;
    ctx.scale(scale, scale);
    this.ctx = ctx;
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  clear() {
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.restore();
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
  }
  upload() {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    // a Canvas2D has y down from the top-left; GL textures have y up from the bottom-left.
    // Our fullscreen quad's vUv is y-up, so the canvas must be flipped on upload or every
    // plate would be printed upside down.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    return this.tex;
  }
}

// ------------------------------------------------------------------ shader chunks
export const GLSL_COMMON = /* glsl */ `
precision highp float;
#define PI 3.14159265359
#define TAU 6.28318530718

float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); p3 += dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1,0));
  float c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p, int oct){
  float s = 0.0, a = 0.5;
  for(int i=0;i<8;i++){ if(i>=oct) break; s += a*vnoise(p); p = p*2.02 + 17.3; a *= 0.5; }
  return s;
}
// fibrous paper: stretched noise
float fiber(vec2 p){
  float a = fbm(vec2(p.x*0.06, p.y*0.9), 3);
  float b = fbm(vec2(p.x*0.5, p.y*7.0)+13.0, 2);
  return a*0.7 + b*0.3;
}
`;

export const VS_FS = /* glsl */ `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`;
