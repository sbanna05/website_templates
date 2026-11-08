declare module 'demucs-web' {
  import type * as ort from 'onnxruntime-web';

  export interface StereoTrack {
    left: Float32Array;
    right: Float32Array;
  }

  export interface SeparationResult {
    drums: StereoTrack;
    bass: StereoTrack;
    other: StereoTrack;
    vocals: StereoTrack;
  }

  export interface DemucsProcessorOptions {
    ort: typeof ort;
    modelPath?: string;
    sessionOptions?: ort.InferenceSession.SessionOptions;
    onProgress?: (info: { progress: number; currentSegment: number; totalSegments: number }) => void;
    onLog?: (phase: string, message: string) => void;
    onDownloadProgress?: (loaded: number, total: number) => void;
  }

  export class DemucsProcessor {
    constructor(options: DemucsProcessorOptions);
    loadModel(pathOrBuffer?: string | ArrayBuffer): Promise<ort.InferenceSession>;
    separate(left: Float32Array, right: Float32Array): Promise<SeparationResult>;
  }

  export const CONSTANTS: {
    SAMPLE_RATE: number;
    TRAINING_SAMPLES: number;
    TRACKS: readonly string[];
    DEFAULT_MODEL_URL: string;
  };
}
