/// <reference lib="webworker" />
import { DemucsProcessor } from 'demucs-web';
import * as ort from 'onnxruntime-web/webgpu';
import { MODEL_CACHE, STEM_MODEL, type SeparateRequest, type StemsWorkerMessage } from './protocol';

/*
 * AI stem separation (HTDemucs) off the main thread. The model runs on the GPU
 * through WebGPU when available, else on the CPU (WebAssembly, multi-threaded
 * when the page is cross-origin isolated).
 */

declare const self: DedicatedWorkerGlobalScope;

// The WebAssembly runtime is bundled with the app (Vite emits it next to this worker).
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

const post = (message: StemsWorkerMessage) => {
  const transfer =
    message.type === 'done' ? Object.values(message.stems).flatMap((s) => [s.left.buffer, s.right.buffer]) : [];
  self.postMessage(message, transfer as Transferable[]);
};

/** Fetches the model once and keeps it in Cache Storage (it's too big for the HTTP cache to be reliable). */
async function loadModelBytes(onProgress: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  const cache = 'caches' in self ? await caches.open(MODEL_CACHE) : null;
  const cached = await cache?.match(STEM_MODEL.url);
  if (cached) return cached.arrayBuffer();

  const response = await fetch(STEM_MODEL.url);
  if (!response.ok || !response.body) throw new Error(`Model download failed (${response.status})`);
  const total = Number(response.headers.get('Content-Length')) || STEM_MODEL.sizeMb * 1024 * 1024;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, total);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  // Best effort: a full disk or private mode just means downloading again next time.
  await cache?.put(STEM_MODEL.url, new Response(bytes.slice())).catch(() => undefined);
  return bytes.buffer;
}

let processor: DemucsProcessor | null = null;
let onSegment: (progress: number) => void = () => undefined;

async function getProcessor(id: number): Promise<DemucsProcessor> {
  if (processor) return processor;
  const bytes = await loadModelBytes((loaded, total) => post({ id, type: 'download', loaded, total }));
  const device = 'gpu' in navigator ? 'webgpu' : 'wasm';
  post({ id, type: 'loading', device });
  const next = new DemucsProcessor({
    ort,
    onProgress: ({ progress }) => onSegment(progress),
    sessionOptions: {
      executionProviders: device === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'],
      graphOptimizationLevel: 'all',
    },
  });
  await next.loadModel(bytes);
  processor = next;
  return next;
}

self.addEventListener('message', async ({ data }: MessageEvent<SeparateRequest>) => {
  const { id, left, right } = data;
  try {
    const demucs = await getProcessor(id);
    onSegment = (progress) => post({ id, type: 'progress', progress });
    const result = await demucs.separate(left, right);
    post({ id, type: 'done', stems: result });
  } catch (error) {
    post({ id, type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
});
