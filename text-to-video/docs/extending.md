# Extending ArticVid

Most features are **strategy tables**: add an entry, and the renderer, mixer and UI pick it up. Pure engine
code gets a unit test next to it (`*.test.ts`, run with `npm run test`).

## Add a camera motion

1. `types/project.ts` — add the name to `MotionType`.
2. `engine/motion.ts` — add `MOTIONS['my-move'] = (m, amount, w, h, time) => ({ scale, dx, dy, rotation })`,
   where `m` is the paced progress 0→1.
3. `config/options.ts` — add `{ value, label, group, glyph }` to `MOTION_OPTIONS`.

Pace curves, the amount slider and export work automatically.

## Add a transition

1. `TransitionType` in `types/project.ts`.
2. `engine/transitions.ts` — `TRANSITIONS['my-transition'] = (p, w, h) => pose` for *entering* (p: 0→1).
   The out-transition is the same function reversed.
3. `TRANSITION_OPTIONS` in `config/options.ts`.

## Add a text animation

`TextInAnimation` / `TextOutAnimation` / `TextLoopAnimation` in the types, an entry in `IN_ANIMATIONS` / `OUT_ANIMATIONS` /
`LOOP_ANIMATIONS` in `engine/textAnimations.ts`, and an option label. Loops get the beat state, so beat-driven loops are easy.

## Add a light effect

`LightType` in the types, a preset in `createLight` (`config/defaults.ts`), a painter in `PAINTERS`
(`engine/drawLights.ts`), and an entry in `LIGHT_OPTIONS`.

## Add a sound preset

Append to `SOUND_PRESETS` in `audio/effects.ts`:

```ts
{ id: 'radio', name: 'Radio', hint: 'Thin and boxy', effects: { reverb: 0.1, roomSize: 0.2, lowpass: 0.55, vocals: 'normal' } }
```

Add `speed`/`pitch` if the preset should re-time the clip. The *Sound* panel lists it automatically.

## Add an EQ preset

Append `{ id, name, hint, eq: { lowCut, low, mid, midFreq, high } }` to `EQ_PRESETS` in `engine/eq.ts`. Clip,
master and batch EQ chips pick it up.

## Add a stem preset

Append `{ id, name, hint, keep: ['vocals', 'bass'] }` to `STEM_PRESETS` in `engine/stems.ts` — `keep` lists
the stems that stay audible.

## Add an audio effect

1. Add the field to `AudioEffects` and `DRY_EFFECTS` (`config/defaults.ts`).
2. Wire it in `connectEffects` (`audio/effects.ts`) and update `isDry`.
3. Add a control to `SoundSection.tsx`.

Preview and export share `scheduleMix`, so nothing else changes.

## Add a volume-curve preset

Write a pure function `(range: KeyPresetRange) => VolumeKey[]` in `engine/automation.ts` (use `createKey`),
test it, and add a chip in `VolumeCurveEditor.tsx`.

## Add a caption mode or language

- Modes: extend `CaptionMode` and `group()` in `engine/captions.ts`, then `CAPTION_MODES` in `LyricsSection.tsx`.
- Languages: add `{ label, value: '<ISO code>' }` to `LANGUAGES` in `LyricsSection.tsx` (any Whisper language).
- Models: add an entry to `LYRIC_MODELS` in `lyrics/protocol.ts` — it must be a `_timestamped` export to
  return word timings.

## Checklist before a PR

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
