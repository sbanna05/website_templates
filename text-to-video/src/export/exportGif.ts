import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { frameSizeFor } from '../config/canvas';
import { projectDuration } from '../engine/timeline';
import type { Asset, Project } from '../types/project';
import { EXPORT_FORMATS, type GifExportSettings, type ProgressCallback } from './formats';
import { TimelineRenderer, throwIfAborted, yieldToMain } from './shared';

/** 4×4 Bayer matrix, centred around zero (−0.5…0.47). */
const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
/** Roughly one RGB565 quantisation step; enough to break up banding without visible noise. */
const DITHER_STRENGTH = 8;

/**
 * Ordered (Bayer) dithering in place. Unlike error diffusion it's stable from
 * frame to frame, so static areas don't shimmer — important for GIF.
 */
function orderedDither(rgba: Uint8ClampedArray, width: number, height: number): void {
  for (let y = 0; y < height; y += 1) {
    const row = (y & 3) * 4;
    for (let x = 0; x < width; x += 1) {
      const offset = BAYER_4[row + (x & 3)] * DITHER_STRENGTH;
      const i = (y * width + x) * 4;
      rgba[i] += offset; // Uint8ClampedArray clamps for us.
      rgba[i + 1] += offset;
      rgba[i + 2] += offset;
    }
  }
}

function samePixels(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  const wa = new Uint32Array(a.buffer, a.byteOffset, a.length >> 2);
  const wb = new Uint32Array(b.buffer, b.byteOffset, b.length >> 2);
  for (let i = 0; i < wa.length; i += 1) if (wa[i] !== wb[i]) return false;
  return true;
}

/**
 * GIF delays are whole centiseconds. Rounding the cumulative timestamp (not
 * each delay) keeps total duration exact, e.g. 15 fps → 7, 6, 7, 7, 6, 7…
 */
const centisecondsAt = (frame: number, fps: number): number => Math.round((frame * 100) / fps);

/** Renders the timeline to a looping GIF with a per-frame (local) palette. */
export async function exportGif(
  project: Project,
  assets: Record<string, Asset>,
  settings: GifExportSettings,
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<Blob> {
  const { width, height } = frameSizeFor(project.aspect, settings.shortSide);
  const { fps } = settings;
  const totalFrames = Math.ceil(projectDuration(project) * fps);
  if (totalFrames === 0) throw new Error('The timeline is empty — add a clip first.');

  onProgress({ phase: 'preparing', progress: 0 });
  const renderer = await TimelineRenderer.create(project, assets, { width, height, fps, endFrame: totalFrames, readback: true });
  const gif = GIFEncoder();

  // Identical consecutive frames (held titles, pauses) are merged into one longer frame.
  let pending: { pixels: Uint8ClampedArray; startFrame: number } | null = null;
  const flush = (endFrame: number) => {
    if (!pending) return;
    const pixels = new Uint8ClampedArray(pending.pixels);
    if (settings.dither) orderedDither(pixels, width, height);
    const palette = quantize(pixels, 256);
    const index = applyPalette(pixels, palette);
    const delayCs = centisecondsAt(endFrame, fps) - centisecondsAt(pending.startFrame, fps);
    gif.writeFrame(index, width, height, { palette, delay: delayCs * 10, repeat: 0 });
  };

  try {
    for (let f = 0; f < totalFrames; f += 1) {
      throwIfAborted(signal);
      await renderer.render(f);
      const { data } = renderer.ctx.getImageData(0, 0, width, height);
      if (!pending || !samePixels(pending.pixels, data)) {
        flush(f);
        pending = { pixels: data, startFrame: f };
      }
      onProgress({ phase: 'video', progress: 0.02 + 0.93 * (f / totalFrames) });
      await yieldToMain(); // quantising is synchronous; keep the UI (and Cancel) responsive
    }
    flush(totalFrames);
  } finally {
    await renderer.dispose();
  }

  onProgress({ phase: 'finalizing', progress: 0.98 });
  gif.finish();
  onProgress({ phase: 'finalizing', progress: 1 });
  return new Blob([gif.bytes()], { type: EXPORT_FORMATS.gif.mimeType });
}
