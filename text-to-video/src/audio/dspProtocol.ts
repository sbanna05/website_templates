import type { BeatAnalysis, HarmonyAnalysis } from '../types/project';

export type DspRequest =
  | { id: number; type: 'beats'; samples: Float32Array; sampleRate: number }
  | { id: number; type: 'analyze'; samples: Float32Array; sampleRate: number }
  | { id: number; type: 'harmony'; samples: Float32Array; sampleRate: number; beats: number[]; source: HarmonyAnalysis['source'] }
  | { id: number; type: 'stretch'; channels: Float32Array[]; tempo: number; pitch: number };

export type DspResponse =
  | { id: number; ok: true; type: 'beats'; result: BeatAnalysis }
  | { id: number; ok: true; type: 'analyze'; beats: BeatAnalysis; harmony: HarmonyAnalysis }
  | { id: number; ok: true; type: 'harmony'; harmony: HarmonyAnalysis }
  | { id: number; ok: true; type: 'stretch'; channels: Float32Array[] }
  | { id: number; ok: false; error: string };
