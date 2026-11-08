# Export

`export/exportVideo.ts` renders the project to an MP4 **in the browser** (it is lazy-loaded the first time you
export, so it doesn't slow down startup).

## Steps

1. **Preparing** — wait for every font used by text clips (`document.fonts.load`) so text never renders in a fallback.
2. **Audio** — `collectMixSources` → `ensureMixBuffers` (time-stretch anything not cached yet) →
   `scheduleMix` on an `OfflineAudioContext(2 ch, 48 kHz)` → `startRendering()`. Same graph as the preview:
   effects, volume curves and crossfades included.
3. **Video** — for frame *i*: `time = i / fps`; `ExportFrames` supplies frame-accurate pixels for each visible
   video clip (one monotonic WebCodecs decode stream per clip, each packet decoded at most once);
   `renderFrame` draws into an offscreen canvas; the canvas goes to Mediabunny's `CanvasSource`.
4. **Encoding** — H.264 when available (falls back to HEVC/VP9/AV1), AAC audio (Opus if the browser can't
   encode AAC), interleaved in one-second windows.
5. **Finalizing** — the MP4 muxer writes the file; the dialog shows a preview and a download button.

## Settings

Resolution 720p / 1080p / 1440p on the short side, 24 / 30 / 60 fps, three quality levels (bitrate). The
output aspect matches the project (9:16, 16:9, 1:1, 4:5).

## Why it matches the preview

| | Preview | Export |
| --- | --- | --- |
| Frames | `PreviewFrames` — one muted `<video>` per clip, synced to the playhead | `ExportFrames` — WebCodecs, frame-exact |
| Drawing | `renderFrame` | `renderFrame` |
| Audio | `scheduleMix` on `AudioContext` | `scheduleMix` on `OfflineAudioContext` |
| Clock | audio context time | frame index ÷ fps |

Only the *frame source* differs, behind the `FrameSource` interface.

## Browser support

WebCodecs is required: Chrome/Edge 94+ (recommended), Safari 16.4+, Firefox 130+.
