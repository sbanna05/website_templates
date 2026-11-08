import { detectBeats } from './beatDetect';
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
