// The only platform seam. Node (scripts/render.ts, @napi-rs/canvas / Skia) and the
// browser preview (preview/main.ts, HTMLCanvas) both fill this in before rendering, so
// every scene runs the identical Canvas2D code in both places.
export type C = CanvasRenderingContext2D;

export interface Env {
  makeCanvas(w: number, h: number): { width: number; height: number; getContext(k: '2d'): any };
  /** Audio envelopes sampled at `rate` Hz: rms (0..1), low band (0..1). */
  audio: { rate: number; rms: number[]; low: number[]; high: number[] };
  makePath(d?: string): Path2D;
}

export const env: Env = {
  makeCanvas: () => {
    throw new Error('env.makeCanvas not set');
  },
  audio: { rate: 60, rms: [], low: [], high: [] },
  makePath: () => {
    throw new Error('env.makePath not set');
  },
};

export function envAt(arr: number[], t: number) {
  const r = env.audio.rate;
  const x = t * r;
  const i = Math.floor(x);
  if (i < 0 || i >= arr.length - 1) return 0;
  return arr[i]! + (arr[i + 1]! - arr[i]!) * (x - i);
}
