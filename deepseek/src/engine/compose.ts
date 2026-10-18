// compose.ts 鈥?all the film's paint is ink on paper, so the compositor does exactly one
// physical thing: it filters the paper through the ink's coverage.
//   paper  = the substrate (bone stock, fibre, vignette)
//   ink    = white coverage in a canvas 鈫?tinted by uInkColor here
//   accent = a second coverage layer, used for the film's single vermilion
// Type and brush are both coverage masks, which is why a letter and a brush stroke
// behave identically under the same paper tooth.
import { Prog, VS_FS, GLSL_COMMON, RT, Layer, W, H } from './core.ts';

const FS = /* glsl */ `#version 300 es
${GLSL_COMMON}
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPaper;
uniform sampler2D uBrush;
uniform sampler2D uType;
uniform sampler2D uAccent;
uniform vec2  uRes;
uniform float uBrushOn;
uniform float uTypeOn;
uniform float uAccOn;
uniform float uSoft;       // ink absorbency in px
uniform float uInvert;     // 0 = bone paper, 1 = ink paper (used for one shot)
uniform vec3  uInkColor;
uniform vec3  uAccColor;
uniform float uFade;       // transition exposure: 0 = paper blank, 1 = full
uniform float uFadeInk;    // 0 = fade to bone, 1 = fade to ink
uniform vec3  uPaperTint;
uniform float uPaperGain;

float cov(sampler2D t, vec2 uv, float s){
  vec2 tx = 1.0 / uRes;
  float a = texture(t, uv).a * 0.4;
  a += texture(t, uv + vec2( s, 0.0)*tx).a * 0.15;
  a += texture(t, uv + vec2(-s, 0.0)*tx).a * 0.15;
  a += texture(t, uv + vec2(0.0, s)*tx).a * 0.15;
  a += texture(t, uv + vec2(0.0,-s)*tx).a * 0.15;
  return a;
}

void main(){
  vec3 paper = texture(uPaper, vUv).rgb * uPaperTint * uPaperGain;
  float s = max(0.6, uSoft);
  float a = 0.0;
  if (uBrushOn > 0.5) a = max(a, cov(uBrush, vUv, s));
  if (uTypeOn  > 0.5) a = max(a, cov(uType,  vUv, s * 0.35));
  float aa = 0.0;
  if (uAccOn > 0.5) aa = cov(uAccent, vUv, s * 0.35);

  // the ink is a filter: the paper's fibre shows through the letters
  vec3 inked = paper * uInkColor * 1.06;
  vec3 col = mix(paper, inked, a);
  vec3 accented = paper * uAccColor * 1.06;
  col = mix(col, accented, aa);

  if (uInvert > 0.001) {
    // ink paper: a negative of the same sheet, still paper, never a black screen
    vec3 inv = vec3(0.082, 0.073, 0.062) + (1.0 - paper) * 0.10;
    vec3 invInk = vec3(0.905, 0.878, 0.820) * (0.55 + 0.45 * paper);
    vec3 ic = mix(inv, invInk, a);
    col = mix(col, ic, uInvert);
  }

  // transition: fade to the sheet itself, never to black
  vec3 blank = mix(vec3(0.918, 0.890, 0.831), vec3(0.075, 0.067, 0.057), uFadeInk);
  col = mix(blank, col, uFade);

  fragColor = vec4(col, 1.0);
}`;

export type ComposeOpts = {
  brushOn?: boolean;
  typeOn?: boolean;
  accentOn?: boolean;
  soft?: number;
  invert?: number;
  ink?: [number, number, number];
  accent?: [number, number, number];
  fade?: number;
  fadeInk?: number;
  paperTint?: [number, number, number];
  paperGain?: number;
  grain?: number;
};

export class Compose {
  prog: Prog;
  constructor(gl: WebGL2RenderingContext) {
    this.prog = new Prog(gl, VS_FS, FS, 'compose');
  }
  draw(gl: WebGL2RenderingContext, quad: WebGLVertexArrayObject, out: RT, paper: RT, brush: RT, type: Layer | null, accent: Layer | null, o: ComposeOpts) {
    out.bind();
    const p = this.prog.use();
    p.v2('uRes', out.w, out.h);
    p.f('uBrushOn', o.brushOn === false ? 0 : 1);
    p.f('uTypeOn', o.typeOn === false || !type ? 0 : 1);
    p.f('uAccOn', !accent ? 0 : 1);
    p.f('uSoft', (o.soft ?? 1.0) * (out.w / W));
    p.f('uInvert', o.invert ?? 0);
    p.f('uFade', o.fade ?? 1);
    p.f('uFadeInk', o.fadeInk ?? 0);
    p.f('uPaperGain', o.paperGain ?? 1);
    const ink = o.ink ?? [0.086, 0.075, 0.058];
    p.v3('uInkColor', ink[0], ink[1], ink[2]);
    const acc = o.accent ?? [0.72, 0.21, 0.12];
    p.v3('uAccColor', acc[0], acc[1], acc[2]);
    const tint = o.paperTint ?? [1, 1, 1];
    p.v3('uPaperTint', tint[0], tint[1], tint[2]);

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, paper.tex); p.i('uPaper', 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, brush.tex); p.i('uBrush', 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, type && o.typeOn !== false ? type.upload() : null);
    p.i('uType', 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, accent ? accent.upload() : null);
    p.i('uAccent', 3);

    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}

/** Copy an RT to the screen with the film's final lens: a whisper of grain, no vignette. */
const BLIT_FS = /* glsl */ `#version 300 es
${GLSL_COMMON}
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uGrain;
uniform float uTime;
void main(){
  vec2 px = vUv * uRes;
  vec3 c = texture(uTex, vUv).rgb;
  float g = hash21(px + vec2(uTime * 7.13, uTime * 3.71));
  c += (g - 0.5) * uGrain;
  fragColor = vec4(c, 1.0);
}`;

export class Blit {
  prog: Prog;
  constructor(gl: WebGL2RenderingContext) {
    this.prog = new Prog(gl, VS_FS, BLIT_FS, 'blit');
  }
  draw(gl: WebGL2RenderingContext, quad: WebGLVertexArrayObject, tex: RT, t: number, grain = 0.006) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    const p = this.prog.use();
    p.v2('uRes', gl.drawingBufferWidth, gl.drawingBufferHeight);
    p.f('uGrain', grain);
    p.f('uTime', t);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex.tex);
    p.i('uTex', 0);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}

