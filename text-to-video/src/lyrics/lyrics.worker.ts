import {
  pipeline,
  type AutomaticSpeechRecognitionOutput,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import type { LyricWord } from '../types/project';
import { LYRIC_MODELS, type LyricModel, type LyricsWorkerMessage, type TranscribeRequest } from './protocol';

/*
 * Runs Whisper (via transformers.js / ONNX Runtime) off the main thread.
 * The model downloads once from the Hugging Face hub and is cached by the
 * browser, so later runs start immediately and work offline.
 */

interface WorkerScope {
  onmessage: ((event: MessageEvent<TranscribeRequest>) => void) | null;
  postMessage(message: LyricsWorkerMessage): void;
}

const scope = self as unknown as WorkerScope;
const loaded = new Map<LyricModel, Promise<{ asr: AutomaticSpeechRecognitionPipeline; device: string }>>();

const hasWebGpu = async (): Promise<boolean> => {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  try {
    return Boolean(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
};

function load(model: LyricModel, onProgress: (percent: number) => void) {
  let job = loaded.get(model);
  if (!job) {
    job = (async () => {
      const device = (await hasWebGpu()) ? 'webgpu' : 'wasm';
      // Full-precision encoder keeps accuracy; the quantised decoder keeps the download small.
      const dtype = { encoder_model: 'fp32', decoder_model_merged: device === 'webgpu' ? 'q4' : 'q8' } as const;
      const asr = (await pipeline('automatic-speech-recognition', LYRIC_MODELS[model].id, {
        device,
        dtype,
        progress_callback: (info) => {
          if (info.status === 'progress_total') onProgress(info.progress);
        },
      })) as AutomaticSpeechRecognitionPipeline;
      return { asr, device };
    })();
    job.catch(() => loaded.delete(model));
    loaded.set(model, job);
  }
  return job;
}

scope.onmessage = async ({ data: request }) => {
  const { id } = request;
  try {
    const { asr, device } = await load(request.model, (progress) => scope.postMessage({ id, type: 'download', progress }));
    scope.postMessage({ id, type: 'transcribing' });
    const output = await asr(request.samples, {
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
      task: 'transcribe',
      ...(request.language === 'auto' ? {} : { language: request.language }),
    });
    const result: AutomaticSpeechRecognitionOutput = Array.isArray(output) ? output[0] : output;
    const chunks = result.chunks ?? [];
    const words: LyricWord[] = chunks
      .filter((c) => Number.isFinite(c.timestamp[0]))
      .map((c) => ({ text: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 0.3 }));
    scope.postMessage({ id, type: 'done', words, device });
  } catch (error) {
    scope.postMessage({ id, type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};
