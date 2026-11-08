import { create } from 'zustand';
import { clamp } from '../lib/math';

export type LibraryTab = 'media' | 'audio' | 'text';

interface UiState {
  pxPerSecond: number;
  libraryTab: LibraryTab;
  exportOpen: boolean;
  setZoom: (pxPerSecond: number) => void;
  zoomBy: (factor: number) => void;
  setLibraryTab: (tab: LibraryTab) => void;
  setExportOpen: (open: boolean) => void;
}

export const ZOOM_RANGE = { min: 12, max: 400 } as const;

export const useUi = create<UiState>((set) => ({
  pxPerSecond: 80,
  libraryTab: 'media',
  exportOpen: false,
  setZoom: (pxPerSecond) => set({ pxPerSecond: clamp(pxPerSecond, ZOOM_RANGE.min, ZOOM_RANGE.max) }),
  zoomBy: (factor) => set((s) => ({ pxPerSecond: clamp(s.pxPerSecond * factor, ZOOM_RANGE.min, ZOOM_RANGE.max) })),
  setLibraryTab: (libraryTab) => set({ libraryTab }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
}));
