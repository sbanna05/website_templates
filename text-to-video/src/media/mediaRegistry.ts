import type { AssetKind } from '../types/project';

/** Non-serializable media handles, kept outside the (undoable) store. */
export interface MediaHandle {
  kind: AssetKind;
  file: File;
  url: string;
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
  remove: (assetId: string): void => {
    const handle = handles.get(assetId);
    if (handle) URL.revokeObjectURL(handle.url);
    handles.delete(assetId);
  },
};
