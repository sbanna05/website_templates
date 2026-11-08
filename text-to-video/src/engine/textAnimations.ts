import { seededRandom } from '../lib/math';
import type { TextInAnimation, TextLoopAnimation, TextOutAnimation } from '../types/project';
import type { BeatState } from './beats';
import type { Pose } from './types';

/** Extra per-unit channels on top of a geometric pose. */
export interface UnitPose extends Partial<Pose> {
  /** 0–1 fraction of characters revealed (typewriter). */
  reveal?: number;
  /** 0–1, switches to the highlight colour (karaoke). */
  highlight?: number;
  /** 0–1 chromatic split strength (glitch). */
  split?: number;
}

export interface InContext {
  /** Linear, unclamped progress through this unit's entrance. */
  raw: number;
  /** Seconds since this unit's entrance began (negative = not yet). */
  since: number;
  /** Seconds until the next unit begins. */
  span: number;
  fontPx: number;
  seed: number;
  time: number;
}

export interface LoopContext {
  time: number;
  index: number;
  fontPx: number;
  beat: BeatState;
}

const appear = (raw: number, speed = 3) => Math.min(1, Math.max(0, raw * speed));

/**
 * Strategy tables: adding an animation means adding one entry here — the
 * renderer never needs to change (open/closed). `p` is the eased progress.
 */
export const IN_ANIMATIONS: Record<TextInAnimation, (p: number, c: InContext) => UnitPose> = {
  none: (_p, c) => ({ opacity: c.since < 0 ? 0 : 1 }),
  fade: (p) => ({ opacity: p }),
  pop: (p, c) => ({ scale: Math.max(0, p), opacity: appear(c.raw, 4) }),
  typewriter: (_p, c) => ({ opacity: c.since < 0 ? 0 : 1, reveal: Math.min(1, Math.max(0, c.raw)) }),
  'slide-up': (p, c) => ({ dy: (1 - p) * c.fontPx * 0.6, opacity: appear(c.raw, 2) }),
  'slide-down': (p, c) => ({ dy: -(1 - p) * c.fontPx * 0.6, opacity: appear(c.raw, 2) }),
  'blur-in': (p, c) => ({ blur: (1 - p) * c.fontPx * 0.22, opacity: p, scale: 1 + (1 - p) * 0.15 }),
  bounce: (p, c) => ({ dy: -(1 - p) * c.fontPx * 1.1, opacity: appear(c.raw) }),
  drop: (p, c) => ({ dy: -(1 - p) * c.fontPx * 2.2, rotation: (1 - p) * -0.35, opacity: appear(c.raw) }),
  'rotate-in': (p) => ({ rotation: (1 - p) * -0.7, scale: 0.6 + 0.4 * p, opacity: p }),
  stretch: (p, c) => ({ scaleX: 1 + (1 - p) * 1.6, scaleY: 0.25 + 0.75 * p, opacity: appear(c.raw) }),
  'glitch-in': (p, c) => {
    if (c.since < 0) return { opacity: 0 };
    if (c.raw >= 1) return {};
    const tick = Math.floor(c.time * 30);
    const flicker = seededRandom(tick * 13 + c.seed) > 0.35 ? 1 : 0.15;
    return {
      opacity: flicker,
      dx: (seededRandom(tick * 7 + c.seed) - 0.5) * c.fontPx * 0.5 * (1 - p),
      split: 1 - p,
    };
  },
  karaoke: (_p, c) => {
    const active = c.since >= 0 && c.since < c.span;
    return { opacity: c.since < 0 ? 0.45 : 1, highlight: active ? 1 : 0, scale: active ? 1.07 : 1 };
  },
};

/** `q` runs 0 → 1 as the unit leaves. */
export const OUT_ANIMATIONS: Record<TextOutAnimation, (q: number, fontPx: number) => UnitPose> = {
  none: () => ({}),
  fade: (q) => ({ opacity: 1 - q }),
  pop: (q) => ({ scale: 1 - q, opacity: 1 - q * q }),
  'slide-up': (q, f) => ({ dy: -q * f * 0.6, opacity: 1 - q }),
  'slide-down': (q, f) => ({ dy: q * f * 0.6, opacity: 1 - q }),
  'blur-out': (q, f) => ({ blur: q * f * 0.22, opacity: 1 - q }),
  shrink: (q) => ({ scale: 1 - q * 0.6, opacity: 1 - q }),
};

export const LOOP_ANIMATIONS: Record<TextLoopAnimation, (c: LoopContext) => UnitPose> = {
  none: () => ({}),
  'beat-pulse': ({ beat }) => ({ scale: 1 + 0.18 * beat.pulse }),
  'beat-shake': ({ beat, index, fontPx }) => ({
    dx: (seededRandom(beat.index * 31 + index) - 0.5) * fontPx * 0.16 * beat.pulse,
    dy: (seededRandom(beat.index * 17 + index * 3) - 0.5) * fontPx * 0.16 * beat.pulse,
    rotation: (seededRandom(beat.index * 5 + index) - 0.5) * 0.12 * beat.pulse,
  }),
  wave: ({ time, index, fontPx }) => ({ dy: Math.sin(time * 4.5 + index * 0.6) * fontPx * 0.08 }),
  float: ({ time, index, fontPx }) => ({ dy: Math.sin(time * 1.6 + index * 0.35) * fontPx * 0.05 }),
  breathe: ({ time }) => ({ scale: 1 + Math.sin(time * 2.2) * 0.035 }),
  flicker: ({ time, index }) => ({ opacity: 0.7 + 0.3 * seededRandom(Math.floor(time * 12) * 11 + index) }),
  jitter: ({ time, index, fontPx }) => {
    const tick = Math.floor(time * 15);
    const glitching = seededRandom(tick * 3 + index) > 0.92;
    return {
      dx: (seededRandom(tick * 7 + index) - 0.5) * fontPx * 0.04,
      dy: (seededRandom(tick * 9 + index) - 0.5) * fontPx * 0.04,
      split: glitching ? 0.8 : 0,
    };
  },
};
