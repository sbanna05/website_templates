/*
 * Small, allocation-free radix-2 FFT for the analysis worker (beats, key, chords).
 * Not for realtime audio — Web Audio's AnalyserNode does that.
 */

export class Fft {
  readonly size: number;
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  private readonly rev: Uint32Array;
  readonly re: Float64Array;
  readonly im: Float64Array;
  /** Hann window of `size` samples. */
  readonly window: Float64Array;

  constructor(size: number) {
    if (size < 2 || (size & (size - 1)) !== 0) throw new Error('FFT size must be a power of two');
    this.size = size;
    this.re = new Float64Array(size);
    this.im = new Float64Array(size);
    this.cos = new Float64Array(size / 2);
    this.sin = new Float64Array(size / 2);
    for (let i = 0; i < size / 2; i += 1) {
      this.cos[i] = Math.cos((-2 * Math.PI * i) / size);
      this.sin[i] = Math.sin((-2 * Math.PI * i) / size);
    }
    this.rev = new Uint32Array(size);
    const bits = Math.log2(size);
    for (let i = 0; i < size; i += 1) {
      let r = 0;
      for (let b = 0; b < bits; b += 1) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
    this.window = new Float64Array(size);
    for (let i = 0; i < size; i += 1) this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  }

  /**
   * Windowed magnitude spectrum of `samples[offset … offset + size)` (zero-padded past the end).
   * Writes `size / 2 + 1` magnitudes into `out`.
   */
  magnitudes(samples: Float32Array, offset: number, out: Float64Array): void {
    const { size, re, im, rev, window } = this;
    for (let i = 0; i < size; i += 1) {
      const s = samples[offset + i] ?? 0;
      const j = rev[i];
      re[j] = s * window[i];
      im[j] = 0;
    }
    for (let len = 2; len <= size; len <<= 1) {
      const half = len >> 1;
      const step = size / len;
      for (let start = 0; start < size; start += len) {
        for (let k = 0; k < half; k += 1) {
          const wr = this.cos[k * step];
          const wi = this.sin[k * step];
          const a = start + k;
          const b = a + half;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
    for (let k = 0; k <= size / 2; k += 1) out[k] = Math.hypot(re[k], im[k]);
  }
}
