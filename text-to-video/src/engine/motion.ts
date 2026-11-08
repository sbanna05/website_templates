import { getEase } from '../lib/easing';
import { clamp, lastIndexAtOrBefore } from '../lib/math';
import type { MotionCurve, MotionType } from '../types/project';
import type { Pose } from './types';

/**
 * Camera moves over a clip's lifetime (Ken Burns and friends). `m` runs 0 → 1
 * after pacing; `a` is the amount (0–1, where 1 = 100%). Pans scale up by the
 * same amount they travel, so the frame never shows an empty edge.
 */
export const MOTIONS: Record<MotionType, (m: number, a: number, w: number, h: number, time: number) => Partial<Pose>> = {
  none: () => ({}),
  'zoom-in': (m, a) => ({ scale: 1 + a * m }),
  'zoom-out': (m, a) => ({ scale: 1 + a * (1 - m) }),
  // "Short" zooms happen in the first third, then hold — punchy, MVM-style.
  'zoom-in-short': (m, a) => ({ scale: 1 + a * getEase('expo.out')(clamp(m * 3, 0, 1)) }),
  'zoom-out-short': (m, a) => ({ scale: 1 + a * (1 - getEase('expo.out')(clamp(m * 3, 0, 1))) }),
  'pan-left': (m, a, w) => ({ scale: 1 + a, dx: (0.5 - m) * a * w }),
  'pan-right': (m, a, w) => ({ scale: 1 + a, dx: (m - 0.5) * a * w }),
  'pan-up': (m, a, _w, h) => ({ scale: 1 + a, dy: (0.5 - m) * a * h }),
  'pan-down': (m, a, _w, h) => ({ scale: 1 + a, dy: (m - 0.5) * a * h }),
  // Slide + turn: travels sideways while rotating, covered by extra zoom.
  'turn-left': (m, a, w) => ({ scale: 1.15 + a, dx: (0.5 - m) * a * w * 0.6, rotation: (0.5 - m) * a * 0.5 }),
  'turn-right': (m, a, w) => ({ scale: 1.15 + a, dx: (m - 0.5) * a * w * 0.6, rotation: (m - 0.5) * a * 0.5 }),
  swing: (m, a) => ({ scale: 1.1 + a * 0.3, rotation: Math.sin(m * Math.PI * 2) * a * 0.18 }),
  spiral: (m, a) => ({ scale: 1.1 + a * m * 1.2, rotation: m * a * Math.PI * 0.5 }),
  handheld: (_m, a, w, _h, time) => {
    // Smooth pseudo-random sway from summed sines (deterministic per frame).
    const x = Math.sin(time * 1.7) + 0.5 * Math.sin(time * 3.1 + 1.3);
    const y = Math.sin(time * 1.3 + 2.1) + 0.5 * Math.sin(time * 2.7);
    const k = 0.4 + a;
    return { scale: 1.06 + a * 0.2, dx: x * w * 0.012 * k, dy: y * w * 0.012 * k, rotation: x * 0.006 * k };
  },
  drift: (m, a, w) => ({
    scale: 1 + a * 0.6,
    dx: Math.sin(m * Math.PI * 2) * a * w * 0.15,
    rotation: Math.sin(m * Math.PI) * a * 0.1,
  }),
};

type SmoothCurve = Exclude<MotionCurve, 'on-beat'>;

/** Velocity curves — where in the clip the move is fastest. */
const CURVES: Record<SmoothCurve, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': getEase('power2.in'),
  'ease-out': getEase('power2.out'),
  'ease-in-out': getEase('sine.inOut'),
  'fast-middle': getEase('power3.inOut'),
  // Fast → slow → fast: velocity is zero in the middle.
  'slow-middle': (t) => 0.5 + 4 * (t - 0.5) ** 3,
};

const BEAT_STEP_EASE = getEase('expo.out');
/** How long each on-beat step takes to settle, seconds. */
const BEAT_STEP_SECONDS = 0.35;

/**
 * Converts linear clip progress into paced progress. With `on-beat`, the move
 * advances in a quick eased step on every beat inside the clip and holds in between.
 */
export function pacedProgress(
  curve: MotionCurve,
  local: number,
  duration: number,
  clipStart: number,
  beats: readonly number[],
): number {
  const t = clamp(local / Math.max(duration, 1e-6), 0, 1);
  if (curve !== 'on-beat') return CURVES[curve](t);

  const marks = [clipStart];
  for (let i = lastIndexAtOrBefore(beats, clipStart) + 1; i < beats.length && beats[i] < clipStart + duration; i += 1) {
    if (beats[i] - marks[marks.length - 1] > 0.05) marks.push(beats[i]);
  }
  if (marks.length < 2) return CURVES['ease-in-out'](t);
  const time = clipStart + local;
  const step = Math.max(0, lastIndexAtOrBefore(marks, time));
  const stepLength = (marks[step + 1] ?? clipStart + duration) - marks[step];
  const frac = clamp((time - marks[step]) / Math.min(stepLength, BEAT_STEP_SECONDS), 0, 1);
  return clamp((step + BEAT_STEP_EASE(frac)) / marks.length, 0, 1);
}

/** Samples a curve for the inspector's little velocity graph. */
export function sampleCurve(curve: SmoothCurve, points = 24): number[] {
  return Array.from({ length: points + 1 }, (_, i) => CURVES[curve](i / points));
}
