/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Cross-origin isolation lets the AI models (stems, lyrics) run multi-threaded
 * WebAssembly when there's no GPU. `credentialless` keeps Google Fonts and the
 * model CDN working without extra headers on their side. Set the same two
 * headers on your production host to get the speed-up there too.
 */
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
  plugins: [react()],
  worker: { format: 'es' },
  // Pre-bundle what the workers and the lazy export encoders import, so their first use doesn't trigger a dev
  // re-optimise (which breaks a running worker and fails the dynamic import with "outdated optimize dep").
  // ONNX Runtime stays un-bundled in dev so it can find its .wasm files next to itself.
  optimizeDeps: {
    include: [
      '@huggingface/transformers',
      'soundtouchjs',
      'demucs-web',
      'mediabunny',
      '@mediabunny/mp3-encoder',
      '@mediabunny/flac-encoder',
      'gifenc',
    ],
    exclude: ['onnxruntime-web'],
  },
  build: {
    chunkSizeWarningLimit: 650,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  base: './',
});
