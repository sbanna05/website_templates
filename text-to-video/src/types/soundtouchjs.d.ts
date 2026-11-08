declare module 'soundtouchjs' {
  export interface SampleSource {
    extract(target: Float32Array, numFrames: number, position: number): number;
  }
  export class SoundTouch {
    tempo: number;
    pitch: number;
    rate: number;
  }
  export class SimpleFilter {
    constructor(source: SampleSource, pipe: SoundTouch, callback?: () => void);
    extract(target: Float32Array, numFrames: number): number;
  }
}
