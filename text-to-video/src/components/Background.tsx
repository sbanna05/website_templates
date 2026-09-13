import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo } from 'remotion';
import type { BackgroundSettings } from '../types';

interface BackgroundProps {
  background: BackgroundSettings;
}

export const Background: React.FC<BackgroundProps> = ({ background }) => {
  if (background.type === 'image' && background.mediaUrl) {
    return (
      <AbsoluteFill>
        <Img
          src={background.mediaUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
    );
  }

  if (background.type === 'video' && background.mediaUrl) {
    return (
      <AbsoluteFill>
        <OffthreadVideo
          src={background.mediaUrl}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
    );
  }

  return <AbsoluteFill style={{ backgroundColor: background.color }} />;
};
