// audio.ts — the score as data, loaded before the first frame.
// The renderer never analyses the wav: it reads the analysis the synth already knows
// exactly (event times), which is why a cut can sit on a hat at 60 fps without drift.
import { clamp } from './core.ts';

export type Features = {
  duration: number;
  bpm: number;
  beat: number;
  bar: number;
  fps: number;
  beats: number[];
  downbeats: number[];
  frames: Record<string, number[]>;
  events: { kick: number[]; snare: number[]; hat: number[]; tick: number[]; stab: number[]; impact: number[]; bell: number[] };
  sections: { name: string; start: number; end: number }[];
};

let F: Features | null = null;

export async function loadAudio(): Promise<Features> {
  if (F) return F;
  const r = await fetch('/audio/features.json', { cache: 'no-store' });
  F = (await r.json()) as Features;
  return F;
}
export const audio = (): Features => F!;

/** sample a per-frame envelope at time t (linear between 120 Hz frames) */
export function env(name: string, t: number): number {
  const a = audio();
  const arr = a.frames[name];
  if (!arr) return 0;
  const x = clamp(t, 0, a.duration) * a.fps;
  const i = Math.floor(x);
  const f = x - i;
  const v0 = arr[Math.min(arr.length - 1, i)] ?? 0;
  const v1 = arr[Math.min(arr.length - 1, i + 1)] ?? v0;
  return v0 + (v1 - v0) * f;
}

/** decaying pulse from the last event of a kind (0..1) */
export function pulse(kind: keyof Features['events'], t: number, halfLife = 0.12): number {
  const a = audio();
  const ev = a.events[kind];
  let best = 0;
  for (let i = ev.length - 1; i >= 0; i--) {
    if (ev[i] <= t) { best = t - ev[i]; break; }
  }
  return Math.exp(-best / halfLife) * (best < 4 ? 1 : 0);
}

export const beatAt = (t: number) => t / audio().beat;
export const beatPhase = (t: number) => { const b = beatAt(t); return b - Math.floor(b); };
export const barAt = (t: number) => t / audio().bar;
/** index of the last beat at or before t */
export const beatIndex = (t: number) => Math.floor(t / audio().beat + 1e-6);
export const timeOfBeat = (i: number) => i * audio().beat;
export function nearestBeat(t: number): number { const b = audio().beat; return Math.round(t / b) * b; }
export function eventsBetween(kind: keyof Features['events'], t0: number, t1: number): number[] {
  return audio().events[kind].filter((e) => e >= t0 && e < t1);
}
