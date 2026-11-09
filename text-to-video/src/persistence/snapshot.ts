import { encodeWav } from '../lib/wav';
import { loadAsset } from '../media/assetLoader';
import { mediaRegistry } from '../media/mediaRegistry';
import type { Asset, Project } from '../types/project';
import { SAVE_FORMAT, SAVE_VERSION, toSavedAsset, type SavedProject } from './schema';

/** A project ready to store: the JSON manifest plus the media blobs it refers to (by key). */
export interface Snapshot {
  manifest: SavedProject;
  media: Map<string, Blob>;
}

/**
 * The media behind an asset: the imported file, or — for audio made in the app
 * (stems) — a WAV encoded on first save and cached on the handle, so later
 * saves don't encode it again.
 */
export function mediaBlob(assetId: string): Blob | null {
  const handle = mediaRegistry.get(assetId);
  if (!handle) return null;
  if (handle.file) return handle.file;
  if (!handle.audio) return null;
  const channels = Array.from({ length: handle.audio.numberOfChannels }, (_, i) => handle.audio!.getChannelData(i));
  const file = new File([encodeWav(channels, handle.audio.sampleRate)], `${assetId}.wav`, { type: 'audio/wav' });
  mediaRegistry.update(assetId, { file });
  return file;
}

/**
 * Captures the current project. `keyFor` decides where each media file goes
 * (an IndexedDB key, or a path inside a .articvid file). Assets still loading
 * are left out — they aren't usable yet.
 */
export function createSnapshot(project: Project, assets: Record<string, Asset>, keyFor: (asset: Asset, blob: Blob) => string): Snapshot {
  const media = new Map<string, Blob>();
  const saved = Object.values(assets)
    .filter((asset) => asset.status === 'ready')
    .map((asset) => {
      const blob = mediaBlob(asset.id);
      const key = blob ? keyFor(asset, blob) : null;
      if (blob && key) media.set(key, blob);
      return toSavedAsset(asset, key, blob?.type ?? '');
    });
  return {
    manifest: { format: SAVE_FORMAT, version: SAVE_VERSION, savedAt: new Date().toISOString(), project, assets: saved },
    media,
  };
}

export interface Restored {
  project: Project;
  assets: Record<string, Asset>;
  /** Names of assets whose media couldn't be found or decoded. */
  missing: string[];
}

/**
 * Rebuilds a project from a manifest: every media file is decoded again (fresh
 * object URLs, waveforms, audio buffers) while the saved analysis — beats,
 * hand-made beat grids, lyrics, stem links — is kept, so nothing is re-analysed.
 */
export async function restoreSnapshot(saved: SavedProject, readMedia: (key: string) => Promise<Blob | undefined>): Promise<Restored> {
  const missing: string[] = [];
  const entries = await Promise.all(
    saved.assets.map(async ({ media, mediaType, ...meta }): Promise<Asset> => {
      const blob = media ? await readMedia(media).catch(() => undefined) : undefined;
      if (!blob) {
        missing.push(meta.name);
        return { ...meta, status: 'error' };
      }
      const file = blob instanceof File ? blob : new File([blob], meta.name, { type: mediaType || blob.type });
      try {
        const loaded = await loadAsset(meta.id, file);
        return { ...loaded, name: meta.name, beats: meta.beats, harmony: meta.harmony, lyrics: meta.lyrics, stems: meta.stems, stemOf: meta.stemOf };
      } catch {
        missing.push(meta.name);
        return { ...meta, status: 'error' };
      }
    }),
  );
  return { project: saved.project, assets: Object.fromEntries(entries.map((a) => [a.id, a])), missing };
}
