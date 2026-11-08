# Rendering

`engine/renderFrame.ts` draws one frame: `renderFrame(ctx, { project, time, width, height, frames, beats })`.
It is **pure with respect to its inputs** — the preview's rAF loop and the exporter call it with the same
arguments and get the same pixels.

## Frame pipeline

1. Clear to `project.backgroundColor`.
2. `activeClipsInRenderOrder(project, time)` — clips under the playhead, bottom layer first, skipping hidden tracks.
3. For each visual clip: ask the `FrameSource` for pixels at `sourceTimeAt(clip, time)` and call `drawVisualClip`.
4. For each text clip: `drawTextClip`.
5. Return **hitboxes** (rotated rectangles), topmost first, so clicking the preview selects what you see.

All sizes are expressed against a 1080 px short side (`env.unit`), so a project looks identical at 720p and 1440p.

## Visual clips (`drawVisual.ts`)

The transform of a photo/video is a composition of **poses** (`combinePoses`): opacity, offset, scale,
scaleX/Y, rotation and blur multiply/add together from:

| Source | File | Example |
| --- | --- | --- |
| Clip transform | inspector *Transform* | position, zoom, rotation, opacity |
| Motion (camera move) | `motion.ts` → `MOTIONS` | zoom in/out (long/short), pan ←→↑↓, slide-turn, swing, spiral, handheld, drift |
| Transition in/out | `transitions.ts` → `TRANSITIONS` | fade, zoom punch, slides, squeeze, zoom spin, whip… |
| Beat FX | `BEAT_FX` | zoom pulse, flash, shake, blur pulse, exposure, tilt |

Then: **crop** (`drawImage` with a normalised source rect), **flip**, cover/contain fit, CSS-filter colour
(brightness, contrast, saturation, hue, blur) plus canvas grading for **temperature, tint and fade**, a
vignette, and finally **lights**.

### Motion pace (velocity)

A motion runs over the clip's length with progress `p ∈ [0,1]`. `pacedProgress(curve, local, duration, clipStart, beats)`
reshapes `p`:

| Pace | Shape |
| --- | --- |
| linear / ease-in / ease-out / smooth | the matching GSAP ease |
| rush (`fast-middle`) | slow → fast → slow |
| hang (`slow-middle`) | fast → almost still → fast |
| on beat | holds between beats, then steps forward on each beat with an `expo.out` snap (0.35 s) |

Pans scale the image by `1 + amount` so moving it by up to 100 % never shows an empty edge.

### Transitions

`TRANSITIONS[type](p, w, h)` returns a partial pose for an *entering* clip. The *out* transition reuses the
same function with reversed progress, so each effect is written once.

### Lights (`drawLights.ts`)

Each `LightEffect` (glow, lamp, eclipse, flare, leak, beam) is painted by a strategy in `PAINTERS`, clipped to
the image rectangle so it moves and zooms with the photo. Blend modes give the photographic look: `screen`
for added light, `multiply` for the eclipse disc, `soft-light` for warmth. `pulseOnBeat` scales intensity by
the beat pulse.

## Beat pulse

`beats.ts → beatStateAt(beats, time)` returns `{ pulse, index, since }`, where `pulse = e^(−since / 0.14 s)`:
1 exactly on the beat, decaying fast. Beat FX, text beat loops and pulsing lights all read this one value.

## Text (`drawText.ts`, `textLayout.ts`, `textAnimations.ts`)

1. **Layout** (cached): wrap to `maxWidth`, then split into units — words, characters or lines.
2. **Timing**: each unit's in-animation starts at `clip.start + i × stagger`, or — with *reveal on beat* — on
   successive beats. Auto-lyric captions set `stagger` to the real spacing between sung words.
3. **Animation**: `IN_ANIMATIONS`, `OUT_ANIMATIONS` and `LOOP_ANIMATIONS` are strategy tables returning per-unit poses;
   eases come from GSAP's `parseEase` (deterministic).
4. **Paint**: optional box/pill background, shadow, stroke, fill; karaoke draws the highlight colour up to
   the current unit.
