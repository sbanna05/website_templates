import type { BeatAnalysis } from '../types/project';

const FRAME = 1024;
const HOP = 512;
const MIN_BPM = 70;
const MAX_BPM = 180;
const PREFERRED_BPM = 120;

/** Onset-strength envelope: rectified log-energy flux, weighted towards the low end (kicks). */
export function onsetEnvelope(samples: Float32Array, sampleRate: number): Float32Array {
  const frames = Math.max(0, Math.floor((samples.length - FRAME) / HOP) + 1);
  const envelope = new Float32Array(frames);
  // One-pole low-pass ≈150 Hz to isolate kick/bass energy.
  const alpha = 1 - Math.exp((-2 * Math.PI * 150) / sampleRate);
  const low = new Float32Array(samples.length);
  let state = 0;
  for (let i = 0; i < samples.length; i += 1) {
    state += alpha * (samples[i] - state);
    low[i] = state;
  }
  let prevFull = 0;
  let prevLow = 0;
  for (let f = 0; f < frames; f += 1) {
    let full = 0;
    let bass = 0;
    const offset = f * HOP;
    for (let i = 0; i < FRAME; i += 1) {
      const s = samples[offset + i];
      const l = low[offset + i];
      full += s * s;
      bass += l * l;
    }
    const logFull = Math.log1p(full * 100);
    const logLow = Math.log1p(bass * 100);
    envelope[f] = 0.4 * Math.max(0, logFull - prevFull) + 0.6 * Math.max(0, logLow - prevLow);
    prevFull = logFull;
    prevLow = logLow;
  }
  // Remove the local mean so sustained loud passages don't dominate.
  const window = Math.round((0.4 * sampleRate) / HOP);
  const out = new Float32Array(frames);
  let sum = 0;
  for (let f = 0; f < frames; f += 1) {
    sum += envelope[f];
    if (f >= window) sum -= envelope[f - window];
    const mean = sum / Math.min(f + 1, window);
    out[f] = Math.max(0, envelope[f] - mean);
  }
  return out;
}

/** Tempo period (in envelope frames) from a perceptually weighted autocorrelation. */
export function estimatePeriod(envelope: Float32Array, frameRate: number): number {
  const minLag = Math.floor((60 / MAX_BPM) * frameRate);
  const maxLag = Math.ceil((60 / MIN_BPM) * frameRate);
  const scores: number[] = [];
  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let acf = 0;
    for (let i = 0; i + lag < envelope.length; i += 1) acf += envelope[i] * envelope[i + lag];
    const bpm = (60 * frameRate) / lag;
    const weight = Math.exp(-0.5 * (Math.log2(bpm / PREFERRED_BPM) / 0.9) ** 2);
    const score = acf * weight;
    scores.push(score);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  // Parabolic interpolation for sub-frame precision.
  const i = bestLag - minLag;
  const [a, b, c] = [scores[i - 1], scores[i], scores[i + 1]];
  if (a !== undefined && c !== undefined) {
    const denom = a - 2 * b + c;
    if (denom !== 0) return bestLag + (0.5 * (a - c)) / denom;
  }
  return bestLag;
}

export function detectBeats(samples: Float32Array, sampleRate: number): BeatAnalysis {
  const envelope = onsetEnvelope(samples, sampleRate);
  const frameRate = sampleRate / HOP;
  const duration = samples.length / sampleRate;
  if (envelope.length < frameRate * 2) return { bpm: 0, beats: [], onsets: [] };

  const period = estimatePeriod(envelope, frameRate);

  // Grid phase: the offset whose comb of beats collects the most onset energy.
  let bestPhase = 0;
  let bestScore = -Infinity;
  for (let phase = 0; phase < period; phase += 0.5) {
    let score = 0;
    for (let t = phase; t < envelope.length; t += period) score += envelope[Math.round(t)] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestPhase = phase;
    }
  }

  const beats: number[] = [];
  const latency = FRAME / 2 / sampleRate; // envelope frames are centred on their window
  // The phase search is modulo one period; walk back so a downbeat at ~0 s isn't dropped.
  let first = bestPhase;
  while (first - period >= -0.25 * period) first -= period;
  for (let t = first; t < envelope.length; t += period) {
    const time = Math.max(0, t / frameRate + latency);
    if (time < duration && time > (beats.at(-1) ?? -1)) beats.push(Number(time.toFixed(4)));
  }

  return { bpm: Number(((60 * frameRate) / period).toFixed(1)), beats, onsets: pickOnsets(envelope, frameRate, latency) };
}

function pickOnsets(envelope: Float32Array, frameRate: number, latency: number): number[] {
  let mean = 0;
  for (const v of envelope) mean += v;
  mean /= envelope.length;
  let variance = 0;
  for (const v of envelope) variance += (v - mean) ** 2;
  const threshold = mean + 1.5 * Math.sqrt(variance / envelope.length);
  const minGap = Math.round(0.1 * frameRate);
  const onsets: number[] = [];
  let last = -minGap;
  for (let f = 1; f < envelope.length - 1; f += 1) {
    const v = envelope[f];
    if (v > threshold && v >= envelope[f - 1] && v >= envelope[f + 1] && f - last >= minGap) {
      onsets.push(Number((f / frameRate + latency).toFixed(4)));
      last = f;
    }
  }
  return onsets;
}
