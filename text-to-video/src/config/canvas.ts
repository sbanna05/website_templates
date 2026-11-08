import type { AspectRatio } from '../types/project';

export interface FrameSize {
  width: number;
  height: number;
}

/** Export resolutions keyed by the short side ("1080p" → 1080 short side). */
export function frameSizeFor(aspect: AspectRatio, shortSide: number): FrameSize {
  const [w, h] = aspect.split(':').map(Number);
  const even = (n: number) => Math.round(n / 2) * 2; // H.264 requires even dimensions
  return w >= h
    ? { width: even((shortSide * w) / h), height: shortSide }
    : { width: shortSide, height: even((shortSide * h) / w) };
}

export const ASPECT_OPTIONS: { label: string; value: AspectRatio; hint: string }[] = [
  { label: '9:16', value: '9:16', hint: 'TikTok · Reels · Shorts' },
  { label: '16:9', value: '16:9', hint: 'YouTube' },
  { label: '1:1', value: '1:1', hint: 'Feed' },
  { label: '4:5', value: '4:5', hint: 'Portrait feed' },
];

/** Style sizes (font size, stroke…) are authored against a 1080px short side. */
export const REFERENCE_SHORT_SIDE = 1080;
