// Pure math helpers. Everything visual is a function of time t, so nothing here
// touches Math.random / Date.now. Randomness is seeded and hashed.

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const remap = (x: number, a: number, b: number, c = 0, d = 1) => c + ((x - a) / (b - a)) * (d - c);
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  // damped spring settling at 1 (deterministic closed form)
  spring: (t: number) => (t <= 0 ? 0 : 1 - Math.exp(-7 * t) * Math.cos(11 * t)),
};

/** 0..1 progress of x through [a,b] with an ease. */
export const prog = (x: number, a: number, b: number, e: Ease = ease.linear) => e(clamp((x - a) / (b - a)));

/** Keyframes: [[t, value, easeIntoThisKey?], ...] sorted by t. */
export function keys(t: number, k: [number, number, Ease?][]): number {
  if (t <= k[0]![0]) return k[0]![1];
  for (let i = 1; i < k.length; i++) {
    const [t1, v1, e] = k[i]!;
    const [t0, v0] = k[i - 1]!;
    if (t <= t1) return lerp(v0, v1, (e ?? ease.inOutCubic)((t - t0) / (t1 - t0)));
  }
  return k[k.length - 1]![1];
}

/** Exponentially decaying pulse after time t0 (0 before). */
export const pulse = (t: number, t0: number, half = 0.15) => (t < t0 ? 0 : Math.pow(0.5, (t - t0) / half));

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(...n: number[]) {
  let h = 2166136261 >>> 0;
  for (const x of n) {
    h ^= Math.floor(x * 1000003) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
  }
  return (h >>> 0) / 4294967296;
}

/** Smooth 1D value noise in [-1,1]. */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
}

export const TAU = Math.PI * 2;
