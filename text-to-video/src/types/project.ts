/**
 * Serializable project model. Everything in here is plain data, so it can be
 * snapshotted for undo/redo, diffed cheaply and (later) persisted as JSON.
 * Runtime-only media handles (File, HTMLVideoElement, AudioBuffer…) live in
 * `media/mediaRegistry.ts`, keyed by `Asset.id`.
 */

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | '3:4';

export type AssetKind = 'image' | 'video' | 'audio';

export interface BeatAnalysis {
  bpm: number;
  /** Steady beat grid, in seconds of the source file. */
  beats: number[];
  /** Raw detected onsets (transients), in seconds of the source file. */
  onsets: number[];
}

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  /** Seconds. Images report 0 (they can be stretched to any length). */
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  thumbnail?: string;
  /** Normalised 0–1 peaks across the whole file, for waveform drawing. */
  waveform?: number[];
  beats?: BeatAnalysis;
  status: 'loading' | 'ready' | 'error';
}

export type TrackKind = 'visual' | 'text' | 'audio';

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  muted: boolean;
  hidden: boolean;
  locked: boolean;
}

export interface Transform {
  /** Centre offset as a fraction of frame width (0 = centred). */
  x: number;
  /** Centre offset as a fraction of frame height (0 = centred). */
  y: number;
  scale: number;
  /** Degrees. */
  rotation: number;
  /** 0–1. */
  opacity: number;
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'zoom-punch'
  | 'zoom-out'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'blur'
  | 'flash'
  | 'spin'
  | 'whip'
  | 'slide-down'
  | 'turn-left'
  | 'turn-right'
  | 'squeeze-h'
  | 'squeeze-v'
  | 'zoom-spin';

export interface Transition {
  type: TransitionType;
  duration: number;
}

export type MotionType =
  | 'none'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-in-short'
  | 'zoom-out-short'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'turn-left'
  | 'turn-right'
  | 'swing'
  | 'spiral'
  | 'handheld'
  | 'drift';

/** How the camera move is paced across the clip — CapCut-style velocity. */
export type MotionCurve = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'fast-middle' | 'slow-middle' | 'on-beat';

/** Normalised source rectangle (0–1 of the media's width/height). */
export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LightType = 'glow' | 'lamp' | 'eclipse' | 'flare' | 'leak' | 'beam';

/** A light painted on top of a photo/video, Lightroom-style. Position is relative to the image (0–1). */
export interface LightEffect {
  id: string;
  type: LightType;
  x: number;
  y: number;
  /** Radius as a fraction of the image's shorter side. */
  size: number;
  /** 0–1. */
  intensity: number;
  color: string;
  /** Degrees — direction of beams, leaks and flare streaks. */
  angle: number;
  /** Brightens on every beat. */
  pulseOnBeat: boolean;
}

export interface Marker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export type BeatFxType = 'none' | 'zoom-pulse' | 'flash' | 'shake' | 'blur-pulse' | 'brightness' | 'tilt';

export interface BeatFx {
  type: BeatFxType;
  /** 0–1. */
  intensity: number;
}

export interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  vignette: number;
  /** -1 (cool) … 1 (warm). */
  temperature: number;
  /** -1 (green) … 1 (magenta). */
  tint: number;
  /** 0–1, lifts the blacks for a matte look. */
  fade: number;
}

interface ClipBase {
  id: string;
  trackId: string;
  /** Timeline position, seconds. */
  start: number;
  /** Length on the timeline, seconds (already accounts for speed). */
  duration: number;
}

export interface VisualClip extends ClipBase {
  kind: 'visual';
  assetId: string;
  /** Where in the source file playback begins, seconds. */
  inPoint: number;
  speed: number;
  volume: number;
  /** Semitones, applied to the clip's own audio. */
  pitch: number;
  fit: 'cover' | 'contain';
  crop: Crop;
  flipX: boolean;
  flipY: boolean;
  transform: Transform;
  motion: MotionType;
  motionAmount: number;
  motionCurve: MotionCurve;
  filters: Filters;
  lights: LightEffect[];
  transitionIn: Transition;
  transitionOut: Transition;
  beatFx: BeatFx;
}

export interface AudioClip extends ClipBase {
  kind: 'audio';
  assetId: string;
  inPoint: number;
  speed: number;
  /** Semitones, independent from speed. */
  pitch: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  /** Use this clip's detected beats to drive beat sync. */
  beatSource: boolean;
  /** Nudges the detected grid, seconds. */
  beatOffset: number;
}

export type TextUnit = 'word' | 'char' | 'line';

export type TextInAnimation =
  | 'none'
  | 'fade'
  | 'pop'
  | 'typewriter'
  | 'slide-up'
  | 'slide-down'
  | 'blur-in'
  | 'bounce'
  | 'drop'
  | 'rotate-in'
  | 'stretch'
  | 'glitch-in'
  | 'karaoke'
  | 'slide-left'
  | 'slide-right'
  | 'flip'
  | 'zoom-out'
  | 'spin'
  | 'swing';

export type TextOutAnimation = 'none' | 'fade' | 'pop' | 'slide-up' | 'slide-down' | 'blur-out' | 'shrink';

export type TextLoopAnimation =
  | 'none'
  | 'beat-pulse'
  | 'beat-shake'
  | 'beat-bounce'
  | 'beat-flash'
  | 'beat-color'
  | 'wave'
  | 'float'
  | 'flicker'
  | 'jitter'
  | 'breathe';

export interface TextStyle {
  fontFamily: string;
  fontWeight: number;
  /** Reference px on a 1080px short side. */
  fontSize: number;
  color: string;
  highlightColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  background: 'none' | 'box' | 'pill';
  backgroundColor: string;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  uppercase: boolean;
  italic: boolean;
  /** Fraction of frame width before wrapping. */
  maxWidth: number;
}

export interface TextAnimation {
  in: TextInAnimation;
  out: TextOutAnimation;
  loop: TextLoopAnimation;
  unit: TextUnit;
  /** Seconds each unit takes to animate in. */
  inDuration: number;
  outDuration: number;
  /** Seconds between consecutive units starting. */
  stagger: number;
  /** GSAP ease string, e.g. "back.out(1.7)". */
  ease: string;
  /** Reveal each unit on the next beat instead of using `stagger`. */
  revealOnBeat: boolean;
}

export interface TextClip extends ClipBase {
  kind: 'text';
  text: string;
  style: TextStyle;
  animation: TextAnimation;
  transform: Transform;
}

export type Clip = VisualClip | AudioClip | TextClip;
export type MediaClip = VisualClip | AudioClip;

export interface Project {
  name: string;
  aspect: AspectRatio;
  fps: number;
  backgroundColor: string;
  tracks: Track[];
  clips: Clip[];
  /** Hand-tapped beat markers, timeline seconds. */
  manualBeats: number[];
  /** Named marks (TikTok-style), usable as snap points and cut points. */
  markers: Marker[];
  snapToBeats: boolean;
}
