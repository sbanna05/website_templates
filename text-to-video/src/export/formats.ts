/**
 * Export format catalogue and request types. Kept free of encoder imports so
 * the editor bundle can describe formats without loading Mediabunny/gifenc.
 */

export type ExportKind = 'video' | 'animation' | 'audio' | 'image';

export type VideoFormatId = 'mp4' | 'webm' | 'mov';
export type AudioFormatId = 'wav' | 'mp3' | 'm4a' | 'ogg' | 'flac';
export type ExportFormatId = VideoFormatId | AudioFormatId | 'gif' | 'png';

export interface ExportFormatInfo {
  id: ExportFormatId;
  kind: ExportKind;
  label: string;
  extension: string;
  mimeType: string;
  /** One-line "when to pick this" shown under the picker. */
  hint: string;
}

export const EXPORT_FORMATS: Record<ExportFormatId, ExportFormatInfo> = {
  mp4: { id: 'mp4', kind: 'video', label: 'MP4', extension: 'mp4', mimeType: 'video/mp4', hint: 'H.264 + AAC — plays everywhere, best for social uploads.' },
  webm: { id: 'webm', kind: 'video', label: 'WebM', extension: 'webm', mimeType: 'video/webm', hint: 'VP9/AV1 + Opus — open format, great for the web.' },
  mov: { id: 'mov', kind: 'video', label: 'MOV', extension: 'mov', mimeType: 'video/quicktime', hint: 'QuickTime container — handy for Apple editing apps.' },
  gif: { id: 'gif', kind: 'animation', label: 'GIF', extension: 'gif', mimeType: 'image/gif', hint: 'Silent looping animation — 256 colours per frame, keep it short.' },
  wav: { id: 'wav', kind: 'audio', label: 'WAV', extension: 'wav', mimeType: 'audio/wav', hint: 'Uncompressed PCM — lossless master for further editing.' },
  flac: { id: 'flac', kind: 'audio', label: 'FLAC', extension: 'flac', mimeType: 'audio/flac', hint: 'Lossless and about half the size of WAV.' },
  mp3: { id: 'mp3', kind: 'audio', label: 'MP3', extension: 'mp3', mimeType: 'audio/mpeg', hint: 'Universal lossy audio — plays on anything.' },
  m4a: { id: 'm4a', kind: 'audio', label: 'M4A', extension: 'm4a', mimeType: 'audio/mp4', hint: 'AAC audio — smaller than MP3 at the same quality.' },
  ogg: { id: 'ogg', kind: 'audio', label: 'OGG', extension: 'ogg', mimeType: 'audio/ogg', hint: 'Opus audio — the most efficient lossy codec.' },
  png: { id: 'png', kind: 'image', label: 'PNG', extension: 'png', mimeType: 'image/png', hint: 'Lossless still of the frame under the playhead — thumbnails, covers.' },
};

export const KIND_LABEL: Record<ExportKind, string> = {
  video: 'Video',
  animation: 'GIF',
  audio: 'Audio',
  image: 'Still',
};

export const formatsOfKind = (kind: ExportKind): ExportFormatInfo[] =>
  Object.values(EXPORT_FORMATS).filter((format) => format.kind === kind);

export const isLosslessAudio = (format: AudioFormatId): boolean => format === 'wav' || format === 'flac';

export type VideoQuality = 'medium' | 'high' | 'very-high';

export interface VideoExportSettings {
  format: VideoFormatId;
  shortSide: 720 | 1080 | 1440 | 2160;
  fps: 24 | 30 | 60;
  quality: VideoQuality;
}

export interface GifExportSettings {
  shortSide: 320 | 480 | 720;
  fps: 10 | 15 | 20 | 25;
  /** Ordered dithering: smoother gradients, slightly larger files. */
  dither: boolean;
}

export interface AudioExportSettings {
  format: AudioFormatId;
  /** Lossless formats only. */
  bitDepth: 16 | 24;
  /** Lossy formats only, in kbit/s. */
  bitrateKbps: 128 | 192 | 256 | 320;
}

export interface StillExportSettings {
  shortSide: 720 | 1080 | 1440 | 2160;
}

export type ExportRequest =
  | ({ kind: 'video' } & VideoExportSettings)
  | ({ kind: 'animation'; format: 'gif' } & GifExportSettings)
  | ({ kind: 'audio' } & AudioExportSettings)
  | ({ kind: 'image'; format: 'png'; time: number } & StillExportSettings);

export type ExportPhase = 'preparing' | 'audio' | 'video' | 'encoding' | 'finalizing';

export interface ExportProgress {
  phase: ExportPhase;
  /** 0–1 overall. */
  progress: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;

/** Output sample rate for every export; matches the video pipeline. */
export const EXPORT_SAMPLE_RATE = 48000;
