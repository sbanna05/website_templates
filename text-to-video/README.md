# ArticVid: a beat-synced video editor in the browser

![React](https://img.shields.io/badge/React_19-10161b?style=for-the-badge&logo=react&logoColor=98bdd5)
![TypeScript](https://img.shields.io/badge/TypeScript_strict-10161b?style=for-the-badge&logo=typescript&logoColor=98bdd5)
![Vite](https://img.shields.io/badge/Vite-10161b?style=for-the-badge&logo=vite&logoColor=a3c8b4)
![GSAP](https://img.shields.io/badge/GSAP-10161b?style=for-the-badge&logo=greensock&logoColor=a3c8b4)
![WebCodecs](https://img.shields.io/badge/WebCodecs_MP4-10161b?style=for-the-badge&logoColor=98bdd5)

ArticVid is a short-form video editor in the spirit of CapCut and TikTok. You can build
MVM-style edits where cuts, zooms, flashes and words all land on the beat, mix songs like a producer or
DJ (main beat, AI stem splitting, EQ, master bus, cut and merge parts, slowed + reverb, volume curves) and
caption them automatically. Everything runs on
your device, from importing to the finished **MP4**. Nothing is uploaded.

📚 **How each part works:** see the [documentation](docs/README.md).

```bash
npm install        # run again whenever package.json changes (e.g. after pulling)
npm run dev        # http://localhost:5173
```

---

## Features

### Media and timeline

- **Import photos, videos and several music files**: drag them anywhere onto the app, or use the library.
  Clips land on the timeline automatically.
- **Multi-track timeline**: video/photo tracks (layered as overlays), text tracks and music tracks.
  You can add as many tracks as you like.
- **Drag to move** (including to another track of the same kind), **trim** with the edge handles,
  **split** (`S`), **duplicate**, **delete**, **undo/redo**. Slider drags count as a single undo step.
- **Snapping** to the playhead, other clip edges, **beat markers** and **marks**.
- **Marks** (`M`, or the flag next to Split): TikTok-style named points on the ruler. Click a flag to jump,
  drag it to move (it snaps to beats), right-click to delete. Rename and recolour them in the project panel.
- Timeline zoom with the slider, `+`/`−` or Ctrl/⌘ + scroll. The view follows the playhead during playback.
- Mute, hide, lock and rename tracks.
- **Multi-select**: Ctrl/⌘-click, Shift-click, box-select by dragging on empty lanes, or `Ctrl A`. Move,
  delete, duplicate or split a whole group at once, and edit volume, speed, fades, pitch, sound, EQ, stems,
  transitions, motion, beat FX or text style for all selected clips in one go.
- **Resizable workspace**: drag the edges between library, preview, inspector and timeline, the track-header
  column and each track's height. Hide/show the side panels from the top bar. Sizes are remembered.

### Beat sync (MVM editing)

- **Automatic BPM and beat-grid detection** for every music file. It runs in a Web Worker, using onset
  flux, autocorrelation tempo estimation and grid phase alignment.
- **Sync cuts / Sync text**: re-time every clip on the selected track (video *or* text) so each cut lands
  every 1, 2, 4 or 8 **beats**, or on your **marks** instead.
- **Beat match (auto beat merge)** for two or more songs with different tempos:
  - *Follow base*: pick the song that keeps its tempo; the others speed up or slow down to fit it.
  - *Meet halfway*: every song moves to a shared tempo in between.
  - *Custom BPM*: every song moves to a tempo you type.
  - Songs pair at the nearest octave (a 70 BPM song fits 140 BPM at its natural speed). Pitch, volume and
    fades are kept, downbeats can be aligned to the base grid, and cuts or text that sat on a beat move with
    that beat. A slowed-down song stops where the next song on its track begins. One undo restores everything.
- **Beat FX** on any visual clip: zoom pulse, flash, shake, blur pulse, exposure or tilt, with adjustable intensity.
- **Text synced to music**: reveal word by word on the beat; move with the beat (pulse, shake, bounce, flash,
  colour swap); or **lyric mode**, which splits a text into one clip per word or line, each starting on its
  own beat.
- **Tap tempo**: press `B` (or *Tap beat*) to add your own markers.
- **Beat-grid editing** like DJ software: lock a song to a steady grid, fine-tune the BPM, fix half/double
  tempo, set the downbeat at the playhead, tap the tempo, nudge the grid in 5 ms steps.
- A live beat light and BPM readout in the transport bar.

### Music production (main beat workflow)

- **Main beat**: one song (often an instrumental) drives the beat grid. The first song you add becomes the
  main beat (👑 on the timeline); *Make this the main beat* switches it. Later songs follow it.
- **Cut a part**: pick any part of a song on its full waveform, snapped to **bars** or beats (detected words
  show as dots, so you can see where the vocals are). *Place on main beat* re-times it to the main tempo and
  drops it on the next bar after the playhead, on a free track. *Trim to part* keeps just that part.
- **AI stem splitting**: split any song into **vocals, drums, bass and melody** (HTDemucs, on your device,
  GPU-accelerated). Then mute/solo/blend stems per clip (presets: Instrumental, Acapella, Beat only, No drums)
  or put each stem on its own track to cut and edit separately.
- **EQ** on every song and on the master: low cut, bass, movable mid and treble, with a live, draggable
  response curve and presets (Vocal clarity, Bass cut for DJ transitions, Telephone…).
- **Master bus**: master volume, master EQ, *glue* compression and a limiter, with a stereo level meter.
- **Merge parts**: join cut parts back into one clip (lossless when they were split from the same stretch),
  or render any parts into one new track, back to back or as placed.
- **Sound presets**: Slowed + reverb, Sped up, Lo-fi, Underwater, Concert hall, plus the raw controls:
  reverb, room size and muffle (low-pass).
- **Volume curve** (graph editor, like Blender keyframes): click to add points, drag them, double-click to
  delete; each point eases into the next as *smooth*, *linear* or *hold*. Points snap to beats and stay glued
  to the music when you trim or re-time. Presets: **Pump on beat** (sidechain), Build up, Dip middle.
- **Crossfades**: songs that overlap on the same track fade into each other (marked ✕ on the timeline).
  Toggle it in the project panel.

### Auto lyrics (speech to text)

- **Detect words** on any song or video with sound: Whisper runs in your browser (WebGPU when available,
  otherwise WebAssembly), finding every word and when it is sung. Nothing is uploaded; the model (≈65 MB
  *Fast* or ≈140 MB *Accurate*) downloads once and is cached.
- Turn them into captions on a new *Lyrics* track: **phrases**, **word by word** or **karaoke**, in any
  text style, optionally snapped to the beat. Words appear at the pace they are sung.

### Animated text

- Multiple independent text layers. Drag them directly on the preview, where they snap to the centre lines.
- **16 Google Fonts** across sans, display, serif, script and mono, shown in the font picker in their own typefaces.
- Fill, outline, shadow, TikTok-style **box/pill backgrounds**, letter spacing, line height, wrap width,
  alignment, uppercase and italic.
- **Entrance animations** per word, letter or line: fade, pop, typewriter, slide, blur-in, bounce, drop,
  rotate, stretch, glitch-in, slide left/right, flip, zoom out, spin, swing and **karaoke** highlight.
  Exits: fade, pop, slide, blur-out and shrink. Loops: wave, float, breathe, flicker, jitter and five beat loops.
- Stagger and duration controls, plus **GSAP easing curves** (overshoot, elastic, bounce, expo…).
- **8 presets** (Bold caption, MVM impact, Cinematic title, Karaoke, Typewriter, Comic, Handwritten, Glitch).

### Speed, pitch, zoom and look

- **Speed** from 0.1× to 4× for video and music. An animated **speedometer** shows the current speed, the
  timeline clips carry speed badges, and clip length rescales automatically.
- **Pitch** from −12 to +12 semitones, **independent of speed**. Time-stretching uses WSOLA via SoundTouch
  in a worker, so 2× doesn't sound like a chipmunk.
- **Zoom/scale, position, rotation and opacity**.
- **Crop & framing**: drag a crop box on the photo, resize from the corners, aspect presets (Free, Original,
  Frame, 1:1, 4:5, 9:16, 16:9), rule-of-thirds grid, flip horizontal/vertical, fill or show-all.
- **Motion** (14 camera moves): long and short zoom in/out, pan left/right/up/down, slide-turn left/right,
  swing, spiral, handheld and drift, with an amount up to **100%**.
- **Pace (velocity)**: linear, ease in, ease out, smooth, rush (fastest in the middle), hang (slow in the
  middle) or **on beat** (the move steps forward on every beat).
- **Transitions** in and out: fade, zoom punch, zoom out, slides (←→↑↓), slide-turn, squeeze ↔/↕, zoom spin,
  blur, flash, spin and whip pan.
- **Colour**: brightness, contrast, saturation, hue, **temperature, tint, fade**, blur, vignette, and 10
  filter presets (incl. Golden hour and Teal night).
- **Light effects** painted onto the photo or video itself: glow (bloom), lamp (spotlight), **eclipse**
  (dark disc with a glowing corona), sun flare, light leak and beam. Each has position, size, intensity,
  colour, angle and an optional pulse on the beat, and follows the image as it moves and zooms.
- Volume and fades per clip. Video clips keep their own audio, which can be pitched too.

### Preview and export

- A live canvas preview at the native aspect ratio: **9:16, 16:9, 1:1 or 4:5**.
- **MP4 export** at 720p, 1080p or 1440p and 24, 30 or 60 fps, at three quality levels, with an in-app
  preview and a download button.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` `→` | Step one frame (`Shift`: 1 s) |
| `S` | Split at the playhead |
| `B` | Tap a beat marker |
| `M` | Add a mark at the playhead |
| `T` | Add text at the playhead |
| `Ctrl A` | Select all clips |
| `Del` | Delete the selected clips |
| `Ctrl D` | Duplicate the selected clips |
| `Ctrl J` | Merge the selected parts |
| `Ctrl Z` / `Ctrl ⇧ Z` | Undo / redo |
| `+` / `−` | Zoom the timeline |

---

## Architecture

The core idea is **one deterministic renderer**. `renderFrame(ctx, options)` is a pure function of
*(project, time, frame source)* and draws onto a 2D canvas. The live preview and the MP4 exporter both call
it, so **what you see is exactly what you export**. Randomness is seeded and easing is pure (GSAP's
`parseEase`), so frame *n* always looks the same.

```
src/
├─ types/project.ts        Serializable data model (undoable, JSON-ready)
├─ config/                 Defaults/factories, fonts, presets, option lists, canvas sizes
├─ engine/                 Pure, framework-free rendering + timeline maths
│  ├─ renderFrame.ts       Draw a frame, return hitboxes for on-canvas selection
│  ├─ drawVisual.ts        Crop, fit, transitions, beat FX, filters, colour grading
│  ├─ motion.ts            Camera moves + pace (velocity) curves, incl. on-beat stepping
│  ├─ drawLights.ts        Strategy table for light effects (glow, lamp, eclipse, flare…)
│  ├─ beatMatch.ts         Tempo matching across songs (octave folding, phase align, edit remap)
│  ├─ sections.ts          Main beat, bar grids, placing a song part on the main beat
│  ├─ automation.ts        Volume keyframes, curve shapes, pump/build/dip presets
│  ├─ beatGrid.ts          Steady beat grids: BPM, downbeat, tap tempo
│  ├─ eq.ts                EQ bands, presets and the exact response curve (RBJ cookbook)
│  ├─ stems.ts             Stem mixer: solo/mute gains, presets
│  ├─ merge.ts             Heal split parts, back-to-back layout
│  ├─ captions.ts          Timed words → caption blocks (phrases, words, karaoke)
│  ├─ drawText.ts          Per-unit text animation + backgrounds
│  ├─ textLayout.ts        Word wrap and per-word/letter layout (cached)
│  ├─ textAnimations.ts    Strategy tables for in / out / loop animations
│  ├─ transitions.ts       Strategy table for transitions (out = reversed in)
│  ├─ beats.ts             Beat pulse envelope
│  └─ timeline.ts          Split, trim, speed, snapping, beat mapping, sync-to-beats
├─ audio/
│  ├─ beatDetect.ts        Tempo and beat-grid detection (pure, unit tested)
│  ├─ timeStretch.ts       Independent tempo/pitch via SoundTouch
│  ├─ dsp.worker.ts        Runs both off the main thread
│  ├─ audioBufferCache.ts  Cached speed/pitch-processed buffers
│  ├─ effects.ts           Reverb and low-pass chains + sound presets
│  ├─ eqChain.ts           EQ as BiquadFilterNodes
│  ├─ master.ts            Master bus: volume, EQ, glue compressor, limiter
│  ├─ mixer.ts             Schedules the mix (stem layers, automation, EQ, effects, crossfades) on any (Offline)AudioContext
│  ├─ bounce.ts            Renders parts into one WAV (merge)
│  └─ previewAudio.ts      Realtime playback, the preview's master clock, level meters
├─ lyrics/                 Whisper speech-to-text worker (transformers.js) + client
├─ stems/                  HTDemucs stem-separation worker (demucs-web + ONNX Runtime) + client
├─ media/                  File import, waveform peaks, live <video> frame source
├─ export/                 WebCodecs frame decoding + MP4 muxing (lazy-loaded)
├─ store/                  zustand: editor (with history), playback, lyrics and stem jobs, UI layout, toasts
├─ hooks/                  Lenis smooth scroll, keyboard shortcuts, element size
├─ components/             UI by area: library, preview, timeline, inspector, export, ui
└─ styles/                 Design tokens + per-area CSS
```

**How a frame is produced**

| | Preview | Export |
| --- | --- | --- |
| Video frames | One muted `<video>` per clip, kept in sync with the playhead | Mediabunny `CanvasSink.canvasesAtTimestamps`: frame-accurate, each packet decoded once |
| Audio | `scheduleMix` on the realtime `AudioContext` | `scheduleMix` on an `OfflineAudioContext` |
| Clock | Audio context time | Frame index ÷ fps |
| Output | Canvas on screen | Canvas → `CanvasSource` → H.264 (or HEVC/VP9/AV1) + AAC/Opus → MP4 |

### Principles applied

- **Single responsibility**: the engine knows nothing about React; components don't do maths; stores hold
  state only. Media handles (File, AudioBuffer, `<video>`) live in a registry outside the undoable store.
- **Open/closed**: animations, transitions, motions and beat FX are strategy tables. A new effect is one
  entry plus one option label, and the renderer doesn't change.
- **DRY**: one renderer and one mix scheduler for preview and export; one `TransformSection` and one
  `SpeedSection` shared by several inspectors; the transition table reused for in and out.
- **Dependency inversion**: the renderer depends on a `FrameSource` interface, not on how frames are decoded.
- **Performance**: rendering runs in a rAF loop outside React and only draws when something changed. DSP
  work runs in a worker. Layouts are cached. The playhead updates without re-rendering the timeline. The
  encoder bundle is code-split and only loads when you export.
- **Accessibility**: real buttons, radios, switches and labels, `aria-*` on custom controls, visible focus
  rings, keyboard shortcuts, and `prefers-reduced-motion` support (GSAP intro and Lenis are skipped).
- **Type safety**: `strict` TypeScript and discriminated unions for clips (`visual | audio | text`).

## Design system

The design system has a deep **ink / steel-blue / sage** palette, with low saturation so the media stays in
front (no neon). All values are tokens in `src/styles/tokens.css`:

- **Ink** `#070a0c → #f2f6f7`: blue-black neutrals for surfaces and text
- **Steel** `#24405a → #c5dbe8`: primary actions, video clips, focus
- **Sage** `#2c4d3e → #cfe3d8`: positive states, text clips, beat indicators
- **Tide** `#2f5a5c → #66a0a0`: audio

Depth comes from **glass panels** (`backdrop-filter: blur() saturate()`), layered outer shadows with an
inset top highlight, and **inset wells** for inputs, sliders and segmented controls.

## Libraries and credits

| Library | Used for |
| --- | --- |
| [GSAP](https://github.com/greensock/GSAP) | Easing curves inside the renderer (deterministic), panel and dialog animations |
| [Lenis](https://github.com/darkroomengineering/lenis) | Smooth inertial scrolling in the library and inspector panels |
| [React Bits](https://github.com/DavidHDev/react-bits) | Inspiration for `SpotlightCard` and `ShinyText` (re-implemented with CSS variables, no extra dependency) |
| [Mediabunny](https://mediabunny.dev) | WebCodecs decoding and MP4 muxing |
| [SoundTouchJS](https://github.com/cutterbl/SoundTouchJS) | Independent tempo and pitch (LGPL-2.1) |
| [Transformers.js](https://github.com/huggingface/transformers.js) | Whisper speech recognition in the browser (auto lyrics) |
| [demucs-web](https://github.com/timcsy/demucs-web) + [ONNX Runtime Web](https://onnxruntime.ai) | HTDemucs AI stem separation in the browser (MIT) |
| [zustand](https://github.com/pmndrs/zustand) | State management |

> The previous version of this template rendered with Remotion. It was replaced by a custom canvas engine
> so the app can export MP4 **in the browser without a render server**, and so photos, videos, music and
> text can all live on one free-form timeline.

## Scripts

```bash
npm run dev         # dev server
npm run build       # type-check + production build
npm run test        # unit tests (timeline, beat detection, beat match, sections, automation, captions, EQ, stems, beat grid, merge)
npm run lint        # ESLint
npm run typecheck   # tsc only
```

## Browser support

Editing works in all modern browsers. **MP4 export needs WebCodecs**: Chrome or Edge 94+ (recommended),
Safari 16.4+ or Firefox 130+. Auto lyrics and stem splitting work everywhere WebAssembly does and are much faster with
WebGPU (Chrome/Edge). For multi-threaded CPU inference, serve the app with
`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` (the dev and
preview servers already do). If the browser can't encode AAC, it uses Opus audio inside the MP4. Canvas
`filter` effects (colour, blur) need Chrome, Edge or Firefox; Safari renders them without the filter.

## Roadmap ideas

- Save projects to IndexedDB (including media) and re-open them
- Keyframes for position/scale and speed ramps (curves)
- True AI stem separation (vocals / drums / bass) in a worker
- Rendering in a worker with `OffscreenCanvas`
