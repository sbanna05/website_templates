import { frameSizeFor } from '../config/canvas';
import { projectDuration } from '../engine/timeline';
import type { Asset, Project } from '../types/project';
import { EXPORT_FORMATS, type ProgressCallback, type StillExportSettings } from './formats';
import { TimelineRenderer, throwIfAborted } from './shared';

/** Millisecond frame grid: the still lands within 1 ms of the requested time. */
const STILL_FPS = 1000;

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))), type);
  });
}

/** Renders a single frame at full export resolution as a lossless PNG. */
export async function exportStill(
  project: Project,
  assets: Record<string, Asset>,
  settings: StillExportSettings & { time: number },
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<Blob> {
  const { width, height } = frameSizeFor(project.aspect, settings.shortSide);
  const lastFrame = Math.max(0, Math.ceil(projectDuration(project) * STILL_FPS) - 1);
  const frame = Math.min(lastFrame, Math.max(0, Math.round(settings.time * STILL_FPS)));

  onProgress({ phase: 'preparing', progress: 0 });
  const renderer = await TimelineRenderer.create(project, assets, { width, height, fps: STILL_FPS, startFrame: frame, endFrame: frame + 1 });
  try {
    throwIfAborted(signal);
    onProgress({ phase: 'video', progress: 0.4 });
    await renderer.render(frame);
    onProgress({ phase: 'encoding', progress: 0.8 });
    const blob = await canvasToBlob(renderer.canvas, EXPORT_FORMATS.png.mimeType);
    onProgress({ phase: 'finalizing', progress: 1 });
    return blob;
  } finally {
    await renderer.dispose();
  }
}
