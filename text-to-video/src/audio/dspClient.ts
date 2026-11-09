import type { BeatAnalysis, HarmonyAnalysis } from '../types/project';
import type { DspRequest, DspResponse } from './dspProtocol';

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

type Pending = { resolve: (value: DspResponse) => void; reject: (error: Error) => void };

/** Promise-based façade over the DSP worker, so heavy maths never blocks the UI thread. */
class DspClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./dsp.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<DspResponse>) => {
        const entry = this.pending.get(event.data.id);
        if (!entry) return;
        this.pending.delete(event.data.id);
        if (event.data.ok) entry.resolve(event.data);
        else entry.reject(new Error(event.data.error));
      };
    }
    return this.worker;
  }

  private send(request: WithoutId<DspRequest>, transfer: Transferable[]): Promise<DspResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.getWorker().postMessage({ ...request, id }, transfer);
    });
  }

  async detectBeats(samples: Float32Array, sampleRate: number): Promise<BeatAnalysis> {
    const response = await this.send({ type: 'beats', samples, sampleRate }, [samples.buffer]);
    if (response.ok && response.type === 'beats') return response.result;
    throw new Error('Unexpected DSP response');
  }

  /** Beats, downbeat, key and chords in one pass. */
  async analyzeMusic(samples: Float32Array, sampleRate: number): Promise<{ beats: BeatAnalysis; harmony: HarmonyAnalysis }> {
    const response = await this.send({ type: 'analyze', samples, sampleRate }, [samples.buffer]);
    if (response.ok && response.type === 'analyze') return { beats: response.beats, harmony: response.harmony };
    throw new Error('Unexpected DSP response');
  }

  /** Key and chords only, on a known beat grid. */
  async analyzeHarmony(samples: Float32Array, sampleRate: number, beats: number[], source: HarmonyAnalysis['source']): Promise<HarmonyAnalysis> {
    const response = await this.send({ type: 'harmony', samples, sampleRate, beats, source }, [samples.buffer]);
    if (response.ok && response.type === 'harmony') return response.harmony;
    throw new Error('Unexpected DSP response');
  }

  async timeStretch(channels: Float32Array[], tempo: number, pitch: number): Promise<Float32Array[]> {
    const response = await this.send({ type: 'stretch', channels, tempo, pitch }, channels.map((c) => c.buffer));
    if (response.ok && response.type === 'stretch') return response.channels;
    throw new Error('Unexpected DSP response');
  }
}

export const dsp = new DspClient();
