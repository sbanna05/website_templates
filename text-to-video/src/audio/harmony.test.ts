import { describe, expect, it } from 'vitest';
import { camelotCode, chordName, compatibleCodes, keyCompatibility, keyName } from '../engine/musicTheory';
import { analyzeHarmony } from './harmony';

const RATE = 22050;
const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** Piano-ish chords (with harmonics) plus a bass note on the root, one chord every `secondsEach`. */
function progression(chords: number[][], secondsEach: number, repeats = 3, detuneCents = 0): Float32Array {
  const total = chords.length * secondsEach * repeats;
  const out = new Float32Array(Math.round(total * RATE));
  const detune = 2 ** (detuneCents / 1200);
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    const notes = chords[Math.floor(t / secondsEach) % chords.length];
    const local = t % secondsEach;
    const env = Math.min(1, local * 40) * Math.exp(-local * 0.6);
    let v = 0;
    for (const note of notes) {
      const f = midiHz(note) * detune;
      v += Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t) + 0.15 * Math.sin(6 * Math.PI * f * t);
    }
    v += 0.8 * Math.sin(2 * Math.PI * midiHz(notes[0] - 24) * detune * t);
    out[i] = 0.12 * env * v;
  }
  return out;
}

// C major, G major, A minor, F major (I–V–vi–IV)
const C = [60, 64, 67];
const G = [55, 59, 62];
const Am = [57, 60, 64];
const F = [53, 57, 60];

const longChords = (chords: { start: number; end: number; root: number; quality: 'maj' | 'min'; bass?: number }[]) =>
  chords.filter((c) => c.end - c.start >= 1).map((c) => chordName({ root: c.root, quality: c.quality }));

describe('analyzeHarmony', () => {
  const beats = Array.from({ length: 48 }, (_, i) => i * 0.5);

  it('names the chords of a I–V–vi–IV progression', () => {
    const { harmony } = analyzeHarmony(progression([C, G, Am, F], 2), RATE, beats);
    expect(longChords(harmony.chords).slice(0, 4)).toEqual(['C', 'G', 'Am', 'F']);
  });

  it('finds the key', () => {
    const { harmony } = analyzeHarmony(progression([C, G, Am, F], 2), RATE, beats);
    expect(harmony.key && keyName(harmony.key)).toBe('C major');
  });

  it('finds a minor key', () => {
    const Dm = [62, 65, 69];
    const Em = [64, 67, 71];
    const { harmony } = analyzeHarmony(progression([Am, Dm, Em, Am], 2), RATE, beats);
    expect(harmony.key && keyName(harmony.key)).toBe('A minor');
  });

  it('reads Am–F–C–G as A minor, not its relative C major', () => {
    const { harmony } = analyzeHarmony(progression([Am, F, C, G], 2), RATE, beats);
    expect(harmony.key && keyName(harmony.key)).toBe('A minor');
  });

  it('copes with a recording that is not tuned to 440 Hz', () => {
    const { harmony } = analyzeHarmony(progression([C, G, Am, F], 2, 3, 35), RATE, beats);
    expect(Math.abs(harmony.tuning - 35)).toBeLessThan(10);
    expect(longChords(harmony.chords).slice(0, 4)).toEqual(['C', 'G', 'Am', 'F']);
  });

  it('reports one harmonic-change value per beat, peaking where chords move', () => {
    const { beatChange } = analyzeHarmony(progression([C, G, Am, F], 2), RATE, beats);
    expect(beatChange).toHaveLength(beats.length);
    // Chords change every 4 beats (2 s at 120 BPM).
    expect(beatChange[4]).toBeGreaterThan(beatChange[5]);
  });

  it('marks silence as no chord', () => {
    const { harmony } = analyzeHarmony(new Float32Array(RATE * 4), RATE, []);
    expect(harmony.chords.every((c) => c.root === -1)).toBe(true);
  });
});

describe('music theory', () => {
  it('maps keys onto the Camelot wheel', () => {
    expect(camelotCode({ tonic: 9, mode: 'minor', confidence: 1 })).toBe('8A');
    expect(camelotCode({ tonic: 0, mode: 'major', confidence: 1 })).toBe('8B');
    expect(camelotCode({ tonic: 6, mode: 'minor', confidence: 1 })).toBe('11A');
    expect(camelotCode({ tonic: 4, mode: 'major', confidence: 1 })).toBe('12B');
  });

  it('rates key compatibility', () => {
    const am = { tonic: 9, mode: 'minor' as const, confidence: 1 };
    expect(keyCompatibility(am, { tonic: 0, mode: 'major', confidence: 1 })).toBe('perfect');
    expect(keyCompatibility(am, { tonic: 4, mode: 'minor', confidence: 1 })).toBe('perfect');
    expect(keyCompatibility(am, { tonic: 1, mode: 'major', confidence: 1 })).toBe('clash');
    expect(compatibleCodes(am)).toEqual(['8A', '7A', '9A', '8B']);
  });

  it('transposes chord names with the clip pitch', () => {
    expect(chordName({ root: 9, quality: 'min' }, 2)).toBe('Bm');
    expect(chordName({ root: 0, quality: 'maj', bass: 4 })).toBe('C/E');
    expect(chordName({ root: -1, quality: 'maj' })).toBe('N.C.');
  });
});
