import { useMemo } from 'react';
import { mainBeatClip } from '../engine/sections';
import { selectSelectedClip, useEditor } from '../store/editorStore';
import type { AudioClip } from '../types/project';

/** The song the chord row and deck follow: the selected music clip, else the main beat, else any analysed song. */
export function useHarmonyClip(): AudioClip | undefined {
  const selected = useEditor(selectSelectedClip);
  const project = useEditor((s) => s.project);
  const assets = useEditor((s) => s.assets);
  return useMemo(() => {
    if (selected?.kind === 'audio' && assets[selected.assetId]?.harmony) return selected;
    const main = mainBeatClip(project, assets);
    if (main && assets[main.assetId]?.harmony) return main;
    return project.clips.find((c): c is AudioClip => c.kind === 'audio' && Boolean(assets[c.assetId]?.harmony));
  }, [selected, project, assets]);
}
