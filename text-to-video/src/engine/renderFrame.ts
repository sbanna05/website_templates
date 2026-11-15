import { REFERENCE_SHORT_SIDE } from '../config/canvas';
import { drawTextClip } from './drawText';
import { drawVisualClip } from './drawVisual';
import { activeClipsInRenderOrder, sourceTimeAt } from './timeline';
import type { Hitbox, RenderEnv, RenderOptions } from './types';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Draws one frame of the project. Pure with respect to its inputs: the same
 * options always produce the same pixels, which is what keeps the live
 * preview and the exported MP4 identical.
 */
export function renderFrame(ctx: Ctx, options: RenderOptions): Hitbox[] {
  const { project, time, width, height, frames, beats } = options;
  const env: RenderEnv = { width, height, time, beats, unit: Math.min(width, height) / REFERENCE_SHORT_SIDE };

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.fillStyle = project.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const hitboxes: Hitbox[] = [];
  for (const clip of activeClipsInRenderOrder(project, time)) {
    if (clip.kind === 'visual') {
      const source = frames.get(clip, sourceTimeAt(clip, time));
      if (source) hitboxes.push(drawVisualClip(ctx, clip, source, env));
    } else if (clip.kind === 'text' && clip.text.trim()) {
      hitboxes.push(drawTextClip(ctx, clip, env));
    }
  }
  ctx.restore();
  // Topmost first, so hit-testing picks what the user sees on top.
  return hitboxes.reverse();
}

/** Point-in-rotated-rectangle test. */
export function hitTest(hitboxes: readonly Hitbox[], x: number, y: number): Hitbox | undefined {
  return hitboxes.find((box) => {
    const cos = Math.cos(-box.rotation);
    const sin = Math.sin(-box.rotation);
    const dx = x - box.cx;
    const dy = y - box.cy;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    return Math.abs(lx) <= box.width / 2 && Math.abs(ly) <= box.height / 2;
  });
}
