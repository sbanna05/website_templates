import { create } from 'zustand';
import { getAudioContext } from '../audio/audioContext';
import { STEMS } from '../engine/stems';
import { createId } from '../lib/id';
import { mediaRegistry } from '../media/mediaRegistry';
import { computePeaks } from '../media/waveform';
import { STEM_MODEL } from '../stems/protocol';
import { prepareStereo, stemsClient, type SplitProgress } from '../stems/stemsClient';
import type { Asset, StemName } from '../types/project';
import { useEditor } from './editorStore';
import { toast } from './toastStore';

export type StemJob = ({ stage: 'preparing' } | SplitProgress) & {
  /** When separation itself started (performance.now()), for the time estimate. */
  separatingSince?: number;
};

interface StemsState {
  /** Running splits, keyed by the song's asset id. */
  jobs: Record<string, StemJob>;
  split: (assetId: string) => Promise<void>;
  cancel: (assetId: string) => void;
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, '');

/**
 * Orchestrates AI stem separation: song → 44.1 kHz stereo → HTDemucs (worker) →
 * four new stem assets (vocals, drums, bass, melody) linked to the song. Stems
 * share the song's timing and beat grid, so they drop into any clip of it.
 */
export const useStems = create<StemsState>((set, get) => {
  const setJob = (assetId: string, job: StemJob | null) =>
    set((s) => {
      const jobs = { ...s.jobs };
      if (job) jobs[assetId] = job;
      else delete jobs[assetId];
      return { jobs };
    });

  return {
    jobs: {},

    split: async (assetId) => {
      const editor = useEditor.getState();
      const song = editor.assets[assetId];
      const buffer = mediaRegistry.get(assetId)?.audio;
      if (!song || !buffer || get().jobs[assetId] || Object.keys(get().jobs).length > 0) {
        if (Object.keys(get().jobs).length > 0) toast('One stem split at a time — wait for the current one to finish');
        return;
      }
      setJob(assetId, { stage: 'preparing' });
      try {
        const pcm = await prepareStereo(buffer);
        let since: number | undefined;
        const stems = await stemsClient.separate(pcm, (progress) => {
          if (progress.stage === 'separating') since ??= performance.now();
          setJob(assetId, { ...progress, separatingSince: since });
        });

        const ids = {} as Record<StemName, string>;
        const ctx = getAudioContext();
        for (const { id: stem, label } of STEMS) {
          const { left, right } = stems[stem];
          const audio = ctx.createBuffer(2, left.length, STEM_MODEL.sampleRate);
          audio.copyToChannel(left as Float32Array<ArrayBuffer>, 0);
          audio.copyToChannel(right as Float32Array<ArrayBuffer>, 1);
          const id = createId('asset');
          mediaRegistry.set(id, { kind: 'audio', audio });
          const asset: Asset = {
            id,
            kind: 'audio',
            name: `${baseName(song.name)} · ${label}`,
            duration: audio.duration,
            width: 0,
            height: 0,
            hasAudio: true,
            waveform: computePeaks(audio),
            beats: useEditor.getState().assets[assetId]?.beats,
            harmony: useEditor.getState().assets[assetId]?.harmony,
            stemOf: { assetId, stem },
            status: 'ready',
          };
          useEditor.getState().registerAsset(asset);
          ids[stem] = id;
        }
        useEditor.getState().updateAsset(assetId, { stems: ids });
        toast(`${baseName(song.name)} split into vocals, drums, bass and melody`, 'success');
        // Chords read much cleaner without drums and vocals in the way.
        void useEditor.getState().analyzeHarmony(assetId);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') toast('Stem split cancelled');
        else toast(`Stem split failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      } finally {
        setJob(assetId, null);
      }
    },

    cancel: (assetId) => {
      if (get().jobs[assetId]) stemsClient.cancel();
    },
  };
});
