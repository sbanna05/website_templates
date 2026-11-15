import { memo, useRef, type PointerEvent } from 'react';
import { formatTimecode } from '../../lib/time';
import { usePlayback } from '../../store/playbackStore';

interface TimeRulerProps {
  width: number;
  pxPerSecond: number;
  duration: number;
}

const STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60];

export const TimeRuler = memo(function TimeRuler({ width, pxPerSecond, duration }: TimeRulerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const step = STEPS.find((s) => s * pxPerSecond >= 70) ?? 60;
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += step) ticks.push(Number(t.toFixed(3)));

  const seekFromPointer = (event: PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    usePlayback.getState().seek((event.clientX - rect.left) / pxPerSecond);
  };

  return (
    <div
      ref={ref}
      className="ruler"
      style={{ width }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        seekFromPointer(e);
      }}
      onPointerMove={(e) => e.buttons === 1 && seekFromPointer(e)}
      role="slider"
      aria-label="Timeline position"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={usePlayback.getState().time}
      tabIndex={-1}
    >
      {ticks.map((t) => (
        <span key={t} className="ruler__tick" style={{ left: t * pxPerSecond }}>
          <span className="ruler__label">{step < 1 ? `${t.toFixed(step < 0.5 ? 2 : 1)}s` : formatTimecode(t, false)}</span>
        </span>
      ))}
      <div
        className="ruler__minor"
        style={{ backgroundSize: `${(step * pxPerSecond) / 5}px 100%` }}
        aria-hidden="true"
      />
    </div>
  );
});
