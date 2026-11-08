import { memo, useRef, type CSSProperties, type PointerEvent } from 'react';
import { clipEnd, snapValue, trimEnd, trimStart, type TrimResult } from '../../engine/timeline';
import { formatSpeed } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import type { Asset, Clip, Track } from '../../types/project';
import { Icon } from '../ui/Icon';
import { SNAP_PX, acceptsClip } from './constants';
import { Waveform } from './Waveform';

type Mode = 'move' | 'trim-start' | 'trim-end';

interface ClipItemProps {
  clip: Clip;
  asset?: Asset;
  track: Track;
  selected: boolean;
  pxPerSecond: number;
  beats: readonly number[];
}

interface Drag {
  mode: Mode;
  pointerX: number;
  origin: Clip;
  candidates: number[];
  gesture: string;
}

export const ClipItem = memo(function ClipItem({ clip, asset, track, selected, pxPerSecond, beats }: ClipItemProps) {
  const dragRef = useRef<Drag | null>(null);

  const startDrag = (event: PointerEvent<HTMLElement>, mode: Mode) => {
    event.stopPropagation();
    const { select, project } = useEditor.getState();
    select(clip.id);
    if (track.locked || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const edges = project.clips.filter((c) => c.id !== clip.id).flatMap((c) => [c.start, clipEnd(c)]);
    dragRef.current = {
      mode,
      pointerX: event.clientX,
      origin: clip,
      candidates: [0, usePlayback.getState().time, ...edges, ...(project.snapToBeats ? beats : [])],
      gesture: `${mode}-${performance.now()}`,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { origin, candidates } = drag;
    const delta = (event.clientX - drag.pointerX) / pxPerSecond;
    const threshold = SNAP_PX / pxPerSecond;
    const snap = (t: number) => snapValue(t, candidates, threshold);
    const { updateClip, project } = useEditor.getState();

    let patch: Partial<TrimResult> & { trackId?: string };
    if (drag.mode === 'move') {
      const raw = Math.max(0, origin.start + delta);
      const snappedStart = snap(raw);
      const start = snappedStart !== raw ? snappedStart : snap(raw + origin.duration) - origin.duration;
      // Dragging vertically moves the clip to another compatible track.
      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-track-id]');
      const target = project.tracks.find((t) => t.id === row?.dataset.trackId);
      const trackId = target && !target.locked && acceptsClip(target.kind, origin) ? target.id : undefined;
      patch = { start: Math.max(0, start), ...(trackId ? { trackId } : {}) };
    } else if (drag.mode === 'trim-start') {
      patch = trimStart(origin, snap(origin.start + delta));
    } else {
      patch = trimEnd(origin, snap(clipEnd(origin) + delta), asset);
    }
    updateClip(clip.id, (c) => ({ ...c, ...patch }) as Clip, drag.gesture);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const width = Math.max(4, clip.duration * pxPerSecond);
  const style: CSSProperties = { left: clip.start * pxPerSecond, width };
  if (clip.kind === 'visual' && asset?.thumbnail) style.backgroundImage = `url(${asset.thumbnail})`;

  const peaksPerSecond = asset?.waveform && asset.duration > 0 ? asset.waveform.length / asset.duration : 0;
  const media = clip.kind !== 'text' ? clip : null;
  const label = clip.kind === 'text' ? clip.text.replace(/\n/g, ' ') || 'Empty text' : (asset?.name ?? 'Missing media');

  return (
    <div
      className={`clip clip--${clip.kind} ${selected ? 'is-selected' : ''} ${track.locked ? 'is-locked' : ''}`}
      style={style}
      onPointerDown={(e) => startDrag(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${clip.kind} clip: ${label}`}
      onKeyDown={(e) => e.key === 'Enter' && useEditor.getState().select(clip.id)}
    >
      {media && asset?.waveform && peaksPerSecond > 0 && (clip.kind === 'audio' || asset.hasAudio) && (
        <div className={`clip__wave ${clip.kind === 'visual' ? 'clip__wave--mini' : ''}`}>
          <Waveform
            peaks={asset.waveform}
            from={media.inPoint * peaksPerSecond}
            to={(media.inPoint + media.duration * media.speed) * peaksPerSecond}
          />
        </div>
      )}
      <div className="clip__label">
        {clip.kind === 'text' && <Icon name="text" size={13} />}
        <span className="clip__name">{label}</span>
        {media && media.speed !== 1 && (
          <span className={`clip__badge ${media.speed > 1 ? 'is-fast' : 'is-slow'}`} title="Speed">
            <Icon name="gauge" size={11} />
            {formatSpeed(media.speed)}
          </span>
        )}
        {media && media.pitch !== 0 && (
          <span className="clip__badge" title="Pitch">
            {media.pitch > 0 ? '♯' : '♭'}
            {Math.abs(media.pitch)}
          </span>
        )}
        {clip.kind === 'visual' && clip.beatFx.type !== 'none' && (
          <span className="clip__badge is-beat" title={`Beat FX: ${clip.beatFx.type}`}>
            <Icon name="beat" size={11} />
          </span>
        )}
        {clip.kind === 'text' && clip.animation.revealOnBeat && (
          <span className="clip__badge is-beat" title="Reveals on the beat">
            <Icon name="beat" size={11} />
          </span>
        )}
      </div>
      {clip.kind === 'visual' && clip.transitionIn.type !== 'none' && (
        <span className="clip__transition" style={{ width: clip.transitionIn.duration * pxPerSecond }} />
      )}
      {!track.locked && (
        <>
          <span className="clip__handle clip__handle--start" onPointerDown={(e) => startDrag(e, 'trim-start')} aria-hidden="true" />
          <span className="clip__handle clip__handle--end" onPointerDown={(e) => startDrag(e, 'trim-end')} aria-hidden="true" />
        </>
      )}
    </div>
  );
});
