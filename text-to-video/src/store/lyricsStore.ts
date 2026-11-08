import { create } from 'zustand';
import { lyricsClient, prepareSpeech, type TranscribeOptions } from '../lyrics/lyricsClient';
import { LYRIC_MODELS } from '../lyrics/protocol';
import { mediaRegistry } from '../media/mediaRegistry';
import type { MediaClip } from '../types/project';
import { useEditor } from './editorStore';
import { toast } from './toastStore';

export type LyricsJob =
  | { stage: 'preparing' }
  | { stage: 'download'; progress: number }
  | { stage: 'transcribing' };

interface LyricsState {
  /** Running detections, keyed by asset id. */
  jobs: Record<string, LyricsJob>;
  detect: (clip: MediaClip, options: Omit<TranscribeOptions, 'onProgress'>) => Promise<void>;
}

/**
 * Orchestrates word detection: cut the clip's audio → (vocal focus) → 16 kHz →
 * Whisper in a worker → store the timed words on the asset. Kept apart from the
 * editor store so the undo history never contains progress noise.
 */
export const useLyrics = create<LyricsState>((set, get) => {
  const setJob = (assetId: string, job: LyricsJob | null) =>
    set((s) => {
      const jobs = { ...s.jobs };
      if (job) jobs[assetId] = job;
      else delete jobs[assetId];
      return { jobs };
    });

  return {
    jobs: {},

    detect: async (clip, options) => {
      const { assetId } = clip;
      // A separated vocal stem is the cleanest input there is: no beat for the model to mishear.
      const vocalStem = useEditor.getState().assets[assetId]?.stems?.vocals;
      const buffer = mediaRegistry.get(vocalStem ?? assetId)?.audio;
      if (!buffer || get().jobs[assetId]) return;
      // Transcribe exactly the part of the song this clip plays.
      const from = clip.inPoint;
      const to = clip.inPoint + clip.duration * clip.speed;
      setJob(assetId, { stage: 'preparing' });
      try {
        const samples = await prepareSpeech(buffer, from, to, options.vocalFocus && !vocalStem);
        const words = await lyricsClient.transcribe(samples, {
          ...options,
          onProgress: (p) => setJob(assetId, p.stage === 'download' ? { stage: 'download', progress: p.progress } : { stage: 'transcribing' }),
        });
        const shifted = words.map((w) => ({ ...w, start: w.start + from, end: w.end + from }));
        useEditor.getState().updateAsset(assetId, {
          lyrics: { words: shifted, from, to, language: options.language, model: LYRIC_MODELS[options.model].id },
        });
        toast(shifted.length ? `Detected ${shifted.length} words` : 'No words detected — try “Accurate” or vocal focus', shifted.length ? 'success' : 'info');
      } catch (error) {
        toast(`Lyric detection failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      } finally {
        setJob(assetId, null);
      }
    },
  };
});
