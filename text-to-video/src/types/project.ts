/**
 * Serializable project model. Everything in here is plain data, so it can be
 * snapshotted for undo/redo, diffed cheaply and (later) persisted as JSON.
 * Runtime-only media handles (File, HTMLVideoElement, AudioBuffer…) live in
 * `media/mediaRegistry.ts`, keyed by `Asset.id`.
 */

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | '3:4';

export type AssetKind = 'image' | 'video' | 'audio';

/** A steady (fixed-tempo) beat grid, the way DJ apps lock a track: tempo plus one known downbeat. */
export interface BeatGrid {
  bpm: number;
  /** A downbeat (bar start), seconds of the source file. */
  anchor: number;
}

export interface BeatAnalysis {
  bpm: number;
  beats: number[];
  onsets: number[];
  /** Index (0–3) of the first beat in `beats` that starts a bar. Missing = 0. */
  firstBar?: number;
  /** Set when the grid was adjusted by hand; `beats` is then generated from it. */
  grid?: BeatGrid;
  /** The detector's original result, kept so a hand-made grid can be reset. */
  detected?: { bpm: number; beats: number[] };
  /** True when the song holds one tempo, so the beats form an exact grid (DJ-style). */
  steady?: boolean;
  /** 0–1: how well the tracked beats agree with the grid. */
  confidence?: number;
}

/** Pitch class: 0 = C, 1 = C♯/D♭ … 11 = B. */
export type PitchClass = number;

export type ChordQuality = 'maj' | 'min';

/** One chord, in seconds of the source file. `root` -1 means no chord (silence, drums only…). */
export interface ChordSegment {
  start: number;
  end: number;
  root: PitchClass;
  quality: ChordQuality;
  /** Bass note when it isn't the root — shown as a slash chord (C/E). */
  bass?: PitchClass;
}

export interface MusicalKey {
  tonic: PitchClass;
  mode: 'major' | 'minor';
  /** 0–1. */
  confidence: number;
}

/** Key and chord progression of a song (see `audio/harmony.ts`). */
export interface HarmonyAnalysis {
  key: MusicalKey | null;
  /** How far the recording sits from A = 440 Hz, in cents. */
  tuning: number;
  chords: ChordSegment[];
  /** Where the analysis was made from: the full mix, or the bass + melody stems (cleaner). */
  source: 'mix' | 'stems';
}

/** Parts of a song an AI stem split produces. "other" is everything else — melody, synths, guitars. */
export type StemName = 'vocals' | 'drums' | 'bass' | 'other';

export interface StemChannel {
  /** 0–1.5 gain. */
  volume: number;
  muted: boolean;
  solo: boolean;
}

/** Per-clip stem mixer — like a DJ app's stem faders. */
export type StemMix = Record<StemName, StemChannel>;

/** One recognised word, timed in seconds of the source file. */
export interface LyricWord {
  text: string;
  start: number;
  end: number;
}

export interface LyricTranscript {
  words: LyricWord[];
  from: number;
  to: number;
  language: string;
  model: string;
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
  /** Key and chords. */
  harmony?: HarmonyAnalysis;
  /** Words detected in the audio (auto lyrics / captions), in seconds of the source file. */
  lyrics?: LyricTranscript;
  /** Asset ids of this song's separated stems, once it has been split. */
  stems?: Record<StemName, string>;
  /** Set on a stem asset: which song it was split from. */
  stemOf?: { assetId: string; stem: StemName };
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
  /** Only soloed tracks are heard while any track is soloed (audio). */
  solo?: boolean;
  /** Custom colour for the header and its clips; unset = the colour of its kind. */
  color?: string;
  /** Set on tracks that hold one stem of a split song. */
  stem?: StemName;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
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
  size: number;
  intensity: number;
  color: string;
  angle: number;
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
  fade: number;
}

interface ClipBase {
  id: string;
  trackId: string;
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

/** Per-clip sound design, applied identically in preview and export. */
export interface AudioEffects {
  /** 0–1 wet level of the reverb send. */
  reverb: number;
  /** 0–1 room size → reverb decay from ~0.6 s to ~5 s. */
  roomSize: number;
  /** 0–1 muffling: 0 = open, 1 = low-pass at ~400 Hz ("underwater"). */
  lowpass: number;
}

/** Three-band EQ with a low cut, the layout of a mixing-desk channel strip. Gains in dB. */
export interface EqSettings {
  /** High-pass corner in Hz; 0 = off. Removes rumble below it. */
  lowCut: number;
  /** Low shelf gain (bass), dB. */
  low: number;
  /** Bell gain at `midFreq`, dB. */
  mid: number;
  /** Centre of the mid band, Hz. */
  midFreq: number;
  /** High shelf gain (air / presence), dB. */
  high: number;
}

/** The master bus every sound passes through last. */
export interface MasterSettings {
  /** 0–1.5 output gain. */
  volume: number;
  eq: EqSettings;
  /** 0–1 bus compression ("glue") that pulls the mix together. */
  glue: number;
  /** Brick-wall limiter that stops the export from clipping. */
  limiter: boolean;
}

/** How the volume travels from one keyframe to the next — like a Blender graph-editor handle. */
export type CurveShape = 'linear' | 'smooth' | 'hold';

/** A volume keyframe. Pinned to the music (source seconds), so it survives trims and speed changes. */
export interface VolumeKey {
  id: string;
  /** Seconds of the source file. */
  time: number;
  /** Gain multiplier on top of the clip volume, 0–2 (1 = unchanged). */
  value: number;
  /** Shape of the segment that leaves this key. */
  shape: CurveShape;
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
  effects: AudioEffects;
  eq: EqSettings;
  /** Volume automation; empty = flat. */
  volumeKeys: VolumeKey[];
  /** Stem mixer; only used once the song has been split into stems. */
  stems?: StemMix;
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
  /** Songs that overlap on the same audio track blend into each other instead of playing on top. */
  crossfadeOverlaps: boolean;
  master: MasterSettings;
}
