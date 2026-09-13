export type AnimationStyle =
  | 'fade'
  | 'zoom'
  | 'typewriter'
  | 'bounce'
  | 'slide-up'
  | 'blur-in'
  | 'karaoke';

export type EffectType = 'none' | 'neon' | 'glitch' | 'shake' | 'wave' | 'rainbow' | 'outline';

export type BackgroundType = 'color' | 'image' | 'video';

export interface TextBox {
  id: string;
  text: string;
  animationStyle: AnimationStyle;
  effect: EffectType;
  fontFamily: string;
  fontColor: string;
  fontSize: number;
  /** 1 (slow reveal) – 10 (fast reveal). Converted to frames-per-word. */
  speed: number;
  /** Vertical position as a percentage of the frame height (50 = centered). */
  verticalPosition: number;
  /** Seconds after the video starts before this box begins animating in. */
  startDelaySeconds: number;
}

export interface BackgroundSettings {
  type: BackgroundType;
  color: string;
  mediaUrl?: string;
  mediaName?: string;
}

export interface VideoSettings {
  textBoxes: TextBox[];
  background: BackgroundSettings;
}
