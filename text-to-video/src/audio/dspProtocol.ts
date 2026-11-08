import type { BeatAnalysis } from '../types/project';

export type DspRequest =
  | { id: number; type: 'beats'; samples: Float32Array; sampleRate: number }
  | { id: number; type: 'stretch'; channels: Float32Array[]; tempo: number; pitch: number };

export type DspResponse =
  | { id: number; ok: true; type: 'beats'; result: BeatAnalysis }
  | { id: number; ok: true; type: 'stretch'; channels: Float32Array[] }
  | { id: number; ok: false; error: string };
