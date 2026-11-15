import { useEffect, useRef } from 'react';
import { readLevels, usePlayback } from '../../store/playbackStore';

const FLOOR_DB = -48;
/** Linear level → 0–1 bar length on a dB scale. */
const toUnit = (level: number) => Math.max(0, 1 - Math.max(FLOOR_DB, 20 * Math.log10(level || 1e-6)) / FLOOR_DB);

/**
 * Stereo peak/RMS meter of the master output. Animates straight on the DOM in a
 * rAF loop (no React re-renders), and only while playing.
 */
export function LevelMeter({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const playing = usePlayback((s) => s.playing);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const bars = [...root.querySelectorAll<HTMLElement>('.meter__channel')];
    // Stopped: one pass with silent levels empties the bars.
    const held = [0, 0];
    let frame = 0;
    const draw = () => {
      const { peak, rms } = readLevels();
      bars.forEach((bar, i) => {
        // Peaks fall back slowly, like a hardware meter's ballistics.
        held[i] = playing ? Math.max(toUnit(peak[i]), held[i] - 0.015) : 0;
        bar.style.setProperty('--rms', String(toUnit(rms[i])));
        bar.style.setProperty('--peak', String(held[i]));
        bar.classList.toggle('is-clipping', peak[i] >= 0.99);
      });
      if (playing) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return (
    <div ref={ref} className={`meter ${compact ? 'meter--compact' : ''}`} role="img" aria-label="Master output level">
      <span className="meter__channel" />
      <span className="meter__channel" />
    </div>
  );
}
