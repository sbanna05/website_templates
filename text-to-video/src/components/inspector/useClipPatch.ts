import { useCallback } from 'react';
import { useEditor } from '../../store/editorStore';
import type { Clip } from '../../types/project';

type Patch<T> = Partial<T> | ((clip: T) => Partial<T>);

/**
 * Typed updater for the clip being inspected. Passing a `key` coalesces rapid
 * edits (slider drags) into a single undo step.
 */
export function useClipPatch<T extends Clip>(clip: T): (patch: Patch<T>, key?: string) => void {
  const updateClip = useEditor((s) => s.updateClip);
  return useCallback(
    (patch, key) =>
      updateClip(
        clip.id,
        (current) => ({ ...current, ...(typeof patch === 'function' ? patch(current as T) : patch) }) as Clip,
        key,
      ),
    [clip.id, updateClip],
  );
}
