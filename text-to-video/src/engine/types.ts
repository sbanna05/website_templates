import type { Asset, Project, VisualClip } from '../types/project';

/** Supplies the pixels of a visual clip at a given source time. Preview and export implement this differently. */
export interface FrameSource {
  get(clip: VisualClip, sourceTime: number): CanvasImageSource | null;
}

export interface RenderEnv {
  width: number;
  height: number;
  /** Multiplier from 1080-reference units to canvas pixels. */
  unit: number;
  time: number;
  beats: readonly number[];
}

export interface RenderOptions {
  project: Project;
  assets: Record<string, Asset>;
  time: number;
  width: number;
  height: number;
  frames: FrameSource;
  beats: readonly number[];
}

/** Rotated rectangle in canvas pixels, used for on-canvas selection and dragging. */
export interface Hitbox {
  clipId: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
}

/** Visual adjustments produced by animations, transitions and beat effects. */
export interface Pose {
  opacity: number;
  dx: number;
  dy: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  blur: number;
}

export const IDENTITY_POSE: Pose = { opacity: 1, dx: 0, dy: 0, scale: 1, scaleX: 1, scaleY: 1, rotation: 0, blur: 0 };

/** Composes poses: multiplies opacity/scale, adds offsets/rotation/blur. */
export function combinePoses(base: Pose, ...parts: Partial<Pose>[]): Pose {
  return parts.reduce<Pose>(
    (acc, p) => ({
      opacity: acc.opacity * (p.opacity ?? 1),
      dx: acc.dx + (p.dx ?? 0),
      dy: acc.dy + (p.dy ?? 0),
      scale: acc.scale * (p.scale ?? 1),
      scaleX: acc.scaleX * (p.scaleX ?? 1),
      scaleY: acc.scaleY * (p.scaleY ?? 1),
      rotation: acc.rotation + (p.rotation ?? 0),
      blur: acc.blur + (p.blur ?? 0),
    }),
    base,
  );
}
