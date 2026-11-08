import type { LyricWord } from '../types/project';

/** Speech models that can return word-level timestamps (they ship cross-attention alignment heads). */
export const LYRIC_MODELS = {
  fast: { id: 'onnx-community/whisper-tiny_timestamped', label: 'Fast', size: '≈ 65 MB' },
  accurate: { id: 'onnx-community/whisper-base_timestamped', label: 'Accurate', size: '≈ 140 MB' },
} as const;

export type LyricModel = keyof typeof LYRIC_MODELS;

/** Whisper expects 16 kHz mono. */
export const SPEECH_SAMPLE_RATE = 16000;

export interface TranscribeRequest {
  id: number;
  samples: Float32Array;
  model: LyricModel;
  /** ISO code, or 'auto' to let the model detect it. */
  language: string;
}

export type LyricsWorkerMessage =
  | { id: number; type: 'download'; progress: number }
  | { id: number; type: 'transcribing' }
  | { id: number; type: 'done'; words: LyricWord[]; device: string }
  | { id: number; type: 'error'; error: string };
