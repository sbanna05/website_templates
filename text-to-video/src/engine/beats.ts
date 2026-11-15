import { lastIndexAtOrBefore } from '../lib/math';

export interface BeatState {
  /** 1 on the beat, decaying towards 0. */
  pulse: number;
  /** Index of the most recent beat (-1 before the first). */
  index: number;
  /** Seconds since the most recent beat. */
  since: number;
}

const NO_BEAT: BeatState = { pulse: 0, index: -1, since: Number.POSITIVE_INFINITY };

export function beatStateAt(beats: readonly number[], time: number, decay = 0.14): BeatState {
  const index = lastIndexAtOrBefore(beats, time);
  if (index < 0) return NO_BEAT;
  const since = time - beats[index];
  return { pulse: Math.exp(-since / decay), index, since };
}

/** First `count` beats at or after `from`, used to reveal text units on the beat. */
export function beatsFrom(beats: readonly number[], from: number, count: number): number[] {
  const start = lastIndexAtOrBefore(beats, from - 1e-6) + 1;
  return beats.slice(start, start + count);
}
