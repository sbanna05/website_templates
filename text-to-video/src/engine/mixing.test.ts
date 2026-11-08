import { describe, expect, it } from 'vitest';
import { clipLayers } from '../audio/mixer';
import { createAudioClip } from '../config/defaults';
import { encodeWav } from '../lib/wav';
import type { Asset, AudioClip } from '../types/project';
import { currentGrid, downbeatAt, resetGrid, steadyBeats, tapTempo, withGrid } from './beatGrid';
import { EQ_BANDS, FLAT_EQ, eqResponse, isFlatEq } from './eq';
import { backToBack, healClips, mergeBlocker } from './merge';
import { sourceBars } from './sections';
import { FULL_STEM_MIX, STEM_PRESETS, isFullMix, matchesPreset, presetMix, stemGains } from './stems';

const song = (id: string, extra: Partial<Asset> = {}): Asset => ({
  id,
  kind: 'audio',
  name: `${id}.mp3`,
  duration: 60,
  width: 0,
  height: 0,
  hasAudio: true,
  status: 'ready',
  ...extra,
});

describe('EQ response', () => {
  it('is flat (0 dB everywhere) with no bands set', () => {
    expect(isFlatEq(FLAT_EQ)).toBe(true);
    expect(eqResponse(FLAT_EQ, [30, 1000, 15000]).every((db) => db === 0)).toBe(true);
  });

  it('boosts the band a shelf or bell targets and leaves the rest alone', () => {
    const [deepBass, mids, air] = eqResponse({ ...FLAT_EQ, low: 6 }, [25, 2000, 16000]);
    expect(deepBass).toBeCloseTo(6, 0);
    expect(Math.abs(mids)).toBeLessThan(0.5);
    expect(Math.abs(air)).toBeLessThan(0.1);

    const [atCentre] = eqResponse({ ...FLAT_EQ, mid: -9, midFreq: 1500 }, [1500]);
    expect(atCentre).toBeCloseTo(-9, 1);

    const [treble] = eqResponse({ ...FLAT_EQ, high: 4 }, [18000]);
    expect(treble).toBeGreaterThan(3.5);
  });

  it('cuts below the low-cut corner (−3 dB at the corner, Butterworth)', () => {
    const [atCorner, wellBelow, above] = eqResponse({ ...FLAT_EQ, lowCut: 100 }, [100, 25, 1000]);
    expect(atCorner).toBeCloseTo(-3, 0);
    expect(wellBelow).toBeLessThan(-20);
    expect(Math.abs(above)).toBeLessThan(0.1);
    expect(EQ_BANDS.lowShelfHz).toBeLessThan(EQ_BANDS.highShelfHz);
  });
});

describe('stem mixing', () => {
  it('solo beats mute, mute beats volume', () => {
    expect(stemGains(FULL_STEM_MIX)).toEqual({ vocals: 1, drums: 1, bass: 1, other: 1 });
    const muted = { ...FULL_STEM_MIX, vocals: { volume: 1, muted: true, solo: false } };
    expect(stemGains(muted).vocals).toBe(0);
    const solo = { ...muted, drums: { volume: 0.5, muted: false, solo: true } };
    expect(stemGains(solo)).toEqual({ vocals: 0, drums: 0.5, bass: 0, other: 0 });
  });

  it('builds and recognises presets', () => {
    const instrumental = STEM_PRESETS.find((p) => p.id === 'instrumental')!;
    const mix = presetMix(instrumental);
    expect(mix.vocals.muted).toBe(true);
    expect(matchesPreset(mix, instrumental)).toBe(true);
    expect(isFullMix(mix)).toBe(false);
    expect(isFullMix(presetMix(STEM_PRESETS[0]))).toBe(true);
  });

  it('plays the song itself until it is split, then only the audible stems', () => {
    const clip: AudioClip = { ...createAudioClip(song('s'), 't', 0), stems: presetMix(STEM_PRESETS.find((p) => p.id === 'acapella')!) };
    expect(clipLayers(clip, song('s'))).toEqual([{ assetId: 's', gain: 1 }]);
    const split = song('s', { stems: { vocals: 'v', drums: 'd', bass: 'b', other: 'o' } });
    expect(clipLayers(clip, split)).toEqual([{ assetId: 'v', gain: 1 }]);
    expect(clipLayers({ ...clip, stems: undefined }, split)).toEqual([{ assetId: 's', gain: 1 }]);
  });
});

describe('beat grid', () => {
  it('builds a steady grid and knows which beat starts a bar', () => {
    // 120 BPM, downbeat at 1.25 s → beats every 0.5 s from 0.25 s; 1.25 s is the 3rd beat (index 2).
    const { beats, firstBar } = steadyBeats({ bpm: 120, anchor: 1.25 }, 4);
    expect(beats.slice(0, 4)).toEqual([0.25, 0.75, 1.25, 1.75]);
    expect(firstBar).toBe(2);
    const asset = song('a', { duration: 4, beats: { bpm: 120, beats, onsets: [], firstBar } });
    expect(sourceBars(asset)).toEqual([1.25, 3.25]);
  });

  it('locks to a grid and resets to the detected beats', () => {
    const detected = { bpm: 121.3, beats: [0.1, 0.6, 1.08], onsets: [] };
    const locked = withGrid(detected, { bpm: 120, anchor: 0.1 }, 2);
    expect(locked.bpm).toBe(120);
    expect(locked.beats[1]).toBeCloseTo(0.6);
    expect(locked.detected?.bpm).toBe(121.3);
    expect(currentGrid(locked)).toEqual({ bpm: 120, anchor: 0.1 });
    expect(resetGrid(locked)).toEqual(detected);
  });

  it('snaps a downbeat to a nearby detected beat', () => {
    const analysis = { bpm: 120, beats: [0.5, 1, 1.5], onsets: [] };
    expect(downbeatAt(analysis, 1.04).anchor).toBe(1);
    expect(downbeatAt(analysis, 1.25).anchor).toBe(1.25);
  });

  it('turns taps into a tempo, ignoring pauses', () => {
    expect(tapTempo([0, 0.5])).toBeNull();
    expect(tapTempo([0, 0.5, 1, 1.5])).toBe(120);
    expect(tapTempo([0, 0.5, 1, 1.5, 9, 9.5])).toBe(120);
  });
});

describe('merging parts', () => {
  const base = createAudioClip(song('s'), 't', 0);
  const part = (start: number, inPoint: number, duration: number): AudioClip => ({ ...base, id: `c${start}`, start, inPoint, duration });

  it('heals parts split from one stretch of a song', () => {
    const healed = healClips([part(4, 4, 3), part(0, 0, 4)]);
    expect(healed).toMatchObject({ start: 0, inPoint: 0, duration: 7 });
  });

  it('refuses to heal parts that were moved or skip audio', () => {
    expect(healClips([part(0, 0, 4), part(5, 4, 3)])).toBeNull(); // gap on the timeline
    expect(healClips([part(0, 0, 4), part(4, 10, 3)])).toBeNull(); // jumps in the song
  });

  it("does not heal parts whose sound differs (it would silently drop the second part's settings)", () => {
    expect(healClips([part(0, 0, 4), { ...part(4, 4, 3), volume: 0.5 }])).toBeNull();
    expect(healClips([part(0, 0, 4), { ...part(4, 4, 3), eq: { ...FLAT_EQ, low: 6 } }])).toBeNull();
    expect(healClips([part(0, 0, 4), { ...part(4, 4, 3), fadeOut: 2 }])).toMatchObject({ fadeOut: 2 });
  });

  it('lines parts up back to back and explains what cannot be merged', () => {
    const placed = backToBack([part(10, 30, 2), part(2, 0, 3)]);
    expect(placed.map((c) => c.start)).toEqual([2, 5]);
    expect(mergeBlocker([part(0, 0, 1)])).toMatch(/two or more/);
    expect(mergeBlocker([part(0, 0, 4), part(9, 20, 3)])).toBeNull();
  });
});

describe('WAV encoding', () => {
  it('writes a valid 16-bit PCM header and clamps samples', () => {
    const wav = encodeWav([new Float32Array([0, 1, -1, 2])], 48000);
    const view = new DataView(wav);
    const text = (o: number) => String.fromCharCode(...new Uint8Array(wav, o, 4));
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint32(40, true)).toBe(8);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
    expect(view.getInt16(50, true)).toBe(32767);
  });
});
