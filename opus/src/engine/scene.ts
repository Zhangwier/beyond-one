import type { C } from './env';
import { envAt, env } from './env';
import { beatAt, barAt } from './score';

export interface Frame {
  t: number; // song time
  lt: number; // local time in scene
  p: number; // 0..1 progress through the scene
  beat: number;
  bar: number;
  beatPhase: number;
  rms: number; // audio envelopes (from the rendered score)
  low: number;
  high: number;
}

export interface PostOut {
  ground?: 'paper' | 'ink'; // controls grain blend & vignette colour
  grain?: number;
  vignette?: number;
  shake?: [number, number];
  flash?: number; // white flash 0..1
  fade?: number; // fade to ground 0..1
}

export interface Scene {
  id: string;
  start: number;
  end: number;
  /** Draw a full frame in 1920×1080 logical px (fully covers the canvas). */
  render(c: C, f: Frame): PostOut | void;
  /** Motion-blur sub-frames wanted at time t (default 1). */
  samples?(t: number): number;
}

export function makeFrame(t: number, s: Scene): Frame {
  const b = beatAt(t);
  return {
    t,
    lt: t - s.start,
    p: (t - s.start) / (s.end - s.start),
    beat: b,
    bar: barAt(t),
    beatPhase: b - Math.floor(b),
    rms: envAt(env.audio.rms, t),
    low: envAt(env.audio.low, t),
    high: envAt(env.audio.high, t),
  };
}
