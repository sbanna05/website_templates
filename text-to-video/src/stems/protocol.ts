import type { StemName } from '../types/project';

/** HTDemucs (Meta's hybrid transformer Demucs) exported to ONNX — four stems, 44.1 kHz stereo. */
export const STEM_MODEL = {
  url: 'https://huggingface.co/timcsy/demucs-web-onnx/resolve/main/htdemucs_embedded.onnx',
  label: 'HTDemucs',
  sizeMb: 172,
  sampleRate: 44100,
} as const;

/** Browser cache the model is kept in, so it downloads once. Bump the version to force a refresh. */
export const MODEL_CACHE = 'articvid-models-v1';

export interface StereoPcm {
  left: Float32Array;
  right: Float32Array;
}

export interface SeparateRequest {
  id: number;
  left: Float32Array;
  right: Float32Array;
}

export type StemsWorkerMessage =
  | { id: number; type: 'download'; loaded: number; total: number }
  | { id: number; type: 'loading'; device: 'webgpu' | 'wasm' }
  | { id: number; type: 'progress'; progress: number }
  | { id: number; type: 'done'; stems: Record<StemName, StereoPcm> }
  | { id: number; type: 'error'; error: string };
