import type { BeatAnalysis, BeatGrid } from '../types/project';
import { BEATS_PER_BAR } from './sections';

/*
 * Beat-grid editing, the way DJ software does it: a detected grid can wobble,
 * so you lock the song to one steady tempo and tell it where a bar starts
 * (the downbeat). Everything that reads `asset.beats` — snapping, beat FX,
 * section placement, beat match — then follows the corrected grid.
 */

export const BPM_RANGE = { min: 40, max: 240 } as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Beats of a steady grid across `duration` seconds, plus which of them is the first bar start. */
export function steadyBeats(grid: BeatGrid, duration: number): { beats: number[]; firstBar: number } {
  const period = 60 / grid.bpm;
  // First grid line at or after 0 s, counted in beats from the anchor (a downbeat).
  const k0 = Math.ceil(-grid.anchor / period - 1e-9);
  const beats: number[] = [];
  for (let k = k0; ; k += 1) {
    const t = grid.anchor + k * period;
    if (t >= duration) break;
    beats.push(Number(t.toFixed(4)));
  }
  return { beats, firstBar: mod(-k0, BEATS_PER_BAR) };
}

/** Replaces the analysis with a steady grid, keeping the detector's result so it can be restored. */
export function withGrid(analysis: BeatAnalysis, grid: BeatGrid, duration: number): BeatAnalysis {
  const bpm = Math.min(BPM_RANGE.max, Math.max(BPM_RANGE.min, grid.bpm));
  const locked = { bpm, anchor: grid.anchor };
  return {
    ...analysis,
    ...steadyBeats(locked, duration),
    bpm,
    grid: locked,
    detected: analysis.detected ?? { bpm: analysis.bpm, beats: analysis.beats },
  };
}

/** Back to what the beat detector found. */
export function resetGrid(analysis: BeatAnalysis): BeatAnalysis {
  if (!analysis.detected) return analysis;
  return { bpm: analysis.detected.bpm, beats: analysis.detected.beats, onsets: analysis.onsets };
}

/** The grid currently in effect — the hand-made one, or one fitted to the detected beats. */
export function currentGrid(analysis: BeatAnalysis): BeatGrid {
  if (analysis.grid) return analysis.grid;
  const anchor = analysis.beats[analysis.firstBar ?? 0] ?? analysis.beats[0] ?? 0;
  return { bpm: Number(analysis.bpm.toFixed(2)), anchor };
}

/** Moves the grid's downbeat to `time`, snapping to a detected beat when one is within `window`. */
export function downbeatAt(analysis: BeatAnalysis, time: number, window = 0.08): BeatGrid {
  const candidates = analysis.detected?.beats ?? analysis.beats;
  let anchor = time;
  let distance = window;
  for (const beat of candidates) {
    const d = Math.abs(beat - time);
    if (d <= distance) {
      anchor = beat;
      distance = d;
    }
  }
  return { bpm: currentGrid(analysis).bpm, anchor };
}

/**
 * Tempo from tapped times (seconds, any clock). Uses the last few taps and
 * ignores gaps that are clearly a pause. Null until there are two intervals.
 */
export function tapTempo(taps: readonly number[]): number | null {
  const recent = taps.slice(-9);
  const intervals: number[] = [];
  for (let i = 1; i < recent.length; i += 1) {
    const gap = recent[i] - recent[i - 1];
    if (gap >= 60 / BPM_RANGE.max && gap <= 60 / BPM_RANGE.min) intervals.push(gap);
  }
  if (intervals.length < 2) return null;
  const average = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return Number((60 / average).toFixed(1));
}
