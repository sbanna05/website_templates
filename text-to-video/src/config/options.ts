import type {
  BeatFxType,
  MotionType,
  TextInAnimation,
  TextLoopAnimation,
  TextOutAnimation,
  TextUnit,
  TransitionType,
} from '../types/project';

export interface Option<T extends string> {
  label: string;
  value: T;
}

export const TRANSITION_OPTIONS: Option<TransitionType>[] = [
  { label: 'None', value: 'none' },
  { label: 'Fade', value: 'fade' },
  { label: 'Zoom punch', value: 'zoom-punch' },
  { label: 'Zoom out', value: 'zoom-out' },
  { label: 'Slide ←', value: 'slide-left' },
  { label: 'Slide →', value: 'slide-right' },
  { label: 'Slide ↑', value: 'slide-up' },
  { label: 'Blur', value: 'blur' },
  { label: 'Flash', value: 'flash' },
  { label: 'Spin', value: 'spin' },
  { label: 'Whip pan', value: 'whip' },
];

export const MOTION_OPTIONS: Option<MotionType>[] = [
  { label: 'Static', value: 'none' },
  { label: 'Zoom in', value: 'zoom-in' },
  { label: 'Zoom out', value: 'zoom-out' },
  { label: 'Pan left', value: 'pan-left' },
  { label: 'Pan right', value: 'pan-right' },
  { label: 'Drift', value: 'drift' },
];

export const BEAT_FX_OPTIONS: Option<BeatFxType>[] = [
  { label: 'None', value: 'none' },
  { label: 'Zoom pulse', value: 'zoom-pulse' },
  { label: 'Flash', value: 'flash' },
  { label: 'Shake', value: 'shake' },
  { label: 'Blur pulse', value: 'blur-pulse' },
  { label: 'Exposure', value: 'brightness' },
  { label: 'Tilt', value: 'tilt' },
];

export const TEXT_IN_OPTIONS: Option<TextInAnimation>[] = [
  { label: 'None', value: 'none' },
  { label: 'Fade', value: 'fade' },
  { label: 'Pop', value: 'pop' },
  { label: 'Typewriter', value: 'typewriter' },
  { label: 'Slide up', value: 'slide-up' },
  { label: 'Slide down', value: 'slide-down' },
  { label: 'Blur in', value: 'blur-in' },
  { label: 'Bounce', value: 'bounce' },
  { label: 'Drop', value: 'drop' },
  { label: 'Rotate in', value: 'rotate-in' },
  { label: 'Stretch', value: 'stretch' },
  { label: 'Glitch in', value: 'glitch-in' },
  { label: 'Karaoke', value: 'karaoke' },
];

export const TEXT_OUT_OPTIONS: Option<TextOutAnimation>[] = [
  { label: 'None', value: 'none' },
  { label: 'Fade', value: 'fade' },
  { label: 'Pop', value: 'pop' },
  { label: 'Slide up', value: 'slide-up' },
  { label: 'Slide down', value: 'slide-down' },
  { label: 'Blur out', value: 'blur-out' },
  { label: 'Shrink', value: 'shrink' },
];

export const TEXT_LOOP_OPTIONS: Option<TextLoopAnimation>[] = [
  { label: 'None', value: 'none' },
  { label: 'Beat pulse', value: 'beat-pulse' },
  { label: 'Beat shake', value: 'beat-shake' },
  { label: 'Wave', value: 'wave' },
  { label: 'Float', value: 'float' },
  { label: 'Breathe', value: 'breathe' },
  { label: 'Flicker', value: 'flicker' },
  { label: 'Jitter', value: 'jitter' },
];

export const TEXT_UNIT_OPTIONS: Option<TextUnit>[] = [
  { label: 'Word', value: 'word' },
  { label: 'Letter', value: 'char' },
  { label: 'Line', value: 'line' },
];

export const SPEED_PRESETS = [0.25, 0.5, 1, 1.5, 2, 3, 4] as const;
export const SPEED_RANGE = { min: 0.1, max: 4 } as const;
export const PITCH_RANGE = { min: -12, max: 12 } as const;
