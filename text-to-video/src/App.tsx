import { useEffect, useMemo, useState } from 'react';
import UIControls from './components/UIControls';
import VideoPreview from './components/VideoPreview';
import { framesPerWordFromSpeed } from './remotion/timing';
import type { BackgroundSettings, TextBox, VideoSettings } from './types';
import './App.css';

const FPS = 30;
const END_BUFFER_FRAMES = 30;
const MIN_DURATION_FRAMES = 90; // 3s floor so an empty/short video still previews sensibly

function createTextBox(overrides: Partial<TextBox> = {}): TextBox {
  return {
    id: crypto.randomUUID(),
    text: '',
    animationStyle: 'zoom',
    effect: 'none',
    fontFamily: 'Inter, sans-serif',
    fontColor: '#ffffff',
    fontSize: 72,
    speed: 5,
    verticalPosition: 50,
    startDelaySeconds: 0,
    ...overrides,
  };
}

const DEFAULT_SETTINGS: VideoSettings = {
  textBoxes: [
    createTextBox({
      text: 'Your story starts here. Type something amazing and watch it come to life.',
    }),
  ],
  background: {
    type: 'color',
    color: '#0b0b0f',
  },
};

export default function App() {
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);

  // Uploaded backgrounds are held as blob: object URLs — revoke the previous
  // one whenever it's replaced or the app unmounts, so we don't leak memory.
  useEffect(() => {
    const url = settings.background.mediaUrl;
    return () => {
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [settings.background.mediaUrl]);

  const updateTextBox = <K extends keyof TextBox>(id: string, key: K, value: TextBox[K]) => {
    setSettings((prev) => ({
      ...prev,
      textBoxes: prev.textBoxes.map((box) => (box.id === id ? { ...box, [key]: value } : box)),
    }));
  };

  const addTextBox = () => {
    setSettings((prev) => ({
      ...prev,
      textBoxes: [...prev.textBoxes, createTextBox({ verticalPosition: 75 })],
    }));
  };

  const removeTextBox = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      textBoxes: prev.textBoxes.filter((box) => box.id !== id),
    }));
  };

  const updateBackground = <K extends keyof BackgroundSettings>(
    key: K,
    value: BackgroundSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, background: { ...prev.background, [key]: value } }));
  };

  // Each text box can run at its own speed and start at its own delay, so the
  // video's total length is whichever box finishes last.
  const durationInFrames = useMemo(() => {
    const boxDurations = settings.textBoxes.map((box) => {
      const words = box.text.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return 0;
      const framesPerWord = framesPerWordFromSpeed(box.speed);
      const startFrame = Math.round(box.startDelaySeconds * FPS);
      return startFrame + words.length * framesPerWord + END_BUFFER_FRAMES;
    });
    return Math.max(MIN_DURATION_FRAMES, ...boxDurations);
  }, [settings.textBoxes]);

  return (
    <div className="app-shell">
      <UIControls
        settings={settings}
        onTextBoxChange={updateTextBox}
        onAddTextBox={addTextBox}
        onRemoveTextBox={removeTextBox}
        onBackgroundChange={updateBackground}
      />
      <VideoPreview settings={settings} durationInFrames={durationInFrames} fps={FPS} />
    </div>
  );
}
