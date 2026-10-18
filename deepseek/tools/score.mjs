// score.mjs 鈥?the film's music, written as data and synthesized from scratch.
// 60 BPM: one beat = one second, one bar = four seconds. Every visual cut in the film
// sits on a beat or a downbeat that exists in this chart.
//
// Output:
//   audio/score.wav       24-bit stereo master
//   audio/features.json   per-frame envelope data + exact event times (the renderer's sync source)
//
// Run: node tools/score.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SR = 48000;
const BPM = 60;
const BEAT = 60 / BPM; // 1.0 s
const BAR = BEAT * 4; // 4.0 s
const DUR = 84; // film length
const N = Math.round(SR * DUR);

// ---------------------------------------------------------------- buffers
const L = new Float32Array(N);
const R = new Float32Array(N);

const events = { kick: [], snare: [], hat: [], tick: [], stab: [], impact: [], bell: [] };

function put(i, v, pan = 0, gain = 1) {
  if (i < 0 || i >= N) return;
  const a = (pan + 1) * 0.5;
  const gl = Math.cos(a * Math.PI * 0.5) * gain;
  const gr = Math.sin(a * Math.PI * 0.5) * gain;
  L[i] += v * gl;
  R[i] += v * gr;
}

// deterministic noise
let seed = 0x9e3779b9;
function noise() {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5; seed >>>= 0;
  return (seed / 0xffffffff) * 2 - 1;
}

// ---------------------------------------------------------------- voices
const TAU = Math.PI * 2;

/** Detuned additive pad. Attack is slow; release is long. */
function pad(freq, t0, t1, gain, { attack = 0.9, release = 1.6, bright = 0.45 } = {}) {
  const i0 = Math.max(0, Math.round(t0 * SR));
  const i1 = Math.min(N, Math.round((t1 + release) * SR));
  const relStart = Math.round(t1 * SR);
  for (let i = i0; i < i1; i++) {
    const t = i / SR;
    const tt = t - t0;
    let e = tt < attack ? tt / attack : 1;
    if (i > relStart) {
      const u = (i - relStart) / (release * SR);
      e *= Math.max(0, 1 - u) ** 2;
    }
    // three partials, each slightly detuned left/right for width
    const w = TAU * freq * t;
    const v =
      Math.sin(w) +
      Math.sin(w * 2.0 + 0.7) * bright * 0.55 +
      Math.sin(w * 3.0 + 1.9) * bright * 0.28 +
      Math.sin(w * 0.5) * 0.18;
    const driftL = Math.sin(TAU * 0.13 * t) * 0.0016;
    const driftR = Math.sin(TAU * 0.11 * t + 1.3) * 0.0016;
    put(i, Math.sin(TAU * freq * (1 + driftL) * t) - Math.sin(w), -0.55, e * gain * 0.5);
    put(i, Math.sin(TAU * freq * (1 + driftR) * t) - Math.sin(w), 0.55, e * gain * 0.5);
    put(i, v * 0.6, 0, e * gain);
  }
}

/** Plucked arpeggio voice: two partials, fast decay. */
function pluck(freq, t0, gain, decay = 0.55, pan = 0) {
  const i0 = Math.round(t0 * SR);
  const len = Math.round((decay * 5) * SR);
  for (let k = 0; k < len; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const t = k / SR;
    const e = Math.exp(-t / decay) * (1 - Math.exp(-t / 0.004));
    const v = Math.sin(TAU * freq * t) * 0.8 + Math.sin(TAU * freq * 2.01 * t) * 0.22 * Math.exp(-t / (decay * 0.4));
    put(i, v, pan, e * gain);
  }
}

function bassNote(freq, t0, dur, gain) {
  const i0 = Math.round(t0 * SR);
  const i1 = Math.min(N, Math.round((t0 + dur) * SR));
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const e = (1 - Math.exp(-t / 0.006)) * Math.exp(-t / (dur * 0.9));
    const v = Math.tanh(Math.sin(TAU * freq * t) * 1.6) * 0.8 + Math.sin(TAU * freq * 2 * t) * 0.12;
    put(i, v, 0, e * gain);
  }
}

function kick(t0, amp = 1) {
  events.kick.push(+t0.toFixed(4));
  const i0 = Math.round(t0 * SR);
  const len = Math.round(0.5 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const t = k / SR;
    const f = 118 * Math.exp(-t / 0.035) + 41;
    ph += (TAU * f) / SR;
    const e = Math.exp(-t / 0.16) * (1 - Math.exp(-t / 0.002));
    const click = k < 90 ? noise() * 0.35 * (1 - k / 90) : 0;
    put(i, (Math.sin(ph) * 0.95 + click), 0, e * amp);
  }
}

function hat(t0, amp = 0.5, open = false) {
  events.hat.push(+t0.toFixed(4));
  const i0 = Math.round(t0 * SR);
  const dur = open ? 0.22 : 0.045;
  const len = Math.round(dur * 3 * SR);
  let prev = 0;
  for (let k = 0; k < len; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const t = k / SR;
    const e = Math.exp(-t / dur);
    const n = noise();
    const hp = n - prev * 0.85; // crude high-pass
    prev = n;
    put(i, hp, (k % 2 ? 0.35 : -0.35), e * amp * 0.5);
  }
}

function snare(t0, amp = 0.7) {
  events.snare.push(+t0.toFixed(4));
  const i0 = Math.round(t0 * SR);
  const len = Math.round(0.28 * SR);
  let prev = 0;
  for (let k = 0; k < len; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const t = k / SR;
    const e = Math.exp(-t / 0.075);
    const n = noise();
    const bp = n - prev; prev = n;
    const tone = Math.sin(TAU * 186 * t) * Math.exp(-t / 0.05) * 0.5;
    put(i, bp * 0.55 + tone, 0, e * amp);
  }
}

function tick(t0, amp = 0.5) {
  events.tick.push(+t0.toFixed(4));
  const i0 = Math.round(t0 * SR);
  for (let k = 0; k < 300; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const t = k / SR;
    put(i, Math.sin(TAU * 2400 * t) * Math.exp(-t / 0.004), 0, amp * 0.4);
  }
}

function stab(freq, t0, dur, gain) {
  events.stab.push(+t0.toFixed(4));
  const i0 = Math.round(t0 * SR);
  const len = Math.round(dur * SR);
  for (let k = 0; k < len; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const t = k / SR;
    const e = (1 - Math.exp(-t / 0.008)) * Math.exp(-t / (dur * 0.35));
    const fm = Math.sin(TAU * freq * t + 2.2 * Math.sin(TAU * freq * 2.41 * t) * Math.exp(-t / 0.12));
    put(i, fm, 0, e * gain);
  }
}

function bell(freq, t0, dur, gain, pan = 0) {
  events.bell.push(+t0.toFixed(4));
  const i0 = Math.round(t0 * SR);
  const len = Math.round(dur * SR);
  for (let k = 0; k < len; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const t = k / SR;
    const e = Math.exp(-t / (dur * 0.42)) * (1 - Math.exp(-t / 0.003));
    const v =
      Math.sin(TAU * freq * t) * 0.6 +
      Math.sin(TAU * freq * 2.0 * t) * 0.25 * Math.exp(-t / (dur * 0.25)) +
      Math.sin(TAU * freq * 3.01 * t) * 0.1 * Math.exp(-t / (dur * 0.15));
    put(i, v, pan, e * gain);
  }
}

function impact(t0, amp = 1) {
  events.impact.push(+t0.toFixed(4));
  const i0 = Math.round(t0 * SR);
  const len = Math.round(1.4 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const t = k / SR;
    const f = 72 * Math.exp(-t / 0.25) + 26;
    ph += (TAU * f) / SR;
    const e = Math.exp(-t / 0.55) * (1 - Math.exp(-t / 0.004));
    const air = noise() * Math.exp(-t / 0.12) * 0.16;
    put(i, (Math.sin(ph) * 1.0 + air), 0, e * amp);
  }
}

function riser(t0, dur, gain) {
  const i0 = Math.round(t0 * SR);
  const len = Math.round(dur * SR);
  let ph = 0, prev = 0;
  for (let k = 0; k < len; k++) {
    const i = i0 + k;
    if (i >= N) break;
    const u = k / len;
    const f = 180 * Math.pow(9, u);
    ph += (TAU * f) / SR;
    const n = noise();
    const bp = n - prev; prev = n;
    const e = Math.pow(u, 2.2);
    put(i, Math.sin(ph) * 0.35 + bp * 0.5 * u, 0, e * gain);
  }
}

// ---------------------------------------------------------------- harmony
// equal temperament from A4 = 440; names are looked up by pitch class + octave so a
// missing note is impossible by construction (see freq())
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = (name) => {
  const m = /^([A-G])(\d)$/.exec(name);
  if (!m) throw new Error('bad note name: ' + name);
  const midi = (PC[m[1]] + (Number(m[2]) + 1) * 12);
  return 440 * Math.pow(2, (midi - 69) / 12);
};
const NOTE = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? freq(k) : undefined) });

// chord = { name, bass, pad:[freqs], arp:[freqs] }
const CH = {
  Am: { bass: NOTE.A2, pad: [NOTE.A3, NOTE.C4, NOTE.E4], arp: [NOTE.A4, NOTE.C5, NOTE.E5, NOTE.A5] },
  F: { bass: NOTE.F3 / 2, pad: [NOTE.F3, NOTE.A3, NOTE.C4], arp: [NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F5] },
  C: { bass: NOTE.C3, pad: [NOTE.C4, NOTE.E4, NOTE.G4], arp: [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6] },
  G: { bass: NOTE.G3 / 2, pad: [NOTE.G3, NOTE.C4 * 0.5 * 2, NOTE.D4], arp: [NOTE.G4, NOTE.D5, NOTE.G5, NOTE.D5] },
  Fmaj7s: { bass: NOTE.F3 / 2, pad: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4], arp: [NOTE.F4, NOTE.A4, NOTE.E5, NOTE.C6] },
  AmHigh: { bass: NOTE.A2, pad: [NOTE.A4, NOTE.C5, NOTE.E5], arp: [NOTE.A5, NOTE.C6, NOTE.E6, NOTE.A5] },
};

const PROG = [
  // 0 鈥?prologue: one note, no harmony
  [0, 12, null],
  // 12 鈥?chapter one: the chord starts to exist
  [12, 16, 'Am'], [16, 20, 'F'], [20, 24, 'C'], [24, 28, 'G'],
  // 28 鈥?chapter two: same progression, more voices
  [28, 32, 'Am'], [32, 36, 'F'], [36, 40, 'C'],
  // 40 鈥?chapter three
  [40, 44, 'Am'], [44, 48, 'F'], [48, 52, 'G'], [52, 54, 'Am'],
  // 54 鈥?chapter four: the mistake. everything drops out.
  [56, 58, 'F'], [58, 60, 'Am'],
  // 60 鈥?the return
  [60, 64, 'F'], [64, 68, 'Am'], [68, 72, 'F'], [72, 76, 'C'], [76, 80, 'G'], [80, 84, 'Am'],
];

// ---------------------------------------------------------------- arrangement

// 0鈥?2  prologue: a single sustained A, a heartbeat every two beats, a thin high tone.
pad(NOTE.A3, 0.0, 11.2, 0.055, { attack: 3.4, release: 2.2, bright: 0.22 });
pad(NOTE.A4, 0.0, 11.0, 0.012, { attack: 5.0, release: 2.0, bright: 0.1 });
for (let t = 2; t < 11.5; t += 2) kick(t, 0.42);
for (let t = 4; t < 12; t += 8) bell(NOTE.E5, t, 3.0, 0.05, 0.4);
// the countdown: eleven thin ticks, one per second, and a riser into the first chapter
for (let i = 0; i < 11; i++) tick(1 + i * 1.0, 0.18 + i * 0.012);
riser(9.0, 3.0, 0.5);

// harmony beds
for (const [a, b, name] of PROG) {
  if (!name) continue;
  const c = CH[name] || CH.Am;
  const energy = a >= 40 && a < 54 ? 1 : a >= 72 ? 1.15 : 0.8;
  pad(c.bass * 2, a, b, 0.05 * energy, { attack: 0.5, release: 1.2, bright: 0.4 });
  for (const f of c.pad) pad(f, a, b, 0.026 * energy, { attack: 0.35, release: 1.0, bright: 0.35 });
}

// arpeggio 鈥?enters at 12, thins out at 54, returns at 60, peaks at 72
function arpRun(t0, t1, chordName, step, gain, pattern) {
  const c = CH[chordName];
  let n = 0;
  for (let t = t0; t < t1 - 1e-6; t += step) {
    const f = c.arp[pattern[n % pattern.length] % c.arp.length] * (Math.floor(pattern[n % pattern.length] / c.arp.length) ? 2 : 1);
    pluck(f, t, gain * (n % 4 === 0 ? 1.25 : 0.9), 0.32, (n % 2 ? 0.25 : -0.25));
    n++;
  }
}
const PAT_A = [0, 1, 2, 3, 2, 1, 2, 3];
const PAT_B = [0, 2, 1, 3, 0, 2, 3, 1];
for (const [a, b, name] of PROG) {
  if (!name || a < 12 || (a >= 54 && a < 60)) continue;
  const step = a >= 40 ? 0.25 : a >= 28 ? 0.5 : 0.5;
  const gain = a >= 40 && a < 54 ? 0.115 : a >= 72 ? 0.17 : a >= 28 ? 0.1 : 0.08;
  arpRun(a, b, name, step, gain, a >= 44 && a < 48 ? PAT_B : PAT_A);
}

// bass 鈥?from 28, on the beat; heavier from 40
for (const [a, b, name] of PROG) {
  if (!name || a < 28 || (a >= 54 && a < 60)) continue;
  const c = CH[name];
  const heavy = a >= 40 && a < 54;
  for (let t = a; t < b - 1e-6; t += heavy ? 0.5 : 1.0) {
    bassNote(c.bass, t, heavy ? 0.42 : 0.8, heavy ? 0.3 : 0.17);
  }
}

// drums
for (let t = 12; t < 28; t += 2) kick(t, 0.55);
for (let t = 28; t < 40; t += 1) { kick(t, 0.62); if (Math.round(t) % 2 === 1) hat(t + 0.5, 0.35); }
for (let t = 40; t < 54; t += 0.5) {
  const onBeat = Math.abs(t - Math.round(t)) < 1e-6;
  kick(t, onBeat ? 0.9 : 0.55);
  if (!onBeat) hat(t, 0.3);
  if (onBeat) hat(t + 0.25, 0.2);
}
for (let t = 44; t < 54; t += 2) snare(t, 0.42);
for (let t = 44; t < 52; t += 1) hat(t + 0.5, 0.24, true);

// 52鈥?4: build into the drop
for (let t = 52; t < 53.75; t += 0.25) snare(t, 0.18 + (t - 52) * 0.55);
riser(52.0, 2.0, 0.55);

// 54 鈥?the mistake: hard stop, a lone tick, then an unresolved, detuned cluster
stab(NOTE.F4 * 1.0, 54.0, 0.5, 0.22);
tick(54.0, 0.5);
bell(NOTE.C6 * 0.997, 54.25, 2.6, 0.075, -0.3);
bell(NOTE.E5 * 1.008, 54.25, 2.2, 0.05, 0.3);
// 56 鈥?dissonance: a perfect fourth a semitone out, held
stab(NOTE.F4, 56.0, 1.6, 0.26);
stab(NOTE.B4, 56.0, 1.6, 0.2);
stab(NOTE.F5, 56.05, 1.2, 0.12);
for (let i = 0; i < 8; i++) tick(56 + i * 0.25, 0.1);
// 58 鈥?the correction: one clean note, then the machine stops being the subject
bell(NOTE.A4, 58.0, 3.0, 0.14, 0);
bell(NOTE.E5, 58.0, 2.4, 0.09, 0.2);
pad(NOTE.A3, 58.0, 59.8, 0.05, { attack: 0.02, release: 1.2, bright: 0.2 });

// 60 鈥?re-entry: the pulse comes back, quietly, then the build
for (let t = 60; t < 64; t += 2) kick(t, 0.5);
for (let t = 64; t < 72; t += 1) kick(t, 0.7);
for (let t = 64; t < 72; t += 0.5) hat(t + 0.25, 0.26);
for (let t = 64; t < 72; t += 2) snare(t + 1, 0.3);
riser(69.0, 3.0, 0.6);

// 72 鈥?the climax: everything at once
impact(72.0, 1.0);
for (let t = 72; t < 84; t += 1) kick(t, t < 78 ? 0.85 : 0.4);
for (let t = 72; t < 84; t += 2) snare(t, t < 78 ? 0.5 : 0.2);
for (let t = 72; t < 84; t += 0.5) hat(t + 0.25, t < 78 ? 0.3 : 0.12);
// the shimmer: a high bell run, one note per beat, thinning
const shim = [NOTE.C6, NOTE.E6, NOTE.C6, NOTE.A5, NOTE.E6, NOTE.C6, NOTE.G5, NOTE.A5, NOTE.E6, NOTE.C6];
for (let i = 0; i < shim.length; i++) bell(shim[i], 72 + i * 1.0, 2.6, 0.06 * (1 - i / 14), i % 2 ? 0.45 : -0.45);

// 78 鈥?the last line: everything recedes except the pad and one held A
impact(78.0, 0.55);
pad(NOTE.A2, 78.0, 84.0, 0.07, { attack: 0.4, release: 2.2, bright: 0.25 });
pad(NOTE.E5, 78.0, 84.0, 0.018, { attack: 1.6, release: 2.4, bright: 0.12 });

// ---------------------------------------------------------------- master
let peak = 0;
for (let i = 0; i < N; i++) {
  // gentle saturation on the bus, then a tail fade over the last 1.2 s
  const fade = i > (DUR - 1.2) * SR ? Math.max(0, 1 - (i - (DUR - 1.2) * SR) / (1.2 * SR)) : 1;
  L[i] = Math.tanh(L[i] * 1.15) * fade;
  R[i] = Math.tanh(R[i] * 1.15) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.85 / Math.max(1e-6, peak);
for (let i = 0; i < N; i++) { L[i] *= norm; R[i] *= norm; }

// ---------------------------------------------------------------- wav
function writeWav(file, l, r) {
  const n = l.length;
  const bytes = 44 + n * 6;
  const b = Buffer.alloc(bytes);
  b.write('RIFF', 0); b.writeUInt32LE(bytes - 8, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 6, 28); b.writeUInt16LE(6, 32); b.writeUInt16LE(24, 34);
  b.write('data', 36); b.writeUInt32LE(n * 6, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const ch of [l, r]) {
      let v = Math.max(-1, Math.min(1, ch[i]));
      const q = Math.round(v * 8388607);
      b.writeIntLE(q, o, 3); o += 3;
    }
  }
  fs.writeFileSync(file, b);
}
fs.mkdirSync(path.join(ROOT, 'audio'), { recursive: true });
writeWav(path.join(ROOT, 'audio/score.wav'), L, R);

// ---------------------------------------------------------------- features for the renderer
const AR = 120; // analysis frames per second
const NF = Math.round(DUR * AR);
const F = { rms: [], low: [], mid: [], high: [], kick: [], snare: [], hat: [], tick: [] };
for (const k of Object.keys(F)) F[k] = new Float32Array(NF);

// one-pole filters for the band split
function analyse() {
  let lp = 0, lp2 = 0;
  const a1 = Math.exp(-TAU * 160 / SR); // low band <~160 Hz
  const a2 = Math.exp(-TAU * 2200 / SR); // mid band <~2.2 kHz
  const acc = { rms: 0, low: 0, mid: 0, high: 0 };
  let frame = 0, count = 0;
  const per = SR / AR;
  for (let i = 0; i < N; i++) {
    const x = (L[i] + R[i]) * 0.5;
    lp = lp * a1 + x * (1 - a1);
    lp2 = lp2 * a2 + x * (1 - a2);
    const low = lp, mid = lp2 - lp, high = x - lp2;
    acc.rms += x * x; acc.low += low * low; acc.mid += mid * mid; acc.high += high * high;
    count++;
    if (count >= per) {
      const r = Math.sqrt(acc.rms / count), lo = Math.sqrt(acc.low / count), mi = Math.sqrt(acc.mid / count), hi = Math.sqrt(acc.high / count);
      F.rms[frame] = r; F.low[frame] = lo; F.mid[frame] = mi; F.high[frame] = hi;
      acc.rms = acc.low = acc.mid = acc.high = 0; count = 0; frame++;
    }
  }
  // normalise each band to 0..1 by its 99th percentile
  for (const k of ['rms', 'low', 'mid', 'high']) {
    const arr = [...F[k]].sort((a, b) => a - b);
    const p = arr[Math.floor(arr.length * 0.99)] || 1;
    for (let i = 0; i < NF; i++) F[k][i] = Math.min(1, F[k][i] / p);
  }
}
analyse();

// event envelopes, generated from the exact event times (not from the samples)
function envFor(times, halfLife) {
  const arr = new Float32Array(NF);
  for (const t of times) {
    const f0 = Math.max(0, Math.floor(t * AR));
    const f1 = Math.min(NF, Math.ceil((t + halfLife * 4) * AR));
    for (let f = f0; f < f1; f++) {
      const dt = f / AR - t;
      if (dt < 0) continue;
      arr[f] = Math.max(arr[f], Math.exp(-dt / halfLife));
    }
  }
  return arr;
}
F.kick = envFor(events.kick, 0.11);
F.snare = envFor(events.snare, 0.07);
F.hat = envFor(events.hat, 0.03);
F.tick = envFor(events.tick, 0.05);

const round3 = (a) => Array.from(a, (v) => Math.round(v * 1000) / 1000);
const beats = [];
for (let t = 0; t < DUR; t += BEAT) beats.push(+t.toFixed(4));
const downbeats = beats.filter((b) => Math.abs(b % BAR) < 1e-6);

const out = {
  duration: DUR,
  bpm: BPM,
  beat: BEAT,
  bar: BAR,
  fps: AR,
  beats,
  downbeats,
  frames: Object.fromEntries(Object.entries(F).map(([k, v]) => [k, round3(v)])),
  events,
  sections: [
    { name: 'prologue', start: 0, end: 12 },
    { name: 'complex', start: 12, end: 22 },
    { name: 'connect', start: 22, end: 40 },
    { name: 'break', start: 40, end: 54 },
    { name: 'judge', start: 54, end: 64 },
    { name: 'possible', start: 64, end: 84 },
  ],
};
fs.writeFileSync(path.join(ROOT, 'audio/features.json'), JSON.stringify(out));

const db = (20 * Math.log10(0.92)).toFixed(2);
let sum = 0;
for (let i = 0; i < N; i++) sum += (L[i] * L[i] + R[i] * R[i]) * 0.5;
const rmsDb = (10 * Math.log10(sum / N)).toFixed(2);
console.log(`audio/score.wav  ${DUR}s  peak ${db} dBFS  rms ${rmsDb} dBFS`);
console.log(`audio/features.json  ${NF} frames @ ${AR} Hz, ${events.kick.length} kicks, ${events.hat.length} hats, ${events.bell.length} bells`);
console.log(`master gain norm=${norm.toFixed(3)}`);

