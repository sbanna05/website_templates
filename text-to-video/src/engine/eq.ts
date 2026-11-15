import type { EqSettings } from '../types/project';

/*
 * Channel-strip EQ: low cut → low shelf → mid bell → high shelf.
 *
 * The response maths below is the RBJ "Audio EQ Cookbook" — the same formulas
 * the Web Audio BiquadFilterNode uses — so the curve drawn in the editor is the
 * curve you hear, without needing an AudioContext to draw it.
 */

export const EQ_BANDS = {
  lowShelfHz: 120,
  highShelfHz: 8000,
  midQ: 0.9,
  /** Butterworth slope for the low cut. */
  lowCutQ: Math.SQRT1_2,
} as const;

export const EQ_GAIN_RANGE = { min: -12, max: 12 } as const;
export const MID_FREQ_RANGE = { min: 150, max: 6000 } as const;
export const LOW_CUT_RANGE = { min: 20, max: 500 } as const;
/** Frequencies drawn on the EQ graph. */
export const EQ_VIEW = { min: 20, max: 20000 } as const;

export const FLAT_EQ: EqSettings = { lowCut: 0, low: 0, mid: 0, midFreq: 1000, high: 0 };

export const isFlatEq = (eq: EqSettings | undefined): boolean =>
  !eq || (eq.lowCut <= 0 && eq.low === 0 && eq.mid === 0 && eq.high === 0);

export interface EqPreset {
  id: string;
  name: string;
  hint: string;
  eq: EqSettings;
}

export const EQ_PRESETS: readonly EqPreset[] = [
  { id: 'flat', name: 'Flat', hint: 'No EQ', eq: FLAT_EQ },
  { id: 'bass', name: 'Bass boost', hint: 'Fuller low end', eq: { ...FLAT_EQ, low: 6, mid: -1, midFreq: 400 } },
  { id: 'vocal', name: 'Vocal clarity', hint: 'Cuts mud, lifts the voice', eq: { lowCut: 90, low: -2, mid: 3, midFreq: 2500, high: 2 } },
  { id: 'warm', name: 'Warm', hint: 'Softer highs, rounder lows', eq: { ...FLAT_EQ, low: 3, mid: 1, midFreq: 300, high: -3 } },
  { id: 'bright', name: 'Bright', hint: 'More air and sparkle', eq: { ...FLAT_EQ, high: 5, mid: 1, midFreq: 3500 } },
  { id: 'rumble', name: 'Cut rumble', hint: 'Removes sub-bass noise', eq: { ...FLAT_EQ, lowCut: 70 } },
  { id: 'bass-kill', name: 'Bass cut', hint: 'DJ-style: drop the bass of one song while mixing', eq: { ...FLAT_EQ, low: -12, lowCut: 110 } },
  { id: 'phone', name: 'Telephone', hint: 'Thin and boxy', eq: { lowCut: 450, low: -12, mid: 6, midFreq: 1600, high: -12 } },
];

export const sameEq = (a: EqSettings, b: EqSettings): boolean =>
  a.lowCut === b.lowCut && a.low === b.low && a.mid === b.mid && a.midFreq === b.midFreq && a.high === b.high;

/** Web Audio's lowpass/highpass Q is in dB, unlike the shelf/peaking filters. */
export const qToDb = (q: number): number => 20 * Math.log10(q);

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a0: number;
  a1: number;
  a2: number;
}

type FilterKind = 'highpass' | 'lowshelf' | 'peaking' | 'highshelf';

function coefficients(kind: FilterKind, frequency: number, gainDb: number, q: number, sampleRate: number): Biquad {
  const w0 = (2 * Math.PI * frequency) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const A = Math.pow(10, gainDb / 40);
  switch (kind) {
    case 'highpass': {
      const alpha = sin / (2 * q);
      return { b0: (1 + cos) / 2, b1: -(1 + cos), b2: (1 + cos) / 2, a0: 1 + alpha, a1: -2 * cos, a2: 1 - alpha };
    }
    case 'peaking': {
      const alpha = sin / (2 * q);
      return { b0: 1 + alpha * A, b1: -2 * cos, b2: 1 - alpha * A, a0: 1 + alpha / A, a1: -2 * cos, a2: 1 - alpha / A };
    }
    case 'lowshelf':
    case 'highshelf': {
      // Web Audio fixes the shelf slope at S = 1.
      const twoRootAAlpha = 2 * Math.sqrt(A) * (sin / 2) * Math.SQRT2;
      const sign = kind === 'lowshelf' ? 1 : -1;
      return {
        b0: A * (A + 1 - sign * (A - 1) * cos + twoRootAAlpha),
        b1: sign * 2 * A * (A - 1 - sign * (A + 1) * cos),
        b2: A * (A + 1 - sign * (A - 1) * cos - twoRootAAlpha),
        a0: A + 1 + sign * (A - 1) * cos + twoRootAAlpha,
        a1: -sign * 2 * (A - 1 + sign * (A + 1) * cos),
        a2: A + 1 + sign * (A - 1) * cos - twoRootAAlpha,
      };
    }
  }
}

/** |H(f)| of one biquad, in dB. */
function magnitudeDb(c: Biquad, frequency: number, sampleRate: number): number {
  const w = (2 * Math.PI * frequency) / sampleRate;
  const cos1 = Math.cos(w);
  const sin1 = Math.sin(w);
  const cos2 = Math.cos(2 * w);
  const sin2 = Math.sin(2 * w);
  const numRe = c.b0 + c.b1 * cos1 + c.b2 * cos2;
  const numIm = -(c.b1 * sin1 + c.b2 * sin2);
  const denRe = c.a0 + c.a1 * cos1 + c.a2 * cos2;
  const denIm = -(c.a1 * sin1 + c.a2 * sin2);
  const ratio = Math.hypot(numRe, numIm) / Math.hypot(denRe, denIm);
  return 20 * Math.log10(Math.max(ratio, 1e-6));
}

/** The filters an EQ setting turns on, in signal order. Flat bands are skipped. */
export function eqFilters(eq: EqSettings): { kind: FilterKind; frequency: number; gain: number; q: number }[] {
  const filters: { kind: FilterKind; frequency: number; gain: number; q: number }[] = [];
  if (eq.lowCut > 0) filters.push({ kind: 'highpass', frequency: eq.lowCut, gain: 0, q: EQ_BANDS.lowCutQ });
  if (eq.low !== 0) filters.push({ kind: 'lowshelf', frequency: EQ_BANDS.lowShelfHz, gain: eq.low, q: 1 });
  if (eq.mid !== 0) filters.push({ kind: 'peaking', frequency: eq.midFreq, gain: eq.mid, q: EQ_BANDS.midQ });
  if (eq.high !== 0) filters.push({ kind: 'highshelf', frequency: EQ_BANDS.highShelfHz, gain: eq.high, q: 1 });
  return filters;
}

/** Combined response of the whole EQ at each frequency, in dB. */
export function eqResponse(eq: EqSettings, frequencies: readonly number[], sampleRate = 48000): number[] {
  const stages = eqFilters(eq).map((f) => coefficients(f.kind, f.frequency, f.gain, f.q, sampleRate));
  return frequencies.map((f) => stages.reduce((sum, c) => sum + magnitudeDb(c, f, sampleRate), 0));
}

/** Log-spaced frequencies from `min` to `max`, for drawing a response curve. */
export function logFrequencies(count: number, min: number = EQ_VIEW.min, max: number = EQ_VIEW.max): number[] {
  const ratio = max / min;
  return Array.from({ length: count }, (_, i) => min * Math.pow(ratio, i / (count - 1)));
}

/** Frequency ↔ 0–1 position on a log axis. */
export const freqToUnit = (f: number): number => Math.log(f / EQ_VIEW.min) / Math.log(EQ_VIEW.max / EQ_VIEW.min);
export const unitToFreq = (u: number): number => EQ_VIEW.min * Math.pow(EQ_VIEW.max / EQ_VIEW.min, u);

export const formatHz = (hz: number): string => (hz >= 1000 ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)} kHz` : `${Math.round(hz)} Hz`);
