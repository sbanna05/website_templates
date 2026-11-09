import { useRef, useState } from 'react';
import { BPM_RANGE, currentGrid, downbeatAt, tapTempo } from '../../engine/beatGrid';
import { mainBeatClip } from '../../engine/sections';
import { clamp } from '../../lib/math';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { toast } from '../../store/toastStore';
import type { AudioClip } from '../../types/project';
import { Button, IconButton } from '../ui/Button';
import { Section } from '../ui/Section';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import { useClipPatch } from './useClipPatch';

const NUDGE = 0.005;
/** Taps further apart than this start a new count. */
const TAP_RESET = 2;

/**
 * Beat grid, DJ-software style: see what was detected, then lock the song to a
 * steady tempo, fine-tune the BPM, set where bar 1 starts and nudge the grid
 * until the lines sit on the kick drum.
 */
export function BeatGridSection({ clip }: { clip: AudioClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const isMainBeat = useEditor((s) => mainBeatClip(s.project, s.assets)?.id === clip.id);
  const { setMainBeat, setBeatGrid } = useEditor.getState();
  const patch = useClipPatch(clip);
  const taps = useRef<number[]>([]);
  const [tapped, setTapped] = useState<number | null>(null);

  const beats = asset?.beats;
  const bpm = beats?.bpm ?? 0;
  const grid = beats ? currentGrid(beats) : null;
  const locked = Boolean(beats?.grid);

  const setBpm = (next: number) => {
    if (!grid) return;
    setBeatGrid(clip.assetId, { ...grid, bpm: Number(clamp(next, BPM_RANGE.min, BPM_RANGE.max).toFixed(2)) });
  };

  const downbeatHere = () => {
    if (!beats) return;
    const time = usePlayback.getState().time;
    const source = clip.inPoint + (time - clip.start) * clip.speed - clip.beatOffset;
    if (time < clip.start || source < 0 || source > (asset?.duration ?? 0)) {
      toast('Move the playhead over this song first — onto a kick or the start of a bar', 'error');
      return;
    }
    setBeatGrid(clip.assetId, downbeatAt(beats, source));
    toast('Bar 1 now starts at the playhead', 'success');
  };

  const tap = () => {
    const now = performance.now() / 1000;
    if (taps.current.length && now - taps.current[taps.current.length - 1] > TAP_RESET) taps.current = [];
    taps.current.push(now);
    const value = tapTempo(taps.current);
    setTapped(value);
    if (value && grid) setBeatGrid(clip.assetId, { ...grid, bpm: value / clip.speed });
  };

  return (
    <Section title="Beat grid" icon="beat">
      {isMainBeat ? (
        <p className="main-beat-note">
          <span className="tag tag--positive">Main beat</span> The grid, snapping and beat effects follow this song.
        </p>
      ) : (
        <Button icon="crown" disabled={!bpm} onClick={() => setMainBeat(clip.id)} title="Only this song drives the beat grid; other songs follow it">
          Make this the main beat
        </Button>
      )}

      <div className="stat-row">
        <div className="stat">
          <strong>{bpm ? (bpm * clip.speed).toFixed(bpm * clip.speed < 100 ? 1 : 0) : '—'}</strong>
          <span>BPM {clip.speed !== 1 && bpm ? `(orig. ${bpm.toFixed(1)})` : ''}</span>
        </div>
        <div className="stat">
          <strong>{beats?.beats.length ?? '—'}</strong>
          <span>{locked ? 'beats · your grid' : beats?.steady ? `beats · locked grid${beats.confidence ? ` · ${Math.round(beats.confidence * 100)}%` : ''}` : 'beats · follows the band'}</span>
        </div>
      </div>

      {grid && (
        <>
          <div className="bpm-editor" role="group" aria-label="Tempo">
            <IconButton icon="minus" label="−0.1 BPM" size={14} onClick={() => setBpm(grid.bpm - 0.1)} />
            <label className="bpm-editor__field">
              <span className="sr-only">Song tempo in BPM</span>
              <input
                type="number"
                inputMode="decimal"
                min={BPM_RANGE.min}
                max={BPM_RANGE.max}
                step={0.01}
                value={grid.bpm}
                onChange={(e) => Number(e.target.value) > 0 && setBpm(Number(e.target.value))}
              />
              <span aria-hidden="true">BPM</span>
            </label>
            <IconButton icon="plus" label="+0.1 BPM" size={14} onClick={() => setBpm(grid.bpm + 0.1)} />
            <button type="button" className="chip" title="Half tempo — the detector counted double" onClick={() => setBpm(grid.bpm / 2)}>
              ½×
            </button>
            <button type="button" className="chip" title="Double tempo — the detector counted half" onClick={() => setBpm(grid.bpm * 2)}>
              2×
            </button>
          </div>

          <div className="button-row">
            <Button size="sm" icon="flag" onClick={downbeatHere} title="Bar 1 starts at the playhead (snaps to the nearest detected beat)">
              Downbeat at playhead
            </Button>
            <Button size="sm" icon="beat" onClick={tap} title="Tap along with the beat, 4 times or more">
              {tapped ? `Tap · ${tapped}` : 'Tap tempo'}
            </Button>
          </div>
        </>
      )}

      <div className="nudge" role="group" aria-label="Nudge grid">
        <IconButton icon="skip-back" label="Nudge grid earlier (5 ms)" size={14} onClick={() => patch((c) => ({ beatOffset: clamp(c.beatOffset - NUDGE, -0.5, 0.5) }))} />
        <Slider
          label="Grid offset"
          value={clip.beatOffset}
          min={-0.5}
          max={0.5}
          step={0.005}
          defaultValue={0}
          format={(v) => `${v >= 0 ? '+' : ''}${Math.round(v * 1000)} ms`}
          onChange={(beatOffset) => patch({ beatOffset }, 'beatOffset')}
        />
        <IconButton icon="skip-forward" label="Nudge grid later (5 ms)" size={14} onClick={() => patch((c) => ({ beatOffset: clamp(c.beatOffset + NUDGE, -0.5, 0.5) }))} />
      </div>

      <Toggle
        label="Drive beat sync"
        hint="Beat effects, snapping and on-beat text follow this track"
        checked={clip.beatSource}
        onChange={(beatSource) => patch({ beatSource })}
      />

      {locked ? (
        <Button size="sm" variant="ghost" icon="undo" onClick={() => setBeatGrid(clip.assetId, null)}>
          Back to detected beats
        </Button>
      ) : (
        grid && (
          <p className="panel-note">
            Changing the tempo or downbeat locks the song to a steady grid (also for its stems). Tempo edits are per song and
            aren’t part of undo — use “Back to detected beats” to return.
          </p>
        )
      )}
    </Section>
  );
}
