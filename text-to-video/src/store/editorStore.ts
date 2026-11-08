import { create } from 'zustand';
import { audioBufferCache } from '../audio/audioBufferCache';
import { bounceClips } from '../audio/bounce';
import { dsp } from '../audio/dspClient';
import {
  DEFAULT_STILL_DURATION,
  DEFAULT_TRANSFORM,
  MARKER_COLORS,
  createAudioClip,
  createEmptyProject,
  createTextClip,
  createTrack,
  createVisualClip,
} from '../config/defaults';
import { TEXT_PRESETS, applyTextPreset, type TextPreset } from '../config/presets';
import { matchBeats, type BeatMatchOptions } from '../engine/beatMatch';
import { resetGrid, withGrid } from '../engine/beatGrid';
import { buildCaptions, cleanWords, wordsOnTimeline, type CaptionMode } from '../engine/captions';
import { backToBack, healClips, mergeBlocker, spanOf, type MergeLayout } from '../engine/merge';
import { mainBeatClip, placeSection } from '../engine/sections';
import { FULL_STEM_MIX, STEMS, stemGains } from '../engine/stems';
import { clipEnd, isMediaClip, splitClip, splitTextToBeats, syncTrackToBeats, timelineBeats, trackEnd } from '../engine/timeline';
import { createId } from '../lib/id';
import { kindOf, loadAsset } from '../media/assetLoader';
import { mediaRegistry } from '../media/mediaRegistry';
import { monoForAnalysis } from '../media/waveform';
import type {
  Asset,
  AspectRatio,
  AudioClip,
  BeatGrid,
  Clip,
  Marker,
  MasterSettings,
  Project,
  Track,
  TrackKind,
} from '../types/project';
import { toast } from './toastStore';

const HISTORY_LIMIT = 100;
/** Edits sharing a key within this window collapse into one undo step (e.g. a slider drag). */
const COALESCE_MS = 700;

type Recipe = (project: Project) => Project;

/** What "Sync cuts" lines clips up with: the detected/tapped beats or your own marks. */
export type SyncSource = 'beats' | 'marks';

export interface SectionOptions {
  from: number;
  to: number;
  at: number;
  matchTempo: boolean;
}

export interface CaptionRequest {
  mode: CaptionMode;
  presetId: string;
  snapToBeats: boolean;
}

/** How a click changes the selection: replace it, toggle one clip (Ctrl/⌘), or add to it (Shift). */
export type SelectMode = 'replace' | 'toggle' | 'add';

/** Highest clip volume the inspector offers (200 %). */
const CLIP_VOLUME_MAX = 2;

/** Two edits closer than this count as the same point. */
const SAME_POINT = 0.02;

interface EditorState {
  project: Project;
  assets: Record<string, Asset>;
  /** Every selected clip, in the order they were picked. */
  selectedClipIds: string[];
  /** The most recently picked clip of the selection. */
  selectedClipId: string | null;
  /** The master bus is open in the inspector. */
  masterSelected: boolean;
  past: Project[];
  future: Project[];
  lastEdit: { key: string; at: number } | null;

  commit: (recipe: Recipe, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
  select: (clipId: string | null, mode?: SelectMode) => void;
  selectMany: (clipIds: string[], additive?: boolean) => void;
  selectAll: () => void;
  selectMaster: () => void;

  setName: (name: string) => void;
  setAspect: (aspect: AspectRatio) => void;
  setBackground: (color: string) => void;

  importFiles: (files: File[]) => Promise<void>;
  removeAsset: (assetId: string) => void;
  updateAsset: (assetId: string, patch: Partial<Asset>) => void;
  /** Adds an asset produced in the app (stems) — its media must already be in the registry. */
  registerAsset: (asset: Asset) => void;
  addAssetToTimeline: (assetId: string, options?: { trackId?: string; start?: number }) => void;

  addText: (start: number, preset?: TextPreset) => void;
  updateClip: (clipId: string, recipe: (clip: Clip) => Clip, coalesceKey?: string) => void;
  /** One edit (one undo step) applied to several clips. */
  updateClips: (clipIds: readonly string[], recipe: (clip: Clip) => Clip, coalesceKey?: string) => void;
  deleteClip: (clipId: string) => void;
  deleteClips: (clipIds: readonly string[]) => void;
  duplicateClip: (clipId: string) => void;
  duplicateClips: (clipIds: readonly string[]) => void;
  splitSelected: (time: number) => void;
  mergeClips: (clipIds: readonly string[], layout: MergeLayout) => Promise<void>;
  extractStems: (clipId: string) => void;

  addTrack: (kind: TrackKind) => void;
  updateTrack: (trackId: string, patch: Partial<Track>, coalesceKey?: string) => void;
  removeTrack: (trackId: string) => void;

  addManualBeat: (time: number) => void;
  clearManualBeats: () => void;
  toggleSnap: () => void;
  syncToBeats: (trackId: string, beatsPerClip: number, source?: SyncSource) => void;
  splitTextOnBeats: (clipId: string, unit: 'word' | 'line', beatsPer: number) => void;
  matchBeats: (options: BeatMatchOptions) => void;
  setMainBeat: (clipId: string) => void;
  addSection: (clipId: string, options: SectionOptions) => void;
  trimToSection: (clipId: string, from: number, to: number) => void;
  toggleCrossfade: () => void;
  /** Locks a song (and its stems) to a steady grid; null restores the detected beats. */
  setBeatGrid: (assetId: string, grid: BeatGrid | null) => void;
  updateMaster: (patch: Partial<MasterSettings>, coalesceKey?: string) => void;
  addCaptions: (clipId: string, request: CaptionRequest) => void;

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

  /** Imports one file: placeholder → decoded asset → beat analysis for music. */
  const ingest = async (file: File, autoAdd: (asset: Asset) => boolean): Promise<Asset | null> => {
    const id = createId('asset');
    const kind = kindOf(file) ?? 'image';
    setAsset({ id, kind, name: file.name, duration: 0, width: 0, height: 0, hasAudio: false, status: 'loading' });
    try {
      const asset = await loadAsset(id, file);
      setAsset(asset);
      if (autoAdd(asset)) get().addAssetToTimeline(id);
      if (asset.kind === 'audio') void analyzeBeats(asset);
      return asset;
    } catch (error) {
      set((s) => {
        const rest = { ...s.assets };
        delete rest[id];
        return { assets: rest };
      });
      toast(error instanceof Error ? error.message : String(error), 'error');
      return null;
    }
  };

  /** A song plus all its stems — they share one beat grid. */
  const stemFamily = (assetId: string): string[] => {
    const { assets } = get();
    const root = assets[assetId]?.stemOf?.assetId ?? assetId;
    return [root, ...Object.values(assets[root]?.stems ?? {})];
  };

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
    selectedClipIds: [],
    selectedClipId: null,
    masterSelected: false,
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
      set({ project: previous, past: past.slice(0, -1), future: [project, ...future], lastEdit: null, ...pruneSelection(get(), previous) });
    },

    redo: () => {
      const { past, project, future } = get();
      const [next, ...rest] = future;
      if (!next) return;
      set({ project: next, past: [...past, project], future: rest, lastEdit: null, ...pruneSelection(get(), next) });
    },

    select: (clipId, mode = 'replace') =>
      set((s) => {
        if (clipId === null) return { selectedClipIds: [], selectedClipId: null, masterSelected: false };
        const has = s.selectedClipIds.includes(clipId);
        if (mode === 'toggle' && has) {
          const selectedClipIds = s.selectedClipIds.filter((id) => id !== clipId);
          return { selectedClipIds, selectedClipId: selectedClipIds.at(-1) ?? null, masterSelected: false };
        }
        if (mode === 'replace') return { selectedClipIds: [clipId], selectedClipId: clipId, masterSelected: false };
        return { selectedClipIds: has ? s.selectedClipIds : [...s.selectedClipIds, clipId], selectedClipId: clipId, masterSelected: false };
      }),

    selectMany: (clipIds, additive = false) =>
      set((s) => {
        const selectedClipIds = additive ? [...new Set([...s.selectedClipIds, ...clipIds])] : [...clipIds];
        return { selectedClipIds, selectedClipId: selectedClipIds.at(-1) ?? null, masterSelected: false };
      }),

    selectAll: () => {
      const locked = new Set(get().project.tracks.filter((t) => t.locked).map((t) => t.id));
      get().selectMany(get().project.clips.filter((c) => !locked.has(c.trackId)).map((c) => c.id));
    },

    selectMaster: () => set({ selectedClipIds: [], selectedClipId: null, masterSelected: true }),

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
        accepted.map((file) =>
          ingest(file, (asset) => asset.kind !== 'audio' || !get().project.clips.some((c) => c.kind === 'audio')),
        ),
      );
    },

    removeAsset: (assetId) => {
      const asset = get().assets[assetId];
      // A song takes its stems with it; removing one stem unlinks the (now incomplete) set from its song.
      const removed = new Set([assetId, ...Object.values(asset?.stems ?? {})]);
      get().commit((p) => ({ ...p, clips: p.clips.filter((c) => c.kind === 'text' || !removed.has(c.assetId)) }));
      for (const id of removed) {
        mediaRegistry.remove(id);
        audioBufferCache.evictAsset(id);
      }
      set((s) => {
        const rest = { ...s.assets };
        for (const id of removed) delete rest[id];
        const parent = asset?.stemOf ? rest[asset.stemOf.assetId] : undefined;
        if (parent) rest[parent.id] = { ...parent, stems: undefined };
        return { assets: rest, ...pruneSelection(s, get().project) };
      });
    },

    updateAsset: (assetId, patch) => {
      const current = get().assets[assetId];
      if (current) setAsset({ ...current, ...patch });
    },

    registerAsset: (asset) => setAsset(asset),

    addAssetToTimeline: (assetId, options = {}) => {
      const asset = get().assets[assetId];
      if (!asset || asset.status !== 'ready') return;
      const trackId = options.trackId ?? ensureTrack(asset.kind === 'audio' ? 'audio' : 'visual');
      const start = options.start ?? trackEnd(get().project, trackId);
      // Only the first song drives the beat grid; later songs follow it (see "Main beat").
      const clip =
        asset.kind === 'audio'
          ? { ...createAudioClip(asset, trackId, start), beatSource: !mainBeatClip(get().project, get().assets) }
          : createVisualClip(asset, trackId, start);
      get().commit((p) => ({ ...p, clips: [...p.clips, clip] }));
      get().select(clip.id);
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
      get().select(clip.id);
    },

    updateClip: (clipId, recipe, coalesceKey) =>
      get().commit((p) => mapClips(p, (c) => (c.id === clipId ? recipe(c) : c)), coalesceKey ? `${clipId}:${coalesceKey}` : undefined),

    updateClips: (clipIds, recipe, coalesceKey) => {
      const ids = new Set(clipIds);
      get().commit((p) => mapClips(p, (c) => (ids.has(c.id) ? recipe(c) : c)), coalesceKey ? `batch:${coalesceKey}` : undefined);
    },

    deleteClip: (clipId) => get().deleteClips([clipId]),

    deleteClips: (clipIds) => {
      const ids = new Set(clipIds);
      if (!get().project.clips.some((c) => ids.has(c.id))) return;
      get().commit((p) => ({ ...p, clips: p.clips.filter((c) => !ids.has(c.id)) }));
      set((s) => pruneSelection(s, get().project));
    },

    duplicateClip: (clipId) => get().duplicateClips([clipId]),

    duplicateClips: (clipIds) => {
      const { project } = get();
      const originals = project.clips.filter((c) => clipIds.includes(c.id));
      if (originals.length === 0) return;
      // A group is copied as a group: it keeps its layout and lands right after itself.
      const { start } = spanOf(originals);
      // The copy keeps the group's layout and starts after the last clip on any of its tracks.
      const after = Math.max(...originals.map((c) => trackEnd(project, c.trackId)));
      const copies = originals.map((clip) => ({ ...clip, id: createId('clip'), start: clip.start - start + after }));
      get().commit((p) => ({ ...p, clips: [...p.clips, ...copies] }));
      get().selectMany(copies.map((c) => c.id));
    },

    splitSelected: (time) => {
      const { selectedClipIds, project } = get();
      const targets = project.clips.filter((c) =>
        selectedClipIds.length ? selectedClipIds.includes(c.id) : time > c.start && time < c.start + c.duration,
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

    mergeClips: async (clipIds, layout) => {
      const { project, assets } = get();
      const clips = project.clips.filter((c) => clipIds.includes(c.id));
      const blocker = mergeBlocker(clips);
      if (blocker) {
        toast(blocker, 'error');
        return;
      }
      const ids = new Set(clips.map((c) => c.id));
      const healed = clips.every(isMediaClip) ? healClips(clips.filter(isMediaClip)) : null;
      if (healed) {
        get().commit((p) => ({
          ...p,
          clips: p.clips.filter((c) => !ids.has(c.id) || c.id === healed.id).map((c) => (c.id === healed.id ? healed : c)),
        }));
        get().select(healed.id);
        toast(`Joined ${clips.length} parts into one clip`, 'success');
        return;
      }

      const parts = clips as AudioClip[];
      const arranged = layout === 'back-to-back' ? backToBack(parts) : parts;
      toast(`Merging ${parts.length} parts…`);
      try {
        const file = await bounceClips(project, assets, arranged, `Merged ${parts.length} parts.wav`);
        const asset = await ingest(file, () => false);
        if (!asset) return;
        const first = arranged.reduce((a, b) => (b.start < a.start ? b : a));
        const merged: AudioClip = {
          ...createAudioClip(asset, first.trackId, first.start),
          volume: 1,
          fadeOut: 0,
          beatSource: parts.some((c) => c.beatSource),
        };
        get().commit((p) => ({ ...p, clips: [...p.clips.filter((c) => !ids.has(c.id)), merged] }));
        get().select(merged.id);
        toast(`Merged ${parts.length} parts into one track`, 'success');
      } catch (error) {
        toast(`Merge failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    },

    extractStems: (clipId) => {
      const { project, assets } = get();
      const clip = project.clips.find((c): c is AudioClip => c.id === clipId && c.kind === 'audio');
      const stems = clip ? assets[clip.assetId]?.stems : undefined;
      if (!clip || !stems) return;
      // One track per stem, right below the song's track, each playing that stem in the same place.
      const tracks = STEMS.map((stem) => createTrack('audio', stem.label));
      const gains = stemGains(clip.stems ?? FULL_STEM_MIX);
      const clips: AudioClip[] = STEMS.map((stem, i) => {
        return {
          ...clip,
          id: createId('clip'),
          assetId: stems[stem.id],
          trackId: tracks[i].id,
          stems: undefined,
          beatSource: stem.id === 'drums' && clip.beatSource,
          volume: Math.min(CLIP_VOLUME_MAX, clip.volume * gains[stem.id]),
        };
      });
      get().commit((p) => {
        const at = p.tracks.findIndex((t) => t.id === clip.trackId) + 1;
        return {
          ...p,
          tracks: [...p.tracks.slice(0, at), ...tracks, ...p.tracks.slice(at)],
          clips: [...p.clips.filter((c) => c.id !== clip.id), ...clips],
        };
      });
      get().selectMany(clips.map((c) => c.id));
      toast('Stems placed on their own tracks — edit, cut or move each one', 'success');
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

    setMainBeat: (clipId) => {
      get().commit((p) => mapClips(p, (c) => (c.kind === 'audio' ? { ...c, beatSource: c.id === clipId } : c)));
      toast('Main beat set — the grid, snapping and beat effects now follow this song', 'success');
    },

    addSection: (clipId, options) => {
      const { project, assets } = get();
      const source = project.clips.find((c): c is AudioClip => c.id === clipId && c.kind === 'audio');
      if (!source) return;
      // Measure the placed length first, then find (or open) an audio track that is free for it.
      const probe = placeSection(project, assets, source, { ...options, trackId: source.trackId }, 'probe');
      const free = project.tracks.find(
        (t) =>
          t.kind === 'audio' &&
          !t.locked &&
          !project.clips.some((c) => c.trackId === t.id && c.start < clipEnd(probe) - 0.01 && clipEnd(c) > probe.start + 0.01),
      );
      const track = free ? null : createTrack('audio', `Vocals ${project.tracks.filter((t) => t.kind === 'audio').length}`);
      const clip = { ...probe, id: createId('clip'), trackId: free?.id ?? track?.id ?? source.trackId };
      get().commit((p) => ({ ...p, tracks: track ? [...p.tracks, track] : p.tracks, clips: [...p.clips, clip] }));
      get().select(clip.id);
      const tempo = clip.speed !== source.speed ? ` at ${Math.round(clip.speed * 100)}% speed` : '';
      toast(`Section placed on the main beat${tempo}`, 'success');
    },

    trimToSection: (clipId, from, to) =>
      get().updateClip(clipId, (c) => (c.kind === 'audio' ? { ...c, inPoint: from, duration: (to - from) / c.speed } : c)),

    toggleCrossfade: () => get().commit((p) => ({ ...p, crossfadeOverlaps: !p.crossfadeOverlaps })),

    setBeatGrid: (assetId, grid) => {
      const { assets } = get();
      const next = { ...assets };
      for (const id of stemFamily(assetId)) {
        const asset = assets[id];
        if (!asset?.beats) continue;
        next[id] = { ...asset, beats: grid ? withGrid(asset.beats, grid, asset.duration) : resetGrid(asset.beats) };
      }
      set({ assets: next });
    },

    updateMaster: (patch, coalesceKey) =>
      get().commit((p) => ({ ...p, master: { ...p.master, ...patch } }), coalesceKey ? `master:${coalesceKey}` : undefined),

    addCaptions: (clipId, { mode, presetId, snapToBeats }) => {
      const { project, assets } = get();
      const clip = project.clips.find((c) => c.id === clipId);
      if (!clip || clip.kind === 'text') return;
      const words = wordsOnTimeline(cleanWords(assets[clip.assetId]?.lyrics?.words ?? []), clip);
      if (words.length === 0) {
        toast('No words found in this part of the clip', 'error');
        return;
      }
      const captions = buildCaptions(words, {
        mode,
        maxWords: mode === 'karaoke' ? 6 : 4,
        maxGap: 0.7,
        beats: snapToBeats ? timelineBeats(project, assets) : [],
      });
      const preset = TEXT_PRESETS.find((p) => p.id === (mode === 'karaoke' ? 'karaoke' : presetId)) ?? TEXT_PRESETS[0];
      const look = applyTextPreset(preset);
      const track = createTrack('text', 'Lyrics');
      const clips = captions.map((caption) => {
        // Reveal words at the pace they are actually sung.
        const n = caption.words.length;
        const stagger = n > 1 ? (caption.words[n - 1].start - caption.words[0].start) / (n - 1) : look.animation.stagger;
        return createTextClip(track.id, caption.start, {
          ...look,
          text: caption.text,
          duration: caption.end - caption.start,
          animation: { ...look.animation, unit: 'word', stagger, revealOnBeat: false },
          transform: { ...DEFAULT_TRANSFORM, y: 0.28 },
        });
      });
      get().commit((p) => ({ ...p, tracks: [track, ...p.tracks], clips: [...p.clips, ...clips] }));
      toast(`Added ${clips.length} caption${clips.length > 1 ? 's' : ''} on a new Lyrics track`, 'success');
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

/** Drops selected ids that no longer exist in `project` (after undo, delete…). */
function pruneSelection(state: Pick<EditorState, 'selectedClipIds' | 'selectedClipId'>, project: Project) {
  const alive = new Set(project.clips.map((c) => c.id));
  const selectedClipIds = state.selectedClipIds.filter((id) => alive.has(id));
  const selectedClipId =
    state.selectedClipId && alive.has(state.selectedClipId) ? state.selectedClipId : (selectedClipIds.at(-1) ?? null);
  return { selectedClipIds, selectedClipId };
}

/** The clip the inspector edits — only when exactly one clip is selected. */
export const selectSelectedClip = (s: EditorState): Clip | undefined =>
  s.selectedClipIds.length === 1 ? s.project.clips.find((c) => c.id === s.selectedClipIds[0]) : undefined;

/** Every selected clip, in project order. */
export const selectSelectedClips = (s: EditorState): Clip[] => s.project.clips.filter((c) => s.selectedClipIds.includes(c.id));
