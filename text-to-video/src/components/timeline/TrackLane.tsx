import { useMemo, useState, type DragEvent, type PointerEvent } from 'react';
import { clipEnd, snapValue } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import type { Asset, Clip, Track } from '../../types/project';
import { ASSET_DRAG_TYPE } from '../library/dnd';
import { ClipItem } from './ClipItem';
import { SNAP_PX } from './constants';

interface TrackLaneProps {
  track: Track;
  clips: Clip[];
  assets: Record<string, Asset>;
  selected: ReadonlySet<string>;
  pxPerSecond: number;
  beats: readonly number[];
  width: number;
  height: number;
  /** Press on empty lane space — the timeline turns it into a seek or a selection box. */
  onBackgroundPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}

const acceptsAsset = (track: Track, asset: Asset | undefined) =>
  Boolean(asset) && !track.locked && (track.kind === 'audio' ? asset?.kind === 'audio' : track.kind === 'visual' && asset?.kind !== 'audio');

export function TrackLane({ track, clips, assets, selected, pxPerSecond, beats, width, height, onBackgroundPointerDown }: TrackLaneProps) {
  const [dropping, setDropping] = useState(false);
  const crossfade = useEditor((s) => s.project.crossfadeOverlaps);
  const overlaps = useMemo(() => (track.kind === 'audio' && crossfade ? overlapZones(clips) : []), [track.kind, crossfade, clips]);
  const isAssetDrag = (e: DragEvent) => e.dataTransfer.types.includes(ASSET_DRAG_TYPE);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    setDropping(false);
    const asset = assets[event.dataTransfer.getData(ASSET_DRAG_TYPE)];
    if (!acceptsAsset(track, asset) || !asset) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const raw = Math.max(0, (event.clientX - rect.left) / pxPerSecond);
    const edges = clips.flatMap((c) => [c.start, c.start + c.duration]);
    const marks = useEditor.getState().project.markers.map((m) => m.time);
    const start = snapValue(raw, [0, ...edges, ...marks, ...beats], SNAP_PX / pxPerSecond);
    useEditor.getState().addAssetToTimeline(asset.id, { trackId: track.id, start });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onBackgroundPointerDown(event);
  };

  return (
    <div
      className={`track-lane track-lane--${track.kind} ${dropping ? 'is-dropping' : ''} ${track.hidden || track.muted ? 'is-dimmed' : ''}`}
      style={{ width, height }}
      onPointerDown={onPointerDown}
      onDragOver={(e) => {
        if (!isAssetDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDropping(true);
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      {overlaps.map(([from, to]) => (
        <span
          key={`${from}-${to}`}
          className="track-lane__xfade"
          style={{ left: from * pxPerSecond, width: (to - from) * pxPerSecond }}
          title="Crossfade — one song fades into the other here"
        />
      ))}
      {clips.map((clip) => (
        <ClipItem
          key={clip.id}
          clip={clip}
          asset={clip.kind === 'text' ? undefined : assets[clip.assetId]}
          track={track}
          selected={selected.has(clip.id)}
          multi={selected.size > 1}
          pxPerSecond={pxPerSecond}
          beats={beats}
        />
      ))}
    </div>
  );
}

/** Time ranges where consecutive clips on a lane overlap. */
function overlapZones(clips: readonly Clip[]): [number, number][] {
  const sorted = [...clips].sort((a, b) => a.start - b.start);
  const zones: [number, number][] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const end = Math.min(clipEnd(sorted[i - 1]), clipEnd(sorted[i]));
    if (end > sorted[i].start + 0.01) zones.push([sorted[i].start, end]);
  }
  return zones;
}
