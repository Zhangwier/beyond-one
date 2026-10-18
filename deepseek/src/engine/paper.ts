// paper.ts — the substrate. Bone stock with a faint laid texture, a few inclusions, and
// an optical falloff. It is drawn once per frame into a target so the compositor can
// multiply ink into it; the grain is added at the very end, on screen, so every plate
// shares the same emulsion.
import { Prog, VS_FS, GLSL_COMMON, RT } from './core.ts';

const PAPER_FS = /* glsl */ `#version 300 es
${GLSL_COMMON}
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uRes;
uniform vec3 uPaper;
uniform float uSeed;

void main(){
  vec2 px = vUv * uRes;
  float H = uRes.y;
  vec2 p = px / H;

  // laid lines: a very low-contrast vertical ruling, the mark of machine-made stock
  float laid = sin(p.x * 1450.0) * 0.5 + 0.5;
  laid = pow(laid, 1.6) - 0.5;

  // fibre: two scales, anisotropic (long in x), subtle
  float f1 = fbm(vec2(p.x * 240.0, p.y * 900.0), 3) - 0.5;
  float f2 = fbm(vec2(p.x * 40.0, p.y * 46.0) + 5.3, 4) - 0.5;
  float f3 = vnoise(vec2(p.x * 1900.0, p.y * 1900.0)) - 0.5;

  float shade = laid * 0.010 + f1 * 0.030 + f2 * 0.026 + f3 * 0.010;

  // inclusions: sparse dark flecks, never more than a handful per frame
  vec2 cell = floor(px / 2.0);
  float sp = hash21(cell);
  float speck = step(0.99990, sp) * 0.22 + step(0.99999, hash21(cell + 7.7)) * 0.18;

  vec3 col = uPaper * (1.0 + shade);
  col *= 1.0 - speck;

  // optical falloff: the sheet is lit from slightly above centre
  vec2 q = (vUv - vec2(0.5, 0.46)) * vec2(1.0, 1.25);
  float v = 1.0 - dot(q, q) * 0.16;
  col *= mix(1.0, v, 0.8);

  fragColor = vec4(col, 1.0);
}`;

export class Paper {
  prog: Prog;
  constructor(gl: WebGL2RenderingContext) {
    this.prog = new Prog(gl, VS_FS, PAPER_FS, 'paper');
  }
  render(gl: WebGL2RenderingContext, quad: WebGLVertexArrayObject, out: RT, t: number, paper: [number, number, number] = [0.910, 0.882, 0.822], seed = 0) {
    out.bind();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.prog.use();
    this.prog.v2('uRes', out.w, out.h);
    this.prog.v3('uPaper', paper[0], paper[1], paper[2]);
    this.prog.f('uSeed', seed);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}
