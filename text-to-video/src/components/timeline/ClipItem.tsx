import { useShallow } from 'zustand/react/shallow';
import { memo, useMemo, useRef, type CSSProperties, type PointerEvent } from 'react';
import { isDry } from '../../audio/effects';
import { sortKeys, volumeAt } from '../../engine/automation';
import { isFlatEq } from '../../engine/eq';
import { FULL_STEM_MIX, STEMS, isFullMix, stemGains } from '../../engine/stems';
import { clipEnd, snapValue, trimEnd, trimStart, type TrimResult } from '../../engine/timeline';
import { formatSpeed } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import type { Asset, AudioClip, Clip, StemName, Track } from '../../types/project';
import { Icon } from '../ui/Icon';
import { SNAP_PX, acceptsClip } from './constants';
import { Waveform } from './Waveform';

type Mode = 'move' | 'trim-start' | 'trim-end';

interface ClipItemProps {
  clip: Clip;
  asset?: Asset;
  track: Track;
  selected: boolean;
  /** More than one clip is selected (dragging a selected clip moves the whole group). */
  multi: boolean;
  pxPerSecond: number;
  beats: readonly number[];
}

interface Drag {
  mode: Mode;
  pointerX: number;
  origin: Clip;
  /** Start times of every clip moving together (just this one unless a group is selected). */
  group: Map<string, number>;
  candidates: number[];
  gesture: string;
}

export const ClipItem = memo(function ClipItem({ clip, asset, track, selected, multi, pxPerSecond, beats }: ClipItemProps) {
  const dragRef = useRef<Drag | null>(null);
  const stemAssets = useEditor((s) => (clip.kind === 'audio' && !isFullMix(clip.stems) ? s.assets[clip.assetId]?.stems : undefined));

  const startDrag = (event: PointerEvent<HTMLElement>, mode: Mode) => {
    event.stopPropagation();
    const { select, project, selectedClipIds } = useEditor.getState();
    // Ctrl/⌘-click toggles a clip in the selection, Shift-click adds it — no drag.
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      select(clip.id, event.shiftKey ? 'add' : 'toggle');
      return;
    }
    const keepGroup = selected && multi && mode === 'move';
    if (!keepGroup) select(clip.id);
    if (track.locked || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);

    const locked = new Set(project.tracks.filter((t) => t.locked).map((t) => t.id));
    const members = keepGroup ? project.clips.filter((c) => selectedClipIds.includes(c.id) && !locked.has(c.trackId)) : [clip];
    const moving = new Set(members.map((c) => c.id));
    const edges = project.clips.filter((c) => !moving.has(c.id)).flatMap((c) => [c.start, clipEnd(c)]);
    dragRef.current = {
      mode,
      pointerX: event.clientX,
      origin: clip,
      group: new Map(members.map((c) => [c.id, c.start])),
      candidates: [0, usePlayback.getState().time, ...edges, ...project.markers.map((m) => m.time), ...(project.snapToBeats ? beats : [])],
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
    const { updateClip, updateClips, project } = useEditor.getState();

    if (drag.mode === 'move' && drag.group.size > 1) {
      // Snap the grabbed clip, move the rest by the same amount, never past 0 s.
      const raw = origin.start + delta;
      const snappedStart = snap(raw);
      const start = snappedStart !== raw ? snappedStart : snap(raw + origin.duration) - origin.duration;
      const earliest = Math.min(...drag.group.values());
      const shift = Math.max(start - origin.start, -earliest);
      updateClips([...drag.group.keys()], (c) => ({ ...c, start: (drag.group.get(c.id) ?? c.start) + shift }), drag.gesture);
      return;
    }

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
      className={`clip clip--${clip.kind} ${selected ? 'is-selected' : ''} ${selected && multi ? 'is-grouped' : ''} ${track.locked ? 'is-locked' : ''}`}
      style={style}
      onPointerDown={(e) => startDrag(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${clip.kind} clip: ${label}`}
      onKeyDown={(e) => e.key === 'Enter' && useEditor.getState().select(clip.id, e.shiftKey ? 'add' : 'replace')}
    >
      {clip.kind === 'audio' && stemAssets && <StemLanes clip={clip} stems={stemAssets} />}
      {media && !stemAssets && asset?.waveform && peaksPerSecond > 0 && (clip.kind === 'audio' || asset.hasAudio) && (
        <div className={`clip__wave ${clip.kind === 'visual' ? 'clip__wave--mini' : ''}`}>
          <Waveform
            peaks={asset.waveform}
            from={media.inPoint * peaksPerSecond}
            to={(media.inPoint + media.duration * media.speed) * peaksPerSecond}
          />
        </div>
      )}
      {clip.kind === 'audio' && clip.volumeKeys.length > 0 && <VolumeOverlay clip={clip} />}
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
        {clip.kind === 'audio' && clip.beatSource && (
          <span className="clip__badge is-beat" title="Main beat — the beat grid follows this song">
            <Icon name="crown" size={11} />
          </span>
        )}
        {clip.kind === 'audio' && !isDry(clip.effects) && (
          <span className="clip__badge" title="Sound effects">
            <Icon name="sparkle" size={11} />
          </span>
        )}
        {clip.kind === 'audio' && !isFlatEq(clip.eq) && (
          <span className="clip__badge" title="EQ">
            EQ
          </span>
        )}
        {stemAssets && (
          <span className="clip__badge is-beat" title="Playing a stem mix">
            <Icon name="layers" size={11} />
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

/** The clip's stems as stacked mini waveforms; muted stems are dimmed (edit them in the inspector). */
const StemLanes = memo(function StemLanes({ clip, stems }: { clip: AudioClip; stems: Record<StemName, string> }) {
  const stemAssets = useEditor(useShallow((s) => STEMS.map((stem) => s.assets[stems[stem.id]])));
  const gains = stemGains(clip.stems ?? FULL_STEM_MIX);
  const span = { from: clip.inPoint, to: clip.inPoint + clip.duration * clip.speed };
  return (
    <div className="clip__stems" aria-hidden="true">
      {STEMS.map((stem, i) => {
        const stemAsset = stemAssets[i];
        const pps = stemAsset?.waveform && stemAsset.duration > 0 ? stemAsset.waveform.length / stemAsset.duration : 0;
        return (
          <div key={stem.id} className={`clip__stem ${gains[stem.id] > 0 ? '' : 'is-off'}`} style={{ color: stem.color }}>
            {stemAsset?.waveform && pps > 0 && <Waveform peaks={stemAsset.waveform} from={span.from * pps} to={span.to * pps} />}
          </div>
        );
      })}
    </div>
  );
});

/** Read-only line showing the clip's volume automation (edit it in the inspector). */
const VolumeOverlay = memo(function VolumeOverlay({ clip }: { clip: AudioClip }) {
  const points = useMemo(() => {
    const keys = sortKeys(clip.volumeKeys);
    const steps = 160;
    const span = clip.duration * clip.speed;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const v = volumeAt(keys, clip.inPoint + (span * i) / steps);
      return `${(i / steps) * 100},${(1 - v / 2) * 100}`;
    }).join(' ');
  }, [clip.volumeKeys, clip.inPoint, clip.duration, clip.speed]);
  return (
    <svg className="clip__curve" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
});
