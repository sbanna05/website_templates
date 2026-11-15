# Audio engine

## Import

`media/assetLoader.ts` decodes each file once into an `AudioBuffer` (videos with sound too) and stores it in
the media registry. `media/waveform.ts` computes normalised peaks for drawing, and a mono, down-sampled copy
goes to the DSP worker for [beat detection](music-sync.md#beat-detection).

## Speed and pitch (`audioBufferCache.ts`, `timeStretch.ts`)

Speed and pitch are independent. For any `(asset, speed, pitch)` that isn't neutral, the cache asks the DSP
worker to run **SoundTouch (WSOLA)**: `tempo = speed`, `pitch = 2^(semitones/12)`. The result is cached and
listeners are notified, so playback re-schedules as soon as it is ready. Neutral settings use the original
buffer directly.

> *Slowed + reverb* sets speed 0.85 and pitch −3 semitones. Because 12·log₂(0.85) ≈ −2.8, that is the same
> sound as a tape played slower — the classic "slowed" effect — while each half stays adjustable.

## The mixer (`mixer.ts`)

`collectMixSources(project, assets)` turns every sounding clip into a `MixSource` (layers, speed, pitch,
start/end, buffer offset, volume, fades, EQ, effects, volume keys). **Layers** are the files that sound: the
song itself, or — for a split song with a stem mix — one layer per audible stem with its gain (see
[stems](stems.md#playing-a-stem-mix-enginestemsts-audiomixerts)). Muted tracks and silent video are skipped.
If crossfades are on, `crossfadeOverlaps` adjusts the fades first.

`scheduleMix(ctx, destination, sources, from, when)` builds this graph per source — on **any**
`BaseAudioContext`:

```
layer source(s) ─► [layer Gain] ─┐                                     one per stem, or just the song
                                 ├─► Gain (volume × fade in/out × de-click)
                                 ─► Gain (volume curve, setValueCurveAtTime)       only if the clip has keys
                                 ─► EQ (low cut, shelves, bell)                     only active bands
                                 ─► [low-pass] ─┬─► dry Gain ─────────────► master bus
                                                └─► send Gain ─► Convolver ─► master bus
```

The **master bus** (volume → EQ → glue → limiter) sits between every clip and the speakers / export file —
see [mixing](mixing.md#master-bus-audiomasterts-masterinspectortsx).

- **Preview** (`previewAudio.ts`) calls it on the realtime `AudioContext`. Its clock is the preview's
  master clock. Each play gets a fresh bus node, so pausing also silences reverb tails. An analyser per
  channel after the master feeds the level meters.
- **Export** calls it on an `OfflineAudioContext` and renders the whole mix at once.

Every edge gets an 8 ms fade so cuts never click.

## Sound effects (`effects.ts`)

`AudioClip.effects = { reverb, roomSize, lowpass }`; `connectEffects` wires only what is needed (a dry clip
is a straight connection). Tone shaping is the separate [EQ](mixing.md#eq-engineeqts-audioeqchaints-eqeditortsx).

| Control | Implementation |
| --- | --- |
| Reverb | `ConvolverNode` with a **synthetic impulse**: stereo noise (seeded PRNG → deterministic) shaped by `(1 − t)^2.2` and a one-pole low-pass that darkens the tail, 12 ms pre-delay. Wet = `0.9 × reverb`, dry = `1 − 0.35 × reverb` |
| Room size | Tail length `0.6 + 4.4 × roomSize` seconds; impulses are cached per context and size |
| Muffle | `BiquadFilter` low-pass, cutoff `20 kHz × (400/20000)^amount` (exponential, so the slider feels even) |
**Presets** (`SOUND_PRESETS`) bundle effects with optional speed/pitch: Original, Slowed + reverb, Sped up,
Lo-fi, Underwater, Concert hall.

> Removing or isolating vocals used to be a centre-channel filter trick (`L − R`), which only turned the
> voice down. It was replaced by real AI separation — see [stems](stems.md).

## Volume curves (`engine/automation.ts`)

`AudioClip.volumeKeys` is a list of keyframes `{ time (source s), value (0–2× gain), shape }`. `volumeAt`
interpolates between neighbours by the **shape of the left key**:

| Shape | Formula for t ∈ [0,1] | Feel |
| --- | --- | --- |
| `linear` | t | straight ramp |
| `smooth` | t²(3 − 2t) (smoothstep) | eases in and out, no corners — like Blender's auto-clamped Bézier |
| `hold` | 0 | flat, then jumps at the next key (step) |

Before the first key / after the last, the value holds. For audio, `sampleVolume` samples the curve at
120 points per second and feeds `setValueCurveAtTime` on its own gain node (separate from the fade
envelope, so the two never conflict).

Presets: **Pump on beat** (a key at each beat ducking to `1 − depth` with *smooth*, and a *hold* key at 1
after `release × beat`, i.e. a sidechain pump), **Build up** (0.2 → 1.15) and **Dip middle**.

The editor (`VolumeCurveEditor.tsx`) maps x to source time across the clip and y to 0–200 %, snaps new and
dragged points to beats within 10 px, snaps the value to 100 % near the unity line, and offers 1×/4×/12× zoom
for long songs. A read-only copy of the curve is drawn over the clip on the timeline.

## Crossfades

`crossfadeOverlaps(sources)` groups sources by track, sorts by start and, for each neighbour pair where the
later song starts before the earlier one ends **and plays on past it** (a hand-over), sets both
`earlier.fadeOut` and `later.fadeIn` to at least the overlap. A part placed entirely *inside* a longer song is
layered on top instead, so the song keeps playing after it. Longer fades you set yourself are kept. Toggle: *Project → Beat grid → Crossfade overlapping songs*.
