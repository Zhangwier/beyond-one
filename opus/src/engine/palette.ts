// Style bible, in code. Four values and two signals; nothing else is allowed on screen.
//  paper / ink        : the two grounds (the film alternates light and dark)
//  graphite / ash     : secondary type, rules, grids
//  human (朱, vermilion): ONLY the person's own judgment — the red pen, the seal, 人
//  machine (群青, ultramarine): ONLY what the AI contributes — bridges, translations, drafts
export const P = {
  paper: '#ECE8DF',
  paper2: '#E2DDD2',
  ink: '#0D0E10',
  ink2: '#17191C',
  graphite: '#5F5C57',
  ash: '#A39E95',
  human: '#D2321F',
  machineOnPaper: '#2443C4',
  machineOnInk: '#7C95FF',
};

export function rgba(hex: string, a = 1) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Linear mix of two hex colours → rgb() string. */
export function mix(h1: string, h2: string, t: number, a = 1) {
  const p = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const x = p(h1), y = p(h2);
  const c = x.map((v, i) => Math.round(v + (y[i]! - v) * t));
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
