import { memo, useMemo } from 'react';

interface WaveformProps {
  peaks: readonly number[];
  /** Optional window into the peaks array (indices). */
  from?: number;
  to?: number;
}

/** Mirrored peak waveform as a single SVG path; stretches to its container. */
export const Waveform = memo(function Waveform({ peaks, from = 0, to = peaks.length }: WaveformProps) {
  const d = useMemo(() => {
    const start = Math.max(0, Math.floor(from));
    const end = Math.min(peaks.length, Math.ceil(to));
    const slice = peaks.slice(start, end);
    if (slice.length === 0) return '';
    // Cap path complexity; the SVG is stretched anyway.
    const stride = Math.max(1, Math.floor(slice.length / 600));
    const points: number[] = [];
    for (let i = 0; i < slice.length; i += stride) {
      let peak = 0;
      for (let k = i; k < Math.min(slice.length, i + stride); k += 1) peak = Math.max(peak, slice[k]);
      points.push(peak);
    }
    const top = points.map((p, i) => `${i},${0.5 - p * 0.48}`).join(' L');
    const bottom = points.map((p, i) => `${i},${0.5 + p * 0.48}`).reverse().join(' L');
    return { path: `M${top} L${bottom} Z`, width: Math.max(1, points.length - 1) };
  }, [peaks, from, to]);

  if (!d) return null;
  return (
    <svg className="waveform" viewBox={`0 0 ${d.width} 1`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d.path} />
    </svg>
  );
});
