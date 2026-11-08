import type { TransitionType } from '../types/project';
import type { Pose } from './types';

export interface TransitionPose extends Partial<Pose> {
  /** 0–1 white-ish overlay. */
  flash?: number;
}

/**
 * `p` runs 0 → 1 as the clip becomes fully visible. Transition-out reuses the
 * same table by feeding the reversed progress, so each effect is defined once.
 */
export const TRANSITIONS: Record<TransitionType, (p: number, width: number, height: number) => TransitionPose> = {
  none: () => ({}),
  fade: (p) => ({ opacity: p }),
  'zoom-punch': (p) => ({ scale: 1 + (1 - p) * 0.45, opacity: Math.min(1, p * 3) }),
  'zoom-out': (p) => ({ scale: 1 - (1 - p) * 0.3, opacity: p }),
  'slide-left': (p, w) => ({ dx: (1 - p) * w }),
  'slide-right': (p, w) => ({ dx: -(1 - p) * w }),
  'slide-up': (p, _w, h) => ({ dy: (1 - p) * h }),
  blur: (p, w) => ({ blur: (1 - p) * w * 0.03, opacity: Math.min(1, p * 2) }),
  flash: (p) => ({ flash: 1 - p }),
  spin: (p) => ({ rotation: (1 - p) * -Math.PI * 0.5, scale: 0.4 + 0.6 * p, opacity: p }),
  whip: (p, w) => ({ dx: (1 - p) * w * 0.6, blur: (1 - p) * w * 0.025 }),
  'slide-down': (p, _w, h) => ({ dy: -(1 - p) * h }),
  'turn-left': (p, w) => ({ dx: (1 - p) * w * 0.8, rotation: (1 - p) * 0.5, opacity: Math.min(1, p * 2) }),
  'turn-right': (p, w) => ({ dx: -(1 - p) * w * 0.8, rotation: -(1 - p) * 0.5, opacity: Math.min(1, p * 2) }),
  'squeeze-h': (p) => ({ scaleX: Math.max(0.001, p), opacity: Math.min(1, p * 3) }),
  'squeeze-v': (p) => ({ scaleY: Math.max(0.001, p), opacity: Math.min(1, p * 3) }),
  'zoom-spin': (p) => ({ scale: 1 + (1 - p) * 1.2, rotation: (1 - p) * Math.PI, opacity: p }),
};
