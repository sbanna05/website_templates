import { describe, expect, it } from 'vitest';
import { createAudioClip, createEmptyProject } from '../config/defaults';
import { handOvers } from '../engine/timeline';
import { mediaRegistry } from '../media/mediaRegistry';
import type { Asset, Project } from '../types/project';
import { encodeProjectFile, readProjectFile } from './projectFile';
import { SAVE_VERSION, SaveFormatError, normalizeProject, parseSaved } from './schema';
import { createSnapshot } from './snapshot';

const song: Asset = { id: 'a1', kind: 'audio', name: 'beat.wav', duration: 10, width: 0, height: 0, hasAudio: true, status: 'ready', beats: { bpm: 120, beats: [0.5, 1], onsets: [] } };

describe('save format', () => {
  it('fills in fields that older saves did not have', () => {
    const old = createEmptyProject() as Partial<Project>;
    delete old.master;
    const clip = createAudioClip(song, 't', 0) as Partial<ReturnType<typeof createAudioClip>>;
    delete clip.eq;
    const project = normalizeProject({ ...old, clips: [clip as never] });
    expect(project.master.limiter).toBe(true);
    expect(project.clips[0]).toMatchObject({ kind: 'audio', eq: { low: 0, lowCut: 0 } });
  });

  it('rejects foreign, damaged and too-new files with a readable message', () => {
    expect(() => parseSaved({ hello: 1 })).toThrow(SaveFormatError);
    expect(() => parseSaved({ format: 'articvid', version: SAVE_VERSION + 1, project: {}, assets: [] })).toThrow(/newer version/);
    expect(() => parseSaved({ format: 'articvid', version: 1, project: { clips: [] }, assets: [] })).toThrow(/damaged/);
  });

  it('round-trips a project file: manifest, analysis and media bytes', async () => {
    mediaRegistry.set('a1', { kind: 'audio', file: new File([new Uint8Array([1, 2, 3])], 'beat.wav', { type: 'audio/wav' }) });
    const project = { ...createEmptyProject(), name: 'My edit' };
    const loading: Asset = { ...song, id: 'a2', status: 'loading' };
    const blob = await encodeProjectFile(project, { a1: song, a2: loading });
    const { saved, readMedia } = await readProjectFile(blob);
    expect(saved.project.name).toBe('My edit');
    expect(saved.assets.map((a) => a.id)).toEqual(['a1']); // still-loading assets are skipped
    expect(saved.assets[0]).toMatchObject({ beats: { bpm: 120 }, media: 'media/a1.wav', mediaType: 'audio/wav' });
    expect(saved.assets[0]).not.toHaveProperty('status');
    const bytes = new Uint8Array(await (await readMedia('media/a1.wav'))!.arrayBuffer());
    expect([...bytes]).toEqual([1, 2, 3]);
    mediaRegistry.clear();
  });

  it('records a missing media file instead of failing the whole save', () => {
    const { manifest, media } = createSnapshot(createEmptyProject(), { a9: { ...song, id: 'a9' } }, (a) => a.id);
    expect(manifest.assets[0].media).toBeNull();
    expect(media.size).toBe(0);
  });

  it('refuses a file that is not a project', async () => {
    await expect(readProjectFile(new Blob(['not a zip']))).rejects.toThrow(/not an ArticVid project/);
  });
});

describe('crossfade hand-overs', () => {
  it('pairs a song with the next one that outlasts it — never twice for stacked parts', () => {
    const a = { start: 0, end: 10 };
    const b = { start: 8, end: 20 };
    const inside = { start: 2, end: 4 };
    expect(handOvers([b, a])).toEqual([[a, b]]);
    expect(handOvers([a, inside])).toEqual([]);
    // Three clips stacked at the same spot used to produce duplicate zones (and duplicate React keys).
    const twin = { start: 8, end: 20 };
    expect(handOvers([a, b, twin])).toHaveLength(1);
  });
});
