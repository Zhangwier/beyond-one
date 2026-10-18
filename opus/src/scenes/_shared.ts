// Shared world data: the one concrete problem the film follows, its domains, and its data.
import type { C } from '../engine/env';
import { text, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { mulberry32 } from '../engine/util';

export const QUESTION = '家门口这条河，还能游泳吗？';

export interface Domain {
  id: string;
  name: string;
  jargon: string[];
  plain?: string; // the machine's plain-language translation (ch2)
  learn: string; // time to learn alone
  months: number;
  pos: [number, number]; // world position in the map (ch1/ch2)
  from: number; // index of the question character it bursts from
}

export const DOMAINS: Domain[] = [
  { id: 'chem', name: '水化学', jargon: ['pH 6–9 · DO ≥ 5 mg/L', 'COD ≤ 20 · NH₃-N ≤ 1.0', '总磷 ≤ 0.2 mg/L'], plain: '水里的氧气和营养盐', learn: '+8 个月', months: 8, pos: [-700, -300], from: 5 },
  { id: 'micro', name: '微生物', jargon: ['粪大肠菌群', '44.5 ℃ 培养 24 h', '滤膜法 · 菌落计数'], plain: '= 水里有没有粪便污染', learn: '+1 年', months: 12, pos: [0, -360], from: 9 },
  { id: 'std', name: '标准', jargon: ['GB 3838—2002', 'Ⅲ类 · 含游泳区', '24 粪大肠菌群（个/L）'], plain: '= 能游泳的那一档', learn: '+2 个月', months: 2, pos: [700, -300], from: 10 },
  { id: 'sample', name: '采样', jargon: ['无菌瓶 · 0–4 ℃', '尽快送检', '断面 · 频次 · 平行样'], plain: '在哪、何时、怎么取水', learn: '+6 个月', months: 6, pos: [-700, 300], from: 1 },
  { id: 'code', name: '编程', jargon: ['import pandas as pd', 'df.groupby("日期")', 'shift(1).corr()'], plain: '让表格自己算', learn: '+1 年', months: 12, pos: [0, 360], from: 7 },
  { id: 'stat', name: '统计', jargon: ['对数正态 · 中位数', '滞后相关 r', 'p < 0.05'], plain: '= 不太可能是巧合', learn: '+8 个月', months: 8, pos: [700, 300], from: 8 },
];

export const CARD_W = 320, CARD_H = 168;

/** A domain card: hairline frame, index, name, jargon. `ink` = 0 faint .. 1 fully understood. */
export function card(
  c: C, d: Domain, x: number, y: number,
  o: { ink: number; fg: string; dim: string; reveal?: number; lw?: number; jargonFade?: number; plainP?: number; plainColor?: string; idx?: number; tag?: string; tagA?: number },
) {
  const w = CARD_W, h = CARD_H, rv = o.reveal ?? 1;
  c.save();
  c.translate(x - w / 2, y - h / 2);
  c.globalAlpha *= rv;
  c.strokeStyle = o.ink > 0.5 ? o.fg : o.dim;
  c.lineWidth = o.lw ?? 1.5;
  c.strokeRect(0, 0, w * Math.min(1, rv * 1.4), h);
  const col = o.ink > 0.5 ? o.fg : o.dim;
  text(c, String((o.idx ?? DOMAINS.indexOf(d)) + 1).padStart(2, '0'), 18, 34, { fam: 'Mono', size: 15, color: o.dim });
  text(c, d.name, 58, 42, { fam: 'Sans-Bold', size: 32, color: col });
  const jf = 1 - (o.jargonFade ?? 0) * 0.65;
  d.jargon.forEach((j, i) => {
    const vis = Math.min(1, Math.max(0, rv * 3 - 1 - i * 0.4));
    if (vis > 0) text(c, j, 20, 86 + i * 26, { fam: 'Mono', size: 17, color: o.ink > 0.5 ? o.fg : o.dim, alpha: vis * jf });
  });
  if (o.plainP && d.plain) {
    const s = d.plain;
    const n = Math.floor(Array.from(s).length * Math.min(1, o.plainP));
    text(c, Array.from(s).slice(0, n).join(''), 20, h + 36, { fam: 'Sans-Regular', size: 25, color: o.plainColor ?? '#00f' });
    c.fillStyle = o.plainColor ?? '#00f';
    c.fillRect(20, h + 8, 3, 34 * Math.min(1, o.plainP * 3));
  }
  if (o.tag && (o.tagA ?? 0) > 0) text(c, o.tag, w - 18, 34, { fam: 'Mono', size: 16, color: o.dim, align: 'right', alpha: o.tagA });
  c.restore();
}

/** 30 days of measurements (deterministic). Counts are 个/100mL; rain in mm. */
export interface Day { d: number; rain: number; cfu: number }
export const DAYS: Day[] = (() => {
  const r = mulberry32(7);
  const rainDays: Record<number, number> = { 5: 22, 6: 8, 13: 31, 21: 18, 22: 12 };
  const out: Day[] = [];
  for (let d = 0; d < 30; d++) {
    const rain = rainDays[d] ?? (r() < 0.12 ? Math.round(r() * 3) : 0);
    // response: lagged rain (1–2 days) pushes counts up a decade
    const lag = (rainDays[d - 1] ?? 0) * 1.0 + (rainDays[d - 2] ?? 0) * 0.7 + (rainDays[d] ?? 0) * 0.35;
    const base = 160 + r() * 260;
    const cfu = Math.round(base * Math.exp(lag * 0.085) * (0.85 + r() * 0.3));
    out.push({ d, rain, cfu });
  }
  return out;
})();
export const LIMIT_WRONG = 10000; // the bug: the 个/L limit used on 个/100mL counts
export const LIMIT_RIGHT = 1000; // 10000 个/L = 1000 个/100mL

export const CODE = [
  'import pandas as pd',
  '',
  'd = pd.read_csv("river.csv")  # 日期, 降雨mm, 菌落/100mL',
  'LIMIT = 10000                  # Ⅲ类 限值',
  'd["超标"] = d["菌落"] > LIMIT',
  'lag = d["降雨"].shift(1)',
  'r = d["菌落"].corr(lag)',
  'print(round(r, 2), d["超标"].mean())',
];
export const CODE_BUG_LINE = 3;

export function hair(c: C, zoom: number, px = 1) {
  c.lineWidth = px / zoom;
}

export { rgba, font };
