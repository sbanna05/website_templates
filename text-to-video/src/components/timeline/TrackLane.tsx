import { useMemo, useState, type CSSProperties, type DragEvent, type PointerEvent } from 'react';
import { DEFAULT_STILL_DURATION } from '../../config/defaults';
import { clipEnd, handOvers, snapValue } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
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

/** Length the new clip will get — stills have none of their own. */
const landingDuration = (asset: Asset) => (asset.kind === 'image' ? DEFAULT_STILL_DURATION : asset.duration);

const acceptsAsset = (track: Track, asset: Asset | undefined) =>
  Boolean(asset) && !track.locked && (track.kind === 'audio' ? asset?.kind === 'audio' : track.kind === 'visual' && asset?.kind !== 'audio');

export function TrackLane({ track, clips, assets, selected, pxPerSecond, beats, width, height, onBackgroundPointerDown }: TrackLaneProps) {
  /** Where the dragged asset would land, in seconds; null while nothing droppable is over the lane. */
  const [dropAt, setDropAt] = useState<number | null>(null);
  const dragged = useUi((s) => (s.draggedAssetId ? assets[s.draggedAssetId] : undefined));
  const crossfade = useEditor((s) => s.project.crossfadeOverlaps);
  // Another track is soloed: this one is silent, so it is drawn dimmed like a muted track.
  const silencedBySolo = useEditor((s) => track.kind !== 'text' && !track.solo && s.project.tracks.some((t) => t.solo));
  const overlaps = useMemo(() => (track.kind === 'audio' && crossfade ? overlapZones(clips) : []), [track.kind, crossfade, clips]);
  const isAssetDrag = (e: DragEvent) => e.dataTransfer.types.includes(ASSET_DRAG_TYPE);

  /** Snaps the pointer to clip edges, marks and beats — the same targets clip moves use. */
  const startAt = (event: DragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const raw = Math.max(0, (event.clientX - rect.left) / pxPerSecond);
    const edges = clips.flatMap((c) => [c.start, c.start + c.duration]);
    const marks = useEditor.getState().project.markers.map((m) => m.time);
    return snapValue(raw, [0, ...edges, ...marks, ...beats], SNAP_PX / pxPerSecond);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isAssetDrag(event)) return;
    // Wrong kind of media (or a locked track): leave the default "no drop" cursor so the refusal is visible before letting go.
    if (dragged && !acceptsAsset(track, dragged)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropAt(startAt(event));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    setDropAt(null);
    const asset = assets[event.dataTransfer.getData(ASSET_DRAG_TYPE)];
    if (!acceptsAsset(track, asset) || !asset) return;
    event.preventDefault();
    useEditor.getState().addAssetToTimeline(asset.id, { trackId: track.id, start: startAt(event) });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onBackgroundPointerDown(event);
  };

  return (
    <div
      className={`track-lane track-lane--${track.kind} ${dropAt !== null ? 'is-dropping' : ''} ${track.hidden || track.muted || silencedBySolo ? 'is-dimmed' : ''} ${track.color ? 'has-tint' : ''}`}
      style={{ width, height, ...(track.color ? { '--track-color': track.color } : {}) } as CSSProperties}
      onPointerDown={onPointerDown}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        // Moving over a clip inside the lane fires dragleave too; only clear when the pointer really leaves.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropAt(null);
      }}
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
      {dropAt !== null && dragged && (
        <span
          className="track-lane__ghost"
          aria-hidden="true"
          style={{ left: dropAt * pxPerSecond, width: landingDuration(dragged) * pxPerSecond }}
        >
          {dragged.name}
        </span>
      )}
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
