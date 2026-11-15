import type { BeatAnalysis } from '../types/project';
import { Fft } from './fft';

/*
 * Beat tracking, the way DJ software does it:
 *
 *  1. Onset strength — log-spectral flux (every frequency band), with extra
 *     weight on the low end where kicks live.
 *  2. Tempo — autocorrelation of that envelope, weighted towards common tempos.
 *  3. Beats — dynamic-programming tracker (Ellis 2007) that follows the music
 *     even when a drummer pushes or drags.
 *  4. Grid — when the tracked beats are steady (almost all produced music), a
 *     least-squares fit turns them into one exact tempo + phase, so the grid
 *     never drifts off the kick late in the song. Near-integer BPMs snap to the
 *     integer (128.00, not 127.96) when that fits at least as well.
 *  5. Downbeat — which beat of four starts a bar (kick strength; the harmony
 *     analysis later adds chord changes to the vote, see `chooseDownbeat`).
 */

const FRAME = 1024;
const MIN_BPM = 60;
const MAX_BPM = 200;
const PREFERRED_BPM = 120;
/** Octaves of spread in the tempo prior. */
const PRIOR_WIDTH = 1;
/** How strongly the tracker sticks to the tempo (librosa's default). */
const TIGHTNESS = 100;
/** Median distance (s) between tracked beats and a straight grid below which the song counts as steady. */
const STEADY_RESIDUAL = 0.022;
/** Share of beats that must sit within `STEADY_HIT` of the straight grid. */
const STEADY_SHARE = 0.75;
const STEADY_HIT = 0.04;
const BEATS_PER_BAR = 4;

export interface OnsetFeatures {
  /** Onset strength per frame, ≥ 0, local mean removed. */
  envelope: Float32Array;
  /** Low-band (kick / bass) onset strength per frame. */
  low: Float32Array;
  frameRate: number;
  /** Seconds between a frame's index time and the sound it reacts to. */
  latency: number;
}

/** Hop size for a sample rate: ~11 ms frames, fine enough for a tight grid. */
const hopFor = (sampleRate: number) => (sampleRate > 30000 ? 512 : 256);

export function onsetFeatures(samples: Float32Array, sampleRate: number): OnsetFeatures {
  const hop = hopFor(sampleRate);
  const frames = Math.max(0, Math.floor((samples.length - FRAME) / hop) + 1);
  const fft = new Fft(FRAME);
  const bins = FRAME / 2 + 1;
  const mags = new Float64Array(bins);
  const prev = new Float64Array(bins);
  const binHz = sampleRate / FRAME;
  const lowTop = Math.max(2, Math.round(160 / binHz));
  const top = Math.min(bins - 1, Math.round(9000 / binHz));
  const scale = 4 / FRAME;

  const full = new Float32Array(frames);
  const low = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    fft.magnitudes(samples, f * hop, mags);
    let fluxAll = 0;
    let fluxLow = 0;
    for (let k = 1; k <= top; k += 1) {
      const v = Math.log1p(100 * mags[k] * scale);
      const d = v - prev[k];
      prev[k] = v;
      if (f === 0 || d <= 0) continue;
      fluxAll += d;
      if (k <= lowTop) fluxLow += d;
    }
    full[f] = fluxAll / top;
    low[f] = fluxLow / lowTop;
  }

  const meanOf = (a: Float32Array) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length) || 1;
  const fullMean = meanOf(full);
  const lowMean = meanOf(low);
  const combined = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) combined[f] = full[f] / fullMean + 0.8 * (low[f] / lowMean);

  const frameRate = sampleRate / hop;
  return {
    envelope: removeLocalMean(combined, Math.round(0.35 * frameRate)),
    low: removeLocalMean(low, Math.round(0.35 * frameRate)),
    frameRate,
    // The flux peaks when an attack reaches the middle of the analysis window.
    latency: FRAME / 2 / sampleRate,
  };
}

/** Subtracts a centred moving average and half-wave rectifies, so loud passages don't dominate. */
function removeLocalMean(values: Float32Array, window: number): Float32Array {
  const n = values.length;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i += 1) prefix[i + 1] = prefix[i] + values[i];
  const out = new Float32Array(n);
  const half = Math.max(1, Math.floor(window / 2));
  for (let i = 0; i < n; i += 1) {
    const a = Math.max(0, i - half);
    const b = Math.min(n, i + half + 1);
    out[i] = Math.max(0, values[i] - (prefix[b] - prefix[a]) / (b - a));
  }
  return out;
}

/** Beat period in envelope frames (fractional) from a tempo-weighted autocorrelation. */
export function estimatePeriod(envelope: Float32Array, frameRate: number): number {
  const minLag = Math.floor((60 / MAX_BPM) * frameRate);
  const maxLag = Math.min(envelope.length - 1, Math.ceil((60 / MIN_BPM) * frameRate));
  const scores: number[] = [];
  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let acf = 0;
    for (let i = 0; i + lag < envelope.length; i += 1) acf += envelope[i] * envelope[i + lag];
    acf /= envelope.length - lag;
    const bpm = (60 * frameRate) / lag;
    const weight = Math.exp(-0.5 * (Math.log2(bpm / PREFERRED_BPM) / PRIOR_WIDTH) ** 2);
    const score = acf * weight;
    scores.push(score);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  const i = bestLag - minLag;
  const [a, b, c] = [scores[i - 1], scores[i], scores[i + 1]];
  if (a !== undefined && c !== undefined) {
    const denom = a - 2 * b + c;
    if (denom !== 0) return bestLag + (0.5 * (a - c)) / denom;
  }
  return bestLag;
}

/** Dynamic-programming beat tracker. Returns beat positions in (fractional-free) frames. */
export function trackBeats(envelope: Float32Array, period: number): number[] {
  const n = envelope.length;
  if (n === 0) return [];
  let std = 0;
  let mean = 0;
  for (const v of envelope) mean += v;
  mean /= n;
  for (const v of envelope) std += (v - mean) ** 2;
  std = Math.sqrt(std / n) || 1;

  // Local score: the envelope smoothed by a short Gaussian (≈ 1/32 of a beat wide).
  const radius = Math.max(1, Math.round(period));
  const kernel = Array.from({ length: 2 * radius + 1 }, (_, k) => Math.exp(-0.5 * (((k - radius) * 32) / period) ** 2));
  const local = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    let sum = 0;
    for (let k = -radius; k <= radius; k += 1) {
      const j = i + k;
      if (j >= 0 && j < n) sum += (envelope[j] / std) * kernel[k + radius];
    }
    local[i] = sum;
  }

  const cumulative = new Float64Array(n);
  const backlink = new Int32Array(n).fill(-1);
  const from = Math.round(2 * period);
  const to = Math.max(1, Math.round(period / 2));
  for (let i = 0; i < n; i += 1) {
    let best = -Infinity;
    let bestJ = -1;
    for (let j = i - from; j <= i - to; j += 1) {
      if (j < 0) continue;
      const score = cumulative[j] - TIGHTNESS * Math.log((i - j) / period) ** 2;
      if (score > best) {
        best = score;
        bestJ = j;
      }
    }
    cumulative[i] = local[i] + (bestJ >= 0 ? best : 0);
    backlink[i] = bestJ;
  }

  // Last beat: the strongest local maximum of the cumulative score within the final period.
  let last = n - 1;
  let lastScore = -Infinity;
  for (let i = Math.max(1, n - Math.round(period)); i < n - 1; i += 1) {
    if (cumulative[i] >= cumulative[i - 1] && cumulative[i] >= cumulative[i + 1] && cumulative[i] > lastScore) {
      lastScore = cumulative[i];
      last = i;
    }
  }
  const beats: number[] = [];
  for (let i = last; i >= 0; i = backlink[i]) beats.push(i);
  beats.reverse();
  // Trim weak beats at the edges (silence before the music starts / after it ends).
  const threshold = 0.25 * median(beats.map((b) => local[b]));
  while (beats.length > 2 && local[beats[0]] < threshold) beats.shift();
  while (beats.length > 2 && local[beats[beats.length - 1]] < threshold) beats.pop();
  return beats;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

interface GridFit {
  period: number;
  phase: number;
  /** Median |tracked − grid| in seconds. */
  residual: number;
  /** Share of tracked beats within `STEADY_HIT` of the grid. */
  share: number;
}

/** Least-squares straight grid through tracked beat times (handles skipped or doubled beats). */
export function fitGrid(times: readonly number[], period: number): GridFit {
  let T = period;
  let a = times[0] ?? 0;
  for (let pass = 0; pass < 3; pass += 1) {
    const ks = times.map((t) => Math.round((t - a) / T));
    // Drop outliers after the first pass.
    const residuals = times.map((t, i) => Math.abs(t - (a + ks[i] * T)));
    const limit = pass === 0 ? Infinity : Math.max(0.03, 2.5 * median(residuals));
    let n = 0;
    let sk = 0;
    let st = 0;
    let skk = 0;
    let skt = 0;
    times.forEach((t, i) => {
      if (residuals[i] > limit) return;
      const k = ks[i];
      n += 1;
      sk += k;
      st += t;
      skk += k * k;
      skt += k * t;
    });
    const denom = n * skk - sk * sk;
    if (n < 2 || denom === 0) break;
    T = (n * skt - sk * st) / denom;
    a = (st - T * sk) / n;
  }
  const residuals = times.map((t) => {
    const d = (((t - a) % T) + T) % T;
    return Math.min(d, T - d);
  });
  return {
    period: T,
    phase: a,
    residual: median(residuals),
    share: residuals.filter((r) => r <= STEADY_HIT).length / Math.max(1, residuals.length),
  };
}

/** Onset strength at `time`, taking the max over ±1 frame so a slightly early/late hit still counts. */
const strengthAt = (envelope: Float32Array, frameRate: number, latency: number, time: number) => {
  const f = Math.round((time - latency) * frameRate);
  return Math.max(envelope[f - 1] ?? 0, envelope[f] ?? 0, envelope[f + 1] ?? 0);
};

/** Slides a fixed-tempo grid to where it collects the most onset energy. */
function refinePhase(features: OnsetFeatures, period: number, phase: number, duration: number): number {
  const { envelope, frameRate, latency } = features;
  let best = phase;
  let bestScore = -Infinity;
  const step = 0.001;
  for (let shift = -period / 4; shift <= period / 4; shift += step) {
    const start = phase + shift;
    let score = 0;
    const k0 = Math.ceil(-start / period);
    for (let k = k0; start + k * period < duration; k += 1) score += strengthAt(envelope, frameRate, latency, start + k * period);
    // Tiny bias towards the fitted phase so flat regions don't wander.
    score -= Math.abs(shift) * 1e-3;
    if (score > bestScore) {
      bestScore = score;
      best = start;
    }
  }
  return best;
}

/** Every grid line in [0, duration). */
function gridBeats(period: number, phase: number, duration: number): number[] {
  const beats: number[] = [];
  const k0 = Math.ceil((-phase - 1e-9) / period);
  for (let k = k0; ; k += 1) {
    const t = phase + k * period;
    if (t >= duration) break;
    beats.push(Number(t.toFixed(4)));
  }
  return beats;
}

/** Kick / bass strength at every beat, normalised to mean 1 — one input of the downbeat vote. */
function lowAtBeats(features: OnsetFeatures, beats: readonly number[]): number[] {
  const values = beats.map((b) => {
    const f = Math.round((b - features.latency) * features.frameRate);
    let max = 0;
    for (let k = f - 2; k <= f + 2; k += 1) max = Math.max(max, features.low[k] ?? 0);
    return max;
  });
  const mean = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length) || 1;
  return values.map((v) => v / mean);
}

/**
 * Which beat (0–3) starts the first bar: the phase whose beats have the strongest
 * kicks and — when given — the most chord changes (harmony moves on the "one").
 */
export function chooseDownbeat(lowStrength: readonly number[], chordChange?: readonly number[]): number {
  const changeMean = chordChange?.length ? chordChange.reduce((s, v) => s + v, 0) / chordChange.length || 1 : 1;
  let best = 0;
  let bestScore = -Infinity;
  for (let phase = 0; phase < BEATS_PER_BAR; phase += 1) {
    let score = 0;
    let count = 0;
    for (let i = phase; i < lowStrength.length; i += BEATS_PER_BAR) {
      score += lowStrength[i] + 1.5 * ((chordChange?.[i] ?? 0) / changeMean);
      count += 1;
    }
    score /= Math.max(1, count);
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = phase;
    }
  }
  return best;
}

export interface DetailedBeats {
  analysis: BeatAnalysis;
  /** Kick strength per beat (mean 1), for a later downbeat vote with chord changes. */
  lowStrength: number[];
}

export function detectBeatsDetailed(samples: Float32Array, sampleRate: number): DetailedBeats {
  const duration = samples.length / sampleRate;
  const features = onsetFeatures(samples, sampleRate);
  const { envelope, frameRate, latency } = features;
  if (envelope.length < frameRate * 2) return { analysis: { bpm: 0, beats: [], onsets: [] }, lowStrength: [] };

  const period = estimatePeriod(envelope, frameRate);
  const tracked = trackBeats(envelope, period).map((f) => f / frameRate + latency);
  const onsets = pickOnsets(envelope, frameRate, latency);
  if (tracked.length < 4) {
    return { analysis: { bpm: Number(((60 * frameRate) / period).toFixed(1)), beats: tracked, onsets }, lowStrength: [] };
  }

  const fit = fitGrid(tracked, period / frameRate);
  const steady = fit.residual <= STEADY_RESIDUAL && fit.share >= STEADY_SHARE;
  let beats: number[];
  let bpm: number;
  if (steady) {
    let gridPeriod = fit.period;
    let phase = refinePhase(features, gridPeriod, fit.phase, duration);
    // Produced music sits on whole BPMs: take the integer when it fits at least as well.
    const exact = 60 / gridPeriod;
    const whole = Math.round(exact);
    if (Math.abs(exact - whole) < 0.06) {
      const snappedPeriod = 60 / whole;
      const snappedPhase = refinePhase(features, snappedPeriod, phase, duration);
      const score = (p: number, a: number) => gridBeats(p, a, duration).reduce((s, b) => s + strengthAt(envelope, frameRate, latency, b), 0);
      if (score(snappedPeriod, snappedPhase) >= 0.98 * score(gridPeriod, phase)) {
        gridPeriod = snappedPeriod;
        phase = snappedPhase;
      }
    }
    beats = gridBeats(gridPeriod, phase, duration);
    bpm = Number((60 / gridPeriod).toFixed(2));
  } else {
    beats = tracked.map((t) => Number(t.toFixed(4)));
    const intervals = beats.slice(1).map((b, i) => b - beats[i]);
    bpm = Number((60 / median(intervals)).toFixed(1));
  }

  const lowStrength = lowAtBeats(features, beats);
  return {
    analysis: {
      bpm,
      beats,
      onsets,
      firstBar: chooseDownbeat(lowStrength),
      steady,
      confidence: Number(fit.share.toFixed(2)),
    },
    lowStrength,
  };
}

export function detectBeats(samples: Float32Array, sampleRate: number): BeatAnalysis {
  return detectBeatsDetailed(samples, sampleRate).analysis;
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
