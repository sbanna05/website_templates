# Mixing: EQ, master bus, merging parts

## EQ (`engine/eq.ts`, `audio/eqChain.ts`, `EqEditor.tsx`)

Every music clip and the master bus have a channel-strip EQ:

| Band | Filter | Range |
| --- | --- | --- |
| Low cut | high-pass, Butterworth (Q = 0.707), −12 dB/octave | off, or 20–500 Hz |
| Bass | low shelf at 120 Hz | ±12 dB |
| Mid | bell (peaking), Q 0.9, movable frequency | ±12 dB at 150 Hz – 6 kHz |
| Treble | high shelf at 8 kHz | ±12 dB |

`connectEq` builds one `BiquadFilterNode` per *active* band (a flat EQ adds no nodes). Web Audio takes a
pass/cut filter's Q in **dB**, so the low cut's Q is converted with `20·log₁₀(Q)`.

**The curve you see is the curve you hear.** `eqResponse()` computes the magnitude response with the RBJ
Audio-EQ-Cookbook formulas — the same ones `BiquadFilterNode` implements — summed in dB over the active
bands, on a log-frequency axis. It's pure maths, so it draws without an `AudioContext` and is unit-tested
(e.g. the low cut is −3 dB at its corner, a bell reaches exactly its gain at its centre).

Editing: drag the handles on the graph (the mid handle moves in frequency *and* gain, the low-cut handle
moves sideways; drag it fully left to switch it off), or use the sliders. Handles are focusable sliders:
↑/↓ gain (Shift = fine), ←/→ frequency, Delete resets the band. Presets: Flat, Bass boost, Vocal clarity,
Warm, Bright, Cut rumble, **Bass cut** (the DJ move: drop one song's bass while the other's comes in) and
Telephone.

## Master bus (`audio/master.ts`, `MasterInspector.tsx`)

Every sound goes through the master as the last stage, in preview **and** export:

```
mix ─► volume ─► master EQ ─► [glue compressor + make-up gain] ─► [limiter] ─► speakers / file
```

| Control | Implementation |
| --- | --- |
| Master volume | Gain, 0–150 % |
| Glue | `DynamicsCompressor`: amount 0–1 → threshold −8…−24 dB, ratio 1.5…4 : 1, knee 8 dB, 15 ms attack, 250 ms release, make-up gain up to +4 dB. Evens out levels so separate tracks sound like one mix |
| Limiter | `DynamicsCompressor` at −1 dBFS, ratio 20 : 1, hard knee, 2 ms attack — keeps the export from clipping. On by default |

Open it from the **Master** row at the bottom of the timeline. The row and the inspector show a **stereo
level meter** (RMS bar + falling peak marker, dB scale down to −48 dB, red tick on clipping): the preview
taps the output with one `AnalyserNode` per channel and the meter animates outside React in a rAF loop.

## Merging parts (`engine/merge.ts`, `audio/bounce.ts`)

Select two or more parts (see [multi-select](timeline.md#multi-select)) → **Merge** (`Ctrl J`, the toolbar
button or *Merge parts* in the inspector). Two cases:

| Case | When | What happens |
| --- | --- | --- |
| **Heal** (lossless) | All parts come from the same file and track, have the same settings (speed, pitch, volume, EQ, effects, stems, look…), sit edge to edge and continue each other in the source — i.e. they were split apart. Fades, volume keys and the outer transitions are kept | They become one clip again. Nothing is rendered |
| **Bounce** | Anything else — e.g. two cut parts of different songs, or non-adjacent parts | The parts are rendered into one new stereo WAV with speed, pitch, stems, EQ, effects, fades and volume curves baked in, then one clip of it replaces them |

Bounce layouts: **Back to back** closes the gaps (part 2 starts where part 1 ends, in timeline order);
**As placed** keeps the timing (gaps stay silent, overlaps play together). The master bus is *not* baked in
— it still applies when the merged file plays, so it isn't applied twice.

`bounceClips()` re-uses the normal mixer: it builds a temporary project with just those clips (unmuted,
shifted to 0), runs `scheduleMix` on a 48 kHz `OfflineAudioContext`, and encodes with `lib/wav.ts`
(16-bit PCM). The file is imported like any other — waveform, beat detection — and the replacement is one
undo step (undo brings the parts back; the merged file stays in the library).
