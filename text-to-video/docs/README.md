# ArticVid documentation

ArticVid is an in-browser, beat-synced video editor. This folder explains **how each part works**: what it
does for the person editing, which files implement it, and the maths or audio graph behind it.

| Read this… | …to understand |
| --- | --- |
| [Architecture](architecture.md) | The layers, the data flow, stores, undo/redo, workers and the rules the code follows |
| [Timeline & data model](timeline.md) | Projects, tracks, clips, the time-mapping formulas, editing, multi-select, snapping and marks |
| [Rendering](rendering.md) | How one frame is drawn: visuals, crop, motion and pace, transitions, beat FX, lights, text |
| [Audio engine](audio.md) | Import and decoding, speed/pitch, the mixer graph, sound effects, volume curves, crossfades |
| [Stems](stems.md) | AI separation into vocals / drums / bass / melody, the stem mixer, putting stems on tracks |
| [Mixing](mixing.md) | The EQ (and the maths behind its curve), the master bus (glue, limiter, meters), merging parts |
| [Music sync](music-sync.md) | Beat detection, editing the beat grid (BPM, downbeat, tap tempo), sync cuts, beat match, the main beat and song parts |
| [Auto lyrics](lyrics.md) | Speech-to-text with Whisper in the browser and turning words into captions |
| [Export](export.md) | How the MP4 is rendered, encoded and muxed without a server |
| [UI & design system](ui.md) | Resizable layout, inspector panels, controls, tokens, accessibility and shortcuts |
| [Extending ArticVid](extending.md) | Step-by-step recipes: add a motion, transition, sound preset, text animation, light… |

## The mental model in 30 seconds

```
 files ──► media/ (decode, waveform, beats) ──► store/ (Project = plain data, undoable)
                                                     │
                     ┌───────────────────────────────┴───────────────────────────────┐
                     ▼                                                               ▼
        engine/renderFrame (pure)                                     audio/mixer.scheduleMix
        canvas pixels for time t                                      Web Audio graph for [t0, t1]
                     │                                                               │
        ┌────────────┴────────────┐                                  ┌───────────────┴──────────────┐
        ▼                         ▼                                  ▼                              ▼
   preview canvas           export canvas                    realtime AudioContext        OfflineAudioContext
   (rAF loop)               (frame i / fps)                  (preview clock)              (export mix)
```

Two functions produce everything you see and hear: `renderFrame` and `scheduleMix`. The live preview and
the exported MP4 call the same two, so **the export always matches the preview**.

## Quick start

```bash
npm install        # again whenever package.json changes (e.g. after pulling)
npm run dev        # http://localhost:5173
npm run test       # unit tests for the pure engine
```
