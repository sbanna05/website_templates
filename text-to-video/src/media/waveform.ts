/** Peak amplitude per bucket, normalised to 0–1. ~40 buckets per second keeps zoomed waveforms crisp. */
export function computePeaks(buffer: AudioBuffer, bucketsPerSecond = 40): number[] {
  const buckets = Math.max(1, Math.min(20000, Math.ceil(buffer.duration * bucketsPerSecond)));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const size = Math.max(1, Math.floor(buffer.length / buckets));
  const peaks = new Array<number>(buckets).fill(0);
  let max = 0;
  for (let b = 0; b < buckets; b += 1) {
    let peak = 0;
    const from = b * size;
    const to = Math.min(buffer.length, from + size);
    // Sub-sample long buckets: visually identical, much faster.
    const step = Math.max(1, Math.floor(size / 256));
    for (const data of channels) {
      for (let i = from; i < to; i += step) {
        const v = Math.abs(data[i]);
        if (v > peak) peak = v;
      }
    }
    peaks[b] = peak;
    if (peak > max) max = peak;
  }
  return max > 0 ? peaks.map((p) => Number((p / max).toFixed(3))) : peaks;
}

/** Mono mix, decimated to ≤ 24 kHz — plenty for tempo detection. */
export function monoForAnalysis(buffer: AudioBuffer): { samples: Float32Array; sampleRate: number } {
  const factor = buffer.sampleRate > 32000 ? 2 : 1;
  const length = Math.floor(buffer.length / factor);
  const samples = new Float32Array(length);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  for (let i = 0; i < length; i += 1) {
    let sum = 0;
    for (const data of channels) for (let k = 0; k < factor; k += 1) sum += data[i * factor + k];
    samples[i] = sum / (channels.length * factor);
  }
  return { samples, sampleRate: buffer.sampleRate / factor };
}
