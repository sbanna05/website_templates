import { create } from 'zustand';
import { audioBufferCache } from '../audio/audioBufferCache';
import { createEmptyProject } from '../config/defaults';
import { mediaRegistry } from '../media/mediaRegistry';
import { readAutosave, requestPersistentStorage, restoreAutosave, writeAutosave } from '../persistence/autosaveStorage';
import { ProjectFileTarget, encodeProjectFile, projectFileName, readProjectFile } from '../persistence/projectFile';
import type { Restored } from '../persistence/snapshot';
import { restoreSnapshot } from '../persistence/snapshot';
import type { Project } from '../types/project';
import { useEditor } from './editorStore';
import { usePlayback } from './playbackStore';
import { toast } from './toastStore';

/*
 * Saving, in two layers:
 * 1. Autosave — every change is written to IndexedDB about a second later, and
 *    the last session is restored when the app opens. Protects against crashes,
 *    reloads and closed tabs, with no action needed.
 * 2. Project files — Save / Save as / Open a self-contained .articvid file, for
 *    backups, versions and moving a project to another computer.
 */

export type AutosaveStatus = 'starting' | 'idle' | 'saving' | 'saved' | 'error';

interface SaveState {
  autosave: AutosaveStatus;
  /** Last successful autosave (ms since epoch). */
  savedAt: number | null;
  /** Name of the project file "Save" writes to, once there is one. */
  fileName: string | null;
  /** The project as it was when last written to the file — anything else is unsaved. */
  fileProject: Project | null;
  /** Blocking work in progress ("Opening project…"), shown as an overlay. */
  busy: string | null;
  init: () => Promise<void>;
  save: (saveAs?: boolean) => Promise<void>;
  open: () => Promise<void>;
  newProject: () => void;
}

const AUTOSAVE_DELAY = 1000;
const fileTarget = new ProjectFileTarget();
let started: Promise<void> | null = null;
/** Autosave is paused while a project is being swapped in, so a half-loaded state is never written. */
let suspended = true;
let timer = 0;
let writing: Promise<void> | null = null;
let rerun = false;
let quotaWarned = false;

export const useSaveStatus = create<SaveState>((set, get) => {
  const runAutosave = async (): Promise<void> => {
    window.clearTimeout(timer);
    timer = 0;
    if (suspended) return;
    if (writing) {
      rerun = true; // something changed while writing — save again right after
      return;
    }
    const { project, assets } = useEditor.getState();
    // Half-imported files aren't usable yet; the import finishing triggers another save.
    if (Object.values(assets).some((a) => a.status === 'loading')) return;
    set({ autosave: 'saving' });
    writing = writeAutosave(project, assets);
    try {
      await writing;
      set({ autosave: 'saved', savedAt: Date.now() });
      void requestPersistentStorage().catch(() => undefined);
    } catch (error) {
      set({ autosave: 'error' });
      const full = error instanceof DOMException && error.name === 'QuotaExceededError';
      if (!quotaWarned || !full) {
        quotaWarned ||= full;
        toast(
          full
            ? 'Autosave stopped: the browser storage is full. Use Save (Ctrl S) to keep a project file.'
            : `Autosave failed: ${error instanceof Error ? error.message : String(error)}`,
          'error',
        );
      }
    } finally {
      writing = null;
      if (rerun) {
        rerun = false;
        schedule();
      }
    }
  };

  const schedule = () => {
    if (suspended) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void runAutosave(), AUTOSAVE_DELAY);
  };

  /** Swaps the whole project for another one, with autosave paused and old media released. */
  const swapProject = async (label: string, load: () => Promise<Restored>): Promise<Restored | null> => {
    usePlayback.getState().pause();
    suspended = true;
    window.clearTimeout(timer);
    set({ busy: label });
    try {
      mediaRegistry.clear();
      audioBufferCache.clear();
      useEditor.getState().loadProject(createEmptyProject(), {});
      const restored = await load();
      useEditor.getState().loadProject(restored.project, restored.assets);
      usePlayback.getState().seek(0);
      if (restored.missing.length) {
        toast(`Some media could not be loaded: ${restored.missing.slice(0, 3).join(', ')}${restored.missing.length > 3 ? '…' : ''}`, 'error');
      }
      return restored;
    } finally {
      set({ busy: null });
      suspended = false;
      schedule();
    }
  };

  return {
    autosave: 'starting',
    savedAt: null,
    fileName: null,
    fileProject: null,
    busy: null,

    init: () => {
      // Runs once (React StrictMode mounts effects twice in development).
      started ??= (async () => {
        try {
          const saved = await readAutosave();
          if (saved && (saved.project.clips.length > 0 || saved.assets.length > 0)) {
            await swapProject('Restoring your last session…', () => restoreAutosave(saved));
            const at = new Date(saved.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            toast(`Restored your last session (autosaved at ${at})`, 'success');
            set({ savedAt: Date.parse(saved.savedAt) });
          }
        } catch (error) {
          toast(`Couldn't restore the last session: ${error instanceof Error ? error.message : String(error)}`, 'error');
        } finally {
          suspended = false;
          set({ autosave: 'idle' });
        }
        useEditor.subscribe((state, prev) => {
          if (state.project !== prev.project || state.assets !== prev.assets) schedule();
        });
        // Leaving the tab or closing it: write now instead of waiting for the timer.
        const flush = () => {
          if (timer) void runAutosave();
        };
        document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
        window.addEventListener('pagehide', flush);
        window.addEventListener('beforeunload', (event) => {
          if (timer || writing) event.preventDefault(); // a change is still being saved
        });
      })();
      return started;
    },

    save: async (saveAs = false) => {
      const { project, assets } = useEditor.getState();
      if (Object.values(assets).some((a) => a.status === 'loading')) {
        toast('Wait for the import to finish, then save');
        return;
      }
      set({ busy: 'Saving project file…' });
      try {
        const blob = await encodeProjectFile(project, assets);
        const name = await fileTarget.write(blob, fileTarget.name ?? projectFileName(project.name), saveAs);
        if (!name) return; // picker cancelled
        set({ fileName: name, fileProject: project });
        toast(`Saved ${name} (${(blob.size / 1024 / 1024).toFixed(1)} MB)`, 'success');
      } catch (error) {
        toast(`Saving failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      } finally {
        set({ busy: null });
      }
    },

    open: async () => {
      try {
        const file = await fileTarget.pick();
        if (!file) return;
        // Validate first: a broken file leaves the current project untouched.
        const source = await readProjectFile(file);
        const restored = await swapProject(`Opening ${file.name}…`, () => restoreSnapshot(source.saved, source.readMedia));
        set({ fileName: fileTarget.name ?? file.name, fileProject: restored?.project ?? null });
        toast(`Opened ${file.name}`, 'success');
      } catch (error) {
        toast(`Couldn't open the project: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    },

    newProject: () => {
      const { project, assets } = useEditor.getState();
      const hasWork = project.clips.length > 1 || Object.keys(assets).length > 0;
      const unsavedToFile = get().fileProject !== project;
      if (hasWork && unsavedToFile && !window.confirm('Start a new project? The current one is not saved to a file and will be replaced.')) return;
      fileTarget.forget();
      set({ fileName: null, fileProject: null });
      void swapProject('Starting a new project…', async () => ({ project: createEmptyProject(), assets: {}, missing: [] }));
    },
  };
});

/** True when the project changed since it was last saved to (or opened from) a file. */
export const selectUnsavedFile = (fileProject: Project | null, project: Project) => fileProject !== null && fileProject !== project;
