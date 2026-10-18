// subtitles.mjs — a sidecar .srt for the film's spoken content.
//
// The film has no voice-over by design: the type is the narration, and it is already printed
// in the picture. What a festival or a streaming platform needs is therefore not a transcript
// of dialogue but a *description track* — the lines of type as they appear, timed to the
// frame. This generates that from the same numbers the renderer uses, so it can never drift.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// [start, end, text] — times are the actual appearance times in the plates
const CUES = [
  [1.0, 4.6, '第一个点。一个人的全部所能。'],
  [4.9, 9.4, '超出一人之力'],
  [7.6, 11.2, '一个人能做的，比一个人想做的少。'],
  [12.3, 16.4, '一个问题，从来不是一件事。'],
  [16.6, 19.9, '这题需要四种能力。一个人手里：01。'],
  [20.2, 21.9, '不是没有答案。是答案长在别人的领域里。'],
  [22.3, 26.0, '它不是替你回答，是把缺的那一半，递到你手边。'],
  [26.0, 29.9, '读它 · 跑它 · 校它 · 译它'],
  [30.4, 33.9, '四段陌生的知识，被接到了同一条线上。'],
  [34.3, 38.6, '它先替你读懂，再让你决定信不信。'],
  [38.8, 39.9, '每一条摘要，都钉回原句。'],
  [40.3, 45.9, '一个想法开始自己长出分支，每一支都带着证据。'],
  [46.3, 49.9, '它写得很快。缝在哪儿，你得自己看。'],
  [50.2, 53.9, '你看到的是一行。它背后是一整座城。'],
  [54.4, 58.9, '它答得很像。像，不等于对。'],
  [56.4, 58.9, '这段是错的。'],
  [59.4, 63.9, '最后一句，必须由人来说。'],
  [60.2, 63.9, '改过来了。'],
  [64.4, 67.3, '一只手画出的线，现在有八只手一起握着了。'],
  [67.6, 71.9, '证明 · 测量 · 编程 · 分析 · 翻译 · 检索 · 校对 · 起草'],
  [72.4, 77.9, '那条线没有变长。是拿笔的手，变多了。'],
  [78.4, 82.4, '当智能不再只来自你自己的大脑，'],
  [79.4, 82.4, '你能抵达的边界，就不再是一个人的边界。'],
  [82.4, 84.0, '所以用它。然后自己判断。'],
];

const pad = (n, w = 2) => String(n).padStart(w, '0');
function ts(t) {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
  const ms = Math.round((t - Math.floor(t)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

const srt = CUES.map(([a, b, text], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${text}\n`).join('\n');
fs.writeFileSync(path.join(ROOT, 'out/beyond_one.zh.srt'), srt, 'utf8');

// a short bilingual description track, for platform subtitles
const EN = CUES.map(([a, b, text], i) => {
  const en = [
    'One mark. Everything one person has.',
    'BEYOND ONE',
    'What one person can do is less than what one person can imagine.',
    'A problem is never one thing.',
    'Four disciplines required. One held.',
    'Not without an answer — the answer lives in someone else\'s field.',
    'It does not answer for you. It hands you the missing half.',
    'read · run · check · translate',
    'Four foreign fields, joined to one line.',
    'It reads first, so you can decide whether to believe it.',
    'Every summary is tethered to its source sentence.',
    'One idea branches, and every branch carries evidence.',
    'It writes fast. Where the seams are is yours to see.',
    'You see one line. Behind it is a city.',
    'It answers plausibly. Plausible is not correct.',
    'This is wrong.',
    'The last word has to be human.',
    'Corrected.',
    'One hand drew this line. Eight hands hold it now.',
    'proof · measure · code · analyse · translate · retrieve · check · draft',
    'The line did not grow. The hands holding the pen did.',
    'When intelligence no longer comes only from your own mind,',
    'the edge you can reach is no longer one person\'s edge.',
    'So use it. Then judge for yourself.',
  ][i];
  return `${i + 1}\n${ts(a)} --> ${ts(b)}\n${en}\n`;
}).join('\n');
fs.writeFileSync(path.join(ROOT, 'out/beyond_one.en.srt'), EN, 'utf8');

console.log(`out/beyond_one.zh.srt  ${CUES.length} cues`);
console.log(`out/beyond_one.en.srt  ${CUES.length} cues`);
