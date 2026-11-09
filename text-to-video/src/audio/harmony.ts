import type { ChordQuality, ChordSegment, HarmonyAnalysis, MusicalKey } from '../types/project';
import { Fft } from './fft';

/*
 * Key and chord detection.
 *
 *  1. Chromagram — spectral peaks folded onto the 12 pitch classes (C … B),
 *     after estimating the recording's tuning, plus a separate bass chroma.
 *  2. Beat-synchronous — chroma averaged per beat, so chords change on beats.
 *  3. Chords — every beat is scored against 24 major/minor triads (+ "no
 *     chord"); a Viterbi pass keeps chords from flickering.
 *  4. Key — the song's overall chroma and chord time correlated with the
 *     Krumhansl–Kessler key profiles.
 *
 * Works on the full mix; after a stem split it re-runs on bass + melody only,
 * where drums and vocals no longer muddy the harmony.
 */

const TARGET_RATE = 11025;
const FRAME = 4096;
const HOP = 1024;
const TREBLE = { min: 65, max: 2100 };
const BASS = { min: 38, max: 220 };
/** Bonus for keeping the same chord from one beat to the next. */
const STAY = 0.14;
/** Below this share of the song's median loudness a beat is "no chord". */
const SILENCE = 0.12;

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

interface Chromagram {
  /** 12 values per frame. */
  treble: Float64Array[];
  bass: Float64Array[];
  /** Loudness per frame. */
  energy: number[];
  /** Centre time of each frame, seconds. */
  times: number[];
  tuningCents: number;
}

/** Average-and-decimate to ~11 kHz — harmony lives well below 5 kHz. */
function decimate(samples: Float32Array, sampleRate: number): { data: Float32Array; rate: number } {
  const factor = Math.max(1, Math.floor(sampleRate / TARGET_RATE));
  if (factor === 1) return { data: samples, rate: sampleRate };
  const data = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < data.length; i += 1) {
    let sum = 0;
    for (let k = 0; k < factor; k += 1) sum += samples[i * factor + k];
    data[i] = sum / factor;
  }
  return { data, rate: sampleRate / factor };
}

export function chromagram(samples: Float32Array, sampleRate: number): Chromagram {
  const { data, rate } = decimate(samples, sampleRate);
  const frames = Math.max(0, Math.floor((data.length - FRAME) / HOP) + 1);
  const fft = new Fft(FRAME);
  const bins = FRAME / 2 + 1;
  const mags = new Float64Array(bins);
  const binHz = rate / FRAME;
  const scale = 4 / FRAME;
  const maxBin = Math.min(bins - 2, Math.ceil(TREBLE.max / binHz));
  const minBin = Math.max(1, Math.floor(BASS.min / binHz));

  // Pass 1: spectral peaks per frame (frequency + log magnitude).
  const peaks: { freq: Float32Array; value: Float32Array }[] = [];
  const energy: number[] = [];
  const times: number[] = [];
  for (let f = 0; f < frames; f += 1) {
    fft.magnitudes(data, f * HOP, mags);
    const freq: number[] = [];
    const value: number[] = [];
    let e = 0;
    for (let k = minBin; k <= maxBin; k += 1) {
      const m = mags[k] * scale;
      e += m * m;
      if (mags[k] <= mags[k - 1] || mags[k] < mags[k + 1]) continue;
      // Parabolic interpolation on log magnitude → sub-bin frequency.
      const a = Math.log(mags[k - 1] + 1e-12);
      const b = Math.log(mags[k] + 1e-12);
      const c = Math.log(mags[k + 1] + 1e-12);
      const denom = a - 2 * b + c;
      const delta = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
      freq.push((k + delta) * binHz);
      value.push(Math.log1p(100 * m));
    }
    peaks.push({ freq: Float32Array.from(freq), value: Float32Array.from(value) });
    energy.push(Math.sqrt(e));
    times.push((f * HOP + FRAME / 2) / rate);
  }

  // Tuning: circular mean of every peak's distance from the nearest equal-tempered note.
  let sx = 0;
  let sy = 0;
  for (const { freq, value } of peaks) {
    for (let i = 0; i < freq.length; i += 1) {
      if (freq[i] < 80 || freq[i] > 1000) continue;
      const midi = 69 + 12 * Math.log2(freq[i] / 440);
      const angle = 2 * Math.PI * (midi - Math.round(midi));
      sx += value[i] * Math.cos(angle);
      sy += value[i] * Math.sin(angle);
    }
  }
  const tuning = sx === 0 && sy === 0 ? 0 : Math.atan2(sy, sx) / (2 * Math.PI);

  // Pass 2: fold peaks into treble and bass chroma.
  const treble: Float64Array[] = [];
  const bass: Float64Array[] = [];
  for (const { freq, value } of peaks) {
    const t = new Float64Array(12);
    const b = new Float64Array(12);
    for (let i = 0; i < freq.length; i += 1) {
      const midi = 69 + 12 * Math.log2(freq[i] / 440) - tuning;
      const note = Math.round(midi);
      const off = midi - note;
      // Peaks between two notes count less.
      const w = value[i] * Math.cos(Math.PI * off) ** 2;
      const pc = mod12(note);
      if (freq[i] >= TREBLE.min) t[pc] += w;
      if (freq[i] >= BASS.min && freq[i] <= BASS.max) b[pc] += w;
    }
    treble.push(t);
    bass.push(b);
  }
  return { treble, bass, energy, times, tuningCents: Math.round(tuning * 100) };
}

/**
 * Segment edges: the beats (plus the song's start and end), or a steady 0.5 s pulse
 * when a song has none. `lead` is how many segments come before the first beat.
 */
function segmentEdges(beats: readonly number[], duration: number): { edges: number[]; lead: number; onBeats: boolean } {
  const inside = beats.filter((b) => b >= 0 && b < duration);
  if (inside.length >= 4) {
    const lead = inside[0] > 0.05 ? 1 : 0;
    return { edges: [...(lead ? [0] : []), ...inside, duration], lead, onBeats: true };
  }
  const edges: number[] = [];
  for (let t = 0; t < duration; t += 0.5) edges.push(t);
  return { edges: [...edges, duration], lead: 0, onBeats: false };
}

interface BeatChroma {
  treble: Float64Array;
  bass: Float64Array;
  energy: number;
}

function beatSynchronous(chroma: Chromagram, edges: readonly number[]): BeatChroma[] {
  const out: BeatChroma[] = [];
  let f = 0;
  for (let s = 0; s + 1 < edges.length; s += 1) {
    const [from, to] = [edges[s], edges[s + 1]];
    const treble = new Float64Array(12);
    const bass = new Float64Array(12);
    let energy = 0;
    let count = 0;
    while (f < chroma.times.length && chroma.times[f] < from) f += 1;
    for (let g = f; g < chroma.times.length && chroma.times[g] < to; g += 1) {
      for (let k = 0; k < 12; k += 1) {
        treble[k] += chroma.treble[g][k];
        bass[k] += chroma.bass[g][k];
      }
      energy += chroma.energy[g];
      count += 1;
    }
    if (count === 0) {
      // Beat shorter than a hop: borrow the nearest frame.
      const g = Math.min(chroma.times.length - 1, f);
      if (g >= 0) {
        treble.set(chroma.treble[g]);
        bass.set(chroma.bass[g]);
        energy = chroma.energy[g];
        count = 1;
      }
    }
    if (count > 1) {
      for (let k = 0; k < 12; k += 1) {
        treble[k] /= count;
        bass[k] /= count;
      }
      energy /= count;
    }
    out.push({ treble, bass, energy });
  }
  return out;
}

const QUALITIES: { quality: ChordQuality; intervals: [number, number, number] }[] = [
  { quality: 'maj', intervals: [0, 4, 7] },
  { quality: 'min', intervals: [0, 3, 7] },
];

/** 24 triads + "no chord" (index 24). */
const CHORD_STATES = QUALITIES.flatMap(({ quality, intervals }) =>
  Array.from({ length: 12 }, (_, root) => {
    const template = new Float64Array(12);
    const weights = [1, 0.85, 0.8];
    intervals.forEach((iv, i) => (template[mod12(root + iv)] = weights[i]));
    const norm = Math.hypot(...template);
    for (let k = 0; k < 12; k += 1) template[k] /= norm;
    return { root, quality, template };
  }),
);
const NO_CHORD = CHORD_STATES.length;

function normalized(v: Float64Array): Float64Array {
  // Remove the floor shared by all notes (noise, cymbals) before comparing shapes.
  let min = Infinity;
  for (const x of v) min = Math.min(min, x);
  const out = v.map((x) => x - 0.6 * min);
  const norm = Math.hypot(...out) || 1;
  return out.map((x) => x / norm);
}

function emissions(beat: BeatChroma, loudness: number): Float64Array {
  const scores = new Float64Array(NO_CHORD + 1);
  const quiet = beat.energy < SILENCE * loudness;
  const t = normalized(beat.treble);
  const bassMax = Math.max(...beat.bass) || 1;
  CHORD_STATES.forEach(({ root, template }, s) => {
    let dot = 0;
    for (let k = 0; k < 12; k += 1) dot += t[k] * template[k];
    scores[s] = quiet ? 0 : dot + 0.12 * (beat.bass[root] / bassMax);
  });
  scores[NO_CHORD] = quiet ? 1 : 0.55;
  return scores;
}

/** Most likely chord sequence, one state per beat. */
function viterbi(rows: Float64Array[]): number[] {
  if (rows.length === 0) return [];
  const states = rows[0].length;
  let score = Float64Array.from(rows[0]);
  const back: Int32Array[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    let bestPrev = 0;
    for (let s = 1; s < states; s += 1) if (score[s] > score[bestPrev]) bestPrev = s;
    const next = new Float64Array(states);
    const links = new Int32Array(states);
    for (let s = 0; s < states; s += 1) {
      const stay = score[s] + STAY;
      if (stay >= score[bestPrev]) {
        next[s] = stay + rows[i][s];
        links[s] = s;
      } else {
        next[s] = score[bestPrev] + rows[i][s];
        links[s] = bestPrev;
      }
    }
    back.push(links);
    score = next;
  }
  let state = 0;
  for (let s = 1; s < states; s += 1) if (score[s] > score[state]) state = s;
  const path = [state];
  for (let i = back.length - 1; i >= 0; i -= 1) {
    state = back[i][state];
    path.push(state);
  }
  return path.reverse();
}

/** Pearson correlation. */
function correlate(a: readonly number[], b: readonly number[]): number {
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i += 1) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** Key from the song's pitch distribution plus how long each chord is held. */
export function estimateKey(profile: readonly number[], chords: readonly ChordSegment[]): MusicalKey | null {
  if (profile.every((v) => v === 0)) return null;
  const held = new Map<string, number>();
  let total = 0;
  for (const c of chords) {
    if (c.root < 0) continue;
    const key = `${c.root}${c.quality}`;
    held.set(key, (held.get(key) ?? 0) + (c.end - c.start));
    total += c.end - c.start;
  }
  // Songs usually open on their home chord — the tie-breaker between relative keys (Am vs C).
  const opening = chords.find((c) => c.root >= 0);
  const candidates: { key: MusicalKey; score: number }[] = [];
  for (let tonic = 0; tonic < 12; tonic += 1) {
    for (const mode of ['major', 'minor'] as const) {
      const base = mode === 'major' ? MAJOR_PROFILE : MINOR_PROFILE;
      const rotated = Array.from({ length: 12 }, (_, k) => base[mod12(k - tonic)]);
      const tonicChord = (held.get(`${tonic}${mode === 'major' ? 'maj' : 'min'}`) ?? 0) / (total || 1);
      const opensHome = opening?.root === tonic && opening.quality === (mode === 'major' ? 'maj' : 'min') ? 0.12 : 0;
      candidates.push({ key: { tonic, mode, confidence: 0 }, score: correlate(profile, rotated) + 0.35 * tonicChord + opensHome });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const [best, second] = candidates;
  const confidence = Math.max(0, Math.min(1, (best.score - second.score) * 4 + Math.max(0, best.score) * 0.5));
  return { ...best.key, confidence: Number(confidence.toFixed(2)) };
}

export interface HarmonyResult {
  harmony: HarmonyAnalysis;
  /** How much the harmony changes on each beat (0–2) — chords tend to move on the downbeat. */
  beatChange: number[];
}

/**
 * Key and chords of a mono signal. `beats` (seconds) set where chords may change;
 * without them a steady half-second pulse is used.
 */
export function analyzeHarmony(
  samples: Float32Array,
  sampleRate: number,
  beats: readonly number[],
  source: HarmonyAnalysis['source'] = 'mix',
): HarmonyResult {
  const duration = samples.length / sampleRate;
  const chroma = chromagram(samples, sampleRate);
  const empty = { harmony: { key: null, tuning: 0, chords: [], source }, beatChange: [] };
  if (chroma.times.length === 0) return empty;

  const { edges, lead, onBeats } = segmentEdges(beats, duration);
  const perBeat = beatSynchronous(chroma, edges);
  const loudness = [...perBeat.map((b) => b.energy)].sort((a, b) => a - b)[Math.floor(perBeat.length / 2)] ?? 0;
  const path = viterbi(perBeat.map((b) => emissions(b, loudness)));

  // Merge runs of the same chord into segments.
  const chords: ChordSegment[] = [];
  const bassSum = new Float64Array(12);
  path.forEach((state, i) => {
    const start = edges[i];
    const end = edges[i + 1];
    const root = state === NO_CHORD ? -1 : CHORD_STATES[state].root;
    const quality = state === NO_CHORD ? 'maj' : CHORD_STATES[state].quality;
    const last = chords[chords.length - 1];
    if (last && last.root === root && last.quality === quality) {
      last.end = end;
    } else {
      if (last) finishBass(last, bassSum);
      bassSum.fill(0);
      chords.push({ start: Number(start.toFixed(3)), end, root, quality });
    }
    for (let k = 0; k < 12; k += 1) bassSum[k] += perBeat[i].bass[k];
  });
  if (chords.length) finishBass(chords[chords.length - 1], bassSum);
  for (const c of chords) c.end = Number(c.end.toFixed(3));

  const profile = new Array<number>(12).fill(0);
  for (const b of perBeat) {
    const n = normalized(b.treble);
    for (let k = 0; k < 12; k += 1) profile[k] += Math.max(0, n[k]) * b.energy;
  }

  // Harmonic change on each beat (indexes match `beats`).
  const inside = beats.filter((b) => b >= 0 && b < duration);
  const beatChange = onBeats && inside.length === beats.length
    ? beats.map((_, i) => {
        const cur = perBeat[i + lead];
        const prev = perBeat[i + lead - 1];
        if (!cur || !prev) return 0;
        const a = normalized(cur.treble);
        const b = normalized(prev.treble);
        let dot = 0;
        for (let k = 0; k < 12; k += 1) dot += a[k] * b[k];
        return 1 - dot;
      })
    : [];

  return {
    harmony: { key: estimateKey(profile, chords), tuning: chroma.tuningCents, chords, source },
    beatChange,
  };
}

/** Marks a slash chord when the bass clearly sits on the third or fifth instead of the root. */
function finishBass(chord: ChordSegment, bass: Float64Array): void {
  if (chord.root < 0) return;
  let top = 0;
  for (let k = 1; k < 12; k += 1) if (bass[k] > bass[top]) top = k;
  if (top === chord.root || bass[top] < 1.4 * (bass[chord.root] || 1e-9)) return;
  const interval = mod12(top - chord.root);
  const third = chord.quality === 'maj' ? 4 : 3;
  if (interval === third || interval === 7) chord.bass = top;
}
