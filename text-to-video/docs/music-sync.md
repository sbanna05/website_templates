# Music sync

How ArticVid makes cuts, text and several songs agree on one beat — the way music-video editors and
producers work.

## Beat detection

`audio/beatDetect.ts` (runs in the DSP worker, unit-tested):

1. **Onset envelope** — short-time log-energy flux, half-wave rectified and weighted towards low frequencies,
   so kicks dominate.
2. **Tempo** — autocorrelation of the envelope, weighted towards a perceptually comfortable range; the
   strongest lag is the beat period → `bpm`.
3. **Phase** — slide a comb with that period across the envelope; the offset that collects the most onset
   energy is where the beats are. Walk back so a downbeat near 0 s isn't lost.
4. Output: `{ bpm, beats[] (steady grid, source seconds), onsets[] (raw transients) }` stored on the asset.

`AudioClip.beatOffset` nudges the grid by ±0.5 s if detection is slightly early/late.

## The beat grid

`timelineBeats(project, assets)` = tapped beats (`B`) + the grid of every unmuted music clip with
`beatSource` on, mapped to timeline time. Snapping, beat FX, beat-revealed text, sync cuts and the beat light
all read this list.

## Editing the beat grid

Detection can be off by a little (a wobbling grid), by half or double (70 vs 140 BPM), or start bar 1 on the
wrong beat. *Audio inspector → Beat grid* fixes that the way DJ software does — by locking the song to a
**steady grid** (`engine/beatGrid.ts`):

| Control | What it does |
| --- | --- |
| BPM field, −/+ 0.1 | Sets the song's exact tempo |
| ½× / 2× | Fixes half/double-tempo detection |
| **Downbeat at playhead** | Bar 1 starts here: put the playhead on a kick at the start of a bar. Snaps to a detected beat within 80 ms |
| **Tap tempo** | Tap along 4+ times; the average interval (pauses > 2 s restart the count) becomes the tempo |
| Nudge ◀ ▶ / Grid offset | Shifts this clip's grid by 5 ms steps (±500 ms) until the lines sit on the transients |
| Back to detected beats | Restores the detector's grid |

A steady grid is `{ bpm, anchor }` where `anchor` is a downbeat in source seconds. `steadyBeats()` lays
beats every `60 / bpm` s across the file and records `firstBar` — which beat index starts a bar — so
`sourceBars()` (section cutter, placing parts on the main beat) counts bars from the real downbeat. The
detector's result is kept in `beats.detected`. Grid edits belong to the *song* (asset), apply to all its
clips and stems, and are not part of undo.

## Main beat

Producers build on one **main beat** — often an instrumental or "type beat" — and fit everything else to it.

- The **first song** added becomes the main beat (`beatSource: true`, 👑 badge); songs added later start
  with `beatSource: false`, so two tempos never mix into one messy grid.
- *Make this the main beat* (Audio inspector → Beat grid) calls `setMainBeat(clipId)`: that clip drives the
  grid, every other song stops driving it.
- `engine/sections.ts → mainBeatClip()` finds it (the earliest unmuted beat source with a detected grid).

## Cutting a part onto the main beat

*Audio inspector → Cut a part* shows the **whole song**, not just the clip:

- ticks = **bars** (every 4th beat; taller every 4 bars = a phrase), dots = detected words (after auto lyrics),
  dashed box = what the clip plays now;
- drag to select a part, drag its edges to adjust; selections snap to **bars**, **beats** or nothing.

**Place on main beat** → `placeSection()`:

```
speed  = octaveTarget(songBpm, mainBpm) / songBpm        // match tempo at the nearest octave, pitch unchanged
start  = first bar line of the main beat at or after the playhead (bars are extrapolated past its end)
inPoint = part.from ; duration = (part.to − part.from) / speed
```

Pitch, effects and the volume keys that fall inside the part carry over; the new clip never drives the grid.
It goes on the first audio track that is free for its whole length, or a new *Vocals* track. Because the
part starts on one of its own beats and lands on a main-beat bar at the same tempo, the two play **on the
same beat**. Add *Slowed + reverb* or a *Pump on beat* curve to taste.

**Trim to part** instead keeps the clip where it is and only changes which part of the song it plays.

## Sync cuts / Sync text

`syncTrackToBeats(project, assets, trackId, points, n)` walks the clips on a track in order and gives each
exactly `n` beats (or marks): `start = points[i]`, `duration = points[i+n] − points[i]`, clamped to what the
media has. Works for video *and* text tracks.

**Lyric mode** (`splitTextToBeats`) splits one text clip into one clip per word or line, each starting on
its own beat.

## Beat match (several songs, different tempos)

`engine/beatMatch.ts → matchBeats(project, assets, options)`:

1. **Target tempo** — *follow base*: the base song's played BPM; *meet halfway*: the geometric mean of all
   tempos after folding each into the base's octave; *custom*: what you type.
2. **Octave folding** — `octaveTarget(bpm, target)` picks target × ½, 1 or 2, whichever is closest in log
   space, so a 70 BPM ballad pairs with 140 BPM at its natural speed.
3. **Re-time** each other song with `withSpeed` (pitch preserved).
4. **Align phase** (optional) — shift each song so its first beat lands on the base grid.
5. **Avoid overlaps** — a slowed song is trimmed to end where the next song on its track begins.
6. **Keep edits on the beat** (optional) — any clip edge within 45 ms of a song beat is moved to where that
   same beat is after re-timing.

The panel shows a dry run of exactly what *Match* will do; one undo restores everything.

## Text and music

- *Reveal on beat* — each word/letter/line appears on the next beat.
- Beat loops — pulse, shake, bounce, flash, colour swap.
- [Auto lyrics](lyrics.md) — captions timed to the actual sung words, optionally snapped to the beat.
