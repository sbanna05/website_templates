import { useMemo } from 'react';
import { beatStateAt } from '../../engine/beats';
import { timelineBeats } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';

/** A small light that pulses on every beat — instant feedback that sync is right. */
export function BeatIndicator() {
  const project = useEditor((s) => s.project);
  const assets = useEditor((s) => s.assets);
  const time = usePlayback((s) => s.time);
  const beats = useMemo(() => timelineBeats(project, assets), [project, assets]);
  const bpm = useMemo(() => {
    const source = project.clips.find((c) => c.kind === 'audio' && c.beatSource);
    const analysis = source && source.kind === 'audio' ? assets[source.assetId]?.beats : undefined;
    return analysis ? Math.round(analysis.bpm * (source?.kind === 'audio' ? source.speed : 1)) : null;
  }, [project.clips, assets]);
  const { pulse } = beatStateAt(beats, time);

  return (
    <div className="beat-indicator" title={`${beats.length} beats on the timeline`}>
      <span className="beat-indicator__light" style={{ opacity: 0.25 + pulse * 0.75, transform: `scale(${1 + pulse * 0.35})` }} />
      <span>{bpm ? `${bpm} BPM` : beats.length > 0 ? `${beats.length} beats` : 'No beats'}</span>
    </div>
  );
}
