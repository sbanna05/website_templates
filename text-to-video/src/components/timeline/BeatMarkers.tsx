import { memo } from 'react';

interface BeatMarkersProps {
  beats: readonly number[];
  manual: readonly number[];
  pxPerSecond: number;
  width: number;
  height: number;
}

/** Beat grid drawn once as SVG; every 4th beat (bar line) is emphasised. */
export const BeatMarkers = memo(function BeatMarkers({ beats, manual, pxPerSecond, width, height }: BeatMarkersProps) {
  const manualSet = new Set(manual);
  return (
    <svg className="beat-markers" width={width} height={height} aria-hidden="true">
      {beats.map((beat, i) => {
        const x = Math.round(beat * pxPerSecond) + 0.5;
        const kind = manualSet.has(beat) ? 'manual' : i % 4 === 0 ? 'bar' : 'beat';
        return <line key={`${beat}-${i}`} x1={x} x2={x} y1={0} y2={height} className={`beat-markers__${kind}`} />;
      })}
    </svg>
  );
});
