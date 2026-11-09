# Architecture

## Layers

| Layer | Folder | Knows about | Never touches |
| --- | --- | --- | --- |
| Data model | `src/types/project.ts` | Plain serializable types | Anything runtime |
| Config | `src/config/` | Defaults, factories (`createAudioClip`…), option lists, presets, fonts | React, DOM |
| Engine | `src/engine/` | Pure maths: timeline, rendering, beats, beat grid, beat match, sections, automation, captions, EQ response, stem gains, merge | React, stores |
| Audio | `src/audio/` | Web Audio graphs, DSP (beat detection, time-stretch) in a worker | React |
| Lyrics | `src/lyrics/` | Whisper worker + client | React, project data |
| Persistence | `src/persistence/` | Save format, snapshot/restore, IndexedDB autosave, `.articvid` files | React |
| Stems | `src/stems/` | HTDemucs worker + client (AI source separation) | React, project data |
| Media | `src/media/` | Decoding files, waveform peaks, live `<video>` frames, the media registry | Undo history |
| Export | `src/export/` | WebCodecs decode/encode + MP4 mux (lazy-loaded) | React |
| State | `src/store/` | zustand stores that call the engine | Pixel/audio work |
| UI | `src/components/` | Reading stores, dispatching actions, layout | Maths beyond formatting |

Dependencies only point **downwards** in that table. The engine is framework-free and unit-tested in Node.

## The data model is plain data

`Project` (tracks, clips, markers, settings) contains only JSON-friendly values. Runtime handles —
`File`, `AudioBuffer`, `HTMLImageElement`, `<video>` — live in `media/mediaRegistry.ts`, keyed by
`Asset.id`. Because of that split:

- an undo snapshot is just the previous `Project` object (structural sharing keeps it cheap);
- the engine can be tested with hand-written objects;
- saving projects later is a `JSON.stringify` away (media aside).

`Asset` (in the store but outside the undo history) holds per-file analysis: duration, size, waveform peaks,
the detected **beat grid** (or a hand-locked steady grid), after auto lyrics the **timed words**, and after a
stem split the ids of its **stems** (stem assets point back with `stemOf`).

## Stores

| Store | File | Holds |
| --- | --- | --- |
| Editor | `store/editorStore.ts` | `project`, `assets`, multi-selection (`selectedClipIds`, `masterSelected`), undo/redo history and every editing action (batch edits, merge, extract stems, beat grid, master) |
| Playback | `store/playbackStore.ts` | Playhead time, playing flag; owns `PreviewAudio` and re-schedules audio after edits |
| Lyrics | `store/lyricsStore.ts` | Progress of running word-detection jobs (kept out of undo history) |
| Stems | `store/stemsStore.ts` | Progress of a running stem split; creates the stem assets when done |
| UI | `store/uiStore.ts` | Panel tabs, timeline zoom, resizable panel sizes (persisted), track heights |
| Save | `store/saveStore.ts` | Autosave status, the project file being edited, Save / Open / New |
| Toasts | `store/toastStore.ts` | Notifications |

### Undo / redo

Every change goes through `commit(recipe, coalesceKey?)`. The recipe returns a new `Project`; the old one is
pushed onto `past` (max 100). When two commits share a `coalesceKey` within 700 ms they merge into **one**
undo step — that's how a slider drag, a clip drag or a volume-curve point drag becomes a single undo.
`useClipPatch(clip)` gives inspector panels a typed `patch(partial, key)` helper built on this.

## Workers

| Worker | Does | Why |
| --- | --- | --- |
| `audio/dsp.worker.ts` | Beat detection, SoundTouch time-stretch/pitch | Seconds of CPU work per song; the UI must stay smooth |
| `lyrics/lyrics.worker.ts` | Whisper speech recognition (ONNX Runtime, WebGPU or WASM) | Large model, heavy inference |
| `stems/stems.worker.ts` | HTDemucs stem separation (ONNX Runtime, WebGPU or WASM) | Minutes of inference; can be cancelled by terminating the worker |

All are wrapped in promise-based clients (`dspClient.ts`, `lyricsClient.ts`, `stemsClient.ts`) so callers just `await`.
Big arrays are **transferred**, not copied.

## Principles applied

- **Single responsibility** — e.g. `engine/captions.ts` only groups words; `lyricsStore` only orchestrates;
  `LyricsSection` only renders and dispatches.
- **Open/closed** — motions, transitions, text animations, beat FX, light painters and sound presets are
  *strategy tables*. Adding one is a new entry, not a new `if` (see [extending](extending.md)).
- **DRY** — one renderer and one mix scheduler serve preview *and* export; `withSpeed` is the single way to
  change a clip's speed; `octaveTarget` is shared by beat match and section placement.
- **Dependency inversion** — the renderer depends on the `FrameSource` interface; preview (`PreviewFrames`)
  and export (`ExportFrames`) implement it differently.
- **Determinism** — easing via GSAP's pure `parseEase`, seeded randomness (including the reverb impulse
  response), no `Date.now()` in rendering: frame *n* always looks and sounds the same.
- **Type safety** — `strict` TypeScript; clips are a discriminated union (`visual | audio | text`).
