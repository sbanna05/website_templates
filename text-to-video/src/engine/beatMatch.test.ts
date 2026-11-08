import { describe, expect, it } from 'vitest';
import { createAudioClip, createEmptyProject, createTextClip, createVisualClip } from '../config/defaults';
import type { Asset, AudioClip, Project } from '../types/project';
import { matchBeats, octaveTarget, targetBpm, matchCandidates } from './beatMatch';
import { pacedProgress } from './motion';
import { clipEnd, splitTextToBeats, timelineBeats } from './timeline';

const song = (id: string, bpm: number, seconds = 60): Asset => ({
  id,
  kind: 'audio',
  name: `${id}.mp3`,
  duration: seconds,
  width: 0,
  height: 0,
  hasAudio: true,
  status: 'ready',
  beats: { bpm, beats: Array.from({ length: Math.floor((seconds * bpm) / 60) }, (_, i) => (i * 60) / bpm), onsets: [] },
});
const image: Asset = { id: 'img', kind: 'image', name: 'i.jpg', duration: 0, width: 1000, height: 1000, hasAudio: false, status: 'ready' };

const assets = { a: song('a', 120), b: song('b', 100), c: song('c', 70) };

function twoSongs(): { project: Project; a: AudioClip; b: AudioClip } {
  const project = createEmptyProject();
  const music = project.tracks.find((t) => t.kind === 'audio')!;
  const a = { ...createAudioClip(assets.a, music.id, 0), duration: 10, pitch: 3, volume: 0.6 };
  const b = { ...createAudioClip(assets.b, music.id, 10.13), duration: 10, pitch: -2, fadeIn: 0.4 };
  project.clips = [a, b];
  return { project, a, b };
}

describe('octave folding', () => {
  it('pairs a half-time song with a full-time one', () => {
    expect(octaveTarget(70, 140)).toBe(70);
    expect(octaveTarget(100, 120)).toBe(120);
    expect(octaveTarget(130, 60)).toBe(120);
  });
});

describe('matchBeats', () => {
  it('follow-base: re-times the other song to the base tempo and keeps its edits', () => {
    const { project, a, b } = twoSongs();
    const { clips, target } = matchBeats(project, assets, { baseClipId: a.id, mode: 'follow-base', alignPhase: false, keepEditsOnBeat: false });
    const nextA = clips.find((c) => c.id === a.id) as AudioClip;
    const nextB = clips.find((c) => c.id === b.id) as AudioClip;
    expect(target).toBe(120);
    expect(nextA).toBe(a); // the base is untouched
    expect(nextB.speed).toBeCloseTo(1.2);
    expect(nextB.duration).toBeCloseTo(10 / 1.2);
    expect([nextB.pitch, nextB.fadeIn, nextB.volume]).toEqual([b.pitch, b.fadeIn, b.volume]);
  });

  it('meet: moves both songs to a tempo in between', () => {
    const { project, a } = twoSongs();
    const options = { baseClipId: a.id, mode: 'meet' as const, alignPhase: false, keepEditsOnBeat: false };
    const target = targetBpm(matchCandidates(project, assets), options);
    expect(target).toBeCloseTo(Math.sqrt(120 * 100), 3);
    const { clips } = matchBeats(project, assets, options);
    const speeds = clips.map((c) => (c.kind === 'audio' ? c.speed : 1));
    expect(speeds[0]).toBeLessThan(1);
    expect(speeds[1]).toBeGreaterThan(1);
  });

  it('custom: drives every song to a typed tempo, octave-folded', () => {
    const project = createEmptyProject();
    const music = project.tracks.find((t) => t.kind === 'audio')!;
    project.clips = [{ ...createAudioClip(assets.c, music.id, 0), duration: 10 }];
    const { clips } = matchBeats(project, assets, { baseClipId: '', mode: 'custom', customBpm: 140, alignPhase: false, keepEditsOnBeat: false });
    expect((clips[0] as AudioClip).speed).toBeCloseTo(1); // 70 BPM already fits 140 at half time
  });

  it('stops a slowed-down song where the next song on its track begins', () => {
    const { project, a, b } = twoSongs();
    // Base is b (100 BPM): a slows from 120 → 100 and would grow from 10 s to 12 s.
    const { clips } = matchBeats(project, assets, { baseClipId: b.id, mode: 'follow-base', alignPhase: false, keepEditsOnBeat: false });
    const nextA = clips.find((c) => c.id === a.id) as AudioClip;
    expect(nextA.speed).toBeCloseTo(100 / 120);
    expect(clipEnd(nextA)).toBeCloseTo(b.start);
  });

  it('aligns the second song so its beats land on the base grid', () => {
    const { project, a } = twoSongs();
    const { clips } = matchBeats(project, assets, { baseClipId: a.id, mode: 'follow-base', alignPhase: true, keepEditsOnBeat: false });
    const beats = timelineBeats({ ...project, clips }, assets);
    const second = beats.filter((t) => t >= 10);
    const offGrid = second.map((t) => Math.abs(((t + 0.25) % 0.5) - 0.25));
    expect(Math.max(...offGrid)).toBeLessThan(0.01);
  });

  it('keeps cuts that were on a song beat on that same beat', () => {
    const { project, a, b } = twoSongs();
    const video = project.tracks.find((t) => t.kind === 'visual')!;
    // Cut exactly on b's 4th beat (0.6 s per beat at 100 BPM).
    const cut = b.start + 4 * 0.6;
    const photo = { ...createVisualClip(image, video.id, b.start), duration: cut - b.start };
    const after = createVisualClip(image, video.id, cut);
    const caption = createTextClip(project.tracks[0].id, 3.33); // not on a beat → untouched
    project.clips.push(photo, after, caption);
    const { clips } = matchBeats(project, assets, { baseClipId: a.id, mode: 'follow-base', alignPhase: false, keepEditsOnBeat: true });
    const movedPhoto = clips.find((c) => c.id === photo.id)!;
    expect(clipEnd(movedPhoto)).toBeCloseTo(b.start + 4 * 0.5, 3);
    expect(clips.find((c) => c.id === after.id)!.start).toBeCloseTo(b.start + 2, 3);
    expect(clips.find((c) => c.id === caption.id)!.start).toBe(3.33);
  });
});

describe('pacedProgress', () => {
  it('slow-middle is fast at the edges and still in the middle', () => {
    const at = (t: number) => pacedProgress('slow-middle', t, 1, 0, []);
    expect(at(0)).toBeCloseTo(0);
    expect(at(1)).toBeCloseTo(1);
    expect(at(0.55) - at(0.45)).toBeLessThan(at(0.1) - at(0));
  });

  it('on-beat holds between beats and steps on each beat', () => {
    const beats = [0.5, 1, 1.5];
    const at = (t: number) => pacedProgress('on-beat', t, 2, 0, beats);
    expect(at(0.45)).toBeCloseTo(at(0.4), 3); // holding
    expect(at(0.95)).toBeGreaterThan(at(0.45)); // stepped on 0.5
    expect(at(1.99)).toBeLessThanOrEqual(1);
  });
});

describe('splitTextToBeats', () => {
  it('puts each word on its own beat', () => {
    const clip = createTextClip('t', 0.2, { text: 'one two three' });
    const pieces = splitTextToBeats(clip, [0, 0.5, 1, 1.5, 2, 2.5], 'word', 1);
    expect(pieces.map((p) => p.text)).toEqual(['one', 'two', 'three']);
    expect(pieces.map((p) => p.start)).toEqual([0.5, 1, 1.5]);
    expect(pieces[0].id).toBe(clip.id);
  });

  it('splits by line and spans several beats', () => {
    const clip = createTextClip('t', 0, { text: 'first line\nsecond line' });
    const pieces = splitTextToBeats(clip, [0, 0.5, 1, 1.5, 2], 'line', 2);
    expect(pieces.map((p) => [p.start, p.duration])).toEqual([
      [0, 1],
      [1, 1],
    ]);
  });
});
