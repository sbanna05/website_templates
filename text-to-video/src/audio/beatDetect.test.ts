import { describe, expect, it } from 'vitest';
import { chooseDownbeat, detectBeats, fitGrid } from './beatDetect';

/** Synthetic kick drum on every beat over a quiet pad; `accent` makes every 4th kick louder (bar starts). */
function kickTrack(bpm: number, seconds: number, sampleRate = 22050, offset = 0, accent = 1): Float32Array {
  const samples = new Float32Array(Math.round(seconds * sampleRate));
  const period = 60 / bpm;
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / sampleRate;
    if (t < offset) continue;
    const beat = Math.floor((t - offset) / period);
    const sinceBeat = t - offset - beat * period;
    const gain = beat % 4 === 0 ? accent : 1;
    const kick = Math.sin(2 * Math.PI * (60 + 120 * Math.exp(-sinceBeat * 30)) * sinceBeat) * Math.exp(-sinceBeat * 9);
    const hat = sinceBeat > period / 2 && sinceBeat < period / 2 + 0.02 ? 0.15 * Math.sin(i * 1.7) : 0;
    samples[i] = 0.7 * gain * kick + hat + 0.05 * Math.sin(2 * Math.PI * 220 * t);
  }
  return samples;
}

const phaseError = (beats: number[], offset: number, period: number) =>
  beats.map((b) => {
    const d = (((b - offset) % period) + period) % period;
    return Math.min(d, period - d);
  });

describe('detectBeats', () => {
  it.each([90, 120, 128, 150, 174])('finds the tempo of a %i BPM kick pattern', (bpm) => {
    const { bpm: detected } = detectBeats(kickTrack(bpm, 20), 22050);
    expect(Math.abs(detected - bpm)).toBeLessThan(0.5);
  });

  it('aligns the grid with the actual kicks', () => {
    const offset = 0.23;
    const { beats } = detectBeats(kickTrack(120, 20, 22050, offset), 22050);
    expect(Math.max(...phaseError(beats.slice(1), offset, 0.5))).toBeLessThan(0.02);
  });

  it('locks a steady song to an exact grid that does not drift over minutes', () => {
    const bpm = 126;
    const offset = 0.41;
    const result = detectBeats(kickTrack(bpm, 150, 22050, offset), 22050);
    expect(result.steady).toBe(true);
    expect(result.bpm).toBe(126);
    // The last beats of a 2½-minute song still sit on the kick.
    expect(Math.max(...phaseError(result.beats.slice(-20), offset, 60 / bpm))).toBeLessThan(0.015);
  });

  it('finds the downbeat from accented bar starts', () => {
    const offset = 0.3;
    const { beats, firstBar = 0 } = detectBeats(kickTrack(120, 24, 22050, offset, 2.2), 22050);
    // Bar starts are kicks number 0, 4, 8… after `offset`.
    const index = Math.round((beats[firstBar] - offset) / 0.5);
    expect(((index % 4) + 4) % 4).toBe(0);
  });

  it('returns no beats for audio that is too short', () => {
    expect(detectBeats(new Float32Array(1000), 22050).beats).toEqual([]);
  });
});

describe('fitGrid', () => {
  it('fits through skipped beats', () => {
    const times = [0.1, 0.6, 1.1, 2.1, 2.6, 3.1, 4.1].map((t) => t + 0.001);
    const fit = fitGrid(times, 0.49);
    expect(fit.period).toBeCloseTo(0.5, 3);
    expect(fit.residual).toBeLessThan(0.002);
  });
});

describe('chooseDownbeat', () => {
  it('prefers the phase with chord changes when kicks are even', () => {
    const low = new Array<number>(32).fill(1);
    const change = low.map((_, i) => (i % 4 === 2 ? 1 : 0.05));
    expect(chooseDownbeat(low, change)).toBe(2);
  });
});
