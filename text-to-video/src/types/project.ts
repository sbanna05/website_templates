/**
 * Serializable project model. Everything in here is plain data, so it can be
 * snapshotted for undo/redo, diffed cheaply and (later) persisted as JSON.
 * Runtime-only media handles (File, HTMLVideoElement, AudioBuffer…) live in
 * `media/mediaRegistry.ts`, keyed by `Asset.id`.
 */

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5';

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
  | 'whip';

export interface Transition {
  type: TransitionType;
  duration: number;
}

export type MotionType = 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'drift';

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
  transform: Transform;
  motion: MotionType;
  motionAmount: number;
  filters: Filters;
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
  | 'karaoke';

export type TextOutAnimation = 'none' | 'fade' | 'pop' | 'slide-up' | 'slide-down' | 'blur-out' | 'shrink';

export type TextLoopAnimation = 'none' | 'beat-pulse' | 'beat-shake' | 'wave' | 'float' | 'flicker' | 'jitter' | 'breathe';

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
  snapToBeats: boolean;
}
