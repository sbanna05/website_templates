import { describe, expect, it } from 'vitest';
import { createAudioClip, createEmptyProject, createTextClip, createVisualClip } from '../config/defaults';
import type { Asset, Project } from '../types/project';
import { clipEnd, projectDuration, snapValue, splitClip, syncTrackToBeats, timelineBeats, trimEnd, trimStart, withSpeed } from './timeline';

const video: Asset = { id: 'v', kind: 'video', name: 'v.mp4', duration: 10, width: 1920, height: 1080, hasAudio: true, status: 'ready' };
const image: Asset = { id: 'i', kind: 'image', name: 'i.jpg', duration: 0, width: 1080, height: 1080, hasAudio: false, status: 'ready' };
const song: Asset = {
  id: 's',
  kind: 'audio',
  name: 's.mp3',
  duration: 30,
  width: 0,
  height: 0,
  hasAudio: true,
  status: 'ready',
  beats: { bpm: 120, beats: Array.from({ length: 60 }, (_, i) => i * 0.5), onsets: [] },
};

describe('clip speed', () => {
  it('halves the timeline length at 2× and doubles it at 0.5×', () => {
    const clip = createVisualClip(video, 't', 0);
    expect(withSpeed(clip, 2, video).duration).toBeCloseTo(5);
    expect(withSpeed(clip, 0.5, video).duration).toBeCloseTo(20);
  });

  it('never extends past the end of the source', () => {
    const clip = { ...createVisualClip(video, 't', 0), inPoint: 8, duration: 2 };
    expect(withSpeed(clip, 0.5, video).duration).toBeCloseTo(4);
    expect(trimEnd(clip, 100, video).duration).toBeCloseTo(2);
  });
});

describe('split & trim', () => {
  it('splits a media clip and offsets the in-point of the right half', () => {
    const clip = { ...createVisualClip(video, 't', 2), speed: 2, duration: 4 };
    const [left, right] = splitClip(clip, 3)!;
    expect(left.duration).toBeCloseTo(1);
    expect(right.start).toBe(3);
    expect(right.kind === 'visual' && right.inPoint).toBeCloseTo(2);
    expect(clipEnd(right)).toBeCloseTo(6);
  });

  it('refuses slivers', () => {
    expect(splitClip(createTextClip('t', 0), 0.01)).toBeNull();
  });

  it('trims the start without revealing media before frame 0', () => {
    const clip = { ...createVisualClip(video, 't', 5), inPoint: 1 };
    const result = trimStart(clip, 0);
    expect(result.start).toBeCloseTo(4);
    expect(result.inPoint).toBeCloseTo(0);
  });

  it('lets stills be any length', () => {
    expect(trimEnd(createVisualClip(image, 't', 0), 42, image).duration).toBe(42);
  });
});

describe('beats', () => {
  const withSong = (): Project => {
    const project = createEmptyProject();
    const music = project.tracks.find((t) => t.kind === 'audio')!;
    return { ...project, clips: [{ ...createAudioClip(song, music.id, 1), inPoint: 2, duration: 4 }] };
  };

  it('maps source beats onto the timeline through in-point and start', () => {
    const beats = timelineBeats(withSong(), { s: song });
    expect(beats[0]).toBeCloseTo(1);
    expect(beats).toHaveLength(8);
  });

  it('accounts for speed', () => {
    const project = withSong();
    project.clips = project.clips.map((c) => (c.kind === 'audio' ? { ...c, speed: 2 } : c));
    const beats = timelineBeats(project, { s: song });
    expect(beats[1] - beats[0]).toBeCloseTo(0.25);
  });

  it('re-sequences clips so every cut lands on a beat', () => {
    const project = createEmptyProject();
    const track = project.tracks.find((t) => t.kind === 'visual')!;
    project.clips = [createVisualClip(image, track.id, 0), createVisualClip(image, track.id, 3), createVisualClip(image, track.id, 6)];
    const beats = [0.5, 1, 1.5, 2, 2.5, 3, 3.5];
    const synced = syncTrackToBeats(project, { i: image }, track.id, beats, 2).filter((c) => c.trackId === track.id);
    expect(synced.map((c) => c.start)).toEqual([0.5, 1.5, 2.5]);
    expect(synced.every((c) => Math.abs(c.duration - 1) < 1e-9)).toBe(true);
  });

  it('snaps to the closest candidate within the threshold only', () => {
    expect(snapValue(1.04, [1, 2], 0.05)).toBe(1);
    expect(snapValue(1.2, [1, 2], 0.05)).toBe(1.2);
  });
});

describe('projectDuration', () => {
  it('has a sensible floor', () => {
    expect(projectDuration({ ...createEmptyProject(), clips: [] })).toBe(3);
  });
});
