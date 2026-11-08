import { createId } from '../lib/id';
import { clamp } from '../lib/math';
import type { CurveShape, VolumeKey } from '../types/project';

/*
 * Volume automation — keyframes joined by curves, like Blender's graph editor.
 *
 * Keys live in *source* seconds (the song's own clock), so they stay glued to
 * the same beat when the clip is trimmed, moved or re-timed. Each key's `shape`
 * describes the segment that leaves it:
 *
 *   linear  straight ramp to the next key
 *   smooth  ease in-out (smoothstep) — no corners, the "Bezier" feel
 *   hold    stays flat, then jumps on the next key (a step)
 */

export const VOLUME_KEY_RANGE = { min: 0, max: 2 } as const;

const SHAPES: Record<CurveShape, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  hold: () => 0,
};

export const sortKeys = (keys: readonly VolumeKey[]): VolumeKey[] => [...keys].sort((a, b) => a.time - b.time);

export function createKey(time: number, value: number, shape: CurveShape = 'smooth'): VolumeKey {
  return { id: createId('key'), time, value: clamp(value, VOLUME_KEY_RANGE.min, VOLUME_KEY_RANGE.max), shape };
}

/** Gain multiplier at `time` (source seconds). `keys` must be sorted. No keys → 1. */
export function volumeAt(keys: readonly VolumeKey[], time: number): number {
  if (keys.length === 0) return 1;
  if (time <= keys[0].time) return keys[0].value;
  const last = keys[keys.length - 1];
  if (time >= last.time) return last.value;
  let i = 0;
  while (keys[i + 1].time <= time) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  const t = (time - a.time) / Math.max(1e-9, b.time - a.time);
  return a.value + (b.value - a.value) * SHAPES[a.shape](t);
}

/** `count` evenly spaced samples between two source times — feeds `AudioParam.setValueCurveAtTime`. */
export function sampleVolume(keys: readonly VolumeKey[], from: number, to: number, count: number): Float32Array {
  const samples = new Float32Array(Math.max(2, count));
  const step = (to - from) / (samples.length - 1);
  for (let i = 0; i < samples.length; i += 1) samples[i] = volumeAt(keys, from + i * step);
  return samples;
}

/* ── Presets ─────────────────────────────────────────────────────────────── */

export interface KeyPresetRange {
  from: number;
  to: number;
  /** The song's beats (source seconds) inside the range. */
  beats: readonly number[];
}

/**
 * Sidechain "pump": the volume ducks on every beat and swells back before the
 * next one — the classic EDM breathing effect.
 */
export function pumpKeys({ beats }: KeyPresetRange, depth = 0.55, release = 0.6): VolumeKey[] {
  const keys: VolumeKey[] = [];
  beats.forEach((beat, i) => {
    const period = (beats[i + 1] ?? beat + (beats[i - 1] !== undefined ? beat - beats[i - 1] : 0.5)) - beat;
    keys.push(createKey(beat, 1 - depth, 'smooth'), createKey(beat + period * release, 1, 'hold'));
  });
  return keys;
}

/** Rises from quiet to full across the range — a build-up into a drop. */
export const buildUpKeys = ({ from, to }: KeyPresetRange): VolumeKey[] => [
  createKey(from, 0.2, 'smooth'),
  createKey(to, 1.15, 'linear'),
];

/** Dips in the middle third (e.g. under a voice-over), full at both ends. */
export function dipKeys({ from, to }: KeyPresetRange, level = 0.35): VolumeKey[] {
  const third = (to - from) / 3;
  return [
    createKey(from + third - 0.4, 1, 'smooth'),
    createKey(from + third, level, 'hold'),
    createKey(to - third, level, 'smooth'),
    createKey(to - third + 0.4, 1, 'linear'),
  ];
}
