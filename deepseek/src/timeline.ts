// timeline.ts — the edit. One beat = one second at 60 BPM.
// Cuts are placed on the beat grid the score actually plays, so nothing in the film can
// drift: these numbers are the source of truth for both preview and export.
export type Entry = {
  id: string;
  scene: string;
  start: number;
  end: number;
  name: string;
  params?: Record<string, unknown>;
};

export const DURATION = 84;

export const timeline: Entry[] = [
  { id: 'T00', scene: 'title',   start: 0.0,  end: 12.0, name: '序 · 有限' },
  { id: 'T01', scene: 'complex', start: 12.0, end: 20.0, name: '一 · 复杂' },
  { id: 'T02', scene: 'arrive',  start: 20.0, end: 22.0, name: '一 · 抵达' },
  { id: 'T03', scene: 'connect', start: 22.0, end: 34.0, name: '二 · 连接' },
  { id: 'T04', scene: 'language',start: 34.0, end: 40.0, name: '二 · 语言' },
  { id: 'T05', scene: 'climb',   start: 40.0, end: 46.0, name: '三 · 展开' },
  { id: 'T06', scene: 'stitch',  start: 46.0, end: 50.0, name: '三 · 缝合' },
  { id: 'T07', scene: 'depth',   start: 50.0, end: 54.0, name: '三 · 纵深' },
  { id: 'T08', scene: 'error',   start: 54.0, end: 59.0, name: '四 · 讹' },
  { id: 'T09', scene: 'verify',  start: 59.0, end: 64.0, name: '四 · 核' },
  { id: 'T10', scene: 'return',  start: 64.0, end: 72.0, name: '终 · 复调' },
  { id: 'T11', scene: 'beyond',  start: 72.0, end: 78.0, name: '终 · 超出' },
  { id: 'T12', scene: 'close',   start: 78.0, end: 84.0, name: '终 · 一句话' },
];

export function entryAt(t: number): Entry {
  for (const e of timeline) if (t >= e.start && t < e.end) return e;
  return t < 0 ? timeline[0] : timeline[timeline.length - 1];
}
