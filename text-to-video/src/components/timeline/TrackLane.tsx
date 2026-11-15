import { useMemo, useState, type CSSProperties, type DragEvent, type PointerEvent } from 'react';
import { clipEnd, handOvers, snapValue } from '../../engine/timeline';
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
  // Another track is soloed: this one is silent, so it is drawn dimmed like a muted track.
  const silencedBySolo = useEditor((s) => track.kind !== 'text' && !track.solo && s.project.tracks.some((t) => t.solo));
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
      className={`track-lane track-lane--${track.kind} ${dropping ? 'is-dropping' : ''} ${track.hidden || track.muted || silencedBySolo ? 'is-dimmed' : ''} ${track.color ? 'has-tint' : ''}`}
      style={{ width, height, ...(track.color ? { '--track-color': track.color } : {}) } as CSSProperties}
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
      {overlaps.map(([from, to], i) => (
        <span
          // Several pairs can share a time range, so the position in the list keeps keys unique.
          key={i}
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

/** Crossfade ranges on a lane — the same hand-overs the mixer fades. */
function overlapZones(clips: readonly Clip[]): [number, number][] {
  return handOvers(clips.map((clip) => ({ start: clip.start, end: clipEnd(clip) }))).map(([earlier, later]) => [later.start, earlier.end]);
}
