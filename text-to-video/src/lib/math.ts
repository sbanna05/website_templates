export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Maps a value from one range onto another, clamped to the output range. */
export const remap = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  if (inMax === inMin) return outMin;
  return lerp(outMin, outMax, clamp((value - inMin) / (inMax - inMin), 0, 1));
};

export const roundTo = (value: number, step: number): number => Math.round(value / step) * step;

/** Deterministic 0–1 pseudo-random number from an integer seed (mulberry32). */
export function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Index of the last element `<= value` in a sorted array, or -1. */
export function lastIndexAtOrBefore(sorted: readonly number[], value: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= value) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

export const semitonesToRatio = (semitones: number): number => 2 ** (semitones / 12);
