# UI & design system

## Layout

```
┌ TopBar: ArticVid · project name · aspect · ◧ ◨ panel toggles · Export ───────┐
│ Library (Media / Music / Text) ┃ Preview + transport ┃ Inspector            │
├━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┤
│ toolbar (undo, split, mark, merge, sync, add track, zoom) · ruler + marks    │
│ track headers ┃ lanes (each track's bottom edge is draggable)                │
│ Master ▮▮ meter                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

The inspector shows the selected clip's panels, batch controls when several clips are selected, the master
bus when the Master row is clicked, or project settings when nothing is selected.

## Resizable layout

Every ┃ / ━ above is a drag handle (`components/ui/Splitter.tsx`, a WAI-ARIA *window splitter*):

| Handle | Resizes | Range |
| --- | --- | --- |
| Library ┃ Preview | Library width | 220–520 px |
| Preview ┃ Inspector | Inspector width | 280–600 px |
| Above the timeline | Timeline height | 170–680 px |
| Right edge of the track-header column | Header width | 128–320 px |
| Bottom edge of a track header | That track's height (waveforms and stem lanes scale) | 34–220 px |

Drag with the mouse/touch, or focus a handle and use the arrow keys (Shift = bigger steps), Home/End for the
limits, Enter or double-click to reset. The cursor stays a resize cursor while dragging. Panel sizes and the
show/hide state of the side panels are remembered in `localStorage` (per browser; track heights are per
session). Side panels are capped at 28 % / 34 % of the window so the preview never gets squeezed, and below
980 px the layout stacks and the handles hide.

## Inspector panels

| Selection | Panels |
| --- | --- |
| Photo / video | Crop & framing, Transform, Motion (+ pace), Beat effects, Transitions, Color & filters, Lights, Speed, Clip audio, **Auto lyrics** (if it has sound) |
| Music | Speed (with speedometer), Pitch, Volume & fades, **Stems**, **EQ**, Sound, Volume curve, **Beat grid** (main beat, BPM, downbeat, tap, nudge), Cut a part, Beat match, Auto lyrics |
| Several clips | Summary + duplicate/delete, **Merge parts**, Arrange, batch Volume & speed, Music, Video & photos, Text |
| Master row | Output (volume, meter, limiter), Glue, Master EQ |
| Text | Content, Font & style, Animation, Text & music (reveal on beat, beat loops, lyric mode), Transform |
| Nothing | Canvas, Beat grid (snap, **crossfade**), Marks, Beat match, Keyboard shortcuts |

Every panel is a collapsible `Section` and edits through `useClipPatch`, so slider and point drags are a
single undo step.

## Timeline cues

| Cue | Meaning |
| --- | --- |
| 👑 badge | Main beat — the grid follows this song |
| ✦ badge | The song has sound effects |
| EQ badge | The song has EQ |
| ◈ badge + four stacked lanes | The clip plays a stem mix (dimmed lanes are muted stems) |
| sage outline | Part of a multi-selection |
| ⚡ ×1.2 badge | Speed; ♯/♭ = pitch |
| white line over a song | Its volume curve |
| ✕ zone between songs | Crossfade |
| flags on the ruler | Marks |
| thin vertical lines | Beats |

## Controls

`Slider` (double-click the label to reset), `Segmented`, `Select`, `Toggle` (a real `role="switch"`),
`Button`/`IconButton`, `ColorField`, chips for presets. Custom widgets — crop box, section cutter, curve
editor — have ARIA roles and labels, and the curve editor supports **Delete** on the selected point. EQ handles are keyboard sliders, the stem mixer has real
`aria-pressed` mute/solo buttons, and the level meter is an `img` with a label.

## Design system

Tokens live in `src/styles/tokens.css`: a deep **ink / steel-blue / sage / tide** palette, deliberately low
in saturation (no neon) so media stays the hero. Depth comes from glass panels (`backdrop-filter`), layered
outer shadows with an inset top highlight, and inset wells for inputs. New UI reuses those tokens:

- the section cutter: tide waveform on a dark well, sage selection;
- the curve editor: steel line and fill, sage for the selected point; point shape shows the curve type
  (round = smooth, diamond = linear, square = hold);
- word chips: sage tints.

Motion respects `prefers-reduced-motion` (GSAP intro, Lenis and the indeterminate progress bar are calmed).

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` `→` | Step one frame (`Shift`: 1 s) |
| `S` | Split at the playhead |
| `B` | Tap a beat |
| `M` | Add a mark |
| `T` | Add text |
| Click / `Ctrl`-click / `Shift`-click | Select one / toggle / add clips |
| Drag on empty lanes | Box-select |
| `Ctrl A` | Select all clips |
| `Del` | Delete the selected clips (or curve point, inside the curve editor) |
| `Ctrl D` | Duplicate the selected clips |
| `Ctrl J` | Merge (join) the selected parts |
| `Ctrl Z` / `Ctrl ⇧ Z` | Undo / redo |
| `+` / `−` | Zoom the timeline |
