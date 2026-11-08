import { describe, expect, it } from 'vitest';
import { detectBeats } from './beatDetect';

/** Synthetic kick drum on every beat over a quiet pad. */
function kickTrack(bpm: number, seconds: number, sampleRate = 22050, offset = 0): Float32Array {
  const samples = new Float32Array(seconds * sampleRate);
  const period = 60 / bpm;
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / sampleRate;
    const sinceBeat = (t - offset + period) % period;
    const kick = Math.sin(2 * Math.PI * (60 + 120 * Math.exp(-sinceBeat * 30)) * sinceBeat) * Math.exp(-sinceBeat * 9);
    samples[i] = 0.8 * kick + 0.08 * Math.sin(2 * Math.PI * 220 * t);
  }
  return samples;
}

describe('detectBeats', () => {
  it.each([90, 120, 128, 150])('finds the tempo of a %i BPM kick pattern', (bpm) => {
    const { bpm: detected } = detectBeats(kickTrack(bpm, 20), 22050);
    expect(Math.abs(detected - bpm)).toBeLessThan(1.5);
  });

  it('aligns the grid with the actual kicks', () => {
    const offset = 0.23;
    const { beats } = detectBeats(kickTrack(120, 20, 22050, offset), 22050);
    const phaseErrors = beats.slice(2, 20).map((b) => {
      const d = (b - offset) % 0.5;
      return Math.min(d, 0.5 - d);
    });
    expect(Math.max(...phaseErrors)).toBeLessThan(0.04);
  });

  it('returns no beats for audio that is too short', () => {
    expect(detectBeats(new Float32Array(1000), 22050).beats).toEqual([]);
  });
});
