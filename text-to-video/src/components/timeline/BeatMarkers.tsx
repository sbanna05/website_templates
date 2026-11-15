import { memo } from 'react';

interface BeatMarkersProps {
  beats: readonly number[];
  manual: readonly number[];
  /** Bar starts (downbeats); when empty, every 4th beat is treated as a bar line. */
  bars?: readonly number[];
  pxPerSecond: number;
  width: number;
  height: number;
}

/** Beat grid drawn once as SVG; bar lines (the real downbeats of the main beat) are emphasised. */
export const BeatMarkers = memo(function BeatMarkers({ beats, manual, bars = [], pxPerSecond, width, height }: BeatMarkersProps) {
  const manualSet = new Set(manual);
  // Beats and bars come from the same maths, but compare with a tolerance anyway.
  let b = 0;
  const isBar = (t: number, i: number) => {
    if (bars.length === 0) return i % 4 === 0;
    while (b < bars.length && bars[b] < t - 0.003) b += 1;
    return b < bars.length && Math.abs(bars[b] - t) <= 0.003;
  };
  // Hide single beats when they'd be closer than 4 px — the bars still show.
  const dense = beats.length > 1 && (beats[beats.length - 1] - beats[0]) / (beats.length - 1) * pxPerSecond < 4;
  return (
    <svg className="beat-markers" width={width} height={height} aria-hidden="true">
      {beats.map((beat, i) => {
        const kind = manualSet.has(beat) ? 'manual' : isBar(beat, i) ? 'bar' : 'beat';
        if (dense && kind === 'beat') return null;
        const x = Math.round(beat * pxPerSecond) + 0.5;
        return <line key={`${beat}-${i}`} x1={x} x2={x} y1={0} y2={height} className={`beat-markers__${kind}`} />;
      })}
    </svg>
  );
});
