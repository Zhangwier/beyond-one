// Original score for 《超出一人之力》, synthesized deterministically from src/engine/score.ts.
// Writes out/score.wav (48 kHz stereo, 16-bit) and data/audio.json (60 Hz envelopes for
// audio-reactive visuals). Every musical event below is placed with bar()/beat() from the
// same cue table the scenes use, so picture and sound cannot drift apart.
import { writeFileSync, mkdirSync } from 'node:fs';
import { bar, BEAT, BAR, CUE, DURATION } from '../src/engine/score';
import { mulberry32 } from '../src/engine/util';

const SR = 48000;
const N = Math.ceil(DURATION * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N); // reverb send
const rnd = mulberry32(42);

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const n = (s: string) => {
  const m = s.match(/^([A-G][b#]?)(-?\d)$/)!;
  return NOTE[m[1]!]! + (parseInt(m[2]!) + 1) * 12;
};

function add(i: number, l: number, r: number, send = 0) {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r;
  if (send) { sendL[i] += l * send; sendR[i] += r * send; }
}
const panLR = (pan: number) => [Math.cos((pan + 1) * Math.PI / 4), Math.sin((pan + 1) * Math.PI / 4)] as const;

// ---------- instruments ----------
function kick(t: number, amp = 1) {
  const i0 = Math.round(t * SR), len = Math.round(0.45 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const f = 44 + 90 * Math.exp(-tt * 28);
    ph += (2 * Math.PI * f) / SR;
    const e = Math.exp(-tt * 7.5) * Math.min(1, tt * 2000);
    let s = Math.sin(ph) * e * 0.9 + (k < 120 ? (rnd() * 2 - 1) * 0.25 * (1 - k / 120) : 0);
    s = Math.tanh(s * 1.6) * amp * 0.62;
    add(i0 + k, s, s, 0.05);
  }
}
function noiseHit(t: number, amp: number, dec: number, hp: number, lp: number, pan = 0, send = 0.15, tone = 0) {
  const i0 = Math.round(t * SR), len = Math.round(dec * 6 * SR);
  let lo = 0, hi = 0, prev = 0, ph = 0;
  const [pl, pr] = panLR(pan);
  const al = Math.exp((-2 * Math.PI * lp) / SR), ah = Math.exp((-2 * Math.PI * hp) / SR);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const x = rnd() * 2 - 1;
    lo = lo * al + x * (1 - al);
    hi = ah * (hi + lo - prev); prev = lo;
    ph += (2 * Math.PI * tone) / SR;
    const e = Math.exp(-tt / dec) * Math.min(1, tt * 3000);
    const s = (hi * 1.6 + (tone ? Math.sin(ph) * 0.5 * Math.exp(-tt * 30) : 0)) * e * amp;
    add(i0 + k, s * pl, s * pr, send);
  }
}
const clap = (t: number, a = 1) => { for (let j = 0; j < 3; j++) noiseHit(t + j * 0.009, 0.28 * a, j < 2 ? 0.012 : 0.09, 900, 5200, 0, 0.3, 0); noiseHit(t, 0.15 * a, 0.05, 150, 900, 0, 0.1, 185); };
const hat = (t: number, a = 1, pan = 0.2) => noiseHit(t, 0.07 * a, 0.022, 7000, 16000, pan, 0.05);
const tick = (t: number, a = 1) => { noiseHit(t, 0.22 * a, 0.006, 2500, 9000, -0.15, 0.25, 2600); };
const keyClick = (t: number, a = 1, pan = 0) => noiseHit(t, 0.1 * a, 0.004, 1800, 7000, pan, 0.12, 1400);

/** Karplus–Strong pluck: the "human" melodic timbre. */
function pluck(t: number, note: number, amp = 0.3, dur = 2.5, pan = 0, bright = 0.5, send = 0.35) {
  const f = mtof(note), i0 = Math.round(t * SR);
  const P = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(P);
  for (let k = 0; k < P; k++) buf[k] = rnd() * 2 - 1;
  // pre-filter excitation for warmth
  for (let pass = 0; pass < 2 - bright * 2; pass++) for (let k = 1; k < P; k++) buf[k] = (buf[k]! + buf[k - 1]!) / 2;
  const [pl, pr] = panLR(pan);
  const len = Math.round(dur * SR);
  const damp = 0.4985 + bright * 0.0013;
  let idx = 0;
  for (let k = 0; k < len; k++) {
    const a = buf[idx]!, b = buf[(idx + 1) % P]!;
    const s = (a + b) * damp;
    buf[idx] = s;
    idx = (idx + 1) % P;
    const fade = k > len - 2000 ? (len - k) / 2000 : 1;
    const out = a * amp * fade;
    add(i0 + k, out * pl, out * pr, send);
  }
}
/** FM bell: the "machine" timbre — used only when an AI connection is drawn. */
function bell(t: number, note: number, amp = 0.12, dur = 2, pan = 0) {
  const f = mtof(note), i0 = Math.round(t * SR), len = Math.round(dur * SR);
  const [pl, pr] = panLR(pan);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const mod = Math.sin(2 * Math.PI * f * 3.5 * tt) * 2.2 * Math.exp(-tt * 6);
    const s = Math.sin(2 * Math.PI * f * tt + mod) * Math.exp(-tt * 2.6) * Math.min(1, tt * 400) * amp;
    add(i0 + k, s * pl, s * pr, 0.5);
  }
}
/** Detuned-saw pad with one-pole low-pass and slow envelope. */
function pad(t: number, notes: number[], dur: number, amp = 0.05, cutoff = 1200, att = 0.6, rel = 1.2, send = 0.55) {
  const i0 = Math.round(t * SR), len = Math.round((dur + rel) * SR);
  const voices: { f: number; ph: number; pan: number }[] = [];
  notes.forEach((m, j) => [-0.09, 0, 0.11].forEach((d, v) => voices.push({ f: mtof(m + d), ph: rnd(), pan: ((v - 1) * 0.5 + (j % 2 ? 0.15 : -0.15)) })));
  let lpL = 0, lpR = 0;
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    let sl = 0, sr = 0;
    for (const v of voices) {
      v.ph += v.f / SR; v.ph -= Math.floor(v.ph);
      const s = v.ph * 2 - 1;
      const [pl, pr] = panLR(v.pan);
      sl += s * pl; sr += s * pr;
    }
    lpL = lpL * a + sl * (1 - a); lpR = lpR * a + sr * (1 - a);
    const env = Math.min(1, tt / att) * (tt > dur ? Math.exp(-(tt - dur) / (rel / 4)) : 1);
    const g = (amp * env) / voices.length * 3;
    add(i0 + k, lpL * g, lpR * g, send);
  }
}
function sub(t: number, note: number, dur: number, amp = 0.22) {
  const f = mtof(note), i0 = Math.round(t * SR), len = Math.round(dur * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, tt * 60) * Math.min(1, (dur - tt) * 30) * (0.75 + 0.25 * Math.exp(-tt * 4));
    const s = Math.tanh((Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * 1.3) * amp * env;
    add(i0 + k, s, s, 0.02);
  }
}
function drone(t: number, notes: number[], dur: number, amp = 0.05) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const env = Math.min(1, tt / 1.5) * Math.min(1, (dur - tt) / 1.5);
    let s = 0;
    notes.forEach((m, j) => { const f = mtof(m); s += Math.sin(2 * Math.PI * f * tt + j) * (1 + 0.2 * Math.sin(tt * 0.7 + j)); });
    s *= (amp * env) / notes.length;
    add(i0 + k, s, s, 0.4);
  }
}
/** Rising noise swipe (brush / riser). */
function swipe(t: number, dur: number, amp = 0.3, f0 = 300, f1 = 6000, pan0 = -0.6, pan1 = 0.6, send = 0.3) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR);
  let lo = 0, hi = 0, prev = 0;
  for (let k = 0; k < len; k++) {
    const u = k / len;
    const fc = f0 * Math.pow(f1 / f0, u);
    const al = Math.exp((-2 * Math.PI * fc * 1.6) / SR), ah = Math.exp((-2 * Math.PI * fc * 0.6) / SR);
    const x = rnd() * 2 - 1;
    lo = lo * al + x * (1 - al);
    hi = ah * (hi + lo - prev); prev = lo;
    const env = Math.pow(u, 1.5) * Math.min(1, (1 - u) * 40);
    const [pl, pr] = panLR(pan0 + (pan1 - pan0) * u);
    add(i0 + k, hi * env * amp * 2 * pl, hi * env * amp * 2 * pr, send);
  }
}
function boom(t: number, amp = 0.8, note = n('D1')) {
  const i0 = Math.round(t * SR), len = Math.round(3.5 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const f = mtof(note) * (1 + 1.5 * Math.exp(-tt * 18));
    ph += (2 * Math.PI * f) / SR;
    const s = Math.tanh(Math.sin(ph) * 2) * Math.exp(-tt * 1.4) * Math.min(1, tt * 1500) * amp * 0.5;
    add(i0 + k, s, s, 0.25);
  }
  noiseHit(t, amp * 0.35, 0.25, 60, 2500, 0, 0.5);
}

// ---------- the score ----------
const b = bar;
const chords: Record<string, string[]> = {
  Dm: ['D3', 'F3', 'A3', 'D4'], Bb: ['Bb2', 'D3', 'F3', 'Bb3'], F: ['F2', 'A2', 'C3', 'F3'], C: ['C3', 'E3', 'G3', 'C4'],
  Gm: ['G2', 'Bb2', 'D3', 'G3'], Bbmaj7: ['Bb2', 'D3', 'F3', 'A3'], Csus: ['C3', 'F3', 'G3', 'C4'],
  D: ['D3', 'F#3', 'A3', 'D4'], G: ['G2', 'B2', 'D3', 'G3'], Asus: ['A2', 'D3', 'E3', 'A3'], A: ['A2', 'C#3', 'E3', 'A3'],
  Dadd9: ['D3', 'A3', 'E4', 'F#4'],
};
const roots: Record<string, string> = { Dm: 'D2', Bb: 'Bb1', F: 'F2', C: 'C2', Gm: 'G1', Bbmaj7: 'Bb1', Csus: 'C2', D: 'D2', G: 'G1', Asus: 'A1', A: 'A1', Dadd9: 'D2' };
const arp = (ch: string, i: number, oct = 12) => { const c = chords[ch]!.map(n); return c[i % c.length]! + oct * Math.floor(i / c.length) ; };

// Opening swipe → hit at bar 0 (the giant 一)
swipe(0.0, 0.5, 0.35, 400, 9000, -0.8, 0.8, 0.2);
boom(b(0), 0.9, n('D1'));
pluck(b(0), n('D3'), 0.35, 5, 0, 0.3);
pluck(b(0), n('A3'), 0.2, 5, 0.2, 0.3);

// PROLOGUE: drone + clock ticks — time is finite
drone(b(0), [n('D2'), n('A2')], BAR * 4.2, 0.07);
for (let k = 2; k < 16; k++) tick(b(0) + k * BEAT, k % 4 === 0 ? 1 : 0.6);
// the reveal: a soft falling figure as the field opens
[n('A4'), n('F4'), n('D4')].forEach((m, j) => pluck(b(0.5) + j * BEAT * 0.5, m, 0.12, 3, -0.3 + j * 0.3, 0.6));
// dots of "things you'd want to do" appearing (bar 2–3): sparse high plucks
for (let k = 0; k < 8; k++) pluck(b(2) + k * BEAT * 0.5, n(['D6', 'A5', 'F6', 'C6', 'E6', 'A5', 'G6', 'D6'][k]!), 0.05, 1.5, -0.7 + k * 0.2, 0.8, 0.6);
swipe(b(3), BAR, 0.18, 200, 3000, 0, 0, 0.4); // dive into the dot

// CH1 COMPLEXITY (bars 4–10)
const ch1 = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bbmaj7'];
// question typing: 13 key clicks on 16ths starting bar 4 beat 1
for (let k = 0; k < 13; k++) keyClick(b(4) + BEAT * 0.5 + k * BEAT * 0.25, 1, -0.2 + (k % 3) * 0.2);
ch1.forEach((ch, j) => {
  const t = b(4 + j);
  if (j >= 1) sub(t, n(roots[ch]!), BAR * 0.98, 0.12 + j * 0.015);
  if (j >= 2) pad(t, chords[ch]!.map(n), BAR, 0.035 + j * 0.006, 900 + j * 250);
  const density = j < 1 ? 0 : j < 3 ? 4 : 8;
  for (let k = 0; k < density; k++) pluck(t + k * (BAR / density), arp(ch, k, 12) + 12, 0.08, 1.6, k % 2 ? 0.35 : -0.35, 0.55, 0.4);
});
// six domains burst, one per beat from bar 5: ascending notes
['D5', 'F5', 'A5', 'C6', 'D6', 'F6'].forEach((m, j) => { pluck(b(5) + j * BEAT, n(m), 0.16, 2.5, -0.6 + j * 0.24, 0.7); hat(b(5) + j * BEAT, 0.8); });
// the lone stroke slides under each domain (bar 7, 7.5, 8, 8.5) — low thuds
for (let k = 0; k < 5; k++) { kick(b(7) + k * BEAT * 2, 0.45); }
// maxim, bar 9: swell, then a held breath on the last beat before the cut
pad(b(9), chords['Csus']!.map(n), BAR * 0.75, 0.06, 2200, 1.2, 0.4);
swipe(b(9), BAR * 0.75, 0.2, 300, 8000, 0, 0, 0.3);

// CH2 CONNECTION (bars 10–16): pulse arrives
const ch2 = ['Dm', 'Gm', 'Bb', 'C', 'Dm', 'Gm'];
ch2.forEach((ch, j) => {
  const t = b(10 + j);
  sub(t, n(roots[ch]!), BAR * 0.98, 0.2);
  pad(t, chords[ch]!.map((x) => n(x) + 12), BAR, 0.035, 1500 + j * 200, 0.3, 0.8);
  kick(t, 0.9); kick(t + BEAT * 1.5, 0.6); kick(t + BEAT * 2, 0.8);
  if (j >= 2) { clap(t + BEAT, 0.6); clap(t + BEAT * 3, 0.6); }
  for (let k = 0; k < 8; k++) hat(t + k * BEAT / 2 + BEAT / 4, k % 2 ? 0.5 : 0.8);
  for (let k = 0; k < 8; k++) pluck(t + k * BEAT / 2, arp(ch, k * 3, 12) + 12, 0.06, 1.2, k % 2 ? 0.4 : -0.4, 0.6, 0.35);
});
// AI connections (bars 10.5–12.5): bells, one per drawn link, every 2 beats
['A5', 'D6', 'F5', 'C6', 'A5', 'E6'].forEach((m, j) => bell(b(10.5) + j * BEAT * 2, n(m), 0.08, 2.4, -0.5 + j * 0.2));
// alignment riser into the breakthrough
swipe(b(14), BAR * 2, 0.22, 200, 10000, -0.3, 0.3, 0.3);
for (let k = 0; k < 8; k++) tick(b(15) + k * BEAT / 2, 0.4 + k * 0.08);

// CH3 BREAKTHROUGH (bars 16–24): full groove
const ch3 = ['Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Asus'];
ch3.forEach((ch, j) => {
  const t = b(16 + j);
  for (let q = 0; q < 4; q++) kick(t + q * BEAT, q === 0 ? 1 : 0.85);
  clap(t + BEAT, 1); clap(t + BEAT * 3, 1);
  for (let k = 0; k < 16; k++) hat(t + k * BEAT / 4, k % 4 === 2 ? 1 : 0.45, k % 2 ? 0.35 : -0.1);
  for (let k = 0; k < 8; k++) sub(t + k * BEAT / 2, n(roots[ch]!) + (k % 4 === 3 ? 12 : 0), BEAT / 2 * 0.9, 0.2);
  pad(t, chords[ch]!.map((x) => n(x) + 12), BAR, 0.04, 2400, 0.1, 0.6);
  for (let k = 0; k < 16; k++) pluck(t + k * BEAT / 4, arp(ch, (k * 5) % 9, 12) + 12, 0.05, 0.9, Math.sin(k) * 0.6, 0.75, 0.3);
  if (j % 2 === 0) { boom(t, 0.35, n('D2')); noiseHit(t, 0.12, 0.6, 3000, 14000, 0, 0.5); }
});
// each vignette's moment: a machine bell
[16, 18, 20, 22].forEach((bb, j) => bell(b(bb + 1), n(['D6', 'F6', 'A6', 'C7'][j]!), 0.07, 2, 0.3));

// CH4 JUDGMENT (bars 24–29) — tape stop is applied to the master below
for (let k = 0; k < 4; k++) tick(b(24) + k * BEAT, 1); // time returns: the person thinks
drone(b(24.5), [n('D2'), n('A2'), n('F3')], BAR * 4.6, 0.06);
// red pen tracing: scratchy short noise strokes (bar 25–26.5)
for (let k = 0; k < 6; k++) noiseHit(b(25) + k * BEAT * 0.5 + 0.05, 0.08, 0.08, 2500, 6000, -0.3 + k * 0.1, 0.1);
pluck(b(25), n('F4'), 0.12, 3, -0.2, 0.4); pluck(b(26), n('E4'), 0.12, 3, 0.2, 0.4);
// the corrected limit falls one decade: a heavy drop
swipe(b(26.5) - 0.35, 0.35, 0.18, 4000, 200, 0.2, -0.2, 0.2);
boom(b(26.5), 0.85, n('D1')); kick(b(26.5), 1);
// the seal
noiseHit(b(27.5), 0.5, 0.03, 100, 3000, 0, 0.3, 120); kick(b(27.5), 0.8);
pluck(b(27.5), n('D4'), 0.2, 4, 0, 0.4); pluck(b(27.5), n('A4'), 0.12, 4, 0.2, 0.4);
pad(b(28), chords['Dm']!.map(n), BAR, 0.04, 1200, 1.0, 0.5);
for (let k = 0; k < 8; k++) pluck(b(28) + k * BEAT / 2, arp('Dm', k, 12) + 12, 0.05, 1.2, k % 2 ? 0.3 : -0.3, 0.5);

// FINALE (bars 29–35)
['Gm', 'Asus'].forEach((ch, j) => {
  const t = b(29 + j);
  sub(t, n(roots[ch]!), BAR, 0.2);
  pad(t, chords[ch]!.map((x) => n(x) + 12), BAR, 0.05 + j * 0.02, 1800 + j * 1500, 0.5, 0.4);
  for (let q = 0; q < 4; q++) kick(t + q * BEAT, 0.6 + j * 0.2);
  for (let k = 0; k < (j ? 16 : 8); k++) pluck(t + k * BAR / (j ? 16 : 8), arp(ch, k, 12) + 12, 0.06, 1, k % 2 ? 0.4 : -0.4, 0.7);
});
swipe(b(29.5), BAR * 1.5, 0.3, 150, 12000, -0.5, 0.5, 0.35);
// CLIMAX: 大 — D major, the first major chord of the film
boom(b(CUE.climax), 1.0, n('D1'));
kick(b(CUE.climax), 1);
noiseHit(b(CUE.climax), 0.25, 1.2, 2000, 15000, 0, 0.7);
pad(b(31), [...chords['D']!.map((x) => n(x) + 12), n('D2')], BAR * 1.9, 0.09, 3500, 0.02, 3, 0.6);
sub(b(31), n('D1'), BAR * 1.5, 0.25);
['D5', 'F#5', 'A5', 'D6', 'E6', 'F#6', 'A6', 'D7'].forEach((m, j) => pluck(b(31) + j * BEAT / 4, n(m), 0.11, 4, -0.7 + j * 0.2, 0.85, 0.6));
// horizon: wide, calm
pad(b(32), chords['G']!.map((x) => n(x) + 12), BAR, 0.05, 2000, 0.8, 1.5);
pad(b(33), chords['Asus']!.map((x) => n(x) + 12), BAR, 0.045, 1600, 0.8, 1.5);
pad(b(34), chords['Dadd9']!.map((x) => n(x) + 12), BAR * 1.2, 0.045, 1400, 0.8, 4);
sub(b(32), n('G1'), BAR, 0.14); sub(b(33), n('A1'), BAR, 0.14); sub(b(34), n('D2'), BAR, 0.12);
pluck(b(33), n('A4'), 0.12, 4, -0.2, 0.5); pluck(b(33) + BEAT * 2, n('E5'), 0.09, 4, 0.2, 0.5);
pluck(b(34), n('F#4'), 0.12, 4, -0.2, 0.5); pluck(b(34) + BEAT * 2, n('A4'), 0.09, 4, 0.2, 0.5);
// title: one note, one boom
boom(b(CUE.title), 0.55, n('D1'));
pluck(b(CUE.title), n('D5'), 0.18, 6, 0, 0.4, 0.7);
pluck(b(CUE.title), n('A5'), 0.08, 6, 0.3, 0.4, 0.7);

// ---------- tape stop before bar 24 (the error) ----------
{
  const ts = b(CUE.stop), win = 0.9;
  const i1 = Math.round(ts * SR), i0 = Math.round((ts - win) * SR);
  const srcL = L.slice(i0, i1), srcR = R.slice(i0, i1);
  const sL = sendL.slice(i0, i1), sR = sendR.slice(i0, i1);
  let pos = 0;
  for (let i = i0; i < i1; i++) {
    const u = (i - i0) / (i1 - i0);
    const rate = Math.pow(1 - u, 1.6);
    const j = Math.floor(pos), fr = pos - j;
    const g = (a: Float32Array) => (a[j] ?? 0) * (1 - fr) + (a[j + 1] ?? 0) * fr;
    L[i] = g(srcL); R[i] = g(srcR); sendL[i] = g(sL); sendR[i] = g(sR);
    pos += rate;
  }
  // bar 24 itself keeps only what was added for judgment; clear anything bleeding from ch3
  const keepFrom = i1;
  for (let i = keepFrom; i < Math.min(N, keepFrom + Math.round(0.02 * SR)); i++) { L[i] *= (i - keepFrom) / (0.02 * SR); R[i] *= (i - keepFrom) / (0.02 * SR); }
}

// ---------- reverb (4-line FDN) ----------
{
  const dl = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((x) => Math.round(x * 2.3));
  const bufs = dl.map((d) => new Float32Array(d));
  const idx = dl.map(() => 0);
  const lp = dl.map(() => 0);
  const fb = 0.86;
  for (let i = 0; i < N; i++) {
    const outs = bufs.map((bf, k) => bf[idx[k]!]!);
    let yl = 0, yr = 0;
    outs.forEach((o, k) => { if (k % 2) yr += o; else yl += o; });
    // Householder mix
    const sum = outs.reduce((a, b) => a + b, 0) * (2 / outs.length);
    outs.forEach((o, k) => {
      let v = (o - sum) * fb + (k % 2 ? sendR[i]! : sendL[i]!) * 0.35;
      lp[k] = lp[k]! * 0.45 + v * 0.55; // damping
      bufs[k]![idx[k]!] = lp[k]!;
      idx[k] = (idx[k]! + 1) % dl[k]!;
    });
    L[i] += yl * 0.32; R[i] += yr * 0.32;
  }
}

// ---------- master: gentle glue + limiter, fade tail ----------
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]!), Math.abs(R[i]!));
const pre = 0.95 / Math.max(0.3, Math.min(peak, 2.2));
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = t > DURATION - 2.5 ? Math.max(0, (DURATION - t) / 2.5) : 1;
  const l = Math.tanh(L[i]! * pre * 1.15) * 0.93 * fade, r = Math.tanh(R[i]! * pre * 1.15) * 0.93 * fade;
  L[i] = l; R[i] = r;
  pcm.writeInt16LE(Math.round(l * 32767), i * 4);
  pcm.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24);
hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
mkdirSync('out', { recursive: true }); mkdirSync('data', { recursive: true });
writeFileSync('out/score.wav', Buffer.concat([hdr, pcm]));

// ---------- 60 Hz envelopes for the visuals ----------
const rate = 60, hop = SR / rate;
const rms: number[] = [], low: number[] = [], high: number[] = [];
let lo = 0, hp = 0, prevx = 0;
const al = Math.exp((-2 * Math.PI * 150) / SR), ah = Math.exp((-2 * Math.PI * 4000) / SR);
for (let f = 0; f < Math.floor(N / hop); f++) {
  let s = 0, sl = 0, sh = 0;
  for (let k = 0; k < hop; k++) {
    const i = Math.floor(f * hop + k);
    const x = (L[i]! + R[i]!) / 2;
    lo = lo * al + x * (1 - al);
    hp = ah * (hp + x - prevx); prevx = x;
    s += x * x; sl += lo * lo; sh += hp * hp;
  }
  rms.push(Math.sqrt(s / hop)); low.push(Math.sqrt(sl / hop)); high.push(Math.sqrt(sh / hop));
}
const norm = (a: number[]) => { const m = Math.max(...a) || 1; return a.map((v) => +(Math.min(1, v / m)).toFixed(4)); };
writeFileSync('data/audio.json', JSON.stringify({ rate, rms: norm(rms), low: norm(low), high: norm(high) }));
console.log('score.wav written', (N / SR).toFixed(1), 's, peak', peak.toFixed(2));
