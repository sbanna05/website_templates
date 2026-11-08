import { memo, useRef, type CSSProperties, type PointerEvent } from 'react';
import { snapValue } from '../../engine/timeline';
import { formatTimecode } from '../../lib/time';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import type { Marker } from '../../types/project';
import { SNAP_PX } from './constants';

interface DragState {
  id: string;
  pointerX: number;
  origin: number;
  moved: boolean;
  key: string;
}

/** Below this many pixels a press counts as a click (jump), not a drag. */
const CLICK_SLOP = 3;

interface MarkerFlagsProps {
  markers: readonly Marker[];
  beats: readonly number[];
  pxPerSecond: number;
}

/** Flags in the ruler: click to jump, drag to move (snaps to beats), right-click to delete. */
export function MarkerFlags({ markers, beats, pxPerSecond }: MarkerFlagsProps) {
  const dragRef = useRef<DragState | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, marker: Marker) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: marker.id, pointerX: event.clientX, origin: marker.time, moved: false, key: `move-${event.timeStamp}` };
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.pointerX;
    if (!drag.moved && Math.abs(dx) < CLICK_SLOP) return;
    drag.moved = true;
    const { project, updateMarker } = useEditor.getState();
    const raw = Math.max(0, drag.origin + dx / pxPerSecond);
    const time = project.snapToBeats ? snapValue(raw, beats, SNAP_PX / pxPerSecond) : raw;
    updateMarker(drag.id, { time }, drag.key);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.moved) usePlayback.getState().seek(drag.origin);
  };

  return (
    <>
      {markers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          className="marker-flag"
          style={{ left: marker.time * pxPerSecond, '--marker': marker.color } as CSSProperties}
          title={`${marker.label} · ${formatTimecode(marker.time)} — drag to move, right-click to delete`}
          aria-label={`${marker.label} at ${formatTimecode(marker.time)}`}
          onPointerDown={(e) => onPointerDown(e, marker)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (dragRef.current = null)}
          onContextMenu={(e) => {
            e.preventDefault();
            useEditor.getState().removeMarker(marker.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
              e.preventDefault();
              e.stopPropagation();
              useEditor.getState().removeMarker(marker.id);
            }
          }}
        >
          <span className="marker-flag__label">{marker.label}</span>
        </button>
      ))}
    </>
  );
}

/** Thin guide lines through every track, so clips can be lined up by eye. */
export const MarkerLines = memo(function MarkerLines({ markers, pxPerSecond }: { markers: readonly Marker[]; pxPerSecond: number }) {
  return (
    <>
      {markers.map((marker) => (
        <span
          key={marker.id}
          className="marker-line"
          style={{ left: marker.time * pxPerSecond, '--marker': marker.color } as CSSProperties}
          aria-hidden="true"
        />
      ))}
    </>
  );
});
