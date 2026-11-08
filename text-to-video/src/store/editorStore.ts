import { create } from 'zustand';
import { audioBufferCache } from '../audio/audioBufferCache';
import { dsp } from '../audio/dspClient';
import {
  DEFAULT_STILL_DURATION,
  MARKER_COLORS,
  createAudioClip,
  createEmptyProject,
  createTextClip,
  createTrack,
  createVisualClip,
} from '../config/defaults';
import { applyTextPreset, type TextPreset } from '../config/presets';
import { matchBeats, type BeatMatchOptions } from '../engine/beatMatch';
import { clipEnd, splitClip, splitTextToBeats, syncTrackToBeats, timelineBeats, trackEnd } from '../engine/timeline';
import { createId } from '../lib/id';
import { kindOf, loadAsset } from '../media/assetLoader';
import { mediaRegistry } from '../media/mediaRegistry';
import { monoForAnalysis } from '../media/waveform';
import type { Asset, AspectRatio, Clip, Marker, Project, Track, TrackKind } from '../types/project';
import { toast } from './toastStore';

const HISTORY_LIMIT = 100;
/** Edits sharing a key within this window collapse into one undo step (e.g. a slider drag). */
const COALESCE_MS = 700;

type Recipe = (project: Project) => Project;

/** What "Sync cuts" lines clips up with: the detected/tapped beats or your own marks. */
export type SyncSource = 'beats' | 'marks';

/** Two edits closer than this count as the same point. */
const SAME_POINT = 0.02;

interface EditorState {
  project: Project;
  assets: Record<string, Asset>;
  selectedClipId: string | null;
  past: Project[];
  future: Project[];
  lastEdit: { key: string; at: number } | null;

  commit: (recipe: Recipe, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
  select: (clipId: string | null) => void;

  setName: (name: string) => void;
  setAspect: (aspect: AspectRatio) => void;
  setBackground: (color: string) => void;

  importFiles: (files: File[]) => Promise<void>;
  removeAsset: (assetId: string) => void;
  addAssetToTimeline: (assetId: string, options?: { trackId?: string; start?: number }) => void;

  addText: (start: number, preset?: TextPreset) => void;
  updateClip: (clipId: string, recipe: (clip: Clip) => Clip, coalesceKey?: string) => void;
  deleteClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => void;
  splitSelected: (time: number) => void;

  addTrack: (kind: TrackKind) => void;
  updateTrack: (trackId: string, patch: Partial<Track>, coalesceKey?: string) => void;
  removeTrack: (trackId: string) => void;

  addManualBeat: (time: number) => void;
  clearManualBeats: () => void;
  toggleSnap: () => void;
  syncToBeats: (trackId: string, beatsPerClip: number, source?: SyncSource) => void;
  splitTextOnBeats: (clipId: string, unit: 'word' | 'line', beatsPer: number) => void;
  matchBeats: (options: BeatMatchOptions) => void;

  addMarker: (time: number) => void;
  updateMarker: (markerId: string, patch: Partial<Marker>, coalesceKey?: string) => void;
  removeMarker: (markerId: string) => void;
  clearMarkers: () => void;
}

const mapClips = (project: Project, fn: (clip: Clip) => Clip): Project => ({ ...project, clips: project.clips.map(fn) });

export const useEditor = create<EditorState>((set, get) => {
  /** Ensures a track of `kind` exists and returns its id. */
  const ensureTrack = (kind: TrackKind): string => {
    const existing = get().project.tracks.find((t) => t.kind === kind);
    if (existing) return existing.id;
    const track = createTrack(kind);
    get().commit((p) => ({ ...p, tracks: kind === 'audio' ? [...p.tracks, track] : [track, ...p.tracks] }));
    return track.id;
  };

  const setAsset = (asset: Asset) => set((s) => ({ assets: { ...s.assets, [asset.id]: asset } }));

  const analyzeBeats = async (asset: Asset) => {
    const buffer = mediaRegistry.get(asset.id)?.audio;
    if (!buffer) return;
    try {
      const { samples, sampleRate } = monoForAnalysis(buffer);
      const beats = await dsp.detectBeats(samples, sampleRate);
      const current = get().assets[asset.id];
      if (current) setAsset({ ...current, beats });
      if (beats.bpm > 0) toast(`${asset.name}: ${Math.round(beats.bpm)} BPM detected`, 'success');
    } catch (error) {
      toast(`Beat detection failed: ${String(error)}`, 'error');
    }
  };

  return {
    project: createEmptyProject(),
    assets: {},
    selectedClipId: null,
    past: [],
    future: [],
    lastEdit: null,

    commit: (recipe, coalesceKey) => {
      const { project, past, lastEdit } = get();
      const next = recipe(project);
      if (next === project) return;
      const now = performance.now();
      const coalesce = coalesceKey !== undefined && lastEdit?.key === coalesceKey && now - lastEdit.at < COALESCE_MS;
      set({
        project: next,
        past: coalesce ? past : [...past.slice(-HISTORY_LIMIT + 1), project],
        future: [],
        lastEdit: coalesceKey ? { key: coalesceKey, at: now } : null,
      });
    },

    undo: () => {
      const { past, project, future } = get();
      const previous = past.at(-1);
      if (!previous) return;
      set({ project: previous, past: past.slice(0, -1), future: [project, ...future], lastEdit: null });
    },

    redo: () => {
      const { past, project, future } = get();
      const [next, ...rest] = future;
      if (!next) return;
      set({ project: next, past: [...past, project], future: rest, lastEdit: null });
    },

    select: (selectedClipId) => set({ selectedClipId }),

    setName: (name) => get().commit((p) => ({ ...p, name }), 'name'),
    setAspect: (aspect) => get().commit((p) => ({ ...p, aspect })),
    setBackground: (backgroundColor) => get().commit((p) => ({ ...p, backgroundColor }), 'background'),

    importFiles: async (files) => {
      const accepted = files.filter((file) => {
        const ok = kindOf(file) !== null;
        if (!ok) toast(`Skipped "${file.name}" — unsupported file type`, 'error');
        return ok;
      });
      await Promise.all(
        accepted.map(async (file) => {
          const id = createId('asset');
          const kind = kindOf(file) ?? 'image';
          setAsset({ id, kind, name: file.name, duration: 0, width: 0, height: 0, hasAudio: false, status: 'loading' });
          try {
            const asset = await loadAsset(id, file);
            setAsset(asset);
            const hasMusic = get().project.clips.some((c) => c.kind === 'audio');
            if (asset.kind !== 'audio' || !hasMusic) get().addAssetToTimeline(id);
            if (asset.kind === 'audio') void analyzeBeats(asset);
          } catch (error) {
            set((s) => {
              const rest = { ...s.assets };
              delete rest[id];
              return { assets: rest };
            });
            toast(error instanceof Error ? error.message : String(error), 'error');
          }
        }),
      );
    },

    removeAsset: (assetId) => {
      get().commit((p) => ({ ...p, clips: p.clips.filter((c) => c.kind === 'text' || c.assetId !== assetId) }));
      mediaRegistry.remove(assetId);
      audioBufferCache.evictAsset(assetId);
      set((s) => {
        const rest = { ...s.assets };
        delete rest[assetId];
        return { assets: rest, selectedClipId: null };
      });
    },

    addAssetToTimeline: (assetId, options = {}) => {
      const asset = get().assets[assetId];
      if (!asset || asset.status !== 'ready') return;
      const trackId = options.trackId ?? ensureTrack(asset.kind === 'audio' ? 'audio' : 'visual');
      const start = options.start ?? trackEnd(get().project, trackId);
      const clip = asset.kind === 'audio' ? createAudioClip(asset, trackId, start) : createVisualClip(asset, trackId, start);
      get().commit((p) => ({ ...p, clips: [...p.clips, clip] }));
      set({ selectedClipId: clip.id });
    },

    addText: (start, preset) => {
      // Use the first text track that's free at this time; otherwise open a new one.
      const end = start + DEFAULT_STILL_DURATION;
      const { project } = get();
      const free = project.tracks.find(
        (t) => t.kind === 'text' && !project.clips.some((c) => c.trackId === t.id && c.start < end && clipEnd(c) > start),
      );
      let trackId = free?.id;
      if (!trackId) {
        const track = createTrack('text', `Text ${project.tracks.filter((t) => t.kind === 'text').length + 1}`);
        get().commit((p) => ({ ...p, tracks: [track, ...p.tracks] }));
        trackId = track.id;
      }
      const clip = createTextClip(trackId, start, preset ? { text: preset.sample, ...applyTextPreset(preset) } : {});
      get().commit((p) => ({ ...p, clips: [...p.clips, clip] }));
      set({ selectedClipId: clip.id });
    },

    updateClip: (clipId, recipe, coalesceKey) =>
      get().commit((p) => mapClips(p, (c) => (c.id === clipId ? recipe(c) : c)), coalesceKey ? `${clipId}:${coalesceKey}` : undefined),

    deleteClip: (clipId) => {
      get().commit((p) => ({ ...p, clips: p.clips.filter((c) => c.id !== clipId) }));
      if (get().selectedClipId === clipId) set({ selectedClipId: null });
    },

    duplicateClip: (clipId) => {
      const clip = get().project.clips.find((c) => c.id === clipId);
      if (!clip) return;
      const copy = { ...clip, id: createId('clip'), start: trackEnd(get().project, clip.trackId) };
      get().commit((p) => ({ ...p, clips: [...p.clips, copy] }));
      set({ selectedClipId: copy.id });
    },

    splitSelected: (time) => {
      const { selectedClipId, project } = get();
      const targets = project.clips.filter((c) =>
        selectedClipId ? c.id === selectedClipId : time > c.start && time < c.start + c.duration,
      );
      const replacements = new Map<string, [Clip, Clip]>();
      for (const clip of targets) {
        const parts = splitClip(clip, time);
        if (parts) replacements.set(clip.id, parts);
      }
      if (replacements.size === 0) {
        toast('Move the playhead inside a clip to split it');
        return;
      }
      get().commit((p) => ({ ...p, clips: p.clips.flatMap((c) => replacements.get(c.id) ?? [c]) }));
    },

    addTrack: (kind) => {
      const track = createTrack(kind, `${createTrack(kind).name} ${get().project.tracks.filter((t) => t.kind === kind).length + 1}`);
      get().commit((p) => ({ ...p, tracks: kind === 'audio' ? [...p.tracks, track] : [track, ...p.tracks] }));
    },

    updateTrack: (trackId, patch, coalesceKey) =>
      get().commit(
        (p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)) }),
        coalesceKey ? `${trackId}:${coalesceKey}` : undefined,
      ),

    removeTrack: (trackId) =>
      get().commit((p) => ({
        ...p,
        tracks: p.tracks.filter((t) => t.id !== trackId),
        clips: p.clips.filter((c) => c.trackId !== trackId),
      })),

    addManualBeat: (time) =>
      get().commit((p) => ({ ...p, manualBeats: [...p.manualBeats, time].sort((a, b) => a - b) })),
    clearManualBeats: () => get().commit((p) => ({ ...p, manualBeats: [] })),
    toggleSnap: () => get().commit((p) => ({ ...p, snapToBeats: !p.snapToBeats })),

    syncToBeats: (trackId, beatsPerClip, source = 'beats') => {
      const { project, assets } = get();
      const points =
        source === 'marks' ? project.markers.map((m) => m.time).sort((a, b) => a - b) : timelineBeats(project, assets);
      if (points.length < 2) {
        toast(
          source === 'marks'
            ? 'Add at least two marks (M) to cut on them'
            : 'Add music (or tap beats with B) to sync cuts to the beat',
          'error',
        );
        return;
      }
      get().commit((p) => ({ ...p, clips: syncTrackToBeats(p, assets, trackId, points, beatsPerClip) }));
      const what = source === 'marks' ? 'mark' : 'beat';
      toast(`Synced — every ${beatsPerClip} ${what}${beatsPerClip > 1 ? 's' : ''}`, 'success');
    },

    splitTextOnBeats: (clipId, unit, beatsPer) => {
      const { project, assets } = get();
      const clip = project.clips.find((c) => c.id === clipId);
      if (clip?.kind !== 'text') return;
      const pieces = splitTextToBeats(clip, timelineBeats(project, assets), unit, beatsPer);
      if (pieces.length < 2) {
        toast('Needs music with beats and at least two words or lines', 'error');
        return;
      }
      get().commit((p) => ({ ...p, clips: p.clips.flatMap((c) => (c.id === clipId ? pieces : [c])) }));
      toast(`Split into ${pieces.length} beat-synced ${unit === 'word' ? 'words' : 'lines'}`, 'success');
    },

    matchBeats: (options) => {
      const { assets } = get();
      let summary = { changed: 0, target: 0 };
      get().commit((p) => {
        const result = matchBeats(p, assets, options);
        summary = result;
        return result.changed === 0 ? p : { ...p, clips: result.clips };
      });
      if (summary.changed === 0) toast('Songs already share a tempo — nothing to change');
      else toast(`Matched ${summary.changed} song${summary.changed > 1 ? 's' : ''} to ${Math.round(summary.target)} BPM`, 'success');
    },

    addMarker: (time) => {
      const { markers } = get().project;
      if (markers.some((m) => Math.abs(m.time - time) < SAME_POINT)) return;
      const marker: Marker = {
        id: createId('mark'),
        time,
        label: `Mark ${markers.length + 1}`,
        color: MARKER_COLORS[markers.length % MARKER_COLORS.length],
      };
      get().commit((p) => ({ ...p, markers: [...p.markers, marker].sort((a, b) => a.time - b.time) }));
    },
    updateMarker: (markerId, patch, coalesceKey) =>
      get().commit(
        (p) => ({
          ...p,
          markers: p.markers.map((m) => (m.id === markerId ? { ...m, ...patch } : m)).sort((a, b) => a.time - b.time),
        }),
        coalesceKey ? `${markerId}:${coalesceKey}` : undefined,
      ),
    removeMarker: (markerId) => get().commit((p) => ({ ...p, markers: p.markers.filter((m) => m.id !== markerId) })),
    clearMarkers: () => get().commit((p) => ({ ...p, markers: [] })),
  };
});

/** Selector helpers. */
export const selectSelectedClip = (s: EditorState): Clip | undefined =>
  s.project.clips.find((c) => c.id === s.selectedClipId);
