import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from './Background';
import { TextLayer } from '../remotion/TextLayer';
import type { VideoSettings } from '../types';

export interface CaptionVideoProps {
  settings: VideoSettings;
  fps: number;
}

export const CaptionVideo: React.FC<CaptionVideoProps> = ({ settings, fps }) => {
  const hasContent = settings.textBoxes.some((box) => box.text.trim().length > 0);

  return (
    <AbsoluteFill>
      <Background background={settings.background} />

      {settings.textBoxes.map((box) => (
        <TextLayer key={box.id} textBox={box} fps={fps} />
      ))}

      {!hasContent && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif', fontSize: 36 }}>
            Add a text box to get started
          </span>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
