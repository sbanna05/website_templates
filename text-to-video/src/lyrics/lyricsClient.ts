import type { LyricWord } from '../types/project';
import { SPEECH_SAMPLE_RATE, type LyricModel, type LyricsWorkerMessage } from './protocol';

export type LyricsProgress = { stage: 'download'; progress: number } | { stage: 'transcribing' };

export interface TranscribeOptions {
  model: LyricModel;
  language: string;
  /** Band-pass the centre channel first — helps the model hear vocals over a beat. */
  vocalFocus: boolean;
  onProgress?: (progress: LyricsProgress) => void;
}

/**
 * Cuts `from…to` (source seconds) out of a buffer and renders it as 16 kHz mono,
 * optionally isolating the vocal band. OfflineAudioContext does the resampling.
 */
export async function prepareSpeech(buffer: AudioBuffer, from: number, to: number, vocalFocus: boolean): Promise<Float32Array> {
  const seconds = Math.max(0.1, Math.min(to, buffer.duration) - from);
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * SPEECH_SAMPLE_RATE), SPEECH_SAMPLE_RATE);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  let node: AudioNode = source;
  if (vocalFocus) {
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 150;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 5000;
    node = node.connect(highpass).connect(lowpass);
  }
  node.connect(ctx.destination); // stereo → mono down-mix is L+R, i.e. the centre channel
  source.start(0, from, seconds);
  return (await ctx.startRendering()).getChannelData(0);
}

/** Promise façade over the lyrics worker. The worker (and its model) is created on first use only. */
class LyricsClient {
  private worker: Worker | null = null;
  private nextId = 1;

  private getWorker(): Worker {
    this.worker ??= new Worker(new URL('./lyrics.worker.ts', import.meta.url), { type: 'module' });
    return this.worker;
  }

  /** Words with times in seconds from the start of `samples`. */
  transcribe(samples: Float32Array, options: Omit<TranscribeOptions, 'vocalFocus'>): Promise<LyricWord[]> {
    const id = this.nextId++;
    const worker = this.getWorker();
    return new Promise((resolve, reject) => {
      const onCrash = (event: ErrorEvent) => {
        event.preventDefault();
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onCrash);
        this.worker?.terminate();
        this.worker = null;
        reject(new Error(event.message || 'The speech worker stopped unexpectedly'));
      };
      const onMessage = ({ data }: MessageEvent<LyricsWorkerMessage>) => {
        if (data.id !== id) return;
        if (data.type === 'download') options.onProgress?.({ stage: 'download', progress: data.progress });
        else if (data.type === 'transcribing') options.onProgress?.({ stage: 'transcribing' });
        else {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onCrash);
          if (data.type === 'done') resolve(data.words);
          else reject(new Error(data.error));
        }
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onCrash);
      worker.postMessage({ id, samples, model: options.model, language: options.language }, [samples.buffer]);
    });
  }
}

export const lyricsClient = new LyricsClient();
