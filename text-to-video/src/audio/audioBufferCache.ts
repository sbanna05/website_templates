import { semitonesToRatio } from '../lib/math';
import { mediaRegistry } from '../media/mediaRegistry';
import { getAudioContext } from './audioContext';
import { dsp } from './dspClient';

const isNeutral = (speed: number, pitch: number) => Math.abs(speed - 1) < 1e-3 && Math.abs(pitch) < 1e-3;
const keyOf = (assetId: string, speed: number, pitch: number) => `${assetId}|${speed.toFixed(3)}|${pitch.toFixed(2)}`;

const ready = new Map<string, AudioBuffer>();
const inflight = new Map<string, Promise<AudioBuffer | undefined>>();
const listeners = new Set<() => void>();

/**
 * Caches speed/pitch-processed versions of each audio source. Processing runs
 * in the DSP worker; listeners are notified so playback can pick up results.
 */
export const audioBufferCache = {
  /** Synchronous lookup — undefined while still processing. */
  peek(assetId: string, speed: number, pitch: number): AudioBuffer | undefined {
    const source = mediaRegistry.get(assetId)?.audio;
    if (!source) return undefined;
    return isNeutral(speed, pitch) ? source : ready.get(keyOf(assetId, speed, pitch));
  },

  ensure(assetId: string, speed: number, pitch: number): Promise<AudioBuffer | undefined> {
    const source = mediaRegistry.get(assetId)?.audio;
    if (!source) return Promise.resolve(undefined);
    if (isNeutral(speed, pitch)) return Promise.resolve(source);
    const key = keyOf(assetId, speed, pitch);
    const done = ready.get(key);
    if (done) return Promise.resolve(done);
    const running = inflight.get(key);
    if (running) return running;

    const channels = Array.from({ length: source.numberOfChannels }, (_, i) => source.getChannelData(i).slice());
    const job = dsp
      .timeStretch(channels, speed, semitonesToRatio(pitch))
      .then((processed) => {
        const buffer = getAudioContext().createBuffer(processed.length, processed[0].length, source.sampleRate);
        processed.forEach((data, i) => buffer.copyToChannel(data as Float32Array<ArrayBuffer>, i));
        ready.set(key, buffer);
        listeners.forEach((listener) => listener());
        return buffer;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  },

  get pendingCount(): number {
    return inflight.size;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  clear(): void {
    ready.clear();
  },

  evictAsset(assetId: string): void {
    for (const key of ready.keys()) if (key.startsWith(`${assetId}|`)) ready.delete(key);
  },
};
