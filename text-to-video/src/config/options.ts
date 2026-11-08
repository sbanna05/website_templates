import type {
  BeatFxType,
  LightType,
  MotionCurve,
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
  { label: 'Slide ↓', value: 'slide-down' },
  { label: 'Slide turn ←', value: 'turn-left' },
  { label: 'Slide turn →', value: 'turn-right' },
  { label: 'Squeeze ↔', value: 'squeeze-h' },
  { label: 'Squeeze ↕', value: 'squeeze-v' },
  { label: 'Zoom spin', value: 'zoom-spin' },
];

export interface MotionOption extends Option<MotionType> {
  group: 'Zoom' | 'Pan' | 'Turn' | 'Organic';
  /** Tiny glyph shown on the picker tile. */
  glyph: string;
}

export const MOTION_OPTIONS: MotionOption[] = [
  { label: 'Static', value: 'none', group: 'Organic', glyph: '·' },
  { label: 'Long zoom in', value: 'zoom-in', group: 'Zoom', glyph: '⤢' },
  { label: 'Long zoom out', value: 'zoom-out', group: 'Zoom', glyph: '⤡' },
  { label: 'Short zoom in', value: 'zoom-in-short', group: 'Zoom', glyph: '⊕' },
  { label: 'Short zoom out', value: 'zoom-out-short', group: 'Zoom', glyph: '⊖' },
  { label: 'Pan left', value: 'pan-left', group: 'Pan', glyph: '←' },
  { label: 'Pan right', value: 'pan-right', group: 'Pan', glyph: '→' },
  { label: 'Pan up', value: 'pan-up', group: 'Pan', glyph: '↑' },
  { label: 'Pan down', value: 'pan-down', group: 'Pan', glyph: '↓' },
  { label: 'Slide turn left', value: 'turn-left', group: 'Turn', glyph: '↺' },
  { label: 'Slide turn right', value: 'turn-right', group: 'Turn', glyph: '↻' },
  { label: 'Swing', value: 'swing', group: 'Turn', glyph: '⌒' },
  { label: 'Spiral', value: 'spiral', group: 'Turn', glyph: '◎' },
  { label: 'Handheld', value: 'handheld', group: 'Organic', glyph: '≈' },
  { label: 'Drift', value: 'drift', group: 'Organic', glyph: '∿' },
];

export const MOTION_CURVE_OPTIONS: (Option<MotionCurve> & { hint: string })[] = [
  { label: 'Linear', value: 'linear', hint: 'Constant speed' },
  { label: 'Ease in', value: 'ease-in', hint: 'Slow start, fast end' },
  { label: 'Ease out', value: 'ease-out', hint: 'Fast start, slow end' },
  { label: 'Smooth', value: 'ease-in-out', hint: 'Gentle at both ends' },
  { label: 'Rush', value: 'fast-middle', hint: 'Fastest in the middle' },
  { label: 'Hang', value: 'slow-middle', hint: 'Fast at the ends, hangs in the middle' },
  { label: 'On beat', value: 'on-beat', hint: 'Steps forward on every beat' },
];

export const LIGHT_OPTIONS: (Option<LightType> & { hint: string })[] = [
  { label: 'Glow', value: 'glow', hint: 'Soft bloom from the bright parts' },
  { label: 'Lamp', value: 'lamp', hint: 'Spotlight pool, darker surroundings' },
  { label: 'Eclipse', value: 'eclipse', hint: 'Dark disc with a glowing ring' },
  { label: 'Sun flare', value: 'flare', hint: 'Lens flare with streaks' },
  { label: 'Light leak', value: 'leak', hint: 'Warm film-style edge wash' },
  { label: 'Beam', value: 'beam', hint: 'Shaft of light, like a window' },
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
  { label: 'Slide left', value: 'slide-left' },
  { label: 'Slide right', value: 'slide-right' },
  { label: 'Flip', value: 'flip' },
  { label: 'Zoom out', value: 'zoom-out' },
  { label: 'Spin', value: 'spin' },
  { label: 'Swing', value: 'swing' },
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
  { label: 'Beat bounce', value: 'beat-bounce' },
  { label: 'Beat flash', value: 'beat-flash' },
  { label: 'Beat color swap', value: 'beat-color' },
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
