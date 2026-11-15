import { describe, expect, it } from 'vitest';
import { crossfadeOverlaps, type MixSource } from '../audio/mixer';
import { createAudioClip, createEmptyProject } from '../config/defaults';
import type { Asset, AudioClip } from '../types/project';
import { buildUpKeys, createKey, pumpKeys, sampleVolume, sortKeys, volumeAt } from './automation';
import { buildCaptions, cleanWords, wordsOnTimeline } from './captions';
import { mainBeatClip, placeSection, sourceBars, timelineBars } from './sections';

const song = (id: string, bpm: number, seconds = 60): Asset => ({
  id,
  kind: 'audio',
  name: `${id}.mp3`,
  duration: seconds,
  width: 0,
  height: 0,
  hasAudio: true,
  status: 'ready',
  beats: { bpm, beats: Array.from({ length: Math.floor((seconds * bpm) / 60) }, (_, i) => 0.1 + (i * 60) / bpm), onsets: [] },
});

describe('volume automation', () => {
  it('is flat without keys and holds the end values outside the keys', () => {
    expect(volumeAt([], 3)).toBe(1);
    const keys = sortKeys([createKey(4, 0.5, 'linear'), createKey(2, 1.5, 'linear')]);
    expect(volumeAt(keys, 0)).toBe(1.5);
    expect(volumeAt(keys, 10)).toBe(0.5);
  });

  it('interpolates per shape: linear, smooth and hold', () => {
    const at = (shape: 'linear' | 'smooth' | 'hold', t: number) => volumeAt([createKey(0, 0, shape), createKey(1, 1)], t);
    expect(at('linear', 0.25)).toBeCloseTo(0.25);
    expect(at('smooth', 0.25)).toBeLessThan(0.25); // eases in
    expect(at('smooth', 0.5)).toBeCloseTo(0.5);
    expect(at('hold', 0.99)).toBe(0);
  });

  it('samples a curve for the audio engine', () => {
    const curve = sampleVolume(buildUpKeys({ from: 0, to: 10, beats: [] }), 0, 10, 11);
    expect(curve.length).toBe(11);
    expect(curve[0]).toBeCloseTo(0.2);
    expect(curve[10]).toBeCloseTo(1.15);
  });

  it('pump ducks on each beat and recovers before the next', () => {
    const keys = sortKeys(pumpKeys({ from: 0, to: 2, beats: [0, 0.5, 1, 1.5] }, 0.6, 0.5));
    expect(volumeAt(keys, 0.5)).toBeCloseTo(0.4);
    expect(volumeAt(keys, 0.74)).toBeGreaterThan(0.9);
    expect(volumeAt(keys, 0.99)).toBeCloseTo(1); // held until the next beat
  });
});

describe('main beat sections', () => {
  const assets = { beat: song('beat', 120), vocal: song('vocal', 100) };

  function setup() {
    const project = createEmptyProject();
    const track = project.tracks.find((t) => t.kind === 'audio')!;
    const beat = { ...createAudioClip(assets.beat, track.id, 0), duration: 30 };
    const vocal: AudioClip = { ...createAudioClip(assets.vocal, track.id, 30), beatSource: false, pitch: -2 };
    project.clips = [beat, vocal];
    return { project, beat, vocal };
  }

  it('finds the main beat and its bars', () => {
    const { project, beat } = setup();
    expect(mainBeatClip(project, assets)?.id).toBe(beat.id);
    expect(sourceBars(assets.beat).slice(0, 3)).toEqual([0.1, 2.1, 4.1]);
    const bars = timelineBars(beat, assets.beat, 40);
    expect(bars[bars.length - 1]).toBeGreaterThan(30); // extrapolated past the clip
  });

  it('places a section re-timed to the main tempo, starting on the next bar', () => {
    const { project, vocal } = setup();
    const from = assets.vocal.beats!.beats[8];
    const to = assets.vocal.beats!.beats[24];
    const part = placeSection(project, assets, vocal, { from, to, at: 5, trackId: 't2', matchTempo: true }, 'new');
    expect(part.speed).toBeCloseTo(1.2);
    expect(part.start).toBeCloseTo(6.1); // first bar of the 120 BPM beat at or after 5 s
    expect(part.inPoint).toBe(from);
    expect(part.duration).toBeCloseTo((to - from) / 1.2);
    expect(part.pitch).toBe(-2); // edits carry over
    expect(part.beatSource).toBe(false);
  });
});

describe('captions', () => {
  const words = [
    { text: ' [Music]', start: 0, end: 1 },
    { text: 'hold', start: 1, end: 1.3 },
    { text: 'on', start: 1.35, end: 1.6 },
    { text: 'tight,', start: 1.65, end: 2 },
    { text: 'we', start: 3.2, end: 3.4 },
    { text: 'run', start: 3.45, end: 3.8 },
  ];

  it('drops non-speech tags', () => {
    expect(cleanWords(words).map((w) => w.text)).toEqual(['hold', 'on', 'tight,', 'we', 'run']);
  });

  it('groups phrases at punctuation and pauses, never overlapping', () => {
    const captions = buildCaptions(cleanWords(words), { mode: 'phrases', maxWords: 4, maxGap: 0.7, beats: [] });
    expect(captions.map((c) => c.text)).toEqual(['hold on tight,', 'we run']);
    expect(captions[0].end).toBeLessThanOrEqual(captions[1].start);
  });

  it('word mode makes one caption per word and snaps to nearby beats', () => {
    const captions = buildCaptions(cleanWords(words), { mode: 'words', maxWords: 1, maxGap: 1, beats: [1.05, 3.5] });
    expect(captions).toHaveLength(5);
    expect(captions[0].start).toBe(1.05);
    expect(captions[4].start).toBe(3.5);
  });

  it('maps source time to the timeline through a re-timed clip', () => {
    const clip = { ...createAudioClip(song('s', 100), 'track', 10), inPoint: 1, speed: 2, duration: 5 };
    const mapped = wordsOnTimeline(cleanWords(words), clip);
    expect(mapped[0].start).toBeCloseTo(10); // source 1 s = clip start
    expect(mapped[3].start).toBeCloseTo(11.1);
  });
});

describe('crossfadeOverlaps', () => {
  const source = (start: number, end: number, trackId = 'a'): MixSource => ({
    layers: [{ assetId: 'x', gain: 1 }], speed: 1, pitch: 0, start, end, offset: 0, volume: 1, fadeIn: 0, fadeOut: 0.2, trackId, inPoint: 0,
  });

  it('fades the earlier song out and the later one in across the overlap', () => {
    const [a, b] = crossfadeOverlaps([source(0, 10), source(8, 20)]);
    expect(a.fadeOut).toBeCloseTo(2);
    expect(b.fadeIn).toBeCloseTo(2);
  });

  it('layers a part placed inside a longer song instead of fading the song out', () => {
    const [song, part] = crossfadeOverlaps([source(0, 60), source(10, 15)]);
    expect(song.fadeOut).toBe(0.2);
    expect(part.fadeIn).toBe(0);
  });

  it('leaves clips on other tracks alone', () => {
    const [a, b] = crossfadeOverlaps([source(0, 10, 'a'), source(8, 20, 'b')]);
    expect(a.fadeOut).toBe(0.2);
    expect(b.fadeIn).toBe(0);
  });
});
