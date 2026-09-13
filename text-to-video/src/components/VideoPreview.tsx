import { Player } from '@remotion/player';
import { CaptionVideo } from './Composition';
import type { VideoSettings } from '../types';

interface VideoPreviewProps {
  settings: VideoSettings;
  durationInFrames: number;
  fps: number;
}

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;

export default function VideoPreview({ settings, durationInFrames, fps }: VideoPreviewProps) {
  return (
    <div className="preview-pane">
      <div className="preview-frame">
        <Player
          component={CaptionVideo}
          inputProps={{ settings, fps }}
          durationInFrames={durationInFrames}
          compositionWidth={VIDEO_WIDTH}
          compositionHeight={VIDEO_HEIGHT}
          fps={fps}
          style={{ width: '100%', height: '100%' }}
          controls
          loop
          autoPlay
          clickToPlay
        />
      </div>
      <p className="preview-hint">
        {settings.textBoxes.length} text box{settings.textBoxes.length === 1 ? '' : 'es'} ·{' '}
        {(durationInFrames / fps).toFixed(1)}s
      </p>
    </div>
  );
}
