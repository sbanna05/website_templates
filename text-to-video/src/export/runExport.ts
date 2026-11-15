import type { Asset, Project } from '../types/project';
import { ensureAudioEncoder, exportAudio } from './exportAudio';
import { exportGif } from './exportGif';
import { exportStill } from './exportStill';
import { exportVideo, isVideoExportSupported } from './exportVideo';
import type { AudioExportSettings, ExportKind, ExportRequest, ProgressCallback } from './formats';

/**
 * Single entry point for every export format. The dialog loads this module on
 * demand, which keeps all encoders (Mediabunny, LAME, FLAC, gifenc) out of the
 * editor bundle.
 */
export function runExport(
  request: ExportRequest,
  project: Project,
  assets: Record<string, Asset>,
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<Blob> {
  switch (request.kind) {
    case 'video':
      return exportVideo(project, assets, request, onProgress, signal);
    case 'animation':
      return exportGif(project, assets, request, onProgress, signal);
    case 'audio':
      return exportAudio(project, assets, request, onProgress, signal);
    case 'image':
      return exportStill(project, assets, request, onProgress, signal);
  }
}

/** Returns a user-facing reason when this browser can't produce the requested format, otherwise null. */
export async function checkExportSupport(kind: ExportKind, audio: AudioExportSettings): Promise<string | null> {
  switch (kind) {
    case 'video':
      return isVideoExportSupported()
        ? null
        : "Your browser doesn't support WebCodecs, which in-browser video export needs. Try a recent Chrome, Edge or Safari.";
    case 'audio':
      return ensureAudioEncoder(audio);
    case 'animation':
    case 'image':
      return null; // Canvas-only; video clips report decode problems at export time.
  }
}
