import type { AssetKind } from '../types/project';

/** Non-serializable media handles, kept outside the (undoable) store. */
export interface MediaHandle {
  kind: AssetKind;
  /** The imported file. Generated audio (stems) has none — it lives only as an AudioBuffer. */
  file?: File;
  url?: string;
  image?: HTMLImageElement;
  audio?: AudioBuffer;
}

const handles = new Map<string, MediaHandle>();

export const mediaRegistry = {
  get: (assetId: string): MediaHandle | undefined => handles.get(assetId),
  set: (assetId: string, handle: MediaHandle): void => {
    handles.set(assetId, handle);
  },
  update: (assetId: string, patch: Partial<MediaHandle>): void => {
    const current = handles.get(assetId);
    if (current) handles.set(assetId, { ...current, ...patch });
  },
  /** Drops every handle (and its object URL) — used when another project is opened. */
  clear: (): void => {
    for (const handle of handles.values()) if (handle.url) URL.revokeObjectURL(handle.url);
    handles.clear();
  },
  remove: (assetId: string): void => {
    const handle = handles.get(assetId);
    if (handle?.url) URL.revokeObjectURL(handle.url);
    handles.delete(assetId);
  },
};
