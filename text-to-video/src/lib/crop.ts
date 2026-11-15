import type { Crop } from '../types/project';
import { clamp } from './math';

/** Largest crop of pixel aspect `ratio` centred on the current crop's centre. */
export function cropForRatio(current: Crop, ratio: number, assetAspect: number): Crop {
  // In normalised units, height = width × assetAspect / ratio.
  const k = assetAspect / ratio;
  let width = 1;
  let height = k;
  if (height > 1) {
    height = 1;
    width = 1 / k;
  }
  const cx = current.x + current.width / 2;
  const cy = current.y + current.height / 2;
  return {
    width,
    height,
    x: clamp(cx - width / 2, 0, 1 - width),
    y: clamp(cy - height / 2, 0, 1 - height),
  };
}
