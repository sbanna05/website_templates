import { chooseDownbeat, detectBeats, detectBeatsDetailed } from './beatDetect';
import { analyzeHarmony } from './harmony';
import { timeStretch } from './timeStretch';
import type { DspRequest, DspResponse } from './dspProtocol';

interface WorkerScope {
  onmessage: ((event: MessageEvent<DspRequest>) => void) | null;
  postMessage(message: DspResponse, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<DspRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'beats') {
      const result = detectBeats(request.samples, request.sampleRate);
      scope.postMessage({ id: request.id, ok: true, type: 'beats', result } satisfies DspResponse);
    } else if (request.type === 'analyze') {
      // Beats first, then harmony on those beats; chord changes then help pick the downbeat.
      const { analysis, lowStrength } = detectBeatsDetailed(request.samples, request.sampleRate);
      const { harmony, beatChange } = analyzeHarmony(request.samples, request.sampleRate, analysis.beats);
      const beats = lowStrength.length ? { ...analysis, firstBar: chooseDownbeat(lowStrength, beatChange) } : analysis;
      scope.postMessage({ id: request.id, ok: true, type: 'analyze', beats, harmony } satisfies DspResponse);
    } else if (request.type === 'harmony') {
      const { harmony } = analyzeHarmony(request.samples, request.sampleRate, request.beats, request.source);
      scope.postMessage({ id: request.id, ok: true, type: 'harmony', harmony } satisfies DspResponse);
    } else {
      const channels = timeStretch(request.channels, request.tempo, request.pitch);
      scope.postMessage(
        { id: request.id, ok: true, type: 'stretch', channels } satisfies DspResponse,
        channels.map((c) => c.buffer),
      );
    }
  } catch (error) {
    scope.postMessage({ id: request.id, ok: false, error: String(error) } satisfies DspResponse);
  }
};
