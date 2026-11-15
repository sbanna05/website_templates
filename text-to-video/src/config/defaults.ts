import { DEFAULT_MASTER } from '../audio/master';
import { FLAT_EQ } from '../engine/eq';
import { createId } from '../lib/id';
import type {
  Asset,
  AudioClip,
  AudioEffects,
  Crop,
  LightEffect,
  LightType,
  MotionKind,
  MotionLayer,
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
  temperature: 0,
  tint: 0,
  fade: 0,
};

export const FULL_CROP: Crop = { x: 0, y: 0, width: 1, height: 1 };

export const MARKER_COLORS = ['#c4a070', '#77a68e', '#6797b8', '#c0736a', '#98a8b2', '#e3e3e3', '#e192e4'] as const;

export function createLight(type: LightType): LightEffect {
  const presets: Record<LightType, Partial<LightEffect>> = {
    glow: { size: 0.6, intensity: 0.45, color: '#ffffff' },
    halo: { size: 0.3, intensity: 0.8, color: '#f4e2c0', color2: '#9fb8c8', softness: 0.3 },
    lamp: { x: 0.3, y: 0.25, size: 0.55, intensity: 0.6, color: '#f0c98e' },
    eclipse: { size: 0.28, intensity: 0.75, color: '#f4e2c0' },
    flare: { x: 0.78, y: 0.2, size: 0.35, intensity: 0.7, color: '#f6dcae', angle: -25 },
    leak: { x: 0, y: 0.2, size: 0.8, intensity: 0.5, color: '#e0a273', angle: 20 },
    beam: { x: 0.2, y: 0, size: 0.18, intensity: 0.45, color: '#e9eef0', angle: 65 },
  };
  const light: LightEffect = {
    id: createId('light'),
    type,
    x: 0.5,
    y: 0.5,
    size: 0.4,
    intensity: 0.6,
    color: '#f2e6d4',
    angle: 0,
    pulseOnBeat: false,
    color2: '',
    softness: 0.5,
    stretch: 1,
    blend: 'auto',
    animation: 'none',
    speed: 1,
    ...presets[type],
  };
  return { ...light, color2: light.color2 || light.color };
}

/** Fills in the light options added after a light was saved. */
export function normalizeLight(light: Partial<LightEffect> & Pick<LightEffect, 'id' | 'type'>): LightEffect {
  const legacyGlow = light.type === 'glow' && light.color2 === undefined;
  const base = createLight(light.type);
  const merged = { ...base, ...light, id: light.id };
  return {
    ...merged,
    color: legacyGlow ? '#ffffff' : merged.color,
    color2: merged.color2 || merged.color,
  };
}

/** A new move for a clip's motion stack, spanning the whole clip. */
export function createMotion(type: MotionKind, overrides: Partial<MotionLayer> = {}): MotionLayer {
  const amounts: Partial<Record<MotionKind, number>> = { path: 1, handheld: 0.3, spiral: 0.25, swing: 0.5, drift: 0.4 };
  return {
    id: createId('mot'),
    type,
    amount: amounts[type] ?? (type.startsWith('pan') || type.startsWith('turn') ? 0.2 : 0.12),
    curve: 'ease-in-out',
    from: 0,
    to: 1,
    repeat: 1,
    yoyo: false,
    ...(type === 'path' ? { path: [] } : {}),
    ...overrides,
  };
}

/**
 * Pictures far from the frame's shape (a wide photo in a tall video) would be
 * cropped to a sliver by "fill"; show them whole over a blurred backdrop instead.
 */
export function fitFor(asset: Pick<Asset, 'width' | 'height'>, frameAspect?: number): VisualClip['fit'] {
  if (!frameAspect || !asset.width || !asset.height) return 'cover';
  const mismatch = Math.max(asset.width / asset.height / frameAspect, frameAspect / (asset.width / asset.height));
  return mismatch > 1.5 ? 'blur' : 'cover';
}

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

export function createVisualClip(asset: Asset, trackId: string, start: number, frameAspect?: number): VisualClip {
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
    fit: fitFor(asset, frameAspect),
    crop: { ...FULL_CROP },
    flipX: false,
    flipY: false,
    transform: { ...DEFAULT_TRANSFORM },
    motions: asset.kind === 'image' ? [createMotion('zoom-in')] : [],
    filters: { ...NEUTRAL_FILTERS },
    lights: [],
    transitionIn: { type: 'none', duration: 0.35 },
    transitionOut: { type: 'none', duration: 0.35 },
    beatFx: { type: 'none', intensity: 0.5 },
  };
}

/** No sound design: what you imported is what you hear. */
export const DRY_EFFECTS: AudioEffects = { reverb: 0, roomSize: 0.5, lowpass: 0 };

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
    effects: { ...DRY_EFFECTS },
    eq: { ...FLAT_EQ },
    volumeKeys: [],
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
    backgroundColor: '#0e232f',
    tracks: [textTrack, videoTrack, audioTrack],
    clips: [
      createTextClip(textTrack.id, 0, {
        duration: 4,
        text: 'Drop your clips\nand feel the beat',
      }),
    ],
    manualBeats: [],
    markers: [],
    snapToBeats: true,
    crossfadeOverlaps: true,
    master: { ...DEFAULT_MASTER, eq: { ...FLAT_EQ } },
  };
}
