import type { StemName } from '../types/project';
import { STEM_MODEL, type StereoPcm, type StemsWorkerMessage } from './protocol';

export type SplitProgress =
  | { stage: 'download'; progress: number }
  | { stage: 'loading'; device: 'webgpu' | 'wasm' }
  | { stage: 'separating'; progress: number };

/** Resamples any buffer to the model's 44.1 kHz stereo (mono files are spread to both sides). */
export async function prepareStereo(buffer: AudioBuffer): Promise<StereoPcm> {
  const rate = STEM_MODEL.sampleRate;
  const ctx = new OfflineAudioContext(2, Math.ceil(buffer.duration * rate), rate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  const rendered = await ctx.startRendering();
  return { left: rendered.getChannelData(0), right: rendered.getChannelData(1) };
}

/**
 * Promise façade over the stems worker. The worker (and its model) is created
 * on first use; cancelling terminates it, which is the only way to stop a
 * running inference — the cached model makes the next start quick.
 */
class StemsClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private abort: (() => void) | null = null;

  private getWorker(): Worker {
    this.worker ??= new Worker(new URL('./stems.worker.ts', import.meta.url), { type: 'module' });
    return this.worker;
  }

  separate(pcm: StereoPcm, onProgress: (progress: SplitProgress) => void): Promise<Record<StemName, StereoPcm>> {
    const id = this.nextId++;
    const worker = this.getWorker();
    return new Promise((resolve, reject) => {
      const finish = () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onCrash);
        this.abort = null;
      };
      // e.g. out of memory on a very long song: the worker dies without posting anything.
      const onCrash = (event: ErrorEvent) => {
        event.preventDefault();
        finish();
        this.worker?.terminate();
        this.worker = null;
        reject(new Error(event.message || 'The separation worker stopped (out of memory?) — try a shorter song'));
      };
      const onMessage = ({ data }: MessageEvent<StemsWorkerMessage>) => {
        if (data.id !== id) return;
        if (data.type === 'download') onProgress({ stage: 'download', progress: data.total ? data.loaded / data.total : 0 });
        else if (data.type === 'loading') onProgress({ stage: 'loading', device: data.device });
        else if (data.type === 'progress') onProgress({ stage: 'separating', progress: data.progress });
        else {
          finish();
          if (data.type === 'done') resolve(data.stems);
          else reject(new Error(data.error));
        }
      };
      this.abort = () => {
        finish();
        reject(new DOMException('Stem split cancelled', 'AbortError'));
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onCrash);
      const left = pcm.left.slice();
      const right = pcm.right.slice();
      worker.postMessage({ id, left, right }, [left.buffer, right.buffer]);
    });
  }

  cancel(): void {
    this.abort?.();
    this.worker?.terminate();
    this.worker = null;
  }
}

export const stemsClient = new StemsClient();
