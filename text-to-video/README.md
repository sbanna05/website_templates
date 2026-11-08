# Cadence Studio: a beat-synced video editor in the browser

![React](https://img.shields.io/badge/React_19-10161b?style=for-the-badge&logo=react&logoColor=98bdd5)
![TypeScript](https://img.shields.io/badge/TypeScript_strict-10161b?style=for-the-badge&logo=typescript&logoColor=98bdd5)
![Vite](https://img.shields.io/badge/Vite-10161b?style=for-the-badge&logo=vite&logoColor=a3c8b4)
![GSAP](https://img.shields.io/badge/GSAP-10161b?style=for-the-badge&logo=greensock&logoColor=a3c8b4)
![WebCodecs](https://img.shields.io/badge/WebCodecs_MP4-10161b?style=for-the-badge&logoColor=98bdd5)

Cadence Studio is a short-form video editor in the spirit of CapCut and TikTok. You can build
MVM-style edits where cuts, zooms, flashes and words all land on the beat. Everything runs on your
device, from importing to the finished **MP4**. Nothing is uploaded.

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
- **Tap tempo**: press `B` (or *Tap beat*) to add your own markers. A grid offset nudges detection.
- A live beat light and BPM readout in the transport bar.

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
| `Del` | Delete the selected clip |
| `Ctrl D` | Duplicate |
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
│  ├─ mixer.ts             Schedules the mix on any (Offline)AudioContext
│  └─ previewAudio.ts      Realtime playback, the preview's master clock
├─ media/                  File import, waveform peaks, live <video> frame source
├─ export/                 WebCodecs frame decoding + MP4 muxing (lazy-loaded)
├─ store/                  zustand: editor (with history), playback, UI, toasts
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
| [zustand](https://github.com/pmndrs/zustand) | State management |

> The previous version of this template rendered with Remotion. It was replaced by a custom canvas engine
> so the app can export MP4 **in the browser without a render server**, and so photos, videos, music and
> text can all live on one free-form timeline.

## Scripts

```bash
npm run dev         # dev server
npm run build       # type-check + production build
npm run test        # unit tests (timeline maths, beat detection)
npm run lint        # ESLint
npm run typecheck   # tsc only
```

## Browser support

Editing works in all modern browsers. **MP4 export needs WebCodecs**: Chrome or Edge 94+ (recommended),
Safari 16.4+ or Firefox 130+. If the browser can't encode AAC, it uses Opus audio inside the MP4. Canvas
`filter` effects (colour, blur) need Chrome, Edge or Firefox; Safari renders them without the filter.

## Roadmap ideas
- Save projects to IndexedDB (including media) and re-open them
- Keyframes and speed ramps (curves)
- Auto-captions from speech
- Rendering in a worker with `OffscreenCanvas`
