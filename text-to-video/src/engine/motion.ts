import { getEase } from '../lib/easing';
import { clamp, lastIndexAtOrBefore } from '../lib/math';
import type { MotionCurve, MotionLayer, MotionType, PathPoint } from '../types/project';
import type { Pose } from './types';

/**
 * Camera moves (Ken Burns and friends). `m` runs 0 → 1 after pacing; `a` is
 * the amount (0–1). Distances are measured on the picture itself (`pw` × `ph`
 * is its size on screen), and no move zooms unless it is a zoom — stack a
 * zoom on top when a pan should stay edge-to-edge.
 */
export const MOTIONS: Record<MotionType, (m: number, a: number, pw: number, ph: number, time: number) => Partial<Pose>> = {
  none: () => ({}),
  'zoom-in': (m, a) => ({ scale: 1 + a * m }),
  'zoom-out': (m, a) => ({ scale: 1 + a * (1 - m) }),
  // "Short" zooms happen in the first third, then hold — punchy, MVM-style.
  'zoom-in-short': (m, a) => ({ scale: 1 + a * getEase('expo.out')(clamp(m * 3, 0, 1)) }),
  'zoom-out-short': (m, a) => ({ scale: 1 + a * (1 - getEase('expo.out')(clamp(m * 3, 0, 1))) }),
  'pan-left': (m, a, pw) => ({ dx: (0.5 - m) * a * pw }),
  'pan-right': (m, a, pw) => ({ dx: (m - 0.5) * a * pw }),
  'pan-up': (m, a, _pw, ph) => ({ dy: (0.5 - m) * a * ph }),
  'pan-down': (m, a, _pw, ph) => ({ dy: (m - 0.5) * a * ph }),
  // Slide + turn: travels sideways while rotating.
  'turn-left': (m, a, pw) => ({ dx: (0.5 - m) * a * pw * 0.6, rotation: (0.5 - m) * a * 0.5 }),
  'turn-right': (m, a, pw) => ({ dx: (m - 0.5) * a * pw * 0.6, rotation: (m - 0.5) * a * 0.5 }),
  swing: (m, a) => ({ rotation: Math.sin(m * Math.PI * 2) * a * 0.18 }),
  // Spin: up to a full turn at 100%.
  spiral: (m, a) => ({ rotation: m * a * Math.PI * 2 }),
  handheld: (_m, a, pw, _ph, time) => {
    // Smooth pseudo-random sway from summed sines (deterministic per frame).
    const x = Math.sin(time * 1.7) + 0.5 * Math.sin(time * 3.1 + 1.3);
    const y = Math.sin(time * 1.3 + 2.1) + 0.5 * Math.sin(time * 2.7);
    const k = 0.4 + a;
    return { dx: x * pw * 0.012 * k, dy: y * pw * 0.012 * k, rotation: x * 0.006 * k };
  },
  drift: (m, a, pw) => ({
    dx: Math.sin(m * Math.PI * 2) * a * pw * 0.15,
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

/* ---------- Drawn paths ---------- */

interface PathTable {
  points: PathPoint[];
  /** Cumulative length at each point, normalised so the last is 1. */
  lengths: number[];
}

const pathCache = new WeakMap<readonly PathPoint[], PathTable>();
const SPLINE_STEPS = 12;

/** Smooths the drawn points with a Catmull-Rom spline and measures it, so the move has an even speed. */
function pathTable(path: readonly PathPoint[]): PathTable {
  const cached = pathCache.get(path);
  if (cached) return cached;
  const points: PathPoint[] = [];
  if (path.length < 3) points.push(...path);
  else {
    for (let i = 0; i < path.length - 1; i += 1) {
      const p0 = path[Math.max(0, i - 1)];
      const p1 = path[i];
      const p2 = path[i + 1];
      const p3 = path[Math.min(path.length - 1, i + 2)];
      for (let s = 0; s < SPLINE_STEPS; s += 1) {
        const t = s / SPLINE_STEPS;
        const t2 = t * t;
        const t3 = t2 * t;
        const f = (a: number, b: number, c: number, d: number) =>
          0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        points.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
      }
    }
    points.push(path[path.length - 1]);
  }
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = lengths[lengths.length - 1] || 1;
  const table = { points, lengths: lengths.map((l) => l / total) };
  pathCache.set(path, table);
  return table;
}

/** Position along a drawn path at progress `m` (0–1), as a frame fraction. */
export function pointOnPath(path: readonly PathPoint[] | undefined, m: number): PathPoint {
  if (!path || path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1) return path[0];
  const { points, lengths } = pathTable(path);
  const t = clamp(m, 0, 1);
  const i = Math.max(0, Math.min(points.length - 2, lastIndexAtOrBefore(lengths, t)));
  const span = lengths[i + 1] - lengths[i] || 1;
  const f = clamp((t - lengths[i]) / span, 0, 1);
  return { x: points[i].x + (points[i + 1].x - points[i].x) * f, y: points[i].y + (points[i + 1].y - points[i].y) * f };
}

/** Densely sampled path for drawing it on the preview. */
export function samplePath(path: readonly PathPoint[]): PathPoint[] {
  return path.length < 2 ? [...path] : pathTable(path).points;
}

/** Drops points that add nothing to the shape (Ramer–Douglas–Peucker), so a freehand stroke stays light and editable. */
export function simplifyPath(points: readonly PathPoint[], tolerance = 0.006): PathPoint[] {
  if (points.length < 3) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const pa = points[a];
    const pb = points[b];
    const len = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1e-9;
    let worst = -1;
    let index = -1;
    for (let i = a + 1; i < b; i += 1) {
      const d = Math.abs((pb.x - pa.x) * (pa.y - points[i].y) - (pa.x - points[i].x) * (pb.y - pa.y)) / len;
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/* ---------- Motion stack ---------- */

/** Progress (0–1) of one layer at `local` seconds into a clip of `duration` seconds. */
export function layerProgress(layer: MotionLayer, local: number, duration: number, clipStart: number, beats: readonly number[]): number {
  const from = clamp(Math.min(layer.from, layer.to), 0, 1) * duration;
  const to = clamp(Math.max(layer.from, layer.to), 0, 1) * duration;
  const span = Math.max(to - from, 1e-3);
  const repeat = Math.max(1, Math.round(layer.repeat));
  const t = clamp((local - from) / span, 0, 1) * repeat;
  // Which pass we're in and how far through it (the very end holds the last pass's end).
  const pass = Math.min(repeat - 1, Math.floor(t));
  let f = t - pass;
  if (layer.yoyo && pass % 2 === 1) f = 1 - f;
  const passLength = span / repeat;
  return pacedProgress(layer.curve, f * passLength, passLength, clipStart + from + pass * passLength, beats);
}

/** All of a clip's moves combined, for a picture `pw` × `ph` px in a `W` × `H` frame. */
export function motionPose(
  layers: readonly MotionLayer[],
  local: number,
  duration: number,
  clipStart: number,
  beats: readonly number[],
  size: { pw: number; ph: number; W: number; H: number },
  time: number,
): Partial<Pose>[] {
  return layers.map((layer) => {
    const m = layerProgress(layer, local, duration, clipStart, beats);
    if (layer.type === 'path') {
      const p = pointOnPath(layer.path, m);
      return { dx: p.x * layer.amount * size.W, dy: p.y * layer.amount * size.H };
    }
    return MOTIONS[layer.type](m, layer.amount, size.pw, size.ph, time);
  });
}
