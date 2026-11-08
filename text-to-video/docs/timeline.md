# Timeline & data model

## Tracks and clips

A project has an ordered list of **tracks** (`visual`, `text`, `audio`); the first track in the list is the
top layer. Each **clip** belongs to one track (`clip.trackId`) and has a `start` and `duration` in
**timeline seconds**. A clip only goes on a track of its own kind (`acceptsClip`).

| Clip | Extra fields |
| --- | --- |
| `VisualClip` (photo/video) | `assetId`, `inPoint`, `speed`, `volume`, `pitch`, crop/flip, transform, motion + pace, filters, lights, transitions, beat FX |
| `AudioClip` (music) | `assetId`, `inPoint`, `speed`, `pitch`, `volume`, fades, `beatSource`, `beatOffset`, `effects`, `volumeKeys` |
| `TextClip` | `text`, style, animation, transform |

## The time-mapping formulas

Everything that touches media uses the same two conversions (`engine/timeline.ts`):

```
source time  = inPoint + (timelineTime − start) × speed          // what part of the file plays now
timeline time = start + (sourceTime − inPoint) / speed            // where a file moment lands on the timeline
duration on timeline = length in source / speed
```

Beats, detected words and volume keyframes are all stored in **source seconds** and mapped with the second
formula. That is why they stay attached to the music when you trim, move or re-time a clip.

`withSpeed(clip, speed, asset)` is the one way to change speed: it rescales `duration` so the same source
range keeps playing, clamped to what the file has left.

## Editing operations

| Operation | Function | Notes |
| --- | --- | --- |
| Split | `splitClip(clip, t)` | Second half gets `inPoint` advanced by `(t − start) × speed` |
| Trim start / end | `trimStart`, `trimEnd` | Keep media in range; images can stretch freely |
| Move | `ClipItem` drag | Can change to another compatible track |
| Snap | `snapValue(value, candidates, threshold)` | Candidates: 0, playhead, other clip edges, marks, beats (if snap is on). Threshold is 8 px converted to seconds |
| Sync to beats | `syncTrackToBeats` | Re-sequences a whole track so every cut lands every *n* beats (or marks) |

## Multi-select

| Gesture | Effect |
| --- | --- |
| Click | Select one clip |
| Ctrl/⌘-click | Toggle a clip in the selection |
| Shift-click | Add a clip |
| Drag on empty lane space | Box-select every clip the box touches (Shift/Ctrl adds to the selection) |
| `Ctrl A` / `Esc` | Select all clips on unlocked tracks / clear |

The editor store keeps `selectedClipIds` (in pick order) plus the last-picked `selectedClipId`; undo,
delete and asset removal prune ids that no longer exist. With several clips selected:

- dragging any of them moves **the whole group** by the same amount (the grabbed clip snaps; the group never
  goes past 0 s), as one undo step via `updateClips`;
- Delete, `Ctrl D` (the copy keeps the group's layout and lands right after it) and `S` (split every selected
  clip at the playhead) act on all of them;
- the inspector shows **batch editing**: volume, speed, fades, pitch, sound/EQ/stem presets, transitions,
  motion, beat FX and text colour/animation, each applied to every selected clip of the matching kind (a
  `· mixed` label shows when they currently differ), plus *Move group to playhead*;
- **Merge** joins the parts — see [mixing](mixing.md#merging-parts-enginemergets-audiobouncets).

## Overlapping clips

Visual and text clips that overlap are layered by track order. **Music** clips that overlap on the *same*
track are **crossfaded** when *Crossfade overlapping songs* is on (default): the earlier song's fade-out and
the later song's fade-in stretch over the overlap. The timeline draws the overlap as an ✕ zone. See
[audio](audio.md#crossfades).

## Marks

`project.markers` are named, coloured time points (`M` key or the flag button). They are snap targets and an
alternative cut source for *Sync cuts* (Beats/Marks toggle). Click a flag to seek, drag it to move, right-click
to delete; rename/recolour them in the project panel.
