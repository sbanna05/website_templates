import React from 'react';
import { AnimatedWord } from './AnimatedWord';
import { framesPerWordFromSpeed } from './timing';
import type { TextBox } from '../types';

interface TextLayerProps {
  textBox: TextBox;
  fps: number;
}

export const TextLayer: React.FC<TextLayerProps> = ({ textBox, fps }) => {
  const words = textBox.text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const framesPerWord = framesPerWordFromSpeed(textBox.speed);
  const startFrame = Math.round(textBox.startDelaySeconds * fps);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${textBox.verticalPosition}%`,
        left: 0,
        right: 0,
        transform: 'translateY(-50%)',
        padding: '0 8%',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        textAlign: 'center',
        lineHeight: 1.35,
      }}
    >
      {words.map((word, i) => (
        <AnimatedWord
          key={`${i}-${word}`}
          word={word}
          wordIndex={i}
          delay={startFrame + i * framesPerWord}
          wordSpan={framesPerWord}
          animationStyle={textBox.animationStyle}
          effect={textBox.effect}
          color={textBox.fontColor}
          fontFamily={textBox.fontFamily}
          fontSize={textBox.fontSize}
        />
      ))}
    </div>
  );
};
