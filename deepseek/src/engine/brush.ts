// brush.ts — the film's only light source: an ink brush.
//
// A stroke is a spine resampled by arc length and extruded to a ribbon whose width follows
// pressure. The mask shader turns the ribbon into coverage:
//   · a solid core that tapers with pressure,
//   · bristle breakup that erodes only the outer edge (a dry brush skips at the perimeter
//     before it lifts), at a scale measured in *pixels*, so a hairline stays continuous,
//   · occasional full-width skips along the length, at a scale far longer than the stroke,
//   · a slightly denser "wet edge" just inside the boundary.
//
// All noise frequencies are in logical px. That is the difference between a drawn line and
// a dotted one.
import { Prog, RT, W, H } from './core.ts';

export const MASK_VS = /* glsl */ `#version 300 es
layout(location=0) in vec2 aPos;      // ribbon vertex, logical paper px
layout(location=1) in vec2 aSpine;    // nearest spine point, logical px
layout(location=2) in vec2 aInfo;     // x: nominal half width, y: arc length
layout(location=3) in float aT;       // 0..1 along the stroke, for the opacity ramp
out vec2 vP;
out vec2 vS;
out vec2 vI;
out float vT;
void main(){
  vP = aPos; vS = aSpine; vI = aInfo; vT = aT;
  vec2 c = aPos / vec2(1920.0, 1080.0) * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

const MASK_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vP;
in vec2 vS;
in vec2 vI;
in float vT;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uDry;
uniform float uSeed;
uniform float uOpacity;

float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1,0)), c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm2(vec2 p){ return vnoise(p)*0.66 + vnoise(p*2.03+9.1)*0.34; }

void main(){
  float hw = max(vI.x, 0.28);
  float across = length(vP - vS) / hw;      // 0 at the spine, 1 at the nominal edge
  float along = vI.y;                        // logical px

  // bristles run lengthwise: period ~9 px and ~31 px, independent of stroke width
  float b1 = vnoise(vec2(along * 0.108, across * 3.4 + uSeed));
  float b2 = fbm2(vec2(along * 0.034 + uSeed * 4.0, across * 1.7));
  float bristle = smoothstep(0.30, 0.70, b1 * 0.55 + b2 * 0.55);

  // the brush lifts at the perimeter first: wear only in the outer third
  float edgeWear = smoothstep(0.62, 1.06, across);
  float erode = mix(1.0, bristle, uDry * edgeWear * 1.15);

  // long skips: period ~140 px, so a line is either there or it is not
  float sk = vnoise(vec2(along * 0.0072 + uSeed * 11.0, uSeed * 1.7));
  float skip = mix(1.0, smoothstep(0.20, 0.30, sk), uDry * 0.55);

  float core = 1.0 - smoothstep(0.80, 1.02, across);
  float wet = 0.80 + 0.20 * smoothstep(0.0, 0.70, across);
  float a = core * erode * skip * wet * uOpacity;

  fragColor = vec4(vec3(a), a);
}`;

export type Stroke = {
  pts: { x: number; y: number; w: number }[];
  dry?: number;
  seed?: number;
  opacity?: number;
  _mesh?: Mesh;
};

type Mesh = { pos: Float32Array; spine: Float32Array; info: Float32Array; t: Float32Array; idx: Uint32Array; count: number };

export function resample(pts: { x: number; y: number; w: number }[], step = 2.0) {
  const out: { x: number; y: number; w: number; s: number }[] = [];
  if (pts.length === 0) return out;
  if (pts.length === 1) { out.push({ x: pts[0].x, y: pts[0].y, w: pts[0].w, s: 0 }); return out; }
  if (pts.length === 2) {
    const [a, b] = pts;
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(L / step));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, w: a.w + (b.w - a.w) * u, s: L * u });
    }
    return out;
  }
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  let total = 0;
  out.push({ ...pts[0], s: 0 });
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const n = Math.max(1, Math.ceil(segLen / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      const w = p1.w + (p2.w - p1.w) * t;
      const prev = out[out.length - 1];
      total += Math.hypot(x - prev.x, y - prev.y);
      out.push({ x, y, w, s: total });
    }
  }
  return out;
}

export class Brush {
  gl: WebGL2RenderingContext;
  scale: number;
  prog: Prog;
  vao: WebGLVertexArrayObject;
  bPos: WebGLBuffer;
  bSpine: WebGLBuffer;
  bInfo: WebGLBuffer;
  bT: WebGLBuffer;
  bIdx: WebGLBuffer;
  rt: RT;
  constructor(gl: WebGL2RenderingContext, scale: number) {
    this.gl = gl;
    this.scale = scale;
    this.prog = new Prog(gl, MASK_VS, MASK_FS, 'brush');
    this.vao = gl.createVertexArray()!;
    this.bPos = gl.createBuffer()!;
    this.bSpine = gl.createBuffer()!;
    this.bInfo = gl.createBuffer()!;
    this.bT = gl.createBuffer()!;
    this.bIdx = gl.createBuffer()!;
    this.rt = new RT(gl, Math.round(W * scale), Math.round(H * scale));
  }

  mesh(rs: { x: number; y: number; w: number; s: number }[]): Mesh {
    const pos: number[] = [], spine: number[] = [], info: number[] = [], tt: number[] = [], idx: number[] = [];
    const n = rs.length;
    const totalS = Math.max(1e-6, rs[n - 1]?.s ?? 1);
    for (let i = 0; i < n; i++) {
      const p = rs[i];
      const a = rs[Math.max(0, i - 1)];
      const b = rs[Math.min(n - 1, i + 1)];
      let dx = b.x - a.x, dy = b.y - a.y;
      const L = Math.hypot(dx, dy) || 1;
      dx /= L; dy /= L;
      const w = Math.max(0.30, p.w) * 1.34 + 0.62;
      for (const sgn of [-1, 1]) {
        pos.push(p.x - dy * w * sgn, p.y + dx * w * sgn);
        spine.push(p.x, p.y);
        info.push(p.w, p.s);
        tt.push(p.s / totalS);
      }
      if (i < n - 1) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    return {
      pos: new Float32Array(pos), spine: new Float32Array(spine), info: new Float32Array(info),
      t: new Float32Array(tt), idx: new Uint32Array(idx), count: idx.length,
    };
  }

  draw(strokes: Stroke[], target: RT = this.rt) {
    const gl = this.gl;
    target.bind();
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
    this.prog.use();
    this.prog.v2('uRes', target.w, target.h);
    for (const st of strokes) {
      if (!st._mesh) st._mesh = this.mesh(resample(st.pts));
      const m = st._mesh;
      if (!m.count) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bSpine); gl.bufferData(gl.ARRAY_BUFFER, m.spine, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bInfo); gl.bufferData(gl.ARRAY_BUFFER, m.info, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bT); gl.bufferData(gl.ARRAY_BUFFER, m.t, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.DYNAMIC_DRAW);
      this.prog.f('uDry', st.dry ?? 0.2);
      this.prog.f('uSeed', st.seed ?? 1.3);
      this.prog.f('uOpacity', st.opacity ?? 1);
      gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0);
    }
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  clear(target: RT = this.rt) {
    const gl = this.gl;
    target.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
