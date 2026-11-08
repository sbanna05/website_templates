import type { Clip, TrackKind } from '../../types/project';

export const HEADER_WIDTH = 168;
export const RULER_HEIGHT = 30;
export const TRACK_HEIGHT: Record<TrackKind, number> = { visual: 66, text: 44, audio: 58 };
/** Pixels within which edges snap together. */
export const SNAP_PX = 8;
/** Empty room after the last clip so there's space to drop more. */
export const TAIL_SECONDS = 12;

export const acceptsClip = (trackKind: TrackKind, clip: Clip): boolean => trackKind === clip.kind;
