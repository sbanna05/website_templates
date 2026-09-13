import React from 'react';
import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AnimationStyle, EffectType } from '../types';

interface AnimatedWordProps {
  word: string;
  /** Frame this word's entrance begins. */
  delay: number;
  /** How many frames this word "owns" at the current speed — used by the karaoke style. */
  wordSpan: number;
  /** Position within its text box — used to offset continuous effects (wave, rainbow, shake). */
  wordIndex: number;
  animationStyle: AnimationStyle;
  effect: EffectType;
  color: string;
  fontFamily: string;
  fontSize: number;
}

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const AnimatedWord: React.FC<AnimatedWordProps> = ({
  word,
  delay,
  wordSpan,
  wordIndex,
  animationStyle,
  effect,
  color,
  fontFamily,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wordFrame = frame - delay;

  // --- Entrance animation ------------------------------------------------
  // Each style only sets the values it needs; everything else keeps the
  // "already settled" defaults below.
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let opacity = wordFrame < 0 ? 0 : 1;
  let blurPx = 0;
  let displayText = word;

  switch (animationStyle) {
    case 'zoom': {
      scale =
        wordFrame < 0
          ? 0
          : spring({ fps, frame: wordFrame, config: { damping: 12, stiffness: 200, mass: 0.5 } });
      opacity = interpolate(wordFrame, [0, 2], [0, 1], CLAMP);
      break;
    }
    case 'fade': {
      opacity = interpolate(wordFrame, [0, 10], [0, 1], CLAMP);
      break;
    }
    case 'typewriter': {
      const window = Math.max(word.length * 2, 4);
      const visibleChars = Math.floor(interpolate(wordFrame, [0, window], [0, word.length], CLAMP));
      displayText = word.slice(0, visibleChars);
      break;
    }
    case 'bounce': {
      // Drops in from above and lands with an elastic overshoot.
      const progress =
        wordFrame < 0
          ? 0
          : spring({ fps, frame: wordFrame, config: { damping: 9, stiffness: 120, mass: 0.8 } });
      translateY = interpolate(progress, [0, 1], [-70, 0]);
      opacity = interpolate(wordFrame, [0, 3], [0, 1], CLAMP);
      break;
    }
    case 'slide-up': {
      const progress = wordFrame < 0 ? 0 : spring({ fps, frame: wordFrame, config: { damping: 16 } });
      translateY = interpolate(progress, [0, 1], [40, 0]);
      opacity = interpolate(wordFrame, [0, 8], [0, 1], CLAMP);
      break;
    }
    case 'blur-in': {
      opacity = interpolate(wordFrame, [0, 12], [0, 1], CLAMP);
      blurPx = interpolate(wordFrame, [0, 12], [16, 0], CLAMP);
      break;
    }
    case 'karaoke': {
      // Every word is visible from the start; only the word whose turn it
      // currently is gets highlighted, like auto-generated caption tools.
      const isActive = frame >= delay && frame < delay + wordSpan;
      opacity = isActive ? 1 : 0.45;
      scale = isActive ? 1.08 : 1;
      break;
    }
    default:
      break;
  }

  // --- Persistent effect ---------------------------------------------
  // Layered on top of whichever entrance animation is running above.
  let extraShadow: string | undefined;
  let fontWeight = 800;
  let finalColor = color;

  switch (effect) {
    case 'neon': {
      const pulse = interpolate(Math.sin((frame / 15) * Math.PI * 2), [-1, 1], [8, 22]);
      extraShadow = `0 0 ${pulse}px ${color}, 0 0 ${pulse * 1.6}px ${color}, 0 0 ${
        pulse * 2.4
      }px #ffffff`;
      break;
    }
    case 'glitch': {
      // Deterministic, frame-seeded randomness (never Math.random) so the
      // same frame always looks identical across preview and final export.
      const chance = random(`glitch-chance-${word}-${Math.floor(frame / 4)}`);
      if (chance > 0.82) {
        translateX += interpolate(random(`glitch-x-${word}-${frame}`), [0, 1], [-6, 6]);
        extraShadow = '-2px 0 #ff004c, 2px 0 #00f0ff';
      }
      break;
    }
    case 'shake': {
      const bucket = Math.floor(frame / 2);
      translateX += interpolate(random(`shake-x-${wordIndex}-${bucket}`), [0, 1], [-3, 3]);
      translateY += interpolate(random(`shake-y-${wordIndex}-${bucket}`), [0, 1], [-3, 3]);
      break;
    }
    case 'wave': {
      translateY += Math.sin(frame / 8 + wordIndex * 0.6) * 10;
      break;
    }
    case 'rainbow': {
      const hue = (frame * 4 + wordIndex * 40) % 360;
      finalColor = `hsl(${hue}, 85%, 60%)`;
      break;
    }
    case 'outline': {
      extraShadow =
        '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 8px rgba(0,0,0,0.35)';
      fontWeight = 900;
      break;
    }
    default:
      break;
  }

  return (
    <span
      style={{
        display: 'inline-block',
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        opacity,
        filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        color: finalColor,
        fontFamily,
        fontSize,
        fontWeight,
        marginRight: '0.3em',
        whiteSpace: 'pre',
        textShadow: extraShadow,
      }}
    >
      {animationStyle === 'typewriter' ? displayText : word}
    </span>
  );
};
