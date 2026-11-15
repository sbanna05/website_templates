import type { Clip, TrackKind } from '../../types/project';

/* Track header width and track heights are user-resizable — see `store/uiStore.ts`. */
export const RULER_HEIGHT = 30;
export const MASTER_ROW_HEIGHT = 44;
/** Pixels within which edges snap together. */
export const SNAP_PX = 8;
/** Empty room after the last clip so there's space to drop more. */
export const TAIL_SECONDS = 12;

export const acceptsClip = (trackKind: TrackKind, clip: Clip): boolean => trackKind === clip.kind;
