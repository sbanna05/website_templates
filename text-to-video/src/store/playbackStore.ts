import { create } from 'zustand';
import { audioBufferCache } from '../audio/audioBufferCache';
import { PreviewAudio, type Levels } from '../audio/previewAudio';
import { projectDuration } from '../engine/timeline';
import { clamp } from '../lib/math';
import { useEditor } from './editorStore';
import { toast } from './toastStore';

interface PlaybackState {
  time: number;
  playing: boolean;
  loop: boolean;
  preparing: boolean;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  step: (frames: number) => void;
  toggleLoop: () => void;
}

const audio = new PreviewAudio();

/** Live output level of the preview (after the master bus), for meters. */
export const readLevels = (): Levels => audio.levels();
let rafId = 0;

export const usePlayback = create<PlaybackState>((set, get) => {
  const tick = () => {
    const { project } = useEditor.getState();
    const duration = projectDuration(project);
    const now = audio.now();
    if (now >= duration) {
      if (get().loop) {
        get().seek(0); // seek() resumes playback when it was playing
      } else {
        get().pause();
        set({ time: duration });
      }
      return;
    }
    set({ time: now });
    rafId = requestAnimationFrame(tick);
  };

  return {
    time: 0,
    playing: false,
    loop: true,
    preparing: false,

    play: async () => {
      if (get().playing || get().preparing) return;
      const { project, assets } = useEditor.getState();
      const from = get().time >= projectDuration(project) - 0.05 ? 0 : get().time;
      const slow = audioBufferCache.pendingCount > 0;
      set({ preparing: true });
      if (slow) toast('Processing speed / pitch…');
      try {
        if (!(await audio.start(project, assets, from))) return;
        set({ playing: true, time: from });
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tick);
      } catch (error) {
        toast(`Playback failed: ${String(error)}`, 'error');
      } finally {
        set({ preparing: false });
      }
    },

    pause: () => {
      cancelAnimationFrame(rafId);
      if (!get().playing) {
        audio.stop();
        set({ preparing: false });
        return;
      }
      const time = audio.now();
      audio.stop();
      set({ playing: false, time });
    },

    toggle: () => (get().playing ? get().pause() : void get().play()),

    seek: (time) => {
      const duration = projectDuration(useEditor.getState().project);
      const next = clamp(time, 0, duration);
      const wasPlaying = get().playing;
      if (wasPlaying) get().pause();
      set({ time: next });
      if (wasPlaying) void get().play();
    },

    step: (frames) => {
      const { fps } = useEditor.getState().project;
      get().seek(Math.round((get().time + frames / fps) * fps) / fps);
    },

    toggleLoop: () => set((s) => ({ loop: !s.loop })),
  };
});

// Edits made while playing (volume, pitch, moving a clip…) re-schedule the mix.
let rescheduleTimer = 0;
const reschedule = () => {
  if (!usePlayback.getState().playing) return;
  clearTimeout(rescheduleTimer);
  rescheduleTimer = window.setTimeout(() => {
    const { project, assets } = useEditor.getState();
    void audio.reschedule(project, assets);
  }, 120);
};
useEditor.subscribe((state, prev) => {
  if (state.project !== prev.project || state.assets !== prev.assets) reschedule();
});
audioBufferCache.subscribe(reschedule);
