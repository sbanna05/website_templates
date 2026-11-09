import { useMemo } from 'react';
import { chordAt, chordName, camelotCode, clipKey, keyShort } from '../../engine/musicTheory';
import { timelineDownbeats } from '../../engine/sections';
import { clipEnd, timelineBeats } from '../../engine/timeline';
import { lastIndexAtOrBefore } from '../../lib/math';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { useHarmonyClip } from '../../hooks/useHarmonyClip';

/** DJ-deck style readout: bar.beat position, the chord playing now, and the key. */
export function DeckReadout() {
  const project = useEditor((s) => s.project);
  const assets = useEditor((s) => s.assets);
  const time = usePlayback((s) => s.time);
  const clip = useHarmonyClip();
  const bars = useMemo(() => timelineDownbeats(project, assets), [project, assets]);
  const beats = useMemo(() => timelineBeats(project, assets), [project, assets]);

  const asset = clip ? assets[clip.assetId] : undefined;
  const key = clip ? clipKey(clip, asset) : null;
  const inside = clip && time >= clip.start && time < clipEnd(clip);
  const chord = inside && asset?.harmony ? chordAt(asset.harmony.chords, clip.inPoint + (time - clip.start) * clip.speed) : undefined;

  const bar = lastIndexAtOrBefore(bars, time + 1e-4);
  let position = '—';
  if (bar >= 0) {
    const beatInBar = lastIndexAtOrBefore(beats, time + 1e-4) - lastIndexAtOrBefore(beats, bars[bar] + 1e-4) + 1;
    position = `${bar + 1}.${Math.max(1, Math.min(4, beatInBar))}`;
  }

  if (!clip && bars.length === 0) return null;
  return (
    <div className="deck" aria-label="Position, chord and key">
      <div className="deck__cell" title="Bar . beat">
        <span>Bar</span>
        <strong>{position}</strong>
      </div>
      <div className="deck__cell deck__cell--chord" title="Chord playing now">
        <span>Chord</span>
        <strong>{chord ? chordName(chord, clip?.pitch ?? 0) : '—'}</strong>
      </div>
      {key && (
        <div className="deck__cell" title={`Key — Camelot ${camelotCode(key)}`}>
          <span>Key</span>
          <strong>
            {keyShort(key)} <em>{camelotCode(key)}</em>
          </strong>
        </div>
      )}
    </div>
  );
}
