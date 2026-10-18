# Engine guide

## One clock
`src/engine/score.ts` defines `BPM = 100`, `T0 = 0.5` (song time of bar 0), `bar(n)`, `beat(n)`,
section ranges and the named `CUE` table. `scripts/synth.ts` places every note and hit with `bar()`;
scenes place every visual event with the same calls. Change a cue → both picture and sound move.

## Scenes
A scene is `{ id, start, end, render(ctx, frame), samples?(t) }` (`src/engine/scene.ts`).
- Draw the whole frame in logical 1920×1080 px. The renderer pre-scales for 4K (`--scale 2`).
- `frame` has `t, lt, p, beat, bar, beatPhase` and audio envelopes `rms, low, high` from `data/audio.json`.
- Return post overrides: `ground` ('paper' | 'ink'), `grain`, `vignette`, `flash`, `fade`.
- Must be a pure function of `t`. Use `mulberry32`/`hash`/`noise1` for randomness.
- `samples(t)` asks for motion-blur sub-frames during fast moves; the renderer averages them exactly
  (running mean, alpha 1/k) over `shutter` = 0.5 frame.
- Cuts are hard cuts on downbeats; transitions are match cuts designed inside scenes.

## Toolbox
- `core.ts`: `renderFrame`, `camera(c, x, y, zoom, rot, shake)` (world point at screen centre), `clear`.
- `stroke.ts`: `heng` / `hengPath` (Song-style 一 of any length with entry cut and end serif),
  `ribbon` (brush stroke along a bezier with a width profile, written to progress p), `ren` (人),
  `dimension` (engineering dimension line).
- `type.ts`: `text`, `glyphs` (per-character state callback: alpha, offset, scale, colour, family), `layout`, `width`.
- `util.ts`: `ease.*` (expo, cubic, back, spring), `prog(t, a, b, ease)`, `keys(t, [[t, v, ease]…])`, `pulse`.

## Determinism & parity
Preview (`preview/main.ts`) and export (`scripts/render.ts`) call the same `renderFrame`; the preview
quantizes t to the 60 fps grid. Remaining differences are font rasterization between Skia and the
browser's canvas, which is sub-pixel.

## Performance (2 vCPU, no GPU)
Scene drawing 5–30 ms/frame at 1080p; motion-blur sub-frames multiply that only where requested.
Full film at 1080p60 renders in ~10–15 minutes with 2 workers.
