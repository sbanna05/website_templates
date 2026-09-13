import type { ChangeEvent } from 'react';
import type { BackgroundSettings, BackgroundType } from '../types';

interface BackgroundControlsProps {
  background: BackgroundSettings;
  onChange: <K extends keyof BackgroundSettings>(key: K, value: BackgroundSettings[K]) => void;
}

const TYPE_OPTIONS: { label: string; value: BackgroundType }[] = [
  { label: 'Color', value: 'color' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
];

export default function BackgroundControls({ background, onChange }: BackgroundControlsProps) {
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange('mediaUrl', URL.createObjectURL(file));
    onChange('mediaName', file.name);
  };

  return (
    <div className="control-group background-controls">
      <label htmlFor="bg-type">Background</label>
      <select
        id="bg-type"
        value={background.type}
        onChange={(e) => onChange('type', e.target.value as BackgroundType)}
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {background.type === 'color' && (
        <input
          type="color"
          className="background-color-input"
          value={background.color}
          onChange={(e) => onChange('color', e.target.value)}
        />
      )}

      {background.type !== 'color' && (
        <div className="background-upload">
          <input
            id="bg-file"
            type="file"
            accept={background.type === 'image' ? 'image/*' : 'video/*'}
            onChange={handleFile}
          />
          {background.mediaName && <span className="background-file-name">{background.mediaName}</span>}
        </div>
      )}
    </div>
  );
}
