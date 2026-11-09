import { DEFAULT_MASTER } from '../audio/master';
import { DRY_EFFECTS, createEmptyProject } from '../config/defaults';
import { FLAT_EQ } from '../engine/eq';
import type { Asset, Clip, Project } from '../types/project';

/*
 * The saved form of a project — shared by autosave (IndexedDB) and project
 * files (.articvid). Plain JSON plus one media file per asset; runtime-only
 * data (object URLs, AudioBuffers, loading state) is never saved.
 */

export const SAVE_FORMAT = 'articvid';
/** Bump when the shape changes, and teach `normalizeProject` how to read the old one. */
export const SAVE_VERSION = 1;

/** An asset's analysis (beats, lyrics, stems…) plus where its media lives in the container. */
export type SavedAsset = Omit<Asset, 'status' | 'thumbnail'> & {
  /** Key of the media file (IndexedDB key or path inside the .articvid file); null when it was missing. */
  media: string | null;
  mediaType: string;
};

export interface SavedProject {
  format: typeof SAVE_FORMAT;
  version: number;
  savedAt: string;
  project: Project;
  assets: SavedAsset[];
}

export class SaveFormatError extends Error {}

/** Checks a parsed manifest and returns it typed, or throws a readable error. */
export function parseSaved(value: unknown): SavedProject {
  const data = value as Partial<SavedProject> | null;
  if (!data || data.format !== SAVE_FORMAT) throw new SaveFormatError('This is not an ArticVid project file.');
  if (typeof data.version !== 'number' || data.version > SAVE_VERSION) {
    throw new SaveFormatError('This project was saved by a newer version of ArticVid — update the app to open it.');
  }
  if (!data.project || !Array.isArray(data.project.clips) || !Array.isArray(data.project.tracks) || !Array.isArray(data.assets)) {
    throw new SaveFormatError('The project file is damaged (missing tracks, clips or assets).');
  }
  return { ...(data as SavedProject), project: normalizeProject(data.project) };
}

/**
 * Fills in anything an older save (or a newer feature) is missing, so every
 * loaded project has the full current shape. New fields get their defaults here.
 */
export function normalizeProject(project: Partial<Project>): Project {
  const base = createEmptyProject();
  const clips = (project.clips ?? []).map((clip): Clip => {
    if (clip.kind !== 'audio') return clip;
    return {
      ...clip,
      effects: { ...DRY_EFFECTS, ...clip.effects },
      eq: { ...FLAT_EQ, ...clip.eq },
      volumeKeys: clip.volumeKeys ?? [],
    };
  });
  return {
    ...base,
    ...project,
    clips,
    tracks: project.tracks ?? base.tracks,
    markers: project.markers ?? [],
    manualBeats: project.manualBeats ?? [],
    master: { ...DEFAULT_MASTER, ...project.master, eq: { ...FLAT_EQ, ...project.master?.eq } },
  };
}

/** Asset metadata worth keeping (everything but runtime state). */
export function toSavedAsset(asset: Asset, media: string | null, mediaType: string): SavedAsset {
  const saved: Partial<Asset> = { ...asset };
  delete saved.status;
  delete saved.thumbnail; // object URLs die with the page; thumbnails are rebuilt on load
  return { ...(saved as Omit<Asset, 'status' | 'thumbnail'>), media, mediaType };
}
