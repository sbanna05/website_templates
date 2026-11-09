import { create } from 'zustand';
import { clamp } from '../lib/math';
import type { TrackKind } from '../types/project';

export type LibraryTab = 'media' | 'audio' | 'text';

/** Timeline pointer tool: Select (move, trim) or Blade (click a clip to cut it). */
export type EditTool = 'select' | 'blade';

/** Sizes the user can drag. Each has a range and a default (double-click a handle to restore it). */
export const LAYOUT_LIMITS = {
  libraryWidth: { min: 220, max: 520, initial: 300 },
  inspectorWidth: { min: 280, max: 600, initial: 340 },
  timelineHeight: { min: 170, max: 680, initial: 300 },
  headerWidth: { min: 128, max: 320, initial: 176 },
} as const;

export type LayoutSize = keyof typeof LAYOUT_LIMITS;

export const TRACK_HEIGHT_LIMITS = { min: 34, max: 220 } as const;
export const DEFAULT_TRACK_HEIGHT: Record<TrackKind, number> = { visual: 66, text: 44, audio: 58 };

export interface PanelLayout extends Record<LayoutSize, number> {
  libraryOpen: boolean;
  inspectorOpen: boolean;
}

const DEFAULT_LAYOUT: PanelLayout = {
  libraryWidth: LAYOUT_LIMITS.libraryWidth.initial,
  inspectorWidth: LAYOUT_LIMITS.inspectorWidth.initial,
  timelineHeight: LAYOUT_LIMITS.timelineHeight.initial,
  headerWidth: LAYOUT_LIMITS.headerWidth.initial,
  libraryOpen: true,
  inspectorOpen: true,
};

const STORAGE_KEY = 'articvid:layout:v1';

/** The layout is a per-browser convenience, so storage failures (private mode…) are simply ignored. */
function loadLayout(): PanelLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<PanelLayout> | null;
    if (!saved) return DEFAULT_LAYOUT;
    const layout = { ...DEFAULT_LAYOUT, ...saved };
    for (const key of Object.keys(LAYOUT_LIMITS) as LayoutSize[]) {
      layout[key] = clamp(Number(layout[key]) || DEFAULT_LAYOUT[key], LAYOUT_LIMITS[key].min, LAYOUT_LIMITS[key].max);
    }
    return layout;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(layout: PanelLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* storage unavailable */
  }
}

interface UiState {
  pxPerSecond: number;
  libraryTab: LibraryTab;
  exportOpen: boolean;
  layout: PanelLayout;
  /** Heights of tracks the user resized; others use the default for their kind. */
  trackHeights: Record<string, number>;
  tool: EditTool;
  /** Tracks hidden from the timeline view (they still play and render). */
  viewHidden: Record<string, true>;
  /** Show the chord row above the tracks. */
  showChords: boolean;
  setTool: (tool: EditTool) => void;
  setViewHidden: (trackId: string, hidden: boolean) => void;
  /** Shows only `keep` out of `all` tracks; an empty `keep` shows everything. */
  showOnly: (keep: readonly string[], all: readonly string[]) => void;
  toggleChords: () => void;
  setZoom: (pxPerSecond: number) => void;
  zoomBy: (factor: number) => void;
  setLibraryTab: (tab: LibraryTab) => void;
  setExportOpen: (open: boolean) => void;
  setSize: (key: LayoutSize, value: number) => void;
  resetSize: (key: LayoutSize) => void;
  togglePanel: (panel: 'libraryOpen' | 'inspectorOpen') => void;
  setTrackHeight: (trackId: string, height: number | null) => void;
}

export const ZOOM_RANGE = { min: 12, max: 400 } as const;

export const useUi = create<UiState>((set) => ({
  pxPerSecond: 80,
  libraryTab: 'media',
  exportOpen: false,
  layout: loadLayout(),
  trackHeights: {},
  tool: 'select',
  viewHidden: {},
  showChords: true,
  setTool: (tool) => set({ tool }),
  setViewHidden: (trackId, hidden) =>
    set((s) => {
      const viewHidden = { ...s.viewHidden };
      if (hidden) viewHidden[trackId] = true;
      else delete viewHidden[trackId];
      return { viewHidden };
    }),
  showOnly: (keep, all) =>
    set(() => {
      if (keep.length === 0) return { viewHidden: {} };
      const kept = new Set(keep);
      return { viewHidden: Object.fromEntries(all.filter((id) => !kept.has(id)).map((id) => [id, true as const])) };
    }),
  toggleChords: () => set((s) => ({ showChords: !s.showChords })),
  setZoom: (pxPerSecond) => set({ pxPerSecond: clamp(pxPerSecond, ZOOM_RANGE.min, ZOOM_RANGE.max) }),
  zoomBy: (factor) => set((s) => ({ pxPerSecond: clamp(s.pxPerSecond * factor, ZOOM_RANGE.min, ZOOM_RANGE.max) })),
  setLibraryTab: (libraryTab) => set({ libraryTab }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
  setSize: (key, value) =>
    set((s) => ({ layout: { ...s.layout, [key]: clamp(Math.round(value), LAYOUT_LIMITS[key].min, LAYOUT_LIMITS[key].max) } })),
  resetSize: (key) => set((s) => ({ layout: { ...s.layout, [key]: LAYOUT_LIMITS[key].initial } })),
  togglePanel: (panel) => set((s) => ({ layout: { ...s.layout, [panel]: !s.layout[panel] } })),
  setTrackHeight: (trackId, height) =>
    set((s) => {
      const trackHeights = { ...s.trackHeights };
      if (height === null) delete trackHeights[trackId];
      else trackHeights[trackId] = clamp(Math.round(height), TRACK_HEIGHT_LIMITS.min, TRACK_HEIGHT_LIMITS.max);
      return { trackHeights };
    }),
}));

/** Height of one track row in the timeline. */
export const trackHeightOf = (heights: Record<string, number>, track: { id: string; kind: TrackKind }): number =>
  heights[track.id] ?? DEFAULT_TRACK_HEIGHT[track.kind];

// Persist the panel layout (debounced — a drag fires many updates).
let saveTimer = 0;
useUi.subscribe((state, prev) => {
  if (state.layout === prev.layout) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveLayout(state.layout), 250);
});
