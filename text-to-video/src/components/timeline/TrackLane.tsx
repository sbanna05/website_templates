import { useState, type DragEvent, type PointerEvent } from 'react';
import { snapValue } from '../../engine/timeline';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import type { Asset, Clip, Track } from '../../types/project';
import { ASSET_DRAG_TYPE } from '../library/dnd';
import { ClipItem } from './ClipItem';
import { SNAP_PX } from './constants';

interface TrackLaneProps {
  track: Track;
  clips: Clip[];
  assets: Record<string, Asset>;
  selectedClipId: string | null;
  pxPerSecond: number;
  beats: readonly number[];
  width: number;
  height: number;
}

const acceptsAsset = (track: Track, asset: Asset | undefined) =>
  Boolean(asset) && !track.locked && (track.kind === 'audio' ? asset?.kind === 'audio' : track.kind === 'visual' && asset?.kind !== 'audio');

export function TrackLane({ track, clips, assets, selectedClipId, pxPerSecond, beats, width, height }: TrackLaneProps) {
  const [dropping, setDropping] = useState(false);
  const isAssetDrag = (e: DragEvent) => e.dataTransfer.types.includes(ASSET_DRAG_TYPE);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    setDropping(false);
    const asset = assets[event.dataTransfer.getData(ASSET_DRAG_TYPE)];
    if (!acceptsAsset(track, asset) || !asset) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const raw = Math.max(0, (event.clientX - rect.left) / pxPerSecond);
    const edges = clips.flatMap((c) => [c.start, c.start + c.duration]);
    const start = snapValue(raw, [0, ...edges, ...beats], SNAP_PX / pxPerSecond);
    useEditor.getState().addAssetToTimeline(asset.id, { trackId: track.id, start });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    useEditor.getState().select(null);
    const rect = event.currentTarget.getBoundingClientRect();
    usePlayback.getState().seek((event.clientX - rect.left) / pxPerSecond);
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
      {clips.map((clip) => (
        <ClipItem
          key={clip.id}
          clip={clip}
          asset={clip.kind === 'text' ? undefined : assets[clip.assetId]}
          track={track}
          selected={clip.id === selectedClipId}
          pxPerSecond={pxPerSecond}
          beats={beats}
        />
      ))}
    </div>
  );
}
