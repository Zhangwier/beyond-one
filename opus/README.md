# 超出一人之力 — Beyond One

A 88-second code-rendered motion-graphics film on *why use AI*: not to do what you already
do faster, but to reach what one person could not reach alone — while judgment stays human.

Every frame is a deterministic function of time `t`. The music is synthesized from the same
score file the scenes read their cues from, so picture and sound share one clock.

- Concept, style bible, structure: `docs/TREATMENT.md`
- Engine and scene API: `docs/ENGINE.md`

## Layout

```
src/engine/   score.ts (BPM, bars, cues — the single clock) · core.ts (t → pixels, motion blur, grain,
              vignette, camera) · stroke.ts (the 一 / 人 motif, drawn procedurally) · type.ts (fonts,
              per-glyph kinetic type) · palette.ts · util.ts (eases, keys, seeded noise) · env.ts (platform seam)
src/scenes/   prologue · complexity · connection · breakthrough · judgment · horizon (+ _shared data)
src/timeline.ts
scripts/synth.ts   original score → out/score.wav + data/audio.json (60 Hz envelopes)
scripts/render.ts  offline renderer: stills | sheet | video (Node + Skia → ffmpeg, parallel workers)
preview/           browser preview (same code on HTMLCanvas)
fonts/             Noto Sans SC, Noto Serif SC, IBM Plex Mono (SIL OFL)
```

## Requirements

Node 20+, ffmpeg with libx264. `npm install`, then `sh fonts/fetch-fonts.sh`.

## Run

```bash
npm run synth                                   # writes out/score.wav and data/audio.json
npx tsx scripts/render.ts stills --t 0.6,42.4,75.5          # PNGs in out/stills
npx tsx scripts/render.ts sheet --from 58 --to 70 --n 16    # contact sheet
npx tsx scripts/render.ts video --out out/film.mp4          # 1920×1080 60 fps, all cores
npx tsx scripts/render.ts video --scale 2 --out out/film-4k.mp4   # true 3840×2160
npx tsx scripts/render.ts video --from 38.9 --to 58.1 --preset veryfast --out out/ch3.mp4
npm run preview      # then open http://localhost:5173/preview/  (?t=42  &blur=1  &scale=2)
```

Preview keys: space play/pause · ←/→ ±1 s (shift ±5) · , . one frame · [ ] scenes · l loop scene · h hide HUD.

## Credits

Concept, code, score and data: original. Fonts: Noto Sans SC / Noto Serif SC (Google/Adobe, OFL), IBM Plex Mono (IBM, OFL).
Standard values quoted on screen: GB 3838—2002 《地表水环境质量标准》 表 1 第 24 项. River data is illustrative.
Method inspired by mexicat/pdoom-video (MIT): deterministic time, music-locked edit, typography as image, modular plates.
