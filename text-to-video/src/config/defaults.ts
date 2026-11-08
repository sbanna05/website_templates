import { createId } from '../lib/id';
import type {
  Asset,
  AudioClip,
  Filters,
  Project,
  TextAnimation,
  TextClip,
  TextStyle,
  Track,
  TrackKind,
  Transform,
  VisualClip,
} from '../types/project';

/** How long a still image (or a new text layer) lasts when first dropped in. */
export const DEFAULT_STILL_DURATION = 3;
export const MIN_CLIP_DURATION = 0.1;
export const MIN_PROJECT_DURATION = 3;

export const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };

export const NEUTRAL_FILTERS: Filters = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  hue: 0,
  blur: 0,
  vignette: 0,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Montserrat',
  fontWeight: 900,
  fontSize: 92,
  color: '#f4f7f8',
  highlightColor: '#9fd3b8',
  strokeColor: '#0b0f12',
  strokeWidth: 0,
  shadowColor: 'rgba(5, 9, 12, 0.65)',
  shadowBlur: 18,
  background: 'none',
  backgroundColor: '#10161b',
  align: 'center',
  letterSpacing: 0,
  lineHeight: 1.15,
  uppercase: false,
  italic: false,
  maxWidth: 0.84,
};

export const DEFAULT_TEXT_ANIMATION: TextAnimation = {
  in: 'pop',
  out: 'fade',
  loop: 'none',
  unit: 'word',
  inDuration: 0.35,
  outDuration: 0.3,
  stagger: 0.12,
  ease: 'back.out(1.7)',
  revealOnBeat: false,
};

export function createTrack(kind: TrackKind, name?: string): Track {
  const labels: Record<TrackKind, string> = { visual: 'Video', text: 'Text', audio: 'Music' };
  return { id: createId('trk'), kind, name: name ?? labels[kind], muted: false, hidden: false, locked: false };
}

export function createVisualClip(asset: Asset, trackId: string, start: number): VisualClip {
  return {
    id: createId('clip'),
    kind: 'visual',
    trackId,
    assetId: asset.id,
    start,
    duration: asset.kind === 'image' ? DEFAULT_STILL_DURATION : asset.duration,
    inPoint: 0,
    speed: 1,
    volume: 1,
    pitch: 0,
    fit: 'cover',
    transform: { ...DEFAULT_TRANSFORM },
    motion: asset.kind === 'image' ? 'zoom-in' : 'none',
    motionAmount: 0.12,
    filters: { ...NEUTRAL_FILTERS },
    transitionIn: { type: 'none', duration: 0.35 },
    transitionOut: { type: 'none', duration: 0.35 },
    beatFx: { type: 'none', intensity: 0.5 },
  };
}

export function createAudioClip(asset: Asset, trackId: string, start: number): AudioClip {
  return {
    id: createId('clip'),
    kind: 'audio',
    trackId,
    assetId: asset.id,
    start,
    duration: asset.duration,
    inPoint: 0,
    speed: 1,
    pitch: 0,
    volume: 0.9,
    fadeIn: 0,
    fadeOut: 0.5,
    beatSource: true,
    beatOffset: 0,
  };
}

export function createTextClip(trackId: string, start: number, overrides: Partial<TextClip> = {}): TextClip {
  return {
    id: createId('clip'),
    kind: 'text',
    trackId,
    start,
    duration: DEFAULT_STILL_DURATION,
    text: 'Your story starts here',
    style: { ...DEFAULT_TEXT_STYLE },
    animation: { ...DEFAULT_TEXT_ANIMATION },
    transform: { ...DEFAULT_TRANSFORM },
    ...overrides,
  };
}

export function createEmptyProject(): Project {
  const textTrack = createTrack('text');
  const videoTrack = createTrack('visual');
  const audioTrack = createTrack('audio');
  return {
    name: 'Untitled edit',
    aspect: '9:16',
    fps: 30,
    backgroundColor: '#0d1317',
    tracks: [textTrack, videoTrack, audioTrack],
    clips: [
      createTextClip(textTrack.id, 0, {
        duration: 4,
        text: 'Drop your clips\nand feel the beat',
      }),
    ],
    manualBeats: [],
    snapToBeats: true,
  };
}
