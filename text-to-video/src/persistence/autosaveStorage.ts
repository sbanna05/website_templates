import type { Asset, Project } from '../types/project';
import { idb } from './idb';
import { parseSaved, type SavedProject } from './schema';
import { createSnapshot, restoreSnapshot, type Restored } from './snapshot';

/*
 * Autosave storage: the last session lives in IndexedDB — the manifest under
 * one key, each media file under its asset id. Media is written once (assets
 * never change after import); files no longer used are cleaned up afterwards.
 * The manifest is written after the media, so an interrupted save still leaves
 * the previous session intact.
 */

const SESSION_KEY = 'last-session';

export async function writeAutosave(project: Project, assets: Record<string, Asset>): Promise<void> {
  const { manifest, media } = createSnapshot(project, assets, (asset) => asset.id);
  const stored = new Set(await idb.keys('media'));
  for (const [key, blob] of media) if (!stored.has(key)) await idb.put('media', key, blob);
  await idb.put('session', SESSION_KEY, manifest);
  for (const key of stored) if (!media.has(key)) await idb.delete('media', key);
}

/** The last session's manifest, or null when there is none (or it can't be read). */
export async function readAutosave(): Promise<SavedProject | null> {
  const raw = await idb.get<unknown>('session', SESSION_KEY);
  return raw ? parseSaved(raw) : null;
}

export async function restoreAutosave(saved: SavedProject): Promise<Restored> {
  return restoreSnapshot(saved, (key) => idb.get<Blob>('media', key));
}

export async function clearAutosave(): Promise<void> {
  await Promise.all([idb.clear('session'), idb.clear('media')]);
}

/** Asks the browser not to evict autosaved projects under storage pressure (best effort). */
export async function requestPersistentStorage(): Promise<void> {
  if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist?.();
}
